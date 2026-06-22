import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { socketService } from '@/services/socket'
import { X, List, Hash, Type, Lock, AlignLeft, File, Folder, CheckSquare, SlidersHorizontal, ListChecks } from 'lucide-react'
import { getBackendUrl } from '@/services/api'
import { DialogPortal } from '@/components/ui/dialog-portal'
import { useDialogRegistry } from '@/store/dialogRegistry'

interface PromptData {
  requestId: string
  variableName: string
  title: string
  message: string
  defaultValue: string
  inputMode: 'single' | 'multiline' | 'number' | 'integer' | 'password' | 'list' | 'file' | 'folder' | 'checkbox' | 'slider_int' | 'slider_float' | 'select_single' | 'select_multiple'
  minValue?: number
  maxValue?: number
  maxLength?: number
  required?: boolean
  selectOptions?: string[]  // 列表选择的选项
}

export function InputPromptDialog() {
  const [promptData, setPromptData] = useState<PromptData | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [checkboxValue, setCheckboxValue] = useState(false)
  const [sliderValue, setSliderValue] = useState(0)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [error, setError] = useState('')

  const handlePromptRequest = useCallback((data: PromptData) => {
    try {
      // 归一化默认值为字符串：defaultValue 可能是数字（如 integer 模式配了 8），
      // 若直接存进 inputValue 状态，后续 inputValue.split / inputValue.trim 会因
      // "不是字符串"而抛 TypeError 导致编辑器白屏。这里统一转成字符串。
      const rawDefault = (data as { defaultValue?: unknown }).defaultValue
      const defaultStr = rawDefault === null || rawDefault === undefined ? '' : String(rawDefault)
      setPromptData({ ...data, defaultValue: defaultStr })
      setInputValue(defaultStr)
      // 复选框模式：解析默认值为布尔值
      if (data.inputMode === 'checkbox') {
        const lower = defaultStr.toLowerCase()
        const defaultBool = lower === 'true' || defaultStr === '1'
        setCheckboxValue(defaultBool)
      } else {
        setCheckboxValue(false)
      }
      // 滑动条模式：解析默认值为数字
      if (data.inputMode === 'slider_int' || data.inputMode === 'slider_float') {
        const defaultNum = parseFloat(defaultStr) || data.minValue || 0
        setSliderValue(defaultNum)
      } else {
        setSliderValue(0)
      }
      // 列表选择模式：解析默认值为选中项
      if (data.inputMode === 'select_single' || data.inputMode === 'select_multiple') {
        // 确保 selectOptions 是字符串数组
        if (data.selectOptions && !Array.isArray(data.selectOptions)) {
          console.error('[InputPrompt] selectOptions 不是数组:', data.selectOptions)
          data.selectOptions = []
        }
        
        if (defaultStr) {
          try {
            const parsed = JSON.parse(defaultStr)
            setSelectedItems(Array.isArray(parsed) ? parsed : [parsed])
          } catch {
            setSelectedItems(defaultStr ? [defaultStr] : [])
          }
        } else {
          setSelectedItems([])
        }
      } else {
        setSelectedItems([])
      }
      setError('')
    } catch (err) {
      console.error('[InputPrompt] 处理输入请求失败:', err)
      setError('加载输入框失败，请检查配置')
    }
  }, [])

  useEffect(() => {
    socketService.setInputPromptCallback(handlePromptRequest)
    return () => {
      socketService.setInputPromptCallback(null)
    }
  }, [handlePromptRequest])

  const validateInput = (): boolean => {
    if (!promptData) return false
    
    const { inputMode, required, minValue, maxValue, maxLength } = promptData
    const trimmedValue = inputValue.trim()
    
    // 必填检查
    if (required !== false && !trimmedValue) {
      setError('此项为必填')
      return false
    }
    
    // 文件/文件夹模式不需要额外验证
    if (inputMode === 'file' || inputMode === 'folder') {
      setError('')
      return true
    }
    
    // 数字模式验证
    if (inputMode === 'number' || inputMode === 'integer') {
      if (trimmedValue) {
        const num = Number(trimmedValue)
        if (isNaN(num)) {
          setError(inputMode === 'integer' ? '请输入有效的整数' : '请输入有效的数字')
          return false
        }
        if (inputMode === 'integer' && !Number.isInteger(num)) {
          setError('请输入整数，不能包含小数')
          return false
        }
        if (minValue != null && num < minValue) {
          setError(`数值不能小于 ${minValue}`)
          return false
        }
        if (maxValue != null && num > maxValue) {
          setError(`数值不能大于 ${maxValue}`)
          return false
        }
      }
      // 数字模式不检查字符长度
      setError('')
      return true
    }
    
    // 长度检查（仅对非数字模式）
    if (maxLength != null && maxLength > 0 && trimmedValue.length > maxLength) {
      setError(`长度不能超过 ${maxLength} 个字符`)
      return false
    }
    
    setError('')
    return true
  }

  // 选择文件
  const handleSelectFile = async () => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/system/select-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: promptData?.title || '选择文件' })
      })
      const result = await response.json()
      if (result.success && result.path) {
        setInputValue(result.path)
        setError('')
      }
    } catch (err) {
      console.error('选择文件失败:', err)
      setError('选择文件失败')
    }
  }

  // 选择文件夹
  const handleSelectFolder = async () => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/system/select-folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: promptData?.title || '选择文件夹' })
      })
      const result = await response.json()
      if (result.success && result.path) {
        setInputValue(result.path)
        setError('')
      }
    } catch (err) {
      console.error('选择文件夹失败:', err)
      setError('选择文件夹失败')
    }
  }

  const handleSubmit = () => {
    if (!validateInput()) return
    
    if (promptData) {
      let resultValue: string = inputValue
      
      // 复选框模式：返回布尔值的字符串表示
      if (promptData.inputMode === 'checkbox') {
        resultValue = checkboxValue ? 'true' : 'false'
      }
      // 滑动条模式：返回数字的字符串表示
      else if (promptData.inputMode === 'slider_int' || promptData.inputMode === 'slider_float') {
        resultValue = sliderValue.toString()
      }
      // 列表单选模式：返回选中的单个项
      else if (promptData.inputMode === 'select_single') {
        if (selectedItems.length === 0) {
          setError('请至少选择一项')
          return
        }
        resultValue = selectedItems[0]
      }
      // 列表多选模式：返回选中项的 JSON 数组
      else if (promptData.inputMode === 'select_multiple') {
        if (selectedItems.length === 0) {
          setError('请至少选择一项')
          return
        }
        resultValue = JSON.stringify(selectedItems)
      }
      // 数字模式转换
      else if ((promptData.inputMode === 'number' || promptData.inputMode === 'integer') && inputValue.trim()) {
        resultValue = inputValue.trim()
      }
      
      socketService.sendInputResult(promptData.requestId, resultValue)
      setPromptData(null)
      setInputValue('')
      setCheckboxValue(false)
      setSliderValue(0)
      setSelectedItems([])
      setError('')
    }
  }

  const handleCancel = () => {
    if (promptData) {
      socketService.sendInputResult(promptData.requestId, null)
      setPromptData(null)
      setInputValue('')
      setCheckboxValue(false)
      setSliderValue(0)
      setSelectedItems([])
      setError('')
    }
  }

  // ====== 弹窗注册：让 AI 能感知并自主操作此弹窗 ======
  useEffect(() => {
    if (!promptData) return
    const reg = useDialogRegistry.getState()
    const dialogId = `input_prompt_${promptData.requestId}`

    // 让 AI 用对应类型的参数提交
    const submitParam = (() => {
      const m = promptData.inputMode
      if (m === 'number' || m === 'integer' || m === 'slider_int' || m === 'slider_float') {
        return { type: 'number' as const, description: '要填入的数字', required: true }
      }
      if (m === 'checkbox') {
        return { type: 'boolean' as const, description: '勾选状态', required: true }
      }
      if (m === 'select_multiple') {
        return { type: 'array' as const, description: '选中项数组', required: true }
      }
      return { type: 'string' as const, description: '要填入的文本', required: true }
    })()

    reg.register({
      id: dialogId,
      type: 'input_prompt',
      title: promptData.title || '需要输入',
      message: promptData.message || '',
      context: {
        request_id: promptData.requestId,
        variable_name: promptData.variableName,
        input_mode: promptData.inputMode,
        default_value: promptData.defaultValue,
        min_value: promptData.minValue,
        max_value: promptData.maxValue,
        max_length: promptData.maxLength,
        required: promptData.required !== false,
        select_options: promptData.selectOptions,
      },
      actions: [
        {
          name: 'submit',
          label: '提交输入值',
          primary: true,
          params: { value: submitParam },
          handler: (params) => {
            const v = params?.value
            if (promptData.inputMode === 'checkbox') {
              socketService.sendInputResult(promptData.requestId, v ? 'true' : 'false')
            } else if (promptData.inputMode === 'select_multiple') {
              socketService.sendInputResult(
                promptData.requestId,
                JSON.stringify(Array.isArray(v) ? v : [v])
              )
            } else {
              socketService.sendInputResult(promptData.requestId, String(v ?? ''))
            }
            setPromptData(null)
            setInputValue('')
            setCheckboxValue(false)
            setSliderValue(0)
            setSelectedItems([])
            setError('')
          },
        },
        {
          name: 'cancel',
          label: '取消输入',
          handler: () => handleCancel(),
        },
      ],
    })

    return () => {
      reg.unregister(dialogId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptData?.requestId])

  if (!promptData) return null

  const { inputMode } = promptData
  const isListMode = inputMode === 'list'
  const isMultiline = inputMode === 'multiline' || isListMode
  const isNumber = inputMode === 'number' || inputMode === 'integer'
  const isPassword = inputMode === 'password'
  const isFilePicker = inputMode === 'file'
  const isFolderPicker = inputMode === 'folder'
  const isCheckbox = inputMode === 'checkbox'
  const isSlider = inputMode === 'slider_int' || inputMode === 'slider_float'
  const isSliderInt = inputMode === 'slider_int'
  const isSelectSingle = inputMode === 'select_single'
  const isSelectMultiple = inputMode === 'select_multiple'
  const isSelect = isSelectSingle || isSelectMultiple
  const lineCount = inputValue.split('\n').filter(line => line.trim()).length
  
  // 列表选择的切换函数
  const toggleSelectItem = (item: string) => {
    if (isSelectSingle) {
      setSelectedItems([item])
    } else if (isSelectMultiple) {
      setSelectedItems(prev => 
        prev.includes(item) 
          ? prev.filter(i => i !== item)
          : [...prev, item]
      )
    }
  }

  const getModeIcon = () => {
    switch (inputMode) {
      case 'list': return <List className="w-4 h-4 text-blue-500" />
      case 'number':
      case 'integer': return <Hash className="w-4 h-4 text-green-500" />
      case 'password': return <Lock className="w-4 h-4 text-orange-500" />
      case 'multiline': return <AlignLeft className="w-4 h-4 text-purple-500" />
      case 'file': return <File className="w-4 h-4 text-cyan-500" />
      case 'folder': return <Folder className="w-4 h-4 text-yellow-500" />
      case 'checkbox': return <CheckSquare className="w-4 h-4 text-indigo-500" />
      case 'slider_int':
      case 'slider_float': return <SlidersHorizontal className="w-4 h-4 text-pink-500" />
      case 'select_single':
      case 'select_multiple': return <ListChecks className="w-4 h-4 text-teal-500" />
      default: return <Type className="w-4 h-4 text-gray-500" />
    }
  }

  const getModeLabel = () => {
    switch (inputMode) {
      case 'list': return '列表输入'
      case 'number': return '数字输入'
      case 'integer': return '整数输入'
      case 'password': return '密码输入'
      case 'multiline': return '多行输入'
      case 'file': return '文件选择'
      case 'folder': return '文件夹选择'
      case 'checkbox': return '复选框'
      case 'slider_int': return '滑动条（整数）'
      case 'slider_float': return '滑动条（小数）'
      case 'select_single': return '列表单选'
      case 'select_multiple': return '列表多选'
      default: return '文本输入'
    }
  }

  return (
    <DialogPortal>
    <div className="fixed inset-0 bg-[hsl(217_45%_15%_/_0.55)] backdrop-blur-[3px] flex items-center justify-center p-4 animate-fade-in" style={{ zIndex: 2147483646 }}>
      <div className="modern-dialog w-full max-w-md p-0 animate-scale-in-bounce">
        <div className="modern-dialog-header">
          <div className="modern-dialog-header-icon">
            {getModeIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="modern-dialog-title">{promptData.title || '需要你输入'}</h3>
            <div className="modern-dialog-subtitle flex items-center gap-2">
              <span className="badge badge-brand">{getModeLabel()}</span>
              {promptData.variableName && (
                <span className="text-[11px] text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                  →
                  <code className="variable-tag">{promptData.variableName}</code>
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="p-1.5 rounded-[7px] text-[hsl(var(--slate-500))] hover:bg-[hsl(var(--danger-50))] hover:text-[hsl(var(--danger-600))] hover:border-[hsl(var(--danger-500)/0.3)] border border-transparent transition-all duration-150 active:scale-90"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="space-y-2">
            <Label className="text-[hsl(var(--slate-800))] text-[13px]">{promptData.message || '请输入值:'}</Label>
            {isSelect ? (
              <>
                <div className="space-y-1.5 p-2 bg-[hsl(var(--slate-50))] rounded-[10px] border border-[hsl(var(--border))] max-h-80 overflow-y-auto">
                  {promptData.selectOptions && promptData.selectOptions.length > 0 ? (
                    promptData.selectOptions.map((option, index) => {
                      const isSelected = selectedItems.includes(option)
                      return (
                        <div
                          key={index}
                          onClick={() => toggleSelectItem(option)}
                          className={`
                            flex items-center gap-3 p-2.5 rounded-[8px] border-[1.5px] cursor-pointer transition-all duration-200 ease-[cubic-bezier(0.25,1,0.5,1)]
                            ${isSelected
                              ? 'border-[hsl(var(--brand-500))] bg-[hsl(var(--brand-50))] shadow-soft'
                              : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--brand-500)/0.4)] hover:bg-[hsl(var(--brand-50)/0.6)] hover:translate-x-1'
                            }
                          `}
                        >
                          <div className={`
                            flex-shrink-0 w-5 h-5 rounded-[5px] border-[1.5px] flex items-center justify-center transition-all duration-200
                            ${isSelected
                              ? 'border-[hsl(var(--brand-500))] bg-[hsl(var(--brand-500))] shadow-brand-glow'
                              : 'border-[hsl(var(--slate-300))] bg-[hsl(var(--card))]'
                            }
                          `}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white animate-scale-in" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className={`flex-1 text-[13px] ${isSelected ? 'text-[hsl(var(--brand-800))] font-semibold' : 'text-[hsl(var(--slate-700))]'}`}>
                            {option}
                          </span>
                          {isSelectMultiple && isSelected && (
                            <span className="badge badge-brand !py-0.5">
                              #{selectedItems.indexOf(option) + 1}
                            </span>
                          )}
                        </div>
                      )
                    })
                  ) : (
                    <div className="empty-state !py-6">
                      <div className="empty-state-icon !w-12 !h-12">
                        <ListChecks className="w-6 h-6" />
                      </div>
                      <div className="empty-state-title !text-[13px]">没有可选项</div>
                    </div>
                  )}
                </div>
                <div className="status-row status-row-info !py-2">
                  {isSelectSingle ? (
                    <span className="text-[12px]">
                      已选择：
                      <code className="ml-1 px-1.5 py-0.5 rounded bg-[hsl(var(--card))] border border-[hsl(var(--info-500)/0.3)] text-[hsl(var(--info-700))] font-mono">
                        {selectedItems.length > 0 ? selectedItems[0] : '无'}
                      </code>
                    </span>
                  ) : (
                    <span className="text-[12px]">
                      已选择
                      <code className="mx-1 px-1.5 py-0.5 rounded bg-[hsl(var(--brand-100))] text-[hsl(var(--brand-700))] font-mono font-bold">
                        {selectedItems.length}
                      </code>
                      项
                    </span>
                  )}
                </div>
              </>
            ) : isSlider ? (
              <>
                <div className="space-y-3 p-4 bg-gradient-to-br from-[hsl(var(--brand-50)/0.6)] to-[hsl(var(--card))] rounded-[10px] border border-[hsl(var(--border))]">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-[hsl(var(--muted-foreground))] font-mono">
                      {promptData.minValue ?? 0}
                    </span>
                    <span className="text-[28px] font-bold text-gradient tabular-nums">
                      {isSliderInt ? Math.round(sliderValue) : sliderValue.toFixed(2)}
                    </span>
                    <span className="text-[12px] text-[hsl(var(--muted-foreground))] font-mono">
                      {promptData.maxValue ?? 100}
                    </span>
                  </div>
                  <div className="relative py-1.5">
                    <Slider
                      min={promptData.minValue ?? 0}
                      max={promptData.maxValue ?? 100}
                      step={isSliderInt ? 1 : 0.01}
                      value={[sliderValue]}
                      onValueChange={(vals) => setSliderValue(vals[0])}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[hsl(var(--muted-foreground))]">
                    <span>拖动滑块选择数值</span>
                    <span className="badge badge-default">
                      {isSliderInt ? '整数' : '精度 0.01'}
                    </span>
                  </div>
                </div>
                <div className="status-row status-row-info !py-2">
                  <span className="text-[12px]">
                    将设置：
                    <code className="ml-1 px-1.5 py-0.5 rounded variable-tag !text-[11px]">{promptData.variableName}</code>
                    <span className="mx-1.5 text-[hsl(var(--muted-foreground))]">=</span>
                    <code className="px-1.5 py-0.5 rounded bg-[hsl(var(--brand-100))] text-[hsl(var(--brand-700))] font-mono font-bold">
                      {isSliderInt ? Math.round(sliderValue) : sliderValue.toFixed(2)}
                    </code>
                  </span>
                </div>
              </>
            ) : isCheckbox ? (
              <>
                <label
                  htmlFor="checkbox-input"
                  className={`flex items-center gap-3 p-3.5 rounded-[10px] border-[1.5px] cursor-pointer transition-all duration-200 ${
                    checkboxValue
                      ? 'border-[hsl(var(--success-500))] bg-[hsl(var(--success-50))] shadow-success-glow'
                      : 'border-[hsl(var(--border))] bg-[hsl(var(--slate-50))] hover:border-[hsl(var(--brand-500)/0.4)] hover:bg-[hsl(var(--brand-50)/0.4)]'
                  }`}
                >
                  <Checkbox
                    id="checkbox-input"
                    checked={checkboxValue}
                    onCheckedChange={(c) => setCheckboxValue(c)}
                    className="h-5 w-5"
                  />
                  <span className="text-[hsl(var(--slate-800))] cursor-pointer select-none flex-1 text-[13px]">
                    {promptData.message || '请选择'}
                  </span>
                  <span className={`badge ${checkboxValue ? 'badge-success' : 'badge-default'}`}>
                    {checkboxValue ? '已选中' : '未选中'}
                  </span>
                </label>
                <div className="status-row status-row-info !py-2 text-[12px]">
                  将设置：
                  <code className="ml-1 variable-tag">{promptData.variableName}</code>
                  <span className="mx-1.5 text-[hsl(var(--muted-foreground))]">=</span>
                  <code className={`px-1.5 py-0.5 rounded font-mono font-bold ${checkboxValue ? 'bg-[hsl(var(--success-100))] text-[hsl(var(--success-700))]' : 'bg-[hsl(var(--slate-100))] text-[hsl(var(--slate-700))]'}`}>
                    {checkboxValue ? 'true' : 'false'}
                  </code>
                </div>
              </>
            ) : isFilePicker || isFolderPicker ? (
              <>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={inputValue}
                    onChange={(e) => { setInputValue(e.target.value); setError('') }}
                    placeholder={isFilePicker ? "选择或输入文件路径..." : "选择或输入文件夹路径..."}
                    className={`flex-1 ${error ? '!border-[hsl(var(--danger-500))] !ring-[hsl(var(--danger-500)/0.18)]' : ''}`}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSubmit()
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="tonal"
                    className="shrink-0"
                    onClick={isFilePicker ? handleSelectFile : handleSelectFolder}
                  >
                    {isFilePicker ? <File className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
                    浏览
                  </Button>
                </div>
                <div className="status-row status-row-info !py-2 text-[12px]">
                  <span>
                    将设置：
                    <code className="ml-1 variable-tag">{promptData.variableName}</code>
                    <span className="ml-2 text-[hsl(var(--muted-foreground))]">
                      {isFilePicker ? '点击「浏览」选择文件，或直接输入路径' : '点击「浏览」选择文件夹，或直接输入路径'}
                    </span>
                  </span>
                </div>
              </>
            ) : isMultiline ? (
              <>
                <textarea
                  value={inputValue}
                  onChange={(e) => { setInputValue(e.target.value); setError('') }}
                  placeholder={isListMode ? "每行输入一个值..." : "请输入内容..."}
                  className={`w-full h-40 px-3 py-2.5 text-[13px] bg-[hsl(var(--slate-50))] text-[hsl(var(--foreground))] border-[1.5px] rounded-[8px] resize-none focus:outline-none focus:bg-[hsl(var(--card))] focus:border-[hsl(var(--brand-500))] focus:ring-2 focus:ring-[hsl(var(--brand-500)/0.18)] transition-all duration-150 leading-relaxed ${error ? 'border-[hsl(var(--danger-500))]' : 'border-[hsl(var(--border))]'}`}
                  autoFocus
                />
                {isListMode && (
                  <div className="status-row status-row-info !py-2 text-[12px]">
                    每行一个值，当前
                    <code className="mx-1 px-1.5 py-0.5 rounded bg-[hsl(var(--brand-100))] text-[hsl(var(--brand-700))] font-mono font-bold">{lineCount}</code>
                    项 → <code className="variable-tag">{promptData.variableName}</code>
                  </div>
                )}
              </>
            ) : (
              <>
                <Input
                  type={isPassword ? 'password' : isNumber ? 'number' : 'text'}
                  value={inputValue}
                  onChange={(e) => { setInputValue(e.target.value); setError('') }}
                  placeholder={isNumber ? "请输入数字..." : "请输入..."}
                  className={error ? '!border-[hsl(var(--danger-500))] !ring-[hsl(var(--danger-500)/0.18)]' : ''}
                  autoFocus
                  step={inputMode === 'integer' ? '1' : 'any'}
                  min={promptData.minValue}
                  max={promptData.maxValue}
                  maxLength={promptData.maxLength}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSubmit()
                    }
                  }}
                />
                <div className="flex items-center gap-2 text-[11.5px] text-[hsl(var(--muted-foreground))]">
                  将设置：<code className="variable-tag">{promptData.variableName}</code>
                  {isNumber && promptData.minValue !== undefined && promptData.maxValue !== undefined && (
                    <span className="badge badge-default">
                      范围 {promptData.minValue} ~ {promptData.maxValue}
                    </span>
                  )}
                </div>
              </>
            )}
            {error && (
              <div className="status-row status-row-danger animate-fade-in-up !py-2 text-[12px]">
                {error}
              </div>
            )}
          </div>
        </div>
        <div className="dialog-footer-bar">
          <Button variant="secondary" size="sm" onClick={handleCancel}>
            取消
          </Button>
          <Button variant="success" size="sm" onClick={handleSubmit}>
            确定
          </Button>
        </div>
      </div>
    </div>
    </DialogPortal>
  )
}
