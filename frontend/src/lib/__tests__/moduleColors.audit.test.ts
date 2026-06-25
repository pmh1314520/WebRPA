/**
 * 模块画布配色与分类色一致性审计测试（子系统 4 / 需求 4）
 *
 * 本文件以确定性结构断言核验 Property 7/8/9：配色由 moduleCategories 自动派生，
 * 「模块只要归属某分类则其画布色必等于分类色」结构上天然一致，真正的缺口是：
 *   - 模块未归入任何分类（落默认灰色）；
 *   - 模块被多个分类重复收录（颜色由最后写入者决定，存在歧义）；
 *   - 分类的 color 未在 colorClassMap / tailwindHex 登记（派生时回退默认色）。
 *
 * 数据源（单一真相，不重复维护并行清单）：
 *   - moduleCategories（ModuleSidebar）：分类 -> color -> 模块 type 清单，配色唯一来源。
 *   - moduleColors / colorClassMap / DEFAULT_NODE_COLOR_CLASS（moduleColors.ts）：派生结果与映射表。
 *   - moduleTypeLabels（workflowStore）：模块 type -> 中文名，按 ModuleType 全量键控，
 *     是独立于 moduleCategories 的「前端全模块集合」来源（用于 Property 8 暴露未分类缺口）。
 *
 * 注意：本任务（3.1）是「先红」核验工具，此刻测试可能因暴露真实缺口而失败属预期，
 * 修复在任务 3.2 进行——不在此处改 moduleCategories。
 */
import { describe, it, expect } from 'vitest'
import {
  moduleColors,
  colorClassMap,
  DEFAULT_NODE_COLOR_CLASS,
  findUncategorizedModules,
  findDuplicateCategorizedModules,
  findUnmappedCategoryColors,
} from '@/components/workflow/moduleColors'
import { moduleCategories } from '@/components/workflow/ModuleSidebar'
import { moduleTypeLabels } from '@/store/workflowStore'

/**
 * 非执行器的 UI 伪模块类型：分组容器、便签、子流程头、自定义模块。
 * 它们刻意不归入任何配色分类（不是后端注册的真实模块），核验全模块集合时需排除，
 * 以免误报为「未分类缺口」。
 */
const NON_EXECUTOR_PSEUDO_TYPES: ReadonlySet<string> = new Set<string>([
  'group',
  'note',
  'subflow_header',
  'custom_module',
])

/**
 * 前端全模块集合：moduleTypeLabels 的全部 key（独立于 moduleCategories），
 * 剔除非执行器伪模块。作为 Property 8 的「全模块集合」口径。
 */
function getAllModuleTypes(): string[] {
  return Object.keys(moduleTypeLabels).filter(
    (type) => !NON_EXECUTOR_PSEUDO_TYPES.has(type),
  )
}

describe('模块配色审计 - Property 7/8/9', () => {
  // Property 7: 模块配色等于分类色
  // 对任意模块 m，moduleColors[m.type] 等于其所属分类 color 经 colorClassMap 映射的结果，
  // 且不回退到默认灰色。
  // Validates: Requirements 4.2, 4.3
  it('Property 7: 每个模块的画布色等于其分类色经 colorClassMap 的映射结果且不回退灰色', () => {
    const mismatches: { type: string; category: string; color: string; actual: string; expected: string }[] = []

    for (const category of moduleCategories) {
      const expected = colorClassMap[category.color]
      for (const moduleType of category.modules) {
        const type = moduleType as string
        const actual = moduleColors[type]
        // 期望：分类 color 在 colorClassMap 有登记，且 moduleColors 取该映射、不回退灰色。
        if (expected === undefined || actual !== expected || actual === DEFAULT_NODE_COLOR_CLASS) {
          mismatches.push({
            type,
            category: category.name,
            color: category.color,
            actual: actual ?? '(undefined)',
            expected: expected ?? '(unmapped color)',
          })
        }
      }
    }

    expect(
      mismatches,
      `存在模块画布色与分类色不一致（或回退灰色）：\n${JSON.stringify(mismatches, null, 2)}`,
    ).toEqual([])
  })

  // Property 8: 模块在分类中出现且仅一次
  // 每个 module_type 在 moduleCategories 中出现且仅出现一次，即
  // findUncategorizedModules（用全模块集合）与 findDuplicateCategorizedModules 均为空。
  // Validates: Requirements 4.4
  it('Property 8a: 全模块集合中不存在未归入任何分类的模块（否则落默认灰色）', () => {
    const allTypes = getAllModuleTypes()
    const uncategorized = findUncategorizedModules(allTypes)

    expect(
      uncategorized,
      `存在未归入任何分类的模块（画布会落默认灰色）：\n${JSON.stringify(uncategorized, null, 2)}`,
    ).toEqual([])
  })

  it('Property 8b: 不存在被多个分类重复收录的模块（否则配色存在歧义）', () => {
    const duplicates = findDuplicateCategorizedModules()

    expect(
      duplicates,
      `存在被多个分类重复收录的模块（配色由最后写入者决定）：\n${JSON.stringify(duplicates, null, 2)}`,
    ).toEqual([])
  })

  // Property 9: 分类色已登记映射
  // 每个分类的 color 都在 colorClassMap 与 tailwindHex 中登记，即
  // findUnmappedCategoryColors 为空。
  // Validates: Requirements 4.1
  it('Property 9: 每个分类的 color 都已在 colorClassMap 与 tailwindHex 登记', () => {
    const unmapped = findUnmappedCategoryColors()

    expect(
      unmapped,
      `存在未在 colorClassMap/tailwindHex 登记的分类 color（派生时回退默认色）：\n${JSON.stringify(unmapped, null, 2)}`,
    ).toEqual([])
  })
})
