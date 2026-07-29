# -*- coding: utf-8 -*-
"""Word 自动化的真实 COM 冒烟测试（需本机安装 Word / WPS）。

为什么必须有这一层：
Word 模块的核心缺陷都是「COM 调用返回成功、实际什么都没发生」这一类，纯逻辑单测
完全测不出来。曾经出现过 Find.Execute(Replace=2) 返回 True 却一处都没替换，模块
照样报告「已替换 N 处」而文件一字未动。只有真跑一遍 COM 并回读磁盘才能守住。

默认跳过（会启动 Word 进程、耗时约 1 分钟），需要时显式开启：
    set WEBRPA_WORD_E2E=1
    Python313\\python.exe -m pytest backend/tests/integration/test_word_com_smoke.py -v
"""
import asyncio
import os

import pytest

pytestmark = pytest.mark.skipif(
    os.environ.get("WEBRPA_WORD_E2E", "").strip() not in ("1", "true", "yes"),
    reason="真实 COM 冒烟测试默认跳过；设置 WEBRPA_WORD_E2E=1 后运行",
)


def _read_docx(path: str):
    """独立读回磁盘内容（不复用被测会话，确保校验的是真正落盘的结果）"""
    from app.executors import word_automation as W

    import gc

    W._com_init()
    app, _engine = W._create_word_app(visible=False)
    doc = None
    try:
        doc = app.Documents.Open(os.path.abspath(path), ReadOnly=True)
        text = str(doc.Content.Text)
        doc.Close(0)
        return text
    finally:
        # 与生产代码同一套释放纪律：文档代理先放，再退引擎，最后放引擎代理
        doc = None
        gc.collect()
        try:
            app.Quit()
        except Exception:
            pass
        app = None
        gc.collect()
        W._com_uninit()


@pytest.fixture()
def doc_path(tmp_path):
    return str(tmp_path / "smoke.docx")


def test_replace_actually_lands_on_disk(doc_path):
    """替换必须真正写入磁盘——这是「报告成功但文件没变」缺陷的守门断言"""
    from app.executors.base import ExecutionContext
    from app.executors import word_automation as W

    async def _run():
        ctx = ExecutionContext()
        r = await W.WordOpenExecutor().execute(
            {"filePath": doc_path, "docKey": "d", "visible": False}, ctx)
        assert r.success, r.error
        r = await W.WordWriteTextExecutor().execute(
            {"docKey": "d", "text": "你好世界世界", "writeMode": "replace_all"}, ctx)
        assert r.success, r.error
        r = await W.WordReplaceTextExecutor().execute(
            {"docKey": "d", "findText": "世界", "replaceText": "WORLD",
             "replaceAll": True, "resultVariable": "n"}, ctx)
        assert r.success, r.error
        assert ctx.get_variable("n") == 2
        r = await W.WordSaveExecutor().execute({"docKey": "d"}, ctx)
        assert r.success, r.error
        r = await W.WordCloseExecutor().execute({"docKey": "d", "saveChanges": True}, ctx)
        assert r.success, r.error

    asyncio.run(_run())
    text = _read_docx(doc_path)
    assert "WORLD" in text, f"替换未落盘: {text!r}"
    assert "世界" not in text, f"原文本仍在: {text!r}"


def test_readonly_document_rejects_write_modules(doc_path):
    """只读文档上的替换必须快速失败，不能返回误导性的成功"""
    from app.executors.base import ExecutionContext
    from app.executors import word_automation as W

    async def _run():
        ctx = ExecutionContext()
        r = await W.WordOpenExecutor().execute(
            {"filePath": doc_path, "docKey": "d", "visible": False}, ctx)
        assert r.success, r.error
        await W.WordWriteTextExecutor().execute(
            {"docKey": "d", "text": "内容", "writeMode": "replace_all"}, ctx)
        await W.WordSaveExecutor().execute({"docKey": "d"}, ctx)
        await W.WordCloseExecutor().execute({"docKey": "d", "saveChanges": True}, ctx)

        ro = ExecutionContext()
        r = await W.WordOpenExecutor().execute(
            {"filePath": doc_path, "docKey": "ro", "visible": False, "readOnly": True}, ro)
        assert r.success, r.error
        r = await W.WordReplaceTextExecutor().execute(
            {"docKey": "ro", "findText": "内容", "replaceText": "X"}, ro)
        assert not r.success
        assert "只读" in (r.error or "")
        await W.WordCloseExecutor().execute({"docKey": "ro", "saveChanges": True}, ro)

    asyncio.run(_run())


def test_stale_lock_file_does_not_force_readonly(doc_path):
    """残留 ~$ 锁文件必须被清理并按可写打开；关闭后不留锁文件、不留引擎进程"""
    from app.executors.base import ExecutionContext
    from app.executors import word_automation as W

    async def _prepare():
        ctx = ExecutionContext()
        r = await W.WordOpenExecutor().execute(
            {"filePath": doc_path, "docKey": "d", "visible": False}, ctx)
        assert r.success, r.error
        await W.WordWriteTextExecutor().execute(
            {"docKey": "d", "text": "原始内容", "writeMode": "replace_all"}, ctx)
        await W.WordSaveExecutor().execute({"docKey": "d"}, ctx)
        await W.WordCloseExecutor().execute({"docKey": "d", "saveChanges": True}, ctx)

    asyncio.run(_prepare())

    # 造一个上次异常退出残留的锁文件
    lock = os.path.join(os.path.dirname(doc_path), "~$" + os.path.basename(doc_path))
    with open(lock, "wb"):
        pass

    async def _run():
        ctx = ExecutionContext()
        r = await W.WordOpenExecutor().execute(
            {"filePath": doc_path, "docKey": "d2", "visible": False}, ctx)
        assert r.success, r.error
        # 关键断言：不能因为残留锁文件被降级成只读（那会让写入类模块全部失效）
        assert (r.data or {}).get("readOnly") is False
        r = await W.WordReplaceTextExecutor().execute(
            {"docKey": "d2", "findText": "原始内容", "replaceText": "已替换",
             "replaceAll": True}, ctx)
        assert r.success, r.error
        r = await W.WordCloseExecutor().execute({"docKey": "d2", "saveChanges": True}, ctx)
        assert r.success, r.error

    asyncio.run(_run())
    # 打开期间 Word 会自建锁文件，故只在关闭后校验
    assert not os.path.exists(lock), "关闭后仍残留 ~$ 锁文件"
    assert "已替换" in _read_docx(doc_path)


def test_close_leaves_no_engine_process(doc_path):
    """关闭后本会话启动的引擎进程必须已退出（COM 引用需在其所属线程内释放）"""
    from app.executors.base import ExecutionContext
    from app.executors import word_automation as W

    session_pids = []

    async def _run():
        ctx = ExecutionContext()
        r = await W.WordOpenExecutor().execute(
            {"filePath": doc_path, "docKey": "d", "visible": False}, ctx)
        assert r.success, r.error
        session_pids.extend(getattr(ctx, "_word_docs", {})["d"].get("pids") or [])
        r = await W.WordCloseExecutor().execute({"docKey": "d", "saveChanges": False}, ctx)
        assert r.success, r.error

    asyncio.run(_run())
    assert session_pids, "未记录本会话的引擎进程 PID，进程兜底将失效"
    assert W._alive_engine_pids(session_pids) == [], "关闭后引擎进程仍残留"
