/**
 * 自定义模块列表组件 - 支持分类、拖拽排序、双击编辑
 */
import { useState, useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Plus, Settings, Package, Edit, Star, StarOff, Trash2 } from 'lucide-react'
import { useCustomModuleStore } from '@/store/customModuleStore'
import { pinyinMatch } from '@/lib/pinyin'
import { EditCustomModuleDialog } from './EditCustomModuleDialog'
import { useConfirm } from '@/components/ui/confirm-dialog'
import type { CustomModule } from '@/types/customModule'

interface CustomModuleListProps {
  onCreateNew: () => void
  onManage: () => void
  onDragStart: (module: CustomModule) => void
  onEditWorkflow?: (module: CustomModule) => void
}

export function CustomModuleList({ onCreateNew, onManage, onDragStart, onEditWorkflow }: CustomModuleListProps) {
  const { modules, updateModule, deleteModule } = useCustomModuleStore()
  const { confirm: confirmDialog, ConfirmDialog } = useConfirm()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [editingModule, setEditingModule] = useState<CustomModule | null>(null)
  const [draggedModule, setDraggedModule] = useState<CustomModule | null>(null)

  // 获取所有分类
  const categories = useMemo(() => {
    const cats = new Set<string>()
    modules.forEach(m => {
      if (m.category) cats.add(m.category)
    })
    return ['all', ...Array.from(cats).sort()]
  }, [modules])

  // 过滤和搜索模块
  const filteredModules = useMemo(() => {
    let result = modules

    // 分类过滤
    if (selectedCategory !== 'all') {
      result = result.filter(m => m.category === selectedCategory)
    }

    // 搜索过滤
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter(module => {
        if (module.name.toLowerCase().includes(query)) return true
        if (module.display_name?.toLowerCase().includes(query)) return true
        if (module.description?.toLowerCase().includes(query)) return true
        if (pinyinMatch(module.display_name || module.name, query)) return true
        if (module.tags?.some(tag => tag.toLowerCase().includes(query))) return true
        return false
      })
    }

    // 排序：收藏的在前，然后按sort_order，最后按创建时间
    return result.sort((a, b) => {
      if (a.is_favorite !== b.is_favorite) {
        return a.is_favorite ? -1 : 1
      }
      if (a.sort_order !== b.sort_order) {
        return (a.sort_order || 0) - (b.sort_order || 0)
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [modules, searchQuery, selectedCategory])

  // 分组：收藏的和其他的
  const favoriteModules = filteredModules.filter(m => m.is_favorite)
  const otherModules = filteredModules.filter(m => !m.is_favorite)

  // 拖拽开始
  const handleDragStart = (e: React.DragEvent, module: CustomModule) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/reactflow', JSON.stringify({
      type: 'custom_module',
      moduleId: module.id,
      moduleName: module.name,
      displayName: module.display_name,
      icon: module.icon,
      color: module.color,
      description: module.description,
    }))
    setDraggedModule(module)
    onDragStart(module)
  }

  // 拖拽结束
  const handleDragEnd = () => {
    setDraggedModule(null)
  }

  // 双击编辑
  const handleDoubleClick = (module: CustomModule) => {
    setEditingModule(module)
  }

  // 切换收藏
  const handleToggleFavorite = async (module: CustomModule, e: React.MouseEvent) => {
    e.stopPropagation()
    await updateModule(module.id, { is_favorite: !module.is_favorite })
  }

  // 删除模块
  const handleDelete = async (module: CustomModule, e: React.MouseEvent) => {
    e.stopPropagation()
    const ok = await confirmDialog(
      `确定要删除模块"${module.display_name || module.name}"吗？此操作不可撤销。`,
      { type: 'warning', title: '删除自定义模块', confirmText: '删除', cancelText: '取消' }
    )
    if (ok) {
      await deleteModule(module.id)
    }
  }

  // 编辑工作流
  const handleEditWorkflow = () => {
    if (editingModule && onEditWorkflow) {
      onEditWorkflow(editingModule)
      setEditingModule(null)
    }
  }

  // 渲染模块项
  const renderModuleItem = (module: CustomModule) => {
    const isDragging = draggedModule?.id === module.id

    return (
      <div
        key={module.id}
        draggable
        onDragStart={(e) => handleDragStart(e, module)}
        onDragEnd={handleDragEnd}
        onDoubleClick={() => handleDoubleClick(module)}
        className={`group relative p-3 rounded-lg border bg-white hover:bg-gray-50 hover:border-purple-300 transition-all cursor-move ${
          isDragging ? 'opacity-50' : ''
        }`}
        title="双击编辑，拖拽到画布使用"
      >
        <div className="flex items-start gap-2">
          {/* 图标 */}
          <div
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm text-base"
            style={{ backgroundColor: module.color || '#8B5CF6' }}
          >
            {module.icon || ''}
          </div>

          {/* 内容 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium truncate">
                {module.display_name || module.name}
              </h4>
            </div>
            {module.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                {module.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span>{module.parameters?.length || 0} 个参数</span>
              <span>•</span>
              <span>{module.outputs?.length || 0} 个输出</span>
              {module.usage_count > 0 && (
                <>
                  <span>•</span>
                  <span>使用 {module.usage_count} 次</span>
                </>
              )}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => handleToggleFavorite(module, e)}
              className="p-1 rounded hover:bg-gray-200 transition-colors has-hover-only"
              title={module.is_favorite ? '取消收藏' : '收藏'}
            >
              {module.is_favorite ? (
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              ) : (
                <StarOff className="w-4 h-4 text-gray-400" />
              )}
            </button>
            <button
              onClick={() => handleDoubleClick(module)}
              className="p-1 rounded hover:bg-gray-200 transition-colors has-hover-only"
              title="编辑"
            >
              <Edit className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={(e) => handleDelete(module, e)}
              className="p-1 rounded hover:bg-red-100 transition-colors has-hover-only"
              title="删除"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col h-full">
        {/* 搜索栏 */}
        <div className="p-3 border-b space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索自定义模块..."
              className="pl-9 h-9"
            />
          </div>

          {/* 分类选择 */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat === 'all' ? '全部' : cat}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={onCreateNew}
              size="sm"
              className="bg-[hsl(var(--brand-600))] flex-1 text-white"
            >
              <Plus className="w-4 h-4 mr-1" />
              创建模块
            </Button>
            <Button
              onClick={onManage}
              size="sm"
              variant="tonal-warning"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 模块列表 */}
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-4">
            {filteredModules.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? '没有找到匹配的模块' : '还没有自定义模块'}
                </p>
                {!searchQuery && (
                  <Button
                    onClick={onCreateNew}
                    size="sm"
                    variant="tonal-success"
                    className="mt-3"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    创建第一个模块
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* 收藏的模块 */}
                {favoriteModules.length > 0 && (
                  <div>
                    <h3 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      收藏
                    </h3>
                    <div className="space-y-2">
                      {favoriteModules.map(renderModuleItem)}
                    </div>
                  </div>
                )}

                {/* 其他模块 */}
                {otherModules.length > 0 && (
                  <div>
                    {favoriteModules.length > 0 && (
                      <h3 className="text-xs font-medium text-muted-foreground mb-2">
                        全部模块
                      </h3>
                    )}
                    <div className="space-y-2">
                      {otherModules.map(renderModuleItem)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* 编辑对话框 */}
      {editingModule && (
        <EditCustomModuleDialog
          open={!!editingModule}
          onClose={() => setEditingModule(null)}
          module={editingModule}
          onEditWorkflow={onEditWorkflow ? handleEditWorkflow : undefined}
        />
      )}

      {/* 自定义确认弹窗（禁止浏览器原生弹窗） */}
      <ConfirmDialog />
    </>
  )
}
