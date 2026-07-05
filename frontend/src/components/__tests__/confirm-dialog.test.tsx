import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => { root.unmount() })
  container.remove()
})

function pressEscape() {
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })
}

describe('ConfirmDialog 无障碍与键盘交互（jsdom）', () => {
  it('打开时渲染 role=dialog + aria-modal', () => {
    act(() => {
      root.render(<ConfirmDialog isOpen message="确认吗？" onConfirm={() => {}} onCancel={() => {}} />)
    })
    const dlg = document.body.querySelector('[role="dialog"]')
    expect(dlg).not.toBeNull()
    expect(dlg!.getAttribute('aria-modal')).toBe('true')
  })

  it('alert 类型使用 role=alertdialog', () => {
    act(() => {
      root.render(<ConfirmDialog isOpen type="alert" message="提示" onConfirm={() => {}} />)
    })
    expect(document.body.querySelector('[role="alertdialog"]')).not.toBeNull()
  })

  it('Esc 触发 onCancel（confirm 类型）', () => {
    const onCancel = vi.fn()
    act(() => {
      root.render(<ConfirmDialog isOpen message="确认吗？" onConfirm={() => {}} onCancel={onCancel} />)
    })
    pressEscape()
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('Esc 触发 onConfirm（alert 类型，无取消）', () => {
    const onConfirm = vi.fn()
    act(() => {
      root.render(<ConfirmDialog isOpen type="alert" message="提示" onConfirm={onConfirm} />)
    })
    pressEscape()
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('isOpen=false 时不渲染任何弹窗', () => {
    act(() => {
      root.render(<ConfirmDialog isOpen={false} message="x" onConfirm={() => {}} />)
    })
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
    expect(document.body.querySelector('[role="alertdialog"]')).toBeNull()
  })
})
