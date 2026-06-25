/* 生成 trim 后唯一 key 列表(排除已存在于 UI_DICT 的 key)，写为 JSON 数组。*/
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseDict } from './audit-i18n.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const residuals = JSON.parse(fs.readFileSync(path.join(__dirname, 'i18n-residuals.json'), 'utf8'))
const { uiDict } = parseDict()

const set = new Map() // trimmedKey -> count
for (const r of residuals) {
  const k = r.text.trim()
  if (!k) continue
  if (uiDict[k] !== undefined) continue // 已存在不覆盖
  set.set(k, (set.get(k) || 0) + r.count)
}
const keys = [...set.keys()]
fs.writeFileSync(path.join(__dirname, 'i18n-keys.json'), JSON.stringify(keys, null, 0), 'utf8')
console.log('unique trimmed keys to translate:', keys.length)
