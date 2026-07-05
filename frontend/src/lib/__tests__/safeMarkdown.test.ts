import { describe, it, expect } from 'vitest'
import { renderSafeMarkdown } from '@/lib/safeMarkdown'

describe('renderSafeMarkdown（XSS 消毒）', () => {
  it('移除 <script> 标签', () => {
    const html = renderSafeMarkdown('hello <script>alert(1)</script> world')
    expect(html.toLowerCase()).not.toContain('<script')
    expect(html).toContain('hello')
    expect(html).toContain('world')
  })

  it('移除 img 的 onerror 事件属性', () => {
    const html = renderSafeMarkdown('<img src=x onerror="alert(1)">')
    expect(html.toLowerCase()).not.toContain('onerror')
  })

  it('中和 javascript: 链接协议', () => {
    const html = renderSafeMarkdown('[click](javascript:alert(1))')
    expect(html.toLowerCase()).not.toContain('javascript:')
  })

  it('移除内联 style / iframe', () => {
    const html = renderSafeMarkdown('<iframe src="evil"></iframe><p style="x">t</p>')
    expect(html.toLowerCase()).not.toContain('<iframe')
    expect(html.toLowerCase()).not.toContain('style=')
  })

  it('保留常规 markdown 格式（加粗/代码/标题）', () => {
    const html = renderSafeMarkdown('# 标题\n\n**bold** and `code`')
    expect(html).toContain('<strong>')
    expect(html).toContain('bold')
    expect(html).toContain('<code>')
    expect(html).toContain('code')
    expect(html).toContain('标题')
  })

  it('保留普通链接文本', () => {
    const html = renderSafeMarkdown('[WebRPA](https://example.com)')
    expect(html).toContain('WebRPA')
    expect(html).toContain('example.com')
  })

  it('空输入不抛错', () => {
    expect(() => renderSafeMarkdown('')).not.toThrow()
    expect(() => renderSafeMarkdown(undefined as unknown as string)).not.toThrow()
  })
})
