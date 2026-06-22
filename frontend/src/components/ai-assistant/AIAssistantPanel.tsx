import { useEffect, useRef, useState } from 'react'
import {
  X,
  Sparkles,
  Send,
  Square,
  Plus,
  Trash2,
  History,
  Settings,
  AlertCircle,
  Wrench,
  Zap,
  MessageCircleQuestion,
  ListTree,
  Layers,
  Info,
  Undo2,
  Clock,
  Paperclip,
  FileText,
  Cpu,
  ChevronUp,
  Check,
  ShieldQuestion,
  Pin,
  Minus,
  PanelRightClose,
  Mic,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAIAssistantStore, type ChatMessage, type RollbackSnapshot } from '@/store/aiAssistantStore'
import { useAIPermissionStore } from '@/store/aiPermissionStore'
import { useGlobalConfigStore } from '@/store/globalConfigStore'
import { useAiActionLogStore } from '@/store/aiActionLogStore'
import { useWorkflowStore } from '@/store/workflowStore'
import { aiAssistantApi } from '@/services/aiAssistantApi'
import {
  bindAssistantSocketEvents,
  buildWorkflowContext,
  executeClientAction,
  onAssistantUiEvent,
} from '@/services/aiAssistantSkills'
import { MessageBubble, getToolDisplayLabel } from './MessageBubble'
import { PanelResizer } from '@/components/workflow/PanelResizer'
import { useLayoutStore, LAYOUT_LIMITS } from '@/store/layoutStore'
import { isTauriRuntime, agentSetAlwaysOnTop, agentMinimize, agentClose } from '@/lib/tauriAgentWindow'

const QUICK_PROMPTS = [
  { text: '帮我新建一个打开网页的工作流', icon: Zap, color: 'icon-chip-success' },
  { text: 'WebRPA 怎么用？', icon: MessageCircleQuestion, color: 'icon-chip-info' },
  { text: '列出所有 AI 类模块', icon: Layers, color: 'icon-chip-violet' },
  { text: '我画布上有哪些节点？', icon: ListTree, color: 'icon-chip-warning' },
]

// 独立 Agent 窗口：以"操作电脑"为主的快捷指令（对标 OpenInterpreter / Hermes 这类系统级 Agent）
const AGENT_QUICK_PROMPTS = [
  { text: '帮我整理一下桌面上的文件，按类型归类到文件夹', icon: Zap, color: 'icon-chip-success' },
  { text: '截一张当前屏幕的图并分析上面有什么', icon: MessageCircleQuestion, color: 'icon-chip-info' },
  { text: '打开记事本，写入一段今天的待办清单并保存到桌面', icon: Layers, color: 'icon-chip-violet' },
  { text: '查找并打开电脑上的某个程序', icon: ListTree, color: 'icon-chip-warning' },
]

export function AIAssistantPanel({ standalone = false }: { standalone?: boolean } = {}) {
  const isOpen = useAIAssistantStore((s) => s.isPanelOpen)
  const setOpen = useAIAssistantStore((s) => s.setPanelOpen)
  const pendingApproval = useAIPermissionStore((s) => s.pending)
  const messages = useAIAssistantStore((s) => s.messages)
  const setMessages = useAIAssistantStore((s) => s.setMessages)
  const appendMessage = useAIAssistantStore((s) => s.appendMessage)
  const isSending = useAIAssistantStore((s) => s.isSending)
  const setSending = useAIAssistantStore((s) => s.setSending)
  const currentSessionId = useAIAssistantStore((s) => s.currentSessionId)
  const setCurrentSessionId = useAIAssistantStore((s) => s.setCurrentSessionId)
  const sessions = useAIAssistantStore((s) => s.sessions)
  const setSessions = useAIAssistantStore((s) => s.setSessions)
  const setRollbackSnapshot = useAIAssistantStore((s) => s.setRollbackSnapshot)
  const getRollbackSnapshot = useAIAssistantStore((s) => s.getRollbackSnapshot)

  const aiAssistantConfig = useGlobalConfigStore((s) => s.config.aiAssistant)
  const aiFallbackConfig = useGlobalConfigStore((s) => s.config.ai)
  const updateAIAssistantConfig = useGlobalConfigStore((s) => s.updateAIAssistantConfig)
  const [showModelMenu, setShowModelMenu] = useState(false)

  // 独立 Agent 窗口（Tauri）置顶状态
  const [agentPinned, setAgentPinned] = useState(true)
  // 贴边自动隐藏提示（仅独立窗口首次显示，可手动关闭并记忆）
  const [showEdgeHint, setShowEdgeHint] = useState(() => {
    try { return localStorage.getItem('webrpa.agent.edgeHintDismissed') !== '1' } catch { return true }
  })
  const dismissEdgeHint = () => {
    setShowEdgeHint(false)
    try { localStorage.setItem('webrpa.agent.edgeHintDismissed', '1') } catch { /* ignore */ }
  }

  const [input, setInput] = useState('')

  // 语音指挥：录音 → Whisper 转文字 → 填入输入框
  const [voiceState, setVoiceState] = useState<'idle' | 'recording' | 'transcribing'>('idle')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const stopVoiceRecording = () => {
    try { mediaRecorderRef.current?.stop() } catch { /* ignore */ }
  }

  const startVoiceRecording = async () => {
    if (voiceState !== 'idle') { stopVoiceRecording(); return }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('当前环境不支持录音')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      audioChunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        if (blob.size < 800) { setVoiceState('idle'); return } // 太短，忽略
        setVoiceState('transcribing')
        try {
          const dataUrl: string = await new Promise((resolve, reject) => {
            const fr = new FileReader()
            fr.onload = () => resolve(String(fr.result))
            fr.onerror = reject
            fr.readAsDataURL(blob)
          })
          const res = await aiAssistantApi.transcribe(dataUrl, 'zh')
          if (res.success && res.data?.success && res.data.text) {
            setInput((prev) => (prev ? prev + ' ' : '') + res.data!.text)
            setTimeout(() => textareaRef.current?.focus(), 50)
          } else {
            setError(res.data?.error || '语音识别失败')
          }
        } catch (e: any) {
          setError('语音识别失败：' + (e?.message || e))
        } finally {
          setVoiceState('idle')
        }
      }
      mediaRecorderRef.current = mr
      mr.start()
      setVoiceState('recording')
    } catch (e: any) {
      setError('无法访问麦克风：' + (e?.message || e))
      setVoiceState('idle')
    }
  }

  // 对话底栏（输入框）可上下拖拽改变高度
  const [composerHeight, setComposerHeight] = useState(56)
  const composerResizeRef = useRef<{ startY: number; startH: number } | null>(null)
  const startComposerResize = (e: React.MouseEvent) => {
    e.preventDefault()
    composerResizeRef.current = { startY: e.clientY, startH: composerHeight }
    const onMove = (ev: MouseEvent) => {
      if (!composerResizeRef.current) return
      // 向上拖动 → 高度增大
      const dy = composerResizeRef.current.startY - ev.clientY
      const next = Math.max(44, Math.min(420, composerResizeRef.current.startH + dy))
      setComposerHeight(next)
    }
    const onUp = () => {
      composerResizeRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.style.userSelect = ''
    }
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }
  const [showSessions, setShowSessions] = useState(false)
  // 多模态：待发送的图片（data URL）
  const [attachedImages, setAttachedImages] = useState<string[]>([])
  // 待发送的文档类附件（pdf/docx/xlsx/csv/txt/md/html 等，提取为文本）
  const [attachedDocs, setAttachedDocs] = useState<{ id: string; name: string; text: string; status: 'loading' | 'ready' | 'error'; error?: string }[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showTimeline, setShowTimeline] = useState(false)
  const aiActions = useAiActionLogStore((s) => s.entries)
  const clearAiActions = useAiActionLogStore((s) => s.clear)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // 用于打断当前任务：保留正在跑的 sessionId 和 AbortController
  const inflightSessionIdRef = useRef<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  // 流式生成中的临时消息 id（reasoning/content 增量累加到这条消息）
  const streamingMsgIdRef = useRef<string | null>(null)

  // 立即滚到底部（不带动画，用于打开面板/切换会话场景）
  const scrollToBottomImmediate = () => {
    const c = messagesContainerRef.current
    if (!c) return
    // 欢迎页（无消息）保持在顶部，避免把 Logo/问候语滚出视口、逼用户手动往上滚
    if (messages.length === 0) {
      c.scrollTop = 0
      return
    }
    c.scrollTop = c.scrollHeight
  }

  useEffect(() => {
    if (messages.length === 0) return // 欢迎页不自动滚动
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, isSending])

  // 打开面板时强制滚到最底（DOM 挂载/重排可能晚于 React 渲染，多帧兜底）
  useEffect(() => {
    if (!isOpen) return
    // 立即一次（同步布局后）
    scrollToBottomImmediate()
    // 下一帧再来一次（等子组件 markdown 渲染、图片/代码块布局完）
    let raf1 = 0
    let raf2 = 0
    raf1 = requestAnimationFrame(() => {
      scrollToBottomImmediate()
      raf2 = requestAnimationFrame(scrollToBottomImmediate)
    })
    // 兜底：80ms 后再滚一次（marked 解析有时是异步）
    const t = setTimeout(scrollToBottomImmediate, 80)
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
      clearTimeout(t)
    }
  }, [isOpen])

  // 切换会话后立即滚到底
  useEffect(() => {
    if (!isOpen) return
    scrollToBottomImmediate()
    const r = requestAnimationFrame(scrollToBottomImmediate)
    return () => cancelAnimationFrame(r)
  }, [currentSessionId, isOpen])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 80)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    aiAssistantApi.listSessions().then((res) => {
      if (res.success && Array.isArray(res.data)) {
        setSessions(res.data)
      }
    })
  }, [isOpen, setSessions])

  useEffect(() => {
    bindAssistantSocketEvents({
      onToolCall: (data: any) => {
        // 工具开始执行：实时把工具卡片插入到最新的助手消息里
        const tc = data?.tool_call
        if (!tc) return
        const state = useAIAssistantStore.getState()
        const msgs = state.messages
        // 找到最近的、还没有这个 tc 的助手消息，把工具加进去
        for (let i = msgs.length - 1; i >= Math.max(0, msgs.length - 10); i--) {
          const m = msgs[i]
          if (m.role !== 'assistant') continue
          const existing = m.tool_calls || []
          const idx = existing.findIndex((x) => x.id === tc.id)
          if (idx >= 0) {
            existing[idx] = { ...existing[idx], ...tc }
            state.upsertMessage({ ...m, tool_calls: [...existing] })
            return
          }
        }
        // 没有找到对应助手消息，直接造一条临时
        const tempMsg = {
          id: `tmp-${tc.id}`,
          role: 'assistant' as const,
          content: '',
          tool_calls: [tc],
        }
        state.appendMessage(tempMsg)
      },
      onToolResult: (data: any) => {
        const tc = data?.tool_call
        if (!tc) return
        const state = useAIAssistantStore.getState()
        const msgs = state.messages
        for (let i = msgs.length - 1; i >= 0; i--) {
          const m = msgs[i]
          if (m.role !== 'assistant' || !m.tool_calls) continue
          const idx = m.tool_calls.findIndex((x) => x.id === tc.id)
          if (idx >= 0) {
            const newCalls = [...m.tool_calls]
            newCalls[idx] = { ...newCalls[idx], ...tc }
            state.upsertMessage({ ...m, tool_calls: newCalls })

            // === build_workflow 工具一旦返回成功，立刻触发可视化逐步搭建 ===
            // 不等整段流式回复结束，AI 还在说话时画布就开始画节点了
            if (tc.name === 'build_workflow' && tc.status === 'success' && tc.result) {
              const flagKey = `__client_executed_${tc.id}`
              if (!(m as any)[flagKey]) {
                (m as any)[flagKey] = true
                const built: any = tc.result
                if (Array.isArray(built?.nodes) && Array.isArray(built?.edges)) {
                  // 异步触发，不阻塞 socket 事件循环
                  void executeClientAction('load_workflow_from_data', {
                    name: built.name || '小助手生成的工作流',
                    nodes: built.nodes,
                    edges: built.edges,
                    animate: true,  // 启用可视化逐步搭建
                  })
                    .then(() => executeClientAction('auto_layout', {}))  // ELKJS 分层布局
                    .then(() => executeClientAction('fit_view', {}))
                }
              }
            }
            return
          }
        }
      },
      onAssistantPartial: () => {
        // 中间助手回合（带 tool_calls 但没文本），后端 chat 完成后会用完整列表覆盖
        // 流式开始新一轮：清掉之前的临时流式消息引用
        streamingMsgIdRef.current = null
      },
      onReasoningPartial: (data: any) => {
        const fullText = (data?.full as string) || ''
        // 防御：非思考模型某些代理也会发空字符串的 reasoning_partial，过滤掉
        if (!fullText.trim()) return
        const state = useAIAssistantStore.getState()
        const id = streamingMsgIdRef.current
        const msgs = state.messages
        // 查或建临时流式消息
        if (id) {
          const exists = msgs.find((m) => m.id === id)
          if (exists) {
            // 在本地附加 thinking_started_at（只第一次设置）和 thinking_duration_sec（持续更新）
            const startedAt = (exists as any).thinking_started_at || Date.now()
            const duration = (Date.now() - startedAt) / 1000
            state.upsertMessage({
              ...exists,
              reasoning_content: fullText,
              thinking_started_at: startedAt,
              thinking_duration_sec: duration,
            } as any)
            return
          }
        }
        const newId = `streaming-${Date.now()}`
        streamingMsgIdRef.current = newId
        state.appendMessage({
          id: newId,
          role: 'assistant',
          content: '',
          reasoning_content: fullText,
          thinking_started_at: Date.now(),
          thinking_duration_sec: 0,
        } as any)
      },
      onContentPartial: (data: any) => {
        const fullText = (data?.full as string) || ''
        const state = useAIAssistantStore.getState()
        const id = streamingMsgIdRef.current
        const msgs = state.messages
        if (id) {
          const exists = msgs.find((m) => m.id === id)
          if (exists) {
            // content 出现意味着思考结束 - 把 thinking_duration_sec 锁住
            const startedAt = (exists as any).thinking_started_at
            const finalDuration = startedAt
              ? (exists as any).thinking_duration_sec || (Date.now() - startedAt) / 1000
              : (exists as any).thinking_duration_sec
            state.upsertMessage({
              ...exists,
              content: fullText,
              thinking_duration_sec: finalDuration,
            } as any)
            return
          }
        }
        const newId = `streaming-${Date.now()}`
        streamingMsgIdRef.current = newId
        state.appendMessage({
          id: newId,
          role: 'assistant',
          content: fullText,
        })
      },
    })
  }, [])

  useEffect(() => {
    return onAssistantUiEvent('show_toast', (payload: any) => {
      console.log('[小助手] toast:', payload?.message)
    })
  }, [])

  // 选中节点"问 AI"：打开面板并预填提示，可选自动发送（用 ref 持有最新 handleSend，避免闭包陈旧）
  const handleSendRef = useRef<((t?: string, imgs?: string[]) => void) | null>(null)
  // 编辑器截图：AI 调用 capture_editor_screenshot 后缓存截图，待当前回合结束自动作为图片发给视觉模型
  const pendingScreenshotRef = useRef<string | null>(null)
  const pendingScreenshotCaptionRef = useRef<string>('这是当前 WebRPA 编辑器界面的截图，请查看并据此分析问题。')
  // 防循环：标记「当前这一回合本身就是截图自动发起的回合」，避免截图回合再触发截图无限套娃
  const autoScreenshotInFlightRef = useRef(false)
  useEffect(() => {
    return onAssistantUiEvent('editor_screenshot_captured', (payload: any) => {
      const dataUrl = payload?.dataUrl
      if (typeof dataUrl === 'string' && dataUrl) {
        pendingScreenshotRef.current = dataUrl
        if (typeof payload?.caption === 'string' && payload.caption) pendingScreenshotCaptionRef.current = payload.caption
      }
    })
  }, [])
  useEffect(() => {
    return onAssistantUiEvent('ask_ai', (payload: any) => {
      const prompt = (payload?.prompt as string) || ''
      if (!prompt) return
      setOpen(true)
      setInput(prompt)
      if (payload?.autoSend) {
        setTimeout(() => { handleSendRef.current?.(prompt) }, 200)
      } else {
        setTimeout(() => textareaRef.current?.focus(), 120)
      }
    })
  }, [setOpen])

  // 编辑器：把小助手配置推送到后端，供独立 Agent 窗口跨上下文读取
  // （编辑器在系统浏览器、Agent 在 Tauri WebView2，localStorage 互相隔离，必须经后端共享）
  useEffect(() => {
    if (standalone) return
    const t = setTimeout(() => {
      aiAssistantApi.saveSharedConfig({ aiAssistant: aiAssistantConfig, ai: aiFallbackConfig }).catch(() => {})
    }, 400)
    return () => clearTimeout(t)
  }, [standalone, aiAssistantConfig, aiFallbackConfig])

  // 独立 Agent 窗口：从后端拉取共享配置并水合（首次 + 每 4 秒轮询，编辑器改了配置后自动跟上）
  useEffect(() => {
    if (!standalone) return
    let cancelled = false
    const load = () => {
      aiAssistantApi.getSharedConfig().then((res) => {
        if (cancelled) return
        const cfg = (res.success ? res.data?.config : null) as { aiAssistant?: any; ai?: any } | null
        if (!cfg) return
        if (cfg.aiAssistant) updateAIAssistantConfig(cfg.aiAssistant)
        if (cfg.ai) useGlobalConfigStore.getState().updateAIConfig(cfg.ai)
      }).catch(() => {})
    }
    load()
    const iv = setInterval(load, 4000)
    return () => { cancelled = true; clearInterval(iv) }
  }, [standalone, updateAIAssistantConfig])

  const resolvedConfig = (() => {
    const a = aiAssistantConfig
    const b = aiFallbackConfig
    const model = a?.model || b?.model || ''
    return {
      api_url: a?.apiUrl || b?.apiUrl || '',
      api_key: a?.apiKey || b?.apiKey || '',
      model,
      temperature: a?.temperature ?? 0.7,
      max_tokens: a?.maxTokens ?? 4000,
      system_prompt: a?.systemPrompt || '',
      enable_tools: a?.enableTools ?? true,
      auto_approve: a?.autoApprove ?? false,
      max_heal_rounds: (a as any)?.maxHealRounds ?? 5,
      supports_vision: isVisionModelName(model),
      agent_mode: standalone,
    }
  })()

  const configReady = !!(resolvedConfig.api_url && resolvedConfig.model)

  // 当前正在执行的操作（用于"工作中"指示器展示具体在干什么，避免用户以为卡住）
  const currentActivity = (() => {
    if (!isSending) return ''
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]
      if (m.role === 'assistant' && m.tool_calls && m.tool_calls.length > 0) {
        const running = [...m.tool_calls].reverse().find((tc) => tc.status === 'running' || tc.status === 'pending')
        const target = running || m.tool_calls[m.tool_calls.length - 1]
        if (target) {
          try { return getToolDisplayLabel(target) } catch { return '' }
        }
      }
    }
    return ''
  })()
  // ===== 多模型：模型档案列表（聊天处上拉栏 + 候选排序用） =====
  const assistantModels = (aiAssistantConfig?.models || []).filter((m) => m.apiUrl && m.model)
  const activeModelId = aiAssistantConfig?.activeModelId
  const autoSceneRoute = aiAssistantConfig?.autoSceneRoute ?? false
  const autoFallback = aiAssistantConfig?.autoFallback ?? false
  const activeModel = assistantModels.find((m) => m.id === activeModelId) || assistantModels[0]

  function modelToCfg(m: typeof assistantModels[number]) {
    const a = aiAssistantConfig
    return {
      api_url: (m.apiUrl || '').trim(),
      api_key: (m.apiKey || '').trim(),
      model: (m.model || '').trim(),
      temperature: m.temperature ?? a?.temperature ?? 0.7,
      max_tokens: m.maxTokens ?? a?.maxTokens ?? 4000,
      system_prompt: a?.systemPrompt || '',
      enable_tools: a?.enableTools ?? true,
      auto_approve: a?.autoApprove ?? false,
      max_heal_rounds: (a as any)?.maxHealRounds ?? 5,
      // 模型支持多模态：勾选了「多模态」场景，或模型名命中视觉关键词
      supports_vision: (m.scenes || []).includes('vision') || isVisionModelName(m.model || ''),
      agent_mode: standalone,
    }
  }

  // 判断模型名是否为多模态/视觉模型（用于决定是否启用编辑器截图、识图能力）
  function isVisionModelName(model: string): boolean {
    const m = (model || '').toLowerCase()
    if (!m) return false
    return /(vision|gpt-4o|gpt-4\.1|4v|glm-4v|glm-4\.\d+v|claude-3|claude-4|sonnet|opus|gemini|qwen.*vl|qwen-vl|yi-vision|internvl|llava|multimodal|moonshot.*vision|step-1v|doubao.*vision|minicpm-v)/i.test(m)
  }

  function isThinkingQuery(text: string): boolean {
    if (text.length > 80) return true
    return /分析|为什么|原因|设计|规划|方案|推理|优化|排查|诊断|比较|对比|架构|算法|证明|论证|思考/i.test(text)
  }  // 构建候选模型列表（已排序）：第一个是主模型，其余是备用
  function buildCandidates(hasImages: boolean, messageText: string): any[] {
    if (assistantModels.length === 0) return [resolvedConfig]
    let ordered = [...assistantModels]
    if (autoSceneRoute) {
      const scene: 'vision' | 'thinking' | 'chat' = hasImages ? 'vision' : (isThinkingQuery(messageText) ? 'thinking' : 'chat')
      const inScene = assistantModels.filter((m) => (m.scenes || []).includes(scene))
      const rest = assistantModels.filter((m) => !inScene.includes(m))
      ordered = [...inScene, ...rest]
    } else {
      const primary = activeModel ? [activeModel] : []
      const rest = assistantModels.filter((m) => m.id !== activeModel?.id)
      ordered = [...primary, ...rest]
      if (!autoFallback) ordered = ordered.slice(0, 1)
    }
    const cfgs = ordered.map(modelToCfg).filter((c) => c.api_url && c.model)
    return cfgs.length > 0 ? cfgs : [resolvedConfig]
  }



  function handleNewSession() {
    setMessages([])
    setCurrentSessionId(null)
    setError(null)
    setInput('')
    setAttachedImages([])
    setAttachedDocs([])
    textareaRef.current?.focus()
  }

  // 读取图片文件 → 统一经 canvas 重新编码为 PNG/JPEG（模型只认 png/jpeg/webp/gif/bmp，
  // 原始可能是 svg/avif/ico/tiff 等不受支持的格式，直接透传会被网关判 400 "invalid image format"），
  // 同时把最长边缩放到 1280px，避免超大截图把请求体撑爆
  async function loadImageFile(file: File): Promise<string | null> {
    if (!file.type.startsWith('image/')) return null
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader()
      fr.onload = () => resolve(fr.result as string)
      fr.onerror = reject
      fr.readAsDataURL(file)
    })
    try {
      const img = new Image()
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = reject
        img.src = dataUrl
      })
      const MAX = 1280
      let width = img.naturalWidth || img.width
      let height = img.naturalHeight || img.height
      if (!width || !height) return dataUrl
      if (width > MAX || height > MAX) {
        const scale = MAX / Math.max(width, height)
        width = Math.round(width * scale)
        height = Math.round(height * scale)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return dataUrl
      ctx.drawImage(img, 0, 0, width, height)
      // 含透明通道的格式（png/webp/gif/svg/ico 等 logo 常见）用 PNG 保真，
      // 其余（jpeg/bmp 照片类）用 JPEG 压缩体积
      const keepAlpha = !/jpe?g|bmp/i.test(file.type)
      return keepAlpha ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.88)
    } catch {
      // canvas 失败兜底：仅当原始就是受支持格式时透传，否则放弃
      return /image\/(png|jpe?g|webp|gif|bmp)/i.test(file.type) ? dataUrl : null
    }
  }

  async function addImageFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (arr.length === 0) return
    const loaded: string[] = []
    for (const f of arr.slice(0, 6)) {
      const u = await loadImageFile(f)
      if (u) loaded.push(u)
    }
    if (loaded.length > 0) {
      setAttachedImages((prev) => [...prev, ...loaded].slice(0, 6))
      setTimeout(() => textareaRef.current?.focus(), 30)
    }
  }

  // 支持的文档类扩展名（提取文本发给模型；图片走 image_url）
  const DOC_EXTS = ['pdf', 'csv', 'doc', 'docx', 'xls', 'xlsx', 'html', 'htm', 'txt', 'md', 'markdown', 'json', 'xml', 'log', 'tsv', 'yaml', 'yml']
  const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp']

  function fileExt(name: string): string {
    const i = name.lastIndexOf('.')
    return i >= 0 ? name.slice(i + 1).toLowerCase() : ''
  }

  async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const fr = new FileReader()
      fr.onload = () => resolve(fr.result as string)
      fr.onerror = reject
      fr.readAsDataURL(file)
    })
  }

  // 添加一个文档类附件：调用后端提取为文本
  async function addDocFile(file: File) {
    const id = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    setAttachedDocs((prev) => [...prev, { id, name: file.name, text: '', status: 'loading' as const }].slice(-8))
    try {
      const dataUrl = await fileToBase64(file)
      const res = await aiAssistantApi.extractFile(file.name, dataUrl)
      if (res.success && res.data && res.data.success) {
        setAttachedDocs((prev) => prev.map((d) => d.id === id ? { ...d, text: res.data!.text || '', status: 'ready' } : d))
      } else {
        const err = (res.data && res.data.error) || res.error || '解析失败'
        setAttachedDocs((prev) => prev.map((d) => d.id === id ? { ...d, status: 'error', error: err } : d))
      }
    } catch (e: any) {
      setAttachedDocs((prev) => prev.map((d) => d.id === id ? { ...d, status: 'error', error: String(e?.message || e) } : d))
    }
    setTimeout(() => textareaRef.current?.focus(), 30)
  }

  // 统一入口：把一批文件按类型分发到图片 / 文档处理
  async function addFiles(files: FileList | File[]) {
    const list = Array.from(files)
    const images = list.filter((f) => f.type.startsWith('image/') || IMAGE_EXTS.includes(fileExt(f.name)))
    const docs = list.filter((f) => !images.includes(f) && DOC_EXTS.includes(fileExt(f.name)))
    if (images.length > 0) await addImageFiles(images)
    for (const d of docs.slice(0, 8)) await addDocFile(d)
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData?.items
    if (!items) return
    const files: File[] = []
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (it.kind === 'file') {
        const f = it.getAsFile()
        if (f) files.push(f)
      }
    }
    if (files.length > 0) {
      e.preventDefault()
      void addFiles(files)
    }
  }

  // 回退到某条 AI 操作「之前」的画布状态
  function handleRevertTo(entryId: string) {
    const list = useAiActionLogStore.getState().entries
    const entry = list.find((e) => e.id === entryId)
    if (!entry) return
    const ws = useWorkflowStore.getState()
    ws.pushHistory()
    ws.setGraph(entry.before.nodes as any, entry.before.edges as any)
    ws.setWorkflowName(entry.before.name)
  }

  async function handleSelectSession(id: string) {
    setShowSessions(false)
    setError(null)
    const res = await aiAssistantApi.getSession(id)
    if (res.success && res.data) {
      setCurrentSessionId(res.data.id)
      setMessages(res.data.messages || [])
    } else {
      setError(res.error || '加载会话失败')
    }
  }

  async function handleDeleteSession(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    const res = await aiAssistantApi.deleteSession(id)
    if (res.success) {
      setSessions(sessions.filter((s) => s.id !== id))
      if (id === currentSessionId) {
        handleNewSession()
      }
    }
  }

  async function handleSend(text?: string, imgs?: string[]) {
    const messageText = (text ?? input).trim()
    // 手动发送（按钮 / Enter，text 为 undefined）时自动带上已上传的图片/文档；
    // 程序化发送（快捷指令 / 重发 / ask_ai，传了 text）默认不带附件
    const images = imgs ?? (text === undefined ? attachedImages : [])
    const docs = text === undefined ? attachedDocs.filter((d) => d.status === 'ready' && d.text) : []
    const docNames = text === undefined ? attachedDocs.map((d) => d.name) : []
    if (!messageText && images.length === 0 && docs.length === 0) return
    if (!configReady) {
      setError('请先在「全局配置 → 小助手」中填写 API 地址和模型')
      return
    }
    // 文档附件仍在解析中则提示等待
    if (text === undefined && attachedDocs.some((d) => d.status === 'loading')) {
      setError('附件正在解析中，请稍候…')
      return
    }

    // 用户在 AI 工作期间发新消息：先打断之前的任务
    if (isSending) {
      await stopCurrent()
    }

    setError(null)
    // 重置流式临时消息引用 - 新一轮对话开始
    streamingMsgIdRef.current = null
    // 发给模型的实际文本 = 用户输入 + 文档附件提取出的内容
    let enriched = messageText
    if (docs.length > 0) {
      enriched += '\n\n---\n【用户上传的附件内容，供你参考分析】\n' +
        docs.map((d) => `# 附件：${d.name}\n${d.text}`).join('\n\n')
    }
    const userMsg: ChatMessage = {
      id: `local-${Date.now()}`,
      role: 'user',
      content: messageText,
      images: images.length > 0 ? images : undefined,
      attachmentNames: docNames.length > 0 ? docNames : undefined,
    }
    // 回滚快照：在 AI 改动画布「之前」记录当前画布状态（节点/连线/名称/全局变量），
    // 绑定到这条用户消息，供用户事后一键回滚到此次对话之前的状态。
    let preSnapshot: RollbackSnapshot | null = null
    try {
      const wf = useWorkflowStore.getState()
      preSnapshot = {
        nodes: JSON.parse(JSON.stringify(wf.nodes || [])),
        edges: JSON.parse(JSON.stringify(wf.edges || [])),
        name: wf.name,
        variables: JSON.parse(JSON.stringify(wf.variables || [])),
        text: messageText,
        createdAt: Date.now(),
      }
      setRollbackSnapshot(userMsg.id, preSnapshot)
    } catch { /* 快照失败不阻断发送 */ }
    appendMessage(userMsg)
    setInput('')
    setAttachedImages([])
    setAttachedDocs([])
    setSending(true)

    // 关键：在请求发出「之前」就确定 session_id 并登记为在途会话，
    // 这样执行期间点「停止」能精准取消到后端正在跑的这次任务（解决新会话停不掉的问题）
    const sidForRequest = currentSessionId || `web-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    inflightSessionIdRef.current = sidForRequest
    if (!currentSessionId) setCurrentSessionId(sidForRequest)

    const ac = new AbortController()
    abortControllerRef.current = ac

    try {
      // 多模型：构建候选（场景路由/手动选择/自动回退），首个为主模型，其余为备用
      const candidates = buildCandidates(images.length > 0, messageText)
      const primaryCfg = candidates[0]
      const fallbackCfgs = candidates.slice(1)
      const res = await aiAssistantApi.chat({
        session_id: sidForRequest,
        message: enriched,
        config: primaryCfg,
        workflow_context: buildWorkflowContext(),
        images: images.length > 0 ? images : undefined,
        fallback_configs: fallbackCfgs.length > 0 ? fallbackCfgs : undefined,
      } as any, ac.signal)
      if (!res.success || !res.data) {
        if (ac.signal.aborted) return
        setError(res.error || '请求失败')
        return
      }
      const sid = res.data.session_id
      setCurrentSessionId(sid)
      inflightSessionIdRef.current = sid
      const full = await aiAssistantApi.getSession(sid)
      if (full.success && full.data) {
        const serverMsgs = full.data.messages || []
        // 兜底：服务器回传的最后一条用户消息，恢复成「原始输入 + 图片 + 附件名」用于展示，
        // 避免把并入的附件提取文本（很长）显示在气泡里；同时防后端未重启丢 images
        if (images.length > 0 || docNames.length > 0 || messageText) {
          for (let i = serverMsgs.length - 1; i >= 0; i--) {
            if (serverMsgs[i].role === 'user') {
              serverMsgs[i] = {
                ...serverMsgs[i],
                content: messageText,
                images: (serverMsgs[i].images && serverMsgs[i].images!.length > 0) ? serverMsgs[i].images : (images.length > 0 ? images : undefined),
                attachmentNames: docNames.length > 0 ? docNames : undefined,
              }
              break
            }
          }
        }
        setMessages(serverMsgs)
        // 把回滚快照绑定到服务端这条用户消息的真实 id（serverMsgs 替换了本地临时 id）
        if (preSnapshot) {
          const lastUser = [...serverMsgs].reverse().find((m: ChatMessage) => m.role === 'user')
          if (lastUser?.id) setRollbackSnapshot(lastUser.id, preSnapshot)
        }
      } else {
        appendMessage(res.data.message)
      }
      // 服务端真实消息已加载，临时流式消息引用清空
      streamingMsgIdRef.current = null
      await dispatchClientActions(full.success ? full.data?.messages || [] : [], sid)
    } catch (e: any) {
      if (ac.signal.aborted || (e && (e.name === 'AbortError' || /aborted/i.test(String(e.message))))) {
        // 用户主动中断，不报错
        return
      }
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSending(false)
      abortControllerRef.current = null
      inflightSessionIdRef.current = null
      aiAssistantApi.listSessions().then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setSessions(res.data)
        }
      })
      // 若本回合 AI 截取了编辑器界面，回合结束后自动把截图作为图片发给视觉模型分析
      if (autoScreenshotInFlightRef.current) {
        // 本回合就是「截图自动发起」的回合：清除标记，且丢弃此回合内再次截取的图，杜绝无限套娃
        autoScreenshotInFlightRef.current = false
        pendingScreenshotRef.current = null
      } else if (pendingScreenshotRef.current) {
        const shot = pendingScreenshotRef.current
        const caption = pendingScreenshotCaptionRef.current
        pendingScreenshotRef.current = null
        autoScreenshotInFlightRef.current = true
        setTimeout(() => {
          handleSendRef.current?.(caption, [shot])
        }, 300)
      }
    }
  }
  // 持有最新 handleSend 供 ask_ai 事件自动发送
  handleSendRef.current = handleSend

  async function stopCurrent() {    const sid = inflightSessionIdRef.current || currentSessionId
    // 1) 通知后端取消（让正在跑的工具/LLM 调用尽快退出）
    if (sid) {
      try {
        await aiAssistantApi.cancel(sid)
      } catch {}
    }
    // 2) 中断前端的 fetch
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    // 3) UI 立即恢复成"可输入"状态
    setSending(false)
  }

  async function dispatchClientActions(allMessages: ChatMessage[], _sid: string) {
    if (!allMessages || allMessages.length === 0) return
    // 注意：client_action 工具调用现在由后端 socket 通知前端 **即时执行**（见 aiAssistantSkills.ts
    // 中 ai_assistant:client_action_request 监听），此处不再重复派发，仅处理 build_workflow 自动落地。
    const recent = allMessages.slice(-12)
    for (const msg of recent) {
      if (msg.role !== 'assistant' || !msg.tool_calls || !msg.tool_calls.length) continue
      for (const tc of msg.tool_calls) {
        const flagKey = `__client_executed_${tc.id}`
        if ((msg as any)[flagKey]) continue

        // AI 调用 build_workflow：自动把结果装入画布
        if (tc.name === 'build_workflow' && tc.status === 'success' && tc.result) {
          ;(msg as any)[flagKey] = true
          const built: any = tc.result
          if (Array.isArray(built?.nodes) && Array.isArray(built?.edges)) {
            await executeClientAction('load_workflow_from_data', {
              name: built.name || '小助手生成的工作流',
              nodes: built.nodes,
              edges: built.edges,
            })
            await executeClientAction('auto_layout', {})  // ELKJS 分层布局
            await executeClientAction('fit_view', {})
          }
        }
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      handleSend()
    }
  }

  // 受 layoutStore 控制的宽度（用户可拖拽左边缘）
  const aiAssistantWidth = useLayoutStore((s) => s.aiAssistantWidth)
  const setAiAssistantWidth = useLayoutStore((s) => s.setAiAssistantWidth)
  const [draftWidth, setDraftWidth] = useState<number | null>(null)
  const effectiveWidth = draftWidth ?? aiAssistantWidth

  if (!isOpen && !standalone) return null

  return (
    <div
      className={
        standalone
          ? 'fixed inset-0 w-screen h-screen z-50 bg-[hsl(var(--card))] flex flex-col'
          : (
            'fixed top-0 right-0 h-screen z-50 ' +
            'max-w-full responsive-drawer-right ' +
            'bg-[hsl(var(--card))] border-l border-[hsl(var(--border))] shadow-pop-2xl ' +
            'flex flex-col animate-slide-in-right'
          )
      }
      style={
        standalone
          ? undefined
          : {
            width: effectiveWidth,
            transition: draftWidth === null ? 'width 200ms ease-out' : 'none',
          }
      }
    >
      {/* 左边缘拖拽手柄（独立窗口模式不需要） */}
      {!standalone && (
        <PanelResizer
          direction="horizontal"
          side="left"
          size={effectiveWidth}
          minSize={LAYOUT_LIMITS.aiAssistant.min}
          maxSize={LAYOUT_LIMITS.aiAssistant.max}
          factor={-1}
          onLive={(w) => setDraftWidth(w)}
          onCommit={(w) => {
            setAiAssistantWidth(w)
            setDraftWidth(null)
          }}
        />
      )}
      {/* 顶部装饰条 */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[hsl(var(--brand-500))] via-[hsl(var(--brand-400))] to-[hsl(var(--info-500))]" />

      {/* 头部 */}
      <div
        className="flex items-center justify-between px-4 h-14 border-b border-[hsl(var(--border))] flex-shrink-0"
        style={{ background: 'linear-gradient(180deg, hsl(var(--brand-50) / 0.6), hsl(var(--card)))' }}
        {...(standalone && isTauriRuntime() ? { 'data-tauri-drag-region': '' } : {})}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1" {...(standalone && isTauriRuntime() ? { 'data-tauri-drag-region': '' } : {})}>
          {/* 渐变 LOGO 圆环 */}
          <div className="relative flex-shrink-0" {...(standalone && isTauriRuntime() ? { 'data-tauri-drag-region': '' } : {})}>
            <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[hsl(var(--brand-500))] to-[hsl(var(--brand-700))] flex items-center justify-center shadow-brand-glow ring-1 ring-[hsl(var(--brand-500)/0.3)]" {...(standalone && isTauriRuntime() ? { 'data-tauri-drag-region': '' } : {})}>
              <Sparkles className="w-4 h-4 text-white" strokeWidth={2.4} />
            </div>
            {configReady && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[hsl(var(--success-500))] border-2 border-[hsl(var(--card))] shadow-success-glow animate-pulse-ring" />
            )}
          </div>
          <div className="min-w-0" {...(standalone && isTauriRuntime() ? { 'data-tauri-drag-region': '' } : {})}>
            <div className="text-[14px] font-bold leading-tight tracking-tight text-gradient flex items-center gap-1.5 whitespace-nowrap" {...(standalone && isTauriRuntime() ? { 'data-tauri-drag-region': '' } : {})}>
              <span className="truncate">{standalone ? 'WebRPA Agent' : 'WebRPA 小助手'}</span>
            </div>
            <div className="text-[11px] text-[hsl(var(--muted-foreground))] leading-tight truncate mt-0.5 flex items-center gap-1" {...(standalone && isTauriRuntime() ? { 'data-tauri-drag-region': '' } : {})}>
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${configReady ? 'bg-[hsl(var(--success-500))]' : 'bg-[hsl(var(--warning-500))]'}`} />
              <span className="truncate">{configReady ? resolvedConfig.model : '尚未配置模型'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <Button variant="ghost" size="icon-sm" title="新对话" onClick={handleNewSession}>
            <Plus className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant={showSessions ? 'tonal' : 'ghost'}
            size="icon-sm"
            title="历史对话"
            onClick={() => { setShowSessions((v) => !v); setShowTimeline(false) }}
          >
            <History className="w-3.5 h-3.5" />
          </Button>
          {!standalone && (
            <Button
              variant={showTimeline ? 'tonal' : 'ghost'}
              size="icon-sm"
              title="AI 操作时间线（可一键回退）"
              onClick={() => { setShowTimeline((v) => !v); setShowSessions(false) }}
            >
              <Clock className="w-3.5 h-3.5" />
            </Button>
          )}
          {standalone && isTauriRuntime() && (
            <>
              <span className="w-px h-5 bg-[hsl(var(--border))] mx-0.5" />
              <Button
                variant={agentPinned ? 'tonal' : 'ghost'}
                size="icon-sm"
                title={agentPinned ? '取消置顶' : '窗口置顶'}
                onClick={() => { const next = !agentPinned; setAgentPinned(next); agentSetAlwaysOnTop(next) }}
              >
                <Pin className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon-sm" title="最小化" onClick={() => agentMinimize()}>
                <Minus className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon-sm" title="关闭" onClick={() => agentClose()}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
          {!standalone && (
            <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)}>
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* 贴边自动隐藏提示：仅独立 Agent 原生窗口显示，告诉用户把窗口拖到屏幕边缘可自动收起 */}
      {standalone && isTauriRuntime() && showEdgeHint && (
        <div className="flex items-start gap-2 px-3 py-2 bg-[hsl(var(--brand-50))] border-b border-[hsl(var(--brand-500)/0.2)] flex-shrink-0 animate-fade-in-down">
          <PanelRightClose className="w-3.5 h-3.5 text-[hsl(var(--brand-600))] flex-shrink-0 mt-0.5" />
          <span className="text-[11px] leading-snug text-[hsl(var(--brand-700))] flex-1">
            将窗口拖到屏幕左右边缘可自动收起，鼠标移至边缘可重新唤出
          </span>
          <button
            onClick={dismissEdgeHint}
            title="知道了"
            className="flex-shrink-0 p-0.5 rounded text-[hsl(var(--brand-600))] hover:bg-[hsl(var(--brand-100))] transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* 会话列表抽屉 */}
      {showSessions && (
        <div className="border-b border-[hsl(var(--border))] bg-[hsl(var(--slate-50))] max-h-72 overflow-y-auto animate-fade-in-down flex-shrink-0">
          {sessions.length === 0 ? (
            <div className="empty-state py-8">
              <div className="empty-state-icon w-12 h-12 mb-2">
                <History className="w-5 h-5" />
              </div>
              <div className="empty-state-title text-[13px]">暂无历史对话</div>
            </div>
          ) : (
            <div className="py-1.5 space-y-0.5 px-2">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => handleSelectSession(s.id)}
                  className={
                    'group flex items-start gap-2 px-2.5 py-2 cursor-pointer rounded-[8px] transition-all duration-150 ' +
                    (s.id === currentSessionId
                      ? 'bg-[hsl(var(--brand-100))] border border-[hsl(var(--brand-500)/0.3)] shadow-xs'
                      : 'border border-transparent hover:bg-[hsl(var(--card))] hover:border-[hsl(var(--border))] hover:shadow-xs')
                  }
                >
                  <div className="icon-chip icon-chip-brand w-7 h-7 flex-shrink-0">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-medium text-[hsl(var(--slate-800))] truncate">
                      {s.title}
                    </div>
                    <div className="text-[11px] text-[hsl(var(--muted-foreground))] truncate mt-0.5">
                      {s.last_message_preview || `${s.message_count} 条消息`}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSession(s.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-[5px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--danger-600))] hover:bg-[hsl(var(--danger-50))] transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI 操作时间线抽屉：列出小助手改动画布的操作，可一键回退到某步之前 */}
      {showTimeline && (
        <div className="border-b border-[hsl(var(--border))] bg-[hsl(var(--slate-50))] max-h-72 overflow-y-auto animate-fade-in-down flex-shrink-0">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[hsl(var(--border))] sticky top-0 bg-[hsl(var(--slate-50))]">
            <span className="text-[11.5px] font-semibold text-[hsl(var(--slate-700))] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> AI 操作时间线（{aiActions.length}）
            </span>
            {aiActions.length > 0 && (
              <button
                onClick={() => clearAiActions()}
                className="text-[11px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--danger-600))] px-1.5 py-0.5 rounded hover:bg-[hsl(var(--danger-50))] transition-colors"
              >清空记录</button>
            )}
          </div>
          {aiActions.length === 0 ? (
            <div className="empty-state py-8">
              <div className="empty-state-icon w-12 h-12 mb-2"><Clock className="w-5 h-5" /></div>
              <div className="empty-state-title text-[13px]">暂无 AI 画布操作</div>
              <div className="text-[11px] text-[hsl(var(--muted-foreground))] mt-1 px-4 text-center">
                小助手对画布的每次改动都会记录在这里，可一键回退到任意一步之前
              </div>
            </div>
          ) : (
            <div className="py-1.5 space-y-0.5 px-2">
              {[...aiActions].reverse().map((a) => (
                <div
                  key={a.id}
                  className="group flex items-center gap-2 px-2.5 py-2 rounded-[8px] border border-transparent hover:bg-[hsl(var(--card))] hover:border-[hsl(var(--border))] transition-all"
                >
                  <div className="icon-chip icon-chip-brand w-7 h-7 flex-shrink-0">
                    <Undo2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-medium text-[hsl(var(--slate-800))] truncate">{a.label}</div>
                    <div className="text-[10.5px] text-[hsl(var(--muted-foreground))] mt-0.5">
                      {new Date(a.ts).toLocaleTimeString()} · {a.before.nodes.length} 节点
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevertTo(a.id)}
                    title="回退到这一步操作之前的画布状态"
                    className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-1 px-2 py-1 rounded-[6px] text-[11px] font-medium text-[hsl(var(--brand-700))] bg-[hsl(var(--brand-50))] hover:bg-[hsl(var(--brand-100))] transition-all flex-shrink-0"
                  >
                    <Undo2 className="w-3 h-3" /> 回退到此前
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 消息区 */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && !isSending && (
          <div className="min-h-full flex flex-col items-center justify-center text-center px-2 py-4 animate-fade-in-up">
            <div className="relative mb-4 flex-shrink-0">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[hsl(var(--brand-500)/0.4)] to-[hsl(var(--info-500)/0.4)] blur-xl" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-[hsl(var(--brand-500))] to-[hsl(var(--brand-700))] flex items-center justify-center shadow-brand-glow ring-2 ring-[hsl(var(--brand-500)/0.25)]">
                <Sparkles className="w-7 h-7 text-white" strokeWidth={2.2} />
              </div>
            </div>
            <div className="text-[16px] font-bold text-gradient mb-1.5 tracking-tight">
              {standalone ? '你好，我是WebRPA Agent' : '你好，我是 WebRPA 小助手'}
            </div>
            <div className="text-[12.5px] text-[hsl(var(--slate-600))] leading-relaxed max-w-[340px] mb-5">
              {standalone ? (
                <>
                  我是一个<strong className="text-[hsl(var(--brand-700))]">系统级智能 Agent</strong>，能直接操作你的电脑——
                  打开/关闭软件、管理文件、运行命令与脚本、看屏截图、控制鼠标键盘、联网查资料，自己规划步骤、自己执行、自己验证。
                  当然，我也能顺手帮你操作 WebRPA、搭建并运行自动化工作流。
                </>
              ) : (
                <>
                  我了解 WebRPA 的方方面面，能帮你搭建工作流、运行任务、答疑解惑；不止于此，我还能直接操作你的电脑——
                  打开软件、管理文件、执行命令、控制鼠标键盘等都不在话下。
                </>
              )}
            </div>

            <div className="w-full max-w-[360px] space-y-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2 flex items-center gap-1.5">
                <Zap className="w-3 h-3" />
                快速开始
              </div>
              {(standalone ? AGENT_QUICK_PROMPTS : QUICK_PROMPTS).map((q, idx) => {
                const Icon = q.icon
                return (
                  <button
                    key={q.text}
                    onClick={() => handleSend(q.text)}
                    disabled={!configReady || isSending}
                    className="w-full row-card text-left disabled:opacity-50 disabled:cursor-not-allowed text-[12.5px]"
                    style={{ animation: `fadeInUp ${220 + idx * 60}ms cubic-bezier(0.25, 1, 0.5, 1) both` }}
                  >
                    <span className={`icon-chip ${q.color} w-7 h-7`}>
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <span className="flex-1 text-[hsl(var(--slate-700))]">{q.text}</span>
                  </button>
                )
              })}
            </div>

            {/* 使用建议提示卡片：让用户对小助手有合理预期（仅编辑器内嵌面板显示；Agent 窗口聚焦操作电脑，不展示工作流搭建提示） */}
            {!standalone && (
            <div
              className="w-full max-w-[360px] mt-5 rounded-[10px] border border-[hsl(var(--warning-500)/0.3)] bg-[hsl(var(--warning-50))] p-3 text-left"
              style={{ animation: 'fadeInUp 600ms cubic-bezier(0.25, 1, 0.5, 1) both' }}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <Info className="w-3.5 h-3.5 text-[hsl(var(--warning-700))]" />
                <span className="text-[12px] font-semibold text-[hsl(var(--warning-800))]">使用建议</span>
              </div>
              <div className="text-[11.5px] leading-relaxed text-[hsl(var(--slate-700))] space-y-1.5">
                <p>
                  小助手 <strong>无法完全取代人工搭建</strong>，更适合作为你的搭档：先让它快速搭出基本框架或提建议，再由你完善细节。
                </p>
                <p>
                  其智能程度还取决于接入的 AI 模型能力。一次性生成完美工作流很难，因为：
                </p>
                <ul className="list-disc list-inside space-y-0.5 pl-1 text-[11px] text-[hsl(var(--slate-600))]">
                  <li>网页元素 Selector 难以准确预测</li>
                  <li>桌面控件路径需要拾取器实地获取</li>
                  <li>手机屏幕坐标无法凭空判断</li>
                </ul>
                <p className="text-[11px] text-[hsl(var(--slate-600))] mt-1">
                  绝大多数情况下都需要人工干预，请合理预期。
                </p>
              </div>
            </div>
            )}

            {!configReady && (
              <div className="status-row status-row-warning mt-5 max-w-[340px]">
                <Settings className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[12px]">请先在WebRPA编辑器的全局配置中填写模型API</span>
              </div>
            )}
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            onEdit={(t) => { setInput(t); setTimeout(() => textareaRef.current?.focus(), 50) }}
            onResend={(t) => handleSend(t)}
            canRollback={m.role === 'user' && !!getRollbackSnapshot(m.id)}
            onRollback={() => {
              const snap = getRollbackSnapshot(m.id)
              if (!snap) return
              if (!window.confirm('回滚会把画布（节点、连线、全局变量）恢复到这条消息发送之前的状态，并把该消息重新填回输入框，方便你修改后重发。确定回滚吗？')) return
              try {
                useWorkflowStore.getState().restoreSnapshot({ nodes: snap.nodes, edges: snap.edges, name: snap.name, variables: snap.variables })
                setInput(snap.text || '')
                setTimeout(() => textareaRef.current?.focus(), 60)
              } catch { /* ignore */ }
            }}
          />
        ))}
        {isSending && (
          <div className="flex items-center gap-2 pl-11">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--brand-500))] animate-pulse" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--brand-500))] animate-pulse" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--brand-500))] animate-pulse" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-[12px] text-[hsl(var(--muted-foreground))] italic">
              {currentActivity
                ? `小助手正在：${currentActivity}…（可在下方再次发送来打断）`
                : '小助手工作中…可在下方再次发送来打断'}
            </span>
          </div>
        )}
        {error && (
          <div className="status-row status-row-danger animate-fade-in-up">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <div className="flex-1 break-words text-[12px]">{error}</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* AI 操作授权提示：仅在"逐项确认/智能放行"模式下，AI 要操作时弹出 */}
      {pendingApproval && (
        <div className="border-t border-[hsl(var(--warning-500)/0.4)] bg-[hsl(var(--warning-50))] px-3 py-2.5 flex-shrink-0 animate-fade-in-down">
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-[hsl(var(--warning-500)/0.15)] flex items-center justify-center flex-shrink-0 mt-0.5">
              <ShieldQuestion className="w-3.5 h-3.5 text-[hsl(var(--warning-700))]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-semibold text-[hsl(var(--warning-800))]">
                小助手请求授权：{pendingApproval.label}
              </div>
              {pendingApproval.payloadPreview && (
                <div className="text-[10.5px] text-[hsl(var(--slate-600))] mt-0.5 font-mono truncate" title={pendingApproval.payloadPreview}>
                  {pendingApproval.payloadPreview}
                </div>
              )}
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => pendingApproval.resolve(true)}
                  className="px-3 py-1 rounded-[6px] bg-[hsl(var(--brand-600))] hover:bg-[hsl(var(--brand-700))] text-white text-[12px] font-medium transition-colors"
                >
                  允许执行
                </button>
                <button
                  onClick={() => pendingApproval.resolve(false)}
                  className="px-3 py-1 rounded-[6px] bg-[hsl(var(--card))] border border-[hsl(var(--border))] hover:bg-[hsl(var(--slate-100))] text-[hsl(var(--slate-700))] text-[12px] font-medium transition-colors"
                >
                  拒绝（继续任务）
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 输入区 */}
      <div className="border-t border-[hsl(var(--border))] p-3 bg-[hsl(var(--slate-50))] flex-shrink-0">
        {/* 顶部拖拽手柄：上下拖拽改变输入框高度 */}
        <div
          onMouseDown={startComposerResize}
          title="拖拽调整输入框高度"
          className="group/grip -mt-1 mb-1.5 h-2.5 flex items-center justify-center cursor-ns-resize"
        >
          <span className="w-10 h-1 rounded-full bg-[hsl(var(--slate-300))] group-hover/grip:bg-[hsl(var(--brand-500))] transition-colors" />
        </div>
        {/* 常驻使用建议提示条：只在已有消息时显示，避免和欢迎页提示卡重复 */}
        {messages.length > 0 && (
          <div className="mb-2 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-[hsl(var(--slate-700))] px-1 font-semibold">
            <Info className="w-3 h-3 mt-[2px] flex-shrink-0 text-[hsl(var(--warning-600))]" />
            <span>小助手仅作为辅助工具，它并不能完全替代人工！</span>
          </div>
        )}
        {/* 待发送附件预览：图片缩略图 + 文档芯片 */}
        {(attachedImages.length > 0 || attachedDocs.length > 0) && (
          <div className="mb-2 flex items-center gap-2 flex-wrap">
            {attachedImages.map((src, i) => (
              <div key={`img-${i}`} className="relative w-14 h-14 rounded-[8px] overflow-hidden border border-[hsl(var(--border))] group/img">
                <img src={src} alt={`附图${i + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setAttachedImages((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                  title="移除"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
            {attachedDocs.map((d) => (
              <div
                key={d.id}
                className={'relative flex items-center gap-1.5 pl-2 pr-6 py-1.5 rounded-[8px] border text-[11px] max-w-[180px] group/doc ' +
                  (d.status === 'error' ? 'border-[hsl(var(--danger-500)/0.4)] bg-[hsl(var(--danger-50))] text-[hsl(var(--danger-700))]' : 'border-[hsl(var(--border))] bg-[hsl(var(--slate-50))] text-[hsl(var(--slate-700))]')}
                title={d.status === 'error' ? (d.error || '解析失败') : d.name}
              >
                {d.status === 'loading'
                  ? <Square className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                  : <FileText className="w-3.5 h-3.5 flex-shrink-0" />}
                <span className="truncate">{d.name}</span>
                {d.status === 'loading' && <span className="text-[hsl(var(--muted-foreground))]">解析中</span>}
                {d.status === 'error' && <span>失败</span>}
                <button
                  type="button"
                  onClick={() => setAttachedDocs((prev) => prev.filter((x) => x.id !== d.id))}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover/doc:opacity-100 transition-opacity"
                  title="移除"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
            <span className="text-[10.5px] text-[hsl(var(--muted-foreground))]">图片需视觉模型；文档将提取文字发给 AI</span>
          </div>
        )}
        <div
          className={'relative flex flex-col rounded-[10px] border-[1.5px] bg-[hsl(var(--card))] shadow-xs transition-[border-color,box-shadow] duration-150 ' +
            (isDragOver ? 'border-[hsl(var(--brand-500))] ring-2 ring-[hsl(var(--brand-500)/0.25)]' : 'border-[hsl(var(--border))]')}
          onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setIsDragOver(true) } }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false) }}
          onDrop={(e) => { if (e.dataTransfer.files && e.dataTransfer.files.length > 0) { e.preventDefault(); setIsDragOver(false); void addFiles(e.dataTransfer.files) } }}
        >
          {isDragOver && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[10px] bg-[hsl(var(--brand-50)/0.92)] text-[hsl(var(--brand-700))] text-[12.5px] font-semibold pointer-events-none">
              松手上传文件给小助手
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={configReady ? (isSending ? '小助手正在工作中…再次发送会先停止它' : '告诉我你想做什么…（可粘贴/拖拽/上传图片或文档，Enter 发送，Shift+Enter 换行）') : '请先在全局配置中配置模型'}
            disabled={!configReady}
            style={{ height: composerHeight, outline: 'none', boxShadow: 'none' }}
            className="w-full bg-transparent text-[13px] resize-none outline-none placeholder:text-[hsl(var(--muted-foreground))] disabled:opacity-60 px-3 pt-2.5 pb-1 leading-relaxed overflow-y-auto"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.gif,.svg,.webp,.bmp,.pdf,.csv,.doc,.docx,.xls,.xlsx,.html,.htm,.txt,.md,.markdown,.json,.xml,.log,.tsv,.yaml,.yml,image/*"
            multiple
            className="hidden"
            onChange={(e) => { if (e.target.files) { void addFiles(e.target.files); e.target.value = '' } }}
          />
          {/* 操作按钮行：放在输入框下方，输入框占满整行宽度，不再浪费右侧空间 */}
          <div className="flex items-center justify-end gap-1 px-1.5 pb-1.5">
            <Button
              onClick={startVoiceRecording}
              disabled={!configReady || voiceState === 'transcribing'}
              size="icon-sm"
              variant={voiceState === 'recording' ? 'destructive' : 'ghost'}
              title={voiceState === 'recording' ? '停止录音并识别' : (voiceState === 'transcribing' ? '识别中…' : '语音输入（说话指挥）')}
              className={'!h-8 !w-8 flex-shrink-0' + (voiceState === 'recording' ? ' animate-pulse' : '')}
            >
              <Mic className="w-3.5 h-3.5" />
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={!configReady}
              size="icon-sm"
              variant="ghost"
              title="上传图片或文档（pdf/word/excel/csv/txt/md/html 等）发给 AI 分析，也可直接粘贴/拖拽"
              className="!h-8 !w-8 flex-shrink-0"
            >
              <Paperclip className="w-3.5 h-3.5" />
            </Button>
            <Button
              onClick={() => (isSending ? stopCurrent() : handleSend())}
              disabled={!isSending && ((!input.trim() && attachedImages.length === 0 && attachedDocs.length === 0) || !configReady)}
              size="icon-sm"
              variant={isSending ? 'destructive' : 'default'}
              className="!h-8 !w-8 flex-shrink-0"
            >
              {isSending ? (
                <Square className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-[10.5px] text-[hsl(var(--muted-foreground))] px-1">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${resolvedConfig.enable_tools ? 'bg-[hsl(var(--success-500))]' : 'bg-[hsl(var(--slate-400))]'}`} />
            <Wrench className="w-2.5 h-2.5" />
            <span className="font-medium">{resolvedConfig.enable_tools ? 'Skills 已启用' : 'Skills 已关闭'}</span>
          </div>
          {/* 模型一键切换上拉栏 */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowModelMenu((v) => !v)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full hover:bg-[hsl(var(--slate-100))] transition-colors max-w-[200px]"
              title="切换模型"
            >
              <Cpu className="w-3 h-3 flex-shrink-0" />
              <span className="font-medium truncate">
                {autoSceneRoute && assistantModels.length > 0
                  ? '场景自动选模型'
                  : (activeModel ? (activeModel.label || activeModel.model) : (resolvedConfig.model || '未配置'))}
              </span>
              <ChevronUp className={'w-3 h-3 flex-shrink-0 transition-transform ' + (showModelMenu ? 'rotate-180' : '')} />
            </button>
            {showModelMenu && (
              <>
                <div className="fixed inset-0 z-[100]" onClick={() => setShowModelMenu(false)} />
                <div className="absolute bottom-full right-0 mb-1.5 z-[101] w-60 max-h-72 overflow-y-auto rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-pop-2xl p-1.5 animate-fade-in-up">
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">选择模型</div>
                  {assistantModels.length === 0 ? (
                    <div className="px-2 py-2 text-[11.5px] text-[hsl(var(--muted-foreground))]">
                      未配置多模型，当前用：{resolvedConfig.model || '（无）'}
                    </div>
                  ) : (
                    assistantModels.map((m) => {
                      const on = !autoSceneRoute && (activeModel?.id === m.id)
                      return (
                        <button
                          key={m.id}
                          onClick={() => {
                            updateAIAssistantConfig({ activeModelId: m.id, autoSceneRoute: false })
                            setShowModelMenu(false)
                          }}
                          className={'w-full flex items-center gap-2 px-2 py-1.5 rounded-[7px] text-left transition-colors ' + (on ? 'bg-[hsl(var(--brand-100))]' : 'hover:bg-[hsl(var(--slate-100))]')}
                        >
                          <Cpu className="w-3.5 h-3.5 flex-shrink-0 text-[hsl(var(--brand-600))]" />
                          <div className="flex-1 min-w-0">
                            <div className="text-[12px] font-medium text-[hsl(var(--slate-800))] truncate">{m.label || m.model}</div>
                            <div className="text-[10px] text-[hsl(var(--muted-foreground))] truncate">{m.model}{m.scenes && m.scenes.length > 0 ? ' · ' + m.scenes.map((s) => s === 'vision' ? '多模态' : s === 'thinking' ? '深度思考' : '普通').join('/') : ''}</div>
                          </div>
                          {on && <Check className="w-3.5 h-3.5 text-[hsl(var(--brand-600))] flex-shrink-0" />}
                        </button>
                      )
                    })
                  )}
                  {assistantModels.length > 0 && (
                    <button
                      onClick={() => {
                        updateAIAssistantConfig({ autoSceneRoute: !autoSceneRoute })
                      }}
                      className={'w-full flex items-center gap-2 px-2 py-1.5 mt-1 rounded-[7px] text-left transition-colors border-t border-[hsl(var(--border))] ' + (autoSceneRoute ? 'bg-[hsl(var(--brand-100))]' : 'hover:bg-[hsl(var(--slate-100))]')}
                    >
                      <Sparkles className="w-3.5 h-3.5 flex-shrink-0 text-[hsl(var(--brand-600))]" />
                      <span className="flex-1 text-[12px] text-[hsl(var(--slate-800))]">按场景自动选模型</span>
                      {autoSceneRoute && <Check className="w-3.5 h-3.5 text-[hsl(var(--brand-600))]" />}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
