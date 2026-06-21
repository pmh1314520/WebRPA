/* ============================================================
   WebRPA 编辑器界面国际化（中/英）运行时翻译层（强力版）
   - 首次按系统语言自动选择；用户切换后记忆
   - 文本节点：先整句精确匹配（UI_DICT），未命中再做短语级替换（PHRASES）
     —— 短语级替换可覆盖"日志"等动态拼接文本，尽量做到处处英文
   - 同时翻译 placeholder / title / aria-label 等属性
   - 防抖 MutationObserver 覆盖 React 重渲染；跳过输入框/代码编辑器/画布以保护编辑与性能
   ============================================================ */
import { UI_DICT, PHRASES } from './uiI18nDict'
import { pinyin } from 'pinyin-pro'

const LS_KEY = 'webrpa.editor.lang'
const origText = new WeakMap<Text, string>()
const origAttr = new WeakMap<Element, Record<string, string>>()
let curLang: 'zh' | 'en' = 'zh'
let observer: MutationObserver | null = null
let pending = false

// 短语按长度降序，避免短词先替换破坏长词
const PHRASE_PAIRS: [string, string][] = Object.entries(PHRASES).sort((a, b) => b[0].length - a[0].length)
const ATTRS = ['placeholder', 'title', 'aria-label', 'data-tip', 'alt']
const hasCJK = (s: string) => /[\u4e00-\u9fa5]/.test(s)
// 任意 CJK 字符（含扩展区/兼容区），用于残留兜底判断
const hasAnyCJK = (s: string) => /[\u3400-\u9fff\uf900-\ufaff]/.test(s)

// 最终兜底：把字典/短语翻译后仍残留的中文片段转为拼音（无声调、首字母大写），
// 确保切换英文后界面绝不出现任何中文字符（常见词已由字典译为正式英文，此处只兜底长尾）
function romanizeResidual(s: string): string {
  const out = s.replace(/[\u3400-\u9fff\uf900-\ufaff]+/g, (seg) => {
    try {
      const arr = pinyin(seg, { toneType: 'none', type: 'array' }) as unknown as string[]
      if (!arr || !arr.length) return ''
      return arr.map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : '')).join(' ')
    } catch {
      return ''
    }
  })
  // 终极保险：清除 pinyin-pro 也无法识别的任何残余 CJK 字符
  return out.replace(/[\u3400-\u9fff\uf900-\ufaff]/g, '')
}

export function detectLang(): 'zh' | 'en' {
  // URL ?lang= 优先（Agent 独立窗口由启动器传入，使其语言跟随启动器）
  try {
    const u = new URLSearchParams(window.location.search).get('lang')
    if (u === 'zh' || u === 'en') {
      try { localStorage.setItem(LS_KEY, u) } catch { /* ignore */ }
      return u
    }
  } catch { /* ignore */ }
  try {
    const saved = localStorage.getItem(LS_KEY)
    if (saved === 'zh' || saved === 'en') return saved
  } catch { /* ignore */ }
  const nav = (navigator.language || 'zh').toLowerCase()
  return nav.indexOf('zh') === 0 ? 'zh' : 'en'
}

export function getLang(): 'zh' | 'en' {
  return curLang
}

function translateString(zh: string): string {
  const key = zh.trim()
  // 1) 整句精确匹配
  if (UI_DICT[key] !== undefined) return zh.replace(key, UI_DICT[key])
  // 2) 短语级替换（覆盖动态拼接，如日志）
  if (!hasCJK(zh) && !hasAnyCJK(zh)) return zh
  let out = zh
  for (const [zhP, enP] of PHRASE_PAIRS) {
    if (out.indexOf(zhP) !== -1) out = out.split(zhP).join(enP)
  }
  // 3) 最终拼音兜底：清除一切残留中文字符
  if (hasAnyCJK(out)) out = romanizeResidual(out)
  // 收敛多余空格
  return out.replace(/[ \t]{2,}/g, ' ')
}

function shouldSkip(el: Element | null): boolean {
  if (!el) return true
  return !!el.closest(
    '.react-flow__renderer, .react-flow__viewport, .monaco-editor, input, textarea, [contenteditable="true"], #langToggleBtn'
  )
}

function translateTextNode(node: Text) {
  const p = node.parentElement
  if (shouldSkip(p)) return
  const tag = p?.tagName
  if (tag === 'SCRIPT' || tag === 'STYLE') return
  if (!node.nodeValue || !node.nodeValue.trim()) return
  if (!origText.has(node)) origText.set(node, node.nodeValue)
  const zh = origText.get(node) as string
  const next = curLang === 'en' ? translateString(zh) : zh
  // 仅在变化时写入，避免赋值触发新变更导致 observer 每帧重复翻译（高 CPU/卡顿）
  if (node.nodeValue !== next) node.nodeValue = next
}

function translateAttrs(el: Element) {
  if (shouldSkip(el)) return
  for (const attr of ATTRS) {
    if (!el.hasAttribute(attr)) continue
    const cur = el.getAttribute(attr) || ''
    if (!cur) continue
    let bak = origAttr.get(el)
    if (!bak) { bak = {}; origAttr.set(el, bak) }
    if (bak[attr] === undefined) bak[attr] = cur
    const zh = bak[attr]
    if (!hasCJK(zh) && !hasAnyCJK(zh)) continue
    const next = curLang === 'en' ? translateString(zh) : zh
    if (el.getAttribute(attr) !== next) el.setAttribute(attr, next)
  }
}

function walk(root: Node) {
  // 文本节点
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let n: Node | null
  while ((n = tw.nextNode())) translateTextNode(n as Text)
  // 属性
  if (root instanceof Element || root === document.body) {
    const base = root instanceof Element ? root : document.body
    translateAttrs(base as Element)
    const els = (base as Element).querySelectorAll('[placeholder],[title],[aria-label],[data-tip],[alt]')
    els.forEach((el) => translateAttrs(el))
  }
}

function scheduleWalk() {
  if (pending) return
  pending = true
  requestAnimationFrame(() => {
    pending = false
    if (curLang === 'en') {
      // 翻译期间断开 observer，清空期间产生的变更记录后重连，避免"赋值→变更→再翻译"反复触发
      if (observer) observer.disconnect()
      walk(document.body)
      if (observer) {
        observer.takeRecords()
        observer.observe(document.body, { childList: true, subtree: true, characterData: true })
      }
    }
  })
}

function apply() {
  // 切换时做一次"含画布"的全量翻译（一次性，不影响后续性能）
  walk(document.body)
  // 画布只在显式切换时翻译一次（避免拖拽时持续重翻译造成卡顿）
  if (curLang === 'en') {
    document.querySelectorAll('.react-flow__renderer, .react-flow__viewport').forEach((el) => {
      const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      let n: Node | null
      while ((n = tw.nextNode())) {
        const t = n as Text
        const par = t.parentElement
        if (par && par.closest('input, textarea, [contenteditable="true"]')) continue
        if (!t.nodeValue || !t.nodeValue.trim()) continue
        if (!origText.has(t)) origText.set(t, t.nodeValue)
        t.nodeValue = translateString(origText.get(t) as string)
      }
    })
  } else {
    // 还原画布
    document.querySelectorAll('.react-flow__renderer, .react-flow__viewport').forEach((el) => {
      const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      let n: Node | null
      while ((n = tw.nextNode())) {
        const t = n as Text
        if (origText.has(t)) t.nodeValue = origText.get(t) as string
      }
    })
  }
  document.documentElement.lang = curLang === 'en' ? 'en' : 'zh-CN'
  const btn = document.getElementById('langToggleBtn')
  if (btn) btn.textContent = curLang === 'en' ? '中文' : 'EN'
}

export function setLang(lang: 'zh' | 'en') {
  curLang = lang
  try { localStorage.setItem(LS_KEY, lang) } catch { /* ignore */ }
  apply()
}

export function toggleLang() {
  setLang(curLang === 'en' ? 'zh' : 'en')
}

export function setupEditorI18n() {
  curLang = detectLang()
  const start = () => {
    apply()
    observer = new MutationObserver(() => scheduleWalk())
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })
  }
  setTimeout(start, 200)
}
