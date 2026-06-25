import { describe, it, expect, beforeEach } from 'vitest'
import { useWorkflowStore } from '@/store/workflowStore'

const store = useWorkflowStore

describe('workflowStore 变量操作', () => {
  beforeEach(() => {
    store.setState({ variables: [] })
  })

  it('addVariable 新增，同名则更新值（不重复）', () => {
    store.getState().addVariable({ name: 'x', value: 1, type: 'number', scope: 'global' })
    store.getState().addVariable({ name: 'x', value: 2, type: 'number', scope: 'global' })
    const vars = store.getState().variables
    expect(vars.filter((v) => v.name === 'x')).toHaveLength(1)
    expect(vars.find((v) => v.name === 'x')?.value).toBe(2)
  })

  it('updateVariable / deleteVariable', () => {
    store.getState().addVariable({ name: 'y', value: 'a', type: 'string', scope: 'global' })
    store.getState().updateVariable('y', 'b')
    expect(store.getState().variables.find((v) => v.name === 'y')?.value).toBe('b')
    store.getState().deleteVariable('y')
    expect(store.getState().variables.find((v) => v.name === 'y')).toBeUndefined()
  })

  it('ensureGlobalVariables 去重且已存在同名不覆盖（回归）', () => {
    store.getState().addVariable({ name: 'index', value: 42, type: 'number', scope: 'global' })
    store.getState().ensureGlobalVariables(['index', 'item', 'item', 'count'])
    const vars = store.getState().variables
    // index 保留原值 42，不被覆盖
    const idx = vars.filter((v) => v.name === 'index')
    expect(idx).toHaveLength(1)
    expect(idx[0].value).toBe(42)
    // item 只新增一次（输入有重复）
    expect(vars.filter((v) => v.name === 'item')).toHaveLength(1)
    // count 新增
    expect(vars.find((v) => v.name === 'count')).toBeTruthy()
  })

  it('ensureGlobalVariables 忽略空白名', () => {
    store.getState().ensureGlobalVariables(['', '  ', 'real'])
    const names = store.getState().variables.map((v) => v.name)
    expect(names).toContain('real')
    expect(names).not.toContain('')
  })
})
