# -*- coding: utf-8 -*-
"""选择器自愈单元测试：build_fallback_selectors 按稳定性顺序生成候选锚点。"""
import pytest

from app.executors.base import build_fallback_selectors


@pytest.mark.unit
class TestBuildFallbackSelectors:
    def test_empty_or_invalid(self):
        assert build_fallback_selectors(None) == []
        assert build_fallback_selectors({}) == []
        assert build_fallback_selectors("notdict") == []

    def test_testid_first(self):
        out = build_fallback_selectors({"testid": "login-btn", "id": "x", "name": "u"})
        assert out[0] == '[data-testid="login-btn"]'

    def test_id_before_name(self):
        out = build_fallback_selectors({"id": "submit", "name": "user", "tag": "input"})
        assert out.index("#submit") < out.index('input[name="user"]')

    def test_stability_order_full(self):
        # 全量 hints：testid > id > name > placeholder > aria > text > class
        hints = {
            "tag": "input",
            "testid": "t1",
            "id": "i1",
            "name": "n1",
            "placeholder": "p1",
            "ariaLabel": "a1",
            "text": "Login",
            "className": "btn",
        }
        out = build_fallback_selectors(hints)
        order = [
            '[data-testid="t1"]',
            '#i1',
            'input[name="n1"]',
            '[placeholder="p1"]',
            '[aria-label="a1"]',
        ]
        idxs = [out.index(s) for s in order]
        assert idxs == sorted(idxs), f"候选顺序不符合稳定性排序: {out}"
        # text 生成两个候选且在 class 之前
        assert 'input:has-text("Login")' in out and 'text="Login"' in out
        assert out.index('text="Login"') < out.index('input.btn')

    def test_invalid_id_skipped(self):
        # 非法 id（含空格/特殊符号）不应生成 #id 选择器
        out = build_fallback_selectors({"id": "has space", "name": "n"})
        assert not any(s.startswith("#") for s in out)

    def test_long_text_skipped(self):
        long_text = "x" * 50
        out = build_fallback_selectors({"text": long_text})
        assert out == []  # 文本过长（>40）不作为锚点
