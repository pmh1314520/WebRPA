/**
 * 模块拼音搜索完整性审计工具（纯函数，便于测试与回归核验）
 *
 * 本模块从既有权威数据源派生模块清单，并断言每个模块的中文名都能被
 * 拼音全拼与首字母搜索命中，从而保障「模块列表搜索框」的拼音搜索覆盖率：
 *
 * - moduleCategories（ModuleSidebar 导出）：分类 -> 模块 type 清单，是「全部模块」的口径来源。
 * - moduleTypeLabels（workflowStore 导出）：模块 type -> 中文名（拼音搜索以中文名为基础）。
 * - moduleKeywords（ModuleSidebar 导出）：模块 type -> 搜索关键词。
 * - pinyin.ts：getPinyin / getPinyinInitials / pinyinMatch（基于 pinyin-pro 全词典）。
 *
 * 这里只读取既有数据源，不重复维护并行清单；与 moduleColors.ts 一致，
 * 通过静态 import 引用 moduleCategories，不会引入循环依赖（本文件为叶子模块，
 * 无任何模块反向 import 它）。
 */
import type { ModuleType } from '@/types'
import { moduleCategories, moduleKeywords } from '@/components/workflow/ModuleSidebar'
import { moduleTypeLabels } from '@/store/workflowStore'
import { getPinyin, getPinyinInitials, pinyinMatch } from '@/lib/pinyin'

/** 单个模块的拼音审计视图：type 主键 + 中文 label + 搜索关键词 */
export interface ModuleLabelEntry {
  type: string
  label: string
  keywords: string[]
}

// 匹配是否包含至少一个中文字符（拼音搜索以中文名为基础）
const CHINESE_RE = /[\u4e00-\u9fff]/

/**
 * 枚举全部模块的 type/label/keywords。
 *
 * 口径：moduleCategories 中所有分类的 modules 并集（用户可在侧栏拖拽到画布上的全部模块），
 * 按 type 去重；label 取自 moduleTypeLabels，keywords 取自 moduleKeywords。
 */
export function enumerateModuleLabels(): ModuleLabelEntry[] {
  const seen = new Set<string>()
  const entries: ModuleLabelEntry[] = []

  for (const category of moduleCategories) {
    for (const moduleType of category.modules) {
      const type = moduleType as string
      if (seen.has(type)) continue
      seen.add(type)

      const label = moduleTypeLabels[moduleType as ModuleType] ?? ''
      const keywords = moduleKeywords[moduleType as ModuleType] ?? []
      entries.push({ type, label, keywords })
    }
  }

  return entries
}

/**
 * 断言单个模块的中文 label 可被拼音搜索命中。
 *
 * 条件（全部满足才返回 true）：
 * 1. label 去除空白后非空；
 * 2. label 含至少一个中文字符（否则无从生成拼音）；
 * 3. 其全拼 getPinyin(label) 能被 pinyinMatch(label, 全拼) 命中；
 * 4. 其首字母 getPinyinInitials(label) 能被 pinyinMatch(label, 首字母) 命中。
 */
export function isPinyinSearchable(entry: ModuleLabelEntry): boolean {
  const label = (entry.label ?? '').trim()
  if (!label) return false
  if (!CHINESE_RE.test(label)) return false

  const full = getPinyin(label)
  const initials = getPinyinInitials(label)
  if (!full || !initials) return false

  return pinyinMatch(label, full) && pinyinMatch(label, initials)
}

/**
 * 返回所有无法被拼音搜到的模块（覆盖率缺口）。
 *
 * 缺口判定：无中文 label，或其全拼/首字母无法被 pinyinMatch 命中。
 * 目标：该清单为空（拼音搜索覆盖率 100%）。
 */
export function findPinyinSearchGaps(): ModuleLabelEntry[] {
  return enumerateModuleLabels().filter((entry) => !isPinyinSearchable(entry))
}
