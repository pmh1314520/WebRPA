# -*- coding: utf-8 -*-
"""type_utils 单元测试：类型转换与非法值回退。"""
import pytest

from app.executors.type_utils import to_int, to_float, to_bool, parse_search_region


@pytest.mark.unit
class TestToInt:
    def test_int_and_float(self):
        assert to_int(5, 0) == 5
        assert to_int(5.9, 0) == 5  # 截断

    def test_numeric_string(self):
        assert to_int("42", 0) == 42
        assert to_int(" 7 ", 0) == 7
        assert to_int("3.8", 0) == 3  # 经 float 再 int

    def test_invalid_and_none_fallback(self):
        assert to_int(None, 9) == 9
        assert to_int("abc", 9) == 9
        assert to_int("", 9) == 9
        assert to_int([], 9) == 9


@pytest.mark.unit
class TestToFloat:
    def test_numbers(self):
        assert to_float(3, 0.0) == 3.0
        assert to_float(2.5, 0.0) == 2.5

    def test_string_and_fallback(self):
        assert to_float("1.25", 0.0) == 1.25
        assert to_float("bad", 1.0) == 1.0
        assert to_float(None, 1.0) == 1.0
        assert to_float("", 1.0) == 1.0


@pytest.mark.unit
class TestToBool:
    @pytest.mark.parametrize("v", ["true", "Yes", "1", "on", "enabled", True, 1, 2.0])
    def test_truthy(self, v):
        assert to_bool(v) is True

    @pytest.mark.parametrize("v", ["false", "no", "0", "", None, False, 0])
    def test_falsy(self, v):
        assert to_bool(v) is False


@pytest.mark.unit
class TestParseSearchRegion:
    def test_invalid(self):
        assert parse_search_region(None) == (0, 0, 0, 0)
        assert parse_search_region({}) == (0, 0, 0, 0)

    def test_two_point_mode(self):
        # 左上(10,20) 右下(110,220) -> (x,y,w,h)
        assert parse_search_region({"x": 10, "y": 20, "x2": 110, "y2": 220}) == (10, 20, 100, 200)

    def test_two_point_mode_swapped(self):
        # 顺序颠倒应自动纠正
        assert parse_search_region({"x": 110, "y": 220, "x2": 10, "y2": 20}) == (10, 20, 100, 200)

    def test_width_height_mode(self):
        assert parse_search_region({"x": 5, "y": 6, "width": 50, "height": 60}) == (5, 6, 50, 60)
