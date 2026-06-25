// @ts-check
/**
 * 一次性维护脚本（Task 7.2）：去除教学文档中作为图标的 Emoji。
 *
 * 处理目录 frontend/src/components/workflow/documentation/ 下：
 *   - content-*.ts / content-*.en.ts
 *   - documents.ts（标题字段开头的 Emoji）
 *
 * 处理策略（保持 markdown 结构与语义）：
 *   1) 语义勾号/叉号 → 语言中立文本标记 [√] / [×]（非 Emoji 码点，audit 不再报）。
 *   2) 箭头 → ASCII（-> / <- / <->；↑↓ 转中英对应文字），这些是正文内容而非图标。
 *   3) 其余纯图标 Emoji 连同其相邻的一个空格一并删除，避免遗留双空格。
 *
 * 运行（cwd = frontend）：..\nodejs\node.exe scripts/strip-doc-emoji.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DOC_DIR = resolve(__dirname, '..', 'src', 'components', 'workflow', 'documentation')

// 与 audit-docs.mjs 完全一致的 Emoji 码点集合（用于最终清除）
const EMOJI = '(?:\\p{Extended_Pictographic}|[\\u{1F000}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{2B00}-\\u{2BFF}\\u{2190}-\\u{21FF}\\u{2300}-\\u{23FF}\\uFE0F\\u200D])'
const CLUSTER_RE = new RegExp('([^\\S\\n]*)(' + EMOJI + '+)([^\\S\\n]*)', 'gu')

// 勾号/叉号（含可能尾随的变体选择符 \uFE0F）
const CHECK_RE = /[\u2705\u2714\u2713\u2611]\uFE0F?/gu
const CROSS_RE = /[\u274C\u274E\u2717\u2718\u2716]\uFE0F?/gu

/** 对单个文件文本做去 Emoji 处理；isEn 决定 ↑↓ 等的中英文替换。 */
function transform(text, isEn) {
  let out = text

  // 1) 语义勾号/叉号 → 文本标记
  out = out.replace(CHECK_RE, '[√]')
  out = out.replace(CROSS_RE, '[×]')

  // 2) 箭头 → ASCII / 文字（正文内容，保留语义）
  out = out.replace(/\u2191\u2193|\u2193\u2191/g, isEn ? 'Up/Down' : '上下方向键')
  out = out.replace(/[\u2192\u21D2\u27A1\u2B95]\uFE0F?/gu, '->')
  out = out.replace(/[\u2190\u21D0\u2B05]\uFE0F?/gu, '<-')
  out = out.replace(/[\u2194\u21D4]\uFE0F?/gu, '<->')
  out = out.replace(/[\u2191\u2B06]\uFE0F?/gu, isEn ? 'Up' : '上')
  out = out.replace(/[\u2193\u2B07]\uFE0F?/gu, isEn ? 'Down' : '下')

  // 3) 其余纯图标 Emoji：连同相邻空格删除（两侧都有空格则保留一个）
  out = out.replace(CLUSTER_RE, (m, lead, _c, trail) => (lead && trail ? ' ' : ''))

  return out
}

function main() {
  const files = readdirSync(DOC_DIR).filter((n) => n.endsWith('.ts') && (n.startsWith('content-') || n === 'documents.ts'))
  let changed = 0
  const report = []
  for (const name of files) {
    const path = join(DOC_DIR, name)
    const before = readFileSync(path, 'utf8')
    const isEn = name.endsWith('.en.ts')
    const after = transform(before, isEn)
    if (after !== before) {
      writeFileSync(path, after, 'utf8')
      changed++
      report.push(name)
    }
  }
  process.stdout.write('已处理文件数: ' + changed + '\n')
  for (const r of report) process.stdout.write('  - ' + r + '\n')
}

main()
