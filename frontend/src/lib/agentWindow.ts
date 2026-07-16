/* ============================================================
   小助手「独立原生窗口（系统级 Agent）」前端侧控制
   Agent 窗口由启动器（Electron）创建并注入 window.webrpaAgent 桥；
   贴边自动隐藏/唤出由启动器主进程用全局光标实现（更可靠），
   这里只保留：运行环境探测 + 置顶/最小化/关闭 等窗口控制。
   全部 best-effort：任一调用失败都不影响小助手本体。
   拖动由 CSS -webkit-app-region: drag（data-agent-drag-region）实现，无需 JS。
   ============================================================ */

interface WebrpaAgentBridge {
  isAgentWindow?: boolean
  setAlwaysOnTop?: (on: boolean) => void
  minimize?: () => void
  close?: () => void
}

function _bridge(): WebrpaAgentBridge | null {
  if (typeof window === 'undefined') return null
  const b = (window as unknown as { webrpaAgent?: WebrpaAgentBridge }).webrpaAgent
  return b && b.isAgentWindow ? b : null
}

// 是否运行在启动器创建的独立 Agent 原生窗口中
export function isAgentWindow(): boolean {
  return _bridge() !== null
}

// 兼容旧调用方：贴边隐藏/唤出在启动器主进程实现，这里为空操作。
export async function setupAgentWindowBehaviors(): Promise<void> {
  // no-op（贴边自动隐藏/唤出在启动器主进程实现）
}

export async function agentSetAlwaysOnTop(on: boolean): Promise<void> {
  const b = _bridge(); if (!b || !b.setAlwaysOnTop) return
  try { b.setAlwaysOnTop(on) } catch { /* ignore */ }
}

export async function agentMinimize(): Promise<void> {
  const b = _bridge(); if (!b || !b.minimize) return
  try { b.minimize() } catch { /* ignore */ }
}

export async function agentClose(): Promise<void> {
  const b = _bridge(); if (!b || !b.close) return
  try { b.close() } catch { /* ignore */ }
}
