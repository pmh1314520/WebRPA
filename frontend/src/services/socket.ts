import { io, Socket } from 'socket.io-client'
import { useWorkflowStore } from '@/store/workflowStore'
import { useNodeRunStore } from '@/store/nodeRunStore'
import { useGlobalConfigStore } from '@/store/globalConfigStore'
import { useDebugStore } from '@/store/debugStore'
import type { LogLevel } from '@/types'
import { getBackendBaseUrl } from './config'

// 输入弹窗回调
type InputPromptCallback = (data: {
  requestId: string
  variableName: string
  title: string
  message: string
  defaultValue: string
  inputMode: 'single' | 'list'
}) => void

// 浏览器被占用错误回调
type BrowserBusyCallback = () => void

// 浏览器意外关闭回调
type BrowserClosedCallback = () => void

// 全局音频播放器（用于管理播放状态）
let currentAudio: HTMLAudioElement | null = null

// 数据行批量处理缓冲区 - 已移除，不再使用
// let dataRowBuffer: Record<string, unknown>[] = []
// let dataRowFlushTimer: ReturnType<typeof setTimeout> | null = null
// const DATA_ROW_FLUSH_INTERVAL = 16
// const DATA_ROW_BATCH_SIZE = 50

// 是否正在执行中（用于控制是否接收实时数据行）
let isExecuting = false

class SocketService {
  private socket: Socket | null = null
  private connected = false
  private inputPromptCallback: InputPromptCallback | null = null
  private browserBusyCallback: BrowserBusyCallback | null = null
  private browserClosedCallback: BrowserClosedCallback | null = null

  // 设置输入弹窗回调
  setInputPromptCallback(callback: InputPromptCallback | null) {
    this.inputPromptCallback = callback
  }

  // 设置浏览器被占用错误回调
  setBrowserBusyCallback(callback: BrowserBusyCallback | null) {
    this.browserBusyCallback = callback
  }

  // 设置浏览器意外关闭回调
  setBrowserClosedCallback(callback: BrowserClosedCallback | null) {
    this.browserClosedCallback = callback
  }

  // 发送输入结果
  sendInputResult(requestId: string, value: string | null) {
    if (this.socket?.connected) {
      this.socket.emit('input_prompt_result', { requestId, value })
    }
  }

  // 发送语音合成结果
  sendTTSResult(requestId: string, success: boolean) {
    if (this.socket?.connected) {
      this.socket.emit('tts_result', { requestId, success })
    }
  }

  // 发送JS脚本执行结果
  sendJsScriptResult(requestId: string, success: boolean, result?: unknown, error?: string, variables?: Record<string, unknown>) {
    if (this.socket?.connected) {
      this.socket.emit('js_script_result', { requestId, success, result, error, variables })
    }
  }

  // 发送音乐播放结果
  sendPlayMusicResult(requestId: string, success: boolean, error?: string) {
    if (this.socket?.connected) {
      this.socket.emit('play_music_result', { requestId, success, error })
    }
  }

  // 发送视频播放结果
  sendPlayVideoResult(requestId: string, success: boolean, error?: string) {
    if (this.socket?.connected) {
      this.socket.emit('play_video_result', { requestId, success, error })
    }
  }

  // 发送图片查看结果
  sendViewImageResult(requestId: string, success: boolean, error?: string) {
    if (this.socket?.connected) {
      this.socket.emit('view_image_result', { requestId, success, error })
    }
  }

  /** 通用事件发射（供 AI 助手 client_action ack 等场景使用） */
  emit(event: string, data?: unknown) {
    if (this.socket?.connected) {
      this.socket.emit(event, data)
    }
  }

  // 播放音乐 - 显示播放器弹窗
  private playMusic(data: {
    requestId: string
    audioUrl: string
    waitForEnd: boolean
  }) {
    try {
      // 停止之前的音频
      if (currentAudio) {
        currentAudio.pause()
        currentAudio = null
      }

      // 使用播放器弹窗
      import('@/components/workflow/MusicPlayerDialog').then(({ showMusicPlayer }) => {
        showMusicPlayer(
          {
            audioUrl: data.audioUrl,
            requestId: data.requestId,
            waitForEnd: data.waitForEnd
          },
          (success, error) => {
            this.sendPlayMusicResult(data.requestId, success, error)
          }
        )
      }).catch(err => {
        // 如果导入失败，回退到简单播放
        console.error('加载播放器失败，使用简单播放:', err)
        this.playMusicSimple(data)
      })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      this.sendPlayMusicResult(data.requestId, false, errorMsg)
    }
  }

  // 简单播放（备用方案）
  private playMusicSimple(data: {
    requestId: string
    audioUrl: string
    waitForEnd: boolean
  }) {
    try {
      const audio = new Audio(data.audioUrl)
      currentAudio = audio

      if (data.waitForEnd) {
        audio.onended = () => {
          this.sendPlayMusicResult(data.requestId, true)
          currentAudio = null
        }
        audio.onerror = () => {
          this.sendPlayMusicResult(data.requestId, false, '音频加载或播放失败')
          currentAudio = null
        }
        audio.play().catch((err) => {
          this.sendPlayMusicResult(data.requestId, false, err.message)
          currentAudio = null
        })
      } else {
        audio.play().catch((err) => {
          console.error('播放音乐失败:', err)
        })
        this.sendPlayMusicResult(data.requestId, true)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      this.sendPlayMusicResult(data.requestId, false, errorMsg)
    }
  }

  // 播放视频 - 显示播放器弹窗
  private playVideo(data: {
    requestId: string
    videoUrl: string
    waitForEnd: boolean
  }) {
    try {
      import('@/components/workflow/VideoPlayerDialog').then(({ showVideoPlayer }) => {
        showVideoPlayer(
          {
            videoUrl: data.videoUrl,
            requestId: data.requestId,
            waitForEnd: data.waitForEnd
          },
          (success, error) => {
            this.sendPlayVideoResult(data.requestId, success, error)
          }
        )
      }).catch(err => {
        const errorMsg = err instanceof Error ? err.message : String(err)
        this.sendPlayVideoResult(data.requestId, false, `加载播放器失败: ${errorMsg}`)
      })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      this.sendPlayVideoResult(data.requestId, false, errorMsg)
    }
  }

  // 查看图片 - 显示图片查看器弹窗
  private viewImage(data: {
    requestId: string
    imageUrl: string
    autoClose: boolean
    displayTime: number
  }) {
    try {
      import('@/components/workflow/ImageViewerDialog').then(({ showImageViewer }) => {
        showImageViewer(
          {
            imageUrl: data.imageUrl,
            requestId: data.requestId,
            autoClose: data.autoClose,
            displayTime: data.displayTime
          },
          (success, error) => {
            this.sendViewImageResult(data.requestId, success, error)
          }
        )
      }).catch(err => {
        const errorMsg = err instanceof Error ? err.message : String(err)
        this.sendViewImageResult(data.requestId, false, `加载图片查看器失败: ${errorMsg}`)
      })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      this.sendViewImageResult(data.requestId, false, errorMsg)
    }
  }

  // 执行语音合成
  private executeTTS(data: {
    requestId: string
    text: string
    lang: string
    rate: number
    pitch: number
    volume: number
  }) {
    try {
      const utterance = new SpeechSynthesisUtterance(data.text)
      utterance.lang = data.lang
      utterance.rate = data.rate
      utterance.pitch = data.pitch
      utterance.volume = data.volume

      utterance.onend = () => {
        this.sendTTSResult(data.requestId, true)
      }

      utterance.onerror = () => {
        this.sendTTSResult(data.requestId, false)
      }

      // 取消之前的语音
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(utterance)
    } catch {
      this.sendTTSResult(data.requestId, false)
    }
  }

  // 执行JS脚本
  private executeJsScript(data: {
    requestId: string
    code: string
    variables: Record<string, unknown>
  }) {
    try {
      // 创建一个可修改的 vars 对象副本
      const vars = { ...data.variables }
      
      // 创建一个包含用户代码的函数
      // 用户代码中应该定义 main(vars) 函数
      const wrappedCode = `
        ${data.code}
        
        // 调用 main 函数并返回结果
        if (typeof main === 'function') {
          return main(vars);
        } else {
          throw new Error('未找到 main 函数，请确保代码中定义了 main(vars) 函数');
        }
      `
      
      // 使用 Function 构造器创建函数，传入 vars 参数
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const fn = new Function('vars', wrappedCode)
      const result = fn(vars)
      
      // 返回结果和修改后的变量对象
      this.sendJsScriptResult(data.requestId, true, result, undefined, vars)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.sendJsScriptResult(data.requestId, false, undefined, errorMessage)
    }
  }

  connect() {
    if (this.socket?.connected) {
      return
    }

    // 如果已有socket实例，先清理
    if (this.socket) {
      this.socket.removeAllListeners()
      this.socket.disconnect()
      this.socket = null
    }

    // 每次连接时都动态获取最新的后端地址
    const socketUrl = getBackendBaseUrl()
    console.log('[Socket] 连接到后端:', socketUrl)

    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 120000,  // 连接超时 120秒
    })

    this.socket.on('connect', () => {
      console.log('Socket connected')
      this.connected = true
      
      // 绑定外部待绑定的事件监听器
      this.bindPendingListeners()
      
      // 连接后同步 verboseLog 状态到后端
      const verboseLog = useWorkflowStore.getState().verboseLog
      this.socket?.emit('set_verbose_log', { enabled: verboseLog })
      
      // 连接后设置当前工作流ID（用于全局热键控制）
      console.log('[Socket] Socket连接成功，发送 set_current_workflow 事件')
      this.socket?.emit('set_current_workflow', { workflowId: 'current' })
      
      // 重连后，如果之前是 running 状态，重置为 pending
      // 因为可能错过了 completed 事件
      const currentStatus = useWorkflowStore.getState().executionStatus
      if (currentStatus === 'running') {
        console.log('[Socket] 重连后检测到 running 状态，重置为 completed')
        useWorkflowStore.getState().setExecutionStatus('completed')
        isExecuting = false
      }
    })

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected, reason:', reason)
      this.connected = false
      
      // 如果是执行中断开，标记需要在重连后检查状态
      if (isExecuting) {
        console.log('[Socket] 执行中断开连接，将在重连后重置状态')
      }
    })

    // 执行开始
    this.socket.on('execution:started', (data: { workflowId: string }) => {
      console.log('Execution started:', data.workflowId)
      isExecuting = true
      const store = useWorkflowStore.getState()
      store.setExecutionStatus('running')
      // 清空节点运行态高亮（开始新一轮执行）
      useNodeRunStore.getState().clear()
      // 记录当前执行的 workflowId，供"下载数据"按钮使用
      store.setCurrentExecutionWorkflowId(data.workflowId)
      // 清空之前的数据
      store.clearCollectedData()
      // 不要清空变量列表！变量应该保留，由后端的 variable_update 事件更新
      // useWorkflowStore.setState({ variables: [] })
    })

    // 节点开始执行 → 高亮"运行中"
    this.socket.on('execution:node_start', (data: { workflowId: string; nodeId: string }) => {
      // 运行状态高亮开关（默认关闭）：关闭时不写入运行态，画布不闪烁，避免大型工作流高速运行卡顿
      if (!useGlobalConfigStore.getState().config.display?.runStatusHighlight) return
      if (data?.nodeId) useNodeRunStore.getState().setStatus(data.nodeId, 'running')
    })
    // 节点执行完成 → 高亮"成功/失败"
    this.socket.on('execution:node_complete', (data: { workflowId: string; nodeId: string; success: boolean }) => {
      if (!useGlobalConfigStore.getState().config.display?.runStatusHighlight) return
      if (data?.nodeId) useNodeRunStore.getState().setStatus(data.nodeId, data.success ? 'success' : 'failed')
    })

    // 调试：命中断点/单步 → 暂停
    this.socket.on('execution:paused', (data: { workflowId: string; node_id: string; label?: string; variables?: Record<string, any>; reason?: 'breakpoint' | 'step' }) => {
      useDebugStore.getState().setPaused({ nodeId: data.node_id, label: data.label, variables: data.variables, reason: data.reason })
    })
    // 调试：恢复
    this.socket.on('execution:resumed', () => {
      useDebugStore.getState().clearPaused()
    })

    // ============ 日志批处理缓冲（高性能） ============
    // 后端短时间内可能推送大量日志，直接 setState 会导致主线程被 React 渲染塞满。
    // 我们把所有日志先放入缓冲队列，每 80ms（或队列 ≥ 200 条）合并后一次性更新 store。
    // 这样无论后端多快，前端始终保持 ≥ 12fps 的批处理节奏，体感丝滑。
    const LOG_BATCH_INTERVAL_MS = 80
    const LOG_BATCH_MAX_SIZE = 200
    let logBuffer: Array<{ level: LogLevel; message: string; nodeId?: string; duration?: number }> = []
    let logFlushTimer: ReturnType<typeof setTimeout> | null = null

    const flushLogBuffer = () => {
      if (logBuffer.length === 0) return
      const batch = logBuffer
      logBuffer = []
      if (logFlushTimer !== null) {
        clearTimeout(logFlushTimer)
        logFlushTimer = null
      }
      try {
        useWorkflowStore.getState().addLogBatch(batch)
      } catch (e) {
        console.error('[Socket] flush log buffer failed:', e)
      }
    }

    const scheduleLogFlush = () => {
      if (logBuffer.length >= LOG_BATCH_MAX_SIZE) {
        // 缓冲区过大立即冲刷，防止内存堆积
        flushLogBuffer()
        return
      }
      if (logFlushTimer !== null) return
      logFlushTimer = setTimeout(flushLogBuffer, LOG_BATCH_INTERVAL_MS)
    }

    // 浏览器错误检测（提取为公共函数，单/批量入口共用）
    const detectBrowserError = (level: LogLevel, message: string) => {
      if (level !== 'error' || !message) return
      const browserClosedPatterns = [
        'Target page, context or browser has been closed',
        'browser has been closed',
        'Browser closed',
        'Page closed',
      ]
      const browserStartFailedPatterns = [
        'launch_persistent_context',
        '无法启动持久化浏览器',
        '浏览器数据目录被占用',
        'user-data-dir',
        '浏览器启动后立即关闭',
        '打开浏览器失败',
        '浏览器启动超时',
      ]
      const isBrowserClosed = browserClosedPatterns.some((p) => message.includes(p))
      const isBrowserStartFailed = browserStartFailedPatterns.some((p) => message.includes(p))
      if (isBrowserClosed && !isBrowserStartFailed && isExecuting && this.browserClosedCallback) {
        this.browserClosedCallback()
      } else if (isBrowserStartFailed && this.browserBusyCallback) {
        this.browserBusyCallback()
      }
    }

    // 单条日志消息 - 走缓冲，不直接 setState
    this.socket.on('execution:log', (data: {
      workflowId: string
      log: {
        id: string
        timestamp: string
        level: LogLevel
        nodeId?: string
        message: string
        duration?: number
        isUserLog?: boolean
        isSystemLog?: boolean
      }
    }) => {
      const verboseLog = useWorkflowStore.getState().verboseLog
      const log = data.log

      detectBrowserError(log.level, log.message)

      // 简洁日志模式过滤（错误/警告 + 用户日志 + 系统日志 必显示）
      if (!verboseLog && !log.isUserLog && !log.isSystemLog && log.level !== 'error' && log.level !== 'warning') {
        return
      }

      logBuffer.push({
        level: log.level,
        message: log.message,
        nodeId: log.nodeId,
        duration: log.duration,
      })
      scheduleLogFlush()
    })

    // 批量日志消息 - 也走同一缓冲队列，避免双路径竞争
    this.socket.on('execution:log_batch', (data: {
      workflowId: string
      logs: Array<{
        id: string
        timestamp: string
        level: LogLevel
        nodeId?: string
        message: string
        duration?: number
        isUserLog?: boolean
        isSystemLog?: boolean
      }>
    }) => {
      const verboseLog = useWorkflowStore.getState().verboseLog
      for (const log of data.logs) {
        detectBrowserError(log.level, log.message)
        if (!verboseLog && !log.isUserLog && !log.isSystemLog && log.level !== 'error' && log.level !== 'warning') {
          continue
        }
        logBuffer.push({
          level: log.level,
          message: log.message,
          nodeId: log.nodeId,
          duration: log.duration,
        })
      }
      scheduleLogFlush()
    })

    // 输入弹窗请求
    this.socket.on('execution:input_prompt', (data: {
      requestId: string
      variableName: string
      title: string
      message: string
      defaultValue: string
      inputMode?: 'single' | 'list'
    }) => {
      if (this.inputPromptCallback) {
        this.inputPromptCallback({
          ...data,
          inputMode: data.inputMode || 'single'
        })
      }
    })

    // 语音合成请求
    this.socket.on('execution:tts_request', (data: {
      requestId: string
      text: string
      lang: string
      rate: number
      pitch: number
      volume: number
    }) => {
      this.executeTTS(data)
    })

    // JS脚本执行请求
    this.socket.on('execution:js_script', (data: {
      requestId: string
      code: string
      variables: Record<string, unknown>
    }) => {
      this.executeJsScript(data)
    })

    // 播放音乐请求
    this.socket.on('execution:play_music', (data: {
      requestId: string
      audioUrl: string
      waitForEnd: boolean
    }) => {
      this.playMusic(data)
    })

    // 播放视频请求
    this.socket.on('execution:play_video', (data: {
      requestId: string
      videoUrl: string
      waitForEnd: boolean
    }) => {
      this.playVideo(data)
    })

    // 查看图片请求
    this.socket.on('execution:view_image', (data: {
      requestId: string
      imageUrl: string
      autoClose: boolean
      displayTime: number
    }) => {
      this.viewImage(data)
    })

    // 执行完成
    this.socket.on('execution:completed', (data: {
      workflowId: string
      result: {
        status: string
        executedNodes: number
        failedNodes: number
        dataFile?: string
      }
      collectedData?: Record<string, unknown>[]
      healedSelectors?: { nodeId?: string; configKey?: string; oldSelector?: string; newSelector?: string }[]
    }) => {
      console.log('[Socket] 收到 execution:completed 事件 - 后端执行完成！', data)
      useDebugStore.getState().clearPaused()
      
      // 立即冲刷日志缓冲，确保完成日志和最后的执行日志全部显示
      flushLogBuffer()
      
      // 停止接收实时数据行
      isExecuting = false
      
      const status = data.result.status as 'completed' | 'failed' | 'stopped'
      console.log('[Socket] 立即设置执行状态为:', status)
      
      // 立即更新所有状态
      const store = useWorkflowStore.getState()
      store.setExecutionStatus(status)
      // 确保 currentExecutionWorkflowId 已设置（即使错过了 execution:started）
      if (data.workflowId) {
        store.setCurrentExecutionWorkflowId(data.workflowId)
      }
      
      // 处理收集的数据（兜底同步）
      // 前端在执行期间已通过 execution:data_row / data_row_batch 流式收齐全部数据；
      // completed 附带的 collectedData 仅作兜底（且后端封顶 5000）。若它的条数不超过
      // 前端已有的，就不覆盖，避免把流式收到的更多数据截断。
      if (data.collectedData && data.collectedData.length > 0) {
        const current = store.collectedData?.length || 0
        if (data.collectedData.length > current) {
          console.log('[Socket] completed 同步数据:', data.collectedData.length, '条（当前', current, '）')
          store.setCollectedData(data.collectedData)
        } else {
          console.log('[Socket] completed 数据(', data.collectedData.length, ')不多于已流式接收(', current, ')，保留现有不覆盖')
        }
      }
      
      // 触发全局事件，通知所有组件执行已完成
      window.dispatchEvent(new CustomEvent('execution:completed', { 
        detail: { status, executedNodes: data.result.executedNodes, failedNodes: data.result.failedNodes } 
      }))

      // 选择器自愈：若运行中有选择器被自愈，提示用户是否写回工作流（持久化）
      if (data.healedSelectors && data.healedSelectors.length > 0) {
        try {
          const heals = data.healedSelectors.filter((h) => h.nodeId && h.newSelector)
          if (heals.length > 0) {
            window.dispatchEvent(new CustomEvent('selector:healed', { detail: { heals } }))
          }
        } catch { /* ignore */ }
      }
      
      // 停止所有音频播放
      this.stopAllAudio()
      
      // 添加完成日志
      store.addLog({
        level: status === 'completed' ? 'success' : 'error',
        message: `执行${status === 'completed' ? '完成' : '失败'}，共执行 ${data.result.executedNodes} 个节点，失败 ${data.result.failedNodes} 个`,
      })
      
      console.log('[Socket] 前端状态已全部更新完成！')
    })

    // 数据行收集 - 实时显示（单条，兼容旧路径）
    this.socket.on('execution:data_row', (data: {
      workflowId: string
      row: Record<string, unknown>
    }) => {
      if (!isExecuting) return
      
      const store = useWorkflowStore.getState()
      store.addDataRow(data.row)
    })

    // 数据行收集 - 批量实时显示（高性能：后端合批推送，前端一次性入库，配合虚拟滚动表格）
    this.socket.on('execution:data_row_batch', (data: {
      workflowId: string
      rows: Array<Record<string, unknown>>
    }) => {
      if (!isExecuting) return
      if (!Array.isArray(data.rows) || data.rows.length === 0) return
      const store = useWorkflowStore.getState()
      store.addDataRows(data.rows)
    })

    // 执行停止
    this.socket.on('execution:stopped', (_data: { workflowId: string }) => {
      isExecuting = false  // 停止接收实时数据行
      useDebugStore.getState().clearPaused()
      // 停止所有音频播放
      this.stopAllAudio()
      useWorkflowStore.getState().setExecutionStatus('stopped')
    })
    
    // 热键触发运行工作流
    this.socket.on('hotkey:run_workflow', (_data: { workflowId: string }) => {
      console.log('[Socket] 收到 hotkey:run_workflow 事件')
      // 触发全局事件，让 Toolbar 组件处理
      window.dispatchEvent(new CustomEvent('hotkey:run'))
      console.log('[Socket] 已触发 window 的 hotkey:run 事件')
    })
    
    // 热键触发停止工作流
    this.socket.on('hotkey:stop_workflow', (_data: { workflowId: string }) => {
      console.log('[Socket] 收到 hotkey:stop_workflow 事件')
      window.dispatchEvent(new CustomEvent('hotkey:stop'))
      console.log('[Socket] 已触发 window 的 hotkey:stop 事件')
    })
    
    // 热键提示没有活动工作流
    this.socket.on('hotkey:no_workflow', () => {
      console.log('[Socket] 收到 hotkey:no_workflow 事件 - 没有活动的工作流')
    })
    
    // 热键触发开始录制宏 (F9)
    this.socket.on('hotkey:macro_start', () => {
      console.log('[Socket] 收到 hotkey:macro_start 事件')
      window.dispatchEvent(new CustomEvent('hotkey:macro_start'))
      console.log('[Socket] 已触发 window 的 hotkey:macro_start 事件')
    })
    
    // 热键触发停止录制宏 (F10)
    this.socket.on('hotkey:macro_stop', () => {
      console.log('[Socket] 收到 hotkey:macro_stop 事件')
      window.dispatchEvent(new CustomEvent('hotkey:macro_stop'))
      console.log('[Socket] 已触发 window 的 hotkey:macro_stop 事件')
    })
    
    // 热键触发截图 (Ctrl+Shift+F12)
    this.socket.on('hotkey:screenshot', () => {
      console.log('[Socket] 收到 hotkey:screenshot 事件')
      window.dispatchEvent(new CustomEvent('hotkey:screenshot'))
      console.log('[Socket] 已触发 window 的 hotkey:screenshot 事件')
    })

    // 用户自定义全局热键触发
    this.socket.on('hotkey:custom_action', (data: { actionId: string }) => {
      console.log('[Socket] 收到 hotkey:custom_action 事件', data)
      window.dispatchEvent(new CustomEvent('hotkey:custom_action', { detail: data }))
    })
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners()
      this.socket.disconnect()
      this.socket = null
      this.connected = false
    }
    isExecuting = false
  }

  isConnected() {
    return this.connected
  }

  // 待绑定的外部监听器（用于 socket 尚未连接时）
  private pendingListeners: Array<{ event: string; callback: (...args: any[]) => void }> = []
  // 持久外部监听器（重连后需要重新绑定）
  private externalListeners: Array<{ event: string; callback: (...args: any[]) => void }> = []

  // 添加 on 方法，支持外部监听事件
  on(event: string, callback: (...args: any[]) => void) {
    // 记录到 externalListeners，用于重连后重新绑定
    this.externalListeners.push({ event, callback })
    if (this.socket) {
      this.socket.on(event, callback)
    } else {
      // 如果 socket 还没初始化，加入待绑定队列
      this.pendingListeners.push({ event, callback })
    }
  }

  // 添加 off 方法，支持外部移除监听事件
  off(event: string, callback: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.off(event, callback)
    }
    // 同时从待绑定队列和持久监听器中移除
    const matcher = (l: { event: string; callback: (...args: any[]) => void }) =>
      !(l.event === event && l.callback === callback)
    this.pendingListeners = this.pendingListeners.filter(matcher)
    this.externalListeners = this.externalListeners.filter(matcher)
  }

  // 内部：把待绑定的监听器（含历史外部 listener）一次性绑定到 socket
  private bindPendingListeners() {
    if (!this.socket) return
    // 1) 绑定待绑定的（首次）
    for (const l of this.pendingListeners) {
      this.socket.on(l.event, l.callback)
    }
    this.pendingListeners = []
    // 2) 重连场景：external listeners 不在 pendingListeners 中，需要重新绑定
    //    （connect 函数中 removeAllListeners 后所有事件都被清掉了，
    //     externalListeners 永久保留，这里幂等地 on 上去）
    //    因为 socket.io 的 on 会去重重复回调（实际 on 多次会注册多次），
    //    所以先 off 一次再 on
    for (const l of this.externalListeners) {
      try {
        this.socket.off(l.event, l.callback)
      } catch {}
      this.socket.on(l.event, l.callback)
    }
  }

  // 停止所有音频/视频播放
  private stopAllAudio() {
    if (currentAudio) {
      currentAudio.pause()
      currentAudio.currentTime = 0
      currentAudio = null
    }
    // 同时停止语音合成
    window.speechSynthesis.cancel()
    // 关闭音乐播放器弹窗
    import('@/components/workflow/MusicPlayerDialog').then(({ hideMusicPlayer }) => {
      hideMusicPlayer()
    }).catch(() => {})
    // 关闭视频播放器弹窗
    import('@/components/workflow/VideoPlayerDialog').then(({ hideVideoPlayer }) => {
      hideVideoPlayer()
    }).catch(() => {})
    // 关闭图片查看器弹窗
    import('@/components/workflow/ImageViewerDialog').then(({ hideImageViewer }) => {
      hideImageViewer()
    }).catch(() => {})
  }

  // 发送停止执行请求
  stopExecution(workflowId: string) {
    // 停止所有音频
    this.stopAllAudio()
    if (this.socket?.connected) {
      this.socket.emit('execution_stop', { workflowId })
    }
  }

  // 设置详细日志开关状态（同步到后端）
  setVerboseLog(enabled: boolean) {
    if (this.socket?.connected) {
      this.socket.emit('set_verbose_log', { enabled })
    }
  }
  
  // 设置当前活动的工作流ID（用于全局热键控制）
  setCurrentWorkflow(workflowId: string | null) {
    console.log('[Socket] 准备设置当前工作流ID:', workflowId, '| Socket已连接:', this.socket?.connected)
    if (this.socket?.connected) {
      this.socket.emit('set_current_workflow', { workflowId })
      console.log('[Socket] 已发送 set_current_workflow 事件')
    } else {
      console.log('[Socket] Socket未连接，无法发送 set_current_workflow 事件')
    }
  }
}

export const socketService = new SocketService()
