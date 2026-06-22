import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { nanoid } from 'nanoid'
import { Circle, Square, X, MousePointerClick, Type, Keyboard, Wand2, Pause, Play } from 'lucide-react'
import { desktopRecorderApi } from '@/services/api'
import { useWorkflowStore, moduleTypeLabels } from '@/store/workflowStore'
import { emitAssistantUiEvent } from '@/services/aiAssistantSkills'
import { Checkbox } from '@/components/ui/checkbox'

interface DeskEvent {
  type: 'click' | 'type' | 'hotkey'
  x?: number
  y?: number
  button?: string
  window?: string
  control?: string
  controlType?: string
  automationId?: string
  className?: string
  text?: string
  keys?: string
  ts?: number
}

interface Props {
  open: boolean
  onClose: () => void
}

const META: Record<string, { icon: any; label: string; color: string }> = {
  click: { icon: MousePointerClick, label: '点击', color: 'text-indigo-500' },
  type: { icon: Type, label: '输入', color: 'text-emerald-500' },
  hotkey: { icon: Keyboard, label: '按键', color: 'text-amber-500' },
}

export function DesktopRecorderPanel({ open, onClose }: Props) {
  const [recording, setRecording] = useState(false)
  const [paused, setPaused] = useState(false)
  const [semantic, setSemantic] = useState(true)
  const [autoWait, setAutoWait] = useState(true)
  const [events, setEvents] = useState<DeskEvent[]>([])
  const [busy, setBusy] = useState(false)
  const pollRef = useRef<number | null>(null)
  const eventsRef = useRef<DeskEvent[]>([])
  const addLog = useWorkflowStore((s) => s.addLog)

  useEffect(() => { eventsRef.current = events }, [events])

  const stopPolling = useCallback(() => {
    if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null }
  }, [])

  const appendEvents = useCallback((incoming: DeskEvent[]) => {
    if (!incoming?.length) return
    setEvents((prev) => {
      const next = [...prev]
      for (const ev of incoming) {
        const last = next[next.length - 1]
        // 连续 type 合并为一条
        if (ev.type === 'type' && last && last.type === 'type') {
          next[next.length - 1] = { ...last, text: (last.text || '') + (ev.text || '') }
        } else {
          next.push(ev)
        }
      }
      return next
    })
  }, [])

  const startRec = useCallback(async () => {
    setBusy(true)
    try {
      const res = await desktopRecorderApi.start()
      if (res.data?.success === false || res.error) {
        addLog({ level: 'error', message: `桌面录制启动失败: ${res.data?.error || res.error}` })
        return
      }
      setEvents([])
      setRecording(true)
      setPaused(false)
      addLog({ level: 'info', message: '桌面录制中：在任意窗口操作鼠标键盘，完成后点停止' })
      pollRef.current = window.setInterval(async () => {
        const r = await desktopRecorderApi.events()
        if (r.data?.data?.length) appendEvents(r.data.data as DeskEvent[])
      }, 700)
    } finally {
      setBusy(false)
    }
  }, [addLog, appendEvents])

  const stopRec = useCallback(async () => {
    setBusy(true)
    stopPolling()
    try {
      const res = await desktopRecorderApi.stop()
      if (res.data?.data?.length) appendEvents(res.data.data as DeskEvent[])
      setRecording(false)
      setPaused(false)
      addLog({ level: 'info', message: '桌面录制已停止' })
    } finally {
      setBusy(false)
    }
  }, [addLog, appendEvents, stopPolling])

  const togglePause = useCallback(async () => {
    if (paused) {
      await desktopRecorderApi.resume(); setPaused(false)
      addLog({ level: 'info', message: '已恢复录制' })
    } else {
      await desktopRecorderApi.pause(); setPaused(true)
      addLog({ level: 'info', message: '已暂停录制（期间操作不记录）' })
    }
  }, [paused, addLog])

  useEffect(() => () => stopPolling(), [stopPolling])

  const generateNodes = useCallback(async () => {
    const evs = eventsRef.current
    if (!evs.length) {
      addLog({ level: 'warning', message: '没有录制到任何操作' })
      return
    }
    const newNodes: any[] = []
    const newEdges: any[] = []
    let prevId: string | null = null

    const mkNode = (moduleType: string, cfg: Record<string, any>, name?: string) => {
      const id = nanoid()
      newNodes.push({
        id, type: 'moduleNode',
        position: { x: 320, y: 100 + newNodes.length * 120 },
        data: {
          label: (moduleTypeLabels as Record<string, string>)[moduleType] || moduleType,
          moduleType,
          ...(name ? { name } : {}),
          ...cfg,
        },
      })
      if (prevId) newEdges.push({ id: `e-${prevId}-${id}`, source: prevId, target: id })
      prevId = id
    }

    let curWindow: string | null = null
    for (let idx = 0; idx < evs.length; idx++) {
      const ev = evs[idx]
      // 自动等待：按真实操作间隔插入等待节点（桌面无自动等待，停顿很关键）
      // 桌面事件 ts 为秒
      if (autoWait && idx > 0) {
        const gap = (ev.ts || 0) - (evs[idx - 1].ts || 0)
        if (gap >= 0.3) {
          mkNode('wait', { duration: Math.min(Math.round(gap * 1000), 30000) })
        }
      }
      if (ev.type === 'click') {
        const hasControl = semantic && !!(ev.control || ev.automationId)
        if (hasControl) {
          if (ev.window && ev.window !== curWindow) {
            curWindow = ev.window
            mkNode('desktop_app_connect', {
              connectType: 'title', connectValue: ev.window, saveToVariable: 'desktop_app',
            }, ev.window.slice(0, 20))
          }
          const pathKey = ev.automationId ? `automationid:${ev.automationId}` : `name:${ev.control}`
          mkNode('desktop_find_control', {
            appVariable: 'desktop_app', findType: 'control_path',
            controlPath: pathKey, saveToVariable: 'desktop_control',
          }, ev.control ? ev.control.slice(0, 20) : ev.automationId)
          mkNode('desktop_click_control', {
            controlVariable: 'desktop_control',
            clickType: ev.button === 'right' ? 'right' : 'single',
          }, ev.control ? ev.control.slice(0, 16) : undefined)
        } else {
          const label = ev.control ? ev.control.slice(0, 20) : `(${ev.x},${ev.y})`
          mkNode('real_mouse_click', {
            x: String(ev.x ?? 0), y: String(ev.y ?? 0),
            button: ev.button || 'left', clickType: 'single',
          }, label)
        }
      } else if (ev.type === 'type') {
        if (!ev.text) continue
        mkNode('real_keyboard', { inputType: 'text', text: ev.text })
      } else if (ev.type === 'hotkey') {
        if (!ev.keys) continue
        mkNode('real_keyboard', { inputType: 'key', key: ev.keys.toLowerCase() }, ev.keys)
      }
    }

    if (!newNodes.length) {
      addLog({ level: 'warning', message: '录制事件无法转换为有效节点' })
      return
    }
    const store = useWorkflowStore.getState()
    store.loadWorkflow({
      nodes: [...store.nodes, ...newNodes] as any,
      edges: [...store.edges, ...newEdges] as any,
      name: store.name,
    })
    try { await store.autoLayoutNodes({ direction: 'DOWN' }) } catch {}
    emitAssistantUiEvent('fit_view', {})
    addLog({ level: 'success', message: `已根据桌面录制生成 ${newNodes.length} 个节点` })
    setEvents([])
    onClose()
  }, [addLog, onClose, semantic, autoWait])

  if (!open) return null

  return createPortal(
    <div className="fixed right-4 top-20 z-[9999] w-[360px] max-h-[70vh] flex flex-col rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-2xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))]">
        <div className="flex items-center gap-2">
          <MousePointerClick className="w-4 h-4 text-red-500" />
          <span className="font-medium text-sm">桌面智能录制</span>
          {recording && (
            <span className="flex items-center gap-1 text-[11px]">
              <span className={`inline-block w-2 h-2 rounded-full ${paused ? 'bg-amber-500' : 'bg-red-500 animate-pulse'}`} />
              <span className={paused ? 'text-amber-600' : 'text-red-600'}>{paused ? '已暂停' : '录制中'} · {events.length}</span>
            </span>
          )}
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-[hsl(var(--accent))]"><X className="w-4 h-4" /></button>
      </div>

      <div className="px-4 py-2 text-[11px] text-[hsl(var(--muted-foreground))] border-b border-[hsl(var(--border))] flex items-center justify-between gap-2">
        <span>记录鼠标键盘操作，自动生成节点</span>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1 cursor-pointer whitespace-nowrap" title="按真实操作间隔插入等待节点，保留你录制时的节奏">
            <Checkbox checked={autoWait} onCheckedChange={(c) => setAutoWait(c)} disabled={recording} className="h-3.5 w-3.5" />
            自动等待
          </label>
          <label className="flex items-center gap-1 cursor-pointer whitespace-nowrap" title="开启后优先用控件名/类型语义定位（换分辨率仍可用），取不到控件时回退坐标">
            <Checkbox checked={semantic} onCheckedChange={(c) => setSemantic(c)} disabled={recording} className="h-3.5 w-3.5" />
            语义优先
          </label>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {events.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-8">
            {recording ? '正在录制，去操作你的桌面应用…' : '点「开始录制」后操作桌面，步骤会实时出现在这里'}
          </div>
        ) : events.map((ev, i) => {
          const m = META[ev.type]
          const Icon = m?.icon || MousePointerClick
          let desc = ''
          if (ev.type === 'click') desc = ev.control ? `${ev.control}` : `(${ev.x}, ${ev.y})`
          else if (ev.type === 'type') desc = ev.text || ''
          else if (ev.type === 'hotkey') desc = ev.keys || ''
          return (
            <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-[hsl(var(--accent))]">
              <Icon className={`w-3.5 h-3.5 shrink-0 ${m?.color || ''}`} />
              <span className="text-muted-foreground shrink-0">{m?.label}</span>
              <span className="truncate">{desc}</span>
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-2 px-3 py-2 border-t border-[hsl(var(--border))]">
        {!recording ? (
          <button disabled={busy} onClick={startRec} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50">
            <Circle className="w-3.5 h-3.5 fill-current" /> 开始录制
          </button>
        ) : (
          <button disabled={busy} onClick={stopRec} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-700 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50">
            <Square className="w-3.5 h-3.5 fill-current" /> 停止
          </button>
        )}
        {recording && (
          <button onClick={togglePause} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[hsl(var(--border))] text-sm font-medium hover:bg-[hsl(var(--accent))]" title={paused ? '恢复' : '暂停'}>
            {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
        )}
        <button disabled={recording || busy || !events.length} onClick={generateNodes} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg gradient-primary text-white text-sm font-medium disabled:opacity-50">
          <Wand2 className="w-3.5 h-3.5" /> 生成节点
        </button>
      </div>

      <div className="px-4 py-2 border-t border-[hsl(var(--border))] text-[11px] text-[hsl(var(--muted-foreground))]">
        共 {events.length} 步 · 停止后点「生成节点」追加到画布
      </div>
    </div>,
    document.body
  )
}
