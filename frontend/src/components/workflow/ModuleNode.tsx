import { memo } from 'react'
import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react'
import { cn } from '@/lib/utils'
import type { NodeData } from '@/store/workflowStore'
import { useGlobalConfigStore } from '@/store/globalConfigStore'
import { Globe, ExternalLink, Play } from 'lucide-react'
import { moduleIcons } from './ModuleSidebar'
import { moduleColors } from './moduleColors'
import { useNodeRunStore } from '@/store/nodeRunStore'
import { useDebugStore } from '@/store/debugStore'

function ModuleNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as NodeData
  const { fitView, getNodes, setCenter } = useReactFlow()
  const runStatus = useNodeRunStore((s) => s.statuses[id])
  const hasBreakpoint = useDebugStore((s) => s.breakpoints.has(id))
  const isPausedHere = useDebugStore((s) => s.isPaused && s.pausedNodeId === id)
  const toggleBreakpoint = useDebugStore((s) => s.toggleBreakpoint)
  const isDisabled = nodeData.disabled === true
  const isHighlighted = nodeData.isHighlighted === true
  const handleSize = useGlobalConfigStore((state) => state.config.display?.handleSize || 12)

  // 对于自定义模块，使用节点数据中的图标和颜色
  const isCustomModule = nodeData.moduleType === 'custom_module'
  const customIcon = isCustomModule ? (nodeData.icon as string) : null
  const customColor = isCustomModule ? (nodeData.color as string) : null
  
  // 将十六进制颜色转换为RGB，用于生成浅色背景
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null
  }
  
  const getCustomModuleStyle = () => {
    if (!customColor) return {}
    const rgb = hexToRgb(customColor)
    if (!rgb) return {}
    
    // 生成浅色背景（类似bg-xxx-100的效果）
    // 将颜色与白色混合，使其变浅（混合比例：20%原色 + 80%白色）
    const lightR = Math.round(rgb.r * 0.2 + 255 * 0.8)
    const lightG = Math.round(rgb.g * 0.2 + 255 * 0.8)
    const lightB = Math.round(rgb.b * 0.2 + 255 * 0.8)
    
    // 文字颜色使用深色版本（类似text-xxx-900的效果）
    // 将颜色变暗（混合比例：80%原色 + 20%黑色）
    const darkR = Math.round(rgb.r * 0.2)
    const darkG = Math.round(rgb.g * 0.2)
    const darkB = Math.round(rgb.b * 0.2)
    
    // 使用浅色背景和深色文字，与内置模块样式一致
    return {
      borderColor: customColor,  // 边框使用原色
      backgroundColor: `rgb(${lightR}, ${lightG}, ${lightB})`,  // 浅色背景
      color: `rgb(${darkR}, ${darkG}, ${darkB})`  // 深色文字
    }
  }
  
  const Icon = isCustomModule ? null : (moduleIcons[nodeData.moduleType] || Globe)
  const colorClass = isCustomModule 
    ? '' 
    : (moduleColors[nodeData.moduleType] || 'border-gray-500 bg-gray-50')

  const handleSubflowDoubleClick = (e: React.MouseEvent) => {
    if (nodeData.moduleType !== 'subflow') return
    e.stopPropagation()
    const subflowName = nodeData.subflowName as string
    if (!subflowName) return
    const nodes = getNodes()
    const targetNode = nodes.find(n =>
      (n.type === 'subflowHeaderNode' && n.data.subflowName === subflowName) ||
      (n.type === 'groupNode' && n.data.isSubflow && n.data.subflowName === subflowName)
    )
    if (targetNode) {
      if (targetNode.type === 'groupNode') {
        // 分组节点用 setCenter 定位到中心
        const w = (targetNode.data.width as number) || (targetNode.width as number) || 400
        const h = (targetNode.data.height as number) || (targetNode.height as number) || 300
        const cx = targetNode.position.x + w / 2
        const cy = targetNode.position.y + h / 2
        setCenter(cx, cy, { duration: 500, zoom: 0.8 })
      } else {
        fitView({ nodes: [targetNode], duration: 500, padding: 0.3 })
      }
      setTimeout(() => {
        const event = new CustomEvent('highlight-node', { detail: { nodeId: targetNode.id } })
        window.dispatchEvent(event)
      }, 100)
    }
  }

  const getSummary = () => {
    if (nodeData.moduleType === 'subflow' && nodeData.subflowName) return `${nodeData.subflowName}`
    if (nodeData.url) return nodeData.url as string
    if (nodeData.selector) return nodeData.selector as string
    if (nodeData.text) return nodeData.text as string
    if (nodeData.logMessage) return nodeData.logMessage as string
    if (nodeData.variableName) return `→ ${nodeData.variableName}`
    if (nodeData.userPrompt) return nodeData.userPrompt as string
    if (nodeData.requestUrl) return nodeData.requestUrl as string
    return ''
  }

  const truncateText = (text: string, maxLen: number) =>
    text.length <= maxLen ? text : text.slice(0, maxLen) + '...'

  const summary = truncateText(getSummary(), 30)
  const customName = nodeData.name as string | undefined
  const isSubflow = nodeData.moduleType === 'subflow'

  return (
    <div
      className={cn(
        'group relative px-4 py-3 rounded-[12px] border-[1.5px] min-w-[180px] max-w-[280px]',
        // 关键：只 transition 不会引起 reflow / 影响 RF 计算 handle 的属性
        'shadow-soft hover:shadow-pop-lg hover:border-[hsl(var(--brand-500)/0.6)]',
        'transition-[box-shadow,border-color] duration-150 ease-out',
        isDisabled ? 'border-gray-300 bg-gray-100 text-gray-500 opacity-70' : (isCustomModule ? '' : colorClass),
        selected && '!border-[hsl(var(--brand-500))] !shadow-pop-lg ring-2 ring-[hsl(var(--brand-500)/0.4)]',
        isHighlighted && '!border-[hsl(var(--warning-500))] ring-2 ring-[hsl(var(--warning-500)/0.5)]',
        // 执行态实时高亮：运行中(蓝)/成功(绿)/失败(红)
        runStatus === 'running' && '!border-[hsl(var(--brand-500))] ring-2 ring-[hsl(var(--brand-500)/0.55)] shadow-brand-glow animate-pulse',
        runStatus === 'success' && '!border-[hsl(var(--success-500))] ring-2 ring-[hsl(var(--success-500)/0.45)]',
        runStatus === 'failed' && '!border-[hsl(var(--danger-500))] ring-2 ring-[hsl(var(--danger-500)/0.5)]',
        isPausedHere && '!border-amber-500 ring-2 ring-amber-400/70 shadow-warning-glow',
        isSubflow && nodeData.subflowName ? 'cursor-pointer' : '',
        // AI 助手可视化搭建时节点入场动画
        (nodeData as any).__aiSpawning && 'ai-node-spawn'
      )}
      style={
        isDisabled
          ? { opacity: 0.6 }
          : isCustomModule && customColor
          ? getCustomModuleStyle()
          : undefined
      }
      onDoubleClick={isSubflow && nodeData.subflowName ? handleSubflowDoubleClick : undefined}
    >
      {/* 断点圆点：点击切换。命中时实心红，未命中时悬停才显形 */}
      <button
        className={cn(
          'absolute -left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow z-10 transition-opacity duration-150 cursor-pointer',
          hasBreakpoint ? 'bg-red-500 opacity-100' : 'bg-red-400/40 opacity-0 group-hover:opacity-100 hover:!bg-red-500'
        )}
        title={hasBreakpoint ? '移除断点' : '设置断点（运行到此暂停）'}
        onClick={(e) => { e.stopPropagation(); toggleBreakpoint(id) }}
      />

      {/* 从此节点开始运行：悬停显现的绿色播放按钮（调试用，跳过其上游节点） */}
      <button
        className={cn(
          'absolute -left-2 -top-2 w-5 h-5 flex items-center justify-center rounded-full bg-emerald-500 text-white shadow ring-2 ring-white z-10 cursor-pointer',
          'opacity-0 group-hover:opacity-100 hover:scale-110 hover:bg-emerald-600 transition-all duration-150'
        )}
        title="从此节点开始运行（跳过其上游节点）"
        onClick={(e) => {
          e.stopPropagation()
          window.dispatchEvent(new CustomEvent('run-from-node', { detail: { nodeId: id } }))
        }}
      >
        <Play className="w-2.5 h-2.5" strokeWidth={3} fill="currentColor" />
      </button>

      {isDisabled && (
        <div className="absolute -top-2 -right-2 bg-[hsl(var(--slate-700))] text-white text-[9.5px] font-bold px-2 py-0.5 rounded-full shadow-md uppercase tracking-wider">
          已禁用
        </div>
      )}

      {/* 子流程跳转图标 */}
      {isSubflow && nodeData.subflowName && (
        <button
          className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center bg-gradient-to-br from-[hsl(var(--success-500))] to-[hsl(var(--success-700))] text-white rounded-full shadow-success-glow ring-2 ring-white cursor-pointer hover:scale-110 transition-transform duration-150"
          title="跳转到子流程定义"
          onClick={(e) => {
            e.stopPropagation()
            handleSubflowDoubleClick(e as unknown as React.MouseEvent)
          }}
        >
          <ExternalLink className="w-3 h-3" strokeWidth={2.5} />
        </button>
      )}

      {/* 输入连接点 */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-[hsl(var(--card))] !border-[2px] !border-[hsl(var(--brand-500))]"
        style={{ width: `${handleSize}px`, height: `${handleSize}px` }}
      />

      {/* 节点内容 */}
      <div className="flex items-center gap-2 relative">
        <div className="shrink-0">
          {isCustomModule && customIcon ? (
            <span className="text-2xl">{customIcon}</span>
          ) : Icon ? (
            <Icon className="w-5 h-5 text-current" />
          ) : (
            <Globe className="w-5 h-5 text-current" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate text-current">
            {nodeData.label}
            {customName && (
              <span className="text-amber-600 dark:text-amber-400 font-normal ml-1">
                ({customName})
              </span>
            )}
          </div>
          {summary && (
            <div className={cn(
              'text-xs truncate mt-0.5 text-current',
              isSubflow && nodeData.subflowName ? 'text-emerald-600 dark:text-emerald-400 font-bold opacity-100' : 'opacity-75'
            )}>
              {summary}
            </div>
          )}
        </div>
      </div>

      {/* 输出连接点 */}
      {nodeData.moduleType === 'condition' ||
       nodeData.moduleType === 'face_recognition' ||
       nodeData.moduleType === 'element_exists' ||
       nodeData.moduleType === 'element_visible' ||
       nodeData.moduleType === 'image_exists' ||
       nodeData.moduleType === 'phone_image_exists' ||
       nodeData.moduleType === 'probability_trigger' ? (
        <>
          <Handle type="source" position={Position.Bottom} id={nodeData.moduleType === 'probability_trigger' ? 'path1' : 'true'}
            className="!bg-[hsl(var(--success-500))] !border-[2px] !border-white shadow-success-glow" style={{ left: '30%', width: `${handleSize}px`, height: `${handleSize}px` }} />
          <div className="absolute -bottom-6 px-1.5 py-0.5 rounded-full bg-[hsl(var(--success-50))] text-[hsl(var(--success-700))] border border-[hsl(var(--success-500)/0.3)] text-[9.5px] font-bold shadow-xs whitespace-nowrap" style={{ left: '30%', transform: 'translateX(-50%)' }}>
            {nodeData.moduleType === 'probability_trigger' ? '路径1' : nodeData.moduleType === 'face_recognition' ? '匹配' : nodeData.moduleType === 'element_visible' ? '可见' : nodeData.moduleType === 'element_exists' || nodeData.moduleType === 'image_exists' || nodeData.moduleType === 'phone_image_exists' ? '存在' : '是'}
          </div>
          <Handle type="source" position={Position.Bottom} id={nodeData.moduleType === 'probability_trigger' ? 'path2' : 'false'}
            className="!bg-[hsl(var(--danger-500))] !border-[2px] !border-white shadow-danger-glow" style={{ left: '70%', width: `${handleSize}px`, height: `${handleSize}px` }} />
          <div className="absolute -bottom-6 px-1.5 py-0.5 rounded-full bg-[hsl(var(--danger-50))] text-[hsl(var(--danger-700))] border border-[hsl(var(--danger-500)/0.3)] text-[9.5px] font-bold shadow-xs whitespace-nowrap" style={{ left: '70%', transform: 'translateX(-50%)' }}>
            {nodeData.moduleType === 'probability_trigger' ? '路径2' : nodeData.moduleType === 'face_recognition' ? '不匹配' : nodeData.moduleType === 'element_visible' ? '不可见' : nodeData.moduleType === 'element_exists' || nodeData.moduleType === 'image_exists' || nodeData.moduleType === 'phone_image_exists' ? '不存在' : '否'}
          </div>
          <Handle type="source" position={Position.Right} id="error" className="!bg-[hsl(var(--warning-500))] !border-[2px] !border-white" style={{ top: '50%', width: `${handleSize * 0.83}px`, height: `${handleSize * 0.83}px` }} />
        </>
      ) : nodeData.moduleType === 'loop' || nodeData.moduleType === 'foreach' || nodeData.moduleType === 'foreach_dict' ? (
        <>
          <Handle type="source" position={Position.Bottom} id="loop" className="!bg-[hsl(var(--success-500))] !border-[2px] !border-white" style={{ left: '30%', width: `${handleSize}px`, height: `${handleSize}px` }} />
          <div className="absolute -bottom-6 px-1.5 py-0.5 rounded-full bg-[hsl(var(--success-50))] text-[hsl(var(--success-700))] border border-[hsl(var(--success-500)/0.3)] text-[9.5px] font-bold shadow-xs whitespace-nowrap" style={{ left: '30%', transform: 'translateX(-50%)' }}>循环</div>
          <Handle type="source" position={Position.Bottom} id="done" className="!bg-[hsl(var(--danger-500))] !border-[2px] !border-white" style={{ left: '70%', width: `${handleSize}px`, height: `${handleSize}px` }} />
          <div className="absolute -bottom-6 px-1.5 py-0.5 rounded-full bg-[hsl(var(--danger-50))] text-[hsl(var(--danger-700))] border border-[hsl(var(--danger-500)/0.3)] text-[9.5px] font-bold shadow-xs whitespace-nowrap" style={{ left: '70%', transform: 'translateX(-50%)' }}>完成</div>
          <Handle type="source" position={Position.Right} id="error" className="!bg-[hsl(var(--warning-500))] !border-[2px] !border-white" style={{ top: '50%', width: `${handleSize * 0.83}px`, height: `${handleSize * 0.83}px` }} />
        </>
      ) : (
        <>
          <Handle type="source" position={Position.Bottom} className="!bg-[hsl(var(--card))] !border-[2px] !border-[hsl(var(--brand-500))]" style={{ width: `${handleSize}px`, height: `${handleSize}px` }} />
          <Handle type="source" position={Position.Right} id="error" className="!bg-[hsl(var(--warning-500))] !border-[2px] !border-white" style={{ top: '50%', width: `${handleSize * 0.83}px`, height: `${handleSize * 0.83}px` }} />
        </>
      )}
    </div>
  )
}

export const ModuleNode = memo(ModuleNodeComponent)
