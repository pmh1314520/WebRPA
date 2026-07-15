"""高级模块执行器 - advanced_image"""
from .base import ModuleExecutor, ExecutionContext, ModuleResult, register_executor
from .type_utils import to_int, to_float, parse_search_region
from datetime import datetime
from pathlib import Path
import asyncio
import ctypes
import os
import random
import re
import time


@register_executor
class ClickImageExecutor(ModuleExecutor):
    """点击图像模块执行器 - 在屏幕上查找指定图像并点击"""

    @property
    def module_type(self) -> str:
        return "click_image"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        import ctypes

        image_path = context.resolve_value(config.get("imagePath", ""))
        confidence = to_float(config.get("confidence", 0.8), 0.8, context)  # 匹配置信度
        button = context.resolve_value(config.get("button", "left"))  # 鼠标按键
        click_type = context.resolve_value(config.get("clickType", "single"))  # 点击类型: single, double, hold
        click_position = context.resolve_value(config.get("clickPosition", "center"))  # 点击位置
        wait_timeout = to_int(config.get("waitTimeout", 10), 10, context)  # 等待超时
        search_region = config.get("searchRegion", None)  # 搜索区域
        hold_duration = to_int(config.get("holdDuration", 1000), 1000, context)  # 长按时长（毫秒）
        user_offset_x = to_int(config.get("offsetX", 0), 0, context)  # 用户设置的横向偏移量
        user_offset_y = to_int(config.get("offsetY", 0), 0, context)  # 用户设置的纵向偏移量
        
        # 调试：打印配置信息
        print(f"[ClickImage] 配置信息:")
        print(f"  - offsetX from config: {config.get('offsetX', 'NOT_FOUND')}")
        print(f"  - offsetY from config: {config.get('offsetY', 'NOT_FOUND')}")
        print(f"  - user_offset_x parsed: {user_offset_x}")
        print(f"  - user_offset_y parsed: {user_offset_y}")
        print(f"  - clickPosition: {click_position}")

        if not image_path:
            return ModuleResult(success=False, error="图像路径不能为空")

        if not Path(image_path).exists():
            return ModuleResult(success=False, error=f"图像文件不存在: {image_path}")

        try:
            import cv2
            import numpy as np
            
            # 设置 DPI 感知，确保坐标准确
            try:
                ctypes.windll.shcore.SetProcessDpiAwareness(2)
            except Exception:
                try:
                    ctypes.windll.user32.SetProcessDPIAware()
                except Exception:
                    pass
            
            # 读取模板图像（支持中文路径）
            template = cv2.imdecode(np.fromfile(image_path, dtype=np.uint8), cv2.IMREAD_COLOR)
            if template is None:
                return ModuleResult(success=False, error="无法读取图像文件，请检查图像格式")

            template_gray = cv2.cvtColor(template, cv2.COLOR_BGR2GRAY)
            h, w = template_gray.shape

            start_time = time.time()
            found = False
            click_x, click_y = 0, 0
            best_confidence = 0

            # 解析搜索区域（支持两点模式和起点+宽高模式）
            region_x, region_y, region_w, region_h = parse_search_region(search_region)
            use_region = region_w > 0 and region_h > 0

            # 获取完整的虚拟屏幕尺寸（支持多显示器）
            SM_XVIRTUALSCREEN = 76
            SM_YVIRTUALSCREEN = 77
            SM_CXVIRTUALSCREEN = 78
            SM_CYVIRTUALSCREEN = 79
            
            virtual_left = ctypes.windll.user32.GetSystemMetrics(SM_XVIRTUALSCREEN)
            virtual_top = ctypes.windll.user32.GetSystemMetrics(SM_YVIRTUALSCREEN)
            virtual_width = ctypes.windll.user32.GetSystemMetrics(SM_CXVIRTUALSCREEN)
            virtual_height = ctypes.windll.user32.GetSystemMetrics(SM_CYVIRTUALSCREEN)

            while time.time() - start_time < wait_timeout:
                # 截取屏幕
                if use_region:
                    # 使用指定区域截图
                    from PIL import ImageGrab
                    screenshot_pil = ImageGrab.grab(bbox=(region_x, region_y, region_x + region_w, region_y + region_h))
                    screen = cv2.cvtColor(np.array(screenshot_pil), cv2.COLOR_RGB2BGR)
                    screen_offset_x, screen_offset_y = region_x, region_y
                else:
                    # 使用 Windows API 截取完整屏幕（支持多显示器）
                    try:
                        import win32gui
                        import win32ui
                        import win32con
                        
                        hdesktop = win32gui.GetDesktopWindow()
                        desktop_dc = win32gui.GetWindowDC(hdesktop)
                        img_dc = win32ui.CreateDCFromHandle(desktop_dc)
                        mem_dc = img_dc.CreateCompatibleDC()
                        
                        screenshot = win32ui.CreateBitmap()
                        screenshot.CreateCompatibleBitmap(img_dc, virtual_width, virtual_height)
                        mem_dc.SelectObject(screenshot)
                        mem_dc.BitBlt((0, 0), (virtual_width, virtual_height), img_dc, 
                                      (virtual_left, virtual_top), win32con.SRCCOPY)
                        
                        bmpinfo = screenshot.GetInfo()
                        bmpstr = screenshot.GetBitmapBits(True)
                        screen = np.frombuffer(bmpstr, dtype=np.uint8).reshape(
                            (bmpinfo['bmHeight'], bmpinfo['bmWidth'], 4))
                        screen = cv2.cvtColor(screen, cv2.COLOR_BGRA2BGR)
                        
                        mem_dc.DeleteDC()
                        win32gui.DeleteObject(screenshot.GetHandle())
                        win32gui.ReleaseDC(hdesktop, desktop_dc)
                        screen_offset_x, screen_offset_y = virtual_left, virtual_top
                        
                    except ImportError:
                        from PIL import ImageGrab
                        screenshot_pil = ImageGrab.grab(all_screens=True)
                        screen = cv2.cvtColor(np.array(screenshot_pil), cv2.COLOR_RGB2BGR)
                        screen_offset_x, screen_offset_y = 0, 0

                screen_gray = cv2.cvtColor(screen, cv2.COLOR_BGR2GRAY)

                # 模板匹配
                result = cv2.matchTemplate(screen_gray, template_gray, cv2.TM_CCOEFF_NORMED)
                min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(result)

                if max_val >= confidence:
                    # 找到匹配，根据点击位置计算实际坐标
                    img_left = screen_offset_x + max_loc[0]
                    img_top = screen_offset_y + max_loc[1]
                    img_right = img_left + w
                    img_bottom = img_top + h
                    
                    # 根据点击位置计算坐标
                    click_x, click_y = self._calculate_click_position(
                        click_position, img_left, img_top, img_right, img_bottom, w, h
                    )
                    
                    # 应用用户设置的偏移量
                    print(f"[ClickImage] 原始坐标: ({click_x}, {click_y}), 用户偏移量: ({user_offset_x}, {user_offset_y})")
                    click_x += user_offset_x
                    click_y += user_offset_y
                    print(f"[ClickImage] 应用偏移后坐标: ({click_x}, {click_y})")
                    
                    best_confidence = max_val
                    found = True
                    break

                await asyncio.sleep(0.3)

            if not found:
                return ModuleResult(
                    success=False, 
                    error=f"在 {wait_timeout} 秒内未找到匹配的图像（最高匹配度: {best_confidence:.2%}）"
                )

            # 执行点击 - 使用 SendInput API
            from ctypes import wintypes
            
            INPUT_MOUSE = 0
            MOUSEEVENTF_MOVE = 0x0001
            MOUSEEVENTF_ABSOLUTE = 0x8000
            MOUSEEVENTF_VIRTUALDESK = 0x4000  # 支持多显示器
            MOUSEEVENTF_LEFTDOWN = 0x0002
            MOUSEEVENTF_LEFTUP = 0x0004
            MOUSEEVENTF_RIGHTDOWN = 0x0008
            MOUSEEVENTF_RIGHTUP = 0x0010
            MOUSEEVENTF_MIDDLEDOWN = 0x0020
            MOUSEEVENTF_MIDDLEUP = 0x0040
            
            class MOUSEINPUT(ctypes.Structure):
                _fields_ = [
                    ("dx", wintypes.LONG),
                    ("dy", wintypes.LONG),
                    ("mouseData", wintypes.DWORD),
                    ("dwFlags", wintypes.DWORD),
                    ("time", wintypes.DWORD),
                    ("dwExtraInfo", ctypes.POINTER(ctypes.c_ulong))
                ]
            
            class INPUT(ctypes.Structure):
                _fields_ = [
                    ("type", wintypes.DWORD),
                    ("mi", MOUSEINPUT)
                ]

            # 使用虚拟桌面坐标系统
            abs_x = int((click_x - virtual_left) * 65535 / virtual_width)
            abs_y = int((click_y - virtual_top) * 65535 / virtual_height)

            # 选择按键事件
            if button == "left":
                down_event = MOUSEEVENTF_LEFTDOWN
                up_event = MOUSEEVENTF_LEFTUP
            elif button == "right":
                down_event = MOUSEEVENTF_RIGHTDOWN
                up_event = MOUSEEVENTF_RIGHTUP
            else:
                down_event = MOUSEEVENTF_MIDDLEDOWN
                up_event = MOUSEEVENTF_MIDDLEUP
            
            # 设置 DPI 感知
            try:
                ctypes.windll.shcore.SetProcessDpiAwareness(2)
            except Exception:
                try:
                    ctypes.windll.user32.SetProcessDPIAware()
                except Exception:
                    pass
            
            # 使用【独立】的 user32 实例，避免与真实鼠标/键盘模块共享
            # ctypes.windll.user32.SendInput 时，各自用不同 INPUT 结构体设置 argtypes
            # 造成交叉污染、类型不匹配报错
            user32 = ctypes.WinDLL('user32', use_last_error=True)
            
            # 定义SendInput函数的参数类型（确保类型正确）
            user32.SendInput.argtypes = [
                wintypes.UINT,  # nInputs
                ctypes.POINTER(INPUT),  # pInputs
                ctypes.c_int  # cbSize
            ]
            user32.SendInput.restype = wintypes.UINT
            
            # 发送鼠标按键事件
            def send_mouse_event(event_flag):
                inp = INPUT()
                inp.type = INPUT_MOUSE
                inp.mi.dx = 0
                inp.mi.dy = 0
                inp.mi.mouseData = 0
                inp.mi.dwFlags = event_flag
                inp.mi.time = 0
                inp.mi.dwExtraInfo = ctypes.pointer(ctypes.c_ulong(0))
                # 使用ctypes.pointer传递结构体指针
                result = user32.SendInput(1, ctypes.pointer(inp), ctypes.sizeof(INPUT))
                if result == 0:
                    # 如果SendInput失败，记录错误但不中断执行
                    error_code = ctypes.get_last_error()
                    print(f"SendInput failed with error code: {error_code}")
                return result

            # 使用 SetCursorPos 移动鼠标（更精确）
            user32.SetCursorPos(int(click_x), int(click_y))
            await asyncio.sleep(0.02)
            
            # 执行点击
            if click_type == "hold":
                # 长按模式
                send_mouse_event(down_event)
                await asyncio.sleep(hold_duration / 1000)  # 转换为秒
                send_mouse_event(up_event)
                action_name = f"长按 {hold_duration}ms"
            else:
                # 单击或双击
                click_count = 2 if click_type == "double" else 1
                for _ in range(click_count):
                    send_mouse_event(down_event)
                    await asyncio.sleep(0.05)
                    send_mouse_event(up_event)
                    if click_type == "double":
                        await asyncio.sleep(0.1)
                action_name = "双击" if click_type == "double" else "点击"

            position_name = self._get_position_name(click_position)
            offset_info = f"，偏移量: ({user_offset_x}, {user_offset_y})" if (user_offset_x != 0 or user_offset_y != 0) else ""
            return ModuleResult(
                success=True, 
                message=f"已在图像{position_name} ({click_x}, {click_y}) 执行{action_name}，匹配度: {best_confidence:.2%}{offset_info}",
                data={"x": click_x, "y": click_y, "confidence": best_confidence, "position": click_position, "offsetX": user_offset_x, "offsetY": user_offset_y}
            )

        except ImportError as e:
            missing = str(e).split("'")[1] if "'" in str(e) else "opencv-python/Pillow"
            return ModuleResult(
                success=False, 
                error=f"需要安装依赖库: pip install {missing}"
            )
        except Exception as e:
            return ModuleResult(success=False, error=f"点击图像失败: {str(e)}")
    
    def _calculate_click_position(self, position: str, left: int, top: int, right: int, bottom: int, w: int, h: int) -> tuple:
        """根据点击位置计算实际坐标"""
        if position == "center":
            return (left + w // 2, top + h // 2)
        elif position == "top-left":
            return (left + 5, top + 5)
        elif position == "top-right":
            return (right - 5, top + 5)
        elif position == "bottom-left":
            return (left + 5, bottom - 5)
        elif position == "bottom-right":
            return (right - 5, bottom - 5)
        elif position == "top":
            return (left + w // 2, top + 5)
        elif position == "bottom":
            return (left + w // 2, bottom - 5)
        elif position == "left":
            return (left + 5, top + h // 2)
        elif position == "right":
            return (right - 5, top + h // 2)
        elif position == "random":
            # 在图像范围内随机选择一个点（留5像素边距）
            margin = 5
            rand_x = random.randint(left + margin, right - margin)
            rand_y = random.randint(top + margin, bottom - margin)
            return (rand_x, rand_y)
        else:
            # 默认中心
            return (left + w // 2, top + h // 2)
    
    def _get_position_name(self, position: str) -> str:
        """获取位置的中文名称"""
        names = {
            "center": "中心",
            "top-left": "左上角",
            "top-right": "右上角",
            "bottom-left": "左下角",
            "bottom-right": "右下角",
            "top": "顶部",
            "bottom": "底部",
            "left": "左侧",
            "right": "右侧",
            "random": "随机位置"
        }
        return names.get(position, "中心")

@register_executor
class HoverImageExecutor(ModuleExecutor):
    """鼠标悬停在图像上模块执行器 - 在屏幕上查找指定图像并将鼠标悬停在上面"""

    @property
    def module_type(self) -> str:
        return "hover_image"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        import ctypes

        image_path = context.resolve_value(config.get("imagePath", ""))
        confidence = to_float(config.get("confidence", 0.8), 0.8, context)
        hover_position = context.resolve_value(config.get("hoverPosition", "center"))
        hover_duration = to_int(config.get("hoverDuration", 500), 500, context)  # 悬停时长（毫秒）
        wait_timeout = to_int(config.get("waitTimeout", 10), 10, context)
        result_variable = config.get("resultVariable", "")
        search_region = config.get("searchRegion", None)  # 搜索区域

        if not image_path:
            return ModuleResult(success=False, error="图像路径不能为空")

        if not Path(image_path).exists():
            return ModuleResult(success=False, error=f"图像文件不存在: {image_path}")

        try:
            import cv2
            import numpy as np
            
            # 设置 DPI 感知
            try:
                ctypes.windll.shcore.SetProcessDpiAwareness(2)
            except Exception:
                try:
                    ctypes.windll.user32.SetProcessDPIAware()
                except Exception:
                    pass
            
            # 读取模板图像
            template = cv2.imdecode(np.fromfile(image_path, dtype=np.uint8), cv2.IMREAD_COLOR)
            if template is None:
                return ModuleResult(success=False, error="无法读取图像文件")

            template_gray = cv2.cvtColor(template, cv2.COLOR_BGR2GRAY)
            h, w = template_gray.shape

            # 解析搜索区域（支持两点模式和起点+宽高模式）
            region_x, region_y, region_w, region_h = parse_search_region(search_region)
            use_region = region_w > 0 and region_h > 0

            # 获取虚拟屏幕尺寸
            SM_XVIRTUALSCREEN = 76
            SM_YVIRTUALSCREEN = 77
            SM_CXVIRTUALSCREEN = 78
            SM_CYVIRTUALSCREEN = 79
            
            virtual_left = ctypes.windll.user32.GetSystemMetrics(SM_XVIRTUALSCREEN)
            virtual_top = ctypes.windll.user32.GetSystemMetrics(SM_YVIRTUALSCREEN)
            virtual_width = ctypes.windll.user32.GetSystemMetrics(SM_CXVIRTUALSCREEN)
            virtual_height = ctypes.windll.user32.GetSystemMetrics(SM_CYVIRTUALSCREEN)

            start_time = time.time()
            found = False
            hover_x, hover_y = 0, 0
            best_confidence = 0

            while time.time() - start_time < wait_timeout:
                # 截取屏幕
                if use_region:
                    # 使用指定区域截图
                    from PIL import ImageGrab
                    screenshot_pil = ImageGrab.grab(bbox=(region_x, region_y, region_x + region_w, region_y + region_h))
                    screen = cv2.cvtColor(np.array(screenshot_pil), cv2.COLOR_RGB2BGR)
                    offset_x, offset_y = region_x, region_y
                else:
                    try:
                        import win32gui
                        import win32ui
                        import win32con
                        
                        hdesktop = win32gui.GetDesktopWindow()
                        desktop_dc = win32gui.GetWindowDC(hdesktop)
                        img_dc = win32ui.CreateDCFromHandle(desktop_dc)
                        mem_dc = img_dc.CreateCompatibleDC()
                        
                        screenshot = win32ui.CreateBitmap()
                        screenshot.CreateCompatibleBitmap(img_dc, virtual_width, virtual_height)
                        mem_dc.SelectObject(screenshot)
                        mem_dc.BitBlt((0, 0), (virtual_width, virtual_height), img_dc, 
                                      (virtual_left, virtual_top), win32con.SRCCOPY)
                        
                        bmpinfo = screenshot.GetInfo()
                        bmpstr = screenshot.GetBitmapBits(True)
                        screen = np.frombuffer(bmpstr, dtype=np.uint8).reshape(
                            (bmpinfo['bmHeight'], bmpinfo['bmWidth'], 4))
                        screen = cv2.cvtColor(screen, cv2.COLOR_BGRA2BGR)
                        
                        mem_dc.DeleteDC()
                        win32gui.DeleteObject(screenshot.GetHandle())
                        win32gui.ReleaseDC(hdesktop, desktop_dc)
                        offset_x, offset_y = virtual_left, virtual_top
                        
                    except ImportError:
                        from PIL import ImageGrab
                        screenshot_pil = ImageGrab.grab(all_screens=True)
                        screen = cv2.cvtColor(np.array(screenshot_pil), cv2.COLOR_RGB2BGR)
                        offset_x, offset_y = 0, 0

                screen_gray = cv2.cvtColor(screen, cv2.COLOR_BGR2GRAY)
                result = cv2.matchTemplate(screen_gray, template_gray, cv2.TM_CCOEFF_NORMED)
                min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(result)

                if max_val >= confidence:
                    img_left = offset_x + max_loc[0]
                    img_top = offset_y + max_loc[1]
                    img_right = img_left + w
                    img_bottom = img_top + h
                    
                    hover_x, hover_y = self._calculate_hover_position(
                        hover_position, img_left, img_top, img_right, img_bottom, w, h
                    )
                    best_confidence = max_val
                    found = True
                    break

                await asyncio.sleep(0.3)

            if not found:
                return ModuleResult(
                    success=False, 
                    error=f"在 {wait_timeout} 秒内未找到匹配的图像（最高匹配度: {best_confidence:.2%}）"
                )

            # 移动鼠标到目标位置
            user32 = ctypes.windll.user32
            user32.SetCursorPos(int(hover_x), int(hover_y))
            
            # 悬停指定时长
            await asyncio.sleep(hover_duration / 1000)
            
            result_data = {"x": hover_x, "y": hover_y, "confidence": best_confidence, "position": hover_position}
            if result_variable:
                context.set_variable(result_variable, result_data)

            position_name = self._get_position_name(hover_position)
            return ModuleResult(
                success=True, 
                message=f"已在图像{position_name} ({hover_x}, {hover_y}) 悬停 {hover_duration}ms，匹配度: {best_confidence:.2%}",
                data=result_data
            )

        except ImportError as e:
            missing = str(e).split("'")[1] if "'" in str(e) else "opencv-python/Pillow"
            return ModuleResult(success=False, error=f"需要安装依赖库: pip install {missing}")
        except Exception as e:
            return ModuleResult(success=False, error=f"悬停图像失败: {str(e)}")
    
    def _calculate_hover_position(self, position: str, left: int, top: int, right: int, bottom: int, w: int, h: int) -> tuple:
        """根据悬停位置计算实际坐标"""
        if position == "center":
            return (left + w // 2, top + h // 2)
        elif position == "top-left":
            return (left + 5, top + 5)
        elif position == "top-right":
            return (right - 5, top + 5)
        elif position == "bottom-left":
            return (left + 5, bottom - 5)
        elif position == "bottom-right":
            return (right - 5, bottom - 5)
        elif position == "top":
            return (left + w // 2, top + 5)
        elif position == "bottom":
            return (left + w // 2, bottom - 5)
        elif position == "left":
            return (left + 5, top + h // 2)
        elif position == "right":
            return (right - 5, top + h // 2)
        elif position == "random":
            margin = 5
            rand_x = random.randint(left + margin, right - margin)
            rand_y = random.randint(top + margin, bottom - margin)
            return (rand_x, rand_y)
        else:
            return (left + w // 2, top + h // 2)
    
    def _get_position_name(self, position: str) -> str:
        """获取位置的中文名称"""
        names = {
            "center": "中心",
            "top-left": "左上角",
            "top-right": "右上角",
            "bottom-left": "左下角",
            "bottom-right": "右下角",
            "top": "顶部",
            "bottom": "底部",
            "left": "左侧",
            "right": "右侧",
            "random": "随机位置"
        }
        return names.get(position, "中心")


@register_executor
class DragImageExecutor(ModuleExecutor):
    """拖拽图像模块执行器 - 在屏幕上查找图像1并拖拽到图像2或指定坐标"""

    @property
    def module_type(self) -> str:
        return "drag_image"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        import ctypes

        # 源图像（必填）
        source_image_path = context.resolve_value(config.get("sourceImagePath", ""))
        # 目标类型：image（图像）或 coordinate（坐标）
        target_type = context.resolve_value(config.get("targetType", "image"))
        # 目标图像（当 target_type 为 image 时使用）
        target_image_path = context.resolve_value(config.get("targetImagePath", ""))
        # 目标坐标（当 target_type 为 coordinate 时使用）
        target_x = to_int(config.get("targetX", 0), 0, context)
        target_y = to_int(config.get("targetY", 0), 0, context)
        # 匹配置信度
        confidence = to_float(config.get("confidence", 0.8), 0.8, context)
        # 拖拽持续时间（毫秒）
        drag_duration = to_int(config.get("dragDuration", 500), 500, context)
        # 等待超时
        wait_timeout = to_int(config.get("waitTimeout", 10), 10, context)
        # 搜索区域
        search_region = config.get("searchRegion", None)
        # 源图像点击位置
        source_position = context.resolve_value(config.get("sourcePosition", "center"))
        # 目标图像点击位置
        target_position = context.resolve_value(config.get("targetPosition", "center"))

        if not source_image_path:
            return ModuleResult(success=False, error="源图像路径不能为空")

        if not Path(source_image_path).exists():
            return ModuleResult(success=False, error=f"源图像文件不存在: {source_image_path}")

        if target_type == "image":
            if not target_image_path:
                return ModuleResult(success=False, error="目标图像路径不能为空")
            if not Path(target_image_path).exists():
                return ModuleResult(success=False, error=f"目标图像文件不存在: {target_image_path}")

        try:
            import cv2
            import numpy as np
            
            # 设置 DPI 感知
            try:
                ctypes.windll.shcore.SetProcessDpiAwareness(2)
            except Exception:
                try:
                    ctypes.windll.user32.SetProcessDPIAware()
                except Exception:
                    pass
            
            # 读取源图像
            source_template = cv2.imdecode(np.fromfile(source_image_path, dtype=np.uint8), cv2.IMREAD_COLOR)
            if source_template is None:
                return ModuleResult(success=False, error="无法读取源图像文件")
            source_gray = cv2.cvtColor(source_template, cv2.COLOR_BGR2GRAY)
            source_h, source_w = source_gray.shape

            # 如果目标是图像，读取目标图像
            target_template = None
            target_gray = None
            target_h, target_w = 0, 0
            if target_type == "image":
                target_template = cv2.imdecode(np.fromfile(target_image_path, dtype=np.uint8), cv2.IMREAD_COLOR)
                if target_template is None:
                    return ModuleResult(success=False, error="无法读取目标图像文件")
                target_gray = cv2.cvtColor(target_template, cv2.COLOR_BGR2GRAY)
                target_h, target_w = target_gray.shape

            # 解析搜索区域
            region_x, region_y, region_w, region_h = parse_search_region(search_region)
            use_region = region_w > 0 and region_h > 0

            # 获取虚拟屏幕尺寸
            SM_XVIRTUALSCREEN = 76
            SM_YVIRTUALSCREEN = 77
            SM_CXVIRTUALSCREEN = 78
            SM_CYVIRTUALSCREEN = 79
            
            virtual_left = ctypes.windll.user32.GetSystemMetrics(SM_XVIRTUALSCREEN)
            virtual_top = ctypes.windll.user32.GetSystemMetrics(SM_YVIRTUALSCREEN)
            virtual_width = ctypes.windll.user32.GetSystemMetrics(SM_CXVIRTUALSCREEN)
            virtual_height = ctypes.windll.user32.GetSystemMetrics(SM_CYVIRTUALSCREEN)

            start_time = time.time()
            source_found = False
            target_found = False
            source_x, source_y = 0, 0
            dest_x, dest_y = target_x, target_y
            source_confidence = 0
            target_confidence = 0

            while time.time() - start_time < wait_timeout:
                # 截取屏幕
                if use_region:
                    from PIL import ImageGrab
                    screenshot_pil = ImageGrab.grab(bbox=(region_x, region_y, region_x + region_w, region_y + region_h))
                    screen = cv2.cvtColor(np.array(screenshot_pil), cv2.COLOR_RGB2BGR)
                    offset_x, offset_y = region_x, region_y
                else:
                    try:
                        import win32gui
                        import win32ui
                        import win32con
                        
                        hdesktop = win32gui.GetDesktopWindow()
                        desktop_dc = win32gui.GetWindowDC(hdesktop)
                        img_dc = win32ui.CreateDCFromHandle(desktop_dc)
                        mem_dc = img_dc.CreateCompatibleDC()
                        
                        screenshot = win32ui.CreateBitmap()
                        screenshot.CreateCompatibleBitmap(img_dc, virtual_width, virtual_height)
                        mem_dc.SelectObject(screenshot)
                        mem_dc.BitBlt((0, 0), (virtual_width, virtual_height), img_dc, 
                                      (virtual_left, virtual_top), win32con.SRCCOPY)
                        
                        bmpinfo = screenshot.GetInfo()
                        bmpstr = screenshot.GetBitmapBits(True)
                        screen = np.frombuffer(bmpstr, dtype=np.uint8).reshape(
                            (bmpinfo['bmHeight'], bmpinfo['bmWidth'], 4))
                        screen = cv2.cvtColor(screen, cv2.COLOR_BGRA2BGR)
                        
                        mem_dc.DeleteDC()
                        win32gui.DeleteObject(screenshot.GetHandle())
                        win32gui.ReleaseDC(hdesktop, desktop_dc)
                        offset_x, offset_y = virtual_left, virtual_top
                        
                    except ImportError:
                        from PIL import ImageGrab
                        screenshot_pil = ImageGrab.grab(all_screens=True)
                        screen = cv2.cvtColor(np.array(screenshot_pil), cv2.COLOR_RGB2BGR)
                        offset_x, offset_y = 0, 0

                screen_gray = cv2.cvtColor(screen, cv2.COLOR_BGR2GRAY)

                # 查找源图像
                if not source_found:
                    result = cv2.matchTemplate(screen_gray, source_gray, cv2.TM_CCOEFF_NORMED)
                    min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(result)
                    if max_val >= confidence:
                        img_left = offset_x + max_loc[0]
                        img_top = offset_y + max_loc[1]
                        img_right = img_left + source_w
                        img_bottom = img_top + source_h
                        source_x, source_y = self._calculate_position(
                            source_position, img_left, img_top, img_right, img_bottom, source_w, source_h
                        )
                        source_confidence = max_val
                        source_found = True

                # 查找目标图像（如果目标类型是图像）
                if target_type == "image" and not target_found:
                    result = cv2.matchTemplate(screen_gray, target_gray, cv2.TM_CCOEFF_NORMED)
                    min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(result)
                    if max_val >= confidence:
                        img_left = offset_x + max_loc[0]
                        img_top = offset_y + max_loc[1]
                        img_right = img_left + target_w
                        img_bottom = img_top + target_h
                        dest_x, dest_y = self._calculate_position(
                            target_position, img_left, img_top, img_right, img_bottom, target_w, target_h
                        )
                        target_confidence = max_val
                        target_found = True
                elif target_type == "coordinate":
                    target_found = True  # 坐标模式不需要查找

                if source_found and target_found:
                    break

                await asyncio.sleep(0.3)

            if not source_found:
                return ModuleResult(
                    success=False, 
                    error=f"在 {wait_timeout} 秒内未找到源图像（最高匹配度: {source_confidence:.2%}）"
                )

            if target_type == "image" and not target_found:
                return ModuleResult(
                    success=False, 
                    error=f"在 {wait_timeout} 秒内未找到目标图像（最高匹配度: {target_confidence:.2%}）"
                )

            # 执行拖拽操作
            user32 = ctypes.windll.user32
            
            # 移动到源位置
            user32.SetCursorPos(int(source_x), int(source_y))
            await asyncio.sleep(0.05)
            
            # 按下鼠标左键
            MOUSEEVENTF_LEFTDOWN = 0x0002
            MOUSEEVENTF_LEFTUP = 0x0004
            user32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
            await asyncio.sleep(0.05)
            
            # 平滑移动到目标位置
            steps = max(10, drag_duration // 20)  # 至少10步
            step_delay = drag_duration / 1000 / steps
            
            for i in range(1, steps + 1):
                progress = i / steps
                current_x = int(source_x + (dest_x - source_x) * progress)
                current_y = int(source_y + (dest_y - source_y) * progress)
                user32.SetCursorPos(current_x, current_y)
                await asyncio.sleep(step_delay)
            
            # 确保到达目标位置
            user32.SetCursorPos(int(dest_x), int(dest_y))
            await asyncio.sleep(0.05)
            
            # 释放鼠标左键
            user32.mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)

            if target_type == "image":
                return ModuleResult(
                    success=True, 
                    message=f"已将图像从 ({source_x}, {source_y}) 拖拽到图像 ({dest_x}, {dest_y})，源匹配度: {source_confidence:.2%}，目标匹配度: {target_confidence:.2%}",
                    data={
                        "source_x": source_x, "source_y": source_y, "source_confidence": source_confidence,
                        "target_x": dest_x, "target_y": dest_y, "target_confidence": target_confidence
                    }
                )
            else:
                return ModuleResult(
                    success=True, 
                    message=f"已将图像从 ({source_x}, {source_y}) 拖拽到坐标 ({dest_x}, {dest_y})，匹配度: {source_confidence:.2%}",
                    data={
                        "source_x": source_x, "source_y": source_y, "source_confidence": source_confidence,
                        "target_x": dest_x, "target_y": dest_y
                    }
                )

        except ImportError as e:
            missing = str(e).split("'")[1] if "'" in str(e) else "opencv-python/Pillow"
            return ModuleResult(success=False, error=f"需要安装依赖库: pip install {missing}")
        except Exception as e:
            return ModuleResult(success=False, error=f"拖拽图像失败: {str(e)}")
    
    def _calculate_position(self, position: str, left: int, top: int, right: int, bottom: int, w: int, h: int) -> tuple:
        """根据位置计算实际坐标"""
        if position == "center":
            return (left + w // 2, top + h // 2)
        elif position == "top-left":
            return (left + 5, top + 5)
        elif position == "top-right":
            return (right - 5, top + 5)
        elif position == "bottom-left":
            return (left + 5, bottom - 5)
        elif position == "bottom-right":
            return (right - 5, bottom - 5)
        elif position == "top":
            return (left + w // 2, top + 5)
        elif position == "bottom":
            return (left + w // 2, bottom - 5)
        elif position == "left":
            return (left + 5, top + h // 2)
        elif position == "right":
            return (right - 5, top + h // 2)
        elif position == "random":
            margin = 5
            rand_x = random.randint(left + margin, right - margin)
            rand_y = random.randint(top + margin, bottom - margin)
            return (rand_x, rand_y)
        else:
            return (left + w // 2, top + h // 2)


@register_executor
class ImageExistsExecutor(ModuleExecutor):
    """图像存在判断模块执行器 - 判断图像是否存在于屏幕上,类似条件判断模块"""

    @property
    def module_type(self) -> str:
        return "image_exists"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        import ctypes

        image_path = context.resolve_value(config.get("imagePath", ""))
        confidence = to_float(config.get("confidence", 0.8), 0.8, context)
        wait_timeout = to_int(config.get("waitTimeout", 5), 5, context)
        search_region = config.get("searchRegion", None)
        use_full_screen = config.get("useFullScreen", True)  # 是否全屏识别

        if not image_path:
            return ModuleResult(success=False, error="图像路径不能为空")

        if not Path(image_path).exists():
            return ModuleResult(success=False, error=f"图像文件不存在: {image_path}")

        try:
            import cv2
            import numpy as np
            
            # 设置 DPI 感知
            try:
                ctypes.windll.shcore.SetProcessDpiAwareness(2)
            except Exception:
                try:
                    ctypes.windll.user32.SetProcessDPIAware()
                except Exception:
                    pass
            
            # 读取模板图像
            template = cv2.imdecode(np.fromfile(image_path, dtype=np.uint8), cv2.IMREAD_COLOR)
            if template is None:
                return ModuleResult(success=False, error="无法读取图像文件，请检查图像格式")

            template_gray = cv2.cvtColor(template, cv2.COLOR_BGR2GRAY)
            h, w = template_gray.shape

            # 解析搜索区域
            region_x, region_y, region_w, region_h = parse_search_region(search_region)
            use_region = (not use_full_screen) and region_w > 0 and region_h > 0

            # 获取虚拟屏幕尺寸
            SM_XVIRTUALSCREEN = 76
            SM_YVIRTUALSCREEN = 77
            SM_CXVIRTUALSCREEN = 78
            SM_CYVIRTUALSCREEN = 79
            
            virtual_left = ctypes.windll.user32.GetSystemMetrics(SM_XVIRTUALSCREEN)
            virtual_top = ctypes.windll.user32.GetSystemMetrics(SM_YVIRTUALSCREEN)
            virtual_width = ctypes.windll.user32.GetSystemMetrics(SM_CXVIRTUALSCREEN)
            virtual_height = ctypes.windll.user32.GetSystemMetrics(SM_CYVIRTUALSCREEN)

            start_time = time.time()
            found = False
            best_confidence = 0
            match_x, match_y = 0, 0

            while time.time() - start_time < wait_timeout:
                # 截取屏幕
                if use_region:
                    # 使用指定区域截图
                    from PIL import ImageGrab
                    screenshot_pil = ImageGrab.grab(bbox=(region_x, region_y, region_x + region_w, region_y + region_h))
                    screen = cv2.cvtColor(np.array(screenshot_pil), cv2.COLOR_RGB2BGR)
                    offset_x, offset_y = region_x, region_y
                else:
                    # 全屏截图
                    try:
                        import win32gui
                        import win32ui
                        import win32con
                        
                        hdesktop = win32gui.GetDesktopWindow()
                        desktop_dc = win32gui.GetWindowDC(hdesktop)
                        img_dc = win32ui.CreateDCFromHandle(desktop_dc)
                        mem_dc = img_dc.CreateCompatibleDC()
                        
                        screenshot = win32ui.CreateBitmap()
                        screenshot.CreateCompatibleBitmap(img_dc, virtual_width, virtual_height)
                        mem_dc.SelectObject(screenshot)
                        mem_dc.BitBlt((0, 0), (virtual_width, virtual_height), img_dc, 
                                      (virtual_left, virtual_top), win32con.SRCCOPY)
                        
                        bmpinfo = screenshot.GetInfo()
                        bmpstr = screenshot.GetBitmapBits(True)
                        screen = np.frombuffer(bmpstr, dtype=np.uint8).reshape(
                            (bmpinfo['bmHeight'], bmpinfo['bmWidth'], 4))
                        screen = cv2.cvtColor(screen, cv2.COLOR_BGRA2BGR)
                        
                        mem_dc.DeleteDC()
                        win32gui.DeleteObject(screenshot.GetHandle())
                        win32gui.ReleaseDC(hdesktop, desktop_dc)
                        offset_x, offset_y = virtual_left, virtual_top
                        
                    except ImportError:
                        from PIL import ImageGrab
                        screenshot_pil = ImageGrab.grab(all_screens=True)
                        screen = cv2.cvtColor(np.array(screenshot_pil), cv2.COLOR_RGB2BGR)
                        offset_x, offset_y = 0, 0

                screen_gray = cv2.cvtColor(screen, cv2.COLOR_BGR2GRAY)

                # 模板匹配
                result = cv2.matchTemplate(screen_gray, template_gray, cv2.TM_CCOEFF_NORMED)
                min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(result)

                if max_val > best_confidence:
                    best_confidence = max_val

                if max_val >= confidence:
                    # 找到匹配
                    match_x = offset_x + max_loc[0] + w // 2
                    match_y = offset_y + max_loc[1] + h // 2
                    found = True
                    break

                await asyncio.sleep(0.3)

            # 根据是否找到图像返回不同的分支
            branch = 'true' if found else 'false'
            
            if found:
                message = f"图像存在，位置: ({match_x}, {match_y})，匹配度: {best_confidence:.2%}"
                data = {"exists": True, "x": match_x, "y": match_y, "confidence": best_confidence}
            else:
                message = f"图像不存在（最高匹配度: {best_confidence:.2%}）"
                data = {"exists": False, "confidence": best_confidence}

            return ModuleResult(
                success=True,
                message=message,
                branch=branch,
                data=data
            )

        except ImportError as e:
            missing = str(e).split("'")[1] if "'" in str(e) else "opencv-python/Pillow"
            return ModuleResult(
                success=False, 
                error=f"需要安装依赖库: pip install {missing}"
            )
        except Exception as e:
            return ModuleResult(success=False, error=f"图像存在判断失败: {str(e)}")
