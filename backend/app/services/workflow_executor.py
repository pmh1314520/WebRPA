"""工作流执行器 - 异步版本，支持真正的并行执行"""
import asyncio
import time
from datetime import datetime
from typing import Optional, Callable, Awaitable
from uuid import uuid4

from app.models.workflow import (
    Workflow,
    WorkflowNode,
    ExecutionResult,
    ExecutionStatus,
    LogLevel,
    LogEntry,
)
from app.executors import ExecutionContext, ModuleResult, registry
from app.services.workflow_parser import WorkflowParser, ExecutionGraph


# 模块默认超时时间配置（毫秒）
# 根据模块实际使用场景设置合理的默认超时
# 超时为0表示不限制超时（非阻塞或需要用户交互的模块）
MODULE_DEFAULT_TIMEOUTS = {
    # 浏览器操作 - 网页加载可能较慢
    'open_page': 60000,        # 60秒
    'use_opened_page': 60000,  # 60秒
    'click_element': 60000,    # 60秒
    'hover_element': 60000,    # 60秒
    'input_text': 60000,       # 60秒
    'get_element_info': 60000, # 60秒
    'wait': 0,                 # 固定等待不需要超时（由模块内部控制）
    'wait_element': 60000,     # 60秒
    'close_page': 10000,       # 10秒
    'refresh_page': 60000,     # 60秒
    'go_back': 60000,          # 60秒
    'go_forward': 60000,       # 60秒
    'handle_dialog': 60000,    # 60秒
    # 表单操作
    'select_dropdown': 60000,  # 60秒
    'set_checkbox': 60000,     # 60秒
    'drag_element': 60000,     # 60秒
    'scroll_page': 60000,      # 60秒
    'upload_file': 120000,     # 2分钟
    # 数据处理 - 通常很快
    'set_variable': 5000,      # 5秒
    'json_parse': 5000,        # 5秒
    'base64': 10000,           # 10秒
    'random_number': 5000,     # 5秒
    'get_time': 5000,          # 5秒
    'download_file': 300000,   # 5分钟
    'save_image': 60000,       # 1分钟
    'screenshot': 60000,       # 60秒
    'read_excel': 60000,       # 1分钟
    # 字符串操作 - 很快
    'regex_extract': 10000,    # 10秒
    'string_replace': 5000,    # 5秒
    'string_split': 5000,      # 5秒
    'string_join': 5000,       # 5秒
    'string_concat': 5000,     # 5秒
    'string_trim': 5000,       # 5秒
    'string_case': 5000,       # 5秒
    'string_substring': 5000,  # 5秒
    # 列表/字典操作 - 很快
    'list_operation': 10000,   # 10秒
    'list_get': 5000,          # 5秒
    'list_length': 5000,       # 5秒
    'list_export': 60000,      # 1分钟（导出可能较慢）
    'dict_operation': 10000,   # 10秒
    'dict_get': 5000,          # 5秒
    'dict_keys': 5000,         # 5秒
    # 数据表格操作
    'table_add_row': 5000,     # 5秒
    'table_add_column': 5000,  # 5秒
    'table_set_cell': 5000,    # 5秒
    'table_get_cell': 5000,    # 5秒
    'table_delete_row': 5000,  # 5秒
    'table_clear': 5000,       # 5秒
    'table_export': 60000,     # 1分钟
    # 数据库操作
    'db_connect': 60000,       # 60秒
    'db_query': 120000,        # 2分钟
    'db_execute': 120000,      # 2分钟
    'db_insert': 60000,        # 1分钟
    'db_update': 60000,        # 1分钟
    'db_delete': 60000,        # 1分钟
    'db_close': 10000,         # 10秒
    # 网络请求
    'api_request': 120000,     # 2分钟
    'send_email': 60000,       # 1分钟
    # AI能力 - 需要较长时间
    'ai_chat': 180000,         # 3分钟
    'ai_vision': 180000,       # 3分钟
    # 验证码
    'ocr_captcha': 60000,      # 1分钟
    'slider_captcha': 60000,   # 1分钟
    # 流程控制 - 不超时（由内部逻辑控制）
    'condition': 5000,         # 5秒
    'assert_checkpoint': 30000, # 30秒（元素断言可能需等待）
    'loop': 0,                 # 循环本身不超时
    'foreach': 0,              # 遍历本身不超时
    'infinite_loop': 0,        # 无限循环本身不超时
    'foreach_dict': 0,         # 遍历字典本身不超时
    'break_loop': 5000,        # 5秒
    'continue_loop': 5000,     # 5秒
    'stop_workflow': 5000,     # 5秒
    'scheduled_task': 0,       # 定时任务不超时
    'subflow': 0,              # 子流程不超时
    # 辅助工具
    'print_log': 5000,         # 5秒
    'play_sound': 10000,       # 10秒
    'system_notification': 5000, # 5秒
    'play_music': 0,           # 不超时（阻塞型，等待用户关闭）
    'play_video': 0,           # 不超时（阻塞型，等待用户关闭）
    'view_image': 0,           # 不超时（阻塞型，等待用户关闭）
    'input_prompt': 0,         # 不超时（阻塞型，等待用户输入）
    'text_to_speech': 120000,  # 2分钟
    'js_script': 60000,        # 1分钟
    'set_clipboard': 5000,     # 5秒
    'get_clipboard': 5000,     # 5秒
    'keyboard_action': 10000,  # 10秒
    'real_mouse_scroll': 10000,# 10秒
    # 系统操作
    'shutdown_system': 60000,  # 60秒
    'lock_screen': 10000,      # 10秒
    'window_focus': 10000,     # 10秒
    'real_mouse_click': 10000, # 10秒
    'real_mouse_move': 10000,  # 10秒
    'real_mouse_drag': 10000,  # 10秒
    'real_keyboard': 60000,    # 60秒
    'run_command': 300000,     # 5分钟
    'click_image': 60000,      # 1分钟
    'click_text': 120000,      # 2分钟（OCR识别较慢，首次需要下载模型）
    'hover_image': 60000,      # 1分钟
    'hover_text': 120000,      # 2分钟（OCR识别较慢）
    'drag_image': 60000,       # 1分钟
    'get_mouse_position': 5000,# 5秒
    'screenshot_screen': 10000,# 10秒
    'ai_vision_act': 120000,   # 120秒（视觉模型推理较慢）
    'rename_file': 10000,      # 10秒
    'network_capture': 0,      # 不超时（非阻塞，后台运行）
    'macro_recorder': 0,       # 不超时（宏播放时间由用户录制内容决定）
    # 网络共享 - 非阻塞（启动服务后立即返回）
    'share_folder': 10000,     # 10秒（启动服务）
    'share_file': 10000,       # 10秒（启动服务）
    'stop_share': 5000,        # 5秒
    # 屏幕共享 - 非阻塞（启动服务后立即返回）
    'start_screen_share': 10000,  # 10秒（启动服务）
    'stop_screen_share': 5000,    # 5秒
    # 文件操作
    'list_files': 60000,       # 60秒
    'copy_file': 300000,       # 5分钟
    'move_file': 300000,       # 5分钟
    'delete_file': 60000,      # 60秒
    'create_folder': 10000,    # 10秒
    'file_exists': 5000,       # 5秒
    'get_file_info': 10000,    # 10秒
    'read_text_file': 60000,   # 1分钟
    'write_text_file': 60000,  # 1分钟
    'rename_folder': 10000,    # 10秒
    # 媒体处理 - FFmpeg操作耗时
    'format_convert': 600000,  # 10分钟
    'compress_image': 120000,  # 2分钟
    'compress_video': 1800000, # 30分钟
    'extract_audio': 300000,   # 5分钟
    'trim_video': 600000,      # 10分钟
    'merge_media': 1800000,    # 30分钟
    'add_watermark': 600000,   # 10分钟
    'download_m3u8': 1800000,  # 30分钟（下载可能很慢）
    'rotate_video': 600000,    # 10分钟
    'video_speed': 600000,     # 10分钟
    'extract_frame': 60000,    # 1分钟
    'add_subtitle': 600000,    # 10分钟
    'adjust_volume': 300000,   # 5分钟
    'resize_video': 600000,    # 10分钟
    # 图像处理
    'image_grayscale': 60000,  # 1分钟
    'image_round_corners': 60000, # 1分钟
    # 音频处理
    'audio_to_text': 300000,   # 5分钟（语音识别可能较慢）
    # 二维码
    'qr_generate': 10000,      # 10秒
    'qr_decode': 60000,        # 60秒
    # 录屏 - 非阻塞（启动后立即返回，后台录制）
    'screen_record': 10000,    # 10秒（启动录屏）
    # AI识别
    'face_recognition': 60000, # 1分钟
    'image_ocr': 60000,        # 1分钟
    # PDF处理
    'pdf_to_images': 300000,   # 5分钟
    'images_to_pdf': 300000,   # 5分钟
    'pdf_merge': 300000,       # 5分钟
    'pdf_split': 300000,       # 5分钟
    'pdf_extract_text': 120000,# 2分钟
    'pdf_extract_images': 300000, # 5分钟
    'pdf_encrypt': 60000,      # 1分钟
    'pdf_decrypt': 60000,      # 1分钟
    'pdf_add_watermark': 300000, # 5分钟
    'pdf_rotate': 120000,      # 2分钟
    'pdf_delete_pages': 120000,# 2分钟
    'pdf_get_info': 60000,     # 60秒
    'pdf_compress': 600000,    # 10分钟
    'pdf_insert_pages': 300000,# 5分钟
    'pdf_reorder_pages': 120000, # 2分钟
    'pdf_to_word': 600000,     # 10分钟
    # 其他
    'export_log': 60000,       # 60秒
    # 触发器模块 - 不超时（等待事件触发）
    'webhook_trigger': 0,      # 不超时（等待webhook请求）
    'hotkey_trigger': 0,       # 不超时（等待热键触发）
    'file_watcher_trigger': 0, # 不超时（等待文件变化）
    'email_trigger': 0,        # 不超时（等待邮件）
    'api_trigger': 0,          # 不超时（等待API请求）
    'mouse_trigger': 0,        # 不超时（等待鼠标事件）
    'image_trigger': 0,        # 不超时（等待图像出现）
    'sound_trigger': 0,        # 不超时（等待声音）
    'face_trigger': 0,         # 不超时（等待人脸）
    'element_change_trigger': 0, # 不超时（等待元素变化）
    # QQ自动化
    'qq_wait_message': 0,      # 不超时（阻塞型，等待消息）
    'qq_send_message': 60000,  # 60秒
    'qq_send_image': 60000,    # 1分钟
    'qq_send_file': 120000,    # 2分钟
    'qq_get_friends': 60000,   # 60秒
    'qq_get_groups': 60000,    # 60秒
    'qq_get_group_members': 60000, # 60秒
    'qq_get_login_info': 10000,# 10秒
    # 微信自动化
    'wechat_wait_message': 0,  # 不超时（阻塞型，等待消息）
    'wechat_send_message': 60000,  # 60秒
    'wechat_send_file': 120000,    # 2分钟
    'wechat_get_messages': 60000,  # 60秒
    'wechat_get_sessions': 60000,  # 60秒
    'wechat_get_login_info': 10000,# 10秒
    # 分组/备注 - 不执行
    'group': 0,
    'note': 0,
}


def get_module_default_timeout(module_type: str) -> int:
    """获取模块默认超时时间（毫秒）"""
    return MODULE_DEFAULT_TIMEOUTS.get(module_type, 60000)  # 默认60秒，避免30秒超时过短


class WorkflowExecutor:
    """工作流执行器 - 使用异步Playwright实现真正的并行执行"""
    
    def __init__(
        self,
        workflow: Workflow,
        on_log: Optional[Callable[[LogEntry], Awaitable[None]]] = None,
        on_node_start: Optional[Callable[[str], Awaitable[None]]] = None,
        on_node_complete: Optional[Callable[[str, ModuleResult], Awaitable[None]]] = None,
        on_variable_update: Optional[Callable[[str, any], Awaitable[None]]] = None,
        on_data_row: Optional[Callable[[dict], Awaitable[None]]] = None,
        headless: bool = False,
        browser_config: Optional[dict] = None,
    ):
        self.workflow = workflow
        self.on_log = on_log
        self.on_node_start = on_node_start
        self.on_node_complete = on_node_complete
        self.on_variable_update = on_variable_update
        self.on_data_row = on_data_row
        self.headless = headless
        self.browser_config = browser_config
        
        self.context = ExecutionContext(headless=headless, browser_config=browser_config)
        
        # 尝试绑定全局已启动的浏览器会话
        self._try_bind_global_browser()
        
        self._setup_progress_callback()
        self.graph: Optional[ExecutionGraph] = None
        self.is_running = False
        self.should_stop = False
        
        self.executed_nodes = 0
        self.failed_nodes = 0
        self.start_time: Optional[datetime] = None
        
        self._result: Optional[ExecutionResult] = None
        
        # 并行执行相关
        self._executed_node_ids: set[str] = set()
        self._executing_node_ids: set[str] = set()
        self._node_lock = asyncio.Lock()
        self._pending_nodes: dict[str, set[str]] = {}
        # 错误回流（errorPolicy.mode == 'retry-from'）每个失败点已回流重试次数
        self._reflow_counts: dict[str, int] = {}
        self._last_data_rows_count = 0
        self._sent_data_rows_count = 0
        self._running_tasks: set[asyncio.Task] = set()  # 跟踪所有运行中的任务
        # 上次"真实让出事件循环"的时间戳（用于让 socket.io 的 WebSocket 发送协程
        # 有机会把积压的日志/数据包实时写出，避免高速执行时日志全堆到结束才出现）
        self._last_loop_yield = 0.0

        # ===== 可视化调试（断点 / 单步 / 暂停）=====
        # 完全增量：debug_enabled=False 时下面这些不产生任何行为影响
        self.debug_enabled = False
        self.breakpoints: set[str] = set()      # 断点节点 id 集合
        self.step_mode = False                  # 单步模式：每个节点前都暂停
        self.is_paused = False                  # 当前是否处于暂停态
        self.on_paused = None                   # 暂停回调（由 API 层注入，用于推送 socket 事件）
        self.on_resumed = None                  # 恢复回调
        self._resume_event = asyncio.Event()
        self._resume_event.set()                # 默认非暂停

    def configure_debug(self, breakpoints=None, step_mode: bool = False):
        """开启调试：设置断点集合与是否单步。breakpoints 为空且 step_mode=False 时等于不调试。"""
        bps = set(breakpoints or [])
        self.breakpoints = bps
        self.step_mode = bool(step_mode)
        self.debug_enabled = bool(bps) or bool(step_mode)

    def debug_resume(self, step: bool = False):
        """从暂停态继续。step=True 表示只走一步（到下一个节点再暂停）。"""
        if step:
            self.step_mode = True
            self.debug_enabled = True
        else:
            self.step_mode = False
        try:
            self._resume_event.set()
        except Exception:
            pass

    def set_breakpoints(self, breakpoints):
        """运行中动态更新断点集合。"""
        self.breakpoints = set(breakpoints or [])
        if self.breakpoints:
            self.debug_enabled = True

    async def _maybe_pause(self, node):
        """调试闸门：命中断点或单步模式时暂停，等待 resume。不调试时立即返回（零开销）。"""
        if not self.debug_enabled:
            return
        if self.should_stop or self.context.stop_workflow:
            return
        node_id = getattr(node, 'id', None)
        hit = (node_id in self.breakpoints) or self.step_mode
        if not hit:
            return
        self.is_paused = True
        self._resume_event.clear()
        label = getattr(node, 'data', {}).get('label') if hasattr(node, 'data') else None
        try:
            if self.on_paused:
                snapshot = {}
                try:
                    snapshot = dict(self.context.variables)
                except Exception:
                    snapshot = {}
                await self.on_paused({
                    'node_id': node_id,
                    'label': label or node_id,
                    'variables': snapshot,
                    'reason': 'breakpoint' if (node_id in self.breakpoints) else 'step',
                })
        except Exception:
            pass
        # 等待外部 resume / step
        await self._resume_event.wait()
        self.is_paused = False
        try:
            if self.on_resumed:
                await self.on_resumed({'node_id': node_id})
        except Exception:
            pass

    def _try_bind_global_browser(self):
        """尝试绑定全局已启动的浏览器会话"""
        try:
            from app.services.browser_manager import is_browser_open, get_browser_proc
            
            if is_browser_open():
                # 浏览器已启动，标记一下（实际连接会在执行时通过 Playwright 进行）
                print("[WorkflowExecutor] 检测到全局浏览器已启动，工作流将使用该浏览器")
                # 这里我们只是标记，实际的 Playwright 连接会在模块执行时进行
                # 因为浏览器是通过子进程启动的，需要通过 Playwright 的连接机制
        except Exception as e:
            print(f"[WorkflowExecutor] 绑定全局浏览器失败: {e}")

    def _setup_progress_callback(self):
        """设置进度回调，让模块执行器可以发送进度日志"""
        async def progress_callback(message: str, level: str = "info"):
            level_map = {
                'debug': LogLevel.DEBUG,
                'info': LogLevel.INFO,
                'warning': LogLevel.WARNING,
                'error': LogLevel.ERROR,
                'success': LogLevel.SUCCESS
            }
            log_level = level_map.get(level, LogLevel.INFO)
            await self._log(log_level, message, is_system_log=True)
        
        self.context._progress_callback = progress_callback
        
        # 设置变量更新回调
        async def variable_update_callback(name: str, value: any):
            await self._notify_variable_update(name, value)
        
        self.context._variable_update_callback = variable_update_callback

        # 设置实时日志回调：让执行器直接调用的 context.add_log(...) 也能实时推送到前端，
        # 而不是等工作流执行结束后才一次性出现。
        level_map_rt = {
            'debug': LogLevel.DEBUG,
            'info': LogLevel.INFO,
            'warning': LogLevel.WARNING,
            'error': LogLevel.ERROR,
            'success': LogLevel.SUCCESS,
        }

        def realtime_log_callback(level_str, message, node_id, duration, timestamp_str):
            if not self.on_log:
                return
            log_level = level_map_rt.get(str(level_str), LogLevel.INFO)
            entry = LogEntry(
                id=str(uuid4()),
                timestamp=datetime.now(),
                level=log_level,
                node_id=node_id,
                message=message,
                details={'is_user_log': False, 'is_system_log': True},
                duration=duration,
            )
            try:
                loop = asyncio.get_running_loop()
                task = loop.create_task(self.on_log(entry))
                # 防止任务被 GC
                self.context._pending_callback_tasks.add(task)
                task.add_done_callback(self.context._pending_callback_tasks.discard)
            except RuntimeError:
                # 不在事件循环线程时无法实时推送，日志已存入 _logs 不会丢失
                pass

        self.context._realtime_log_callback = realtime_log_callback

    async def _log(self, level: LogLevel, message: str, node_id: Optional[str] = None, 
                   details: Optional[dict] = None, duration: Optional[float] = None,
                   is_user_log: bool = False, is_system_log: bool = False):
        """记录日志"""
        log_details = details.copy() if details else {}
        log_details['is_user_log'] = is_user_log
        log_details['is_system_log'] = is_system_log
        
        entry = LogEntry(
            id=str(uuid4()),
            timestamp=datetime.now(),
            level=level,
            node_id=node_id,
            message=message,
            details=log_details,
            duration=duration,
        )
        
        # 同时存储到 context._logs 中（用于导出日志模块）
        level_str = level.value if hasattr(level, 'value') else str(level)
        timestamp_str = entry.timestamp.strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
        self.context.add_log(
            level=level_str,
            message=message,
            node_id=node_id,
            duration=duration,
            timestamp=timestamp_str,
            emit_realtime=False,  # _log 自己已通过 on_log 实时推送，避免重复
        )
        
        if self.on_log:
            try:
                await self.on_log(entry)
                # 让 socket.io 的 WebSocket 发送协程有机会把这条日志真正写出到前端。
                # 注意：单纯的 await asyncio.sleep(0) 在高速执行时会被繁忙的工作流任务
                # 持续插队，发送协程拿不到真正的时间片，导致日志积压到工作流结束才一次性
                # 出现。这里做“节流的真实让出”：最多每 ~25ms 真正 sleep 一小段，既保证
                # 日志近实时滚动，又不会给大型工作流增加明显耗时。
                await self._yield_to_event_loop()
            except Exception as e:
                print(f"发送日志失败: {e}")

    async def _yield_to_event_loop(self):
        """节流地把控制权真正交还事件循环，确保实时日志/数据能被即时发送到前端。"""
        try:
            now = time.monotonic()
            if now - self._last_loop_yield >= 0.025:
                self._last_loop_yield = now
                # 真实 sleep 一小段，触发事件循环的 I/O 轮询，冲刷 WebSocket 发送队列
                await asyncio.sleep(0.003)
            else:
                await asyncio.sleep(0)
        except Exception:
            await asyncio.sleep(0)
    
    async def _send_data_row(self, row_data: dict):
        """发送数据行到前端（实时推送，全量；上限仅作内存安全阀）"""
        MAX_PREVIEW_ROWS = 100000
        if self._sent_data_rows_count >= MAX_PREVIEW_ROWS:
            return
        if self.on_data_row:
            try:
                await self.on_data_row(row_data)
                await self._yield_to_event_loop()
            except Exception as e:
                print(f"发送数据行失败: {e}")
        self._sent_data_rows_count += 1
    
    async def _notify_node_start(self, node_id: str):
        """通知节点开始执行"""
        if self.on_node_start:
            try:
                await self.on_node_start(node_id)
                await self._yield_to_event_loop()
            except Exception as e:
                print(f"通知节点开始失败: {e}")
    
    async def _notify_node_complete(self, node_id: str, result: ModuleResult):
        """通知节点执行完成"""
        if self.on_node_complete:
            try:
                await self.on_node_complete(node_id, result)
            except Exception as e:
                print(f"通知节点完成失败: {e}")
    
    async def _notify_variable_update(self, name: str, value: any):
        """通知变量更新"""
        if self.on_variable_update:
            try:
                await self.on_variable_update(name, value)
            except Exception as e:
                print(f"通知变量更新失败: {e}")

    async def _execute_parallel(self, node_ids: list[str]):
        """并行执行多个节点分支"""
        if not node_ids or self.should_stop:
            return
        
        # 过滤掉子流程节点（如果已经收集了子流程节点列表）
        if hasattr(self, '_subflow_node_ids'):
            filtered_node_ids = [nid for nid in node_ids if nid not in self._subflow_node_ids]
            if len(filtered_node_ids) < len(node_ids):
                skipped = len(node_ids) - len(filtered_node_ids)
                print(f"[DEBUG] 过滤掉 {skipped} 个子流程节点")
            node_ids = filtered_node_ids
        
        if not node_ids:
            return
        
        async with self._node_lock:
            nodes_to_execute = [
                nid for nid in node_ids 
                if nid not in self._executed_node_ids and nid not in self._executing_node_ids
            ]
            if not nodes_to_execute:
                return
            for nid in nodes_to_execute:
                self._executing_node_ids.add(nid)
        
        # 调试：打印要执行的节点
        for nid in nodes_to_execute:
            node = self.graph.get_node(nid)
            if node:
                label = node.data.get('label', node.type)
                print(f"[DEBUG] 准备执行节点: {nid} ({node.type}: {label})")
        
        if len(nodes_to_execute) == 1:
            if self.should_stop:
                return
            task = asyncio.create_task(self._execute_from_node(nodes_to_execute[0]))
            self._running_tasks.add(task)
            try:
                await task
            except asyncio.CancelledError:
                pass
            finally:
                self._running_tasks.discard(task)
        else:
            await self._log(LogLevel.INFO, f"🔀 检测到 {len(nodes_to_execute)} 个分支，并行执行...")
            tasks = []
            for node_id in nodes_to_execute:
                if self.should_stop:
                    break
                task = asyncio.create_task(self._execute_from_node(node_id))
                self._running_tasks.add(task)
                tasks.append(task)
            
            if tasks:
                try:
                    await asyncio.gather(*tasks, return_exceptions=True)
                except asyncio.CancelledError:
                    pass
                finally:
                    for task in tasks:
                        self._running_tasks.discard(task)
            
            if not self.should_stop:
                await self._log(LogLevel.INFO, f"🔀 {len(nodes_to_execute)} 个分支执行完成")
    
    async def _execute_from_node(self, node_id: str):
        """从指定节点开始执行"""
        if self.should_stop:
            return
        
        async with self._node_lock:
            if node_id in self._executed_node_ids:
                return
            self._executing_node_ids.add(node_id)
        
        node = self.graph.get_node(node_id)
        if not node:
            async with self._node_lock:
                self._executing_node_ids.discard(node_id)
            return
        
        # 用 try/finally 保证 _executing_node_ids 在异常时也被释放，
        # 避免 _pending_nodes 死锁等待已死的节点
        result = None
        try:
            result = await self._execute_node(node)
            # 错误策略：原地重试（retry-self）—— 同一节点失败后立即重跑，最多 N 次
            _selfpol = (node.data or {}).get('errorPolicy') or {}
            if _selfpol.get('mode') == 'retry-self' and result and not result.success:
                _maxr = max(0, int(_selfpol.get('maxRetries', 1) or 0))
                _intv = float(_selfpol.get('interval', 0) or 0)
                _att = 0
                while result and not result.success and _att < _maxr and not self.should_stop:
                    _att += 1
                    if _intv > 0:
                        await asyncio.sleep(_intv)
                    await self._log(LogLevel.WARNING, f"⟳ 节点失败，原地重试 ({_att}/{_maxr})", node_id=node_id)
                    result = await self._execute_node(node)
        except Exception:
            # 节点执行抛出未处理异常时，标记为已执行（失败），
            # 但仍然需要从 executing 集合中释放
            async with self._node_lock:
                self._executed_node_ids.add(node_id)
                self._executing_node_ids.discard(node_id)
            raise
        else:
            async with self._node_lock:
                self._executed_node_ids.add(node_id)
                self._executing_node_ids.discard(node_id)
            # 节点成功：清掉它的回流重试计数，便于循环/后续合法重跑时获得新的重试预算
            if result and result.success:
                self._reflow_counts.pop(node_id, None)
        
        if self.should_stop:
            return
        
        if self.context.should_break:
            return
        
        if self.context.should_continue:
            return
        
        if result and result.branch:
            next_nodes = self.graph.get_next_nodes(node_id, result.branch)
        else:
            next_nodes = self.graph.get_next_nodes(node_id)
        
        # 如果节点执行失败，按「错误策略 errorPolicy」处理（回流重试 / 跳过继续），
        # 否则回退到原有的 error 异常处理分支 / 关键节点停止逻辑。
        if result and not result.success:
            _pol = (node.data or {}).get('errorPolicy') or {}
            _mode = _pol.get('mode')
            _continue_after = False  # 置 True 表示策略要求继续往下执行后继
            target = _pol.get('targetId')
            if _mode == 'retry-from' and target and self.graph.get_node(target):
                # 错误回流：回到上层模块，从那里重新往下跑，最多 N 次
                _maxr = max(0, int(_pol.get('maxRetries', 1) or 0))
                _intv = float(_pol.get('interval', 0) or 0)
                _cnt = self._reflow_counts.get(node_id, 0)
                if _cnt < _maxr:
                    self._reflow_counts[node_id] = _cnt + 1
                    seg = self._nodes_between(target, node_id)
                    async with self._node_lock:
                        for nid in seg:
                            self._executed_node_ids.discard(nid)
                            self._executing_node_ids.discard(nid)
                            self._pending_nodes.pop(nid, None)
                    if _intv > 0:
                        await asyncio.sleep(_intv)
                    tgt_label = (self.graph.get_node(target).data or {}).get('label', target)
                    await self._log(LogLevel.WARNING, f"⟲ 节点失败，回流到上层「{tgt_label}」重试 ({_cnt + 1}/{_maxr})", node_id=node_id)
                    await self._execute_parallel([target])
                    return
                else:
                    await self._log(LogLevel.WARNING, f"回流重试 {_maxr} 次仍失败", node_id=node_id)
                    if _pol.get('onExhausted') == 'continue':
                        _continue_after = True
                    else:
                        await self._log(LogLevel.ERROR, "✗ 已达回流重试上限，停止该分支", node_id=node_id)
                        return
            elif _mode == 'continue':
                # 失败跳过：记警告并继续往下执行
                await self._log(LogLevel.WARNING, "⚠️ 节点失败，按策略跳过并继续", node_id=node_id)
                _continue_after = True

            if not _continue_after:
                error_nodes = self.graph.get_error_nodes(node_id)
                if error_nodes:
                    # 有异常处理分支，执行异常处理流程（报错和超时都走这里）
                    timeout_flag = getattr(result, 'is_timeout', False)
                    reason = "超时" if timeout_flag else "报错"
                    print(f"[DEBUG] 节点 {node.type} {reason}，触发异常处理分支")
                    # 若错误连线指向"已执行过的上层节点"，说明用户是想用错误边做
                    # "失败→回到上层模块重新跑"的重试循环（如：点击元素失败→回到打开网页）。
                    # 此时必须重置「目标→失败点」这段路径的已执行标记，否则上层节点会因
                    # 去重而不再执行、循环跑不起来。加重试计数防止无限循环。
                    upstream_targets = [t for t in error_nodes if t in self._executed_node_ids]
                    if upstream_targets:
                        try:
                            _cap = int((node.data or {}).get('maxRetries')
                                       or ((node.data or {}).get('errorPolicy') or {}).get('maxRetries')
                                       or 5)
                        except Exception:
                            _cap = 5
                        _cap = max(1, _cap)
                        _cnt = self._reflow_counts.get(node_id, 0)
                        if _cnt >= _cap:
                            await self._log(LogLevel.ERROR, f"✗ 错误重试已达上限（{_cap} 次），停止该分支", node_id=node_id)
                            return
                        self._reflow_counts[node_id] = _cnt + 1
                        async with self._node_lock:
                            for _t in upstream_targets:
                                for _nid in self._nodes_between(_t, node_id):
                                    self._executed_node_ids.discard(_nid)
                                    self._executing_node_ids.discard(_nid)
                                    self._pending_nodes.pop(_nid, None)
                        await self._log(LogLevel.WARNING, f"⚠️ 节点{reason}，按错误连线回到上层重试 ({_cnt + 1}/{_cap})", node_id=node_id)
                    else:
                        await self._log(LogLevel.WARNING, f"⚠️ 节点{reason}，触发异常处理流程", node_id=node_id)
                    await self._execute_parallel(error_nodes)
                    return
                else:
                    # 没有异常处理分支，对于关键节点停止执行
                    if node.type in ('open_page', 'click_element', 'input_text', 'wait_element', 'select_dropdown'):
                        print(f"[DEBUG] 关键节点 {node.type} 失败，停止后续执行")
                        return
        
        if node.type in ('loop', 'foreach', 'infinite_loop', 'foreach_dict'):
            body_nodes = self.graph.get_loop_body_nodes(node_id)
            done_nodes = self.graph.get_loop_done_nodes(node_id)
            await self._handle_loop(node, body_nodes, done_nodes)
        else:
            await self._notify_successors(next_nodes, node_id)


    def _full_successors(self, node_id: str) -> list[str]:
        """聚合一个节点的所有后继（默认边 + 条件分支 + 循环分支 + error 边）"""
        out: list[str] = list(self.graph.adjacency.get(node_id, []))
        for tgts in self.graph.condition_branches.get(node_id, {}).values():
            out.extend(tgts)
        for tgts in self.graph.loop_branches.get(node_id, {}).values():
            out.extend(tgts)
        out.extend(self.graph.error_branches.get(node_id, []))
        return out

    def _nodes_between(self, start: str, end: str) -> set[str]:
        """
        计算从 start 到 end 之间（含两端）的所有节点集合，用于错误回流时
        精准重置"目标模块→失败模块"这一段的已执行标记，从而能从目标重跑。
        = 从 start 正向可达 ∩ 能到达 end 的节点。
        """
        # 正向可达（含 start）
        fwd: set[str] = {start}
        q = [start]
        while q:
            c = q.pop(0)
            for n in self._full_successors(c):
                if n not in fwd:
                    fwd.add(n)
                    q.append(n)
        if end not in fwd:
            return {start, end}
        # 在 fwd 子图内构建反向邻接，反推能到达 end 的节点
        rev: dict[str, list[str]] = {}
        for n in fwd:
            for m in self._full_successors(n):
                if m in fwd:
                    rev.setdefault(m, []).append(n)
        seg: set[str] = {end}
        q = [end]
        while q:
            c = q.pop(0)
            for p in rev.get(c, []):
                if p not in seg:
                    seg.add(p)
                    q.append(p)
        seg.add(start)
        return seg

    def _is_node_reachable(self, target_id: str, additional_roots: list[str]) -> bool:
        """
        检查目标节点是否有可能在未来被执行。
        如果它能被当前正在执行的节点，或者即将执行的节点触达，则认为它可能被执行。
        用于 Dead Path Elimination（死路消除）。
        """
        # roots 包含：
        # 1. 当前正在执行的节点
        # 2. 刚刚被触发即将执行的节点 (additional_roots)
        # 3. 已经在等待队列中的节点 (pending_nodes) - 因为它们已经接收了至少一个前驱的执行信号，未来必然会执行
        roots = set(self._executing_node_ids) | set(additional_roots) | set(self._pending_nodes.keys())
        
        if not roots:
            return False
            
        if target_id in roots:
            return True
            
        visited = set(roots)
        queue = list(roots)
        
        while queue:
            curr = queue.pop(0)
            if curr == target_id:
                return True
                
            next_nodes = []
            next_nodes.extend(self.graph.adjacency.get(curr, []))
            next_nodes.extend(self.graph.error_branches.get(curr, []))
            if curr in self.graph.condition_branches:
                # condition_branches[curr] 是 {handle: list[target]}，需要 flatten
                for targets in self.graph.condition_branches[curr].values():
                    next_nodes.extend(targets)
            if curr in self.graph.loop_branches:
                for nids in self.graph.loop_branches[curr].values():
                    next_nodes.extend(nids)
                    
            for nxt in next_nodes:
                if nxt not in visited:
                    visited.add(nxt)
                    queue.append(nxt)
                    if nxt == target_id:
                        return True
                        
        return False

    async def _notify_successors(self, next_nodes: list[str], completed_node_id: str):
        """通知后继节点当前节点已完成"""
        if not next_nodes or self.should_stop:
            return
        
        nodes_ready_to_execute = []
        
        async with self._node_lock:
            for next_id in next_nodes:
                if next_id in self._executed_node_ids or next_id in self._executing_node_ids:
                    continue
                
                prev_nodes = self.graph.get_prev_nodes(next_id)
                
                if len(prev_nodes) <= 1:
                    nodes_ready_to_execute.append(next_id)
                    continue
                
                if next_id not in self._pending_nodes:
                    self._pending_nodes[next_id] = set(
                        pid for pid in prev_nodes if pid not in self._executed_node_ids
                    )
                
                self._pending_nodes[next_id].discard(completed_node_id)
                
                if len(self._pending_nodes[next_id]) == 0:
                    nodes_ready_to_execute.append(next_id)
                    del self._pending_nodes[next_id]
                else:
                    remaining = len(self._pending_nodes[next_id])
                    await self._log(LogLevel.INFO, f"⏳ 等待汇合: 还有 {remaining} 个前驱分支未完成")
        
        # 每次有节点完成时，重新评估所有 pending 的节点，
        # 如果它们等待的前驱节点已经不可达（Dead Path），则不再等待
        async with self._node_lock:
            pending_keys = list(self._pending_nodes.keys())
            for pending_id in pending_keys:
                valid_pending = set()
                for pid in self._pending_nodes[pending_id]:
                    if pid in self._executed_node_ids:
                        continue
                    if self._is_node_reachable(pid, next_nodes):
                        valid_pending.add(pid)
                
                if len(valid_pending) < len(self._pending_nodes[pending_id]):
                    # 发现有死路节点被移除了
                    self._pending_nodes[pending_id] = valid_pending
                    if len(valid_pending) == 0:
                        nodes_ready_to_execute.append(pending_id)
                        del self._pending_nodes[pending_id]

        if nodes_ready_to_execute:
            await self._execute_parallel(nodes_ready_to_execute)

    async def _execute_node(self, node: WorkflowNode) -> Optional[ModuleResult]:
        """执行单个节点"""
        if self.should_stop or self.context.stop_workflow:
            return None
        
        # 跳过分组、便签和子流程头节点
        if node.type in ('group', 'note', 'subflow_header'):
            return ModuleResult(success=True, message="跳过")
        
        # 检查节点是否被禁用
        if node.data.get('disabled', False):
            label = node.data.get('label', node.type)
            return ModuleResult(success=True, message=f"已跳过（禁用）")
        
        label = node.data.get('label', node.type)
        print(f"[DEBUG] 开始执行节点: {node.id} ({node.type}: {label})")
        
        # 设置当前执行的节点信息(用于变量追踪)
        self.context.set_current_node(node.id, label)
        
        await self._notify_node_start(node.id)

        # 调试闸门：命中断点 / 单步时在此暂停（不调试时零开销）
        await self._maybe_pause(node)
        if self.should_stop or self.context.stop_workflow:
            return None
        
        # 特殊处理：自定义模块
        # 自定义模块没有"执行器"，需要在这里直接加载定义并递归执行子工作流；
        # 处理完成后把 result 交给后续通用流程（统计/日志/_notify_node_complete/数据行同步）。
        custom_module_result: Optional[ModuleResult] = None
        if node.type == 'custom_module':
            print(f"[DEBUG] 检测到自定义模块节点")
            cm_start_time = time.time()
            custom_module_result = await self._handle_custom_module_node(node)
            duration = (time.time() - cm_start_time) * 1000
            custom_module_result.duration = duration
            # 通用后处理：成功则统计、失败则计错
            if custom_module_result.success:
                self.executed_nodes += 1
                await self._log(
                    LogLevel.INFO,
                    f"[{label}] {custom_module_result.message or '自定义模块执行完成'}",
                    node_id=node.id,
                    duration=duration,
                )
            else:
                self.failed_nodes += 1
                await self._log(
                    LogLevel.ERROR,
                    f"[{label}] {custom_module_result.error or custom_module_result.message or '自定义模块执行失败'}",
                    node_id=node.id,
                    duration=duration,
                    is_user_log=True,
                )
            # 同步可能新产生的数据行
            current_rows_count = len(self.context.data_rows)
            if current_rows_count > self._last_data_rows_count:
                for i in range(self._last_data_rows_count, current_rows_count):
                    await self._send_data_row(self.context.data_rows[i])
                self._last_data_rows_count = current_rows_count
            # 通知节点完成
            await self._notify_node_complete(node.id, custom_module_result)
            return custom_module_result

        executor = registry.get(node.type)
        if not executor:
            print(f"[DEBUG] 未找到执行器: {node.type}")
            await self._log(LogLevel.WARNING, f"未知的模块类型: {node.type}", node_id=node.id)
            return ModuleResult(success=True, message=f"跳过未知模块: {node.type}")

        config = node.data.get('config', None)
        if config is None:
            # 配置直接在 node.data 中，而不是在 config 子字段
            config = node.data
        print(f"[DEBUG] 节点配置: {config}")
        
        # 获取超时配置（秒）
        # 对于某些模块（如 qq_wait_message），强制使用模块默认超时，忽略节点配置中的 timeout 字段
        # 因为这些模块有自己内部的超时逻辑（如 waitTimeout）
        modules_with_internal_timeout = {'qq_wait_message', 'wechat_wait_message', 'loop', 'foreach', 'scheduled_task', 'subflow', 
                                          'play_music', 'play_video', 'view_image', 'input_prompt'}
        
        if node.type in modules_with_internal_timeout:
            # 这些模块强制使用模块默认超时（通常是0，表示无超时限制）
            timeout_ms = get_module_default_timeout(node.type)
            timeout_seconds = timeout_ms / 1000.0 if timeout_ms > 0 else None
        else:
            # 优先使用节点配置的超时（秒），否则使用模块默认超时（毫秒）
            timeout_config = config.get('timeout')
            if timeout_config is not None:
                try:
                    timeout_seconds = float(timeout_config)
                    if timeout_seconds <= 0:
                        timeout_seconds = None
                except (ValueError, TypeError):
                    timeout_ms = get_module_default_timeout(node.type)
                    timeout_seconds = timeout_ms / 1000.0 if timeout_ms > 0 else None
            else:
                timeout_ms = get_module_default_timeout(node.type)
                timeout_seconds = timeout_ms / 1000.0 if timeout_ms > 0 else None
        
        # 获取重试配置
        retry_count = config.get('retryCount', 0)
        try:
            retry_count = int(retry_count)
            if retry_count < 0:
                retry_count = 0
        except (ValueError, TypeError):
            retry_count = 0
        
        # 获取超时行为配置
        retry_exhausted_action = config.get('retryExhaustedAction', 'stop')  # 'stop' 或 'skip'

        # 获取重试退避配置（重试间隔）
        try:
            retry_delay = float(config.get('retryDelay', 0) or 0)
            if retry_delay < 0:
                retry_delay = 0
        except (ValueError, TypeError):
            retry_delay = 0
        retry_backoff = config.get('retryBackoff', 'fixed')  # 'fixed' 固定 / 'exponential' 指数退避
        
        start_time = time.time()
        last_error = None
        result = None
        is_timeout = False
        
        # 重试循环
        for attempt in range(retry_count + 1):  # +1 因为第一次不算重试
            try:
                if attempt > 0:
                    # 重试退避：固定间隔或指数退避
                    if retry_delay > 0:
                        wait_s = retry_delay * (2 ** (attempt - 1)) if retry_backoff == 'exponential' else retry_delay
                        print(f"[RETRY] 节点 {node.id} ({label}) 重试前等待 {wait_s:.2f} 秒（{retry_backoff}）")
                        await asyncio.sleep(wait_s)
                    timeout_display = f"{timeout_seconds}秒" if timeout_seconds else "无限制"
                    print(f"[RETRY] 节点 {node.id} ({label}) 第 {attempt} 次重试，超时: {timeout_display}")
                else:
                    timeout_display = f"{timeout_seconds}秒" if timeout_seconds else "无限制"
                    print(f"[DEBUG] 调用执行器: {node.type}, 超时: {timeout_display}")
                
                # 使用 asyncio.wait_for 来控制超时（如果有超时限制）
                try:
                    if timeout_seconds is not None:
                        result = await asyncio.wait_for(
                            executor.execute(config, self.context),
                            timeout=timeout_seconds
                        )
                    else:
                        # 无超时限制，直接执行
                        result = await executor.execute(config, self.context)
                    
                    is_timeout = False
                    # 执行成功，跳出重试循环
                    if result.success:
                        break
                    else:
                        # 执行失败但没有超时，记录错误
                        last_error = result.error or "执行失败"
                        if attempt < retry_count:
                            print(f"[RETRY] 节点 {node.id} ({label}) 执行失败: {last_error}，准备重试")
                            continue
                        
                except asyncio.TimeoutError:
                    duration = (time.time() - start_time) * 1000
                    last_error = f"执行超时（超过 {timeout_seconds} 秒）"
                    is_timeout = True
                    print(f"[TIMEOUT] 节点 {node.id} ({label}) {last_error}")
                    
                    # 检查超时后的行为配置
                    timeout_action = config.get('timeoutAction', 'retry')  # 'retry', 'skip', 'stop'
                    
                    if timeout_action == 'stop':
                        # 超时后停止工作流
                        print(f"[TIMEOUT_STOP] 节点 {node.id} ({label}) 超时，执行停止工作流操作")
                        self.should_stop = True
                        self.context.stop_workflow = True
                        self.context.stop_reason = f"节点 {label} 执行超时"
                        return ModuleResult(success=False, error=last_error, duration=duration, is_timeout=True)
                    elif timeout_action == 'skip':
                        # 超时后跳过该模块
                        print(f"[TIMEOUT_SKIP] 节点 {node.id} ({label}) 超时，跳过该模块")
                        self.context.set_variable('ERROR', {
                            'node': label,
                            'nodeId': node.id,
                            'nodeType': node.type,
                            'error': last_error,
                            'isTimeout': True,
                            'skipped': True,
                        })
                        return ModuleResult(success=True, message=f"超时后跳过: {last_error}", duration=duration, skipped=True)
                    else:
                        # 默认重试
                        if attempt < retry_count:
                            # 继续重试
                            print(f"[RETRY] 节点 {node.id} ({label}) 超时，准备重试 ({attempt + 1}/{retry_count})")
                            continue
                        else:
                            # 重试耗尽，退出循环，走错误流程
                            break
                        
            except Exception as e:
                import traceback
                last_error = f"{str(e)}\n{traceback.format_exc()}"
                is_timeout = False
                print(f"[ERROR] 节点 {node.id} ({label}) 执行异常: {last_error}")
                if attempt < retry_count:
                    print(f"[RETRY] 准备重试 ({attempt + 1}/{retry_count})")
                    continue
                else:
                    break
        
        # 所有重试都失败了
        if not result or not result.success:
            duration = (time.time() - start_time) * 1000
            error_msg = last_error or "执行失败"
            
            # 检查重试耗尽后的行为（仅对非超时的失败有效）
            if not is_timeout and retry_count > 0 and retry_exhausted_action == 'skip':
                print(f"[SKIP] 节点 {node.id} ({label}) 重试耗尽后跳过")
                # 即使跳过，也更新ERROR变量
                self.context.set_variable('ERROR', {
                    'node': label,
                    'nodeId': node.id,
                    'nodeType': node.type,
                    'error': error_msg,
                    'isTimeout': False,
                    'skipped': True,
                })
                return ModuleResult(success=True, message=f"重试耗尽后跳过: {error_msg}", duration=duration, skipped=True)
            else:
                print(f"[ERROR] 节点 {node.id} ({label}) 最终失败: {error_msg}")
                # 将详细错误信息写入 ERROR 全局变量
                self.context.set_variable('ERROR', {
                    'node': label,
                    'nodeId': node.id,
                    'nodeType': node.type,
                    'error': error_msg,
                    'isTimeout': is_timeout,
                    'skipped': False,
                })
                return ModuleResult(success=False, error=error_msg, duration=duration, is_timeout=is_timeout)
        
        print(f"[DEBUG] 执行器返回: success={result.success}, message={result.message}, error={result.error}")
        
        # 检查是否需要停止工作流（stop_workflow 模块设置）
        if self.context.stop_workflow:
            print(f"[STOP_WORKFLOW] 工作流已被标记为停止，原因: {self.context.stop_reason}")
            self.should_stop = True
            await self._log(LogLevel.INFO, f"🛑 工作流已停止: {self.context.stop_reason}", is_system_log=True)
            return result
        
        # 处理子流程调用
        if node.type == 'subflow' and result.success and result.data:
            subflow_group_id = result.data.get('subflow_group_id')
            subflow_name = config.get('subflowName', '')
            if subflow_group_id:
                subflow_result = await self._execute_subflow_group(subflow_group_id, subflow_name)
                if not subflow_result.success:
                    result = subflow_result
        
        # 注：自定义模块（custom_module）已在前面 654~ 行的特殊处理分支直接 return，
        # 不会走到这里，因此原来此处再次 _execute_custom_module 的代码是死代码，已移除。
        
        duration = (time.time() - start_time) * 1000
        result.duration = duration
        
        self.executed_nodes += 1
        
        if result.success:
                # 重要模块列表 - 这些模块的日志在简洁模式下也会显示
                # 只包括：用户直接交互、关键结果输出、错误处理等真正重要的操作
                important_modules = {
                    # 用户交互/输出 - 最重要的用户可见操作
                    'print_log',           # 打印日志 - 用户主动打印的内容
                    'input_prompt',        # 输入提示 - 需要用户交互
                    'system_notification', # 系统通知 - 重要的系统消息
                    'text_to_speech',      # 文字转语音 - 用户可感知的输出
                    
                    # 网络共享 - 重要的网络服务
                    'share_folder',        # 文件夹共享
                    'share_file',          # 文件共享
                    'start_screen_share',  # 屏幕共享
                    
                    # 网络请求 - 重要的外部交互
                    'api_request',         # API请求
                    'send_email',          # 发送邮件
                    
                    # 数据库操作 - 重要的数据操作
                    'db_connect',          # 数据库连接
                    'db_query',            # 数据库查询
                    'db_execute',          # 数据库执行
                    'db_insert',           # 数据库插入
                    'db_update',           # 数据库更新
                    'db_delete',           # 数据库删除
                    
                    # AI能力 - 重要的AI交互
                    'ai_chat',             # AI对话
                    'ai_vision',           # AI视觉
                    
                    # 图像/文本识别 - 重要的识别操作
                    'click_image',         # 点击图像
                    'click_text',          # 点击文本
                    'image_ocr',           # OCR识别
                    
                    # 命令/脚本执行 - 重要的系统操作
                    'run_command',         # 运行命令
                    'js_script',           # JS脚本
                    
                    # 文件操作 - 仅显示下载上传等重要操作
                    'download_file',       # 下载文件
                    'upload_file',         # 上传文件
                    
                    # QQ/微信自动化 - 重要的消息交互
                    'qq_send_message',     # QQ发送消息
                    'qq_send_image',       # QQ发送图片
                    'qq_send_file',        # QQ发送文件
                    'qq_wait_message',     # QQ等待消息
                    'wechat_send_message', # 微信发送消息
                    'wechat_send_file',    # 微信发送文件
                    
                    # 子流程 - 重要的流程调用
                    'subflow',             # 子流程调用
                    
                    # 录屏 - 重要的媒体操作
                    'screen_record',       # 录屏
                    
                    # 音频处理
                    'audio_to_text',       # 音频转文字
                    
                    # 导出 - 重要的结果输出
                    'export_log',          # 导出日志
                    'table_export',        # 导出表格
                    'list_export',         # 导出列表
                }
                is_user_log = node.type in important_modules
                
                # 触发器模块标记为系统日志
                trigger_modules = {
                    'webhook_trigger',
                    'hotkey_trigger',
                    'file_watcher_trigger',
                    'email_trigger',
                    'api_trigger',
                    'mouse_trigger',
                    'image_trigger',
                    'sound_trigger',
                    'face_trigger',
                    'element_change_trigger',
                }
                is_system_log = node.type in trigger_modules
                
                log_level = LogLevel.INFO
                if node.type == 'print_log' and result.log_level:
                    level_map = {'debug': LogLevel.DEBUG, 'info': LogLevel.INFO, 'warning': LogLevel.WARNING, 
                                 'error': LogLevel.ERROR, 'success': LogLevel.SUCCESS}
                    log_level = level_map.get(result.log_level, LogLevel.INFO)
                
                await self._log(log_level, f"[{label}] {result.message}", 
                               node_id=node.id, duration=duration, is_user_log=is_user_log, is_system_log=is_system_log)
        else:
            self.failed_nodes += 1
            print(f"[ERROR] 节点失败: {label} - {result.error}")
            # 错误日志也标记为用户日志，这样在简洁模式下也会显示
            await self._log(LogLevel.ERROR, f"[{label}] {result.error}", 
                           node_id=node.id, duration=duration, is_user_log=True)
        
        current_rows_count = len(self.context.data_rows)
        if current_rows_count > self._last_data_rows_count:
            for i in range(self._last_data_rows_count, current_rows_count):
                await self._send_data_row(self.context.data_rows[i])
            self._last_data_rows_count = current_rows_count
        
        await self._notify_node_complete(node.id, result)
        return result

    def _parse_dimension(self, value, default: int = 300) -> int:
        """解析尺寸值，支持数字和字符串（如 '300px'）"""
        if value is None:
            return default
        if isinstance(value, (int, float)):
            return int(value)
        if isinstance(value, str):
            # 移除 'px' 后缀并转换为数字
            try:
                return int(value.replace('px', '').strip())
            except ValueError:
                return default
        return default

    def _get_subflow_node_ids(self) -> set[str]:
        """获取所有子流程分组内的节点ID"""
        subflow_node_ids = set()
        
        # 找出所有子流程分组和子流程头
        subflow_groups = []
        subflow_headers = []
        for node in self.workflow.nodes:
            if node.type == 'group' and node.data.get('isSubflow', False):
                subflow_groups.append(node)
            elif node.type == 'subflow_header':
                subflow_headers.append(node)
        
        # 对于每个子流程分组，找出其范围内的所有节点
        for group in subflow_groups:
            group_x = group.position.x
            group_y = group.position.y
            # 优先从 data 属性获取宽高（前端 NodeResizer 保存的），其次从 style 属性获取
            group_width = group.data.get('width')
            group_height = group.data.get('height')
            if group_width is None or group_height is None:
                style = group.style or {}
                group_width = group_width or style.get('width', 300)
                group_height = group_height or style.get('height', 200)
            # 确保宽高是数字类型
            group_width = self._parse_dimension(group_width, 300)
            group_height = self._parse_dimension(group_height, 200)
            
            for node in self.workflow.nodes:
                if node.id == group.id:
                    continue
                if node.type in ('group', 'note'):
                    continue
                # 检查节点是否在分组范围内
                node_x = node.position.x
                node_y = node.position.y
                if (group_x <= node_x <= group_x + group_width and
                    group_y <= node_y <= group_y + group_height):
                    subflow_node_ids.add(node.id)
        
        # 对于子流程头节点，找出从它开始的所有连接的节点
        for header in subflow_headers:
            # 子流程头节点本身也要排除
            subflow_node_ids.add(header.id)
            header_label = header.data.get('label', header.data.get('subflowName', '未命名'))
            print(f"[DEBUG] 处理子流程头: {header.id}, 名称: {header_label}")
            
            # 从子流程头开始，沿着连接找到所有节点（使用BFS遍历整个子流程图）
            visited = set()
            queue = [header.id]
            
            while queue:
                current_id = queue.pop(0)
                if current_id in visited:
                    continue
                visited.add(current_id)
                
                # 获取当前节点信息用于调试
                current_node = next((n for n in self.workflow.nodes if n.id == current_id), None)
                current_label = current_node.data.get('label', current_node.type) if current_node else 'unknown'
                
                # 找到从当前节点出发的所有边
                outgoing_edges = [e for e in self.workflow.edges if e.source == current_id]
                print(f"[DEBUG]   节点 {current_id} ({current_label}) 有 {len(outgoing_edges)} 条出边")
                
                for edge in outgoing_edges:
                    if edge.target not in visited:
                        target_node = next((n for n in self.workflow.nodes if n.id == edge.target), None)
                        if target_node:
                            target_label = target_node.data.get('label', target_node.type)
                            print(f"[DEBUG]     -> 边: {edge.source} -> {edge.target} (类型: {target_node.type}, 标签: {target_label})")
                            if target_node.type not in ('group', 'note', 'subflow_header'):
                                queue.append(edge.target)
                                subflow_node_ids.add(edge.target)
                                print(f"[DEBUG]       ✓ 添加到子流程节点列表")
                            else:
                                print(f"[DEBUG]       ✗ 跳过 (类型: {target_node.type})")
            
            print(f"[DEBUG] 子流程头 {header.id} ({header_label}) 收集到 {len(visited)-1} 个节点")
        
        print(f"[DEBUG] ========================================")
        print(f"[DEBUG] 总共收集到 {len(subflow_node_ids)} 个子流程节点")
        for node_id in subflow_node_ids:
            node = next((n for n in self.workflow.nodes if n.id == node_id), None)
            if node:
                label = node.data.get('label', node.type)
                print(f"[DEBUG]   - {node_id}: {node.type} ({label})")
        print(f"[DEBUG] ========================================")
        return subflow_node_ids

    async def _handle_custom_module_node(self, node: WorkflowNode) -> ModuleResult:
        """加载并执行 custom_module 节点（统一入口，含路径穿越防护）。

        返回 ModuleResult；不在内部改动节点统计/日志/通知，由调用方处理。
        """
        custom_module_id = node.data.get('customModuleId')
        if not custom_module_id:
            await self._log(LogLevel.ERROR, "自定义模块缺少customModuleId", node_id=node.id)
            return ModuleResult(success=False, message="自定义模块配置错误：缺少customModuleId")

        from pathlib import Path
        import json
        import re
        _ID_RE = re.compile(r'^[A-Za-z0-9_\-\u4e00-\u9fa5]+$')
        if not isinstance(custom_module_id, str) or len(custom_module_id) > 200 or not _ID_RE.match(custom_module_id):
            await self._log(LogLevel.ERROR, f"自定义模块ID不合法: {custom_module_id}", node_id=node.id)
            return ModuleResult(success=False, message="自定义模块ID不合法")

        base_dir = Path("backend/data/custom_modules").resolve()
        module_file = (base_dir / f"{custom_module_id}.json").resolve()
        try:
            module_file.relative_to(base_dir)
        except ValueError:
            await self._log(LogLevel.ERROR, f"自定义模块路径不安全: {custom_module_id}", node_id=node.id)
            return ModuleResult(success=False, message="自定义模块路径不安全")
        if not module_file.exists():
            await self._log(LogLevel.ERROR, f"自定义模块不存在: {custom_module_id}", node_id=node.id)
            return ModuleResult(success=False, message=f"自定义模块不存在: {custom_module_id}")

        try:
            with open(module_file, 'r', encoding='utf-8') as f:
                module_def = json.load(f)
            return await self._execute_custom_module(module_def, node.data)
        except Exception as e:
            await self._log(LogLevel.ERROR, f"加载自定义模块失败: {str(e)}", node_id=node.id)
            return ModuleResult(success=False, message=f"加载自定义模块失败: {str(e)}")

    async def _execute_custom_module(self, module_def: dict, node_data: dict) -> ModuleResult:
        """执行自定义模块的子工作流
        
        Args:
            module_def: 自定义模块定义（从JSON文件加载）
            node_data: 节点配置数据（包含用户配置的参数值）
        """
        module_name = module_def.get('display_name', module_def.get('name', '自定义模块'))
        module_id = module_def.get('id') or module_name
        workflow_def = module_def.get('workflow')
        parameters_def = module_def.get('parameters', [])  # 参数定义列表
        outputs_def = module_def.get('outputs', [])  # 输出定义列表
        
        # 循环引用检测：维护调用栈
        if not hasattr(self, '_custom_module_stack'):
            self._custom_module_stack: list[str] = []
        if module_id in self._custom_module_stack:
            error_msg = (
                f"检测到自定义模块循环引用: "
                f"{' -> '.join(self._custom_module_stack)} -> {module_id}"
            )
            await self._log(LogLevel.ERROR, error_msg, is_system_log=True)
            return ModuleResult(success=False, error=error_msg)
        # 限制最大深度，防止意外的深层嵌套
        if len(self._custom_module_stack) >= 16:
            error_msg = f"自定义模块嵌套层数过深(>16): {' -> '.join(self._custom_module_stack)}"
            await self._log(LogLevel.ERROR, error_msg, is_system_log=True)
            return ModuleResult(success=False, error=error_msg)
        self._custom_module_stack.append(module_id)
        
        if not workflow_def:
            error_msg = f"自定义模块 '{module_name}' 缺少工作流定义"
            await self._log(LogLevel.ERROR, error_msg, is_system_log=True)
            self._custom_module_stack.pop()
            return ModuleResult(success=False, error=error_msg)
        
        await self._log(LogLevel.INFO, f"开始执行自定义模块 [{module_name}]", is_system_log=True)
        
        # 在 try 之前先保存以保证 except 也能恢复（深拷贝防止子工作流就地修改 list/dict 污染外层）
        import copy as _copy
        try:
            original_variables = _copy.deepcopy(self.context.variables)
        except Exception:
            original_variables = self.context.variables.copy()
        original_graph = getattr(self, 'graph', None)
        original_executed_ids = self._executed_node_ids.copy() if hasattr(self, '_executed_node_ids') else set()
        original_executing_ids = self._executing_node_ids.copy() if hasattr(self, '_executing_node_ids') else set()
        original_pending_nodes = self._pending_nodes.copy() if hasattr(self, '_pending_nodes') else {}
        
        try:
            # 从节点配置中获取用户设置的参数值
            parameter_values = node_data.get('parameterValues', {})
            
            # 设置输入参数变量
            for param_def in parameters_def:
                param_name = param_def.get('name')
                if not param_name:
                    continue
                
                # 获取用户配置的值，如果没有则使用默认值
                param_value = parameter_values.get(param_name, param_def.get('default_value', ''))
                
                # 解析参数值（支持变量引用，如 {{变量名}}）
                resolved_value = self.context.resolve_value(param_value)
                self.context.set_variable(param_name, resolved_value)
                print(f"[DEBUG] 自定义模块参数: {param_name} = {resolved_value}")
            
            # 2. 构建子工作流的节点和边
            from app.models.workflow import Workflow, WorkflowNode as WFNode, WorkflowEdge, Position
            
            sub_nodes = []
            for node_data_item in workflow_def.get('nodes', []):
                # 重建节点对象
                position = Position(x=node_data_item['position']['x'], y=node_data_item['position']['y'])
                wf_node = WFNode(
                    id=node_data_item['id'],
                    type=node_data_item['type'],
                    position=position,
                    data=node_data_item.get('data', {}),
                    width=node_data_item.get('width'),
                    height=node_data_item.get('height'),
                    style=node_data_item.get('style')
                )
                sub_nodes.append(wf_node)
            
            sub_edges = []
            for edge_data in workflow_def.get('edges', []):
                edge = WorkflowEdge(
                    id=edge_data['id'],
                    source=edge_data['source'],
                    target=edge_data['target'],
                    sourceHandle=edge_data.get('sourceHandle'),
                    targetHandle=edge_data.get('targetHandle')
                )
                sub_edges.append(edge)
            
            # 创建子工作流对象
            sub_workflow = Workflow(
                id=f"custom_module_{module_def.get('id')}",
                name=module_name,
                nodes=sub_nodes,
                edges=sub_edges
            )
            
            # 3. 解析子工作流的执行图
            from app.services.workflow_parser import WorkflowParser
            parser = WorkflowParser(sub_workflow)
            sub_graph = parser.parse()
            
            # 4. 找到子工作流的起始节点
            start_nodes = sub_graph.get_start_nodes()
            if not start_nodes:
                error_msg = f"自定义模块 '{module_name}' 没有起始节点"
                await self._log(LogLevel.ERROR, error_msg, is_system_log=True)
                # 恢复变量上下文（因为之前已设置了输入参数）
                self.context.variables = original_variables
                return ModuleResult(success=False, error=error_msg)
            
            # 5. 执行子工作流
            # 临时替换为子工作流的图（外层已经保存了 original_graph 等）
            self.graph = sub_graph
            
            # 重置执行状态（仅针对子工作流）
            self._executed_node_ids = set()
            self._executing_node_ids = set()
            self._pending_nodes = {}
            
            # 执行子工作流的起始节点
            await self._execute_parallel(start_nodes)
            
            # 6. 提取输出变量
            output_values = {}
            for output_def in outputs_def:
                output_name = output_def.get('name')
                if not output_name:
                    continue
                
                # 从上下文中获取输出变量的值
                output_value = self.context.get_variable(output_name)
                output_values[output_name] = output_value
                print(f"[DEBUG] 自定义模块输出: {output_name} = {output_value}")
            
            # 7. 恢复原始变量上下文，并设置输出变量
            self.context.variables = original_variables
            for output_name, output_value in output_values.items():
                self.context.set_variable(output_name, output_value)
            
            await self._log(LogLevel.INFO, f"自定义模块 [{module_name}] 执行完成", is_system_log=True)
            return ModuleResult(
                success=True, 
                message=f"自定义模块 '{module_name}' 执行完成",
                data={'outputs': output_values}
            )
                
        except Exception as e:
            import traceback
            error_msg = f"自定义模块 '{module_name}' 执行失败: {str(e)}\n{traceback.format_exc()}"
            await self._log(LogLevel.ERROR, error_msg, is_system_log=True)
            # 恢复原始变量上下文
            self.context.variables = original_variables
            return ModuleResult(success=False, error=error_msg)
        finally:
            # 恢复原始执行图和状态（无论成功失败）
            if original_graph is not None:
                self.graph = original_graph
            self._executed_node_ids = original_executed_ids
            self._executing_node_ids = original_executing_ids
            self._pending_nodes = original_pending_nodes
            # 弹出调用栈
            try:
                self._custom_module_stack.pop()
            except Exception:
                pass

    async def _execute_subflow_group(self, group_id: str, subflow_name: str = None) -> ModuleResult:
        """执行子流程分组内的模块"""
        # 循环引用检测：维护调用栈
        if not hasattr(self, '_subflow_stack'):
            self._subflow_stack: list[str] = []
        key = subflow_name or group_id or ''
        if key and key in self._subflow_stack:
            return ModuleResult(
                success=False,
                error=f"检测到子流程循环引用: {' -> '.join(self._subflow_stack)} -> {key}"
            )
        if len(self._subflow_stack) >= 32:
            return ModuleResult(
                success=False,
                error=f"子流程嵌套层数过深(>32): {' -> '.join(self._subflow_stack)}"
            )
        self._subflow_stack.append(key)
        try:
            return await self._do_execute_subflow_group(group_id, subflow_name)
        finally:
            try:
                self._subflow_stack.pop()
            except Exception:
                pass

    async def _do_execute_subflow_group(self, group_id: str, subflow_name: str = None) -> ModuleResult:
        """执行子流程分组内的模块（实际逻辑）"""
        # 找到子流程分组或子流程头 - 优先通过名称查找（因为导入后 ID 会变），ID 作为备用
        group_node = None
        is_header_mode = False
        
        # 优先通过名称查找
        if subflow_name:
            for node in self.workflow.nodes:
                # 查找分组形式的子流程
                if (node.type == 'group' and 
                    node.data.get('isSubflow') == True and 
                    node.data.get('subflowName') == subflow_name):
                    group_node = node
                    break
                # 查找函数头形式的子流程
                elif (node.type == 'subflow_header' and 
                      node.data.get('subflowName') == subflow_name):
                    group_node = node
                    is_header_mode = True
                    break
        
        # 如果通过名称找不到，尝试通过 ID 查找
        if not group_node and group_id:
            for node in self.workflow.nodes:
                if node.id == group_id:
                    if node.type == 'group':
                        group_node = node
                        break
                    elif node.type == 'subflow_header':
                        group_node = node
                        is_header_mode = True
                        break
        
        if not group_node:
            error_msg = f"找不到子流程: {subflow_name or group_id}"
            return ModuleResult(success=False, error=error_msg)
        
        subflow_name = group_node.data.get('subflowName', '子流程')
        await self._log(LogLevel.INFO, f"📦 开始执行子流程 [{subflow_name}]", is_system_log=True)
        
        # 根据模式获取子流程内的节点
        if is_header_mode:
            # 函数头模式：从头节点开始，沿着连接找到所有节点
            nodes_in_group = []
            visited = set()
            queue = [group_node.id]
            
            while queue:
                current_id = queue.pop(0)
                if current_id in visited:
                    continue
                visited.add(current_id)
                
                # 找到从当前节点出发的所有边
                for edge in self.workflow.edges:
                    if edge.source == current_id and edge.target not in visited:
                        target_node = next((n for n in self.workflow.nodes if n.id == edge.target), None)
                        if target_node and target_node.type not in ('group', 'note', 'subflow_header'):
                            nodes_in_group.append(target_node)
                            queue.append(edge.target)
        else:
            # 分组模式：获取分组范围内的所有节点
            # 获取分组的位置和大小
            # 优先从 data 属性获取宽高（前端 NodeResizer 保存的），其次从 style 属性获取
            group_x = group_node.position.x
            group_y = group_node.position.y
            group_width = group_node.data.get('width')
            group_height = group_node.data.get('height')
            if group_width is None or group_height is None:
                style = group_node.style or {}
                group_width = group_width or style.get('width', 300)
                group_height = group_height or style.get('height', 200)
            # 确保宽高是数字类型
            group_width = self._parse_dimension(group_width, 300)
            group_height = self._parse_dimension(group_height, 200)
            
            # 调试：打印分组范围
            print(f"[DEBUG] 子流程分组范围: x={group_x}, y={group_y}, width={group_width}, height={group_height}")
            print(f"[DEBUG] 分组 data.width={group_node.data.get('width')}, data.height={group_node.data.get('height')}")
            
            # 找出在分组范围内的所有节点
            nodes_in_group = []
            for node in self.workflow.nodes:
                if node.id == group_node.id:
                    continue
                if node.type in ('group', 'note'):
                    continue
                # 检查节点是否在分组范围内
                node_x = node.position.x
                node_y = node.position.y
                # 节点在分组范围内的判断：节点左上角在分组内
                if (group_x <= node_x <= group_x + group_width and
                    group_y <= node_y <= group_y + group_height):
                    nodes_in_group.append(node)
                    print(f"[DEBUG] 节点在分组内: {node.id} ({node.type}) at ({node_x}, {node_y})")
                else:
                    print(f"[DEBUG] 节点不在分组内: {node.id} ({node.type}) at ({node_x}, {node_y})")
        
        if not nodes_in_group:
            await self._log(LogLevel.WARNING, f"📦 子流程 [{subflow_name}] 为空", is_system_log=True)
            return ModuleResult(success=True, message=f"子流程 [{subflow_name}] 为空")
        
        # 找出子流程内的起始节点（没有入边的节点）
        node_ids_in_group = {n.id for n in nodes_in_group}
        nodes_with_incoming = set()
        for edge in self.workflow.edges:
            if edge.target in node_ids_in_group and edge.source in node_ids_in_group:
                nodes_with_incoming.add(edge.target)
        
        start_nodes = [n for n in nodes_in_group if n.id not in nodes_with_incoming]
        
        if not start_nodes:
            # 如果没有明确的起始节点，按位置排序取第一个
            start_nodes = sorted(nodes_in_group, key=lambda n: (n.position.y, n.position.x))[:1]
        
        # 使用主流程的执行逻辑来执行子流程
        # 保存当前执行状态
        original_executed_ids = self._executed_node_ids.copy()
        original_executing_ids = self._executing_node_ids.copy()
        original_pending_nodes = self._pending_nodes.copy()
        
        # 重置执行状态（仅针对子流程内的节点）
        # 注意：不清空全局状态，只是标记子流程内的节点为未执行
        subflow_executed_ids = set()
        
        try:
            # 执行子流程的起始节点
            start_node_ids = [n.id for n in start_nodes]
            
            # 使用主流程的并行执行逻辑
            await self._execute_parallel_subflow(start_node_ids, node_ids_in_group, subflow_executed_ids)
            
            # 检查是否有错误发生
            subflow_error = None
            for node_id in subflow_executed_ids:
                # 这里无法直接获取执行结果，但如果有错误，主流程会处理
                pass
            
            await self._log(LogLevel.INFO, f"📦 子流程 [{subflow_name}] 执行完成，共执行 {len(subflow_executed_ids)} 个节点", is_system_log=True)
            return ModuleResult(success=True, message=f"子流程 [{subflow_name}] 执行完成")
            
        except Exception as e:
            await self._log(LogLevel.ERROR, f"📦 子流程 [{subflow_name}] 执行失败: {str(e)}", is_system_log=True)
            return ModuleResult(success=False, error=f"子流程执行失败: {str(e)}")
        finally:
            # 恢复原始执行状态（不影响主流程）
            # 注意：子流程执行的节点应该被标记为已执行
            pass
    
    async def _execute_parallel_subflow(self, node_ids: list[str], allowed_nodes: set[str], executed_ids: set[str]):
        """在子流程范围内并行执行节点（支持循环、条件等控制流）"""
        if not node_ids or self.should_stop:
            return
        
        # 过滤出可以执行的节点
        nodes_to_execute = []
        for node_id in node_ids:
            if node_id not in allowed_nodes:
                continue
            if node_id in executed_ids:
                continue
            
            # 检查前置节点是否都已执行
            # 注意：条件分支只走一条路，另一条路的节点永远不会进入 executed_ids
            # 因此只要「在 allowed_nodes 中且尚未执行」的前置节点都已完成，即可执行
            # 已不在 allowed_nodes 中的前置节点（子流程外）不参与等待
            prev_nodes = self.graph.get_prev_nodes(node_id)
            prev_in_subflow = [pid for pid in prev_nodes if pid in allowed_nodes]
            
            # 如果没有前置节点，直接执行
            if not prev_in_subflow:
                nodes_to_execute.append(node_id)
                continue
            
            # 统计前置节点中已执行的数量
            executed_prev = [pid for pid in prev_in_subflow if pid in executed_ids]
            
            # 所有前置节点都已执行 → 直接执行
            if len(executed_prev) == len(prev_in_subflow):
                nodes_to_execute.append(node_id)
                continue
            
            # 至少有一个前置已执行，且其余前置节点都无法从已执行/正在执行的节点到达
            # （Dead Path Elimination：条件分支未走到的那条路）
            # 简单判断：如果未执行的前置节点不在 allowed_nodes 的可达集合中，则视为死路
            unexecuted_prev = [pid for pid in prev_in_subflow if pid not in executed_ids]
            all_dead = all(
                not self._is_prev_reachable_in_subflow(pid, executed_ids, allowed_nodes)
                for pid in unexecuted_prev
            )
            if all_dead and executed_prev:
                nodes_to_execute.append(node_id)
        
        if not nodes_to_execute:
            return
        
        print(f"[DEBUG] _execute_parallel_subflow: 准备执行 {len(nodes_to_execute)} 个节点")
        for nid in nodes_to_execute:
            node = self.graph.get_node(nid)
            if node:
                label = node.data.get('label', node.type)
                print(f"[DEBUG]   - {nid}: {node.type} ({label})")
        
        # 并行执行所有可执行的节点
        tasks = [self._execute_node_in_subflow(node_id, allowed_nodes, executed_ids) for node_id in nodes_to_execute]
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
    
    def _is_prev_reachable_in_subflow(self, node_id: str, executed_ids: set[str], allowed_nodes: set[str]) -> bool:
        """
        判断某个前置节点是否仍然「可达」（即将来还有可能被执行到）。
        用于子流程中的 Dead Path Elimination：条件分支只走一条路，
        另一条路上的节点永远不会进入 executed_ids，不应阻塞汇合节点的执行。
        
        判断方式：从已执行的节点集合出发，看是否能通过图的边到达 node_id。
        如果无法到达，说明它是死路，可以忽略。
        """
        if node_id in executed_ids:
            return True  # 已执行，肯定可达
        
        # 从已执行节点出发做 BFS，看能否到达 node_id
        visited = set(executed_ids)
        queue = list(executed_ids)
        
        while queue:
            curr = queue.pop(0)
            # 获取 curr 的所有后继节点
            next_nodes = list(self.graph.adjacency.get(curr, []))
            if curr in self.graph.condition_branches:
                # condition_branches[curr] 是 {handle: list[target]}
                for targets in self.graph.condition_branches[curr].values():
                    next_nodes.extend(targets)
            if curr in self.graph.loop_branches:
                for targets in self.graph.loop_branches[curr].values():
                    next_nodes.extend(targets)
            next_nodes.extend(self.graph.error_branches.get(curr, []))
            
            for nxt in next_nodes:
                if nxt == node_id:
                    return True
                if nxt not in visited and nxt in allowed_nodes:
                    visited.add(nxt)
                    queue.append(nxt)
        
        return False

    async def _execute_node_in_subflow(self, node_id: str, allowed_nodes: set[str], executed_ids: set[str]):
        """在子流程中执行单个节点（支持循环、条件等控制流）"""
        if node_id in executed_ids or self.should_stop:
            return
        
        node = self.graph.get_node(node_id)
        if not node:
            return
        
        # 处理循环节点（特殊处理，不提前标记为已执行，由_handle_loop_in_subflow内部处理）
        if node.type in ('loop', 'foreach', 'infinite_loop', 'foreach_dict'):
            body_nodes = self.graph.get_loop_body_nodes(node_id)
            done_nodes = self.graph.get_loop_done_nodes(node_id)
            
            print(f"[DEBUG] 子流程中的循环节点 {node_id} ({node.type})")
            print(f"[DEBUG]   body_nodes: {body_nodes}")
            print(f"[DEBUG]   done_nodes: {done_nodes}")
            
            # 只处理子流程范围内的循环体和完成分支
            body_nodes_in_subflow = [nid for nid in body_nodes if nid in allowed_nodes]
            done_nodes_in_subflow = [nid for nid in done_nodes if nid in allowed_nodes]
            
            print(f"[DEBUG]   body_nodes_in_subflow: {body_nodes_in_subflow}")
            print(f"[DEBUG]   done_nodes_in_subflow: {done_nodes_in_subflow}")
            
            # 调用循环处理逻辑（内部会先标记循环节点为已执行）
            await self._handle_loop_in_subflow(node, body_nodes_in_subflow, done_nodes_in_subflow, allowed_nodes, executed_ids)
            return
        
        # 标记非循环节点为已执行
        executed_ids.add(node_id)
        
        # 执行普通节点
        result = await self._execute_node(node)
        
        # 处理执行结果
        if result and not result.success:
            # 节点执行失败，检查是否有错误分支
            error_nodes = self.graph.get_error_nodes(node_id)
            error_nodes_in_subflow = [nid for nid in error_nodes if nid in allowed_nodes]
            
            if error_nodes_in_subflow:
                # 有错误分支，继续执行错误分支
                await self._execute_parallel_subflow(error_nodes_in_subflow, allowed_nodes, executed_ids)
                return
            else:
                # 没有错误分支，停止执行
                return
        
        # 检查 break_loop / continue_loop 信号（子流程中也需要响应）
        if self.context.should_break or self.context.should_continue:
            return
        
        # 获取下一个节点
        if result and result.branch:
            next_nodes = self.graph.get_next_nodes(node_id, result.branch)
        else:
            next_nodes = self.graph.get_next_nodes(node_id)
        
        # 只执行子流程范围内的节点
        next_nodes_in_subflow = [nid for nid in next_nodes if nid in allowed_nodes]
        
        # 继续执行后续节点
        if next_nodes_in_subflow:
            await self._execute_parallel_subflow(next_nodes_in_subflow, allowed_nodes, executed_ids)
    
    async def _handle_loop_in_subflow(self, loop_node: WorkflowNode, body_nodes: list[str], done_nodes: list[str], allowed_nodes: set[str], executed_ids: set[str]):
        """在子流程中处理循环执行"""
        loop_config = loop_node.data
        
        # 标记循环节点本身为已执行（避免重复执行）
        executed_ids.add(loop_node.id)
        
        # 记录执行循环节点前的 loop_stack 深度，用于循环结束时精确弹出
        # 必须在 _execute_node 之前记录，因为 LoopExecutor 会在执行时压栈
        loop_stack_depth_before = len(self.context.loop_stack)
        
        # 先执行循环节点本身，获取循环状态（LoopExecutor 会压栈并初始化变量）
        result = await self._execute_node(loop_node)
        if not result or not result.success:
            print(f"[DEBUG] 循环节点执行失败")
            # 精确弹出因执行失败而残留的 loop_stack 条目
            while len(self.context.loop_stack) > loop_stack_depth_before:
                self.context.loop_stack.pop()
            return
        
        print(f"[DEBUG] 循环节点执行成功，result.data: {result.data}")
        
        # 从执行结果中获取循环状态
        loop_state = result.data if result.data else {}
        loop_type = loop_state.get('type', loop_config.get('loopType', 'count'))
        
        print(f"[DEBUG] 循环类型: {loop_type}")
        print(f"[DEBUG] 循环体节点: {body_nodes}")
        
        # 收集循环体内的所有节点（包括嵌套的节点）
        all_body_nodes = await self._collect_loop_body_nodes_in_subflow(body_nodes, allowed_nodes)
        print(f"[DEBUG] 循环体内所有节点（包括嵌套）: {all_body_nodes}")
        
        if loop_type == 'count':
            # 计数循环：从执行器已解析好的 loop_state 里取 count，支持变量引用
            # loop_state 是 LoopExecutor.execute() 返回的 result.data，count 已经通过 to_int 解析过变量
            # 如果 loop_state 里没有 count（异常情况），则从 loop_config 取原始值并手动解析变量
            if 'count' in loop_state:
                count = loop_state.get('count', 1)
            else:
                raw_count = loop_config.get('loopCount') if loop_config.get('loopCount') is not None else loop_config.get('count', 10)
                from app.executors.type_utils import to_int as _to_int
                count = _to_int(raw_count, 10, self.context)
            index_var = loop_state.get('index_variable', loop_config.get('indexVariable', 'loop_index'))

            print(f"[DEBUG] 开始计数循环，次数: {count}")

            for i in range(count):
                if self.should_stop:
                    break
                if self.context.should_break:
                    self.context.should_break = False
                    break

                self.context.variables[index_var] = i
                self.context.should_continue = False
                print(f"[DEBUG] 循环第 {i} 次，执行循环体")

                # 执行循环体（仅子流程范围内）
                if body_nodes:
                    # 每次循环重置循环体内所有节点的执行状态
                    # 注意：需要将循环节点本身标记为已执行，这样循环体节点才能执行
                    body_executed = {loop_node.id}
                    await self._execute_parallel_subflow(body_nodes, allowed_nodes, body_executed)
                    print(f"[DEBUG] 循环第 {i} 次完成，执行了 {len(body_executed) - 1} 个节点: {body_executed - {loop_node.id}}")
                    # 将循环体执行的节点添加到总执行列表（不包括循环节点本身，因为它已经在外层执行过了）
                    executed_ids.update(body_executed - {loop_node.id})
                
                # 处理 continue_loop（跳过本次剩余，继续下一次）
                if self.context.should_continue:
                    self.context.should_continue = False
                    continue
        
        elif loop_type == 'range':
            # 范围循环：从 start_value 到 end_value，步长 step_value
            from app.executors.type_utils import to_int as _to_int
            start_value = loop_state.get('start_value', _to_int(loop_config.get('startValue', 1), 1, self.context))
            end_value = loop_state.get('end_value', _to_int(loop_config.get('endValue', 10), 10, self.context))
            step_value = loop_state.get('step_value', _to_int(loop_config.get('stepValue', 1), 1, self.context))
            index_var = loop_state.get('index_variable', loop_config.get('indexVariable', 'loop_index'))

            if step_value == 0:
                step_value = 1

            print(f"[DEBUG] 开始范围循环，start={start_value}, end={end_value}, step={step_value}")

            current = start_value
            while True:
                if self.should_stop:
                    break
                if self.context.should_break:
                    self.context.should_break = False
                    break

                # 检查是否超出范围
                if step_value > 0 and current > end_value:
                    break
                if step_value < 0 and current < end_value:
                    break

                self.context.variables[index_var] = current
                self.context.should_continue = False
                print(f"[DEBUG] 范围循环 current={current}")

                if body_nodes:
                    body_executed = {loop_node.id}
                    await self._execute_parallel_subflow(body_nodes, allowed_nodes, body_executed)
                    executed_ids.update(body_executed - {loop_node.id})

                # 先递增，再检查continue（避免重复递增）
                current += step_value
                
                if self.context.should_continue:
                    self.context.should_continue = False
                    continue

        elif loop_type == 'while':
            # 条件循环：复用主流程的安全条件评估逻辑，支持变量引用
            condition = loop_state.get('condition', loop_config.get('condition', ''))
            index_var = loop_state.get('index_variable', loop_config.get('indexVariable', 'loop_index'))
            max_iterations = loop_state.get('max_iterations', 1000)
            iteration = 0

            print(f"[DEBUG] 开始条件循环，条件: {condition}")

            while iteration < max_iterations:
                if self.should_stop:
                    break
                
                # 先检查break标志
                if self.context.should_break:
                    self.context.should_break = False
                    break

                # 安全评估条件（与主流程 _handle_loop 逻辑一致，支持变量引用）
                while_should_continue = False
                try:
                    import re as _re
                    _cond = condition
                    if _re.match(r'^[a-zA-Z0-9_\u4e00-\u9fa5]+$', _cond.strip()):
                        _cond = f'{{{_cond.strip()}}}'
                    resolved = self.context.resolve_value(_cond)
                    if isinstance(resolved, bool):
                        while_should_continue = resolved
                    elif isinstance(resolved, str):
                        try:
                            while_should_continue = bool(eval(resolved, {"__builtins__": {}}, dict(self.context.variables)))
                        except Exception:
                            while_should_continue = resolved.lower() in ('true', '1') and resolved.strip() != ''
                    else:
                        while_should_continue = bool(resolved)
                except Exception as e:
                    await self._log(LogLevel.ERROR, f"循环条件求值失败: {str(e)}", node_id=loop_node.id)
                    break

                if not while_should_continue:
                    print(f"[DEBUG] 条件不满足，退出循环")
                    break

                self.context.variables[index_var] = iteration
                self.context.should_continue = False
                print(f"[DEBUG] 循环第 {iteration} 次，执行循环体")

                # 执行循环体（仅子流程范围内）
                if body_nodes:
                    body_executed = {loop_node.id}
                    await self._execute_parallel_subflow(body_nodes, allowed_nodes, body_executed)
                    print(f"[DEBUG] 循环第 {iteration} 次完成，执行了 {len(body_executed) - 1} 个节点: {body_executed - {loop_node.id}}")
                    executed_ids.update(body_executed - {loop_node.id})

                # 先递增，再检查continue
                iteration += 1
                
                # 处理 continue_loop
                if self.context.should_continue:
                    self.context.should_continue = False
                    continue
        
        elif loop_type == 'foreach':
            # 遍历列表：从执行器已解析好的 loop_state 里取 data
            # 如果 loop_state 里没有 data，则从 loop_config 取原始值并手动解析变量
            if 'data' in loop_state:
                data = loop_state.get('data', [])
            else:
                data_source = loop_config.get('dataSource') or loop_config.get('listVariable', '')
                data = self.context.resolve_value(data_source) if data_source else []
                if isinstance(data, str):
                    data = self.context.get_variable(data, [])
                if not isinstance(data, (list, tuple)):
                    data = []
                data = list(data)
            item_var = loop_state.get('item_variable', loop_config.get('itemVariable', 'item'))
            index_var = loop_state.get('index_variable', loop_config.get('indexVariable', 'index'))

            print(f"[DEBUG] 开始遍历循环，数据长度: {len(data)}")

            for i, item in enumerate(data):
                if self.should_stop:
                    break
                if self.context.should_break:
                    self.context.should_break = False
                    break

                # 设置循环变量
                self.context.variables[item_var] = item
                self.context.variables[index_var] = i
                self.context.should_continue = False
                print(f"[DEBUG] 循环第 {i} 次，item={item}")

                # 执行循环体（仅子流程范围内）
                if body_nodes:
                    body_executed = {loop_node.id}
                    await self._execute_parallel_subflow(body_nodes, allowed_nodes, body_executed)
                    print(f"[DEBUG] 循环第 {i} 次完成，执行了 {len(body_executed) - 1} 个节点: {body_executed - {loop_node.id}}")
                    executed_ids.update(body_executed - {loop_node.id})

                # 处理 continue_loop
                if self.context.should_continue:
                    self.context.should_continue = False
                    continue

        elif loop_type == 'foreach_dict':
            # 遍历字典键值对：从执行器已解析好的 loop_state 里取 data
            if 'data' in loop_state:
                data = loop_state.get('data', [])
            else:
                data_source = loop_config.get('dataSource') or loop_config.get('dictVariable', '')
                raw_data = self.context.resolve_value(data_source) if data_source else {}
                if isinstance(raw_data, str):
                    raw_data = self.context.get_variable(raw_data, {})
                if isinstance(raw_data, dict):
                    data = list(raw_data.items())
                else:
                    data = []
            key_var = loop_state.get('key_variable', loop_config.get('keyVariable', 'key'))
            value_var = loop_state.get('value_variable', loop_config.get('valueVariable', 'value'))
            index_var = loop_state.get('index_variable', loop_config.get('indexVariable', 'index'))

            print(f"[DEBUG] 开始遍历字典，数据长度: {len(data)}")

            for i, (k, v) in enumerate(data):
                if self.should_stop:
                    break
                if self.context.should_break:
                    self.context.should_break = False
                    break

                self.context.variables[key_var] = k
                self.context.variables[value_var] = v
                self.context.variables[index_var] = i
                self.context.should_continue = False
                print(f"[DEBUG] 循环第 {i} 次，key={k}, value={v}")

                if body_nodes:
                    body_executed = {loop_node.id}
                    await self._execute_parallel_subflow(body_nodes, allowed_nodes, body_executed)
                    print(f"[DEBUG] 循环第 {i} 次完成，执行了 {len(body_executed) - 1} 个节点: {body_executed - {loop_node.id}}")
                    executed_ids.update(body_executed - {loop_node.id})

                # 处理 continue_loop
                if self.context.should_continue:
                    self.context.should_continue = False
                    continue

        elif loop_type == 'infinite':
            # 无限循环（依赖循环体内的 break_loop 跳出）
            index_var = loop_state.get('index_variable', loop_config.get('indexVariable', 'loop_index'))
            max_iterations = loop_state.get('max_iterations', 999999999)
            iteration = 0

            print(f"[DEBUG] 开始无限循环")

            while iteration < max_iterations:
                if self.should_stop:
                    break

                self.context.variables[index_var] = iteration
                self.context.should_continue = False
                print(f"[DEBUG] 无限循环第 {iteration} 次，执行循环体")

                if body_nodes:
                    body_executed = {loop_node.id}
                    await self._execute_parallel_subflow(body_nodes, allowed_nodes, body_executed)
                    executed_ids.update(body_executed - {loop_node.id})

                # 检查是否触发了 break_loop
                if self.context.should_break:
                    self.context.should_break = False
                    break

                # 先递增，再检查continue
                iteration += 1
                
                # 处理 continue_loop
                if self.context.should_continue:
                    self.context.should_continue = False
                    continue
        
        # 清理循环状态：精确弹出本次循环压入的条目（用入栈前的深度定位，避免嵌套弹错）
        while len(self.context.loop_stack) > loop_stack_depth_before:
            self.context.loop_stack.pop()
        
        print(f"[DEBUG] 循环结束，执行完成分支: {done_nodes}")
        
        # 循环结束后执行完成分支（仅子流程范围内）
        if done_nodes:
            await self._execute_parallel_subflow(done_nodes, allowed_nodes, executed_ids)
    
    async def _collect_loop_body_nodes_in_subflow(self, start_nodes: list[str], allowed_nodes: set[str]) -> set[str]:
        """收集子流程中循环体内的所有节点（包括嵌套的节点）"""
        collected = set()
        to_visit = list(start_nodes)
        
        while to_visit:
            node_id = to_visit.pop(0)
            if node_id in collected or node_id not in allowed_nodes:
                continue
            collected.add(node_id)
            
            node = self.graph.get_node(node_id)
            if not node:
                continue
            
            # 获取所有后继节点
            next_nodes = []
            
            # 如果是条件节点，获取所有分支
            if node.type in ('condition', 'face_recognition', 'element_exists', 'element_visible', 'image_exists', 'phone_image_exists', 'probability_trigger'):
                if node_id in self.graph.condition_branches:
                    # condition_branches[node_id] 是 {handle: list[target_id]}
                    for branch_targets in self.graph.condition_branches[node_id].values():
                        for branch_target in branch_targets:
                            if branch_target:
                                next_nodes.append(branch_target)
            # 如果是循环节点，获取循环体和完成分支
            elif node.type in ('loop', 'foreach', 'infinite_loop', 'foreach_dict'):
                if node_id in self.graph.loop_branches:
                    for branch_targets in self.graph.loop_branches[node_id].values():
                        next_nodes.extend(branch_targets)
            else:
                # 普通节点，获取默认后继
                next_nodes = self.graph.get_next_nodes(node_id)
            
            for next_id in next_nodes:
                if next_id not in collected and next_id in allowed_nodes:
                    to_visit.append(next_id)
        
        return collected


    async def _handle_loop(self, loop_node: WorkflowNode, body_nodes: list[str], done_nodes: list[str]):
        """处理循环执行"""
        if not self.context.loop_stack:
            await self._notify_successors(done_nodes, loop_node.id)
            return
        
        loop_state = self.context.loop_stack[-1]
        loop_type = loop_state['type']
        
        while not self.should_stop:
            should_continue = False
            
            if loop_type == 'count':
                should_continue = loop_state['current_index'] < loop_state['count']
            elif loop_type == 'range':
                current = loop_state['current_index']
                end_value = loop_state['end_value']
                step_value = loop_state['step_value']
                should_continue = current <= end_value if step_value > 0 else current >= end_value
            elif loop_type == 'while':
                # 条件循环:评估条件表达式
                condition = loop_state['condition']
                if not condition:
                    should_continue = False
                else:
                    try:
                        # 向下兼容：如果条件是纯变量名（不包含花括号、运算符等），自动转换为 {变量名}
                        # 检查是否是纯变量名（只包含字母、数字、下划线、中文）
                        import re
                        if re.match(r'^[a-zA-Z0-9_\u4e00-\u9fa5]+$', condition.strip()):
                            # 是纯变量名，转换为 {变量名} 格式
                            condition = f'{{{condition.strip()}}}'
                        
                        # 先解析变量引用
                        resolved_condition = self.context.resolve_value(condition)
                        
                        # 如果解析后是布尔值或可以直接转换的值,直接使用
                        if isinstance(resolved_condition, bool):
                            should_continue = resolved_condition
                        elif isinstance(resolved_condition, str):
                            # 如果是字符串,尝试作为表达式评估
                            # 支持的表达式: {count} < 10, {index} >= 5, {value} == "test" 等
                            try:
                                # 创建安全的评估环境,只包含变量
                                eval_globals = {"__builtins__": {}}
                                eval_locals = dict(self.context.variables)
                                should_continue = bool(eval(resolved_condition, eval_globals, eval_locals))
                            except Exception as e:
                                # 如果表达式评估失败,尝试作为布尔值判断
                                should_continue = resolved_condition.lower() in ('true', '1') and resolved_condition.strip() != ''
                        else:
                            # 其他类型,转换为布尔值
                            should_continue = bool(resolved_condition)
                    except Exception as e:
                        await self._log(LogLevel.ERROR, f"循环条件评估失败: {str(e)}", node_id=loop_node.id)
                        should_continue = False
            elif loop_type == 'foreach':
                should_continue = loop_state['current_index'] < len(loop_state['data'])
            elif loop_type == 'infinite':
                # 无限循环，总是返回True，只能通过break_loop退出
                should_continue = True
            elif loop_type == 'foreach_dict':
                # 遍历字典
                should_continue = loop_state['current_index'] < len(loop_state['data'])
            
            if not should_continue:
                break
            
            self.context.should_continue = False
            
            if body_nodes:
                async with self._node_lock:
                    for nid in body_nodes:
                        self._executed_node_ids.discard(nid)
                        self._executing_node_ids.discard(nid)
                
                # 收集循环体内的所有节点
                all_body_nodes = await self._collect_loop_body_nodes(body_nodes)
                
                # 收集错误处理分支的节点
                error_branch_nodes = self._collect_error_branch_nodes(all_body_nodes)
                
                async with self._node_lock:
                    # 清除循环体节点的执行状态
                    for nid in all_body_nodes:
                        self._executed_node_ids.discard(nid)
                        self._executing_node_ids.discard(nid)
                        # 清除待处理节点的前驱等待状态
                        if nid in self._pending_nodes:
                            del self._pending_nodes[nid]
                    
                    # 清除错误处理分支节点的执行状态（这样下次循环如果再报错，错误处理流程可以再次执行）
                    for nid in error_branch_nodes:
                        self._executed_node_ids.discard(nid)
                        self._executing_node_ids.discard(nid)
                        if nid in self._pending_nodes:
                            del self._pending_nodes[nid]
                
                await self._execute_parallel(body_nodes)
            
            if self.context.should_break:
                self.context.should_break = False
                break
            
            if loop_type == 'count':
                loop_state['current_index'] += 1
                self.context.set_variable(loop_state['index_variable'], loop_state['current_index'])
            elif loop_type == 'range':
                loop_state['current_index'] += loop_state['step_value']
                self.context.set_variable(loop_state['index_variable'], loop_state['current_index'])
            elif loop_type == 'foreach':
                loop_state['current_index'] += 1
                if loop_state['current_index'] < len(loop_state['data']):
                    self.context.set_variable(loop_state['item_variable'], 
                                              loop_state['data'][loop_state['current_index']])
                    self.context.set_variable(loop_state['index_variable'], loop_state['current_index'])
            elif loop_type == 'infinite':
                # 无限循环，索引递增
                loop_state['current_index'] += 1
                self.context.set_variable(loop_state['index_variable'], loop_state['current_index'])
            elif loop_type == 'foreach_dict':
                # 遍历字典
                loop_state['current_index'] += 1
                if loop_state['current_index'] < len(loop_state['data']):
                    key, value = loop_state['data'][loop_state['current_index']]
                    self.context.set_variable(loop_state['key_variable'], key)
                    self.context.set_variable(loop_state['value_variable'], value)
                    self.context.set_variable(loop_state['index_variable'], loop_state['current_index'])
        
        if self.context.loop_stack:
            self.context.loop_stack.pop()
        
        if done_nodes and not self.should_stop:
            await self._execute_parallel(done_nodes)

    async def _collect_loop_body_nodes(self, start_nodes: list[str]) -> set[str]:
        """收集循环体内的所有节点（包括条件分支的所有路径）
        
        注意：不收集错误处理分支的节点，因为错误处理分支只在节点失败时才执行。
        错误处理分支的节点会在 _collect_error_branch_nodes 中单独收集。
        """
        collected = set()
        to_visit = list(start_nodes)
        
        while to_visit:
            node_id = to_visit.pop(0)
            if node_id in collected:
                continue
            collected.add(node_id)
            
            node = self.graph.get_node(node_id)
            if not node:
                continue
            
            # 获取所有后继节点
            next_nodes = []
            
            # 如果是条件节点，获取所有分支
            if node.type in ('condition', 'face_recognition', 'element_exists', 'element_visible', 'image_exists', 'phone_image_exists', 'probability_trigger'):
                if node_id in self.graph.condition_branches:
                    # condition_branches[node_id] 是 {handle: list[target_id]}
                    for branch_targets in self.graph.condition_branches[node_id].values():
                        for branch_target in branch_targets:
                            if branch_target:
                                next_nodes.append(branch_target)
            # 如果是循环节点，获取循环体和完成分支
            elif node.type in ('loop', 'foreach', 'infinite_loop', 'foreach_dict'):
                if node_id in self.graph.loop_branches:
                    for branch_targets in self.graph.loop_branches[node_id].values():
                        next_nodes.extend(branch_targets)
            else:
                # 普通节点，获取默认后继
                next_nodes = self.graph.get_next_nodes(node_id)
            
            for next_id in next_nodes:
                if next_id not in collected:
                    to_visit.append(next_id)
        
        return collected

    def _collect_error_branch_nodes(self, body_nodes: set[str]) -> set[str]:
        """收集循环体内所有节点的错误处理分支节点"""
        error_nodes = set()
        to_visit = []
        
        # 首先收集循环体内所有节点的直接错误处理分支
        for node_id in body_nodes:
            error_branch_nodes = self.graph.get_error_nodes(node_id)
            for error_node_id in error_branch_nodes:
                if error_node_id not in body_nodes and error_node_id not in error_nodes:
                    to_visit.append(error_node_id)
        
        # 然后递归收集错误处理分支的后继节点
        while to_visit:
            node_id = to_visit.pop(0)
            if node_id in error_nodes or node_id in body_nodes:
                continue
            error_nodes.add(node_id)
            
            node = self.graph.get_node(node_id)
            if not node:
                continue
            
            # 获取后继节点
            next_nodes = self.graph.get_next_nodes(node_id)
            for next_id in next_nodes:
                if next_id not in error_nodes and next_id not in body_nodes:
                    to_visit.append(next_id)
            
            # 错误处理分支的节点也可能有自己的错误处理分支
            error_branch_nodes = self.graph.get_error_nodes(node_id)
            for error_node_id in error_branch_nodes:
                if error_node_id not in error_nodes and error_node_id not in body_nodes:
                    to_visit.append(error_node_id)
        
        return error_nodes

    async def _cleanup(self):
        """清理资源（内部方法，清理所有资源包括浏览器）"""
        try:
            # 终止所有正在运行的 FFmpeg 进程
            try:
                from app.executors.media import ffmpeg_manager
                await ffmpeg_manager.terminate_all()
            except Exception as e:
                print(f"清理 FFmpeg 进程时出错: {e}")
            
            if self.context.page:
                try:
                    await self.context.page.close()
                except Exception:
                    pass
                self.context.page = None
            
            if self.context.browser_context:
                try:
                    await self.context.browser_context.close()
                except Exception:
                    pass
                self.context.browser_context = None
            
            if self.context.browser:
                try:
                    await self.context.browser.close()
                except Exception:
                    pass
                self.context.browser = None
            
            if self.context._playwright:
                try:
                    await self.context._playwright.stop()
                except Exception:
                    pass
                self.context._playwright = None
            
            # 清理上下文中的数据，防止内存泄漏
            self.context.variables.clear()
            self.context.data_rows.clear()
            self.context.current_row.clear()
            self.context.loop_stack.clear()
            
            # 清理执行器内部状态
            self._executed_node_ids.clear()
            self._executing_node_ids.clear()
            self._pending_nodes.clear()
            self._running_tasks.clear()
            self.graph = None
            
        except Exception as e:
            print(f"清理资源时出错: {e}")
    
    async def cleanup(self):
        """清理浏览器资源（公共方法，仅清理浏览器）"""
        try:
            # 检查是否在使用共享的 browser_engine context，如果是则不关闭
            from app.services import browser_engine as _be
            using_shared = (_be.is_open() and
                            self.context.browser_context is not None and
                            self.context.browser_context is _be.get_context())
            if using_shared:
                print("[WorkflowExecutor] 使用共享浏览器 context，跳过关闭操作")
                self.context.page = None
                self.context.browser_context = None
                self.context._playwright = None
                return

            if self.context.page:
                try:
                    await self.context.page.close()
                except Exception:
                    pass
                self.context.page = None

            if self.context.browser_context:
                try:
                    await self.context.browser_context.close()
                except Exception:
                    pass
                self.context.browser_context = None

            if self.context.browser:
                try:
                    await self.context.browser.close()
                except Exception:
                    pass
                self.context.browser = None

            if self.context._playwright:
                try:
                    await self.context._playwright.stop()
                except Exception:
                    pass
                self.context._playwright = None
        except Exception as e:
            print(f"关闭浏览器时出错: {e}")

    async def execute(self) -> ExecutionResult:
        """执行工作流"""
        from playwright.async_api import async_playwright
        import os
        
        self.is_running = True
        self.should_stop = False
        self.start_time = datetime.now()
        self.executed_nodes = 0
        self.failed_nodes = 0
        self._executed_node_ids.clear()
        self._executing_node_ids.clear()
        self._pending_nodes.clear()
        self._last_data_rows_count = 0
        self._sent_data_rows_count = 0
        self._running_tasks.clear()
        
        self.context.variables.clear()
        self.context.data_rows.clear()
        self.context.current_row.clear()
        self.context.loop_stack.clear()
        self.context.should_break = False
        self.context.should_continue = False
        
        for var in self.workflow.variables:
            self.context.set_variable(var.name, var.value)
        
        # 初始化内置 ERROR 变量（隐含全局变量，不在变量面板显示）
        self.context.set_variable('ERROR', None)
        
        await self._log(LogLevel.INFO, "🚀 工作流开始执行", is_system_log=True)
        
        try:
            parser = WorkflowParser(self.workflow)
            self.graph = parser.parse()
            
            # 优先复用 browser_engine 已有的共享 Playwright context（浏览器已手动打开）
            from app.services import browser_engine as _be
            if _be.is_open():
                # 浏览器已在主进程中启动，直接共享 context 和 playwright
                shared_ctx = _be.get_context()
                self.context.browser_context = shared_ctx
                self.context._playwright = _be._playwright
                # 获取当前活跃页面（非空白页）
                real_pages = [p for p in shared_ctx.pages
                              if p.url not in ("about:blank", "chrome://newtab/", "")]
                if real_pages:
                    self.context.page = real_pages[-1]
                    print(f"[WorkflowExecutor] 复用已打开的页面: {self.context.page.url}")
                elif shared_ctx.pages:
                    self.context.page = shared_ctx.pages[-1]
                    print(f"[WorkflowExecutor] 复用浏览器页面: {self.context.page.url}")
                print(f"[WorkflowExecutor] 已复用全局浏览器 context（共 {len(shared_ctx.pages)} 个页面）")
            else:
                playwright = await async_playwright().start()
                self.context._playwright = playwright
            
            # 获取浏览器数据目录：优先使用全局配置，否则使用默认目录
            if self.browser_config and self.browser_config.get('userDataDir'):
                user_data_dir_base = self.browser_config.get('userDataDir')
            else:
                # 使用默认目录（获取绝对路径）
                backend_dir = os.path.abspath(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
                user_data_dir_base = os.path.join(backend_dir, 'browser_data')
            
            # 获取浏览器类型，为不同浏览器使用不同的子目录
            browser_type = self.browser_config.get('type', 'msedge') if self.browser_config else 'msedge'
            user_data_dir = os.path.join(user_data_dir_base, browser_type)
            
            # 确保目录存在
            os.makedirs(user_data_dir, exist_ok=True)
            self.context._user_data_dir = user_data_dir
            print(f"[WorkflowExecutor] 使用浏览器数据目录: {user_data_dir}")
            
            # 收集所有子流程分组内的节点ID（这些节点不应该被主流程直接执行）
            self._subflow_node_ids = self._get_subflow_node_ids()
            
            start_nodes = self.graph.get_start_nodes()
            # 过滤掉子流程内的起始节点
            start_nodes = [nid for nid in start_nodes if nid not in self._subflow_node_ids]
            
            # 调试：打印起始节点信息
            print(f"[DEBUG] 找到 {len(start_nodes)} 个起始节点:")
            for nid in start_nodes:
                node = self.graph.get_node(nid)
                if node:
                    label = node.data.get('label', node.type)
                    print(f"  - {nid}: {node.type} ({label})")
            
            # 调试：打印所有节点和边的信息
            print(f"[DEBUG] 工作流共有 {len(self.graph.nodes)} 个节点:")
            for nid, node in self.graph.nodes.items():
                label = node.data.get('label', node.type)
                prev_nodes = self.graph.get_prev_nodes(nid)
                next_nodes = self.graph.get_next_nodes(nid)
                print(f"  - {nid}: {node.type} ({label})")
                print(f"    前驱: {prev_nodes}")
                print(f"    后继: {next_nodes}")
            
            if not start_nodes:
                await self._log(LogLevel.WARNING, "没有找到起始节点")
            else:
                await self._execute_parallel(start_nodes)
            
            if self.context.current_row:
                self.context.commit_row()
                if len(self.context.data_rows) > self._last_data_rows_count:
                    for i in range(self._last_data_rows_count, len(self.context.data_rows)):
                        await self._send_data_row(self.context.data_rows[i])
            
            if self.should_stop:
                status = ExecutionStatus.STOPPED
                await self._log(LogLevel.WARNING, "⏹️ 工作流已停止", is_system_log=True)
            elif self.failed_nodes > 0:
                status = ExecutionStatus.FAILED
                await self._log(LogLevel.ERROR, f"❌ 工作流执行完成，有 {self.failed_nodes} 个节点失败", is_system_log=True)
            else:
                status = ExecutionStatus.COMPLETED
                duration = (datetime.now() - self.start_time).total_seconds()
                await self._log(LogLevel.SUCCESS, f"✅ 工作流执行完成，共执行 {self.executed_nodes} 个节点，耗时 {duration:.2f}秒", is_system_log=True)
            
            self._result = ExecutionResult(
                workflow_id=self.workflow.id,
                status=status,
                started_at=self.start_time,
                completed_at=datetime.now(),
                total_nodes=len(self.workflow.nodes),
                executed_nodes=self.executed_nodes,
                failed_nodes=self.failed_nodes,
            )
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            await self._log(LogLevel.ERROR, f"💥 工作流执行异常: {str(e)}", is_system_log=True)
            self._result = ExecutionResult(
                workflow_id=self.workflow.id,
                status=ExecutionStatus.FAILED,
                started_at=self.start_time,
                completed_at=datetime.now(),
                total_nodes=len(self.workflow.nodes),
                executed_nodes=self.executed_nodes,
                failed_nodes=self.failed_nodes,
                error_message=str(e),
            )
        finally:
            # 注意：不在这里自动清理浏览器，由调用方根据 autoCloseBrowser 配置决定是否关闭
            # 但需要清理其他资源
            try:
                # 恢复手机输入法（如果之前切换过）
                try:
                    original_ime = self.context.variables.get('original_ime')
                    if original_ime:
                        print(f"[WorkflowExecutor] 恢复原输入法: {original_ime}")
                        from app.services.adb_manager import get_adb_manager
                        adb = get_adb_manager()
                        success, error = adb.restore_ime(original_ime)
                        if success:
                            print(f"[WorkflowExecutor] 输入法已恢复")
                        else:
                            print(f"[WorkflowExecutor] 恢复输入法失败: {error}")
                        # 清除变量
                        del self.context.variables['original_ime']
                except Exception as e:
                    print(f"恢复输入法时出错: {e}")
                
                # 终止所有正在运行的 FFmpeg 进程
                try:
                    from app.executors.media import ffmpeg_manager
                    await ffmpeg_manager.terminate_all()
                except Exception as e:
                    print(f"清理 FFmpeg 进程时出错: {e}")
                
                # 清理上下文中的数据，防止内存泄漏
                # ⚠️ 注意：不要清空 variables，因为外部需要保存全局变量
                # self.context.variables.clear()  # ❌ 不要清空！
                # ⚠️ 先把收集到的完整数据快照下来，再清空。
                # 否则 run_execution 在 execute() 返回后调用 get_collected_data()
                # 时 data_rows 已被清空，导致"下载完整数据"只剩前端实时预览的那部分。
                if self.context.current_row:
                    self.context.commit_row()
                self._collected_snapshot = list(self.context.data_rows)
                self.context.data_rows.clear()
                self.context.current_row.clear()
                self.context.loop_stack.clear()
                
                # 清理执行器内部状态
                self._executed_node_ids.clear()
                self._executing_node_ids.clear()
                self._pending_nodes.clear()
                self._running_tasks.clear()
                self.graph = None
            except Exception as e:
                print(f"清理资源时出错: {e}")
            
            self.is_running = False
        
        return self._result

    async def stop(self):
        """停止工作流执行 - 立即强制停止所有操作"""
        self.should_stop = True
        # 若正处于调试暂停态，先释放闸门，让被 await 的节点能继续走到停止逻辑
        self.debug_enabled = False
        self.step_mode = False
        try:
            self._resume_event.set()
        except Exception:
            pass
        await self._log(LogLevel.WARNING, "正在停止工作流...", is_system_log=True)
        
        # 1. 终止所有正在运行的 FFmpeg 进程
        try:
            from app.executors.media import ffmpeg_manager
            await ffmpeg_manager.terminate_all()
        except Exception as e:
            print(f"终止 FFmpeg 进程时出错: {e}")
        
        # 2. 取消所有正在运行的任务（在锁内 snapshot 一份再取消）
        async with self._node_lock:
            running_snapshot = list(self._running_tasks)
        for task in running_snapshot:
            if not task.done():
                task.cancel()
        
        # 等待任务取消完成（最多3秒）
        if running_snapshot:
            try:
                await asyncio.wait(running_snapshot, timeout=3.0)
            except Exception:
                pass
        async with self._node_lock:
            self._running_tasks.clear()
        
        # 3. 强制关闭浏览器以中断正在进行的操作
        try:
            if self.context.page:
                try:
                    await self.context.page.close()
                except Exception:
                    pass
                self.context.page = None
            
            if self.context.browser_context:
                try:
                    await self.context.browser_context.close()
                except Exception:
                    pass
                self.context.browser_context = None
            
            if self.context.browser:
                try:
                    await self.context.browser.close()
                except Exception:
                    pass
                self.context.browser = None
            
            if self.context._playwright:
                try:
                    await self.context._playwright.stop()
                except Exception:
                    pass
                self.context._playwright = None
        except Exception as e:
            print(f"停止时关闭浏览器出错: {e}")
        
        self.is_running = False

    def get_collected_data(self) -> list[dict]:
        """获取收集的数据"""
        # 优先返回执行结束时的快照（execute() 的 finally 会在清空 data_rows 前快照），
        # 保证 run_execution 在 execute() 返回后仍能拿到本次执行的全部数据行。
        snapshot = getattr(self, "_collected_snapshot", None)
        if snapshot is not None:
            return list(snapshot)
        if self.context.current_row:
            self.context.commit_row()
        return self.context.data_rows.copy()
