import { describe, it, expect } from 'vitest'
import {
  createBlock,
  generateGraphFromBlocks,
  parseGraphToBlocks,
  insertIntoContainer,
  insertAfter,
} from '@/components/workflow/blockFlowModel'

describe('blockFlowModel', () => {
  it('createBlock 套用模块默认变量（循环自带 index）', () => {
    const loop = createBlock('loop' as never)
    expect(loop.kind).toBe('loop')
    // 默认变量名字段写入 node.data
    expect((loop.node.data as Record<string, unknown>).indexVariable).toBe('index')
  })

  it('createBlock 对条件类返回 if 结构', () => {
    const cond = createBlock('condition' as never)
    expect(cond.kind).toBe('if')
  })

  it('顺序块 图<->结构树 roundtrip 保持顺序', () => {
    const a = createBlock('print_log' as never)
    let blocks = [a]
    blocks = insertAfter(blocks, a.id, createBlock('print_log' as never))
    const { nodes, edges } = generateGraphFromBlocks(blocks)
    expect(nodes.length).toBe(2)
    const back = parseGraphToBlocks(nodes, edges)
    expect(back.length).toBe(2)
    expect(back.every((b) => b.kind === 'step')).toBe(true)
  })

  it('循环体末节点不回连到循环节点（回归）', () => {
    const loop = createBlock('loop' as never)
    let blocks = [loop]
    const body = createBlock('print_log' as never)
    blocks = insertIntoContainer(blocks, loop.id, 'body', body)
    const { edges } = generateGraphFromBlocks(blocks)
    // 不应存在 从循环体节点 指回 循环节点 的边
    const backEdge = edges.find((e) => e.source === body.id && e.target === loop.id)
    expect(backEdge).toBeUndefined()
  })
})
