# -*- coding: utf-8 -*-
"""审批中心 API"""
from typing import Any, Optional
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

from app.services import rbac, approval_center

router = APIRouter(prefix="/api/approvals", tags=["approvals"])


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


class CreateReq(BaseModel):
    action: str
    target: str
    payload: Optional[dict[str, Any]] = None
    reason: Optional[str] = ""


class DecideReq(BaseModel):
    approved: bool
    comment: Optional[str] = ""


@router.get("")
async def list_requests(status: Optional[str] = None,
                        x_webrpa_session: Optional[str] = Header(None)):
    _session(x_webrpa_session)
    return {"success": True, "requests": approval_center.list_requests(status)}


@router.get("/{rid}")
async def get_request(rid: str, x_webrpa_session: Optional[str] = Header(None)):
    _session(x_webrpa_session)
    r = approval_center.get_request(rid)
    if not r:
        raise HTTPException(status_code=404, detail="审批单不存在")
    return {"success": True, "request": r}


@router.post("")
async def create_request(req: CreateReq, x_webrpa_session: Optional[str] = Header(None)):
    s = _require(x_webrpa_session, "approval.create")
    return approval_center.create_request(s["username"], req.action, req.target,
                                          req.payload, req.reason or "")


@router.post("/{rid}/decide")
async def decide(rid: str, req: DecideReq, x_webrpa_session: Optional[str] = Header(None)):
    s = _require(x_webrpa_session, "approval.decide")
    res = approval_center.decide(rid, s["username"], req.approved, req.comment or "")
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error"))
    return res


@router.post("/{rid}/execute")
async def execute(rid: str, x_webrpa_session: Optional[str] = Header(None)):
    """执行已批准的危险操作（消费一次性令牌并真正落地动作）。"""
    s = _require(x_webrpa_session, "approval.create")
    res = approval_center.execute_by_id(rid, s["username"])
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error"))
    return res
