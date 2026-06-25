import { findUntranslatedChinese } from './audit-i18n.mjs'
import fs from 'node:fs'

const residuals = findUntranslatedChinese()
// 去重：以 full 文本为 key，统计频次与首次出现位置
const map = new Map()
for (const r of residuals) {
  const k = r.full
  if (!map.has(k)) map.set(k, { text: k, count: 0, sample: r.file + ':' + r.line })
  map.get(k).count++
}
const uniq = [...map.values()].sort((a, b) => b.count - a.count)
const lines = []
lines.push('UNIQUE_RESIDUALS=' + uniq.length + ' TOTAL=' + residuals.length)
for (const u of uniq) {
  lines.push(u.count + '\t' + u.sample + '\t' + JSON.stringify(u.text))
}
fs.writeFileSync('residuals-unique.txt', lines.join('\n'), 'utf8')
console.log('written', uniq.length, 'unique /', residuals.length, 'total')
