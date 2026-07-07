# -*- coding: utf-8 -*-
"""桌面智能录制器

用全局键鼠钩子（pynput）记录用户的桌面操作，并尽量用 UIAutomation 识别点击处的控件，
生成语义化步骤，供前端转换为桌面自动化节点（真实鼠标点击 / 键盘输入）。

事件类型：
- click   鼠标点击 {x, y, button, window, control}
- type    键盘文本输入（连续可见字符合并）{text}
- hotkey  组合键/功能键 {keys}
"""
from __future__ import annotations

import threading
import time
from typing import Optional

_lock = threading.Lock()
_events: list[dict] = []
_active = False
_paused = False
_mouse_listener = None
_kbd_listener = None
_type_buffer: list[str] = []
_type_buffer_ts: float = 0.0
_type_ctrl_initial: Optional[str] = None  # 本段输入开始时焦点控件的原始文本（用于取增量还原 IME 中文）
_type_ctrl = None                          # 本段输入所在的控件引用（flush 时读它的最终值，避免焦点已转移读错）
_mods: set[str] = set()        # 当前按住的修饰键（ctrl/alt/shift/win）
_press: Optional[dict] = None  # 鼠标按下点，用于识别拖拽
_DRAG_THRESH2 = 100            # 拖拽判定阈值：位移平方 > 100（即 >10px）


def is_active() -> bool:
    return _active


def is_paused() -> bool:
    return _paused


def pause() -> dict:
    global _paused
    with _lock:
        _paused = True
        _flush_type_buffer()
    return {"success": True, "paused": True}


def resume() -> dict:
    global _paused
    with _lock:
        _paused = False
    return {"success": True, "paused": False}


def _ensure_com():
    """确保当前线程已初始化 COM（pynput 键盘/鼠标回调运行在各自线程，UIAutomation 需要 COM）。"""
    try:
        import comtypes
        try:
            comtypes.CoInitialize()
        except Exception:
            pass
    except Exception:
        pass


# 需要忽略的窗口标题关键词（WebRPA 自身界面：录制器面板、启动器等，避免点"停止"按钮被录进去）
_exclude_titles: list[str] = ["WebRPA"]


def _skip_title(title: str) -> bool:
    if not title:
        return False
    t = title.lower()
    return any(kw and kw.lower() in t for kw in _exclude_titles)


def _title_at(x: int, y: int) -> str:
    """获取坐标 (x,y) 处顶层窗口的标题。"""
    try:
        import win32gui
        hwnd = win32gui.WindowFromPoint((x, y))
        top = win32gui.GetAncestor(hwnd, 2)  # GA_ROOT
        return win32gui.GetWindowText(top) or ""
    except Exception:
        return ""


def _foreground_title() -> str:
    """获取当前前台窗口标题（用于键盘/滚动等无坐标事件的窗口归属判断）。"""
    try:
        import win32gui
        return win32gui.GetWindowText(win32gui.GetForegroundWindow()) or ""
    except Exception:
        return ""


def _control_value(ctrl):
    """读取指定控件的文本值（ValuePattern 优先，回退 TextPattern）。失败返回 None。"""
    if ctrl is None:
        return None
    try:
        vp = ctrl.GetValuePattern()
        if vp is not None:
            return vp.Value or ""
    except Exception:
        pass
    try:
        tp = ctrl.GetTextPattern()
        if tp is not None:
            return tp.DocumentRange.GetText(-1) or ""
    except Exception:
        pass
    return None


def _focused_control_and_value():
    """获取当前焦点控件及其文本值。返回 (control, value)；失败返回 (None, None)。"""
    try:
        _ensure_com()
        import uiautomation as auto
        ctrl = auto.GetFocusedControl()
        if not ctrl:
            return None, None
        return ctrl, _control_value(ctrl)
    except Exception:
        return None, None


def _flush_type_buffer():
    """把累积输入合并成一个 type 事件。
    IME 修正：读"本段输入所在控件"的最终文本增量（还原中文），拿不到才回退按键流拼串。
    关键：读的是记录下来的输入控件（_type_ctrl），而非当前焦点——因为点击等操作会先转移焦点。"""
    global _type_buffer, _type_ctrl_initial, _type_ctrl
    if not _type_buffer:
        _type_ctrl_initial = None
        _type_ctrl = None
        return
    typed = "".join(_type_buffer)
    _type_buffer = []
    text = typed
    try:
        _ensure_com()
        cur = _control_value(_type_ctrl)
        init = _type_ctrl_initial
        if cur is not None:
            if init is not None and cur.startswith(init) and len(cur) > len(init):
                delta = cur[len(init):]
                if delta:
                    text = delta            # 本段真实输入（IME 上屏后的中文/符号）
            elif (init in (None, "")) and cur:
                text = cur                  # 空框输入，直接用控件全文
            # 若控件文本与按键流一致（纯 ASCII），text 仍为 typed，等价
    except Exception:
        pass
    _type_ctrl_initial = None
    _type_ctrl = None
    if text:
        _events.append({"type": "type", "text": text, "ts": time.time()})


def _describe_control_at(x: int, y: int) -> dict:
    """尽力识别 (x,y) 处的 UIAutomation 控件与所属窗口（失败返回空信息）"""
    info = {"window": "", "control": "", "controlType": "", "automationId": "", "className": ""}
    try:
        import win32gui
        hwnd = win32gui.WindowFromPoint((x, y))
        top = win32gui.GetAncestor(hwnd, 2)  # GA_ROOT
        info["window"] = win32gui.GetWindowText(top) or ""
    except Exception:
        pass
    try:
        _ensure_com()
        import uiautomation as auto
        ctrl = auto.ControlFromPoint(x, y)
        if ctrl:
            info["control"] = (ctrl.Name or "")[:60]
            info["controlType"] = ctrl.ControlTypeName or ""
            try:
                info["automationId"] = ctrl.AutomationId or ""
            except Exception:
                pass
            try:
                info["className"] = ctrl.ClassName or ""
            except Exception:
                pass
    except Exception:
        pass
    return info


def _on_click(x, y, button, pressed):
    """按下记录起点；释放时判定：位移大→拖拽，否则→点击（在释放点识别控件）。"""
    global _press
    with _lock:
        if not _active or _paused:
            return
        try:
            btn = button.name  # 'left' / 'right' / 'middle'
        except Exception:
            btn = "left"
        if pressed:
            _press = {"x": int(x), "y": int(y), "btn": btn, "ts": time.time()}
            return
        p = _press
        _press = None
        rx, ry = int(x), int(y)
        # 忽略对 WebRPA 自身窗口的操作（如点击"停止录制"按钮）
        if _skip_title(_title_at(rx, ry)):
            return
        _flush_type_buffer()
        if p and p["btn"] == btn and ((rx - p["x"]) ** 2 + (ry - p["y"]) ** 2) > _DRAG_THRESH2:
            # 拖拽：起点→终点
            _events.append({
                "type": "drag", "x": p["x"], "y": p["y"], "x2": rx, "y2": ry,
                "button": btn, "ts": time.time(),
            })
            return
        ctrl = _describe_control_at(rx, ry)
        _events.append({
            "type": "click", "x": rx, "y": ry, "button": btn,
            "window": ctrl["window"], "control": ctrl["control"],
            "controlType": ctrl["controlType"], "automationId": ctrl.get("automationId", ""),
            "className": ctrl.get("className", ""), "ts": time.time(),
        })


def _on_scroll(x, y, dx, dy):
    """滚轮：桌面无自动滚动，滚动是真实操作，需录制（合并连续同向）。"""
    with _lock:
        if not _active or _paused:
            return
        if _skip_title(_title_at(int(x), int(y))):
            return
        _flush_type_buffer()
        last = _events[-1] if _events else None
        if last and last.get("type") == "scroll" and (last.get("dy", 0) > 0) == (dy > 0):
            last["dy"] = last.get("dy", 0) + dy
            last["ts"] = time.time()
            return
        _events.append({"type": "scroll", "x": int(x), "y": int(y), "dy": dy, "ts": time.time()})


def _mod_name(key) -> str:
    """pynput 修饰键 → 归一化名（ctrl/alt/shift/win）；非修饰键返回 ''。"""
    n = getattr(key, 'name', '') or ''
    if n.startswith('ctrl'):
        return 'ctrl'
    if n.startswith('alt'):
        return 'alt'
    if n.startswith('shift'):
        return 'shift'
    if n.startswith('cmd') or n == 'cmd':
        return 'win'
    return ''


def _key_token(key) -> str:
    """按键 token（组合键用）：字母/数字优先用 vk，避免受 Ctrl 影响导致取到控制字符。"""
    vk = getattr(key, 'vk', None)
    if vk is not None:
        if 0x41 <= vk <= 0x5A:
            return chr(vk).lower()
        if 0x30 <= vk <= 0x39:
            return chr(vk)
        if 0x60 <= vk <= 0x69:
            return 'numpad' + str(vk - 0x60)
    ch = getattr(key, 'char', None)
    if ch and ch.isprintable():
        return ch.lower()
    name = getattr(key, 'name', None)
    if name:
        return _SPECIAL_KEYS.get(name, name).lower()
    return ''


# 功能键名映射（pynput Key -> 友好名）
_SPECIAL_KEYS = {
    'enter': 'Enter', 'tab': 'Tab', 'esc': 'Escape', 'backspace': 'Backspace',
    'space': 'Space', 'delete': 'Delete', 'up': 'Up', 'down': 'Down',
    'left': 'Left', 'right': 'Right', 'home': 'Home', 'end': 'End',
    'page_up': 'PageUp', 'page_down': 'PageDown',
}


def _on_press(key):
    global _type_buffer_ts, _type_ctrl_initial, _type_ctrl
    with _lock:
        if not _active or _paused:
            return
        # 修饰键：记入活动集合，不单独成事件（即使在自身窗口也维护状态，避免残留）
        m = _mod_name(key)
        if m:
            _mods.add(m)
            return
        # 忽略在 WebRPA 自身窗口内的按键
        if _skip_title(_foreground_title()):
            return
        active_mods = _mods - {'shift'}  # shift 单独不算组合（大小写由 char 体现）
        name = getattr(key, 'name', None)
        ch = getattr(key, 'char', None)
        # 普通可见字符且无 ctrl/alt/win：并入文本输入
        if ch is not None and ch.isprintable() and not active_mods and ch not in ('\x16', '\x03'):
            if not _type_buffer:
                _type_ctrl, _type_ctrl_initial = _focused_control_and_value()  # 记录本段输入的控件与原始文本
            _type_buffer.append(ch)
            _type_buffer_ts = time.time()
            return
        if name == 'space' and not active_mods:
            if not _type_buffer:
                _type_ctrl, _type_ctrl_initial = _focused_control_and_value()
            _type_buffer.append(' ')
            _type_buffer_ts = time.time()
            return
        # 组合键 或 功能键：先冲刷文本缓冲
        _flush_type_buffer()
        token = _key_token(key)
        if not token:
            return
        if active_mods or ('shift' in _mods and name):
            # 组合键：按 ctrl/alt/shift/win 顺序 + 主键（如 ctrl+shift+s）
            order = [mm for mm in ('ctrl', 'alt', 'shift', 'win') if mm in _mods]
            combo = '+'.join(order + [token])
            _events.append({"type": "hotkey", "keys": combo, "combo": True, "ts": time.time()})
        else:
            friendly = _SPECIAL_KEYS.get(name or '', None)
            if friendly:
                _events.append({"type": "hotkey", "keys": friendly, "ts": time.time()})


def _on_release(key):
    """释放修饰键时从活动集合移除（即使暂停也维护，避免状态残留）。"""
    m = _mod_name(key)
    if m:
        with _lock:
            _mods.discard(m)


def start_recorder(exclude_titles: Optional[list] = None) -> dict:
    """开始桌面录制（启动全局键鼠钩子）。
    exclude_titles: 需要忽略的窗口标题关键词（前端传入自身窗口标题，避免录到 WebRPA 界面操作）。"""
    global _active, _mouse_listener, _kbd_listener, _events, _type_buffer, _paused, _press, _type_ctrl_initial, _type_ctrl, _exclude_titles
    with _lock:
        if _active:
            return {"success": True, "message": "已在录制中"}
        # 合并默认与前端传入的排除标题（去重、去空）
        merged = ["WebRPA"]
        for t in (exclude_titles or []):
            if t and t not in merged:
                merged.append(t)
        _exclude_titles = merged
        try:
            from pynput import mouse as _mouse, keyboard as _kb
        except Exception as e:
            return {"success": False, "error": f"缺少 pynput 库，无法桌面录制: {e}"}
        _events = []
        _type_buffer = []
        _type_ctrl_initial = None
        _type_ctrl = None
        _paused = False
        _mods.clear()
        _press = None
        try:
            _mouse_listener = _mouse.Listener(on_click=_on_click, on_scroll=_on_scroll)
            _kbd_listener = _kb.Listener(on_press=_on_press, on_release=_on_release)
            _mouse_listener.start()
            _kbd_listener.start()
            _active = True
        except Exception as e:
            return {"success": False, "error": f"启动钩子失败: {e}"}
    return {"success": True, "message": "桌面录制已开始"}


def stop_recorder() -> dict:
    """停止录制并返回全部剩余事件"""
    global _active, _mouse_listener, _kbd_listener
    with _lock:
        _active = False
        _flush_type_buffer()
        for lis in (_mouse_listener, _kbd_listener):
            try:
                if lis:
                    lis.stop()
            except Exception:
                pass
        _mouse_listener = None
        _kbd_listener = None
        remaining = list(_events)
    return {"success": True, "data": remaining}


def drain_events() -> dict:
    """排空并返回已录制事件（轮询用）"""
    global _events
    with _lock:
        # 文本缓冲若停顿超过 1.2s 也先冲刷，避免一直不出现在轮询里
        if _type_buffer and (time.time() - _type_buffer_ts) > 1.2:
            _flush_type_buffer()
        out = list(_events)
        _events = []
    return {"success": True, "data": out}
