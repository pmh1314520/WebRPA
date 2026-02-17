/**
 * Web RPA 工作流仓库服务
 * 提供工作流的发布、查询、下载功能
 */

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { createServer } from 'http'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { initDatabase } from './database.js'
import workflowRoutes from './routes/workflows.js'
import commentsRoutes from './routes/comments.js'
import guestbookRoutes from './routes/guestbook.js'
import remoteRoutes from './routes/remote.js'
import { setupWebSocket } from './websocket.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { requestLogger } from './middleware/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * 加载配置文件
 */
function loadConfig() {
  const configPath = join(__dirname, '../../WebRPAConfig.json')
  try {
    if (existsSync(configPath)) {
      const configContent = readFileSync(configPath, 'utf-8')
      const config = JSON.parse(configContent)
      return config.frameworkHub || {}
    } else {
      console.log('[Config] 配置文件不存在，使用默认配置')
    }
  } catch (error) {
    console.error('[Config] 读取配置文件失败:', error.message, '，使用默认配置')
  }
  
  // 返回默认配置
  return {
    host: '0.0.0.0',
    port: 3000
  }
}

const app = express()
const server = createServer(app)
const config = loadConfig()
const PORT = config.port || process.env.PORT || 3000
const HOST = config.host || '0.0.0.0'

console.log(`[Config] FrameworkHub 服务配置: host=${HOST}, port=${PORT}`)

// 信任反向代理（用于正确获取客户端 IP）
app.set('trust proxy', 1)

// 安全中间件
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
}))

// CORS 配置
app.use(cors({
  origin: '*', // 允许所有来源，因为是公共API
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Request-ID'],
  maxAge: 86400
}))

// 全局速率限制
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP最多100次请求
  message: { error: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
  // 禁用 X-Forwarded-For 验证（本地服务不需要）
  validate: { xForwardedForHeader: false }
})
app.use(globalLimiter)

// 请求体解析（限制大小）
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))

// 请求日志
app.use(requestLogger)

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 获取最新版本号
app.get('/api/version', (req, res) => {
  res.json({
    version: '1.29.33',
    releaseDate: '2026-02-18',
    downloadUrl: 'https://github.com/pmh1314520/WebRPA/releases',
    changelog: '请前往 GitHub Releases 页面查看更新日志'
  })
})

// API 路由
app.use('/api/workflows', workflowRoutes)
app.use('/api/comments', commentsRoutes)
app.use('/api/guestbook', guestbookRoutes)
app.use('/api/remote', remoteRoutes)

// 404 处理
app.use(notFoundHandler)

// 错误处理
app.use(errorHandler)

// 启动服务器
async function start() {
  // 初始化数据库
  await initDatabase()

  // 设置 WebSocket
  setupWebSocket(server)

  server.listen(PORT, HOST, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚀 Web RPA 工作流仓库服务已启动                           ║
║                                                            ║
║   地址: http://${HOST}:${PORT}                             ║
║   健康检查: http://${HOST}:${PORT}/health                  ║
║   API文档: http://${HOST}:${PORT}/api/workflows            ║
║   WebSocket: ws://${HOST}:${PORT}/ws/signaling             ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `)
  })
}

start().catch(err => {
  console.error('启动失败:', err)
  process.exit(1)
})

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，正在关闭服务...')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('收到 SIGINT 信号，正在关闭服务...')
  process.exit(0)
})
