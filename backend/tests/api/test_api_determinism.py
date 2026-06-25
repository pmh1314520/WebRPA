# -*- coding: utf-8 -*-
"""API 隔离/确定性守护测试。

Property 11: 测试确定且隔离 —— 被测端点执行过程中不得发起对外部主机的真实网络调用。
做法：拦截 socket 连接与 requests/urllib 出口，断言期间未对非本机地址发起真实请求。
"""
import socket

import pytest

pytestmark = pytest.mark.api

# 只读、无副作用的端点集合，用于驱动一次请求以观察是否触发外部网络
_READONLY_PATHS = [
    "/api/system/module-required-fields",
    "/api/security/status",
]

_LOOPBACK = {"127.0.0.1", "::1", "localhost", "0.0.0.0"}


def test_endpoints_make_no_real_external_socket_calls(client, monkeypatch):
    attempts = []
    real_connect = socket.socket.connect

    def _guard_connect(self, address):
        try:
            host = address[0] if isinstance(address, (tuple, list)) else str(address)
        except Exception:
            host = str(address)
        if str(host) not in _LOOPBACK:
            attempts.append(host)
        return real_connect(self, address)

    monkeypatch.setattr(socket.socket, "connect", _guard_connect, raising=True)

    for path in _READONLY_PATHS:
        resp = client.get(path)
        assert resp.status_code < 500

    assert attempts == [], f"检测到对外部主机的真实网络连接: {attempts}"


def test_endpoints_do_not_invoke_urllib_or_requests(client, monkeypatch):
    calls = []

    import urllib.request

    def _blocked_urlopen(*args, **kwargs):
        calls.append(("urllib", args[:1]))
        raise AssertionError("测试期间不应发起真实 urllib 网络请求")

    monkeypatch.setattr(urllib.request, "urlopen", _blocked_urlopen, raising=True)

    try:
        import requests

        def _blocked_send(self, request, *a, **k):
            calls.append(("requests", getattr(request, "url", "")))
            raise AssertionError("测试期间不应发起真实 requests 网络请求")

        monkeypatch.setattr(requests.adapters.HTTPAdapter, "send", _blocked_send, raising=True)
    except Exception:
        pass  # requests 未安装则跳过该出口拦截

    for path in _READONLY_PATHS:
        resp = client.get(path)
        assert resp.status_code < 500

    assert calls == [], f"检测到真实出站网络调用: {calls}"
