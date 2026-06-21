# -*- coding: utf-8 -*-
"""感知+规划稳健性检查（连续多次，验证 reasoning_content 兜底）。不执行动作。用完即删。"""
import asyncio, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / "backend"))


async def main():
    from app.services import computer_use_agent as cua, enterprise_llm
    loop = asyncio.get_event_loop()
    b64, w, h = await loop.run_in_executor(None, cua._grab_screenshot)
    ok = 0
    for i in range(3):
        user = "总目标：打开 Windows 计算器\n当前是第 1 步。请观察截图，给出下一步要执行的单个动作 JSON。"
        reply = await enterprise_llm.vision_chat(cua._SYSTEM_PROMPT, user, [b64])
        act = enterprise_llm.extract_json(reply)
        valid = isinstance(act, dict) and bool(act.get("action"))
        ok += 1 if valid else 0
        print(f"试 {i+1}: valid={valid} reply_len={len(reply)} action={act.get('action') if valid else None}")
    print(f"=== {ok}/3 次返回有效动作 ===")


if __name__ == "__main__":
    asyncio.run(main())
