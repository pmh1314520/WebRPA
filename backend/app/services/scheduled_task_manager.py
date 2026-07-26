"""计划任务调度管理服务"""
import asyncio
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Optional, List
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.date import DateTrigger
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger

from app.models.scheduled_task import (
    ScheduledTask,
    ScheduledTaskExecutionLog,
    ScheduledTaskExecutionLogCreate
)
from app.services.trigger_manager import trigger_manager
from app.utils.paths import BACKEND_DATA_DIR


class ScheduledTaskManager:
    """计划任务管理器（支持任务队列和Webhook触发）"""
    
    def __init__(self, data_dir: str | None = None):
        self.data_dir = Path(data_dir) if data_dir else BACKEND_DATA_DIR
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # 数据文件路径
        self.tasks_file = self.data_dir / "scheduled_tasks.json"
        self.logs_file = self.data_dir / "scheduled_task_logs.json"
        
        # 内存存储
        self.tasks: Dict[str, ScheduledTask] = {}
        self.logs: List[ScheduledTaskExecutionLog] = []
        
        # APScheduler调度器（延迟启动，等待事件循环）
        self.scheduler = AsyncIOScheduler()
        self.scheduler_started = False
        
        # 热键触发器映射
        self.hotkey_triggers: Dict[str, str] = {}  # trigger_id -> task_id
        
        # Webhook触发器映射
        self.webhook_triggers: Dict[str, str] = {}  # webhook_path -> task_id
        
        # 工作流执行回调
        self.workflow_executor_callback = None
        
        # 保存事件循环引用
        self.event_loop = None
        
        # 正在执行的任务（用于强制停止）
        self.running_tasks: Dict[str, asyncio.Task] = {}  # task_id -> asyncio.Task
        
        # 正在执行的工作流执行器（用于强制停止工作流）
        self.running_executors: Dict[str, any] = {}  # task_id -> WorkflowExecutor
        
        # 标记是否已执行启动触发器
        self.startup_triggers_executed = False
        
        # ========== 任务队列功能 ==========
        # 任务队列（FIFO）- 延迟初始化，等待事件循环
        self.task_queue: Optional[asyncio.Queue] = None
        # 队列处理任务
        self.queue_processor_task: Optional[asyncio.Task] = None
        # 队列是否正在处理
        self.queue_processing = False
        
        # 加载数据
        self._load_tasks()
        self._load_logs()
        
        print("[ScheduledTaskManager] 计划任务管理器已初始化（支持任务队列）")
    
    def set_workflow_executor(self, callback):
        """设置工作流执行回调函数"""
        print("[ScheduledTaskManager] set_workflow_executor 被调用")
        self.workflow_executor_callback = callback
        # 同时保存当前事件循环
        try:
            self.event_loop = asyncio.get_running_loop()
            print("[ScheduledTaskManager] 工作流执行器已初始化")
            
            # 初始化任务队列（在事件循环中）
            if self.task_queue is None:
                self.task_queue = asyncio.Queue()
                print("[ScheduledTaskManager] 任务队列已初始化")
            
            # 启动调度器（如果还没启动）
            if not self.scheduler_started:
                self.scheduler.start()
                self.scheduler_started = True
                print("[ScheduledTaskManager] APScheduler调度器已启动")
                
                # 注册所有已启用的任务触发器
                for task in self.tasks.values():
                    if task.enabled:
                        self._register_task_trigger(task)
                print(f"[ScheduledTaskManager] 已注册 {sum(1 for t in self.tasks.values() if t.enabled)} 个任务触发器")
            
            # 启动任务队列处理器
            if not self.queue_processor_task:
                print("[ScheduledTaskManager] 准备启动任务队列处理器...")
                self.queue_processor_task = asyncio.create_task(self._process_task_queue())
                print("[ScheduledTaskManager] 任务队列处理器已启动")
            else:
                print("[ScheduledTaskManager] 任务队列处理器已经在运行中")
            
            # 在工作流执行器初始化后,执行启动触发器(只执行一次)
            if not self.startup_triggers_executed:
                self._execute_startup_triggers()
                self.startup_triggers_executed = True
        except RuntimeError:
            print("[ScheduledTaskManager] 警告: 无法获取运行中的事件循环")
    
    # ==================== 任务队列处理 ====================
    
    async def _process_task_queue(self):
        """处理任务队列（确保任务按顺序执行，避免并发冲突）"""
        print("[ScheduledTaskManager] ========== 任务队列处理器开始运行 ==========")
        
        while True:
            task_id = None
            trigger_type = None
            try:
                print(f"[ScheduledTaskManager] 等待队列中的任务... (当前队列长度: {self.task_queue.qsize()})")
                
                # 从队列中获取任务
                task_id, trigger_type = await self.task_queue.get()

                # 出队时立刻从去重集合中移除（允许下一次入队）
                if hasattr(self, '_pending_queued_ids'):
                    self._pending_queued_ids.discard(task_id)

                # 标记队列正在处理
                self.queue_processing = True
                
                print(f"[ScheduledTaskManager] ========== 从队列中取出任务: {task_id} (触发方式: {trigger_type}) ==========")
                
                try:
                    # 执行任务（这里会阻塞直到任务完成）
                    await self._execute_task_internal(task_id, trigger_type)
                    print(f"[ScheduledTaskManager] ========== 任务执行完成: {task_id} ==========")
                except Exception as e:
                    print(f"[ScheduledTaskManager] ========== 任务执行异常: {task_id} - {e} ==========")
                    import traceback
                    traceback.print_exc()
                
            except asyncio.CancelledError:
                print("[ScheduledTaskManager] 任务队列处理器被取消")
                break
            except Exception as e:
                print(f"[ScheduledTaskManager] 任务队列处理器异常: {e}")
                import traceback
                traceback.print_exc()
            finally:
                # 无论如何都要标记任务完成，避免队列阻塞
                if task_id is not None:
                    self.task_queue.task_done()
                    print(f"[ScheduledTaskManager] 队列剩余: {self.task_queue.qsize()}")
                self.queue_processing = False
    
    async def enqueue_task(self, task_id: str, trigger_type: str):
        """将任务加入队列"""
        task = self.tasks.get(task_id)
        if not task:
            print(f"[ScheduledTaskManager] 任务不存在: {task_id}")
            return
        
        if not task.enabled:
            print(f"[ScheduledTaskManager] 任务已禁用: {task.name}")
            return
        
        # 检查队列是否已初始化
        if self.task_queue is None:
            print(f"[ScheduledTaskManager] 错误: 任务队列未初始化")
            return

        # 防重复：当前任务正在执行 或 已在队列中（同一 task_id），直接丢弃避免堆积
        if task.is_running:
            print(f"[ScheduledTaskManager] 任务正在执行，跳过本次入队: {task.name} (来源: {trigger_type})")
            return
        # 用 _pending_queued_ids 跟踪「已入队但未执行」的任务
        if not hasattr(self, '_pending_queued_ids'):
            self._pending_queued_ids = set()
        if task_id in self._pending_queued_ids:
            print(f"[ScheduledTaskManager] 任务已在队列中等待，跳过重复入队: {task.name} (来源: {trigger_type})")
            return
        self._pending_queued_ids.add(task_id)

        # 检查任务是否已在队列中
        print(f"[ScheduledTaskManager] 将任务加入队列: {task.name} (触发方式: {trigger_type})")
        await self.task_queue.put((task_id, trigger_type))
        print(f"[ScheduledTaskManager] 当前队列长度: {self.task_queue.qsize()}")
    
    # ==================== Webhook触发器 ====================
    
    @staticmethod
    def _normalize_webhook_path(path: str) -> str:
        """把 webhook 路径规范化为统一比较用的 key（忽略首尾斜杠与大小写差异）。

        历史问题：注册端会补前导「/」，而调用端可能带/不带斜杠、或带多余尾部斜杠，
        导致字典 key 不一致而报「Webhook路径未注册」。统一规范化后即可稳定匹配。
        """
        return (path or "").strip().strip("/").lower()

    def register_webhook_trigger(self, task_id: str, webhook_path: str):
        """注册Webhook触发器（同时登记规范化 key，避免斜杠/大小写不一致导致匹配失败）"""
        self.webhook_triggers[webhook_path] = task_id
        norm = self._normalize_webhook_path(webhook_path)
        if norm:
            self.webhook_triggers[norm] = task_id
        print(f"[ScheduledTaskManager] 注册Webhook触发器: {webhook_path} -> {task_id}")
    
    def unregister_webhook_trigger(self, webhook_path: str):
        """注销Webhook触发器（连带清理规范化 key 与指向同一任务的残留映射）"""
        task_id = self.webhook_triggers.get(webhook_path) or \
            self.webhook_triggers.get(self._normalize_webhook_path(webhook_path))
        for key in list(self.webhook_triggers.keys()):
            if key == webhook_path or key == self._normalize_webhook_path(webhook_path) or (
                task_id and self.webhook_triggers.get(key) == task_id
            ):
                del self.webhook_triggers[key]
        print(f"[ScheduledTaskManager] 注销Webhook触发器: {webhook_path}")

    def _resolve_webhook_task_id(self, webhook_path: str) -> Optional[str]:
        """按路径解析出目标任务 id。

        三级查找，保证「任务确实存在就一定能触发」：
          1) 精确匹配内存映射
          2) 规范化匹配内存映射（忽略首尾斜杠/大小写）
          3) 兜底遍历所有任务的 trigger.webhook_path 比对（覆盖内存映射因
             启用状态变更、进程重启时序等原因缺失的情况，并顺带补登记）
        """
        task_id = self.webhook_triggers.get(webhook_path)
        if task_id:
            return task_id
        norm = self._normalize_webhook_path(webhook_path)
        task_id = self.webhook_triggers.get(norm)
        if task_id:
            return task_id
        for task in self.tasks.values():
            trigger = getattr(task, "trigger", None)
            if not trigger or getattr(trigger, "type", "") != "webhook":
                continue
            if self._normalize_webhook_path(getattr(trigger, "webhook_path", "") or "") == norm and norm:
                # 补登记，后续走快速路径
                self.register_webhook_trigger(task.id, getattr(trigger, "webhook_path", "") or webhook_path)
                print(f"[ScheduledTaskManager] Webhook 映射缺失已自动补登记: {webhook_path} -> {task.id}")
                return task.id
        return None

    async def trigger_webhook(self, webhook_path: str, payload: dict = None) -> dict:
        """触发Webhook任务"""
        task_id = self._resolve_webhook_task_id(webhook_path)
        
        if not task_id:
            known = sorted({
                (getattr(t.trigger, "webhook_path", "") or "")
                for t in self.tasks.values()
                if getattr(getattr(t, "trigger", None), "type", "") == "webhook"
            } - {""})
            return {
                'success': False,
                'error': (
                    f'Webhook路径未注册: {webhook_path}。'
                    + (f'当前已配置的 Webhook 路径：{", ".join(known)}。' if known
                       else '当前没有任何 Webhook 类型的计划任务，请先在「计划任务」中创建触发方式为 Webhook 的任务。')
                )
            }
        
        task = self.tasks.get(task_id)
        if not task:
            return {
                'success': False,
                'error': f'任务不存在: {task_id}'
            }
        
        if not task.enabled:
            return {
                'success': False,
                'error': f'任务已禁用: {task.name}'
            }
        
        print(f"[ScheduledTaskManager] Webhook触发任务: {task.name} (路径: {webhook_path})")
        
        # 将任务加入队列
        await self.enqueue_task(task_id, 'webhook')
        
        return {
            'success': True,
            'message': f'任务已加入执行队列: {task.name}',
            'task_id': task_id,
            'task_name': task.name,
            'queue_size': self.task_queue.qsize() if self.task_queue is not None else 0
        }
    
    # ==================== 任务管理 ====================
    
    def create_task(self, task: ScheduledTask) -> ScheduledTask:
        """创建计划任务"""
        self.tasks[task.id] = task
        self._save_tasks()
        
        # 如果任务已启用，注册触发器
        if task.enabled:
            self._register_task_trigger(task)
        
        print(f"[ScheduledTaskManager] 创建任务: {task.name} ({task.id})")
        return task
    
    def get_task(self, task_id: str) -> Optional[ScheduledTask]:
        """获取计划任务"""
        return self.tasks.get(task_id)
    
    def list_tasks(self) -> List[ScheduledTask]:
        """获取所有计划任务"""
        return list(self.tasks.values())
    
    def update_task(self, task_id: str, updates: dict) -> Optional[ScheduledTask]:
        """更新计划任务"""
        task = self.tasks.get(task_id)
        if not task:
            return None
        
        # 保存旧的启用状态
        old_enabled = task.enabled
        
        # 更新字段
        for key, value in updates.items():
            if value is not None and hasattr(task, key):
                # 如果是 trigger 字段，需要转换为对象
                if key == 'trigger' and isinstance(value, dict):
                    from app.models.scheduled_task import ScheduledTaskTrigger
                    value = ScheduledTaskTrigger(**value)
                setattr(task, key, value)
        
        task.updated_at = datetime.now().isoformat()
        self._save_tasks()
        
        # 如果启用状态或触发器配置改变，重新注册触发器
        if old_enabled != task.enabled or 'trigger' in updates:
            self._unregister_task_trigger(task)
            if task.enabled:
                self._register_task_trigger(task)
        
        print(f"[ScheduledTaskManager] 更新任务: {task.name} ({task_id})")
        return task
    
    def delete_task(self, task_id: str) -> bool:
        """删除计划任务"""
        task = self.tasks.get(task_id)
        if not task:
            return False
        
        # 注销触发器
        self._unregister_task_trigger(task)
        
        # 删除任务
        del self.tasks[task_id]
        self._save_tasks()
        
        print(f"[ScheduledTaskManager] 删除任务: {task.name} ({task_id})")
        return True
    
    def toggle_task(self, task_id: str, enabled: bool) -> Optional[ScheduledTask]:
        """启用/禁用计划任务"""
        return self.update_task(task_id, {'enabled': enabled})
    
    # ==================== 触发器注册 ====================
    
    def _register_task_trigger(self, task: ScheduledTask):
        """注册任务触发器"""
        trigger = task.trigger
        
        if trigger.type == 'time':
            self._register_time_trigger(task)
        elif trigger.type == 'hotkey':
            self._register_hotkey_trigger(task)
        elif trigger.type == 'webhook':
            self._register_webhook_trigger_for_task(task)
        elif trigger.type == 'startup':
            # 启动触发器不在这里注册,而是在服务启动时统一执行
            pass
    
    def _unregister_task_trigger(self, task: ScheduledTask):
        """注销任务触发器"""
        trigger = task.trigger
        
        if trigger.type == 'time':
            # 移除APScheduler任务
            try:
                self.scheduler.remove_job(task.id)
            except Exception:
                pass
        elif trigger.type == 'hotkey':
            # 移除热键触发器
            for trigger_id, task_id in list(self.hotkey_triggers.items()):
                if task_id == task.id:
                    trigger_manager.unregister_hotkey(trigger_id)
                    del self.hotkey_triggers[trigger_id]
        elif trigger.type == 'webhook':
            # 移除Webhook触发器
            webhook_path = trigger.webhook_path
            if webhook_path and webhook_path in self.webhook_triggers:
                self.unregister_webhook_trigger(webhook_path)
        elif trigger.type == 'startup':
            # 启动触发器不需要注销
            pass
    
    def _register_webhook_trigger_for_task(self, task: ScheduledTask):
        """为任务注册Webhook触发器"""
        trigger = task.trigger
        webhook_path = trigger.webhook_path
        
        if not webhook_path:
            return
        
        # 确保路径以/开头
        if not webhook_path.startswith('/'):
            webhook_path = '/' + webhook_path
        
        self.register_webhook_trigger(task.id, webhook_path)
        print(f"[ScheduledTaskManager] 为任务注册Webhook触发器: {task.name} ({webhook_path})")
    
    def _register_time_trigger(self, task: ScheduledTask):
        """注册时间触发器"""
        trigger = task.trigger
        schedule_type = trigger.schedule_type
        
        try:
            if schedule_type == 'once':
                # 一次性执行
                start_datetime = datetime.fromisoformat(f"{trigger.start_date} {trigger.start_time}")
                apscheduler_trigger = DateTrigger(run_date=start_datetime)
                
            elif schedule_type == 'daily':
                # 每日执行
                hour, minute, second = map(int, trigger.daily_time.split(':'))
                apscheduler_trigger = CronTrigger(hour=hour, minute=minute, second=second)
                
            elif schedule_type == 'weekly':
                # 每周执行
                if not trigger.weekly_days:
                    print(f"[ScheduledTaskManager] 周触发器缺少 weekly_days: {task.name}")
                    return
                hour, minute, second = map(int, trigger.weekly_time.split(':'))
                # APScheduler的day_of_week: 0=周一, 6=周日
                # 我们的weekly_days: 0=周日, 1=周一, ...
                # 需要转换
                days_of_week = ','.join([str((day - 1) % 7) for day in trigger.weekly_days])
                apscheduler_trigger = CronTrigger(
                    day_of_week=days_of_week,
                    hour=hour,
                    minute=minute,
                    second=second
                )
                
            elif schedule_type == 'monthly':
                # 每月执行
                hour, minute, second = map(int, trigger.monthly_time.split(':'))
                apscheduler_trigger = CronTrigger(
                    day=trigger.monthly_day,
                    hour=hour,
                    minute=minute,
                    second=second
                )
                
            elif schedule_type == 'interval':
                # 间隔执行
                apscheduler_trigger = IntervalTrigger(seconds=trigger.interval_seconds)
            
            else:
                print(f"[ScheduledTaskManager] 未知的调度类型: {schedule_type}")
                return
            
            # 添加到调度器（使用事件循环调度）
            self.scheduler.add_job(
                func=lambda: self._schedule_task_from_sync(task.id, 'time'),
                trigger=apscheduler_trigger,
                id=task.id,
                replace_existing=True
            )
            
            # 更新下次执行时间
            job = self.scheduler.get_job(task.id)
            if job and job.next_run_time:
                task.next_execution_time = job.next_run_time.isoformat()
                self._save_tasks()
            
            print(f"[ScheduledTaskManager] 注册时间触发器: {task.name} ({schedule_type})")
            
        except Exception as e:
            print(f"[ScheduledTaskManager] 注册时间触发器失败: {e}")
    
    def _register_hotkey_trigger(self, task: ScheduledTask):
        """注册热键触发器"""
        trigger = task.trigger
        hotkey = trigger.hotkey
        
        if not hotkey:
            return
        
        # 创建回调函数 - 使用队列方式执行
        def callback():
            try:
                if self.event_loop and not self.event_loop.is_closed():
                    asyncio.run_coroutine_threadsafe(
                        self.enqueue_task(task.id, 'hotkey'),
                        self.event_loop
                    )
                else:
                    print(f"[ScheduledTaskManager] 事件循环不可用,无法执行热键任务")
            except Exception as e:
                print(f"[ScheduledTaskManager] 热键回调异常: {e}")
        
        # 注册热键
        trigger_id = trigger_manager.register_hotkey(hotkey, callback)
        self.hotkey_triggers[trigger_id] = task.id
        
        print(f"[ScheduledTaskManager] 注册热键触发器: {task.name} ({hotkey})")
    
    def _register_startup_trigger(self, task: ScheduledTask):
        """注册启动触发器 - 已废弃,改用_execute_startup_triggers"""
        pass
    
    def _schedule_task_from_sync(self, task_id: str, trigger_type: str):
        """从同步上下文调度任务（用于APScheduler回调）"""
        try:
            if self.event_loop and not self.event_loop.is_closed():
                asyncio.run_coroutine_threadsafe(
                    self.enqueue_task(task_id, trigger_type),
                    self.event_loop
                )
            else:
                print(f"[ScheduledTaskManager] 事件循环不可用，无法调度任务")
        except Exception as e:
            print(f"[ScheduledTaskManager] 调度任务异常: {e}")
    
    def _execute_startup_triggers(self):
        """执行所有启动触发器(仅在服务启动时执行一次)"""
        startup_tasks = [task for task in self.tasks.values() 
                        if task.enabled and task.trigger.type == 'startup']
        
        if not startup_tasks:
            return
        
        print(f"[ScheduledTaskManager] 发现 {len(startup_tasks)} 个启动触发任务")
        
        for task in startup_tasks:
            delay = task.trigger.startup_delay or 0
            
            # 延迟执行（使用队列）
            async def delayed_execute(task_id: str, task_name: str, delay_seconds: int):
                if delay_seconds > 0:
                    print(f"[ScheduledTaskManager] 启动任务 {task_name} 将在 {delay_seconds} 秒后执行")
                    await asyncio.sleep(delay_seconds)
                await self.enqueue_task(task_id, 'startup')
            
            # 使用事件循环调度
            if self.event_loop:
                asyncio.run_coroutine_threadsafe(
                    delayed_execute(task.id, task.name, delay),
                    self.event_loop
                )
                print(f"[ScheduledTaskManager] 已调度启动任务: {task.name} (延迟{delay}秒)")
    
    # ==================== 任务执行 ====================

    def _dispatch_notification(self, task, log):
        """根据任务的通知设置，在执行结束后外发通知（失败/成功）。

        使用后台线程执行（notifier 内部为同步 HTTP/SMTP），避免阻塞事件循环。
        """
        try:
            status = getattr(log, 'status', None)
            notify_fail = getattr(task, 'notify_on_failure', False)
            notify_ok = getattr(task, 'notify_on_success', False)
            channels = getattr(task, 'notify_channels', None) or []
            if not channels:
                return
            should = (status == 'failed' and notify_fail) or (status == 'success' and notify_ok)
            if not should:
                return

            status_cn = {'failed': '失败', 'success': '成功', 'stopped': '已停止'}.get(status, status or '未知')
            title = f"[WebRPA] 任务「{task.name}」执行{status_cn}"
            lines = [
                f"任务：{task.name}",
                f"工作流：{getattr(task, 'workflow_name', '') or getattr(task, 'workflow_id', '')}",
                f"状态：{status_cn}",
                f"开始：{getattr(log, 'start_time', '')}",
                f"结束：{getattr(log, 'end_time', '')}",
                f"耗时：{getattr(log, 'duration', 0)} 秒",
                f"执行节点：{getattr(log, 'executed_nodes', 0)}，失败节点：{getattr(log, 'failed_nodes', 0)}",
            ]
            if getattr(log, 'error', None):
                lines.append(f"错误：{log.error}")
            content = "\n".join(lines)

            import threading
            from app.services import notifier

            def _run():
                try:
                    notifier.notify_all(channels, title, content)
                except Exception as e:
                    print(f"[ScheduledTaskManager] 通知发送失败: {e}")

            threading.Thread(target=_run, daemon=True).start()
        except Exception as e:
            print(f"[ScheduledTaskManager] 组装通知失败: {e}")

    async def _execute_task_internal(self, task_id: str, trigger_type: str):
        """内部任务执行方法（由队列处理器调用）"""
        task = self.tasks.get(task_id)
        if not task:
            print(f"[ScheduledTaskManager] 任务不存在: {task_id}")
            return
        
        if not task.enabled:
            print(f"[ScheduledTaskManager] 任务已禁用: {task.name}")
            return
        
        if task.is_running:
            print(f"[ScheduledTaskManager] 任务正在执行中: {task.name}")
            return
        
        print(f"[ScheduledTaskManager] 开始执行任务: {task.name} (触发方式: {trigger_type})")
        
        # 标记为执行中
        task.is_running = True
        
        # 创建执行日志
        log = ScheduledTaskExecutionLog(
            task_id=task.id,
            task_name=task.name,
            workflow_id=task.workflow_id,
            workflow_name=task.workflow_name or '',
            trigger_type=trigger_type,
            trigger_time=datetime.now().isoformat(),
            start_time=datetime.now().isoformat(),
            status='running'
        )
        self.logs.append(log)
        self._save_logs()
        
        executor = None
        try:
            print(f"[ScheduledTaskManager] 开始调用工作流执行器: {task.workflow_id}")
            # 执行工作流
            if self.workflow_executor_callback:
                result = await self.workflow_executor_callback(task.workflow_id, task_id)
                print(f"[ScheduledTaskManager] 工作流执行器返回结果: {result.keys() if isinstance(result, dict) else type(result)}")
                executor = result.get('executor')  # 获取执行器引用
                
                # 保存执行器引用
                if executor:
                    self.running_executors[task_id] = executor
                
                # 更新日志
                log.end_time = datetime.now().isoformat()
                log.duration = (datetime.fromisoformat(log.end_time) - 
                               datetime.fromisoformat(log.start_time)).total_seconds()
                
                # 判断执行状态
                if result.get('stopped'):
                    # 任务被停止
                    log.status = 'stopped'
                    log.error = '任务被手动停止'
                elif result.get('success'):
                    # 任务成功
                    log.status = 'success'
                    log.error = None
                else:
                    # 任务失败
                    log.status = 'failed'
                    log.error = result.get('error')
                
                log.executed_nodes = result.get('executed_nodes', 0)
                log.failed_nodes = result.get('failed_nodes', 0)
                log.collected_data_count = len(result.get('collected_data', []))
                
                # 存储完整的执行日志
                if 'full_logs' in result:
                    log.workflow_logs = result['full_logs']
                
                # 更新任务统计
                task.total_executions += 1
                if log.status == 'success':
                    task.success_executions += 1
                else:
                    task.failed_executions += 1
                task.last_execution_time = log.end_time
                task.last_execution_status = log.status
                task.last_execution_error = log.error
                
                print(f"[ScheduledTaskManager] 任务执行完成: {task.name} ({log.status})")
            else:
                print(f"[ScheduledTaskManager] 工作流执行器未初始化")
                log.end_time = datetime.now().isoformat()
                log.duration = (datetime.fromisoformat(log.end_time) - 
                               datetime.fromisoformat(log.start_time)).total_seconds()
                log.status = 'failed'
                log.error = '工作流执行器未初始化'
                task.total_executions += 1
                task.failed_executions += 1
                task.last_execution_time = log.end_time
                task.last_execution_status = 'failed'
                task.last_execution_error = '工作流执行器未初始化'
                print(f"[ScheduledTaskManager] 工作流执行器未初始化")
        
        except asyncio.CancelledError:
            # 任务被取消
            log.end_time = datetime.now().isoformat()
            log.duration = (datetime.fromisoformat(log.end_time) - 
                           datetime.fromisoformat(log.start_time)).total_seconds()
            log.status = 'stopped'
            log.error = '任务被手动停止'
            task.total_executions += 1
            task.failed_executions += 1
            task.last_execution_time = log.end_time
            task.last_execution_status = 'stopped'
            task.last_execution_error = '任务被手动停止'
            print(f"[ScheduledTaskManager] 任务被取消: {task.name}")
            raise
        
        except Exception as e:
            print(f"[ScheduledTaskManager] 任务执行异常: {task.name} - {e}")
            import traceback
            traceback.print_exc()
            
            log.end_time = datetime.now().isoformat()
            log.duration = (datetime.fromisoformat(log.end_time) - 
                           datetime.fromisoformat(log.start_time)).total_seconds()
            log.status = 'failed'
            log.error = str(e)
            task.total_executions += 1
            task.failed_executions += 1
            task.last_execution_time = log.end_time
            task.last_execution_status = 'failed'
            task.last_execution_error = str(e)
            print(f"[ScheduledTaskManager] 任务执行失败: {task.name} - {e}")
        
        finally:
            print(f"[ScheduledTaskManager] 进入finally块，清理任务状态: {task.name}")
            # 标记为未执行
            task.is_running = False
            # 从运行任务列表中移除
            if task_id in self.running_tasks:
                del self.running_tasks[task_id]
            # 从执行器列表中移除
            if task_id in self.running_executors:
                del self.running_executors[task_id]
            self._save_tasks()
            self._save_logs()
            print(f"[ScheduledTaskManager] 任务状态已清理: {task.name}, is_running={task.is_running}")
            # 失败/成功通知（异步外发，不阻塞队列）
            try:
                self._dispatch_notification(task, log)
            except Exception as _ne:
                print(f"[ScheduledTaskManager] 通知派发异常: {_ne}")

        # 处理重复执行（移到 finally 外面，避免长 sleep 阻塞队列处理器）
        # 把 sleep 调度到独立 task，立刻返回让队列处理下一条
        if task.trigger.repeat_enabled and task.last_execution_status != 'stopped':
            task.current_repeat_count += 1
            if (task.trigger.repeat_count is None or
                task.current_repeat_count < task.trigger.repeat_count):
                interval = task.trigger.repeat_interval or 0
                async def _repeat_after(delay: float, tid: str, ttype: str):
                    try:
                        if delay > 0:
                            await asyncio.sleep(delay)
                        # 再次确认任务仍然存在且启用
                        latest = self.tasks.get(tid)
                        if latest and latest.enabled and not latest.is_running:
                            await self.enqueue_task(tid, ttype)
                    except asyncio.CancelledError:
                        pass
                    except Exception as e:
                        print(f"[ScheduledTaskManager] 重复任务调度失败: {e}")
                # 必须持有 task 引用，否则长 interval 期间该后台任务可能被 GC 回收，
                # 导致定时任务“悄悄不再重复”。用集合持引用 + 完成回调自动清理。
                _bg = self.__dict__.setdefault('_repeat_tasks', set())
                _rt = asyncio.create_task(_repeat_after(interval, task_id, trigger_type))
                _bg.add(_rt)
                _rt.add_done_callback(_bg.discard)
            else:
                # 重复完成，重置计数
                task.current_repeat_count = 0
                self._save_tasks()
    
    async def execute_task_manually(self, task_id: str):
        """手动执行任务（加入队列）"""
        await self.enqueue_task(task_id, 'manual')
    
    async def stop_task(self, task_id: str) -> bool:
        """强制停止正在执行的任务"""
        task = self.tasks.get(task_id)
        if not task:
            print(f"[ScheduledTaskManager] 任务不存在: {task_id}")
            return False
        
        if not task.is_running:
            print(f"[ScheduledTaskManager] 任务未在执行: {task.name}")
            return False
        
        print(f"[ScheduledTaskManager] 开始停止任务: {task.name}")
        
        # 1. 停止工作流执行器（这是关键！）
        if task_id in self.running_executors:
            executor = self.running_executors[task_id]
            try:
                print(f"[ScheduledTaskManager] 调用工作流执行器的 stop() 方法")
                await executor.stop()
                print(f"[ScheduledTaskManager] 工作流执行器已停止")
            except Exception as e:
                print(f"[ScheduledTaskManager] 停止工作流执行器时出错: {e}")
        
        # 2. 取消正在执行的异步任务
        if task_id in self.running_tasks:
            running_task = self.running_tasks[task_id]
            if not running_task.done():
                running_task.cancel()
                print(f"[ScheduledTaskManager] 已取消异步任务")
        
        # 3. 标记为未执行
        task.is_running = False
        self._save_tasks()
        
        # 4. 更新最后一条日志
        task_logs = [log for log in self.logs if log.task_id == task_id and log.status == 'running']
        if task_logs:
            latest_log = task_logs[-1]
            latest_log.end_time = datetime.now().isoformat()
            latest_log.duration = (datetime.fromisoformat(latest_log.end_time) - 
                                  datetime.fromisoformat(latest_log.start_time)).total_seconds()
            latest_log.status = 'stopped'
            latest_log.error = '任务被手动停止'
            self._save_logs()
        
        print(f"[ScheduledTaskManager] 任务已停止: {task.name}")
        return True
    
    # ==================== 执行日志管理 ====================
    
    def get_task_logs(self, task_id: str, limit: int = 100) -> List[ScheduledTaskExecutionLog]:
        """获取任务执行日志"""
        task_logs = [log for log in self.logs if log.task_id == task_id]
        # 按时间倒序排序
        task_logs.sort(key=lambda x: x.start_time, reverse=True)
        return task_logs[:limit]
    
    def get_all_logs(self, limit: int = 100) -> List[ScheduledTaskExecutionLog]:
        """获取所有执行日志"""
        sorted_logs = sorted(self.logs, key=lambda x: x.start_time, reverse=True)
        return sorted_logs[:limit]
    
    def clear_logs(self, task_id: Optional[str] = None):
        """清空执行日志"""
        if task_id:
            self.logs = [log for log in self.logs if log.task_id != task_id]
        else:
            self.logs = []
        self._save_logs()
    
    # ==================== 数据持久化 ====================
    
    def _load_tasks(self):
        """加载任务数据"""
        if self.tasks_file.exists():
            try:
                with open(self.tasks_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for task_data in data:
                        task = ScheduledTask(**task_data)
                        # 启动时强制重置运行态（防止上次崩溃时残留 is_running=True 导致永远跑不了）
                        task.is_running = False
                        # 重置重复计数（避免持久化的中间态）
                        if hasattr(task, 'current_repeat_count'):
                            task.current_repeat_count = 0
                        self.tasks[task.id] = task
                        # 注意：不在这里注册触发器，等待调度器启动后再注册
                print(f"[ScheduledTaskManager] 加载了 {len(self.tasks)} 个任务")
            except Exception as e:
                print(f"[ScheduledTaskManager] 加载任务失败: {e}")
    
    def _save_tasks(self):
        """保存任务数据"""
        try:
            # 兼容 Pydantic v1/v2
            data = []
            for task in self.tasks.values():
                if hasattr(task, 'model_dump'):
                    data.append(task.model_dump())
                else:
                    data.append(task.dict())
            with open(self.tasks_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2, default=str)
        except Exception as e:
            print(f"[ScheduledTaskManager] 保存任务失败: {e}")
    
    def _load_logs(self):
        """加载执行日志"""
        if self.logs_file.exists():
            try:
                with open(self.logs_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.logs = [ScheduledTaskExecutionLog(**log_data) for log_data in data]
                # 只保留最近1000条日志
                if len(self.logs) > 1000:
                    self.logs = sorted(self.logs, key=lambda x: x.start_time, reverse=True)[:1000]
                print(f"[ScheduledTaskManager] 加载了 {len(self.logs)} 条执行日志")
            except Exception as e:
                print(f"[ScheduledTaskManager] 加载日志失败: {e}")
    
    def _save_logs(self):
        """保存执行日志（带节流，避免高频写盘）

        节流策略：100ms 内的多次调用合并到一次延迟写入，确保最后一次状态一定落盘
        """
        try:
            import time as _time
            now = _time.time()

            if not hasattr(self, '_last_save_logs_at'):
                self._last_save_logs_at = 0.0
            if not hasattr(self, '_pending_save_handle'):
                self._pending_save_handle = None

            # 距上次保存不足 100ms 时，调度一个延迟写入任务（如果还没有的话）
            if now - self._last_save_logs_at < 0.1:
                if self._pending_save_handle is None:
                    try:
                        loop = self.event_loop or asyncio.get_event_loop()
                        if loop and not loop.is_closed():
                            def _flush():
                                self._pending_save_handle = None
                                self._do_save_logs()
                            self._pending_save_handle = loop.call_later(0.12, _flush)
                            return
                    except Exception:
                        pass
                else:
                    # 已有 pending flush，本次合并即可
                    return

            self._do_save_logs()
        except Exception as e:
            print(f"[ScheduledTaskManager] 保存日志失败: {e}")

    def _do_save_logs(self):
        """实际执行日志写入"""
        try:
            import time as _time
            self._last_save_logs_at = _time.time()
            # 只保存最近1000条日志
            logs_to_save = sorted(self.logs, key=lambda x: x.start_time, reverse=True)[:1000]
            # 兼容 Pydantic v1/v2
            data = []
            for log in logs_to_save:
                if hasattr(log, 'model_dump'):
                    data.append(log.model_dump())
                else:
                    data.append(log.dict())
            with open(self.logs_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2, default=str)
        except Exception as e:
            print(f"[ScheduledTaskManager] _do_save_logs 失败: {e}")


# 全局计划任务管理器实例
scheduled_task_manager = ScheduledTaskManager()
