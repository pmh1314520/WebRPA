# -*- coding: utf-8 -*-
"""断言比较 + 选择器自愈候选生成 回归测试"""
from app.executors.advanced_assert import _compare, _is_empty
from app.executors.base import build_fallback_selectors


def test_compare_basic():
    assert _compare("5", "3", ">")[0] is True
    assert _compare("3", "5", ">")[0] is False
    assert _compare("abc", "b", "contains")[0] is True
    assert _compare("abc", "z", "contains")[0] is False
    assert _compare("", "", "isEmpty")[0] is True
    assert _compare("x", "", "isNotEmpty")[0] is True
    assert _compare("2024-01-01", r"^\d{4}", "matches")[0] is True


def test_compare_numeric_error():
    ok, err = _compare("abc", "1", ">")
    assert ok is False and err is not None


def test_is_empty():
    assert _is_empty(None) is True
    assert _is_empty("   ") is True
    assert _is_empty([]) is True
    assert _is_empty("x") is False
    assert _is_empty([1]) is False


def test_fallback_selectors_priority():
    fb = build_fallback_selectors({
        "tag": "button", "text": "登录",
        "attributes": {"id": "loginBtn", "name": "login", "data-testid": "lg"},
    })
    assert '[data-testid="lg"]' in fb
    assert '#loginBtn' in fb
    # data-testid 优先级最高
    assert fb[0] == '[data-testid="lg"]'


def test_fallback_selectors_empty():
    assert build_fallback_selectors(None) == []
    assert build_fallback_selectors({}) == []


# 历史缺陷回归基线：整文件归入 regression 层
import pytest as _pytest_reg
pytestmark = _pytest_reg.mark.regression
