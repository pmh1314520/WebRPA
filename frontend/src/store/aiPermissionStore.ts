import { create } from 'zustand'
import { useGlobalConfigStore } from './globalConfigStore'

/**
 * AI 小助手操作权限（仿 Codex 三档，名称做了区分避免雷同）：
 * - approval（逐项确认）：只要 AI 实实在在要操作 WebRPA / 电脑，就在聊天上方弹授权，用户允许才执行
 * - smart（智能放行）：只有检测到「高风险操作」时才请求确认，其余自动放行
 * - full（自由执行）：完全不拦，AI 不受限操作一切
 *
 * 重点：用户「拒绝」不等于让 AI 停止任务——会把"用户拒绝"作为该步结果返回给 AI，AI 继续后续回复。
 */

// 高风险 client_action（smart 模式下也要确认）：删除/清空/重置/运行/回档等不可轻易撤销的操作
export const HIGH_RISK_ACTIONS = new Set<string>([
  'delete_node', 'delete_nodes', 'new_workflow', 'load_workflow_from_data',
  'delete_local_workflow', 'save_local_workflow', 'save_workflow_to_folder',
  'delete_scheduled_task', 'create_scheduled_task', 'update_scheduled_task', 'execute_scheduled_task',
  'restore_version', 'reset_global_config', 'update_global_config',
  'clear_data', 'clear_logs', 'clear_variables', 'delete_variable',
  'run_workflow', 'run_workflow_headless', 'delete_data_asset', 'delete_image_asset',
  'hub_publish_workflow', 'hub_delete_my_workflow',
])

// 只读 / 纯查询类 client_action：任何模式都不需要授权
export const READONLY_ACTIONS = new Set<string>([
  'get_workflow_detail', 'get_logs', 'get_collected_data', 'list_variables', 'get_variable',
  'find_nodes_by_type', 'list_open_dialogs', 'get_global_config', 'list_versions',
  'get_local_workflow_content', 'list_local_workflows', 'get_local_workflow_default_folder',
  'list_data_assets', 'list_image_assets', 'preview_data_asset', 'get_data_asset_sheets',
  'list_scheduled_tasks_full', 'get_scheduled_task_detail', 'get_scheduled_task_logs',
  'get_scheduled_task_statistics', 'get_node_runtime_errors', 'fit_view', 'focus_node',
  'hub_list_workflows', 'hub_get_categories', 'hub_get_my_workflows',
  // 纯 UI 开关（打开/关闭面板）不算"操作"，不打扰用户
  'open_global_config', 'close_global_config', 'open_local_workflow_dialog', 'close_local_workflow_dialog',
  'open_scheduled_tasks', 'close_scheduled_tasks', 'open_documentation', 'close_documentation',
  'open_workflow_hub', 'close_workflow_hub', 'open_auto_browser', 'close_auto_browser',
  'open_phone_mirror', 'close_phone_mirror', 'open_variable_tracking', 'close_variable_tracking',
  'open_screensaver', 'close_screensaver', 'open_export_dialog', 'open_module_search',
  'switch_bottom_panel', 'show_toast', 'select_all_nodes', 'clear_selection',
])

export interface PendingApproval {
  id: string
  action: string
  label: string
  payloadPreview: string
  resolve: (approved: boolean) => void
}

interface AIPermissionState {
  pending: PendingApproval | null
  setPending: (p: PendingApproval | null) => void
}

export const useAIPermissionStore = create<AIPermissionState>((set) => ({
  pending: null,
  setPending: (p) => set({ pending: p }),
}))

/** 判断某个 client_action 在当前权限模式下是否需要用户授权 */
export function actionNeedsApproval(action: string): boolean {
  const mode = useGlobalConfigStore.getState().config.aiAssistant?.permissionMode || 'smart'
  if (mode === 'full') return false
  if (READONLY_ACTIONS.has(action)) return false
  if (mode === 'approval') return true            // 逐项确认：任何"真操作"都要授权
  return HIGH_RISK_ACTIONS.has(action)            // smart：仅高风险
}

/** 弹出授权请求并等待用户决定（允许 true / 拒绝 false） */
export function requestApproval(action: string, label: string, payload: unknown): Promise<boolean> {
  let preview = ''
  try {
    preview = payload ? JSON.stringify(payload).slice(0, 160) : ''
  } catch { preview = '' }
  return new Promise<boolean>((resolve) => {
    useAIPermissionStore.getState().setPending({
      id: `${action}-${Date.now()}`,
      action,
      label,
      payloadPreview: preview,
      resolve: (approved) => {
        useAIPermissionStore.getState().setPending(null)
        resolve(approved)
      },
    })
  })
}
