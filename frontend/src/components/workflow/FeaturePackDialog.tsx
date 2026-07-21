/**
 * 功能模块包管理对话框
 *
 * WebRPA 模块化分发体系的前端入口：
 * - 列出全部功能包（OCR / 媒体 / 文档 / 手机 / 语音 等）及安装状态
 * - 支持「本地路径安装」（后端直接读盘，适合 GB 级大包）与「上传 zip 安装」
 * - 支持一键卸载（释放磁盘空间）
 * - 展示每个包解锁的模块分类，让用户知道装了什么能用什么
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { featurePackApi, systemApi, type FeaturePackInfo } from '@/services/api'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { DialogPortal } from '@/components/ui/dialog-portal'
import {
  X, Package, PackageCheck, PackageOpen, RefreshCw, Upload,
  FolderOpen, Trash2, HardDrive, Sparkles, CheckCircle2, Loader2, Download, AlertTriangle,
} from 'lucide-react'

// 功能包国内高速下载入口（夸克网盘下载总目录，与官网口径统一，单个包无专属链接时回退用）
const PACK_DOWNLOAD_HUB = 'https://pan.quark.cn/s/d6331c1d0361'
// GitHub Releases 页面（海外/开发者下载渠道）
const GITHUB_RELEASES_URL = 'https://github.com/pmh1314520/WebRPA/releases'

interface FeaturePackDialogProps {
  open: boolean
  onClose: () => void
}

export function FeaturePackDialog({ open, onClose }: FeaturePackDialogProps) {
  const [packs, setPacks] = useState<FeaturePackInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [installPath, setInstallPath] = useState('')
  const [showPathInstall, setShowPathInstall] = useState(false)
  // 安装成功后展示"如未生效请重启服务"的兜底提示（大型编译库个别环境需重启才完全生效）
  const [showRestartHint, setShowRestartHint] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { confirm, ConfirmDialog } = useConfirm()

  const loadPacks = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await featurePackApi.list()
      if (res.success && res.data?.packs) {
        setPacks(res.data.packs)
      } else {
        setError(res.error || '获取功能包列表失败')
      }
    } catch (e) {
      setError((e as Error)?.message || '获取功能包列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      loadPacks()
      setNotice('')
      setError('')
      setShowRestartHint(false)
    }
  }, [open, loadPacks])

  // 打开系统原生文件选择框，选中功能包 zip 后回填路径（浏览器 file input 拿不到真实磁盘路径，故走后端本机对话框）
  const handleBrowseFile = async () => {
    setError('')
    try {
      const res = await systemApi.selectFile(
        '选择功能包 zip 文件',
        undefined,
        [['功能包 zip', '*.zip'], ['所有文件', '*.*']]
      )
      const data = res.data as { success?: boolean; path?: string } | undefined
      if (data?.success && data.path) {
        setInstallPath(data.path)
      }
    } catch (e) {
      setError((e as Error)?.message || '打开文件选择框失败')
    }
  }

  const handleInstallFromPath = async () => {
    const path = installPath.trim()
    if (!path) return
    setBusyId('__path__')
    setError('')
    setNotice('')
    try {
      const res = await featurePackApi.installFromPath(path)
      if (res.success && res.data?.success) {
        setNotice(`已安装「${res.data.name || res.data.id}」（${res.data.installed_files} 个文件）${res.data.warning ? `\n${res.data.warning}` : ''}`)
        setShowRestartHint(true)
        setInstallPath('')
        setShowPathInstall(false)
        await loadPacks()
      } else {
        setError(res.error || '安装失败')
      }
    } catch (e) {
      setError((e as Error)?.message || '安装失败')
    } finally {
      setBusyId('')
    }
  }

  const handleUpload = async (file: File) => {
    setBusyId('__upload__')
    setError('')
    setNotice('')
    try {
      const res = await featurePackApi.installUpload(file)
      if (res.success && res.data?.success) {
        setNotice(`已安装「${res.data.name || res.data.id}」（${res.data.installed_files} 个文件）${res.data.warning ? `\n${res.data.warning}` : ''}`)
        setShowRestartHint(true)
        await loadPacks()
      } else {
        setError(res.error || '安装失败')
      }
    } catch (e) {
      setError((e as Error)?.message || '安装失败')
    } finally {
      setBusyId('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleUninstall = async (pack: FeaturePackInfo) => {
    const ok = await confirm(
      `确定卸载「${pack.name}」吗？\n卸载后相关模块将无法运行，可随时重新安装恢复。`,
      { title: '卸载功能包', confirmText: '卸载', cancelText: '取消', type: 'warning' }
    )
    if (!ok) return
    setBusyId(pack.id)
    setError('')
    setNotice('')
    try {
      const res = await featurePackApi.uninstall(pack.id)
      if (res.success && res.data?.success) {
        setNotice(`已卸载「${pack.name}」`)
        await loadPacks()
      } else {
        setError(res.error || '卸载失败')
      }
    } catch (e) {
      setError((e as Error)?.message || '卸载失败')
    } finally {
      setBusyId('')
    }
  }

  if (!open) return null

  // 按分类分组
  const grouped = packs.reduce<Record<string, FeaturePackInfo[]>>((acc, p) => {
    (acc[p.category] = acc[p.category] || []).push(p)
    return acc
  }, {})
  const installedCount = packs.filter(p => p.installed).length
  const installedMb = packs.filter(p => p.installed).reduce((s, p) => s + p.size_mb, 0)

  return (
    <DialogPortal>
      <div
        className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 animate-fade-in"
        style={{ zIndex: 2147483646 }}
        onClick={onClose}
      >
        <div
          className="bg-[hsl(var(--card))] rounded-xl shadow-2xl w-full max-w-3xl max-h-[88vh] overflow-hidden flex flex-col animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 头部 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))]">
            <div className="flex items-center gap-2.5">
              <Package className="w-5 h-5 text-[hsl(var(--brand-600))]" />
              <div>
                <h2 className="text-lg font-bold text-[hsl(var(--foreground))]">功能模块包</h2>
                <p className="text-[12px] text-[hsl(var(--muted-foreground))]">
                  按需安装功能，核心包保持小体积 · {installedCount}/{packs.length} 已安装 · 约 {(installedMb / 1024).toFixed(1)} GB
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadPacks} disabled={loading}>
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                刷新
              </Button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 安装入口 */}
          <div className="px-6 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--slate-50))] space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="success"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={busyId !== ''}
              >
                {busyId === '__upload__' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                上传 zip 安装
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPathInstall(v => !v)}
                disabled={busyId !== ''}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                从本地路径安装（大包推荐）
              </Button>
              <Button
                variant="tonal"
                size="sm"
                onClick={() => window.open(GITHUB_RELEASES_URL, '_blank', 'noopener')}
                title="打开 WebRPA 的 GitHub Releases 页面下载功能模块包"
              >
                <Download className="w-3.5 h-3.5" />
                从 GitHub 下载
              </Button>
              <span className="text-[11.5px] text-[hsl(var(--muted-foreground))]">
                各功能包右侧「下载」可直达夸克网盘高速下载
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                style={{ display: 'none' }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f) }}
              />
            </div>
            {showPathInstall && (
              <div className="flex items-center gap-2">
                <Input
                  value={installPath}
                  onChange={(e) => setInstallPath(e.target.value)}
                  placeholder={'点击「浏览」选择，或粘贴功能包 zip 的完整路径'}
                  className="flex-1"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleInstallFromPath() }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBrowseFile}
                  disabled={busyId !== ''}
                  title="打开系统文件选择框，选择功能包 zip"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  浏览
                </Button>
                <Button
                  variant="success"
                  size="sm"
                  onClick={handleInstallFromPath}
                  disabled={!installPath.trim() || busyId !== ''}
                >
                  {busyId === '__path__' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PackageOpen className="w-3.5 h-3.5" />}
                  安装
                </Button>
              </div>
            )}
            {notice && (
              <div className="flex items-start gap-1.5 text-[12.5px] text-[hsl(var(--success-600))] whitespace-pre-wrap">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" /> <span>{notice}</span>
              </div>
            )}
            {error && (
              <div className="p-2 bg-red-50 border border-red-200 rounded text-[12.5px] text-red-600 whitespace-pre-wrap">
                {error}
              </div>
            )}
            {showRestartHint && (
              <div className="flex items-start gap-1.5 p-2.5 rounded-md bg-[hsl(var(--warning-50))] border border-[hsl(var(--warning-500)/0.35)] text-[12px] text-[hsl(var(--warning-700))] leading-relaxed">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  安装完成。大多数功能包可直接使用，无需重启；但含大型库的功能包（如 OCR / 图像 / 语音 / 数据表格）若运行时仍提示缺包，请到 WebRPA 启动器中先点「停止服务」、再点「启动服务」重启一次后再试。
                </span>
              </div>
            )}
          </div>

          {/* 包列表 */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            {loading && packs.length === 0 && (
              <div className="text-center py-10 text-[hsl(var(--muted-foreground))] text-sm">加载中...</div>
            )}
            {Object.entries(grouped).map(([category, list]) => (
              <div key={category}>
                <div className="text-[12px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">
                  {category}
                </div>
                <div className="space-y-2">
                  {list.map((pack) => (
                    <div
                      key={pack.id}
                      className="flex items-start gap-3 p-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--slate-300))] transition-colors"
                    >
                      <div className={`mt-0.5 shrink-0 ${pack.installed ? 'text-[hsl(var(--success-600))]' : 'text-[hsl(var(--slate-400))]'}`}>
                        {pack.installed ? <PackageCheck className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13.5px] font-semibold text-[hsl(var(--foreground))]">{pack.name}</span>
                          <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-[hsl(var(--slate-100))] text-[hsl(var(--slate-500))] font-mono">
                            {pack.id}
                          </span>
                          {pack.recommended && (
                            <span className="inline-flex items-center gap-0.5 text-[10.5px] px-1.5 py-0.5 rounded bg-[hsl(var(--brand-50))] text-[hsl(var(--brand-600))]">
                              <Sparkles className="w-3 h-3" /> 推荐
                            </span>
                          )}
                          <span className="inline-flex items-center gap-0.5 text-[10.5px] text-[hsl(var(--muted-foreground))]">
                            <HardDrive className="w-3 h-3" /> {pack.size_mb >= 1024 ? `${(pack.size_mb / 1024).toFixed(1)} GB` : `${pack.size_mb} MB`}
                          </span>
                        </div>
                        <p className="text-[12px] text-[hsl(var(--muted-foreground))] mt-0.5 leading-relaxed">
                          {pack.description}
                        </p>
                        {pack.module_categories.length > 0 && (
                          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                            {pack.module_categories.map((c) => (
                              <span key={c} className="text-[10.5px] px-1.5 py-0.5 rounded-full bg-[hsl(var(--brand-50)/0.6)] text-[hsl(var(--brand-700))]">
                                {c}
                              </span>
                            ))}
                          </div>
                        )}
                        {pack.note && (
                          <p className="text-[11px] text-[hsl(var(--warning-600))] mt-1">{pack.note}</p>
                        )}
                        {pack.install_record?.installed_at && (
                          <p className="text-[10.5px] text-[hsl(var(--slate-400))] mt-1">
                            安装于 {pack.install_record.installed_at}
                            {pack.install_record.version ? ` · v${pack.install_record.version}` : ''}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        {pack.installed ? (
                          <Button
                            variant="tonal-danger"
                            size="sm"
                            onClick={() => handleUninstall(pack)}
                            disabled={busyId !== ''}
                          >
                            {busyId === pack.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            卸载
                          </Button>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => window.open(pack.download_url || PACK_DOWNLOAD_HUB, '_blank', 'noopener')}
                            title={pack.download_url ? '打开夸克网盘高速下载此功能包' : '打开夸克网盘下载功能包'}
                          >
                            <Download className="w-3.5 h-3.5" />
                            下载
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {/* 说明 */}
            <div className="p-3 rounded-lg bg-[hsl(var(--brand-50)/0.5)] border border-[hsl(var(--brand-500)/0.2)] text-[12px] text-[hsl(var(--slate-600))] leading-relaxed">
              <p className="font-semibold text-[hsl(var(--brand-700))] mb-1">工作原理</p>
              <p>· 功能包是覆盖到 WebRPA 安装目录的增量 zip：安装即解压、卸载即删除。大多数功能包安装后即可直接使用；少数含大型库的包（OCR / 图像 / 语音 / 数据表格）若未立即生效，到 WebRPA 启动器先点「停止服务」再点「启动服务」重启一次即可。</p>
              <p>· 未安装某个包时，其对应的模块运行会给出「请安装 XX 功能模块包」的明确提示，不影响其它功能。</p>
              <p>· 从完整版升级的用户所有能力默认可用（探测的是真实文件，不依赖安装记录）。</p>
            </div>
          </div>
        </div>
      </div>
      <ConfirmDialog />
    </DialogPortal>
  )
}
