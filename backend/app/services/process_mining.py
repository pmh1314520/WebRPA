# -*- coding: utf-8 -*-
"""流程录制 → AI 反推工作流 + 流程挖掘

- infer_workflow(events)：把一段录制事件序列交给 LLM 反推成 WebRPA 节点 + 连线工作流，
  并用现有节点校验（合法 module_type、必填字段）保证可执行。
- mine(records)：对多条执行历史做流程挖掘统计（路径频率、瓶颈步骤、变体、平均耗时）。
"""
from __future__ import annotations

import uuid
from collections import Counter, defaultdict
from typing import Any, Optional


def _make_id() -> str:
    return uuid.uuid4().hex[:10]


async def infer_workflow(events: list[dict[str, Any]], *,
                         description: str = "", actor: str = "system") -> dict[str, Any]:
    """根据录制事件反推工作流。events 形如 [{type, target, value, url, ...}, ...]。"""
    from app.services import enterprise_llm
    if enterprise_llm.build_llm_config(vision=False) is None:
        return {"success": False,
                "error": "未配置 AI 模型，无法反推工作流（请在全局配置填写模型 API）"}
    if not events:
        return {"success": False, "error": "录制事件为空"}

    # 取已知模块类型清单，约束 LLM 只用真实模块
    try:
        from app.services.ai_assistant_knowledge import get_all_known_module_types
        known_types = sorted(get_all_known_module_types())
    except Exception:
        known_types = []

    type_hint = ""
    if known_types:
        # 只给常用的一批，避免提示词过长
        common = [t for t in known_types if any(
            kw in t for kw in ("click", "input", "open", "navigate", "wait", "extract",
                               "get_text", "loop", "condition", "set_variable", "keyboard",
                               "scroll", "screenshot", "http", "print"))]
        type_hint = "可用的常见模块类型（必须从中选）：" + ", ".join(common[:60])

    import json as _json
    events_text = _json.dumps(events[:200], ensure_ascii=False)
    system = (
        "你是 WebRPA 工作流生成引擎。根据用户的浏览器/桌面操作录制事件，反推出一条可执行的工作流。"
        "只输出一个 JSON 对象，结构为 {\"name\":..., \"nodes\":[{\"id\":..,\"type\":..,\"data\":{...}}], "
        "\"edges\":[{\"source\":..,\"target\":..}]}。"
        "type 必须是真实存在的 WebRPA 模块类型，data 里放该模块所需配置。不要输出多余文字。"
    )
    user = (
        (f"流程说明：{description}\n" if description else "")
        + f"{type_hint}\n\n录制事件序列：\n{events_text}\n\n"
        "请反推为顺序连接的工作流（按事件先后用 edges 串联）。"
    )
    try:
        reply = await enterprise_llm.text_chat(system, user, temperature=0.1)
    except Exception as e:
        return {"success": False, "error": f"模型调用失败：{e}"}

    wf = enterprise_llm.extract_json(reply)
    if not isinstance(wf, dict) or not isinstance(wf.get("nodes"), list):
        return {"success": False, "error": "模型未返回有效工作流结构", "raw": reply[:300]}

    nodes = wf.get("nodes") or []
    edges = wf.get("edges") or []

    # 给缺 id 的节点补 id，并修正 edges 引用
    for n in nodes:
        if not n.get("id"):
            n["id"] = _make_id()
        # 兼容 data.moduleType
        if not n.get("type") and isinstance(n.get("data"), dict):
            n["type"] = n["data"].get("moduleType")

    # 用现有校验器做静态校验
    validation = None
    try:
        from app.services.ai_assistant_skills import skill_validate_workflow_nodes
        validation = await skill_validate_workflow_nodes(nodes=nodes, edges=edges)
    except Exception as e:
        validation = {"valid": None, "error": str(e)}

    try:
        from app.services import audit_log
        audit_log.record(actor, "process_mining.use", "infer_workflow",
                         detail={"events": len(events), "nodes": len(nodes)})
    except Exception:
        pass

    return {
        "success": True,
        "workflow": {"name": wf.get("name", "反推工作流"), "nodes": nodes, "edges": edges},
        "validation": validation,
        "node_count": len(nodes),
    }


def mine(records: list[dict[str, Any]]) -> dict[str, Any]:
    """流程挖掘：对多条执行记录统计路径频率、瓶颈、变体、平均耗时。

    records 形如 [{trace_id, steps:[{name, duration_ms, status}], ...}, ...]
    或扁平的 [{trace_id, step, duration_ms, status, ts}]（自动按 trace_id 聚合）。
    """
    if not records:
        return {"success": False, "error": "没有可分析的执行记录"}

    # 聚合成 trace -> [steps]
    traces: dict[str, list[dict[str, Any]]] = defaultdict(list)
    if records and "steps" in records[0]:
        for r in records:
            tid = r.get("trace_id") or _make_id()
            for s in r.get("steps", []):
                traces[tid].append(s)
    else:
        # 扁平结构，按 ts 顺序
        flat = sorted(records, key=lambda x: (x.get("trace_id", ""), x.get("ts", 0)))
        for r in flat:
            tid = r.get("trace_id") or "default"
            traces[tid].append({"name": r.get("step") or r.get("name", "?"),
                                "duration_ms": r.get("duration_ms", 0),
                                "status": r.get("status", "")})

    if not traces:
        return {"success": False, "error": "无法聚合出有效流程轨迹"}

    # 变体（不同路径）频率
    variant_counter: Counter = Counter()
    step_durations: dict[str, list[float]] = defaultdict(list)
    transition_counter: Counter = Counter()
    failed_steps: Counter = Counter()

    for steps in traces.values():
        path = tuple(s.get("name", "?") for s in steps)
        variant_counter[path] += 1
        for i, s in enumerate(steps):
            name = s.get("name", "?")
            dur = float(s.get("duration_ms", 0) or 0)
            step_durations[name].append(dur)
            if s.get("status") in ("failed", "error"):
                failed_steps[name] += 1
            if i + 1 < len(steps):
                transition_counter[(name, steps[i + 1].get("name", "?"))] += 1

    # 瓶颈：平均耗时最高的步骤
    avg_durations = {
        name: round(sum(ds) / len(ds), 1) for name, ds in step_durations.items() if ds
    }
    bottlenecks = sorted(avg_durations.items(), key=lambda x: -x[1])[:5]

    variants = [
        {"path": list(path), "count": cnt}
        for path, cnt in variant_counter.most_common(10)
    ]
    transitions = [
        {"from": a, "to": b, "count": c}
        for (a, b), c in transition_counter.most_common(20)
    ]

    total_traces = len(traces)
    return {
        "success": True,
        "total_traces": total_traces,
        "total_steps": sum(len(s) for s in traces.values()),
        "variants": variants,
        "variant_count": len(variant_counter),
        "transitions": transitions,
        "bottlenecks": [{"step": n, "avg_duration_ms": d} for n, d in bottlenecks],
        "avg_durations": avg_durations,
        "failed_steps": [{"step": n, "failures": c} for n, c in failed_steps.most_common(10)],
    }
