import { getBackendBaseUrl } from '@/services/config'
import { X, ExternalLink, Globe } from 'lucide-react'

interface EnterpriseDialogProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * 企业控制中心 - 编辑器内嵌原生面板
 *
 * 以模态对话框 + iframe 的形式把后端自带的企业控制中心（/console/enterprise）嵌进编辑器，
 * 用户无需离开编辑器、也无需另开浏览器窗口即可使用集群/RBAC/审计/审批/保险库/IDP/
 * Computer-Use/流程挖掘等全部能力。会话与语言由 iframe 内部（后端源）独立维护。
 */
export function EnterpriseDialog({ isOpen, onClose }: EnterpriseDialogProps) {
  if (!isOpen) return null
  const url = `${getBackendBaseUrl()}/console/enterprise`
  return (
    <div
      className="fixed inset-0 bg-[hsl(217_45%_15%_/_0.55)] backdrop-blur-[3px] flex items-center justify-center p-4"
      style={{ zIndex: 2147483646 }}
      onClick={onClose}
    >
      <div
        className="modern-dialog w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[hsl(var(--border))]">
          <Globe className="w-4 h-4 text-[hsl(var(--violet-600))]" />
          <span className="font-semibold flex-1 text-sm">企业控制中心</span>
          <button
            className="p-1.5 rounded-md hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
            title="在浏览器打开"
            onClick={() => window.open(url, '_blank')}
          >
            <ExternalLink className="w-4 h-4" />
          </button>
          <button
            className="p-1.5 rounded-md hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
            title="关闭"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <iframe
          src={url}
          title="Enterprise Console"
          className="flex-1 w-full bg-white"
          style={{ border: 0 }}
        />
      </div>
    </div>
  )
}
