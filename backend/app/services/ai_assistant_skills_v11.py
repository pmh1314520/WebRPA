# -*- coding: utf-8 -*-
"""WebRPA 小助手 - v11 企业管家 Skills

让小助手成为 WebRPA 的"管家"：把企业平台的管理与查询能力补全为技能，
使其能查（用户/角色/会话/审批/审计/集群/凭据ACL/总览）也能管
（建用户/改启停/吊销会话/权限强制/审批决策与执行/集群入网与节点/凭据ACL）。

设计：查询类无副作用直接开放；变更类标记 requires_approval=True，在受监督模式下
由人确认后执行，避免被误导/注入造成越权操作。小助手以 actor="assistant" 身份操作并审计。
"""
from __future__ import annotations

from typing import Any

from app.services.ai_assistant_skills import Skill, registry

_ACTOR = "assistant"


# ============ 查询类（安全） ============

async def skill_enterprise_overview(**_: Any) -> dict[str, Any]:
    """企业平台总览：集群、待审批、审计完整性、凭据、用户角色与权限强制状态。"""
    out: dict[str, Any] = {}
    try:
        from app.services import orchestrator
        out["cluster"] = orchestrator.fleet_overview()
    except Exception as e:
        out["cluster"] = {"error": str(e)}
    try:
        from app.services import approval_center
        out["pending_approvals"] = len(approval_center.list_requests("pending"))
    except Exception as e:
        out["pending_approvals"] = {"error": str(e)}
    try:
        from app.services import audit_log
        chain = audit_log.verify_chain()
        out["audit"] = {"total": chain.get("count", 0), "chain_valid": chain.get("valid")}
    except Exception as e:
        out["audit"] = {"error": str(e)}
    try:
        from app.services import credential_vault
        acls = credential_vault.list_acls()
        out["vault"] = {"credentials": len(acls),
                        "restricted": sum(1 for a in acls if a.get("restricted"))}
    except Exception as e:
        out["vault"] = {"error": str(e)}
    try:
        from app.services import rbac
        out["rbac"] = {"users": len(rbac.list_users()), "roles": len(rbac.list_roles()),
                       "enforcement": rbac.is_enforced()}
    except Exception as e:
        out["rbac"] = {"error": str(e)}
    return out


async def skill_list_users(**_: Any) -> dict[str, Any]:
    from app.services import rbac
    return {"users": rbac.list_users()}


async def skill_list_roles(**_: Any) -> dict[str, Any]:
    from app.services import rbac
    return {"roles": rbac.list_roles(), "all_permissions": rbac.all_permissions()}


async def skill_list_sessions(**_: Any) -> dict[str, Any]:
    from app.services import rbac
    return {"sessions": rbac.list_active_sessions()}


async def skill_get_rbac_enforcement(**_: Any) -> dict[str, Any]:
    from app.services import rbac
    return {"enforcement": rbac.is_enforced()}


async def skill_list_approvals(status: str | None = None, **_: Any) -> dict[str, Any]:
    from app.services import approval_center
    return {"requests": approval_center.list_requests(status)}


async def skill_audit_stats(**_: Any) -> dict[str, Any]:
    from app.services import audit_log
    return {"stats": audit_log.stats(), "archives": audit_log.list_archives()}


async def skill_export_audit(fmt: str = "jsonl", actor: str | None = None,
                             action: str | None = None, **_: Any) -> dict[str, Any]:
    from app.services import audit_log
    text = audit_log.export_text(fmt if fmt in ("jsonl", "csv") else "jsonl",
                                 actor=actor, action=action)
    # 大日志截断，避免撑爆上下文
    truncated = len(text) > 8000
    return {"format": fmt, "content": text[:8000], "truncated": truncated}


async def skill_get_cluster_enrollment(**_: Any) -> dict[str, Any]:
    from app.services import orchestrator
    return {"enrollment_enabled": bool(orchestrator.get_enrollment_secret())}


async def skill_platform_health_check(days: int = 7, **_: Any) -> dict[str, Any]:
    """平台体检：一键巡检集群健康、失败 TOP、待审批积压、审计链完整性、异常会话、
    健康探针与告警配置，生成中文巡检报告 + 分级问题清单。管家主动发现风险用。"""
    from app.services import health_inspector
    return health_inspector.run_inspection(days)


async def skill_get_auto_inspect(**_: Any) -> dict[str, Any]:
    """查询定时自动体检配置（是否开启/间隔/通知级别）。"""
    from app.services import health_inspector
    return {"config": health_inspector.get_config()}


async def skill_set_auto_inspect(enabled: bool | None = None, interval_minutes: int | None = None,
                                 notify_on: str | None = None, **_: Any) -> dict[str, Any]:
    """设置定时自动体检：是否开启、间隔分钟(>=5)、通知级别(error/warning)。开启后异常自动推送告警。"""
    from app.services import health_inspector
    patch: dict[str, Any] = {}
    if enabled is not None:
        patch["enabled"] = bool(enabled)
    if interval_minutes is not None:
        patch["interval_minutes"] = int(interval_minutes)
    if notify_on is not None:
        patch["notify_on"] = notify_on
    return {"config": health_inspector.set_config(patch)}


async def skill_query_runs(days: int = 7, group_by: str = "workflow",
                           metric: str = "count", status: str | None = None,
                           top: int = 10, order: str = "desc", **_: Any) -> dict[str, Any]:
    """灵活查询/聚合工作流运行历史，用于精准回答数据问题。
    - days: 统计近 N 天；status: 仅统计某状态(success/failed/stopped)
    - group_by: workflow(按工作流) / source(按来源) / day(按日期)
    - metric: count(次数) / success_rate(成功率%) / avg_ms(平均耗时) / total_ms / max_ms / failed(失败数)
    - top/order: 取前 N，desc 降序 asc 升序
    例："上周哪个工作流最费时" → days=7, group_by=workflow, metric=avg_ms, top=1。
    """
    import time as _t
    from app.services import execution_history
    try:
        runs = execution_history.list_runs(limit=100000)
        runs = runs.get("runs", runs) if isinstance(runs, dict) else runs
    except Exception as e:
        return {"error": f"读取运行历史失败：{e}"}
    cutoff = _t.time() - days * 86400
    groups: dict[str, dict[str, Any]] = {}
    for r in (runs or []):
        # 时间过滤（started_at 优先，否则用 ts 字符串近似放行）
        sa = r.get("started_at")
        if isinstance(sa, (int, float)) and sa < cutoff:
            continue
        if status and r.get("status") != status:
            continue
        if group_by == "source":
            key = r.get("source", "?")
        elif group_by == "day":
            key = (r.get("ts", "") or "")[:10] or "?"
        else:
            key = r.get("workflow_name", "?")
        g = groups.setdefault(key, {"count": 0, "success": 0, "failed": 0,
                                    "total_ms": 0, "max_ms": 0})
        g["count"] += 1
        st = r.get("status")
        if st == "success":
            g["success"] += 1
        elif st == "failed":
            g["failed"] += 1
        dms = int(r.get("duration_ms", 0) or 0)
        g["total_ms"] += dms
        g["max_ms"] = max(g["max_ms"], dms)

    def _metric(g: dict[str, Any]) -> float:
        if metric == "success_rate":
            return round(g["success"] / g["count"] * 100, 1) if g["count"] else 0
        if metric == "avg_ms":
            return round(g["total_ms"] / g["count"], 1) if g["count"] else 0
        if metric == "total_ms":
            return g["total_ms"]
        if metric == "max_ms":
            return g["max_ms"]
        if metric == "failed":
            return g["failed"]
        return g["count"]

    rows = [{"group": k, "value": _metric(v), **v} for k, v in groups.items()]
    rows.sort(key=lambda x: x["value"], reverse=(order != "asc"))
    return {"days": days, "group_by": group_by, "metric": metric,
            "status_filter": status, "total_groups": len(rows),
            "results": rows[:max(1, int(top))]}


# ============ 变更类（需审批确认） ============

async def skill_create_user(username: str, password: str, roles: list,
                            display_name: str = "", **_: Any) -> dict[str, Any]:
    from app.services import rbac, audit_log
    res = rbac.create_user(username, password, roles or ["viewer"], display_name)
    audit_log.record(_ACTOR, "rbac.user_create", username,
                     result="success" if res.get("success") else "failed")
    return res


async def skill_set_user_enabled(username: str, enabled: bool, **_: Any) -> dict[str, Any]:
    from app.services import rbac, audit_log
    res = rbac.update_user(username, disabled=not enabled)
    audit_log.record(_ACTOR, "rbac.user_update", username,
                     detail={"enabled": enabled})
    return res


async def skill_delete_user(username: str, **_: Any) -> dict[str, Any]:
    from app.services import rbac, audit_log
    res = rbac.delete_user(username)
    audit_log.record(_ACTOR, "rbac.user_delete", username,
                     result="success" if res.get("success") else "failed")
    return res


async def skill_revoke_user_sessions(username: str, **_: Any) -> dict[str, Any]:
    from app.services import rbac, audit_log
    n = rbac.revoke_user_sessions(username)
    audit_log.record(_ACTOR, "rbac.role_change", username,
                     result="sessions_revoked", detail={"revoked": n})
    return {"success": True, "revoked": n}


async def skill_set_rbac_enforcement(enabled: bool, **_: Any) -> dict[str, Any]:
    from app.services import rbac, audit_log
    res = rbac.set_enforced(bool(enabled))
    audit_log.record(_ACTOR, "rbac.role_change", "enforcement", detail={"enabled": enabled})
    return res


async def skill_create_approval(action: str, target: str, payload: dict | None = None,
                                reason: str = "", **_: Any) -> dict[str, Any]:
    from app.services import approval_center
    return approval_center.create_request(_ACTOR, action, target, payload or {}, reason)


async def skill_decide_approval(request_id: str, approved: bool, comment: str = "", **_: Any) -> dict[str, Any]:
    from app.services import approval_center
    return approval_center.decide(request_id, _ACTOR, bool(approved), comment)


async def skill_execute_approval(request_id: str, **_: Any) -> dict[str, Any]:
    from app.services import approval_center
    return approval_center.execute_by_id(request_id, _ACTOR)


async def skill_set_credential_acl(name: str, allowed_roles: list, **_: Any) -> dict[str, Any]:
    from app.services import credential_vault, audit_log
    res = credential_vault.set_acl(name, allowed_roles or [])
    audit_log.record(_ACTOR, "credential.manage", name, detail={"allowed_roles": allowed_roles})
    return res


async def skill_set_cluster_enrollment(secret: str, **_: Any) -> dict[str, Any]:
    from app.services import orchestrator
    return orchestrator.set_enrollment_secret(secret or "")


async def skill_remove_cluster_node(node_id: str, **_: Any) -> dict[str, Any]:
    from app.services import orchestrator
    return orchestrator.remove_node(node_id)


async def skill_set_cluster_node_enabled(node_id: str, enabled: bool, **_: Any) -> dict[str, Any]:
    from app.services import orchestrator
    return orchestrator.set_node_enabled(node_id, bool(enabled))


async def skill_stop_computer_use(**_: Any) -> dict[str, Any]:
    from app.services import computer_use_agent
    return computer_use_agent.request_stop()


# ============ 注册 ============

def _q(name: str, desc: str, handler, props: dict | None = None, required: list | None = None):
    registry.register(Skill(
        name=name, description=desc,
        parameters={"type": "object", "properties": props or {},
                    **({"required": required} if required else {})},
        handler=handler,
    ))


def _m(name: str, desc: str, handler, props: dict | None = None, required: list | None = None):
    registry.register(Skill(
        name=name, description=desc,
        parameters={"type": "object", "properties": props or {},
                    **({"required": required} if required else {})},
        handler=handler, requires_approval=True,
    ))


def _register_v11() -> None:
    # 查询
    _q("enterprise_overview", "企业平台总览：集群在线/利用率、待审批数、审计完整性、凭据数、用户角色与权限强制状态。一句话掌握平台健康。", skill_enterprise_overview)
    _q("list_users", "列出所有用户（含角色/来源/启停状态）。", skill_list_users)
    _q("list_roles", "列出所有角色及其权限，附全部可用权限清单。", skill_list_roles)
    _q("list_sessions", "列出当前有效登录会话（不含完整令牌）。", skill_list_sessions)
    _q("get_rbac_enforcement", "查询全局 RBAC 权限强制是否开启。", skill_get_rbac_enforcement)
    _q("list_approvals", "列出审批单，可按状态过滤（pending/approved/rejected）。",
       skill_list_approvals, {"status": {"type": "string"}})
    _q("audit_stats", "审计统计（总数/按动作/操作者 TOP）+ 已归档文件列表。", skill_audit_stats)
    _q("export_audit", "导出审计日志文本（jsonl/csv，可按 actor/action 过滤；超长截断）。",
       skill_export_audit, {"fmt": {"type": "string", "enum": ["jsonl", "csv"]},
                            "actor": {"type": "string"}, "action": {"type": "string"}})
    _q("get_cluster_enrollment", "查询集群是否已开启入网密钥校验。", skill_get_cluster_enrollment)
    _q("platform_health_check", "平台体检：一键巡检集群健康/失败TOP/待审批积压/审计链完整性/异常会话/健康探针/告警配置，生成中文巡检报告与分级问题清单。用户问'平台状态/有没有问题/体检一下'时调它。",
       skill_platform_health_check, {"days": {"type": "integer", "default": 7}})
    _q("get_auto_inspect", "查询定时自动体检配置（是否开启/间隔分钟/通知级别）。", skill_get_auto_inspect)
    _q("query_runs", "灵活聚合查询运行历史以精准回答数据问题。group_by=workflow/source/day，metric=count/success_rate/avg_ms/total_ms/max_ms/failed，可按 days/status 过滤、取 top、排序。例：'上周哪个工作流最费时'→days=7,group_by=workflow,metric=avg_ms,top=1。",
       skill_query_runs, {"days": {"type": "integer", "default": 7},
                          "group_by": {"type": "string", "enum": ["workflow", "source", "day"]},
                          "metric": {"type": "string", "enum": ["count", "success_rate", "avg_ms", "total_ms", "max_ms", "failed"]},
                          "status": {"type": "string"}, "top": {"type": "integer", "default": 10},
                          "order": {"type": "string", "enum": ["desc", "asc"]}})

    # 变更（需审批确认）
    _m("set_auto_inspect", "开启/关闭定时自动体检，设置间隔(分钟,>=5)与通知级别(error/warning)。开启后平台异常自动推送告警。",
       skill_set_auto_inspect, {"enabled": {"type": "boolean"}, "interval_minutes": {"type": "integer"},
                                "notify_on": {"type": "string", "enum": ["error", "warning"]}})
    _m("create_user", "创建平台用户。username/password/roles 必填，roles 取自 list_roles。",
       skill_create_user, {"username": {"type": "string"}, "password": {"type": "string"},
                           "roles": {"type": "array", "items": {"type": "string"}},
                           "display_name": {"type": "string"}},
       ["username", "password", "roles"])
    _m("set_user_enabled", "启用/禁用用户（禁用会强制下线其会话）。",
       skill_set_user_enabled, {"username": {"type": "string"}, "enabled": {"type": "boolean"}},
       ["username", "enabled"])
    _m("delete_user", "删除用户（强制下线其所有会话，不可恢复）。",
       skill_delete_user, {"username": {"type": "string"}}, ["username"])
    _m("revoke_user_sessions", "强制下线某用户的所有会话。",
       skill_revoke_user_sessions, {"username": {"type": "string"}}, ["username"])
    _m("set_rbac_enforcement", "开启/关闭全局 RBAC 强制（开启后远程访问需登录+权限，本机豁免）。",
       skill_set_rbac_enforcement, {"enabled": {"type": "boolean"}}, ["enabled"])
    _m("create_approval", "发起审批申请（危险操作走审批）。action 如 workflow.delete/node.remove/cluster.dispatch_bulk。",
       skill_create_approval, {"action": {"type": "string"}, "target": {"type": "string"},
                               "payload": {"type": "object"}, "reason": {"type": "string"}},
       ["action", "target"])
    _m("decide_approval", "审批某申请（批准/驳回）。",
       skill_decide_approval, {"request_id": {"type": "string"}, "approved": {"type": "boolean"},
                               "comment": {"type": "string"}}, ["request_id", "approved"])
    _m("execute_approval", "执行已批准的危险操作（消费一次性令牌并真正落地）。",
       skill_execute_approval, {"request_id": {"type": "string"}}, ["request_id"])
    _m("set_credential_acl", "设置某凭据允许访问的角色集合（保险库 ACL）。",
       skill_set_credential_acl, {"name": {"type": "string"},
                                  "allowed_roles": {"type": "array", "items": {"type": "string"}}},
       ["name", "allowed_roles"])
    _m("set_cluster_enrollment", "设置/清空集群入网密钥（清空传空字符串）。设后执行机注册需带匹配密钥。",
       skill_set_cluster_enrollment, {"secret": {"type": "string"}}, ["secret"])
    _m("remove_cluster_node", "从集群移除一个执行机节点。",
       skill_remove_cluster_node, {"node_id": {"type": "string"}}, ["node_id"])
    _m("set_cluster_node_enabled", "启用/停用一个集群执行机节点。",
       skill_set_cluster_node_enabled, {"node_id": {"type": "string"}, "enabled": {"type": "boolean"}},
       ["node_id", "enabled"])
    _m("stop_computer_use", "急停：终止当前正在运行的 Computer-Use 会话。", skill_stop_computer_use)


_register_v11()
