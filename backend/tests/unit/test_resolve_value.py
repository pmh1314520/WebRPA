# -*- coding: utf-8 -*-
"""ExecutionContext.resolve_value 单元测试：变量引用解析。

覆盖 {var} / ${var} / 列表索引 / 字典键 / 嵌套 / 缺失变量 / 非字符串递归。
注意：resolve_value 对字符串做替换，返回的是替换后的字符串（数值会被转为字符串）。
"""
import pytest

from app.executors.base import ExecutionContext


@pytest.fixture
def ctx():
    c = ExecutionContext()
    c.variables.update({
        "name": "WebRPA",
        "count": 5,
        "items": ["a", "b", "c"],
        "info": {"city": "北京", "n": 7},
        "idx": 1,
    })
    return c


@pytest.mark.unit
class TestResolveValue:
    def test_brace_var(self, ctx):
        assert ctx.resolve_value("{name}") == "WebRPA"

    def test_dollar_brace_var(self, ctx):
        assert ctx.resolve_value("${name}") == "WebRPA"

    def test_number_becomes_string(self, ctx):
        assert ctx.resolve_value("c={count}") == "c=5"

    def test_list_index(self, ctx):
        assert ctx.resolve_value("{items[0]}") == "a"
        assert ctx.resolve_value("{items[-1]}") == "c"

    def test_dict_key(self, ctx):
        assert ctx.resolve_value('{info["city"]}') == "北京"
        assert ctx.resolve_value("{info[city]}") == "北京"

    def test_nested_index_variable(self, ctx):
        # 索引本身是变量：items[{idx}] -> items[1] -> "b"
        assert ctx.resolve_value("{items[{idx}]}") == "b"

    def test_missing_var_kept(self, ctx):
        # 未定义变量保持原样，不抛错
        assert ctx.resolve_value("{nope}") == "{nope}"

    def test_non_string_passthrough(self, ctx):
        assert ctx.resolve_value(123) == 123
        assert ctx.resolve_value(True) is True

    def test_recurse_into_dict_and_list(self, ctx):
        out = ctx.resolve_value({"a": "{name}", "b": ["{count}", 9]})
        assert out == {"a": "WebRPA", "b": ["5", 9]}

    def test_get_variable_brace_forms(self, ctx):
        assert ctx.get_variable("{name}") == "WebRPA"
        assert ctx.get_variable("${name}") == "WebRPA"
        assert ctx.get_variable("missing", "dft") == "dft"
