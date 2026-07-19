"""浏览器自动化配置的服务端单一真源（持久化）。

背景：浏览器配置（类型/自定义路径/启动参数/扩展目录等）此前只存在于前端 localStorage，
导致计划任务、启动/热键/Webhook 触发等「后端自治」执行时拿不到，只能用写死的默认 msedge，
无视用户在「全局配置 → 浏览器」里选的 Chrome/Chromium 等。

本模块把浏览器配置持久化到 backend/data/browser_config.json，供后端自治执行统一读取。
前端在设置变更 / 启动时通过 /api/system/browser-config 同步进来。
"""
from __future__ import annotations

import json
import threading
from pathlib import Path
from typing import Any, Dict

_DATA_DIR = Path(__file__).parent.parent.parent / "data"
_CONF_FILE = _DATA_DIR / "browser_config.json"
_lock = threading.RLock()

# 与前端 globalConfigStore.defaultConfig.browser 对齐的默认值
_DEFAULT: Dict[str, Any] = {
    "type": "msedge",
    "executablePath": "",
    "userDataDir": "",
    "fullscreen": False,
    "autoCloseBrowser": True,
    "launchArgs": "",
    "extensionDirs": "",
}


def get_browser_config() -> Dict[str, Any]:
    """返回持久化的浏览器配置（与默认值合并），供后端自治执行使用。"""
    with _lock:
        if _CONF_FILE.exists():
            try:
                data = json.loads(_CONF_FILE.read_text(encoding="utf-8"))
                if isinstance(data, dict):
                    return {**_DEFAULT, **data}
            except Exception:
                pass
        return dict(_DEFAULT)


def set_browser_config(cfg: Dict[str, Any]) -> Dict[str, Any]:
    """持久化浏览器配置（只保留已知字段，避免写入无关数据）。"""
    cfg = cfg or {}
    merged = {**_DEFAULT}
    for k in _DEFAULT.keys():
        if k in cfg and cfg[k] is not None:
            merged[k] = cfg[k]
    with _lock:
        try:
            _DATA_DIR.mkdir(parents=True, exist_ok=True)
            _CONF_FILE.write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception:
            pass
    return merged
