/* 去重 UI_DICT 跨块重复 key：保留每个 key 的「最后一次」定义(与运行时 last-wins 一致)，
   删除其余出现，保留原始值文本与格式。直接重写 uiI18nDict.ts。*/
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DICT = path.resolve(__dirname, '..', 'src', 'lib', 'uiI18nDict.ts')
const src = fs.readFileSync(DICT, 'utf8')
const n = src.length

// --- 找到一个 '{' 的配对 '}'（字符串/注释感知） ---
function matchBrace(openIdx) {
  let depth = 0, i = openIdx
  while (i < n) {
    const c = src[i]
    if (c === '/' && src[i + 1] === '/') { i += 2; while (i < n && src[i] !== '\n') i++; continue }
    if (c === '/' && src[i + 1] === '*') { i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; continue }
    if (c === "'" || c === '"' || c === '`') { const q = c; i++; while (i < n) { const d = src[i]; if (d === '\\') { i += 2; continue } if (d === q) { i++; break } i++ } continue }
    if (c === '{') depth++
    else if (c === '}') { depth--; if (depth === 0) return i }
    i++
  }
  return -1
}

// --- 收集 UI_DICT 块的 body 区间 [bodyStart, bodyEnd)（不含外层花括号）---
const blocks = []
const markers = [/export\s+const\s+UI_DICT\b[^=]*=\s*/g, /Object\.assign\(\s*UI_DICT\s*,\s*/g]
for (const re of markers) {
  re.lastIndex = 0
  let m
  while ((m = re.exec(src)) !== null) {
    let bi = m.index + m[0].length
    while (bi < n && src[bi] !== '{') bi++
    if (bi >= n) continue
    const close = matchBrace(bi)
    if (close === -1) continue
    blocks.push({ open: bi, bodyStart: bi + 1, bodyEnd: close })
  }
}
blocks.sort((a, b) => a.bodyStart - b.bodyStart)

// --- 在某 body 区间内扫描顶层 key: value 字符串对，记录 entry 的精确 span ---
// span: 从 key 引号起，到该 entry 末尾(含逗号)，但不含其后空白，方便整体删除一整行entry。
function scanEntries(bodyStart, bodyEnd) {
  const entries = []
  let i = bodyStart, depth = 0
  while (i < bodyEnd) {
    const c = src[i]
    if (c === '/' && src[i + 1] === '/') { i += 2; while (i < bodyEnd && src[i] !== '\n') i++; continue }
    if (c === '/' && src[i + 1] === '*') { i += 2; while (i < bodyEnd && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; continue }
    if (c === '{' || c === '[' || c === '(') { depth++; i++; continue }
    if (c === '}' || c === ']' || c === ')') { depth--; i++; continue }
    if (c === "'" || c === '"' || c === '`') {
      const q = c, keyStart = i
      let j = i + 1, key = ''
      while (j < bodyEnd) {
        const d = src[j]
        if (d === '\\') {
          const e = src[j + 1]
          if (e === 'u' && /[0-9a-fA-F]{4}/.test(src.slice(j + 2, j + 6))) { key += String.fromCharCode(parseInt(src.slice(j + 2, j + 6), 16)); j += 6; continue }
          if (e === 'n') { key += '\n'; j += 2; continue }
          if (e === 't') { key += '\t'; j += 2; continue }
          if (e !== undefined) { key += e; j += 2; continue }
          j += 2; continue
        }
        if (d === q) { j++; break }
        key += d; j++
      }
      // 跳过空白，期望 ':'
      let k = j
      while (k < bodyEnd && /\s/.test(src[k])) k++
      if (depth === 0 && src[k] === ':') {
        // 这是顶层 key, 解析其 value（字符串）
        k++
        while (k < bodyEnd && /\s/.test(src[k])) k++
        const vq = src[k]
        if (vq === "'" || vq === '"' || vq === '`') {
          k++
          while (k < bodyEnd) { const d = src[k]; if (d === '\\') { k += 2; continue } if (d === vq) { k++; break } k++ }
        } else {
          // 非字符串值，跳到逗号或块尾（保守）
          while (k < bodyEnd && src[k] !== ',' && src[k] !== '\n') k++
        }
        // 包含末尾逗号
        let entEnd = k
        if (src[entEnd] === ',') entEnd++
        entries.push({ key, start: keyStart, end: entEnd })
        i = entEnd
        continue
      }
      i = j
      continue
    }
    i++
  }
  return entries
}

let allEntries = []
for (const b of blocks) {
  for (const e of scanEntries(b.bodyStart, b.bodyEnd)) allEntries.push(e)
}
// 全局出现次序
allEntries.sort((a, b) => a.start - b.start)

// 统计每个 key 的出现次数与最后一次 index
const lastIdx = new Map()
allEntries.forEach((e, idx) => { lastIdx.set(e.key, idx) })
const counts = new Map()
for (const e of allEntries) counts.set(e.key, (counts.get(e.key) || 0) + 1)

// 待删除：重复 key 的非最后一次出现
const toRemove = []
allEntries.forEach((e, idx) => {
  if (counts.get(e.key) >= 2 && lastIdx.get(e.key) !== idx) toRemove.push(e)
})
// 从后往前删，删除 entry span + 其后到行尾的空白（若整行只剩空白则连换行删）
toRemove.sort((a, b) => b.start - a.start)
let out = src
let removedCount = 0
for (const e of toRemove) {
  let s = e.start, en = e.end
  // 吃掉 entry 后方的同行尾随空白
  while (en < out.length && (out[en] === ' ' || out[en] === '\t')) en++
  // 向前吃掉前导空白（行首缩进），判断该 entry 是否独占一行
  let ls = s
  while (ls > 0 && (out[ls - 1] === ' ' || out[ls - 1] === '\t')) ls--
  const atLineStart = ls === 0 || out[ls - 1] === '\n'
  const atLineEnd = en >= out.length || out[en] === '\n'
  if (atLineStart && atLineEnd) {
    // 独占一行：连同行首缩进与换行一起删
    s = ls
    if (out[en] === '\n') en++
  }
  out = out.slice(0, s) + out.slice(en)
  removedCount++
}
fs.writeFileSync(DICT, out, 'utf8')
console.log('removed duplicate definitions:', removedCount, 'across', toRemove.length, 'entries; dup keys:', [...counts].filter(([, c]) => c >= 2).length)
