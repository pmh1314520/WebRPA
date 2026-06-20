/**
 * 模块条结构化模型：图(nodes+edges) ↔ 结构树(Block[]) 双向转换
 *
 * 思路（对标影刀）：模块条编辑时以「结构树」为操作对象，每次编辑后
 * 由树**完整重新生成图**（自动连好 true/false/loop/done/回边/合并点），
 * 从而保证纯模块条模式也能搭出任意含条件/循环/嵌套的完整工作流。
 */
import { nanoid } from 'nanoid'
import type { Node, Edge } from '@xyflow/react'
import type { NodeData } from '@/store/workflowStore'
import { moduleTypeLabels } from '@/store/workflowStore'
import type { ModuleType } from '@/types'

export type Block =
  | { kind: 'step'; id: string; node: Node<NodeData>; flowStart?: boolean }
  | { kind: 'if'; id: string; node: Node<NodeData>; then: Block[]; els: Block[]; flowStart?: boolean }
  | { kind: 'loop'; id: string; node: Node<NodeData>; body: Block[]; flowStart?: boolean }
  | { kind: 'parallel'; id: string; node: Node<NodeData>; branches: Block[][]; flowStart?: boolean }

export const CONDITION_TYPES = new Set([
  'condition', 'element_exists', 'element_visible',
  'image_exists', 'phone_image_exists', 'face_recognition',
  'probability_trigger',
])
export const LOOP_TYPES = new Set(['loop', 'foreach', 'foreach_dict'])

/** 不同分支模块的两个出口 handle（与 ModuleNode/后端约定一致） */
export function branchHandles(moduleType: string): [string, string] {
  return moduleType === 'probability_trigger' ? ['path1', 'path2'] : ['true', 'false']
}

function edgeTarget(edges: Edge[], source: string, handle: string | null): string | null {
  if (handle === null) {
    const e = edges.find((x) => x.source === source && (!x.sourceHandle || x.sourceHandle === ''))
    return e ? e.target : null
  }
  const e = edges.find((x) => x.source === source && x.sourceHandle === handle)
  return e ? e.target : null
}

/** 图 → 结构树 */
export function parseGraphToBlocks(nodes: Node<NodeData>[], edges: Edge[]): Block[] {
  const moduleNodes = nodes.filter((n) => n.type === 'moduleNode')
  if (moduleNodes.length === 0) return []
  const byId = new Map(moduleNodes.map((n) => [n.id, n]))

  const incoming = new Map<string, number>()
  moduleNodes.forEach((n) => incoming.set(n.id, 0))
  for (const e of edges) {
    if (byId.has(e.source) && byId.has(e.target)) incoming.set(e.target, (incoming.get(e.target) || 0) + 1)
  }
  const entries = moduleNodes
    .filter((n) => (incoming.get(n.id) || 0) === 0)
    .sort((a, b) => a.position.y - b.position.y)

  const visited = new Set<string>()

  const reachable = (start: string | null): Set<string> => {
    const s = new Set<string>()
    if (!start) return s
    const q = [start]
    while (q.length) {
      const c = q.shift()!
      if (s.has(c) || !byId.has(c)) continue
      s.add(c)
      for (const e of edges) if (e.source === c) q.push(e.target)
    }
    return s
  }
  const findMerge = (a: string | null, b: string | null): string | null => {
    // 任一分支为空（无对应出边）时不存在双路合并点：返回 null，
    // 否则会把另一分支的首节点误判为合并点而被甩到外层同级位置。
    if (!a || !b) return null
    const ra = reachable(a)
    const seen = new Set<string>()
    const q = [b]
    while (q.length) {
      const c = q.shift()!
      if (seen.has(c)) continue
      seen.add(c)
      if (ra.has(c)) return c
      for (const e of edges) if (e.source === c) q.push(e.target)
    }
    return null
  }

  // 多路并行扇出的公共合并点：从所有分支入口都可达的、最近的那个节点
  const findCommonMerge = (targets: string[]): string | null => {
    if (targets.length < 2) return null
    const sets = targets.map((t) => reachable(t))
    const seen = new Set<string>()
    const q = [...targets]
    while (q.length) {
      const c = q.shift()!
      if (seen.has(c)) continue
      seen.add(c)
      // c 必须从每一条分支都可达，且本身不是任何分支的入口（避免把某分支首节点当合并点）
      if (!targets.includes(c) && sets.every((s) => s.has(c))) return c
      for (const e of edges) if (e.source === c) q.push(e.target)
    }
    return null
  }

  const parseSeq = (startId: string | null, stop: Set<string>): Block[] => {
    const seq: Block[] = []
    let cur = startId
    while (cur && byId.has(cur) && !stop.has(cur) && !visited.has(cur)) {
      visited.add(cur)
      const node = byId.get(cur)!
      const mt = node.data.moduleType as string
      if (CONDITION_TYPES.has(mt)) {
        const [hT, hF] = branchHandles(mt)
        const t = edgeTarget(edges, cur, hT)
        const f = edgeTarget(edges, cur, hF)
        const merge = findMerge(t, f)
        const innerStop = new Set(stop)
        if (merge) innerStop.add(merge)
        const thenSeq = parseSeq(t, innerStop)
        const els = parseSeq(f, innerStop)
        seq.push({ kind: 'if', id: cur, node, then: thenSeq, els })
        cur = merge
      } else if (LOOP_TYPES.has(mt)) {
        const body = edgeTarget(edges, cur, 'loop')
        const done = edgeTarget(edges, cur, 'done')
        const innerStop = new Set(stop)
        innerStop.add(cur)
        const bodySeq = parseSeq(body, innerStop)
        seq.push({ kind: 'loop', id: cur, node, body: bodySeq })
        cur = done
      } else {
        // 普通步骤：检查是否有多条顺序出边（并行扇出 / 多路执行）
        const outs = edges
          .filter((e) => e.source === cur && (!e.sourceHandle || e.sourceHandle === ''))
          .map((e) => e.target)
          .filter((t) => byId.has(t))
        // 去重
        const uniqueOuts = Array.from(new Set(outs))
        if (uniqueOuts.length > 1) {
          // 并行扇出：本步骤之后同时分出多条分支，最后汇合到合并点
          const merge = findCommonMerge(uniqueOuts)
          const innerStop = new Set(stop)
          if (merge) innerStop.add(merge)
          const branches = uniqueOuts.map((t) => parseSeq(t, innerStop))
          seq.push({ kind: 'parallel', id: cur, node, branches })
          cur = merge
        } else {
          seq.push({ kind: 'step', id: cur, node })
          cur = uniqueOuts[0] || null
        }
      }
    }
    return seq
  }

  const result: Block[] = []
  // 标记每条独立流程的起始块（多入口/多路并行执行时用于区分、避免被错误串联合并）
  const pushFlow = (seq: Block[]) => {
    if (seq.length > 0) seq[0] = { ...seq[0], flowStart: true }
    result.push(...seq)
  }
  for (const entry of entries) pushFlow(parseSeq(entry.id, new Set()))
  for (const n of [...moduleNodes].sort((a, b) => a.position.y - b.position.y)) {
    if (!visited.has(n.id)) pushFlow(parseSeq(n.id, new Set()))
  }
  return result
}


/** 结构树 → 图（重新生成 nodes+edges，自动连好所有分支/循环/合并边） */
export function generateGraphFromBlocks(blocks: Block[]): { nodes: Node<NodeData>[]; edges: Edge[] } {
  const outNodes: Node<NodeData>[] = []
  const outEdges: Edge[] = []
  // 布局基准：列宽（横向并排间距）、行高（纵向间距）、起点
  const COL_W = 300, ROW_H = 130, X0 = 140, Y0 = 80, FLOW_GAP = 1

  // ===== 智能树形布局 =====
  // 思路：先递归测量每个块/序列占用的「列数」（lane），再居中放置：
  //  - 条件 if：then / else 子树左右并排，节点居中在两者上方
  //  - 并行 parallel：各分支左右并排
  //  - 循环 loop：循环体在节点正下方（居中）
  //  - 多条独立流程：整体横向并排，互不干扰
  // 这样分支会真正铺开成树，而不是挤成一条直线。
  const measureSeq = (seq: Block[]): number => {
    let w = 1
    for (const b of seq) w = Math.max(w, measure(b))
    return w
  }
  const measure = (b: Block): number => {
    if (b.kind === 'if') return Math.max(1, measureSeq(b.then)) + Math.max(1, measureSeq(b.els))
    if (b.kind === 'loop') return Math.max(1, measureSeq(b.body))
    if (b.kind === 'parallel') return b.branches.reduce((s, br) => s + Math.max(1, measureSeq(br)), 0)
    return 1
  }

  // 放置一个块：在 [laneStart, laneStart+laneWidth) 区间内居中节点，返回放置完成后的下一行号
  const placeBlock = (b: Block, laneStart: number, laneWidth: number, row: number): number => {
    const center = laneStart + (laneWidth - 1) / 2
    outNodes.push({
      ...b.node,
      position: { x: X0 + center * COL_W, y: Y0 + row * ROW_H },
      selected: false,
    } as Node<NodeData>)

    if (b.kind === 'if') {
      const tW = Math.max(1, measureSeq(b.then))
      const eW = Math.max(1, measureSeq(b.els))
      const ownW = tW + eW
      const off = laneStart + Math.floor((laneWidth - ownW) / 2)
      const ty = placeSeq(b.then, off, tW, row + 1)
      const ey = placeSeq(b.els, off + tW, eW, row + 1)
      return Math.max(ty, ey)
    }
    if (b.kind === 'loop') {
      const bW = Math.max(1, measureSeq(b.body))
      const off = laneStart + Math.floor((laneWidth - bW) / 2)
      return placeSeq(b.body, off, bW, row + 1)
    }
    if (b.kind === 'parallel') {
      const ownW = b.branches.reduce((s, br) => s + Math.max(1, measureSeq(br)), 0)
      let cx = laneStart + Math.floor((laneWidth - ownW) / 2)
      let maxRow = row + 1
      for (const br of b.branches) {
        const bw = Math.max(1, measureSeq(br))
        maxRow = Math.max(maxRow, placeSeq(br, cx, bw, row + 1))
        cx += bw
      }
      return maxRow
    }
    return row + 1
  }
  // 放置一个纵向序列：块自上而下排列，整体占据 laneWidth 列
  const placeSeq = (seq: Block[], laneStart: number, laneWidth: number, row: number): number => {
    let cy = row
    for (const b of seq) cy = placeBlock(b, laneStart, laneWidth, cy)
    return cy
  }

  // 按 flowStart 边界拆分出多条独立流程
  const flows: Block[][] = []
  for (const b of blocks) {
    if (b.flowStart || flows.length === 0) flows.push([b])
    else flows[flows.length - 1].push(b)
  }
  // 多条独立流程横向并排（各自从第 0 行开始），互不重叠
  let laneCursor = 0
  for (const flow of flows) {
    const w = measureSeq(flow)
    placeSeq(flow, laneCursor, w, 0)
    laneCursor += w + FLOW_GAP
  }

  const addEdge = (source: string, target: string | null, handle: string | null) => {
    if (!target) return
    // 与 WebRPA 默认连线一致：smoothstep + 流光虚线（animated）
    const e: Edge = { id: `e-${source}-${handle || 'd'}-${target}`, source, target, type: 'smoothstep', animated: true }
    if (handle) (e as Edge & { sourceHandle?: string }).sourceHandle = handle
    outEdges.push(e)
  }

  // 接线：返回序列入口节点 id（空序列返回 afterId）
  const wireSeq = (seq: Block[], afterId: string | null): string | null => {
    let entry = afterId
    for (let i = seq.length - 1; i >= 0; i--) entry = wireBlock(seq[i], entry)
    return entry
  }
  const wireBlock = (b: Block, followId: string | null): string => {
    if (b.kind === 'step') {
      addEdge(b.id, followId, null)
      return b.id
    }
    if (b.kind === 'if') {
      const thenEntry = wireSeq(b.then, followId)
      const elseEntry = wireSeq(b.els, followId)
      const [hT, hF] = branchHandles(b.node.data.moduleType as string)
      addEdge(b.id, thenEntry ?? followId, hT)
      addEdge(b.id, elseEntry ?? followId, hF)
      return b.id
    }
    // loop
    if (b.kind === 'loop') {
      if (b.body.length > 0) {
        const bodyEntry = wireSeq(b.body, b.id) // 循环体最后回到循环节点
        addEdge(b.id, bodyEntry, 'loop')
      }
      addEdge(b.id, followId, 'done')
      return b.id
    }
    // parallel：本步骤之后并行扇出到各分支，各分支末尾汇合到 followId
    const entries = b.branches.map((br) => wireSeq(br, followId))
    for (const en of entries) addEdge(b.id, en ?? followId, null)
    return b.id
  }
  for (const flow of flows) wireSeq(flow, null)

  return { nodes: outNodes, edges: outEdges }
}

/** 新建一个 Block（条件/循环带空分支） */
export function createBlock(type: ModuleType, extraData?: Partial<NodeData>): Block {
  const id = nanoid()
  const node: Node<NodeData> = {
    id,
    type: 'moduleNode',
    position: { x: 0, y: 0 },
    data: { label: moduleTypeLabels[type] || type, moduleType: type, ...(extraData || {}) } as NodeData,
  }
  if (CONDITION_TYPES.has(type)) return { kind: 'if', id, node, then: [], els: [] }
  if (LOOP_TYPES.has(type)) return { kind: 'loop', id, node, body: [] }
  return { kind: 'step', id, node }
}

// ---------- 结构树编辑（纯函数，返回新树） ----------

type Found = { list: Block[]; index: number } | null

function locate(blocks: Block[], id: string): Found {
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    if (b.id === id) return { list: blocks, index: i }
    if (b.kind === 'if') {
      const inThen = locate(b.then, id)
      if (inThen) return inThen
      const inEls = locate(b.els, id)
      if (inEls) return inEls
    } else if (b.kind === 'loop') {
      const inBody = locate(b.body, id)
      if (inBody) return inBody
    } else if (b.kind === 'parallel') {
      for (const br of b.branches) {
        const inBr = locate(br, id)
        if (inBr) return inBr
      }
    }
  }
  return null
}

function findBlock(blocks: Block[], id: string): Block | null {
  for (const b of blocks) {
    if (b.id === id) return b
    if (b.kind === 'if') {
      const r = findBlock(b.then, id) || findBlock(b.els, id)
      if (r) return r
    } else if (b.kind === 'loop') {
      const r = findBlock(b.body, id)
      if (r) return r
    } else if (b.kind === 'parallel') {
      for (const br of b.branches) {
        const r = findBlock(br, id)
        if (r) return r
      }
    }
  }
  return null
}

/** 在某 block 之后插入（同一容器列表内）；afterId 为 null 则插到顶层末尾 */
export function insertAfter(blocks: Block[], afterId: string | null, neu: Block): Block[] {
  if (afterId === null) return [...blocks, neu]
  const loc = locate(blocks, afterId)
  if (!loc) return [...blocks, neu]
  loc.list.splice(loc.index + 1, 0, neu)
  return [...blocks]
}

/** 插入到 if 分支(then/els) 或 loop 体的开头 */
export function insertIntoContainer(blocks: Block[], containerId: string, slot: 'then' | 'els' | 'body', neu: Block): Block[] {
  const c = findBlock(blocks, containerId)
  if (!c) return blocks
  if (c.kind === 'if' && (slot === 'then' || slot === 'els')) {
    c[slot] = [...c[slot], neu]
  } else if (c.kind === 'loop' && slot === 'body') {
    c.body = [...c.body, neu]
  }
  return [...blocks]
}

/** 在某 block 之前插入（同一容器列表内） */
export function insertBefore(blocks: Block[], beforeId: string, neu: Block): Block[] {
  const loc = locate(blocks, beforeId)
  if (!loc) return [...blocks, neu]
  loc.list.splice(loc.index, 0, neu)
  return [...blocks]
}

export function removeBlock(blocks: Block[], id: string): Block[] {
  const loc = locate(blocks, id)
  if (!loc) return blocks
  loc.list.splice(loc.index, 1)
  return [...blocks]
}

export function moveBlock(blocks: Block[], id: string, dir: -1 | 1): Block[] {
  const loc = locate(blocks, id)
  if (!loc) return blocks
  const j = loc.index + dir
  if (j < 0 || j >= loc.list.length) return blocks
  const a = loc.list[loc.index]
  const b = loc.list[j]
  // 关键修复：flowStart（独立流程起点标记）属于"位置"而非"块本身"。
  // 交换两块内容时必须让该标记留在原位置，否则把第 2 块上移到第 1 位会让它带着 flowStart，
  // 生成图时就被拆成两条独立流程、中间连线丢失（用户反馈的"变独立流程"bug）。
  const af = a.flowStart, bf = b.flowStart
  loc.list[loc.index] = { ...b, flowStart: af }
  loc.list[j] = { ...a, flowStart: bf }
  return [...blocks]
}

/** 收集一个块（含其分支/循环体）内的所有 block id */
function subtreeIds(b: Block, acc: Set<string>) {
  acc.add(b.id)
  if (b.kind === 'if') { b.then.forEach((x) => subtreeIds(x, acc)); b.els.forEach((x) => subtreeIds(x, acc)) }
  else if (b.kind === 'loop') { b.body.forEach((x) => subtreeIds(x, acc)) }
  else if (b.kind === 'parallel') { b.branches.forEach((br) => br.forEach((x) => subtreeIds(x, acc))) }
}

/**
 * 把已存在的块（含子结构）移动到目标位置。
 * target: { mode:'after', id } 移到某块之后（id 为 null 移到顶层末尾）；
 *         { mode:'into', id, slot } 移入某容器分支/循环体末尾。
 * 防护：不允许移入自身子树（否则会丢失结构）。
 */
export function moveBlockTo(
  blocks: Block[],
  id: string,
  target: { mode: 'after'; id: string | null } | { mode: 'before'; id: string } | { mode: 'into'; id: string; slot: 'then' | 'els' | 'body' },
): Block[] {
  const moving = findBlock(blocks, id)
  if (!moving) return blocks
  // 目标不能是被移动块本身或其子孙
  const ids = new Set<string>()
  subtreeIds(moving, ids)
  const targetId = target.id
  if (targetId && ids.has(targetId)) return blocks

  // —— 维护 flowStart（独立流程起点标记），避免移动后把一条流程拆断或误并 ——
  // 1) 若被移动块本身是某条顶层流程的起点，移除后让它的下一个顶层兄弟接管起点标记，
  //    保证它原来所在的那条流程不丢起点。
  if (moving.flowStart) {
    const ti = blocks.findIndex((b) => b.id === id)
    if (ti >= 0 && ti + 1 < blocks.length && !blocks[ti + 1].flowStart) {
      blocks[ti + 1] = { ...blocks[ti + 1], flowStart: true }
    }
  }
  // 2) 被移动块在落到新位置前先清掉起点标记（默认它接到序列中间，不该成为新流程起点）
  const targetWasTopFlowStart = target.mode === 'before' && blocks.some((b) => b.id === target.id && b.flowStart)
  moving.flowStart = false

  // 先摘除
  const removed = removeBlock(blocks, id)
  // 再插入到目标
  let result: Block[]
  if (target.mode === 'after') result = insertAfter(removed, target.id, moving)
  else if (target.mode === 'before') result = insertBefore(removed, target.id, moving)
  else result = insertIntoContainer(removed, target.id, target.slot, moving)

  // 3) 若是"移到某顶层流程起点之前"，让被移动块接管起点，原起点块取消起点（仍属同一条流程）
  if (targetWasTopFlowStart) {
    result = result.map((b) =>
      b.id === moving.id ? { ...b, flowStart: true } : (b.id === target.id ? { ...b, flowStart: false } : b)
    )
  }
  // 4) 顶层第一个块必须是流程起点
  if (result.length > 0 && !result[0].flowStart) {
    result = result.map((b, i) => (i === 0 ? { ...b, flowStart: true } : b))
  }
  return result
}
