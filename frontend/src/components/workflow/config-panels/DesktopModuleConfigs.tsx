import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { SelectNative as Select } from '@/components/ui/select-native'
import { VariableInput } from '@/components/ui/variable-input'
import { WindowTitleInput } from '@/components/ui/window-title-input'
import type { NodeData } from '@/store/workflowStore'
import type React from 'react'
import { AlertCircle } from 'lucide-react'

interface ConfigProps {
  data: NodeData
  onChange: (key: string, value: unknown) => void
  renderDesktopSelectorInput?: (id: string, label: string, placeholder: string) => React.ReactNode
}

// 桌面应用模块通用提示组件
function DesktopModuleInfo() {
  return (
    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-start gap-2">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 text-sm">
          <p className="font-medium text-blue-900 mb-1">桌面应用自动化说明</p>
          <p className="text-blue-800 mb-2">
            基于 Windows UI Automation API，支持几乎所有 Windows 桌面应用：
          </p>
          <ul className="text-blue-800 space-y-1 ml-4">
            <li>• <strong>传统应用</strong>：记事本、计算器、Office 等</li>
            <li>• <strong>现代应用</strong>：QQ、微信、钉钉、VS Code 等</li>
            <li>• <strong>浏览器</strong>：Chrome、Edge、Firefox 等</li>
            <li>• <strong>其他</strong>：WPF、UWP、Qt、Electron 应用</li>
          </ul>
          <div className="mt-2 pt-2 border-t border-blue-200">
            <p className="text-blue-800 text-xs">
              提示：如果某些控件无法识别，可以结合使用图像识别、OCR识别或真实鼠标键盘操作
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ========== 应用管理模块 ==========

export function DesktopAppStartConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <DesktopModuleInfo />
      <div className="space-y-2">
        <Label htmlFor="appPath">应用路径</Label>
        <VariableInput
          value={(data.appPath as string) || ''}
          onChange={(v) => onChange('appPath', v)}
          placeholder="例如: C:\Program Files\Notepad++\notepad++.exe"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="args">启动参数（可选）</Label>
        <VariableInput
          value={(data.args as string) || ''}
          onChange={(v) => onChange('args', v)}
          placeholder="例如: --new-window"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="workDir">工作目录（可选）</Label>
        <VariableInput
          value={(data.workDir as string) || ''}
          onChange={(v) => onChange('workDir', v)}
          placeholder="例如: C:\Users\Documents"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="backend">后端类型</Label>
        <Select
          value={(data.backend as string) || 'uia'}
          onChange={(e) => onChange('backend', e.target.value)}
        >
          <option value="uia">UIA (推荐)</option>
          <option value="win32">Win32</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="saveToVariable">保存到变量</Label>
        <Input
          value={(data.saveToVariable as string) || 'desktop_app'}
          onChange={(e) => onChange('saveToVariable', e.target.value)}
          placeholder="desktop_app"
        />
      </div>
    </div>
  )
}

export function DesktopAppConnectConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <DesktopModuleInfo />
      <div className="space-y-2">
        <Label htmlFor="connectType">连接方式</Label>
        <Select
          value={(data.connectType as string) || 'title'}
          onChange={(e) => onChange('connectType', e.target.value)}
        >
          <option value="title">窗口标题</option>
          <option value="process">进程ID</option>
          <option value="path">应用路径</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="connectValue">连接值</Label>
        {((data.connectType as string) || 'title') === 'title' ? (
          <WindowTitleInput
            value={(data.connectValue as string) || ''}
            onChange={(v) => onChange('connectValue', v)}
            placeholder="例如: 记事本（可点右侧按钮选择窗口）"
          />
        ) : (
          <VariableInput
            value={(data.connectValue as string) || ''}
            onChange={(v) => onChange('connectValue', v)}
            placeholder="例如: 记事本"
          />
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="backend">后端类型</Label>
        <Select
          value={(data.backend as string) || 'uia'}
          onChange={(e) => onChange('backend', e.target.value)}
        >
          <option value="uia">UIA (推荐)</option>
          <option value="win32">Win32</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="saveToVariable">保存到变量</Label>
        <Input
          value={(data.saveToVariable as string) || 'desktop_app'}
          onChange={(e) => onChange('saveToVariable', e.target.value)}
          placeholder="desktop_app"
        />
      </div>
    </div>
  )
}

export function DesktopAppCloseConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <DesktopModuleInfo />
      <div className="space-y-2">
        <Label htmlFor="appVariable">应用变量</Label>
        <Input
          value={(data.appVariable as string) || 'desktop_app'}
          onChange={(e) => onChange('appVariable', e.target.value)}
          placeholder="desktop_app"
        />
      </div>
    </div>
  )
}

export function DesktopAppGetInfoConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <DesktopModuleInfo />
      <div className="space-y-2">
        <Label htmlFor="appVariable">应用变量</Label>
        <Input
          value={(data.appVariable as string) || 'desktop_app'}
          onChange={(e) => onChange('appVariable', e.target.value)}
          placeholder="desktop_app"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="saveToVariable">保存到变量</Label>
        <Input
          value={(data.saveToVariable as string) || 'app_info'}
          onChange={(e) => onChange('saveToVariable', e.target.value)}
          placeholder="app_info"
        />
      </div>
    </div>
  )
}

export function DesktopAppWaitReadyConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <DesktopModuleInfo />
      <div className="space-y-2">
        <Label htmlFor="appVariable">应用变量</Label>
        <Input
          value={(data.appVariable as string) || 'desktop_app'}
          onChange={(e) => onChange('appVariable', e.target.value)}
          placeholder="desktop_app"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="timeout">超时时间（秒）</Label>
        <Input
          type="number"
          value={(data.timeout as number) || 30}
          onChange={(e) => onChange('timeout', parseInt(e.target.value))}
          placeholder="30"
        />
      </div>
    </div>
  )
}

// ========== 窗口操作模块 ==========

export function DesktopWindowActivateConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <DesktopModuleInfo />
      <div className="space-y-2">
        <Label htmlFor="appVariable">应用变量</Label>
        <Input
          value={(data.appVariable as string) || 'desktop_app'}
          onChange={(e) => onChange('appVariable', e.target.value)}
          placeholder="desktop_app"
        />
      </div>
    </div>
  )
}

export function DesktopWindowStateConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <DesktopModuleInfo />
      <div className="space-y-2">
        <Label htmlFor="appVariable">应用变量</Label>
        <Input
          value={(data.appVariable as string) || 'desktop_app'}
          onChange={(e) => onChange('appVariable', e.target.value)}
          placeholder="desktop_app"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="state">窗口状态</Label>
        <Select
          value={(data.state as string) || 'maximize'}
          onChange={(e) => onChange('state', e.target.value)}
        >
          <option value="maximize">最大化</option>
          <option value="minimize">最小化</option>
          <option value="restore">还原</option>
          <option value="normal">正常</option>
        </Select>
      </div>
    </div>
  )
}

export function DesktopWindowMoveConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <DesktopModuleInfo />
      <div className="space-y-2">
        <Label htmlFor="appVariable">应用变量</Label>
        <Input
          value={(data.appVariable as string) || 'desktop_app'}
          onChange={(e) => onChange('appVariable', e.target.value)}
          placeholder="desktop_app"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="x">X坐标</Label>
        <VariableInput
          value={String(data.x || 0)}
          onChange={(v) => onChange('x', v)}
          placeholder="0"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="y">Y坐标</Label>
        <VariableInput
          value={String(data.y || 0)}
          onChange={(v) => onChange('y', v)}
          placeholder="0"
        />
      </div>
    </div>
  )
}

export function DesktopWindowResizeConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <DesktopModuleInfo />
      <div className="space-y-2">
        <Label htmlFor="appVariable">应用变量</Label>
        <Input
          value={(data.appVariable as string) || 'desktop_app'}
          onChange={(e) => onChange('appVariable', e.target.value)}
          placeholder="desktop_app"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="width">宽度</Label>
        <VariableInput
          value={String(data.width || 800)}
          onChange={(v) => onChange('width', v)}
          placeholder="800"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="height">高度</Label>
        <VariableInput
          value={String(data.height || 600)}
          onChange={(v) => onChange('height', v)}
          placeholder="600"
        />
      </div>
    </div>
  )
}

export function DesktopWindowTopmostConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <DesktopModuleInfo />
      <div className="space-y-2">
        <Label htmlFor="appVariable">应用变量</Label>
        <Input
          value={(data.appVariable as string) || 'desktop_app'}
          onChange={(e) => onChange('appVariable', e.target.value)}
          placeholder="desktop_app"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="topmost">置顶状态</Label>
        <Select
          value={String(data.topmost ?? true)}
          onChange={(e) => onChange('topmost', e.target.value === 'true')}
        >
          <option value="true">置顶</option>
          <option value="false">取消置顶</option>
        </Select>
      </div>
    </div>
  )
}

export function DesktopWindowListConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <DesktopModuleInfo />
      <div className="space-y-2">
        <Label htmlFor="filterTitle">过滤标题（可选）</Label>
        <VariableInput
          value={(data.filterTitle as string) || ''}
          onChange={(v) => onChange('filterTitle', v)}
          placeholder="留空获取所有窗口"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="saveToVariable">保存到变量</Label>
        <Input
          value={(data.saveToVariable as string) || 'window_list'}
          onChange={(e) => onChange('saveToVariable', e.target.value)}
          placeholder="window_list"
        />
      </div>
    </div>
  )
}

export function DesktopWindowCaptureConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <DesktopModuleInfo />
      <div className="space-y-2">
        <Label htmlFor="appVariable">应用变量</Label>
        <Input
          value={(data.appVariable as string) || 'desktop_app'}
          onChange={(e) => onChange('appVariable', e.target.value)}
          placeholder="desktop_app"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="captureType">截图类型</Label>
        <Select
          value={(data.captureType as string) || 'window'}
          onChange={(e) => onChange('captureType', e.target.value)}
        >
          <option value="window">整个窗口</option>
          <option value="client">客户区</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="savePath">保存路径（可选）</Label>
        <VariableInput
          value={(data.savePath as string) || ''}
          onChange={(v) => onChange('savePath', v)}
          placeholder="留空自动生成"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="saveToVariable">保存路径到变量</Label>
        <Input
          value={(data.saveToVariable as string) || 'screenshot_path'}
          onChange={(e) => onChange('saveToVariable', e.target.value)}
          placeholder="screenshot_path"
        />
      </div>
    </div>
  )
}

// ========== 控件操作模块 ==========

export function DesktopFindControlConfig({ data, onChange, renderDesktopSelectorInput }: ConfigProps) {
  return (
    <div className="space-y-4">
      <DesktopModuleInfo />
      <div className="space-y-2">
        <Label htmlFor="appVariable">应用变量</Label>
        <Input
          value={(data.appVariable as string) || 'desktop_app'}
          onChange={(e) => onChange('appVariable', e.target.value)}
          placeholder="desktop_app"
        />
      </div>
      {renderDesktopSelectorInput ? (
        renderDesktopSelectorInput('controlPath', '控件路径', '点击选择器按钮捕获桌面元素')
      ) : (
        <div className="space-y-2">
          <Label htmlFor="controlPath">控件路径</Label>
          <VariableInput
            value={(data.controlPath as string) || ''}
            onChange={(v) => onChange('controlPath', v)}
            placeholder="点击选择器按钮捕获桌面元素"
          />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="findType">查找方式</Label>
        <Select
          value={(data.findType as string) || 'title'}
          onChange={(e) => onChange('findType', e.target.value)}
        >
          <option value="title">标题</option>
          <option value="class_name">类名</option>
          <option value="control_type">控件类型</option>
          <option value="automation_id">自动化ID</option>
          <option value="control_path">控件路径（推荐）</option>
        </Select>
      </div>
      {data.findType !== 'control_path' && (
        <div className="space-y-2">
          <Label htmlFor="findValue">查找值</Label>
          <VariableInput
            value={(data.findValue as string) || ''}
            onChange={(v) => onChange('findValue', v)}
            placeholder="例如: 确定"
          />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="saveToVariable">保存到变量</Label>
        <Input
          value={(data.saveToVariable as string) || 'desktop_control'}
          onChange={(e) => onChange('saveToVariable', e.target.value)}
          placeholder="desktop_control"
        />
      </div>
    </div>
  )
}

export function DesktopControlInfoConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <DesktopModuleInfo />
      <div className="space-y-2">
        <Label htmlFor="controlVariable">控件变量</Label>
        <Input
          value={(data.controlVariable as string) || 'desktop_control'}
          onChange={(e) => onChange('controlVariable', e.target.value)}
          placeholder="desktop_control"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="saveToVariable">保存到变量</Label>
        <Input
          value={(data.saveToVariable as string) || 'control_info'}
          onChange={(e) => onChange('saveToVariable', e.target.value)}
          placeholder="control_info"
        />
      </div>
    </div>
  )
}

export function DesktopControlTreeConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <DesktopModuleInfo />
      <div className="space-y-2">
        <Label htmlFor="appVariable">应用变量</Label>
        <Input
          value={(data.appVariable as string) || 'desktop_app'}
          onChange={(e) => onChange('appVariable', e.target.value)}
          placeholder="desktop_app"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="maxDepth">最大深度</Label>
        <Input
          type="number"
          value={(data.maxDepth as number) || 3}
          onChange={(e) => onChange('maxDepth', parseInt(e.target.value))}
          placeholder="3"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="saveToVariable">保存到变量</Label>
        <Input
          value={(data.saveToVariable as string) || 'control_tree'}
          onChange={(e) => onChange('saveToVariable', e.target.value)}
          placeholder="control_tree"
        />
      </div>
    </div>
  )
}

export function DesktopWaitControlConfig({ data, onChange, renderDesktopSelectorInput }: ConfigProps) {
  return (
    <div className="space-y-4">
      <DesktopModuleInfo />
      <div className="space-y-2">
        <Label htmlFor="appVariable">应用变量</Label>
        <Input
          value={(data.appVariable as string) || 'desktop_app'}
          onChange={(e) => onChange('appVariable', e.target.value)}
          placeholder="desktop_app"
        />
      </div>
      {renderDesktopSelectorInput ? (
        renderDesktopSelectorInput('controlPath', '控件路径', '点击选择器按钮捕获桌面元素')
      ) : (
        <div className="space-y-2">
          <Label htmlFor="controlPath">控件路径</Label>
          <VariableInput
            value={(data.controlPath as string) || ''}
            onChange={(v) => onChange('controlPath', v)}
            placeholder="点击选择器按钮捕获桌面元素"
          />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="findType">查找方式</Label>
        <Select
          value={(data.findType as string) || 'title'}
          onChange={(e) => onChange('findType', e.target.value)}
        >
          <option value="title">标题</option>
          <option value="class_name">类名</option>
          <option value="control_type">控件类型</option>
          <option value="automation_id">自动化ID</option>
          <option value="control_path">控件路径（推荐）</option>
        </Select>
      </div>
      {data.findType !== 'control_path' && (
        <div className="space-y-2">
          <Label htmlFor="findValue">查找值</Label>
          <VariableInput
            value={(data.findValue as string) || ''}
            onChange={(v) => onChange('findValue', v)}
            placeholder="例如: 确定"
          />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="timeout">超时时间（秒）</Label>
        <Input
          type="number"
          value={(data.timeout as number) || 30}
          onChange={(e) => onChange('timeout', parseInt(e.target.value))}
          placeholder="30"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="saveToVariable">保存到变量</Label>
        <Input
          value={(data.saveToVariable as string) || 'desktop_control'}
          onChange={(e) => onChange('saveToVariable', e.target.value)}
          placeholder="desktop_control"
        />
      </div>
    </div>
  )
}

export function DesktopClickControlConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <DesktopModuleInfo />
      <div className="space-y-2">
        <Label htmlFor="controlVariable">控件变量</Label>
        <Input
          value={(data.controlVariable as string) || 'desktop_control'}
          onChange={(e) => onChange('controlVariable', e.target.value)}
          placeholder="desktop_control"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="button">鼠标按钮</Label>
        <Select
          value={(data.button as string) || 'left'}
          onChange={(e) => onChange('button', e.target.value)}
        >
          <option value="left">左键</option>
          <option value="right">右键</option>
          <option value="double">双击</option>
        </Select>
      </div>
    </div>
  )
}

export function DesktopInputControlConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <DesktopModuleInfo />
      <div className="space-y-2">
        <Label htmlFor="controlVariable">控件变量</Label>
        <Input
          value={(data.controlVariable as string) || 'desktop_control'}
          onChange={(e) => onChange('controlVariable', e.target.value)}
          placeholder="desktop_control"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="text">输入文本</Label>
        <VariableInput
          value={(data.text as string) || ''}
          onChange={(v) => onChange('text', v)}
          placeholder="要输入的文本"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="clearFirst">输入前清空</Label>
        <Select
          value={String(data.clearFirst ?? true)}
          onChange={(e) => onChange('clearFirst', e.target.value === 'true')}
        >
          <option value="true">是</option>
          <option value="false">否</option>
        </Select>
      </div>
    </div>
  )
}

export function DesktopGetTextConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <DesktopModuleInfo />
      <div className="space-y-2">
        <Label htmlFor="controlVariable">控件变量</Label>
        <Input
          value={(data.controlVariable as string) || 'desktop_control'}
          onChange={(e) => onChange('controlVariable', e.target.value)}
          placeholder="desktop_control"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="saveToVariable">保存到变量</Label>
        <Input
          value={(data.saveToVariable as string) || 'control_text'}
          onChange={(e) => onChange('saveToVariable', e.target.value)}
          placeholder="control_text"
        />
      </div>
    </div>
  )
}

export function DesktopSetValueConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <DesktopModuleInfo />
      <div className="space-y-2">
        <Label htmlFor="controlVariable">控件变量</Label>
        <Input
          value={(data.controlVariable as string) || 'desktop_control'}
          onChange={(e) => onChange('controlVariable', e.target.value)}
          placeholder="desktop_control"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="value">设置值</Label>
        <VariableInput
          value={(data.value as string) || ''}
          onChange={(v) => onChange('value', v)}
          placeholder="要设置的值"
        />
      </div>
    </div>
  )
}

// ========== 高级操作模块 ==========

export function DesktopSelectComboConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <DesktopModuleInfo />
      <div className="space-y-2">
        <Label htmlFor="controlVariable">控件变量</Label>
        <Input
          value={(data.controlVariable as string) || 'desktop_control'}
          onChange={(e) => onChange('controlVariable', e.target.value)}
          placeholder="desktop_control"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="selectType">选择方式</Label>
        <Select
          value={(data.selectType as string) || 'text'}
          onChange={(e) => onChange('selectType', e.target.value)}
        >
          <option value="text">文本</option>
          <option value="index">索引</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="selectValue">选择值</Label>
        <VariableInput
          value={(data.selectValue as string) || ''}
          onChange={(v) => onChange('selectValue', v)}
          placeholder="文本或索引"
        />
      </div>
    </div>
  )
}

export function DesktopCheckboxConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <DesktopModuleInfo />
      <div className="space-y-2">
        <Label htmlFor="controlVariable">控件变量</Label>
        <Input
          value={(data.controlVariable as string) || 'desktop_control'}
          onChange={(e) => onChange('controlVariable', e.target.value)}
          placeholder="desktop_control"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="action">操作</Label>
        <Select
          value={(data.action as string) || 'check'}
          onChange={(e) => onChange('action', e.target.value)}
        >
          <option value="check">勾选</option>
          <option value="uncheck">取消勾选</option>
          <option value="toggle">切换</option>
          <option value="get_state">获取状态</option>
        </Select>
      </div>
      {data.action === 'get_state' && (
        <div className="space-y-2">
          <Label htmlFor="saveToVariable">保存到变量</Label>
          <Input
            value={(data.saveToVariable as string) || 'checkbox_state'}
            onChange={(e) => onChange('saveToVariable', e.target.value)}
            placeholder="checkbox_state"
          />
        </div>
      )}
    </div>
  )
}

export function DesktopRadioConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <DesktopModuleInfo />
      <div className="space-y-2">
        <Label htmlFor="controlVariable">控件变量</Label>
        <Input
          value={(data.controlVariable as string) || 'desktop_control'}
          onChange={(e) => onChange('controlVariable', e.target.value)}
          placeholder="desktop_control"
        />
      </div>
      <p className="text-sm text-muted-foreground">
        选择单选按钮
      </p>
    </div>
  )
}

export function DesktopDragControlConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <DesktopModuleInfo />
      <div className="space-y-2">
        <Label htmlFor="controlVariable">控件变量</Label>
        <Input
          value={(data.controlVariable as string) || 'desktop_control'}
          onChange={(e) => onChange('controlVariable', e.target.value)}
          placeholder="desktop_control"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="targetX">目标X坐标</Label>
        <VariableInput
          value={String(data.targetX || 0)}
          onChange={(v) => onChange('targetX', v)}
          placeholder="0"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="targetY">目标Y坐标</Label>
        <VariableInput
          value={String(data.targetY || 0)}
          onChange={(v) => onChange('targetY', v)}
          placeholder="0"
        />
      </div>
    </div>
  )
}

export function DesktopMenuClickConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <DesktopModuleInfo />
      <div className="space-y-2">
        <Label htmlFor="appVariable">应用变量</Label>
        <Input
          value={(data.appVariable as string) || 'desktop_app'}
          onChange={(e) => onChange('appVariable', e.target.value)}
          placeholder="desktop_app"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="menuPath">菜单路径</Label>
        <VariableInput
          value={(data.menuPath as string) || ''}
          onChange={(v) => onChange('menuPath', v)}
          placeholder="例如: 文件->打开"
        />
        <p className="text-xs text-muted-foreground">
          使用 -&gt; 分隔多级菜单
        </p>
      </div>
    </div>
  )
}

export function DesktopListOperateConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <DesktopModuleInfo />
      <div className="space-y-2">
        <Label htmlFor="controlVariable">控件变量</Label>
        <Input
          value={(data.controlVariable as string) || 'desktop_control'}
          onChange={(e) => onChange('controlVariable', e.target.value)}
          placeholder="desktop_control"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="operation">操作</Label>
        <Select
          value={(data.operation as string) || 'select'}
          onChange={(e) => onChange('operation', e.target.value)}
        >
          <option value="select">选择项</option>
          <option value="get_items">获取所有项</option>
          <option value="get_selected">获取选中项</option>
        </Select>
      </div>
      {data.operation === 'select' && (
        <div className="space-y-2">
          <Label htmlFor="value">选择值</Label>
          <VariableInput
            value={(data.value as string) || ''}
            onChange={(v) => onChange('value', v)}
            placeholder="文本或索引"
          />
        </div>
      )}
      {(data.operation === 'get_items' || data.operation === 'get_selected') && (
        <div className="space-y-2">
          <Label htmlFor="saveToVariable">保存到变量</Label>
          <Input
            value={(data.saveToVariable as string) || 'list_result'}
            onChange={(e) => onChange('saveToVariable', e.target.value)}
            placeholder="list_result"
          />
        </div>
      )}
    </div>
  )
}

export function DesktopSendKeysConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <DesktopModuleInfo />
      <div className="space-y-2">
        <Label htmlFor="appVariable">应用变量</Label>
        <Input
          value={(data.appVariable as string) || 'desktop_app'}
          onChange={(e) => onChange('appVariable', e.target.value)}
          placeholder="desktop_app"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="keys">快捷键</Label>
        <VariableInput
          value={(data.keys as string) || ''}
          onChange={(v) => onChange('keys', v)}
          placeholder="例如: ^s (Ctrl+S)"
        />
        <p className="text-xs text-muted-foreground">
          ^ = Ctrl, + = Shift, % = Alt
        </p>
      </div>
    </div>
  )
}

export function DesktopScrollControlConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <DesktopModuleInfo />
      <div className="space-y-2">
        <Label htmlFor="controlVariable">控件变量</Label>
        <Input
          value={(data.controlVariable as string) || 'desktop_control'}
          onChange={(e) => onChange('controlVariable', e.target.value)}
          placeholder="desktop_control"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="direction">滚动方向</Label>
        <Select
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
        <Input
          type="number"
          value={(data.amount as number) || 3}
          onChange={(e) => onChange('amount', parseInt(e.target.value))}
          placeholder="3"
        />
      </div>
    </div>
  )
}

export function DesktopGetControlInfoConfig({ data, onChange }: ConfigProps) {
  return <DesktopControlInfoConfig data={data} onChange={onChange} />
}

export function DesktopGetControlTreeConfig({ data, onChange }: ConfigProps) {
  return <DesktopControlTreeConfig data={data} onChange={onChange} />
}

export function DesktopGetPropertyConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <DesktopModuleInfo />
      <div className="space-y-2">
        <Label htmlFor="controlVariable">控件变量</Label>
        <Input
          value={(data.controlVariable as string) || 'desktop_control'}
          onChange={(e) => onChange('controlVariable', e.target.value)}
          placeholder="desktop_control"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="propertyName">属性名</Label>
        <VariableInput
          value={(data.propertyName as string) || ''}
          onChange={(v) => onChange('propertyName', v)}
          placeholder="例如: is_enabled"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="saveToVariable">保存到变量</Label>
        <Input
          value={(data.saveToVariable as string) || 'property_value'}
          onChange={(e) => onChange('saveToVariable', e.target.value)}
          placeholder="property_value"
        />
      </div>
    </div>
  )
}

export function DesktopDialogHandleConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <DesktopModuleInfo />
      <div className="space-y-2">
        <Label htmlFor="appVariable">应用变量</Label>
        <Input
          value={(data.appVariable as string) || 'desktop_app'}
          onChange={(e) => onChange('appVariable', e.target.value)}
          placeholder="desktop_app"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="buttonText">按钮文本</Label>
        <VariableInput
          value={(data.buttonText as string) || '确定'}
          onChange={(v) => onChange('buttonText', v)}
          placeholder="确定"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="timeout">超时时间（秒）</Label>
        <Input
          type="number"
          value={(data.timeout as number) || 10}
          onChange={(e) => onChange('timeout', parseInt(e.target.value))}
          placeholder="10"
        />
      </div>
    </div>
  )
}



export function DesktopHotkeyConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label>热键组合 *</Label>
        <VariableInput
          value={(data.keys as string) || ''}
          onChange={(v) => onChange('keys', v)}
          placeholder="例如：ctrl+s / ctrl+shift+n / alt+f4 / win+e"
        />
        <div className="text-xs text-gray-500 mt-1">
          用 + 连接多个键，支持 ctrl / shift / alt / win / 字母 / f1~f12 / enter / esc / tab 等
        </div>
      </div>
      <div>
        <Label>目标窗口标题（可选）</Label>
        <WindowTitleInput
          value={(data.targetWindow as string) || ''}
          onChange={(v) => onChange('targetWindow', v)}
          placeholder="留空则发到当前活动窗口"
        />
      </div>
      <div>
        <Label>按键间隔（秒）</Label>
        <Input
          type="number"
          step="0.01"
          value={(data.interval as number) ?? 0.05}
          onChange={(e) => onChange('interval', Number(e.target.value))}
        />
      </div>
    </div>
  )
}


// ========== 影刀级桌面增强 ==========

export function DesktopFindControlSmartConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <div className="text-xs p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-800">
        智能查找：支持通配符（* ?）+ 模糊匹配 + 多属性组合，自动按评分挑最稳定的控件
      </div>
      <div>
        <Label>应用变量</Label>
        <Input
          value={(data.appVariable as string) || 'desktop_app'}
          onChange={(e) => onChange('appVariable', e.target.value)}
          placeholder="desktop_app"
        />
      </div>
      <div>
        <Label>name 通配符</Label>
        <VariableInput
          value={(data.namePattern as string) || ''}
          onChange={(v) => onChange('namePattern', v)}
          placeholder="例如 *登录* 或 ?保存"
        />
      </div>
      <div>
        <Label>ClassName 通配符（可选）</Label>
        <VariableInput
          value={(data.classPattern as string) || ''}
          onChange={(v) => onChange('classPattern', v)}
          placeholder="例如 Button*"
        />
      </div>
      <div>
        <Label>AutomationId（可选，最稳定）</Label>
        <VariableInput
          value={(data.automationId as string) || ''}
          onChange={(v) => onChange('automationId', v)}
          placeholder="精确匹配"
        />
      </div>
      <div>
        <Label>控件类型（可选）</Label>
        <Select
          value={(data.controlType as string) || ''}
          onChange={(e) => onChange('controlType', e.target.value)}
        >
          <option value="">不限</option>
          <option value="Button">按钮</option>
          <option value="Edit">输入框</option>
          <option value="Text">文本</option>
          <option value="ComboBox">下拉框</option>
          <option value="ListItem">列表项</option>
          <option value="CheckBox">复选框</option>
          <option value="RadioButton">单选按钮</option>
          <option value="Tab">选项卡</option>
          <option value="MenuItem">菜单项</option>
          <option value="TreeItem">树节点</option>
          <option value="Hyperlink">超链接</option>
          <option value="Image">图像</option>
        </Select>
      </div>
      <div>
        <Label>name 包含子串（可选）</Label>
        <VariableInput
          value={(data.textContains as string) || ''}
          onChange={(v) => onChange('textContains', v)}
          placeholder="包含此文字即可"
        />
      </div>
      <label className="flex items-center gap-2">
        <Checkbox
          checked={(data.fuzzyMatch as boolean) ?? false}
          onCheckedChange={(c) => onChange('fuzzyMatch', c)}
        />
        <span className="text-sm">启用模糊匹配（name 不一致也能找到相似的）</span>
      </label>
      <div>
        <Label>模糊匹配阈值（0-1）</Label>
        <Input
          type="number"
          step="0.05"
          min={0}
          max={1}
          value={(data.fuzzyThreshold as number) ?? 0.7}
          onChange={(e) => onChange('fuzzyThreshold', Number(e.target.value))}
        />
      </div>
      <label className="flex items-center gap-2">
        <Checkbox
          checked={(data.returnAll as boolean) ?? false}
          onCheckedChange={(c) => onChange('returnAll', c)}
        />
        <span className="text-sm">返回所有候选（数组形式）</span>
      </label>
      <div>
        <Label>搜索深度</Label>
        <Input
          type="number"
          value={(data.searchDepth as number) ?? 15}
          onChange={(e) => onChange('searchDepth', Number(e.target.value))}
        />
      </div>
      <div>
        <Label>等待超时（秒）</Label>
        <Input
          type="number"
          value={(data.timeout as number) ?? 5}
          onChange={(e) => onChange('timeout', Number(e.target.value))}
        />
      </div>
      <div>
        <Label>保存到变量</Label>
        <Input
          value={(data.saveToVariable as string) || 'desktop_control'}
          onChange={(e) => onChange('saveToVariable', e.target.value)}
          placeholder="desktop_control"
        />
      </div>
    </div>
  )
}

export function DesktopExtractTableConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <div className="text-xs p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-800">
        批量抓取列表/表格控件的所有行数据（影刀 DataExtraction Wizard 同款）
      </div>
      <div>
        <Label>应用变量</Label>
        <Input
          value={(data.appVariable as string) || 'desktop_app'}
          onChange={(e) => onChange('appVariable', e.target.value)}
        />
      </div>
      <div>
        <Label>容器类型</Label>
        <Select
          value={(data.containerType as string) || 'List'}
          onChange={(e) => onChange('containerType', e.target.value)}
        >
          <option value="List">列表 List</option>
          <option value="DataGrid">表格 DataGrid</option>
          <option value="Tree">树 Tree</option>
          <option value="Table">表 Table</option>
        </Select>
      </div>
      <div>
        <Label>容器名（可选，留空自动找）</Label>
        <VariableInput
          value={(data.containerName as string) || ''}
          onChange={(v) => onChange('containerName', v)}
          placeholder="容器控件名"
        />
      </div>
      <div>
        <Label>列名映射（可选，逗号分隔）</Label>
        <VariableInput
          value={(data.includeColumns as string) || ''}
          onChange={(v) => onChange('includeColumns', v)}
          placeholder="例如：姓名,年龄,部门"
        />
      </div>
      <div>
        <Label>最多抓取条数</Label>
        <Input
          type="number"
          value={(data.limit as number) ?? 1000}
          onChange={(e) => onChange('limit', Number(e.target.value))}
        />
      </div>
      <label className="flex items-center gap-2">
        <Checkbox
          checked={(data.scrollToLoad as boolean) ?? false}
          onCheckedChange={(c) => onChange('scrollToLoad', c)}
        />
        <span className="text-sm">滚动加载（虚拟列表场景）</span>
      </label>
      <div>
        <Label>保存到变量</Label>
        <Input
          value={(data.variableName as string) || 'extracted_data'}
          onChange={(e) => onChange('variableName', e.target.value)}
          placeholder="extracted_data"
        />
      </div>
    </div>
  )
}

export function DesktopGetAppStateConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <div className="text-xs p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-800">
        快照当前应用的完整 UI 树 + 焦点位置，AI 排错或快速感知 UI 结构必备
      </div>
      <div>
        <Label>应用变量</Label>
        <Input
          value={(data.appVariable as string) || 'desktop_app'}
          onChange={(e) => onChange('appVariable', e.target.value)}
        />
      </div>
      <div>
        <Label>控件树深度</Label>
        <Input
          type="number"
          value={(data.maxDepth as number) ?? 6}
          onChange={(e) => onChange('maxDepth', Number(e.target.value))}
        />
      </div>
      <label className="flex items-center gap-2">
        <Checkbox
          checked={(data.includeInvisible as boolean) ?? false}
          onCheckedChange={(c) => onChange('includeInvisible', c)}
        />
        <span className="text-sm">包含不可见控件</span>
      </label>
      <div>
        <Label>保存到变量</Label>
        <Input
          value={(data.variableName as string) || 'app_state'}
          onChange={(e) => onChange('variableName', e.target.value)}
        />
      </div>
    </div>
  )
}

export function DesktopQueryWithXpathConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <div className="text-xs p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-800">
        XPath 风格查询，支持 //Button[@name='登录'] / //*[contains(@name,'确定')]
      </div>
      <div>
        <Label>应用变量</Label>
        <Input
          value={(data.appVariable as string) || 'desktop_app'}
          onChange={(e) => onChange('appVariable', e.target.value)}
        />
      </div>
      <div>
        <Label>XPath 表达式 *</Label>
        <VariableInput
          value={(data.xpath as string) || ''}
          onChange={(v) => onChange('xpath', v)}
          placeholder="//Button[@name='登录']"
        />
      </div>
      <div>
        <Label>等待超时（秒）</Label>
        <Input
          type="number"
          value={(data.timeout as number) ?? 5}
          onChange={(e) => onChange('timeout', Number(e.target.value))}
        />
      </div>
      <div>
        <Label>保存到变量</Label>
        <Input
          value={(data.saveToVariable as string) || 'desktop_control'}
          onChange={(e) => onChange('saveToVariable', e.target.value)}
        />
      </div>
    </div>
  )
}

export function DesktopSelectTextConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label>控件变量</Label>
        <Input
          value={(data.controlVariable as string) || 'desktop_control'}
          onChange={(e) => onChange('controlVariable', e.target.value)}
        />
      </div>
      <div>
        <Label>选中模式</Label>
        <Select
          value={(data.selectMode as string) || 'all'}
          onChange={(e) => onChange('selectMode', e.target.value)}
        >
          <option value="all">全选 (Ctrl+A)</option>
          <option value="double_click">双击</option>
          <option value="range">范围（点击）</option>
        </Select>
      </div>
      <div>
        <Label>提取的文字保存到变量</Label>
        <Input
          value={(data.variableName as string) || 'selected_text'}
          onChange={(e) => onChange('variableName', e.target.value)}
        />
      </div>
    </div>
  )
}

export function DesktopGetFocusedControlConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <div className="text-xs p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-800">
        返回当前键盘焦点所在的控件信息（动态分析活跃元素）
      </div>
      <div>
        <Label>保存到变量</Label>
        <Input
          value={(data.saveToVariable as string) || 'focused_control'}
          onChange={(e) => onChange('saveToVariable', e.target.value)}
          placeholder="focused_control"
        />
      </div>
    </div>
  )
}

export function DesktopAssertControlConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <div className="text-xs p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-800">
        断言控件状态，不满足则节点失败（测试场景必备）
      </div>
      <div>
        <Label>控件变量</Label>
        <Input
          value={(data.controlVariable as string) || 'desktop_control'}
          onChange={(e) => onChange('controlVariable', e.target.value)}
        />
      </div>
      <div>
        <Label>断言类型 *</Label>
        <Select
          value={(data.assertion as string) || 'exists'}
          onChange={(e) => onChange('assertion', e.target.value)}
        >
          <option value="exists">控件存在</option>
          <option value="visible">控件可见</option>
          <option value="enabled">控件启用</option>
          <option value="selected">控件已选中</option>
          <option value="text_contains">name 包含文字</option>
          <option value="value_equals">value 等于</option>
        </Select>
      </div>
      {(data.assertion === 'text_contains' || data.assertion === 'value_equals') && (
        <div>
          <Label>期望值</Label>
          <VariableInput
            value={(data.expected as string) || ''}
            onChange={(v) => onChange('expected', v)}
            placeholder="期望的文字 / 值"
          />
        </div>
      )}
    </div>
  )
}

