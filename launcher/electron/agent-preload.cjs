// WebRPA 启动器 - 独立小助手 Agent 窗口预加载脚本
// Agent 窗口加载的是前端应用（http://localhost:port/?view=assistant），
// 这里通过 contextBridge 注入 window.webrpaAgent，供前端进行置顶/最小化/关闭控制。
// 拖动由前端标题栏的 CSS -webkit-app-region: drag 实现，无需 JS。
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('webrpaAgent', {
  isAgentWindow: true,
  setAlwaysOnTop: (on) => ipcRenderer.send('agent:setAlwaysOnTop', !!on),
  minimize: () => ipcRenderer.send('agent:minimize'),
  close: () => ipcRenderer.send('agent:close'),
})
