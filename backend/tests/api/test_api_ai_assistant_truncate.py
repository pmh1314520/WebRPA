# -*- coding: utf-8 -*-
"""AI 小助手会话截断（消息回滚）接口与服务测试。

覆盖前端「消息回滚」新增的服务端截断能力：删除某条消息及其之后的所有消息，
并同步持久化；找不到会话/消息时安全返回，不破坏原会话。
所有用例自建会话并在结束时清理，不依赖真实 LLM / 网络。
"""
import pytest

from app.models.ai_assistant import ChatMessage, MessageRole
from app.services.ai_assistant_service import (
    create_session,
    save_session,
    load_session,
    delete_session,
    truncate_session,
)

pytestmark = pytest.mark.api


def _make_session_with_messages():
    session = create_session("截断测试会话")
    session.messages = [
        ChatMessage(id="m1", role=MessageRole.USER, content="第一条"),
        ChatMessage(id="m2", role=MessageRole.ASSISTANT, content="回复一"),
        ChatMessage(id="m3", role=MessageRole.USER, content="第二条"),
        ChatMessage(id="m4", role=MessageRole.ASSISTANT, content="回复二"),
    ]
    save_session(session)
    return session


def test_truncate_removes_message_and_after():
    session = _make_session_with_messages()
    try:
        result = truncate_session(session.id, "m3")
        assert result is not None
        assert [m.id for m in result.messages] == ["m1", "m2"]
        # 持久化同步更新
        reloaded = load_session(session.id)
        assert [m.id for m in reloaded.messages] == ["m1", "m2"]
    finally:
        delete_session(session.id)


def test_truncate_first_message_clears_all():
    session = _make_session_with_messages()
    try:
        result = truncate_session(session.id, "m1")
        assert result is not None
        assert result.messages == []
    finally:
        delete_session(session.id)


def test_truncate_unknown_message_returns_none_and_keeps_session():
    session = _make_session_with_messages()
    try:
        assert truncate_session(session.id, "does-not-exist") is None
        reloaded = load_session(session.id)
        assert len(reloaded.messages) == 4
    finally:
        delete_session(session.id)


def test_truncate_unknown_session_returns_none():
    assert truncate_session("nonexistent-session-id", "m1") is None


def test_truncate_endpoint_404_on_unknown_session(client):
    r = client.post("/api/ai-assistant/sessions/nope-xyz/truncate", json={"message_id": "m1"})
    assert r.status_code == 404


def test_truncate_endpoint_success(client):
    session = _make_session_with_messages()
    try:
        r = client.post(
            f"/api/ai-assistant/sessions/{session.id}/truncate",
            json={"message_id": "m2"},
        )
        assert r.status_code == 200
        body = r.json()
        assert body["success"] is True
        assert [m["id"] for m in body["messages"]] == ["m1"]
    finally:
        delete_session(session.id)
