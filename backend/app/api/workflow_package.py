# -*- coding: utf-8 -*-
"""工作流一键打包为 EXE / 分享包 API"""
from typing import Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services import workflow_packager

router = APIRouter(prefix="/api/workflow-package", tags=["workflow-package"])


class BuildReq(BaseModel):
    workflow: Any                      # 本地工作流文件名/路径，或完整 workflow dict
    output_name: str
    mode: str = "portable"             # portable（自包含）/ shared（依赖本机WebRPA）
    headless: bool = False
    show_console: bool = True
    slim: bool = True
    icon_path: Optional[str] = None


class AnalyzeReq(BaseModel):
    workflow: Any


@router.post("/analyze")
async def analyze(req: AnalyzeReq):
    """预览：分析工作流用到的模块与需要的依赖组（用于打包前提示体积/裁剪）。"""
    from app.services.workflow_runner import load_workflow_dict
    try:
        wf = load_workflow_dict(req.workflow) if not isinstance(req.workflow, dict) else req.workflow
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"无法加载工作流：{e}")
    return {"success": True, **workflow_packager.analyze_dependencies(wf)}


@router.post("/build")
async def build(req: BuildReq):
    """启动打包任务（后台执行），返回 job_id。"""
    if not (req.output_name or "").strip():
        raise HTTPException(status_code=400, detail="输出名称不能为空")
    if req.mode not in ("portable", "shared"):
        raise HTTPException(status_code=400, detail="mode 仅支持 portable / shared")
    res = workflow_packager.package(
        req.workflow, req.output_name, mode=req.mode, headless=req.headless,
        show_console=req.show_console, slim=req.slim, icon_path=req.icon_path)
    if res.get("status") == "failed":
        raise HTTPException(status_code=400, detail=res.get("error"))
    return res


@router.get("/jobs")
async def list_jobs(limit: int = 30):
    return {"success": True, "jobs": workflow_packager.list_jobs(limit)}


@router.get("/jobs/{job_id}")
async def get_job(job_id: str):
    job = workflow_packager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="任务不存在")
    return {"success": True, "job": job}


@router.get("/toolchain")
async def toolchain_status():
    """查询打包工具链（PyInstaller，用于生成 .exe）是否就绪。"""
    return {"success": True, **workflow_packager.packaging_toolchain_status()}


@router.post("/toolchain/install")
async def toolchain_install():
    """一键安装打包工具链（PyInstaller，需联网）。"""
    return workflow_packager.install_packaging_toolchain()
