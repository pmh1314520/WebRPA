"""桌面应用自动化模块 - 基于 uiautomation 库"""
from .base import ModuleExecutor, ExecutionContext, ModuleResult, register_executor
from .type_utils import to_int, to_float, to_bool
import asyncio
import time
import json
from pathlib import Path
from typing import Optional, Dict, Any, List


# ==================== 应用管理模块 ====================

@register_executor
class DesktopAppConnectExecutor(ModuleExecutor):
    """连接桌面应用 - 通过窗口标题或进程名连接到已运行的应用"""
    
    @property
    def module_type(self) -> str:
        return "desktop_app_connect"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            import uiautomation as auto
            
            connect_type = context.resolve_value(config.get("connectType", "title"))  # title, process, path
            connect_value = context.resolve_value(config.get("connectValue", ""))
            backend = context.resolve_value(config.get("backend", "uia"))  # uia 或 win32
            timeout = to_int(config.get("timeout", 10), 10, context)
            save_to_variable = config.get("saveToVariable", "desktop_app")
            
            print(f"[desktop_app_connect] 连接方式: {connect_type}, 连接值: {connect_value}, 后端: {backend}, 超时: {timeout}")
            
            if not connect_value:
                return ModuleResult(success=False, error="连接值不能为空")
            
            start_time = time.time()
            window = None
            attempt = 0
            
            while time.time() - start_time < timeout:
                attempt += 1
                print(f"[desktop_app_connect] 第 {attempt} 次尝试查找窗口...")
                
                if connect_type == "title":
                    # 通过窗口标题查找（模糊匹配）
                    print(f"[desktop_app_connect] 使用标题模糊匹配: {connect_value}")
                    window = auto.WindowControl(searchDepth=1, SubName=connect_value)
                elif connect_type == "process":
                    # 通过进程ID查找
                    try:
                        process_id = int(connect_value)
                        print(f"[desktop_app_connect] 使用进程ID查找: {process_id}")
                        window = auto.WindowControl(searchDepth=1, ProcessId=process_id)
                    except ValueError:
                        return ModuleResult(success=False, error=f"进程ID必须是数字: {connect_value}")
                elif connect_type == "path":
                    # 通过应用路径查找（需要先获取所有窗口，然后匹配进程路径）
                    print(f"[desktop_app_connect] 使用应用路径查找: {connect_value}")
                    import psutil
                    for win in auto.GetRootControl().GetChildren():
                        if win.ControlTypeName == "WindowControl":
                            try:
                                process = psutil.Process(win.ProcessId)
                                if connect_value.lower() in process.exe().lower():
                                    window = win
                                    break
                            except Exception:
                                continue
                else:
                    return ModuleResult(success=False, error=f"不支持的连接方式: {connect_type}")
                
                if window and window.Exists(0, 0):
                    print(f"[desktop_app_connect] 找到窗口: {window.Name}")
                    break
                else:
                    print(f"[desktop_app_connect] 未找到窗口，等待 0.5 秒后重试...")
                    
                await asyncio.sleep(0.5)
            
            if not window or not window.Exists(0, 0):
                # 列出所有可用窗口帮助调试
                print("[desktop_app_connect] 列出所有可用窗口:")
                for win in auto.GetRootControl().GetChildren():
                    if win.ControlTypeName == "WindowControl" and win.Name:
                        print(f"  - {win.Name}")
                return ModuleResult(success=False, error=f"在 {timeout} 秒内未找到应用窗口: {connect_value}")
            
            # 存储窗口句柄到变量
            if save_to_variable:
                context.set_variable(save_to_variable, {
                    "handle": window.NativeWindowHandle,
                    "name": window.Name,
                    "class_name": window.ClassName,
                    "process_id": window.ProcessId
                })
            
            return ModuleResult(
                success=True,
                message=f"已连接到应用: {window.Name}",
                data={
                    "handle": window.NativeWindowHandle,
                    "name": window.Name,
                    "class_name": window.ClassName,
                    "process_id": window.ProcessId
                }
            )
            
        except ImportError:
            return ModuleResult(success=False, error="需要安装 uiautomation 库: pip install uiautomation")
        except Exception as e:
            return ModuleResult(success=False, error=f"连接应用失败: {str(e)}")


@register_executor
class DesktopAppStartExecutor(ModuleExecutor):
    """启动桌面应用 - 启动指定路径的应用程序"""
    
    @property
    def module_type(self) -> str:
        return "desktop_app_start"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            import uiautomation as auto
            import subprocess
            
            app_path = context.resolve_value(config.get("appPath", ""))
            # 字段与前端面板对齐: args/workDir/saveToVariable，同时兼容旧字段名
            app_args = context.resolve_value(config.get("args", config.get("appArgs", "")))
            work_dir = context.resolve_value(config.get("workDir", ""))
            wait_ready = to_bool(config.get("waitReady", True), True, context)
            wait_timeout = to_int(config.get("waitTimeout", 10), 10, context)
            connection_var = config.get("saveToVariable", config.get("connectionVariable", "desktop_app"))
            
            if not app_path:
                return ModuleResult(success=False, error="应用路径不能为空")
            
            if not Path(app_path).exists():
                return ModuleResult(success=False, error=f"应用文件不存在: {app_path}")
            
            # 工作目录（可选）：为空则继承当前进程工作目录
            popen_cwd = None
            if work_dir:
                if not Path(work_dir).is_dir():
                    return ModuleResult(success=False, error=f"工作目录不存在: {work_dir}")
                popen_cwd = work_dir
            
            # 启动应用
            cmd = [app_path]
            if app_args:
                cmd.extend(app_args.split())
            
            process = subprocess.Popen(cmd, cwd=popen_cwd)
            
            # 等待窗口就绪
            if wait_ready:
                await asyncio.sleep(1)  # 给应用一点启动时间
                
                start_time = time.time()
                window = None
                
                while time.time() - start_time < wait_timeout:
                    # 尝试通过进程ID查找窗口
                    window = auto.WindowControl(searchDepth=1, ProcessId=process.pid)
                    if window and window.Exists(0, 0):
                        break
                    await asyncio.sleep(0.5)
                
                if not window or not window.Exists(0, 0):
                    return ModuleResult(
                        success=False,
                        error=f"应用已启动但在 {wait_timeout} 秒内未找到窗口"
                    )
                
                # 存储连接信息
                if connection_var:
                    context.set_variable(connection_var, {
                        "handle": window.NativeWindowHandle,
                        "name": window.Name,
                        "process_id": process.pid
                    })
                
                return ModuleResult(
                    success=True,
                    message=f"已启动应用: {window.Name}",
                    data={
                        "handle": window.NativeWindowHandle,
                        "name": window.Name,
                        "process_id": process.pid
                    }
                )
            else:
                return ModuleResult(
                    success=True,
                    message=f"已启动应用，进程ID: {process.pid}",
                    data={"process_id": process.pid}
                )
            
        except ImportError:
            return ModuleResult(success=False, error="需要安装 uiautomation 库: pip install uiautomation")
        except Exception as e:
            return ModuleResult(success=False, error=f"启动应用失败: {str(e)}")


@register_executor
class DesktopAppCloseExecutor(ModuleExecutor):
    """关闭桌面应用 - 关闭指定的应用窗口"""
    
    @property
    def module_type(self) -> str:
        return "desktop_app_close"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            import uiautomation as auto
            
            # 从变量中获取窗口句柄，默认使用 desktop_app
            app_variable = config.get("appVariable", "desktop_app")
            window_handle = context.get_variable(app_variable)
            
            if not window_handle:
                return ModuleResult(success=False, error=f"变量 '{app_variable}' 不存在或为空")
            
            close_mode = context.resolve_value(config.get("closeMode", "normal"))  # normal, force
            
            if not window_handle:
                return ModuleResult(success=False, error="窗口句柄不能为空")
            
            # 获取窗口
            if isinstance(window_handle, dict):
                handle = window_handle.get("handle")
            else:
                handle = window_handle
            
            window = auto.ControlFromHandle(int(handle))
            
            if not window or not window.Exists(0, 0):
                return ModuleResult(success=False, error="窗口不存在或已关闭")
            
            window_name = window.Name
            
            if close_mode == "force":
                # 强制关闭
                import win32api
                import win32con
                win32api.PostMessage(int(handle), win32con.WM_CLOSE, 0, 0)
            else:
                # 正常关闭
                window.Close()
            
            return ModuleResult(
                success=True,
                message=f"已关闭应用: {window_name}"
            )
            
        except ImportError as e:
            if "uiautomation" in str(e):
                return ModuleResult(success=False, error="需要安装 uiautomation 库: pip install uiautomation")
            else:
                return ModuleResult(success=False, error="需要安装 pywin32 库: pip install pywin32")
        except Exception as e:
            return ModuleResult(success=False, error=f"关闭应用失败: {str(e)}")


# ==================== 窗口操作模块 ====================

@register_executor
class DesktopWindowActivateExecutor(ModuleExecutor):
    """激活窗口 - 将窗口置于前台并获得焦点"""
    
    @property
    def module_type(self) -> str:
        return "desktop_window_activate"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            import uiautomation as auto
            
            # 从变量中获取窗口句柄，默认使用 desktop_app
            app_variable = config.get("appVariable", "desktop_app")
            window_handle = context.get_variable(app_variable)
            
            if not window_handle:
                return ModuleResult(success=False, error=f"变量 '{app_variable}' 不存在或为空")
            
            if isinstance(window_handle, dict):
                handle = window_handle.get("handle")
            else:
                handle = window_handle
            
            window = auto.ControlFromHandle(int(handle))
            
            if not window or not window.Exists(0, 0):
                return ModuleResult(success=False, error="窗口不存在")
            
            # 使用更强制的方法激活窗口
            try:
                import win32gui
                import win32con
                
                # 1. 如果窗口最小化，先还原
                if win32gui.IsIconic(int(handle)):
                    win32gui.ShowWindow(int(handle), win32con.SW_RESTORE)
                    await asyncio.sleep(0.1)
                
                # 2. 显示窗口
                win32gui.ShowWindow(int(handle), win32con.SW_SHOW)
                await asyncio.sleep(0.05)
                
                # 3. 将窗口置于前台
                win32gui.SetForegroundWindow(int(handle))
                await asyncio.sleep(0.05)
                
                # 4. 使用UIA设置焦点
                window.SetFocus()
                await asyncio.sleep(0.05)
                
                # 5. 短暂置顶后取消（确保窗口在最上层）
                window.SetTopmost(True)
                await asyncio.sleep(0.1)
                window.SetTopmost(False)
                
            except ImportError:
                # 如果没有win32gui，使用原来的方法
                window.SetFocus()
                window.SetTopmost(True)
                await asyncio.sleep(0.1)
                window.SetTopmost(False)
            
            return ModuleResult(
                success=True,
                message=f"已激活窗口: {window.Name}"
            )
            
        except ImportError:
            return ModuleResult(success=False, error="需要安装 uiautomation 库: pip install uiautomation")
        except Exception as e:
            return ModuleResult(success=False, error=f"激活窗口失败: {str(e)}")


@register_executor
class DesktopWindowStateExecutor(ModuleExecutor):
    """窗口状态控制 - 最大化、最小化、还原窗口"""
    
    @property
    def module_type(self) -> str:
        return "desktop_window_state"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            import uiautomation as auto
            
            # 从变量中获取窗口句柄，默认使用 desktop_app
            app_variable = config.get("appVariable", "desktop_app")
            window_handle = context.get_variable(app_variable)
            
            if not window_handle:
                return ModuleResult(success=False, error=f"变量 '{app_variable}' 不存在或为空")
            
            state = context.resolve_value(config.get("state", "maximize"))  # maximize, minimize, restore
            
            if not window_handle:
                return ModuleResult(success=False, error="窗口句柄不能为空")
            
            if isinstance(window_handle, dict):
                handle = window_handle.get("handle")
            else:
                handle = window_handle
            
            window = auto.ControlFromHandle(int(handle))
            
            if not window or not window.Exists(0, 0):
                return ModuleResult(success=False, error="窗口不存在")
            
            if state == "maximize":
                window.Maximize()
                state_name = "最大化"
            elif state == "minimize":
                window.Minimize()
                state_name = "最小化"
            else:  # restore
                window.Restore()
                state_name = "还原"
            
            return ModuleResult(
                success=True,
                message=f"已{state_name}窗口: {window.Name}"
            )
            
        except ImportError:
            return ModuleResult(success=False, error="需要安装 uiautomation 库: pip install uiautomation")
        except Exception as e:
            return ModuleResult(success=False, error=f"窗口状态控制失败: {str(e)}")


@register_executor
class DesktopWindowMoveExecutor(ModuleExecutor):
    """移动窗口 - 移动窗口到指定位置"""
    
    @property
    def module_type(self) -> str:
        return "desktop_window_move"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            import uiautomation as auto
            
            # 从变量中获取窗口句柄，默认使用 desktop_app
            app_variable = config.get("appVariable", "desktop_app")
            window_handle = context.get_variable(app_variable)
            
            if not window_handle:
                return ModuleResult(success=False, error=f"变量 '{app_variable}' 不存在或为空")
            
            x = to_int(config.get("x", 0), 0, context)
            y = to_int(config.get("y", 0), 0, context)
            
            if not window_handle:
                return ModuleResult(success=False, error="窗口句柄不能为空")
            
            if isinstance(window_handle, dict):
                handle = window_handle.get("handle")
            else:
                handle = window_handle
            
            window = auto.ControlFromHandle(int(handle))
            
            if not window or not window.Exists(0, 0):
                return ModuleResult(success=False, error="窗口不存在")
            
            rect = window.BoundingRectangle
            window.MoveWindow(x, y, rect.width(), rect.height())
            
            return ModuleResult(
                success=True,
                message=f"已移动窗口到 ({x}, {y})"
            )
            
        except ImportError:
            return ModuleResult(success=False, error="需要安装 uiautomation 库: pip install uiautomation")
        except Exception as e:
            return ModuleResult(success=False, error=f"移动窗口失败: {str(e)}")


@register_executor
class DesktopWindowResizeExecutor(ModuleExecutor):
    """调整窗口大小 - 调整窗口的宽度和高度"""
    
    @property
    def module_type(self) -> str:
        return "desktop_window_resize"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            import uiautomation as auto
            
            # 从变量中获取窗口句柄，默认使用 desktop_app
            app_variable = config.get("appVariable", "desktop_app")
            window_handle = context.get_variable(app_variable)
            
            if not window_handle:
                return ModuleResult(success=False, error=f"变量 '{app_variable}' 不存在或为空")
            
            width = to_int(config.get("width", 800), 800, context)
            height = to_int(config.get("height", 600), 600, context)
            
            if not window_handle:
                return ModuleResult(success=False, error="窗口句柄不能为空")
            
            if isinstance(window_handle, dict):
                handle = window_handle.get("handle")
            else:
                handle = window_handle
            
            window = auto.ControlFromHandle(int(handle))
            
            if not window or not window.Exists(0, 0):
                return ModuleResult(success=False, error="窗口不存在")
            
            rect = window.BoundingRectangle
            window.MoveWindow(rect.left, rect.top, width, height)
            
            return ModuleResult(
                success=True,
                message=f"已调整窗口大小为 {width}x{height}"
            )
            
        except ImportError:
            return ModuleResult(success=False, error="需要安装 uiautomation 库: pip install uiautomation")
        except Exception as e:
            return ModuleResult(success=False, error=f"调整窗口大小失败: {str(e)}")


@register_executor
class DesktopWindowTopmostExecutor(ModuleExecutor):
    """窗口置顶 - 设置窗口是否始终置顶"""
    
    @property
    def module_type(self) -> str:
        return "desktop_window_topmost"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            import uiautomation as auto
            
            # 从变量中获取窗口句柄，默认使用 desktop_app
            app_variable = config.get("appVariable", "desktop_app")
            window_handle = context.get_variable(app_variable)
            
            if not window_handle:
                return ModuleResult(success=False, error=f"变量 '{app_variable}' 不存在或为空")
            
            topmost = to_bool(config.get("topmost", True), True, context)
            
            if not window_handle:
                return ModuleResult(success=False, error="窗口句柄不能为空")
            
            if isinstance(window_handle, dict):
                handle = window_handle.get("handle")
            else:
                handle = window_handle
            
            window = auto.ControlFromHandle(int(handle))
            
            if not window or not window.Exists(0, 0):
                return ModuleResult(success=False, error="窗口不存在")
            
            window.SetTopmost(topmost)
            
            return ModuleResult(
                success=True,
                message=f"已{'设置' if topmost else '取消'}窗口置顶"
            )
            
        except ImportError:
            return ModuleResult(success=False, error="需要安装 uiautomation 库: pip install uiautomation")
        except Exception as e:
            return ModuleResult(success=False, error=f"窗口置顶设置失败: {str(e)}")


@register_executor
class DesktopWindowCaptureExecutor(ModuleExecutor):
    """截取窗口 - 截取指定窗口的屏幕截图"""
    
    @property
    def module_type(self) -> str:
        return "desktop_window_capture"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            import uiautomation as auto
            from PIL import ImageGrab
            import os
            import tempfile
            from datetime import datetime
            
            # 从变量中获取窗口句柄，默认使用 desktop_app
            app_variable = config.get("appVariable", "desktop_app")
            window_handle = context.get_variable(app_variable)
            
            # 如果没有找到变量，尝试从配置中直接获取
            if not window_handle:
                window_handle = context.resolve_value(config.get("windowHandle", ""))
            
            if not window_handle:
                return ModuleResult(success=False, error=f"窗口句柄不能为空，请确保变量 '{app_variable}' 已创建")
            
            if isinstance(window_handle, dict):
                handle = window_handle.get("handle")
            else:
                handle = window_handle
            
            window = auto.ControlFromHandle(int(handle))
            
            if not window or not window.Exists(0, 0):
                return ModuleResult(success=False, error="窗口不存在")
            
            # 截图类型（与前端面板对齐）：window=整个窗口, client=仅客户区（不含标题栏/边框）
            capture_type = context.resolve_value(config.get("captureType", "window"))
            bbox = None
            if capture_type == "client":
                try:
                    import win32gui
                    left, top, right, bottom = win32gui.GetClientRect(int(handle))
                    sx, sy = win32gui.ClientToScreen(int(handle), (left, top))
                    ex, ey = win32gui.ClientToScreen(int(handle), (right, bottom))
                    bbox = (sx, sy, ex, ey)
                except ImportError:
                    return ModuleResult(success=False, error="客户区截图需要安装 pywin32 库: pip install pywin32")
            if bbox is None:
                # 整个窗口
                rect = window.BoundingRectangle
                bbox = (rect.left, rect.top, rect.right, rect.bottom)
            
            # 截图
            screenshot = ImageGrab.grab(bbox)
            
            # 生成保存路径
            save_path = context.resolve_value(config.get("savePath", ""))
            if not save_path:
                # 自动生成路径
                temp_dir = tempfile.gettempdir()
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                save_path = os.path.join(temp_dir, f"desktop_capture_{timestamp}.png")
            
            # 保存截图
            screenshot.save(save_path)
            
            # 保存路径到变量
            save_to_variable = config.get("saveToVariable", "screenshot_path")
            if save_to_variable:
                context.set_variable(save_to_variable, save_path)
            
            return ModuleResult(
                success=True,
                message=f"已截取窗口并保存到: {save_path}",
                data={"path": save_path}
            )
            
        except ImportError as e:
            if "uiautomation" in str(e):
                return ModuleResult(success=False, error="需要安装 uiautomation 库: pip install uiautomation")
            else:
                return ModuleResult(success=False, error="需要安装 Pillow 库: pip install Pillow")
        except Exception as e:
            return ModuleResult(success=False, error=f"截取窗口失败: {str(e)}")


# ==================== 控件查找模块 ====================

@register_executor
class DesktopFindControlExecutor(ModuleExecutor):
    """查找控件 - 在窗口中查找指定的UI控件"""
    
    @property
    def module_type(self) -> str:
        return "desktop_find_control"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            import uiautomation as auto
            
            # 从变量中获取窗口句柄，默认使用 desktop_app
            app_variable = config.get("appVariable", "desktop_app")
            window_handle = context.get_variable(app_variable)
            
            # 如果没有找到变量，尝试从配置中直接获取
            if not window_handle:
                window_handle = context.resolve_value(config.get("windowHandle", ""))
            
            if not window_handle:
                return ModuleResult(success=False, error=f"窗口句柄不能为空，请确保变量 '{app_variable}' 已创建")
            
            if isinstance(window_handle, dict):
                handle = window_handle.get("handle")
            else:
                handle = window_handle
            
            window = auto.ControlFromHandle(int(handle))
            
            if not window or not window.Exists(0, 0):
                return ModuleResult(success=False, error="窗口不存在")
            
            # 获取查找方式
            find_type = config.get("findType", "control_path")  # 默认使用控件路径
            timeout = to_int(config.get("timeout", 5), 5, context)
            save_to_variable = config.get("saveToVariable", "desktop_control")
            
            control = None
            start_time = time.time()
            
            # 根据查找方式选择不同的查找逻辑
            if find_type == "control_path":
                # 控件路径模式
                control_path = context.resolve_value(config.get("controlPath", ""))
                if not control_path:
                    return ModuleResult(success=False, error="控件路径不能为空")
                
                # 解析控件路径，格式：name:按钮名称 或 automationid:按钮ID 或 classname:类名
                # 支持多级路径，用 > 分隔，例如：name:父控件>name:子控件
                path_parts = control_path.split(">")
                current_control = window
                
                for part in path_parts:
                    part = part.strip()
                    if not part:
                        continue
                    
                    # 解析单个路径部分
                    if ":" not in part:
                        return ModuleResult(success=False, error=f"控件路径格式错误: {part}，应为 'name:值' 或 'automationid:值' 或 'classname:值'")
                    
                    key, value = part.split(":", 1)
                    key = key.strip().lower()
                    value = value.strip()
                    
                    # 构建查找参数
                    search_params = {"searchDepth": 10}
                    if key == "name":
                        search_params["Name"] = value
                    elif key == "automationid":
                        search_params["AutomationId"] = value
                    elif key == "classname":
                        search_params["ClassName"] = value
                    else:
                        return ModuleResult(success=False, error=f"不支持的路径键: {key}，仅支持 name、automationid、classname")
                    
                    # 在当前控件下查找
                    found = False
                    while time.time() - start_time < timeout:
                        try:
                            temp_control = current_control.Control(**search_params)
                            if temp_control and temp_control.Exists(0, 0):
                                current_control = temp_control
                                found = True
                                break
                        except Exception:
                            pass
                        await asyncio.sleep(0.3)
                    
                    if not found:
                        return ModuleResult(success=False, error=f"在 {timeout} 秒内未找到控件路径: {part}")
                
                control = current_control
                
            else:
                # 属性查找模式（原有逻辑）
                control_type = context.resolve_value(config.get("controlType", ""))
                name = context.resolve_value(config.get("name", ""))
                automation_id = context.resolve_value(config.get("automationId", ""))
                class_name = context.resolve_value(config.get("className", ""))
                search_depth = to_int(config.get("searchDepth", 10), 10, context)

                # 与前端面板对齐：面板使用简化的 findType + findValue（单值）录入，
                # 在此映射到对应的属性字段（旧的分离字段优先，保证向后兼容）
                find_value = context.resolve_value(config.get("findValue", ""))
                if find_value:
                    if find_type in ("title", "name") and not name:
                        name = find_value
                    elif find_type in ("class_name", "classname") and not class_name:
                        class_name = find_value
                    elif find_type in ("control_type", "controltype") and not control_type:
                        control_type = find_value
                    elif find_type in ("automation_id", "automationid") and not automation_id:
                        automation_id = find_value

                if not (control_type or name or automation_id or class_name):
                    return ModuleResult(success=False, error="查找值不能为空，请填写查找值或切换为控件路径模式")
                
                # 构建查找条件
                search_params = {"searchDepth": search_depth}
                
                if control_type:
                    # 将字符串类型转换为 uiautomation 的控件类型
                    control_type_map = {
                        "Button": auto.ButtonControl,
                        "Edit": auto.EditControl,
                        "Text": auto.TextControl,
                        "ComboBox": auto.ComboBoxControl,
                        "ListItem": auto.ListItemControl,
                        "List": auto.ListControl,
                        "CheckBox": auto.CheckBoxControl,
                        "RadioButton": auto.RadioButtonControl,
                        "Tab": auto.TabControl,
                        "TabItem": auto.TabItemControl,
                        "Menu": auto.MenuControl,
                        "MenuItem": auto.MenuItemControl,
                        "Tree": auto.TreeControl,
                        "TreeItem": auto.TreeItemControl,
                        "DataGrid": auto.DataGridControl,
                        "DataItem": auto.DataItemControl,
                        "Document": auto.DocumentControl,
                        "Hyperlink": auto.HyperlinkControl,
                        "Image": auto.ImageControl,
                        "Pane": auto.PaneControl,
                        "ScrollBar": auto.ScrollBarControl,
                        "Slider": auto.SliderControl,
                        "Spinner": auto.SpinnerControl,
                        "StatusBar": auto.StatusBarControl,
                        "Table": auto.TableControl,
                        "ToolBar": auto.ToolBarControl,
                        "ToolTip": auto.ToolTipControl,
                        "Window": auto.WindowControl,
                        "Group": auto.GroupControl,
                        "Custom": auto.CustomControl,
                    }
                    
                    control_class = control_type_map.get(control_type)
                    if not control_class:
                        return ModuleResult(success=False, error=f"不支持的控件类型: {control_type}")
                else:
                    control_class = auto.Control
                
                if name:
                    search_params["Name"] = name
                if automation_id:
                    search_params["AutomationId"] = automation_id
                if class_name:
                    search_params["ClassName"] = class_name
                
                # 查找控件
                while time.time() - start_time < timeout:
                    control = window.Control(**search_params) if control_class == auto.Control else control_class(**search_params)
                    if control and control.Exists(0, 0):
                        break
                    await asyncio.sleep(0.3)
            
            if not control or not control.Exists(0, 0):
                return ModuleResult(success=False, error=f"在 {timeout} 秒内未找到控件")
            
            # 存储控件信息
            control_info = {
                "name": control.Name,
                "automation_id": control.AutomationId,
                "class_name": control.ClassName,
                "control_type": control.ControlTypeName,
                "handle": control.NativeWindowHandle,
                "rect": {
                    "left": control.BoundingRectangle.left,
                    "top": control.BoundingRectangle.top,
                    "right": control.BoundingRectangle.right,
                    "bottom": control.BoundingRectangle.bottom
                }
            }
            
            if save_to_variable:
                context.set_variable(save_to_variable, control_info)
            
            return ModuleResult(
                success=True,
                message=f"已找到控件: {control.Name or control.ControlTypeName}",
                data=control_info
            )
            
        except ImportError:
            return ModuleResult(success=False, error="需要安装 uiautomation 库: pip install uiautomation")
        except Exception as e:
            return ModuleResult(success=False, error=f"查找控件失败: {str(e)}")


@register_executor
class DesktopWaitControlExecutor(ModuleExecutor):
    """等待控件 - 等待控件出现或消失"""
    
    @property
    def module_type(self) -> str:
        return "desktop_wait_control"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            import uiautomation as auto
            
            wait_type = context.resolve_value(config.get("waitType", "appear"))  # appear, disappear
            timeout = to_int(config.get("timeout", 10), 10, context)

            # 兼容旧用法：直接提供 controlInfo（句柄）时按句柄等待出现/消失
            control_info = context.resolve_value(config.get("controlInfo", ""))
            if control_info:
                if isinstance(control_info, dict):
                    handle = control_info.get("handle")
                else:
                    handle = control_info
                start_time = time.time()
                while time.time() - start_time < timeout:
                    try:
                        control = auto.ControlFromHandle(int(handle))
                        exists = control and control.Exists(0, 0)
                        if wait_type == "appear" and exists:
                            return ModuleResult(success=True, message="控件已出现")
                        elif wait_type == "disappear" and not exists:
                            return ModuleResult(success=True, message="控件已消失")
                    except Exception:
                        if wait_type == "disappear":
                            return ModuleResult(success=True, message="控件已消失")
                    await asyncio.sleep(0.3)
                return ModuleResult(
                    success=False,
                    error=f"在 {timeout} 秒内控件未{'出现' if wait_type == 'appear' else '消失'}"
                )

            # 与前端面板对齐：在应用窗口内按 控件路径 / findType+findValue 搜索并等待其出现
            app_variable = config.get("appVariable", "desktop_app")
            window_handle = context.get_variable(app_variable)
            if not window_handle:
                window_handle = context.resolve_value(config.get("windowHandle", ""))
            if not window_handle:
                return ModuleResult(success=False, error=f"未找到应用窗口，请确保变量 '{app_variable}' 已创建")

            if isinstance(window_handle, dict):
                win_handle = window_handle.get("handle")
            else:
                win_handle = window_handle
            window = auto.ControlFromHandle(int(win_handle))
            if not window or not window.Exists(0, 0):
                return ModuleResult(success=False, error="应用窗口不存在或已关闭")

            find_type = config.get("findType", "control_path")
            save_to_variable = config.get("saveToVariable", "desktop_control")

            def _locate():
                """尝试定位一次控件，找到返回控件对象，否则返回 None。"""
                if find_type == "control_path":
                    control_path = context.resolve_value(config.get("controlPath", ""))
                    if not control_path:
                        return None
                    current = window
                    for part in control_path.split(">"):
                        part = part.strip()
                        if not part or ":" not in part:
                            return None
                        key, value = part.split(":", 1)
                        key = key.strip().lower()
                        value = value.strip()
                        params = {"searchDepth": 10}
                        if key == "name":
                            params["Name"] = value
                        elif key == "automationid":
                            params["AutomationId"] = value
                        elif key == "classname":
                            params["ClassName"] = value
                        else:
                            return None
                        try:
                            nxt = current.Control(**params)
                            if nxt and nxt.Exists(0, 0):
                                current = nxt
                            else:
                                return None
                        except Exception:
                            return None
                    return current
                else:
                    find_value = context.resolve_value(config.get("findValue", ""))
                    if not find_value:
                        return None
                    params = {"searchDepth": 10}
                    if find_type in ("title", "name"):
                        params["Name"] = find_value
                    elif find_type in ("class_name", "classname"):
                        params["ClassName"] = find_value
                    elif find_type in ("automation_id", "automationid"):
                        params["AutomationId"] = find_value
                    elif find_type in ("control_type", "controltype"):
                        # 控件类型无法直接作为 Name 匹配，退化为在窗口下按类型查找第一个
                        pass
                    try:
                        ctrl = window.Control(**params)
                        if ctrl and ctrl.Exists(0, 0):
                            return ctrl
                    except Exception:
                        return None
                    return None

            start_time = time.time()
            found_control = None
            while time.time() - start_time < timeout:
                found_control = _locate()
                exists = found_control is not None
                if wait_type == "appear" and exists:
                    break
                if wait_type == "disappear" and not exists:
                    return ModuleResult(success=True, message="控件已消失")
                await asyncio.sleep(0.3)

            if wait_type == "appear":
                if not found_control:
                    return ModuleResult(success=False, error=f"在 {timeout} 秒内控件未出现")
                control_info_data = {
                    "name": found_control.Name,
                    "automation_id": found_control.AutomationId,
                    "class_name": found_control.ClassName,
                    "control_type": found_control.ControlTypeName,
                    "handle": found_control.NativeWindowHandle,
                }
                if save_to_variable:
                    context.set_variable(save_to_variable, control_info_data)
                return ModuleResult(success=True, message="控件已出现", data=control_info_data)
            else:
                return ModuleResult(success=False, error=f"在 {timeout} 秒内控件未消失")
            
        except ImportError:
            return ModuleResult(success=False, error="需要安装 uiautomation 库: pip install uiautomation")
        except Exception as e:
            return ModuleResult(success=False, error=f"等待控件失败: {str(e)}")


# 由于代码较长，我将分多个部分继续创建...


# ==================== 控件操作模块 ====================

@register_executor
class DesktopClickControlExecutor(ModuleExecutor):
    """点击控件 - 点击指定的UI控件"""
    
    @property
    def module_type(self) -> str:
        return "desktop_click_control"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            import uiautomation as auto
            
            # 从变量中获取控件信息，默认使用 desktop_control
            control_variable = config.get("controlVariable", "desktop_control")
            control_info = context.get_variable(control_variable)
            
            # 如果没有找到变量，尝试从配置中直接获取
            if not control_info:
                control_info = context.resolve_value(config.get("controlInfo", ""))
            
            if not control_info:
                return ModuleResult(success=False, error=f"控件信息不能为空，请确保变量 '{control_variable}' 已创建")
            
            # 字段与前端面板对齐: button(left/right/double)，兼容旧字段名 clickType(single/double/right)
            click_type = context.resolve_value(config.get("clickType", ""))
            if not click_type:
                button = context.resolve_value(config.get("button", "left"))
                click_type = {"left": "single", "right": "right", "double": "double"}.get(button, "single")
            simulate = to_bool(config.get("simulate", True), True, context)
            
            if not control_info:
                return ModuleResult(success=False, error="控件信息不能为空")
            
            if isinstance(control_info, dict):
                handle = control_info.get("handle")
            else:
                handle = control_info
            
            control = auto.ControlFromHandle(int(handle))
            
            if not control or not control.Exists(0, 0):
                return ModuleResult(success=False, error="控件不存在")
            
            # 确保控件可见
            control.SetFocus()
            await asyncio.sleep(0.1)
            
            # 执行点击
            if click_type == "double":
                control.DoubleClick(simulateMove=simulate)
            elif click_type == "right":
                control.RightClick(simulateMove=simulate)
            else:  # single
                control.Click(simulateMove=simulate)
            
            return ModuleResult(
                success=True,
                message=f"已{'双击' if click_type == 'double' else '右键点击' if click_type == 'right' else '点击'}控件"
            )
            
        except ImportError:
            return ModuleResult(success=False, error="需要安装 uiautomation 库: pip install uiautomation")
        except Exception as e:
            return ModuleResult(success=False, error=f"点击控件失败: {str(e)}")


@register_executor
class DesktopInputControlExecutor(ModuleExecutor):
    """输入文本到控件 - 向输入框等控件输入文本"""
    
    @property
    def module_type(self) -> str:
        return "desktop_input_control"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            import uiautomation as auto
            
            # 从变量中获取控件信息，默认使用 desktop_control
            control_variable = config.get("controlVariable", "desktop_control")
            control_info = context.get_variable(control_variable)
            
            # 如果没有找到变量，尝试从配置中直接获取
            if not control_info:
                control_info = context.resolve_value(config.get("controlInfo", ""))
            
            if not control_info:
                return ModuleResult(success=False, error=f"控件信息不能为空，请确保变量 '{control_variable}' 已创建")
            
            text = context.resolve_value(config.get("text", ""))
            # 字段与前端面板对齐: clearFirst，兼容旧字段名 clearBefore
            clear_before = to_bool(config.get("clearFirst", config.get("clearBefore", True)), True, context)
            input_method = context.resolve_value(config.get("inputMethod", "set"))  # set, send_keys
            
            if not control_info:
                return ModuleResult(success=False, error="控件信息不能为空")
            
            if isinstance(control_info, dict):
                handle = control_info.get("handle")
            else:
                handle = control_info
            
            control = auto.ControlFromHandle(int(handle))
            
            if not control or not control.Exists(0, 0):
                return ModuleResult(success=False, error="控件不存在")
            
            # 确保控件获得焦点
            control.SetFocus()
            await asyncio.sleep(0.1)
            
            # 清空现有内容
            if clear_before:
                try:
                    # 尝试使用 ValuePattern
                    control.GetValuePattern().SetValue("")
                except Exception:
                    # 如果不支持 ValuePattern，使用快捷键
                    control.SendKeys("{Ctrl}a{Delete}")
                    await asyncio.sleep(0.1)
            
            # 输入文本
            if input_method == "send_keys":
                control.SendKeys(text)
            else:  # set
                try:
                    control.GetValuePattern().SetValue(text)
                except Exception:
                    # 如果不支持 ValuePattern，回退到 SendKeys
                    control.SendKeys(text)
            
            return ModuleResult(
                success=True,
                message=f"已输入文本到控件"
            )
            
        except ImportError:
            return ModuleResult(success=False, error="需要安装 uiautomation 库: pip install uiautomation")
        except Exception as e:
            return ModuleResult(success=False, error=f"输入文本失败: {str(e)}")


@register_executor
class DesktopGetTextExecutor(ModuleExecutor):
    """获取控件文本 - 获取控件显示的文本内容"""
    
    @property
    def module_type(self) -> str:
        return "desktop_get_text"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            import uiautomation as auto
            
            # 从变量中获取控件信息，默认使用 desktop_control
            control_variable = config.get("controlVariable", "desktop_control")
            control_info = context.get_variable(control_variable)
            
            # 如果没有找到变量，尝试从配置中直接获取
            if not control_info:
                control_info = context.resolve_value(config.get("controlInfo", ""))
            
            if not control_info:
                return ModuleResult(success=False, error=f"控件信息不能为空，请确保变量 '{control_variable}' 已创建")
            
            # 保存到变量，默认使用 control_text
            save_to_variable = config.get("saveToVariable", "control_text")
            
            if isinstance(control_info, dict):
                handle = control_info.get("handle")
            else:
                handle = control_info
            
            control = auto.ControlFromHandle(int(handle))
            
            if not control or not control.Exists(0, 0):
                return ModuleResult(success=False, error="控件不存在")
            
            # 尝试多种方式获取文本
            text = ""
            try:
                # 尝试 Name 属性
                text = control.Name
            except Exception:
                pass
            
            if not text:
                try:
                    # 尝试 ValuePattern
                    text = control.GetValuePattern().Value
                except Exception:
                    pass
            
            if not text:
                try:
                    # 尝试 TextPattern
                    text = control.GetTextPattern().DocumentRange.GetText()
                except Exception:
                    pass
            
            if save_to_variable:
                context.set_variable(save_to_variable, text)
            
            return ModuleResult(
                success=True,
                message=f"已获取文本: {text[:50]}{'...' if len(text) > 50 else ''}",
                data={"text": text}
            )
            
        except ImportError:
            return ModuleResult(success=False, error="需要安装 uiautomation 库: pip install uiautomation")
        except Exception as e:
            return ModuleResult(success=False, error=f"获取文本失败: {str(e)}")


@register_executor
class DesktopSelectComboExecutor(ModuleExecutor):
    """选择下拉框 - 在下拉框中选择指定项"""
    
    @property
    def module_type(self) -> str:
        return "desktop_select_combo"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            import uiautomation as auto
            
            # 从变量中获取控件信息，默认使用 desktop_control
            control_variable = config.get("controlVariable", "desktop_control")
            control_info = context.get_variable(control_variable)
            
            # 如果没有找到变量，尝试从配置中直接获取
            if not control_info:
                control_info = context.resolve_value(config.get("controlInfo", ""))
            
            if not control_info:
                return ModuleResult(success=False, error=f"控件信息不能为空，请确保变量 '{control_variable}' 已创建")
            
            # 字段与前端面板对齐: selectType(text/index)，兼容旧字段名 selectBy(name/index)
            select_by = context.resolve_value(config.get("selectType", config.get("selectBy", "name")))
            if select_by == "text":
                select_by = "name"
            select_value = context.resolve_value(config.get("selectValue", ""))
            
            if not control_info:
                return ModuleResult(success=False, error="控件信息不能为空")
            
            if isinstance(control_info, dict):
                handle = control_info.get("handle")
            else:
                handle = control_info
            
            control = auto.ControlFromHandle(int(handle))
            
            if not control or not control.Exists(0, 0):
                return ModuleResult(success=False, error="控件不存在")
            
            # 展开下拉框
            control.Click()
            await asyncio.sleep(0.3)
            
            if select_by == "index":
                # 按索引选择
                index = int(select_value)
                items = control.GetChildren()
                if 0 <= index < len(items):
                    items[index].Click()
                else:
                    return ModuleResult(success=False, error=f"索引 {index} 超出范围")
            else:  # name
                # 按名称选择
                item = control.ListItemControl(Name=select_value)
                if item and item.Exists(0, 0):
                    item.Click()
                else:
                    return ModuleResult(success=False, error=f"未找到选项: {select_value}")
            
            return ModuleResult(
                success=True,
                message=f"已选择下拉框选项: {select_value}"
            )
            
        except ImportError:
            return ModuleResult(success=False, error="需要安装 uiautomation 库: pip install uiautomation")
        except Exception as e:
            return ModuleResult(success=False, error=f"选择下拉框失败: {str(e)}")


@register_executor
class DesktopCheckboxExecutor(ModuleExecutor):
    """操作复选框 - 勾选或取消勾选复选框"""
    
    @property
    def module_type(self) -> str:
        return "desktop_checkbox"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            import uiautomation as auto
            
            # 从变量中获取控件信息，默认使用 desktop_control
            control_variable = config.get("controlVariable", "desktop_control")
            control_info = context.get_variable(control_variable)
            
            # 如果没有找到变量，尝试从配置中直接获取
            if not control_info:
                control_info = context.resolve_value(config.get("controlInfo", ""))
            
            if not control_info:
                return ModuleResult(success=False, error=f"控件信息不能为空，请确保变量 '{control_variable}' 已创建")
            
            # 字段与前端面板对齐: action(check/uncheck/toggle/get_state)，兼容旧字段名 checked(布尔)
            action = context.resolve_value(config.get("action", ""))
            if not action:
                action = "check" if to_bool(config.get("checked", True), True, context) else "uncheck"
            save_to_variable = config.get("saveToVariable", "")
            
            if isinstance(control_info, dict):
                handle = control_info.get("handle")
            else:
                handle = control_info
            
            control = auto.ControlFromHandle(int(handle))
            
            if not control or not control.Exists(0, 0):
                return ModuleResult(success=False, error="控件不存在")
            
            try:
                toggle_pattern = control.GetTogglePattern()
                current_state = toggle_pattern.ToggleState  # 0=未选中, 1=选中
                
                if action == "get_state":
                    state_bool = current_state == 1
                    if save_to_variable:
                        context.set_variable(save_to_variable, state_bool)
                    return ModuleResult(success=True, message=f"复选框状态: {'已勾选' if state_bool else '未勾选'}", data=state_bool)
                
                if action == "toggle":
                    toggle_pattern.Toggle()
                elif action == "check" and current_state == 0:
                    toggle_pattern.Toggle()
                elif action == "uncheck" and current_state == 1:
                    toggle_pattern.Toggle()
            except Exception:
                # 不支持 TogglePattern：get_state 无法获取，其余动作退回点击
                if action == "get_state":
                    return ModuleResult(success=False, error="该控件不支持获取勾选状态")
                control.Click()
            
            action_text = {"check": "勾选", "uncheck": "取消勾选", "toggle": "切换"}.get(action, action)
            return ModuleResult(
                success=True,
                message=f"已{action_text}复选框"
            )
            
        except ImportError:
            return ModuleResult(success=False, error="需要安装 uiautomation 库: pip install uiautomation")
        except Exception as e:
            return ModuleResult(success=False, error=f"操作复选框失败: {str(e)}")


@register_executor
class DesktopRadioExecutor(ModuleExecutor):
    """操作单选按钮 - 选择单选按钮"""
    
    @property
    def module_type(self) -> str:
        return "desktop_radio"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            import uiautomation as auto
            
            # 从变量中获取控件信息，默认使用 desktop_control
            control_variable = config.get("controlVariable", "desktop_control")
            control_info = context.get_variable(control_variable)
            
            # 如果没有找到变量，尝试从配置中直接获取
            if not control_info:
                control_info = context.resolve_value(config.get("controlInfo", ""))
            
            if not control_info:
                return ModuleResult(success=False, error=f"控件信息不能为空，请确保变量 '{control_variable}' 已创建")
            
            if not control_info:
                return ModuleResult(success=False, error="控件信息不能为空")
            
            if isinstance(control_info, dict):
                handle = control_info.get("handle")
            else:
                handle = control_info
            
            control = auto.ControlFromHandle(int(handle))
            
            if not control or not control.Exists(0, 0):
                return ModuleResult(success=False, error="控件不存在")
            
            # 选择单选按钮
            try:
                selection_pattern = control.GetSelectionItemPattern()
                selection_pattern.Select()
            except Exception:
                # 如果不支持 SelectionItemPattern，使用点击
                control.Click()
            
            return ModuleResult(
                success=True,
                message="已选择单选按钮"
            )
            
        except ImportError:
            return ModuleResult(success=False, error="需要安装 uiautomation 库: pip install uiautomation")
        except Exception as e:
            return ModuleResult(success=False, error=f"操作单选按钮失败: {str(e)}")


@register_executor
class DesktopSendKeysExecutor(ModuleExecutor):
    """发送快捷键 - 向控件发送键盘按键"""
    
    @property
    def module_type(self) -> str:
        return "desktop_send_keys"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            import uiautomation as auto
            
            # 从变量中获取控件信息，默认使用 desktop_control
            control_variable = config.get("controlVariable", "desktop_control")
            control_info = context.get_variable(control_variable)
            
            # 如果没有找到变量，尝试从配置中直接获取
            if not control_info:
                control_info = context.resolve_value(config.get("controlInfo", ""))
            
            if not control_info:
                return ModuleResult(success=False, error=f"控件信息不能为空，请确保变量 '{control_variable}' 已创建")
            
            keys = context.resolve_value(config.get("keys", ""))
            
            if not control_info:
                return ModuleResult(success=False, error="控件信息不能为空")
            
            if not keys:
                return ModuleResult(success=False, error="按键不能为空")
            
            if isinstance(control_info, dict):
                handle = control_info.get("handle")
            else:
                handle = control_info
            
            control = auto.ControlFromHandle(int(handle))
            
            if not control or not control.Exists(0, 0):
                return ModuleResult(success=False, error="控件不存在")
            
            # 确保控件获得焦点
            control.SetFocus()
            await asyncio.sleep(0.1)
            
            # 发送按键
            control.SendKeys(keys)
            
            return ModuleResult(
                success=True,
                message=f"已发送按键: {keys}"
            )
            
        except ImportError:
            return ModuleResult(success=False, error="需要安装 uiautomation 库: pip install uiautomation")
        except Exception as e:
            return ModuleResult(success=False, error=f"发送按键失败: {str(e)}")


@register_executor
class DesktopScrollControlExecutor(ModuleExecutor):
    """滚动控件 - 滚动可滚动的控件"""
    
    @property
    def module_type(self) -> str:
        return "desktop_scroll_control"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            import uiautomation as auto
            
            # 从变量中获取控件信息，默认使用 desktop_control
            control_variable = config.get("controlVariable", "desktop_control")
            control_info = context.get_variable(control_variable)
            
            # 如果没有找到变量，尝试从配置中直接获取
            if not control_info:
                control_info = context.resolve_value(config.get("controlInfo", ""))
            
            if not control_info:
                return ModuleResult(success=False, error=f"控件信息不能为空，请确保变量 '{control_variable}' 已创建")
            
            direction = context.resolve_value(config.get("direction", "down"))  # up, down, left, right
            amount = to_int(config.get("amount", 3), 3, context)
            
            if not control_info:
                return ModuleResult(success=False, error="控件信息不能为空")
            
            if isinstance(control_info, dict):
                handle = control_info.get("handle")
            else:
                handle = control_info
            
            control = auto.ControlFromHandle(int(handle))
            
            if not control or not control.Exists(0, 0):
                return ModuleResult(success=False, error="控件不存在")
            
            # 确保控件获得焦点
            control.SetFocus()
            await asyncio.sleep(0.1)
            
            # 滚动
            try:
                scroll_pattern = control.GetScrollPattern()
                
                if direction == "down":
                    for _ in range(amount):
                        scroll_pattern.Scroll(auto.ScrollAmount.NoAmount, auto.ScrollAmount.SmallIncrement)
                elif direction == "up":
                    for _ in range(amount):
                        scroll_pattern.Scroll(auto.ScrollAmount.NoAmount, auto.ScrollAmount.SmallDecrement)
                elif direction == "right":
                    for _ in range(amount):
                        scroll_pattern.Scroll(auto.ScrollAmount.SmallIncrement, auto.ScrollAmount.NoAmount)
                elif direction == "left":
                    for _ in range(amount):
                        scroll_pattern.Scroll(auto.ScrollAmount.SmallDecrement, auto.ScrollAmount.NoAmount)
            except Exception:
                # 如果不支持 ScrollPattern，使用滚轮
                if direction == "down":
                    control.WheelDown(wheelTimes=amount)
                elif direction == "up":
                    control.WheelUp(wheelTimes=amount)
            
            return ModuleResult(
                success=True,
                message=f"已向{direction}滚动 {amount} 次"
            )
            
        except ImportError:
            return ModuleResult(success=False, error="需要安装 uiautomation 库: pip install uiautomation")
        except Exception as e:
            return ModuleResult(success=False, error=f"滚动控件失败: {str(e)}")


@register_executor
class DesktopMenuClickExecutor(ModuleExecutor):
    """点击菜单项 - 点击应用程序菜单中的菜单项"""
    
    @property
    def module_type(self) -> str:
        return "desktop_menu_click"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            import uiautomation as auto
            
            # 从变量中获取窗口句柄，默认使用 desktop_app
            app_variable = config.get("appVariable", "desktop_app")
            window_handle = context.get_variable(app_variable)
            
            # 如果没有找到变量，尝试从配置中直接获取
            if not window_handle:
                window_handle = context.resolve_value(config.get("windowHandle", ""))
            
            if not window_handle:
                return ModuleResult(success=False, error=f"窗口句柄不能为空，请确保变量 '{app_variable}' 已创建")
            
            menu_path = context.resolve_value(config.get("menuPath", ""))  # 例如: "文件->打开"
            
            if not window_handle:
                return ModuleResult(success=False, error="窗口句柄不能为空")
            
            if not menu_path:
                return ModuleResult(success=False, error="菜单路径不能为空")
            
            if isinstance(window_handle, dict):
                handle = window_handle.get("handle")
            else:
                handle = window_handle
            
            window = auto.ControlFromHandle(int(handle))
            
            if not window or not window.Exists(0, 0):
                return ModuleResult(success=False, error="窗口不存在")
            
            # 分割菜单路径
            menu_items = [item.strip() for item in menu_path.split("->")]
            
            # 逐级点击菜单
            current_control = window
            for i, menu_name in enumerate(menu_items):
                menu_item = current_control.MenuItemControl(Name=menu_name)
                if not menu_item or not menu_item.Exists(0, 0):
                    return ModuleResult(success=False, error=f"未找到菜单项: {menu_name}")
                
                if i < len(menu_items) - 1:
                    # 展开子菜单
                    menu_item.Click()
                    await asyncio.sleep(0.2)
                    current_control = menu_item
                else:
                    # 最后一项，执行点击
                    menu_item.Click()
            
            return ModuleResult(
                success=True,
                message=f"已点击菜单: {menu_path}"
            )
            
        except ImportError:
            return ModuleResult(success=False, error="需要安装 uiautomation 库: pip install uiautomation")
        except Exception as e:
            return ModuleResult(success=False, error=f"点击菜单失败: {str(e)}")


@register_executor
class DesktopGetControlInfoExecutor(ModuleExecutor):
    """获取控件信息 - 获取控件的详细属性信息"""
    
    @property
    def module_type(self) -> str:
        return "desktop_get_control_info"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            import uiautomation as auto
            
            # 从变量中获取控件信息，默认使用 desktop_control
            control_variable = config.get("controlVariable", "desktop_control")
            control_info = context.get_variable(control_variable)
            
            # 如果没有找到变量，尝试从配置中直接获取
            if not control_info:
                control_info = context.resolve_value(config.get("controlInfo", ""))
            
            if not control_info:
                return ModuleResult(success=False, error=f"控件信息不能为空，请确保变量 '{control_variable}' 已创建")
            
            # 保存到变量，默认使用 control_info
            save_to_variable = config.get("saveToVariable", "control_info")
            
            if not control_info:
                return ModuleResult(success=False, error="控件信息不能为空")
            
            if isinstance(control_info, dict):
                handle = control_info.get("handle")
            else:
                handle = control_info
            
            control = auto.ControlFromHandle(int(handle))
            
            if not control or not control.Exists(0, 0):
                return ModuleResult(success=False, error="控件不存在")
            
            # 收集控件信息
            info = {
                "name": control.Name,
                "automation_id": control.AutomationId,
                "class_name": control.ClassName,
                "control_type": control.ControlTypeName,
                "handle": control.NativeWindowHandle,
                "is_enabled": control.IsEnabled,
                "is_visible": control.IsVisible,
                "is_offscreen": control.IsOffscreen,
                "has_keyboard_focus": control.HasKeyboardFocus,
                "rect": {
                    "left": control.BoundingRectangle.left,
                    "top": control.BoundingRectangle.top,
                    "right": control.BoundingRectangle.right,
                    "bottom": control.BoundingRectangle.bottom,
                    "width": control.BoundingRectangle.width(),
                    "height": control.BoundingRectangle.height()
                }
            }
            
            # 尝试获取文本值
            try:
                info["value"] = control.GetValuePattern().Value
            except Exception:
                pass
            
            if save_to_variable:
                context.set_variable(save_to_variable, info)
            
            return ModuleResult(
                success=True,
                message="已获取控件信息",
                data=info
            )
            
        except ImportError:
            return ModuleResult(success=False, error="需要安装 uiautomation 库: pip install uiautomation")
        except Exception as e:
            return ModuleResult(success=False, error=f"获取控件信息失败: {str(e)}")


@register_executor
class DesktopGetControlTreeExecutor(ModuleExecutor):
    """获取控件树 - 获取窗口的完整控件树结构"""
    
    @property
    def module_type(self) -> str:
        return "desktop_get_control_tree"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            import uiautomation as auto
            
            # 从变量中获取窗口句柄，默认使用 desktop_app
            app_variable = config.get("appVariable", "desktop_app")
            window_handle = context.get_variable(app_variable)
            
            # 如果没有找到变量，尝试从配置中直接获取
            if not window_handle:
                window_handle = context.resolve_value(config.get("windowHandle", ""))
            
            if not window_handle:
                return ModuleResult(success=False, error=f"窗口句柄不能为空，请确保变量 '{app_variable}' 已创建")
            
            max_depth = to_int(config.get("maxDepth", 5), 5, context)
            # 保存到变量，默认使用 control_tree
            save_to_variable = config.get("saveToVariable", "control_tree")
            
            if not window_handle:
                return ModuleResult(success=False, error="窗口句柄不能为空")
            
            if isinstance(window_handle, dict):
                handle = window_handle.get("handle")
            else:
                handle = window_handle
            
            window = auto.ControlFromHandle(int(handle))
            
            if not window or not window.Exists(0, 0):
                return ModuleResult(success=False, error="窗口不存在")
            
            def build_tree(control, depth=0):
                if depth > max_depth:
                    return None
                
                node = {
                    "name": control.Name,
                    "type": control.ControlTypeName,
                    "automation_id": control.AutomationId,
                    "class_name": control.ClassName,
                    "children": []
                }
                
                try:
                    for child in control.GetChildren():
                        child_node = build_tree(child, depth + 1)
                        if child_node:
                            node["children"].append(child_node)
                except Exception:
                    pass
                
                return node
            
            tree = build_tree(window)
            
            if save_to_variable:
                context.set_variable(save_to_variable, tree)
            
            return ModuleResult(
                success=True,
                message="已获取控件树",
                data=tree
            )
            
        except ImportError:
            return ModuleResult(success=False, error="需要安装 uiautomation 库: pip install uiautomation")
        except Exception as e:
            return ModuleResult(success=False, error=f"获取控件树失败: {str(e)}")



@register_executor
class DesktopAppGetInfoExecutor(ModuleExecutor):
    """获取应用信息 - 获取已连接应用的详细信息"""
    
    @property
    def module_type(self) -> str:
        return "desktop_app_get_info"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            import uiautomation as auto
            
            # 从变量中获取窗口句柄，默认使用 desktop_app
            app_variable = config.get("appVariable", "desktop_app")
            window_handle = context.get_variable(app_variable)
            
            # 如果没有找到变量，尝试从配置中直接获取
            if not window_handle:
                window_handle = context.resolve_value(config.get("windowHandle", ""))
            
            if not window_handle:
                return ModuleResult(success=False, error=f"窗口句柄不能为空，请确保变量 '{app_variable}' 已创建")
            
            # 保存到变量，默认使用 app_info
            save_to_variable = config.get("saveToVariable", "app_info")
            
            if not window_handle:
                return ModuleResult(success=False, error="窗口句柄不能为空")
            
            if isinstance(window_handle, dict):
                handle = window_handle.get("handle")
            else:
                handle = window_handle
            
            window = auto.ControlFromHandle(int(handle))
            
            if not window or not window.Exists(0, 0):
                return ModuleResult(success=False, error="窗口不存在")
            
            # 收集应用信息
            info = {
                "name": window.Name,
                "class_name": window.ClassName,
                "process_id": window.ProcessId,
                "handle": window.NativeWindowHandle,
                "is_enabled": window.IsEnabled,
                "is_visible": window.IsVisible,
                "is_topmost": window.IsTopmost,
                "rect": {
                    "left": window.BoundingRectangle.left,
                    "top": window.BoundingRectangle.top,
                    "right": window.BoundingRectangle.right,
                    "bottom": window.BoundingRectangle.bottom,
                    "width": window.BoundingRectangle.width(),
                    "height": window.BoundingRectangle.height()
                }
            }
            
            if save_to_variable:
                context.set_variable(save_to_variable, info)
            
            return ModuleResult(
                success=True,
                message=f"已获取应用信息: {window.Name}",
                data=info
            )
            
        except ImportError:
            return ModuleResult(success=False, error="需要安装 uiautomation 库: pip install uiautomation")
        except Exception as e:
            return ModuleResult(success=False, error=f"获取应用信息失败: {str(e)}")


@register_executor
class DesktopAppWaitReadyExecutor(ModuleExecutor):
    """等待应用就绪 - 等待应用窗口完全加载并可交互"""
    
    @property
    def module_type(self) -> str:
        return "desktop_app_wait_ready"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            import uiautomation as auto
            
            # 从变量中获取窗口句柄，默认使用 desktop_app
            app_variable = config.get("appVariable", "desktop_app")
            window_handle = context.get_variable(app_variable)
            
            # 如果没有找到变量，尝试从配置中直接获取
            if not window_handle:
                window_handle = context.resolve_value(config.get("windowHandle", ""))
            
            if not window_handle:
                return ModuleResult(success=False, error=f"窗口句柄不能为空，请确保变量 '{app_variable}' 已创建")
            
            timeout = to_int(config.get("timeout", 30), 30, context)
            check_enabled = to_bool(config.get("checkEnabled", True), True, context)
            
            if not window_handle:
                return ModuleResult(success=False, error="窗口句柄不能为空")
            
            if isinstance(window_handle, dict):
                handle = window_handle.get("handle")
            else:
                handle = window_handle
            
            start_time = time.time()
            
            while time.time() - start_time < timeout:
                try:
                    window = auto.ControlFromHandle(int(handle))
                    
                    if window and window.Exists(0, 0):
                        if check_enabled:
                            if window.IsEnabled:
                                return ModuleResult(success=True, message="应用已就绪")
                        else:
                            return ModuleResult(success=True, message="应用已就绪")
                except Exception:
                    pass
                
                await asyncio.sleep(0.5)
            
            return ModuleResult(success=False, error=f"在 {timeout} 秒内应用未就绪")
            
        except ImportError:
            return ModuleResult(success=False, error="需要安装 uiautomation 库: pip install uiautomation")
        except Exception as e:
            return ModuleResult(success=False, error=f"等待应用就绪失败: {str(e)}")


@register_executor
class DesktopWindowListExecutor(ModuleExecutor):
    """获取窗口列表 - 获取所有可见窗口的列表"""
    
    @property
    def module_type(self) -> str:
        return "desktop_window_list"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            import uiautomation as auto
            
            filter_visible = to_bool(config.get("filterVisible", True), True, context)
            filter_enabled = to_bool(config.get("filterEnabled", False), False, context)
            # 标题过滤（与前端面板对齐）：留空则不过滤，非空则做不区分大小写的子串匹配
            filter_title = context.resolve_value(config.get("filterTitle", "")) or ""
            filter_title = filter_title.strip()
            # 保存到变量，默认使用 window_list
            save_to_variable = config.get("saveToVariable", "window_list")
            
            # 获取所有顶层窗口
            windows = []
            
            for window in auto.GetRootControl().GetChildren():
                if window.ControlTypeName == "WindowControl":
                    # 应用过滤条件
                    if filter_visible and not window.IsVisible:
                        continue
                    if filter_enabled and not window.IsEnabled:
                        continue
                    if filter_title and filter_title.lower() not in (window.Name or "").lower():
                        continue
                    
                    windows.append({
                        "name": window.Name,
                        "class_name": window.ClassName,
                        "process_id": window.ProcessId,
                        "handle": window.NativeWindowHandle,
                        "is_visible": window.IsVisible,
                        "is_enabled": window.IsEnabled
                    })
            
            if save_to_variable:
                context.set_variable(save_to_variable, windows)
            
            return ModuleResult(
                success=True,
                message=f"已获取 {len(windows)} 个窗口",
                data={"windows": windows, "count": len(windows)}
            )
            
        except ImportError:
            return ModuleResult(success=False, error="需要安装 uiautomation 库: pip install uiautomation")
        except Exception as e:
            return ModuleResult(success=False, error=f"获取窗口列表失败: {str(e)}")


@register_executor
class DesktopControlInfoExecutor(ModuleExecutor):
    """获取控件信息 - 获取控件的详细属性（别名）"""
    
    @property
    def module_type(self) -> str:
        return "desktop_control_info"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        # 复用 desktop_get_control_info 的逻辑
        executor = DesktopGetControlInfoExecutor()
        return await executor.execute(config, context)


@register_executor
class DesktopControlTreeExecutor(ModuleExecutor):
    """获取控件树 - 获取窗口的完整控件树结构（别名）"""
    
    @property
    def module_type(self) -> str:
        return "desktop_control_tree"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        # 复用 desktop_get_control_tree 的逻辑
        executor = DesktopGetControlTreeExecutor()
        return await executor.execute(config, context)


@register_executor
class DesktopSetValueExecutor(ModuleExecutor):
    """设置控件值 - 直接设置控件的值"""
    
    @property
    def module_type(self) -> str:
        return "desktop_set_value"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            import uiautomation as auto
            
            # 从变量中获取控件信息，默认使用 desktop_control
            control_variable = config.get("controlVariable", "desktop_control")
            control_info = context.get_variable(control_variable)
            
            # 如果没有找到变量，尝试从配置中直接获取
            if not control_info:
                control_info = context.resolve_value(config.get("controlInfo", ""))
            
            if not control_info:
                return ModuleResult(success=False, error=f"控件信息不能为空，请确保变量 '{control_variable}' 已创建")
            
            value = context.resolve_value(config.get("value", ""))
            
            if not control_info:
                return ModuleResult(success=False, error="控件信息不能为空")
            
            if isinstance(control_info, dict):
                handle = control_info.get("handle")
            else:
                handle = control_info
            
            control = auto.ControlFromHandle(int(handle))
            
            if not control or not control.Exists(0, 0):
                return ModuleResult(success=False, error="控件不存在")
            
            # 尝试设置值
            try:
                control.GetValuePattern().SetValue(str(value))
            except Exception:
                # 如果不支持 ValuePattern，尝试使用 RangeValue
                try:
                    control.GetRangeValuePattern().SetValue(float(value))
                except Exception:
                    return ModuleResult(success=False, error="控件不支持设置值")
            
            return ModuleResult(
                success=True,
                message=f"已设置控件值: {value}"
            )
            
        except ImportError:
            return ModuleResult(success=False, error="需要安装 uiautomation 库: pip install uiautomation")
        except Exception as e:
            return ModuleResult(success=False, error=f"设置控件值失败: {str(e)}")


@register_executor
class DesktopDragControlExecutor(ModuleExecutor):
    """拖拽控件 - 拖拽控件到指定位置"""
    
    @property
    def module_type(self) -> str:
        return "desktop_drag_control"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            import uiautomation as auto
            
            # 从变量中获取控件信息，默认使用 desktop_control
            control_variable = config.get("controlVariable", "desktop_control")
            control_info = context.get_variable(control_variable)
            
            # 如果没有找到变量，尝试从配置中直接获取
            if not control_info:
                control_info = context.resolve_value(config.get("controlInfo", ""))
            
            if not control_info:
                return ModuleResult(success=False, error=f"控件信息不能为空，请确保变量 '{control_variable}' 已创建")
            
            target_x = to_int(config.get("targetX", 0), 0, context)
            target_y = to_int(config.get("targetY", 0), 0, context)
            drag_mode = context.resolve_value(config.get("dragMode", "absolute"))  # absolute, relative
            
            if not control_info:
                return ModuleResult(success=False, error="控件信息不能为空")
            
            if isinstance(control_info, dict):
                handle = control_info.get("handle")
            else:
                handle = control_info
            
            control = auto.ControlFromHandle(int(handle))
            
            if not control or not control.Exists(0, 0):
                return ModuleResult(success=False, error="控件不存在")
            
            # 获取控件中心点
            rect = control.BoundingRectangle
            start_x = rect.left + rect.width() // 2
            start_y = rect.top + rect.height() // 2
            
            # 计算目标位置
            if drag_mode == "relative":
                end_x = start_x + target_x
                end_y = start_y + target_y
            else:  # absolute
                end_x = target_x
                end_y = target_y
            
            # 执行拖拽
            import win32api
            import win32con
            
            # 移动到起始位置
            win32api.SetCursorPos((start_x, start_y))
            await asyncio.sleep(0.1)
            
            # 按下鼠标左键
            win32api.mouse_event(win32con.MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
            await asyncio.sleep(0.1)
            
            # 移动到目标位置
            win32api.SetCursorPos((end_x, end_y))
            await asyncio.sleep(0.1)
            
            # 释放鼠标左键
            win32api.mouse_event(win32con.MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
            
            return ModuleResult(
                success=True,
                message=f"已拖拽控件到 ({end_x}, {end_y})"
            )
            
        except ImportError as e:
            if "uiautomation" in str(e):
                return ModuleResult(success=False, error="需要安装 uiautomation 库: pip install uiautomation")
            else:
                return ModuleResult(success=False, error="需要安装 pywin32 库: pip install pywin32")
        except Exception as e:
            return ModuleResult(success=False, error=f"拖拽控件失败: {str(e)}")


@register_executor
class DesktopListOperateExecutor(ModuleExecutor):
    """操作列表 - 对列表控件进行操作（选择、获取项等）"""
    
    @property
    def module_type(self) -> str:
        return "desktop_list_operate"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            import uiautomation as auto
            
            # 从变量中获取控件信息，默认使用 desktop_control
            control_variable = config.get("controlVariable", "desktop_control")
            control_info = context.get_variable(control_variable)
            
            # 如果没有找到变量，尝试从配置中直接获取
            if not control_info:
                control_info = context.resolve_value(config.get("controlInfo", ""))
            
            if not control_info:
                return ModuleResult(success=False, error=f"控件信息不能为空，请确保变量 '{control_variable}' 已创建")
            
            operation = context.resolve_value(config.get("operation", "select"))  # select, get_items, get_selected
            item_index = to_int(config.get("itemIndex", 0), 0, context)
            item_name = context.resolve_value(config.get("itemName", ""))
            # 字段与前端面板对齐: value(单一字段，纯数字视为索引，否则视为文本)
            value = context.resolve_value(config.get("value", ""))
            if value not in ('', None) and not item_name:
                sval = str(value).strip()
                if sval.lstrip('-').isdigit():
                    item_index = int(sval)
                else:
                    item_name = sval
            # 保存到变量，默认使用 list_result
            save_to_variable = config.get("saveToVariable", "list_result")
            
            if not control_info:
                return ModuleResult(success=False, error="控件信息不能为空")
            
            if isinstance(control_info, dict):
                handle = control_info.get("handle")
            else:
                handle = control_info
            
            control = auto.ControlFromHandle(int(handle))
            
            if not control or not control.Exists(0, 0):
                return ModuleResult(success=False, error="控件不存在")
            
            if operation == "select":
                # 选择列表项
                if item_name:
                    item = control.ListItemControl(Name=item_name)
                    if item and item.Exists(0, 0):
                        item.Click()
                        return ModuleResult(success=True, message=f"已选择列表项: {item_name}")
                    else:
                        return ModuleResult(success=False, error=f"未找到列表项: {item_name}")
                else:
                    items = control.GetChildren()
                    if 0 <= item_index < len(items):
                        items[item_index].Click()
                        return ModuleResult(success=True, message=f"已选择列表项索引: {item_index}")
                    else:
                        return ModuleResult(success=False, error=f"索引 {item_index} 超出范围")
            
            elif operation == "get_items":
                # 获取所有列表项
                items = []
                for item in control.GetChildren():
                    if item.ControlTypeName == "ListItemControl":
                        items.append({
                            "name": item.Name,
                            "index": len(items)
                        })
                
                if save_to_variable:
                    context.set_variable(save_to_variable, items)
                
                return ModuleResult(
                    success=True,
                    message=f"已获取 {len(items)} 个列表项",
                    data={"items": items, "count": len(items)}
                )
            
            elif operation == "get_selected":
                # 获取选中的列表项
                try:
                    selection_pattern = control.GetSelectionPattern()
                    selected_items = selection_pattern.GetSelection()
                    
                    selected = []
                    for item in selected_items:
                        selected.append({
                            "name": item.Name,
                            "automation_id": item.AutomationId
                        })
                    
                    if save_to_variable:
                        context.set_variable(save_to_variable, selected)
                    
                    return ModuleResult(
                        success=True,
                        message=f"已获取 {len(selected)} 个选中项",
                        data={"selected": selected, "count": len(selected)}
                    )
                except Exception:
                    return ModuleResult(success=False, error="控件不支持获取选中项")
            
            return ModuleResult(success=False, error=f"不支持的操作: {operation}")
            
        except ImportError:
            return ModuleResult(success=False, error="需要安装 uiautomation 库: pip install uiautomation")
        except Exception as e:
            return ModuleResult(success=False, error=f"操作列表失败: {str(e)}")


@register_executor
class DesktopGetPropertyExecutor(ModuleExecutor):
    """获取控件属性 - 获取控件的特定属性值"""
    
    @property
    def module_type(self) -> str:
        return "desktop_get_property"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            import uiautomation as auto
            
            # 从变量中获取控件信息，默认使用 desktop_control
            control_variable = config.get("controlVariable", "desktop_control")
            control_info = context.get_variable(control_variable)
            
            # 如果没有找到变量，尝试从配置中直接获取
            if not control_info:
                control_info = context.resolve_value(config.get("controlInfo", ""))
            
            if not control_info:
                return ModuleResult(success=False, error=f"控件信息不能为空，请确保变量 '{control_variable}' 已创建")
            
            property_name = context.resolve_value(config.get("propertyName", ""))
            # 保存到变量，默认使用 property_value
            save_to_variable = config.get("saveToVariable", "property_value")
            
            if not control_info:
                return ModuleResult(success=False, error="控件信息不能为空")
            
            if not property_name:
                return ModuleResult(success=False, error="属性名不能为空")
            
            if isinstance(control_info, dict):
                handle = control_info.get("handle")
            else:
                handle = control_info
            
            control = auto.ControlFromHandle(int(handle))
            
            if not control or not control.Exists(0, 0):
                return ModuleResult(success=False, error="控件不存在")
            
            # 获取属性值
            property_value = None
            
            try:
                # 尝试直接获取属性
                if hasattr(control, property_name):
                    property_value = getattr(control, property_name)
                else:
                    return ModuleResult(success=False, error=f"控件不支持属性: {property_name}")
            except Exception as e:
                return ModuleResult(success=False, error=f"获取属性失败: {str(e)}")
            
            if save_to_variable:
                context.set_variable(save_to_variable, property_value)
            
            return ModuleResult(
                success=True,
                message=f"已获取属性 {property_name}: {property_value}",
                data={"property": property_name, "value": property_value}
            )
            
        except ImportError:
            return ModuleResult(success=False, error="需要安装 uiautomation 库: pip install uiautomation")
        except Exception as e:
            return ModuleResult(success=False, error=f"获取控件属性失败: {str(e)}")


@register_executor
class DesktopDialogHandleExecutor(ModuleExecutor):
    """处理对话框 - 自动处理弹出的对话框"""
    
    @property
    def module_type(self) -> str:
        return "desktop_dialog_handle"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            import uiautomation as auto
            
            dialog_title = context.resolve_value(config.get("dialogTitle", ""))
            # 字段与前端面板对齐: buttonText，兼容旧字段名 buttonName
            button_name = context.resolve_value(config.get("buttonText", config.get("buttonName", "确定")))
            timeout = to_int(config.get("timeout", 10), 10, context)
            wait_appear = to_bool(config.get("waitAppear", True), True, context)
            
            if not dialog_title:
                return ModuleResult(success=False, error="对话框标题不能为空")
            
            # 等待对话框出现
            if wait_appear:
                start_time = time.time()
                dialog = None
                
                while time.time() - start_time < timeout:
                    dialog = auto.WindowControl(searchDepth=1, SubName=dialog_title)
                    if dialog and dialog.Exists(0, 0):
                        break
                    await asyncio.sleep(0.3)
                
                if not dialog or not dialog.Exists(0, 0):
                    return ModuleResult(success=False, error=f"在 {timeout} 秒内未找到对话框: {dialog_title}")
            else:
                dialog = auto.WindowControl(searchDepth=1, SubName=dialog_title)
                if not dialog or not dialog.Exists(0, 0):
                    return ModuleResult(success=False, error=f"未找到对话框: {dialog_title}")
            
            # 查找并点击按钮
            button = dialog.ButtonControl(Name=button_name)
            if not button or not button.Exists(0, 0):
                return ModuleResult(success=False, error=f"未找到按钮: {button_name}")
            
            button.Click()
            
            return ModuleResult(
                success=True,
                message=f"已处理对话框 '{dialog_title}'，点击了 '{button_name}' 按钮"
            )
            
        except ImportError:
            return ModuleResult(success=False, error="需要安装 uiautomation 库: pip install uiautomation")
        except Exception as e:
            return ModuleResult(success=False, error=f"处理对话框失败: {str(e)}")



# ============================================================================
# 现代桌面应用增强：发送热键到桌面应用（老应用 / Electron 应用必备）
# 注：OCR 文字点击 / 图像匹配点击 / 区域 OCR 已由 click_text / click_image / image_ocr 模块覆盖，不再重复造轮子
# ============================================================================


@register_executor
class DesktopHotkeyExecutor(ModuleExecutor):
    """直接发送热键到当前活动窗口（如 Ctrl+S / Ctrl+C / Alt+F4，老应用 / Electron 应用必备）"""

    @property
    def module_type(self) -> str:
        return "desktop_hotkey"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            keys = context.resolve_value(config.get("keys", ""))  # "ctrl+s" 或 "alt+tab" 等
            if not keys:
                return ModuleResult(success=False, error="keys 不能为空")
            target_window = context.resolve_value(config.get("targetWindow", ""))  # 可选窗口标题
            interval = float(config.get("interval", 0.05))

            try:
                import pyautogui
            except ImportError:
                return ModuleResult(success=False, error="需要 pyautogui")

            # 如果指定了目标窗口先激活
            if target_window:
                try:
                    import uiautomation as auto
                    win = auto.WindowControl(searchDepth=2, Name=target_window)
                    if win.Exists(0, 0):
                        win.SetActive()
                        await asyncio.sleep(0.2)
                except Exception:
                    pass

            # 解析 keys 字符串："ctrl+shift+s" → ["ctrl","shift","s"]
            key_list = [k.strip().lower() for k in keys.replace(" ", "").split("+") if k.strip()]
            if not key_list:
                return ModuleResult(success=False, error=f"无效的 keys 格式：{keys}")

            pyautogui.hotkey(*key_list, interval=interval)
            return ModuleResult(success=True, message=f"已发送热键：{keys}")
        except Exception as e:
            return ModuleResult(success=False, error=f"发送热键失败：{e}")
