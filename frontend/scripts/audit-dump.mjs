import { findUntranslatedChinese, findDuplicateUiDictKeys } from './audit-i18n.mjs'
import fs from 'node:fs'

const dups = findDuplicateUiDictKeys()
const residuals = findUntranslatedChinese()

// 去重残留文本（按 text 唯一）
const uniqTexts = new Map()
for (const r of residuals) {
  if (!uniqTexts.has(r.text)) uniqTexts.set(r.text, { text: r.text, count: 0, files: new Set() })
  const e = uniqTexts.get(r.text)
  e.count++
  e.files.add(r.file)
}
const uniqArr = [...uniqTexts.values()].map(e => ({ text: e.text, count: e.count, files: [...e.files] }))
uniqArr.sort((a, b) => b.count - a.count)

const byFile = new Map()
for (const r of residuals) byFile.set(r.file, (byFile.get(r.file) || 0) + 1)
const byFileArr = [...byFile.entries()].map(([file, count]) => ({ file, count })).sort((a, b) => b.count - a.count)

fs.writeFileSync('audit-dump.json', JSON.stringify({
  duplicateKeys: dups,
  residualTotal: residuals.length,
  uniqueResidualCount: uniqArr.length,
  byFile: byFileArr,
  uniqueResiduals: uniqArr,
}, null, 2), 'utf8')

console.log('duplicateKeys:', dups.length)
console.log('residualTotal:', residuals.length)
console.log('uniqueResidualCount:', uniqArr.length)
