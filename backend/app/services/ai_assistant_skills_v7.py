"""WebRPA 小助手 - v7 任务计划追踪（Plan / TODO）

设计目标：让 Agent 做"多步骤长任务"时拥有一份持久的结构化计划清单，
像人类做项目那样：先列计划 → 逐步勾选进度 → 随时回看还差什么。

为什么需要：
- 工具调用轮次到上限会暂停让用户说"继续"，此时若没有持久计划，Agent 容易"忘了做到哪"。
- 长链路任务（搭多节点工作流、批量处理、调研）中，计划清单能让 Agent 始终聚焦目标、不漏步骤。

机制：计划存为全局 JSON 文件（与 记忆/教训/画像 一致的全局存储哲学），
并由 get_task_plan_summary_for_prompt() 注入每轮系统提示词，让模型时刻"看得到当前进度"。

Skills：
  set_task_plan      设定/重置当前任务计划（目标 + 步骤列表）
  update_task_step   更新某一步的状态（done/doing/blocked/todo）+ 备注
  add_task_steps     往现有计划追加步骤（任务中途发现新子任务时）
  get_task_plan      读取当前计划与进度
  clear_task_plan    任务完成或放弃后清空计划
"""

from __future__ import annotations

import time
from pathlib import Path
from typing import Any

from app.services.ai_assistant_skills import Skill, registry, _get_data_folder


_VALID_STATUS = ("todo", "doing", "done", "blocked")
_STATUS_ICON = {"todo": "⬜", "doing": "🔄", "done": "✅", "blocked": "⛔"}


def _ai_data_dir() -> Path:
    folder = _get_data_folder() / "ai_assistant"
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def _plan_file() -> Path:
    return _ai_data_dir() / "task_plan.json"


def _read_plan() -> dict[str, Any]:
    import json
    p = _plan_file()
    if not p.exists():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _write_plan(plan: dict[str, Any]) -> None:
    import json
    p = _plan_file()
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(plan, ensure_ascii=False, indent=2, default=str), encoding="utf-8")


def _normalize_steps(steps: Any) -> list[dict[str, Any]]:
    """把传入的步骤（可能是字符串列表或对象列表）规整成统一结构。"""
    out: list[dict[str, Any]] = []
    if not isinstance(steps, list):
        return out
    for s in steps:
        if isinstance(s, str):
            title = s.strip()
            if title:
                out.append({"title": title, "status": "todo", "note": ""})
        elif isinstance(s, dict):
            title = str(s.get("title") or s.get("text") or s.get("name") or "").strip()
            if not title:
                continue
            status = str(s.get("status") or "todo").lower()
            if status not in _VALID_STATUS:
                status = "todo"
            out.append({"title": title, "status": status, "note": str(s.get("note") or "")})
    return out


def _progress(plan: dict[str, Any]) -> dict[str, int]:
    steps = plan.get("steps") or []
    total = len(steps)
    done = sum(1 for s in steps if s.get("status") == "done")
    doing = sum(1 for s in steps if s.get("status") == "doing")
    blocked = sum(1 for s in steps if s.get("status") == "blocked")
    return {"total": total, "done": done, "doing": doing, "blocked": blocked}


def _render(plan: dict[str, Any]) -> str:
    if not plan or not plan.get("steps"):
        return "（暂无任务计划）"
    lines = [f"🎯 目标：{plan.get('goal', '')}"]
    for i, s in enumerate(plan["steps"]):
        icon = _STATUS_ICON.get(s.get("status", "todo"), "⬜")
        note = f"  — {s['note']}" if s.get("note") else ""
        lines.append(f"{i + 1}. {icon} {s.get('title', '')}{note}")
    pr = _progress(plan)
    lines.append(f"进度：{pr['done']}/{pr['total']} 完成"
                 + (f"，{pr['doing']} 进行中" if pr['doing'] else "")
                 + (f"，{pr['blocked']} 受阻" if pr['blocked'] else ""))
    return "\n".join(lines)


# =============================================================================
# Skill 处理函数
# =============================================================================

async def skill_set_task_plan(goal: str, steps: Any = None, **_: Any) -> dict[str, Any]:
    """设定（或重置）当前任务计划。开始一个多步骤任务时先调它列好计划。"""
    g = (goal or "").strip()
    if not g:
        return {"error": "goal 不能为空"}
    norm = _normalize_steps(steps or [])
    plan = {
        "goal": g,
        "steps": norm,
        "created_at": int(time.time()),
        "updated_at": int(time.time()),
    }
    _write_plan(plan)
    return {"success": True, "plan": plan, "rendered": _render(plan)}


async def skill_update_task_step(
    step: int,
    status: str = "done",
    note: str = "",
    **_: Any,
) -> dict[str, Any]:
    """更新某一步的状态。step 是从 1 开始的序号；status ∈ todo/doing/done/blocked。"""
    plan = _read_plan()
    if not plan or not plan.get("steps"):
        return {"error": "当前没有任务计划，请先 set_task_plan"}
    steps = plan["steps"]
    try:
        idx = int(step) - 1
    except Exception:
        return {"error": "step 必须是数字序号（从 1 开始）"}
    if idx < 0 or idx >= len(steps):
        return {"error": f"step 越界，当前共有 {len(steps)} 步"}
    st = (status or "done").lower()
    if st not in _VALID_STATUS:
        return {"error": f"status 必须是 {', '.join(_VALID_STATUS)} 之一"}
    steps[idx]["status"] = st
    if note:
        steps[idx]["note"] = note
    plan["updated_at"] = int(time.time())
    _write_plan(plan)
    pr = _progress(plan)
    all_done = pr["total"] > 0 and pr["done"] == pr["total"]
    return {
        "success": True,
        "progress": pr,
        "all_done": all_done,
        "rendered": _render(plan),
        "hint": "全部完成，可调 clear_task_plan 收尾。" if all_done else "",
    }


async def skill_add_task_steps(steps: Any, **_: Any) -> dict[str, Any]:
    """往现有计划追加步骤（任务中途发现新子任务时用）。"""
    plan = _read_plan()
    if not plan or "steps" not in plan:
        return {"error": "当前没有任务计划，请先 set_task_plan"}
    norm = _normalize_steps(steps or [])
    if not norm:
        return {"error": "没有可追加的有效步骤"}
    plan["steps"].extend(norm)
    plan["updated_at"] = int(time.time())
    _write_plan(plan)
    return {"success": True, "added": len(norm), "rendered": _render(plan)}


async def skill_get_task_plan(**_: Any) -> dict[str, Any]:
    """读取当前任务计划与进度。"""
    plan = _read_plan()
    if not plan or not plan.get("steps"):
        return {"plan": None, "rendered": "（暂无任务计划）"}
    return {"plan": plan, "progress": _progress(plan), "rendered": _render(plan)}


async def skill_clear_task_plan(**_: Any) -> dict[str, Any]:
    """清空当前任务计划（任务完成或放弃后调用）。"""
    p = _plan_file()
    existed = p.exists()
    try:
        if existed:
            p.unlink()
    except Exception as e:
        return {"error": f"清空失败：{e}"}
    return {"success": True, "cleared": existed}


# =============================================================================
# 系统提示词注入
# =============================================================================

def get_task_plan_summary_for_prompt() -> str:
    """把当前任务计划渲染成系统提示词片段（供 chat_once 注入）。无计划时返回空串。"""
    plan = _read_plan()
    if not plan or not plan.get("steps"):
        return ""
    pr = _progress(plan)
    # 全部完成的旧计划不再打扰提示词
    if pr["total"] > 0 and pr["done"] == pr["total"]:
        return ""
    return (
        "# 📋 当前任务计划（你正在推进的多步骤任务，请据此继续，完成一步就 update_task_step 勾选）\n"
        + _render(plan)
        + "\n（若用户已切换到全新话题，先 clear_task_plan 再开始新计划）"
    )


# =============================================================================
# 注册
# =============================================================================

def _register_v7() -> None:
    registry.register(Skill(
        name="set_task_plan",
        description=(
            "设定/重置当前任务计划（目标 + 步骤清单）。"
            "**开始任何需要 3 步以上的复杂任务前，先用它列好计划**，之后每完成一步就 update_task_step 勾选。"
            "计划会自动注入系统提示词，让你在长任务和'继续'之间不丢进度、始终聚焦目标。"
        ),
        parameters={
            "type": "object",
            "properties": {
                "goal": {"type": "string", "description": "任务总目标，一句话"},
                "steps": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "步骤标题列表，按执行顺序",
                },
            },
            "required": ["goal"],
        },
        handler=skill_set_task_plan,
    ))
    registry.register(Skill(
        name="update_task_step",
        description="更新计划中某一步的状态（todo/doing/done/blocked）+ 可选备注。完成一步就调它勾选。",
        parameters={
            "type": "object",
            "properties": {
                "step": {"type": "integer", "description": "步骤序号（从 1 开始）"},
                "status": {"type": "string", "enum": list(_VALID_STATUS), "default": "done"},
                "note": {"type": "string", "description": "可选备注（如受阻原因、产出结果）"},
            },
            "required": ["step"],
        },
        handler=skill_update_task_step,
    ))
    registry.register(Skill(
        name="add_task_steps",
        description="往当前计划追加新步骤（任务中途发现还需要做的子任务时用）。",
        parameters={
            "type": "object",
            "properties": {
                "steps": {"type": "array", "items": {"type": "string"}, "description": "要追加的步骤标题列表"},
            },
            "required": ["steps"],
        },
        handler=skill_add_task_steps,
    ))
    registry.register(Skill(
        name="get_task_plan",
        description="读取当前任务计划与进度（回看还差哪些步骤）。",
        parameters={"type": "object", "properties": {}},
        handler=skill_get_task_plan,
    ))
    registry.register(Skill(
        name="clear_task_plan",
        description="清空当前任务计划（任务全部完成或用户放弃/切换全新任务时调用）。",
        parameters={"type": "object", "properties": {}},
        handler=skill_clear_task_plan,
    ))


_register_v7()
