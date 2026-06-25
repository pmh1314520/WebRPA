/* 临时：定位 UI_DICT 重复 key 的所有出现（行号 + 值），供 6.2 去重。*/
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { findDuplicateUiDictKeys } from './audit-i18n.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DICT = path.resolve(__dirname, '..', 'src', 'lib', 'uiI18nDict.ts')

const dups = findDuplicateUiDictKeys()
const dupKeys = new Set(dups.map(d => d.key))

const lines = fs.readFileSync(DICT, 'utf8').split(/\r?\n/)
// 匹配形如  'key': 'value',  或  "key": "value",  顶层条目
const result = {}
for (let i = 0; i < lines.length; i++) {
  const ln = lines[i]
  // 提取 key: 以引号开头的键
  const m = ln.match(/^\s*(['"])((?:\\.|(?!\1).)*)\1\s*:/)
  if (!m) continue
  let key = m[2]
  // 还原常见转义
  key = key.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\(['"\\])/g, '$1')
  if (!dupKeys.has(key)) continue
  if (!result[key]) result[key] = []
  result[key].push({ line: i + 1, raw: ln.trim() })
}
fs.writeFileSync(path.join(__dirname, 'i18n-dups.json'), JSON.stringify(result, null, 2), 'utf8')
let totalExtra = 0
for (const k of Object.keys(result)) totalExtra += result[k].length - 1
console.log('dup keys located:', Object.keys(result).length, ' extra-defs to remove:', totalExtra)
