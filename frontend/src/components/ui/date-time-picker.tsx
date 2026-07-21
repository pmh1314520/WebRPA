import * as React from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { SelectNative } from '@/components/ui/select-native'
import { Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * DatePicker / TimePicker / DateTimePicker - WebRPA 主题定制日期时间选择器
 * 完全自绘，不使用浏览器原生 <input type=date|time|datetime-local> 控件。
 *
 *  - DatePicker     value "YYYY-MM-DD"
 *  - TimePicker     value "HH:MM" 或 "HH:MM:SS"（withSeconds）
 *  - DateTimePicker value "YYYY-MM-DDTHH:MM"
 */

const triggerCls =
  'flex h-8 w-full items-center gap-2 rounded-[6px] border border-[hsl(var(--slate-200))] bg-[hsl(var(--slate-50))] ' +
  'px-2.5 py-1 text-[13px] text-[hsl(var(--foreground))] shadow-[inset_0_1px_2px_rgb(15_23_42_/_0.04)] cursor-pointer ' +
  'transition-[border-color,background-color,box-shadow] duration-150 hover:border-[hsl(var(--slate-300))] hover:bg-[hsl(var(--card))] ' +
  'data-[state=open]:border-[hsl(var(--brand-500))] data-[state=open]:bg-[hsl(var(--card))] data-[state=open]:ring-2 data-[state=open]:ring-[hsl(var(--brand-500)/0.18)]'

const pad = (n: number) => String(n).padStart(2, '0')

// ---------------- 日历面板 ----------------
function CalendarPanel({ value, onPick }: { value: string; onPick: (v: string) => void }) {
  const parsed = parseDate(value)
  const today = new Date()
  const [viewYear, setViewYear] = React.useState(parsed ? parsed.y : today.getFullYear())
  const [viewMonth, setViewMonth] = React.useState(parsed ? parsed.m - 1 : today.getMonth()) // 0-11

  const firstDay = new Date(viewYear, viewMonth, 1)
  const startWeekday = firstDay.getDay() // 0=周日
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  const cells: (number | null)[] = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1) } else setViewMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1) } else setViewMonth((m) => m + 1)
  }

  const years = React.useMemo(() => {
    const base = today.getFullYear()
    const arr: number[] = []
    for (let y = base - 5; y <= base + 6; y++) arr.push(y)
    if (!arr.includes(viewYear)) arr.push(viewYear)
    return arr.sort((a, b) => a - b)
  }, [viewYear])

  return (
    <div className="w-[248px] select-none">
      <div className="flex items-center justify-between gap-1 mb-2">
        <button type="button" onClick={prevMonth}
          className="p-1 rounded-[6px] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--brand-50))] hover:text-[hsl(var(--brand-600))]">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-1.5">
          <SelectNative className="!h-7 !w-[78px] !text-[12px]" value={String(viewYear)} onChange={(e) => setViewYear(Number(e.target.value))}>
            {years.map((y) => <option key={y} value={y}>{y}年</option>)}
          </SelectNative>
          <SelectNative className="!h-7 !w-[64px] !text-[12px]" value={String(viewMonth)} onChange={(e) => setViewMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>{i + 1}月</option>)}
          </SelectNative>
        </div>
        <button type="button" onClick={nextMonth}
          className="p-1 rounded-[6px] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--brand-50))] hover:text-[hsl(var(--brand-600))]">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {['日', '一', '二', '三', '四', '五', '六'].map((w) => (
          <div key={w} className="text-center text-[11px] font-medium text-[hsl(var(--muted-foreground))] py-1">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => {
          if (d === null) return <div key={`e-${i}`} />
          const isSel = parsed && parsed.y === viewYear && parsed.m - 1 === viewMonth && parsed.d === d
          const isToday = today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === d
          return (
            <button
              key={d}
              type="button"
              onClick={() => onPick(`${viewYear}-${pad(viewMonth + 1)}-${pad(d)}`)}
              className={cn(
                'h-7 w-7 mx-auto rounded-[6px] text-[12.5px] flex items-center justify-center transition-colors',
                isSel
                  ? 'bg-[hsl(var(--brand-600))] text-white font-semibold'
                  : isToday
                    ? 'text-[hsl(var(--brand-700))] font-semibold ring-1 ring-[hsl(var(--brand-500)/0.4)] hover:bg-[hsl(var(--brand-50))]'
                    : 'text-[hsl(var(--slate-700))] hover:bg-[hsl(var(--brand-50))] hover:text-[hsl(var(--brand-700))]'
              )}
            >
              {d}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function parseDate(v: string): { y: number; m: number; d: number } | null {
  const mtch = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(v || '')
  if (!mtch) return null
  return { y: Number(mtch[1]), m: Number(mtch[2]), d: Number(mtch[3]) }
}

// ---------------- DatePicker ----------------
export function DatePicker({ value, onChange, placeholder = '选择日期', className, disabled }: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  return (
    <div className={cn('relative', className)}>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <div className={triggerCls} data-state={open ? 'open' : 'closed'}>
          <Calendar className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
          <span className={cn('flex-1 truncate', !value && 'text-[hsl(var(--muted-foreground))]')}>{value || placeholder}</span>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2.5" align="start">
        <CalendarPanel value={value} onPick={(v) => { onChange(v); setOpen(false) }} />
      </PopoverContent>
    </Popover>
    </div>
  )
}

// ---------------- 时间面板（滚动列直选，无嵌套下拉） ----------------
/**
 * 之前的实现是三个嵌套 SelectNative（Radix Select 会 Portal 到 body），
 * 与自绘 Popover 的「点击外部即关闭」冲突：鼠标点击下拉选项时整个面板被
 * mousedown 抢先卸载，导致「点击选不上、只能按回车」。
 * 现改为 antd 风格滚动列：每列直接点击数字即可选中，同时视觉尺寸更大。
 */
const clampTimePart = (raw: string | undefined, max: number) => {
  const n = Number(raw)
  if (!Number.isFinite(n)) return 0
  return Math.min(max, Math.max(0, Math.trunc(n)))
}

function TimeColumn({ label, count, value, onSelect, compact }: {
  label: string
  count: number
  value: number
  onSelect: (v: number) => void
  compact?: boolean
}) {
  const listRef = React.useRef<HTMLDivElement>(null)
  const didInit = React.useRef(false)

  // 首次打开：选中项直接定位到列表可视区中间；之后点击选择时平滑跟随
  React.useEffect(() => {
    const el = listRef.current
    if (!el) return
    const item = el.children[value] as HTMLElement | undefined
    if (!item) return
    const top = item.offsetTop - el.clientHeight / 2 + item.clientHeight / 2
    if (didInit.current) {
      if (typeof el.scrollTo === 'function') el.scrollTo({ top, behavior: 'smooth' })
      else el.scrollTop = top
    } else {
      el.scrollTop = top
      didInit.current = true
    }
  }, [value])

  return (
    <div className="flex flex-col items-stretch">
      <div className="text-center text-[11px] font-medium text-[hsl(var(--muted-foreground))] pb-1">{label}</div>
      <div
        ref={listRef}
        className={cn(
          'w-[60px] overflow-y-auto overscroll-contain scrollbar-thin rounded-[8px] border border-[hsl(var(--border))] bg-[hsl(var(--slate-50))] p-1 space-y-0.5',
          compact ? 'h-[128px]' : 'h-[192px]'
        )}
      >
        {Array.from({ length: count }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            className={cn(
              'w-full h-8 flex items-center justify-center rounded-[6px] text-[13.5px] tabular-nums transition-colors',
              i === value
                ? 'bg-[hsl(var(--brand-600))] text-white font-semibold shadow-sm'
                : 'text-[hsl(var(--slate-700))] hover:bg-[hsl(var(--brand-50))] hover:text-[hsl(var(--brand-700))]'
            )}
          >
            {pad(i)}
          </button>
        ))}
      </div>
    </div>
  )
}

function TimePanel({ value, withSeconds, onChange, compact }: { value: string; withSeconds?: boolean; onChange: (v: string) => void; compact?: boolean }) {
  const parts = (value || '').split(':')
  const hh = clampTimePart(parts[0], 23)
  const mm = clampTimePart(parts[1], 59)
  const ss = clampTimePart(parts[2], 59)
  const emit = (h: number, m: number, s: number) => {
    onChange(withSeconds ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}`)
  }
  const setNow = () => {
    const now = new Date()
    emit(now.getHours(), now.getMinutes(), now.getSeconds())
  }
  return (
    <div className="select-none">
      <div className="flex items-start justify-center gap-2">
        <TimeColumn label="小时" count={24} value={hh} onSelect={(v) => emit(v, mm, ss)} compact={compact} />
        <TimeColumn label="分" count={60} value={mm} onSelect={(v) => emit(hh, v, ss)} compact={compact} />
        {withSeconds && (
          <TimeColumn label="秒" count={60} value={ss} onSelect={(v) => emit(hh, mm, v)} compact={compact} />
        )}
      </div>
      <div className="flex items-center justify-between gap-2 pt-2 mt-2 border-t border-[hsl(var(--border))]">
        <button
          type="button"
          onClick={setNow}
          className="px-2 py-1 rounded-[6px] text-[12px] text-[hsl(var(--brand-600))] hover:bg-[hsl(var(--brand-50))] transition-colors"
        >
          此刻
        </button>
        <span className="text-[13px] font-semibold tabular-nums text-[hsl(var(--foreground))] pr-1">
          {withSeconds ? `${pad(hh)}:${pad(mm)}:${pad(ss)}` : `${pad(hh)}:${pad(mm)}`}
        </span>
      </div>
    </div>
  )
}

// ---------------- TimePicker ----------------
export function TimePicker({ value, onChange, withSeconds, placeholder = '选择时间', className, disabled }: {
  value: string
  onChange: (v: string) => void
  withSeconds?: boolean
  placeholder?: string
  className?: string
  disabled?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  return (
    <div className={cn('relative', className)}>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <div className={triggerCls} data-state={open ? 'open' : 'closed'}>
          <Clock className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
          <span className={cn('flex-1 truncate', !value && 'text-[hsl(var(--muted-foreground))]')}>{value || placeholder}</span>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2.5" align="start">
        <TimePanel value={value} withSeconds={withSeconds} onChange={onChange} />
      </PopoverContent>
    </Popover>
    </div>
  )
}

// ---------------- DateTimePicker (datetime-local 替代，值 "YYYY-MM-DDTHH:MM") ----------------
export function DateTimePicker({ value, onChange, placeholder = '选择日期与时间', className, disabled }: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const [datePart, timePart] = (value || '').split('T')
  const setDate = (d: string) => onChange(`${d}T${timePart || '00:00'}`)
  const setTime = (t: string) => onChange(`${datePart || new Date().toISOString().slice(0, 10)}T${t}`)
  const display = value ? value.replace('T', ' ') : ''
  return (
    <div className={cn('relative', className)}>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <div className={triggerCls} data-state={open ? 'open' : 'closed'}>
          <Calendar className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
          <span className={cn('flex-1 truncate', !value && 'text-[hsl(var(--muted-foreground))]')}>{display || placeholder}</span>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2.5 space-y-2.5" align="start">
        <CalendarPanel value={datePart || ''} onPick={(v) => setDate(v)} />
        <div className="border-t border-[hsl(var(--border))] pt-2.5">
          <TimePanel value={timePart || '00:00'} onChange={(t) => setTime(t)} compact />
        </div>
      </PopoverContent>
    </Popover>
    </div>
  )
}
