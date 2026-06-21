/* ============================================================
   小助手「独立原生窗口（系统级 Agent）」前端侧控制
   贴边自动隐藏/唤出已改由启动器 Rust 端用全局光标实现（更可靠），
   这里只保留：运行环境探测 + 置顶/最小化/关闭/拖动 等窗口控制。
   全部 best-effort：任一调用失败都不影响小助手本体。
   ============================================================ */

export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && (('__TAURI_INTERNALS__' in window) || ('__TAURI__' in window))
}

// 贴边隐藏现由 Rust 端负责；此函数保留以兼容调用方，仅做环境探测。
export async function setupAgentWindowBehaviors(): Promise<void> {
  // no-op（贴边自动隐藏/唤出在启动器 Rust 端实现）
}

async function _win(): Promise<any | null> {
  if (!isTauriRuntime()) return null
  try {
    const mod: any = await import('@tauri-apps/api/window')
    return (mod.getCurrentWindow ? mod.getCurrentWindow() : mod.appWindow) || null
  } catch { return null }
}

export async function agentSetAlwaysOnTop(on: boolean): Promise<void> {
  const w = await _win(); if (!w) return
  try { await w.setAlwaysOnTop(on) } catch { /* ignore */ }
}
export async function agentMinimize(): Promise<void> {
  const w = await _win(); if (!w) return
  try { await w.minimize() } catch { /* ignore */ }
}
export async function agentClose(): Promise<void> {
  const w = await _win(); if (!w) return
  try { await w.close() } catch { /* ignore */ }
}
export async function agentStartDragging(): Promise<void> {
  const w = await _win(); if (!w) return
  try { await w.startDragging() } catch { /* ignore */ }
}
