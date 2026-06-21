"""失败告警中心

工作流跑挂时，按配置的渠道（邮件 / 企业微信 / 钉钉 / 飞书 / QQ / Server酱 / 自定义 Webhook）
主动推送告警，让半夜跑批也能第一时间知道。底层复用 notifier.py 的多渠道发送。

还包含「重试策略」配置：工作流即 API / CLI / 计划任务在失败时可按此策略自动重跑。

配置存储：backend/data/alert_config.json
"""

from __future__ import annotations

import json
import threading
from datetime import datetime
from pathlib import Path
from typing import Any

from app.services.notifier import notify_all

_LOCK = threading.Lock()

_DEFAULT_CONFIG: dict[str, Any] = {
    "enabled": False,
    "notify_on": "failure",          # failure（仅失败）/ always（每次都通知）
    "channels": [],                   # [{type, enabled, ...渠道参数}]
    "retry": {
        "enabled": False,
        "max_retries": 1,            # 失败后最多重跑次数
        "delay_seconds": 5,          # 每次重跑前等待秒数
    },
}


def _config_file() -> Path:
    folder = Path("backend/data")
    folder.mkdir(parents=True, exist_ok=True)
    return folder / "alert_config.json"


def get_config() -> dict[str, Any]:
    f = _config_file()
    if not f.exists():
        return dict(_DEFAULT_CONFIG)
    try:
        data = json.loads(f.read_text(encoding="utf-8"))
        # 合并默认值，保证字段齐全
        cfg = dict(_DEFAULT_CONFIG)
        cfg.update(data or {})
        retry = dict(_DEFAULT_CONFIG["retry"])
        retry.update((data or {}).get("retry") or {})
        cfg["retry"] = retry
        return cfg
    except Exception:
        return dict(_DEFAULT_CONFIG)


def save_config(cfg: dict[str, Any]) -> dict[str, Any]:
    with _LOCK:
        merged = get_config()
        merged.update(cfg or {})
        if "retry" in (cfg or {}) and isinstance(cfg["retry"], dict):
            r = dict(_DEFAULT_CONFIG["retry"])
            r.update(merged.get("retry") or {})
            r.update(cfg["retry"])
            merged["retry"] = r
        _config_file().write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf-8")
    return merged


def get_retry_policy() -> dict[str, Any]:
    """供执行入口（API/CLI/计划任务）读取重试策略。"""
    return get_config().get("retry") or dict(_DEFAULT_CONFIG["retry"])


def _build_message(record: dict[str, Any]) -> tuple[str, str]:
    name = record.get("workflow_name", "（未命名）")
    status = record.get("status", "failed")
    status_cn = {"failed": "执行失败", "success": "执行成功", "stopped": "已停止"}.get(status, status)
    title = f"【WebRPA 告警】{name} {status_cn}"
    dur = record.get("duration_ms", 0)
    lines = [
        f"工作流：{name}",
        f"状态：{status_cn}",
        f"来源：{record.get('source', 'editor')}",
        f"耗时：{dur} ms",
        f"已执行节点：{record.get('executed_nodes', 0)}，失败节点：{record.get('failed_nodes', 0)}",
        f"时间：{record.get('ts', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))}",
    ]
    if record.get("error"):
        lines.append(f"错误：{record['error']}")
    return title, "\n".join(lines)


def dispatch_alert(record: dict[str, Any]) -> dict[str, Any]:
    """根据配置决定是否发送告警，并执行发送。供执行完成后调用（异常隔离）。"""
    try:
        cfg = get_config()
        if not cfg.get("enabled"):
            return {"sent": False, "reason": "告警未启用"}
        notify_on = cfg.get("notify_on", "failure")
        status = (record.get("status") or "").lower()
        if notify_on == "failure" and status != "failed":
            return {"sent": False, "reason": "仅失败时通知，本次非失败"}
        channels = [c for c in (cfg.get("channels") or []) if isinstance(c, dict) and c.get("enabled", True)]
        if not channels:
            return {"sent": False, "reason": "未配置任何启用的渠道"}
        title, content = _build_message(record)
        results = notify_all(channels, title, content)
        ok = sum(1 for r in results if r.get("success"))
        return {"sent": True, "channels": len(channels), "ok": ok, "results": results}
    except Exception as e:
        print(f"[alert_center] 发送告警异常: {e}")
        return {"sent": False, "error": str(e)}


def test_alert() -> dict[str, Any]:
    """发送一条测试告警，验证渠道配置是否正确。"""
    cfg = get_config()
    channels = [c for c in (cfg.get("channels") or []) if isinstance(c, dict) and c.get("enabled", True)]
    if not channels:
        return {"sent": False, "reason": "未配置任何启用的渠道"}
    results = notify_all(channels, "【WebRPA】告警测试", "这是一条来自 WebRPA 告警中心的测试消息，收到即说明渠道配置正确。")
    ok = sum(1 for r in results if r.get("success"))
    return {"sent": True, "channels": len(channels), "ok": ok, "results": results}
