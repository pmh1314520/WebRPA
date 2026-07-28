// WebRPA 启动器 - Electron 主进程
// 说明：本文件替代原 Tauri(Rust) 后端 src-tauri/src/main.rs，
// 复刻全部启动器能力：读写配置、启停前后端服务、检查更新、日志、
// 开机自启、启动时隐藏到托盘、系统托盘、无边框主窗口、独立 Agent 窗口（含 QQ 式贴边自动隐藏）。
// 目标：彻底摆脱对系统 WebView2 运行时的依赖（Electron 自带 Chromium）。

const { app, BrowserWindow, Tray, Menu, ipcMain, shell, screen, nativeImage } = require('electron')
const path = require('path')
const fs = require('fs')
const net = require('net')
const { spawn, execFile } = require('child_process')

// ============ 全局状态 ============
let mainWindow = null
let agentWindow = null
let tray = null
const services = {
  backendProc: null,
  frontendProc: null,
  backendPid: null,
  frontendPid: null,
}
// Agent 窗口当前语言 / 主题（用于「语言变化才重载、否则保留会话」以及主题实时注入）
let agentLang = ''
let agentTheme = 'default'
let agentAutoHideTimer = null

const CREATE_NO_WINDOW = { windowsHide: true }

// ============ 路径解析 ============
// 应用根目录：始终以启动器 exe 所在目录为基准定位 Python313/backend/frontend/配置/版本文件等。
// - 打包后（portable）：PORTABLE_EXECUTABLE_DIR 为用户双击的 exe 所在目录（即项目根目录）。
// - 开发模式：electron/ 位于 launcher/ 下，项目根目录为其上两级。
function appRoot() {
  if (app.isPackaged) {
    return process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath)
  }
  return path.resolve(__dirname, '..', '..')
}

// 启动器自身 exe 路径（用于开机自启注册；portable 下须指向固定的 exe 而非临时解包路径）
function launcherExePath() {
  if (app.isPackaged && process.env.PORTABLE_EXECUTABLE_DIR) {
    return path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'WebRPA启动器.exe')
  }
  return process.execPath
}

function iconPath() {
  return path.join(__dirname, '..', 'logo.ico')
}

// ============ 通用工具 ============
function nowStamp() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

// 移除 ANSI 转义序列（日志清洗）
function stripAnsi(text) {
  return String(text).replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
}

function appendLog(file, line) {
  try {
    fs.appendFileSync(file, line, 'utf-8')
  } catch (e) {
    // 忽略日志写入失败，不影响主流程
  }
}

// 检查端口是否被占用：分别在 127.0.0.1 / 0.0.0.0 上尝试监听，任一失败即视为占用（与原 Rust 逻辑一致）
function bindTest(port, host) {
  return new Promise((resolve) => {
    const tester = net.createServer()
    tester.once('error', (err) => {
      resolve(err && err.code === 'EADDRINUSE')
    })
    tester.once('listening', () => {
      tester.close(() => resolve(false))
    })
    try {
      tester.listen(port, host)
    } catch (e) {
      resolve(true)
    }
  })
}

async function isPortInUse(port) {
  for (const host of ['127.0.0.1', '0.0.0.0']) {
    if (await bindTest(port, host)) return true
  }
  return false
}

// ============ 配置读写 ============
function readConfig() {
  const configPath = path.join(appRoot(), 'WebRPAConfig.json')
  let content
  try {
    content = fs.readFileSync(configPath, 'utf-8')
  } catch (e) {
    throw `读取配置文件失败: ${e.message}`
  }
  try {
    return JSON.parse(content)
  } catch (e) {
    throw `解析配置文件失败: ${e.message}`
  }
}

// 把根目录配置同步到前端 public：前端运行时读的是 /WebRPAConfig.json（即 public 那份），
// 两者不一致时前端会拿着旧端口去请求后端，表现为整站请求失败。
// 除了「保存配置」，启动前端前也必须同步一次——用户完全可能按 README 的说法直接手改
// 根目录配置文件（不经过启动器界面），那条路径下 public 副本永远不会被更新。
function syncFrontendPublicConfig(json) {
  const frontendPublic = path.join(appRoot(), 'frontend', 'public', 'WebRPAConfig.json')
  fs.mkdirSync(path.dirname(frontendPublic), { recursive: true })
  fs.writeFileSync(frontendPublic, json, 'utf-8')
}

function saveConfig(config) {
  const root = appRoot()
  const json = JSON.stringify(config, null, 2)
  try {
    fs.writeFileSync(path.join(root, 'WebRPAConfig.json'), json, 'utf-8')
  } catch (e) {
    throw `保存配置文件失败: ${e.message}`
  }
  try {
    syncFrontendPublicConfig(json)
  } catch (e) {
    throw `同步前端配置文件失败: ${e.message}`
  }
}

// ============ 进程管理 ============
function killProcessTree(pid) {
  if (!pid) return
  try {
    execFile('taskkill', ['/F', '/T', '/PID', String(pid)], CREATE_NO_WINDOW, () => {})
  } catch (e) {}
}

// 根据端口查找并杀死 LISTENING 进程（stop 时兜底清理残留）
function killProcessesByPort(port) {
  return new Promise((resolve) => {
    execFile('netstat', ['-ano'], { ...CREATE_NO_WINDOW, maxBuffer: 1024 * 1024 * 8 }, (err, stdout) => {
      if (err || !stdout) return resolve()
      const pids = new Set()
      for (const line of stdout.split(/\r?\n/)) {
        if (line.includes(`:${port}`) && line.includes('LISTENING')) {
          const parts = line.trim().split(/\s+/)
          const pid = parseInt(parts[parts.length - 1], 10)
          if (pid && pid !== 0) pids.add(pid)
        }
      }
      let pending = pids.size
      if (pending === 0) return resolve()
      for (const pid of pids) {
        execFile('taskkill', ['/F', '/T', '/PID', String(pid)], CREATE_NO_WINDOW, () => {
          if (--pending <= 0) resolve()
        })
      }
    })
  })
}

async function startBackend() {
  const config = readConfig()
  if (await isPortInUse(config.backend.port)) {
    throw `后端服务已在运行（端口${config.backend.port}已被占用）`
  }
  const root = appRoot()
  const pythonExe = path.join(root, 'Python313', 'python.exe')
  const backendScript = path.join(root, 'backend', 'run.py')
  if (!fs.existsSync(pythonExe)) throw `未找到Python可执行文件，路径: ${pythonExe}`
  if (!fs.existsSync(backendScript)) throw `未找到后端启动脚本，路径: ${backendScript}`

  const logDir = path.join(root, 'backend', 'logs')
  fs.mkdirSync(logDir, { recursive: true })
  const logFile = path.join(logDir, 'backend.log')
  const initLog =
    `# WebRPA 后端日志 - 启动时间: ${nowStamp()}\n` +
    `[${nowStamp()}] Python路径: ${pythonExe}\n` +
    `[${nowStamp()}] 后端脚本: ${backendScript}\n` +
    `[${nowStamp()}] 工作目录: ${root}\n` +
    `[${nowStamp()}] 配置: host=${config.backend.host}, port=${config.backend.port}\n`
  fs.writeFileSync(logFile, initLog, 'utf-8')

  const child = spawn(pythonExe, [backendScript], {
    cwd: root,
    windowsHide: true,
    env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUNBUFFERED: '1' },
  })
  services.backendProc = child
  services.backendPid = child.pid
  appendLog(logFile, `[${nowStamp()}] 后端进程已启动，PID: ${child.pid}\n`)

  const pipe = (stream, prefix) => {
    let buf = ''
    stream.on('data', (chunk) => {
      buf += chunk.toString('utf-8')
      let idx
      while ((idx = buf.indexOf('\n')) >= 0) {
        const line = stripAnsi(buf.slice(0, idx)).trim()
        buf = buf.slice(idx + 1)
        if (line) appendLog(logFile, `[${nowStamp()}]${prefix} ${line}\n`)
      }
    })
  }
  pipe(child.stdout, '')
  pipe(child.stderr, ' [ERROR]')
  child.on('exit', () => {
    services.backendProc = null
    services.backendPid = null
  })
}

async function startFrontend() {
  const config = readConfig()
  if (await isPortInUse(config.frontend.port)) {
    throw `前端服务已在运行（端口${config.frontend.port}已被占用）`
  }
  // 启动前先把根目录配置同步给前端：覆盖"用户手改根配置、没经过启动器保存"的情况，
  // 否则前端会读到 public 里的旧端口，把请求打到没有服务在听的端口上。
  try {
    syncFrontendPublicConfig(JSON.stringify(config, null, 2))
  } catch (e) {
    throw `同步前端配置文件失败（前端会读到旧端口）: ${e.message}`
  }
  const root = appRoot()
  const frontendDir = path.join(root, 'frontend')
  if (!fs.existsSync(frontendDir)) throw `未找到前端目录，路径: ${frontendDir}`

  const logDir = path.join(frontendDir, 'logs')
  fs.mkdirSync(logDir, { recursive: true })
  const logFile = path.join(logDir, 'frontend.log')
  fs.writeFileSync(logFile, `# WebRPA 前端日志 - 启动时间: ${nowStamp()}\n`, 'utf-8')

  const nodeDir = path.join(root, 'nodejs')
  const npmCmd = path.join(nodeDir, 'npm.cmd')
  if (!fs.existsSync(npmCmd)) throw `未找到npm.cmd可执行文件，路径: ${npmCmd}`
  if (!fs.existsSync(path.join(frontendDir, 'package.json'))) {
    throw `未找到package.json文件，路径: ${path.join(frontendDir, 'package.json')}`
  }

  appendLog(
    logFile,
    `[${nowStamp()}] 正在启动前端服务...\n[${nowStamp()}] npm路径: ${npmCmd}\n` +
      `[${nowStamp()}] 工作目录: ${frontendDir}\n[${nowStamp()}] 执行命令: npm run dev\n`
  )

  // Windows 上 .cmd 需经 shell 执行；用带引号的命令字符串，兼容路径含空格的部署目录
  const child = spawn(`"${npmCmd}" run dev`, {
    cwd: frontendDir,
    windowsHide: true,
    shell: true,
    env: {
      ...process.env,
      NODE_OPTIONS: '--no-warnings',
      FORCE_COLOR: '0',
      NO_COLOR: '1',
      PATH: `${nodeDir};${process.env.PATH || ''}`,
    },
  })
  services.frontendProc = child
  services.frontendPid = child.pid
  appendLog(logFile, `[${nowStamp()}] 前端进程已启动，PID: ${child.pid}\n`)

  const pipe = (stream, prefix) => {
    let buf = ''
    stream.on('data', (chunk) => {
      buf += chunk.toString('utf-8')
      let idx
      while ((idx = buf.indexOf('\n')) >= 0) {
        const line = stripAnsi(buf.slice(0, idx)).trim()
        buf = buf.slice(idx + 1)
        if (line) appendLog(logFile, `[${nowStamp()}]${prefix} ${line}\n`)
      }
    })
  }
  pipe(child.stdout, '')
  pipe(child.stderr, ' [ERROR]')
  child.on('exit', (code) => {
    appendLog(logFile, `[${nowStamp()}] 前端进程已退出，退出状态: ${code}\n`)
    services.frontendProc = null
    services.frontendPid = null
  })
}

// 停止前后端服务（供 IPC、主窗口关闭、托盘退出共用）
async function shutdownServices() {
  // 先关掉 Agent 窗口（后端即将停止，Agent 没有存在意义）
  closeAgentWindow()

  let config = null
  try {
    config = readConfig()
  } catch (e) {}

  if (services.backendPid) killProcessTree(services.backendPid)
  if (services.backendProc) { try { services.backendProc.kill() } catch (e) {} }
  if (services.frontendPid) killProcessTree(services.frontendPid)
  if (services.frontendProc) { try { services.frontendProc.kill() } catch (e) {} }
  services.backendProc = services.frontendProc = null
  services.backendPid = services.frontendPid = null

  await new Promise((r) => setTimeout(r, 1000))

  if (config) {
    if (await isPortInUse(config.backend.port)) await killProcessesByPort(config.backend.port)
    if (await isPortInUse(config.frontend.port)) await killProcessesByPort(config.frontend.port)
    await new Promise((r) => setTimeout(r, 1000))
  }
}

// ============ 版本 / 更新 ============
function getLocalVersion() {
  const versionFile = path.join(appRoot(), 'frontend', 'src', 'services', 'version.ts')
  if (!fs.existsSync(versionFile)) throw '版本文件不存在'
  const content = fs.readFileSync(versionFile, 'utf-8')
  for (const line of content.split(/\r?\n/)) {
    if (line.includes('CURRENT_VERSION') && line.includes('=')) {
      const m = line.match(/['"]([^'"]+)['"]/)
      if (m) return m[1]
    }
  }
  throw '无法从版本文件中提取版本号'
}

// remote > local 时返回 true
function compareVersions(local, remote) {
  const lp = String(local).split('.').map((s) => parseInt(s, 10) || 0)
  const rp = String(remote).split('.').map((s) => parseInt(s, 10) || 0)
  const len = Math.max(lp.length, rp.length)
  for (let i = 0; i < len; i++) {
    const a = lp[i] || 0
    const b = rp[i] || 0
    if (b > a) return true
    if (b < a) return false
  }
  return false
}

async function checkUpdate(currentVersion) {
  const remoteUrl = 'https://hub.pmhs.top/api/version'
  let remoteInfo
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)
    const resp = await fetch(remoteUrl, { signal: controller.signal })
    clearTimeout(timer)
    remoteInfo = await resp.json()
  } catch (e) {
    throw `获取远程版本信息失败: ${e.message}`
  }
  const latest = remoteInfo.version
  return {
    current_version: currentVersion,
    latest_version: latest,
    has_update: compareVersions(currentVersion, latest),
    update_url: `https://github.com/pmh1314520/WebRPA/releases/tag/v${latest}`,
    release_date: remoteInfo.releaseDate || '未知',
    changelog: remoteInfo.changelog || '无更新说明',
  }
}

// ============ 打开浏览器 / 日志 ============
function openBrowser(url) {
  return shell.openExternal(url)
}

// 解析 Windows 默认浏览器 exe（尊重系统设置，不写死 Edge/Chrome）：
// 读 https 的 UserChoice ProgId → 该 ProgId 的 shell\open\command → 提取 exe 路径。
function resolveDefaultBrowserExe() {
  return new Promise((resolve) => {
    const regQuery = (args) =>
      new Promise((res) => {
        execFile('reg', ['query', ...args], CREATE_NO_WINDOW, (err, stdout) => {
          res(err ? '' : stdout || '')
        })
      })

    ;(async () => {
      let progId = ''
      for (const scheme of ['https', 'http']) {
        const key = `HKCU\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\${scheme}\\UserChoice`
        const out = await regQuery([key, '/v', 'ProgId'])
        const line = out.split(/\r?\n/).find((l) => l.trim().startsWith('ProgId'))
        if (line) {
          const parts = line.trim().split(/\s+/)
          progId = parts[parts.length - 1]
          if (progId) break
        }
      }
      if (!progId) return resolve(null)

      const cmdOut = await regQuery([`HKCR\\${progId}\\shell\\open\\command`, '/ve'])
      const rawLine = cmdOut.split(/\r?\n/).find((l) => l.includes('REG_SZ'))
      if (!rawLine) return resolve(null)
      const raw = rawLine.split('REG_SZ')[1].trim()
      let exe
      if (raw.startsWith('"')) {
        exe = raw.slice(1).split('"')[0]
      } else {
        exe = raw.split(/\s+/)[0]
      }
      if (exe && exe.toLowerCase().endsWith('.exe') && fs.existsSync(exe)) {
        resolve(exe)
      } else {
        resolve(null)
      }
    })().catch(() => resolve(null))
  })
}

// 用系统默认浏览器打开日志文件（.log 默认关联记事本，日志可能很大，用浏览器更合适）
async function openLogInBrowser(logPath, header) {
  if (!fs.existsSync(logPath)) {
    fs.mkdirSync(path.dirname(logPath), { recursive: true })
    fs.writeFileSync(logPath, header, 'utf-8')
  }
  const fileUrl = 'file:///' + logPath.replace(/\\/g, '/')
  const browser = await resolveDefaultBrowserExe()
  if (browser) {
    try {
      spawn(browser, [fileUrl], { detached: true, stdio: 'ignore', windowsHide: true }).unref()
      return
    } catch (e) {}
  }
  // 回退：交给系统 shell
  await shell.openExternal(fileUrl)
}

// ============ 开机自启 / 启动隐藏 ============
function setAutostart(enable) {
  app.setLoginItemSettings({
    openAtLogin: !!enable,
    path: launcherExePath(),
  })
}

function getAutostart() {
  return !!app.getLoginItemSettings({ path: launcherExePath() }).openAtLogin
}

function launcherSettingsPath() {
  return path.join(appRoot(), 'launcher_settings.json')
}

function readLauncherSettings() {
  try {
    const c = fs.readFileSync(launcherSettingsPath(), 'utf-8')
    const s = JSON.parse(c)
    return { startHidden: !!s.startHidden }
  } catch (e) {
    return { startHidden: false }
  }
}

function getStartHidden() {
  return readLauncherSettings().startHidden
}

function setStartHidden(enable) {
  const json = JSON.stringify({ startHidden: !!enable }, null, 2)
  fs.writeFileSync(launcherSettingsPath(), json, 'utf-8')
}

// ============ 小助手独立 Agent 窗口 ============
function normalizeTheme(theme) {
  return theme === 'dark' || theme === 'gray' ? theme : 'default'
}

// 生成把 <html data-webrpa-theme> 设成指定主题的 JS（default 则移除属性）
function themeEvalJs(theme) {
  if (theme === 'dark' || theme === 'gray') {
    return `try{document.documentElement.setAttribute('data-webrpa-theme','${theme}');}catch(e){}`
  }
  return `try{document.documentElement.removeAttribute('data-webrpa-theme');}catch(e){}`
}

// 构造 Agent 窗口 URL（含 view/lang/theme/backend_port），返回 { url, lang }
function buildAgentUrl(lang, theme) {
  const config = readConfig()
  const langQ = lang === 'en' ? 'en' : 'zh'
  const themeQ = normalizeTheme(theme)
  const url = `http://localhost:${config.frontend.port}/?view=assistant&lang=${langQ}&theme=${themeQ}&backend_port=${config.backend.port}`
  return { url, lang: langQ }
}

function closeAgentWindow() {
  if (agentWindow && !agentWindow.isDestroyed()) {
    try { agentWindow.close() } catch (e) {}
  }
  agentWindow = null
}

async function openAssistantAgentWindow(lang, theme) {
  const themeQ = normalizeTheme(theme)
  agentTheme = themeQ
  const { url, lang: langQ } = buildAgentUrl(lang, themeQ)

  // 已存在：语言变了就重载（跟随启动器），语言没变则保留当前会话只置前
  if (agentWindow && !agentWindow.isDestroyed()) {
    const changed = agentLang !== langQ
    agentLang = langQ
    if (changed) {
      agentWindow.loadURL(url)
    } else {
      try { await agentWindow.webContents.executeJavaScript(themeEvalJs(themeQ)) } catch (e) {}
    }
    if (agentWindow.isMinimized()) agentWindow.restore()
    agentWindow.show()
    agentWindow.focus()
    return
  }

  agentWindow = new BrowserWindow({
    width: 380,
    height: 720,
    minWidth: 340,
    minHeight: 520,
    frame: false,
    resizable: true,
    maximizable: false, // 禁用最大化 → 同时禁用 Aero Snap 半屏
    alwaysOnTop: true,
    skipTaskbar: false,
    title: 'WebRPA Agent',
    icon: iconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'agent-preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  agentLang = langQ
  agentWindow.loadURL(url)
  // 页面加载完成后注入主题（navigate 后主题会被重置，这里补齐）
  agentWindow.webContents.on('did-finish-load', () => {
    try { agentWindow.webContents.executeJavaScript(themeEvalJs(agentTheme)) } catch (e) {}
  })
  agentWindow.on('closed', () => {
    agentWindow = null
    agentLang = ''
  })
  startAgentAutoHide()
}

function syncAssistantAgentLang(lang) {
  if (!agentWindow || agentWindow.isDestroyed()) return
  const { url, lang: langQ } = buildAgentUrl(lang, agentTheme)
  if (agentLang !== langQ) {
    agentLang = langQ
    agentWindow.loadURL(url)
  }
}

function syncAssistantAgentTheme(theme) {
  const themeQ = normalizeTheme(theme)
  agentTheme = themeQ
  if (agentWindow && !agentWindow.isDestroyed()) {
    try { agentWindow.webContents.executeJavaScript(themeEvalJs(themeQ)) } catch (e) {}
  }
}

// QQ 式贴边自动隐藏：窗口拖到屏幕边缘后鼠标离开自动滑出只留极窄边；鼠标回到该边缘再滑回。
// 用全局光标轮询实现（Electron screen.getCursorScreenPoint）。
function animateMove(win, fx, fy, tx, ty) {
  const steps = 6
  for (let i = 1; i <= steps; i++) {
    const x = Math.round(fx + ((tx - fx) * i) / steps)
    const y = Math.round(fy + ((ty - fy) * i) / steps)
    try { win.setPosition(x, y) } catch (e) {}
  }
  try { win.setPosition(tx, ty) } catch (e) {}
}

function startAgentAutoHide() {
  if (agentAutoHideTimer) return
  let docked = 0 // 0无 1左 2右 3上
  let hidden = false
  let leaveAt = 0
  let dmx = 0, dmy = 0, dmw = 0
  const peek = 3
  const threshold = 20

  agentAutoHideTimer = setInterval(() => {
    const win = agentWindow
    if (!win || win.isDestroyed()) {
      docked = 0; hidden = false; leaveAt = 0
      return
    }
    if (win.isMinimized()) return

    const b = win.getBounds()
    const wx = b.x, wy = b.y, ww = b.width, wh = b.height
    const cur = screen.getCursorScreenPoint()

    if (!hidden) {
      // 用窗口中心点所在显示器几何
      const disp = screen.getDisplayNearestPoint({ x: wx + Math.floor(ww / 2), y: wy + Math.floor(wh / 2) })
      const wa = disp.workArea
      const mx = wa.x, my = wa.y, mw = wa.width
      let newDock = 0
      if (wx <= mx + threshold) newDock = 1
      else if (wx + ww >= mx + mw - threshold) newDock = 2
      else if (wy <= my + threshold) newDock = 3
      docked = newDock
      if (docked !== 0) { dmx = mx; dmy = my; dmw = mw }
    }
    if (docked === 0) { leaveAt = 0; return }

    const inside = cur.x >= wx && cur.x <= wx + ww && cur.y >= wy && cur.y <= wy + wh
    let nearEdge = false
    if (docked === 1) nearEdge = cur.x <= dmx + 3 && cur.y >= wy && cur.y <= wy + wh
    else if (docked === 2) nearEdge = cur.x >= dmx + dmw - 3 && cur.y >= wy && cur.y <= wy + wh
    else if (docked === 3) nearEdge = cur.y <= dmy + 3 && cur.x >= wx && cur.x <= wx + ww

    if (!hidden) {
      if (!inside) {
        if (leaveAt === 0) {
          leaveAt = Date.now()
        } else if (Date.now() - leaveAt > 650) {
          let tx = wx, ty = wy
          if (docked === 1) { tx = dmx - (ww - peek); ty = wy }
          else if (docked === 2) { tx = dmx + dmw - peek; ty = wy }
          else if (docked === 3) { tx = wx; ty = dmy - (wh - peek) }
          animateMove(win, wx, wy, tx, ty)
          hidden = true
          leaveAt = 0
        }
      } else {
        leaveAt = 0
      }
    } else if (nearEdge) {
      let tx = wx, ty = wy
      if (docked === 1) { tx = dmx; ty = wy }
      else if (docked === 2) { tx = dmx + dmw - ww; ty = wy }
      else if (docked === 3) { tx = wx; ty = dmy }
      animateMove(win, wx, wy, tx, ty)
      try { win.focus() } catch (e) {}
      hidden = false
      leaveAt = 0
    }
  }, 120)
}

// ============ 主窗口 / 托盘 ============
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 820,
    height: 540,
    minWidth: 760,
    minHeight: 500,
    frame: false, // 无边框（自定义标题栏，对应原 decorations:false）
    resizable: true,
    center: true,
    show: false, // 先隐藏，避免闪窗；根据 start_hidden 决定是否显示
    title: 'WebRPA 启动器',
    icon: iconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (!app.isPackaged) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:1420'
    mainWindow.loadURL(devUrl)
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  // 启动显隐：若开启「启动时自动隐藏到托盘」，则保持隐藏、仅驻留托盘；否则正常显示
  mainWindow.once('ready-to-show', () => {
    if (!getStartHidden()) {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  // 关闭主窗口时停止所有服务后退出（关闭 Agent 窗口不受影响）
  mainWindow.on('close', (e) => {
    if (isQuitting) return
    e.preventDefault()
    isQuitting = true
    shutdownServices().finally(() => {
      app.exit(0)
    })
  })
}

let isQuitting = false

function createTray() {
  let img = nativeImage.createFromPath(iconPath())
  if (img.isEmpty()) img = undefined
  tray = new Tray(img || iconPath())
  tray.setToolTip('WebRPA 启动器')
  const menu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          if (mainWindow.isMinimized()) mainWindow.restore()
          mainWindow.focus()
        }
      },
    },
    {
      label: '退出 WebRPA 启动器',
      click: () => {
        isQuitting = true
        shutdownServices().finally(() => app.exit(0))
      },
    },
  ])
  tray.setContextMenu(menu)
  // 左键点击托盘图标恢复主窗口
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.show()
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

// ============ IPC ============
// 统一 invoke 调度：成功返回 {__ok:true,__data}，失败返回 {__ok:false,__error}（由渲染层 bridge 解包）
async function dispatchInvoke(cmd, args) {
  args = args || {}
  switch (cmd) {
    case 'read_config':
      return readConfig()
    case 'save_config':
      saveConfig(args.config)
      return null
    case 'start_backend':
      await startBackend()
      return null
    case 'start_frontend':
      await startFrontend()
      return null
    case 'stop_services':
      await shutdownServices()
      return null
    case 'check_service_status': {
      const config = readConfig()
      const backend = await isPortInUse(config.backend.port)
      const frontend = await isPortInUse(config.frontend.port)
      return [backend, frontend]
    }
    case 'check_update':
      return await checkUpdate(args.currentVersion)
    case 'get_version':
      return getLocalVersion()
    case 'open_browser':
      await openBrowser(args.url)
      return null
    case 'open_backend_log':
      await openLogInBrowser(
        path.join(appRoot(), 'backend', 'logs', 'backend.log'),
        '# WebRPA 后端日志\n# 日志文件将在服务启动后自动更新\n'
      )
      return null
    case 'open_frontend_log':
      await openLogInBrowser(
        path.join(appRoot(), 'frontend', 'logs', 'frontend.log'),
        '# WebRPA 前端日志\n# 日志文件将在服务启动后自动更新\n'
      )
      return null
    case 'set_autostart':
      setAutostart(args.enable)
      return null
    case 'get_autostart':
      return getAutostart()
    case 'get_start_hidden':
      return getStartHidden()
    case 'set_start_hidden':
      setStartHidden(args.enable)
      return null
    case 'open_assistant_agent_window':
      await openAssistantAgentWindow(args.lang, args.theme)
      return null
    case 'sync_assistant_agent_lang':
      syncAssistantAgentLang(args.lang)
      return null
    case 'sync_assistant_agent_theme':
      syncAssistantAgentTheme(args.theme)
      return null
    default:
      throw `未知命令: ${cmd}`
  }
}

ipcMain.handle('launcher:invoke', async (_e, cmd, args) => {
  try {
    const data = await dispatchInvoke(cmd, args)
    return { __ok: true, __data: data === undefined ? null : data }
  } catch (err) {
    return { __ok: false, __error: typeof err === 'string' ? err : (err && err.message) || String(err) }
  }
})

// 独立 Agent 窗口控制（由 agent-preload.cjs 注入的 window.webrpaAgent 触发）
ipcMain.on('agent:setAlwaysOnTop', (_e, on) => {
  if (agentWindow && !agentWindow.isDestroyed()) {
    try { agentWindow.setAlwaysOnTop(!!on) } catch (e) {}
  }
})
ipcMain.on('agent:minimize', () => {
  if (agentWindow && !agentWindow.isDestroyed()) {
    try { agentWindow.minimize() } catch (e) {}
  }
})
ipcMain.on('agent:close', () => {
  if (agentWindow && !agentWindow.isDestroyed()) {
    try { agentWindow.close() } catch (e) {}
  }
})

ipcMain.handle('launcher:window', (_e, action) => {
  if (!mainWindow) return
  switch (action) {
    case 'hide':
      mainWindow.hide()
      break
    case 'close':
      mainWindow.close()
      break
    case 'minimize':
      mainWindow.minimize()
      break
    case 'show':
      mainWindow.show()
      mainWindow.focus()
      break
    case 'focus':
      mainWindow.focus()
      break
  }
})

// ============ 应用生命周期 ============
// 单实例：再次启动时聚焦已有主窗口
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      mainWindow.show()
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    createMainWindow()
    createTray()
  })

  // 所有窗口关闭不退出（由主窗口 close 事件统一处理退出与服务清理）
  app.on('window-all-closed', () => {})

  app.on('before-quit', () => {
    isQuitting = true
  })
}
