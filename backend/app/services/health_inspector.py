# -*- coding: utf-8 -*-
"""平台自动体检器

聚合巡检集群/执行成功率/失败 TOP/审批积压/审计链/会话/健康探针/告警配置，
生成分级中文巡检报告。支持后台定时自动体检：达到通知级别时经告警中心主动推送。

配置：backend/data/health_inspect.json
  {enabled, interval_minutes, notify_on: 'error'|'warning'}
"""
from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import Any, Optional
from app.utils.paths import BACKEND_DATA_DIR

_CONFIG_FILE = BACKEND_DATA_DIR / "health_inspect.json"
_DEFAULT = {"enabled": False, "interval_minutes": 60, "notify_on": "error"}
_loop_task = None


def get_config() -> dict[str, Any]:
    try:
        if _CONFIG_FILE.exists():
            cfg = dict(_DEFAULT)
            cfg.update(json.loads(_CONFIG_FILE.read_text(encoding="utf-8")) or {})
            return cfg
    except Exception:
        pass
    return dict(_DEFAULT)


def set_config(cfg: dict[str, Any]) -> dict[str, Any]:
    _CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
    merged = get_config()
    merged.update(cfg or {})
    merged["interval_minutes"] = max(5, int(merged.get("interval_minutes", 60)))
    if merged.get("notify_on") not in ("error", "warning"):
        merged["notify_on"] = "error"
    _CONFIG_FILE.write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf-8")
    return merged


def run_inspection(days: int = 7) -> dict[str, Any]:
    """执行一次体检，返回 {health, errors, warnings, findings[], report_markdown}。"""
    findings: list[dict[str, str]] = []

    def add(level: str, item: str, detail: str):
        findings.append({"level": level, "item": item, "detail": detail})

    # 1. 集群
    try:
        from app.services import orchestrator
        ov = orchestrator.fleet_overview()
        nodes = orchestrator.list_nodes()
        offline = [n["name"] for n in nodes if n.get("status") == "offline"]
        tasks = ov.get("tasks", {})
        if nodes and ov.get("nodes_online", 0) == 0:
            add("error", "集群", f"已注册 {len(nodes)} 台执行机但全部离线")
        elif offline:
            add("warning", "集群", f"{len(offline)} 台执行机离线：{', '.join(offline[:5])}")
        if (ov.get("utilization") or 0) >= 0.9:
            add("warning", "集群", f"集群利用率高达 {round(ov['utilization'] * 100)}%，可能需扩容")
        if tasks.get("failed"):
            add("warning", "集群", f"{tasks['failed']} 个集群任务处于失败终态")
    except Exception as e:
        add("warning", "集群", f"巡检异常：{e}")

    # 2. 执行成功率 / 失败 TOP
    try:
        from app.services import execution_history
        st = execution_history.get_stats(days=days)
        ovr = st.get("overview", {})
        sr = ovr.get("success_rate")
        if sr is not None and ovr.get("total", 0) > 0 and sr < 80:
            add("error" if sr < 50 else "warning", "执行成功率",
                f"近 {days} 天成功率仅 {sr}%（{ovr.get('failed', 0)}/{ovr.get('total', 0)} 失败）")
        ftop = st.get("failure_top", [])
        if ftop:
            top = ftop[0]
            add("warning", "失败 TOP",
                f"最不稳定：{top.get('workflow_name')} 失败 {top.get('failed')}/{top.get('runs')} 次")
    except Exception as e:
        add("info", "执行历史", f"暂无统计或异常：{e}")

    # 3. 待审批积压
    try:
        from app.services import approval_center
        pending = approval_center.list_requests("pending")
        if len(pending) >= 5:
            add("warning", "审批", f"待审批积压 {len(pending)} 条，请尽快处理")
        elif pending:
            add("info", "审批", f"有 {len(pending)} 条待审批")
    except Exception as e:
        add("info", "审批", f"巡检异常：{e}")

    # 4. 审计链
    try:
        from app.services import audit_log
        chain = audit_log.verify_chain()
        if chain.get("valid") is False:
            add("error", "审计", f"审计哈希链异常（疑似被篡改），断裂于 #{chain.get('broken_at')}")
    except Exception as e:
        add("info", "审计", f"巡检异常：{e}")

    # 5. 会话
    try:
        from app.services import rbac
        sess = rbac.list_active_sessions()
        if len(sess) >= 50:
            add("warning", "会话", f"当前活动会话多达 {len(sess)} 个，留意异常登录")
    except Exception:
        pass

    # 6. 健康探针
    try:
        from app.services import health_probes
        probes = health_probes.list_probes().get("probes", [])
        bad = [p for p in probes if p.get("consecutive_failures") or p.get("last_status") == "failed"]
        if bad:
            add("error", "健康探针",
                f"{len(bad)} 个探针处于失败状态：{', '.join(p.get('name', '?') for p in bad[:5])}")
    except Exception:
        pass

    # 7. 告警配置
    try:
        from app.services import alert_center
        if not (alert_center.get_config() or {}).get("enabled"):
            add("info", "告警", "失败告警未启用，建议在告警中心配置渠道，跑批失败可第一时间感知")
    except Exception:
        pass

    errors = [f for f in findings if f["level"] == "error"]
    warns = [f for f in findings if f["level"] == "warning"]
    health = "异常" if errors else ("需关注" if warns else "良好")
    icon = {"error": "[严重]", "warning": "[注意]", "info": "[提示]"}
    lines = ["# WebRPA 平台体检报告",
             f"总体健康：{health}（{len(errors)} 严重 / {len(warns)} 注意）", ""]
    if findings:
        for f in findings:
            lines.append(f"- {icon.get(f['level'], '')} 【{f['item']}】{f['detail']}")
    else:
        lines.append("- 未发现明显问题，平台运行良好。")
    return {"health": health, "errors": len(errors), "warnings": len(warns),
            "findings": findings, "report_markdown": "\n".join(lines)}


def _should_notify(result: dict[str, Any], notify_on: str) -> bool:
    if notify_on == "warning":
        return result.get("errors", 0) > 0 or result.get("warnings", 0) > 0
    return result.get("errors", 0) > 0


def inspect_and_maybe_notify() -> dict[str, Any]:
    """执行一次体检；若达到通知级别，经告警中心推送。供后台循环与手动触发复用。"""
    cfg = get_config()
    result = run_inspection()
    try:
        if _should_notify(result, cfg.get("notify_on", "error")):
            from app.services import alert_center
            alert_center.notify_event("【WebRPA 平台体检】发现需关注的问题",
                                      result.get("report_markdown", ""))
            result["notified"] = True
    except Exception as e:
        print(f"[health_inspector] 体检通知失败: {e}")
    return result


def start_inspector_loop() -> None:
    """启动后台定时体检循环（幂等）。按配置间隔运行，未启用时空转等待。"""
    global _loop_task
    if _loop_task is not None and not _loop_task.done():
        return

    async def _loop():
        # 启动后稍等，避开启动高峰
        await asyncio.sleep(60)
        while True:
            try:
                cfg = get_config()
                interval = max(5, int(cfg.get("interval_minutes", 60)))
                if cfg.get("enabled"):
                    res = inspect_and_maybe_notify()
                    if res.get("errors") or res.get("warnings"):
                        print(f"[health_inspector] 定时体检：{res['health']}"
                              f"（{res['errors']}严重/{res['warnings']}注意）")
                await asyncio.sleep(interval * 60)
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[health_inspector] 体检循环异常: {e}")
                await asyncio.sleep(300)

    try:
        _loop_task = asyncio.create_task(_loop())
        print("[health_inspector] 平台自动体检循环已启动")
    except RuntimeError:
        _loop_task = None
