"""WebRPA小助手 - 主服务层

负责：
- 与 LLM 通信（OpenAI 兼容协议，含 tools / function calling）
- 会话持久化（JSON 文件）
- 编排多轮工具调用
"""
from __future__ import annotations

import asyncio
import json
import re
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, AsyncIterator, Awaitable, Callable, Optional

import httpx

from app.models.ai_assistant import (
    AssistantConfig,
    ChatMessage,
    ChatSession,
    MessageRole,
    SessionListItem,
    ToolCall,
    ToolCallStatus,
)
from app.services.ai_assistant_knowledge import build_system_prompt
from app.services.ai_assistant_skills import execute_skill, registry as skill_registry, load_all_skills
# 统一加载全部扩展技能（v2/v3/v4/mcp），替代分散的 side-effect 导入，并带重名检测
load_all_skills()


# ---------- 持久化 ----------

def _get_sessions_dir() -> Path:
    folder = Path("backend/data/ai_assistant/sessions")
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def _session_path(session_id: str) -> Path:
    # 基础校验，防路径穿越
    if not session_id or "/" in session_id or "\\" in session_id or ".." in session_id:
        raise ValueError(f"非法 session_id: {session_id}")
    return _get_sessions_dir() / f"{session_id}.json"


def load_session(session_id: str) -> ChatSession | None:
    fp = _session_path(session_id)
    if not fp.exists():
        return None
    try:
        return ChatSession(**json.loads(fp.read_text(encoding="utf-8")))
    except Exception as e:
        print(f"[AIAssistant] 加载会话失败 {session_id}: {e}")
        return None


def save_session(session: ChatSession) -> None:
    fp = _session_path(session.id)
    session.updated_at = datetime.now()
    fp.write_text(
        json.dumps(session.model_dump(), ensure_ascii=False, indent=2, default=str),
        encoding="utf-8",
    )


def list_sessions() -> list[SessionListItem]:
    items: list[SessionListItem] = []
    for fp in _get_sessions_dir().glob("*.json"):
        try:
            data = json.loads(fp.read_text(encoding="utf-8"))
            messages = data.get("messages", [])
            last_text = ""
            if messages:
                # 找最后一条非空文本
                for m in reversed(messages):
                    content = m.get("content", "")
                    if content:
                        last_text = content[:80]
                        break
            items.append(SessionListItem(
                id=data.get("id"),
                title=data.get("title", "新对话"),
                message_count=len(messages),
                updated_at=data.get("updated_at") or data.get("created_at"),
                last_message_preview=last_text,
            ))
        except Exception:
            pass
    items.sort(key=lambda x: x.updated_at, reverse=True)
    return items


def create_session(title: str | None = None, session_id: str | None = None) -> ChatSession:
    # 允许调用方（前端）预先指定 id：前端在发起对话前就知道 session_id，
    # 这样"停止"按钮在请求执行期间也能精准取消到该会话（解决新会话无法停止的问题）
    sid = (session_id or "").strip()
    if sid:
        # 安全校验：非法 id 退回随机生成
        if "/" in sid or "\\" in sid or ".." in sid or len(sid) > 64:
            sid = ""
    session = ChatSession(
        id=sid or uuid.uuid4().hex[:12],
        title=title or "新对话",
    )
    save_session(session)
    return session


def delete_session(session_id: str) -> bool:
    fp = _session_path(session_id)
    if not fp.exists():
        return False
    try:
        fp.unlink()
        return True
    except Exception:
        return False


# ---------- LLM 调用 ----------

class LLMError(Exception):
    pass


class LLMBadRequest(LLMError):
    """LLM 返回 400（参数/请求体被网关拒绝）。用于触发兼容性降级重试。"""
    pass


def _normalize_api_url(api_url: str) -> str:
    """把可能不带 chat/completions 的 base URL 补全为完整 endpoint。

    覆盖场景：
    - 已是完整 endpoint（.../chat/completions）→ 原样返回
    - 以版本号段结尾（/v1 /v2 /v4 /v1beta /api/paas/v4 等）→ 追加 /chat/completions
    - 裸域名或其它基础地址（https://api.deepseek.com）→ 追加 /v1/chat/completions
    """
    url = (api_url or "").strip()
    if not url:
        raise LLMError("API 地址不能为空")
    url = url.rstrip("/")
    # 已经是完整 endpoint
    if url.endswith("/chat/completions"):
        return url
    # 以版本号段结尾：/v1 /v2 /v3 /v4 /v1beta，或智谱的 /api/paas/v4
    if re.search(r"/v\d+[a-z]*$", url) or url.endswith("/api/paas/v4"):
        return url + "/chat/completions"
    # 裸域名或其它基础地址，按 OpenAI 兼容惯例补 /v1/chat/completions
    return url + "/v1/chat/completions"


def _convert_message_for_llm(msg: ChatMessage) -> dict[str, Any]:
    """把内部 ChatMessage 转换为 OpenAI 协议格式"""
    base: dict[str, Any] = {"role": msg.role.value if isinstance(msg.role, MessageRole) else str(msg.role)}

    if msg.role == MessageRole.TOOL:
        base["tool_call_id"] = msg.tool_call_id or ""
        base["content"] = msg.content or ""
        return base

    if msg.role == MessageRole.ASSISTANT and msg.tool_calls:
        base["content"] = msg.content or None
        # DeepSeek-Reasoner 等思考模型要求把 reasoning_content 原样回传
        if getattr(msg, "reasoning_content", None):
            base["reasoning_content"] = msg.reasoning_content
        base["tool_calls"] = [
            {
                "id": tc.id,
                "type": "function",
                "function": {
                    "name": tc.name,
                    "arguments": json.dumps(tc.arguments, ensure_ascii=False),
                },
            }
            for tc in msg.tool_calls
        ]
        return base

    base["content"] = msg.content or ""
    # 多模态：user 消息携带图片时，content 改为 OpenAI 视觉格式数组
    if msg.role == MessageRole.USER and getattr(msg, "images", None):
        parts: list[dict[str, Any]] = []
        text = msg.content or ""
        if text.strip():
            parts.append({"type": "text", "text": text})
        for img in (msg.images or []):
            if isinstance(img, str) and img.strip():
                parts.append({"type": "image_url", "image_url": {"url": img}})
        if parts:
            base["content"] = parts
    # 思考模型的 assistant 消息（即使没有 tool_calls）也要带回 reasoning_content
    if msg.role == MessageRole.ASSISTANT and getattr(msg, "reasoning_content", None):
        base["reasoning_content"] = msg.reasoning_content
    return base


async def _call_llm(
    *,
    config: AssistantConfig,
    messages: list[dict[str, Any]],
    tools: list[dict[str, Any]] | None,
    on_event: Optional[Callable[[str, dict], Awaitable[Any] | Any]] = None,
) -> dict[str, Any]:
    """调用 LLM 接口（OpenAI 兼容协议，流式优先）

    NVIDIA NIM 免费层 / 部分公网模型经常出现连接被对端中断、瞬时 5xx、429 限流，
    这里做指数退避重试。

    流式开关：
    - 如果传入 on_event，用 stream=True 实时把 reasoning_partial / content_partial 推给前端
    - 如果未传 on_event，用 stream=False 一次性拿响应（用于内部摘要等场景）
    返回：与非流式相同的完整 OpenAI 响应字典
    """
    # 容错：自动去除配置首尾空格（用户常在模型名/密钥末尾误带空格，导致网关 400 Param Incorrect）
    model_clean = (config.model or "").strip()
    api_key_clean = (config.api_key or "").strip()
    if not model_clean:
        raise LLMError("模型名称不能为空")

    url = _normalize_api_url(config.api_url)
    use_stream = on_event is not None

    headers = {"Content-Type": "application/json"}
    if api_key_clean:
        headers["Authorization"] = f"Bearer {api_key_clean}"

    # ===== 兼容性降级：部分第三方网关/转售 API（如某些 token 套餐代理）对请求体校验严格，
    # 会对 reasoning_content 回传 / tool_choice / tools 等字段直接返回 400 "Param Incorrect"。
    # 这里在遇到 400 时自动逐级去除这些可选字段重试，最大化兼容性：
    #   level 0：完整请求（含 reasoning_content 回传 + tools + tool_choice）
    #   level 1：去掉历史里的 reasoning_content 回传 + 去掉 tool_choice（保留 tools）
    #   level 2：再去掉 tools（退化为纯对话，确保至少能问答）
    def _sanitize_messages(msgs: list[dict[str, Any]], level: int) -> list[dict[str, Any]]:
        # 先统计 tool_calls 声明 id 与 tool 结果 id，用于强制一致性
        declared_ids: set[str] = set()
        result_ids: set[str] = set()
        for m in msgs:
            if not isinstance(m, dict):
                continue
            if m.get("role") == "assistant" and m.get("tool_calls"):
                for tc in m["tool_calls"]:
                    if isinstance(tc, dict) and tc.get("id"):
                        declared_ids.add(tc["id"])
            if m.get("role") == "tool" and m.get("tool_call_id"):
                result_ids.add(m["tool_call_id"])

        drop_tools = level >= 2
        out: list[dict[str, Any]] = []
        for m in msgs:
            if not isinstance(m, dict):
                out.append(m)
                continue
            role = m.get("role")
            m = dict(m)
            if level >= 1:
                m.pop("reasoning_content", None)  # 部分网关不接受回传 reasoning_content

            if role == "tool":
                # 孤儿 tool 结果（没有对应 assistant.tool_calls）必丢；level2 退化时全丢——
                # 否则会出现“有 tool 结果但请求未声明 tools / tool_calls 不匹配”→ 网关 400
                if drop_tools or m.get("tool_call_id") not in declared_ids:
                    continue
                out.append(m)
                continue

            if role == "assistant" and m.get("tool_calls"):
                if drop_tools:
                    m.pop("tool_calls", None)
                    if (m.get("content") or "").strip():
                        out.append(m)
                    continue
                # 仅保留“有对应 tool 结果”的 tool_calls，避免悬空 tool_calls 触发 400
                kept = [tc for tc in m["tool_calls"]
                        if isinstance(tc, dict) and tc.get("id") in result_ids]
                if kept:
                    m["tool_calls"] = kept
                    out.append(m)
                else:
                    m.pop("tool_calls", None)
                    if (m.get("content") or "").strip():
                        out.append(m)
                continue

            out.append(m)
        return out

    def _build_body(level: int, stream_flag: bool) -> dict[str, Any]:
        b: dict[str, Any] = {
            "model": model_clean,
            "messages": _sanitize_messages(messages, level),
            "temperature": config.temperature,
            "max_tokens": config.max_tokens,
            "stream": stream_flag,
        }
        if tools and level < 2:
            b["tools"] = tools
            if level == 0:
                b["tool_choice"] = "auto"
        return b

    # 退避重试参数：最多 3 次（即首次 + 2 次重试），每次延迟翻倍
    MAX_ATTEMPTS = 3
    BASE_DELAY = 1.5  # 秒
    last_err: Exception | None = None

    degrade_level = 0
    while True:
        cur_stream = use_stream
        body = _build_body(degrade_level, cur_stream)
        got_400: LLMBadRequest | None = None

        for attempt in range(1, MAX_ATTEMPTS + 1):
            try:
                async with httpx.AsyncClient(
                    timeout=httpx.Timeout(connect=15.0, read=300.0, write=30.0, pool=15.0),
                    http2=False,
                ) as client:
                    if cur_stream:
                        try:
                            return await _stream_llm_request(client, url, body, headers, on_event)
                        except LLMBadRequest as bad:
                            got_400 = bad
                            break  # 跳出重试循环，去做兼容性降级
                        except LLMError:
                            raise
                        except Exception as stream_err:
                            # 流式失败（如某些代理/兼容层不支持 SSE）：自动回退到非流式
                            print(f"[AIAssistant] 流式调用失败，回退到非流式：{stream_err}")
                            cur_stream = False
                            body = _build_body(degrade_level, False)
                            resp = await client.post(url, json=body, headers=headers)
                    else:
                        resp = await client.post(url, json=body, headers=headers)
            except httpx.TimeoutException as e:
                last_err = e
                if attempt < MAX_ATTEMPTS and isinstance(e, (httpx.ConnectTimeout, httpx.PoolTimeout)):
                    await asyncio.sleep(BASE_DELAY * (2 ** (attempt - 1)))
                    continue
                raise LLMError(f"LLM 请求超时（{type(e).__name__}）。建议：检查网络/降低 max_tokens/精简上下文")
            except httpx.ConnectError as e:
                last_err = e
                if attempt < MAX_ATTEMPTS:
                    await asyncio.sleep(BASE_DELAY * (2 ** (attempt - 1)))
                    continue
                raise LLMError(f"无法连接到 LLM 服务：{e}。建议：检查代理/API 地址是否正确")
            except (httpx.RemoteProtocolError, httpx.ReadError, httpx.NetworkError) as e:
                last_err = e
                if attempt < MAX_ATTEMPTS:
                    wait = BASE_DELAY * (2 ** (attempt - 1))
                    print(f"[AIAssistant] LLM 连接被对端中断，{wait}s 后第 {attempt + 1}/{MAX_ATTEMPTS} 次重试：{e}")
                    await asyncio.sleep(wait)
                    continue
                raise LLMError(
                    f"LLM 服务连接被中断（{type(e).__name__}）。"
                    f"NVIDIA NIM 免费层经常这样，已自动重试 {MAX_ATTEMPTS} 次仍失败。"
                    f"建议：①重新发送 ②换稳定的模型（DeepSeek / 智谱 GLM / 通义千问） ③开启代理"
                )
            except LLMError:
                raise
            except Exception as e:
                last_err = e
                raise LLMError(f"LLM 请求异常：{e}")

            # 非流式 200 响应处理
            if resp.status_code == 200:
                try:
                    return resp.json()
                except Exception as e:
                    raise LLMError(f"无法解析 LLM 响应：{e}")

            if resp.status_code == 429 or 500 <= resp.status_code < 600:
                try:
                    err = resp.json()
                    msg = err.get("error", {}).get("message") if isinstance(err.get("error"), dict) else err.get("message") or resp.text
                except Exception:
                    msg = resp.text
                if attempt < MAX_ATTEMPTS:
                    wait = BASE_DELAY * (2 ** (attempt - 1))
                    print(f"[AIAssistant] LLM 返回 {resp.status_code}（{msg[:80]}），{wait}s 后第 {attempt + 1}/{MAX_ATTEMPTS} 次重试")
                    await asyncio.sleep(wait)
                    continue
                raise LLMError(f"LLM 返回 {resp.status_code}：{msg}（已重试 {MAX_ATTEMPTS} 次）")

            try:
                err = resp.json()
                msg = err.get("error", {}).get("message") if isinstance(err.get("error"), dict) else None
                msg = msg or err.get("message") or resp.text
                # 捕获完整错误体（"Param Incorrect" 往往只是概述，真正的 param/code/type 在别处）
                if resp.status_code == 400:
                    try:
                        full = json.dumps(err, ensure_ascii=False)
                    except Exception:
                        full = resp.text
                    if full and full not in msg:
                        msg = f"{msg} | 完整响应: {full[:600]}"
            except Exception:
                msg = resp.text

            if resp.status_code == 400:
                got_400 = LLMBadRequest(msg)
                break  # 去做兼容性降级
            raise LLMError(f"LLM 返回 {resp.status_code}：{msg}")

        # 走到这里说明本轮因 400 中断；尝试逐级降级重试
        if got_400 is not None:
            # 诊断日志：打印失败请求概要，便于定位 Param Incorrect 的真实原因
            try:
                _roles = [m.get("role") for m in body.get("messages", []) if isinstance(m, dict)]
                _chars = sum(len(str(m.get("content") or "")) for m in body.get("messages", []) if isinstance(m, dict))
                print(f"[AIAssistant][400诊断] url={url} level={degrade_level} stream={cur_stream} "
                      f"msg_count={len(_roles)} roles={_roles} total_content_chars={_chars} "
                      f"has_tools={'tools' in body} resp={str(got_400)[:300]}")
            except Exception:
                pass
            if degrade_level < 2:
                degrade_level += 1
                print(f"[AIAssistant] LLM 返回 400（{str(got_400)[:80]}），自动降级兼容重试 level={degrade_level}")
                continue
            raise LLMError(
                f"LLM 返回 400：{got_400}。已自动尝试去除 reasoning_content / tool_choice / tools 等字段仍失败。"
                f"建议：①确认该 API（如小米 MiMo / 第三方转售网关）是否支持 OpenAI 兼容的 /chat/completions 接口与 Function Calling；"
                f"②检查 API 额度/套餐是否正常；③换用 DeepSeek / 智谱 GLM / 通义千问 等稳定模型"
            )

        # 理论上不会到这里（200 已 return、5xx 已 raise）
        raise LLMError(f"LLM 请求失败：{last_err}")


async def _stream_llm_request(
    client: httpx.AsyncClient,
    url: str,
    body: dict[str, Any],
    headers: dict[str, str],
    on_event: Callable[[str, dict], Awaitable[Any] | Any],
) -> dict[str, Any]:
    """流式 SSE 请求处理：实时把 reasoning / content 增量推送给前端，
    解析完成后返回与非流式相同结构的完整响应。

    OpenAI 兼容协议中 stream 返回 `data: {...}\\n\\n` 形式的 SSE，每段 delta：
      {"choices": [{"delta": {"role"?, "content"?, "reasoning_content"?, "tool_calls"?}}]}
    最后一段是 `data: [DONE]`。
    """
    reasoning_buf: list[str] = []
    content_buf: list[str] = []
    # 工具调用按 index 累积（不同段可能继续追加同一个工具的 arguments）
    tool_calls_acc: dict[int, dict[str, Any]] = {}

    async with client.stream("POST", url, json=body, headers=headers) as resp:
        if resp.status_code != 200:
            err_text = ""
            try:
                err_text = (await resp.aread()).decode("utf-8", errors="ignore")
                err = json.loads(err_text) if err_text.startswith("{") else None
                if err:
                    msg = err.get("error", {}).get("message") if isinstance(err.get("error"), dict) else err.get("message") or err_text
                else:
                    msg = err_text
            except Exception:
                msg = f"status={resp.status_code}"
            if resp.status_code == 400:
                # 附带完整错误体，便于定位真正被拒的 param
                extra = (err_text or "")[:600]
                raise LLMBadRequest(f"{msg} | 完整响应: {extra}" if extra and extra not in msg else msg)
            raise LLMError(f"LLM 返回 {resp.status_code}：{msg}")

        async for line in resp.aiter_lines():
            if not line:
                continue
            if line.startswith(":"):
                continue  # SSE 注释/心跳
            if line.startswith("data:"):
                data_str = line[5:].strip()
                if data_str == "[DONE]":
                    break
                try:
                    chunk = json.loads(data_str)
                except json.JSONDecodeError:
                    continue
                choices = chunk.get("choices") or []
                if not choices:
                    continue
                delta = (choices[0] or {}).get("delta") or {}
                # reasoning 增量
                rc = delta.get("reasoning_content")
                if rc:
                    reasoning_buf.append(rc)
                    try:
                        await _maybe_await(on_event("reasoning_partial", {"text": rc, "full": "".join(reasoning_buf)}))
                    except Exception:
                        pass
                # content 增量
                ct = delta.get("content")
                if ct:
                    content_buf.append(ct)
                    try:
                        await _maybe_await(on_event("content_partial", {"text": ct, "full": "".join(content_buf)}))
                    except Exception:
                        pass
                # tool_calls 增量（按 index 合并）
                tcs = delta.get("tool_calls") or []
                for tc in tcs:
                    idx = tc.get("index", 0)
                    bucket = tool_calls_acc.setdefault(idx, {"id": "", "type": "function", "function": {"name": "", "arguments": ""}})
                    if tc.get("id"):
                        bucket["id"] = tc["id"]
                    fn = tc.get("function") or {}
                    if fn.get("name"):
                        bucket["function"]["name"] += fn["name"]
                    if fn.get("arguments"):
                        bucket["function"]["arguments"] += fn["arguments"]

    # 拼回非流式格式的完整响应
    final_msg: dict[str, Any] = {
        "role": "assistant",
        "content": "".join(content_buf) or None,
    }
    if reasoning_buf:
        final_msg["reasoning_content"] = "".join(reasoning_buf)
    if tool_calls_acc:
        final_msg["tool_calls"] = [tool_calls_acc[k] for k in sorted(tool_calls_acc.keys())]
    return {"choices": [{"index": 0, "message": final_msg, "finish_reason": "stop"}]}


def _parse_assistant_response(data: dict[str, Any]) -> tuple[str, list[ToolCall], str | None]:
    """从 LLM 响应中抽出文本、工具调用、reasoning_content（DeepSeek 思考链）"""
    if "choices" not in data or not data["choices"]:
        return "", [], None
    choice = data["choices"][0]
    msg = choice.get("message", {})
    content = msg.get("content") or ""
    reasoning_content = msg.get("reasoning_content") or None
    raw_tool_calls = msg.get("tool_calls") or []
    tool_calls: list[ToolCall] = []
    for tc in raw_tool_calls:
        fn = tc.get("function", {})
        args_str = fn.get("arguments") or "{}"
        try:
            args = json.loads(args_str) if isinstance(args_str, str) else args_str
        except json.JSONDecodeError:
            args = {"_raw_arguments": args_str}
        tool_calls.append(ToolCall(
            id=tc.get("id") or uuid.uuid4().hex[:12],
            name=fn.get("name", ""),
            arguments=args,
        ))
    return content, tool_calls, reasoning_content


# ---------- 主对话循环 ----------

MAX_TOOL_ROUNDS = 100  # 单次用户消息最多轮工具调用（足够复杂任务连续搭建+自检+排错）

# 上下文压缩阈值：消息总条数超过此值时，自动总结早期消息
CONTEXT_COMPRESSION_THRESHOLD = 50
CONTEXT_KEEP_RECENT = 20  # 压缩时保留最近多少条消息

# 会话级"取消令牌"——用户在 AI 工作期间发新消息时，旧任务会读到这个 token 然后立刻退出
_cancel_tokens: dict[str, asyncio.Event] = {}

# client_action 等待前端回执：tool_call_id -> Future
# 后端发出 client_action 工具调用 → 等前端通过 socket 把真实执行结果回传 → 后端继续
_client_action_waiters: dict[str, asyncio.Future] = {}


def resolve_client_action(tool_call_id: str, result: dict) -> bool:
    """前端通过 socket 回传 client_action 真实执行结果时调用"""
    fut = _client_action_waiters.get(tool_call_id)
    if fut is None or fut.done():
        return False
    try:
        fut.set_result(result)
        return True
    except Exception:
        return False


def cancel_session(session_id: str) -> bool:
    """中断指定会话当前正在跑的对话/工具任务"""
    ev = _cancel_tokens.get(session_id)
    if ev is None:
        return False
    ev.set()
    return True


def _get_or_create_cancel_token(session_id: str) -> asyncio.Event:
    ev = _cancel_tokens.get(session_id)
    if ev is None or ev.is_set():
        ev = asyncio.Event()
        _cancel_tokens[session_id] = ev
    return ev


def _release_cancel_token(session_id: str) -> None:
    _cancel_tokens.pop(session_id, None)


class _Cancelled(Exception):
    """内部信号：当前会话被取消"""


def _check_cancel(token: asyncio.Event) -> None:
    if token.is_set():
        raise _Cancelled()


async def _maybe_compress_messages(
    session: ChatSession,
    *,
    config: AssistantConfig,
) -> None:
    """会话超长时自动压缩：把早期消息合并成一个 system 摘要消息

    策略：
    - 总消息数超 CONTEXT_COMPRESSION_THRESHOLD
    - 保留最后 CONTEXT_KEEP_RECENT 条消息
    - 把更早的消息（不含 system）调用 LLM 摘要成一段文字，存为伪 system 消息
    - 失败时退化为：拼接前 N 条文本截短作为摘要
    """
    if len(session.messages) <= CONTEXT_COMPRESSION_THRESHOLD:
        return

    keep_count = CONTEXT_KEEP_RECENT
    older_msgs = session.messages[:-keep_count] if keep_count > 0 else session.messages[:]
    recent_msgs = session.messages[-keep_count:] if keep_count > 0 else []

    # 已经压缩过一次的话，会话第一条会是我们注入的 ASSISTANT_SUMMARY；继续往前合并
    summary_text_parts: list[str] = []
    raw_lines: list[str] = []
    for m in older_msgs:
        role = m.role.value if hasattr(m.role, "value") else str(m.role)
        if role == "tool":
            raw_lines.append(f"[工具结果] {(m.content or '')[:240]}")
        elif role == "assistant":
            if m.tool_calls:
                tnames = ", ".join(tc.name for tc in m.tool_calls)
                raw_lines.append(f"[助手调用] {tnames}")
            if m.content:
                raw_lines.append(f"[助手] {m.content[:240]}")
        elif role == "user":
            raw_lines.append(f"[用户] {(m.content or '')[:240]}")
        elif role == "system":
            # 历史 system 摘要直接保留进新摘要里
            summary_text_parts.append(m.content or "")

    # 限制原始日志长度
    raw_text = "\n".join(raw_lines)
    if len(raw_text) > 8000:
        raw_text = raw_text[:4000] + "\n…（中间内容已省略）…\n" + raw_text[-3000:]

    summary_prompt = (
        "下面是一段 WebRPA 小助手与用户之间的较早对话摘录（包含用户提问、助手回答、工具调用与结果）。\n"
        "请用中文产出一份 200~400 字的精炼摘要，提取出：\n"
        "1) 用户的核心目标与重要偏好\n"
        "2) 已经达成的关键事实（搭建过哪些工作流、改过哪些配置等）\n"
        "3) 未完成或被中断的事项\n"
        "4) 对后续对话有用的上下文\n"
        "不要复述工具名，只保留有意义的实质信息。\n\n"
        f"对话内容：\n{raw_text}"
    )

    summary = ""
    try:
        if config.api_url and config.model:
            # 用同一个模型做摘要，但单独请求，控制开销
            data = await _call_llm(
                config=config,
                messages=[
                    {"role": "system", "content": "你是一个善于总结对话上下文的助手。"},
                    {"role": "user", "content": summary_prompt},
                ],
                tools=None,
            )
            summary, _, _ = _parse_assistant_response(data)
    except Exception as e:
        print(f"[AIAssistant] 自动压缩 LLM 摘要失败：{e}")

    if not summary:
        # 退化方案：直接截短拼接
        summary = "（自动摘要失败，回退原始截断）\n" + raw_text[:1500]

    # 拼装新 history
    parts = []
    parts.extend(summary_text_parts)
    parts.append("【上下文自动摘要】\n" + summary)
    merged_summary = "\n\n".join(p for p in parts if p)

    summary_msg = ChatMessage(
        id=uuid.uuid4().hex[:12],
        role=MessageRole.SYSTEM,
        content=merged_summary,
    )
    session.messages = [summary_msg] + recent_msgs
    print(f"[AIAssistant] 已自动压缩上下文：{len(older_msgs)} 条 → 1 条摘要，保留最近 {len(recent_msgs)} 条")


async def _auto_remember_if_needed(
    user_message: str,
    *,
    config: AssistantConfig,
) -> None:
    """检测用户消息中是否包含明显的偏好/约定，自动写入长期记忆。

    通过简单关键词触发：包含"记住/我习惯/我喜欢/我项目/请记得"等。
    避免把每条普通消息都塞进记忆。
    """
    text = (user_message or "").strip()
    if not text or len(text) < 4:
        return

    triggers = ("记住", "记得", "记一下", "请记住", "我习惯", "我喜欢", "我的项目", "以后都", "之后都", "默认用", "默认使用", "我偏好")
    if not any(t in text for t in triggers):
        return

    try:
        from app.services.ai_assistant_skills import skill_remember
        await skill_remember(content=text[:500], tags=["auto"])
        print(f"[AIAssistant] 自动写入记忆: {text[:50]}…")
    except Exception as e:
        print(f"[AIAssistant] 自动记忆失败：{e}")


async def chat_once(
    *,
    session: ChatSession,
    user_message_text: str,
    config: AssistantConfig,
    workflow_context: dict[str, Any] | None = None,
    images: list[str] | None = None,
    fallback_configs: list[AssistantConfig] | None = None,
    on_event: Optional[callable] = None,
) -> ChatSession:
    """处理一次用户消息（含多轮工具调用）。

    on_event(event_name, payload)：可选的回调，用于 Socket.IO 推送中间事件
        - "tool_call": 模型决定调用某个工具
        - "tool_result": 工具执行结果
        - "assistant_partial": 中间助手回合
    """

    # 0. 注册取消令牌（同会话再次调用时旧任务可被取消）
    cancel_token = _get_or_create_cancel_token(session.id)

    # 0b. 自动写入用户偏好（异步，不阻塞主流程）
    try:
        asyncio.create_task(_auto_remember_if_needed(user_message_text, config=config))
    except Exception:
        pass

    # 1. 把用户消息追加进会话
    # 1-pre. 非多模态模型 + 用户发了图片 → 优雅降级：尝试 OCR 提取图片文字并并入文本，
    #        否则明确告知"当前模型不支持图片"，绝不把图片硬塞给纯文本模型导致报错。
    if images and not getattr(config, "supports_vision", False):
        ocr_texts: list[str] = []
        try:
            from app.services.ai_assistant_skills import _ocr_image_to_text  # type: ignore
            for img in images:
                try:
                    t = await _ocr_image_to_text(img)
                    if t and t.strip():
                        ocr_texts.append(t.strip())
                except Exception:
                    pass
        except Exception:
            pass
        n = len(images)
        if ocr_texts:
            user_message_text = (
                f"{user_message_text}\n\n[系统提示：当前模型不支持识图，已对用户附带的 {n} 张图片做 OCR 文字识别，结果如下，请据此理解用户意图]\n"
                + "\n---\n".join(ocr_texts)
            )
        else:
            user_message_text = (
                f"{user_message_text}\n\n[系统提示：用户附带了 {n} 张图片，但当前模型不支持图片识别（非多模态），已无法读取图片内容。"
                "请在回复中友好提醒用户：如需识别图片，请在模型配置里切换到支持多模态/视觉的模型。仍尽力根据文字部分继续帮助用户。]"
            )
        try:
            if on_event:
                res = on_event("assistant_notice", {
                    "text": f"当前模型不支持图片识别，已{'改用 OCR 提取文字' if ocr_texts else '忽略图片'}。如需识图请切换多模态模型。"
                })
                if asyncio.iscoroutine(res):
                    await res
        except Exception:
            pass
        images = None  # 不再以 image_url 形式下发

    user_msg = ChatMessage(
        id=uuid.uuid4().hex[:12],
        role=MessageRole.USER,
        content=user_message_text,
        images=images or None,
    )
    session.messages.append(user_msg)

    # 2. 给会话起标题（首次提问时，自动从问题生成简短标题）
    user_message_count = sum(1 for m in session.messages if m.role == MessageRole.USER)
    if user_message_count == 1 and (session.title in ("", "新对话") or not session.title):
        # 简单清洗：截 26 字符内、剔除换行
        title = user_message_text.strip().split("\n")[0]
        if len(title) > 26:
            title = title[:26] + "…"
        session.title = title or "新对话"

    # 2b. 上下文自动压缩（消息过长时合并早期消息为摘要）
    try:
        await _maybe_compress_messages(session, config=config)
    except Exception as e:
        print(f"[AIAssistant] 自动压缩失败：{e}")

    # 3. 构造系统提示词（每次重新构造，让最新的工作流上下文生效）
    workflow_summary = ""
    if workflow_context:
        try:
            wf_name = workflow_context.get("name") or "未命名工作流"
            nodes = workflow_context.get("nodes") or []
            edges = workflow_context.get("edges") or []
            current_id = (
                workflow_context.get("currentExecutionWorkflowId")
                or workflow_context.get("workflowId")
                or ""
            )
            variables = workflow_context.get("variables") or []

            workflow_summary = (
                f"- 当前画布：{wf_name}（{len(nodes)} 个节点，{len(edges)} 条连线）\n"
                f"- 工作流 ID：{current_id or '（未保存或未运行）'}\n"
            )

            # 节点类型分布
            type_counter: dict[str, int] = {}
            for n in nodes:
                t = n.get("type") or "unknown"
                type_counter[t] = type_counter.get(t, 0) + 1
            if type_counter:
                top_types = sorted(type_counter.items(), key=lambda x: -x[1])[:12]
                workflow_summary += "- 节点类型分布：" + ", ".join(
                    f"{t}×{c}" for t, c in top_types
                ) + "\n"

            # 节点 ID 与 label 映射（让 LLM 能精确引用节点）
            if 0 < len(nodes) <= 50:
                workflow_summary += "- 节点清单（id - type - label - 关键配置 - 备注）：\n"
                # 关键配置摘要：取最高信号的字段让 AI 一眼看懂当前节点配了什么
                IMPORTANT_FIELDS = [
                    "url", "selector", "text", "variableName", "resultVariable",
                    "saveToVariable", "listVariable", "dictVariable", "itemVariable",
                    "loopType", "loopCount", "filePath", "command", "operator",
                    "leftValue", "rightValue", "userPrompt", "model",
                ]
                for n in nodes[:50]:
                    nid = n.get("id", "?")
                    nt = n.get("type", "?")
                    label = ""
                    data = n.get("data") or {}
                    if isinstance(data, dict):
                        label = data.get("label") or data.get("customName") or ""
                    name = data.get("name", "") if isinstance(data, dict) else ""
                    cfg_parts: list[str] = []
                    if isinstance(data, dict):
                        for f in IMPORTANT_FIELDS:
                            if f in data and data[f] not in (None, "", []):
                                v = str(data[f])
                                if len(v) > 40:
                                    v = v[:40] + "…"
                                cfg_parts.append(f"{f}={v}")
                                if len(cfg_parts) >= 3:
                                    break
                    cfg_summary = "; ".join(cfg_parts) if cfg_parts else "(空)"
                    name_part = f" 备注={name}" if name else ""
                    workflow_summary += f"  - {nid} - {nt} - {label} - [{cfg_summary}]{name_part}\n"

            # 变量
            if variables:
                workflow_summary += f"- 当前变量（{len(variables)} 个）：\n"
                for v in variables[:20]:
                    if isinstance(v, dict):
                        vn = v.get("name", "")
                        vt = v.get("type", "?")
                        workflow_summary += f"  - {vn} ({vt})\n"
        except Exception as e:
            workflow_summary = f"（解析工作流上下文失败：{e}）"

    # 4. 加载长期记忆摘要
    memory_summary = ""
    try:
        from app.services.ai_assistant_skills import _load_memory  # type: ignore
        items = _load_memory()
        if items:
            recent = items[-5:]
            memory_summary = "\n".join(f"- {i.get('content', '')}" for i in recent)
    except Exception:
        pass

    # 4-bis. 加载教训 + 用户画像 + 学过的 skill（对标 Hermes Agent 的 5 支柱）
    extra_prompt_sections: list[str] = []
    try:
        from app.services.ai_assistant_skills_v3 import (
            get_lessons_summary_for_prompt,
            get_user_profile_summary_for_prompt,
            get_learned_skills_summary_for_prompt,
        )
        for fn in (
            get_user_profile_summary_for_prompt,
            get_lessons_summary_for_prompt,
            get_learned_skills_summary_for_prompt,
        ):
            try:
                section = fn() if fn != get_lessons_summary_for_prompt else fn(limit=30)
            except TypeError:
                section = fn()
            if section:
                extra_prompt_sections.append(section)
    except Exception:
        pass

    system_text = build_system_prompt(
        user_extra_prompt=config.system_prompt,
        enable_tools=config.enable_tools,
        workflow_summary=workflow_summary,
        memory_summary=memory_summary,
        max_heal_rounds=getattr(config, "max_heal_rounds", 5) or 5,
        supports_vision=bool(getattr(config, "supports_vision", False)),
        agent_mode=bool(getattr(config, "agent_mode", False)),
    )

    # 把教训/画像/已学技能附加在系统提示词后
    if extra_prompt_sections:
        system_text = system_text + "\n\n" + "\n\n".join(extra_prompt_sections)

    # 4-ter. 注入当前任务计划（多步骤长任务进度追踪，跨"继续"不丢进度）
    try:
        from app.services.ai_assistant_skills_v7 import get_task_plan_summary_for_prompt
        _plan_section = get_task_plan_summary_for_prompt()
        if _plan_section:
            system_text = system_text + "\n\n" + _plan_section
    except Exception:
        pass

    # 4b. 给 system_text 追加可用 client_action 完整列表（让 LLM 不必反复猜测名称）
    if config.enable_tools:
        client_actions_hint = (
            "\n# client_action 速查表（精确名称）\n"
            "工作流：new_workflow / load_workflow / load_workflow_from_data / save_workflow / run_workflow / "
            "run_workflow_headless / stop_workflow / export_workflow / rename_workflow / get_workflow_detail / "
            "get_logs / get_collected_data\n"
            "节点：add_nodes / delete_node / delete_nodes / update_node_config / focus_node / toggle_node_disabled / "
            "align_nodes / copy_nodes / paste_nodes / move_node / rename_node / find_nodes_by_type / "
            "connect_nodes / disconnect_edge / select_all_nodes / clear_selection / fit_view / run_single_node / "
            "undo / redo\n"
            "变量：add_variable / update_variable / delete_variable / rename_variable / list_variables\n"
            "日志/数据：clear_logs / clear_data / set_verbose_log / set_max_log_count / export_logs / download_data / "
            "upload_excel / upload_image / add_log\n"
            "切换/弹窗：switch_bottom_panel(tab=logs|data|variables|assets|images) / "
            "open_global_config / close_global_config / open_local_workflow_dialog / close_local_workflow_dialog / "
            "open_scheduled_tasks / close_scheduled_tasks / open_documentation / close_documentation / "
            "open_workflow_hub / close_workflow_hub / open_auto_browser / close_auto_browser / "
            "open_phone_mirror / close_phone_mirror / open_variable_tracking / close_variable_tracking / "
            "open_export_dialog / open_module_search / take_screenshot / "
            "capture_editor_screenshot（截取当前 WebRPA 编辑器界面并作为图片加入对话，仅在模型支持多模态时使用） / "
            "capture_screen_for_agent（截取整个电脑屏幕并作为图片加入对话，系统级 Agent「看屏」用，仅多模态模型）\n"
            "**弹窗自主操作（强烈推荐）**：list_open_dialogs（列出所有打开的弹窗+可用 actions） / "
            "respond_to_dialog(dialog_id, action, params={value:...})（响应弹窗，例如填写输入弹窗） / "
            "dismiss_dialog(dialog_id)（关闭弹窗，等价取消）。"
            "**当工作流卡住等待用户输入时**优先调 list_open_dialogs 看是否有 input_prompt 弹窗，"
            "有就帮用户填合理值（必要时先确认），让流程往下走。\n"
            "全局配置：get_global_config / update_global_config(section=system|ai|aiAssistant|aiScraper|"
            "email|browser|database|qq|feishu|display|workflow, values={...}) / reset_global_config\n"
            "提示：show_toast(message, type)\n"
            "\n# 后端真生效操作（无需前端配合，直接持久化/真触发）\n"
            "计划任务 真生效：create_scheduled_task / update_scheduled_task / delete_scheduled_task / "
            "toggle_scheduled_task / execute_scheduled_task / stop_scheduled_task / clear_scheduled_task_logs / "
            "list_scheduled_tasks / get_scheduled_task / get_scheduled_task_logs\n"
            "自定义模块 真生效：create_custom_module / update_custom_module / delete_custom_module / "
            "list_custom_modules / get_custom_module\n"
            "工作流 真生效：save_local_workflow（持久化文件）/ run_workflow_now（后端立即执行，返回 workflow_id）/ "
            "stop_workflow_now / read_workflow / list_workflows\n"
            "底栏全局变量：通过 client_action 的 add_variable / update_variable / delete_variable / "
            "rename_variable / list_variables / get_variable / change_variable_type / clear_variables 操作前端底栏。"
            "**不要用 set/delete/clear_global_variable**（已废弃，那是孤儿持久化文件）\n"
            "资源 真生效：delete_data_asset / rename_data_asset / delete_image_asset / rename_image_asset\n"
            "版本历史 真生效（含节点/连线/全局变量的本地快照）：commit_version(message?) 存档 / "
            "list_versions 查看历史 / restore_version(version) 回档。"
            "**改大动作前先 commit_version 存档**，改坏可 restore_version 回档，更安全。\n"
            "系统执行：run_shell_command（PowerShell 等）/ run_python_script（自动用内置 Python313 执行临时脚本后销毁）\n"
            "\n# 真生效 vs 表面功夫：\n"
            "- client_action 大多只影响前端 UI（除变量、资源、运行/导出等是真生效）\n"
            "- 上面「后端真生效」的 skill 直接调用后端服务和 API，会写盘、注册触发器、真启动浏览器等\n"
            "- 用户重启 WebRPA 后，所有「后端真生效」操作的结果仍在\n"
        )
        system_text = system_text + client_actions_hint

    # 5b. Spec 模式：检测到「搭建工作流」类需求时，强提醒走三阶段流程
    workflow_build_keywords = (
        "搭建", "搭一个", "做一个", "做个", "创建工作流", "创建一个工作流",
        "帮我做", "帮我搭", "帮我建", "帮我创建", "帮我设计", "帮我写",
        "新建工作流", "新建一个工作流", "生成工作流", "生成一个工作流",
        "build", "create workflow", "make workflow",
    )
    if any(kw in user_message_text.lower() for kw in (k.lower() for k in workflow_build_keywords)):
        spec_mode_alert = """

# 🎯 Spec 模式已激活 - 必须严格走三阶段流程

用户当前是「搭建工作流」类需求，**必须严格按照系统提示词中「搭建工作流的硬性流程」三阶段执行**：

1. **阶段 1（需求分析）**：先在 reasoning 里梳理用户真实意图、隐含约束、边界条件
   - 模糊的关键点必须先反问（例：保存到哪里？格式什么？批量多少个？）
   - 不要急着调 build_workflow

2. **阶段 2（工作流设计）**：先做调研
   - search_modules / get_workflow_templates / get_workflow_detail
   - 网页类：probe_page 拿真实 selector
   - 列出完整模块清单 + 变量传递链
   - **强制 get_module_schema(批量)** 拿 required/defaults
   - 自检设计（变量是否连贯？必填是否齐全？错误处理是否到位？）

3. **阶段 3（实施 + 验证）**：
   - build_workflow 一次到位
   - **立即** validate_workflow_nodes + analyze_variable_flow（非选）
   - 有问题用 auto_fix_workflow_nodes / bulk_update_nodes 修
   - 条件允许时 run_workflow + get_logs 自测
   - 三段式总结报告

**严禁**：用户一开口就直接 build_workflow，不调 schema、不 validate、不 probe、不 self-test。

**模块 vs 脚本的选择**：先 `search_modules` 查内置模块。如果模块能 1-3 步优雅解决就用模块；
如果模块要拼 5+ 步、变量传递繁琐、是纯算法/复杂逻辑，**大胆用 `python_script`** —— 哪个简单选哪个。
不要走极端：既不要默认造轮子（明明有 read_excel 偏要 python+pandas），也不要为了用模块硬画 8 个节点
（明明 `return math.factorial(n)` 一行搞定）。
"""
        system_text = system_text + spec_mode_alert

    # 5. 多轮工具调用编排
    tools = skill_registry.to_openai_tools() if config.enable_tools else None

    # 多模型候选：主模型 + 备用模型（前端已按 场景路由/手动选择/自动回退 排好序）
    _candidates: list[AssistantConfig] = [config] + list(fallback_configs or [])

    async def _call_llm_with_fallback(messages, _tools, _on_event):
        """按候选顺序调用 LLM，遇 LLMError 自动切下一个模型，全失败才抛最后错误。"""
        last_err: Exception | None = None
        for idx, cand in enumerate(_candidates):
            if idx > 0 and _on_event:
                try:
                    await _maybe_await(_on_event("model_switch", {
                        "index": idx,
                        "model": cand.model,
                        "reason": str(last_err)[:160] if last_err else "",
                    }))
                except Exception:
                    pass
            try:
                return await _call_llm(config=cand, messages=messages, tools=_tools, on_event=_on_event)
            except _Cancelled:
                raise
            except LLMError as e:
                last_err = e
                print(f"[AIAssistant] 模型[{idx}] {cand.model} 调用失败：{str(e)[:120]}，尝试下一个候选")
                continue
        raise last_err or LLMError("所有候选模型均不可用")

    final_assistant_msg: ChatMessage | None = None

    try:
        for round_idx in range(MAX_TOOL_ROUNDS + 1):
            _check_cancel(cancel_token)

            # 拼装发送给 LLM 的 messages
            llm_messages: list[dict[str, Any]] = [{"role": "system", "content": system_text}]
            for m in session.messages:
                llm_messages.append(_convert_message_for_llm(m))

            # LLM 调用与取消监听同时跑（流式：传 on_event 让 reasoning/content 实时下发）
            try:
                llm_task = asyncio.create_task(
                    _call_llm_with_fallback(llm_messages, tools, on_event)
                )
                cancel_wait = asyncio.create_task(cancel_token.wait())
                done, pending = await asyncio.wait(
                    {llm_task, cancel_wait}, return_when=asyncio.FIRST_COMPLETED
                )
                if cancel_wait in done and llm_task not in done:
                    llm_task.cancel()
                    for p in pending:
                        if p is not llm_task:
                            p.cancel()
                    raise _Cancelled()
                # llm 已先完成
                for p in pending:
                    p.cancel()
                raw = llm_task.result()
            except _Cancelled:
                raise
            except LLMError as e:
                err_msg = ChatMessage(
                    id=uuid.uuid4().hex[:12],
                    role=MessageRole.ASSISTANT,
                    content=f"[LLM 调用失败] {e}",
                )
                session.messages.append(err_msg)
                final_assistant_msg = err_msg
                break

            content, tool_calls, reasoning_content = _parse_assistant_response(raw)

            if tool_calls and config.enable_tools and round_idx < MAX_TOOL_ROUNDS:
                assistant_msg = ChatMessage(
                    id=uuid.uuid4().hex[:12],
                    role=MessageRole.ASSISTANT,
                    content=content,
                    tool_calls=tool_calls,
                    reasoning_content=reasoning_content,
                )
                session.messages.append(assistant_msg)

                if on_event:
                    try:
                        await _maybe_await(on_event("assistant_partial", {
                            "message": assistant_msg.model_dump(mode="json"),
                        }))
                    except Exception:
                        pass

                # ===== 并行执行所有工具调用 =====
                async def run_one_tool(tc: ToolCall) -> ToolCall:
                    tc.status = ToolCallStatus.RUNNING
                    tc.started_at = datetime.now()
                    if on_event:
                        try:
                            await _maybe_await(on_event("tool_call", {"tool_call": tc.model_dump(mode="json")}))
                        except Exception:
                            pass
                    try:
                        # client_action 是一个特殊工具：本身在后端只产生意图，
                        # 真正执行在前端。这里同步等前端通过 socket 回传执行结果，
                        # 让 LLM 看到的是真实结果，避免「AI 说做了实际没做」。
                        if tc.name == "client_action":
                            # 先快速检查前端是否在线，避免每个失败请求干等 30 秒
                            try:
                                from app.main import sio as _sio
                                # default 命名空间下当前连接数（== 编辑器是否打开）
                                _conns = list(_sio.manager.get_participants('/', None))
                                _front_online = len(_conns) > 0
                            except Exception:
                                _front_online = True  # 检测失败时按在线处理（保守）

                            if not _front_online:
                                exec_result = {
                                    "error": (
                                        "WebRPA 浏览器编辑器未打开（前端 socket 无连接）。"
                                        "请先点启动器中的「打开 WebRPA 编辑器」按钮，"
                                        "或在浏览器访问 http://localhost:5921 打开编辑器，再让我重试。"
                                    )
                                }
                                _client_action_waiters.pop(tc.id, None)
                            else:
                                fut: asyncio.Future = asyncio.get_running_loop().create_future()
                                _client_action_waiters[tc.id] = fut
                                try:
                                    # 通知前端立即执行（给 socket 派发更明确的事件）
                                    if on_event:
                                        try:
                                            await _maybe_await(on_event(
                                                "client_action_request",
                                                {
                                                    "tool_call_id": tc.id,
                                                    "action": (tc.arguments or {}).get("action"),
                                                    "payload": (tc.arguments or {}).get("payload") or {},
                                                },
                                            ))
                                        except Exception:
                                            pass
                                    # 最多等 30 秒
                                    front_result = await asyncio.wait_for(fut, timeout=30)
                                    # front_result 是 {success, message?, error?, data?}
                                    if front_result.get("success"):
                                        exec_result = {"success": True, "result": {
                                            "applied": True,
                                            "action": (tc.arguments or {}).get("action"),
                                            "message": front_result.get("message", ""),
                                            "data": front_result.get("data"),
                                        }}
                                    else:
                                        exec_result = {
                                            "error": front_result.get("error") or "前端执行失败",
                                        }
                                except asyncio.TimeoutError:
                                    exec_result = {"error": "前端执行超时（30 秒），请检查 WebRPA 浏览器编辑器是否打开"}
                                except Exception as ex:
                                    exec_result = {"error": f"前端通信异常：{ex}"}
                                finally:
                                    _client_action_waiters.pop(tc.id, None)
                        else:
                            exec_result = await execute_skill(tc.name, tc.arguments)
                    except Exception as ex:
                        exec_result = {"error": f"工具异常：{ex}"}
                    tc.completed_at = datetime.now()
                    if exec_result.get("success"):
                        tc.status = ToolCallStatus.SUCCESS
                        tc.result = exec_result.get("result")
                    else:
                        tc.status = ToolCallStatus.FAILED
                        tc.error = exec_result.get("error", "未知错误")
                    if on_event:
                        try:
                            await _maybe_await(on_event("tool_result", {"tool_call": tc.model_dump(mode="json")}))
                        except Exception:
                            pass
                    return tc

                tool_tasks = [asyncio.create_task(run_one_tool(tc)) for tc in tool_calls]
                cancel_wait = asyncio.create_task(cancel_token.wait())
                # 等所有工具完成或被取消（不要再 create_task gather，gather 本身就是 awaitable）
                done, pending = await asyncio.wait(
                    set(tool_tasks) | {cancel_wait},
                    return_when=asyncio.FIRST_COMPLETED,
                )
                # 用户取消：把还没跑完的 tool 全部 cancel
                if cancel_wait in done:
                    for t in tool_tasks:
                        if not t.done():
                            t.cancel()
                    raise _Cancelled()
                # 某个 tool 先完成而其他还在跑：继续等剩下的全部完成
                if any(not t.done() for t in tool_tasks):
                    await asyncio.gather(*tool_tasks, return_exceptions=True)
                if not cancel_wait.done():
                    cancel_wait.cancel()

                # 把每条工具的结果消息追加到会话
                for tc in tool_calls:
                    tool_msg = ChatMessage(
                        id=uuid.uuid4().hex[:12],
                        role=MessageRole.TOOL,
                        content=json.dumps(
                            tc.result if tc.status == ToolCallStatus.SUCCESS else {"error": tc.error},
                            ensure_ascii=False,
                            default=str,
                        ),
                        tool_call_id=tc.id,
                    )
                    session.messages.append(tool_msg)

                continue  # 进入下一轮

            # 模型给出最终文本回复（或到达 MAX_TOOL_ROUNDS 必须停下时）
            # 如果到达上限但模型还想调工具，给一段提示让用户知道可以再说一句继续
            if tool_calls and config.enable_tools and round_idx >= MAX_TOOL_ROUNDS:
                final_content = (content or "").strip()
                tool_names = ", ".join((tc.name for tc in tool_calls)) or "（更多工具）"
                hint = (
                    f"\n\n---\n"
                    f"⏸️ 我已完成 {MAX_TOOL_ROUNDS} 轮工具调用，按当前任务复杂度先暂停一下。\n"
                    f"我接下来还想调用：**{tool_names}**\n"
                    f"如果你希望继续，直接回复「继续」或描述想让我做什么，我会接着执行。"
                )
                final_content = (final_content + hint) if final_content else hint.lstrip()
                final_assistant_msg = ChatMessage(
                    id=uuid.uuid4().hex[:12],
                    role=MessageRole.ASSISTANT,
                    content=final_content,
                    reasoning_content=reasoning_content,
                )
            else:
                final_assistant_msg = ChatMessage(
                    id=uuid.uuid4().hex[:12],
                    role=MessageRole.ASSISTANT,
                    content=content,
                    reasoning_content=reasoning_content,
                )
            session.messages.append(final_assistant_msg)
            break

    except _Cancelled:
        cancel_msg = ChatMessage(
            id=uuid.uuid4().hex[:12],
            role=MessageRole.ASSISTANT,
            content="[已停止] 任务被你打断，未完成的工具调用已取消。",
        )
        session.messages.append(cancel_msg)
        final_assistant_msg = cancel_msg
        if on_event:
            try:
                await _maybe_await(on_event("cancelled", {"reason": "user_cancelled"}))
            except Exception:
                pass
    finally:
        _release_cancel_token(session.id)

    save_session(session)
    return session


async def _maybe_await(value: Any) -> Any:
    """on_event 回调可能是同步函数，统一兼容"""
    if asyncio.iscoroutine(value):
        return await value
    return value
