/**
 * 拼音搜索工具（基于 pinyin-pro 完整词典）
 *
 * 支持：
 * 1. 拼音全拼匹配（如 "dakai" 匹配 "打开"）
 * 2. 拼音首字母匹配（如 "dk" 匹配 "打开"）
 * 3. 直接子串匹配（中文/英文）
 *
 * 使用 pinyin-pro 的完整汉字词典，确保所有模块标签（无论包含什么汉字）
 * 都能被拼音 / 首字母模糊搜索到，无需再手工维护汉字-拼音映射表。
 */
import { pinyin } from 'pinyin-pro'

// 缓存，避免重复计算
const fullCache = new Map<string, string>()
const initialCache = new Map<string, string>()

/** 获取字符串的完整拼音（无声调，全部小写，连写） */
export function getPinyin(str: string): string {
  if (!str) return ''
  const cached = fullCache.get(str)
  if (cached !== undefined) return cached
  // nonZh: 'consecutive' 保留非中文字符原样
  const result = pinyin(str, { toneType: 'none', type: 'string', nonZh: 'consecutive', v: true })
    .replace(/\s+/g, '')
    .toLowerCase()
  fullCache.set(str, result)
  return result
}

/** 获取字符串的拼音首字母（连写，小写） */
export function getPinyinInitials(str: string): string {
  if (!str) return ''
  const cached = initialCache.get(str)
  if (cached !== undefined) return cached
  const arr = pinyin(str, { pattern: 'first', toneType: 'none', type: 'array', nonZh: 'consecutive', v: true })
  const result = arr.join('').replace(/\s+/g, '').toLowerCase()
  initialCache.set(str, result)
  return result
}

/**
 * 拼音模糊匹配
 * @param text 要搜索的文本
 * @param query 搜索关键词
 * @returns 是否匹配
 */
export function pinyinMatch(text: string, query: string): boolean {
  if (!query) return true
  if (!text) return false

  const lowerText = text.toLowerCase()
  const lowerQuery = query.trim().toLowerCase()
  if (!lowerQuery) return true

  // 1. 直接子串匹配（中文或英文）
  if (lowerText.includes(lowerQuery)) return true

  // 2. 全拼匹配
  if (getPinyin(text).includes(lowerQuery)) return true

  // 3. 首字母匹配
  if (getPinyinInitials(text).includes(lowerQuery)) return true

  return false
}

/** 模块统一搜索的可匹配字段 */
export interface ModuleSearchFields {
  /** 中文 label（拼音搜索基础） */
  label?: string
  /** 英文类型名（module_type） */
  type?: string
  /** 所属分类名（仅部分入口参与匹配） */
  category?: string
  /** 搜索关键词 */
  keywords?: string[]
}

/**
 * 模块统一搜索匹配。
 *
 * 对模块的「中文 label + 英文名 + 关键词（以及可选的分类名）」逐项调用 pinyinMatch，
 * 命中任一即返回 true。借助 pinyinMatch，天然支持中文原文 / 全拼 / 首字母 / 英文、
 * 且大小写不敏感的模糊搜索。
 *
 * 三处模块搜索入口（ModuleSidebar 主搜索、QuickModulePicker、BlockFlowView 画布内搜索）
 * 统一复用本函数，确保过滤逻辑一致、不产生回归。
 */
export function moduleMatchesQuery(query: string, fields: ModuleSearchFields): boolean {
  const q = query.trim()
  if (!q) return true
  if (fields.label && pinyinMatch(fields.label, q)) return true
  if (fields.type && pinyinMatch(fields.type, q)) return true
  if (fields.category && pinyinMatch(fields.category, q)) return true
  if (fields.keywords && fields.keywords.some((kw) => pinyinMatch(kw, q))) return true
  return false
}
