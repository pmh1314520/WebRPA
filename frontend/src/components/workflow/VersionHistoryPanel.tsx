import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, GitCommit, RotateCcw, Trash2, GitCompare, Loader2, Save, Download, Upload } from 'lucide-react'
import { workflowVersionsApi, type WorkflowVersionInfo, type WorkflowDiff } from '@/services/api'
import { useWorkflowStore } from '@/store/workflowStore'
import { useGlobalConfigStore } from '@/store/globalConfigStore'
import { useConfirm } from '@/components/ui/confirm-dialog'

interface Props {
  open: boolean
  onClose: () => void
}

export function VersionHistoryPanel({ open, onClose }: Props) {
  const name = useWorkflowStore((s) => s.name)
  const exportWorkflow = useWorkflowStore((s) => s.exportWorkflow)
  const importWorkflow = useWorkflowStore((s) => s.importWorkflow)
  const addLog = useWorkflowStore((s) => s.addLog)
  const { config } = useGlobalConfigStore()
  const { confirm, ConfirmDialog } = useConfirm()

  const folder = config.workflow?.localFolder || undefined

  const [versions, setVersions] = useState<WorkflowVersionInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [committing, setCommitting] = useState(false)
  const [diff, setDiff] = useState<{ versionId: string; data: WorkflowDiff } | null>(null)

  const refresh = useCallback(async () => {
    if (!name) return
    setLoading(true)
    try {
      const res = await workflowVersionsApi.list(name, folder)
      setVersions(res.data?.versions || [])
    } finally {
      setLoading(false)
    }
  }, [name, folder])

  useEffect(() => {
    if (open) {
      refresh()
      setDiff(null)
      setMessage('')
    }
  }, [open, refresh])

  const handleCommit = useCallback(async () => {
    if (!name) {
      addLog({ level: 'error', message: '请先给工作流命名再提交版本' })
      return
    }
    setCommitting(true)
    try {
      const content = JSON.parse(exportWorkflow())
      const res = await workflowVersionsApi.commit(name, content, message, folder)
      if (res.data?.success) {
        addLog({ level: 'success', message: `已提交版本 ${res.data.version}` })
        setMessage('')
        await refresh()
      } else {
        addLog({ level: 'error', message: `提交失败: ${res.data?.error || res.error}` })
      }
    } catch (e) {
      addLog({ level: 'error', message: `提交失败: ${e}` })
    } finally {
      setCommitting(false)
    }
  }, [name, message, folder, exportWorkflow, addLog, refresh])

  const handleRestore = useCallback(async (v: WorkflowVersionInfo) => {
    const ok = await confirm(`恢复到版本「${v.message || v.createdAt}」？当前未提交的修改将被覆盖。`, {
      type: 'warning', title: '恢复版本', confirmText: '恢复', cancelText: '取消',
    })
    if (!ok) return
    const res = await workflowVersionsApi.get(name, v.version, folder)
    if (res.data?.success && res.data.content) {
      const success = importWorkflow(res.data.content)
      if (success) {
        addLog({ level: 'success', message: `已恢复到版本 ${v.version}` })
        onClose()
      } else {
        addLog({ level: 'error', message: '恢复失败：工作流内容无法解析' })
      }
    } else {
      addLog({ level: 'error', message: `恢复失败: ${res.data?.error || res.error}` })
    }
  }, [name, folder, confirm, importWorkflow, addLog, onClose])

  const handleDelete = useCallback(async (v: WorkflowVersionInfo) => {
    const ok = await confirm(`删除版本「${v.message || v.createdAt}」？此操作不可恢复。`, {
      type: 'warning', title: '删除版本', confirmText: '删除', cancelText: '取消',
    })
    if (!ok) return
    const res = await workflowVersionsApi.remove(name, v.version, folder)
    if (res.data?.success) {
      addLog({ level: 'info', message: `已删除版本 ${v.version}` })
      if (diff?.versionId === v.version) setDiff(null)
      await refresh()
    } else {
      addLog({ level: 'error', message: `删除失败: ${res.data?.error || res.error}` })
    }
  }, [name, folder, confirm, addLog, refresh, diff])

  const handleDiff = useCallback(async (v: WorkflowVersionInfo) => {
    if (diff?.versionId === v.version) { setDiff(null); return }
    try {
      const content = JSON.parse(exportWorkflow())
      const res = await workflowVersionsApi.diff(name, { fromVersionId: v.version, content, folder })
      if (res.data?.success && res.data.diff) {
        setDiff({ versionId: v.version, data: res.data.diff })
      } else {
        addLog({ level: 'error', message: `对比失败: ${res.data?.error || res.error}` })
      }
    } catch (e) {
      addLog({ level: 'error', message: `对比失败: ${e}` })
    }
  }, [name, folder, exportWorkflow, addLog, diff])

  const handleExport = useCallback(async () => {
    if (!name) return
    const res = await workflowVersionsApi.exportBundle(name, folder)
    if (res.data?.success && res.data.bundle) {
      const blob = new Blob([JSON.stringify(res.data.bundle, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${name}_版本包.json`
      a.click()
      URL.revokeObjectURL(url)
      addLog({ level: 'success', message: `已导出 ${res.data.bundle.versionCount} 个版本为分享包` })
    } else {
      addLog({ level: 'error', message: `导出失败: ${res.data?.error || res.error}` })
    }
  }, [name, folder, addLog])

  const handleImport = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const bundle = JSON.parse(await file.text())
        const res = await workflowVersionsApi.importBundle(name, bundle, folder)
        if (res.data?.success) {
          addLog({ level: 'success', message: `已导入 ${res.data.imported} 个版本` })
          await refresh()
        } else {
          addLog({ level: 'error', message: `导入失败: ${res.data?.error || res.error}` })
        }
      } catch (e) {
        addLog({ level: 'error', message: `分享包解析失败: ${e}` })
      }
    }
    input.click()
  }, [name, folder, addLog, refresh])

  if (!open) return null

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9998] bg-black/30" onClick={onClose} />
      <div className="fixed right-0 top-0 z-[9999] h-full w-[420px] bg-[hsl(var(--background))] border-l border-[hsl(var(--border))] shadow-2xl flex flex-col">
        {/* 头部 */}
        <div className="px-4 py-3 border-b border-[hsl(var(--border))] bg-gradient-to-r from-violet-50 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 text-violet-600 flex-none">
                <GitCommit className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[hsl(var(--foreground))] leading-tight">版本历史</div>
                <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">本地快照 · 可恢复 / 对比</div>
              </div>
            </div>
            <button onClick={onClose} className="p-1 rounded hover:bg-[hsl(var(--accent))] flex-none">
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* 当前工作流名：作为独立、专业的信息条 */}
          <div className="mt-2.5 flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
            <span className="text-[10px] font-medium text-muted-foreground flex-none">当前工作流</span>
            <span className="text-xs font-semibold text-violet-700 truncate" title={name || '未命名工作流'}>
              {name || '未命名工作流'}
            </span>
            <span className="ml-auto text-[10px] text-muted-foreground flex-none">{versions.length} 个版本</span>
          </div>
        </div>

        {/* 提交区 */}
        <div className="px-4 py-3 border-b border-[hsl(var(--border))] space-y-2">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="版本说明（可选），如：修复登录流程"
            className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background"
            onKeyDown={(e) => { if (e.key === 'Enter' && !committing) handleCommit() }}
          />
          <button
            onClick={handleCommit}
            disabled={committing}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {committing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            提交当前版本
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]"
              title="把全部版本导出为分享包，供团队共享"
            >
              <Download className="w-3.5 h-3.5" />导出分享包
            </button>
            <button
              onClick={handleImport}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]"
              title="从分享包导入版本到当前工作流"
            >
              <Upload className="w-3.5 h-3.5" />导入分享包
            </button>
          </div>
        </div>

        {/* 版本列表 - VSCode 式分支图 */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : (
            <div className="relative pl-7">
              {/* 贯穿的分支竖线 */}
              <div className="absolute left-[13px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-violet-400 via-violet-300 to-[hsl(var(--border))]" />

              {/* HEAD：当前工作区（未提交） */}
              <div className="relative mb-3">
                <span className="absolute left-[-22px] top-1 w-3.5 h-3.5 rounded-full border-2 border-violet-500 bg-[hsl(var(--background))] ring-4 ring-violet-500/10" />
                <div className="rounded-lg border border-dashed border-violet-300 bg-violet-50/40 px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-violet-700">工作区（当前画布）</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">HEAD</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">未提交的修改，提交后会成为新的版本节点</div>
                </div>
              </div>

              {versions.length === 0 ? (
                <div className="relative">
                  <span className="absolute left-[-21px] top-2 w-3 h-3 rounded-full bg-[hsl(var(--border))]" />
                  <div className="text-sm text-muted-foreground py-2">暂无历史版本，点击上方「提交当前版本」创建第一个快照</div>
                </div>
              ) : (
                versions.map((v, idx) => {
                  const active = diff?.versionId === v.version
                  const isLatest = idx === 0
                  return (
                    <div key={v.version} className="relative mb-2.5">
                      {/* 提交节点圆点 */}
                      <span
                        className={`absolute left-[-22px] top-2 w-3.5 h-3.5 rounded-full border-2 ${
                          active ? 'border-amber-500 bg-amber-400' : isLatest ? 'border-violet-500 bg-violet-500' : 'border-violet-400 bg-[hsl(var(--background))]'
                        }`}
                      />
                      <div className={`rounded-lg border p-3 space-y-2 transition-colors ${active ? 'border-amber-300 bg-amber-50/40' : 'border-[hsl(var(--border))] hover:border-violet-300'}`}>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium truncate">{v.message || '（无说明）'}</span>
                            {isLatest && <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 flex-none">最新</span>}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                            <span className="font-mono">{(v.version || '').slice(0, 8)}</span>
                            <span>·</span>
                            <span>{v.createdAt}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {v.summary?.nodeCount ?? 0} 个节点 · {v.summary?.edgeCount ?? 0} 条连线 · {v.summary?.variableCount ?? 0} 个变量
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleRestore(v)} title="恢复到此版本"
                            className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]">
                            <RotateCcw className="w-3.5 h-3.5" />恢复
                          </button>
                          <button onClick={() => handleDiff(v)} title="与当前画布对比"
                            className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]">
                            <GitCompare className="w-3.5 h-3.5" />{active ? '收起' : '对比'}
                          </button>
                          <button onClick={() => handleDelete(v)} title="删除此版本"
                            className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-[hsl(var(--border))] text-red-600 hover:bg-red-50 ml-auto">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {active && <DiffView diff={diff.data} />}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog />
    </>,
    document.body
  )
}


function DiffView({ diff }: { diff: WorkflowDiff }) {
  if (!diff.hasChanges) {
    return <div className="text-xs text-muted-foreground bg-[hsl(var(--muted))] rounded p-2">该版本与当前画布没有差异</div>
  }
  return (
    <div className="text-xs bg-[hsl(var(--muted))] rounded p-2 space-y-1">
      <div className="text-muted-foreground">对比方向：此版本 → 当前画布</div>
      {diff.nodesAdded.length > 0 && (
        <div>
          <span className="text-emerald-600 font-medium">新增 {diff.nodesAdded.length} 个节点：</span>
          <span className="text-muted-foreground">{diff.nodesAdded.map((n) => n.label).join('、')}</span>
        </div>
      )}
      {diff.nodesRemoved.length > 0 && (
        <div>
          <span className="text-red-600 font-medium">删除 {diff.nodesRemoved.length} 个节点：</span>
          <span className="text-muted-foreground">{diff.nodesRemoved.map((n) => n.label).join('、')}</span>
        </div>
      )}
      {diff.nodesModified.length > 0 && (
        <div>
          <span className="text-amber-600 font-medium">修改 {diff.nodesModified.length} 个节点：</span>
          <span className="text-muted-foreground">{diff.nodesModified.map((n) => n.label).join('、')}</span>
        </div>
      )}
      {(diff.edgesAdded > 0 || diff.edgesRemoved > 0) && (
        <div className="text-muted-foreground">
          连线：+{diff.edgesAdded} / -{diff.edgesRemoved}
        </div>
      )}
    </div>
  )
}
