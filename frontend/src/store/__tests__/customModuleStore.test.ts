import { describe, it, expect, beforeEach, vi } from 'vitest'

// 桩掉 api：只提供 customModuleStore 用到的 customModulesApi
vi.mock('@/services/api', () => {
  return {
    customModulesApi: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      duplicate: vi.fn(),
      importModule: vi.fn(),
    },
  }
})

import { useCustomModuleStore } from '@/store/customModuleStore'
import { customModulesApi } from '@/services/api'

const api = customModulesApi as unknown as Record<string, ReturnType<typeof vi.fn>>

function mod(id: string, extra: Record<string, unknown> = {}) {
  return { id, name: id, display_name: id, workflow: { nodes: [], edges: [] }, ...extra }
}

describe('customModuleStore 缓存一致性', () => {
  beforeEach(() => {
    useCustomModuleStore.setState({ modules: [], isLoading: false, error: null })
    for (const k of Object.keys(api)) api[k].mockReset()
  })

  it('loadModules 写入 modules', async () => {
    api.list.mockResolvedValue({ data: { modules: [mod('a'), mod('b')] } })
    await useCustomModuleStore.getState().loadModules()
    expect(useCustomModuleStore.getState().modules.map((m) => m.id)).toEqual(['a', 'b'])
  })

  it('createModule 追加到列表头部', async () => {
    useCustomModuleStore.setState({ modules: [mod('old') as any] })
    api.create.mockResolvedValue({ data: mod('new') })
    await useCustomModuleStore.getState().createModule({})
    expect(useCustomModuleStore.getState().modules.map((m) => m.id)).toEqual(['new', 'old'])
  })

  it('updateModule 用返回值替换缓存中的对应模块（保存后再编辑读到最新配置的关键）', async () => {
    useCustomModuleStore.setState({ modules: [mod('m1', { display_name: '旧' }) as any] })
    api.update.mockResolvedValue({ data: mod('m1', { display_name: '新' }) })
    await useCustomModuleStore.getState().updateModule('m1', { display_name: '新' })
    const m = useCustomModuleStore.getState().modules.find((x) => x.id === 'm1')
    expect(m?.display_name).toBe('新')
  })

  it('deleteModule 从缓存移除', async () => {
    useCustomModuleStore.setState({ modules: [mod('m1') as any, mod('m2') as any] })
    api.delete.mockResolvedValue({ data: { success: true } })
    const ok = await useCustomModuleStore.getState().deleteModule('m1')
    expect(ok).toBe(true)
    expect(useCustomModuleStore.getState().modules.map((m) => m.id)).toEqual(['m2'])
  })

  it('getModule 返回后端最新数据（不改动本地缓存）', async () => {
    useCustomModuleStore.setState({ modules: [mod('m1', { display_name: '旧' }) as any] })
    api.get.mockResolvedValue({ data: mod('m1', { display_name: '最新' }) })
    const fresh = await useCustomModuleStore.getState().getModule('m1')
    expect(fresh?.display_name).toBe('最新')
    // 本地缓存不被 getModule 改动
    expect(useCustomModuleStore.getState().modules[0].display_name).toBe('旧')
  })
})
