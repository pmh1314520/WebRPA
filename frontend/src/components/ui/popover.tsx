/**
 * Popover 弹出层组件 - 简化版
 * 视觉：圆角 10px、阴影 pop-xl、品牌蓝边框
 *
 * 注意：本组件为内联绝对定位实现（非 Portal）。内容里可以再嵌套
 * Radix 系列组件（Select / Dropdown 等，它们会 Portal 到 body），
 * 外点关闭逻辑已对 Radix Portal 内容做了豁免，不会误关。
 */
import * as React from "react"
import { cn } from "@/lib/utils"

interface PopoverProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

interface PopoverContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
}

const PopoverContext = React.createContext<{
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: React.MutableRefObject<HTMLElement | null>
}>({
  open: false,
  setOpen: () => {},
  triggerRef: { current: null },
})

export function Popover({ open: controlledOpen, onOpenChange, children }: PopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLElement | null>(null)

  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen
  const setOpen = React.useCallback((newOpen: boolean) => {
    if (controlledOpen === undefined) {
      setUncontrolledOpen(newOpen)
    }
    onOpenChange?.(newOpen)
  }, [controlledOpen, onOpenChange])

  return (
    <PopoverContext.Provider value={{ open, setOpen, triggerRef }}>
      {children}
    </PopoverContext.Provider>
  )
}

interface PopoverTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

export const PopoverTrigger = React.forwardRef<
  HTMLButtonElement,
  PopoverTriggerProps
>(({ className, children, onClick, asChild = false, ...props }, ref) => {
  const { open, setOpen, triggerRef } = React.useContext(PopoverContext)

  // 记录触发器 DOM，供外点关闭逻辑豁免（避免「mousedown 关闭 + click 再打开」的闪烁循环）
  const setTriggerNode = React.useCallback((node: HTMLElement | null) => {
    triggerRef.current = node
    if (typeof ref === 'function') ref(node as HTMLButtonElement | null)
    else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node as HTMLButtonElement | null
  }, [ref, triggerRef])

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<any>
    // React 19 中 ref 作为普通 prop 传递
    const childRef = (child.props as any)?.ref
    return React.cloneElement(child, {
      ...child.props,
      ref: (node: HTMLElement | null) => {
        setTriggerNode(node)
        if (typeof childRef === 'function') childRef(node)
        else if (childRef && typeof childRef === 'object') childRef.current = node
      },
      onClick: (e: React.MouseEvent) => {
        setOpen(!open)
        child.props.onClick?.(e)
        onClick?.(e as React.MouseEvent<HTMLButtonElement>)
      },
    })
  }

  return (
    <button
      ref={setTriggerNode as unknown as React.Ref<HTMLButtonElement>}
      type="button"
      onClick={(e) => {
        setOpen(!open)
        onClick?.(e)
      }}
      className={className}
      {...props}
    >
      {children}
    </button>
  )
})
PopoverTrigger.displayName = "PopoverTrigger"

/** 判断事件目标是否位于 Radix Portal 弹层内（Select/Dropdown 等会 Portal 到 body） */
function isInRadixPortal(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return !!target.closest(
    '[data-radix-popper-content-wrapper], [data-radix-portal], [data-radix-select-viewport], [data-radix-menu-content]'
  )
}

export const PopoverContent = React.forwardRef<
  HTMLDivElement,
  PopoverContentProps
>(({ className, align = "center", sideOffset = 6, children, ...props }, _ref) => {
  const { open, setOpen, triggerRef } = React.useContext(PopoverContext)
  const contentRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      // 1) 点在面板内：不关闭
      if (contentRef.current && contentRef.current.contains(target)) return
      // 2) 点在触发器上：交给触发器自身的 onClick 去切换开关，避免关了又开
      if (triggerRef.current && triggerRef.current.contains(target)) return
      // 3) 点在 Radix Portal 弹层内（面板中嵌套的下拉框选项等）：不关闭
      if (isInRadixPortal(event.target)) return
      setOpen(false)
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      // 面板内嵌套的 Radix 弹层（如下拉框）打开时，Esc 应先关闭它，而不是整个面板
      if (isInRadixPortal(event.target) || document.querySelector('[data-radix-popper-content-wrapper]')) return
      setOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open, setOpen, triggerRef])

  if (!open) return null

  return (
    <div
      ref={contentRef}
      className={cn(
        "absolute z-50 mt-2 rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--popover))] " +
          "shadow-pop-xl outline-none animate-scale-in",
        align === 'start' && 'left-0',
        align === 'center' && 'left-1/2 -translate-x-1/2',
        align === 'end' && 'right-0',
        className
      )}
      style={{ top: `calc(100% + ${sideOffset}px)` }}
      {...props}
    >
      {children}
    </div>
  )
})
PopoverContent.displayName = "PopoverContent"
