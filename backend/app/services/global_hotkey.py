"""全局热键服务 - 支持后台快捷键控制工作流运行/停止"""
import asyncio
import threading
from typing import Callable, Optional
import ctypes
from ctypes import wintypes
import sys


# Windows API 常量
MOD_ALT = 0x0001
MOD_CONTROL = 0x0002
MOD_SHIFT = 0x0004
MOD_WIN = 0x0008
MOD_NOREPEAT = 0x4000
WM_HOTKEY = 0x0312
WM_APP_RELOAD_CUSTOM = 0x8001  # 自定义消息：通知热键线程重新注册自定义热键
WM_QUIT = 0x0012

# 虚拟键码
VK_F5 = 0x74
VK_F9 = 0x78
VK_F10 = 0x79
VK_F12 = 0x7B

# 自定义热键 id 从 100 起，避免与内置(1-5)冲突
_CUSTOM_HOTKEY_ID_BASE = 100


def _combo_to_vk(combo: str):
    """把组合键字符串（如 'Ctrl+Alt+R' / 'Shift+F5' / 'Ctrl+Space'）解析为 (modifiers, vk_code)。
    解析失败返回 None。与前端 eventToCombo 产出的格式对齐。"""
    if not combo or not isinstance(combo, str):
        return None
    parts = [p.strip() for p in combo.split('+') if p.strip()]
    if not parts:
        return None
    mods = 0
    key = None
    for p in parts:
        low = p.lower()
        if low in ('ctrl', 'control'):
            mods |= MOD_CONTROL
        elif low == 'alt':
            mods |= MOD_ALT
        elif low == 'shift':
            mods |= MOD_SHIFT
        elif low in ('meta', 'win', 'cmd', 'super'):
            mods |= MOD_WIN
        else:
            key = p  # 主键（最后一个非修饰键）
    if not key:
        return None
    vk = _key_to_vk(key)
    if vk is None:
        return None
    return (mods | MOD_NOREPEAT, vk)


def _key_to_vk(key: str):
    """单个主键名 → Windows 虚拟键码。"""
    if not key:
        return None
    k = key
    if len(k) == 1:
        ch = k.upper()
        if 'A' <= ch <= 'Z' or '0' <= ch <= '9':
            return ord(ch)
        sym = {
            '-': 0xBD, '=': 0xBB, '[': 0xDB, ']': 0xDD, '\\': 0xDC,
            ';': 0xBA, "'": 0xDE, ',': 0xBC, '.': 0xBE, '/': 0xBF, '`': 0xC0,
        }
        return sym.get(k)
    ku = k.lower()
    named = {
        'space': 0x20, 'enter': 0x0D, 'return': 0x0D, 'tab': 0x09,
        'esc': 0x1B, 'escape': 0x1B, 'backspace': 0x08, 'delete': 0x2E, 'del': 0x2E,
        'insert': 0x2D, 'home': 0x24, 'end': 0x23, 'pageup': 0x21, 'pagedown': 0x22,
        'arrowup': 0x26, 'arrowdown': 0x28, 'arrowleft': 0x25, 'arrowright': 0x27,
        'up': 0x26, 'down': 0x28, 'left': 0x25, 'right': 0x27,
    }
    if ku in named:
        return named[ku]
    if ku.startswith('f') and ku[1:].isdigit():
        n = int(ku[1:])
        if 1 <= n <= 24:
            return 0x70 + (n - 1)
    return None


class GlobalHotkeyService:
    """全局热键服务，使用Windows API实现真正的系统级热键"""
    
    _instance: Optional['GlobalHotkeyService'] = None
    _lock = threading.Lock()
    
    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
            return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self._initialized = True
        self._running = False
        self._main_loop: Optional[asyncio.AbstractEventLoop] = None
        self._thread: Optional[threading.Thread] = None
        
        # 回调函数
        self._on_run_workflow: Optional[Callable[[], None]] = None
        self._on_stop_workflow: Optional[Callable[[], None]] = None
        self._on_macro_start: Optional[Callable[[], None]] = None  # F9 - 开始录制宏
        self._on_macro_stop: Optional[Callable[[], None]] = None   # F10 - 停止录制宏
        self._on_screenshot: Optional[Callable[[], None]] = None   # Ctrl+Shift+F12 - 截图
        self._on_custom: Optional[Callable[[str], None]] = None    # 自定义热键触发 (action_id)

        # 自定义热键：期望注册的映射 {action_id: combo}；已注册的 {hotkey_id: action_id}
        self._pending_custom: dict = {}
        self._custom_registered: dict = {}
        self._custom_lock = threading.Lock()
        
        # 热键ID
        self._hotkey_ids = {
            'run': 1,           # F5
            'stop': 2,          # Shift+F5
            'screenshot': 3,    # Ctrl+Shift+F12
            'macro_start': 4,   # F9
            'macro_stop': 5     # F10
        }
        
        # 是否启用
        self._enabled = True
        
        # Windows API
        self.user32 = ctypes.windll.user32
    
    def set_main_loop(self, loop: asyncio.AbstractEventLoop):
        """设置主事件循环"""
        self._main_loop = loop
    
    def set_callbacks(self, 
                      on_run: Optional[Callable[[], None]] = None,
                      on_stop: Optional[Callable[[], None]] = None,
                      on_macro_start: Optional[Callable[[], None]] = None,
                      on_macro_stop: Optional[Callable[[], None]] = None,
                      on_screenshot: Optional[Callable[[], None]] = None):
        """设置回调函数"""
        self._on_run_workflow = on_run
        self._on_stop_workflow = on_stop
        self._on_macro_start = on_macro_start
        self._on_macro_stop = on_macro_stop
        self._on_screenshot = on_screenshot
    
    def set_enabled(self, enabled: bool):
        """启用/禁用热键"""
        self._enabled = enabled
        print(f"[GlobalHotkey] 热键已{'启用' if enabled else '禁用'}")

    def set_custom_callback(self, on_custom: Optional[Callable[[str], None]]):
        """设置自定义热键触发回调：fn(action_id)。"""
        self._on_custom = on_custom

    def update_custom_hotkeys(self, mapping: dict):
        """更新用户自定义全局热键（{action_id: combo}）。线程安全：实际注册在热键线程完成。"""
        clean = {}
        for aid, combo in (mapping or {}).items():
            if aid and combo and isinstance(combo, str) and combo.strip():
                clean[str(aid)] = combo.strip()
        with self._custom_lock:
            self._pending_custom = clean
        print(f"[GlobalHotkey] 收到 {len(clean)} 个自定义全局热键，准备注册")
        # 通知热键线程在它自己的线程上重新注册（RegisterHotKey 有线程亲和性）
        if self._running and self._thread:
            try:
                self.user32.PostThreadMessageW(self._thread.ident, WM_APP_RELOAD_CUSTOM, 0, 0)
            except Exception as e:
                print(f"[GlobalHotkey] 通知重载自定义热键失败: {e}")

    def _register_custom(self):
        """在热键线程上：注销旧的自定义热键，按 _pending_custom 重新注册。"""
        # 先注销已注册的
        for hid in list(self._custom_registered.keys()):
            try:
                self.user32.UnregisterHotKey(None, hid)
            except Exception:
                pass
        self._custom_registered = {}
        with self._custom_lock:
            pending = dict(self._pending_custom)
        next_id = _CUSTOM_HOTKEY_ID_BASE
        ok = 0
        for action_id, combo in pending.items():
            parsed = _combo_to_vk(combo)
            if not parsed:
                print(f"[GlobalHotkey] 自定义热键解析失败，跳过: {action_id} = {combo}")
                continue
            mods, vk = parsed
            hid = next_id
            next_id += 1
            try:
                if self.user32.RegisterHotKey(None, hid, mods, vk):
                    self._custom_registered[hid] = action_id
                    ok += 1
                    print(f"[GlobalHotkey] ✅ 自定义热键注册成功: {combo} -> {action_id}")
                else:
                    err = ctypes.get_last_error()
                    print(f"[GlobalHotkey] ❌ 自定义热键注册失败({combo}, 错误码 {err})，可能与系统/其它程序冲突")
            except Exception as e:
                print(f"[GlobalHotkey] 自定义热键注册异常({combo}): {e}")
        print(f"[GlobalHotkey] 自定义全局热键注册完成: {ok}/{len(pending)}")
    
    def _register_hotkeys(self):
        """注册所有热键"""
        try:
            success_count = 0
            
            # F5 - 运行（使用 MOD_NOREPEAT 标志避免重复触发）
            result = self.user32.RegisterHotKey(None, self._hotkey_ids['run'], 0x4000, VK_F5)  # 0x4000 = MOD_NOREPEAT
            if result:
                print(f"[GlobalHotkey] ✅ F5 热键注册成功")
                success_count += 1
            else:
                error_code = ctypes.get_last_error()
                print(f"[GlobalHotkey] ❌ F5 热键注册失败 (错误码: {error_code})")
            
            # Shift+F5 - 停止
            result = self.user32.RegisterHotKey(None, self._hotkey_ids['stop'], MOD_SHIFT | 0x4000, VK_F5)
            if result:
                print(f"[GlobalHotkey] ✅ Shift+F5 热键注册成功")
                success_count += 1
            else:
                error_code = ctypes.get_last_error()
                print(f"[GlobalHotkey] ❌ Shift+F5 热键注册失败 (错误码: {error_code})")
            
            # Ctrl+Shift+F12 - 截图（已禁用，避免系统崩溃）
            # result = self.user32.RegisterHotKey(None, self._hotkey_ids['screenshot'], 
            #                                  MOD_CONTROL | MOD_SHIFT | 0x4000, VK_F12)
            # if result:
            #     print(f"[GlobalHotkey] ✅ Ctrl+Shift+F12 热键注册成功")
            #     success_count += 1
            # else:
            #     error_code = ctypes.get_last_error()
            #     print(f"[GlobalHotkey] ❌ Ctrl+Shift+F12 热键注册失败 (错误码: {error_code})")
            
            # F9 - 开始录制宏
            result = self.user32.RegisterHotKey(None, self._hotkey_ids['macro_start'], 0x4000, VK_F9)
            if result:
                print(f"[GlobalHotkey] ✅ F9 热键注册成功")
                success_count += 1
            else:
                error_code = ctypes.get_last_error()
                print(f"[GlobalHotkey] ❌ F9 热键注册失败 (错误码: {error_code})")
            
            # F10 - 停止录制宏
            result = self.user32.RegisterHotKey(None, self._hotkey_ids['macro_stop'], 0x4000, VK_F10)
            if result:
                print(f"[GlobalHotkey] ✅ F10 热键注册成功")
                success_count += 1
            else:
                error_code = ctypes.get_last_error()
                print(f"[GlobalHotkey] ❌ F10 热键注册失败 (错误码: {error_code})")
            
            print(f"[GlobalHotkey] 热键注册完成: {success_count}/5 个热键注册成功")
            # 注册用户自定义全局热键（首次启动若已有则一并注册）
            try:
                self._register_custom()
            except Exception as e:
                print(f"[GlobalHotkey] 注册自定义热键出错: {e}")
            return success_count > 0
        except Exception as e:
            print(f"[GlobalHotkey] 注册热键失败: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def _unregister_hotkeys(self):
        """注销所有热键"""
        try:
            for hotkey_id in self._hotkey_ids.values():
                self.user32.UnregisterHotKey(None, hotkey_id)
            print("[GlobalHotkey] 热键已注销")
        except Exception as e:
            print(f"[GlobalHotkey] 注销热键失败: {e}")
    
    def _hotkey_loop(self):
        """热键消息循环"""
        print("[GlobalHotkey] 热键消息循环已启动")
        
        # 注册热键
        if not self._register_hotkeys():
            print("[GlobalHotkey] 热键注册失败，消息循环退出")
            return
        
        try:
            msg = wintypes.MSG()
            while self._running:
                # 获取消息
                result = self.user32.GetMessageW(ctypes.byref(msg), None, 0, 0)
                
                if result == 0 or result == -1:
                    break

                # 自定义消息：在热键线程上重新注册用户自定义热键
                if msg.message == WM_APP_RELOAD_CUSTOM:
                    try:
                        self._register_custom()
                    except Exception as e:
                        print(f"[GlobalHotkey] 重载自定义热键失败: {e}")
                    continue

                if msg.message == WM_HOTKEY:
                    hotkey_id = msg.wParam
                    
                    if not self._enabled:
                        continue

                    # 自定义热键（id >= 100）
                    if hotkey_id >= _CUSTOM_HOTKEY_ID_BASE:
                        action_id = self._custom_registered.get(hotkey_id)
                        if action_id:
                            print(f"[GlobalHotkey] 检测到自定义热键 -> {action_id}")
                            self._trigger_custom(action_id)
                        continue

                    # 根据热键ID触发相应的回调
                    if hotkey_id == self._hotkey_ids['run']:
                        print("[GlobalHotkey] 检测到运行热键: F5")
                        self._trigger_run()
                    elif hotkey_id == self._hotkey_ids['stop']:
                        print("[GlobalHotkey] 检测到停止热键: Shift+F5")
                        self._trigger_stop()
                    # elif hotkey_id == self._hotkey_ids['screenshot']:  # 已禁用
                        print("[GlobalHotkey] 检测到截图热键: Ctrl+Shift+F12")
                        # self._trigger_screenshot()  # 已禁用
                    elif hotkey_id == self._hotkey_ids['macro_start']:
                        print("[GlobalHotkey] 检测到宏录制开始热键: F9")
                        self._trigger_macro_start()
                    elif hotkey_id == self._hotkey_ids['macro_stop']:
                        print("[GlobalHotkey] 检测到宏录制停止热键: F10")
                        self._trigger_macro_stop()
                
                self.user32.TranslateMessage(ctypes.byref(msg))
                self.user32.DispatchMessageW(ctypes.byref(msg))
        
        except Exception as e:
            print(f"[GlobalHotkey] 热键循环异常: {e}")
            import traceback
            traceback.print_exc()
        finally:
            # 注销热键
            self._unregister_hotkeys()
            print("[GlobalHotkey] 热键消息循环已退出")
    
    def _trigger_run(self):
        """触发运行工作流"""
        print(f"[GlobalHotkey] _trigger_run 被调用，回调函数存在: {self._on_run_workflow is not None}, 事件循环存在: {self._main_loop is not None}")
        if self._on_run_workflow and self._main_loop:
            # 在主事件循环中执行回调
            asyncio.run_coroutine_threadsafe(
                self._async_run_callback(),
                self._main_loop
            )
            print("[GlobalHotkey] 运行回调已提交到事件循环")
    
    def _trigger_stop(self):
        """触发停止工作流"""
        print(f"[GlobalHotkey] _trigger_stop 被调用，回调函数存在: {self._on_stop_workflow is not None}, 事件循环存在: {self._main_loop is not None}")
        if self._on_stop_workflow and self._main_loop:
            asyncio.run_coroutine_threadsafe(
                self._async_stop_callback(),
                self._main_loop
            )
            print("[GlobalHotkey] 停止回调已提交到事件循环")
    
    def _trigger_macro_start(self):
        """触发开始录制宏"""
        print(f"[GlobalHotkey] _trigger_macro_start 被调用，回调函数存在: {self._on_macro_start is not None}, 事件循环存在: {self._main_loop is not None}")
        if self._on_macro_start and self._main_loop:
            asyncio.run_coroutine_threadsafe(
                self._async_macro_start_callback(),
                self._main_loop
            )
            print("[GlobalHotkey] 宏录制开始回调已提交到事件循环")
    
    def _trigger_macro_stop(self):
        """触发停止录制宏"""
        print(f"[GlobalHotkey] _trigger_macro_stop 被调用，回调函数存在: {self._on_macro_stop is not None}, 事件循环存在: {self._main_loop is not None}")
        if self._on_macro_stop and self._main_loop:
            asyncio.run_coroutine_threadsafe(
                self._async_macro_stop_callback(),
                self._main_loop
            )
            print("[GlobalHotkey] 宏录制停止回调已提交到事件循环")
    
    def _trigger_screenshot(self):
        """触发截图"""
        print(f"[GlobalHotkey] _trigger_screenshot 被调用，回调函数存在: {self._on_screenshot is not None}, 事件循环存在: {self._main_loop is not None}")
        if self._on_screenshot and self._main_loop:
            asyncio.run_coroutine_threadsafe(
                self._async_screenshot_callback(),
                self._main_loop
            )
            print("[GlobalHotkey] 截图回调已提交到事件循环")

    def _trigger_custom(self, action_id: str):
        """触发自定义热键回调"""
        if self._on_custom and self._main_loop:
            asyncio.run_coroutine_threadsafe(
                self._async_custom_callback(action_id),
                self._main_loop
            )

    async def _async_custom_callback(self, action_id: str):
        if self._on_custom:
            try:
                result = self._on_custom(action_id)
                if asyncio.iscoroutine(result):
                    await result
            except Exception as e:
                print(f"[GlobalHotkey] 自定义热键回调异常: {e}")
    
    async def _async_run_callback(self):
        """异步执行运行回调"""
        if self._on_run_workflow:
            try:
                result = self._on_run_workflow()
                if asyncio.iscoroutine(result):
                    await result
            except Exception as e:
                print(f"[GlobalHotkey] 运行回调异常: {e}")
    
    async def _async_stop_callback(self):
        """异步执行停止回调"""
        if self._on_stop_workflow:
            try:
                result = self._on_stop_workflow()
                if asyncio.iscoroutine(result):
                    await result
            except Exception as e:
                print(f"[GlobalHotkey] 停止回调异常: {e}")
    
    async def _async_macro_start_callback(self):
        """异步执行宏录制开始回调"""
        if self._on_macro_start:
            try:
                result = self._on_macro_start()
                if asyncio.iscoroutine(result):
                    await result
            except Exception as e:
                print(f"[GlobalHotkey] 宏录制开始回调异常: {e}")
    
    async def _async_macro_stop_callback(self):
        """异步执行宏录制停止回调"""
        if self._on_macro_stop:
            try:
                result = self._on_macro_stop()
                if asyncio.iscoroutine(result):
                    await result
            except Exception as e:
                print(f"[GlobalHotkey] 宏录制停止回调异常: {e}")
    
    async def _async_screenshot_callback(self):
        """异步执行截图回调"""
        print("[GlobalHotkey] _async_screenshot_callback 开始执行")
        if self._on_screenshot:
            try:
                result = self._on_screenshot()
                if asyncio.iscoroutine(result):
                    await result
                print("[GlobalHotkey] 截图回调执行成功")
            except Exception as e:
                print(f"[GlobalHotkey] 截图回调异常: {e}")
                import traceback
                traceback.print_exc()
        else:
            print("[GlobalHotkey] 截图回调函数不存在")
    
    def start(self):
        """启动热键监听"""
        if self._running:
            return
        
        self._running = True
        
        # 在新线程中运行热键循环
        self._thread = threading.Thread(target=self._hotkey_loop, daemon=True)
        self._thread.start()
        
        print("[GlobalHotkey] 全局热键服务已启动 (F5=运行, Shift+F5=停止, F9=开始录制宏, F10=停止录制宏, Ctrl+Shift+F12=截图)")
    
    def stop(self):
        """停止热键监听"""
        if not self._running:
            return
        
        self._running = False
        
        # 发送退出消息
        try:
            self.user32.PostThreadMessageW(
                self._thread.ident if self._thread else 0,
                0x0012,  # WM_QUIT
                0,
                0
            )
        except Exception:
            pass
        
        if self._thread:
            self._thread.join(timeout=2)
            self._thread = None
        
        print("[GlobalHotkey] 全局热键服务已停止")


# 全局单例
_hotkey_service: Optional[GlobalHotkeyService] = None


def get_hotkey_service() -> GlobalHotkeyService:
    """获取全局热键服务实例"""
    global _hotkey_service
    if _hotkey_service is None:
        _hotkey_service = GlobalHotkeyService()
    return _hotkey_service
