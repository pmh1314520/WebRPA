"""无头浏览器统一启动器
所有需要 Playwright 无头模式的模块（AI 助手 probe_page / Firecrawl 类抓取等）
都应当通过本模块启动，避免要求用户额外执行 `playwright install chromium`。

启动顺序（优先级从高到低）：
  1. 系统 Microsoft Edge（Win10+ 自带，channel='msedge'）
  2. 系统 Google Chrome（channel='chrome'）
  3. Playwright 内置 Chromium（要求用户跑过 playwright install chromium）

使用方式：
    async with launch_headless_chromium() as browser:
        ctx = await browser.new_context(...)
        ...

如果三种都失败，抛 RuntimeError 并给出清晰的修复建议。
"""
from __future__ import annotations
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional


DEFAULT_LAUNCH_ARGS = ["--no-sandbox", "--disable-blink-features=AutomationControlled"]


async def _try_launch(pw, channel: Optional[str], extra_args: Optional[list[str]] = None):
    """按指定 channel 尝试启动；成功返回 browser，失败返回 None"""
    args = list(DEFAULT_LAUNCH_ARGS)
    if extra_args:
        args.extend(extra_args)
    # 并入反自动化检测启动参数（降低浏览器层面的自动化指纹）
    try:
        from app.services import stealth as _stealth
        args = _stealth.merge_stealth_args(args)
    except Exception:
        pass
    kwargs = {"headless": True, "args": args}
    if channel:
        kwargs["channel"] = channel
    try:
        return await pw.chromium.launch(**kwargs), None
    except Exception as e:
        return None, str(e)


@asynccontextmanager
async def launch_headless_chromium(
    extra_args: Optional[list[str]] = None,
) -> AsyncGenerator:
    """异步上下文管理器：自动选择可用的 Chromium 内核浏览器并启动

    Yields:
        playwright.async_api.Browser
    Raises:
        RuntimeError 三种内核全部启动失败时
    """
    try:
        from playwright.async_api import async_playwright
    except ImportError as e:
        raise RuntimeError(
            "playwright Python 包未安装。请运行：\n"
            "  Python313\\python.exe -m pip install playwright"
        ) from e

    async with async_playwright() as pw:
        browser = None
        errs = []
        # 优先用系统 Edge / Chrome（不需要 ms-playwright Chromium）
        for ch in ("msedge", "chrome", None):
            b, err = await _try_launch(pw, ch, extra_args)
            if b is not None:
                browser = b
                break
            errs.append(f"{ch or 'chromium'}: {err}")

        if browser is None:
            raise RuntimeError(
                "无法启动 Chromium 内核浏览器（已依次尝试系统 Edge / 系统 Chrome / 内置 Chromium）。\n"
                "可能原因：系统 Edge/Chrome 正在更新或被占用。\n"
                "建议：① 确认 Microsoft Edge 或 Google Chrome 已安装且可正常打开；\n"
                "      ② 关闭其他占用浏览器的进程后重试。\n"
                f"详细错误：{' | '.join(errs)}"
            )

        try:
            yield browser
        finally:
            try:
                await browser.close()
            except Exception:
                pass
