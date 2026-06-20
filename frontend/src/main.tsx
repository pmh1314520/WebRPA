import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { installGlobalTooltip } from './lib/globalTooltip'

// 安装全局 tooltip 拦截：把所有 title 属性自动转成 WebRPA 主题浮窗
installGlobalTooltip()

// 抑制 "ResizeObserver loop completed with undelivered notifications" 这条无害警告。
// 拖拽左右面板宽度时，浏览器 ResizeObserver 会在一帧内多次回调而抛出该提示，
// 它不影响功能，但会刷控制台并弹出 Vite 错误遮罩。这里只针对这一条做拦截。
const RESIZE_OBSERVER_MSG = 'ResizeObserver loop'
window.addEventListener('error', (e) => {
  if (e.message && e.message.includes(RESIZE_OBSERVER_MSG)) {
    e.stopImmediatePropagation()
    e.preventDefault()
  }
})
window.addEventListener('unhandledrejection', (e) => {
  const msg = (e.reason && (e.reason.message || String(e.reason))) || ''
  if (typeof msg === 'string' && msg.includes(RESIZE_OBSERVER_MSG)) {
    e.preventDefault()
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
