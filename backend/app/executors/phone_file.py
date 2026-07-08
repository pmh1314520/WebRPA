"""手机文件管理模块执行器"""
from .base import ModuleExecutor, ExecutionContext, ModuleResult, register_executor
from .phone_utils import ensure_phone_connected
from ..services.adb_manager import get_adb_manager


@register_executor
class PhonePushFileExecutor(ModuleExecutor):
    """推送文件到手机"""
    
    @property
    def module_type(self) -> str:
        return "phone_push_file"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        local_path = context.resolve_value(config.get('localPath', ''))
        remote_path = context.resolve_value(config.get('remotePath', ''))
        
        # 自动连接设备（支持指定设备）
        success, device_id, error = ensure_phone_connected(context, config)
        if not success:
            return ModuleResult(success=False, error=error)
        
        if not local_path or not remote_path:
            return ModuleResult(success=False, error="本地路径和远程路径不能为空")
        
        try:
            adb = get_adb_manager()
            success, error = adb.push_file(local_path, remote_path, device_id)
            if not success:
                return ModuleResult(success=False, error=error)
            return ModuleResult(success=True, message=f"文件已推送到: {remote_path}")
        except Exception as e:
            return ModuleResult(success=False, error=f"推送文件失败: {str(e)}")


@register_executor
class PhonePullFileExecutor(ModuleExecutor):
    """从手机拉取文件"""
    
    @property
    def module_type(self) -> str:
        return "phone_pull_file"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        remote_path = context.resolve_value(config.get('remotePath', ''))
        local_path = context.resolve_value(config.get('localPath', ''))
        
        # 自动连接设备（支持指定设备）
        success, device_id, error = ensure_phone_connected(context, config)
        if not success:
            return ModuleResult(success=False, error=error)
        
        if not local_path or not remote_path:
            return ModuleResult(success=False, error="本地路径和远程路径不能为空")
        
        try:
            adb = get_adb_manager()
            success, error = adb.pull_file(remote_path, local_path, device_id)
            if not success:
                return ModuleResult(success=False, error=error)
            # 字段与前端面板对齐: 将本地文件路径保存到 variableName(兼容 saveToVariable)
            result_variable = config.get('variableName') or config.get('saveToVariable', '')
            if result_variable:
                context.set_variable(result_variable, local_path)
            return ModuleResult(success=True, message=f"文件已保存到: {local_path}", data={'path': local_path})
        except Exception as e:
            return ModuleResult(success=False, error=f"拉取文件失败: {str(e)}")
