// @ts-check
// 临时分析脚本：统计 documentation 目录下所有被 audit EMOJI_RE 匹配的码点频率。
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DOC_DIR = resolve(__dirname, '..', 'src', 'components', 'workflow', 'documentation')

const EMOJI_RE =
  /(\p{Extended_Pictographic}|[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}])/gu

const freq = new Map()
for (const name of readdirSync(DOC_DIR)) {
  if (!name.endsWith('.ts')) continue
  const text = readFileSync(join(DOC_DIR, name), 'utf8')
  EMOJI_RE.lastIndex = 0
  let m
  while ((m = EMOJI_RE.exec(text)) !== null) {
    const ch = m[0]
    if (ch === '\uFE0F' || ch === '\u200D') continue
    const key = 'U+' + ch.codePointAt(0).toString(16).toUpperCase() + ' ' + ch
    freq.set(key, (freq.get(key) || 0) + 1)
  }
}
const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1])
for (const [k, v] of sorted) process.stdout.write(v.toString().padStart(5) + '  ' + k + '\n')
process.stdout.write('total distinct: ' + sorted.length + '\n')
