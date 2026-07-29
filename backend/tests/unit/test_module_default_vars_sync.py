# -*- coding: utf-8 -*-
"""前后端「模块内置变量」登记一致性测试。

为什么需要跨端断言：
前端的变量名自动补全依赖 frontend/src/lib/moduleDefaultVars.ts 里的 MODULE_DEFAULT_VARS，
而「模块创建即内置某个变量」这件事的真正事实来源在后端执行器——凡是
config.get('xxxVariable', '默认名') 带非空默认值的模块，用户不填也会产生该变量。
两边不同步时，那些变量在补全列表里根本不出现（Word、SAP 会话句柄等就曾整批遗漏）。

前端已有的 moduleDefaultVars.audit.test.ts 只校验「已登记条目的自洽性」，
查不出「漏登记」，所以必须由这条反向审计来守。
"""
import os
import re

import pytest

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_EXECUTORS_DIR = os.path.join(_BACKEND_DIR, "app", "executors")
_MDV_PATH = os.path.join(
    os.path.dirname(_BACKEND_DIR), "frontend", "src", "lib", "moduleDefaultVars.ts"
)

# config.get('xxxVariable', '默认值')
_FIELD_RE = re.compile(
    r"""config\.get\(\s*['"]([A-Za-z0-9_]*[Vv]ariable[A-Za-z0-9_]*)['"]\s*,\s*['"]([^'"]+)['"]"""
)
# (config.get('xxxVariable') or '默认值')
_FIELD_OR_RE = re.compile(
    r"""config\.get\(\s*['"]([A-Za-z0-9_]*[Vv]ariable[A-Za-z0-9_]*)['"]\s*\)\s*or\s*['"]([^'"]+)['"]"""
)
_MODTYPE_RE = re.compile(r"""return\s+['"]([a-z0-9_]+)['"]""")


def _frontend_registered() -> set:
    src = open(_MDV_PATH, encoding="utf-8").read()
    body = src[src.index("MODULE_DEFAULT_VARS"):src.index("export function getModuleDefaultVar")]
    return set(re.findall(r"^\s{2}([a-z0-9_]+):\s*\{", body, re.M))


def _frontend_whitelist() -> set:
    src = open(_MDV_PATH, encoding="utf-8").read()
    block = src[src.index("export const VARIABLE_NAME_FIELDS"):]
    # 从 "= [" 之后开始截，否则会被类型注解 string[] 里的 ] 提前截断
    block = block[block.index("= [") + 3:]
    block = block[: block.index("]")]
    return set(re.findall(r"'([A-Za-z0-9_]+)'", block))


def _frontend_entries() -> dict:
    """{module_type: {field: default}}：解析前端 MODULE_DEFAULT_VARS 的逐字段登记内容"""
    src = open(_MDV_PATH, encoding="utf-8").read()
    body = src[src.index("MODULE_DEFAULT_VARS"):src.index("export function getModuleDefaultVar")]
    entries: dict = {}
    for m in re.finditer(r"^\s{2}([a-z0-9_]+):\s*\{([^}]*)\}", body, re.M | re.S):
        fields = dict(re.findall(r"([A-Za-z0-9_]+):\s*'([^']*)'", m.group(2)))
        entries[m.group(1)] = fields
    return entries


def _backend_defaults() -> dict:
    """{module_type: {field: default}}，只收集带非空默认值的变量名字段"""
    findings: dict = {}
    for name in sorted(os.listdir(_EXECUTORS_DIR)):
        if not name.endswith(".py"):
            continue
        src = open(os.path.join(_EXECUTORS_DIR, name), encoding="utf-8").read()
        marks = [(m.start(), m.group(1)) for m in _MODTYPE_RE.finditer(src)]
        for i, (pos, mtype) in enumerate(marks):
            end = marks[i + 1][0] if i + 1 < len(marks) else len(src)
            seg = src[pos:end]
            hits = {}
            for field, default in _FIELD_RE.findall(seg):
                if default.strip():
                    hits[field] = default
            for field, default in _FIELD_OR_RE.findall(seg):
                if default.strip():
                    hits[field] = default
            if hits:
                findings.setdefault(mtype, {}).update(hits)
    return findings


@pytest.fixture(scope="module")
def backend_defaults():
    data = _backend_defaults()
    assert data, "未从后端执行器扫到任何带默认值的变量字段，说明扫描规则失效"
    return data


def test_every_backend_builtin_var_module_is_registered(backend_defaults):
    """后端「创建即内置变量」的模块必须都登记进前端 MODULE_DEFAULT_VARS"""
    registered = _frontend_registered()
    gaps = {t: f for t, f in backend_defaults.items() if t not in registered}
    detail = "\n".join(
        f"  {t}: " + ", ".join(f"{k}='{v}'" for k, v in sorted(fields.items()))
        for t, fields in sorted(gaps.items())
    )
    assert not gaps, (
        f"以下模块在后端带非空默认变量，但未登记进 frontend/src/lib/moduleDefaultVars.ts 的\n"
        f"MODULE_DEFAULT_VARS，其内置变量不会出现在变量名自动补全里（共 {len(gaps)} 个）：\n{detail}"
    )


def test_every_backend_builtin_var_field_is_registered(backend_defaults):
    """精度到字段：已登记模块也必须把每个带默认值的变量字段都登记齐。

    只按模块粒度比对会漏掉「模块登记了、但少登记一个字段」的情况
    （例如 webhook_request 曾只登记 response/status，漏了 headers/cookies）。
    """
    frontend = _frontend_entries()
    gaps = []
    for mtype, fields in sorted(backend_defaults.items()):
        if mtype not in frontend:
            continue  # 模块级缺口由上一个用例负责报告
        for field, default in sorted(fields.items()):
            if field not in frontend[mtype]:
                gaps.append(f"  {mtype}.{field} = '{default}'")
    assert not gaps, (
        "以下「模块.字段」在后端带非空默认变量，但前端 MODULE_DEFAULT_VARS 中该模块条目里缺失，\n"
        "这些内置变量不会出现在变量名自动补全里：\n" + "\n".join(gaps)
    )


def test_every_backend_var_field_is_whitelisted(backend_defaults):
    """后端用到的变量名字段必须都在 VARIABLE_NAME_FIELDS 白名单内。

    白名单是「从节点配置里提取已填变量名」的依据；漏收字段会导致用户改填自定义
    变量名后，补全与变量追踪都看不到它（sessionVariable 就曾漏收）。
    """
    whitelist = _frontend_whitelist()
    assert whitelist, "未解析到 VARIABLE_NAME_FIELDS 白名单，说明解析规则失效"
    missing = sorted({f for fields in backend_defaults.values() for f in fields} - whitelist)
    assert not missing, (
        "以下变量名字段被后端使用，但不在 VARIABLE_NAME_FIELDS 白名单内："
        + ", ".join(missing)
    )
