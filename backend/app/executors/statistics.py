"""统计分析模块执行器"""
import statistics
from typing import List

from .base import (
    ModuleExecutor,
    ExecutionContext,
    ModuleResult,
    register_executor,
)


@register_executor
class MedianExecutor(ModuleExecutor):
    """中位数模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "stat_median"
    
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
            if len(list_data) == 0:
                return ModuleResult(success=False, error="列表为空")
            
            numbers = [float(x) for x in list_data if isinstance(x, (int, float))]
            if not numbers:
                return ModuleResult(success=False, error="列表中没有数字")
            
            result = statistics.median(numbers)
            context.set_variable(result_variable, result)
            return ModuleResult(success=True, message=f"中位数: {result}", data=result)
        except Exception as e:
            return ModuleResult(success=False, error=f"计算中位数失败: {str(e)}")


@register_executor
class ModeExecutor(ModuleExecutor):
    """众数模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "stat_mode"
    
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
            if len(list_data) == 0:
                return ModuleResult(success=False, error="列表为空")
            
            result = statistics.mode(list_data)
            context.set_variable(result_variable, result)
            return ModuleResult(success=True, message=f"众数: {result}", data=result)
        except statistics.StatisticsError:
            return ModuleResult(success=False, error="没有唯一的众数")
        except Exception as e:
            return ModuleResult(success=False, error=f"计算众数失败: {str(e)}")


@register_executor
class VarianceExecutor(ModuleExecutor):
    """方差模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "stat_variance"
    
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
            if len(list_data) < 2:
                return ModuleResult(success=False, error="至少需要2个数据点")
            
            numbers = [float(x) for x in list_data if isinstance(x, (int, float))]
            if len(numbers) < 2:
                return ModuleResult(success=False, error="至少需要2个数字")
            
            result = statistics.variance(numbers)
            context.set_variable(result_variable, result)
            return ModuleResult(success=True, message=f"方差: {result}", data=result)
        except Exception as e:
            return ModuleResult(success=False, error=f"计算方差失败: {str(e)}")


@register_executor
class StdevExecutor(ModuleExecutor):
    """标准差模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "stat_stdev"
    
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
            if len(list_data) < 2:
                return ModuleResult(success=False, error="至少需要2个数据点")
            
            numbers = [float(x) for x in list_data if isinstance(x, (int, float))]
            if len(numbers) < 2:
                return ModuleResult(success=False, error="至少需要2个数字")
            
            result = statistics.stdev(numbers)
            context.set_variable(result_variable, result)
            return ModuleResult(success=True, message=f"标准差: {result}", data=result)
        except Exception as e:
            return ModuleResult(success=False, error=f"计算标准差失败: {str(e)}")


@register_executor
class PercentileExecutor(ModuleExecutor):
    """百分位数模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "stat_percentile"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            list_variable = context.resolve_value(config.get('listVariable', ''))
            percentile = context.resolve_value(config.get('percentile', '50'))
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
            if len(list_data) == 0:
                return ModuleResult(success=False, error="列表为空")
            
            p = float(percentile)
            if p < 0 or p > 100:
                return ModuleResult(success=False, error="百分位数必须在0-100之间")
            
            numbers = sorted([float(x) for x in list_data if isinstance(x, (int, float))])
            if not numbers:
                return ModuleResult(success=False, error="列表中没有数字")
            
            # 边界保护：避免索引越界
            if p <= 0:
                result = numbers[0]
            elif p >= 100:
                result = numbers[-1]
            else:
                quantiles = statistics.quantiles(numbers, n=100)
                result = quantiles[int(p) - 1]
            context.set_variable(result_variable, result)
            return ModuleResult(success=True, message=f"第{p}百分位数: {result}", data=result)
        except Exception as e:
            return ModuleResult(success=False, error=f"计算百分位数失败: {str(e)}")


@register_executor
class NormalizeExecutor(ModuleExecutor):
    """数据归一化模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "stat_normalize"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            list_variable = context.resolve_value(config.get('listVariable', ''))
            # 字段与前端面板对齐: method(minmax/custom) + newMin/newMax(自定义目标范围)
            method = context.resolve_value(config.get('method', 'minmax'))
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
            if len(list_data) == 0:
                return ModuleResult(success=False, error="列表为空")
            
            numbers = [float(x) for x in list_data if isinstance(x, (int, float))]
            if not numbers:
                return ModuleResult(success=False, error="列表中没有数字")
            
            # 目标范围：minmax 固定 [0,1]；custom 使用用户配置的 newMin/newMax
            if method == 'custom':
                try:
                    new_min = float(context.resolve_value(config.get('newMin', '0')))
                    new_max = float(context.resolve_value(config.get('newMax', '1')))
                except (ValueError, TypeError):
                    return ModuleResult(success=False, error="自定义范围的最小值/最大值必须是数字")
            else:
                new_min, new_max = 0.0, 1.0
            
            min_val = min(numbers)
            max_val = max(numbers)
            
            if min_val == max_val:
                mid = (new_min + new_max) / 2
                result = [mid] * len(numbers)
            else:
                span = new_max - new_min
                result = [new_min + (x - min_val) / (max_val - min_val) * span for x in numbers]
            
            context.set_variable(result_variable, result)
            return ModuleResult(success=True, message=f"归一化完成，范围[{new_min},{new_max}]", data=result)
        except Exception as e:
            return ModuleResult(success=False, error=f"归一化失败: {str(e)}")


@register_executor
class StandardizeExecutor(ModuleExecutor):
    """数据标准化模块执行器（Z-score）"""
    
    @property
    def module_type(self) -> str:
        return "stat_standardize"
    
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
            if len(list_data) < 2:
                return ModuleResult(success=False, error="至少需要2个数据点")
            
            numbers = [float(x) for x in list_data if isinstance(x, (int, float))]
            if len(numbers) < 2:
                return ModuleResult(success=False, error="至少需要2个数字")
            
            mean = statistics.mean(numbers)
            stdev = statistics.stdev(numbers)
            
            if stdev == 0:
                result = [0.0] * len(numbers)
            else:
                result = [(x - mean) / stdev for x in numbers]
            
            context.set_variable(result_variable, result)
            return ModuleResult(success=True, message=f"标准化完成（Z-score）", data=result)
        except Exception as e:
            return ModuleResult(success=False, error=f"标准化失败: {str(e)}")
