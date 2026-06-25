"""AI 知识库核验脚本（红核验工具）。

目的：以「后端执行器注册表」为权威数据源（集合 A = registry.get_all_types()），
与「AI 知识库」MODULE_CATEGORIES 暴露的已知模块集合（集合 B =
get_all_known_module_types()）做双向差集，并核验每个已注册模块能否被 AI
describe / search 命中，最后断言 AI 的合法性判定清单与注册表一致。

设计依据：design.md 子系统 6 与 Property 11 / 12 / 13；本脚本只做核验
（列缺口），不做任何 MODULE_CATEGORIES 补全修复（补全属于任务 5.2）。

运行（从项目根目录）：
    .\\Python313\\python.exe backend\\scripts\\audit_ai_knowledge.py

约束：禁用 Emoji；输出纯文本，可在 Windows 控制台正常显示。
"""
from __future__ import annotations

import asyncio
import io
import sys
from pathlib import Path


# ---------------------------------------------------------------------------
# 路径定位（脚本位于 backend/scripts/ 下，向上推导项目根；将 backend/ 加入
# sys.path 以便 `import app...` 可用，参考其它后端脚本约定）
# ---------------------------------------------------------------------------
_SCRIPT = Path(__file__).resolve()
_BACKEND_ROOT = _SCRIPT.parent.parent            # backend/
_PROJECT_ROOT = _BACKEND_ROOT.parent             # 项目根
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))


# 知识库描述缺失时 skill_describe_module 返回的占位文案（视为 describe 失败）
_EMPTY_DESC_PLACEHOLDER = "（暂无文档）"


# ---------------------------------------------------------------------------
# 数据源加载（导入 app.executors 触发注册 / 启用懒加载清单）
# ---------------------------------------------------------------------------
def get_registry_types() -> set[str]:
    """返回后端执行器注册表的全部 module_type（集合 A，权威真相）。

    导入 app.executors 包会触发执行器注册（或启用磁盘懒加载清单），
    之后 registry.get_all_types() 即可拿到全部类型。
    """
    import app.executors  # noqa: F401  导入触发注册 / 懒加载
    from app.executors.base import registry

    return set(registry.get_all_types())


def get_knowledge_types() -> set[str]:
    """返回 AI 知识库 MODULE_CATEGORIES 暴露的全部已知 module_type（集合 B）。"""
    from app.services.ai_assistant_knowledge import get_all_known_module_types

    return set(get_all_known_module_types())


def get_valid_module_types() -> set[str]:
    """返回 AI 合法性判定清单 _get_valid_module_types()（用于 Property 13 比对）。"""
    from app.services.ai_assistant_skills import _get_valid_module_types

    return set(_get_valid_module_types())


# ---------------------------------------------------------------------------
# 双向差集：注册表 vs 知识库（Property 11）
# ---------------------------------------------------------------------------
def diff_registry_vs_knowledge() -> dict:
    """注册表（A）与 AI 知识库（B）的双向差集。

    返回结构：
        {
          'missing_in_kb': sorted(A - B)   已注册但知识库未收录（AI 不知道）
          'stale_in_kb':   sorted(B - A)   知识库收录但已不在注册表（疑似过时）
          'registry_total': int            注册表模块总数
          'knowledge_total': int           知识库已知模块总数
        }
    """
    registry_types = get_registry_types()
    knowledge_types = get_knowledge_types()
    return {
        "missing_in_kb": sorted(registry_types - knowledge_types),
        "stale_in_kb": sorted(knowledge_types - registry_types),
        "registry_total": len(registry_types),
        "knowledge_total": len(knowledge_types),
    }


# ---------------------------------------------------------------------------
# describe / search 覆盖核验（Property 12）
# ---------------------------------------------------------------------------
def _is_describe_failure(result: dict) -> bool:
    """判定 skill_describe_module 的返回是否算「描述缺失」。

    失败条件：返回 error，或 description 为空 / 仅占位文案（即知识库无真实描述）。
    """
    if not isinstance(result, dict):
        return True
    if result.get("error"):
        return True
    desc = (result.get("description") or "").strip()
    if not desc or desc == _EMPTY_DESC_PLACEHOLDER:
        return True
    return False


def _search_hits_module(result: dict, module_type: str) -> bool:
    """判定 skill_search_modules 的返回里是否检索到目标 module_type。"""
    if not isinstance(result, dict) or result.get("error"):
        return False
    for m in result.get("matches", []) or []:
        if isinstance(m, dict) and m.get("type") == module_type:
            return True
    return False


async def verify_describe_search_coverage() -> dict:
    """对每个已注册 module_type 调 describe / search，收集失败清单。

    - describe：调 skill_describe_module(module_type)，断言返回非空真实描述。
    - search：用 module_type 作为关键词调 skill_search_modules，断言能检索到自身
      （只有被 MODULE_CATEGORIES 收录的模块才会出现在搜索索引中）。

    返回结构：
        {
          'describe_failures': sorted([...])  describe 返回空/占位/出错的模块
          'search_failures':   sorted([...])  search 检索不到自身的模块
          'checked_total':     int            参与核验的已注册模块数
        }
    """
    from app.services.ai_assistant_skills import (
        skill_describe_module,
        skill_search_modules,
    )

    registry_types = sorted(get_registry_types())
    describe_failures: list[str] = []
    search_failures: list[str] = []

    for module_type in registry_types:
        try:
            desc_result = await skill_describe_module(module_type=module_type)
        except Exception as exc:  # 单模块失败不应中断整体核验
            desc_result = {"error": f"describe 异常: {exc}"}
        if _is_describe_failure(desc_result):
            describe_failures.append(module_type)

        try:
            search_result = await skill_search_modules(keyword=module_type)
        except Exception as exc:
            search_result = {"error": f"search 异常: {exc}"}
        if not _search_hits_module(search_result, module_type):
            search_failures.append(module_type)

    return {
        "describe_failures": sorted(describe_failures),
        "search_failures": sorted(search_failures),
        "checked_total": len(registry_types),
    }


# ---------------------------------------------------------------------------
# AI 合法性判定与注册表一致性（Property 13）
# ---------------------------------------------------------------------------
def diff_valid_vs_registry() -> dict:
    """比对 _get_valid_module_types() 与 registry.get_all_types()。

    返回结构：
        {
          'registry_not_valid': sorted(A - V)  已注册但 AI 判为非法（真实 bug）
          'valid_not_registry': sorted(V - A)  AI 判为合法但不在注册表
                                               （多为画布伪类型 / 本地自定义模块，属预期）
          'consistent': bool                    两集合是否完全相等
        }
    """
    registry_types = get_registry_types()
    valid_types = get_valid_module_types()
    registry_not_valid = sorted(registry_types - valid_types)
    valid_not_registry = sorted(valid_types - registry_types)
    return {
        "registry_not_valid": registry_not_valid,
        "valid_not_registry": valid_not_registry,
        "consistent": not registry_not_valid and not valid_not_registry,
    }


# ---------------------------------------------------------------------------
# 报告打印
# ---------------------------------------------------------------------------
def _print_list(items: list[str], indent: str = "  ", limit: int = 0) -> None:
    """逐行打印清单；limit > 0 时仅打印前 limit 条并标注剩余数量。"""
    shown = items if limit <= 0 else items[:limit]
    for it in shown:
        print(f"{indent}- {it}")
    if limit > 0 and len(items) > limit:
        print(f"{indent}... 其余 {len(items) - limit} 项省略")


def main() -> int:
    # 确保中文在 Windows 控制台正常输出
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

    print("=" * 70)
    print("AI 知识库核验报告 (audit_ai_knowledge)")
    print("=" * 70)

    # --- Property 11：注册表 vs 知识库双向差集 ---
    diff = diff_registry_vs_knowledge()
    print(f"注册表模块总数 (registry.get_all_types): {diff['registry_total']}")
    print(f"知识库已知模块总数 (get_all_known_module_types): {diff['knowledge_total']}")
    print("-" * 70)

    missing_in_kb = diff["missing_in_kb"]
    stale_in_kb = diff["stale_in_kb"]
    print(f"[Property 11] missing_in_kb (已注册但知识库未收录): {len(missing_in_kb)} 个")
    _print_list(missing_in_kb)
    print(f"[Property 11] stale_in_kb (知识库收录但已不在注册表): {len(stale_in_kb)} 个")
    _print_list(stale_in_kb)
    print("-" * 70)

    # --- Property 12：describe / search 覆盖核验 ---
    coverage = asyncio.run(verify_describe_search_coverage())
    describe_failures = coverage["describe_failures"]
    search_failures = coverage["search_failures"]
    print(f"[Property 12] 参与核验模块: {coverage['checked_total']} 个")
    print(f"[Property 12] describe_failures (描述缺失/占位/出错): {len(describe_failures)} 个")
    _print_list(describe_failures, limit=50)
    print(f"[Property 12] search_failures (按 type 检索不到自身): {len(search_failures)} 个")
    _print_list(search_failures, limit=50)
    print("-" * 70)

    # --- Property 13：AI 合法性判定与注册表一致 ---
    valid_diff = diff_valid_vs_registry()
    registry_not_valid = valid_diff["registry_not_valid"]
    valid_not_registry = valid_diff["valid_not_registry"]
    print(f"[Property 13] _get_valid_module_types 与注册表一致: {valid_diff['consistent']}")
    print(f"  registry_not_valid (已注册但 AI 判为非法 / 真实 bug): {len(registry_not_valid)} 个")
    _print_list(registry_not_valid)
    print(f"  valid_not_registry (合法清单含但不在注册表 / 多为伪类型与自定义模块): "
          f"{len(valid_not_registry)} 个")
    _print_list(valid_not_registry, limit=50)
    print("-" * 70)

    # --- 结论与退出码 ---
    # 真实缺口（需任务 5.2 修复）：missing_in_kb、describe/search 失败、注册表模块被判非法。
    # valid_not_registry 多为画布伪类型与本地自定义模块，属预期差异，仅作信息项不计入失败。
    gap_total = (
        len(missing_in_kb)
        + len(describe_failures)
        + len(search_failures)
        + len(registry_not_valid)
    )
    if gap_total == 0:
        print("结论: AI 知识库与注册表同步完整，未发现缺口。")
    else:
        print(
            f"结论: 发现缺口 —— missing_in_kb {len(missing_in_kb)}、"
            f"describe 失败 {len(describe_failures)}、search 失败 {len(search_failures)}、"
            f"registry_not_valid {len(registry_not_valid)}，待任务 5.2 补全 MODULE_CATEGORIES。"
        )
    print("=" * 70)

    return 1 if gap_total > 0 else 0


if __name__ == "__main__":
    raise SystemExit(main())
