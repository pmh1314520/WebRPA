# -*- coding: utf-8 -*-
"""本地访问鉴权管理

目标：后端默认监听 0.0.0.0，局域网内任意设备都能访问全部 API（含文件共享/远程控制/
PowerShell 执行等高危能力）。这里提供「本机免验、远程需 Token」的轻量鉴权：

- 本机（127.0.0.1 / ::1 / localhost）访问：始终放行，零配置。
- 其它来源访问：必须携带正确 Token（请求头 X-WebRPA-Token / 查询参数 token / Bearer）。
- 可在本机一侧查看/重置 Token、开关鉴权。
- 鉴权关闭时退化为放行（兼容旧行为，作为应急逃生开关）。

Token 持久化在 backend/data/security.json。
"""
from __future__ import annotations

import json
import secrets
import threading
from pathlib import Path
from typing import Optional
from app.utils.paths import BACKEND_DATA_DIR

_DATA_DIR = BACKEND_DATA_DIR
_CONF_FILE = _DATA_DIR / "security.json"
_lock = threading.Lock()
_cache: Optional[dict] = None

_LOOPBACK_HOSTS = {"127.0.0.1", "::1", "localhost", "::ffff:127.0.0.1", ""}


def _load() -> dict:
    global _cache
    if _cache is not None:
        return _cache
    conf = {"enabled": True, "token": ""}
    try:
        if _CONF_FILE.exists():
            data = json.loads(_CONF_FILE.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                conf.update(data)
    except Exception:
        pass
    if not conf.get("token"):
        conf["token"] = secrets.token_urlsafe(24)
        _cache = conf
        _save(conf)
    else:
        _cache = conf
    return _cache


def _save(conf: dict) -> None:
    try:
        _DATA_DIR.mkdir(parents=True, exist_ok=True)
        _CONF_FILE.write_text(json.dumps(conf, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception as e:
        print(f"[security] 保存安全配置失败: {e}")


def is_enabled() -> bool:
    return bool(_load().get("enabled", True))


def get_token() -> str:
    return _load().get("token", "")


def set_enabled(enabled: bool) -> dict:
    with _lock:
        conf = _load()
        conf["enabled"] = bool(enabled)
        _save(conf)
    return {"enabled": conf["enabled"]}


def regenerate_token() -> str:
    with _lock:
        conf = _load()
        conf["token"] = secrets.token_urlsafe(24)
        _save(conf)
        return conf["token"]


def is_loopback(host: Optional[str]) -> bool:
    """判断请求来源是否为本机回环地址"""
    if not host:
        return True
    h = str(host).strip().lower()
    return h in _LOOPBACK_HOSTS


def verify(token: Optional[str]) -> bool:
    """常数时间比较，避免计时侧信道"""
    expected = get_token()
    if not expected:
        return False
    if not token:
        return False
    return secrets.compare_digest(str(token), expected)
