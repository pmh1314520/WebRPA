# -*- coding: utf-8 -*-
"""控制中心 + 多机器人集群 API

- 执行机侧接口（凭 node token）：register / heartbeat / claim / report
- 管理侧接口（需 cluster 权限）：list nodes / submit task / overview / failover
"""
from typing import Any, Optional
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

from app.services import orchestrator, rbac

router = APIRouter(prefix="/api/orchestrator", tags=["orchestrator"])


def _require(token: Optional[str], permission: str):
    res = rbac.check_permission(token, permission)
    if not res.get("ok"):
        raise HTTPException(status_code=403, detail=res.get("error", "无权限"))
    return res["session"]


# ---------- 执行机侧 ----------
class RegisterReq(BaseModel):
    name: str
    tags: Optional[list[str]] = None
    capabilities: Optional[list[str]] = None
    max_concurrency: Optional[int] = 2
    host: Optional[str] = ""
    node_id: Optional[str] = None
    enroll_secret: Optional[str] = None


class HeartbeatReq(BaseModel):
    node_id: str
    token: str
    load: Optional[int] = None
    status: Optional[str] = None


class ClaimReq(BaseModel):
    node_id: str
    token: str
    max_take: Optional[int] = 1


class ReportReq(BaseModel):
    node_id: str
    token: str
    task_id: str
    success: bool
    result: Optional[dict[str, Any]] = None


@router.post("/nodes/register")
async def register_node(req: RegisterReq):
    res = orchestrator.register_node(
        req.name, tags=req.tags, capabilities=req.capabilities,
        max_concurrency=req.max_concurrency or 2, host=req.host or "", node_id=req.node_id,
        enroll_secret=req.enroll_secret)
    if not res.get("success"):
        raise HTTPException(status_code=403, detail=res.get("error"))
    return res


@router.post("/nodes/heartbeat")
async def heartbeat(req: HeartbeatReq):
    res = orchestrator.heartbeat(req.node_id, req.token, load=req.load, status=req.status)
    if not res.get("success"):
        raise HTTPException(status_code=401, detail=res.get("error"))
    return res


@router.post("/nodes/claim")
async def claim_tasks(req: ClaimReq):
    res = orchestrator.claim_tasks(req.node_id, req.token, req.max_take or 1)
    if not res.get("success"):
        raise HTTPException(status_code=401, detail=res.get("error"))
    return res


@router.post("/nodes/report")
async def report_result(req: ReportReq):
    res = orchestrator.report_result(req.node_id, req.token, req.task_id,
                                     req.success, req.result)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error"))
    return res


# ---------- 管理侧 ----------
class SubmitTaskReq(BaseModel):
    workflow: str
    constraints: Optional[dict[str, Any]] = None
    max_failover: Optional[int] = 2
    priority: Optional[int] = 0


@router.get("/nodes")
async def list_nodes(x_webrpa_session: Optional[str] = Header(None)):
    _require(x_webrpa_session, "cluster.view")
    return {"success": True, "nodes": orchestrator.list_nodes()}


@router.delete("/nodes/{node_id}")
async def remove_node(node_id: str, x_webrpa_session: Optional[str] = Header(None)):
    _require(x_webrpa_session, "cluster.manage")
    res = orchestrator.remove_node(node_id)
    if not res.get("success"):
        raise HTTPException(status_code=404, detail=res.get("error"))
    return res


@router.post("/nodes/{node_id}/enabled")
async def set_node_enabled(node_id: str, enabled: bool = True,
                           x_webrpa_session: Optional[str] = Header(None)):
    _require(x_webrpa_session, "cluster.manage")
    res = orchestrator.set_node_enabled(node_id, enabled)
    if not res.get("success"):
        raise HTTPException(status_code=404, detail=res.get("error"))
    return res


@router.post("/tasks")
async def submit_task(req: SubmitTaskReq, x_webrpa_session: Optional[str] = Header(None)):
    s = _require(x_webrpa_session, "cluster.dispatch")
    return orchestrator.submit_task(req.workflow, constraints=req.constraints,
                                    max_failover=req.max_failover or 2,
                                    requester=s.get("username", "system"),
                                    priority=req.priority or 0)


@router.get("/tasks")
async def list_tasks(status: Optional[str] = None, limit: int = 100,
                     x_webrpa_session: Optional[str] = Header(None)):
    _require(x_webrpa_session, "cluster.view")
    return {"success": True, "tasks": orchestrator.list_tasks(status, limit)}


@router.get("/tasks/{task_id}")
async def get_task(task_id: str, x_webrpa_session: Optional[str] = Header(None)):
    _require(x_webrpa_session, "cluster.view")
    t = orchestrator.get_task(task_id)
    if not t:
        raise HTTPException(status_code=404, detail="任务不存在")
    return {"success": True, "task": t}


@router.get("/overview")
async def overview(x_webrpa_session: Optional[str] = Header(None)):
    _require(x_webrpa_session, "cluster.view")
    return {"success": True, "overview": orchestrator.fleet_overview()}


@router.post("/reap")
async def reap(x_webrpa_session: Optional[str] = Header(None)):
    _require(x_webrpa_session, "cluster.manage")
    return orchestrator.reap_stale_tasks()


class EnrollReq(BaseModel):
    secret: str


@router.get("/enrollment")
async def get_enrollment(x_webrpa_session: Optional[str] = Header(None)):
    _require(x_webrpa_session, "cluster.manage")
    return {"success": True, "enabled": bool(orchestrator.get_enrollment_secret())}


@router.put("/enrollment")
async def set_enrollment(req: EnrollReq, x_webrpa_session: Optional[str] = Header(None)):
    """设置/清空集群入网密钥（设置后执行机注册需携带匹配密钥）。"""
    _require(x_webrpa_session, "cluster.manage")
    return orchestrator.set_enrollment_secret(req.secret)
