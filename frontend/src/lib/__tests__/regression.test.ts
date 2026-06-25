import { describe, it, expect } from 'vitest'
import {
  createBlock,
  generateGraphFromBlocks,
  parseGraphToBlocks,
  insertIntoContainer,
  insertAfter,
} from '@/components/workflow/blockFlowModel'

/**
 * 前端历史缺陷回归用例。
 *
 * 沉淀"模块条 -> 流程图"转换中曾出现的循环回边 bug：
 * 循环体内最后一个节点被错误地连回循环节点，导致流程图成环、执行端死循环。
 * 修正后：循环体节点之间顺序相连，回到循环的逻辑由执行引擎按 loop/done handle 处理，
 * 不应在图里生成任何"体内节点 -> 循环节点"的回边。
 */
describe('前端回归：模块条循环回边', () => {
  it('单个循环体节点不回连循环节点', () => {
    const loop = createBlock('loop' as never)
    let blocks = [loop]
    const body = createBlock('print_log' as never)
    blocks = insertIntoContainer(blocks, loop.id, 'body', body)
    const { edges } = generateGraphFromBlocks(blocks)
    expect(edges.find((e) => e.source === body.id && e.target === loop.id)).toBeUndefined()
  })

  it('多个循环体节点：任何体内节点都不回连循环节点', () => {
    const loop = createBlock('loop' as never)
    let blocks = [loop]
    const b1 = createBlock('print_log' as never)
    const b2 = createBlock('print_log' as never)
    const b3 = createBlock('set_variable' as never)
    blocks = insertIntoContainer(blocks, loop.id, 'body', b1)
    blocks = insertIntoContainer(blocks, loop.id, 'body', b2)
    blocks = insertIntoContainer(blocks, loop.id, 'body', b3)
    const { edges } = generateGraphFromBlocks(blocks)
    const bodyIds = new Set([b1.id, b2.id, b3.id])
    const backEdges = edges.filter((e) => bodyIds.has(e.source) && e.target === loop.id)
    expect(backEdges).toEqual([])
  })

  it('循环后继节点经 done handle 连接，不与循环体混淆', () => {
    const loop = createBlock('loop' as never)
    let blocks = [loop]
    const body = createBlock('print_log' as never)
    blocks = insertIntoContainer(blocks, loop.id, 'body', body)
    const after = createBlock('print_log' as never)
    blocks = insertAfter(blocks, loop.id, after)
    const { nodes, edges } = generateGraphFromBlocks(blocks)

    // 循环体入口边使用 loop handle
    const loopEdge = edges.find((e) => e.source === loop.id && e.target === body.id)
    expect(loopEdge).toBeDefined()
    expect((loopEdge as { sourceHandle?: string }).sourceHandle).toBe('loop')

    // 循环结束后的节点使用 done handle
    const doneEdge = edges.find((e) => e.source === loop.id && e.target === after.id)
    expect(doneEdge).toBeDefined()
    expect((doneEdge as { sourceHandle?: string }).sourceHandle).toBe('done')

    // 结构树 roundtrip 仍能解析回 1 个循环块 + 1 个顺序块
    const back = parseGraphToBlocks(nodes, edges)
    const kinds = back.map((b) => b.kind).sort()
    expect(kinds).toContain('loop')
    expect(kinds).toContain('step')
  })

  it('嵌套循环：内层循环体节点不回连任何循环节点', () => {
    const outer = createBlock('loop' as never)
    let blocks = [outer]
    const inner = createBlock('loop' as never)
    blocks = insertIntoContainer(blocks, outer.id, 'body', inner)
    const innerBody = createBlock('print_log' as never)
    blocks = insertIntoContainer(blocks, inner.id, 'body', innerBody)
    const { edges } = generateGraphFromBlocks(blocks)
    const loopIds = new Set([outer.id, inner.id])
    const backEdges = edges.filter((e) => e.source === innerBody.id && loopIds.has(e.target))
    expect(backEdges).toEqual([])
  })
})
