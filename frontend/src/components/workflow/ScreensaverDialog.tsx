/**
 * 屏保弹幕配置对话框
 *
 * 用户在前端配置后发请求到 /api/screensaver/start，由后端独立 Python 进程
 * 启动 tkinter 全屏窗口覆盖整个桌面（不受浏览器限制）。
 */
import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Play, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectNative as Select } from '@/components/ui/select-native'
import { ColorField } from '@/components/ui/color-field'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { screensaverApi } from '@/services/api'

interface Props {
  open: boolean
  onClose: () => void
}

const SCREENSAVER_CONFIG_KEY = 'webrpa.editor.screensaverConfig'

const FONT_FAMILIES = [
  'Microsoft YaHei',
  'SimHei',
  'SimSun',
  'KaiTi',
  'FangSong',
  'Inter',
  'Arial',
  'Verdana',
  'Tahoma',
  'Consolas',
  'Courier New',
]

const PRESET_THEMES: Array<{ name: string; color: string; background: string; alpha: number }> = [
  { name: '经典深色',   color: '#ffffff', background: '#000000', alpha: 1.0 },
  { name: '炫彩荧光绿', color: '#00ff88', background: '#000000', alpha: 1.0 },
  { name: '紫霞光辉',   color: '#a78bfa', background: '#0a0014', alpha: 1.0 },
  { name: '极昼亮色',   color: '#1f2937', background: '#ffffff', alpha: 1.0 },
  { name: '半透明遮罩', color: '#ffffff', background: '#000000', alpha: 0.6 },
  { name: '橙红警示',   color: '#fff7ed', background: '#7c2d12', alpha: 1.0 },
  { name: '蓝调',       color: '#dbeafe', background: '#1e3a8a', alpha: 1.0 },
]

interface BulletItem {
  text: string
  color?: string
  font_family?: string
  font_size?: number
  speed?: number
  bold?: boolean
}

interface ScreensaverConfig {
  content_type: 'text' | 'scroll' | 'clock' | 'date' | 'countdown' | 'bullet'
  text: string
  /** @deprecated 历史字段，保留以做迁移；新代码请用 clock_format / date_format */
  datetime_format: string
  /** 时钟（content_type='clock'）独立时间格式 */
  clock_format: string
  /** 日期（content_type='date'）独立时间格式 */
  date_format: string
  countdown_target: string
  bullets: BulletItem[]
  font_family: string
  font_size: number
  font_weight: 'normal' | 'bold'
  font_italic: boolean
  color: string
  background: string
  background_alpha: number
  fullscreen: boolean
  scroll_direction: 'left' | 'right' | 'up' | 'down'
  scroll_speed: number
  scroll_loop: boolean
  click_through: boolean
  show_close_hint: boolean
  exit_hotkey: string
  outline_color: string
  outline_width: number
  rotation: number
  vertical_text: boolean
}

const DEFAULT_CONFIG: ScreensaverConfig = {
  content_type: 'scroll',
  text: 'WebRPA 正在运行中…',
  datetime_format: '',
  clock_format: '',
  date_format: '',
  countdown_target: '',
  bullets: [
    { text: '加油！', color: '#ff6b6b', font_size: 56, speed: 220, bold: true },
    { text: '今日事今日毕', color: '#4ecdc4', font_size: 48, speed: 180 },
    { text: 'WebRPA 自动化', color: '#ffe66d', font_size: 52, speed: 260 },
  ],
  font_family: 'Microsoft YaHei',
  font_size: 96,
  font_weight: 'bold',
  font_italic: false,
  color: '#ffffff',
  background: '#000000',
  background_alpha: 1.0,
  fullscreen: true,
  scroll_direction: 'left',
  scroll_speed: 240,
  scroll_loop: true,
  click_through: false,
  show_close_hint: true,
  exit_hotkey: 'Escape',
  outline_color: '',
  outline_width: 0,
  rotation: 0,
  vertical_text: false,
}

function loadConfig(): ScreensaverConfig {
  try {
    const raw = localStorage.getItem(SCREENSAVER_CONFIG_KEY)
    if (!raw) return { ...DEFAULT_CONFIG }
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_CONFIG, ...parsed }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}


/**
 * 弹幕预览：用 RAF 真模拟后端 _draw_bullets 的逻辑
 *  - 每条独立 x/y/speed/color/size
 *  - x 跑出屏幕左侧后 y 重新随机
 *  - 与父组件解耦：颜色拖动不会重启动画
 */
const BulletPreview = React.memo(function BulletPreview({
  bullets,
  previewW,
  previewH,
  fallbackColor,
  fallbackFontSize,
  fontFamily,
  previewScale,
}: {
  bullets: BulletItem[]
  previewW: number
  previewH: number
  fallbackColor: string
  fallbackFontSize: number
  fontFamily: string
  previewScale: number
}) {
  // 每条弹幕的 DOM ref，通过直接改 style.transform 推动，绕过 React 重渲染
  const refs = useRef<(HTMLSpanElement | null)[]>([])
  // 弹幕状态（每条独立），用 ref 持有避免引发渲染
  const stateRef = useRef<Array<{ x: number; y: number; w: number }>>([])

  // 当数量变化时重新初始化状态
  useEffect(() => {
    refs.current = refs.current.slice(0, bullets.length)
    stateRef.current = bullets.map((_, i) => ({
      x: previewW + Math.random() * previewW * 0.5 + i * 30,
      y: 8 + Math.random() * Math.max(1, previewH - 40),
      w: 100,
    }))
  }, [bullets.length, previewW, previewH])

  useEffect(() => {
    if (previewW <= 0 || previewH <= 0) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const states = stateRef.current
      for (let i = 0; i < bullets.length; i++) {
        const b = bullets[i]
        const el = refs.current[i]
        const s = states[i]
        if (!el || !s) continue
        // 推进 x（speed 用预览缩放系数换算成预览空间速度）
        const speedPx = (b.speed || 200) * (previewW > 0 ? previewW / 1920 : 1)
        s.x -= speedPx * dt
        // 拿到真实文本宽度（首次 render 后即可用）
        if (el.offsetWidth) s.w = el.offsetWidth
        // 划出屏幕：x + w < 0 时回到右侧并重新随机 y
        if (s.x + s.w < 0) {
          s.x = previewW + Math.random() * previewW * 0.3
          s.y = 8 + Math.random() * Math.max(1, previewH - 40)
        }
        el.style.transform = `translate3d(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px, 0)`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [bullets.length, previewW, previewH])

  return (
    <div className="absolute inset-0 overflow-hidden">
      {bullets.map((b, i) => (
        <span
          key={i}
          ref={(el) => { refs.current[i] = el }}
          className="absolute top-0 left-0 whitespace-nowrap"
          style={{
            color: b.color || fallbackColor,
            fontWeight: b.bold ? 700 : 400,
            fontSize: Math.max(6, (b.font_size ?? fallbackFontSize) * previewScale),
            fontFamily,
            willChange: 'transform',
          }}
        >
          {b.text}
        </span>
      ))}
    </div>
  )
})


/**
 * 优化的颜色选择器：
 * - 拖动时本地状态实时反映（input UI 同步变化）
 * - 真正写入父组件做防抖（80ms）— 拖动中持续变化时不重启父组件渲染
 * - 鼠标松开 / 弹窗关闭时立即提交最新值
 */
const ColorInput = React.memo(function ColorInput({
  value,
  onChange,
  className,
}: {
  value: string
  onChange: (v: string) => void
  className?: string
}) {
  return <ColorField value={value} onChange={onChange} variant="full" className={className} />
})


export function ScreensaverDialog({ open, onClose }: Props) {
  const [config, setConfig] = useState<ScreensaverConfig>(() => loadConfig())
  const [running, setRunning] = useState(false)
  const [busy, setBusy] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  // 屏幕真实分辨率（用于预览比例）
  // 说明：window.screen.width/height 在 Windows DPI 缩放下报告的是 CSS 逻辑像素（与浏览器、与
  // 后端 GetSystemMetrics 的取值保持一致）。配合 devicePixelRatio 可以反算物理像素。
  const [screenSize, setScreenSize] = useState<{ w: number; h: number; dpr: number }>(() => ({
    w: typeof window !== 'undefined' ? window.screen.width : 1920,
    h: typeof window !== 'undefined' ? window.screen.height : 1080,
    dpr: typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1,
  }))
  const [previewBox, setPreviewBox] = useState<{ w: number; h: number }>({ w: 0, h: 0 })
  // 预览容器：用 useRef 持有节点，不要每次渲染都创建新的回调 ref（会触发 setState 死循环）
  const previewBoxRef = useRef<HTMLDivElement | null>(null)
  // 实时桌面背景（getDisplayMedia 屏幕共享流，用户需授权一次）
  const [desktopStream, setDesktopStream] = useState<MediaStream | null>(null)
  const [desktopLoading, setDesktopLoading] = useState(false)
  const [desktopError, setDesktopError] = useState('')
  const desktopVideoRef = useRef<HTMLVideoElement | null>(null)
  // 用于实时刷新时钟/日期/倒计时显示
  const [, setNowTick] = useState(0)
  // 滚动模式：用 ref 持有元素，直接改 transform（绕开 React 渲染，60fps 丝滑）
  const scrollTextRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    if (!open) return
    // 打开时拉一次状态，并每 1 秒轮询一次（屏保在外部被 Esc/双击退出时前端能感知）
    let cancelled = false
    const fetchStatus = async () => {
      try {
        const res = await screensaverApi.status()
        if (!cancelled && res.success && res.data) {
          const r = !!res.data.running
          setRunning((prev) => (prev !== r ? r : prev))
        }
      } catch {}
    }
    fetchStatus()
    const tid = window.setInterval(fetchStatus, 1000)
    return () => {
      cancelled = true
      window.clearInterval(tid)
    }
  }, [open])

  // localStorage 持久化做 debounce，避免颜色拖动时每像素都写一次造成卡顿
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(SCREENSAVER_CONFIG_KEY, JSON.stringify(config))
      } catch {}
    }, 200)
    return () => clearTimeout(timer)
  }, [config])

  useEffect(() => {
    if (!open || typeof window === 'undefined') return
    const onResize = () => setScreenSize({
      w: window.screen.width,
      h: window.screen.height,
      dpr: window.devicePixelRatio || 1,
    })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [open])

  // 监听预览框实际尺寸（基于 ResizeObserver；只在 open 时挂载）
  useEffect(() => {
    if (!open) return
    const node = previewBoxRef.current
    if (!node) return
    const update = () => {
      const w = node.clientWidth
      const h = node.clientHeight
      if (w && h) {
        setPreviewBox((prev) => (prev.w === w && prev.h === h ? prev : { w, h }))
      }
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(node)
    return () => ro.disconnect()
  }, [open])

  // 实时桌面背景流：写到 video 元素
  useEffect(() => {
    const v = desktopVideoRef.current
    if (!v) return
    if (desktopStream && v.srcObject !== desktopStream) {
      v.srcObject = desktopStream
      v.play().catch(() => {})
    }
    if (!desktopStream && v.srcObject) {
      v.srcObject = null
    }
  }, [desktopStream])

  // 关闭弹窗时停掉桌面流
  useEffect(() => {
    if (!open && desktopStream) {
      desktopStream.getTracks().forEach((t) => t.stop())
      setDesktopStream(null)
    }
    return () => {
      if (desktopStream && !open) {
        desktopStream.getTracks().forEach((t) => t.stop())
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // 实时刷新（clock / date / countdown 1 秒一次）
  useEffect(() => {
    if (!open) return
    if (config.content_type !== 'clock' && config.content_type !== 'date' && config.content_type !== 'countdown') return
    const tid = window.setInterval(() => setNowTick((n) => (n + 1) % 1000000), 1000)
    return () => window.clearInterval(tid)
  }, [open, config.content_type])

  // 滚动模式：用 transform 直接改 ref.style，绕过 React 重渲染做到 60fps 丝滑
  // 元素 CSS 锚点：top:0; left:0（左上角）。
  // effect 里直接用绝对位置（pos 是预览空间的像素值），不用百分比 -50%，避免父子尺寸误匹配
  useEffect(() => {
    if (!open) return
    const el = scrollTextRef.current
    if (!el) return
    if (config.content_type !== 'scroll') {
      // 非滚动模式：本元素在 JSX 里只在 scroll 分支挂载，这个分支不会用到这个 ref
      return
    }
    if (previewBox.w <= 0 || previewBox.h <= 0) return

    const dir = config.scroll_direction
    const sx = previewBox.w > 0 ? previewBox.w / screenSize.w : 1
    const sy = previewBox.h > 0 ? previewBox.h / screenSize.h : 1
    const axisScale = (dir === 'left' || dir === 'right') ? sx : sy
    const v = Math.max(20, config.scroll_speed) * axisScale

    const W = previewBox.w
    const H = previewBox.h
    const textW = el.offsetWidth || 200
    const textH = el.offsetHeight || 40

    // 居中线：水平滚动时文字垂直居中（Y 居中）；垂直滚动时文字水平居中（X 居中）
    const centerX = (W - textW) / 2
    const centerY = (H - textH) / 2

    // pos 含义：水平滚动时是 X 像素，垂直滚动时是 Y 像素
    let pos: number
    switch (dir) {
      case 'left':  pos = W; break             // 从右进入
      case 'right': pos = -textW; break        // 从左进入
      case 'up':    pos = H; break             // 从下进入
      case 'down':  pos = -textH; break        // 从上进入
      default:      pos = 0
    }

    const applyTransform = () => {
      if (dir === 'left' || dir === 'right') {
        // 水平滚动：X = pos，Y = 居中
        el.style.transform = `translate3d(${pos.toFixed(2)}px, ${centerY.toFixed(2)}px, 0)`
      } else {
        // 垂直滚动：X = 居中，Y = pos
        el.style.transform = `translate3d(${centerX.toFixed(2)}px, ${pos.toFixed(2)}px, 0)`
      }
    }
    applyTransform()

    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const delta = v * dt
      switch (dir) {
        case 'left':
          pos -= delta
          if (pos + textW < 0) pos = config.scroll_loop ? W : pos
          break
        case 'right':
          pos += delta
          if (pos > W) pos = config.scroll_loop ? -textW : pos
          break
        case 'up':
          pos -= delta
          if (pos + textH < 0) pos = config.scroll_loop ? H : pos
          break
        case 'down':
          pos += delta
          if (pos > H) pos = config.scroll_loop ? -textH : pos
          break
      }
      applyTransform()
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [open, config.content_type, config.scroll_direction, config.scroll_speed, config.scroll_loop, previewBox.w, previewBox.h, screenSize.w, screenSize.h, config.text])

  const enableDesktopBg = async () => {
    setDesktopError('')
    setDesktopLoading(true)
    try {
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: { frameRate: 30 },
        audio: false,
      })
      // 当用户在浏览器自带的"停止共享"栏点击停止时，stream 会发 ended
      stream.getVideoTracks().forEach((t: MediaStreamTrack) => {
        t.addEventListener('ended', () => setDesktopStream(null))
      })
      setDesktopStream(stream)
    } catch (e: any) {
      setDesktopError(e?.message || '获取桌面画面失败')
    } finally {
      setDesktopLoading(false)
    }
  }
  const disableDesktopBg = () => {
    if (desktopStream) desktopStream.getTracks().forEach((t) => t.stop())
    setDesktopStream(null)
  }

  if (!open) return null

  const update = <K extends keyof ScreensaverConfig>(key: K, value: ScreensaverConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  const applyTheme = (idx: number) => {
    const t = PRESET_THEMES[idx]
    if (!t) return
    setConfig((prev) => ({
      ...prev,
      color: t.color,
      background: t.background,
      background_alpha: t.alpha,
    }))
  }

  const updateBullet = (idx: number, patch: Partial<BulletItem>) => {
    setConfig((prev) => ({
      ...prev,
      bullets: prev.bullets.map((b, i) => (i === idx ? { ...b, ...patch } : b)),
    }))
  }
  const addBullet = () => {
    setConfig((prev) => ({
      ...prev,
      bullets: [...prev.bullets, { text: '新弹幕', color: '#ffffff', font_size: 48, speed: 200 }],
    }))
  }
  const removeBullet = (idx: number) => {
    setConfig((prev) => ({
      ...prev,
      bullets: prev.bullets.filter((_, i) => i !== idx),
    }))
  }

  const handleStart = async () => {
    setBusy(true)
    setStatusMsg('')
    // 若已在运行，先停掉旧的再启动新配置（保证按钮始终是"启动"语义、且每次都能应用最新配置）
    if (running) {
      try { await screensaverApi.stop() } catch {}
    }
    const res = await screensaverApi.start(config as unknown as Record<string, unknown>)
    setBusy(false)
    if (res.success) {
      setRunning(true)
      setStatusMsg(`已启动 (PID: ${(res.data as any)?.pid ?? '-'}). 按 ${config.exit_hotkey} 或双击屏幕退出。`)
    } else {
      setStatusMsg(`启动失败：${res.error || '未知错误'}`)
    }
  }

  const handleReset = () => {
    setConfig({ ...DEFAULT_CONFIG })
    setStatusMsg('已重置为默认配置')
  }


  // 缩放系数：字号 / 描边等"等比缩放"用 Y 轴（与高度对齐）
  const previewScale = previewBox.h > 0 ? previewBox.h / screenSize.h : 1

  // 竖排：与 runner 一致——逐字符换行（不要用 CSS writing-mode，那会把英文/数字一起转向）
  const toVertical = (s: string) => Array.from(s || '').join('\n')
  const renderText = (s: string) => (config.vertical_text ? toVertical(s) : s)
  const zhStrftime = (fmt: string, dt: Date) => {
    const zhWeek = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
    const zhWeekShort = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const zhMonth = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月']
    const ampm = dt.getHours() < 12 ? '上午' : '下午'
    const pad = (n: number, w = 2) => String(n).padStart(w, '0')
    const map: Record<string, string> = {
      '%Y': String(dt.getFullYear()),
      '%y': String(dt.getFullYear()).slice(-2),
      '%m': pad(dt.getMonth() + 1),
      '%d': pad(dt.getDate()),
      '%H': pad(dt.getHours()),
      '%I': pad(((dt.getHours() % 12) || 12)),
      '%M': pad(dt.getMinutes()),
      '%S': pad(dt.getSeconds()),
      '%A': zhWeek[dt.getDay()],
      '%a': zhWeekShort[dt.getDay()],
      '%B': zhMonth[dt.getMonth()],
      '%b': zhMonth[dt.getMonth()],
      '%p': ampm,
      '%%': '%',
    }
    return fmt.replace(/%[YymdHIMSAaBbp%]/g, (s) => map[s] ?? s)
  }
  const renderClock = () => {
    const now = new Date()
    if (config.clock_format) return zhStrftime(config.clock_format, now)
    return zhStrftime('%H:%M:%S', now)
  }
  const renderDate = () => {
    const now = new Date()
    if (config.date_format) return zhStrftime(config.date_format, now)
    return zhStrftime('%Y-%m-%d %A', now)
  }
  const renderCountdown = () => {
    if (!config.countdown_target) return '未设置目标时间'
    const target = new Date(config.countdown_target)
    if (isNaN(target.getTime())) return '目标时间格式错误'
    const sec = Math.max(0, Math.floor((target.getTime() - Date.now()) / 1000))
    if (sec <= 0) return '时间到！'
    const days = Math.floor(sec / 86400)
    const h = Math.floor((sec % 86400) / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    const pad = (n: number) => String(n).padStart(2, '0')
    return days > 0 ? `${days} 天 ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`
  }

  // 把 hex + alpha 合成 rgba 字符串
  const hexToRgba = (hex: string, alpha: number) => {
    let h = (hex || '#000000').trim()
    if (h.startsWith('#')) h = h.slice(1)
    if (h.length === 3) h = h.split('').map((c) => c + c).join('')
    if (h.length !== 6) return `rgba(0,0,0,${alpha})`
    const r = parseInt(h.slice(0, 2), 16)
    const g = parseInt(h.slice(2, 4), 16)
    const b = parseInt(h.slice(4, 6), 16)
    return `rgba(${r},${g},${b},${alpha})`
  }

  const previewStyle: React.CSSProperties = {
    color: config.color,
    fontFamily: config.font_family,
    fontSize: Math.max(6, config.font_size * previewScale),
    fontWeight: config.font_weight,
    fontStyle: config.font_italic ? 'italic' : 'normal',
    WebkitTextStroke: config.outline_color && config.outline_width > 0
      ? `${Math.max(0.5, config.outline_width * previewScale)}px ${config.outline_color}`
      : undefined,
  }
  // 旋转：只作用于文本（与 runner 行为一致：runner 用 GDI lfEscapement 旋转字体）
  const textRotation = config.rotation ? `rotate(${config.rotation}deg)` : ''
  // 背景透明度："整窗透明" 模式（与 runner 行为一致：文字+背景一起半透明）
  // 当用户开了"实时桌面背景"时，单独让背景层带 alpha（这样调透明度才能透出真实桌面）
  const bgLayerStyle: React.CSSProperties = desktopStream
    ? { backgroundColor: hexToRgba(config.background, config.background_alpha) }
    : { backgroundColor: config.background }
  // 整窗 opacity（仅在没启用桌面背景时生效；与 runner LWA_ALPHA 行为一致）
  const wholeWindowOpacity = desktopStream ? 1 : Math.max(0.13, config.background_alpha)

  // 按真实屏幕宽高比构建预览框（保持高度自适应、宽度按比例）
  const previewAspect = `${screenSize.w} / ${screenSize.h}`

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center"
      style={{ zIndex: 2147483646 }}
      onClick={onClose}
    >
      <div
        className="bg-[hsl(var(--card))] rounded-2xl shadow-2xl w-[min(960px,95vw)] max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))] bg-gradient-to-r from-[hsl(var(--brand-50))] to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[hsl(var(--brand-500))]/10 border border-[hsl(var(--brand-500))]/30 shadow-sm">
              <Sparkles className="w-5 h-5 text-[hsl(var(--brand-500))]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[hsl(var(--foreground))]">屏保弹幕</h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                独立窗口全屏覆盖桌面，不受浏览器限制
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        {/* 主体两栏：左配置 / 右预览 */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_320px] gap-0 overflow-hidden">
          {/* 左侧配置 */}
          <div className="overflow-y-auto p-5 space-y-5">
            {/* 内容类型 */}
            <section>
              <Label className="text-sm font-semibold mb-2 block">内容类型</Label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[
                  { v: 'text', label: '静态文本' },
                  { v: 'scroll', label: '滚动文本' },
                  { v: 'clock', label: '实时时钟' },
                  { v: 'date', label: '实时日期' },
                  { v: 'countdown', label: '倒计时' },
                  { v: 'bullet', label: '多条弹幕' },
                ].map((opt) => (
                  <button
                    key={opt.v}
                    onClick={() => update('content_type', opt.v as ScreensaverConfig['content_type'])}
                    className={`px-2 py-2 text-xs rounded-md border transition-all ${
                      config.content_type === opt.v
                        ? 'bg-[hsl(var(--brand-500))] text-white border-[hsl(var(--brand-500))]'
                        : 'bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] border-[hsl(var(--border))]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </section>

            {/* 内容配置（根据类型动态展示） */}
            {(config.content_type === 'text' || config.content_type === 'scroll') && (
              <section className="space-y-2">
                <Label>显示文本</Label>
                <textarea
                  value={config.text}
                  onChange={(e) => update('text', e.target.value)}
                  rows={2}
                  placeholder="输入要显示的内容…"
                  className="w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand-500))]"
                />
              </section>
            )}

            {config.content_type === 'clock' && (
              <section className="space-y-2">
                <Label>时钟时间格式（strftime，留空使用默认 %H:%M:%S）</Label>
                <Input
                  value={config.clock_format}
                  onChange={(e) => update('clock_format', e.target.value)}
                  placeholder="%H:%M:%S"
                />
                <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                  常用：%H:%M:%S（时分秒）、%I:%M %p（12 小时制带上下午）、%H点%M分
                </p>
              </section>
            )}

            {config.content_type === 'date' && (
              <section className="space-y-2">
                <Label>日期时间格式（strftime，留空使用默认 %Y-%m-%d %A）</Label>
                <Input
                  value={config.date_format}
                  onChange={(e) => update('date_format', e.target.value)}
                  placeholder="%Y-%m-%d %A"
                />
                <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                  常用：%Y年%m月%d日 %A、%Y-%m-%d %H:%M:%S（年月日时分秒）、%A（星期名）
                </p>
              </section>
            )}

            {config.content_type === 'countdown' && (
              <section className="space-y-2">
                <Label>倒计时目标时间</Label>
                <DateTimePicker
                  value={config.countdown_target}
                  onChange={(v) => update('countdown_target', v)}
                />
              </section>
            )}

            {config.content_type === 'bullet' && (
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>弹幕列表</Label>
                  <Button size="sm" variant="outline" onClick={addBullet}>＋ 新增弹幕</Button>
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {config.bullets.map((b, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-[hsl(var(--muted))] rounded-md">
                      <Input
                        value={b.text}
                        onChange={(e) => updateBullet(idx, { text: e.target.value })}
                        placeholder="弹幕文本"
                        className="flex-1"
                      />
                      <ColorInput
                        value={b.color || config.color}
                        onChange={(v) => updateBullet(idx, { color: v })}
                        className="w-8 h-8 rounded cursor-pointer"
                      />
                      <Input
                        type="number"
                        value={b.font_size || 48}
                        onChange={(e) => updateBullet(idx, { font_size: Number(e.target.value) || 48 })}
                        className="w-16"
                        title="字号"
                      />
                      <Input
                        type="number"
                        value={b.speed || 200}
                        onChange={(e) => updateBullet(idx, { speed: Number(e.target.value) || 200 })}
                        className="w-20"
                        title="速度"
                      />
                      <Button size="sm" variant="tonal-danger" onClick={() => removeBullet(idx)}>×</Button>
                    </div>
                  ))}
                </div>
              </section>
            )}


            {/* 字体设置 */}
            <section className="space-y-2">
              <Label className="text-sm font-semibold">字体</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">字体族</Label>
                  <Select value={config.font_family} onChange={(e) => update('font_family', e.target.value)}>
                    {FONT_FAMILIES.map((f) => <option key={f} value={f}>{f}</option>)}
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">字号 (px)</Label>
                  <Input
                    type="number"
                    value={config.font_size}
                    onChange={(e) => update('font_size', Number(e.target.value) || 64)}
                    min={12}
                    max={400}
                  />
                </div>
                <div>
                  <Label className="text-xs">字重</Label>
                  <Select value={config.font_weight} onChange={(e) => update('font_weight', e.target.value as any)}>
                    <option value="normal">常规</option>
                    <option value="bold">加粗</option>
                  </Select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={config.font_italic}
                      onCheckedChange={(c) => update('font_italic', c)}
                    />
                    斜体
                  </label>
                </div>
              </div>
            </section>

            {/* 颜色 + 主题 */}
            <section className="space-y-2">
              <Label className="text-sm font-semibold">颜色与主题</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">文字颜色</Label>
                  <ColorInput value={config.color} onChange={(v) => update('color', v)} className="w-full h-9 rounded cursor-pointer border border-[hsl(var(--border))]" />
                </div>
                <div>
                  <Label className="text-xs">背景颜色</Label>
                  <ColorInput value={config.background} onChange={(v) => update('background', v)} className="w-full h-9 rounded cursor-pointer border border-[hsl(var(--border))]" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">背景透明度：{Math.round(config.background_alpha * 100)}%</Label>
                  <Slider
                    min={0.05}
                    max={1}
                    step={0.05}
                    value={[config.background_alpha]}
                    onValueChange={(vals) => update('background_alpha', vals[0])}
                    className="mt-2"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {PRESET_THEMES.map((t, i) => (
                  <button
                    key={t.name}
                    onClick={() => applyTheme(i)}
                    className="px-3 py-1.5 text-xs rounded-md border border-[hsl(var(--border))] hover:border-[hsl(var(--brand-500))] transition-colors"
                    style={{ background: t.background, color: t.color }}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </section>

            {/* 文字描边 / 旋转 */}
            <section className="space-y-2">
              <Label className="text-sm font-semibold">特效</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">描边颜色（留空不描边）</Label>
                  <ColorInput value={config.outline_color || '#000000'} onChange={(v) => update('outline_color', v)} className="w-full h-9 rounded cursor-pointer border border-[hsl(var(--border))]" />
                </div>
                <div>
                  <Label className="text-xs">描边宽度</Label>
                  <Input
                    type="number"
                    value={config.outline_width}
                    onChange={(e) => update('outline_width', Number(e.target.value) || 0)}
                    min={0}
                    max={6}
                  />
                </div>
                <div>
                  <Label className="text-xs">旋转角度</Label>
                  <Select value={String(config.rotation)} onChange={(e) => update('rotation', Number(e.target.value))}>
                    <option value="0">0°</option>
                    <option value="90">90° 竖排</option>
                    <option value="180">180°</option>
                    <option value="270">270° 竖排</option>
                  </Select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={config.vertical_text}
                      onCheckedChange={(c) => update('vertical_text', c)}
                    />
                    竖排文字
                  </label>
                </div>
              </div>
            </section>

            {/* 滚动设置 */}
            {config.content_type === 'scroll' && (
              <section className="space-y-2">
                <Label className="text-sm font-semibold">滚动</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">方向</Label>
                    <Select value={config.scroll_direction} onChange={(e) => update('scroll_direction', e.target.value as any)}>
                      <option value="left">从右往左</option>
                      <option value="right">从左往右</option>
                      <option value="up">从下往上</option>
                      <option value="down">从上往下</option>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">速度（像素/秒）</Label>
                    <Input
                      type="number"
                      value={config.scroll_speed}
                      onChange={(e) => update('scroll_speed', Number(e.target.value) || 200)}
                      min={20}
                      max={2000}
                    />
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <Checkbox
                      checked={config.scroll_loop}
                      onCheckedChange={(c) => update('scroll_loop', c)}
                    />
                    <Label className="text-sm cursor-pointer">循环滚动</Label>
                  </div>
                </div>
              </section>
            )}

            {/* 行为 */}
            <section className="space-y-2">
              <Label className="text-sm font-semibold">行为</Label>
              <div className="space-y-1.5 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={config.fullscreen} onCheckedChange={(c) => update('fullscreen', c)} />
                  全屏覆盖整个桌面
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={config.click_through} onCheckedChange={(c) => update('click_through', c)} />
                  点击穿透到底层（背景会变透明）
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={config.show_close_hint} onCheckedChange={(c) => update('show_close_hint', c)} />
                  显示退出快捷键提示
                </label>
                <div className="flex items-center gap-2">
                  <Label className="text-xs whitespace-nowrap">退出快捷键</Label>
                  <Select value={config.exit_hotkey} onChange={(e) => update('exit_hotkey', e.target.value)} className="flex-1">
                    <option value="Escape">Esc</option>
                    <option value="F12">F12</option>
                    <option value="space">空格</option>
                  </Select>
                </div>
              </div>
            </section>
          </div>

          {/* 右侧实时预览 */}
          <div className="border-l border-[hsl(var(--border))] bg-[hsl(var(--muted))] p-4 flex flex-col gap-3 overflow-y-auto">
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold block">预览（按屏幕真实比例）</Label>
              <div className="text-[11px] text-[hsl(var(--muted-foreground))]">
                逻辑像素 {screenSize.w}×{screenSize.h}
                {screenSize.dpr !== 1 && (
                  <> · 物理像素 {Math.round(screenSize.w * screenSize.dpr)}×{Math.round(screenSize.h * screenSize.dpr)}（DPI 缩放 {Math.round(screenSize.dpr * 100)}%）</>
                )}
              </div>
            </div>
            <div
              ref={previewBoxRef}
              className="rounded-lg shadow-inner relative overflow-hidden mx-auto w-full"
              style={{ aspectRatio: previewAspect, opacity: wholeWindowOpacity }}
            >
              {/* 底层：桌面实时画面（如启用） */}
              <video
                ref={desktopVideoRef}
                autoPlay
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
                style={{ display: desktopStream ? 'block' : 'none' }}
              />
              {/* 背景层：纯色 + alpha；放在视频上面、文字下面 */}
              <div className="absolute inset-0" style={bgLayerStyle} />
              {/* 文本层 */}
              {config.content_type === 'scroll' ? (
                <span
                  ref={scrollTextRef}
                  className={config.vertical_text ? '' : 'whitespace-nowrap'}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    // transform 由 effect 通过 ref 直接修改（60fps 丝滑）；初值放到容器外避免首帧闪烁
                    transform: 'translate3d(-99999px, 0, 0)',
                    willChange: 'transform',
                    color: previewStyle.color,
                    fontFamily: previewStyle.fontFamily,
                    fontSize: previewStyle.fontSize,
                    fontWeight: previewStyle.fontWeight,
                    fontStyle: previewStyle.fontStyle,
                    WebkitTextStroke: previewStyle.WebkitTextStroke,
                    whiteSpace: config.vertical_text ? 'pre-line' : 'nowrap',
                    textAlign: 'center',
                    lineHeight: 1.05,
                  } as React.CSSProperties}
                >
                  {renderText(config.text || 'WebRPA →')}
                </span>
              ) : config.content_type === 'bullet' ? (
                <BulletPreview
                  bullets={config.bullets}
                  previewW={previewBox.w}
                  previewH={previewBox.h}
                  fallbackColor={config.color}
                  fallbackFontSize={config.font_size}
                  fontFamily={config.font_family}
                  previewScale={previewScale}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center px-3 text-center">
                  <span
                    className="break-words leading-tight"
                    style={{
                      maxWidth: '90%',
                      color: previewStyle.color,
                      fontFamily: previewStyle.fontFamily,
                      fontSize: previewStyle.fontSize,
                      fontWeight: previewStyle.fontWeight,
                      fontStyle: previewStyle.fontStyle,
                      WebkitTextStroke: previewStyle.WebkitTextStroke,
                      whiteSpace: config.vertical_text ? 'pre-line' : undefined,
                      lineHeight: 1.05,
                      transform: textRotation || undefined,
                      transformOrigin: 'center',
                      display: 'inline-block',
                    } as React.CSSProperties}
                  >
                    {config.content_type === 'text' && renderText(config.text || 'WebRPA')}
                    {config.content_type === 'clock' && renderText(renderClock())}
                    {config.content_type === 'date' && renderText(renderDate())}
                    {config.content_type === 'countdown' && renderText(renderCountdown())}
                  </span>
                </div>
              )}
            </div>

            {/* 桌面实时背景控制 */}
            <div className="flex items-center gap-2 -mt-1">
              {!desktopStream ? (
                <Button size="sm" variant="outline" onClick={enableDesktopBg} disabled={desktopLoading} className="text-xs">
                  {desktopLoading ? '请求中…' : '使用桌面实时背景'}
                </Button>
              ) : (
                <Button size="sm" variant="tonal-danger" onClick={disableDesktopBg} className="text-xs">
                  关闭桌面背景
                </Button>
              )}
              <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                浏览器会弹出"选择共享窗口"，选"整个屏幕"
              </span>
            </div>
            {desktopError && (
              <div className="text-[11px] text-[hsl(var(--danger-600))]">{desktopError}</div>
            )}

            {statusMsg && (
              <div className="text-xs px-3 py-2 rounded-md bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
                {statusMsg}
              </div>
            )}

            <div className="flex flex-col gap-2 mt-auto">
              <Button onClick={handleStart} disabled={busy} className="bg-[hsl(var(--brand-500))] text-white hover:bg-[hsl(var(--brand-600))]">
                <Play className="w-4 h-4 mr-2" />
                {running ? '应用并重启屏保' : '启动屏保'}
              </Button>
              <Button variant="outline" onClick={handleReset} disabled={busy}>重置默认</Button>
            </div>

            <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed">
              提示：屏保由独立 Python 进程显示，会覆盖整个屏幕。按所选快捷键或双击屏幕中央可立即退出。
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
