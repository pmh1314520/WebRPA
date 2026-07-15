"""全局浏览器管理器 - 通过 browser_engine 在主进程中共享 Playwright context"""
import asyncio
import concurrent.futures
import json
import threading
import sys
from pathlib import Path
from typing import Optional

# 用户数据目录（供外部查询）
USER_DATA_DIR = Path(__file__).parent.parent.parent / "browser_data"
USER_DATA_DIR.mkdir(exist_ok=True)

# picker 脚本（保留，供 browser_engine 或独立进程使用）
_picker_active = False
# 是否已经给 BrowserContext 注册 init_script，避免每次启动 picker 时重复注册
_picker_init_script_registered = False
# 已注册 init_script 的 BrowserContext 身份（id）。浏览器关闭重开会换新 context，
# 届时需在新 context 上重新注册，否则重开后新页面收不到选择器脚本。
_picker_init_ctx_id = None


def get_user_data_dir() -> str:
    return str(USER_DATA_DIR)


# =================== 状态查询 ===================

def is_browser_open() -> bool:
    """检查浏览器引擎是否已启动"""
    try:
        from app.services import browser_engine
        return browser_engine.is_open()
    except Exception:
        return False


def get_browser_proc():
    """兼容旧接口，返回 None（不再使用子进程）"""
    return None


def get_current_browser_config() -> dict:
    try:
        from app.services import browser_engine
        return browser_engine.get_config()
    except Exception:
        return {'type': 'msedge', 'executablePath': '', 'userDataDir': None}


# =================== 启动 / 停止 ===================

def start_browser(
    browser_type: str = 'msedge',
    executable_path: Optional[str] = None,
    user_data_dir: Optional[str] = None,
    fullscreen: bool = False,
    launch_args: Optional[str] = None,
) -> tuple[bool, str]:
    """启动浏览器（在主进程 event loop 中运行）
    
    警告：sync 桥接，不要在 async 上下文中调用，会阻塞事件循环。
    """
    try:
        from app.services import browser_engine
        # 优先取当前已运行的 loop（避免 asyncio.get_event_loop 在 3.12+ 的弃用警告）
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                return False, "没有可用的事件循环"
        future = asyncio.run_coroutine_threadsafe(
            browser_engine.start(
                browser_type=browser_type,
                executable_path=executable_path,
                user_data_dir=user_data_dir,
                fullscreen=fullscreen,
                launch_args=launch_args,
            ),
            loop,
        )
        return future.result(timeout=60)
    except concurrent.futures.TimeoutError:
        return False, "启动浏览器超时（60秒）"
    except Exception as e:
        return False, str(e)


def stop_browser():
    """关闭浏览器
    
    警告：sync 桥接，不要在 async 上下文中调用。
    """
    global _picker_active
    _picker_active = False
    try:
        from app.services import browser_engine
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                return
        future = asyncio.run_coroutine_threadsafe(browser_engine.stop(), loop)
        future.result(timeout=15)
    except concurrent.futures.TimeoutError:
        print("[BrowserManager] stop_browser 超时")
    except Exception as e:
        print(f"[BrowserManager] stop_browser error: {e}")


# =================== 命令 ===================

def send_command(action: str, **kwargs) -> dict:
    """发送命令到浏览器引擎（异步转同步）
    
    警告：这个函数是 sync 桥接，会用 future.result(timeout=10) 同步等待。
    在 async 上下文中不要调用本函数（会阻塞事件循环），应直接 await 对应的 async 实现。
    """
    if not is_browser_open():
        return {"success": False, "error": "浏览器未打开"}
    try:
        from app.services import browser_engine
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                return {"success": False, "error": "没有可用的事件循环"}

        async def _run():
            if action == 'navigate':
                return await browser_engine.navigate_to(kwargs.get('url', ''))
            elif action == 'find_page_by_url':
                return await browser_engine.find_page_by_url_async(kwargs.get('url', ''))
            elif action == 'switch_to_page':
                return await browser_engine.switch_to_page_async(kwargs.get('pageIndex', 0))
            elif action == 'start_picker':
                return await _start_picker_engine()
            elif action == 'stop_picker':
                return await _stop_picker_engine()
            elif action == 'get_selected':
                return await _get_picker_result('__elementPickerResult')
            elif action == 'get_similar':
                return await _get_picker_result('__elementPickerSimilar')
            elif action == 'quit':
                await browser_engine.stop()
                return {"success": True}
            else:
                return {"success": False, "error": f"未知命令: {action}"}

        future = asyncio.run_coroutine_threadsafe(_run(), loop)
        return future.result(timeout=10)
    except concurrent.futures.TimeoutError:
        return {"success": False, "error": "浏览器命令超时（10秒）"}
    except Exception as e:
        return {"success": False, "error": str(e)}


# =================== Picker 辅助 ===================

def _load_picker_script() -> str:
    """统一从 element_picker/script.py 加载共享 picker 脚本，
    避免 5 份拷贝各自维护、改一份漏其他几份的混乱。
    """
    try:
        from app.services.element_picker.script import PICKER_SCRIPT as _SCRIPT
        return _SCRIPT
    except Exception as _e:
        print(f"[browser_manager] 加载共享 picker 脚本失败，回退内嵌: {_e}")
    return ""


PICKER_SCRIPT = _load_picker_script()


async def _start_picker_engine() -> dict:
    """启动元素选择器：

    跨页面注入：
    - 给 BrowserContext 注册 add_init_script，所有新打开/跳转的页面都会自动注入；
    - 同时对当前所有已打开页面立即 evaluate 注入。
    用户切到新网址或新开 tab 后也能继续用 Ctrl+点击 / Alt+两点采样。
    """
    global _picker_active, _picker_init_script_registered, _picker_init_ctx_id
    from app.services import browser_engine

    ctx = browser_engine.get_context()
    if ctx is None:
        return {"success": False, "error": "没有活跃浏览器上下文"}

    # 给 context 注册一次 init script（每个新文档/跳转都会自动跑）。
    # 按 context 身份跟踪：浏览器关闭重开会得到全新的 context，之前的 init_script 已失效，
    # 必须在新 context 上重新注册，否则重开后新标签/跳转的页面收不到选择器脚本。
    if not _picker_init_script_registered or _picker_init_ctx_id != id(ctx):
        try:
            await ctx.add_init_script(PICKER_SCRIPT)
            _picker_init_script_registered = True
            _picker_init_ctx_id = id(ctx)
        except Exception as e:
            print(f"[browser_manager] 注册 picker init_script 失败：{e}")

    # 每次 start 都先清除"已禁用"标志，确保跳转/新页面里脚本能正常激活
    for pg in ctx.pages:
        try:
            await pg.evaluate("() => { window.__elementPickerDisabled = false; }")
        except Exception:
            pass
    try:
        await ctx.add_init_script(
            "window.__elementPickerDisabled = false;"
        )
    except Exception:
        pass

    # 立即给所有现有页面注入一次（init_script 只对未来文档生效）
    injected = 0
    for pg in ctx.pages:
        try:
            await pg.evaluate(PICKER_SCRIPT)
            injected += 1
        except Exception as e:
            print(f"[browser_manager] 注入到 {pg.url} 失败：{e}")

    _picker_active = True
    return {"success": True, "data": {"message": f"选择器已启动（覆盖 {injected} 个页面，跨网站持续生效）"}}


async def _stop_picker_engine() -> dict:
    """停止元素选择器：

    Playwright 的 add_init_script 一旦注册无法移除，
    所以这里给所有页面挂一个 window.__elementPickerDisabled 标志，
    让脚本启动逻辑识别后自我退出；同时主动清理已注入页面的 UI。
    """
    global _picker_active
    from app.services import browser_engine
    _picker_active = False
    ctx = browser_engine.get_context()
    if ctx:
        for pg in ctx.pages:
            try:
                await pg.evaluate("""
                    () => {
                        ['__picker_tip','__picker_box'].forEach(id => {
                            var el = document.getElementById(id);
                            if (el) el.remove();
                        });
                        document.querySelectorAll('.__picker_similar_box').forEach(el => el.remove());
                        window.__elementPickerActive = false;
                        window.__elementPickerDisabled = true;
                        window.__elementPickerResult = null;
                        window.__elementPickerSimilar = null;
                    }
                """)
            except Exception:
                pass
        # 同时给后续新页面挂上禁用标志
        try:
            await ctx.add_init_script(
                "window.__elementPickerDisabled = true;"
            )
        except Exception:
            pass
    return {"success": True, "data": {"message": "选择器已停止"}}


async def _get_picker_result(key: str) -> dict:
    """读取选择器结果。

    跨页面/跨标签跟随：选择器脚本已通过 add_init_script 注入到所有页面/标签/frame，
    用户可能在任意一个页面（新开的标签、跳转后的新网址、iframe）里完成选择，结果就写在
    “那个”页面/frame 的 window 上。因此这里必须遍历 context 内所有页面（及其全部 frame）
    去查找结果，而不能只读 browser_engine 记录的单个“当前页”，否则用户切到新页面选取时后端
    永远读不到 → 表现为“选择器不跟随新页面”。
    """
    from app.services import browser_engine
    ctx = browser_engine.get_context()
    if ctx is None:
        return {"success": True, "data": None}

    js = f"""
        () => {{
            var r = window.{key};
            window.{key} = null;
            return r;
        }}
    """

    pages = list(getattr(ctx, "pages", []) or [])
    # 把 browser_engine 记录的当前页排到最前，命中概率更高、少扫几个 frame
    try:
        cur = browser_engine.get_page()
        if cur is not None and cur in pages:
            pages.remove(cur)
            pages.insert(0, cur)
    except Exception:
        pass

    last_error = None
    for pg in pages:
        # 优先主 frame；再兜底其余 frame（覆盖 iframe 内选取）
        frames = [pg.main_frame] if getattr(pg, "main_frame", None) else []
        for fr in getattr(pg, "frames", []) or []:
            if fr not in frames:
                frames.append(fr)
        for fr in frames:
            try:
                data = await fr.evaluate(js)
                if data:
                    return {"success": True, "data": data}
            except Exception as e:
                # 跨域 frame / 页面正在跳转等会抛错，跳过继续扫描其它页面
                last_error = str(e)
                continue

    if last_error is not None:
        return {"success": True, "data": None}
    return {"success": True, "data": None}


# =================== 便捷函数 ===================

def navigate(url: str) -> dict:
    return send_command("navigate", url=url)


def start_picker() -> dict:
    result = send_command("start_picker")
    return result


def stop_picker() -> dict:
    result = send_command("stop_picker")
    return result


def get_selected_element() -> dict:
    return send_command("get_selected")


def get_similar_elements() -> dict:
    return send_command("get_similar")


def is_picker_active() -> bool:
    return _picker_active


def find_page_by_url(url: str) -> dict:
    return send_command("find_page_by_url", url=url)


def switch_to_page(page_index: int) -> dict:
    return send_command("switch_to_page", pageIndex=page_index)


def ensure_browser_open(
    browser_type: str = 'msedge',
    executable_path: Optional[str] = None,
    fullscreen: bool = False,
) -> bool:
    from app.services import browser_engine
    if browser_engine.is_open():
        cfg = browser_engine.get_config()
        if (cfg.get('type') == browser_type and
                cfg.get('executablePath', '') == (executable_path or '') and
                True):
            return True
        # 配置变化，先停止
        stop_browser()
    success, _ = start_browser(browser_type, executable_path, None, fullscreen)
    return success
