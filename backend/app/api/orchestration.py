"""工作流编排 / 队列 / 单元测试 / 健康探针 - HTTP API"""
from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter
from pydantic import BaseModel

from app.services import pipeline_orchestrator as pipe
from app.services import run_queue as rq
from app.services import workflow_tests as wt
from app.services import health_probes as hp

router = APIRouter(prefix="/api/orchestration", tags=["orchestration"])


# ===== 流水线 / DAG =====

@router.get("/pipelines")
async def api_list_pipelines():
    return {"pipelines": pipe.list_pipelines()}


@router.get("/pipelines/{pid}")
async def api_get_pipeline(pid: str):
    return {"id": pid, "pipeline": pipe.get_pipeline(pid)}


class PipelineSaveRequest(BaseModel):
    pipeline: dict


@router.put("/pipelines")
async def api_save_pipeline(req: PipelineSaveRequest):
    return pipe.save_pipeline(req.pipeline or {})


@router.delete("/pipelines/{pid}")
async def api_delete_pipeline(pid: str):
    return pipe.delete_pipeline(pid)


class PipelineRunRequest(BaseModel):
    stop_on_failure: bool = True


@router.post("/pipelines/{pid}/run")
async def api_run_pipeline(pid: str, req: PipelineRunRequest = PipelineRunRequest()):
    return await pipe.run_pipeline(pid, stop_on_failure=req.stop_on_failure)


# ===== 运行队列 =====

class EnqueueRequest(BaseModel):
    workflow: str
    priority: int = 0
    headless: bool = True


@router.post("/queue/enqueue")
async def api_enqueue(req: EnqueueRequest):
    return rq.enqueue(req.workflow, priority=req.priority, headless=req.headless)


@router.get("/queue")
async def api_queue_overview():
    return rq.overview()


@router.get("/queue/{job_id}")
async def api_queue_status(job_id: str):
    return rq.status(job_id)


@router.post("/queue/{job_id}/cancel")
async def api_queue_cancel(job_id: str):
    return rq.cancel(job_id)


class ConcurrencyRequest(BaseModel):
    max_concurrency: int


@router.put("/queue/concurrency")
async def api_set_concurrency(req: ConcurrencyRequest):
    return rq.set_max_concurrency(req.max_concurrency)


@router.post("/queue/clear-finished")
async def api_queue_clear():
    return rq.clear_finished()


# ===== 工作流单元测试 / 回归 =====

@router.get("/tests")
async def api_list_suites():
    return wt.list_suites()


@router.get("/tests/{workflow}")
async def api_get_suite(workflow: str):
    return wt.get_suite(workflow)


class TestSuiteRequest(BaseModel):
    workflow: str
    cases: list


@router.put("/tests")
async def api_save_suite(req: TestSuiteRequest):
    return wt.save_suite(req.workflow, req.cases)


@router.delete("/tests/{workflow}")
async def api_delete_suite(workflow: str):
    return wt.delete_suite(workflow)


@router.post("/tests/{workflow}/run")
async def api_run_suite(workflow: str):
    return await wt.run_suite(workflow)


@router.post("/tests/run-all")
async def api_run_all_suites():
    return await wt.run_all_suites()


# ===== 健康探针 =====

@router.get("/probes")
async def api_list_probes():
    return hp.list_probes()


class ProbeSaveRequest(BaseModel):
    probe: dict


@router.put("/probes")
async def api_save_probe(req: ProbeSaveRequest):
    return hp.save_probe(req.probe or {})


@router.delete("/probes/{pid}")
async def api_delete_probe(pid: str):
    return hp.delete_probe(pid)


class ProbeToggleRequest(BaseModel):
    enabled: bool


@router.post("/probes/{pid}/toggle")
async def api_toggle_probe(pid: str, req: ProbeToggleRequest):
    return hp.set_enabled(pid, req.enabled)


@router.post("/probes/{pid}/run")
async def api_run_probe(pid: str):
    return await hp.run_probe_now(pid)
