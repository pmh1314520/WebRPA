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
  '小助手 Agent': 'Assistant Agent', '把小助手作为系统级 Agent 在独立窗口打开': 'Open the assistant as a system-level Agent in a separate window',
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

// 追加：完整覆盖赞助/外包/配置/页脚/状态/提示等所有可见中文
Object.assign(DICT, {
  // 顶部窗口控制 + 更新条
  '最小化到系统托盘': 'Minimize to system tray',
  '· 点击下载查看更新内容': '· Click to download and view changes',
  // 赞助弹窗
  '支持 WebRPA 持续开发': 'Support ongoing WebRPA development',
  '独立学生开发者 · 个人使用完全免费 · 为爱发电': 'Indie student developer · Free for personal use · For the love of it',
  '嗨': 'Hi',
  '，能看到这里说明 WebRPA 已经为你解决了一些问题。': ', if you are reading this, WebRPA has already solved some problems for you.',
  'WebRPA 由独立学生开发者开发并维护，': 'WebRPA is developed and maintained by an indie student developer; ',
  '个人使用完全免费': 'completely free for personal use',
  '，没有任何广告或付费墙。': ', with no ads or paywalls.',
  '如果它真的让你的工作变得轻松了一点点，希望你能请作者喝杯咖啡，让这个项目能继续走下去。': 'If it has made your work even a little easier, please consider buying the author a coffee so this project can keep going.',
  '每一位赞助者的名称（无论金额多少）我都会手动依次添加到下个版本的 README 文档中以表感谢！': 'Every sponsor\u2019s name (regardless of amount) will be manually added to the next version\u2019s README as thanks!',
  '微信': 'WeChat', '支付宝': 'Alipay',
  '您也可以通过"爱发电"平台持续支持 WebRPA 的开发工作': 'You can also support WebRPA development on the "Afdian" platform',
  '备注': 'Note', '联系': 'Contact',
  '赞助时请备注名称，这样能更方便我收录到下个版本的 README 文档中': 'Please leave your name when sponsoring, so I can include it in the next version\u2019s README',
  '若您对 WebRPA 有任何疑问，可以添加开发者的 QQ：2124691573': 'For any questions about WebRPA, add the developer on QQ: 2124691573',
  // 外包弹窗
  '把开发需求交给作者': 'Hire the author for your dev needs',
  '微信小程序 · 网站 · 桌面应用 · 自动化脚本': 'WeChat Mini Program · Website · Desktop App · Automation Script',
  '您有以下开发需求？欢迎把项目交给作者承接，专业全栈开发、价格公道、按时交付：': 'Have any of these needs? Hand your project to the author \u2014 professional full-stack development, fair pricing, on-time delivery:',
  '微信小程序全栈开发': 'WeChat Mini Program full-stack dev',
  '前后端一体，从设计到上线': 'Front-end & back-end, from design to launch',
  '网站全栈开发': 'Website full-stack dev',
  '官网 / 后台 / Web 应用': 'Website / admin / web app',
  'Windows 桌面应用开发': 'Windows desktop app dev',
  '工具软件 / 自动化客户端': 'Utility software / automation client',
  '自动化脚本开发': 'Automation script dev',
  'RPA / 爬虫 / 批处理': 'RPA / crawler / batch',
  '复制': 'Copy', '复制失败，请手动复制': 'Copy failed, please copy manually',
  // 关闭遮罩
  '正在关闭 WebRPA 启动器': 'Closing WebRPA launcher',
  '正在关闭后端与前端服务…': 'Stopping backend and frontend services…',
  '服务已停止，正在退出启动器…': 'Services stopped, exiting launcher…',
  '正在退出启动器…': 'Exiting launcher…',
  // 状态 / 提示
  '所有服务都已在运行': 'All services are already running',
  '后端服务尚未运行': 'Backend service not running yet',
  '前端服务尚未运行': 'Frontend service not running yet',
  '后端和前端服务均已运行': 'Both backend and frontend are running',
  '后端服务': 'Backend service', '前端服务': 'Frontend service',
  '后端 API 服务': 'Backend API service', '前端 Web 编辑器': 'Frontend Web editor',
  '配置已保存': 'Configuration saved',
  '服务已停止': 'Services stopped',
  '当前已是最新版本': 'You are on the latest version',
  '已开启开机自启动': 'Auto-start on boot enabled',
  '已关闭开机自启动': 'Auto-start on boot disabled',
  '读取开机自启动状态失败': 'Failed to read auto-start status',
  '加载配置失败': 'Failed to load configuration',
  '检查服务状态失败': 'Failed to check service status',
  '官网 / 后台 / Web 应用': 'Website / admin / web app',
})

if (typeof window !== 'undefined') window.__WEBRPA_LAUNCHER_DICT = DICT

// 短语级字典：覆盖动态拼接文本/日志（整句未命中时按长度降序逐个替换）
const PHRASES = {
  '正在启动': 'Starting ', '正在停止': 'Stopping ', '正在检查': 'Checking ',
  '正在下载': 'Downloading ', '正在安装': 'Installing ', '正在退出': 'Exiting ',
  '正在连接': 'Connecting ', '正在加载': 'Loading ', '正在保存': 'Saving ',
  '已启动': 'Started ', '已停止': 'Stopped ', '已就绪': 'Ready ', '已退出': 'Exited ',
  '已保存': 'Saved ', '已连接': 'Connected ', '已断开': 'Disconnected ',
  '已完成': 'Done ', '已取消': 'Canceled ', '已更新': 'Updated ',
  '启动成功': 'Started successfully', '启动失败': 'Failed to start',
  '停止成功': 'Stopped successfully', '停止失败': 'Failed to stop',
  '连接成功': 'Connected', '连接失败': 'Connection failed',
  '后端服务': 'Backend service', '前端服务': 'Frontend service',
  '后端': 'Backend', '前端': 'Frontend', '服务': 'service',
  '端口': 'port', '地址': 'host', '日志': 'logs',
  '失败': 'failed', '成功': 'succeeded', '错误': 'error', '警告': 'warning',
  '请稍候': 'please wait', '请重试': 'please retry',
  // 扩充：启动器常见词，兜底覆盖任何遗漏的动态中文
  '启动器': 'launcher', '编辑器': 'editor', '配置': 'config', '设置': 'settings',
  '更新': 'update', '版本': 'version', '下载': 'download', '安装': 'install',
  '作者': 'author', '赞助': 'sponsor', '支持': 'support', '复制': 'copy',
  '打开': 'open', '关闭': 'close', '保存': 'save', '启动': 'start', '停止': 'stop',
  '运行': 'running', '检查': 'check', '退出': 'exit', '重启': 'restart',
  '已': '', '正在': '', '请': 'please ', '了': '', '的': ' ',
  '微信': 'WeChat', '支付宝': 'Alipay', '联系': 'contact', '备注': 'note',
  '免费': 'free', '开源': 'open source', '本地': 'local', '浏览器': 'browser',
}
const PHRASE_PAIRS = Object.entries(PHRASES).sort((a, b) => b[0].length - a[0].length)
const hasCJK = (s) => /[\u4e00-\u9fa5]/.test(s)
const ATTRS = ['placeholder', 'title']

function translateStr(zh) {
  const key = zh.trim()
  if (DICT[key] !== undefined) return zh.replace(key, DICT[key])
  if (!hasCJK(zh)) return zh
  let out = zh
  for (const [zhP, enP] of PHRASE_PAIRS) {
    if (out.indexOf(zhP) !== -1) out = out.split(zhP).join(enP)
  }
  return out.replace(/[ \t]{2,}/g, ' ')
}

// ===== 运行时翻译引擎 =====
const LS_KEY = 'webrpa.launcher.lang'
const origMap = new WeakMap()
const origAttrMap = new WeakMap()
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
  if (p.closest('input, textarea, [contenteditable="true"]')) return
  if (!node.nodeValue || !node.nodeValue.trim()) return
  if (!origMap.has(node)) origMap.set(node, node.nodeValue)
  const zh = origMap.get(node)
  const next = curLang === 'en' ? translateStr(zh) : zh
  // 只在真正变化时才写入，避免赋值触发新的 characterData 变更引发 MutationObserver 死循环
  if (node.nodeValue !== next) node.nodeValue = next
}

function translateAttrs(el) {
  for (const attr of ATTRS) {
    if (!el.hasAttribute || !el.hasAttribute(attr)) continue
    const cur = el.getAttribute(attr) || ''
    if (!cur) continue
    let bak = origAttrMap.get(el)
    if (!bak) { bak = {}; origAttrMap.set(el, bak) }
    if (bak[attr] === undefined) bak[attr] = cur
    const zh = bak[attr]
    if (!hasCJK(zh)) continue
    const next = curLang === 'en' ? translateStr(zh) : zh
    if (el.getAttribute(attr) !== next) el.setAttribute(attr, next)
  }
}

function walkAndTranslate(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let n
  while ((n = walker.nextNode())) translateNode(n)
  if (root.querySelectorAll) {
    root.querySelectorAll('[placeholder],[title]').forEach((el) => translateAttrs(el))
    if (root.nodeType === 1) translateAttrs(root)
  }
}

function applyAll() {
  // 翻译期间断开 observer，结束后清空期间产生的变更记录再重连，杜绝"赋值→变更→再翻译"的死循环
  if (observer) observer.disconnect()
  walkAndTranslate(document.body)
  document.documentElement.lang = curLang === 'en' ? 'en' : 'zh-CN'
  const btn = document.getElementById('langToggle')
  if (btn) btn.textContent = curLang === 'en' ? '中文' : 'EN'
  if (observer) {
    observer.takeRecords()
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })
  }
}

function injectToggle() {
  // 语言切换已移入启动器「设置」，不再在右上角注入按钮
}

export function setupLauncherI18n() {
  curLang = detectLang()
  let pending = false
  const start = () => {
    injectToggle()
    applyAll()
    // 监听 Vue 重渲染：防抖 + 翻译期间断开（配合"仅变化才写入"），彻底避免死循环卡死
    observer = new MutationObserver(() => {
      if (pending) return
      pending = true
      requestAnimationFrame(() => {
        pending = false
        if (!document.getElementById('langToggle')) injectToggle()
        if (curLang === 'en') {
          observer.disconnect()
          walkAndTranslate(document.body)
          observer.takeRecords()
          observer.observe(document.body, { childList: true, subtree: true, characterData: true })
        }
      })
    })
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })
  }
  // 等首帧渲染后再执行
  setTimeout(start, 60)
}

if (typeof window !== 'undefined') {
  window.__getLauncherLang = () => curLang
  window.__setLauncherLang = (lang) => {
    if (lang !== 'zh' && lang !== 'en') return
    curLang = lang
    try { localStorage.setItem(LS_KEY, curLang) } catch (e) {}
    applyAll()
  }
}

export { DICT }
