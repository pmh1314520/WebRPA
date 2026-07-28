/**
 * 配置管理服务
 * 统一管理后端 API 地址和端口配置
 */

// 构建/启动时由 vite.config.ts 从**根目录** WebRPAConfig.json 注入的后端端口。
// 存在的意义：运行时读取的 /WebRPAConfig.json 是 frontend/public 下的副本，用户直接
// 手改根配置（README 明确允许）而没经过启动器保存时，副本不会更新。此时若还回落到
// 写死的 5241，整站请求都会打到没有服务在听的端口上。注入值来自根配置，可信度更高。
declare const __WEBRPA_BACKEND_PORT__: number | undefined
const INJECTED_BACKEND_PORT: string =
  typeof __WEBRPA_BACKEND_PORT__ === 'number' && __WEBRPA_BACKEND_PORT__ > 0
    ? String(__WEBRPA_BACKEND_PORT__)
    : ''

/** 端口回落链：注入值（根配置真值）优先，最后才是出厂默认端口 */
const FALLBACK_BACKEND_PORT = INJECTED_BACKEND_PORT || '5241'

// 配置缓存
let cachedBackendPort: string | null = null
let configLoadPromise: Promise<void> | null = null

// 从配置文件加载端口（只加载一次）
async function loadConfigFromFile(): Promise<void> {
  // 注意：不再检查缓存，每次都重新加载，确保获取最新配置
  console.log('[Config] 开始加载配置文件...')
  
  try {
    // 优先从URL参数读取
    const urlParams = new URLSearchParams(window.location.search)
    const urlPort = urlParams.get('backend_port')
    if (urlPort) {
      const port = Number(urlPort)
      if (Number.isFinite(port) && port > 0) {
        cachedBackendPort = String(port)
        console.log('[Config] 从URL参数读取端口:', cachedBackendPort)
        return
      }
    }
    
    // 从配置文件读取（添加时间戳防止缓存）
    const timestamp = new Date().getTime()
    const configUrl = `/WebRPAConfig.json?t=${timestamp}`
    console.log('[Config] 尝试读取配置文件:', configUrl)
    
    const response = await fetch(configUrl, {
      cache: 'no-store',  // 强制不使用缓存
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    console.log('[Config] 配置文件响应状态:', response.status, response.ok)
    
    if (response.ok) {
      const config = await response.json()
      console.log('[Config] 配置文件内容:', config)
      
      const configPort = Number(config.backend?.port)
      console.log('[Config] 解析的端口:', configPort, '| 是否有效:', Number.isFinite(configPort) && configPort > 0)
      
      if (Number.isFinite(configPort) && configPort > 0) {
        cachedBackendPort = String(configPort)
        console.log('[Config] 从配置文件读取端口:', cachedBackendPort)
        return
      }
    }
  } catch (error) {
    console.error('[Config] 读取配置文件失败:', error)
  }
  
  // 都失败了：优先用构建时从根配置注入的端口，再退到出厂默认端口
  cachedBackendPort = FALLBACK_BACKEND_PORT
  console.log('[Config] fallback backend port:', cachedBackendPort,
    INJECTED_BACKEND_PORT ? '(injected from root WebRPAConfig.json)' : '(factory default)')
}

// 确保配置已加载（返回Promise）
function ensureConfigLoaded(): Promise<void> {
  // 每次都重新加载配置，不使用Promise缓存
  configLoadPromise = loadConfigFromFile()
  return configLoadPromise
}

// 获取后端基础 URL（同步版本，使用缓存）
export function getBackendBaseUrl(): string {
  const hostname = window.location.hostname
  
  // 如果还没有缓存，使用默认值
  // 注意：这里不再触发异步加载，因为应该在App初始化时就已经加载了
  const backendPort = cachedBackendPort || FALLBACK_BACKEND_PORT
  
  console.log('[Config] getBackendBaseUrl 被调用 | cachedBackendPort:', cachedBackendPort, '| 使用端口:', backendPort)
  
  // 如果是 localhost 或 127.0.0.1，使用 localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `http://localhost:${backendPort}`
  }
  // 否则使用当前访问的主机名（局域网 IP）
  return `http://${hostname}:${backendPort}`
}

// 获取后端端口号
export function getBackendPort(): string {
  return cachedBackendPort || FALLBACK_BACKEND_PORT
}

// 获取前端端口号
export function getFrontendPort(): string {
  return window.location.port || '5921'
}

// 设置后端端口号
export function setBackendPort(port: number | string): void {
  cachedBackendPort = String(port)
}

// 预加载配置（在App初始化时调用）
export async function preloadConfig(): Promise<void> {
  await ensureConfigLoaded()
}
