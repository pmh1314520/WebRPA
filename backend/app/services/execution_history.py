"""工作流执行历史与统计（执行仪表盘的数据底座）

记录每一次工作流运行（来源：编辑器手动运行 / 计划任务 / 工作流即 API / CLI），
为「执行仪表盘」提供：运行历史、成功率、平均耗时趋势、失败 TOP 排行。

存储：backend/data/execution_history.jsonl（append-only，自动滚动保留最近 N 条）。
轻量、零外部依赖，服务重启后数据仍在。
"""

from __future__ import annotations

import json
import threading
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Optional

_LOCK = threading.Lock()
_MAX_RECORDS = 5000  # 最多保留最近 5000 条，超出自动裁剪


def _data_dir() -> Path:
    folder = Path("backend/data")
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def _history_file() -> Path:
    return _data_dir() / "execution_history.jsonl"


def record_run(
    *,
    workflow_name: str,
    workflow_id: str = "",
    status: str,
    duration_ms: int = 0,
    executed_nodes: int = 0,
    failed_nodes: int = 0,
    error: str = "",
    source: str = "editor",
    started_at: Optional[float] = None,
    extra: Optional[dict] = None,
) -> dict[str, Any]:
    """记录一次运行。status: success / failed / stopped。source: editor/scheduled/api/cli。"""
    now = time.time()
    _status = (status or "unknown").lower()
    if _status in ("completed", "complete", "ok", "done"):
        _status = "success"
    rec = {
        "id": f"{int(now * 1000)}_{abs(hash(workflow_name)) % 100000}",
        "workflow_name": workflow_name or "（未命名）",
        "workflow_id": workflow_id or "",
        "status": _status,
        "duration_ms": int(duration_ms or 0),
        "executed_nodes": int(executed_nodes or 0),
        "failed_nodes": int(failed_nodes or 0),
        "error": (error or "")[:500],
        "source": source or "editor",
        "started_at": started_at or now,
        "finished_at": now,
        "ts": datetime.fromtimestamp(now).strftime("%Y-%m-%d %H:%M:%S"),
    }
    if extra:
        rec["extra"] = extra
    try:
        with _LOCK:
            f = _history_file()
            with open(f, "a", encoding="utf-8") as fp:
                fp.write(json.dumps(rec, ensure_ascii=False) + "\n")
            _maybe_trim(f)
    except Exception as e:
        print(f"[execution_history] 记录失败: {e}")
    return rec


def _maybe_trim(f: Path) -> None:
    """超出上限时裁剪到最近 _MAX_RECORDS 条。"""
    try:
        lines = f.read_text(encoding="utf-8").splitlines()
        if len(lines) > _MAX_RECORDS + 500:  # 留缓冲，避免每次都重写
            keep = lines[-_MAX_RECORDS:]
            f.write_text("\n".join(keep) + "\n", encoding="utf-8")
    except Exception:
        pass


def _load_all() -> list[dict[str, Any]]:
    f = _history_file()
    if not f.exists():
        return []
    out: list[dict[str, Any]] = []
    try:
        for line in f.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                out.append(json.loads(line))
            except Exception:
                continue
    except Exception:
        return []
    return out


def list_runs(
    *,
    limit: int = 100,
    workflow_name: str = "",
    status: str = "",
    source: str = "",
) -> list[dict[str, Any]]:
    """列出运行历史（最新在前），支持按 工作流名/状态/来源 过滤。"""
    runs = _load_all()
    if workflow_name:
        runs = [r for r in runs if workflow_name.lower() in (r.get("workflow_name", "").lower())]
    if status:
        runs = [r for r in runs if r.get("status") == status.lower()]
    if source:
        runs = [r for r in runs if r.get("source") == source]
    runs.sort(key=lambda r: r.get("finished_at", 0), reverse=True)
    return runs[: max(1, min(int(limit or 100), 1000))]


def get_stats(*, days: int = 7) -> dict[str, Any]:
    """汇总统计：总览 + 成功率 + 每日耗时/次数趋势 + 失败 TOP 排行。"""
    runs = _load_all()
    cutoff = time.time() - max(1, int(days or 7)) * 86400
    recent = [r for r in runs if r.get("finished_at", 0) >= cutoff]

    total = len(recent)
    success = sum(1 for r in recent if r.get("status") == "success")
    failed = sum(1 for r in recent if r.get("status") == "failed")
    stopped = sum(1 for r in recent if r.get("status") == "stopped")
    durations = [r.get("duration_ms", 0) for r in recent if r.get("duration_ms")]
    avg_ms = int(sum(durations) / len(durations)) if durations else 0
    success_rate = round(success / total * 100, 1) if total else 0.0

    # 每日趋势
    trend: dict[str, dict[str, Any]] = {}
    for r in recent:
        day = datetime.fromtimestamp(r.get("finished_at", time.time())).strftime("%Y-%m-%d")
        t = trend.setdefault(day, {"date": day, "total": 0, "success": 0, "failed": 0, "dur_sum": 0, "dur_cnt": 0})
        t["total"] += 1
        if r.get("status") == "success":
            t["success"] += 1
        elif r.get("status") == "failed":
            t["failed"] += 1
        if r.get("duration_ms"):
            t["dur_sum"] += r["duration_ms"]
            t["dur_cnt"] += 1
    trend_list = []
    for day in sorted(trend.keys()):
        t = trend[day]
        t["avg_ms"] = int(t["dur_sum"] / t["dur_cnt"]) if t["dur_cnt"] else 0
        t.pop("dur_sum", None)
        t.pop("dur_cnt", None)
        trend_list.append(t)

    # 失败 TOP 排行（按工作流聚合）
    by_wf: dict[str, dict[str, Any]] = {}
    for r in recent:
        name = r.get("workflow_name", "（未命名）")
        w = by_wf.setdefault(name, {"workflow_name": name, "runs": 0, "failed": 0, "dur_sum": 0, "dur_cnt": 0, "last_error": ""})
        w["runs"] += 1
        if r.get("status") == "failed":
            w["failed"] += 1
            if r.get("error"):
                w["last_error"] = r["error"]
        if r.get("duration_ms"):
            w["dur_sum"] += r["duration_ms"]
            w["dur_cnt"] += 1
    wf_stats = []
    for w in by_wf.values():
        w["fail_rate"] = round(w["failed"] / w["runs"] * 100, 1) if w["runs"] else 0.0
        w["avg_ms"] = int(w["dur_sum"] / w["dur_cnt"]) if w["dur_cnt"] else 0
        w.pop("dur_sum", None)
        w.pop("dur_cnt", None)
        wf_stats.append(w)
    failure_top = sorted(wf_stats, key=lambda x: (-x["failed"], -x["fail_rate"]))[:10]
    slowest_top = sorted(wf_stats, key=lambda x: -x["avg_ms"])[:10]

    return {
        "days": int(days or 7),
        "overview": {
            "total": total,
            "success": success,
            "failed": failed,
            "stopped": stopped,
            "success_rate": success_rate,
            "avg_ms": avg_ms,
        },
        "trend": trend_list,
        "failure_top": failure_top,
        "slowest_top": slowest_top,
    }


def clear_history() -> dict[str, Any]:
    try:
        f = _history_file()
        existed = f.exists()
        if existed:
            f.unlink()
        return {"success": True, "cleared": existed}
    except Exception as e:
        return {"success": False, "error": str(e)}
