/* ============================================================
   小助手「独立原生窗口（系统级 Agent）」增强
   仅在 Tauri 原生窗口中启用：置顶、最小化/关闭、QQ 式贴边自动隐藏。
   全部 best-effort：任一 Tauri API 失败都不影响小助手本体功能（退化为普通窗口）。
   ============================================================ */

export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && (('__TAURI_INTERNALS__' in window) || ('__TAURI__' in window))
}

let _started = false

export async function setupAgentWindowBehaviors(): Promise<void> {
  if (!isTauriRuntime() || _started) return
  _started = true
  try {
    const mod: any = await import('@tauri-apps/api/window')
    const getCurrentWindow = mod.getCurrentWindow || (() => mod.appWindow)
    const currentMonitor = mod.currentMonitor
    const PhysicalPosition = mod.PhysicalPosition
    const appWindow = getCurrentWindow()

    const PEEK = 4               // 隐藏时露出的像素宽度
    const EDGE_THRESHOLD = 22    // 距屏幕边多近算"贴边"
    const HIDE_DELAY = 450       // 鼠标离开后多久收起
    let dockedEdge: 'left' | 'right' | 'top' | null = null
    let hidden = false
    let animating = false
    let pointerInside = true
    let hideTimer: any = null
    let lastMoveCalc = 0

    async function geom() {
      const monP = currentMonitor ? currentMonitor() : Promise.resolve(null)
      const [mon, pos, size] = await Promise.all([monP, appWindow.outerPosition(), appWindow.outerSize()])
      return { mon, pos, size }
    }

    function detectEdge(mon: any, pos: any, size: any): 'left' | 'right' | 'top' | null {
      if (!mon) return null
      const mx = mon.position.x, my = mon.position.y, mw = mon.size.width
      if (pos.x <= mx + EDGE_THRESHOLD) return 'left'
      if (pos.x + size.width >= mx + mw - EDGE_THRESHOLD) return 'right'
      if (pos.y <= my + EDGE_THRESHOLD) return 'top'
      return null
    }

    async function animateTo(tx: number, ty: number) {
      animating = true
      try {
        const start = await appWindow.outerPosition()
        const steps = 9
        for (let i = 1; i <= steps; i++) {
          const x = Math.round(start.x + (tx - start.x) * (i / steps))
          const y = Math.round(start.y + (ty - start.y) * (i / steps))
          await appWindow.setPosition(new PhysicalPosition(x, y))
          await new Promise((r) => setTimeout(r, 11))
        }
        await appWindow.setPosition(new PhysicalPosition(Math.round(tx), Math.round(ty)))
      } catch { /* ignore */ }
      animating = false
    }

    async function hideToEdge() {
      if (!dockedEdge || hidden || pointerInside || animating) return
      const { mon, pos, size } = await geom()
      if (!mon) return
      const mx = mon.position.x, my = mon.position.y, mw = mon.size.width
      if (dockedEdge === 'left') await animateTo(mx - (size.width - PEEK), pos.y)
      else if (dockedEdge === 'right') await animateTo(mx + mw - PEEK, pos.y)
      else if (dockedEdge === 'top') await animateTo(pos.x, my - (size.height - PEEK))
      hidden = true
    }

    async function showFromEdge() {
      if (!dockedEdge || !hidden || animating) return
      const { mon, pos, size } = await geom()
      if (!mon) return
      const mx = mon.position.x, my = mon.position.y, mw = mon.size.width
      if (dockedEdge === 'left') await animateTo(mx, pos.y)
      else if (dockedEdge === 'right') await animateTo(mx + mw - size.width, pos.y)
      else if (dockedEdge === 'top') await animateTo(pos.x, my)
      hidden = false
    }

    // 拖动 → 重算贴边（节流）
    try {
      await appWindow.onMoved(async () => {
        if (animating) return
        const now = Date.now()
        if (now - lastMoveCalc < 120) return
        lastMoveCalc = now
        try {
          const { mon, pos, size } = await geom()
          dockedEdge = detectEdge(mon, pos, size)
        } catch { /* ignore */ }
      })
    } catch { /* ignore */ }

    // 鼠标进出窗口 → 展开 / 收起
    const onEnter = () => {
      pointerInside = true
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null }
      if (hidden) showFromEdge()
    }
    const onLeave = () => {
      pointerInside = false
      if (hideTimer) clearTimeout(hideTimer)
      hideTimer = setTimeout(() => { if (!pointerInside) hideToEdge() }, HIDE_DELAY)
    }
    document.addEventListener('mouseenter', onEnter)
    document.addEventListener('mousemove', onEnter, { passive: true })
    document.addEventListener('mouseleave', onLeave)
    window.addEventListener('blur', onLeave)

    // 初始贴边判断
    try { const { mon, pos, size } = await geom(); dockedEdge = detectEdge(mon, pos, size) } catch { /* ignore */ }
  } catch (e) {
    // Tauri 窗口 API 不可用 → 退化为普通窗口，不影响小助手
    console.warn('[AgentWindow] 原生窗口增强初始化失败（已退化为普通窗口）:', e)
  }
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
