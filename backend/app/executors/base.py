"""模块执行器基类和注册机制 - 异步版本"""
from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Any, Optional, Type, TYPE_CHECKING
from dataclasses import dataclass, field
from pathlib import Path
import asyncio

# playwright 仅用于类型注解。配合 `from __future__ import annotations`，
# 注解在运行时不求值，因此无需在导入本模块时加载 playwright——
# 这样后端启动注册全部执行器时不会把 playwright 载入内存，
# 仅当真正运行浏览器相关模块时才会按需加载，显著降低空闲内存占用。
if TYPE_CHECKING:
    from playwright.async_api import Page, Browser, BrowserContext

from app.models.workflow import LogLevel


def get_backend_root() -> Path:
    """获取 backend 目录（包含 ffmpeg.exe, ffprobe.exe 等的目录）"""
    # 从当前文件向上找到 backend 目录
    # backend/app/executors/base.py -> backend/app/executors -> backend/app -> backend
    current_file = Path(__file__).resolve()
    backend_root = current_file.parent.parent.parent
    print(f"[DEBUG] Backend 目录: {backend_root}")
    return backend_root


def get_ffmpeg_path() -> str:
    """获取 ffmpeg.exe 的路径"""
    ffmpeg_path = get_backend_root() / 'ffmpeg.exe'
    print(f"[DEBUG] FFmpeg 路径: {ffmpeg_path}, 存在: {ffmpeg_path.exists()}")
    if ffmpeg_path.exists():
        return str(ffmpeg_path)
    print(f"[WARNING] FFmpeg 不存在于 {ffmpeg_path}，使用系统 PATH 中的 ffmpeg")
    return 'ffmpeg'


def get_ffprobe_path() -> str:
    """获取 ffprobe.exe 的路径"""
    ffprobe_path = get_backend_root() / 'ffprobe.exe'
    print(f"[DEBUG] FFprobe 路径: {ffprobe_path}, 存在: {ffprobe_path.exists()}")
    if ffprobe_path.exists():
        return str(ffprobe_path)
    print(f"[WARNING] FFprobe 不存在于 {ffprobe_path}，使用系统 PATH 中的 ffprobe")
    return 'ffprobe'


def format_selector(selector: str) -> str:
    """格式化选择器，如果是由 / 或 ( 开头的 XPath，则添加 xpath= 前缀
    Playwright 默认将未加前缀的 /html/... 或 //... 当作 CSS 解析，会报错或定位失败
    """
    if not selector:
        return selector
        
    s = selector.strip()
    if s.startswith('/') or s.startswith('('):
        if not s.startswith('xpath='):
            return f"xpath={s}"
    return selector

def escape_css_selector(selector: str) -> str:
    """转义 CSS 选择器中的特殊字符"""
    if not selector:
        return selector
    # 如果选择器看起来已经是有效的，直接返回
    if selector.startswith(('#', '.', '[')) or ' ' in selector or '>' in selector:
        return selector
    # 否则尝试转义
    return selector


def is_xpath_selector(selector: str) -> bool:
    """判断选择器是否为 XPath 格式（xpath=... 或 // 开头）"""
    return selector.startswith('xpath=') or selector.startswith('//')


async def pw_wait_for_element(page_or_frame, selector: str, state: str = 'visible', timeout=None):
    """统一等待元素的工具函数，兼容 xpath= 前缀和普通 CSS 选择器。

    page.wait_for_selector() 不支持 xpath= 前缀，
    改用 page.locator().wait_for() 以支持所有 Playwright 选择器格式。
    """
    selector = format_selector(selector)
    kwargs = {'state': state}
    if timeout is not None:
        kwargs['timeout'] = timeout
    await page_or_frame.locator(selector).first.wait_for(**kwargs)


def build_fallback_selectors(hints: dict) -> list[str]:
    """根据元素提示（拾取时保存的 tag/text/attributes）生成候选选择器，按稳定性从高到低排序。

    用于选择器自愈：当原选择器失效时，依次尝试这些候选锚点重新定位元素。
    """
    import re as _re
    out: list[str] = []
    if not hints or not isinstance(hints, dict):
        return out
    tag = (hints.get('tag') or hints.get('tagName') or '').strip().lower()
    attrs = hints.get('attributes') or {}
    if not isinstance(attrs, dict):
        attrs = {}
    testid = hints.get('testid') or attrs.get('data-testid')
    name = hints.get('name') or attrs.get('name')
    elem_id = hints.get('id') or attrs.get('id')
    cls = (hints.get('className') or attrs.get('className') or '').strip()
    placeholder = hints.get('placeholder') or attrs.get('placeholder')
    aria = hints.get('ariaLabel') or attrs.get('aria-label')
    text = (hints.get('text') or '').strip()
    tag_prefix = tag if tag else ''

    def _add(sel: str):
        if sel and sel not in out:
            out.append(sel)

    if testid:
        _add(f'[data-testid="{testid}"]')
    if elem_id and _re.match(r'^[A-Za-z][\w-]*$', str(elem_id)):
        _add(f'#{elem_id}')
    if name:
        _add(f'{tag_prefix or "*"}[name="{name}"]')
    if placeholder:
        _add(f'[placeholder="{placeholder}"]')
    if aria:
        _add(f'[aria-label="{aria}"]')
    if text and len(text) <= 40:
        safe = text.replace('\\', '\\\\').replace('"', '\\"')
        _add(f'{tag_prefix or "*"}:has-text("{safe}")')
        _add(f'text="{safe}"')
    if cls and ' ' not in cls and _re.match(r'^[A-Za-z][\w-]*$', cls):
        _add(f'{tag_prefix}.{cls}' if tag_prefix else f'.{cls}')
    return out


async def smart_wait_locator(page_or_frame, selector: str, *, hints=None, state: str = 'attached',
                             timeout=None, node_config=None, config_key: str = 'selector', context=None):
    """带自愈的元素定位：先用主选择器等待，失败则用提示生成的候选选择器进行锚点重定位。

    - hints: 拾取时保存的元素提示（dict）
    - node_config / config_key: 自愈成功后把可用选择器回写到节点配置，下次直接命中
    - context: 提供时，自愈成功会记录到 context 并写运行日志（供前端"持久化回写"与回放标注）
    返回定位成功的 locator；全部失败则抛出原始异常。
    """
    primary = format_selector(selector)
    try:
        loc = page_or_frame.locator(primary).first
        await loc.wait_for(state=state, timeout=timeout)
        return loc
    except Exception as primary_err:
        fallbacks = build_fallback_selectors(hints)
        if not fallbacks:
            raise
        heal_timeout = 3000  # 候选选择器使用较短超时，避免整体过慢
        for fb in fallbacks:
            try:
                loc = page_or_frame.locator(format_selector(fb)).first
                await loc.wait_for(state=state, timeout=heal_timeout)
                print(f"[SELF-HEAL] 选择器失效 {selector!r}，已用候选锚点重定位成功: {fb!r}")
                if isinstance(node_config, dict) and config_key:
                    node_config[config_key] = fb
                # 上报：记录到上下文 + 写运行日志（供持久化回写与回放标注）
                if context is not None:
                    try:
                        node_id = getattr(context, '_current_node_id', None)
                        records = getattr(context, '_healed_selectors', None)
                        if records is None:
                            records = []
                            setattr(context, '_healed_selectors', records)
                        records.append({
                            'nodeId': node_id, 'configKey': config_key,
                            'oldSelector': selector, 'newSelector': fb,
                        })
                    except Exception:
                        pass
                    try:
                        await context.send_progress(
                            f"选择器自愈：原选择器 {selector!r} 失效，已用候选 {fb!r} 重新定位", "warning")
                    except Exception:
                        pass
                return loc
            except Exception:
                continue
        raise primary_err


@dataclass
class ExecutionContext:
    """执行上下文 - 在模块执行器之间共享的状态（异步版本）"""
    browser: Optional[Browser] = None
    browser_context: Optional[BrowserContext] = None
    page: Optional[Page] = None
    variables: dict[str, Any] = field(default_factory=dict)
    data_rows: list[dict[str, Any]] = field(default_factory=list)
    current_row: dict[str, Any] = field(default_factory=dict)
    loop_stack: list[dict] = field(default_factory=list)  # 循环状态栈
    should_break: bool = False
    should_continue: bool = False
    stop_workflow: bool = False  # 是否停止工作流
    stop_reason: str = ""  # 停止原因
    headless: bool = False  # 无头模式
    browser_config: Optional[dict] = None  # 浏览器配置 {type, executablePath}
    _lock: asyncio.Lock = field(default_factory=asyncio.Lock)  # 异步锁
    
    # 手机设备ID（用于手机自动化）
    phone_device_id: Optional[str] = None
    
    # iframe 状态跟踪
    _in_iframe: bool = False  # 是否在iframe中
    _main_page: Optional[Page] = None  # 主页面引用（用于从iframe切换回来）
    _iframe_locator: Optional[dict] = None  # iframe定位信息 {type: 'name'|'index'|'selector', value: ...}
    _current_frame: Optional[Page] = None  # 当前iframe的直接引用（用于嵌套iframe）
    
    # Playwright 实例引用
    _playwright: Any = None
    _user_data_dir: Optional[str] = None
    
    # 进度日志回调（用于媒体处理等长时间操作）
    _progress_callback: Optional[Any] = None  # Callable[[str, str], Awaitable[None]]

    # 实时日志回调（让 add_log 直接产生的日志也能实时推送到前端）
    _realtime_log_callback: Optional[Any] = None  # Callable[(level, message, node_id, duration, timestamp)] -> None
    
    # 执行日志存储（用于导出日志模块）
    _logs: list[dict[str, Any]] = field(default_factory=list)
    
    # 变量更新回调
    _variable_update_callback: Optional[Any] = None  # Callable[[str, Any], Awaitable[None]]
    
    # 变量追踪记录
    _variable_tracking: list[dict[str, Any]] = field(default_factory=list)  # 变量变化历史记录
    _current_node_id: Optional[str] = None  # 当前执行的节点ID
    _current_node_name: Optional[str] = None  # 当前执行的节点名称
    # 待完成的回调任务集合（避免 create_task 后被 GC）
    _pending_callback_tasks: set = field(default_factory=set)
    
    async def get_current_frame(self) -> Optional[Page]:
        """获取当前的frame（如果在iframe中）或page
        
        如果在iframe中，优先返回保存的frame引用
        """
        if not self._in_iframe:
            print(f"[get_current_frame] 不在iframe中，返回当前page")
            return self.page
        
        # 如果有保存的frame引用，直接返回
        if self._current_frame:
            print(f"[get_current_frame] 返回保存的frame引用: {self._current_frame.url}")
            return self._current_frame
        
        # 否则尝试动态获取（兼容旧逻辑）
        if not self._iframe_locator or not self._main_page:
            print(f"[get_current_frame] 没有iframe定位信息，返回当前page")
            return self.page
        
        try:
            locator_type = self._iframe_locator.get('type')
            locator_value = self._iframe_locator.get('value')
            
            print(f"[get_current_frame] 动态获取iframe，定位方式: {locator_type}, 值: {locator_value}")
            
            frame = None
            
            if locator_type == 'name':
                frame = self._main_page.frame(name=locator_value)
                if not frame:
                    try:
                        iframe_element = await self._main_page.wait_for_selector(
                            f'iframe[id="{locator_value}"]',
                            timeout=2000
                        )
                        if iframe_element:
                            frame = await iframe_element.content_frame()
                    except Exception as e:
                        print(f"[get_current_frame] 通过id查找失败: {e}")
                    
            elif locator_type == 'index':
                frames = self._main_page.frames
                child_frames = [f for f in frames if f != self._main_page.main_frame]
                if 0 <= locator_value < len(child_frames):
                    frame = child_frames[locator_value]
                    
            elif locator_type == 'selector':
                try:
                    iframe_element = await self._main_page.wait_for_selector(
                        locator_value,
                        timeout=2000
                    )
                    if iframe_element:
                        frame = await iframe_element.content_frame()
                except Exception as e:
                    print(f"[get_current_frame] 通过选择器查找失败: {e}")
            
            if frame:
                print(f"[get_current_frame] 动态获取成功，更新context.page")
                self.page = frame
                self._current_frame = frame  # 保存引用
                return frame
            
            print(f"[WARNING] 无法获取iframe，返回主页面")
            self.page = self._main_page
            return self._main_page
            
        except Exception as e:
            print(f"[ERROR] 获取iframe失败: {e}")
            import traceback
            traceback.print_exc()
            return self.page
    
    async def send_progress(self, message: str, level: str = "info"):
        """发送进度日志到前端"""
        if self._progress_callback:
            try:
                await self._progress_callback(message, level)
            except Exception as e:
                print(f"发送进度日志失败: {e}")
    
    def add_log(self, level: str, message: str, node_id: Optional[str] = None, 
                duration: Optional[float] = None, timestamp: Optional[str] = None,
                emit_realtime: bool = True):
        """添加日志到日志列表（用于导出日志模块），并可实时推送到前端。

        emit_realtime=True 时，会通过 _realtime_log_callback 把日志即时推送到前端日志面板，
        让模块执行过程中产生的日志实时显示，而不是等工作流结束后才一次性出现。
        workflow_executor 内部的 _log 会以 emit_realtime=False 调用本方法（它自己已实时推送），避免重复。
        """
        from datetime import datetime
        ts = timestamp or datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
        log_entry = {
            'timestamp': ts,
            'level': level,
            'message': message,
            'nodeId': node_id,
            'duration': duration
        }
        self._logs.append(log_entry)

        if emit_realtime and self._realtime_log_callback:
            try:
                self._realtime_log_callback(level, message, node_id, duration, ts)
            except Exception as e:
                print(f"实时日志推送失败: {e}")
    
    def log(self, message: str, level: str = "info"):
        """简单的日志方法（用于模块内部日志）"""
        print(f"[{level.upper()}] {message}")
        self.add_log(level, message)
    
    def get_logs(self) -> list[dict[str, Any]]:
        """获取所有日志"""
        return self._logs.copy()
    
    def clear_logs(self):
        """清空日志"""
        self._logs.clear()
    
    async def switch_to_latest_page(self) -> bool:
        """切换到最新的页面（处理新标签页打开的情况）
        
        注意：
        - 如果当前在iframe中，会刷新iframe引用而不是切换页面
        - 保持当前页面不变，除非当前页面已关闭
        
        Returns:
            bool: 是否切换了页面
        """
        # 如果在iframe中，刷新iframe引用
        if self._in_iframe:
            await self.get_current_frame()
            return False
        
        if self.browser_context is None:
            return False
        
        try:
            # 获取所有页面
            pages = self.browser_context.pages
            if not pages:
                return False
            
            # 如果当前没有页面，使用最后一个
            if self.page is None:
                self.page = pages[-1]
                return True
            
            # 检查当前页面是否还在页面列表中
            if self.page not in pages:
                # 当前页面已关闭，切换到最后一个页面
                self.page = pages[-1]
                return True
            
            # 当前页面仍然有效，保持不变
            return False
        except Exception as e:
            print(f"[ExecutionContext] switch_to_latest_page 失败: {e}")
            return False
    
    def get_variable(self, name: str, default: Any = None) -> Any:
        """获取变量值，支持 ${var} 和 {var} 两种格式"""
        if isinstance(name, str):
            n = name.strip()
            if n.startswith('${') and n.endswith('}'):
                n = n[2:-1].strip()
            elif n.startswith('{') and n.endswith('}'):
                n = n[1:-1].strip()
            return self.variables.get(n, default)
        return self.variables.get(name, default)
    
    def set_variable(self, name: str, value: Any):
        """设置变量值"""
        import json
        from datetime import datetime
        
        # 记录旧值
        old_value = self.variables.get(name)
        
        # 设置新值
        self.variables[name] = value
        
        # 记录变量追踪信息
        try:
            # 尝试序列化值用于显示
            def serialize_value(v):
                if v is None:
                    return None
                elif isinstance(v, (str, int, float, bool)):
                    return v
                elif isinstance(v, (list, dict)):
                    try:
                        # 尝试JSON序列化
                        json.dumps(v)
                        return v
                    except Exception:
                        return str(v)
                else:
                    return str(v)
            
            tracking_record = {
                "timestamp": datetime.now().isoformat(),
                "variable_name": name,
                "old_value": serialize_value(old_value),
                "new_value": serialize_value(value),
                "node_id": self._current_node_id,
                "node_name": self._current_node_name or "未知模块",
                "operation": "create" if old_value is None else "update",
                "value_type": type(value).__name__
            }
            # 限制追踪记录数量上限，防止长循环导致内存爆炸
            _MAX_TRACKING = 5000
            self._variable_tracking.append(tracking_record)
            if len(self._variable_tracking) > _MAX_TRACKING:
                # 删除最早的 1/4 记录（避免每次都做截断的开销）
                drop = _MAX_TRACKING // 4
                del self._variable_tracking[:drop]
        except Exception as e:
            print(f"记录变量追踪失败: {e}")
        
        # 通知变量更新
        if self._variable_update_callback:
            import asyncio
            try:
                # 在异步上下文中调用回调（仅当存在运行中的事件循环）
                try:
                    asyncio.get_running_loop()
                    # 保存任务引用避免被 GC，并通过 done_callback 处理异常
                    task = asyncio.create_task(self._variable_update_callback(name, value))
                    self._pending_callback_tasks.add(task)
                    
                    def _on_done(t: asyncio.Task):
                        self._pending_callback_tasks.discard(t)
                        try:
                            exc = t.exception()
                            if exc is not None:
                                print(f"变量更新回调失败: {exc}")
                        except (asyncio.CancelledError, Exception):
                            pass
                    task.add_done_callback(_on_done)
                except RuntimeError:
                    # 不在 async 上下文中，跳过通知
                    pass
            except Exception as e:
                print(f"通知变量更新失败: {e}")
    
    def get_variable_tracking(self) -> list[dict[str, Any]]:
        """获取变量追踪记录"""
        return self._variable_tracking.copy()
    
    def clear_variable_tracking(self):
        """清空变量追踪记录"""
        self._variable_tracking.clear()
    
    def set_current_node(self, node_id: str, node_name: str):
        """设置当前执行的节点信息"""
        self._current_node_id = node_id
        self._current_node_name = node_name
    
    def resolve_value(self, value: Any) -> Any:
        """解析值中的变量引用
        
        支持格式：
        - ${varName} - 标准格式
        - {varName} - 简化格式
        - {listName[0]} - 列表索引访问
        - {dictName[key]} 或 {dictName["key"]} - 字典键访问
        - {data[0][name]} - 嵌套访问
        - {listName[{indexVar}]} - 嵌套变量引用（索引本身是变量）
        """
        if isinstance(value, str):
            import re

            # 凭据库引用解析（最前置，先于普通变量解析）：
            # {{cred:名称}} / {{cred:名称.字段}} / {{凭据:名称}} / {{凭据:名称.字段}}
            if '{{' in value and ('cred:' in value or 'cred：' in value or '凭据:' in value or '凭据：' in value):
                def _resolve_cred(m):
                    ref = m.group(1).strip()
                    if '.' in ref:
                        cname, fld = ref.split('.', 1)
                        cname, fld = cname.strip(), fld.strip()
                    else:
                        cname, fld = ref, 'value'
                    try:
                        from app.services import credential_manager
                        val = credential_manager.get_field(cname, fld)
                        return val if val is not None else m.group(0)
                    except Exception:
                        return m.group(0)
                value = re.sub(r'\{\{\s*(?:cred|凭据)\s*[:：]\s*([^{}]+?)\s*\}\}', _resolve_cred, value)

            _MISSING = object()

            def to_replacement_text(resolved: Any) -> str:
                # 变量存在但值为空（None）时，按空字符串处理，避免保留原始 {var}
                if resolved is None:
                    return ''
                if isinstance(resolved, (list, dict)):
                    import json
                    return json.dumps(resolved, ensure_ascii=False)
                return str(resolved)
            
            def resolve_nested_variables(text: str, max_depth: int = 5) -> str:
                """递归解析嵌套的变量引用，最多解析max_depth层"""
                if max_depth <= 0:
                    return text
                
                # 查找所有 {xxx} 格式的变量引用
                pattern = r'(?<!\$)\{([^{}]+)\}'
                matches = list(re.finditer(pattern, text))
                
                if not matches:
                    return text
                
                # 从后向前替换，避免索引偏移问题
                for match in reversed(matches):
                    var_expr = match.group(1).strip()
                    resolved = resolve_access_path(var_expr)
                    if resolved is not _MISSING:
                        replacement = to_replacement_text(resolved)
                        text = text[:match.start()] + replacement + text[match.end():]
                
                # 递归处理，以支持多层嵌套
                if re.search(pattern, text):
                    return resolve_nested_variables(text, max_depth - 1)
                
                return text
            
            def resolve_access_path(var_name: str) -> Any:
                """解析变量访问路径，支持索引和键访问
                
                支持嵌套变量引用，例如：
                - test[{loop_index}] - 先解析 loop_index，再用其值作为索引
                - data[{i}][{j}] - 多层嵌套变量引用
                """
                var_name = var_name.strip()
                
                # 先解析变量名中的嵌套变量引用
                # 例如：test[{loop_index}] -> 先将 {loop_index} 替换为其值
                var_name = resolve_nested_variables(var_name, max_depth=3)
                
                # 解析基础变量名和访问路径
                # 匹配: varName 或 varName[...][...]...
                base_match = re.match(r'^([a-zA-Z_\u4e00-\u9fa5][a-zA-Z0-9_\u4e00-\u9fa5]*)((?:\[[^\]]+\])*)', var_name)
                if not base_match:
                    return _MISSING
                
                base_name = base_match.group(1)
                access_path = base_match.group(2)
                
                # 获取基础变量
                if base_name not in self.variables:
                    return _MISSING
                result = self.variables[base_name]
                # 只在有访问路径时才浅拷贝顶层容器，避免修改原变量
                # 完整 deepcopy 在大数据上代价过高
                # 对最终返回值，调用方应该自行决定是否拷贝
                
                # 如果没有访问路径，直接返回
                if not access_path:
                    return result
                
                # 解析所有的 [xxx] 访问
                bracket_pattern = r'\[([^\]]+)\]'
                accessors = re.findall(bracket_pattern, access_path)
                
                for accessor in accessors:
                    accessor = accessor.strip()
                    
                    # 移除引号（如果有）
                    if (accessor.startswith('"') and accessor.endswith('"')) or \
                       (accessor.startswith("'") and accessor.endswith("'")):
                        accessor = accessor[1:-1]
                    
                    try:
                        if isinstance(result, list):
                            # 列表索引访问（支持负数索引，如 -1 表示最后一个元素）
                            index = int(accessor)
                            if -len(result) <= index < len(result):
                                result = result[index]
                            else:
                                return _MISSING
                        elif isinstance(result, dict):
                            # 字典键访问 - 先尝试原始键，再尝试数字键
                            if accessor in result:
                                result = result[accessor]
                            else:
                                # 尝试将键转为数字
                                try:
                                    num_key = int(accessor)
                                    if num_key in result:
                                        result = result[num_key]
                                    else:
                                        return _MISSING
                                except ValueError:
                                    return _MISSING
                        else:
                            # 不支持的类型
                            return _MISSING
                    except (ValueError, IndexError, KeyError, TypeError):
                        return _MISSING
                
                return result
            
            # 先替换 ${varName} 格式
            pattern1 = r'\$\{([^}]+)\}'
            result = value
            for match in reversed(list(re.finditer(pattern1, result))):
                var_expr = match.group(1).strip()
                resolved = resolve_access_path(var_expr)
                if resolved is not _MISSING:
                    replacement = to_replacement_text(resolved)
                    result = result[:match.start()] + replacement + result[match.end():]
            
            # 再替换 {varName} 格式（但不匹配已经有$的）
            # 使用递归解析支持嵌套变量引用
            result = resolve_nested_variables(result, max_depth=5)
            
            return result
        # 递归处理嵌套结构（dict/list/tuple），让搜索区域、坐标等结构支持变量引用
        if isinstance(value, dict):
            return {k: self.resolve_value(v) for k, v in value.items()}
        if isinstance(value, list):
            return [self.resolve_value(v) for v in value]
        if isinstance(value, tuple):
            return tuple(self.resolve_value(v) for v in value)
        return value
    
    def add_data_value(self, column: str, value: Any):
        """添加数据值到当前行
        
        如果当前行已经有该列的数据，则自动提交当前行并开始新行
        """
        # 如果当前行已经有这个列的数据，先提交当前行
        if column in self.current_row:
            self._commit_row_internal()
        self.current_row[column] = value
    
    def _commit_row_internal(self):
        """内部提交方法"""
        if self.current_row:
            self.data_rows.append(self.current_row.copy())
            self.current_row = {}
    
    def commit_row(self):
        """提交当前行到数据集"""
        self._commit_row_internal()


@dataclass
class ModuleResult:
    """模块执行结果"""
    success: bool
    message: str = ""
    data: Any = None
    error: Optional[str] = None
    branch: Optional[str] = None  # 用于条件分支，值为 "true" 或 "false"
    duration: float = 0  # 执行耗时（毫秒）
    log_level: Optional[str] = None  # 自定义日志级别（用于打印日志模块）
    skipped: bool = False  # 是否被跳过
    is_timeout: bool = False  # 是否因超时失败


@dataclass
class LogMessage:
    """日志消息"""
    level: LogLevel
    message: str
    node_id: Optional[str] = None
    details: Optional[dict] = None
    duration: Optional[float] = None


class ModuleExecutor(ABC):
    """模块执行器基类 - 纯异步版本"""
    
    @property
    @abstractmethod
    def module_type(self) -> str:
        """返回此执行器处理的模块类型"""
        pass
    
    @abstractmethod
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """执行模块逻辑（异步版本）"""
        pass
    
    def validate_config(self, config: dict) -> tuple[bool, str]:
        """验证配置有效性，子类可重写"""
        return True, ""
    
    def get_text(self, value: Any, context: ExecutionContext) -> str:
        """获取文本值，支持变量解析
        
        这是一个辅助方法，用于简化变量解析操作。
        它会调用 context.resolve_value() 来解析变量引用，并将结果转换为字符串。
        
        Args:
            value: 要解析的值（可能包含变量引用）
            context: 执行上下文
            
        Returns:
            解析后的字符串值
        """
        resolved = context.resolve_value(value)
        return str(resolved) if resolved is not None else ""


# ============================================================================
# 注册唯一性治理（缺陷 spec: executor-duplicate-registration）
# 历史拆分重构遗留：同一 module_type 在旧巨型文件与拆分小文件中各注册一次，
# 注册表 last-write-wins 静默覆盖，生效实现由加载顺序决定（见 issue #42）。
# 下方白名单登记"治理期已知的重复类型"——命中白名单的重复冲突静默放行（交由
# spec 逐对消除），白名单外的重复冲突会告警（默认）或报错（严格模式）以防复发。
# 每消除一对重复，就从白名单移除对应类型；治理完成后白名单应为空。
# ============================================================================
# 治理已完成：42 个运行时重复注册（旧巨型文件 advanced.py/media.py/basic.py 里的休眠副本）
# 已全部移除 @register_executor，生效实现均为拆分/专用模块。白名单清空后，严格模式
# （WEBRPA_STRICT_REGISTRY=1）对任何新引入的重复注册立即报错，防止此类缺陷复发。
_KNOWN_DUPLICATES: set[str] = set()


def _strict_registry_enabled() -> bool:
    """开发期严格模式：命中白名单外的重复注册直接报错（Fail-Fast）。由环境变量开启。"""
    import os
    return os.environ.get("WEBRPA_STRICT_REGISTRY", "").strip().lower() in ("1", "true", "yes", "on")


class ExecutorRegistry:
    """执行器注册表（支持懒加载：类型清单先到位，真正的执行器模块按需导入）"""
    
    def __init__(self):
        self._executors: dict[str, ModuleExecutor] = {}
        self._lazy: dict[str, str] = {}        # module_type -> 子模块名（尚未导入）
        self._package: Optional[str] = None    # 懒加载子模块所在包名
        self._registration_source: dict[str, str] = {}  # module_type -> 首次注册来源模块
        self._registration_sources: dict[str, set] = {}  # module_type -> 所有实际调用 register 的来源模块集合（用于重复检测）
    
    def register(self, executor_class: Type[ModuleExecutor]):
        """注册执行器类 - 每次都创建新实例。

        唯一性检查：若同一 module_type 已由**不同来源模块**注册过 → 判定为重复冲突。
        - 白名单内（治理期已知）：静默放行（仍 last-write-wins，保持现有行为）。
        - 白名单外：告警（默认）或报错（严格模式），防止拆分/新增执行器时再次引入重复。
        同一来源模块的重复注册（重复 import / 热重载）不视为冲突。
        """
        executor = executor_class()
        module_type = executor.module_type
        source = getattr(executor_class, "__module__", "") or ""
        prev_source = self._registration_source.get(module_type)
        if prev_source is not None and prev_source != source and module_type not in _KNOWN_DUPLICATES:
            msg = (f"[registry] 重复注册 module_type={module_type!r}："
                   f"已由 {prev_source} 注册，又被 {source} 注册（后者覆盖前者）")
            if _strict_registry_enabled():
                raise RuntimeError(msg)
            print(f"[registry][WARNING] {msg}")
        self._executors[module_type] = executor
        self._registration_source[module_type] = source
        self._registration_sources.setdefault(module_type, set()).add(source)
        # 真正注册后，从懒加载占位表里移除
        self._lazy.pop(module_type, None)
    
    def enable_lazy(self, type_to_submodule: dict[str, str], package: str):
        """启用懒加载：登记 类型→子模块 映射，使 get_all_types 立即可用，
        而对应执行器模块只在首次 get(type) 时才导入。"""
        self._package = package
        for t, sub in type_to_submodule.items():
            if t not in self._executors:
                self._lazy[t] = sub
    
    def _ensure_loaded(self, module_type: str):
        """若该类型处于懒加载状态，导入其子模块以触发真正注册。"""
        sub = self._lazy.get(module_type)
        if not sub or not self._package:
            return
        import importlib
        try:
            importlib.import_module(f".{sub}", self._package)
        except Exception as e:
            print(f"[registry] 懒加载执行器子模块 {sub} 失败: {e}")
        finally:
            # 无论成功失败都移除占位，避免反复尝试
            self._lazy.pop(module_type, None)
    
    def get(self, module_type: str) -> Optional[ModuleExecutor]:
        """获取指定类型的执行器（懒加载时按需导入对应子模块）"""
        if module_type in self._executors:
            return self._executors[module_type]
        if module_type in self._lazy:
            self._ensure_loaded(module_type)
        return self._executors.get(module_type)
    
    def get_all_types(self) -> list[str]:
        """获取所有模块类型（已加载 + 懒加载占位，两者合并去重）"""
        types = list(self._executors.keys())
        for t in self._lazy:
            if t not in self._executors:
                types.append(t)
        return types
    
    def clear(self):
        """清空注册表"""
        self._executors.clear()
        self._lazy.clear()
        self._registration_source.clear()
        self._registration_sources.clear()
        self._package = None


# 全局注册表实例
registry = ExecutorRegistry()


def register_executor(cls: Type[ModuleExecutor]) -> Type[ModuleExecutor]:
    """装饰器：注册执行器 - 每次都重新注册"""
    registry.register(cls)
    return cls
