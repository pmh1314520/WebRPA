import { Button } from '../ui/button'
import { Download, X, Sparkles, ArrowRight, ChevronDown } from 'lucide-react'
import { getBackendUrl } from '@/services/api'
import { DialogPortal } from '@/components/ui/dialog-portal'

interface UpdateDialogProps {
  isOpen: boolean
  currentVersion: string
  latestVersion: string
  downloadUrl: string
  onClose: () => void
  onSkip: () => void
}

export function UpdateDialog({
  isOpen,
  currentVersion,
  latestVersion,
  downloadUrl,
  onClose,
  onSkip,
}: UpdateDialogProps) {
  if (!isOpen) return null

  const handleDownload = async () => {
    try {
      await fetch(`${getBackendUrl()}/api/system/open-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: downloadUrl }),
      })
    } catch {
      window.open(downloadUrl, '_blank')
    }
    onClose()
  }

  return (
    <DialogPortal>
    <div
      className="fixed inset-0 bg-[hsl(217_45%_15%_/_0.55)] backdrop-blur-[3px] flex items-center justify-center p-4 animate-fade-in"
      style={{ zIndex: 2147483640 }}
    >
      <div className="modern-dialog w-full max-w-md max-h-[90vh] overflow-y-auto animate-scale-in-bounce">
        {/* 顶部彩色装饰区 */}
        <div
          className="relative p-6 text-white overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--brand-600)) 0%, hsl(var(--brand-500)) 50%, hsl(var(--info-500)) 100%)',
          }}
        >
          {/* 背景装饰球体 */}
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/15 blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />

          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-[7px] text-white/80 hover:bg-white/20 hover:text-white border border-transparent transition-all duration-150 active:scale-90"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="relative flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-[12px] bg-white/20 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/30 shadow-lg">
              <Sparkles className="w-6 h-6" strokeWidth={2.2} />
            </div>
            <div>
              <h3 className="text-[20px] font-bold tracking-tight">发现新版本</h3>
              <p className="text-white/80 text-[12px] mt-0.5">WebRPA Update</p>
            </div>
          </div>
          <p className="relative text-white/90 text-[12.5px] leading-relaxed">
            有新版本可用，建议更新以获得最新功能与修复
          </p>
        </div>

        {/* 版本信息 */}
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 p-3 bg-[hsl(var(--slate-50))] rounded-[10px] border border-[hsl(var(--border))]">
            <div className="flex-1 text-center">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-[hsl(var(--muted-foreground))] mb-1">当前版本</p>
              <p className="text-[18px] font-bold text-[hsl(var(--slate-700))] tabular-nums">{currentVersion}</p>
            </div>
            <div className="flex flex-col items-center px-2">
              <ArrowRight className="w-5 h-5 text-[hsl(var(--brand-500))]" strokeWidth={2.5} />
            </div>
            <div className="flex-1 text-center">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-[hsl(var(--brand-700))] mb-1">最新版本</p>
              <p className="text-[18px] font-bold text-gradient tabular-nums">{latestVersion}</p>
            </div>
          </div>

          <div className="status-row status-row-warning !items-start !py-3">
            <ChevronDown className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <div className="text-[12px] leading-relaxed">
              <strong className="font-semibold">更新方式：</strong>
              前往 GitHub Releases 下载最新 7z 压缩包，解压替换程序所在文件夹中的所有文件即可完成更新。
            </div>
          </div>

          {/* 按钮 */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="secondary"
              size="lg"
              className="flex-1"
              onClick={onSkip}
            >
              暂不更新
            </Button>
            <Button
              variant="success"
              size="lg"
              className="flex-1"
              onClick={handleDownload}
            >
              <Download className="w-4 h-4" />
              前往下载
            </Button>
          </div>
        </div>
      </div>
    </div>
    </DialogPortal>
  )
}
