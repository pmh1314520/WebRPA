"""DrissionPage 高级网页自动化执行器

DrissionPage 以"控制真实浏览器内核 + 收发包"的方式工作，对很多检测自动化（webdriver 特征）
的网站更隐蔽、更不易被拦截，适合常规 Playwright 被风控拦住的场景。

设计：
- 维护一个模块级 ChromiumPage 单例（dp_open_page 创建/复用，dp_close 关闭）。
- DrissionPage 是同步库，这里用 asyncio.to_thread 包一层，避免阻塞事件循环。
- 未安装 DrissionPage 时，所有模块返回友好的安装提示而不是崩溃。
- 定位符直接透传 DrissionPage 语法：'#id' / '.class' / 'tag:xx' / 'text:xx' / 'xpath://...' / 'css:...'
"""
from .base import ModuleExecutor, ExecutionContext, ModuleResult, register_executor
from .type_utils import to_int, to_float
import asyncio

# 模块级 DrissionPage 页面单例
_dp_page = None


def _import_dp():
    """惰性导入 DrissionPage，未安装时抛出带安装指引的异常"""
    try:
        from DrissionPage import ChromiumPage, ChromiumOptions  # type: ignore
        return ChromiumPage, ChromiumOptions
    except Exception:
        raise RuntimeError(
            "未安装 DrissionPage。请在 WebRPA 目录下执行："
            "Python313\\python.exe -m pip install DrissionPage"
        )


def _get_page(create: bool = False, headless: bool = False):
    global _dp_page
    if _dp_page is not None:
        return _dp_page
    if not create:
        return None
    ChromiumPage, ChromiumOptions = _import_dp()
    co = ChromiumOptions()
    if headless:
        try:
            co.headless(True)
        except Exception:
            pass
    _dp_page = ChromiumPage(co)
    return _dp_page


def _close_page():
    global _dp_page
    if _dp_page is not None:
        try:
            _dp_page.quit()
        except Exception:
            pass
        _dp_page = None


@register_executor
class DpOpenPageExecutor(ModuleExecutor):
    """DrissionPage：打开/跳转页面（绕过部分反自动化检测）"""

    @property
    def module_type(self) -> str:
        return "dp_open_page"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        url = context.resolve_value(config.get('url', ''))
        headless = str(context.resolve_value(config.get('headless', 'false'))).lower() in ('true', '1', 'yes')
        if not url:
            return ModuleResult(success=False, error="URL 不能为空")
        try:
            def _do():
                page = _get_page(create=True, headless=headless)
                page.get(url)
                return page.title
            title = await asyncio.to_thread(_do)
            return ModuleResult(success=True, message=f"已打开(DrissionPage): {title or url}")
        except Exception as e:
            return ModuleResult(success=False, error=f"DrissionPage 打开页面失败: {e}")


@register_executor
class DpClickExecutor(ModuleExecutor):
    """DrissionPage：点击元素"""

    @property
    def module_type(self) -> str:
        return "dp_click"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        locator = context.resolve_value(config.get('locator', ''))
        timeout = to_float(config.get('timeout', 10), 10, context)
        if not locator:
            return ModuleResult(success=False, error="定位符不能为空")
        try:
            def _do():
                page = _get_page()
                if page is None:
                    raise RuntimeError("尚未打开页面，请先用 dp_open_page")
                ele = page.ele(locator, timeout=timeout)
                if not ele:
                    raise RuntimeError(f"未找到元素: {locator}")
                ele.click()
            await asyncio.to_thread(_do)
            return ModuleResult(success=True, message=f"已点击: {locator}")
        except Exception as e:
            return ModuleResult(success=False, error=f"DrissionPage 点击失败: {e}")


@register_executor
class DpInputExecutor(ModuleExecutor):
    """DrissionPage：输入文本"""

    @property
    def module_type(self) -> str:
        return "dp_input"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        locator = context.resolve_value(config.get('locator', ''))
        text = context.resolve_value(config.get('text', ''))
        clear = str(context.resolve_value(config.get('clear', 'true'))).lower() in ('true', '1', 'yes')
        if not locator:
            return ModuleResult(success=False, error="定位符不能为空")
        try:
            def _do():
                page = _get_page()
                if page is None:
                    raise RuntimeError("尚未打开页面，请先用 dp_open_page")
                ele = page.ele(locator, timeout=10)
                if not ele:
                    raise RuntimeError(f"未找到元素: {locator}")
                if clear:
                    try:
                        ele.clear()
                    except Exception:
                        pass
                ele.input(str(text))
            await asyncio.to_thread(_do)
            return ModuleResult(success=True, message=f"已输入到: {locator}")
        except Exception as e:
            return ModuleResult(success=False, error=f"DrissionPage 输入失败: {e}")


@register_executor
class DpGetTextExecutor(ModuleExecutor):
    """DrissionPage：获取元素文本，存入变量"""

    @property
    def module_type(self) -> str:
        return "dp_get_text"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        locator = context.resolve_value(config.get('locator', ''))
        variable_name = config.get('variableName', '')
        if not locator:
            return ModuleResult(success=False, error="定位符不能为空")
        try:
            def _do():
                page = _get_page()
                if page is None:
                    raise RuntimeError("尚未打开页面，请先用 dp_open_page")
                ele = page.ele(locator, timeout=10)
                if not ele:
                    raise RuntimeError(f"未找到元素: {locator}")
                return ele.text
            text = await asyncio.to_thread(_do)
            if variable_name:
                context.set_variable(variable_name, text)
            return ModuleResult(success=True, message=f"已获取文本: {str(text)[:50]}", data=text)
        except Exception as e:
            return ModuleResult(success=False, error=f"DrissionPage 取文本失败: {e}")


@register_executor
class DpGetHtmlExecutor(ModuleExecutor):
    """DrissionPage：获取当前页面 HTML，存入变量"""

    @property
    def module_type(self) -> str:
        return "dp_get_html"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        variable_name = config.get('variableName', '')
        try:
            def _do():
                page = _get_page()
                if page is None:
                    raise RuntimeError("尚未打开页面，请先用 dp_open_page")
                return page.html
            html = await asyncio.to_thread(_do)
            if variable_name:
                context.set_variable(variable_name, html)
            return ModuleResult(success=True, message=f"已获取页面 HTML（{len(html)} 字符）", data=html)
        except Exception as e:
            return ModuleResult(success=False, error=f"DrissionPage 取 HTML 失败: {e}")


@register_executor
class DpRunJsExecutor(ModuleExecutor):
    """DrissionPage：执行 JavaScript，结果存入变量"""

    @property
    def module_type(self) -> str:
        return "dp_run_js"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        script = context.resolve_value(config.get('script', ''))
        variable_name = config.get('variableName', '')
        if not script:
            return ModuleResult(success=False, error="脚本不能为空")
        try:
            def _do():
                page = _get_page()
                if page is None:
                    raise RuntimeError("尚未打开页面，请先用 dp_open_page")
                return page.run_js(script)
            result = await asyncio.to_thread(_do)
            if variable_name:
                context.set_variable(variable_name, result)
            return ModuleResult(success=True, message="已执行 JS", data=result)
        except Exception as e:
            return ModuleResult(success=False, error=f"DrissionPage 执行 JS 失败: {e}")


@register_executor
class DpWaitElementExecutor(ModuleExecutor):
    """DrissionPage：等待元素出现"""

    @property
    def module_type(self) -> str:
        return "dp_wait_element"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        locator = context.resolve_value(config.get('locator', ''))
        timeout = to_float(config.get('timeout', 10), 10, context)
        if not locator:
            return ModuleResult(success=False, error="定位符不能为空")
        try:
            def _do():
                page = _get_page()
                if page is None:
                    raise RuntimeError("尚未打开页面，请先用 dp_open_page")
                return bool(page.wait.ele_displayed(locator, timeout=timeout))
            ok = await asyncio.to_thread(_do)
            if ok:
                return ModuleResult(success=True, message=f"元素已出现: {locator}")
            return ModuleResult(success=False, error=f"等待超时，元素未出现: {locator}")
        except Exception as e:
            return ModuleResult(success=False, error=f"DrissionPage 等待元素失败: {e}")


@register_executor
class DpScrollExecutor(ModuleExecutor):
    """DrissionPage：滚动页面（到底部/顶部/指定像素）"""

    @property
    def module_type(self) -> str:
        return "dp_scroll"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        direction = context.resolve_value(config.get('direction', 'bottom'))
        pixels = to_int(config.get('pixels', 500), 500, context)
        try:
            def _do():
                page = _get_page()
                if page is None:
                    raise RuntimeError("尚未打开页面，请先用 dp_open_page")
                if direction == 'bottom':
                    page.scroll.to_bottom()
                elif direction == 'top':
                    page.scroll.to_top()
                elif direction == 'down':
                    page.scroll.down(pixels)
                elif direction == 'up':
                    page.scroll.up(pixels)
            await asyncio.to_thread(_do)
            return ModuleResult(success=True, message=f"已滚动: {direction}")
        except Exception as e:
            return ModuleResult(success=False, error=f"DrissionPage 滚动失败: {e}")


@register_executor
class DpCloseExecutor(ModuleExecutor):
    """DrissionPage：关闭浏览器"""

    @property
    def module_type(self) -> str:
        return "dp_close"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            await asyncio.to_thread(_close_page)
            return ModuleResult(success=True, message="已关闭 DrissionPage 浏览器")
        except Exception as e:
            return ModuleResult(success=False, error=f"DrissionPage 关闭失败: {e}")
