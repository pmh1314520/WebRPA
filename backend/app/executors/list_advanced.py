"""列表高级操作模块执行器"""
import random
import itertools
from typing import Any, List

from .base import (
    ModuleExecutor,
    ExecutionContext,
    ModuleResult,
    register_executor,
)


@register_executor
class ListReverseExecutor(ModuleExecutor):
    """列表反转模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "list_reverse"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            list_variable = context.resolve_value(config.get('listVariable', ''))
            result_variable = config.get('resultVariable', '')
            
            if not list_variable:
                return ModuleResult(success=False, error="列表变量名不能为空")
            if not result_variable:
                return ModuleResult(success=False, error="结果变量名不能为空")
            
            list_data = context.get_variable(list_variable)
            if list_data is None:
                return ModuleResult(success=False, error=f"变量 '{list_variable}' 不存在")
            if not isinstance(list_data, list):
                return ModuleResult(success=False, error=f"变量 '{list_variable}' 不是列表类型")
            
            result = list(reversed(list_data))
            context.set_variable(result_variable, result)
            
            return ModuleResult(
                success=True,
                message=f"列表已反转，共 {len(result)} 个元素",
                data=result
            )
        except Exception as e:
            return ModuleResult(success=False, error=f"反转失败: {str(e)}")



@register_executor
class ListFindExecutor(ModuleExecutor):
    """列表查找模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "list_find"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            list_variable = context.resolve_value(config.get('listVariable', ''))
            search_value = context.resolve_value(config.get('searchValue', ''))
            result_variable = config.get('resultVariable', '')
            
            if not list_variable:
                return ModuleResult(success=False, error="列表变量名不能为空")
            if not result_variable:
                return ModuleResult(success=False, error="结果变量名不能为空")
            
            list_data = context.get_variable(list_variable)
            if list_data is None:
                return ModuleResult(success=False, error=f"变量 '{list_variable}' 不存在")
            if not isinstance(list_data, list):
                return ModuleResult(success=False, error=f"变量 '{list_variable}' 不是列表类型")
            
            if search_value in list_data:
                index = list_data.index(search_value)
                context.set_variable(result_variable, index)
                return ModuleResult(success=True, message=f"找到元素，索引为 {index}", data=index)
            else:
                context.set_variable(result_variable, -1)
                return ModuleResult(success=True, message="未找到元素，返回 -1", data=-1)
        except Exception as e:
            return ModuleResult(success=False, error=f"查找失败: {str(e)}")


@register_executor
class ListCountExecutor(ModuleExecutor):
    """列表计数模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "list_count"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            list_variable = context.resolve_value(config.get('listVariable', ''))
            search_value = context.resolve_value(config.get('searchValue', ''))
            result_variable = config.get('resultVariable', '')

            
            if not list_variable:
                return ModuleResult(success=False, error="列表变量名不能为空")
            if not result_variable:
                return ModuleResult(success=False, error="结果变量名不能为空")
            
            list_data = context.get_variable(list_variable)
            if list_data is None:
                return ModuleResult(success=False, error=f"变量 '{list_variable}' 不存在")
            if not isinstance(list_data, list):
                return ModuleResult(success=False, error=f"变量 '{list_variable}' 不是列表类型")
            
            count = list_data.count(search_value)
            context.set_variable(result_variable, count)
            return ModuleResult(success=True, message=f"元素出现 {count} 次", data=count)
        except Exception as e:
            return ModuleResult(success=False, error=f"计数失败: {str(e)}")


@register_executor
class ListFilterExecutor(ModuleExecutor):
    """列表过滤模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "list_filter"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            list_variable = context.resolve_value(config.get('listVariable', ''))
            filter_type = context.resolve_value(config.get('filterType', 'greater'))
            compare_value = context.resolve_value(config.get('compareValue', ''))
            result_variable = config.get('resultVariable', '')
            
            if not list_variable:
                return ModuleResult(success=False, error="列表变量名不能为空")
            if not result_variable:
                return ModuleResult(success=False, error="结果变量名不能为空")
            
            list_data = context.get_variable(list_variable)
            if list_data is None:
                return ModuleResult(success=False, error=f"变量 '{list_variable}' 不存在")
            if not isinstance(list_data, list):
                return ModuleResult(success=False, error=f"变量 '{list_variable}' 不是列表类型")
            
            result = []
            if filter_type == 'greater':
                cmp_val = float(compare_value)
                result = [x for x in list_data if isinstance(x, (int, float)) and x > cmp_val]
            elif filter_type == 'less':
                cmp_val = float(compare_value)
                result = [x for x in list_data if isinstance(x, (int, float)) and x < cmp_val]
            elif filter_type == 'equal':
                result = [x for x in list_data if x == compare_value]

            elif filter_type == 'not_equal':
                result = [x for x in list_data if x != compare_value]
            elif filter_type == 'contains':
                result = [x for x in list_data if isinstance(x, str) and compare_value in x]
            
            context.set_variable(result_variable, result)
            return ModuleResult(success=True, message=f"过滤完成，得到 {len(result)} 个元素", data=result)
        except Exception as e:
            return ModuleResult(success=False, error=f"过滤失败: {str(e)}")


@register_executor
class ListMapExecutor(ModuleExecutor):
    """列表映射模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "list_map"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            list_variable = context.resolve_value(config.get('listVariable', ''))
            operation = context.resolve_value(config.get('operation', 'multiply'))
            operand = context.resolve_value(config.get('operand', '1'))
            result_variable = config.get('resultVariable', '')
            
            if not list_variable:
                return ModuleResult(success=False, error="列表变量名不能为空")
            if not result_variable:
                return ModuleResult(success=False, error="结果变量名不能为空")
            
            list_data = context.get_variable(list_variable)
            if list_data is None:
                return ModuleResult(success=False, error=f"变量 '{list_variable}' 不存在")
            if not isinstance(list_data, list):
                return ModuleResult(success=False, error=f"变量 '{list_variable}' 不是列表类型")
            
            result = []
            op_val = float(operand)
            
            for item in list_data:
                if not isinstance(item, (int, float)):
                    try:
                        item = float(item)
                    except Exception:
                        continue
                
                if operation == 'multiply':
                    result.append(item * op_val)
                elif operation == 'divide':
                    result.append(item / op_val if op_val != 0 else item)
                elif operation == 'add':
                    result.append(item + op_val)
                elif operation == 'subtract':
                    result.append(item - op_val)
                elif operation == 'power':
                    result.append(item ** op_val)
            
            context.set_variable(result_variable, result)
            return ModuleResult(success=True, message=f"映射完成，处理 {len(result)} 个元素", data=result)
        except Exception as e:
            return ModuleResult(success=False, error=f"映射失败: {str(e)}")


@register_executor
class ListMergeExecutor(ModuleExecutor):
    """列表合并模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "list_merge"

    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            # 字段与前端面板对齐: list1/list2 两个变量名；兼容旧字段 listVariables(逗号分隔)
            var_names = self._collect_var_names(config, context)
            result_variable = config.get('resultVariable', '')
            
            if not var_names:
                return ModuleResult(success=False, error="列表变量名不能为空")
            if not result_variable:
                return ModuleResult(success=False, error="结果变量名不能为空")
            
            result = []
            for var_name in var_names:
                list_data = context.get_variable(var_name)
                if list_data is not None and isinstance(list_data, list):
                    result.extend(list_data)
            
            context.set_variable(result_variable, result)
            return ModuleResult(success=True, message=f"合并完成，共 {len(result)} 个元素", data=result)
        except Exception as e:
            return ModuleResult(success=False, error=f"合并失败: {str(e)}")

    @staticmethod
    def _collect_var_names(config, context):
        """收集列表变量名：优先面板的 list1/list2，其次旧的 listVariables(逗号分隔)。"""
        names = []
        l1 = context.resolve_value(config.get('list1', ''))
        l2 = context.resolve_value(config.get('list2', ''))
        if l1:
            names.append(str(l1).strip())
        if l2:
            names.append(str(l2).strip())
        if not names:
            list_variables = context.resolve_value(config.get('listVariables', ''))
            if list_variables:
                names = [v.strip() for v in str(list_variables).split(',') if v.strip()]
        return names


@register_executor
class ListFlattenExecutor(ModuleExecutor):
    """列表扁平化模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "list_flatten"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            list_variable = context.resolve_value(config.get('listVariable', ''))
            depth = context.resolve_value(config.get('depth', '-1'))
            result_variable = config.get('resultVariable', '')
            
            if not list_variable:
                return ModuleResult(success=False, error="列表变量名不能为空")
            if not result_variable:
                return ModuleResult(success=False, error="结果变量名不能为空")
            
            list_data = context.get_variable(list_variable)
            if list_data is None:
                return ModuleResult(success=False, error=f"变量 '{list_variable}' 不存在")
            if not isinstance(list_data, list):
                return ModuleResult(success=False, error=f"变量 '{list_variable}' 不是列表类型")
            
            max_depth = int(depth)
            
            def flatten(lst, current_depth=0):
                result = []
                for item in lst:
                    if isinstance(item, list) and (max_depth < 0 or current_depth < max_depth):
                        result.extend(flatten(item, current_depth + 1))
                    else:
                        result.append(item)
                return result
            
            result = flatten(list_data)
            context.set_variable(result_variable, result)
            return ModuleResult(success=True, message=f"扁平化完成，共 {len(result)} 个元素", data=result)
        except Exception as e:
            return ModuleResult(success=False, error=f"扁平化失败: {str(e)}")


@register_executor
class ListChunkExecutor(ModuleExecutor):
    """列表分组模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "list_chunk"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            list_variable = context.resolve_value(config.get('listVariable', ''))
            chunk_size = context.resolve_value(config.get('chunkSize', '1'))
            result_variable = config.get('resultVariable', '')
            
            if not list_variable:
                return ModuleResult(success=False, error="列表变量名不能为空")
            if not result_variable:
                return ModuleResult(success=False, error="结果变量名不能为空")
            
            list_data = context.get_variable(list_variable)
            if list_data is None:
                return ModuleResult(success=False, error=f"变量 '{list_variable}' 不存在")
            if not isinstance(list_data, list):
                return ModuleResult(success=False, error=f"变量 '{list_variable}' 不是列表类型")
            
            size = int(chunk_size)
            if size <= 0:
                return ModuleResult(success=False, error="分组大小必须大于0")
            
            result = [list_data[i:i+size] for i in range(0, len(list_data), size)]
            context.set_variable(result_variable, result)
            return ModuleResult(success=True, message=f"分组完成，共 {len(result)} 组", data=result)
        except Exception as e:
            return ModuleResult(success=False, error=f"分组失败: {str(e)}")


@register_executor
class ListRemoveEmptyExecutor(ModuleExecutor):
    """列表去空模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "list_remove_empty"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            list_variable = context.resolve_value(config.get('listVariable', ''))
            result_variable = config.get('resultVariable', '')
            
            if not list_variable:
                return ModuleResult(success=False, error="列表变量名不能为空")
            if not result_variable:
                return ModuleResult(success=False, error="结果变量名不能为空")
            
            list_data = context.get_variable(list_variable)
            if list_data is None:
                return ModuleResult(success=False, error=f"变量 '{list_variable}' 不存在")
            if not isinstance(list_data, list):
                return ModuleResult(success=False, error=f"变量 '{list_variable}' 不是列表类型")
            
            result = [x for x in list_data if x is not None and x != '' and x != []]
            removed = len(list_data) - len(result)
            context.set_variable(result_variable, result)
            return ModuleResult(success=True, message=f"去空完成，移除 {removed} 个空值", data=result)
        except Exception as e:
            return ModuleResult(success=False, error=f"去空失败: {str(e)}")


@register_executor
class ListIntersectionExecutor(ModuleExecutor):
    """列表交集模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "list_intersection"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            # 字段与前端面板对齐: list1/list2，兼容旧字段名 list1Variable/list2Variable
            list1_variable = context.resolve_value(config.get('list1', config.get('list1Variable', '')))
            list2_variable = context.resolve_value(config.get('list2', config.get('list2Variable', '')))
            result_variable = config.get('resultVariable', '')
            
            if not list1_variable or not list2_variable:
                return ModuleResult(success=False, error="列表变量名不能为空")
            if not result_variable:
                return ModuleResult(success=False, error="结果变量名不能为空")
            
            list1 = context.get_variable(list1_variable)
            list2 = context.get_variable(list2_variable)
            
            if list1 is None or list2 is None:
                return ModuleResult(success=False, error="列表变量不存在")
            if not isinstance(list1, list) or not isinstance(list2, list):
                return ModuleResult(success=False, error="变量不是列表类型")
            
            result = list(set(list1) & set(list2))
            context.set_variable(result_variable, result)
            return ModuleResult(success=True, message=f"交集完成，共 {len(result)} 个元素", data=result)
        except Exception as e:
            return ModuleResult(success=False, error=f"交集计算失败: {str(e)}")


@register_executor
class ListUnionExecutor(ModuleExecutor):
    """列表并集模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "list_union"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            # 字段与前端面板对齐: list1/list2，兼容旧字段名 list1Variable/list2Variable
            list1_variable = context.resolve_value(config.get('list1', config.get('list1Variable', '')))
            list2_variable = context.resolve_value(config.get('list2', config.get('list2Variable', '')))
            result_variable = config.get('resultVariable', '')
            
            if not list1_variable or not list2_variable:
                return ModuleResult(success=False, error="列表变量名不能为空")
            if not result_variable:
                return ModuleResult(success=False, error="结果变量名不能为空")
            
            list1 = context.get_variable(list1_variable)
            list2 = context.get_variable(list2_variable)
            
            if list1 is None or list2 is None:
                return ModuleResult(success=False, error="列表变量不存在")
            if not isinstance(list1, list) or not isinstance(list2, list):
                return ModuleResult(success=False, error="变量不是列表类型")
            
            result = list(set(list1) | set(list2))
            context.set_variable(result_variable, result)
            return ModuleResult(success=True, message=f"并集完成，共 {len(result)} 个元素", data=result)
        except Exception as e:
            return ModuleResult(success=False, error=f"并集计算失败: {str(e)}")


@register_executor
class ListDifferenceExecutor(ModuleExecutor):
    """列表差集模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "list_difference"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            # 字段与前端面板对齐: list1/list2，兼容旧字段名 list1Variable/list2Variable
            list1_variable = context.resolve_value(config.get('list1', config.get('list1Variable', '')))
            list2_variable = context.resolve_value(config.get('list2', config.get('list2Variable', '')))
            result_variable = config.get('resultVariable', '')
            
            if not list1_variable or not list2_variable:
                return ModuleResult(success=False, error="列表变量名不能为空")
            if not result_variable:
                return ModuleResult(success=False, error="结果变量名不能为空")
            
            list1 = context.get_variable(list1_variable)
            list2 = context.get_variable(list2_variable)
            
            if list1 is None or list2 is None:
                return ModuleResult(success=False, error="列表变量不存在")
            if not isinstance(list1, list) or not isinstance(list2, list):
                return ModuleResult(success=False, error="变量不是列表类型")
            
            result = list(set(list1) - set(list2))
            context.set_variable(result_variable, result)
            return ModuleResult(success=True, message=f"差集完成，共 {len(result)} 个元素", data=result)
        except Exception as e:
            return ModuleResult(success=False, error=f"差集计算失败: {str(e)}")


@register_executor
class ListCartesianProductExecutor(ModuleExecutor):
    """列表笛卡尔积模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "list_cartesian_product"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            # 字段与前端面板对齐: list1/list2；兼容旧字段 listVariables(逗号分隔)
            var_names = ListMergeExecutor._collect_var_names(config, context)
            result_variable = config.get('resultVariable', '')
            
            if not var_names:
                return ModuleResult(success=False, error="列表变量名不能为空")
            if not result_variable:
                return ModuleResult(success=False, error="结果变量名不能为空")
            
            lists = []
            for var_name in var_names:
                list_data = context.get_variable(var_name)
                if list_data is None:
                    return ModuleResult(success=False, error=f"变量 '{var_name}' 不存在")
                if not isinstance(list_data, list):
                    return ModuleResult(success=False, error=f"变量 '{var_name}' 不是列表类型")
                lists.append(list_data)
            
            result = [list(item) for item in itertools.product(*lists)]
            context.set_variable(result_variable, result)
            return ModuleResult(success=True, message=f"笛卡尔积完成，共 {len(result)} 个组合", data=result)
        except Exception as e:
            return ModuleResult(success=False, error=f"笛卡尔积计算失败: {str(e)}")


@register_executor
class ListShuffleExecutor(ModuleExecutor):
    """列表随机打乱模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "list_shuffle"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            list_variable = context.resolve_value(config.get('listVariable', ''))
            result_variable = config.get('resultVariable', '')
            
            if not list_variable:
                return ModuleResult(success=False, error="列表变量名不能为空")
            if not result_variable:
                return ModuleResult(success=False, error="结果变量名不能为空")
            
            list_data = context.get_variable(list_variable)
            if list_data is None:
                return ModuleResult(success=False, error=f"变量 '{list_variable}' 不存在")
            if not isinstance(list_data, list):
                return ModuleResult(success=False, error=f"变量 '{list_variable}' 不是列表类型")
            
            result = list_data.copy()
            random.shuffle(result)
            context.set_variable(result_variable, result)
            return ModuleResult(success=True, message=f"列表已随机打乱，共 {len(result)} 个元素", data=result)
        except Exception as e:
            return ModuleResult(success=False, error=f"打乱失败: {str(e)}")


@register_executor
class ListSampleExecutor(ModuleExecutor):
    """列表采样模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "list_sample"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            list_variable = context.resolve_value(config.get('listVariable', ''))
            # 字段与前端面板对齐: sampleSize，兼容旧字段名 sampleCount
            sample_count = context.resolve_value(config.get('sampleSize', config.get('sampleCount', '1')))
            result_variable = config.get('resultVariable', '')
            
            if not list_variable:
                return ModuleResult(success=False, error="列表变量名不能为空")
            if not result_variable:
                return ModuleResult(success=False, error="结果变量名不能为空")
            
            list_data = context.get_variable(list_variable)
            if list_data is None:
                return ModuleResult(success=False, error=f"变量 '{list_variable}' 不存在")
            if not isinstance(list_data, list):
                return ModuleResult(success=False, error=f"变量 '{list_variable}' 不是列表类型")
            
            count = int(sample_count)
            if count <= 0:
                return ModuleResult(success=False, error="采样数量必须大于0")
            if count > len(list_data):
                return ModuleResult(success=False, error=f"采样数量不能超过列表长度({len(list_data)})")
            
            result = random.sample(list_data, count)
            context.set_variable(result_variable, result)
            return ModuleResult(success=True, message=f"采样完成，抽取 {len(result)} 个元素", data=result)
        except Exception as e:
            return ModuleResult(success=False, error=f"采样失败: {str(e)}")
