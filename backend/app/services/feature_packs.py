# -*- coding: utf-8 -*-
"""功能模块包（Feature Pack）管理器

WebRPA 模块化分发体系的后端核心：

- 完整版 WebRPA 体积巨大（Python 重依赖 + 媒体/文档工具 + AI 模型），但大部分用户
  只用得到其中一部分能力。本体系把这些「重资产」按能力拆成一个个 zip 功能包：
  用户下载小体积核心包，再按需安装自己需要的功能包。

- 每个功能包是一个 zip 压缩包，内部结构是「项目根目录的覆盖层（overlay）」：
    webrpa-pack.json          清单（元数据，见 PACK_MANIFEST_NAME）
    Python313/Lib/site-packages/...   Python 依赖载荷
    backend/...                        工具二进制（ffmpeg/pandoc/scrcpy 等）
    models/... / NapCat/...            模型与外部组件
  安装 = 校验清单 + 安全解压覆盖到项目根；卸载 = 按安装记录删除文件。

- 能力探测（是否已安装）不依赖安装记录，而是直接探测「关键 Python 包可导入 /
  关键文件存在」——这样从完整版升级过来的用户天然处于"全部已安装"状态。

- 工作流运行到缺包模块时，执行器把 ImportError 映射为友好的
  「请安装 XX 功能模块包」提示（见 hint_for_import_error / pack_for_module_type）。

打包生产端见 backend/scripts/build_feature_packs.py。
"""
from __future__ import annotations

import importlib.util
import json
import shutil
import time
import zipfile
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any, Optional

from app.utils.paths import BACKEND_DATA_DIR, BACKEND_DIR, PROJECT_ROOT

PACK_MANIFEST_NAME = "webrpa-pack.json"
PACK_FORMAT_VERSION = 1

# 安装记录目录（backend/data/feature_packs/<id>.json）
_RECORDS_DIR = BACKEND_DATA_DIR / "feature_packs"

# zip 内条目允许写入的目标前缀（项目根相对、正斜杠）。
# 白名单外的条目一律拒绝，防御 zip 路径穿越与覆盖核心代码。
ALLOWED_TARGET_PREFIXES = (
    "Python313/Lib/site-packages/",
    "backend/ffmpeg.exe",
    "backend/ffprobe.exe",
    "backend/m3u8.exe",
    "backend/pandoc.exe",
    "backend/yt-dlp.exe",
    "backend/pandoc/",
    "backend/poppler/",
    "backend/scrcpy/",
    "backend/models/",
    "backend/data/easyocr_models/",
    "backend/data/whisper_models/",
    "backend/data/mediapipe_models/",
    "models/",
    "NapCat/",
)


@dataclass
class FeaturePack:
    """一个功能包的静态定义（注册表条目）"""
    id: str
    name: str
    description: str
    category: str
    # 估算体积（MB，展示用；实际以构建产物为准）
    size_mb: int
    # 探测规则：任一 python 包可导入 或 任一相对路径存在 → 视为已安装
    detect_imports: list[str] = field(default_factory=list)
    detect_paths: list[str] = field(default_factory=list)
    # 载荷：打包器据此收集文件（项目根相对路径，目录以 / 结尾）
    payload_paths: list[str] = field(default_factory=list)
    # 该包缺失时受影响的 Python 顶层包名（ImportError 映射用）
    import_names: list[str] = field(default_factory=list)
    # 该包解锁的工作流模块类别 / 模块类型（前端展示 + 运行时提示用）
    module_categories: list[str] = field(default_factory=list)
    module_types: list[str] = field(default_factory=list)
    # 是否推荐安装（核心体验依赖）
    recommended: bool = False
    # 备注（安装注意事项）
    note: str = ""


# ============================================================
# 功能包注册表
# 体积数据来源：Python313/site-packages 与 backend 工具目录实测。
# 打包器与运行时共用这一份定义，保证口径一致。
# ============================================================
FEATURE_PACKS: list[FeaturePack] = [
    FeaturePack(
        id="web-automation",
        name="网页自动化引擎（Playwright）",
        description="网页打开/点击/输入/采集等全部浏览器自动化模块的运行引擎。绝大多数用户都需要。",
        category="核心增强",
        size_mb=100,
        detect_imports=["playwright"],
        payload_paths=[
            "Python313/Lib/site-packages/playwright/",
            "Python313/Lib/site-packages/pyee/",
            "Python313/Lib/site-packages/greenlet/",
        ],
        import_names=["playwright"],
        module_categories=["网页导航", "网页元素交互", "网页元素查询", "网页数据采集"],
        recommended=True,
    ),
    FeaturePack(
        id="data-tables",
        name="数据表格与 Excel 导出（Polars）",
        description="数据表格收集、Excel/CSV 导出、表格与CSV 模块的数据引擎。",
        category="核心增强",
        size_mb=240,
        detect_imports=["polars"],
        payload_paths=[
            "Python313/Lib/site-packages/polars/",
            "Python313/Lib/site-packages/_polars_runtime_compat/",
            "Python313/Lib/site-packages/pyarrow/",
            "Python313/Lib/site-packages/pandas/",
        ],
        import_names=["polars", "pyarrow", "pandas"],
        module_categories=["表格与CSV"],
        recommended=True,
    ),
    FeaturePack(
        id="ocr-paddle",
        name="OCR 文字识别（PaddleOCR）",
        description="点击文本、悬停文本、OCR 提取等模块的文字识别引擎（PaddlePaddle）。",
        category="AI 识别",
        size_mb=366,
        detect_imports=["paddleocr"],
        detect_paths=["backend/models/paddle_ocr"],
        payload_paths=[
            "Python313/Lib/site-packages/paddle/",
            "Python313/Lib/site-packages/paddleocr/",
            "Python313/Lib/site-packages/paddlex/",
            "backend/models/paddle_ocr/",
        ],
        import_names=["paddle", "paddleocr", "paddlex"],
        module_types=["click_text", "hover_text", "wait_text", "ocr_extract"],
        module_categories=["图像识别与点击"],
    ),
    FeaturePack(
        id="ocr-easyocr",
        name="OCR 文字识别备用引擎（EasyOCR + PyTorch）",
        description="EasyOCR 引擎及其 PyTorch 运行时，为 OCR 类模块提供备选识别引擎。体积很大，仅在 PaddleOCR 识别效果不佳时需要。",
        category="AI 识别",
        size_mb=750,
        detect_imports=["easyocr"],
        detect_paths=["backend/models/ocr", "models/easyocr"],
        payload_paths=[
            "Python313/Lib/site-packages/torch/",
            "Python313/Lib/site-packages/torchvision/",
            "Python313/Lib/site-packages/easyocr/",
            "Python313/Lib/site-packages/skimage/",
            "backend/models/ocr/",
            "backend/data/easyocr_models/",
            "models/easyocr/",
        ],
        import_names=["torch", "torchvision", "easyocr", "skimage"],
        module_categories=["图像识别与点击"],
        note="包含 PyTorch（约 400MB），与 PaddleOCR 二选一即可满足大部分场景。",
    ),
    FeaturePack(
        id="vision-opencv",
        name="图像识别（OpenCV）",
        description="图像匹配点击、等待图像、二维码识别、屏幕找图等视觉模块的基础引擎。",
        category="AI 识别",
        size_mb=148,
        detect_imports=["cv2"],
        payload_paths=[
            "Python313/Lib/site-packages/cv2/",
        ],
        import_names=["cv2"],
        module_categories=["图像识别与点击"],
        module_types=["click_image", "wait_image", "hover_image"],
        recommended=True,
    ),
    FeaturePack(
        id="speech",
        name="语音识别（Faster-Whisper）",
        description="音频转文本、语音触发器等模块的语音识别引擎与模型。",
        category="AI 识别",
        size_mb=322,
        detect_imports=["faster_whisper"],
        detect_paths=["backend/data/whisper_models"],
        payload_paths=[
            "Python313/Lib/site-packages/faster_whisper/",
            "Python313/Lib/site-packages/ctranslate2/",
            "Python313/Lib/site-packages/av/",
            "Python313/Lib/site-packages/av.libs/",
            "Python313/Lib/site-packages/speech_recognition/",
            "backend/data/whisper_models/",
        ],
        import_names=["faster_whisper", "ctranslate2", "av", "speech_recognition"],
        module_types=["audio_to_text"],
    ),
    FeaturePack(
        id="face-gesture",
        name="人脸与手势识别",
        description="人脸触发器、手势触发器等模块的识别引擎（dlib + MediaPipe）。",
        category="AI 识别",
        size_mb=161,
        detect_imports=["face_recognition", "mediapipe"],
        payload_paths=[
            "Python313/Lib/site-packages/face_recognition/",
            "Python313/Lib/site-packages/face_recognition_models/",
            "Python313/Lib/site-packages/dlib/",
            "Python313/Lib/site-packages/mediapipe/",
            "backend/data/mediapipe_models/",
        ],
        import_names=["face_recognition", "face_recognition_models", "dlib", "mediapipe"],
        module_types=["face_trigger", "gesture_trigger"],
    ),
    FeaturePack(
        id="media-ffmpeg",
        name="媒体处理（FFmpeg）",
        description="视频处理、音频处理、屏幕录制、媒体格式转换、M3U8 下载等模块的底层工具。",
        category="媒体与文档",
        size_mb=223,
        detect_paths=["backend/ffmpeg.exe"],
        payload_paths=[
            "backend/ffmpeg.exe",
            "backend/ffprobe.exe",
            "backend/m3u8.exe",
            "backend/yt-dlp.exe",
        ],
        import_names=[],
        module_categories=["视频处理", "音频处理", "媒体格式转换", "屏幕与录制", "媒体播放"],
        recommended=True,
    ),
    FeaturePack(
        id="doc-convert",
        name="文档转换（Pandoc + Poppler + PyMuPDF）",
        description="PDF 转换/合并/水印、文档格式转换（Word/Markdown/HTML 等）模块的转换引擎。",
        category="媒体与文档",
        size_mb=331,
        detect_paths=["backend/pandoc.exe", "backend/poppler"],
        detect_imports=["fitz"],
        payload_paths=[
            "backend/pandoc.exe",
            "backend/pandoc/",
            "backend/poppler/",
            "Python313/Lib/site-packages/pymupdf/",
            "Python313/Lib/site-packages/fitz/",
            "Python313/Lib/site-packages/pdf2docx/",
            "Python313/Lib/site-packages/pdfplumber/",
            "Python313/Lib/site-packages/pdfminer/",
        ],
        import_names=["fitz", "pymupdf", "pdf2docx", "pdfplumber", "pdfminer", "pypandoc"],
        module_categories=["PDF处理", "文档转换"],
    ),
    FeaturePack(
        id="phone-adb",
        name="手机自动化（scrcpy + ADB）",
        description="Android 手机点击/滑动/输入/投屏镜像/应用管理等全部手机自动化模块的工具链。",
        category="设备扩展",
        size_mb=16,
        detect_paths=["backend/scrcpy"],
        payload_paths=[
            "backend/scrcpy/",
        ],
        import_names=[],
        module_categories=["手机自动化"],
    ),
    FeaturePack(
        id="qq-bot",
        name="QQ 机器人（NapCat）",
        description="QQ 消息收发、群管理等 QQ 机器人模块的运行框架。",
        category="设备扩展",
        size_mb=150,  # 本仓库内仅存框架占位（~2MB），完整发布包内含 NapCat 全量约 150MB
        detect_paths=["NapCat"],
        payload_paths=[
            "NapCat/",
        ],
        import_names=[],
        module_categories=["QQ机器人"],
    ),
    FeaturePack(
        id="ai-crawler",
        name="AI 智能爬虫（ScrapeGraphAI）",
        description="AI 智能爬虫、语义抓取等模块的 LLM 爬虫框架。",
        category="AI 能力",
        size_mb=14,
        detect_imports=["scrapegraphai"],
        payload_paths=[
            "Python313/Lib/site-packages/scrapegraphai/",
            "Python313/Lib/site-packages/langchain/",
            "Python313/Lib/site-packages/langchain_core/",
            "Python313/Lib/site-packages/langchain_community/",
            "Python313/Lib/site-packages/langchain_openai/",
        ],
        import_names=["scrapegraphai", "langchain", "langchain_core", "langchain_community"],
        module_categories=["AI爬虫"],
    ),
    FeaturePack(
        id="proxy-capture",
        name="网络抓包（mitmproxy）",
        description="代理抓包模块（抓取手机 APP / 模拟器网络请求）的抓包引擎。",
        category="网络扩展",
        size_mb=14,
        detect_imports=["mitmproxy"],
        payload_paths=[
            "Python313/Lib/site-packages/mitmproxy/",
            "Python313/Lib/site-packages/mitmproxy_rs/",
            "Python313/Lib/site-packages/mitmproxy_windows/",
        ],
        import_names=["mitmproxy"],
        module_categories=["网络抓包"],
    ),
]

_PACKS_BY_ID: dict[str, FeaturePack] = {p.id: p for p in FEATURE_PACKS}

# python 顶层包名 -> 功能包（ImportError 快速映射）
_IMPORT_TO_PACK: dict[str, FeaturePack] = {}
for _p in FEATURE_PACKS:
    for _imp in _p.import_names:
        _IMPORT_TO_PACK.setdefault(_imp, _p)

# 模块类型 / 模块分类 -> 功能包
_MODULE_TYPE_TO_PACK: dict[str, FeaturePack] = {}
for _p in FEATURE_PACKS:
    for _mt in _p.module_types:
        _MODULE_TYPE_TO_PACK.setdefault(_mt, _p)


# ============================================================
# 安装状态探测
# ============================================================

def _import_available(name: str) -> bool:
    """不真正加载模块，仅探测是否可导入（避免探测时把 torch 等载入内存）"""
    try:
        return importlib.util.find_spec(name) is not None
    except (ImportError, ValueError, AttributeError):
        return False


def is_pack_installed(pack: FeaturePack) -> bool:
    for imp in pack.detect_imports:
        if _import_available(imp):
            return True
    for rel in pack.detect_paths:
        if (PROJECT_ROOT / rel).exists():
            return True
    # 无任何探测规则的包退化为查安装记录
    if not pack.detect_imports and not pack.detect_paths:
        return (_RECORDS_DIR / f"{pack.id}.json").exists()
    return False


def _load_record(pack_id: str) -> Optional[dict]:
    f = _RECORDS_DIR / f"{pack_id}.json"
    if not f.exists():
        return None
    try:
        return json.loads(f.read_text(encoding="utf-8"))
    except Exception:
        return None


def list_packs() -> list[dict[str, Any]]:
    """全部功能包定义 + 当前安装状态"""
    out = []
    for pack in FEATURE_PACKS:
        d = asdict(pack)
        d["installed"] = is_pack_installed(pack)
        rec = _load_record(pack.id)
        d["install_record"] = {
            "installed_at": rec.get("installed_at"),
            "version": rec.get("version"),
            "file_count": len(rec.get("files", [])),
        } if rec else None
        out.append(d)
    return out


# ============================================================
# 安装 / 卸载
# ============================================================

class PackInstallError(Exception):
    pass


def _normalize_member(name: str) -> str:
    """zip 条目名归一为项目根相对的正斜杠路径；非法路径抛错"""
    n = name.replace("\\", "/").lstrip("/")
    parts = [seg for seg in n.split("/") if seg not in ("", ".")]
    if any(seg == ".." for seg in parts):
        raise PackInstallError(f"压缩包内存在非法路径（路径穿越）: {name}")
    return "/".join(parts)


def _member_allowed(norm: str) -> bool:
    if norm == PACK_MANIFEST_NAME:
        return True
    for prefix in ALLOWED_TARGET_PREFIXES:
        if prefix.endswith("/"):
            if norm.startswith(prefix):
                return True
        elif norm == prefix:
            return True
    return False


def read_manifest(zip_path: str | Path) -> dict:
    """读取并校验 zip 内的功能包清单"""
    with zipfile.ZipFile(zip_path, "r") as zf:
        try:
            raw = zf.read(PACK_MANIFEST_NAME)
        except KeyError:
            raise PackInstallError(f"不是有效的 WebRPA 功能包：缺少 {PACK_MANIFEST_NAME}")
        try:
            manifest = json.loads(raw.decode("utf-8"))
        except Exception:
            raise PackInstallError(f"{PACK_MANIFEST_NAME} 不是有效的 JSON")
    if not isinstance(manifest, dict):
        raise PackInstallError("清单格式错误")
    if int(manifest.get("format", 0)) > PACK_FORMAT_VERSION:
        raise PackInstallError(
            f"功能包格式版本过新（{manifest.get('format')}），请先升级 WebRPA 本体")
    pack_id = str(manifest.get("id", "")).strip()
    if not pack_id:
        raise PackInstallError("清单缺少功能包 id")
    return manifest


def install_pack_from_zip(zip_path: str | Path) -> dict:
    """安装一个功能包 zip（安全解压覆盖到项目根 + 写安装记录）"""
    zip_path = Path(zip_path)
    if not zip_path.exists():
        raise PackInstallError(f"文件不存在: {zip_path}")

    manifest = read_manifest(zip_path)
    pack_id = str(manifest["id"]).strip()

    extracted: list[str] = []
    with zipfile.ZipFile(zip_path, "r") as zf:
        # 先整体校验，再解压（避免解压一半才发现非法条目）
        members = []
        for info in zf.infolist():
            if info.is_dir():
                continue
            norm = _normalize_member(info.filename)
            if not norm or norm == PACK_MANIFEST_NAME:
                continue
            if not _member_allowed(norm):
                raise PackInstallError(
                    f"压缩包内存在白名单之外的路径，已拒绝安装: {norm}")
            members.append((info, norm))

        if not members:
            raise PackInstallError("功能包内没有可安装的文件")

        for info, norm in members:
            target = PROJECT_ROOT / norm
            target.parent.mkdir(parents=True, exist_ok=True)
            with zf.open(info) as src, open(target, "wb") as dst:
                shutil.copyfileobj(src, dst, length=1024 * 1024)
            extracted.append(norm)

    # 写安装记录
    _RECORDS_DIR.mkdir(parents=True, exist_ok=True)
    record = {
        "id": pack_id,
        "version": manifest.get("version", ""),
        "installed_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "source_zip": str(zip_path),
        "files": extracted,
    }
    (_RECORDS_DIR / f"{pack_id}.json").write_text(
        json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")

    pack = _PACKS_BY_ID.get(pack_id)
    result = {
        "id": pack_id,
        "name": pack.name if pack else manifest.get("name", pack_id),
        "installed_files": len(extracted),
    }
    # 锁步版本策略：版本不一致仅提示、不阻止（文件快照跨小版本通常兼容）
    core_ver = _core_version()
    pack_ver = str(manifest.get("version", "")).strip()
    if core_ver and pack_ver and pack_ver != core_ver:
        result["warning"] = (
            f"该功能包版本为 v{pack_ver}，当前 WebRPA 为 v{core_ver}。"
            f"通常仍可正常使用；如遇模块异常，请下载 v{core_ver} 版本的功能包重装。"
        )
    return result


def _core_version() -> str:
    """当前 WebRPA 本体版本（取自 frontend/package.json，与打包器口径一致）"""
    try:
        pkg = json.loads((PROJECT_ROOT / "frontend" / "package.json").read_text(encoding="utf-8"))
        return str(pkg.get("version", "")).strip()
    except Exception:
        return ""


def _safe_to_delete(rel: str) -> bool:
    """仅允许删除白名单前缀内的文件（防安装记录被篡改后误删核心文件）"""
    try:
        norm = _normalize_member(rel)
    except PackInstallError:
        return False
    return _member_allowed(norm) and norm != PACK_MANIFEST_NAME


def uninstall_pack(pack_id: str) -> dict:
    """卸载功能包：优先按安装记录删除；无记录时按注册表 payload_paths 删除。"""
    pack = _PACKS_BY_ID.get(pack_id)
    record = _load_record(pack_id)
    removed = 0

    if record and record.get("files"):
        for rel in record["files"]:
            if not _safe_to_delete(rel):
                continue
            f = PROJECT_ROOT / rel
            try:
                if f.exists():
                    f.unlink()
                    removed += 1
            except Exception as e:
                print(f"[FeaturePacks] 删除失败 {rel}: {e}")
        # 清理空目录（自底向上）
        dirs = sorted({str(Path(rel).parent) for rel in record["files"]},
                      key=lambda s: s.count("/"), reverse=True)
        for d in dirs:
            p = PROJECT_ROOT / d
            try:
                while p != PROJECT_ROOT and p.exists() and not any(p.iterdir()):
                    p.rmdir()
                    p = p.parent
            except Exception:
                pass
    elif pack:
        # 无安装记录（完整版自带）：按注册表载荷路径删除
        for rel in pack.payload_paths:
            target = PROJECT_ROOT / rel.rstrip("/")
            try:
                if target.is_dir():
                    shutil.rmtree(target, ignore_errors=True)
                    removed += 1
                elif target.exists():
                    target.unlink()
                    removed += 1
            except Exception as e:
                print(f"[FeaturePacks] 删除失败 {rel}: {e}")
    else:
        raise PackInstallError(f"未知的功能包: {pack_id}")

    rec_file = _RECORDS_DIR / f"{pack_id}.json"
    try:
        rec_file.unlink(missing_ok=True)
    except Exception:
        pass

    return {"id": pack_id, "removed": removed}


# ============================================================
# 工作流模块类型 → 所需功能包（运行前预检的数据基础）
#
# 需求表达为「与组」：[["A","B"], ["C"]] 表示需要 (A 或 B) 且 C。
# 映射依据是对全部 89 个执行器文件的依赖扫描（重库 import + 工具调用），
# 只登记"确定需要"的类型，宁缺毋滥，避免误拦不依赖功能包的模块。
# ============================================================

# 整个执行器子模块（文件）统一需要的功能包（文件内所有模块类型同一依赖）
SUBMODULE_PACK_REQUIREMENTS: dict[str, list[list[str]]] = {
    # —— 浏览器自动化（Playwright）——
    "advanced_browser": [["web-automation"]],
    "advanced_assert": [["web-automation"]],
    "switch_tab": [["web-automation"]],
    "network_monitor": [["web-automation"]],
    "ai_firecrawl": [["web-automation"]],
    # —— 图像视觉（OpenCV）——
    "advanced_image": [["vision-opencv"]],
    "blind_watermark": [["vision-opencv"]],
    # —— 手机自动化（scrcpy/ADB）——
    "phone_device": [["phone-adb"]],
    "phone_touch": [["phone-adb"]],
    "phone_input": [["phone-adb"]],
    "phone_screen": [["phone-adb"]],
    "phone_app": [["phone-adb"]],
    "phone_file": [["phone-adb"]],
    "phone_advanced": [["phone-adb"]],
    "phone_settings": [["phone-adb"]],
    "phone_clipboard": [["phone-adb"]],
    "phone_vision": [["phone-adb"], ["vision-opencv"]],
    # —— QQ 机器人 ——
    "qq": [["qq-bot"]],
    # —— 数据表格 ——
    "table": [["data-tables"]],
    "table_extract": [["data-tables"]],
    # —— 媒体（FFmpeg）——
    "media_ytdlp": [["media-ffmpeg"]],
    "media_m3u8": [["media-ffmpeg"]],
    "format_factory": [["media-ffmpeg"]],
    "media_video_edit": [["media-ffmpeg"]],
    # —— 文档转换 ——
    "pdf_convert": [["doc-convert"]],
    "document_convert": [["doc-convert"]],
    # —— AI 爬虫 ——
    "ai_scraper": [["ai-crawler"], ["web-automation"]],
}

# 混合文件内按「模块类型」精确登记（优先级高于子模块映射）
TYPE_PACK_REQUIREMENTS: dict[str, list[list[str]]] = {
    # —— basic.py 中的网页模块 ——
    **{t: [["web-automation"]] for t in (
        "open_page", "use_opened_page", "click_element", "hover_element",
        "input_text", "get_element_info", "wait_element", "wait_page_load",
        "page_load_complete", "close_page", "refresh_page", "go_back",
        "go_forward", "switch_iframe", "switch_to_main", "handle_dialog",
        "inject_javascript", "js_script", "screenshot",
    )},
    "wait_image": [["vision-opencv"], ["web-automation"]],
    # —— advanced.py 混合 ——
    "click_text": [["ocr-paddle", "ocr-easyocr"], ["web-automation"]],
    "hover_text": [["ocr-paddle", "ocr-easyocr"], ["web-automation"]],
    "network_capture": [["proxy-capture"]],
    # —— advanced_keyboard.py ——
    "keyboard_action": [["web-automation"]],   # real_keyboard 为真实键盘，不需要
    # —— trigger.py 混合 ——
    "face_trigger": [["face-gesture"], ["vision-opencv"]],
    "gesture_trigger": [["face-gesture"], ["vision-opencv"]],
    "image_trigger": [["vision-opencv"]],
    "element_change_trigger": [["web-automation"]],
    # —— captcha.py ——
    "slider_captcha": [["vision-opencv"]],     # ocr_captcha 用 ddddocr（核心自带）
    # —— media_audio.py ——
    "audio_to_text": [["speech"]],
    "adjust_volume": [["media-ffmpeg"]],
    # —— media_recognition.py ——
    "face_recognition": [["face-gesture"]],
    "image_ocr": [["ocr-paddle", "ocr-easyocr"]],
    # —— media_record.py ——
    "screen_record": [["vision-opencv"], ["media-ffmpeg"]],
    "camera_capture": [["vision-opencv"]],
    "camera_record": [["vision-opencv"]],
    # —— media_convert.py（compress_image 纯 PIL，不登记）——
    "format_convert": [["media-ffmpeg"]],
    "compress_video": [["media-ffmpeg"]],
    "extract_audio": [["media-ffmpeg"]],
}


def _type_to_submodule_map() -> dict[str, str]:
    """模块类型 → 执行器子模块名（读懒加载清单，回退注册表内部映射）"""
    out: dict[str, str] = {}
    try:
        manifest = BACKEND_DIR / "app" / "executors" / "_registry_manifest.json"
        if manifest.exists():
            data = json.loads(manifest.read_text(encoding="utf-8"))
            mp = data.get("map") or {}
            if isinstance(mp, dict):
                out.update({str(k): str(v) for k, v in mp.items()})
    except Exception:
        pass
    if not out:
        try:
            from app.executors import registry
            out.update(getattr(registry, "_lazy", {}) or {})
            for t, src in (getattr(registry, "_registration_source", {}) or {}).items():
                if t not in out and isinstance(src, str) and "." in src:
                    out[t] = src.rsplit(".", 1)[1]
        except Exception:
            pass
    return out


def requirements_for_type(module_type: str, type_to_sub: Optional[dict[str, str]] = None) -> list[list[str]]:
    """某个模块类型的功能包需求（「与组」列表；空列表 = 无需求）"""
    if module_type in TYPE_PACK_REQUIREMENTS:
        return TYPE_PACK_REQUIREMENTS[module_type]
    sub = (type_to_sub or _type_to_submodule_map()).get(module_type, "")
    return SUBMODULE_PACK_REQUIREMENTS.get(sub, [])


def preflight_check(module_types: list[str]) -> dict:
    """运行前预检：给定工作流用到的模块类型，返回缺失的功能包及受影响模块。

    返回：
      {
        "ok": bool,
        "missing": [
          {"alternatives": [pack概要...],   # 任装其一即可
           "module_types": [受影响类型...]},
        ]
      }
    """
    type_to_sub = _type_to_submodule_map()
    installed_cache: dict[str, bool] = {}

    def _installed(pack_id: str) -> bool:
        if pack_id not in installed_cache:
            p = _PACKS_BY_ID.get(pack_id)
            installed_cache[pack_id] = is_pack_installed(p) if p else True
        return installed_cache[pack_id]

    # group_key(tuple of alternatives) -> set(module_types)
    missing_groups: dict[tuple, set] = {}
    for mt in set(module_types or []):
        for group in requirements_for_type(mt, type_to_sub):
            if not group:
                continue
            if any(_installed(pid) for pid in group):
                continue
            missing_groups.setdefault(tuple(group), set()).add(mt)

    missing = []
    for group, types in sorted(missing_groups.items()):
        alts = []
        for pid in group:
            p = _PACKS_BY_ID.get(pid)
            if p:
                alts.append({"id": p.id, "name": p.name, "size_mb": p.size_mb})
        missing.append({"alternatives": alts, "module_types": sorted(types)})
    return {"ok": not missing, "missing": missing}


def format_preflight_error(result: dict, type_labels: Optional[dict[str, str]] = None) -> str:
    """把预检结果格式化为给用户看的错误消息（含安装指引）"""
    if result.get("ok"):
        return ""
    labels = type_labels or {}
    lines = ["工作流缺少功能模块包，无法运行："]
    for item in result.get("missing", []):
        alts = item.get("alternatives", [])
        alt_txt = " 或 ".join(f"「{a['name']}」[{a['id']}]（约{a['size_mb']}MB）" for a in alts)
        mods = "、".join(labels.get(t, t) for t in item.get("module_types", []))
        lines.append(f"  ● 需要 {alt_txt} —— 影响模块：{mods}")
    lines.append("请到 编辑器 → 右上角「更多」→「功能模块包」安装后重试；功能包 zip 可从官网/网盘下载。")
    return "\n".join(lines)


# ============================================================
# 运行时缺包提示
# ============================================================

def pack_for_import(module_name: str) -> Optional[FeaturePack]:
    """根据缺失的 Python 顶层包名找到对应功能包"""
    top = (module_name or "").split(".")[0]
    return _IMPORT_TO_PACK.get(top)


def pack_for_module_type(module_type: str) -> Optional[FeaturePack]:
    return _MODULE_TYPE_TO_PACK.get(module_type)


def hint_for_import_error(exc: BaseException) -> str:
    """把 ImportError/ModuleNotFoundError 翻译成「请安装 XX 功能模块包」的友好提示。

    返回空字符串表示与任何功能包无关（正常向上抛原始错误）。
    """
    missing = ""
    if isinstance(exc, ModuleNotFoundError):
        missing = exc.name or ""
    elif isinstance(exc, ImportError):
        missing = getattr(exc, "name", "") or ""
        if not missing:
            # "No module named 'xxx'" 形态兜底解析
            msg = str(exc)
            marker = "No module named "
            if marker in msg:
                missing = msg.split(marker, 1)[1].strip().strip("'\"")
    if not missing:
        return ""
    pack = pack_for_import(missing)
    if not pack:
        return ""
    return (
        f"缺少功能模块包「{pack.name}」（依赖 {missing}）。"
        f"请在 编辑器 → 更多 → 功能模块包 中安装 [{pack.id}] 后重试。"
    )
