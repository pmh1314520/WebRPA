/**
 * 模块必填字段（来源：后端模块 schema），用于配置面板的必填校验提示。
 * 全局缓存一次，避免重复请求。
 */
import { useEffect, useState } from 'react'
import { apiRequest } from '@/services/api'
import { getFieldLabel } from '@/lib/fieldLabels'

interface ConditionalSpec {
  field?: string
  default?: string
  map?: Record<string, string[]>
}

let cache: Record<string, string[]> | null = null
let condCache: Record<string, ConditionalSpec> = {}
let labelCache: Record<string, Record<string, string>> = {}
let inflight: Promise<Record<string, string[]>> | null = null

async function fetchRequiredFields(): Promise<Record<string, string[]>> {
  if (cache) return cache
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const res = await apiRequest<{ requiredFields?: Record<string, string[]>; conditionalRequired?: Record<string, ConditionalSpec>; fieldLabels?: Record<string, Record<string, string>> }>('/system/module-required-fields')
      cache = (res as any)?.data?.requiredFields || (res as any)?.requiredFields || {}
      condCache = (res as any)?.data?.conditionalRequired || (res as any)?.conditionalRequired || {}
      labelCache = (res as any)?.data?.fieldLabels || (res as any)?.fieldLabels || {}
    } catch {
      cache = {}
      condCache = {}
      labelCache = {}
    }
    inflight = null
    return cache!
  })()
  return inflight
}

/** React hook：返回必填字段映射（首次自动拉取并缓存） */
export function useRequiredFields(): Record<string, string[]> {
  const [map, setMap] = useState<Record<string, string[]>>(cache || {})
  useEffect(() => {
    if (cache) { setMap(cache); return }
    let alive = true
    fetchRequiredFields().then((m) => { if (alive) setMap(m) })
    return () => { alive = false }
  }, [])
  return map
}

/** 计算某模块当前缺失的必填字段（支持按模式的条件必填，如 real_keyboard 不同 inputType） */
export function getMissingRequired(
  moduleType: string,
  data: Record<string, unknown>,
  reqMap: Record<string, string[]>,
): string[] {
  // 基础必填 + 条件必填（按判别字段当前取值）
  const base = reqMap[moduleType] || []
  const req = [...base]
  const cond = condCache[moduleType]
  if (cond && cond.map && cond.field) {
    let val = data[cond.field] as string | undefined
    if (val === undefined || val === null || val === '') val = cond.default
    const extra = (val && cond.map[val]) || []
    for (const f of extra) if (!req.includes(f)) req.push(f)
  }
  if (req.length === 0) return []
  return req.filter((f) => {
    const v = data[f]
    if (v === undefined || v === null) return true
    if (typeof v === 'string') return v.trim() === ''
    if (Array.isArray(v)) return v.length === 0
    return false
  })
}

/** 计算缺失必填字段，并返回其中文标签（优先后端 desc，其次通用映射，最后字段名本身） */
export function getMissingRequiredLabels(
  moduleType: string,
  data: Record<string, unknown>,
  reqMap: Record<string, string[]>,
): string[] {
  const missing = getMissingRequired(moduleType, data, reqMap)
  const moduleLabels = labelCache[moduleType]
  return missing.map((f) => getFieldLabel(f, moduleLabels))
}
