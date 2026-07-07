# -*- coding: utf-8 -*-
"""桌面智能录制器 API"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from app.services import desktop_recorder as drec

router = APIRouter(prefix="/api/desktop-recorder", tags=["desktop-recorder"])


class StartRequest(BaseModel):
    excludeTitles: Optional[list] = None


@router.post("/start")
async def api_start(req: Optional[StartRequest] = None):
    """开始桌面录制（全局键鼠钩子）。可传 excludeTitles 忽略 WebRPA 自身窗口。"""
    return drec.start_recorder(exclude_titles=(req.excludeTitles if req else None))


@router.post("/stop")
async def api_stop():
    """停止录制并返回剩余事件"""
    return drec.stop_recorder()


@router.post("/pause")
async def api_pause():
    """暂停录制（不记录期间的操作）"""
    return drec.pause()


@router.post("/resume")
async def api_resume():
    """恢复录制"""
    return drec.resume()


@router.get("/events")
async def api_events():
    """轮询排空已录制事件"""
    return drec.drain_events()


@router.get("/status")
async def api_status():
    return {"active": drec.is_active(), "paused": drec.is_paused()}
