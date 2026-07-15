"""高级模块执行器 - advanced_mouse"""
from .base import ModuleExecutor, ExecutionContext, ModuleResult, register_executor
from .type_utils import to_int, to_float, parse_search_region
import asyncio
import ctypes
import time

# ─────────────────────────────────────────────────────────────────────────────
# 模块级 SendInput 结构体定义（只定义一次，避免每次函数调用重新定义导致类型不匹配）
# ─────────────────────────────────────────────────────────────────────────────
try:
    from ctypes import wintypes as _wintypes

    class _MOUSEINPUT(ctypes.Structure):
        _fields_ = [
            ("dx",          _wintypes.LONG),
            ("dy",          _wintypes.LONG),
            ("mouseData",   _wintypes.DWORD),
            ("dwFlags",     _wintypes.DWORD),
            ("time",        _wintypes.DWORD),
            ("dwExtraInfo", ctypes.c_ulonglong),
        ]

    class _INPUT(ctypes.Structure):
        _fields_ = [
            ("type", _wintypes.DWORD),
            ("mi",   _MOUSEINPUT),
        ]

    # 使用【独立】的 user32 实例，而非全局共享的 ctypes.windll.user32。
    # 原因：ctypes.windll.user32 是进程级单例，SendInput 也是唯一共享的函数对象；
    # 若键盘/图像点击等模块用各自本地定义的 INPUT 结构体去改这个共享函数的 argtypes，
    # 之后本模块再传入鼠标版结构体就会 ctypes 类型不匹配报错，导致真实鼠标点击永久失败。
    # 独立实例的 SendInput.argtypes 与其它模块完全隔离，从根源杜绝交叉污染。
    _user32 = ctypes.WinDLL('user32', use_last_error=True)
    _user32.SendInput.argtypes = [
        _wintypes.UINT,
        ctypes.POINTER(_INPUT),
        ctypes.c_int,
    ]
    _user32.SendInput.restype = _wintypes.UINT

    _SENDINPUT_AVAILABLE = True
except Exception:
    _SENDINPUT_AVAILABLE = False


def _send_mouse_event(flag: int, mouse_data: int = 0) -> bool:
    """发送单个鼠标事件（使用模块级结构体，类型始终一致）"""
    inp = _INPUT()
    inp.type = 0  # INPUT_MOUSE
    inp.mi.dx = 0
    inp.mi.dy = 0
    inp.mi.mouseData = mouse_data & 0xFFFFFFFF
    inp.mi.dwFlags = flag
    inp.mi.time = 0
    inp.mi.dwExtraInfo = 0
    result = _user32.SendInput(1, ctypes.pointer(inp), ctypes.sizeof(_INPUT))
    if result == 0:
        err = ctypes.get_last_error()
        print(f"[SendInput] 失败，错误码: {err}")
    return result > 0


def _set_dpi_aware():
    """设置 DPI 感知，确保坐标精确"""
    try:
        ctypes.windll.shcore.SetProcessDpiAwareness(2)
    except Exception:
        try:
            ctypes.windll.user32.SetProcessDPIAware()
        except Exception:
            pass


# ─────────────────────────────────────────────────────────────────────────────
# 鼠标事件标志常量
# ─────────────────────────────────────────────────────────────────────────────
_MOUSEEVENTF_LEFTDOWN   = 0x0002
_MOUSEEVENTF_LEFTUP     = 0x0004
_MOUSEEVENTF_RIGHTDOWN  = 0x0008
_MOUSEEVENTF_RIGHTUP    = 0x0010
_MOUSEEVENTF_MIDDLEDOWN = 0x0020
_MOUSEEVENTF_MIDDLEUP   = 0x0040
_MOUSEEVENTF_WHEEL      = 0x0800
_WHEEL_DELTA            = 120

_BUTTON_EVENTS = {
    "left":   (_MOUSEEVENTF_LEFTDOWN,   _MOUSEEVENTF_LEFTUP),
    "right":  (_MOUSEEVENTF_RIGHTDOWN,  _MOUSEEVENTF_RIGHTUP),
    "middle": (_MOUSEEVENTF_MIDDLEDOWN, _MOUSEEVENTF_MIDDLEUP),
}
_BUTTON_TEXT = {"left": "左键", "right": "右键", "middle": "中键"}


@register_executor
class RealMouseScrollExecutor(ModuleExecutor):
    """真实鼠标滚动模块执行器 - 使用 SendInput API 实现真正的硬件级滚轮模拟"""

    @property
    def module_type(self) -> str:
        return "real_mouse_scroll"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        if not _SENDINPUT_AVAILABLE:
            return ModuleResult(success=False, error="此功能仅支持 Windows 系统")

        direction     = context.resolve_value(config.get("direction", "down"))
        scroll_amount = to_int(config.get("scrollAmount", 3), 3, context)
        scroll_count  = to_int(config.get("scrollCount", 1), 1, context)
        scroll_interval = to_float(config.get("scrollInterval", 0.1), 0.1, context)

        try:
            delta = _WHEEL_DELTA * scroll_amount
            if direction == "down":
                delta = -delta

            for i in range(scroll_count):
                _send_mouse_event(_MOUSEEVENTF_WHEEL, delta)
                if i < scroll_count - 1 and scroll_interval > 0:
                    await asyncio.sleep(scroll_interval)

            direction_text = "向下" if direction == "down" else "向上"
            return ModuleResult(
                success=True,
                message=f"已{direction_text}滚动 {scroll_count} 次，每次 {scroll_amount} 格"
            )
        except Exception as e:
            return ModuleResult(success=False, error=f"真实鼠标滚动失败: {str(e)}")


@register_executor
class RealMouseClickExecutor(ModuleExecutor):
    """真实鼠标点击模块执行器 - 使用 SendInput API 实现真正的硬件级鼠标点击"""

    @property
    def module_type(self) -> str:
        return "real_mouse_click"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        if not _SENDINPUT_AVAILABLE:
            return ModuleResult(success=False, error="此功能仅支持 Windows 系统")

        x            = context.resolve_value(config.get("x", ""))
        y            = context.resolve_value(config.get("y", ""))
        button       = context.resolve_value(config.get("button", "left"))
        click_type   = context.resolve_value(config.get("clickType", "single"))
        hold_duration = to_float(config.get("holdDuration", 1), 1, context)

        if not str(x).strip() or not str(y).strip():
            return ModuleResult(success=False, error="X和Y坐标不能为空")

        try:
            x = int(float(str(x).strip()))
            y = int(float(str(y).strip()))
        except (ValueError, TypeError):
            return ModuleResult(success=False, error=f"坐标必须是数字，当前值: x={x}, y={y}")

        try:
            _set_dpi_aware()

            down_event, up_event = _BUTTON_EVENTS.get(button, _BUTTON_EVENTS["left"])
            button_text = _BUTTON_TEXT.get(button, "左键")

            if click_type == "hold":
                _user32.SetCursorPos(x, y)
                await asyncio.sleep(0.02)
                _send_mouse_event(down_event)
                await asyncio.sleep(hold_duration)
                _send_mouse_event(up_event)
                return ModuleResult(
                    success=True,
                    message=f"已在 ({x}, {y}) 执行{button_text}长按 {hold_duration}秒"
                )
            else:
                click_count = 2 if click_type == "double" else 1
                _user32.SetCursorPos(x, y)
                await asyncio.sleep(0.02)

                for _ in range(click_count):
                    _send_mouse_event(down_event)
                    await asyncio.sleep(0.05)
                    _send_mouse_event(up_event)
                    if click_type == "double":
                        await asyncio.sleep(0.1)

                click_text = "双击" if click_type == "double" else "单击"
                return ModuleResult(
                    success=True,
                    message=f"已在 ({x}, {y}) 执行{button_text}{click_text}"
                )

        except Exception as e:
            return ModuleResult(success=False, error=f"鼠标点击失败: {str(e)}")


@register_executor
class RealMouseMoveExecutor(ModuleExecutor):
    """真实鼠标移动模块执行器 - 使用 SetCursorPos 实现精确的鼠标移动"""

    @property
    def module_type(self) -> str:
        return "real_mouse_move"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        x        = context.resolve_value(config.get("x", ""))
        y        = context.resolve_value(config.get("y", ""))
        duration = to_float(config.get("duration", 0), 0, context)

        if not str(x).strip() or not str(y).strip():
            return ModuleResult(success=False, error="X和Y坐标不能为空")

        try:
            target_x = int(float(str(x).strip()))
            target_y = int(float(str(y).strip()))
        except (ValueError, TypeError):
            return ModuleResult(success=False, error=f"坐标必须是数字，当前值: x={x}, y={y}")

        try:
            _set_dpi_aware()

            if duration > 0:
                class _POINT(ctypes.Structure):
                    _fields_ = [("x", ctypes.c_long), ("y", ctypes.c_long)]

                pt = _POINT()
                _user32.GetCursorPos(ctypes.byref(pt))
                start_x, start_y = pt.x, pt.y
                steps = max(10, int(duration * 100))

                for i in range(steps + 1):
                    progress = i / steps
                    cur_x = int(start_x + (target_x - start_x) * progress)
                    cur_y = int(start_y + (target_y - start_y) * progress)
                    _user32.SetCursorPos(cur_x, cur_y)
                    await asyncio.sleep(duration / steps)
            else:
                _user32.SetCursorPos(target_x, target_y)

            return ModuleResult(
                success=True,
                message=f"鼠标已移动到 ({target_x}, {target_y})"
            )
        except Exception as e:
            return ModuleResult(success=False, error=f"鼠标移动失败: {str(e)}")


@register_executor
class RealMouseDragExecutor(ModuleExecutor):
    """真实鼠标拖拽模块执行器 - 使用 SetCursorPos + SendInput 实现精确的鼠标拖拽"""

    @property
    def module_type(self) -> str:
        return "real_mouse_drag"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        if not _SENDINPUT_AVAILABLE:
            return ModuleResult(success=False, error="此功能仅支持 Windows 系统")

        start_x  = context.resolve_value(config.get("startX", ""))
        start_y  = context.resolve_value(config.get("startY", ""))
        end_x    = context.resolve_value(config.get("endX", ""))
        end_y    = context.resolve_value(config.get("endY", ""))
        button   = context.resolve_value(config.get("button", "left"))
        duration = to_float(config.get("duration", 0.5), 0.5, context)

        if not str(start_x).strip() or not str(start_y).strip():
            return ModuleResult(success=False, error="起点坐标不能为空")
        if not str(end_x).strip() or not str(end_y).strip():
            return ModuleResult(success=False, error="终点坐标不能为空")

        try:
            start_x = int(float(str(start_x).strip()))
            start_y = int(float(str(start_y).strip()))
            end_x   = int(float(str(end_x).strip()))
            end_y   = int(float(str(end_y).strip()))
        except (ValueError, TypeError):
            return ModuleResult(success=False, error="坐标必须是数字")

        try:
            _set_dpi_aware()

            down_event, up_event = _BUTTON_EVENTS.get(button, _BUTTON_EVENTS["left"])
            button_text = _BUTTON_TEXT.get(button, "左键")

            # 移动到起点 → 按下 → 平滑拖拽 → 释放
            _user32.SetCursorPos(start_x, start_y)
            await asyncio.sleep(0.05)
            _send_mouse_event(down_event)
            await asyncio.sleep(0.05)

            steps = max(10, int(duration * 50))
            for i in range(1, steps + 1):
                progress = i / steps
                cur_x = int(start_x + (end_x - start_x) * progress)
                cur_y = int(start_y + (end_y - start_y) * progress)
                _user32.SetCursorPos(cur_x, cur_y)
                await asyncio.sleep(duration / steps)

            await asyncio.sleep(0.05)
            _send_mouse_event(up_event)

            return ModuleResult(
                success=True,
                message=f"已使用{button_text}从 ({start_x}, {start_y}) 拖拽到 ({end_x}, {end_y})"
            )
        except Exception as e:
            return ModuleResult(success=False, error=f"鼠标拖拽失败: {str(e)}")


@register_executor
class GetMousePositionExecutor(ModuleExecutor):
    """获取鼠标位置模块执行器"""

    @property
    def module_type(self) -> str:
        return "get_mouse_position"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        variable_name_x = config.get("variableNameX", "")
        variable_name_y = config.get("variableNameY", "")

        if not variable_name_x and not variable_name_y:
            return ModuleResult(success=False, error="至少需要指定一个变量名")

        try:
            class _POINT(ctypes.Structure):
                _fields_ = [("x", ctypes.c_long), ("y", ctypes.c_long)]

            pt = _POINT()
            ctypes.windll.user32.GetCursorPos(ctypes.byref(pt))

            if variable_name_x:
                context.set_variable(variable_name_x, pt.x)
            if variable_name_y:
                context.set_variable(variable_name_y, pt.y)

            return ModuleResult(
                success=True,
                message=f"鼠标位置: ({pt.x}, {pt.y})",
                data={"x": pt.x, "y": pt.y}
            )
        except Exception as e:
            return ModuleResult(success=False, error=f"获取鼠标位置失败: {str(e)}")
