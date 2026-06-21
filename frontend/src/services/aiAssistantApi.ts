import { apiRequest } from './api'
import type { ChatMessage, SessionListItem } from '@/store/aiAssistantStore'

export interface AssistantConfigPayload {
  api_url: string
  api_key: string
  model: string
  temperature: number
  max_tokens: number
  system_prompt: string
  enable_tools: boolean
  auto_approve: boolean
}

export interface ChatRequestPayload {
  session_id?: string | null
  message: string
  config: AssistantConfigPayload
  workflow_context?: Record<string, any>
  images?: string[]
  fallback_configs?: AssistantConfigPayload[]
}

export interface ChatResponsePayload {
  session_id: string
  message: ChatMessage
}

export const aiAssistantApi = {
  listSessions: () =>
    apiRequest<SessionListItem[]>('/ai-assistant/sessions'),

  createSession: (title?: string) =>
    apiRequest<{ session_id: string; title: string }>('/ai-assistant/sessions', {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),

  getSession: (id: string) =>
    apiRequest<{ id: string; title: string; messages: ChatMessage[] }>(
      `/ai-assistant/sessions/${id}`
    ),

  deleteSession: (id: string) =>
    apiRequest<{ success: boolean }>(`/ai-assistant/sessions/${id}`, {
      method: 'DELETE',
    }),

  renameSession: (id: string, title: string) =>
    apiRequest<{ success: boolean }>(`/ai-assistant/sessions/${id}/title`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    }),

  chat: (req: ChatRequestPayload, signal?: AbortSignal) =>
    apiRequest<ChatResponsePayload>('/ai-assistant/chat', {
      method: 'POST',
      body: JSON.stringify(req),
      signal,
    }),

  cancel: (sessionId: string) =>
    apiRequest<{ success: boolean; session_id: string }>(
      `/ai-assistant/sessions/${sessionId}/cancel`,
      { method: 'POST' }
    ),

  testConnection: (config: AssistantConfigPayload) =>
    apiRequest<{ success: boolean; message: string; detail?: string; latency_ms?: number }>(
      '/ai-assistant/test-connection',
      { method: 'POST', body: JSON.stringify({ config }) }
    ),

  extractFile: (filename: string, contentBase64: string) =>
    apiRequest<{ success: boolean; text: string; error?: string }>(
      '/ai-assistant/extract-file',
      { method: 'POST', body: JSON.stringify({ filename, content_base64: contentBase64 }) }
    ),

  transcribe: (audioBase64: string, language = 'zh', modelSize = 'base') =>
    apiRequest<{ success: boolean; text: string; error?: string; language?: string }>(
      '/ai-assistant/transcribe',
      { method: 'POST', body: JSON.stringify({ audio_base64: audioBase64, language, model_size: modelSize }) }
    ),

  listSkills: () =>
    apiRequest<{ count: number; skills: any[] }>('/ai-assistant/skills'),

  listMemories: () =>
    apiRequest<{ entries: any[] }>('/ai-assistant/memories'),

  addMemory: (content: string, tags: string[] = []) =>
    apiRequest('/ai-assistant/memories', {
      method: 'POST',
      body: JSON.stringify({ content, tags }),
    }),

  deleteMemory: (id: string) =>
    apiRequest(`/ai-assistant/memories/${id}`, { method: 'DELETE' }),

  // 共享配置：跨上下文同步小助手配置（编辑器推送 / Agent 窗口拉取）
  getSharedConfig: () =>
    apiRequest<{ config: any | null }>('/ai-assistant/config'),

  saveSharedConfig: (config: any) =>
    apiRequest<{ success: boolean }>('/ai-assistant/config', {
      method: 'PUT',
      body: JSON.stringify({ config }),
    }),
}
