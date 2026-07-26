# -*- coding: utf-8 -*-
"""计划任务执行事件推送回归测试（backend/app/main.py）。

`execute_workflow_for_scheduled_task` 定义在 `main.py` 的 `startup_event` 闭包内，
既无法 import，也不能真跑一遍 `startup_event`（它会拉起全局热键、剪贴板监听、
健康探针循环、集群任务转移循环、平台体检循环、留存清理与 MCP 初始化等后台服务）。

方案：用 `ast` 从 `main.py` 源码中取出目标函数节点，编译进预置了假依赖的干净命名空间
执行。这样断言约束的是**生产源码本身**：谁删掉某条出口的完成事件、把数据行冲刷挪到
完成事件之后、或把 `full_logs` 改回 `executor.logger`，用例立刻失败。

该方案对 `main.py` 的结构有耦合（依赖 `startup_event` 内的函数名），因此节点提取失败时
一律用明确的断言消息 fail 而不是 skip，使结构变化立即暴露；提取逻辑收敛在
`load_scheduled_functions` 一处，结构调整只需改这里。

本文件的脚手架部分对应任务 7.1，出口顺序断言见任务 7.2，载荷与日志通道断言见任务 7.3。
"""
import ast
import asyncio
import hashlib
import inspect
import json
from datetime import datetime
from pathlib import Path

import pytest

from app.api import workflows
from app.api.local_workflows import DEFAULT_WORKFLOW_FOLDER
from app.executors.base import ModuleResult
from app.models.workflow import (
    ExecutionResult,
    ExecutionStatus,
    LogEntry,
    LogLevel,
    Workflow,
)

# backend/tests/regression/<本文件> → parents[2] 即 backend
_BACKEND_DIR = Path(__file__).resolve().parents[2]
MAIN_PY = _BACKEND_DIR / "app" / "main.py"

# 需要从 startup_event 闭包中取出的三个函数（顺序即定义顺序，保证前向引用可用）
SCHEDULED_FUNCTION_NAMES = (
    "_emit_scheduled_completed",
    "_safe_collect_full_logs",
    "execute_workflow_for_scheduled_task",
)


# ===== ast 提取 =====

def load_scheduled_functions(namespace: dict) -> dict:
    """把 `startup_event` 内的三个计划任务函数编译进 `namespace` 并返回函数对象。

    取节点失败一律断言 fail（不 skip）：`main.py` 结构变化必须立刻暴露，
    否则整组回归用例会静默退化成"全绿但什么都没测"。
    """
    assert MAIN_PY.exists(), f"未找到生产源码文件: {MAIN_PY}"
    source = MAIN_PY.read_text(encoding="utf-8")
    tree = ast.parse(source, filename=str(MAIN_PY))

    startup = next(
        (
            node
            for node in tree.body
            if isinstance(node, (ast.AsyncFunctionDef, ast.FunctionDef))
            and node.name == "startup_event"
        ),
        None,
    )
    assert startup is not None, (
        f"在 {MAIN_PY} 顶层未找到 startup_event 函数定义。"
        "计划任务执行函数定义在它的闭包内，结构变化后请同步更新 load_scheduled_functions。"
    )

    defined = {
        node.name: node
        for node in startup.body
        if isinstance(node, (ast.AsyncFunctionDef, ast.FunctionDef))
    }
    missing = [name for name in SCHEDULED_FUNCTION_NAMES if name not in defined]
    assert not missing, (
        f"startup_event 内缺少函数定义 {missing}；现有嵌套函数为 {sorted(defined)}。"
        "若这些函数被重命名或移出 startup_event，请同步更新 SCHEDULED_FUNCTION_NAMES。"
    )

    module = ast.Module(
        body=[defined[name] for name in SCHEDULED_FUNCTION_NAMES],
        type_ignores=[],
    )
    ast.fix_missing_locations(module)
    exec(compile(module, str(MAIN_PY), "exec"), namespace)

    return {name: namespace[name] for name in SCHEDULED_FUNCTION_NAMES}


# ===== 测试替身 =====

# 假 sio 收到的事件 → 出口动作标记的映射。只关心与出口顺序有关的三个事件，
# 日志/节点事件不参与顺序断言。
_ACTION_BY_EVENT = {
    "execution:started": "started",
    "execution:data_row_batch": "flush",
    "execution:completed": "completed",
}


class Recorder:
    """假执行器与假推送共享的动作序列记录器，用于断言三条出口的动作顺序。"""

    def __init__(self):
        self.actions: list[str] = []
        self.history: list[dict] = []
        self.alerts: list[dict] = []

    def mark(self, action: str) -> None:
        self.actions.append(action)

    def index(self, action: str) -> int:
        assert action in self.actions, f"动作 {action!r} 未发生，实际序列: {self.actions}"
        return self.actions.index(action)


class FakeSio:
    """记录 (event, payload) 序列的假 Socket.IO 实例，同时向 recorder 追加动作标记。"""

    def __init__(self, recorder: Recorder):
        self.recorder = recorder
        self.calls: list[tuple[str, dict]] = []

    async def emit(self, event, payload=None):
        self.calls.append((event, payload))
        action = _ACTION_BY_EVENT.get(event)
        if action:
            self.recorder.mark(action)

    def events(self, name: str) -> list[dict]:
        return [payload for event, payload in self.calls if event == name]

    def count(self, name: str) -> int:
        return len(self.events(name))


class FakeContext:
    """假执行上下文：`full_logs` 的唯一合法取法是 `executor.context.get_logs()`。"""

    def __init__(self, recorder: Recorder, logs: list, get_logs_raises: bool):
        self.recorder = recorder
        self._logs = logs
        self._get_logs_raises = get_logs_raises
        self._user_data_dir = None

    def get_logs(self):
        self.recorder.mark("read_logs")
        if self._get_logs_raises:
            raise RuntimeError("读取执行日志故意失败")
        return list(self._logs)


class FakeExecutor:
    """假工作流执行器。

    **刻意不定义 `logger` 属性**（真实 WorkflowExecutor 也没有），
    这样 `full_logs` 的断言只可能被 `executor.context.get_logs()` 满足，
    不会出现"旧代码也能过"的假绿。
    """

    def __init__(self, factory: "FakeExecutorFactory", callbacks: dict, **kwargs):
        self.factory = factory
        self.recorder = factory.recorder
        self.callbacks = callbacks
        self.workflow = kwargs.get("workflow")
        self.headless = kwargs.get("headless")
        self.browser_config = kwargs.get("browser_config")
        self.is_running = False
        self.context = FakeContext(
            factory.recorder, factory.logs, factory.get_logs_raises
        )

    async def execute(self):
        self.recorder.mark("execute")
        self.is_running = True
        for log in self.factory.streamed_logs:
            await self.callbacks["on_log"](log)
        for node_id in self.factory.streamed_nodes:
            await self.callbacks["on_node_start"](node_id)
            await self.callbacks["on_node_complete"](
                node_id, ModuleResult(success=True, message="ok", duration=1.0)
            )
        for row in self.factory.streamed_rows:
            await self.callbacks["on_data_row"](row)
        self.is_running = False

        if self.factory.behavior == "raise":
            raise RuntimeError(self.factory.error_message)
        return ExecutionResult(
            workflow_id=getattr(self.workflow, "id", "") or "wf",
            status=(
                ExecutionStatus.STOPPED
                if self.factory.behavior == "stopped"
                else ExecutionStatus.COMPLETED
            ),
            started_at=datetime(2024, 5, 1, 10, 0, 0),
            completed_at=datetime(2024, 5, 1, 10, 5, 0),
            total_nodes=len(self.factory.streamed_nodes),
            executed_nodes=self.factory.executed_nodes,
            failed_nodes=self.factory.failed_nodes,
            error_message=self.factory.error_message
            if self.factory.behavior != "completed"
            else None,
        )

    def get_collected_data(self):
        if self.factory.collect_raises:
            raise RuntimeError("读取采集数据故意失败")
        return list(self.factory.collected_data)

    async def cleanup(self):
        self.recorder.mark("cleanup")
        self.factory.cleaned_up += 1


class FakeExecutorFactory:
    """注入命名空间充当 `WorkflowExecutor` 的工厂，同时集中托管假执行器的行为开关。"""

    def __init__(self, recorder: Recorder):
        self.recorder = recorder
        self.created: list[FakeExecutor] = []
        self.cleaned_up = 0

        # 行为开关：'completed' / 'stopped' / 'raise'
        self.behavior = "completed"
        self.error_message = "节点执行故意失败"
        self.executed_nodes = 2
        self.failed_nodes = 0
        # 执行期间经回调推送的内容（默认数据行不足一批，尾部行只能靠出口冲刷发出）
        self.streamed_logs: list[LogEntry] = [make_log("log-1"), make_log("log-2")]
        self.streamed_nodes: list[str] = ["node-1", "node-2"]
        self.streamed_rows: list[dict] = [{"index": 0}, {"index": 1}]
        self.collected_data: list[dict] = [{"index": 0}, {"index": 1}]
        self.logs: list[dict] = [{"id": "log-1"}, {"id": "log-2"}]
        self.get_logs_raises = False
        self.collect_raises = False

    def __call__(self, **kwargs):
        callbacks = {
            key: kwargs.pop(key)
            for key in ("on_log", "on_node_start", "on_node_complete", "on_data_row")
            if key in kwargs
        }
        assert set(callbacks) == {
            "on_log",
            "on_node_start",
            "on_node_complete",
            "on_data_row",
        }, f"创建执行器时未展开共享回调工厂的四个回调，实际收到: {sorted(callbacks)}"
        executor = FakeExecutor(self, callbacks, **kwargs)
        self.created.append(executor)
        return executor

    @property
    def executor(self) -> FakeExecutor:
        assert self.created, "尚未创建任何执行器"
        return self.created[-1]


class FakeTask:
    """计划任务配置替身（只用到 open_monitor / headless 两个开关）。"""

    def __init__(self, open_monitor: bool = False, headless: bool = False):
        self.open_monitor = open_monitor
        self.headless = headless


class FakeScheduledTaskManager:
    """计划任务管理器替身：提供 `get_task` 与 `running_executors`。"""

    def __init__(self):
        self.tasks: dict[str, FakeTask] = {}
        self.running_executors: dict[str, object] = {}

    def get_task(self, task_id):
        return self.tasks.get(task_id)


def make_log(log_id: str = "log-1", level: LogLevel = LogLevel.INFO, details=None) -> LogEntry:
    """构造真实 LogEntry（timestamp 是真实 datetime、level 是真实枚举）。"""
    return LogEntry(
        id=log_id,
        timestamp=datetime(2024, 5, 1, 10, 30, 0),
        level=level,
        node_id="node-1",
        message="执行中",
        details=details,
        duration=1.0,
    )


# ===== 脚手架 fixture =====

class ScheduledEnv:
    """一次用例所需的全部上下文：被提取的函数、假依赖与断言辅助。"""

    def __init__(self, functions, namespace, recorder, sio, factory, task_manager, folder):
        self.execute_scheduled = functions["execute_workflow_for_scheduled_task"]
        self.emit_scheduled_completed = functions["_emit_scheduled_completed"]
        self.safe_collect_full_logs = functions["_safe_collect_full_logs"]
        self.namespace = namespace
        self.recorder = recorder
        self.sio = sio
        self.factory = factory
        self.task_manager = task_manager
        self.folder = folder

        self.workflows_store = namespace["workflows_store"]
        self.executions_store = namespace["executions_store"]
        self.execution_results = namespace["execution_results"]
        self.execution_data = namespace["execution_data"]

    @property
    def actions(self) -> list[str]:
        return self.recorder.actions

    def write_workflow(self, filename: str = "定时任务.json", workflow_id: str = "wf-1") -> str:
        """在活动工作流文件夹里写一个真实的工作流 JSON 文件，返回文件名。"""
        payload = {"id": workflow_id, "name": "回归用工作流", "nodes": [], "edges": []}
        (self.folder / filename).write_text(
            json.dumps(payload, ensure_ascii=False), encoding="utf-8"
        )
        return filename

    def register_task(self, task_id: str, **kwargs) -> str:
        self.task_manager.tasks[task_id] = FakeTask(**kwargs)
        return task_id


@pytest.fixture
def sched_env(tmp_path, monkeypatch):
    """构建计划任务回归脚手架：ast 提取目标函数 + 注入假依赖 + 隔离共享推送层状态。

    共享推送层用的是 `workflows.py` 的**真实**函数（只把 sio 换成替身），
    以保证批量事件名、源头过滤、载荷字段都由生产代码决定。
    """
    # --- 接管共享推送层的模块级状态 ---
    original_sio = workflows.sio
    original_switches = dict(workflows.log_enabled_by_client)
    original_log_queue = dict(workflows.log_batch_queue)
    original_log_tasks = dict(workflows.log_batch_tasks)
    original_row_queue = dict(workflows.data_row_batch_queue)
    # asyncio.Lock 在首次争用时绑定当前事件循环，而每个用例跑在各自的新循环上，
    # 这里换成用例专属的新锁，用例结束后还原。
    original_log_lock = workflows.log_batch_lock
    original_row_lock = workflows.data_row_batch_lock
    workflows.log_batch_lock = asyncio.Lock()
    workflows.data_row_batch_lock = asyncio.Lock()

    recorder = Recorder()
    fake_sio = FakeSio(recorder)
    workflows.set_sio(fake_sio)
    # 默认「详细模式」：有客户端在收日志且开启详细日志，两道源头过滤都放行，
    # 这样"零逐条 execution:log 事件"的断言不会因为日志被过滤掉而假绿。
    workflows.log_enabled_by_client.clear()
    workflows.log_enabled_by_client["sid-verbose"] = True
    workflows.log_batch_queue.clear()
    workflows.log_batch_tasks.clear()
    workflows.data_row_batch_queue.clear()

    # --- 函数内 import 的依赖无法通过命名空间注入替换，只能 monkeypatch 真实模块 ---
    from app.services import (
        alert_center,
        browser_config_store,
        execution_history,
        system_browser,
        webdav_manager,
        workflow_folder,
    )

    active_folder = tmp_path / "workflows"
    active_folder.mkdir(parents=True, exist_ok=True)

    monkeypatch.setattr(webdav_manager, "is_enabled", lambda: False)
    monkeypatch.setattr(workflow_folder, "get_active_folder", lambda: str(active_folder))
    monkeypatch.setattr(
        browser_config_store,
        "get_browser_config",
        lambda: {
            "type": "msedge",
            "executablePath": None,
            "fullscreen": False,
            "launchArgs": None,
            "extensionDirs": "",
            "autoCloseBrowser": True,
        },
    )

    def _record_run(**kwargs):
        record = dict(kwargs)
        recorder.history.append(record)
        return record

    def _dispatch_alert(record):
        recorder.alerts.append(record)
        return record

    monkeypatch.setattr(execution_history, "record_run", _record_run)
    monkeypatch.setattr(alert_center, "dispatch_alert", _dispatch_alert)
    monkeypatch.setattr(
        system_browser,
        "open_url_in_configured_browser",
        lambda url: recorder.mark("open_monitor") or True,
    )

    # --- 预置命名空间并提取目标函数 ---
    factory = FakeExecutorFactory(recorder)
    task_manager = FakeScheduledTaskManager()
    namespace = {
        "__name__": "app.main.__scheduled_regression__",
        # 生产代码用 Path(__file__).parent.parent / "browser_data" 定位持久化目录，
        # 因此 __file__ 必须指向真实的 main.py。
        "__file__": str(MAIN_PY),
        "asyncio": asyncio,
        "json": json,
        "Path": Path,
        "Workflow": Workflow,
        "WorkflowExecutor": factory,
        "scheduled_task_manager": task_manager,
        "DEFAULT_WORKFLOW_FOLDER": str(tmp_path / "fallback_workflows"),
        "workflows_store": {},
        "executions_store": {},
        "execution_results": {},
        "execution_data": {},
        # 共享推送层用真实实现，只替换 sio
        "make_execution_callbacks": workflows.make_execution_callbacks,
        "emit_execution_started": workflows.emit_execution_started,
        "emit_execution_completed": workflows.emit_execution_completed,
        "flush_data_rows": workflows.flush_data_rows,
    }
    functions = load_scheduled_functions(namespace)

    yield ScheduledEnv(
        functions, namespace, recorder, fake_sio, factory, task_manager, active_folder
    )

    workflows.set_sio(original_sio)
    workflows.log_enabled_by_client.clear()
    workflows.log_enabled_by_client.update(original_switches)
    workflows.log_batch_queue.clear()
    workflows.log_batch_queue.update(original_log_queue)
    workflows.log_batch_tasks.clear()
    workflows.log_batch_tasks.update(original_log_tasks)
    workflows.data_row_batch_queue.clear()
    workflows.data_row_batch_queue.update(original_row_queue)
    workflows.log_batch_lock = original_log_lock
    workflows.data_row_batch_lock = original_row_lock


# ===== 脚手架冒烟用例 =====

@pytest.mark.regression
class TestScaffolding:
    """确认 ast 提取脚手架本身可用：三个节点能取出、能执行一次正常流程。"""

    def test_three_functions_extracted_with_expected_kinds(self, sched_env):
        """三个目标函数节点均被取出，且协程/普通函数的性质符合生产实现。

        **Validates: Requirements 2.20**
        """
        assert inspect.iscoroutinefunction(sched_env.execute_scheduled)
        assert inspect.iscoroutinefunction(sched_env.emit_scheduled_completed)
        assert not inspect.iscoroutinefunction(sched_env.safe_collect_full_logs), (
            "_safe_collect_full_logs 是同步函数（在 cleanup 之前直接读 context 日志）"
        )
        assert sched_env.execute_scheduled.__name__ == "execute_workflow_for_scheduled_task"

    def test_fake_executor_has_no_logger_attribute(self, sched_env):
        """假执行器刻意不定义 logger 属性，避免 full_logs 断言被旧取法假绿满足。

        **Validates: Requirements 2.20**
        """
        executor = sched_env.factory(**workflows.make_execution_callbacks("wf.json"))
        assert not hasattr(executor, "logger")
        assert callable(executor.context.get_logs)

    async def test_normal_flow_runs_once_end_to_end(self, sched_env):
        """冒烟：真实工作流 JSON → 正常结束一次，返回结构与关键事件均就位。

        **Validates: Requirements 2.20**
        """
        filename = sched_env.write_workflow()

        outcome = await sched_env.execute_scheduled(filename)

        assert outcome["success"] is True
        assert outcome["stopped"] is False
        assert outcome["error"] is None
        assert outcome["executor"] is sched_env.factory.executor
        assert outcome["full_logs"] == sched_env.factory.logs

        # 工作流被加载并缓存，执行器引用在出口清理
        assert filename in sched_env.workflows_store
        assert filename not in sched_env.executions_store
        assert sched_env.execution_results[filename].status is ExecutionStatus.COMPLETED
        assert sched_env.execution_data[filename] == sched_env.factory.collected_data

        # 开始/完成事件各一次，且执行器被清理一次
        assert sched_env.sio.count("execution:started") == 1
        assert sched_env.sio.count("execution:completed") == 1
        assert sched_env.factory.cleaned_up == 1
        assert sched_env.recorder.history, "执行历史应被记录"

    async def test_exception_flow_runs_once_end_to_end(self, sched_env):
        """冒烟：执行器抛异常时脚手架同样能跑通异常出口并拿到返回结构。

        **Validates: Requirements 2.20**
        """
        sched_env.factory.behavior = "raise"
        filename = sched_env.write_workflow("异常任务.json", workflow_id="wf-err")

        outcome = await sched_env.execute_scheduled(filename)

        assert outcome["success"] is False
        assert outcome["error"] == sched_env.factory.error_message
        assert outcome["executor"] is sched_env.factory.executor
        assert filename not in sched_env.executions_store
        assert sched_env.factory.cleaned_up == 1

    async def test_action_markers_cover_exit_sequence(self, sched_env):
        """脚手架能记录 flush / completed / read_logs / cleanup 四个出口动作标记。

        顺序本身的断言属于任务 7.2，这里只确认标记齿轮都咬上了。

        **Validates: Requirements 2.20**
        """
        filename = sched_env.write_workflow("顺序任务.json", workflow_id="wf-seq")

        await sched_env.execute_scheduled(filename)

        for action in ("started", "execute", "flush", "completed", "read_logs", "cleanup"):
            assert action in sched_env.actions, (
                f"动作标记 {action!r} 未记录，实际序列: {sched_env.actions}"
            )

# ===== 任务 7.2：三条出口与出口动作顺序 =====

class AlreadyRunningExecutor:
    """占位执行器：只为让 `executions_store` 命中「工作流正在执行中」早退分支。"""

    def __init__(self):
        self.is_running = True


@pytest.mark.regression
class TestExitPathsEmitCompletedExactlyOnce:
    """正常结束 / 被停止 / 抛异常三条出口各恰好一次 `execution:completed`。"""

    async def test_normal_exit_emits_completed_once_with_completed_status(self, sched_env):
        """正常结束：恰好一次完成事件，状态为 `completed`。

        **Validates: Requirements 2.1, 2.3**
        """
        filename = sched_env.write_workflow("正常出口.json", workflow_id="wf-ok")

        outcome = await sched_env.execute_scheduled(filename)

        completed = sched_env.sio.events("execution:completed")
        assert len(completed) == 1, f"完成事件应恰好一次，实际 {len(completed)} 次"
        assert completed[0]["workflowId"] == filename
        assert completed[0]["result"]["status"] == "completed"
        assert outcome["success"] is True
        assert outcome["stopped"] is False

    async def test_stopped_exit_emits_completed_once_with_stopped_status(self, sched_env):
        """被停止：走的仍是正常出口（无独立分支），恰好一次完成事件，状态为 `stopped`。

        **Validates: Requirements 2.3**
        """
        sched_env.factory.behavior = "stopped"
        filename = sched_env.write_workflow("停止出口.json", workflow_id="wf-stop")

        outcome = await sched_env.execute_scheduled(filename)

        completed = sched_env.sio.events("execution:completed")
        assert len(completed) == 1, f"完成事件应恰好一次，实际 {len(completed)} 次"
        assert completed[0]["result"]["status"] == "stopped"
        assert outcome["success"] is False
        assert outcome["stopped"] is True

    async def test_exception_exit_emits_completed_once_with_failed_status(self, sched_env):
        """抛异常：恰好一次完成事件，`result` 为 None 时状态归一为 `failed`、模块数归一为 0。

        这是缺陷 A 的直接回归点：修复前异常出口只做清理就 return，监控页永久停留运行中。

        **Validates: Requirements 2.1, 2.2, 2.3**
        """
        sched_env.factory.behavior = "raise"
        filename = sched_env.write_workflow("异常出口.json", workflow_id="wf-raise")

        outcome = await sched_env.execute_scheduled(filename)

        completed = sched_env.sio.events("execution:completed")
        assert len(completed) == 1, f"异常出口也必须恰好一次完成事件，实际 {len(completed)} 次"
        assert completed[0]["workflowId"] == filename
        assert completed[0]["result"]["status"] == "failed"
        assert completed[0]["result"]["executedNodes"] == 0
        assert completed[0]["result"]["failedNodes"] == 0
        assert outcome["success"] is False
        assert outcome["error"] == sched_env.factory.error_message


@pytest.mark.regression
class TestExitActionOrder:
    """出口动作顺序是硬约束：错序会导致前端丢数据、日志读空或监控页收尾异常。"""

    async def test_started_precedes_executor_execute(self, sched_env):
        """`execution:started` 必须早于 `executor.execute()`，否则首批日志被前端清空抹掉。

        **Validates: Requirements 2.16**
        """
        filename = sched_env.write_workflow("开始顺序.json", workflow_id="wf-start")

        await sched_env.execute_scheduled(filename)

        assert sched_env.recorder.index("started") < sched_env.recorder.index("execute"), (
            f"execution:started 必须早于 execute()，实际序列: {sched_env.actions}"
        )

    @pytest.mark.parametrize("behavior", ["completed", "stopped", "raise"])
    async def test_flush_precedes_completed_and_completed_precedes_cleanup(
        self, sched_env, behavior
    ):
        """三条出口一致：数据行冲刷 → 完成事件 → cleanup。

        冲刷晚于完成事件会让前端漏掉尾部数据行；cleanup 早于完成事件会让采集数据取空。

        **Validates: Requirements 2.8**
        """
        sched_env.factory.behavior = behavior
        filename = sched_env.write_workflow(f"顺序-{behavior}.json", workflow_id="wf-order")

        await sched_env.execute_scheduled(filename)

        recorder = sched_env.recorder
        assert recorder.index("flush") < recorder.index("completed"), (
            f"尾部数据行冲刷必须早于完成事件，实际序列: {sched_env.actions}"
        )
        assert recorder.index("completed") < recorder.index("cleanup"), (
            f"完成事件必须早于 cleanup，实际序列: {sched_env.actions}"
        )

    @pytest.mark.parametrize("behavior", ["completed", "stopped", "raise"])
    async def test_read_full_logs_precedes_cleanup(self, sched_env, behavior):
        """三条出口一致：完整日志必须在 cleanup 之前读取（cleanup 之后取不到）。

        **Validates: Requirements 2.8**
        """
        sched_env.factory.behavior = behavior
        filename = sched_env.write_workflow(f"日志顺序-{behavior}.json", workflow_id="wf-logs")

        outcome = await sched_env.execute_scheduled(filename)

        assert sched_env.recorder.index("read_logs") < sched_env.recorder.index("cleanup"), (
            f"读取完整日志必须早于 cleanup，实际序列: {sched_env.actions}"
        )
        assert outcome["full_logs"] == sched_env.factory.logs


@pytest.mark.regression
class TestEarlyReturnPathsEmitNothing:
    """三条早退路径从未发过 `execution:started`，不得凭空补发完成事件。"""

    async def test_missing_workflow_file_emits_no_completed(self, sched_env):
        """工作流文件不存在：零完成事件、零开始事件。

        **Validates: Requirements 2.4**
        """
        outcome = await sched_env.execute_scheduled("根本不存在.json")

        assert outcome["success"] is False
        assert "工作流文件不存在" in outcome["error"]
        assert outcome["executor"] is None
        assert sched_env.sio.count("execution:started") == 0
        assert sched_env.sio.count("execution:completed") == 0
        assert sched_env.factory.created == []

    async def test_workflow_load_failure_emits_no_completed(self, sched_env):
        """工作流加载失败（JSON 非法）：零完成事件、零开始事件。

        **Validates: Requirements 2.4**
        """
        filename = "内容非法.json"
        (sched_env.folder / filename).write_text("{ 这不是合法的 JSON", encoding="utf-8")

        outcome = await sched_env.execute_scheduled(filename)

        assert outcome["success"] is False
        assert "加载工作流失败" in outcome["error"]
        assert outcome["executor"] is None
        assert sched_env.sio.count("execution:started") == 0
        assert sched_env.sio.count("execution:completed") == 0
        assert sched_env.factory.created == []

    async def test_already_running_workflow_emits_no_completed(self, sched_env):
        """工作流正在执行中：零完成事件，且不得清掉在跑执行器的引用。

        **Validates: Requirements 2.4**
        """
        filename = sched_env.write_workflow("已在执行.json", workflow_id="wf-busy")
        running = AlreadyRunningExecutor()
        sched_env.executions_store[filename] = running

        outcome = await sched_env.execute_scheduled(filename)

        assert outcome["success"] is False
        assert outcome["error"] == "工作流正在执行中"
        assert outcome["executor"] is None
        assert sched_env.sio.count("execution:started") == 0
        assert sched_env.sio.count("execution:completed") == 0
        assert sched_env.factory.created == []
        assert sched_env.executions_store[filename] is running


# ===== 任务 7.3：载荷字段与日志/数据行通道 =====

@pytest.mark.regression
class TestScheduledUsesBatchChannelsOnly:
    """计划任务的日志与数据行只能走合批通道，逐条事件必须为零。

    这是缺陷 B/C 的直接回归点：修复前的私有回调闭包逐条 `sio.emit('execution:log')`
    / `'execution:data_row'`，密集循环下灌满 WebSocket 通道，把要显示的日志挤到
    执行结束才一次性送达。
    """

    @pytest.mark.parametrize("behavior", ["completed", "stopped", "raise"])
    async def test_no_per_item_log_or_data_row_events(self, sched_env, behavior):
        """三条出口一致：零 `execution:log`、零 `execution:data_row`。

        同时断言批量通道确有事件发出，否则"逐条事件为零"会因为日志/数据行根本
        没产生而假绿（fixture 已把源头过滤置于详细模式，日志不会被过滤掉）。

        **Validates: Requirements 2.5, 2.6**
        """
        sched_env.factory.behavior = behavior
        filename = sched_env.write_workflow(f"通道-{behavior}.json", workflow_id="wf-chan")

        await sched_env.execute_scheduled(filename)

        assert sched_env.sio.count("execution:log") == 0, (
            "计划任务不得逐条推送 execution:log，必须走 execution:log_batch"
        )
        assert sched_env.sio.count("execution:data_row") == 0, (
            "计划任务不得逐条推送 execution:data_row，必须走 execution:data_row_batch"
        )
        assert sched_env.sio.count("execution:log_batch") >= 1, (
            f"日志应经合批通道发出，实际事件序列: {[e for e, _ in sched_env.sio.calls]}"
        )
        assert sched_env.sio.count("execution:data_row_batch") >= 1, (
            f"数据行应经合批通道发出，实际事件序列: {[e for e, _ in sched_env.sio.calls]}"
        )

    async def test_batched_logs_carry_streamed_entries(self, sched_env):
        """合批载荷里确实带上了执行期间产生的日志（通道打通而非空转）。

        **Validates: Requirements 2.5**
        """
        filename = sched_env.write_workflow("合批日志.json", workflow_id="wf-batch-log")

        await sched_env.execute_scheduled(filename)

        batched_ids = [
            log["id"]
            for payload in sched_env.sio.events("execution:log_batch")
            for log in payload["logs"]
        ]
        assert batched_ids == [log.id for log in sched_env.factory.streamed_logs]

    async def test_tail_data_rows_arrive_via_batch_on_exit(self, sched_env):
        """不足一批的尾部数据行由出口冲刷经批量事件发出，逐条事件仍为零。

        **Validates: Requirements 2.6**
        """
        filename = sched_env.write_workflow("尾部数据行.json", workflow_id="wf-tail")

        await sched_env.execute_scheduled(filename)

        rows = [
            row
            for payload in sched_env.sio.events("execution:data_row_batch")
            for row in payload["rows"]
        ]
        assert rows == sched_env.factory.streamed_rows
        assert sched_env.sio.count("execution:data_row") == 0


@pytest.mark.regression
class TestScheduledCompletedPayloadOmitsHealedSelectors:
    """计划任务不传 `healedSelectors` 是刻意设计：无人值守场景没人能回答写回询问。"""

    @pytest.mark.parametrize("behavior", ["completed", "stopped", "raise"])
    async def test_completed_payload_has_no_healed_selectors_key(self, sched_env, behavior):
        """三条出口一致：completed 载荷不含 `healedSelectors` 键。

        用键存在性断言而不是取值判空：前端只要看到该键就会弹出「是否把自愈后的
        选择器写回工作流」的询问，传 None 同样会触发。

        **Validates: Requirements 2.15**
        """
        sched_env.factory.behavior = behavior
        filename = sched_env.write_workflow(f"自愈-{behavior}.json", workflow_id="wf-heal")

        await sched_env.execute_scheduled(filename)

        completed = sched_env.sio.events("execution:completed")
        assert len(completed) == 1
        assert "healedSelectors" not in completed[0], (
            f"计划任务的 completed 载荷不得带 healedSelectors，实际载荷键: {sorted(completed[0])}"
        )
        # 其余现有字段一个都不能丢（healedSelectors 之外的载荷结构保持与手动路径一致）
        assert set(completed[0]) == {
            "workflowId",
            "result",
            "collectedData",
            "collectedDataTotal",
        }
        assert set(completed[0]["result"]) == {
            "status",
            "executedNodes",
            "failedNodes",
            "dataFile",
        }


@pytest.mark.regression
class TestFullLogsChannel:
    """`full_logs` 的唯一合法取法是 `executor.context.get_logs()`（历史缺陷取的是
    根本不存在的 `executor.logger`，导致计划任务日志恒为空）。"""

    async def test_full_logs_equals_context_get_logs_and_is_not_empty(self, sched_env):
        """正常出口：`full_logs` 非空且等于 `context.get_logs()` 的返回。

        **Validates: Requirements 3.4**
        """
        filename = sched_env.write_workflow("完整日志.json", workflow_id="wf-full-logs")

        outcome = await sched_env.execute_scheduled(filename)

        assert outcome["full_logs"], "full_logs 不得为空（否则任务卡片的日志弹窗看不到内容）"
        assert outcome["full_logs"] == sched_env.factory.logs
        # 再次直接调用假上下文，确认返回值同源（不是从别处凑出来的）
        assert outcome["full_logs"] == sched_env.factory.executor.context.get_logs()

    async def test_exception_exit_full_logs_contains_pre_exception_logs(self, sched_env):
        """异常出口：`full_logs` 带上异常前的日志（排障价值最高的那批）。

        **Validates: Requirements 3.4**
        """
        sched_env.factory.behavior = "raise"
        sched_env.factory.logs = [
            {"id": "before-1", "message": "异常前日志1"},
            {"id": "before-2", "message": "异常前日志2"},
        ]
        filename = sched_env.write_workflow("异常日志.json", workflow_id="wf-err-logs")

        outcome = await sched_env.execute_scheduled(filename)

        assert outcome["success"] is False
        assert outcome["full_logs"] == sched_env.factory.logs
        assert [log["id"] for log in outcome["full_logs"]] == ["before-1", "before-2"]

    async def test_get_logs_failure_degrades_to_empty_list_without_side_effects(
        self, sched_env
    ):
        """`context.get_logs()` 抛异常：`full_logs` 降级为 `[]`，执行结果与执行历史照旧。

        读日志只是事后回看通道，绝不能因为它失败而污染执行结果或丢掉执行历史。

        **Validates: Requirements 3.3, 3.4**
        """
        sched_env.factory.get_logs_raises = True
        filename = sched_env.write_workflow("读日志失败.json", workflow_id="wf-logfail")

        outcome = await sched_env.execute_scheduled(filename)

        assert outcome["full_logs"] == []
        # 执行结果不受影响
        assert outcome["success"] is True
        assert outcome["stopped"] is False
        assert outcome["error"] is None
        assert outcome["executed_nodes"] == sched_env.factory.executed_nodes
        assert outcome["collected_data"] == sched_env.factory.collected_data
        assert sched_env.execution_results[filename].status is ExecutionStatus.COMPLETED
        # 完成事件与执行历史照旧
        assert sched_env.sio.count("execution:completed") == 1
        assert len(sched_env.recorder.history) == 1
        assert sched_env.recorder.history[0]["status"] == "completed"
        assert sched_env.recorder.history[0]["source"] == "scheduled"

    async def test_get_logs_failure_on_exception_exit_still_emits_completed(self, sched_env):
        """异常出口叠加读日志失败：仍恰好一次完成事件，`full_logs` 为 `[]`。

        **Validates: Requirements 3.4**
        """
        sched_env.factory.behavior = "raise"
        sched_env.factory.get_logs_raises = True
        filename = sched_env.write_workflow("双重失败.json", workflow_id="wf-double-fail")

        outcome = await sched_env.execute_scheduled(filename)

        assert outcome["full_logs"] == []
        assert outcome["success"] is False
        assert outcome["error"] == sched_env.factory.error_message
        assert sched_env.sio.count("execution:completed") == 1
        assert sched_env.factory.cleaned_up == 1


# 正常出口（含被停止）返回字典的字段全集。
NORMAL_EXIT_RESULT_KEYS = {
    "success",
    "stopped",
    "error",
    "executed_nodes",
    "failed_nodes",
    "collected_data",
    "full_logs",
    "executor",
}
# 异常出口返回字典**没有** `stopped` 键——生产实现如此（异常必然不是"被停止"，
# 调用方 scheduled_task_manager 用 .get('stopped') 取值）。这里以生产实现为准，
# 若哪天要补齐该键，属于行为变更，需连带更新此基线。
EXCEPTION_EXIT_RESULT_KEYS = NORMAL_EXIT_RESULT_KEYS - {"stopped"}


@pytest.mark.regression
class TestReturnedResultDictShape:
    """返回字典是计划任务管理器写执行记录的唯一数据源，字段缺失会直接导致记录残缺。"""

    async def test_normal_exit_result_dict_is_complete(self, sched_env):
        """正常结束：八个字段齐全且取值正确。

        **Validates: Requirements 3.3**
        """
        filename = sched_env.write_workflow("返回结构.json", workflow_id="wf-shape")

        outcome = await sched_env.execute_scheduled(filename)

        assert set(outcome) == NORMAL_EXIT_RESULT_KEYS, (
            f"返回字典字段应为 {sorted(NORMAL_EXIT_RESULT_KEYS)}，实际 {sorted(outcome)}"
        )
        assert outcome["success"] is True
        assert outcome["stopped"] is False
        assert outcome["error"] is None
        assert outcome["executed_nodes"] == sched_env.factory.executed_nodes
        assert outcome["failed_nodes"] == sched_env.factory.failed_nodes
        assert outcome["collected_data"] == sched_env.factory.collected_data
        assert outcome["full_logs"] == sched_env.factory.logs
        assert outcome["executor"] is sched_env.factory.executor

    async def test_stopped_exit_result_dict_is_complete(self, sched_env):
        """被停止：走正常出口，字段全集不变，`stopped` 为 True 且 `success` 为 False。

        **Validates: Requirements 3.3**
        """
        sched_env.factory.behavior = "stopped"
        sched_env.factory.failed_nodes = 1
        filename = sched_env.write_workflow("停止结构.json", workflow_id="wf-shape-stop")

        outcome = await sched_env.execute_scheduled(filename)

        assert set(outcome) == NORMAL_EXIT_RESULT_KEYS
        assert outcome["success"] is False
        assert outcome["stopped"] is True
        assert outcome["error"] == sched_env.factory.error_message
        assert outcome["failed_nodes"] == 1
        assert outcome["full_logs"] == sched_env.factory.logs

    async def test_exception_exit_result_dict_matches_production_shape(self, sched_env):
        """抛异常：字段与生产实现一致（无 `stopped` 键），模块数归一为 0。

        **Validates: Requirements 3.3, 3.4**
        """
        sched_env.factory.behavior = "raise"
        filename = sched_env.write_workflow("异常结构.json", workflow_id="wf-shape-err")

        outcome = await sched_env.execute_scheduled(filename)

        assert set(outcome) == EXCEPTION_EXIT_RESULT_KEYS, (
            f"异常出口返回字典字段应为 {sorted(EXCEPTION_EXIT_RESULT_KEYS)}，"
            f"实际 {sorted(outcome)}"
        )
        assert outcome["success"] is False
        assert outcome["error"] == sched_env.factory.error_message
        assert outcome["executed_nodes"] == 0
        assert outcome["failed_nodes"] == 0
        assert outcome["collected_data"] == sched_env.factory.collected_data
        assert outcome["full_logs"] == sched_env.factory.logs
        assert outcome["executor"] is sched_env.factory.executor

    async def test_exception_exit_degrades_collected_data_without_losing_fields(
        self, sched_env
    ):
        """抛异常且取采集数据也失败：`collected_data` 降级为 `[]`，字段仍齐全、完成事件照发。

        **Validates: Requirements 3.3, 3.4**
        """
        sched_env.factory.behavior = "raise"
        sched_env.factory.collect_raises = True
        filename = sched_env.write_workflow("采集失败.json", workflow_id="wf-collect-fail")

        outcome = await sched_env.execute_scheduled(filename)

        assert set(outcome) == EXCEPTION_EXIT_RESULT_KEYS
        assert outcome["collected_data"] == []
        assert outcome["full_logs"] == sched_env.factory.logs
        assert sched_env.sio.count("execution:completed") == 1


# ===== 任务 7.4：阶段一防回归（run_execution 源码指纹） =====
#
# 阶段一的硬约束是「手动运行路径的 `run_execution` 函数体零改动」（需求 2.20 / 3.1）：
# 共享推送层只能是纯新增，先由计划任务单边接入并实机验收，手动路径在阶段二才切换。
# 光靠行为断言守不住这条约束（改错了照样可能全绿），所以这里直接把源码文本本身钉住：
# 用 `ast` 取出 `run_execution` 节点的源码片段，与下面的基线指纹（字符数 + SHA256）比对。
#
# 基线来源与校验方式：基线取自**修复前**的源码，即 git HEAD（提交 17cae48，早于本次 spec
# 的任何改动）中的 `backend/app/api/workflows.py`。采集时已用
# `git show HEAD:backend/app/api/workflows.py` 取出 HEAD 版本，按同样的 ast 取法拿到
# `run_execution` 源码片段，与当前工作区版本逐字节比对确认完全一致（长度均 9362），
# 才把该指纹写为基线。因此这条基线代表的是"修复前的原样"，而不是"改完之后的现状"。
#
# 【阶段二注意】任务 10 会把 `run_execution` 切换到共享推送函数，届时本用例**必然失败**，
# 这是设计意图而非误报。那时需要：
#   1. 重新采集指纹（运行本文件，失败信息里会直接给出当前的 length / sha256）；
#   2. 更新下面两个基线常量；
#   3. 在提交说明中显式标注"阶段二切换手动路径，同步更新 run_execution 源码基线"，
#      让 review 能看到这次指纹变更是有意为之。
# 在阶段一（任务 1-8）期间，本用例失败一律视为回归，应还原对 `run_execution` 的改动。

WORKFLOWS_PY = _BACKEND_DIR / "app" / "api" / "workflows.py"

# 修复前 `run_execution` 源码片段的指纹（换行统一为 \n 后计算）。
RUN_EXECUTION_BASELINE_LENGTH = 9362
RUN_EXECUTION_BASELINE_SHA256 = (
    "c385ce212f5452ba0faa046a8ba182525271854b6a848674b362b439aa80b8f7"
)


def extract_run_execution_source() -> str:
    """从 `workflows.py` 源码中取出 `run_execution` 的源码片段（换行归一为 \\n）。

    `run_execution` 是 `execute_workflow` 端点内的嵌套协程，所以用 `ast.walk` 按名查找
    而非只扫模块顶层。换行归一是为了让指纹不受 git 检出行尾策略（LF / CRLF）影响——
    否则同一份源码在 Windows 与 CI 上会算出两个不同的哈希。
    """
    assert WORKFLOWS_PY.exists(), f"未找到生产源码文件: {WORKFLOWS_PY}"
    # newline='' 保留原始行尾，由本函数统一归一，避免解释器的通用换行转换掩盖差异。
    source = WORKFLOWS_PY.read_text(encoding="utf-8", newline="")
    tree = ast.parse(source, filename=str(WORKFLOWS_PY))

    nodes = [
        node
        for node in ast.walk(tree)
        if isinstance(node, (ast.AsyncFunctionDef, ast.FunctionDef))
        and node.name == "run_execution"
    ]
    assert len(nodes) == 1, (
        f"在 {WORKFLOWS_PY} 中应恰好找到一个 run_execution 定义，实际找到 {len(nodes)} 个。"
        "若手动执行路径被重命名或拆分，请同步更新本用例的提取逻辑与基线指纹。"
    )

    segment = ast.get_source_segment(source, nodes[0])
    assert segment, "未能取到 run_execution 的源码片段（ast.get_source_segment 返回空）"
    return segment.replace("\r\n", "\n").replace("\r", "\n")


@pytest.mark.regression
class TestPhaseOneRunExecutionUnchanged:
    """阶段一防回归：`run_execution` 源码必须与修复前逐字节一致。"""

    def test_run_execution_source_matches_pre_fix_baseline(self):
        """`run_execution` 源码指纹（长度 + SHA256）与修复前基线完全一致。

        断言失败说明手动运行路径在阶段一被改动了。除任务 10（阶段二切换）之外，
        任何改动都属于回归，应当还原；确属阶段二切换时，按本节顶部注释更新基线。

        **Validates: Requirements 2.20, 3.1**
        """
        segment = extract_run_execution_source()
        digest = hashlib.sha256(segment.encode("utf-8")).hexdigest()

        assert len(segment) == RUN_EXECUTION_BASELINE_LENGTH, (
            "run_execution 源码长度已偏离修复前基线："
            f"期望 {RUN_EXECUTION_BASELINE_LENGTH} 字符，实际 {len(segment)} 字符。"
            f"当前 SHA256 = {digest}。阶段一要求该函数体零改动（需求 2.20 / 3.1）；"
            "若这是阶段二的手动路径切换，请更新本文件的基线常量并在提交说明中标注。"
        )
        assert digest == RUN_EXECUTION_BASELINE_SHA256, (
            "run_execution 源码内容已偏离修复前基线（长度未变但内容变了）："
            f"期望 SHA256 {RUN_EXECUTION_BASELINE_SHA256}，实际 {digest}。"
            "阶段一要求该函数体零改动（需求 2.20 / 3.1）；若这是阶段二的手动路径切换，"
            "请更新本文件的基线常量并在提交说明中标注。"
        )

    def test_run_execution_still_owns_its_manual_path_behaviors(self):
        """指纹之外再钉住几个语义锚点，让失败信息能直接指出丢了什么能力。

        指纹用例只会说"变了"，这条用例说明"变没了什么"：`run_execution` 内必须仍有
        自己的开始/完成事件、带 `healedSelectors` 的完成载荷（需求 3.2），
        以及 200ms 定时数据行冲刷协程（需求 3.14）。
        （`on_variable_update` 定义在 `run_execution` 之外，不在本片段的断言范围内。）

        **Validates: Requirements 2.20, 3.1**
        """
        segment = extract_run_execution_source()

        for anchor in (
            "execution:started",
            "execution:completed",
            "healedSelectors",
            "flush_data_rows",
            "_periodic_data_flush",
        ):
            assert anchor in segment, (
                f"run_execution 源码中缺少 {anchor!r}，手动运行路径能力已丢失"
            )
