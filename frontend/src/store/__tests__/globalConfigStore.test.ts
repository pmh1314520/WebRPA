import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest'

// 该 store 使用 persist(localStorage) 中间件；jsdom 环境的 localStorage 在本 vitest
// 版本下 setItem 不可用。这里用内存实现打桩，并在打桩后再动态 import store，
// 确保 store 创建时 localStorage 已可用。
const _mem: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (k: string) => (k in _mem ? _mem[k] : null),
  setItem: (k: string, v: string) => { _mem[k] = String(v) },
  removeItem: (k: string) => { delete _mem[k] },
  clear: () => { for (const k of Object.keys(_mem)) delete _mem[k] },
  key: () => null,
  get length() { return Object.keys(_mem).length },
})

type Store = typeof import('@/store/globalConfigStore').useGlobalConfigStore
let S: Store

beforeAll(async () => {
  const mod = await import('@/store/globalConfigStore')
  S = mod.useGlobalConfigStore
})

describe('globalConfigStore 小助手配置合并（issue 3）', () => {
  beforeEach(() => {
    S.getState().updateAIAssistantConfig({
      apiUrl: 'https://api.example.com',
      apiKey: 'k',
      model: 'gpt-4o-mini',
      temperature: 0.7,
      supportsVision: undefined,
      isThinking: undefined,
    })
  })

  it('设置 supportsVision 不影响其它字段', () => {
    S.getState().updateAIAssistantConfig({ supportsVision: true })
    const a = S.getState().config.aiAssistant
    expect(a.supportsVision).toBe(true)
    expect(a.model).toBe('gpt-4o-mini')
    expect(a.apiUrl).toBe('https://api.example.com')
  })

  it('设置 isThinking 独立生效', () => {
    S.getState().updateAIAssistantConfig({ isThinking: true })
    expect(S.getState().config.aiAssistant.isThinking).toBe(true)
  })

  it('两个开关可分别切换且互不干扰', () => {
    S.getState().updateAIAssistantConfig({ supportsVision: true, isThinking: true })
    expect(S.getState().config.aiAssistant.supportsVision).toBe(true)
    expect(S.getState().config.aiAssistant.isThinking).toBe(true)
    S.getState().updateAIAssistantConfig({ supportsVision: false })
    expect(S.getState().config.aiAssistant.supportsVision).toBe(false)
    expect(S.getState().config.aiAssistant.isThinking).toBe(true)
  })

  it('partial 更新保留未提供字段', () => {
    S.getState().updateAIAssistantConfig({ temperature: 0.3 })
    const a = S.getState().config.aiAssistant
    expect(a.temperature).toBe(0.3)
    expect(a.model).toBe('gpt-4o-mini')
  })
})
