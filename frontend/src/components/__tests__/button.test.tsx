import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Button } from '@/components/ui/button'

// React act 测试环境标记（React 19 在测试中调用 act 需要此全局）
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

describe('Button 组件渲染（jsdom）', () => {
  it('渲染子文本，默认非禁用', () => {
    act(() => {
      root.render(<Button>提交</Button>)
    })
    const btn = container.querySelector('button')
    expect(btn).not.toBeNull()
    expect(btn!.textContent).toContain('提交')
    expect(btn!.disabled).toBe(false)
  })

  it('loading 时禁用并渲染加载指示', () => {
    act(() => {
      root.render(<Button loading>保存</Button>)
    })
    const btn = container.querySelector('button')!
    expect(btn.disabled).toBe(true)
    expect(container.querySelector('span[aria-hidden="true"]')).not.toBeNull()
  })

  it('点击触发 onClick 回调', () => {
    const onClick = vi.fn()
    act(() => {
      root.render(<Button onClick={onClick}>点我</Button>)
    })
    const btn = container.querySelector('button')!
    act(() => {
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('应用 variant/size 对应的样式类', () => {
    act(() => {
      root.render(
        <Button variant="destructive" size="lg">
          删除
        </Button>,
      )
    })
    const btn = container.querySelector('button')!
    // destructive 变体含 danger 色板类，lg 尺寸含高度类
    expect(btn.className).toContain('danger')
    expect(btn.className).toContain('h-10')
  })
})
