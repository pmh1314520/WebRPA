import { useCallback, useRef, useEffect, useState, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  SelectionMode,
  type ReactFlowInstance,
  type Node,
  type Edge,
  type OnSelectionChangeParams,
  type Connection,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Keyboard, ChevronDown, ChevronUp, FileJson, AlertTriangle, Boxes, Search, X, LayoutList, Workflow } from 'lucide-react'

import { useWorkflowStore, type NodeData } from '@/store/workflowStore'
import { DebugBar } from './DebugBar'
import { useLayoutStore } from '@/store/layoutStore'
import { useGlobalConfigStore } from '@/store/globalConfigStore'
import { isEncryptedEnvelope, decryptWorkflow } from '@/lib/workflowCrypto'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { usePasswordPrompt } from '@/components/ui/password-prompt'
import { ModuleNode } from './ModuleNode'
import { QuickModulePicker } from './QuickModulePicker'
import { getAllAvailableModules } from './ModuleSidebar'
import { useModuleStatsStore } from '@/store/moduleStatsStore'
import { GroupNode } from './GroupNode'
import { SubflowHeaderNode } from './SubflowHeaderNode'
import { NoteNode } from './NoteNode'
import { ModuleSidebar } from './ModuleSidebar'
import { ConfigPanel } from './ConfigPanel'
import { BlockFlowView } from './BlockFlowView'
import { LogPanel } from './LogPanel'
import { Toolbar } from './Toolbar'
import { RemoteCursor } from './RemoteCursor'
import { socketService } from '@/services/socket'
import { remoteService } from '@/services/remote'
import { onAssistantUiEvent } from '@/services/aiAssistantSkills'
import type { ModuleType } from '@/types'

// 模块计数组件
function ModuleCount() {
  const nodes = useWorkflowStore((state) => state.nodes)

  const moduleCount = useMemo(() => {
    return nodes.filter(n => n.type !== 'groupNode' && n.type !== 'noteNode' && n.type !== 'subflowHeaderNode').length
  }, [nodes])

  return (
    <div className="absolute top-4 left-4 z-10 animate-fade-in-down">
      <div className="float-card !py-2 !px-3.5 group cursor-default">
        <span className="icon-chip icon-chip-brand !w-7 !h-7">
          <Boxes className="w-3.5 h-3.5 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" strokeWidth={2.4} />
        </span>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[11.5px] font-medium text-[hsl(var(--muted-foreground))] tracking-wide">模块数量</span>
          <span className="text-gradient text-[16px] font-bold tabular-nums leading-none">{moduleCount}</span>
        </div>
      </div>
    </div>
  )
}

// 模块搜索组件
function ModuleSearch({ 
  reactFlowInstance 
}: { 
  reactFlowInstance: ReactFlowInstance<Node<NodeData>> | null 
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Node<NodeData>[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isExpanded, setIsExpanded] = useState(false)
  const nodes = useWorkflowStore((state) => state.nodes)
  const selectNode = useWorkflowStore((state) => state.selectNode)

  // 搜索模块
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setCurrentIndex(0)
      return
    }

    const query = searchQuery.toLowerCase()
    const results = nodes.filter(node => {
      // 排除分组、便签和子流程头节点
      if (node.type === 'groupNode' || node.type === 'noteNode' || node.type === 'subflowHeaderNode') {
        return false
      }
      
      const data = node.data as NodeData
      const label = String(data.label || '').toLowerCase()
      const remark = String(data.remark || '').toLowerCase()
      const name = String(data.name || '').toLowerCase()
      const nodeName = String(data.nodeName || '').toLowerCase()
      
      return label.includes(query) || remark.includes(query) || name.includes(query) || nodeName.includes(query)
    })

    setSearchResults(results)
    setCurrentIndex(0)
  }, [searchQuery, nodes])

  // 跳转到指定模块
  const jumpToModule = useCallback((index: number) => {
    if (!reactFlowInstance || searchResults.length === 0) return
    
    const node = searchResults[index]
    if (!node) return

    // 选中节点
    selectNode(node.id)

    // 居中显示节点
    reactFlowInstance.setCenter(
      node.position.x + (node.width || 200) / 2,
      node.position.y + (node.height || 100) / 2,
      { zoom: 1, duration: 300 }
    )
  }, [reactFlowInstance, searchResults, selectNode])

  // 上一个结果
  const handlePrevious = useCallback(() => {
    if (searchResults.length === 0) return
    const newIndex = currentIndex === 0 ? searchResults.length - 1 : currentIndex - 1
    setCurrentIndex(newIndex)
    jumpToModule(newIndex)
  }, [currentIndex, searchResults.length, jumpToModule])

  // 下一个结果
  const handleNext = useCallback(() => {
    if (searchResults.length === 0) return
    const newIndex = currentIndex === searchResults.length - 1 ? 0 : currentIndex + 1
    setCurrentIndex(newIndex)
    jumpToModule(newIndex)
  }, [currentIndex, searchResults.length, jumpToModule])

  // 清空搜索
  const handleClear = useCallback(() => {
    setSearchQuery('')
    setSearchResults([])
    setCurrentIndex(0)
  }, [])

  // 快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+F 切换搜索（开 ↔ 关）
      if (e.ctrlKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        if (isExpanded) {
          setIsExpanded(false)
          handleClear()
        } else {
          setIsExpanded(true)
        }
      }
      // ESC 关闭搜索
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false)
        handleClear()
      }
      // Enter 跳转到当前结果
      if (e.key === 'Enter' && searchResults.length > 0 && isExpanded) {
        e.preventDefault()
        jumpToModule(currentIndex)
      }
      // Ctrl+G 或 F3 下一个结果
      if (((e.ctrlKey && e.key.toLowerCase() === 'g') || e.key === 'F3') && searchResults.length > 0 && isExpanded) {
        e.preventDefault()
        handleNext()
      }
      // Ctrl+Shift+G 或 Shift+F3 上一个结果
      if (((e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'g') || (e.shiftKey && e.key === 'F3')) && searchResults.length > 0 && isExpanded) {
        e.preventDefault()
        handlePrevious()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isExpanded, searchResults.length, currentIndex, handleClear, handleNext, handlePrevious, jumpToModule])

  // 监听 AI 小助手指令打开搜索框
  useEffect(() => {
    return onAssistantUiEvent('open_module_search', () => {
      setIsExpanded(true)
    })
  }, [])

  if (!isExpanded) {
    return (
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 animate-fade-in-down">
        <button
          onClick={() => setIsExpanded(true)}
          className="float-card !py-2 !px-3.5 group cursor-pointer transition-all duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hover:shadow-pop-xl hover:-translate-y-0.5 hover:border-[hsl(var(--brand-500)/0.4)]"
          title="搜索模块 (Ctrl+F)"
        >
          <span className="icon-chip icon-chip-brand !w-7 !h-7 transition-transform duration-200 group-hover:scale-105">
            <Search className="w-3.5 h-3.5" strokeWidth={2.4} />
          </span>
          <span className="text-[12px] font-medium text-[hsl(var(--slate-700))] group-hover:text-[hsl(var(--brand-700))] transition-colors">搜索模块</span>
          <kbd className="hidden sm:inline-flex items-center px-1.5 h-4 rounded border border-[hsl(var(--border))] bg-[hsl(var(--slate-50))] text-[10px] font-mono text-[hsl(var(--muted-foreground))]">
            Ctrl+F
          </kbd>
        </button>
      </div>
    )
  }

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 animate-fade-in-down">
      <div className="glass-strong rounded-xl shadow-lg overflow-hidden w-80">
        <div className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索模块名称或备注..."
                className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={handleClear}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gray-700"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => {
                setIsExpanded(false)
                handleClear()
              }}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors has-hover-only"
              title="关闭 (ESC)"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
          
          {searchResults.length > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {currentIndex + 1} / {searchResults.length} 个结果
              </span>
              <div className="flex gap-1">
                <button
                  onClick={handlePrevious}
                  className="px-2 py-1 hover:bg-gray-100 rounded transition-colors has-hover-only"
                  title="上一个 (Shift+F3)"
                >
                  ↑
                </button>
                <button
                  onClick={handleNext}
                  className="px-2 py-1 hover:bg-gray-100 rounded transition-colors has-hover-only"
                  title="下一个 (F3)"
                >
                  ↓
                </button>
              </div>
            </div>
          )}
          
          {searchQuery && searchResults.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              未找到匹配的模块
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// 操作提示组件
function ControlsHelp() {
  const [expanded, setExpanded] = useState(false)
  
  const shortcuts = [
    { keys: '左键拖拽', desc: '框选多个模块' },
    { keys: 'Shift+框选', desc: '跨区域累加选择' },
    { keys: 'Ctrl+点击', desc: '切换选中状态' },
    { keys: 'Shift+点击', desc: '范围选择' },
    { keys: '中键拖拽', desc: '平移画布' },
    { keys: '空格+左键拖拽', desc: '平移画布' },
    { keys: '滚轮', desc: '缩放画布' },
    { keys: '双击画布', desc: '快速添加收藏模块' },
    { keys: '右键画布', desc: '快速添加所有模块' },
    { keys: 'Delete', desc: '删除选中' },
    { keys: 'Ctrl+S', desc: '保存工作流' },
    { keys: 'Alt+N', desc: '新建工作流' },
    { keys: 'Ctrl+C', desc: '复制' },
    { keys: 'Ctrl+V', desc: '粘贴' },
    { keys: 'Ctrl+A', desc: '全选' },
    { keys: 'Ctrl+D', desc: '禁用/启用' },
    { keys: 'Ctrl+Z', desc: '撤销' },
    { keys: 'Ctrl+Y', desc: '重做' },
  ]
  
  return (
    <div className="absolute top-4 right-4 z-10 animate-fade-in-down">
      <div className="glass-strong rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-blue-600 w-full transition-colors"
        >
          <Keyboard className="w-4 h-4" />
          <span className="font-medium">操作提示</span>
          {expanded ? <ChevronDown className="w-4 h-4 ml-auto" /> : <ChevronUp className="w-4 h-4 ml-auto" />}
        </button>
        {expanded && (
          <div className="px-3 pb-3 space-y-1.5 border-t border-blue-200/50 pt-2 animate-fade-in">
            {shortcuts.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <kbd className="px-1.5 py-0.5 bg-blue-100 rounded-md text-[10px] font-mono min-w-[80px] text-center text-blue-700 border border-blue-200/50">
                  {s.keys}
                </kbd>
                <span className="text-muted-foreground">{s.desc}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// 自定义节点类型
const nodeTypes = {
  moduleNode: ModuleNode,
  groupNode: GroupNode,
  subflowHeaderNode: SubflowHeaderNode,
  noteNode: NoteNode,
}

export function WorkflowEditor() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const reactFlowInstance = useRef<ReactFlowInstance<Node<NodeData>> | null>(null)
  const { alert: alertDialog, confirm: confirmDialog, ConfirmDialog } = useConfirm()
  const { promptPassword, passwordDialog } = usePasswordPrompt()
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([])
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [showBrowserBusyDialog, setShowBrowserBusyDialog] = useState(false)
  const [showBrowserClosedDialog, setShowBrowserClosedDialog] = useState(false)
  
  // 快速模块选择器状态
  const [showQuickPicker, setShowQuickPicker] = useState(false)
  const [quickPickerPosition, setQuickPickerPosition] = useState({ x: 0, y: 0 })
  const [quickPickerFavoritesOnly, setQuickPickerFavoritesOnly] = useState(false) // 是否仅显示收藏
  
  // 远程协助状态
  const [remoteConnected, setRemoteConnected] = useState(false)
  const lastMouseSendRef = useRef<number>(0)
  const mouseSendThrottleMs = 50 // 鼠标移动发送节流时间
  
  // 鼠标在画布中的位置（用于粘贴）
  const mousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  
  // 用于防抖处理框选时的节点选择更新
  const selectionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingSelectionRef = useRef<string | null>(null)
  // 框选 rAF 节流，避免每次微小变化都重算分组包含关系
  const selectionRafRef = useRef<number | null>(null)
  // 分组包含关系缓存：节点列表引用变化时才重算
  const groupContainmentCacheRef = useRef<{
    nodesRef: unknown
    map: Map<string, Set<string>>
  } | null>(null)
  
  // 用于 Shift 范围选择
  const lastClickedNodeIdRef = useRef<string | null>(null)
  
  // 用于 Shift 框选（保持已选中的节点）
  const isShiftKeyPressedRef = useRef(false)
  const isCtrlKeyPressedRef = useRef(false)
  const preSelectionNodesRef = useRef<string[]>([]) // 框选开始前已选中的节点
  const isApplyingShiftSelectionRef = useRef(false) // 标志：正在应用 Shift 选择
  
  // 性能：单值用 selector 订阅，actions 直接静态引用（避免整个 store 任意变化都触发重渲染）
  const nodes = useWorkflowStore((s) => s.nodes)
  const edges = useWorkflowStore((s) => s.edges)
  const variables = useWorkflowStore((s) => s.variables)
  const workflowName = useWorkflowStore((s) => s.name)
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId)
  const executionStatus = useWorkflowStore((s) => s.executionStatus)

  // actions 是稳定引用，从 getState 拿
  const onNodesChange = useWorkflowStore((s) => s.onNodesChange)
  const onEdgesChange = useWorkflowStore((s) => s.onEdgesChange)
  const onConnect = useWorkflowStore((s) => s.onConnect)
  const addNode = useWorkflowStore((s) => s.addNode)
  const selectNode = useWorkflowStore((s) => s.selectNode)
  const deleteNode = useWorkflowStore((s) => s.deleteNode)
  const copyNodes = useWorkflowStore((s) => s.copyNodes)
  const pasteNodes = useWorkflowStore((s) => s.pasteNodes)
  const pasteNodesFromClipboard = useWorkflowStore((s) => s.pasteNodesFromClipboard)
  const addLog = useWorkflowStore((s) => s.addLog)
  const mergeWorkflow = useWorkflowStore((s) => s.mergeWorkflow)
  const toggleNodesDisabled = useWorkflowStore((s) => s.toggleNodesDisabled)
  const undo = useWorkflowStore((s) => s.undo)
  const redo = useWorkflowStore((s) => s.redo)
  const loadWorkflow = useWorkflowStore((s) => s.loadWorkflow)

  // 获取选中的节点
  const selectedNodes = nodes.filter(n => n.selected)

  // 使用 ref 存储最新状态，避免 useEffect 依赖问题
  const stateRef = useRef({ nodes, edges, variables, workflowName })
  useEffect(() => {
    stateRef.current = { nodes, edges, variables, workflowName }
  }, [nodes, edges, variables, workflowName])

  // 上一次同步的状态快照（用于检测变化）
  const lastSyncRef = useRef<string>('')
  
  // 监听 store 变化，发送完整同步（节流）
  // 上次同步的节点位置（用于检测位置变化）
  const lastNodePositionsRef = useRef<Record<string, { x: number; y: number }>>({})
  const pendingSyncRef = useRef(false)
  
  const syncThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef = useRef<number | null>(null)
  
  useEffect(() => {
    if (!remoteConnected || remoteService.isApplyingRemoteOperation()) {
      return
    }
    
    // 检查是否只是位置变化
    const currentPositions: Record<string, { x: number; y: number }> = {}
    let hasPositionChange = false
    
    for (const node of nodes) {
      currentPositions[node.id] = { x: node.position.x, y: node.position.y }
      const lastPos = lastNodePositionsRef.current[node.id]
      if (!lastPos || lastPos.x !== node.position.x || lastPos.y !== node.position.y) {
        hasPositionChange = true
      }
    }
    
    // 检查节点数量是否变化
    const lastIds = Object.keys(lastNodePositionsRef.current)
    const currentIds = Object.keys(currentPositions)
    const structureChanged = lastIds.length !== currentIds.length || !lastIds.every(id => currentIds.includes(id))
    
    // 生成当前状态的快照（不包含位置）
    const nodesWithoutPosition = nodes.map(n => ({ ...n, position: { x: 0, y: 0 } }))
    const currentSnapshot = JSON.stringify({ nodes: nodesWithoutPosition, edges, variables })
    const contentChanged = currentSnapshot !== lastSyncRef.current
    
    // 如果结构或内容变化，完整同步
    if (structureChanged || contentChanged) {
      if (syncThrottleRef.current) {
        clearTimeout(syncThrottleRef.current)
      }
      
      syncThrottleRef.current = setTimeout(() => {
        if (remoteService.isConnected() && !remoteService.isApplyingRemoteOperation()) {
          lastSyncRef.current = currentSnapshot
          lastNodePositionsRef.current = currentPositions
          remoteService.send({
            type: 'full_sync',
            nodes,
            edges,
            variables,
            workflowName,
          })
        }
      }, 50)
    } else if (hasPositionChange) {
      // 只有位置变化，使用 RAF 实现更流畅的同步
      lastNodePositionsRef.current = currentPositions
      
      if (!pendingSyncRef.current) {
        pendingSyncRef.current = true
        
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current)
        }
        
        rafRef.current = requestAnimationFrame(() => {
          pendingSyncRef.current = false
          if (remoteService.isConnected() && !remoteService.isApplyingRemoteOperation()) {
            remoteService.send({
              type: 'nodes_position',
              positions: lastNodePositionsRef.current,
            })
          }
        })
      }
    }
    
    return () => {
      if (syncThrottleRef.current) {
        clearTimeout(syncThrottleRef.current)
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [nodes, edges, workflowName, remoteConnected])

  // 注册浏览器被占用错误回调
  useEffect(() => {
    socketService.setBrowserBusyCallback(() => {
      setShowBrowserBusyDialog(true)
    })
    return () => {
      socketService.setBrowserBusyCallback(null)
    }
  }, [])

  // 注册浏览器意外关闭回调
  useEffect(() => {
    socketService.setBrowserClosedCallback(() => {
      setShowBrowserClosedDialog(true)
    })
    return () => {
      socketService.setBrowserClosedCallback(null)
    }
  }, [])

  // 远程协助 - 监听连接状态和消息
  useEffect(() => {
    const unsubStatus = remoteService.onStatus((status) => {
      const connected = status === 'connected'
      setRemoteConnected(connected)
      
      if (connected) {
        const connType = remoteService.getConnectionType()
        const connTypeText = connType === 'p2p' ? '（P2P 直连）' : ''
        addLog({ level: 'info', message: `远程协助已连接${connTypeText}` })
        // 重置同步快照
        lastSyncRef.current = ''
      } else if (status === 'disconnected') {
        addLog({ level: 'info', message: '远程协助已断开' })
      }
    })

    // 监听同步数据
    const unsubSync = remoteService.onSyncData((data) => {
      // 应用同步数据到画布
      remoteService.setApplyingRemote(true)
      // 更新快照防止循环
      lastSyncRef.current = JSON.stringify({ nodes: data.nodes, edges: data.edges })
      try {
        loadWorkflow({
          nodes: data.nodes as Node<NodeData>[],
          edges: data.edges,
          name: data.workflowName || '远程协助工作流',
        })
        // 不再打印同步日志，太频繁了
      } finally {
        setTimeout(() => remoteService.setApplyingRemote(false), 200)
      }
    })

    // 监听远程操作消息
    const unsubMessage = remoteService.onMessage((message) => {
      const session = remoteService.getSession()
      if (!session || session.status !== 'connected') return

      switch (message.type) {
        case 'sync_request': {
          // 对方请求同步，发送当前完整状态
          const state = stateRef.current
          remoteService.send({
            type: 'full_sync',
            nodes: state.nodes,
            edges: state.edges,
            variables: state.variables,
            workflowName: state.workflowName,
          })
          break
        }
        
        case 'full_sync': {
          // 收到完整同步数据
          if (message.nodes && message.edges) {
            remoteService.setApplyingRemote(true)
            // 更新快照防止循环
            const nodesWithoutPosition = (message.nodes as Node<NodeData>[]).map(n => ({ ...n, position: { x: 0, y: 0 } }))
            lastSyncRef.current = JSON.stringify({ 
              nodes: nodesWithoutPosition, 
              edges: message.edges, 
              variables: message.variables || [] 
            })
            // 更新位置快照
            const positions: Record<string, { x: number; y: number }> = {}
            for (const node of message.nodes as Node<NodeData>[]) {
              positions[node.id] = { x: node.position.x, y: node.position.y }
            }
            lastNodePositionsRef.current = positions
            try {
              loadWorkflow({
                nodes: message.nodes as Node<NodeData>[],
                edges: message.edges as Edge[],
                name: (message.workflowName as string) || stateRef.current.workflowName,
              })
            } finally {
              setTimeout(() => remoteService.setApplyingRemote(false), 200)
            }
          }
          break
        }
        
        case 'nodes_position': {
          // 只更新节点位置（更高效）
          const positions = message.positions as Record<string, { x: number; y: number }>
          if (positions) {
            remoteService.setApplyingRemote(true)
            lastNodePositionsRef.current = positions
            // 直接更新节点位置，不重新加载整个画布
            onNodesChange(
              Object.entries(positions).map(([id, pos]) => ({
                type: 'position' as const,
                id,
                position: pos,
              }))
            )
            // 使用 RAF 延迟重置标记，确保不会触发循环
            requestAnimationFrame(() => {
              remoteService.setApplyingRemote(false)
            })
          }
          break
        }
        
        case 'mouse_move':
        case 'mouse_click':
          // 鼠标消息直接转发给处理器（RemoteCursor 组件会处理）
          break
      }
    })

    return () => {
      unsubStatus()
      unsubSync()
      unsubMessage()
    }
  }, [addLog, loadWorkflow, onNodesChange])

  // 处理滚轮事件：鼠标滚轮缩放，触摸板双指滑动平移
  useEffect(() => {
    const wrapper = reactFlowWrapper.current
    if (!wrapper) return

    const handleWheel = (event: WheelEvent) => {
      if (!reactFlowInstance.current) return
      // 模块条模式：画布是普通可滚动浮层，放行滚轮让其原生滚动，绝不拦截
      if (useLayoutStore.getState().editorViewMode === 'block') return
      
      // 触摸板双指滑动通常会带有 ctrlKey（捏合缩放）或者 deltaX 不为0（平移）
      // 鼠标滚轮通常只有 deltaY，且 deltaX 为 0
      const isTouchpad = event.ctrlKey || Math.abs(event.deltaX) > 0
      
      if (isTouchpad) {
        // 触摸板操作
        if (event.ctrlKey) {
          // Ctrl + 双指 = 缩放（触摸板捏合手势）
          event.preventDefault()
          const delta = event.deltaY > 0 ? 0.95 : 1.05
          const currentZoom = reactFlowInstance.current.getZoom()
          const newZoom = Math.min(Math.max(currentZoom * delta, 0.1), 2)
          reactFlowInstance.current.zoomTo(newZoom, { duration: 0 })
        } else {
          // 双指滑动 = 平移
          event.preventDefault()
          const { x, y } = reactFlowInstance.current.getViewport()
          const currentZoom = reactFlowInstance.current.getZoom()
          reactFlowInstance.current.setViewport({
            x: x - event.deltaX / currentZoom,
            y: y - event.deltaY / currentZoom,
            zoom: currentZoom,
          }, { duration: 0 })
        }
      } else {
        // 鼠标滚轮 = 缩放
        event.preventDefault()
        const delta = event.deltaY > 0 ? 0.9 : 1.1
        const currentZoom = reactFlowInstance.current.getZoom()
        const newZoom = Math.min(Math.max(currentZoom * delta, 0.1), 2)
        reactFlowInstance.current.zoomTo(newZoom, { duration: 0 })
      }
    }

    wrapper.addEventListener('wheel', handleWheel, { passive: false })
    return () => wrapper.removeEventListener('wheel', handleWheel)
  }, [])

  // 拦截画布区域的默认右键菜单（但不影响ReactFlow的onPaneContextMenu和底栏）
  useEffect(() => {
    const wrapper = reactFlowWrapper.current
    if (!wrapper) return
    
    const handleContextMenu = (event: MouseEvent) => {
      // 检查事件目标是否在画布区域内
      const target = event.target as HTMLElement
      
      // 只拦截画布背景的右键菜单，不拦截ReactFlow的pane事件
      // ReactFlow的pane会触发onPaneContextMenu，我们不需要在这里拦截
      if (target.classList.contains('react-flow__pane') || 
          target.classList.contains('react-flow__renderer') ||
          target.classList.contains('react-flow__selectionpane')) {
        // 不做任何处理，让ReactFlow的onPaneContextMenu处理
        return
      }
      
      // 对于其他画布内的元素（如节点、边等），阻止默认菜单
      event.preventDefault()
    }
    
    // 只在画布元素上添加监听器，不使用document全局监听
    wrapper.addEventListener('contextmenu', handleContextMenu)
    return () => wrapper.removeEventListener('contextmenu', handleContextMenu)
  }, [])

  // 空格键+左键拖拽画布
  useEffect(() => {
    const wrapper = reactFlowWrapper.current
    if (!wrapper) return

    let isPanning = false
    let isSpacePressed = false
    let startX = 0
    let startY = 0
    let startViewportX = 0
    let startViewportY = 0

    const handleKeyDown = (event: KeyboardEvent) => {
      // 按下空格键
      if (event.code === 'Space' && !isSpacePressed) {
        // 如果焦点在输入框中，不处理
        const target = event.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return
        }
        
        isSpacePressed = true
        // 改变鼠标样式为抓手
        if (wrapper) {
          wrapper.style.cursor = 'grab'
        }
        event.preventDefault()
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      // 释放空格键
      if (event.code === 'Space') {
        isSpacePressed = false
        isPanning = false
        if (wrapper) {
          wrapper.style.cursor = ''
        }
      }
    }

    const handleMouseDown = (event: MouseEvent) => {
      // 空格键+左键开始拖拽
      if (event.button === 0 && isSpacePressed && reactFlowInstance.current) {
        event.preventDefault()
        event.stopPropagation()
        
        isPanning = true
        startX = event.clientX
        startY = event.clientY
        const viewport = reactFlowInstance.current.getViewport()
        startViewportX = viewport.x
        startViewportY = viewport.y
        // 改变鼠标样式为抓取中
        wrapper.style.cursor = 'grabbing'
      }
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (isPanning && reactFlowInstance.current) {
        event.preventDefault()
        event.stopPropagation()
        
        const deltaX = event.clientX - startX
        const deltaY = event.clientY - startY
        const currentZoom = reactFlowInstance.current.getZoom()
        
        reactFlowInstance.current.setViewport({
          x: startViewportX + deltaX,
          y: startViewportY + deltaY,
          zoom: currentZoom,
        }, { duration: 0 })
      }
    }

    const handleMouseUp = (event: MouseEvent) => {
      if (isPanning) {
        event.preventDefault()
        event.stopPropagation()
        
        isPanning = false
        // 如果空格键还按着，恢复为抓手样式
        wrapper.style.cursor = isSpacePressed ? 'grab' : ''
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)
    wrapper.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
      wrapper.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  // 监听框选开始，记录已选中的节点（用于 Shift+框选）
  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (event.button === 0 && reactFlowWrapper.current) {
        const target = event.target as HTMLElement
        // 检查是否点击在画布背景上（开始框选）
        if (target.classList.contains('react-flow__pane') || 
            target.classList.contains('react-flow__renderer') ||
            target.classList.contains('react-flow__selectionpane')) {
          // 如果按住 Shift 键，记录当前已选中的节点
          if (isShiftKeyPressedRef.current) {
            preSelectionNodesRef.current = nodes.filter(n => n.selected).map(n => n.id)
          } else {
            preSelectionNodesRef.current = []
          }
        }
      }
    }
    
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [nodes])



  // 监听键盘事件
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 跟踪 Ctrl 和 Shift 键状态
      if (event.ctrlKey || event.metaKey) {
        isCtrlKeyPressedRef.current = true
      }
      if (event.shiftKey) {
        isShiftKeyPressedRef.current = true
      }
      
      // 如果焦点在输入框中，不处理快捷键
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }
      
      // 检查是否在 Monaco Editor 或其他代码编辑器中
      if (target.closest('.monaco-editor') || target.closest('[role="textbox"]')) {
        return
      }

      // 快捷键作用域限制：以下都是"画布模块操作"快捷键（复制/粘贴/删除/禁用/全选等），
      // 必须只在用户确实在操作画布时才生效，否则会误触发。
      // 1) 模块条模式下，画布快捷键交给 BlockFlowView 自己处理，避免重复触发
      //    （典型 bug：Ctrl+D 被两个处理器各切换一次，结果"切了又切回去"，看起来无法禁用）
      if (useLayoutStore.getState().editorViewMode === 'block') {
        return
      }
      // 2) 焦点落在弹窗/侧边面板/下拉菜单等非画布 UI 上时，不响应模块快捷键
      if (target.closest('[role="dialog"], .modern-dialog, .modal-mask, [data-dialog-portal], [data-radix-popper-content-wrapper], .ai-assistant-panel')) {
        return
      }
      // 3) 仅当焦点在画布容器内、或没有任何具体 UI 获得焦点（focus 在 body）时才处理
      {
        const wrapperEl = reactFlowWrapper.current
        const onCanvas = target === document.body || (!!wrapperEl && wrapperEl.contains(target))
        if (!onCanvas) {
          return
        }
      }
      
      // Delete/Backspace 删除选中节点或边
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        
        // 优先删除多选的节点
        if (selectedNodes.length > 0) {
          const nodeIds = selectedNodes.map(n => n.id)
          nodeIds.forEach(id => deleteNode(id))
          selectNode(null)
          addLog({ level: 'info', message: `已删除 ${nodeIds.length} 个模块` })
        } else if (selectedEdgeIds.length > 0) {
          // 删除选中的边（支持多选）
          onEdgesChange(selectedEdgeIds.map(id => ({ type: 'remove', id })))
          setSelectedEdgeIds([])
          addLog({ level: 'info', message: `已删除 ${selectedEdgeIds.length} 条连线` })
        } else if (selectedNodeId) {
          // 删除单个选中的节点
          deleteNode(selectedNodeId)
          selectNode(null)
        }
      }
      
      // Ctrl+C 复制节点（支持多选）- 写入系统剪贴板实现跨工作流复制
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
        event.preventDefault()
        const nodesToCopy = selectedNodes.length > 0 
          ? selectedNodes 
          : (selectedNodeId ? nodes.filter(n => n.id === selectedNodeId) : [])
        
        if (nodesToCopy.length > 0) {
          // 复制节点之间的连线
          const nodeIdSet = new Set(nodesToCopy.map(n => n.id))
          const edgesToCopy = edges.filter(
            (e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target)
          )
          
          // 写入系统剪贴板
          const clipboardData = {
            type: 'webrpa-nodes',
            nodes: nodesToCopy,
            edges: edgesToCopy,
          }
          navigator.clipboard.writeText(JSON.stringify(clipboardData)).then(() => {
            // 同时保存到内部剪贴板（作为备份）
            copyNodes(nodesToCopy.map(n => n.id))
            addLog({ level: 'info', message: `已复制 ${nodesToCopy.length} 个模块到剪贴板` })
          }).catch(() => {
            // 如果系统剪贴板失败，使用内部剪贴板
            copyNodes(nodesToCopy.map(n => n.id))
            addLog({ level: 'info', message: `已复制 ${nodesToCopy.length} 个模块` })
          })
        }
      }
      
      // Ctrl+V 粘贴节点 - 从系统剪贴板读取，粘贴到鼠标位置
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') {
        event.preventDefault()
        
        // 获取鼠标在画布中的位置
        const position = mousePositionRef.current
        
        // 尝试从系统剪贴板读取
        navigator.clipboard.readText().then((text) => {
          try {
            const data = JSON.parse(text)
            if (data.type === 'webrpa-nodes' && Array.isArray(data.nodes)) {
              // 从系统剪贴板粘贴（支持跨工作流）
              pasteNodesFromClipboard(data.nodes, data.edges || [], position)
              addLog({ level: 'success', message: `已粘贴 ${data.nodes.length} 个模块` })
            } else {
              // 不是有效的节点数据，使用内部剪贴板
              pasteNodes(position)
            }
          } catch {
            // JSON解析失败，使用内部剪贴板
            pasteNodes(position)
          }
        }).catch(() => {
          // 系统剪贴板读取失败，使用内部剪贴板
          pasteNodes(position)
        })
      }
      
      // Ctrl+D 禁用/启用节点
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        if (selectedNodes.length > 0) {
          const nodeIds = selectedNodes.map(n => n.id)
          toggleNodesDisabled(nodeIds)
          const firstNode = selectedNodes[0]
          const willBeDisabled = !firstNode.data.disabled
          addLog({ level: 'info', message: `已${willBeDisabled ? '禁用' : '启用'} ${nodeIds.length} 个模块` })
        } else if (selectedNodeId) {
          const node = nodes.find(n => n.id === selectedNodeId)
          if (node) {
            toggleNodesDisabled([selectedNodeId])
            const willBeDisabled = !node.data.disabled
            addLog({ level: 'info', message: `已${willBeDisabled ? '禁用' : '启用'}模块` })
          }
        }
      }
      
      // Ctrl+A 全选
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
        event.preventDefault()
        onNodesChange(nodes.map(n => ({ type: 'select' as const, id: n.id, selected: true })))
      }
      
      // Ctrl+Z 撤销
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) {
        event.preventDefault()
        undo()
      }
      
      // Ctrl+Y 或 Ctrl+Shift+Z 重做
      if ((event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey))) {
        event.preventDefault()
        redo()
      }
    }
    
    const handleKeyUp = (event: KeyboardEvent) => {
      // 重置 Ctrl 和 Shift 键状态
      if (!event.ctrlKey && !event.metaKey) {
        isCtrlKeyPressedRef.current = false
      }
      if (!event.shiftKey) {
        isShiftKeyPressedRef.current = false
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [selectedNodeId, selectedEdgeIds, selectedNodes, nodes, edges, deleteNode, selectNode, copyNodes, pasteNodes, pasteNodesFromClipboard, addLog, onEdgesChange, onNodesChange, toggleNodesDisabled, undo, redo])

  // 清理防抖定时器
  useEffect(() => {
    return () => {
      if (selectionDebounceRef.current) {
        clearTimeout(selectionDebounceRef.current)
      }
      if (selectionRafRef.current !== null) {
        cancelAnimationFrame(selectionRafRef.current)
      }
    }
  }, [])

  const onInit = useCallback((instance: ReactFlowInstance<Node<NodeData>>) => {
    reactFlowInstance.current = instance
  }, [])

  // 选择器自愈：运行后若有选择器被自愈，询问是否写回工作流（持久化）
  useEffect(() => {
    const onHealed = async (e: Event) => {
      const detail = (e as CustomEvent).detail as { heals?: { nodeId?: string; configKey?: string; oldSelector?: string; newSelector?: string }[] }
      const heals = (detail?.heals || []).filter((h) => h.nodeId && h.newSelector)
      if (heals.length === 0) return
      const ok = await confirmDialog(
        `本次运行有 ${heals.length} 处选择器失效后被自动修复。是否把修复后的选择器写回工作流（持久化，下次直接生效）？`,
        { type: 'warning', title: '选择器自愈', confirmText: '写回工作流', cancelText: '暂不' }
      )
      if (!ok) return
      const store = useWorkflowStore.getState()
      let applied = 0
      for (const h of heals) {
        const node = store.nodes.find((n) => n.id === h.nodeId)
        if (node) {
          store.updateNodeData(h.nodeId as string, { [h.configKey || 'selector']: h.newSelector } as any)
          applied++
        }
      }
      store.addLog({ level: 'success', message: `已写回 ${applied} 处自愈选择器，记得保存工作流` })
    }
    window.addEventListener('selector:healed', onHealed as EventListener)
    return () => window.removeEventListener('selector:healed', onHealed as EventListener)
  }, [confirmDialog])

  // 监听 AI 小助手发起的画布操作（聚焦/适配/单节点运行）
  useEffect(() => {
    const offs: Array<() => void> = []
    offs.push(onAssistantUiEvent('fit_view', () => {
      try {
        reactFlowInstance.current?.fitView({ padding: 0.2, duration: 320 })
      } catch {}
    }))
    offs.push(onAssistantUiEvent('focus_node', (p: any) => {
      const nodeId = p?.node_id as string
      if (!nodeId) return
      const node = nodes.find(n => n.id === nodeId)
      if (!node || !reactFlowInstance.current) return
      try {
        reactFlowInstance.current.setCenter(
          node.position.x + ((node.width as number) || 200) / 2,
          node.position.y + ((node.height as number) || 100) / 2,
          { zoom: 1, duration: 320 }
        )
      } catch {}
    }))
    offs.push(onAssistantUiEvent('run_single_node', (p: any) => {
      const nodeId = p?.node_id as string
      if (!nodeId) return
      // 仅作日志提示（真正的单节点执行需要后端支持，这里先抛事件供 Toolbar 处理）
      // Toolbar 上有"运行选中"快捷入口，可后续扩展
      try {
        const { addLog } = useWorkflowStore.getState()
        addLog({ level: 'info', message: `[AI] 请求单独运行节点 ${nodeId}（请使用 Toolbar 的"运行"按钮触发）` })
      } catch {}
    }))
    return () => { offs.forEach(o => o()) }
  }, [nodes])

  // 处理日志点击 - 定位到对应节点
  const handleLogClick = useCallback((nodeId: string) => {
    if (!reactFlowInstance.current) return
    
    // 查找节点位置
    const node = nodes.find(n => n.id === nodeId)
    if (node) {
      // 先选中节点（提供视觉反馈）
      onNodesChange(
        nodes.map((n) => ({
          type: 'select' as const,
          id: n.id,
          selected: n.id === nodeId,
        }))
      )
      
      // 定位到节点并居中显示（带动画效果）
      reactFlowInstance.current.setCenter(
        node.position.x + (node.width || 200) / 2,  // 节点中心X坐标
        node.position.y + (node.height || 100) / 2,  // 节点中心Y坐标
        { zoom: 1, duration: 500 }  // 缩放级别和动画时长
      )
    }
  }, [nodes, onNodesChange])
  
  // 监听执行状态变化
  useEffect(() => {
    // 执行状态变化时的处理（如果需要）
  }, [executionStatus])
  
  // MiniMap 点击处理 - 点击跳转到指定位置
  const handleMiniMapClick = useCallback((_event: React.MouseEvent, position: { x: number; y: number }) => {
    if (!reactFlowInstance.current) return
    
    // 获取当前缩放级别
    const { zoom } = reactFlowInstance.current.getViewport()
    
    // 设置新的视口位置，使点击的位置居中显示（带动画效果）
    reactFlowInstance.current.setCenter(position.x, position.y, { zoom, duration: 300 })
  }, [])

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    // 检查是否是文件拖拽
    if (event.dataTransfer.types.includes('Files')) {
      event.dataTransfer.dropEffect = 'copy'
      setIsDraggingFile(true)
    } else {
      event.dataTransfer.dropEffect = 'move'
      setIsDraggingFile(false)
    }
  }, [])

  // 拖拽离开画布时取消"释放以导入"提示。
  // 用坐标判断是否真的离开了画布容器，避免经过子元素时 dragleave 误触发导致提示闪烁/残留。
  const onDragLeave = useCallback((event: React.DragEvent) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    if (
      event.clientX <= rect.left || event.clientX >= rect.right ||
      event.clientY <= rect.top || event.clientY >= rect.bottom
    ) {
      setIsDraggingFile(false)
    }
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      setIsDraggingFile(false)

      // 优先处理文件拖拽
      if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
        const files = Array.from(event.dataTransfer.files)
        const jsonFiles = files.filter(f => f.name.endsWith('.json'))
        
        if (jsonFiles.length > 0 && reactFlowInstance.current && reactFlowWrapper.current) {
          // screenToFlowPosition 需要屏幕坐标
          const position = reactFlowInstance.current.screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
          })
          
          // 读取并导入所有JSON文件
          jsonFiles.forEach((file, index) => {
            const reader = new FileReader()
            reader.onload = async (e) => {
              const content = e.target?.result as string
              if (!content) return
              let payload = content
              // 加密分享包：检测信封并提示输入密码解密
              try {
                const parsed = JSON.parse(content)
                if (isEncryptedEnvelope(parsed)) {
                  const pwd = await promptPassword({
                    title: '导入加密分享包',
                    message: `「${parsed.name || file.name}」是加密分享包，请输入密码`,
                    confirmText: '解密导入',
                  })
                  if (!pwd) { addLog({ level: 'warning', message: `已取消导入加密包: ${file.name}` }); return }
                  try {
                    payload = await decryptWorkflow(parsed, pwd)
                  } catch {
                    addLog({ level: 'error', message: `解密失败：密码错误或文件已损坏（${file.name}）` })
                    alertDialog(`无法解密「${file.name}」。\n密码错误或文件已损坏，请确认密码后重试。`, {
                      title: '解密失败',
                      confirmText: '我知道了',
                    })
                    return
                  }
                }
              } catch { /* 非 JSON 信封，按原内容处理 */ }
              // 每个文件在Y方向上偏移一些，避免重叠
              const success = mergeWorkflow(payload, {
                x: position.x,
                y: position.y + index * 150
              })
              if (success) {
                addLog({ level: 'success', message: `已导入工作流: ${file.name}` })
              } else {
                addLog({ level: 'error', message: `导入失败: ${file.name}，文件格式无效` })
              }
            }
            reader.onerror = () => {
              addLog({ level: 'error', message: `读取文件失败: ${file.name}` })
            }
            reader.readAsText(file)
          })
        }
        return
      }

      // 模块拖拽逻辑
      const dataStr = event.dataTransfer.getData('application/reactflow')

      if (!dataStr || !reactFlowInstance.current || !reactFlowWrapper.current) {
        return
      }

      // screenToFlowPosition 需要屏幕坐标，直接使用 clientX/clientY
      const position = reactFlowInstance.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      // 自定义模块拖拽时传的是 JSON 字符串；普通模块传的是模块类型字符串（如 "wait"）。
      // 只有看起来像 JSON（以 { 开头）才尝试解析，避免对普通模块名做 JSON.parse 抛错刷控制台。
      const trimmed = dataStr.trim()
      if (trimmed.startsWith('{')) {
        try {
          const data = JSON.parse(trimmed)
          if (data.type === 'custom_module' && data.moduleId) {
            addNode('custom_module' as ModuleType, position, {
              customModuleId: data.moduleId,
              customModuleName: data.moduleName,
              label: data.displayName || data.moduleName,
              icon: data.icon || '',
              color: data.color || '#8B5CF6',
              description: data.description || '',
            })
            return
          }
        } catch {
          // 不是合法 JSON，退化为普通模块处理
        }
      }

      // 普通模块
      addNode(dataStr as ModuleType, position)
    },
    [addNode, mergeWorkflow, addLog]
  )

  // 注：原来还定义了 handleFileDragOver/Leave/Drop 一组函数，但实际未绑定到任何 React Flow 元素，
  // 文件拖拽功能已经通过上面的 onDragOver/onDrop 实现，故移除以避免死代码。

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: { id: string }) => {
      const isCtrlPressed = event.ctrlKey || event.metaKey
      const isShiftPressed = event.shiftKey
      
      if (isCtrlPressed) {
        // Ctrl + 点击：切换选中状态
        const currentNode = nodes.find(n => n.id === node.id)
        if (currentNode) {
          const isCurrentlySelected = currentNode.selected
          onNodesChange([{
            type: 'select',
            id: node.id,
            selected: !isCurrentlySelected
          }])
          
          // 如果选中了，记录为最后点击的节点
          if (!isCurrentlySelected) {
            lastClickedNodeIdRef.current = node.id
          }
        }
        setSelectedEdgeIds([])
      } else if (isShiftPressed && lastClickedNodeIdRef.current) {
        // Shift + 点击：范围选择
        const lastNodeIndex = nodes.findIndex(n => n.id === lastClickedNodeIdRef.current)
        const currentNodeIndex = nodes.findIndex(n => n.id === node.id)
        
        if (lastNodeIndex !== -1 && currentNodeIndex !== -1) {
          const start = Math.min(lastNodeIndex, currentNodeIndex)
          const end = Math.max(lastNodeIndex, currentNodeIndex)
          
          // 选中范围内的所有节点
          const changes = nodes.slice(start, end + 1).map(n => ({
            type: 'select' as const,
            id: n.id,
            selected: true
          }))
          
          onNodesChange(changes)
          addLog({ level: 'info', message: `已选中 ${end - start + 1} 个模块` })
        }
        setSelectedEdgeIds([])
      } else {
        // 普通点击：单选
        selectNode(node.id)
        lastClickedNodeIdRef.current = node.id
        setSelectedEdgeIds([])
      }
    },
    [nodes, selectNode, onNodesChange, addLog]
  )

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      setSelectedEdgeIds([edge.id])
      selectNode(null)
    },
    [selectNode]
  )

  // 用于检测双击的 ref
  const lastPaneClickTimeRef = useRef<number>(0)
  const doubleClickThreshold = 300 // 双击时间阈值（毫秒）
  
  const onPaneClick = useCallback((event: React.MouseEvent) => {
    const now = Date.now()
    const timeSinceLastClick = now - lastPaneClickTimeRef.current
    
    // 检测双击
    if (timeSinceLastClick < doubleClickThreshold) {
      // 双击：唤出快速模块选择器（仅显示收藏）
      event.preventDefault()
      setQuickPickerPosition({
        x: event.clientX,
        y: event.clientY
      })
      setQuickPickerFavoritesOnly(true) // 仅显示收藏
      setShowQuickPicker(true)
      lastPaneClickTimeRef.current = 0 // 重置，避免三击触发
    } else {
      // 单击：取消所有选择
      selectNode(null)
      setSelectedEdgeIds([])
      lastClickedNodeIdRef.current = null
      lastPaneClickTimeRef.current = now
    }
  }, [selectNode])
  
  // 右键画布空白区域唤出快速模块选择器（显示所有模块）
  const handlePaneContextMenu = useCallback((event: React.MouseEvent | MouseEvent) => {
    event.preventDefault()
    setQuickPickerPosition({
      x: event.clientX,
      y: event.clientY
    })
    setQuickPickerFavoritesOnly(false) // 显示所有模块
    setShowQuickPicker(true)
  }, [])
  
  // 处理快速模块选择
  const { incrementUsage } = useModuleStatsStore()
  const handleQuickModuleSelect = useCallback((moduleType: ModuleType, customModuleId?: string) => {
    if (reactFlowInstance.current) {
      const position = reactFlowInstance.current.screenToFlowPosition({
        x: quickPickerPosition.x,
        y: quickPickerPosition.y
      })
      
      if (position) {
        // 如果是自定义模块，需要特殊处理
        if (customModuleId) {
          addNode('custom_module' as ModuleType, position, { customModuleId })
        } else {
          addNode(moduleType, position)
        }
        incrementUsage(moduleType)
      }
    }
  }, [quickPickerPosition, addNode, incrementUsage])

  // 跟踪鼠标在画布中的位置（用于粘贴和远程协助）
  const onMouseMove = useCallback((event: React.MouseEvent) => {
    if (reactFlowInstance.current) {
      const position = reactFlowInstance.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      mousePositionRef.current = position

      // 远程协助 - 发送鼠标位置（节流）- 发送画布坐标
      const session = remoteService.getSession()
      if (session && session.status === 'connected') {
        const now = Date.now()
        if (now - lastMouseSendRef.current >= mouseSendThrottleMs) {
          lastMouseSendRef.current = now
          remoteService.send({
            type: 'mouse_move',
            x: position.x,  // 画布坐标
            y: position.y,
          })
        }
      }
    }
  }, [])

  // 处理框选变化（包括节点和边）- 使用防抖优化性能
  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }: OnSelectionChangeParams) => {
      // 更新选中的边（边的选择不需要防抖，因为不会触发重渲染）
      setSelectedEdgeIds(selectedEdges.map(e => e.id))

      // 如果正在应用 Shift 选择，跳过此次回调，避免循环
      if (isApplyingShiftSelectionRef.current) {
        return
      }

      // 框选时这个回调每 16ms 内可能被触发多次，rAF 节流避免 1 帧多次重算
      if (selectionRafRef.current !== null) {
        cancelAnimationFrame(selectionRafRef.current)
      }
      const selectedNodesSnapshot = selectedNodes
      selectionRafRef.current = requestAnimationFrame(() => {
        selectionRafRef.current = null
        processSelectionChange(selectedNodesSnapshot)
      })
    },
    []
  )

  // 计算分组包含关系（自动缓存：节点引用未变即复用上次结果，避免框选时高频重算）
  const getGroupContainmentMap = useCallback(
    (currentNodes: Node<NodeData>[]): Map<string, Set<string>> => {
      const cache = groupContainmentCacheRef.current
      if (cache && cache.nodesRef === currentNodes) {
        return cache.map
      }
      const map = new Map<string, Set<string>>()
      const groupNodes = currentNodes.filter(n => n.type === 'groupNode')
      if (groupNodes.length === 0) {
        groupContainmentCacheRef.current = { nodesRef: currentNodes, map }
        return map
      }
      for (const groupNode of groupNodes) {
        const groupWidth =
          (groupNode.data.width as number) || ((groupNode.style?.width as number) ?? 300)
        const groupHeight =
          (groupNode.data.height as number) || ((groupNode.style?.height as number) ?? 200)
        const gx0 = groupNode.position.x
        const gy0 = groupNode.position.y
        const gx1 = gx0 + groupWidth
        const gy1 = gy0 + groupHeight
        const margin = 10
        const containedNodeIds = new Set<string>()
        for (const node of currentNodes) {
          if (node.id === groupNode.id || node.type === 'groupNode' || node.type === 'noteNode') {
            continue
          }
          const nodeWidth =
            (node.data.width as number) ||
            ((node.style?.width as number) ?? (node.width as number) ?? 200)
          const nodeHeight =
            (node.data.height as number) ||
            ((node.style?.height as number) ?? (node.height as number) ?? 100)
          const cx = node.position.x + nodeWidth / 2
          const cy = node.position.y + nodeHeight / 2
          if (cx >= gx0 + margin && cx <= gx1 - margin && cy >= gy0 + margin && cy <= gy1 - margin) {
            containedNodeIds.add(node.id)
          }
        }
        map.set(groupNode.id, containedNodeIds)
      }
      groupContainmentCacheRef.current = { nodesRef: currentNodes, map }
      return map
    },
    []
  )

  // 处理框选变化的实际逻辑（rAF 节流后调用，避免框选时碰一下卡一下）
  const processSelectionChange = useCallback(
    (selectedNodes: Array<{ id: string; type?: string }>) => {
      const currentNodes = useWorkflowStore.getState().nodes

      // 没有任何分组节点时直接快路径，跳过昂贵的包含计算
      const hasGroupNodes = currentNodes.some(n => n.type === 'groupNode')

      let filteredSelectedNodes: Array<{ id: string; type?: string }> = selectedNodes
      if (hasGroupNodes) {
        // 找出所有被选中的分组
        const selectedGroupIds = new Set(
          selectedNodes.filter(n => n.type === 'groupNode').map(n => n.id)
        )

        // 获取/构建分组包含关系缓存
        const groupContainedNodes = getGroupContainmentMap(currentNodes)

        // 过滤选中的节点：排除那些在未被选中的分组内的节点
        filteredSelectedNodes = selectedNodes.filter(node => {
          if (node.type === 'groupNode' || node.type === 'noteNode') {
            return true
          }
          for (const [groupId, containedNodeIds] of groupContainedNodes.entries()) {
            if (selectedGroupIds.has(groupId)) {
              continue
            }
            if (containedNodeIds.has(node.id)) {
              return false
            }
          }
          return true
        })

        // 如果过滤后的选择与原始选择不同，需要更新选择状态
        if (filteredSelectedNodes.length !== selectedNodes.length) {
          const filteredIds = new Set(filteredSelectedNodes.map(n => n.id))
          const changes = currentNodes.map(n => ({
            type: 'select' as const,
            id: n.id,
            selected: filteredIds.has(n.id),
          }))
          setTimeout(() => {
            onNodesChange(changes)
          }, 0)
          return
        }
      }

      // 如果按住 Shift 键框选，且有预先选中的节点，合并选择
      if (preSelectionNodesRef.current.length > 0 && filteredSelectedNodes.length > 0) {
        const newlySelectedIds = filteredSelectedNodes.map(n => n.id)
        const allSelectedIds = Array.from(new Set([...preSelectionNodesRef.current, ...newlySelectedIds]))

        if (allSelectedIds.length > newlySelectedIds.length) {
          isApplyingShiftSelectionRef.current = true
          setTimeout(() => {
            const latestNodes = useWorkflowStore.getState().nodes
            const changes = latestNodes.map(n => ({
              type: 'select' as const,
              id: n.id,
              selected: allSelectedIds.includes(n.id),
            }))
            onNodesChange(changes)
            setTimeout(() => {
              isApplyingShiftSelectionRef.current = false
            }, 100)
          }, 0)
          preSelectionNodesRef.current = []
          selectNode(null)
          return
        }
      }

      // 对节点选择使用防抖，避免框选过程中频繁更新配置面板导致卡顿
      const newSelectedNodeId = filteredSelectedNodes.length === 1 ? filteredSelectedNodes[0].id : null
      if (pendingSelectionRef.current === newSelectedNodeId) {
        return
      }
      pendingSelectionRef.current = newSelectedNodeId

      if (selectionDebounceRef.current) {
        clearTimeout(selectionDebounceRef.current)
      }
      selectionDebounceRef.current = setTimeout(() => {
        selectNode(pendingSelectionRef.current)
        if (pendingSelectionRef.current) {
          lastClickedNodeIdRef.current = pendingSelectionRef.current
        }
      }, 80) // 80ms 防抖（之前 50ms），框选高频时更省渲染
    },
    [selectNode, onNodesChange, getGroupContainmentMap]
  )

  // 验证连接是否有效
  const isValidConnection = useCallback((connection: Connection | Edge) => {
    // 不允许自环连接
    if (connection.source === connection.target) {
      addLog({
        level: 'error',
        message: '不允许将模块连接到自己！'
      })
      return false
    }
    return true
  }, [addLog])

  // 编辑器视图模式（流程图 / 模块条）
  const editorViewMode = useLayoutStore((s) => s.editorViewMode)
  const setEditorViewMode = useLayoutStore((s) => s.setEditorViewMode)

  // 画布周围小组件显示开关（全局配置，默认全部显示）
  const canvasWidgets = useGlobalConfigStore((s) => s.config.system.canvasWidgets)

  return (
    <div className="h-full w-full flex flex-col">
      {/* 顶部工具栏 */}
      <Toolbar />
      
      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden min-h-0 min-w-0">
        {/* 左侧模块面板 */}
        <ModuleSidebar />
        
        {/* 中间画布区域 */}
        <main 
          className="flex-1 relative gradient-mesh min-h-0 min-w-0"
          ref={reactFlowWrapper}
        >
          {canvasWidgets?.moduleCount !== false && <ModuleCount />}
          {canvasWidgets?.moduleSearch !== false && <ModuleSearch reactFlowInstance={reactFlowInstance.current} />}
          {canvasWidgets?.controlsHelp !== false && <ControlsHelp />}

          {/* 调试控制条（命中断点/单步时浮现） */}
          <DebugBar />

          {/* 视图模式切换：流程图 / 模块条（底部居中，避免与顶部搜索框重叠） */}
          {canvasWidgets?.viewSwitch !== false && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-0.5 p-0.5 rounded-[9px] bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-pop">
            <button
              onClick={async () => {
                const wasBlock = useLayoutStore.getState().editorViewMode === 'block'
                setEditorViewMode('flow')
                if (!wasBlock) return
                // 模块条 → 流程图：仅当检测到节点重叠（分支堆叠等）时才用 ELKJS 自动布局，
                // 避免覆盖用户已手动整理过的流程图布局
                const st = useWorkflowStore.getState()
                const ns = st.nodes
                if (ns.length < 2) return
                let overlap = false
                for (let i = 0; i < ns.length && !overlap; i++) {
                  for (let j = i + 1; j < ns.length; j++) {
                    const a = ns[i].position, b = ns[j].position
                    if (Math.abs(a.x - b.x) < 40 && Math.abs(a.y - b.y) < 40) { overlap = true; break }
                  }
                }
                if (overlap) {
                  const res = await st.autoLayoutNodes({ direction: 'DOWN' })
                  if (res.ok) {
                    setTimeout(() => { try { reactFlowInstance.current?.fitView({ padding: 0.2, duration: 320 }) } catch {} }, 60)
                  }
                }
              }}
              className={
                'flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[12px] font-medium transition-all ' +
                (editorViewMode === 'flow'
                  ? 'bg-[hsl(var(--brand-500))] text-white shadow-sm'
                  : 'text-[hsl(var(--slate-600))] hover:bg-[hsl(var(--brand-50))]')
              }
            >
              <Workflow className="w-3.5 h-3.5" /> 流程图
            </button>
            <button
              onClick={() => setEditorViewMode('block')}
              className={
                'flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[12px] font-medium transition-all ' +
                (editorViewMode === 'block'
                  ? 'bg-[hsl(var(--brand-500))] text-white shadow-sm'
                  : 'text-[hsl(var(--slate-600))] hover:bg-[hsl(var(--brand-50))]')
              }
            >
              <LayoutList className="w-3.5 h-3.5" /> 模块条
            </button>
          </div>
          )}

          {/* 模块条视图：覆盖在画布之上（流程图保持挂载以维持实例与状态） */}
          {editorViewMode === 'block' && (
            <div className="absolute inset-0 z-10 bg-[hsl(var(--background))]">
              <BlockFlowView />
            </div>
          )}
          
          {/* 远程光标 */}
          {remoteConnected && reactFlowInstance.current && (
            <RemoteCursor 
              flowToScreenPosition={(pos) => reactFlowInstance.current!.flowToScreenPosition(pos)} 
            />
          )}
          
          {/* 拖拽文件提示遮罩 */}
          {isDraggingFile && (
            <div className="absolute inset-0 z-50 bg-blue-500/10 border-2 border-dashed border-blue-500 flex items-center justify-center pointer-events-none animate-fade-in">
              <div className="glass-strong rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 animate-scale-in">
                <div className="bg-[hsl(var(--brand-600))] p-4 rounded-full shadow-lg">
                  <FileJson className="w-10 h-10 text-white" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-gradient">释放以导入工作流</p>
                  <p className="text-sm text-muted-foreground mt-1">支持导入 .json 格式的工作流文件</p>
                </div>
              </div>
            </div>
          )}
          
          <ReactFlow
            nodes={nodes.map(n => ({
              ...n,
              data: {
                ...n.data
              }
            })) as Node<NodeData>[]}
            edges={edges.map(e => ({
              ...e,
              // 大工作流（>200节点）关闭连线流动动画，显著降低渲染开销
              animated: nodes.length > 200 ? false : (e as typeof e & { animated?: boolean }).animated,
              selected: selectedEdgeIds.includes(e.id),
              style: selectedEdgeIds.includes(e.id) ? { stroke: '#ef4444', strokeWidth: 3 } : e.style
            })) as typeof edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            onInit={onInit}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            onPaneContextMenu={handlePaneContextMenu}
            onMouseMove={onMouseMove}
            onSelectionChange={onSelectionChange}
            nodeTypes={nodeTypes}
            fitView
            selectionOnDrag
            selectionMode={SelectionMode.Partial}
            selectNodesOnDrag={false}
            panOnDrag={[1]}
            panOnScroll={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            elevateNodesOnSelect={false}
            onlyRenderVisibleElements={nodes.length > 200}
            defaultEdgeOptions={{
              type: 'smoothstep',
              animated: nodes.length <= 200,
              selectable: true,
            }}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={20} size={1.2} color="hsl(var(--slate-300))" />
            {canvasWidgets?.controls !== false && <Controls />}
            {canvasWidgets?.minimap !== false && <MiniMap 
              nodeColor={(node) => {
                const data = node.data as NodeData
                if (data.moduleType?.startsWith('condition') || data.moduleType?.startsWith('loop') || data.moduleType?.startsWith('foreach')) {
                  return '#22c55e'
                }
                if (data.moduleType?.includes('captcha')) {
                  return '#f97316'
                }
                if (['select_dropdown', 'set_checkbox', 'drag_element', 'scroll_page', 'upload_file', 'download_file', 'save_image'].includes(data.moduleType)) {
                  return '#a855f7'
                }
                return '#3b82f6'
              }}
              zoomable
              pannable
              onClick={handleMiniMapClick}
              maskColor="rgba(0, 0, 0, 0.1)"
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                cursor: 'pointer',
                overflow: 'hidden',
              }}
            />}
          </ReactFlow>
        </main>
        
        {/* 右侧配置面板 */}
        <ConfigPanel selectedNodeId={selectedNodeId} />
        
        {/* 快速模块选择器 */}
        <QuickModulePicker
          isOpen={showQuickPicker}
          position={quickPickerPosition}
          onClose={() => setShowQuickPicker(false)}
          onSelectModule={handleQuickModuleSelect}
          availableModules={getAllAvailableModules()}
          favoritesOnly={quickPickerFavoritesOnly}
        />
      </div>
      
      {/* 底部日志面板 */}
      <LogPanel onLogClick={handleLogClick} />
      
      {/* 浏览器被占用提示弹窗 */}
      {showBrowserBusyDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 animate-fade-in" style={{ zIndex: 2147483640 }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-full bg-amber-100">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">浏览器被占用</h3>
              </div>
              <p className="text-gray-600 mb-4">
                检测到自动化浏览器正在被其他程序使用，无法启动新的浏览器实例。
              </p>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                <p className="text-sm text-amber-800">
                  <strong>解决方法：</strong><br />
                  1. 关闭所有已打开的自动化浏览器窗口<br />
                  2. 如果使用了"自动化浏览器"功能，请先关闭它<br />
                  3. 然后重新运行工作流
                </p>
              </div>
              <button
                onClick={() => setShowBrowserBusyDialog(false)}
                className="bg-[hsl(var(--brand-600))] w-full py-2 px-4 text-white rounded-lg font-medium transition-all"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 浏览器意外关闭提示弹窗 */}
      {showBrowserClosedDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 animate-fade-in" style={{ zIndex: 2147483640 }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-full bg-red-100">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">浏览器意外关闭</h3>
              </div>
              <p className="text-gray-600 mb-4">
                检测到自动化浏览器已被关闭，工作流已自动停止运行。
              </p>
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                <p className="text-sm text-red-800">
                  <strong>提示：</strong><br />
                  工作流运行期间请勿手动关闭自动化浏览器窗口，否则会导致工作流中断。
                </p>
              </div>
              <button
                onClick={() => setShowBrowserClosedDialog(false)}
                className="bg-[hsl(var(--brand-600))] w-full py-2 px-4 text-white rounded-lg font-medium transition-all"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 主题化确认/提示弹窗 */}
      <ConfirmDialog />
      {/* 加密包导入密码弹窗 */}
      {passwordDialog}
    </div>
  )
}
