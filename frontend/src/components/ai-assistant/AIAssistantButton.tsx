import { Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAIAssistantStore } from '@/store/aiAssistantStore'
import { useGlobalConfigStore } from '@/store/globalConfigStore'

/** 浮动右下角的助手触发按钮 - 蓝渐变 FAB + 呼吸光环 */
export function AIAssistantButton() {
  const isOpen = useAIAssistantStore((s) => s.isPanelOpen)
  const togglePanel = useAIAssistantStore((s) => s.togglePanel)
  const showButton = useGlobalConfigStore((s) => s.config.system.showAIAssistantButton)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC')
      if ((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        togglePanel()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [togglePanel])

  if (isOpen || !showButton) return null

  return (
    <button
      onClick={togglePanel}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="WebRPA 小助手 (Ctrl+K)"
      className={
        'fixed bottom-12 right-6 z-40 group ' +
        'flex items-center gap-2.5 h-12 pl-1.5 pr-4 ' +
        'rounded-full bg-[hsl(var(--card))] border border-[hsl(var(--brand-500)/0.25)] ' +
        'shadow-pop-lg ' +
        'hover:shadow-brand-glow hover:border-[hsl(var(--brand-500)/0.5)] hover:-translate-y-0.5 ' +
        'transition-[box-shadow,border-color,transform] duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] ' +
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 ' +
        'active:translate-y-0'
      }
    >
      {/* 渐变 logo 圆环 + 呼吸光晕 */}
      <span className="relative flex items-center justify-center w-9 h-9 rounded-full overflow-hidden">
        {/* 呼吸光晕背景 */}
        <span
          className="absolute inset-0 rounded-full bg-gradient-to-br from-[hsl(var(--brand-400))] to-[hsl(var(--brand-700))] animate-pulse-ring"
          aria-hidden="true"
        />
        {/* 实心圆 */}
        <span className="relative w-9 h-9 rounded-full bg-gradient-to-br from-[hsl(var(--brand-500))] to-[hsl(var(--brand-700))] flex items-center justify-center shadow-[inset_0_1px_3px_rgb(255_255_255_/_0.3)]">
          <Sparkles className={`w-4 h-4 text-white transition-transform duration-300 ${hovered ? 'scale-110 rotate-12' : ''}`} strokeWidth={2.4} />
        </span>
      </span>

      <span className="text-[13.5px] font-semibold text-gradient">小助手</span>

      <kbd className="hidden sm:inline-flex items-center gap-1 px-2 h-5 rounded border border-[hsl(var(--border))] bg-[hsl(var(--slate-50))] text-[10.5px] font-mono font-semibold text-[hsl(var(--muted-foreground))] shadow-xs">
        Ctrl+K
      </kbd>
    </button>
  )
}
