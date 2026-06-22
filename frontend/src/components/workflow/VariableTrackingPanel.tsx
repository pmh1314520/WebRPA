import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { SelectNative } from '@/components/ui/select-native'
import { X, Search, Filter, RefreshCw, Download, Trash2, Clock, Tag, TrendingUp, Eye, EyeOff, Activity } from 'lucide-react'

interface VariableTrackingRecord {
  timestamp: string
  variable_name: string
  old_value: any
  new_value: any
  node_id: string
  node_name: string
  operation: 'create' | 'update'
  value_type: string
}

interface VariableTrackingPanelProps {
  workflowId: string
  isOpen: boolean
  onClose: () => void
}

interface VariableStats {
  count: number
  firstValue: any
  lastValue: any
  operations: { create: number; update: number }
  value_type: string
}

export const VariableTrackingPanel: React.FC<VariableTrackingPanelProps> = ({
  workflowId,
  isOpen,
  onClose
}) => {
  const [trackingRecords, setTrackingRecords] = useState<VariableTrackingRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedVariable, setSelectedVariable] = useState<string | null>(null)
  const [selectedOperation, setSelectedOperation] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [expandedRecords, setExpandedRecords] = useState<Set<number>>(new Set())

  // 获取变量追踪数据
  const fetchTrackingData = async () => {
    if (!workflowId) return
    
    try {
      setLoading(true)
      // 使用动态端口配置
      const { getBackendBaseUrl } = await import('@/services/config')
      const backendUrl = getBackendBaseUrl()
      const response = await fetch(`${backendUrl}/api/workflows/${workflowId}/variable-tracking`)
      const data = await response.json()
      
      if (data.tracking) {
        setTrackingRecords(data.tracking)
      }
    } catch (error) {
      console.error('获取变量追踪数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 自动刷新
  useEffect(() => {
    if (!isOpen || !autoRefresh) return

    fetchTrackingData()
    const interval = setInterval(fetchTrackingData, 1000) // 每秒刷新一次

    return () => clearInterval(interval)
  }, [isOpen, workflowId, autoRefresh])

  // 手动刷新
  const handleRefresh = () => {
    fetchTrackingData()
  }

  // 清空追踪记录
  const handleClear = async () => {
    if (!workflowId) return
    
    try {
      // 调用后端API清空记录
      const { getBackendBaseUrl } = await import('@/services/config')
      const backendUrl = getBackendBaseUrl()
      await fetch(`${backendUrl}/api/workflows/${workflowId}/variable-tracking`, {
        method: 'DELETE'
      })
      
      // 清空本地显示
      setTrackingRecords([])
    } catch (error) {
      console.error('清空变量追踪记录失败:', error)
    }
  }

  // 导出为JSON
  const handleExport = () => {
    const dataStr = JSON.stringify(trackingRecords, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `variable-tracking-${new Date().getTime()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  // 获取所有唯一的变量名
  const uniqueVariables = useMemo(() => {
    const variables = new Set(trackingRecords.map(r => r.variable_name))
    return Array.from(variables).sort()
  }, [trackingRecords])

  // 获取所有唯一的类型
  const uniqueTypes = useMemo(() => {
    const types = new Set(trackingRecords.map(r => r.value_type))
    return Array.from(types).sort()
  }, [trackingRecords])

  // 过滤记录
  const filteredRecords = useMemo(() => {
    return trackingRecords.filter(record => {
      // 搜索过滤
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const matchesSearch = 
          record.variable_name.toLowerCase().includes(searchLower) ||
          record.node_name.toLowerCase().includes(searchLower) ||
          String(record.new_value).toLowerCase().includes(searchLower)
        
        if (!matchesSearch) return false
      }

      // 变量名过滤
      if (selectedVariable && record.variable_name !== selectedVariable) {
        return false
      }

      // 操作类型过滤
      if (selectedOperation !== 'all' && record.operation !== selectedOperation) {
        return false
      }

      // 值类型过滤
      if (selectedType !== 'all' && record.value_type !== selectedType) {
        return false
      }

      return true
    })
  }, [trackingRecords, searchTerm, selectedVariable, selectedOperation, selectedType])

  // 获取变量的统计信息
  const variableStats = useMemo(() => {
    const stats = new Map<string, VariableStats>()

    trackingRecords.forEach(record => {
      if (!stats.has(record.variable_name)) {
        stats.set(record.variable_name, {
          count: 0,
          firstValue: record.new_value,
          lastValue: record.new_value,
          operations: { create: 0, update: 0 },
          value_type: record.value_type
        })
      }

      const stat = stats.get(record.variable_name)!
      stat.count++
      stat.lastValue = record.new_value
      stat.operations[record.operation]++
      stat.value_type = record.value_type
    })

    return stats
  }, [trackingRecords])

  // 切换记录展开状态
  const toggleRecordExpanded = (index: number) => {
    const newExpanded = new Set(expandedRecords)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedRecords(newExpanded)
  }

  // 格式化值显示
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return 'null'
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2)
    }
    return String(value)
  }

  // 格式化时间
  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    } as any)
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm" style={{ zIndex: 2147483646 }}>
      <div className="bg-white rounded-xl shadow-2xl w-[95vw] h-[90vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
        
        {/* 头部 */}
        <div className="bg-[hsl(var(--card))] flex items-center justify-between px-6 py-4 border-b border-gray-200 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-lg bg-[hsl(var(--info-500))]/10 border border-[hsl(var(--info-500))]/30">
              <Activity className="w-5 h-5 text-[hsl(var(--info-500))]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">变量追踪</h2>
              <p className="text-sm text-gray-500">
                共 {trackingRecords.length} 条记录，显示 {filteredRecords.length} 条
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 自动刷新开关 */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                ${autoRefresh 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              title={autoRefresh ? '关闭自动刷新' : '开启自动刷新'}
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            </button>

            {/* 手动刷新 */}
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-3 py-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 
                transition-all duration-200 disabled:opacity-50"
              title="手动刷新"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* 导出 */}
            <button
              onClick={handleExport}
              disabled={trackingRecords.length === 0}
              className="px-3 py-2 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 
                transition-all duration-200 disabled:opacity-50"
              title="导出JSON"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* 清空 */}
            <button
              onClick={handleClear}
              disabled={trackingRecords.length === 0}
              className="px-3 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 
                transition-all duration-200 disabled:opacity-50"
              title="清空记录"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* 关闭 */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors has-hover-only"
              title="关闭"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* 工具栏 */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            {/* 搜索框 */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索变量名、模块名或值..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 
                  focus:ring-orange-500 focus:border-transparent transition-all"
              />
            </div>

            {/* 过滤器按钮 */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2
                ${showFilters 
                  ? 'bg-orange-100 text-orange-700' 
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
            >
              <Filter className="w-4 h-4" />
              过滤器
            </button>
          </div>

          {/* 过滤器面板 */}
          {showFilters && (
            <div className="mt-3 p-4 bg-white rounded-lg border border-gray-200 grid grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
              
              {/* 变量名过滤 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">变量名</label>
                <SelectNative
                  value={selectedVariable || ''}
                  onChange={(e) => setSelectedVariable(e.target.value || null)}
                >
                  <option value="">全部变量</option>
                  {uniqueVariables.map(variable => (
                    <option key={variable} value={variable}>
                      {variable} ({variableStats.get(variable)?.count || 0})
                    </option>
                  ))}
                </SelectNative>
              </div>

              {/* 操作类型过滤 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">操作类型</label>
                <SelectNative
                  value={selectedOperation}
                  onChange={(e) => setSelectedOperation(e.target.value)}
                >
                  <option value="all">全部操作</option>
                  <option value="create">创建</option>
                  <option value="update">更新</option>
                </SelectNative>
              </div>

              {/* 值类型过滤 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">值类型</label>
                <SelectNative
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                >
                  <option value="all">全部类型</option>
                  {uniqueTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </SelectNative>
              </div>
            </div>
          )}
        </div>

        {/* 主内容区 */}
        <div className="flex-1 overflow-hidden flex">
          
          {/* 左侧：变量列表 */}
          <div className="w-64 border-r border-gray-200 bg-gray-50 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4" />
                变量列表 ({uniqueVariables.length})
              </h3>
              <div className="space-y-1">
                {uniqueVariables.map(variable => {
                  const stats = variableStats.get(variable)!
                  const isSelected = selectedVariable === variable
                  
                  return (
                    <button
                      key={variable}
                      onClick={() => setSelectedVariable(isSelected ? null : variable)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200
                        ${isSelected 
                          ? 'bg-orange-100 text-orange-700 shadow-sm' 
                          : 'hover:bg-white text-gray-700 has-hover-only'}`}
                    >
                      <div className="font-medium text-sm truncate">{variable}</div>
                      <div className="text-xs text-gray-500 mt-1 flex items-center justify-between">
                        <span>{stats.count} 次变化</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200">
                          {stats.value_type}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* 右侧：追踪记录 */}
          <div className="flex-1 overflow-y-auto">
            {filteredRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <TrendingUp className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">暂无追踪记录</p>
                <p className="text-sm mt-2">运行工作流后将显示变量变化</p>
              </div>
            ) : (
              <div className="p-6 space-y-3">
                {filteredRecords.map((record, index) => {
                  const isExpanded = expandedRecords.has(index)
                  const oldValueStr = formatValue(record.old_value)
                  const newValueStr = formatValue(record.new_value)
                  const isLongValue = newValueStr.length > 100 || oldValueStr.length > 100

                  return (
                    <div
                      key={index}
                      className="bg-white rounded-lg border border-gray-200 hover:border-orange-300 transition-all duration-200 hover:shadow-md overflow-hidden"
                    >
                      <div className="p-4">
                        {/* 记录头部 */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              record.operation === 'create' ? 'bg-green-500' : 'bg-blue-500'
                            }`} />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-800">
                                  {record.variable_name}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  record.operation === 'create' 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {record.operation === 'create' ? '创建' : '更新'}
                                </span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                  {record.value_type}
                                </span>
                              </div>
                              <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                                <Clock className="w-3 h-3" />
                                {formatTime(record.timestamp)}
                                <span className="mx-1">•</span>
                                {record.node_name}
                              </div>
                            </div>
                          </div>

                          {isLongValue && (
                            <button
                              onClick={() => toggleRecordExpanded(index)}
                              className="p-1 rounded hover:bg-gray-100 transition-colors has-hover-only"
                              title={isExpanded ? '收起' : '展开'}
                            >
                              {isExpanded ? (
                                <EyeOff className="w-4 h-4 text-gray-600" />
                              ) : (
                                <Eye className="w-4 h-4 text-gray-600" />
                              )}
                            </button>
                          )}
                        </div>

                        {/* 值变化 */}
                        <div className="space-y-2">
                          {record.operation === 'update' && record.old_value !== null && (
                            <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                              <div className="text-xs font-medium text-red-700 mb-1">旧值</div>
                              <pre className={`text-sm text-red-800 font-mono whitespace-pre-wrap break-all ${
                                !isExpanded && isLongValue ? 'line-clamp-2' : ''
                              }`}>
                                {oldValueStr}
                              </pre>
                            </div>
                          )}

                          <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                            <div className="text-xs font-medium text-green-700 mb-1">新值</div>
                            <pre className={`text-sm text-green-800 font-mono whitespace-pre-wrap break-all ${
                              !isExpanded && isLongValue ? 'line-clamp-2' : ''
                            }`}>
                              {newValueStr}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
