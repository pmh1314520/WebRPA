// WebRPA 启动器 - Electron 预加载脚本
// 通过 contextBridge 暴露一层安全 API 给渲染进程（Vue 前端），
// 语义对齐原 Tauri 的 invoke / 窗口控制，方便前端最小改动迁移。
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // 调用主进程命令（对应原 Tauri invoke）：返回 {__ok, __data|__error}，由 bridge.js 解包
  invoke: (cmd, args) => ipcRenderer.invoke('launcher:invoke', cmd, args || {}),
  // 窗口控制
  windowHide: () => ipcRenderer.invoke('launcher:window', 'hide'),
  windowClose: () => ipcRenderer.invoke('launcher:window', 'close'),
  windowMinimize: () => ipcRenderer.invoke('launcher:window', 'minimize'),
  windowShow: () => ipcRenderer.invoke('launcher:window', 'show'),
  windowFocus: () => ipcRenderer.invoke('launcher:window', 'focus'),
})
