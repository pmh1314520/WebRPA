# -*- coding: utf-8 -*-
"""工作流端到端集成测试：解析 -> 执行 -> 结果统计。

仅用不依赖浏览器/网络的模块（set_variable / print_log / loop / click_element 空选择器失败），
通过 workflow_runner._run_once 走真实执行引擎，验证变量流转、成败统计与计数去重。

节点结构遵循执行器约定：node.type 为模块类型（注册键），运行配置放在 data.config。
"""
import pytest

from app.services.workflow_runner import _run_once

pytestmark = pytest.mark.integration


def _node(nid, mtype, config=None):
    return {
        "id": nid,
        "type": mtype,
        "position": {"x": 0, "y": 0},
        "data": {"label": mtype, "config": dict(config or {})},
    }


def _edge(src, tgt, handle=None):
    e = {"id": f"e_{src}_{tgt}_{handle or ''}", "source": src, "target": tgt}
    if handle:
        e["sourceHandle"] = handle
    return e


async def test_linear_success_and_variables():
    """线性工作流：变量在节点间流转，全部成功，节点计数等于节点数。"""
    wf = {
        "id": "e2e_linear", "name": "linear",
        "nodes": [
            _node("n1", "set_variable", {"variableName": "x", "variableValue": "hello"}),
            _node("n2", "set_variable", {"variableName": "y", "variableValue": "{x} world"}),
            _node("n3", "print_log", {"logMessage": "y={y}"}),
        ],
        "edges": [_edge("n1", "n2"), _edge("n2", "n3")],
    }
    res = await _run_once(wf, headless=True)
    assert res["success"] is True, res.get("error")
    assert res["executed_nodes"] == 3
    assert res["failed_nodes"] == 0
    assert res["variables"].get("x") == "hello"
    assert res["variables"].get("y") == "hello world"  # 变量在节点间流转


async def test_failing_node_reported():
    """click_element 空选择器 -> 确定性失败（前置校验返回失败，无需浏览器）。"""
    wf = {
        "id": "e2e_fail", "name": "fail",
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


async def test_loop_count_dedup():
    """循环体执行多次，但成功节点数应按节点 id 去重统计（历史 bug：重复累加）。"""
    wf = {
        "id": "e2e_loop", "name": "loop",
        "nodes": [
            _node("lp", "loop", {"loopType": "count", "loopCount": 3, "indexVariable": "i"}),
            _node("body", "set_variable", {"variableName": "x", "variableValue": "{i}"}),
            _node("done", "print_log", {"logMessage": "done"}),
        ],
        "edges": [_edge("lp", "body", "loop"), _edge("lp", "done", "done")],
    }
    res = await _run_once(wf, headless=True)
    assert res["success"] is True, res.get("error")
    # 唯一节点共 3 个（lp/body/done），循环体跑 3 次也只应计 3，不应是 1+3+1=5
    assert res["executed_nodes"] == 3
    assert res["failed_nodes"] == 0


# ---------------------------------------------------------------------------
# 5.3 选择器自愈集成测试（mock 页面，不启动真实浏览器）
# ---------------------------------------------------------------------------

class _FakeLocator:
    """模拟 Playwright Locator：wait_for 按选择器是否"有效"决定成功/抛错。"""

    def __init__(self, selector, ok):
        self.selector = selector
        self._ok = ok
        self.first = self  # locator(sel).first 返回自身

    async def wait_for(self, state=None, timeout=None):
        if not self._ok:
            raise RuntimeError(f"element not found: {self.selector}")
        return None


class _FakePage:
    """模拟页面：仅当选择器包含 good_token 时定位成功。"""

    def __init__(self, good_token):
        self.good_token = good_token
        self.calls = []

    def locator(self, selector):
        self.calls.append(selector)
        return _FakeLocator(selector, ok=(self.good_token in selector))


async def test_self_heal_with_mock_page(make_context):
    """首选选择器失效、提供有效 fallback hint 时，smart_wait_locator 应自愈成功并上报。"""
    from app.executors.base import smart_wait_locator

    page = _FakePage(good_token="submit-btn")
    ctx = make_context()
    node_config = {"selector": "#stale-old-selector"}
    hints = {"tag": "button", "id": "submit-btn"}

    loc = await smart_wait_locator(
        page, "#stale-old-selector", hints=hints, state="visible",
        timeout=1000, node_config=node_config, context=ctx, config_key="selector",
    )

    # 自愈成功：返回的 locator 命中候选锚点 #submit-btn
    assert loc is not None
    assert "submit-btn" in loc.selector
    # 节点配置被回写为可用选择器，下次直接命中
    assert node_config["selector"] == "#submit-btn"
    # 自愈记录写入上下文（供持久化回写）
    healed = getattr(ctx, "_healed_selectors", [])
    assert any(r.get("newSelector") == "#submit-btn" for r in healed)


async def test_self_heal_raises_when_no_fallback(make_context):
    """首选失效且无有效 fallback hint 时，应抛出原始异常（不静默吞错）。"""
    from app.executors.base import smart_wait_locator

    page = _FakePage(good_token="never-matches")
    ctx = make_context()

    with pytest.raises(Exception):
        await smart_wait_locator(
            page, "#stale", hints={}, state="visible", timeout=500, context=ctx,
        )
