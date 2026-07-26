import { useEffect } from 'react'
import { useScheduledTaskStore } from '@/store/scheduledTaskStore'
import { CheckCircle2, XCircle, Clock, Zap, Power, TrendingUp, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DialogPortal } from '@/components/ui/dialog-portal'

interface StatisticsPanelProps {
  open: boolean
  onClose: () => void
}

export function StatisticsPanel({ open, onClose }: StatisticsPanelProps) {
  const { statistics, tasks, fetchStatistics } = useScheduledTaskStore()
  
  useEffect(() => {
    if (open) {
      fetchStatistics()
    }
  }, [open])
  
  if (!open || !statistics) {
    return null
  }
  
  const getTriggerIcon = (type: string) => {
    switch (type) {
      case 'time': return <Clock className="w-5 h-5" />
      case 'hotkey': return <Zap className="w-5 h-5" />
      case 'startup': return <Power className="w-5 h-5" />
      default: return null
    }
  }
  
  const getTriggerLabel = (type: string) => {
    switch (type) {
      case 'time': return '时间触发'
      case 'hotkey': return '热键触发'
      case 'startup': return '启动触发'
      default: return type
    }
  }
  
  // 获取最活跃的任务（按执行次数排序）
  const mostActiveTasks = [...tasks]
    .sort((a, b) => b.total_executions - a.total_executions)
    .slice(0, 5)
  
  // 获取最近失败的任务
  const recentFailedTasks = [...tasks]
    .filter(t => t.last_execution_status === 'failed')
    .sort((a, b) => {
      if (!a.last_execution_time) return 1
      if (!b.last_execution_time) return -1
      return new Date(b.last_execution_time).getTime() - new Date(a.last_execution_time).getTime()
    })
    .slice(0, 5)
  
  return (
    // 必须走 DialogPortal 渲染到 document.body：本面板由计划任务对话框内部唤起，
    // 而该对话框带 transform 动画（animate-scale-in-bounce）。有 transform 的祖先会成为
    // fixed 定位的包含块，不加 Portal 时 inset-0 相对的是对话框而非视口，
    // 再被对话框的 overflow-hidden 裁掉一半。
    // 层级也必须高于计划任务对话框（2147483646），否则会被其头部按钮压住。
    <DialogPortal>
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 animate-fade-in" style={{ zIndex: 2147483647 }} onClick={onClose}>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-in" onClick={(e) => e.stopPropagation()}>
          {/* 头部 */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">统计信息</h2>
            <Button variant="tonal-danger" size="icon" onClick={onClose} title="关闭">

              <X className="w-4 h-4" />

            </Button>
          </div>
        
          {/* 内容 */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* 总览卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-blue-600">总任务数</span>
                  <Clock className="w-5 h-5 text-blue-500" />
                </div>
                <div className="text-2xl font-bold text-blue-900">
                  {statistics.total_tasks}
                </div>
              </div>
            
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-green-600">已启用</span>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <div className="text-2xl font-bold text-green-900">
                  {statistics.enabled_tasks}
                </div>
              </div>
            
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">已禁用</span>
                  <XCircle className="w-5 h-5 text-gray-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {statistics.disabled_tasks}
                </div>
              </div>
            
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-purple-600">总执行次数</span>
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                </div>
                <div className="text-2xl font-bold text-purple-900">
                  {statistics.total_executions}
                </div>
              </div>
            </div>
          
            {/* 执行统计 */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">执行统计</h3>
            
              <div className="grid grid-cols-3 gap-6 mb-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {statistics.total_executions}
                  </div>
                  <div className="text-sm text-gray-600">总执行次数</div>
                </div>
              
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-1">
                    {statistics.success_executions}
                  </div>
                  <div className="text-sm text-gray-600">成功次数</div>
                </div>
              
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600 mb-1">
                    {statistics.failed_executions}
                  </div>
                  <div className="text-sm text-gray-600">失败次数</div>
                </div>
              </div>
            
              {/* 成功率进度条 */}
              <div>
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>成功率</span>
                  <span className="font-semibold text-gray-900">
                    {statistics.success_rate}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-green-500 h-3 rounded-full transition-all"
                    style={{ width: `${statistics.success_rate}%` }}
                  />
                </div>
              </div>
            </div>
          
            {/* 触发器类型分布 */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">触发器类型分布</h3>
            
              <div className="space-y-3">
                {Object.entries(statistics.trigger_types).map(([type, count]) => (
                  <div key={type} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 w-32">
                      {getTriggerIcon(type)}
                      <span className="text-sm text-gray-700">
                        {getTriggerLabel(type)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{
                              width: `${(count / statistics.total_tasks) * 100}%`
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-12 text-right">
                          {count}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          
            {/* 最活跃的任务 */}
            {mostActiveTasks.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  最活跃的任务 (Top 5)
                </h3>
              
                <div className="space-y-3">
                  {mostActiveTasks.map((task, index) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {task.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          成功率: {task.total_executions > 0
                            ? Math.round((task.success_executions / task.total_executions) * 100)
                            : 0}%
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">
                          {task.total_executions}
                        </div>
                        <div className="text-xs text-gray-500">次执行</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          
            {/* 最近失败的任务 */}
            {recentFailedTasks.length > 0 && (
              <div className="bg-white border border-red-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  最近失败的任务
                </h3>
              
                <div className="space-y-3">
                  {recentFailedTasks.map(task => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-3 bg-red-50 rounded-lg"
                    >
                      <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate mb-1">
                          {task.name}
                        </div>
                        {task.last_execution_error && (
                          <div className="text-xs text-red-600 line-clamp-2">
                            {task.last_execution_error}
                          </div>
                        )}
                        {task.last_execution_time && (
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(task.last_execution_time).toLocaleString('zh-CN')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>
          </div>
      </div>
    </DialogPortal>
  )
}
