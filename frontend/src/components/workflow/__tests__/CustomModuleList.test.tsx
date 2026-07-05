import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { CustomModuleList } from '@/components/workflow/CustomModuleList'
import { useCustomModuleStore } from '@/store/customModuleStore'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root

function makeModule(id: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    name: id,
    display_name: id,
    description: '',
    category: '',
    parameters: [],
    outputs: [],
    usage_count: 0,
    is_favorite: false,
    sort_order: 0,
    created_at: new Date().toISOString(),
    icon: '',
    color: '#8B5CF6',
    tags: [],
    workflow: { nodes: [], edges: [] },
    ...extra,
  }
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  useCustomModuleStore.setState({ modules: [], isLoading: false, error: null })
})

afterEach(() => {
  act(() => { root.unmount() })
  container.remove()
  // 清理可能残留的弹窗 portal
  document.body.querySelectorAll('[role="dialog"]').forEach((n) => n.remove())
})

const noop = () => {}

describe('CustomModuleList 渲染与交互', () => {
  it('渲染模块列表项（显示名）', () => {
    useCustomModuleStore.setState({ modules: [makeModule('mod_alpha', { display_name: '登录模块' }) as any] })
    act(() => {
      root.render(<CustomModuleList onCreateNew={noop} onManage={noop} onDragStart={noop} />)
    })
    expect(container.textContent).toContain('登录模块')
  })

  it('无模块时显示空状态', () => {
    act(() => {
      root.render(<CustomModuleList onCreateNew={noop} onManage={noop} onDragStart={noop} />)
    })
    expect(container.textContent).toContain('还没有自定义模块')
  })

  it('点击删除弹出自定义确认弹窗（非浏览器原生 confirm）', () => {
    useCustomModuleStore.setState({ modules: [makeModule('mod_del', { display_name: '待删模块' }) as any] })
    // 确保不会误触发原生 confirm
    const nativeConfirm = vi.spyOn(window, 'confirm')
    act(() => {
      root.render(<CustomModuleList onCreateNew={noop} onManage={noop} onDragStart={noop} />)
    })
    const delBtn = Array.from(container.querySelectorAll('button')).find((b) => b.title === '删除')
    expect(delBtn).toBeDefined()
    act(() => { delBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
    // 自定义确认弹窗（role=dialog/alertdialog）出现，并含删除提示文案
    const dlg = document.body.querySelector('[role="dialog"], [role="alertdialog"]')
    expect(dlg).not.toBeNull()
    expect(document.body.textContent).toContain('删除自定义模块')
    // 没有使用浏览器原生 confirm
    expect(nativeConfirm).not.toHaveBeenCalled()
    nativeConfirm.mockRestore()
  })
})
