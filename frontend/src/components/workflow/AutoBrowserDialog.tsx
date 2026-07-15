import { useState, useEffect, useRef } from 'react'
import { X, Globe, MousePointer, Copy, Check, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UrlInput } from '@/components/ui/url-input'
import { browserApi, elementPickerApi, systemApi } from '@/services/api'
import { useGlobalConfigStore } from '@/store/globalConfigStore'
import { DialogPortal } from '@/components/ui/dialog-portal'

interface AutoBrowserDialogProps {
  isOpen: boolean
  onClose: () => void
  onLog: (level: 'info' | 'success' | 'warning' | 'error', message: string) => void
}

export function AutoBrowserDialog({ isOpen, onClose, onLog }: AutoBrowserDialogProps) {
  const [browserOpen, setBrowserOpen] = useState(false)
  const [pickerActive, setPickerActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [url, setUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [lastSelector, setLastSelector] = useState('')
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // 记录上一次已处理的选择器，避免轮询期间对同一结果重复复制/记日志
  const lastHandledRef = useRef('')
  const { config } = useGlobalConfigStore()

  // 检查浏览器状态
  const checkStatus = async () => {
    try {
      const result = await browserApi.getStatus()
      if (result.data) {
        setBrowserOpen(result.data.isOpen)
        setPickerActive(result.data.pickerActive)
      }
    } catch {
      setBrowserOpen(false)
      setPickerActive(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      checkStatus()
    }
  }, [isOpen])

  // 轮询检查选择结果
  useEffect(() => {
    if (pickerActive) {
      // 每次开始拾取重置去重标记，使再次选中同一元素也能重新复制
      lastHandledRef.current = ''
      pollingRef.current = setInterval(async () => {
        // 是否自动复制选择器到剪贴板（全局配置，默认开启）
        const autoCopy = useGlobalConfigStore.getState().config.browser?.autoCopySelector !== false

        // 检查单元素选择
        const singleResult = await elementPickerApi.getSelected()
        if (singleResult.data?.selected && singleResult.data.element) {
          const selector = singleResult.data.element.selector
          if (selector && selector !== lastHandledRef.current) {
            lastHandledRef.current = selector
            setLastSelector(selector)
            onLog('success', `已选择元素: ${selector}`)
            if (autoCopy) autoCopySelector(selector)
          }
        }

        // 检查相似元素选择
        const similarResult = await elementPickerApi.getSimilar()
        if (similarResult.data?.selected && similarResult.data.similar) {
          const pattern = similarResult.data.similar.pattern
          const count = similarResult.data.similar.count
          if (pattern && pattern !== lastHandledRef.current) {
            lastHandledRef.current = pattern
            setLastSelector(pattern)
            onLog('success', `已选择 ${count} 个相似元素: ${pattern}`)
            if (autoCopy) autoCopySelector(pattern)
          }
        }
      }, 500)
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [pickerActive, onLog])

  // 自动复制选择器：改由后端写系统剪贴板（焦点无关）。
  // 拾取元素时焦点在自动化浏览器窗口，编辑器失焦，navigator.clipboard 会以
  // "document is not focused" 拒绝复制，故这里走后端 pyperclip/win32 写入。
  const autoCopySelector = async (text: string) => {
    try {
      const res = await systemApi.setClipboard(text)
      if (res.error) {
        onLog('warning', `选择器复制到剪贴板失败: ${res.error}`)
        return
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      onLog('success', '选择器已复制到剪贴板')
    } catch (e) {
      onLog('warning', `选择器复制到剪贴板失败: ${e instanceof Error ? e.message : e}`)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        textArea.remove()
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      onLog('success', '已复制到剪贴板')
    } catch {
      onLog('error', '复制失败')
    }
  }

  const handleOpenBrowser = async () => {
    setLoading(true)
    try {
      // 传递浏览器配置
      const browserConfig = config.browser ? {
        type: config.browser.type || 'msedge',
        executablePath: config.browser.executablePath || undefined,
        userDataDir: config.browser.userDataDir || undefined,
        fullscreen: config.browser.fullscreen || false,
        launchArgs: config.browser.launchArgs || undefined,
        extensionDirs: config.browser.extensionDirs || undefined
      } : undefined
      
      const result = await browserApi.open(url || undefined, browserConfig)
      if (result.error) {
        onLog('error', `打开浏览器失败: ${result.error}`)
      } else {
        setBrowserOpen(true)
        const browserName = config.browser?.type === 'chrome' ? 'Chrome' : 
                           config.browser?.type === 'firefox' ? 'Firefox' :
                           config.browser?.type === 'chromium' ? 'Chromium' : 'Edge'
        onLog('success', `自动化浏览器(${browserName})已打开，登录状态将自动保存`)
      }
    } catch (error) {
      onLog('error', `打开浏览器异常: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCloseBrowser = async () => {
    setLoading(true)
    try {
      await browserApi.close()
      setBrowserOpen(false)
      setPickerActive(false)
      onLog('info', '浏览器已关闭')
    } catch (error) {
      onLog('error', `关闭浏览器失败: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleNavigate = async () => {
    if (!url) return
    try {
      const result = await browserApi.navigate(url)
      if (result.error) {
        onLog('error', `导航失败: ${result.error}`)
      } else {
        onLog('info', `已导航到: ${url}`)
      }
    } catch (error) {
      onLog('error', `导航异常: ${error}`)
    }
  }



  const handleStartPicker = async () => {
    try {
      const result = await browserApi.startPicker()
      if (result.error) {
        onLog('error', `启动选择器失败: ${result.error}`)
      } else {
        setPickerActive(true)
        onLog('info', '元素选择器已启动 - Ctrl+点击选择单个元素，Alt+点击选择相似元素')
      }
    } catch (error) {
      onLog('error', `启动选择器异常: ${error}`)
    }
  }

  const handleStopPicker = async () => {
    try {
      await browserApi.stopPicker()
      setPickerActive(false)
      onLog('info', '元素选择器已停止')
    } catch {
      setPickerActive(false)
    }
  }

  if (!isOpen) return null

  return (
    <DialogPortal>
    <div
      className="fixed inset-0 flex items-center justify-center bg-[hsl(217_45%_15%_/_0.55)] backdrop-blur-[3px] animate-fade-in p-4"
      style={{ zIndex: 2147483646 }}
      onClick={onClose}
    >
      <div
        className="modern-dialog w-full max-w-[520px] max-h-[90vh] flex flex-col animate-scale-in-bounce"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="modern-dialog-header">
          <div className="modern-dialog-header-icon modern-dialog-header-icon-success">
            <Globe className="w-5 h-5" strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="modern-dialog-title flex items-center gap-2">
              自动化浏览器
              {browserOpen && (
                <span className="badge badge-success">
                  <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--success-500))] animate-pulse" />
                  已打开
                </span>
              )}
            </h3>
            <div className="modern-dialog-subtitle">登录账号、抓取选择器一站式</div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[7px] text-[hsl(var(--slate-500))] hover:bg-[hsl(var(--danger-50))] hover:text-[hsl(var(--danger-600))] hover:border-[hsl(var(--danger-500)/0.3)] border border-transparent transition-all duration-150 active:scale-90"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* 说明 */}
          <div className="section-block">
            <div className="section-block-header">
              <div className="icon-chip icon-chip-info !w-6 !h-6">
                <Globe className="w-3.5 h-3.5" />
              </div>
              功能说明
            </div>
            <div className="section-block-body !py-3">
              <ul className="space-y-1.5 text-[12px] text-[hsl(var(--slate-700))]">
                <li className="flex items-start gap-1.5">
                  <span className="text-[hsl(var(--brand-600))] mt-0.5">•</span>
                  <span>在此浏览器中登录的账号，运行工作流时会保持登录状态</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-[hsl(var(--brand-600))] mt-0.5">•</span>
                  <span>支持元素选择器，选中后自动复制到剪贴板</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-[hsl(var(--brand-600))] mt-0.5">•</span>
                  <span>相似元素自动用 <code className="variable-tag">{'{index}'}</code> 替换变化部分</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-[hsl(var(--violet-600))] mt-0.5 font-bold">★</span>
                  <span className="font-semibold text-[hsl(var(--violet-700))]">
                    按 <kbd className="px-1.5 py-0.5 bg-[hsl(var(--violet-100))] border border-[hsl(var(--violet-500)/0.3)] rounded text-[10px] font-mono shadow-xs">Alt+X</kbd> 使用高级元素选择器（推荐）
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* URL 输入 - 仅在浏览器打开后显示 */}
          {browserOpen && (
            <>
              {/* Alt+X 快捷键卡 */}
              <div className="relative p-4 rounded-[12px] border-[1.5px] border-[hsl(var(--violet-500)/0.3)] bg-gradient-to-br from-[hsl(var(--violet-50))] to-[hsl(var(--card))] overflow-hidden">
                <div className="flex items-start gap-3">
                  <div className="icon-block icon-block-violet !w-9 !h-9">
                    <MousePointer className="w-4.5 h-4.5" strokeWidth={2.2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-[hsl(var(--violet-700))] mb-1">高级元素选择器</p>
                    <p className="text-[11.5px] text-[hsl(var(--violet-700))] mb-2 leading-relaxed">
                      在浏览器中按 <kbd className="px-2 py-0.5 bg-[hsl(var(--card))] border-[1.5px] border-[hsl(var(--violet-500)/0.4)] rounded text-[11px] font-bold text-[hsl(var(--violet-700))] shadow-soft">Alt+X</kbd> 激活智能元素定位助手
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="badge !bg-[hsl(var(--violet-100))] !text-[hsl(var(--violet-700))] !border-[hsl(var(--violet-500)/0.3)]">智能选择器生成</span>
                      <span className="badge !bg-[hsl(var(--violet-100))] !text-[hsl(var(--violet-700))] !border-[hsl(var(--violet-500)/0.3)]">批量收集管理</span>
                      <span className="badge !bg-[hsl(var(--violet-100))] !text-[hsl(var(--violet-700))] !border-[hsl(var(--violet-500)/0.3)]">可拖拽面板</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[12px] font-semibold text-[hsl(var(--slate-800))]">导航到网址</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <UrlInput
                      value={url}
                      onChange={setUrl}
                      placeholder="https://example.com"
                    />
                  </div>
                  <Button variant="default" size="sm" onClick={handleNavigate} disabled={!url}>
                    跳转
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* 浏览器控制 */}
          <div className="flex gap-2">
            {!browserOpen ? (
              <Button
                onClick={handleOpenBrowser}
                disabled={loading}
                loading={loading}
                variant="success"
                className="flex-1"
                size="lg"
              >
                {!loading && <Globe className="w-4 h-4" />}
                {loading ? '正在打开浏览器…' : '打开浏览器'}
              </Button>
            ) : (
              <>
                <Button variant="destructive" className="flex-1" onClick={handleCloseBrowser} disabled={loading} size="lg">
                  <X className="w-4 h-4" />
                  关闭浏览器
                </Button>
                <Button variant="tonal" onClick={checkStatus} size="lg" title="刷新状态">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>

          {/* 元素选择器 */}
          {browserOpen && (
            <div className="section-block">
              <div className="section-block-header">
                <div className="icon-chip icon-chip-info !w-6 !h-6">
                  <MousePointer className="w-3.5 h-3.5" />
                </div>
                <span className="flex-1">元素选择器</span>
                {pickerActive ? (
                  <Button variant="destructive" size="sm" onClick={handleStopPicker}>
                    停止选择
                  </Button>
                ) : (
                  <Button variant="info" size="sm" onClick={handleStartPicker}>
                    <MousePointer className="w-3.5 h-3.5" />
                    启动选择器
                  </Button>
                )}
              </div>

              <div className="section-block-body !py-3 space-y-3">
                {pickerActive && (
                  <div className="status-row status-row-warning !items-start !py-2.5 flex-col gap-1.5">
                    <p className="font-semibold text-[12px]">选择器已激活，回到浏览器操作</p>
                    <ul className="text-[11px] space-y-1 mt-1 w-full">
                      <li className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-[hsl(var(--card))] border border-[hsl(var(--warning-500)/0.4)] rounded font-mono text-[10px]">Ctrl</kbd>
                        <span>+ 点击：选择单个元素</span>
                      </li>
                      <li className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-[hsl(var(--card))] border border-[hsl(var(--warning-500)/0.4)] rounded font-mono text-[10px]">Alt</kbd>
                        <span>依次点击两个相似元素，自动识别全部</span>
                      </li>
                      <li className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-[hsl(var(--card))] border border-[hsl(var(--warning-500)/0.4)] rounded font-mono text-[10px]">Esc</kbd>
                        <span>取消选择</span>
                      </li>
                    </ul>
                  </div>
                )}

                {lastSelector && (
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">最近复制</label>
                    <div className="flex items-center gap-2 mt-1.5 p-2.5 bg-[hsl(var(--brand-50))] rounded-[8px] border border-[hsl(var(--brand-500)/0.3)]">
                      <code className="flex-1 text-[12px] text-[hsl(var(--brand-700))] truncate font-mono" title={lastSelector}>
                        {lastSelector}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => copyToClipboard(lastSelector)}
                        title={copied ? '已复制' : '复制'}
                      >
                        {copied ? <Check className="w-3 h-3 text-[hsl(var(--success-600))]" /> : <Copy className="w-3 h-3" />}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className="dialog-footer-bar">
          <Button variant="secondary" size="sm" onClick={onClose}>
            关闭
          </Button>
        </div>
      </div>
    </div>
    </DialogPortal>
  )
}
