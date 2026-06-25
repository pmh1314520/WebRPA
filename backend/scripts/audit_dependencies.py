"""第三方依赖完整性核验脚本（需求 5 / Property 10）。

职责：
  1. 用 ast 静态解析 backend/app/executors/*.py 的全部 import（含函数内延迟 import），
     取顶层包名，剔除标准库（sys.stdlib_module_names）与项目内部包（app.* / 相对导入），
     得到「第三方 import 名 -> 引用它的执行器文件集合」清单。
  2. 在内置运行时 Python313/python.exe 子进程中逐个 importlib.import_module，
     区分 'ok' | 'missing'（ModuleNotFoundError）| 'error: ...'（其他导入错误，如 DLL）。
  3. 提供 import 名 -> pip 包名映射表 IMPORT_TO_PIP 与安装能力 install_missing。
  4. main() 打印 ok / missing / errored 三集合报告。

约定：脚本只做核验并提供安装能力；是否真正执行安装由命令行参数 --install 控制
（本核验任务默认仅 collect+verify，不安装）。

运行（从项目根）：
    .\\Python313\\python.exe backend\\scripts\\audit_dependencies.py
"""
from __future__ import annotations

import argparse
import ast
import json
import subprocess
import sys
from pathlib import Path


# ---------------------------------------------------------------------------
# 路径推导：脚本位于 backend/scripts/，项目根为其上两级。
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
PROJECT_ROOT = BACKEND_DIR.parent
EXECUTORS_DIR = BACKEND_DIR / "app" / "executors"


def _default_python_exe() -> Path:
    """返回内置运行时解释器路径；若不存在则回退到当前解释器。"""
    candidate = PROJECT_ROOT / "Python313" / "python.exe"
    if candidate.exists():
        return candidate
    return Path(sys.executable)


# ---------------------------------------------------------------------------
# import 名 -> pip 包名映射（仅安装时需要；import 名与 pip 名不一致的常见项）。
# ---------------------------------------------------------------------------
IMPORT_TO_PIP: dict[str, str] = {
    "cv2": "opencv-python",
    "bs4": "beautifulsoup4",
    "PIL": "pillow",
    "yaml": "PyYAML",
    "win32com": "pywin32",
    "win32api": "pywin32",
    "win32con": "pywin32",
    "win32gui": "pywin32",
    "win32clipboard": "pywin32",
    "win32file": "pywin32",
    "win32process": "pywin32",
    "win32event": "pywin32",
    "pythoncom": "pywin32",
    "pywintypes": "pywin32",
    "fitz": "PyMuPDF",
    "docx": "python-docx",
    "pptx": "python-pptx",
    "dotenv": "python-dotenv",
    "dateutil": "python-dateutil",
    "sklearn": "scikit-learn",
    "skimage": "scikit-image",
    "OpenSSL": "pyOpenSSL",
    "Crypto": "pycryptodome",
    "Cryptodome": "pycryptodomex",
    "jose": "python-jose",
    "jwt": "PyJWT",
    "magic": "python-magic",
    "serial": "pyserial",
    "usb": "pyusb",
    "ldap3": "ldap3",
    "google": "google-api-python-client",
    "googleapiclient": "google-api-python-client",
    "pymysql": "PyMySQL",
    "psycopg2": "psycopg2-binary",
    "MySQLdb": "mysqlclient",
    "zmq": "pyzmq",
    "nacl": "PyNaCl",
    "Xlib": "python-xlib",
    "pkg_resources": "setuptools",
    "speech_recognition": "SpeechRecognition",
    "wx": "wxPython",
    "gi": "PyGObject",
    "cairo": "pycairo",
    "telebot": "pyTelegramBotAPI",
    "tesserocr": "tesserocr",
    "pytesseract": "pytesseract",
    "paddleocr": "paddleocr",
    "paddle": "paddlepaddle",
    "playwright": "playwright",
    "DrissionPage": "DrissionPage",
    "ddddocr": "ddddocr",
    "apprise": "apprise",
    "openpyxl": "openpyxl",
    "yt_dlp": "yt-dlp",
}


def import_to_pip(import_name: str) -> str:
    """把 import 名转换为 pip 包名（无映射则按原名）。"""
    return IMPORT_TO_PIP.get(import_name, import_name)


# ---------------------------------------------------------------------------
# 已人工确认的 errored 豁免项（运行时数据/环境问题，非缺库）。
#
# Property 10 要求：missing 为空即缺库覆盖率达 1.0；errored 中的「非缺失」项需逐项
# 记录并人工确认。以下登记的 import 名表示「库本身已安装、但导入时因运行时数据文件
# 或环境因素报错」，应豁免、不计入缺库覆盖率缺口。键为 import 名，值为豁免说明。
# ---------------------------------------------------------------------------
EXEMPT_RUNTIME_ERRORS: dict[str, str] = {
    "face_recognition": (
        "库 face_recognition / face_recognition_models / dlib 均已安装，模型文件 "
        "shape_predictor_68_face_landmarks.dat 也存在且完整(~95MB)。导入时报 "
        "RuntimeError: Unable to open ...shape_predictor_68_face_landmarks.dat，根因是 "
        "dlib(C++ std::ifstream) 在 Windows 上无法打开绝对路径含非 ASCII(中文)字符的文件，"
        "而本仓库安装路径含中文(文件盘扩展/新版)。这属于运行时环境/数据文件加载问题，非缺库；"
        "执行器(media.py/media_recognition.py/trigger.py)均为函数内延迟 import 且 try/except "
        "兜底，不影响其余模块加载。豁免，不计入缺库覆盖率缺口。"
    ),
}


# ---------------------------------------------------------------------------
# 静态分析：收集第三方 import。
# ---------------------------------------------------------------------------
def _top_level_name(dotted: str) -> str:
    """取点分模块名的顶层包名，例如 'win32com.client' -> 'win32com'。"""
    return dotted.split(".", 1)[0]


def _is_internal(import_name: str) -> bool:
    """项目内部包：app.* 顶层（app）视为内部，不计入第三方。"""
    return import_name == "app"


def collect_third_party_imports(executors_dir: Path) -> dict[str, set[str]]:
    """ast 解析所有执行器文件（含函数内延迟 import），返回第三方 import 清单。

    返回：import 顶层名 -> 引用它的执行器文件名集合。
    剔除：sys.stdlib_module_names 标准库、app.* 内部包、相对导入（from . import x）。
    """
    stdlib = set(sys.stdlib_module_names)
    result: dict[str, set[str]] = {}

    py_files = sorted(executors_dir.glob("*.py"))
    for py_file in py_files:
        try:
            # utf-8-sig 可同时正确处理带 BOM(U+FEFF) 与不带 BOM 的源文件。
            source = py_file.read_text(encoding="utf-8-sig")
        except (OSError, UnicodeDecodeError) as exc:
            print(f"[audit] 读取失败 {py_file.name}: {exc}", file=sys.stderr)
            continue
        try:
            tree = ast.parse(source, filename=str(py_file))
        except SyntaxError as exc:
            print(f"[audit] 解析失败 {py_file.name}: {exc}", file=sys.stderr)
            continue

        # ast.walk 会遍历所有节点，因此函数内的延迟 import 也会被收集到。
        for node in ast.walk(tree):
            names: list[str] = []
            if isinstance(node, ast.Import):
                # import a, b.c as d
                names = [_top_level_name(alias.name) for alias in node.names]
            elif isinstance(node, ast.ImportFrom):
                # from x import y —— 相对导入 node.level > 0，跳过（项目内部）。
                if node.level and node.level > 0:
                    continue
                if not node.module:
                    continue
                names = [_top_level_name(node.module)]
            else:
                continue

            for name in names:
                if not name:
                    continue
                if name in stdlib:
                    continue
                if _is_internal(name):
                    continue
                result.setdefault(name, set()).add(py_file.name)

    return result


# ---------------------------------------------------------------------------
# 运行时核验：在 Python313 子进程逐个 import。
# ---------------------------------------------------------------------------
# 子进程内执行的探测脚本：对每个名字 import 并打印 JSON 结果。
_PROBE_CODE = r"""
import importlib, json, sys
names = json.loads(sys.argv[1])
out = {}
for n in names:
    try:
        importlib.import_module(n)
        out[n] = "ok"
    except ModuleNotFoundError as e:
        # 区分「目标库本身缺失」与「目标库存在但其依赖缺失」。
        missing = getattr(e, "name", None)
        if missing and (missing == n or missing.split(".", 1)[0] == n.split(".", 1)[0]):
            out[n] = "missing"
        else:
            out[n] = "error: ModuleNotFoundError: " + str(e)
    except Exception as e:
        out[n] = "error: " + type(e).__name__ + ": " + str(e)
print(json.dumps(out))
"""


def verify_imports_in_runtime(py_exe: Path, import_names: set[str]) -> dict[str, str]:
    """在内置运行时子进程逐个 importlib.import_module。

    返回：import 名 -> 'ok' | 'missing' | 'error: ...'。
    """
    names = sorted(import_names)
    if not names:
        return {}

    try:
        proc = subprocess.run(
            [str(py_exe), "-c", _PROBE_CODE, json.dumps(names)],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=600,
        )
    except subprocess.TimeoutExpired:
        return {n: "error: probe timeout" for n in names}

    stdout = (proc.stdout or "").strip()
    # 探测脚本仅在最后一行输出 JSON；取最后一个非空行解析，避免库的打印噪声干扰。
    parsed: dict[str, str] | None = None
    for line in reversed(stdout.splitlines()):
        line = line.strip()
        if not line:
            continue
        try:
            parsed = json.loads(line)
            break
        except json.JSONDecodeError:
            continue

    if parsed is None:
        err = (proc.stderr or "").strip() or "no output"
        return {n: f"error: probe failed: {err[:200]}" for n in names}

    # 兜底：确保每个请求名都有结果。
    for n in names:
        parsed.setdefault(n, "error: no result")
    return parsed


# ---------------------------------------------------------------------------
# 安装能力（本核验任务默认不调用）。
# ---------------------------------------------------------------------------
def install_missing(py_exe: Path, missing: set[str]) -> dict[str, bool]:
    """用 py_exe -m pip install <pip_name> 安装缺失库，返回 import名 -> 是否成功。"""
    results: dict[str, bool] = {}
    for import_name in sorted(missing):
        pip_name = import_to_pip(import_name)
        print(f"[audit] 安装 {import_name} -> pip install {pip_name}")
        try:
            proc = subprocess.run(
                [str(py_exe), "-m", "pip", "install", pip_name],
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=1800,
            )
            ok = proc.returncode == 0
            results[import_name] = ok
            if not ok:
                tail = (proc.stderr or proc.stdout or "").strip()[-400:]
                print(f"[audit] 安装 {pip_name} 失败: {tail}", file=sys.stderr)
        except subprocess.TimeoutExpired:
            results[import_name] = False
            print(f"[audit] 安装 {pip_name} 超时", file=sys.stderr)
    return results


# ---------------------------------------------------------------------------
# 报告。
# ---------------------------------------------------------------------------
def main() -> int:
    parser = argparse.ArgumentParser(description="WebRPA 执行器第三方依赖核验")
    parser.add_argument(
        "--install",
        action="store_true",
        help="对缺失库执行 pip 安装并复跑核验（默认仅核验，不安装）",
    )
    args = parser.parse_args()

    py_exe = _default_python_exe()

    print("=" * 72)
    print("WebRPA 第三方依赖完整性核验")
    print("=" * 72)
    print(f"项目根:       {PROJECT_ROOT}")
    print(f"执行器目录:   {EXECUTORS_DIR}")
    print(f"内置运行时:   {py_exe}")
    print("-" * 72)

    manifest = collect_third_party_imports(EXECUTORS_DIR)
    import_names = set(manifest.keys())
    print(f"扫描第三方 import 数量: {len(import_names)}")
    print("第三方 import 清单:")
    for name in sorted(import_names):
        refs = sorted(manifest[name])
        preview = ", ".join(refs[:5]) + (" ..." if len(refs) > 5 else "")
        print(f"  - {name}  (被 {len(refs)} 个执行器引用: {preview})")
    print("-" * 72)

    statuses = verify_imports_in_runtime(py_exe, import_names)
    ok = sorted(n for n, s in statuses.items() if s == "ok")
    missing = sorted(n for n, s in statuses.items() if s == "missing")
    errored = {n: s for n, s in statuses.items() if s not in ("ok", "missing")}

    total = len(statuses)
    coverage = (len(ok) / total) if total else 1.0
    # 缺库覆盖率：以 missing 为口径（Property 10 真正关注的指标）。errored 项若库已安装
    # 则不算缺库，故缺库覆盖率 = (total - missing) / total。
    lib_coverage = ((total - len(missing)) / total) if total else 1.0

    print(f"OK ({len(ok)}):")
    for n in ok:
        print(f"  + {n}")
    print(f"MISSING ({len(missing)}):")
    for n in missing:
        print(f"  - {n}  (pip: {import_to_pip(n)})")
    print(f"ERRORED ({len(errored)}):")
    for n in sorted(errored):
        exempt = EXEMPT_RUNTIME_ERRORS.get(n)
        tag = "[已豁免:运行时数据/环境问题,非缺库]" if exempt else "[待人工确认]"
        print(f"  ! {n}: {errored[n]}")
        print(f"      {tag}")
        if exempt:
            print(f"      说明: {exempt}")
    # 未登记豁免的 errored 项（需人工确认是否为真实缺口）。
    unconfirmed = sorted(n for n in errored if n not in EXEMPT_RUNTIME_ERRORS)
    print("-" * 72)
    print(f"覆盖率 (ok/total): {len(ok)}/{total} = {coverage:.4f}")
    print(
        f"缺库覆盖率 (基于 missing, Property 10): "
        f"{total - len(missing)}/{total} = {lib_coverage:.4f}"
    )
    print(f"missing 为空: {'是' if not missing else '否'}  -> Property 10 缺库门槛: "
          f"{'达标(1.0)' if not missing else '未达标'}")
    if errored:
        print(f"errored 项: {len(errored)} 个; 已豁免(非缺库): "
              f"{len(errored) - len(unconfirmed)} 个; 待人工确认: {len(unconfirmed)} 个")
        if unconfirmed:
            print(f"  待人工确认清单: {unconfirmed}")

    if args.install and missing:
        print("-" * 72)
        print("开始安装缺失库 ...")
        install_results = install_missing(py_exe, set(missing))
        print("安装结果:", install_results)
        print("复跑核验 ...")
        statuses = verify_imports_in_runtime(py_exe, import_names)
        missing = sorted(n for n, s in statuses.items() if s == "missing")
        ok = sorted(n for n, s in statuses.items() if s == "ok")
        coverage = (len(ok) / len(statuses)) if statuses else 1.0
        print(f"复跑后 MISSING ({len(missing)}): {missing}")
        print(f"复跑后覆盖率: {coverage:.4f}")

    # 退出码：仍有 missing 则非零（便于 CI / 任务 4.2 判定）。
    return 1 if missing else 0


if __name__ == "__main__":
    raise SystemExit(main())
