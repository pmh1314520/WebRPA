# -*- coding: utf-8 -*-
"""主动外发通知服务

用于「计划任务/工作流执行失败」时主动推送通知。支持多种渠道：
- email       邮件（SMTP）
- wecom       企业微信群机器人（webhook）
- dingtalk    钉钉群机器人（webhook，可选加签）
- serverchan  Server酱（SendKey）
- webhook     自定义 HTTP 回调（POST JSON）

每个渠道的配置见各 send_* 函数。所有发送都做异常隔离，失败只记录日志、不影响主流程。
凭据字段（如 SMTP 口令、机器人 key）支持 {{cred:名称.字段}} 引用，发送前会被解析。
"""
from __future__ import annotations

import json
import time
import hmac
import hashlib
import base64
import urllib.parse
from typing import Dict, Any, List


def _resolve_secret(value: str) -> str:
    """解析配置里的凭据引用 {{cred:名称.字段}}（若有）"""
    if not isinstance(value, str) or '{{' not in value:
        return value
    try:
        import re
        from app.services import credential_manager

        def _r(m):
            ref = m.group(1).strip()
            if '.' in ref:
                cname, fld = ref.split('.', 1)
            else:
                cname, fld = ref, 'value'
            val = credential_manager.get_field(cname.strip(), fld.strip())
            return val if val is not None else m.group(0)

        return re.sub(r'\{\{\s*(?:cred|凭据)\s*[:：]\s*([^{}]+?)\s*\}\}', _r, value)
    except Exception:
        return value


def _send_email(cfg: Dict[str, Any], title: str, content: str) -> Dict[str, Any]:
    import smtplib
    from email.mime.text import MIMEText
    from email.header import Header

    smtp_server = _resolve_secret(str(cfg.get("smtp_server", "")))
    smtp_port = int(cfg.get("smtp_port", 465) or 465)
    username = _resolve_secret(str(cfg.get("username", "")))
    password = _resolve_secret(str(cfg.get("password", "")))
    to_addrs = cfg.get("to") or username
    use_ssl = bool(cfg.get("use_ssl", True))
    if isinstance(to_addrs, str):
        to_list = [a.strip() for a in to_addrs.replace(";", ",").split(",") if a.strip()]
    else:
        to_list = list(to_addrs)
    if not smtp_server or not username or not to_list:
        return {"success": False, "error": "邮件配置不完整（smtp_server/username/to）"}

    msg = MIMEText(content, "plain", "utf-8")
    msg["Subject"] = Header(title, "utf-8")
    msg["From"] = username
    msg["To"] = ",".join(to_list)

    if use_ssl:
        server = smtplib.SMTP_SSL(smtp_server, smtp_port, timeout=20)
    else:
        server = smtplib.SMTP(smtp_server, smtp_port, timeout=20)
        try:
            server.starttls()
        except Exception:
            pass
    try:
        server.login(username, password)
        server.sendmail(username, to_list, msg.as_string())
    finally:
        try:
            server.quit()
        except Exception:
            pass
    return {"success": True}


def _http_post_json(url: str, payload: dict, timeout: int = 15) -> Dict[str, Any]:
    import requests
    resp = requests.post(url, json=payload, timeout=timeout)
    ok = 200 <= resp.status_code < 300
    return {"success": ok, "status": resp.status_code, "body": resp.text[:500]}


def _send_wecom(cfg: Dict[str, Any], title: str, content: str) -> Dict[str, Any]:
    key = _resolve_secret(str(cfg.get("key", "")))
    url = cfg.get("webhook") or (
        f"https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key={key}" if key else ""
    )
    if not url:
        return {"success": False, "error": "企业微信缺少 key/webhook"}
    text = f"{title}\n{content}"
    return _http_post_json(url, {"msgtype": "text", "text": {"content": text}})


def _send_dingtalk(cfg: Dict[str, Any], title: str, content: str) -> Dict[str, Any]:
    token = _resolve_secret(str(cfg.get("access_token", "")))
    url = cfg.get("webhook") or (
        f"https://oapi.dingtalk.com/robot/send?access_token={token}" if token else ""
    )
    if not url:
        return {"success": False, "error": "钉钉缺少 access_token/webhook"}
    secret = _resolve_secret(str(cfg.get("secret", "")))
    if secret:
        ts = str(round(time.time() * 1000))
        string_to_sign = f"{ts}\n{secret}"
        sign = base64.b64encode(
            hmac.new(secret.encode("utf-8"), string_to_sign.encode("utf-8"), hashlib.sha256).digest()
        ).decode("utf-8")
        url = f"{url}&timestamp={ts}&sign={urllib.parse.quote_plus(sign)}"
    text = f"{title}\n{content}"
    return _http_post_json(url, {"msgtype": "text", "text": {"content": text}})


def _send_serverchan(cfg: Dict[str, Any], title: str, content: str) -> Dict[str, Any]:
    sendkey = _resolve_secret(str(cfg.get("sendkey", "")))
    if not sendkey:
        return {"success": False, "error": "Server酱缺少 sendkey"}
    url = f"https://sctapi.ftqq.com/{sendkey}.send"
    import requests
    resp = requests.post(url, data={"title": title, "desp": content}, timeout=15)
    return {"success": 200 <= resp.status_code < 300, "status": resp.status_code}


def _send_webhook(cfg: Dict[str, Any], title: str, content: str) -> Dict[str, Any]:
    url = _resolve_secret(str(cfg.get("url", "")))
    if not url:
        return {"success": False, "error": "自定义 Webhook 缺少 url"}
    payload = {"title": title, "content": content, "source": "WebRPA"}
    extra = cfg.get("extra")
    if isinstance(extra, dict):
        payload.update(extra)
    return _http_post_json(url, payload)


def _send_feishu(cfg: Dict[str, Any], title: str, content: str) -> Dict[str, Any]:
    """飞书自定义机器人 webhook。支持可选加签 secret。"""
    url = _resolve_secret(str(cfg.get("webhook", "") or cfg.get("url", "")))
    if not url:
        return {"success": False, "error": "飞书缺少 webhook"}
    text = f"{title}\n{content}"
    payload: Dict[str, Any] = {"msg_type": "text", "content": {"text": text}}
    secret = _resolve_secret(str(cfg.get("secret", "")))
    if secret:
        ts = str(int(time.time()))
        string_to_sign = f"{ts}\n{secret}"
        sign = base64.b64encode(
            hmac.new(string_to_sign.encode("utf-8"), digestmod=hashlib.sha256).digest()
        ).decode("utf-8")
        payload["timestamp"] = ts
        payload["sign"] = sign
    return _http_post_json(url, payload)


def _send_qq(cfg: Dict[str, Any], title: str, content: str) -> Dict[str, Any]:
    """QQ（NapCat / OneBot HTTP）。cfg: {target_type:'private'|'group', target_id, api_url}"""
    api_url = (str(cfg.get("api_url", "")).strip() or "http://localhost:3000").rstrip("/")
    target_type = (cfg.get("target_type") or "private").lower()
    target_id = cfg.get("target_id")
    if not target_id:
        return {"success": False, "error": "QQ 缺少 target_id"}
    text = f"{title}\n{content}"
    try:
        tid = int(str(target_id).strip())
    except Exception:
        return {"success": False, "error": "QQ target_id 必须是数字"}
    if target_type == "group":
        return _http_post_json(f"{api_url}/send_group_msg", {"group_id": tid, "message": text})
    return _http_post_json(f"{api_url}/send_private_msg", {"user_id": tid, "message": text})


_SENDERS = {
    "email": _send_email,
    "wecom": _send_wecom,
    "dingtalk": _send_dingtalk,
    "serverchan": _send_serverchan,
    "webhook": _send_webhook,
    "feishu": _send_feishu,
    "qq": _send_qq,
}


def send_via_channel(channel: Dict[str, Any], title: str, content: str) -> Dict[str, Any]:
    """按单个渠道配置发送。channel 形如 {type, ...渠道参数}"""
    ctype = (channel or {}).get("type", "")
    sender = _SENDERS.get(ctype)
    if not sender:
        return {"success": False, "error": f"未知通知渠道：{ctype}"}
    try:
        return sender(channel, title, content)
    except Exception as e:
        return {"success": False, "error": str(e)}


def notify_all(channels: List[Dict[str, Any]], title: str, content: str) -> List[Dict[str, Any]]:
    """向多个渠道发送，返回各渠道结果（异常隔离）"""
    results = []
    for ch in (channels or []):
        if not isinstance(ch, dict) or not ch.get("enabled", True):
            continue
        res = send_via_channel(ch, title, content)
        res["type"] = ch.get("type", "")
        results.append(res)
        try:
            tag = "成功" if res.get("success") else f"失败: {res.get('error') or res.get('status')}"
            print(f"[Notifier] 渠道 {ch.get('type')} 发送{tag}")
        except Exception:
            pass
    return results
