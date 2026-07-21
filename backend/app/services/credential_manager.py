# -*- coding: utf-8 -*-
"""本地加密凭据库

目标：邮件 / API / 数据库等模块的口令此前明文存在工作流文件里，工作流一旦分享/上传
就会泄露。这里提供一个本地加密的凭据库：

- 凭据值用 Fernet（AES-128-CBC + HMAC）对称加密，落盘到 backend/data/credentials.enc。
- 加密密钥存放在 backend/data/.cred_key（与数据分离），首次自动生成。
- 工作流节点里只引用「凭据名」，运行时由后端解密注入，工作流文件中不含明文口令。

引用语法（在任意节点配置的字符串里）：
- {{cred:凭据名}}            → 取该凭据的默认字段 value
- {{cred:凭据名.字段名}}     → 取该凭据的指定字段（如 password / api_key）
- 也支持中文前缀：{{凭据:凭据名}} / {{凭据:凭据名.字段名}}

对外只暴露「打码后的字段名列表」，绝不通过 API 返回明文（解密仅在后端执行期发生）。
"""
from __future__ import annotations

import json
import threading
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, List
from app.utils.paths import BACKEND_DATA_DIR

_DATA_DIR = BACKEND_DATA_DIR
_KEY_FILE = _DATA_DIR / ".cred_key"
_STORE_FILE = _DATA_DIR / "credentials.enc"

_lock = threading.RLock()
_fernet = None
_cache: Optional[Dict[str, dict]] = None


def _get_fernet():
    """获取（必要时创建）Fernet 实例"""
    global _fernet
    if _fernet is not None:
        return _fernet
    from cryptography.fernet import Fernet
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    if _KEY_FILE.exists():
        key = _KEY_FILE.read_bytes().strip()
    else:
        key = Fernet.generate_key()
        _KEY_FILE.write_bytes(key)
        try:
            # 尽量收紧权限（Windows 上 chmod 影响有限，但无害）
            import os
            os.chmod(_KEY_FILE, 0o600)
        except Exception:
            pass
    _fernet = Fernet(key)
    return _fernet


def _encrypt(text: str) -> str:
    return _get_fernet().encrypt(text.encode("utf-8")).decode("ascii")


def _decrypt(token: str) -> str:
    return _get_fernet().decrypt(token.encode("ascii")).decode("utf-8")


def _load() -> Dict[str, dict]:
    """加载凭据库（解密后的内存结构：name -> {description, fields:{k:v}, created_at, updated_at}）"""
    global _cache
    if _cache is not None:
        return _cache
    store: Dict[str, dict] = {}
    try:
        if _STORE_FILE.exists():
            raw = _STORE_FILE.read_text(encoding="utf-8")
            enc = json.loads(raw) if raw.strip() else {}
            for name, entry in (enc.items() if isinstance(enc, dict) else []):
                fields = {}
                for k, v in (entry.get("fields", {}) or {}).items():
                    try:
                        fields[k] = _decrypt(v)
                    except Exception:
                        fields[k] = ""
                store[name] = {
                    "description": entry.get("description", ""),
                    "fields": fields,
                    "created_at": entry.get("created_at", ""),
                    "updated_at": entry.get("updated_at", ""),
                }
    except Exception as e:
        print(f"[credential] 加载凭据库失败: {e}")
    _cache = store
    return _cache


def _save(store: Dict[str, dict]) -> None:
    """加密并落盘"""
    try:
        _DATA_DIR.mkdir(parents=True, exist_ok=True)
        enc: Dict[str, dict] = {}
        for name, entry in store.items():
            enc_fields = {}
            for k, v in (entry.get("fields", {}) or {}).items():
                enc_fields[k] = _encrypt(str(v))
            enc[name] = {
                "description": entry.get("description", ""),
                "fields": enc_fields,
                "created_at": entry.get("created_at", ""),
                "updated_at": entry.get("updated_at", ""),
            }
        _STORE_FILE.write_text(json.dumps(enc, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception as e:
        print(f"[credential] 保存凭据库失败: {e}")


def _mask(value: str) -> str:
    """对字段值打码，仅用于展示"""
    if not value:
        return ""
    n = len(value)
    if n <= 2:
        return "*" * n
    if n <= 6:
        return value[0] + "*" * (n - 1)
    return value[:2] + "*" * (n - 4) + value[-2:]


# ==================== 对外 API ====================

def list_credentials() -> List[dict]:
    """列出所有凭据（字段值打码，不返回明文）"""
    with _lock:
        store = _load()
        result = []
        for name, entry in store.items():
            fields = entry.get("fields", {}) or {}
            result.append({
                "name": name,
                "description": entry.get("description", ""),
                "fields": [
                    {"key": k, "masked": _mask(v)} for k, v in fields.items()
                ],
                "created_at": entry.get("created_at", ""),
                "updated_at": entry.get("updated_at", ""),
            })
        result.sort(key=lambda x: x.get("name", ""))
        return result


def credential_names() -> List[str]:
    with _lock:
        return sorted(_load().keys())


def upsert_credential(name: str, fields: Dict[str, str], description: str = "") -> dict:
    """新增或更新一条凭据"""
    name = (name or "").strip()
    if not name:
        raise ValueError("凭据名不能为空")
    if not isinstance(fields, dict) or not fields:
        raise ValueError("凭据字段不能为空")
    with _lock:
        store = _load()
        now = datetime.now().isoformat()
        existing = store.get(name)
        # 字段值为空字符串视为「保留原值」（前端编辑时不回传明文）
        merged = dict(existing.get("fields", {})) if existing else {}
        for k, v in fields.items():
            if v == "" and existing and k in merged:
                continue  # 保留原值
            merged[k] = v
        store[name] = {
            "description": description or (existing.get("description", "") if existing else ""),
            "fields": merged,
            "created_at": existing.get("created_at", now) if existing else now,
            "updated_at": now,
        }
        _save(store)
        return {"name": name}


def delete_credential(name: str) -> bool:
    with _lock:
        store = _load()
        if name in store:
            del store[name]
            _save(store)
            return True
        return False


def rename_credential(old_name: str, new_name: str) -> bool:
    new_name = (new_name or "").strip()
    if not new_name:
        raise ValueError("新凭据名不能为空")
    with _lock:
        store = _load()
        if old_name not in store:
            return False
        if new_name in store and new_name != old_name:
            raise ValueError("目标凭据名已存在")
        store[new_name] = store.pop(old_name)
        store[new_name]["updated_at"] = datetime.now().isoformat()
        _save(store)
        return True


def get_field(name: str, field: str = "value") -> Optional[str]:
    """获取某凭据的某字段明文（仅供后端运行期解析）"""
    with _lock:
        entry = _load().get(name)
        if not entry:
            return None
        return entry.get("fields", {}).get(field)


def invalidate_cache() -> None:
    global _cache
    with _lock:
        _cache = None
