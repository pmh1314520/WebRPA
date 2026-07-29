# -*- coding: utf-8 -*-
"""httpx 代理绕过判定的单元测试

守住的核心行为：本机地址一律直连，公网地址仍沿用系统/环境代理。
背景：httpx 只读 getproxies()、不查 proxy_bypass()，在开着系统代理的 Windows 上会把
localhost 请求也发给代理并拿到 502（同一地址 requests 却能成功）。
"""
import pytest

from app.utils.http_client import trust_env_for


@pytest.mark.parametrize("url", [
    "http://localhost:5241/api/scheduled-tasks/webhook/webhook/001",
    "http://127.0.0.1:5241/api/x",
    "http://127.0.0.1:3000/get_login_info",
    "http://[::1]:5241/api/x",
])
def test_local_targets_never_use_proxy(url):
    """访问本机服务必须直连，否则会被系统代理接管并返回 502"""
    assert trust_env_for(url) is False


@pytest.mark.parametrize("url", [
    "https://api.openai.com/v1/chat/completions",
    "https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal",
    "http://example.com/webhook",
])
def test_remote_targets_keep_env_proxy(url):
    """公网地址仍要沿用系统/环境代理，否则会弄坏依赖代理访问外网的用户"""
    assert trust_env_for(url) is True


def test_blank_url_defaults_to_env_proxy():
    """取不到主机名时不做特殊处理，保持 httpx 默认行为"""
    assert trust_env_for("") is True
    assert trust_env_for("not-a-url") is True


def test_survives_broken_proxy_bypass(monkeypatch):
    """proxy_bypass 在个别环境会抛异常，不能因此影响请求；回环判断继续兜底"""
    import urllib.request

    def _boom(_host):
        raise OSError("proxy_bypass unavailable")

    monkeypatch.setattr(urllib.request, "proxy_bypass", _boom)
    assert trust_env_for("http://localhost:5241/api/x") is False
    assert trust_env_for("https://api.openai.com/v1/x") is True
