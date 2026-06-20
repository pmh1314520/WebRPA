/**
 * 用户自定义快捷键
 *
 * 设计：用户可为一组"常用功能"绑定自己的组合键（如 Ctrl+Alt+R 运行）。
 * 触发时通过已有的事件总线/Store 调用对应功能，不替换、不干扰内置快捷键，纯附加。
 * 绑定持久化在 globalConfig.shortcuts（{ actionId: combo }）。
 */
import { emitAssistantUiEvent } from '@/services/aiAssistantSkills'
import { useAIAssistantStore } from '@/store/aiAssistantStore'

export interface ShortcutAction {
  id: string
  label: string
  run: () => void
}

// 可被用户绑定的功能（通过已有事件触发，确保与内置逻辑一致）
export const SHORTCUT_ACTIONS: ShortcutAction[] = [
  { id: 'run_workflow', label: '运行工作流（有头）', run: () => emitAssistantUiEvent('run_workflow', { headless: false }) },
  { id: 'run_workflow_headless', label: '运行工作流（无头）', run: () => emitAssistantUiEvent('run_workflow', { headless: true }) },
  { id: 'stop_workflow', label: '停止运行', run: () => emitAssistantUiEvent('stop_workflow', {}) },
  { id: 'save_workflow', label: '保存工作流', run: () => emitAssistantUiEvent('save_workflow', {}) },
  { id: 'new_workflow', label: '新建工作流', run: () => emitAssistantUiEvent('new_workflow', {}) },
  { id: 'open_local_workflow', label: '打开本地工作流', run: () => emitAssistantUiEvent('open_local_workflow', {}) },
  { id: 'open_module_search', label: '画布模块搜索', run: () => emitAssistantUiEvent('open_module_search', {}) },
  { id: 'open_scheduled_tasks', label: '打开计划任务', run: () => emitAssistantUiEvent('open_scheduled_tasks', {}) },
  { id: 'toggle_ai', label: '打开/关闭小助手', run: () => useAIAssistantStore.getState().togglePanel() },
  { id: 'export_workflow', label: '导出工作流', run: () => emitAssistantUiEvent('export_workflow', { format: 'json' }) },
]

export const SHORTCUT_ACTION_MAP: Record<string, ShortcutAction> = Object.fromEntries(
  SHORTCUT_ACTIONS.map((a) => [a.id, a])
)

/** 把一次键盘事件规范化为组合键字符串，如 "Ctrl+Alt+R" */
export function eventToCombo(e: KeyboardEvent): string {
  const parts: string[] = []
  if (e.ctrlKey) parts.push('Ctrl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  if (e.metaKey) parts.push('Meta')
  let key = e.key
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(key)) return '' // 仅修饰键不算
  if (key === ' ') key = 'Space'
  else if (key.length === 1) key = key.toUpperCase()
  parts.push(key)
  return parts.join('+')
}
