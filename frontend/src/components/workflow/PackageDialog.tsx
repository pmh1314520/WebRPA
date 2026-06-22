import { useEffect, useRef, useState } from 'react'
import { getBackendBaseUrl } from '@/services/config'
import { X, Package, Loader2, CheckCircle2, AlertCircle, FolderOpen } from 'lucide-react'

interface PackageDialogProps {
  isOpen: boolean
  onClose: () => void
  currentName?: string
}

interface WfInfo { filename: string; name: string }

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
  const pollRef = useRef<any>(null)

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
    setBuilding(true); setJob(null)
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
        try {
          const jr = await fetch(`${base()}/api/workflow-package/jobs/${jobId}`).then(x => x.json())
          setJob(jr.job)
          if (jr.job?.status === 'success' || jr.job?.status === 'failed') {
            clearInterval(pollRef.current); setBuilding(false)
          }
        } catch { /* keep polling */ }
      }, 1000)
    } catch (e: any) {
      setJob({ status: 'failed', error: String(e?.message || e) }); setBuilding(false)
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
            <select className="w-full mt-1 px-2 py-1.5 rounded-md bg-[hsl(var(--background))] border border-[hsl(var(--border))]"
              value={filename} onChange={e => setFilename(e.target.value)}>
              {list.length === 0 && <option value="">（请先在编辑器保存工作流）</option>}
              {list.map(w => <option key={w.filename} value={w.filename}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-[hsl(var(--muted-foreground))]">程序名称</label>
            <input className="w-full mt-1 px-2 py-1.5 rounded-md bg-[hsl(var(--background))] border border-[hsl(var(--border))]"
              value={outName} onChange={e => setOutName(e.target.value)} placeholder="例如 每日签到" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[hsl(var(--muted-foreground))]">打包方式</label>
              <select className="w-full mt-1 px-2 py-1.5 rounded-md bg-[hsl(var(--background))] border border-[hsl(var(--border))]"
                value={mode} onChange={e => setMode(e.target.value as any)}>
                <option value="portable">自包含（拷给任何电脑都能跑，体积大）</option>
                <option value="shared">轻量（依赖本机已装 WebRPA，体积小）</option>
              </select>
            </div>
            <div className="flex flex-col justify-end gap-1.5 pt-4">
              <label className="flex items-center gap-2"><input type="checkbox" checked={headless} onChange={e => setHeadless(e.target.checked)} /> 后台运行（不显示浏览器）</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={showConsole} onChange={e => setShowConsole(e.target.checked)} /> 显示运行控制台</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={slim} onChange={e => setSlim(e.target.checked)} disabled={mode !== 'portable'} /> 按需裁剪（瘦身）</label>
            </div>
          </div>

          <div>
            <label className="text-xs text-[hsl(var(--muted-foreground))]">程序图标 (.ico 绝对路径，可选)</label>
            <input className="w-full mt-1 px-2 py-1.5 rounded-md bg-[hsl(var(--background))] border border-[hsl(var(--border))]"
              value={iconPath} onChange={e => setIconPath(e.target.value)} placeholder="例如 C:\icons\app.ico（留空用默认图标）" />
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
            <div className="px-3 py-2 rounded-md border border-[hsl(var(--border))]">
              {job.status === 'success' ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[hsl(var(--success-600))]"><CheckCircle2 className="w-4 h-4" /> 打包完成（{job.size_mb} MB）</div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))] break-all">{job.output_dir}</div>
                  <button className="mt-1 inline-flex items-center gap-1 text-xs underline text-[hsl(var(--brand-600))]" onClick={openFolder}><FolderOpen className="w-3.5 h-3.5" /> 打开输出目录</button>
                </div>
              ) : job.status === 'failed' ? (
                <div className="flex items-center gap-2 text-[hsl(var(--bad,var(--destructive)))]"><AlertCircle className="w-4 h-4" /> 打包失败：{job.error}</div>
              ) : (
                <div className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> {job.step}（{job.progress}%）</div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button className="px-3 py-1.5 rounded-md border border-[hsl(var(--border))]" onClick={onClose}>关闭</button>
            <button className="px-3 py-1.5 rounded-md bg-[hsl(var(--brand-600))] text-white disabled:opacity-50"
              disabled={building || !filename} onClick={startBuild}>
              {building ? '打包中…' : '开始打包'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
