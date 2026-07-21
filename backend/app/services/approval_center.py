# -*- coding: utf-8 -*-
"""审批中心

危险操作（删除工作流、批量派发、修改权限、导出凭据 ACL 等）创建审批单并置为待审批，
阻止其立即执行。审批人批准/驳回后更新状态，批准后签发一次性可执行令牌。

数据落盘：backend/data/approvals.json。
"""
from __future__ import annotations

import json
import secrets
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Optional
from app.utils.paths import BACKEND_DATA_DIR

_DATA_DIR = BACKEND_DATA_DIR
_FILE = _DATA_DIR / "approvals.json"
_lock = threading.RLock()
_cache: Optional[dict[str, Any]] = None

# 需要审批的危险动作清单
DANGEROUS_ACTIONS = {
    "workflow.delete", "cluster.dispatch_bulk", "rbac.role_change",
    "credential.export_acl", "credential.delete", "node.remove",
}

# 审批通过后令牌有效期
GRANT_TTL = 30 * 60


def _load() -> dict[str, Any]:
    global _cache
    if _cache is not None:
        return _cache
    data: dict[str, Any] = {"requests": {}}
    try:
        if _FILE.exists():
            raw = _FILE.read_text(encoding="utf-8")
            if raw.strip():
                data = json.loads(raw)
    except Exception as e:
        print(f"[approval] 加载失败: {e}")
    data.setdefault("requests", {})
    _cache = data
    return _cache


def _save(data: dict[str, Any]) -> None:
    try:
        _DATA_DIR.mkdir(parents=True, exist_ok=True)
        _FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception as e:
        print(f"[approval] 保存失败: {e}")


def invalidate_cache() -> None:
    global _cache
    with _lock:
        _cache = None


def is_dangerous(action: str) -> bool:
    return action in DANGEROUS_ACTIONS


def create_request(requester: str, action: str, target: str,
                   payload: Optional[dict[str, Any]] = None,
                   reason: str = "") -> dict[str, Any]:
    """创建审批单。返回 {request_id, status}。"""
    with _lock:
        data = _load()
        rid = f"apr_{secrets.token_hex(6)}"
        req = {
            "id": rid,
            "requester": requester,
            "action": action,
            "target": target,
            "payload": payload or {},
            "reason": reason,
            "status": "pending",
            "created_at": datetime.now().isoformat(),
            "decided_at": None,
            "approver": None,
            "comment": "",
            "grant_token": None,
            "grant_expires_at": None,
            "consumed": False,
        }
        data["requests"][rid] = req
        _save(data)
        try:
            from app.services import audit_log
            audit_log.record(requester, "approval.create", target,
                             detail={"request_id": rid, "action": action})
        except Exception:
            pass
        try:
            from app.services import alert_center
            alert_center.notify_event(
                "【WebRPA 审批】有新的待审批申请",
                f"发起人：{requester}\n操作：{action}\n对象：{target}\n事由：{reason or '（无）'}\n"
                f"请到企业控制中心「审批中心」处理。单号：{rid}")
        except Exception:
            pass
        return {"success": True, "request_id": rid, "status": "pending"}


def list_requests(status: Optional[str] = None) -> list[dict[str, Any]]:
    with _lock:
        data = _load()
        out = []
        for r in data["requests"].values():
            if status and r.get("status") != status:
                continue
            view = dict(r)
            view.pop("grant_token", None)  # 不外泄令牌
            out.append(view)
        out.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return out


def get_request(rid: str) -> Optional[dict[str, Any]]:
    with _lock:
        r = _load()["requests"].get(rid)
        if not r:
            return None
        view = dict(r)
        view.pop("grant_token", None)
        return view


def decide(rid: str, approver: str, approved: bool, comment: str = "") -> dict[str, Any]:
    """审批人批准/驳回。批准时签发一次性可执行令牌。"""
    with _lock:
        data = _load()
        req = data["requests"].get(rid)
        if not req:
            return {"success": False, "error": "审批单不存在"}
        if req["status"] != "pending":
            return {"success": False, "error": f"审批单当前状态为 {req['status']}，不可重复审批"}
        if req["requester"] == approver:
            return {"success": False, "error": "不能审批自己发起的请求"}
        req["status"] = "approved" if approved else "rejected"
        req["approver"] = approver
        req["comment"] = comment
        req["decided_at"] = datetime.now().isoformat()
        if approved:
            req["grant_token"] = secrets.token_urlsafe(24)
            req["grant_expires_at"] = time.time() + GRANT_TTL
        _save(data)
        try:
            from app.services import audit_log
            audit_log.record(approver, "approval.decide", req["target"],
                             result="approved" if approved else "rejected",
                             detail={"request_id": rid, "comment": comment})
        except Exception:
            pass
        result = {"success": True, "status": req["status"]}
        if approved:
            result["grant_token"] = req["grant_token"]
        return result


def consume_grant(rid: str, grant_token: str) -> dict[str, Any]:
    """执行前校验并消费一次性令牌；成功后标记已用，防重放。"""
    with _lock:
        data = _load()
        req = data["requests"].get(rid)
        if not req:
            return {"ok": False, "error": "审批单不存在"}
        if req["status"] != "approved":
            return {"ok": False, "error": "审批单未批准"}
        if req.get("consumed"):
            return {"ok": False, "error": "审批令牌已被使用"}
        if not req.get("grant_token") or grant_token != req["grant_token"]:
            return {"ok": False, "error": "审批令牌无效"}
        if time.time() > (req.get("grant_expires_at") or 0):
            return {"ok": False, "error": "审批令牌已过期"}
        req["consumed"] = True
        _save(data)
        return {"ok": True, "action": req["action"], "target": req["target"],
                "payload": req.get("payload", {})}


def execute_approved(rid: str, grant_token: str, actor: str) -> dict[str, Any]:
    """消费审批令牌并真正执行被批准的危险操作（approve → execute 闭环）。

    支持的动作：
      - workflow.delete   payload={filename}            删除本地工作流文件
      - node.remove       payload={node_id}             从集群移除节点
      - cluster.dispatch_bulk payload={workflows:[..],constraints?} 批量派发集群任务
    """
    grant = consume_grant(rid, grant_token)
    if not grant.get("ok"):
        return {"success": False, "error": grant.get("error")}
    action = grant["action"]
    payload = grant.get("payload", {}) or {}
    try:
        if action == "workflow.delete":
            from pathlib import Path
            fn = payload.get("filename", "")
            if not fn:
                return {"success": False, "error": "缺少 filename"}
            # 候选目录：用户配置的「活动文件夹」优先，再回退默认目录
            candidates = []
            try:
                from app.services import workflow_folder as _wf_folder
                candidates.append(Path(_wf_folder.get_active_folder()))
            except Exception:
                pass
            default_folder = Path(__file__).parent.parent.parent.parent / "workflows"
            if default_folder not in candidates:
                candidates.append(default_folder)
            name = fn if fn.endswith(".json") else fn + ".json"
            target_fp = None
            for folder in candidates:
                fp = folder / name
                try:
                    fp.resolve().relative_to(folder.resolve())
                except ValueError:
                    continue  # 非法文件名（路径穿越），跳过该目录
                if fp.exists():
                    target_fp = fp
                    break
            if target_fp is None:
                return {"success": False, "error": "文件不存在"}
            target_fp.unlink()
            _audit_exec(actor, action, fn)
            return {"success": True, "executed": action, "target": fn}
        if action == "node.remove":
            from app.services import orchestrator
            res = orchestrator.remove_node(payload.get("node_id", ""))
            _audit_exec(actor, action, payload.get("node_id", ""))
            return {"success": res.get("success", False), "executed": action, "result": res}
        if action == "cluster.dispatch_bulk":
            from app.services import orchestrator
            workflows = payload.get("workflows", []) or []
            constraints = payload.get("constraints")
            results = [orchestrator.submit_task(w, constraints=constraints, requester=actor)
                       for w in workflows]
            _audit_exec(actor, action, f"{len(workflows)} workflows")
            return {"success": True, "executed": action, "results": results}
        return {"success": False, "error": f"不支持自动执行的动作：{action}（已消费令牌，请人工处理）"}
    except Exception as e:
        return {"success": False, "error": f"执行失败：{e}"}


def _audit_exec(actor: str, action: str, target: str) -> None:
    try:
        from app.services import audit_log
        audit_log.record(actor, "approval.execute", target, result="executed",
                         detail={"action": action})
    except Exception:
        pass


def execute_by_id(rid: str, actor: str) -> dict[str, Any]:
    """对已批准的审批单按 id 执行（服务端持有令牌，由调用方权限保证安全）。"""
    with _lock:
        req = _load()["requests"].get(rid)
        if not req:
            return {"success": False, "error": "审批单不存在"}
        if req.get("status") != "approved":
            return {"success": False, "error": "审批单未批准"}
        if req.get("consumed"):
            return {"success": False, "error": "该审批已执行过"}
        token = req.get("grant_token") or ""
    return execute_approved(rid, token, actor)
