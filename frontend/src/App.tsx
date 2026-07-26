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

/**
 * 计划任务监控页数据补齐
 *
 * 实时日志走 socket 广播且不补发历史，监控页从"浏览器打开→页面加载→socket 连上"
 * 有数秒延迟，短工作流往往在这之前就跑完了，底栏于是一片空白；事后手动打开更是
 * 什么都看不到。这里按 task_id 拉取后端已持久化的本次执行日志，并拉取后端执行期间
 * 产生的变量，把它们灌进底栏，使监控页无论何时打开都能看到本次执行的结果。
 */
async function hydrateMonitorPage(taskId: string): Promise<'running' | 'done'> {
  const store = useWorkflowStore.getState()

  // 1) 补齐执行日志（取该任务最近一次执行记录里的完整工作流日志）
  try {
    const { scheduledTaskApi } = await import('@/services/api')
    const res = await scheduledTaskApi.getTaskLogs(taskId, 1) as {
      data?: Array<{
        status?: string
        error?: string
        start_time?: string
        executed_nodes?: number
        failed_nodes?: number
        workflow_logs?: Array<{ level?: string; message?: string; nodeId?: string; duration?: number }>
      }>
    }
    const latest = (res?.data || [])[0]
    if (latest) {
      const logs = latest.workflow_logs || []
      if (logs.length > 0) {
        store.addLogBatch(logs.map((l) => ({
          level: (l.level as 'info' | 'warning' | 'error' | 'success' | 'debug') || 'info',
          message: l.message || '',
          nodeId: l.nodeId || undefined,
          duration: l.duration ?? undefined,
        })))
      }
      // 汇总一行，便于一眼看到本次执行结果（即使逐条日志为空也有反馈）。
      // 必须区分三态：监控页是在任务「刚开始执行」时被打开的，这时取到的记录
      // status 还是 running（模块数为 0、日志尚未写入），绝不能把它报成"失败"。
      const status = latest.status || ''
      if (status === 'running') {
        store.addLog({
          level: 'info',
          message: '计划任务正在执行中，执行完成后会自动补齐完整日志…',
        })
        return 'running'
      }
      const ok = status === 'success'
      store.addLog({
        level: ok ? 'success' : 'error',
        message: `计划任务本次执行：${ok ? '成功' : '失败'}`
          + `（模块 ${latest.executed_nodes ?? 0} 个，失败 ${latest.failed_nodes ?? 0} 个`
          + `${latest.start_time ? `，开始于 ${latest.start_time}` : ''}）`
          + (latest.error ? `\n错误：${latest.error}` : ''),
      })
    }
  } catch (e) {
    console.warn('[MonitorPage] 拉取计划任务执行日志失败:', e)
  }

  // 2) 补齐后端执行期间产生的变量（后端 global_variables 与前端底栏变量本是两套，
  //    不会自动同步；这里显式同步过来，便于核对运行结果）
  try {
    const { workflowApi } = await import('@/services/api')
    const res = await workflowApi.getGlobalVariables() as {
      data?: { variables?: Record<string, unknown> }
    }
    const vars = res?.data?.variables || {}
    const existing = new Set(useWorkflowStore.getState().variables.map((v) => v.name))
    let synced = 0
    for (const [name, value] of Object.entries(vars)) {
      if (!name) continue
      if (existing.has(name)) {
        useWorkflowStore.getState().updateVariable(name, value)
      } else {
        useWorkflowStore.getState().addVariable({
          name,
          value,
          // VariableType 只有 string/number/boolean/array/object 五种
          type: Array.isArray(value) ? 'array'
            : typeof value === 'number' ? 'number'
            : typeof value === 'boolean' ? 'boolean'
            : typeof value === 'object' && value !== null ? 'object'
            : 'string',
          scope: 'global',
        })
      }
      synced += 1
    }
    if (synced > 0) {
      useWorkflowStore.getState().addLog({
        level: 'info',
        message: `已同步后端执行产生的 ${synced} 个变量到「全局变量」面板`,
      })
    }
  } catch (e) {
    console.warn('[MonitorPage] 同步后端执行变量失败:', e)
  }
  return 'done'
}

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
        
        // 2.1 启动时把「工作流保存文件夹」同步到后端持久化，
        //     确保计划任务/启动/热键/Webhook 触发等后端自治操作读到用户自定义路径
        //     （即便用户从不打开设置页也能生效）
        try {
          const { localWorkflowApi, systemApi } = await import('@/services/api')
          const wfState = useGlobalConfigStore.getState().config
          const folder = wfState.workflow?.localFolder || ''
          await localWorkflowApi.setActiveFolder(folder)
          // 同步浏览器配置到后端，确保计划任务/触发器等后端自治执行使用用户选择的浏览器（Chrome/Chromium 等）
          if (wfState.browser) {
            await systemApi.setBrowserConfig(wfState.browser as unknown as Record<string, unknown>)
          }
        } catch (e) {
          console.warn('[Config] 同步工作流文件夹/浏览器配置到后端失败:', e)
        }
        
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
        // 延迟一段时间再收尾：既要让用户看清最终状态，也要留足时间给
        // 「执行完成后补拉完整日志」（见 hydrateMonitorPage）完成并渲染，
        // 否则页面内容会在日志补齐前就被替换掉。
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
        }, 8000);
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
            // 尝试在活动文件夹下加载（filename 兼容带不带 .json）
            const filename = workflowId!.endsWith('.json') ? workflowId! : `${workflowId}.json`
            const res = await localWorkflowApi.get(filename) as { success?: boolean; data?: { content?: any }; error?: string }
            let content = res?.data?.content

            // 兜底：传进来的可能是工作流 JSON 内部的 id（而非文件名），
            // 此时按文件名取不到，改为遍历本地工作流列表按内部 id / 名称匹配。
            if (!content) {
              try {
                const listRes = await localWorkflowApi.list() as {
                  data?: { workflows?: Array<{ filename?: string; name?: string }> }
                }
                const items = listRes?.data?.workflows || []
                // 先按工作流名称 / 去后缀文件名匹配
                let hit = items.find(
                  (w) => w.name === workflowId ||
                    (w.filename || '').replace(/\.json$/i, '') === workflowId
                )
                // 再按工作流 JSON 内部 id 匹配（列表接口不返回 id，只能读内容比对，限量避免过多请求）
                if (!hit) {
                  for (const w of items.slice(0, 50)) {
                    if (!w.filename) continue
                    const probe = await localWorkflowApi.get(w.filename) as { data?: { content?: any } }
                    if (probe?.data?.content?.id === workflowId) {
                      hit = w
                      content = probe.data!.content
                      break
                    }
                  }
                }
                if (hit?.filename && !content) {
                  const res2 = await localWorkflowApi.get(hit.filename) as { data?: { content?: any } }
                  content = res2?.data?.content
                }
              } catch (e2) {
                console.warn('[AutoLoad] 兜底查找工作流失败:', e2)
              }
            }

            if (!content) {
              console.error('[AutoLoad] 加载工作流失败:', res?.error || '未找到内容')
              // 不再静默留白：明确告知用户加载失败与原因，避免"监控页一片空白"无从排查
              useWorkflowStore.getState().addLog?.({
                level: 'error',
                message: `监控页加载工作流失败：未找到「${workflowId}」。` +
                  '请确认该工作流文件存在于当前「工作流保存文件夹」中。',
              })
              return
            }
            // 必须走 importWorkflow：它会把文件里的节点还原成画布格式
            // （type→moduleNode + data.moduleType，并补齐分组/便签/子流程头等）。
            // 直接 loadWorkflow(content.nodes) 会让 React Flow 认不出节点类型，
            // 画布只渲染成无图标无配色的默认方框（样式全丢）。
            const store = useWorkflowStore.getState()
            const ok = store.importWorkflow(JSON.stringify(content))
            if (!ok) {
              store.addLog?.({
                level: 'error',
                message: `监控页加载工作流失败：「${workflowId}」内容格式无法解析。`,
              })
              return
            }
            console.log(`[AutoLoad] 成功从 URL 加载工作流: ${workflowId}`)
            // 通知后端我们当前所在的工作流，这样日志和事件才能正确推送过来
            socketService.setCurrentWorkflow(workflowId!)

            // 计划任务监控页：主动补齐本次执行的日志与变量。
            // 实时日志是 socket 广播且不补发历史，页面打开/连上前推送的内容会永久错过
            // （短工作流几乎必然错过）。这里按 task_id 拉取后端已保存的完整执行日志，
            // 并拉取后端执行期间产生的变量，保证监控页"事后打开也能看到结果"。
            const taskId = urlParams.get('task_id')
            if (taskId) {
              const state = await hydrateMonitorPage(taskId)
              // 监控页通常在任务「刚开始执行」时就被打开，此刻后端还没写完执行记录。
              // 因此若首次拉取到的是 running，就等执行完成事件再补拉一次真正的结果。
              if (state === 'running') {
                const onDone = () => {
                  socketService.off('execution:completed', onDone)
                  // 后端在 completed 事件之后才落盘执行记录，稍等一下再取
                  setTimeout(() => { void hydrateMonitorPage(taskId) }, 1200)
                }
                socketService.on('execution:completed', onDone)
              }
            }
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

  // 主题切换（默认/暗色/灰色，Dark Reader 式滤镜挂在 <html> 上）
  const themeMode = useGlobalConfigStore((state) => state.config.display?.theme || 'default')
  useEffect(() => {
    const el = document.documentElement
    if (themeMode === 'default') el.removeAttribute('data-webrpa-theme')
    else el.setAttribute('data-webrpa-theme', themeMode)
  }, [themeMode])

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
