/**
 * 颜色选择器组件（WebRPA 主题 · 无浏览器原生取色控件）
 *
 * 弹层用 Portal + fixed 定位渲染到 body，避免被窄侧栏/弹窗的 overflow 裁剪
 * （这是「设计器左栏背景色选择器展开后显示不全」的根因）。
 * 提供预设色板（一键选）+ 十六进制输入（精确自定义）。
 */
import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Palette } from 'lucide-react'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  label?: string
}

const PRESET_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E', '#10B981', '#14B8A6', '#06B6D4',
  '#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E', '#64748B',
  '#0F172A', '#334155', '#94A3B8', '#E2E8F0', '#FFFFFF', '#000000',
]

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)

  const openPop = () => {
    const r = triggerRef.current?.getBoundingClientRect()
    if (r) setPos({ x: r.left, y: r.bottom + 6 })
    setOpen((o) => !o)
  }

  const W = 232, H = 240
  const left = Math.max(8, Math.min(pos.x, window.innerWidth - W - 8))
  const top = Math.max(8, Math.min(pos.y, window.innerHeight - H - 8))

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium text-[hsl(var(--foreground))]">{label}</label>}
      <div
        ref={triggerRef}
        role="button"
        tabIndex={0}
        className="w-full flex items-center justify-start gap-2 px-3 py-2 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] hover:bg-[hsl(var(--muted))] cursor-pointer transition-colors"
        onClick={openPop}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPop() } }}
      >
        <span className="w-5 h-5 rounded border border-[hsl(var(--border))] shadow-sm flex-shrink-0" style={{ backgroundColor: value || '#ffffff' }} />
        <span className="flex-1 text-left font-mono text-sm truncate">{value || '#ffffff'}</span>
        <Palette className="w-4 h-4 text-[hsl(var(--muted-foreground))] flex-shrink-0" />
      </div>
      {open && createPortal(
        <>
          <div className="fixed inset-0" style={{ zIndex: 2147483646 }} onClick={() => setOpen(false)} />
          <div
            className="fixed rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-pop-2xl p-3 animate-scale-in"
            style={{ zIndex: 2147483647, left, top, width: W }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[11px] text-[hsl(var(--muted-foreground))] mb-1.5">预设颜色</div>
            <div className="grid grid-cols-8 gap-1.5 mb-2.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  onClick={() => onChange(c)}
                  className={'w-5 h-5 rounded-md transition-transform hover:scale-110 ' +
                    ((value || '').toLowerCase() === c.toLowerCase()
                      ? 'ring-2 ring-[hsl(var(--brand-500))] ring-offset-1 border border-white'
                      : 'border border-[hsl(var(--border))]')}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="text-[11px] text-[hsl(var(--muted-foreground))] mb-1.5 pt-2 border-t border-[hsl(var(--border))]">自定义（十六进制）</div>
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-md border border-[hsl(var(--border))] flex-shrink-0" style={{ backgroundColor: value || '#ffffff' }} />
              <input
                type="text"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder="#000000"
                className="flex-1 min-w-0 px-2 py-1.5 rounded-md bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-sm font-mono focus:outline-none focus:border-[hsl(var(--brand-500))]"
              />
            </div>
          </div>
        </>,
        document.body,
      )}
    </div>
  )
}
