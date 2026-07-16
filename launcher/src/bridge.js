// Electron 兼容层：替代原 @tauri-apps/api，向前端暴露与 Tauri 一致的调用方式。
// - invoke(cmd, args)：调用主进程命令，成功返回数据，失败以字符串错误 reject（与原 Tauri 行为一致）。
// - getCurrentWindow()：返回带 hide/close/minimize/show/setFocus 的窗口控制对象。
const api = (typeof window !== 'undefined' && window.electronAPI) || null

export async function invoke(cmd, args) {
  if (!api || !api.invoke) {
    throw new Error('electronAPI 未就绪（preload 未加载）')
  }
  const res = await api.invoke(cmd, args || {})
  // 主进程统一以 {__ok, __data|__error} 返回，这里解包成 resolve/reject
  if (res && typeof res === 'object' && '__ok' in res) {
    if (res.__ok) return res.__data
    throw res.__error
  }
  return res
}

export function getCurrentWindow() {
  return {
    hide: () => api && api.windowHide(),
    close: () => api && api.windowClose(),
    minimize: () => api && api.windowMinimize(),
    show: () => api && api.windowShow(),
    setFocus: () => api && api.windowFocus(),
  }
}
