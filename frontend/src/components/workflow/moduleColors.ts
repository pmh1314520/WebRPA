/**
 * 模块颜色映射 - 自动从 moduleCategories 派生
 * 确保画布中模块节点的颜色与其所在分类颜色一致
 */

// Tailwind bg-xxx-500 类名 → 对应的 border + bg + text 类名映射
// 分类的 color 字段格式为 'bg-{color}-{shade}'，我们从中提取颜色名和色阶
//
// 导出以便配色审计测试独立复算「分类 color 经 colorClassMap 映射结果」（Property 7）。
export const colorClassMap: Record<string, string> = {
  'bg-blue-500': 'border-blue-500 bg-blue-100 text-blue-900',
  'bg-blue-600': 'border-blue-600 bg-blue-100 text-blue-900',
  'bg-blue-800': 'border-blue-800 bg-blue-100 text-blue-900',
  'bg-indigo-500': 'border-indigo-500 bg-indigo-100 text-indigo-900',
  'bg-indigo-600': 'border-indigo-600 bg-indigo-100 text-indigo-900',
  'bg-indigo-700': 'border-indigo-700 bg-indigo-100 text-indigo-900',
  'bg-indigo-800': 'border-indigo-800 bg-indigo-100 text-indigo-900',
  'bg-purple-500': 'border-purple-500 bg-purple-100 text-purple-900',
  'bg-purple-600': 'border-purple-600 bg-purple-100 text-purple-900',
  'bg-purple-700': 'border-purple-700 bg-purple-100 text-purple-900',
  'bg-violet-500': 'border-violet-500 bg-violet-100 text-violet-900',
  'bg-violet-600': 'border-violet-600 bg-violet-100 text-violet-900',
  'bg-violet-700': 'border-violet-700 bg-violet-100 text-violet-900',
  'bg-fuchsia-700': 'border-fuchsia-700 bg-fuchsia-100 text-fuchsia-900',
  'bg-pink-500': 'border-pink-500 bg-pink-100 text-pink-900',
  'bg-pink-600': 'border-pink-600 bg-pink-100 text-pink-900',
  'bg-pink-800': 'border-pink-800 bg-pink-100 text-pink-900',
  'bg-rose-500': 'border-rose-500 bg-rose-100 text-rose-900',
  'bg-rose-600': 'border-rose-600 bg-rose-100 text-rose-900',
  'bg-rose-700': 'border-rose-700 bg-rose-100 text-rose-900',
  'bg-red-600': 'border-red-600 bg-red-100 text-red-900',
  'bg-orange-500': 'border-orange-500 bg-orange-100 text-orange-900',
  'bg-orange-600': 'border-orange-600 bg-orange-100 text-orange-900',
  'bg-amber-600': 'border-amber-600 bg-amber-100 text-amber-900',
  'bg-amber-700': 'border-amber-700 bg-amber-100 text-amber-900',
  'bg-yellow-500': 'border-yellow-500 bg-yellow-100 text-yellow-900',
  'bg-lime-600': 'border-lime-600 bg-lime-100 text-lime-900',
  'bg-green-500': 'border-green-500 bg-green-100 text-green-900',
  'bg-green-600': 'border-green-600 bg-green-100 text-green-900',
  'bg-emerald-500': 'border-emerald-500 bg-emerald-100 text-emerald-900',
  'bg-emerald-600': 'border-emerald-600 bg-emerald-100 text-emerald-900',
  'bg-teal-500': 'border-teal-500 bg-teal-100 text-teal-900',
  'bg-teal-600': 'border-teal-600 bg-teal-100 text-teal-900',
  'bg-teal-800': 'border-teal-800 bg-teal-100 text-teal-900',
  'bg-cyan-500': 'border-cyan-500 bg-cyan-100 text-cyan-900',
  'bg-cyan-600': 'border-cyan-600 bg-cyan-100 text-cyan-900',
  'bg-cyan-700': 'border-cyan-700 bg-cyan-100 text-cyan-900',
  'bg-sky-500': 'border-sky-500 bg-sky-100 text-sky-900',
  'bg-sky-600': 'border-sky-600 bg-sky-100 text-sky-900',
  'bg-sky-700': 'border-sky-700 bg-sky-100 text-sky-900',
  'bg-slate-600': 'border-slate-600 bg-slate-100 text-slate-900',
  'bg-slate-700': 'border-slate-700 bg-slate-100 text-slate-900',
  'bg-gray-600': 'border-gray-600 bg-gray-100 text-gray-900',
  'bg-stone-500': 'border-stone-500 bg-stone-100 text-stone-900',
}


// 动态导入会造成循环依赖，所以这里直接引用 moduleCategories 的数据
// 从 ModuleSidebar 导出的 moduleCategories 在此处静态引用
import { moduleCategories } from './ModuleSidebar'

/** 未登记 color 时，模块节点回退的默认灰色样式类（Property 7 用于断言「不回退灰色」）。 */
export const DEFAULT_NODE_COLOR_CLASS = 'border-gray-500 bg-gray-100 text-gray-900'

/**
 * 根据 moduleCategories 自动生成颜色映射
 * 每个模块的颜色 = 其所在分类的 color 对应的节点样式类
 */
function buildModuleColors(): Record<string, string> {
  const colors: Record<string, string> = {}
  
  for (const category of moduleCategories) {
    const nodeColorClass = colorClassMap[category.color] || DEFAULT_NODE_COLOR_CLASS
    for (const moduleType of category.modules) {
      colors[moduleType as string] = nodeColorClass
    }
  }
  
  return colors
}

export const moduleColors: Record<string, string> = buildModuleColors()

// Tailwind 分类色 → 代表性 hex（供 minimap 等需要真实颜色值的场景，确保缩略图颜色与画布模块一致）
const tailwindHex: Record<string, string> = {
  'bg-blue-500': '#3b82f6', 'bg-blue-600': '#2563eb', 'bg-blue-800': '#1e40af',
  'bg-indigo-500': '#6366f1', 'bg-indigo-600': '#4f46e5', 'bg-indigo-700': '#4338ca', 'bg-indigo-800': '#3730a3',
  'bg-purple-500': '#a855f7', 'bg-purple-600': '#9333ea', 'bg-purple-700': '#7e22ce',
  'bg-violet-500': '#8b5cf6', 'bg-violet-600': '#7c3aed', 'bg-violet-700': '#6d28d9',
  'bg-fuchsia-700': '#a21caf',
  'bg-pink-500': '#ec4899', 'bg-pink-600': '#db2777', 'bg-pink-800': '#9d174d',
  'bg-rose-500': '#f43f5e', 'bg-rose-600': '#e11d48', 'bg-rose-700': '#be123c',
  'bg-red-600': '#dc2626',
  'bg-orange-500': '#f97316', 'bg-orange-600': '#ea580c',
  'bg-amber-600': '#d97706', 'bg-amber-700': '#b45309',
  'bg-yellow-500': '#eab308',
  'bg-lime-600': '#65a30d',
  'bg-green-500': '#22c55e', 'bg-green-600': '#16a34a',
  'bg-emerald-500': '#10b981', 'bg-emerald-600': '#059669',
  'bg-teal-500': '#14b8a6', 'bg-teal-600': '#0d9488', 'bg-teal-800': '#115e59',
  'bg-cyan-500': '#06b6d4', 'bg-cyan-600': '#0891b2', 'bg-cyan-700': '#0e7490',
  'bg-sky-500': '#0ea5e9', 'bg-sky-600': '#0284c7', 'bg-sky-700': '#0369a1',
  'bg-slate-600': '#475569', 'bg-slate-700': '#334155',
  'bg-gray-600': '#4b5563',
  'bg-stone-500': '#78716c',
}

function buildModuleHexColors(): Record<string, string> {
  const colors: Record<string, string> = {}
  for (const category of moduleCategories) {
    const hex = tailwindHex[category.color] || '#3b82f6'
    for (const moduleType of category.modules) colors[moduleType as string] = hex
  }
  return colors
}

export const moduleHexColors: Record<string, string> = buildModuleHexColors()

/** 取模块的真实代表色（hex），用于 minimap 等。未知模块回退到蓝色。 */
export function getModuleHexColor(moduleType?: string): string {
  if (!moduleType) return '#3b82f6'
  return moduleHexColors[moduleType] || '#3b82f6'
}

// ============================================================================
// 配色审计辅助（纯函数，便于测试与回归核验）
//
// 配色由 moduleCategories 自动派生：模块只要归属某分类，画布色必然等于分类色。
// 真正的缺口有三类，下列函数分别核验：
//   1) 模块未归入任何分类 -> buildModuleColors 不会写入它，画布渲染时落默认灰色；
//   2) 模块被多个分类重复收录 -> 颜色由最后写入的分类决定，存在歧义；
//   3) 分类的 color 未在 colorClassMap / tailwindHex 登记 -> 派生时回退默认色。
// 三者皆空（且全模块都已分类）时，配色与分类色 100% 一致。
// ============================================================================

/**
 * 返回未归入任何分类的模块（这些模块在画布上会落到默认灰色）。
 *
 * @param allTypes 全部模块 type 的集合（口径：moduleCategories 模块并集 ∪ 后端注册表）。
 * @returns allTypes 中不属于任何分类 modules 的 type 列表（按传入顺序去重）。
 */
export function findUncategorizedModules(allTypes: string[]): string[] {
  const categorized = new Set<string>()
  for (const category of moduleCategories) {
    for (const moduleType of category.modules) {
      categorized.add(moduleType as string)
    }
  }

  const seen = new Set<string>()
  const result: string[] = []
  for (const type of allTypes) {
    if (categorized.has(type) || seen.has(type)) continue
    seen.add(type)
    result.push(type)
  }
  return result
}

/**
 * 返回被多个分类重复收录的模块及其所属分类名清单。
 *
 * 重复收录会让模块画布色由「最后写入的分类」决定，产生歧义。
 * @returns 每个出现在 2 个及以上分类中的 type，附带其全部分类名（保持 moduleCategories 顺序）。
 */
export function findDuplicateCategorizedModules(): { type: string; categories: string[] }[] {
  const typeToCategories = new Map<string, string[]>()
  for (const category of moduleCategories) {
    for (const moduleType of category.modules) {
      const type = moduleType as string
      const list = typeToCategories.get(type)
      if (list) {
        list.push(category.name)
      } else {
        typeToCategories.set(type, [category.name])
      }
    }
  }

  const result: { type: string; categories: string[] }[] = []
  for (const [type, categories] of typeToCategories) {
    if (categories.length > 1) {
      result.push({ type, categories })
    }
  }
  return result
}

/**
 * 返回 color 未在 colorClassMap 或 tailwindHex 中登记的分类颜色。
 *
 * 未登记的 color 在派生时会回退到默认灰色（colorClassMap）或默认蓝色（tailwindHex），
 * 导致画布色与分类色不一致。
 * @returns 去重后的未登记 color 字符串列表（保持首次出现顺序）。
 */
export function findUnmappedCategoryColors(): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const category of moduleCategories) {
    const color = category.color
    if (seen.has(color)) continue
    seen.add(color)
    if (!(color in colorClassMap) || !(color in tailwindHex)) {
      result.push(color)
    }
  }
  return result
}
