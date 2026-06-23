/**
 * 极速快速模块选择器
 *
 * 性能要点：
 * - 不使用 framer-motion，弹窗瞬时出现
 * - 模块列表使用 useMemo 缓存按分类的索引，避免每次渲染重新构建
 * - 移除每行按钮的 motion 包装，几百个模块也不会卡
 * - 弹窗位置自动避开屏幕边缘，无需用户滚动
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { X, Search, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useModuleStatsStore } from '@/store/moduleStatsStore'
import { pinyinMatch } from '@/lib/pinyin'
import type { ModuleType } from '@/types'

interface QuickModulePickerProps {
  isOpen: boolean
  position: { x: number; y: number }
  onClose: () => void
  onSelectModule: (moduleType: ModuleType, customModuleId?: string) => void
  availableModules: Array<{
    type: ModuleType
    label: string
    category: string
    icon: React.ElementType
    isCustom?: boolean
    customModuleId?: string
  }>
  favoritesOnly?: boolean
}

const PANEL_WIDTH = 480
const PANEL_HEIGHT = 540

export function QuickModulePicker({
  isOpen,
  position,
  onClose,
  onSelectModule,
  availableModules,
  favoritesOnly = false,
}: QuickModulePickerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { getStats, toggleFavorite, getSortedModules, stats } = useModuleStatsStore()

  // 重置搜索 + 自动聚焦
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('')
      return
    }
    // 直接 focus，无需等动画
    inputRef.current?.focus()
  }, [isOpen])

  // ESC 关闭
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // 按分类索引（仅按 availableModules 引用变化时重建）
  const groupedByCategory = useMemo(() => {
    const grouped: Record<string, typeof availableModules> = {}
    for (const m of availableModules) {
      if (!grouped[m.category]) grouped[m.category] = []
      grouped[m.category].push(m)
    }
    // 按使用次数排序
    for (const cat of Object.keys(grouped)) {
      const moduleTypes = grouped[cat].map((m) => m.type)
      const sorted = getSortedModules(moduleTypes)
      grouped[cat] = sorted.map((type) => grouped[cat].find((m) => m.type === type)!)
    }
    return grouped
  }, [availableModules, getSortedModules])

  // 过滤
  const filteredCategories = useMemo(() => {
    const result: Array<{ category: string; modules: typeof availableModules }> = []
    const term = searchTerm.trim()
    const termLower = term.toLowerCase()

    for (const [category, mods] of Object.entries(groupedByCategory)) {
      let list = mods
      if (favoritesOnly) {
        list = list.filter((m) => getStats(m.type).isFavorite)
      }
      if (term) {
        list = list.filter(
          (m) =>
            pinyinMatch(m.label, term) ||
            pinyinMatch(m.category, term) ||
            m.type.toLowerCase().includes(termLower),
        )
      }
      if (list.length > 0) {
        result.push({ category, modules: list })
      }
    }
    return result
  }, [groupedByCategory, searchTerm, favoritesOnly, getStats, stats])

  // 计算位置（避开屏幕边缘）
  const positionStyle = useMemo(() => {
    if (!isOpen) return { display: 'none' as const }
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280
    const vh = typeof window !== 'undefined' ? window.innerHeight : 720
    let left = position.x - PANEL_WIDTH / 2
    let top = position.y - PANEL_HEIGHT / 2
    // 防止越界，留 16px 边距
    left = Math.max(16, Math.min(left, vw - PANEL_WIDTH - 16))
    top = Math.max(16, Math.min(top, vh - PANEL_HEIGHT - 16))
    return { left, top, width: PANEL_WIDTH, height: PANEL_HEIGHT }
  }, [isOpen, position.x, position.y])

  const handleModuleClick = (module: typeof availableModules[number]) => {
    if (module.isCustom && module.customModuleId) {
      onSelectModule('custom_module' as ModuleType, module.customModuleId)
    } else {
      onSelectModule(module.type)
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black/15 z-40"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault()
          onClose()
        }}
      />

      {/* 弹窗 */}
      <div
        className="fixed z-50 bg-[hsl(var(--card))] rounded-lg shadow-pop-xl border border-[hsl(var(--border))] flex flex-col overflow-hidden"
        style={positionStyle}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 h-10 border-b border-[hsl(var(--border))]">
          <h3 className="text-[13px] font-semibold text-[hsl(var(--foreground))]">
            {favoritesOnly ? '收藏的模块' : '快速选择模块'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[hsl(var(--muted))] rounded transition-colors has-hover-only"
            title="关闭 (Esc)"
          >
            <X className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          </button>
        </div>

        {/* 搜索框 */}
        <div className="px-3 py-2 border-b border-[hsl(var(--border))]">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索模块（支持拼音）"
              className="w-full h-8 pl-8 pr-3 text-[13px] border border-[hsl(var(--border))] rounded bg-[hsl(var(--card))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:border-[hsl(var(--brand-500))] focus:ring-2 focus:ring-[hsl(var(--brand-500)/0.18)]"
            />
          </div>
        </div>

        {/* 模块列表 */}
        <div className="flex-1 overflow-y-auto py-2">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-12 text-[12.5px] text-[hsl(var(--muted-foreground))]">
              {favoritesOnly ? (
                <div className="space-y-2">
                  <div>暂无收藏的模块</div>
                  <div className="text-[11px]">
                    点击模块右侧的 <Star className="w-3 h-3 inline" /> 图标可收藏
                  </div>
                </div>
              ) : (
                '无搜索结果'
              )}
            </div>
          ) : (
            filteredCategories.map(({ category, modules }) => (
              <div key={category} className="px-2 pb-2">
                <div className="text-[10.5px] font-semibold text-[hsl(var(--muted-foreground))] tracking-wider uppercase px-2 py-1">
                  {category}
                </div>
                <div>
                  {modules.map((module) => {
                    const moduleStats = getStats(module.type)
                    const Icon = module.icon
                    return (
                      <div
                        key={module.type + (module.customModuleId || '')}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleModuleClick(module)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            handleModuleClick(module)
                          }
                        }}
                        className="w-full flex items-center gap-2.5 px-2 h-8 rounded text-left hover:bg-[hsl(var(--brand-50))] group transition-colors has-hover-only cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-500)/0.4)]"
                      >
                        <Icon className="w-4 h-4 text-[hsl(var(--muted-foreground))] flex-shrink-0 group-hover:text-[hsl(var(--brand-600))]" />
                        <span className="flex-1 text-[12.5px] text-[hsl(var(--foreground))] truncate">
                          {module.label}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleFavorite(module.type)
                          }}
                          className={cn(
                            'p-1 rounded transition-colors flex-shrink-0',
                            moduleStats.isFavorite
                              ? 'text-[hsl(45_93%_47%)]'
                              : 'text-[hsl(var(--slate-300))] opacity-0 group-hover:opacity-100 hover:text-[hsl(45_93%_47%)]',
                          )}
                          title={moduleStats.isFavorite ? '取消收藏' : '收藏'}
                        >
                          <Star className={cn('w-3.5 h-3.5', moduleStats.isFavorite && 'fill-current')} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 底部提示 */}
        <div className="px-3 py-2 border-t border-[hsl(var(--border))] text-[10.5px] text-[hsl(var(--muted-foreground))] text-center">
          {favoritesOnly
            ? '双击画布 = 收藏的模块 · 右键画布 = 全部模块'
            : '支持拼音搜索 · Esc 关闭'}
        </div>
      </div>
    </>
  )
}
