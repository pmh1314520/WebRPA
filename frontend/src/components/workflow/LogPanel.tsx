import { useWorkflowStore, type DataRow } from '@/store/workflowStore'
import { motion } from 'framer-motion'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SelectNative as Select } from '@/components/ui/select-native'
import { Checkbox } from '@/components/ui/checkbox'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { workflowApi } from '@/services/api'
import { onAssistantUiEvent, emitAssistantUiEvent } from '@/services/aiAssistantSkills'
import { 
  Trash2, 
  Download, 
  ChevronUp, 
  ChevronDown, 
  Plus, 
  X, 
  FileSpreadsheet,
  Edit2,
  Check,
  FileText,
  Variable,
  Search,
  Filter,
  ImageIcon,
  Database,
  Upload,
  FileDown,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import type { LogLevel, VariableType } from '@/types'
import { ExcelAssetsPanel } from './ExcelAssetsPanel'
import { ImageAssetsPanel } from './ImageAssetsPanel'
import { LogList } from './LogList'
import { DataTable } from './DataTable'
import { PanelResizer } from './PanelResizer'
import { useLayoutStore, LAYOUT_LIMITS } from '@/store/layoutStore'
import { DialogPortal } from '@/components/ui/dialog-portal'

interface LogPanelProps {
  onLogClick?: (nodeId: string) => void
}

export function LogPanel({ onLogClick }: LogPanelProps) {
  const logs = useWorkflowStore((state) => state.logs)
  const clearLogs = useWorkflowStore((state) => state.clearLogs)
  const selectNode = useWorkflowStore((state) => state.selectNode)
  const variables = useWorkflowStore((state) => state.variables)
  const addVariable = useWorkflowStore((state) => state.addVariable)
  const updateVariable = useWorkflowStore((state) => state.updateVariable)
  const deleteVariable = useWorkflowStore((state) => state.deleteVariable)
  const renameVariable = useWorkflowStore((state) => state.renameVariable)
  const findVariableUsages = useWorkflowStore((state) => state.findVariableUsages)
  const replaceVariableReferences = useWorkflowStore((state) => state.replaceVariableReferences)
  const { 
    collectedData, 
    setCollectedData,
    updateDataRow, 
    deleteDataRow, 
    addDataRow,
    clearCollectedData,
    name: workflowName,
    dataAssets,
    bottomPanelTab: activeTab,
    setBottomPanelTab: setActiveTab,
    verboseLog,
    setVerboseLog,
    maxLogCount,
    setMaxLogCount,
    currentExecutionWorkflowId,
  } = useWorkflowStore()

  const { alert, confirm, ConfirmDialog } = useConfirm()
  const logEndRef = useRef<HTMLDivElement>(null)

  const [isCollapsed, setIsCollapsed] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')
  const [isAddingColumn, setIsAddingColumn] = useState(false)
  
  // 日志搜索和筛选 - 改为多选模式
  const [logSearchQuery, setLogSearchQuery] = useState('')
  const [logLevelFilters, setLogLevelFilters] = useState<Set<LogLevel>>(new Set(['debug', 'info', 'success', 'warning', 'error']))
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  
  // 变量相关状态
  const [isAddingVar, setIsAddingVar] = useState(false)
  const [newVarName, setNewVarName] = useState('')
  const [newVarValue, setNewVarValue] = useState('')
  const [newVarType, setNewVarType] = useState<VariableType>('string')
  const [editingVar, setEditingVar] = useState<string | null>(null)
  const [editVarValue, setEditVarValue] = useState('')
  
  // 变量名编辑状态
  const [editingVarName, setEditingVarName] = useState<string | null>(null)
  const [editVarNameValue, setEditVarNameValue] = useState('')
  const [renameDialog, setRenameDialog] = useState<{
    oldName: string
    newName: string
    usageCount: number
  } | null>(null)

  // 切换日志级别筛选
  const toggleLogLevelFilter = (level: LogLevel) => {
    setLogLevelFilters(prev => {
      const newFilters = new Set(prev)
      if (newFilters.has(level)) {
        newFilters.delete(level)
      } else {
        newFilters.add(level)
      }
      return newFilters
    })
  }

  // 全选/取消全选
  const toggleAllFilters = () => {
    if (logLevelFilters.size === 5) {
      setLogLevelFilters(new Set())
    } else {
      setLogLevelFilters(new Set(['debug', 'info', 'success', 'warning', 'error']))
    }
  }

  // 过滤后的日志
  const filteredLogs = useMemo(() => {
    const filtered = logs.filter(log => {
      // 类型筛选 - 多选模式
      // 注意：size === 0 表示用户主动取消了所有勾选，应当过滤掉所有日志，而不是显示全部
      if (!logLevelFilters.has(log.level)) {
        return false
      }
      // 搜索筛选
      if (logSearchQuery.trim()) {
        const query = logSearchQuery.toLowerCase()
        return log.message.toLowerCase().includes(query)
      }
      return true
    })
    // 只显示最近的日志，避免渲染过多DOM
    return filtered.slice(-maxLogCount)
  }, [logs, logLevelFilters, logSearchQuery, maxLogCount])

  // 自动滚动到最新日志
  useEffect(() => {
    // 每次 filteredLogs 变化都滚动到底部
    if (logEndRef.current && activeTab === 'logs' && filteredLogs.length > 0) {
      requestAnimationFrame(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'auto' })
      })
    }
  }, [filteredLogs, activeTab])

  // 数据预览顺序：tail=跟随最新（自动滚到底部），head=停在最早
  // 不再限制展示条数——全量交给虚拟滚动表格（DataTable 仅渲染可视行，上万条也不卡）
  const [dataDisplayMode] = useState<'tail' | 'head'>('tail')

  // 获取所有列名
  const columns = Array.from(
    new Set(collectedData.flatMap(row => Object.keys(row)))
  )

  // 全量展示：直接把所有收集数据交给虚拟滚动表格，不再切片
  const displayedData = collectedData
  // 不再有偏移（展示索引 = 真实索引）
  const displayedRowOffset = 0

  // 让 AI 诊断：收集最近错误/警告日志，喂给小助手自动分析修复
  const handleAIDiagnose = () => {
    const bad = logs.filter((l) => l.level === 'error' || l.level === 'warning').slice(-20)
    const lines = bad.map((l) => `[${l.level.toUpperCase()}] ${l.message}`).join('\n')
    const prompt = bad.length > 0
      ? `我的工作流运行出现了问题，请帮我诊断并给出修复方案。\n\n最近的错误/警告日志（共 ${bad.length} 条）：\n${lines}\n\n请：1) 分析失败的根本原因；2) 定位到具体是哪个模块/配置导致的；3) 给出可操作的修复步骤，必要时直接帮我修改对应节点的配置。`
      : `请读取我最近的执行日志（可调用 get_recent_logs），分析工作流是否存在问题或可优化之处，并给出建议。`
    emitAssistantUiEvent('ask_ai', { prompt, autoSend: true })
  }

  const handleExportLogs = () => {
    const logText = filteredLogs
      .map((log) => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`)
      .join('\n')
    
    const blob = new Blob([logText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `workflow-logs-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleLogClick = (nodeId?: string) => {
    if (nodeId) {
      // 选中节点
      selectNode(nodeId)
      
      // 调用父组件传入的回调函数来定位节点
      if (onLogClick) {
        onLogClick(nodeId)
      }
    }
  }

  // 数据表格相关方法
  const handleAddRow = () => {
    const newRow: DataRow = {}
    columns.forEach(col => { newRow[col] = '' })
    if (columns.length === 0) {
      newRow['列1'] = ''
    }
    addDataRow(newRow)
  }

  const handleAddColumn = () => {
    if (!newColumnName.trim()) return
    const updatedData = collectedData.map(row => ({
      ...row,
      [newColumnName]: ''
    }))
    setCollectedData(updatedData.length > 0 ? updatedData : [{ [newColumnName]: '' }])
    setNewColumnName('')
    setIsAddingColumn(false)
  }

  const handleDeleteColumn = (colName: string) => {
    const updatedData = collectedData.map(row => {
      const newRow = { ...row }
      delete newRow[colName]
      return newRow
    })
    setCollectedData(updatedData)
  }

  // 把数据数组转换成 CSV 文本（含 BOM），然后下载
  const downloadCsv = useCallback((rows: DataRow[], cols: string[], suffix = '') => {
    const headers = cols.join(',')
    const csvRows = rows.map(row =>
      cols.map(col => {
        const value = String(row[col] ?? '')
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }).join(',')
    )
    const BOM = '\uFEFF'
    const csvContent = BOM + [headers, ...csvRows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${workflowName || '数据'}${suffix}_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [workflowName])

  // 智能下载：永远优先后端完整数据；本地预览数据仅最后兜底
  const [downloading, setDownloading] = useState(false)
  const handleDownloadData = useCallback(async () => {
    setDownloading(true)
    try {
      const tryDownload = async (rows: Record<string, unknown>[], serverColumns: string[] | undefined) => {
        const finalCols: string[] = serverColumns ? [...serverColumns] : []
        const seen = new Set<string>(finalCols)
        rows.forEach(r => {
          Object.keys(r).forEach(k => {
            if (!seen.has(k)) {
              seen.add(k)
              finalCols.push(k)
            }
          })
        })
        downloadCsv(rows as DataRow[], finalCols)
      }

      let backendError = ''

      // 第 1 层：用当前执行 ID 取
      if (currentExecutionWorkflowId) {
        try {
          const result = await workflowApi.getFullData(currentExecutionWorkflowId)
          if (result.success && result.data && result.data.total > 0) {
            await tryDownload(result.data.rows, result.data.columns)
            return
          }
          backendError = result.error || (result.data?.total === 0 ? 'empty' : 'unknown')
        } catch (e) {
          backendError = e instanceof Error ? e.message : String(e)
        }
      }

      // 第 2 层：兜底 latest（防止 currentExecutionWorkflowId 与后端不一致 / 已 LRU 清理）
      try {
        const latest = await workflowApi.getLatestFullData()
        if (latest.success && latest.data && latest.data.total > 0) {
          await tryDownload(latest.data.rows, latest.data.columns)
          return
        }
      } catch {
        // 忽略，继续兜底本地
      }

      // 第 3 层：本地预览数据（仅兜底；本地 5000 条上限基本不会触达）
      if (collectedData.length === 0) {
        await alert(
          backendError && backendError !== 'empty'
            ? `从后端获取完整数据失败：${backendError}\n并且本地没有任何收集数据可下载`
            : '暂无数据可下载（请先运行一次工作流）',
        )
        return
      }
      const ok = await confirm(
        `已从本地预览缓存读取到 ${collectedData.length} 条数据，将全部导出。\n（如需更完整的历史数据，请在执行结束后立即下载）`,
        { title: '导出本地数据', type: 'confirm', confirmText: '导出' },
      )
      if (!ok) return
      downloadCsv(collectedData, columns)
    } finally {
      setDownloading(false)
    }
  }, [currentExecutionWorkflowId, collectedData, columns, downloadCsv, alert, confirm])

  // 监听 AI 小助手发起的 UI 事件
  useEffect(() => {
    const offs: Array<() => void> = []
    offs.push(onAssistantUiEvent('export_logs', () => {
      handleExportLogs()
    }))
    offs.push(onAssistantUiEvent('download_data', () => {
      handleDownloadData()
    }))
    offs.push(onAssistantUiEvent('upload_excel', () => {
      // ExcelAssetsPanel 通过 window.__excelUploadTrigger 暴露上传函数
      if ((window as any).__excelUploadTrigger) {
        (window as any).__excelUploadTrigger()
      }
    }))
    offs.push(onAssistantUiEvent('upload_image', () => {
      if ((window as any).__imageUploadTrigger) {
        (window as any).__imageUploadTrigger()
      }
    }))
    return () => {
      offs.forEach((off) => off())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleDownloadData])

  // 变量相关方法
  const parseVariableValue = (value: string, type: VariableType): unknown => {
    try {
      switch (type) {
        case 'number':
          const num = parseFloat(value)
          return isNaN(num) ? 0 : num
        case 'boolean':
          return value.toLowerCase() === 'true' || value === '1'
        case 'array':
          if (!value.trim()) return []
          return JSON.parse(value)
        case 'object':
          if (!value.trim()) return {}
          return JSON.parse(value)
        default:
          return value
      }
    } catch {
      if (type === 'array') return []
      if (type === 'object') return {}
      return value
    }
  }

  const handleAddVariable = () => {
    if (!newVarName.trim()) return
    const parsedValue = parseVariableValue(newVarValue, newVarType)
    addVariable({ name: newVarName.trim(), value: parsedValue, type: newVarType, scope: 'global' })
    setNewVarName('')
    setNewVarValue('')
    setNewVarType('string')
    setIsAddingVar(false)
  }

  const formatVariableValue = (value: unknown, type: VariableType): string => {
    if (value === null || value === undefined) return ''
    if (type === 'array' || type === 'object' || typeof value === 'object') {
      try {
        return JSON.stringify(value)
      } catch {
        return String(value)
      }
    }
    return String(value)
  }

  const startEditVar = (name: string, value: unknown, type: VariableType) => {
    setEditingVar(name)
    setEditVarValue(formatVariableValue(value, type))
  }

  const saveEditVar = () => {
    if (editingVar) {
      const variable = variables.find(v => v.name === editingVar)
      if (variable) {
        const parsedValue = parseVariableValue(editVarValue, variable.type)
        updateVariable(editingVar, parsedValue)
      }
      setEditingVar(null)
      setEditVarValue('')
    }
  }

  const startEditVarName = (name: string) => {
    setEditingVarName(name)
    setEditVarNameValue(name)
  }

  const saveEditVarName = () => {
    if (!editingVarName || !editVarNameValue) {
      setEditingVarName(null)
      return
    }
    
    const oldName = editingVarName
    const newName = editVarNameValue.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '')
    
    if (!newName || oldName === newName) {
      setEditingVarName(null)
      return
    }
    
    if (variables.some(v => v.name === newName)) {
      setEditingVarName(null)
      return
    }
    
    const usages = findVariableUsages(oldName)
    
    if (usages.length > 0) {
      setRenameDialog({
        oldName,
        newName,
        usageCount: usages.length,
      })
    } else {
      renameVariable(oldName, newName)
      setEditingVarName(null)
    }
  }

  const handleConfirmRename = () => {
    if (!renameDialog) return
    replaceVariableReferences(renameDialog.oldName, renameDialog.newName)
    renameVariable(renameDialog.oldName, renameDialog.newName)
    setRenameDialog(null)
    setEditingVarName(null)
  }

  const handleCancelRename = () => {
    if (!renameDialog) return
    renameVariable(renameDialog.oldName, renameDialog.newName)
    setRenameDialog(null)
    setEditingVarName(null)
  }

  // 受 layoutStore 控制的高度（用户可拖拽）
  const bottomHeight = useLayoutStore((s) => s.bottomHeight)
  const setBottomHeight = useLayoutStore((s) => s.setBottomHeight)
  const [draftBottomHeight, setDraftBottomHeight] = useState<number | null>(null)
  const effectiveBottomHeight = draftBottomHeight ?? bottomHeight

  return (
    <motion.footer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 30, delay: 0.1 }}
      className={cn(
        'relative border-t border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[0_-4px_12px_-6px_rgb(15_23_42_/_0.06)]',
      )}
      style={{
        height: isCollapsed ? 40 : effectiveBottomHeight,
        transition: draftBottomHeight === null ? 'height 300ms cubic-bezier(0.25,1,0.5,1)' : 'none',
      }}
    >
      {!isCollapsed && (
        <PanelResizer
          direction="vertical"
          side="top"
          size={effectiveBottomHeight}
          minSize={LAYOUT_LIMITS.bottom.min}
          maxSize={LAYOUT_LIMITS.bottom.max}
          factor={-1}
          onLive={(h) => setDraftBottomHeight(h)}
          onCommit={(h) => {
            setBottomHeight(h)
            setDraftBottomHeight(null)
          }}
        />
      )}
      <div
        className="h-10 px-2 sm:px-4 flex items-center justify-between border-b border-[hsl(var(--border))] overflow-x-auto"
        style={{ background: 'linear-gradient(180deg, hsl(var(--brand-50) / 0.5), hsl(var(--card)))' }}
      >
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          {/* 分页标签 - 现代化彩色徽章 Tab */}
          <div className="flex items-center gap-1">
            {/* 执行日志 - 蓝 */}
            <button
              className={cn(
                'flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[12px] rounded-[8px] transition-[background-color,color,border-color,box-shadow] duration-150 ease-out whitespace-nowrap font-semibold border',
                activeTab === 'logs'
                  ? '!bg-[hsl(var(--brand-600))] !text-white !border-[hsl(var(--brand-700))] shadow-brand-glow'
                  : '!bg-transparent !text-[hsl(var(--slate-600))] !border-transparent hover:!bg-[hsl(var(--brand-50))] hover:!text-[hsl(var(--brand-700))]'
              )}
              onClick={() => setActiveTab('logs')}
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">执行日志</span>
              <span className="sm:hidden">日志</span>
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full font-mono',
                activeTab === 'logs' ? '!bg-white/25 !text-white' : 'bg-[hsl(var(--slate-100))]'
              )}>
                {logs.length}
              </span>
            </button>
            {/* 数据表格 - 青蓝 */}
            <button
              className={cn(
                'flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[12px] rounded-[8px] transition-[background-color,color,border-color,box-shadow] duration-150 ease-out whitespace-nowrap font-semibold border',
                activeTab === 'data'
                  ? '!bg-[hsl(var(--info-600))] !text-white !border-[hsl(var(--info-700))] shadow-pop'
                  : '!bg-transparent !text-[hsl(var(--slate-600))] !border-transparent hover:!bg-[hsl(var(--info-50))] hover:!text-[hsl(var(--info-700))]'
              )}
              onClick={() => setActiveTab('data')}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">数据表格</span>
              <span className="sm:hidden">数据</span>
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full font-mono',
                activeTab === 'data' ? '!bg-white/25 !text-white' : 'bg-[hsl(var(--slate-100))]'
              )}>
                {collectedData.length}
              </span>
            </button>
            {/* 全局变量 - 紫 */}
            <button
              className={cn(
                'flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[12px] rounded-[8px] transition-[background-color,color,border-color,box-shadow] duration-150 ease-out whitespace-nowrap font-semibold border',
                activeTab === 'variables'
                  ? '!bg-[hsl(var(--violet-600))] !text-white !border-[hsl(var(--violet-700))] shadow-pop'
                  : '!bg-transparent !text-[hsl(var(--slate-600))] !border-transparent hover:!bg-[hsl(var(--violet-50))] hover:!text-[hsl(var(--violet-700))]'
              )}
              onClick={() => setActiveTab('variables')}
            >
              <Variable className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">全局变量</span>
              <span className="sm:hidden">变量</span>
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full font-mono',
                activeTab === 'variables' ? '!bg-white/25 !text-white' : 'bg-[hsl(var(--slate-100))]'
              )}>
                {variables.length}
              </span>
            </button>
            {/* Excel - 绿 */}
            <button
              className={cn(
                'flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[12px] rounded-[8px] transition-[background-color,color,border-color,box-shadow] duration-150 ease-out whitespace-nowrap font-semibold border',
                activeTab === 'assets'
                  ? '!bg-[hsl(var(--success-600))] !text-white !border-[hsl(var(--success-700))] shadow-success-glow'
                  : '!bg-transparent !text-[hsl(var(--slate-600))] !border-transparent hover:!bg-[hsl(var(--success-50))] hover:!text-[hsl(var(--success-700))]'
              )}
              onClick={() => setActiveTab('assets')}
            >
              <Database className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Excel资源</span>
              <span className="md:hidden">Excel</span>
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full font-mono',
                activeTab === 'assets' ? '!bg-white/25 !text-white' : 'bg-[hsl(var(--slate-100))]'
              )}>
                {dataAssets.length}
              </span>
            </button>
            {/* 图像 - 橙 */}
            <button
              className={cn(
                'flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[12px] rounded-[8px] transition-[background-color,color,border-color,box-shadow] duration-150 ease-out whitespace-nowrap font-semibold border',
                activeTab === 'images'
                  ? '!bg-[hsl(var(--warning-500))] !text-white !border-[hsl(var(--warning-600))] shadow-warning-glow'
                  : '!bg-transparent !text-[hsl(var(--slate-600))] !border-transparent hover:!bg-[hsl(var(--warning-50))] hover:!text-[hsl(var(--warning-700))]'
              )}
              onClick={() => setActiveTab('images')}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">图像资源</span>
              <span className="md:hidden">图像</span>
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full font-mono',
                activeTab === 'images' ? '!bg-white/25 !text-white' : 'bg-[hsl(var(--slate-100))]'
              )}>
                {useWorkflowStore.getState().imageAssets.length}
              </span>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {activeTab === 'logs' && (
            <>
              {/* 详细日志开关 */}
              <button
                className={cn(
                  'h-7 px-2 text-xs rounded-md flex items-center gap-1.5 transition-colors border',
                  verboseLog 
                    ? 'bg-[hsl(var(--success-50))] text-[hsl(var(--success-500))] border-[hsl(var(--success-500)/0.25)]' 
                    : 'bg-transparent text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'
                )}
                onClick={() => setVerboseLog(!verboseLog)}
                title={verboseLog ? '切换为简洁日志' : '切换为详细日志'}
              >
                {verboseLog ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-[hsl(var(--success-500))]" />
                    详细日志
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-[hsl(var(--slate-400))]" />
                    简洁日志
                  </>
                )}
              </button>
              <Button variant="tonal-info" size="sm" className="h-7 text-xs" onClick={handleExportLogs} title="下载日志">
                <Download className="w-3.5 h-3.5 mr-1" />
                下载
              </Button>
              <Button
                variant="tonal"
                size="sm"
                className="h-7 text-xs"
                onClick={handleAIDiagnose}
                title="让 AI 小助手分析最近的错误日志并给出修复方案"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                AI诊断
              </Button>
              <Button variant="tonal-danger" size="icon" className="h-7 w-7" onClick={clearLogs} title="清空日志">
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
          {activeTab === 'data' && (
            <>
              <Button variant="default" size="sm" className="h-7 text-xs" onClick={handleAddRow}>
                <Plus className="w-3.5 h-3.5 mr-1" />行
              </Button>
              {isAddingColumn ? (
                <div className="flex items-center gap-1">
                  <Input value={newColumnName} onChange={(e) => setNewColumnName(e.target.value)}
                    placeholder="列名" className="w-20 h-7 text-xs" onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()} />
                  <Button size="icon" variant="default" className="h-7 w-7" onClick={handleAddColumn}><Check className="w-3.5 h-3.5" /></Button>
                  <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setIsAddingColumn(false)}><X className="w-3.5 h-3.5" /></Button>
                </div>
              ) : (
                <Button variant="default" size="sm" className="h-7 text-xs" onClick={() => setIsAddingColumn(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" />列
                </Button>
              )}
              <Button variant="tonal-danger" size="icon" className="h-7 w-7" onClick={clearCollectedData} title="清空数据"><Trash2 className="w-4 h-4" /></Button>
              <Button
                variant="success"
                size="sm"
                className="h-7 text-xs"
                onClick={handleDownloadData}
                disabled={downloading}
                title="下载本次收集到的全部数据（不受预览条数限制）"
              >
                <FileDown className="w-3.5 h-3.5 mr-1" />
                {downloading ? '下载中...' : '下载数据'}
              </Button>
            </>
          )}
          {activeTab === 'variables' && (
            <>
              {isAddingVar ? (
                <div className="flex items-center gap-1">
                  <Input value={newVarName} onChange={(e) => setNewVarName(e.target.value)}
                    placeholder="变量名" className="w-20 h-7 text-xs" />
                  <Select 
                    value={newVarType} 
                    onChange={(e) => setNewVarType(e.target.value as VariableType)}
                    className="w-16 h-7 text-xs"
                  >
                    <option value="string">字符串</option>
                    <option value="number">数字</option>
                    <option value="boolean">布尔</option>
                    <option value="array">列表</option>
                    <option value="object">字典</option>
                  </Select>
                  {newVarType === 'boolean' ? (
                    <Select 
                      value={newVarValue || 'false'} 
                      onChange={(e) => setNewVarValue(e.target.value)}
                      className="w-16 h-7 text-xs"
                    >
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </Select>
                  ) : (
                    <Input value={newVarValue} onChange={(e) => setNewVarValue(e.target.value)}
                      placeholder={newVarType === 'number' ? '0' : newVarType === 'array' ? '[]' : newVarType === 'object' ? '{}' : '值'} 
                      className="w-20 h-7 text-xs" 
                      onKeyDown={(e) => e.key === 'Enter' && handleAddVariable()} />
                  )}
                  <Button size="icon" variant="tonal-success" className="h-7 w-7" onClick={handleAddVariable}><Check className="w-3.5 h-3.5" /></Button>
                  <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setIsAddingVar(false)}><X className="w-3.5 h-3.5" /></Button>
                </div>
              ) : (
                <Button variant="default" size="sm" className="h-7 text-xs" onClick={() => setIsAddingVar(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" />添加变量
                </Button>
              )}
            </>
          )}
          {activeTab === 'assets' && (
            <Button 
              variant="success" 
              size="sm" 
              className="h-7 text-xs" 
              onClick={() => {
                // 调用ExcelAssetsPanel的上传函数
                if ((window as any).__excelUploadTrigger) {
                  (window as any).__excelUploadTrigger()
                }
              }}
            >
              <Upload className="w-3.5 h-3.5 mr-1" />
              上传Excel
            </Button>
          )}
          {activeTab === 'images' && (
            <>
              {/* 截图快捷键提示 - 紧贴上传图像按钮左侧 */}
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-blue-200 bg-blue-50/70">
                <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-[11px] font-medium text-blue-700 whitespace-nowrap">按 Win+Shift+S 截图，WebRPA 自动检测</span>
              </div>
              <Button
                variant="warning"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  // 调用ImageAssetsPanel的上传函数
                  if ((window as any).__imageUploadTrigger) {
                    (window as any).__imageUploadTrigger()
                  }
                }}
              >
                <Upload className="w-3.5 h-3.5 mr-1" />
                上传图像
              </Button>
            </>
          )}
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setIsCollapsed(!isCollapsed)} title={isCollapsed ? '展开' : '收起'}>
            {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="h-[calc(100%-2.5rem)] animate-fade-in">
          {activeTab === 'logs' && (
            <div className="h-full flex flex-col">
              {/* 日志搜索和筛选栏 */}
              <div
                className="flex items-center gap-2 px-3 py-2 border-b border-[hsl(var(--border))]"
                style={{ background: 'linear-gradient(180deg, hsl(var(--slate-50)), hsl(var(--card)))' }}
              >
                <div className="relative flex-1 max-w-xs group">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--muted-foreground))] group-focus-within:text-[hsl(var(--brand-600))] transition-colors duration-150" />
                  <Input
                    value={logSearchQuery}
                    onChange={(e) => setLogSearchQuery(e.target.value)}
                    placeholder="搜索日志..."
                    className="!pl-7 !pr-7 !h-7 !text-[12px] !rounded-[8px]"
                  />
                  {logSearchQuery && (
                    <button
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-[hsl(var(--danger-50))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--danger-600))] transition-all active:scale-90"
                      onClick={() => setLogSearchQuery('')}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="relative flex items-center gap-1">
                  <button
                    onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                    className={cn(
                      'h-7 px-2.5 text-[12px] rounded-[7px] transition-all duration-150 flex items-center gap-1.5 font-medium border',
                      showFilterDropdown
                        ? 'bg-[hsl(var(--brand-100))] text-[hsl(var(--brand-700))] border-[hsl(var(--brand-500)/0.4)] shadow-xs'
                        : 'bg-[hsl(var(--card))] text-[hsl(var(--slate-700))] border-[hsl(var(--border))] hover:bg-[hsl(var(--brand-50))] hover:text-[hsl(var(--brand-700))] hover:border-[hsl(var(--brand-500)/0.3)]'
                    )}
                  >
                    <Filter className="w-3 h-3" />
                    <span>筛选</span>
                    <span className="badge badge-brand !py-0 !px-1.5 !text-[9px]">
                      {logLevelFilters.size}
                    </span>
                    <ChevronDown className={cn('w-3 h-3 transition-transform duration-200', showFilterDropdown ? 'rotate-180' : '')} />
                  </button>
                  {showFilterDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowFilterDropdown(false)}
                      />
                      <div className="absolute top-full left-0 mt-2 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[10px] shadow-pop-xl p-1.5 z-50 min-w-[180px] animate-scale-in">
                        <div className="space-y-0.5">
                          <label className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-[hsl(var(--brand-50))] hover:text-[hsl(var(--brand-700))] rounded-[6px] cursor-pointer text-[12px] transition-colors">
                            <Checkbox
                              checked={logLevelFilters.size === 5}
                              onCheckedChange={toggleAllFilters}
                            />
                            <span className="font-semibold">全选/取消</span>
                          </label>
                          <div className="h-px bg-[hsl(var(--border))] my-1" />
                          <label className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-[hsl(var(--slate-100))] rounded-[6px] cursor-pointer text-[12px] transition-colors">
                            <Checkbox
                              checked={logLevelFilters.has('debug')}
                              onCheckedChange={() => toggleLogLevelFilter('debug')}
                            />
                            <span className="w-2 h-2 rounded-full bg-[hsl(var(--slate-400))]" />
                            <span className="text-[hsl(var(--slate-700))]">调试</span>
                          </label>
                          <label className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-[hsl(var(--info-50))] rounded-[6px] cursor-pointer text-[12px] transition-colors">
                            <Checkbox
                              checked={logLevelFilters.has('info')}
                              onCheckedChange={() => toggleLogLevelFilter('info')}
                            />
                            <span className="w-2 h-2 rounded-full bg-[hsl(var(--info-500))]" />
                            <span className="text-[hsl(var(--info-700))] font-medium">信息</span>
                          </label>
                          <label className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-[hsl(var(--success-50))] rounded-[6px] cursor-pointer text-[12px] transition-colors">
                            <Checkbox
                              checked={logLevelFilters.has('success')}
                              onCheckedChange={() => toggleLogLevelFilter('success')}
                            />
                            <span className="w-2 h-2 rounded-full bg-[hsl(var(--success-500))]" />
                            <span className="text-[hsl(var(--success-700))] font-medium">成功</span>
                          </label>
                          <label className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-[hsl(var(--warning-50))] rounded-[6px] cursor-pointer text-[12px] transition-colors">
                            <Checkbox
                              checked={logLevelFilters.has('warning')}
                              onCheckedChange={() => toggleLogLevelFilter('warning')}
                            />
                            <span className="w-2 h-2 rounded-full bg-[hsl(var(--warning-500))]" />
                            <span className="text-[hsl(var(--warning-700))] font-medium">警告</span>
                          </label>
                          <label className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-[hsl(var(--danger-50))] rounded-[6px] cursor-pointer text-[12px] transition-colors">
                            <Checkbox
                              checked={logLevelFilters.has('error')}
                              onCheckedChange={() => toggleLogLevelFilter('error')}
                            />
                            <span className="w-2 h-2 rounded-full bg-[hsl(var(--danger-500))]" />
                            <span className="text-[hsl(var(--danger-700))] font-medium">错误</span>
                          </label>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-[hsl(var(--muted-foreground))] font-medium">显示</span>
                  <Select
                    value={String(maxLogCount)}
                    onChange={(e) => setMaxLogCount(Number(e.target.value))}
                    className="!h-7 !text-[11px] !w-20"
                  >
                    <option value="100">100条</option>
                    <option value="200">200条</option>
                    <option value="300">300条</option>
                    <option value="400">400条</option>
                    <option value="500">500条</option>
                  </Select>
                </div>
                <span className="text-[12px] text-[hsl(var(--brand-700))] font-bold font-mono">
                  {filteredLogs.length}/{logs.length}
                </span>
                
                {/* 日志延迟提示 */}
                <div className="status-row status-row-warning !py-1 !px-2.5 ml-auto">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-[11px] whitespace-nowrap font-medium">
                    日志展示有一定延迟，建议添加「提示音」模块以判断流程结束
                  </span>
                </div>
              </div>
              
              {filteredLogs.length === 0 ? (
                <div className="flex-1 empty-state animate-fade-in">
                  {logs.length === 0 ? (
                    <>
                      <div className="empty-state-icon">
                        <FileText className="w-7 h-7" strokeWidth={1.6} />
                      </div>
                      <div className="empty-state-title">暂无日志</div>
                      <div className="empty-state-desc">
                        默认只显示"打印日志"模块的内容，开启「详细日志」可查看所有模块执行日志
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="empty-state-icon" style={{ background: 'linear-gradient(135deg, hsl(var(--info-50)), hsl(var(--info-100)))', color: 'hsl(var(--info-500))', borderColor: 'hsl(var(--info-500) / 0.15)' }}>
                        <Search className="w-7 h-7" strokeWidth={1.6} />
                      </div>
                      <div className="empty-state-title">未找到匹配的日志</div>
                      <div className="empty-state-desc">试试其他关键词或筛选条件</div>
                    </>
                  )}
                </div>
              ) : (
                <LogList
                  logs={filteredLogs}
                  searchQuery={logSearchQuery}
                  onLogClick={handleLogClick}
                />
              )}
            </div>
          )}

          {activeTab === 'data' && (
            <div className="h-full flex flex-col">
              {collectedData.length === 0 && columns.length === 0 ? (
                <div className="flex-1 empty-state animate-fade-in">
                  <div className="empty-state-icon" style={{ background: 'linear-gradient(135deg, hsl(var(--info-50)), hsl(var(--info-100)))', color: 'hsl(var(--info-500))', borderColor: 'hsl(var(--info-500) / 0.15)' }}>
                    <FileSpreadsheet className="w-7 h-7" strokeWidth={1.6} />
                  </div>
                  <div className="empty-state-title">暂无收集的数据</div>
                  <div className="empty-state-desc">
                    执行工作流后，收集的数据将显示在这里。可在底栏选择预览条数与顺序，完整数据请点击「下载数据」或使用「导出数据表」模块导出
                  </div>
                </div>
              ) : (
                <DataTable
                  data={displayedData}
                  columns={columns}
                  displayMode={dataDisplayMode}
                  displayLimit={0}
                  onEdit={(rowIndex, col, value) => {
                    const realIndex = rowIndex + displayedRowOffset
                    updateDataRow(realIndex, { ...collectedData[realIndex], [col]: value })
                  }}
                  onDeleteRow={(rowIndex) => deleteDataRow(rowIndex + displayedRowOffset)}
                  onDeleteColumn={(col) => handleDeleteColumn(col)}
                />
              )}
            </div>
          )}

          {activeTab === 'variables' && (
            <ScrollArea className="h-full p-2">
              {variables.length === 0 ? (
                <div className="h-full empty-state animate-fade-in">
                  <div className="empty-state-icon" style={{ background: 'linear-gradient(135deg, hsl(var(--violet-50)), hsl(var(--violet-100)))', color: 'hsl(var(--violet-500))', borderColor: 'hsl(var(--violet-500) / 0.15)' }}>
                    <Variable className="w-7 h-7" strokeWidth={1.6} />
                  </div>
                  <div className="empty-state-title">暂无全局变量</div>
                  <div className="empty-state-desc">
                    点击「添加变量」创建第一个全局变量。
                    <br />
                    <span className="font-mono text-[10.5px] mt-1.5 inline-block text-[hsl(var(--violet-700))]">
                      {'{变量名}'} · {'{列表[0]}'} · {'{字典[键名]}'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <div className="overflow-x-auto flex-1">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="border px-2 py-1.5 text-left font-medium w-32">变量名</th>
                          <th className="border px-2 py-1.5 text-left font-medium">值</th>
                          <th className="border px-2 py-1.5 text-left font-medium w-20">类型</th>
                          <th className="border px-2 py-1.5 w-12">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {variables.map((v) => (
                          <tr key={v.name} className="hover:bg-muted/30">
                            <td className="border px-2 py-1 cursor-pointer hover:bg-muted/50" onClick={() => startEditVarName(v.name)}>
                              {editingVarName === v.name ? (
                                <Input 
                                  value={editVarNameValue} 
                                  onChange={(e) => setEditVarNameValue(e.target.value.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, ''))} 
                                  className="h-6 text-xs font-mono" 
                                  autoFocus
                                  onKeyDown={(e) => { 
                                    if (e.key === 'Enter') saveEditVarName(); 
                                    if (e.key === 'Escape') setEditingVarName(null); 
                                  }} 
                                  onBlur={saveEditVarName} 
                                />
                              ) : (
                                <div className="flex items-center justify-between group">
                                  <span className="font-mono text-blue-600">{v.name}</span>
                                  <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-50" />
                                </div>
                              )}
                            </td>
                            <td className="border px-2 py-1 cursor-pointer hover:bg-muted/50" onClick={() => startEditVar(v.name, v.value, v.type)}>
                              {editingVar === v.name ? (
                                <Input value={editVarValue} onChange={(e) => setEditVarValue(e.target.value)} className="h-6 text-xs" autoFocus
                                  onKeyDown={(e) => { if (e.key === 'Enter') saveEditVar(); if (e.key === 'Escape') setEditingVar(null); }} onBlur={saveEditVar} />
                              ) : (
                                <div className="flex items-center justify-between group">
                                  <span className="truncate max-w-[200px]" title={formatVariableValue(v.value, v.type)}>{formatVariableValue(v.value, v.type)}</span>
                                  <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-50" />
                                </div>
                              )}
                            </td>
                            <td className="border px-2 py-1 text-muted-foreground">{v.type}</td>
                            <td className="border px-2 py-1 text-center">
                              <Button variant="ghost" size="icon" className="w-5 h-5" onClick={() => deleteVariable(v.name)}>
                                <Trash2 className="w-3 h-3 text-destructive" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="pt-2 border-t mt-2 text-[10px] text-muted-foreground">
                    <span className="font-medium">引用语法：</span>
                    {'{变量名}'} · {'{列表[0]}'} · {'{列表[-1]}'} · {'{字典[键名]}'} · {'{数据[0][name]}'}
                  </div>
                </div>
              )}
            </ScrollArea>
          )}

          {activeTab === 'assets' && <ExcelAssetsPanel />}

          {activeTab === 'images' && <ImageAssetsPanel />}
        </div>
      )}

      {/* 变量重命名确认弹窗 */}
      {renameDialog && (
        <DialogPortal>
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm" style={{ zIndex: 2147483646 }}>
            <div className="bg-white rounded-2xl shadow-2xl w-[420px] mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[hsl(var(--card))] h-1.5" />
            <div className="p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="bg-[hsl(var(--card))] w-10 h-10 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">变量重命名</h3>
                  <p className="text-xs text-gray-500">检测到变量引用需要更新</p>
                </div>
              </div>
              <div className="bg-[hsl(var(--card))] rounded-xl p-4 mb-5">
                <div className="flex items-center justify-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm border border-gray-200">
                    <span className="text-xs text-gray-500">原名</span>
                    <code className="text-sm font-mono font-semibold text-red-600">{'{' + renameDialog.oldName + '}'}</code>
                  </div>
                  <div className="bg-[hsl(var(--card))] flex items-center justify-center w-8 h-8 rounded-full shadow-md">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm border border-gray-200">
                    <span className="text-xs text-gray-500">新名</span>
                    <code className="text-sm font-mono font-semibold text-emerald-600">{'{' + renameDialog.newName + '}'}</code>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl mb-6">
                <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-amber-800">
                  发现 <span className="font-bold text-amber-900">{renameDialog.usageCount}</span> 处引用了此变量
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCancelRename}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all duration-200 hover:shadow-md active:scale-[0.98]"
                >
                  仅改名称
                </button>
                <button
                  onClick={handleConfirmRename}
                  className="bg-[hsl(var(--success-600))] hover:bg-[hsl(var(--success-700))] flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-colors duration-150 shadow-lg hover:shadow-success-glow"
                >
                  全部更新
                </button>
              </div>
            </div>
          </div>
          </div>
        </DialogPortal>
      )}
      
      {/* 确认对话框 */}
      <ConfirmDialog />
    </motion.footer>
  )
}
