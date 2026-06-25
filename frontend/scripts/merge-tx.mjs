/* 合并 scripts/tx/*.json 翻译批次，追加为一个 Object.assign(UI_DICT, {...}) 块。
   默认 dry-run，仅校验；传 --apply 才写入 uiI18nDict.ts。
   使用安全序列化(\uXXXX 转义控制字符)，确保 audit 解析器可正确还原 key。*/
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseDict } from './audit-i18n.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TX_DIR = path.join(__dirname, 'tx')
const DICT = path.resolve(__dirname, '..', 'src', 'lib', 'uiI18nDict.ts')
const APPLY = process.argv.includes('--apply')
const CHINESE_RE = /[\u4e00-\u9fff]/

const files = fs.readdirSync(TX_DIR).filter(f => f.endsWith('.json')).sort()
const merged = {}
const dupAmongBatches = []
for (const f of files) {
  const obj = JSON.parse(fs.readFileSync(path.join(TX_DIR, f), 'utf8'))
  for (const [k, v] of Object.entries(obj)) {
    if (merged[k] !== undefined && merged[k] !== v) dupAmongBatches.push(k)
    merged[k] = v
  }
}

const { uiDict } = parseDict()
const entries = []
const skippedExisting = []
const chineseValues = []
const expectedKeys = new Set(JSON.parse(fs.readFileSync(path.join(__dirname, 'i18n-keys.json'), 'utf8')))
const unexpectedKeys = []
for (const [k, v] of Object.entries(merged)) {
  if (!expectedKeys.has(k)) unexpectedKeys.push(k)
  if (uiDict[k] !== undefined) { skippedExisting.push(k); continue }
  if (CHINESE_RE.test(v)) { chineseValues.push(k); continue }
  entries.push([k, v])
}

// 覆盖率：expectedKeys 中有多少已被本批次覆盖(或本就存在)
let covered = 0
const missing = []
for (const k of expectedKeys) {
  if (merged[k] !== undefined || uiDict[k] !== undefined) covered++
  else missing.push(k)
}

// 安全序列化为 TS 双引号字符串字面量
function ser(str) {
  let out = '"'
  for (const ch of str) {
    const code = ch.codePointAt(0)
    if (ch === '"') out += '\\"'
    else if (ch === '\\') out += '\\\\'
    else if (code < 0x20) out += '\\u' + code.toString(16).padStart(4, '0')
    else out += ch
  }
  return out + '"'
}

console.log('batches:', files.length, ' merged keys:', Object.keys(merged).length)
console.log('to append:', entries.length, ' skippedExisting:', skippedExisting.length, ' chineseValues(BAD):', chineseValues.length)
console.log('coverage:', covered + '/' + expectedKeys.size, ' missing:', missing.length, ' unexpectedKeys:', unexpectedKeys.length, ' dupAmongBatches:', dupAmongBatches.length)
if (chineseValues.length) console.log('  !! values still contain Chinese (first 10):', chineseValues.slice(0, 10))
if (unexpectedKeys.length) console.log('  !! keys not in expected set (first 10):', unexpectedKeys.slice(0, 10))
if (dupAmongBatches.length) console.log('  !! conflicting dup keys among batches (first 10):', dupAmongBatches.slice(0, 10))

if (APPLY) {
  if (chineseValues.length) { console.log('ABORT apply: some values contain Chinese'); process.exit(1) }
  const body = entries.map(([k, v]) => '  ' + ser(k) + ': ' + ser(v) + ',').join('\n')
  const block = '\n\n// ===== i18n 批量补译 (Task 6.2) =====\nObject.assign(UI_DICT, {\n' + body + '\n})\n'
  fs.appendFileSync(DICT, block, 'utf8')
  console.log('APPLIED: appended', entries.length, 'entries to uiI18nDict.ts')
} else {
  console.log('(dry-run; pass --apply to write)')
}
