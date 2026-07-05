import { describe, it, expect } from 'vitest'
import { getFieldLabel, COMMON_FIELD_LABELS } from '@/lib/fieldLabels'

describe('fieldLabels', () => {
  it('通用映射：常见字段名返回中文标签', () => {
    expect(getFieldLabel('listVariable')).toBe('列表变量')
    expect(getFieldLabel('selector')).toBe('元素选择器')
    expect(getFieldLabel('filePath')).toBe('文件路径')
  })

  it('未知字段名回退为字段名本身', () => {
    expect(getFieldLabel('someUnknownField_123')).toBe('someUnknownField_123')
  })

  it('模块级标签（后端 desc）优先于通用映射', () => {
    expect(getFieldLabel('listVariable', { listVariable: '专属列表变量' })).toBe('专属列表变量')
    expect(getFieldLabel('foo', { foo: '模块字段说明' })).toBe('模块字段说明')
  })

  it('模块级标签为空白时回退到通用映射/字段名', () => {
    expect(getFieldLabel('listVariable', { listVariable: '   ' })).toBe('列表变量')
    expect(getFieldLabel('bar', { bar: '' })).toBe('bar')
  })

  it('COMMON_FIELD_LABELS 的值均为非空中文/文本', () => {
    for (const [k, v] of Object.entries(COMMON_FIELD_LABELS)) {
      expect(typeof v, k).toBe('string')
      expect(v.trim().length, k).toBeGreaterThan(0)
    }
  })
})
