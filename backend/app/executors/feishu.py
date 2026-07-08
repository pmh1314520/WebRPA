"""飞书自动化模块执行器"""
import httpx
import json
from typing import Any, Optional, Dict, List
from app.executors.base import ModuleExecutor, ExecutionContext, ModuleResult, register_executor


class FeishuClient:
    """飞书API客户端"""
    
    def __init__(self, app_id: str, app_secret: str):
        self.app_id = app_id
        self.app_secret = app_secret
        self.access_token: Optional[str] = None
        self.base_url = "https://open.feishu.cn/open-apis"
    
    async def get_access_token(self) -> str:
        """获取访问令牌"""
        if self.access_token:
            return self.access_token
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/auth/v3/tenant_access_token/internal",
                json={
                    "app_id": self.app_id,
                    "app_secret": self.app_secret
                }
            )
            data = response.json()
            if data.get('code') == 0:
                self.access_token = data['tenant_access_token']
                return self.access_token
            else:
                raise Exception(f"获取飞书访问令牌失败: {data.get('msg')}")
    
    async def request(self, method: str, path: str, **kwargs) -> Dict:
        """发送API请求"""
        token = await self.get_access_token()
        headers = kwargs.pop('headers', {})
        headers['Authorization'] = f'Bearer {token}'
        
        async with httpx.AsyncClient() as client:
            response = await client.request(
                method=method,
                url=f"{self.base_url}{path}",
                headers=headers,
                **kwargs
            )
            return response.json()


@register_executor
class FeishuBitableWriteExecutor(ModuleExecutor):
    """飞书多维表格写入执行器"""
    
    @property
    def module_type(self) -> str:
        return "feishu_bitable_write"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """写入数据到飞书多维表格"""
        try:
            # 获取飞书配置
            app_id = context.resolve_value(config.get('appId', ''))
            app_secret = context.resolve_value(config.get('appSecret', ''))
            app_token = context.resolve_value(config.get('appToken', ''))
            table_id = context.resolve_value(config.get('tableId', ''))
            
            if not all([app_id, app_secret, app_token, table_id]):
                return ModuleResult(
                    success=False,
                    message="飞书配置不完整，请检查App ID、App Secret、App Token和Table ID",
                    error="配置不完整"
                )
            
            # 获取要写入的数据
            data_source = config.get('dataSource', 'manual')  # manual, variable
            
            if data_source == 'manual':
                # 字段与前端面板对齐: 手动模式使用 recordData(JSON 字符串)；兼容旧字段 fields(映射)
                record_data = {}
                record_data_raw = config.get('recordData', '')
                if record_data_raw:
                    resolved = context.resolve_value(record_data_raw)
                    if isinstance(resolved, dict):
                        record_data = resolved
                    elif isinstance(resolved, str) and resolved.strip():
                        import json as _json
                        try:
                            record_data = _json.loads(resolved)
                        except Exception:
                            return ModuleResult(success=False, message="记录数据JSON格式错误", error="记录数据JSON格式错误")
                else:
                    fields = config.get('fields', {})
                    for field_name, field_value in fields.items():
                        record_data[field_name] = context.resolve_value(field_value)
                records = [record_data]
            else:
                # 从变量获取数据（面板字段 dataVariable，兼容旧字段 variableName）
                variable_name = config.get('dataVariable', '') or config.get('variableName', '')
                data = context.get_variable(variable_name)
                if not data:
                    return ModuleResult(
                        success=False,
                        message=f"变量 {variable_name} 不存在或为空",
                        error="数据源为空"
                    )
                
                # 支持单条记录或多条记录
                if isinstance(data, dict):
                    records = [data]
                elif isinstance(data, list):
                    records = data
                else:
                    return ModuleResult(
                        success=False,
                        message="数据格式错误，应为字典或字典列表",
                        error="数据格式错误"
                    )
            
            # 创建飞书客户端
            client = FeishuClient(app_id, app_secret)
            
            # 批量写入记录
            success_count = 0
            failed_count = 0
            
            for record in records:
                try:
                    result = await client.request(
                        'POST',
                        f'/bitable/v1/apps/{app_token}/tables/{table_id}/records',
                        json={'fields': record}
                    )
                    
                    if result.get('code') == 0:
                        success_count += 1
                    else:
                        failed_count += 1
                        print(f"[FeishuBitable] 写入记录失败: {result.get('msg')}")
                except Exception as e:
                    failed_count += 1
                    print(f"[FeishuBitable] 写入记录异常: {e}")
            
            return ModuleResult(
                success=success_count > 0,
                message=f"成功写入 {success_count} 条记录，失败 {failed_count} 条",
                data={
                    'success_count': success_count,
                    'failed_count': failed_count,
                    'total': len(records)
                }
            )
            
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            print(f"[FeishuBitableWriteExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"飞书多维表格写入失败: {str(e)}",
                error=str(e)
            )


@register_executor
class FeishuBitableReadExecutor(ModuleExecutor):
    """飞书多维表格读取执行器"""
    
    @property
    def module_type(self) -> str:
        return "feishu_bitable_read"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """从飞书多维表格读取数据"""
        try:
            # 获取飞书配置
            app_id = context.resolve_value(config.get('appId', ''))
            app_secret = context.resolve_value(config.get('appSecret', ''))
            app_token = context.resolve_value(config.get('appToken', ''))
            table_id = context.resolve_value(config.get('tableId', ''))
            variable_name = config.get('variableName', 'feishu_data')
            # 面板选项：每页大小(飞书上限 500)，未配置则用 500
            try:
                page_size = int(context.resolve_value(config.get('pageSize', 500)) or 500)
            except (ValueError, TypeError):
                page_size = 500
            page_size = max(1, min(page_size, 500))
            
            if not all([app_id, app_secret, app_token, table_id]):
                return ModuleResult(
                    success=False,
                    message="飞书配置不完整",
                    error="配置不完整"
                )
            
            # 创建飞书客户端
            client = FeishuClient(app_id, app_secret)
            
            # 读取记录
            all_records = []
            page_token = None
            
            while True:
                params = {'page_size': page_size}
                if page_token:
                    params['page_token'] = page_token
                
                result = await client.request(
                    'GET',
                    f'/bitable/v1/apps/{app_token}/tables/{table_id}/records',
                    params=params
                )
                
                if result.get('code') != 0:
                    return ModuleResult(
                        success=False,
                        message=f"读取飞书多维表格失败: {result.get('msg')}",
                        error=result.get('msg')
                    )
                
                items = result.get('data', {}).get('items', [])
                for item in items:
                    all_records.append(item.get('fields', {}))
                
                # 检查是否还有下一页
                if not result.get('data', {}).get('has_more'):
                    break
                page_token = result.get('data', {}).get('page_token')
            
            # 保存到变量
            context.set_variable(variable_name, all_records)
            
            return ModuleResult(
                success=True,
                message=f"成功读取 {len(all_records)} 条记录",
                data={'count': len(all_records), 'records': all_records}
            )
            
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            print(f"[FeishuBitableReadExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"飞书多维表格读取失败: {str(e)}",
                error=str(e)
            )


@register_executor
class FeishuSheetWriteExecutor(ModuleExecutor):
    """飞书电子表格写入执行器"""
    
    @property
    def module_type(self) -> str:
        return "feishu_sheet_write"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """写入数据到飞书电子表格"""
        try:
            # 获取飞书配置
            app_id = context.resolve_value(config.get('appId', ''))
            app_secret = context.resolve_value(config.get('appSecret', ''))
            spreadsheet_token = context.resolve_value(config.get('spreadsheetToken', ''))
            sheet_id = context.resolve_value(config.get('sheetId', ''))
            # 字段与前端面板对齐: startCell，兼容旧字段名 range
            range_notation = context.resolve_value(config.get('range', '') or config.get('startCell', '') or 'A1')
            
            if not all([app_id, app_secret, spreadsheet_token]):
                return ModuleResult(
                    success=False,
                    message="飞书配置不完整",
                    error="配置不完整"
                )
            
            # 获取要写入的数据
            data_source = config.get('dataSource', 'manual')
            
            if data_source == 'manual':
                # 手动输入的数据
                values = config.get('values', [[]])
                # 解析变量
                resolved_values = []
                for row in values:
                    resolved_row = [context.resolve_value(cell) for cell in row]
                    resolved_values.append(resolved_row)
            else:
                # 从变量获取数据（面板字段 dataVariable，兼容旧字段 variableName）
                variable_name = config.get('dataVariable', '') or config.get('variableName', '')
                data = context.get_variable(variable_name)
                if not data:
                    return ModuleResult(
                        success=False,
                        message=f"变量 {variable_name} 不存在或为空",
                        error="数据源为空"
                    )
                
                # 转换为二维数组
                if isinstance(data, list):
                    if data and isinstance(data[0], dict):
                        # 字典列表转为二维数组
                        keys = list(data[0].keys())
                        resolved_values = [keys]  # 表头
                        for item in data:
                            resolved_values.append([item.get(k, '') for k in keys])
                    else:
                        resolved_values = data
                else:
                    resolved_values = [[data]]
            
            # 创建飞书客户端
            client = FeishuClient(app_id, app_secret)
            
            # 写入数据
            result = await client.request(
                'PUT',
                f'/sheets/v2/spreadsheets/{spreadsheet_token}/values',
                json={
                    'valueRange': {
                        'range': f'{sheet_id}!{range_notation}',
                        'values': resolved_values
                    }
                }
            )
            
            if result.get('code') == 0:
                return ModuleResult(
                    success=True,
                    message=f"成功写入 {len(resolved_values)} 行数据",
                    data={'rows': len(resolved_values)}
                )
            else:
                return ModuleResult(
                    success=False,
                    message=f"飞书电子表格写入失败: {result.get('msg')}",
                    error=result.get('msg')
                )
            
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            print(f"[FeishuSheetWriteExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"飞书电子表格写入失败: {str(e)}",
                error=str(e)
            )


@register_executor
class FeishuSheetReadExecutor(ModuleExecutor):
    """飞书电子表格读取执行器"""
    
    @property
    def module_type(self) -> str:
        return "feishu_sheet_read"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """从飞书电子表格读取数据"""
        try:
            # 获取飞书配置
            app_id = context.resolve_value(config.get('appId', ''))
            app_secret = context.resolve_value(config.get('appSecret', ''))
            spreadsheet_token = context.resolve_value(config.get('spreadsheetToken', ''))
            sheet_id = context.resolve_value(config.get('sheetId', ''))
            range_notation = context.resolve_value(config.get('range', 'A1:Z1000'))
            variable_name = config.get('variableName', 'feishu_sheet_data')
            
            if not all([app_id, app_secret, spreadsheet_token]):
                return ModuleResult(
                    success=False,
                    message="飞书配置不完整",
                    error="配置不完整"
                )
            
            # 创建飞书客户端
            client = FeishuClient(app_id, app_secret)
            
            # 读取数据
            result = await client.request(
                'GET',
                f'/sheets/v2/spreadsheets/{spreadsheet_token}/values/{sheet_id}!{range_notation}'
            )
            
            if result.get('code') != 0:
                return ModuleResult(
                    success=False,
                    message=f"飞书电子表格读取失败: {result.get('msg')}",
                    error=result.get('msg')
                )
            
            values = result.get('data', {}).get('valueRange', {}).get('values', [])
            
            # 保存到变量
            context.set_variable(variable_name, values)
            
            return ModuleResult(
                success=True,
                message=f"成功读取 {len(values)} 行数据",
                data={'rows': len(values), 'data': values}
            )
            
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            print(f"[FeishuSheetReadExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"飞书电子表格读取失败: {str(e)}",
                error=str(e)
            )
