import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { DialogPortal } from '@/components/ui/dialog-portal'
import { useGlobalConfigStore } from '@/store/globalConfigStore'
import { useWorkflowStore } from '@/store/workflowStore'
import { X, FileJson, Trash2, RefreshCw, Search, FolderOpen, Clock, HardDrive } from 'lucide-react'
import { getBackendBaseUrl } from '@/services/config'
import { useVirtualizer } from '@/hooks/useVirtualizer'

interface LocalWorkflowDialogProps {
  isOpen: boolean
  onClose: () => void
  onLog: (level: 'info' | 'success' | 'warning' | 'error', message: string) => void
}

interface WorkflowInfo {
  filename: string
  name: string
  modifiedTime: string
  size: number
}

export function LocalWorkflowDialog({ isOpen, onClose, onLog }: LocalWorkflowDialogProps) {
  const { config } = useGlobalConfigStore()
  const importWorkflow = useWorkflowStore((state) => state.importWorkflow)
  const [workflows, setWorkflows] = useState<WorkflowInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [defaultFolder, setDefaultFolder] = useState('')
  const { confirm, ConfirmDialog } = useConfirm()

  const currentFolder = config.workflow?.localFolder || defaultFolder

  useEffect(() => {
    const loadDefaultFolder = async () => {
      const { preloadConfig } = await import('@/services/config')
      await preloadConfig()
      const API_BASE = getBackendBaseUrl()
      fetch(`${API_BASE}/api/local-workflows/default-folder`)
        .then(res => res.json())
        .then(data => {
          if (data.folder) setDefaultFolder(data.folder)
        })
        .catch(console.error)
    }
    loadDefaultFolder()
  }, [])

  const loadWorkflows = async () => {
    const folder = config.workflow?.localFolder || defaultFolder || ''
    setLoading(true)
    try {
      const API_BASE = getBackendBaseUrl()
      const response = await fetch(`${API_BASE}/api/local-workflows/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ folder })
      })
      const data = await response.json()
      if (data.workflows) {
        setWorkflows(data.workflows)
      }
    } catch (e) {
      console.error('加载工作流列表失败:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadWorkflows()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, defaultFolder, config.workflow?.localFolder])

  const handleOpen = async (workflow: WorkflowInfo) => {
    try {
      const API_BASE = getBackendBaseUrl()
      const response = await fetch(
        `${API_BASE}/api/local-workflows/load/${encodeURIComponent(workflow.filename)}?folder=${encodeURIComponent(currentFolder)}`
      )
      const data = await response.json()

      if (data.success && data.content) {
        const success = importWorkflow(JSON.stringify(data.content))
        if (success) {
          onLog('success', `已打开工作流: ${workflow.name}`)
          onClose()
        } else {
          onLog('error', '工作流格式无效')
        }
      } else {
        onLog('error', `打开失败: ${data.error}`)
      }
    } catch (e) {
      onLog('error', `打开工作流出错: ${e}`)
    }
  }

  const handleDelete = async (workflow: WorkflowInfo) => {
    const confirmed = await confirm(`确定要删除工作流 "${workflow.name}" 吗？`, {
      type: 'warning',
      title: '删除工作流'
    })

    if (confirmed) {
      try {
        const API_BASE = getBackendBaseUrl()
        const response = await fetch(
          `${API_BASE}/api/local-workflows/delete?filename=${encodeURIComponent(workflow.filename)}&folder=${encodeURIComponent(currentFolder)}`,
          { method: 'POST' }
        )
        const data = await response.json()

        if (data.success) {
          onLog('success', `已删除工作流: ${workflow.name}`)
          loadWorkflows()
        } else {
          onLog('error', `删除失败: ${data.error}`)
        }
      } catch (e) {
        onLog('error', `删除工作流出错: ${e}`)
      }
    }
  }

  const filteredWorkflows = workflows.filter(w =>
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.filename.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleOpenFolder = async () => {
    const folder = config.workflow?.localFolder || defaultFolder || ''
    try {
      const API_BASE = getBackendBaseUrl()
      const response = await fetch(`${API_BASE}/api/local-workflows/open-folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder })
      })
      const data = await response.json()
      if (data.success) {
        onLog('success', `已打开工作流保存位置：${data.folder || folder}`)
      } else {
        onLog('error', `打开文件夹失败：${data.error || '未知错误'}`)
      }
    } catch (e) {
      onLog('error', `打开文件夹出错：${e}`)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  if (!isOpen) return null

  return (
    <DialogPortal>
    <div className="fixed inset-0 bg-[hsl(217_45%_15%_/_0.55)] backdrop-blur-[3px] flex items-center justify-center p-4 animate-fade-in" style={{ zIndex: 2147483646 }}>
      <div className="modern-dialog w-full max-w-2xl animate-scale-in-bounce flex flex-col" style={{ maxHeight: 'calc(100vh - 32px)' }}>
        {/* 标题栏 */}
        <div className="modern-dialog-header">
          <div className="modern-dialog-header-icon modern-dialog-header-icon-warning">
            <FolderOpen className="w-5 h-5" strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="modern-dialog-title">打开本地工作流</h3>
            <div className="modern-dialog-subtitle">
              共 <span className="text-[hsl(var(--brand-700))] font-bold">{workflows.length}</span> 个文件
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[7px] text-[hsl(var(--slate-500))] hover:bg-[hsl(var(--danger-50))] hover:text-[hsl(var(--danger-600))] hover:border-[hsl(var(--danger-500)/0.3)] border border-transparent transition-all duration-150 active:scale-90"
            title="关闭 (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 工具栏 */}
        <div className="px-5 py-3 border-b border-[hsl(var(--border))] flex items-center gap-2 bg-[hsl(var(--slate-50)/0.5)]">
          <div className="relative flex-1 group">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--muted-foreground))] group-focus-within:text-[hsl(var(--brand-600))] transition-colors duration-150" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索工作流名称或文件名..."
              className="!pl-8 !pr-7"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-[hsl(var(--danger-50))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--danger-600))] transition-all active:scale-90"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <Button
            variant="tonal"
            size="sm"
            onClick={loadWorkflows}
            disabled={loading}
            loading={loading}
          >
            {!loading && <RefreshCw className="w-3.5 h-3.5" />}
            刷新
          </Button>
          <Button
            variant="tonal"
            size="sm"
            onClick={handleOpenFolder}
            title="在文件管理器中打开工作流 JSON 的保存位置"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            打开位置
          </Button>
        </div>

        {/* 文件夹路径 */}
        {currentFolder && (
          <div className="px-5 py-2 border-b border-[hsl(var(--border))] flex items-center gap-2 bg-[hsl(var(--brand-50)/0.4)] text-[11.5px]">
            <HardDrive className="w-3 h-3 text-[hsl(var(--brand-600))] shrink-0" />
            <span className="text-[hsl(var(--muted-foreground))]">当前位置：</span>
            <code className="font-mono text-[hsl(var(--brand-700))] truncate" title={currentFolder}>
              {currentFolder}
            </code>
          </div>
        )}

        {/* 工作流列表 */}
        <div className="flex-1 overflow-y-auto min-h-[280px] max-h-[480px]">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center">
              <div className="spinner spinner-lg mb-3" />
              <div className="text-[12px] text-[hsl(var(--muted-foreground))]">加载工作流列表中…</div>
            </div>
          ) : filteredWorkflows.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                {searchTerm ? <Search className="w-7 h-7" /> : <FileJson className="w-7 h-7" />}
              </div>
              <div className="empty-state-title">
                {searchTerm ? '未找到匹配工作流' : '此文件夹暂无工作流'}
              </div>
              <div className="empty-state-desc">
                {searchTerm ? '试试其他关键词或检查拼写' : '保存当前工作流后会显示在这里'}
              </div>
            </div>
          ) : (
            <WorkflowVirtualList
              workflows={filteredWorkflows}
              onOpen={handleOpen}
              onDelete={handleDelete}
              formatSize={formatSize}
            />
          )}
        </div>

        {/* 底部统计 */}
        <div className="dialog-footer-bar !justify-between">
          <div className="text-[11px] text-[hsl(var(--muted-foreground))]">
            {filteredWorkflows.length > 0 && searchTerm && (
              <>显示 <span className="font-bold text-[hsl(var(--brand-700))]">{filteredWorkflows.length}</span> / {workflows.length}</>
            )}
            {!searchTerm && workflows.length > 0 && (
              <>共 <span className="font-bold text-[hsl(var(--brand-700))]">{workflows.length}</span> 个工作流文件</>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={onClose}>
            关闭
          </Button>
        </div>
      </div>

      <ConfirmDialog />
    </div>
    </DialogPortal>
  )
}


// =============================================================
// 工作流虚拟列表 - 文件多时也能丝滑滚动
// =============================================================
const ROW_HEIGHT = 64

interface WorkflowVirtualListProps {
  workflows: WorkflowInfo[]
  onOpen: (workflow: WorkflowInfo) => void
  onDelete: (workflow: WorkflowInfo) => void
  formatSize: (bytes: number) => string
}

function WorkflowVirtualList({ workflows, onOpen, onDelete, formatSize }: WorkflowVirtualListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const getScrollElement = useCallback(() => scrollRef.current, [])

  const { virtualItems, totalSize } = useVirtualizer({
    count: workflows.length,
    getScrollElement,
    estimateSize: ROW_HEIGHT,
    overscan: 6,
  })

  // 列表数量较少时关闭动效（数百以上动效叠加会卡），少量时保留动效
  const animate = workflows.length <= 60

  return (
    <div ref={scrollRef} className="h-full overflow-auto">
      <div className="p-2" style={{ height: totalSize, position: 'relative' }}>
        {virtualItems.map((v) => {
          const workflow = workflows[v.index]
          if (!workflow) return null
          return (
            <div
              key={workflow.filename}
              style={{
                position: 'absolute',
                top: v.start,
                left: 0,
                right: 0,
                height: ROW_HEIGHT,
                paddingLeft: 8,
                paddingRight: 8,
                paddingTop: 4,
                paddingBottom: 4,
              }}
            >
              <div
                className={
                  'row-card group !p-3 h-full ' +
                  (animate ? 'animate-fade-in-up' : '')
                }
                style={animate ? { animationDelay: `${Math.min(v.index, 20) * 25}ms` } : undefined}
                onClick={() => onOpen(workflow)}
              >
                <div className="icon-chip icon-chip-brand !w-9 !h-9 !rounded-[8px]">
                  <FileJson className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-semibold text-[hsl(var(--slate-900))] truncate">
                    {workflow.name}
                  </div>
                  <div className="text-[11px] text-[hsl(var(--muted-foreground))] flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1">
                      <FileJson className="w-2.5 h-2.5" />
                      <code className="font-mono truncate max-w-[180px]">{workflow.filename}</code>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {workflow.modifiedTime}
                    </span>
                    <span className="badge badge-default !py-0">
                      {formatSize(workflow.size)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(workflow)
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-[6px] text-[hsl(var(--slate-500))] hover:text-[hsl(var(--danger-600))] hover:bg-[hsl(var(--danger-50))] border border-transparent hover:border-[hsl(var(--danger-500)/0.3)] transition-all active:scale-90"
                  title="删除工作流"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
