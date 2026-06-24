import { useRef, useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { systemApi } from '@/services/api'
import { getBackendBaseUrl } from '@/services/config'
import { ColorPicker } from '@/components/ui/color-picker'
import { X, Type, Image as ImageIcon, Minus, Square, MousePointerClick, Activity, Trash2, Loader2, FolderOpen, Layers } from 'lucide-react'

/* ============================================================
   EXE 运行界面 可视化设计器（自由画布拖拽摆放控件）
   产出布局 JSON：{ width, height, bg, widgets: [...] }
   打包时随 ui_config.layout 一起带进 EXE，运行时用 tkinter 按坐标渲染。
   ============================================================ */

export type ExeWidget = {
  id: string
  type: 'text' | 'image' | 'progress' | 'status' | 'panel' | 'button'
  x: number
  y: number
  w: number
  h: number
  text?: string
  fontSize?: number
  color?: string
  bg?: string
  bold?: boolean
  align?: 'left' | 'center' | 'right'
  src?: string       // image：本地路径（打包时复制进运行时）
}

export type ExeLayout = {
  width: number
  height: number
  bg: string
  widgets: ExeWidget[]
}

interface Props {
  isOpen: boolean
  initial?: ExeLayout | null
  onClose: () => void
  onApply: (layout: ExeLayout) => void
}

const uid = () => 'w_' + Math.random().toString(36).slice(2, 9)

/* ---------- 内置界面模板（一键套用后可再微调）---------- */
type Template = { key: string; name: string; build: () => ExeLayout }

const TEMPLATES: Template[] = [
  {
    key: 'classic', name: '经典蓝',
    build: () => ({
      width: 520, height: 360, bg: '#ffffff',
      widgets: [
        { id: uid(), type: 'panel', x: 0, y: 0, w: 520, h: 76, bg: '#2563eb' },
        { id: uid(), type: 'text', x: 20, y: 16, w: 480, h: 30, text: '自动化程序', color: '#ffffff', fontSize: 16, bold: true, align: 'left' },
        { id: uid(), type: 'text', x: 20, y: 48, w: 480, h: 20, text: '正在为您自动执行任务，请稍候…', color: '#eaf1ff', fontSize: 11, align: 'left' },
        { id: uid(), type: 'status', x: 20, y: 250, w: 480, h: 24, text: '正在运行…', color: '#334155', fontSize: 12, align: 'center' },
        { id: uid(), type: 'progress', x: 50, y: 290, w: 420, h: 8, bg: '#2563eb' },
      ],
    }),
  },
  {
    key: 'minimal', name: '极简浅色',
    build: () => ({
      width: 480, height: 300, bg: '#f8fafc',
      widgets: [
        { id: uid(), type: 'panel', x: 0, y: 0, w: 480, h: 4, bg: '#0ea5e9' },
        { id: uid(), type: 'text', x: 0, y: 64, w: 480, h: 34, text: '任务执行中', color: '#0f172a', fontSize: 20, bold: true, align: 'center' },
        { id: uid(), type: 'status', x: 0, y: 122, w: 480, h: 22, text: '正在运行…', color: '#64748b', fontSize: 12, align: 'center' },
        { id: uid(), type: 'progress', x: 80, y: 172, w: 320, h: 6, bg: '#0ea5e9' },
      ],
    }),
  },
  {
    key: 'dark', name: '深色科技',
    build: () => ({
      width: 540, height: 340, bg: '#0f172a',
      widgets: [
        { id: uid(), type: 'text', x: 0, y: 56, w: 540, h: 36, text: 'AUTOMATION', color: '#22d3ee', fontSize: 22, bold: true, align: 'center' },
        { id: uid(), type: 'text', x: 0, y: 98, w: 540, h: 20, text: '自动化任务运行中', color: '#94a3b8', fontSize: 12, align: 'center' },
        { id: uid(), type: 'status', x: 0, y: 184, w: 540, h: 24, text: '正在运行…', color: '#e2e8f0', fontSize: 13, align: 'center' },
        { id: uid(), type: 'progress', x: 90, y: 234, w: 360, h: 8, bg: '#22d3ee' },
      ],
    }),
  },
  {
    key: 'brand', name: '品牌大图',
    build: () => ({
      width: 520, height: 400, bg: '#ffffff',
      widgets: [
        { id: uid(), type: 'image', x: 160, y: 30, w: 200, h: 120, src: '' },
        { id: uid(), type: 'text', x: 0, y: 168, w: 520, h: 30, text: '公司自动化助手', color: '#111827', fontSize: 18, bold: true, align: 'center' },
        { id: uid(), type: 'status', x: 0, y: 252, w: 520, h: 22, text: '正在运行…', color: '#64748b', fontSize: 12, align: 'center' },
        { id: uid(), type: 'progress', x: 60, y: 300, w: 400, h: 8, bg: '#7c3aed' },
        { id: uid(), type: 'text', x: 0, y: 362, w: 520, h: 18, text: '© 你的公司 · 技术支持', color: '#cbd5e1', fontSize: 9, align: 'center' },
      ],
    }),
  },
  {
    key: 'confirm', name: '完成确认',
    build: () => ({
      width: 500, height: 340, bg: '#ffffff',
      widgets: [
        { id: uid(), type: 'panel', x: 0, y: 0, w: 500, h: 70, bg: '#16a34a' },
        { id: uid(), type: 'text', x: 20, y: 22, w: 460, h: 28, text: '批处理任务', color: '#ffffff', fontSize: 16, bold: true, align: 'left' },
        { id: uid(), type: 'status', x: 0, y: 132, w: 500, h: 24, text: '正在运行…', color: '#334155', fontSize: 13, align: 'center' },
        { id: uid(), type: 'progress', x: 70, y: 178, w: 360, h: 8, bg: '#16a34a' },
        { id: uid(), type: 'button', x: 190, y: 262, w: 120, h: 36, text: '完成后关闭', bg: '#16a34a', fontSize: 13 },
      ],
    }),
  },
]

const DEFAULT_LAYOUT: ExeLayout = TEMPLATES[0].build()

const WIDGET_LABELS: Record<ExeWidget['type'], string> = {
  text: '文本', image: '图片', progress: '进度条', status: '状态文字', panel: '色块面板', button: '按钮',
}

export function ExeUiDesigner({ isOpen, initial, onClose, onApply }: Props) {
  const [layout, setLayout] = useState<ExeLayout>(initial && initial.widgets?.length ? initial : DEFAULT_LAYOUT)
  const [selId, setSelId] = useState<string | null>(null)
  const dragRef = useRef<{ id: string; ox: number; oy: number; sx: number; sy: number } | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [picking, setPicking] = useState(false)

  useEffect(() => {
    if (isOpen && initial && initial.widgets?.length) setLayout(initial)
  }, [isOpen, initial])

  const sel = layout.widgets.find((w) => w.id === selId) || null

  const updateWidget = useCallback((id: string, patch: Partial<ExeWidget>) => {
    setLayout((L) => ({ ...L, widgets: L.widgets.map((w) => (w.id === id ? { ...w, ...patch } : w)) }))
  }, [])

  const addWidget = (type: ExeWidget['type']) => {
    const base: ExeWidget = {
      id: uid(), type, x: 40, y: 110, w: type === 'progress' ? 300 : 200, h: type === 'progress' ? 8 : (type === 'image' ? 120 : 28),
      text: type === 'text' ? '文本' : type === 'button' ? '关闭' : type === 'status' ? '正在运行…' : '',
      color: '#111827', bg: type === 'panel' ? '#e5e7eb' : type === 'progress' ? '#2563eb' : type === 'button' ? '#2563eb' : '#ffffff',
      fontSize: 13, align: 'center', bold: false,
    }
    setLayout((L) => ({ ...L, widgets: [...L.widgets, base] }))
    setSelId(base.id)
  }

  const delWidget = (id: string) => {
    setLayout((L) => ({ ...L, widgets: L.widgets.filter((w) => w.id !== id) }))
    if (selId === id) setSelId(null)
  }

  const applyTemplate = (t: Template) => {
    setLayout(t.build())
    setSelId(null)
  }

  // 拖拽移动
  const onWidgetMouseDown = (e: React.MouseEvent, w: ExeWidget) => {
    e.stopPropagation()
    setSelId(w.id)
    dragRef.current = { id: w.id, ox: w.x, oy: w.y, sx: e.clientX, sy: e.clientY }
  }
  useEffect(() => {
    const move = (e: MouseEvent) => {
      const d = dragRef.current
      if (!d) return
      const nx = Math.max(0, Math.min(layout.width, Math.round(d.ox + (e.clientX - d.sx))))
      const ny = Math.max(0, Math.min(layout.height, Math.round(d.oy + (e.clientY - d.sy))))
      updateWidget(d.id, { x: nx, y: ny })
    }
    const up = () => { dragRef.current = null }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
  }, [layout.width, layout.height, updateWidget])

  const pickImage = async (id: string) => {
    setPicking(true)
    try {
      const res = await systemApi.selectFile('选择图片 (PNG / GIF)', undefined, [['图片', '*.png;*.gif']])
      if (res.data?.success && res.data.path) updateWidget(id, { src: res.data.path })
    } catch { /* ignore */ } finally { setPicking(false) }
  }

  if (!isOpen) return null

  const renderWidget = (w: ExeWidget) => {
    const selected = w.id === selId
    const common: React.CSSProperties = {
      position: 'absolute', left: w.x, top: w.y, width: w.w, height: w.h,
      outline: selected ? '2px solid #2563eb' : '1px dashed rgba(100,116,139,0.4)',
      cursor: 'move', boxSizing: 'border-box', overflow: 'hidden',
      display: 'flex', alignItems: 'center',
      justifyContent: w.align === 'center' ? 'center' : w.align === 'right' ? 'flex-end' : 'flex-start',
    }
    let inner: React.ReactNode = null
    if (w.type === 'panel') {
      return <div key={w.id} style={{ ...common, background: w.bg, alignItems: undefined, justifyContent: undefined }} onMouseDown={(e) => onWidgetMouseDown(e, w)} />
    }
    if (w.type === 'progress') {
      return (
        <div key={w.id} style={{ ...common, background: '#e5e7eb', borderRadius: 99 }} onMouseDown={(e) => onWidgetMouseDown(e, w)}>
          <div style={{ width: '45%', height: '100%', background: w.bg, borderRadius: 99 }} />
        </div>
      )
    }
    if (w.type === 'image') {
      inner = w.src
        ? <img src={`${getBackendBaseUrl()}/api/system/local-image?path=${encodeURIComponent(String(w.src))}`} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onError={(ev) => { (ev.target as HTMLImageElement).style.display = 'none' }} />
        : <span style={{ fontSize: 11, color: '#94a3b8' }}>图片（选择 PNG/GIF）</span>
      return <div key={w.id} style={{ ...common, justifyContent: 'center' }} onMouseDown={(e) => onWidgetMouseDown(e, w)}>{inner}</div>
    }
    if (w.type === 'button') {
      return (
        <div key={w.id} style={{ ...common, background: w.bg, color: '#fff', borderRadius: 8, justifyContent: 'center', fontSize: w.fontSize, fontWeight: w.bold ? 700 : 400, fontFamily: '"Microsoft YaHei", sans-serif' }} onMouseDown={(e) => onWidgetMouseDown(e, w)}>
          {w.text}
        </div>
      )
    }
    // text / status
    return (
      <div key={w.id} style={{ ...common, color: w.color, background: w.bg && w.bg !== '#ffffff' ? w.bg : 'transparent', fontSize: w.fontSize, fontWeight: w.bold ? 700 : 400, fontFamily: '"Microsoft YaHei", sans-serif' }} onMouseDown={(e) => onWidgetMouseDown(e, w)}>
        <span style={{ width: '100%', textAlign: w.align, padding: '0 4px' }}>{w.text}{w.type === 'status' ? '（运行时实时更新）' : ''}</span>
      </div>
    )
  }

  return createPortal(
    <div className="fixed inset-0 bg-[hsl(217_45%_15%_/_0.6)] backdrop-blur-[3px] flex items-center justify-center p-4" style={{ zIndex: 2147483647 }} onClick={onClose}>
      <div className="modern-dialog w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[hsl(var(--border))]">
          <Layers className="w-4 h-4 text-[hsl(var(--brand-600))]" />
          <span className="font-semibold flex-1 text-sm">EXE 运行界面设计器（拖拽摆放控件）</span>
          <button className="p-1.5 rounded-md hover:bg-[hsl(var(--muted))]" onClick={onClose}><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 flex min-h-0">
          {/* 左侧：控件库 */}
          <div className="w-36 border-r border-[hsl(var(--border))] p-2 space-y-1.5 overflow-y-auto">
            <div className="text-[10.5px] font-semibold text-[hsl(var(--muted-foreground))] uppercase px-1">快速模板</div>
            {TEMPLATES.map((t) => (
              <button key={t.key} onClick={() => applyTemplate(t)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md border border-[hsl(var(--border))] hover:bg-[hsl(var(--brand-50))] text-[12px] text-left">
                <span className="w-3 h-3 rounded-sm flex-shrink-0 border border-[hsl(var(--border))]" style={{ background: t.build().bg }} />
                {t.name}
              </button>
            ))}
            <div className="pt-2 mt-2 border-t border-[hsl(var(--border))] space-y-1.5">
              <div className="text-[10.5px] font-semibold text-[hsl(var(--muted-foreground))] uppercase px-1">添加控件</div>
              {([['text', Type], ['image', ImageIcon], ['progress', Minus], ['status', Activity], ['panel', Square], ['button', MousePointerClick]] as const).map(([t, Icon]) => (
                <button key={t} onClick={() => addWidget(t)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md border border-[hsl(var(--border))] hover:bg-[hsl(var(--brand-50))] text-[12px] text-left">
                  <Icon className="w-3.5 h-3.5 text-[hsl(var(--brand-600))]" /> {WIDGET_LABELS[t]}
                </button>
              ))}
            </div>
            <div className="pt-2 mt-2 border-t border-[hsl(var(--border))] space-y-1.5">
              <div className="text-[10.5px] font-semibold text-[hsl(var(--muted-foreground))] uppercase px-1">画布</div>
              <label className="text-[11px] text-[hsl(var(--muted-foreground))] px-1">宽</label>
              <input type="number" className="w-full px-2 py-1 rounded-md bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[12px]"
                value={layout.width} onChange={(e) => setLayout((L) => ({ ...L, width: Math.max(200, parseInt(e.target.value) || 520) }))} />
              <label className="text-[11px] text-[hsl(var(--muted-foreground))] px-1">高</label>
              <input type="number" className="w-full px-2 py-1 rounded-md bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[12px]"
                value={layout.height} onChange={(e) => setLayout((L) => ({ ...L, height: Math.max(150, parseInt(e.target.value) || 360) }))} />
              <label className="text-[11px] text-[hsl(var(--muted-foreground))] px-1">背景色</label>
              <div className="px-1">
                <ColorPicker value={layout.bg} onChange={(v) => setLayout((L) => ({ ...L, bg: v }))} />
              </div>
            </div>
          </div>

          {/* 中间：画布 */}
          <div className="flex-1 overflow-auto p-6 bg-[hsl(var(--slate-100))] flex items-start justify-center">
            <div
              ref={canvasRef}
              className="relative shadow-pop-xl"
              style={{ width: layout.width, height: layout.height, background: layout.bg, flexShrink: 0 }}
              onMouseDown={() => setSelId(null)}
            >
              {layout.widgets.map(renderWidget)}
            </div>
          </div>

          {/* 右侧：属性 */}
          <div className="w-56 border-l border-[hsl(var(--border))] p-2.5 space-y-2 overflow-y-auto text-[12px]">
            {!sel ? (
              <div className="text-[11.5px] text-[hsl(var(--muted-foreground))] py-4 text-center">点击画布上的控件以编辑属性<br />（拖动可移动位置）</div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[hsl(var(--slate-700))]">{WIDGET_LABELS[sel.type]} 属性</span>
                  <button onClick={() => delWidget(sel.id)} className="p-1 rounded text-[hsl(var(--danger-600))] hover:bg-[hsl(var(--danger-50))]" title="删除控件"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['x', 'y', 'w', 'h'] as const).map((k) => (
                    <div key={k}>
                      <label className="text-[10.5px] text-[hsl(var(--muted-foreground))] uppercase">{k}</label>
                      <input type="number" className="w-full px-2 py-1 rounded-md bg-[hsl(var(--background))] border border-[hsl(var(--border))]"
                        value={sel[k]} onChange={(e) => updateWidget(sel.id, { [k]: Math.max(0, parseInt(e.target.value) || 0) } as Partial<ExeWidget>)} />
                    </div>
                  ))}
                </div>
                {(sel.type === 'text' || sel.type === 'status' || sel.type === 'button') && (
                  <>
                    <label className="text-[10.5px] text-[hsl(var(--muted-foreground))]">文字</label>
                    <input type="text" className="w-full px-2 py-1 rounded-md bg-[hsl(var(--background))] border border-[hsl(var(--border))]"
                      value={sel.text || ''} onChange={(e) => updateWidget(sel.id, { text: e.target.value })} />
                    <div className="flex gap-1.5">
                      <div className="flex-1">
                        <label className="text-[10.5px] text-[hsl(var(--muted-foreground))]">字号</label>
                        <input type="number" className="w-full px-2 py-1 rounded-md bg-[hsl(var(--background))] border border-[hsl(var(--border))]"
                          value={sel.fontSize || 13} onChange={(e) => updateWidget(sel.id, { fontSize: Math.max(8, parseInt(e.target.value) || 13) })} />
                      </div>
                      <button onClick={() => updateWidget(sel.id, { bold: !sel.bold })}
                        className={'mt-4 px-2.5 rounded-md border text-[12px] font-bold ' + (sel.bold ? 'bg-[hsl(var(--brand-500))] text-white border-[hsl(var(--brand-500))]' : 'border-[hsl(var(--border))]')}>B</button>
                    </div>
                    <label className="text-[10.5px] text-[hsl(var(--muted-foreground))]">对齐</label>
                    <div className="flex gap-1">
                      {(['left', 'center', 'right'] as const).map((a) => (
                        <button key={a} onClick={() => updateWidget(sel.id, { align: a })}
                          className={'flex-1 px-1 py-1 rounded-md border text-[11px] ' + ((sel.align || 'left') === a ? 'bg-[hsl(var(--brand-500))] text-white border-[hsl(var(--brand-500))]' : 'border-[hsl(var(--border))]')}>{a === 'left' ? '左' : a === 'center' ? '中' : '右'}</button>
                      ))}
                    </div>
                  </>
                )}
                {(sel.type === 'text' || sel.type === 'status') && (
                  <div>
                    <label className="text-[10.5px] text-[hsl(var(--muted-foreground))]">文字颜色</label>
                    <ColorPicker value={sel.color || '#111827'} onChange={(v) => updateWidget(sel.id, { color: v })} />
                  </div>
                )}
                {(sel.type === 'panel' || sel.type === 'progress' || sel.type === 'button') && (
                  <div>
                    <label className="text-[10.5px] text-[hsl(var(--muted-foreground))]">{sel.type === 'progress' ? '进度条颜色' : sel.type === 'button' ? '按钮颜色' : '填充色'}</label>
                    <ColorPicker value={sel.bg || '#2563eb'} onChange={(v) => updateWidget(sel.id, { bg: v })} />
                  </div>
                )}
                {sel.type === 'image' && (
                  <div>
                    <label className="text-[10.5px] text-[hsl(var(--muted-foreground))]">图片（PNG / GIF）</label>
                    <button onClick={() => pickImage(sel.id)} disabled={picking}
                      className="w-full px-2 py-1.5 rounded-md border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] inline-flex items-center justify-center gap-1.5 text-[12px] disabled:opacity-60">
                      {picking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderOpen className="w-3.5 h-3.5" />} 选择图片
                    </button>
                    {sel.src && <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1 break-all">{sel.src}</div>}
                  </div>
                )}
                {sel.type === 'status' && <div className="text-[10px] text-[hsl(var(--brand-600))]">该控件运行时会自动显示实时状态（运行中/完成/失败）</div>}
                {sel.type === 'progress' && <div className="text-[10px] text-[hsl(var(--brand-600))]">该控件运行时会自动随执行进度滚动</div>}
                {sel.type === 'button' && <div className="text-[10px] text-[hsl(var(--brand-600))]">运行结束后点击此按钮可关闭窗口</div>}
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-t border-[hsl(var(--border))]">
          <span className="text-[11px] text-[hsl(var(--muted-foreground))]">共 {layout.widgets.length} 个控件 · 拖动控件移动位置，右侧编辑属性</span>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 rounded-md border border-[hsl(var(--border))] text-sm" onClick={onClose}>取消</button>
            <button className="px-3 py-1.5 rounded-md bg-[hsl(var(--brand-600))] text-white text-sm" onClick={() => { onApply(layout); onClose() }}>应用到打包</button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
