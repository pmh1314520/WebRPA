# -*- coding: utf-8 -*-
"""本机请求诊断提示的单元测试

要守住的两条边界：
  · 只对「本机回环地址」给提示——对外部站点乱提"检查你的代理"是误导；
  · 只对「网关类状态码」给代理劫持的结论——404/500 是目标服务自己的响应，与代理无关。
"""
import pytest

from app.utils.local_http_diagnostics import (
    GATEWAY_STATUS_CODES,
    connect_error_hint,
    extract_host,
    gateway_error_hint,
    is_local_url,
)


@pytest.mark.parametrize("url", [
    "http://localhost:5241/api/x",
    "http://127.0.0.1:5241/api/x",
    "http://127.5.5.5/api/x",      # 整个 127.0.0.0/8 都是回环
    "http://[::1]:5241/api/x",
    "http://0.0.0.0:5241/api/x",
])
def test_local_urls_recognized(url):
    assert is_local_url(url) is True


@pytest.mark.parametrize("url", [
    "http://192.168.1.10:5241/api/x",   # 局域网 IP 走真实网卡，不适用同一套话术
    "https://example.com/api/x",
    "http://10.0.0.5/api/x",
    "",
    "not-a-url",
])
def test_non_local_urls_rejected(url):
    assert is_local_url(url) is False


def test_extract_host_is_safe_on_garbage():
    assert extract_host("") == ""
    assert extract_host("http://localhost:5241/x") == "localhost"


@pytest.mark.parametrize("code", GATEWAY_STATUS_CODES)
def test_gateway_hint_for_local_gateway_errors(code):
    """本机地址 + 网关状态码 → 必须给出代理劫持的排查指引和自测命令"""
    hint = gateway_error_hint("http://localhost:5241/api/x", code)
    assert hint
    assert str(code) in hint
    assert "直连" in hint          # 点明处置方向：把本机地址设为直连
    assert "59999" in hint        # 附带可直接执行的自测命令


@pytest.mark.parametrize("code", [200, 201, 301, 400, 404, 422, 500])
def test_no_gateway_hint_for_non_gateway_codes(code):
    """非网关状态码是目标服务自己的响应，不能扣到代理头上"""
    assert gateway_error_hint("http://localhost:5241/api/x", code) == ""


def test_no_gateway_hint_for_remote_host():
    """外部站点返回 502 属于对方的事，不应提示用户改本机代理"""
    assert gateway_error_hint("https://example.com/api/x", 502) == ""


def test_connect_hint_mentions_port_and_launcher():
    """连接被拒绝是"没人在听这个端口"，指引方向必须与网关错误不同"""
    hint = connect_error_hint("http://localhost:5241/api/x")
    assert "5241" in hint
    assert "后端端口" in hint
    assert "代理" not in hint     # 不能与代理相关的结论混淆


def test_connect_hint_skipped_for_remote_host():
    assert connect_error_hint("https://example.com/api/x") == ""
