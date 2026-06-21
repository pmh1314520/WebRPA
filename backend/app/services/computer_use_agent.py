# -*- coding: utf-8 -*-
"""计算机使用 Agent（Computer-Use）

用户给出目标文本 → Agent 截屏 → 多模态 LLM 规划下一步动作 → 通过系统级鼠标键盘
真实执行 → 循环直到 LLM 判定完成或失败。无需预先配置选择器。

坐标协议：为兼容截图缩放，LLM 返回归一化坐标（0~1000），本服务按真实屏幕尺寸换算，
避免缩放导致点偏。每一步记录动作与截图引用，供回放与审计。

动作集：click / double_click / right_click / type / key / scroll / move / wait / finish / fail。
"""
from __future__ import annotations

import asyncio
import base64
import io
import secrets
import time
from datetime import datetime
from typing import Any, Optional

_SYSTEM_PROMPT = """你是一个能看屏幕并操作 Windows 电脑的智能体。每一步我会给你当前屏幕截图和总目标。
你必须只回复一个 JSON 对象（不要任何多余文字、不要代码围栏），描述下一步要执行的【单个】动作。

坐标系：图像左上角为 (0,0)，请使用【归一化坐标】，x 和 y 取值范围都是 0~1000
（x=500,y=500 表示屏幕正中）。

可用动作（action 取值）：
- {"action":"click","x":int,"y":int,"reason":"为什么"}            左键单击
- {"action":"double_click","x":int,"y":int,"reason":""}            左键双击
- {"action":"right_click","x":int,"y":int,"reason":""}             右键单击
- {"action":"move","x":int,"y":int,"reason":""}                    仅移动鼠标
- {"action":"type","text":"要输入的文字","reason":""}              在当前焦点输入文字
- {"action":"key","keys":["ctrl","s"],"reason":""}                 按下组合键/单键
- {"action":"scroll","amount":int,"reason":""}                     滚轮，正数向上负数向下
- {"action":"wait","seconds":float,"reason":""}                    等待
- {"action":"finish","reason":"已完成的说明"}                       目标达成，结束
- {"action":"fail","reason":"无法完成的原因"}                       无法完成，放弃

规则：
1. 每次只做一步，做完我会给你新截图，你再决定下一步。
2. 点击前先确认目标元素在截图中可见；不可见就先 scroll 或打开对应程序。
3. 目标明确达成后立刻返回 finish；陷入困境无法推进时返回 fail。
4. 只输出 JSON，绝不要输出解释性文字。"""


def _data_file():
    from pathlib import Path
    folder = Path("backend/data")
    folder.mkdir(parents=True, exist_ok=True)
    return folder / "computer_use_sessions.json"


def _grab_screenshot() -> tuple[str, int, int]:
    """全屏截图 → (base64_png, width, height)。"""
    from PIL import ImageGrab
    img = ImageGrab.grab()
    width, height = img.size
    # 缩放到最长边 1280，降低 token 消耗（坐标用归一化，不受影响）
    max_side = 1280
    scale = min(1.0, max_side / max(width, height))
    if scale < 1.0:
        img = img.resize((int(width * scale), int(height * scale)))
    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    return b64, width, height


def _norm_to_real(nx: Any, ny: Any, w: int, h: int) -> tuple[int, int]:
    """归一化坐标(0~1000) → 真实屏幕像素。"""
    try:
        x = int(float(nx) / 1000.0 * w)
        y = int(float(ny) / 1000.0 * h)
    except Exception:
        x, y = w // 2, h // 2
    x = max(0, min(w - 1, x))
    y = max(0, min(h - 1, y))
    return x, y


def _execute_action(action: dict[str, Any], w: int, h: int) -> dict[str, Any]:
    """真实执行单个动作（在线程池里跑，避免阻塞事件循环）。"""
    import pyautogui
    pyautogui.FAILSAFE = False
    act = (action.get("action") or "").lower()
    try:
        if act in ("click", "double_click", "right_click", "move"):
            x, y = _norm_to_real(action.get("x"), action.get("y"), w, h)
            pyautogui.moveTo(x, y, duration=0.15)
            if act == "click":
                pyautogui.click(x, y)
            elif act == "double_click":
                pyautogui.doubleClick(x, y)
            elif act == "right_click":
                pyautogui.click(x, y, button="right")
            return {"ok": True, "executed": f"{act}@({x},{y})"}
        if act == "type":
            text = str(action.get("text") or "")
            # 中文/非 ASCII 用剪贴板粘贴，ASCII 直接打字
            if text and not text.isascii():
                try:
                    import pyperclip
                    pyperclip.copy(text)
                    pyautogui.hotkey("ctrl", "v")
                except Exception:
                    pyautogui.typewrite(text, interval=0.02)
            else:
                pyautogui.typewrite(text, interval=0.02)
            return {"ok": True, "executed": f"type({len(text)} chars)"}
        if act == "key":
            keys = action.get("keys") or []
            if isinstance(keys, str):
                keys = [keys]
            keys = [str(k).lower() for k in keys]
            if len(keys) == 1:
                pyautogui.press(keys[0])
            elif keys:
                pyautogui.hotkey(*keys)
            return {"ok": True, "executed": f"key({'+'.join(keys)})"}
        if act == "scroll":
            amt = int(action.get("amount") or 0)
            pyautogui.scroll(amt)
            return {"ok": True, "executed": f"scroll({amt})"}
        if act == "wait":
            return {"ok": True, "executed": "wait"}  # 实际等待在异步层处理
        return {"ok": False, "error": f"未知动作：{act}"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def run_session(goal: str, *, max_steps: int = 15,
                      actor: str = "system") -> dict[str, Any]:
    """运行一次 Computer-Use 会话，返回完整动作历史。"""
    from app.services import enterprise_llm
    if enterprise_llm.build_llm_config(vision=True) is None:
        return {"success": False,
                "error": "未配置多模态 AI 模型，无法使用 Computer-Use（请在全局配置填写支持视觉的模型）"}

    session_id = f"cua_{secrets.token_hex(5)}"
    history: list[dict[str, Any]] = []
    final_status = "running"
    final_reason = ""

    try:
        from app.services import audit_log
        audit_log.record(actor, "computer_use.run", goal[:80],
                         detail={"session_id": session_id, "max_steps": max_steps})
    except Exception:
        pass

    loop = asyncio.get_event_loop()
    for step in range(1, max_steps + 1):
        # 截屏（线程池）
        try:
            b64, w, h = await loop.run_in_executor(None, _grab_screenshot)
        except Exception as e:
            final_status, final_reason = "fail", f"截屏失败：{e}"
            break

        user_text = (
            f"总目标：{goal}\n"
            f"当前是第 {step}/{max_steps} 步。已执行历史动作：\n"
            + "\n".join(f"  {i+1}. {h.get('action')} - {h.get('reason','')}"
                        for i, h in enumerate(history[-6:]))
            + "\n请观察截图，给出下一步要执行的单个动作 JSON。"
        )
        try:
            reply = await enterprise_llm.vision_chat(_SYSTEM_PROMPT, user_text, [b64])
        except Exception as e:
            final_status, final_reason = "fail", f"模型调用失败：{e}"
            break

        action = enterprise_llm.extract_json(reply)
        if not isinstance(action, dict) or not action.get("action"):
            final_status, final_reason = "fail", f"模型未返回有效动作：{reply[:120]}"
            break

        act_name = (action.get("action") or "").lower()
        record_item = {
            "step": step,
            "action": act_name,
            "reason": action.get("reason", ""),
            "params": {k: v for k, v in action.items() if k not in ("action", "reason")},
            "at": datetime.now().isoformat(),
        }

        if act_name == "finish":
            final_status, final_reason = "success", action.get("reason", "目标已完成")
            history.append(record_item)
            break
        if act_name == "fail":
            final_status, final_reason = "fail", action.get("reason", "Agent 放弃")
            history.append(record_item)
            break
        if act_name == "wait":
            secs = float(action.get("seconds") or 1.0)
            await asyncio.sleep(min(10.0, max(0.1, secs)))
            record_item["result"] = {"ok": True, "executed": f"wait({secs}s)"}
            history.append(record_item)
            continue

        # 真实执行（线程池）
        result = await loop.run_in_executor(None, _execute_action, action, w, h)
        record_item["result"] = result
        history.append(record_item)
        if not result.get("ok"):
            # 单步失败不立即终止，给模型一次纠错机会，但连续两次失败则放弃
            if len(history) >= 2 and not history[-2].get("result", {}).get("ok", True):
                final_status, final_reason = "fail", f"连续动作执行失败：{result.get('error')}"
                break
        await asyncio.sleep(0.6)  # 等界面响应
    else:
        final_status, final_reason = "fail", "达到最大步数仍未完成"

    out = {
        "success": final_status == "success",
        "session_id": session_id,
        "goal": goal,
        "status": final_status,
        "reason": final_reason,
        "steps": len(history),
        "history": history,
        "finished_at": datetime.now().isoformat(),
    }
    _save_session(out)
    return out


def _save_session(session: dict[str, Any]) -> None:
    import json
    try:
        f = _data_file()
        data = []
        if f.exists():
            raw = f.read_text(encoding="utf-8")
            if raw.strip():
                data = json.loads(raw)
        if not isinstance(data, list):
            data = []
        # 不持久化截图，仅存动作摘要
        data.append(session)
        data = data[-100:]
        f.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception as e:
        print(f"[computer_use] 保存会话失败: {e}")


def list_sessions(limit: int = 30) -> list[dict[str, Any]]:
    import json
    f = _data_file()
    if not f.exists():
        return []
    try:
        data = json.loads(f.read_text(encoding="utf-8"))
        if isinstance(data, list):
            return list(reversed(data))[:limit]
    except Exception:
        pass
    return []
