import asyncio
import sys
import threading
import uuid
from pathlib import Path

# OCR 模型采用「按需加载」策略：启动时既不同步预热也不后台预热，
# 避免 PaddleOCR/EasyOCR/torch/paddlepaddle 一启动就常驻几百 MB 内存。
# 仅当用户实际运行 OCR 相关模块时才懒加载并缓存模型，最大限度降低空闲内存。

# Windows 上需要设置事件循环策略以支持 Playwright
# Python 3.13 在 Windows 上的兼容性修复
if sys.platform == "win32":
    # Playwright 需要使用 WindowsProactorEventLoopPolicy 来支持子进程
    # WindowsSelectorEventLoopPolicy 不支持 subprocess，会导致 NotImplementedError
    try:
        # 设置 WindowsProactorEventLoopPolicy
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        print("[EventLoop] 已设置 WindowsProactorEventLoopPolicy（支持 Playwright 子进程）")
    except AttributeError:
        # 如果没有 WindowsProactorEventLoopPolicy，使用默认策略
        print("[EventLoop] 使用默认事件循环策略")
    
    # 对于 Python 3.8+，确保事件循环已创建
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio

# 创建Socket.IO服务器
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    ping_timeout=120,  # ping 超时 120秒
    ping_interval=25,  # ping 间隔 25秒
    logger=True,  # 启用Socket.IO的日志用于调试
    engineio_logger=True,  # 启用Engine.IO的日志用于调试
)

# 创建FastAPI应用
app = FastAPI(
    title="Web Automation API",
    description="网页自动化工作流构建平台后端API",
    version="0.1.0"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 本地访问鉴权：本机免验，远程需 Token（默认开启，可在安全设置里关闭）
from starlette.responses import JSONResponse as _JSONResponse
from app.services import security_manager as _sec

# 这些路径无需鉴权（文档 / 安全状态查询 / CORS 预检）
_AUTH_PUBLIC_PREFIXES = ("/docs", "/redoc", "/openapi.json", "/api/security/")


@app.middleware("http")
async def _auth_middleware(request, call_next):
    try:
        # 预检请求直接放行
        if request.method == "OPTIONS":
            return await call_next(request)
        path = request.url.path or ""
        # 公共路径放行
        if any(path.startswith(p) for p in _AUTH_PUBLIC_PREFIXES):
            return await call_next(request)
        # 鉴权关闭 → 放行（应急逃生开关）
        if not _sec.is_enabled():
            return await call_next(request)
        # 本机来源 → 放行
        client_host = request.client.host if request.client else None
        if _sec.is_loopback(client_host):
            return await call_next(request)
        # 远程来源 → 校验 Token（头 / 查询参数 / Bearer）
        token = request.headers.get("x-webrpa-token") or request.query_params.get("token")
        if not token:
            auth = request.headers.get("authorization", "")
            if auth.lower().startswith("bearer "):
                token = auth[7:].strip()
        if _sec.verify(token):
            return await call_next(request)
        return _JSONResponse(
            status_code=401,
            content={"detail": "需要访问令牌：请在 WebRPA 安全设置中获取 Token 并在远程访问时携带"},
        )
    except Exception:
        # 鉴权中间件自身异常时不阻断业务（避免误伤）
        return await call_next(request)

# 导入并注册路由
from app.api.workflows import (
    router as workflows_router, 
    set_sio as set_workflows_sio,
    set_log_enabled,
    remove_log_enabled
)
from app.api.element_picker import router as element_picker_router
from app.api.data_assets import router as data_assets_router
from app.api.image_assets import router as image_assets_router
from app.api.browser import router as browser_router
from app.api.system import router as system_router
from app.api.system_media import router as system_media_router
from app.api.system_dialog import router as system_dialog_router
from app.api.system_macro import router as system_macro_router
from app.api.system_mouse import router as system_mouse_router
from app.api.system_napcat import router as system_napcat_router, set_napcat_sio
from app.api.local_workflows import router as local_workflows_router
from app.api.triggers import router as triggers_router
from app.api.scheduled_tasks import router as scheduled_tasks_router
from app.api.phone import router as phone_router
from app.api.desktop_picker import router as desktop_picker_router
from app.api.custom_modules import router as custom_modules_router
from app.api.plugins import router as plugins_router
from app.api.ai_assistant import router as ai_assistant_router, set_sio as set_ai_assistant_sio
from app.api.screensaver import router as screensaver_router
from app.api.recorder import router as recorder_router
from app.api.workflow_versions import router as workflow_versions_router
from app.api.desktop_recorder import router as desktop_recorder_router
from app.api.security import router as security_router
from app.api.credentials import router as credentials_router
from app.api.retention import router as retention_router
from app.api.workflow_bundle import router as workflow_bundle_router
from app.api.dashboard import router as dashboard_router
from app.api.published_workflows import router as published_workflows_router
app.include_router(workflows_router)
app.include_router(element_picker_router)
app.include_router(data_assets_router)
app.include_router(image_assets_router)
app.include_router(browser_router)
# system_dialog_router 必须在 system_router 之前注册，避免路由冲突
app.include_router(system_dialog_router)
app.include_router(system_router)
app.include_router(system_media_router)
app.include_router(system_macro_router)
app.include_router(system_mouse_router)
app.include_router(system_napcat_router)
app.include_router(local_workflows_router)
app.include_router(triggers_router)
app.include_router(scheduled_tasks_router)
app.include_router(phone_router)
app.include_router(desktop_picker_router)
app.include_router(custom_modules_router)
app.include_router(plugins_router)
app.include_router(ai_assistant_router)
app.include_router(screensaver_router)
app.include_router(recorder_router)
app.include_router(workflow_versions_router)
app.include_router(desktop_recorder_router)
app.include_router(security_router)
app.include_router(credentials_router)
app.include_router(retention_router)
app.include_router(workflow_bundle_router)
app.include_router(dashboard_router)
app.include_router(published_workflows_router)

# 设置 Socket.IO 实例（避免循环导入）
set_workflows_sio(sio)
set_napcat_sio(sio)
set_ai_assistant_sio(sio)

# 将Socket.IO挂载到FastAPI
# 使用 other_asgi_app 参数将 FastAPI 应用作为后备
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)


@app.get("/")
async def root():
    return {"message": "Web Automation API", "version": "0.1.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.get("/api/config")
async def get_config():
    """获取服务配置信息"""
    import json
    import os
    
    config_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'WebRPAConfig.json')
    try:
        if os.path.exists(config_path):
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
                return {
                    "backend": config.get('backend', {}),
                    "frontend": config.get('frontend', {}),
                    "frameworkHub": config.get('frameworkHub', {})
                }
    except Exception as e:
        print(f"[Config API] 读取配置文件失败: {e}")
    
    # 返回默认配置
    return {
        "backend": {"host": "0.0.0.0", "port": 5241, "reload": False},
        "frontend": {"host": "0.0.0.0", "port": 5921},
        "frameworkHub": {"host": "0.0.0.0", "port": 3000}
    }


@app.on_event("startup")
async def startup_event():
    """应用启动时设置主事件循环"""
    loop = asyncio.get_event_loop()
    set_main_loop(loop)

    # OCR 模型改为「按需加载」：不在启动时预热，避免 PaddleOCR/EasyOCR/torch
    # 一启动就常驻几百 MB 内存。用户首次运行 OCR 相关模块（点击文本/悬停文本/
    # 图像识别等）时会通过 get_ocr_instance()/get_easyocr_reader() 懒加载并缓存，
    # 仅首次有一次性初始化延迟，之后命中缓存。极大降低空闲内存占用。

    # 后台初始化 MCP 服务器（用户配置的）
    async def _init_mcp():
        try:
            from app.services.mcp_manager import init_mcp_at_startup
            await init_mcp_at_startup()
        except Exception as e:
            print(f"[Startup] MCP 初始化失败: {e}")

    asyncio.create_task(_init_mcp())
    
    # 启动留存清理（录像/采集数据滚动清理，避免磁盘膨胀）
    try:
        from app.services import retention_manager
        retention_manager.start_periodic_cleanup()
    except Exception as e:
        print(f"[Startup] 留存清理启动失败: {e}")
    
    # 启动剪贴板监听服务（用于检测用户截图）
    try:
        from app.services.clipboard_monitor import ClipboardMonitorService
        from PIL import Image
        
        clipboard_monitor = ClipboardMonitorService()
        
        def on_new_image(img: Image.Image):
            """检测到新图片时的回调"""
            try:
                # 通过 WebSocket 通知所有连接的前端
                asyncio.run_coroutine_threadsafe(
                    sio.emit('clipboard:new_image', {
                        'width': img.width,
                        'height': img.height,
                        'timestamp': asyncio.get_event_loop().time()
                    }, to=None),  # 广播给所有客户端
                    loop
                )
                print(f"[ClipboardMonitor] 已通知前端新图片 ({img.width}x{img.height})")
            except Exception as e:
                print(f"[ClipboardMonitor] 通知前端失败: {e}")
        
        clipboard_monitor.set_callback(on_new_image)
        clipboard_monitor.start()
        print("[Startup] 剪贴板监听服务已启动")
    except Exception as e:
        print(f"[Startup] 剪贴板监听服务启动失败: {e}")
    
    # 启动全局热键服务
    try:
        from app.services.global_hotkey import get_hotkey_service
        hotkey_service = get_hotkey_service()
        hotkey_service.set_main_loop(loop)
        hotkey_service.set_callbacks(
            on_run=on_hotkey_run_workflow,
            on_stop=on_hotkey_stop_workflow,
            on_macro_start=on_hotkey_macro_start,
            on_macro_stop=on_hotkey_macro_stop,
            on_screenshot=on_hotkey_screenshot
        )
        hotkey_service.start()
        print("[Startup] 全局热键服务已启动 (F5=运行, Shift+F5=停止)")
    except Exception as e:
        print(f"[Startup] 全局热键服务启动失败: {e}")
    
    # 初始化计划任务管理器的工作流执行回调
    from app.services.scheduled_task_manager import scheduled_task_manager
    from app.api.workflows import workflows_store, executions_store, execution_results, execution_data
    from app.api.local_workflows import DEFAULT_WORKFLOW_FOLDER
    from app.services.workflow_executor import WorkflowExecutor
    from app.models.workflow import Workflow
    import json
    
    async def execute_workflow_for_scheduled_task(workflow_filename: str, task_id: str = None):
        """为计划任务执行工作流
        
        Args:
            workflow_filename: 工作流文件名
            task_id: 计划任务ID（用于保存执行器引用）
        
        Returns:
            dict: 包含执行结果和执行器引用
        """
        from pathlib import Path
        
        executor = None
        try:
            # 先尝试从内存中获取工作流
            workflow = workflows_store.get(workflow_filename)
            
            # 如果内存中没有，从文件系统加载
            if not workflow:
                try:
                    # 使用默认工作流文件夹
                    workflow_path = Path(DEFAULT_WORKFLOW_FOLDER) / workflow_filename
                    
                    if not workflow_path.exists():
                        return {
                            'success': False,
                            'error': f'工作流文件不存在: {workflow_filename}',
                            'executed_nodes': 0,
                            'failed_nodes': 0,
                            'collected_data': [],
                            'executor': None
                        }
                    
                    # 加载工作流文件
                    with open(workflow_path, 'r', encoding='utf-8') as f:
                        workflow_data = json.load(f)
                    
                    # 创建工作流对象
                    workflow = Workflow(**workflow_data)
                    
                    # 缓存到内存中
                    workflows_store[workflow_filename] = workflow
                    
                except Exception as e:
                    return {
                        'success': False,
                        'error': f'加载工作流失败: {str(e)}',
                        'executed_nodes': 0,
                        'failed_nodes': 0,
                        'collected_data': [],
                        'executor': None
                    }
            
            # 检查是否已在执行
            if workflow_filename in executions_store:
                existing_executor = executions_store[workflow_filename]
                if existing_executor.is_running:
                    return {
                        'success': False,
                        'error': '工作流正在执行中',
                        'executed_nodes': 0,
                        'failed_nodes': 0,
                        'collected_data': [],
                        'executor': None
                    }
            
            # 创建执行器（无回调，静默执行）
            # 使用与手动执行相同的浏览器配置，确保持久化数据可用
            browser_data_dir = Path(__file__).parent.parent / "browser_data"
            
            # 获取任务配置以决定是否打开监控页面和是否无头运行
            should_open_monitor = False
            is_headless = False
            
            if task_id:
                task = scheduled_task_manager.get_task(task_id)
                if task:
                    should_open_monitor = getattr(task, 'open_monitor', False)
                    is_headless = getattr(task, 'headless', False)
            
            # 自动打开前端监控页面
            if should_open_monitor:
                try:
                    import webbrowser
                    import os # 确保在函数作用域内导入 os 模块
                    # import json # 已在文件顶部导入，无需再次导入，避免遮蔽外部变量
                    
                    # 读取配置文件获取前端端口
                    config_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'WebRPAConfig.json')
                    frontend_port = 5921
                    frontend_host = 'localhost'
                    
                    if os.path.exists(config_path):
                        with open(config_path, 'r', encoding='utf-8') as f:
                            # 使用全局导入的json
                            config = json.load(f)
                            frontend_conf = config.get('frontend', {})
                            frontend_port = frontend_conf.get('port', 5921)
                            # 如果host是0.0.0.0，使用localhost
                            host = frontend_conf.get('host', 'localhost')
                            frontend_host = 'localhost' if host == '0.0.0.0' else host
                    
                    # 构造URL并附加 auto_close 参数
                    monitor_url = f"http://{frontend_host}:{frontend_port}/editor/{workflow.id}?auto_close=true"
                    print(f"[ScheduledTask] 正在打开前端监控页面: {monitor_url}")
                    webbrowser.open(monitor_url)
                    
                    # 等待前端页面加载并建立Socket连接
                    # 这样前端才有机会接收到 input_prompt 等事件
                    await asyncio.sleep(5)
                    
                except Exception as e:
                    print(f"[ScheduledTask] 打开前端监控页面失败: {e}")

            executor = WorkflowExecutor(
                workflow=workflow,
                headless=is_headless,  # 根据任务配置决定是否无头模式
                browser_config={
                    'type': 'msedge',
                    'executablePath': None,
                    'fullscreen': False,
                    'launchArgs': None,
                }
            )
            
            # 设置user_data_dir以使用持久化数据
            executor.context._user_data_dir = str(browser_data_dir)
            
            executions_store[workflow_filename] = executor
            
            # 如果提供了 task_id，保存执行器引用到计划任务管理器
            if task_id:
                scheduled_task_manager.running_executors[task_id] = executor
                print(f"[execute_workflow_for_scheduled_task] 已保存执行器引用: task_id={task_id}")
            
            # 执行工作流
            result = await executor.execute()
            
            # 收集数据
            collected_data = executor.get_collected_data()
            
            # 从 executor.logger 获取完整的执行日志 (针对计划任务)
            full_logs = []
            if hasattr(executor, 'logger') and hasattr(executor.logger, 'logs'):
                full_logs = executor.logger.logs
            
            # 保存结果
            execution_results[workflow_filename] = result
            execution_data[workflow_filename] = collected_data
            
            # 清理执行器
            if workflow_filename in executions_store:
                del executions_store[workflow_filename]
            
            # 清理浏览器资源（防止进程泄漏）
            if executor:
                try:
                    await executor.cleanup()
                    print(f"[execute_workflow_for_scheduled_task] 已清理浏览器资源")
                except Exception as cleanup_error:
                    print(f"[execute_workflow_for_scheduled_task] 清理浏览器资源失败: {cleanup_error}")
            
            # 判断执行状态
            is_success = result.status.value == 'completed'
            is_stopped = result.status.value == 'stopped'

            # 记录执行历史 + 失败告警（异常隔离）
            try:
                from app.services.execution_history import record_run as _record_run
                from app.services.alert_center import dispatch_alert as _dispatch_alert
                _rec = _record_run(
                    workflow_name=getattr(workflow, 'name', '') or workflow_filename,
                    workflow_id=getattr(workflow, 'id', '') or '',
                    status=result.status.value,
                    executed_nodes=result.executed_nodes,
                    failed_nodes=result.failed_nodes,
                    error=('' if is_success else (result.error_message or '执行失败')),
                    source='scheduled',
                )
                _dispatch_alert(_rec)
            except Exception as _he:
                print(f"[ScheduledTask] 记录执行历史/告警失败: {_he}")

            return {
                'success': is_success,
                'stopped': is_stopped,
                'error': None if is_success else (result.error_message or '执行失败'),
                'executed_nodes': result.executed_nodes,
                'failed_nodes': result.failed_nodes,
                'collected_data': collected_data,
                'full_logs': full_logs,
                'executor': executor
            }
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            
            # 清理执行器
            if workflow_filename in executions_store:
                del executions_store[workflow_filename]
            
            # 清理浏览器资源（即使出错也要清理）
            if executor:
                try:
                    await executor.cleanup()
                    print(f"[execute_workflow_for_scheduled_task] 已清理浏览器资源（异常情况）")
                except Exception as cleanup_error:
                    print(f"[execute_workflow_for_scheduled_task] 清理浏览器资源失败: {cleanup_error}")
            
            return {
                'success': False,
                'error': str(e),
                'executed_nodes': 0,
                'failed_nodes': 0,
                'collected_data': [],
                'full_logs': [],
                'executor': executor
            }
    
    scheduled_task_manager.set_workflow_executor(execute_workflow_for_scheduled_task)
    print("[ScheduledTaskManager] 工作流执行器已初始化")


@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭时清理资源"""
    from app.services.global_hotkey import get_hotkey_service
    hotkey_service = get_hotkey_service()
    hotkey_service.stop()


# 当前活动的工作流ID（用于热键控制）
current_workflow_id: str | None = None


def set_current_workflow_id(workflow_id: str | None):
    """设置当前活动的工作流ID"""
    global current_workflow_id
    current_workflow_id = workflow_id


async def on_hotkey_run_workflow():
    """热键触发运行工作流"""
    global current_workflow_id
    
    print(f"[GlobalHotkey] on_hotkey_run_workflow 被调用")
    print(f"[GlobalHotkey] 当前工作流ID: {current_workflow_id}")
    
    if not current_workflow_id:
        print("[GlobalHotkey] 没有活动的工作流")
        await sio.emit('hotkey:no_workflow', {})
        return
    
    # 通知前端执行工作流
    print(f"[GlobalHotkey] 触发运行工作流: {current_workflow_id}")
    try:
        await sio.emit('hotkey:run_workflow', {'workflowId': current_workflow_id})
        print("[GlobalHotkey] 已发送 hotkey:run_workflow 事件到前端")
    except Exception as e:
        print(f"[GlobalHotkey] 发送运行事件失败: {e}")
        import traceback
        traceback.print_exc()


async def on_hotkey_stop_workflow():
    """热键触发停止工作流"""
    global current_workflow_id
    
    print(f"[GlobalHotkey] on_hotkey_stop_workflow 被调用")
    
    if not current_workflow_id:
        print("[GlobalHotkey] 没有活动的工作流")
        return
    
    # 通知前端停止工作流
    print(f"[GlobalHotkey] 触发停止工作流")
    try:
        await sio.emit('hotkey:stop_workflow', {'workflowId': current_workflow_id})
        print("[GlobalHotkey] 已发送 hotkey:stop_workflow 事件到前端")
    except Exception as e:
        print(f"[GlobalHotkey] 发送停止事件失败: {e}")
        import traceback
        traceback.print_exc()


async def on_hotkey_macro_start():
    """热键触发开始录制宏 (F9)"""
    print("[GlobalHotkey] on_hotkey_macro_start 被调用")
    # 通知前端开始录制宏
    try:
        await sio.emit('hotkey:macro_start', {})
        print("[GlobalHotkey] 已发送 hotkey:macro_start 事件到前端")
    except Exception as e:
        print(f"[GlobalHotkey] 发送宏录制开始事件失败: {e}")
        import traceback
        traceback.print_exc()


async def on_hotkey_macro_stop():
    """热键触发停止录制宏 (F10)"""
    print("[GlobalHotkey] on_hotkey_macro_stop 被调用")
    # 通知前端停止录制宏
    try:
        await sio.emit('hotkey:macro_stop', {})
        print("[GlobalHotkey] 已发送 hotkey:macro_stop 事件到前端")
    except Exception as e:
        print(f"[GlobalHotkey] 发送宏录制停止事件失败: {e}")
        import traceback
        traceback.print_exc()


async def on_hotkey_screenshot():
    """热键触发截图 (Ctrl+Shift+F12)"""
    print("[GlobalHotkey] on_hotkey_screenshot 被调用")
    print(f"[GlobalHotkey] Socket.IO 实例存在: {sio is not None}")
    # 通知前端执行截图
    try:
        await sio.emit('hotkey:screenshot', {})
        print("[GlobalHotkey] 已发送 hotkey:screenshot 事件到前端")
    except Exception as e:
        print(f"[GlobalHotkey] 发送截图事件失败: {e}")
        import traceback
        traceback.print_exc()


# Socket.IO事件处理
@sio.event
async def connect(sid, environ):
    """客户端连接事件"""
    print(f"[Socket.IO] 客户端已连接: {sid}")
    # 打印连接信息用于调试
    origin = environ.get('HTTP_ORIGIN', 'unknown')
    print(f"[Socket.IO] 连接来源: {origin}")
    # 默认启用日志推送，由前端通过 set_verbose_log 事件细粒度控制
    set_log_enabled(sid, True)
    return True  # 明确返回True表示接受连接


@sio.event
async def disconnect(sid):
    """客户端断开连接事件"""
    print(f"[Socket.IO] 客户端已断开: {sid}")
    # 清理该客户端的日志开关状态
    remove_log_enabled(sid)


@sio.event
async def execution_stop(sid, data):
    """处理停止执行请求"""
    workflow_id = data.get('workflowId')
    if workflow_id:
        # 先清理所有等待中的事件，让阻塞的线程能够退出
        clear_all_pending_events()
        
        from app.api.workflows import executions_store
        executor = executions_store.get(workflow_id)
        if executor and executor.is_running:
            await executor.stop()


@sio.event
async def set_verbose_log(sid, data):
    """处理详细日志开关设置"""
    enabled = data.get('enabled', False)
    set_log_enabled(sid, enabled)
    print(f"Client {sid} set verbose_log to {enabled}")


@sio.event
async def ai_client_action_ack(sid, data):
    """AI 助手 client_action 真实执行结果回执（前端 → 后端）"""
    try:
        from app.services.ai_assistant_service import resolve_client_action
        tool_call_id = data.get('tool_call_id')
        result = data.get('result') or {}
        if tool_call_id:
            ok = resolve_client_action(tool_call_id, result)
            print(f"[Socket] ai_client_action_ack: tool_call_id={tool_call_id}, success={result.get('success')}, resolved={ok}")
    except Exception as e:
        print(f"[Socket] ai_client_action_ack 处理失败: {e}")


@sio.event
async def set_current_workflow(sid, data):
    """设置当前活动的工作流ID（用于热键控制）"""
    workflow_id = data.get('workflowId')
    print(f"[Socket] 收到 set_current_workflow 事件: workflowId={workflow_id}, 来自客户端: {sid}")
    set_current_workflow_id(workflow_id)
    print(f"[GlobalHotkey] 当前工作流已设置: {workflow_id} (来自客户端: {sid})")


def clear_all_pending_events():
    """清理所有等待中的事件，用于停止执行时释放阻塞的线程"""
    # 清理输入弹窗事件
    with input_prompt_lock:
        for event in input_prompt_events.values():
            event.set()
        input_prompt_events.clear()
        input_prompt_results.clear()
    
    # 清理语音合成事件
    with tts_lock:
        for event in tts_events.values():
            event.set()
        tts_events.clear()
        tts_results.clear()
    
    # 清理JS脚本事件
    with js_script_lock:
        for event in js_script_events.values():
            event.set()
        js_script_events.clear()
        js_script_results.clear()
    
    # 清理播放音乐事件
    with play_music_lock:
        for event in play_music_events.values():
            event.set()
        play_music_events.clear()
        play_music_results.clear()
    
    # 清理播放视频事件
    with play_video_lock:
        for event in play_video_events.values():
            event.set()
        play_video_events.clear()
        play_video_results.clear()
    
    # 清理查看图片事件
    with view_image_lock:
        for event in view_image_events.values():
            event.set()
        view_image_events.clear()
        view_image_results.clear()


# 存储输入弹窗的等待事件（使用线程安全的Event）
input_prompt_events: dict[str, threading.Event] = {}
input_prompt_results: dict[str, str | None] = {}
input_prompt_lock = threading.Lock()

# 存储语音合成的等待事件
tts_events: dict[str, threading.Event] = {}
tts_results: dict[str, bool] = {}
tts_lock = threading.Lock()

# 存储JS脚本执行的等待事件
js_script_events: dict[str, threading.Event] = {}
js_script_results: dict[str, dict] = {}
js_script_lock = threading.Lock()

# 存储播放音乐的等待事件
play_music_events: dict[str, threading.Event] = {}
play_music_results: dict[str, dict] = {}
play_music_lock = threading.Lock()

# 存储播放视频的等待事件
play_video_events: dict[str, threading.Event] = {}
play_video_results: dict[str, dict] = {}
play_video_lock = threading.Lock()

# 存储查看图片的等待事件
view_image_events: dict[str, threading.Event] = {}
view_image_results: dict[str, dict] = {}
view_image_lock = threading.Lock()

# 存储主事件循环引用
main_loop: asyncio.AbstractEventLoop | None = None


def set_main_loop(loop: asyncio.AbstractEventLoop):
    """设置主事件循环引用"""
    global main_loop
    main_loop = loop


@sio.event
async def input_prompt_result(sid, data):
    """处理输入弹窗结果"""
    request_id = data.get('requestId')
    value = data.get('value')
    
    if request_id:
        with input_prompt_lock:
            input_prompt_results[request_id] = value
            if request_id in input_prompt_events:
                input_prompt_events[request_id].set()


@sio.event
async def tts_result(sid, data):
    """处理语音合成结果"""
    request_id = data.get('requestId')
    success = data.get('success', False)
    
    if request_id:
        with tts_lock:
            tts_results[request_id] = success
            if request_id in tts_events:
                tts_events[request_id].set()


@sio.event
async def js_script_result(sid, data):
    """处理JS脚本执行结果"""
    request_id = data.get('requestId')
    
    if request_id:
        with js_script_lock:
            js_script_results[request_id] = {
                'success': data.get('success', False),
                'result': data.get('result'),
                'error': data.get('error'),
                'variables': data.get('variables'),  # 接收修改后的变量对象
            }
            if request_id in js_script_events:
                js_script_events[request_id].set()


@sio.event
async def play_music_result(sid, data):
    """处理播放音乐结果"""
    request_id = data.get('requestId')
    
    if request_id:
        with play_music_lock:
            play_music_results[request_id] = {
                'success': data.get('success', False),
                'error': data.get('error'),
            }
            if request_id in play_music_events:
                play_music_events[request_id].set()


@sio.event
async def play_video_result(sid, data):
    """处理播放视频结果"""
    request_id = data.get('requestId')
    
    if request_id:
        with play_video_lock:
            play_video_results[request_id] = {
                'success': data.get('success', False),
                'error': data.get('error'),
            }
            if request_id in play_video_events:
                play_video_events[request_id].set()


@sio.event
async def view_image_result(sid, data):
    """处理查看图片结果"""
    request_id = data.get('requestId')
    
    if request_id:
        with view_image_lock:
            view_image_results[request_id] = {
                'success': data.get('success', False),
                'error': data.get('error'),
            }
            if request_id in view_image_events:
                view_image_events[request_id].set()


def request_input_prompt_sync(
    variable_name: str, 
    title: str, 
    message: str, 
    default_value: str, 
    input_mode: str = 'single',
    min_value: float | None = None,
    max_value: float | None = None,
    max_length: int | None = None,
    required: bool = True,
    select_options: list | None = None,
    timeout: float = 300
) -> str | None:
    """同步请求前端弹出输入框并等待结果（可在工作线程中调用）"""
    request_id = str(uuid.uuid4())
    
    # 创建线程安全的等待事件
    event = threading.Event()
    with input_prompt_lock:
        input_prompt_events[request_id] = event
    
    # 在主事件循环中发送WebSocket消息
    if main_loop is not None:
        asyncio.run_coroutine_threadsafe(
            sio.emit('execution:input_prompt', {
                'requestId': request_id,
                'variableName': variable_name,
                'title': title,
                'message': message,
                'defaultValue': default_value,
                'inputMode': input_mode,
                'minValue': min_value,
                'maxValue': max_value,
                'maxLength': max_length,
                'required': required,
                'selectOptions': select_options,
            }),
            main_loop
        )
    
    try:
        # 等待用户输入（带超时）
        if event.wait(timeout=timeout):
            with input_prompt_lock:
                result = input_prompt_results.get(request_id)
            return result
        return None
    finally:
        # 清理
        with input_prompt_lock:
            input_prompt_events.pop(request_id, None)
            input_prompt_results.pop(request_id, None)


def request_tts_sync(text: str, lang: str, rate: float, pitch: float, volume: float, timeout: float = 60) -> bool:
    """同步请求前端执行语音合成并等待完成（可在工作线程中调用）"""
    request_id = str(uuid.uuid4())
    
    # 创建线程安全的等待事件
    event = threading.Event()
    with tts_lock:
        tts_events[request_id] = event
    
    # 在主事件循环中发送WebSocket消息
    if main_loop is not None:
        asyncio.run_coroutine_threadsafe(
            sio.emit('execution:tts_request', {
                'requestId': request_id,
                'text': text,
                'lang': lang,
                'rate': rate,
                'pitch': pitch,
                'volume': volume,
            }),
            main_loop
        )
    
    try:
        # 等待语音合成完成（带超时）
        if event.wait(timeout=timeout):
            with tts_lock:
                result = tts_results.get(request_id, False)
            return result
        return False
    finally:
        # 清理
        with tts_lock:
            tts_events.pop(request_id, None)
            tts_results.pop(request_id, None)


def request_js_script_sync(code: str, variables: dict, timeout: float = 30) -> dict:
    """同步请求前端执行JS脚本并等待结果（可在工作线程中调用）"""
    request_id = str(uuid.uuid4())
    
    # 创建线程安全的等待事件
    event = threading.Event()
    with js_script_lock:
        js_script_events[request_id] = event
    
    # 在主事件循环中发送WebSocket消息
    if main_loop is not None:
        asyncio.run_coroutine_threadsafe(
            sio.emit('execution:js_script', {
                'requestId': request_id,
                'code': code,
                'variables': variables,
            }),
            main_loop
        )
    
    try:
        # 等待脚本执行完成（带超时）
        if event.wait(timeout=timeout):
            with js_script_lock:
                result = js_script_results.get(request_id, {'success': False, 'error': '未知错误'})
            return result
        return {'success': False, 'error': f'脚本执行超时 ({timeout}秒)'}
    finally:
        # 清理
        with js_script_lock:
            js_script_events.pop(request_id, None)
            js_script_results.pop(request_id, None)


def request_play_music_sync(audio_url: str, wait_for_end: bool, timeout: float = 600) -> dict:
    """同步请求前端播放音乐（可在工作线程中调用）"""
    request_id = str(uuid.uuid4())
    
    # 创建线程安全的等待事件
    event = threading.Event()
    with play_music_lock:
        play_music_events[request_id] = event
    
    # 在主事件循环中发送WebSocket消息
    if main_loop is not None:
        asyncio.run_coroutine_threadsafe(
            sio.emit('execution:play_music', {
                'requestId': request_id,
                'audioUrl': audio_url,
                'waitForEnd': wait_for_end,
            }),
            main_loop
        )
    
    try:
        # 等待播放完成（带超时）
        if event.wait(timeout=timeout):
            with play_music_lock:
                result = play_music_results.get(request_id, {'success': False, 'error': '未知错误'})
            return result
        return {'success': False, 'error': f'播放超时 ({timeout}秒)'}
    finally:
        # 清理
        with play_music_lock:
            play_music_events.pop(request_id, None)
            play_music_results.pop(request_id, None)


def request_play_video_sync(video_url: str, wait_for_end: bool, timeout: float = 600) -> dict:
    """同步请求前端播放视频（可在工作线程中调用）"""
    request_id = str(uuid.uuid4())
    
    # 创建线程安全的等待事件
    event = threading.Event()
    with play_video_lock:
        play_video_events[request_id] = event
    
    # 在主事件循环中发送WebSocket消息
    if main_loop is not None:
        asyncio.run_coroutine_threadsafe(
            sio.emit('execution:play_video', {
                'requestId': request_id,
                'videoUrl': video_url,
                'waitForEnd': wait_for_end,
            }),
            main_loop
        )
    
    try:
        # 等待播放完成（带超时）
        if event.wait(timeout=timeout):
            with play_video_lock:
                result = play_video_results.get(request_id, {'success': False, 'error': '未知错误'})
            return result
        return {'success': False, 'error': f'播放超时 ({timeout}秒)'}
    finally:
        # 清理
        with play_video_lock:
            play_video_events.pop(request_id, None)
            play_video_results.pop(request_id, None)


def request_view_image_sync(image_url: str, auto_close: bool, display_time: int, timeout: float = 300) -> dict:
    """同步请求前端查看图片（可在工作线程中调用）"""
    request_id = str(uuid.uuid4())
    
    # 创建线程安全的等待事件
    event = threading.Event()
    with view_image_lock:
        view_image_events[request_id] = event
    
    # 在主事件循环中发送WebSocket消息
    if main_loop is not None:
        asyncio.run_coroutine_threadsafe(
            sio.emit('execution:view_image', {
                'requestId': request_id,
                'imageUrl': image_url,
                'autoClose': auto_close,
                'displayTime': display_time,
            }),
            main_loop
        )
    
    try:
        # 等待查看完成（带超时）
        if event.wait(timeout=timeout):
            with view_image_lock:
                result = view_image_results.get(request_id, {'success': False, 'error': '未知错误'})
            return result
        return {'success': False, 'error': f'查看超时 ({timeout}秒)'}
    finally:
        # 清理
        with view_image_lock:
            view_image_events.pop(request_id, None)
            view_image_results.pop(request_id, None)


# 导出socket_app作为ASGI应用
def get_app():
    return socket_app
