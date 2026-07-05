/**
 * 安全 Markdown 渲染：marked 解析 + DOMPurify 消毒。
 *
 * 背景：marked 默认会放行 markdown 中的原始 HTML（含 <script>、onerror 等），
 * 若把其输出直接塞进 dangerouslySetInnerHTML，AI 回复/工具结果里的恶意内容
 * （如提示词注入诱导模型输出 <img src=x onerror=...>）就会在前端执行，
 * 而前端可调用能执行系统命令的后端，危害被放大。故所有走 innerHTML 的 markdown
 * 都必须先经此函数消毒。
 */
import { marked } from 'marked'
import DOMPurify from 'dompurify'

// 与 MessageBubble 一致的 marked 配置（GFM：表格/任务列表/删除线/换行）
marked.setOptions({ gfm: true, breaks: true })

// 纯文本兜底转义（marked 解析异常时使用）
function escapeText(s: string): string {
  return s.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c
  ))
}

/**
 * 把 markdown 文本渲染为“已消毒”的安全 HTML 字符串。
 * DOMPurify 会移除 <script>/<iframe>/<object> 等危险标签及所有 on* 事件属性、
 * javascript: 协议等，保留常规排版标签（标题/列表/表格/代码/链接/图片等）。
 */
export function renderSafeMarkdown(content: string): string {
  let raw: string
  try {
    raw = marked.parse(content ?? '') as string
  } catch {
    return escapeText(content ?? '')
  }
  return DOMPurify.sanitize(raw, {
    USE_PROFILES: { html: true },
    // 外链在新标签打开且带 noopener，避免反向 tabnabbing
    ADD_ATTR: ['target', 'rel'],
    FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['style'],
  })
}
