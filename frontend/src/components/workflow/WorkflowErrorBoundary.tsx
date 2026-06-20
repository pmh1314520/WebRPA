import React from 'react'
import { useWorkflowStore } from '@/store/workflowStore'
import { useAIAssistantStore } from '@/store/aiAssistantStore'
import { useGlobalConfigStore } from '@/store/globalConfigStore'
import { emitAssistantUiEvent } from '@/services/aiAssistantSkills'

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: string
  diagnosing: boolean
}

/**
 * 全局 Error Boundary
 *
 * 目的：任何子组件渲染/运行期抛错都不允许把 WebRPA 编辑器变成白屏，
 * 而是显示友好的错误页 + 「清空画布」「刷新页面」恢复按钮 + 「AI 诊断」。
 *
 * 经历过的事故：
 * - 旧工作流文件里某个节点没有 position 字段，react-flow 内部抛 TypeError 白屏。
 * - input_prompt 的 defaultValue 配成数字，inputValue.split 抛 TypeError 白屏。
 * 这类问题一律由本边界兜底，至少让用户看到报错而不是一片空白。
 */
export class WorkflowErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: '', diagnosing: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: '', diagnosing: false }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[WorkflowErrorBoundary] 渲染错误：', error, info)
    this.setState({ errorInfo: info.componentStack || '' })
  }

  handleClearCanvas = () => {
    try {
      useWorkflowStore.getState().clearWorkflow()
    } catch (e) {
      console.error('清空画布失败', e)
    }
    this.setState({ hasError: false, error: null, errorInfo: '', diagnosing: false })
  }

  handleReload = () => {
    window.location.reload()
  }

  /** 是否已配置 AI 小助手（决定是否显示「AI 诊断」按钮） */
  isAIConfigured = (): boolean => {
    try {
      const cfg = useGlobalConfigStore.getState().config
      const a = cfg?.aiAssistant
      const b = cfg?.ai
      const apiUrl = a?.apiUrl || b?.apiUrl || ''
      const model = a?.model || b?.model || ''
      return !!(apiUrl && model)
    } catch {
      return false
    }
  }

  buildDiagnosisPrompt = (): string => {
    const err = this.state.error
    const msg = err?.message || '未知错误'
    const stack = err?.stack || ''
    const comp = this.state.errorInfo || ''
    return [
      '【WebRPA 报错诊断请求】',
      'WebRPA 编辑器刚刚发生了一个运行期错误（已被全局错误边界拦截，未白屏）。请你作为 WebRPA 专家分析：',
      '1. 这是什么错误、为什么会发生、最可能出在哪一步/哪个模块或哪段代码；',
      '2. 用户现在可以怎么自救（如清空画布、修改某模块配置、留空某字段等）；',
      '3. 如果判断这是 WebRPA 源码层面的缺陷，请简要总结【错误原因】+【修复建议】，',
      '   并提醒用户把这段总结连同下面的报错信息发给开发者彭明航，帮助修复：',
      '   QQ：2124691573　微信：QyPmh20061026',
      '',
      '错误信息：',
      msg,
      '',
      '调用栈：',
      stack.slice(0, 2000),
      comp ? '\n组件栈：\n' + comp.slice(0, 1200) : '',
    ].join('\n')
  }

  handleAIDiagnose = () => {
    try {
      const prompt = this.buildDiagnosisPrompt()
      useAIAssistantStore.getState().setPanelOpen(true)
      // 复用面板已有的 ask_ai 事件：打开面板并自动发送诊断请求
      emitAssistantUiEvent('ask_ai', { prompt, autoSend: true })
      this.setState({ diagnosing: true })
    } catch (e) {
      console.error('发起 AI 诊断失败', e)
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children
    const err = this.state.error
    const aiReady = this.isAIConfigured()
    return (
      <div className="fixed inset-0 z-[2147483646] flex items-center justify-center bg-[hsl(var(--background))] p-8 overflow-auto">
        <div className="max-w-2xl w-full bg-[hsl(var(--card))] rounded-2xl p-8 border border-[hsl(var(--danger-500)/0.3)] shadow-pop-lg my-auto">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-[hsl(var(--danger-500)/0.12)] flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-[hsl(var(--danger-500))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-[hsl(var(--foreground))] mb-1">WebRPA 遇到了一个问题</h2>
              <p className="text-sm text-[hsl(var(--slate-600))] mb-4">
                已为你拦截这次错误（不会白屏）。通常是某个模块配置异常或工作流文件含损坏数据。
                可以点「清空画布」恢复使用，已保存的工作流不会受影响；也可以让 AI 小助手帮你诊断原因。
              </p>
              {err && (
                <details className="mb-4 text-xs" open>
                  <summary className="cursor-pointer text-[hsl(var(--slate-700))] hover:text-[hsl(var(--brand-600))]">
                    查看错误详情
                  </summary>
                  <pre className="mt-2 p-3 bg-[hsl(var(--slate-100))] rounded-md overflow-auto max-h-48 text-[hsl(var(--slate-800))]">
                    {err.message}
                    {err.stack ? '\n\n' + err.stack : ''}
                  </pre>
                </details>
              )}
              <div className="flex flex-wrap gap-2">
                {aiReady && (
                  <button
                    onClick={this.handleAIDiagnose}
                    disabled={this.state.diagnosing}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-[hsl(var(--brand-500))] to-[hsl(var(--info-500))] hover:opacity-90 text-white text-sm font-medium transition-opacity inline-flex items-center gap-1.5 disabled:opacity-60"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.5 6.5L22 12l-6.5 2.5L13 21l-2.5-6.5L4 12l6.5-2.5L13 3z" />
                    </svg>
                    {this.state.diagnosing ? 'AI 诊断已发起，请看右侧小助手' : 'AI 诊断这个错误'}
                  </button>
                )}
                <button
                  onClick={this.handleClearCanvas}
                  className="px-4 py-2 rounded-lg bg-[hsl(var(--brand-600))] hover:bg-[hsl(var(--brand-700))] text-white text-sm font-medium transition-colors"
                >
                  清空画布并继续
                </button>
                <button
                  onClick={this.handleReload}
                  className="px-4 py-2 rounded-lg bg-[hsl(var(--slate-100))] hover:bg-[hsl(var(--slate-200))] text-[hsl(var(--slate-800))] text-sm font-medium transition-colors"
                >
                  刷新页面
                </button>
              </div>
              <div className="mt-4 pt-3 border-t border-[hsl(var(--border))] text-[11.5px] text-[hsl(var(--muted-foreground))] leading-relaxed">
                若该问题反复出现，欢迎把上方报错信息反馈给开发者彭明航，帮助 WebRPA 变得更稳健：
                <span className="font-mono text-[hsl(var(--slate-700))]"> QQ 2124691573 · 微信 QyPmh20061026</span>
                {!aiReady && (
                  <span className="block mt-1">（在「全局配置 → 小助手」中配置 API Key 后，这里会出现「AI 诊断」按钮，可自动分析报错原因）</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
