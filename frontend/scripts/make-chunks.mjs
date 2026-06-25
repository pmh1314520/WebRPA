import fs from 'node:fs'
const r = JSON.parse(fs.readFileSync('scripts/residuals.json', 'utf8'))

// 仅取唯一字符串文本，按 static / dynamic 分流
const statics = []
const dynamics = []
for (const e of r) {
  if (e.full.includes('${')) dynamics.push(e.full)
  else statics.push(e.full)
}

const CHUNK = 200
const chunks = []
for (let i = 0; i < statics.length; i += CHUNK) chunks.push({ kind: 'ui', items: statics.slice(i, i + CHUNK) })
for (let i = 0; i < dynamics.length; i += CHUNK) chunks.push({ kind: 'dyn', items: dynamics.slice(i, i + CHUNK) })

fs.mkdirSync('scripts/i18n-chunks', { recursive: true })
chunks.forEach((c, idx) => {
  fs.writeFileSync(`scripts/i18n-chunks/chunk-${idx}.json`, JSON.stringify(c, null, 2), 'utf8')
})
console.log('static:', statics.length, 'dynamic:', dynamics.length, 'chunks:', chunks.length)
chunks.forEach((c, idx) => console.log(`chunk-${idx}: ${c.kind} x${c.items.length}`))
