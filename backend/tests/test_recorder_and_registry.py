# -*- coding: utf-8 -*-
"""执行器懒加载注册 回归测试

历史说明：本文件原含"运行录像 roundtrip"测试，依赖的 app.services.execution_recorder
与 app.api.execution_recordings 已在后续版本中移除，相关用例会导致收集期 ImportError 而
拖垮整个测试套件，故已删除。保留仍然有效的执行器注册表回归测试。
"""
import pytest

from app.executors.base import registry


@pytest.mark.regression
def test_registry_core_types():
    types = set(registry.get_all_types())
    for t in ["click_element", "input_text", "assert_checkpoint", "ai_vision_act",
              "select_dropdown", "real_mouse_click", "condition"]:
        assert t in types, f"核心模块类型缺失: {t}"
    # 懒加载下 get 也能拿到实例
    assert registry.get("assert_checkpoint") is not None
