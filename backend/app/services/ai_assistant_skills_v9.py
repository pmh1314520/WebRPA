"""WebRPA 小助手 - v9 编排 / 多 Agent / 自动文档 Skills

把本轮新增的"平台级"能力暴露为 AI 技能，让 Agent 能直接：
- 工作流编排 / DAG：创建/运行/列出流水线
- 运行队列：入队、查队列、调并发
- 工作流单测/回归：写用例、跑回归
- 健康探针：建探针、立即探活
- 多 Agent 协作：规划者拆任务 → 多个子 Agent 并行执行 → 汇总
- AI 自动写工作流文档/注释
"""

from __future__ import annotations

import json
from typing import Any

from app.services.ai_assistant_skills import Skill, registry


# ---------- 读取共享 AI 配置，构造后端 LLM 调用配置 ----------

def _build_llm_config():
    """从编辑器推送到后端的共享配置构造 AssistantConfig（供后端自调用 LLM）。"""
    from app.models.ai_assistant import AssistantConfig
    cfg: dict[str, Any] = {}
    try:
        from app.services.ai_assistant_skills import _get_data_folder  # type: ignore
        p = _get_data_folder() / "ai_assistant" / "shared_config.json"
        if p.exists():
            raw = json.loads(p.read_text(encoding="utf-8"))
            cfg = raw.get("config", raw) if isinstance(raw, dict) else {}
    except Exception:
        cfg = {}
    a = (cfg.get("aiAssistant") or {})
    b = (cfg.get("ai") or {})
    api_url = (a.get("apiUrl") or b.get("apiUrl") or "").strip()
    api_key = (a.get("apiKey") or b.get("apiKey") or "").strip()
    model = (a.get("model") or b.get("model") or "").strip()
    if not api_url or not model:
        return None
    return AssistantConfig(
        api_url=api_url, api_key=api_key, model=model,
        temperature=0.4, max_tokens=4000, enable_tools=False,
    )


async def _llm_text(system: str, user: str) -> str:
    """一次纯文本 LLM 调用（不带工具），返回助手文本。失败抛异常。"""
    from app.services.ai_assistant_service import _call_llm, _parse_assistant_response
    config = _build_llm_config()
    if config is None:
        raise RuntimeError("未配置可用的 AI 模型（请先在全局配置填好小助手的 API/模型）")
    messages = [{"role": "system", "content": system}, {"role": "user", "content": user}]
    raw = await _call_llm(config=config, messages=messages, tools=None, on_event=None)
    content, _tc, _rc = _parse_assistant_response(raw)
    return content or ""


def _extract_json(text: str) -> Any:
    """从 LLM 文本中尽量解析出 JSON（容忍 ```json 包裹）。"""
    t = (text or "").strip()
    if "```" in t:
        import re
        m = re.search(r"```(?:json)?\s*(.+?)```", t, re.DOTALL)
        if m:
            t = m.group(1).strip()
    try:
        return json.loads(t)
    except Exception:
        # 尝试截取第一个 [ 或 { 到最后
        for lb, rb in (("[", "]"), ("{", "}")):
            i, j = t.find(lb), t.rfind(rb)
            if i != -1 and j != -1 and j > i:
                try:
                    return json.loads(t[i:j + 1])
                except Exception:
                    continue
    return None


# ---------- 多 Agent 协作 ----------

async def skill_multi_agent_task(task: str, max_subtasks: int = 4, **_: Any) -> dict[str, Any]:
    """多 Agent 协作：规划者把任务拆成若干子任务 → 每个子任务交给独立子 Agent（带工具）执行 → 汇总。

    适合复杂长任务（既要查资料又要操作又要产出）。返回 规划 + 各子任务结果 + 最终汇总。
    """
    t = (task or "").strip()
    if not t:
        return {"error": "task 不能为空"}
    n = max(2, min(int(max_subtasks or 4), 6))

    # 1) 规划
    plan_sys = (
        "你是任务规划者。把用户的大任务拆成相互独立、可并行的子任务（2-{n} 个），"
        "每个子任务要具体、可独立完成。只输出 JSON 数组，每项形如 "
        '{{"title":"子任务标题","instruction":"给执行子Agent的明确指令"}}，不要任何额外文字。'
    ).format(n=n)
    try:
        plan_text = await _llm_text(plan_sys, f"大任务：{t}")
    except Exception as e:
        return {"error": f"规划失败：{e}"}
    subtasks = _extract_json(plan_text)
    if not isinstance(subtasks, list) or not subtasks:
        return {"error": "规划结果无法解析为子任务列表", "raw_plan": plan_text}
    subtasks = subtasks[:n]

    # 2) 执行：每个子任务一个独立子 Agent（chat_once，带工具）
    import asyncio as _asyncio
    import uuid as _uuid
    from app.services.ai_assistant_service import chat_once
    from app.models.ai_assistant import ChatSession, MessageRole

    config = _build_llm_config()
    if config is None:
        return {"error": "未配置可用的 AI 模型"}
    config = config.model_copy(update={"enable_tools": True, "agent_mode": True})

    async def _run_sub(st: dict) -> dict:
        instr = st.get("instruction") or st.get("title") or ""
        session = ChatSession(id="subagent_" + _uuid.uuid4().hex[:10], title=st.get("title", "子任务"))
        try:
            session = await chat_once(session=session, user_message_text=instr, config=config)
            # 取最后一条助手文本
            final = ""
            for m in reversed(session.messages):
                if m.role == MessageRole.ASSISTANT and not m.tool_calls and m.content:
                    final = m.content
                    break
            return {"title": st.get("title", ""), "result": final[:4000]}
        except Exception as e:
            return {"title": st.get("title", ""), "error": str(e)}

    # 串行执行（避免并发多个带工具子 Agent 抢占浏览器/资源；逐个稳妥）
    sub_results = []
    for st in subtasks:
        sub_results.append(await _run_sub(st))

    # 3) 汇总
    agg_sys = "你是汇总者。基于各子任务的执行结果，给用户一份完整、连贯的最终答复。"
    agg_user = f"原始任务：{t}\n\n各子任务结果：\n" + json.dumps(sub_results, ensure_ascii=False, indent=2)
    try:
        summary = await _llm_text(agg_sys, agg_user)
    except Exception as e:
        summary = f"（汇总失败：{e}）"

    return {
        "task": t,
        "subtasks": [s.get("title") for s in subtasks],
        "sub_results": sub_results,
        "summary": summary,
    }


# ---------- AI 自动写工作流文档 / 注释 ----------

def _summarize_workflow_struct(wf: dict) -> str:
    nodes = wf.get("nodes") or []
    edges = wf.get("edges") or []
    lines = [f"工作流名称：{wf.get('name', '（未命名）')}", f"节点数：{len(nodes)}，连线数：{len(edges)}", "节点清单："]
    for nd in nodes[:80]:
        ntype = nd.get("type") or (nd.get("data") or {}).get("moduleType") or "?"
        data = nd.get("data") or {}
        name = data.get("name") or data.get("label") or ""
        keys = [f"{k}={str(v)[:40]}" for k, v in data.items()
                if k not in ("label", "moduleType", "name", "remark") and v not in (None, "", [])][:4]
        lines.append(f"- [{nd.get('id','?')}] {ntype} {('（'+name+'）') if name else ''} {('; '.join(keys)) if keys else ''}")
    return "\n".join(lines)


async def skill_generate_workflow_doc(workflow: str | dict, **_: Any) -> dict[str, Any]:
    """让 AI 给一条工作流自动生成说明文档（Markdown）：用途、步骤拆解、输入输出、注意事项，便于交接。"""
    from app.services.workflow_runner import load_workflow_dict
    try:
        wf = load_workflow_dict(workflow) if not isinstance(workflow, dict) else workflow
    except Exception as e:
        return {"error": f"无法加载工作流：{e}"}
    struct = _summarize_workflow_struct(wf)
    sys = (
        "你是 RPA 文档专家。基于给定的工作流结构，用简洁专业的 Markdown 写一份说明文档，包含："
        "## 用途、## 触发方式（若有）、## 步骤拆解（按执行顺序逐步说明每个节点做什么）、"
        "## 输入与输出（涉及的变量）、## 注意事项。只输出 Markdown，不要寒暄。"
    )
    try:
        doc = await _llm_text(sys, struct)
    except Exception as e:
        return {"error": f"生成失败：{e}"}
    return {"workflow": wf.get("name", ""), "doc_markdown": doc}


# ---------- 注册 ----------

def _register_v9() -> None:
    registry.register(Skill(
        name="multi_agent_task",
        description=(
            "多 Agent 协作：把一个复杂大任务拆成多个子任务，每个交给独立子 Agent（带工具）执行，最后汇总成完整答复。"
            "适合既要查资料又要操作、步骤多的长任务。返回 规划/各子结果/最终汇总。"
        ),
        parameters={
            "type": "object",
            "properties": {
                "task": {"type": "string", "description": "要完成的大任务"},
                "max_subtasks": {"type": "integer", "default": 4, "description": "拆分子任务数上限（2-6）"},
            },
            "required": ["task"],
        },
        handler=skill_multi_agent_task,
    ))
    registry.register(Skill(
        name="generate_workflow_doc",
        description="给一条工作流自动生成 Markdown 说明文档（用途/步骤/输入输出/注意事项），便于交接归档。workflow 传本地工作流文件名。",
        parameters={
            "type": "object",
            "properties": {"workflow": {"type": "string", "description": "本地工作流文件名或路径"}},
            "required": ["workflow"],
        },
        handler=skill_generate_workflow_doc,
    ))

    # ---- 工作流编排 / DAG ----
    async def _pipe_list(**_: Any):
        from app.services import pipeline_orchestrator as p
        return {"pipelines": p.list_pipelines()}

    async def _pipe_save(pipeline: dict, **_: Any):
        from app.services import pipeline_orchestrator as p
        return p.save_pipeline(pipeline or {})

    async def _pipe_run(pipeline_id: str, stop_on_failure: bool = True, **_: Any):
        from app.services import pipeline_orchestrator as p
        return await p.run_pipeline(pipeline_id, stop_on_failure=stop_on_failure)

    registry.register(Skill(
        name="list_pipelines",
        description="列出所有工作流流水线（DAG 编排）。",
        parameters={"type": "object", "properties": {}},
        handler=_pipe_list,
    ))
    registry.register(Skill(
        name="save_pipeline",
        description=(
            "创建/更新一条工作流流水线（DAG）。pipeline 形如 "
            '{name, steps:[{id,name,workflow,depends_on:[上游step的id...],input_map:{初始变量名:"{{上游stepId.结果变量名}}"}}]}。'
            "无依赖的步骤会并行，depends_on 声明依赖，input_map 把上游产出喂给下游。"
        ),
        parameters={"type": "object", "properties": {"pipeline": {"type": "object"}}, "required": ["pipeline"]},
        handler=_pipe_save,
    ))
    registry.register(Skill(
        name="run_pipeline",
        description="按 DAG 拓扑顺序执行一条流水线（无依赖步骤并行，上游输出喂下游）。pipeline_id 传 save_pipeline 返回的 id。",
        parameters={
            "type": "object",
            "properties": {
                "pipeline_id": {"type": "string"},
                "stop_on_failure": {"type": "boolean", "default": True},
            },
            "required": ["pipeline_id"],
        },
        handler=_pipe_run,
    ))

    # ---- 运行队列 ----
    async def _q_enqueue(workflow: str, priority: int = 0, headless: bool = True, **_: Any):
        from app.services import run_queue as q
        return q.enqueue(workflow, priority=priority, headless=headless)

    async def _q_overview(**_: Any):
        from app.services import run_queue as q
        return q.overview()

    async def _q_concurrency(max_concurrency: int, **_: Any):
        from app.services import run_queue as q
        return q.set_max_concurrency(max_concurrency)

    registry.register(Skill(
        name="enqueue_workflow",
        description="把工作流加入运行队列（受最大并发限制依次执行，priority 越大越优先）。适合大批量任务排队跑。",
        parameters={
            "type": "object",
            "properties": {
                "workflow": {"type": "string", "description": "本地工作流文件名"},
                "priority": {"type": "integer", "default": 0},
                "headless": {"type": "boolean", "default": True},
            },
            "required": ["workflow"],
        },
        handler=_q_enqueue,
    ))
    registry.register(Skill(
        name="get_run_queue",
        description="查看运行队列总览（最大并发、排队中/运行中数量、各任务状态）。",
        parameters={"type": "object", "properties": {}},
        handler=_q_overview,
    ))
    registry.register(Skill(
        name="set_queue_concurrency",
        description="设置运行队列最大并发数（1-32）。",
        parameters={"type": "object", "properties": {"max_concurrency": {"type": "integer"}}, "required": ["max_concurrency"]},
        handler=_q_concurrency,
    ))

    # ---- 工作流单测 / 回归 ----
    async def _t_save(workflow: str, cases: list, **_: Any):
        from app.services import workflow_tests as wt
        return wt.save_suite(workflow, cases)

    async def _t_run(workflow: str, **_: Any):
        from app.services import workflow_tests as wt
        return await wt.run_suite(workflow)

    async def _t_run_all(**_: Any):
        from app.services import workflow_tests as wt
        return await wt.run_all_suites()

    registry.register(Skill(
        name="save_workflow_tests",
        description=(
            "给工作流写测试用例（回归）。cases 形如 [{name, inputs:{变量:值}, "
            'asserts:[{field:"status|variable|data_count|data_contains", name?, op:"==|>=|>|contains...", value}]}]。'
        ),
        parameters={
            "type": "object",
            "properties": {"workflow": {"type": "string"}, "cases": {"type": "array"}},
            "required": ["workflow", "cases"],
        },
        handler=_t_save,
    ))
    registry.register(Skill(
        name="run_workflow_tests",
        description="运行某工作流的全部测试用例，返回逐用例通过/失败与断言明细。",
        parameters={"type": "object", "properties": {"workflow": {"type": "string"}}, "required": ["workflow"]},
        handler=_t_run,
    ))
    registry.register(Skill(
        name="run_all_workflow_tests",
        description="全量回归：运行所有工作流的全部测试用例。",
        parameters={"type": "object", "properties": {}},
        handler=_t_run_all,
    ))

    # ---- 健康探针 ----
    async def _probe_save(name: str, workflow: str, interval_sec: int = 300, enabled: bool = True, **_: Any):
        from app.services import health_probes as hp
        return hp.save_probe({"name": name, "workflow": workflow, "interval_sec": interval_sec, "enabled": enabled})

    async def _probe_list(**_: Any):
        from app.services import health_probes as hp
        return hp.list_probes()

    async def _probe_run(probe_id: str, **_: Any):
        from app.services import health_probes as hp
        return await hp.run_probe_now(probe_id)

    registry.register(Skill(
        name="create_health_probe",
        description="创建健康探针：定时跑一条探活工作流，失败自动走告警中心。interval_sec 最小 30 秒。",
        parameters={
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "workflow": {"type": "string", "description": "探活工作流文件名"},
                "interval_sec": {"type": "integer", "default": 300},
                "enabled": {"type": "boolean", "default": True},
            },
            "required": ["name", "workflow"],
        },
        handler=_probe_save,
    ))
    registry.register(Skill(
        name="list_health_probes",
        description="列出所有健康探针及其最近状态。",
        parameters={"type": "object", "properties": {}},
        handler=_probe_list,
    ))
    registry.register(Skill(
        name="run_health_probe",
        description="立即手动跑一次指定健康探针。probe_id 传 list_health_probes 里的 id。",
        parameters={"type": "object", "properties": {"probe_id": {"type": "string"}}, "required": ["probe_id"]},
        handler=_probe_run,
    ))


_register_v9()
