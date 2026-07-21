#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""WebRPA 命令行工具（CLI）

把工作流接入 CI/CD、定时脚本、其他程序调用。无需打开界面即可运行工作流。

用法（在项目根目录）：
    Python313\\python.exe backend\\cli.py run <工作流文件名或路径> [--show] [--json] [--var k=v ...]
    Python313\\python.exe backend\\cli.py stats [--days 7]
    Python313\\python.exe backend\\cli.py history [--limit 20]
    Python313\\python.exe backend\\cli.py list-workflows

或用根目录的封装：  webrpa.bat run 我的工作流.json

退出码：成功 0；失败 1；用法错误 2。
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys

# 让 `import app.xxx` 可用（cli.py 在 backend/ 下）
_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

# 后端所有相对数据路径（backend/data、./data）都以项目根为基准。
# 先把命令行里存在的相对文件路径归一为绝对路径（保持用户 cwd 语义），
# 再把工作目录固定到项目根，避免从 backend/ 下运行时写出 backend/backend/data。
_PROJECT_ROOT = os.path.dirname(_HERE)
sys.argv = [
    (os.path.abspath(a) if (not a.startswith("-") and os.path.exists(a)) else a)
    for a in sys.argv
]
os.chdir(_PROJECT_ROOT)

# Windows 控制台默认 GBK，输出中文/特殊字符可能崩；统一切到 UTF-8
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass


def _print(obj, as_json: bool = False):
    if as_json:
        print(json.dumps(obj, ensure_ascii=False, indent=2, default=str))
    else:
        print(obj)


async def _cmd_run(args) -> int:
    from app.services.workflow_runner import load_workflow_dict, run_workflow

    # 解析 --var k=v 注入初始变量
    init_vars = {}
    for kv in (args.var or []):
        if "=" in kv:
            k, v = kv.split("=", 1)
            init_vars[k.strip()] = v
    try:
        wf = load_workflow_dict(args.workflow)
    except Exception as e:
        _print(f"[错误] 无法加载工作流：{e}")
        return 1
    if init_vars:
        existing = list(wf.get("variables") or [])
        names = {v.get("name") for v in existing if isinstance(v, dict)}
        for k, v in init_vars.items():
            if k in names:
                for ev in existing:
                    if isinstance(ev, dict) and ev.get("name") == k:
                        ev["value"] = v
            else:
                existing.append({"name": k, "value": v, "type": "string"})
        wf["variables"] = existing

    result = await run_workflow(wf, headless=not args.show, source_tag="cli")
    if args.json:
        _print(result, as_json=True)
    else:
        ok = result.get("success")
        _print(f"[{'OK 成功' if ok else 'FAIL 失败'}]  状态={result.get('status')}  "
               f"执行节点={result.get('executed_nodes')}  失败节点={result.get('failed_nodes')}  "
               f"耗时={result.get('duration_ms')}ms  重试={result.get('attempts')}次")
        if not ok and result.get("error"):
            _print(f"错误：{result.get('error')}")
        data = result.get("collected_data") or []
        if data:
            _print(f"采集数据 {len(data)} 行（前 5 行）：")
            _print(data[:5], as_json=True)
    return 0 if result.get("success") else 1


async def _cmd_stats(args) -> int:
    from app.services import execution_history as hist
    _print(hist.get_stats(days=args.days), as_json=True)
    return 0


async def _cmd_history(args) -> int:
    from app.services import execution_history as hist
    runs = hist.list_runs(limit=args.limit)
    if args.json:
        _print({"runs": runs}, as_json=True)
    else:
        for r in runs:
            _print(f"[{r.get('ts')}] {r.get('status'):<8} {r.get('workflow_name')}  "
                   f"({r.get('duration_ms')}ms, {r.get('source')})")
    return 0


async def _cmd_list_workflows(args) -> int:
    from app.services.workflow_runner import _default_workflow_folder
    folder = _default_workflow_folder()
    if not folder.exists():
        _print("（工作流目录不存在）")
        return 0
    files = sorted([f.name for f in folder.glob("*.json")])
    for f in files:
        _print(f)
    _print(f"\n共 {len(files)} 个工作流  目录：{folder}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="webrpa", description="WebRPA 命令行工具")
    sub = p.add_subparsers(dest="command")

    pr = sub.add_parser("run", help="运行一个工作流")
    pr.add_argument("workflow", help="工作流文件名（在 workflows 目录下）或完整路径")
    pr.add_argument("--show", action="store_true", help="显示浏览器界面（默认无头）")
    pr.add_argument("--json", action="store_true", help="以 JSON 输出完整结果")
    pr.add_argument("--var", action="append", help="注入初始变量，格式 key=value，可多次")

    ps = sub.add_parser("stats", help="打印执行统计")
    ps.add_argument("--days", type=int, default=7)

    ph = sub.add_parser("history", help="打印运行历史")
    ph.add_argument("--limit", type=int, default=20)
    ph.add_argument("--json", action="store_true")

    sub.add_parser("list-workflows", help="列出本地工作流")
    return p


def main(argv=None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if not args.command:
        parser.print_help()
        return 2
    handlers = {
        "run": _cmd_run,
        "stats": _cmd_stats,
        "history": _cmd_history,
        "list-workflows": _cmd_list_workflows,
    }
    handler = handlers.get(args.command)
    if not handler:
        parser.print_help()
        return 2
    try:
        return asyncio.run(handler(args))
    except KeyboardInterrupt:
        _print("\n已取消")
        return 1


if __name__ == "__main__":
    sys.exit(main())
