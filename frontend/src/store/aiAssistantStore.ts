import { create } from 'zustand'

export type ToolCallStatus = 'pending' | 'running' | 'success' | 'failed' | 'rejected'

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, any>
  status: ToolCallStatus
  result?: any
  error?: string
  started_at?: string
  completed_at?: string
}

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  tool_calls?: ToolCall[]
  tool_call_id?: string
  timestamp?: string
  /** 多模态：用户消息附带的图片（data URL） */
  images?: string[]
  /** 显示用：用户附带的文档类附件名（pdf/docx/xlsx 等，内容已并入发送文本） */
  attachmentNames?: string[]
  /** DeepSeek-Reasoner 等思考模型的内部思考链（用于回传给 LLM，不在 UI 显示） */
  reasoning_content?: string | null
}

export interface SessionListItem {
  id: string
  title: string
  message_count: number
  updated_at: string
  last_message_preview: string
}

/** 回滚快照：记录某条用户消息发送「之前」的画布状态，供一键回滚 */
export interface RollbackSnapshot {
  nodes: any[]
  edges: any[]
  name?: string
  variables?: any[]
  /** 该用户消息的原始输入文本，回滚后回填到输入框 */
  text: string
  createdAt: number
}

interface AIAssistantState {
  // 面板可见性
  isPanelOpen: boolean
  setPanelOpen: (open: boolean) => void
  togglePanel: () => void

  // 当前会话
  currentSessionId: string | null
  setCurrentSessionId: (id: string | null) => void

  // 当前会话的所有消息
  messages: ChatMessage[]
  setMessages: (messages: ChatMessage[]) => void
  appendMessage: (message: ChatMessage) => void
  updateMessageById: (id: string, patch: Partial<ChatMessage>) => void
  upsertMessage: (message: ChatMessage) => void
  clearMessages: () => void

  // 发送状态
  isSending: boolean
  setSending: (sending: boolean) => void

  // 当前正在运行的工具调用
  liveToolCalls: ToolCall[]
  upsertLiveToolCall: (tc: ToolCall) => void
  clearLiveToolCalls: () => void

  // 会话列表
  sessions: SessionListItem[]
  setSessions: (s: SessionListItem[]) => void

  // 回滚快照：messageId -> 该用户消息发送前的画布状态
  rollbackSnapshots: Record<string, RollbackSnapshot>
  setRollbackSnapshot: (id: string, snap: RollbackSnapshot) => void
  getRollbackSnapshot: (id: string) => RollbackSnapshot | undefined
}

export const useAIAssistantStore = create<AIAssistantState>((set, get) => ({
  isPanelOpen: false,
  setPanelOpen: (open) => set({ isPanelOpen: open }),
  togglePanel: () => set({ isPanelOpen: !get().isPanelOpen }),

  currentSessionId: null,
  setCurrentSessionId: (id) => set({ currentSessionId: id }),

  messages: [],
  setMessages: (messages) => set({ messages }),
  appendMessage: (message) => set({ messages: [...get().messages, message] }),
  updateMessageById: (id, patch) => set({
    messages: get().messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
  }),
  upsertMessage: (message) => {
    const messages = get().messages
    const idx = messages.findIndex((m) => m.id === message.id)
    if (idx >= 0) {
      const next = messages.slice()
      next[idx] = { ...next[idx], ...message }
      set({ messages: next })
    } else {
      set({ messages: [...messages, message] })
    }
  },
  clearMessages: () => set({ messages: [] }),

  isSending: false,
  setSending: (sending) => set({ isSending: sending }),

  liveToolCalls: [],
  upsertLiveToolCall: (tc) => {
    const list = get().liveToolCalls
    const idx = list.findIndex((x) => x.id === tc.id)
    if (idx >= 0) {
      const next = list.slice()
      next[idx] = { ...next[idx], ...tc }
      set({ liveToolCalls: next })
    } else {
      set({ liveToolCalls: [...list, tc] })
    }
  },
  clearLiveToolCalls: () => set({ liveToolCalls: [] }),

  sessions: [],
  setSessions: (sessions) => set({ sessions }),

  rollbackSnapshots: {},
  setRollbackSnapshot: (id, snap) => set({ rollbackSnapshots: { ...get().rollbackSnapshots, [id]: snap } }),
  getRollbackSnapshot: (id) => get().rollbackSnapshots[id],
}))
