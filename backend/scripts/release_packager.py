# -*- coding: utf-8 -*-
"""WebRPA 一键发布打包器

一条命令产出模块化分发的全部发布物：

    1. 全部功能模块包 zip        -> 发布产物/feature_packs/<id>-v<版本>.zip + packs_index.json
    2. 瘦身核心目录（文件夹，可直接试跑，自行手动打包 7z）
                                 -> 发布产物/WebRPA-<版本>-核心包/
    3. SHA256 校验和清单（仅功能包） -> 发布产物/checksums-v<版本>.txt

核心目录构建时自动排除：开发产物（.git / node_modules(launcher) / release 等）、
本机隐私与运行时数据（密钥/账号/任务/会话/工作流/采集数据），以及全部功能包载荷。
核心包不再自动压缩为 zip，而是在 发布产物/ 内保留文件夹，由发布者自行手动打包为 7z。

用法（项目根目录，或直接双击根目录的 一键打包发布.bat）：
    Python313\\python.exe backend\\scripts\\release_packager.py              # 全流程
    Python313\\python.exe backend\\scripts\\release_packager.py --packs-only # 只打功能包
    Python313\\python.exe backend\\scripts\\release_packager.py --core-only  # 只打核心包（复用已有功能包）
    Python313\\python.exe backend\\scripts\\release_packager.py --workdir D:\\build\\core  # 自定义核心构建目录
    Python313\\python.exe backend\\scripts\\release_packager.py --clean-workdir           # 打完后删除核心构建目录
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND.parent
sys.path.insert(0, str(BACKEND))

from app.services.feature_packs import FEATURE_PACKS  # noqa: E402

OUTPUT_DIR = PROJECT_ROOT / "发布产物"
PACKS_DIR = OUTPUT_DIR / "feature_packs"

# ---------------- 核心目录复制排除清单 ----------------

# 目录（项目根相对路径，robocopy 用绝对路径排除）
EXCLUDE_DIRS = [
    ".git", ".kiro", ".vscode", "website", "发布产物", "packaged", "logs", "data", "workflows",
    r"launcher\node_modules", r"launcher\release", r"launcher\dist",
    r"frontend\dist", r"frontend\.vite",
    r"backend\browser_data", r"backend\uploads", r"backend\logs",
    r"backend\recordings", r"backend\allure_reports",
    # 隐私 / 运行时数据目录
    r"backend\data\ai_assistant", r"backend\data\custom_modules",
    r"backend\data\feature_packs", r"backend\data\knowledge_base",
    r"backend\data\rbac", r"backend\data\ai_screenshots",
    # 功能包载荷目录（先在复制阶段排除大头，加速；strip 阶段兜底删净）
    r"backend\models", r"backend\scrcpy", r"backend\poppler", r"backend\pandoc",
    r"backend\data\easyocr_models", r"backend\data\whisper_models",
    r"backend\data\mediapipe_models",
    "models", "NapCat",
]
# 目录（按名字全局排除）
EXCLUDE_DIR_NAMES = ["__pycache__", ".pytest_cache"]

# 文件（项目根相对路径 / 通配名）
EXCLUDE_FILES = [
    "*.log", "*.pid", "*.7z", "WebRPA v*.md",
    # 本机维护脚本（不随发布分发）
    "一键更新WebRPA版本.bat", "一键更新WebRPA版本.txt", "_update_version.ps1",
    "一键清空敏感数据.bat", "_clean_sensitive_data.ps1",
    # 功能包载荷（单文件工具）
    r"backend\ffmpeg.exe", r"backend\ffprobe.exe", r"backend\m3u8.exe",
    r"backend\pandoc.exe", r"backend\yt-dlp.exe",
    # 隐私 / 运行时数据文件
    r"backend\data\credentials.enc", r"backend\data\security.json",
    r"backend\data\global_vars.json", r"backend\data\scheduled_tasks.json",
    r"backend\data\scheduled_task_logs.json",
    r"backend\data\INITIAL_ADMIN_PASSWORD.txt",
    r"backend\data\webdav.json", r"backend\data\workflow_folder.json",
    r"backend\data\mcp.json",
]

# 兜底清扫：核心目录里如仍存在这些运行时/隐私文件则删除（防手工验证过程二次生成）
SWEEP_DATA_FILES = [
    "credentials.enc", "security.json", "global_vars.json",
    "scheduled_tasks.json", "scheduled_task_logs.json",
    "INITIAL_ADMIN_PASSWORD.txt", "webdav.json", "workflow_folder.json",
    "mcp.json", "rbac.json", "rbac_enforce.json", "robots.json",
    "cluster_tasks.json", "browser_config.json", "execution_history.jsonl",
    "command_audit.log", "alerts.json", "run_queue.json", "health_inspect.json",
]
SWEEP_DATA_DIRS = [
    "ai_assistant", "custom_modules", "feature_packs", "knowledge_base",
    "rbac", "ai_screenshots", "easyocr_models", "whisper_models",
    "mediapipe_models",
]


def read_version() -> str:
    try:
        pkg = json.loads((PROJECT_ROOT / "frontend" / "package.json").read_text(encoding="utf-8"))
        return str(pkg.get("version", "0.0.0"))
    except Exception:
        return "0.0.0"


def step(title: str) -> None:
    print(f"\n{'=' * 56}\n  {title}\n{'=' * 56}", flush=True)


def build_feature_packs() -> bool:
    step("步骤 1/3：构建全部功能模块包")
    rc = subprocess.run(
        [sys.executable, str(BACKEND / "scripts" / "build_feature_packs.py")],
        cwd=str(PROJECT_ROOT),
    ).returncode
    if rc != 0:
        print("[错误] 功能包构建失败")
        return False
    return True


def copy_core(workdir: Path) -> bool:
    step(f"步骤 2/3：复制核心目录 -> {workdir}")
    if workdir.exists():
        print("  清空旧的构建目录 ...")
        shutil.rmtree(workdir)
    workdir.mkdir(parents=True, exist_ok=True)

    cmd = [
        "robocopy", str(PROJECT_ROOT), str(workdir),
        "/E", "/COPY:DAT", "/DCOPY:DAT", "/R:1", "/W:1",
        "/NFL", "/NDL", "/NP", "/MT:8",
        "/XD",
    ]
    cmd += [str(PROJECT_ROOT / d) for d in EXCLUDE_DIRS]
    cmd += EXCLUDE_DIR_NAMES
    cmd += [str(workdir)]  # 防构建目录嵌套自身
    cmd += ["/XF"]
    for f in EXCLUDE_FILES:
        cmd.append(f if "*" in f or "\\" not in f else str(PROJECT_ROOT / f))
    rc = subprocess.run(cmd).returncode
    # robocopy 返回码 0-7 均为成功（含"有文件复制/有额外文件"），>=8 才是错误
    if rc >= 8:
        print(f"[错误] robocopy 失败，返回码 {rc}")
        return False
    print(f"  复制完成（robocopy 返回码 {rc}）")
    return True


def strip_core(workdir: Path) -> None:
    step("步骤 3/3：瘦身核心目录（移除功能包载荷 + 清扫隐私/运行时数据）")
    removed = 0
    for pack in FEATURE_PACKS:
        for rel in pack.payload_paths:
            target = workdir / rel.rstrip("/")
            if not target.exists():
                continue
            if target.is_dir():
                shutil.rmtree(target, ignore_errors=True)
            else:
                target.unlink(missing_ok=True)
            removed += 1
    data_dir = workdir / "backend" / "data"
    for name in SWEEP_DATA_FILES:
        (data_dir / name).unlink(missing_ok=True)
    for name in SWEEP_DATA_DIRS:
        d = data_dir / name
        if d.exists():
            shutil.rmtree(d, ignore_errors=True)
    for extra in (workdir / "data", workdir / "backend" / "logs"):
        if extra.exists():
            shutil.rmtree(extra, ignore_errors=True)
    size = sum(f.stat().st_size for f in workdir.rglob("*") if f.is_file())
    print(f"  移除载荷 {removed} 处；核心目录体积 {size / 1024 / 1024 / 1024:.2f} GB")


def write_checksums(version: str) -> None:
    # 核心包现在以文件夹形式保留、由发布者手动打包 7z，故只对功能包 zip 生成校验和
    files = []
    if PACKS_DIR.exists():
        files += sorted(PACKS_DIR.glob("*.zip"))
    if not files:
        return
    out = OUTPUT_DIR / f"checksums-v{version}.txt"
    lines = []
    for f in files:
        h = hashlib.sha256()
        with open(f, "rb") as fh:
            for chunk in iter(lambda: fh.read(4 * 1024 * 1024), b""):
                h.update(chunk)
        lines.append(f"{h.hexdigest()}  {f.name}  ({f.stat().st_size / 1024 / 1024:.1f} MB)")
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"\n校验和已写入: {out}")


def main() -> int:
    parser = argparse.ArgumentParser(description="WebRPA 一键发布打包器")
    parser.add_argument("--packs-only", action="store_true", help="只构建功能模块包")
    parser.add_argument("--core-only", action="store_true", help="只构建核心包（复用已有功能包产物）")
    parser.add_argument("--workdir", type=str, default="",
                        help="核心构建目录（默认：发布产物/WebRPA-<版本>-核心包）")
    parser.add_argument("--clean-workdir", action="store_true", help="打包完成后删除核心构建目录")
    args = parser.parse_args()

    version = read_version()
    print(f"WebRPA 一键发布打包器  版本 v{version}")
    print(f"项目目录: {PROJECT_ROOT}")
    started = time.time()

    if not args.core_only:
        if not build_feature_packs():
            return 1

    if not args.packs_only:
        # 核心包目录默认放在 发布产物/ 内、以文件夹形式保留（发布者自行手动打包 7z）。
        # 复制阶段 EXCLUDE_DIRS 已排除 发布产物，且 robocopy /XD 排除 workdir 自身，
        # 双重保证不会把 发布产物 / 核心目录自身递归复制进去。
        workdir = Path(args.workdir) if args.workdir else OUTPUT_DIR / f"WebRPA-{version}-核心包"
        wd = workdir.resolve()
        root = PROJECT_ROOT.resolve()
        if wd == root:
            print(f"[错误] 核心构建目录不能等于项目根目录: {wd}")
            return 2
        if wd == Path(wd.anchor):
            print(f"[错误] 核心构建目录不能是磁盘根目录: {wd}")
            return 2
        if not copy_core(wd):
            return 1
        strip_core(wd)
        # 清除历史遗留的核心包 zip（旧版脚本会压 zip，现在只留文件夹，防止残留误导）
        stale_zip = OUTPUT_DIR / f"WebRPA-{version}-核心包.zip"
        if stale_zip.exists():
            stale_zip.unlink()
            print(f"  已删除历史遗留的核心包 zip: {stale_zip.name}")
        if args.clean_workdir:
            print("  删除核心构建目录 ...")
            shutil.rmtree(wd, ignore_errors=True)
        else:
            print(f"\n  核心包目录已生成（请自行手动打包为 7z）: {wd}")

    write_checksums(version)

    step("全部完成")
    print(f"总耗时 {time.time() - started:.0f}s，发布产物在: {OUTPUT_DIR}")
    print("上传清单：核心包文件夹(手动打 7z) + feature_packs/*.zip + packs_index.json + checksums")
    return 0


if __name__ == "__main__":
    sys.exit(main())
