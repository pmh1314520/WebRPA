# -*- coding: utf-8 -*-
"""WebRPA 小助手 - v12 能力自省 Skills

让管家"知道自己能做什么"并讲给用户听：按领域归类列出全部技能，或按关键词搜索能力。
用户问"你能做什么""你会不会 X""有没有管理用户的功能"时，用它给出清晰、分门别类的能力清单，
帮助用户发现 WebRPA 小助手超出预期的综合能力。

不重复造轮子：本模块只读 registry，不新增与已有技能重名的能力。
"""
from __future__ import annotations

from typing import Any

from app.services.ai_assistant_skills import Skill, registry

# 能力领域归类：按技能名关键词归入领域（顺序即匹配优先级）
_CATEGORY_RULES: list[tuple[str, list[str]]] = [
    ("工作流搭建", ["build_workflow", "build_node", "add_nodes", "connect", "validate", "auto_fix",
                "analyze_variable", "describe_module", "search_modules", "get_module_schema",
                "list_module", "template", "subflow", "layout"]),
    ("工作流运行与调试", ["run_workflow", "self_heal", "dry_run", "probe_page", "client_action",
                  "execute", "stop"]),
    ("计划任务/自动化", ["scheduled_task", "schedule", "one_shot", "trigger"]),
    ("编排与队列", ["pipeline", "queue", "enqueue", "concurrency"]),
    ("测试与探针", ["workflow_tests", "health_probe", "test_"]),
    ("仪表盘与历史", ["dashboard", "execution_history", "list_execution", "query_runs"]),
    ("告警与通知", ["alert", "notify"]),
    ("发布与CLI", ["publish", "unpublish", "cli"]),
    ("联网与文档", ["web_search", "read_webpage", "research", "download_file", "read_document"]),
    ("知识库RAG", ["kb_"]),
    ("多Agent协作", ["multi_agent", "generate_workflow_doc"]),
    ("Computer-Use与视觉", ["computer_use", "capture_screen", "vision"]),
    ("文档智能IDP", ["idp_"]),
    ("流程挖掘", ["infer_workflow", "mine_process"]),
    ("集群控制中心", ["cluster", "node"]),
    ("用户与权限RBAC", ["user", "role", "rbac", "session", "enforcement"]),
    ("审批中心", ["approval"]),
    ("凭据保险库", ["credential", "vault"]),
    ("审计", ["audit"]),
    ("平台体检", ["health_check", "auto_inspect", "enterprise_overview"]),
    ("系统控制", ["screen", "volume", "brightness", "system", "macro", "mouse", "keyboard"]),
    ("插件中心", ["plugin"]),
    ("学习与记忆", ["learned_skill", "memory", "lesson", "user_profile", "task_plan"]),
    ("MCP扩展", ["mcp"]),
]


def _categorize(name: str) -> str:
    low = name.lower()
    for cat, kws in _CATEGORY_RULES:
        if any(k in low for k in kws):
            return cat
    return "其他"


async def skill_list_my_capabilities(category: str | None = None, **_: Any) -> dict[str, Any]:
    """按领域归类列出我的全部能力。传 category 只看某一领域；不传给出各领域概览。"""
    grouped: dict[str, list[dict[str, str]]] = {}
    for name in registry.names():
        skill = registry.get(name)
        if not skill:
            continue
        cat = _categorize(name)
        grouped.setdefault(cat, []).append({"name": name, "desc": (skill.description or "")[:80]})
    total = sum(len(v) for v in grouped.values())
    if category:
        items = grouped.get(category)
        if items is None:
            return {"error": f"没有「{category}」这个能力领域",
                    "available_categories": sorted(grouped.keys())}
        return {"category": category, "count": len(items), "skills": sorted(items, key=lambda x: x["name"])}
    # 概览：每个领域名 + 数量 + 前几个代表能力
    overview = []
    for cat in sorted(grouped.keys(), key=lambda c: -len(grouped[c])):
        sk = grouped[cat]
        overview.append({"category": cat, "count": len(sk),
                         "examples": [s["name"] for s in sk[:6]]})
    return {"total_skills": total, "categories": overview,
            "tip": "想看某领域全部能力，传 category 再调一次；想找具体功能用 search_my_capabilities。"}


async def skill_search_my_capabilities(keyword: str, **_: Any) -> dict[str, Any]:
    """按关键词搜索我的能力（匹配技能名或描述，中英文均可）。"""
    kw = (keyword or "").strip().lower()
    if not kw:
        return {"error": "关键词不能为空"}
    matches = []
    for name in registry.names():
        skill = registry.get(name)
        if not skill:
            continue
        if kw in name.lower() or kw in (skill.description or "").lower():
            matches.append({"name": name, "category": _categorize(name),
                            "desc": (skill.description or "")[:120],
                            "needs_approval": bool(skill.requires_approval)})
    return {"keyword": keyword, "count": len(matches), "matches": matches[:40]}


def _register_v12() -> None:
    registry.register(Skill(
        name="list_my_capabilities",
        description=(
            "列出我（WebRPA 小助手）的全部能力，按领域归类。用户问'你能做什么/你会不会X/有哪些功能'时调它。"
            "不传参数给各领域概览；传 category（如'用户与权限RBAC'）看该领域全部能力。"
        ),
        parameters={"type": "object", "properties": {"category": {"type": "string"}}},
        handler=skill_list_my_capabilities,
    ))
    registry.register(Skill(
        name="search_my_capabilities",
        description="按关键词搜索我的能力（匹配技能名/描述）。用户描述一个需求时，先用它确认我是否已有对应能力。",
        parameters={"type": "object", "properties": {"keyword": {"type": "string"}},
                    "required": ["keyword"]},
        handler=skill_search_my_capabilities,
    ))


_register_v12()
