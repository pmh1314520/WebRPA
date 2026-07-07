"""字符串与列表转换模块执行器"""
import csv
import io

from .base import (
    ModuleExecutor,
    ExecutionContext,
    ModuleResult,
    register_executor,
)


@register_executor
class CsvParseExecutor(ModuleExecutor):
    """CSV解析模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "csv_parse"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            # 字段与前端面板对齐: csvContent，兼容旧字段名 csvString
            csv_string = context.resolve_value(config.get('csvString', config.get('csvContent', '')))
            has_header = context.resolve_value(config.get('hasHeader', 'true'))
            delimiter = context.resolve_value(config.get('delimiter', ','))
            result_variable = config.get('resultVariable', '')
            
            if not csv_string:
                return ModuleResult(success=False, error="CSV字符串不能为空")
            if not result_variable:
                return ModuleResult(success=False, error="结果变量名不能为空")
            
            has_header_bool = has_header.lower() == 'true' if isinstance(has_header, str) else bool(has_header)
            
            reader = csv.reader(io.StringIO(csv_string), delimiter=delimiter)
            rows = list(reader)
            
            if not rows:
                return ModuleResult(success=False, error="CSV内容为空")
            
            if has_header_bool and len(rows) > 1:
                headers = rows[0]
                result = [dict(zip(headers, row)) for row in rows[1:]]
            else:
                result = rows
            
            context.set_variable(result_variable, result)
            return ModuleResult(success=True, message=f"CSV解析完成，共 {len(result)} 行", data=result)
        except Exception as e:
            return ModuleResult(success=False, error=f"CSV解析失败: {str(e)}")


@register_executor
class CsvGenerateExecutor(ModuleExecutor):
    """CSV生成模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "csv_generate"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            # 字段与前端面板对齐: dataVariable，兼容旧字段名 listVariable
            list_variable = context.resolve_value(config.get('listVariable', config.get('dataVariable', '')))
            include_header = context.resolve_value(config.get('includeHeader', 'true'))
            delimiter = context.resolve_value(config.get('delimiter', ','))
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
            
            include_header_bool = include_header.lower() == 'true' if isinstance(include_header, str) else bool(include_header)
            
            output = io.StringIO()
            writer = csv.writer(output, delimiter=delimiter)
            
            # 如果是字典列表
            if isinstance(list_data[0], dict):
                keys = list(list_data[0].keys())
                if include_header_bool:
                    writer.writerow(keys)
                for item in list_data:
                    writer.writerow([item.get(k, '') for k in keys])
            # 如果是普通列表
            else:
                for item in list_data:
                    if isinstance(item, list):
                        writer.writerow(item)
                    else:
                        writer.writerow([item])
            
            result = output.getvalue()
            context.set_variable(result_variable, result)
            return ModuleResult(success=True, message=f"CSV生成完成", data=result)
        except Exception as e:
            return ModuleResult(success=False, error=f"CSV生成失败: {str(e)}")


@register_executor
class ListToStringAdvancedExecutor(ModuleExecutor):
    """列表转字符串（高级）模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "list_to_string_advanced"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            list_variable = context.resolve_value(config.get('listVariable', ''))
            format_template = context.resolve_value(config.get('formatTemplate', '{item}'))
            separator = context.resolve_value(config.get('separator', ', '))
            prefix = context.resolve_value(config.get('prefix', ''))
            suffix = context.resolve_value(config.get('suffix', ''))
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
            
            formatted_items = []
            for index, item in enumerate(list_data):
                formatted = format_template.replace('{item}', str(item))
                formatted = formatted.replace('{index}', str(index))
                formatted = formatted.replace('{index1}', str(index + 1))
                formatted_items.append(formatted)
            
            result = prefix + separator.join(formatted_items) + suffix
            context.set_variable(result_variable, result)
            return ModuleResult(success=True, message=f"列表转字符串完成", data=result)
        except Exception as e:
            return ModuleResult(success=False, error=f"转换失败: {str(e)}")
