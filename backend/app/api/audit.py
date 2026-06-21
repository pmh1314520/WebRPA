# -*- coding: utf-8 -*-
"""审计日志 API"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Header

from app.services import rbac, audit_log

router = APIRouter(prefix="/api/audit", tags=["audit"])


def _require(token: Optional[str], permission: str):
    res = rbac.check_permission(token, permission)
    if not res.get("ok"):
        raise HTTPException(status_code=403, detail=res.get("error", "无权限"))
    return res["session"]


@router.get("/logs")
async def query_logs(actor: Optional[str] = None, action: Optional[str] = None,
                     since: Optional[str] = None, until: Optional[str] = None,
                     limit: int = 200, x_webrpa_session: Optional[str] = Header(None)):
    _require(x_webrpa_session, "audit.view")
    return {"success": True,
            "logs": audit_log.query(actor=actor, action=action, since=since,
                                    until=until, limit=limit)}


@router.get("/verify")
async def verify_chain(x_webrpa_session: Optional[str] = Header(None)):
    _require(x_webrpa_session, "audit.view")
    return {"success": True, "result": audit_log.verify_chain()}


@router.get("/stats")
async def stats(x_webrpa_session: Optional[str] = Header(None)):
    _require(x_webrpa_session, "audit.view")
    return {"success": True, "stats": audit_log.stats()}
