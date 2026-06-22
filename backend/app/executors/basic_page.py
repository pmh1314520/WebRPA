"""基础模块执行器 - 页面操作相关"""
import asyncio
import os
from datetime import datetime

from .base import ModuleExecutor, ExecutionContext, ModuleResult, register_executor, escape_css_selector, pw_wait_for_element
from .type_utils import to_int


@register_executor
class ScreenshotExecutor(ModuleExecutor):
    """网页截图模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "screenshot"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        screenshot_type = context.resolve_value(config.get('screenshotType', 'fullpage'))
        selector = context.resolve_value(config.get('selector', ''))
        save_path = context.resolve_value(config.get('savePath', ''))
        file_name_pattern = context.resolve_value(config.get('fileNamePattern', ''))
        variable_name = config.get('variableName', '')
        
        if context.page is None:
            return ModuleResult(success=False, error="没有打开的页面")
        
        try:
            await context.switch_to_latest_page()
            
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            
            if file_name_pattern:
                file_name = file_name_pattern.replace('{时间戳}', timestamp)
                if not file_name.endswith('.png'):
                    file_name += '.png'
            else:
                file_name = f"screenshot_{timestamp}.png"
            
            if save_path:
                if save_path.endswith('.png'):
                    final_path = save_path
                else:
                    os.makedirs(save_path, exist_ok=True)
                    final_path = os.path.join(save_path, file_name)
            else:
                screenshots_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'screenshots')
                os.makedirs(screenshots_dir, exist_ok=True)
                final_path = os.path.join(screenshots_dir, file_name)
            
            os.makedirs(os.path.dirname(final_path), exist_ok=True)
            
            if screenshot_type == 'element' and selector:
                escaped_selector = escape_css_selector(selector)
                await pw_wait_for_element(context.page, escaped_selector, state='visible')
                element = context.page.locator(escaped_selector).first
                await element.screenshot(path=final_path)
            elif screenshot_type == 'viewport':
                await context.page.screenshot(path=final_path, full_page=False)
            else:
                await context.page.screenshot(path=final_path, full_page=True)
            
            if variable_name:
                context.set_variable(variable_name, final_path)
            
            return ModuleResult(success=True, message=f"已保存截图: {final_path}", data={'path': final_path})
        except Exception as e:
            return ModuleResult(success=False, error=f"截图失败: {str(e)}")


@register_executor
class JsScriptExecutor(ModuleExecutor):
    """JS脚本模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "js_script"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        import os as _os_pkg
        if _os_pkg.environ.get('WEBRPA_PACKAGED'):
            from app.services.packaged_ui import request_js_script_sync
        else:
            from app.main import request_js_script_sync
        
        code = context.resolve_value(config.get('code', ''))
        result_variable = config.get('resultVariable', '')
        
        if not code:
            return ModuleResult(success=False, error="JavaScript代码不能为空")
        
        try:
            variables = dict(context.variables)
            
            loop = asyncio.get_running_loop()
            result = await loop.run_in_executor(
                None,
                lambda: request_js_script_sync(code=code, variables=variables, timeout=30)
            )
            
            if result.get('success'):
                script_result = result.get('result')
                
                if result_variable:
                    context.set_variable(result_variable, script_result)
                
                result_str = str(script_result)
                if len(result_str) > 100:
                    result_str = result_str[:100] + '...'
                
                return ModuleResult(success=True, message=f"JS脚本执行成功，返回值: {result_str}",
                                  data={'result': script_result})
            else:
                error = result.get('error', '未知错误')
                return ModuleResult(success=False, error=f"JS脚本执行失败: {error}")
        except Exception as e:
            return ModuleResult(success=False, error=f"JS脚本执行异常: {str(e)}")


@register_executor
class InputPromptExecutor(ModuleExecutor):
    """变量输入框模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "input_prompt"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        import os as _os_pkg
        if _os_pkg.environ.get('WEBRPA_PACKAGED'):
            from app.services.packaged_ui import request_input_prompt_sync
        else:
            from app.main import request_input_prompt_sync
        import json
        
        variable_name = config.get('variableName', '')
        prompt_title = context.resolve_value(config.get('promptTitle', '输入'))
        prompt_message = context.resolve_value(config.get('promptMessage', '请输入值:'))
        default_value = context.resolve_value(config.get('defaultValue', ''))
        input_mode = context.resolve_value(config.get('inputMode', 'single'))
        min_value = config.get('minValue')
        max_value = config.get('maxValue')
        max_length = config.get('maxLength')
        required_raw = config.get('required', True)
        if isinstance(required_raw, str):
            required_raw = context.resolve_value(required_raw)
        required = required_raw in [True, 'true', 'True', '1', 1]
        
        # 列表选择模式：解析选项列表
        select_options = None
        if input_mode in ('select_single', 'select_multiple'):
            select_options_var = config.get('selectOptions', '')
            if select_options_var:
                resolved_options = context.resolve_value(select_options_var)
                if isinstance(resolved_options, list):
                    select_options = []
                    for item in resolved_options:
                        if isinstance(item, dict):
                            select_options.append(json.dumps(item, ensure_ascii=False))
                        elif isinstance(item, (list, tuple)):
                            select_options.append(str(item))
                        else:
                            select_options.append(str(item))
                elif isinstance(resolved_options, str):
                    var_name = select_options_var.strip('{}')
                    raw_list = context.variables.get(var_name, [])
                    if isinstance(raw_list, list):
                        select_options = []
                        for item in raw_list:
                            if isinstance(item, dict):
                                select_options.append(json.dumps(item, ensure_ascii=False))
                            elif isinstance(item, (list, tuple)):
                                select_options.append(str(item))
                            else:
                                select_options.append(str(item))
                    else:
                        select_options = []
        
        if not variable_name:
            return ModuleResult(success=False, error="变量名不能为空")
        
        try:
            loop = asyncio.get_running_loop()
            user_input = await loop.run_in_executor(
                None,
                lambda: request_input_prompt_sync(
                    variable_name=variable_name, title=prompt_title, message=prompt_message,
                    default_value=default_value, input_mode=input_mode, min_value=min_value,
                    max_value=max_value, max_length=max_length, required=required,
                    select_options=select_options, timeout=300
                )
            )
            
            if user_input is None:
                return ModuleResult(success=True, message=f"用户取消输入，变量 {variable_name} 保持不变",
                                  data={'cancelled': True})
            
            # 根据输入模式处理结果
            if input_mode == 'checkbox':
                bool_value = user_input.lower() in ('true', '1', 'yes', 'on')
                context.set_variable(variable_name, bool_value)
                return ModuleResult(success=True, message=f"已设置变量 {variable_name} = {bool_value}",
                                  data={'value': bool_value, 'type': 'boolean'})
            elif input_mode == 'slider_int':
                try:
                    int_value = int(float(user_input))
                    context.set_variable(variable_name, int_value)
                    return ModuleResult(success=True, message=f"已设置变量 {variable_name} = {int_value}",
                                      data={'value': int_value, 'type': 'integer'})
                except ValueError:
                    return ModuleResult(success=False, error=f"滑动条返回的值不是有效的整数")
            elif input_mode == 'slider_float':
                try:
                    float_value = float(user_input)
                    context.set_variable(variable_name, float_value)
                    return ModuleResult(success=True, message=f"已设置变量 {variable_name} = {float_value}",
                                      data={'value': float_value, 'type': 'float'})
                except ValueError:
                    return ModuleResult(success=False, error=f"滑动条返回的值不是有效的数字")
            elif input_mode == 'select_single':
                context.set_variable(variable_name, user_input)
                return ModuleResult(success=True, message=f"已设置变量 {variable_name} = {user_input}",
                                  data={'value': user_input, 'type': 'string'})
            elif input_mode == 'select_multiple':
                try:
                    selected_list = json.loads(user_input) if isinstance(user_input, str) else user_input
                    if not isinstance(selected_list, list):
                        selected_list = [selected_list]
                    context.set_variable(variable_name, selected_list)
                    return ModuleResult(success=True, message=f"已设置变量 {variable_name} = 列表({len(selected_list)}项)",
                                      data={'value': selected_list, 'count': len(selected_list), 'type': 'list'})
                except (json.JSONDecodeError, ValueError):
                    context.set_variable(variable_name, [user_input])
                    return ModuleResult(success=True, message=f"已设置变量 {variable_name} = 列表(1项)",
                                      data={'value': [user_input], 'count': 1, 'type': 'list'})
            elif input_mode == 'list':
                result_list = [line.strip() for line in user_input.split('\n') if line.strip()]
                context.set_variable(variable_name, result_list)
                return ModuleResult(success=True, message=f"已设置变量 {variable_name} = 列表({len(result_list)}项)",
                                  data={'value': result_list, 'count': len(result_list)})
            elif input_mode in ('number', 'integer'):
                try:
                    if input_mode == 'integer':
                        num_value = int(user_input)
                    else:
                        num_value = float(user_input)
                    context.set_variable(variable_name, num_value)
                    return ModuleResult(success=True, message=f"已设置变量 {variable_name} = {num_value}",
                                      data={'value': num_value})
                except ValueError:
                    return ModuleResult(success=False, error=f"输入的值不是有效的{'整数' if input_mode == 'integer' else '数字'}")
            elif input_mode in ('file', 'folder'):
                context.set_variable(variable_name, user_input)
                mode_name = '文件' if input_mode == 'file' else '文件夹'
                return ModuleResult(success=True, message=f"已设置{mode_name}路径 {variable_name} = {user_input}",
                                  data={'value': user_input, 'type': input_mode})
            else:
                context.set_variable(variable_name, user_input)
                display_value = '******' if input_mode == 'password' else user_input
                return ModuleResult(success=True, message=f"已设置变量 {variable_name} = {display_value}",
                                  data={'value': user_input})
        except Exception as e:
            return ModuleResult(success=False, error=f"输入框失败: {str(e)}")
