"""httpx 代理行为矫正。

背景（一次真实故障的根因）：
httpx 解析系统代理时只调用 `urllib.request.getproxies()`，拿到 Windows 注册表里的
代理地址就直接用，**不会检查 `proxy_bypass()`**——也就是完全无视 Windows 代理设置里的
「跳过以下地址」列表（默认含 `localhost;127.*;192.168.*` 等）。

于是在开着代理软件的机器上：
  · requests / 浏览器 → 会查 proxy_bypass()，localhost 直连，正常；
  · httpx            → 把 http://localhost:5241/... 也塞给代理，代理连不上就回 502。

表现为「同一个地址，Python脚本模块能请求成功，API触发器/Webhook请求却报 502」，
而且后端访问日志里根本没有这条请求。这里把 proxy_bypass 的判断补回去，让 httpx 的
行为与 requests、浏览器保持一致。

注意：只对「应当绕过代理」的目标关闭 trust_env。访问公网 API 时仍沿用系统/环境代理，
否则会把用户依赖代理访问外网的场景弄坏。
"""
from __future__ import annotations

from app.utils.local_http_diagnostics import extract_host, is_local_url


def trust_env_for(url: str) -> bool:
    """该 URL 是否应沿用系统/环境代理设置。

    返回 False 表示「必须直连」，调用方需把它传给 httpx 的 trust_env 参数：
        async with httpx.AsyncClient(trust_env=trust_env_for(url)) as client: ...

    判定顺序：
      1. 系统 bypass 列表命中（Windows 代理设置的「跳过以下地址」）→ 直连；
      2. 回环地址 → 直连（兜底：即便用户把 localhost 从 bypass 列表里删了，
         访问本机服务也不该绕一趟外部代理）。
    """
    host = extract_host(url)
    if not host:
        return True
    try:
        from urllib.request import proxy_bypass
        if proxy_bypass(host):
            return False
    except Exception:
        # proxy_bypass 在个别环境会抛异常，不能因此影响请求，交给下面的回环判断兜底
        pass
    return not is_local_url(url)
