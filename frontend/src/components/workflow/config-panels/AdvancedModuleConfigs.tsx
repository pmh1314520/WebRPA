import type React from 'react'
import { useState, useEffect, useMemo, useRef } from 'react'
import type { NodeData } from '@/store/workflowStore'
import { Label } from '@/components/ui/label'
import { NumberInput } from '@/components/ui/number-input'
import { SelectNative as Select } from '@/components/ui/select-native'
import { VariableInput } from '@/components/ui/variable-input'
import { VariableNameInput } from '@/components/ui/variable-name-input'
import { PathInput } from '@/components/ui/path-input'
import { CoordinateInput } from '@/components/ui/coordinate-input'
import { DualCoordinateInput } from '@/components/ui/dual-coordinate-input'
import { Checkbox } from '@/components/ui/checkbox'
import { ImagePathInput } from '@/components/ui/image-path-input'
import { Button } from '@/components/ui/button'
import { Loader2, Crosshair, Mouse, MousePointerClick, Keyboard, Type, HelpCircle, RotateCw, Pencil, X as XIcon, Plus, Trash2, Clock, Copy as CopyIcon, ArrowUp, ArrowDown } from 'lucide-react'
import { DialogPortal } from '@/components/ui/dialog-portal'
import { getBackendUrl, desktopPickerApi } from '@/services/api'

type RenderSelectorInput = (id: string, label: string, placeholder: string) => React.ReactNode

// 下拉框选择配置
export function SelectDropdownConfig({
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
      {renderSelectorInput('selector', '元素选择器', 'select#dropdown')}
      <div className="space-y-2">
        <Label htmlFor="selectBy">选择方式</Label>
        <Select
          id="selectBy"
          value={(data.selectBy as string) || 'value'}
          onChange={(e) => onChange('selectBy', e.target.value)}
        >
          <option value="value">按值</option>
          <option value="label">按文本</option>
          <option value="index">按索引</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="value">选择值</Label>
        <VariableInput
          value={(data.value as string) || ''}
          onChange={(v) => onChange('value', v)}
          placeholder="要选择的值，支持 {变量名}"
        />
      </div>
    </>
  )
}

// 设置复选框配置
export function SetCheckboxConfig({
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
      {renderSelectorInput('selector', '元素选择器', 'input[type="checkbox"]')}
      <div className="space-y-2">
        <Label htmlFor="checked">操作</Label>
        <Select
          id="checked"
          value={String(data.checked ?? true)}
          onChange={(e) => onChange('checked', e.target.value === 'true')}
        >
          <option value="true">勾选</option>
          <option value="false">取消勾选</option>
        </Select>
      </div>
    </>
  )
}


// 拖拽元素配置
export function DragElementConfig({
  renderSelectorInput
}: {
  data: NodeData
  onChange: (key: string, value: unknown) => void
  renderSelectorInput: RenderSelectorInput
}) {
  return (
    <>
      {renderSelectorInput('sourceSelector', '源元素选择器', '#draggable')}
      {renderSelectorInput('targetSelector', '目标元素选择器', '#droppable')}
      <p className="text-xs text-muted-foreground">
        将源元素拖拽到目标元素位置
      </p>
    </>
  )
}

// 滚动页面配置
export function ScrollPageConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="direction">滚动方向</Label>
        <Select
          id="direction"
          value={(data.direction as string) || 'down'}
          onChange={(e) => onChange('direction', e.target.value)}
        >
          <option value="down">向下</option>
          <option value="up">向上</option>
          <option value="right">向右</option>
          <option value="left">向左</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="distance">滚动距离 (像素)</Label>
        <NumberInput
          id="distance"
          value={(data.distance as number) ?? 500}
          onChange={(v) => onChange('distance', v)}
          defaultValue={500}
          min={0}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="selector">滚动容器选择器（可选）</Label>
        <VariableInput
          value={(data.selector as string) || ''}
          onChange={(v) => onChange('selector', v)}
          placeholder="留空则滚动整个页面，支持 {变量名}"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="scrollMode">滚动模式</Label>
        <Select
          id="scrollMode"
          value={(data.scrollMode as string) || 'auto'}
          onChange={(e) => onChange('scrollMode', e.target.value)}
        >
          <option value="auto">自动（优先滚轮）</option>
          <option value="wheel">鼠标滚轮</option>
          <option value="script">脚本滚动</option>
        </Select>
      </div>
    </>
  )
}

// 上传文件配置
export function UploadFileConfig({
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
      {renderSelectorInput('selector', '上传按钮选择器', 'input[type="file"]')}
      <div className="space-y-2">
        <Label htmlFor="filePath">文件路径</Label>
        <PathInput
          value={(data.filePath as string) || ''}
          onChange={(v) => onChange('filePath', v)}
          placeholder="C:\path\to\file.jpg，支持 {变量名}"
          type="file"
        />
      </div>
    </>
  )
}

// 下载文件配置
export function DownloadFileConfig({
  data,
  onChange,
  renderSelectorInput
}: {
  data: NodeData
  onChange: (key: string, value: unknown) => void
  renderSelectorInput: RenderSelectorInput
}) {
  const downloadMode = (data.downloadMode as string) || 'click'
  
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="downloadMode">下载方式</Label>
        <Select
          id="downloadMode"
          value={downloadMode}
          onChange={(e) => onChange('downloadMode', e.target.value)}
        >
          <option value="click">点击触发下载</option>
          <option value="url">直接URL下载</option>
        </Select>
      </div>
      {downloadMode === 'click' ? (
        renderSelectorInput('triggerSelector', '触发元素选择器', 'a.download-btn')
      ) : (
        <div className="space-y-2">
          <Label htmlFor="downloadUrl">下载URL</Label>
          <VariableInput
            value={(data.downloadUrl as string) || ''}
            onChange={(v) => onChange('downloadUrl', v)}
            placeholder="https://example.com/file.zip，支持 {变量名}"
          />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="savePath">保存目录（可选）</Label>
        <PathInput
          value={(data.savePath as string) || ''}
          onChange={(v) => onChange('savePath', v)}
          placeholder="留空则保存到默认目录"
          type="folder"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="fileName">文件名（可选）</Label>
        <VariableInput
          value={(data.fileName as string) || ''}
          onChange={(v) => onChange('fileName', v)}
          placeholder="留空则使用原文件名，支持 {变量名}"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="variableName">存储路径到变量</Label>
        <VariableNameInput
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="保存文件路径的变量名"
          isStorageVariable={true}
        />
      </div>
    </>
  )
}


// 保存图片配置
export function SaveImageConfig({
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
      {renderSelectorInput('selector', '图片元素选择器', 'img.target')}
      <div className="space-y-2">
        <Label htmlFor="savePath">保存路径（可选）</Label>
        <PathInput
          value={(data.savePath as string) || ''}
          onChange={(v) => onChange('savePath', v)}
          placeholder="完整路径如 C:\images\pic.png"
          type="file"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="variableName">存储路径到变量</Label>
        <VariableNameInput
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="保存文件路径的变量名"
          isStorageVariable={true}
        />
      </div>
    </>
  )
}

// 获取子元素列表配置
export function GetChildElementsConfig({
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
      {renderSelectorInput('parentSelector', '父元素选择器', 'div.parent')}
      <div className="space-y-2">
        <Label htmlFor="childSelector">子元素过滤器（可选）</Label>
        <VariableInput
          value={(data.childSelector as string) || '*'}
          onChange={(v) => onChange('childSelector', v || '*')}
          placeholder="* 表示所有子元素，或指定如 div, .class 等"
        />
        <p className="text-xs text-muted-foreground">
          使用 * 获取所有直接子元素，或指定标签/类名进行过滤
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="variableName">存储到变量</Label>
        <VariableNameInput
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="存储子元素选择器列表的变量名"
          isStorageVariable={true}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        获取父元素下的所有子元素选择器，以列表形式存储
      </p>
    </>
  )
}

// 获取兄弟元素列表配置
export function GetSiblingElementsConfig({
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
      {renderSelectorInput('elementSelector', '元素选择器', 'div.target')}
      <div className="space-y-2">
        <Label htmlFor="siblingType">兄弟元素类型</Label>
        <Select
          id="siblingType"
          value={(data.siblingType as string) || 'all'}
          onChange={(e) => onChange('siblingType', e.target.value)}
        >
          <option value="all">所有兄弟元素</option>
          <option value="previous">前面的兄弟元素</option>
          <option value="next">后面的兄弟元素</option>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="includeSelf"
          checked={(data.includeSelf as boolean) ?? false}
          onCheckedChange={(checked) => onChange('includeSelf', checked)}
        />
        <Label htmlFor="includeSelf" className="cursor-pointer">包含自身</Label>
      </div>
      <div className="space-y-2">
        <Label htmlFor="variableName">存储到变量</Label>
        <VariableNameInput
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="存储兄弟元素选择器列表的变量名"
          isStorageVariable={true}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        获取指定元素的同级兄弟元素选择器，以列表形式存储
      </p>
    </>
  )
}

// 截图配置
export function ScreenshotConfig({
  data,
  onChange,
  renderSelectorInput
}: {
  data: NodeData
  onChange: (key: string, value: unknown) => void
  renderSelectorInput: RenderSelectorInput
}) {
  const screenshotType = (data.screenshotType as string) || 'fullpage'
  
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="screenshotType">截图类型</Label>
        <Select
          id="screenshotType"
          value={screenshotType}
          onChange={(e) => onChange('screenshotType', e.target.value)}
        >
          <option value="fullpage">整个页面</option>
          <option value="viewport">可视区域</option>
          <option value="element">指定元素</option>
        </Select>
      </div>
      {screenshotType === 'element' && renderSelectorInput('selector', '元素选择器', '#target')}
      <div className="space-y-2">
        <Label htmlFor="savePath">保存路径</Label>
        <PathInput
          value={(data.savePath as string) || ''}
          onChange={(v) => onChange('savePath', v)}
          placeholder="C:\screenshots\page.png"
          type="file"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="variableName">存储路径到变量</Label>
        <VariableNameInput
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="保存文件路径的变量名"
          isStorageVariable={true}
        />
      </div>
    </>
  )
}

// OCR验证码配置
export function OCRCaptchaConfig({
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
      {renderSelectorInput('imageSelector', '验证码图片选择器', 'img.captcha')}
      <div className="space-y-2">
        <Label htmlFor="variableName">存储识别结果到变量</Label>
        <VariableNameInput
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="存储识别出的验证码"
          isStorageVariable={true}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        使用OCR技术识别图片验证码中的文字
      </p>
    </>
  )
}

// 滑块验证码配置
export function SliderCaptchaConfig({
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
      {renderSelectorInput('sliderSelector', '滑块选择器', '.slider-btn')}
      {renderSelectorInput('trackSelector', '滑轨选择器', '.slider-track')}
      <div className="space-y-2">
        <Label htmlFor="targetDistance">滑动距离</Label>
        <VariableInput
          value={String(data.targetDistance ?? '')}
          onChange={(v) => {
            if (v === '' || v.includes('{')) {
              onChange('targetDistance', v)
            } else {
              const num = parseInt(v)
              onChange('targetDistance', isNaN(num) ? v : num)
            }
          }}
          placeholder="滑动像素距离，支持 {变量名}"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        模拟人工滑动滑块验证码
      </p>
    </>
  )
}


// 发送邮件配置
export function SendEmailConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="senderEmail">发件人邮箱</Label>
        <VariableInput
          value={(data.senderEmail as string) || ''}
          onChange={(v) => onChange('senderEmail', v)}
          placeholder="your@qq.com，支持 {变量名}"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="authCode">授权码</Label>
        <VariableInput
          value={(data.authCode as string) || ''}
          onChange={(v) => onChange('authCode', v)}
          placeholder="邮箱SMTP授权码，支持 {变量名}"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="recipientEmail">收件人邮箱</Label>
        <VariableInput
          value={(data.recipientEmail as string) || ''}
          onChange={(v) => onChange('recipientEmail', v)}
          placeholder="recipient@example.com，支持 {变量名}"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="emailSubject">邮件主题</Label>
        <VariableInput
          value={(data.emailSubject as string) || ''}
          onChange={(v) => onChange('emailSubject', v)}
          placeholder="邮件标题，支持 {变量名}"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="emailContent">邮件内容</Label>
        <VariableInput
          value={(data.emailContent as string) || ''}
          onChange={(v) => onChange('emailContent', v)}
          placeholder="邮件正文，支持 {变量名}"
          multiline
          rows={4}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        目前支持QQ邮箱，需要在邮箱设置中开启SMTP服务并获取授权码
      </p>
    </>
  )
}

// 设置剪贴板配置
export function SetClipboardConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  const contentType = (data.contentType as string) || 'text'
  
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="contentType">内容类型</Label>
        <Select
          id="contentType"
          value={contentType}
          onChange={(e) => onChange('contentType', e.target.value)}
        >
          <option value="text">文本</option>
          <option value="image">图片</option>
        </Select>
      </div>
      {contentType === 'text' ? (
        <div className="space-y-2">
          <Label htmlFor="textContent">文本内容</Label>
          <VariableInput
            value={(data.textContent as string) || ''}
            onChange={(v) => onChange('textContent', v)}
            placeholder="要复制到剪贴板的文本，支持 {变量名}"
            multiline
            rows={3}
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="imagePath">图片路径</Label>
          <ImagePathInput
            value={(data.imagePath as string) || ''}
            onChange={(v) => onChange('imagePath', v)}
          />
        </div>
      )}
    </>
  )
}

// 获取剪贴板配置
export function GetClipboardConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="variableName">存储到变量</Label>
        <VariableNameInput
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="存储剪贴板内容的变量名"
          isStorageVariable={true}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        获取系统剪贴板中的文本内容
      </p>
    </>
  )
}

// 键盘操作配置
export function KeyboardActionConfig({
  data,
  onChange,
  renderSelectorInput
}: {
  data: NodeData
  onChange: (key: string, value: unknown) => void
  renderSelectorInput: RenderSelectorInput
}) {
  const targetType = (data.targetType as string) || 'page'
  const pressMode = (data.pressMode as string) || 'click'
  
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="targetType">目标类型</Label>
        <Select
          id="targetType"
          value={targetType}
          onChange={(e) => onChange('targetType', e.target.value)}
        >
          <option value="page">整个页面</option>
          <option value="element">指定元素</option>
        </Select>
      </div>
      {targetType === 'element' && renderSelectorInput('selector', '元素选择器', '#input')}
      <div className="space-y-2">
        <Label htmlFor="keySequence">按键序列</Label>
        <VariableInput
          value={(data.keySequence as string) || ''}
          onChange={(v) => onChange('keySequence', v)}
          placeholder="如: Enter, Ctrl+A, Ctrl+Shift+S"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pressMode">按键模式</Label>
        <Select
          id="pressMode"
          value={pressMode}
          onChange={(e) => onChange('pressMode', e.target.value)}
        >
          <option value="click">点击（按下后立即释放）</option>
          <option value="hold">长按</option>
        </Select>
      </div>
      {pressMode === 'hold' && (
        <div className="space-y-2">
          <Label htmlFor="holdDuration">长按时长(秒)</Label>
          <NumberInput
            id="holdDuration"
            value={(data.holdDuration as number) ?? 1}
            onChange={(v) => onChange('holdDuration', v)}
            defaultValue={1}
            min={0.1}
            step={0.1}
          />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="delay">按键延迟(秒)</Label>
        <NumberInput
          id="delay"
          value={(data.delay as number) ?? 0}
          onChange={(v) => onChange('delay', v)}
          defaultValue={0}
          min={0}
          step={0.1}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        使用 + 连接组合键，如 Ctrl+C
      </p>
    </>
  )
}


// 真实鼠标滚动配置
export function RealMouseScrollConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="direction">滚动方向</Label>
        <Select
          id="direction"
          value={(data.direction as string) || 'down'}
          onChange={(e) => onChange('direction', e.target.value)}
        >
          <option value="down">向下</option>
          <option value="up">向上</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="scrollAmount">每次滚动格数</Label>
        <NumberInput
          id="scrollAmount"
          value={(data.scrollAmount as number) ?? 3}
          onChange={(v) => onChange('scrollAmount', v)}
          defaultValue={3}
          min={1}
          max={20}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="scrollCount">滚动次数</Label>
        <NumberInput
          id="scrollCount"
          value={(data.scrollCount as number) ?? 1}
          onChange={(v) => onChange('scrollCount', v)}
          defaultValue={1}
          min={1}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="scrollInterval">滚动间隔(秒)</Label>
        <NumberInput
          id="scrollInterval"
          value={(data.scrollInterval as number) ?? 0.1}
          onChange={(v) => onChange('scrollInterval', v)}
          defaultValue={0.1}
          min={0}
          step={0.01}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        使用系统级鼠标滚轮模拟，适用于需要真实滚动事件的场景
      </p>
    </>
  )
}

// 关机/重启配置
export function ShutdownSystemConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="action">操作类型</Label>
        <Select
          id="action"
          value={(data.action as string) || 'shutdown'}
          onChange={(e) => onChange('action', e.target.value)}
        >
          <option value="shutdown">关机</option>
          <option value="restart">重启</option>
          <option value="logout">注销</option>
          <option value="hibernate">休眠</option>
          <option value="sleep">睡眠</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="delay">延迟时间 (秒)</Label>
        <NumberInput
          id="delay"
          value={(data.delay as number) ?? 0}
          onChange={(v) => onChange('delay', v)}
          defaultValue={0}
          min={0}
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="force"
          checked={(data.force as boolean) ?? false}
          onChange={(e) => onChange('force', e.target.checked)}
          className="rounded"
        />
        <Label htmlFor="force" className="cursor-pointer">强制执行（不等待程序关闭）</Label>
      </div>
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-xs text-amber-800">
          请确保已保存所有工作，此操作将影响整个系统
        </p>
      </div>
    </>
  )
}

// 锁定屏幕配置
export function LockScreenConfig() {
  return (
    <p className="text-xs text-muted-foreground">
      执行此模块将立即锁定Windows屏幕，相当于按 Win+L
    </p>
  )
}

// 窗口聚焦配置
export function WindowFocusConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="windowTitle">窗口标题</Label>
        <VariableInput
          value={(data.windowTitle as string) || ''}
          onChange={(v) => onChange('windowTitle', v)}
          placeholder="输入窗口标题，支持 {变量名}"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="matchMode">匹配模式</Label>
        <Select
          id="matchMode"
          value={(data.matchMode as string) || 'contains'}
          onChange={(e) => onChange('matchMode', e.target.value)}
        >
          <option value="contains">包含（模糊匹配）</option>
          <option value="exact">精确匹配</option>
          <option value="startswith">前缀匹配</option>
        </Select>
        <p className="text-xs text-muted-foreground">
          包含：标题中包含关键词即可匹配<br/>
          精确：标题必须完全一致<br/>
          前缀：标题以关键词开头
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        将匹配的窗口置顶到最前面并激活
      </p>
    </>
  )
}

// 真实鼠标点击配置
export function RealMouseClickConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  const clickType = (data.clickType as string) || 'single'
  
  return (
    <>
      <div className="space-y-2">
        <Label>点击坐标</Label>
        <CoordinateInput
          xValue={(data.x as string) || ''}
          yValue={(data.y as string) || ''}
          onXChange={(v) => onChange('x', v)}
          onYChange={(v) => onChange('y', v)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="button">鼠标按键</Label>
        <Select
          id="button"
          value={(data.button as string) || 'left'}
          onChange={(e) => onChange('button', e.target.value)}
        >
          <option value="left">左键</option>
          <option value="right">右键</option>
          <option value="middle">中键</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="clickType">点击类型</Label>
        <Select
          id="clickType"
          value={clickType}
          onChange={(e) => onChange('clickType', e.target.value)}
        >
          <option value="single">单击</option>
          <option value="double">双击</option>
          <option value="hold">长按</option>
        </Select>
      </div>
      {clickType === 'hold' && (
        <div className="space-y-2">
          <Label htmlFor="holdDuration">长按时长(秒)</Label>
          <NumberInput
            id="holdDuration"
            value={(data.holdDuration as number) ?? 1}
            onChange={(v) => onChange('holdDuration', v)}
            defaultValue={1}
            min={0.1}
            step={0.1}
          />
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        使用系统级鼠标点击，适用于需要真实点击事件的场景
      </p>
    </>
  )
}

// 真实鼠标移动配置
export function RealMouseMoveConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label>目标坐标</Label>
        <CoordinateInput
          xValue={(data.x as string) || ''}
          yValue={(data.y as string) || ''}
          onXChange={(v) => onChange('x', v)}
          onYChange={(v) => onChange('y', v)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="duration">移动时长(秒)</Label>
        <NumberInput
          id="duration"
          value={(data.duration as number) ?? 0}
          onChange={(v) => onChange('duration', v)}
          defaultValue={0}
          min={0}
          step={0.1}
        />
        <p className="text-xs text-muted-foreground">
          设为0则瞬间移动，大于0则平滑移动
        </p>
      </div>
    </>
  )
}

// 真实鼠标拖拽配置
export function RealMouseDragConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label>起点坐标</Label>
        <CoordinateInput
          xValue={(data.startX as string) || ''}
          yValue={(data.startY as string) || ''}
          onXChange={(v) => onChange('startX', v)}
          onYChange={(v) => onChange('startY', v)}
        />
      </div>
      <div className="space-y-2">
        <Label>终点坐标</Label>
        <CoordinateInput
          xValue={(data.endX as string) || ''}
          yValue={(data.endY as string) || ''}
          onXChange={(v) => onChange('endX', v)}
          onYChange={(v) => onChange('endY', v)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="button">鼠标按键</Label>
        <Select
          id="button"
          value={(data.button as string) || 'left'}
          onChange={(e) => onChange('button', e.target.value)}
        >
          <option value="left">左键</option>
          <option value="right">右键</option>
          <option value="middle">中键</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="duration">拖拽时长(秒)</Label>
        <NumberInput
          id="duration"
          value={(data.duration as number) ?? 0.5}
          onChange={(v) => onChange('duration', v)}
          defaultValue={0.5}
          min={0.1}
          step={0.1}
        />
        <p className="text-xs text-muted-foreground">
          拖拽过程的持续时间，值越大移动越慢
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        从起点长按鼠标拖拽到终点，适用于拖放操作、滑块验证等场景
      </p>
    </>
  )
}


// 真实键盘操作配置
export function RealKeyboardConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  const inputType = (data.inputType as string) || 'text'
  const pressMode = (data.pressMode as string) || 'click'
  const keyInputMode = (data.keyInputMode as string) || 'preset' // preset 或 custom
  
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="inputType">输入类型</Label>
        <Select
          id="inputType"
          value={inputType}
          onChange={(e) => onChange('inputType', e.target.value)}
        >
          <option value="text">输入文本</option>
          <option value="key">单个按键</option>
          <option value="hotkey">组合键</option>
        </Select>
      </div>
      {inputType === 'text' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="realKeyboardText">输入文本</Label>
            <VariableInput
              id="realKeyboardText"
              value={(data.text as string) || ''}
              onChange={(v) => onChange('text', v)}
              placeholder="要输入的文本，支持 {变量名}"
              multiline
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="interval">按键间隔(秒)</Label>
            <NumberInput
              id="interval"
              value={(data.interval as number) ?? 0.05}
              onChange={(v) => onChange('interval', v)}
              defaultValue={0.05}
              min={0}
              step={0.01}
            />
          </div>
        </>
      )}
      {inputType === 'key' && (
        <>
          <div className="space-y-2">
            <Label>按键输入方式</Label>
            <div className="flex gap-2">
              <button
                type="button"
                className={`flex-1 px-3 py-1.5 text-sm rounded-md border ${keyInputMode === 'preset' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white border-gray-300 hover:bg-gray-50'}`}
                onClick={() => onChange('keyInputMode', 'preset')}
              >
                预设按键
              </button>
              <button
                type="button"
                className={`flex-1 px-3 py-1.5 text-sm rounded-md border ${keyInputMode === 'custom' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white border-gray-300 hover:bg-gray-50'}`}
                onClick={() => onChange('keyInputMode', 'custom')}
              >
                自定义
              </button>
            </div>
          </div>
          {keyInputMode === 'preset' ? (
            <div className="space-y-2">
              <Label htmlFor="key">选择按键</Label>
              <Select
                id="key"
                value={(data.key as string) || 'enter'}
                onChange={(e) => onChange('key', e.target.value)}
              >
                <optgroup label="常用键">
                  <option value="enter">Enter 回车</option>
                  <option value="tab">Tab 制表符</option>
                  <option value="escape">Escape 退出</option>
                  <option value="backspace">Backspace 退格</option>
                  <option value="delete">Delete 删除</option>
                  <option value="space">Space 空格</option>
                </optgroup>
                <optgroup label="方向键">
                  <option value="up">↑ 上</option>
                  <option value="down">↓ 下</option>
                  <option value="left">← 左</option>
                  <option value="right">→ 右</option>
                  <option value="home">Home</option>
                  <option value="end">End</option>
                  <option value="pageup">Page Up</option>
                  <option value="pagedown">Page Down</option>
                </optgroup>
                <optgroup label="功能键">
                  <option value="f1">F1</option>
                  <option value="f2">F2</option>
                  <option value="f3">F3</option>
                  <option value="f4">F4</option>
                  <option value="f5">F5</option>
                  <option value="f6">F6</option>
                  <option value="f7">F7</option>
                  <option value="f8">F8</option>
                  <option value="f9">F9</option>
                  <option value="f10">F10</option>
                  <option value="f11">F11</option>
                  <option value="f12">F12</option>
                </optgroup>
                <optgroup label="修饰键">
                  <option value="ctrl">Ctrl</option>
                  <option value="alt">Alt</option>
                  <option value="shift">Shift</option>
                  <option value="win">Win</option>
                </optgroup>
                <optgroup label="字母键">
                  <option value="a">A</option>
                  <option value="b">B</option>
                  <option value="c">C</option>
                  <option value="d">D</option>
                  <option value="e">E</option>
                  <option value="f">F</option>
                  <option value="g">G</option>
                  <option value="h">H</option>
                  <option value="i">I</option>
                  <option value="j">J</option>
                  <option value="k">K</option>
                  <option value="l">L</option>
                  <option value="m">M</option>
                  <option value="n">N</option>
                  <option value="o">O</option>
                  <option value="p">P</option>
                  <option value="q">Q</option>
                  <option value="r">R</option>
                  <option value="s">S</option>
                  <option value="t">T</option>
                  <option value="u">U</option>
                  <option value="v">V</option>
                  <option value="w">W</option>
                  <option value="x">X</option>
                  <option value="y">Y</option>
                  <option value="z">Z</option>
                </optgroup>
                <optgroup label="数字键">
                  <option value="0">0</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                  <option value="6">6</option>
                  <option value="7">7</option>
                  <option value="8">8</option>
                  <option value="9">9</option>
                </optgroup>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="key">按键名称</Label>
              <VariableInput
                value={(data.key as string) || ''}
                onChange={(v) => onChange('key', v)}
                placeholder="如: f6, a, enter, space，支持 {变量名}"
              />
              <p className="text-xs text-muted-foreground">
                支持: a-z, 0-9, f1-f12, enter, tab, escape, backspace, delete, space, up, down, left, right, home, end, pageup, pagedown, ctrl, alt, shift, win
              </p>
            </div>
          )}
        </>
      )}
      {inputType === 'hotkey' && (
        <div className="space-y-2">
          <Label htmlFor="hotkey">组合键</Label>
          <VariableInput
            value={(data.hotkey as string) || ''}
            onChange={(v) => onChange('hotkey', v)}
            placeholder="如: ctrl+c, ctrl+shift+s, alt+f4，支持 {变量名}"
          />
          <p className="text-xs text-muted-foreground">
            使用 + 连接多个按键，支持: ctrl, alt, shift, win + 任意按键
          </p>
        </div>
      )}
      {(inputType === 'key' || inputType === 'hotkey') && (
        <>
          <div className="space-y-2">
            <Label htmlFor="pressMode">按键模式</Label>
            <Select
              id="pressMode"
              value={pressMode}
              onChange={(e) => onChange('pressMode', e.target.value)}
            >
              <option value="click">点击（按下后立即释放）</option>
              <option value="hold">长按</option>
            </Select>
          </div>
          {pressMode === 'hold' && (
            <div className="space-y-2">
              <Label htmlFor="holdDuration">长按时长(秒)</Label>
              <NumberInput
                id="holdDuration"
                value={(data.holdDuration as number) ?? 1}
                onChange={(v) => onChange('holdDuration', v)}
                defaultValue={1}
                min={0.1}
                step={0.1}
              />
            </div>
          )}
        </>
      )}
      <div className="space-y-2 pt-2 border-t border-border">
        <Label htmlFor="windowTitle">目标窗口标题（可选）</Label>
        <VariableInput
          value={(data.windowTitle as string) || ''}
          onChange={(v) => onChange('windowTitle', v)}
          placeholder="如: 记事本 / Edge / 微信，发送前先激活该窗口到前台"
        />
        <p className="text-xs text-muted-foreground">
          硬件按键只会进入当前前台窗口。填写后会在发送前把标题包含该文字的窗口激活到前台，
          避免按键被打进 WebRPA 自己的窗口。留空则发往当前前台窗口。
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        使用系统级键盘输入，适用于需要真实键盘事件的场景
      </p>
    </>
  )
}

// 执行命令配置
export function RunCommandConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="command">命令</Label>
        <VariableInput
          value={(data.command as string) || ''}
          onChange={(v) => onChange('command', v)}
          placeholder="要执行的命令，支持 {变量名}"
          multiline
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="shell">执行环境</Label>
        <Select
          id="shell"
          value={(data.shell as string) || 'cmd'}
          onChange={(e) => onChange('shell', e.target.value)}
        >
          <option value="cmd">CMD</option>
          <option value="powershell">PowerShell</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="timeout">超时时间 (秒)</Label>
        <NumberInput
          id="timeout"
          value={(data.timeout as number) ?? 30}
          onChange={(v) => onChange('timeout', v)}
          defaultValue={30}
          min={1}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="variableName">存储输出到变量</Label>
        <VariableNameInput
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="存储命令输出的变量名"
          isStorageVariable={true}
        />
      </div>
    </>
  )
}


// 点击图像配置
export function ClickImageConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  const [useSearchRegion, setUseSearchRegion] = useState(
    !!(data.searchRegion && ((data.searchRegion as Record<string, number>).x2 >0 || (data.searchRegion as Record<string, number>).y2 > 0))
  )
  
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="imagePath">图像路径</Label>
        <ImagePathInput
          value={(data.imagePath as string) || ''}
          onChange={(v) => onChange('imagePath', v)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confidence">匹配精度</Label>
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
          值越高匹配越精确，但可能找不到
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
          限定区域可提高识别速度
        </p>
      </div>
      
      {useSearchRegion && (
        <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
          <DualCoordinateInput
            label="左上角坐标"
            xValue={(data.searchRegion as Record<string, number>)?.x ?? 0}
            yValue={(data.searchRegion as Record<string, number>)?.y ?? 0}
            onXChange={(v) => onChange('searchRegion', { ...(data.searchRegion as object || {}), x: v })}
            onYChange={(v) => onChange('searchRegion', { ...(data.searchRegion as object || {}), y: v })}
            onBothChange={(x, y) => onChange('searchRegion', { ...(data.searchRegion as object || {}), x, y })}
          />
          <DualCoordinateInput
            label="右下角坐标"
            xValue={(data.searchRegion as Record<string, number>)?.x2 ?? 0}
            yValue={(data.searchRegion as Record<string, number>)?.y2 ?? 0}
            onXChange={(v) => onChange('searchRegion', { ...(data.searchRegion as object || {}), x2: v })}
            onYChange={(v) => onChange('searchRegion', { ...(data.searchRegion as object || {}), y2: v })}
            onBothChange={(x, y) => onChange('searchRegion', { ...(data.searchRegion as object || {}), x2: x, y2: y })}
          />
          <p className="text-xs text-muted-foreground">
            通过左上角和右下角两点确定搜索区域
          </p>
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="clickPosition">点击位置</Label>
        <Select
          id="clickPosition"
          value={(data.clickPosition as string) || 'center'}
          onChange={(e) => onChange('clickPosition', e.target.value)}
        >
          <option value="center">中心</option>
          <option value="top-left">左上角</option>
          <option value="top-right">右上角</option>
          <option value="bottom-left">左下角</option>
          <option value="bottom-right">右下角</option>
          <option value="top">顶部</option>
          <option value="bottom">底部</option>
          <option value="left">左侧</option>
          <option value="right">右侧</option>
          <option value="random">随机位置（绕过AI检测）</option>
        </Select>
      </div>
      
      {/* 偏移量设置 */}
      <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
        <div className="space-y-2">
          <Label htmlFor="offsetX">横向偏移量 (像素)</Label>
          <NumberInput
            id="offsetX"
            value={(data.offsetX as number) ?? 0}
            onChange={(v) => {
              console.log('[ClickImageConfig] offsetX onChange called with:', v, 'type:', typeof v)
              onChange('offsetX', v)
            }}
            defaultValue={0}
          />
          <p className="text-xs text-muted-foreground">正值向右偏移，负值向左偏移</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="offsetY">纵向偏移量 (像素)</Label>
          <NumberInput
            id="offsetY"
            value={(data.offsetY as number) ?? 0}
            onChange={(v) => {
              console.log('[ClickImageConfig] offsetY onChange called with:', v, 'type:', typeof v)
              onChange('offsetY', v)
            }}
            defaultValue={0}
          />
          <p className="text-xs text-muted-foreground">正值向下偏移，负值向上偏移</p>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="button">鼠标按键</Label>
        <Select
          id="button"
          value={(data.button as string) || 'left'}
          onChange={(e) => onChange('button', e.target.value)}
        >
          <option value="left">左键</option>
          <option value="right">右键</option>
          <option value="middle">中键</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="clickType">点击类型</Label>
        <Select
          id="clickType"
          value={(data.clickType as string) || 'single'}
          onChange={(e) => onChange('clickType', e.target.value)}
        >
          <option value="single">单击</option>
          <option value="double">双击</option>
          <option value="hold">长按</option>
        </Select>
      </div>
      {(data.clickType as string) === 'hold' && (
        <div className="space-y-2">
          <Label htmlFor="holdDuration">长按时长(秒)</Label>
          <NumberInput
            id="holdDuration"
            value={(data.holdDuration as number) ?? 1}
            onChange={(v) => onChange('holdDuration', v)}
            defaultValue={1}
            min={0.1}
            max={10}
            step={0.1}
          />
          <p className="text-xs text-muted-foreground">按住鼠标的持续时间</p>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="waitTimeout">等待超时 (秒)</Label>
        <NumberInput
          id="waitTimeout"
          value={(data.waitTimeout as number) ?? 10}
          onChange={(v) => onChange('waitTimeout', v)}
          defaultValue={10}
          min={1}
        />
      </div>
    </>
  )
}

// 获取鼠标位置配置
export function GetMousePositionConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="variableNameX">X坐标变量名</Label>
        <VariableNameInput
          value={(data.variableNameX as string) || ''}
          onChange={(v) => onChange('variableNameX', v)}
          placeholder="存储X坐标的变量名"
          isStorageVariable={true}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="variableNameY">Y坐标变量名</Label>
        <VariableNameInput
          value={(data.variableNameY as string) || ''}
          onChange={(v) => onChange('variableNameY', v)}
          placeholder="存储Y坐标的变量名"
          isStorageVariable={true}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        获取当前鼠标在屏幕上的位置坐标
      </p>
    </>
  )
}

// 屏幕截图配置
export function ScreenshotScreenConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  const region = (data.region as string) || 'full'
  
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="region">截图区域</Label>
        <Select
          id="region"
          value={region}
          onChange={(e) => onChange('region', e.target.value)}
        >
          <option value="full">全屏</option>
          <option value="custom">自定义区域</option>
        </Select>
      </div>
      {region === 'custom' && (
        <>
          <div className="space-y-2">
            <Label>起始坐标 (左上角)</Label>
            <CoordinateInput
              xValue={String(data.x1 ?? '')}
              yValue={String(data.y1 ?? '')}
              onXChange={(v) => onChange('x1', v ? parseInt(v) : 0)}
              onYChange={(v) => onChange('y1', v ? parseInt(v) : 0)}
            />
          </div>
          <div className="space-y-2">
            <Label>结束坐标 (右下角)</Label>
            <CoordinateInput
              xValue={String(data.x2 ?? '')}
              yValue={String(data.y2 ?? '')}
              onXChange={(v) => onChange('x2', v ? parseInt(v) : 800)}
              onYChange={(v) => onChange('y2', v ? parseInt(v) : 600)}
            />
          </div>
        </>
      )}
      <div className="space-y-2">
        <Label htmlFor="savePath">保存目录（可选）</Label>
        <PathInput
          value={(data.savePath as string) || ''}
          onChange={(v) => onChange('savePath', v)}
          placeholder="留空则保存到默认目录"
          type="folder"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="fileName">文件名（可选）</Label>
        <VariableInput
          value={(data.fileName as string) || ''}
          onChange={(v) => onChange('fileName', v)}
          placeholder="留空则自动生成，支持 {变量名}"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="variableName">存储路径到变量</Label>
        <VariableNameInput
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="保存文件路径的变量名"
          isStorageVariable={true}
        />
      </div>
    </>
  )
}

// 文件重命名配置
export function RenameFileConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="sourcePath">源文件路径</Label>
        <PathInput
          value={(data.sourcePath as string) || ''}
          onChange={(v) => onChange('sourcePath', v)}
          placeholder="要重命名的文件路径"
          type="file"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="newName">新文件名</Label>
        <VariableInput
          value={(data.newName as string) || ''}
          onChange={(v) => onChange('newName', v)}
          placeholder="新的文件名（含扩展名），支持 {变量名}"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="variableName">存储新路径到变量</Label>
        <VariableNameInput
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="保存新文件路径的变量名"
          isStorageVariable={true}
        />
      </div>
    </>
  )
}

// 网络抓包配置
export function NetworkCaptureConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  const captureMode = (data.captureMode as string) || 'browser'
  
  // 获取本机IP的提示
  const getProxyTip = () => {
    const port = (data.proxyPort as number) || 8888
    return `在模拟器/手机的WiFi设置中配置代理：代理地址填写本机IP，端口填写 ${port}`
  }
  
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="captureMode">抓包模式</Label>
        <Select
          id="captureMode"
          value={captureMode}
          onChange={(e) => onChange('captureMode', e.target.value)}
        >
          <option value="browser">浏览器抓包</option>
          <option value="system">全局系统抓包</option>
          <option value="proxy">代理抓包（模拟器/手机）</option>
        </Select>
        <p className="text-xs text-muted-foreground">
          {captureMode === 'browser' && '监听浏览器页面的网络请求，需要先打开网页'}
          {captureMode === 'system' && '监控整个系统的网络连接，可按进程/端口过滤'}
          {captureMode === 'proxy' && '通过HTTP代理抓取模拟器/手机APP的网络请求'}
        </p>
      </div>
      
      {/* 代理抓包模式配置 */}
      {captureMode === 'proxy' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="proxyPort">代理端口</Label>
            <NumberInput
              id="proxyPort"
              value={(data.proxyPort as number) ?? 8888}
              onChange={(v) => onChange('proxyPort', v)}
              defaultValue={8888}
              min={1024}
              max={65535}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filterType">过滤类型</Label>
            <Select
              id="filterType"
              value={(data.filterType as string) || 'all'}
              onChange={(e) => onChange('filterType', e.target.value)}
            >
              <option value="all">全部请求</option>
              <option value="m3u8">仅m3u8（视频流）</option>
              <option value="media">仅媒体（视频/音频）</option>
              <option value="img">仅图片</option>
            </Select>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
            <p className="text-xs font-medium text-blue-800">代理配置说明</p>
            <p className="text-xs text-blue-700">{getProxyTip()}</p>
            <p className="text-xs text-blue-600">
              MuMu模拟器：设置 → WiFi → 长按已连接网络 → 修改网络 → 高级选项 → 代理 → 手动
            </p>
            <p className="text-xs text-blue-600">
              首次使用需要在模拟器/手机浏览器访问 mitm.it 安装证书以支持HTTPS抓包
            </p>
          </div>
        </>
      )}
      
      {/* 浏览器抓包模式配置 */}
      {captureMode === 'browser' && (
        <div className="space-y-2">
          <Label htmlFor="filterType">过滤类型</Label>
          <Select
            id="filterType"
            value={(data.filterType as string) || 'all'}
            onChange={(e) => onChange('filterType', e.target.value)}
          >
            <option value="all">全部请求</option>
            <option value="img">仅图片</option>
            <option value="media">仅媒体（视频/音频）</option>
          </Select>
        </div>
      )}
      
      {/* 系统抓包模式配置 */}
      {captureMode === 'system' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="targetProcess">目标进程名（可选）</Label>
            <VariableInput
              value={(data.targetProcess as string) || ''}
              onChange={(v) => onChange('targetProcess', v)}
              placeholder="如: chrome.exe，支持模糊匹配"
            />
            <p className="text-xs text-muted-foreground">
              留空则监控所有进程
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="targetPorts">目标端口（可选）</Label>
            <VariableInput
              value={(data.targetPorts as string) || ''}
              onChange={(v) => onChange('targetPorts', v)}
              placeholder="如: 80,443,8080 多个用逗号分隔"
            />
            <p className="text-xs text-muted-foreground">
              留空则监控所有端口，常用: 80(HTTP), 443(HTTPS)
            </p>
          </div>
        </>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="searchKeyword">关键词过滤（可选）</Label>
        <VariableInput
          value={(data.searchKeyword as string) || ''}
          onChange={(v) => onChange('searchKeyword', v)}
          placeholder={
            captureMode === 'browser' ? "模糊匹配URL" : 
            captureMode === 'proxy' ? "模糊匹配URL，如: .m3u8" :
            "模糊匹配IP/进程名"
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="captureDuration">抓包时长(秒)</Label>
        <NumberInput
          id="captureDuration"
          value={(data.captureDuration as number) ?? 5}
          onChange={(v) => onChange('captureDuration', v)}
          defaultValue={5}
          min={1}
          step={0.1}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="variableName">存储结果到变量</Label>
        <VariableNameInput
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="存储捕获结果的变量名"
          isStorageVariable={true}
        />
        <p className="text-xs text-muted-foreground">
          {captureMode === 'browser' && '结果为URL列表'}
          {captureMode === 'proxy' && '结果为URL列表，可配合循环模块遍历处理'}
          {captureMode === 'system' && '结果为连接信息列表，包含 remote_ip, remote_port, process 等字段'}
        </p>
      </div>
    </>
  )
}

// 宏录制器配置
export function MacroRecorderConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  const [recordedActions, setRecordedActions] = useState<MacroAction[]>([])
  const [showRecordDialog, setShowRecordDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  
  // 解析已保存的录制数据
  useEffect(() => {
    const savedData = data.recordedData as string
    if (savedData) {
      try {
        const actions = JSON.parse(savedData)
        setRecordedActions(actions)
      } catch {
        // 忽略解析错误
      }
    }
  }, [data.recordedData])

  // 统计信息
  const stats = useMemo(() => {
    const moveCount = recordedActions.filter(a => a.type === 'mouse_move').length
    const clickCount = recordedActions.filter(a => a.type === 'mouse_click').length
    const keyCount = recordedActions.filter(a => a.type === 'key_press' || a.type === 'key_char').length
    const scrollCount = recordedActions.filter(a => a.type === 'mouse_scroll').length
    
    // 计算拖拽次数（按下后有移动再释放）
    let dragCount = 0
    let isMouseDown = false
    let hasMoved = false
    for (const action of recordedActions) {
      if (action.type === 'mouse_click' && action.pressed) {
        isMouseDown = true
        hasMoved = false
      } else if (action.type === 'mouse_move' && isMouseDown) {
        hasMoved = true
      } else if (action.type === 'mouse_click' && !action.pressed && isMouseDown) {
        if (hasMoved) {
          dragCount++
        }
        isMouseDown = false
        hasMoved = false
      }
    }
    
    const duration = recordedActions.length > 0 
      ? (recordedActions[recordedActions.length - 1].time - recordedActions[0].time) / 1000 
      : 0
    return { moveCount, clickCount, keyCount, scrollCount, dragCount, duration, total: recordedActions.length }
  }, [recordedActions])

  // 保存操作
  const saveActions = (actions: MacroAction[]) => {
    setRecordedActions(actions)
    onChange('recordedData', JSON.stringify(actions))
  }

  return (
    <>
      {/* 录制数据显示 */}
      <div className="space-y-2">
        <Label>录制数据</Label>
        <div className="p-3 bg-muted rounded-md text-sm">
          {recordedActions.length > 0 ? (
            <div className="space-y-1">
              <div className="font-medium">已录制 {stats.total} 个动作</div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                {stats.moveCount >0 &&<div>• 鼠标移动: {stats.moveCount} 次</div>}
                {stats.clickCount >0 &&<div>• 鼠标点击: {stats.clickCount} 次</div>}
                {stats.dragCount >0 &&<div>• 鼠标拖拽: {stats.dragCount} 次</div>}
                {stats.scrollCount >0 &&<div>• 鼠标滚动: {stats.scrollCount} 次</div>}
                {stats.keyCount >0 &&<div>• 键盘操作: {stats.keyCount} 次</div>}
                <div>• 总时长: {stats.duration.toFixed(1)} 秒</div>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground">暂无录制数据，点击下方按钮开始录制或手动添加</div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 px-3 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            onClick={() => setShowRecordDialog(true)}
          >
            录制
          </button>
          <button
            type="button"
            className="flex-1 px-3 py-2 text-sm bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors inline-flex items-center justify-center gap-1.5"
            onClick={() => setShowEditDialog(true)}
          >
            <Pencil className="w-3.5 h-3.5" />
            编辑
          </button>
          {recordedActions.length > 0 && (
            <button
              type="button"
              className="px-3 py-2 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              onClick={() => {
                setRecordedActions([])
                onChange('recordedData', '')
              }}
            >
              清除
            </button>
          )}
        </div>
      </div>

      {/* 播放选项 */}
      <div className="space-y-2">
        <Label htmlFor="playSpeed">播放速度</Label>
        <Select
          id="playSpeed"
          value={String(data.playSpeed ?? 1)}
          onChange={(e) => onChange('playSpeed', parseFloat(e.target.value))}
        >
          <option value="0.25">0.25x (慢速)</option>
          <option value="0.5">0.5x</option>
          <option value="1">1x (原速)</option>
          <option value="1.5">1.5x</option>
          <option value="2">2x (快速)</option>
          <option value="3">3x</option>
          <option value="5">5x (极速)</option>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="repeatCount">重复次数</Label>
        <NumberInput
          id="repeatCount"
          value={(data.repeatCount as number) ?? 1}
          onChange={(v) => onChange('repeatCount', v)}
          defaultValue={1}
          min={1}
          max={9999}
        />
      </div>

      {/* 播放选项复选框 */}
      <div className="space-y-2">
        <Label>播放选项</Label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={(data.playMouseMove as boolean) ?? true}
              onChange={(e) => onChange('playMouseMove', e.target.checked)}
              className="rounded"
            />
            播放鼠标移动轨迹
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={(data.playMouseClick as boolean) ?? true}
              onChange={(e) => onChange('playMouseClick', e.target.checked)}
              className="rounded"
            />
            播放鼠标点击
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={(data.playKeyboard as boolean) ?? true}
              onChange={(e) => onChange('playKeyboard', e.target.checked)}
              className="rounded"
            />
            播放键盘操作
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={(data.useRelativePosition as boolean) ?? false}
              onChange={(e) => onChange('useRelativePosition', e.target.checked)}
              className="rounded"
            />
            使用相对位置（从当前鼠标位置开始）
          </label>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        录制鼠标和键盘操作，播放时会按照录制的顺序和时间间隔执行。点击"编辑"可手动修改、添加、删除操作。
      </p>

      {/* 录制弹窗 */}
      {showRecordDialog && (
        <MacroRecordDialog
          onClose={() => setShowRecordDialog(false)}
          onSave={(actions, baseX, baseY) => {
            setRecordedActions(actions)
            onChange('recordedData', JSON.stringify(actions))
            onChange('baseX', baseX)
            onChange('baseY', baseY)
            setShowRecordDialog(false)
          }}
          initialActions={recordedActions}
        />
      )}

      {/* 编辑弹窗 */}
      {showEditDialog && (
        <MacroEditDialog
          actions={recordedActions}
          onClose={() => setShowEditDialog(false)}
          onSave={(actions) => {
            saveActions(actions)
            setShowEditDialog(false)
          }}
        />
      )}
    </>
  )
}

// 宏动作类型
interface MacroAction {
  type: 'mouse_move' | 'mouse_click' | 'mouse_scroll' | 'key_press' | 'key_char'
  time: number
  x?: number
  y?: number
  button?: 'left' | 'right' | 'middle'
  pressed?: boolean
  delta?: number
  keyCode?: number
  char?: string
}

// 录制弹窗组件
function MacroRecordDialog({ 
  onClose, 
  onSave,
  initialActions 
}: { 
  onClose: () => void
  onSave: (actions: MacroAction[], baseX: number, baseY: number) => void
  initialActions: MacroAction[]
}) {
  const [isRecording, setIsRecording] = useState(false)
  const [actions, setActions] = useState<MacroAction[]>(initialActions)
  const [recordOptions, setRecordOptions] = useState({
    recordMouseMove: true,
    recordMouseClick: true,
    recordKeyboard: true,
    recordScroll: true,
    mouseMoveInterval: 16, // 鼠标移动采样间隔(ms)，约60fps
  })
  const startTimeRef = useRef<number>(0)
  const lastMoveTimeRef = useRef<number>(0)
  const basePositionRef = useRef({ x: 0, y: 0 })
  const isRecordingRef = useRef(false) // 用于回调中访问最新状态
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 同步 isRecording 状态到 ref
  useEffect(() => {
    isRecordingRef.current = isRecording
  }, [isRecording])

  // 监听全局快捷键事件（通过Socket.IO从后端触发）
  useEffect(() => {
    const handleMacroStart = () => {
      if (!isRecordingRef.current) {
        startRecording()
      }
    }
    
    const handleMacroStop = () => {
      if (isRecordingRef.current) {
        stopRecording()
      }
    }
    
    window.addEventListener('hotkey:macro_start', handleMacroStart)
    window.addEventListener('hotkey:macro_stop', handleMacroStop)
    
    return () => {
      window.removeEventListener('hotkey:macro_start', handleMacroStart)
      window.removeEventListener('hotkey:macro_stop', handleMacroStop)
    }
  }, [])

  // 启动全局快捷键监听器（组件挂载时）
  useEffect(() => {
    // 启动后端全局快捷键监听
    fetch(`${getBackendUrl()}/api/system/macro/hotkey/start`, { method: 'POST' })
      .catch(console.error)
    
    // 组件卸载时停止监听
    return () => {
      fetch(`${getBackendUrl()}/api/system/macro/hotkey/stop`, { method: 'POST' })
        .catch(console.error)
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  // 轮询检查快捷键触发和录制数据
  useEffect(() => {
    const pollData = async () => {
      try {
        const response = await fetch(`${getBackendUrl()}/api/system/macro/data`)
        const data = await response.json()
        if (data.success) {
          // 检查快捷键触发
          if (data.pendingStart && !isRecordingRef.current) {
            startRecording()
          } else if (data.pendingStop && isRecordingRef.current) {
            stopRecording()
          }
          // 更新录制数据
          if (data.actions && isRecordingRef.current) {
            setActions(data.actions)
          }
        }
      } catch {
        // 忽略错误
      }
    }

    // 启动轮询
    pollIntervalRef.current = setInterval(pollData, 150)
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  // 开始录制
  const startRecording = async () => {
    setActions([])
    setIsRecording(true)
    startTimeRef.current = Date.now()
    lastMoveTimeRef.current = 0

    // 获取初始鼠标位置作为基准点
    try {
      const response = await fetch(`${getBackendUrl()}/api/system/mouse-position`)
      const data = await response.json()
      if (data.success) {
        basePositionRef.current = { x: data.x, y: data.y }
      }
    } catch {
      basePositionRef.current = { x: 0, y: 0 }
    }

    // 开始监听（通过后端）
    startMacroRecording()
  }

  // 停止录制
  const stopRecording = () => {
    setIsRecording(false)
    stopMacroRecording()
  }

  // 通过后端API开始录制
  const startMacroRecording = async () => {
    try {
      await fetch(`${getBackendUrl()}/api/system/macro/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordMouseMove: recordOptions.recordMouseMove,
          recordMouseClick: recordOptions.recordMouseClick,
          recordKeyboard: recordOptions.recordKeyboard,
          recordScroll: recordOptions.recordScroll,
          mouseMoveInterval: recordOptions.mouseMoveInterval,
        })
      })
    } catch (error) {
      console.error('启动录制失败:', error)
      setIsRecording(false)
    }
  }

  // 停止录制
  const stopMacroRecording = async () => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/system/macro/stop`, {
        method: 'POST'
      })
      const data = await response.json()
      if (data.success && data.actions) {
        setActions(data.actions)
      }
    } catch (error) {
      console.error('停止录制失败:', error)
    }
  }

  // 统计信息
  const stats = useMemo(() => {
    const moveCount = actions.filter(a => a.type === 'mouse_move').length
    const clickCount = actions.filter(a => a.type === 'mouse_click').length
    const keyCount = actions.filter(a => a.type === 'key_press' || a.type === 'key_char').length
    const scrollCount = actions.filter(a => a.type === 'mouse_scroll').length
    
    // 计算拖拽次数
    let dragCount = 0
    let isMouseDown = false
    let hasMoved = false
    for (const action of actions) {
      if (action.type === 'mouse_click' && action.pressed) {
        isMouseDown = true
        hasMoved = false
      } else if (action.type === 'mouse_move' && isMouseDown) {
        hasMoved = true
      } else if (action.type === 'mouse_click' && !action.pressed && isMouseDown) {
        if (hasMoved) {
          dragCount++
        }
        isMouseDown = false
        hasMoved = false
      }
    }
    
    const duration = actions.length > 0 
      ? (actions[actions.length - 1].time - actions[0].time) / 1000 
      : 0
    return { moveCount, clickCount, keyCount, scrollCount, dragCount, duration, total: actions.length }
  }, [actions])

  return (
    <DialogPortal>
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center"
      style={{ zIndex: 2147483646 }}
    >
      <div className="bg-white rounded-lg shadow-xl w-[500px] max-h-[80vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-gray-900">宏录制器</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-4 space-y-4">
          {/* 录制选项 */}
          <div className="space-y-2">
            <Label>录制选项</Label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={recordOptions.recordMouseMove}
                  onChange={(e) => setRecordOptions(prev => ({ ...prev, recordMouseMove: e.target.checked }))}
                  disabled={isRecording}
                  className="rounded"
                />
                鼠标轨迹
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={recordOptions.recordMouseClick}
                  onChange={(e) => setRecordOptions(prev => ({ ...prev, recordMouseClick: e.target.checked }))}
                  disabled={isRecording}
                  className="rounded"
                />
                鼠标点击
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={recordOptions.recordKeyboard}
                  onChange={(e) => setRecordOptions(prev => ({ ...prev, recordKeyboard: e.target.checked }))}
                  disabled={isRecording}
                  className="rounded"
                />
                键盘操作
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={recordOptions.recordScroll}
                  onChange={(e) => setRecordOptions(prev => ({ ...prev, recordScroll: e.target.checked }))}
                  disabled={isRecording}
                  className="rounded"
                />
                鼠标滚轮
              </label>
            </div>
          </div>

          {/* 录制状态 */}
          <div className="p-4 bg-gray-100 rounded-lg text-center">
            {isRecording ? (
              <div className="space-y-2">
                <div className="text-2xl animate-pulse">录制中...</div>
                <div className="text-sm text-muted-foreground">
                  已录制 {stats.total} 个动作 | 时长 {stats.duration.toFixed(1)}s
                </div>
                <div className="text-xs text-muted-foreground">
                  按 <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-700 font-mono">F10</kbd> 或点击下方按钮停止录制
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {actions.length > 0 ? (
                  <>
                    <div className="text-lg font-medium">已录制 {stats.total} 个动作</div>
                    <div className="text-sm text-muted-foreground grid grid-cols-2 gap-1">
                      <div>鼠标移动: {stats.moveCount}</div>
                      <div>鼠标点击: {stats.clickCount}</div>
                      <div>鼠标拖拽: {stats.dragCount}</div>
                      <div>鼠标滚动: {stats.scrollCount}</div>
                      <div>键盘操作: {stats.keyCount}</div>
                    </div>
                    <div className="text-sm">总时长: {stats.duration.toFixed(1)} 秒</div>
                  </>
                ) : (
                  <div className="text-muted-foreground space-y-1">
                    <div>点击"开始录制"或按<kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-700 font-mono">F9</kbd>开始</div>
                    <div className="text-xs">录制完成后按<kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-700 font-mono">F10</kbd>停止</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2">
            {isRecording ? (
              <button
                type="button"
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                onClick={stopRecording}
              >
                ⏹️ 停止录制 (F10)
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                  onClick={startRecording}
                >
                  开始录制 (F9)
                </button>
                {actions.length > 0 && (
                  <button
                    type="button"
                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                    onClick={() => setActions([])}
                  >
                    清除
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* 底部 */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t bg-gray-50">
          <button
            type="button"
            className="px-4 py-2 text-sm border rounded-md hover:bg-gray-100 text-gray-700 has-hover-only"
            onClick={onClose}
          >
            取消
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm bg-[hsl(var(--success-600))] text-white rounded-md hover:bg-[hsl(var(--success-700))] disabled:opacity-50 transition-colors duration-150 shadow-soft hover:shadow-success-glow"
            disabled={actions.length === 0 || isRecording}
            onClick={() => onSave(actions, basePositionRef.current.x, basePositionRef.current.y)}
          >
            保存
          </button>
        </div>
      </div>
    </div>
    </DialogPortal>
  )
}

// 虚拟键码映射表
const VK_CODE_MAP: Record<number, string> = {
  8: 'Backspace', 9: 'Tab', 13: 'Enter', 16: 'Shift', 17: 'Ctrl', 18: 'Alt',
  19: 'Pause', 20: 'CapsLock', 27: 'Esc', 32: 'Space', 33: 'PageUp', 34: 'PageDown',
  35: 'End', 36: 'Home', 37: '←', 38: '↑', 39: '→', 40: '↓',
  45: 'Insert', 46: 'Delete', 48: '0', 49: '1', 50: '2', 51: '3', 52: '4',
  53: '5', 54: '6', 55: '7', 56: '8', 57: '9', 65: 'A', 66: 'B', 67: 'C',
  68: 'D', 69: 'E', 70: 'F', 71: 'G', 72: 'H', 73: 'I', 74: 'J', 75: 'K',
  76: 'L', 77: 'M', 78: 'N', 79: 'O', 80: 'P', 81: 'Q', 82: 'R', 83: 'S',
  84: 'T', 85: 'U', 86: 'V', 87: 'W', 88: 'X', 89: 'Y', 90: 'Z',
  91: 'Win', 112: 'F1', 113: 'F2', 114: 'F3', 115: 'F4', 116: 'F5', 117: 'F6',
  118: 'F7', 119: 'F8', 120: 'F9', 121: 'F10', 122: 'F11', 123: 'F12',
  186: ';', 187: '=', 188: ',', 189: '-', 190: '.', 191: '/', 192: '`',
  219: '[', 220: '\\', 221: ']', 222: "'",
}

// 获取按键名称
function getKeyName(keyCode: number): string {
  return VK_CODE_MAP[keyCode] || `Key${keyCode}`
}

// 获取操作描述
function getActionDescription(action: MacroAction): string {
  switch (action.type) {
    case 'mouse_move':
      return `移动到 (${action.x}, ${action.y})`
    case 'mouse_click':
      const btn = action.button === 'left' ? '左键' : action.button === 'right' ? '右键' : '中键'
      return `${btn}${action.pressed ? '按下' : '释放'} (${action.x}, ${action.y})`
    case 'mouse_scroll':
      return `滚轮 ${(action.delta || 0) > 0 ? '向上' : '向下'} ${Math.abs(action.delta || 0)}`
    case 'key_press':
      return `按键 ${getKeyName(action.keyCode || 0)} ${action.pressed ? '按下' : '释放'}`
    case 'key_char':
      return `输入字符 "${action.char}"`
    default:
      return '未知操作'
  }
}

// 获取操作图标（用 lucide 图标，不用 Emoji）
function ActionIcon({ type }: { type: string }) {
  const cls = 'w-4 h-4 text-gray-600'
  switch (type) {
    case 'mouse_move': return <Mouse className={cls} />
    case 'mouse_click': return <MousePointerClick className={cls} />
    case 'mouse_scroll': return <RotateCw className={cls} />
    case 'key_press': return <Keyboard className={cls} />
    case 'key_char': return <Type className={cls} />
    default: return <HelpCircle className={cls} />
  }
}

// 宏编辑弹窗组件
function MacroEditDialog({
  actions: initialActions,
  onClose,
  onSave,
}: {
  actions: MacroAction[]
  onClose: () => void
  onSave: (actions: MacroAction[]) => void
}) {
  const [actions, setActions] = useState<MacroAction[]>([...initialActions])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [editingAction, setEditingAction] = useState<MacroAction | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [filter, setFilter] = useState<string>('all')

  // 过滤后的操作列表
  const filteredActions = useMemo(() => {
    if (filter === 'all') return actions
    return actions.filter(a => {
      if (filter === 'mouse') return a.type.startsWith('mouse')
      if (filter === 'keyboard') return a.type.startsWith('key')
      return a.type === filter
    })
  }, [actions, filter])

  // 删除操作
  const deleteAction = (index: number) => {
    const realIndex = actions.indexOf(filteredActions[index])
    if (realIndex >= 0) {
      const newActions = [...actions]
      newActions.splice(realIndex, 1)
      setActions(newActions)
      setSelectedIndex(null)
    }
  }

  // 复制操作
  const duplicateAction = (index: number) => {
    const realIndex = actions.indexOf(filteredActions[index])
    if (realIndex >= 0) {
      const newActions = [...actions]
      const copied = { ...actions[realIndex], time: actions[realIndex].time + 100 }
      newActions.splice(realIndex + 1, 0, copied)
      setActions(newActions)
    }
  }

  // 上移操作
  const moveUp = (index: number) => {
    const realIndex = actions.indexOf(filteredActions[index])
    if (realIndex > 0) {
      const newActions = [...actions]
      const temp = newActions[realIndex]
      newActions[realIndex] = newActions[realIndex - 1]
      newActions[realIndex - 1] = temp
      setActions(newActions)
    }
  }

  // 下移操作
  const moveDown = (index: number) => {
    const realIndex = actions.indexOf(filteredActions[index])
    if (realIndex < actions.length - 1) {
      const newActions = [...actions]
      const temp = newActions[realIndex]
      newActions[realIndex] = newActions[realIndex + 1]
      newActions[realIndex + 1] = temp
      setActions(newActions)
    }
  }

  // 编辑操作
  const startEdit = (index: number) => {
    const realIndex = actions.indexOf(filteredActions[index])
    if (realIndex >= 0) {
      setSelectedIndex(realIndex)
      setEditingAction({ ...actions[realIndex] })
    }
  }

  // 保存编辑
  const saveEdit = () => {
    if (selectedIndex !== null && editingAction) {
      const newActions = [...actions]
      newActions[selectedIndex] = editingAction
      setActions(newActions)
      setSelectedIndex(null)
      setEditingAction(null)
    }
  }

  // 添加新操作
  const addAction = (action: MacroAction) => {
    const lastTime = actions.length > 0 ? actions[actions.length - 1].time : 0
    const newAction = { ...action, time: lastTime + 100 }
    setActions([...actions, newAction])
    setShowAddDialog(false)
  }

  // 批量删除鼠标移动
  const deleteAllMouseMoves = () => {
    if (confirm('确定要删除所有鼠标移动操作吗？这将保留点击和其他操作。')) {
      setActions(actions.filter(a => a.type !== 'mouse_move'))
    }
  }

  // 重新计算时间（均匀分布）
  const redistributeTime = () => {
    if (actions.length < 2) return
    const interval = 50 // 50ms 间隔
    const newActions = actions.map((a, i) => ({ ...a, time: i * interval }))
    setActions(newActions)
  }

  return (
    <DialogPortal>
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center"
      style={{ zIndex: 2147483646 }}
    >
      <div className="bg-white rounded-lg shadow-xl w-[700px] max-h-[85vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-gray-900">编辑宏操作</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* 工具栏 */}
        <div className="px-4 py-2 border-b bg-gray-50 flex items-center gap-2 flex-wrap">
          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">全部 ({actions.length})</option>
            <option value="mouse">鼠标操作</option>
            <option value="keyboard">键盘操作</option>
            <option value="mouse_move">仅移动</option>
            <option value="mouse_click">仅点击</option>
            <option value="mouse_scroll">仅滚轮</option>
          </Select>
          <button
            className="text-sm px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 inline-flex items-center gap-1"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            添加
          </button>
          <button
            className="text-sm px-2 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 inline-flex items-center gap-1"
            onClick={deleteAllMouseMoves}
          >
            <Trash2 className="w-3.5 h-3.5" />
            删除所有移动
          </button>
          <button
            className="text-sm px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 inline-flex items-center gap-1"
            onClick={redistributeTime}
          >
            <Clock className="w-3.5 h-3.5" />
            重排时间
          </button>
          <span className="text-xs text-gray-500 ml-auto">
            显示 {filteredActions.length} / {actions.length} 个操作
          </span>
        </div>

        {/* 操作列表 */}
        <div className="flex-1 overflow-auto p-2">
          {filteredActions.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              暂无操作，点击"添加"按钮添加新操作
            </div>
          ) : (
            <div className="space-y-1">
              {filteredActions.map((action, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-2 p-2 rounded border ${
                    selectedIndex === actions.indexOf(action) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span className="inline-flex items-center justify-center">
                    <ActionIcon type={action.type} />
                  </span>
                  <span className="text-xs text-gray-400 w-16">{action.time}ms</span>
                  <span className="flex-1 text-sm">{getActionDescription(action)}</span>
                  <div className="flex gap-1">
                    <button
                      className="p-1 text-gray-500 hover:text-blue-500 hover:bg-blue-100 rounded has-hover-only"
                      onClick={() => startEdit(index)}
                      title="编辑"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      className="p-1 text-gray-500 hover:text-green-500 hover:bg-green-100 rounded has-hover-only"
                      onClick={() => duplicateAction(index)}
                      title="复制"
                    >
                      <CopyIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded has-hover-only"
                      onClick={() => moveUp(index)}
                      title="上移"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded has-hover-only"
                      onClick={() => moveDown(index)}
                      title="下移"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      className="p-1 text-gray-500 hover:text-red-500 hover:bg-red-100 rounded has-hover-only"
                      onClick={() => deleteAction(index)}
                      title="删除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t bg-gray-50">
          <button
            className="px-4 py-2 text-sm border rounded-md hover:bg-gray-100 has-hover-only"
            onClick={onClose}
          >
            取消
          </button>
          <button
            className="px-4 py-2 text-sm bg-[hsl(var(--success-600))] text-white rounded-md hover:bg-[hsl(var(--success-700))] transition-colors duration-150 shadow-soft hover:shadow-success-glow"
            onClick={() => onSave(actions)}
          >
            保存
          </button>
        </div>
      </div>

      {/* 编辑单个操作的弹窗 */}
      {editingAction && (
        <MacroActionEditDialog
          action={editingAction}
          onChange={setEditingAction}
          onClose={() => { setEditingAction(null); setSelectedIndex(null) }}
          onSave={saveEdit}
        />
      )}

      {/* 添加操作弹窗 */}
      {showAddDialog && (
        <MacroAddActionDialog
          onClose={() => setShowAddDialog(false)}
          onAdd={addAction}
        />
      )}
    </div>
    </DialogPortal>
  )
}

// 编辑单个操作的弹窗
function MacroActionEditDialog({
  action,
  onChange,
  onClose,
  onSave,
}: {
  action: MacroAction
  onChange: (action: MacroAction) => void
  onClose: () => void
  onSave: () => void
}) {
  const [isPicking, setIsPicking] = useState(false)
  const [statusText, setStatusText] = useState('')

  // 拾取坐标
  const handlePickPosition = async () => {
    if (isPicking) return
    
    setIsPicking(true)
    setStatusText('Ctrl+左键 确认坐标 | Ctrl+右键 或 ESC 取消')
    
    try {
      const response = await fetch(`${getBackendUrl()}/api/system/pick-mouse-position`, {
        method: 'POST',
      })
      
      const result = await response.json()
      
      if (result.success && result.x !== null && result.y !== null) {
        onChange({ ...action, x: result.x, y: result.y })
        setStatusText(`已获取坐标: (${result.x}, ${result.y})`)
        setTimeout(() => setStatusText(''), 3000)
      } else if (result.cancelled) {
        setStatusText('已取消')
        setTimeout(() => setStatusText(''), 2000)
      } else {
        setStatusText('已取消')
        setTimeout(() => setStatusText(''), 2000)
      }
    } catch (error) {
      console.error('Failed to pick mouse position:', error)
      setStatusText('获取坐标失败')
      setTimeout(() => setStatusText(''), 3000)
    } finally {
      setIsPicking(false)
    }
  }

  return (
    <DialogPortal>
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center"
      style={{ zIndex: 2147483647 }}
    >
      <div className="bg-white rounded-lg shadow-xl w-[400px] p-4">
        <h4 className="font-semibold mb-4">编辑操作</h4>
        
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600">时间 (ms)</label>
            <input
              type="number"
              className="w-full border rounded px-2 py-1 mt-1"
              value={action.time}
              onChange={(e) => onChange({ ...action, time: parseInt(e.target.value) || 0 })}
            />
          </div>

          {(action.type === 'mouse_move' || action.type === 'mouse_click') && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm text-gray-600">X 坐标</label>
                  <input
                    type="number"
                    className="w-full border rounded px-2 py-1 mt-1"
                    value={action.x || 0}
                    onChange={(e) => onChange({ ...action, x: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Y 坐标</label>
                  <input
                    type="number"
                    className="w-full border rounded px-2 py-1 mt-1"
                    value={action.y || 0}
                    onChange={(e) => onChange({ ...action, y: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <button
                type="button"
                className={`w-full px-3 py-2 text-sm border rounded flex items-center justify-center gap-2 ${
                  isPicking ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50 has-hover-only'
                }`}
                onClick={handlePickPosition}
                disabled={isPicking}
              >
                {isPicking ? (
                  <>拾取中...</>
                ) : (
                  <>拾取坐标</>
                )}
              </button>
              {statusText && (
                <p className={`text-xs ${
                  statusText.includes('已获取') ? 'text-green-600' : 
                  statusText.includes('取消') ? 'text-orange-600' : 'text-blue-600'
                }`}>
                  {statusText}
                </p>
              )}
            </>
          )}

          {action.type === 'mouse_click' && (
            <>
              <div>
                <label className="text-sm text-gray-600">按键</label>
                <Select
                  value={action.button || 'left'}
                  onChange={(e) => onChange({ ...action, button: e.target.value as 'left' | 'right' | 'middle' })}
                >
                  <option value="left">左键</option>
                  <option value="right">右键</option>
                  <option value="middle">中键</option>
                </Select>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={action.pressed ?? true}
                    onChange={(e) => onChange({ ...action, pressed: e.target.checked })}
                  />
                  按下（取消勾选为释放）
                </label>
              </div>
            </>
          )}

          {action.type === 'mouse_scroll' && (
            <div>
              <label className="text-sm text-gray-600">滚动量（正数向上，负数向下）</label>
              <input
                type="number"
                className="w-full border rounded px-2 py-1 mt-1"
                value={action.delta || 0}
                onChange={(e) => onChange({ ...action, delta: parseInt(e.target.value) || 0 })}
              />
            </div>
          )}

          {action.type === 'key_press' && (
            <>
              <div>
                <label className="text-sm text-gray-600">虚拟键码</label>
                <input
                  type="number"
                  className="w-full border rounded px-2 py-1 mt-1"
                  value={action.keyCode || 0}
                  onChange={(e) => onChange({ ...action, keyCode: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-gray-400 mt-1">
                  当前: {getKeyName(action.keyCode || 0)}
                </p>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={action.pressed ?? true}
                    onChange={(e) => onChange({ ...action, pressed: e.target.checked })}
                  />
                  按下（取消勾选为释放）
                </label>
              </div>
            </>
          )}

          {action.type === 'key_char' && (
            <div>
              <label className="text-sm text-gray-600">字符</label>
              <input
                type="text"
                className="w-full border rounded px-2 py-1 mt-1"
                value={action.char || ''}
                maxLength={1}
                onChange={(e) => onChange({ ...action, char: e.target.value })}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button className="px-3 py-1 text-sm border rounded hover:bg-gray-100 has-hover-only" onClick={onClose}>
            取消
          </button>
          <button className="px-3 py-1 text-sm bg-[hsl(var(--success-600))] text-white rounded hover:bg-[hsl(var(--success-700))] transition-colors duration-150" onClick={onSave}>
            确定
          </button>
        </div>
      </div>
    </div>
    </DialogPortal>
  )
}

// 添加操作弹窗
function MacroAddActionDialog({
  onClose,
  onAdd,
}: {
  onClose: () => void
  onAdd: (action: MacroAction) => void
}) {
  const [actionType, setActionType] = useState<MacroAction['type']>('mouse_click')
  const [action, setAction] = useState<MacroAction>({
    type: 'mouse_click',
    time: 0,
    x: 500,
    y: 500,
    button: 'left',
    pressed: true,
  })
  const [isPicking, setIsPicking] = useState(false)
  const [statusText, setStatusText] = useState('')

  // 切换类型时重置参数
  useEffect(() => {
    switch (actionType) {
      case 'mouse_move':
        setAction({ type: 'mouse_move', time: 0, x: 500, y: 500 })
        break
      case 'mouse_click':
        setAction({ type: 'mouse_click', time: 0, x: 500, y: 500, button: 'left', pressed: true })
        break
      case 'mouse_scroll':
        setAction({ type: 'mouse_scroll', time: 0, delta: 120 })
        break
      case 'key_press':
        setAction({ type: 'key_press', time: 0, keyCode: 65, pressed: true })
        break
      case 'key_char':
        setAction({ type: 'key_char', time: 0, char: 'a' })
        break
    }
  }, [actionType])

  // 拾取坐标
  const handlePickPosition = async () => {
    if (isPicking) return
    
    setIsPicking(true)
    setStatusText('Ctrl+左键 确认坐标 | Ctrl+右键 或 ESC 取消')
    
    try {
      const response = await fetch(`${getBackendUrl()}/api/system/pick-mouse-position`, {
        method: 'POST',
      })
      
      const result = await response.json()
      
      if (result.success && result.x !== null && result.y !== null) {
        setAction({ ...action, x: result.x, y: result.y })
        setStatusText(`已获取坐标: (${result.x}, ${result.y})`)
        setTimeout(() => setStatusText(''), 3000)
      } else if (result.cancelled) {
        setStatusText('已取消')
        setTimeout(() => setStatusText(''), 2000)
      } else {
        setStatusText('已取消')
        setTimeout(() => setStatusText(''), 2000)
      }
    } catch (error) {
      console.error('Failed to pick mouse position:', error)
      setStatusText('获取坐标失败')
      setTimeout(() => setStatusText(''), 3000)
    } finally {
      setIsPicking(false)
    }
  }

  return (
    <DialogPortal>
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center"
      style={{ zIndex: 2147483647 }}
    >
      <div className="bg-white rounded-lg shadow-xl w-[400px] p-4">
        <h4 className="font-semibold mb-4">添加新操作</h4>
        
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600">操作类型</label>
            <Select
              value={actionType}
              onChange={(e) => setActionType(e.target.value as MacroAction['type'])}
            >
              <option value="mouse_move">鼠标移动</option>
              <option value="mouse_click">鼠标点击</option>
              <option value="mouse_scroll">鼠标滚轮</option>
              <option value="key_press">按键</option>
              <option value="key_char">输入字符</option>
            </Select>
          </div>

          {(actionType === 'mouse_move' || actionType === 'mouse_click') && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm text-gray-600">X 坐标</label>
                  <input
                    type="number"
                    className="w-full border rounded px-2 py-1 mt-1"
                    value={action.x || 0}
                    onChange={(e) => setAction({ ...action, x: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Y 坐标</label>
                  <input
                    type="number"
                    className="w-full border rounded px-2 py-1 mt-1"
                    value={action.y || 0}
                    onChange={(e) => setAction({ ...action, y: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <button
                type="button"
                className={`w-full px-3 py-2 text-sm border rounded flex items-center justify-center gap-2 ${
                  isPicking ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50 has-hover-only'
                }`}
                onClick={handlePickPosition}
                disabled={isPicking}
              >
                {isPicking ? (
                  <>拾取中...</>
                ) : (
                  <>拾取坐标</>
                )}
              </button>
              {statusText && (
                <p className={`text-xs ${
                  statusText.includes('已获取') ? 'text-green-600' : 
                  statusText.includes('取消') ? 'text-orange-600' : 'text-blue-600'
                }`}>
                  {statusText}
                </p>
              )}
            </>
          )}

          {actionType === 'mouse_click' && (
            <>
              <div>
                <label className="text-sm text-gray-600">按键</label>
                <Select
                  value={action.button || 'left'}
                  onChange={(e) => setAction({ ...action, button: e.target.value as 'left' | 'right' | 'middle' })}
                >
                  <option value="left">左键</option>
                  <option value="right">右键</option>
                  <option value="middle">中键</option>
                </Select>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={action.pressed ?? true}
                    onChange={(e) => setAction({ ...action, pressed: e.target.checked })}
                  />
                  按下（取消勾选为释放）
                </label>
              </div>
            </>
          )}

          {actionType === 'mouse_scroll' && (
            <div>
              <label className="text-sm text-gray-600">滚动量（正数向上，负数向下）</label>
              <input
                type="number"
                className="w-full border rounded px-2 py-1 mt-1"
                value={action.delta || 0}
                onChange={(e) => setAction({ ...action, delta: parseInt(e.target.value) || 0 })}
              />
            </div>
          )}

          {actionType === 'key_press' && (
            <>
              <div>
                <label className="text-sm text-gray-600">虚拟键码</label>
                <input
                  type="number"
                  className="w-full border rounded px-2 py-1 mt-1"
                  value={action.keyCode || 0}
                  onChange={(e) => setAction({ ...action, keyCode: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-gray-400 mt-1">
                  当前: {getKeyName(action.keyCode || 0)}
                </p>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={action.pressed ?? true}
                    onChange={(e) => setAction({ ...action, pressed: e.target.checked })}
                  />
                  按下（取消勾选为释放）
                </label>
              </div>
            </>
          )}

          {actionType === 'key_char' && (
            <div>
              <label className="text-sm text-gray-600">字符</label>
              <input
                type="text"
                className="w-full border rounded px-2 py-1 mt-1"
                value={action.char || ''}
                maxLength={1}
                onChange={(e) => setAction({ ...action, char: e.target.value })}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button className="px-3 py-1 text-sm border rounded hover:bg-gray-100 has-hover-only" onClick={onClose}>
            取消
          </button>
          <button
            className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
            onClick={() => onAdd(action)}
          >
            添加
          </button>
        </div>
      </div>
    </div>
    </DialogPortal>
  )
}

// 导出日志配置
export function ExportLogConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>导出格式</Label>
        <Select
          value={(data.logFormat as string) || 'txt'}
          onChange={(e) => onChange('logFormat', e.target.value)}
        >
          <option value="txt">TXT 文本</option>
          <option value="json">JSON</option>
          <option value="csv">CSV</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>输出路径</Label>
        <PathInput
          value={(data.outputPath as string) || ''}
          onChange={(v) => onChange('outputPath', v)}
          placeholder="C:/logs/workflow_log.txt"
          type="file"
        />
        <p className="text-xs text-muted-foreground">留空则自动生成文件名</p>
      </div>
      <div className="space-y-2">
        <Label>包含内容</Label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={(data.includeTimestamp as boolean) !== false}
              onChange={(e) => onChange('includeTimestamp', e.target.checked)}
            />
            包含时间戳
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={(data.includeLevel as boolean) !== false}
              onChange={(e) => onChange('includeLevel', e.target.checked)}
            />
            包含日志级别
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={(data.includeDuration as boolean) === true}
              onChange={(e) => onChange('includeDuration', e.target.checked)}
            />
            包含执行耗时
          </label>
        </div>
      </div>
      <div className="space-y-2">
        <Label>结果变量名</Label>
        <VariableNameInput
          value={(data.resultVariable as string) || ''}
          onChange={(v) => onChange('resultVariable', v)}
          placeholder="export_result"
        />
        <p className="text-xs text-muted-foreground">保存导出文件的路径</p>
      </div>
    </div>
  )
}

// 点击文本配置
export function ClickTextConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  const [useSearchRegion, setUseSearchRegion] = useState(
    !!(data.searchRegion && ((data.searchRegion as Record<string, number>).x2 >0 || (data.searchRegion as Record<string, number>).y2 > 0))
  )
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>目标文本</Label>
        <VariableInput
          value={(data.targetText as string) || ''}
          onChange={(v) => onChange('targetText', v)}
          placeholder="要点击的文本内容"
        />
      </div>
      <div className="space-y-2">
        <Label>匹配模式</Label>
        <Select
          value={(data.matchMode as string) || 'contains'}
          onChange={(e) => onChange('matchMode', e.target.value)}
        >
          <option value="exact">精确匹配</option>
          <option value="contains">包含匹配</option>
          <option value="regex">正则匹配</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>点击按钮</Label>
        <Select
          value={(data.clickButton as string) || 'left'}
          onChange={(e) => onChange('clickButton', e.target.value)}
        >
          <option value="left">左键</option>
          <option value="right">右键</option>
          <option value="middle">中键</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>点击类型</Label>
        <Select
          value={(data.clickType as string) || 'single'}
          onChange={(e) => onChange('clickType', e.target.value)}
        >
          <option value="single">单击</option>
          <option value="double">双击</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>出现次序</Label>
        <NumberInput
          value={(data.occurrence as number) || 1}
          onChange={(v) => onChange('occurrence', v)}
          defaultValue={1}
          min={1}
        />
        <p className="text-xs text-muted-foreground">点击第几个匹配的文本（从1开始）</p>
      </div>
      
      {/* 搜索区域 */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="useSearchRegionClickText"
            checked={useSearchRegion}
            onCheckedChange={(checked) => {
              setUseSearchRegion(!!checked)
              if (!checked) {
                onChange('searchRegion', null)
              }
            }}
          />
          <Label htmlFor="useSearchRegionClickText" className="cursor-pointer">限定搜索区域</Label>
        </div>
        <p className="text-xs text-muted-foreground">
          限定区域可提高识别速度
        </p>
      </div>
      
      {useSearchRegion && (
        <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
          <DualCoordinateInput
            label="左上角坐标"
            xValue={(data.searchRegion as Record<string, number>)?.x ?? 0}
            yValue={(data.searchRegion as Record<string, number>)?.y ?? 0}
            onXChange={(v) => onChange('searchRegion', { ...(data.searchRegion as object || {}), x: v })}
            onYChange={(v) => onChange('searchRegion', { ...(data.searchRegion as object || {}), y: v })}
            onBothChange={(x, y) => onChange('searchRegion', { ...(data.searchRegion as object || {}), x, y })}
          />
          <DualCoordinateInput
            label="右下角坐标"
            xValue={(data.searchRegion as Record<string, number>)?.x2 ?? 0}
            yValue={(data.searchRegion as Record<string, number>)?.y2 ?? 0}
            onXChange={(v) => onChange('searchRegion', { ...(data.searchRegion as object || {}), x2: v })}
            onYChange={(v) => onChange('searchRegion', { ...(data.searchRegion as object || {}), y2: v })}
            onBothChange={(x, y) => onChange('searchRegion', { ...(data.searchRegion as object || {}), x2: x, y2: y })}
          />
          <p className="text-xs text-muted-foreground">
            通过左上角和右下角两点确定搜索区域
          </p>
        </div>
      )}
      
      <div className="space-y-2">
        <Label>等待超时（秒）</Label>
        <NumberInput
          value={(data.waitTimeout as number) || 10}
          onChange={(v) => onChange('waitTimeout', v)}
          defaultValue={10}
          min={1}
          max={60}
        />
      </div>
    </div>
  )
}

// 悬停图像配置
export function HoverImageConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  const [useSearchRegion, setUseSearchRegion] = useState(
    !!(data.searchRegion && ((data.searchRegion as Record<string, number>).x2 >0 || (data.searchRegion as Record<string, number>).y2 > 0))
  )
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>图像路径</Label>
        <ImagePathInput
          value={(data.imagePath as string) || ''}
          onChange={(v) => onChange('imagePath', v)}
        />
      </div>
      <div className="space-y-2">
        <Label>匹配精度</Label>
        <div className="flex items-center gap-2">
          <input
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
      </div>
      
      {/* 搜索区域 */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="useSearchRegionHover"
            checked={useSearchRegion}
            onCheckedChange={(checked) => {
              setUseSearchRegion(!!checked)
              if (!checked) {
                onChange('searchRegion', null)
              }
            }}
          />
          <Label htmlFor="useSearchRegionHover" className="cursor-pointer">限定搜索区域</Label>
        </div>
        <p className="text-xs text-muted-foreground">
          限定区域可提高识别速度
        </p>
      </div>
      
      {useSearchRegion && (
        <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
          <DualCoordinateInput
            label="左上角坐标"
            xValue={(data.searchRegion as Record<string, number>)?.x ?? 0}
            yValue={(data.searchRegion as Record<string, number>)?.y ?? 0}
            onXChange={(v) => onChange('searchRegion', { ...(data.searchRegion as object || {}), x: v })}
            onYChange={(v) => onChange('searchRegion', { ...(data.searchRegion as object || {}), y: v })}
            onBothChange={(x, y) => onChange('searchRegion', { ...(data.searchRegion as object || {}), x, y })}
          />
          <DualCoordinateInput
            label="右下角坐标"
            xValue={(data.searchRegion as Record<string, number>)?.x2 ?? 0}
            yValue={(data.searchRegion as Record<string, number>)?.y2 ?? 0}
            onXChange={(v) => onChange('searchRegion', { ...(data.searchRegion as object || {}), x2: v })}
            onYChange={(v) => onChange('searchRegion', { ...(data.searchRegion as object || {}), y2: v })}
            onBothChange={(x, y) => onChange('searchRegion', { ...(data.searchRegion as object || {}), x2: x, y2: y })}
          />
          <p className="text-xs text-muted-foreground">
            通过左上角和右下角两点确定搜索区域
          </p>
        </div>
      )}
      
      <div className="space-y-2">
        <Label>悬停位置</Label>
        <Select
          value={(data.hoverPosition as string) || 'center'}
          onChange={(e) => onChange('hoverPosition', e.target.value)}
        >
          <option value="center">中心</option>
          <option value="top-left">左上角</option>
          <option value="top-right">右上角</option>
          <option value="bottom-left">左下角</option>
          <option value="bottom-right">右下角</option>
          <option value="top">顶部</option>
          <option value="bottom">底部</option>
          <option value="left">左侧</option>
          <option value="right">右侧</option>
          <option value="random">随机位置</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>悬停时长(秒)</Label>
        <NumberInput
          value={(data.hoverDuration as number) || 0.5}
          onChange={(v) => onChange('hoverDuration', v)}
          defaultValue={0.5}
          min={0.1}
          max={10}
          step={0.1}
        />
      </div>
      <div className="space-y-2">
        <Label>等待超时（秒）</Label>
        <NumberInput
          value={(data.waitTimeout as number) || 10}
          onChange={(v) => onChange('waitTimeout', v)}
          defaultValue={10}
          min={1}
        />
      </div>
      <div className="space-y-2">
        <Label>结果变量名（可选）</Label>
        <VariableNameInput
          value={(data.resultVariable as string) || ''}
          onChange={(v) => onChange('resultVariable', v)}
          placeholder="hover_result"
        />
      </div>
    </div>
  )
}

// 悬停文本配置
export function HoverTextConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  const [useSearchRegion, setUseSearchRegion] = useState(
    !!(data.searchRegion && ((data.searchRegion as Record<string, number>).x2 >0 || (data.searchRegion as Record<string, number>).y2 > 0))
  )
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>目标文本</Label>
        <VariableInput
          value={(data.targetText as string) || ''}
          onChange={(v) => onChange('targetText', v)}
          placeholder="要悬停的文本内容"
        />
      </div>
      <div className="space-y-2">
        <Label>匹配模式</Label>
        <Select
          value={(data.matchMode as string) || 'contains'}
          onChange={(e) => onChange('matchMode', e.target.value)}
        >
          <option value="exact">精确匹配</option>
          <option value="contains">包含匹配</option>
          <option value="regex">正则匹配</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>悬停时长(秒)</Label>
        <NumberInput
          value={(data.hoverDuration as number) || 0.5}
          onChange={(v) => onChange('hoverDuration', v)}
          defaultValue={0.5}
          min={0.1}
          max={10}
          step={0.1}
        />
      </div>
      <div className="space-y-2">
        <Label>出现次序</Label>
        <NumberInput
          value={(data.occurrence as number) || 1}
          onChange={(v) => onChange('occurrence', v)}
          defaultValue={1}
          min={1}
        />
        <p className="text-xs text-muted-foreground">悬停在第几个匹配的文本上（从1开始）</p>
      </div>
      
      {/* 搜索区域 */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="useSearchRegionHoverText"
            checked={useSearchRegion}
            onCheckedChange={(checked) => {
              setUseSearchRegion(!!checked)
              if (!checked) {
                onChange('searchRegion', null)
              }
            }}
          />
          <Label htmlFor="useSearchRegionHoverText" className="cursor-pointer">限定搜索区域</Label>
        </div>
        <p className="text-xs text-muted-foreground">
          限定区域可提高识别速度
        </p>
      </div>
      
      {useSearchRegion && (
        <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
          <DualCoordinateInput
            label="左上角坐标"
            xValue={(data.searchRegion as Record<string, number>)?.x ?? 0}
            yValue={(data.searchRegion as Record<string, number>)?.y ?? 0}
            onXChange={(v) => onChange('searchRegion', { ...(data.searchRegion as object || {}), x: v })}
            onYChange={(v) => onChange('searchRegion', { ...(data.searchRegion as object || {}), y: v })}
            onBothChange={(x, y) => onChange('searchRegion', { ...(data.searchRegion as object || {}), x, y })}
          />
          <DualCoordinateInput
            label="右下角坐标"
            xValue={(data.searchRegion as Record<string, number>)?.x2 ?? 0}
            yValue={(data.searchRegion as Record<string, number>)?.y2 ?? 0}
            onXChange={(v) => onChange('searchRegion', { ...(data.searchRegion as object || {}), x2: v })}
            onYChange={(v) => onChange('searchRegion', { ...(data.searchRegion as object || {}), y2: v })}
            onBothChange={(x, y) => onChange('searchRegion', { ...(data.searchRegion as object || {}), x2: x, y2: y })}
          />
          <p className="text-xs text-muted-foreground">
            通过左上角和右下角两点确定搜索区域
          </p>
        </div>
      )}
      
      <div className="space-y-2">
        <Label>等待超时（秒）</Label>
        <NumberInput
          value={(data.waitTimeout as number) || 10}
          onChange={(v) => onChange('waitTimeout', v)}
          defaultValue={10}
          min={1}
          max={60}
        />
      </div>
      <div className="space-y-2">
        <Label>结果变量名（可选）</Label>
        <VariableNameInput
          value={(data.resultVariable as string) || ''}
          onChange={(v) => onChange('resultVariable', v)}
          placeholder="hover_result"
        />
      </div>
    </div>
  )
}

// 拖拽图像配置
export function DragImageConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  const [useSearchRegion, setUseSearchRegion] = useState(
    !!(data.searchRegion && ((data.searchRegion as Record<string, number>).x2 >0 || (data.searchRegion as Record<string, number>).y2 > 0))
  )
  const targetType = (data.targetType as string) || 'image'
  
  return (
    <div className="space-y-4">
      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-700">
          🖱️ 在屏幕上查找源图像，长按并拖拽到目标图像或指定坐标
        </p>
      </div>
      
      <div className="space-y-2">
        <Label>源图像路径</Label>
        <ImagePathInput
          value={(data.sourceImagePath as string) || ''}
          onChange={(v) => onChange('sourceImagePath', v)}
        />
      </div>
      
      <div className="space-y-2">
        <Label>源图像拖拽位置</Label>
        <Select
          value={(data.sourcePosition as string) || 'center'}
          onChange={(e) => onChange('sourcePosition', e.target.value)}
        >
          <option value="center">中心</option>
          <option value="top-left">左上角</option>
          <option value="top-right">右上角</option>
          <option value="bottom-left">左下角</option>
          <option value="bottom-right">右下角</option>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label>目标类型</Label>
        <Select
          value={targetType}
          onChange={(e) => onChange('targetType', e.target.value)}
        >
          <option value="image">拖拽到图像</option>
          <option value="coordinate">拖拽到坐标</option>
        </Select>
      </div>
      
      {targetType === 'image' ? (
        <>
          <div className="space-y-2">
            <Label>目标图像路径</Label>
            <ImagePathInput
              value={(data.targetImagePath as string) || ''}
              onChange={(v) => onChange('targetImagePath', v)}
            />
          </div>
          <div className="space-y-2">
            <Label>目标图像放置位置</Label>
            <Select
              value={(data.targetPosition as string) || 'center'}
              onChange={(e) => onChange('targetPosition', e.target.value)}
            >
              <option value="center">中心</option>
              <option value="top-left">左上角</option>
              <option value="top-right">右上角</option>
              <option value="bottom-left">左下角</option>
              <option value="bottom-right">右下角</option>
            </Select>
          </div>
        </>
      ) : (
        <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
          <DualCoordinateInput
            label="目标坐标"
            xValue={(data.targetX as number) ?? 0}
            yValue={(data.targetY as number) ?? 0}
            onXChange={(v) => onChange('targetX', v)}
            onYChange={(v) => onChange('targetY', v)}
            onBothChange={(x, y) => {
              onChange('targetX', x)
              onChange('targetY', y)
            }}
          />
        </div>
      )}
      
      <div className="space-y-2">
        <Label>匹配精度</Label>
        <div className="flex items-center gap-2">
          <input
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
      </div>
      
      <div className="space-y-2">
        <Label>拖拽持续时间(秒)</Label>
        <NumberInput
          value={(data.dragDuration as number) || 0.5}
          onChange={(v) => onChange('dragDuration', v)}
          defaultValue={0.5}
          min={0.1}
          max={5}
          step={0.1}
        />
        <p className="text-xs text-muted-foreground">从源位置移动到目标位置的时间</p>
      </div>
      
      <div className="space-y-2">
        <Label>等待超时（秒）</Label>
        <NumberInput
          value={(data.waitTimeout as number) || 10}
          onChange={(v) => onChange('waitTimeout', v)}
          defaultValue={10}
          min={1}
          max={60}
        />
      </div>
      
      {/* 搜索区域 */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="useSearchRegionDragImage"
            checked={useSearchRegion}
            onCheckedChange={(checked) => {
              setUseSearchRegion(!!checked)
              if (!checked) {
                onChange('searchRegion', null)
              }
            }}
          />
          <Label htmlFor="useSearchRegionDragImage" className="cursor-pointer">限定搜索区域</Label>
        </div>
        <p className="text-xs text-muted-foreground">
          限定区域可提高识别速度
        </p>
      </div>
      
      {useSearchRegion && (
        <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
          <DualCoordinateInput
            label="左上角坐标"
            xValue={(data.searchRegion as Record<string, number>)?.x ?? 0}
            yValue={(data.searchRegion as Record<string, number>)?.y ?? 0}
            onXChange={(v) => onChange('searchRegion', { ...(data.searchRegion as object || {}), x: v })}
            onYChange={(v) => onChange('searchRegion', { ...(data.searchRegion as object || {}), y: v })}
            onBothChange={(x, y) => onChange('searchRegion', { ...(data.searchRegion as object || {}), x, y })}
          />
          <DualCoordinateInput
            label="右下角坐标"
            xValue={(data.searchRegion as Record<string, number>)?.x2 ?? 0}
            yValue={(data.searchRegion as Record<string, number>)?.y2 ?? 0}
            onXChange={(v) => onChange('searchRegion', { ...(data.searchRegion as object || {}), x2: v })}
            onYChange={(v) => onChange('searchRegion', { ...(data.searchRegion as object || {}), y2: v })}
            onBothChange={(x, y) => onChange('searchRegion', { ...(data.searchRegion as object || {}), x2: x, y2: y })}
          />
        </div>
      )}
    </div>
  )
}

// 文件夹网络共享配置
export function ShareFolderConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-700">
          将指定文件夹共享到局域网，同网络的设备可通过浏览器访问、下载、上传文件
        </p>
      </div>
      
      <div className="space-y-2">
        <Label>共享文件夹路径</Label>
        <PathInput
          value={(data.folderPath as string) || ''}
          onChange={(v) => onChange('folderPath', v)}
          placeholder="选择要共享的文件夹"
          type="folder"
          title="选择共享文件夹"
        />
      </div>
      
      <div className="space-y-2">
        <Label>共享名称（可选）</Label>
        <VariableInput
          value={(data.shareName as string) || ''}
          onChange={(v) => onChange('shareName', v)}
          placeholder="共享文件夹"
        />
        <p className="text-xs text-muted-foreground">
          显示在浏览器页面上的名称
        </p>
      </div>
      
      <div className="space-y-2">
        <Label>共享端口</Label>
        <NumberInput
          value={(data.port as number) || 8080}
          onChange={(v) => onChange('port', v)}
          defaultValue={8080}
          min={1024}
          max={65535}
        />
        <p className="text-xs text-muted-foreground">
          建议使用 8080-9000 范围的端口，避免与其他服务冲突
        </p>
      </div>
      
      <div className="flex items-center space-x-2">
        <Checkbox
          id="allowWrite"
          checked={data.allowWrite !== false}
          onCheckedChange={(v: boolean) => onChange('allowWrite', v)}
        />
        <Label htmlFor="allowWrite" className="cursor-pointer">允许上传、创建文件夹、删除操作</Label>
      </div>
      <p className="text-xs text-muted-foreground">
        开启后，访问者可以上传文件、创建文件夹、删除文件/文件夹
      </p>
      
      <div className="space-y-2">
        <Label>结果变量名</Label>
        <VariableNameInput
          value={(data.resultVariable as string) || 'share_url'}
          onChange={(v) => onChange('resultVariable', v)}
          placeholder="share_url"
          isStorageVariable
        />
        <p className="text-xs text-muted-foreground">
          执行后会返回真实的共享访问地址
        </p>
      </div>
      
      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
        <p className="text-sm text-amber-700">
          执行后会显示真实的局域网访问地址（如 http://192.168.x.x:端口），同局域网设备可用浏览器访问。
          共享服务会持续运行直到工作流结束或手动停止。
        </p>
      </div>
    </div>
  )
}

// 文件网络共享配置
export function ShareFileConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-700">
          将指定文件共享到局域网，同网络的设备可通过浏览器下载此文件
        </p>
      </div>
      
      <div className="space-y-2">
        <Label>共享文件路径</Label>
        <PathInput
          value={(data.filePath as string) || ''}
          onChange={(v) => onChange('filePath', v)}
          placeholder="选择要共享的文件"
          type="file"
          title="选择共享文件"
        />
      </div>
      
      <div className="space-y-2">
        <Label>共享端口</Label>
        <NumberInput
          value={(data.port as number) || 8080}
          onChange={(v) => onChange('port', v)}
          defaultValue={8080}
          min={1024}
          max={65535}
        />
        <p className="text-xs text-muted-foreground">
          建议使用 8080-9000 范围的端口，避免与其他服务冲突
        </p>
      </div>
      
      <div className="space-y-2">
        <Label>结果变量名</Label>
        <VariableNameInput
          value={(data.resultVariable as string) || 'share_url'}
          onChange={(v) => onChange('resultVariable', v)}
          placeholder="share_url"
          isStorageVariable
        />
        <p className="text-xs text-muted-foreground">
          执行后会返回真实的共享访问地址
        </p>
      </div>
      
      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
        <p className="text-sm text-amber-700">
          执行后会显示真实的局域网访问地址（如 http://192.168.x.x:端口），同局域网设备可用浏览器访问。
          共享服务会持续运行直到工作流结束或手动停止。
        </p>
      </div>
    </div>
  )
}

// 停止网络共享配置
export function StopShareConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-700">
          🛑 停止指定端口上运行的文件共享服务
        </p>
      </div>
      
      <div className="space-y-2">
        <Label>共享端口</Label>
        <NumberInput
          value={(data.port as number) || 8080}
          onChange={(v) => onChange('port', v)}
          defaultValue={8080}
          min={1024}
          max={65535}
        />
        <p className="text-xs text-muted-foreground">
          输入要停止的共享服务端口号
        </p>
      </div>
    </div>
  )
}

// 开始屏幕共享配置
export function StartScreenShareConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-700">
          将电脑屏幕实时共享到局域网，同网络的设备可通过浏览器观看屏幕画面
        </p>
      </div>
      
      <div className="space-y-2">
        <Label>共享端口</Label>
        <NumberInput
          value={(data.port as number) || 9000}
          onChange={(v) => onChange('port', v)}
          defaultValue={9000}
          min={1024}
          max={65535}
        />
        <p className="text-xs text-muted-foreground">
          建议使用 9000-9100 范围的端口，避免与文件共享冲突
        </p>
      </div>
      
      <div className="space-y-2">
        <Label>帧率 (FPS)</Label>
        <NumberInput
          value={(data.fps as number) || 30}
          onChange={(v) => onChange('fps', v)}
          defaultValue={30}
          min={1}
          max={60}
        />
        <p className="text-xs text-muted-foreground">
          帧率越高画面越流畅，但带宽占用越大。推荐 15-30 FPS
        </p>
      </div>
      
      <div className="space-y-2">
        <Label>画质 (%)</Label>
        <NumberInput
          value={(data.quality as number) || 70}
          onChange={(v) => onChange('quality', v)}
          defaultValue={70}
          min={10}
          max={100}
        />
        <p className="text-xs text-muted-foreground">
          画质越高越清晰，但带宽占用越大。推荐 50-80%
        </p>
      </div>
      
      <div className="space-y-2">
        <Label>缩放比例 (%)</Label>
        <NumberInput
          value={Math.round((Number(data.scale) || 1.0) * 100)}
          onChange={(v) => onChange('scale', Number(v) / 100)}
          defaultValue={100}
          min={10}
          max={100}
        />
        <p className="text-xs text-muted-foreground">
          降低缩放可显著减少带宽占用。100% 为原始分辨率
        </p>
      </div>
      
      <div className="space-y-2">
        <Label>结果变量名</Label>
        <VariableNameInput
          value={(data.resultVariable as string) || 'screen_share_url'}
          onChange={(v) => onChange('resultVariable', v)}
          placeholder="screen_share_url"
          isStorageVariable
        />
        <p className="text-xs text-muted-foreground">
          执行后会返回屏幕共享的访问地址
        </p>
      </div>
      
      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
        <p className="text-sm text-amber-700">
          执行后会显示局域网访问地址（如 http://192.168.x.x:端口），同局域网设备可用浏览器实时观看屏幕画面。
          共享服务会持续运行直到工作流结束或手动停止。
        </p>
      </div>
    </div>
  )
}

// 停止屏幕共享配置
export function StopScreenShareConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-700">
          🛑 停止指定端口上运行的屏幕共享服务
        </p>
      </div>
      
      <div className="space-y-2">
        <Label>共享端口</Label>
        <NumberInput
          value={(data.port as number) || 9000}
          onChange={(v) => onChange('port', v)}
          defaultValue={9000}
          min={1024}
          max={65535}
        />
        <p className="text-xs text-muted-foreground">
          输入要停止的屏幕共享服务端口号
        </p>
      </div>
    </div>
  )
}

// 图像存在判断配置
export function ImageExistsConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  const useFullScreen = (data.useFullScreen as boolean) ?? true
  const [useSearchRegion, setUseSearchRegion] = useState(
    !useFullScreen && !!(data.searchRegion && ((data.searchRegion as Record<string, number>).x2 >0 || (data.searchRegion as Record<string, number>).y2 > 0))
  )
  
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="imagePath">图像路径</Label>
        <ImagePathInput
          value={(data.imagePath as string) || ''}
          onChange={(v) => onChange('imagePath', v)}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="confidence">匹配精度</Label>
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
          值越高匹配越精确，但可能找不到
        </p>
      </div>
      
      {/* 识别模式选择 */}
      <div className="space-y-2">
        <Label>识别模式</Label>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="radio"
              id="fullScreen"
              name="recognitionMode"
              checked={useFullScreen}
              onChange={() => {
                onChange('useFullScreen', true)
                setUseSearchRegion(false)
                onChange('searchRegion', null)
              }}
              className="cursor-pointer"
            />
            <Label htmlFor="fullScreen" className="cursor-pointer font-normal">
              全屏识别
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="radio"
              id="regionSearch"
              name="recognitionMode"
              checked={!useFullScreen}
              onChange={() => {
                onChange('useFullScreen', false)
                setUseSearchRegion(true)
              }}
              className="cursor-pointer"
            />
            <Label htmlFor="regionSearch" className="cursor-pointer font-normal">
              限定区域识别
            </Label>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          限定区域可提高识别速度
        </p>
      </div>
      
      {!useFullScreen && useSearchRegion && (
        <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
          <DualCoordinateInput
            label="左上角坐标"
            xValue={(data.searchRegion as Record<string, number>)?.x ?? 0}
            yValue={(data.searchRegion as Record<string, number>)?.y ?? 0}
            onXChange={(v) => onChange('searchRegion', { ...(data.searchRegion as object || {}), x: v })}
            onYChange={(v) => onChange('searchRegion', { ...(data.searchRegion as object || {}), y: v })}
            onBothChange={(x, y) => onChange('searchRegion', { ...(data.searchRegion as object || {}), x, y })}
          />
          <DualCoordinateInput
            label="右下角坐标"
            xValue={(data.searchRegion as Record<string, number>)?.x2 ?? 0}
            yValue={(data.searchRegion as Record<string, number>)?.y2 ?? 0}
            onXChange={(v) => onChange('searchRegion', { ...(data.searchRegion as object || {}), x2: v })}
            onYChange={(v) => onChange('searchRegion', { ...(data.searchRegion as object || {}), y2: v })}
            onBothChange={(x, y) => onChange('searchRegion', { ...(data.searchRegion as object || {}), x2: x, y2: y })}
          />
          <p className="text-xs text-muted-foreground">
            通过左上角和右下角两点确定搜索区域
          </p>
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="waitTimeout">等待超时 (秒)</Label>
        <NumberInput
          id="waitTimeout"
          value={(data.waitTimeout as number) ?? 5}
          onChange={(v) => onChange('waitTimeout', v)}
          defaultValue={5}
          min={1}
        />
        <p className="text-xs text-muted-foreground">
          在指定时间内查找图像
        </p>
      </div>
      
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
        <p className="text-xs font-semibold text-blue-900">
          使用说明
        </p>
        <p className="text-xs text-blue-800">
          • 此模块类似条件判断，有两个分支输出点
        </p>
        <p className="text-xs text-blue-800">
          • 图像存在时执行"真"分支，不存在时执行"假"分支
        </p>
        <p className="text-xs text-blue-800">
          • 可用于判断界面状态、按钮是否出现等场景
        </p>
      </div>
    </>
  )
}


// 元素存在判断配置
export function ElementExistsConfig({ renderSelectorInput }: { data: NodeData; onChange: (key: string, value: unknown) => void; renderSelectorInput: (id: string, label: string, placeholder: string) => React.JSX.Element }) {
  return (
    <div className="space-y-4">
      <div className="bg-[hsl(var(--card))] p-3 rounded-lg border-l-4 border-blue-500">
        <p className="text-sm text-gray-700 font-medium mb-1">
          元素存在判断
        </p>
        <p className="text-xs text-gray-600">
          判断指定元素是否存在于页面中，返回 true/false 分支，可用于条件判断流程
        </p>
      </div>
      
      {renderSelectorInput('selector', '元素选择器', '输入CSS选择器或使用可视化选择')}
      
      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
        <div className="flex items-start gap-2">
          <div className="text-amber-600 mt-0.5"></div>
          <div className="text-xs text-amber-800 space-y-1">
            <p className="font-medium">使用说明：</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>元素存在时走 true 分支</li>
              <li>元素不存在时走 false 分支</li>
              <li>可以连接不同的后续模块实现条件判断</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

// 元素可见判断配置
export function ElementVisibleConfig({ renderSelectorInput }: { data: NodeData; onChange: (key: string, value: unknown) => void; renderSelectorInput: (id: string, label: string, placeholder: string) => React.JSX.Element }) {
  return (
    <div className="space-y-4">
      <div className="bg-[hsl(var(--card))] p-3 rounded-lg border-l-4 border-green-500">
        <p className="text-sm text-gray-700 font-medium mb-1">
          👁️ 元素可见判断
        </p>
        <p className="text-xs text-gray-600">
          判断指定元素是否在页面中可见（不仅存在，还要显示出来），返回 true/false 分支
        </p>
      </div>
      
      {renderSelectorInput('selector', '元素选择器', '输入CSS选择器或使用可视化选择')}
      
      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
        <div className="flex items-start gap-2">
          <div className="text-amber-600 mt-0.5"></div>
          <div className="text-xs text-amber-800 space-y-1">
            <p className="font-medium">使用说明：</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>元素存在且可见时走 true 分支</li>
              <li>元素不存在或不可见时走 false 分支</li>
              <li>可用于判断弹窗、提示信息等动态元素</li>
              <li>比"元素存在判断"更严格，要求元素实际显示</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

// ==================== 网络监听模块配置 ====================

// 开始网络监听配置
export function NetworkMonitorStartConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="monitorId">监听器ID</Label>
        <VariableInput
          value={(data.monitorId as string) || 'default'}
          onChange={(v) => onChange('monitorId', v)}
          placeholder="监听器唯一标识，默认: default"
        />
        <p className="text-xs text-muted-foreground">
          用于标识监听器，后续等待/停止时需要使用相同ID
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="filterType">过滤类型</Label>
        <Select
          id="filterType"
          value={(data.filterType as string) || 'api'}
          onChange={(e) => onChange('filterType', e.target.value)}
        >
          <option value="all">全部请求</option>
          <option value="api">仅API请求（fetch/xhr）</option>
          <option value="img">仅图片</option>
          <option value="media">仅媒体（视频/音频）</option>
          <option value="m3u8">仅m3u8（视频流）</option>
        </Select>
        <p className="text-xs text-muted-foreground">
          API请求通常是网页与服务器的数据交互
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="urlPattern">URL匹配模式（可选）</Label>
        <VariableInput
          value={(data.urlPattern as string) || ''}
          onChange={(v) => onChange('urlPattern', v)}
          placeholder="如: /api/，支持 {'{变量名}'}"
        />
        <p className="text-xs text-muted-foreground">
          只捕获URL中包含此关键词的请求，留空则捕获所有符合类型的请求
        </p>
      </div>
      
      <div className="p-3 bg-green-50 border border-green-200 rounded-lg space-y-2">
        <p className="text-xs font-medium text-green-800">使用说明</p>
        <ul className="text-xs text-green-700 space-y-1 list-disc list-inside">
          <li>在打开网页前启动监听，可捕获页面加载时的API请求</li>
          <li>监听器会持续运行，直到使用"停止网络监听"或"等待API请求"停止</li>
          <li>可以同时启动多个监听器，使用不同的ID区分</li>
        </ul>
      </div>
    </div>
  )
}

// 等待API请求配置
export function NetworkMonitorWaitConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="monitorId">监听器ID</Label>
        <VariableInput
          value={(data.monitorId as string) || 'default'}
          onChange={(v) => onChange('monitorId', v)}
          placeholder="监听器唯一标识，默认: default"
        />
        <p className="text-xs text-muted-foreground">
          必须与"开始网络监听"中的ID一致
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="urlPattern">URL匹配模式</Label>
        <VariableInput
          value={(data.urlPattern as string) || ''}
          onChange={(v) => onChange('urlPattern', v)}
          placeholder="如: /api/user，支持 {'{变量名}'}"
        />
        <p className="text-xs text-muted-foreground">
          等待URL中包含此关键词的请求，必填
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="timeout">超时时间（毫秒）</Label>
        <NumberInput
          id="timeout"
          value={(data.timeout as number) ?? 30000}
          onChange={(v) => onChange('timeout', v)}
          defaultValue={30000}
          min={1000}
          step={1000}
        />
        <p className="text-xs text-muted-foreground">
          等待超过此时间未捕获到请求则失败
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="captureMode">捕获模式</Label>
        <Select
          id="captureMode"
          value={(data.captureMode as string) || 'first'}
          onChange={(e) => onChange('captureMode', e.target.value)}
        >
          <option value="first">第一个匹配的请求</option>
          <option value="all">所有匹配的请求</option>
        </Select>
        <p className="text-xs text-muted-foreground">
          first: 捕获到第一个就返回；all: 等待超时后返回所有匹配的
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="variableName">存储结果到变量</Label>
        <VariableNameInput
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="存储请求信息的变量名"
          isStorageVariable={true}
        />
        <p className="text-xs text-muted-foreground">
          first模式: 存储单个请求对象；all模式: 存储请求列表
        </p>
      </div>
      
      <div className="flex items-center gap-2">
        <Checkbox
          id="stopAfterCapture"
          checked={(data.stopAfterCapture as boolean) ?? false}
          onCheckedChange={(checked) => onChange('stopAfterCapture', checked)}
        />
        <Label htmlFor="stopAfterCapture" className="cursor-pointer">捕获后停止监听</Label>
      </div>
      
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
        <p className="text-xs font-medium text-blue-800">使用场景</p>
        <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
          <li>等待登录接口返回，获取token</li>
          <li>等待搜索接口返回，获取结果数据</li>
          <li>等待视频播放接口，获取真实播放地址</li>
        </ul>
      </div>
    </div>
  )
}

// 停止网络监听配置
export function NetworkMonitorStopConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="monitorId">监听器ID</Label>
        <VariableInput
          value={(data.monitorId as string) || 'default'}
          onChange={(v) => onChange('monitorId', v)}
          placeholder="监听器唯一标识，默认: default"
        />
        <p className="text-xs text-muted-foreground">
          必须与"开始网络监听"中的ID一致
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="variableName">存储所有请求到变量（可选）</Label>
        <VariableNameInput
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="存储所有捕获请求的变量名"
          isStorageVariable={true}
        />
        <p className="text-xs text-muted-foreground">
          停止监听时，可将所有捕获的请求存储到变量中
        </p>
      </div>
      
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-xs text-amber-800">
          停止监听后，该监听器将被销毁，无法再次使用
        </p>
      </div>
    </div>
  )
}

// ==================== 桌面应用自动化配置 ====================

// 连接桌面应用配置
export function DesktopAppConnectConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="connectType">连接方式</Label>
        <Select
          id="connectType"
          value={(data.connectType as string) || 'title'}
          onChange={(e) => onChange('connectType', e.target.value)}
        >
          <option value="title">窗口标题</option>
          <option value="process">进程名</option>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="searchValue">搜索值</Label>
        <VariableInput
          value={(data.searchValue as string) || ''}
          onChange={(v) => onChange('searchValue', v)}
          placeholder="窗口标题或进程名，支持 {变量名}"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="matchMode">匹配模式</Label>
        <Select
          id="matchMode"
          value={(data.matchMode as string) || 'contains'}
          onChange={(e) => onChange('matchMode', e.target.value)}
        >
          <option value="contains">包含</option>
          <option value="exact">精确匹配</option>
          <option value="regex">正则表达式</option>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="timeout">超时时间（秒）</Label>
        <NumberInput
          id="timeout"
          value={(data.timeout as number) ?? 10}
          onChange={(v) => onChange('timeout', v)}
          defaultValue={10}
          min={1}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="connectionVariable">存储连接信息到变量</Label>
        <VariableNameInput
          value={(data.connectionVariable as string) || ''}
          onChange={(v) => onChange('connectionVariable', v)}
          placeholder="存储窗口句柄等信息"
          isStorageVariable={true}
        />
      </div>
    </div>
  )
}

// 启动桌面应用配置
export function DesktopAppStartConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="appPath">应用程序路径</Label>
        <PathInput
          value={(data.appPath as string) || ''}
          onChange={(v) => onChange('appPath', v)}
          placeholder="C:\\Program Files\\App\\app.exe"
          type="file"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="appArgs">启动参数（可选）</Label>
        <VariableInput
          value={(data.appArgs as string) || ''}
          onChange={(v) => onChange('appArgs', v)}
          placeholder="命令行参数，支持 {变量名}"
        />
      </div>
      
      <div className="flex items-center gap-2">
        <Checkbox
          id="waitReady"
          checked={(data.waitReady as boolean) ?? true}
          onCheckedChange={(checked) => onChange('waitReady', checked)}
        />
        <Label htmlFor="waitReady" className="cursor-pointer">等待应用就绪</Label>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="waitTimeout">等待超时（秒）</Label>
        <NumberInput
          id="waitTimeout"
          value={(data.waitTimeout as number) ?? 10}
          onChange={(v) => onChange('waitTimeout', v)}
          defaultValue={10}
          min={1}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="connectionVariable">存储连接信息到变量</Label>
        <VariableNameInput
          value={(data.connectionVariable as string) || ''}
          onChange={(v) => onChange('connectionVariable', v)}
          placeholder="存储窗口句柄等信息"
          isStorageVariable={true}
        />
      </div>
    </div>
  )
}

// 关闭桌面应用配置
export function DesktopAppCloseConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="windowHandle">窗口句柄</Label>
        <VariableInput
          value={(data.windowHandle as string) || ''}
          onChange={(v) => onChange('windowHandle', v)}
          placeholder="从连接应用模块获取，支持 {变量名}"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="closeMode">关闭模式</Label>
        <Select
          id="closeMode"
          value={(data.closeMode as string) || 'normal'}
          onChange={(e) => onChange('closeMode', e.target.value)}
        >
          <option value="normal">正常关闭</option>
          <option value="force">强制关闭</option>
        </Select>
      </div>
    </div>
  )
}

// 激活窗口配置
export function DesktopWindowActivateConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="windowHandle">窗口句柄</Label>
        <VariableInput
          value={(data.windowHandle as string) || ''}
          onChange={(v) => onChange('windowHandle', v)}
          placeholder="从连接应用模块获取，支持 {变量名}"
        />
      </div>
    </div>
  )
}

// 窗口状态控制配置
export function DesktopWindowStateConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="windowHandle">窗口句柄</Label>
        <VariableInput
          value={(data.windowHandle as string) || ''}
          onChange={(v) => onChange('windowHandle', v)}
          placeholder="从连接应用模块获取，支持 {变量名}"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="state">窗口状态</Label>
        <Select
          id="state"
          value={(data.state as string) || 'maximize'}
          onChange={(e) => onChange('state', e.target.value)}
        >
          <option value="maximize">最大化</option>
          <option value="minimize">最小化</option>
          <option value="restore">还原</option>
        </Select>
      </div>
    </div>
  )
}

// 移动窗口配置
export function DesktopWindowMoveConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="windowHandle">窗口句柄</Label>
        <VariableInput
          value={(data.windowHandle as string) || ''}
          onChange={(v) => onChange('windowHandle', v)}
          placeholder="从连接应用模块获取，支持 {变量名}"
        />
      </div>
      
      <div className="space-y-2">
        <Label>目标位置</Label>
        <CoordinateInput
          xValue={(data.x as string) || ''}
          yValue={(data.y as string) || ''}
          onXChange={(v) => onChange('x', v)}
          onYChange={(v) => onChange('y', v)}
        />
      </div>
    </div>
  )
}

// 调整窗口大小配置
export function DesktopWindowResizeConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="windowHandle">窗口句柄</Label>
        <VariableInput
          value={(data.windowHandle as string) || ''}
          onChange={(v) => onChange('windowHandle', v)}
          placeholder="从连接应用模块获取，支持 {变量名}"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="width">宽度（像素）</Label>
        <NumberInput
          id="width"
          value={(data.width as number) ?? 800}
          onChange={(v) => onChange('width', v)}
          defaultValue={800}
          min={100}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="height">高度（像素）</Label>
        <NumberInput
          id="height"
          value={(data.height as number) ?? 600}
          onChange={(v) => onChange('height', v)}
          defaultValue={600}
          min={100}
        />
      </div>
    </div>
  )
}

// 窗口置顶配置
export function DesktopWindowTopmostConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="windowHandle">窗口句柄</Label>
        <VariableInput
          value={(data.windowHandle as string) || ''}
          onChange={(v) => onChange('windowHandle', v)}
          placeholder="从连接应用模块获取，支持 {变量名}"
        />
      </div>
      
      <div className="flex items-center gap-2">
        <Checkbox
          id="topmost"
          checked={(data.topmost as boolean) ?? true}
          onCheckedChange={(checked) => onChange('topmost', checked)}
        />
        <Label htmlFor="topmost" className="cursor-pointer">始终置顶</Label>
      </div>
    </div>
  )
}

// 截取窗口配置
export function DesktopWindowCaptureConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="windowHandle">窗口句柄</Label>
        <VariableInput
          value={(data.windowHandle as string) || ''}
          onChange={(v) => onChange('windowHandle', v)}
          placeholder="从连接应用模块获取，支持 {变量名}"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="savePath">保存路径</Label>
        <PathInput
          value={(data.savePath as string) || ''}
          onChange={(v) => onChange('savePath', v)}
          placeholder="C:\\screenshots\\window.png"
          type="file"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="variableName">存储路径到变量</Label>
        <VariableNameInput
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="保存文件路径的变量名"
          isStorageVariable={true}
        />
      </div>
    </div>
  )
}


// 查找控件配置
export function DesktopFindControlConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  const [isPickerActive, setIsPickerActive] = useState(false)
  
  const startPicker = async () => {
    try {
      setIsPickerActive(true)
      await desktopPickerApi.startPicker()
    } catch (error) {
      console.error('启动选择器失败:', error)
      setIsPickerActive(false)
    }
  }
  
  const stopPicker = async () => {
    try {
      await desktopPickerApi.stopPicker()
      setIsPickerActive(false)
    } catch (error) {
      console.error('停止选择器失败:', error)
    }
  }
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="windowHandle">窗口句柄</Label>
        <VariableInput
          value={(data.windowHandle as string) || ''}
          onChange={(v) => onChange('windowHandle', v)}
          placeholder="从连接应用模块获取，支持 {变量名}"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="controlType">控件类型</Label>
        <Select
          id="controlType"
          value={(data.controlType as string) || ''}
          onChange={(e) => onChange('controlType', e.target.value)}
        >
          <option value="">自动检测</option>
          <option value="Button">按钮</option>
          <option value="Edit">输入框</option>
          <option value="Text">文本</option>
          <option value="ComboBox">下拉框</option>
          <option value="ListItem">列表项</option>
          <option value="List">列表</option>
          <option value="CheckBox">复选框</option>
          <option value="RadioButton">单选按钮</option>
          <option value="Tab">标签页</option>
          <option value="TabItem">标签页项</option>
          <option value="Menu">菜单</option>
          <option value="MenuItem">菜单项</option>
          <option value="Tree">树</option>
          <option value="TreeItem">树项</option>
          <option value="DataGrid">数据表格</option>
          <option value="Hyperlink">超链接</option>
          <option value="Image">图像</option>
          <option value="Pane">面板</option>
          <option value="ScrollBar">滚动条</option>
          <option value="Slider">滑块</option>
          <option value="ToolBar">工具栏</option>
          <option value="Window">窗口</option>
          <option value="Group">分组</option>
          <option value="Custom">自定义</option>
        </Select>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="name">控件名称</Label>
          <Button
            type="button"
            size="sm"
            variant={isPickerActive ? "destructive" : "outline"}
            onClick={isPickerActive ? stopPicker : startPicker}
            disabled={isPickerActive}
          >
            {isPickerActive ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                选择中...
              </>
            ) : (
              <>
                <Crosshair className="w-3 h-3 mr-1" />
                可视化选择
              </>
            )}
          </Button>
        </div>
        <VariableInput
          value={(data.name as string) || ''}
          onChange={(v) => onChange('name', v)}
          placeholder="控件显示的文本，支持 {变量名}"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="automationId">自动化ID（可选）</Label>
        <VariableInput
          value={(data.automationId as string) || ''}
          onChange={(v) => onChange('automationId', v)}
          placeholder="控件的AutomationId，支持 {变量名}"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="className">类名（可选）</Label>
        <VariableInput
          value={(data.className as string) || ''}
          onChange={(v) => onChange('className', v)}
          placeholder="控件的ClassName，支持 {变量名}"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="searchDepth">搜索深度</Label>
        <NumberInput
          id="searchDepth"
          value={(data.searchDepth as number) ?? 10}
          onChange={(v) => onChange('searchDepth', v)}
          defaultValue={10}
          min={1}
          max={20}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="timeout">超时时间（秒）</Label>
        <NumberInput
          id="timeout"
          value={(data.timeout as number) ?? 5}
          onChange={(v) => onChange('timeout', v)}
          defaultValue={5}
          min={1}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="controlVariable">存储控件信息到变量</Label>
        <VariableNameInput
          value={(data.controlVariable as string) || ''}
          onChange={(v) => onChange('controlVariable', v)}
          placeholder="存储控件句柄等信息"
          isStorageVariable={true}
        />
      </div>
      
      {isPickerActive && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            按住 Ctrl + 点击 捕获控件，按 ESC 退出选择模式
          </p>
        </div>
      )}
    </div>
  )
}

// 等待控件配置
export function DesktopWaitControlConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="controlInfo">控件信息</Label>
        <VariableInput
          value={(data.controlInfo as string) || ''}
          onChange={(v) => onChange('controlInfo', v)}
          placeholder="从查找控件模块获取，支持 {变量名}"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="waitType">等待类型</Label>
        <Select
          id="waitType"
          value={(data.waitType as string) || 'appear'}
          onChange={(e) => onChange('waitType', e.target.value)}
        >
          <option value="appear">等待出现</option>
          <option value="disappear">等待消失</option>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="timeout">超时时间（秒）</Label>
        <NumberInput
          id="timeout"
          value={(data.timeout as number) ?? 10}
          onChange={(v) => onChange('timeout', v)}
          defaultValue={10}
          min={1}
        />
      </div>
    </div>
  )
}

// 点击控件配置
export function DesktopClickControlConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="controlInfo">控件信息</Label>
        <VariableInput
          value={(data.controlInfo as string) || ''}
          onChange={(v) => onChange('controlInfo', v)}
          placeholder="从查找控件模块获取，支持 {变量名}"
        />
      </div>
      
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
      
      <div className="flex items-center gap-2">
        <Checkbox
          id="simulate"
          checked={(data.simulate as boolean) ?? true}
          onCheckedChange={(checked) => onChange('simulate', checked)}
        />
        <Label htmlFor="simulate" className="cursor-pointer">模拟鼠标移动</Label>
      </div>
    </div>
  )
}

// 输入文本到控件配置
export function DesktopInputControlConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="controlInfo">控件信息</Label>
        <VariableInput
          value={(data.controlInfo as string) || ''}
          onChange={(v) => onChange('controlInfo', v)}
          placeholder="从查找控件模块获取，支持 {变量名}"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="text">输入文本</Label>
        <VariableInput
          value={(data.text as string) || ''}
          onChange={(v) => onChange('text', v)}
          placeholder="要输入的文本，支持 {变量名}"
          multiline
          rows={3}
        />
      </div>
      
      <div className="flex items-center gap-2">
        <Checkbox
          id="clearBefore"
          checked={(data.clearBefore as boolean) ?? true}
          onCheckedChange={(checked) => onChange('clearBefore', checked)}
        />
        <Label htmlFor="clearBefore" className="cursor-pointer">输入前清空</Label>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="inputMethod">输入方式</Label>
        <Select
          id="inputMethod"
          value={(data.inputMethod as string) || 'set'}
          onChange={(e) => onChange('inputMethod', e.target.value)}
        >
          <option value="set">直接设置（推荐）</option>
          <option value="send_keys">模拟按键</option>
        </Select>
      </div>
    </div>
  )
}

// 获取控件文本配置
export function DesktopGetTextConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="controlInfo">控件信息</Label>
        <VariableInput
          value={(data.controlInfo as string) || ''}
          onChange={(v) => onChange('controlInfo', v)}
          placeholder="从查找控件模块获取，支持 {变量名}"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="variableName">存储文本到变量</Label>
        <VariableNameInput
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="存储获取的文本"
          isStorageVariable={true}
        />
      </div>
    </div>
  )
}

// 选择下拉框配置
export function DesktopSelectComboConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="controlInfo">控件信息</Label>
        <VariableInput
          value={(data.controlInfo as string) || ''}
          onChange={(v) => onChange('controlInfo', v)}
          placeholder="从查找控件模块获取，支持 {变量名}"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="selectBy">选择方式</Label>
        <Select
          id="selectBy"
          value={(data.selectBy as string) || 'name'}
          onChange={(e) => onChange('selectBy', e.target.value)}
        >
          <option value="name">按名称</option>
          <option value="index">按索引</option>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="selectValue">选择值</Label>
        <VariableInput
          value={(data.selectValue as string) || ''}
          onChange={(v) => onChange('selectValue', v)}
          placeholder="选项名称或索引，支持 {变量名}"
        />
      </div>
    </div>
  )
}

// 操作复选框配置
export function DesktopCheckboxConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="controlInfo">控件信息</Label>
        <VariableInput
          value={(data.controlInfo as string) || ''}
          onChange={(v) => onChange('controlInfo', v)}
          placeholder="从查找控件模块获取，支持 {变量名}"
        />
      </div>
      
      <div className="flex items-center gap-2">
        <Checkbox
          id="checked"
          checked={(data.checked as boolean) ?? true}
          onCheckedChange={(checked) => onChange('checked', checked)}
        />
        <Label htmlFor="checked" className="cursor-pointer">勾选</Label>
      </div>
    </div>
  )
}

// 操作单选按钮配置
export function DesktopRadioConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="controlInfo">控件信息</Label>
        <VariableInput
          value={(data.controlInfo as string) || ''}
          onChange={(v) => onChange('controlInfo', v)}
          placeholder="从查找控件模块获取，支持 {变量名}"
        />
      </div>
    </div>
  )
}

// 发送快捷键配置
export function DesktopSendKeysConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="controlInfo">控件信息</Label>
        <VariableInput
          value={(data.controlInfo as string) || ''}
          onChange={(v) => onChange('controlInfo', v)}
          placeholder="从查找控件模块获取，支持 {变量名}"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="keys">按键序列</Label>
        <VariableInput
          value={(data.keys as string) || ''}
          onChange={(v) => onChange('keys', v)}
          placeholder="如: {Ctrl}s, {Enter}，支持 {变量名}"
        />
        <p className="text-xs text-muted-foreground">
          使用 {'{'}键名{'}'} 格式，如 {'{'}Ctrl{'}'}a, {'{'}Enter{'}'}
        </p>
      </div>
    </div>
  )
}

// 滚动控件配置
export function DesktopScrollControlConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="controlInfo">控件信息</Label>
        <VariableInput
          value={(data.controlInfo as string) || ''}
          onChange={(v) => onChange('controlInfo', v)}
          placeholder="从查找控件模块获取，支持 {变量名}"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="direction">滚动方向</Label>
        <Select
          id="direction"
          value={(data.direction as string) || 'down'}
          onChange={(e) => onChange('direction', e.target.value)}
        >
          <option value="down">向下</option>
          <option value="up">向上</option>
          <option value="left">向左</option>
          <option value="right">向右</option>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="amount">滚动次数</Label>
        <NumberInput
          id="amount"
          value={(data.amount as number) ?? 3}
          onChange={(v) => onChange('amount', v)}
          defaultValue={3}
          min={1}
        />
      </div>
    </div>
  )
}

// 点击菜单项配置
export function DesktopMenuClickConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="windowHandle">窗口句柄</Label>
        <VariableInput
          value={(data.windowHandle as string) || ''}
          onChange={(v) => onChange('windowHandle', v)}
          placeholder="从连接应用模块获取，支持 {变量名}"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="menuPath">菜单路径</Label>
        <VariableInput
          value={(data.menuPath as string) || ''}
          onChange={(v) => onChange('menuPath', v)}
          placeholder="如: 文件->打开，支持 {变量名}"
        />
        <p className="text-xs text-muted-foreground">
          使用 {'->'} 分隔多级菜单
        </p>
      </div>
    </div>
  )
}

// 获取控件信息配置
export function DesktopGetControlInfoConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="controlInfo">控件信息</Label>
        <VariableInput
          value={(data.controlInfo as string) || ''}
          onChange={(v) => onChange('controlInfo', v)}
          placeholder="从查找控件模块获取，支持 {变量名}"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="variableName">存储信息到变量</Label>
        <VariableNameInput
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="存储控件详细信息"
          isStorageVariable={true}
        />
      </div>
    </div>
  )
}

// 获取控件树配置
export function DesktopGetControlTreeConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="windowHandle">窗口句柄</Label>
        <VariableInput
          value={(data.windowHandle as string) || ''}
          onChange={(v) => onChange('windowHandle', v)}
          placeholder="从连接应用模块获取，支持 {变量名}"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="maxDepth">最大深度</Label>
        <NumberInput
          id="maxDepth"
          value={(data.maxDepth as number) ?? 5}
          onChange={(v) => onChange('maxDepth', v)}
          defaultValue={5}
          min={1}
          max={10}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="variableName">存储控件树到变量</Label>
        <VariableNameInput
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="存储完整控件树结构"
          isStorageVariable={true}
        />
      </div>
    </div>
  )
}

// 导出所有不存在的旧配置组件（占位符）
export function DesktopAppGetInfoConfig(_props: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return <div className="p-4 text-center text-muted-foreground">此模块已移除，请使用"获取控件信息"模块</div>
}

export function DesktopAppWaitReadyConfig(_props: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return <div className="p-4 text-center text-muted-foreground">此模块已移除，请在"启动桌面应用"中勾选"等待应用就绪"</div>
}

export function DesktopWindowListConfig(_props: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return <div className="p-4 text-center text-muted-foreground">此模块已移除</div>
}

export function DesktopControlInfoConfig(_props: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return <div className="p-4 text-center text-muted-foreground">此模块已移除，请使用"获取控件信息"模块</div>
}

export function DesktopControlTreeConfig(_props: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return <div className="p-4 text-center text-muted-foreground">此模块已移除，请使用"获取控件树"模块</div>
}

export function DesktopSetValueConfig(_props: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return <div className="p-4 text-center text-muted-foreground">此模块已移除，请使用"输入文本到控件"模块</div>
}

export function DesktopDragControlConfig(_props: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return <div className="p-4 text-center text-muted-foreground">此模块已移除</div>
}

export function DesktopListOperateConfig(_props: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return <div className="p-4 text-center text-muted-foreground">此模块已移除</div>
}

export function DesktopGetPropertyConfig(_props: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return <div className="p-4 text-center text-muted-foreground">此模块已移除，请使用"获取控件信息"模块</div>
}

export function DesktopDialogHandleConfig(_props: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return <div className="p-4 text-center text-muted-foreground">此模块已移除</div>
}
