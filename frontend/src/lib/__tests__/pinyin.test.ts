import { describe, it, expect } from 'vitest'
import { getPinyin, getPinyinInitials, pinyinMatch } from '@/lib/pinyin'

describe('pinyin', () => {
  it('getPinyin 返回无声调全拼小写连写', () => {
    expect(getPinyin('打开')).toBe('dakai')
    expect(getPinyin('循环')).toBe('xunhuan')
  })

  it('getPinyinInitials 返回首字母连写', () => {
    expect(getPinyinInitials('打开')).toBe('dk')
    expect(getPinyinInitials('循环')).toBe('xh')
  })

  it('pinyinMatch 支持全拼/首字母/中文子串', () => {
    expect(pinyinMatch('打开网页', 'dakai')).toBe(true)
    expect(pinyinMatch('打开网页', 'dk')).toBe(true)
    expect(pinyinMatch('打开网页', '网页')).toBe(true)
  })

  it('pinyinMatch 大小写不敏感', () => {
    expect(pinyinMatch('打开', 'DAKAI')).toBe(pinyinMatch('打开', 'dakai'))
    expect(pinyinMatch('打开', 'DK')).toBe(true)
  })

  it('pinyinMatch 空查询返回 true，无关查询返回 false', () => {
    expect(pinyinMatch('打开', '')).toBe(true)
    expect(pinyinMatch('打开', 'zzzz')).toBe(false)
  })
})
