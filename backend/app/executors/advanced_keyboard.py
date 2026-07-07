"""高级模块执行器 - advanced_keyboard"""
from .base import ModuleExecutor, ExecutionContext, ModuleResult, register_executor
from .type_utils import to_int, to_float, parse_search_region
import asyncio
import ctypes
import re
import time


def escape_css_selector(selector: str) -> str:
    """转义 CSS 选择器中的特殊字符"""
    if not selector:
        return selector
    # 如果选择器看起来已经是有效的，直接返回
    if selector.startswith(('#', '.', '[')) or ' ' in selector or '>' in selector:
        return selector
    # 否则尝试转义
    return selector


@register_executor
class KeyboardActionExecutor(ModuleExecutor):
    """键盘操作模块执行器"""

    @property
    def module_type(self) -> str:
        return "keyboard_action"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        target_type = context.resolve_value(config.get("targetType", "page"))  # 支持变量引用
        selector = context.resolve_value(config.get("selector", ""))
        key_sequence = context.resolve_value(config.get("keySequence", ""))
        delay = to_float(config.get("delay", 0), 0, context)  # 按键延迟(秒)
        press_mode = context.resolve_value(config.get("pressMode", "click"))  # 支持变量引用
        hold_duration = to_float(config.get("holdDuration", 1), 1, context)  # 长按时长(秒)

        if not key_sequence:
            return ModuleResult(success=False, error="按键序列不能为空")

        if context.page is None:
            return ModuleResult(success=False, error="没有打开的页面")

        try:
            await context.switch_to_latest_page()

            if target_type == "element" and selector:
                element = context.page.locator(escape_css_selector(selector))
                await element.focus()
                await asyncio.sleep(0.1)

            # 键名映射：将用户友好的键名转换为 Playwright 需要的键名
            KEY_MAP = {
                'ctrl': 'Control',
                'Ctrl': 'Control',
                'CTRL': 'Control',
                'alt': 'Alt',
                'ALT': 'Alt',
                'shift': 'Shift',
                'SHIFT': 'Shift',
                'meta': 'Meta',
                'win': 'Meta',
                'Win': 'Meta',
                'WIN': 'Meta',
                'enter': 'Enter',
                'ENTER': 'Enter',
                'tab': 'Tab',
                'TAB': 'Tab',
                'esc': 'Escape',
                'ESC': 'Escape',
                'escape': 'Escape',
                'backspace': 'Backspace',
                'BACKSPACE': 'Backspace',
                'delete': 'Delete',
                'DELETE': 'Delete',
                'space': 'Space',
                'SPACE': 'Space',
                'up': 'ArrowUp',
                'UP': 'ArrowUp',
                'down': 'ArrowDown',
                'DOWN': 'ArrowDown',
                'left': 'ArrowLeft',
                'LEFT': 'ArrowLeft',
                'right': 'ArrowRight',
                'RIGHT': 'ArrowRight',
            }
            
            keys = key_sequence.split("+")
            # 转换键名
            keys = [KEY_MAP.get(k.strip(), k.strip()) for k in keys]

            if press_mode == "hold":
                # 长按模式：按下所有键，等待指定时间，然后释放
                for key in keys:
                    await context.page.keyboard.down(key)
                
                await asyncio.sleep(hold_duration)
                
                for key in reversed(keys):
                    await context.page.keyboard.up(key)
                
                return ModuleResult(success=True, message=f"已长按 {key_sequence} {hold_duration}秒")
            else:
                # 点击模式（默认）- 修复组合键问题
                if len(keys) == 1:
                    # 单个按键
                    await context.page.keyboard.press(keys[0])
                else:
                    # 组合键：按下所有修饰键，按下并释放主键，释放所有修饰键
                    modifiers = keys[:-1]
                    main_key = keys[-1]

                    # 按下所有修饰键
                    for mod in modifiers:
                        await context.page.keyboard.down(mod)

                    if delay > 0:
                        await asyncio.sleep(delay)

                    # 按下并释放主键（使用press而不是单独的down/up）
                    await context.page.keyboard.press(main_key)

                    # 释放所有修饰键
                    for mod in reversed(modifiers):
                        await context.page.keyboard.up(mod)

                return ModuleResult(success=True, message=f"已执行键盘操作: {key_sequence}")

        except Exception as e:
            return ModuleResult(success=False, error=f"键盘操作失败: {str(e)}")

@register_executor
class RealKeyboardExecutor(ModuleExecutor):
    """真实键盘操作模块执行器 - 使用 SendInput API 实现真正的硬件级键盘输入"""

    @property
    def module_type(self) -> str:
        return "real_keyboard"

    # 虚拟键码映射
    VK_CODES = {
        # 功能键
        'enter': 0x0D, 'tab': 0x09, 'escape': 0x1B, 'backspace': 0x08,
        'delete': 0x2E, 'space': 0x20, 'up': 0x26, 'down': 0x28,
        'left': 0x25, 'right': 0x27, 'home': 0x24, 'end': 0x23,
        'pageup': 0x21, 'pagedown': 0x22,
        # F键
        'f1': 0x70, 'f2': 0x71, 'f3': 0x72, 'f4': 0x73, 'f5': 0x74,
        'f6': 0x75, 'f7': 0x76, 'f8': 0x77, 'f9': 0x78, 'f10': 0x79,
        'f11': 0x7A, 'f12': 0x7B,
        # 修饰键
        'ctrl': 0x11, 'alt': 0x12, 'shift': 0x10, 'win': 0x5B,
        # 字母键
        'a': 0x41, 'b': 0x42, 'c': 0x43, 'd': 0x44, 'e': 0x45,
        'f': 0x46, 'g': 0x47, 'h': 0x48, 'i': 0x49, 'j': 0x4A,
        'k': 0x4B, 'l': 0x4C, 'm': 0x4D, 'n': 0x4E, 'o': 0x4F,
        'p': 0x50, 'q': 0x51, 'r': 0x52, 's': 0x53, 't': 0x54,
        'u': 0x55, 'v': 0x56, 'w': 0x57, 'x': 0x58, 'y': 0x59, 'z': 0x5A,
        # 数字键
        '0': 0x30, '1': 0x31, '2': 0x32, '3': 0x33, '4': 0x34,
        '5': 0x35, '6': 0x36, '7': 0x37, '8': 0x38, '9': 0x39,
        # 符号键（主键盘区）
        ';': 0xBA, '=': 0xBB, ',': 0xBC, '-': 0xBD, '.': 0xBE, '/': 0xBF,
        '`': 0xC0, '[': 0xDB, '\\': 0xDC, ']': 0xDD, "'": 0xDE,
        # 小键盘区
        'numpad0': 0x60, 'numpad1': 0x61, 'numpad2': 0x62, 'numpad3': 0x63,
        'numpad4': 0x64, 'numpad5': 0x65, 'numpad6': 0x66, 'numpad7': 0x67,
        'numpad8': 0x68, 'numpad9': 0x69,
        'multiply': 0x6A, 'add': 0x6B, 'subtract': 0x6D, 'decimal': 0x6E, 'divide': 0x6F,
    }

    @staticmethod
    def _activate_window_by_title(title_substr: str) -> bool:
        """按标题子串查找顶层窗口并激活到前台（Alt 键技巧绕过前台锁定）。找到并激活返回 True。"""
        import ctypes
        from ctypes import wintypes
        user32 = ctypes.windll.user32
        found = {"hwnd": None}

        @ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
        def _enum(hwnd, _lparam):
            if not user32.IsWindowVisible(hwnd):
                return True
            length = user32.GetWindowTextLengthW(hwnd)
            if length <= 0:
                return True
            buf = ctypes.create_unicode_buffer(length + 1)
            user32.GetWindowTextW(hwnd, buf, length + 1)
            if title_substr.lower() in (buf.value or "").lower():
                found["hwnd"] = hwnd
                return False
            return True

        try:
            user32.EnumWindows(_enum, 0)
        except Exception:
            pass
        hwnd = found["hwnd"]
        if not hwnd:
            return False
        try:
            SW_RESTORE = 9
            user32.ShowWindow(hwnd, SW_RESTORE)
            user32.keybd_event(0x12, 0, 0, 0)       # Alt down（绕过前台锁定）
            user32.keybd_event(0x12, 0, 0x0002, 0)  # Alt up
            user32.SetForegroundWindow(hwnd)
            user32.BringWindowToTop(hwnd)
            user32.SetActiveWindow(hwnd)
        except Exception:
            pass
        return True

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        import ctypes
        from ctypes import wintypes, POINTER, c_ulong, sizeof, byref

        input_type = context.resolve_value(config.get("inputType", "text"))  # 支持变量引用
        press_mode = context.resolve_value(config.get("pressMode", "click"))  # 支持变量引用
        hold_duration = to_float(config.get("holdDuration", 1), 1, context)  # 长按时长(秒)

        # 发送硬件按键前先激活目标窗口，否则按键会打进 WebRPA 自己的窗口，表现为"完全没反应"
        window_title = context.resolve_value(config.get("windowTitle", "") or "")
        if window_title:
            try:
                if self._activate_window_by_title(str(window_title)):
                    await asyncio.sleep(0.35)
                else:
                    print(f"[real_keyboard] 未找到标题包含『{window_title}』的窗口，按键将发往当前前台窗口")
            except Exception as _e:
                print(f"[real_keyboard] 激活窗口失败: {_e}")

        try:
            # SendInput 结构体定义 - 使用正确的内存布局
            INPUT_KEYBOARD = 1
            KEYEVENTF_KEYUP = 0x0002
            KEYEVENTF_UNICODE = 0x0004
            
            # 正确的 KEYBDINPUT 结构体
            class KEYBDINPUT(ctypes.Structure):
                _fields_ = [
                    ("wVk", wintypes.WORD),
                    ("wScan", wintypes.WORD),
                    ("dwFlags", wintypes.DWORD),
                    ("time", wintypes.DWORD),
                    ("dwExtraInfo", POINTER(c_ulong))
                ]
            
            # 正确的 MOUSEINPUT 结构体（用于 Union 对齐）
            class MOUSEINPUT(ctypes.Structure):
                _fields_ = [
                    ("dx", wintypes.LONG),
                    ("dy", wintypes.LONG),
                    ("mouseData", wintypes.DWORD),
                    ("dwFlags", wintypes.DWORD),
                    ("time", wintypes.DWORD),
                    ("dwExtraInfo", POINTER(c_ulong))
                ]
            
            # 正确的 HARDWAREINPUT 结构体
            class HARDWAREINPUT(ctypes.Structure):
                _fields_ = [
                    ("uMsg", wintypes.DWORD),
                    ("wParamL", wintypes.WORD),
                    ("wParamH", wintypes.WORD)
                ]
            
            # INPUT 联合体
            class INPUT_UNION(ctypes.Union):
                _fields_ = [
                    ("mi", MOUSEINPUT),
                    ("ki", KEYBDINPUT),
                    ("hi", HARDWAREINPUT)
                ]
            
            # INPUT 结构体
            class INPUT(ctypes.Structure):
                _fields_ = [
                    ("type", wintypes.DWORD),
                    ("union", INPUT_UNION)
                ]
            
            # 获取 SendInput 函数
            SendInput = ctypes.windll.user32.SendInput
            SendInput.argtypes = [wintypes.UINT, POINTER(INPUT), ctypes.c_int]
            SendInput.restype = wintypes.UINT
            
            def send_unicode_char(char):
                """发送 Unicode 字符"""
                inputs = (INPUT * 2)()
                
                # 按下
                inputs[0].type = INPUT_KEYBOARD
                inputs[0].union.ki.wVk = 0
                inputs[0].union.ki.wScan = ord(char)
                inputs[0].union.ki.dwFlags = KEYEVENTF_UNICODE
                inputs[0].union.ki.time = 0
                inputs[0].union.ki.dwExtraInfo = ctypes.pointer(c_ulong(0))
                
                # 释放
                inputs[1].type = INPUT_KEYBOARD
                inputs[1].union.ki.wVk = 0
                inputs[1].union.ki.wScan = ord(char)
                inputs[1].union.ki.dwFlags = KEYEVENTF_UNICODE | KEYEVENTF_KEYUP
                inputs[1].union.ki.time = 0
                inputs[1].union.ki.dwExtraInfo = ctypes.pointer(c_ulong(0))
                
                result = SendInput(2, inputs, sizeof(INPUT))
                return result
            
            def send_key_down(vk_code):
                """发送按键按下事件"""
                inputs = (INPUT * 1)()
                inputs[0].type = INPUT_KEYBOARD
                inputs[0].union.ki.wVk = vk_code
                inputs[0].union.ki.wScan = ctypes.windll.user32.MapVirtualKeyW(vk_code, 0)
                inputs[0].union.ki.dwFlags = 0
                inputs[0].union.ki.time = 0
                inputs[0].union.ki.dwExtraInfo = ctypes.pointer(c_ulong(0))
                return SendInput(1, inputs, sizeof(INPUT))
            
            def send_key_up(vk_code):
                """发送按键释放事件"""
                inputs = (INPUT * 1)()
                inputs[0].type = INPUT_KEYBOARD
                inputs[0].union.ki.wVk = vk_code
                inputs[0].union.ki.wScan = ctypes.windll.user32.MapVirtualKeyW(vk_code, 0)
                inputs[0].union.ki.dwFlags = KEYEVENTF_KEYUP
                inputs[0].union.ki.time = 0
                inputs[0].union.ki.dwExtraInfo = ctypes.pointer(c_ulong(0))
                return SendInput(1, inputs, sizeof(INPUT))

            if input_type == "text":
                text = context.resolve_value(config.get("text", ""))
                interval = to_float(config.get("interval", 0.05), 0.05, context)  # 按键间隔(秒)
                
                # 调试日志
                print(f"[DEBUG] real_keyboard text mode: text='{text}', interval={interval}")
                
                if not text:
                    return ModuleResult(success=False, error="输入文本不能为空")

                # 使用 SendInput Unicode 输入
                success_count = 0
                for char in text:
                    result = send_unicode_char(char)
                    if result > 0:
                        success_count += 1
                    await asyncio.sleep(interval)

                display_text = text[:30] + "..." if len(text) > 30 else text
                if success_count == len(text):
                    return ModuleResult(success=True, message=f"已输入文本: {display_text}")
                else:
                    return ModuleResult(success=False, error=f"输入文本部分失败: 成功 {success_count}/{len(text)} 个字符")

            elif input_type == "key":
                key = context.resolve_value(config.get("key", "enter")).lower()  # 支持变量引用
                vk_code = self.VK_CODES.get(key)
                
                if vk_code is None:
                    return ModuleResult(success=False, error=f"不支持的按键: {key}")

                if press_mode == "hold":
                    # 长按模式
                    send_key_down(vk_code)
                    await asyncio.sleep(hold_duration)
                    send_key_up(vk_code)
                    return ModuleResult(success=True, message=f"已长按按键: {key.upper()} {hold_duration}秒")
                else:
                    # 点击模式
                    send_key_down(vk_code)
                    await asyncio.sleep(0.05)
                    send_key_up(vk_code)
                    return ModuleResult(success=True, message=f"已按下按键: {key.upper()}")

            elif input_type == "hotkey":
                hotkey = context.resolve_value(config.get("hotkey", "")).lower()  # 支持变量引用
                
                if not hotkey:
                    return ModuleResult(success=False, error="组合键不能为空")

                keys = [k.strip() for k in hotkey.split("+")]
                vk_codes = []
                
                for key in keys:
                    vk_code = self.VK_CODES.get(key)
                    if vk_code is None:
                        return ModuleResult(success=False, error=f"不支持的按键: {key}")
                    vk_codes.append(vk_code)

                # 按下所有键
                for vk_code in vk_codes:
                    send_key_down(vk_code)
                    await asyncio.sleep(0.02)

                if press_mode == "hold":
                    # 长按模式
                    await asyncio.sleep(hold_duration)
                else:
                    await asyncio.sleep(0.05)

                # 释放所有键（逆序）
                for vk_code in reversed(vk_codes):
                    send_key_up(vk_code)
                    await asyncio.sleep(0.02)

                if press_mode == "hold":
                    return ModuleResult(success=True, message=f"已长按组合键: {hotkey.upper()} {hold_duration}秒")
                else:
                    return ModuleResult(success=True, message=f"已执行组合键: {hotkey.upper()}")

            else:
                return ModuleResult(success=False, error=f"未知输入类型: {input_type}")

        except Exception as e:
            return ModuleResult(success=False, error=f"键盘操作失败: {str(e)}")