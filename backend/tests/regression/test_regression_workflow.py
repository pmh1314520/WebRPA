# -*- coding: utf-8 -*-
"""后端历史缺陷回归用例（工作流引擎）。

沉淀以下历史 bug 的复现与修正断言，纳入回归层防止再次劣化：
- 计数循环重复累加导致节点统计虚高（应按节点 id 去重）。
- 关键节点最终失败未写入 _node_outcomes，导致工作流误报"成功"（静默失败）。
- 错误边回流到上层节点时，必须能在重试上限内终止，不得成环死锁。
"""
import asyncio

import pytest

from app.services.workflow_runner import _run_once

pytestmark = pytest.mark.regression


def _node(nid, mtype, config=None, extra=None):
    data = {"label": mtype, "config": dict(config or {})}
    if extra:
        data.update(extra)
    return {"id": nid, "type": mtype, "position": {"x": 0, "y": 0}, "data": data}


def _edge(src, tgt, handle=None):
    e = {"id": f"e_{src}_{tgt}_{handle or ''}", "source": src, "target": tgt}
    if handle:
        e["sourceHandle"] = handle
    return e


async def test_count_loop_node_dedup():
    """计数循环跑 3 次，节点统计应按 id 去重为 3，而非累加为 5。"""
    wf = {
        "id": "reg_loop", "name": "reg_loop",
        "nodes": [
            _node("lp", "loop", {"loopType": "count", "loopCount": 3, "indexVariable": "i"}),
            _node("body", "set_variable", {"variableName": "x", "variableValue": "{i}"}),
            _node("done", "print_log", {"logMessage": "done"}),
        ],
        "edges": [_edge("lp", "body", "loop"), _edge("lp", "done", "done")],
    }
    res = await _run_once(wf, headless=True)
    assert res["success"] is True, res.get("error")
    assert res["executed_nodes"] == 3
    assert res["failed_nodes"] == 0


async def test_critical_node_failure_not_silently_success():
    """关键节点（click_element 空选择器）失败时，工作流必须如实报告失败，不得静默成功。

    历史 bug：失败分支在写入 _node_outcomes 前提前 return，failed_nodes 恒为 0，
    工作流状态被判定为 completed/success，掩盖真实失败。
    """
    wf = {
        "id": "reg_fail", "name": "reg_fail",
        "nodes": [
            _node("n1", "set_variable", {"variableName": "x", "variableValue": "1"}),
            _node("n2", "click_element", {"selector": ""}),
        ],
        "edges": [_edge("n1", "n2")],
    }
    res = await _run_once(wf, headless=True)
    assert res["success"] is False
    assert res["failed_nodes"] >= 1
    assert res["error"]


async def test_error_backflow_terminates_without_deadlock():
    """错误边回流到上层节点，必须在重试上限内终止，不得成环死锁。"""
    wf = {
        "id": "reg_backflow", "name": "reg_backflow",
        "nodes": [
            _node("a", "set_variable", {"variableName": "x", "variableValue": "1"}),
            # 空选择器恒失败，错误边回流到 a，maxRetries 上限保证终止
            _node("b", "click_element", {"selector": ""}, extra={"maxRetries": 3}),
        ],
        "edges": [_edge("a", "b"), _edge("b", "a", "error")],
    }
    # 用 wait_for 兜底：若回流成环死锁，测试会超时失败而非永久挂起
    res = await asyncio.wait_for(_run_once(wf, headless=True), timeout=30)
    assert res["success"] is False
    assert res["failed_nodes"] >= 1
