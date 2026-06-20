/* ============================================================
   WebRPA 启动器国际化（中/英）
   首次启动按系统/浏览器语言自动选择；用户手动切换后记忆。
   采用运行时文本节点翻译 + MutationObserver，无需重写模板。
   ============================================================ */

// zh 原文 → en 译文（键需与渲染后可见文本 trim 一致）
const DICT = {
  '控制中心': 'Control Center',
  '网页机器人流程自动化平台': 'Web Robotic Process Automation Platform',
  '最小化': 'Minimize', '最小化到托盘': 'Minimize to tray', '关闭': 'Close',
  '检查更新': 'Check updates', '检查中…': 'Checking…', '设置': 'Settings', '支持作者': 'Support author',
  '全部就绪': 'All ready', '部分运行': 'Partially running', '未启动': 'Not started',
  '启动中': 'Starting', '停止中': 'Stopping',
  '后端和前端服务均已运行': 'Both backend and frontend are running',
  '正在停止后端与前端服务，请稍候…': 'Stopping backend and frontend services…',
  '正在启动后端与前端服务，请稍候…': 'Starting backend and frontend services…',
  '前端已就绪，后端正在启动中（首次启动较慢，请耐心等待）': 'Frontend ready; backend starting (first start is slow, please wait)',
  '后端已就绪，前端正在启动中…': 'Backend ready; frontend starting…',
  '前端服务尚未运行': 'Frontend not running yet',
  '后端服务尚未运行': 'Backend not running yet',
  '点击下方按钮启动 WebRPA': 'Click the button below to start WebRPA',
  '本地运行': 'Runs locally', '免费 · 开源 · 无广告': 'Free · Open source · No ads',
  '一键启动你的': 'One-click start your ', '自动化工作站': 'automation workstation',
  '点击启动后将自动拉起后端 API 服务和前端 Web 编辑器，并在浏览器中打开': 'Starts the backend API and the front-end web editor, then opens it in your browser',
  '启动 WebRPA': 'Start WebRPA', '启动中…': 'Starting…',
  '打开 WebRPA 编辑器': 'Open WebRPA Editor', '停止': 'Stop', '停止中…': 'Stopping…',
  '后端 API 服务': 'Backend API', '前端 Web 编辑器': 'Frontend Web Editor',
  '运行中': 'Running', '查看日志': 'View logs',
  '数据安全': 'Data security',
  'API Key、密码、Token 等敏感配置仅保存在浏览器本地': 'API keys, passwords and tokens are stored only in your local browser',
  '默认端口': 'Default ports',
  '后端 5241、前端 5921；可通过设置修改实现多开': 'Backend 5241, Frontend 5921; change in settings to run multiple instances',
  '独立开发 · 为爱发电': 'Indie dev · For the love of it',
  '如果它帮到了你，欢迎扫码请作者喝杯咖啡 ☕': 'If it helped you, scan to buy the author a coffee'
}

Object.assign(DICT, {
  '启动器设置': 'Launcher Settings', '服务监听地址和端口': 'Service host and port',
  '后端服务': 'Backend service', '前端服务': 'Frontend service',
  '监听地址': 'Host', '端口号': 'Port',
  '127.0.0.1（仅本机）': '127.0.0.1 (local only)', '0.0.0.0（允许局域网访问）': '0.0.0.0 (allow LAN access)',
  '极速启动模式': 'Fast-start mode',
  '静态托管已构建的前端（秒级启动）。修改前端代码后需重新构建才生效；开发调试请关闭此项': 'Serve the prebuilt frontend statically (instant start). Rebuild after editing frontend code; turn off for development.',
  '启动器偏好': 'Launcher preferences',
  '开机自启动': 'Start on boot',
  '开机登录 Windows 后自动启动 WebRPA 启动器（可配合下方"自动启动服务"实现开机即用）': 'Auto-launch the WebRPA launcher after Windows login (combine with auto-start services below for ready-on-boot).',
  '自动启动前后端服务': 'Auto-start services',
  '打开启动器后立即拉起 API 与编辑器，无需点击启动按钮': 'Bring up the API and editor right after opening the launcher, no need to click Start.',
  '启动时弹出赞助提示': 'Show sponsor prompt on start',
  '关闭后不再每次启动都弹窗，仍可通过右上角"支持作者"打开': 'When off, no popup on each start; still available via "Support author" in the top-right.',
  '修改端口后需要重启服务才能生效': 'Changing ports requires restarting services to take effect',
  '端口需在 1024-65535 且前后端不同，未保存': 'Ports must be 1024-65535 and differ between backend/frontend; not saved',
  '正在关闭 WebRPA 启动器': 'Closing WebRPA launcher',
  '正在关闭后端与前端服务…': 'Stopping backend and frontend services…',
  '服务已停止，正在退出启动器…': 'Services stopped, exiting launcher…',
  '正在退出启动器…': 'Exiting launcher…',
  '外包开发': 'Hire dev', '外包开发 · 找作者接需求': 'Hire the author for development',
  '发现新版本': 'New version available', '立即更新': 'Update now', '加速下载': 'Mirror download',
  'GitHub 仓库': 'GitHub repo', 'B站主页': 'Bilibili', '支持作者': 'Support author',
  '当前已是最新版本': 'You are on the latest version'
})

if (typeof window !== 'undefined') window.__WEBRPA_LAUNCHER_DICT = DICT

// ===== 运行时翻译引擎 =====
const LS_KEY = 'webrpa.launcher.lang'
const origMap = new WeakMap()
let curLang = 'zh'
let observer = null

function detectLang() {
  try {
    const saved = localStorage.getItem(LS_KEY)
    if (saved === 'zh' || saved === 'en') return saved
  } catch (e) {}
  const nav = (navigator.language || 'zh').toLowerCase()
  return nav.indexOf('zh') === 0 ? 'zh' : 'en'
}

function translateNode(node) {
  const p = node.parentElement
  if (!p) return
  const tag = p.tagName
  if (tag === 'SCRIPT' || tag === 'STYLE') return
  if (p.id === 'langToggle') return
  if (!node.nodeValue || !node.nodeValue.trim()) return
  if (!origMap.has(node)) origMap.set(node, node.nodeValue)
  const zh = origMap.get(node)
  const key = zh.trim()
  if (curLang === 'en') {
    if (DICT[key] !== undefined) node.nodeValue = zh.replace(key, DICT[key])
  } else {
    node.nodeValue = zh
  }
}

function walkAndTranslate(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let n
  while ((n = walker.nextNode())) translateNode(n)
}

function applyAll() {
  walkAndTranslate(document.body)
  document.documentElement.lang = curLang === 'en' ? 'en' : 'zh-CN'
  const btn = document.getElementById('langToggle')
  if (btn) btn.textContent = curLang === 'en' ? '中文' : 'EN'
}

function injectToggle() {
  if (document.getElementById('langToggle')) return
  const controls = document.querySelector('.window-controls')
  const btn = document.createElement('button')
  btn.id = 'langToggle'
  btn.className = 'win-btn'
  btn.style.width = 'auto'
  btn.style.padding = '0 8px'
  btn.style.fontSize = '11px'
  btn.style.fontWeight = '700'
  btn.title = 'Switch language / 切换语言'
  btn.textContent = curLang === 'en' ? '中文' : 'EN'
  btn.addEventListener('click', () => {
    curLang = curLang === 'en' ? 'zh' : 'en'
    try { localStorage.setItem(LS_KEY, curLang) } catch (e) {}
    applyAll()
  })
  if (controls) controls.insertBefore(btn, controls.firstChild)
}

export function setupLauncherI18n() {
  curLang = detectLang()
  const start = () => {
    injectToggle()
    applyAll()
    // 监听 Vue 重渲染，新增/变化的文本重新翻译
    observer = new MutationObserver(() => {
      if (curLang === 'en') walkAndTranslate(document.body)
      const btn = document.getElementById('langToggle')
      if (!btn) injectToggle()
    })
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })
  }
  // 等首帧渲染后再执行
  setTimeout(start, 60)
}

export { DICT }
