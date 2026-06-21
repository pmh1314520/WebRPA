# -*- coding: utf-8 -*-
"""审计日志 API"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import PlainTextResponse

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
                     limit: int = 200, offset: int = 0,
                     x_webrpa_session: Optional[str] = Header(None)):
    _require(x_webrpa_session, "audit.view")
    return {"success": True,
            "total": audit_log.count(actor=actor, action=action, since=since, until=until),
            "offset": offset,
            "logs": audit_log.query(actor=actor, action=action, since=since,
                                    until=until, limit=limit, offset=offset)}


@router.get("/export")
async def export_logs(fmt: str = "jsonl", actor: Optional[str] = None,
                      action: Optional[str] = None, since: Optional[str] = None,
                      until: Optional[str] = None,
                      x_webrpa_session: Optional[str] = Header(None)):
    """导出审计日志（jsonl/csv），作为附件下载。"""
    _require(x_webrpa_session, "audit.view")
    fmt = (fmt or "jsonl").lower()
    if fmt not in ("jsonl", "csv"):
        raise HTTPException(status_code=400, detail="fmt 仅支持 jsonl 或 csv")
    text = audit_log.export_text(fmt, actor=actor, action=action, since=since, until=until)
    from datetime import datetime
    fname = f"audit_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{fmt}"
    media = "text/csv" if fmt == "csv" else "application/x-ndjson"
    return PlainTextResponse(
        content=text, media_type=f"{media}; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


@router.get("/verify")
async def verify_chain(x_webrpa_session: Optional[str] = Header(None)):
    _require(x_webrpa_session, "audit.view")
    return {"success": True, "result": audit_log.verify_chain()}


@router.get("/stats")
async def stats(x_webrpa_session: Optional[str] = Header(None)):
    _require(x_webrpa_session, "audit.view")
    return {"success": True, "stats": audit_log.stats()}
