# Module executors
from .base import (
    ModuleExecutor,
    ExecutionContext,
    ModuleResult,
    LogMessage,
    ExecutorRegistry,
    registry,
    register_executor,
    get_backend_root,
    get_ffmpeg_path,
    get_ffprobe_path,
    escape_css_selector,
)

# 导入所有执行器以触发注册（支持懒加载：启动只读清单，执行器模块按需导入）
import json as _json
import importlib as _importlib
from pathlib import Path as _Path

# 权威子模块清单（顺序与历史一致；新增执行器文件务必登记到此处）
_SUBMODULES = [
    'basic', 'basic_variable', 'advanced', 'advanced_file_ops', 'advanced_browser',
    'advanced_image', 'advanced_keyboard', 'advanced_pillow', 'control', 'control_extended',
    'math_list_ops', 'list_advanced', 'dict_advanced', 'math_advanced', 'statistics',
    'string_convert', 'captcha', 'data_structure', 'ai', 'ai_tasks', 'ai_firecrawl',
    'table', 'subflow', 'database', 'media', 'media_record', 'media_m3u8', 'media_ytdlp',
    'qq', 'wechat', 'pdf_ops', 'pdf_convert', 'document_convert', 'screen_share', 'trigger',
    'utility_tools', 'desktop_automation', 'desktop_advanced', 'format_factory', 'python_script',
    'table_extract', 'advanced_openpyxl', 'advanced_openpyxl_pro', 'advanced_excel_yingdao',
    'advanced_vision_act', 'advanced_assert', 'switch_tab',
    'phone_device', 'phone_touch', 'phone_input', 'phone_screen', 'phone_app', 'phone_file',
    'phone_advanced', 'phone_vision', 'phone_settings', 'phone_clipboard',
    'webhook', 'feishu', 'wps', 'database_advanced', 'database_relational', 'database_relational2',
    'ssh', 'sap_automation', 'ai_media', 'probability', 'network_monitor', 'allure',
    'notify_apprise', 'custom_module', 'note', 'media_audio', 'media_convert',
    'media_image_effect', 'media_qrcode', 'media_recognition', 'media_video_edit',
    'media_watermark', 'blind_watermark',
    'drissionpage',
]

_DIR = _Path(__file__).parent
_MANIFEST = _DIR / "_registry_manifest.json"


def _signature() -> str:
    """子模块文件名+修改时间的签名，用于判断清单是否过期"""
    parts = []
    for n in _SUBMODULES:
        try:
            parts.append(f"{n}:{int((_DIR / (n + '.py')).stat().st_mtime)}")
        except OSError:
            parts.append(f"{n}:0")
    return ";".join(parts)


def _eager_import_all_and_build_manifest():
    """全量导入所有执行器子模块（原始行为），并记录 类型→子模块 清单以供下次懒加载。"""
    type_to_sub: dict[str, str] = {}
    for n in _SUBMODULES:
        before = set(registry.get_all_types())
        try:
            _importlib.import_module(f".{n}", __name__)
        except Exception as e:
            print(f"[executors] 导入子模块 {n} 失败: {e}")
            continue
        for t in set(registry.get_all_types()) - before:
            type_to_sub[t] = n
    try:
        _MANIFEST.write_text(
            _json.dumps({"sig": _signature(), "map": type_to_sub}, ensure_ascii=False),
            encoding="utf-8",
        )
    except Exception as e:
        print(f"[executors] 写入注册清单失败（不影响运行）: {e}")


def _try_enable_lazy() -> bool:
    """尝试用磁盘清单启用懒加载；清单缺失/过期/损坏则返回 False 走全量导入。"""
    try:
        if not _MANIFEST.exists():
            return False
        data = _json.loads(_MANIFEST.read_text(encoding="utf-8"))
        if data.get("sig") != _signature():
            return False
        mp = data.get("map") or {}
        if not mp:
            return False
        registry.enable_lazy(mp, __name__)
        return True
    except Exception as e:
        print(f"[executors] 读取注册清单失败，回退全量导入: {e}")
        return False


if not _try_enable_lazy():
    _eager_import_all_and_build_manifest()

__all__ = [
    "ModuleExecutor",
    "ExecutionContext",
    "ModuleResult",
    "LogMessage",
    "ExecutorRegistry",
    "registry",
    "register_executor",
    "get_backend_root",
    "get_ffmpeg_path",
    "get_ffprobe_path",
    "escape_css_selector",
]
