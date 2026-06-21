"""通用工作流运行器（无 UI、可复用）

供「工作流即 API」「CLI 命令行」「失败自愈闭环」共用：
加载一个工作流（本地文件名 / 完整 dict）→ 无头执行 → 记录历史 → 失败告警 → 按策略重试 →
返回结构化结果 {status, success, executed_nodes, failed_nodes, error, collected_data, logs, attempts}。
"""

from __future__ import annotations

import asyncio
import json
import time
from pathlib import Path
from typing import Any, Optional


def _default_workflow_folder() -> Path:
    # 与 api/local_workflows.py 的 DEFAULT_WORKFLOW_FOLDER 一致
    return Path(__file__).parent.parent.parent.parent / "workflows"


def load_workflow_dict(source: str | dict) -> dict[str, Any]:
    """把来源解析为工作流 dict。source 可以是：
    - dict：直接用
    - 绝对/相对路径的 .json 文件
    - 本地工作流文件名（在默认 workflows 目录下查找，自动补 .json）
    """
    if isinstance(source, dict):
        return source
    s = str(source).strip()
    p = Path(s)
    if p.exists() and p.is_file():
        return json.loads(p.read_text(encoding="utf-8"))
    # 当作本地工作流文件名
    name = s if s.endswith(".json") else s + ".json"
    cand = _default_workflow_folder() / name
    if cand.exists():
        return json.loads(cand.read_text(encoding="utf-8"))
    raise FileNotFoundError(f"找不到工作流：{source}")


async def _run_once(workflow_data: dict[str, Any], headless: bool = True) -> dict[str, Any]:
    """执行一次工作流，返回结果（不记录历史，不重试）。"""
    from app.services.workflow_executor import WorkflowExecutor
    from app.models.workflow import Workflow

    # 本地保存的工作流可能缺少 id/name（编辑器可选），补默认值避免模型校验失败
    wd = dict(workflow_data)
    if not wd.get("id"):
        import uuid as _uuid
        wd["id"] = _uuid.uuid4().hex[:12]
    if not wd.get("name"):
        wd["name"] = "（未命名）"
    workflow = Workflow(**wd)
    executor = WorkflowExecutor(
        workflow=workflow,
        headless=headless,
        browser_config={"type": "msedge", "executablePath": None, "fullscreen": False, "launchArgs": None},
    )
    try:
        result = await executor.execute()
        collected = executor.get_collected_data()
        logs = []
        try:
            if hasattr(executor, "logger") and hasattr(executor.logger, "logs"):
                logs = [
                    {"level": getattr(l, "level", ""), "message": getattr(l, "message", str(l))}
                    if not isinstance(l, dict) else l
                    for l in (executor.logger.logs or [])
                ]
        except Exception:
            logs = []
        status = result.status.value
        success = status == "completed"
        return {
            "status": "success" if success else status,
            "success": success,
            "executed_nodes": getattr(result, "executed_nodes", 0),
            "failed_nodes": getattr(result, "failed_nodes", 0),
            "error": None if success else (getattr(result, "error_message", "") or getattr(result, "error", "") or "执行失败"),
            "collected_data": collected,
            "logs": logs,
        }
    finally:
        try:
            await executor.cleanup()
        except Exception:
            pass


async def run_workflow(
    source: str | dict,
    *,
    headless: bool = True,
    source_tag: str = "api",
    apply_retry: bool = True,
    record: bool = True,
) -> dict[str, Any]:
    """运行工作流（含重试 / 历史记录 / 失败告警）。

    source_tag: editor/scheduled/api/cli —— 记录到执行历史的来源标签。
    apply_retry: 是否按告警中心的重试策略在失败时自动重跑。
    """
    try:
        workflow_data = load_workflow_dict(source)
    except Exception as e:
        return {"status": "failed", "success": False, "error": str(e), "executed_nodes": 0,
                "failed_nodes": 0, "collected_data": [], "logs": [], "attempts": 0}

    wf_name = workflow_data.get("name") or (str(source) if not isinstance(source, dict) else "（未命名）")
    wf_id = workflow_data.get("id", "") or ""

    # 重试策略
    max_retries = 0
    delay = 0
    if apply_retry:
        try:
            from app.services.alert_center import get_retry_policy
            rp = get_retry_policy()
            if rp.get("enabled"):
                max_retries = int(rp.get("max_retries", 0) or 0)
                delay = int(rp.get("delay_seconds", 0) or 0)
        except Exception:
            pass

    attempts = 0
    last: dict[str, Any] = {}
    start_ts = time.time()
    for i in range(max_retries + 1):
        attempts += 1
        if i > 0 and delay > 0:
            await asyncio.sleep(delay)
        last = await _run_once(workflow_data, headless=headless)
        if last.get("success"):
            break

    duration_ms = int((time.time() - start_ts) * 1000)
    last["attempts"] = attempts
    last["duration_ms"] = duration_ms

    # 记录历史 + 告警
    if record:
        try:
            from app.services.execution_history import record_run
            from app.services.alert_center import dispatch_alert
            rec = record_run(
                workflow_name=wf_name,
                workflow_id=wf_id,
                status=last.get("status", "failed"),
                duration_ms=duration_ms,
                executed_nodes=last.get("executed_nodes", 0),
                failed_nodes=last.get("failed_nodes", 0),
                error=(last.get("error") or ""),
                source=source_tag,
                started_at=start_ts,
                extra={"attempts": attempts},
            )
            dispatch_alert(rec)
        except Exception as e:
            print(f"[workflow_runner] 记录/告警失败: {e}")

    return last
