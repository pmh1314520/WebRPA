"""安全表达式求值器（用于工作流循环/条件表达式）。

背景：此前用 eval(expr, {"__builtins__": {}}, vars) 求值条件，虽隔离了 builtins，
但 Python 该沙箱存在已知逃逸手法（如 ().__class__.__base__.__subclasses__()），
从工作流仓库导入他人分享的工作流时，恶意条件表达式可能借此执行任意代码。

本模块用 AST 白名单求值：仅允许 比较 / 布尔运算 / 一元与二元算术 / 成员运算 /
字面量 / 变量引用，禁止属性访问（杜绝 __class__ 等 dunder）、函数调用、下标以外的
任何可调用/导入行为。无法安全求值时抛出 UnsafeExpressionError，由调用方回退处理。
"""
from __future__ import annotations

import ast
import operator
from typing import Any

_BIN_OPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Mod: operator.mod,
    ast.FloorDiv: operator.floordiv,
    ast.Pow: operator.pow,
}

_UNARY_OPS = {
    ast.UAdd: operator.pos,
    ast.USub: operator.neg,
    ast.Not: operator.not_,
}

_CMP_OPS = {
    ast.Eq: operator.eq,
    ast.NotEq: operator.ne,
    ast.Lt: operator.lt,
    ast.LtE: operator.le,
    ast.Gt: operator.gt,
    ast.GtE: operator.ge,
    ast.In: lambda a, b: a in b,
    ast.NotIn: lambda a, b: a not in b,
}

# 幂运算上限，防止 10**10**10 之类的资源耗尽
_MAX_POW_EXP = 1000


class UnsafeExpressionError(Exception):
    """表达式包含不允许的语法（属性访问/函数调用/导入等）或无法安全求值。"""


def safe_eval(expr: str, variables: dict[str, Any] | None = None) -> Any:
    """安全求值一个表达式字符串。variables 提供可引用的变量。

    仅支持比较/布尔/算术/成员运算与字面量、变量引用；遇到任何不在白名单内的
    语法节点或未知变量都会抛出 UnsafeExpressionError。
    """
    variables = variables or {}
    try:
        tree = ast.parse(expr, mode="eval")
    except SyntaxError as e:  # 语法错误交给调用方回退
        raise UnsafeExpressionError(f"表达式语法错误: {e}")
    return _eval(tree.body, variables)


def _eval(node: ast.AST, vars: dict[str, Any]) -> Any:
    if isinstance(node, ast.Constant):
        return node.value

    if isinstance(node, ast.Name):
        if node.id in vars:
            return vars[node.id]
        raise UnsafeExpressionError(f"未知变量: {node.id}")

    if isinstance(node, ast.BoolOp):
        if isinstance(node.op, ast.And):
            result: Any = True
            for v in node.values:
                result = _eval(v, vars)
                if not result:
                    return result
            return result
        # Or
        result = False
        for v in node.values:
            result = _eval(v, vars)
            if result:
                return result
        return result

    if isinstance(node, ast.UnaryOp) and type(node.op) in _UNARY_OPS:
        return _UNARY_OPS[type(node.op)](_eval(node.operand, vars))

    if isinstance(node, ast.BinOp) and type(node.op) in _BIN_OPS:
        left = _eval(node.left, vars)
        right = _eval(node.right, vars)
        if isinstance(node.op, ast.Pow):
            try:
                if isinstance(right, (int, float)) and right > _MAX_POW_EXP:
                    raise UnsafeExpressionError("幂运算指数过大")
            except TypeError:
                pass
        return _BIN_OPS[type(node.op)](left, right)

    if isinstance(node, ast.Compare):
        left = _eval(node.left, vars)
        for op, comparator in zip(node.ops, node.comparators):
            op_type = type(op)
            if op_type not in _CMP_OPS:
                raise UnsafeExpressionError(f"不支持的比较运算: {op_type.__name__}")
            right = _eval(comparator, vars)
            if not _CMP_OPS[op_type](left, right):
                return False
            left = right
        return True

    if isinstance(node, (ast.List, ast.Tuple, ast.Set)):
        items = [_eval(e, vars) for e in node.elts]
        if isinstance(node, ast.Tuple):
            return tuple(items)
        if isinstance(node, ast.Set):
            return set(items)
        return items

    if isinstance(node, ast.Dict):
        return {_eval(k, vars): _eval(v, vars) for k, v in zip(node.keys, node.values)}

    # 其余节点（Attribute / Call / Lambda / Comprehension / Subscript / Starred 等）一律拒绝
    raise UnsafeExpressionError(f"不允许的表达式节点: {type(node).__name__}")
