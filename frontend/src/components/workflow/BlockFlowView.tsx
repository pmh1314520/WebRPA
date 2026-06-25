/**
 * 模块条视图（影刀式结构化编辑）
 *
 * 纯模块条模式即可搭建任意工作流（含条件/循环/嵌套），无需切回流程图。
 * 以「结构树」为操作对象，每次编辑后由树重新生成完整的图（自动连线）。
 */
import { useMemo, useState, useEffect, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import type React from 'react'
import { useWorkflowStore, moduleTypeLabels, type NodeData, type ErrorPolicy } from '@/store/workflowStore'
import { useNodeRunStore } from '@/store/nodeRunStore'
import { moduleIcons, moduleCategories, moduleKeywords } from './ModuleSidebar'
import { moduleColors } from './moduleColors'
import { SelectNative } from '@/components/ui/select-native'
import { Plus, Search, Trash2, X, ChevronUp, ChevronDown, Ban, CheckCircle2, RotateCcw } from 'lucide-react'
import type { ModuleType } from '@/types'
import {
  parseGraphToBlocks, generateGraphFromBlocks, createBlock,
  insertAfter, insertBefore, insertIntoContainer, removeBlock, moveBlock, moveBlockTo,
  cloneBlock,  type Block,
} from './blockFlowModel'
import { collectNodeVarNames } from '@/lib/moduleDefaultVars'
import { moduleMatchesQuery } from '@/lib/pinyin'

// 模块条复制粘贴的会话级剪贴板（跨组件重渲染保留；存的是已换新 id 的快照，
// 每次粘贴时再 clone 一次，保证可重复粘贴且 id 不冲突）
let blockClipboard: Block[] = []

// 插入目标：在某 block 之前/之后，或插入某容器的分支/循环体
type PickerTarget =
  | { mode: 'before'; id: string }
  | { mode: 'after'; id: string | null }
  | { mode: 'into'; id: string; slot: 'then' | 'els' | 'body' }

function getSummary(data: NodeData): string {
  const candidates = ['url', 'selector', 'text', 'value', 'filePath', 'inputPath', 'message', 'variableName', 'resultVariable', 'condition', 'count', 'listVariable']
  for (const k of candidates) {
    const v = data[k]
    if (v && typeof v === 'string' && v.trim()) return v.length > 40 ? v.slice(0, 40) + '…' : v
  }
  return ''
}

/** 分支模块的两个分支显示标签 + 头部前缀（与 ModuleNode 端点标签一致） */
function branchLabels(mt: string): { yes: string; no: string; head: string } {
  if (mt === 'probability_trigger') return { yes: '路径1', no: '路径2', head: '概率' }
  if (mt === 'face_recognition') return { yes: '匹配', no: '不匹配', head: '如果' }
  if (mt === 'element_visible') return { yes: '可见', no: '不可见', head: '如果' }
  if (mt === 'element_exists' || mt === 'image_exists' || mt === 'phone_image_exists') return { yes: '存在', no: '不存在', head: '如果' }
  return { yes: '是', no: '否', head: '如果' }
}

/** 模块选择弹层（portal 到 body，fixed 定位，避免被滚动容器裁剪） */
function ModulePicker({ x, y, onPick, onClose }: { x: number; y: number; onPick: (t: ModuleType) => void; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const q = query.trim()
  const filtered = useMemo(() => moduleCategories
    .map((cat) => ({ ...cat, modules: cat.modules.filter((m) => {
      if (!q) return true
      // 统一三处搜索入口：对「中文 label + 英文名 + 关键词」逐项 pinyinMatch，命中任一即返回
      // 支持中文原文 / 拼音全拼 / 拼音首字母 / 英文类型名 / 关键词，且大小写不敏感
      return moduleMatchesQuery(q, {
        label: moduleTypeLabels[m] || m,
        type: m,
        keywords: moduleKeywords[m] || [],
      })
    }) }))
    .filter((cat) => cat.modules.length > 0), [q])
  // 视口内夹取，避免溢出
  const W = 340, H = 420
  const left = Math.max(8, Math.min(x, window.innerWidth - W - 8))
  const top = Math.max(8, Math.min(y, window.innerHeight - H - 8))
  return createPortal(
    <>
      <div className="fixed inset-0 z-[9998]" onClick={onClose} />
      <div
        className="fixed z-[9999] w-[340px] max-h-[420px] overflow-hidden flex flex-col rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-pop-2xl animate-scale-in"
        style={{ left, top }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[hsl(var(--border))]">
          <Search className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索模块（支持拼音）" className="flex-1 bg-transparent outline-none text-[13px]" />
          <button onClick={onClose} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"><X className="w-3.5 h-3.5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-1.5" onWheel={(e) => e.stopPropagation()}>
          {filtered.map((cat) => (
            <div key={cat.name} className="mb-1">
              <div className="px-2 py-1 text-[10.5px] font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{cat.name}</div>
              {cat.modules.map((m) => {
                const Icon = moduleIcons[m]
                return (
                  <button key={m} onClick={() => onPick(m)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[7px] text-left hover:bg-[hsl(var(--brand-50))] transition-colors">
                    {Icon && <Icon className="w-3.5 h-3.5 text-[hsl(var(--brand-600))]" />}
                    <span className="text-[12.5px] text-[hsl(var(--slate-700))]">{moduleTypeLabels[m] || m}</span>
                  </button>
                )
              })}
            </div>
          ))}
          {filtered.length === 0 && <div className="py-6 text-center text-[12px] text-[hsl(var(--muted-foreground))]">无匹配模块</div>}
        </div>
      </div>
    </>,
    document.body,
  )
}


export function BlockFlowView() {
  const nodes = useWorkflowStore((s) => s.nodes)
  const edges = useWorkflowStore((s) => s.edges)
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId)
  const selectNode = useWorkflowStore((s) => s.selectNode)
  const setGraph = useWorkflowStore((s) => s.setGraph)
  const toggleNodesDisabled = useWorkflowStore((s) => s.toggleNodesDisabled)
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData)
  const ensureGlobalVariables = useWorkflowStore((s) => s.ensureGlobalVariables)
  const runStatuses = useNodeRunStore((s) => s.statuses)

  // 多选（像资源管理器：单击单选 / Ctrl 切换 / Shift 范围 / Ctrl+A 全选）
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const lastClickedRef = useRef<string | null>(null)
  // 鼠标当前悬停的插入点（用于"粘贴到这两个模块之间"而非永远粘到底部）
  const hoverTargetRef = useRef<PickerTarget | null>(null)
  // 模块条滚动容器 + 持续记录的滚动位置。
  // 因 HoverInsert/EmptySlot 等为内联组件，任何重渲染都会整列表重挂载、浏览器把 scrollTop 清零；
  // 这里用 onScroll 持续记录用户滚动位置，并在每次渲染后（useLayoutEffect，早于浏览器异步 scroll 事件）
  // 同步恢复，从根上消除"打开选择器/增删模块后自动滚回顶部"。
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const savedScrollRef = useRef<number>(0)

  const blocks = useMemo(() => parseGraphToBlocks(nodes, edges), [nodes, edges])

  // 每次渲染后把滚动位置恢复到用户上次所在处（仅当被重挂载清零等导致偏离时）
  useLayoutEffect(() => {
    const el = scrollContainerRef.current
    if (el && Math.abs(el.scrollTop - savedScrollRef.current) > 1) {
      el.scrollTop = savedScrollRef.current
    }
  })
  const [picker, setPicker] = useState<{ target: PickerTarget; x: number; y: number } | null>(null)
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null)
  const [dropActive, setDropActive] = useState(false)
  // 错误策略弹层（点击模块行的"出错处理"按钮打开）
  const [errPopover, setErrPopover] = useState<{ nodeId: string; x: number; y: number } | null>(null)
  // 折叠的容器块 id 集合（循环体/条件分支/并行分支可点击收起，提升可读性）
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const toggleCollapse = (id: string) => setCollapsed((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  // 所有结构化编辑：基于当前图重新解析出可变树 → 编辑 → 重新生成图 → 提交
  // 关键：重新生成只管 moduleNode；分组/便签/子流程头等非模块节点及其相关连线原样保留，避免数据丢失
  const applyEdit = (fn: (tree: Block[]) => Block[]) => {
    const tree = parseGraphToBlocks(nodes, edges)
    const next = fn(tree)
    const g = generateGraphFromBlocks(next)
    const moduleIds = new Set(g.nodes.map((n) => n.id))
    // 保留非模块节点（group/note/subflowHeader 等）
    const preservedNodes = nodes.filter((n) => n.type !== 'moduleNode')
    // 保留涉及非模块节点的连线（如子流程头 → 首个模块）
    const preservedEdges = edges.filter((e) => {
      const sIsModule = moduleIds.has(e.source)
      const tIsModule = moduleIds.has(e.target)
      return !(sIsModule && tIsModule) // 模块↔模块的边由生成器重建，其余保留
    })
    setGraph([...g.nodes, ...preservedNodes], [...g.edges, ...preservedEdges])
  }

  // 统一插入逻辑（点击选择 / 拖拽放入 共用）
  const insertAt = (target: PickerTarget, type: ModuleType, extra?: Partial<NodeData>) => {
    let createdData: Record<string, unknown> | null = null
    applyEdit((tree) => {
      const neu = createBlock(type, extra)
      createdData = neu.node.data as Record<string, unknown>
      if (target.mode === 'after') return insertAfter(tree, target.id, neu)
      if (target.mode === 'before') return insertBefore(tree, target.id, neu)
      return insertIntoContainer(tree, target.id, target.slot, neu)
    })
    // 创建模块时自动在全局变量中建立其自带的默认变量（如循环的 index），已存在同名则不覆盖
    ensureGlobalVariables(collectNodeVarNames(type, createdData || undefined))
  }

  // 打开模块选择弹层（记录锚点坐标，portal 定位）
  const openPicker = (target: PickerTarget, e: React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setPicker({ target, x: r.left, y: r.bottom + 4 })
  }

  // 解析拖拽数据 → {type, extra}
  const parseDrag = (dataStr: string): { type: ModuleType; extra?: Partial<NodeData> } | null => {
    if (!dataStr) return null
    try {
      const parsed = JSON.parse(dataStr)
      if (parsed && parsed.type === 'custom_module' && parsed.moduleId) {
        return { type: 'custom_module' as ModuleType, extra: { customModuleId: parsed.moduleId } as Partial<NodeData> }
      }
    } catch { /* 普通模块字符串 */ }
    return { type: dataStr as ModuleType }
  }

  const handlePick = (type: ModuleType, extra?: Partial<NodeData>) => {
    if (!picker) return
    insertAt(picker.target, type, extra)
    setPicker(null)
  }

  const handleDelete = (id: string) => applyEdit((tree) => removeBlock(tree, id))
  const handleMove = (id: string, dir: -1 | 1) => applyEdit((tree) => moveBlock(tree, id, dir))

  // —— 错误策略（错误回流 / 重试 / 跳过）——
  const nodeLabel = (id: string): string => {
    const n = nodes.find((x) => x.id === id)
    if (!n) return id
    return (n.data?.label as string) || moduleTypeLabels[n.data?.moduleType as ModuleType] || (n.data?.moduleType as string) || id
  }
  // 行内徽标摘要（仅在设置了非默认策略时显示）
  const policyText = (p?: ErrorPolicy): string => {
    if (!p || !p.mode || p.mode === 'stop') return ''
    if (p.mode === 'continue') return '出错跳过'
    if (p.mode === 'retry-self') return `出错重试 ${p.maxRetries ?? 1} 次`
    if (p.mode === 'retry-from') return `出错回流「${p.targetId ? nodeLabel(p.targetId) : '上层'}」×${p.maxRetries ?? 1}`
    return ''
  }
  // 设置某节点错误策略（mode='stop' 视为清除）
  const setPolicy = (nodeId: string, patch: Partial<ErrorPolicy>) => {
    const cur = (nodes.find((n) => n.id === nodeId)?.data?.errorPolicy) as ErrorPolicy | undefined
    const base: ErrorPolicy = cur || { mode: 'stop' }
    const next: ErrorPolicy = { maxRetries: 1, interval: 0, onExhausted: 'stop', ...base, ...patch }
    if (next.mode === 'stop') {
      updateNodeData(nodeId, { errorPolicy: undefined })
    } else {
      updateNodeData(nodeId, { errorPolicy: next })
    }
  }
  // 回流目标候选：可见顺序里排在当前块之前的所有模块（不含自己）
  const reflowCandidates = (nodeId: string): { id: string; label: string }[] => {
    const ids = flatBlocks.map((b) => b.id)
    const idx = ids.indexOf(nodeId)
    const before = idx < 0 ? ids : ids.slice(0, idx)
    return before.map((id) => ({ id, label: nodeLabel(id) }))
  }

  // 批量删除选中块
  const handleDeleteMany = (ids: string[]) => {
    if (ids.length === 0) return
    applyEdit((tree) => ids.reduce((t, id) => removeBlock(t, id), tree))
    setSelectedIds(new Set())
  }

  // 可见顺序的扁平块列表（键盘导航用；折叠容器的子项跳过）
  const flatBlocks = useMemo(() => {
    const out: { id: string; isContainer: boolean }[] = []
    const walk = (seq: Block[]) => {
      for (const b of seq) {
        const isContainer = b.kind === 'if' || b.kind === 'loop' || b.kind === 'parallel'
        out.push({ id: b.id, isContainer })
        if (collapsed.has(b.id)) continue
        if (b.kind === 'if') { walk(b.then); walk(b.els) }
        else if (b.kind === 'loop') walk(b.body)
        else if (b.kind === 'parallel') b.branches.forEach(walk)
      }
    }
    walk(blocks)
    return out
  }, [blocks, collapsed])

  const scrollRowIntoView = (id: string) => {
    const el = document.querySelector(`[data-block-id="${id}"]`)
    if (el) (el as HTMLElement).scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }

  // 行点击：支持单选 / Ctrl 切换 / Shift 范围选（按可见顺序）
  const handleRowClick = (e: React.MouseEvent, id: string) => {
    const ids = flatBlocks.map((b) => b.id)
    if (e.shiftKey && lastClickedRef.current && ids.includes(lastClickedRef.current)) {
      const a = ids.indexOf(lastClickedRef.current)
      const b = ids.indexOf(id)
      const [lo, hi] = a < b ? [a, b] : [b, a]
      setSelectedIds(new Set(ids.slice(lo, hi + 1)))
      selectNode(id)
    } else if (e.ctrlKey || e.metaKey) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id); else next.add(id)
        return next
      })
      lastClickedRef.current = id
      selectNode(id)
    } else {
      setSelectedIds(new Set([id]))
      lastClickedRef.current = id
      selectNode(id)
    }
  }
  // 右键菜单（选中模块条后右键弹出批量操作）
  const handleRowContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    // 若右键的模块不在已选集合中，则把它设为当前选择（与资源管理器一致）
    setSelectedIds((prev) => {
      if (prev.has(id)) return prev
      return new Set([id])
    })
    if (!selectedIds.has(id)) {
      lastClickedRef.current = id
      selectNode(id)
    }
    setCtxMenu({ x: e.clientX, y: e.clientY })
  }

  const openPickerAt = (target: PickerTarget, anchorId: string) => {
    const el = document.querySelector(`[data-block-id="${anchorId}"]`) as HTMLElement | null
    if (el) {
      const r = el.getBoundingClientRect()
      setPicker({ target, x: r.left, y: r.bottom + 4 })
    } else {
      setPicker({ target, x: 220, y: 200 })
    }
  }

  // —— 模块条复制 / 粘贴 ——
  // 收集"顶层选中块"（若某块的祖先也被选中，则只保留祖先，避免重复复制），按可见顺序
  const collectTopLevelSelected = (seq: Block[], sel: Set<string>, out: Block[]) => {
    for (const b of seq) {
      if (sel.has(b.id)) { out.push(b); continue } // 命中即收，不再深入其子树
      if (b.kind === 'if') { collectTopLevelSelected(b.then, sel, out); collectTopLevelSelected(b.els, sel, out) }
      else if (b.kind === 'loop') collectTopLevelSelected(b.body, sel, out)
      else if (b.kind === 'parallel') b.branches.forEach((br) => collectTopLevelSelected(br, sel, out))
    }
  }
  const handleCopy = () => {
    const sel: Set<string> = selectedIds.size > 0 ? selectedIds : (selectedNodeId ? new Set([selectedNodeId]) : new Set())
    if (sel.size === 0) return
    const picked: Block[] = []
    collectTopLevelSelected(blocks, sel, picked)
    if (picked.length === 0) return
    blockClipboard = picked.map(cloneBlock) // 存独立 id 的快照
  }
  const handlePaste = (target?: PickerTarget) => {
    if (blockClipboard.length === 0) return
    const fresh = blockClipboard.map(cloneBlock) // 每次粘贴再换新 id，可重复粘贴
    const newIds = fresh.map((b) => b.id)
    // 插入目标优先级：显式传入 > 鼠标悬停的插入点（粘到两模块之间） > 当前选中块之后 > 顶层末尾
    const tgt: PickerTarget = target
      || hoverTargetRef.current
      || (selectedNodeId ? { mode: 'after', id: selectedNodeId } : { mode: 'after', id: null })
    applyEdit((tree) => {
      let t = tree
      if (tgt.mode === 'before') {
        t = insertBefore(t, tgt.id, fresh[0])
        let afterId = fresh[0].id
        for (let i = 1; i < fresh.length; i++) { t = insertAfter(t, afterId, fresh[i]); afterId = fresh[i].id }
      } else if (tgt.mode === 'into') {
        t = insertIntoContainer(t, tgt.id, tgt.slot, fresh[0])
        let afterId = fresh[0].id
        for (let i = 1; i < fresh.length; i++) { t = insertAfter(t, afterId, fresh[i]); afterId = fresh[i].id }
      } else {
        let afterId: string | null = tgt.id
        for (const blk of fresh) { t = insertAfter(t, afterId, blk); afterId = blk.id }
      }
      return t
    })
    // 选中粘贴出来的块，方便连续操作
    setSelectedIds(new Set(newIds))
    const last = newIds[newIds.length - 1]
    if (last) { selectNode(last); lastClickedRef.current = last }
  }

  // 键盘操作：↑/↓ 选择，Enter 在下方插入，Delete 删除，Ctrl+/ 折叠当前容器，Ctrl+C/V 复制粘贴
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (picker) return
      const ids = flatBlocks.map((b) => b.id)
      if (ids.length === 0) return
      const curIdx = selectedNodeId ? ids.indexOf(selectedNodeId) : -1
      // Ctrl+A 全选
      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault()
        setSelectedIds(new Set(ids))
        return
      }
      // Ctrl+Z 撤销 / Ctrl+Y(或 Ctrl+Shift+Z) 重做 —— 复用全局工作流历史
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault()
        useWorkflowStore.getState().undo()
        return
      }
      if ((e.ctrlKey || e.metaKey) && ((e.key === 'y' || e.key === 'Y') || (e.shiftKey && (e.key === 'z' || e.key === 'Z')))) {
        e.preventDefault()
        useWorkflowStore.getState().redo()
        return
      }
      // Ctrl+D 禁用/启用选中模块
      if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault()
        const targets = selectedIds.size > 0 ? Array.from(selectedIds) : (selectedNodeId ? [selectedNodeId] : [])
        if (targets.length > 0) toggleNodesDisabled(targets)
        return
      }
      // Ctrl+C 复制选中模块（含其分支/循环体）
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault()
        handleCopy()
        return
      }
      // Ctrl+V 粘贴到当前选中模块之后（无选中则追加到末尾）
      if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault()
        handlePaste()
        return
      }
      // Ctrl+X 剪切 = 复制 + 删除
      if ((e.ctrlKey || e.metaKey) && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault()
        handleCopy()
        const targets = selectedIds.size > 0 ? Array.from(selectedIds) : (selectedNodeId ? [selectedNodeId] : [])
        if (targets.length > 1) handleDeleteMany(targets)
        else if (targets.length === 1) handleDelete(targets[0])
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const ni = curIdx < 0 ? 0 : Math.min(ids.length - 1, curIdx + 1)
        selectNode(ids[ni]); setSelectedIds(new Set([ids[ni]])); lastClickedRef.current = ids[ni]; scrollRowIntoView(ids[ni])
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const pi = curIdx < 0 ? 0 : Math.max(0, curIdx - 1)
        selectNode(ids[pi]); setSelectedIds(new Set([ids[pi]])); lastClickedRef.current = ids[pi]; scrollRowIntoView(ids[pi])
      } else if (e.key === 'Enter' && selectedNodeId && curIdx >= 0) {
        e.preventDefault()
        openPickerAt({ mode: 'after', id: selectedNodeId }, selectedNodeId)
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && (selectedIds.size > 0 || selectedNodeId)) {
        e.preventDefault()
        if (selectedIds.size > 1) handleDeleteMany(Array.from(selectedIds))
        else if (selectedNodeId) handleDelete(selectedNodeId)
      } else if (e.ctrlKey && (e.key === '/' || e.key === '、')) {
        e.preventDefault()
        const f = flatBlocks.find((b) => b.id === selectedNodeId)
        if (f?.isContainer) toggleCollapse(selectedNodeId!)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flatBlocks, selectedNodeId, selectedIds, picker])

  // 投放到指定插入点（分支内/循环体内/任意位置都可）；支持新建模块 或 移动已有块
  const handleDropAt = (e: React.DragEvent, target: PickerTarget) => {
    const moveId = e.dataTransfer.getData('application/blockmove')
    if (moveId) {
      e.preventDefault()
      e.stopPropagation()
      applyEdit((tree) => moveBlockTo(tree, moveId, target))
      return
    }
    const p = parseDrag(e.dataTransfer.getData('application/reactflow'))
    if (!p) return
    e.preventDefault()
    e.stopPropagation()
    insertAt(target, p.type, p.extra)
  }

  // 从左侧拖模块到空白处：追加到顶层末尾；拖动已有块到空白处：移到末尾
  const handleCanvasDrop = (e: React.DragEvent) => {
    setDropActive(false)
    const moveId = e.dataTransfer.getData('application/blockmove')
    if (moveId) {
      e.preventDefault()
      applyEdit((tree) => moveBlockTo(tree, moveId, { mode: 'after', id: null }))
      return
    }
    const p = parseDrag(e.dataTransfer.getData('application/reactflow'))
    if (!p) return
    e.preventDefault()
    insertAt({ mode: 'after', id: null }, p.type, p.extra)
  }

  const INDENT = 24
  void INDENT

  // ===== 影刀风格紧凑步骤行（本身即投放区：按上/下半判断插到该行前/后）=====
  const StepRow = ({ block, num, kind, collapsible, isCollapsed, onToggle, childCount }: { block: Block; num: number; kind: 'step' | 'if' | 'loop' | 'parallel'; collapsible?: boolean; isCollapsed?: boolean; onToggle?: () => void; childCount?: number }) => {
    const node = block.node
    const data = node.data as NodeData
    const type = data.moduleType as ModuleType
    const Icon = moduleIcons[type]
    const parts = (moduleColors[type] || '').split(' ')
    const borderCls = parts.find((c) => c.startsWith('border-')) || 'border-slate-300'
    const bgCls = parts.find((c) => c.startsWith('bg-')) || 'bg-slate-100'
    // 由分类描边色派生：强调条(bg-xxx-500) 与图标色(text-xxx-600)
    const accentBar = borderCls.replace('border-', 'bg-')
    const accentText = borderCls.replace('border-', 'text-').replace(/-500$/, '-600')
    const summary = getSummary(data)
    const selected = node.id === selectedNodeId
    const multiSelected = selectedIds.has(node.id)
    const isSel = selected || multiSelected
    const isRun = runStatuses[node.id] === 'running' || runStatuses[node.id] === 'success' || runStatuses[node.id] === 'failed'
    const disabled = !!data.disabled
    // 容器块（如果/循环/并行）用语义标签作主名，不再叠加模块名，避免“循环 循环”这类重复
    const semanticTag = kind === 'if' ? branchLabels(type).head : kind === 'loop' ? '循环' : kind === 'parallel' ? '并行' : ''
    const customName = (data.name as string) || ''
    const primaryName = kind === 'step'
      ? (customName || moduleTypeLabels[type] || type)
      : kind === 'parallel'
        ? (customName || moduleTypeLabels[type] || type)  // 并行头本身是真实步骤，正常显示模块名
        : customName                                       // 如果/循环：语义由左侧标签承载，仅在有自定义名时再显示
    const [dropPos, setDropPos] = useState<'top' | 'bottom' | null>(null)
    const onRowDragOver = (e: React.DragEvent) => {
      if (!(e.dataTransfer.types.includes('application/reactflow') || e.dataTransfer.types.includes('application/blockmove'))) return
      e.preventDefault(); e.stopPropagation()
      const r = e.currentTarget.getBoundingClientRect()
      setDropPos(e.clientY < r.top + r.height / 2 ? 'top' : 'bottom')
    }
    const onRowDrop = (e: React.DragEvent) => {
      const pos = dropPos
      setDropPos(null)
      handleDropAt(e, pos === 'top' ? { mode: 'before', id: block.id } : { mode: 'after', id: block.id })
    }
    return (
      <div
        draggable
        data-block-id={node.id}
        onDragStart={(e) => { e.dataTransfer.setData('application/blockmove', block.id); e.dataTransfer.effectAllowed = 'move' }}
        onDragOver={onRowDragOver}
        onDragLeave={() => setDropPos(null)}
        onDrop={onRowDrop}
        onClick={(e) => handleRowClick(e, node.id)}
        onContextMenu={(e) => handleRowContextMenu(e, node.id)}
        className={
          'group/row relative flex items-center gap-2.5 pl-3 pr-2 py-2 rounded-[10px] border cursor-grab active:cursor-grabbing transition-[box-shadow,border-color,background-color,transform] duration-150 ' +
          (disabled ? 'opacity-55 grayscale-[0.4] ' : '') +
          (runStatuses[node.id] === 'running'
            ? 'bg-[hsl(var(--card))] border-[hsl(var(--brand-500))] ring-2 ring-[hsl(var(--brand-500)/0.5)] shadow-brand-glow animate-pulse'
            : runStatuses[node.id] === 'success'
              ? 'bg-[hsl(var(--card))] border-[hsl(var(--success-500))] ring-1 ring-[hsl(var(--success-500)/0.4)]'
              : runStatuses[node.id] === 'failed'
                ? 'bg-[hsl(var(--card))] border-[hsl(var(--danger-500))] ring-1 ring-[hsl(var(--danger-500)/0.45)]'
                : isSel
                  ? '!bg-[hsl(var(--brand-100))] border-[hsl(var(--brand-500))] ring-2 ring-[hsl(var(--brand-500)/0.55)] shadow-pop -translate-y-[1px]'
                  : 'bg-[hsl(var(--card))] border-[hsl(var(--border))] hover:border-[hsl(var(--brand-500)/0.4)] hover:shadow-pop hover:-translate-y-[1px]')
        }
      >
        {dropPos && <div className={'absolute left-2 right-2 h-[3px] rounded-full bg-[hsl(var(--brand-500))] shadow-brand-glow z-10 ' + (dropPos === 'top' ? '-top-[2px]' : '-bottom-[2px]')} />}
        {/* 左强调条：选中时变为品牌色并加粗，强化选中可见性 */}
        <span className={'absolute left-0 top-1 bottom-1 rounded-full transition-all ' + (isSel && !isRun ? 'w-[4px] bg-[hsl(var(--brand-500))]' : 'w-[3px] top-1.5 bottom-1.5 ' + accentBar)} />
        {/* 折叠箭头（容器块） */}
        {collapsible ? (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle?.() }}
            className="flex items-center justify-center w-4 h-4 flex-shrink-0 rounded text-[hsl(var(--slate-400))] hover:text-[hsl(var(--brand-600))] transition-transform"
            title={isCollapsed ? '展开' : '收起'}
          >
            <ChevronDown className={'w-3.5 h-3.5 transition-transform duration-150 ' + (isCollapsed ? '-rotate-90' : '')} />
          </button>
        ) : null}
        <span className={'w-4 text-right text-[10.5px] font-mono flex-shrink-0 tabular-nums ' + (isSel && !isRun ? 'font-bold text-[hsl(var(--brand-600))]' : 'text-[hsl(var(--slate-400))]')}>{num}</span>
        <span className={'relative flex items-center justify-center w-7 h-7 rounded-[8px] flex-shrink-0 ' + bgCls}>
          {Icon && <Icon className={'w-4 h-4 ' + accentText} strokeWidth={2} />}
          {multiSelected && !isRun && (
            <span className="absolute -top-1.5 -right-1.5 bg-[hsl(var(--card))] rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5 text-[hsl(var(--brand-600))] fill-[hsl(var(--brand-100))]" strokeWidth={2.5} />
            </span>
          )}
        </span>
        <div className="flex-1 min-w-0 flex items-baseline gap-2">
          {(kind === 'if' || kind === 'loop' || kind === 'parallel') && (
            <span className={'flex-shrink-0 px-1.5 py-0.5 rounded-[5px] text-[10.5px] font-bold ' +
              (kind === 'loop' ? 'bg-[hsl(var(--teal-50))] text-[hsl(var(--teal-700))]'
                : kind === 'parallel' ? 'bg-[hsl(var(--violet-50))] text-[hsl(var(--violet-700))]'
                : 'bg-[hsl(var(--brand-50))] text-[hsl(var(--brand-700))]')}>{semanticTag}</span>
          )}
          {primaryName && (
            <span className="text-[13px] font-semibold text-[hsl(var(--slate-800))] whitespace-nowrap tracking-tight">
              {primaryName}
            </span>
          )}
          {summary && <span className="text-[11px] text-[hsl(var(--slate-500))] truncate font-mono">{summary}</span>}
          {disabled && (
            <span className="flex-shrink-0 px-1.5 py-0.5 rounded-[5px] text-[10px] font-bold bg-[hsl(var(--slate-200))] text-[hsl(var(--slate-500))] border border-[hsl(var(--slate-300))]">已禁用</span>
          )}
          {policyText(node.data.errorPolicy as ErrorPolicy) && (
            <span className="flex-shrink-0 px-1.5 py-0.5 rounded-[5px] text-[10px] font-bold bg-[hsl(var(--warning-500)/0.12)] text-[hsl(var(--warning-700))] border border-[hsl(var(--warning-500)/0.3)] inline-flex items-center gap-1" title="该模块的出错处理策略">
              <RotateCcw className="w-2.5 h-2.5" /> {policyText(node.data.errorPolicy as ErrorPolicy)}
            </span>
          )}
          {isCollapsed && childCount ? <span className="text-[10.5px] text-[hsl(var(--slate-400))] flex-shrink-0">· 已折叠 {childCount} 步</span> : null}
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation()
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
              setErrPopover({ nodeId: node.id, x: Math.min(r.left - 280, window.innerWidth - 320), y: r.bottom + 4 })
            }}
            className={'p-1 rounded-[6px] transition-colors hover:bg-[hsl(var(--warning-500)/0.12)] ' + (policyText(node.data.errorPolicy as ErrorPolicy) ? 'text-[hsl(var(--warning-600))]' : 'text-[hsl(var(--slate-400))] hover:text-[hsl(var(--warning-600))]')}
            title="出错处理（原地重试 / 回流上层重试 / 跳过继续）"
          ><RotateCcw className="w-3.5 h-3.5" /></button>
          <button onClick={(e) => { e.stopPropagation(); handleMove(block.id, -1) }} className="p-1 rounded-[6px] text-[hsl(var(--slate-400))] hover:text-[hsl(var(--brand-600))] hover:bg-[hsl(var(--brand-50))] transition-colors" title="上移"><ChevronUp className="w-3.5 h-3.5" /></button>
          <button onClick={(e) => { e.stopPropagation(); handleMove(block.id, 1) }} className="p-1 rounded-[6px] text-[hsl(var(--slate-400))] hover:text-[hsl(var(--brand-600))] hover:bg-[hsl(var(--brand-50))] transition-colors" title="下移"><ChevronDown className="w-3.5 h-3.5" /></button>
          <button onClick={(e) => { e.stopPropagation(); toggleNodesDisabled([node.id]) }} className={'p-1 rounded-[6px] transition-colors hover:bg-[hsl(var(--slate-100))] ' + (disabled ? 'text-[hsl(var(--brand-600))]' : 'text-[hsl(var(--slate-400))] hover:text-[hsl(var(--slate-700))]')} title={disabled ? '启用 (Ctrl+D)' : '禁用 (Ctrl+D)'}><Ban className="w-3.5 h-3.5" /></button>
          <button onClick={(e) => { e.stopPropagation(); handleDelete(block.id) }} className="p-1 rounded-[6px] text-[hsl(var(--slate-400))] hover:text-[hsl(var(--danger-600))] hover:bg-[hsl(var(--danger-50))] transition-colors" title="删除"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    )
  }

  // ===== 悬停才显形的细插入线（点击弹选择器；兼作投放区）=====
  const HoverInsert = ({ target }: { target: PickerTarget }) => {
    const [over, setOver] = useState(false)
    return (
      <div
        className="relative group/ins flex items-center h-2.5"
        onMouseEnter={() => { hoverTargetRef.current = target }}
        onMouseLeave={() => { if (hoverTargetRef.current === target) hoverTargetRef.current = null }}
        onDragOver={(e) => { if (e.dataTransfer.types.includes('application/reactflow') || e.dataTransfer.types.includes('application/blockmove')) { e.preventDefault(); e.stopPropagation(); setOver(true) } }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { setOver(false); handleDropAt(e, target) }}
      >
        <div className={'flex-1 h-[2px] rounded transition-colors ' + (over ? 'bg-[hsl(var(--brand-500))]' : 'bg-transparent group-hover/ins:bg-[hsl(var(--brand-500)/0.25)]')} />
        <button
          onClick={(e) => { e.stopPropagation(); openPicker(target, e) }}
          className={'absolute left-3 flex items-center justify-center w-4 h-4 rounded-full bg-[hsl(var(--card))] border border-[hsl(var(--brand-500)/0.5)] text-[hsl(var(--brand-600))] transition-opacity ' + (over ? 'opacity-100' : 'opacity-0 group-hover/ins:opacity-100')}
          title="在此处插入模块"
        >
          <Plus className="w-2.5 h-2.5" />
        </button>
      </div>
    )
  }

  // 空分支/循环体的占位（可点可拖入）
  const EmptySlot = ({ target, text }: { target: PickerTarget; text: string }) => {
    const [over, setOver] = useState(false)
    return (
      <div
        onMouseEnter={() => { hoverTargetRef.current = target }}
        onMouseLeave={() => { if (hoverTargetRef.current === target) hoverTargetRef.current = null }}
        onDragOver={(e) => { if (e.dataTransfer.types.includes('application/reactflow') || e.dataTransfer.types.includes('application/blockmove')) { e.preventDefault(); e.stopPropagation(); setOver(true) } }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { setOver(false); handleDropAt(e, target) }}
        onClick={(e) => openPicker(target, e)}
        className={'flex items-center gap-1.5 px-2.5 py-1.5 rounded-[7px] border border-dashed cursor-pointer text-[11.5px] transition-colors ' +
          (over ? 'border-[hsl(var(--brand-500))] bg-[hsl(var(--brand-50))] text-[hsl(var(--brand-700))]' : 'border-[hsl(var(--slate-300))] text-[hsl(var(--slate-400))] hover:border-[hsl(var(--brand-500)/0.5)] hover:text-[hsl(var(--brand-600))]')}
      >
        <Plus className="w-3.5 h-3.5" /> {over ? '松手放入此处' : text}
      </div>
    )
  }

  // 统计一个序列内的步骤总数（用于折叠时显示“已折叠 N 步”、并保持序号稳定）
  const countSteps = (seq: Block[]): number => seq.reduce((n, b) => {
    if (b.kind === 'if') return n + 1 + countSteps(b.then) + countSteps(b.els)
    if (b.kind === 'loop') return n + 1 + countSteps(b.body)
    if (b.kind === 'parallel') return n + 1 + b.branches.reduce((m, br) => m + countSteps(br), 0)
    return n + 1
  }, 0)

  // 渲染一个序列（counter 维护全局序号）
  const renderSeq = (seq: Block[], counter: { n: number }): React.ReactNode[] => {
    const out: React.ReactNode[] = []
    seq.forEach((b, i) => {
      // 顶层独立流程（多路/并行执行）之间插入分隔标识
      if (b.flowStart && i > 0) {
        out.push(
          <div key={b.id + '^flow'} className="flex items-center gap-2 my-3 px-1">
            <span className="h-px flex-1 bg-[hsl(var(--border))]" />
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[hsl(var(--violet-50))] text-[hsl(var(--violet-700))] text-[10.5px] font-bold border border-[hsl(var(--violet-500)/0.25)]">独立流程</span>
            <span className="h-px flex-1 bg-[hsl(var(--border))]" />
          </div>
        )
      }
      out.push(<HoverInsert key={b.id + '^before'} target={{ mode: 'before', id: b.id }} />)
      const num = ++counter.n
      if (b.kind === 'step') {
        out.push(<StepRow key={b.id} block={b} num={num} kind="step" />)
      } else if (b.kind === 'if') {
        const lbl = branchLabels(b.node.data.moduleType as string)
        const isCol = collapsed.has(b.id)
        const cc = countSteps(b.then) + countSteps(b.els)
        if (isCol) counter.n += cc
        out.push(
          <div key={b.id} className="rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-pop overflow-hidden">
            <div className="bg-[hsl(var(--brand-50)/0.5)] border-b border-[hsl(var(--border))]">
              <StepRow block={b} num={num} kind="if" collapsible isCollapsed={isCol} onToggle={() => toggleCollapse(b.id)} childCount={cc} />
            </div>
            {!isCol && (<>
            <div className="pl-4 pr-2.5 py-2">
              <div className="mb-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[hsl(var(--success-50))] text-[hsl(var(--success-700))] text-[10.5px] font-bold border border-[hsl(var(--success-500)/0.25)]">{lbl.yes}</div>
              <div className="ml-1 pl-3 border-l-2 border-[hsl(var(--success-500)/0.3)] space-y-0.5">
                {renderSeq(b.then, counter)}
                <EmptySlot target={{ mode: 'into', id: b.id, slot: 'then' }} text={`添加「${lbl.yes}」分支步骤`} />
              </div>
            </div>
            <div className="pl-4 pr-2.5 pb-2">
              <div className="mb-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[hsl(var(--slate-100))] text-[hsl(var(--slate-600))] text-[10.5px] font-bold border border-[hsl(var(--slate-300))]">{lbl.no}</div>
              <div className="ml-1 pl-3 border-l-2 border-[hsl(var(--slate-300))] space-y-0.5">
                {renderSeq(b.els, counter)}
                <EmptySlot target={{ mode: 'into', id: b.id, slot: 'els' }} text={`添加「${lbl.no}」分支步骤`} />
              </div>
            </div>
            <div className="px-3 py-1.5 text-[10.5px] font-medium text-[hsl(var(--slate-400))] bg-[hsl(var(--slate-50))] border-t border-[hsl(var(--border))] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--slate-300))]" /> 结束判断
            </div>
            </>)}
          </div>
        )
      } else if (b.kind === 'loop') {
        const isCol = collapsed.has(b.id)
        const cc = countSteps(b.body)
        if (isCol) counter.n += cc
        out.push(
          <div key={b.id} className="rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-pop overflow-hidden">
            <div className="bg-[hsl(var(--teal-50)/0.5)] border-b border-[hsl(var(--border))]">
              <StepRow block={b} num={num} kind="loop" collapsible isCollapsed={isCol} onToggle={() => toggleCollapse(b.id)} childCount={cc} />
            </div>
            {!isCol && (<>
            <div className="pl-4 pr-2.5 py-2">
              <div className="mb-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[hsl(var(--teal-50))] text-[hsl(var(--teal-700))] text-[10.5px] font-bold border border-[hsl(var(--teal-500)/0.25)]">循环体</div>
              <div className="ml-1 pl-3 border-l-2 border-[hsl(var(--teal-500)/0.35)] space-y-0.5">
                {renderSeq(b.body, counter)}
                <EmptySlot target={{ mode: 'into', id: b.id, slot: 'body' }} text="添加循环体步骤" />
              </div>
            </div>
            <div className="px-3 py-1.5 text-[10.5px] font-medium text-[hsl(var(--slate-400))] bg-[hsl(var(--slate-50))] border-t border-[hsl(var(--border))] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--teal-400))]" /> 结束循环
            </div>
            </>)}
          </div>
        )
      } else {
        // 并行：本步骤之后并行分出多条分支
        const isCol = collapsed.has(b.id)
        const cc = b.branches.reduce((m, br) => m + countSteps(br), 0)
        if (isCol) counter.n += cc
        out.push(
          <div key={b.id} className="rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-pop overflow-hidden">
            <div className="bg-[hsl(var(--violet-50)/0.5)] border-b border-[hsl(var(--border))]">
              <StepRow block={b} num={num} kind="parallel" collapsible isCollapsed={isCol} onToggle={() => toggleCollapse(b.id)} childCount={cc} />
            </div>
            {!isCol && (
              <div className="pl-4 pr-2.5 py-2 space-y-2">
                {b.branches.map((br, bi) => (
                  <div key={b.id + '^b' + bi}>
                    <div className="mb-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[hsl(var(--violet-50))] text-[hsl(var(--violet-700))] text-[10.5px] font-bold border border-[hsl(var(--violet-500)/0.25)]">分支 {bi + 1}</div>
                    <div className="ml-1 pl-3 border-l-2 border-[hsl(var(--violet-500)/0.35)] space-y-0.5">
                      {renderSeq(br, counter)}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="px-3 py-1.5 text-[10.5px] font-medium text-[hsl(var(--slate-400))] bg-[hsl(var(--slate-50))] border-t border-[hsl(var(--border))] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--violet-400))]" /> 分支汇合
            </div>
          </div>
        )
      }
    })
    return out
  }

  // 收集所有可折叠容器块 id（用于一键展开/折叠）
  const collectContainerIds = (seq: Block[], acc: string[] = []): string[] => {
    seq.forEach((b) => {
      if (b.kind === 'if') { acc.push(b.id); collectContainerIds(b.then, acc); collectContainerIds(b.els, acc) }
      else if (b.kind === 'loop') { acc.push(b.id); collectContainerIds(b.body, acc) }
      else if (b.kind === 'parallel') { acc.push(b.id); b.branches.forEach((br) => collectContainerIds(br, acc)) }
    })
    return acc
  }
  const containerIds = collectContainerIds(blocks)
  const totalSteps = countSteps(blocks)

  return (
    <div
      ref={scrollContainerRef}
      onScroll={(e) => { savedScrollRef.current = (e.currentTarget as HTMLDivElement).scrollTop }}
      className={'h-full w-full overflow-y-auto bg-[hsl(var(--background))] py-5 px-4 ' + (dropActive ? 'ring-2 ring-inset ring-[hsl(var(--brand-500))]' : '')}
      onDragOver={(e) => { if (e.dataTransfer.types.includes('application/reactflow') || e.dataTransfer.types.includes('application/blockmove')) { e.preventDefault(); setDropActive(true) } }}
      onDragLeave={() => setDropActive(false)}
      onDrop={handleCanvasDrop}
    >
      <div className="w-full max-w-[1280px] mx-auto">
        {blocks.length > 0 && (
          <div className="flex items-center justify-between mb-3 px-0.5">
            <span className="text-[12px] text-[hsl(var(--muted-foreground))]">
              共 <span className="font-semibold text-[hsl(var(--slate-700))] tabular-nums">{totalSteps}</span> 个步骤
              {selectedIds.size > 0 && (
                <span className="ml-2 text-[11px] font-semibold text-[hsl(var(--brand-600))]">已选 {selectedIds.size}</span>
              )}
              <span className="hidden lg:inline ml-2 text-[10.5px] text-[hsl(var(--slate-400))]">↑↓ 选择 · Enter 插入 · Ctrl+A 全选 · Ctrl 点选/Shift 范围 · Ctrl+C/V 复制粘贴 · Ctrl+X 剪切 · Ctrl+Z/Y 撤销重做 · Ctrl+D 禁用 · Delete 删除 · Ctrl+/ 折叠</span>
            </span>
            {selectedIds.size > 0 ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="px-2 py-1 rounded-[6px] text-[11.5px] text-[hsl(var(--slate-600))] hover:bg-[hsl(var(--slate-100))] transition-colors"
                >取消选择</button>
              </div>
            ) : containerIds.length > 0 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCollapsed(new Set())}
                  className="px-2 py-1 rounded-[6px] text-[11.5px] text-[hsl(var(--slate-600))] hover:bg-[hsl(var(--slate-100))] transition-colors"
                >展开全部</button>
                <button
                  onClick={() => setCollapsed(new Set(containerIds))}
                  className="px-2 py-1 rounded-[6px] text-[11.5px] text-[hsl(var(--slate-600))] hover:bg-[hsl(var(--slate-100))] transition-colors"
                >折叠全部</button>
              </div>
            )}
          </div>
        )}
        {blocks.length === 0 && (
          <div className="text-center py-12 text-[13px] text-[hsl(var(--muted-foreground))]">从左侧拖拽模块到这里，或点击下方「添加模块」开始搭建流程</div>
        )}
        {renderSeq(blocks, { n: 0 })}
        <div className="mt-2">
          <EmptySlot target={{ mode: 'after', id: null }} text="添加模块" />
        </div>
      </div>
      {picker && (
        <ModulePicker
          x={picker.x}
          y={picker.y}
          onPick={(t) => handlePick(t)}
          onClose={() => setPicker(null)}
        />
      )}
      {ctxMenu && createPortal(
        <>
          <div className="fixed inset-0" style={{ zIndex: 2147483646 }} onClick={() => setCtxMenu(null)} onContextMenu={(e) => { e.preventDefault(); setCtxMenu(null) }} />
          <div
            className="fixed min-w-[168px] rounded-[10px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-pop-2xl py-1 animate-scale-in"
            style={{ zIndex: 2147483647, left: Math.min(ctxMenu.x, window.innerWidth - 184), top: Math.min(ctxMenu.y, window.innerHeight - 140) }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-1 text-[10.5px] text-[hsl(var(--muted-foreground))]">已选 {selectedIds.size} 个模块</div>
            <button
              onClick={() => { toggleNodesDisabled(Array.from(selectedIds)); setCtxMenu(null) }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[12.5px] text-left text-[hsl(var(--slate-700))] hover:bg-[hsl(var(--brand-50))] transition-colors"
            ><Ban className="w-3.5 h-3.5 text-[hsl(var(--slate-500))]" /> 批量启用 / 禁用</button>
            <button
              onClick={() => { handleDeleteMany(Array.from(selectedIds)); setCtxMenu(null) }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[12.5px] text-left text-[hsl(var(--danger-600))] hover:bg-[hsl(var(--danger-50))] transition-colors"
            ><Trash2 className="w-3.5 h-3.5" /> 删除选中</button>
            <div className="my-1 border-t border-[hsl(var(--border))]" />
            <button
              onClick={() => { setSelectedIds(new Set()); setCtxMenu(null) }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[12.5px] text-left text-[hsl(var(--slate-600))] hover:bg-[hsl(var(--slate-100))] transition-colors"
            ><X className="w-3.5 h-3.5 text-[hsl(var(--slate-500))]" /> 取消选择</button>
          </div>
        </>,
        document.body,
      )}
      {errPopover && (() => {
        const nd = nodes.find((n) => n.id === errPopover.nodeId)
        const pol: ErrorPolicy = (nd?.data?.errorPolicy as ErrorPolicy) || { mode: 'stop', maxRetries: 1, interval: 0, onExhausted: 'stop' }
        const cands = reflowCandidates(errPopover.nodeId)
        const left = Math.max(8, Math.min(errPopover.x, window.innerWidth - 320))
        const top = Math.max(8, Math.min(errPopover.y, window.innerHeight - 380))
        return createPortal(
          <>
            <div className="fixed inset-0 z-[9998]" onClick={() => setErrPopover(null)} />
            <div className="fixed z-[9999] w-[300px] rounded-[12px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-pop-2xl p-3 animate-scale-in" style={{ left, top }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12.5px] font-semibold text-[hsl(var(--slate-700))]">出错处理</span>
                <button onClick={() => setErrPopover(null)} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"><X className="w-3.5 h-3.5" /></button>
              </div>
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                {(([['stop', '失败即停'], ['continue', '跳过继续'], ['retry-self', '原地重试'], ['retry-from', '回流上层重试']]) as [ErrorPolicy['mode'], string][]).map(([m, lbl]) => (
                  <button key={m} onClick={() => setPolicy(errPopover.nodeId, { mode: m })}
                    className={'px-2 py-1.5 rounded-[7px] text-[11.5px] font-medium border transition-colors ' + (pol.mode === m ? 'bg-[hsl(var(--brand-500))] text-white border-[hsl(var(--brand-500))]' : 'bg-[hsl(var(--card))] text-[hsl(var(--slate-600))] border-[hsl(var(--border))] hover:bg-[hsl(var(--brand-50))]')}>{lbl}</button>
                ))}
              </div>
              {(pol.mode === 'retry-self' || pol.mode === 'retry-from') && (
                <div className="space-y-2">
                  {pol.mode === 'retry-from' && (
                    <div>
                      <label className="text-[10.5px] text-[hsl(var(--muted-foreground))]">回流目标（出错后回到这里重跑）</label>
                      <SelectNative className="mt-0.5" value={pol.targetId || ''} placeholder="选择上层模块…"
                        onChange={(e) => setPolicy(errPopover.nodeId, { targetId: e.target.value })}>
                        {cands.map((c, i) => <option key={c.id} value={c.id}>{`#${i + 1} ${c.label}`}</option>)}
                      </SelectNative>
                      {cands.length === 0 && <div className="text-[10px] text-[hsl(var(--warning-600))] mt-0.5">该模块之前没有可回流的模块</div>}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[10.5px] text-[hsl(var(--muted-foreground))]">重试次数</label>
                      <input type="number" min={1} value={pol.maxRetries ?? 1}
                        onChange={(e) => setPolicy(errPopover.nodeId, { maxRetries: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="w-full mt-0.5 px-2 py-1 rounded-[6px] text-[12px] bg-[hsl(var(--background))] border border-[hsl(var(--border))]" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10.5px] text-[hsl(var(--muted-foreground))]">间隔(秒)</label>
                      <input type="number" min={0} step={0.5} value={pol.interval ?? 0}
                        onChange={(e) => setPolicy(errPopover.nodeId, { interval: Math.max(0, parseFloat(e.target.value) || 0) })}
                        className="w-full mt-0.5 px-2 py-1 rounded-[6px] text-[12px] bg-[hsl(var(--background))] border border-[hsl(var(--border))]" />
                    </div>
                  </div>
                  {pol.mode === 'retry-from' && (
                    <div>
                      <label className="text-[10.5px] text-[hsl(var(--muted-foreground))]">重试用尽后</label>
                      <div className="flex gap-1.5 mt-0.5">
                        {(([['stop', '停止流程'], ['continue', '继续往下']]) as ['stop' | 'continue', string][]).map(([v, lbl]) => (
                          <button key={v} onClick={() => setPolicy(errPopover.nodeId, { onExhausted: v })}
                            className={'flex-1 px-2 py-1 rounded-[6px] text-[11.5px] border transition-colors ' + ((pol.onExhausted || 'stop') === v ? 'bg-[hsl(var(--brand-500))] text-white border-[hsl(var(--brand-500))]' : 'bg-[hsl(var(--card))] text-[hsl(var(--slate-600))] border-[hsl(var(--border))] hover:bg-[hsl(var(--brand-50))]')}>{lbl}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="mt-2 text-[10px] text-[hsl(var(--slate-400))] leading-relaxed">
                {pol.mode === 'stop' && '默认：该模块出错时立即停止流程。'}
                {pol.mode === 'continue' && '出错时记一条警告并继续执行后续模块。'}
                {pol.mode === 'retry-self' && '出错时原地重跑当前模块，达到次数仍失败则按默认停止。'}
                {pol.mode === 'retry-from' && '出错时回到所选上层模块，从那里重新往下执行（适合刷新页面/重新登录后重试）。'}
              </div>
            </div>
          </>,
          document.body,
        )
      })()}
    </div>
  )
}
