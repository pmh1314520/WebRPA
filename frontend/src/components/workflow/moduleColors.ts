/**
 * 模块颜色映射 - 自动从 moduleCategories 派生
 * 确保画布中模块节点的颜色与其所在分类颜色一致
 */

// Tailwind bg-xxx-500 类名 → 对应的 border + bg + text 类名映射
// 分类的 color 字段格式为 'bg-{color}-{shade}'，我们从中提取颜色名和色阶
const colorClassMap: Record<string, string> = {
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

/**
 * 根据 moduleCategories 自动生成颜色映射
 * 每个模块的颜色 = 其所在分类的 color 对应的节点样式类
 */
function buildModuleColors(): Record<string, string> {
  const colors: Record<string, string> = {}
  
  for (const category of moduleCategories) {
    const nodeColorClass = colorClassMap[category.color] || 'border-gray-500 bg-gray-100 text-gray-900'
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
