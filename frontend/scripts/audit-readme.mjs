// @ts-check
/**
 * README 合规核验脚本（Task 8.1，先红工具）
 *
 * 断言并打印报告：
 *   1. 项目根 README.md 与 README.EN.md（缺失则列为缺口）不含 Emoji 码点
 *      （用 Unicode emoji 范围正则，排除中文 / 常规标点 / 版权商标等普通符号）。
 *   2. README 含「项目概述 / 关键特色功能 / 使用入口」三类必备小节标题
 *      （中文 README 找中文标题；英文 README 找 Overview / Features / Getting Started 类标题）。
 *   3. 中英两份必须同时具备三必备小节（一致性）。
 *
 * 运行（项目内置 node，cwd = frontend）：
 *   ..\nodejs\node.exe scripts/audit-readme.mjs
 * 或：
 *   node scripts/audit-readme.mjs
 *
 * 约束：本脚本自身禁止使用 Emoji 字符（输出仅用 ASCII 标签 [OK]/[GAP]/[SKIP]）。
 * 退出码：发现任一缺口返回 1（先红），全部通过返回 0。
 */

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
// 项目根：frontend/scripts -> 上两级
const ROOT = join(SCRIPT_DIR, '..', '..')

// Emoji 码点范围（刻意排除中文区段 U+4E00-U+9FFF、ASCII 标点，
// 以及版权 U+00A9 / 注册商标 U+00AE / 商标 U+2122 这类普通符号）。
const EMOJI_RANGES = [
  [0x231a, 0x231b], // 手表 / 沙漏
  [0x2300, 0x23ff], // 技术符号（含闹钟、秒表、播放键等）
  [0x2600, 0x26ff], // 杂项符号（含警告、齿轮、天平、星形等）
  [0x2700, 0x27bf], // 装饰符号（含闪光、对勾、叉号、装饰箭头等）
  [0x2b00, 0x2bff], // 杂项符号与箭头（含五角星 U+2B50）
  [0xfe00, 0xfe0f], // 变体选择符（VS1-VS16，常与 Emoji 连用）
  [0x1f000, 0x1faff], // 主要 Emoji 区段（表情、图形、交通、补充符号与象形文字等）
  [0x1f1e6, 0x1f1ff], // 区域指示符（国旗）
  [0x20d0, 0x20ff], // 组合用记号（含围合数字键帽组合）
]

const ZWJ = 0x200d // 零宽连接符，附着用，单独不计

function isEmojiCodePoint(cp) {
  if (cp === ZWJ) return false
  for (const [lo, hi] of EMOJI_RANGES) {
    if (cp >= lo && cp <= hi) return true
  }
  return false
}

/** 扫描文本中的 Emoji，返回 { line, column, codePoint, char } 列表。 */
function scanEmoji(text) {
  const hits = []
  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    let col = 0
    for (const ch of line) {
      const cp = ch.codePointAt(0)
      if (isEmojiCodePoint(cp)) {
        hits.push({
          line: i + 1,
          column: col + 1,
          codePoint: 'U+' + cp.toString(16).toUpperCase().padStart(4, '0'),
          char: ch,
        })
      }
      col += ch.length
    }
  }
  return hits
}

/** 提取 Markdown 标题文本（去掉前导 # 与空白）。 */
function extractHeadings(text) {
  const headings = []
  for (const raw of text.split(/\r?\n/)) {
    const m = raw.match(/^\s{0,3}#{1,6}\s+(.*\S)\s*$/)
    if (m) headings.push(m[1].trim())
  }
  return headings
}

// 必备小节：每项给出中文标题与英文（含可接受同义写法）。
const REQUIRED_SECTIONS = [
  {
    key: '项目概述',
    zh: ['项目概述', '项目简介', '简介', '概述'],
    en: ['Overview', 'Project Overview', 'Introduction', 'About'],
  },
  {
    key: '关键特色功能',
    zh: ['关键特色功能', '特色功能', '功能特性', '核心功能', '主要功能'],
    en: ['Key Features', 'Features', 'Highlights', 'Core Features'],
  },
  {
    key: '使用入口',
    zh: ['使用入口', '快速开始', '快速上手', '使用说明', '开始使用'],
    en: ['Getting Started', 'Usage', 'Quick Start', 'Get Started', 'Getting started'],
  },
]

function headingMatches(headings, candidates) {
  return headings.some((h) =>
    candidates.some((c) => h.toLowerCase().includes(c.toLowerCase()))
  )
}

function checkReadme(filePath, lang) {
  const rel = relative(ROOT, filePath)
  const result = { file: rel, lang, exists: false, emoji: [], missingSections: [] }
  if (!existsSync(filePath)) return result
  result.exists = true
  const text = readFileSync(filePath, 'utf8')
  result.emoji = scanEmoji(text)
  const headings = extractHeadings(text)
  for (const sec of REQUIRED_SECTIONS) {
    const candidates = lang === 'zh' ? sec.zh : sec.en
    if (!headingMatches(headings, candidates)) {
      result.missingSections.push(sec.key)
    }
  }
  return result
}

function printEmojiHits(label, hits) {
  if (hits.length === 0) {
    console.log('  [OK] 未发现 Emoji 码点: ' + label)
    return
  }
  console.log('  [GAP] 发现 ' + hits.length + ' 处 Emoji 码点: ' + label)
  const preview = hits.slice(0, 40)
  for (const h of preview) {
    console.log(
      '        L' + h.line + ':' + h.column + '  ' + h.codePoint + '  [' + h.char + ']'
    )
  }
  if (hits.length > preview.length) {
    console.log('        ...（其余 ' + (hits.length - preview.length) + ' 处省略）')
  }
}

function main() {
  console.log('==============================================')
  console.log(' README 合规核验报告 (Task 8.1 / Property 17, 18)')
  console.log('==============================================')

  let gaps = 0

  const readmeZh = checkReadme(join(ROOT, 'README.md'), 'zh')
  const readmeEn = checkReadme(join(ROOT, 'README.EN.md'), 'en')

  // [1] 文件存在性（缺失即为缺口）
  console.log('\n[1] README 文件存在性')
  for (const r of [readmeZh, readmeEn]) {
    console.log('  ' + (r.exists ? '[OK] ' : '[GAP] ') + r.file + (r.exists ? '' : ' 不存在（缺英文版/中文版）'))
    if (!r.exists) gaps++
  }

  // [2] Emoji 合规（Property 17）
  console.log('\n[2] README Emoji 合规 (Property 17)')
  for (const r of [readmeZh, readmeEn]) {
    if (!r.exists) {
      console.log('  [SKIP] ' + r.file + ' 不存在，跳过 Emoji 核验')
      continue
    }
    printEmojiHits(r.file, r.emoji)
    if (r.emoji.length > 0) gaps++
  }

  // [3] 必备小节（Property 18）
  console.log('\n[3] README 必备小节 (Property 18)')
  for (const r of [readmeZh, readmeEn]) {
    if (!r.exists) {
      console.log('  [SKIP] ' + r.file + ' 不存在，跳过小节核验')
      continue
    }
    if (r.missingSections.length === 0) {
      console.log('  [OK] ' + r.file + ' 三必备小节齐全（项目概述 / 关键特色功能 / 使用入口）')
    } else {
      console.log('  [GAP] ' + r.file + ' 缺失小节: ' + r.missingSections.join(' / '))
      gaps++
    }
  }

  // [4] 中英一致：两份必须同时具备三必备小节
  console.log('\n[4] README 中英一致 (Property 18)')
  if (readmeZh.exists && readmeEn.exists) {
    const zhOk = readmeZh.missingSections.length === 0
    const enOk = readmeEn.missingSections.length === 0
    if (zhOk && enOk) {
      console.log('  [OK] 中英两份均具备三必备小节')
    } else {
      console.log('  [GAP] 中英两份必备小节不一致或不全')
      gaps++
    }
  } else {
    console.log('  [GAP] 中英 README 未同时存在，无法保证一致')
    gaps++
  }

  console.log('\n==============================================')
  if (gaps === 0) {
    console.log(' 结果: 全绿，未发现缺口（覆盖率 1.0）')
    console.log('==============================================')
    process.exitCode = 0
  } else {
    console.log(' 结果: 发现 ' + gaps + ' 类缺口（先红阶段，待 8.2 修复）')
    console.log('==============================================')
    process.exitCode = 1
  }
}

main()
