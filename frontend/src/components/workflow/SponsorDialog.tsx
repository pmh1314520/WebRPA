/**
 * 赞助与致谢对话框（喜庆红粉主题）
 *
 * - 展示作者的微信 / 支付宝收款码（来自后端 /api/sponsors/qr/{kind}），支持点击放大
 * - 展示赞助者名单（后端从 README 赞助表格解析，随版本更新，非实时）
 * - 引导用户赞助时备注「WebRPA」，方便作者手动登记进下个版本致谢名单
 */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Heart, Sparkles, Gift, ZoomIn } from 'lucide-react'
import { sponsorApi, type SponsorItem } from '@/services/api'

interface Props {
  open: boolean
  onClose: () => void
}

// 喜庆主题色（明确取值，避免依赖未定义的设计变量回退成黑/蓝）
const C = {
  red: '#e11d48',        // 主色（玫红）
  redDeep: '#be123c',    // 深玫红
  pink: '#ec4899',       // 粉
  heart: '#f43f5e',      // 爱心红
  amount: '#e11d48',     // 金额红
  softBg: '#fff1f2',     // 浅玫粉底
  softBg2: '#ffe4e6',    // 稍深玫粉
  border: '#fecdd3',     // 玫粉描边
  title: '#9f1239',      // 深玫红标题字
  text: '#7f1d1d',       // 暖红文字
  muted: '#9b8f92',      // 弱化文字
}

interface QrCardProps {
  kind: 'wechat' | 'alipay'
  title: string
  onZoom: (src: string, title: string) => void
}

function QrCard({ kind, title, onZoom }: QrCardProps) {
  const [src, setSrc] = useState<string>('')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setSrc(sponsorApi.qrUrl(kind))
    setFailed(false)
  }, [kind])

  const clickable = !failed && !!src

  return (
    <div
      className="group flex flex-col items-center gap-2 rounded-xl border bg-white p-4 shadow-sm transition-all"
      style={{ borderColor: C.border }}
    >
      <div className="text-sm font-semibold" style={{ color: C.title }}>{title}</div>
      <button
        type="button"
        onClick={() => clickable && onZoom(src, title)}
        className="relative flex h-44 w-44 items-center justify-center overflow-hidden rounded-lg transition-transform duration-150 group-hover:scale-[1.02]"
        style={{ background: '#f8f8f8', cursor: clickable ? 'zoom-in' : 'default' }}
        title={clickable ? '点击放大查看' : ''}
      >
        {clickable ? (
          <>
            <img src={src} alt={title} className="h-full w-full object-contain" onError={() => setFailed(true)} />
            <span
              className="absolute bottom-1 right-1 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100"
              style={{ background: C.red }}
            >
              <ZoomIn className="h-3 w-3" />
            </span>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 px-3 text-center text-xs" style={{ color: C.muted }}>
            <Gift className="h-7 w-7 opacity-50" />
            <span>收款码待配置</span>
          </div>
        )}
      </button>
      {clickable ? (
        <span className="text-[11px]" style={{ color: C.muted }}>点击放大查看</span>
      ) : null}
    </div>
  )
}

export function SponsorDialog({ open, onClose }: Props) {
  const [sponsors, setSponsors] = useState<SponsorItem[]>([])
  const [loading, setLoading] = useState(false)
  const [zoom, setZoom] = useState<{ src: string; title: string } | null>(null)

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

  // ESC 关闭（优先关灯箱）
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (zoom) setZoom(null)
      else onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, zoom, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 2147483646, background: 'rgba(17, 24, 39, 0.5)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        style={{ boxShadow: '0 24px 70px -12px rgba(190,18,60,0.30)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 —— 喜庆红粉渐变 */}
        <div
          className="relative flex items-center justify-between px-6 py-5"
          style={{ background: `linear-gradient(135deg, ${C.redDeep} 0%, ${C.red} 50%, ${C.pink} 100%)` }}
        >
          <div className="flex items-center gap-2.5 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
              <Heart className="h-5 w-5 fill-current" />
            </span>
            <div className="leading-tight">
              <div className="text-base font-bold tracking-wide">赞助与致谢</div>
              <div className="text-[11px] text-white/80">感谢每一份支持，让 WebRPA 走得更远</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-white/85 transition-colors hover:bg-white/25 hover:text-white"
            title="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 内容（可滚动） */}
        <div className="flex-1 overflow-y-auto px-6 py-5" style={{ background: '#ffffff' }}>
          {/* 暖心引导语 */}
          <div className="mb-5 rounded-lg border p-4 text-sm leading-relaxed" style={{ background: '#ffffff', borderColor: C.border, color: C.text }}>
            <p className="mb-1.5 flex items-center gap-1.5 font-semibold" style={{ color: C.redDeep }}>
              <Sparkles className="h-4 w-4" />
              WebRPA 由作者一个人独立开发维护，对个人永久免费、无广告、无付费墙
            </p>
            <p>若 WebRPA 帮到了你，希望能赞助一下开发工作。它能不断更新、走到今天，靠的就是各位一点一滴的支持 —— 完全随心，多少都是莫大的鼓励 ❤</p>
          </div>

          {/* 收款码 */}
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <QrCard kind="wechat" title="微信收款码" onZoom={(src, title) => setZoom({ src, title })} />
            <QrCard kind="alipay" title="支付宝收款码" onZoom={(src, title) => setZoom({ src, title })} />
          </div>

          {/* 备注提示 */}
          <div
            className="mb-6 flex items-center justify-center gap-1.5 rounded-lg border px-4 py-2.5 text-center text-sm font-medium"
            style={{ background: '#ffffff', borderColor: C.border, color: C.redDeep }}
          >
            <Heart className="h-4 w-4 flex-shrink-0 fill-current" style={{ color: C.heart }} />
            赞助时请备注「WebRPA」，方便作者把你登记进下个版本的致谢名单
          </div>

          {/* 赞助名单 */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Heart className="h-4 w-4 fill-current" style={{ color: C.heart }} />
              <span className="text-sm font-bold" style={{ color: C.title }}>已赞助的伙伴们</span>
              {!loading && (
                <span className="rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ background: C.red }}>
                  {sponsors.length}
                </span>
              )}
            </div>

            {loading ? (
              <div className="py-6 text-center text-sm" style={{ color: C.muted }}>加载中…</div>
            ) : sponsors.length === 0 ? (
              <div className="rounded-lg border py-6 text-center text-sm" style={{ background: '#ffffff', borderColor: C.border, color: C.redDeep }}>
                还没有人赞助 —— 期待你成为第一位让作者记住的人 ❤
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {sponsors.map((s, i) => (
                  <div
                    key={`${s.name}-${i}`}
                    className="flex items-start gap-2 rounded-lg border bg-white px-3 py-2 transition-colors hover:shadow-sm"
                    style={{ borderColor: C.border }}
                  >
                    <Heart className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 fill-current" style={{ color: C.heart }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium" style={{ color: C.title }}>{s.name}</span>
                        {s.amount ? (
                          <span className="flex-shrink-0 text-sm font-bold" style={{ color: C.amount }}>
                            ¥{s.amount}
                          </span>
                        ) : null}
                      </div>
                      {s.date ? (
                        <div className="truncate text-xs" style={{ color: C.muted }}>{s.date}</div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="mt-4 text-center text-xs" style={{ color: C.muted }}>
              名单随每次版本更新手动收录，由作者一条条写入，可能不会立刻出现，敬请谅解 ❤
            </p>
          </div>
        </div>

        {/* 底部 */}
        <div className="flex items-center justify-between border-t px-6 py-3" style={{ borderColor: C.border, background: '#ffffff' }}>
          <span className="flex items-center gap-1 text-sm" style={{ color: C.redDeep }}>
            <Heart className="h-3.5 w-3.5 fill-current" style={{ color: C.heart }} />
            谢谢你愿意看到这里 ❤
          </span>
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: `linear-gradient(135deg, ${C.red}, ${C.pink})` }}
          >
            关闭
          </button>
        </div>
      </div>

      {/* 收款码放大灯箱 */}
      {zoom ? (
        <div
          className="fixed inset-0 flex flex-col items-center justify-center gap-3 p-6"
          style={{ zIndex: 2147483647, background: 'rgba(17, 24, 39, 0.8)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => {
            e.stopPropagation()
            setZoom(null)
          }}
        >
          <div className="text-sm font-semibold text-white/90">{zoom.title}</div>
          <img
            src={zoom.src}
            alt={zoom.title}
            className="max-h-[78vh] max-w-[88vw] rounded-2xl bg-white p-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="text-xs text-white/70">点击任意处关闭</div>
        </div>
      ) : null}
    </div>,
    document.body,
  )
}

export default SponsorDialog
