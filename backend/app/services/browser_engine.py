"""浏览器引擎 - 在主进程中运行 Playwright，让工作流执行器可以直接共享 context"""
import asyncio
import sys
from pathlib import Path
from typing import Optional

from playwright.async_api import async_playwright, BrowserContext, Page, Playwright

# ===================== 共享状态 =====================
_playwright: Optional[Playwright] = None
_context: Optional[BrowserContext] = None
_page: Optional[Page] = None         # 当前活跃页面（随时更新）
_is_open: bool = False
_browser_type: str = 'msedge'
_executable_path: str = ''
_user_data_dir: Optional[str] = None
_picker_active: bool = False
# 启动/停止操作的并发锁（首次 await 时按需初始化，避免事件循环问题）
_engine_lock: Optional[asyncio.Lock] = None


def _get_engine_lock() -> asyncio.Lock:
    global _engine_lock
    if _engine_lock is None:
        _engine_lock = asyncio.Lock()
    return _engine_lock

# 篡改猴脚本加载
def _load_userscript():
    script_path = Path(__file__).parent.parent.parent / "browser_plugin" / "智能元素定位助手.user.js"
    if script_path.exists():
        try:
            with open(script_path, 'r', encoding='utf-8') as f:
                content = f.read()
            lines = content.split('\n')
            script_lines = []
            in_header = False
            for line in lines:
                if line.strip().startswith('// ==UserScript=='):
                    in_header = True
                    continue
                if line.strip().startswith('// ==/UserScript=='):
                    in_header = False
                    continue
                if not in_header:
                    script_lines.append(line)
            return '\n'.join(script_lines)
        except Exception as e:
            print(f"[BrowserEngine] 加载篡改猴脚本失败: {e}")
    return None

USERSCRIPT = _load_userscript()

# ===================== 内部辅助 =====================
def _get_user_data_dir(browser_type: str, custom_dir: Optional[str] = None) -> str:
    if custom_dir:
        p = Path(custom_dir) / browser_type
    else:
        p = Path(__file__).parent.parent.parent / "browser_data" / browser_type
    p.mkdir(parents=True, exist_ok=True)
    # 清理锁文件
    lock = p / "SingletonLock"
    if lock.exists():
        try:
            lock.unlink()
        except Exception:
            pass
    return str(p)


async def bundled_chromium_status() -> dict:
    """检测 Playwright 内置 Chromium 是否可用（用于前端提示扩展兜底能否生效）。

    返回 {"available": bool, "path": str}。复用运行中的 playwright，否则临时启动一次再关闭。
    """
    global _playwright
    pw = _playwright
    started = False
    try:
        if pw is None:
            pw = await async_playwright().start()
            started = True
        ep = ''
        try:
            ep = pw.chromium.executable_path or ''
        except Exception:
            ep = ''
        available = bool(ep) and Path(ep).exists()
        return {"available": available, "path": ep}
    except Exception as e:
        return {"available": False, "path": "", "error": str(e)}
    finally:
        if started and pw is not None:
            try:
                await pw.stop()
            except Exception:
                pass


def build_extension_args(extension_dirs: str = '') -> list:
    """把"已解压扩展目录"（每行一个）转换为 Chromium 启动参数。

    - 仅纳入真实存在的目录（校验避免坏路径导致浏览器直接启动失败）；
    - 用逗号拼接多个目录，同时给出 --load-extension 与 --disable-extensions-except。
    返回空列表表示无有效扩展目录。
    """
    if not extension_dirs:
        return []
    valid = []
    for d in extension_dirs.split('\n'):
        d = d.strip().strip('"')
        if not d:
            continue
        try:
            if Path(d).is_dir():
                valid.append(d)
            else:
                print(f"[BrowserEngine] 扩展目录不存在，已跳过: {d}")
        except Exception:
            print(f"[BrowserEngine] 扩展目录无效，已跳过: {d}")
    if not valid:
        return []
    joined = ','.join(valid)
    return [f'--disable-extensions-except={joined}', f'--load-extension={joined}']


def _build_launch_args(custom_args_str: str = '', extension_dirs: str = '') -> list:
    """构造 Playwright 启动参数列表
    
    默认参数 + 扩展加载参数 + 用户自定义参数合并；用户参数若与默认重复以用户为准。

    extension_dirs：需加载的"已解压扩展目录"，每行一个。非空时自动追加
    --load-extension / --disable-extensions-except（仅在有头持久化上下文下有效）。
    """
    default_args = [
        '--disable-blink-features=AutomationControlled',
        '--start-maximized',
        '--ignore-certificate-errors',
        '--ignore-ssl-errors',
        '--disable-features=IsolateOrigins,site-per-process',
        '--allow-running-insecure-content',
        '--disable-infobars',
        '--disable-notifications',
    ]

    # 扩展加载参数（含目录存在性校验，避免坏路径导致浏览器起不来）
    default_args.extend(build_extension_args(extension_dirs))

    if not custom_args_str:
        return default_args

    user_args = [a.strip() for a in custom_args_str.split('\n') if a.strip()]
    if not user_args:
        return default_args

    # 用户参数中提取 flag 名（取 = 之前的部分）
    def _flag_name(arg: str) -> str:
        return arg.split('=', 1)[0].strip()

    user_flag_names = {_flag_name(a) for a in user_args}
    # 默认参数若被用户覆写则跳过
    merged = [a for a in default_args if _flag_name(a) not in user_flag_names]
    merged.extend(user_args)
    return merged


async def _inject_userscript(pg: Page):
    if USERSCRIPT:
        try:
            await pg.add_init_script(USERSCRIPT)
        except Exception as e:
            print(f"[BrowserEngine] 注入篡改猴脚本失败: {e}")


async def _on_new_page(pg: Page):
    """新页面创建时自动注入脚本"""
    await _inject_userscript(pg)
    pg.on("load", lambda: asyncio.create_task(_reinject_on_load(pg)))


async def _reinject_on_load(pg: Page):
    if USERSCRIPT:
        try:
            await pg.evaluate(USERSCRIPT)
        except Exception:
            pass
    # 元素选择器激活时，页面加载/跳转后重新注入选择器脚本，实现“覆盖层跨页面/跨标签持续跟随”。
    # 复用本模块每次 load 都会触发的成熟重注入路径（智能定位助手脚本同理靠它跨页跟随）。
    try:
        from app.services import browser_manager as _bm
        if _bm.is_picker_active() and getattr(_bm, "PICKER_SCRIPT", ""):
            await pg.evaluate("() => { window.__elementPickerDisabled = false; }")
            await pg.evaluate(_bm.PICKER_SCRIPT)
    except Exception:
        pass


def _on_browser_closed():
    """浏览器被手动关闭时的回调
    
    这是 sync 回调，由 Playwright 在浏览器关闭事件触发，
    可能与 start/stop 并发，但因 Python GIL 保证单条赋值原子性，
    此处仅做状态清理（不做 await 操作）。
    """
    global _playwright, _context, _page, _is_open, _picker_active
    
    print("[BrowserEngine] 检测到浏览器被手动关闭，清理状态")
    
    # 仅当当前确实"已开"才清理，避免 race：
    # 1) start 已经走完成功设置了 _is_open=True
    # 2) close 事件触发到这里
    # 3) 我们清理状态
    # 这里的清理是幂等的，不影响后续的 start
    if _is_open:
        _is_open = False
    _picker_active = False
    _context = None
    _page = None
    
    # 注意：不要在这里调用 _playwright.stop()，因为浏览器已经关闭了
    # 只需要清理状态即可


# ===================== 公开 API =====================

def is_open() -> bool:
    """浏览器引擎是否已启动"""
    global _is_open, _context, _page
    
    if not _is_open or _context is None:
        return False
    
    # 检查 context 是否还有效
    try:
        # 尝试访问 pages 属性来验证 context 是否还活着
        _ = _context.pages
        return True
    except Exception as e:
        # 如果访问失败，说明浏览器已经被关闭了
        print(f"[BrowserEngine] 检测到浏览器已失效: {e}")
        _is_open = False
        _context = None
        _page = None
        return False


def get_context() -> Optional[BrowserContext]:
    """获取共享的 BrowserContext（可直接用于工作流执行）"""
    return _context


def get_page() -> Optional[Page]:
    """获取当前活跃页面"""
    global _page, _is_open, _context
    
    if _context is None:
        return None
    
    try:
        pages = _context.pages
        if not pages:
            return None
        # 优先返回有实际内容的页面
        real = [p for p in pages if p.url not in ('about:blank', 'chrome://newtab/', '')]
        if real:
            _page = real[-1]
        elif pages:
            _page = pages[-1]
        return _page
    except Exception as e:
        # 如果访问失败，说明浏览器已经被关闭了
        print(f"[BrowserEngine] 获取页面失败，浏览器可能已关闭: {e}")
        _is_open = False
        _context = None
        _page = None
        return None


def get_config() -> dict:
    return {
        'type': _browser_type,
        'executablePath': _executable_path,
        'userDataDir': _user_data_dir,
    }


async def start(
    browser_type: str = 'msedge',
    executable_path: Optional[str] = None,
    user_data_dir: Optional[str] = None,
    fullscreen: bool = False,
    launch_args: Optional[str] = None,
    extension_dirs: Optional[str] = None,
) -> tuple[bool, str]:
    """在主进程异步启动浏览器，返回 (成功, 错误消息)"""
    global _playwright, _context, _page, _is_open
    global _browser_type, _executable_path, _user_data_dir

    # 加锁避免并发 start 创建多个 playwright 实例
    async with _get_engine_lock():
        if is_open():
            return True, ""

        try:
            _playwright = await async_playwright().start()

            if browser_type == 'firefox':
                engine = _playwright.firefox
            else:
                engine = _playwright.chromium

            args_list = _build_launch_args(launch_args or '', extension_dirs or '')

            # 始终使用用户在配置里选择的浏览器：Edge/Chrome 自身即支持 --load-extension
            # 加载已解压扩展（且能保留用户的登录态/Cookie）。内置 Chromium 仅作为用户手动
            # 排障时的可选备用，不在此自动切换，避免丢失系统浏览器的登录态。
            udd = _get_user_data_dir(browser_type, user_data_dir)

            launch_kwargs = {
                'user_data_dir': udd,
                'headless': False,
                'args': args_list,
                'no_viewport': True,
                'ignore_https_errors': True,
            }

            if executable_path:
                launch_kwargs['executable_path'] = executable_path
            elif browser_type in ('msedge', 'chrome'):
                launch_kwargs['channel'] = browser_type

            ctx = await engine.launch_persistent_context(**launch_kwargs)
            ctx.set_default_timeout(0)
            ctx.set_default_navigation_timeout(0)

            # 监听浏览器关闭事件
            ctx.on("close", lambda: _on_browser_closed())

            # 处理已有页面
            if ctx.pages:
                pg = ctx.pages[0]
                for old in ctx.pages[1:]:
                    try:
                        await old.close()
                    except Exception:
                        pass
                try:
                    await pg.goto('about:blank', timeout=5000)
                except Exception:
                    pass
            else:
                pg = await ctx.new_page()

            # 注入脚本
            await _inject_userscript(pg)
            pg.on("load", lambda: asyncio.create_task(_reinject_on_load(pg)))
            ctx.on("page", lambda new_pg: asyncio.create_task(_on_new_page(new_pg)))

            # 最大化窗口
            try:
                cdp = await pg.context.new_cdp_session(pg)
                windows = await cdp.send('Browser.getWindowForTarget')
                window_id = windows.get('windowId')
                if window_id:
                    await cdp.send('Browser.setWindowBounds', {
                        'windowId': window_id,
                        'bounds': {'windowState': 'maximized'}
                    })
            except Exception as e:
                print(f"[BrowserEngine] 最大化窗口失败: {e}")

            try:
                await pg.bring_to_front()
            except Exception:
                pass

            _context = ctx
            _page = pg
            _is_open = True
            _browser_type = browser_type
            _executable_path = executable_path or ''
            _user_data_dir = user_data_dir

            print(f"[BrowserEngine] 浏览器已启动: type={browser_type}, udd={udd}")
            return True, ""

        except Exception as e:
            import traceback
            traceback.print_exc()
            try:
                if _playwright:
                    await _playwright.stop()
            except Exception:
                pass
            _playwright = None
            _context = None
            _page = None
            _is_open = False
            return False, str(e)


async def stop():
    """关闭浏览器引擎"""
    global _playwright, _context, _page, _is_open, _picker_active

    # 加锁与 start 互斥，避免并发关闭时状态错乱
    async with _get_engine_lock():
        _is_open = False
        _picker_active = False

        try:
            if _context:
                await _context.close()
        except Exception:
            pass
        _context = None
        _page = None

        try:
            if _playwright:
                await _playwright.stop()
        except Exception:
            pass
        _playwright = None

        print("[BrowserEngine] 浏览器已关闭")


async def navigate_to(url: str) -> dict:
    """导航到指定 URL"""
    pg = get_page()
    if pg is None:
        return {"success": False, "error": "没有活跃页面"}
    try:
        await pg.goto(url, timeout=30000)
        await pg.bring_to_front()
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def get_current_page_url() -> str:
    """获取当前页面 URL"""
    pg = get_page()
    if pg:
        return pg.url
    return ''


async def find_page_by_url_async(url: str) -> dict:
    """查找匹配 URL 的页面"""
    if _context is None:
        return {"success": False, "found": False}

    def norm(u):
        u = u.rstrip('/')
        for prefix in ('https://', 'http://'):
            if u.startswith(prefix):
                u = u[len(prefix):]
        return u.lower()

    for i, pg in enumerate(_context.pages):
        try:
            if norm(pg.url) == norm(url):
                return {"success": True, "found": True, "pageIndex": i}
        except Exception:
            continue
    return {"success": True, "found": False, "pageIndex": -1}


async def switch_to_page_async(page_index: int) -> dict:
    """切换到指定索引的页面"""
    if _context is None:
        return {"success": False, "error": "浏览器未启动"}
    try:
        pages = _context.pages
        if 0 <= page_index < len(pages):
            global _page
            _page = pages[page_index]
            await _page.bring_to_front()
            return {"success": True}
        return {"success": False, "error": "页面索引无效"}
    except Exception as e:
        return {"success": False, "error": str(e)}
