# -*- coding: utf-8 -*-
"""模块清单一致性测试：AI 小助手 schema 覆盖率 + README 模块数量。

这两项都是「新增模块时最容易忘记同步」的地方，且忘了不会报错，只会静默退化：
  · AI 小助手缺 schema 的模块，它就不知道该模块存在、也不会正确填参数
    （Word 全部 13 个模块与「运行其它工作流」就曾整批缺失）。
  · README 的模块数量徽章一旦落后，对外宣传口径就是错的。
"""
import os
import re

import pytest

_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
_FE = os.path.join(_ROOT, "frontend", "src")
_BE = os.path.join(_ROOT, "backend", "app")


def _read(path):
    return open(path, encoding="utf-8").read()


def _module_library_types() -> set:
    """左侧模块库（moduleCategories）的模块全集——对外宣称的「模块数量」口径"""
    src = _read(os.path.join(_FE, "components", "workflow", "ModuleSidebar.tsx"))
    body = src[src.index("const moduleCategories = ["):src.index("export { moduleCategories }")]
    types = set()
    for block in re.finditer(r"modules:\s*\[(.*?)\]", body, re.S):
        types.update(re.findall(r"'([a-z0-9_]+)'", block.group(1)))
    return types


def _ai_schema_types() -> set:
    src = _read(os.path.join(_BE, "services", "ai_assistant_module_schemas.py"))
    return set(re.findall(r"^\s{4}['\"]([a-z0-9_]+)['\"]\s*:\s*\{", src, re.M))


@pytest.fixture(scope="module")
def library_types():
    types = _module_library_types()
    assert len(types) > 100, "解析模块库失败，规则需更新"
    return types


def test_ai_assistant_covers_every_module(library_types):
    """模块库里的每个模块都要有 AI 小助手 schema，否则 AI 无法操作该模块"""
    missing = sorted(library_types - _ai_schema_types())
    assert not missing, (
        "以下模块在模块库中存在，但 backend/app/services/ai_assistant_module_schemas.py 里\n"
        f"没有对应 schema，AI 小助手无法正确使用它们（共 {len(missing)} 个）：\n  "
        + "\n  ".join(missing)
    )


@pytest.mark.parametrize("readme", ["README.md", "README.EN.md"])
def test_readme_module_count_matches_library(readme, library_types):
    """README 徽章里的模块数量必须与模块库实际数量一致"""
    src = _read(os.path.join(_ROOT, readme))
    if readme == "README.md":
        found = re.findall(r"模块数量-(\d+)个", src)
    else:
        found = re.findall(r"modules-(\d+)-", src)
    assert found, f"{readme} 中未找到模块数量徽章，请检查徽章格式是否被改动"
    expected = len(library_types)
    for value in found:
        assert int(value) == expected, (
            f"{readme} 的模块数量徽章是 {value}，模块库实际有 {expected} 个模块。"
            f"新增/删除模块后请同步更新 README（中英文都要改）。"
        )
