# -*- coding: utf-8 -*-
"""凭据保险库（在 credential_manager 之上的 RBAC 授权 + 取用审计层）

- 复用 credential_manager 的 Fernet 加密存储，凭据值落盘始终为密文。
- 增加 ACL：每条凭据可限定「允许访问的角色集合」（vault_acl.json）。
  未设置 ACL 的凭据默认仅 admin（拥有 credential.use/* 权限）可取。
- get_field_authorized：基于会话角色校验是否被授权，授权才解密返回，并写审计。
- 对外永不返回明文，仅返回打码值与授权信息。
"""
from __future__ import annotations

import json
import threading
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

from app.services import credential_manager

_DATA_DIR = Path("backend/data")
_ACL_FILE = _DATA_DIR / "vault_acl.json"
_lock = threading.RLock()
_cache: Optional[dict[str, Any]] = None


def _load_acl() -> dict[str, Any]:
    global _cache
    if _cache is not None:
        return _cache
    data: dict[str, Any] = {}
    try:
        if _ACL_FILE.exists():
            raw = _ACL_FILE.read_text(encoding="utf-8")
            if raw.strip():
                data = json.loads(raw)
    except Exception as e:
        print(f"[vault] 加载 ACL 失败: {e}")
    _cache = data
    return _cache


def _save_acl(data: dict[str, Any]) -> None:
    try:
        _DATA_DIR.mkdir(parents=True, exist_ok=True)
        _ACL_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception as e:
        print(f"[vault] 保存 ACL 失败: {e}")


def invalidate_cache() -> None:
    global _cache
    with _lock:
        _cache = None


def get_acl(name: str) -> dict[str, Any]:
    """返回某凭据的 ACL：{allowed_roles:[...]}。空列表表示仅特权角色可访问。"""
    with _lock:
        acl = _load_acl().get(name, {})
        return {"name": name, "allowed_roles": list(acl.get("allowed_roles", []))}


def set_acl(name: str, allowed_roles: list[str]) -> dict[str, Any]:
    """设置某凭据允许访问的角色集合。"""
    with _lock:
        if name not in credential_manager.credential_names():
            return {"success": False, "error": "凭据不存在"}
        data = _load_acl()
        data[name] = {"allowed_roles": list(allowed_roles or []),
                      "updated_at": datetime.now().isoformat()}
        _save_acl(data)
        return {"success": True, "name": name, "allowed_roles": list(allowed_roles or [])}


def list_acls() -> list[dict[str, Any]]:
    with _lock:
        acl = _load_acl()
        out = []
        for name in credential_manager.credential_names():
            entry = acl.get(name, {})
            out.append({
                "name": name,
                "allowed_roles": list(entry.get("allowed_roles", [])),
                "restricted": bool(entry.get("allowed_roles")),
            })
        return out


def _session_roles(session: Optional[dict[str, Any]]) -> list[str]:
    return list((session or {}).get("roles", []))


def _is_authorized(session: Optional[dict[str, Any]], name: str) -> bool:
    """判定会话是否有权取用某凭据。"""
    if not session:
        return False
    perms = session.get("permissions", [])
    roles = _session_roles(session)
    # 拥有 credential.manage 或通配权限的视为特权，永远可取
    if "*" in perms or "credential.manage" in perms:
        return True
    acl = _load_acl().get(name, {})
    allowed = set(acl.get("allowed_roles", []))
    if not allowed:
        # 未配置 ACL：默认仅特权可取（上面已放行），普通角色拒绝
        return False
    # 需同时拥有 credential.use 权限 + 角色在白名单
    if "credential.use" not in perms:
        return False
    return bool(allowed.intersection(roles))


def get_field_authorized(session: Optional[dict[str, Any]], name: str,
                         field: str = "value") -> dict[str, Any]:
    """授权校验通过才返回明文（仅供后端运行期），并写审计。"""
    with _lock:
        actor = (session or {}).get("username", "anonymous")
        if name not in credential_manager.credential_names():
            _audit(actor, name, field, "not_found")
            return {"success": False, "error": "凭据不存在"}
        if not _is_authorized(session, name):
            _audit(actor, name, field, "denied")
            return {"success": False, "error": "无权访问该凭据"}
        value = credential_manager.get_field(name, field)
        if value is None:
            _audit(actor, name, field, "field_missing")
            return {"success": False, "error": f"字段不存在：{field}"}
        _audit(actor, name, field, "granted")
        return {"success": True, "value": value}


def _audit(actor: str, name: str, field: str, result: str) -> None:
    """记录取用审计（不记录明文值）。"""
    try:
        from app.services import audit_log
        audit_log.record(actor, "credential.use", f"{name}.{field}",
                         result=result, detail={"credential": name, "field": field})
    except Exception:
        pass
