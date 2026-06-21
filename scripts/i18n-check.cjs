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

function buildDict(filePath, splitMarker) {
  const text = fs.readFileSync(filePath, 'utf8')
  const idx = text.indexOf(splitMarker)
  const dictPart = idx >= 0 ? text.slice(0, idx) : text
  const phrasePart = idx >= 0 ? text.slice(idx) : ''
  const DICT = {}
  for (const [k, v] of extractPairs(dictPart)) DICT[k] = v
  const PHRASES = {}
  for (const [k, v] of extractPairs(phrasePart)) PHRASES[k] = v
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

// 去掉注释，降低误报
function stripComments(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1') // 避免误伤 http://
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

// 提取候选中文串：仅捕获真正会渲染的文本（JSX 文本 + 目标属性 + 简单引号字面量）
function extractCandidates(code) {
  const set = new Set()
  // JSX 文本节点（不含大括号表达式/标签）
  const jsxRe = />\s*([^<>{}]*?[\u4e00-\u9fff][^<>{}]*?)\s*</g
  let m
  while ((m = jsxRe.exec(code))) { const t = m[1].trim(); if (t && hasCJK(t)) set.add(t) }
  // 目标属性
  const attrRe = /(?:placeholder|title|data-tip|aria-label|alt|label|tip|tooltip)\s*=\s*(['"])((?:\\.|(?!\1).)*?)\1/g
  while ((m = attrRe.exec(code))) { const t = m[2].trim(); if (t && hasCJK(t)) set.add(t) }
  // 简单引号字符串字面量（仅单/双引号、单行、长度受限，排除明显的代码/类名）
  const litRe = /(['"])((?:\\.|(?!\1)[^\n])*?)\1/g
  while ((m = litRe.exec(code))) {
    const t = m[2].trim()
    if (!t || !hasCJK(t)) continue
    if (t.length > 80) continue
    if (/[<>]|=>|className|http/.test(t)) continue
    set.add(t)
  }
  return [...set]
}

const target = process.argv[2] || 'editor'
let dict, dirs, exts
if (target === 'launcher') {
  dict = buildDict(path.join(ROOT, 'launcher/src/i18n.js'), 'const PHRASES')
  dirs = [path.join(ROOT, 'launcher/src')]
  exts = ['.vue', '.js', '.ts']
} else {
  dict = buildDict(path.join(ROOT, 'frontend/src/lib/uiI18nDict.ts'), 'export const PHRASES')
  dirs = [path.join(ROOT, 'frontend/src')]
  exts = ['.tsx', '.ts']
}

console.log(`[${target}] DICT entries: ${Object.keys(dict.DICT).length}, PHRASES: ${dict.PHRASE_PAIRS.length}`)

const files = []
for (const d of dirs) walkFiles(d, exts, files)

const gaps = new Map() // residual-original -> Set(files)
for (const fp of files) {
  let code = fs.readFileSync(fp, 'utf8')
  // 跳过字典文件自身与本脚本
  if (/uiI18nDict\.ts$|i18n\.js$/.test(fp)) continue
  code = stripComments(code)
  for (const cand of extractCandidates(code)) {
    const out = translate(cand, dict.DICT, dict.PHRASE_PAIRS)
    if (hasCJK(out)) {
      if (!gaps.has(cand)) gaps.set(cand, new Set())
      gaps.get(cand).add(path.relative(ROOT, fp))
    }
  }
}

const sorted = [...gaps.entries()].sort((a, b) => a[0].localeCompare(b[0]))
const lines = [`[${target}] 残留中文候选: ${sorted.length} 条`, '']
for (const [k, files] of sorted) {
  lines.push(`「${k}」  <-  ${[...files].slice(0, 2).join(', ')}`)
}
const outPath = path.join(ROOT, `scripts/i18n-gaps-${target}.txt`)
fs.writeFileSync(outPath, lines.join('\n'), 'utf8')

// 统计翻译后仍残留的单个汉字（用于补齐字符级兜底，确保零残留）
const charCount = new Map()
for (const [k] of gaps) {
  const out = translate(k, dict.DICT, dict.PHRASE_PAIRS)
  for (const ch of out) {
    if (/[\u3400-\u9fff\uf900-\ufaff]/.test(ch)) charCount.set(ch, (charCount.get(ch) || 0) + 1)
  }
}
const chars = [...charCount.entries()].sort((a, b) => b[1] - a[1])
const charPath = path.join(ROOT, `scripts/i18n-chars-${target}.txt`)
fs.writeFileSync(charPath, `残留汉字种类: ${chars.length}\n\n` + chars.map(([c, n]) => `${c}\t${n}`).join('\n'), 'utf8')
console.log(`[${target}] residual=${sorted.length}; uniqueChars=${chars.length}; written to ${path.relative(ROOT, outPath)} & i18n-chars-${target}.txt`)
