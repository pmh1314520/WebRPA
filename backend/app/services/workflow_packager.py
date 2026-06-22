# -*- coding: utf-8 -*-
"""工作流一键打包为独立 EXE / 分享包

设计原则（保证"任何模块都能跑"）：
打包产物**复用 WebRPA 真正的执行引擎**（workflow_runner + 全部 executors），而不是重写执行逻辑——
因此工作流里用到的任何模块，在打包出来的程序里行为与编辑器内完全一致。

产物结构（自包含目录，可整目录拷给别人/做成安装包）：
  <输出名>/
    <输出名>.exe              ← 启动器（自定义名称/图标，双击即运行该工作流）
    webrpa_runtime/
      python/                 ← WebRPA 运行时（含全部依赖；按工作流用到的模块裁剪可选）
      app/                    ← 后端执行引擎（executors/services/models）
      run_packaged.py         ← 引导脚本：加载 workflow.json 并用真实引擎执行
      workflow.json           ← 被打包的工作流
      config.json             ← 运行配置（是否可见浏览器/是否显示控制台等）
      assets/                 ← 工作流引用到的本地资源（图片等）

打包是耗时操作，对外以后台任务方式跑，可查询进度。
"""
from __future__ import annotations

import json
import os
import shutil
import threading
import time
import uuid
from pathlib import Path
from typing import Any, Optional

# 模块 → 依赖组映射：用于按需裁剪运行时（仅包含工作流实际用到的重型依赖）
# group 名对应 python 站点包目录/顶层包名集合。
_MODULE_DEP_HINTS: dict[str, list[str]] = {
    # 关键词出现在 module_type 中即认为需要该依赖组
    "ocr": ["ocr", "recognize_text", "click_text", "hover_text"],
    "vision": ["image", "vision", "screenshot", "template_match", "find_image"],
    "excel": ["excel", "xlsx", "openpyxl", "spreadsheet"],
    "browser": ["click", "open_url", "navigate", "input", "element", "page", "tab",
                "scroll", "web", "extract", "get_text", "screenshot", "frame", "cookie"],
    "ai": ["ai_", "llm", "gpt", "chat", "scraper", "firecrawl"],
    "office": ["word", "docx", "pdf", "ppt"],
    "db": ["mysql", "postgres", "sqlite", "mongodb", "redis", "oracle", "sqlserver", "db_"],
    "media": ["audio", "video", "media", "music"],
}


# ---------- 任务跟踪 ----------
_jobs: dict[str, dict[str, Any]] = {}
_lock = threading.RLock()
# 已请求取消的任务 id 集合
_cancel: set[str] = set()
# 正在运行的子进程（PyInstaller 等），用于取消时强制终止：jid -> Popen
_procs: dict[str, Any] = {}


class _Cancelled(Exception):
    """用户主动停止打包时抛出，用于中断构建流程。"""
    pass


def _new_job() -> dict[str, Any]:
    jid = f"pkg_{uuid.uuid4().hex[:10]}"
    job = {"id": jid, "status": "pending", "progress": 0, "step": "排队中",
           "output_name": None, "mode": None,
           "created_at": time.time(), "output_dir": None, "exe_path": None,
           "size_mb": None, "error": None, "cancel_requested": False, "logs": []}
    with _lock:
        _jobs[jid] = job
    return job


def _set(job: dict[str, Any], **kw) -> None:
    """更新任务状态；带 step 时同时追加一条历史日志。"""
    with _lock:
        job.update(kw)
        if "step" in kw:
            job["logs"].append({"t": time.time(), "msg": kw["step"]})


def _progress(job: dict[str, Any], progress: Optional[int] = None, note: Optional[str] = None) -> None:
    """仅更新进度与当前活动文字（不追加历史日志），用于复制等高频细粒度上报。"""
    with _lock:
        if progress is not None:
            job["progress"] = progress
        if note is not None:
            job["step"] = note


def _is_cancelled(job: dict[str, Any]) -> bool:
    with _lock:
        return job["id"] in _cancel


def _check_cancel(job: dict[str, Any]) -> None:
    if _is_cancelled(job):
        raise _Cancelled()


def request_cancel(jid: str) -> dict[str, Any]:
    """请求停止某个打包任务：置取消标志并终止其正在运行的子进程。"""
    with _lock:
        job = _jobs.get(jid)
        if not job:
            return {"success": False, "error": "任务不存在"}
        if job["status"] in ("success", "failed", "cancelled"):
            return {"success": False, "error": "任务已结束，无需停止"}
        _cancel.add(jid)
        job["cancel_requested"] = True
        proc = _procs.get(jid)
    # 锁外终止子进程，避免阻塞
    if proc is not None:
        try:
            proc.terminate()
        except Exception:
            pass
    _set(job, step="正在停止打包…")
    return {"success": True}


def get_job(jid: str) -> Optional[dict[str, Any]]:
    with _lock:
        return dict(_jobs[jid]) if jid in _jobs else None


def list_jobs(limit: int = 30) -> list[dict[str, Any]]:
    with _lock:
        js = sorted(_jobs.values(), key=lambda j: -j["created_at"])
        return [dict(j) for j in js[:limit]]


def _copy_tree_cancellable(src: Path, dst: Path, ignore, job: dict[str, Any],
                           p0: int, p1: int, label: str) -> None:
    """带进度、可中断的目录复制（替代 shutil.copytree，用于体积较大的运行时）。

    - 先快速统计需复制的文件总数，再逐个复制；
    - 每复制若干文件检查一次取消标志（可被用户随时停止）；
    - 进度在 [p0, p1] 区间内随复制比例推进，让用户看到真实进展。
    """
    total = 0
    for root, dirs, files in os.walk(src):
        ig = ignore(root, dirs + files) if ignore else set()
        dirs[:] = [d for d in dirs if d not in ig]
        total += sum(1 for f in files if f not in ig)
    total = max(total, 1)

    done = 0
    last = 0.0
    dst.mkdir(parents=True, exist_ok=True)
    for root, dirs, files in os.walk(src):
        _check_cancel(job)
        ig = ignore(root, dirs + files) if ignore else set()
        dirs[:] = [d for d in dirs if d not in ig]
        target_dir = dst / Path(root).relative_to(src)
        target_dir.mkdir(parents=True, exist_ok=True)
        for f in files:
            if f in ig:
                continue
            if done % 100 == 0:
                _check_cancel(job)
            try:
                shutil.copy2(Path(root) / f, target_dir / f)
            except Exception:
                pass
            done += 1
            now = time.time()
            if now - last > 0.4:
                last = now
                pct = p0 + int((p1 - p0) * done / total)
                _progress(job, progress=min(pct, p1), note=f"{label} {done}/{total} 个文件")
    _progress(job, progress=p1, note=f"{label} 完成（{done} 个文件）")


# ---------- 路径 ----------
def _project_root() -> Path:
    # backend/app/services/workflow_packager.py → 项目根
    return Path(__file__).resolve().parent.parent.parent.parent


def _runtime_python_dir() -> Path:
    root = _project_root()
    for cand in ("Python313", "python313"):
        p = root / cand
        if p.exists():
            return p
    return root / "Python313"


def _workflows_dir() -> Path:
    return _project_root() / "workflows"


def _output_root() -> Path:
    d = _project_root() / "packaged"
    d.mkdir(parents=True, exist_ok=True)
    return d


# ---------- 分析 ----------
def _module_types(workflow: dict[str, Any]) -> set[str]:
    types: set[str] = set()
    for n in (workflow.get("nodes") or []):
        t = n.get("type") or (n.get("data") or {}).get("moduleType")
        if t:
            types.add(str(t))
    return types


def analyze_dependencies(workflow: dict[str, Any]) -> dict[str, Any]:
    """分析工作流用到的模块，推断需要哪些重型依赖组（用于裁剪/提示）。"""
    types = _module_types(workflow)
    needed: set[str] = set()
    for group, keys in _MODULE_DEP_HINTS.items():
        for t in types:
            tl = t.lower()
            if any(k in tl for k in keys):
                needed.add(group)
                break
    return {"module_types": sorted(types), "dep_groups": sorted(needed),
            "module_count": len(types)}


# ---------- 脚本生成（可单测） ----------
def build_runner_script() -> str:
    """生成 run_packaged.py 引导脚本内容（在打包产物里用真实引擎执行工作流）。"""
    return '''# -*- coding: utf-8 -*-
"""WebRPA 打包工作流引导执行器（复用真实执行引擎，保证任何模块行为一致）。"""
import sys, os, json, asyncio

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)            # 让 import app.* 生效
os.chdir(HERE)                       # 资源/相对路径基于运行时目录
os.environ["WEBRPA_PACKAGED"] = "1"  # 标记打包运行：交互模块改用原生弹窗，不依赖前端

# 自带浏览器/OCR模型时，指向打包内的缓存（离线可用）；未自带则回退系统 Edge / 首次联网下载
_pw = os.path.join(HERE, "ms-playwright")
if os.path.isdir(_pw):
    os.environ["PLAYWRIGHT_BROWSERS_PATH"] = _pw
_pdx = os.path.join(HERE, ".paddlex")
if os.path.isdir(_pdx):
    os.environ.setdefault("PADDLE_PDX_CACHE_HOME", HERE)
_easyocr = os.path.join(HERE, ".EasyOCR")
if os.path.isdir(_easyocr):
    os.environ.setdefault("EASYOCR_MODULE_PATH", _easyocr)

if sys.platform == "win32":
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    except Exception:
        pass

def _load_cfg():
    try:
        with open(os.path.join(HERE, "config.json"), "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}

async def _main():
    cfg = _load_cfg()
    from app.services.workflow_runner import run_workflow
    wf_path = os.path.join(HERE, "workflow.json")
    print("=" * 50)
    print("WebRPA 自动化程序启动...")
    print("=" * 50)
    res = await run_workflow(
        wf_path,
        headless=bool(cfg.get("headless", False)),
        source_tag="packaged",
        apply_retry=False,
        record=False,
    )
    ok = res.get("success")
    print("-" * 50)
    print(("[成功] " if ok else "[失败] ") + "执行" + ("完成" if ok else "失败"))
    print("已执行节点: %s  失败节点: %s  耗时: %sms" % (
        res.get("executed_nodes"), res.get("failed_nodes"), res.get("duration_ms")))
    if not ok and res.get("error"):
        print("错误: %s" % res.get("error"))
    return 0 if ok else 1

if __name__ == "__main__":
    code = 1
    try:
        code = asyncio.run(_main())
    except Exception as e:
        import traceback
        traceback.print_exc()
        print("运行异常: %s" % e)
    cfg = _load_cfg()
    if cfg.get("pause_on_exit", True):
        try:
            input("\\n按回车键退出...")
        except Exception:
            pass
    sys.exit(code)
'''


def build_launcher_script(runtime_dirname: str = "webrpa_runtime",
                          show_console: bool = True) -> str:
    """生成 _launcher.py（被 PyInstaller 编译成 <名称>.exe 的极小启动器）。
    它只负责用运行时 python 启动 run_packaged.py——重活在运行时里，启动器无重依赖、编译快而稳。
    兼容两种布局：portable（自带 runtime/python）与 shared（读 WEBRPA_HOME.txt 用本机 WebRPA 的 python）。"""
    return f'''# -*- coding: utf-8 -*-
"""WebRPA 打包工作流启动器（极小引导，调用同目录运行时执行工作流）。"""
import os, sys, subprocess

def _base():
    if getattr(sys, "frozen", False):
        return os.path.dirname(sys.executable)   # exe 真实所在目录
    return os.path.dirname(os.path.abspath(__file__))

def _resolve_python(rt):
    # 1) portable：自带运行时 python
    for exe in ("python.exe", "pythonw.exe"):
        p = os.path.join(rt, "python", exe)
        if os.path.exists(p):
            return p
    # 2) shared：读 WEBRPA_HOME.txt，用本机 WebRPA 的 Python313
    home_file = os.path.join(rt, "WEBRPA_HOME.txt")
    if os.path.exists(home_file):
        try:
            with open(home_file, "r", encoding="utf-8") as f:
                home = f.read().strip()
            for d in ("Python313", "python313"):
                p = os.path.join(home, d, "python.exe")
                if os.path.exists(p):
                    return p
        except Exception:
            pass
    return None

def main():
    base = _base()
    rt = os.path.join(base, "{runtime_dirname}")
    runner = os.path.join(rt, "run_packaged.py")
    py = _resolve_python(rt)
    if not py or not os.path.exists(runner):
        print("运行时缺失，无法启动。请确保 {runtime_dirname} 目录与本程序在一起。")
        try:
            input("按回车退出...")
        except Exception:
            pass
        return 1
    return subprocess.call([py, runner], cwd=rt)

if __name__ == "__main__":
    sys.exit(main())
'''


# ---------- 运行时裁剪：依赖组 → site-packages 顶层目录前缀 ----------
# 仅当工作流未用到对应能力时，才可从 portable 运行时里排除这些重型包以瘦身。
_DEP_GROUP_PACKAGES: dict[str, list[str]] = {
    "ocr": ["paddleocr", "paddle", "paddlex", "easyocr"],
    "vision": ["cv2", "opencv", "skimage", "scikit_image"],
    "ai": ["torch", "transformers", "sentence_transformers", "tokenizers"],
    "office": [],   # python-docx/openpyxl 体积小，始终保留
    "media": ["moviepy", "imageio_ffmpeg"],
}

# 始终排除的体积大且打包无用的目录/文件名片段
_ALWAYS_IGNORE = {"__pycache__", ".pytest_cache", "tests", "test", "*.pyc", "*.pyo",
                  "*.dist-info", "*.egg-info"}


def _build_ignore(slim: bool, needed_groups: set[str]):
    """构造 shutil.copytree 的 ignore 回调：始终去缓存；slim 时去掉未用到的重型包。"""
    drop_pkgs: set[str] = set()
    if slim:
        for group, pkgs in _DEP_GROUP_PACKAGES.items():
            if group not in needed_groups:
                drop_pkgs.update(pkgs)

    def _ignore(directory: str, names: list[str]) -> set[str]:
        ig: set[str] = set()
        for n in names:
            if n in ("__pycache__", ".pytest_cache"):
                ig.add(n)
            elif n.endswith((".pyc", ".pyo")):
                ig.add(n)
            elif n in drop_pkgs:
                ig.add(n)
        return ig

    return _ignore


def _copy_assets(workflow: dict[str, Any], runtime_dir: Path) -> int:
    """把工作流可能用到的本地资源拷进运行时，保证打包后这些模块仍能找到资源：
    - Excel 数据资源 / 图片资源：实际存放在 backend/uploads/{excel,images}，
      执行器按模块文件 __file__ 解析为 runtime/uploads/{excel,images}（导入时扫描登记）。
    - 自定义模块：执行器按 cwd 相对路径 backend/data/custom_modules 解析 → runtime/backend/data/custom_modules。
    （不含任何敏感凭据）"""
    root = _project_root()
    copied = 0
    # 1) uploads：Excel / 图片资源
    uploads = root / "backend" / "uploads"
    if uploads.exists():
        for sub in ("excel", "images"):
            s = uploads / sub
            if s.is_dir():
                try:
                    shutil.copytree(s, runtime_dir / "uploads" / sub,
                                    dirs_exist_ok=True,
                                    ignore=shutil.ignore_patterns("__pycache__"))
                    copied += 1
                except Exception as e:
                    print(f"[packager] 复制 uploads/{sub} 失败: {e}")
    # 2) 自定义模块（cwd 相对解析）
    cm = root / "backend" / "data" / "custom_modules"
    if cm.is_dir():
        try:
            shutil.copytree(cm, runtime_dir / "backend" / "data" / "custom_modules",
                            dirs_exist_ok=True)
            copied += 1
        except Exception as e:
            print(f"[packager] 复制 custom_modules 失败: {e}")
    return copied


def _bundle_heavy_runtimes(runtime_dir: Path, needed: set[str], job: dict[str, Any]) -> None:
    """portable 模式下，按工作流需要把浏览器内核 / OCR 模型缓存打进包，保证离线也能跑。"""
    home = Path(os.path.expanduser("~"))
    local = Path(os.environ.get("LOCALAPPDATA", str(home / "AppData" / "Local")))

    # 浏览器内核（Playwright）：网页类工作流默认用系统 Edge，无需内核；但若用户用了内置 Chromium
    # 则需自带。这里只要检测到 browser 依赖就尽量打包内核，保证任意浏览器配置离线可用。
    if "browser" in needed:
        src = local / "ms-playwright"
        if src.is_dir():
            try:
                _set(job, step="打包浏览器内核（Playwright，可随时点停止）")
                _copy_tree_cancellable(src, runtime_dir / "ms-playwright",
                                       shutil.ignore_patterns("__pycache__"), job,
                                       p0=68, p1=70, label="打包浏览器内核")
            except _Cancelled:
                raise
            except Exception as e:
                print(f"[packager] 复制浏览器内核失败: {e}")

    # OCR 模型缓存（PaddleX / PaddleOCR）
    if "ocr" in needed:
        pdx = home / ".paddlex"
        if pdx.is_dir():
            try:
                _set(job, step="打包 OCR 模型（PaddleOCR，可随时点停止）")
                _copy_tree_cancellable(pdx, runtime_dir / ".paddlex",
                                       shutil.ignore_patterns("__pycache__"), job,
                                       p0=70, p1=72, label="打包 OCR 模型")
            except _Cancelled:
                raise
            except Exception as e:
                print(f"[packager] 复制 OCR 模型失败: {e}")
        easyocr = home / ".EasyOCR"
        if easyocr.is_dir():
            try:
                _copy_tree_cancellable(easyocr, runtime_dir / ".EasyOCR", None, job,
                                       p0=72, p1=72, label="打包 EasyOCR 模型")
            except _Cancelled:
                raise
            except Exception as e:
                print(f"[packager] 复制 EasyOCR 模型失败: {e}")


def package(workflow_source: Any, output_name: str, *, mode: str = "portable",
            headless: bool = False, show_console: bool = True,
            slim: bool = False, icon_path: Optional[str] = None) -> dict[str, Any]:
    """启动一个打包任务（后台执行）。返回 {job_id}。
    - workflow_source: 本地工作流文件名 / 路径 / 完整 dict
    - output_name: 输出程序名（即 exe 名）
    - mode: portable（自包含，拷贝运行时）/ shared（依赖本机已装的 WebRPA 运行时，包很小）
    - slim: 默认 False（携带完整运行时，保证任何模块都不缺依赖）；True 时按工作流用到的模块裁剪重型依赖以瘦身
    """
    from app.services.workflow_runner import load_workflow_dict
    job = _new_job()
    try:
        wf = load_workflow_dict(workflow_source) if not isinstance(workflow_source, dict) else dict(workflow_source)
    except Exception as e:
        _set(job, status="failed", error=f"无法加载工作流：{e}")
        return {"job_id": job["id"], "status": "failed", "error": job["error"]}

    safe_name = "".join(c for c in (output_name or "WebRPA自动化") if c not in '\\/:*?"<>|').strip() or "WebRPA自动化"
    job["output_name"] = safe_name
    job["mode"] = mode

    t = threading.Thread(target=_run_build, args=(job, wf, safe_name, mode, headless,
                                                  show_console, slim, icon_path), daemon=True)
    t.start()
    return {"job_id": job["id"], "status": "pending"}


def _run_build(job: dict[str, Any], wf: dict[str, Any], name: str, mode: str,
               headless: bool, show_console: bool, slim: bool, icon_path: Optional[str]) -> None:
    dist: Optional[Path] = None
    try:
        _set(job, status="running", progress=2, step="分析工作流依赖")
        analysis = analyze_dependencies(wf)
        needed = set(analysis["dep_groups"])
        _check_cancel(job)

        dist = _output_root() / name
        if dist.exists():
            shutil.rmtree(dist, ignore_errors=True)
        runtime = dist / "webrpa_runtime"
        runtime.mkdir(parents=True, exist_ok=True)

        # 1) 拷贝执行引擎（小）
        _set(job, progress=8, step="复制执行引擎")
        shutil.copytree(_project_root() / "backend" / "app", runtime / "app",
                        ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))
        _check_cancel(job)

        # 2) 工作流 + 配置 + 资源
        _set(job, progress=15, step="写入工作流与配置")
        (runtime / "workflow.json").write_text(json.dumps(wf, ensure_ascii=False, indent=2),
                                               encoding="utf-8")
        (runtime / "config.json").write_text(json.dumps(
            {"headless": headless, "pause_on_exit": show_console}, ensure_ascii=False), encoding="utf-8")
        (runtime / "run_packaged.py").write_text(build_runner_script(), encoding="utf-8")
        assets = _copy_assets(wf, runtime)
        _set(job, progress=22, step=f"已复制 {assets} 类资源")
        _check_cancel(job)

        # 3) 运行时 python
        if mode == "portable":
            _set(job, progress=25, step="复制 Python 运行时（较大，可随时点停止）")
            src_py = _runtime_python_dir()
            if not src_py.exists():
                raise RuntimeError("找不到 WebRPA Python 运行时目录")
            # 可中断 + 带进度的复制（替代一次性阻塞的 copytree）
            _copy_tree_cancellable(src_py, runtime / "python",
                                   _build_ignore(slim, needed), job,
                                   p0=25, p1=68, label="复制 Python 运行时")
            _set(job, progress=68, step="Python 运行时复制完成")
            _check_cancel(job)
            # 按需打包浏览器内核 / OCR 模型，保证重型模块离线可用
            _bundle_heavy_runtimes(runtime, needed, job)
            _set(job, progress=72, step="重型依赖打包完成")
        else:
            # shared：写一个指向本机 WebRPA 安装的引导，python 用本机的
            (runtime / "WEBRPA_HOME.txt").write_text(str(_project_root()), encoding="utf-8")
            _set(job, progress=70, step="共享模式：使用本机 WebRPA 运行时")
        _check_cancel(job)

        # 4) 启动器（exe 优先，失败回退 bat）
        _set(job, progress=75, step="生成启动器")
        exe_path = _build_launcher(dist, runtime, name, show_console, icon_path, mode, job)
        _check_cancel(job)

        # 5) 收尾
        size = _dir_size_mb(dist)
        _set(job, status="success", progress=100, step="打包完成",
             output_dir=str(dist), exe_path=str(exe_path) if exe_path else None, size_mb=size)
    except _Cancelled:
        # 用户主动停止：清理半成品目录，标记为已取消
        if dist is not None:
            shutil.rmtree(dist, ignore_errors=True)
        _set(job, status="cancelled", progress=0, step="打包已被用户停止")
    except Exception as e:
        import traceback
        traceback.print_exc()
        _set(job, status="failed", error=str(e), step=f"打包失败：{e}")
    finally:
        with _lock:
            _cancel.discard(job["id"])
            _procs.pop(job["id"], None)


def _dir_size_mb(d: Path) -> float:
    total = 0
    for p in d.rglob("*"):
        if p.is_file():
            try:
                total += p.stat().st_size
            except Exception:
                pass
    return round(total / (1024 * 1024), 1)


def _build_launcher(dist: Path, runtime: Path, name: str, show_console: bool,
                    icon_path: Optional[str], mode: str, job: dict[str, Any]) -> Optional[Path]:
    """优先用 PyInstaller 编译极小启动器为 <name>.exe；不可用则回退生成 启动.bat。"""
    # 始终生成 bat 兜底（保证可运行）
    py_rel = "webrpa_runtime\\python\\python.exe" if mode == "portable" else None
    bat = dist / "启动.bat"
    if mode == "portable":
        bat.write_text(
            "@echo off\r\nchcp 65001 >nul\r\ncd /d \"%~dp0\"\r\n"
            "\"webrpa_runtime\\python\\python.exe\" \"webrpa_runtime\\run_packaged.py\"\r\n",
            encoding="utf-8")
    else:
        bat.write_text(
            "@echo off\r\nchcp 65001 >nul\r\ncd /d \"%~dp0\"\r\n"
            "for /f \"usebackq delims=\" %%p in (\"webrpa_runtime\\WEBRPA_HOME.txt\") do set WRH=%%p\r\n"
            "\"%WRH%\\Python313\\python.exe\" \"webrpa_runtime\\run_packaged.py\"\r\n",
            encoding="utf-8")

    # 尝试 PyInstaller（仅当已安装；不在打包流程里自动联网安装，避免长时间卡住）
    try:
        import subprocess
        py = _runtime_python_dir() / "python.exe"
        check = subprocess.run([str(py), "-c", "import PyInstaller"], capture_output=True)
        if check.returncode != 0:
            _set(job, step="未安装 PyInstaller，已生成 启动.bat（可正常运行）；如需 .exe 请先在系统设置中一键安装打包工具")
            return None
        launcher_src = dist / "_launcher.py"
        launcher_src.write_text(build_launcher_script(show_console=show_console), encoding="utf-8")
        args = [str(py), "-m", "PyInstaller", "--onefile", "--name", name,
                "--distpath", str(dist), "--workpath", str(dist / "_build"),
                "--specpath", str(dist / "_build")]
        if not show_console:
            args.append("--noconsole")
        if icon_path and Path(icon_path).exists():
            args += ["--icon", str(icon_path)]
        args.append(str(launcher_src))
        _set(job, step="编译启动器 EXE（可随时点停止）")
        # 用 Popen 以便取消时能终止；注册到 _procs 供 request_cancel 终止
        proc = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                text=True, errors="ignore")
        with _lock:
            _procs[job["id"]] = proc
        try:
            out, _ = proc.communicate(timeout=1200)
        finally:
            with _lock:
                _procs.pop(job["id"], None)
        # 若是被用户取消而终止，向上抛出由 _run_build 统一处理
        _check_cancel(job)
        exe = dist / f"{name}.exe"
        if proc.returncode == 0 and exe.exists():
            # 清理 PyInstaller 中间产物
            shutil.rmtree(dist / "_build", ignore_errors=True)
            launcher_src.unlink(missing_ok=True)
            bat.unlink(missing_ok=True)  # 有 exe 就不留 bat
            return exe
        _set(job, step="EXE 编译未成功，已回退为 启动.bat（可正常运行）")
    except _Cancelled:
        raise
    except Exception as e:
        _set(job, step=f"EXE 编译跳过（{str(e)[:60]}），已生成 启动.bat")
    return None


def packaging_toolchain_status() -> dict[str, Any]:
    """检查打包工具链（PyInstaller）是否就绪。"""
    import subprocess
    py = _runtime_python_dir() / "python.exe"
    try:
        r = subprocess.run([str(py), "-c", "import PyInstaller,sys;print(PyInstaller.__version__)"],
                           capture_output=True, text=True, errors="ignore")
        if r.returncode == 0:
            return {"installed": True, "version": (r.stdout or "").strip()}
    except Exception:
        pass
    return {"installed": False}


def install_packaging_toolchain() -> dict[str, Any]:
    """一键安装 PyInstaller（需联网）。"""
    import subprocess
    py = _runtime_python_dir() / "python.exe"
    try:
        r = subprocess.run([str(py), "-m", "pip", "install", "pyinstaller"],
                           capture_output=True, text=True, errors="ignore", timeout=900)
        if r.returncode == 0:
            return {"success": True, **packaging_toolchain_status()}
        return {"success": False, "error": (r.stderr or r.stdout or "")[-300:]}
    except Exception as e:
        return {"success": False, "error": str(e)}
