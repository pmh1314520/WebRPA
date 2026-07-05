import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MessageBubble, getToolDisplayLabel } from '@/components/ai-assistant/MessageBubble'
import type { ChatMessage, ToolCall } from '@/store/aiAssistantStore'

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

function render(el: React.ReactElement) {
  act(() => { root.render(el) })
}

function findButtonByText(text: string): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes(text)) as HTMLButtonElement | undefined
}

describe('getToolDisplayLabel（工具名中文化）', () => {
  it('client_action 映射为动作中文名', () => {
    const tc: ToolCall = { id: '1', name: 'client_action', arguments: { action: 'run_workflow' }, status: 'success' }
    expect(getToolDisplayLabel(tc)).toContain('运行工作流')
  })

  it('普通工具名映射', () => {
    const tc: ToolCall = { id: '2', name: 'build_workflow', arguments: { name: '登录流程' }, status: 'success' }
    const label = getToolDisplayLabel(tc)
    expect(label).toContain('设计工作流')
  })

  it('MCP 工具名解析出服务器名', () => {
    const tc: ToolCall = { id: '3', name: 'mcp__myserver__do_thing', arguments: {}, status: 'pending' }
    expect(getToolDisplayLabel(tc)).toContain('myserver')
  })
})

describe('MessageBubble 渲染', () => {
  it('tool 角色消息不渲染', () => {
    render(<MessageBubble message={{ id: 't', role: 'tool', content: 'x' } as ChatMessage} />)
    expect(container.textContent).toBe('')
  })

  it('用户消息渲染纯文本内容', () => {
    render(<MessageBubble message={{ id: 'u', role: 'user', content: '帮我打开网页' } as ChatMessage} />)
    expect(container.textContent).toContain('帮我打开网页')
  })

  it('助手 Markdown 渲染并消毒（不含 script）', () => {
    const message: ChatMessage = {
      id: 'a', role: 'assistant',
      content: '**加粗**内容 <script>alert(1)</script>',
    }
    render(<MessageBubble message={message} />)
    expect(container.querySelector('strong')).not.toBeNull()
    expect(container.innerHTML.toLowerCase()).not.toContain('<script')
  })

  it('渲染工具调用卡片（含中文标签）', () => {
    const message: ChatMessage = {
      id: 'a', role: 'assistant', content: '',
      tool_calls: [{ id: 'tc1', name: 'build_workflow', arguments: { name: 'x' }, status: 'success' }],
    }
    render(<MessageBubble message={message} />)
    expect(container.textContent).toContain('设计工作流')
  })
})

describe('MessageBubble 用户消息操作按钮', () => {
  it('canRollback 时渲染回滚按钮并可点击', () => {
    const onRollback = vi.fn()
    render(
      <MessageBubble
        message={{ id: 'u', role: 'user', content: '发送过的消息' } as ChatMessage}
        canRollback
        onRollback={onRollback}
      />,
    )
    const btn = findButtonByText('回滚')
    expect(btn).toBeDefined()
    act(() => { btn!.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
    expect(onRollback).toHaveBeenCalledTimes(1)
  })

  it('无 canRollback 时不渲染回滚按钮', () => {
    render(
      <MessageBubble
        message={{ id: 'u', role: 'user', content: '消息' } as ChatMessage}
        onRollback={() => {}}
        canRollback={false}
      />,
    )
    expect(findButtonByText('回滚')).toBeUndefined()
  })

  it('编辑/重发按钮触发对应回调', () => {
    const onEdit = vi.fn()
    const onResend = vi.fn()
    render(
      <MessageBubble
        message={{ id: 'u', role: 'user', content: '原始文本' } as ChatMessage}
        onEdit={onEdit}
        onResend={onResend}
      />,
    )
    act(() => { findButtonByText('编辑')!.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
    act(() => { findButtonByText('重发')!.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
    expect(onEdit).toHaveBeenCalledWith('原始文本')
    expect(onResend).toHaveBeenCalledWith('原始文本')
  })
})
