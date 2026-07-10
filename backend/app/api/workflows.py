"""工作流API路由"""
import asyncio
from datetime import datetime
from typing import Optional, Any
from uuid import uuid4
from pathlib import Path

from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.models.workflow import Workflow, ExecutionResult, ExecutionStatus, LogEntry
from app.services.workflow_executor import WorkflowExecutor
from app.services.data_collector import DataExporter


router = APIRouter(prefix="/api/workflows", tags=["workflows"])

# Socket.IO实例将在运行时注入
sio = None

# 全局日志开关状态（从main.py移过来避免循环导入）
log_enabled_by_client: dict[str, bool] = {}

def set_sio(socketio_instance):
    """设置Socket.IO实例（避免循环导入）"""
    global sio
    sio = socketio_instance

def is_log_enabled() -> bool:
    """检查是否有客户端连接需要日志"""
    return len(log_enabled_by_client) > 0

def is_verbose_enabled() -> bool:
    """是否有客户端开启了“详细日志”。

    log_enabled_by_client[sid] 存的是该客户端的 verbose 开关：
    连接时默认 True，前端通过 set_verbose_log 切换。简洁模式（全部为 False）下，
    后端在 on_log 里就跳过前端会过滤掉的普通日志，避免海量无用日志灌满 WebSocket。
    """
    return any(bool(v) for v in log_enabled_by_client.values())

def set_log_enabled(sid: str, enabled: bool):
    """设置客户端的日志开关状态"""
    log_enabled_by_client[sid] = enabled

def remove_log_enabled(sid: str):
    """移除客户端的日志开关状态"""
    if sid in log_enabled_by_client:
        del log_enabled_by_client[sid]

# 存储工作流和执行状态
workflows_store: dict[str, Workflow] = {}
executions_store: dict[str, WorkflowExecutor] = {}
execution_results: dict[str, ExecutionResult] = {}
execution_data: dict[str, list[dict]] = {}
variable_tracking_store: dict[str, list[dict]] = {}  # 存储变量追踪记录
# 变量更新事件节流时间戳（每个工作流最近一次 emit 的单调时钟），避免高频变量更新灌满 WebSocket
_var_update_last_emit: dict[str, float] = {}
# 数据行批量推送队列：密集工作流可能每秒产生大量数据行，逐条 emit 会灌满 WebSocket，
# 这里合并成批（每满 N 条或定时）一次性推送，前端用虚拟滚动渲染，全量且不卡顿。
data_row_batch_queue: dict[str, list[dict]] = {}
data_row_batch_lock = asyncio.Lock()
DATA_ROW_BATCH_SIZE = 100

# ===== 完整收集数据的磁盘持久化 =====
# 内存里的 execution_data 只保留最近 10 次执行（LRU），且服务重启后会丢失。
# 为保证“下载完整数据”任何时候都能拿到全部行（即使内存已清/已重启），
# 每次执行完成时把全量数据落盘为 JSON，full 接口在内存缺失时回退读磁盘。
import json as _json_full
_FULL_DATA_DIR = Path("./data/_full_data")


def _persist_full_data(workflow_id: str, rows: list[dict]) -> None:
    """把本次执行的完整数据落盘（JSON），并更新 latest 指针。"""
    try:
        _FULL_DATA_DIR.mkdir(parents=True, exist_ok=True)
        # 文件名用 workflow_id 的安全化形式
        safe = "".join(c if (c.isalnum() or c in "-_") else "_" for c in str(workflow_id))
        payload = {"workflow_id": workflow_id, "rows": rows, "saved_at": datetime.now().isoformat()}
        target = _FULL_DATA_DIR / f"{safe}.json"
        with open(target, "w", encoding="utf-8") as f:
            _json_full.dump(payload, f, ensure_ascii=False)
        # 更新 latest 指针
        with open(_FULL_DATA_DIR / "_latest.json", "w", encoding="utf-8") as f:
            _json_full.dump({"workflow_id": workflow_id, "file": f"{safe}.json"}, f, ensure_ascii=False)
    except Exception as e:
        print(f"[_persist_full_data] 落盘失败: {e}")


def _load_persisted_full_data(workflow_id: str) -> Optional[list[dict]]:
    """从磁盘读取指定执行的完整数据。"""
    try:
        safe = "".join(c if (c.isalnum() or c in "-_") else "_" for c in str(workflow_id))
        target = _FULL_DATA_DIR / f"{safe}.json"
        if not target.exists():
            return None
        with open(target, "r", encoding="utf-8") as f:
            payload = _json_full.load(f)
        rows = payload.get("rows")
        return rows if isinstance(rows, list) else None
    except Exception as e:
        print(f"[_load_persisted_full_data] 读取失败: {e}")
        return None


def _load_latest_persisted_full_data() -> Optional[tuple[str, list[dict]]]:
    """从磁盘读取最近一次执行的完整数据，返回 (workflow_id, rows)。"""
    try:
        pointer = _FULL_DATA_DIR / "_latest.json"
        if not pointer.exists():
            return None
        with open(pointer, "r", encoding="utf-8") as f:
            info = _json_full.load(f)
        wid = info.get("workflow_id")
        fname = info.get("file")
        if not fname:
            return None
        target = _FULL_DATA_DIR / fname
        if not target.exists():
            return None
        with open(target, "r", encoding="utf-8") as f:
            payload = _json_full.load(f)
        rows = payload.get("rows")
        if isinstance(rows, list):
            return (wid, rows)
        return None
    except Exception as e:
        print(f"[_load_latest_persisted_full_data] 读取失败: {e}")
        return None


# 全局变量存储（在工作流执行之间持久化）

# 🔥 超高速批量日志发送 - 累积后批量发送，减少WebSocket传输次数
log_batch_queue: dict[str, list[dict]] = {}
log_batch_lock = asyncio.Lock()
log_batch_tasks: dict[str, asyncio.Task] = {}
BATCH_SIZE = 50  # 累积50条或5ms后发送
BATCH_INTERVAL = 0.005  # 5ms

async def batch_emit_log(workflow_id: str, log_data: dict):
    """发送日志到前端。

    早期为减少 WebSocket 次数采用 5ms 定时器批量发送，但当节点执行器跑同步阻塞
    代码时，事件循环被占满、5ms 定时器迟迟无法触发，导致日志被攒到工作流结束才
    一次性出现（非实时）。这里改为：先把同一“同步突发”里积压的日志连同当前这条
    一起立即冲刷，保证每次事件循环有空隙（如节点间的 await asyncio.sleep(0)）时
    日志就即时到达前端，实现实时滚动。
    """
    if sio is None:
        return
    async with log_batch_lock:
        queue = log_batch_queue.setdefault(workflow_id, [])
        queue.append(log_data)
        logs = queue
        log_batch_queue[workflow_id] = []
    if logs:
        await sio.emit('execution:log_batch', {
            'workflowId': workflow_id,
            'logs': logs
        })


async def flush_log_batch_for_workflow(workflow_id: str):
    """定时发送指定工作流的日志"""
    await asyncio.sleep(BATCH_INTERVAL)
    
    async with log_batch_lock:
        if workflow_id in log_batch_queue and log_batch_queue[workflow_id]:
            logs = log_batch_queue[workflow_id]
            log_batch_queue[workflow_id] = []
            await sio.emit('execution:log_batch', {
                'workflowId': workflow_id,
                'logs': logs
            })
        
        # 清理任务
        if workflow_id in log_batch_tasks:
            del log_batch_tasks[workflow_id]


async def flush_data_rows(workflow_id: str):
    """把累积的数据行一次性批量推送到前端（execution:data_row_batch）。"""
    if sio is None:
        return
    async with data_row_batch_lock:
        rows = data_row_batch_queue.get(workflow_id)
        if not rows:
            return
        data_row_batch_queue[workflow_id] = []
    await sio.emit('execution:data_row_batch', {
        'workflowId': workflow_id,
        'rows': rows,
    })
global_variables: dict[str, Any] = {}


class WorkflowCreate(BaseModel):
    name: str
    nodes: list[dict]
    edges: list[dict]
    variables: list[dict] = []


class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    nodes: Optional[list[dict]] = None
    edges: Optional[list[dict]] = None
    variables: Optional[list[dict]] = None


class BrowserConfig(BaseModel):
    type: str = 'msedge'
    executablePath: Optional[str] = None
    userDataDir: Optional[str] = None
    fullscreen: bool = False
    autoCloseBrowser: bool = False
    launchArgs: Optional[str] = None
    extensionDirs: Optional[str] = None


class ExecuteOptions(BaseModel):
    headless: bool = False
    browserConfig: Optional[BrowserConfig] = None
    # 可视化调试：断点节点 id 列表 + 是否单步模式
    breakpoints: Optional[list[str]] = None
    stepMode: bool = False
    # 调试便利：从指定节点开始运行（而非从最开头的起始节点）。为空则按默认起始节点执行。
    startNodeId: Optional[str] = None


@router.post("", response_model=dict)
async def create_workflow(data: WorkflowCreate):
    """创建工作流"""
    workflow_id = str(uuid4())
    
    workflow = Workflow(
        id=workflow_id,
        name=data.name,
        nodes=[],
        edges=[],
        variables=[],
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    
    # 转换节点和边
    from app.models.workflow import WorkflowNode, WorkflowEdge, Variable, Position
    
    for node_data in data.nodes:
        node = WorkflowNode(
            id=node_data['id'],
            type=node_data['type'],
            position=Position(**node_data['position']),
            data=node_data.get('data', {}),
            style=node_data.get('style'),
        )
        workflow.nodes.append(node)
    
    for edge_data in data.edges:
        edge = WorkflowEdge(
            id=edge_data['id'],
            source=edge_data['source'],
            target=edge_data['target'],
            sourceHandle=edge_data.get('sourceHandle'),
            targetHandle=edge_data.get('targetHandle'),
        )
        workflow.edges.append(edge)
    
    for var_data in data.variables:
        var = Variable(**var_data)
        workflow.variables.append(var)
    
    workflows_store[workflow_id] = workflow
    
    return {"id": workflow_id, "message": "工作流创建成功"}


@router.get("", response_model=list[dict])
async def list_workflows():
    """获取工作流列表"""
    return [
        {
            "id": w.id,
            "name": w.name,
            "nodeCount": len(w.nodes),
            "createdAt": w.created_at.isoformat(),
            "updatedAt": w.updated_at.isoformat(),
        }
        for w in workflows_store.values()
    ]


@router.get("/{workflow_id}")
async def get_workflow(workflow_id: str):
    """获取单个工作流"""
    workflow = workflows_store.get(workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="工作流不存在")
    
    return {
        "id": workflow.id,
        "name": workflow.name,
        "nodes": [
            {
                "id": n.id,
                "type": n.type,
                "position": {"x": n.position.x, "y": n.position.y},
                "data": n.data,
                "style": n.style,
            }
            for n in workflow.nodes
        ],
        "edges": [
            {
                "id": e.id,
                "source": e.source,
                "target": e.target,
                "sourceHandle": e.sourceHandle,
                "targetHandle": e.targetHandle,
            }
            for e in workflow.edges
        ],
        "variables": [
            {
                "name": v.name,
                "value": v.value,
                "type": v.type.value,
                "scope": v.scope,
            }
            for v in workflow.variables
        ],
        "createdAt": workflow.created_at.isoformat(),
        "updatedAt": workflow.updated_at.isoformat(),
    }


@router.put("/{workflow_id}")
async def update_workflow(workflow_id: str, data: WorkflowUpdate):
    """更新工作流"""
    workflow = workflows_store.get(workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="工作流不存在")
    
    from app.models.workflow import WorkflowNode, WorkflowEdge, Variable, Position
    
    if data.name is not None:
        workflow.name = data.name
    
    if data.nodes is not None:
        workflow.nodes = []
        for node_data in data.nodes:
            node = WorkflowNode(
                id=node_data['id'],
                type=node_data['type'],
                position=Position(**node_data['position']),
                data=node_data.get('data', {}),
                style=node_data.get('style'),
            )
            workflow.nodes.append(node)
    
    if data.edges is not None:
        workflow.edges = []
        for edge_data in data.edges:
            edge = WorkflowEdge(
                id=edge_data['id'],
                source=edge_data['source'],
                target=edge_data['target'],
                sourceHandle=edge_data.get('sourceHandle'),
                targetHandle=edge_data.get('targetHandle'),
            )
            workflow.edges.append(edge)
    
    if data.variables is not None:
        workflow.variables = []
        for var_data in data.variables:
            var = Variable(**var_data)
            workflow.variables.append(var)
    
    workflow.updated_at = datetime.now()
    
    return {"message": "工作流更新成功"}


@router.delete("/{workflow_id}")
async def delete_workflow(workflow_id: str):
    """删除工作流"""
    if workflow_id not in workflows_store:
        raise HTTPException(status_code=404, detail="工作流不存在")
    
    del workflows_store[workflow_id]
    return {"message": "工作流删除成功"}


@router.post("/{workflow_id}/execute")
async def execute_workflow(workflow_id: str, background_tasks: BackgroundTasks, options: ExecuteOptions = ExecuteOptions()):
    """执行工作流"""
    workflow = workflows_store.get(workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="工作流不存在")
    
    # 检查是否已在执行
    if workflow_id in executions_store:
        executor = executions_store[workflow_id]
        if executor.is_running:
            raise HTTPException(status_code=400, detail="工作流正在执行中")
    
    # 创建执行器
    async def on_log(log: LogEntry):
        # 检查是否有客户端启用了日志接收
        if not is_log_enabled():
            return
        
        # 判断是否是用户日志（打印日志模块）或系统日志（流程开始/结束）
        is_user_log = log.details.get('is_user_log', False) if log.details else False
        is_system_log = log.details.get('is_system_log', False) if log.details else False

        # ⚠️ 性能关键：简洁模式（未开启详细日志）下，前端只显示 用户日志/系统日志/错误/警告，
        # 其余普通 INFO 节点日志会被前端直接丢弃。若后端仍把它们全部 emit，密集循环工作流
        # 会产生成千上万条无用日志灌满 WebSocket 发送队列，导致真正要显示的日志被挤到结束
        # 才送达。这里在源头就按与前端一致的规则过滤，大幅降低 WebSocket 流量，实现实时日志。
        if not is_verbose_enabled():
            lvl = log.level.value if hasattr(log.level, 'value') else str(log.level)
            if not is_user_log and not is_system_log and lvl not in ('error', 'warning'):
                return
        
        # 将日志添加到批处理队列
        log_data = {
            'id': log.id,
            'timestamp': log.timestamp.isoformat(),
            'level': log.level.value,
            'nodeId': log.node_id,
            'message': log.message,
            'duration': log.duration,
            'isUserLog': is_user_log,
            'isSystemLog': is_system_log,
        }
        
        # 使用批量发送机制
        await batch_emit_log(workflow_id, log_data)
    
    async def on_node_start(node_id: str):
        await sio.emit('execution:node_start', {
            'workflowId': workflow_id,
            'nodeId': node_id,
        })
    
    async def on_node_complete(node_id: str, result):
        await sio.emit('execution:node_complete', {
            'workflowId': workflow_id,
            'nodeId': node_id,
            'success': result.success,
            'duration': result.duration,
            'error': result.error,
            # 注意：不发送 input 和 output，因为数据量可能很大
        })
    
    async def on_variable_update(name: str, value):
        # ⚠️ 性能关键：前端并不消费 execution:variable_update 事件（仅执行结束后保存全局变量）。
        # 在密集循环工作流中，每次 set_variable 都 emit 会产生成千上万条无人接收的消息，
        # 把 WebSocket 通道和后端发送队列灌满，导致真正有用的日志/数据行被挤到工作流结束
        # 才一次性送达（日志不实时的根因）。这里做节流：每个工作流最多每 200ms 发一条，
        # 其余直接丢弃（不影响功能，执行结束会统一保存全局变量）。
        import time as _t
        now = _t.monotonic()
        last = _var_update_last_emit.get(workflow_id, 0.0)
        if now - last < 0.2:
            return
        _var_update_last_emit[workflow_id] = now

        # 获取变量类型
        var_type = 'null'
        if value is not None:
            if isinstance(value, bool):
                var_type = 'boolean'
            elif isinstance(value, int) or isinstance(value, float):
                var_type = 'number'
            elif isinstance(value, str):
                var_type = 'string'
            elif isinstance(value, list):
                var_type = 'array'
            elif isinstance(value, dict):
                var_type = 'object'
            else:
                var_type = 'unknown'
        
        await sio.emit('execution:variable_update', {
            'workflowId': workflow_id,
            'name': name,
            'value': value,
            'type': var_type,
        })
    
    async def on_data_row(row: dict):
        # 批量推送：累积到 DATA_ROW_BATCH_SIZE 条就发一批，避免逐条 emit 灌满 WebSocket。
        # 不足一批的尾部行会在节点推进/工作流结束时被 flush（见 run_execution）。
        async with data_row_batch_lock:
            q = data_row_batch_queue.setdefault(workflow_id, [])
            q.append(row)
            should_flush = len(q) >= DATA_ROW_BATCH_SIZE
        if should_flush:
            await flush_data_rows(workflow_id)
    
    executor = WorkflowExecutor(
        workflow=workflow,
        on_log=on_log,
        on_node_start=on_node_start,
        on_node_complete=on_node_complete,
        on_variable_update=on_variable_update,
        on_data_row=on_data_row,
        headless=options.headless,
        browser_config={
            'type': options.browserConfig.type if options.browserConfig else 'msedge',
            'executablePath': options.browserConfig.executablePath if options.browserConfig else None,
            'userDataDir': options.browserConfig.userDataDir if options.browserConfig else None,
            'fullscreen': options.browserConfig.fullscreen if options.browserConfig else False,
            'launchArgs': options.browserConfig.launchArgs if options.browserConfig else None,
            'extensionDirs': options.browserConfig.extensionDirs if options.browserConfig else None,
        } if options.browserConfig else None,
        start_node_id=options.startNodeId,
    )
    
    # 从全局变量存储中恢复变量
    executor.context.variables.update(global_variables)

    # ===== 可视化调试接入：暂停/恢复事件推送 + 断点配置 =====
    async def on_paused(info: dict):
        if sio:
            try:
                await sio.emit('execution:paused', {'workflowId': workflow_id, **info})
            except Exception:
                pass

    async def on_resumed(info: dict):
        if sio:
            try:
                await sio.emit('execution:resumed', {'workflowId': workflow_id, **info})
            except Exception:
                pass

    executor.on_paused = on_paused
    executor.on_resumed = on_resumed
    try:
        executor.configure_debug(breakpoints=options.breakpoints, step_mode=options.stepMode)
    except Exception:
        pass

    executions_store[workflow_id] = executor

    # 在后台执行
    async def run_execution():
        # 数据行定时冲刷任务：每 200ms 把累积的数据行批量推送一次，
        # 让数据表格在执行过程中平滑、实时地填充（配合前端虚拟滚动，上万条也不卡）。
        async def _periodic_data_flush():
            try:
                while True:
                    await asyncio.sleep(0.2)
                    await flush_data_rows(workflow_id)
            except asyncio.CancelledError:
                return
        data_flush_task = asyncio.create_task(_periodic_data_flush())
        try:
            await sio.emit('execution:started', {'workflowId': workflow_id})
            
            print(f"[run_execution] 开始执行工作流: {workflow_id}")
            import time as _t_hist
            _run_start_ts = _t_hist.time()
            result = await executor.execute()
            print(f"[run_execution] 执行完成，结果: {result.status.value}")
            
            execution_results[workflow_id] = result
            execution_data[workflow_id] = executor.get_collected_data()

            # 记录执行历史 + 失败告警（异常隔离，不影响主流程）
            try:
                from app.services.execution_history import record_run as _record_run
                from app.services.alert_center import dispatch_alert_async as _dispatch_alert
                _wf_name = getattr(workflow, 'name', '') or workflow_id
                _rec = _record_run(
                    workflow_name=_wf_name,
                    workflow_id=workflow_id,
                    status=result.status.value,
                    duration_ms=int((_t_hist.time() - _run_start_ts) * 1000),
                    executed_nodes=getattr(result, 'executed_nodes', 0),
                    failed_nodes=getattr(result, 'failed_nodes', 0),
                    error=(getattr(result, 'error', '') or getattr(result, 'error_message', '') or ''),
                    source='editor',
                    started_at=_run_start_ts,
                )
                await _dispatch_alert(_rec)
            except Exception as _he:
                print(f"[run_execution] 记录执行历史/告警失败: {_he}")

            
            # 导出数据
            if execution_data[workflow_id]:
                exporter = DataExporter()
                data_file = exporter.export_to_excel(execution_data[workflow_id])
                result.data_file = data_file
                # 全量数据落盘，保证内存被 LRU 清理/服务重启后仍能下载完整数据
                _persist_full_data(workflow_id, execution_data[workflow_id])
            
            # 如果配置了自动关闭浏览器，则关闭
            print(f"[run_execution] browserConfig: {options.browserConfig}")
            if options.browserConfig:
                print(f"[run_execution] autoCloseBrowser: {options.browserConfig.autoCloseBrowser}")
            
            if options.browserConfig and options.browserConfig.autoCloseBrowser:
                try:
                    print(f"[run_execution] 自动关闭浏览器（配置已启用）")
                    await executor.cleanup()
                except Exception as e:
                    print(f"[run_execution] 关闭浏览器失败: {e}")
            else:
                print(f"[run_execution] 保持浏览器打开（配置已禁用或未配置）")
            
            print(f"[run_execution] 发送 execution:completed 事件")
            # 先把剩余未满一批的数据行冲刷干净，并停止定时冲刷任务，
            # 保证前端在收到 completed 前已经流式拿到全部数据行。
            try:
                data_flush_task.cancel()
            except Exception:
                pass
            await flush_data_rows(workflow_id)
            # completed 仅作兜底同步：前端已通过 data_row_batch 流式收齐全部数据，
            # 这里附带一份预览（封顶 5000，避免单条 socket 消息过大）；前端若已流式收到
            # 更多行则不会被它截断（见前端 execution:completed 处理）。完整数据始终可通过
            # /workflows/{id}/data/full 接口或落盘文件获取。
            collected_data_to_send = execution_data.get(workflow_id, [])
            full_total = len(collected_data_to_send)
            if full_total > 5000:
                collected_data_to_send = collected_data_to_send[:5000]

            # 选择器自愈记录（供前端询问是否写回工作流）
            healed_selectors = []
            try:
                ex = executions_store.get(workflow_id)
                healed_selectors = list(getattr(ex.context, '_healed_selectors', []) or []) if ex else []
            except Exception:
                healed_selectors = []

            await sio.emit('execution:completed', {
                'workflowId': workflow_id,
                'result': {
                    'status': result.status.value,
                    'executedNodes': result.executed_nodes,
                    'failedNodes': result.failed_nodes,
                    'dataFile': result.data_file,
                },
                'collectedData': collected_data_to_send,
                'collectedDataTotal': full_total,
                'healedSelectors': healed_selectors,
            })
            print(f"[run_execution] execution:completed 事件已发送")
            
            # 等待一小段时间确保事件被传输
            await asyncio.sleep(0.1)
            
            # 保存全局变量到持久化存储（在清理执行器之前）
            if workflow_id in executions_store:
                global_variables.update(executions_store[workflow_id].context.variables)
                print(f"[run_execution] 已保存 {len(global_variables)} 个全局变量")
            
        except Exception as e:
            print(f"[run_execution] 执行异常: {e}")
            import traceback
            traceback.print_exc()

            # 记录失败历史 + 告警（异常隔离）
            try:
                from app.services.execution_history import record_run as _record_run
                from app.services.alert_center import dispatch_alert_async as _dispatch_alert
                _wf_name = getattr(workflow, 'name', '') or workflow_id
                _rec = _record_run(
                    workflow_name=_wf_name,
                    workflow_id=workflow_id,
                    status='failed',
                    executed_nodes=(executor.executed_nodes if executor else 0),
                    failed_nodes=(executor.failed_nodes if executor else 1),
                    error=str(e)[:500],
                    source='editor',
                )
                await _dispatch_alert(_rec)
            except Exception as _he:
                print(f"[run_execution] 记录失败历史/告警失败: {_he}")

            # 即使出现异常，也要发送 execution:completed 事件
            await sio.emit('execution:completed', {
                'workflowId': workflow_id,
                'result': {
                    'status': 'failed',
                    'executedNodes': executor.executed_nodes if executor else 0,
                    'failedNodes': executor.failed_nodes if executor else 1,
                    'dataFile': None,
                },
                'collectedData': [],
            })
            print(f"[run_execution] execution:completed 事件已发送（异常情况）")
        
        finally:
            # 停止数据行定时冲刷任务并清理其队列（防止异常路径残留）
            try:
                data_flush_task.cancel()
            except Exception:
                pass
            try:
                async with data_row_batch_lock:
                    data_row_batch_queue.pop(workflow_id, None)
            except Exception:
                pass
            # 清理变量更新节流时间戳
            _var_update_last_emit.pop(workflow_id, None)
            # 强制刷新本工作流剩余的批量日志（防止批量发送丢失）
            try:
                async with log_batch_lock:
                    if workflow_id in log_batch_queue and log_batch_queue[workflow_id]:
                        logs = log_batch_queue[workflow_id]
                        log_batch_queue[workflow_id] = []
                        if sio is not None:
                            await sio.emit('execution:log_batch', {
                                'workflowId': workflow_id,
                                'logs': logs
                            })
                    # 清理本工作流的批量队列
                    log_batch_queue.pop(workflow_id, None)
                    if workflow_id in log_batch_tasks:
                        try:
                            log_batch_tasks[workflow_id].cancel()
                        except Exception:
                            pass
                        log_batch_tasks.pop(workflow_id, None)
            except Exception as e:
                print(f"[run_execution] 刷新批量日志失败: {e}")
            
            # 在清理执行器之前保存变量追踪记录
            if workflow_id in executions_store:
                try:
                    tracking_records = executions_store[workflow_id].context.get_variable_tracking()
                    variable_tracking_store[workflow_id] = tracking_records
                    print(f"[run_execution] 已保存 {len(tracking_records)} 条变量追踪记录")
                except Exception as e:
                    print(f"[run_execution] 保存变量追踪记录失败: {e}")
            
            # 清理执行器，但保留 execution_data 供前端下载完整数据使用
            if workflow_id in executions_store:
                del executions_store[workflow_id]
            # 保留 execution_data 用于"下载数据"按钮，但限制总量防止内存泄漏
            if len(execution_data) > 10:
                # 删除最旧的（保留当前 workflow_id 对应的）
                for old_key in list(execution_data.keys()):
                    if old_key != workflow_id and len(execution_data) > 10:
                        del execution_data[old_key]
                    if len(execution_data) <= 10:
                        break
            # 保留 execution_results 一段时间供查询，但限制数量
            if len(execution_results) > 10:
                # 删除最旧的结果
                oldest_key = next(iter(execution_results))
                del execution_results[oldest_key]
    
    background_tasks.add_task(run_execution)
    
    return {"message": "工作流开始执行"}


@router.post("/{workflow_id}/stop")
async def stop_workflow(workflow_id: str):
    """停止工作流执行"""
    executor = executions_store.get(workflow_id)
    if not executor:
        raise HTTPException(status_code=404, detail="没有正在执行的工作流")
    
    if not executor.is_running:
        raise HTTPException(status_code=400, detail="工作流未在执行")
    
    await executor.stop()
    
    if sio is not None:
        try:
            await sio.emit('execution:stopped', {'workflowId': workflow_id})
        except Exception as e:
            print(f"[stop_workflow] 发送 stopped 事件失败: {e}")
    
    return {"message": "工作流已停止"}


class DebugControl(BaseModel):
    breakpoints: Optional[list[str]] = None


@router.post("/{workflow_id}/debug/resume")
async def debug_resume(workflow_id: str):
    """调试：从断点/单步暂停处继续运行到下一个断点"""
    executor = executions_store.get(workflow_id)
    if not executor:
        raise HTTPException(status_code=404, detail="没有正在执行的工作流")
    executor.debug_resume(step=False)
    return {"message": "已继续"}


@router.post("/{workflow_id}/debug/step")
async def debug_step(workflow_id: str):
    """调试：单步执行（走到下一个节点再次暂停）"""
    executor = executions_store.get(workflow_id)
    if not executor:
        raise HTTPException(status_code=404, detail="没有正在执行的工作流")
    executor.debug_resume(step=True)
    return {"message": "已单步"}


@router.post("/{workflow_id}/debug/breakpoints")
async def debug_set_breakpoints(workflow_id: str, ctrl: DebugControl):
    """调试：运行中动态更新断点集合"""
    executor = executions_store.get(workflow_id)
    if not executor:
        raise HTTPException(status_code=404, detail="没有正在执行的工作流")
    executor.set_breakpoints(ctrl.breakpoints or [])
    return {"message": "断点已更新", "breakpoints": list(executor.breakpoints)}

    """获取执行状态"""
    executor = executions_store.get(workflow_id)
    result = execution_results.get(workflow_id)
    
    if executor and executor.is_running:
        return {
            "status": "running",
            "executedNodes": executor.executed_nodes,
            "failedNodes": executor.failed_nodes,
        }
    elif result:
        return {
            "status": result.status.value,
            "executedNodes": result.executed_nodes,
            "failedNodes": result.failed_nodes,
            "dataFile": result.data_file,
        }
    else:
        return {"status": "idle"}


@router.get("/{workflow_id}/data")
async def download_data(workflow_id: str):
    """下载提取的数据"""
    result = execution_results.get(workflow_id)
    
    if not result or not result.data_file:
        raise HTTPException(status_code=404, detail="没有可下载的数据")
    
    file_path = Path(result.data_file)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="数据文件不存在")
    
    return FileResponse(
        path=str(file_path),
        filename=file_path.name,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )


@router.get("/data-latest/full")
async def get_latest_full_collected_data():
    """获取最近一次执行收集到的完整数据（前端 currentExecutionWorkflowId 丢失时兜底）

    遍历 execution_data 找最后一个非空的 entry。
    """
    if not execution_data:
        # 兜底：找到一个仍在 store 里的执行器实时取数据
        for wid, executor in list(executions_store.items()):
            try:
                rows = executor.get_collected_data()
                if rows:
                    cols: list[str] = []
                    seen_local = set()
                    for r in rows:
                        for k in r.keys():
                            if k not in seen_local:
                                seen_local.add(k)
                                cols.append(k)
                    return {"workflow_id": wid, "rows": rows, "columns": cols, "total": len(rows)}
            except Exception:
                continue
        # 内存里都没有：回退磁盘持久化的最近一次完整数据
        persisted = _load_latest_persisted_full_data()
        if persisted:
            wid, rows = persisted
            cols2: list[str] = []
            seen2 = set()
            for r in rows:
                for k in r.keys():
                    if k not in seen2:
                        seen2.add(k)
                        cols2.append(k)
            return {"workflow_id": wid, "rows": rows, "columns": cols2, "total": len(rows)}
        raise HTTPException(status_code=404, detail="没有可下载的数据")

    # execution_data 是普通 dict，py3.7+ 保留插入顺序，最后插入的就是最近的
    last_wid = None
    last_rows: list[dict] | None = None
    for wid, rows in execution_data.items():
        if rows:
            last_wid = wid
            last_rows = rows
    if last_rows is None:
        raise HTTPException(status_code=404, detail="没有可下载的数据")

    columns: list[str] = []
    seen = set()
    for r in last_rows:
        for k in r.keys():
            if k not in seen:
                seen.add(k)
                columns.append(k)

    return {
        "workflow_id": last_wid,
        "rows": last_rows,
        "columns": columns,
        "total": len(last_rows),
    }


@router.get("/{workflow_id}/data/full")
async def get_full_collected_data(workflow_id: str):
    """获取本次执行收集到的完整数据（不限 20 条预览上限）"""
    # 先看是否有已存在的执行结果
    rows = execution_data.get(workflow_id)
    
    # 如果已经清理但仍持有 executor，从 executor 实时获取
    if rows is None:
        executor = executions_store.get(workflow_id)
        if executor is not None:
            try:
                rows = executor.get_collected_data()
            except Exception:
                rows = None
    
    # 内存里都没有：回退磁盘持久化的完整数据
    if rows is None:
        rows = _load_persisted_full_data(workflow_id)
    
    if rows is None:
        raise HTTPException(status_code=404, detail="没有可下载的数据")
    
    # 收集所有列
    columns: list[str] = []
    seen = set()
    for r in rows:
        for k in r.keys():
            if k not in seen:
                seen.add(k)
                columns.append(k)
    
    return {
        "rows": rows,
        "columns": columns,
        "total": len(rows),
    }


@router.post("/import")
async def import_workflow(data: dict):
    """导入工作流"""
    try:
        workflow_id = data.get('id') or str(uuid4())
        
        from app.models.workflow import WorkflowNode, WorkflowEdge, Variable, Position
        
        workflow = Workflow(
            id=workflow_id,
            name=data.get('name', '导入的工作流'),
            nodes=[],
            edges=[],
            variables=[],
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        
        for node_data in data.get('nodes', []):
            node = WorkflowNode(
                id=node_data['id'],
                type=node_data['type'],
                position=Position(**node_data['position']),
                data=node_data.get('data', {}),
                style=node_data.get('style'),
            )
            workflow.nodes.append(node)
        
        for edge_data in data.get('edges', []):
            edge = WorkflowEdge(
                id=edge_data['id'],
                source=edge_data['source'],
                target=edge_data['target'],
                sourceHandle=edge_data.get('sourceHandle'),
                targetHandle=edge_data.get('targetHandle'),
            )
            workflow.edges.append(edge)
        
        # 导入变量（如果有）
        for var_data in data.get('variables', []):
            var = Variable(**var_data)
            workflow.variables.append(var)
            # 如果是全局变量，同时添加到全局变量存储中
            if var.scope == 'global':
                global_variables[var.name] = var.value
                print(f"[import_workflow] 导入全局变量: {var.name} = {var.value}")
        
        workflows_store[workflow_id] = workflow
        
        return {"id": workflow_id, "message": "工作流导入成功"}
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"导入失败: {str(e)}")


@router.get("/{workflow_id}/export")
async def export_workflow(workflow_id: str):
    """导出工作流"""
    workflow = workflows_store.get(workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="工作流不存在")
    
    return {
        "id": workflow.id,
        "name": workflow.name,
        "nodes": [
            {
                "id": n.id,
                "type": n.type,
                "position": {"x": n.position.x, "y": n.position.y},
                "data": n.data,
                "style": n.style,
            }
            for n in workflow.nodes
        ],
        "edges": [
            {
                "id": e.id,
                "source": e.source,
                "target": e.target,
                "sourceHandle": e.sourceHandle,
                "targetHandle": e.targetHandle,
            }
            for e in workflow.edges
        ],
        "variables": [
            {
                "name": v.name,
                "value": v.value,
                "type": v.type.value,
                "scope": v.scope,
            }
            for v in workflow.variables
        ],
        "createdAt": workflow.created_at.isoformat(),
        "updatedAt": workflow.updated_at.isoformat(),
    }


@router.get("/{workflow_id}/export-playwright")
async def export_workflow_playwright(workflow_id: str):
    """导出工作流为 Playwright Python 代码"""
    workflow = workflows_store.get(workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="工作流不存在")
    
    from app.services.playwright_exporter import export_workflow_to_playwright
    
    # 构建工作流数据
    workflow_data = {
        "id": workflow.id,
        "name": workflow.name,
        "nodes": [
            {
                "id": n.id,
                "type": n.type,
                "position": {"x": n.position.x, "y": n.position.y},
                "data": n.data,
            }
            for n in workflow.nodes
        ],
        "edges": [
            {
                "id": e.id,
                "source": e.source,
                "target": e.target,
                "sourceHandle": e.sourceHandle,
                "targetHandle": e.targetHandle,
            }
            for e in workflow.edges
        ],
        "variables": [
            {
                "name": v.name,
                "value": v.value,
                "type": v.type.value,
            }
            for v in workflow.variables
        ],
    }
    
    # 生成 Python 代码
    python_code = export_workflow_to_playwright(workflow_data)
    
    return {
        "code": python_code,
        "filename": f"{workflow.name.replace(' ', '_')}_playwright.py",
    }


def _build_workflow_data_for_export(workflow):
    """把 Workflow 对象转为导出器所需的 dict 结构"""
    return {
        "id": workflow.id,
        "name": workflow.name,
        "nodes": [
            {
                "id": n.id,
                "type": n.type,
                "position": {"x": n.position.x, "y": n.position.y},
                "data": n.data,
            }
            for n in workflow.nodes
        ],
        "edges": [
            {
                "id": e.id,
                "source": e.source,
                "target": e.target,
                "sourceHandle": e.sourceHandle,
                "targetHandle": e.targetHandle,
            }
            for e in workflow.edges
        ],
        "variables": [
            {"name": v.name, "value": v.value, "type": v.type.value}
            for v in workflow.variables
        ],
    }


@router.get("/{workflow_id}/export-script")
async def export_workflow_script(workflow_id: str, target: str = "selenium"):
    """导出工作流为脚本。target: 'selenium' | 'playwright-js'"""
    workflow = workflows_store.get(workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="工作流不存在")

    from app.services.script_exporters import export_workflow_to_script

    workflow_data = _build_workflow_data_for_export(workflow)
    code = export_workflow_to_script(workflow_data, target)
    ext = "js" if target.startswith(("playwright-js", "js", "javascript", "node", "playwright_js")) else "py"
    suffix = "playwright" if ext == "js" else "selenium"
    return {
        "code": code,
        "target": target,
        "filename": f"{workflow.name.replace(' ', '_')}_{suffix}.{ext}",
    }


@router.get("/global-variables")
async def get_global_variables():
    """获取所有全局变量"""
    return {
        "variables": global_variables,
        "count": len(global_variables)
    }


@router.delete("/global-variables")
async def clear_global_variables():
    """清空所有全局变量"""
    global_variables.clear()
    return {"message": "全局变量已清空"}


@router.delete("/global-variables/{variable_name}")
async def delete_global_variable(variable_name: str):
    """删除指定的全局变量"""
    if variable_name in global_variables:
        del global_variables[variable_name]
        return {"message": f"变量 {variable_name} 已删除"}
    else:
        raise HTTPException(status_code=404, detail="变量不存在")


@router.get("/{workflow_id}/variable-tracking")
async def get_variable_tracking(workflow_id: str):
    """获取工作流的变量追踪记录"""
    tracking_records = []
    
    # 优先从正在执行的执行器中获取
    executor = executions_store.get(workflow_id)
    if executor:
        try:
            tracking_records = executor.context.get_variable_tracking()
        except Exception as e:
            print(f"从执行器获取变量追踪记录失败: {e}")
    
    # 如果执行器不存在，从存储中获取（执行完成后的记录）
    if not tracking_records and workflow_id in variable_tracking_store:
        tracking_records = variable_tracking_store[workflow_id]
    
    return {
        "tracking": tracking_records,
        "count": len(tracking_records)
    }


@router.delete("/{workflow_id}/variable-tracking")
async def clear_variable_tracking(workflow_id: str):
    """清空工作流的变量追踪记录"""
    # 清空正在执行的执行器中的记录
    executor = executions_store.get(workflow_id)
    if executor:
        try:
            executor.context.clear_variable_tracking()
        except Exception as e:
            print(f"清空执行器中的变量追踪记录失败: {e}")
    
    # 清空存储中的记录
    if workflow_id in variable_tracking_store:
        del variable_tracking_store[workflow_id]
    
    return {"message": "变量追踪记录已清空"}
