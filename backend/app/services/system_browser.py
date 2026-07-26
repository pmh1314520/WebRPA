"""按 WebRPA 浏览器配置打开 URL 的系统浏览器服务。

背景：计划任务开启「打开监控页」时，原先用标准库 `webbrowser.open()` 打开监控页，
走的是**系统默认浏览器**；而自动化本身通过 `browser_config_store.get_browser_config()`
跑在用户于「全局配置 → 浏览器」里选定的浏览器上。两者割裂会导致"自动化在 Edge 里跑、
监控页却开在 Chrome"这类观感不一致。

本模块职责单一：**按用户选定的浏览器打开一个 URL**。

与 `app/executors/drissionpage.py` 的私有 `_resolve_browser_path()` 的区别：
后者的语义是"给 DrissionPage 挑一个能用的 Chromium 内核浏览器（可回落到另一种内核）"，
本模块的语义是"尊重用户选择打开一个 URL"。语义不同，因此路径表在本模块内独立定义，
不 import executor 的私有实现（避免职责耦合，也避免把 executor 拖进回归面）。

注意：本模块**不**服务于「打开网址」业务模块（`app/api/system_dialog.py`），
那里的语义就是"用系统默认浏览器打开用户指定网址"，不应改动。
"""
from __future__ import annotations

import os
import subprocess
import webbrowser

from app.services import browser_config_store

# 浏览器标准安装位置（Windows）。本模块内独立定义，不复用 executor 的私有副本。
_EDGE_PATHS = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
]
_CHROME_PATHS = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    os.path.join(
        os.environ.get("LOCALAPPDATA", ""), r"Google\Chrome\Application\chrome.exe"
    ),
]

# 浏览器配置的 type 取值 → 候选路径表。chromium 与 chrome 同内核，共用 Chrome 路径表。
_PATHS_BY_TYPE = {
    "msedge": _EDGE_PATHS,
    "edge": _EDGE_PATHS,
    "chrome": _CHROME_PATHS,
    "chromium": _CHROME_PATHS,
}


def resolve_configured_browser_executable() -> str:
    """按「全局配置 → 浏览器」解析浏览器可执行文件路径，解析不出返回空串。

    优先级：配置的 executablePath（存在且是文件）→ 按 type 在标准安装位置探测 → 空串。
    """
    try:
        cfg = browser_config_store.get_browser_config() or {}
    except Exception as e:
        print(f"[SystemBrowser] 读取浏览器配置失败: {e}")
        return ""

    explicit = str(cfg.get("executablePath") or "").strip().strip('"')
    if explicit and os.path.isfile(explicit):
        return explicit

    browser_type = str(cfg.get("type") or "").strip().lower()
    for candidate in _PATHS_BY_TYPE.get(browser_type, []):
        if candidate and os.path.isfile(candidate):
            return candidate

    return ""


def open_url_in_configured_browser(url: str) -> bool:
    """用用户配置的浏览器打开 URL；解析失败或启动失败时回落系统默认浏览器。

    返回是否**用配置的浏览器**成功打开（回落到系统默认浏览器成功也返回 False）。

    这里的回落属于能力降级而非掩盖错误：每一级失败都有明确日志，
    且"打不开监控页"绝不应影响计划任务本身的执行。
    """
    exe = resolve_configured_browser_executable()
    if exe:
        try:
            subprocess.Popen(
                [exe, url],
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
            )
            return True
        except Exception as e:
            print(f"[SystemBrowser] 用配置的浏览器打开失败({exe}): {e}，回落系统默认浏览器")
    else:
        print("[SystemBrowser] 未解析到配置的浏览器可执行文件，回落系统默认浏览器")

    try:
        webbrowser.open(url)
    except Exception as e:
        print(f"[SystemBrowser] 回落系统默认浏览器也失败: {e}")
    return False
