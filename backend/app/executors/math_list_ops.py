"""数学和列表高级操作模块执行器"""
import math

from .base import (
    ModuleExecutor,
    ExecutionContext,
    ModuleResult,
    register_executor,
)


# ==================== 列表高级操作模块 ====================

@register_executor
class ListSumExecutor(ModuleExecutor):
    """列表求和模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "list_sum"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
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
            return ModuleResult(success=False, error="列表为空，无法求和")
        
        try:
            # 尝试将所有元素转换为数字
            numbers = []
            for item in list_data:
                if isinstance(item, (int, float)):
                    numbers.append(item)
                else:
                    try:
                        numbers.append(float(item))
                    except (ValueError, TypeError):
                        return ModuleResult(success=False, error=f"列表包含非数字元素: {item}")
            
            result = sum(numbers)
            context.set_variable(result_variable, result)
            
            return ModuleResult(
                success=True,
                message=f"列表求和: {result}",
                data=result
            )
        
        except Exception as e:
            return ModuleResult(success=False, error=f"求和失败: {str(e)}")


@register_executor
class ListAverageExecutor(ModuleExecutor):
    """列表求平均值模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "list_average"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
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
            return ModuleResult(success=False, error="列表为空，无法求平均值")
        
        try:
            numbers = []
            for item in list_data:
                if isinstance(item, (int, float)):
                    numbers.append(item)
                else:
                    try:
                        numbers.append(float(item))
                    except (ValueError, TypeError):
                        return ModuleResult(success=False, error=f"列表包含非数字元素: {item}")
            
            result = sum(numbers) / len(numbers)
            context.set_variable(result_variable, result)
            
            return ModuleResult(
                success=True,
                message=f"列表平均值: {result}",
                data=result
            )
        
        except Exception as e:
            return ModuleResult(success=False, error=f"求平均值失败: {str(e)}")


@register_executor
class ListMaxExecutor(ModuleExecutor):
    """列表求最大值模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "list_max"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
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
            return ModuleResult(success=False, error="列表为空，无法求最大值")
        
        try:
            numbers = []
            for item in list_data:
                if isinstance(item, (int, float)):
                    numbers.append(item)
                else:
                    try:
                        numbers.append(float(item))
                    except (ValueError, TypeError):
                        return ModuleResult(success=False, error=f"列表包含非数字元素: {item}")
            
            result = max(numbers)
            context.set_variable(result_variable, result)
            
            return ModuleResult(
                success=True,
                message=f"列表最大值: {result}",
                data=result
            )
        
        except Exception as e:
            return ModuleResult(success=False, error=f"求最大值失败: {str(e)}")


@register_executor
class ListMinExecutor(ModuleExecutor):
    """列表求最小值模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "list_min"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
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
            return ModuleResult(success=False, error="列表为空，无法求最小值")
        
        try:
            numbers = []
            for item in list_data:
                if isinstance(item, (int, float)):
                    numbers.append(item)
                else:
                    try:
                        numbers.append(float(item))
                    except (ValueError, TypeError):
                        return ModuleResult(success=False, error=f"列表包含非数字元素: {item}")
            
            result = min(numbers)
            context.set_variable(result_variable, result)
            
            return ModuleResult(
                success=True,
                message=f"列表最小值: {result}",
                data=result
            )
        
        except Exception as e:
            return ModuleResult(success=False, error=f"求最小值失败: {str(e)}")


@register_executor
class ListSortExecutor(ModuleExecutor):
    """列表排序模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "list_sort"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        list_variable = context.resolve_value(config.get('listVariable', ''))
        # 字段与前端面板对齐: order(asc/desc)，兼容旧字段名 sortOrder
        sort_order = context.resolve_value(config.get('sortOrder', config.get('order', 'asc')))
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
        
        try:
            # 创建副本进行排序
            sorted_list = list_data.copy()
            sorted_list.sort(reverse=(sort_order == 'desc'))
            
            context.set_variable(result_variable, sorted_list)
            
            order_text = "降序" if sort_order == 'desc' else "升序"
            return ModuleResult(
                success=True,
                message=f"列表已{order_text}排序",
                data=sorted_list
            )
        
        except TypeError:
            return ModuleResult(success=False, error="列表元素类型不一致，无法排序")
        except Exception as e:
            return ModuleResult(success=False, error=f"排序失败: {str(e)}")


@register_executor
class ListUniqueExecutor(ModuleExecutor):
    """列表去重模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "list_unique"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
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
        
        try:
            # 保持原有顺序去重
            seen = set()
            result = []
            for item in list_data:
                # 对于不可哈希的类型（如dict、list），转换为字符串
                try:
                    if item not in seen:
                        seen.add(item)
                        result.append(item)
                except TypeError:
                    item_str = str(item)
                    if item_str not in seen:
                        seen.add(item_str)
                        result.append(item)
            
            context.set_variable(result_variable, result)
            
            removed_count = len(list_data) - len(result)
            return ModuleResult(
                success=True,
                message=f"去重完成，移除 {removed_count} 个重复元素",
                data=result
            )
        
        except Exception as e:
            return ModuleResult(success=False, error=f"去重失败: {str(e)}")


@register_executor
class ListSliceExecutor(ModuleExecutor):
    """列表截取模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "list_slice"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        list_variable = context.resolve_value(config.get('listVariable', ''))
        start_index = context.resolve_value(config.get('startIndex', ''))
        end_index = context.resolve_value(config.get('endIndex', ''))
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
        
        try:
            start = int(start_index) if start_index else None
            end = int(end_index) if end_index else None
            
            result = list_data[start:end]
            context.set_variable(result_variable, result)
            
            return ModuleResult(
                success=True,
                message=f"截取列表，得到 {len(result)} 个元素",
                data=result
            )
        
        except ValueError as e:
            return ModuleResult(success=False, error=f"索引值无效: {str(e)}")
        except Exception as e:
            return ModuleResult(success=False, error=f"截取失败: {str(e)}")


# ==================== 数学运算模块 ====================

@register_executor
class MathRoundExecutor(ModuleExecutor):
    """四舍五入模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "math_round"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        # 字段与前端面板对齐: value，兼容旧字段名 numberValue
        number_value = context.resolve_value(config.get('numberValue', config.get('value', '')))
        decimals = context.resolve_value(config.get('decimals', '0'))
        result_variable = config.get('resultVariable', '')
        
        if number_value == '' or number_value is None:
            return ModuleResult(success=False, error="数值不能为空")
        if not result_variable:
            return ModuleResult(success=False, error="结果变量名不能为空")
        
        try:
            num = float(number_value)
            dec = int(decimals) if decimals else 0
            result = round(num, dec)
            context.set_variable(result_variable, result)
            
            return ModuleResult(
                success=True,
                message=f"四舍五入: {num} → {result}",
                data=result
            )
        
        except (ValueError, TypeError):
            return ModuleResult(success=False, error=f"无效的数字: {number_value}")
        except Exception as e:
            return ModuleResult(success=False, error=f"四舍五入失败: {str(e)}")


@register_executor
class MathBaseConvertExecutor(ModuleExecutor):
    """进制转换模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "math_base_convert"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        # 字段与前端面板对齐: value，兼容旧字段名 numberValue
        number_value = context.resolve_value(config.get('numberValue', config.get('value', '')))
        from_base = context.resolve_value(config.get('fromBase', '10'))
        to_base = context.resolve_value(config.get('toBase', '16'))
        result_variable = config.get('resultVariable', '')
        
        if number_value == '' or number_value is None:
            return ModuleResult(success=False, error="数值不能为空")
        if not result_variable:
            return ModuleResult(success=False, error="结果变量名不能为空")
        
        try:
            from_base_int = int(from_base)
            to_base_int = int(to_base)
            
            if from_base_int < 2 or from_base_int > 36:
                return ModuleResult(success=False, error="源进制必须在2-36之间")
            if to_base_int < 2 or to_base_int > 36:
                return ModuleResult(success=False, error="目标进制必须在2-36之间")
            
            # 先转换为十进制
            decimal_value = int(str(number_value), from_base_int)
            
            # 再转换为目标进制
            if to_base_int == 10:
                result = str(decimal_value)
            elif to_base_int == 2:
                result = bin(decimal_value)[2:]
            elif to_base_int == 8:
                result = oct(decimal_value)[2:]
            elif to_base_int == 16:
                result = hex(decimal_value)[2:].upper()
            else:
                # 自定义进制转换
                digits = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
                if decimal_value == 0:
                    result = "0"
                else:
                    result = ""
                    num = abs(decimal_value)
                    while num > 0:
                        result = digits[num % to_base_int] + result
                        num //= to_base_int
                    if decimal_value < 0:
                        result = "-" + result
            
            context.set_variable(result_variable, result)
            
            return ModuleResult(
                success=True,
                message=f"进制转换: {number_value}({from_base}进制) → {result}({to_base}进制)",
                data=result
            )
        
        except ValueError as e:
            return ModuleResult(success=False, error=f"无效的数字或进制: {str(e)}")
        except Exception as e:
            return ModuleResult(success=False, error=f"进制转换失败: {str(e)}")


@register_executor
class MathFloorExecutor(ModuleExecutor):
    """取整模块执行器（向下取整）"""
    
    @property
    def module_type(self) -> str:
        return "math_floor"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        # 字段与前端面板对齐: value，兼容旧字段名 numberValue
        number_value = context.resolve_value(config.get('numberValue', config.get('value', '')))
        result_variable = config.get('resultVariable', '')
        
        if number_value == '' or number_value is None:
            return ModuleResult(success=False, error="数值不能为空")
        if not result_variable:
            return ModuleResult(success=False, error="结果变量名不能为空")
        
        try:
            num = float(number_value)
            result = math.floor(num)
            context.set_variable(result_variable, result)
            
            return ModuleResult(
                success=True,
                message=f"向下取整: {num} → {result}",
                data=result
            )
        
        except (ValueError, TypeError):
            return ModuleResult(success=False, error=f"无效的数字: {number_value}")
        except Exception as e:
            return ModuleResult(success=False, error=f"取整失败: {str(e)}")


@register_executor
class MathModuloExecutor(ModuleExecutor):
    """求余模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "math_modulo"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        dividend = context.resolve_value(config.get('dividend', ''))
        divisor = context.resolve_value(config.get('divisor', ''))
        result_variable = config.get('resultVariable', '')
        
        if dividend == '' or dividend is None:
            return ModuleResult(success=False, error="被除数不能为空")
        if divisor == '' or divisor is None:
            return ModuleResult(success=False, error="除数不能为空")
        if not result_variable:
            return ModuleResult(success=False, error="结果变量名不能为空")
        
        try:
            num1 = float(dividend)
            num2 = float(divisor)
            
            if num2 == 0:
                return ModuleResult(success=False, error="除数不能为0")
            
            result = num1 % num2
            context.set_variable(result_variable, result)
            
            return ModuleResult(
                success=True,
                message=f"求余: {num1} % {num2} = {result}",
                data=result
            )
        
        except (ValueError, TypeError):
            return ModuleResult(success=False, error="无效的数字")
        except Exception as e:
            return ModuleResult(success=False, error=f"求余失败: {str(e)}")


@register_executor
class MathAbsExecutor(ModuleExecutor):
    """绝对值模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "math_abs"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        # 字段与前端面板对齐: value，兼容旧字段名 numberValue
        number_value = context.resolve_value(config.get('numberValue', config.get('value', '')))
        result_variable = config.get('resultVariable', '')
        
        if number_value == '' or number_value is None:
            return ModuleResult(success=False, error="数值不能为空")
        if not result_variable:
            return ModuleResult(success=False, error="结果变量名不能为空")
        
        try:
            num = float(number_value)
            result = abs(num)
            context.set_variable(result_variable, result)
            
            return ModuleResult(
                success=True,
                message=f"绝对值: |{num}| = {result}",
                data=result
            )
        
        except (ValueError, TypeError):
            return ModuleResult(success=False, error=f"无效的数字: {number_value}")
        except Exception as e:
            return ModuleResult(success=False, error=f"求绝对值失败: {str(e)}")


@register_executor
class MathSqrtExecutor(ModuleExecutor):
    """开次方模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "math_sqrt"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        # 字段与前端面板对齐: value，兼容旧字段名 numberValue
        number_value = context.resolve_value(config.get('numberValue', config.get('value', '')))
        root = context.resolve_value(config.get('root', '2'))
        result_variable = config.get('resultVariable', '')
        
        if number_value == '' or number_value is None:
            return ModuleResult(success=False, error="数值不能为空")
        if not result_variable:
            return ModuleResult(success=False, error="结果变量名不能为空")
        
        try:
            num = float(number_value)
            root_val = float(root) if root else 2
            
            if num < 0 and root_val % 2 == 0:
                return ModuleResult(success=False, error="负数不能开偶数次方")
            if root_val == 0:
                return ModuleResult(success=False, error="次方数不能为0")
            
            result = num ** (1 / root_val)
            context.set_variable(result_variable, result)
            
            return ModuleResult(
                success=True,
                message=f"开{root_val}次方: {num}^(1/{root_val}) = {result}",
                data=result
            )
        
        except (ValueError, TypeError):
            return ModuleResult(success=False, error="无效的数字")
        except Exception as e:
            return ModuleResult(success=False, error=f"开次方失败: {str(e)}")


@register_executor
class MathPowerExecutor(ModuleExecutor):
    """求次方模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "math_power"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        base = context.resolve_value(config.get('base', ''))
        exponent = context.resolve_value(config.get('exponent', ''))
        result_variable = config.get('resultVariable', '')
        
        if base == '' or base is None:
            return ModuleResult(success=False, error="底数不能为空")
        if exponent == '' or exponent is None:
            return ModuleResult(success=False, error="指数不能为空")
        if not result_variable:
            return ModuleResult(success=False, error="结果变量名不能为空")
        
        try:
            base_num = float(base)
            exp_num = float(exponent)
            
            result = base_num ** exp_num
            context.set_variable(result_variable, result)
            
            return ModuleResult(
                success=True,
                message=f"求次方: {base_num}^{exp_num} = {result}",
                data=result
            )
        
        except (ValueError, TypeError):
            return ModuleResult(success=False, error="无效的数字")
        except OverflowError:
            return ModuleResult(success=False, error="结果溢出，数值过大")
        except Exception as e:
            return ModuleResult(success=False, error=f"求次方失败: {str(e)}")


# ==================== 高级数学运算模块 ====================

