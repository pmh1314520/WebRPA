/* 临时 i18n 覆盖率检查脚本：
   1) 从 uiI18nDict.ts / i18n.js 解析出 DICT(精确) 与 PHRASES(子串)
   2) 扫描源码中所有含中文的“可渲染”字符串(JSX 文本 + 目标属性 + 字符串字面量)
   3) 用与运行时一致的 translate 逻辑模拟翻译，报告翻译后仍残留中文的条目
   用法: node scripts/i18n-check.cjs editor | launcher
*/
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const hasCJK = (s) => /[\u3400-\u9fff\uf900-\ufaff]/.test(s)

// 解析 'key': 'value' 形式的成对项（支持转义、单/双引号）
function extractPairs(text) {
  const pairs = []
  const re = /(['"])((?:\\.|(?!\1).)*?)\1\s*:\s*(['"])((?:\\.|(?!\3).)*?)\3/g
  let m
  while ((m = re.exec(text))) {
    const k = m[2]
    if (hasCJK(k)) pairs.push([unescapeJs(k), m[4]])
  }
  return pairs
}
function unescapeJs(s) {
  return s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
          .replace(/\\(['"\\])/g, '$1')
}

function buildDict(filePath, dictName, phraseName) {
  const text = fs.readFileSync(filePath, 'utf8')
  // 标记每个赋值区段属于 DICT 还是 PHRASES：按出现位置切分
  const markerRe = new RegExp(`(?:(?:export\\s+)?const\\s+(${dictName}|${phraseName})\\b)|(?:Object\\.assign\\(\\s*(${dictName}|${phraseName})\\b)`, 'g')
  const markers = []
  let mm
  while ((mm = markerRe.exec(text))) markers.push({ idx: mm.index, name: mm[1] || mm[2] })
  markers.sort((a, b) => a.idx - b.idx)
  const DICT = {}
  const PHRASES = {}
  // 对每对 'k':'v'，归属到其之前最近的 marker
  const pairRe = /(['"])((?:\\.|(?!\1).)*?)\1\s*:\s*(['"])((?:\\.|(?!\3).)*?)\3/g
  let p
  while ((p = pairRe.exec(text))) {
    const k = p[2]
    if (!hasCJK(k)) continue
    let owner = null
    for (const mk of markers) { if (mk.idx < p.index) owner = mk.name; else break }
    const key = unescapeJs(k)
    if (owner === dictName) DICT[key] = p[4]
    else if (owner === phraseName) PHRASES[key] = p[4]
  }
  const PHRASE_PAIRS = Object.entries(PHRASES).sort((a, b) => b[0].length - a[0].length)
  return { DICT, PHRASE_PAIRS }
}

function translate(zh, DICT, PHRASE_PAIRS) {
  const key = zh.trim()
  if (DICT[key] !== undefined) return zh.replace(key, DICT[key])
  if (!hasCJK(zh)) return zh
  let out = zh
  for (const [z, e] of PHRASE_PAIRS) { if (out.indexOf(z) !== -1) out = out.split(z).join(e) }
  return out.replace(/[ \t]{2,}/g, ' ')
}

// 去掉注释 + console.* 调试输出（不渲染，避免误报），降低噪声
function stripComments(code) {
  let out = code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1') // 避免误伤 http://
  // 去掉 console.log/info/warn/error/debug(...) 整段调用（含跨行参数，尽量贪婪到行尾分号）
  out = out.replace(/console\.(log|info|warn|error|debug)\s*\([\s\S]*?\)\s*;?/g, '')
  return out
}

function walkFiles(dir, exts, out) {
  for (const name of fs.readdirSync(dir)) {
    const fp = path.join(dir, name)
    const st = fs.statSync(fp)
    if (st.isDirectory()) {
      if (/node_modules|dist|\.git|target/.test(name)) continue
      walkFiles(fp, exts, out)
    } else if (exts.some((e) => name.endsWith(e))) {
      out.push(fp)
    }
  }
}

// 提取候选中文串：仅捕获真正会渲染的可见文本（JSX 文本 + 目标属性）
function extractCandidates(code) {
  const set = new Set()
  // JSX 文本节点（不含大括号表达式/标签）
  const jsxRe = />\s*([^<>{}]*?[\u4e00-\u9fff][^<>{}]*?)\s*</g
  let m
  while ((m = jsxRe.exec(code))) { const t = m[1].trim(); if (t && hasCJK(t)) set.add(t) }
  // 目标属性（占位符/标题/标签等）
  const attrRe = /(?:placeholder|title|data-tip|aria-label|alt|label|tip|tooltip)\s*=\s*(['"])((?:\\.|(?!\1).)*?)\1/g
  while ((m = attrRe.exec(code))) { const t = m[2].trim(); if (t && hasCJK(t)) set.add(t) }
  return [...set]
}

const target = process.argv[2] || 'editor'
let dict, dirs, exts
if (target === 'launcher') {
  dict = buildDict(path.join(ROOT, 'launcher/src/i18n.js'), 'DICT', 'PHRASES')
  dirs = [path.join(ROOT, 'launcher/src')]
  exts = ['.vue', '.js', '.ts']
} else {
  dict = buildDict(path.join(ROOT, 'frontend/src/lib/uiI18nDict.ts'), 'UI_DICT', 'PHRASES')
  dirs = [path.join(ROOT, 'frontend/src')]
  exts = ['.tsx', '.ts']
}

console.log(`[${target}] DICT entries: ${Object.keys(dict.DICT).length}, PHRASES: ${dict.PHRASE_PAIRS.length}`)

const files = []
for (const d of dirs) walkFiles(d, exts, files)

const gaps = new Map() // file -> Set(original)
for (const fp of files) {
  let code = fs.readFileSync(fp, 'utf8')
  if (/uiI18nDict\.ts$|i18n\.js$/.test(fp)) continue
  code = stripComments(code)
  for (const cand of extractCandidates(code)) {
    // 可见文本：只要没有“整句精确”英文译文，就列为待翻译（不靠短语兜底拼凑）
    if (dict.DICT[cand.trim()] !== undefined) continue
    const rel = path.relative(ROOT, fp)
    if (!gaps.has(rel)) gaps.set(rel, new Set())
    gaps.get(rel).add(cand)
  }
}

const fileEntries = [...gaps.entries()].sort((a, b) => b[1].size - a[1].size)
let total = 0
const lines = []
for (const [rel, set] of fileEntries) {
  total += set.size
  lines.push(`\n### ${rel}  (${set.size})`)
  for (const s of [...set].sort()) lines.push(`「${s}」`)
}
const outPath = path.join(ROOT, `scripts/i18n-gaps-${target}.txt`)
fs.writeFileSync(outPath, `可见待翻译(无精确英文)总数: ${total}\n` + lines.join('\n'), 'utf8')
console.log(`[${target}] visibleNeedingExact=${total}; files=${fileEntries.length}; written to ${path.relative(ROOT, outPath)}`)
