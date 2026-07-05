import { describe, it, expect } from 'vitest'
import { getMissingRequired, getMissingRequiredLabels } from '@/lib/requiredFields'

const reqMap = { demo_module: ['listVariable', 'selector'] }

describe('getMissingRequired', () => {
  it('全部未填时返回全部必填字段', () => {
    expect(getMissingRequired('demo_module', {}, reqMap)).toEqual(['listVariable', 'selector'])
  })

  it('已填字段不计入缺失', () => {
    expect(getMissingRequired('demo_module', { listVariable: 'myList' }, reqMap)).toEqual(['selector'])
  })

  it('空字符串与空数组视为未填', () => {
    expect(getMissingRequired('demo_module', { listVariable: '   ', selector: [] }, reqMap))
      .toEqual(['listVariable', 'selector'])
  })

  it('0 与 false 视为已填（不缺失）', () => {
    expect(getMissingRequired('demo_module', { listVariable: 0, selector: false }, reqMap)).toEqual([])
  })

  it('未知模块或无必填项返回空数组', () => {
    expect(getMissingRequired('unknown_module', {}, reqMap)).toEqual([])
    expect(getMissingRequired('demo_module', {}, {})).toEqual([])
  })
})

describe('getMissingRequiredLabels', () => {
  it('把缺失字段名转换为中文标签', () => {
    // 无后端 labelCache 时回退到通用映射
    expect(getMissingRequiredLabels('demo_module', {}, reqMap))
      .toEqual(['列表变量', '元素选择器'])
  })

  it('已填字段不出现在标签列表中', () => {
    expect(getMissingRequiredLabels('demo_module', { selector: '#id' }, reqMap))
      .toEqual(['列表变量'])
  })
})
