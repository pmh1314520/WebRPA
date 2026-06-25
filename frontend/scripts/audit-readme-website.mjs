// README 与官网合规核验脚本（Property 17 / Property 18）
// 断言：
//   1. README.md / README.EN.md 不含 Emoji 码点
//   2. README 含「项目概述 / 关键特色功能 / 使用入口」三个必备小节（中英对应）
//   3. 官网页面文件（index.html / plugin-dev.html）不含 Emoji 码点
// 约束：本脚本自身禁止使用 Emoji 字符。
//
// 用法：node frontend/scripts/audit-readme-website.mjs
// 退出码：发现任何缺口时为 1，全部通过为 0。

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
// 项目根：frontend/scripts -> 上两级
const ROOT = join(SCRIPT_DIR, '..', '..');

// Emoji 码点范围（不含版权/商标等普通符号 U+00A9 / U+00AE / U+2122）
const EMOJI_RANGES = [
  [0x2300, 0x23ff], // 技术符号（含闹钟、秒表等）
  [0x2600, 0x26ff], // 杂项符号（含警告、齿轮、天平等）
  [0x2700, 0x27bf], // 装饰符号（含闪光、对勾、箭头图标等）
  [0x2b00, 0x2bff], // 杂项符号与箭头（含五角星）
  [0x1f000, 0x1faff], // 主要 Emoji 区段（表情、图形、交通、补充等）
  [0xfe00, 0xfe0f], // 变体选择符（VS1-VS16，常与 Emoji 连用）
  [0x1f1e6, 0x1f1ff], // 区域指示符（国旗）
  [0x20d0, 0x20ff], // 组合用记号（含围合数字键帽）
];

function isEmojiCodePoint(cp) {
  for (const [lo, hi] of EMOJI_RANGES) {
    if (cp >= lo && cp <= hi) return true;
  }
  return false;
}

// 扫描文本中的 Emoji，返回 { line, column, codePoint, char } 列表
function scanEmoji(text) {
  const hits = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let col = 0;
    for (const ch of line) {
      const cp = ch.codePointAt(0);
      if (isEmojiCodePoint(cp)) {
        hits.push({
          line: i + 1,
          column: col + 1,
          codePoint: 'U+' + cp.toString(16).toUpperCase().padStart(4, '0'),
          char: ch,
        });
      }
      col += ch.length;
    }
  }
  return hits;
}

// 提取 Markdown 标题文本（去掉前导 # 与空白）
function extractHeadings(text) {
  const headings = [];
  for (const raw of text.split(/\r?\n/)) {
    const m = raw.match(/^\s{0,3}#{1,6}\s+(.*\S)\s*$/);
    if (m) headings.push(m[1].trim());
  }
  return headings;
}

// 必备小节定义：每项给出中文与英文（含可接受同义写法）
const REQUIRED_SECTIONS = [
  {
    key: '项目概述',
    zh: ['项目概述'],
    en: ['Overview', 'Project Overview', 'Introduction'],
  },
  {
    key: '关键特色功能',
    zh: ['关键特色功能'],
    en: ['Key Features', 'Highlights', 'Core Features'],
  },
  {
    key: '使用入口',
    zh: ['使用入口'],
    en: ['Getting Started', 'Usage', 'Quick Start', 'Get Started'],
  },
];

function headingMatches(headings, candidates) {
  return headings.some((h) =>
    candidates.some((c) => h.toLowerCase().includes(c.toLowerCase()))
  );
}

function checkReadme(filePath, lang) {
  const rel = relative(ROOT, filePath);
  const result = { file: rel, exists: false, emoji: [], missingSections: [] };
  if (!existsSync(filePath)) return result;
  result.exists = true;
  const text = readFileSync(filePath, 'utf8');
  result.emoji = scanEmoji(text);
  const headings = extractHeadings(text);
  for (const sec of REQUIRED_SECTIONS) {
    const candidates = lang === 'zh' ? sec.zh : sec.en;
    if (!headingMatches(headings, candidates)) {
      result.missingSections.push(sec.key);
    }
  }
  return result;
}

function checkWebsiteFile(filePath) {
  const rel = relative(ROOT, filePath);
  const result = { file: rel, exists: false, emoji: [] };
  if (!existsSync(filePath)) return result;
  result.exists = true;
  result.emoji = scanEmoji(readFileSync(filePath, 'utf8'));
  return result;
}

function printEmojiHits(label, hits) {
  if (hits.length === 0) {
    console.log('  [OK] 未发现 Emoji 码点：' + label);
    return;
  }
  console.log('  [GAP] 发现 ' + hits.length + ' 处 Emoji 码点：' + label);
  const preview = hits.slice(0, 30);
  for (const h of preview) {
    console.log(
      '        L' + h.line + ':' + h.column + '  ' + h.codePoint + '  [' + h.char + ']'
    );
  }
  if (hits.length > preview.length) {
    console.log('        ...（其余 ' + (hits.length - preview.length) + ' 处省略）');
  }
}

function main() {
  console.log('==============================================');
  console.log(' README 与官网合规核验（Property 17 / 18）');
  console.log('==============================================');

  let gaps = 0;

  // README 核验
  const readmeZh = checkReadme(join(ROOT, 'README.md'), 'zh');
  const readmeEn = checkReadme(join(ROOT, 'README.EN.md'), 'en');

  console.log('\n[1] README 文件存在性');
  for (const r of [readmeZh, readmeEn]) {
    console.log('  ' + (r.exists ? '[OK]' : '[GAP]') + ' ' + r.file + (r.exists ? '' : ' 不存在'));
    if (!r.exists) gaps++;
  }

  console.log('\n[2] README Emoji 合规（Property 17）');
  for (const r of [readmeZh, readmeEn]) {
    if (!r.exists) continue;
    printEmojiHits(r.file, r.emoji);
    gaps += r.emoji.length > 0 ? 1 : 0;
  }

  console.log('\n[3] README 必备小节（Property 18）');
  for (const r of [readmeZh, readmeEn]) {
    if (!r.exists) continue;
    if (r.missingSections.length === 0) {
      console.log('  [OK] ' + r.file + ' 三必备小节齐全');
    } else {
      console.log('  [GAP] ' + r.file + ' 缺失小节：' + r.missingSections.join(' / '));
      gaps++;
    }
  }

  // 中英一致性：两份必须同时具备三必备小节
  if (readmeZh.exists && readmeEn.exists) {
    const zhOk = readmeZh.missingSections.length === 0;
    const enOk = readmeEn.missingSections.length === 0;
    console.log('\n[4] README 中英一致（Property 18）');
    if (zhOk && enOk) {
      console.log('  [OK] 中英两份均具备三必备小节');
    } else {
      console.log('  [GAP] 中英两份必备小节不一致或不全');
      gaps++;
    }
  }

  // 官网核验
  console.log('\n[5] 官网页面 Emoji 合规（Property 17）');
  const websiteFiles = ['index.html', 'plugin-dev.html'].map((f) =>
    join(ROOT, 'website', f)
  );
  let websiteFound = 0;
  for (const f of websiteFiles) {
    const r = checkWebsiteFile(f);
    if (!r.exists) {
      console.log('  [SKIP] ' + r.file + ' 未找到（官网可能未解压）');
      continue;
    }
    websiteFound++;
    printEmojiHits(r.file, r.emoji);
    gaps += r.emoji.length > 0 ? 1 : 0;
  }
  if (websiteFound === 0) {
    console.log('  [SKIP] 未找到任何官网页面文件，跳过官网 Emoji 核验');
  }

  console.log('\n==============================================');
  if (gaps === 0) {
    console.log(' 结果：全绿，未发现缺口（覆盖率 1.0）');
    console.log('==============================================');
    process.exit(0);
  } else {
    console.log(' 结果：发现 ' + gaps + ' 类缺口（先红阶段，待 8.2 修复）');
    console.log('==============================================');
    process.exit(1);
  }
}

main();
