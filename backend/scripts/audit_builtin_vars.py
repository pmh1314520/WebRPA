"""模块内置变量核验脚本（红核验工具）。

目的：以「后端执行器源码」为权威数据源，扫描每个模块在创建时会自动建立的
内置变量字段（即变量名字段带有非空默认值，例如 config.get('saveToVariable',
'webhook_data')），再与前端 frontend/src/lib/moduleDefaultVars.ts 中的
MODULE_DEFAULT_VARS 登记表比对，列出「应登记但未登记 / 已登记但后端已无」的缺口。

设计依据：design.md 子系统 2 与 Property 4/6；本脚本只做核验（列缺口），
不做任何补登记修复（补登记属于任务 2.3）。

运行（从项目根目录）：
    .\\Python313\\python.exe backend\\scripts\\audit_builtin_vars.py

约束：禁用 Emoji；输出纯文本，可在 Windows 控制台正常显示。
"""
from __future__ import annotations

import ast
import io
import re
import sys
from pathlib import Path


# ---------------------------------------------------------------------------
# 路径定位（脚本位于 backend/scripts/ 下，向上推导项目根）
# ---------------------------------------------------------------------------
_SCRIPT = Path(__file__).resolve()
_BACKEND_ROOT = _SCRIPT.parent.parent            # backend/
_PROJECT_ROOT = _BACKEND_ROOT.parent             # 项目根
EXECUTORS_DIR = _BACKEND_ROOT / "app" / "executors"
FRONTEND_DEFAULT_VARS = (
    _PROJECT_ROOT / "frontend" / "src" / "lib" / "moduleDefaultVars.ts"
)


# 兜底的「会产生变量的字段名」白名单。
# 优先从前端 moduleDefaultVars.ts 的 VARIABLE_NAME_FIELDS 解析（单一数据源），
# 解析失败时回退到此集合，保证脚本始终可独立运行。
_FALLBACK_VAR_FIELDS: set[str] = {
    "variableName", "resultVariable", "outputVariable", "targetVariable",
    "dataVariable", "saveResult", "saveToVariable",
    "itemVariable", "indexVariable", "loopIndexVariable", "keyVariable",
    "valueVariable", "variableNameX", "variableNameY",
    "listVariable", "dictVariable", "tableVariable",
    "imageVariable", "textVariable", "urlVariable", "fileVariable",
    "sourceVariable", "responseVariable", "cookieVariable", "headerVariable",
    "bodyVariable", "statusVariable", "errorVariable", "countVariable",
    "sumVariable", "avgVariable", "maxVariable", "minVariable",
    "connectionVariable", "shareVariable", "stdoutVariable", "stderrVariable",
    "returnCodeVariable", "appVariable", "controlVariable",
    "saveNewElementSelector", "saveChangeInfo", "dataSource",
}


# ---------------------------------------------------------------------------
# 前端 VARIABLE_NAME_FIELDS / MODULE_DEFAULT_VARS 解析
# ---------------------------------------------------------------------------
def parse_variable_name_fields(ts_path: Path) -> set[str]:
    """从前端 moduleDefaultVars.ts 解析 VARIABLE_NAME_FIELDS 数组（单一数据源）。

    解析失败时返回兜底集合，保证脚本独立可运行。
    """
    try:
        text = ts_path.read_text(encoding="utf-8")
    except OSError:
        return set(_FALLBACK_VAR_FIELDS)

    m = re.search(
        r"VARIABLE_NAME_FIELDS\s*:\s*string\[\]\s*=\s*\[(.*?)\]",
        text,
        re.DOTALL,
    )
    if not m:
        return set(_FALLBACK_VAR_FIELDS)

    body = m.group(1)
    # 去掉 // 行注释，避免把注释里的词当字段
    body = re.sub(r"//[^\n]*", "", body)
    fields = set(re.findall(r"['\"]([A-Za-z_][A-Za-z0-9_]*)['\"]", body))
    return fields or set(_FALLBACK_VAR_FIELDS)


def parse_frontend_default_vars(ts_path: Path) -> dict[str, dict[str, str]]:
    """解析前端 MODULE_DEFAULT_VARS，返回 {moduleType: {field: defaultName}}。

    结构为 [moduleType][field] = name，内层对象不含嵌套花括号，故可用
    「外层 key + 内层一层花括号」的方式提取。
    """
    try:
        text = ts_path.read_text(encoding="utf-8")
    except OSError:
        return {}

    # 截取 MODULE_DEFAULT_VARS = { ... } 的对象体（用花括号配平定位结束）
    start = re.search(r"MODULE_DEFAULT_VARS\s*:\s*[^=]*=\s*\{", text)
    if not start:
        return {}
    body_start = start.end() - 1  # 指向起始 '{'
    depth = 0
    body_end = None
    for i in range(body_start, len(text)):
        ch = text[i]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                body_end = i
                break
    if body_end is None:
        return {}

    body = text[body_start + 1: body_end]
    body = re.sub(r"//[^\n]*", "", body)  # 去行注释

    result: dict[str, dict[str, str]] = {}
    # 外层条目：moduleType: { ...无嵌套花括号... }
    entry_re = re.compile(r"([A-Za-z_][A-Za-z0-9_]*)\s*:\s*\{([^{}]*)\}")
    inner_re = re.compile(r"([A-Za-z_][A-Za-z0-9_]*)\s*:\s*['\"]([^'\"]+)['\"]")
    for em in entry_re.finditer(body):
        module_type = em.group(1)
        inner = em.group(2)
        fields = {im.group(1): im.group(2) for im in inner_re.finditer(inner)}
        if fields:
            result[module_type] = fields
    return result


# ---------------------------------------------------------------------------
# 后端执行器源码扫描（ast）
# ---------------------------------------------------------------------------
def _module_type_of_class(class_node: ast.ClassDef) -> str | None:
    """提取一个执行器类的 module_type 常量字符串。

    匹配形如:
        @property
        def module_type(self) -> str:
            return "loop"
    若 module_type 非常量（动态计算），返回 None。
    """
    for item in class_node.body:
        if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)) and item.name == "module_type":
            for sub in ast.walk(item):
                if isinstance(sub, ast.Return) and isinstance(sub.value, ast.Constant):
                    if isinstance(sub.value.value, str):
                        return sub.value.value
            return None
    return None


def _nonempty_str_default(call: ast.Call) -> bool:
    """判断 config.get('field', <default>) 的默认值是否为非空字符串字面量。

    非空字符串默认值 => 模块创建时即内置该变量（即使用户未填写）。
    """
    if len(call.args) < 2:
        return False
    default = call.args[1]
    return isinstance(default, ast.Constant) and isinstance(default.value, str) and bool(default.value.strip())


# 某些字段名虽在 VARIABLE_NAME_FIELDS 白名单内，但其默认值是「模式选择关键字」而非
# 真正的变量名（例如 feishu/wps 写入模块的 dataSource 默认 'manual'，含义是
# 「手动填写 vs 取自变量」的模式开关，不是创建时自带的内置变量名）。
# 这类 (字段, 默认值) 组合应排除，避免把模式开关误判为内置变量缺口。
_MODE_LIKE_DEFAULTS: dict[str, set[str]] = {
    "dataSource": {"manual", "variable"},
}


def _default_str_value(call: ast.Call) -> str | None:
    """取 config.get('field', <default>) 的字符串默认值（无则返回 None）。"""
    if len(call.args) < 2:
        return None
    default = call.args[1]
    if isinstance(default, ast.Constant) and isinstance(default.value, str):
        return default.value
    return None


def _scan_class(class_node: ast.ClassDef, var_fields: set[str]) -> tuple[set[str], set[str], bool]:
    """扫描单个执行器类，返回 (内置变量字段, 引用到的变量名字段, 是否写回 context)。

    - 内置变量字段：以 .get('<varField>', '<非空默认>') 形式出现的变量名字段，
      表示模块创建时即自带该变量（即使用户未填写），对应 MODULE_DEFAULT_VARS 语义。
    - 引用到的变量名字段：以 .get('<varField>', ...) 形式出现的变量名字段（默认值任意），
      用于判断「前端登记项是否已无对应执行器」，避免把默认值留空的输出字段误判为过时。
    - 写回 context：出现 context.set_variable(...) / add_data_value(...) 调用。
    """
    builtin_fields: set[str] = set()
    referenced_fields: set[str] = set()
    writes_context = False

    for node in ast.walk(class_node):
        if not isinstance(node, ast.Call):
            continue
        func = node.func
        if not isinstance(func, ast.Attribute):
            continue

        # 检测 .get('field', default)
        if func.attr == "get" and node.args:
            first = node.args[0]
            if isinstance(first, ast.Constant) and isinstance(first.value, str):
                field = first.value
                if field in var_fields:
                    referenced_fields.add(field)
                    if _nonempty_str_default(node):
                        # 排除「模式选择关键字」类默认值（非真正的内置变量名）
                        default_val = _default_str_value(node)
                        mode_vals = _MODE_LIKE_DEFAULTS.get(field)
                        if mode_vals and default_val in mode_vals:
                            pass
                        else:
                            builtin_fields.add(field)

        # 检测 set_variable / add_data_value 等写回上下文变量的调用
        if func.attr in ("set_variable", "add_data_value"):
            writes_context = True

    return builtin_fields, referenced_fields, writes_context


def scan_executor_modules() -> dict[str, dict]:
    """扫描 backend/app/executors/*.py 的完整结果（内部富结构）。

    返回 module_type -> {
        'builtin': set[str],      # 带非空默认值的内置变量字段
        'referenced': set[str],   # 引用到的变量名字段（默认值任意）
        'writes_context': bool,   # 是否写回 context 变量
    }
    一个文件可包含多个执行器类，每个类对应一个 module_type。
    """
    var_fields = parse_variable_name_fields(FRONTEND_DEFAULT_VARS)
    result: dict[str, dict] = {}

    for py_file in sorted(EXECUTORS_DIR.glob("*.py")):
        if py_file.name == "__init__.py":
            continue
        try:
            # utf-8-sig 兼容带 BOM 的源文件（如 desktop_advanced.py）
            source = py_file.read_text(encoding="utf-8-sig")
            tree = ast.parse(source, filename=str(py_file))
        except (OSError, SyntaxError) as exc:
            print(f"[WARN] 解析失败 {py_file.name}: {exc}")
            continue

        for node in ast.walk(tree):
            if not isinstance(node, ast.ClassDef):
                continue
            module_type = _module_type_of_class(node)
            if not module_type:
                continue
            builtin, referenced, writes_context = _scan_class(node, var_fields)
            entry = result.setdefault(
                module_type, {"builtin": set(), "referenced": set(), "writes_context": False}
            )
            entry["builtin"].update(builtin)
            entry["referenced"].update(referenced)
            entry["writes_context"] = entry["writes_context"] or writes_context

    return result


def scan_executor_builtin_vars() -> dict[str, set[str]]:
    """扫描执行器源码，返回 module_type -> 内置变量字段名集合。

    收录条件：模块「默认配置含变量名字段且带非空默认值」或「写回 context 变量」。
    其中带非空默认值的字段会被列入字段集合；仅写回 context 而无默认变量字段的模块
    以空集合占位（由 diff 判断是否需人工确认，这类通常由用户自行命名变量）。
    """
    result: dict[str, set[str]] = {}
    for module_type, info in scan_executor_modules().items():
        if info["builtin"]:
            result[module_type] = set(info["builtin"])
        elif info["writes_context"]:
            result.setdefault(module_type, set())
    return result


# ---------------------------------------------------------------------------
# 与前端 MODULE_DEFAULT_VARS 比对
# ---------------------------------------------------------------------------
def diff_against_frontend(default_vars: dict[str, set[str]]) -> dict:
    """将后端扫描结果与前端 MODULE_DEFAULT_VARS 比对，输出缺失/多余项。

    参数 default_vars：scan_executor_builtin_vars() 的返回值
        （module_type -> 内置变量字段名集合）。

    返回结构：
        {
          'missing_modules':   [module_type, ...]   后端有内置变量但前端完全未登记
          'missing_fields':    {module_type: [field, ...]}  模块已登记但缺字段
          'extra_modules':     [module_type, ...]   前端已登记但后端未检出（疑似过时）
          'writes_context_only': [module_type, ...] 仅写回上下文、无默认变量字段（信息项）
          'frontend_total':    int
          'backend_total':     int
        }
    """
    frontend = parse_frontend_default_vars(FRONTEND_DEFAULT_VARS)
    frontend_fields = {mt: set(fields.keys()) for mt, fields in frontend.items()}

    # 仅含有内置变量字段的后端模块才视为「应登记」候选
    backend_with_fields = {mt: fs for mt, fs in default_vars.items() if fs}
    writes_context_only = sorted(mt for mt, fs in default_vars.items() if not fs)

    missing_modules: list[str] = []
    missing_fields: dict[str, list[str]] = {}
    for mt, fields in sorted(backend_with_fields.items()):
        if mt not in frontend_fields:
            missing_modules.append(mt)
        else:
            gap = fields - frontend_fields[mt]
            if gap:
                missing_fields[mt] = sorted(gap)

    # 前端登记但后端「完全未引用任何变量名字段且不写回 context」的模块才算疑似过时。
    # 用宽口径（含空默认值的引用）判断，避免把默认值留空的输出字段误判为过时。
    rich = scan_executor_modules()
    backend_referenced = {
        mt for mt, info in rich.items()
        if info["referenced"] or info["builtin"] or info["writes_context"]
    }
    extra_modules = sorted(set(frontend_fields) - backend_referenced)

    return {
        "missing_modules": missing_modules,
        "missing_fields": missing_fields,
        "extra_modules": extra_modules,
        "writes_context_only": writes_context_only,
        "frontend_total": len(frontend_fields),
        "backend_total": len(backend_with_fields),
    }


# ---------------------------------------------------------------------------
# 报告打印
# ---------------------------------------------------------------------------
def main() -> int:
    # 确保中文在 Windows 控制台正常输出
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

    print("=" * 70)
    print("模块内置变量核验报告 (audit_builtin_vars)")
    print("=" * 70)
    print(f"执行器目录: {EXECUTORS_DIR}")
    print(f"前端登记表: {FRONTEND_DEFAULT_VARS}")
    print("-" * 70)

    backend = scan_executor_builtin_vars()
    diff = diff_against_frontend(backend)

    backend_with_fields = {mt: fs for mt, fs in backend.items() if fs}
    print(f"后端扫描: 含内置变量字段的模块 {len(backend_with_fields)} 个，"
          f"仅写回上下文(无默认字段)的模块 {len(diff['writes_context_only'])} 个")
    print(f"前端登记: MODULE_DEFAULT_VARS 共 {diff['frontend_total']} 个模块")
    print("-" * 70)

    missing_modules = diff["missing_modules"]
    print(f"[缺失模块] 后端含内置变量但前端未登记: {len(missing_modules)} 个")
    for mt in missing_modules:
        fields = sorted(backend_with_fields.get(mt, set()))
        print(f"  - {mt}: {', '.join(fields)}")

    missing_fields = diff["missing_fields"]
    print(f"[缺失字段] 模块已登记但缺少字段: {len(missing_fields)} 个")
    for mt, fields in sorted(missing_fields.items()):
        print(f"  - {mt}: {', '.join(fields)}")

    extra_modules = diff["extra_modules"]
    print(f"[疑似多余] 前端已登记但后端未检出: {len(extra_modules)} 个")
    for mt in extra_modules:
        print(f"  - {mt}")

    print("-" * 70)
    total_gaps = len(missing_modules) + len(missing_fields)
    if total_gaps == 0:
        print("结论: 内置变量登记完整，未发现缺口。")
    else:
        print(f"结论: 发现 {total_gaps} 处缺口（缺失模块 {len(missing_modules)} + "
              f"缺失字段 {len(missing_fields)}），待任务 2.3 补登记。")
    print("=" * 70)

    # 缺口存在时返回非零退出码，便于 CI/回归断言
    return 1 if total_gaps > 0 else 0


if __name__ == "__main__":
    raise SystemExit(main())
