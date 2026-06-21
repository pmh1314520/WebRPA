# -*- coding: utf-8 -*-
"""RBAC 角色权限 + 登录 + SSO API"""
from typing import Any, Optional
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

from app.services import rbac, audit_log

router = APIRouter(prefix="/api/rbac", tags=["rbac"])


# ---------- 会话校验依赖 ----------
def _session(token: Optional[str]):
    return rbac.resolve_session(token)


def _require(token: Optional[str], permission: str):
    res = rbac.check_permission(token, permission)
    if not res.get("ok"):
        raise HTTPException(status_code=403, detail=res.get("error", "无权限"))
    return res["session"]


class LoginReq(BaseModel):
    username: str
    password: str


class SSOLoginReq(BaseModel):
    provider: str
    payload: dict[str, Any]


class ChangePwdReq(BaseModel):
    old_password: str
    new_password: str


class UserCreateReq(BaseModel):
    username: str
    password: str
    roles: list[str]
    display_name: Optional[str] = ""


class UserUpdateReq(BaseModel):
    roles: Optional[list[str]] = None
    display_name: Optional[str] = None
    disabled: Optional[bool] = None
    new_password: Optional[str] = None


class RoleUpsertReq(BaseModel):
    name: str
    permissions: list[str]
    description: Optional[str] = ""


class SSOConfigReq(BaseModel):
    config: dict[str, Any]


@router.post("/login")
async def login(req: LoginReq):
    res = rbac.login(req.username, req.password)
    audit_log.record(req.username, "rbac.login", req.username,
                     result="success" if res.get("success") else "failed")
    if not res.get("success"):
        raise HTTPException(status_code=401, detail=res.get("error"))
    return res


@router.post("/sso/login")
async def sso_login(req: SSOLoginReq):
    res = rbac.sso_login(req.provider, req.payload)
    audit_log.record(f"{req.provider}:sso", "rbac.sso_login", req.provider,
                     result="success" if res.get("success") else "failed")
    if not res.get("success"):
        raise HTTPException(status_code=401, detail=res.get("error"))
    return res


@router.post("/logout")
async def logout(x_webrpa_session: Optional[str] = Header(None)):
    if x_webrpa_session:
        rbac.revoke_session(x_webrpa_session)
    return {"success": True}


@router.get("/me")
async def me(x_webrpa_session: Optional[str] = Header(None)):
    s = _session(x_webrpa_session)
    if not s:
        raise HTTPException(status_code=401, detail="未登录或会话已过期")
    return {"success": True, "user": s}


@router.post("/change-password")
async def change_password(req: ChangePwdReq, x_webrpa_session: Optional[str] = Header(None)):
    s = _session(x_webrpa_session)
    if not s:
        raise HTTPException(status_code=401, detail="未登录")
    res = rbac.change_password(s["username"], req.old_password, req.new_password)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error"))
    return res


@router.get("/permissions")
async def permissions(x_webrpa_session: Optional[str] = Header(None)):
    _require(x_webrpa_session, "rbac.manage")
    return {"success": True, "permissions": rbac.all_permissions()}


# ---------- 用户管理（需 rbac.manage）----------
@router.get("/users")
async def list_users(x_webrpa_session: Optional[str] = Header(None)):
    _require(x_webrpa_session, "rbac.manage")
    return {"success": True, "users": rbac.list_users()}


@router.post("/users")
async def create_user(req: UserCreateReq, x_webrpa_session: Optional[str] = Header(None)):
    s = _require(x_webrpa_session, "rbac.manage")
    res = rbac.create_user(req.username, req.password, req.roles, req.display_name or "")
    audit_log.record(s["username"], "rbac.user_create", req.username,
                     result="success" if res.get("success") else "failed")
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error"))
    return res


@router.put("/users/{username}")
async def update_user(username: str, req: UserUpdateReq,
                      x_webrpa_session: Optional[str] = Header(None)):
    s = _require(x_webrpa_session, "rbac.manage")
    res = rbac.update_user(username, roles=req.roles, display_name=req.display_name,
                           disabled=req.disabled, new_password=req.new_password)
    audit_log.record(s["username"], "rbac.user_update", username,
                     result="success" if res.get("success") else "failed")
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error"))
    return res


@router.delete("/users/{username}")
async def delete_user(username: str, x_webrpa_session: Optional[str] = Header(None)):
    s = _require(x_webrpa_session, "rbac.manage")
    res = rbac.delete_user(username)
    audit_log.record(s["username"], "rbac.user_delete", username,
                     result="success" if res.get("success") else "failed")
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error"))
    return res


# ---------- 角色管理 ----------
@router.get("/roles")
async def list_roles(x_webrpa_session: Optional[str] = Header(None)):
    _require(x_webrpa_session, "rbac.manage")
    return {"success": True, "roles": rbac.list_roles()}


@router.post("/roles")
async def upsert_role(req: RoleUpsertReq, x_webrpa_session: Optional[str] = Header(None)):
    s = _require(x_webrpa_session, "rbac.manage")
    res = rbac.upsert_role(req.name, req.permissions, req.description or "")
    audit_log.record(s["username"], "rbac.role_change", req.name,
                     result="success" if res.get("success") else "failed")
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error"))
    return res


@router.delete("/roles/{name}")
async def delete_role(name: str, x_webrpa_session: Optional[str] = Header(None)):
    s = _require(x_webrpa_session, "rbac.manage")
    res = rbac.delete_role(name)
    audit_log.record(s["username"], "rbac.role_change", name, result="deleted")
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error"))
    return res


# ---------- SSO 配置 ----------
@router.get("/sso/config")
async def get_sso_config(x_webrpa_session: Optional[str] = Header(None)):
    _require(x_webrpa_session, "rbac.manage")
    return {"success": True, "config": rbac._sso_config()}


@router.put("/sso/config")
async def set_sso_config(req: SSOConfigReq, x_webrpa_session: Optional[str] = Header(None)):
    _require(x_webrpa_session, "rbac.manage")
    return rbac.set_sso_config(req.config)
