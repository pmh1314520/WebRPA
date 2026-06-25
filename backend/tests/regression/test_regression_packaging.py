# -*- coding: utf-8 -*-
"""后端历史缺陷回归用例（打包 / DP 反检测 / 媒体）。

沉淀以下历史 bug 的复现与修正断言：
- DP 浏览器全局单例残留：工作流结束应能 cleanup_dp 关闭，失活页面应被检测并重建。
- 打包产物 autoClose：build_runner_script 生成的引导脚本须包含 autoClose 自动收尾逻辑。
- 打包后媒体扩展名：无扩展名 URL 须按响应 Content-Type 推断正确扩展名（音频 → .mp3）。
"""
import os

import pytest

pytestmark = pytest.mark.regression


# ---------------------------------------------------------------------------
# DP 单例残留与失活检测
# ---------------------------------------------------------------------------

class _FakeAliveState:
    def __init__(self, alive):
        self.is_alive = alive


class _FakePage:
    def __init__(self, alive=True):
        self.states = _FakeAliveState(alive)
        self.quit_called = False

    def quit(self):
        self.quit_called = True


def test_dp_is_alive_detects_state():
    from app.executors import drissionpage as dp

    assert dp._is_alive(None) is False
    assert dp._is_alive(_FakePage(alive=True)) is True
    assert dp._is_alive(_FakePage(alive=False)) is False


def test_dp_cleanup_closes_singleton(monkeypatch):
    """用过 DP 后，cleanup_dp 必须关闭浏览器并清空单例，避免残留到下次运行复用脏状态。"""
    from app.executors import drissionpage as dp

    fake = _FakePage(alive=True)
    monkeypatch.setattr(dp, "_dp_page", fake, raising=False)
    monkeypatch.setattr(dp, "_dp_used", True, raising=False)

    closed = dp.cleanup_dp()

    assert closed is True
    assert fake.quit_called is True
    assert dp._dp_page is None


def test_dp_get_page_drops_dead_singleton(monkeypatch):
    """复用模式下若单例已失活，应先彻底关闭旧页面（不复用死页面）。"""
    from app.executors import drissionpage as dp

    dead = _FakePage(alive=False)
    monkeypatch.setattr(dp, "_dp_page", dead, raising=False)
    monkeypatch.setattr(dp, "_dp_used", True, raising=False)

    # create=False：失活页面被关闭后返回 None（不会触发真实浏览器创建）
    result = dp._get_page(create=False, reuse=True)

    assert result is None
    assert dead.quit_called is True
    assert dp._dp_page is None


# ---------------------------------------------------------------------------
# 打包 autoClose
# ---------------------------------------------------------------------------

def test_runner_script_contains_autoclose():
    from app.services.workflow_packager import build_runner_script

    script = build_runner_script()
    assert isinstance(script, str) and script
    # 引导脚本须内置 autoClose 读取与自动收尾逻辑
    assert "autoClose" in script
    assert "_auto_close" in script


# ---------------------------------------------------------------------------
# 打包后媒体扩展名按 Content-Type 推断
# ---------------------------------------------------------------------------

class _FakeResp:
    def __init__(self, data, ctype):
        self._data = data
        self.headers = {"Content-Type": ctype}

    def read(self):
        return self._data

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


def test_media_extension_inferred_from_content_type(monkeypatch):
    """无扩展名的音频接口 URL 应按 Content-Type 推断为 .mp3，而非 .tmp。"""
    import urllib.request

    from app.services import packaged_ui

    monkeypatch.setattr(
        urllib.request, "urlopen",
        lambda req, timeout=60: _FakeResp(b"ID3fake-audio-bytes", "audio/mpeg"),
    )

    path = packaged_ui._download_to_temp("http://music.example.com/song?id=123", kind="audio")
    try:
        assert path is not None
        assert path.lower().endswith(".mp3")
        assert os.path.isfile(path)
    finally:
        if path and os.path.isfile(path):
            os.remove(path)


def test_media_extension_default_by_kind(monkeypatch):
    """无扩展名且 Content-Type 未命中映射时，按用途给默认扩展名（视频 → .mp4）。"""
    import urllib.request

    from app.services import packaged_ui

    monkeypatch.setattr(
        urllib.request, "urlopen",
        lambda req, timeout=60: _FakeResp(b"binarydata", "application/octet-stream"),
    )

    path = packaged_ui._download_to_temp("http://cdn.example.com/stream", kind="video")
    try:
        assert path is not None
        assert path.lower().endswith(".mp4")
    finally:
        if path and os.path.isfile(path):
            os.remove(path)
