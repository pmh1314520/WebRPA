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

describe('workflowStore 快照恢复（回滚 / 自定义模块退出编辑复用）', () => {
  beforeEach(() => {
    store.setState({ nodes: [], edges: [], variables: [], name: '未命名工作流' })
  })

  it('restoreSnapshot 恢复节点/连线/名称', () => {
    store.getState().restoreSnapshot({
      nodes: [{ id: 'n1', type: 'moduleNode', position: { x: 0, y: 0 }, data: {} } as any],
      edges: [{ id: 'e1', source: 'n1', target: 'n1' } as any],
      name: '主工作流',
    })
    const s = store.getState()
    expect(s.nodes).toHaveLength(1)
    expect(s.edges).toHaveLength(1)
    expect(s.name).toBe('主工作流')
  })

  it('restoreSnapshot 提供 variables 时恢复全局变量', () => {
    store.getState().restoreSnapshot({
      nodes: [],
      edges: [],
      variables: [{ name: 'g', value: 1, type: 'number', scope: 'global' } as any],
    })
    expect(store.getState().variables.find((v) => v.name === 'g')?.value).toBe(1)
  })

  it('restoreSnapshot 未提供 variables 时保留当前变量', () => {
    store.setState({ variables: [{ name: 'keep', value: 't', type: 'string', scope: 'global' } as any] })
    store.getState().restoreSnapshot({ nodes: [], edges: [] })
    expect(store.getState().variables.find((v) => v.name === 'keep')).toBeTruthy()
  })

  it('restoreSnapshot 对脏节点兜底不崩溃（缺 position）', () => {
    expect(() => {
      store.getState().restoreSnapshot({
        nodes: [{ id: 'bad', type: 'moduleNode', data: {} } as any],
        edges: [],
      })
    }).not.toThrow()
    expect(store.getState().nodes).toHaveLength(1)
  })
})

describe('workflowStore 日志时间戳与排序', () => {
  beforeEach(() => {
    store.setState({ logs: [] })
  })

  it('addLogBatch 传入 timestamp 时保留原值，不传则按当前时间生成', () => {
    store.getState().addLogBatch([
      { level: 'info', message: '带原始时间', timestamp: '2026-07-27T00:55:44.123' },
      { level: 'info', message: '不带时间' },
    ])
    const logs = store.getState().logs
    // 事后补拉的历史日志必须保留后端记录的时间，否则时间线被压平
    expect(logs[0].timestamp).toBe('2026-07-27T00:55:44.123')
    // 未指定时仍按当前时间生成（实时日志沿用此行为）
    expect(Number.isNaN(new Date(logs[1].timestamp).getTime())).toBe(false)
    // id 始终由 store 生成且互不相同
    expect(logs[0].id).toBeTruthy()
    expect(logs[0].id).not.toBe(logs[1].id)
  })

  it('sortLogsByTime 让补拉的历史日志按真实时间归位', () => {
    // 模拟真实场景：实时日志先到，补拉的"固定等待"带更早的时间被追加到尾部
    store.getState().addLogBatch([
      { level: 'info', message: '工作流开始执行', timestamp: '2026-07-27T00:55:44.000' },
      { level: 'success', message: '工作流执行完成', timestamp: '2026-07-27T00:55:49.000' },
      { level: 'info', message: '[固定等待] 已等待 5.0秒', timestamp: '2026-07-27T00:55:46.000' },
    ])
    store.getState().sortLogsByTime()
    expect(store.getState().logs.map((l) => l.message)).toEqual([
      '工作流开始执行',
      '[固定等待] 已等待 5.0秒',
      '工作流执行完成',
    ])
  })

  it('sortLogsByTime 时间相同保持原有先后（稳定排序）', () => {
    const ts = '2026-07-27T00:55:44.000'
    store.getState().addLogBatch([
      { level: 'info', message: '第一条', timestamp: ts },
      { level: 'info', message: '第二条', timestamp: ts },
      { level: 'info', message: '第三条', timestamp: ts },
    ])
    store.getState().sortLogsByTime()
    expect(store.getState().logs.map((l) => l.message)).toEqual(['第一条', '第二条', '第三条'])
  })

  it('sortLogsByTime 遇到无法解析的时间戳不抛错也不丢条目', () => {
    store.getState().addLogBatch([
      { level: 'info', message: '正常', timestamp: '2026-07-27T00:55:49.000' },
      { level: 'info', message: '坏时间', timestamp: '不是时间' },
    ])
    expect(() => store.getState().sortLogsByTime()).not.toThrow()
    expect(store.getState().logs).toHaveLength(2)
  })
})
