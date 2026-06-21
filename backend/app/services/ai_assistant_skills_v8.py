"""WebRPA 小助手 - v8 失败自愈闭环 Skills

把"运行失败 → 自动诊断 → 修复 → 重跑 → 验证"做成一个全自动闭环技能：
- 加载工作流 → 静态校验 + 按 schema 自动补齐缺失配置 → 无头运行
- 失败则收集错误/失败节点，再次校验+修复后重跑，直到成功或达到上限
- 无法自动修复（如运行时网络/选择器错误）时，返回结构化诊断 + 修复建议，交给 AI/用户决策

这是真正的闭环：每轮都真实执行工作流并记录历史，不是纸面分析。
"""

from __future__ import annotations

from typing import Any

from app.services.ai_assistant_skills import (
    Skill,
    registry,
    skill_validate_workflow_nodes,
    skill_auto_fix_workflow_nodes,
)


def _apply_patches(nodes: list[dict], patches: list[dict]) -> int:
    """把 auto_fix 的 patch 应用到节点 data 上，返回实际改动的字段数。"""
    by_id = {n.get("id"): n for n in nodes if isinstance(n, dict)}
    changed = 0
    for p in patches or []:
        nid = p.get("node_id")
        patch = p.get("patch") or {}
        node = by_id.get(nid)
        if not node:
            continue
        data = node.setdefault("data", {})
        if not isinstance(data, dict):
            continue
        for k, v in patch.items():
            if data.get(k) in (None, "", []):
                data[k] = v
                changed += 1
    return changed


async def skill_self_heal_workflow(
    workflow: str | dict,
    max_rounds: int = 3,
    headless: bool = True,
    **_: Any,
) -> dict[str, Any]:
    """失败自愈：自动运行工作流，失败就校验+按 schema 修复后重跑，直到成功或到达 max_rounds。

    workflow: 本地工作流文件名 / 完整路径 / 工作流 dict。
    返回 {healed, rounds, attempts_log, fixes_applied, final_status, diagnosis, suggestions}。
    无法自动修复时给出诊断与建议，便于你（AI）进一步分析并手动改节点后再调一次。
    """
    from app.services.workflow_runner import load_workflow_dict, run_workflow

    try:
        wf = load_workflow_dict(workflow)
    except Exception as e:
        return {"error": f"无法加载工作流：{e}"}
    wf = dict(wf)
    nodes = list(wf.get("nodes") or [])
    edges = list(wf.get("edges") or [])
    if not nodes:
        return {"error": "工作流没有节点"}

    rounds = max(1, min(int(max_rounds or 3), 8))
    attempts_log: list[dict[str, Any]] = []
    total_fixes = 0

    for r in range(rounds):
        # 1) 校验 + 自动修复（仅第 1 轮和"上一轮有改动"时值得再修）
        validation = await skill_validate_workflow_nodes(nodes, edges)
        autofix = await skill_auto_fix_workflow_nodes(nodes)
        applied = _apply_patches(nodes, autofix.get("patches") or [])
        total_fixes += applied
        wf["nodes"] = nodes

        # 2) 真实运行
        result = await run_workflow(wf, headless=headless, source_tag="self_heal", record=True)
        attempts_log.append({
            "round": r + 1,
            "fixes_applied": applied,
            "status": result.get("status"),
            "failed_nodes": result.get("failed_nodes"),
            "error": result.get("error"),
        })

        if result.get("success"):
            return {
                "healed": True,
                "rounds": r + 1,
                "fixes_applied": total_fixes,
                "final_status": "success",
                "attempts_log": attempts_log,
                "note": "工作流已自动跑通。" + (f"共自动补齐 {total_fixes} 处配置。" if total_fixes else "无需修复，直接跑通。"),
            }

        # 3) 本轮没有任何可自动修复的点 → 停止，给诊断
        if applied == 0:
            issues = validation.get("issues") or validation.get("problems") or []
            return {
                "healed": False,
                "rounds": r + 1,
                "fixes_applied": total_fixes,
                "final_status": result.get("status"),
                "attempts_log": attempts_log,
                "diagnosis": {
                    "error": result.get("error"),
                    "failed_nodes": result.get("failed_nodes"),
                    "validation_issues": issues,
                    "logs_tail": (result.get("logs") or [])[-8:],
                },
                "suggestions": (
                    "自动按 schema 修复已无更多可改之处，剩余多为运行时问题（如选择器失效/网络/登录态/目标不存在）。"
                    "请结合 error 与 logs_tail 定位失败节点，用 describe_module 核对该节点配置、用 probe_page 重新拿选择器，"
                    "改好后可再次调用 self_heal_workflow 验证。"
                ),
            }

    # 用满轮次仍未成功
    return {
        "healed": False,
        "rounds": rounds,
        "fixes_applied": total_fixes,
        "final_status": attempts_log[-1].get("status") if attempts_log else "failed",
        "attempts_log": attempts_log,
        "suggestions": "已尝试自动修复并重跑多轮仍未通过，请结合 attempts_log 的错误逐节点排查。",
    }


def _register_v8() -> None:
    registry.register(Skill(
        name="self_heal_workflow",
        description=(
            "失败自愈闭环：自动运行指定工作流，失败就静态校验 + 按 schema 自动补齐配置后重跑，"
            "直到跑通或到达 max_rounds。无法自动修复时返回结构化诊断（错误/失败节点/日志尾部）与修复建议。"
            "workflow 传本地工作流文件名或完整路径。这是真实执行的闭环，不是纸面分析。"
        ),
        parameters={
            "type": "object",
            "properties": {
                "workflow": {"type": "string", "description": "本地工作流文件名或完整路径"},
                "max_rounds": {"type": "integer", "default": 3, "description": "最多自愈轮数（1-8）"},
                "headless": {"type": "boolean", "default": True, "description": "是否无头运行"},
            },
            "required": ["workflow"],
        },
        handler=skill_self_heal_workflow,
    ))

    # ---- 知识库 / RAG ----
    async def _kb_add(collection: str = "default", text: str = "", source: str = "", embed_model: str = "", **_: Any):
        from app.services import knowledge_base as kb
        return await kb.add_document(collection or "default", text=text, source=source, embed_model=embed_model)

    async def _kb_query(query: str, collection: str = "default", top_k: int = 4, **_: Any):
        from app.services import knowledge_base as kb
        return await kb.query(collection or "default", query, top_k=top_k)

    async def _kb_list(**_: Any):
        from app.services import knowledge_base as kb
        return kb.list_collections()

    async def _kb_delete(collection: str, **_: Any):
        from app.services import knowledge_base as kb
        return kb.delete_collection(collection)

    registry.register(Skill(
        name="kb_add_document",
        description=(
            "把文档/文本导入本地知识库（RAG）。source 可为本地路径或 URL（自动读取 PDF/Word/Excel/TXT 等正文），"
            "或直接用 text 传纯文本。会自动分块并建立语义索引（有嵌入接口走向量，否则走本地词法）。"
        ),
        parameters={
            "type": "object",
            "properties": {
                "collection": {"type": "string", "default": "default", "description": "知识库集合名"},
                "text": {"type": "string", "description": "直接导入的纯文本（与 source 二选一）"},
                "source": {"type": "string", "description": "文档本地路径或 URL"},
                "embed_model": {"type": "string", "description": "可选，嵌入模型名（默认 text-embedding-3-small）"},
            },
        },
        handler=_kb_add,
    ))
    registry.register(Skill(
        name="kb_query",
        description=(
            "检索本地知识库，返回最相关的片段及拼好的 context。用于'问知识库'/企业问答："
            "先 kb_query 拿 context，再据此回答用户并注明来源。"
        ),
        parameters={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "要检索的问题/关键词"},
                "collection": {"type": "string", "default": "default"},
                "top_k": {"type": "integer", "default": 4, "description": "返回片段数（1-20）"},
            },
            "required": ["query"],
        },
        handler=_kb_query,
    ))
    registry.register(Skill(
        name="kb_list",
        description="列出所有知识库集合及其文档数/来源。",
        parameters={"type": "object", "properties": {}},
        handler=_kb_list,
    ))
    registry.register(Skill(
        name="kb_delete",
        description="删除一个知识库集合。",
        parameters={"type": "object", "properties": {"collection": {"type": "string"}}, "required": ["collection"]},
        handler=_kb_delete,
    ))

    # ---- 执行仪表盘 ----
    async def _dash_stats(days: int = 7, **_: Any):
        from app.services import execution_history as h
        return h.get_stats(days=days)

    async def _dash_runs(limit: int = 20, workflow_name: str = "", status: str = "", **_: Any):
        from app.services import execution_history as h
        return {"runs": h.list_runs(limit=limit, workflow_name=workflow_name, status=status)}

    registry.register(Skill(
        name="get_execution_dashboard",
        description="执行仪表盘统计：最近 N 天的总运行数/成功率/平均耗时、每日趋势、失败 TOP 与最慢 TOP 工作流。用于回答'哪个工作流不稳/慢'。",
        parameters={"type": "object", "properties": {"days": {"type": "integer", "default": 7}}},
        handler=_dash_stats,
    ))
    registry.register(Skill(
        name="list_execution_history",
        description="列出最近的工作流运行历史（含状态/耗时/来源/错误），可按工作流名或状态过滤。",
        parameters={
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "default": 20},
                "workflow_name": {"type": "string"},
                "status": {"type": "string", "description": "success/failed/stopped"},
            },
        },
        handler=_dash_runs,
    ))

    # ---- 失败告警中心 ----
    async def _alert_get(**_: Any):
        from app.services import alert_center as ac
        return ac.get_config()

    async def _alert_set(config: dict, **_: Any):
        from app.services import alert_center as ac
        return {"success": True, "config": ac.save_config(config or {})}

    async def _alert_test(**_: Any):
        from app.services import alert_center as ac
        return ac.test_alert()

    registry.register(Skill(
        name="get_alert_config",
        description="读取失败告警中心配置（渠道/通知时机/重试策略）。",
        parameters={"type": "object", "properties": {}},
        handler=_alert_get,
    ))
    registry.register(Skill(
        name="set_alert_config",
        description=(
            "设置失败告警中心配置。config 形如 {enabled, notify_on:'failure'|'always', "
            "channels:[{type:'email'|'webhook'|'feishu'|'qq'|'wecom'|'dingtalk'|'serverchan', enabled, ...渠道参数}], "
            "retry:{enabled, max_retries, delay_seconds}}。工作流跑挂会按此推送告警，API/CLI/计划任务失败会按重试策略自动重跑。"
        ),
        parameters={"type": "object", "properties": {"config": {"type": "object"}}, "required": ["config"]},
        handler=_alert_set,
    ))
    registry.register(Skill(
        name="test_alert",
        description="发送一条测试告警，验证已配置的告警渠道是否可用。",
        parameters={"type": "object", "properties": {}},
        handler=_alert_test,
    ))

    # ---- 工作流即 API（发布/取消/列出） ----
    async def _publish(workflow: str, slug: str = "", require_token: bool = True, headless: bool = True, **_: Any):
        import secrets as _secrets
        import time as _time
        from app.api.published_workflows import _load, _save, _slugify, _LOCK
        from app.services.workflow_runner import load_workflow_dict
        try:
            wf = load_workflow_dict(workflow)
        except Exception as e:
            return {"error": f"无法加载工作流：{e}"}
        slug = _slugify(slug or wf.get("name") or workflow)
        with _LOCK:
            data = _load()
            base = slug; n = 1
            while slug in data and data[slug].get("workflow") != workflow:
                n += 1; slug = f"{base}-{n}"
            token = _secrets.token_urlsafe(16) if require_token else ""
            data[slug] = {"workflow": workflow, "token": token, "headless": bool(headless),
                          "created_at": _time.strftime("%Y-%m-%d %H:%M:%S"),
                          "call_count": data.get(slug, {}).get("call_count", 0)}
            _save(data)
        return {"success": True, "slug": slug, "endpoint": f"/api/run/{slug}", "token": token,
                "usage": f"POST /api/run/{slug}" + ("（头 X-WebRPA-Run-Token 或 ?token= 传 token）" if token else "")}

    async def _list_published(**_: Any):
        from app.api.published_workflows import _load
        data = _load()
        return {"published": [{"slug": k, "workflow": v.get("workflow"), "endpoint": f"/api/run/{k}",
                               "require_token": bool(v.get("token")), "call_count": v.get("call_count", 0)}
                              for k, v in data.items()]}

    async def _unpublish(slug: str, **_: Any):
        from app.api.published_workflows import _load, _save, _LOCK
        with _LOCK:
            data = _load(); existed = slug in data; data.pop(slug, None); _save(data)
        return {"success": existed, "slug": slug}

    registry.register(Skill(
        name="publish_workflow_api",
        description=(
            "把一条工作流发布成 HTTP 端点（工作流即 API）。发布后外部系统 POST /api/run/{slug} 即可触发并拿结果。"
            "workflow 传本地工作流文件名。返回 endpoint 与 token（如启用鉴权）。"
        ),
        parameters={
            "type": "object",
            "properties": {
                "workflow": {"type": "string", "description": "本地工作流文件名"},
                "slug": {"type": "string", "description": "自定义短链，留空按工作流名生成"},
                "require_token": {"type": "boolean", "default": True},
                "headless": {"type": "boolean", "default": True},
            },
            "required": ["workflow"],
        },
        handler=_publish,
    ))
    registry.register(Skill(
        name="list_published_workflows",
        description="列出所有已发布为 API 的工作流端点。",
        parameters={"type": "object", "properties": {}},
        handler=_list_published,
    ))
    registry.register(Skill(
        name="unpublish_workflow",
        description="取消发布某个工作流 API 端点。",
        parameters={"type": "object", "properties": {"slug": {"type": "string"}}, "required": ["slug"]},
        handler=_unpublish,
    ))


_register_v8()
