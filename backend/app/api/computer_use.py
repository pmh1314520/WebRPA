# -*- coding: utf-8 -*-
"""计算机使用 Agent（Computer-Use）API"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

from app.services import rbac, computer_use_agent

router = APIRouter(prefix="/api/computer-use", tags=["computer-use"])


def _actor(token: Optional[str], permission: str) -> str:
    """有会话则校验权限并返回用户名；无会话（本机直连）放行为 local。"""
    s = rbac.resolve_session(token)
    if s:
        if not rbac.has_permission(s, permission):
            raise HTTPException(status_code=403, detail=f"缺少权限：{permission}")
        return s.get("username", "user")
    return "local"


class RunReq(BaseModel):
    goal: str
    max_steps: Optional[int] = 15


@router.post("/run")
async def run(req: RunReq, x_webrpa_session: Optional[str] = Header(None)):
    actor = _actor(x_webrpa_session, "computer_use.run")
    if not (req.goal or "").strip():
        raise HTTPException(status_code=400, detail="目标不能为空")
    max_steps = max(1, min(int(req.max_steps or 15), 40))
    result = await computer_use_agent.run_session(req.goal.strip(), max_steps=max_steps, actor=actor)
    return result


@router.get("/sessions")
async def list_sessions(limit: int = 30, x_webrpa_session: Optional[str] = Header(None)):
    _actor(x_webrpa_session, "computer_use.run")
    return {"success": True, "sessions": computer_use_agent.list_sessions(limit)}
