/**
 * 插件中心 —— 中心化注册表 API 路由
 * 提供插件的发布(上架)、浏览、下载、评分评论功能。
 *
 * 与 WebRPA 后端 plugin_manager 的 hub 约定对齐：
 *   - 市场索引：GET  /api/plugins            → { plugins: [ { id, name, ..., downloadUrl } ] }
 *   - 下载安装：GET  /api/plugins/:id/download → 完整插件包 JSON（供 install_from_market 拉取）
 *   - 发布上架：POST /api/plugins/publish      → body 为完整插件包
 *   - 提交评分：POST /api/plugins/reviews      → { pluginId, rating, comment, user }
 *   - 读取评分：GET  /api/plugins/reviews/:id  → { reviews: [...], summary }
 *
 * 注意：把具体路径(/publish /reviews)放在 /:id 之前注册，避免被参数路由抢占。
 */

import { Router } from 'express'
import { body, query, param, validationResult } from 'express-validator'
import rateLimit from 'express-rate-limit'
import { createHash } from 'crypto'
import xss from 'xss'
import db from '../database.js'
import { getClientIP } from '../utils/ip.js'

const router = Router()

const ID_RE = /^[A-Za-z0-9_\-]+$/

const publishLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 30, message: { error: '发布过于频繁，请稍后再试' } })
const reviewLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: { error: '评分过于频繁，请稍后再试' } })
const downloadLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, message: { error: '下载过于频繁，请稍后再试' } })

const xssOptions = { whiteList: {}, stripIgnoreTag: true, stripIgnoreTagBody: ['script'] }

function validatePackage(pkg) {
  if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg)) return { valid: false, error: '插件包必须是对象' }
  const id = String(pkg.id || '').trim()
  if (!id) return { valid: false, error: '缺少 id' }
  if (!ID_RE.test(id)) return { valid: false, error: 'id 仅允许字母/数字/-/_' }
  if (!pkg.name || typeof pkg.name !== 'string') return { valid: false, error: '缺少 name' }
  if (pkg.modules != null && !Array.isArray(pkg.modules)) return { valid: false, error: 'modules 必须是数组' }
  if (JSON.stringify(pkg).length > 2000000) return { valid: false, error: '插件包过大（超过 2MB）' }
  return { valid: true }
}

function summarize(reviews) {
  const n = reviews.length
  const avg = n ? Math.round((reviews.reduce((s, r) => s + (r.rating || 0), 0) / n) * 100) / 100 : 0
  return { count: n, average: avg }
}

/**
 * 市场索引：浏览全部上架插件
 * GET /api/plugins?search=&page=&limit=&sort=
 */
router.get('/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('search').optional().isString().trim(),
    query('sort').optional().isIn(['newest', 'popular', 'downloads']),
  ],
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ error: '参数错误', details: errors.array() })
    const page = req.query.page || 1
    const limit = req.query.limit || 30
    const offset = (page - 1) * limit
    const search = req.query.search
    const sort = req.query.sort || 'newest'

    let where = 'WHERE is_active = 1'
    const params = []
    if (search) {
      where += ' AND (id LIKE ? OR name LIKE ? OR description LIKE ? OR keywords LIKE ?)'
      const p = `%${search}%`
      params.push(p, p, p, p)
    }
    let order = 'ORDER BY created_at DESC'
    if (sort === 'popular' || sort === 'downloads') order = 'ORDER BY download_count DESC, created_at DESC'

    const { total } = db.prepare(`SELECT COUNT(*) as total FROM hub_plugins ${where}`).get(...params)
    const rows = db.prepare(`
      SELECT id, name, version, author, description, homepage, keywords, module_count, download_count, created_at,
        (SELECT IFNULL(ROUND(AVG(rating),2),0) FROM hub_plugin_reviews r WHERE r.plugin_id = hub_plugins.id AND r.is_active = 1 AND r.rating > 0) as avg_rating,
        (SELECT COUNT(*) FROM hub_plugin_reviews r WHERE r.plugin_id = hub_plugins.id AND r.is_active = 1) as review_count
      FROM hub_plugins ${where} ${order} LIMIT ? OFFSET ?
    `).all(...params, limit, offset)

    const base = `${req.protocol}://${req.get('host')}`
    res.json({
      plugins: rows.map(r => ({
        id: r.id,
        name: r.name,
        version: r.version,
        author: r.author,
        description: r.description,
        homepage: r.homepage,
        keywords: r.keywords ? r.keywords.split(',').filter(Boolean) : [],
        moduleCount: r.module_count,
        downloadCount: r.download_count,
        rating: r.avg_rating,
        reviewCount: r.review_count,
        createdAt: r.created_at,
        // 供后端 install_from_market 拉取完整包
        downloadUrl: `${base}/api/plugins/${encodeURIComponent(r.id)}/download`,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  }
)

/**
 * 发布/上架插件
 * POST /api/plugins/publish   body: 完整插件包
 */
router.post('/publish',
  publishLimiter,
  [body().exists()],
  (req, res) => {
    const pkg = req.body && req.body.package ? req.body.package : req.body
    const v = validatePackage(pkg)
    if (!v.valid) return res.status(400).json({ error: v.error })

    const id = String(pkg.id).trim()
    const clientId = (req.body && req.body.clientId) || pkg.clientId || null
    const name = xss(String(pkg.name), xssOptions).slice(0, 80)
    const version = String(pkg.version || '1.0.0').slice(0, 20)
    const author = xss(String(pkg.author || '匿名'), xssOptions).slice(0, 40)
    const description = xss(String(pkg.description || ''), xssOptions).slice(0, 1000)
    const homepage = String(pkg.homepage || '').slice(0, 300)
    const keywords = Array.isArray(pkg.keywords) ? pkg.keywords.map(k => xss(String(k), xssOptions)).slice(0, 12).join(',') : ''
    const moduleCount = Array.isArray(pkg.modules) ? pkg.modules.length : 0
    const content = JSON.stringify(pkg)

    try {
      const existing = db.prepare('SELECT id, client_id FROM hub_plugins WHERE id = ?').get(id)
      if (existing) {
        // 仅允许原发布者覆盖更新（无 client_id 的历史数据允许更新）
        if (existing.client_id && clientId && existing.client_id !== clientId) {
          return res.status(403).json({ error: '该插件 id 已被他人占用，请更换 id' })
        }
        db.prepare(`UPDATE hub_plugins SET name=?, version=?, author=?, description=?, homepage=?, keywords=?, content=?, module_count=?, updated_at=?, is_active=1 WHERE id=?`)
          .run(name, version, author, description, homepage, keywords, content, moduleCount, new Date().toISOString(), id)
        return res.json({ success: true, id, updated: true, message: '插件已更新上架' })
      }
      db.prepare(`INSERT INTO hub_plugins (id, name, version, author, description, homepage, keywords, content, module_count, ip_address, client_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, name, version, author, description, homepage, keywords, content, moduleCount, getClientIP(req), clientId)
      res.status(201).json({ success: true, id, message: '插件上架成功' })
    } catch (e) {
      console.error('插件上架失败:', e)
      res.status(500).json({ error: '上架失败，请稍后重试' })
    }
  }
)

/**
 * 提交插件评分/评论
 * POST /api/plugins/reviews   body: { pluginId, rating, comment, user }
 */
router.post('/reviews',
  reviewLimiter,
  [
    body('pluginId').isString().trim().matches(ID_RE),
    body('rating').isInt({ min: 1, max: 5 }).toInt(),
    body('comment').optional().isString().trim().isLength({ max: 1000 }),
    body('user').optional().isString().trim().isLength({ max: 40 }),
  ],
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ error: '参数错误', details: errors.array() })
    const { pluginId, rating, comment, user } = req.body
    const exists = db.prepare('SELECT id FROM hub_plugins WHERE id = ? AND is_active = 1').get(pluginId)
    if (!exists) return res.status(404).json({ error: '插件不存在' })
    try {
      db.prepare('INSERT INTO hub_plugin_reviews (plugin_id, user, rating, comment, ip_address) VALUES (?, ?, ?, ?, ?)')
        .run(pluginId, xss(String(user || '匿名用户'), xssOptions), rating, xss(String(comment || ''), xssOptions), getClientIP(req))
      const all = db.prepare('SELECT rating FROM hub_plugin_reviews WHERE plugin_id = ? AND is_active = 1').all(pluginId)
      res.status(201).json({ success: true, summary: summarize(all) })
    } catch (e) {
      res.status(500).json({ error: '评分提交失败' })
    }
  }
)

/**
 * 读取插件评分/评论
 * GET /api/plugins/reviews/:id
 */
router.get('/reviews/:id',
  [param('id').matches(ID_RE)],
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ error: '无效的插件ID' })
    const rows = db.prepare(`SELECT id, user, rating, comment, created_at as createdAt FROM hub_plugin_reviews WHERE plugin_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 200`).all(req.params.id)
    res.json({ reviews: rows, summary: summarize(rows) })
  }
)

/**
 * 下载插件完整包（供 install_from_market 拉取，原样返回包 JSON）
 * GET /api/plugins/:id/download
 */
router.get('/:id/download',
  downloadLimiter,
  [param('id').matches(ID_RE)],
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ error: '无效的插件ID' })
    const row = db.prepare('SELECT content FROM hub_plugins WHERE id = ? AND is_active = 1').get(req.params.id)
    if (!row) return res.status(404).json({ error: '插件不存在' })
    try {
      db.prepare('UPDATE hub_plugins SET download_count = download_count + 1 WHERE id = ?').run(req.params.id)
    } catch (e) { /* ignore */ }
    res.json(JSON.parse(row.content))
  }
)

/**
 * 插件详情
 * GET /api/plugins/:id
 */
router.get('/:id',
  [param('id').matches(ID_RE)],
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ error: '无效的插件ID' })
    const row = db.prepare('SELECT id, name, version, author, description, homepage, keywords, module_count, download_count, created_at FROM hub_plugins WHERE id = ? AND is_active = 1').get(req.params.id)
    if (!row) return res.status(404).json({ error: '插件不存在' })
    const all = db.prepare('SELECT rating FROM hub_plugin_reviews WHERE plugin_id = ? AND is_active = 1').all(req.params.id)
    res.json({
      ...row,
      keywords: row.keywords ? row.keywords.split(',').filter(Boolean) : [],
      reviewSummary: summarize(all),
    })
  }
)

/**
 * 下架自己发布的插件
 * DELETE /api/plugins/:id   body: { clientId }
 */
router.delete('/:id',
  [param('id').matches(ID_RE), body('clientId').isString().trim().isLength({ min: 8, max: 64 })],
  (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ error: '参数错误', details: errors.array() })
    const row = db.prepare('SELECT id, client_id FROM hub_plugins WHERE id = ? AND is_active = 1').get(req.params.id)
    if (!row) return res.status(404).json({ error: '插件不存在' })
    if (!row.client_id || row.client_id !== req.body.clientId) return res.status(403).json({ error: '无权下架此插件' })
    db.prepare('UPDATE hub_plugins SET is_active = 0 WHERE id = ?').run(req.params.id)
    res.json({ success: true, message: '插件已下架' })
  }
)

export default router
