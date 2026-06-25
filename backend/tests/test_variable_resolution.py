# -*- coding: utf-8 -*-
"""变量解析 resolve_value 回归测试"""
from app.executors.base import ExecutionContext


def _ctx(**vars):
    ctx = ExecutionContext()
    ctx.variables.update(vars)
    return ctx


def test_simple_brace():
    ctx = _ctx(name="世界")
    assert ctx.resolve_value("你好 {name}") == "你好 世界"


def test_dollar_brace():
    ctx = _ctx(x="5")
    assert ctx.resolve_value("${x}") == "5"


def test_list_index():
    ctx = _ctx(items=["a", "b", "c"])
    assert ctx.resolve_value("{items[1]}") == "b"


def test_dict_key():
    ctx = _ctx(user={"name": "张三", "age": 20})
    assert ctx.resolve_value("{user[name]}") == "张三"


def test_missing_var_kept_or_empty():
    ctx = _ctx()
    # 不存在的变量：保留原样（不应抛异常）
    out = ctx.resolve_value("{not_exist}")
    assert isinstance(out, str)


def test_non_string_passthrough():
    ctx = _ctx()
    assert ctx.resolve_value(123) == 123
    assert ctx.resolve_value(True) is True


def test_set_and_get_variable():
    ctx = ExecutionContext()
    ctx.set_variable("k", "v")
    assert ctx.get_variable("k") == "v"


# 历史缺陷回归基线：整文件归入 regression 层
import pytest as _pytest_reg
pytestmark = _pytest_reg.mark.regression
