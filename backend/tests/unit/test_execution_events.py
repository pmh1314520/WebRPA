# -*- coding: utf-8 -*-
"""执行事件共享推送层单元测试（backend/app/api/workflows.py）。

覆盖设计文档「用例清单 → 共享函数（unit）」第 1-17 项：
回调工厂键集合、日志载荷八键与取值、两道源头过滤、数据行合批上界、
completed 载荷归一与截断、healedSelectors 归属、以及全链路异常隔离。

刻意不 mock is_log_enabled / is_verbose_enabled，而是直接操作
workflows.log_enabled_by_client 构造「无客户端 / 简洁模式 / 详细模式」三种状态，
使过滤规则本身进入断言范围。日志一律用真实 LogEntry 构造，
避免替身掩盖 .isoformat() / .value 的取法错误。
"""
import asyncio
import math
from datetime import datetime

import pytest

from app.api import workflows
from app.executors.base import ModuleResult
from app.models.workflow import ExecutionResult, ExecutionStatus, LogEntry, LogLevel


# ===== 测试替身 =====

class FakeSio:
    """记录 (event, payload) 调用序列的假 Socket.IO 实例。"""

    def __init__(self):
        self.calls: list[tuple[str, dict]] = []

    async def emit(self, event, payload=None):
        self.calls.append((event, payload))

    def events(self, name: str) -> list[dict]:
        return [payload for event, payload in self.calls if event == name]

    def count(self, name: str) -> int:
        return len(self.events(name))


class ExplodingSio:
    """emit 恒抛异常的假 Socket.IO 实例，用于验证推送失败不可传染。"""

    def __init__(self):
        self.attempts: list[str] = []

    async def emit(self, event, payload=None):
        self.attempts.append(event)
        raise RuntimeError(f"emit {event} 故意失败")


# ===== 全局状态隔离 =====

@pytest.fixture
def events_env():
    """接管并在用例结束后恢复共享推送层依赖的全部模块级状态。

    被接管的状态：sio 实例、日志开关字典、日志批量队列/任务、数据行批量队列。
    默认注入 FakeSio 并置为「详细模式」（单客户端 verbose=True）。
    """
    original_sio = workflows.sio
    original_switches = dict(workflows.log_enabled_by_client)
    original_log_queue = dict(workflows.log_batch_queue)
    original_log_tasks = dict(workflows.log_batch_tasks)
    original_row_queue = dict(workflows.data_row_batch_queue)
    # asyncio.Lock 会在首次争用时绑定当前事件循环，而每个用例都跑在各自的新循环上。
    # 换成本用例专属的新锁，避免跨循环复用导致的偶发 RuntimeError，用例结束后还原。
    original_log_lock = workflows.log_batch_lock
    original_row_lock = workflows.data_row_batch_lock
    workflows.log_batch_lock = asyncio.Lock()
    workflows.data_row_batch_lock = asyncio.Lock()

    fake = FakeSio()
    workflows.set_sio(fake)
    workflows.log_enabled_by_client.clear()
    workflows.log_enabled_by_client['sid-verbose'] = True
    workflows.log_batch_queue.clear()
    workflows.log_batch_tasks.clear()
    workflows.data_row_batch_queue.clear()

    class Env:
        sio = fake

        @staticmethod
        def use_sio(instance):
            """替换 sio 实例（None 表示未注入 Socket）。"""
            workflows.set_sio(instance)
            Env.sio = instance
            return instance

        @staticmethod
        def no_client():
            """无客户端在接收日志：is_log_enabled() → False。"""
            workflows.log_enabled_by_client.clear()

        @staticmethod
        def concise_mode():
            """简洁模式：有客户端但均未开启详细日志。"""
            workflows.log_enabled_by_client.clear()
            workflows.log_enabled_by_client['sid-concise'] = False

        @staticmethod
        def verbose_mode():
            """详细模式：至少一个客户端开启详细日志。"""
            workflows.log_enabled_by_client.clear()
            workflows.log_enabled_by_client['sid-verbose'] = True

    yield Env

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


def make_log(
    log_id: str = "log-1",
    level: LogLevel = LogLevel.INFO,
    details=None,
    node_id: str = "node-1",
    message: str = "执行中",
    duration=12.5,
) -> LogEntry:
    """构造真实 LogEntry（timestamp 是真实 datetime、level 是真实枚举）。"""
    return LogEntry(
        id=log_id,
        timestamp=datetime(2024, 5, 1, 10, 30, 0),
        level=level,
        node_id=node_id,
        message=message,
        details=details,
        duration=duration,
    )


def collected_log_payloads(sio: FakeSio) -> list[dict]:
    """把批量日志事件里的所有日志条目摊平，便于按条断言。"""
    payloads = []
    for batch in sio.events('execution:log_batch'):
        payloads.extend(batch['logs'])
    return payloads


EXPECTED_LOG_KEYS = {
    'id', 'timestamp', 'level', 'nodeId', 'message', 'duration',
    'isUserLog', 'isSystemLog',
}


# ===== 用例 1-2：回调工厂的键集合 =====

@pytest.mark.unit
class TestCallbackFactoryShape:
    def test_factory_returns_exactly_four_callbacks(self):
        """用例 1：工厂返回的键集合恰为四个回调（集合相等，不是包含）。

        **Validates: Requirements 2.14**
        """
        callbacks = workflows.make_execution_callbacks('wf.json')
        assert set(callbacks.keys()) == {
            'on_log', 'on_node_start', 'on_node_complete', 'on_data_row',
        }
        assert all(callable(fn) for fn in callbacks.values())

    def test_factory_excludes_variable_update(self):
        """用例 2：不含 on_variable_update（前端不消费，密集循环下会挤占通道）。

        **Validates: Requirements 2.17**
        """
        assert 'on_variable_update' not in workflows.make_execution_callbacks('wf.json')


# ===== 用例 3-5：日志载荷 =====

@pytest.mark.unit
class TestLogPayload:
    async def test_log_payload_has_exactly_eight_keys(self, events_env):
        """用例 3：日志载荷恰含八个键，且走批量事件而非逐条事件。

        **Validates: Requirements 2.5, 2.13**
        """
        callbacks = workflows.make_execution_callbacks('wf-keys.json')
        await callbacks['on_log'](make_log())

        assert events_env.sio.count('execution:log') == 0
        payloads = collected_log_payloads(events_env.sio)
        assert len(payloads) == 1
        assert set(payloads[0].keys()) == EXPECTED_LOG_KEYS

    async def test_timestamp_is_iso_string_and_level_uses_value(self, events_env):
        """用例 4：timestamp 为 ISO 字符串、level 取枚举 .value。

        **Validates: Requirements 2.13**
        """
        callbacks = workflows.make_execution_callbacks('wf-iso.json')
        await callbacks['on_log'](make_log(level=LogLevel.WARNING))

        payload = collected_log_payloads(events_env.sio)[0]
        assert payload['timestamp'] == '2024-05-01T10:30:00'
        assert isinstance(payload['timestamp'], str)
        assert payload['level'] == 'warning'
        assert payload['id'] == 'log-1'
        assert payload['nodeId'] == 'node-1'
        assert payload['message'] == '执行中'
        assert payload['duration'] == 12.5

    @pytest.mark.parametrize(
        "details, expect_user, expect_system",
        [
            ({'is_user_log': True, 'is_system_log': True}, True, True),
            ({'is_user_log': True}, True, False),
            ({}, False, False),
            (None, False, False),
        ],
    )
    async def test_user_and_system_flags_from_details(
        self, events_env, details, expect_user, expect_system
    ):
        """用例 5：isUserLog / isSystemLog 取自 details（含键 / 不含键 / 为 None）。

        **Validates: Requirements 2.13**
        """
        callbacks = workflows.make_execution_callbacks('wf-flags.json')
        await callbacks['on_log'](make_log(details=details))

        payload = collected_log_payloads(events_env.sio)[0]
        assert payload['isUserLog'] is expect_user
        assert payload['isSystemLog'] is expect_system


# ===== 用例 6-9：两道源头过滤 =====

@pytest.mark.unit
class TestLogSourceFilters:
    async def test_no_client_produces_zero_emit(self, events_env):
        """用例 6：无客户端接收日志时零 emit（第一道过滤）。

        **Validates: Requirements 2.9**
        """
        events_env.no_client()
        callbacks = workflows.make_execution_callbacks('wf-noclient.json')

        for level in (LogLevel.INFO, LogLevel.ERROR, LogLevel.WARNING):
            await callbacks['on_log'](make_log(level=level, details={'is_user_log': True}))

        assert events_env.sio.calls == []

    @pytest.mark.parametrize("level", [LogLevel.INFO, LogLevel.DEBUG, LogLevel.SUCCESS])
    async def test_concise_mode_drops_plain_logs(self, events_env, level):
        """用例 7：简洁模式下非用户/非系统且非 error/warning 的日志被丢弃。

        **Validates: Requirements 2.10**
        """
        events_env.concise_mode()
        callbacks = workflows.make_execution_callbacks('wf-concise.json')
        await callbacks['on_log'](make_log(level=level))

        assert collected_log_payloads(events_env.sio) == []

    @pytest.mark.parametrize(
        "level, details",
        [
            (LogLevel.INFO, {'is_user_log': True}),
            (LogLevel.INFO, {'is_system_log': True}),
            (LogLevel.ERROR, None),
            (LogLevel.WARNING, None),
        ],
    )
    async def test_concise_mode_keeps_important_logs(self, events_env, level, details):
        """用例 8：简洁模式下用户日志 / 系统日志 / error / warning 全部保留。

        **Validates: Requirements 2.10**
        """
        events_env.concise_mode()
        callbacks = workflows.make_execution_callbacks('wf-concise-keep.json')
        await callbacks['on_log'](make_log(level=level, details=details))

        assert len(collected_log_payloads(events_env.sio)) == 1

    async def test_verbose_mode_keeps_everything(self, events_env):
        """用例 9：详细模式下全部日志保留。

        **Validates: Requirements 2.10**
        """
        events_env.verbose_mode()
        callbacks = workflows.make_execution_callbacks('wf-verbose.json')
        levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.SUCCESS,
                  LogLevel.WARNING, LogLevel.ERROR]
        for idx, level in enumerate(levels):
            await callbacks['on_log'](make_log(log_id=f"log-{idx}", level=level))

        payloads = collected_log_payloads(events_env.sio)
        assert [p['level'] for p in payloads] == [lv.value for lv in levels]


# ===== 用例 10-11：数据行合批 =====

@pytest.mark.unit
class TestDataRowBatching:
    async def test_batch_count_upper_bound(self, events_env):
        """用例 10：数据行推送次数 ≤ ⌈行数 / DATA_ROW_BATCH_SIZE⌉ + 1，且零逐条事件。

        **Validates: Requirements 2.6**
        """
        workflow_id = 'wf-rows.json'
        total = workflows.DATA_ROW_BATCH_SIZE * 2 + 50
        callbacks = workflows.make_execution_callbacks(workflow_id)

        for i in range(total):
            await callbacks['on_data_row']({'index': i})
        # 出口显式冲刷不足一批的尾部行
        await workflows.flush_data_rows(workflow_id)

        batches = events_env.sio.events('execution:data_row_batch')
        upper_bound = math.ceil(total / workflows.DATA_ROW_BATCH_SIZE) + 1
        assert len(batches) <= upper_bound
        assert events_env.sio.count('execution:data_row') == 0

        delivered = [row['index'] for batch in batches for row in batch['rows']]
        assert delivered == list(range(total)), "合批不得丢行或乱序"
        assert all(batch['workflowId'] == workflow_id for batch in batches)

    async def test_partial_batch_only_flushed_explicitly(self, events_env):
        """用例 11：不足一批的尾部行在 flush_data_rows 时才发出。

        **Validates: Requirements 2.6**
        """
        workflow_id = 'wf-tail.json'
        callbacks = workflows.make_execution_callbacks(workflow_id)

        for i in range(3):
            await callbacks['on_data_row']({'index': i})
        assert events_env.sio.count('execution:data_row_batch') == 0, "不足一批不应提前推送"

        await workflows.flush_data_rows(workflow_id)
        batches = events_env.sio.events('execution:data_row_batch')
        assert len(batches) == 1
        assert [row['index'] for row in batches[0]['rows']] == [0, 1, 2]


# ===== 用例 12：节点完成载荷 =====

@pytest.mark.unit
class TestNodeEvents:
    async def test_node_start_payload(self, events_env):
        """节点开始载荷含 workflowId / nodeId。

        **Validates: Requirements 2.18**
        """
        callbacks = workflows.make_execution_callbacks('wf-node.json')
        await callbacks['on_node_start']('node-7')

        assert events_env.sio.events('execution:node_start') == [
            {'workflowId': 'wf-node.json', 'nodeId': 'node-7'}
        ]

    async def test_node_complete_payload_has_duration_and_error(self, events_env):
        """用例 12：on_node_complete 载荷含 success / duration / error，且不含 input/output。

        **Validates: Requirements 2.11**
        """
        callbacks = workflows.make_execution_callbacks('wf-node.json')
        result = ModuleResult(success=False, message='失败', error='元素未找到', duration=88.0)
        await callbacks['on_node_complete']('node-9', result)

        payload = events_env.sio.events('execution:node_complete')[0]
        assert payload == {
            'workflowId': 'wf-node.json',
            'nodeId': 'node-9',
            'success': False,
            'duration': 88.0,
            'error': '元素未找到',
        }


# ===== 用例 13-15：完成事件载荷 =====

def make_result(status=ExecutionStatus.COMPLETED, executed=5, failed=1, data_file='out.xlsx'):
    """构造真实 ExecutionResult。"""
    return ExecutionResult(
        workflow_id='wf-result.json',
        status=status,
        started_at=datetime(2024, 5, 1, 10, 0, 0),
        completed_at=datetime(2024, 5, 1, 10, 5, 0),
        total_nodes=6,
        executed_nodes=executed,
        failed_nodes=failed,
        data_file=data_file,
    )


@pytest.mark.unit
class TestCompletedPayload:
    async def test_started_payload(self, events_env):
        """开始事件载荷只含 workflowId。

        **Validates: Requirements 2.18**
        """
        await workflows.emit_execution_started('wf-start.json')
        assert events_env.sio.events('execution:started') == [{'workflowId': 'wf-start.json'}]

    async def test_none_result_normalized_to_failed(self, events_env):
        """用例 13：result 为 None 时状态归一 failed、模块数归一 0。

        **Validates: Requirements 2.12**
        """
        await workflows.emit_execution_completed('wf-none.json', None)

        payload = events_env.sio.events('execution:completed')[0]
        assert payload['result'] == {
            'status': 'failed',
            'executedNodes': 0,
            'failedNodes': 0,
            'dataFile': None,
        }
        assert payload['collectedData'] == []
        assert payload['collectedDataTotal'] == 0

    async def test_real_result_fields_mapped(self, events_env):
        """真实 ExecutionResult 的状态枚举取 .value，模块数与数据文件照实上报。

        **Validates: Requirements 2.12**
        """
        await workflows.emit_execution_completed('wf-ok.json', make_result())

        payload = events_env.sio.events('execution:completed')[0]
        assert payload['workflowId'] == 'wf-ok.json'
        assert payload['result'] == {
            'status': 'completed',
            'executedNodes': 5,
            'failedNodes': 1,
            'dataFile': 'out.xlsx',
        }

    async def test_stopped_status_preserved(self, events_env):
        """被停止的执行状态照实上报为 stopped（不额外分支）。

        **Validates: Requirements 2.12**
        """
        await workflows.emit_execution_completed(
            'wf-stop.json', make_result(status=ExecutionStatus.STOPPED)
        )
        assert events_env.sio.events('execution:completed')[0]['result']['status'] == 'stopped'

    async def test_collected_data_truncated_with_real_total(self, events_env):
        """用例 14：collectedData 封顶 COMPLETED_DATA_PREVIEW_LIMIT，总数报真实值。

        **Validates: Requirements 2.12**
        """
        limit = workflows.COMPLETED_DATA_PREVIEW_LIMIT
        rows = [{'i': i} for i in range(limit + 1)]
        await workflows.emit_execution_completed('wf-big.json', make_result(), rows)

        payload = events_env.sio.events('execution:completed')[0]
        assert len(payload['collectedData']) == limit
        assert payload['collectedData'][0] == {'i': 0}
        assert payload['collectedData'][-1] == {'i': limit - 1}
        assert payload['collectedDataTotal'] == limit + 1

    async def test_collected_data_not_truncated_below_limit(self, events_env):
        """未超上限时数据原样带出，总数等于实际条数。

        **Validates: Requirements 2.12**
        """
        rows = [{'i': i} for i in range(3)]
        await workflows.emit_execution_completed('wf-small.json', make_result(), rows)

        payload = events_env.sio.events('execution:completed')[0]
        assert payload['collectedData'] == rows
        assert payload['collectedDataTotal'] == 3

    async def test_healed_selectors_key_absent_without_argument(self, events_env):
        """用例 15：不传 healed_selectors 时载荷无该键（计划任务无人值守）。

        **Validates: Requirements 2.15**
        """
        await workflows.emit_execution_completed('wf-sched.json', make_result(), [])
        assert 'healedSelectors' not in events_env.sio.events('execution:completed')[0]

    @pytest.mark.parametrize("healed", [[], [{'nodeId': 'n1', 'selector': '#a'}]])
    async def test_healed_selectors_key_present_when_passed(self, events_env, healed):
        """用例 15：显式传入（含空列表）时载荷带 healedSelectors（手动路径需要）。

        **Validates: Requirements 2.15**
        """
        await workflows.emit_execution_completed(
            'wf-manual.json', make_result(), [], healed_selectors=healed
        )
        payload = events_env.sio.events('execution:completed')[0]
        assert payload['healedSelectors'] == healed


# ===== 用例 16-17：异常隔离（推送失败不可传染）=====

async def exercise_all_entries(workflow_id: str) -> None:
    """依次调用六个推送入口（两个事件函数 + 四个回调），并触发一次数据行冲刷。

    任一入口向上抛异常都会让调用方（工作流执行本身）受影响，因此这里不加 try：
    有异常就让用例直接失败。
    """
    callbacks = workflows.make_execution_callbacks(workflow_id)

    await workflows.emit_execution_started(workflow_id)
    await callbacks['on_log'](make_log(details={'is_user_log': True}))
    await callbacks['on_node_start']('node-1')
    await callbacks['on_node_complete'](
        'node-1', ModuleResult(success=True, message='ok', duration=1.0)
    )
    # 灌满一批以触发内部 flush_data_rows
    for i in range(workflows.DATA_ROW_BATCH_SIZE):
        await callbacks['on_data_row']({'index': i})
    await workflows.emit_execution_completed(workflow_id, make_result(), [{'i': 1}])


@pytest.mark.unit
class TestEmitFailureIsolation:
    async def test_all_entries_safe_when_sio_is_none(self, events_env):
        """用例 16：sio 未注入时六个入口全部安全返回。

        **Validates: Requirements 2.7, 2.18**
        """
        events_env.use_sio(None)
        await exercise_all_entries('wf-nosio.json')

        # 未注入 Socket 时也不应把 safe_emit 变成异常源
        await workflows.safe_emit('execution:completed', {'workflowId': 'wf-nosio.json'})

    async def test_all_entries_safe_when_emit_always_raises(self, events_env):
        """用例 17：emit 恒抛异常时四个回调与两个事件函数均正常返回、无异常外泄。

        **Validates: Requirements 2.7, 2.18**
        """
        exploding = events_env.use_sio(ExplodingSio())
        await exercise_all_entries('wf-boom.json')

        await workflows.safe_emit('execution:node_start', {'workflowId': 'wf-boom.json'})

        # 确认异常路径真的被走到了（否则本用例会退化成假绿）
        assert 'execution:started' in exploding.attempts
        assert 'execution:log_batch' in exploding.attempts
        assert 'execution:node_start' in exploding.attempts
        assert 'execution:node_complete' in exploding.attempts
        assert 'execution:data_row_batch' in exploding.attempts
        assert 'execution:completed' in exploding.attempts

    async def test_flush_data_rows_failure_isolated_by_caller(self, events_env):
        """flush_data_rows 自身不做异常隔离，共享层调用侧必须兜住。

        **Validates: Requirements 2.7**
        """
        workflow_id = 'wf-flushboom.json'
        events_env.use_sio(ExplodingSio())
        callbacks = workflows.make_execution_callbacks(workflow_id)

        for i in range(workflows.DATA_ROW_BATCH_SIZE):
            await callbacks['on_data_row']({'index': i})

        # 直接调用未包裹的 flush_data_rows 确实会抛，反证上面的隔离不是空转
        for i in range(3):
            await callbacks['on_data_row']({'index': i})
        with pytest.raises(RuntimeError):
            await workflows.flush_data_rows(workflow_id)
