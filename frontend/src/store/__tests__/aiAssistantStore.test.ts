import { describe, it, expect, beforeEach } from 'vitest'
import { useAIAssistantStore, type ChatMessage, type ToolCall } from '@/store/aiAssistantStore'

const S = useAIAssistantStore

function msg(id: string, role: ChatMessage['role'] = 'user', content = ''): ChatMessage {
  return { id, role, content }
}

describe('aiAssistantStore 消息管理', () => {
  beforeEach(() => {
    S.setState({ messages: [], rollbackSnapshots: {}, liveToolCalls: [], isSending: false })
  })

  it('appendMessage 依次追加', () => {
    S.getState().appendMessage(msg('a'))
    S.getState().appendMessage(msg('b'))
    expect(S.getState().messages.map((m) => m.id)).toEqual(['a', 'b'])
  })

  it('setMessages 整体替换', () => {
    S.getState().appendMessage(msg('a'))
    S.getState().setMessages([msg('x'), msg('y')])
    expect(S.getState().messages.map((m) => m.id)).toEqual(['x', 'y'])
  })

  it('updateMessageById 局部更新', () => {
    S.getState().setMessages([msg('a', 'assistant', '旧')])
    S.getState().updateMessageById('a', { content: '新' })
    expect(S.getState().messages[0].content).toBe('新')
  })

  it('upsertMessage 存在则合并、不存在则追加', () => {
    S.getState().setMessages([msg('a', 'assistant', '一')])
    S.getState().upsertMessage({ ...msg('a', 'assistant'), content: '二' })
    expect(S.getState().messages).toHaveLength(1)
    expect(S.getState().messages[0].content).toBe('二')
    S.getState().upsertMessage(msg('b'))
    expect(S.getState().messages.map((m) => m.id)).toEqual(['a', 'b'])
  })

  it('clearMessages 清空', () => {
    S.getState().setMessages([msg('a'), msg('b')])
    S.getState().clearMessages()
    expect(S.getState().messages).toEqual([])
  })
})

describe('aiAssistantStore 回滚快照（issue 6）', () => {
  beforeEach(() => {
    S.setState({ rollbackSnapshots: {} })
  })

  it('set/get 回滚快照', () => {
    const snap = { nodes: [], edges: [], text: '你好', createdAt: Date.now() }
    S.getState().setRollbackSnapshot('m1', snap)
    expect(S.getState().getRollbackSnapshot('m1')).toEqual(snap)
    expect(S.getState().getRollbackSnapshot('none')).toBeUndefined()
  })

  it('多条快照互不覆盖', () => {
    S.getState().setRollbackSnapshot('m1', { nodes: [], edges: [], text: 'a', createdAt: 1 })
    S.getState().setRollbackSnapshot('m2', { nodes: [], edges: [], text: 'b', createdAt: 2 })
    expect(S.getState().getRollbackSnapshot('m1')?.text).toBe('a')
    expect(S.getState().getRollbackSnapshot('m2')?.text).toBe('b')
  })
})

describe('aiAssistantStore 实时工具调用', () => {
  beforeEach(() => {
    S.setState({ liveToolCalls: [] })
  })

  it('upsertLiveToolCall 按 id 累积/更新状态', () => {
    const tc: ToolCall = { id: 't1', name: 'build_workflow', arguments: {}, status: 'running' }
    S.getState().upsertLiveToolCall(tc)
    expect(S.getState().liveToolCalls).toHaveLength(1)
    S.getState().upsertLiveToolCall({ ...tc, status: 'success' })
    expect(S.getState().liveToolCalls).toHaveLength(1)
    expect(S.getState().liveToolCalls[0].status).toBe('success')
  })

  it('clearLiveToolCalls 清空', () => {
    S.getState().upsertLiveToolCall({ id: 't1', name: 'x', arguments: {}, status: 'pending' })
    S.getState().clearLiveToolCalls()
    expect(S.getState().liveToolCalls).toEqual([])
  })
})
