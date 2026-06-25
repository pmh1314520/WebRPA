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
import os
import asyncio

# 模块级 DrissionPage 页面单例
_dp_page = None
# 标记本次进程内是否用过 DP（供工作流结束时自动清理判断）
_dp_used = False


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


# 常见浏览器可执行文件位置（优先 Edge —— 与 WebRPA 默认浏览器一致；其次 Chrome）
_EDGE_PATHS = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
]
_CHROME_PATHS = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
]


def _resolve_browser_path(prefer: str = "", explicit_path: str = "") -> str:
    """解析 DrissionPage 要驱动的浏览器可执行文件路径。

    优先级：模块显式配置 > WebRPA 全局浏览器配置(executablePath) >
    按浏览器类型(edge/chrome)在标准安装位置自动探测 > 空串(交给 DrissionPage 自行探测)。

    DrissionPage 同样基于 Chromium 内核驱动，Edge / Chrome 都支持；这里默认优先 Edge，
    与 WebRPA 其它模块（默认 msedge）保持一致，避免“只有 Edge 没装 Chrome”时 DP 起不来。
    """
    # 1) 模块显式配置的浏览器路径
    p = (explicit_path or "").strip().strip('"')
    if p and os.path.isfile(p):
        return p

    # 2) 读取 WebRPA 全局浏览器配置（type / executablePath）
    cfg_type = ""
    try:
        from app.services import browser_manager as _bm
        cfg = _bm.get_current_browser_config() if hasattr(_bm, "get_current_browser_config") else None
        if cfg:
            cfg_path = str(cfg.get("executablePath") or "").strip().strip('"')
            if cfg_path and os.path.isfile(cfg_path):
                return cfg_path
            cfg_type = str(cfg.get("type") or "").lower()
    except Exception:
        pass

    # 3) 按浏览器类型在标准位置探测
    want = (prefer or cfg_type or "").lower()
    if "chrome" in want and "msedge" not in want:
        order = _CHROME_PATHS + _EDGE_PATHS
    else:
        # 默认优先 Edge（含 msedge / edge / 空）
        order = _EDGE_PATHS + _CHROME_PATHS
    for cand in order:
        if os.path.isfile(cand):
            return cand

    # 4) 交给 DrissionPage 自行探测
    return ""


def _is_alive(page) -> bool:
    """检测 DrissionPage 页面/浏览器是否仍存活（被风控关掉、用户手动关、崩溃等会失活）。"""
    if page is None:
        return False
    try:
        st = getattr(page, "states", None)
        if st is not None and hasattr(st, "is_alive"):
            return bool(st.is_alive)
    except Exception:
        return False
    try:
        # 触发一次 CDP 调用，浏览器已退出会抛异常
        _ = page.tab_ids
        return True
    except Exception:
        return False


def _build_options(headless: bool, browser_path: str, viewport: str = "",
                   user_data_dir: str = ""):
    """构建 ChromiumOptions：设置浏览器路径(Edge/Chrome)、无头、窗口尺寸、独立端口与数据目录。"""
    _, ChromiumOptions = _import_dp()
    co = ChromiumOptions()
    if browser_path:
        for setter in ("set_browser_path", "set_paths"):
            fn = getattr(co, setter, None)
            if callable(fn):
                try:
                    fn(browser_path)
                    break
                except Exception:
                    pass
    if headless:
        try:
            co.headless(True)
        except Exception:
            pass
    # 每个会话用自动空闲端口，避免“第二次运行端口被上次残留进程占用”导致接管异常
    try:
        if hasattr(co, "auto_port"):
            co.auto_port(True)
    except Exception:
        pass
    # 视口尺寸（形如 1280,800 或 1280x800）
    vp = (viewport or "").strip().replace("x", ",").replace("×", ",")
    if vp and "," in vp:
        try:
            w, h = [int(float(x)) for x in vp.split(",")[:2]]
            if w > 0 and h > 0:
                co.set_argument(f"--window-size={w},{h}")
        except Exception:
            pass
    # 独立用户数据目录（隔离登录态/缓存，避免与系统浏览器实例抢占同一 profile）
    udd = (user_data_dir or "").strip().strip('"')
    if udd:
        for setter in ("set_user_data_path", "set_user_dir"):
            fn = getattr(co, setter, None)
            if callable(fn):
                try:
                    fn(udd)
                    break
                except Exception:
                    pass
    return co


def _get_page(create: bool = False, headless: bool = False, browser_path: str = "",
              reuse: bool = True, viewport: str = "", user_data_dir: str = ""):
    """获取/创建 DrissionPage 页面单例。

    - reuse=True 且已有存活页面 → 复用；
    - 已有页面但已失活（被关/崩溃）→ 先彻底关闭再重建（修复“第二次运行复用死页面”）；
    - reuse=False → 强制关闭旧页面后重建一个干净会话。
    """
    global _dp_page, _dp_used
    if _dp_page is not None:
        if reuse and _is_alive(_dp_page):
            return _dp_page
        # 失活或要求不复用：清掉旧的再重建
        _close_page()
    if not create:
        return None
    ChromiumPage, _ = _import_dp()
    co = _build_options(headless, browser_path, viewport, user_data_dir)
    _dp_page = ChromiumPage(co)
    _dp_used = True
    return _dp_page


def _close_page():
    global _dp_page
    if _dp_page is not None:
        try:
            _dp_page.quit()
        except Exception:
            pass
        _dp_page = None


def cleanup_dp(force: bool = False) -> bool:
    """工作流结束时调用：若本进程用过 DP 浏览器，则自动关闭，避免残留到下次运行复用脏状态。

    返回是否执行了关闭。force=True 时无论 _dp_used 都尝试关闭。
    """
    global _dp_used
    if _dp_page is None and not force:
        _dp_used = False
        return False
    if not (_dp_used or force):
        return False
    _close_page()
    _dp_used = False
    return True


@register_executor
class DpOpenPageExecutor(ModuleExecutor):
    """DrissionPage：打开/跳转页面（绕过部分反自动化检测）"""

    @property
    def module_type(self) -> str:
        return "dp_open_page"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        url = context.resolve_value(config.get('url', ''))
        headless = str(context.resolve_value(config.get('headless', 'false'))).lower() in ('true', '1', 'yes')
        # 浏览器选择：browserType(edge/chrome) + browserPath(可选)；默认跟随 WebRPA(优先 Edge)
        browser_type = str(context.resolve_value(config.get('browserType', '') or config.get('browser', ''))).lower()
        browser_path = str(context.resolve_value(config.get('browserPath', '') or config.get('executablePath', '')))
        # 复用浏览器：默认 true（同一工作流内多个 dp_ 节点复用同一会话）；采集类可设 false 每次开干净会话
        reuse = str(context.resolve_value(config.get('reuseBrowser', 'true'))).lower() in ('true', '1', 'yes')
        viewport = str(context.resolve_value(config.get('viewport', '') or ''))
        user_data_dir = str(context.resolve_value(config.get('userDataDir', '') or ''))
        wait_until = str(context.resolve_value(config.get('waitUntil', '') or '')).strip().lower()
        retry_count = to_int(config.get('retryCount', 0), 0, context)
        out_var = config.get('outputVariable', '') or config.get('pageVariable', '')
        if not url:
            return ModuleResult(success=False, error="URL 不能为空")
        try:
            resolved_path = _resolve_browser_path(browser_type, browser_path)

            def _do():
                page = _get_page(create=True, headless=headless, browser_path=resolved_path,
                                 reuse=reuse, viewport=viewport, user_data_dir=user_data_dir)
                last_err = None
                for _ in range(max(1, retry_count + 1)):
                    try:
                        page.get(url)
                        last_err = None
                        break
                    except Exception as ex:
                        last_err = ex
                if last_err is not None:
                    raise last_err
                # networkidle 等加载策略：DrissionPage 用 wait.doc_loaded / 简单等待近似
                if wait_until in ('networkidle', 'load', 'domcontentloaded'):
                    try:
                        page.wait.doc_loaded()
                    except Exception:
                        pass
                # 用哪个浏览器（便于排查“到底用的 Edge 还是 Chrome”）
                engine = "Edge" if "edge" in (resolved_path or "").lower() else (
                    "Chrome" if "chrome" in (resolved_path or "").lower() else "默认Chromium")
                return page.title, page.url, engine
            title, cur_url, engine = await asyncio.to_thread(_do)
            # 真正把页面信息写入 outputVariable/pageVariable，下游 {dp_page} 引用有值可用
            if out_var:
                context.set_variable(out_var, {"url": cur_url, "title": title, "engine": engine})
            return ModuleResult(success=True, message=f"已打开(DrissionPage·{engine}): {title or url}")
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
