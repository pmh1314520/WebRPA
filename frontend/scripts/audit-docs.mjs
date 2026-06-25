// @ts-check
/**
 * 教学文档结构核验脚本（Task 7.1，先红工具）
 *
 * 扫描 frontend/src/components/workflow/documentation/，做四类断言并打印报告：
 *  - Property 16：每个 content-x.ts 都有对应的 content-x.en.ts（无孤儿中文文档）。
 *  - documents.ts 文档主题是否覆盖 moduleCategories 全部分类（列出未被任何文档覆盖的分类）。
 *  - Property 17：文档内容（含 documents.ts 标题）不含 Emoji 码点。
 *  - 尽力而为标注：文档提到但已从注册表移除的功能、功能已存在但文档未覆盖。
 *
 * 运行（项目内置 node）：
 *   ..\nodejs\node.exe scripts/audit-docs.mjs        （cwd = frontend）
 * 或：
 *   node scripts/audit-docs.mjs
 *
 * 约束：本脚本本身禁止输出 Emoji。退出码：发现任一硬性缺口（孤儿文档 / Emoji）返回 1，否则返回 0。
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FRONTEND_ROOT = resolve(__dirname, '..')
const DOC_DIR = join(FRONTEND_ROOT, 'src', 'components', 'workflow', 'documentation')
const SIDEBAR_FILE = join(FRONTEND_ROOT, 'src', 'components', 'workflow', 'ModuleSidebar.tsx')

// Emoji 码点检测：Extended_Pictographic 覆盖绝大多数表情，叠加任务指定的显式区段做兜底。
const EMOJI_RE =
  /(\p{Extended_Pictographic}|[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}])/gu

/** 读取文件文本（UTF-8）。 */
function readText(path) {
  return readFileSync(path, 'utf8')
}

/** 把字符索引转换为 1 基行号。 */
function indexToLine(text, index) {
  let line = 1
  for (let i = 0; i < index && i < text.length; i++) {
    if (text[i] === '\n') line++
  }
  return line
}

/** 扫描文本中的 Emoji 出现位置（去重到「码点 + 行号」粒度，统计总数）。 */
function scanEmoji(file, text) {
  const occ = []
  EMOJI_RE.lastIndex = 0
  let m
  while ((m = EMOJI_RE.exec(text)) !== null) {
    const ch = m[0]
    // 跳过单纯的变体选择符 / 零宽连接符自身（它们附着在表情上，避免重复计数无意义字符）
    if (ch === '\uFE0F' || ch === '\u200D') continue
    occ.push({ file, line: indexToLine(text, m.index), codePoint: 'U+' + ch.codePointAt(0).toString(16).toUpperCase() })
  }
  return occ
}

// ---------------------------------------------------------------------------
// 1. 枚举文档文件，区分中文版与英文版
// ---------------------------------------------------------------------------

/** 返回 { zhBases: string[], enBases: Set<string>, zhFiles: Map<base, absPath> } */
function enumerateDocFiles() {
  const entries = readdirSync(DOC_DIR)
  const zhFiles = new Map()
  const enBases = new Set()
  for (const name of entries) {
    if (!name.startsWith('content-') || !name.endsWith('.ts')) continue
    const base = name.replace(/\.ts$/, '')
    if (base.endsWith('.en')) {
      enBases.add(base.replace(/\.en$/, ''))
    } else {
      zhFiles.set(base, join(DOC_DIR, name))
    }
  }
  const zhBases = [...zhFiles.keys()].sort()
  return { zhBases, enBases, zhFiles }
}

// ---------------------------------------------------------------------------
// 2. 解析 documents.ts（文档主题：id / title / description）
// ---------------------------------------------------------------------------

function parseDocuments() {
  const path = join(DOC_DIR, 'documents.ts')
  const text = readText(path)
  const items = []
  const re = /id:\s*'([^']+)',\s*title:\s*'([^']*)',\s*icon:\s*[A-Za-z0-9_]+,\s*description:\s*'([^']*)'/g
  let m
  while ((m = re.exec(text)) !== null) {
    items.push({ id: m[1], title: m[2], description: m[3] })
  }
  return { path, text, items }
}

// ---------------------------------------------------------------------------
// 3. 解析 ModuleSidebar.tsx 的 moduleCategories（分类名 + 模块 type 集合）
// ---------------------------------------------------------------------------

function parseModuleCategories() {
  const text = readText(SIDEBAR_FILE)
  const start = text.indexOf('const moduleCategories = [')
  if (start === -1) throw new Error('moduleCategories 未找到')
  // 截取从定义开始到文件末尾的片段即可（正则按分类对象逐个匹配，不依赖精确结束位置）
  const region = text.slice(start)
  const categories = []
  const allTypes = new Set()
  const catRe = /name:\s*'([^']+)',\s*color:\s*'[^']+',\s*modules:\s*\[([\s\S]*?)\]\s*as ModuleType\[\]/g
  let m
  while ((m = catRe.exec(region)) !== null) {
    const name = m[1]
    const body = m[2]
    const types = []
    const tokenRe = /'([a-zA-Z0-9_]+)'/g
    let t
    while ((t = tokenRe.exec(body)) !== null) {
      types.push(t[1])
      allTypes.add(t[1])
    }
    categories.push({ name, types })
  }
  return { categories, allTypes }
}

// ---------------------------------------------------------------------------
// 4. 组合所有中文文档正文（用于覆盖率 / type 出现性判断）
// ---------------------------------------------------------------------------

function buildCombinedDocText(zhFiles) {
  let combined = ''
  for (const path of zhFiles.values()) {
    combined += '\n' + readText(path)
  }
  return combined
}

/** 在文档正文中以「单词边界」方式判断某个 module type 字符串是否出现。 */
function typeAppears(combined, type) {
  // 用前后非标识符字符约束，避免 list 命中 list_get 这类子串误判
  const re = new RegExp('(^|[^a-zA-Z0-9_])' + type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-zA-Z0-9_]|$)')
  return re.test(combined)
}

// ---------------------------------------------------------------------------
// 5. 核验与报告
// ---------------------------------------------------------------------------

function main() {
  const out = []
  const log = (s) => out.push(s)

  log('========================================')
  log('  WebRPA 教学文档结构核验报告 (Task 7.1)')
  log('========================================')

  const { zhBases, enBases, zhFiles } = enumerateDocFiles()
  const { items: docItems, text: documentsText } = parseDocuments()
  const { categories, allTypes } = parseModuleCategories()
  const combined = buildCombinedDocText(zhFiles)

  log('')
  log('[概览]')
  log('  中文文档数: ' + zhBases.length)
  log('  英文文档数: ' + enBases.size)
  log('  documents.ts 主题数: ' + docItems.length)
  log('  moduleCategories 分类数: ' + categories.length)
  log('  注册表模块 type 总数: ' + allTypes.size)

  // --- Property 16: 中英成对，无孤儿中文文档 ---
  const orphans = zhBases.filter((b) => !enBases.has(b))
  log('')
  log('[Property 16] 教学文档中英成对（无孤儿中文文档）')
  if (orphans.length === 0) {
    log('  PASS: 每个 content-x.ts 都有对应的 content-x.en.ts')
  } else {
    log('  FAIL: 以下中文文档缺少对应英文版 (.en.ts)，共 ' + orphans.length + ' 篇:')
    for (const b of orphans) log('    - ' + b + '.ts  (缺 ' + b + '.en.ts)')
  }
  // 反向：有英文版但无中文版（孤儿英文）
  const enOrphans = [...enBases].filter((b) => !zhFiles.has(b)).sort()
  if (enOrphans.length > 0) {
    log('  注意: 以下英文文档无对应中文版:')
    for (const b of enOrphans) log('    - ' + b + '.en.ts  (缺 ' + b + '.ts)')
  }

  // --- 文档主题覆盖 moduleCategories 全部分类 ---
  log('')
  log('[覆盖] documents.ts 文档主题是否覆盖 moduleCategories 全部分类')
  const docHaystack = (documentsText + '\n' + combined)
  const uncoveredCategories = []
  for (const cat of categories) {
    // 覆盖判定：分类名出现在文档中，或该分类任一模块 type 出现在文档正文中
    const nameHit = docHaystack.includes(cat.name)
    const typeHit = cat.types.some((t) => typeAppears(combined, t))
    if (!nameHit && !typeHit) uncoveredCategories.push(cat.name)
  }
  if (uncoveredCategories.length === 0) {
    log('  PASS: 每个分类都至少被一篇文档覆盖')
  } else {
    log('  GAP: 以下分类未被任何文档覆盖，共 ' + uncoveredCategories.length + ' 个:')
    for (const n of uncoveredCategories) log('    - ' + n)
  }

  // --- Property 17: 文档无 Emoji ---
  log('')
  log('[Property 17] 文档无 Emoji 码点')
  const emojiOcc = []
  // 扫描 documents.ts（标题/描述里常有 Emoji）
  emojiOcc.push(...scanEmoji('documents.ts', documentsText))
  // 扫描所有中文与英文 content 文件
  for (const [base, path] of zhFiles) {
    emojiOcc.push(...scanEmoji(base + '.ts', readText(path)))
    const enPath = join(DOC_DIR, base + '.en.ts')
    if (existsSync(enPath)) emojiOcc.push(...scanEmoji(base + '.en.ts', readText(enPath)))
  }
  if (emojiOcc.length === 0) {
    log('  PASS: 文档内容不含 Emoji 码点')
  } else {
    // 按文件聚合数量
    const byFile = new Map()
    for (const o of emojiOcc) byFile.set(o.file, (byFile.get(o.file) || 0) + 1)
    log('  FAIL: 共发现 ' + emojiOcc.length + ' 处 Emoji，分布于 ' + byFile.size + ' 个文件:')
    const sorted = [...byFile.entries()].sort((a, b) => b[1] - a[1])
    for (const [file, count] of sorted) log('    - ' + file + ': ' + count + ' 处')
    // 展示前若干条具体位置便于定位
    log('  示例位置 (前 20 条):')
    for (const o of emojiOcc.slice(0, 20)) log('    - ' + o.file + ':' + o.line + '  ' + o.codePoint)
  }

  // --- 尽力而为：文档提到但已移除 / 功能已存在但文档未覆盖 ---
  log('')
  log('[尽力而为] 文档与注册表 type 字符串交叉标注')
  // 功能已存在但文档未覆盖：注册表 type 字符串从未在文档正文出现
  const uncoveredModules = [...allTypes].filter((t) => !typeAppears(combined, t)).sort()
  log('  功能已存在但文档未覆盖 (type 未在任何文档正文出现): ' + uncoveredModules.length + ' 个')
  for (const t of uncoveredModules) log('    - ' + t)

  // 文档提到但已移除：文档中 workflow 示例的 type 字段值不在注册表内
  const stale = new Set()
  const typeFieldRe = /["']?type["']?\s*:\s*["']([a-zA-Z0-9_]+)["']/g
  let sm
  while ((sm = typeFieldRe.exec(combined)) !== null) {
    const t = sm[1]
    if (!allTypes.has(t)) stale.add(t)
  }
  const staleList = [...stale].sort()
  log('  文档提到但疑似已移除 (示例 type 字段值不在注册表): ' + staleList.length + ' 个')
  for (const t of staleList) log('    - ' + t)

  // --- 汇总 ---
  const hardFail = orphans.length > 0 || emojiOcc.length > 0
  log('')
  log('[结论]')
  log('  Property 16 (中英成对): ' + (orphans.length === 0 ? 'PASS' : 'FAIL(' + orphans.length + ')'))
  log('  Property 17 (无 Emoji): ' + (emojiOcc.length === 0 ? 'PASS' : 'FAIL(' + emojiOcc.length + ')'))
  log('  未覆盖分类: ' + uncoveredCategories.length + ' 个')
  log('  未被文档覆盖的模块: ' + uncoveredModules.length + ' 个')
  log('  疑似过时引用: ' + staleList.length + ' 个')
  log('  总判定: ' + (hardFail ? 'RED (存在硬性缺口，待 7.2 修复)' : 'GREEN'))
  log('========================================')

  process.stdout.write(out.join('\n') + '\n')
  process.exitCode = hardFail ? 1 : 0
}

main()
