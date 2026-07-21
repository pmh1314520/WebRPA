"""工作流单元测试 / 回归

给工作流写断言用例（输入 X → 期望结果 Y），一键批量回归，改完工作流不怕跑坏。
配合执行历史（source=test）记录每次回归结果。

用例结构：
  {
    "name": "用例名",
    "inputs": {"变量名": 值, ...},          # 注入为工作流初始变量
    "asserts": [
       {"field": "status", "op": "==", "value": "success"},
       {"field": "variable", "name": "total", "op": ">=", "value": 10},
       {"field": "data_count", "op": ">", "value": 0},
       {"field": "data_contains", "op": "contains", "value": "成功"}
    ]
  }
断言存储：backend/data/workflow_tests.json（按工作流名归档）
"""

from __future__ import annotations

import json
import threading
from pathlib import Path
from typing import Any
from app.utils.paths import BACKEND_DATA_DIR

_LOCK = threading.Lock()


def _store_file() -> Path:
    folder = BACKEND_DATA_DIR
    folder.mkdir(parents=True, exist_ok=True)
    return folder / "workflow_tests.json"


def _load() -> dict[str, Any]:
    f = _store_file()
    if not f.exists():
        return {}
    try:
        return json.loads(f.read_text(encoding="utf-8")) or {}
    except Exception:
        return {}


def _save(data: dict[str, Any]) -> None:
    _store_file().write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def list_suites() -> dict[str, Any]:
    data = _load()
    return {"suites": [{"workflow": k, "cases": len(v)} for k, v in data.items()]}


def get_suite(workflow: str) -> dict[str, Any]:
    return {"workflow": workflow, "cases": _load().get(workflow, [])}


def save_suite(workflow: str, cases: list) -> dict[str, Any]:
    workflow = (workflow or "").strip()
    if not workflow:
        return {"error": "workflow 不能为空"}
    if not isinstance(cases, list):
        return {"error": "cases 必须是数组"}
    with _LOCK:
        data = _load()
        data[workflow] = cases
        _save(data)
    return {"success": True, "workflow": workflow, "cases": len(cases)}


def delete_suite(workflow: str) -> dict[str, Any]:
    with _LOCK:
        data = _load()
        existed = workflow in data
        data.pop(workflow, None)
        _save(data)
    return {"success": existed}


def _compare(actual: Any, op: str, expected: Any) -> bool:
    op = (op or "==").lower()
    try:
        if op in ("contains", "包含"):
            return str(expected) in str(actual)
        if op in ("not_contains",):
            return str(expected) not in str(actual)
        if op in ("==", "eq", "equals"):
            # 数字宽松比较
            try:
                return float(actual) == float(expected)
            except Exception:
                return str(actual) == str(expected)
        if op in ("!=", "ne"):
            return str(actual) != str(expected)
        a = float(actual); b = float(expected)
        if op in (">", "gt"):
            return a > b
        if op in (">=", "ge"):
            return a >= b
        if op in ("<", "lt"):
            return a < b
        if op in ("<=", "le"):
            return a <= b
    except Exception:
        return False
    return False


def _eval_assert(a: dict[str, Any], result: dict[str, Any]) -> dict[str, Any]:
    field = (a.get("field") or "").lower()
    op = a.get("op", "==")
    expected = a.get("value")
    ok = False
    actual: Any = None
    if field == "status":
        actual = result.get("status")
        ok = _compare(actual, op, expected)
    elif field == "variable":
        name = a.get("name", "")
        actual = (result.get("variables") or {}).get(name)
        ok = _compare(actual, op, expected)
    elif field == "data_count":
        actual = len(result.get("collected_data") or [])
        ok = _compare(actual, op, expected)
    elif field == "data_contains":
        rows = result.get("collected_data") or []
        blob = json.dumps(rows, ensure_ascii=False, default=str)
        actual = "<collected_data>"
        ok = _compare(blob, op or "contains", expected)
    else:
        return {"ok": False, "field": field, "error": f"未知断言字段：{field}"}
    return {"ok": bool(ok), "field": field, "name": a.get("name"), "op": op, "expected": expected, "actual": actual}


async def run_suite(workflow: str, *, headless: bool = True) -> dict[str, Any]:
    """运行某工作流的全部测试用例，返回逐用例的通过/失败结果。"""
    cases = _load().get(workflow, [])
    if not cases:
        return {"error": f"工作流「{workflow}」没有测试用例"}
    from app.services.workflow_runner import load_workflow_dict, run_workflow

    try:
        base_wf = load_workflow_dict(workflow)
    except Exception as e:
        return {"error": f"无法加载工作流：{e}"}

    case_reports: list[dict[str, Any]] = []
    passed = 0
    for case in cases:
        cname = case.get("name", "用例")
        inputs = case.get("inputs") or {}
        wf = dict(base_wf)
        if inputs:
            existing = list(wf.get("variables") or [])
            names = {v.get("name") for v in existing if isinstance(v, dict)}
            for k, v in inputs.items():
                if k in names:
                    for ev in existing:
                        if isinstance(ev, dict) and ev.get("name") == k:
                            ev["value"] = v
                else:
                    existing.append({"name": k, "value": v, "type": "string"})
            wf["variables"] = existing
        # 测试运行不重试、不污染告警（source=test）
        result = await run_workflow(wf, headless=headless, source_tag="test", apply_retry=False)
        assert_results = [_eval_assert(a, result) for a in (case.get("asserts") or [])]
        case_ok = result.get("success", False) and all(ar["ok"] for ar in assert_results)
        # 若没有任何断言，则以运行成功作为通过标准
        if not assert_results:
            case_ok = result.get("success", False)
        if case_ok:
            passed += 1
        case_reports.append({
            "name": cname,
            "passed": case_ok,
            "run_status": result.get("status"),
            "run_error": result.get("error"),
            "asserts": assert_results,
        })

    total = len(cases)
    return {
        "workflow": workflow,
        "total": total,
        "passed": passed,
        "failed": total - passed,
        "pass_rate": round(passed / total * 100, 1) if total else 0.0,
        "all_passed": passed == total,
        "cases": case_reports,
    }


async def run_all_suites(*, headless: bool = True) -> dict[str, Any]:
    """运行所有工作流的全部用例（全量回归）。"""
    data = _load()
    reports = []
    total_pass = 0
    total_cases = 0
    for wf in data.keys():
        r = await run_suite(wf, headless=headless)
        if "error" in r:
            reports.append({"workflow": wf, "error": r["error"]})
            continue
        reports.append({"workflow": wf, "total": r["total"], "passed": r["passed"], "all_passed": r["all_passed"]})
        total_pass += r["passed"]
        total_cases += r["total"]
    return {
        "suites": len(data),
        "total_cases": total_cases,
        "total_passed": total_pass,
        "all_passed": total_pass == total_cases and total_cases > 0,
        "reports": reports,
    }
