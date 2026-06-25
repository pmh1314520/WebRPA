import { findUntranslatedChinese, parseDict } from './audit-i18n.mjs'
import fs from 'node:fs'

const residuals = findUntranslatedChinese()
const { uiDict, phrases } = parseDict()

// 去重：按 full 文本
const uniq = new Map()
for (const r of residuals) {
  if (!uniq.has(r.full)) uniq.set(r.full, { full: r.full, count: 0, files: new Set() })
  const e = uniq.get(r.full)
  e.count++
  e.files.add(r.file)
}
const list = [...uniq.values()].sort((a, b) => b.count - a.count)
const out = list.map((e) => ({ full: e.full, count: e.count, files: [...e.files] }))

fs.writeFileSync('scripts/residuals.json', JSON.stringify(out, null, 2), 'utf8')
fs.writeFileSync('scripts/existing-keys.json', JSON.stringify({
  uiKeys: Object.keys(uiDict),
  phraseKeys: Object.keys(phrases),
}, null, 2), 'utf8')

console.log('总残留处数:', residuals.length)
console.log('去重后唯一字符串:', out.length)
console.log('现有 UI_DICT keys:', Object.keys(uiDict).length)
console.log('现有 PHRASES keys:', Object.keys(phrases).length)

// 统计：含 ${ 的动态字符串
const dynamic = out.filter((e) => e.full.includes('${'))
console.log('含 ${...} 动态字符串:', dynamic.length)
