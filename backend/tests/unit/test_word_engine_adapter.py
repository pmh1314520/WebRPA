# -*- coding: utf-8 -*-
"""Word 自动化引擎适配层单元测试

覆盖不依赖本机 Word / WPS 的纯逻辑部分：
  - 引擎 ProgID 候选表的形状约束
  - 引擎名归一化（app.Name 各版本返回值不统一）
  - 保存 / 导出 PDF 的双路回退链
  - 两类失败（引擎缺失 vs PDF 接口不可用）的错误文案互斥性
  - 文档会话结构（含 engine 字段）与跨模块共享用的单线程 COM 宿主
"""
import asyncio

import pytest

from app.executors.word_automation import (
    WD_FORMAT_PDF,
    WordError,
    _WORD_PROGIDS,
    _create_word_app,
    _export_doc_pdf,
    _normalize_engine_name,
    _save_doc_as,
)


# ---------------- 引擎候选表 ----------------

def test_progid_candidates_shape():
    """候选表恰含 3 项，首项为 Word.Application"""
    assert len(_WORD_PROGIDS) == 3
    assert _WORD_PROGIDS[0][0] == "Word.Application"


def test_progid_candidates_no_case_only_duplicates():
    """COM ProgID 查表大小写不敏感：不允许出现仅大小写不同的重复项（否则白跑失败尝试）"""
    lowered = [p.lower() for p, _ in _WORD_PROGIDS]
    assert len(lowered) == len(set(lowered))


def test_progid_candidates_labels_non_empty():
    """每个候选都要有非空的兜底显示名"""
    assert all(isinstance(label, str) and label.strip() for _, label in _WORD_PROGIDS)


# ---------------- 引擎名归一化 ----------------

@pytest.mark.parametrize("raw,expected", [
    ("Microsoft Word", "Microsoft Word"),
    ("MICROSOFT WORD", "Microsoft Word"),
    ("WPS Writer", "WPS 文字"),
    ("Kingsoft WPS", "WPS 文字"),
    ("wps", "WPS 文字"),
])
def test_normalize_engine_name_known(raw, expected):
    assert _normalize_engine_name(raw, "兜底") == expected


def test_normalize_engine_name_unknown_kept():
    """未知但非空的名称原样保留，便于排查真实引擎"""
    assert _normalize_engine_name("SomeOtherWriter", "兜底") == "SomeOtherWriter"


@pytest.mark.parametrize("raw", ["", "   ", None, 123, object()])
def test_normalize_engine_name_fallback(raw):
    """空 / None / 非字符串一律回落到 fallback，且结果恒为非空字符串"""
    result = _normalize_engine_name(raw, "兜底名")
    assert result == "兜底名"
    assert isinstance(result, str) and result


def test_normalize_engine_name_always_non_empty():
    for raw in ["Microsoft Word", "WPS Writer", "X", "", None, 0]:
        assert _normalize_engine_name(raw, "兜底名")


# ---------------- 假 COM 对象 ----------------

class _FakeDoc:
    """可配置的假文档：按需让指定方法抛异常，并记录调用顺序与落盘目标"""

    def __init__(self, fail: tuple = (), missing: tuple = ()):
        self.fail = set(fail)
        self.missing = set(missing)
        self.calls: list[tuple] = []
        for name in self.missing:
            # 模拟该版本不提供此方法（pywin32 动态派发下表现为属性缺失）
            setattr(self, name, None)

    def _record(self, name, path, fmt=None):
        self.calls.append((name, path, fmt))
        if name in self.fail:
            raise RuntimeError(f"{name} 不可用")

    def SaveAs2(self, path, fmt=None):
        self._record("SaveAs2", path, fmt)

    def SaveAs(self, path, fmt=None):
        self._record("SaveAs", path, fmt)

    def ExportAsFixedFormat(self, OutputFileName=None, ExportFormat=None):
        self.calls.append(("ExportAsFixedFormat", OutputFileName, ExportFormat))
        if "ExportAsFixedFormat" in self.fail:
            raise RuntimeError("ExportAsFixedFormat 不可用")


# ---------------- 保存回退链 ----------------

def test_save_prefers_saveas2(tmp_path):
    doc = _FakeDoc()
    target = str(tmp_path / "a.docx")
    _save_doc_as(doc, target)
    assert [c[0] for c in doc.calls] == ["SaveAs2"]


def test_save_falls_back_to_saveas(tmp_path):
    """WPS 常只提供 SaveAs：SaveAs2 失败必须自动回退，且目标路径不变"""
    doc = _FakeDoc(fail=("SaveAs2",))
    target = str(tmp_path / "a.docx")
    _save_doc_as(doc, target)
    names = [c[0] for c in doc.calls]
    assert names == ["SaveAs2", "SaveAs"]
    import os
    assert doc.calls[-1][1] == os.path.abspath(target)


def test_save_both_fail_keeps_all_reasons(tmp_path):
    """两条路都失败时必须同时保留两次失败原因（不得丢弃首因）"""
    doc = _FakeDoc(fail=("SaveAs2", "SaveAs"))
    with pytest.raises(WordError) as ei:
        _save_doc_as(doc, str(tmp_path / "a.docx"))
    msg = str(ei.value)
    assert "SaveAs2" in msg and "SaveAs" in msg


# ---------------- PDF 导出回退链 ----------------

def test_pdf_format_constant_is_17():
    """wdExportFormatPDF 与 wdFormatPDF 数值同为 17，两条回退路径共用该常量"""
    assert WD_FORMAT_PDF == 17


def test_pdf_prefers_export_as_fixed_format(tmp_path):
    doc = _FakeDoc()
    out = str(tmp_path / "a.pdf")
    assert _export_doc_pdf(doc, out).endswith("a.pdf")
    assert doc.calls[0][0] == "ExportAsFixedFormat"


def test_pdf_falls_back_to_saveas(tmp_path):
    """ExportAsFixedFormat 不通时回退 SaveAs(PDF)，目标路径保持一致"""
    import os
    doc = _FakeDoc(fail=("ExportAsFixedFormat",))
    out = str(tmp_path / "a.pdf")
    result = _export_doc_pdf(doc, out)
    assert result == os.path.abspath(out)
    assert [c[0] for c in doc.calls][0] == "ExportAsFixedFormat"
    assert "SaveAs2" in [c[0] for c in doc.calls] or "SaveAs" in [c[0] for c in doc.calls]


def test_pdf_both_fail_uses_pdf_specific_message(tmp_path):
    """两条路都失败时必须给 PDF 专属文案，而不是"去装软件/开接口"那套引擎缺失文案"""
    doc = _FakeDoc(fail=("ExportAsFixedFormat", "SaveAs2", "SaveAs"))
    with pytest.raises(WordError) as ei:
        _export_doc_pdf(doc, str(tmp_path / "a.pdf"))
    msg = str(ei.value)
    assert "个人免费版" in msg
    # 引擎缺失专属引导语不得混入
    assert "配置和修复工具" not in msg


# ---------------- 两类错误文案互斥 ----------------

def test_engine_missing_message_is_distinct(monkeypatch, tmp_path):
    """所有 ProgID 都创建失败时，给的是"装软件/开接口"引导，且不含 PDF 专属措辞"""
    import win32com.client  # type: ignore

    def _always_fail(prog_id):
        raise RuntimeError(f"{prog_id} 未注册")

    monkeypatch.setattr(win32com.client, "DispatchEx", _always_fail)
    with pytest.raises(WordError) as ei:
        _create_word_app(visible=False)
    msg = str(ei.value)
    assert "配置和修复工具" in msg
    assert "个人免费版" not in msg
    # 每个候选的尝试记录都应出现，便于排查
    for prog_id, _ in _WORD_PROGIDS:
        assert prog_id in msg


def test_create_word_app_uses_actual_engine_name(monkeypatch):
    """WPS 接管 Word.Application 时，引擎名要按 app.Name 报成 WPS，而非按 ProgID 猜成 Word"""
    import win32com.client  # type: ignore

    class _FakeApp:
        Name = "WPS Writer"
        Visible = False
        DisplayAlerts = 1

    monkeypatch.setattr(win32com.client, "DispatchEx", lambda prog_id: _FakeApp())
    app, engine = _create_word_app(visible=True)
    assert engine == "WPS 文字"
    assert isinstance(app, _FakeApp)


def test_create_word_app_falls_back_when_name_unreadable(monkeypatch):
    """app.Name 读不到时回落到候选表兜底名，不能因此失败"""
    import win32com.client  # type: ignore

    class _NoName:
        @property
        def Name(self):
            raise RuntimeError("不支持 Name")

    monkeypatch.setattr(win32com.client, "DispatchEx", lambda prog_id: _NoName())
    _app, engine = _create_word_app(visible=False)
    assert engine == _WORD_PROGIDS[0][1]


# ---------------- 会话结构与单线程 COM 宿主 ----------------

def test_session_records_engine_and_worker():
    """会话需带 engine（供导出 PDF 等模块回显）与 worker（跨模块共享文档的线程宿主）"""
    from app.executors.base import ExecutionContext
    from app.executors.word_automation import _get_session, _put_session

    ctx = ExecutionContext()
    _put_session(ctx, "default", object(), object(), "D:/a.docx", worker=None, engine="WPS 文字")
    sess = _get_session(ctx, "default")
    assert sess["engine"] == "WPS 文字"
    assert set(sess.keys()) >= {"app", "doc", "path", "worker", "engine"}


def test_session_operations_stay_on_one_thread():
    """同一文档会话的所有调用必须落在同一线程，否则 COM 套间失效（报 Open.Content）"""
    import threading

    from app.executors.word_automation import _WordWorker, _run_in_session

    async def _run():
        worker = _WordWorker()
        session = {"app": object(), "doc": object(), "path": "", "worker": worker, "engine": ""}
        try:
            return [await _run_in_session(session, threading.get_ident) for _ in range(5)]
        finally:
            worker.close()

    tids = asyncio.run(_run())
    assert len(set(tids)) == 1


def test_detect_lock_file_returns_name_and_empty(tmp_path):
    """锁文件探测：存在则返回锁文件名，不存在返回空串，删除后恢复为空"""
    from app.executors.word_automation import _detect_lock_file

    doc = tmp_path / "报告.docx"
    doc.write_bytes(b"")
    assert _detect_lock_file(str(doc)) == ""

    lock = tmp_path / "~$报告.docx"
    lock.write_bytes(b"")
    assert _detect_lock_file(str(doc)) == "~$报告.docx"

    lock.unlink()
    assert _detect_lock_file(str(doc)) == ""


def test_detect_lock_file_matches_truncated_form(tmp_path):
    """长文件名的锁文件会截掉前两个字符，这种形态也要能识别"""
    from app.executors.word_automation import _detect_lock_file

    doc = tmp_path / "百日誓师大会演讲稿.docx"
    doc.write_bytes(b"")
    lock = tmp_path / "~$誓师大会演讲稿.docx"
    lock.write_bytes(b"")
    assert _detect_lock_file(str(doc)) == "~$誓师大会演讲稿.docx"


def test_detect_lock_file_missing_file_is_safe(tmp_path):
    """探测不存在的文件不应抛异常"""
    from app.executors.word_automation import _detect_lock_file

    assert _detect_lock_file(str(tmp_path / "不存在.docx")) == ""


def test_write_lock_probe_on_free_file(tmp_path):
    """无进程持有时写锁探测应返回 False（据此区分真占用与残留锁文件）"""
    from app.executors.word_automation import _is_file_write_locked

    f = tmp_path / "a.docx"
    f.write_bytes(b"")
    assert _is_file_write_locked(str(f)) is False


def test_missing_session_gives_actionable_error():
    """未打开文档就调用其它 Word 模块时，要提示先用「打开/新建Word」"""
    from app.executors.base import ExecutionContext
    from app.executors.word_automation import _get_session

    with pytest.raises(WordError) as ei:
        _get_session(ExecutionContext(), "")
    assert "打开" in str(ei.value)
