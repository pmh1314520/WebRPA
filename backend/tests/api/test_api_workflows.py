# -*- coding: utf-8 -*-
"""workflows / workflow-versions 接口自动化测试（FastAPI TestClient，不绑真实端口）。"""
import pytest

pytestmark = pytest.mark.api


def test_health_ok(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json().get("status") == "healthy"


def test_list_workflows_ok_returns_list(client):
    r = client.get("/api/workflows")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_unknown_route_404(client):
    r = client.get("/api/__definitely_not_a_route__")
    assert r.status_code == 404


def test_create_workflow_invalid_body_422(client):
    # 缺失必填字段 -> Pydantic 校验在进入处理逻辑前返回 422（无副作用）
    r = client.post("/api/workflows", json={})
    assert 400 <= r.status_code <= 422


def test_versions_list_invalid_body_422(client):
    r = client.post("/api/workflow-versions/list", json={})
    assert 400 <= r.status_code <= 422


def test_versions_list_valid_body_ok(client, tmp_path):
    # 合法请求体（workflow 必填）；folder 指向临时目录，避免在仓库 workflows 下产生副作用目录
    r = client.post("/api/workflow-versions/list",
                    json={"workflow": "____no_such_wf____", "folder": str(tmp_path)})
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body, dict) and body.get("success") is True
    assert body.get("versions") == []
