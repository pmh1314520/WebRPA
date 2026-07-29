"""请求本机地址失败时的诊断提示。

存在的理由（一次真实排查的沉淀）：
用户机器上开着 Clash / V2Ray / Surge 这类代理软件的 TUN（虚拟网卡）或透明代理模式时，
连回环流量都可能被劫持。代理拿到 `http://localhost:5241/...` 却连不上上游，就直接回一个
502/503/504。于是现象变成「工作流里请求本机后端拿到 502，可后端访问日志里连这条请求都
没有」——本机服务根本不会产生网关类状态码，用户几乎不可能自己想到是代理的问题。

这里把判断和话术收在一处，让「API请求」「Webhook请求」「API触发器」等模块在命中该特征
时给出可直接执行的处置建议，而不是把 httpx 的原始报文甩给用户。
"""
from __future__ import annotations

import ipaddress
from urllib.parse import urlparse

# 本机服务不可能返回的网关类状态码：出现即说明中间还有一层（代理/网关）
GATEWAY_STATUS_CODES = (502, 503, 504)

_LOCAL_HOST_NAMES = {"localhost", "127.0.0.1", "0.0.0.0", "::1", "::"}

# 自测命令：把端口换成任意没在使用的端口，正常应报「连接被拒绝」而不是网关错误
_PROBE_CMD = (
    "Python313\\python.exe -c \"import httpx; "
    "print(httpx.get('http://localhost:59999/x', timeout=8).status_code)\""
)


def extract_host(url: str) -> str:
    """取出 URL 的主机名（失败返回空串）。"""
    try:
        host = urlparse(str(url or "").strip()).hostname
        return str(host or "")
    except Exception:
        return ""


def is_local_url(url: str) -> bool:
    """URL 是否指向本机回环地址（localhost / 127.0.0.0/8 / ::1）。

    只认回环，不去枚举本机网卡 IP：枚举需要解析主机名，可能阻塞，且局域网 IP 走的是
    真实网卡，被代理劫持的表现与回环不同，不适合套用同一套话术。
    """
    host = extract_host(url).strip().lower().strip("[]")
    if not host:
        return False
    if host in _LOCAL_HOST_NAMES:
        return True
    try:
        return ipaddress.ip_address(host).is_loopback
    except ValueError:
        return False


def gateway_error_hint(url: str, status_code: int) -> str:
    """本机地址返回网关类状态码时的诊断提示；不符合该特征返回空串。"""
    if int(status_code or 0) not in GATEWAY_STATUS_CODES:
        return ""
    if not is_local_url(url):
        return ""
    host = extract_host(url) or "localhost"
    return (
        f"\n\n【诊断提示】目标是本机地址（{host}），但返回了 HTTP {status_code} 网关错误。"
        f"本机服务不会产生这类状态码，说明请求在到达目标前被代理接管了。"
        f"\n成因：本机开着系统代理（Clash / V2Ray / Surge 等）时，请求被转发给代理，"
        f"代理连不上本机目标就回 {status_code}。"
        f"\n处置：在代理软件里把 127.0.0.1、localhost 加入直连规则；"
        f"或检查 http_proxy / all_proxy 等环境变量是否把本机地址也代理了。"
        f"\n自测命令（把端口换成任意未使用的端口，正常应报「连接被拒绝」而不是 {status_code}）："
        f"\n  {_PROBE_CMD}"
    )


def connect_error_hint(url: str) -> str:
    """本机地址连不上时的诊断提示；非本机地址返回空串。

    与网关错误是两种截然不同的故障，处置建议也必须不同：这里是「没人在听这个端口」，
    引导用户核对服务是否启动、端口是否与启动器里配置的一致。
    """
    if not is_local_url(url):
        return ""
    parsed_port = ""
    try:
        port = urlparse(str(url or "").strip()).port
        parsed_port = str(port) if port else ""
    except Exception:
        parsed_port = ""
    port_text = f"（端口 {parsed_port}）" if parsed_port else ""
    return (
        f"\n\n【诊断提示】连接本机地址{port_text}被拒绝，说明该端口上没有服务在监听。"
        "\n请核对：① WebRPA 后端是否已启动；② 地址里的端口是否与启动器「设置」里的"
        "后端端口一致（改过端口后，请用「编辑计划任务」弹窗里显示的完整地址，那里是按"
        "当前端口拼好的）。"
    )
