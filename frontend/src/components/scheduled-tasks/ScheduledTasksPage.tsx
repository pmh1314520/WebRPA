import { useEffect, useState } from 'react'
import { useScheduledTaskStore, type ScheduledTask } from '@/store/scheduledTaskStore'
import { Button } from '@/components/ui/button'
import { Plus, Play, Trash2, Edit, Clock, Zap, Power, BarChart3, FileText, X, Square, Webhook } from 'lucide-react'
import { TaskCreateDialog } from './TaskCreateDialog'
import { TaskEditDialog } from './TaskEditDialog'
import { TaskLogsDialog } from './TaskLogsDialog'
import { StatisticsPanel } from './StatisticsPanel'
import { useConfirm } from '@/components/ui/confirm-dialog'

interface ScheduledTasksPageProps {
  onClose?: () => void
}

export function ScheduledTasksPage({ onClose }: ScheduledTasksPageProps = {}) {
  const {
    tasks,
    loading,
    fetchTasks,
    deleteTask,
    toggleTask,
    executeTask,
    stopTask,
    fetchStatistics
  } = useScheduledTaskStore()
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null)
  const [logsTask, setLogsTask] = useState<ScheduledTask | null>(null)
  const [showStatistics, setShowStatistics] = useState(false)
  
  const { confirm, ConfirmDialog } = useConfirm()
  
  useEffect(() => {
    fetchTasks()
    fetchStatistics()
    
    // 每30秒刷新一次
    const interval = setInterval(() => {
      fetchTasks()
      fetchStatistics()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])
  
  const handleDelete = async (task: ScheduledTask) => {
    const confirmed = await confirm(
      `确定要删除任务"${task.name}"吗？此操作无法撤销。`,
      {
        title: '删除计划任务',
        confirmText: '删除',
        cancelText: '取消',
        type: 'warning'
      }
    )
    
    if (confirmed) {
      await deleteTask(task.id)
    }
  }
  
  const handleToggle = async (task: ScheduledTask) => {
    await toggleTask(task.id, !task.enabled)
  }
  
  const handleExecute = async (task: ScheduledTask) => {
    await executeTask(task.id)
  }
  
  const handleStop = async (task: ScheduledTask) => {
    const confirmed = await confirm(
      `确定要停止任务"${task.name}"的执行吗？`,
      {
        title: '停止任务',
        confirmText: '停止',
        cancelText: '取消',
        type: 'warning'
      }
    )
    
    if (confirmed) {
      await stopTask(task.id)
    }
  }
  
  const getTriggerTypeLabel = (type: string) => {
    switch (type) {
      case 'time': return '时间触发'
      case 'hotkey': return '热键触发'
      case 'startup': return '启动触发'
      case 'webhook': return 'Webhook触发'
      default: return type
    }
  }
  
  const getTriggerDescription = (task: ScheduledTask) => {
    const trigger = task.trigger
    
    if (trigger.type === 'time') {
      switch (trigger.schedule_type) {
        case 'once':
          return `一次性 - ${trigger.start_date} ${trigger.start_time}`
        case 'daily':
          return `每天 ${trigger.daily_time}`
        case 'weekly':
          const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
          const dayLabels = trigger.weekly_days?.map(d => days[d]).join(', ')
          return `每周 ${dayLabels} ${trigger.weekly_time}`
        case 'monthly':
          return `每月 ${trigger.monthly_day}日 ${trigger.monthly_time}`
        case 'interval':
          return `每隔 ${trigger.interval_seconds} 秒`
        default:
          return '时间触发'
      }
    } else if (trigger.type === 'hotkey') {
      return `热键: ${trigger.hotkey}`
    } else if (trigger.type === 'startup') {
      return `启动后 ${trigger.startup_delay || 0}秒`
    } else if (trigger.type === 'webhook') {
      return `路径: ${trigger.webhook_path || '-'}`
    }
    
    return '-'
  }
  
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }
  
  const getSuccessRate = (task: ScheduledTask) => {
    if (task.total_executions === 0) return 0
    return Math.round((task.success_executions / task.total_executions) * 100)
  }
  
  return (
    // flex-1 + min-h-0：作为弹窗（max-h 容器）的子项时撑满可用高度并允许内部滚动区收缩；
    // 原来的 h-full 在 max-h 父容器下解析不出确定高度，会导致下面的 flex-1 overflow-auto 失效、列表无法滚动。
    <div className="h-full flex-1 min-h-0 flex flex-col bg-[hsl(var(--background))]">
      {/* 头部 */}
      <div className="modern-dialog-header">
        <div className="modern-dialog-header-icon modern-dialog-header-icon-warning">
          <Clock className="w-5 h-5" strokeWidth={2.2} />
        </div>
        <div className="flex-1">
          <h1 className="modern-dialog-title">计划任务</h1>
          <div className="modern-dialog-subtitle flex items-center gap-2">
            <span>定时 / 热键 / 启动 / Webhook 触发</span>
            <span className="badge badge-brand">
              共 {tasks.length} 个
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="tonal-info"
            size="sm"
            onClick={() => setShowStatistics(true)}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            统计信息
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            创建任务
          </Button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-[7px] text-[hsl(var(--slate-500))] hover:bg-[hsl(var(--danger-50))] hover:text-[hsl(var(--danger-600))] hover:border-[hsl(var(--danger-500)/0.3)] border border-transparent transition-all duration-150 active:scale-90"
              title="关闭"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 任务列表（min-h-0 保证在 flex 容器内能真正滚动，而不是被内容撑高） */}
      <div className="flex-1 min-h-0 overflow-y-auto p-5">
        {loading && tasks.length === 0 ? (
          <div className="flex items-center justify-center h-64 flex-col gap-3">
            <div className="spinner spinner-lg" />
            <div className="text-[12px] text-[hsl(var(--muted-foreground))]">加载任务列表中…</div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="empty-state h-full">
            <div className="empty-state-icon !w-20 !h-20" style={{ background: 'linear-gradient(135deg, hsl(var(--warning-50)), hsl(var(--warning-100)))', color: 'hsl(var(--warning-500))', borderColor: 'hsl(var(--warning-500) / 0.2)' }}>
              <Clock className="w-9 h-9" strokeWidth={1.6} />
            </div>
            <div className="empty-state-title !text-[15px]">还没有计划任务</div>
            <div className="empty-state-desc">
              点击右上角「创建任务」按钮，添加你的第一个定时 / 热键 / 启动 / Webhook 触发任务
            </div>
            <Button
              variant="warning"
              size="lg"
              onClick={() => setCreateDialogOpen(true)}
              className="mt-5"
            >
              <Plus className="w-4 h-4" />
              立即创建
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {tasks.map((task, idx) => (
              <div
                key={task.id}
                className={`relative bg-[hsl(var(--card))] rounded-[12px] border-[1.5px] p-4 transition-all duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] animate-fade-in-up overflow-hidden ${
                  task.enabled
                    ? 'border-[hsl(var(--border))] hover:border-[hsl(var(--brand-500)/0.4)] hover:shadow-pop hover:-translate-y-0.5'
                    : 'border-[hsl(var(--border))] hover:border-[hsl(var(--slate-300))] opacity-60'
                }`}
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                {/* 卡片左侧色条 */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                  task.is_running ? 'bg-[hsl(var(--brand-500))]'
                  : task.enabled ? (
                    task.trigger.type === 'time' ? 'bg-[hsl(var(--brand-500))]'
                    : task.trigger.type === 'hotkey' ? 'bg-[hsl(var(--amber-500))]'
                    : task.trigger.type === 'startup' ? 'bg-[hsl(var(--success-500))]'
                    : 'bg-[hsl(var(--violet-500))]'
                  )
                  : 'bg-[hsl(var(--slate-300))]'
                }`} />

                {/* 任务头部 */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-[14px] font-bold text-[hsl(var(--slate-900))] truncate">
                        {task.name}
                      </h3>
                      {task.is_running && (
                        <span className="badge badge-brand">
                          <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--brand-500))] animate-pulse" />
                          执行中
                        </span>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-[12px] text-[hsl(var(--muted-foreground))] line-clamp-2 leading-relaxed">
                        {task.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleToggle(task)}
                    className={`shrink-0 p-1.5 rounded-[6px] transition-all duration-200 active:scale-90 ${
                      task.enabled
                        ? 'text-[hsl(var(--success-600))] hover:bg-[hsl(var(--success-50))] hover:shadow-success-glow'
                        : 'text-[hsl(var(--slate-400))] hover:bg-[hsl(var(--slate-100))]'
                    }`}
                    title={task.enabled ? '点击禁用' : '点击启用'}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                </div>

                {/* 工作流信息 */}
                <div className="mb-3 p-2.5 bg-[hsl(var(--slate-50))] rounded-[8px] border border-[hsl(var(--border))] text-[12px]">
                  <div className="flex items-center gap-1.5 text-[hsl(var(--muted-foreground))]">
                    <span className="text-[10px] uppercase tracking-wider font-semibold">工作流</span>
                    <span className="text-[hsl(var(--brand-700))] font-medium truncate">
                      {task.workflow_name || task.workflow_id}
                    </span>
                  </div>
                </div>

                {/* 触发器信息 */}
                <div className="mb-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-[12px]">
                    {task.trigger.type === 'time' && <span className="icon-chip icon-chip-brand !w-6 !h-6"><Clock className="w-3 h-3" /></span>}
                    {task.trigger.type === 'hotkey' && <span className="icon-chip icon-chip-amber !w-6 !h-6"><Zap className="w-3 h-3" /></span>}
                    {task.trigger.type === 'startup' && <span className="icon-chip icon-chip-success !w-6 !h-6"><Power className="w-3 h-3" /></span>}
                    {task.trigger.type === 'webhook' && <span className="icon-chip icon-chip-violet !w-6 !h-6"><Webhook className="w-3 h-3" /></span>}
                    <span className="text-[hsl(var(--slate-700))] font-semibold">{getTriggerTypeLabel(task.trigger.type)}</span>
                  </div>
                  <div className="text-[12px] text-[hsl(var(--slate-700))] pl-8">
                    {getTriggerDescription(task)}
                  </div>
                  {task.trigger.type === 'webhook' && task.trigger.webhook_path && (
                    <div className="pl-8 mt-1">
                      <div className="p-2 bg-[hsl(var(--violet-50))] rounded-[6px] border border-[hsl(var(--violet-500)/0.2)] font-mono text-[10.5px] text-[hsl(var(--violet-700))] break-all">
                        POST: /api/scheduled-tasks/webhook{task.trigger.webhook_path}
                      </div>
                    </div>
                  )}
                  {task.next_execution_time && (
                    <div className="text-[10.5px] text-[hsl(var(--muted-foreground))] pl-8 flex items-center gap-1">
                      <span className="text-[hsl(var(--slate-500))]">下次：</span>
                      <span className="font-mono">{formatDateTime(task.next_execution_time)}</span>
                    </div>
                  )}
                </div>

                {/* 执行统计 */}
                <div className="mb-3 grid grid-cols-3 gap-1.5 text-center">
                  <div className="p-2 bg-[hsl(var(--slate-100))] rounded-[8px] border border-[hsl(var(--border))]">
                    <div className="text-[hsl(var(--muted-foreground))] text-[10px] font-semibold uppercase tracking-wider">总计</div>
                    <div className="text-[14px] font-bold text-[hsl(var(--slate-800))] tabular-nums">{task.total_executions}</div>
                  </div>
                  <div className="p-2 bg-[hsl(var(--success-50))] rounded-[8px] border border-[hsl(var(--success-500)/0.2)]">
                    <div className="text-[hsl(var(--success-700))] text-[10px] font-semibold uppercase tracking-wider">成功</div>
                    <div className="text-[14px] font-bold text-[hsl(var(--success-700))] tabular-nums">{task.success_executions}</div>
                  </div>
                  <div className="p-2 bg-[hsl(var(--danger-50))] rounded-[8px] border border-[hsl(var(--danger-500)/0.2)]">
                    <div className="text-[hsl(var(--danger-700))] text-[10px] font-semibold uppercase tracking-wider">失败</div>
                    <div className="text-[14px] font-bold text-[hsl(var(--danger-700))] tabular-nums">{task.failed_executions}</div>
                  </div>
                </div>

                {/* 成功率 */}
                {task.total_executions > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-[10.5px] text-[hsl(var(--muted-foreground))] mb-1">
                      <span className="font-semibold uppercase tracking-wider">成功率</span>
                      <span className="font-bold text-[hsl(var(--success-700))] tabular-nums">{getSuccessRate(task)}%</span>
                    </div>
                    <div className="w-full bg-[hsl(var(--slate-200))] rounded-full h-1.5 overflow-hidden shadow-[inset_0_1px_2px_rgb(15_23_42_/_0.06)]">
                      <div
                        className="h-full rounded-full transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]"
                        style={{
                          width: `${getSuccessRate(task)}%`,
                          background: 'linear-gradient(90deg, hsl(var(--success-500)), hsl(var(--success-600)))'
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* 最后执行 */}
                {task.last_execution_time && (
                  <div className="mb-3 p-2 bg-[hsl(var(--slate-50))] rounded-[6px] text-[10.5px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[hsl(var(--muted-foreground))]">最后执行</span>
                      <span className={`badge ${task.last_execution_status === 'success' ? 'badge-success' : 'badge-danger'}`}>
                        {task.last_execution_status === 'success' ? '成功' : '失败'}
                      </span>
                    </div>
                    <div className="text-[hsl(var(--muted-foreground))] mt-0.5 font-mono">
                      {formatDateTime(task.last_execution_time)}
                    </div>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex gap-1.5 pt-3 border-t border-[hsl(var(--border))]">
                  {task.is_running ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleStop(task)}
                      className="flex-1"
                    >
                      <Square className="w-3 h-3" />
                      停止
                    </Button>
                  ) : (
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => handleExecute(task)}
                      disabled={!task.enabled}
                      className="flex-1"
                    >
                      <Play className="w-3 h-3" />
                      执行
                    </Button>
                  )}
                  <Button
                    variant="tonal"
                    size="sm"
                    onClick={() => setLogsTask(task)}
                    className="flex-1"
                  >
                    <FileText className="w-3 h-3" />
                    日志
                  </Button>
                  <Button
                    variant="tonal-warning"
                    size="sm"
                    onClick={() => setEditingTask(task)}
                    className="gap-1"
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="tonal-danger"
                    size="sm"
                    onClick={() => handleDelete(task)}
                    className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* 对话框 */}
      <TaskCreateDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
      />
      
      {editingTask && (
        <TaskEditDialog
          task={editingTask}
          open={true}
          onClose={() => setEditingTask(null)}
        />
      )}
      
      {logsTask && (
        <TaskLogsDialog
          task={logsTask}
          open={true}
          onClose={() => setLogsTask(null)}
        />
      )}
      
      {showStatistics && (
        <StatisticsPanel
          open={true}
          onClose={() => setShowStatistics(false)}
        />
      )}
      
      {/* 确认对话框 */}
      <ConfirmDialog />
    </div>
  )
}
