import { useEffect } from 'react'
import { AIAssistantPanel } from '@/components/ai-assistant/AIAssistantPanel'
import { InputPromptDialog } from '@/components/workflow/InputPromptDialog'
import { WorkflowErrorBoundary } from '@/components/workflow/WorkflowErrorBoundary'
import { socketService } from '@/services/socket'
import { updateApiBase } from '@/services/api'
import { preloadConfig } from '@/services/config'
import { useAIAssistantStore } from '@/store/aiAssistantStore'
import { setupAgentWindowBehaviors } from '@/lib/tauriAgentWindow'

/**
 * 小助手独立进程窗口（系统级 Agent 模式）
 * 通过 URL `?view=assistant` 进入。只挂载小助手本体 + 输入弹窗，不加载编辑器画布，
 * 复用全部后端技能（系统控制/文件/脚本/插件/截图/运行工作流等），可当作系统级 Agent 使用。
 */
export function AssistantWindow() {
  useEffect(() => {
    document.title = 'WebRPA 小助手 · Agent'
    // 强制小助手为打开态，使其内部各 useEffect（会话加载/滚动等）正常工作
    try { useAIAssistantStore.getState().setPanelOpen(true) } catch { /* ignore */ }
    const init = async () => {
      try {
        await preloadConfig()
        updateApiBase()
        socketService.connect()
      } catch (e) {
        console.error('[AssistantWindow] 初始化失败:', e)
      }
    }
    init()
    // 原生窗口（Tauri）：启用置顶/拖动/贴边自动隐藏等系统级行为（非 Tauri 环境自动跳过）
    setupAgentWindowBehaviors()
    return () => {
      try { socketService.disconnect() } catch { /* ignore */ }
    }
  }, [])

  return (
    <div className="h-screen w-screen overflow-hidden bg-background">
      <WorkflowErrorBoundary>
        <AIAssistantPanel standalone />
        {/* 运行工作流/需要用户输入时仍能弹窗交互 */}
        <InputPromptDialog />
      </WorkflowErrorBoundary>
    </div>
  )
}

export default AssistantWindow
