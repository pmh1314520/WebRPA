# -*- coding: utf-8 -*-
"""打包运行模式下的原生交互兜底

工作流被打包成独立 EXE 后没有编辑器前端，原本经 Socket.IO 与前端交互的模块
（用户输入弹窗 / 文本朗读 / 查看图片 / 播放音视频 / JS脚本）需要用本机原生方式实现，
否则会一直等前端响应直到超时。

这些函数与 app.main 里同名函数签名一致，执行器在 WEBRPA_PACKAGED=1 时改用本模块，
从而打包产物里这些交互模块也能完美工作。
"""
from __future__ import annotations

import os
import queue
import threading
import webbrowser
from typing import Any, Optional


# ============================================================
# 主线程 Tk 桥接：当打包 EXE 启用「自定义运行界面」时，主线程已运行一个 tk.Tk()
# 的 mainloop；而工作流在后台线程执行，其用户输入模块会从工作线程请求弹窗。
# 两个 Tcl 解释器跨线程并存会崩溃/卡死，故这里把弹窗请求经线程安全队列转交
# 主线程，以 Toplevel 形式在同一个 Tcl 解释器里渲染，彻底避免线程冲突。
# 无自定义界面（控制台模式）时桥接不激活，沿用各自独立 tk.Tk() 的原逻辑。
# ============================================================
_BRIDGE: dict[str, Any] = {"root": None, "tk": None, "queue": None}


def install_main_thread_bridge(root, tk_module) -> None:
    """由自定义界面运行器在主线程调用，注册主线程 root，并启动队列泵。"""
    q: "queue.Queue" = queue.Queue()
    _BRIDGE["root"] = root
    _BRIDGE["tk"] = tk_module
    _BRIDGE["queue"] = q

    def _pump():
        if _BRIDGE.get("root") is not root:
            return
        try:
            while True:
                task = q.get_nowait()
                try:
                    task()
                except Exception:
                    pass
        except queue.Empty:
            pass
        try:
            root.after(60, _pump)
        except Exception:
            pass

    try:
        root.after(60, _pump)
    except Exception:
        pass


def clear_main_thread_bridge() -> None:
    _BRIDGE["root"] = None
    _BRIDGE["tk"] = None
    _BRIDGE["queue"] = None


def _bridge_active() -> bool:
    return _BRIDGE.get("root") is not None and _BRIDGE.get("queue") is not None


def _make_input_widgets(tk, container, message, default_value, input_mode,
                        min_value, max_value, select_options):
    """在给定容器（Tk 或 Toplevel）内构建输入控件，返回 (read_fn, focus_widget, mode)。
    供独立窗口与主线程桥接两条路径复用，保证两种模式行为完全一致。"""
    tk.Label(container, text=message or "请输入：", wraplength=380, justify="left",
             font=("Microsoft YaHei", 10)).pack(padx=16, pady=(14, 6), anchor="w")

    widget = None
    listbox = None
    check_var = None
    scale_widget = None
    var_holder: dict[str, Any] = {}
    mode = (input_mode or "single").lower()

    if mode in ("select_single", "select_multiple") and select_options:
        listbox = tk.Listbox(container, selectmode=("multiple" if mode == "select_multiple" else "browse"),
                             height=min(10, len(select_options)), width=46, font=("Microsoft YaHei", 10))
        for opt in select_options:
            listbox.insert(tk.END, str(opt))
        listbox.pack(padx=16, pady=4)
        focus = listbox
    elif mode in ("multiline", "list"):
        widget = tk.Text(container, width=46, height=6, font=("Microsoft YaHei", 10))
        if default_value:
            widget.insert("1.0", str(default_value))
        widget.pack(padx=16, pady=4)
        focus = widget
    elif mode in ("file", "folder"):
        var = tk.StringVar(value=str(default_value or ""))
        row = tk.Frame(container)
        row.pack(padx=16, pady=4, fill="x")
        widget = tk.Entry(row, textvariable=var, width=36, font=("Microsoft YaHei", 10))
        widget.pack(side="left", fill="x", expand=True)
        var_holder["v"] = var

        def _browse():
            try:
                from tkinter import filedialog
                if mode == "folder":
                    p = filedialog.askdirectory(title="选择文件夹", parent=container)
                else:
                    p = filedialog.askopenfilename(title="选择文件", parent=container)
                if p:
                    var.set(p)
            except Exception:
                pass
        tk.Button(row, text="浏览…", command=_browse, font=("Microsoft YaHei", 9)).pack(side="left", padx=(6, 0))
        focus = widget
    elif mode == "checkbox":
        _dv = str(default_value or "").strip().lower()
        check_var = tk.BooleanVar(value=(_dv in ("1", "true", "yes", "on", "是")))
        widget = tk.Checkbutton(container, text="勾选表示是 / 取消表示否", variable=check_var, font=("Microsoft YaHei", 10))
        widget.pack(padx=16, pady=4, anchor="w")
        focus = widget
    elif mode in ("slider_int", "slider_float"):
        _lo = float(min_value) if min_value is not None else 0.0
        _hi = float(max_value) if max_value is not None else 100.0
        if _hi <= _lo:
            _hi = _lo + 100.0
        try:
            _init = float(default_value) if str(default_value or "").strip() not in ("", "None") else _lo
        except Exception:
            _init = _lo
        _res = 1 if mode == "slider_int" else 0.01
        scale_widget = tk.Scale(container, from_=_lo, to=_hi, orient="horizontal", length=320,
                                resolution=_res, font=("Microsoft YaHei", 9))
        scale_widget.set(max(_lo, min(_hi, _init)))
        scale_widget.pack(padx=16, pady=4)
        focus = scale_widget
    else:
        var = tk.StringVar(value=str(default_value or ""))
        show = "*" if mode == "password" else None
        widget = tk.Entry(container, textvariable=var, width=46, show=show, font=("Microsoft YaHei", 10))
        widget.pack(padx=16, pady=4)
        var_holder["v"] = var
        focus = widget

    def _read() -> Optional[str]:
        if listbox is not None:
            sel = [listbox.get(i) for i in listbox.curselection()]
            if mode == "select_multiple":
                return ",".join(sel)
            return sel[0] if sel else ""
        if check_var is not None:
            return "true" if check_var.get() else "false"
        if scale_widget is not None:
            v = scale_widget.get()
            return str(int(v)) if mode == "slider_int" else str(v)
        if mode in ("multiline", "list"):
            return widget.get("1.0", "end").rstrip("\n")
        return var_holder["v"].get()

    return _read, focus, mode


def _validate_input(v, required, mode, min_value, max_value):
    """校验用户输入，返回 (ok, 错误提示)。"""
    if required and (v is None or str(v).strip() == ""):
        return False, "该项为必填，请输入内容"
    if mode == "number" and v not in (None, ""):
        try:
            num = float(v)
            if min_value is not None and num < float(min_value):
                raise ValueError
            if max_value is not None and num > float(max_value):
                raise ValueError
        except ValueError:
            return False, f"请输入 {min_value}~{max_value} 之间的数字"
    return True, ""


def _request_via_bridge(title, message, default_value, input_mode, min_value, max_value,
                        required, select_options, timeout) -> Optional[str]:
    """把输入弹窗转交主线程渲染（Toplevel），后台线程阻塞等待结果。"""
    root = _BRIDGE["root"]
    tk = _BRIDGE["tk"]
    q = _BRIDGE["queue"]
    box: dict[str, Any] = {"value": None}
    done = threading.Event()

    def _task():
        try:
            win = tk.Toplevel(root)
            win.title(title or "输入")
            try:
                win.attributes("-topmost", True)
                win.transient(root)
                win.grab_set()
            except Exception:
                pass
            read, focus, mode = _make_input_widgets(tk, win, message, default_value,
                                                    input_mode, min_value, max_value, select_options)

            def _finish(val):
                box["value"] = val
                try:
                    win.grab_release()
                except Exception:
                    pass
                try:
                    win.destroy()
                except Exception:
                    pass
                done.set()

            def _ok():
                v = read()
                ok, msg = _validate_input(v, required, mode, min_value, max_value)
                if not ok:
                    try:
                        from tkinter import messagebox
                        messagebox.showwarning("提示", msg, parent=win)
                    except Exception:
                        pass
                    return
                _finish(v)

            btns = tk.Frame(win)
            btns.pack(pady=(8, 14))
            tk.Button(btns, text="确定", width=10, command=_ok).pack(side="left", padx=6)
            tk.Button(btns, text="取消", width=10, command=lambda: _finish(None)).pack(side="left", padx=6)
            win.bind("<Return>", lambda e: _ok())
            win.bind("<Escape>", lambda e: _finish(None))
            try:
                if focus is not None:
                    focus.focus_set()
            except Exception:
                pass
            if timeout and timeout > 0:
                win.after(int(timeout * 1000), lambda: _finish(None))
            win.protocol("WM_DELETE_WINDOW", lambda: _finish(None))
            try:
                win.update_idletasks()
                w = win.winfo_width(); h = win.winfo_height()
                sw = win.winfo_screenwidth(); sh = win.winfo_screenheight()
                win.geometry("+%d+%d" % (max(0, (sw - w) // 2), max(0, (sh - h) // 2)))
            except Exception:
                pass
        except Exception:
            done.set()

    try:
        q.put(_task)
    except Exception:
        return None
    done.wait(timeout=(timeout + 10) if (timeout and timeout > 0) else None)
    return box["value"]


# ---------- 用户输入弹窗（原生 tkinter）----------
def request_input_prompt_sync(variable_name: str, title: str, message: str,
                              default_value: str = "", input_mode: str = "single",
                              min_value: Optional[float] = None, max_value: Optional[float] = None,
                              max_length: Optional[int] = None, required: bool = True,
                              select_options: Optional[list] = None,
                              timeout: float = 300) -> Optional[str]:
    """用原生窗口弹出输入框并返回用户输入（取消返回 None）。"""
    # 自定义界面模式：主线程已有 Tk root 在跑，弹窗转交主线程（单一 Tcl 解释器，线程安全）
    if _bridge_active() and threading.current_thread() is not threading.main_thread():
        return _request_via_bridge(title, message, default_value, input_mode,
                                   min_value, max_value, required, select_options, timeout)

    try:
        import tkinter as tk
    except Exception:
        # 极少数无 GUI 环境：退回控制台输入
        try:
            val = input(f"{message} [{default_value}]: ").strip()
            return val or default_value
        except Exception:
            return default_value or None

    result: dict[str, Any] = {"value": None}

    root = tk.Tk()
    root.title(title or "输入")
    root.attributes("-topmost", True)
    try:
        root.eval('tk::PlaceWindow . center')
    except Exception:
        pass

    read, focus, mode = _make_input_widgets(tk, root, message, default_value,
                                            input_mode, min_value, max_value, select_options)

    def _ok():
        v = read()
        ok, msg = _validate_input(v, required, mode, min_value, max_value)
        if not ok:
            try:
                from tkinter import messagebox
                messagebox.showwarning("提示", msg)
            except Exception:
                pass
            return
        result["value"] = v
        root.destroy()

    def _cancel():
        result["value"] = None
        root.destroy()

    btns = tk.Frame(root)
    btns.pack(pady=(8, 14))
    tk.Button(btns, text="确定", width=10, command=_ok).pack(side="left", padx=6)
    tk.Button(btns, text="取消", width=10, command=_cancel).pack(side="left", padx=6)

    root.bind("<Return>", lambda e: _ok())
    root.bind("<Escape>", lambda e: _cancel())
    try:
        if focus is not None:
            focus.focus_set()
        # 超时自动关闭（避免无人值守时卡死）
        if timeout and timeout > 0:
            root.after(int(timeout * 1000), _cancel)
        root.protocol("WM_DELETE_WINDOW", _cancel)
        root.mainloop()
    except Exception:
        pass
    try:
        root.destroy()
    except Exception:
        pass
    return result["value"]


# ---------- 文本朗读（原生 TTS）----------
def request_tts_sync(text: str, lang: str = "zh", rate: float = 1.0, pitch: float = 1.0,
                     volume: float = 1.0, timeout: float = 60) -> bool:
    """打包运行下的文本朗读。依次尝试：pyttsx3 → Windows SAPI(win32com) →
    PowerShell System.Speech → comtypes SAPI。任一成功即真正发声；全部失败才打印兜底。
    （内置运行时通常无 pyttsx3，但有 pywin32，故 SAPI 路径是主力。）"""
    if not text:
        return True
    text = str(text)
    rate = float(rate or 1.0)
    volume = max(0.0, min(1.0, float(volume or 1.0)))

    # 1) pyttsx3（若运行时带了）
    try:
        import pyttsx3
        engine = pyttsx3.init()
        try:
            engine.setProperty("rate", int(200 * rate))
            engine.setProperty("volume", volume)
        except Exception:
            pass
        engine.say(text)
        engine.runAndWait()
        return True
    except Exception:
        pass

    # 2) Windows SAPI（win32com，pywin32 自带；内置运行时可用）
    try:
        import pythoncom  # type: ignore
        import win32com.client  # type: ignore
        try:
            pythoncom.CoInitialize()
        except Exception:
            pass
        speaker = win32com.client.Dispatch("SAPI.SpVoice")
        try:
            # SAPI Rate: -10~10（0 为正常）；把 0.5~2.0 倍速映射过去
            speaker.Rate = max(-10, min(10, int((rate - 1.0) * 10)))
            speaker.Volume = int(volume * 100)
        except Exception:
            pass
        speaker.Speak(text)  # 同步朗读
        return True
    except Exception:
        pass

    # 3) PowerShell System.Speech（.NET 自带，无需任何 Python 包）
    try:
        import subprocess
        safe = text.replace("'", "''")
        ps = ("Add-Type -AssemblyName System.Speech; "
              "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer; "
              "$s.Rate = %d; $s.Volume = %d; $s.Speak('%s')" % (
                  max(-10, min(10, int((rate - 1.0) * 10))), int(volume * 100), safe))
        flags = 0x08000000 if os.name == "nt" else 0  # CREATE_NO_WINDOW
        subprocess.run(["powershell", "-NoProfile", "-NonInteractive", "-Command", ps],
                       creationflags=flags, timeout=max(10, int(timeout or 60)))
        return True
    except Exception:
        pass

    # 4) comtypes SAPI 兜底
    try:
        import comtypes.client  # type: ignore
        speaker = comtypes.client.CreateObject("SAPI.SpVoice")
        speaker.Speak(text)
        return True
    except Exception:
        pass

    print(f"[朗读] {text}")
    return True


# ---------- 查看图片 / 播放音视频（调用系统默认程序）----------
def _open_local_or_url(target: str) -> bool:
    target = (target or "").strip()
    if not target:
        return False
    try:
        if target.lower().startswith(("http://", "https://")):
            webbrowser.open(target)
            return True
        # 本地路径
        path = target
        if os.path.exists(path):
            os.startfile(path)  # type: ignore[attr-defined]
            return True
        # 相对运行时目录
        rel = os.path.join(os.getcwd(), target)
        if os.path.exists(rel):
            os.startfile(rel)  # type: ignore[attr-defined]
            return True
        webbrowser.open(target)
        return True
    except Exception as e:
        print(f"[打开失败] {target}: {e}")
        return False


def request_view_image_sync(image_url: str, auto_close: bool = False, display_time: int = 0,
                            timeout: float = 300) -> dict:
    ok = _open_local_or_url(image_url)
    return {"success": ok, "error": None if ok else "无法打开图片"}


def request_play_music_sync(audio_url: str, wait_for_end: bool = False, timeout: float = 600) -> dict:
    ok = _open_local_or_url(audio_url)
    return {"success": ok, "error": None if ok else "无法播放音频"}


def request_play_video_sync(video_url: str, wait_for_end: bool = False, timeout: float = 600) -> dict:
    ok = _open_local_or_url(video_url)
    return {"success": ok, "error": None if ok else "无法播放视频"}


# ---------- 前端 JS 脚本（打包后无编辑器前端）----------
def request_js_script_sync(code: str, variables: dict, timeout: float = 30) -> dict:
    """打包运行没有编辑器前端可执行该 JS。明确返回不支持，提示改用「注入JavaScript」在自动化页面执行。"""
    return {"success": False, "result": None,
            "error": "「JS脚本」模块依赖编辑器前端，打包独立运行不支持；如需在自动化网页中执行 JS，请改用「注入JavaScript」模块。",
            "variables": variables or {}}
