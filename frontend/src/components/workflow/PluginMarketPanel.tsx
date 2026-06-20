import { useState, useEffect, useCallback } from 'react'
import { Package, Download, Trash2, Upload, RefreshCw, Power, ExternalLink, Loader2, Star, Send, X, MessageSquare } from 'lucide-react'
import { pluginApi, type PluginInfo, type PluginReview } from '@/services/api'
import { useWorkflowStore } from '@/store/workflowStore'

/**
 * 插件市场面板：浏览市场插件、一键安装、管理已安装插件（启用/禁用/卸载）、从本地文件安装。
 * 插件贡献的模块会作为自定义模块出现在编辑器侧栏并可被工作流调用。
 */
export function PluginMarketPanel() {
  const addLog = useWorkflowStore((s) => s.addLog)
  const [view, setView] = useState<'market' | 'installed'>('market')
  const [market, setMarket] = useState<PluginInfo[]>([])
  const [installed, setInstalled] = useState<PluginInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [marketSource, setMarketSource] = useState('')
  const [marketUrl, setMarketUrl] = useState('')
  const [showUrlEdit, setShowUrlEdit] = useState(false)
  // 详情/评分弹窗
  const [detail, setDetail] = useState<PluginInfo | null>(null)
  const [reviews, setReviews] = useState<PluginReview[]>([])
  const [reviewSummary, setReviewSummary] = useState<{ count: number; average: number }>({ count: 0, average: 0 })
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [myRating, setMyRating] = useState(5)
  const [myComment, setMyComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const log = useCallback((level: 'info' | 'success' | 'warning' | 'error', message: string) => { addLog({ level, message }) }, [addLog])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [m, ins, u] = await Promise.all([pluginApi.market(), pluginApi.installed(), pluginApi.getMarketUrl()])
      if (m.data?.plugins) setMarket(m.data.plugins)
      if (m.data?.source) setMarketSource(m.data.source)
      if (ins.data?.plugins) setInstalled(ins.data.plugins)
      if (u.data?.url !== undefined) setMarketUrl(u.data.url)
    } finally {
      setLoading(false)
    }
  }, [])

  const saveMarketUrl = async () => {
    const res = await pluginApi.setMarketUrl(marketUrl.trim())
    if (res.data?.success) { log('success', '插件市场地址已保存'); setShowUrlEdit(false); await refresh() }
    else log('error', '保存失败')
  }

  useEffect(() => { refresh() }, [refresh])

  const installedIds = new Set(installed.map((p) => p.id))

  const handleInstallFromMarket = async (id: string) => {
    setBusyId(id)
    try {
      const res = await pluginApi.installFromMarket(id)
      if (res.data?.success) { log('success', `插件「${id}」已安装`); await refresh() }
      else log('error', `安装失败：${res.data?.error || res.error}`)
    } finally { setBusyId(null) }
  }

  const handleUninstall = async (id: string) => {
    setBusyId(id)
    try {
      const res = await pluginApi.uninstall(id)
      if (res.data?.success) { log('info', `插件「${id}」已卸载`); await refresh() }
      else log('error', `卸载失败：${res.data?.error || res.error}`)
    } finally { setBusyId(null) }
  }

  const handleToggle = async (p: PluginInfo) => {
    setBusyId(p.id)
    try {
      const res = await pluginApi.setEnabled(p.id, !p.enabled)
      if (res.data?.success) { log('info', `插件「${p.name}」已${!p.enabled ? '启用' : '禁用'}`); await refresh() }
      else log('error', `操作失败：${res.data?.error || res.error}`)
    } finally { setBusyId(null) }
  }

  const openDetail = useCallback(async (p: PluginInfo) => {
    setDetail(p)
    setMyRating(5)
    setMyComment('')
    setReviews([])
    setReviewSummary({ count: 0, average: 0 })
    setReviewsLoading(true)
    try {
      const res = await pluginApi.getReviews(p.id)
      if (res.data?.success) {
        setReviews(res.data.reviews || [])
        setReviewSummary(res.data.summary || { count: 0, average: 0 })
      }
    } finally {
      setReviewsLoading(false)
    }
  }, [])

  const submitReview = async () => {
    if (!detail) return
    setSubmitting(true)
    try {
      const res = await pluginApi.addReview(detail.id, myRating, myComment.trim())
      if (res.data?.success) {
        log('success', `已提交对「${detail.name}」的评分`)
        setMyComment('')
        const r = await pluginApi.getReviews(detail.id)
        if (r.data?.success) { setReviews(r.data.reviews || []); setReviewSummary(r.data.summary || { count: 0, average: 0 }) }
      } else log('error', `评分失败：${res.data?.error || res.error}`)
    } finally { setSubmitting(false) }
  }

  const handlePublish = async (p: PluginInfo) => {
    setBusyId(p.id)
    try {
      const res = await pluginApi.publish(p.id)
      if (res.data?.success) {
        if (res.data.published) log('success', `插件「${p.name}」已上架到市场`)
        else log('success', `已导出市场就绪包${res.data.exportedPath ? `：${res.data.exportedPath}` : ''}（未配置市场地址，可手动上架）`)
      } else log('error', `发布失败：${res.data?.error || res.error}`)
    } finally { setBusyId(null) }
  }

  const handleInstallFromFile = () => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = 'application/json,.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const pkg = JSON.parse(await file.text())
        const res = await pluginApi.installPackage(pkg)
        if (res.data?.success) { log('success', `插件已安装（${res.data.moduleCount ?? 0} 个模块）`); await refresh() }
        else log('error', `安装失败：${res.data?.error || res.error}`)
      } catch (e) { log('error', `插件包解析失败：${e}`) }
    }
    input.click()
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* 工具条 */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--slate-50)/0.5)]">
        <div className="inline-flex rounded-[8px] border border-[hsl(var(--border))] overflow-hidden">
          <button onClick={() => setView('market')} className={`px-3 py-1.5 text-[12.5px] font-medium ${view === 'market' ? 'bg-[hsl(var(--brand-500))] text-white' : 'text-[hsl(var(--slate-600))] hover:bg-[hsl(var(--brand-50))]'}`}>插件市场</button>
          <button onClick={() => setView('installed')} className={`px-3 py-1.5 text-[12.5px] font-medium ${view === 'installed' ? 'bg-[hsl(var(--brand-500))] text-white' : 'text-[hsl(var(--slate-600))] hover:bg-[hsl(var(--brand-50))]'}`}>已安装 ({installed.length})</button>
        </div>
        <div className="flex-1" />
        <button onClick={() => setShowUrlEdit((v) => !v)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] rounded-[7px] border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]">市场地址</button>
        <button onClick={handleInstallFromFile} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] rounded-[7px] border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]"><Upload className="w-3.5 h-3.5" />从文件安装</button>
        <button onClick={refresh} disabled={loading} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] rounded-[7px] border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]">{loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}刷新</button>
      </div>

      {showUrlEdit && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--slate-50)/0.5)]">
          <input value={marketUrl} onChange={(e) => setMarketUrl(e.target.value)} placeholder="插件市场索引地址，如 https://your-site.com/plugins.json"
            className="flex-1 px-2.5 py-1.5 text-[12px] rounded-[7px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] outline-none focus:border-[hsl(var(--brand-500))]" />
          <button onClick={saveMarketUrl} className="px-3 py-1.5 text-[12px] rounded-[7px] bg-[hsl(var(--brand-600))] hover:bg-[hsl(var(--brand-700))] text-white">保存</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {view === 'market' && marketSource === 'builtin' && (
          <div className="text-[11.5px] text-[hsl(var(--muted-foreground))] bg-[hsl(var(--warning-50))] border border-[hsl(var(--warning-500)/0.3)] rounded-[8px] px-3 py-2">
            当前显示内置示例插件。在「全局配置」中配置插件市场索引地址后，即可浏览社区上架的插件。开发者可参考官网开发文档制作并上架自己的插件。
          </div>
        )}
        {(view === 'market' ? market : installed).map((p) => {
          const isInstalled = installedIds.has(p.id)
          return (
            <div key={p.id} className="flex items-start gap-3 p-3 rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--brand-500)/0.4)] transition-colors">
              <div className="w-9 h-9 rounded-[8px] bg-[hsl(var(--brand-100))] text-[hsl(var(--brand-700))] flex items-center justify-center flex-none"><Package className="w-4 h-4" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13.5px] font-semibold text-[hsl(var(--slate-900))] truncate">{p.name}</span>
                  {p.official && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[hsl(var(--brand-100))] text-[hsl(var(--brand-700))]">官方</span>}
                  {p.version && <span className="text-[10.5px] text-[hsl(var(--muted-foreground))]">v{p.version}</span>}
                  {view === 'installed' && (<span className={`text-[10px] px-1.5 py-0.5 rounded ${p.enabled ? 'bg-[hsl(var(--success-100))] text-[hsl(var(--success-700))]' : 'bg-[hsl(var(--slate-100))] text-[hsl(var(--slate-600))]'}`}>{p.enabled ? '已启用' : '已禁用'}</span>)}
                </div>
                <div className="text-[11.5px] text-[hsl(var(--muted-foreground))] mt-0.5 line-clamp-2">{p.description}</div>
                <div className="text-[11px] text-[hsl(var(--muted-foreground))] mt-1 flex items-center gap-2 flex-wrap">
                  {p.author && <span>作者：{p.author}</span>}
                  {p.homepage && <a href={p.homepage} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-[hsl(var(--brand-600))] hover:underline">主页<ExternalLink className="w-3 h-3" /></a>}
                  <button onClick={() => openDetail(p)} className="inline-flex items-center gap-0.5 text-[hsl(var(--brand-600))] hover:underline"><MessageSquare className="w-3 h-3" />详情 / 评分</button>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 flex-none">
                {view === 'market' ? (
                  isInstalled
                    ? <span className="text-[11px] text-[hsl(var(--success-600))] px-2">已安装</span>
                    : <button onClick={() => handleInstallFromMarket(p.id)} disabled={busyId === p.id} className="inline-flex items-center gap-1 px-2.5 py-1 text-[12px] rounded-[7px] bg-[hsl(var(--brand-600))] hover:bg-[hsl(var(--brand-700))] text-white disabled:opacity-60">{busyId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}安装</button>
                ) : (
                  <>
                    <button onClick={() => handleToggle(p)} disabled={busyId === p.id} className="inline-flex items-center gap-1 px-2.5 py-1 text-[12px] rounded-[7px] border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] disabled:opacity-60"><Power className="w-3.5 h-3.5" />{p.enabled ? '禁用' : '启用'}</button>
                    <button onClick={() => handlePublish(p)} disabled={busyId === p.id} className="inline-flex items-center gap-1 px-2.5 py-1 text-[12px] rounded-[7px] border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] disabled:opacity-60"><Upload className="w-3.5 h-3.5" />发布</button>
                    <button onClick={() => handleUninstall(p.id)} disabled={busyId === p.id} className="inline-flex items-center gap-1 px-2.5 py-1 text-[12px] rounded-[7px] border border-[hsl(var(--border))] text-[hsl(var(--danger-600))] hover:bg-[hsl(var(--danger-50))] disabled:opacity-60"><Trash2 className="w-3.5 h-3.5" />卸载</button>
                  </>
                )}
              </div>
            </div>
          )
        })}
        {!loading && (view === 'market' ? market : installed).length === 0 && (
          <div className="text-center text-[12.5px] text-[hsl(var(--muted-foreground))] py-10">{view === 'market' ? '市场暂无插件' : '尚未安装任何插件'}</div>
        )}
      </div>

      {detail && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDetail(null)}>
          <div className="w-[520px] max-w-[92%] max-h-[86%] overflow-hidden flex flex-col rounded-[12px] bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 px-4 py-3 border-b border-[hsl(var(--border))]">
              <div className="w-10 h-10 rounded-[9px] bg-[hsl(var(--brand-100))] text-[hsl(var(--brand-700))] flex items-center justify-center flex-none"><Package className="w-5 h-5" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-semibold text-[hsl(var(--slate-900))] truncate">{detail.name}</span>
                  {detail.version && <span className="text-[11px] text-[hsl(var(--muted-foreground))]">v{detail.version}</span>}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(reviewSummary.average) ? 'text-amber-400 fill-amber-400' : 'text-[hsl(var(--slate-300))]'}`} />
                    ))}
                  </div>
                  <span className="text-[12px] text-[hsl(var(--muted-foreground))]">{reviewSummary.average || 0} · {reviewSummary.count} 条评价</span>
                </div>
              </div>
              <button onClick={() => setDetail(null)} className="p-1 rounded hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))]"><X className="w-4 h-4" /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {detail.description && <p className="text-[12.5px] text-[hsl(var(--slate-700))] leading-relaxed">{detail.description}</p>}
              <div className="text-[11.5px] text-[hsl(var(--muted-foreground))] flex items-center gap-3 flex-wrap">
                {detail.author && <span>作者：{detail.author}</span>}
                {detail.homepage && <a href={detail.homepage} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-[hsl(var(--brand-600))] hover:underline">主页<ExternalLink className="w-3 h-3" /></a>}
                {detail.keywords && detail.keywords.length > 0 && <span>标签：{detail.keywords.join('、')}</span>}
              </div>

              {/* 我要评分 */}
              <div className="rounded-[9px] border border-[hsl(var(--border))] p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-medium text-[hsl(var(--slate-700))]">我的评分</span>
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button key={s} type="button" onClick={() => setMyRating(s)} className="p-0.5">
                        <Star className={`w-4 h-4 ${s <= myRating ? 'text-amber-400 fill-amber-400' : 'text-[hsl(var(--slate-300))]'}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <textarea value={myComment} onChange={(e) => setMyComment(e.target.value)} rows={2} placeholder="写下你的使用体验（选填）"
                  className="w-full px-2.5 py-1.5 text-[12px] rounded-[7px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] outline-none focus:border-[hsl(var(--brand-500))] resize-none" />
                <div className="flex justify-end">
                  <button onClick={submitReview} disabled={submitting} className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] rounded-[7px] bg-[hsl(var(--brand-600))] hover:bg-[hsl(var(--brand-700))] text-white disabled:opacity-60">{submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}提交评分</button>
                </div>
              </div>

              {/* 评论列表 */}
              <div className="space-y-2">
                <div className="text-[12px] font-medium text-[hsl(var(--slate-700))]">用户评价</div>
                {reviewsLoading ? (
                  <div className="text-center text-[12px] text-[hsl(var(--muted-foreground))] py-4"><Loader2 className="w-4 h-4 animate-spin inline" /></div>
                ) : reviews.length === 0 ? (
                  <div className="text-center text-[12px] text-[hsl(var(--muted-foreground))] py-4">还没有评价，来做第一个吧</div>
                ) : reviews.map((r) => (
                  <div key={r.id} className="rounded-[8px] border border-[hsl(var(--border))] p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-medium text-[hsl(var(--slate-800))]">{r.user}</span>
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`w-3 h-3 ${s <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-[hsl(var(--slate-300))]'}`} />
                        ))}
                      </div>
                      <span className="text-[10.5px] text-[hsl(var(--muted-foreground))] ml-auto">{new Date(r.createdAt).toLocaleString()}</span>
                    </div>
                    {r.comment && <p className="text-[12px] text-[hsl(var(--slate-600))] mt-1 whitespace-pre-wrap">{r.comment}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
