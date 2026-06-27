/**
 * 赞助与致谢对话框
 *
 * - 展示作者的微信 / 支付宝收款码（来自后端 /api/sponsors/qr/{kind}）
 * - 展示赞助者名单（后端从 README 的 SPONSORS 标记之间解析，随版本更新，非实时）
 * - 引导用户赞助时备注「WebRPA」，方便作者手动登记进下个版本致谢名单
 */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Heart, Sparkles, Gift } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { sponsorApi, type SponsorItem } from '@/services/api'

interface Props {
  open: boolean
  onClose: () => void
}

interface QrCardProps {
  kind: 'wechat' | 'alipay'
  title: string
  accent: string
}

function QrCard({ kind, title, accent }: QrCardProps) {
  const [src, setSrc] = useState<string>('')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setSrc(sponsorApi.qrUrl(kind))
    setFailed(false)
  }, [kind])

  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-[hsl(var(--slate-200))] bg-white p-4 shadow-sm">
      <div className="text-sm font-medium" style={{ color: accent }}>{title}</div>
      <div className="flex h-44 w-44 items-center justify-center overflow-hidden rounded-lg bg-[hsl(var(--slate-50))]">
        {!failed && src ? (
          <img
            src={src}
            alt={title}
            className="h-full w-full object-contain"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="flex flex-col items-center gap-1 px-3 text-center text-xs text-[hsl(var(--muted-foreground))]">
            <Gift className="h-7 w-7 opacity-50" />
            <span>收款码待配置</span>
          </div>
        )}
      </div>
    </div>
  )
}

export function SponsorDialog({ open, onClose }: Props) {
  const [sponsors, setSponsors] = useState<SponsorItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    let alive = true
    setLoading(true)
    sponsorApi
      .list()
      .then((res) => {
        if (!alive) return
        setSponsors(res.success && res.data ? res.data.sponsors || [] : [])
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 2147483646, background: 'hsl(217 45% 15% / 0.55)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}
    >
      <div
        className="modern-dialog flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ background: 'linear-gradient(135deg, hsl(var(--brand-600)), hsl(var(--violet-600)))' }}
        >
          <div className="flex items-center gap-2 text-white">
            <Heart className="h-5 w-5 fill-current" />
            <span className="text-base font-semibold">赞助与致谢</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
            title="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 内容（可滚动） */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* 暖心引导语 */}
          <div className="mb-5 rounded-xl bg-[hsl(var(--brand-50))] p-4 text-sm leading-relaxed text-[hsl(var(--slate-700))]">
            <p className="mb-1 flex items-center gap-1.5 font-medium text-[hsl(var(--brand-700))]">
              <Sparkles className="h-4 w-4" />
              WebRPA 由作者一个人独立开发维护，对个人永久免费、无广告、无付费墙
            </p>
            <p>
              它能不断更新、走到今天，靠的是认可它的你们一点一滴的支持。如果 WebRPA 帮到了你，
              欢迎请作者喝杯咖啡 —— 完全随心，多少都是莫大的鼓励 ❤
            </p>
          </div>

          {/* 收款码 */}
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <QrCard kind="wechat" title="微信收款码" accent="hsl(142 71% 38%)" />
            <QrCard kind="alipay" title="支付宝收款码" accent="hsl(211 100% 45%)" />
          </div>

          {/* 备注提示 */}
          <div className="mb-6 rounded-lg border border-dashed border-[hsl(var(--warning-500)/0.5)] bg-[hsl(var(--warning-50))] px-4 py-2.5 text-center text-sm text-[hsl(var(--warning-700))]">
            赞助时请备注「WebRPA」，方便作者把你登记进下个版本的致谢名单
          </div>

          {/* 赞助名单 */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Heart className="h-4 w-4 fill-current text-[hsl(var(--danger-500))]" />
              <span className="text-sm font-semibold text-[hsl(var(--slate-800))]">
                已赞助的伙伴们
              </span>
              {!loading && (
                <span className="rounded-full bg-[hsl(var(--brand-100))] px-2 py-0.5 text-xs text-[hsl(var(--brand-700))]">
                  {sponsors.length}
                </span>
              )}
            </div>

            {loading ? (
              <div className="py-6 text-center text-sm text-[hsl(var(--muted-foreground))]">加载中…</div>
            ) : sponsors.length === 0 ? (
              <div className="rounded-lg bg-[hsl(var(--slate-50))] py-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
                还没有人赞助 —— 期待你成为第一位让作者记住的人 ❤
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {sponsors.map((s, i) => (
                  <div
                    key={`${s.name}-${i}`}
                    className="flex items-start gap-2 rounded-lg border border-[hsl(var(--slate-200))] bg-white px-3 py-2"
                  >
                    <Heart className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 fill-current text-[hsl(var(--danger-400))]" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-[hsl(var(--slate-800))]">{s.name}</span>
                        {s.amount ? (
                          <span className="flex-shrink-0 text-sm font-semibold text-[hsl(var(--danger-500))]">
                            ¥{s.amount}
                          </span>
                        ) : null}
                      </div>
                      {s.date ? (
                        <div className="truncate text-xs text-[hsl(var(--muted-foreground))]">{s.date}</div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="mt-4 text-center text-xs text-[hsl(var(--muted-foreground))]">
              名单随每次版本更新手动收录，由作者一条条写入，可能不会立刻出现，敬请谅解 ❤
            </p>
          </div>
        </div>

        {/* 底部 */}
        <div className="flex items-center justify-between border-t border-[hsl(var(--slate-200))] px-6 py-3">
          <span className="text-sm text-[hsl(var(--muted-foreground))]">谢谢你愿意看到这里 ❤</span>
          <Button variant="outline" size="sm" onClick={onClose}>
            关闭
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default SponsorDialog
