"""高级模块执行器 - advanced_browser"""
from .base import ModuleExecutor, ExecutionContext, ModuleResult, register_executor, escape_css_selector, pw_wait_for_element, smart_wait_locator
from .type_utils import to_int, to_float, parse_search_region
from pathlib import Path
import asyncio
import base64
import os
import re
import tempfile
import time


@register_executor
class SelectDropdownExecutor(ModuleExecutor):
    """下拉框选择模块执行器"""

    @property
    def module_type(self) -> str:
        return "select_dropdown"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        selector = context.resolve_value(config.get('selector', ''))
        select_by = context.resolve_value(config.get('selectBy', 'value'))  # 支持变量引用
        value = context.resolve_value(config.get('value', ''))
        # 获取超时配置（秒），转换为毫秒传给 Playwright
        timeout_ms = to_int(config.get('timeout', 30), 30, context) * 1000

        if not selector:
            return ModuleResult(success=False, error="选择器不能为空")

        if context.page is None:
            return ModuleResult(success=False, error="没有打开的页面")

        try:
            await context.switch_to_latest_page()

            # 先等待页面加载完成
            # 处理超时参数：0 表示不限制超时，None 表示使用 Playwright 默认超时
            wait_timeout = None if timeout_ms == 0 else timeout_ms
            
            try:
                await context.page.wait_for_load_state('domcontentloaded', timeout=wait_timeout)
            except Exception:
                pass
            
            # 选择器自愈：录制/拾取时保存了元素提示则用锚点重定位，主选择器失效时兜底
            _hints = config.get('selectorHints')
            if _hints:
                element = await smart_wait_locator(context.page, escape_css_selector(selector), hints=_hints,
                                                   state='visible', timeout=wait_timeout, node_config=config, context=context)
            else:
                await pw_wait_for_element(context.page, escape_css_selector(selector), state='visible', timeout=wait_timeout)
                element = context.page.locator(escape_css_selector(selector))

            # 1) 先按原生 <select> 处理
            try:
                if select_by == 'value':
                    await element.select_option(value=value)
                elif select_by == 'label':
                    await element.select_option(label=value)
                elif select_by == 'index':
                    await element.select_option(index=int(value))
                return ModuleResult(success=True, message=f"已选择: {value}")
            except Exception as native_err:
                # 2) 原生失败 → 可能是 Element Plus / Ant Design 等"伪下拉"（div 封装，非原生 select）
                #    策略：点击触发器展开下拉，再在弹出的选项里按文本/索引点击
                try:
                    await element.first.click(timeout=wait_timeout)
                except Exception:
                    # 有些组件真正可点的是内部 input，退一步点其内部
                    try:
                        await element.first.locator('input,.el-select__wrapper,.el-input__wrapper').first.click(timeout=3000)
                    except Exception:
                        pass
                await context.page.wait_for_timeout(350)

                target_text = str(value).strip()
                option_selectors = [
                    '.el-select-dropdown__item',
                    '.el-cascader-node__label',
                    '.ant-select-item-option-content',
                    '.ant-select-item-option',
                    'li[role="option"]',
                    '[role="option"]',
                    '.el-option',
                    'li.option',
                ]
                clicked = False
                for osel in option_selectors:
                    opts = context.page.locator(osel)
                    try:
                        count = await opts.count()
                    except Exception:
                        count = 0
                    if count == 0:
                        continue
                    # 按索引选择：直接点第 N 个可见选项
                    if select_by == 'index':
                        try:
                            await opts.nth(int(value)).click(timeout=3000)
                            clicked = True
                            break
                        except Exception:
                            continue
                    # 按文本/标签选择：找文本匹配的可见选项
                    for i in range(min(count, 200)):
                        opt = opts.nth(i)
                        try:
                            if not await opt.is_visible():
                                continue
                            txt = (await opt.inner_text()).strip()
                        except Exception:
                            continue
                        if txt == target_text or (target_text and target_text in txt):
                            try:
                                await opt.click(timeout=3000)
                                clicked = True
                            except Exception:
                                clicked = False
                            break
                    if clicked:
                        break

                if clicked:
                    return ModuleResult(success=True, message=f"已选择(自定义下拉): {value}")
                return ModuleResult(
                    success=False,
                    error=f"选择下拉框失败：原生 select 不可用（{native_err}），且未在自定义下拉组件中找到选项「{value}」。"
                          f"可尝试改用「点击元素」先展开下拉，再「点击元素」选中目标项。"
                )

        except Exception as e:
            return ModuleResult(success=False, error=f"选择下拉框失败: {str(e)}")

@register_executor
class SetCheckboxExecutor(ModuleExecutor):
    """设置复选框模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "set_checkbox"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        selector = context.resolve_value(config.get('selector', ''))
        checked_raw = config.get('checked', True)
        # 支持变量引用
        if isinstance(checked_raw, str):
            checked_raw = context.resolve_value(checked_raw)
        checked = checked_raw in [True, 'true', 'True', '1', 1]
        
        if not selector:
            return ModuleResult(success=False, error="选择器不能为空")
        
        if context.page is None:
            return ModuleResult(success=False, error="没有打开的页面")
        
        try:
            await context.switch_to_latest_page()
            # 选择器自愈：保存了元素提示则用锚点重定位兜底
            _hints = config.get('selectorHints')
            if _hints:
                element = await smart_wait_locator(context.page, escape_css_selector(selector), hints=_hints,
                                                   state='visible', node_config=config, context=context)
            else:
                await context.page.wait_for_selector(escape_css_selector(selector), state='visible')
                element = context.page.locator(escape_css_selector(selector))
            
            if checked:
                await element.check()
            else:
                await element.uncheck()
            
            return ModuleResult(success=True, message=f"复选框已{'勾选' if checked else '取消勾选'}")
        
        except Exception as e:
            return ModuleResult(success=False, error=f"设置复选框失败: {str(e)}")

@register_executor
class DragElementExecutor(ModuleExecutor):
    """拖拽元素模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "drag_element"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        source_selector = context.resolve_value(config.get('sourceSelector', ''))
        target_selector = context.resolve_value(config.get('targetSelector', ''))
        target_position = config.get('targetPosition')
        
        if not source_selector:
            return ModuleResult(success=False, error="源元素选择器不能为空")
        
        if context.page is None:
            return ModuleResult(success=False, error="没有打开的页面")
        
        try:
            await context.switch_to_latest_page()
            source = context.page.locator(escape_css_selector(source_selector))
            
            if target_selector:
                target = context.page.locator(escape_css_selector(target_selector))
                await source.drag_to(target)
            elif target_position:
                box = await source.bounding_box()
                if box:
                    start_x = box['x'] + box['width'] / 2
                    start_y = box['y'] + box['height'] / 2
                    end_x = target_position.get('x', start_x)
                    end_y = target_position.get('y', start_y)
                    
                    await context.page.mouse.move(start_x, start_y)
                    await context.page.mouse.down()
                    await context.page.mouse.move(end_x, end_y, steps=10)
                    await context.page.mouse.up()
            
            return ModuleResult(success=True, message="拖拽完成")
        
        except Exception as e:
            return ModuleResult(success=False, error=f"拖拽元素失败: {str(e)}")

@register_executor
class ScrollPageExecutor(ModuleExecutor):
    """滚动页面模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "scroll_page"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        direction = context.resolve_value(config.get('direction', 'down'))  # 支持变量引用
        distance = to_int(config.get('distance', 500), 500, context)
        selector = context.resolve_value(config.get('selector', ''))
        scroll_mode = context.resolve_value(config.get('scrollMode', 'auto'))  # 支持变量引用
        
        if context.page is None:
            return ModuleResult(success=False, error="没有打开的页面")
        
        try:
            await context.switch_to_latest_page()
            
            delta_x = 0
            delta_y = 0
            
            if direction == 'down':
                delta_y = distance
            elif direction == 'up':
                delta_y = -distance
            elif direction == 'right':
                delta_x = distance
            elif direction == 'left':
                delta_x = -distance
            
            # 使用鼠标滚轮模拟滚动（对抖音等虚拟滚动页面更有效）
            if scroll_mode == 'wheel' or scroll_mode == 'auto':
                try:
                    if selector:
                        # 先定位到元素中心
                        element = context.page.locator(escape_css_selector(selector)).first
                        box = await element.bounding_box()
                        if box:
                            center_x = box['x'] + box['width'] / 2
                            center_y = box['y'] + box['height'] / 2
                            await context.page.mouse.move(center_x, center_y)
                            await context.page.mouse.wheel(delta_x, delta_y)
                        else:
                            raise Exception("无法获取元素位置")
                    else:
                        # 在页面中心滚动
                        viewport = context.page.viewport_size
                        if viewport:
                            await context.page.mouse.move(viewport['width'] / 2, viewport['height'] / 2)
                        await context.page.mouse.wheel(delta_x, delta_y)
                    
                    return ModuleResult(success=True, message=f"已滚动 {direction} {distance}px (鼠标滚轮)")
                except Exception as wheel_error:
                    if scroll_mode == 'wheel':
                        raise wheel_error
                    # auto 模式下，滚轮失败则尝试脚本滚动
            
            # 使用 JavaScript 滚动
            if selector:
                await context.page.locator(escape_css_selector(selector)).evaluate(
                    f"el => el.scrollBy({delta_x}, {delta_y})"
                )
            else:
                await context.page.evaluate(f"window.scrollBy({delta_x}, {delta_y})")
            
            return ModuleResult(success=True, message=f"已滚动 {direction} {distance}px")
        
        except Exception as e:
            return ModuleResult(success=False, error=f"滚动页面失败: {str(e)}")

@register_executor
class UploadFileExecutor(ModuleExecutor):
    """上传文件模块执行器
    
    多级策略：
    1. 直接 set_input_files（目标本身是 input[type=file]）
    2. Playwright expect_file_chooser 拦截（浏览器内 file chooser）
    3. JS 注入到页面内隐藏的 input[type=file]
    4. 系统原生对话框兜底：点击按钮后用 Windows API 向对话框输入路径并确认
    """

    @property
    def module_type(self) -> str:
        return "upload_file"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        selector  = context.resolve_value(config.get("selector", ""))
        file_path = context.resolve_value(config.get("filePath", ""))
        timeout_ms = to_int(config.get('timeout', 30), 30, context) * 1000

        if not selector:
            return ModuleResult(success=False, error="选择器不能为空")
        if not file_path:
            return ModuleResult(success=False, error="文件路径不能为空")
        if context.page is None:
            return ModuleResult(success=False, error="没有打开的页面")

        # 规范化文件路径（统一用反斜杠，Windows 对话框需要）
        file_path_normalized = str(Path(file_path).resolve())

        if not Path(file_path_normalized).exists():
            return ModuleResult(success=False, error=f"文件不存在: {file_path_normalized}")

        try:
            await context.switch_to_latest_page()
            click_timeout = None if timeout_ms == 0 else timeout_ms

            element = context.page.locator(escape_css_selector(selector))

            # ── 策略1：目标本身是 input[type=file]，直接 set_input_files ──
            try:
                tag_name   = await element.evaluate("el => el.tagName.toLowerCase()")
                input_type = await element.evaluate("el => el.type || ''")
                if tag_name == "input" and input_type == "file":
                    await element.set_input_files(file_path_normalized)
                    return ModuleResult(success=True, message=f"已上传文件: {file_path_normalized}")
            except Exception:
                pass

            # ── 策略2：Playwright expect_file_chooser 拦截（浏览器内 file chooser）──
            try:
                async with context.page.expect_file_chooser(timeout=min(click_timeout or 5000, 5000)) as fc_info:
                    await element.click(timeout=click_timeout)
                file_chooser = await fc_info.value
                await file_chooser.set_files(file_path_normalized)
                return ModuleResult(success=True, message=f"已上传文件: {file_path_normalized}")
            except Exception:
                pass

            # ── 策略3：JS 注入到页面内隐藏的 input[type=file] ──
            try:
                injected = await context.page.evaluate("""
                    (filePath) => {
                        const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
                        if (!inputs.length) return false;
                        // 优先选最后一个（通常是最近触发的）
                        const inp = inputs[inputs.length - 1];
                        const dt = new DataTransfer();
                        // 无法在浏览器内直接创建本地文件对象，返回false让Python侧处理
                        return false;
                    }
                """, file_path_normalized)
                # JS 无法直接创建本地 File 对象，此策略仅作占位，直接走策略4
            except Exception:
                pass

            # ── 策略4：系统原生对话框兜底（Windows）──
            # 先点击按钮触发对话框，再用 Windows API 向对话框输入路径
            try:
                await element.click(timeout=click_timeout)
                # 等待系统对话框出现
                await asyncio.sleep(1.0)
                success = await asyncio.get_event_loop().run_in_executor(
                    None, _fill_system_file_dialog, file_path_normalized
                )
                if success:
                    return ModuleResult(success=True, message=f"已上传文件（系统对话框）: {file_path_normalized}")
                else:
                    return ModuleResult(success=False, error="系统文件对话框填充失败，请确认对话框已弹出")
            except Exception as e4:
                return ModuleResult(success=False, error=f"上传文件失败（所有策略均失败）: {str(e4)}")

        except Exception as e:
            return ModuleResult(success=False, error=f"上传文件失败: {str(e)}")


def _fill_system_file_dialog(file_path: str) -> bool:
    """向 Windows 系统文件对话框填充路径并确认（在线程池中执行，不阻塞事件循环）
    
    原理：枚举顶层窗口，找到文件对话框（类名 #32770），
    定位其中的文件名编辑框，输入路径，然后模拟点击"打开"按钮。
    """
    import ctypes
    import ctypes.wintypes
    import time

    user32   = ctypes.windll.user32
    kernel32 = ctypes.windll.kernel32

    WM_SETTEXT    = 0x000C
    WM_COMMAND    = 0x0111
    BM_CLICK      = 0x00F5
    IDOK          = 1

    # 等待对话框出现，最多等 5 秒
    dialog_hwnd = None
    for _ in range(50):
        def enum_callback(hwnd, _):
            nonlocal dialog_hwnd
            if not user32.IsWindowVisible(hwnd):
                return True
            class_buf = ctypes.create_unicode_buffer(256)
            user32.GetClassNameW(hwnd, class_buf, 256)
            class_name = class_buf.value
            # 系统文件对话框的窗口类名
            if class_name in ("#32770", "NativeHWNDHost", "OperationStatusWindow"):
                title_buf = ctypes.create_unicode_buffer(512)
                user32.GetWindowTextW(hwnd, title_buf, 512)
                title = title_buf.value
                # 排除非文件对话框（如任务管理器等）
                if any(kw in title for kw in ("打开", "Open", "选择", "上传", "浏览", "Browse", "文件")):
                    dialog_hwnd = hwnd
                    return False  # 停止枚举
            return True

        WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
        user32.EnumWindows(WNDENUMPROC(enum_callback), 0)

        if dialog_hwnd:
            break
        time.sleep(0.1)

    if not dialog_hwnd:
        # 尝试更宽松的匹配：找任何 #32770 对话框
        for _ in range(20):
            def enum_callback2(hwnd, _):
                nonlocal dialog_hwnd
                if not user32.IsWindowVisible(hwnd):
                    return True
                class_buf = ctypes.create_unicode_buffer(256)
                user32.GetClassNameW(hwnd, class_buf, 256)
                if class_buf.value == "#32770":
                    dialog_hwnd = hwnd
                    return False
                return True

            user32.EnumWindows(WNDENUMPROC(enum_callback2), 0)
            if dialog_hwnd:
                break
            time.sleep(0.1)

    if not dialog_hwnd:
        return False

    try:
        # 找对话框内的文件名编辑框（ComboBoxEx32 或 Edit）
        edit_hwnd = None

        def find_edit(hwnd, _):
            nonlocal edit_hwnd
            class_buf = ctypes.create_unicode_buffer(64)
            user32.GetClassNameW(hwnd, class_buf, 64)
            cls = class_buf.value
            if cls in ("Edit", "ComboBoxEx32", "ComboBox"):
                edit_hwnd = hwnd
                return False  # 取第一个找到的
            return True

        WNDENUMPROC2 = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
        user32.EnumChildWindows(dialog_hwnd, WNDENUMPROC2(find_edit), 0)

        if not edit_hwnd:
            return False

        # 如果找到的是 ComboBoxEx32，需要找其内部的 Edit 子控件
        class_buf = ctypes.create_unicode_buffer(64)
        user32.GetClassNameW(edit_hwnd, class_buf, 64)
        if class_buf.value in ("ComboBoxEx32", "ComboBox"):
            inner_edit = user32.FindWindowExW(edit_hwnd, None, "Edit", None)
            if inner_edit:
                edit_hwnd = inner_edit

        # 激活对话框并设置文本
        user32.SetForegroundWindow(dialog_hwnd)
        time.sleep(0.1)

        # 清空并输入文件路径
        user32.SendMessageW(edit_hwnd, WM_SETTEXT, 0, file_path)
        time.sleep(0.2)

        # 找"打开"/"确定"按钮并点击
        ok_hwnd = None

        def find_ok_btn(hwnd, _):
            nonlocal ok_hwnd
            class_buf = ctypes.create_unicode_buffer(64)
            user32.GetClassNameW(hwnd, class_buf, 64)
            if class_buf.value == "Button":
                text_buf = ctypes.create_unicode_buffer(64)
                user32.GetWindowTextW(hwnd, text_buf, 64)
                text = text_buf.value.strip()
                if text in ("打开(&O)", "打开", "Open", "确定", "OK", "&Open", "上传"):
                    ok_hwnd = hwnd
                    return False
            return True

        user32.EnumChildWindows(dialog_hwnd, WNDENUMPROC2(find_ok_btn), 0)

        if ok_hwnd:
            user32.SendMessageW(ok_hwnd, BM_CLICK, 0, 0)
        else:
            # 没找到按钮，发送回车键确认
            VK_RETURN = 0x0D
            user32.PostMessageW(dialog_hwnd, 0x0100, VK_RETURN, 0)  # WM_KEYDOWN
            time.sleep(0.05)
            user32.PostMessageW(dialog_hwnd, 0x0101, VK_RETURN, 0)  # WM_KEYUP

        time.sleep(0.3)
        return True

    except Exception as e:
        print(f"[UploadFile] 系统对话框填充异常: {e}")
        return False

@register_executor
class DownloadFileExecutor(ModuleExecutor):
    """下载文件模块执行器"""

    @property
    def module_type(self) -> str:
        return "download_file"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        import httpx
        import os
        from urllib.parse import urlparse, unquote
        
        download_mode = context.resolve_value(config.get("downloadMode", "click"))  # 支持变量引用
        trigger_selector = context.resolve_value(config.get("triggerSelector", ""))
        download_url = context.resolve_value(config.get("downloadUrl", ""))
        save_path = context.resolve_value(config.get("savePath", ""))
        file_name = context.resolve_value(config.get("fileName", ""))
        variable_name = config.get("variableName", "")

        try:
            if download_mode == "url":
                if not download_url:
                    return ModuleResult(success=False, error="下载URL不能为空")

                if not file_name:
                    parsed = urlparse(download_url)
                    file_name = unquote(os.path.basename(parsed.path)) or "downloaded_file"

                if save_path:
                    Path(save_path).mkdir(parents=True, exist_ok=True)
                    final_path = Path(save_path) / file_name
                else:
                    downloads_dir = Path("downloads")
                    downloads_dir.mkdir(exist_ok=True)
                    final_path = downloads_dir / file_name

                async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
                    response = await client.get(download_url)
                    response.raise_for_status()

                    with open(final_path, "wb") as f:
                        f.write(response.content)

                if variable_name:
                    context.set_variable(variable_name, str(final_path))

                return ModuleResult(
                    success=True,
                    message=f"已下载文件: {final_path}",
                    data=str(final_path),
                )

            else:
                if not trigger_selector:
                    return ModuleResult(success=False, error="触发元素选择器不能为空")

                if context.page is None:
                    return ModuleResult(success=False, error="没有打开的页面")

                await context.switch_to_latest_page()

                async with context.page.expect_download() as download_info:
                    await context.page.click(trigger_selector)

                download = await download_info.value

                if save_path:
                    Path(save_path).mkdir(parents=True, exist_ok=True)
                    if file_name:
                        final_path = Path(save_path) / file_name
                    else:
                        final_path = Path(save_path) / download.suggested_filename
                    await download.save_as(str(final_path))
                else:
                    final_path = await download.path()

                if variable_name:
                    context.set_variable(variable_name, str(final_path))

                return ModuleResult(
                    success=True,
                    message=f"已下载文件: {final_path}",
                    data=str(final_path),
                )

        except Exception as e:
            return ModuleResult(success=False, error=f"下载文件失败: {str(e)}")

@register_executor
class SaveImageExecutor(ModuleExecutor):
    """保存图片模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "save_image"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        selector = context.resolve_value(config.get('selector', ''))
        save_path = context.resolve_value(config.get('savePath', ''))
        variable_name = config.get('variableName', '')
        
        if not selector:
            return ModuleResult(success=False, error="选择器不能为空")
        
        if context.page is None:
            return ModuleResult(success=False, error="没有打开的页面")
        
        try:
            await context.switch_to_latest_page()
            
            element = context.page.locator(escape_css_selector(selector))
            src = await element.get_attribute('src')
            
            if src and src.startswith('data:'):
                header, data = src.split(',', 1)
                image_data = base64.b64decode(data)
            else:
                image_data = await element.screenshot()
            
            if save_path:
                Path(save_path).parent.mkdir(parents=True, exist_ok=True)
                with open(save_path, 'wb') as f:
                    f.write(image_data)
                final_path = save_path
            else:
                import tempfile
                with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
                    f.write(image_data)
                    final_path = f.name
            
            if variable_name:
                context.set_variable(variable_name, final_path)
            
            return ModuleResult(success=True, message=f"已保存图片: {final_path}", data=final_path)
        
        except Exception as e:
            return ModuleResult(success=False, error=f"保存图片失败: {str(e)}")

@register_executor
class GetChildElementsExecutor(ModuleExecutor):
    """获取子元素列表模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "get_child_elements"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        parent_selector = context.resolve_value(config.get('parentSelector', ''))
        variable_name = config.get('variableName', '')
        child_selector = context.resolve_value(config.get('childSelector', '*'))  # 默认获取所有子元素
        # 如果child_selector为空字符串，使用默认值'*'
        if not child_selector:
            child_selector = '*'
        
        if not parent_selector:
            return ModuleResult(success=False, error="父元素选择器不能为空")
        
        if not variable_name:
            return ModuleResult(success=False, error="变量名不能为空")
        
        if context.page is None:
            return ModuleResult(success=False, error="没有打开的页面")
        
        try:
            await context.switch_to_latest_page()
            
            # 等待父元素出现
            await context.page.wait_for_selector(escape_css_selector(parent_selector), state='attached')
            
            # 使用JavaScript获取子元素的选择器
            child_selectors = await context.page.evaluate("""
                (args) => {
                    const { parentSelector, childSelector } = args;
                    const parent = document.querySelector(parentSelector);
                    if (!parent) return [];
                    
                    // 获取直接子元素
                    const children = childSelector === '*' 
                        ? Array.from(parent.children)
                        : Array.from(parent.querySelectorAll(':scope > ' + childSelector));
                    
                    // 获取父元素的所有子元素（用于计算正确的nth-child）
                    const allChildren = Array.from(parent.children);
                    
                    // 为每个子元素生成唯一的选择器
                    return children.map((child) => {
                        // 尝试使用ID
                        if (child.id) {
                            return '#' + child.id;
                        }
                        
                        // 尝试使用class（检查在父元素下是否唯一）
                        if (child.className && typeof child.className === 'string') {
                            const classes = child.className.trim().split(/\\s+/).filter(c => c);
                            if (classes.length > 0) {
                                const classSelector = '.' + classes.join('.');
                                // 检查在父元素的直接子元素中是否唯一
                                const matches = parent.querySelectorAll(':scope > ' + classSelector);
                                if (matches.length === 1) {
                                    return parentSelector + ' > ' + classSelector;
                                }
                            }
                        }
                        
                        // 使用nth-child（基于在所有子元素中的实际位置）
                        const actualIndex = allChildren.indexOf(child);
                        const tagName = child.tagName.toLowerCase();
                        return parentSelector + ' > ' + tagName + ':nth-child(' + (actualIndex + 1) + ')';
                    });
                }
            """, {
                'parentSelector': parent_selector,
                'childSelector': child_selector
            })
            
            # 保存到变量
            context.set_variable(variable_name, child_selectors)
            
            return ModuleResult(
                success=True, 
                message=f"已获取 {len(child_selectors)} 个子元素，保存到变量 {variable_name}",
                data=child_selectors
            )
        
        except Exception as e:
            return ModuleResult(success=False, error=f"获取子元素列表失败: {str(e)}")

@register_executor
class GetSiblingElementsExecutor(ModuleExecutor):
    """获取兄弟元素列表模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "get_sibling_elements"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        element_selector = context.resolve_value(config.get('elementSelector', ''))
        variable_name = config.get('variableName', '')
        include_self = config.get('includeSelf', False)  # 是否包含自身
        sibling_type = context.resolve_value(config.get('siblingType', 'all'))  # all, previous, next
        # 如果sibling_type为空字符串，使用默认值'all'
        if not sibling_type:
            sibling_type = 'all'
        
        if not element_selector:
            return ModuleResult(success=False, error="元素选择器不能为空")
        
        if not variable_name:
            return ModuleResult(success=False, error="变量名不能为空")
        
        if context.page is None:
            return ModuleResult(success=False, error="没有打开的页面")
        
        try:
            await context.switch_to_latest_page()
            
            # 等待元素出现
            await context.page.wait_for_selector(escape_css_selector(element_selector), state='attached')
            
            # 使用JavaScript获取兄弟元素的选择器
            sibling_selectors = await context.page.evaluate("""
                (args) => {
                    const { elementSelector, includeSelf, siblingType } = args;
                    const element = document.querySelector(elementSelector);
                    if (!element || !element.parentElement) return [];
                    
                    const parent = element.parentElement;
                    const allSiblings = Array.from(parent.children);
                    const elementIndex = allSiblings.indexOf(element);
                    
                    let siblings = [];
                    if (siblingType === 'previous') {
                        // 只获取前面的兄弟元素
                        siblings = allSiblings.slice(0, elementIndex);
                    } else if (siblingType === 'next') {
                        // 只获取后面的兄弟元素
                        siblings = allSiblings.slice(elementIndex + 1);
                    } else {
                        // 获取所有兄弟元素
                        siblings = allSiblings.filter((sibling, index) => 
                            includeSelf ? true : index !== elementIndex
                        );
                    }
                    
                    // 为每个兄弟元素生成唯一的选择器
                    return siblings.map((sibling) => {
                        // 尝试使用ID
                        if (sibling.id) {
                            return '#' + sibling.id;
                        }
                        
                        // 尝试使用class（检查在整个文档中是否唯一）
                        if (sibling.className && typeof sibling.className === 'string') {
                            const classes = sibling.className.trim().split(/\\s+/).filter(c => c);
                            if (classes.length > 0) {
                                const classSelector = '.' + classes.join('.');
                                // 检查在整个文档中是否唯一
                                const matches = document.querySelectorAll(classSelector);
                                if (matches.length === 1) {
                                    return classSelector;
                                }
                                // 如果不唯一，尝试在父元素下是否唯一
                                const parentMatches = parent.querySelectorAll(':scope > ' + classSelector);
                                if (parentMatches.length === 1) {
                                    // 生成父元素选择器
                                    let parentSelector = '';
                                    if (parent.id) {
                                        parentSelector = '#' + parent.id;
                                    } else if (parent.className && typeof parent.className === 'string') {
                                        const parentClasses = parent.className.trim().split(/\\s+/).filter(c => c);
                                        if (parentClasses.length > 0) {
                                            parentSelector = '.' + parentClasses.join('.');
                                        }
                                    }
                                    if (parentSelector) {
                                        return parentSelector + ' > ' + classSelector;
                                    }
                                }
                            }
                        }
                        
                        // 使用nth-child（基于在所有子元素中的实际位置）
                        const actualIndex = allSiblings.indexOf(sibling);
                        const tagName = sibling.tagName.toLowerCase();
                        
                        // 生成父元素的选择器
                        let parentSelector = '';
                        if (parent.id) {
                            parentSelector = '#' + parent.id;
                        } else if (parent.className && typeof parent.className === 'string') {
                            const classes = parent.className.trim().split(/\\s+/).filter(c => c);
                            if (classes.length > 0) {
                                parentSelector = '.' + classes.join('.');
                            }
                        }
                        
                        if (parentSelector) {
                            return parentSelector + ' > ' + tagName + ':nth-child(' + (actualIndex + 1) + ')';
                        } else {
                            // 如果父元素没有ID或class，尝试生成更完整的路径
                            const parentTagName = parent.tagName.toLowerCase();
                            return parentTagName + ' > ' + tagName + ':nth-child(' + (actualIndex + 1) + ')';
                        }
                    });
                }
            """, {
                'elementSelector': element_selector,
                'includeSelf': include_self,
                'siblingType': sibling_type
            })
            
            # 保存到变量
            context.set_variable(variable_name, sibling_selectors)
            
            type_desc = {
                'all': '所有',
                'previous': '前面的',
                'next': '后面的'
            }.get(sibling_type, '所有')
            
            return ModuleResult(
                success=True, 
                message=f"已获取 {len(sibling_selectors)} 个{type_desc}兄弟元素，保存到变量 {variable_name}",
                data=sibling_selectors
            )
        
        except Exception as e:
            return ModuleResult(success=False, error=f"获取兄弟元素列表失败: {str(e)}")


@register_executor
class ElementExistsExecutor(ModuleExecutor):
    """元素存在判断模块执行器 - 判断元素是否存在于页面中,类似条件判断模块"""

    @property
    def module_type(self) -> str:
        return "element_exists"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        selector = context.resolve_value(config.get("selector", ""))
        
        if not selector:
            return ModuleResult(success=False, error="元素选择器不能为空")
        
        if context.page is None:
            return ModuleResult(success=False, error="没有打开的页面，请先使用'打开网页'模块")
        
        try:
            await context.switch_to_latest_page()
            
            # 检查元素是否存在
            element = context.page.locator(escape_css_selector(selector))
            count = await element.count()
            exists = count > 0
            
            # 根据是否存在返回不同的分支
            branch = 'true' if exists else 'false'
            
            if exists:
                message = f"元素存在（共找到 {count} 个匹配元素）"
                data = {"exists": True, "count": count}
            else:
                message = "元素不存在"
                data = {"exists": False, "count": 0}
            
            return ModuleResult(
                success=True,
                message=message,
                branch=branch,
                data=data
            )
            
        except Exception as e:
            # 出错时返回false分支
            return ModuleResult(
                success=True,
                message=f"元素不存在（检查时出错: {str(e)}）",
                branch='false',
                data={"exists": False, "error": str(e)}
            )


@register_executor
class ElementVisibleExecutor(ModuleExecutor):
    """元素可见判断模块执行器 - 判断元素是否可见,类似条件判断模块"""

    @property
    def module_type(self) -> str:
        return "element_visible"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        selector = context.resolve_value(config.get("selector", ""))
        
        if not selector:
            return ModuleResult(success=False, error="元素选择器不能为空")
        
        if context.page is None:
            return ModuleResult(success=False, error="没有打开的页面，请先使用'打开网页'模块")
        
        try:
            await context.switch_to_latest_page()
            
            # 检查元素是否存在且可见
            element = context.page.locator(escape_css_selector(selector))
            count = await element.count()
            
            if count > 0:
                # 元素存在，检查第一个元素是否可见
                visible = await element.first.is_visible()
            else:
                # 元素不存在，视为不可见
                visible = False
            
            # 根据是否可见返回不同的分支
            branch = 'true' if visible else 'false'
            
            if visible:
                message = f"元素可见（共找到 {count} 个匹配元素）"
                data = {"visible": True, "exists": True, "count": count}
            elif count > 0:
                message = f"元素存在但不可见（共找到 {count} 个匹配元素）"
                data = {"visible": False, "exists": True, "count": count}
            else:
                message = "元素不存在"
                data = {"visible": False, "exists": False, "count": 0}
            
            return ModuleResult(
                success=True,
                message=message,
                branch=branch,
                data=data
            )
            
        except Exception as e:
            # 出错时返回false分支
            return ModuleResult(
                success=True,
                message=f"元素不可见（检查时出错: {str(e)}）",
                branch='false',
                data={"visible": False, "error": str(e)}
            )
