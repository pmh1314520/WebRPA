import type React from 'react'
import { useCallback, useState, lazy, Suspense } from 'react'
import type { Node, Edge } from '@xyflow/react'
import type { NodeData } from '@/store/workflowStore'
import type { ModuleType } from '@/types/workflow'
import { useWorkflowStore } from '@/store/workflowStore'
import { Label } from '@/components/ui/label'
import { NumberInput } from '@/components/ui/number-input'
import { SelectNative as Select } from '@/components/ui/select-native'
import { VariableInput } from '@/components/ui/variable-input'
import { VariableNameInput } from '@/components/ui/variable-name-input'
import { UrlInput } from '@/components/ui/url-input'
import { PathInput } from '@/components/ui/path-input'
import { DualCoordinateInput } from '@/components/ui/dual-coordinate-input'
import { Checkbox } from '@/components/ui/checkbox'
import { ImagePathInput } from '@/components/ui/image-path-input'
import { Code, Upload } from 'lucide-react'
// 代码编辑器弹窗按需懒加载：Monaco Editor 体积大且在生产构建(极速启动/preview)下
// 若在启动时就同步加载其分包，曾出现 "Cannot read properties of undefined (reading 'create')"
// 导致整页白屏。改为仅在用户真正打开代码编辑器时才加载 Monaco，彻底避开启动期初始化顺序问题。
const JsEditorDialog = lazy(() => import('../JsEditorDialog').then((m) => ({ default: m.JsEditorDialog })))
const InjectJsEditorDialog = lazy(() => import('../InjectJsEditorDialog').then((m) => ({ default: m.InjectJsEditorDialog })))
const PythonEditorDialog = lazy(() => import('../PythonEditorDialog').then((m) => ({ default: m.PythonEditorDialog })))

type RenderSelectorInput = (id: string, label: string, placeholder: string) => React.ReactNode

// 打开网页配置
export function OpenPageConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="url">网址</Label>
        <UrlInput
          value={(data.url as string) || ''}
          onChange={(v) => onChange('url', v)}
          placeholder="https://example.com"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="openMode">打开方式</Label>
        <Select
          id="openMode"
          value={(data.openMode as string) || 'new_tab'}
          onChange={(e) => onChange('openMode', e.target.value)}
        >
          <option value="new_tab">新标签页</option>
          <option value="current_tab">当前标签页</option>
        </Select>
        <p className="text-xs text-muted-foreground">
          {(data.openMode as string) === 'current_tab' 
            ? '在当前标签页打开，会关闭当前页面'
            : '在新标签页打开，保留当前页面'}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="waitUntil">等待条件</Label>
        <Select
          id="waitUntil"
          value={(data.waitUntil as string) || 'load'}
          onChange={(e) => onChange('waitUntil', e.target.value)}
        >
          <option value="load">页面加载完成</option>
          <option value="domcontentloaded">DOM加载完成</option>
          <option value="networkidle">网络空闲</option>
        </Select>
      </div>
    </>
  )
}

// 操作已打开的网页配置
export function UseOpenedPageConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="pageIdentifier">页面标识</Label>
        <VariableInput
          id="pageIdentifier"
          value={(data.pageIdentifier as string) || ''}
          onChange={(v) => onChange('pageIdentifier', v)}
          placeholder="页面标题或URL的部分内容"
        />
        <p className="text-xs text-muted-foreground">
          用于识别要操作的已打开页面，支持模糊匹配
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="matchMode">匹配模式</Label>
        <Select
          id="matchMode"
          value={(data.matchMode as string) || 'title'}
          onChange={(e) => onChange('matchMode', e.target.value)}
        >
          <option value="title">按标题匹配</option>
          <option value="url">按URL匹配</option>
        </Select>
      </div>
    </div>
  )
}

// 点击元素配置
export function ClickElementConfig({ 
  data, 
  onChange, 
  renderSelectorInput 
}: { 
  data: NodeData
  onChange: (key: string, value: unknown) => void
  renderSelectorInput: RenderSelectorInput
}) {
  
  return (
    <>
      {renderSelectorInput('selector', '元素选择器', '例如: #button, .submit')}
      <div className="space-y-2">
        <Label htmlFor="clickType">点击类型</Label>
        <Select
          id="clickType"
          value={(data.clickType as string) || 'single'}
          onChange={(e) => onChange('clickType', e.target.value)}
        >
          <option value="single">单击</option>
          <option value="double">双击</option>
          <option value="right">右键</option>
        </Select>
      </div>
    </>
  )
}

// 悬停元素配置
export function HoverElementConfig({ 
  data, 
  onChange, 
  renderSelectorInput 
}: { 
  data: NodeData
  onChange: (key: string, value: unknown) => void
  renderSelectorInput: RenderSelectorInput
}) {
  
  return (
    <>
      {renderSelectorInput('selector', '元素选择器', '例如: #element, .hover-target')}
      <div className="space-y-2">
        <Label htmlFor="hoverDuration">悬停时长(秒)</Label>
        <NumberInput
          id="hoverDuration"
          value={(data.hoverDuration as number) ?? 0.5}
          onChange={(v) => onChange('hoverDuration', v)}
          defaultValue={0.5}
          min={0}
          max={10}
          step={0.1}
        />
        <p className="text-xs text-muted-foreground">鼠标悬停在元素上的时长，单位秒</p>
      </div>
    </>
  )
}

// 输入文本配置
export function InputTextConfig({ 
  data, 
  onChange, 
  renderSelectorInput 
}: { 
  data: NodeData
  onChange: (key: string, value: unknown) => void
  renderSelectorInput: RenderSelectorInput
}) {
  
  return (
    <>
      {renderSelectorInput('selector', '元素选择器', '例如: #input, .text-field')}
      <div className="space-y-2">
        <Label htmlFor="text">输入文本</Label>
        <VariableInput
          value={(data.text as string) || ''}
          onChange={(v) => onChange('text', v)}
          placeholder="要输入的文本内容"
        />
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="clearBefore"
          checked={(data.clearBefore as boolean) ?? true}
          onChange={(e) => onChange('clearBefore', e.target.checked)}
          className="rounded border-gray-300"
        />
        <Label htmlFor="clearBefore" className="cursor-pointer">
          输入前清空原有内容
        </Label>
      </div>
    </>
  )
}

// 获取元素信息配置
export function GetElementInfoConfig({ 
  data, 
  onChange, 
  renderSelectorInput 
}: { 
  data: NodeData
  onChange: (key: string, value: unknown) => void
  renderSelectorInput: RenderSelectorInput
}) {
  
  return (
    <>
      {renderSelectorInput('selector', '元素选择器', '例如: #title, .content')}
      <div className="space-y-2">
        <Label htmlFor="attribute">获取属性</Label>
        <Select
          id="attribute"
          value={(data.attribute as string) || 'text'}
          onChange={(e) => onChange('attribute', e.target.value)}
        >
          <option value="text">文本内容</option>
          <option value="innerHTML">HTML内容</option>
          <option value="value">输入框值</option>
          <option value="href">链接地址</option>
          <option value="src">图片地址</option>
          <option value="attributes">元素属性值（字典）</option>
        </Select>
        <p className="text-xs text-muted-foreground">
          选择"元素属性值"将返回包含所有HTML属性的字典对象
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="variableName">存储到变量</Label>
        <VariableNameInput
          id="variableName"
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="变量名"
          isStorageVariable={true}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="columnName">存储到数据表列</Label>
        <VariableInput
          value={(data.columnName as string) || ''}
          onChange={(v) => onChange('columnName', v)}
          placeholder="列名(可选)"
        />
      </div>
    </>
  )
}

// 等待配置
export function WaitConfig({ 
  data, 
  onChange, 
  renderSelectorInput 
}: { 
  data: NodeData
  onChange: (key: string, value: unknown) => void
  renderSelectorInput: RenderSelectorInput
}) {
  
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="waitType">等待类型</Label>
        <Select
          id="waitType"
          value={(data.waitType as string) || 'time'}
          onChange={(e) => onChange('waitType', e.target.value)}
        >
          <option value="time">等待时间</option>
          <option value="selector">等待元素</option>
          <option value="navigation">等待导航</option>
        </Select>
      </div>
      {(data.waitType as string) === 'time' || !data.waitType ? (
        <div className="space-y-2">
          <Label htmlFor="duration">等待时长(秒)</Label>
          <VariableInput
            value={String(data.duration ?? '')}
            onChange={(v) => {
              if (v === '' || v.includes('{')) {
                onChange('duration', v)
              } else {
                const num = parseFloat(v)
                onChange('duration', isNaN(num) ? v : num)
              }
            }}
            placeholder="例如: 1 或 2.5"
          />
        </div>
      ) : (data.waitType as string) === 'selector' ? (
        renderSelectorInput('selector', '元素选择器', '例如: #element, .class')
      ) : null}
    </>
  )
}

// 等待元素配置
export function WaitElementConfig({ 
  data, 
  onChange, 
  renderSelectorInput 
}: { 
  data: NodeData
  onChange: (key: string, value: unknown) => void
  renderSelectorInput: RenderSelectorInput
}) {
  
  return (
    <>
      {renderSelectorInput('selector', '元素选择器', '例如: #element, .class')}
      <div className="space-y-2">
        <Label htmlFor="waitCondition">等待条件</Label>
        <Select
          id="waitCondition"
          value={(data.waitCondition as string) || 'visible'}
          onChange={(e) => onChange('waitCondition', e.target.value)}
        >
          <option value="visible">可见</option>
          <option value="hidden">隐藏</option>
          <option value="attached">已附加</option>
          <option value="detached">已分离</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="waitTimeout">超时时间(秒)</Label>
        <NumberInput
          id="waitTimeout"
          value={(data.waitTimeout as number) ?? 60}
          onChange={(v) => onChange('waitTimeout', v)}
          defaultValue={60}
          min={0}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        等待元素满足指定条件，超时后会抛出错误
      </p>
    </>
  )
}

// 等待图像配置
export function WaitImageConfig({ 
  data, 
  onChange 
}: { 
  data: NodeData
  onChange: (key: string, value: unknown) => void
}) {
  const [useSearchRegion, setUseSearchRegion] = useState(
    !!(data.searchRegion && ((data.searchRegion as Record<string, number>).x2 > 0 || (data.searchRegion as Record<string, number>).y2 > 0))
  )
  
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="imagePath">图片路径</Label>
        <ImagePathInput
          value={(data.imagePath as string) || ''}
          onChange={(v) => onChange('imagePath', v)}
        />
        <p className="text-xs text-muted-foreground">
          从图像资源中选择要查找的目标图片
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confidence">匹配度</Label>
        <div className="flex items-center gap-2">
          <input
            id="confidence"
            type="range"
            min="0.5"
            max="1"
            step="0.05"
            value={(data.confidence as number) || 0.8}
            onChange={(e) => onChange('confidence', parseFloat(e.target.value))}
            className="flex-1"
          />
          <span className="text-sm w-12 text-right">{((data.confidence as number) || 0.8) * 100}%</span>
        </div>
        <p className="text-xs text-muted-foreground">
          '图片匹配的相似度阈值，越高越精确'
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="waitTimeout">超时时间(秒)</Label>
        <NumberInput
          id="waitTimeout"
          value={(data.waitTimeout as number) ?? 30}
          onChange={(v) => onChange('waitTimeout', v)}
          defaultValue={30}
          min={1}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="checkInterval">检查间隔(秒)</Label>
        <NumberInput
          id="checkInterval"
          value={(data.checkInterval as number) ?? 0.5}
          onChange={(v) => onChange('checkInterval', v)}
          defaultValue={0.5}
          min={0.1}
          step={0.1}
        />
        <p className="text-xs text-muted-foreground">
          '每次检查图片的时间间隔'
        </p>
      </div>
      
      {/* 搜索区域 */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="useSearchRegion"
            checked={useSearchRegion}
            onCheckedChange={(checked) => {
              setUseSearchRegion(!!checked)
              if (!checked) {
                onChange('searchRegion', null)
              }
            }}
          />
          <Label htmlFor="useSearchRegion" className="cursor-pointer">限定搜索区域</Label>
        </div>
        <p className="text-xs text-muted-foreground">
          '仅在屏幕的指定区域内查找图片'
        </p>
      </div>
      
      {useSearchRegion && (
        <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
          <DualCoordinateInput
            label='左上角坐标'
            xValue={(data.searchRegion as Record<string, number>)?.x ?? 0}
            yValue={(data.searchRegion as Record<string, number>)?.y ?? 0}
            onXChange={(v) => onChange('searchRegion', { ...(data.searchRegion as object || {}), x: v })}
            onYChange={(v) => onChange('searchRegion', { ...(data.searchRegion as object || {}), y: v })}
            onBothChange={(x, y) => onChange('searchRegion', { ...(data.searchRegion as object || {}), x, y })}
          />
          <DualCoordinateInput
            label='右下角坐标'
            xValue={(data.searchRegion as Record<string, number>)?.x2 ?? 0}
            yValue={(data.searchRegion as Record<string, number>)?.y2 ?? 0}
            onXChange={(v) => onChange('searchRegion', { ...(data.searchRegion as object || {}), x2: v })}
            onYChange={(v) => onChange('searchRegion', { ...(data.searchRegion as object || {}), y2: v })}
            onBothChange={(x, y) => onChange('searchRegion', { ...(data.searchRegion as object || {}), x2: x, y2: y })}
          />
          <p className="text-xs text-muted-foreground">
            '定义一个矩形区域，仅在此区域内查找图片'
          </p>
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="variableNameX">X坐标变量名</Label>
        <VariableNameInput
          id="variableNameX"
          value={(data.variableNameX as string) || ''}
          onChange={(v) => onChange('variableNameX', v)}
          placeholder='变量名'
          isStorageVariable={true}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="variableNameY">Y坐标变量名</Label>
        <VariableNameInput
          id="variableNameY"
          value={(data.variableNameY as string) || ''}
          onChange={(v) => onChange('variableNameY', v)}
          placeholder='变量名'
          isStorageVariable={true}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        '找到图片后，将其中心点坐标存储到指定变量'
      </p>
    </>
  )
}

// 等待页面加载完成配置
export function WaitPageLoadConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="waitUntil">等待条件</Label>
        <Select
          id="waitUntil"
          value={(data.waitUntil as string) || 'load'}
          onChange={(e) => onChange('waitUntil', e.target.value)}
        >
          <option value="load">页面加载完成</option>
          <option value="domcontentloaded">DOM加载完成</option>
          <option value="networkidle">网络空闲</option>
        </Select>
        <p className="text-xs text-muted-foreground">
          load: 等待页面完全加载（包括图片、样式等）<br/>
          domcontentloaded: 等待DOM结构加载完成<br/>
          networkidle: 等待网络请求完成（500ms内无新请求）
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="timeout">超时时间（秒）</Label>
        <NumberInput
          id="timeout"
          value={(data.timeout as number) ?? 60}
          onChange={(v) => onChange('timeout', v)}
          defaultValue={60}
          min={1}
        />
      </div>
    </>
  )
}

// 网页是否加载完成配置
export function PageLoadCompleteConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="checkState">检查状态</Label>
        <Select
          id="checkState"
          value={(data.checkState as string) || 'load'}
          onChange={(e) => onChange('checkState', e.target.value)}
        >
          <option value="load">页面加载完成</option>
          <option value="domcontentloaded">DOM加载完成</option>
          <option value="networkidle">网络空闲</option>
        </Select>
        <p className="text-xs text-muted-foreground">
          检查页面是否达到指定的加载状态
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="saveToVariable">保存到变量</Label>
        <VariableNameInput
          id="saveToVariable"
          value={(data.saveToVariable as string) || 'page_loaded'}
          onChange={(v) => onChange('saveToVariable', v)}
          placeholder="page_loaded"
          isStorageVariable={true}
        />
        <p className="text-xs text-muted-foreground">
          将检查结果（true/false）保存到变量中
        </p>
      </div>
    </>
  )
}

// 设置变量配置
export function SetVariableConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="variableName">变量名</Label>
        <VariableNameInput
          id="variableName"
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="变量名"
          isStorageVariable={true}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="variableValue">变量值</Label>
        <VariableInput
          value={(data.variableValue as string) || ''}
          onChange={(v) => onChange('variableValue', v)}
          placeholder="变量的值"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        支持表达式计算，例如：<code className="bg-muted px-1 rounded">{'{a}+1'}</code>、<code className="bg-muted px-1 rounded">{'{a}*2'}</code>、<code className="bg-muted px-1 rounded">{'{a}+{b}'}</code>
      </p>
    </>
  )
}

// 打印日志配置
export function PrintLogConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="logMessage">日志内容</Label>
        <VariableInput
          value={(data.logMessage as string) || ''}
          onChange={(v) => onChange('logMessage', v)}
          placeholder='要打印的日志信息'
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="logLevel">日志级别</Label>
        <Select
          id="logLevel"
          value={(data.logLevel as string) || 'info'}
          onChange={(e) => onChange('logLevel', e.target.value)}
        >
          <option value="debug">调试</option>
          <option value="info">信息</option>
          <option value="success">成功</option>
          <option value="warning">警告</option>
          <option value="error">错误</option>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground">
        '在执行日志中打印信息，支持变量引用'
      </p>
    </>
  )
}

// 播放提示音配置
export function PlaySoundConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="beepCount">提示音次数</Label>
        <NumberInput
          id="beepCount"
          value={(data.beepCount as number) ?? 1}
          onChange={(v) => onChange('beepCount', v)}
          defaultValue={1}
          min={1}
          max={10}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="beepInterval">提示音间隔(秒)</Label>
        <NumberInput
          id="beepInterval"
          value={(data.beepInterval as number) ?? 0.3}
          onChange={(v) => onChange('beepInterval', v)}
          defaultValue={0.3}
          min={0.1}
          step={0.1}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        '播放系统提示音，可用于提醒用户'
      </p>
    </>
  )
}

// 系统消息弹窗配置
export function SystemNotificationConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="notifyTitle">通知标题</Label>
        <VariableInput
          value={(data.notifyTitle as string) || ''}
          onChange={(v) => onChange('notifyTitle', v)}
          placeholder='通知的标题'
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notifyMessage">通知内容</Label>
        <VariableInput
          value={(data.notifyMessage as string) || ''}
          onChange={(v) => onChange('notifyMessage', v)}
          placeholder='通知的详细内容'
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="duration">显示时长(秒)</Label>
        <NumberInput
          id="duration"
          value={(data.duration as number) ?? 5}
          onChange={(v) => onChange('duration', v)}
          defaultValue={5}
          min={1}
          max={30}
        />
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="playSound"
          checked={(data.playSound as boolean) ?? true}
          onCheckedChange={(checked) => onChange('playSound', checked === true)}
        />
        <Label htmlFor="playSound" className="cursor-pointer">弹窗出现时播放提示音</Label>
      </div>
      <p className="text-xs text-muted-foreground">
        显示系统通知消息，支持变量引用；弹窗会自动跟随系统亮色/暗色主题
      </p>
    </>
  )
}

// 播放音乐配置
export function PlayMusicConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="audioUrl">音频地址</Label>
        <VariableInput
          value={(data.audioUrl as string) || ''}
          onChange={(v) => onChange('audioUrl', v)}
          placeholder='音频文件的URL或本地路径'
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="waitForEnd">等待播放完成</Label>
        <Select
          id="waitForEnd"
          value={String(data.waitForEnd ?? false)}
          onChange={(e) => onChange('waitForEnd', e.target.value === 'true')}
        >
          <option value="false">否</option>
          <option value="true">是</option>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground">
        '播放音频文件，支持本地文件和网络URL'
      </p>
    </>
  )
}

// 播放视频配置
export function PlayVideoConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="videoUrl">视频地址</Label>
        <VariableInput
          value={(data.videoUrl as string) || ''}
          onChange={(v) => onChange('videoUrl', v)}
          placeholder='视频文件的URL或本地路径'
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="waitForEnd">等待播放完成</Label>
        <Select
          id="waitForEnd"
          value={String(data.waitForEnd ?? false)}
          onChange={(e) => onChange('waitForEnd', e.target.value === 'true')}
        >
          <option value="false">否</option>
          <option value="true">是</option>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground">
        '播放视频文件，支持本地文件和网络URL'
      </p>
    </>
  )
}

// 查看图片配置
export function ViewImageConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="imageUrl">图片地址</Label>
        <VariableInput
          value={(data.imageUrl as string) || ''}
          onChange={(v) => onChange('imageUrl', v)}
          placeholder='图片文件的URL或本地路径'
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="autoClose">自动关闭</Label>
        <Select
          id="autoClose"
          value={String(data.autoClose ?? false)}
          onChange={(e) => onChange('autoClose', e.target.value === 'true')}
        >
          <option value="false">否</option>
          <option value="true">是</option>
        </Select>
      </div>
      {data.autoClose && (
        <div className="space-y-2">
          <Label htmlFor="displayTime">显示时长(秒)</Label>
          <NumberInput
            id="displayTime"
            value={(data.displayTime as number) ?? 5}
            onChange={(v) => onChange('displayTime', v)}
            defaultValue={5}
            min={1}
            max={300}
            step={0.1}
          />
          <p className="text-xs text-muted-foreground">
            '图片显示的时长，单位秒'
          </p>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        '在新窗口中查看图片，支持本地文件和网络URL'
      </p>
    </>
  )
}

// 变量输入框配置
export function InputPromptConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  const inputMode = (data.inputMode as string) || 'single'
  
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="inputMode">输入模式</Label>
        <Select
          id="inputMode"
          value={inputMode}
          onChange={(e) => onChange('inputMode', e.target.value)}
        >
          <option value="single">单行文本</option>
          <option value="multiline">多行文本</option>
          <option value="number">数字</option>
          <option value="integer">整数</option>
          <option value="password">密码</option>
          <option value="list">列表</option>
          <option value="file">文件</option>
          <option value="folder">文件夹</option>
          <option value="checkbox">复选框</option>
          <option value="slider_int">整数滑块</option>
          <option value="slider_float">小数滑块</option>
          <option value="select_single">单选下拉</option>
          <option value="select_multiple">多选下拉</option>
        </Select>
        <p className="text-xs text-muted-foreground">
          {inputMode === 'single' && '单行文本输入框'}
          {inputMode === 'multiline' && '多行文本输入框'}
          {inputMode === 'number' && '数字输入框（可以是小数）'}
          {inputMode === 'integer' && '整数输入框（只能输入整数）'}
          {inputMode === 'password' && '密码输入框（输入内容会被隐藏）'}
          {inputMode === 'list' && '列表输入框（每行一个元素）'}
          {inputMode === 'file' && '文件选择对话框'}
          {inputMode === 'folder' && '文件夹选择对话框'}
          {inputMode === 'checkbox' && '复选框（勾选/不勾选）'}
          {inputMode === 'slider_int' && '整数滑块（拖动选择整数）'}
          {inputMode === 'slider_float' && '小数滑块（拖动选择小数）'}
          {inputMode === 'select_single' && '单选下拉框（从选项中选择一个）'}
          {inputMode === 'select_multiple' && '多选下拉框（从选项中选择多个）'}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="variableName">变量名</Label>
        <VariableNameInput
          id="variableName"
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder='变量名'
          isStorageVariable={true}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="promptTitle">提示标题</Label>
        <VariableInput
          value={(data.promptTitle as string) || ''}
          onChange={(v) => onChange('promptTitle', v)}
          placeholder='输入框的标题'
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="promptMessage">提示信息</Label>
        <VariableInput
          value={(data.promptMessage as string) || ''}
          onChange={(v) => onChange('promptMessage', v)}
          placeholder='输入框的提示信息'
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="defaultValue">默认值</Label>
        {inputMode === 'checkbox' ? (
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <input
              type="checkbox"
              id="defaultValue"
              checked={(data.defaultValue as string) === 'true' || (data.defaultValue as boolean) === true}
              onChange={(e) => onChange('defaultValue', e.target.checked ? 'true' : 'false')}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
            />
            <Label htmlFor="defaultValue" className="cursor-pointer select-none flex-1">
              '默认选中'
            </Label>
            <span className={`text-sm font-medium px-2 py-1 rounded ${
              (data.defaultValue as string) === 'true' || (data.defaultValue as boolean) === true
                ? 'bg-green-100 text-green-700' 
                : 'bg-gray-200 text-gray-600'
            }`}>
              {(data.defaultValue as string) === 'true' || (data.defaultValue as boolean) === true ? '已选中' : '未选中'}
            </span>
          </div>
        ) : (
          <VariableInput
            value={(data.defaultValue as string) || ''}
            onChange={(v) => onChange('defaultValue', v)}
            placeholder='默认值(可选)'
            multiline={inputMode === 'multiline' || inputMode === 'list'}
            rows={3}
          />
        )}
      </div>
      {(inputMode === 'select_single' || inputMode === 'select_multiple') && (
        <div className="space-y-2">
          <Label htmlFor="selectOptions">选项列表</Label>
          <VariableInput
            value={(data.selectOptions as string) || ''}
            onChange={(v) => onChange('selectOptions', v)}
            placeholder='选项1,选项2,选项3'
          />
          <p className="text-xs text-muted-foreground">
            '用逗号分隔多个选项'
          </p>
        </div>
      )}
      {(inputMode === 'number' || inputMode === 'integer' || inputMode === 'slider_int' || inputMode === 'slider_float') && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="minValue">最小值</Label>
              <NumberInput
                id="minValue"
                value={(data.minValue as number | string) ?? ''}
                onChange={(v) => onChange('minValue', v === '' ? undefined : v)}
                placeholder={inputMode.startsWith('slider') ? '滑块必填' : '可选'}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxValue">最大值</Label>
              <NumberInput
                id="maxValue"
                value={(data.maxValue as number | string) ?? ''}
                onChange={(v) => onChange('maxValue', v === '' ? undefined : v)}
                placeholder={inputMode.startsWith('slider') ? '滑块必填' : '可选'}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {inputMode.startsWith('slider') 
              ? '滑块模式下必须设置最小值和最大值'
              : '可选，限制用户输入的数字范围'}
          </p>
        </>
      )}
      {inputMode === 'single' && (
        <div className="space-y-2">
          <Label htmlFor="maxLength">最大长度</Label>
          <NumberInput
            id="maxLength"
            value={(data.maxLength as number | string) ?? ''}
            onChange={(v) => onChange('maxLength', v === '' ? undefined : v)}
            placeholder='可选'
          />
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="required"
          checked={(data.required as boolean) ?? true}
          onChange={(e) => onChange('required', e.target.checked)}
          className="rounded"
        />
        <Label htmlFor="required" className="cursor-pointer">必填</Label>
      </div>
    </>
  )
}

// 文本朗读配置
export function TextToSpeechConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="text">朗读文本</Label>
        <VariableInput
          value={(data.text as string) || ''}
          onChange={(v) => onChange('text', v)}
          placeholder='要朗读的文本内容'
          multiline
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lang">语言</Label>
        <Select
          id="lang"
          value={(data.lang as string) || 'zh-CN'}
          onChange={(e) => onChange('lang', e.target.value)}
        >
          <option value="zh-CN">中文(简体)</option>
          <option value="zh-TW">中文(繁体)</option>
          <option value="zh-HK">中文(香港)</option>
          <option value="en-US">英语(美国)</option>
          <option value="en-GB">英语(英国)</option>
          <option value="ja-JP">日语</option>
          <option value="ko-KR">韩语</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="rate">'语速' ({(data.rate as number) || 1}x)</Label>
        <input
          id="rate"
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={(data.rate as number) || 1}
          onChange={(e) => onChange('rate', parseFloat(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0.5x</span>
          <span>1x</span>
          <span>2x</span>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="pitch">'音调' ({(data.pitch as number) || 1})</Label>
        <input
          id="pitch"
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={(data.pitch as number) || 1}
          onChange={(e) => onChange('pitch', parseFloat(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>低</span>
          <span>正常</span>
          <span>高</span>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="volume">'音量' ({Math.round(((data.volume as number) || 1) * 100)}%)</Label>
        <input
          id="volume"
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={(data.volume as number) || 1}
          onChange={(e) => onChange('volume', parseFloat(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>静音</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          '使用系统TTS引擎朗读文本，支持多种语言'
        </p>
      </div>
    </>
  )
}

// JS脚本配置
const DEFAULT_JS_CODE = `// 自定义 JavaScript 脚本
// 可以使用 vars 对象访问工作流中的变量
// 例如: vars.myVar, vars.myList, vars.myDict

function main(vars) {
  // 在这里编写你的代码
  // 示例：处理字符串
  // const text = vars.inputText || '';
  // return text.toUpperCase();
  
  // 示例：处理列表
  // const list = vars.myList || [];
  // return list.filter(item => item > 10);
  
  // 示例：处理字典
  // const dict = vars.myDict || {};
  // return Object.keys(dict).length;
  
  return null;
}

// main 函数的返回值将存储到指定的变量中`

export function JsScriptConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  const [editorOpen, setEditorOpen] = useState(false)
  const code = (data.code as string) || DEFAULT_JS_CODE
  
  // 计算代码行数
  const lineCount = code.split('\n').length
  
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="code">JavaScript代码</Label>
        <div className="relative">
          <textarea
            id="code"
            value={code}
            onChange={(e) => onChange('code', e.target.value)}
            placeholder='// 编写JavaScript代码'
            rows={8}
            className="w-full px-3 py-2 text-xs font-mono rounded-md border border-input bg-background resize-none"
            spellCheck={false}
            readOnly
          />
          <div className="absolute inset-0 bg-black/5 flex items-center justify-center rounded-md cursor-pointer hover:bg-black/10 transition-colors"
            onClick={() => setEditorOpen(true)}
          >
            <div className="bg-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
              <Code className="w-4 h-4" />
              <span className="text-sm font-medium">打开代码编辑器</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {lineCount} '行' · '点击打开编辑器'
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="resultVariable">结果变量</Label>
        <VariableNameInput
          id="resultVariable"
          value={(data.resultVariable as string) || ''}
          onChange={(v) => onChange('resultVariable', v)}
          placeholder='变量名'
          isStorageVariable={true}
        />
      </div>
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
        <p className="text-xs font-medium text-amber-800">使用说明：</p>
        <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
          <li>'通过' <code className="bg-amber-100 px-1 rounded">vars</code></li>
          <li><code className="bg-amber-100 px-1 rounded">main(vars)</code> '函数的返回值将存储到结果变量'</li>
          <li>支持所有标准JavaScript语法和内置对象</li>
          <li>不支持异步操作(async/await)和DOM操作</li>
        </ul>
      </div>
      
      {/* 代码编辑器弹窗 */}
      {editorOpen && (
        <Suspense fallback={null}>
          <JsEditorDialog
            isOpen={editorOpen}
            code={code}
            onClose={() => setEditorOpen(false)}
            onSave={(newCode) => onChange('code', newCode)}
          />
        </Suspense>
      )}
    </>
  )
}

// Python脚本默认代码（包含详细教学注释）
const DEFAULT_PYTHON_CODE = `# ========================================
# WebRPA Python脚本模块 - 使用教程
# ========================================

# 一、访问工作流变量
# ----------------------------------------
# 系统自动注入所有工作流变量，可以直接通过 vars.变量名 访问
# 例如：
# - vars.username  # 获取 username 变量
# - vars.count     # 获取 count 变量
# - vars.items     # 获取 items 列表变量
# - vars.user_info # 获取 user_info 字典变量

# 如果变量不存在，可以使用 get() 方法提供默认值
# username = vars.get('username', '默认用户')
# age = vars.get('age', 0)

# 查看所有可用变量
print(f"所有可用变量: {list(vars.keys())}")


# 二、编写你的业务逻辑
# ----------------------------------------
# 示例1：简单计算
result = 1 + 1
print(f"计算结果: {result}")

# 示例2：使用工作流变量
# 假设工作流中有一个名为 'name' 的变量
if 'name' in vars.keys():
    name = vars.name  # 或者 vars.get('name')
    greeting = f"你好, {name}!"
    print(greeting)

# 示例3：处理列表数据
# 假设工作流中有一个名为 'numbers' 的列表变量
if 'numbers' in vars.keys():
    numbers = vars.numbers
    total = sum(numbers)
    print(f"数字总和: {total}")


# 三、返回结果给工作流
# ----------------------------------------
# 直接使用 return 返回结果即可
# 支持任意类型：字符串、数字、列表、字典等

# 示例：返回字典
output_data = {
    'status': 'success',
    'result': result,
    'message': '处理完成'
}

# 直接返回（系统会自动保存到指定的返回值变量）
return output_data


# ========================================
# 使用提示
# ========================================
# 1. 访问变量：直接使用 vars.变量名 或 vars.get('变量名', 默认值)
#    系统会自动注入所有工作流变量，无需手动配置
#
# 2. 返回值：直接使用 return 返回任意类型的数据
#    在配置面板的"返回值变量"中指定接收变量名
#    例如：result，然后可以用 {result} 引用
#
# 3. 标准输出：print() 的内容会保存到"标准输出变量"（如果配置了）
#
# 4. 内置库：可以使用Python 3.13的所有标准库
#    以及WebRPA内置的第三方库（requests、pandas等）
#
# 5. 简单易用：就像写普通Python脚本一样，无需复杂配置
# ========================================
`

// Python脚本配置
export function PythonScriptConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  const [editorOpen, setEditorOpen] = useState(false)
  const scriptMode = (data.scriptMode as string) || 'content'
  const scriptContent = (data.scriptContent as string) || DEFAULT_PYTHON_CODE
  const useBuiltinPython = data.useBuiltinPython !== false // 默认true
  
  // 计算代码行数
  const lineCount = scriptContent.split('\n').length
  
  return (
    <>
      <div className="bg-[hsl(var(--card))] p-3 rounded-lg border-l-4 border-green-500">
        <p className="text-sm text-gray-700 font-medium mb-1">
          🐍 Python脚本执行
        </p>
        <p className="text-xs text-gray-600">
          执行自定义Python代码，自动注入所有工作流变量，支持返回值接收和输出捕获
        </p>
      </div>

      <div className="space-y-2">
        <Label>脚本模式</Label>
        <Select
          value={scriptMode}
          onChange={(e) => onChange('scriptMode', e.target.value)}
        >
          <option value="content">直接输入代码</option>
          <option value="file">从文件读取</option>
        </Select>
      </div>

      {scriptMode === 'content' ? (
        <div className="space-y-2">
          <Label htmlFor="scriptContent">Python代码</Label>
          <div className="relative">
            <textarea
              id="scriptContent"
              value={scriptContent}
              onChange={(e) => onChange('scriptContent', e.target.value)}
              placeholder="# 编写Python代码"
              rows={12}
              className="w-full px-3 py-2 text-xs font-mono rounded-md border border-input bg-background resize-none"
              spellCheck={false}
              readOnly
            />
            <div className="absolute inset-0 bg-black/5 flex items-center justify-center rounded-md cursor-pointer hover:bg-black/10 transition-colors"
              onClick={() => setEditorOpen(true)}
            >
              <div className="bg-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                <Code className="w-4 h-4" />
                <span className="text-sm font-medium">打开代码编辑器</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {lineCount} 行 · 点击打开编辑器
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="scriptPath">脚本文件路径</Label>
          <PathInput
            value={(data.scriptPath as string) || ''}
            onChange={(v) => onChange('scriptPath', v)}
            placeholder="Python脚本文件路径 (.py)"
            type="file"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>Python环境</Label>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="useBuiltinPython"
            checked={useBuiltinPython}
            onCheckedChange={(checked) => onChange('useBuiltinPython', checked)}
          />
          <Label htmlFor="useBuiltinPython" className="cursor-pointer font-normal">
            使用内置Python 3.13
          </Label>
        </div>
      </div>

      {!useBuiltinPython && (
        <div className="space-y-2">
          <Label htmlFor="pythonPath">Python解释器路径</Label>
          <PathInput
            value={(data.pythonPath as string) || ''}
            onChange={(v) => onChange('pythonPath', v)}
            placeholder="留空使用系统Python"
            type="file"
          />
        </div>
      )}

      <div className="p-3 bg-cyan-50 rounded-lg border border-cyan-200">
        <p className="text-xs font-medium text-cyan-800 mb-2">变量访问说明</p>
        <div className="text-xs space-y-1">
          <p className="text-cyan-700">
            系统会自动将所有工作流变量注入到脚本中，您可以直接通过 <span className="font-mono bg-white px-1 rounded">vars.变量名</span> 访问任何变量
          </p>
          <div className="bg-white/50 rounded p-2 space-y-0.5 mt-2">
            <p className="text-cyan-600 font-medium">使用示例:</p>
            <p className="text-gray-600 font-mono">• 访问变量: vars.username</p>
            <p className="text-gray-600 font-mono">• 带默认值: vars.get('age', 0)</p>
            <p className="text-gray-600 font-mono">• 列表所有变量: list(vars.keys())</p>
            <p className="text-gray-600 font-mono">• 检查变量存在: 'name' in vars.keys()</p>
          </div>
        </div>
      </div>

      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
        <p className="text-xs font-medium text-amber-800 mb-2 inline-flex items-center gap-1.5">
          <Upload className="w-3.5 h-3.5" />
          输出结果配置
        </p>
        <div className="space-y-2">
          <div className="space-y-2">
            <Label htmlFor="resultVariable">返回值变量</Label>
            <VariableNameInput
              id="resultVariable"
              value={(data.resultVariable as string) || ''}
              onChange={(v) => onChange('resultVariable', v)}
              placeholder="result"
              isStorageVariable={true}
            />
            <p className="text-xs text-amber-700">
              接收脚本中 return 返回的数据（支持任意类型）
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stdoutVariable">标准输出变量（可选）</Label>
            <VariableNameInput
              id="stdoutVariable"
              value={(data.stdoutVariable as string) || ''}
              onChange={(v) => onChange('stdoutVariable', v)}
              placeholder="stdout"
              isStorageVariable={true}
            />
            <p className="text-xs text-amber-700">
              接收 print() 输出的内容
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stderrVariable">标准错误变量（可选）</Label>
            <VariableNameInput
              id="stderrVariable"
              value={(data.stderrVariable as string) || ''}
              onChange={(v) => onChange('stderrVariable', v)}
              placeholder="stderr"
              isStorageVariable={true}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="returnCodeVariable">返回码变量（可选）</Label>
            <VariableNameInput
              id="returnCodeVariable"
              value={(data.returnCodeVariable as string) || ''}
              onChange={(v) => onChange('returnCodeVariable', v)}
              placeholder="return_code"
              isStorageVariable={true}
            />
            <p className="text-xs text-amber-700">
              0表示成功，非0表示失败
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="workingDir">工作目录（可选）</Label>
        <PathInput
          value={(data.workingDir as string) || ''}
          onChange={(v) => onChange('workingDir', v)}
          placeholder="留空使用默认目录"
          type="folder"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="timeout">超时时间（秒）</Label>
        <NumberInput
          id="timeout"
          value={(data.timeout as number) || 60}
          onChange={(v) => onChange('timeout', v)}
          defaultValue={60}
          min={1}
          max={3600}
        />
      </div>

      <div className="p-3 bg-green-50 border border-green-200 rounded-lg space-y-2">
        <p className="text-xs font-medium text-green-800">使用说明：</p>
        <ul className="text-xs text-green-700 space-y-1 list-disc list-inside">
          <li>默认使用WebRPA内置的Python 3.13环境</li>
          <li>系统自动注入所有工作流变量，通过 vars.变量名 直接访问</li>
          <li>使用 return 返回任意类型的数据（字符串、数字、列表、字典等）</li>
          <li>可以使用所有Python标准库和WebRPA内置的第三方库</li>
          <li>代码编辑器中有详细的使用教程和示例代码</li>
        </ul>
      </div>

      {/* Python 代码编辑器弹窗 */}
      {editorOpen && (
        <Suspense fallback={null}>
          <PythonEditorDialog
            isOpen={editorOpen}
            code={scriptContent}
            onClose={() => setEditorOpen(false)}
            onSave={(code) => {
              onChange('scriptContent', code)
              setEditorOpen(false)
            }}
          />
        </Suspense>
      )}
    </>
  )
}

// 表格数据提取配置
export function ExtractTableDataConfig({ 
  data, 
  onChange, 
  renderSelectorInput 
}: { 
  data: NodeData
  onChange: (key: string, value: unknown) => void
  renderSelectorInput: RenderSelectorInput
}) {
  
  return (
    <>
      {renderSelectorInput('tableSelector', '表格选择器', '例如: table, #dataTable, .data-grid')}
      
      <div className="space-y-2">
        <Label htmlFor="variableName">存储变量名</Label>
        <VariableNameInput
          id="variableName"
          value={(data.variableName as string) || 'table_data'}
          onChange={(v) => onChange('variableName', v)}
          placeholder="table_data"
          isStorageVariable={true}
        />
        <p className="text-xs text-muted-foreground">
          提取的数据将存储为二维列表，可通过 {'{table_data[行][列]}'} 访问单元格
        </p>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="includeHeader"
            checked={(data.includeHeader as boolean) ?? true}
            onCheckedChange={(checked) => onChange('includeHeader', checked)}
          />
          <Label htmlFor="includeHeader" className="cursor-pointer">包含表头</Label>
        </div>
        <p className="text-xs text-muted-foreground">
          勾选后，第一行将被识别为表头
        </p>
      </div>
      
      {(data.includeHeader as boolean) !== false && (
        <div className="space-y-2">
          <Label htmlFor="headerRow">表头行索引</Label>
          <NumberInput
            id="headerRow"
            value={(data.headerRow as number) ?? 0}
            onChange={(v) => onChange('headerRow', v)}
            defaultValue={0}
            min={0}
          />
          <p className="text-xs text-muted-foreground">
            指定哪一行是表头（0表示第一行）
          </p>
        </div>
      )}
      
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="exportToExcel"
            checked={(data.exportToExcel as boolean) ?? false}
            onCheckedChange={(checked) => onChange('exportToExcel', checked)}
          />
          <Label htmlFor="exportToExcel" className="cursor-pointer">导出为Excel</Label>
        </div>
        <p className="text-xs text-muted-foreground">
          勾选后，将自动导出为Excel文件
        </p>
      </div>
      
      {(data.exportToExcel as boolean) && (
        <div className="space-y-2">
          <Label htmlFor="excelPath">Excel文件路径</Label>
          <PathInput
            value={(data.excelPath as string) || ''}
            onChange={(v) => onChange('excelPath', v)}
            placeholder="留空使用默认路径 table_data.xlsx"
            type="file"
          />
          <p className="text-xs text-muted-foreground">
            指定Excel文件保存路径，留空则保存到当前目录
          </p>
        </div>
      )}
      
      <div className="p-3 bg-green-50 border border-green-200 rounded-lg space-y-2">
        <p className="text-xs font-medium text-green-800">使用说明：</p>
        <ul className="text-xs text-green-700 space-y-1 list-disc list-inside">
          <li>支持自动识别网页中的表格元素</li>
          <li>可以选择table标签内的任意元素，会自动向上查找table</li>
          <li>提取的数据为二维列表，按行列索引访问</li>
          <li>支持直接导出为格式化的Excel文件</li>
        </ul>
      </div>
    </>
  )
}

// 备注分组配置
const GROUP_COLORS = [
  { name: '蓝色', value: '#3b82f6' },
  { name: '绿色', value: '#22c55e' },
  { name: '紫色', value: '#a855f7' },
  { name: '橙色', value: '#f97316' },
  { name: '红色', value: '#ef4444' },
  { name: '青色', value: '#06b6d4' },
  { name: '粉色', value: '#ec4899' },
  { name: '灰色', value: '#6b7280' },
]

export function GroupConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  const isSubflow = data.isSubflow === true
  const nodes = useWorkflowStore((state) => state.nodes)
  const edges = useWorkflowStore((state) => state.edges)
  const onNodesChange = useWorkflowStore((state) => state.onNodesChange)
  const onEdgesChange = useWorkflowStore((state) => state.onEdgesChange)
  
  // 转换为子流程头节点
  const convertToSubflowHeader = useCallback(() => {
    const currentNode = nodes.find(n => n.data === data)
    
    if (!currentNode) return
    
    // 找到分组内的所有节点（通过位置判断）
    const groupBounds = {
      left: currentNode.position.x,
      top: currentNode.position.y,
      right: currentNode.position.x + (currentNode.width || 300),
      bottom: currentNode.position.y + (currentNode.height || 200),
    }
    
    const nodesInGroup = nodes.filter(n => {
      if (n.id === currentNode.id || n.type === 'groupNode' || n.type === 'noteNode') return false
      const nodeX = n.position.x + (n.width || 0) / 2
      const nodeY = n.position.y + (n.height || 0) / 2
      return nodeX >= groupBounds.left && nodeX <= groupBounds.right &&
             nodeY >= groupBounds.top && nodeY <= groupBounds.bottom
    })
    
    // 找到第一个节点（没有来自分组内其他节点的连接）
    const firstNode = nodesInGroup.find(node => {
      const incomingEdges = edges.filter(e => e.target === node.id)
      return !incomingEdges.some(e => nodesInGroup.some(n => n.id === e.source))
    })
    
    if (!firstNode) {
      alert('分组内没有找到模块，无法转换为子流程头')
      return
    }
    
    // 创建子流程头节点
    const headerNode: Node<NodeData> = {
      id: `subflow_header_${Date.now()}`,
      type: 'subflowHeaderNode',
      position: {
        x: currentNode.position.x + (currentNode.width || 300) / 2 - 140,
        y: currentNode.position.y - 80,
      },
      data: {
        label: (data.subflowName as string) || (data.label as string) || '未命名子流程',
        moduleType: 'subflow_header' as ModuleType,
        subflowName: (data.subflowName as string) || (data.label as string) || '未命名子流程',
        originalGroupId: currentNode.id,
      },
    }
    
    // 创建从头节点到第一个模块的连接
    const headerEdge: Edge = {
      id: `edge_${headerNode.id}_${firstNode.id}`,
      source: headerNode.id,
      target: firstNode.id,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#10b981', strokeWidth: 2 },
    }
    
    // 删除当前分组节点
    onNodesChange([{ type: 'remove', id: currentNode.id }])
    // 添加子流程头节点
    onNodesChange([{ type: 'add', item: headerNode }])
    // 添加连接边
    onEdgesChange([{ type: 'add', item: headerEdge }])
  }, [data, nodes, edges, onNodesChange, onEdgesChange])
  
  return (
    <>
      {/* 子流程开关 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="isSubflow">设为子流程</Label>
          <button
            type="button"
            role="switch"
            aria-checked={isSubflow}
            onClick={() => {
              const newValue = !isSubflow
              onChange('isSubflow', newValue)
              // 如果开启子流程，自动设置 subflowName
              if (newValue && data.label) {
                onChange('subflowName', data.label)
              }
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isSubflow ? 'bg-emerald-500' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isSubflow ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          '将此分组标记为可复用的子流程'
        </p>
      </div>

      {isSubflow ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="subflowName">子流程名称</Label>
            <VariableInput
              value={(data.subflowName as string) || (data.label as string) || ''}
              onChange={(v) => {
                onChange('subflowName', v)
                onChange('label', v)
              }}
              placeholder='子流程名称'
            />
            {(() => {
              const currentName = (data.subflowName as string) || (data.label as string) || ''
              if (!currentName) return null
              
              const currentNodeId = nodes.find(n => n.data === data)?.id
              const duplicates = nodes.filter(n => {
                if (n.id === currentNodeId) return false
                if (n.type === 'groupNode' && n.data.isSubflow && n.data.subflowName === currentName) return true
                if (n.type === 'subflowHeaderNode' && n.data.subflowName === currentName) return true
                return false
              })
              
              if (duplicates.length === 0) return null
              
              return (
                <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-start gap-1">
                  <span className="text-red-500 font-bold"></span>
                  <div>
                    <strong>名称重复警告</strong><br />
                    "已存在同名子流程 ''，请使用不同的名称"
                  </div>
                </div>
              )
            })()}
            <p className="text-xs text-muted-foreground">
              '子流程的唯一标识名称，用于调用时引用'
            </p>
          </div>
          
          {/* 转换为函数头形式按钮 */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={convertToSubflowHeader}
              className="bg-[hsl(var(--brand-600))] w-full px-4 py-2 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
            >
              '转换为函数头形式'
            </button>
            <p className="text-xs text-amber-600">
              ' 转换后将删除分组框，改为函数头节点形式'
            </p>
          </div>
          
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-xs text-emerald-800">
              <strong>子流程说明：</strong><br />
              • 子流程可以被其他工作流通过"调用子流程"模块调用<br />
              • 子流程内的变量作用域独立，不会影响主流程<br />
              • 可以通过"设置变量"模块设置返回值<br />
              • 子流程名称必须唯一，不能与其他子流程重名
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="label">分组标签</Label>
            <VariableInput
              value={(data.label as string) ?? ''}
              onChange={(v) => onChange('label', v)}
              placeholder='分组名称'
            />
          </div>
          <div className="space-y-2">
            <Label>分组颜色</Label>
            <div className="flex flex-wrap gap-2">
              {GROUP_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className={`w-8 h-8 rounded-md border-2 transition-all ${
                    data.color === color.value ? 'border-foreground scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color.value }}
                  onClick={() => onChange('color', color.value)}
                  title={color.name}
                />
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            '用于组织和标记相关的模块，不影响执行逻辑'
          </p>
        </>
      )}
    </>
  )
}

// 子流程头配置
export function SubflowHeaderConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  const nodes = useWorkflowStore((state) => state.nodes)
  
  // 检查是否有重名的子流程
  const checkDuplicateName = useCallback((name: string) => {
    if (!name) return false
    
    const currentNodeId = nodes.find(n => n.data === data)?.id
    const duplicates = nodes.filter(n => {
      if (n.id === currentNodeId) return false
      if (n.type === 'groupNode' && n.data.isSubflow && n.data.subflowName === name) return true
      if (n.type === 'subflowHeaderNode' && n.data.subflowName === name) return true
      return false
    })
    
    return duplicates.length > 0
  }, [nodes, data])
  
  const currentName = (data.subflowName as string) || (data.label as string) || ''
  const hasDuplicate = checkDuplicateName(currentName)
  
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="subflowName">子流程名称</Label>
        <VariableInput
          value={currentName}
          onChange={(v) => {
            onChange('subflowName', v)
            onChange('label', v)
          }}
          placeholder='子流程名称'
        />
        {hasDuplicate && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-start gap-1">
            <span className="text-red-500 font-bold"></span>
            <div>
              <strong>名称重复警告</strong><br />
              "已存在同名子流程 ''，请使用不同的名称"
            </div>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          '子流程的唯一标识名称，用于调用时引用'
        </p>
      </div>
      
      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
        <p className="text-xs text-emerald-800">
          <strong>子流程头说明：</strong><br />
          • 标记子流程的起始位置<br />
          • 子流程可以被其他工作流调用<br />
          • 子流程内的变量作用域独立<br />
          • 可以通过"设置变量"模块设置返回值<br />
          • 子流程名称必须唯一
        </p>
      </div>
      
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800 leading-relaxed">
          <strong>变量作用域说明：</strong><br />
          • <strong>子流程变量</strong>：子流程内创建的变量仅在子流程内有效<br />
          • <strong>全局变量</strong>：可以在子流程中访问和修改全局变量<br />
          • <strong>返回值</strong>：通过"设置变量"模块设置返回值<br />
          • <strong>参数传递</strong>：调用时可以传递参数到子流程<br />
          • <strong>数据隔离</strong>：子流程的数据表和变量与主流程隔离
        </p>
      </div>
      
      <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
        <p className="text-xs text-purple-800 leading-relaxed">
          <strong>使用方法：</strong><br />
          • <strong>定义子流程</strong>：使用子流程头节点标记起始位置<br />
          • <strong>调用子流程</strong>：使用"调用子流程"模块调用<br />
          • <strong>传递参数</strong>：在调用时设置参数值<br />
          • <strong>获取返回值</strong>：子流程执行完成后获取返回值
        </p>
      </div>
    </>
  )
}

// 刷新页面配置
export function RefreshPageConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="waitUntil">等待条件</Label>
        <Select
          id="waitUntil"
          value={(data.waitUntil as string) || 'load'}
          onChange={(e) => onChange('waitUntil', e.target.value)}
        >
          <option value="load">页面加载完成</option>
          <option value="domcontentloaded">DOM加载完成</option>
          <option value="networkidle">网络空闲</option>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground">
        '刷新当前页面并等待加载完成'
      </p>
    </>
  )
}

// 返回上一页配置
export function GoBackConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="waitUntil">等待条件</Label>
        <Select
          id="waitUntil"
          value={(data.waitUntil as string) || 'load'}
          onChange={(e) => onChange('waitUntil', e.target.value)}
        >
          <option value="load">页面加载完成</option>
          <option value="domcontentloaded">DOM加载完成</option>
          <option value="networkidle">网络空闲</option>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground">
        '返回到上一个页面'
      </p>
    </>
  )
}

// 前进下一页配置
export function GoForwardConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="waitUntil">等待条件</Label>
        <Select
          id="waitUntil"
          value={(data.waitUntil as string) || 'load'}
          onChange={(e) => onChange('waitUntil', e.target.value)}
        >
          <option value="load">页面加载完成</option>
          <option value="domcontentloaded">DOM加载完成</option>
          <option value="networkidle">网络空闲</option>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground">
        '前进到下一个页面'
      </p>
    </>
  )
}

// 处理弹窗配置
export function HandleDialogConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="dialogAction">处理方式</Label>
        <Select
          id="dialogAction"
          value={(data.dialogAction as string) || 'accept'}
          onChange={(e) => onChange('dialogAction', e.target.value)}
        >
          <option value="accept">接受/确定</option>
          <option value="dismiss">取消/关闭</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="promptText">输入文本</Label>
        <VariableInput
          value={(data.promptText as string) || ''}
          onChange={(v) => onChange('promptText', v)}
          placeholder='prompt对话框的输入文本'
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="saveMessage">保存对话框消息</Label>
        <VariableNameInput
          value={(data.saveMessage as string) || ''}
          onChange={(v) => onChange('saveMessage', v)}
          placeholder='变量名(可选)'
          isStorageVariable={true}
        />
      </div>
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
        <p className="text-xs font-medium text-blue-800">支持的对话框类型：</p>
        <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
          <li><code className="bg-blue-100 px-1 rounded">alert</code> - '警告框'</li>
          <li><code className="bg-blue-100 px-1 rounded">confirm</code> - '确认框'</li>
          <li><code className="bg-blue-100 px-1 rounded">prompt</code> - '输入框'</li>
          <li><code className="bg-blue-100 px-1 rounded">beforeunload</code> - '页面离开确认'</li>
        </ul>
      </div>
    </>
  )
}

// JS脚本注入配置
const DEFAULT_INJECT_JS_CODE = `// 在页面中注入并执行 JavaScript 代码
// 可以访问页面的 DOM、window 对象等
// 可以通过 vars.变量名 访问工作流中的所有变量

// 示例1：使用工作流变量
// const username = vars.username;  // 访问工作流变量
// console.log('当前用户:', username);

// 示例2：修改页面背景色（最明显的测试）
document.body.style.background = "lightblue";

// 示例3：修改页面标题
// document.title = "JS脚本注入成功";

// 示例4：在页面上显示提示框
// const div = document.createElement('div');
// div.style.cssText = 'position:fixed;top:20px;right:20px;background:green;color:white;padding:20px;font-size:18px;z-index:999999;border-radius:10px;box-shadow:0 4px 6px rgba(0,0,0,0.1);';
// div.textContent = '脚本执行成功';
// document.body.appendChild(div);

// 示例5：获取页面信息（使用 return 返回数据）
// return {
//   title: document.title,
//   url: window.location.href,
//   linkCount: document.querySelectorAll('a').length
// };
`

export function InjectJavaScriptConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  const [editorOpen, setEditorOpen] = useState(false)
  const code = (data.javascriptCode as string) || DEFAULT_INJECT_JS_CODE
  const injectMode = (data.injectMode as string) || 'current'
  
  // 计算代码行数
  const lineCount = code.split('\n').length
  
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="injectMode">注入模式</Label>
        <Select
          id="injectMode"
          value={injectMode}
          onChange={(e) => onChange('injectMode', e.target.value)}
        >
          <option value="current">当前标签页</option>
          <option value="all">所有标签页</option>
          <option value="url_match">URL匹配</option>
          <option value="index">指定索引</option>
        </Select>
        <p className="text-xs text-muted-foreground">
          {injectMode === 'current' && '在当前激活的标签页中注入脚本'}
          {injectMode === 'all' && '在所有打开的标签页中注入脚本'}
          {injectMode === 'url_match' && '在URL匹配的标签页中注入脚本'}
          {injectMode === 'index' && '在指定索引的标签页中注入脚本'}
        </p>
      </div>
      
      {/* URL匹配模式的配置 */}
      {injectMode === 'url_match' && (
        <div className="space-y-2">
          <Label htmlFor="targetUrl">目标URL</Label>
          <VariableInput
            id="targetUrl"
            value={(data.targetUrl as string) || ''}
            onChange={(v) => onChange('targetUrl', v)}
            placeholder='URL关键词'
          />
          <p className="text-xs text-muted-foreground">
            '匹配包含此文本的URL'
          </p>
        </div>
      )}
      
      {/* 索引模式的配置 */}
      {injectMode === 'index' && (
        <div className="space-y-2">
          <Label htmlFor="targetIndex">标签页索引</Label>
          <NumberInput
            id="targetIndex"
            value={(data.targetIndex as string) || '0'}
            onChange={(v) => onChange('targetIndex', v)}
            placeholder='0'
            min={0}
          />
          <p className="text-xs text-muted-foreground">
            '标签页的索引位置，从0开始'
          </p>
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="javascriptCode">JavaScript代码</Label>
        <div className="relative">
          <textarea
            id="javascriptCode"
            value={code}
            onChange={(e) => onChange('javascriptCode', e.target.value)}
            placeholder='// 编写要注入的JavaScript代码'
            rows={8}
            className="w-full px-3 py-2 text-xs font-mono rounded-md border border-input bg-background resize-none"
            spellCheck={false}
            readOnly
          />
          <div className="absolute inset-0 bg-black/5 flex items-center justify-center rounded-md cursor-pointer hover:bg-black/10 transition-colors"
            onClick={() => setEditorOpen(true)}
          >
            <div className="bg-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
              <Code className="w-4 h-4" />
              <span className="text-sm font-medium">打开代码编辑器</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {lineCount} '行' · '点击打开编辑器'
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="saveResult">保存结果</Label>
        <VariableNameInput
          id="saveResult"
          value={(data.saveResult as string) || ''}
          onChange={(v) => onChange('saveResult', v)}
          placeholder='变量名(可选)'
          isStorageVariable={true}
        />
        <p className="text-xs text-muted-foreground">
          {injectMode === 'current' || injectMode === 'index' 
            ? '脚本的返回值将保存到此变量'
            : '所有标签页的返回值将以数组形式保存到此变量'}
        </p>
      </div>
      
      <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg space-y-2">
        <p className="text-xs font-medium text-purple-800">使用说明：</p>
        <ul className="text-xs text-purple-700 space-y-1 list-disc list-inside">
          <li><strong>当前标签页</strong>：'在当前标签页中执行代码'</li>
          <li><strong>所有标签页</strong>：'在所有标签页中执行代码'</li>
          <li><strong>URL匹配</strong>：'在URL匹配的标签页中执行代码'</li>
          <li><strong>指定索引</strong>：'在指定索引的标签页中执行代码'</li>
          <li>'通过' <code className="bg-purple-100 px-1 rounded">vars.变量名</code> '访问工作流变量'</li>
          <li>'使用' <code className="bg-purple-100 px-1 rounded">return</code> '返回数据到工作流'</li>
          <li>可以访问页面的DOM、window对象等</li>
        </ul>
      </div>
      
      {/* 代码编辑器弹窗 */}
      {editorOpen && (
        <Suspense fallback={null}>
          <InjectJsEditorDialog
            isOpen={editorOpen}
            code={code}
            onClose={() => setEditorOpen(false)}
            onSave={(newCode) => onChange('javascriptCode', newCode)}
          />
        </Suspense>
      )}
    </>
  )
}


// 切换iframe配置
export function SwitchIframeConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="locateBy">定位方式</Label>
        <Select
          id="locateBy"
          value={(data.locateBy as string) || 'index'}
          onChange={(e) => onChange('locateBy', e.target.value)}
        >
          <option value="index">索引</option>
          <option value="name">名称/ID</option>
          <option value="selector">选择器</option>
        </Select>
        <p className="text-xs text-muted-foreground">
          选择如何定位iframe元素
        </p>
      </div>

      {(data.locateBy as string) === 'index' && (
        <div className="space-y-2">
          <Label htmlFor="iframeIndex">iframe索引</Label>
          <NumberInput
            id="iframeIndex"
            value={(data.iframeIndex as string) || '0'}
            onChange={(v) => onChange('iframeIndex', v)}
            placeholder="0"
            min={0}
          />
          <p className="text-xs text-muted-foreground">
            页面中第几个iframe，从0开始计数
          </p>
        </div>
      )}

      {(data.locateBy as string) === 'name' && (
        <div className="space-y-2">
          <Label htmlFor="iframeName">iframe名称/ID</Label>
          <VariableInput
            value={(data.iframeName as string) || ''}
            onChange={(v) => onChange('iframeName', v)}
            placeholder="iframe的name或id属性值"
          />
          <p className="text-xs text-muted-foreground">
            iframe元素的name或id属性值
          </p>
        </div>
      )}

      {(data.locateBy as string) === 'selector' && (
        <div className="space-y-2">
          <Label htmlFor="iframeSelector">iframe选择器</Label>
          <VariableInput
            value={(data.iframeSelector as string) || ''}
            onChange={(v) => onChange('iframeSelector', v)}
            placeholder="iframe[src*='example.com']"
          />
          <p className="text-xs text-muted-foreground">
            CSS选择器，用于定位iframe元素
          </p>
        </div>
      )}
    </>
  )
}

// 切换回主页面配置
export function SwitchToMainConfig() {
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        此模块将从当前iframe切换回主页面，无需额外配置。
      </p>
      <p className="text-xs text-muted-foreground mt-2">
        提示：使用此模块后，后续的元素操作将在主页面上执行。
      </p>
    </div>
  )
}

// 切换标签页配置
export function SwitchTabConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  const switchMode = (data.switchMode as string) || 'index'
  const matchMode = (data.matchMode as string) || 'exact'
  
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="switchMode">切换模式</Label>
        <Select
          id="switchMode"
          value={switchMode}
          onChange={(e) => onChange('switchMode', e.target.value)}
        >
          <option value="index">按索引切换</option>
          <option value="title">按标题切换</option>
          <option value="url">按URL切换</option>
          <option value="next">切换到下一个</option>
          <option value="prev">切换到上一个</option>
          <option value="first">切换到第一个</option>
          <option value="last">切换到最后一个</option>
        </Select>
        <p className="text-xs text-muted-foreground">
          {switchMode === 'index' && '通过标签页索引切换（从0开始）'}
          {switchMode === 'title' && '通过标签页标题匹配切换'}
          {switchMode === 'url' && '通过标签页URL匹配切换'}
          {switchMode === 'next' && '切换到当前标签页的下一个'}
          {switchMode === 'prev' && '切换到当前标签页的上一个'}
          {switchMode === 'first' && '切换到第一个标签页'}
          {switchMode === 'last' && '切换到最后一个标签页'}
        </p>
      </div>

      {switchMode === 'index' && (
        <div className="space-y-2">
          <Label htmlFor="tabIndex">标签页索引</Label>
          <VariableInput
            value={String(data.tabIndex ?? 0)}
            onChange={(v) => {
              if (v === '' || v.includes('{')) {
                onChange('tabIndex', v)
              } else {
                const num = parseInt(v)
                onChange('tabIndex', isNaN(num) ? v : num)
              }
            }}
            placeholder="0"
          />
          <p className="text-xs text-muted-foreground">
            标签页索引从0开始，0表示第一个标签页
          </p>
        </div>
      )}

      {switchMode === 'title' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="tabTitle">标签页标题</Label>
            <VariableInput
              value={(data.tabTitle as string) || ''}
              onChange={(v) => onChange('tabTitle', v)}
              placeholder="输入标签页标题"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="matchMode">匹配模式</Label>
            <Select
              id="matchMode"
              value={matchMode}
              onChange={(e) => onChange('matchMode', e.target.value)}
            >
              <option value="exact">精确匹配</option>
              <option value="contains">包含</option>
              <option value="startswith">开头匹配</option>
              <option value="endswith">结尾匹配</option>
              <option value="regex">正则表达式</option>
            </Select>
            <p className="text-xs text-muted-foreground">
              {matchMode === 'exact' && '标题必须完全相同'}
              {matchMode === 'contains' && '标题包含指定文本即可'}
              {matchMode === 'startswith' && '标题以指定文本开头'}
              {matchMode === 'endswith' && '标题以指定文本结尾'}
              {matchMode === 'regex' && '使用正则表达式匹配标题'}
            </p>
          </div>
        </>
      )}

      {switchMode === 'url' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="tabUrl">标签页URL</Label>
            <VariableInput
              value={(data.tabUrl as string) || ''}
              onChange={(v) => onChange('tabUrl', v)}
              placeholder="输入标签页URL"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="matchMode">匹配模式</Label>
            <Select
              id="matchMode"
              value={matchMode}
              onChange={(e) => onChange('matchMode', e.target.value)}
            >
              <option value="exact">精确匹配</option>
              <option value="contains">包含</option>
              <option value="startswith">开头匹配</option>
              <option value="endswith">结尾匹配</option>
              <option value="regex">正则表达式</option>
            </Select>
            <p className="text-xs text-muted-foreground">
              {matchMode === 'exact' && 'URL必须完全相同'}
              {matchMode === 'contains' && 'URL包含指定文本即可'}
              {matchMode === 'startswith' && 'URL以指定文本开头'}
              {matchMode === 'endswith' && 'URL以指定文本结尾'}
              {matchMode === 'regex' && '使用正则表达式匹配URL'}
            </p>
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="saveIndexVariable">保存索引到变量（可选）</Label>
        <VariableNameInput
          id="saveIndexVariable"
          value={(data.saveIndexVariable as string) || ''}
          onChange={(v) => onChange('saveIndexVariable', v)}
          placeholder="tab_index"
          isStorageVariable={true}
        />
        <p className="text-xs text-muted-foreground">
          切换后，将标签页索引保存到指定变量
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="saveTitleVariable">保存标题到变量（可选）</Label>
        <VariableNameInput
          id="saveTitleVariable"
          value={(data.saveTitleVariable as string) || ''}
          onChange={(v) => onChange('saveTitleVariable', v)}
          placeholder="tab_title"
          isStorageVariable={true}
        />
        <p className="text-xs text-muted-foreground">
          切换后，将标签页标题保存到指定变量
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="saveUrlVariable">保存URL到变量（可选）</Label>
        <VariableNameInput
          id="saveUrlVariable"
          value={(data.saveUrlVariable as string) || ''}
          onChange={(v) => onChange('saveUrlVariable', v)}
          placeholder="tab_url"
          isStorageVariable={true}
        />
        <p className="text-xs text-muted-foreground">
          切换后，将标签页URL保存到指定变量
        </p>
      </div>

      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
        <p className="text-xs font-medium text-amber-800">使用说明：</p>
        <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
          <li>支持多种切换模式：索引、标题、URL、相对位置</li>
          <li>标签页索引从0开始，0表示第一个标签页</li>
          <li>切换到下一个/上一个时会循环（最后一个的下一个是第一个）</li>
          <li>可以将切换后的标签页信息保存到变量中</li>
          <li>标题和URL支持多种匹配模式，包括正则表达式</li>
        </ul>
      </div>
    </>
  )
}


// 自增自减配置
export function IncrementDecrementConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="variableName">变量名</Label>
        <VariableNameInput
          id="variableName"
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="要操作的变量名"
          isStorageVariable={true}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="operation">操作类型</Label>
        <Select
          id="operation"
          value={(data.operation as string) || 'increment'}
          onChange={(e) => onChange('operation', e.target.value)}
        >
          <option value="increment">自增 (+)</option>
          <option value="decrement">自减 (-)</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="step">步长</Label>
        <VariableInput
          id="step"
          value={(data.step as string) || '1'}
          onChange={(v) => onChange('step', v)}
          placeholder="每次增加或减少的值"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        对变量进行自增或自减操作。如果变量不存在，将初始化为0。支持整数和小数。
      </p>
    </>
  )
}
