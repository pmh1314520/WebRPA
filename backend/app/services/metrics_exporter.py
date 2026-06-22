# -*- coding: utf-8 -*-
"""Prometheus 指标导出

把 WebRPA 的运行/集群/队列/计划任务/审计/审批等关键指标以 Prometheus 文本曝光格式输出，
便于接入 Prometheus + Grafana + Alertmanager 等标准监控栈，做企业级可观测与告警。

访问 GET /metrics 即可被 Prometheus 抓取。
"""
from __future__ import annotations

from typing import Any


class _Builder:
    def __init__(self) -> None:
        self.lines: list[str] = []

    def metric(self, name: str, value: Any, *, mtype: str = "gauge",
               help_text: str = "", labels: dict[str, str] | None = None) -> None:
        if help_text:
            self.lines.append(f"# HELP {name} {help_text}")
        self.lines.append(f"# TYPE {name} {mtype}")
        self._sample(name, value, labels)

    def sample(self, name: str, value: Any, labels: dict[str, str] | None = None) -> None:
        self._sample(name, value, labels)

    def _sample(self, name: str, value: Any, labels: dict[str, str] | None) -> None:
        try:
            v = float(value)
        except Exception:
            v = 0.0
        if labels:
            lbl = ",".join(f'{k}="{_esc(str(val))}"' for k, val in labels.items())
            self.lines.append(f"{name}{{{lbl}}} {_fmt(v)}")
        else:
            self.lines.append(f"{name} {_fmt(v)}")

    def text(self) -> str:
        return "\n".join(self.lines) + "\n"


def _esc(s: str) -> str:
    return s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", " ")


def _fmt(v: float) -> str:
    return str(int(v)) if v == int(v) else repr(v)


def build_metrics() -> str:
    b = _Builder()
    b.metric("webrpa_up", 1, help_text="WebRPA 后端存活")

    # 执行历史（全时计数器 + 近窗口指标）
    try:
        from app.services import execution_history
        allt = execution_history.get_stats(days=36500).get("overview", {})
        b.metric("webrpa_workflow_runs_total", allt.get("success", 0), mtype="counter",
                 help_text="工作流运行累计次数（按状态）", labels={"status": "success"})
        b.sample("webrpa_workflow_runs_total", allt.get("failed", 0), {"status": "failed"})
        b.sample("webrpa_workflow_runs_total", allt.get("stopped", 0), {"status": "stopped"})

        recent = execution_history.get_stats(days=1).get("overview", {})
        b.metric("webrpa_workflow_success_rate", recent.get("success_rate", 0),
                 help_text="近 1 天工作流成功率(%)")
        b.metric("webrpa_workflow_avg_duration_ms", recent.get("avg_ms", 0),
                 help_text="近 1 天平均执行耗时(ms)")
        b.metric("webrpa_workflow_runs_recent", recent.get("total", 0),
                 help_text="近 1 天运行次数")
    except Exception as e:
        b.metric("webrpa_execution_scrape_error", 1, help_text=f"执行指标采集异常: {_esc(str(e))[:80]}")

    # 集群
    try:
        from app.services import orchestrator
        ov = orchestrator.fleet_overview()
        b.metric("webrpa_cluster_nodes", ov.get("nodes_online", 0),
                 help_text="集群节点数（按状态）", labels={"state": "online"})
        b.sample("webrpa_cluster_nodes", ov.get("nodes_total", 0), {"state": "total"})
        b.metric("webrpa_cluster_capacity", ov.get("capacity", 0), help_text="集群总并发容量")
        b.metric("webrpa_cluster_load", ov.get("current_load", 0), help_text="集群当前负载")
        b.metric("webrpa_cluster_utilization", ov.get("utilization", 0), help_text="集群利用率(0-1)")
        tasks = ov.get("tasks", {}) or {}
        if tasks:
            b.metric("webrpa_cluster_tasks", 0, help_text="集群任务数（按状态）",
                     labels={"status": "_init"})
            b.lines.pop()  # 去掉占位样本，仅保留 HELP/TYPE
            for st, cnt in tasks.items():
                b.sample("webrpa_cluster_tasks", cnt, {"status": st})
    except Exception as e:
        b.metric("webrpa_cluster_scrape_error", 1, help_text=f"集群指标采集异常: {_esc(str(e))[:80]}")

    # 运行队列
    try:
        from app.services import run_queue
        q = run_queue.overview()
        b.metric("webrpa_run_queue_running", q.get("running", 0), help_text="运行队列执行中任务数")
        b.metric("webrpa_run_queue_queued", q.get("queued", 0), help_text="运行队列排队任务数")
        b.metric("webrpa_run_queue_max_concurrency", q.get("max_concurrency", 0),
                 help_text="运行队列最大并发")
    except Exception:
        pass

    # 计划任务
    try:
        from app.services.scheduled_task_manager import scheduled_task_manager
        tasks = scheduled_task_manager.list_tasks()
        b.metric("webrpa_scheduled_tasks", len(tasks), help_text="计划任务数（按状态）",
                 labels={"state": "total"})
        b.sample("webrpa_scheduled_tasks", sum(1 for t in tasks if t.enabled), {"state": "enabled"})
    except Exception:
        pass

    # 审计 / 审批
    try:
        from app.services import audit_log
        b.metric("webrpa_audit_records_total", audit_log.verify_chain().get("count", 0),
                 mtype="counter", help_text="当前活动审计日志记录数")
    except Exception:
        pass
    try:
        from app.services import approval_center
        b.metric("webrpa_pending_approvals", len(approval_center.list_requests("pending")),
                 help_text="待处理审批数")
    except Exception:
        pass

    return b.text()
