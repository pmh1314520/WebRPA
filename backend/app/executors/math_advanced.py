"""高级数学运算模块执行器"""
import math
import random
from typing import List

from .base import (
    ModuleExecutor,
    ExecutionContext,
    ModuleResult,
    register_executor,
)


@register_executor
class MathLogExecutor(ModuleExecutor):
    """对数运算模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "math_log"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        # 字段与前端面板对齐: value + base(选择器 e/10/2/custom) + customBase(自定义底数)
        # 兼容旧字段名: numberValue + logType(ln/log10/log2/custom) + base(自定义底数数值)
        number_value = context.resolve_value(config.get('numberValue', config.get('value', '')))
        log_type = context.resolve_value(config.get('logType', ''))
        panel_base = context.resolve_value(config.get('base', ''))
        custom_base_value = context.resolve_value(config.get('customBase', ''))
        # 若无旧 logType，则根据面板 base 选择器推导对数类型
        if not log_type:
            if panel_base == 'e':
                log_type = 'ln'
            elif panel_base == '10':
                log_type = 'log10'
            elif panel_base == '2':
                log_type = 'log2'
            elif panel_base == 'custom':
                log_type = 'custom'
            else:
                log_type = 'ln'
        # 自定义底数：面板用 customBase；旧工作流直接把数值放在 base 字段
        if custom_base_value not in ('', None):
            base = custom_base_value
        elif panel_base not in ('e', '10', '2', 'custom', '', None):
            base = panel_base
        else:
            base = ''
        result_variable = config.get('resultVariable', '')
        
        if number_value == '' or number_value is None:
            return ModuleResult(success=False, error="数值不能为空")
        if not result_variable:
            return ModuleResult(success=False, error="结果变量名不能为空")
        
        try:
            num = float(number_value)
            
            if num <= 0:
                return ModuleResult(success=False, error="对数的真数必须大于0")
            
            if log_type == 'ln':
                result = math.log(num)
                desc = f"ln({num})"
            elif log_type == 'log10':
                result = math.log10(num)
                desc = f"log10({num})"
            elif log_type == 'log2':
                result = math.log2(num)
                desc = f"log2({num})"
            elif log_type == 'custom':
                if not base:
                    return ModuleResult(success=False, error="自定义底数不能为空")
                base_num = float(base)
                if base_num <= 0 or base_num == 1:
                    return ModuleResult(success=False, error="对数底数必须大于0且不等于1")
                result = math.log(num, base_num)
                desc = f"log{base_num}({num})"
            else:
                return ModuleResult(success=False, error=f"不支持的对数类型: {log_type}")
            
            context.set_variable(result_variable, result)
            
            return ModuleResult(
                success=True,
                message=f"对数运算: {desc} = {result}",
                data=result
            )
        
        except (ValueError, TypeError) as e:
            return ModuleResult(success=False, error=f"无效的数字: {str(e)}")
        except Exception as e:
            return ModuleResult(success=False, error=f"对数运算失败: {str(e)}")


@register_executor
class MathTrigExecutor(ModuleExecutor):
    """三角函数模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "math_trig"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        # 字段与前端面板对齐: value/function/unit，兼容旧字段名 numberValue/trigType/angleUnit
        number_value = context.resolve_value(config.get('numberValue', config.get('value', '')))
        trig_type = context.resolve_value(config.get('trigType', config.get('function', 'sin')))
        angle_unit = context.resolve_value(config.get('angleUnit', config.get('unit', 'degree')))  # degree or radian
        result_variable = config.get('resultVariable', '')
        
        if number_value == '' or number_value is None:
            return ModuleResult(success=False, error="数值不能为空")
        if not result_variable:
            return ModuleResult(success=False, error="结果变量名不能为空")
        
        try:
            num = float(number_value)
            
            # 如果是角度，转换为弧度
            if angle_unit == 'degree':
                angle = math.radians(num)
            else:
                angle = num
            
            if trig_type == 'sin':
                result = math.sin(angle)
            elif trig_type == 'cos':
                result = math.cos(angle)
            elif trig_type == 'tan':
                result = math.tan(angle)
            elif trig_type == 'asin':
                if num < -1 or num > 1:
                    return ModuleResult(success=False, error="反正弦函数的输入必须在[-1, 1]范围内")
                result = math.asin(num)
                if angle_unit == 'degree':
                    result = math.degrees(result)
            elif trig_type == 'acos':
                if num < -1 or num > 1:
                    return ModuleResult(success=False, error="反余弦函数的输入必须在[-1, 1]范围内")
                result = math.acos(num)
                if angle_unit == 'degree':
                    result = math.degrees(result)
            elif trig_type == 'atan':
                result = math.atan(num)
                if angle_unit == 'degree':
                    result = math.degrees(result)
            else:
                return ModuleResult(success=False, error=f"不支持的三角函数类型: {trig_type}")
            
            context.set_variable(result_variable, result)
            
            unit_text = "度" if angle_unit == 'degree' else "弧度"
            return ModuleResult(
                success=True,
                message=f"三角函数: {trig_type}({num}{unit_text}) = {result}",
                data=result
            )
        
        except (ValueError, TypeError) as e:
            return ModuleResult(success=False, error=f"无效的数字: {str(e)}")
        except Exception as e:
            return ModuleResult(success=False, error=f"三角函数计算失败: {str(e)}")


@register_executor
class MathExpExecutor(ModuleExecutor):
    """指数运算模块执行器（e^x）"""
    
    @property
    def module_type(self) -> str:
        return "math_exp"
    
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
            result = math.exp(num)
            context.set_variable(result_variable, result)
            
            return ModuleResult(
                success=True,
                message=f"指数运算: e^{num} = {result}",
                data=result
            )
        
        except (ValueError, TypeError):
            return ModuleResult(success=False, error=f"无效的数字: {number_value}")
        except OverflowError:
            return ModuleResult(success=False, error="结果溢出，数值过大")
        except Exception as e:
            return ModuleResult(success=False, error=f"指数运算失败: {str(e)}")


@register_executor
class MathGcdExecutor(ModuleExecutor):
    """最大公约数模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "math_gcd"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        # 字段与前端面板对齐: value1/value2 两个数；兼容旧字段名 numbers(逗号分隔)
        numbers_str = context.resolve_value(config.get('numbers', ''))
        if not numbers_str:
            _v1 = context.resolve_value(config.get('value1', ''))
            _v2 = context.resolve_value(config.get('value2', ''))
            numbers_str = ','.join(str(x) for x in (_v1, _v2) if x not in ('', None))
        result_variable = config.get('resultVariable', '')
        
        if not numbers_str:
            return ModuleResult(success=False, error="数字列表不能为空")
        if not result_variable:
            return ModuleResult(success=False, error="结果变量名不能为空")
        
        try:
            # 支持逗号分隔的数字字符串
            if isinstance(numbers_str, str):
                numbers = [int(float(x.strip())) for x in numbers_str.split(',')]
            elif isinstance(numbers_str, list):
                numbers = [int(float(x)) for x in numbers_str]
            else:
                return ModuleResult(success=False, error="数字格式不正确")
            
            if len(numbers) < 2:
                return ModuleResult(success=False, error="至少需要两个数字")
            
            result = numbers[0]
            for num in numbers[1:]:
                result = math.gcd(result, num)
            
            context.set_variable(result_variable, result)
            
            return ModuleResult(
                success=True,
                message=f"最大公约数: GCD({', '.join(map(str, numbers))}) = {result}",
                data=result
            )
        
        except (ValueError, TypeError) as e:
            return ModuleResult(success=False, error=f"无效的数字: {str(e)}")
        except Exception as e:
            return ModuleResult(success=False, error=f"计算最大公约数失败: {str(e)}")


@register_executor
class MathLcmExecutor(ModuleExecutor):
    """最小公倍数模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "math_lcm"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        # 字段与前端面板对齐: value1/value2 两个数；兼容旧字段名 numbers(逗号分隔)
        numbers_str = context.resolve_value(config.get('numbers', ''))
        if not numbers_str:
            _v1 = context.resolve_value(config.get('value1', ''))
            _v2 = context.resolve_value(config.get('value2', ''))
            numbers_str = ','.join(str(x) for x in (_v1, _v2) if x not in ('', None))
        result_variable = config.get('resultVariable', '')
        
        if not numbers_str:
            return ModuleResult(success=False, error="数字列表不能为空")
        if not result_variable:
            return ModuleResult(success=False, error="结果变量名不能为空")
        
        try:
            # 支持逗号分隔的数字字符串
            if isinstance(numbers_str, str):
                numbers = [int(float(x.strip())) for x in numbers_str.split(',')]
            elif isinstance(numbers_str, list):
                numbers = [int(float(x)) for x in numbers_str]
            else:
                return ModuleResult(success=False, error="数字格式不正确")
            
            if len(numbers) < 2:
                return ModuleResult(success=False, error="至少需要两个数字")
            
            result = numbers[0]
            for num in numbers[1:]:
                result = abs(result * num) // math.gcd(result, num)
            
            context.set_variable(result_variable, result)
            
            return ModuleResult(
                success=True,
                message=f"最小公倍数: LCM({', '.join(map(str, numbers))}) = {result}",
                data=result
            )
        
        except (ValueError, TypeError) as e:
            return ModuleResult(success=False, error=f"无效的数字: {str(e)}")
        except Exception as e:
            return ModuleResult(success=False, error=f"计算最小公倍数失败: {str(e)}")


@register_executor
class MathFactorialExecutor(ModuleExecutor):
    """阶乘模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "math_factorial"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        # 字段与前端面板对齐: value，兼容旧字段名 numberValue
        number_value = context.resolve_value(config.get('numberValue', config.get('value', '')))
        result_variable = config.get('resultVariable', '')
        
        if number_value == '' or number_value is None:
            return ModuleResult(success=False, error="数值不能为空")
        if not result_variable:
            return ModuleResult(success=False, error="结果变量名不能为空")
        
        try:
            num = int(float(number_value))
            
            if num < 0:
                return ModuleResult(success=False, error="阶乘的输入必须是非负整数")
            if num > 170:
                return ModuleResult(success=False, error="数字过大，阶乘结果会溢出")
            
            result = math.factorial(num)
            context.set_variable(result_variable, result)
            
            return ModuleResult(
                success=True,
                message=f"阶乘: {num}! = {result}",
                data=result
            )
        
        except (ValueError, TypeError):
            return ModuleResult(success=False, error=f"无效的数字: {number_value}")
        except Exception as e:
            return ModuleResult(success=False, error=f"阶乘计算失败: {str(e)}")


@register_executor
class MathPermutationExecutor(ModuleExecutor):
    """排列组合模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "math_permutation"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        n = context.resolve_value(config.get('n', ''))
        r = context.resolve_value(config.get('r', ''))
        calc_type = context.resolve_value(config.get('calcType', 'permutation'))  # permutation or combination
        result_variable = config.get('resultVariable', '')
        
        if n == '' or n is None:
            return ModuleResult(success=False, error="n不能为空")
        if r == '' or r is None:
            return ModuleResult(success=False, error="r不能为空")
        if not result_variable:
            return ModuleResult(success=False, error="结果变量名不能为空")
        
        try:
            n_val = int(float(n))
            r_val = int(float(r))
            
            if n_val < 0 or r_val < 0:
                return ModuleResult(success=False, error="n和r必须是非负整数")
            if r_val > n_val:
                return ModuleResult(success=False, error="r不能大于n")
            
            if calc_type == 'permutation':
                # 排列 P(n,r) = n!/(n-r)!
                result = math.perm(n_val, r_val)
                desc = f"P({n_val},{r_val})"
            elif calc_type == 'combination':
                # 组合 C(n,r) = n!/(r!(n-r)!)
                result = math.comb(n_val, r_val)
                desc = f"C({n_val},{r_val})"
            else:
                return ModuleResult(success=False, error=f"不支持的计算类型: {calc_type}")
            
            context.set_variable(result_variable, result)
            
            type_text = "排列" if calc_type == 'permutation' else "组合"
            return ModuleResult(
                success=True,
                message=f"{type_text}: {desc} = {result}",
                data=result
            )
        
        except (ValueError, TypeError) as e:
            return ModuleResult(success=False, error=f"无效的数字: {str(e)}")
        except Exception as e:
            return ModuleResult(success=False, error=f"计算失败: {str(e)}")


@register_executor
class MathPercentageExecutor(ModuleExecutor):
    """百分比计算模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "math_percentage"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        # 字段与前端面板对齐: operation(of/increase/decrease)，兼容旧字段名 calcType(percent_of/what_percent/percent_change)
        calc_type = context.resolve_value(config.get('calcType', config.get('operation', 'percent_of')))
        value1 = context.resolve_value(config.get('value1', ''))
        value2 = context.resolve_value(config.get('value2', ''))
        result_variable = config.get('resultVariable', '')
        
        if value1 == '' or value1 is None:
            return ModuleResult(success=False, error="第一个值不能为空")
        if not result_variable:
            return ModuleResult(success=False, error="结果变量名不能为空")
        
        try:
            val1 = float(value1)
            
            if calc_type == 'percent_of':
                # 计算val1%的val2是多少
                if value2 == '' or value2 is None:
                    return ModuleResult(success=False, error="第二个值不能为空")
                val2 = float(value2)
                result = (val1 / 100) * val2
                desc = f"{val1}%的{val2}"
            elif calc_type == 'what_percent':
                # val1是val2的百分之几
                if value2 == '' or value2 is None:
                    return ModuleResult(success=False, error="第二个值不能为空")
                val2 = float(value2)
                if val2 == 0:
                    return ModuleResult(success=False, error="除数不能为0")
                result = (val1 / val2) * 100
                desc = f"{val1}是{val2}的百分之几"
            elif calc_type == 'percent_change':
                # 从val2变化到val1的增长率
                if value2 == '' or value2 is None:
                    return ModuleResult(success=False, error="第二个值不能为空")
                val2 = float(value2)
                if val2 == 0:
                    return ModuleResult(success=False, error="原始值不能为0")
                result = ((val1 - val2) / val2) * 100
                desc = f"从{val2}到{val1}的增长率"
            elif calc_type == 'of':
                # 面板“X是Y的百分之几”: value1 是 value2 的百分之几
                if value2 == '' or value2 is None:
                    return ModuleResult(success=False, error="第二个值不能为空")
                val2 = float(value2)
                if val2 == 0:
                    return ModuleResult(success=False, error="除数不能为0")
                result = (val1 / val2) * 100
                desc = f"{val1}是{val2}的百分之几"
            elif calc_type == 'increase':
                # 面板“增加百分比”: value1 增加 value2%
                if value2 == '' or value2 is None:
                    return ModuleResult(success=False, error="第二个值不能为空")
                val2 = float(value2)
                result = val1 * (1 + val2 / 100)
                desc = f"{val1}增加{val2}%"
            elif calc_type == 'decrease':
                # 面板“减少百分比”: value1 减少 value2%
                if value2 == '' or value2 is None:
                    return ModuleResult(success=False, error="第二个值不能为空")
                val2 = float(value2)
                result = val1 * (1 - val2 / 100)
                desc = f"{val1}减少{val2}%"
            else:
                return ModuleResult(success=False, error=f"不支持的计算类型: {calc_type}")
            
            context.set_variable(result_variable, result)
            
            return ModuleResult(
                success=True,
                message=f"百分比计算: {desc} = {result}",
                data=result
            )
        
        except (ValueError, TypeError) as e:
            return ModuleResult(success=False, error=f"无效的数字: {str(e)}")
        except Exception as e:
            return ModuleResult(success=False, error=f"百分比计算失败: {str(e)}")


@register_executor
class MathClampExecutor(ModuleExecutor):
    """数字范围限制模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "math_clamp"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        # 字段与前端面板对齐: value/min/max，兼容旧字段名 numberValue/minValue/maxValue
        number_value = context.resolve_value(config.get('numberValue', config.get('value', '')))
        min_value = context.resolve_value(config.get('minValue', config.get('min', '')))
        max_value = context.resolve_value(config.get('maxValue', config.get('max', '')))
        result_variable = config.get('resultVariable', '')
        
        if number_value == '' or number_value is None:
            return ModuleResult(success=False, error="数值不能为空")
        if not result_variable:
            return ModuleResult(success=False, error="结果变量名不能为空")
        
        try:
            num = float(number_value)
            min_val = float(min_value) if min_value else None
            max_val = float(max_value) if max_value else None
            
            if min_val is not None and max_val is not None and min_val > max_val:
                return ModuleResult(success=False, error="最小值不能大于最大值")
            
            result = num
            if min_val is not None:
                result = max(result, min_val)
            if max_val is not None:
                result = min(result, max_val)
            
            context.set_variable(result_variable, result)
            
            range_text = f"[{min_val if min_val is not None else '-∞'}, {max_val if max_val is not None else '+∞'}]"
            return ModuleResult(
                success=True,
                message=f"范围限制: {num} → {result} (范围: {range_text})",
                data=result
            )
        
        except (ValueError, TypeError) as e:
            return ModuleResult(success=False, error=f"无效的数字: {str(e)}")
        except Exception as e:
            return ModuleResult(success=False, error=f"范围限制失败: {str(e)}")


@register_executor
class MathRandomAdvancedExecutor(ModuleExecutor):
    """高级随机数生成模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "math_random_advanced"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        # 字段与前端面板对齐: type(uniform/normal/exponential) + min/max/mean/stddev/lambda
        # 同时向后兼容旧字段名 randomType/minValue/maxValue 与旧取值 int/gauss
        random_type = context.resolve_value(
            config.get('type', config.get('randomType', 'uniform'))
        )
        result_variable = config.get('resultVariable', '')

        if not result_variable:
            return ModuleResult(success=False, error="结果变量名不能为空")

        # 归一化类型别名: gauss -> normal
        if random_type == 'gauss':
            random_type = 'normal'

        try:
            # 数量与小数位（面板未暴露，保留可选，默认 1 个 / 不四舍五入）
            count_val = int(float(context.resolve_value(config.get('count', '1'))))
            decimals_raw = context.resolve_value(config.get('decimals', ''))
            decimals = None
            if decimals_raw not in (None, ''):
                decimals = int(float(decimals_raw))

            if count_val < 1:
                return ModuleResult(success=False, error="数量必须大于0")
            if count_val > 10000:
                return ModuleResult(success=False, error="数量不能超过10000")

            def _round(v):
                return round(v, decimals) if decimals is not None else v

            results = []

            if random_type in ('uniform', 'int'):
                min_val = float(context.resolve_value(config.get('min', config.get('minValue', '0'))))
                max_val = float(context.resolve_value(config.get('max', config.get('maxValue', '100'))))
                if min_val > max_val:
                    return ModuleResult(success=False, error="最小值不能大于最大值")
                for _ in range(count_val):
                    if random_type == 'int':
                        results.append(random.randint(int(min_val), int(max_val)))
                    else:
                        results.append(_round(random.uniform(min_val, max_val)))
            elif random_type == 'normal':
                # 正态分布：读取用户配置的均值 μ 与标准差 σ
                mean = float(context.resolve_value(config.get('mean', '0')))
                stddev = float(context.resolve_value(config.get('stddev', '1')))
                if stddev < 0:
                    return ModuleResult(success=False, error="标准差不能为负数")
                for _ in range(count_val):
                    results.append(_round(random.gauss(mean, stddev)))
            elif random_type == 'exponential':
                # 指数分布：读取用户配置的 λ 参数
                lambd = float(context.resolve_value(config.get('lambda', '1')))
                if lambd <= 0:
                    return ModuleResult(success=False, error="λ参数必须大于0")
                for _ in range(count_val):
                    results.append(_round(random.expovariate(lambd)))
            else:
                return ModuleResult(success=False, error=f"不支持的随机类型: {random_type}")

            # 如果只有一个结果，直接返回数字，否则返回列表
            result = results[0] if count_val == 1 else results
            context.set_variable(result_variable, result)

            type_text = {
                "uniform": "均匀分布", "int": "整数",
                "normal": "正态分布", "exponential": "指数分布",
            }.get(random_type, random_type)
            return ModuleResult(
                success=True,
                message=f"生成{count_val}个{type_text}随机数",
                data=result
            )

        except (ValueError, TypeError) as e:
            return ModuleResult(success=False, error=f"无效的参数: {str(e)}")
        except Exception as e:
            return ModuleResult(success=False, error=f"生成随机数失败: {str(e)}")
