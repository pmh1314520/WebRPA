# -*- coding: utf-8 -*-
"""企业级控制中心 + 多机器人集群（Orchestrator）

纳管 N 台执行机（机器人节点），统一下发任务、负载均衡、按标签/能力路由、
节点健康监控、失败自动转移（failover）。

节点模型：node_id, name, token, tags[], capabilities[], status, load,
          max_concurrency, last_heartbeat, host。
任务模型：task_id, workflow, constraints{tags,capabilities}, status,
          assigned_node, attempts, max_failover, tried_nodes[], history[]。

派发后由执行机轮询领取（pull 模型），执行完上报结果；本中心负责选机、记账、转移。
数据落盘：backend/data/robots.json、backend/data/cluster_tasks.json。
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
_NODES_FILE = _DATA_DIR / "robots.json"
_TASKS_FILE = _DATA_DIR / "cluster_tasks.json"
_lock = threading.RLock()
_nodes_cache: Optional[dict[str, Any]] = None
_tasks_cache: Optional[dict[str, Any]] = None

HEARTBEAT_TIMEOUT = 60  # 秒，超过未心跳判离线
_ENROLL_FILE = _DATA_DIR / "cluster_enroll.json"


def get_enrollment_secret() -> str:
    """读取集群入网密钥（为空表示不校验，本地/内网开箱即用）。"""
    try:
        if _ENROLL_FILE.exists():
            return str(json.loads(_ENROLL_FILE.read_text(encoding="utf-8")).get("secret", "") or "")
    except Exception:
        pass
    return ""


def set_enrollment_secret(secret: str) -> dict[str, Any]:
    """设置/清空集群入网密钥。设置后，执行机注册必须携带匹配密钥。"""
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    _ENROLL_FILE.write_text(json.dumps({"secret": secret or ""}, ensure_ascii=False),
                            encoding="utf-8")
    return {"success": True, "enabled": bool(secret)}


def _load_nodes() -> dict[str, Any]:
    global _nodes_cache
    if _nodes_cache is not None:
        return _nodes_cache
    data: dict[str, Any] = {}
    try:
        if _NODES_FILE.exists():
            raw = _NODES_FILE.read_text(encoding="utf-8")
            if raw.strip():
                data = json.loads(raw)
    except Exception as e:
        print(f"[orchestrator] 加载节点失败: {e}")
    _nodes_cache = data
    return _nodes_cache


def _save_nodes(data: dict[str, Any]) -> None:
    try:
        _DATA_DIR.mkdir(parents=True, exist_ok=True)
        _NODES_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception as e:
        print(f"[orchestrator] 保存节点失败: {e}")


def _load_tasks() -> dict[str, Any]:
    global _tasks_cache
    if _tasks_cache is not None:
        return _tasks_cache
    data: dict[str, Any] = {}
    try:
        if _TASKS_FILE.exists():
            raw = _TASKS_FILE.read_text(encoding="utf-8")
            if raw.strip():
                data = json.loads(raw)
    except Exception as e:
        print(f"[orchestrator] 加载任务失败: {e}")
    _tasks_cache = data
    return _tasks_cache


def _save_tasks(data: dict[str, Any]) -> None:
    try:
        _DATA_DIR.mkdir(parents=True, exist_ok=True)
        _TASKS_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception as e:
        print(f"[orchestrator] 保存任务失败: {e}")


def invalidate_cache() -> None:
    global _nodes_cache, _tasks_cache
    with _lock:
        _nodes_cache = None
        _tasks_cache = None


# ---------- 节点管理 ----------
def register_node(name: str, *, tags: Optional[list[str]] = None,
                  capabilities: Optional[list[str]] = None,
                  max_concurrency: int = 2, host: str = "",
                  node_id: Optional[str] = None,
                  enroll_secret: Optional[str] = None) -> dict[str, Any]:
    """注册（或重注册）一台执行机。返回 node_id + token（执行机后续凭 token 心跳/领任务）。
    若配置了集群入网密钥，注册必须携带匹配的 enroll_secret，否则拒绝。"""
    required = get_enrollment_secret()
    if required and (enroll_secret or "") != required:
        return {"success": False, "error": "集群入网密钥无效，拒绝注册"}
    with _lock:
        data = _load_nodes()
        nid = node_id or f"node_{secrets.token_hex(5)}"
        existing = data.get(nid)
        token = existing.get("token") if existing else secrets.token_urlsafe(18)
        data[nid] = {
            "node_id": nid,
            "name": name or nid,
            "token": token,
            "tags": list(tags or []),
            "capabilities": list(capabilities or []),
            "max_concurrency": max(1, int(max_concurrency or 2)),
            "status": "online",
            "load": existing.get("load", 0) if existing else 0,
            "host": host,
            "last_heartbeat": time.time(),
            "registered_at": existing.get("registered_at") if existing else datetime.now().isoformat(),
            "last_result": existing.get("last_result") if existing else None,
        }
        _save_nodes(data)
        return {"success": True, "node_id": nid, "token": token}


def heartbeat(node_id: str, token: str, *, load: Optional[int] = None,
              status: Optional[str] = None) -> dict[str, Any]:
    """执行机上报心跳（含当前负载）。"""
    with _lock:
        data = _load_nodes()
        node = data.get(node_id)
        if not node:
            return {"success": False, "error": "节点未注册"}
        if node.get("token") != token:
            return {"success": False, "error": "token 无效"}
        node["last_heartbeat"] = time.time()
        node["status"] = status or "online"
        if load is not None:
            node["load"] = max(0, int(load))
        _save_nodes(data)
        return {"success": True}


def _refresh_status(data: dict[str, Any]) -> None:
    """根据心跳超时刷新在线状态。"""
    now = time.time()
    for node in data.values():
        if node.get("status") == "disabled":
            continue
        if now - node.get("last_heartbeat", 0) > HEARTBEAT_TIMEOUT:
            node["status"] = "offline"


def list_nodes() -> list[dict[str, Any]]:
    with _lock:
        data = _load_nodes()
        _refresh_status(data)
        _save_nodes(data)
        out = []
        for n in data.values():
            v = dict(n)
            v.pop("token", None)  # 不外泄 token
            out.append(v)
        out.sort(key=lambda x: x.get("name", ""))
        return out


def remove_node(node_id: str) -> dict[str, Any]:
    with _lock:
        data = _load_nodes()
        if node_id not in data:
            return {"success": False, "error": "节点不存在"}
        data.pop(node_id, None)
        _save_nodes(data)
        return {"success": True}


def set_node_enabled(node_id: str, enabled: bool) -> dict[str, Any]:
    with _lock:
        data = _load_nodes()
        node = data.get(node_id)
        if not node:
            return {"success": False, "error": "节点不存在"}
        node["status"] = "online" if enabled else "disabled"
        _save_nodes(data)
        return {"success": True}


# ---------- 任务路由 ----------
def _candidates(data: dict[str, Any], constraints: dict[str, Any],
                exclude: Optional[set[str]] = None) -> list[dict[str, Any]]:
    """筛选满足约束的在线节点。"""
    exclude = exclude or set()
    req_tags = set(constraints.get("tags", []) or [])
    req_caps = set(constraints.get("capabilities", []) or [])
    out = []
    for node in data.values():
        if node["node_id"] in exclude:
            continue
        if node.get("status") != "online":
            continue
        if req_tags and not req_tags.issubset(set(node.get("tags", []))):
            continue
        if req_caps and not req_caps.issubset(set(node.get("capabilities", []))):
            continue
        out.append(node)
    return out


def _pick_node(data: dict[str, Any], constraints: dict[str, Any],
               exclude: Optional[set[str]] = None) -> Optional[dict[str, Any]]:
    """从候选中选负载率（load/max_concurrency）最低者；满载的排后。"""
    cands = _candidates(data, constraints, exclude)
    if not cands:
        return None

    def _ratio(n: dict[str, Any]) -> float:
        mc = max(1, n.get("max_concurrency", 1))
        return n.get("load", 0) / mc

    cands.sort(key=lambda n: (_ratio(n), n.get("load", 0)))
    return cands[0]


def submit_task(workflow: str, *, constraints: Optional[dict[str, Any]] = None,
                max_failover: int = 2, requester: str = "system",
                priority: int = 0) -> dict[str, Any]:
    """提交一个集群任务，立即尝试派发到最优节点。"""
    with _lock:
        nodes = _load_nodes()
        _refresh_status(nodes)
        tasks = _load_tasks()
        tid = f"ctask_{secrets.token_hex(6)}"
        constraints = constraints or {}
        task = {
            "task_id": tid,
            "workflow": workflow,
            "constraints": constraints,
            "priority": int(priority or 0),
            "requester": requester,
            "status": "pending",
            "assigned_node": None,
            "attempts": 0,
            "max_failover": max(0, int(max_failover)),
            "tried_nodes": [],
            "history": [],
            "created_at": datetime.now().isoformat(),
            "result": None,
        }
        node = _pick_node(nodes, constraints)
        if node:
            _assign(task, node, nodes)
        else:
            task["status"] = "queued"  # 暂无可用节点，等节点上线后由 claim 领取
        tasks[tid] = task
        _save_tasks(tasks)
        _save_nodes(nodes)
        try:
            from app.services import audit_log
            audit_log.record(requester, "cluster.dispatch", workflow,
                             result=task["status"],
                             detail={"task_id": tid, "node": task["assigned_node"]})
        except Exception:
            pass
        return {"success": True, "task_id": tid, "status": task["status"],
                "assigned_node": task["assigned_node"]}


def _assign(task: dict[str, Any], node: dict[str, Any], nodes: dict[str, Any]) -> None:
    """把任务分配给节点，更新双方状态。"""
    task["assigned_node"] = node["node_id"]
    task["status"] = "assigned"
    task["attempts"] += 1
    task["tried_nodes"].append(node["node_id"])
    task["history"].append({
        "node": node["node_id"], "at": datetime.now().isoformat(), "event": "assigned",
    })
    node["load"] = node.get("load", 0) + 1


def claim_tasks(node_id: str, token: str, max_take: int = 1) -> dict[str, Any]:
    """执行机轮询领取分配给自己的任务（pull 模型）。
    同时把 queued 状态、且本节点满足约束的任务也尝试派发给它。
    """
    with _lock:
        nodes = _load_nodes()
        node = nodes.get(node_id)
        if not node or node.get("token") != token:
            return {"success": False, "error": "节点未注册或 token 无效"}
        node["last_heartbeat"] = time.time()
        if node.get("status") == "offline":
            node["status"] = "online"
        tasks = _load_tasks()
        taken = []
        # 先领已分配给自己的
        for t in tasks.values():
            if len(taken) >= max_take:
                break
            if t["status"] == "assigned" and t["assigned_node"] == node_id:
                t["status"] = "running"
                t["history"].append({"node": node_id, "at": datetime.now().isoformat(),
                                     "event": "claimed"})
                taken.append({"task_id": t["task_id"], "workflow": t["workflow"]})
        # 再尝试领 queued 的（无人认领、约束匹配）
        if len(taken) < max_take:
            for t in tasks.values():
                if len(taken) >= max_take:
                    break
                if t["status"] != "queued":
                    continue
                req_tags = set(t["constraints"].get("tags", []) or [])
                req_caps = set(t["constraints"].get("capabilities", []) or [])
                if req_tags and not req_tags.issubset(set(node.get("tags", []))):
                    continue
                if req_caps and not req_caps.issubset(set(node.get("capabilities", []))):
                    continue
                _assign(t, node, nodes)
                t["status"] = "running"
                t["history"].append({"node": node_id, "at": datetime.now().isoformat(),
                                     "event": "claimed"})
                taken.append({"task_id": t["task_id"], "workflow": t["workflow"]})
        _save_tasks(tasks)
        _save_nodes(nodes)
        return {"success": True, "tasks": taken}


def report_result(node_id: str, token: str, task_id: str,
                  success: bool, result: Optional[dict[str, Any]] = None) -> dict[str, Any]:
    """执行机上报任务结果。失败时尝试 failover 到其他节点。"""
    with _lock:
        nodes = _load_nodes()
        node = nodes.get(node_id)
        if not node or node.get("token") != token:
            return {"success": False, "error": "节点未注册或 token 无效"}
        tasks = _load_tasks()
        task = tasks.get(task_id)
        if not task:
            return {"success": False, "error": "任务不存在"}
        node["load"] = max(0, node.get("load", 0) - 1)
        node["last_result"] = {"task_id": task_id, "success": success,
                               "at": datetime.now().isoformat()}
        task["history"].append({"node": node_id, "at": datetime.now().isoformat(),
                               "event": "succeeded" if success else "failed"})
        if success:
            task["status"] = "success"
            task["result"] = result or {"success": True}
            _save_tasks(tasks)
            _save_nodes(nodes)
            return {"success": True, "status": "success"}
        # 失败 → 尝试 failover
        task["result"] = result or {"success": False}
        if task["attempts"] <= task["max_failover"]:
            alt = _pick_node(nodes, task["constraints"], exclude=set(task["tried_nodes"]))
            if alt:
                _assign(task, alt, nodes)
                task["history"].append({"node": alt["node_id"], "at": datetime.now().isoformat(),
                                       "event": "failover_assigned"})
                _save_tasks(tasks)
                _save_nodes(nodes)
                return {"success": True, "status": "failover", "new_node": alt["node_id"]}
        task["status"] = "failed"
        _save_tasks(tasks)
        _save_nodes(nodes)
        return {"success": True, "status": "failed"}


def get_task(task_id: str) -> Optional[dict[str, Any]]:
    with _lock:
        return _load_tasks().get(task_id)


def list_tasks(status: Optional[str] = None, limit: int = 100) -> list[dict[str, Any]]:
    with _lock:
        tasks = list(_load_tasks().values())
        if status:
            tasks = [t for t in tasks if t.get("status") == status]
        tasks.sort(key=lambda t: t.get("created_at", ""), reverse=True)
        return tasks[:limit]


def fleet_overview() -> dict[str, Any]:
    """舰队总览：节点在线情况 + 任务统计。"""
    with _lock:
        nodes = _load_nodes()
        _refresh_status(nodes)
        _save_nodes(nodes)
        tasks = _load_tasks()
        online = sum(1 for n in nodes.values() if n.get("status") == "online")
        total_cap = sum(n.get("max_concurrency", 0) for n in nodes.values()
                        if n.get("status") == "online")
        total_load = sum(n.get("load", 0) for n in nodes.values() if n.get("status") == "online")
        task_stat: dict[str, int] = {}
        for t in tasks.values():
            task_stat[t["status"]] = task_stat.get(t["status"], 0) + 1
        return {
            "nodes_total": len(nodes),
            "nodes_online": online,
            "capacity": total_cap,
            "current_load": total_load,
            "utilization": round(total_load / total_cap, 3) if total_cap else 0,
            "tasks": task_stat,
        }


def reap_stale_tasks() -> dict[str, Any]:
    """把分配给已离线节点但长时间未领取/未上报的任务重新派发或转移。"""
    with _lock:
        nodes = _load_nodes()
        _refresh_status(nodes)
        tasks = _load_tasks()
        reassigned = 0
        for t in tasks.values():
            if t["status"] not in ("assigned", "running"):
                continue
            assigned = t.get("assigned_node")
            node = nodes.get(assigned) if assigned else None
            if node and node.get("status") == "online":
                continue
            # 节点离线 → 尝试转移
            if node:
                node["load"] = max(0, node.get("load", 0) - 1)
            if t["attempts"] <= t["max_failover"]:
                alt = _pick_node(nodes, t["constraints"], exclude=set(t["tried_nodes"]))
                if alt:
                    _assign(t, alt, nodes)
                    t["history"].append({"node": alt["node_id"], "at": datetime.now().isoformat(),
                                        "event": "reaped_failover"})
                    reassigned += 1
                    continue
            t["status"] = "queued"
            t["assigned_node"] = None
        _save_tasks(tasks)
        _save_nodes(nodes)
        return {"success": True, "reassigned": reassigned}


# ---------- 后台自动转移循环（离线节点的任务自动 failover）----------
_reaper_task = None


def start_reaper_loop(interval_sec: int = 30) -> None:
    """启动后台循环：定时把离线节点上滞留的任务自动转移/重排队。
    实现需求「节点离线时任务自动转移」，无需人工触发。"""
    global _reaper_task
    import asyncio
    if _reaper_task is not None and not _reaper_task.done():
        return

    async def _loop():
        while True:
            try:
                await asyncio.sleep(max(10, int(interval_sec)))
                res = reap_stale_tasks()
                if res.get("reassigned"):
                    print(f"[orchestrator] 自动转移离线节点任务：{res['reassigned']} 个")
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[orchestrator] 自动转移循环异常: {e}")

    try:
        _reaper_task = asyncio.create_task(_loop())
        print("[orchestrator] 集群任务自动转移循环已启动")
    except RuntimeError:
        # 无运行中的事件循环（极少数），交由 startup 重试
        _reaper_task = None
