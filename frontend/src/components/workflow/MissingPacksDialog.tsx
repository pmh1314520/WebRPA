/**
 * 缺少功能模块包提示弹窗
 *
 * 运行工作流前做功能包预检（featurePackApi.preflight）：若检测到当前工作流用到的模块
 * 依赖尚未安装的功能包，则在编辑器中央弹出本弹窗，明确告知：
 * - 缺少哪些功能包（多个备选时任装其一即可）、各自体积、受影响的模块
 * - 每个功能包的「一键下载」入口（夸克网盘国内高速下载）
 * - 面向萌新的图文安装步骤说明
 * - 一键打开「功能模块包」管理器进行安装
 */
import { Button } from '@/components/ui/button'
import { DialogPortal } from '@/components/ui/dialog-portal'
import { moduleTypeLabels } from '@/store/workflowStore'
import type { ModuleType } from '@/types'
import {
  X, PackageX, Download, Boxes, HardDrive, ArrowRight, Info,
} from 'lucide-react'

// 单个包无专属链接时回退到夸克网盘下载总目录
const PACK_DOWNLOAD_HUB = 'https://pan.quark.cn/s/d6331c1d0361'

export interface MissingPackAlternative {
  id: string
  name: string
  size_mb: number
  download_url?: string
}

export interface MissingPackGroup {
  alternatives: MissingPackAlternative[]
  module_types: string[]
}

interface MissingPacksDialogProps {
  open: boolean
  missing: MissingPackGroup[]
  onClose: () => void
  /** 打开「功能模块包」管理器（用于上传/本地路径安装） */
  onOpenManager: () => void
}

function fmtSize(mb: number): string {
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`
}

function labelOf(type: string): string {
  return moduleTypeLabels[type as ModuleType] || type
}

export function MissingPacksDialog({ open, missing, onClose, onOpenManager }: MissingPacksDialogProps) {
  if (!open) return null

  return (
    <DialogPortal>
      <div
        className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 animate-fade-in"
        style={{ zIndex: 2147483646 }}
        onClick={onClose}
      >
        <div
          className="bg-[hsl(var(--card))] rounded-xl shadow-2xl w-full max-w-2xl max-h-[88vh] overflow-hidden flex flex-col animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 头部 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))]">
            <div className="flex items-center gap-2.5">
              <PackageX className="w-5 h-5 text-[hsl(var(--warning-600))]" />
              <div>
                <h2 className="text-lg font-bold text-[hsl(var(--foreground))]">缺少功能模块包</h2>
                <p className="text-[12px] text-[hsl(var(--muted-foreground))]">
                  当前工作流用到的部分模块需要先安装对应功能包才能运行
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 缺失清单 */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="space-y-3">
              {missing.map((group, gi) => {
                const multi = group.alternatives.length > 1
                return (
                  <div
                    key={gi}
                    className="rounded-lg border border-[hsl(var(--warning-500)/0.3)] bg-[hsl(var(--warning-50)/0.5)] p-3.5"
                  >
                    {/* 受影响模块 */}
                    <div className="flex items-start gap-1.5 mb-2.5">
                      <Boxes className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[hsl(var(--warning-600))]" />
                      <p className="text-[12.5px] text-[hsl(var(--slate-600))]">
                        受影响模块：
                        <span className="text-[hsl(var(--foreground))] font-medium">
                          {group.module_types.map((t, i) => (
                            <span key={t}>
                              {i > 0 && <span className="text-[hsl(var(--muted-foreground))] font-normal">、</span>}
                              <span>{labelOf(t)}</span>
                            </span>
                          ))}
                        </span>
                      </p>
                    </div>
                    {multi && (
                      <p className="text-[11.5px] text-[hsl(var(--warning-700))] mb-2 font-medium">
                        以下功能包任装其一即可满足：
                      </p>
                    )}
                    {/* 备选功能包 */}
                    <div className="space-y-2">
                      {group.alternatives.map((alt) => (
                        <div
                          key={alt.id}
                          className="flex items-center gap-3 p-2.5 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))]"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[13px] font-semibold text-[hsl(var(--foreground))]">{alt.name}</span>
                              <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-[hsl(var(--slate-100))] text-[hsl(var(--slate-500))] font-mono">
                                {alt.id}
                              </span>
                              <span className="inline-flex items-center gap-0.5 text-[10.5px] text-[hsl(var(--muted-foreground))]">
                                <HardDrive className="w-3 h-3" /> {fmtSize(alt.size_mb)}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => window.open(alt.download_url || PACK_DOWNLOAD_HUB, '_blank', 'noopener')}
                            title="打开夸克网盘高速下载此功能包"
                          >
                            <Download className="w-3.5 h-3.5" />
                            下载
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 安装教学 */}
            <div className="rounded-lg bg-[hsl(var(--brand-50)/0.6)] border border-[hsl(var(--brand-500)/0.2)] p-3.5">
              <div className="flex items-center gap-1.5 mb-2">
                <Info className="w-4 h-4 text-[hsl(var(--brand-600))]" />
                <p className="text-[13px] font-semibold text-[hsl(var(--brand-700))]">如何安装功能模块包（新手指引）</p>
              </div>
              <ol className="space-y-1.5 text-[12.5px] text-[hsl(var(--slate-600))] leading-relaxed list-none">
                <li>1. 点击上方对应功能包的「下载」按钮，在打开的夸克网盘页面把 .zip 功能包下载到本地（无需解压）。</li>
                <li>2. 点击本弹窗底部「打开功能包管理器」。</li>
                <li>3. 在管理器里选择安装方式：小包可直接「上传 zip 安装」；大包推荐「从本地路径安装」，把下载好的 zip 完整路径粘进去点安装。</li>
                <li>4. 安装完成后回到编辑器重新点击运行；若仍提示缺包，到 WebRPA 启动器先点「停止服务」再点「启动服务」重启一次即可生效。</li>
              </ol>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-2">
                提示：功能包只需安装一次，之后同类工作流都可直接运行；从完整版升级的用户通常已自带全部功能包。
              </p>
            </div>
          </div>

          {/* 底部操作 */}
          <div className="flex items-center justify-end gap-2 px-6 py-3.5 border-t border-[hsl(var(--border))] bg-[hsl(var(--slate-50))]">
            <Button variant="outline" size="sm" onClick={onClose}>
              稍后再说
            </Button>
            <Button variant="success" size="sm" onClick={onOpenManager}>
              打开功能包管理器
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </DialogPortal>
  )
}
