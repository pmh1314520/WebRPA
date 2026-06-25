import { describe, it, expect } from 'vitest'
// 复用既有审计脚本的解析逻辑（其 import.meta 守卫保证 import 时不执行 main）
// @ts-expect-error mjs 无类型声明
import { findDuplicateUiDictKeys, findUntranslatedChinese } from '../../../scripts/audit-i18n.mjs'
import { UI_DICT } from '@/lib/uiI18nDict'

const CHINESE = /[\u4e00-\u9fff]/

describe('i18n 字典完整性', () => {
  it('UI_DICT 无重复 key（防 tsc TS1117）', () => {
    const dups = findDuplicateUiDictKeys()
    expect(dups, `存在重复 key: ${JSON.stringify(dups)}`).toEqual([])
  })

  it('英文模式无中文残留', () => {
    const gaps = findUntranslatedChinese()
    expect(gaps.length, `残留中文 ${gaps.length} 处，示例: ${JSON.stringify(gaps.slice(0, 5))}`).toBe(0)
  })

  it('每个中文 key 都有非空英文值', () => {
    const bad: string[] = []
    for (const [k, v] of Object.entries(UI_DICT)) {
      if (CHINESE.test(k)) {
        if (typeof v !== 'string' || !v.trim()) bad.push(k)
      }
    }
    expect(bad, `以下中文 key 缺非空英文值: ${JSON.stringify(bad.slice(0, 10))}`).toEqual([])
  })
})
