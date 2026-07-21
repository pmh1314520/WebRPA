"""运行队列 + 并发控制

把工作流运行请求放进队列，按优先级、受最大并发数限制地依次执行，
避免大批量任务一窝蜂同时跑把机器拖垮。半夜跑批 / 批量处理必备。

- 入队：enqueue(workflow, priority) → 返回 job_id
- 调度：后台异步调度器按「优先级高 → 入队早」取任务，受 max_concurrency 限制并发
- 状态：queued / running / success / failed / canceled，可查询单个或全部
- 配置：max_concurrency 可调（持久化到 backend/data/run_queue_config.json）
"""

from __future__ import annotations

import asyncio
import itertools
import json
import time
from pathlib import Path
from typing import Any, Optional
from app.utils.paths import BACKEND_DATA_DIR

_seq = itertools.count(1)
_jobs: dict[str, dict[str, Any]] = {}      # job_id -> job
_pending: list[str] = []                    # 待执行 job_id（按需排序）
_active: set[str] = set()                   # 正在执行的 job_id
_dispatcher_task: Optional[asyncio.Task] = None
_wakeup: Optional[asyncio.Event] = None
_MAX_KEEP = 500                             # 内存中最多保留的历史 job 数


def _config_file() -> Path:
    folder = BACKEND_DATA_DIR
    folder.mkdir(parents=True, exist_ok=True)
    return folder / "run_queue_config.json"


def get_max_concurrency() -> int:
    try:
        f = _config_file()
        if f.exists():
            return max(1, int(json.loads(f.read_text(encoding="utf-8")).get("max_concurrency", 2)))
    except Exception:
        pass
    return 2


def set_max_concurrency(n: int) -> dict[str, Any]:
    n = max(1, min(int(n or 2), 32))
    _config_file().write_text(json.dumps({"max_concurrency": n}, ensure_ascii=False), encoding="utf-8")
    _kick()
    return {"success": True, "max_concurrency": n}


def _get_wakeup() -> asyncio.Event:
    global _wakeup
    if _wakeup is None:
        _wakeup = asyncio.Event()
    return _wakeup


def _kick() -> None:
    """唤醒调度器。"""
    try:
        _get_wakeup().set()
    except Exception:
        pass


def _ensure_dispatcher() -> None:
    global _dispatcher_task
    if _dispatcher_task is None or _dispatcher_task.done():
        try:
            _dispatcher_task = asyncio.create_task(_dispatcher_loop())
        except RuntimeError:
            # 没有运行中的事件循环（极少数情况），下次入队再试
            _dispatcher_task = None


def _trim_jobs() -> None:
    if len(_jobs) <= _MAX_KEEP:
        return
    finished = sorted(
        [j for j in _jobs.values() if j["status"] in ("success", "failed", "canceled")],
        key=lambda j: j.get("finished_at", 0),
    )
    for j in finished[: max(0, len(_jobs) - _MAX_KEEP)]:
        _jobs.pop(j["id"], None)


def enqueue(workflow: str, *, priority: int = 0, headless: bool = True, source_tag: str = "queue") -> dict[str, Any]:
    """把一个工作流加入运行队列。priority 越大越优先。返回 job 信息。"""
    job_id = f"job_{next(_seq)}_{int(time.time() * 1000) % 100000}"
    job = {
        "id": job_id,
        "workflow": workflow,
        "priority": int(priority or 0),
        "headless": bool(headless),
        "source_tag": source_tag,
        "status": "queued",
        "enqueued_at": time.time(),
        "started_at": None,
        "finished_at": None,
        "result": None,
        "error": None,
        "seq": next(_seq),
    }
    _jobs[job_id] = job
    _pending.append(job_id)
    _trim_jobs()
    _ensure_dispatcher()
    _kick()
    return {"job_id": job_id, "status": "queued", "position": len(_pending)}


def cancel(job_id: str) -> dict[str, Any]:
    job = _jobs.get(job_id)
    if not job:
        return {"success": False, "error": "job 不存在"}
    if job["status"] == "queued":
        job["status"] = "canceled"
        job["finished_at"] = time.time()
        if job_id in _pending:
            _pending.remove(job_id)
        return {"success": True, "canceled": True}
    return {"success": False, "error": f"job 当前状态为 {job['status']}，无法取消"}


def status(job_id: str) -> dict[str, Any]:
    job = _jobs.get(job_id)
    if not job:
        return {"error": "job 不存在"}
    return _public(job)


def _public(job: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": job["id"],
        "workflow": job["workflow"],
        "priority": job["priority"],
        "status": job["status"],
        "enqueued_at": job["enqueued_at"],
        "started_at": job["started_at"],
        "finished_at": job["finished_at"],
        "error": job["error"],
        "result_summary": (
            None if not job.get("result") else {
                "success": job["result"].get("success"),
                "status": job["result"].get("status"),
                "executed_nodes": job["result"].get("executed_nodes"),
                "failed_nodes": job["result"].get("failed_nodes"),
                "duration_ms": job["result"].get("duration_ms"),
            }
        ),
    }


def overview() -> dict[str, Any]:
    jobs = sorted(_jobs.values(), key=lambda j: -j.get("enqueued_at", 0))
    return {
        "max_concurrency": get_max_concurrency(),
        "queued": sum(1 for j in _jobs.values() if j["status"] == "queued"),
        "running": len(_active),
        "jobs": [_public(j) for j in jobs[:100]],
    }


async def _dispatcher_loop() -> None:
    wake = _get_wakeup()
    while True:
        try:
            max_c = get_max_concurrency()
            # 取出可执行的任务
            while _pending and len(_active) < max_c:
                # 按优先级高、入队早排序
                _pending.sort(key=lambda jid: (-_jobs[jid]["priority"], _jobs[jid]["enqueued_at"]))
                jid = _pending.pop(0)
                job = _jobs.get(jid)
                if not job or job["status"] != "queued":
                    continue
                _active.add(jid)
                asyncio.create_task(_run_job(jid))
            # 等待新任务或任务完成唤醒
            wake.clear()
            try:
                await asyncio.wait_for(wake.wait(), timeout=2.0)
            except asyncio.TimeoutError:
                pass
            # 没有任何待处理与运行中的任务时，退出调度器（下次入队会重启）
            if not _pending and not _active:
                return
        except Exception as e:
            print(f"[run_queue] 调度器异常: {e}")
            await asyncio.sleep(1)


async def _run_job(job_id: str) -> None:
    job = _jobs.get(job_id)
    if not job:
        _active.discard(job_id)
        return
    job["status"] = "running"
    job["started_at"] = time.time()
    try:
        from app.services.workflow_runner import run_workflow
        result = await run_workflow(job["workflow"], headless=job["headless"], source_tag=job["source_tag"])
        job["result"] = result
        job["status"] = "success" if result.get("success") else "failed"
        if not result.get("success"):
            job["error"] = result.get("error")
    except Exception as e:
        job["status"] = "failed"
        job["error"] = str(e)
    finally:
        job["finished_at"] = time.time()
        _active.discard(job_id)
        _kick()


def clear_finished() -> dict[str, Any]:
    removed = 0
    for jid in list(_jobs.keys()):
        if _jobs[jid]["status"] in ("success", "failed", "canceled"):
            _jobs.pop(jid, None)
            removed += 1
    return {"success": True, "removed": removed}
