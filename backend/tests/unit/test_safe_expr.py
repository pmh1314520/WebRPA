# -*- coding: utf-8 -*-
"""安全表达式求值器测试：验证正常条件可求值、危险语法被拒绝（防沙箱逃逸）。"""
import pytest

from app.utils.safe_expr import safe_eval, UnsafeExpressionError


class TestSafeEvalNormal:
    def test_arithmetic(self):
        assert safe_eval("1 + 2 * 3") == 7
        assert safe_eval("(1 + 2) * 3") == 9
        assert safe_eval("10 % 3") == 1

    def test_comparison(self):
        assert safe_eval("count > 5", {"count": 10}) is True
        assert safe_eval("count > 5", {"count": 3}) is False
        assert safe_eval("a == b", {"a": 1, "b": 1}) is True

    def test_bool_ops(self):
        assert safe_eval("a and b", {"a": True, "b": True}) is True
        assert safe_eval("a and b", {"a": True, "b": False}) is False
        assert safe_eval("a or b", {"a": False, "b": True}) is True
        assert safe_eval("not a", {"a": False}) is True

    def test_chained_comparison(self):
        assert safe_eval("1 < x < 10", {"x": 5}) is True
        assert safe_eval("1 < x < 10", {"x": 50}) is False

    def test_membership(self):
        assert safe_eval("x in [1, 2, 3]", {"x": 2}) is True
        assert safe_eval("x not in [1, 2, 3]", {"x": 9}) is True

    def test_string_compare(self):
        assert safe_eval("s == 'ok'", {"s": "ok"}) is True

    def test_literals(self):
        assert safe_eval("True") is True
        assert safe_eval("False") is False
        assert safe_eval("None") is None


class TestSafeEvalRejectsDangerous:
    def test_reject_attribute_access(self):
        # 经典沙箱逃逸的第一步：属性访问 __class__
        with pytest.raises(UnsafeExpressionError):
            safe_eval("().__class__")

    def test_reject_subclasses_escape(self):
        with pytest.raises(UnsafeExpressionError):
            safe_eval("().__class__.__base__.__subclasses__()")

    def test_reject_function_call(self):
        with pytest.raises(UnsafeExpressionError):
            safe_eval("print('x')")

    def test_reject_unknown_name(self):
        with pytest.raises(UnsafeExpressionError):
            safe_eval("os")

    def test_reject_import_syntax(self):
        with pytest.raises(UnsafeExpressionError):
            safe_eval("__import__('os')")

    def test_reject_lambda(self):
        with pytest.raises(UnsafeExpressionError):
            safe_eval("(lambda: 1)()")

    def test_reject_huge_pow(self):
        with pytest.raises(UnsafeExpressionError):
            safe_eval("10 ** 99999")
