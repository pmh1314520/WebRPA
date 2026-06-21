# -*- coding: utf-8 -*-
"""企业控制中心 - 总览聚合 API

把集群、审批、审计、保险库、用户角色的关键指标聚合到一个端点，作为控制中心首页。
按当前会话权限分段返回：用户只看到自己有权查看的部分。
"""
from typing import Any, Optional
from fastapi import APIRouter, HTTPException, Header

from app.services import rbac

router = APIRouter(prefix="/api/enterprise", tags=["enterprise"])


@router.get("/overview")
async def overview(x_webrpa_session: Optional[str] = Header(None)):
    session = rbac.resolve_session(x_webrpa_session)
    if not session:
        raise HTTPException(status_code=401, detail="未登录或会话已过期")

    out: dict[str, Any] = {"success": True, "sections": {}}
    perms = session.get("permissions", [])

    def has(p: str) -> bool:
        return "*" in perms or p in perms

    # 集群
    if has("cluster.view"):
        try:
            from app.services import orchestrator
            ov = orchestrator.fleet_overview()
            out["sections"]["cluster"] = {
                "nodes_online": ov.get("nodes_online", 0),
                "nodes_total": ov.get("nodes_total", 0),
                "utilization": ov.get("utilization", 0),
                "tasks": ov.get("tasks", {}),
            }
        except Exception as e:
            out["sections"]["cluster"] = {"error": str(e)}

    # 审批（登录即可看自己相关；这里给待办总数）
    try:
        from app.services import approval_center
        pending = approval_center.list_requests("pending")
        out["sections"]["approvals"] = {"pending": len(pending)}
    except Exception as e:
        out["sections"]["approvals"] = {"error": str(e)}

    # 审计
    if has("audit.view"):
        try:
            from app.services import audit_log
            chain = audit_log.verify_chain()
            out["sections"]["audit"] = {
                "total": chain.get("count", 0),
                "chain_valid": chain.get("valid", None),
            }
        except Exception as e:
            out["sections"]["audit"] = {"error": str(e)}

    # 凭据保险库
    if has("credential.view"):
        try:
            from app.services import credential_vault
            acls = credential_vault.list_acls()
            out["sections"]["vault"] = {
                "credentials": len(acls),
                "restricted": sum(1 for a in acls if a.get("restricted")),
            }
        except Exception as e:
            out["sections"]["vault"] = {"error": str(e)}

    # 用户与角色
    if has("rbac.manage"):
        try:
            users = rbac.list_users()
            roles = rbac.list_roles()
            out["sections"]["rbac"] = {
                "users": len(users),
                "disabled_users": sum(1 for u in users if u.get("disabled")),
                "roles": len(roles),
                "enforcement": rbac.is_enforced(),
            }
        except Exception as e:
            out["sections"]["rbac"] = {"error": str(e)}

    out["user"] = {"username": session["username"], "roles": session["roles"]}
    return out
