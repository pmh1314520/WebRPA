/* 临时转储脚本：输出完整未翻译中文清单(去重,带全文) 与 重复key的值。仅供 6.2 处理用。*/
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseDict } from './audit-i18n.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FRONTEND_DIR = path.resolve(__dirname, '..')
const SRC_DIR = path.join(FRONTEND_DIR, 'src')

const CHINESE_RE = /[\u4e00-\u9fff]/
const RUNTIME_CJK_RE = /[\u4e00-\u9fa5]/
const EXCLUDED_FILES = new Set([
  path.join(SRC_DIR, 'lib', 'uiI18nDict.ts'),
  path.join(SRC_DIR, 'lib', 'uiI18n.ts'),
])
const REGEX_PREFIX = new Set(['', '(', ',', '=', ':', '[', '!', '&', '|', '?', '+', '-', '*', '%', '^', '~', '<', '>', '{', '}', ';', '\n', 'return', 'typeof'])
function isRegexContext(lastSig) { return REGEX_PREFIX.has(lastSig) }

function scanStringLiterals(src) {
  const out = []
  const n = src.length
  let i = 0, line = 1, lastSig = '', prevBuf = ''
  const pushCode = (ch) => { prevBuf += ch; if (prevBuf.length > 60) prevBuf = prevBuf.slice(-60); if (ch !== ' ' && ch !== '\t' && ch !== '\r' && ch !== '\n') lastSig = ch }
  while (i < n) {
    const c = src[i]
    if (c === '\n') { line++; prevBuf += '\n'; if (prevBuf.length > 60) prevBuf = prevBuf.slice(-60); i++; continue }
    if (c === '/' && src[i + 1] === '/') { i += 2; while (i < n && src[i] !== '\n') i++; continue }
    if (c === '/' && src[i + 1] === '*') { i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') line++; i++ } i += 2; continue }
    if (c === '/' && isRegexContext(lastSig)) {
      i++; let inClass = false
      while (i < n) { const d = src[i]; if (d === '\\') { i += 2; continue } if (d === '\n') break; if (d === '[') inClass = true; else if (d === ']') inClass = false; else if (d === '/' && !inClass) { i++; break } i++ }
      while (i < n && /[a-z]/i.test(src[i])) i++
      lastSig = '/'; continue
    }
    if (c === "'" || c === '"' || c === '`') {
      const quote = c, startLine = line, prev = prevBuf
      i++; let val = ''
      while (i < n) { const d = src[i]; if (d === '\\') { if (i + 1 < n) val += src[i + 1]; i += 2; continue } if (d === quote) { i++; break } if (d === '\n') { line++; if (quote !== '`') break; val += d; i++; continue } val += d; i++ }
      out.push({ value: val, line: startLine, prev }); lastSig = quote; prevBuf = ''; continue
    }
    pushCode(c); i++
  }
  return out
}

function enumerateSourceFiles(dir) {
  const out = []
  const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.vite', '__tests__'])
  const walk = (d) => {
    let entries; try { entries = fs.readdirSync(d, { withFileTypes: true }) } catch { return }
    for (const ent of entries) {
      const full = path.join(d, ent.name)
      if (ent.isDirectory()) { if (SKIP_DIRS.has(ent.name)) continue; walk(full) }
      else if (ent.isFile() && /\.(ts|tsx)$/.test(ent.name)) out.push(full)
    }
  }
  walk(dir); return out
}
function isExcludedFile(absPath) {
  if (EXCLUDED_FILES.has(absPath)) return true
  const base = path.basename(absPath)
  if (/^content-.*\.tsx?$/.test(base)) return true
  if (/\.(test|spec)\.tsx?$/.test(base)) return true
  if (base.endsWith('.d.ts')) return true
  return false
}
function isLogContext(prev) {
  if (/console\s*\.\s*(log|warn|error|info|debug|trace|group|table|assert)\b/.test(prev)) return true
  if (/\b(logger|log)\s*\.\s*(log|warn|error|info|debug|trace)\s*\(\s*$/.test(prev)) return true
  return false
}

const { uiDict, phrases } = parseDict()
const phrasePairs = Object.entries(phrases).sort((a, b) => b[0].length - a[0].length)
function translate(zh) {
  const key = zh.trim()
  if (uiDict[key] !== undefined) return zh.replace(key, uiDict[key])
  const collapsed = key.replace(/\s+/g, ' ')
  if (collapsed !== key && uiDict[collapsed] !== undefined) return uiDict[collapsed]
  if (!RUNTIME_CJK_RE.test(zh)) return zh
  let out = zh
  for (const [zhP, enP] of phrasePairs) { if (out.indexOf(zhP) !== -1) out = out.split(zhP).join(enP) }
  return out.replace(/[ \t]{2,}/g, ' ')
}

const files = enumerateSourceFiles(SRC_DIR)
const uniq = new Map() // fullText -> {count, files:Set}
for (const file of files) {
  if (isExcludedFile(file)) continue
  let src; try { src = fs.readFileSync(file, 'utf8') } catch { continue }
  if (!CHINESE_RE.test(src)) continue
  for (const lit of scanStringLiterals(src)) {
    if (!CHINESE_RE.test(lit.value)) continue
    if (isLogContext(lit.prev)) continue
    const translated = translate(lit.value)
    if (CHINESE_RE.test(translated)) {
      const t = lit.value
      if (!uniq.has(t)) uniq.set(t, { count: 0, files: new Set() })
      const e = uniq.get(t); e.count++; e.files.add(path.relative(FRONTEND_DIR, file).replace(/\\/g, '/'))
    }
  }
}
const arr = [...uniq.entries()].map(([text, e]) => ({ text, count: e.count, files: [...e.files] }))
arr.sort((a, b) => b.count - a.count)
fs.writeFileSync(path.join(__dirname, 'i18n-residuals.json'), JSON.stringify(arr, null, 2), 'utf8')
console.log('unique residual strings:', arr.length, ' total occurrences:', arr.reduce((s, x) => s + x.count, 0))
