import { useEffect, useRef, useState } from 'react'
import { getBackendBaseUrl } from '@/services/config'
import { systemApi } from '@/services/api'
import { SelectNative } from '@/components/ui/select-native'
import { Checkbox } from '@/components/ui/checkbox'
import { X, Package, Loader2, CheckCircle2, AlertCircle, FolderOpen, Ban, Square } from 'lucide-react'

interface PackageDialogProps {
  isOpen: boolean
  onClose: () => void
  currentName?: string
}

interface WfInfo { filename: string; name: string }

// 用时格式化 mm:ss
function fmtElapsed(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// 日志时间戳（后端 epoch 秒）→ HH:MM:SS
function fmtTime(t: number): string {
  try {
    const d = new Date((t || 0) * 1000)
    return d.toLocaleTimeString('zh-CN', { hour12: false })
  } catch {
    return ''
  }
}

/**
 * 工作流一键打包为独立 EXE / 分享包
 * 加载所选工作流的 JSON 直接打包（与文件夹路径无关、格式正确），后台构建并轮询进度。
 */
export function PackageDialog({ isOpen, onClose, currentName }: PackageDialogProps) {
  const [list, setList] = useState<WfInfo[]>([])
  const [filename, setFilename] = useState('')
  const [outName, setOutName] = useState('')
  const [mode, setMode] = useState<'portable' | 'shared'>('portable')
  const [headless, setHeadless] = useState(false)
  const [showConsole, setShowConsole] = useState(true)
  const [slim, setSlim] = useState(false)
  const [iconPath, setIconPath] = useState('')
  const [toolchain, setToolchain] = useState<{ installed: boolean; version?: string } | null>(null)
  const [installing, setInstalling] = useState(false)
  const [building, setBuilding] = useState(false)
  const [job, setJob] = useState<any>(null)
  const [cancelling, setCancelling] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [pickingIcon, setPickingIcon] = useState(false)
  const pollRef = useRef<any>(null)
  const startRef = useRef<number>(0)
  const logScrollRef = useRef<HTMLDivElement>(null)

  const base = () => getBackendBaseUrl()

  useEffect(() => {
    if (!isOpen) return
    // 列出已保存工作流
    fetch(`${base()}/api/local-workflows/list`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folder: '' }),
    }).then(r => r.json()).then(d => {
      const items: WfInfo[] = d.workflows || []
      setList(items)
      const cur = items.find(w => w.name === currentName)
      const f = cur?.filename || items[0]?.filename || ''
      setFilename(f)
      if (!outName) setOutName((cur?.name || items[0]?.name || currentName || 'WebRPA自动化'))
    }).catch(() => {})
    // 工具链状态
    fetch(`${base()}/api/workflow-package/toolchain`).then(r => r.json())
      .then(d => setToolchain({ installed: d.installed, version: d.version })).catch(() => {})
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [isOpen, currentName])

  // 日志区自动滚到底部（必须在任何提前 return 之前声明，避免条件 hook）
  useEffect(() => {
    if (logScrollRef.current) logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight
  }, [job?.logs?.length])

  if (!isOpen) return null

  const installToolchain = async () => {
    setInstalling(true)
    try {
      const r = await fetch(`${base()}/api/workflow-package/toolchain/install`, { method: 'POST' })
      const d = await r.json()
      setToolchain({ installed: !!d.installed, version: d.version })
    } catch { /* ignore */ } finally { setInstalling(false) }
  }

  const startBuild = async () => {
    if (!filename) return
    setBuilding(true); setJob(null); setCancelling(false); setElapsed(0)
    startRef.current = Date.now()
    try {
      // 取该工作流 JSON，按内容打包（格式与文件夹无关）
      const wf = await fetch(`${base()}/api/local-workflows/load/${encodeURIComponent(filename)}`).then(r => r.json())
      const content = wf.content || wf.workflow || wf
      const r = await fetch(`${base()}/api/workflow-package/build`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow: content, output_name: outName, mode, headless, show_console: showConsole, slim, icon_path: iconPath.trim() || null }),
      })
      const d = await r.json()
      if (!r.ok) { setJob({ status: 'failed', error: d.detail || '启动失败' }); setBuilding(false); return }
      const jobId = d.job_id
      pollRef.current = setInterval(async () => {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
        try {
          const jr = await fetch(`${base()}/api/workflow-package/jobs/${jobId}`).then(x => x.json())
          setJob(jr.job)
          if (jr.job?.status === 'success' || jr.job?.status === 'failed' || jr.job?.status === 'cancelled') {
            clearInterval(pollRef.current); setBuilding(false); setCancelling(false)
          }
        } catch { /* keep polling */ }
      }, 1000)
    } catch (e: any) {
      setJob({ status: 'failed', error: String(e?.message || e) }); setBuilding(false)
    }
  }

  // 停止正在进行的打包
  const cancelBuild = async () => {
    if (!job?.id) return
    setCancelling(true)
    try {
      await fetch(`${base()}/api/workflow-package/jobs/${job.id}/cancel`, { method: 'POST' })
    } catch { /* ignore */ }
  }

  // 可视化选择 .ico 图标文件
  const pickIcon = async () => {
    setPickingIcon(true)
    try {
      const res = await systemApi.selectFile('选择程序图标 (.ico)', undefined, [['图标文件', '*.ico']])
      if (res.data?.success && res.data.path) setIconPath(res.data.path)
    } catch { /* ignore */ } finally {
      setPickingIcon(false)
    }
  }

  const openFolder = () => {
    if (!job?.output_dir) return
    fetch(`${base()}/api/system/open-url`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: job.output_dir }),
    }).catch(() => {})
  }

  return (
    <div className="fixed inset-0 bg-[hsl(217_45%_15%_/_0.55)] backdrop-blur-[3px] flex items-center justify-center p-4"
      style={{ zIndex: 2147483646 }} onClick={onClose}>
      <div className="modern-dialog w-full max-w-xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[hsl(var(--border))]">
          <Package className="w-4 h-4 text-[hsl(var(--brand-600))]" />
          <span className="font-semibold flex-1 text-sm">打包为独立程序 (EXE)</span>
          <button className="p-1.5 rounded-md hover:bg-[hsl(var(--muted))]" onClick={onClose}><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3 text-sm">
          <div>
            <label className="text-xs text-[hsl(var(--muted-foreground))]">选择工作流</label>
            <SelectNative className="mt-1" value={filename} onChange={e => setFilename(e.target.value)}
              placeholder="（请先在编辑器保存工作流）">
              {list.length === 0 && <option value="">（请先在编辑器保存工作流）</option>}
              {list.map(w => <option key={w.filename} value={w.filename}>{w.name}</option>)}
            </SelectNative>
          </div>
          <div>
            <label className="text-xs text-[hsl(var(--muted-foreground))]">程序名称</label>
            <input className="w-full mt-1 px-2 py-1.5 rounded-md bg-[hsl(var(--background))] border border-[hsl(var(--border))]"
              value={outName} onChange={e => setOutName(e.target.value)} placeholder="例如 每日签到" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[hsl(var(--muted-foreground))]">打包方式</label>
              <SelectNative className="mt-1" value={mode} onChange={e => setMode(e.target.value as any)}>
                <option value="portable">自包含（拷给任何电脑都能跑，体积大）</option>
                <option value="shared">轻量（依赖本机已装 WebRPA，体积小）</option>
              </SelectNative>
            </div>
            <div className="flex flex-col justify-end gap-1.5 pt-4">
              <label className="flex items-center gap-2 cursor-pointer"><Checkbox checked={headless} onCheckedChange={(c) => setHeadless(c)} /> 后台运行（不显示浏览器）</label>
              <label className="flex items-center gap-2 cursor-pointer"><Checkbox checked={showConsole} onCheckedChange={(c) => setShowConsole(c)} /> 显示运行控制台</label>
              <label className="flex items-center gap-2 cursor-pointer"><Checkbox checked={slim} onCheckedChange={(c) => setSlim(c)} disabled={mode !== 'portable'} /> 按需裁剪（瘦身）</label>
            </div>
          </div>

          <div>
            <label className="text-xs text-[hsl(var(--muted-foreground))]">程序图标 (.ico 绝对路径，可选)</label>
            <div className="flex gap-2 mt-1">
              <input className="flex-1 px-2 py-1.5 rounded-md bg-[hsl(var(--background))] border border-[hsl(var(--border))]"
                value={iconPath} onChange={e => setIconPath(e.target.value)} placeholder="例如 C:\icons\app.ico（留空用默认图标）" />
              <button
                type="button"
                onClick={pickIcon}
                disabled={pickingIcon}
                title="浏览选择 .ico 图标文件"
                className="px-2.5 py-1.5 rounded-md border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] inline-flex items-center gap-1.5 text-sm disabled:opacity-60"
              >
                {pickingIcon ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderOpen className="w-4 h-4" />}
                浏览
              </button>
            </div>
          </div>

          <div className="text-xs px-3 py-2 rounded-md bg-[hsl(var(--muted))]">
            {toolchain == null ? '正在检查打包工具…'
              : toolchain.installed ? `打包工具就绪（PyInstaller ${toolchain.version || ''}），可生成 .exe`
                : '未安装 PyInstaller：将生成「启动.bat」（同样可运行）。如需 .exe，'}
            {toolchain && !toolchain.installed && (
              <button className="ml-1 underline text-[hsl(var(--brand-600))]" disabled={installing} onClick={installToolchain}>
                {installing ? '安装中…' : '一键安装打包工具'}
              </button>
            )}
          </div>

          {job && (
            <div className="px-3 py-2.5 rounded-md border border-[hsl(var(--border))] space-y-2">
              {job.status === 'success' ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[hsl(var(--success-600))]"><CheckCircle2 className="w-4 h-4" /> 打包完成（{job.size_mb} MB · 用时 {fmtElapsed(elapsed)}）</div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))] break-all">{job.output_dir}</div>
                  <button className="mt-1 inline-flex items-center gap-1 text-xs underline text-[hsl(var(--brand-600))] cursor-pointer" onClick={openFolder}><FolderOpen className="w-3.5 h-3.5" /> 打开输出目录</button>
                </div>
              ) : job.status === 'failed' ? (
                <div className="flex items-start gap-2 text-[hsl(var(--destructive))]"><AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> <span className="break-all">打包失败：{job.error}</span></div>
              ) : job.status === 'cancelled' ? (
                <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]"><Ban className="w-4 h-4" /> 打包已停止（已清理半成品，可重新打包）</div>
              ) : (
                <div className="space-y-2">
                  {/* 当前步骤 + 进度 + 用时 */}
                  <div className="flex items-center gap-2 text-[13px]">
                    <Loader2 className="w-4 h-4 animate-spin text-[hsl(var(--brand-600))] flex-shrink-0" />
                    <span className="flex-1 truncate">{job.step}</span>
                    <span className="text-[hsl(var(--muted-foreground))] tabular-nums">{job.progress}% · {fmtElapsed(elapsed)}</span>
                  </div>
                  {/* 进度条 */}
                  <div className="h-1.5 w-full rounded-full bg-[hsl(var(--slate-200))] overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--brand-500))] to-[hsl(var(--brand-600))] transition-[width] duration-300"
                      style={{ width: `${Math.max(2, job.progress || 0)}%` }} />
                  </div>
                </div>
              )}

              {/* 实时日志 */}
              {Array.isArray(job.logs) && job.logs.length > 0 && (
                <div ref={logScrollRef} className="max-h-32 overflow-y-auto rounded-[6px] bg-[hsl(var(--slate-900))] p-2 font-mono text-[11px] leading-relaxed text-[hsl(var(--slate-100))]">
                  {job.logs.map((l: any, i: number) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-[hsl(var(--slate-500))] flex-shrink-0">{fmtTime(l.t)}</span>
                      <span className="break-all">{l.msg}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button className="px-3 py-1.5 rounded-md border border-[hsl(var(--border))]" onClick={onClose}>关闭</button>
            {building ? (
              <button
                className="px-3 py-1.5 rounded-md bg-[hsl(var(--destructive))] text-white inline-flex items-center gap-1.5 disabled:opacity-60"
                disabled={cancelling || !job?.id}
                onClick={cancelBuild}
              >
                {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5" />}
                {cancelling ? '正在停止…' : '停止打包'}
              </button>
            ) : (
              <button className="px-3 py-1.5 rounded-md bg-[hsl(var(--brand-600))] text-white disabled:opacity-50"
                disabled={!filename} onClick={startBuild}>
                开始打包
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
