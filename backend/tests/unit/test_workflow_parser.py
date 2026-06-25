# -*- coding: utf-8 -*-
"""workflow_parser 单元测试：解析为执行图、汇合排除错误边、校验。"""
import pytest

from app.services.workflow_parser import parse_workflow, WorkflowParser
from app.models.workflow import Workflow


def _node(nid, ntype="print_log"):
    return {"id": nid, "type": ntype, "position": {"x": 0, "y": 0}, "data": {}}


def _edge(src, tgt, handle=None):
    e = {"id": f"e_{src}_{tgt}_{handle or ''}", "source": src, "target": tgt}
    if handle:
        e["sourceHandle"] = handle
    return e


@pytest.mark.unit
class TestParse:
    def test_linear_graph(self):
        wf = {
            "id": "w1", "name": "linear",
            "nodes": [_node("a"), _node("b"), _node("c")],
            "edges": [_edge("a", "b"), _edge("b", "c")],
        }
        _, g = parse_workflow(wf)
        assert g.get_start_nodes() == ["a"]
        assert g.get_next_nodes("a") == ["b"]
        assert g.get_next_nodes("b") == ["c"]
        assert g.get_prev_nodes("c") == ["b"]

    def test_visual_nodes_skipped(self):
        wf = {
            "id": "w2", "name": "visual",
            "nodes": [_node("a"), _node("g", "group"), _node("n", "note"), _node("b")],
            "edges": [_edge("a", "b")],
        }
        _, g = parse_workflow(wf)
        assert "g" not in g.nodes and "n" not in g.nodes
        assert set(g.nodes.keys()) == {"a", "b"}

    def test_condition_branches(self):
        wf = {
            "id": "w3", "name": "cond",
            "nodes": [_node("c", "condition"), _node("t"), _node("f")],
            "edges": [_edge("c", "t", "true"), _edge("c", "f", "false")],
        }
        _, g = parse_workflow(wf)
        assert g.get_next_nodes("c", "true") == ["t"]
        assert g.get_next_nodes("c", "false") == ["f"]

    def test_loop_branches(self):
        wf = {
            "id": "w4", "name": "loop",
            "nodes": [_node("l", "loop"), _node("body"), _node("after")],
            "edges": [_edge("l", "body", "loop"), _edge("l", "after", "done")],
        }
        _, g = parse_workflow(wf)
        assert g.get_loop_body_nodes("l") == ["body"]
        assert g.get_loop_done_nodes("l") == ["after"]

    def test_error_edge_excluded_from_join(self):
        # b 有两个前驱：正常来源 a 与 错误回流来源 d（d 的 error -> b）
        wf = {
            "id": "w5", "name": "err",
            "nodes": [_node("a"), _node("b"), _node("d")],
            "edges": [_edge("a", "b"), _edge("b", "d"), _edge("d", "b", "error")],
        }
        _, g = parse_workflow(wf)
        # error 边来源 d 进入 error_branches，并记入 error_pred[b]
        assert g.get_error_nodes("d") == ["b"]
        # 普通前驱包含 a 与 d；但 join 前驱应排除错误来源 d，避免回流成环死锁
        assert set(g.get_prev_nodes("b")) == {"a", "d"}
        assert g.get_join_prev_nodes("b") == ["a"]


@pytest.mark.unit
class TestValidate:
    def test_empty_workflow_invalid(self):
        ok, errors = WorkflowParser().validate(Workflow(id="x", name="empty", nodes=[], edges=[]))
        assert ok is False and any("没有任何节点" in e for e in errors)

    def test_duplicate_node_id(self):
        wf = Workflow(**{
            "id": "w", "name": "dup",
            "nodes": [_node("a"), _node("a")], "edges": [],
        })
        ok, errors = WorkflowParser().validate(wf)
        assert ok is False and any("重复的节点ID" in e for e in errors)

    def test_edge_referencing_missing_node(self):
        wf = Workflow(**{
            "id": "w", "name": "badedge",
            "nodes": [_node("a")], "edges": [_edge("a", "ghost")],
        })
        ok, errors = WorkflowParser().validate(wf)
        assert ok is False and any("目标节点不存在" in e for e in errors)
