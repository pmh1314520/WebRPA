import { useEffect, useState } from 'react'
import { WorkflowEditor } from '@/components/workflow/WorkflowEditor'
import { WorkflowErrorBoundary } from '@/components/workflow/WorkflowErrorBoundary'
import { InputPromptDialog } from '@/components/workflow/InputPromptDialog'
import { MusicPlayerContainer } from '@/components/workflow/MusicPlayerContainer'
import { VideoPlayerContainer } from '@/components/workflow/VideoPlayerContainer'
import { ImageViewerContainer } from '@/components/workflow/ImageViewerContainer'
import { UpdateDialog } from '@/components/workflow/UpdateDialog'
import { MouseCoordinateOverlay } from '@/components/workflow/MouseCoordinateOverlay'
import { AIAssistantPanel } from '@/components/ai-assistant/AIAssistantPanel'
import { AIAssistantButton } from '@/components/ai-assistant/AIAssistantButton'
import { socketService } from '@/services/socket'
import { remoteService } from '@/services/remote'
import { dataAssetApi, imageAssetApi, updateApiBase } from '@/services/api'
import { preloadConfig } from '@/services/config'
import { useWorkflowStore } from '@/store/workflowStore'
import { useGlobalConfigStore } from '@/store/globalConfigStore'
import { useAIAssistantStore } from '@/store/aiAssistantStore'
import { useLayoutStore } from '@/store/layoutStore'
import {
  CURRENT_VERSION,
  fetchLatestVersion,
  hasNewVersion,
} from '@/services/version'

// 在模块加载时立即预加载配置
preloadConfig().then(() => {
  console.log('[Config] 配置预加载完成')
})

function App() {
  const setDataAssets = useWorkflowStore((state) => state.setDataAssets)
  const setImageAssets = useWorkflowStore((state) => state.setImageAssets)
  const globalConfig = useGlobalConfigStore((state) => state.config)

  // AI 助手面板打开时，编辑器整体左移，避免遮挡右侧配置面板
  const aiPanelOpen = useAIAssistantStore((s) => s.isPanelOpen)
  const aiPanelWidth = useLayoutStore((s) => s.aiAssistantWidth)
  
  const [updateInfo, setUpdateInfo] = useState<{
    show: boolean
    latestVersion: string
    downloadUrl: string
  }>({
    show: false,
    latestVersion: '',
    downloadUrl: '',
  })

  // 初始化：获取配置并加载已上传的Excel文件资源和图像资源
  useEffect(() => {
    const init = async () => {
      try {
        // 1. 确保配置已加载
        await preloadConfig()
        
        // 2. 更新 API 基础地址
        updateApiBase()
        
        // 3. 配置更新完成后，连接 WebSocket（Socket会在连接时动态获取最新的后端地址）
        socketService.connect()
        
        // 4. 加载Excel资源
        const excelResult = await dataAssetApi.list()
        if (excelResult.data) {
          setDataAssets(excelResult.data)
        }
        
        // 5. 加载图像资源
        const imageResult = await imageAssetApi.list()
        if (imageResult.data) {
          setImageAssets(imageResult.data)
        }
      } catch (error) {
        console.error('初始化失败:', error)
      }
    }
    
    init()
    
    // 清理函数
    return () => {
      socketService.disconnect()
    }
  }, [setDataAssets, setImageAssets])

  // 拦截 F9 和 F10 快捷键，防止浏览器默认行为
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F9 和 F10 是 WebRPA 的快捷键，阻止浏览器默认行为
      if (e.key === 'F9' || e.key === 'F10') {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    
    // 使用 capture 阶段拦截，确保在其他处理器之前执行
    window.addEventListener('keydown', handleKeyDown, { capture: true })
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true })
    }
  }, [])

  // 页面关闭时清理远程协助会话
  useEffect(() => {
    const handleBeforeUnload = () => {
      const session = remoteService.getSession()
      if (session) {
        // 使用 sendBeacon 确保请求能发出
        const hubUrl = localStorage.getItem('workflow_hub_url') || 'https://hub.pmhs.top'
        const clientId = localStorage.getItem('workflow_hub_client_id')
        if (clientId) {
          navigator.sendBeacon(
            `${hubUrl}/api/remote/close`,
            JSON.stringify({ clientId })
          )
        }
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      // 组件卸载时清理远程协助
      remoteService.closeSession()
    }
  }, [])

  // 检查版本更新
  useEffect(() => {
    // 如果配置中关闭了启动时检查更新，则不执行检查
    if (!globalConfig.system.checkUpdateOnStartup) {
      return
    }

    const checkUpdate = async () => {
      const versionInfo = await fetchLatestVersion()
      if (!versionInfo) return

      // 检查是否有新版本
      if (hasNewVersion(CURRENT_VERSION, versionInfo.version)) {
        setUpdateInfo({
          show: true,
          latestVersion: versionInfo.version,
          downloadUrl: versionInfo.downloadUrl,
        })
      }
    }

    // 延迟 1 秒检查，避免影响首屏加载
    const timer = setTimeout(checkUpdate, 1000)
    return () => clearTimeout(timer)
  }, [globalConfig.system.checkUpdateOnStartup])

  // 处理 URL 中的自动加载参数 (例如: /editor/xxxxx 或者 /?workflow=xxxxx)
  useEffect(() => {
    // 监听后端执行完毕的事件，如果是在监控模式下，自动关闭窗口
    const handleExecutionCompleted = () => {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('auto_close') === 'true') {
        console.log('[AutoClose] 执行完成，正在自动关闭监控页面...');
        // 延迟一小会儿，让用户能看到最终状态
        setTimeout(() => {
          // 现代浏览器对于非 JS 打开的窗口（或者即便是 JS 打开但有些安全策略）可能拦截 window.close()
          // 我们可以尝试替换页面内容作为备选方案
          document.body.innerHTML = '<div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;background:#f5f5f5;">' +
            '<h2 style="color:#4caf50;margin-bottom:10px;">计划任务执行完毕</h2>' +
            '<p style="color:#666;">您可以安全地关闭此页面，或者它将在几秒后尝试自动关闭。</p>' +
            '</div>';
          
          setTimeout(() => {
            window.close();
          }, 1000);
        }, 3000);
      }
    };

    socketService.on('execution:completed', handleExecutionCompleted);

    // 等待初始化完成（通过检查是否有数据等或简单的延迟）
    const timer = setTimeout(() => {
      // 尝试从 URL 参数或路径中获取 workflow ID
      const urlParams = new URLSearchParams(window.location.search);
      let workflowId = urlParams.get('workflow');
      
      if (!workflowId) {
        // 支持 /editor/xxx 甚至带有查询参数的情况
        const path = window.location.pathname;
        const match = path.match(/\/editor\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
          workflowId = match[1];
        }
      }

      if (workflowId) {
        // 通过本地工作流 API 加载工作流文件，再调用 store 的 loadWorkflow
        (async () => {
          try {
            const { localWorkflowApi } = await import('@/services/api')
            // 尝试在默认文件夹下加载（filename 兼容带不带 .json）
            const filename = workflowId!.endsWith('.json') ? workflowId! : `${workflowId}.json`
            const res = await localWorkflowApi.get(filename) as { success?: boolean; data?: { content?: any }; error?: string }
            const content = res?.data?.content
            if (!content) {
              console.error('[AutoLoad] 加载工作流失败:', res?.error || '未找到内容')
              return
            }
            const store = useWorkflowStore.getState()
            store.loadWorkflow({
              nodes: content.nodes || [],
              edges: content.edges || [],
              name: content.name || '未命名工作流',
            })
            console.log(`[AutoLoad] 成功从 URL 加载工作流: ${workflowId}`)
            // 通知后端我们当前所在的工作流，这样日志和事件才能正确推送过来
            socketService.setCurrentWorkflow(workflowId!)
          } catch (err) {
            console.error('[AutoLoad] 从 URL 加载工作流失败:', err)
          }
        })()
      }
    }, 1000); // 缩短延迟，尽快加载

    return () => {
      clearTimeout(timer);
      socketService.off('execution:completed', handleExecutionCompleted);
    };
  }, []);

  const handleCloseUpdate = () => {
    setUpdateInfo(prev => ({ ...prev, show: false }))
  }

  const handleSkipUpdate = () => {
    setUpdateInfo(prev => ({ ...prev, show: false }))
  }

  // 用户自定义快捷键：匹配组合键后触发对应功能（纯附加，不影响内置快捷键）
  const customShortcuts = useGlobalConfigStore((state) => state.config.shortcuts)
  useEffect(() => {
    const map = customShortcuts || {}
    if (Object.keys(map).length === 0) return
    const comboToAction: Record<string, string> = {}
    for (const [actionId, combo] of Object.entries(map)) {
      if (combo) comboToAction[combo] = actionId
    }
    const handler = async (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      const { eventToCombo, SHORTCUT_ACTION_MAP } = await import('@/lib/customShortcuts')
      const combo = eventToCombo(e)
      if (!combo) return
      const actionId = comboToAction[combo]
      if (!actionId) return
      const action = SHORTCUT_ACTION_MAP[actionId]
      if (action) {
        e.preventDefault()
        action.run()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [customShortcuts])

  // 将自定义快捷键注册为「系统级全局热键」：聚焦其它软件时也能触发（与内置 F5 等一致）
  useEffect(() => {
    const map = customShortcuts || {}
    const push = () => {
      import('@/services/api').then(({ systemApi }) => {
        systemApi.setCustomHotkeys(map).catch(() => {})
      }).catch(() => {})
    }
    push()
    // socket 重连后（如后端重启）重新下发，确保热键恢复
    const onReconnect = () => push()
    window.addEventListener('socket:reconnected', onReconnect)
    return () => window.removeEventListener('socket:reconnected', onReconnect)
  }, [customShortcuts])

  // 接收后端全局热键触发事件，执行对应功能（即便 WebRPA 未聚焦也能触发）
  useEffect(() => {
    const handler = async (e: Event) => {
      const actionId = (e as CustomEvent).detail?.actionId
      if (!actionId) return
      const { SHORTCUT_ACTION_MAP } = await import('@/lib/customShortcuts')
      const action = SHORTCUT_ACTION_MAP[actionId]
      if (action) action.run()
    }
    window.addEventListener('hotkey:custom_action', handler)
    return () => window.removeEventListener('hotkey:custom_action', handler)
  }, [])

  return (
    <div className="h-screen w-screen overflow-hidden bg-background">
      <WorkflowErrorBoundary>
        <div
          className="h-full w-full"
          style={{
            paddingRight: aiPanelOpen ? aiPanelWidth : 0,
            transition: 'padding-right 200ms cubic-bezier(0.25, 1, 0.5, 1)',
          }}
        >
          <WorkflowEditor />
        </div>
        <InputPromptDialog />
        <MusicPlayerContainer />
        <VideoPlayerContainer />
        <ImageViewerContainer />
        <UpdateDialog
          isOpen={updateInfo.show}
          currentVersion={CURRENT_VERSION}
          latestVersion={updateInfo.latestVersion}
          downloadUrl={updateInfo.downloadUrl}
          onClose={handleCloseUpdate}
          onSkip={handleSkipUpdate}
        />
        <MouseCoordinateOverlay />
      </WorkflowErrorBoundary>
      {/* AI 小助手放在错误边界之外：即使编辑器崩溃，也能用它来诊断错误 */}
      <AIAssistantPanel />
      <AIAssistantButton />
    </div>
  )
}

export default App
