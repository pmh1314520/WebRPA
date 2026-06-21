# -*- coding: utf-8 -*-
"""流程反推 + 流程挖掘 API"""
from typing import Any, Optional
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

from app.services import rbac, process_mining

router = APIRouter(prefix="/api/process-mining", tags=["process-mining"])


def _actor(token: Optional[str], permission: str) -> str:
    s = rbac.resolve_session(token)
    if s:
        if not rbac.has_permission(s, permission):
            raise HTTPException(status_code=403, detail=f"缺少权限：{permission}")
        return s.get("username", "user")
    return "local"


class InferReq(BaseModel):
    events: list[dict[str, Any]]
    description: Optional[str] = ""


class MineReq(BaseModel):
    records: list[dict[str, Any]]


@router.post("/infer")
async def infer(req: InferReq, x_webrpa_session: Optional[str] = Header(None)):
    actor = _actor(x_webrpa_session, "process_mining.use")
    result = await process_mining.infer_workflow(req.events, description=req.description or "",
                                                 actor=actor)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result


@router.post("/mine")
async def mine(req: MineReq, x_webrpa_session: Optional[str] = Header(None)):
    _actor(x_webrpa_session, "process_mining.use")
    result = process_mining.mine(req.records)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result
