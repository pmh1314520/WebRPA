# -*- coding: utf-8 -*-
"""赞助与致谢接口自动化测试。"""
import pytest

from app.api.sponsors import parse_sponsors

pytestmark = pytest.mark.api


def test_parse_sponsors_table():
    text = (
        "## Star History\n"
        "\n"
        "**赞助者名单（按时间排序）：**\n"
        "\n"
        "| 序号 | 付款账户 | 赞助日期 | 赞助金额 |\n"
        "| :------: | :--: | :--: | :--: |\n"
        "| 1 | 稀饭_ | 2026-01-25 12:32:15 | 20.00 |\n"
        "| 2 | 无懈可击 | 2026-01-31 16:50:27 | 100.00 |\n"
        "\n"
        "后续段落\n"
    )
    out = parse_sponsors(text)
    assert out == [
        {"name": "稀饭_", "date": "2026-01-25 12:32:15", "amount": "20.00"},
        {"name": "无懈可击", "date": "2026-01-31 16:50:27", "amount": "100.00"},
    ]


def test_parse_sponsors_no_table():
    assert parse_sponsors("没有赞助表格的内容") == []
    assert parse_sponsors("") == []


def test_sponsors_list_endpoint_ok(client):
    r = client.get("/api/sponsors/list")
    assert r.status_code == 200
    body = r.json()
    assert "sponsors" in body and isinstance(body["sponsors"], list)
    assert body["count"] == len(body["sponsors"])
    # README 中已有真实赞助表，应能解析出若干条，且字段齐全
    if body["sponsors"]:
        first = body["sponsors"][0]
        assert set(first.keys()) == {"name", "date", "amount"}
        assert first["name"]


def test_sponsors_status_endpoint_ok(client):
    r = client.get("/api/sponsors/status")
    assert r.status_code == 200
    body = r.json()
    assert set(body.keys()) == {"wechat", "alipay"}
    assert isinstance(body["wechat"], bool) and isinstance(body["alipay"], bool)


def test_sponsors_qr_unknown_kind_404(client):
    r = client.get("/api/sponsors/qr/__nope__")
    assert r.status_code == 404


def test_sponsors_qr_endpoint_no_5xx(client):
    # 收款码图片存在则 200，否则 404，但绝不应 5xx
    r = client.get("/api/sponsors/qr/wechat")
    assert r.status_code in (200, 404)
    assert r.status_code < 500
