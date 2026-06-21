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

_DATA_DIR = Path("backend/data")
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
