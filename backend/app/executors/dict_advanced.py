"""字典高级操作模块执行器"""
import copy
from typing import Any, Dict

from .base import (
    ModuleExecutor,
    ExecutionContext,
    ModuleResult,
    register_executor,
)


@register_executor
class DictMergeExecutor(ModuleExecutor):
    """字典合并模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "dict_merge"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            # 字段与前端面板对齐: dict1/dict2 两个字典变量名；兼容旧字段 dictVariables(逗号分隔)
            dict_variables = context.resolve_value(config.get('dictVariables', ''))
            if dict_variables:
                var_names = [v.strip() for v in str(dict_variables).split(',') if v.strip()]
            else:
                d1 = context.resolve_value(config.get('dict1', ''))
                d2 = context.resolve_value(config.get('dict2', ''))
                var_names = [str(x).strip() for x in (d1, d2) if x not in ('', None)]
            result_variable = config.get('resultVariable', '')
            
            if not var_names:
                return ModuleResult(success=False, error="字典变量名不能为空")
            if not result_variable:
                return ModuleResult(success=False, error="结果变量名不能为空")
            
            result = {}
            
            for var_name in var_names:
                dict_data = context.get_variable(var_name)
                if dict_data is not None and isinstance(dict_data, dict):
                    result.update(dict_data)
            
            context.set_variable(result_variable, result)
            return ModuleResult(success=True, message=f"字典合并完成，共 {len(result)} 个键", data=result)
        except Exception as e:
            return ModuleResult(success=False, error=f"合并失败: {str(e)}")


@register_executor
class DictFilterExecutor(ModuleExecutor):
    """字典过滤模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "dict_filter"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            dict_variable = context.resolve_value(config.get('dictVariable', ''))
            filter_keys = context.resolve_value(config.get('filterKeys', ''))
            filter_mode = context.resolve_value(config.get('filterMode', 'include'))
            result_variable = config.get('resultVariable', '')
            
            if not dict_variable:
                return ModuleResult(success=False, error="字典变量名不能为空")
            if not result_variable:
                return ModuleResult(success=False, error="结果变量名不能为空")
            
            dict_data = context.get_variable(dict_variable)
            if dict_data is None:
                return ModuleResult(success=False, error=f"变量 '{dict_variable}' 不存在")
            if not isinstance(dict_data, dict):
                return ModuleResult(success=False, error=f"变量 '{dict_variable}' 不是字典类型")
            
            keys = [k.strip() for k in filter_keys.split(',') if k.strip()]
            
            if filter_mode == 'include':
                result = {k: v for k, v in dict_data.items() if k in keys}
            else:  # exclude
                result = {k: v for k, v in dict_data.items() if k not in keys}
            
            context.set_variable(result_variable, result)
            return ModuleResult(success=True, message=f"过滤完成，保留 {len(result)} 个键", data=result)
        except Exception as e:
            return ModuleResult(success=False, error=f"过滤失败: {str(e)}")


@register_executor
class DictMapValuesExecutor(ModuleExecutor):
    """字典映射值模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "dict_map_values"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            dict_variable = context.resolve_value(config.get('dictVariable', ''))
            operation = context.resolve_value(config.get('operation', 'multiply'))
            operand = context.resolve_value(config.get('operand', '1'))
            result_variable = config.get('resultVariable', '')
            
            if not dict_variable:
                return ModuleResult(success=False, error="字典变量名不能为空")
            if not result_variable:
                return ModuleResult(success=False, error="结果变量名不能为空")
            
            dict_data = context.get_variable(dict_variable)
            if dict_data is None:
                return ModuleResult(success=False, error=f"变量 '{dict_variable}' 不存在")
            if not isinstance(dict_data, dict):
                return ModuleResult(success=False, error=f"变量 '{dict_variable}' 不是字典类型")
            
            result = {}
            op_val = float(operand)
            
            for key, value in dict_data.items():
                if not isinstance(value, (int, float)):
                    try:
                        value = float(value)
                    except Exception:
                        result[key] = value
                        continue
                
                if operation == 'multiply':
                    result[key] = value * op_val
                elif operation == 'divide':
                    result[key] = value / op_val if op_val != 0 else value
                elif operation == 'add':
                    result[key] = value + op_val
                elif operation == 'subtract':
                    result[key] = value - op_val
            
            context.set_variable(result_variable, result)
            return ModuleResult(success=True, message=f"映射完成，处理 {len(result)} 个键值对", data=result)
        except Exception as e:
            return ModuleResult(success=False, error=f"映射失败: {str(e)}")


@register_executor
class DictInvertExecutor(ModuleExecutor):
    """字典反转模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "dict_invert"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            dict_variable = context.resolve_value(config.get('dictVariable', ''))
            result_variable = config.get('resultVariable', '')
            
            if not dict_variable:
                return ModuleResult(success=False, error="字典变量名不能为空")
            if not result_variable:
                return ModuleResult(success=False, error="结果变量名不能为空")
            
            dict_data = context.get_variable(dict_variable)
            if dict_data is None:
                return ModuleResult(success=False, error=f"变量 '{dict_variable}' 不存在")
            if not isinstance(dict_data, dict):
                return ModuleResult(success=False, error=f"变量 '{dict_variable}' 不是字典类型")
            
            result = {str(v): k for k, v in dict_data.items()}
            context.set_variable(result_variable, result)
            return ModuleResult(success=True, message=f"字典反转完成，共 {len(result)} 个键值对", data=result)
        except Exception as e:
            return ModuleResult(success=False, error=f"反转失败: {str(e)}")


@register_executor
class DictSortExecutor(ModuleExecutor):
    """字典排序模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "dict_sort"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            dict_variable = context.resolve_value(config.get('dictVariable', ''))
            sort_by = context.resolve_value(config.get('sortBy', 'key'))
            # 字段与前端面板对齐: order(asc/desc)，兼容旧字段名 sortOrder
            sort_order = context.resolve_value(config.get('sortOrder', config.get('order', 'asc')))
            result_variable = config.get('resultVariable', '')
            
            if not dict_variable:
                return ModuleResult(success=False, error="字典变量名不能为空")
            if not result_variable:
                return ModuleResult(success=False, error="结果变量名不能为空")
            
            dict_data = context.get_variable(dict_variable)
            if dict_data is None:
                return ModuleResult(success=False, error=f"变量 '{dict_variable}' 不存在")
            if not isinstance(dict_data, dict):
                return ModuleResult(success=False, error=f"变量 '{dict_variable}' 不是字典类型")
            
            reverse = (sort_order == 'desc')
            
            if sort_by == 'key':
                result = dict(sorted(dict_data.items(), key=lambda x: x[0], reverse=reverse))
            else:  # sort by value
                result = dict(sorted(dict_data.items(), key=lambda x: x[1], reverse=reverse))
            
            context.set_variable(result_variable, result)
            order_text = "降序" if reverse else "升序"
            by_text = "键" if sort_by == 'key' else "值"
            return ModuleResult(success=True, message=f"按{by_text}{order_text}排序完成", data=result)
        except Exception as e:
            return ModuleResult(success=False, error=f"排序失败: {str(e)}")


@register_executor
class DictDeepCopyExecutor(ModuleExecutor):
    """字典深拷贝模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "dict_deep_copy"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            dict_variable = context.resolve_value(config.get('dictVariable', ''))
            result_variable = config.get('resultVariable', '')
            
            if not dict_variable:
                return ModuleResult(success=False, error="字典变量名不能为空")
            if not result_variable:
                return ModuleResult(success=False, error="结果变量名不能为空")
            
            dict_data = context.get_variable(dict_variable)
            if dict_data is None:
                return ModuleResult(success=False, error=f"变量 '{dict_variable}' 不存在")
            if not isinstance(dict_data, dict):
                return ModuleResult(success=False, error=f"变量 '{dict_variable}' 不是字典类型")
            
            result = copy.deepcopy(dict_data)
            context.set_variable(result_variable, result)
            return ModuleResult(success=True, message="字典深拷贝完成", data=result)
        except Exception as e:
            return ModuleResult(success=False, error=f"深拷贝失败: {str(e)}")


@register_executor
class DictGetPathExecutor(ModuleExecutor):
    """字典路径取值模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "dict_get_path"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            dict_variable = context.resolve_value(config.get('dictVariable', ''))
            path = context.resolve_value(config.get('path', ''))
            default_value = context.resolve_value(config.get('defaultValue', ''))
            result_variable = config.get('resultVariable', '')
            
            if not dict_variable:
                return ModuleResult(success=False, error="字典变量名不能为空")
            if not path:
                return ModuleResult(success=False, error="路径不能为空")
            if not result_variable:
                return ModuleResult(success=False, error="结果变量名不能为空")
            
            dict_data = context.get_variable(dict_variable)
            if dict_data is None:
                return ModuleResult(success=False, error=f"变量 '{dict_variable}' 不存在")
            if not isinstance(dict_data, dict):
                return ModuleResult(success=False, error=f"变量 '{dict_variable}' 不是字典类型")
            
            keys = path.split('.')
            result = dict_data
            
            for key in keys:
                if isinstance(result, dict) and key in result:
                    result = result[key]
                else:
                    result = default_value
                    break
            
            context.set_variable(result_variable, result)
            return ModuleResult(success=True, message=f"路径取值完成: {path}", data=result)
        except Exception as e:
            return ModuleResult(success=False, error=f"路径取值失败: {str(e)}")


@register_executor
class DictFlattenExecutor(ModuleExecutor):
    """字典扁平化模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "dict_flatten"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            dict_variable = context.resolve_value(config.get('dictVariable', ''))
            separator = context.resolve_value(config.get('separator', '.'))
            result_variable = config.get('resultVariable', '')
            
            if not dict_variable:
                return ModuleResult(success=False, error="字典变量名不能为空")
            if not result_variable:
                return ModuleResult(success=False, error="结果变量名不能为空")
            
            dict_data = context.get_variable(dict_variable)
            if dict_data is None:
                return ModuleResult(success=False, error=f"变量 '{dict_variable}' 不存在")
            if not isinstance(dict_data, dict):
                return ModuleResult(success=False, error=f"变量 '{dict_variable}' 不是字典类型")
            
            def flatten_dict(d, parent_key=''):
                items = []
                for k, v in d.items():
                    new_key = f"{parent_key}{separator}{k}" if parent_key else k
                    if isinstance(v, dict):
                        items.extend(flatten_dict(v, new_key).items())
                    else:
                        items.append((new_key, v))
                return dict(items)
            
            result = flatten_dict(dict_data)
            context.set_variable(result_variable, result)
            return ModuleResult(success=True, message=f"字典扁平化完成，共 {len(result)} 个键", data=result)
        except Exception as e:
            return ModuleResult(success=False, error=f"扁平化失败: {str(e)}")
