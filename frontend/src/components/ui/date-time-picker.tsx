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

// ---------------- 时间面板 ----------------
function TimePanel({ value, withSeconds, onChange }: { value: string; withSeconds?: boolean; onChange: (v: string) => void }) {
  const parts = (value || '').split(':')
  const hh = parts[0] !== undefined && parts[0] !== '' ? Number(parts[0]) : 0
  const mm = parts[1] !== undefined && parts[1] !== '' ? Number(parts[1]) : 0
  const ss = parts[2] !== undefined && parts[2] !== '' ? Number(parts[2]) : 0
  const emit = (h: number, m: number, s: number) => {
    onChange(withSeconds ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}`)
  }
  return (
    <div className="flex items-center gap-1.5">
      <SelectNative className="!w-[64px]" value={String(hh)} onChange={(e) => emit(Number(e.target.value), mm, ss)}>
        {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{pad(i)} 时</option>)}
      </SelectNative>
      <span className="text-[hsl(var(--muted-foreground))]">:</span>
      <SelectNative className="!w-[64px]" value={String(mm)} onChange={(e) => emit(hh, Number(e.target.value), ss)}>
        {Array.from({ length: 60 }, (_, i) => <option key={i} value={i}>{pad(i)} 分</option>)}
      </SelectNative>
      {withSeconds && (
        <>
          <span className="text-[hsl(var(--muted-foreground))]">:</span>
          <SelectNative className="!w-[64px]" value={String(ss)} onChange={(e) => emit(hh, mm, Number(e.target.value))}>
            {Array.from({ length: 60 }, (_, i) => <option key={i} value={i}>{pad(i)} 秒</option>)}
          </SelectNative>
        </>
      )}
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
          <TimePanel value={timePart || '00:00'} onChange={(t) => setTime(t)} />
        </div>
      </PopoverContent>
    </Popover>
    </div>
  )
}
