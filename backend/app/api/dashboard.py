"""执行仪表盘 + 失败告警中心 - HTTP API"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from app.services import execution_history as hist
from app.services import alert_center as alerts

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


# ---------- 执行仪表盘 ----------

@router.get("/stats")
async def api_stats(days: int = 7):
    """总览 + 成功率 + 每日趋势 + 失败/最慢 TOP 排行。"""
    return hist.get_stats(days=days)


@router.get("/runs")
async def api_runs(limit: int = 100, workflow_name: str = "", status: str = "", source: str = ""):
    """运行历史列表（最新在前）。"""
    return {"runs": hist.list_runs(limit=limit, workflow_name=workflow_name, status=status, source=source)}


@router.delete("/history")
async def api_clear_history():
    """清空执行历史。"""
    return hist.clear_history()


# ---------- 失败告警中心 ----------

@router.get("/alerts/config")
async def api_get_alert_config():
    return alerts.get_config()


class AlertConfigRequest(BaseModel):
    config: dict[str, Any]


@router.put("/alerts/config")
async def api_save_alert_config(req: AlertConfigRequest):
    return {"success": True, "config": alerts.save_config(req.config or {})}


@router.post("/alerts/test")
async def api_test_alert():
    """发送一条测试告警，验证渠道配置。"""
    return alerts.test_alert()
