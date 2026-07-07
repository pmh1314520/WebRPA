import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { nanoid } from 'nanoid'
import { Circle, Square, X, MousePointerClick, Type, Keyboard, Wand2, Pause, Play, Move, MoveVertical, MousePointer2 } from 'lucide-react'
import { desktopRecorderApi } from '@/services/api'
import { useWorkflowStore, moduleTypeLabels } from '@/store/workflowStore'
import { emitAssistantUiEvent } from '@/services/aiAssistantSkills'
import { applySerpentineLayout } from '@/lib/recorderLayout'
import { Checkbox } from '@/components/ui/checkbox'

interface DeskEvent {
  type: 'click' | 'type' | 'hotkey' | 'drag' | 'scroll' | 'move'
  x?: number
  y?: number
  x2?: number
  y2?: number
  dy?: number
  button?: string
  window?: string
  control?: string
  controlType?: string
  automationId?: string
  className?: string
  text?: string
  keys?: string
  combo?: boolean
  double?: boolean
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
  drag: { icon: Move, label: '拖拽', color: 'text-teal-500' },
  scroll: { icon: MoveVertical, label: '滚动', color: 'text-cyan-500' },
  move: { icon: MousePointer2, label: '移动', color: 'text-slate-400' },
}

export function DesktopRecorderPanel({ open, onClose }: Props) {
  const [recording, setRecording] = useState(false)
  const [paused, setPaused] = useState(false)
  const [semantic, setSemantic] = useState(true)
  const [autoWait, setAutoWait] = useState(true)
  const [recordMove, setRecordMove] = useState(true)
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
        } else if (
          ev.type === 'click' && last && last.type === 'click' && !last.double &&
          last.button === ev.button &&
          Math.abs((last.x ?? 0) - (ev.x ?? 0)) <= 6 && Math.abs((last.y ?? 0) - (ev.y ?? 0)) <= 6 &&
          (ev.ts ?? 0) - (last.ts ?? 0) <= 0.4
        ) {
          // 同位置、同键、0.4s 内的两次点击 → 合并为双击
          next[next.length - 1] = { ...last, double: true, ts: ev.ts }
        } else if (
          ev.type === 'scroll' && last && last.type === 'scroll' &&
          (((last.dy ?? 0) > 0) === ((ev.dy ?? 0) > 0))
        ) {
          // 跨批次连续同向滚动合并
          next[next.length - 1] = { ...last, dy: (last.dy ?? 0) + (ev.dy ?? 0), ts: ev.ts }
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
      // 传入自身窗口标题，让录制器忽略对 WebRPA 界面的操作（如点"停止录制"按钮）
      const excl = [document.title, 'WebRPA'].filter(Boolean)
      const res = await desktopRecorderApi.start(excl, recordMove)
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
  }, [addLog, appendEvents, recordMove])

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
      // 与项目默认连线一致：smoothstep + 流光动画
      if (prevId) newEdges.push({ id: `e-${prevId}-${id}`, source: prevId, target: id, type: 'smoothstep', animated: true })
      prevId = id
    }

    let curWindow: string | null = null
    for (let idx = 0; idx < evs.length; idx++) {
      const ev = evs[idx]
      // 自动等待：按真实操作间隔插入等待节点（桌面无自动等待，停顿很关键）
      // 桌面事件 ts 为秒
      if (autoWait && idx > 0) {
        // 桌面 ts 为秒；wait 执行器对 <1000 的数值按"秒"处理，故直接传秒（限幅 30s）
        const gap = (ev.ts || 0) - (evs[idx - 1].ts || 0)
        if (gap >= 0.3) {
          mkNode('wait', { duration: Math.min(Math.round(gap * 10) / 10, 30) })
        }
      }
      if (ev.type === 'click') {
        const clickType = ev.double ? 'double' : (ev.button === 'right' ? 'right' : 'single')
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
            controlVariable: 'desktop_control', clickType,
          }, ev.control ? ev.control.slice(0, 16) : undefined)
        } else {
          const label = ev.control ? ev.control.slice(0, 20) : `(${ev.x},${ev.y})`
          mkNode('real_mouse_click', {
            x: String(ev.x ?? 0), y: String(ev.y ?? 0),
            button: ev.button || 'left', clickType,
          }, label)
        }
      } else if (ev.type === 'drag') {
        // 桌面拖拽：起点→终点坐标（换分辨率会失效，属坐标类操作固有限制）
        mkNode('real_mouse_drag', {
          startX: String(ev.x ?? 0), startY: String(ev.y ?? 0),
          endX: String(ev.x2 ?? 0), endY: String(ev.y2 ?? 0),
          button: ev.button || 'left',
        }, `(${ev.x},${ev.y})→(${ev.x2},${ev.y2})`)
      } else if (ev.type === 'scroll') {
        const dir = (ev.dy ?? 0) < 0 ? 'down' : 'up'   // pynput：dy<0 向下
        const count = Math.max(1, Math.round(Math.abs(ev.dy ?? 1)))
        mkNode('real_mouse_scroll', { direction: dir, scrollAmount: 3, scrollCount: count })
      } else if (ev.type === 'move') {
        mkNode('real_mouse_move', { x: String(ev.x ?? 0), y: String(ev.y ?? 0), duration: 0 }, `(${ev.x},${ev.y})`)
      } else if (ev.type === 'type') {
        if (!ev.text) continue
        mkNode('real_keyboard', { inputType: 'text', text: ev.text })
      } else if (ev.type === 'hotkey') {
        if (!ev.keys) continue
        // 组合键用 hotkey 模式（ctrl+c）；单个功能键用 key 模式（enter）
        if (ev.combo) mkNode('real_keyboard', { inputType: 'hotkey', hotkey: ev.keys.toLowerCase() }, ev.keys)
        else mkNode('real_keyboard', { inputType: 'key', key: ev.keys.toLowerCase() }, ev.keys)
      }
    }

    if (!newNodes.length) {
      addLog({ level: 'warning', message: '录制事件无法转换为有效节点' })
      return
    }
    const store = useWorkflowStore.getState()
    // 蛇形（横向长方形）排版，替代原竖排线性布局
    applySerpentineLayout(newNodes as any, store.nodes as any)
    store.loadWorkflow({
      nodes: [...store.nodes, ...newNodes] as any,
      edges: [...store.edges, ...newEdges] as any,
      name: store.name,
    })
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
          <label className="flex items-center gap-1 cursor-pointer whitespace-nowrap" title="记录鼠标移动轨迹（全局完整录制）。关闭后只录点击/输入等有效操作">
            <Checkbox checked={recordMove} onCheckedChange={(c) => setRecordMove(c)} disabled={recording} className="h-3.5 w-3.5" />
            记录移动
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
          if (ev.type === 'click') desc = (ev.double ? '双击 ' : '') + (ev.control ? `${ev.control}` : `(${ev.x}, ${ev.y})`)
          else if (ev.type === 'type') desc = ev.text || ''
          else if (ev.type === 'hotkey') desc = ev.keys || ''
          else if (ev.type === 'drag') desc = `(${ev.x},${ev.y}) → (${ev.x2},${ev.y2})`
          else if (ev.type === 'scroll') desc = `${(ev.dy ?? 0) < 0 ? '向下' : '向上'}滚动`
          else if (ev.type === 'move') desc = `(${ev.x}, ${ev.y})`
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
