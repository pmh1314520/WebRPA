# -*- coding: utf-8 -*-
"""手动运行路径执行事件推送回归测试（阶段二切换后）。

任务 10 已把 `run_execution` 的四个回调切换到共享推送层
（`**make_execution_callbacks(workflow_id)`），并把内联 `sio.emit` 换成
`emit_execution_started` / `emit_execution_completed`。本文件守住切换后手动路径
必须保留的三项能力：

- `execution:completed` 载荷仍带 `healedSelectors`（需求 3.2）——丢了不会报错，
  只是选择器自愈的写回询问再也不弹，属于典型的静默失效；
- `on_variable_update` 的 200ms 节流仍在（需求 3.13）；
- `finally` 收尾与 200ms 定时数据行冲刷协程仍在（需求 3.14）。

### 为什么能做运行时执行

`run_execution` 与 `on_variable_update` 都是 `execute_workflow` 端点内的嵌套协程，
无法 import。这里沿用 `test_regression_scheduled_events.py` 的做法：用 `ast` 取出这两个
函数节点，编译进命名空间执行——它们的闭包自由变量（`options` / `executor` / `workflow`
/ `DataExporter` / `_persist_full_data` / 各批量队列等）在编译成模块级函数后都变成全局
名字查找，因此**以 `workflows.py` 模块字典为底、只覆盖少量闭包变量**即可跑通全流程。
共享推送层（`emit_execution_completed` / `flush_data_rows` / `batch_emit_log`）与两道
源头过滤用的都是真实实现，只把 `sio` 换成替身，所以载荷字段与事件名都由生产代码决定。

### 一处覆盖不到的地方（不假装覆盖）

执行器的创建（`**make_execution_callbacks(workflow_id)` 与
`on_variable_update=on_variable_update` 的展开）位于 `execute_workflow` 端点体内、
**在 `run_execution` 之外**，运行时执行取不到；且真实 `WorkflowExecutor` 会拉起浏览器。
因此这段接线由 `TestEndpointWiresSharedCallbacks` 做源码级断言，回调本身的行为
由假执行器按共享工厂产出的回调驱动。
"""
import ast
import asyncio
import time
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace

import pytest

from app.api import workflows
from app.executors.base import ModuleResult
from app.models.workflow import ExecutionResult, ExecutionStatus, LogEntry, LogLevel

# backend/tests/regression/<本文件> → parents[2] 即 backend
_BACKEND_DIR = Path(__file__).resolve().parents[2]
WORKFLOWS_PY = _BACKEND_DIR / "app" / "api" / "workflows.py"

WORKFLOW_ID = "手动运行.json"

# 需要从 execute_workflow 端点闭包中取出的两个协程（顺序即定义顺序）
MANUAL_FUNCTION_NAMES = ("on_variable_update", "run_execution")


# ===== ast 提取 =====

def load_manual_functions(namespace: dict) -> dict:
    """把 `execute_workflow` 内的两个协程编译进 `namespace` 并返回函数对象。

    取节点失败一律断言 fail（不 skip）：结构变化必须立刻暴露，
    否则整组回归用例会静默退化成"全绿但什么都没测"。
    """
    assert WORKFLOWS_PY.exists(), f"未找到生产源码文件: {WORKFLOWS_PY}"
    source = WORKFLOWS_PY.read_text(encoding="utf-8")
    tree = ast.parse(source, filename=str(WORKFLOWS_PY))

    nodes = {}
    for name in MANUAL_FUNCTION_NAMES:
        found = [
            node
            for node in ast.walk(tree)
            if isinstance(node, (ast.AsyncFunctionDef, ast.FunctionDef))
            and node.name == name
        ]
        assert len(found) == 1, (
            f"在 {WORKFLOWS_PY} 中应恰好找到一个 {name} 定义，实际找到 {len(found)} 个。"
            "若手动执行路径被重命名或拆分，请同步更新 MANUAL_FUNCTION_NAMES 与提取逻辑。"
        )
        nodes[name] = found[0]

    module = ast.Module(
        body=[nodes[name] for name in MANUAL_FUNCTION_NAMES], type_ignores=[]
    )
    ast.fix_missing_locations(module)
    exec(compile(module, str(WORKFLOWS_PY), "exec"), namespace)

    return {name: namespace[name] for name in MANUAL_FUNCTION_NAMES}


def extract_execute_workflow_source() -> str:
    """取出 `execute_workflow` 端点的源码片段（执行器创建接线所在处）。"""
    source = WORKFLOWS_PY.read_text(encoding="utf-8")
    tree = ast.parse(source, filename=str(WORKFLOWS_PY))
    nodes = [
        node
        for node in ast.walk(tree)
        if isinstance(node, (ast.AsyncFunctionDef, ast.FunctionDef))
        and node.name == "execute_workflow"
    ]
    assert len(nodes) == 1, (
        f"在 {WORKFLOWS_PY} 中应恰好找到一个 execute_workflow 定义，实际 {len(nodes)} 个"
    )
    segment = ast.get_source_segment(source, nodes[0])
    assert segment, "未能取到 execute_workflow 的源码片段"
    return segment


# ===== 测试替身 =====

# 假 sio 收到的事件 → 动作标记（只关心与顺序有关的几个事件）
_ACTION_BY_EVENT = {
    "execution:started": "started",
    "execution:log_batch": "log_batch",
    "execution:data_row_batch": "flush",
    "execution:completed": "completed",
}


class Recorder:
    """假执行器与假推送共享的动作序列记录器。"""

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
    """记录 (event, payload) 序列的假 Socket.IO 实例。"""

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
    """假执行上下文：只提供手动路径出口真正用到的东西。"""

    def __init__(self):
        self.variables: dict = {"总数": 3}
        # 选择器自愈记录：手动路径的 completed 载荷要把它带给前端
        self._healed_selectors: list[dict] = []
        self._tracking: list[dict] = [{"name": "总数", "value": 3}]

    def get_variable_tracking(self):
        return list(self._tracking)


class FakeExecutor:
    """假工作流执行器：按共享工厂产出的回调推送日志/节点/数据行。"""

    def __init__(self, recorder: Recorder, callbacks: dict):
        self.recorder = recorder
        self.callbacks = callbacks
        self.context = FakeContext()
        self.is_running = False

        # 行为开关：'completed' / 'stopped' / 'raise'
        self.behavior = "completed"
        self.error_message = "节点执行故意失败"
        self.executed_nodes = 3
        self.failed_nodes = 1
        self.streamed_logs: list[LogEntry] = [make_log("log-1"), make_log("log-2")]
        self.streamed_nodes: list[str] = ["node-1"]
        self.streamed_rows: list[dict] = [{"index": 0}, {"index": 1}]
        self.collected_data: list[dict] = [{"index": 0}, {"index": 1}]
        # 推完数据行后在执行中停留的时长，用于验证 200ms 定时冲刷协程
        self.stream_delay = 0.0

    async def execute(self):
        self.recorder.mark("execute_start")
        self.is_running = True
        for log in self.streamed_logs:
            await self.callbacks["on_log"](log)
        for node_id in self.streamed_nodes:
            await self.callbacks["on_node_start"](node_id)
            await self.callbacks["on_node_complete"](
                node_id, ModuleResult(success=True, message="ok", duration=1.0)
            )
        for row in self.streamed_rows:
            await self.callbacks["on_data_row"](row)
        if self.stream_delay:
            await asyncio.sleep(self.stream_delay)
        self.is_running = False
        self.recorder.mark("execute_end")

        if self.behavior == "raise":
            raise RuntimeError(self.error_message)
        return ExecutionResult(
            workflow_id=WORKFLOW_ID,
            status=(
                ExecutionStatus.STOPPED
                if self.behavior == "stopped"
                else ExecutionStatus.COMPLETED
            ),
            started_at=datetime(2024, 5, 1, 10, 0, 0),
            completed_at=datetime(2024, 5, 1, 10, 1, 0),
            total_nodes=len(self.streamed_nodes),
            executed_nodes=self.executed_nodes,
            failed_nodes=self.failed_nodes,
        )

    def get_collected_data(self):
        return list(self.collected_data)

    async def cleanup(self):
        self.recorder.mark("cleanup")


class FakeDataExporter:
    """假数据导出器：不落盘，只回一个文件名供 result.data_file 使用。"""

    exported: list[list[dict]] = []

    def export_to_excel(self, rows):
        FakeDataExporter.exported.append(list(rows))
        return "导出结果.xlsx"


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

class ManualEnv:
    """一次用例所需的全部上下文：被提取的协程、假依赖与断言辅助。"""

    def __init__(self, functions, namespace, recorder, sio, executor):
        self.run_execution = functions["run_execution"]
        self.on_variable_update = functions["on_variable_update"]
        self.namespace = namespace
        self.recorder = recorder
        self.sio = sio
        self.executor = executor

        self.executions_store = namespace["executions_store"]
        self.execution_results = namespace["execution_results"]
        self.execution_data = namespace["execution_data"]
        self.global_variables = namespace["global_variables"]
        self.variable_tracking_store = namespace["variable_tracking_store"]
        self.var_update_last_emit = namespace["_var_update_last_emit"]

    @property
    def actions(self) -> list[str]:
        return self.recorder.actions

    def set_persist_hook(self, hook) -> None:
        """在 `_persist_full_data` 被调用时插入一个钩子（用于在收尾前埋残留状态）。"""
        self.namespace["_persist_full_data"] = lambda workflow_id, rows: hook()


@pytest.fixture
def manual_env(monkeypatch):
    """构建手动路径脚手架：ast 提取两个协程 + 以 workflows 模块字典为底注入闭包变量。

    共享推送层（`emit_execution_started` / `emit_execution_completed` /
    `flush_data_rows` / `batch_emit_log`）与两道源头过滤都用**真实**实现，
    只把 `sio` 换成替身，保证事件名与载荷字段由生产代码决定。
    """
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
    # 默认「详细模式」：两道源头过滤都放行，避免"零逐条事件"的断言因日志被过滤而假绿
    workflows.log_enabled_by_client.clear()
    workflows.log_enabled_by_client["sid-verbose"] = True
    workflows.log_batch_queue.clear()
    workflows.log_batch_tasks.clear()
    workflows.data_row_batch_queue.clear()
    FakeDataExporter.exported = []

    # 函数内 import 的执行历史/告警无法通过命名空间替换，只能 monkeypatch 真实模块
    from app.services import alert_center, execution_history

    def _record_run(**kwargs):
        record = dict(kwargs)
        recorder.history.append(record)
        return record

    async def _dispatch_alert_async(record):
        recorder.alerts.append(record)
        return record

    monkeypatch.setattr(execution_history, "record_run", _record_run)
    monkeypatch.setattr(alert_center, "dispatch_alert_async", _dispatch_alert_async)

    executor = FakeExecutor(recorder, workflows.make_execution_callbacks(WORKFLOW_ID))

    # 以 workflows 模块字典为底：批量队列、锁、共享推送函数、safe_emit 等全部是真实对象
    namespace = dict(workflows.__dict__)
    namespace.update(
        {
            # run_execution / on_variable_update 的闭包变量
            "workflow_id": WORKFLOW_ID,
            "executor": executor,
            "workflow": SimpleNamespace(id=WORKFLOW_ID, name="回归用工作流"),
            "options": SimpleNamespace(
                browserConfig=SimpleNamespace(autoCloseBrowser=True)
            ),
            # 用例专属的内存 store，避免污染真实模块状态
            "executions_store": {WORKFLOW_ID: executor},
            "execution_results": {},
            "execution_data": {},
            "global_variables": {},
            "variable_tracking_store": {},
            "_var_update_last_emit": {},
            # 不落盘：导出与全量持久化都换成替身
            "DataExporter": FakeDataExporter,
            "_persist_full_data": lambda workflow_id, rows: recorder.mark("persist"),
        }
    )
    functions = load_manual_functions(namespace)

    yield ManualEnv(functions, namespace, recorder, fake_sio, executor)

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


# ===== 任务 11：手动路径 completed 载荷仍含 healedSelectors =====

@pytest.mark.regression
class TestManualCompletedPayloadCarriesHealedSelectors:
    """手动路径的 completed 载荷必须继续带 `healedSelectors`。

    前端拿到该键才会弹出「是否把自愈后的选择器写回工作流」的询问。丢了不会报错，
    只是询问再也不弹——静默失效，因此这里用运行时载荷断言把它钉住。
    """

    async def test_normal_exit_payload_contains_healed_selectors(self, manual_env):
        """正常结束：载荷含 `healedSelectors`，取值等于 `context._healed_selectors`。

        **Validates: Requirements 3.2**
        """
        healed = [{"nodeId": "node-1", "old": "#a", "new": "#b"}]
        manual_env.executor.context._healed_selectors = healed

        await manual_env.run_execution()

        completed = manual_env.sio.events("execution:completed")
        assert len(completed) == 1, f"完成事件应恰好一次，实际 {len(completed)} 次"
        payload = completed[0]
        assert "healedSelectors" in payload, (
            f"手动路径 completed 载荷必须带 healedSelectors，实际键: {sorted(payload)}"
        )
        assert payload["healedSelectors"] == healed

    async def test_normal_exit_payload_keeps_every_existing_field(self, manual_env):
        """正常结束：`healedSelectors` 之外的现有字段一个都不能丢。

        **Validates: Requirements 2.14, 3.2**
        """
        manual_env.executor.context._healed_selectors = [{"nodeId": "node-1"}]

        await manual_env.run_execution()

        payload = manual_env.sio.events("execution:completed")[0]
        assert set(payload) == {
            "workflowId",
            "result",
            "collectedData",
            "collectedDataTotal",
            "healedSelectors",
        }
        assert payload["workflowId"] == WORKFLOW_ID
        assert set(payload["result"]) == {
            "status",
            "executedNodes",
            "failedNodes",
            "dataFile",
        }
        assert payload["result"]["status"] == "completed"
        assert payload["result"]["executedNodes"] == manual_env.executor.executed_nodes
        assert payload["result"]["failedNodes"] == manual_env.executor.failed_nodes
        assert payload["result"]["dataFile"] == "导出结果.xlsx"
        assert payload["collectedData"] == manual_env.executor.collected_data
        assert payload["collectedDataTotal"] == len(manual_env.executor.collected_data)

    async def test_healed_selectors_key_present_even_when_nothing_healed(self, manual_env):
        """本次执行没有自愈：键仍在，取值为空列表（键存在性是前端的判定依据）。

        **Validates: Requirements 3.2**
        """
        manual_env.executor.context._healed_selectors = []

        await manual_env.run_execution()

        payload = manual_env.sio.events("execution:completed")[0]
        assert "healedSelectors" in payload
        assert payload["healedSelectors"] == []

    async def test_stopped_exit_payload_contains_healed_selectors(self, manual_env):
        """被停止：走同一条正常出口，`healedSelectors` 照带、状态为 `stopped`。

        **Validates: Requirements 3.2**
        """
        manual_env.executor.behavior = "stopped"
        manual_env.executor.context._healed_selectors = [{"nodeId": "node-1"}]

        await manual_env.run_execution()

        payload = manual_env.sio.events("execution:completed")[0]
        assert payload["result"]["status"] == "stopped"
        assert payload["healedSelectors"] == [{"nodeId": "node-1"}]

    async def test_exception_exit_omits_healed_selectors_and_reports_real_counts(
        self, manual_env
    ):
        """抛异常：恰好一次完成事件，状态 `failed`，不带 `healedSelectors`，模块数照实上报。

        异常出口不传该参数与修复前一致（此时自愈记录不可靠，且执行器状态已异常）；
        模块数取执行器已累计的值，不得被归一成 0。

        **Validates: Requirements 2.15, 3.2**
        """
        manual_env.executor.behavior = "raise"
        manual_env.executor.context._healed_selectors = [{"nodeId": "node-1"}]

        await manual_env.run_execution()

        completed = manual_env.sio.events("execution:completed")
        assert len(completed) == 1, f"异常出口也必须恰好一次完成事件，实际 {len(completed)} 次"
        payload = completed[0]
        assert payload["result"]["status"] == "failed"
        assert payload["result"]["executedNodes"] == manual_env.executor.executed_nodes
        assert payload["result"]["failedNodes"] == manual_env.executor.failed_nodes
        assert "healedSelectors" not in payload, (
            f"异常出口不应带 healedSelectors，实际键: {sorted(payload)}"
        )
        assert payload["collectedData"] == []
        assert payload["collectedDataTotal"] == 0


@pytest.mark.regression
class TestManualPathUsesSharedBatchChannels:
    """切换到共享推送层后，手动路径的日志与数据行仍只走合批通道。"""

    async def test_no_per_item_log_or_data_row_events(self, manual_env):
        """零 `execution:log`、零 `execution:data_row`，且批量通道确有事件。

        **Validates: Requirements 2.14**
        """
        await manual_env.run_execution()

        assert manual_env.sio.count("execution:log") == 0
        assert manual_env.sio.count("execution:data_row") == 0
        batched_ids = [
            log["id"]
            for payload in manual_env.sio.events("execution:log_batch")
            for log in payload["logs"]
        ]
        assert batched_ids == [log.id for log in manual_env.executor.streamed_logs]
        rows = [
            row
            for payload in manual_env.sio.events("execution:data_row_batch")
            for row in payload["rows"]
        ]
        assert rows == manual_env.executor.streamed_rows

    async def test_started_precedes_execute_and_completed_follows_flush(self, manual_env):
        """事件序列：started → execute → 数据行冲刷 → completed → （已配置则）cleanup。

        **Validates: Requirements 2.14**
        """
        await manual_env.run_execution()

        recorder = manual_env.recorder
        assert recorder.index("started") < recorder.index("execute_start"), (
            f"execution:started 必须早于执行开始，实际序列: {manual_env.actions}"
        )
        assert recorder.index("flush") < recorder.index("completed"), (
            f"尾部数据行冲刷必须早于完成事件，实际序列: {manual_env.actions}"
        )
        assert recorder.index("cleanup") < recorder.index("completed"), (
            "手动路径按 autoCloseBrowser 配置在完成事件之前关闭浏览器（与修复前一致），"
            f"实际序列: {manual_env.actions}"
        )


# ===== 任务 11：手动路径独有的两项能力（200ms 节流 + finally 收尾） =====

@pytest.mark.regression
class TestPeriodicDataFlushStillRuns:
    """200ms 定时数据行冲刷协程必须保留：不满一批也要在执行期间流式送达前端。"""

    async def test_rows_below_batch_size_are_flushed_during_execution(self, manual_env):
        """不足一批（2 < DATA_ROW_BATCH_SIZE）的数据行在执行**结束前**就已批量发出。

        没有定时冲刷协程时，这些行只能等到出口才发，断言会因 flush 晚于 execute_end 而失败。

        **Validates: Requirements 3.14**
        """
        assert len(manual_env.executor.streamed_rows) < workflows.DATA_ROW_BATCH_SIZE
        # 数据行推完后在执行中停留 0.5s，足够定时协程（200ms）触发一次
        manual_env.executor.stream_delay = 0.5

        await manual_env.run_execution()

        recorder = manual_env.recorder
        assert recorder.index("flush") < recorder.index("execute_end"), (
            "不足一批的数据行必须由 200ms 定时冲刷协程在执行期间送达，"
            f"实际序列: {manual_env.actions}"
        )


@pytest.mark.regression
class TestFinallyCleanupIsPreserved:
    """`finally` 收尾：冲刷剩余批量日志 + 清理三处队列/时间戳 + 取消定时任务。"""

    async def test_leftover_batched_logs_are_flushed_and_state_is_cleaned(self, manual_env):
        """在收尾之前埋下残留状态，验证 `finally` 把它们全部处理干净。

        残留通过 `_persist_full_data` 钩子埋入（该调用位于出口收尾之前），
        这样能模拟"执行末尾仍有不足一批的日志与在跑的定时日志任务"的真实情形。

        **Validates: Requirements 3.14**
        """

        class CancelSpy:
            def __init__(self):
                self.cancelled = False

            def cancel(self):
                self.cancelled = True

        spy = CancelSpy()
        leftover = {"id": "leftover-1", "message": "收尾时仍在队列里的日志"}

        def _seed_residual_state():
            workflows.log_batch_queue[WORKFLOW_ID] = [leftover]
            workflows.log_batch_tasks[WORKFLOW_ID] = spy

        manual_env.set_persist_hook(_seed_residual_state)
        manual_env.var_update_last_emit[WORKFLOW_ID] = time.monotonic()

        await manual_env.run_execution()

        # 残留日志被冲刷出去
        flushed = [
            log
            for payload in manual_env.sio.events("execution:log_batch")
            for log in payload["logs"]
        ]
        assert leftover in flushed, "收尾必须冲刷剩余的批量日志，否则末尾日志会丢"
        # 三处队列/时间戳与定时日志任务全部清理
        assert WORKFLOW_ID not in workflows.log_batch_queue
        assert WORKFLOW_ID not in workflows.log_batch_tasks
        assert spy.cancelled, "残留的批量日志定时任务必须被取消"
        assert WORKFLOW_ID not in workflows.data_row_batch_queue
        assert WORKFLOW_ID not in manual_env.var_update_last_emit
        # 执行器引用清理，变量追踪与全局变量在清理前已保存
        assert WORKFLOW_ID not in manual_env.executions_store
        assert manual_env.variable_tracking_store[WORKFLOW_ID] == [
            {"name": "总数", "value": 3}
        ]
        assert manual_env.global_variables == {"总数": 3}

    async def test_cleanup_also_runs_on_exception_exit(self, manual_env):
        """异常出口同样走 `finally`：队列与节流时间戳照样清理干净。

        **Validates: Requirements 3.14**
        """
        manual_env.executor.behavior = "raise"
        manual_env.var_update_last_emit[WORKFLOW_ID] = time.monotonic()

        await manual_env.run_execution()

        assert WORKFLOW_ID not in workflows.log_batch_queue
        assert WORKFLOW_ID not in workflows.data_row_batch_queue
        assert WORKFLOW_ID not in manual_env.var_update_last_emit
        assert WORKFLOW_ID not in manual_env.executions_store


@pytest.mark.regression
class TestVariableUpdateThrottle:
    """`on_variable_update` 的 200ms 节流是手动路径独有能力（计划任务不接该回调）。"""

    async def test_second_update_within_window_is_dropped(self, manual_env):
        """窗口内的连续变量更新只发一条；跨过 200ms 后才再发一条。

        不 patch `time.monotonic`（会干扰事件循环调度），而是直接改写节流时间戳，
        用真实时钟验证窗口边界：0.1s 前的更新仍被拦，0.25s 前的更新放行。

        **Validates: Requirements 3.13**
        """
        await manual_env.on_variable_update("计数", 1)
        assert manual_env.sio.count("execution:variable_update") == 1
        payload = manual_env.sio.events("execution:variable_update")[0]
        assert payload["workflowId"] == WORKFLOW_ID
        assert payload["name"] == "计数"
        assert payload["value"] == 1
        assert payload["type"] == "number"
        assert WORKFLOW_ID in manual_env.var_update_last_emit

        # 紧接着的第二条被节流丢弃
        await manual_env.on_variable_update("计数", 2)
        assert manual_env.sio.count("execution:variable_update") == 1

        # 距上次 0.1s（< 200ms）：仍被拦
        manual_env.var_update_last_emit[WORKFLOW_ID] = time.monotonic() - 0.1
        await manual_env.on_variable_update("计数", 3)
        assert manual_env.sio.count("execution:variable_update") == 1

        # 距上次 0.25s（> 200ms）：放行
        manual_env.var_update_last_emit[WORKFLOW_ID] = time.monotonic() - 0.25
        await manual_env.on_variable_update("计数", 4)
        assert manual_env.sio.count("execution:variable_update") == 2
        assert manual_env.sio.events("execution:variable_update")[1]["value"] == 4


@pytest.mark.regression
class TestEndpointWiresSharedCallbacks:
    """执行器创建位于 `run_execution` 之外（`execute_workflow` 端点体内），
    运行时执行取不到，这段接线只能做源码级断言。"""

    def test_executor_is_created_with_shared_factory_and_variable_update(self):
        """端点用共享工厂展开四个回调，并单独传入手动路径独有的 `on_variable_update`。

        **Validates: Requirements 2.14, 3.13**
        """
        segment = extract_execute_workflow_source()

        assert "**make_execution_callbacks(workflow_id)" in segment, (
            "execute_workflow 必须用共享回调工厂创建执行器，否则双份 emit 实现会复活"
        )
        assert "on_variable_update=on_variable_update" in segment, (
            "on_variable_update 是手动路径独有能力，必须显式传给执行器"
        )
