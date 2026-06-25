# -*- coding: utf-8 -*-
"""Playwright/Python 脚本导出器：每种模块导出后能编译（快照式冒烟）"""
import py_compile
import tempfile
import os

from app.services.playwright_exporter import export_workflow_to_playwright


def _compile_ok(code: str) -> bool:
    fd, path = tempfile.mkstemp(suffix=".py")
    os.close(fd)
    try:
        with open(path, "w", encoding="utf-8") as f:
            f.write(code)
        py_compile.compile(path, doraise=True)
        return True
    finally:
        os.remove(path)


def test_export_mixed_modules_compiles():
    wf = {
        "name": "导出测试",
        "nodes": [
            {"id": "1", "type": "open_page", "data": {"label": "打开", "url": "https://example.com"}},
            {"id": "2", "type": "compress_image", "data": {"inputPath": "a.png", "outputPath": "b.jpg", "quality": 70}},
            {"id": "3", "type": "click_text", "data": {"text": "登录"}},
            {"id": "4", "type": "ai_chat", "data": {"userPrompt": "你好", "variableName": "ans"}},
            {"id": "5", "type": "qr_generate", "data": {"content": "hi", "savePath": "q.png"}},
            {"id": "6", "type": "share_folder", "data": {"folder": ".", "port": 8011}},
            {"id": "7", "type": "screen_record", "data": {"outputPath": "s.mp4", "duration": 5}},
            {"id": "8", "type": "some_unknown_module", "data": {"foo": "bar"}},
        ],
        "edges": [
            {"id": f"e{i}", "source": str(i), "target": str(i + 1)} for i in range(1, 8)
        ],
    }
    code = export_workflow_to_playwright(wf)
    assert "pass  # TODO" not in code
    assert _compile_ok(code)


def test_export_empty_workflow_compiles():
    code = export_workflow_to_playwright({"name": "空", "nodes": [], "edges": []})
    assert _compile_ok(code)


# 历史缺陷回归基线：整文件归入 regression 层
import pytest as _pytest_reg
pytestmark = _pytest_reg.mark.regression
