/**
 * 颜色选择器组件
 */
import { useState, useRef, useEffect } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Palette } from 'lucide-react'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  label?: string
}

// 预设颜色
const PRESET_COLORS = [
  '#EF4444', // 红色
  '#F97316', // 橙色
  '#F59E0B', // 琥珀色
  '#EAB308', // 黄色
  '#84CC16', // 青柠色
  '#22C55E', // 绿色
  '#10B981', // 翠绿色
  '#14B8A6', // 青色
  '#06B6D4', // 天蓝色
  '#0EA5E9', // 蓝色
  '#3B82F6', // 靛蓝色
  '#6366F1', // 紫罗兰色
  '#8B5CF6', // 紫色
  '#A855F7', // 紫红色
  '#D946EF', // 品红色
  '#EC4899', // 粉色
  '#F43F5E', // 玫瑰色
  '#64748B', // 灰色
]

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [open, setOpen] = useState(false)
  const [customColor, setCustomColor] = useState(value)
  const colorInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setCustomColor(value)
  }, [value])

  const handleColorChange = (color: string) => {
    setCustomColor(color)
    onChange(color)
  }

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value
    setCustomColor(color)
    onChange(color)
  }

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="relative">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div
              role="button"
              tabIndex={0}
              className="w-full flex items-center justify-start gap-2 px-3 py-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
              onClick={() => setOpen(!open)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setOpen(!open)
                }
              }}
            >
              <div
                className="w-5 h-5 rounded border border-gray-300 shadow-sm"
                style={{ backgroundColor: value }}
              />
              <span className="flex-1 text-left font-mono text-sm">{value}</span>
              <Palette className="w-4 h-4 text-muted-foreground" />
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="start">
            <div className="space-y-3">
              {/* 预设颜色 */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">预设颜色</Label>
                <div className="grid grid-cols-9 gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleColorChange(color)}
                      className="w-6 h-6 rounded border-2 hover:scale-110 transition-transform"
                      style={{
                        backgroundColor: color,
                        borderColor: value === color ? '#000' : 'transparent',
                      }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              {/* 自定义颜色（纯文本 hex，避免使用浏览器原生取色控件） */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">自定义颜色（输入十六进制）</Label>
                <div className="flex gap-2 items-center">
                  <span
                    className="w-8 h-8 rounded-md border border-gray-300 shrink-0"
                    style={{ backgroundColor: customColor }}
                  />
                  <Input
                    ref={colorInputRef}
                    type="text"
                    value={customColor}
                    onChange={handleCustomColorChange}
                    placeholder="#000000"
                    className="font-mono text-sm flex-1"
                  />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
