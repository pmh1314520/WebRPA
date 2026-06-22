import * as React from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

/**
 * ColorField - WebRPA 主题完全自绘颜色选择器
 * 不使用任何浏览器原生控件（无 <input type=color> / range）：
 *  - 饱和度/明度方块（指针拖拽）
 *  - 色相竖条（指针拖拽）
 *  - 十六进制文本输入
 *  - 预设色板
 *
 * 触发器为一个色块；点击弹出选择面板。值为 #RRGGBB。
 */

const PRESETS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E',
  '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
  '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E', '#64748B',
  '#000000', '#FFFFFF',
]

function clamp(n: number, a: number, b: number) { return Math.min(b, Math.max(a, n)) }

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let h = (hex || '').replace('#', '').trim()
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return { r: 0, g: 0, b: 0 }
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) }
}
function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase()
}
function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  const s = max === 0 ? 0 : d / max
  return { h, s, v: max }
}
function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x } else if (h < 120) { r = x; g = c }
  else if (h < 180) { g = c; b = x } else if (h < 240) { g = x; b = c }
  else if (h < 300) { r = x; b = c } else { r = c; b = x }
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 }
}

function ColorPanel({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const rgb = hexToRgb(value)
  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b)
  // 用本地 hue/sv 状态保留色相（避免黑白时色相丢失）
  const [h, setH] = React.useState(hsv.h)
  const [s, setS] = React.useState(hsv.s)
  const [v, setV] = React.useState(hsv.v)
  const [hex, setHex] = React.useState(value)

  React.useEffect(() => {
    // 外部值变化时同步（仅当与当前换算出的不一致）
    const cur = rgbToHex(...(Object.values(hsvToRgb(h, s, v)) as [number, number, number]))
    if (value && value.toUpperCase() !== cur) {
      const r2 = hexToRgb(value)
      const n = rgbToHsv(r2.r, r2.g, r2.b)
      setH(n.h); setS(n.s); setV(n.v); setHex(value.toUpperCase())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const emit = (nh: number, ns: number, nv: number) => {
    const c = hsvToRgb(nh, ns, nv)
    const hx = rgbToHex(c.r, c.g, c.b)
    setHex(hx)
    onChange(hx)
  }

  const svRef = React.useRef<HTMLDivElement>(null)
  const hueRef = React.useRef<HTMLDivElement>(null)

  const handleSv = (clientX: number, clientY: number) => {
    const el = svRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const ns = clamp((clientX - rect.left) / rect.width, 0, 1)
    const nv = clamp(1 - (clientY - rect.top) / rect.height, 0, 1)
    setS(ns); setV(nv); emit(h, ns, nv)
  }
  const handleHue = (clientY: number) => {
    const el = hueRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const nh = clamp((clientY - rect.top) / rect.height, 0, 1) * 360
    setH(nh); emit(nh, s, v)
  }

  const dragSv = (e: React.PointerEvent) => {
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    handleSv(e.clientX, e.clientY)
    const move = (ev: PointerEvent) => handleSv(ev.clientX, ev.clientY)
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
  }
  const dragHue = (e: React.PointerEvent) => {
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    handleHue(e.clientY)
    const move = (ev: PointerEvent) => handleHue(ev.clientY)
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
  }

  const hueColor = (() => { const c = hsvToRgb(h, 1, 1); return rgbToHex(c.r, c.g, c.b) })()

  const commitHex = (raw: string) => {
    let hx = raw.trim()
    if (!hx.startsWith('#')) hx = '#' + hx
    if (/^#[0-9a-fA-F]{6}$/.test(hx)) {
      const r = hexToRgb(hx); const n = rgbToHsv(r.r, r.g, r.b)
      setH(n.h); setS(n.s); setV(n.v); setHex(hx.toUpperCase()); onChange(hx.toUpperCase())
    } else {
      setHex(raw)
    }
  }

  return (
    <div className="w-[220px] select-none space-y-2.5">
      <div className="flex gap-2">
        {/* SV 方块 */}
        <div
          ref={svRef}
          onPointerDown={dragSv}
          className="relative flex-1 h-[140px] rounded-[8px] cursor-crosshair overflow-hidden touch-none"
          style={{ backgroundColor: hueColor }}
        >
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #fff, transparent)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #000, transparent)' }} />
          <div
            className="absolute w-3 h-3 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)] pointer-events-none -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${s * 100}%`, top: `${(1 - v) * 100}%` }}
          />
        </div>
        {/* 色相竖条 */}
        <div
          ref={hueRef}
          onPointerDown={dragHue}
          className="relative w-4 h-[140px] rounded-[8px] cursor-pointer touch-none"
          style={{ background: 'linear-gradient(to bottom, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)' }}
        >
          <div
            className="absolute left-1/2 w-5 h-[6px] rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)] pointer-events-none -translate-x-1/2 -translate-y-1/2"
            style={{ top: `${(h / 360) * 100}%` }}
          />
        </div>
      </div>

      {/* hex 输入 */}
      <div className="flex items-center gap-2">
        <span className="h-7 w-7 rounded-[6px] border border-[hsl(var(--border))] shrink-0" style={{ backgroundColor: hex }} />
        <input
          value={hex}
          onChange={(e) => commitHex(e.target.value)}
          spellCheck={false}
          className="flex-1 h-7 rounded-[6px] border border-[hsl(var(--slate-200))] bg-[hsl(var(--slate-50))] px-2 text-[12px] font-mono uppercase outline-none focus:border-[hsl(var(--brand-500))] focus:ring-2 focus:ring-[hsl(var(--brand-500)/0.18)]"
        />
      </div>

      {/* 预设 */}
      <div className="grid grid-cols-10 gap-1">
        {PRESETS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => commitHex(c)}
            className="h-4 w-4 rounded-[4px] border border-[hsl(var(--border))] hover:scale-110 transition-transform"
            style={{ backgroundColor: c }}
            title={c}
          />
        ))}
      </div>
    </div>
  )
}

export interface ColorFieldProps {
  value: string
  onChange: (v: string) => void
  className?: string
  /** 触发器样式：swatch 只显示色块；full 显示色块+hex 文本 */
  variant?: 'swatch' | 'full'
  disabled?: boolean
}

export function ColorField({ value, onChange, className, variant = 'full', disabled }: ColorFieldProps) {
  const [open, setOpen] = React.useState(false)
  return (
    <div className={cn('relative inline-block', variant === 'full' && 'w-full', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild disabled={disabled}>
          {variant === 'swatch' ? (
            <button
              type="button"
              className="h-7 w-9 rounded-[6px] border border-[hsl(var(--slate-300))] shadow-[inset_0_1px_2px_rgb(15_23_42_/_0.08)] cursor-pointer hover:border-[hsl(var(--brand-500))] transition-colors"
              style={{ backgroundColor: value }}
              title={value}
            />
          ) : (
            <div className="flex h-8 w-full items-center gap-2 rounded-[6px] border border-[hsl(var(--slate-200))] bg-[hsl(var(--slate-50))] px-2 cursor-pointer hover:border-[hsl(var(--slate-300))] hover:bg-[hsl(var(--card))] transition-colors">
              <span className="h-5 w-5 rounded-[4px] border border-[hsl(var(--border))]" style={{ backgroundColor: value }} />
              <span className="flex-1 text-left font-mono text-[12.5px] uppercase">{value}</span>
            </div>
          )}
        </PopoverTrigger>
        <PopoverContent className="p-2.5" align="start">
          <ColorPanel value={value} onChange={onChange} />
        </PopoverContent>
      </Popover>
    </div>
  )
}
