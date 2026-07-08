"""手机屏幕操作模块执行器"""
import os
from pathlib import Path
from .base import ModuleExecutor, ExecutionContext, ModuleResult, register_executor
from .phone_utils import ensure_phone_connected
from ..services.adb_manager import get_adb_manager
from ..services.scrcpy_manager import get_scrcpy_manager


@register_executor
class PhoneScreenshotExecutor(ModuleExecutor):
    """手机截图"""
    
    @property
    def module_type(self) -> str:
        return "phone_screenshot"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        save_path = context.resolve_value(config.get('savePath', ''))
        # 字段与前端面板对齐: variableName，兼容旧字段名 saveToVariable
        save_to_variable = config.get('variableName') or config.get('saveToVariable', '')
        
        # 自动连接设备（支持指定设备）
        success, device_id, error = ensure_phone_connected(context, config)
        if not success:
            return ModuleResult(success=False, error=error)
        
        if not save_path:
            # 使用默认路径
            uploads_dir = Path(__file__).parent.parent.parent / "uploads" / "images"
            uploads_dir.mkdir(parents=True, exist_ok=True)
            import time
            save_path = str(uploads_dir / f"phone_screenshot_{int(time.time())}.png")
        
        try:
            adb = get_adb_manager()
            success, error = adb.screenshot(save_path, device_id)
            if not success:
                return ModuleResult(success=False, error=error)
            
            if save_to_variable:
                context.set_variable(save_to_variable, save_path)
            
            return ModuleResult(success=True, message=f"截图已保存: {save_path}", data={'path': save_path})
        except Exception as e:
            return ModuleResult(success=False, error=f"截图失败: {str(e)}")


@register_executor
class PhoneStartMirrorExecutor(ModuleExecutor):
    """启动手机镜像"""
    
    @property
    def module_type(self) -> str:
        return "phone_start_mirror"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        # 自动连接设备（支持指定设备）
        success, device_id, error = ensure_phone_connected(context, config)
        if not success:
            return ModuleResult(success=False, error=error)
        
        # 获取配置参数
        bit_rate = config.get('bitRate', 8)
        max_size = config.get('maxSize', 1920)
        stay_awake = config.get('stayAwake', True)
        turn_screen_off = config.get('turnScreenOff', False)
        
        try:
            print(f"[PhoneStartMirrorExecutor] 准备启动镜像，设备ID: {device_id}")
            print(f"[PhoneStartMirrorExecutor] 配置: bitRate={bit_rate}M, maxSize={max_size}, stayAwake={stay_awake}, turnScreenOff={turn_screen_off}")
            
            scrcpy = get_scrcpy_manager()
            success, error = scrcpy.start_mirror(
                device_id=device_id,
                max_size=max_size,
                bit_rate=f'{bit_rate}M',
                stay_awake=stay_awake,
                turn_screen_off=turn_screen_off,
                window_title=f"手机镜像 - {device_id}"
            )
            
            if not success:
                print(f"[PhoneStartMirrorExecutor] 启动失败: {error}")
                return ModuleResult(success=False, error=error or "启动镜像失败，未知错误")
            
            print(f"[PhoneStartMirrorExecutor] 镜像启动成功")
            return ModuleResult(success=True, message="✅ 手机镜像已启动，可以在新窗口中查看和操作手机")
            
        except Exception as e:
            error_msg = f"❌ 启动镜像失败: {str(e)}"
            print(f"[PhoneStartMirrorExecutor] 异常: {error_msg}")
            return ModuleResult(success=False, error=error_msg)


@register_executor
class PhoneStopMirrorExecutor(ModuleExecutor):
    """停止手机镜像"""
    
    @property
    def module_type(self) -> str:
        return "phone_stop_mirror"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        try:
            scrcpy = get_scrcpy_manager()
            success, error = scrcpy.stop_mirror()
            if not success:
                return ModuleResult(success=False, error=error or "停止镜像失败")
            return ModuleResult(success=True, message="手机镜像已停止")
        except Exception as e:
            return ModuleResult(success=False, error=f"停止镜像失败: {str(e)}")
