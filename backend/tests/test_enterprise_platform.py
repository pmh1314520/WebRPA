# -*- coding: utf-8 -*-
"""企业级平台能力单元测试：RBAC / 审计哈希链 / 审批 / 凭据保险库 / 集群路由 / IDP 校验 / 流程挖掘"""
import importlib
from pathlib import Path

import pytest


@pytest.fixture
def data_dir(tmp_path, monkeypatch):
    """把所有企业服务的数据目录与文件常量重定向到临时目录，并清缓存，保证隔离。"""
    d = tmp_path / "data"
    d.mkdir(parents=True, exist_ok=True)

    import app.services.rbac as rbac
    import app.services.audit_log as audit_log
    import app.services.approval_center as approval_center
    import app.services.credential_manager as cred
    import app.services.credential_vault as vault
    import app.services.orchestrator as orch

    # rbac
    monkeypatch.setattr(rbac, "_DATA_DIR", d)
    monkeypatch.setattr(rbac, "_RBAC_FILE", d / "rbac.json")
    monkeypatch.setattr(rbac, "_SESS_FILE", d / "sessions.json")
    monkeypatch.setattr(rbac, "_SECRET_FILE", d / ".rbac_secret")
    monkeypatch.setattr(rbac, "_secret", None)
    rbac.invalidate_cache()

    # audit
    monkeypatch.setattr(audit_log, "_DATA_DIR", d)
    monkeypatch.setattr(audit_log, "_LOG_FILE", d / "audit_log.jsonl")
    monkeypatch.setattr(audit_log, "_ARCHIVE_DIR", d / "audit_archive")
    monkeypatch.setattr(audit_log, "_CHECKPOINT_FILE", d / "audit_checkpoint.json")
    audit_log.invalidate_cache()

    # approval
    monkeypatch.setattr(approval_center, "_DATA_DIR", d)
    monkeypatch.setattr(approval_center, "_FILE", d / "approvals.json")
    approval_center.invalidate_cache()

    # credential manager
    monkeypatch.setattr(cred, "_DATA_DIR", d)
    monkeypatch.setattr(cred, "_KEY_FILE", d / ".cred_key")
    monkeypatch.setattr(cred, "_STORE_FILE", d / "credentials.enc")
    monkeypatch.setattr(cred, "_fernet", None)
    cred.invalidate_cache()

    # vault
    monkeypatch.setattr(vault, "_DATA_DIR", d)
    monkeypatch.setattr(vault, "_ACL_FILE", d / "vault_acl.json")
    vault.invalidate_cache()

    # orchestrator
    monkeypatch.setattr(orch, "_DATA_DIR", d)
    monkeypatch.setattr(orch, "_NODES_FILE", d / "robots.json")
    monkeypatch.setattr(orch, "_TASKS_FILE", d / "cluster_tasks.json")
    monkeypatch.setattr(orch, "_ENROLL_FILE", d / "cluster_enroll.json")
    orch.invalidate_cache()

    return d


# ---------- RBAC ----------
def test_rbac_login_and_permission(data_dir):
    import app.services.rbac as rbac
    # 创建一个 operator 用户
    res = rbac.create_user("alice", "secret123", ["operator"], "Alice")
    assert res["success"], res
    login = rbac.login("alice", "secret123")
    assert login["success"]
    token = login["token"]
    session = rbac.resolve_session(token)
    assert session is not None
    assert "workflow.run" in session["permissions"]
    # operator 没有 rbac.manage
    assert not rbac.has_permission(session, "rbac.manage")
    assert rbac.has_permission(session, "workflow.run")


def test_rbac_wrong_password(data_dir):
    import app.services.rbac as rbac
    rbac.create_user("bob", "rightpw", ["viewer"])
    assert rbac.login("bob", "wrongpw")["success"] is False


def test_rbac_admin_has_all(data_dir):
    import app.services.rbac as rbac
    # admin 用户首启自动创建；直接取其会话需口令，改用角色权限判定
    perms = rbac._permissions_of(["admin"])
    assert perms == {"*"}


def test_rbac_session_revoke(data_dir):
    import app.services.rbac as rbac
    rbac.create_user("carol", "pw123456", ["viewer"])
    token = rbac.login("carol", "pw123456")["token"]
    assert rbac.resolve_session(token) is not None
    rbac.revoke_session(token)
    assert rbac.resolve_session(token) is None


# ---------- 审计哈希链 ----------
def test_audit_chain_valid(data_dir):
    import app.services.audit_log as audit_log
    audit_log.record("u1", "login", "u1")
    audit_log.record("u1", "workflow.run", "wf1")
    audit_log.record("u2", "credential.use", "c1")
    res = audit_log.verify_chain()
    assert res["valid"] is True
    assert res["count"] == 3


def test_audit_tamper_detected(data_dir):
    import app.services.audit_log as audit_log
    audit_log.record("u1", "login", "u1")
    audit_log.record("u1", "workflow.delete", "wf1")
    # 篡改第一条记录
    lines = audit_log._LOG_FILE.read_text(encoding="utf-8").splitlines()
    import json
    rec = json.loads(lines[0])
    rec["actor"] = "hacker"
    lines[0] = json.dumps(rec, ensure_ascii=False)
    audit_log._LOG_FILE.write_text("\n".join(lines) + "\n", encoding="utf-8")
    res = audit_log.verify_chain()
    assert res["valid"] is False


def test_audit_query_filter(data_dir):
    import app.services.audit_log as audit_log
    audit_log.record("alice", "login", "alice")
    audit_log.record("bob", "login", "bob")
    audit_log.record("alice", "workflow.run", "wf")
    only_alice = audit_log.query(actor="alice")
    assert len(only_alice) == 2
    runs = audit_log.query(action="workflow.run")
    assert len(runs) == 1


# ---------- 审批中心 ----------
def test_approval_flow(data_dir):
    import app.services.approval_center as ac
    r = ac.create_request("alice", "workflow.delete", "wf1", reason="清理")
    rid = r["request_id"]
    # 不能自己批自己
    self_decide = ac.decide(rid, "alice", True)
    assert self_decide["success"] is False
    # 他人批准
    dec = ac.decide(rid, "admin", True, "ok")
    assert dec["success"] and dec["status"] == "approved"
    grant = dec["grant_token"]
    # 消费令牌
    use = ac.consume_grant(rid, grant)
    assert use["ok"] is True
    # 重放被拒
    assert ac.consume_grant(rid, grant)["ok"] is False


def test_approval_reject(data_dir):
    import app.services.approval_center as ac
    r = ac.create_request("alice", "credential.delete", "c1")
    rid = r["request_id"]
    dec = ac.decide(rid, "admin", False, "驳回")
    assert dec["status"] == "rejected"
    assert ac.consume_grant(rid, "anything")["ok"] is False


# ---------- 凭据保险库 ----------
def test_vault_authorization(data_dir):
    import app.services.credential_manager as cred
    import app.services.credential_vault as vault
    cred.upsert_credential("db_prod", {"password": "s3cret"}, "生产库")
    # 设置 ACL：仅 dba 角色可访问
    vault.set_acl("db_prod", ["dba"])

    # 无权角色（viewer，只有 credential.view 无 credential.use）被拒
    viewer_session = {"username": "v", "roles": ["viewer"], "permissions": ["credential.view"]}
    denied = vault.get_field_authorized(viewer_session, "db_prod", "password")
    assert denied["success"] is False

    # dba 角色 + credential.use 被允许
    dba_session = {"username": "d", "roles": ["dba"], "permissions": ["credential.use"]}
    ok = vault.get_field_authorized(dba_session, "db_prod", "password")
    assert ok["success"] is True and ok["value"] == "s3cret"

    # 特权（credential.manage）无视 ACL
    admin_session = {"username": "a", "roles": ["admin"], "permissions": ["*"]}
    assert vault.get_field_authorized(admin_session, "db_prod", "password")["success"] is True


def test_vault_no_acl_denies_normal(data_dir):
    import app.services.credential_manager as cred
    import app.services.credential_vault as vault
    cred.upsert_credential("api_key", {"value": "abc"})
    # 未设 ACL：普通角色拒绝，特权允许
    normal = {"username": "n", "roles": ["operator"], "permissions": ["credential.use"]}
    assert vault.get_field_authorized(normal, "api_key")["success"] is False
    priv = {"username": "p", "roles": ["admin"], "permissions": ["credential.manage"]}
    assert vault.get_field_authorized(priv, "api_key")["success"] is True


# ---------- 集群路由 / failover ----------
def test_orchestrator_register_and_route(data_dir):
    import app.services.orchestrator as orch
    n1 = orch.register_node("机器A", tags=["finance"], capabilities=["excel"], max_concurrency=2)
    n2 = orch.register_node("机器B", tags=["finance"], capabilities=["excel"], max_concurrency=2)
    assert n1["success"] and n2["success"]
    # 心跳保活
    orch.heartbeat(n1["node_id"], n1["token"])
    orch.heartbeat(n2["node_id"], n2["token"])
    # 派发：应分到某在线节点
    t = orch.submit_task("wf.json", constraints={"tags": ["finance"]})
    assert t["status"] == "assigned"
    assert t["assigned_node"] in (n1["node_id"], n2["node_id"])


def test_orchestrator_constraint_no_match(data_dir):
    import app.services.orchestrator as orch
    n = orch.register_node("机器C", tags=["web"], capabilities=[])
    orch.heartbeat(n["node_id"], n["token"])
    # 要求 gpu 能力，无节点满足 → queued
    t = orch.submit_task("wf.json", constraints={"capabilities": ["gpu"]})
    assert t["status"] == "queued"
    assert t["assigned_node"] is None


def test_orchestrator_failover(data_dir):
    import app.services.orchestrator as orch
    n1 = orch.register_node("A", max_concurrency=2)
    n2 = orch.register_node("B", max_concurrency=2)
    orch.heartbeat(n1["node_id"], n1["token"])
    orch.heartbeat(n2["node_id"], n2["token"])
    t = orch.submit_task("wf.json", max_failover=2)
    tid = t["task_id"]
    first_node = t["assigned_node"]
    first_token = n1["token"] if first_node == n1["node_id"] else n2["token"]
    # 第一个节点上报失败 → 应转移到另一个节点
    rep = orch.report_result(first_node, first_token, tid, success=False)
    assert rep["status"] == "failover"
    assert rep["new_node"] != first_node


def test_orchestrator_load_balance(data_dir):
    import app.services.orchestrator as orch
    n1 = orch.register_node("A", max_concurrency=5)
    n2 = orch.register_node("B", max_concurrency=5)
    orch.heartbeat(n1["node_id"], n1["token"])
    orch.heartbeat(n2["node_id"], n2["token"])
    # 连续派发应在两台之间分摊
    assigned = []
    for _ in range(4):
        t = orch.submit_task("wf.json")
        assigned.append(t["assigned_node"])
    # 两台都应被用到（负载均衡）
    assert len(set(assigned)) == 2


# ---------- IDP 字段校验 ----------
def test_idp_template_validation():
    import app.services.idp_service as idp
    tpl = idp.get_template("invoice")
    assert tpl is not None
    # 缺必填 invoice_number / total
    issues = idp._validate_fields(tpl, {"invoice_date": "2026-01-01", "seller_name": "公司"})
    errs = [i for i in issues if i["level"] == "error"]
    fields = {i["field"] for i in errs}
    assert "invoice_number" in fields
    assert "total" in fields


def test_idp_templates_listed():
    import app.services.idp_service as idp
    keys = {t["key"] for t in idp.list_templates()}
    assert {"invoice", "contract", "resume", "form"}.issubset(keys)


# ---------- 流程挖掘 ----------
def test_process_mining_stats():
    import app.services.process_mining as pm
    records = [
        {"trace_id": "t1", "steps": [
            {"name": "打开", "duration_ms": 100, "status": "ok"},
            {"name": "填表", "duration_ms": 500, "status": "ok"},
            {"name": "提交", "duration_ms": 200, "status": "ok"},
        ]},
        {"trace_id": "t2", "steps": [
            {"name": "打开", "duration_ms": 120, "status": "ok"},
            {"name": "填表", "duration_ms": 800, "status": "failed"},
        ]},
    ]
    res = pm.mine(records)
    assert res["success"]
    assert res["total_traces"] == 2
    # 瓶颈应是"填表"（平均耗时最高）
    assert res["bottlenecks"][0]["step"] == "填表"
    # 有一个失败步骤
    assert any(f["step"] == "填表" for f in res["failed_steps"])


def test_process_mining_empty():
    import app.services.process_mining as pm
    assert pm.mine([])["success"] is False


# ---------- enterprise_llm 辅助 ----------
def test_extract_json_variants():
    from app.services import enterprise_llm
    assert enterprise_llm.extract_json('{"a":1}') == {"a": 1}
    assert enterprise_llm.extract_json('```json\n{"a":1}\n```') == {"a": 1}
    assert enterprise_llm.extract_json('前言 {"a":1,"b":[1,2]} 后语') == {"a": 1, "b": [1, 2]}
    assert enterprise_llm.extract_json('解释\n```\n[1,2,3]\n```') == [1, 2, 3]
    assert enterprise_llm.extract_json("不是json") is None


def test_llm_config_none_when_unconfigured(monkeypatch):
    from app.services import enterprise_llm
    monkeypatch.setattr(enterprise_llm, "_load_shared_cfg", lambda: {})
    assert enterprise_llm.build_llm_config() is None
    assert enterprise_llm.build_llm_config(vision=True) is None


def test_llm_config_vision_prefers_vision_model(monkeypatch):
    from app.services import enterprise_llm
    monkeypatch.setattr(enterprise_llm, "_load_shared_cfg", lambda: {
        "aiAssistant": {"apiUrl": "http://x/v1", "apiKey": "k", "model": "text-m",
                        "visionModel": "vis-m"}
    })
    assert enterprise_llm.build_llm_config().model == "text-m"
    assert enterprise_llm.build_llm_config(vision=True).model == "vis-m"


# ---------- Computer-Use 坐标映射 ----------
def test_computer_use_coordinate_mapping():
    from app.services import computer_use_agent
    # 归一化 500/1000 → 屏幕中点
    assert computer_use_agent._norm_to_real(500, 500, 1920, 1080) == (960, 540)
    # 边界裁剪
    assert computer_use_agent._norm_to_real(1000, 1000, 1920, 1080) == (1919, 1079)
    assert computer_use_agent._norm_to_real(0, 0, 1920, 1080) == (0, 0)
    # 非法输入兜底到中点
    assert computer_use_agent._norm_to_real("bad", None, 1920, 1080) == (960, 540)


# ---------- 未配置模型时的优雅降级（不崩溃，返回明确错误）----------
@pytest.mark.asyncio
async def test_computer_use_graceful_without_model(monkeypatch):
    from app.services import computer_use_agent, enterprise_llm
    monkeypatch.setattr(enterprise_llm, "build_llm_config", lambda vision=False: None)
    res = await computer_use_agent.run_session("打开记事本", max_steps=3)
    assert res["success"] is False
    assert "模型" in res["error"]


@pytest.mark.asyncio
async def test_idp_graceful_without_model(monkeypatch):
    from app.services import idp_service, enterprise_llm
    monkeypatch.setattr(enterprise_llm, "build_llm_config", lambda vision=False: None)
    # 构造一张最小 PNG
    import io
    from PIL import Image
    buf = io.BytesIO()
    Image.new("RGB", (10, 10), "white").save(buf, format="PNG")
    res = await idp_service.extract(buf.getvalue(), "x.png", "invoice")
    assert res["success"] is False
    assert "模型" in res["error"]


@pytest.mark.asyncio
async def test_idp_unknown_doc_type(monkeypatch):
    from app.services import idp_service
    res = await idp_service.extract(b"x", "x.png", "nonexistent_type")
    assert res["success"] is False


@pytest.mark.asyncio
async def test_process_mining_infer_graceful_without_model(monkeypatch):
    from app.services import process_mining, enterprise_llm
    monkeypatch.setattr(enterprise_llm, "build_llm_config", lambda vision=False: None)
    res = await process_mining.infer_workflow([{"type": "click", "target": "btn"}])
    assert res["success"] is False
    assert "模型" in res["error"]


# ---------- HTTP API 层端到端（TestClient，无需 LLM）----------
@pytest.fixture
def api_client(data_dir):
    """构造仅挂载企业路由的最小 FastAPI 应用，避开全局鉴权中间件，专测路由/模型/权限。"""
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from app.api.rbac import router as rbac_router
    from app.api.orchestrator import router as orchestrator_router
    from app.api.idp import router as idp_router
    from app.api.audit import router as audit_router
    from app.api.approvals import router as approvals_router
    from app.api.enterprise_overview import router as overview_router

    app = FastAPI()
    for r in (rbac_router, orchestrator_router, idp_router, audit_router, approvals_router,
              overview_router):
        app.include_router(r)
    return TestClient(app)


def _admin_token(api_client):
    """用服务层直接种一个 admin 用户，再走 API 登录拿 token（验证登录链路）。"""
    import app.services.rbac as rbac
    rbac.create_user("root", "rootpw123", ["admin"], "Root")
    resp = api_client.post("/api/rbac/login", json={"username": "root", "password": "rootpw123"})
    assert resp.status_code == 200, resp.text
    return resp.json()["token"]


def test_api_login_and_me(api_client):
    token = _admin_token(api_client)
    me = api_client.get("/api/rbac/me", headers={"x-webrpa-session": token})
    assert me.status_code == 200
    assert me.json()["user"]["username"] == "root"
    # 无 token 访问受保护接口被拒
    assert api_client.get("/api/rbac/users").status_code == 403


def test_api_login_bad_password(api_client):
    import app.services.rbac as rbac
    rbac.create_user("u1", "goodpw123", ["viewer"])
    resp = api_client.post("/api/rbac/login", json={"username": "u1", "password": "bad"})
    assert resp.status_code == 401


def test_api_idp_templates_public(api_client):
    resp = api_client.get("/api/idp/templates")
    assert resp.status_code == 200
    keys = {t["key"] for t in resp.json()["templates"]}
    assert "invoice" in keys


def test_api_cluster_full_flow(api_client):
    token = _admin_token(api_client)
    h = {"x-webrpa-session": token}
    # 无权限（无 token）不能派发
    assert api_client.post("/api/orchestrator/tasks", json={"workflow": "w.json"}).status_code == 403
    # 注册两台执行机（无需 session）
    n1 = api_client.post("/api/orchestrator/nodes/register",
                         json={"name": "A", "max_concurrency": 2}).json()
    n2 = api_client.post("/api/orchestrator/nodes/register",
                         json={"name": "B", "max_concurrency": 2}).json()
    api_client.post("/api/orchestrator/nodes/heartbeat",
                    json={"node_id": n1["node_id"], "token": n1["token"]})
    api_client.post("/api/orchestrator/nodes/heartbeat",
                    json={"node_id": n2["node_id"], "token": n2["token"]})
    # admin 派发任务
    sub = api_client.post("/api/orchestrator/tasks", json={"workflow": "w.json", "max_failover": 2},
                          headers=h)
    assert sub.status_code == 200, sub.text
    tid = sub.json()["task_id"]
    assigned = sub.json()["assigned_node"]
    assert assigned in (n1["node_id"], n2["node_id"])
    # 被分配的节点领取任务
    tok = n1["token"] if assigned == n1["node_id"] else n2["token"]
    claim = api_client.post("/api/orchestrator/nodes/claim",
                            json={"node_id": assigned, "token": tok, "max_take": 5})
    assert claim.status_code == 200
    assert any(t["task_id"] == tid for t in claim.json()["tasks"])
    # 上报失败 → failover 到另一台
    rep = api_client.post("/api/orchestrator/nodes/report",
                          json={"node_id": assigned, "token": tok, "task_id": tid, "success": False})
    assert rep.status_code == 200
    assert rep.json()["status"] == "failover"
    # 概览可见
    ov = api_client.get("/api/orchestrator/overview", headers=h)
    assert ov.status_code == 200
    assert ov.json()["overview"]["nodes_online"] == 2


def test_api_node_bad_token_rejected(api_client):
    n = api_client.post("/api/orchestrator/nodes/register", json={"name": "A"}).json()
    resp = api_client.post("/api/orchestrator/nodes/heartbeat",
                           json={"node_id": n["node_id"], "token": "wrong"})
    assert resp.status_code == 401


def test_api_approval_flow(api_client):
    import app.services.rbac as rbac
    token = _admin_token(api_client)
    # 另建一个 operator 发起审批
    rbac.create_user("op", "oppw1234", ["operator"])
    op_token = api_client.post("/api/rbac/login",
                               json={"username": "op", "password": "oppw1234"}).json()["token"]
    created = api_client.post("/api/approvals",
                              json={"action": "workflow.delete", "target": "wf1", "reason": "清理"},
                              headers={"x-webrpa-session": op_token})
    assert created.status_code == 200, created.text
    rid = created.json()["request_id"]
    # admin 批准
    dec = api_client.post(f"/api/approvals/{rid}/decide", json={"approved": True, "comment": "ok"},
                          headers={"x-webrpa-session": token})
    assert dec.status_code == 200 and dec.json()["status"] == "approved"
    # viewer 无 approval.decide 权限
    rbac.create_user("vv", "vvpw1234", ["viewer"])
    vv_token = api_client.post("/api/rbac/login",
                               json={"username": "vv", "password": "vvpw1234"}).json()["token"]
    created2 = api_client.post("/api/approvals",
                               json={"action": "workflow.delete", "target": "wf2"},
                               headers={"x-webrpa-session": op_token}).json()
    forbidden = api_client.post(f"/api/approvals/{created2['request_id']}/decide",
                                json={"approved": True},
                                headers={"x-webrpa-session": vv_token})
    assert forbidden.status_code == 403


def test_api_audit_records_login(api_client):
    token = _admin_token(api_client)
    logs = api_client.get("/api/audit/logs", headers={"x-webrpa-session": token})
    assert logs.status_code == 200
    actions = {l["action"] for l in logs.json()["logs"]}
    assert "rbac.login" in actions
    verify = api_client.get("/api/audit/verify", headers={"x-webrpa-session": token})
    assert verify.json()["result"]["valid"] is True


# ---------- 全局 RBAC 强制开关与路径权限映射 ----------
def test_rbac_enforcement_toggle(data_dir, monkeypatch):
    import app.services.rbac as rbac
    monkeypatch.setattr(rbac, "_ENFORCE_FILE", data_dir / "rbac_enforce.json")
    assert rbac.is_enforced() is False
    rbac.set_enforced(True)
    assert rbac.is_enforced() is True
    rbac.set_enforced(False)
    assert rbac.is_enforced() is False


def test_rbac_path_permission_mapping():
    import app.services.rbac as rbac
    assert rbac.required_permission_for("GET", "/api/credentials") == "credential.view"
    assert rbac.required_permission_for("POST", "/api/credentials") == "credential.manage"
    assert rbac.required_permission_for("GET", "/api/workflows/x") == "workflow.view"
    assert rbac.required_permission_for("POST", "/api/workflows") == "workflow.edit"
    # 未映射路径 → None（仅需登录）
    assert rbac.required_permission_for("GET", "/api/something-else") is None
    # 扩展覆盖：创作类端点读=view 写=edit；系统级=run
    assert rbac.required_permission_for("GET", "/api/plugins") == "workflow.view"
    assert rbac.required_permission_for("POST", "/api/plugins") == "workflow.edit"
    assert rbac.required_permission_for("POST", "/api/custom-modules") == "workflow.edit"
    assert rbac.required_permission_for("GET", "/api/image-assets") == "workflow.view"
    assert rbac.required_permission_for("DELETE", "/api/image-assets/1") == "workflow.edit"
    assert rbac.required_permission_for("POST", "/api/system/shutdown") == "workflow.run"
    assert rbac.required_permission_for("POST", "/api/system-macro/run") == "workflow.run"
    # workflow-versions 不应被 workflows 规则误命中
    assert rbac.required_permission_for("GET", "/api/workflow-versions") == "workflow.view"


def test_rbac_enforce_exempt():
    import app.services.rbac as rbac
    assert rbac.is_enforce_exempt("/api/rbac/login")
    assert rbac.is_enforce_exempt("/api/orchestrator/nodes/heartbeat")
    assert rbac.is_enforce_exempt("/console/enterprise")
    assert not rbac.is_enforce_exempt("/api/orchestrator/tasks")


def test_enterprise_console_page(api_client):
    # 企业控制中心页面（无需登录即可拿到 HTML 外壳）
    from fastapi.testclient import TestClient
    from app.api.enterprise_console import router
    from fastapi import FastAPI
    app = FastAPI()
    app.include_router(router)
    c = TestClient(app)
    r = c.get("/console/enterprise")
    assert r.status_code == 200
    assert "企业控制中心" in r.text
    assert "renderLogin" in r.text


# ---------- 全局强制中间件集成测试（真实 app + 两层中间件）----------
def test_global_enforcement_middleware(data_dir, monkeypatch):
    import app.main as main
    import app.services.rbac as rbac
    import app.services.security_manager as sec
    from fastapi.testclient import TestClient

    monkeypatch.setattr(rbac, "_ENFORCE_FILE", data_dir / "rbac_enforce.json")
    # 关闭 token 鉴权层，单独验证 RBAC 强制层（两层逻辑独立，避免相互干扰）
    monkeypatch.setattr(sec, "is_enabled", lambda: False)

    # 种 admin 用户并登录拿会话
    rbac.create_user("root", "rootpw123", ["admin"])
    client = TestClient(main.app)

    # 未开启强制：远程无会话也能访问（登录端点公共）
    login = client.post("/api/rbac/login", json={"username": "root", "password": "rootpw123"})
    assert login.status_code == 200
    token = login.json()["token"]

    # 开启全局强制
    rbac.set_enforced(True)
    try:
        # 远程无会话访问受保护接口 → 401
        r1 = client.get("/api/orchestrator/overview")
        assert r1.status_code == 401, r1.text
        # 携带有效会话 → 放行（admin 有 cluster.view）
        r2 = client.get("/api/orchestrator/overview", headers={"x-webrpa-session": token})
        assert r2.status_code == 200, r2.text
        # 登录端点始终可达
        assert client.post("/api/rbac/login",
                           json={"username": "root", "password": "rootpw123"}).status_code == 200
        # 执行机心跳端点豁免（无会话也可达，节点 token 自校验）
        hb = client.post("/api/orchestrator/nodes/heartbeat",
                         json={"node_id": "x", "token": "y"})
        assert hb.status_code in (200, 401)  # 到达了业务层（节点不存在→401业务错误），未被中间件拦截为"需登录"
        assert hb.json().get("detail") != "需要登录：请在 x-webrpa-session 头携带有效会话令牌"
    finally:
        rbac.set_enforced(False)


def test_orchestrator_offline_node_reap(data_dir, monkeypatch):
    import time as _time
    import app.services.orchestrator as orch
    n1 = orch.register_node("A", max_concurrency=2)
    n2 = orch.register_node("B", max_concurrency=2)
    orch.heartbeat(n1["node_id"], n1["token"])
    orch.heartbeat(n2["node_id"], n2["token"])
    t = orch.submit_task("wf.json", max_failover=3)
    tid = t["task_id"]
    assigned = t["assigned_node"]
    # 让被分配节点"离线"：把心跳时间改早，并标记 offline
    nodes = orch._load_nodes()
    nodes[assigned]["last_heartbeat"] = _time.time() - 9999
    orch._save_nodes(nodes)
    # 另一台保持在线
    other = n2["node_id"] if assigned == n1["node_id"] else n1["node_id"]
    orch.heartbeat(other, n2["token"] if other == n2["node_id"] else n1["token"])
    res = orch.reap_stale_tasks()
    assert res["reassigned"] >= 1
    task = orch.get_task(tid)
    assert task["assigned_node"] == other


def test_approval_execute_node_remove(data_dir):
    import app.services.approval_center as ac
    import app.services.orchestrator as orch
    n = orch.register_node("A")
    nid = n["node_id"]
    r = ac.create_request("op", "node.remove", nid, payload={"node_id": nid})
    rid = r["request_id"]
    ac.decide(rid, "admin", True)
    res = ac.execute_by_id(rid, "op")
    assert res["success"] is True
    assert res["executed"] == "node.remove"
    # 节点已被真正移除
    assert all(x["node_id"] != nid for x in orch.list_nodes())
    # 不能重复执行
    assert ac.execute_by_id(rid, "op")["success"] is False


def test_approval_execute_requires_approval_first(data_dir):
    import app.services.approval_center as ac
    r = ac.create_request("op", "node.remove", "x", payload={"node_id": "x"})
    # 未批准不能执行
    assert ac.execute_by_id(r["request_id"], "op")["success"] is False


def test_approval_execute_unsupported_action(data_dir):
    import app.services.approval_center as ac
    r = ac.create_request("op", "rbac.role_change", "x", payload={})
    ac.decide(r["request_id"], "admin", True)
    res = ac.execute_by_id(r["request_id"], "op")
    # 令牌被消费，但动作不支持自动执行
    assert res["success"] is False
    assert "不支持" in res["error"]


@pytest.mark.asyncio
async def test_computer_use_loop_detection(monkeypatch):
    """Agent 连续给出相同动作时应触发循环检测提前失败（桩模型/桩屏幕，不碰真机）。"""
    from app.services import computer_use_agent as cua, enterprise_llm, audit_log

    monkeypatch.setattr(enterprise_llm, "build_llm_config", lambda vision=False: object())

    async def fake_vision(system, user, images, **kw):
        return '{"action":"click","x":100,"y":100,"reason":"repeat"}'

    monkeypatch.setattr(enterprise_llm, "vision_chat", fake_vision)
    monkeypatch.setattr(cua, "_grab_screenshot", lambda: ("b64", 1920, 1080))
    monkeypatch.setattr(cua, "_execute_action", lambda a, w, h: {"ok": True, "executed": "click"})
    # 避免污染真实数据目录：会话保存与审计写入桩掉
    monkeypatch.setattr(cua, "_save_session", lambda s: None)
    monkeypatch.setattr(audit_log, "record", lambda *a, **k: None)

    res = await cua.run_session("做点什么", max_steps=10, actor="t")
    assert res["success"] is False
    assert "循环" in res["reason"]
    # 循环检测应在远早于 max_steps 处终止
    assert res["steps"] <= 4


def test_orchestrator_enrollment_secret(data_dir):
    import app.services.orchestrator as orch
    # 默认无密钥：注册放行
    assert orch.register_node("A")["success"] is True
    # 设置密钥后：无密钥/错密钥拒绝，正确密钥放行
    orch.set_enrollment_secret("s3cr3t")
    assert orch.register_node("B")["success"] is False
    assert orch.register_node("C", enroll_secret="wrong")["success"] is False
    ok = orch.register_node("D", enroll_secret="s3cr3t")
    assert ok["success"] is True
    # 清空密钥后恢复开放
    orch.set_enrollment_secret("")
    assert orch.register_node("E")["success"] is True


@pytest.mark.asyncio
async def test_computer_use_stop(monkeypatch):
    from app.services import computer_use_agent as cua, enterprise_llm, audit_log
    monkeypatch.setattr(enterprise_llm, "build_llm_config", lambda vision=False: object())

    async def fake_vision(system, user, images, **kw):
        # 第一步后立刻请求停止，验证下一轮被拦截
        cua.request_stop()
        return '{"action":"move","x":10,"y":10,"reason":"step"}'

    monkeypatch.setattr(enterprise_llm, "vision_chat", fake_vision)
    monkeypatch.setattr(cua, "_grab_screenshot", lambda: ("b64", 1920, 1080))
    monkeypatch.setattr(cua, "_execute_action", lambda a, w, h: {"ok": True, "executed": "move"})
    monkeypatch.setattr(cua, "_save_session", lambda s: None)
    monkeypatch.setattr(audit_log, "record", lambda *a, **k: None)

    res = await cua.run_session("做点什么", max_steps=10)
    assert res["success"] is False
    assert "停止" in res["reason"]
    assert res["steps"] <= 2


def test_audit_cache_seq_monotonic(data_dir):
    """缓存优化后 seq 仍单调递增且哈希链完整。"""
    import app.services.audit_log as audit_log
    for i in range(5):
        audit_log.record("u", "act", str(i))
    logs = audit_log.query(limit=10)
    seqs = sorted(l["seq"] for l in logs)
    assert seqs == [1, 2, 3, 4, 5]
    assert audit_log.verify_chain()["valid"] is True


def test_audit_pagination_and_export(data_dir):
    import app.services.audit_log as audit_log
    import json as _json
    for i in range(7):
        audit_log.record("u", "act", f"t{i}")
    # 总数
    assert audit_log.count() == 7
    # 分页：倒序，offset
    page1 = audit_log.query(limit=3, offset=0)
    page2 = audit_log.query(limit=3, offset=3)
    assert len(page1) == 3 and len(page2) == 3
    assert page1[0]["seq"] == 7  # 最新在前
    assert page2[0]["seq"] == 4
    assert {r["seq"] for r in page1}.isdisjoint({r["seq"] for r in page2})
    # 导出 jsonl
    jl = audit_log.export_text("jsonl")
    lines = [l for l in jl.splitlines() if l.strip()]
    assert len(lines) == 7
    assert _json.loads(lines[0])["seq"] == 1  # 导出正序
    # 导出 csv（含表头 + BOM）
    csv_text = audit_log.export_text("csv")
    assert csv_text.startswith("\ufeff")
    assert "seq,ts,actor,action" in csv_text
    assert csv_text.count("\n") >= 8  # 表头 + 7 行


def test_audit_export_filtered(data_dir):
    import app.services.audit_log as audit_log
    audit_log.record("alice", "login", "alice")
    audit_log.record("bob", "run", "wf")
    audit_log.record("alice", "run", "wf2")
    jl = audit_log.export_text("jsonl", actor="alice")
    assert len([l for l in jl.splitlines() if l.strip()]) == 2


def test_approval_creation_notifies(data_dir, monkeypatch):
    import app.services.approval_center as ac
    import app.services.alert_center as alert_center
    calls = []
    monkeypatch.setattr(alert_center, "notify_event", lambda title, content: calls.append((title, content)))
    ac.create_request("op", "workflow.delete", "wf1", reason="清理")
    assert len(calls) == 1
    assert "审批" in calls[0][0]


def test_cluster_final_failure_notifies(data_dir, monkeypatch):
    import app.services.orchestrator as orch
    import app.services.alert_center as alert_center
    calls = []
    monkeypatch.setattr(alert_center, "notify_event", lambda title, content: calls.append((title, content)))
    n = orch.register_node("A")
    orch.heartbeat(n["node_id"], n["token"])
    t = orch.submit_task("wf.json", max_failover=0)  # 不允许转移，失败即终态
    rep = orch.report_result(n["node_id"], n["token"], t["task_id"], success=False)
    assert rep["status"] == "failed"
    assert len(calls) == 1
    assert "集群" in calls[0][0]


def test_notify_event_disabled_is_noop(data_dir, monkeypatch):
    """未启用告警时 notify_event 不应发送（不起线程、不报错）。"""
    import app.services.alert_center as alert_center
    monkeypatch.setattr(alert_center, "get_config", lambda: {"enabled": False, "channels": []})
    sent = []
    monkeypatch.setattr(alert_center, "notify_all", lambda ch, t, c: sent.append(1))
    alert_center.notify_event("t", "c")
    import time as _t
    _t.sleep(0.1)
    assert sent == []


def test_enterprise_overview_permission_gated(api_client):
    """总览按权限分段：admin 看到全部，viewer 看不到 rbac 段。"""
    import app.services.rbac as rbac

    # admin
    admin_token = _admin_token(api_client)
    r = api_client.get("/api/enterprise/overview", headers={"x-webrpa-session": admin_token})
    assert r.status_code == 200
    secs = r.json()["sections"]
    assert "rbac" in secs and "audit" in secs and "cluster" in secs and "vault" in secs

    # viewer：仅有 cluster.view/credential.view/audit.view（viewer 预置含这些），无 rbac.manage
    rbac.create_user("vov", "vovpw123", ["viewer"])
    vt = api_client.post("/api/rbac/login",
                         json={"username": "vov", "password": "vovpw123"}).json()["token"]
    r2 = api_client.get("/api/enterprise/overview", headers={"x-webrpa-session": vt})
    secs2 = r2.json()["sections"]
    assert "rbac" not in secs2          # 无 rbac.manage
    assert "cluster" in secs2           # viewer 有 cluster.view
    assert "audit" in secs2             # viewer 有 audit.view

    # 未登录 → 401
    assert api_client.get("/api/enterprise/overview").status_code == 401


def test_audit_rotation_keeps_chain(data_dir, monkeypatch):
    """超过阈值自动归档轮转后：归档文件生成、seq 连续、哈希链仍可校验。"""
    import app.services.audit_log as audit_log
    monkeypatch.setattr(audit_log, "MAX_LINES", 5)
    # 写 12 条 → 应触发至少 2 次轮转（每 5 条归档）
    for i in range(12):
        audit_log.record("u", "act", f"t{i}")
    archives = audit_log.list_archives()
    assert len(archives) >= 2, archives
    # 轮转后当前文件的链从检查点起仍有效
    assert audit_log.verify_chain()["valid"] is True
    # seq 全局连续：最新一条 seq 应为 12
    cur = audit_log.query(limit=1)
    assert cur[0]["seq"] == 12
    # 检查点记录了归档前的 last_seq
    cp = audit_log._load_checkpoint()
    assert cp is not None and cp.get("last_seq", 0) >= 10


def test_audit_rotation_tamper_still_detected(data_dir, monkeypatch):
    """轮转后，篡改当前文件仍能被 verify_chain 检测到。"""
    import app.services.audit_log as audit_log
    import json as _json
    monkeypatch.setattr(audit_log, "MAX_LINES", 4)
    for i in range(10):
        audit_log.record("u", "act", f"t{i}")
    # 篡改当前活动文件的某条记录
    lines = audit_log._LOG_FILE.read_text(encoding="utf-8").splitlines()
    rec = _json.loads(lines[0])
    rec["actor"] = "hacker"
    lines[0] = _json.dumps(rec, ensure_ascii=False)
    audit_log._LOG_FILE.write_text("\n".join(lines) + "\n", encoding="utf-8")
    assert audit_log.verify_chain()["valid"] is False


def test_cluster_node_arg_parsing():
    import cluster_node
    import types
    args = types.SimpleNamespace(
        server="http://x:5241/", name="A", tags="finance, excel ",
        capabilities="excel", max_concurrency=0, enroll_secret="s",
        poll_interval=1, show_browser=False)
    node = cluster_node.ClusterNode(args)
    assert node.server == "http://x:5241"  # 去尾斜杠
    assert node.tags == ["finance", "excel"]
    assert node.capabilities == ["excel"]
    assert node.max_concurrency == 1   # 下限钳制
    assert node.poll_interval == 2     # 下限钳制
    assert node.headless is True


@pytest.mark.asyncio
async def test_cluster_node_run_task_reports(monkeypatch):
    import cluster_node
    import types

    async def fake_run_workflow(wf, **kw):
        return {"success": True, "status": "success", "executed_nodes": 3,
                "failed_nodes": 0, "duration_ms": 10}

    import app.services.workflow_runner as wr
    monkeypatch.setattr(wr, "run_workflow", fake_run_workflow)

    posted = {}

    class FakeClient:
        async def post(self, url, json=None):
            posted["url"] = url
            posted["json"] = json
            class R:
                status_code = 200
            return R()

    args = types.SimpleNamespace(server="http://x", name="A", tags="", capabilities="",
                                 max_concurrency=2, enroll_secret="", poll_interval=3,
                                 show_browser=False)
    node = cluster_node.ClusterNode(args)
    node.node_id = "n1"; node.token = "t1"
    await node._run_task(FakeClient(), {"task_id": "ct1", "workflow": "wf.json"})
    assert posted["url"].endswith("/api/orchestrator/nodes/report")
    assert posted["json"]["task_id"] == "ct1"
    assert posted["json"]["success"] is True
    assert node._active == 0  # 执行完归还并发额度


def test_rbac_session_management(data_dir):
    import app.services.rbac as rbac
    rbac.create_user("sm", "smpw1234", ["operator"])
    t1 = rbac.login("sm", "smpw1234")["token"]
    t2 = rbac.login("sm", "smpw1234")["token"]
    active = rbac.list_active_sessions()
    assert sum(1 for s in active if s["username"] == "sm") == 2
    # 完整令牌不应被列出
    assert all("token" not in s or s.get("token") is None for s in active)
    # 强制吊销 → 两个会话都失效
    n = rbac.revoke_user_sessions("sm")
    assert n == 2
    assert rbac.resolve_session(t1) is None
    assert rbac.resolve_session(t2) is None


def test_rbac_disable_revokes_sessions(data_dir):
    import app.services.rbac as rbac
    rbac.create_user("du", "dupw1234", ["viewer"])
    tok = rbac.login("du", "dupw1234")["token"]
    assert rbac.resolve_session(tok) is not None
    rbac.update_user("du", disabled=True)
    # 禁用后会话被吊销且无法再解析
    assert rbac.resolve_session(tok) is None


def test_rbac_delete_revokes_sessions(data_dir):
    import app.services.rbac as rbac
    rbac.create_user("dd", "ddpw1234", ["viewer"])
    tok = rbac.login("dd", "ddpw1234")["token"]
    rbac.delete_user("dd")
    assert rbac.resolve_session(tok) is None
    assert all(s["username"] != "dd" for s in rbac.list_active_sessions())


def test_rbac_login_lockout(data_dir):
    import app.services.rbac as rbac
    rbac.create_user("lk", "correctpw", ["viewer"])
    # 连续 5 次错误口令后锁定
    for _ in range(rbac._LOGIN_MAX_FAILS):
        assert rbac.login("lk", "wrong")["success"] is False
    res = rbac.login("lk", "wrong")
    assert res.get("locked") is True
    # 锁定期间即使口令正确也拒绝
    res2 = rbac.login("lk", "correctpw")
    assert res2["success"] is False and res2.get("locked") is True


def test_rbac_login_success_clears_failures(data_dir):
    import app.services.rbac as rbac
    rbac.create_user("lk2", "correctpw", ["viewer"])
    # 少量失败后成功登录应清零，不影响后续
    rbac.login("lk2", "wrong")
    rbac.login("lk2", "wrong")
    assert rbac.login("lk2", "correctpw")["success"] is True
    assert "lk2" not in rbac._login_failures
    # 成功后再失败计数从头算，不会立刻锁
    assert rbac.login("lk2", "wrong")["success"] is False
    assert rbac.login("lk2", "correctpw")["success"] is True


@pytest.mark.asyncio
async def test_v11_butler_skills(data_dir):
    """管家技能：查询总览/用户/会话，以及变更类（建用户/吊销会话）真生效。"""
    from app.services import ai_assistant_skills_v11 as v11
    import app.services.rbac as rbac

    # 查询：总览
    ov = await v11.skill_enterprise_overview()
    assert "rbac" in ov and "cluster" in ov and "audit" in ov

    # 变更：建用户（管家代办）
    res = await v11.skill_create_user("butler_u", "pw123456", ["operator"], "管家建的")
    assert res.get("success") is True
    assert any(u["username"] == "butler_u" for u in rbac.list_users())

    # 登录产生会话 → 管家列出 → 强制下线
    tok = rbac.login("butler_u", "pw123456")["token"]
    sessions = await v11.skill_list_sessions()
    assert any(s["username"] == "butler_u" for s in sessions["sessions"])
    rev = await v11.skill_revoke_user_sessions("butler_u")
    assert rev["revoked"] >= 1
    assert rbac.resolve_session(tok) is None

    # 变更：开关全局权限强制
    monkey_enf = await v11.skill_set_rbac_enforcement(True)
    assert monkey_enf.get("enabled") is True
    assert (await v11.skill_get_rbac_enforcement())["enforcement"] is True
    await v11.skill_set_rbac_enforcement(False)


def test_v11_skills_registered():
    """v11 技能已注册，且变更类标记 requires_approval。"""
    from app.services.ai_assistant_skills import load_all_skills, registry
    load_all_skills()
    for n in ["enterprise_overview", "list_users", "create_user", "set_rbac_enforcement",
              "decide_approval", "set_credential_acl", "remove_cluster_node", "stop_computer_use"]:
        assert registry.get(n) is not None, f"缺少技能 {n}"
    # 变更类需审批
    assert registry.get("create_user").requires_approval is True
    assert registry.get("set_rbac_enforcement").requires_approval is True
    # 查询类无需审批
    assert registry.get("enterprise_overview").requires_approval is False


@pytest.mark.asyncio
async def test_v11_platform_health_check(data_dir, monkeypatch):
    """平台体检：能聚合各域并生成分级报告；制造一个失败探针应被标为严重。"""
    from app.services import ai_assistant_skills_v11 as v11
    import app.services.execution_history as eh
    import app.services.health_probes as hp
    import app.services.alert_center as alert_center
    import app.services.orchestrator as orch

    # 桩掉 cwd 相对路径的服务，避免污染并可控
    monkeypatch.setattr(eh, "get_stats", lambda days=7: {
        "overview": {"total": 10, "failed": 6, "success_rate": 40.0},
        "failure_top": [{"workflow_name": "wf_bad", "failed": 6, "runs": 10}]})
    monkeypatch.setattr(hp, "list_probes", lambda: {"probes": [
        {"name": "探活A", "consecutive_failures": 3, "last_status": "failed"}]})
    monkeypatch.setattr(alert_center, "get_config", lambda: {"enabled": False})

    # 一台离线节点
    n = orch.register_node("离线机")
    nodes = orch._load_nodes()
    import time as _t
    nodes[n["node_id"]]["last_heartbeat"] = _t.time() - 9999
    orch._save_nodes(nodes)

    res = await v11.skill_platform_health_check(days=7)
    assert res["health"] == "异常"            # 有失败探针/低成功率 → 严重
    assert res["errors"] >= 1
    assert "平台体检报告" in res["report_markdown"]
    items = {f["item"] for f in res["findings"]}
    assert "执行成功率" in items and "健康探针" in items
    # 报告不含 emoji（用文字标记）
    assert "[严重]" in res["report_markdown"]


def test_health_inspector_config(tmp_path, monkeypatch):
    import app.services.health_inspector as hi
    monkeypatch.setattr(hi, "_CONFIG_FILE", tmp_path / "health_inspect.json")
    assert hi.get_config()["enabled"] is False
    cfg = hi.set_config({"enabled": True, "interval_minutes": 1, "notify_on": "bad"})
    assert cfg["enabled"] is True
    assert cfg["interval_minutes"] == 5      # 下限钳制
    assert cfg["notify_on"] == "error"       # 非法值归一


def test_health_inspector_notifies_on_error(tmp_path, monkeypatch):
    import app.services.health_inspector as hi
    import app.services.alert_center as alert_center
    monkeypatch.setattr(hi, "_CONFIG_FILE", tmp_path / "health_inspect.json")
    hi.set_config({"enabled": True, "notify_on": "error"})
    monkeypatch.setattr(hi, "run_inspection", lambda days=7: {
        "health": "异常", "errors": 2, "warnings": 0, "findings": [],
        "report_markdown": "# 报告"})
    calls = []
    monkeypatch.setattr(alert_center, "notify_event", lambda t, c: calls.append((t, c)))
    res = hi.inspect_and_maybe_notify()
    assert res.get("notified") is True
    assert len(calls) == 1 and "体检" in calls[0][0]
    # warnings-only 且 notify_on=error 时不推送
    monkeypatch.setattr(hi, "run_inspection", lambda days=7: {
        "health": "需关注", "errors": 0, "warnings": 3, "findings": [], "report_markdown": "x"})
    calls.clear()
    hi.inspect_and_maybe_notify()
    assert calls == []


@pytest.mark.asyncio
async def test_query_runs_aggregation(monkeypatch):
    from app.services import ai_assistant_skills_v11 as v11
    import app.services.execution_history as eh
    import time as _t
    now = _t.time()
    fake = [
        {"workflow_name": "A", "status": "success", "duration_ms": 1000, "started_at": now, "source": "api"},
        {"workflow_name": "A", "status": "failed", "duration_ms": 3000, "started_at": now, "source": "api"},
        {"workflow_name": "B", "status": "success", "duration_ms": 200, "started_at": now, "source": "cli"},
        {"workflow_name": "C", "status": "success", "duration_ms": 50, "started_at": now - 99 * 86400},  # 超窗口
    ]
    monkeypatch.setattr(eh, "list_runs", lambda **kw: {"runs": fake})

    # 最费时（按平均耗时降序取 top1）→ A（avg=2000）
    r = await v11.skill_query_runs(days=7, group_by="workflow", metric="avg_ms", top=1)
    assert r["results"][0]["group"] == "A"
    # 次数：A=2, B=1（C 超窗口被排除）
    r2 = await v11.skill_query_runs(days=7, group_by="workflow", metric="count")
    counts = {x["group"]: x["value"] for x in r2["results"]}
    assert counts.get("A") == 2 and counts.get("B") == 1 and "C" not in counts
    # 成功率：A=50%
    r3 = await v11.skill_query_runs(days=7, group_by="workflow", metric="success_rate")
    a = next(x for x in r3["results"] if x["group"] == "A")
    assert a["value"] == 50.0
    # 按来源分组
    r4 = await v11.skill_query_runs(days=7, group_by="source", metric="count")
    srcs = {x["group"] for x in r4["results"]}
    assert "api" in srcs and "cli" in srcs


def test_v12_capability_introspection():
    from app.services.ai_assistant_skills import load_all_skills, registry
    import app.services.ai_assistant_skills_v12 as v12
    load_all_skills()
    # 自省技能已注册且无需审批
    assert registry.get("list_my_capabilities") is not None
    assert registry.get("search_my_capabilities") is not None
    assert registry.get("list_my_capabilities").requires_approval is False
    # 归类正确
    assert v12._categorize("create_user") == "用户与权限RBAC"
    assert v12._categorize("idp_extract") == "文档智能IDP"
    assert v12._categorize("platform_health_check") == "平台体检"
    assert v12._categorize("cluster_overview") == "集群控制中心"


@pytest.mark.asyncio
async def test_v12_list_and_search_capabilities():
    from app.services.ai_assistant_skills import load_all_skills
    import app.services.ai_assistant_skills_v12 as v12
    load_all_skills()
    # 概览
    ov = await v12.skill_list_my_capabilities()
    assert ov["total_skills"] > 100
    cats = {c["category"] for c in ov["categories"]}
    assert "用户与权限RBAC" in cats and "集群控制中心" in cats
    # 按领域细看
    rbac_cap = await v12.skill_list_my_capabilities(category="用户与权限RBAC")
    assert rbac_cap["count"] >= 1
    assert any(s["name"] == "create_user" for s in rbac_cap["skills"])
    # 关键词搜索
    found = await v12.skill_search_my_capabilities("审批")
    assert found["count"] >= 1
    # 不存在领域
    bad = await v12.skill_list_my_capabilities(category="不存在的领域")
    assert bad.get("error")


def test_no_duplicate_skill_names():
    """确保技能无重名覆盖（v12 不再与计划任务技能冲突）。"""
    from app.services.ai_assistant_skills import load_all_skills, registry
    load_all_skills()
    assert registry._duplicates == [], f"存在重名技能：{registry._duplicates}"



def test_metrics_exporter_format(data_dir, monkeypatch):
    """Prometheus 指标导出：含 HELP/TYPE、带标签样本、关键指标齐全且格式正确。"""
    import app.services.metrics_exporter as me
    import app.services.execution_history as eh
    import app.services.orchestrator as orch

    monkeypatch.setattr(eh, "get_stats", lambda days=7: {"overview": {
        "total": 5, "success": 3, "failed": 2, "stopped": 0,
        "success_rate": 60.0, "avg_ms": 1200}})
    # 注册两台节点（data_dir 已隔离 orchestrator 路径）
    n = orch.register_node("A", max_concurrency=3)
    orch.heartbeat(n["node_id"], n["token"])

    text = me.build_metrics()
    # 基础存活
    assert "webrpa_up 1" in text
    # HELP/TYPE 元数据存在
    assert "# HELP webrpa_workflow_runs_total" in text
    assert "# TYPE webrpa_workflow_runs_total counter" in text
    # 带标签样本格式正确
    assert 'webrpa_workflow_runs_total{status="success"} 3' in text
    assert 'webrpa_workflow_runs_total{status="failed"} 2' in text
    assert 'webrpa_cluster_nodes{state="online"} 1' in text
    assert "webrpa_workflow_success_rate 60" in text
    # 每行要么注释要么 指标名 [值]，无裸中文乱入
    for line in text.splitlines():
        if line and not line.startswith("#"):
            assert " " in line, f"非法指标行: {line}"


def test_metrics_exporter_resilient(monkeypatch):
    """某数据源异常时仍能产出指标（不整体崩溃）。"""
    import app.services.metrics_exporter as me
    import app.services.execution_history as eh

    def boom(*a, **k):
        raise RuntimeError("boom")
    monkeypatch.setattr(eh, "get_stats", boom)
    text = me.build_metrics()
    assert "webrpa_up 1" in text
    assert "webrpa_execution_scrape_error" in text


def test_packager_analyze_dependencies():
    from app.services import workflow_packager as wp
    wf = {"nodes": [
        {"id": "1", "type": "open_page", "data": {}},
        {"id": "2", "type": "ocr_captcha", "data": {}},
        {"id": "3", "type": "excel_read", "data": {}},
    ]}
    a = wp.analyze_dependencies(wf)
    assert a["module_count"] == 3
    assert "browser" in a["dep_groups"]
    assert "ocr" in a["dep_groups"]
    assert "excel" in a["dep_groups"]


def test_packager_scripts():
    from app.services import workflow_packager as wp
    runner = wp.build_runner_script()
    assert "run_workflow" in runner
    assert "record=False" in runner            # 打包运行不写后端历史
    assert "WindowsProactorEventLoopPolicy" in runner  # Playwright 兼容
    launcher = wp.build_launcher_script(show_console=True)
    assert "subprocess" in launcher and "run_packaged.py" in launcher


def test_packager_shared_build(tmp_path, monkeypatch):
    """shared 模式真实组装产物（用 fake 项目根，快速隔离）：校验产物结构与脚本落地。"""
    from app.services import workflow_packager as wp
    # 造一个最小 fake 项目根：backend/app
    fake_app = tmp_path / "backend" / "app"
    (fake_app / "services").mkdir(parents=True)
    (fake_app / "__init__.py").write_text("", encoding="utf-8")
    (fake_app / "services" / "__init__.py").write_text("", encoding="utf-8")
    monkeypatch.setattr(wp, "_project_root", lambda: tmp_path)

    wf = {"id": "w", "name": "演示", "nodes": [
        {"id": "n1", "type": "print_log", "data": {"moduleType": "print_log", "logMessage": "hi"}}],
        "edges": []}
    r = wp.package(wf, "我的自动化", mode="shared", headless=True, show_console=False)
    jid = r["job_id"]
    import time as _t
    for _ in range(80):
        job = wp.get_job(jid)
        if job["status"] in ("success", "failed"):
            break
        _t.sleep(0.1)
    assert job["status"] == "success", job.get("error")
    dist = tmp_path / "packaged" / "我的自动化"
    rt = dist / "webrpa_runtime"
    assert (rt / "run_packaged.py").exists()
    assert (rt / "workflow.json").exists()
    assert (rt / "config.json").exists()
    assert (rt / "app").exists()              # 引擎已复制
    # 无 PyInstaller 时应回退 启动.bat
    assert (dist / "启动.bat").exists() or (dist / "我的自动化.exe").exists()
    # 配置正确
    import json as _json
    cfg = _json.loads((rt / "config.json").read_text(encoding="utf-8"))
    assert cfg["headless"] is True


def test_packager_invalid_name_sanitized(tmp_path, monkeypatch):
    from app.services import workflow_packager as wp
    monkeypatch.setattr(wp, "_project_root", lambda: tmp_path)
    (tmp_path / "backend" / "app").mkdir(parents=True)
    r = wp.package({"id": "w", "name": "x", "nodes": [], "edges": []},
                   'bad:/\\*name', mode="shared")
    assert r.get("job_id")  # 非法字符被清洗后仍能启动


def test_v13_packaging_skills_registered():
    from app.services.ai_assistant_skills import load_all_skills, registry
    load_all_skills()
    for n in ["analyze_package", "package_workflow", "get_package_status", "packaging_toolchain_status"]:
        assert registry.get(n) is not None, f"缺少技能 {n}"
    assert registry.get("package_workflow").requires_approval is True
    assert registry.get("analyze_package").requires_approval is False
    # 无重名冲突
    assert registry._duplicates == [], registry._duplicates


@pytest.mark.asyncio
async def test_v13_package_workflow_delegates(monkeypatch):
    from app.services import ai_assistant_skills_v13 as v13
    import app.services.workflow_packager as wp
    captured = {}
    monkeypatch.setattr(wp, "package", lambda src, name, **kw: captured.update(
        {"src": src, "name": name, "kw": kw}) or {"job_id": "pkg_x", "status": "pending"})
    r = await v13.skill_package_workflow("签到", output_name="每日签到", mode="shared", headless=True)
    assert r["job_id"] == "pkg_x"
    assert captured["name"] == "每日签到" and captured["kw"]["mode"] == "shared"


def test_packaged_ui_non_gui_functions(monkeypatch):
    """打包原生兜底：JS脚本明确不支持、TTS不致失败、媒体走系统打开。"""
    from app.services import packaged_ui
    # JS 脚本前端依赖 → 明确返回不支持
    r = packaged_ui.request_js_script_sync("console.log(1)", {})
    assert r["success"] is False and "注入JavaScript" in r["error"]
    # TTS 无引擎也返回 True（不让工作流失败）
    monkeypatch.setitem(__import__("sys").modules, "pyttsx3", None)
    assert packaged_ui.request_tts_sync("你好") is True
    # 媒体打开（新实现）：http/本地资源先经 _resolve_media_path 解析为本地路径，
    # 图片用系统默认程序打开(_open_with_default_app)，音频用原生 MCI 播放(_play_audio_native)。
    # 这里桩掉解析与打开/播放，避免真实下载/弹窗，验证调用链与成功返回。
    resolved = {}
    monkeypatch.setattr(packaged_ui, "_resolve_media_path",
                        lambda target, kind="media": (resolved.setdefault("calls", []).append((target, kind)) or "C:/_resolved_media.tmp"))
    opened = {}
    monkeypatch.setattr(packaged_ui, "_open_with_default_app",
                        lambda path: (opened.__setitem__("path", path) or True))
    monkeypatch.setattr(packaged_ui, "_play_audio_native",
                        lambda path, wait, timeout: (opened.__setitem__("audio", path) or True))
    assert packaged_ui.request_view_image_sync("C:/x.png")["success"] is True
    assert packaged_ui.request_play_music_sync("http://a/b.mp3")["success"] is True
    # 图片走系统默认程序打开；音频走原生播放；http 音频 URL 被送入解析（下载链）
    assert opened.get("path") == "C:/_resolved_media.tmp"
    assert opened.get("audio") == "C:/_resolved_media.tmp"
    assert ("http://a/b.mp3", "audio") in resolved.get("calls", [])


@pytest.mark.asyncio
async def test_packaged_input_prompt_uses_native(monkeypatch):
    """打包模式下 input_prompt 走原生兜底（不连前端、不卡死）：端到端跑通取到输入。"""
    monkeypatch.setenv("WEBRPA_PACKAGED", "1")
    from app.services import packaged_ui
    # 桩掉原生弹窗，避免测试弹真窗口
    monkeypatch.setattr(packaged_ui, "request_input_prompt_sync",
                        lambda **kw: "来自原生弹窗" if kw.get("variable_name") == "ans" else None)
    wf = {
        "id": "p", "name": "打包输入测试",
        "nodes": [
            {"id": "n1", "type": "input_prompt", "position": {"x": 1, "y": 1},
             "data": {"moduleType": "input_prompt", "variableName": "ans",
                      "promptTitle": "请输入", "promptMessage": "名字", "inputMode": "single"}},
            {"id": "n2", "type": "print_log", "position": {"x": 1, "y": 2},
             "data": {"moduleType": "print_log", "logMessage": "收到 {ans}", "logLevel": "info"}},
        ],
        "edges": [{"id": "e1", "source": "n1", "target": "n2"}],
    }
    from app.services.workflow_runner import run_workflow
    res = await run_workflow(wf, headless=True, source_tag="pkgtest", apply_retry=False, record=False)
    assert res["success"] is True
    assert res["executed_nodes"] == 2
    # 变量取到原生弹窗返回值
    assert res.get("variables", {}).get("ans") == "来自原生弹窗"


def test_packager_copies_assets_and_custom_modules(tmp_path, monkeypatch):
    """打包正确复制 Excel/图片资源(uploads)与自定义模块到运行时的对应位置。"""
    from app.services import workflow_packager as wp
    root = tmp_path
    # 造资源
    (root / "backend" / "uploads" / "excel").mkdir(parents=True)
    (root / "backend" / "uploads" / "excel" / "data.xlsx").write_text("x", encoding="utf-8")
    (root / "backend" / "uploads" / "images").mkdir(parents=True)
    (root / "backend" / "uploads" / "images" / "logo.png").write_text("p", encoding="utf-8")
    (root / "backend" / "data" / "custom_modules").mkdir(parents=True)
    (root / "backend" / "data" / "custom_modules" / "cm1.json").write_text("{}", encoding="utf-8")
    monkeypatch.setattr(wp, "_project_root", lambda: root)

    runtime = tmp_path / "rt"
    runtime.mkdir()
    n = wp._copy_assets({"nodes": []}, runtime)
    assert n >= 2
    # Excel/图片落到 runtime/uploads/{excel,images}（执行器按 __file__ 解析此处）
    assert (runtime / "uploads" / "excel" / "data.xlsx").exists()
    assert (runtime / "uploads" / "images" / "logo.png").exists()
    # 自定义模块落到 runtime/backend/data/custom_modules（执行器按 cwd 解析此处）
    assert (runtime / "backend" / "data" / "custom_modules" / "cm1.json").exists()


@pytest.mark.asyncio
async def test_packaged_global_variables_seeded():
    """打包运行：工作流配置的全局变量会被引擎载入（变量在 workflow.json 内，随包携带）。"""
    wf = {
        "id": "gv", "name": "全局变量测试",
        "variables": [{"name": "city", "value": "北京", "type": "string", "scope": "global"}],
        "nodes": [
            {"id": "n1", "type": "print_log", "position": {"x": 1, "y": 1},
             "data": {"moduleType": "print_log", "logMessage": "城市={city}", "logLevel": "info"}},
            {"id": "n2", "type": "set_variable", "position": {"x": 1, "y": 2},
             "data": {"moduleType": "set_variable", "variableName": "out", "variableValue": "{city}"}},
        ],
        "edges": [{"id": "e1", "source": "n1", "target": "n2"}],
    }
    from app.services.workflow_runner import run_workflow
    res = await run_workflow(wf, headless=True, source_tag="gvtest", apply_retry=False, record=False)
    assert res["success"] is True
    # 全局变量 city 被引擎载入并可被引用
    assert res.get("variables", {}).get("city") == "北京"
    assert res.get("variables", {}).get("out") == "北京"


def test_all_executors_load_in_packaged_env(monkeypatch):
    """系统级保证：在打包同款环境(WEBRPA_PACKAGED, 无前端/服务器)下，
    全部执行器子模块都能导入、所有注册模块类型都有可用执行器——确保任何模块打包后都能跑。"""
    monkeypatch.setenv("WEBRPA_PACKAGED", "1")
    import importlib
    import app.executors as ex
    failures = []
    for sub in ex._SUBMODULES:
        try:
            importlib.import_module(f"app.executors.{sub}")
        except Exception as e:  # noqa
            failures.append((sub, str(e)))
    assert failures == [], f"以下执行器子模块在打包环境导入失败：{failures}"
    types = ex.registry.get_all_types()
    assert len(types) >= 500, f"注册模块类型偏少：{len(types)}"
    missing = [t for t in types if ex.registry.get(t) is None]
    assert missing == [], f"以下类型无可用执行器：{missing[:20]}"


def test_no_unguarded_frontend_coupling_in_executors():
    """保证执行器对前端(app.main)的依赖都被 WEBRPA_PACKAGED 守卫包裹（有原生兜底），
    防止以后新增模块时漏掉打包适配。"""
    import re
    from pathlib import Path
    exec_dir = Path(__file__).resolve().parent.parent / "app" / "executors"
    offenders = []
    for py in exec_dir.rglob("*.py"):
        text = py.read_text(encoding="utf-8", errors="ignore")
        for m in re.finditer(r"from app\.main import", text):
            # 该行前若干行内应出现 WEBRPA_PACKAGED 守卫
            start = text.rfind("\n", 0, m.start())
            window = text[max(0, m.start() - 400):m.start()]
            if "WEBRPA_PACKAGED" not in window:
                offenders.append(py.name)
                break
    assert offenders == [], f"以下执行器存在未做打包兜底的前端依赖：{offenders}"


# 历史缺陷回归基线：整文件归入 regression 层
import pytest as _pytest_reg
pytestmark = _pytest_reg.mark.regression
