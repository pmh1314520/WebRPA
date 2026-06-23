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
import webbrowser
from typing import Any, Optional


# ---------- 用户输入弹窗（原生 tkinter）----------
def request_input_prompt_sync(variable_name: str, title: str, message: str,
                              default_value: str = "", input_mode: str = "single",
                              min_value: Optional[float] = None, max_value: Optional[float] = None,
                              max_length: Optional[int] = None, required: bool = True,
                              select_options: Optional[list] = None,
                              timeout: float = 300) -> Optional[str]:
    """用原生窗口弹出输入框并返回用户输入（取消返回 None）。"""
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

    tk.Label(root, text=message or "请输入：", wraplength=380, justify="left",
             font=("Microsoft YaHei", 10)).pack(padx=16, pady=(14, 6), anchor="w")

    widget = None
    listbox = None
    check_var = None
    scale_widget = None
    mode = (input_mode or "single").lower()

    if mode in ("select_single", "select_multiple") and select_options:
        listbox = tk.Listbox(root, selectmode=("multiple" if mode == "select_multiple" else "browse"),
                             height=min(10, len(select_options)), width=46, font=("Microsoft YaHei", 10))
        for opt in select_options:
            listbox.insert(tk.END, str(opt))
        listbox.pack(padx=16, pady=4)
    elif mode in ("multiline", "list"):
        widget = tk.Text(root, width=46, height=6, font=("Microsoft YaHei", 10))
        if default_value:
            widget.insert("1.0", str(default_value))
        widget.pack(padx=16, pady=4)
    elif mode in ("file", "folder"):
        # 选文件 / 选文件夹：输入框 + 浏览按钮（原生文件对话框）
        var = tk.StringVar(value=str(default_value or ""))
        row = tk.Frame(root)
        row.pack(padx=16, pady=4, fill="x")
        widget = tk.Entry(row, textvariable=var, width=36, font=("Microsoft YaHei", 10))
        widget.pack(side="left", fill="x", expand=True)
        widget._var = var  # type: ignore

        def _browse():
            try:
                from tkinter import filedialog
                if mode == "folder":
                    p = filedialog.askdirectory(title=title or "选择文件夹")
                else:
                    p = filedialog.askopenfilename(title=title or "选择文件")
                if p:
                    var.set(p)
            except Exception:
                pass
        tk.Button(row, text="浏览…", command=_browse, font=("Microsoft YaHei", 9)).pack(side="left", padx=(6, 0))
    elif mode == "checkbox":
        _dv = str(default_value or "").strip().lower()
        check_var = tk.BooleanVar(value=(_dv in ("1", "true", "yes", "on", "是")))
        widget = tk.Checkbutton(root, text="勾选表示是 / 取消表示否", variable=check_var, font=("Microsoft YaHei", 10))
        widget.pack(padx=16, pady=4, anchor="w")
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
        scale_widget = tk.Scale(root, from_=_lo, to=_hi, orient="horizontal", length=320,
                                resolution=_res, font=("Microsoft YaHei", 9))
        scale_widget.set(max(_lo, min(_hi, _init)))
        scale_widget.pack(padx=16, pady=4)
    else:
        var = tk.StringVar(value=str(default_value or ""))
        show = "*" if mode == "password" else None
        widget = tk.Entry(root, textvariable=var, width=46, show=show, font=("Microsoft YaHei", 10))
        widget.pack(padx=16, pady=4)
        widget._var = var  # type: ignore

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
        return widget._var.get()  # type: ignore

    def _ok():
        v = _read()
        if required and (v is None or str(v).strip() == ""):
            try:
                from tkinter import messagebox
                messagebox.showwarning("提示", "该项为必填，请输入内容")
            except Exception:
                pass
            return
        if mode == "number" and v not in (None, ""):
            try:
                num = float(v)
                if min_value is not None and num < float(min_value):
                    raise ValueError
                if max_value is not None and num > float(max_value):
                    raise ValueError
            except ValueError:
                try:
                    from tkinter import messagebox
                    messagebox.showwarning("提示", f"请输入 {min_value}~{max_value} 之间的数字")
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
        if widget is not None:
            widget.focus_set()
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
    if not text:
        return True
    try:
        import pyttsx3
        engine = pyttsx3.init()
        try:
            engine.setProperty("rate", int(200 * float(rate or 1.0)))
            engine.setProperty("volume", max(0.0, min(1.0, float(volume or 1.0))))
        except Exception:
            pass
        engine.say(str(text))
        engine.runAndWait()
        return True
    except Exception:
        # 无 TTS 引擎时不让工作流失败，打印出来即可
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
