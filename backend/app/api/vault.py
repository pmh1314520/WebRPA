# -*- coding: utf-8 -*-
"""凭据保险库 API（ACL + 授权取用，绝不返回明文给前端）"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

from app.services import rbac, credential_vault

router = APIRouter(prefix="/api/vault", tags=["vault"])


def _session(token: Optional[str]):
    s = rbac.resolve_session(token)
    if not s:
        raise HTTPException(status_code=401, detail="未登录或会话已过期")
    return s


def _require(token: Optional[str], permission: str):
    res = rbac.check_permission(token, permission)
    if not res.get("ok"):
        raise HTTPException(status_code=403, detail=res.get("error", "无权限"))
    return res["session"]


class SetAclReq(BaseModel):
    name: str
    allowed_roles: list[str]


@router.get("/acl")
async def list_acls(x_webrpa_session: Optional[str] = Header(None)):
    _require(x_webrpa_session, "credential.view")
    return {"success": True, "acls": credential_vault.list_acls()}


@router.put("/acl")
async def set_acl(req: SetAclReq, x_webrpa_session: Optional[str] = Header(None)):
    s = _require(x_webrpa_session, "credential.manage")
    res = credential_vault.set_acl(req.name, req.allowed_roles)
    try:
        from app.services import audit_log
        audit_log.record(s["username"], "credential.manage", req.name,
                         detail={"allowed_roles": req.allowed_roles})
    except Exception:
        pass
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error"))
    return res


@router.get("/authorized-get")
async def authorized_get(name: str, field: str = "value",
                         x_webrpa_session: Optional[str] = Header(None)):
    """授权取用凭据明文（需登录会话）。仅供受信内部集成调用。"""
    s = _session(x_webrpa_session)
    res = credential_vault.get_field_authorized(s, name, field)
    if not res.get("success"):
        raise HTTPException(status_code=403, detail=res.get("error"))
    return res
