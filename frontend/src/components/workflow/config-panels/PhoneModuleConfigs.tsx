import type { NodeData } from '@/store/workflowStore'
import { Label } from '@/components/ui/label'
import { NumberInput } from '@/components/ui/number-input'
import { SelectNative as Select } from '@/components/ui/select-native'
import { VariableInput } from '@/components/ui/variable-input'
import { VariableNameInput } from '@/components/ui/variable-name-input'
import { PathInput } from '@/components/ui/path-input'
import { PhoneCoordinateInput } from '@/components/ui/phone-coordinate-input'
import { ImagePathInput } from '@/components/ui/image-path-input'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import React from 'react'
import { phoneApi } from '@/services/api'
import { RefreshCw } from 'lucide-react'

// 获取后端URL的辅助函数
const getBackendUrl = () => {
  const port = sessionStorage.getItem('backendPort') || '5241'
  return `http://localhost:${port}`
}

// 设备选择器组件
function DeviceSelector({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [devices, setDevices] = React.useState<Array<{ id: string; model: string; status: string }>>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    loadDevices()
  }, [])

  const loadDevices = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await phoneApi.getDevices()
      if (response.data?.devices) {
        setDevices(response.data.devices)
      } else if (response.error) {
        setError(response.error)
      } else {
        setError('获取设备列表失败')
      }
    } catch (err) {
      setError('无法连接到后端服务')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="deviceId">目标设备</Label>
        <button
          type="button"
          onClick={loadDevices}
          className="text-xs text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" />
          刷新
        </button>
      </div>
      
      {loading ? (
        <div className="text-xs text-muted-foreground">加载设备列表中...</div>
      ) : error ? (
        <div className="text-xs text-red-600">{error}</div>
      ) : devices.length === 0 ? (
        <div className="text-xs text-orange-600">未检测到已连接的设备</div>
      ) : null}
      
      <VariableInput
        value={value || ''}
        onChange={onChange}
        placeholder={devices.length > 0 ? `留空则使用: ${devices[0].id}` : '留空则使用第一台设备'}
      />
      
      {devices.length > 0 && (
        <div className="p-2 bg-gray-50 border border-gray-200 rounded space-y-1">
          <p className="text-xs font-semibold text-gray-700">已连接的设备：</p>
          {devices.map((device, index) => (
            <div key={device.id} className="flex items-center justify-between text-xs">
              <span className="text-gray-600">
                {index + 1}. {device.id}
              </span>
              <button
                type="button"
                onClick={() => onChange(device.id)}
                className="text-blue-600 hover:text-blue-700 underline"
              >
                选择
              </button>
            </div>
          ))}
        </div>
      )}
      
      <p className="text-xs text-muted-foreground">
        指定要自动化的设备ID，留空则自动使用第一台设备。支持变量引用。
      </p>
    </div>
  )
}

// 点击坐标配置
export function PhoneTapConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <DeviceSelector
        value={(data.deviceId as string) || ''}
        onChange={(v) => onChange('deviceId', v)}
      />
      <div className="space-y-2">
        <Label>点击坐标</Label>
        <PhoneCoordinateInput
          deviceId={(data.deviceId as string) || ''}
          xValue={(data.x as string) || ''}
          yValue={(data.y as string) || ''}
          onXChange={(v) => onChange('x', v)}
          onYChange={(v) => onChange('y', v)}
        />
      </div>
    </>
  )
}

// 滑动配置
export function PhoneSwipeConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  const swipeMode = (data.swipeMode as string) || 'coordinate' // coordinate 或 offset
  
  return (
    <>
      <DeviceSelector
        value={(data.deviceId as string) || ''}
        onChange={(v) => onChange('deviceId', v)}
      />
      <div className="space-y-2">
        <Label htmlFor="swipeMode">滑动模式</Label>
        <Select
          id="swipeMode"
          value={swipeMode}
          onChange={(e) => onChange('swipeMode', e.target.value)}
        >
          <option value="coordinate">坐标模式</option>
          <option value="offset">偏移模式</option>
        </Select>
        <p className="text-xs text-muted-foreground">
          坐标模式：指定起点和终点坐标<br />
          偏移模式：指定起点坐标和滑动距离
        </p>
      </div>

      {swipeMode === 'coordinate' ? (
        <>
          <div className="space-y-2">
            <Label>起点坐标</Label>
            <PhoneCoordinateInput
              deviceId={(data.deviceId as string) || ''}
              xValue={(data.x1 as string) || ''}
              yValue={(data.y1 as string) || ''}
              onXChange={(v) => onChange('x1', v)}
              onYChange={(v) => onChange('y1', v)}
            />
          </div>
          <div className="space-y-2">
            <Label>终点坐标</Label>
            <PhoneCoordinateInput
              deviceId={(data.deviceId as string) || ''}
              xValue={(data.x2 as string) || ''}
              yValue={(data.y2 as string) || ''}
              onXChange={(v) => onChange('x2', v)}
              onYChange={(v) => onChange('y2', v)}
            />
          </div>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <Label>起点坐标</Label>
            <PhoneCoordinateInput
              deviceId={(data.deviceId as string) || ''}
              xValue={(data.x1 as string) || ''}
              yValue={(data.y1 as string) || ''}
              onXChange={(v) => onChange('x1', v)}
              onYChange={(v) => onChange('y1', v)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="offsetX">水平偏移（像素）</Label>
            <NumberInput
              id="offsetX"
              value={(data.offsetX as number) ?? 0}
              onChange={(v) => onChange('offsetX', v)}
              defaultValue={0}
              min={-2000}
              max={2000}
            />
            <p className="text-xs text-muted-foreground">
              正数向右，负数向左
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="offsetY">垂直偏移（像素）</Label>
            <NumberInput
              id="offsetY"
              value={(data.offsetY as number) ?? 0}
              onChange={(v) => onChange('offsetY', v)}
              defaultValue={0}
              min={-3000}
              max={3000}
            />
            <p className="text-xs text-muted-foreground">
              正数向下，负数向上
            </p>
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="duration">滑动时长(秒)</Label>
        <NumberInput
          id="duration"
          value={(data.duration as number) ?? 0.3}
          onChange={(v) => onChange('duration', v)}
          defaultValue={0.3}
          min={0.1}
          max={5}
          step={0.1}
        />
        <p className="text-xs text-muted-foreground">
          滑动动作的持续时间，值越大滑动越慢
        </p>
      </div>
    </>
  )
}

// 长按配置
export function PhoneLongPressConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <DeviceSelector
        value={(data.deviceId as string) || ''}
        onChange={(v) => onChange('deviceId', v)}
      />
      <div className="space-y-2">
        <Label>长按坐标</Label>
        <PhoneCoordinateInput
          deviceId={(data.deviceId as string) || ''}
          xValue={(data.x as string) || ''}
          yValue={(data.y as string) || ''}
          onXChange={(v) => onChange('x', v)}
          onYChange={(v) => onChange('y', v)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="duration">长按时长(秒)</Label>
        <NumberInput
          id="duration"
          value={(data.duration as number) ?? 1}
          onChange={(v) => onChange('duration', v)}
          defaultValue={1}
          min={0.5}
          max={10}
          step={0.1}
        />
        <p className="text-xs text-muted-foreground">
          长按的持续时间
        </p>
      </div>
    </>
  )
}

// 输入文本配置
export function PhoneInputTextConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  const [adbKeyboardStatus, setAdbKeyboardStatus] = React.useState<'checking' | 'installed' | 'not-installed' | 'error'>('checking')
  const [installing, setInstalling] = React.useState(false)
  const [statusMessage, setStatusMessage] = React.useState('')

  // 检查 ADBKeyboard 是否已安装
  React.useEffect(() => {
    checkAdbKeyboardStatus()
  }, [])

  const checkAdbKeyboardStatus = async () => {
    try {
      setAdbKeyboardStatus('checking')
      const response = await fetch(`${getBackendUrl()}/api/phone/check-adbkeyboard`)
      const result = await response.json()
      
      if (result.success) {
        setAdbKeyboardStatus(result.installed ? 'installed' : 'not-installed')
      } else {
        setAdbKeyboardStatus('error')
        setStatusMessage(result.error || '检查失败')
      }
    } catch (error) {
      setAdbKeyboardStatus('error')
      setStatusMessage('无法连接到后端服务')
    }
  }

  const installAdbKeyboard = async () => {
    try {
      setInstalling(true)
      setStatusMessage('正在安装 ADBKeyboard，请稍候...')
      
      const response = await fetch(`${getBackendUrl()}/api/phone/install-adbkeyboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const result = await response.json()
      
      if (result.success) {
        setAdbKeyboardStatus('installed')
        setStatusMessage('ADBKeyboard 安装成功！')
        setTimeout(() => setStatusMessage(''), 3000)
      } else {
        setStatusMessage(`安装失败: ${result.error}`)
      }
    } catch (error) {
      setStatusMessage(`安装失败: ${error}`)
    } finally {
      setInstalling(false)
    }
  }

  // 获取复选框的值，默认为 true
  const autoSwitchKeyboard = (data.autoSwitchKeyboard as boolean) ?? true
  const autoRestoreKeyboard = (data.autoRestoreKeyboard as boolean) ?? true

  return (
    <>
      <DeviceSelector
        value={(data.deviceId as string) || ''}
        onChange={(v) => onChange('deviceId', v)}
      />
      <div className="space-y-2">
        <Label htmlFor="text">输入文本</Label>
        <VariableInput
          value={(data.text as string) || ''}
          onChange={(v) => onChange('text', v)}
          placeholder="要输入的文本内容"
          multiline
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          在当前焦点输入框中输入文本，支持变量引用
        </p>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="autoEnter"
            checked={(data.autoEnter as boolean) ?? false}
            onCheckedChange={(checked) => onChange('autoEnter', checked)}
          />
          <Label htmlFor="autoEnter" className="text-sm font-normal cursor-pointer">
            输入完成后自动回车
          </Label>
        </div>
        <p className="text-xs text-muted-foreground">
          勾选后会在输入文本后自动按下回车键
        </p>
      </div>

      {/* 输入法切换选项 */}
      <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg space-y-3">
        <p className="text-xs font-semibold text-indigo-900">
          ⌨️ 输入法切换设置
        </p>
        
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="autoSwitchKeyboard"
              checked={autoSwitchKeyboard}
              onCheckedChange={(checked) => onChange('autoSwitchKeyboard', checked)}
            />
            <Label htmlFor="autoSwitchKeyboard" className="text-sm font-normal cursor-pointer">
              自动切换到 ADBKeyboard
            </Label>
          </div>
          <p className="text-xs text-indigo-700 ml-6">
            检测到中文时自动切换到 ADBKeyboard 输入法
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="autoRestoreKeyboard"
              checked={autoRestoreKeyboard}
              onCheckedChange={(checked) => onChange('autoRestoreKeyboard', checked)}
            />
            <Label htmlFor="autoRestoreKeyboard" className="text-sm font-normal cursor-pointer">
              自动切回原输入法
            </Label>
          </div>
          <p className="text-xs text-indigo-700 ml-6">
            输入完成后自动恢复到原来的输入法
          </p>
        </div>

        {(!autoSwitchKeyboard || !autoRestoreKeyboard) && (
          <div className="p-2 bg-orange-50 border border-orange-300 rounded space-y-1">
            <p className="text-xs font-semibold text-orange-900">
              ⚡ 性能优化提示
            </p>
            <p className="text-xs text-orange-800">
              • 关闭自动切换可以提高输入速度（减少输入法切换步骤）
            </p>
            <p className="text-xs text-orange-800">
              • 关闭前提：需手动将手机默认输入法改为 ADBKeyboard
            </p>
            <p className="text-xs text-orange-800">
              • 设置方法：手机「设置」→「语言与输入法」→「默认输入法」→ 选择「ADBKeyboard」
            </p>
          </div>
        )}
      </div>
      
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
        <p className="text-xs font-semibold text-amber-900">
          重要提示
        </p>
        <p className="text-xs text-amber-800">
          • 使用前请先用「点击」模块点击输入框，确保输入框已获得焦点
        </p>
        <p className="text-xs text-amber-800">
          • 默认仅支持输入英文、数字和符号
        </p>
        <p className="text-xs text-amber-800">
          • 若需输入中文，请安装 ADBKeyboard 应用（见下方）
        </p>
      </div>

      {/* ADBKeyboard 状态提示 */}
      <div className="p-3 bg-green-50 border border-green-200 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-green-900">
            ⌨️ ADBKeyboard 应用状态
          </p>
          {adbKeyboardStatus === 'checking' && (
            <span className="text-xs text-green-600">检查中...</span>
          )}
          {adbKeyboardStatus === 'installed' && (
            <span className="text-xs text-green-600 font-semibold">已安装</span>
          )}
          {adbKeyboardStatus === 'not-installed' && (
            <span className="text-xs text-orange-600 font-semibold">未安装</span>
          )}
          {adbKeyboardStatus === 'error' && (
            <span className="text-xs text-red-600 font-semibold">检查失败</span>
          )}
        </div>

        {adbKeyboardStatus === 'not-installed' && (
          <>
            <p className="text-xs text-green-800">
              若需输入中文，请安装 ADBKeyboard 应用。点击下方按钮一键安装：
            </p>
            <button
              onClick={installAdbKeyboard}
              disabled={installing}
              className="w-full px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 rounded-md transition-colors"
            >
              {installing ? '正在安装...' : '一键安装 ADBKeyboard'}
            </button>
          </>
        )}

        {adbKeyboardStatus === 'installed' && (
          <div className="space-y-2">
            <p className="text-xs text-green-700 font-semibold">
              ADBKeyboard 已安装，现在可以输入中文了！
            </p>
            <div className="p-2 bg-green-100 border border-green-300 rounded space-y-1">
              <p className="text-xs font-semibold text-green-900">
                使用提示
              </p>
              <p className="text-xs text-green-800">
                • 系统会在输入中文时自动切换到 ADBKeyboard，输入完成后自动恢复原输入法
              </p>
              <p className="text-xs text-green-800">
                • 首次使用前，请到手机「设置」→「语言与输入法」→「输入法管理」中确认 ADBKeyboard 已启用
              </p>
            </div>
          </div>
        )}

        {adbKeyboardStatus === 'error' && (
          <>
            <p className="text-xs text-red-700">
              {statusMessage || '无法检查 ADBKeyboard 状态'}
            </p>
            <button
              onClick={checkAdbKeyboardStatus}
              className="w-full px-3 py-2 text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 rounded-md transition-colors inline-flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              重新检查
            </button>
          </>
        )}

        {statusMessage && adbKeyboardStatus !== 'error' && (
          <p className="text-xs text-green-700 font-medium">
            {statusMessage}
          </p>
        )}
      </div>
      
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
        <p className="text-xs font-semibold text-blue-900">
          其他输入中文的方案
        </p>
        <p className="text-xs text-blue-800">
          1. 使用「点击」+ 手动输入
        </p>
        <p className="text-xs text-blue-700 ml-3">
          先点击输入框，暂停工作流，手动输入中文
        </p>
        <p className="text-xs text-blue-800">
          2. 使用剪贴板方案
        </p>
        <p className="text-xs text-blue-700 ml-3">
          使用「写入剪贴板」+ 「按键操作」粘贴
        </p>
      </div>
    </>
  )
}

// 按键操作配置
export function PhonePressKeyConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <DeviceSelector
        value={(data.deviceId as string) || ''}
        onChange={(v) => onChange('deviceId', v)}
      />
      <div className="space-y-2">
        <Label htmlFor="keycode">按键类型</Label>
        <Select
          id="keycode"
          value={(data.keycode as string) || 'KEYCODE_HOME'}
          onChange={(e) => onChange('keycode', e.target.value)}
        >
          <option value="KEYCODE_HOME">Home键（主屏幕）</option>
          <option value="KEYCODE_BACK">Back键（返回）</option>
          <option value="KEYCODE_APP_SWITCH">Recent键（最近任务）</option>
          <option value="KEYCODE_POWER">Power键（电源）</option>
          <option value="KEYCODE_VOLUME_UP">音量+</option>
          <option value="KEYCODE_VOLUME_DOWN">音量-</option>
        </Select>
        <p className="text-xs text-muted-foreground">
          模拟按下手机的物理按键或虚拟按键
        </p>
      </div>
    </>
  )
}

// 截图配置
export function PhoneScreenshotConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <DeviceSelector
        value={(data.deviceId as string) || ''}
        onChange={(v) => onChange('deviceId', v)}
      />
      <div className="space-y-2">
        <Label htmlFor="savePath">保存路径（可选）</Label>
        <PathInput
          value={(data.savePath as string) || ''}
          onChange={(v) => onChange('savePath', v)}
          placeholder="留空则保存到默认目录"
          type="file"
        />
        <p className="text-xs text-muted-foreground">
          指定截图保存的完整路径，如：C:\screenshots\phone.png
        </p>
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

// 启动屏幕镜像配置
export function PhoneStartMirrorConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <DeviceSelector
        value={(data.deviceId as string) || ''}
        onChange={(v) => onChange('deviceId', v)}
      />
      <div className="space-y-2">
        <Label htmlFor="bitRate">视频比特率（Mbps）</Label>
        <NumberInput
          id="bitRate"
          value={(data.bitRate as number) ?? 8}
          onChange={(v) => onChange('bitRate', v)}
          defaultValue={8}
          min={1}
          max={50}
        />
        <p className="text-xs text-muted-foreground">
          比特率越高画质越好，但占用带宽越大。建议：WiFi连接用8-16，USB连接可用更高值
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="maxSize">最大分辨率</Label>
        <NumberInput
          id="maxSize"
          value={(data.maxSize as number) ?? 1920}
          onChange={(v) => onChange('maxSize', v)}
          defaultValue={1920}
          min={480}
          max={2560}
        />
        <p className="text-xs text-muted-foreground">
          限制镜像画面的最大分辨率（长边），降低可提升性能
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="stayAwake"
          checked={(data.stayAwake as boolean) ?? true}
          onCheckedChange={(checked) => onChange('stayAwake', checked)}
        />
        <Label htmlFor="stayAwake" className="cursor-pointer">保持屏幕常亮</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="turnScreenOff"
          checked={(data.turnScreenOff as boolean) ?? false}
          onCheckedChange={(checked) => onChange('turnScreenOff', checked)}
        />
        <Label htmlFor="turnScreenOff" className="cursor-pointer">关闭手机屏幕（仅镜像显示）</Label>
      </div>
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          屏幕镜像会打开一个新窗口显示手机画面，可以在电脑上直接操作手机
        </p>
      </div>
    </>
  )
}

// 停止屏幕镜像配置
export function PhoneStopMirrorConfig() {
  return (
    <p className="text-xs text-muted-foreground">
      关闭当前正在运行的屏幕镜像窗口
    </p>
  )
}

// 安装应用配置
export function PhoneInstallAppConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <DeviceSelector
        value={(data.deviceId as string) || ''}
        onChange={(v) => onChange('deviceId', v)}
      />
      <div className="space-y-2">
        <Label htmlFor="apkPath">APK文件路径</Label>
        <PathInput
          value={(data.apkPath as string) || ''}
          onChange={(v) => onChange('apkPath', v)}
          placeholder="C:\apps\example.apk"
          type="file"
        />
        <p className="text-xs text-muted-foreground">
          选择要安装的APK文件，支持变量引用
        </p>
      </div>

      <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-2">
        <p className="text-xs font-semibold text-red-900">
          重要提示：必须开启 USB 安装
        </p>
        <p className="text-xs text-red-800">
          在使用此功能前，请确保已在手机上开启「USB 安装」选项：
        </p>
        <div className="ml-3 space-y-1">
          <p className="text-xs text-red-700">
            1. 打开手机「设置」→「开发者选项」
          </p>
          <p className="text-xs text-red-700">
            2. 找到并开启「USB 安装」或「通过 USB 安装应用」
          </p>
          <p className="text-xs text-red-700">
            3. 部分手机可能显示为「USB 调试（安全设置）」
          </p>
        </div>
        <p className="text-xs text-red-800 mt-2">
          如果未开启此选项，安装将会失败！
        </p>
      </div>
      
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-xs text-amber-800">
          ⏱️ 安装过程可能需要几秒到几十秒，请耐心等待
        </p>
      </div>
    </>
  )
}

// 启动应用配置
export function PhoneStartAppConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <DeviceSelector
        value={(data.deviceId as string) || ''}
        onChange={(v) => onChange('deviceId', v)}
      />
      <div className="space-y-2">
        <Label htmlFor="packageName">应用包名或名称</Label>
        <VariableInput
          value={(data.packageName as string) || ''}
          onChange={(v) => onChange('packageName', v)}
          placeholder="com.tencent.mm 或 微信"
        />
        <p className="text-xs text-muted-foreground">
          支持两种方式：包名（如 com.tencent.mm）或应用名称（如 微信）
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="activityName">Activity名称（可选）</Label>
        <VariableInput
          value={(data.activityName as string) || ''}
          onChange={(v) => onChange('activityName', v)}
          placeholder=".ui.LauncherUI"
        />
        <p className="text-xs text-muted-foreground">
          指定要启动的Activity，留空则启动默认Activity
        </p>
      </div>
      
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
        <p className="text-xs font-semibold text-blue-900">
          两种启动方式
        </p>
        <p className="text-xs text-blue-800">
          <strong>方式1：使用包名（推荐）</strong>
        </p>
        <p className="text-xs text-blue-700 ml-3">
          • 输入完整包名，如：com.tencent.mm
        </p>
        <p className="text-xs text-blue-700 ml-3">
          • 精确、快速、不会出错
        </p>
        <p className="text-xs text-blue-800 mt-2">
          <strong>方式2：使用应用名称</strong>
        </p>
        <p className="text-xs text-blue-700 ml-3">
          • 输入应用名称，如：微信、抖音
        </p>
        <p className="text-xs text-blue-700 ml-3">
          • 首次使用需要查询应用列表（约5-10秒）
        </p>
        <p className="text-xs text-blue-700 ml-3">
          • 如果有多个匹配，会提示使用包名
        </p>
      </div>
      
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-xs font-semibold text-amber-900">
          注意事项
        </p>
        <p className="text-xs text-amber-800">
          • 使用应用名称时，只会搜索第三方应用（不包括系统应用）
        </p>
        <p className="text-xs text-amber-800">
          • 如果应用名称匹配到多个结果，请改用包名
        </p>
      </div>
    </>
  )
}

// 停止应用配置
export function PhoneStopAppConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <DeviceSelector
        value={(data.deviceId as string) || ''}
        onChange={(v) => onChange('deviceId', v)}
      />
      <div className="space-y-2">
        <Label htmlFor="packageName">应用包名或名称</Label>
        <VariableInput
          value={(data.packageName as string) || ''}
          onChange={(v) => onChange('packageName', v)}
          placeholder="com.example.app 或 微信"
        />
        <p className="text-xs text-muted-foreground">
          支持两种方式：包名（如 com.tencent.mm）或应用名称（如 微信）
        </p>
      </div>
      
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          停止应用会强制关闭应用进程，类似于在系统设置中"强行停止"
        </p>
      </div>
    </>
  )
}

// 卸载应用配置
export function PhoneUninstallAppConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <DeviceSelector
        value={(data.deviceId as string) || ''}
        onChange={(v) => onChange('deviceId', v)}
      />
      <div className="space-y-2">
        <Label htmlFor="packageName">应用包名或名称</Label>
        <VariableInput
          value={(data.packageName as string) || ''}
          onChange={(v) => onChange('packageName', v)}
          placeholder="com.example.app 或 微信"
        />
        <p className="text-xs text-muted-foreground">
          支持两种方式：包名（如 com.tencent.mm）或应用名称（如 微信）
        </p>
      </div>
      
      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-xs text-red-800">
          卸载操作不可恢复，请谨慎使用
        </p>
      </div>
    </>
  )
}

// 推送文件配置
export function PhonePushFileConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <DeviceSelector
        value={(data.deviceId as string) || ''}
        onChange={(v) => onChange('deviceId', v)}
      />
      <div className="space-y-2">
        <Label htmlFor="localPath">本地文件路径</Label>
        <PathInput
          value={(data.localPath as string) || ''}
          onChange={(v) => onChange('localPath', v)}
          placeholder="C:\files\example.txt"
          type="file"
        />
        <p className="text-xs text-muted-foreground">
          要推送到手机的本地文件路径
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="remotePath">手机目标路径</Label>
        <VariableInput
          value={(data.remotePath as string) || ''}
          onChange={(v) => onChange('remotePath', v)}
          placeholder="/sdcard/Download/example.txt"
        />
        <p className="text-xs text-muted-foreground">
          文件在手机上的保存路径，常用目录：/sdcard/Download/、/sdcard/DCIM/
        </p>
      </div>
    </>
  )
}

// 拉取文件配置
export function PhonePullFileConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <DeviceSelector
        value={(data.deviceId as string) || ''}
        onChange={(v) => onChange('deviceId', v)}
      />
      <div className="space-y-2">
        <Label htmlFor="remotePath">手机文件路径</Label>
        <VariableInput
          value={(data.remotePath as string) || ''}
          onChange={(v) => onChange('remotePath', v)}
          placeholder="/sdcard/Download/example.txt"
        />
        <p className="text-xs text-muted-foreground">
          要从手机拉取的文件路径
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="localPath">本地保存路径</Label>
        <PathInput
          value={(data.localPath as string) || ''}
          onChange={(v) => onChange('localPath', v)}
          placeholder="C:\files\example.txt"
          type="file"
        />
        <p className="text-xs text-muted-foreground">
          文件保存到本地的路径
        </p>
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

// 点击图像配置
export function PhoneClickImageConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <DeviceSelector
        value={(data.deviceId as string) || ''}
        onChange={(v) => onChange('deviceId', v)}
      />
      <div className="space-y-2">
        <Label htmlFor="imagePath">图像文件路径</Label>
        <ImagePathInput
          value={(data.imagePath as string) || ''}
          onChange={(v) => onChange('imagePath', v)}
          placeholder="从图像资源中选择或输入路径"
        />
        <p className="text-xs text-muted-foreground">
          从图像资源中选择要查找的目标图片
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="clickType">点击方式</Label>
        <Select
          id="clickType"
          value={(data.clickType as string) || 'click'}
          onChange={(e) => onChange('clickType', e.target.value)}
        >
          <option value="click">单击</option>
          <option value="long_press">长按</option>
        </Select>
        <p className="text-xs text-muted-foreground">
          单击：快速点击一次；长按：按住1秒后松开
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="confidence">匹配置信度</Label>
        <NumberInput
          id="confidence"
          value={(data.confidence as number) ?? 0.8}
          onChange={(v) => onChange('confidence', v)}
          defaultValue={0.8}
          min={0.1}
          max={1.0}
          step={0.05}
        />
        <p className="text-xs text-muted-foreground">
          图像匹配的相似度阈值（0.1-1.0），值越高要求越严格
        </p>
      </div>
      
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
          <option value="random">随机位置</option>
        </Select>
        <p className="text-xs text-muted-foreground">
          在找到的图像区域内的哪个位置点击
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="waitTimeout">等待超时（秒）</Label>
        <NumberInput
          id="waitTimeout"
          value={(data.waitTimeout as number) ?? 10}
          onChange={(v) => onChange('waitTimeout', v)}
          defaultValue={10}
          min={1}
          max={60}
        />
        <p className="text-xs text-muted-foreground">
          等待图像出现的最长时间
        </p>
      </div>
      
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
        <p className="text-xs font-semibold text-blue-900">
          使用提示
        </p>
        <p className="text-xs text-blue-800">
          • 图像文件应该是手机屏幕上要查找的元素截图
        </p>
        <p className="text-xs text-blue-800">
          • 如果匹配失败，可以降低置信度或重新截取更清晰的图像
        </p>
        <p className="text-xs text-blue-800">
          • 建议使用PNG格式的图像文件
        </p>
      </div>
    </>
  )
}

// 点击文本配置
export function PhoneClickTextConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <DeviceSelector
        value={(data.deviceId as string) || ''}
        onChange={(v) => onChange('deviceId', v)}
      />
      <div className="space-y-2">
        <Label htmlFor="targetText">目标文本</Label>
        <VariableInput
          value={(data.targetText as string) || ''}
          onChange={(v) => onChange('targetText', v)}
          placeholder="要查找并点击的文本"
          multiline
          rows={2}
        />
        <p className="text-xs text-muted-foreground">
          在手机屏幕上查找并点击包含此文本的位置
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="clickType">点击方式</Label>
        <Select
          id="clickType"
          value={(data.clickType as string) || 'click'}
          onChange={(e) => onChange('clickType', e.target.value)}
        >
          <option value="click">单击</option>
          <option value="long_press">长按</option>
        </Select>
        <p className="text-xs text-muted-foreground">
          单击：快速点击一次；长按：按住1秒后松开
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="matchMode">匹配模式</Label>
        <Select
          id="matchMode"
          value={(data.matchMode as string) || 'contains'}
          onChange={(e) => onChange('matchMode', e.target.value)}
        >
          <option value="contains">包含</option>
          <option value="exact">完全匹配</option>
          <option value="regex">正则表达式</option>
        </Select>
        <p className="text-xs text-muted-foreground">
          包含：文本中包含目标文本即可<br />
          完全匹配：文本必须完全相同<br />
          正则表达式：使用正则表达式匹配
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="occurrence">匹配第几个</Label>
        <NumberInput
          id="occurrence"
          value={(data.occurrence as number) ?? 1}
          onChange={(v) => onChange('occurrence', v)}
          defaultValue={1}
          min={1}
          max={10}
        />
        <p className="text-xs text-muted-foreground">
          如果屏幕上有多个匹配的文本，点击第几个（从1开始）
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="waitTimeout">等待超时（秒）</Label>
        <NumberInput
          id="waitTimeout"
          value={(data.waitTimeout as number) ?? 10}
          onChange={(v) => onChange('waitTimeout', v)}
          defaultValue={10}
          min={1}
          max={60}
        />
        <p className="text-xs text-muted-foreground">
          等待文本出现的最长时间
        </p>
      </div>
      
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
        <p className="text-xs font-semibold text-blue-900">
          使用提示
        </p>
        <p className="text-xs text-blue-800">
          • 使用 RapidOCR 进行文本识别，支持中文
        </p>
        <p className="text-xs text-blue-800">
          • 如果识别不准确，可以尝试使用"包含"模式或正则表达式
        </p>
      </div>
    </>
  )
}

// 等待图像配置
export function PhoneWaitImageConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <DeviceSelector
        value={(data.deviceId as string) || ''}
        onChange={(v) => onChange('deviceId', v)}
      />
      <div className="space-y-2">
        <Label htmlFor="imagePath">图像文件路径</Label>
        <ImagePathInput
          value={(data.imagePath as string) || ''}
          onChange={(v) => onChange('imagePath', v)}
          placeholder="从图像资源中选择或输入路径"
        />
        <p className="text-xs text-muted-foreground">
          从图像资源中选择要等待的目标图片
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="confidence">匹配置信度</Label>
        <NumberInput
          id="confidence"
          value={(data.confidence as number) ?? 0.8}
          onChange={(v) => onChange('confidence', v)}
          defaultValue={0.8}
          min={0.1}
          max={1.0}
          step={0.05}
        />
        <p className="text-xs text-muted-foreground">
          图像匹配的相似度阈值（0.1-1.0）
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="waitTimeout">等待超时（秒）</Label>
        <NumberInput
          id="waitTimeout"
          value={(data.waitTimeout as number) ?? 30}
          onChange={(v) => onChange('waitTimeout', v)}
          defaultValue={30}
          min={1}
          max={300}
        />
        <p className="text-xs text-muted-foreground">
          等待图像出现的最长时间
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="checkInterval">检查间隔（秒）</Label>
        <NumberInput
          id="checkInterval"
          value={(data.checkInterval as number) ?? 0.5}
          onChange={(v) => onChange('checkInterval', v)}
          defaultValue={0.5}
          min={0.1}
          max={5}
          step={0.1}
        />
        <p className="text-xs text-muted-foreground">
          每次检查之间的等待时间
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="resultVariable">存储结果到变量</Label>
        <VariableNameInput
          value={(data.resultVariable as string) || ''}
          onChange={(v) => onChange('resultVariable', v)}
          placeholder="保存图像位置和匹配度"
          isStorageVariable={true}
        />
        <p className="text-xs text-muted-foreground">
          保存图像坐标、匹配度和耗时信息
        </p>
      </div>
      
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
        <p className="text-xs font-semibold text-blue-900">
          使用提示
        </p>
        <p className="text-xs text-blue-800">
          • 此模块会持续检查手机屏幕，直到图像出现或超时
        </p>
        <p className="text-xs text-blue-800">
          • 适用于等待加载完成、等待按钮出现等场景
        </p>
        <p className="text-xs text-blue-800">
          • 检查间隔越小越灵敏，但会消耗更多资源
        </p>
      </div>
    </>
  )
}

// 设置音量配置
export function PhoneSetVolumeConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <DeviceSelector
        value={(data.deviceId as string) || ''}
        onChange={(v) => onChange('deviceId', v)}
      />
      <div className="space-y-2">
        <Label htmlFor="streamType">音频类型</Label>
        <Select
          id="streamType"
          value={(data.streamType as string) || 'music'}
          onChange={(e) => onChange('streamType', e.target.value)}
        >
          <option value="music">媒体音量</option>
          <option value="ring">铃声音量</option>
          <option value="alarm">闹钟音量</option>
          <option value="notification">通知音量</option>
          <option value="system">系统音量</option>
        </Select>
        <p className="text-xs text-muted-foreground">
          选择要调整的音频流类型
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="volume">音量值（0-15）</Label>
        <NumberInput
          id="volume"
          value={(data.volume as number) ?? 10}
          onChange={(v) => onChange('volume', v)}
          defaultValue={10}
          min={0}
          max={15}
        />
        <p className="text-xs text-muted-foreground">
          0 = 静音，15 = 最大音量
        </p>
      </div>
      
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
        <p className="text-xs font-semibold text-blue-900">
          使用提示
        </p>
        <p className="text-xs text-blue-800">
          • 媒体音量：影响音乐、视频等媒体播放
        </p>
        <p className="text-xs text-blue-800">
          • 铃声音量：影响来电铃声
        </p>
        <p className="text-xs text-blue-800">
          • 闹钟音量：影响闹钟提醒
        </p>
        <p className="text-xs text-blue-800">
          • 通知音量：影响应用通知声音
        </p>
      </div>
    </>
  )
}

// 设置亮度配置
export function PhoneSetBrightnessConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  const brightness = (data.brightness as number) ?? 128
  const percentage = Math.round((brightness / 255) * 100)
  
  return (
    <>
      <DeviceSelector
        value={(data.deviceId as string) || ''}
        onChange={(v) => onChange('deviceId', v)}
      />
      <div className="space-y-2">
        <Label htmlFor="brightness">亮度值（0-255）</Label>
        <NumberInput
          id="brightness"
          value={brightness}
          onChange={(v) => onChange('brightness', v)}
          defaultValue={128}
          min={0}
          max={255}
        />
        <p className="text-xs text-muted-foreground">
          当前设置: {brightness}/255 ({percentage}%)
        </p>
      </div>
      
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
        <p className="text-xs font-semibold text-amber-900">
          注意事项
        </p>
        <p className="text-xs text-amber-800">
          • 此操作会自动关闭手机的自动亮度功能
        </p>
        <p className="text-xs text-amber-800">
          • 0 = 最暗，255 = 最亮
        </p>
        <p className="text-xs text-amber-800">
          • 建议值：50-200 之间
        </p>
      </div>
      
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
        <p className="text-xs font-semibold text-blue-900">
          常用亮度值
        </p>
        <p className="text-xs text-blue-800">
          • 最暗：0-50
        </p>
        <p className="text-xs text-blue-800">
          • 较暗：51-100
        </p>
        <p className="text-xs text-blue-800">
          • 中等：101-150
        </p>
        <p className="text-xs text-blue-800">
          • 较亮：151-200
        </p>
        <p className="text-xs text-blue-800">
          • 最亮：201-255
        </p>
      </div>
    </>
  )
}

// 写入剪贴板配置
export function PhoneSetClipboardConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  const [clipperStatus, setClipperStatus] = React.useState<'checking' | 'installed' | 'not-installed' | 'error'>('checking')
  const [installing, setInstalling] = React.useState(false)
  const [statusMessage, setStatusMessage] = React.useState('')

  // 检查 Clipper 是否已安装
  React.useEffect(() => {
    checkClipperStatus()
  }, [])

  const checkClipperStatus = async () => {
    try {
      setClipperStatus('checking')
      const response = await fetch(`${getBackendUrl()}/api/phone/check-clipper`)
      const result = await response.json()
      
      if (result.success) {
        setClipperStatus(result.installed ? 'installed' : 'not-installed')
      } else {
        setClipperStatus('error')
        setStatusMessage(result.error || '检查失败')
      }
    } catch (error) {
      setClipperStatus('error')
      setStatusMessage('无法连接到后端服务')
    }
  }

  const installClipper = async () => {
    try {
      setInstalling(true)
      setStatusMessage('正在安装 Clipper，请稍候...')
      
      const response = await fetch(`${getBackendUrl()}/api/phone/install-clipper`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const result = await response.json()
      
      if (result.success) {
        setClipperStatus('installed')
        setStatusMessage('Clipper 安装成功！')
        setTimeout(() => setStatusMessage(''), 3000)
      } else {
        setStatusMessage(`安装失败: ${result.error}`)
      }
    } catch (error) {
      setStatusMessage(`安装失败: ${error}`)
    } finally {
      setInstalling(false)
    }
  }

  return (
    <>
      <DeviceSelector
        value={(data.deviceId as string) || ''}
        onChange={(v) => onChange('deviceId', v)}
      />
      <div className="space-y-2">
        <Label htmlFor="text">剪贴板内容</Label>
        <VariableInput
          value={(data.text as string) || ''}
          onChange={(v) => onChange('text', v)}
          placeholder="要写入到手机剪贴板的文本内容"
          multiline
          rows={4}
        />
        <p className="text-xs text-muted-foreground">
          将文本内容写入到手机的剪贴板，支持变量引用
        </p>
      </div>

      {/* Clipper 状态提示 */}
      <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-purple-900">
            Clipper 应用状态
          </p>
          {clipperStatus === 'checking' && (
            <span className="text-xs text-purple-600">检查中...</span>
          )}
          {clipperStatus === 'installed' && (
            <span className="text-xs text-green-600 font-semibold">已安装</span>
          )}
          {clipperStatus === 'not-installed' && (
            <span className="text-xs text-orange-600 font-semibold">未安装</span>
          )}
          {clipperStatus === 'error' && (
            <span className="text-xs text-red-600 font-semibold">检查失败</span>
          )}
        </div>

        {clipperStatus === 'not-installed' && (
          <>
            <p className="text-xs text-purple-800">
              使用剪贴板功能需要在手机上安装 Clipper 应用。点击下方按钮一键安装：
            </p>
            <button
              onClick={installClipper}
              disabled={installing}
              className="w-full px-3 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 rounded-md transition-colors"
            >
              {installing ? '正在安装...' : '一键安装 Clipper'}
            </button>
          </>
        )}

        {clipperStatus === 'installed' && (
          <div className="space-y-2">
            <p className="text-xs text-green-700 font-semibold">
              Clipper 已安装，可以正常使用剪贴板功能。
            </p>
            <div className="pl-3 border-l-2 border-green-300 space-y-1">
              <p className="text-xs text-green-800">
                使用说明：
              </p>
              <p className="text-xs text-green-700">
                1. 安装后启动 Clipper APP 并赋予权限
              </p>
              <p className="text-xs text-green-700">
                2. 最好将 APP 的省电策略改成"无限制"
              </p>
            </div>
          </div>
        )}

        {clipperStatus === 'error' && (
          <>
            <p className="text-xs text-red-700">
              {statusMessage || '无法检查 Clipper 状态'}
            </p>
            <button
              onClick={checkClipperStatus}
              className="w-full px-3 py-2 text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 rounded-md transition-colors"
            >
              重新检查
            </button>
          </>
        )}

        {statusMessage && clipperStatus !== 'error' && (
          <p className="text-xs text-purple-700 font-medium">
            {statusMessage}
          </p>
        )}
      </div>
      
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
        <p className="text-xs font-semibold text-blue-900">
          使用场景
        </p>
        <p className="text-xs text-blue-800">
          • 配合「按键操作」中的粘贴功能，实现中文输入
        </p>
        <p className="text-xs text-blue-800">
          • 在应用间传递文本内容
        </p>
        <p className="text-xs text-blue-800">
          • 自动填充表单中的复杂文本
        </p>
      </div>
      
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-xs font-semibold text-amber-900">
          注意事项
        </p>
        <p className="text-xs text-amber-800">
          • 部分设备需要安装 Clipper 应用才能使用剪贴板功能
        </p>
        <p className="text-xs text-amber-800">
          • 写入剪贴板后，可以在手机上手动粘贴或使用按键模拟粘贴
        </p>
      </div>
    </>
  )
}

// 读取剪贴板配置
export function PhoneGetClipboardConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  const [clipperStatus, setClipperStatus] = React.useState<'checking' | 'installed' | 'not-installed' | 'error'>('checking')
  const [installing, setInstalling] = React.useState(false)
  const [statusMessage, setStatusMessage] = React.useState('')

  // 检查 Clipper 是否已安装
  React.useEffect(() => {
    checkClipperStatus()
  }, [])

  const checkClipperStatus = async () => {
    try {
      setClipperStatus('checking')
      const response = await fetch(`${getBackendUrl()}/api/phone/check-clipper`)
      const result = await response.json()
      
      if (result.success) {
        setClipperStatus(result.installed ? 'installed' : 'not-installed')
      } else {
        setClipperStatus('error')
        setStatusMessage(result.error || '检查失败')
      }
    } catch (error) {
      setClipperStatus('error')
      setStatusMessage('无法连接到后端服务')
    }
  }

  const installClipper = async () => {
    try {
      setInstalling(true)
      setStatusMessage('正在安装 Clipper，请稍候...')
      
      const response = await fetch(`${getBackendUrl()}/api/phone/install-clipper`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const result = await response.json()
      
      if (result.success) {
        setClipperStatus('installed')
        setStatusMessage('Clipper 安装成功！')
        setTimeout(() => setStatusMessage(''), 3000)
      } else {
        setStatusMessage(`安装失败: ${result.error}`)
      }
    } catch (error) {
      setStatusMessage(`安装失败: ${error}`)
    } finally {
      setInstalling(false)
    }
  }

  return (
    <>
      <DeviceSelector
        value={(data.deviceId as string) || ''}
        onChange={(v) => onChange('deviceId', v)}
      />
      <div className="space-y-2">
        <Label htmlFor="variableName">存储到变量</Label>
        <VariableNameInput
          value={(data.variableName as string) || 'phone_clipboard'}
          onChange={(v) => onChange('variableName', v)}
          placeholder="保存剪贴板内容的变量名"
          isStorageVariable={true}
        />
        <p className="text-xs text-muted-foreground">
          读取手机剪贴板的内容并保存到变量中
        </p>
      </div>

      {/* Clipper 状态提示 */}
      <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-purple-900">
            Clipper 应用状态
          </p>
          {clipperStatus === 'checking' && (
            <span className="text-xs text-purple-600">检查中...</span>
          )}
          {clipperStatus === 'installed' && (
            <span className="text-xs text-green-600 font-semibold">已安装</span>
          )}
          {clipperStatus === 'not-installed' && (
            <span className="text-xs text-orange-600 font-semibold">未安装</span>
          )}
          {clipperStatus === 'error' && (
            <span className="text-xs text-red-600 font-semibold">检查失败</span>
          )}
        </div>

        {clipperStatus === 'not-installed' && (
          <>
            <p className="text-xs text-purple-800">
              使用剪贴板功能需要在手机上安装 Clipper 应用。点击下方按钮一键安装：
            </p>
            <button
              onClick={installClipper}
              disabled={installing}
              className="w-full px-3 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 rounded-md transition-colors"
            >
              {installing ? '正在安装...' : '一键安装 Clipper'}
            </button>
          </>
        )}

        {clipperStatus === 'installed' && (
          <div className="space-y-2">
            <p className="text-xs text-green-700 font-semibold">
              Clipper 已安装，可以正常使用剪贴板功能。
            </p>
            <div className="pl-3 border-l-2 border-green-300 space-y-1">
              <p className="text-xs text-green-800">
                使用说明：
              </p>
              <p className="text-xs text-green-700">
                1. 安装后启动 Clipper APP 并赋予权限
              </p>
              <p className="text-xs text-green-700">
                2. 最好将 APP 的省电策略改成"无限制"
              </p>
            </div>
          </div>
        )}

        {clipperStatus === 'error' && (
          <>
            <p className="text-xs text-red-700">
              {statusMessage || '无法检查 Clipper 状态'}
            </p>
            <button
              onClick={checkClipperStatus}
              className="w-full px-3 py-2 text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 rounded-md transition-colors"
            >
              重新检查
            </button>
          </>
        )}

        {statusMessage && clipperStatus !== 'error' && (
          <p className="text-xs text-purple-700 font-medium">
            {statusMessage}
          </p>
        )}
      </div>
      
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
        <p className="text-xs font-semibold text-blue-900">
          使用场景
        </p>
        <p className="text-xs text-blue-800">
          • 获取用户在手机上复制的内容
        </p>
        <p className="text-xs text-blue-800">
          • 读取应用分享到剪贴板的数据
        </p>
        <p className="text-xs text-blue-800">
          • 验证剪贴板内容是否正确
        </p>
      </div>
      
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-xs font-semibold text-amber-900">
          注意事项
        </p>
        <p className="text-xs text-amber-800">
          • 部分设备需要安装 Clipper 应用才能使用剪贴板功能
        </p>
        <p className="text-xs text-amber-800">
          • 如果剪贴板为空，变量值将为空字符串
        </p>
      </div>
    </>
  )
}



// 手机图像存在判断配置
export function PhoneImageExistsConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <DeviceSelector
        value={(data.deviceId as string) || ''}
        onChange={(v) => onChange('deviceId', v)}
      />
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
          <Slider
            min={0.5}
            max={1}
            step={0.05}
            value={[(data.confidence as number) || 0.8]}
            onValueChange={(vals) => onChange('confidence', vals[0])}
            className="flex-1"
          />
          <span className="text-sm w-12 text-right">{((data.confidence as number) || 0.8) * 100}%</span>
        </div>
        <p className="text-xs text-muted-foreground">
          值越高匹配越精确，但可能找不到
        </p>
      </div>
      
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
      
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
        <p className="text-xs font-semibold text-amber-900">
          重要提示
        </p>
        <p className="text-xs text-amber-800">
          • 请使用从相同分辨率手机截取的图像作为模板
        </p>
        <p className="text-xs text-amber-800">
          • 截取更小、更独特的区域可提高识别准确度
        </p>
        <p className="text-xs text-amber-800">
          • 如果识别失败，可以尝试降低匹配精度
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
