/* ============================================================
   WebRPA 多语言完整性审计脚本（需求 7 / 设计 Property 14、15）
   —— 本脚本为「先红」核验工具：只列缺口，不做任何修复。

   导出：
     - findUntranslatedChinese(): { file, line, text }[]
         扫描 frontend/src 下的中文字符串字面量，复刻运行时翻译层
         （UI_DICT 整句 + PHRASES 短语兜底）的判定逻辑，返回英文模式下
         仍会残留中文的清单。
     - findDuplicateUiDictKeys(): string[]
         解析 uiI18nDict.ts 中 UI_DICT 的全部 key（含多段 Object.assign），
         返回重复 key（tsc TS1117 隐患）。
     - buildReport(): 汇总报告对象。

   运行方式（cwd = frontend）：
     node scripts/audit-i18n.mjs
   或使用项目内置 node：
     ..\nodejs\node.exe scripts/audit-i18n.mjs
   ============================================================ */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FRONTEND_DIR = path.resolve(__dirname, '..')
const SRC_DIR = path.join(FRONTEND_DIR, 'src')
const DICT_PATH = path.join(SRC_DIR, 'lib', 'uiI18nDict.ts')

// 任务约定的中文检测范围
const CHINESE_RE = /[\u4e00-\u9fff]/
// 运行时翻译层 hasCJK 使用的范围（uiI18n.ts），用于精确复刻短语兜底触发条件
const RUNTIME_CJK_RE = /[\u4e00-\u9fa5]/

// 不参与残留扫描的文件（翻译层自身 / 教学文档另由需求 3 处理）
const EXCLUDED_FILES = new Set([
  path.join(SRC_DIR, 'lib', 'uiI18nDict.ts'),
  path.join(SRC_DIR, 'lib', 'uiI18n.ts'),
])

// ============================================================
// 词法工具：注释感知 + 字符串字面量 / 正则字面量识别
// ============================================================

// 判断 '/' 处于「正则上下文」还是「除法」：看上一个有效（非空白）代码字符。
const REGEX_PREFIX = new Set([
  '', '(', ',', '=', ':', '[', '!', '&', '|', '?', '+', '-', '*', '%',
  '^', '~', '<', '>', '{', '}', ';', '\n', 'return', 'typeof',
])

function isRegexContext(lastSig) {
  return REGEX_PREFIX.has(lastSig)
}

/**
 * 单遍扫描源码，跳过注释，识别字符串字面量。
 * 返回字符串字面量数组：{ value, line, prev }
 *   value: 字面量内容（转义符按「去反斜杠保留后随字符」简化处理，足够用于中文判定与翻译）
 *   line : 字面量起始行号（1 基）
 *   prev : 该字面量前最多 60 个代码字符（用于识别 console.* 等上下文）
 */
function scanStringLiterals(src) {
  const out = []
  const n = src.length
  let i = 0
  let line = 1
  let lastSig = '' // 最近一个非空白「代码」字符
  let prevBuf = '' // 滚动代码缓冲

  const pushCode = (ch) => {
    prevBuf += ch
    if (prevBuf.length > 60) prevBuf = prevBuf.slice(-60)
    if (ch !== ' ' && ch !== '\t' && ch !== '\r' && ch !== '\n') lastSig = ch
  }

  while (i < n) {
    const c = src[i]

    if (c === '\n') { line++; prevBuf += '\n'; if (prevBuf.length > 60) prevBuf = prevBuf.slice(-60); i++; continue }

    // 行注释
    if (c === '/' && src[i + 1] === '/') {
      i += 2
      while (i < n && src[i] !== '\n') i++
      continue
    }
    // 块注释
    if (c === '/' && src[i + 1] === '*') {
      i += 2
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') line++; i++ }
      i += 2
      continue
    }
    // 正则字面量（避免其中的引号被误判为字符串起点）
    if (c === '/' && isRegexContext(lastSig)) {
      i++
      let inClass = false
      while (i < n) {
        const d = src[i]
        if (d === '\\') { i += 2; continue }
        if (d === '\n') break // 正则不跨行，异常则退出
        if (d === '[') inClass = true
        else if (d === ']') inClass = false
        else if (d === '/' && !inClass) { i++; break }
        i++
      }
      while (i < n && /[a-z]/i.test(src[i])) i++ // flags
      lastSig = '/'
      continue
    }

    // 字符串字面量
    if (c === "'" || c === '"' || c === '`') {
      const quote = c
      const startLine = line
      const prev = prevBuf
      i++
      let val = ''
      while (i < n) {
        const d = src[i]
        if (d === '\\') { if (i + 1 < n) val += src[i + 1]; i += 2; continue }
        if (d === quote) { i++; break }
        if (d === '\n') {
          line++
          if (quote !== '`') break // 普通字符串不应跨行；解析器去同步时及时止损
          val += d; i++; continue
        }
        val += d
        i++
      }
      out.push({ value: val, line: startLine, prev })
      lastSig = quote
      prevBuf = '' // 字符串结束后重置上下文缓冲
      continue
    }

    pushCode(c)
    i++
  }
  return out
}

/** 去除注释，返回与原文等长结构无关、仅供字典 key/value 提取的纯代码文本。 */
function stripComments(src) {
  const n = src.length
  let i = 0
  let res = ''
  let lastSig = ''
  while (i < n) {
    const c = src[i]
    if (c === '/' && src[i + 1] === '/') { i += 2; while (i < n && src[i] !== '\n') i++; continue }
    if (c === '/' && src[i + 1] === '*') { i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; res += ' '; continue }
    if (c === '/' && isRegexContext(lastSig)) {
      res += c; i++
      let inClass = false
      while (i < n) {
        const d = src[i]
        if (d === '\\') { res += d + (src[i + 1] || ''); i += 2; continue }
        if (d === '\n') break
        if (d === '[') inClass = true
        else if (d === ']') inClass = false
        res += d
        if (d === '/' && !inClass) { i++; break }
        i++
      }
      while (i < n && /[a-z]/i.test(src[i])) { res += src[i]; i++ }
      lastSig = '/'
      continue
    }
    if (c === "'" || c === '"' || c === '`') {
      const quote = c
      res += c; i++
      while (i < n) {
        const d = src[i]
        res += d
        if (d === '\\') { if (i + 1 < n) res += src[i + 1]; i += 2; continue }
        i++
        if (d === quote) break
      }
      lastSig = quote
      continue
    }
    res += c
    if (c !== ' ' && c !== '\t' && c !== '\r' && c !== '\n') lastSig = c
    i++
  }
  return res
}

// ============================================================
// 字典解析：从 uiI18nDict.ts 提取 UI_DICT / PHRASES 的键值
//   —— 纯正则 + 括号配对解析，绝不 import TS。
// ============================================================

/**
 * 从 src（建议已去注释）中，定位 openIndex 处 '{' 的配对 '}'，
 * 返回其内部内容（不含外层花括号）。字符串感知，避免串内花括号干扰。
 */
function matchBraceBody(src, openIndex) {
  const n = src.length
  let depth = 0
  let i = openIndex
  while (i < n) {
    const c = src[i]
    if (c === "'" || c === '"' || c === '`') {
      const q = c
      i++
      while (i < n) {
        const d = src[i]
        if (d === '\\') { i += 2; continue }
        if (d === q) { i++; break }
        i++
      }
      continue
    }
    if (c === '{') depth++
    else if (c === '}') { depth--; if (depth === 0) return src.slice(openIndex + 1, i) }
    i++
  }
  return src.slice(openIndex + 1)
}

/** 返回 src 中从 fromIndex 起第一个 '{' 的下标；找不到返回 -1。 */
function nextBrace(src, fromIndex) {
  for (let i = fromIndex; i < src.length; i++) if (src[i] === '{') return i
  return -1
}

/**
 * 提取对象字面量 body 顶层的「键」：字符串字面量且其后（跳空白）紧跟 ':'。
 * 字符串感知 + 括号/方括号深度跟踪，避免把值串或嵌套结构误判为键。
 * 返回键内容数组（按出现顺序，含重复）。
 */
function extractTopLevelKeys(body) {
  const keys = []
  const n = body.length
  let i = 0
  let depth = 0 // body 内部相对深度，0 表示对象顶层
  while (i < n) {
    const c = body[i]
    if (c === '{' || c === '[' || c === '(') { depth++; i++; continue }
    if (c === '}' || c === ']' || c === ')') { depth--; i++; continue }
    if (c === "'" || c === '"' || c === '`') {
      const q = c
      let j = i + 1
      let val = ''
      while (j < n) {
        const d = body[j]
        if (d === '\\') { if (j + 1 < n) val += body[j + 1]; j += 2; continue }
        if (d === q) { j++; break }
        val += d
        j++
      }
      if (depth === 0) {
        let k = j
        while (k < n && /\s/.test(body[k])) k++
        if (body[k] === ':') keys.push(val)
      }
      i = j
      continue
    }
    i++
  }
  return keys
}

/**
 * 提取对象字面量 body 顶层的「键值对」：键串 + 紧随其后的值串（仅取字符串值，
 * 满足本字典「值恒为字符串」的结构）。返回 [key, value][]（按出现顺序，含重复）。
 */
function extractTopLevelPairs(body) {
  const pairs = []
  const n = body.length
  let i = 0
  let depth = 0
  let pendingKey = null
  while (i < n) {
    const c = body[i]
    if (c === '{' || c === '[' || c === '(') { depth++; i++; continue }
    if (c === '}' || c === ']' || c === ')') { depth--; i++; continue }
    if (c === "'" || c === '"' || c === '`') {
      const q = c
      let j = i + 1
      let val = ''
      while (j < n) {
        const d = body[j]
        if (d === '\\') {
          // 处理常见转义：\u xxxx / \n / \' / \" 等。\uXXXX 需还原为真实字符以便中文判定。
          const e = body[j + 1]
          if (e === 'u' && /[0-9a-fA-F]{4}/.test(body.slice(j + 2, j + 6))) {
            val += String.fromCharCode(parseInt(body.slice(j + 2, j + 6), 16))
            j += 6
            continue
          }
          if (e === 'n') { val += '\n'; j += 2; continue }
          if (e === 't') { val += '\t'; j += 2; continue }
          if (e !== undefined) { val += e; j += 2; continue }
          j += 2
          continue
        }
        if (d === q) { j++; break }
        val += d
        j++
      }
      if (depth === 0) {
        let k = j
        while (k < n && /\s/.test(body[k])) k++
        if (body[k] === ':') {
          pendingKey = val
        } else if (pendingKey !== null) {
          pairs.push([pendingKey, val])
          pendingKey = null
        }
      }
      i = j
      continue
    }
    i++
  }
  return pairs
}

/**
 * 解析 uiI18nDict.ts，返回：
 *   uiKeyList   : UI_DICT 全部键（含重复，按出现顺序，跨所有 Object.assign 段）
 *   uiDict      : 合并后的 UI_DICT（后写覆盖，模拟运行时 JS 语义）
 *   phrases     : 合并后的 PHRASES
 */
function parseDict() {
  const raw = fs.readFileSync(DICT_PATH, 'utf8')
  const src = stripComments(raw)

  const collectBodies = (markerRe) => {
    const bodies = []
    let m
    markerRe.lastIndex = 0
    while ((m = markerRe.exec(src)) !== null) {
      const brace = nextBrace(src, markerRe.lastIndex)
      if (brace === -1) continue
      bodies.push(matchBraceBody(src, brace))
    }
    return bodies
  }

  // UI_DICT：初始定义 + 所有 Object.assign(UI_DICT, {...})
  const uiBodies = [
    ...collectBodies(/export\s+const\s+UI_DICT\b[^=]*=\s*/g),
    ...collectBodies(/Object\.assign\(\s*UI_DICT\s*,\s*/g),
  ]
  // PHRASES：初始定义 + 所有 Object.assign(PHRASES, {...})
  const phraseBodies = [
    ...collectBodies(/export\s+const\s+PHRASES\b[^=]*=\s*/g),
    ...collectBodies(/Object\.assign\(\s*PHRASES\s*,\s*/g),
  ]

  const uiKeyList = []
  const uiKeyBlocks = [] // 每个 UI_DICT 字面量块各自的 key 列表（用于区分块内重复 = 真 TS1117）
  const uiDict = {}
  for (const body of uiBodies) {
    const blockKeys = extractTopLevelKeys(body)
    uiKeyBlocks.push(blockKeys)
    for (const k of blockKeys) uiKeyList.push(k)
    for (const [k, v] of extractTopLevelPairs(body)) uiDict[k] = v
  }
  const phrases = {}
  for (const body of phraseBodies) {
    for (const [k, v] of extractTopLevelPairs(body)) phrases[k] = v
  }

  return { uiKeyList, uiKeyBlocks, uiDict, phrases }
}

// ============================================================
// Property 15：UI_DICT 无重复 key（TS1117 隐患，最关键产物）
// ============================================================

/**
 * 解析 UI_DICT 的全部 key（含初始定义与所有 Object.assign 段），
 * 返回重复出现（>=2 次）的 key 清单：{ key, count, intraBlock }[]，按出现次数降序。
 *   intraBlock=true 表示该 key 在「同一个对象字面量块」内重复出现，
 *                   即真正会触发 tsc TS1117 的编译错误；
 *   intraBlock=false 表示跨 Object.assign 块的重复（运行时静默覆盖，
 *                   后写胜出 —— 属合并隐患，6.2 需去重但当前不报 TS1117）。
 */
function findDuplicateUiDictKeys() {
  const { uiKeyList, uiKeyBlocks } = parseDict()
  const counts = new Map()
  for (const k of uiKeyList) counts.set(k, (counts.get(k) || 0) + 1)
  // 块内重复集合：某 key 在任一单块内出现 >=2 次 → 真 TS1117
  const intra = new Set()
  for (const block of uiKeyBlocks) {
    const seen = new Set()
    for (const k of block) {
      if (seen.has(k)) intra.add(k)
      seen.add(k)
    }
  }
  const dups = []
  for (const [key, count] of counts) {
    if (count >= 2) dups.push({ key, count, intraBlock: intra.has(key) })
  }
  // 真 TS1117（块内重复）排在最前，其次按出现次数降序
  dups.sort((a, b) =>
    Number(b.intraBlock) - Number(a.intraBlock) || b.count - a.count || a.key.localeCompare(b.key)
  )
  return dups
}

// ============================================================
// Property 14：英文模式无中文残留
//   复刻 uiI18n.ts 的 translateString：UI_DICT 整句命中 → 折叠空白再命中
//   → PHRASES 短语兜底（按 key 长度降序）。结果仍含中文即为残留。
// ============================================================

let _translatorCache = null

function getTranslator() {
  if (_translatorCache) return _translatorCache
  const { uiDict, phrases } = parseDict()
  const phrasePairs = Object.entries(phrases).sort((a, b) => b[0].length - a[0].length)
  const translate = (zh) => {
    const key = zh.trim()
    // 1) 整句精确匹配
    if (uiDict[key] !== undefined) return zh.replace(key, uiDict[key])
    // 1b) 折叠内部空白后再尝试整句匹配
    const collapsed = key.replace(/\s+/g, ' ')
    if (collapsed !== key && uiDict[collapsed] !== undefined) return uiDict[collapsed]
    // 2) 短语级替换（仅当仍含 CJK 时触发，复刻 hasCJK 判断）
    if (!RUNTIME_CJK_RE.test(zh)) return zh
    let out = zh
    for (const [zhP, enP] of phrasePairs) {
      if (out.indexOf(zhP) !== -1) out = out.split(zhP).join(enP)
    }
    return out.replace(/[ \t]{2,}/g, ' ')
  }
  _translatorCache = { translate, uiDict, phrases }
  return _translatorCache
}

/** 递归枚举目录下的 .ts/.tsx 源文件（跳过 node_modules / dist 等）。 */
function enumerateSourceFiles(dir) {
  const out = []
  const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.vite', '__tests__'])
  const walk = (d) => {
    let entries
    try { entries = fs.readdirSync(d, { withFileTypes: true }) } catch { return }
    for (const ent of entries) {
      const full = path.join(d, ent.name)
      if (ent.isDirectory()) {
        if (SKIP_DIRS.has(ent.name)) continue
        walk(full)
      } else if (ent.isFile() && /\.(ts|tsx)$/.test(ent.name)) {
        out.push(full)
      }
    }
  }
  walk(dir)
  return out
}

/**
 * 计算文件中被 i18n 豁免标记包裹的行区间。
 * 标记（行注释形式）：
 *   // @i18n-ignore-start  <原因说明>
 *   ...（这些行内的中文字符串字面量不计入残留，用于纯搜索关键词/拼音别名等非界面数据）
 *   // @i18n-ignore-end
 * 返回 [startLine, endLine] 闭区间数组（1 基行号）。
 */
function computeIgnoreRanges(src) {
  const ranges = []
  const lines = src.split('\n')
  let start = -1
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i]
    if (/\/\/\s*@i18n-ignore-start\b/.test(ln)) start = i + 1
    else if (/\/\/\s*@i18n-ignore-end\b/.test(ln)) {
      if (start !== -1) { ranges.push([start, i + 1]); start = -1 }
    }
  }
  return ranges
}

function lineInRanges(line, ranges) {
  for (const [s, e] of ranges) if (line >= s && line <= e) return true
  return false
}

/** 判断某文件是否排除在残留扫描之外。 */
function isExcludedFile(absPath) {
  if (EXCLUDED_FILES.has(absPath)) return true
  const base = path.basename(absPath)
  // 教学文档（content-*.ts / content-*.en.ts）另由需求 3 处理
  if (/^content-.*\.tsx?$/.test(base)) return true
  // 测试文件不计入界面残留
  if (/\.(test|spec)\.tsx?$/.test(base)) return true
  // 类型声明文件
  if (base.endsWith('.d.ts')) return true
  return false
}

/** 判断某字符串字面量是否属于日志 / console 上下文（其 prev 代码缓冲尾部）。 */
function isLogContext(prev) {
  // console.log / warn / error / info / debug / trace（允许 prev 尾部还有别的参数）
  if (/console\s*\.\s*(log|warn|error|info|debug|trace|group|table|assert)\b/.test(prev)) return true
  // 常见日志器：logger.xxx( / log.xxx(
  if (/\b(logger|log)\s*\.\s*(log|warn|error|info|debug|trace)\s*\(\s*$/.test(prev)) return true
  return false
}

/**
 * 扫描 frontend/src 下含中文的字符串字面量，复刻运行时翻译层，
 * 返回英文模式下仍残留中文的清单：{ file, line, text }[]。
 */
function findUntranslatedChinese() {
  const { translate } = getTranslator()
  const files = enumerateSourceFiles(SRC_DIR)
  const residuals = []
  for (const file of files) {
    if (isExcludedFile(file)) continue
    let src
    try { src = fs.readFileSync(file, 'utf8') } catch { continue }
    if (!CHINESE_RE.test(src)) continue
    const ignoreRanges = computeIgnoreRanges(src)
    const literals = scanStringLiterals(src)
    for (const lit of literals) {
      if (!CHINESE_RE.test(lit.value)) continue
      if (isLogContext(lit.prev)) continue
      if (lineInRanges(lit.line, ignoreRanges)) continue
      const translated = translate(lit.value)
      if (CHINESE_RE.test(translated)) {
        residuals.push({
          file: path.relative(FRONTEND_DIR, file).replace(/\\/g, '/'),
          line: lit.line,
          text: lit.value.length > 80 ? lit.value.slice(0, 80) + '…' : lit.value,
          full: lit.value,
        })
      }
    }
  }
  return residuals
}

// ============================================================
// 报告入口
// ============================================================

function buildReport() {
  const duplicateKeys = findDuplicateUiDictKeys()
  const residuals = findUntranslatedChinese()
  return { duplicateKeys, residuals }
}

function main() {
  const out = []
  const log = (s) => out.push(s)

  log('========================================')
  log('  WebRPA 多语言完整性核验报告 (Task 6.1)')
  log('========================================')

  const { duplicateKeys, residuals } = buildReport()

  // --- Property 15: UI_DICT 无重复 key ---
  log('')
  log('[Property 15] UI_DICT 无重复 key（防 tsc TS1117）')
  if (duplicateKeys.length === 0) {
    log('  PASS: UI_DICT 未发现重复 key')
  } else {
    const intra = duplicateKeys.filter((d) => d.intraBlock)
    const cross = duplicateKeys.filter((d) => !d.intraBlock)
    const total = duplicateKeys.reduce((s, d) => s + d.count, 0)
    log('  FAIL: 共 ' + duplicateKeys.length + ' 个 key 重复（累计 ' + total + ' 处定义）')
    log('    其中块内重复(真 TS1117 编译错误): ' + intra.length + ' 个')
    log('    其中跨块重复(运行时静默覆盖，合并隐患): ' + cross.length + ' 个')
    log('  完整清单:')
    for (const d of duplicateKeys) {
      log('    - "' + d.key + '"  x' + d.count + (d.intraBlock ? '  [块内/TS1117]' : '  [跨块/覆盖]'))
    }
  }

  // --- Property 14: 英文模式无中文残留 ---
  log('')
  log('[Property 14] 英文模式无中文残留（UI_DICT 整句 + PHRASES 兜底后仍含中文）')
  if (residuals.length === 0) {
    log('  PASS: 未发现无法翻译的中文字符串字面量')
  } else {
    // 按文件聚合数量
    const byFile = new Map()
    for (const r of residuals) byFile.set(r.file, (byFile.get(r.file) || 0) + 1)
    log('  FAIL: 共 ' + residuals.length + ' 处残留中文，分布于 ' + byFile.size + ' 个文件')
    const sorted = [...byFile.entries()].sort((a, b) => b[1] - a[1])
    log('  按文件分布 (前 30):')
    for (const [file, count] of sorted.slice(0, 30)) log('    - ' + file + ': ' + count + ' 处')
    log('  样例 (前 40 条):')
    for (const r of residuals.slice(0, 40)) log('    - ' + r.file + ':' + r.line + '  ' + r.text)
  }

  // --- 汇总 ---
  const hasGap = duplicateKeys.length > 0 || residuals.length > 0
  log('')
  log('[结论]')
  log('  Property 15 (无重复 key): ' + (duplicateKeys.length === 0 ? 'PASS' : 'FAIL(' + duplicateKeys.length + ')'))
  log('  Property 14 (无中文残留): ' + (residuals.length === 0 ? 'PASS' : 'FAIL(' + residuals.length + ')'))
  log('  总判定: ' + (hasGap ? 'RED (存在缺口，待 6.2 修复)' : 'GREEN'))
  log('========================================')

  process.stdout.write(out.join('\n') + '\n')
  process.exitCode = hasGap ? 1 : 0
}

// 仅在被直接执行时运行 main（被 import 时只暴露纯函数）。
const isMain = (() => {
  try { return import.meta.url === pathToFileURL(process.argv[1]).href } catch { return true }
})()
if (isMain) main()

export { findUntranslatedChinese, findDuplicateUiDictKeys, buildReport, parseDict }
