# -*- coding: utf-8 -*-
"""resolve_value 属性测试（参数化覆盖多组变量名/类型/索引组合）。

Property 4: 变量解析正确 —— 对每一组输入，解析结果恒等于预期值。
采用参数化穷举若干稳定组合，保持确定且无外部依赖（不引入 hypothesis）。
"""
import pytest

from app.executors.base import ExecutionContext

pytestmark = pytest.mark.unit


def _ctx():
    c = ExecutionContext()
    c.variables.update({
        "s": "hello",
        "u": "WebRPA",
        "n": 5,
        "f": 3.5,
        "b": True,
        "lst": ["a", "b", "c"],
        "d": {"city": "北京", "k": "v"},
        "idx": 2,
    })
    return c


# (模板, 预期) —— 覆盖：全字符串单变量、嵌入式、两种括号、列表正/负索引、
# 字典两种键写法、变量做索引、缺失变量保持原样、多变量拼接。
CASES = [
    ("{s}", "hello"),
    ("${s}", "hello"),
    ("{u}", "WebRPA"),
    ("x={n}", "x=5"),
    ("p={f}", "p=3.5"),
    ("{lst[0]}", "a"),
    ("{lst[2]}", "c"),
    ("{lst[-1]}", "c"),
    ('{d["city"]}', "北京"),
    ("{d[city]}", "北京"),
    ("{d[k]}", "v"),
    ("{lst[{idx}]}", "c"),          # 变量做索引：lst[2] -> c
    ("{missing}", "{missing}"),      # 未定义变量保持原样
    ("{u}-{n}", "WebRPA-5"),        # 多变量拼接
    ("纯文本无变量", "纯文本无变量"),
]


@pytest.mark.parametrize("template,expected", CASES)
def test_resolve_value_matches_expected(template, expected):
    assert _ctx().resolve_value(template) == expected


@pytest.mark.parametrize("template,expected", CASES)
def test_resolve_value_is_deterministic(template, expected):
    # 同一输入多次解析结果一致（无随机/无副作用）
    ctx = _ctx()
    first = ctx.resolve_value(template)
    second = _ctx().resolve_value(template)
    assert first == second == expected


@pytest.mark.parametrize("passthrough", [123, 4.5, True, False, None, ["x"], {"a": 1}])
def test_non_string_passthrough_identity(passthrough):
    # 非字符串标量原样返回；容器递归解析但无变量时内容不变
    out = _ctx().resolve_value(passthrough)
    assert out == passthrough
