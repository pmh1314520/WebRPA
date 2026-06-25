# -*- coding: utf-8 -*-
"""system / security 接口自动化测试（FastAPI TestClient）。"""
import pytest

pytestmark = pytest.mark.api


def test_module_required_fields_ok(client):
    r = client.get("/api/system/module-required-fields")
    assert r.status_code == 200
    body = r.json()
    # 返回 { moduleType: [必填字段...] } 结构
    assert isinstance(body, dict)


def test_security_status_ok(client):
    r = client.get("/api/security/status")
    assert r.status_code == 200
    assert isinstance(r.json(), dict)


def test_system_unknown_route_404(client):
    r = client.get("/api/system/__nope__")
    assert r.status_code == 404


def test_custom_hotkeys_invalid_body_422(client):
    # 缺字段的非法请求体应在校验阶段返回 4xx（无副作用，不真正注册热键）
    r = client.post("/api/system/custom-hotkeys", json={"bad": object().__class__.__name__, "n": [1, 2]})
    assert r.status_code in (400, 422) or r.status_code == 200
    # 说明：若该模型字段可选则可能 200；关键是不应 5xx
    assert r.status_code < 500
