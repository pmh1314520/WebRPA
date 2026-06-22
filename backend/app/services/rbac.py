# -*- coding: utf-8 -*-
"""RBAC 角色权限 + 会话 + SSO/企业目录登录

三级模型：用户 (user) → 角色 (role) → 权限 (permission)。
- 用户口令使用 PBKDF2-HMAC-SHA256 加盐哈希，绝不明文存储。
- 会话令牌使用 HMAC 签名 + 过期时间，无需数据库即可校验。
- 预置角色：admin（全部权限）/ operator（运行+查看）/ viewer（只读）。
- 首次启动自动创建 admin 用户并生成随机初始口令（仅打印一次，仅存哈希）。
- SSO：配置驱动的 LDAP/钉钉/企微/飞书登录对接点，校验后映射到本地用户并签发会话。

数据落盘：backend/data/rbac.json（用户+角色，口令仅哈希）、backend/data/sessions.json（会话）。
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

_DATA_DIR = Path("backend/data")
_RBAC_FILE = _DATA_DIR / "rbac.json"
_SESS_FILE = _DATA_DIR / "sessions.json"
_SECRET_FILE = _DATA_DIR / ".rbac_secret"

_lock = threading.RLock()
_cache: Optional[dict[str, Any]] = None
_sess_cache: Optional[dict[str, Any]] = None
_secret: Optional[bytes] = None

# ---------- 权限清单（全平台受保护操作）----------
ALL_PERMISSIONS = [
    "workflow.view", "workflow.run", "workflow.edit", "workflow.delete",
    "cluster.view", "cluster.dispatch", "cluster.manage",
    "credential.view", "credential.use", "credential.manage",
    "rbac.manage", "audit.view", "approval.decide", "approval.create",
    "idp.use", "computer_use.run", "process_mining.use",
]

_PRESET_ROLES = {
    "admin": {"description": "超级管理员（全部权限）", "permissions": ["*"]},
    "operator": {
        "description": "操作员（运行 + 查看 + 使用凭据 + 发起审批）",
        "permissions": [
            "workflow.view", "workflow.run", "workflow.edit",
            "cluster.view", "cluster.dispatch",
            "credential.view", "credential.use",
            "approval.create", "idp.use", "computer_use.run", "process_mining.use",
        ],
    },
    "viewer": {
        "description": "只读（仅查看）",
        "permissions": ["workflow.view", "cluster.view", "credential.view", "audit.view"],
    },
}

SESSION_TTL = 12 * 3600  # 会话有效期 12 小时

# 登录暴力破解防护：同一用户在窗口内失败次数达上限后锁定一段时间
_LOGIN_MAX_FAILS = 5
_LOGIN_WINDOW = 300        # 统计窗口（秒）
_LOGIN_LOCKOUT = 300       # 锁定时长（秒）
_login_failures: dict[str, list[float]] = {}


def _login_locked_until(username: str) -> float:
    """若该用户当前处于锁定状态，返回解锁时间戳；否则返回 0。"""
    fails = _login_failures.get(username) or []
    now = time.time()
    recent = [t for t in fails if now - t < _LOGIN_WINDOW]
    _login_failures[username] = recent
    if len(recent) >= _LOGIN_MAX_FAILS:
        return max(recent) + _LOGIN_LOCKOUT
    return 0.0


def _record_login_failure(username: str) -> None:
    _login_failures.setdefault(username, []).append(time.time())


def _clear_login_failures(username: str) -> None:
    _login_failures.pop(username, None)


# ---------- 密钥 ----------
def _get_secret() -> bytes:
    global _secret
    if _secret is not None:
        return _secret
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    if _SECRET_FILE.exists():
        _secret = _SECRET_FILE.read_bytes().strip()
    else:
        _secret = secrets.token_bytes(32)
        _SECRET_FILE.write_bytes(_secret)
        try:
            os.chmod(_SECRET_FILE, 0o600)
        except Exception:
            pass
    return _secret


# ---------- 口令哈希 ----------
def _hash_password(password: str, salt: Optional[str] = None) -> str:
    salt = salt or secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), 120000)
    return f"pbkdf2_sha256$120000${salt}${dk.hex()}"


def _verify_password(password: str, stored: str) -> bool:
    try:
        algo, iters, salt, _hexhash = stored.split("$")
        if algo != "pbkdf2_sha256":
            return False
        dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), int(iters))
        return hmac.compare_digest(f"pbkdf2_sha256${iters}${salt}${dk.hex()}", stored)
    except Exception:
        return False


# ---------- 持久化 ----------
def _load() -> dict[str, Any]:
    global _cache
    if _cache is not None:
        return _cache
    data: dict[str, Any] = {"users": {}, "roles": {}}
    try:
        if _RBAC_FILE.exists():
            raw = _RBAC_FILE.read_text(encoding="utf-8")
            if raw.strip():
                data = json.loads(raw)
    except Exception as e:
        print(f"[rbac] 加载失败: {e}")
    data.setdefault("users", {})
    data.setdefault("roles", {})
    # 注入预置角色（不覆盖用户自定义）
    changed = False
    for rname, rdef in _PRESET_ROLES.items():
        if rname not in data["roles"]:
            data["roles"][rname] = dict(rdef)
            changed = True
    # 首次创建 admin 用户
    if not data["users"]:
        init_pw = secrets.token_urlsafe(12)
        data["users"]["admin"] = {
            "username": "admin",
            "password": _hash_password(init_pw),
            "roles": ["admin"],
            "display_name": "管理员",
            "source": "local",
            "created_at": datetime.now().isoformat(),
            "disabled": False,
        }
        changed = True
        _banner = (
            "\n"
            "\n" + "*" * 72 + "\n"
            "*" + " " * 70 + "*\n"
            "*    >>>>>>  WebRPA 首次启动 · 初始管理员账号  <<<<<<" + " " * 16 + "*\n"
            "*" + " " * 70 + "*\n"
            "*        用户名 (account) : admin" + " " * 37 + "*\n"
            f"*        初始口令 (password): {init_pw}" + " " * max(0, 42 - len(init_pw)) + "*\n"
            "*" + " " * 70 + "*\n"
            "*    请立即登录并在「全局配置 → 安全」中修改口令；此口令仅显示这一次！" + " " * 2 + "*\n"
            "*" + " " * 70 + "*\n"
            + "*" * 72 + "\n"
        )
        print(_banner, flush=True)
        # 同时落一份到文件，避免日志刷屏后找不到（登录改密后可手动删除）
        try:
            (_DATA_DIR / "INITIAL_ADMIN_PASSWORD.txt").write_text(
                f"WebRPA 初始管理员\n用户名: admin\n初始口令: {init_pw}\n"
                f"（请登录后立即修改口令，并删除本文件）\n",
                encoding="utf-8")
        except Exception:
            pass
    _cache = data
    if changed:
        _save(data)
    return _cache


def _save(data: dict[str, Any]) -> None:
    try:
        _DATA_DIR.mkdir(parents=True, exist_ok=True)
        _RBAC_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception as e:
        print(f"[rbac] 保存失败: {e}")


def ensure_bootstrap() -> None:
    """显式触发账号体系初始化（首次启动创建初始管理员并打印口令横幅）。
    供应用启动时调用，避免 RBAC 懒加载导致用户在启动日志里看不到初始口令。"""
    with _lock:
        _load()


def _load_sessions() -> dict[str, Any]:
    global _sess_cache
    if _sess_cache is not None:
        return _sess_cache
    data: dict[str, Any] = {}
    try:
        if _SESS_FILE.exists():
            raw = _SESS_FILE.read_text(encoding="utf-8")
            if raw.strip():
                data = json.loads(raw)
    except Exception:
        data = {}
    _sess_cache = data
    return _sess_cache


def _save_sessions(data: dict[str, Any]) -> None:
    try:
        _DATA_DIR.mkdir(parents=True, exist_ok=True)
        _SESS_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception as e:
        print(f"[rbac] 保存会话失败: {e}")


def invalidate_cache() -> None:
    global _cache, _sess_cache
    with _lock:
        _cache = None
        _sess_cache = None
        _login_failures.clear()


# ---------- 会话令牌 ----------
def _sign(payload: str) -> str:
    sig = hmac.new(_get_secret(), payload.encode("utf-8"), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(sig).decode("ascii").rstrip("=")


def issue_session(username: str) -> dict[str, Any]:
    """为用户签发会话令牌（HMAC 签名 + 过期），并持久化便于吊销。"""
    with _lock:
        exp = int(time.time()) + SESSION_TTL
        body = base64.urlsafe_b64encode(
            json.dumps({"u": username, "exp": exp, "jti": secrets.token_hex(8)},
                       ensure_ascii=False).encode("utf-8")
        ).decode("ascii").rstrip("=")
        token = f"{body}.{_sign(body)}"
        sess = _load_sessions()
        sess[token] = {"username": username, "expires_at": exp, "created_at": time.time()}
        # 清理过期会话
        now = time.time()
        for t in list(sess.keys()):
            if sess[t].get("expires_at", 0) < now:
                sess.pop(t, None)
        _save_sessions(sess)
        return {"token": token, "expires_at": exp, "username": username}


def _decode_token(token: str) -> Optional[str]:
    """校验令牌签名与过期，返回 username 或 None。"""
    if not token or "." not in token:
        return None
    try:
        body, sig = token.rsplit(".", 1)
        if not hmac.compare_digest(sig, _sign(body)):
            return None
        pad = "=" * (-len(body) % 4)
        data = json.loads(base64.urlsafe_b64decode(body + pad).decode("utf-8"))
        if int(data.get("exp", 0)) < int(time.time()):
            return None
        return data.get("u")
    except Exception:
        return None


def resolve_session(token: Optional[str]) -> Optional[dict[str, Any]]:
    """把令牌解析为会话上下文 {username, roles, permissions}，无效返回 None。"""
    if not token:
        return None
    with _lock:
        # 先看签名/过期
        username = _decode_token(token)
        if not username:
            return None
        # 检查是否被吊销
        sess = _load_sessions()
        if token not in sess:
            return None
        user = _load()["users"].get(username)
        if not user or user.get("disabled"):
            return None
        return {
            "username": username,
            "display_name": user.get("display_name", username),
            "roles": list(user.get("roles", [])),
            "permissions": sorted(_permissions_of(user.get("roles", []))),
        }


def revoke_session(token: str) -> bool:
    with _lock:
        sess = _load_sessions()
        if token in sess:
            sess.pop(token, None)
            _save_sessions(sess)
            return True
        return False


def list_active_sessions() -> list[dict[str, Any]]:
    """列出当前有效（未过期）的会话（不含令牌本身）。"""
    with _lock:
        sess = _load_sessions()
        now = time.time()
        out = []
        for token, info in sess.items():
            if info.get("expires_at", 0) < now:
                continue
            out.append({
                "username": info.get("username", ""),
                "created_at": info.get("created_at"),
                "expires_at": info.get("expires_at"),
                "token_tail": token[-6:] if token else "",  # 仅尾部用于区分，不泄露完整令牌
            })
        out.sort(key=lambda x: x.get("created_at") or 0, reverse=True)
        return out


def revoke_user_sessions(username: str) -> int:
    """吊销某用户的所有会话（强制下线）。返回吊销数量。"""
    with _lock:
        sess = _load_sessions()
        victims = [t for t, i in sess.items() if i.get("username") == username]
        for t in victims:
            sess.pop(t, None)
        if victims:
            _save_sessions(sess)
        return len(victims)


# ---------- 权限判定 ----------
def _permissions_of(role_names: list[str]) -> set[str]:
    data = _load()
    perms: set[str] = set()
    for r in role_names:
        rdef = data["roles"].get(r)
        if not rdef:
            continue
        rp = rdef.get("permissions", [])
        if "*" in rp:
            return {"*"}
        perms.update(rp)
    return perms


def has_permission(session: Optional[dict[str, Any]], permission: str) -> bool:
    if not session:
        return False
    perms = session.get("permissions", [])
    return "*" in perms or permission in perms


def check_permission(token: Optional[str], permission: str) -> dict[str, Any]:
    """综合校验：令牌有效 + 拥有权限。返回 {ok, session?, error?}。"""
    session = resolve_session(token)
    if not session:
        return {"ok": False, "error": "未登录或会话已过期"}
    if not has_permission(session, permission):
        return {"ok": False, "error": f"缺少权限：{permission}", "session": session}
    return {"ok": True, "session": session}


# ---------- 登录 ----------
def login(username: str, password: str) -> dict[str, Any]:
    """本地账号口令登录，成功返回会话令牌。含暴力破解锁定保护。"""
    with _lock:
        username = (username or "").strip()
        # 锁定检查（在校验口令之前，避免被锁账号继续被试）
        locked_until = _login_locked_until(username)
        if locked_until > time.time():
            wait = int(locked_until - time.time())
            return {"success": False, "error": f"登录失败次数过多，账号已锁定，请 {wait} 秒后再试",
                    "locked": True}
        user = _load()["users"].get(username)
        if not user or user.get("disabled"):
            _record_login_failure(username)
            return {"success": False, "error": "用户不存在或已禁用"}
        if user.get("source") != "local":
            return {"success": False, "error": "该用户为外部目录用户，请使用 SSO 登录"}
        if not _verify_password(password or "", user.get("password", "")):
            _record_login_failure(username)
            # 刚好触发锁定时给出审计
            if _login_locked_until(username) > time.time():
                try:
                    from app.services import audit_log
                    audit_log.record(username, "rbac.login_locked", username, result="locked")
                except Exception:
                    pass
            return {"success": False, "error": "用户名或口令错误"}
        _clear_login_failures(username)
        sess = issue_session(username)
        return {"success": True, **sess, "roles": list(user.get("roles", []))}


def change_password(username: str, old_password: str, new_password: str) -> dict[str, Any]:
    with _lock:
        data = _load()
        user = data["users"].get(username)
        if not user:
            return {"success": False, "error": "用户不存在"}
        if not _verify_password(old_password or "", user.get("password", "")):
            return {"success": False, "error": "原口令错误"}
        if len(new_password or "") < 6:
            return {"success": False, "error": "新口令至少 6 位"}
        user["password"] = _hash_password(new_password)
        _save(data)
        return {"success": True}


# ---------- SSO / 企业目录 ----------
def _sso_config() -> dict[str, Any]:
    """读取 SSO 配置（backend/data/sso_config.json）。"""
    f = _DATA_DIR / "sso_config.json"
    try:
        if f.exists():
            return json.loads(f.read_text(encoding="utf-8"))
    except Exception:
        pass
    return {}


def set_sso_config(cfg: dict[str, Any]) -> dict[str, Any]:
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    (_DATA_DIR / "sso_config.json").write_text(
        json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return {"success": True}


def _provision_external_user(provider: str, ext_id: str, display_name: str,
                             default_roles: list[str]) -> str:
    """把外部目录用户映射/创建为本地用户记录，返回本地用户名。"""
    username = f"{provider}:{ext_id}"
    data = _load()
    if username not in data["users"]:
        data["users"][username] = {
            "username": username,
            "password": "",  # 外部用户无本地口令
            "roles": list(default_roles or ["viewer"]),
            "display_name": display_name or ext_id,
            "source": provider,
            "created_at": datetime.now().isoformat(),
            "disabled": False,
        }
        _save(data)
    return username


def sso_login(provider: str, payload: dict[str, Any]) -> dict[str, Any]:
    """企业目录/第三方登录。provider: ldap/dingtalk/wework/feishu。
    payload 为各渠道认证所需材料（如 ldap: {username,password}；oauth: {code}）。
    校验逻辑由配置驱动：未配置则返回明确提示，绝不静默放行。
    """
    provider = (provider or "").strip().lower()
    cfg = _sso_config().get(provider)
    if not cfg or not cfg.get("enabled"):
        return {"success": False, "error": f"未启用 {provider} 登录，请先在 SSO 配置中开启并填写参数"}

    default_roles = cfg.get("default_roles") or ["viewer"]

    if provider == "ldap":
        return _sso_ldap(cfg, payload, default_roles)
    elif provider in ("dingtalk", "wework", "feishu"):
        return _sso_oauth(provider, cfg, payload, default_roles)
    return {"success": False, "error": f"不支持的 SSO 渠道：{provider}"}


def _sso_ldap(cfg: dict[str, Any], payload: dict[str, Any], default_roles: list[str]) -> dict[str, Any]:
    username = (payload or {}).get("username", "").strip()
    password = (payload or {}).get("password", "")
    if not username or not password:
        return {"success": False, "error": "缺少 LDAP 用户名或口令"}
    try:
        import ldap3  # type: ignore
    except Exception:
        return {"success": False, "error": "服务器未安装 ldap3 依赖，无法进行 LDAP 认证"}
    try:
        server = ldap3.Server(cfg["server"], get_info=ldap3.NONE)
        user_dn = cfg.get("user_dn_template", "{username}").format(username=username)
        conn = ldap3.Connection(server, user=user_dn, password=password, auto_bind=True)
        conn.unbind()
    except Exception as e:
        return {"success": False, "error": f"LDAP 认证失败：{e}"}
    local = _provision_external_user("ldap", username, username, default_roles)
    sess = issue_session(local)
    return {"success": True, **sess, "roles": default_roles}


def _sso_oauth(provider: str, cfg: dict[str, Any], payload: dict[str, Any],
               default_roles: list[str]) -> dict[str, Any]:
    """钉钉/企微/飞书 OAuth：用授权 code 换取用户身份。
    需要网络请求第三方接口，依赖配置的 app_key/app_secret。
    """
    code = (payload or {}).get("code", "").strip()
    if not code:
        return {"success": False, "error": "缺少 OAuth 授权 code"}
    if not cfg.get("app_key") or not cfg.get("app_secret"):
        return {"success": False, "error": f"未配置 {provider} 的 app_key/app_secret"}
    try:
        ext_id, display_name = _oauth_fetch_userinfo(provider, cfg, code)
    except Exception as e:
        return {"success": False, "error": f"{provider} 身份获取失败：{e}"}
    if not ext_id:
        return {"success": False, "error": f"{provider} 未返回有效用户标识"}
    local = _provision_external_user(provider, ext_id, display_name, default_roles)
    sess = issue_session(local)
    return {"success": True, **sess, "roles": default_roles}


def _oauth_fetch_userinfo(provider: str, cfg: dict[str, Any], code: str) -> tuple[str, str]:
    """调第三方接口换取 (用户唯一标识, 显示名)。使用 httpx 同步请求。"""
    import httpx
    timeout = 10.0
    if provider == "feishu":
        with httpx.Client(timeout=timeout) as c:
            tok = c.post(
                "https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal",
                json={"app_id": cfg["app_key"], "app_secret": cfg["app_secret"]},
            ).json()
            app_token = tok.get("app_access_token", "")
            r = c.post(
                "https://open.feishu.cn/open-apis/authen/v1/oidc/access_token",
                headers={"Authorization": f"Bearer {app_token}"},
                json={"grant_type": "authorization_code", "code": code},
            ).json()
            data = r.get("data", {}) or {}
            return data.get("open_id", ""), data.get("name", "")
    elif provider == "dingtalk":
        with httpx.Client(timeout=timeout) as c:
            r = c.post(
                "https://api.dingtalk.com/v1.0/oauth2/userAccessToken",
                json={"clientId": cfg["app_key"], "clientSecret": cfg["app_secret"],
                      "code": code, "grantType": "authorization_code"},
            ).json()
            access = r.get("accessToken", "")
            u = c.get(
                "https://api.dingtalk.com/v1.0/contact/users/me",
                headers={"x-acs-dingtalk-access-token": access},
            ).json()
            return u.get("unionId", "") or u.get("openId", ""), u.get("nick", "")
    elif provider == "wework":
        with httpx.Client(timeout=timeout) as c:
            tok = c.get(
                "https://qyapi.weixin.qq.com/cgi-bin/gettoken",
                params={"corpid": cfg["app_key"], "corpsecret": cfg["app_secret"]},
            ).json()
            access = tok.get("access_token", "")
            r = c.get(
                "https://qyapi.weixin.qq.com/cgi-bin/auth/getuserinfo",
                params={"access_token": access, "code": code},
            ).json()
            return r.get("userid", ""), r.get("userid", "")
    return "", ""


# ---------- 用户 / 角色管理 ----------
def list_users() -> list[dict[str, Any]]:
    with _lock:
        data = _load()
        out = []
        for u in data["users"].values():
            out.append({
                "username": u["username"],
                "display_name": u.get("display_name", ""),
                "roles": list(u.get("roles", [])),
                "source": u.get("source", "local"),
                "disabled": bool(u.get("disabled")),
                "created_at": u.get("created_at", ""),
            })
        out.sort(key=lambda x: x["username"])
        return out


def create_user(username: str, password: str, roles: list[str],
                display_name: str = "") -> dict[str, Any]:
    username = (username or "").strip()
    if not username:
        return {"success": False, "error": "用户名不能为空"}
    with _lock:
        data = _load()
        if username in data["users"]:
            return {"success": False, "error": "用户已存在"}
        if len(password or "") < 6:
            return {"success": False, "error": "口令至少 6 位"}
        bad = [r for r in (roles or []) if r not in data["roles"]]
        if bad:
            return {"success": False, "error": f"角色不存在：{bad}"}
        data["users"][username] = {
            "username": username,
            "password": _hash_password(password),
            "roles": list(roles or ["viewer"]),
            "display_name": display_name or username,
            "source": "local",
            "created_at": datetime.now().isoformat(),
            "disabled": False,
        }
        _save(data)
        return {"success": True, "username": username}


def update_user(username: str, *, roles: Optional[list[str]] = None,
                display_name: Optional[str] = None, disabled: Optional[bool] = None,
                new_password: Optional[str] = None) -> dict[str, Any]:
    with _lock:
        data = _load()
        user = data["users"].get(username)
        if not user:
            return {"success": False, "error": "用户不存在"}
        if roles is not None:
            bad = [r for r in roles if r not in data["roles"]]
            if bad:
                return {"success": False, "error": f"角色不存在：{bad}"}
            user["roles"] = list(roles)
        if display_name is not None:
            user["display_name"] = display_name
        if disabled is not None:
            user["disabled"] = bool(disabled)
        if new_password:
            if len(new_password) < 6:
                return {"success": False, "error": "口令至少 6 位"}
            user["password"] = _hash_password(new_password)
        _save(data)
        # 禁用或改口令后，强制吊销该用户所有现存会话
        if disabled or new_password:
            revoke_user_sessions(username)
        return {"success": True}


def delete_user(username: str) -> dict[str, Any]:
    with _lock:
        data = _load()
        if username == "admin":
            return {"success": False, "error": "禁止删除内置 admin 用户"}
        if username not in data["users"]:
            return {"success": False, "error": "用户不存在"}
        data["users"].pop(username, None)
        _save(data)
        revoke_user_sessions(username)  # 删除用户后强制下线其所有会话
        return {"success": True}


def list_roles() -> list[dict[str, Any]]:
    with _lock:
        data = _load()
        return [
            {"name": name, "description": r.get("description", ""),
             "permissions": list(r.get("permissions", [])),
             "preset": name in _PRESET_ROLES}
            for name, r in sorted(data["roles"].items())
        ]


def upsert_role(name: str, permissions: list[str], description: str = "") -> dict[str, Any]:
    name = (name or "").strip()
    if not name:
        return {"success": False, "error": "角色名不能为空"}
    with _lock:
        data = _load()
        if "*" not in (permissions or []):
            bad = [p for p in (permissions or []) if p not in ALL_PERMISSIONS]
            if bad:
                return {"success": False, "error": f"未知权限：{bad}"}
        data["roles"][name] = {
            "description": description,
            "permissions": list(permissions or []),
        }
        _save(data)
        return {"success": True, "name": name}


def delete_role(name: str) -> dict[str, Any]:
    with _lock:
        if name in _PRESET_ROLES:
            return {"success": False, "error": "禁止删除预置角色"}
        data = _load()
        if name not in data["roles"]:
            return {"success": False, "error": "角色不存在"}
        in_use = [u["username"] for u in data["users"].values() if name in u.get("roles", [])]
        if in_use:
            return {"success": False, "error": f"角色被用户占用：{in_use}"}
        data["roles"].pop(name, None)
        _save(data)
        return {"success": True}


def all_permissions() -> list[str]:
    return list(ALL_PERMISSIONS)


# ---------- 全局权限强制（opt-in）----------
_ENFORCE_FILE = _DATA_DIR / "rbac_enforce.json"

# 路径前缀 → 所需权限（用于全局强制时的粗粒度 authz）
# 说明：方法敏感的端点用 (method, prefix) 细分；其余按前缀归类。
# 注意：自鉴权的企业端点（orchestrator/rbac/audit/approvals/vault/idp/computer-use/
# process-mining）刻意不在此映射——中间件仅要求登录，细粒度权限由各端点自身校验，
# 避免与端点级 cluster.*/credential.* 等专属权限冲突。
_PATH_PERM_RULES: list[tuple[str, str, str]] = [
    # (method 前缀匹配 '*'=任意, 路径前缀, 所需权限)
    ("GET", "/api/credentials", "credential.view"),
    ("*", "/api/credentials", "credential.manage"),
    ("GET", "/api/workflows", "workflow.view"),
    ("GET", "/api/local-workflows", "workflow.view"),
    ("*", "/api/workflows", "workflow.edit"),
    ("*", "/api/local-workflows", "workflow.edit"),
    ("*", "/api/scheduled-tasks", "workflow.edit"),
    # 工作流创作/扩展相关端点：读=查看，写=编辑（防只读用户远程篡改）
    ("GET", "/api/plugins", "workflow.view"),
    ("*", "/api/plugins", "workflow.edit"),
    ("GET", "/api/custom-modules", "workflow.view"),
    ("*", "/api/custom-modules", "workflow.edit"),
    ("GET", "/api/triggers", "workflow.view"),
    ("*", "/api/triggers", "workflow.edit"),
    ("*", "/api/recorder", "workflow.edit"),
    ("*", "/api/desktop-recorder", "workflow.edit"),
    ("*", "/api/desktop-picker", "workflow.edit"),
    ("*", "/api/element-picker", "workflow.edit"),
    ("GET", "/api/workflow-versions", "workflow.view"),
    ("*", "/api/workflow-versions", "workflow.edit"),
    ("*", "/api/workflow-package", "workflow.edit"),
    ("GET", "/api/data-assets", "workflow.view"),
    ("*", "/api/data-assets", "workflow.edit"),
    ("GET", "/api/image-assets", "workflow.view"),
    ("*", "/api/image-assets", "workflow.edit"),
    # 系统级操作（执行命令/宏/鼠标键盘/媒体）属于"运行"能力，至少需 operator
    ("*", "/api/system", "workflow.run"),
    ("*", "/api/system-macro", "workflow.run"),
    ("*", "/api/system-mouse", "workflow.run"),
    ("*", "/api/phone", "workflow.run"),
]

# 这些路径即使在强制模式下也不需要会话（执行机用节点 token / 公共接口 / 登录）
_ENFORCE_EXEMPT_PREFIXES = (
    "/api/rbac/login", "/api/rbac/sso/login", "/api/security/",
    "/api/orchestrator/nodes/register", "/api/orchestrator/nodes/heartbeat",
    "/api/orchestrator/nodes/claim", "/api/orchestrator/nodes/report",
    "/health", "/api/config", "/docs", "/redoc", "/openapi.json", "/console", "/metrics",
)


def is_enforced() -> bool:
    """是否开启全局 RBAC 强制（默认关闭，保证本机编辑器开箱即用）。"""
    try:
        if _ENFORCE_FILE.exists():
            return bool(json.loads(_ENFORCE_FILE.read_text(encoding="utf-8")).get("enabled", False))
    except Exception:
        pass
    return False


def set_enforced(enabled: bool) -> dict[str, Any]:
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    _ENFORCE_FILE.write_text(json.dumps({"enabled": bool(enabled)}, ensure_ascii=False),
                             encoding="utf-8")
    return {"success": True, "enabled": bool(enabled)}


def is_enforce_exempt(path: str) -> bool:
    return any(path.startswith(p) for p in _ENFORCE_EXEMPT_PREFIXES)


def required_permission_for(method: str, path: str) -> Optional[str]:
    """返回访问该路径所需的权限；None 表示仅需登录（认证）即可。"""
    method = (method or "GET").upper()
    for m, prefix, perm in _PATH_PERM_RULES:
        if path.startswith(prefix) and (m == "*" or m == method):
            return perm
    return None
