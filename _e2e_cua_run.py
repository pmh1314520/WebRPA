# -*- coding: utf-8 -*-
"""真实端到端 Computer-Use 完整会话（会真实操作鼠标键盘）。目标：打开计算器。用完即删。"""
import asyncio, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / "backend"))


async def main():
    from app.services import computer_use_agent as cua
    res = await cua.run_session("打开 Windows 计算器（calc）", max_steps=8, actor="e2e")
    print("=== Computer-Use 会话结果 ===")
    print("success:", res.get("success"), "| status:", res.get("status"))
    print("reason:", res.get("reason"))
    print("steps:", res.get("steps"))
    for h in res.get("history", []):
        r = h.get("result", {})
        print(f"  步{h['step']}: {h['action']} | {h.get('reason','')[:50]} | {r.get('executed') or r.get('error') or ''}")


if __name__ == "__main__":
    asyncio.run(main())
