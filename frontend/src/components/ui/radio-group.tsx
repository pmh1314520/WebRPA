import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Radio / RadioGroup - WebRPA 主题定制单选按钮（不依赖原生 input[type=radio]）
 *
 * 用法：
 *   <RadioGroup value={v} onValueChange={setV}>
 *     <Radio value="a" label="选项A" />
 *     <Radio value="b" label="选项B" />
 *   </RadioGroup>
 *
 * 也可单独使用 Radio（受控）：
 *   <Radio checked={x === 'a'} onSelect={() => setX('a')} label="A" />
 */

interface RadioGroupContextValue {
  value?: string
  onValueChange?: (value: string) => void
  name?: string
  disabled?: boolean
}

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(null)

export interface RadioGroupProps {
  value?: string
  onValueChange?: (value: string) => void
  name?: string
  disabled?: boolean
  className?: string
  children?: React.ReactNode
}

export function RadioGroup({ value, onValueChange, name, disabled, className, children }: RadioGroupProps) {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange, name, disabled }}>
      <div role="radiogroup" className={className}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  )
}

export interface RadioProps {
  /** 在 RadioGroup 中使用时的取值 */
  value?: string
  /** 单独使用时的受控选中态 */
  checked?: boolean
  /** 单独使用时的选中回调 */
  onSelect?: () => void
  disabled?: boolean
  label?: React.ReactNode
  /** 仅渲染圆点本体（不带文字与外层 label），用于自定义布局 */
  dotOnly?: boolean
  className?: string
  id?: string
}

const RadioDot = React.forwardRef<HTMLButtonElement, {
  selected: boolean
  disabled?: boolean
  onClick?: () => void
  id?: string
  className?: string
}>(({ selected, disabled, onClick, id, className }, ref) => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    id={id}
    ref={ref}
    disabled={disabled}
    onClick={() => !disabled && onClick?.()}
    className={cn(
      'relative h-4 w-4 shrink-0 rounded-full border flex items-center justify-center cursor-pointer ' +
        'transition-[background-color,border-color,box-shadow] duration-150 ease-[cubic-bezier(0.25,1,0.5,1)] ' +
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-1 focus-visible:ring-offset-[hsl(var(--background))] ' +
        'disabled:cursor-not-allowed disabled:opacity-50 active:scale-90',
      selected
        ? 'border-[hsl(var(--brand-600))] bg-[hsl(var(--card))]'
        : 'border-[hsl(var(--slate-300))] bg-[hsl(var(--card))] hover:border-[hsl(var(--brand-500))] hover:bg-[hsl(var(--brand-50))]',
      className
    )}
  >
    {selected && (
      <span className="h-2 w-2 rounded-full bg-[hsl(var(--brand-600))] animate-scale-in" />
    )}
  </button>
))
RadioDot.displayName = 'RadioDot'

export const Radio = React.forwardRef<HTMLButtonElement, RadioProps>(
  ({ value, checked, onSelect, disabled, label, dotOnly, className, id }, ref) => {
    const ctx = React.useContext(RadioGroupContext)
    const selected = ctx
      ? ctx.value === value
      : !!checked
    const isDisabled = disabled || ctx?.disabled
    const handle = () => {
      if (ctx && value !== undefined) ctx.onValueChange?.(value)
      else onSelect?.()
    }

    if (dotOnly) {
      return <RadioDot ref={ref} selected={selected} disabled={isDisabled} onClick={handle} id={id} className={className} />
    }

    return (
      <label
        className={cn(
          'inline-flex items-center gap-2 cursor-pointer select-none',
          isDisabled && 'cursor-not-allowed opacity-60',
          className
        )}
      >
        <RadioDot ref={ref} selected={selected} disabled={isDisabled} onClick={handle} id={id} />
        {label != null && <span className="text-sm text-[hsl(var(--foreground))]">{label}</span>}
      </label>
    )
  }
)
Radio.displayName = 'Radio'
