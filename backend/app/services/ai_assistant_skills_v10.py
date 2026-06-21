# -*- coding: utf-8 -*-
"""WebRPA 小助手 - v10 企业级平台能力 Skills

把企业级平台能力暴露为 AI 技能，让 Agent 能直接：
- Computer-Use：说目标让 Agent 看屏幕自主操作任意软件
- 文档智能 IDP：抽取发票/合同/简历/表单结构化字段
- 流程反推：把录制事件反推为工作流；流程挖掘统计
- 控制中心：向集群派发任务、查看舰队总览
- 审计：检索审计日志、校验哈希链
- 凭据保险库：查看凭据 ACL（不返回明文）
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.services.ai_assistant_skills import Skill, registry


# ---------- Computer-Use ----------
async def skill_computer_use(goal: str, max_steps: int = 15, **_: Any) -> dict[str, Any]:
    """让 Agent 看屏幕并自主操作电脑完成目标（无需选择器）。返回完整动作历史。"""
    from app.services import computer_use_agent
    if not (goal or "").strip():
        return {"error": "goal 不能为空"}
    steps = max(1, min(int(max_steps or 15), 40))
    return await computer_use_agent.run_session(goal.strip(), max_steps=steps, actor="agent")


# ---------- 文档智能 IDP ----------
async def skill_idp_extract(file_path: str, doc_type: str = "form", **_: Any) -> dict[str, Any]:
    """对本地文档（图片/PDF）抽取结构化字段。doc_type: invoice/contract/resume/form 或自定义。"""
    from app.services import idp_service
    p = Path(file_path)
    if not p.exists() or not p.is_file():
        return {"error": f"文件不存在：{file_path}"}
    try:
        content = p.read_bytes()
    except Exception as e:
        return {"error": f"读取文件失败：{e}"}
    return await idp_service.extract(content, p.name, doc_type, actor="agent")


async def skill_idp_templates(**_: Any) -> dict[str, Any]:
    """列出 IDP 文档类型模板及其字段。"""
    from app.services import idp_service
    return {"templates": idp_service.list_templates()}


# ---------- 流程反推 + 挖掘 ----------
async def skill_infer_workflow(events: list, description: str = "", **_: Any) -> dict[str, Any]:
    """把一段录制操作事件反推成可执行工作流（已做节点校验）。"""
    from app.services import process_mining
    if not isinstance(events, list) or not events:
        return {"error": "events 必须是非空数组"}
    return await process_mining.infer_workflow(events, description=description, actor="agent")


async def skill_mine_process(records: list, **_: Any) -> dict[str, Any]:
    """对多条执行记录做流程挖掘：路径变体/瓶颈/转移频率/平均耗时。"""
    from app.services import process_mining
    if not isinstance(records, list) or not records:
        return {"error": "records 必须是非空数组"}
    return process_mining.mine(records)


# ---------- 控制中心 / 集群 ----------
async def skill_cluster_submit(workflow: str, tags: list | None = None,
                               capabilities: list | None = None,
                               max_failover: int = 2, **_: Any) -> dict[str, Any]:
    """向机器人集群派发一个工作流任务，按标签/能力路由到负载最低的在线节点，失败自动转移。"""
    from app.services import orchestrator
    constraints: dict[str, Any] = {}
    if tags:
        constraints["tags"] = tags
    if capabilities:
        constraints["capabilities"] = capabilities
    return orchestrator.submit_task(workflow, constraints=constraints,
                                    max_failover=max_failover, requester="agent")


async def skill_cluster_overview(**_: Any) -> dict[str, Any]:
    """查看机器人集群舰队总览：在线节点数、总容量、当前负载、任务统计。"""
    from app.services import orchestrator
    return {"overview": orchestrator.fleet_overview(), "nodes": orchestrator.list_nodes()}


async def skill_cluster_tasks(status: str | None = None, **_: Any) -> dict[str, Any]:
    """查看集群任务列表（可按状态过滤：pending/assigned/running/success/failed/queued）。"""
    from app.services import orchestrator
    return {"tasks": orchestrator.list_tasks(status, limit=50)}


# ---------- 审计 ----------
async def skill_audit_query(actor: str | None = None, action: str | None = None,
                            limit: int = 100, **_: Any) -> dict[str, Any]:
    """检索审计日志（可按操作者/动作过滤）。"""
    from app.services import audit_log
    return {"logs": audit_log.query(actor=actor, action=action, limit=limit),
            "stats": audit_log.stats()}


async def skill_audit_verify(**_: Any) -> dict[str, Any]:
    """校验审计日志哈希链完整性（检测是否被篡改）。"""
    from app.services import audit_log
    return audit_log.verify_chain()


# ---------- 凭据保险库 ----------
async def skill_vault_list(**_: Any) -> dict[str, Any]:
    """列出凭据保险库中各凭据的访问控制（允许的角色），绝不返回明文值。"""
    from app.services import credential_vault
    return {"acls": credential_vault.list_acls()}


def _register_v10() -> None:
    registry.register(Skill(
        name="computer_use",
        description=("计算机使用 Agent：给一个目标，让 AI 看屏幕截图并自主规划+真实操作鼠标键盘完成任务，"
                     "无需预先配置选择器。适合操作没有现成模块的任意桌面软件。需配置支持视觉的多模态模型。"),
        parameters={
            "type": "object",
            "properties": {
                "goal": {"type": "string", "description": "要完成的目标，越具体越好"},
                "max_steps": {"type": "integer", "default": 15, "description": "最大步数 1-40"},
            },
            "required": ["goal"],
        },
        handler=skill_computer_use,
        requires_approval=True,
    ))
    registry.register(Skill(
        name="idp_extract",
        description="文档智能抽取：对本地发票/合同/简历/表单文档（图片或PDF）抽取结构化字段+置信度+校验。",
        parameters={
            "type": "object",
            "properties": {
                "file_path": {"type": "string", "description": "本地文档路径"},
                "doc_type": {"type": "string", "default": "form",
                             "description": "invoice/contract/resume/form 或自定义模板 key"},
            },
            "required": ["file_path"],
        },
        handler=skill_idp_extract,
    ))
    registry.register(Skill(
        name="idp_templates",
        description="列出文档智能 IDP 的所有文档类型模板及字段定义。",
        parameters={"type": "object", "properties": {}},
        handler=skill_idp_templates,
    ))
    registry.register(Skill(
        name="infer_workflow_from_events",
        description=("把一段录制的操作事件序列反推成可执行的 WebRPA 工作流（含节点校验）。"
                     "events 形如 [{type,target,value,url,...}]。"),
        parameters={
            "type": "object",
            "properties": {
                "events": {"type": "array", "description": "录制事件数组"},
                "description": {"type": "string", "description": "流程说明（可选）"},
            },
            "required": ["events"],
        },
        handler=skill_infer_workflow,
    ))
    registry.register(Skill(
        name="mine_process",
        description=("流程挖掘：对多条执行记录统计路径变体、瓶颈步骤、转移频率、平均耗时。"
                     "records 可为 [{trace_id,steps:[{name,duration_ms,status}]}] 或扁平 [{trace_id,step,duration_ms,status,ts}]。"),
        parameters={
            "type": "object",
            "properties": {"records": {"type": "array"}},
            "required": ["records"],
        },
        handler=skill_mine_process,
    ))
    registry.register(Skill(
        name="cluster_submit_task",
        description=("向机器人集群派发一个工作流任务，按 tags/capabilities 路由到负载最低的在线执行机，"
                     "失败自动转移到其他节点。workflow 传工作流文件名。"),
        parameters={
            "type": "object",
            "properties": {
                "workflow": {"type": "string"},
                "tags": {"type": "array", "items": {"type": "string"}},
                "capabilities": {"type": "array", "items": {"type": "string"}},
                "max_failover": {"type": "integer", "default": 2},
            },
            "required": ["workflow"],
        },
        handler=skill_cluster_submit,
    ))
    registry.register(Skill(
        name="cluster_overview",
        description="查看机器人集群舰队总览：在线节点、容量、负载、任务统计。",
        parameters={"type": "object", "properties": {}},
        handler=skill_cluster_overview,
    ))
    registry.register(Skill(
        name="cluster_tasks",
        description="查看集群任务列表，可按状态过滤。",
        parameters={
            "type": "object",
            "properties": {"status": {"type": "string"}},
        },
        handler=skill_cluster_tasks,
    ))
    registry.register(Skill(
        name="audit_query",
        description="检索审计日志（可按操作者 actor、动作 action 过滤）并返回统计。",
        parameters={
            "type": "object",
            "properties": {
                "actor": {"type": "string"},
                "action": {"type": "string"},
                "limit": {"type": "integer", "default": 100},
            },
        },
        handler=skill_audit_query,
    ))
    registry.register(Skill(
        name="audit_verify_chain",
        description="校验审计日志哈希链完整性，检测历史是否被篡改。",
        parameters={"type": "object", "properties": {}},
        handler=skill_audit_verify,
    ))
    registry.register(Skill(
        name="vault_list_acl",
        description="列出凭据保险库各凭据的访问角色 ACL（绝不返回明文）。",
        parameters={"type": "object", "properties": {}},
        handler=skill_vault_list,
    ))


_register_v10()
