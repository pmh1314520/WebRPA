# -*- coding: utf-8 -*-
"""Prometheus 指标端点 /metrics"""
from fastapi import APIRouter
from fastapi.responses import PlainTextResponse

from app.services import metrics_exporter

router = APIRouter(tags=["metrics"])


@router.get("/metrics", response_class=PlainTextResponse)
async def metrics():
    """Prometheus 抓取端点（文本曝光格式）。"""
    text = metrics_exporter.build_metrics()
    return PlainTextResponse(content=text, media_type="text/plain; version=0.0.4; charset=utf-8")
