/**
 * 创建/编辑自定义模块对话框
 */
import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SelectNative as Select } from '@/components/ui/select-native'
import { Checkbox } from '@/components/ui/checkbox'
import { ColorPicker } from '@/components/ui/color-picker'
import { useWorkflowStore } from '@/store/workflowStore'
import { useCustomModuleStore } from '@/store/customModuleStore'
import { Plus, Trash2, AlertCircle } from 'lucide-react'
import type { CustomModule, CustomModuleParameter, CustomModuleOutput } from '@/types/customModule'

interface CreateCustomModuleDialogProps {
  open: boolean
  onClose: () => void
  /**
   * 编辑模式：传入要编辑的模块。
   * - 不传 = 创建模式（使用当前画布工作流作为内部实现）
   * - 传入 = 编辑模式（仅修改元信息/参数/输出，不改 workflow 内部节点；使用画布则需用户先在画布上重做后再次保存）
   */
  editingModule?: CustomModule | null
}

export function CreateCustomModuleDialog({ open, onClose, editingModule }: CreateCustomModuleDialogProps) {
  const { nodes, edges } = useWorkflowStore()
  const { createModule, updateModule } = useCustomModuleStore()
  
  const isEdit = Boolean(editingModule)
  
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('')
  const [color, setColor] = useState('#8B5CF6')
  const [category, setCategory] = useState('自定义')
  const [tags, setTags] = useState('')
  const [parameters, setParameters] = useState<CustomModuleParameter[]>([])
  const [outputs, setOutputs] = useState<CustomModuleOutput[]>([])
  const [error, setError] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [reuseCanvas, setReuseCanvas] = useState(false)
  
  // 初始化（编辑模式 / 打开时）
  useEffect(() => {
    if (!open) return
    if (editingModule) {
      setName(editingModule.name || '')
      setDisplayName(editingModule.display_name || '')
      setDescription(editingModule.description || '')
      setIcon(editingModule.icon || '')
      setColor(editingModule.color || '#8B5CF6')
      setCategory(editingModule.category || '自定义')
      setTags((editingModule.tags || []).join(', '))
      setParameters(editingModule.parameters || [])
      setOutputs(editingModule.outputs || [])
      setError('')
      setReuseCanvas(false)
    } else {
      // 创建模式：清空
      setName('')
      setDisplayName('')
      setDescription('')
      setIcon('')
      setColor('#8B5CF6')
      setCategory('自定义')
      setTags('')
      setParameters([])
      setOutputs([])
      setError('')
      setReuseCanvas(false)
    }
  }, [open, editingModule])
  
  // 添加参数
  const addParameter = () => {
    setParameters([...parameters, {
      name: `param${parameters.length + 1}`,
      label: `参数${parameters.length + 1}`,
      type: 'string',
      default_value: '',
      required: false,
      placeholder: '',
      description: '',
      options: []
    }])
  }
  
  // 删除参数
  const removeParameter = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index))
  }
  
  // 更新参数
  const updateParameter = (index: number, field: string, value: any) => {
    const newParams = [...parameters]
    newParams[index] = { ...newParams[index], [field]: value }
    setParameters(newParams)
  }
  
  // 添加输出
  const addOutput = () => {
    setOutputs([...outputs, {
      name: `output${outputs.length + 1}`,
      label: `输出${outputs.length + 1}`,
      description: ''
    }])
  }
  
  // 删除输出
  const removeOutput = (index: number) => {
    setOutputs(outputs.filter((_, i) => i !== index))
  }
  
  // 更新输出
  const updateOutput = (index: number, field: string, value: any) => {
    const newOutputs = [...outputs]
    newOutputs[index] = { ...newOutputs[index], [field]: value }
    setOutputs(newOutputs)
  }
  
  // 创建/更新模块
  const handleCreate = async () => {
    // 验证
    if (!name.trim()) {
      setError('请输入模块名称（英文标识符）')
      return
    }
    
    if (!displayName.trim()) {
      setError('请输入显示名称')
      return
    }
    
    // 创建模式必须有画布；编辑模式仅在勾选「使用当前画布工作流替换内部实现」时才校验
    if (!isEdit && nodes.length === 0) {
      setError('当前工作流为空，无法创建模块')
      return
    }
    if (isEdit && reuseCanvas && nodes.length === 0) {
      setError('当前工作流为空，无法用画布替换该模块的内部实现')
      return
    }
    
    // 验证模块名称格式（只允许字母、数字、下划线）
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      setError('模块名称只能包含字母、数字和下划线，且不能以数字开头')
      return
    }
    
    setIsCreating(true)
    setError('')
    
    try {
      // 准备 workflow（仅在创建或编辑时勾选 reuseCanvas 才用画布数据）
      let workflowField: { nodes: any[]; edges: any[] } | undefined
      if (!isEdit || reuseCanvas) {
        const validatedNodes = nodes.map(n => {
          // 如果type是moduleNode，使用data.moduleType作为真正的类型
          const actualType = n.type === 'moduleNode' ? (n.data?.moduleType || 'unknown') : n.type
          return {
            id: n.id,
            type: actualType,
            position: n.position || { x: 0, y: 0 },
            data: n.data || {}
          }
        })
        const validatedEdges = edges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle || null,
          targetHandle: e.targetHandle || null
        }))
        workflowField = { nodes: validatedNodes, edges: validatedEdges }
      }
      
      const baseData: any = {
        name: name.trim(),
        display_name: displayName.trim(),
        description: description.trim(),
        icon,
        color,
        category,
        parameters: parameters.map(p => ({
          name: p.name,
          label: p.label,
          type: p.type,
          default_value: p.default_value || '',
          required: p.required || false,
          placeholder: p.placeholder || '',
          description: p.description || '',
          options: p.options || []
        })),
        outputs: outputs.map(o => ({
          name: o.name,
          label: o.label,
          description: o.description || ''
        })),
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      }
      if (workflowField) baseData.workflow = workflowField
      
      console.log(`[CustomModuleDialog] ${isEdit ? '更新' : '创建'}模块:`, baseData)
      
      const result = isEdit
        ? await updateModule(editingModule!.id, baseData)
        : await createModule({ ...baseData, workflow: workflowField })
      
      if (result) {
        console.log('[CustomModuleDialog] 操作成功:', result)
        onClose()
      } else {
        console.error('[CustomModuleDialog] 操作失败，无返回结果')
        setError(isEdit ? '更新失败，请重试' : '创建失败，请重试')
      }
    } catch (err) {
      console.error('[CustomModuleDialog] 异常:', err)
      setError(String(err))
    } finally {
      setIsCreating(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `编辑模块：${editingModule?.display_name || editingModule?.name}` : '创建自定义模块'}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* 基本信息 */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">基本信息</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">模块名称（英文标识符）*</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="my_custom_module"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="displayName">显示名称*</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="我的自定义模块"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">模块描述</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="描述这个模块的功能..."
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="icon">图标</Label>
                <Input
                  id="icon"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder=""
                  maxLength={2}
                />
              </div>
              
              <ColorPicker
                label="模块颜色"
                value={color}
                onChange={setColor}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">分类</Label>
                <Select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="自定义">自定义</option>
                  <option value="自动化">自动化</option>
                  <option value="数据处理">数据处理</option>
                  <option value="AI">AI</option>
                  <option value="工具">工具</option>
                  <option value="网页操作">网页操作</option>
                  <option value="文件操作">文件操作</option>
                  <option value="数据库">数据库</option>
                  <option value="API">API</option>
                  <option value="邮件">邮件</option>
                  <option value="通知">通知</option>
                  <option value="图像处理">图像处理</option>
                  <option value="文本处理">文本处理</option>
                  <option value="Excel">Excel</option>
                  <option value="PDF">PDF</option>
                  <option value="爬虫">爬虫</option>
                  <option value="测试">测试</option>
                  <option value="监控">监控</option>
                  <option value="定时任务">定时任务</option>
                  <option value="流程控制">流程控制</option>
                  <option value="系统操作">系统操作</option>
                  <option value="网络">网络</option>
                  <option value="安全">安全</option>
                  <option value="其他">其他</option>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tags">标签（逗号分隔）</Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="标签1, 标签2"
                />
              </div>
            </div>
          </div>
          
          {/* 输入参数 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">输入参数</h3>
              <Button
                type="button"
                variant="tonal-success"
                size="sm"
                onClick={addParameter}
              >
                <Plus className="w-4 h-4 mr-1" />
                添加参数
              </Button>
            </div>
            
            {parameters.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无参数</p>
            ) : (
              <div className="space-y-3">
                {parameters.map((param, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">参数 {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeParameter(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">参数名</Label>
                        <Input
                          value={param.name}
                          onChange={(e) => updateParameter(index, 'name', e.target.value)}
                          placeholder="paramName"
                          className="h-8 text-sm"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-xs">显示标签</Label>
                        <Input
                          value={param.label}
                          onChange={(e) => updateParameter(index, 'label', e.target.value)}
                          placeholder="参数标签"
                          className="h-8 text-sm"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-xs">类型</Label>
                        <Select
                          value={param.type}
                          onChange={(e) => updateParameter(index, 'type', e.target.value)}
                          className="h-8 text-sm"
                        >
                          <option value="string">文本</option>
                          <option value="number">数字</option>
                          <option value="boolean">布尔</option>
                          <option value="select">下拉选择</option>
                          <option value="textarea">多行文本</option>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">默认值</Label>
                        <Input
                          value={param.default_value}
                          onChange={(e) => updateParameter(index, 'default_value', e.target.value)}
                          placeholder="默认值"
                          className="h-8 text-sm"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-xs">占位符</Label>
                        <Input
                          value={param.placeholder}
                          onChange={(e) => updateParameter(index, 'placeholder', e.target.value)}
                          placeholder="占位符文本"
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">说明</Label>
                      <Input
                        value={param.description}
                        onChange={(e) => updateParameter(index, 'description', e.target.value)}
                        placeholder="参数说明"
                        className="h-8 text-sm"
                      />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={param.required}
                        onCheckedChange={(c) => updateParameter(index, 'required', c)}
                        className="h-3.5 w-3.5"
                      />
                      <Label className="text-xs">必填</Label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* 输出变量 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">输出变量</h3>
              <Button
                type="button"
                variant="tonal-success"
                size="sm"
                onClick={addOutput}
              >
                <Plus className="w-4 h-4 mr-1" />
                添加输出
              </Button>
            </div>
            
            {outputs.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无输出</p>
            ) : (
              <div className="space-y-3">
                {outputs.map((output, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">输出 {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOutput(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">变量名</Label>
                        <Input
                          value={output.name}
                          onChange={(e) => updateOutput(index, 'name', e.target.value)}
                          placeholder="outputName"
                          className="h-8 text-sm"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-xs">显示标签</Label>
                        <Input
                          value={output.label}
                          onChange={(e) => updateOutput(index, 'label', e.target.value)}
                          placeholder="输出标签"
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">说明</Label>
                      <Input
                        value={output.description}
                        onChange={(e) => updateOutput(index, 'description', e.target.value)}
                        placeholder="输出说明"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* 工作流信息 */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">工作流信息</h3>
            <div className="bg-muted p-3 rounded-lg text-sm space-y-2">
              {isEdit ? (
                <>
                  <p>
                    当前模块内部包含 <span className="font-medium">{editingModule?.workflow?.nodes?.length ?? 0}</span> 个节点
                  </p>
                  <p>当前画布包含 <span className="font-medium">{nodes.length}</span> 个节点</p>
                  <label className="flex items-start gap-2 text-xs cursor-pointer pt-1">
                    <Checkbox
                      checked={reuseCanvas}
                      onCheckedChange={(c) => setReuseCanvas(c)}
                      className="mt-0.5 h-3.5 w-3.5"
                    />
                    <span>
                      <span className="font-medium">用当前画布工作流替换该模块的内部实现</span>
                      <span className="block text-muted-foreground mt-0.5">
                        勾选后保存时会用画布上的节点重写模块的内部工作流；不勾选则只更新元信息/参数/输出。
                      </span>
                    </span>
                  </label>
                </>
              ) : (
                <>
                  <p>当前工作流包含 <span className="font-medium">{nodes.length}</span> 个节点</p>
                  <p className="text-xs text-muted-foreground">
                    这些节点将作为自定义模块的内部实现
                  </p>
                </>
              )}
            </div>
            
            {/* 参数使用说明 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
              <h4 className="text-sm font-medium text-blue-900">参数使用说明</h4>
              <div className="text-xs text-blue-800 space-y-1">
                <p><strong>1. 如何在工作流中使用输入参数？</strong></p>
                <p className="ml-3">在工作流的任何模块中，使用 <code className="bg-blue-100 px-1 rounded">{'{{参数名}}'}</code> 来引用输入参数</p>
                <p className="ml-3">例如：如果定义了参数 <code className="bg-blue-100 px-1 rounded">name</code>，在日志模块中可以写 <code className="bg-blue-100 px-1 rounded">{'Hello {{name}}!'}</code></p>
                
                <p className="mt-2"><strong>2. 如何返回输出值？</strong></p>
                <p className="ml-3">在工作流中使用"设置变量"模块，将结果保存到与输出变量同名的变量中</p>
                <p className="ml-3">例如：如果定义了输出 <code className="bg-blue-100 px-1 rounded">result</code>，在工作流中创建一个名为 <code className="bg-blue-100 px-1 rounded">result</code> 的变量</p>
                <p className="ml-3">模块执行完成后，这个变量的值会自动返回给调用者</p>
                
                <p className="mt-2"><strong>3. 示例</strong></p>
                <p className="ml-3">输入参数：<code className="bg-blue-100 px-1 rounded">text</code></p>
                <p className="ml-3">输出变量：<code className="bg-blue-100 px-1 rounded">upper_text</code></p>
                <p className="ml-3">工作流：使用"字符串大小写"模块将 <code className="bg-blue-100 px-1 rounded">{'{{text}}'}</code> 转为大写，保存到 <code className="bg-blue-100 px-1 rounded">upper_text</code> 变量</p>
              </div>
            </div>
          </div>
          
          {/* 错误提示 */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isCreating}
          >
            取消
          </Button>
          <Button
            variant="success"
            onClick={handleCreate}
            disabled={isCreating}
          >
            {isCreating ? (isEdit ? '保存中...' : '创建中...') : (isEdit ? '保存修改' : '创建模块')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
