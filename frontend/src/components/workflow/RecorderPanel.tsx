import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { nanoid } from 'nanoid'
import { Circle, Square, X, MousePointerClick, Type, ChevronDown, CheckSquare, Globe, Wand2, Trash2, ArrowUp, ArrowDown, Clock, Keyboard, Move, Upload } from 'lucide-react'
import { recorderApi, browserApi } from '@/services/api'
import { useWorkflowStore, moduleTypeLabels } from '@/store/workflowStore'
import { emitAssistantUiEvent } from '@/services/aiAssistantSkills'
import { applySerpentineLayout } from '@/lib/recorderLayout'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { Checkbox } from '@/components/ui/checkbox'

interface RecEvent {
  type: 'navigate' | 'click' | 'dblclick' | 'input' | 'select' | 'check' | 'keypress' | 'drag' | 'upload'
  selector?: string
  targetSelector?: string
  hints?: Record<string, any>
  targetHints?: Record<string, any>
  value?: any
  values?: string[]
  text?: string
  url?: string
  key?: string
  fileName?: string
  endX?: number
  endY?: number
  ts?: number
  sensitive?: boolean
  _frame?: { main?: boolean; index?: number; name?: string; selector?: string }
}

interface RecorderPanelProps {
  open: boolean
  onClose: () => void
}

const EVENT_META: Record<string, { icon: any; label: string; color: string }> = {
  navigate: { icon: Globe, label: '打开网页', color: 'text-blue-500' },
  click: { icon: MousePointerClick, label: '点击', color: 'text-indigo-500' },
  dblclick: { icon: MousePointerClick, label: '双击', color: 'text-indigo-500' },
  input: { icon: Type, label: '输入', color: 'text-emerald-500' },
  select: { icon: ChevronDown, label: '下拉选择', color: 'text-violet-500' },
  check: { icon: CheckSquare, label: '勾选', color: 'text-amber-500' },
  keypress: { icon: Keyboard, label: '按键', color: 'text-rose-500' },
  drag: { icon: Move, label: '拖拽', color: 'text-teal-500' },
  upload: { icon: Upload, label: '上传文件', color: 'text-orange-500' },
}

export function RecorderPanel({ open, onClose }: RecorderPanelProps) {
  const [recording, setRecording] = useState(false)
  const [events, setEvents] = useState<RecEvent[]>([])
  const [busy, setBusy] = useState(false)
  const [autoWait, setAutoWait] = useState(true)
  const pollRef = useRef<number | null>(null)
  const eventsRef = useRef<RecEvent[]>([])
  const addLog = useWorkflowStore((s) => s.addLog)
  const { alert: alertDialog, ConfirmDialog } = useConfirm()

  useEffect(() => { eventsRef.current = events }, [events])

  // 编辑：删除某步
  const deleteEvent = useCallback((idx: number) => {
    setEvents((prev) => prev.filter((_, i) => i !== idx))
  }, [])
  // 编辑：上移/下移
  const moveEvent = useCallback((idx: number, dir: -1 | 1) => {
    setEvents((prev) => {
      const j = idx + dir
      if (j < 0 || j >= prev.length) return prev
      const next = [...prev]
      const tmp = next[idx]; next[idx] = next[j]; next[j] = tmp
      return next
    })
  }, [])

  // 合并追加：连续的同选择器 input 只保留最后一次（需同一 frame，避免跨 frame 误合并）
  const appendEvents = useCallback((incoming: RecEvent[]) => {
    if (!incoming || !incoming.length) return
    const frameSig = (e?: RecEvent) => JSON.stringify(e?._frame || null)
    setEvents((prev) => {
      const next = [...prev]
      for (const ev of incoming) {
        const last = next[next.length - 1]
        if (ev.type === 'input' && last && last.type === 'input' && last.selector === ev.selector && frameSig(last) === frameSig(ev)) {
          next[next.length - 1] = ev
        } else if (ev.type === 'dblclick') {
          // 双击：移除紧邻的同选择器单击（跨轮询批次时后端可能已 drain，这里再兜底一次）
          let removed = 0
          while (next.length && removed < 2) {
            const l = next[next.length - 1]
            if (l && l.type === 'click' && l.selector === ev.selector) { next.pop(); removed++ }
            else break
          }
          next.push(ev)
        } else if (ev.type === 'navigate' && last && last.type === 'navigate' && last.url === ev.url) {
          // 跳过重复导航
        } else {
          next.push(ev)
        }
      }
      return next
    })
  }, [])

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }, [])

  const startRecording = useCallback(async () => {
    setBusy(true)
    try {
      // 录制前先检查自动化浏览器是否已启动，未启动则明确提示（不用浏览器原生弹窗）
      try {
        const st: any = await browserApi.getStatus()
        if (!st?.data?.isOpen) {
          setBusy(false)
          await alertDialog('请先启动自动化浏览器，再开始录制。可点击工具栏的「打开浏览器」按钮启动后重试。', {
            title: '自动化浏览器未启动', confirmText: '我知道了',
          })
          return
        }
      } catch {
        // 状态查询失败不阻断，继续尝试启动（由后端兜底返回错误）
      }
      const res: any = await recorderApi.start()
      if (res?.error || res?.success === false || res?.data?.success === false) {
        const errMsg = res?.data?.error || res?.error || '未知错误'
        setBusy(false)
        // 后端兜底：没有活跃浏览器等错误，用醒目弹窗提示
        await alertDialog(String(errMsg).includes('浏览器') ? '请先启动自动化浏览器，再开始录制。' : `录制启动失败：${errMsg}`, {
          title: '无法开始录制', confirmText: '我知道了',
        })
        addLog({ level: 'error', message: `录制启动失败：${errMsg}` })
        return
      }
      setEvents([])
      setRecording(true)
      addLog({ level: 'success', message: '已开始录制，请在浏览器中操作（点击/输入/选择）' })
      // 轮询排空事件（注意：apiRequest 返回 {success,data:响应体}，事件在 r.data.data）
      pollRef.current = window.setInterval(async () => {
        try {
          const r: any = await recorderApi.events()
          const arr = r?.data?.data
          if (Array.isArray(arr) && arr.length) appendEvents(arr)
        } catch {}
      }, 700)
    } catch (e) {
      addLog({ level: 'error', message: `录制启动异常：${e}` })
    } finally {
      setBusy(false)
    }
  }, [addLog, appendEvents, alertDialog])

  const stopRecording = useCallback(async () => {
    setBusy(true)
    stopPolling()
    try {
      const r: any = await recorderApi.stop()
      const remaining = (r?.data?.data?.events as RecEvent[]) || []
      if (remaining.length) appendEvents(remaining)
      setRecording(false)
      addLog({ level: 'info', message: '录制已停止' })
    } catch (e) {
      addLog({ level: 'error', message: `停止录制异常：${e}` })
      setRecording(false)
    } finally {
      setBusy(false)
    }
  }, [addLog, appendEvents, stopPolling])

  // 事件 → 节点
  const generateNodes = useCallback(async () => {
    const evs = eventsRef.current
    if (!evs.length) {
      addLog({ level: 'warning', message: '没有录制到任何操作' })
      return
    }
    const newNodes: any[] = []
    const newEdges: any[] = []
    let prevId: string | null = null
    let lastNavUrl: string | null = null
    let seenFirstNav = false      // 是否已生成过初始"打开网页"
    let lastActionTs = 0          // 最近一次可能触发跳转的交互(click/回车)时间戳
    let curFrameKey = '__main__'  // 当前所处 frame（回放上下文），'__main__' 表示主文档

    const mkNode = (moduleType: string, cfg: Record<string, any>, name?: string) => {
      const id = nanoid()
      const node = {
        id,
        type: 'moduleNode',
        position: { x: 320, y: 100 + newNodes.length * 120 },
        data: {
          label: (moduleTypeLabels as Record<string, string>)[moduleType] || moduleType,
          moduleType,
          ...(name ? { name } : {}),
          ...cfg,
        },
      }
      newNodes.push(node)
      if (prevId) newEdges.push({ id: `e-${prevId}-${id}`, source: prevId, target: id })
      prevId = id
      return node
    }

    // frame 身份 key：selector 最稳，其次 name，其次 index
    const frameKeyOf = (ev: RecEvent): string => {
      const f = ev._frame
      if (!f || f.main) return '__main__'
      if (f.selector) return 'sel:' + f.selector
      if (f.name) return 'name:' + f.name
      if (typeof f.index === 'number' && f.index >= 0) return 'idx:' + f.index
      return '__main__'
    }
    // 若事件所属 frame 与当前上下文不同，插入 switch_iframe / switch_to_main 节点
    const ensureFrame = (ev: RecEvent) => {
      const key = frameKeyOf(ev)
      if (key === curFrameKey) return
      if (key === '__main__') {
        mkNode('switch_to_main', {})
      } else {
        const f = ev._frame!
        if (f.selector) mkNode('switch_iframe', { locateBy: 'selector', iframeSelector: f.selector }, 'iframe')
        else if (f.name) mkNode('switch_iframe', { locateBy: 'name', iframeName: f.name }, 'iframe')
        else mkNode('switch_iframe', { locateBy: 'index', iframeIndex: f.index ?? 0 }, 'iframe')
      }
      curFrameKey = key
    }

    for (let idx = 0; idx < evs.length; idx++) {
      const ev = evs[idx]
      // 自动插入等待：与上一步时间间隔较大时补一个延迟节点
      if (autoWait && idx > 0) {
        const prevTs = evs[idx - 1].ts || 0
        const gap = (ev.ts || 0) - prevTs
        if (gap >= 1500) {
          // 传秒（wait 执行器新字段单位为秒），并限幅到 3 秒——
          // 元素级等待已由执行器 auto-wait 保证，不必把用户思考的停顿全等上
          mkNode('wait', { duration: Math.min(Math.max(1, Math.round(gap / 1000)), 3) })
        }
      }
      if (ev.type === 'navigate') {
        // iframe 内导航是页面内部行为，忽略
        if (ev._frame && !ev._frame.main) continue
        const u = ev.url || ''
        if (!u || u.startsWith('about:')) continue
        if (seenFirstNav && u === lastNavUrl) continue  // 同 URL 重复导航
        lastNavUrl = u
        curFrameKey = '__main__'  // 页面变化后回放上下文回到主文档
        if (!seenFirstNav) {
          // 首个导航 = 录制起始页面 → 生成"打开网页"
          seenFirstNav = true
          mkNode('open_page', { url: u })
        } else if (lastActionTs && (ev.ts || 0) - lastActionTs < 10000) {
          // 由点击/回车等交互引起的跳转（含重定向链）→ 不单独生成节点，
          // 点击节点回放时会自然触发跳转（新标签页由后续节点 switch_to_latest 处理）
          continue
        } else {
          // 与任何交互无因果关系的导航（如用户在地址栏主动输入 URL）→ 生成"打开网页"
          mkNode('open_page', { url: u })
        }
      } else if (ev.type === 'click') {
        if (!ev.selector) continue
        ensureFrame(ev)
        lastActionTs = ev.ts || 0
        mkNode('click_element', { selector: ev.selector, ...(ev.hints ? { selectorHints: ev.hints } : {}) }, ev.text ? ev.text.slice(0, 20) : undefined)
      } else if (ev.type === 'dblclick') {
        if (!ev.selector) continue
        ensureFrame(ev)
        lastActionTs = ev.ts || 0
        mkNode('click_element', { selector: ev.selector, clickType: 'double', ...(ev.hints ? { selectorHints: ev.hints } : {}) }, ev.text ? ev.text.slice(0, 20) : undefined)
      } else if (ev.type === 'input') {
        if (!ev.selector) continue
        ensureFrame(ev)
        // typeSequential：逐字键入，忠实还原用户打字触发的联想/校验等行为
        mkNode('input_text', { selector: ev.selector, text: String(ev.value ?? ''), typeSequential: true, ...(ev.hints ? { selectorHints: ev.hints } : {}) })
      } else if (ev.type === 'select') {
        if (!ev.selector) continue
        ensureFrame(ev)
        const selCfg = Array.isArray(ev.values) && ev.values.length > 1
          ? { selector: ev.selector, values: ev.values }                       // 多选下拉：选中全部
          : { selector: ev.selector, value: String(ev.value ?? '') }
        mkNode('select_dropdown', { ...selCfg, ...(ev.hints ? { selectorHints: ev.hints } : {}) }, ev.text ? ev.text.slice(0, 20) : undefined)
      } else if (ev.type === 'check') {
        if (!ev.selector) continue
        ensureFrame(ev)
        mkNode('set_checkbox', { selector: ev.selector, checked: !!ev.value, ...(ev.hints ? { selectorHints: ev.hints } : {}) })
      } else if (ev.type === 'drag') {
        if (!ev.selector) continue
        ensureFrame(ev)
        lastActionTs = ev.ts || 0
        // 源与目标是同一元素(如滑块) → 用坐标拖拽(targetPosition)，否则元素到元素拖拽
        const sameEl = !ev.targetSelector || ev.selector === ev.targetSelector
        const dragCfg = sameEl && ev.endX != null
          ? { sourceSelector: ev.selector, targetPosition: { x: ev.endX, y: ev.endY ?? 0 }, ...(ev.hints ? { selectorHints: ev.hints } : {}) }
          : {
              sourceSelector: ev.selector,
              targetSelector: ev.targetSelector,
              ...(ev.hints ? { selectorHints: ev.hints } : {}),
              ...(ev.targetHints ? { targetSelectorHints: ev.targetHints } : {}),
            }
        mkNode('drag_element', dragCfg, ev.text ? ev.text.slice(0, 20) : undefined)
      } else if (ev.type === 'upload') {
        if (!ev.selector) continue
        ensureFrame(ev)
        // 浏览器安全限制拿不到真实路径，生成占位节点（filePath 留空，用户补填）
        mkNode('upload_file', { selector: ev.selector, filePath: '', ...(ev.hints ? { selectorHints: ev.hints } : {}) }, ev.fileName ? ev.fileName.slice(0, 20) : undefined)
      } else if (ev.type === 'keypress') {
        if (!ev.key) continue
        ensureFrame(ev)
        // 回车/Tab 可能触发表单提交跳转，视为"可致跳转的交互"
        if (ev.key === 'Enter' || ev.key === 'Tab' || /Enter$/.test(ev.key)) lastActionTs = ev.ts || 0
        // 若按键发生在具体输入元素上，用 element 目标模式（先聚焦该元素再按键），忠实还原作用目标
        const keyCfg = ev.selector ? { keySequence: ev.key, targetType: 'element', selector: ev.selector } : { keySequence: ev.key }
        mkNode('keyboard_action', keyCfg, ev.key)
      }
    }

    if (!newNodes.length) {
      addLog({ level: 'warning', message: '录制事件无法转换为有效节点' })
      return
    }

    const store = useWorkflowStore.getState()
    // 蛇形（横向长方形）排版：录制链纯竖排太长，改为逐行折返、连线自动拐弯
    applySerpentineLayout(newNodes as any, store.nodes as any)
    store.loadWorkflow({
      nodes: [...store.nodes, ...newNodes] as any,
      edges: [...store.edges, ...newEdges] as any,
      name: store.name,
    })
    emitAssistantUiEvent('fit_view', {})
    addLog({ level: 'success', message: `已根据录制生成 ${newNodes.length} 个节点` })
    setEvents([])
    onClose()
  }, [addLog, onClose, autoWait])

  // 关闭面板时清理
  useEffect(() => {
    if (!open) {
      stopPolling()
      if (recording) { recorderApi.stop().catch(() => {}); setRecording(false) }
    }
    return () => stopPolling()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  return (
    <>
    {createPortal(
    <div className="fixed bottom-20 right-5 z-[1000] w-[340px] rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: '70vh' }}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--brand-50))]">
        <Wand2 className="w-4 h-4 text-[hsl(var(--brand-600))]" />
        <span className="font-semibold text-sm">智能录制器</span>
        {recording && <span className="ml-1 flex items-center gap-1 text-xs text-red-500"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />录制中</span>}
        <button className="ml-auto p-1 rounded hover:bg-[hsl(var(--muted))]" onClick={onClose}><X className="w-4 h-4" /></button>
      </div>

      <div className="px-4 py-2 border-b border-[hsl(var(--border))] flex gap-2">
        {!recording ? (
          <button disabled={busy} onClick={startRecording} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50">
            <Circle className="w-3.5 h-3.5 fill-current" /> 开始录制
          </button>
        ) : (
          <button disabled={busy} onClick={stopRecording} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-700 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50">
            <Square className="w-3.5 h-3.5 fill-current" /> 停止录制
          </button>
        )}
        <button disabled={recording || busy || !events.length} onClick={generateNodes} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg gradient-primary text-white text-sm font-medium disabled:opacity-50">
          <Wand2 className="w-3.5 h-3.5" /> 生成节点
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 min-h-[80px]">
        {events.length === 0 ? (
          <div className="text-center text-xs text-[hsl(var(--muted-foreground))] py-8 px-3">
            {recording ? '在浏览器里操作，步骤会实时出现在这里…' : '点击「开始录制」，然后在自动化浏览器里点击 / 输入 / 选择 / 按键，WebRPA 会自动记录成步骤。跳转新页面、新标签页也会持续录制。'}
          </div>
        ) : (
          <ol className="space-y-1">
            {events.map((ev, i) => {
              const meta = EVENT_META[ev.type] || EVENT_META.click
              const Icon = meta.icon
              const detail = ev.type === 'navigate' ? ev.url
                : ev.type === 'input' ? (ev.sensitive ? '••••••（密码已隐藏）' : `"${String(ev.value ?? '').slice(0, 24)}"`)
                : ev.type === 'select' ? (ev.text || String(ev.value ?? ''))
                : ev.type === 'check' ? (ev.value ? '勾选' : '取消勾选')
                : ev.type === 'keypress' ? ev.key
                : ev.type === 'drag' ? `${ev.text || ev.selector} → ${ev.targetSelector}`
                : ev.type === 'upload' ? (ev.fileName ? ev.fileName + '（需补填路径）' : '需补填文件路径')
                : (ev.text || ev.selector)
              return (
                <li key={i} className="group flex items-start gap-2 px-2 py-1.5 rounded hover:bg-[hsl(var(--muted))] text-xs">
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))] w-4 text-right pt-0.5">{i + 1}</span>
                  <Icon className={`w-3.5 h-3.5 mt-0.5 flex-none ${meta.color}`} />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{meta.label}</div>
                    <div className="text-[hsl(var(--muted-foreground))] truncate" title={ev.selector || ev.url}>{detail}</div>
                  </div>
                  {!recording && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-none">
                      <button onClick={() => moveEvent(i, -1)} disabled={i === 0} title="上移" className="p-1 rounded hover:bg-[hsl(var(--accent))] disabled:opacity-30"><ArrowUp className="w-3 h-3" /></button>
                      <button onClick={() => moveEvent(i, 1)} disabled={i === events.length - 1} title="下移" className="p-1 rounded hover:bg-[hsl(var(--accent))] disabled:opacity-30"><ArrowDown className="w-3 h-3" /></button>
                      <button onClick={() => deleteEvent(i)} title="删除此步" className="p-1 rounded hover:bg-red-50 text-red-500"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </div>

      <div className="px-4 py-2 border-t border-[hsl(var(--border))] flex items-center justify-between text-[11px] text-[hsl(var(--muted-foreground))]">
        <span>共 {events.length} 步{recording ? ' · 录制中' : ' · 可拖删/排序后生成'}</span>
        <label className="flex items-center gap-1 cursor-pointer" title="按操作间隔自动插入等待节点">
          <Checkbox checked={autoWait} onCheckedChange={(c) => setAutoWait(c)} className="h-3.5 w-3.5" />
          <Clock className="w-3 h-3" />自动等待
        </label>
      </div>
    </div>,
    document.body,
    )}
    <ConfirmDialog />
    </>
  )
}
