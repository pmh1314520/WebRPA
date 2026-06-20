/**
 * 数据库初始化和操作
 * 使用 sql.js（纯 JavaScript SQLite 实现）
 */

import initSqlJs from 'sql.js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 数据目录
const dataDir = join(__dirname, '..', 'data')
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true })
}

// 数据库文件路径
const dbPath = join(dataDir, 'workflows.db')

// 数据库实例
let db = null

// 自动保存间隔（毫秒）
const AUTO_SAVE_INTERVAL = 30000

/**
 * 初始化数据库
 */
export async function initDatabase() {
  const SQL = await initSqlJs()
  
  // 如果数据库文件存在，加载它
  if (existsSync(dbPath)) {
    const fileBuffer = readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
    console.log('✅ 已加载现有数据库')
  } else {
    db = new SQL.Database()
    console.log('✅ 已创建新数据库')
  }

  // 创建表
  db.run(`
    CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY,
      hash TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      author TEXT DEFAULT '匿名',
      category TEXT DEFAULT '其他',
      tags TEXT,
      content TEXT NOT NULL,
      node_count INTEGER DEFAULT 0,
      download_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      ip_address TEXT,
      user_agent TEXT,
      client_id TEXT,
      is_active INTEGER DEFAULT 1
    )
  `)

  // 尝试添加 client_id 列（如果不存在）
  try {
    db.run(`ALTER TABLE workflows ADD COLUMN client_id TEXT`)
  } catch (e) {
    // 列已存在，忽略错误
  }

  // 创建索引
  db.run(`CREATE INDEX IF NOT EXISTS idx_workflows_hash ON workflows(hash)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_workflows_category ON workflows(category)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_workflows_created_at ON workflows(created_at)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_workflows_download_count ON workflows(download_count)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_workflows_is_active ON workflows(is_active)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_workflows_client_id ON workflows(client_id)`)

  // 下载记录表
  db.run(`
    CREATE TABLE IF NOT EXISTS download_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workflow_id TEXT NOT NULL,
      ip_address TEXT NOT NULL,
      downloaded_at TEXT DEFAULT (datetime('now'))
    )
  `)

  // 举报表
  db.run(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workflow_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      description TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      status TEXT DEFAULT 'pending'
    )
  `)

  // 工作流评论表
  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workflow_id TEXT NOT NULL,
      nickname TEXT DEFAULT '匿名用户',
      content TEXT NOT NULL,
      comment_type TEXT DEFAULT '反馈',
      client_id TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      is_active INTEGER DEFAULT 1
    )
  `)

  // 尝试为 comments 表添加 client_id 列（如果不存在）
  try {
    db.run(`ALTER TABLE comments ADD COLUMN client_id TEXT`)
  } catch (e) {
    // 列已存在，忽略错误
  }

  // 评论表索引
  db.run(`CREATE INDEX IF NOT EXISTS idx_comments_workflow_id ON comments(workflow_id)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_comments_client_id ON comments(client_id)`)

  // 留言板表
  db.run(`
    CREATE TABLE IF NOT EXISTS guestbook (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nickname TEXT DEFAULT '匿名用户',
      content TEXT NOT NULL,
      message_type TEXT DEFAULT '建议',
      client_id TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      is_active INTEGER DEFAULT 1
    )
  `)

  // 尝试为 guestbook 表添加 client_id 列（如果不存在）
  try {
    db.run(`ALTER TABLE guestbook ADD COLUMN client_id TEXT`)
  } catch (e) {
    // 列已存在，忽略错误
  }

  // 留言板索引
  db.run(`CREATE INDEX IF NOT EXISTS idx_guestbook_created_at ON guestbook(created_at)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_guestbook_client_id ON guestbook(client_id)`)

  // 自定义模块在线社区表
  db.run(`
    CREATE TABLE IF NOT EXISTS custom_modules (
      id TEXT PRIMARY KEY,
      hash TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      display_name TEXT NOT NULL,
      description TEXT,
      icon TEXT DEFAULT '📦',
      color TEXT DEFAULT '#8B5CF6',
      category TEXT DEFAULT '其他',
      tags TEXT,
      content TEXT NOT NULL,
      author TEXT DEFAULT '匿名',
      version TEXT DEFAULT '1.0.0',
      node_count INTEGER DEFAULT 0,
      download_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      ip_address TEXT,
      user_agent TEXT,
      client_id TEXT,
      is_active INTEGER DEFAULT 1
    )
  `)

  // 自定义模块下载记录表
  db.run(`
    CREATE TABLE IF NOT EXISTS custom_module_download_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_id TEXT NOT NULL,
      ip_address TEXT NOT NULL,
      downloaded_at TEXT DEFAULT (datetime('now'))
    )
  `)

  // 自定义模块索引
  db.run(`CREATE INDEX IF NOT EXISTS idx_custom_modules_hash ON custom_modules(hash)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_custom_modules_category ON custom_modules(category)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_custom_modules_created_at ON custom_modules(created_at)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_custom_modules_download_count ON custom_modules(download_count)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_custom_modules_is_active ON custom_modules(is_active)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_custom_modules_client_id ON custom_modules(client_id)`)

  // 自定义模块评论 + 评分表
  db.run(`
    CREATE TABLE IF NOT EXISTS custom_module_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_id TEXT NOT NULL,
      nickname TEXT DEFAULT '匿名用户',
      content TEXT NOT NULL,
      rating INTEGER DEFAULT 0,
      client_id TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      is_active INTEGER DEFAULT 1
    )
  `)
  db.run(`CREATE INDEX IF NOT EXISTS idx_cm_comments_module ON custom_module_comments(module_id)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_cm_comments_client ON custom_module_comments(client_id)`)

  // 自定义模块举报表
  db.run(`
    CREATE TABLE IF NOT EXISTS custom_module_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      description TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      status TEXT DEFAULT 'pending'
    )
  `)

  // ============================================================
  // 插件中心：中心化注册表（hub_plugins + hub_plugin_reviews）
  // ============================================================
  db.run(`
    CREATE TABLE IF NOT EXISTS hub_plugins (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      version TEXT DEFAULT '1.0.0',
      author TEXT DEFAULT '匿名',
      description TEXT,
      homepage TEXT,
      keywords TEXT,
      content TEXT NOT NULL,
      module_count INTEGER DEFAULT 0,
      download_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      ip_address TEXT,
      client_id TEXT,
      is_active INTEGER DEFAULT 1
    )
  `)
  db.run(`CREATE INDEX IF NOT EXISTS idx_hub_plugins_created_at ON hub_plugins(created_at)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_hub_plugins_download_count ON hub_plugins(download_count)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_hub_plugins_is_active ON hub_plugins(is_active)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_hub_plugins_client_id ON hub_plugins(client_id)`)

  db.run(`
    CREATE TABLE IF NOT EXISTS hub_plugin_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plugin_id TEXT NOT NULL,
      user TEXT DEFAULT '匿名用户',
      rating INTEGER DEFAULT 0,
      comment TEXT,
      client_id TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      is_active INTEGER DEFAULT 1
    )
  `)
  db.run(`CREATE INDEX IF NOT EXISTS idx_hub_plugin_reviews_plugin ON hub_plugin_reviews(plugin_id)`)

  // 保存数据库
  saveDatabase()

  // 设置自动保存
  setInterval(() => {
    saveDatabase()
  }, AUTO_SAVE_INTERVAL)

  console.log('✅ 数据库初始化完成')
}

/**
 * 保存数据库到文件
 */
export function saveDatabase() {
  if (db) {
    const data = db.export()
    const buffer = Buffer.from(data)
    writeFileSync(dbPath, buffer)
  }
}

/**
 * 数据库包装器，提供类似 better-sqlite3 的 API
 */
class DatabaseWrapper {
  prepare(sql) {
    return new StatementWrapper(sql)
  }

  exec(sql) {
    db.run(sql)
    saveDatabase()
  }
}

class StatementWrapper {
  constructor(sql) {
    this.sql = sql
  }

  run(...params) {
    db.run(this.sql, params)
    saveDatabase()
    return { changes: db.getRowsModified() }
  }

  get(...params) {
    const stmt = db.prepare(this.sql)
    stmt.bind(params)
    if (stmt.step()) {
      const row = stmt.getAsObject()
      stmt.free()
      return row
    }
    stmt.free()
    return undefined
  }

  all(...params) {
    const results = []
    const stmt = db.prepare(this.sql)
    stmt.bind(params)
    while (stmt.step()) {
      results.push(stmt.getAsObject())
    }
    stmt.free()
    return results
  }
}

// 导出数据库包装器
export default new DatabaseWrapper()
