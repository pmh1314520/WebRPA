# -*- coding: utf-8 -*-
"""WebRPA 小助手 - v12 自然语言自动化（计划任务）Skills

让管家能用一句话把工作流变成定时自动化：
"每天早上 8 点自动跑签到工作流" / "每周一上午 9 点跑周报" / "每隔 30 分钟跑一次监控"。
小助手把自然语言转成结构化调度参数，由本技能落地为真实计划任务（APScheduler 调度）。

计划任务的创建/删除/启停标记为需审批，避免误配出意料之外的周期执行。
"""
from __future__ import annotations

from typing import Any, Optional

from app.services.ai_assistant_skills import Skill, registry, _get_workflow_folder


def _norm_time(t: Optional[str], default: str = "09:00:00") -> str:
    """把 'HH:MM' / 'HH:MM:SS' 规整成 'HH:MM:SS'。"""
    t = (t or "").strip() or default
    parts = t.split(":")
    if len(parts) == 2:
        return f"{int(parts[0]):02d}:{int(parts[1]):02d}:00"
    if len(parts) == 3:
        return f"{int(parts[0]):02d}:{int(parts[1]):02d}:{int(parts[2]):02d}"
    return default


def _build_trigger(schedule_type: str, *, time: Optional[str] = None,
                   weekly_days: Optional[list] = None, monthly_day: Optional[int] = None,
                   interval_seconds: Optional[int] = None, date: Optional[str] = None) -> dict[str, Any]:
    """根据结构化调度参数构造 time 触发器配置 dict。返回 {trigger:dict} 或 {error}。"""
    st = (schedule_type or "").strip().lower()
    trig: dict[str, Any] = {"type": "time", "schedule_type": st}
    if st == "daily":
        trig["daily_time"] = _norm_time(time)
    elif st == "weekly":
        if not weekly_days:
            return {"error": "weekly 需提供 weekly_days（0=周日,1=周一,…6=周六）"}
        trig["weekly_days"] = [int(d) for d in weekly_days]
        trig["weekly_time"] = _norm_time(time)
    elif st == "monthly":
        if not monthly_day:
            return {"error": "monthly 需提供 monthly_day（1-31）"}
        trig["monthly_day"] = int(monthly_day)
        trig["monthly_time"] = _norm_time(time)
    elif st == "interval":
        if not interval_seconds or int(interval_seconds) < 1:
            return {"error": "interval 需提供 interval_seconds（>=1）"}
        trig["interval_seconds"] = int(interval_seconds)
    elif st == "once":
        if not date:
            return {"error": "once 需提供 date（YYYY-MM-DD）"}
        trig["start_date"] = date
        trig["start_time"] = _norm_time(time, "09:00:00")
    else:
        return {"error": f"不支持的 schedule_type：{schedule_type}（可选 daily/weekly/monthly/interval/once）"}
    return {"trigger": trig}


def _resolve_workflow(workflow: str) -> dict[str, Any]:
    """把工作流名解析为 (filename, display_name)，并校验本地存在。"""
    name = (workflow or "").strip()
    if not name:
        return {"error": "缺少工作流名"}
    filename = name if name.endswith(".json") else name + ".json"
    folder = _get_workflow_folder()
    fp = folder / filename
    if not fp.exists():
        available = sorted(p.stem for p in folder.glob("*.json"))[:30]
        return {"error": f"本地不存在工作流「{name}」", "available": available}
    return {"filename": filename, "display": fp.stem}


async def skill_create_scheduled_task(workflow: str, name: str | None = None,
                                      schedule_type: str = "daily", time: str | None = None,
                                      weekly_days: list | None = None, monthly_day: int | None = None,
                                      interval_seconds: int | None = None, date: str | None = None,
                                      headless: bool = True, **_: Any) -> dict[str, Any]:
    """把一个本地工作流设为定时自动执行的计划任务。"""
    wf = _resolve_workflow(workflow)
    if wf.get("error"):
        return wf
    tb = _build_trigger(schedule_type, time=time, weekly_days=weekly_days,
                        monthly_day=monthly_day, interval_seconds=interval_seconds, date=date)
    if tb.get("error"):
        return tb
    try:
        from app.models.scheduled_task import ScheduledTask, ScheduledTaskTrigger
        from app.services.scheduled_task_manager import scheduled_task_manager
        task = ScheduledTask(
            name=name or f"{wf['display']} 定时任务",
            description="由 WebRPA 小助手创建",
            workflow_id=wf["filename"],          # 执行器按此作为文件名加载工作流
            workflow_name=wf["display"],
            trigger=ScheduledTaskTrigger(**tb["trigger"]),
            enabled=True,
            headless=bool(headless),
        )
        created = scheduled_task_manager.create_task(task)
        return {"success": True, "task_id": created.id, "name": created.name,
                "workflow": wf["display"], "schedule": tb["trigger"]}
    except Exception as e:
        return {"error": f"创建计划任务失败：{e}"}


async def skill_list_scheduled_tasks(**_: Any) -> dict[str, Any]:
    """列出所有计划任务及其调度/启停状态与执行统计。"""
    try:
        from app.services.scheduled_task_manager import scheduled_task_manager
        tasks = scheduled_task_manager.list_tasks()
        out = []
        for t in tasks:
            trig = t.trigger
            out.append({
                "task_id": t.id, "name": t.name, "workflow": t.workflow_name or t.workflow_id,
                "enabled": t.enabled, "schedule_type": getattr(trig, "schedule_type", None),
                "trigger_type": getattr(trig, "type", None),
                "total": t.total_executions, "success": t.success_executions,
                "failed": t.failed_executions, "next": t.next_execution_time,
            })
        return {"tasks": out, "count": len(out)}
    except Exception as e:
        return {"error": str(e)}


async def skill_toggle_scheduled_task(task_id: str, enabled: bool, **_: Any) -> dict[str, Any]:
    """启用/停用一个计划任务。"""
    try:
        from app.services.scheduled_task_manager import scheduled_task_manager
        t = scheduled_task_manager.update_task(task_id, {"enabled": bool(enabled)})
        if not t:
            return {"error": "计划任务不存在"}
        return {"success": True, "task_id": task_id, "enabled": t.enabled}
    except Exception as e:
        return {"error": str(e)}


async def skill_delete_scheduled_task(task_id: str, **_: Any) -> dict[str, Any]:
    """删除一个计划任务（不可恢复）。"""
    try:
        from app.services.scheduled_task_manager import scheduled_task_manager
        ok = scheduled_task_manager.delete_task(task_id)
        return {"success": bool(ok)} if ok else {"error": "计划任务不存在"}
    except Exception as e:
        return {"error": str(e)}


def _register_v12() -> None:
    registry.register(Skill(
        name="list_scheduled_tasks",
        description="列出所有计划任务（名称/关联工作流/调度方式/启停/执行统计/下次执行时间）。",
        parameters={"type": "object", "properties": {}},
        handler=skill_list_scheduled_tasks,
    ))
    registry.register(Skill(
        name="create_scheduled_task",
        description=(
            "把本地工作流设为定时自动执行的计划任务。先把用户的自然语言时间转成结构化参数：\n"
            "- schedule_type: daily(每天)/weekly(每周)/monthly(每月)/interval(每隔)/once(一次)\n"
            "- time: 'HH:MM'（daily/weekly/monthly/once 用）\n"
            "- weekly_days: 数组，0=周日 1=周一 … 6=周六（weekly 用）\n"
            "- monthly_day: 1-31（monthly 用）；interval_seconds: 间隔秒数（interval 用）；date: YYYY-MM-DD（once 用）\n"
            "例：'每天早上8点跑签到' → workflow='签到', schedule_type='daily', time='08:00'。"
        ),
        parameters={
            "type": "object",
            "properties": {
                "workflow": {"type": "string", "description": "本地工作流文件名（不含.json也可）"},
                "name": {"type": "string", "description": "任务名（可选）"},
                "schedule_type": {"type": "string", "enum": ["daily", "weekly", "monthly", "interval", "once"]},
                "time": {"type": "string", "description": "HH:MM"},
                "weekly_days": {"type": "array", "items": {"type": "integer"}},
                "monthly_day": {"type": "integer"},
                "interval_seconds": {"type": "integer"},
                "date": {"type": "string", "description": "YYYY-MM-DD"},
                "headless": {"type": "boolean", "default": True},
            },
            "required": ["workflow", "schedule_type"],
        },
        handler=skill_create_scheduled_task,
        requires_approval=True,
    ))
    registry.register(Skill(
        name="toggle_scheduled_task",
        description="启用/停用一个计划任务。task_id 取自 list_scheduled_tasks。",
        parameters={"type": "object", "properties": {
            "task_id": {"type": "string"}, "enabled": {"type": "boolean"}},
            "required": ["task_id", "enabled"]},
        handler=skill_toggle_scheduled_task,
        requires_approval=True,
    ))
    registry.register(Skill(
        name="delete_scheduled_task",
        description="删除一个计划任务（不可恢复）。task_id 取自 list_scheduled_tasks。",
        parameters={"type": "object", "properties": {"task_id": {"type": "string"}},
                    "required": ["task_id"]},
        handler=skill_delete_scheduled_task,
        requires_approval=True,
    ))


_register_v12()
