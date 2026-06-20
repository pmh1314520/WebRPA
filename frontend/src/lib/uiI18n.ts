/* ============================================================
   WebRPA 编辑器界面国际化（中/英）运行时翻译层
   - 首次按系统语言自动选择；用户切换后记忆
   - 通过文本节点字典翻译 + 防抖 MutationObserver 覆盖 React 重渲染
   - 跳过 React Flow 画布（用户节点/数据），只翻译界面 chrome
   说明：这是渐进式 i18n 层，字典覆盖高频界面文案；未覆盖的保持中文。
   ============================================================ */
import { UI_DICT } from './uiI18nDict'

const LS_KEY = 'webrpa.editor.lang'
const origMap = new WeakMap<Text, string>()
let curLang: 'zh' | 'en' = 'zh'
let observer: MutationObserver | null = null
let pending = false

export function detectLang(): 'zh' | 'en' {
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

function shouldSkip(el: Element | null): boolean {
  if (!el) return true
  // 跳过画布（用户节点/连线/数据）、代码编辑器、输入控件
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
  if (!origMap.has(node)) origMap.set(node, node.nodeValue)
  const zh = origMap.get(node) as string
  const key = zh.trim()
  if (curLang === 'en') {
    const en = UI_DICT[key]
    if (en !== undefined) node.nodeValue = zh.replace(key, en)
  } else {
    node.nodeValue = zh
  }
}

function walk(root: Node) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let n: Node | null
  while ((n = walker.nextNode())) translateTextNode(n as Text)
}

function scheduleWalk() {
  if (pending) return
  pending = true
  requestAnimationFrame(() => {
    pending = false
    if (curLang === 'en') walk(document.body)
  })
}

function apply() {
  walk(document.body)
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

function injectToggle() {
  if (document.getElementById('langToggleBtn')) return
  const btn = document.createElement('button')
  btn.id = 'langToggleBtn'
  btn.type = 'button'
  btn.textContent = curLang === 'en' ? '中文' : 'EN'
  btn.title = 'Switch language / 切换语言'
  btn.style.cssText = [
    'position:fixed', 'top:8px', 'right:10px', 'z-index:2147483600',
    'height:26px', 'min-width:42px', 'padding:0 10px', 'border-radius:7px',
    'font-size:12px', 'font-weight:700', 'cursor:pointer',
    'color:#fff', 'border:none',
    'background:linear-gradient(135deg,#3b82f6,#2563eb)',
    'box-shadow:0 2px 8px rgba(37,99,235,.35)',
  ].join(';')
  btn.addEventListener('click', toggleLang)
  document.body.appendChild(btn)
}

export function setupEditorI18n() {
  curLang = detectLang()
  const start = () => {
    injectToggle()
    apply()
    observer = new MutationObserver(() => scheduleWalk())
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })
  }
  setTimeout(start, 200)
}
