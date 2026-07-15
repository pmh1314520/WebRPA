# -*- coding: utf-8 -*-
"""SendInput 隔离回归测试 —— 真实鼠标点击"运行后永远失败"缺陷

根因：ctypes.windll.user32 是进程级共享单例，SendInput 是唯一共享的函数对象。
真实鼠标(advanced_mouse)、真实键盘(advanced_keyboard)、图像点击(advanced_image)
各自用自己本地定义的 INPUT 结构体去设置这个共享函数的 argtypes。一旦工作流里
先跑了键盘/图像点击等节点，共享 SendInput.argtypes 被改成它们的 INPUT 指针类型，
之后再跑真实鼠标点击，传入鼠标版结构体指针便与 argtypes 类型不匹配，ctypes 抛
ArgumentError → 被 except 捕获 → "鼠标点击失败"，且此后永久失败。

修复：每个模块改用【独立】的 ctypes.WinDLL('user32') 实例，argtypes 互不干扰。
本测试锁死该修复，防止回退到共享单例。
"""
import sys
import ctypes
import asyncio

import pytest

# 仅 Windows 有 ctypes.windll / SendInput，其它平台跳过
pytestmark = pytest.mark.skipif(sys.platform != "win32", reason="SendInput 仅 Windows 可用")


def test_mouse_uses_isolated_user32_instance():
    """真实鼠标模块必须使用独立的 user32 实例，而非全局共享的 ctypes.windll.user32。"""
    import app.executors.advanced_mouse as am
    assert am._SENDINPUT_AVAILABLE, "Windows 下 SendInput 基础设施应可用"
    assert am._user32 is not ctypes.windll.user32, (
        "真实鼠标模块复用了全局共享的 ctypes.windll.user32，会被其它模块的 argtypes 污染"
    )


def test_shared_argtypes_contamination_does_not_affect_mouse():
    """模拟其它模块污染共享 SendInput.argtypes 后，鼠标模块自己的 argtypes 应保持不变。"""
    import app.executors.advanced_mouse as am
    mouse_argtypes = am._user32.SendInput.argtypes

    class _Bogus(ctypes.Structure):
        _fields_ = [("x", ctypes.c_int)]

    # 其它模块（键盘/图像点击）可能这样改共享单例的 argtypes
    ctypes.windll.user32.SendInput.argtypes = [
        ctypes.c_uint, ctypes.POINTER(_Bogus), ctypes.c_int
    ]

    assert am._user32.SendInput.argtypes is mouse_argtypes, "鼠标模块 argtypes 被共享单例污染改变"
    assert am._user32.SendInput.argtypes[1] is not ctypes.windll.user32.SendInput.argtypes[1], (
        "鼠标模块与共享单例的 SendInput 指针类型相同，说明未隔离"
    )


def test_real_mouse_click_succeeds_even_after_contamination(monkeypatch):
    """端到端：即便共享单例被污染，真实鼠标点击仍应成功（底层调用打桩，避免真实点击）。"""
    import app.executors.advanced_mouse as am
    from app.executors.base import registry

    # 污染共享单例
    class _Bogus(ctypes.Structure):
        _fields_ = [("x", ctypes.c_int)]
    ctypes.windll.user32.SendInput.argtypes = [
        ctypes.c_uint, ctypes.POINTER(_Bogus), ctypes.c_int
    ]

    # 打桩底层：不真的移动/点击鼠标
    sent = {"events": 0}

    def _fake_send(flag, mouse_data=0):
        sent["events"] += 1
        return True

    class _FakeUser32:
        def SetCursorPos(self, x, y):
            return True

    monkeypatch.setattr(am, "_send_mouse_event", _fake_send)
    monkeypatch.setattr(am, "_user32", _FakeUser32())

    executor = registry.get("real_mouse_click")
    assert executor is not None and executor.__class__.__module__.endswith("advanced_mouse")

    class _Ctx:
        def resolve_value(self, v):
            return v

    result = asyncio.new_event_loop().run_until_complete(
        executor.execute({"x": "100", "y": "200", "button": "left", "clickType": "single"}, _Ctx())
    )
    assert result.success, f"真实鼠标点击应成功，实际失败: {getattr(result, 'error', None)}"
    assert sent["events"] >= 2, "单击应至少发出 down/up 两个鼠标事件"
