import { memo, useState, useCallback, useRef, useEffect } from 'react'
import { Handle, Position, NodeResizer, type NodeProps, useReactFlow } from '@xyflow/react'
import { StickyNote, Bold, Italic, Minus, Plus, Palette } from 'lucide-react'

export interface NoteNodeData {
  label: string
  moduleType: 'note'
  content?: string
  color?: string
  fontSize?: number
  fontBold?: boolean
  fontItalic?: boolean
}

const COLORS = [
  { name: '黄色', value: '#fef08a', border: '#eab308' },
  { name: '绿色', value: '#bbf7d0', border: '#22c55e' },
  { name: '蓝色', value: '#bfdbfe', border: '#3b82f6' },
  { name: '紫色', value: '#ddd6fe', border: '#a855f7' },
  { name: '粉色', value: '#fbcfe8', border: '#ec4899' },
  { name: '橙色', value: '#fed7aa', border: '#f97316' },
  { name: '白色', value: '#ffffff', border: '#d1d5db' },
  { name: '灰色', value: '#e5e7eb', border: '#9ca3af' },
]

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32]

export const NoteNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as unknown as NoteNodeData
  const { setNodes } = useReactFlow()
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(nodeData.content || '')
  const [showColorPicker, setShowColorPicker] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const colorPickerRef = useRef<HTMLDivElement>(null)

  // 使用本地状态来确保实时更新
  const [localColor, setLocalColor] = useState(nodeData.color || COLORS[0].value)
  const [localFontSize, setLocalFontSize] = useState(nodeData.fontSize || 14)
  const [localFontBold, setLocalFontBold] = useState(nodeData.fontBold || false)
  const [localFontItalic, setLocalFontItalic] = useState(nodeData.fontItalic || false)

  // 同步外部数据到本地状态
  useEffect(() => {
    setLocalColor(nodeData.color || COLORS[0].value)
    setLocalFontSize(nodeData.fontSize || 14)
    setLocalFontBold(nodeData.fontBold || false)
    setLocalFontItalic(nodeData.fontItalic || false)
  }, [nodeData.color, nodeData.fontSize, nodeData.fontBold, nodeData.fontItalic])

  const colorConfig = COLORS.find((c) => c.value === localColor) || COLORS[0]

  const updateData = useCallback(
    (updates: Partial<NoteNodeData>) => {
      // 先更新本地状态
      if (updates.color !== undefined) setLocalColor(updates.color)
      if (updates.fontSize !== undefined) setLocalFontSize(updates.fontSize)
      if (updates.fontBold !== undefined) setLocalFontBold(updates.fontBold)
      if (updates.fontItalic !== undefined) setLocalFontItalic(updates.fontItalic)
      // 再更新节点数据
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id ? { ...node, data: { ...node.data, ...updates } } : node
        )
      )
    },
    [id, setNodes]
  )

  useEffect(() => {
    if (!isEditing) {
      setEditValue(nodeData.content || '')
    }
  }, [nodeData.content, isEditing])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false)
      }
    }
    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showColorPicker])

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true)
    setEditValue(nodeData.content || '')
  }, [nodeData.content])

  const handleBlur = useCallback(() => {
    setIsEditing(false)
    updateData({ content: editValue })
  }, [editValue, updateData])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsEditing(false)
        setEditValue(nodeData.content || '')
      }
    },
    [nodeData.content]
  )

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      const len = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(len, len)
    }
  }, [isEditing])

  const handleColorChange = useCallback(
    (color: string) => {
      updateData({ color })
      setShowColorPicker(false)
    },
    [updateData]
  )

  const handleFontSizeChange = useCallback(
    (delta: number) => {
      const currentIndex = FONT_SIZES.indexOf(localFontSize)
      const newIndex = Math.max(0, Math.min(FONT_SIZES.length - 1, currentIndex + delta))
      updateData({ fontSize: FONT_SIZES[newIndex] })
    },
    [localFontSize, updateData]
  )

  const toggleBold = useCallback(() => {
    updateData({ fontBold: !localFontBold })
  }, [localFontBold, updateData])

  const toggleItalic = useCallback(() => {
    updateData({ fontItalic: !localFontItalic })
  }, [localFontItalic, updateData])

  return (
    <>
      <NodeResizer
        minWidth={150}
        minHeight={100}
        isVisible={selected}
        lineClassName="!border-[hsl(var(--brand-500))]"
        handleClassName="!w-3 !h-3 !bg-[hsl(var(--brand-500))] !border-2 !border-white !rounded-full"
      />
      <div
        className={`w-full h-full rounded-[12px] flex flex-col transition-shadow duration-200 ${(nodeData as any).__aiSpawning ? 'ai-node-spawn' : ''}`}
        style={{
          backgroundColor: colorConfig.value,
          border: `2px solid ${selected ? colorConfig.border : colorConfig.border + '60'}`,
          boxShadow: selected
            ? `0 8px 24px -8px ${colorConfig.border}50, 0 4px 8px -4px ${colorConfig.border}30`
            : `0 2px 6px -1px ${colorConfig.border}30`,
        }}
      >
        <div
          className="flex items-center justify-between px-2.5 py-1.5 shrink-0 rounded-t-[10px]"
          style={{
            borderBottom: `1px dashed ${colorConfig.border}50`,
            background: `linear-gradient(180deg, ${colorConfig.border}15, transparent)`,
          }}
        >
          <div className="flex items-center gap-1.5">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: colorConfig.border + '25' }}
            >
              <StickyNote className="w-3 h-3" style={{ color: colorConfig.border }} strokeWidth={2.4} />
            </div>
            <span className="text-[11px] font-bold tracking-wide" style={{ color: colorConfig.border }}>便签</span>
          </div>
          {selected && (
            <div
              className="flex items-center gap-0.5 bg-white/40 backdrop-blur-sm rounded-[6px] px-0.5 py-0.5"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="relative" ref={colorPickerRef}>
                <button
                  className="p-1 rounded-[4px] hover:bg-black/10 active:scale-90 transition-all"
                  onClick={(e) => { e.stopPropagation(); setShowColorPicker(!showColorPicker) }}
                  onMouseDown={(e) => e.stopPropagation()}
                  title="选择颜色"
                >
                  <Palette className="w-3.5 h-3.5" style={{ color: colorConfig.border }} />
                </button>
                {showColorPicker && (
                  <div
                    className="absolute top-full right-0 mt-1.5 p-2 bg-[hsl(var(--card))] rounded-[10px] shadow-pop-xl border border-[hsl(var(--border))] z-[100] animate-scale-in"
                    style={{ width: '124px' }}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <div className="grid grid-cols-4 gap-1.5">
                      {COLORS.map((c) => (
                        <button
                          key={c.value}
                          className="w-6 h-6 rounded-full border-2 hover:scale-110 transition-transform shadow-xs"
                          style={{
                            backgroundColor: c.value,
                            borderColor: localColor === c.value ? c.border : 'rgba(0,0,0,0.06)',
                            boxShadow: localColor === c.value ? `0 0 0 2px ${c.border}40` : undefined,
                          }}
                          onClick={(e) => { e.stopPropagation(); handleColorChange(c.value) }}
                          onMouseDown={(e) => e.stopPropagation()}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button
                className="p-1 rounded-[4px] hover:bg-black/10 active:scale-90 transition-all"
                onClick={(e) => { e.stopPropagation(); handleFontSizeChange(-1) }}
                onMouseDown={(e) => e.stopPropagation()}
                title="减小字体"
              >
                <Minus className="w-3.5 h-3.5" style={{ color: colorConfig.border }} />
              </button>
              <span className="text-[10.5px] font-mono min-w-[20px] text-center font-bold" style={{ color: colorConfig.border }}>{localFontSize}</span>
              <button
                className="p-1 rounded-[4px] hover:bg-black/10 active:scale-90 transition-all"
                onClick={(e) => { e.stopPropagation(); handleFontSizeChange(1) }}
                onMouseDown={(e) => e.stopPropagation()}
                title="增大字体"
              >
                <Plus className="w-3.5 h-3.5" style={{ color: colorConfig.border }} />
              </button>
              <button
                className={`p-1 rounded-[4px] active:scale-90 transition-all ${localFontBold ? 'bg-black/20 shadow-inner' : 'hover:bg-black/10'}`}
                onClick={(e) => { e.stopPropagation(); toggleBold() }}
                onMouseDown={(e) => e.stopPropagation()}
                title="加粗"
              >
                <Bold className="w-3.5 h-3.5" style={{ color: colorConfig.border }} />
              </button>
              <button
                className={`p-1 rounded-[4px] active:scale-90 transition-all ${localFontItalic ? 'bg-black/20 shadow-inner' : 'hover:bg-black/10'}`}
                onClick={(e) => { e.stopPropagation(); toggleItalic() }}
                onMouseDown={(e) => e.stopPropagation()}
                title="斜体"
              >
                <Italic className="w-3.5 h-3.5" style={{ color: colorConfig.border }} />
              </button>
            </div>
          )}
        </div>
        <div className="flex-1 p-2.5 overflow-hidden cursor-text min-h-0 rounded-b-[10px]" onDoubleClick={handleDoubleClick}>
          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="w-full h-full bg-transparent border-none outline-none resize-none text-[hsl(var(--slate-800))] overflow-hidden leading-relaxed"
              style={{ fontSize: `${localFontSize}px`, fontWeight: localFontBold ? 'bold' : 'normal', fontStyle: localFontItalic ? 'italic' : 'normal' }}
              placeholder="双击编辑内容..."
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div
              className="w-full h-full text-[hsl(var(--slate-800))] overflow-hidden whitespace-pre-wrap break-words leading-relaxed"
              style={{ fontSize: `${localFontSize}px`, fontWeight: localFontBold ? 'bold' : 'normal', fontStyle: localFontItalic ? 'italic' : 'normal' }}
            >
              {nodeData.content || <span className="text-[hsl(var(--slate-500))] italic font-normal">双击编辑内容...</span>}
            </div>
          )}
        </div>
      </div>
      <Handle type="target" position={Position.Top} className="!opacity-0 !w-0 !h-0" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0 !w-0 !h-0" />
    </>
  )
})

NoteNode.displayName = 'NoteNode'
