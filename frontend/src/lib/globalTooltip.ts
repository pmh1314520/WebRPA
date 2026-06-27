/**
 * WebRPA 全局 Tooltip 拦截器
 *
 * 设计目标：把整个 WebRPA 编辑器中所有 HTML 元素的 `title` 属性自动搬走,
 * 由本模块用统一的 WebRPA 主题浮窗渲染,彻底消除浏览器原生 tooltip 的
 * 灰色丑陋方框。
 *
 * 实现原理：
 * 1. 单例 DOM 节点,挂在 document.body 末尾
 * 2. MutationObserver 监听全局 title 属性变化,每次出现 title:
 *    - 备份到 data-tip,移除原 title(浏览器看不到 title 就不会渲染原生 tooltip)
 *    - 委托事件代理:body 上一个 mouseover/mouseout 监听器接管所有 hover
 * 3. 智能定位:优先放在元素正上方,空间不够则切到下方,左右贴边自动收回
 * 4. 主题:与 launcher 中浮窗保持一致的 QQ 蓝渐变 + 弹簧入场动画
 *
 * 性能:全程事件代理 + 单例 DOM,即使页面有几千个带 title 的元素也不增加节点数
 */

let tipEl: HTMLDivElement | null = null
let arrowEl: HTMLDivElement | null = null
let textNode: Text | null = null
let showTimer: number | null = null
let installed = false

function ensureTipEl(): HTMLDivElement {
  if (tipEl) return tipEl
  tipEl = document.createElement('div')
  tipEl.className = 'webrpa-global-tooltip'
  tipEl.setAttribute('role', 'tooltip')
  tipEl.setAttribute('aria-hidden', 'true')
  tipEl.style.cssText = [
    'position:fixed',
    'z-index:2147483647',
    'pointer-events:none',
    'opacity:0',
    'transform:translate(-50%, 4px) scale(0.96)',
    'transition:opacity 140ms ease, transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1)',
    'padding:5px 9px',
    'border-radius:6px',
    'font-size:11.5px',
    'font-weight:500',
    'line-height:1.5',
    'letter-spacing:0.2px',
    // 关键：width:max-content 让浮窗按内容自适应宽度（短文本单行显示，
    // 长文本到 max-width 才换行），彻底避免被挤成「一字一行」；
    // max-width 同时受视口约束，保证再长也不会超出屏幕
    'width:max-content',
    'max-width:min(360px, calc(100vw - 24px))',
    'white-space:normal',
    'overflow-wrap:break-word',
    'word-break:normal',
    'text-align:center',
    'color:#fff',
    'background:linear-gradient(135deg, #12b7f5 0%, #2086e8 50%, #1a4fc4 100%)',
    'box-shadow:0 4px 14px rgba(18,183,245,0.32),0 8px 24px rgba(26,79,196,0.18),0 1px 0 rgba(255,255,255,0.18) inset',
    'user-select:none',
    'font-family:inherit',
  ].join(';')

  textNode = document.createTextNode('')
  tipEl.appendChild(textNode)

  arrowEl = document.createElement('div')
  arrowEl.style.cssText = [
    'position:absolute',
    'left:50%',
    'transform:translateX(-50%)',
    'width:0',
    'height:0',
    'border-left:5px solid transparent',
    'border-right:5px solid transparent',
  ].join(';')
  tipEl.appendChild(arrowEl)

  document.body.appendChild(tipEl)
  return tipEl
}

function show(target: Element, text: string) {
  const el = ensureTipEl()
  // 始终把浮窗移到 body 末尾：当页面上存在同为最高层级（z-index 2147483647）的
  // 弹窗/灯箱/下拉浮层时，纯靠 z-index 无法再分高下，此时由 DOM 顺序决定层叠，
  // 让 tooltip 永远是最后插入的节点，确保它始终显示在最上层，不会被弹窗盖住。
  if (el.parentElement !== document.body || el !== document.body.lastElementChild) {
    document.body.appendChild(el)
  }
  if (textNode) textNode.nodeValue = text

  // 隐藏测量
  el.style.opacity = '0'
  el.style.left = '-9999px'
  el.style.top = '-9999px'
  el.style.display = 'block'

  const rect = (target as HTMLElement).getBoundingClientRect()
  const tw = el.offsetWidth
  const th = el.offsetHeight

  // 默认放上方
  let top = rect.top - th - 8
  let placement: 'top' | 'bottom' = 'top'
  if (top < 4) {
    top = rect.bottom + 8
    placement = 'bottom'
  }
  // 垂直夹取：保证浮窗完全在可视区内（解决靠下/超长浮窗跑到屏幕外看不全）
  const maxTop = window.innerHeight - th - 6
  if (top > maxTop) top = Math.max(6, maxTop)
  if (top < 6) top = 6
  let left = rect.left + rect.width / 2

  // 边界回收（保证 5px 安全间距）
  const minLeft = tw / 2 + 6
  const maxLeft = window.innerWidth - tw / 2 - 6
  const clampedLeft = Math.max(minLeft, Math.min(maxLeft, left))
  // 计算箭头偏移（如果浮窗被边界推偏，箭头要指回原元素中心）
  const arrowOffset = left - clampedLeft

  el.style.left = clampedLeft + 'px'
  el.style.top = top + 'px'

  if (arrowEl) {
    if (placement === 'top') {
      arrowEl.style.top = '100%'
      arrowEl.style.bottom = ''
      arrowEl.style.borderTop = '5px solid #1a4fc4'
      arrowEl.style.borderBottom = ''
    } else {
      arrowEl.style.bottom = '100%'
      arrowEl.style.top = ''
      arrowEl.style.borderBottom = '5px solid #12b7f5'
      arrowEl.style.borderTop = ''
    }
    arrowEl.style.left = `calc(50% + ${arrowOffset}px)`
  }

  requestAnimationFrame(() => {
    el.style.opacity = '1'
    el.style.transform = 'translate(-50%, 0) scale(1)'
  })
}

function hide() {
  if (!tipEl) return
  tipEl.style.opacity = '0'
  tipEl.style.transform = 'translate(-50%, 4px) scale(0.96)'
}

// 把元素的 title 搬到 data-tip，避免原生 tooltip
function migrateTitle(el: Element) {
  if (el.nodeType !== 1) return
  const html = el as HTMLElement
  if (html.hasAttribute('title')) {
    const t = html.getAttribute('title')
    if (t != null && t !== '') {
      html.setAttribute('data-tip', t)
    }
    html.removeAttribute('title')
  }
}

// 找到鼠标所在元素中第一个有 data-tip 的祖先
function findTipTarget(start: EventTarget | null): { el: Element; text: string } | null {
  let cur: Element | null = start as Element | null
  while (cur && cur !== document.body) {
    if (cur.nodeType === 1) {
      const t = (cur as HTMLElement).getAttribute('data-tip')
      if (t) return { el: cur, text: t }
    }
    cur = cur.parentElement
  }
  return null
}

function onMouseOver(e: MouseEvent) {
  const found = findTipTarget(e.target)
  if (!found) return
  if (showTimer) clearTimeout(showTimer)
  // 有一点延迟，避免快速划过时频繁闪
  showTimer = window.setTimeout(() => show(found.el, found.text), 120)
}

function onMouseOut(e: MouseEvent) {
  // mouseout 频繁触发，只有真的离开了 tip 目标元素才隐藏
  const from = findTipTarget(e.target)
  const to = findTipTarget(e.relatedTarget)
  if (from && to && from.el === to.el) return
  if (showTimer) { clearTimeout(showTimer); showTimer = null }
  hide()
}

function onScrollOrResize() {
  hide()
}

/**
 * 安装全局 tooltip 拦截
 * 应用启动时调用一次
 */
export function installGlobalTooltip() {
  if (installed) return
  installed = true

  // 1. 处理已存在的 title
  document.querySelectorAll('[title]').forEach(migrateTitle)

  // 2. 监听后续 DOM 变化（新增节点 / title 属性变化）
  const mo = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === 'attributes' && m.attributeName === 'title') {
        migrateTitle(m.target as Element)
      } else if (m.type === 'childList') {
        m.addedNodes.forEach((n) => {
          if (n.nodeType !== 1) return
          const el = n as Element
          if (el.hasAttribute('title')) migrateTitle(el)
          el.querySelectorAll && el.querySelectorAll('[title]').forEach(migrateTitle)
        })
      }
    }
  })
  mo.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['title'],
  })

  // 3. 事件代理（捕获阶段，确保 React 合成事件不会拦截）
  document.body.addEventListener('mouseover', onMouseOver, true)
  document.body.addEventListener('mouseout', onMouseOut, true)
  // 滚动 / 窗口尺寸变了 → 立刻隐藏（避免位置错位）
  window.addEventListener('scroll', onScrollOrResize, true)
  window.addEventListener('resize', onScrollOrResize)
}
