"""健康探针

定时跑一条"探活"工作流，挂了直接走告警中心，主动发现线上问题（而不是等用户报障）。
每个探针 = 一条工作流 + 检查间隔；后台循环按间隔运行，失败时通过 alert_center 推送告警。

存储：backend/data/health_probes.json
"""

from __future__ import annotations

import asyncio
import json
import threading
import time
import uuid
from pathlib import Path
from typing import Any

_LOCK = threading.Lock()
_loop_task: asyncio.Task | None = None
# 持有正在运行的探针任务引用，避免 fire-and-forget 任务被 GC 提前回收导致探活丢失
_probe_tasks: set = set()


def _store_file() -> Path:
    folder = Path("backend/data")
    folder.mkdir(parents=True, exist_ok=True)
    return folder / "health_probes.json"


def _load() -> dict[str, Any]:
    f = _store_file()
    if not f.exists():
        return {}
    try:
        return json.loads(f.read_text(encoding="utf-8")) or {}
    except Exception:
        return {}


def _save(data: dict[str, Any]) -> None:
    _store_file().write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def list_probes() -> dict[str, Any]:
    data = _load()
    return {"probes": [
        {"id": k, "name": v.get("name"), "workflow": v.get("workflow"),
         "interval_sec": v.get("interval_sec"), "enabled": v.get("enabled", True),
         "last_run": v.get("last_run", ""), "last_status": v.get("last_status", ""),
         "consecutive_failures": v.get("consecutive_failures", 0)}
        for k, v in data.items()
    ]}


def save_probe(probe: dict[str, Any]) -> dict[str, Any]:
    """新增/更新探针。probe: {id?, name, workflow, interval_sec, enabled}。"""
    if not probe.get("workflow"):
        return {"error": "缺少 workflow"}
    with _LOCK:
        data = _load()
        pid = probe.get("id") or uuid.uuid4().hex[:12]
        rec = data.get(pid, {})
        rec.update({
            "id": pid,
            "name": probe.get("name") or probe.get("workflow"),
            "workflow": probe["workflow"],
            "interval_sec": max(30, int(probe.get("interval_sec", 300) or 300)),
            "enabled": bool(probe.get("enabled", True)),
        })
        rec.setdefault("last_run", "")
        rec.setdefault("last_status", "")
        rec.setdefault("consecutive_failures", 0)
        rec.setdefault("_next_due", 0)
        data[pid] = rec
        _save(data)
    return {"success": True, "id": pid}


def delete_probe(pid: str) -> dict[str, Any]:
    with _LOCK:
        data = _load()
        existed = pid in data
        data.pop(pid, None)
        _save(data)
    return {"success": existed}


async def _run_probe(pid: str, rec: dict) -> None:
    from app.services.workflow_runner import run_workflow
    from app.services.alert_center import dispatch_alert
    try:
        res = await run_workflow(rec["workflow"], headless=True, source_tag="probe", apply_retry=False, record=True)
        ok = res.get("success")
    except Exception as e:
        res = {"success": False, "error": str(e), "status": "failed"}
        ok = False

    with _LOCK:
        data = _load()
        if pid not in data:
            return
        data[pid]["last_run"] = time.strftime("%Y-%m-%d %H:%M:%S")
        data[pid]["last_status"] = "success" if ok else "failed"
        if ok:
            data[pid]["consecutive_failures"] = 0
        else:
            data[pid]["consecutive_failures"] = data[pid].get("consecutive_failures", 0) + 1
        cf = data[pid]["consecutive_failures"]
        _save(data)

    if not ok:
        try:
            dispatch_alert({
                "workflow_name": f"[健康探针] {rec.get('name')}",
                "status": "failed",
                "source": "probe",
                "error": (res.get("error") or "探针工作流执行失败") + f"（连续失败 {cf} 次）",
                "executed_nodes": res.get("executed_nodes", 0),
                "failed_nodes": res.get("failed_nodes", 0),
                "ts": time.strftime("%Y-%m-%d %H:%M:%S"),
            })
        except Exception as e:
            print(f"[health_probes] 告警发送失败: {e}")


async def _loop():
    """后台循环：每 15 秒检查一次到期的探针并运行。"""
    print("[health_probes] 健康探针循环已启动")
    while True:
        try:
            now = time.time()
            data = _load()
            due = []
            changed = False
            for pid, rec in data.items():
                if not rec.get("enabled", True):
                    continue
                nxt = rec.get("_next_due", 0)
                if now >= nxt:
                    due.append((pid, dict(rec)))
                    rec["_next_due"] = now + rec.get("interval_sec", 300)
                    changed = True
            if changed:
                with _LOCK:
                    cur = _load()
                    for pid, _ in due:
                        if pid in cur:
                            cur[pid]["_next_due"] = data[pid]["_next_due"]
                    _save(cur)
            for pid, rec in due:
                _pt = asyncio.create_task(_run_probe(pid, rec))
                _probe_tasks.add(_pt)
                _pt.add_done_callback(_probe_tasks.discard)
        except Exception as e:
            print(f"[health_probes] 循环异常: {e}")
        await asyncio.sleep(15)


def start_probe_loop() -> None:
    """在 FastAPI 启动时调用，启动后台探针循环（幂等）。"""
    global _loop_task
    if _loop_task and not _loop_task.done():
        return
    try:
        _loop_task = asyncio.create_task(_loop())
    except RuntimeError:
        # 没有运行中的事件循环（极少数情况），忽略
        pass


def set_enabled(pid: str, enabled: bool) -> dict[str, Any]:
    """启用/停用某个探针。"""
    with _LOCK:
        data = _load()
        if pid not in data:
            return {"success": False, "error": "探针不存在"}
        data[pid]["enabled"] = bool(enabled)
        _save(data)
    return {"success": True, "id": pid, "enabled": bool(enabled)}


async def run_probe_now(pid: str) -> dict[str, Any]:
    """立即手动运行一次指定探针（失败同样走告警）。"""
    data = _load()
    rec = data.get(pid)
    if not rec:
        return {"error": "探针不存在"}
    await _run_probe(pid, dict(rec))
    return {"success": True, "id": pid, "last_status": _load().get(pid, {}).get("last_status", "")}
