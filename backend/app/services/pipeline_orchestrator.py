"""工作流编排 / DAG

把多条工作流串成业务流水线：每个步骤是一条工作流，步骤之间用 depends_on 声明依赖，
形成有向无环图（DAG）。执行时按拓扑顺序推进，无依赖关系的步骤自动并行，最后汇合。
步骤可把上游步骤的输出（结果变量）映射成自己的初始变量（input_map），实现 A 的产出喂给 B。

存储：backend/data/pipelines.json
执行底座：复用 workflow_runner.run_workflow（无头、带历史/告警/重试）。
"""

from __future__ import annotations

import asyncio
import json
import re
import threading
import time
import uuid
from pathlib import Path
from typing import Any
from app.utils.paths import BACKEND_DATA_DIR

_LOCK = threading.Lock()
_REF = re.compile(r"\{\{\s*([a-zA-Z0-9_\-]+)\.([a-zA-Z0-9_\-\[\]]+)\s*\}\}")


def _store_file() -> Path:
    folder = BACKEND_DATA_DIR
    folder.mkdir(parents=True, exist_ok=True)
    return folder / "pipelines.json"


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


# ---------- 管理 ----------

def list_pipelines() -> list[dict[str, Any]]:
    data = _load()
    out = []
    for pid, p in data.items():
        out.append({
            "id": pid,
            "name": p.get("name", ""),
            "steps": len(p.get("steps", [])),
            "created_at": p.get("created_at", ""),
        })
    out.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return out


def get_pipeline(pid: str) -> dict[str, Any] | None:
    return _load().get(pid)


def save_pipeline(pipeline: dict[str, Any]) -> dict[str, Any]:
    """新增或更新一个流水线。pipeline: {id?, name, steps:[{id,name,workflow,depends_on,input_map}]}。"""
    with _LOCK:
        data = _load()
        pid = pipeline.get("id") or uuid.uuid4().hex[:12]
        steps = pipeline.get("steps") or []
        # 为缺 id 的步骤补 id
        for i, s in enumerate(steps):
            if not s.get("id"):
                s["id"] = f"step{i + 1}"
        rec = {
            "id": pid,
            "name": pipeline.get("name") or "未命名流水线",
            "steps": steps,
            "created_at": data.get(pid, {}).get("created_at") or time.strftime("%Y-%m-%d %H:%M:%S"),
            "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        }
        # 校验 DAG（无环 + 依赖存在）
        err = _validate_dag(steps)
        if err:
            return {"error": err}
        data[pid] = rec
        _save(data)
    return {"success": True, "id": pid, "pipeline": rec}


def delete_pipeline(pid: str) -> dict[str, Any]:
    with _LOCK:
        data = _load()
        existed = pid in data
        data.pop(pid, None)
        _save(data)
    return {"success": existed}


def _validate_dag(steps: list[dict]) -> str:
    ids = {s.get("id") for s in steps}
    for s in steps:
        for dep in (s.get("depends_on") or []):
            if dep not in ids:
                return f"步骤 {s.get('id')} 依赖了不存在的步骤 {dep}"
    # 检测环（拓扑排序）
    indeg = {s["id"]: 0 for s in steps}
    adj: dict[str, list[str]] = {s["id"]: [] for s in steps}
    for s in steps:
        for dep in (s.get("depends_on") or []):
            adj[dep].append(s["id"])
            indeg[s["id"]] += 1
    queue = [k for k, v in indeg.items() if v == 0]
    seen = 0
    while queue:
        n = queue.pop()
        seen += 1
        for m in adj[n]:
            indeg[m] -= 1
            if indeg[m] == 0:
                queue.append(m)
    if seen != len(steps):
        return "流水线存在循环依赖（不是有向无环图）"
    return ""


# ---------- 执行 ----------

def _resolve_input_map(input_map: dict[str, Any], step_outputs: dict[str, dict]) -> dict[str, Any]:
    """把 input_map 里的 {{stepId.var}} 引用替换为上游步骤的结果变量值。"""
    resolved: dict[str, Any] = {}
    for k, v in (input_map or {}).items():
        if isinstance(v, str):
            m = _REF.fullmatch(v.strip())
            if m:
                sid, field = m.group(1), m.group(2)
                out = step_outputs.get(sid, {})
                if field == "data":
                    resolved[k] = out.get("collected_data", [])
                elif field in ("status", "success"):
                    resolved[k] = out.get(field)
                else:
                    resolved[k] = (out.get("variables") or {}).get(field)
                continue
            # 行内引用替换
            def _sub(mm):
                sid, field = mm.group(1), mm.group(2)
                out = step_outputs.get(sid, {})
                val = (out.get("variables") or {}).get(field)
                return "" if val is None else str(val)
            resolved[k] = _REF.sub(_sub, v)
        else:
            resolved[k] = v
    return resolved


async def run_pipeline(pid: str, *, stop_on_failure: bool = True) -> dict[str, Any]:
    """按 DAG 拓扑顺序执行流水线，无依赖步骤并行，上游输出喂下游。"""
    from app.services.workflow_runner import load_workflow_dict, run_workflow

    pipe = get_pipeline(pid)
    if not pipe:
        return {"error": f"流水线不存在：{pid}"}
    steps = pipe.get("steps") or []
    if not steps:
        return {"error": "流水线没有步骤"}

    by_id = {s["id"]: s for s in steps}
    indeg = {s["id"]: len(s.get("depends_on") or []) for s in steps}
    adj: dict[str, list[str]] = {s["id"]: [] for s in steps}
    for s in steps:
        for dep in (s.get("depends_on") or []):
            adj[dep].append(s["id"])

    step_outputs: dict[str, dict] = {}
    step_results: list[dict] = []
    done: set[str] = set()
    failed = False
    start_ts = time.time()

    async def _run_step(sid: str) -> dict:
        s = by_id[sid]
        try:
            wf = load_workflow_dict(s["workflow"])
        except Exception as e:
            return {"step_id": sid, "name": s.get("name", sid), "success": False, "error": f"加载失败：{e}"}
        wf = dict(wf)
        init_vars = _resolve_input_map(s.get("input_map") or {}, step_outputs)
        if init_vars:
            existing = list(wf.get("variables") or [])
            names = {v.get("name") for v in existing if isinstance(v, dict)}
            for k, v in init_vars.items():
                if k in names:
                    for ev in existing:
                        if isinstance(ev, dict) and ev.get("name") == k:
                            ev["value"] = v
                else:
                    existing.append({"name": k, "value": v, "type": "string"})
            wf["variables"] = existing
        res = await run_workflow(wf, headless=True, source_tag="pipeline")
        return {
            "step_id": sid,
            "name": s.get("name", sid),
            "success": res.get("success", False),
            "status": res.get("status"),
            "error": res.get("error"),
            "collected_data": res.get("collected_data", []),
            "variables": res.get("variables", {}),
        }

    # 拓扑分层执行：每一层内并行
    while len(done) < len(steps) and not (failed and stop_on_failure):
        ready = [sid for sid in by_id if sid not in done and indeg[sid] == 0]
        if not ready:
            break
        layer = await asyncio.gather(*[_run_step(sid) for sid in ready])
        for r in layer:
            sid = r["step_id"]
            done.add(sid)
            step_outputs[sid] = r
            step_results.append(r)
            if not r.get("success"):
                failed = True
            for m in adj[sid]:
                indeg[m] -= 1

    overall = "failed" if failed else ("success" if len(done) == len(steps) else "partial")
    return {
        "pipeline": pipe.get("name"),
        "pipeline_id": pid,
        "status": overall,
        "duration_ms": int((time.time() - start_ts) * 1000),
        "steps_total": len(steps),
        "steps_run": len(done),
        "results": step_results,
    }
