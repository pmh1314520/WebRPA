import type React from 'react'
import type { NodeData } from '@/store/workflowStore'
import { useGlobalConfigStore } from '@/store/globalConfigStore'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { SelectNative as Select } from '@/components/ui/select-native'
import { Textarea } from '@/components/ui/textarea'
import { VariableInput } from '@/components/ui/variable-input'
import { VariableNameInput } from '@/components/ui/variable-name-input'
import { DualCoordinateInput } from '@/components/ui/dual-coordinate-input'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { ImagePathInput } from '@/components/ui/image-path-input'
import { AlertCircle, Copy, Check } from 'lucide-react'
import { useState, useEffect } from 'react'
import { getBackendUrl } from '@/services/api'
import { InputDialog, ConfirmDialog, AlertDialog } from '@/components/ui/custom-dialogs'

// Webhook触发器配置
export function WebhookTriggerConfig({
  data,
  onChange,
}: {
  data: NodeData
  onChange: (key: string, value: unknown) => void
}) {
  const [copied, setCopied] = useState(false)
  
  // 生成唯一的webhook ID（如果还没有）
  const webhookId = (data.webhookId as string) || `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  if (!data.webhookId) {
    onChange('webhookId', webhookId)
  }

  const webhookUrl = `${getBackendUrl()}/api/triggers/webhook/${webhookId}`
  const method = (data.method as string) || 'ANY'

  const copyToClipboard = () => {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="webhookId">Webhook ID</Label>
        <Input
          id="webhookId"
          value={webhookId}
          readOnly
          className="bg-gray-50 font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">
          自动生成的唯一标识符
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="webhookUrl">Webhook URL</Label>
        <div className="flex gap-2">
          <Input
            id="webhookUrl"
            value={webhookUrl}
            readOnly
            className="bg-gray-50 font-mono text-xs flex-1"
          />
          <button
            onClick={copyToClipboard}
            className="px-3 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center gap-1"
            title="复制URL"
          >
            {copied ? <Check className="w-4 h-4" />:<Copy className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          {copied ? '已复制到剪贴板' : '点击按钮复制URL'}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="method">允许的HTTP方法</Label>
        <Select
          id="method"
          value={method}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange('method', e.target.value)}
        >
          <option value="ANY">任意方法</option>
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="validateHeaders">验证请求头（可选，JSON格式）</Label>
        <Textarea
          id="validateHeaders"
          value={(data.validateHeaders as string) || ''}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange('validateHeaders', e.target.value)}
          placeholder='{"Authorization": "Bearer token123"}'
          rows={2}
          className="font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">
          只有请求头匹配时才触发，留空则不验证
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="validateParams">验证查询参数（可选，JSON格式）</Label>
        <Textarea
          id="validateParams"
          value={(data.validateParams as string) || ''}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange('validateParams', e.target.value)}
          placeholder='{"key": "secret123"}'
          rows={2}
          className="font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">
          只有查询参数匹配时才触发，留空则不验证
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="responseBody">自定义响应内容（可选，JSON格式）</Label>
        <Textarea
          id="responseBody"
          value={(data.responseBody as string) || ''}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange('responseBody', e.target.value)}
          placeholder='{"status": "success", "message": "已接收"}'
          rows={2}
          className="font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">
          自定义返回给请求方的响应内容
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="responseStatus">响应状态码</Label>
        <NumberInput
          id="responseStatus"
          value={(data.responseStatus as number) ?? 200}
          onChange={(v) => onChange('responseStatus', v)}
          defaultValue={200}
          min={100}
          max={599}
        />
        <p className="text-xs text-muted-foreground">
          HTTP响应状态码（默认200）
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="timeout">超时时间（秒）</Label>
        <NumberInput
          id="timeout"
          value={(data.timeout as number) ?? 0}
          onChange={(v) => onChange('timeout', v)}
          defaultValue={0}
          min={0}
        />
        <p className="text-xs text-muted-foreground">
          0表示无限等待，直到Webhook被触发
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="saveToVariable">保存数据到变量</Label>
        <VariableNameInput
          id="saveToVariable"
          value={(data.saveToVariable as string) || ''}
          onChange={(v) => onChange('saveToVariable', v)}
          placeholder="如: webhook_data"
          isStorageVariable={true}
        />
        <p className="text-xs text-muted-foreground">
          请求数据将保存到此变量，包含method、headers、body、query等信息
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="autoSetParams"
            checked={(data.autoSetParams as boolean) ?? true}
            onCheckedChange={(checked) => onChange('autoSetParams', checked)}
          />
          <Label htmlFor="autoSetParams" className="cursor-pointer">自动将请求参数设置为变量</Label>
        </div>
        <p className="text-xs text-muted-foreground">
          启用后，会自动将query参数、body参数、自定义请求头设置为独立变量
        </p>
      </div>

      {(data.autoSetParams as boolean) !== false && (
        <div className="space-y-2">
          <Label htmlFor="paramPrefix">变量名前缀</Label>
          <VariableInput
            value={(data.paramPrefix as string) || 'webhook_'}
            onChange={(v) => onChange('paramPrefix', v)}
            placeholder="如: webhook_"
          />
          <p className="text-xs text-muted-foreground">
            自动设置的变量名前缀，例如：webhook_user_id、webhook_action
          </p>
        </div>
      )}

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800 leading-relaxed break-words">
          <strong>使用说明：</strong><br />
          • 工作流执行到此模块时会暂停，等待HTTP请求触发<br />
          • 使用任何HTTP客户端（浏览器、Postman、curl等）向上方URL发送请求<br />
          • 可设置请求头和查询参数验证，增强安全性<br />
          • 请求数据会保存到指定变量中，可在后续模块中使用<br />
          • 启用"自动设置参数"后，请求参数会自动转换为独立变量，方便直接使用<br />
          • 示例：<span className="break-all">curl -X POST {webhookUrl}?user_id=123 -H "Authorization: Bearer token" -d '{"{"}action":"test"{"}"}'</span><br />
          • 自动设置的变量：<span className="break-all">webhook_user_id=123, webhook_action=test, webhook_header_authorization=Bearer token</span>
        </p>
      </div>
    </>
  )
}

// 热键触发器配置
export function HotkeyTriggerConfig({
  data,
  onChange,
}: {
  data: NodeData
  onChange: (key: string, value: unknown) => void
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="hotkey">热键组合</Label>
        <VariableInput
          value={(data.hotkey as string) || ''}
          onChange={(v) => onChange('hotkey', v)}
          placeholder="如: ctrl+shift+f1"
        />
        <p className="text-xs text-muted-foreground">
          支持的修饰键：ctrl、alt、shift、win<br />
          支持的功能键：f1-f12<br />
          支持的字母键：a-z<br />
          多个键用+连接，如：ctrl+alt+a
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="timeout">超时时间（秒）</Label>
        <NumberInput
          id="timeout"
          value={(data.timeout as number) ?? 0}
          onChange={(v) => onChange('timeout', v)}
          defaultValue={0}
          min={0}
        />
        <p className="text-xs text-muted-foreground">
          0表示无限等待，直到热键被按下
        </p>
      </div>

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800 leading-relaxed">
          <strong>使用说明：</strong><br />
          • 工作流执行到此模块时会暂停，等待指定热键按下<br />
          • 热键监听是全局的，即使WebRPA窗口不在前台也能触发<br />
          • 按下热键后，工作流会继续执行后续模块<br />
          • 适用于需要人工确认或手动触发的场景
        </p>
      </div>

      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-xs text-amber-800 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          注意：请确保热键组合不与系统或其他应用冲突
        </p>
      </div>
    </>
  )
}

// 文件监控触发器配置
export function FileWatcherTriggerConfig({
  data,
  onChange,
}: {
  data: NodeData
  onChange: (key: string, value: unknown) => void
}) {
  const { config } = useGlobalConfigStore()
  const watchType = (data.watchType as string) || 'any'

  // 使用全局配置的默认值初始化
  useEffect(() => {
    if (!data.watchPath && config.fileTrigger.defaultWatchPath) {
      onChange('watchPath', config.fileTrigger.defaultWatchPath)
    }
  }, [])

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="watchPath">监控路径</Label>
        <VariableInput
          value={(data.watchPath as string) || config.fileTrigger.defaultWatchPath || ''}
          onChange={(v) => onChange('watchPath', v)}
          placeholder="如: C:\\Users\\Downloads 或 C:\\file.txt"
        />
        <p className="text-xs text-muted-foreground">
          可以是文件路径或文件夹路径
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="watchType">监控类型</Label>
        <Select
          id="watchType"
          value={watchType}
          onChange={(e) => onChange('watchType', e.target.value)}
        >
          <option value="any">任意变化</option>
          <option value="created">文件创建</option>
          <option value="modified">文件修改</option>
          <option value="deleted">文件删除</option>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="filePattern">文件名模式</Label>
        <VariableInput
          value={(data.filePattern as string) || '*'}
          onChange={(v) => onChange('filePattern', v)}
          placeholder="如: *.txt 或 report_*.xlsx"
        />
        <p className="text-xs text-muted-foreground">
          支持通配符：* 匹配任意字符，? 匹配单个字符<br />
          示例：*.txt（所有txt文件）、report_*.xlsx（以report_开头的Excel文件）
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="timeout">超时时间（秒）</Label>
        <NumberInput
          id="timeout"
          value={(data.timeout as number) ?? 0}
          onChange={(v) => onChange('timeout', v)}
          defaultValue={0}
          min={0}
        />
        <p className="text-xs text-muted-foreground">
          0表示无限等待，直到文件事件发生
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="saveToVariable">保存事件信息到变量</Label>
        <VariableNameInput
          id="saveToVariable"
          value={(data.saveToVariable as string) || ''}
          onChange={(v) => onChange('saveToVariable', v)}
          placeholder="如: file_event"
          isStorageVariable={true}
        />
        <p className="text-xs text-muted-foreground">
          事件信息包含：eventType（事件类型）、filePath（文件路径）、fileName（文件名）、timestamp（时间戳）
        </p>
      </div>

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800 leading-relaxed">
          <strong>使用说明：</strong><br />
          • 工作流执行到此模块时会暂停，监控指定路径的文件变化<br />
          • 检测到匹配的文件事件后，工作流会继续执行<br />
          • 适用于自动处理新文件、监控文件变化等场景<br />
          • 示例：监控下载文件夹，自动处理新下载的文件
        </p>
      </div>
    </>
  )
}

// 邮件触发器配置
export function EmailTriggerConfig({
  data,
  onChange,
}: {
  data: NodeData
  onChange: (key: string, value: unknown) => void
}) {
  const { config } = useGlobalConfigStore()

  // 使用全局配置的默认值初始化
  useEffect(() => {
    if (!data.emailServer && config.emailTrigger.imapServer) {
      onChange('emailServer', config.emailTrigger.imapServer)
    }
    if (!data.emailPort && config.emailTrigger.imapPort) {
      onChange('emailPort', config.emailTrigger.imapPort)
    }
    if (!data.emailAccount && config.emailTrigger.emailAccount) {
      onChange('emailAccount', config.emailTrigger.emailAccount)
    }
    if (!data.emailPassword && config.emailTrigger.emailPassword) {
      onChange('emailPassword', config.emailTrigger.emailPassword)
    }
    if (!data.checkInterval && config.emailTrigger.checkInterval) {
      onChange('checkInterval', config.emailTrigger.checkInterval)
    }
  }, [])

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="emailServer">邮件服务器</Label>
        <VariableInput
          value={(data.emailServer as string) || config.emailTrigger.imapServer || ''}
          onChange={(v) => onChange('emailServer', v)}
          placeholder="如: imap.qq.com"
        />
        <p className="text-xs text-muted-foreground">
          常用服务器：<br />
          • QQ邮箱：imap.qq.com<br />
          • 163邮箱：imap.163.com<br />
          • Gmail：imap.gmail.com
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="emailPort">端口</Label>
        <NumberInput
          id="emailPort"
          value={(data.emailPort as number) ?? config.emailTrigger.imapPort ?? 993}
          onChange={(v) => onChange('emailPort', v)}
          defaultValue={config.emailTrigger.imapPort || 993}
          min={1}
          max={65535}
        />
        <p className="text-xs text-muted-foreground">
          IMAP SSL端口通常为993
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="emailAccount">邮箱账号</Label>
        <VariableInput
          value={(data.emailAccount as string) || config.emailTrigger.emailAccount || ''}
          onChange={(v) => onChange('emailAccount', v)}
          placeholder="如: your@email.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="emailPassword">邮箱密码/授权码</Label>
        <VariableInput
          value={(data.emailPassword as string) || config.emailTrigger.emailPassword || ''}
          onChange={(v) => onChange('emailPassword', v)}
          placeholder="邮箱密码或授权码"
        />
        <p className="text-xs text-muted-foreground">
          QQ邮箱、163邮箱等需要使用授权码，而非登录密码
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fromFilter">发件人过滤（可选）</Label>
        <VariableInput
          value={(data.fromFilter as string) || ''}
          onChange={(v) => onChange('fromFilter', v)}
          placeholder="如: sender@example.com"
        />
        <p className="text-xs text-muted-foreground">
          只触发来自指定发件人的邮件，留空则不过滤
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subjectFilter">主题关键词过滤（可选）</Label>
        <VariableInput
          value={(data.subjectFilter as string) || ''}
          onChange={(v) => onChange('subjectFilter', v)}
          placeholder="如: 订单通知"
        />
        <p className="text-xs text-muted-foreground">
          只触发主题包含指定关键词的邮件，留空则不过滤
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="checkInterval">检查间隔（秒）</Label>
        <NumberInput
          id="checkInterval"
          value={(data.checkInterval as number) ?? config.emailTrigger.checkInterval ?? 30}
          onChange={(v) => onChange('checkInterval', v)}
          defaultValue={config.emailTrigger.checkInterval || 30}
          min={5}
        />
        <p className="text-xs text-muted-foreground">
          每隔多少秒检查一次新邮件，建议不低于30秒
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="timeout">超时时间（秒）</Label>
        <NumberInput
          id="timeout"
          value={(data.timeout as number) ?? 0}
          onChange={(v) => onChange('timeout', v)}
          defaultValue={0}
          min={0}
        />
        <p className="text-xs text-muted-foreground">
          0表示无限等待，直到收到符合条件的邮件
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="saveToVariable">保存邮件信息到变量</Label>
        <VariableNameInput
          id="saveToVariable"
          value={(data.saveToVariable as string) || ''}
          onChange={(v) => onChange('saveToVariable', v)}
          placeholder="如: email_data"
          isStorageVariable={true}
        />
        <p className="text-xs text-muted-foreground">
          邮件信息包含：from（发件人）、subject（主题）、date（日期）、body（正文）、timestamp（时间戳）
        </p>
      </div>

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800 leading-relaxed">
          <strong>使用说明：</strong><br />
          • 工作流执行到此模块时会暂停，定期检查邮箱<br />
          • 收到符合条件的新邮件后，工作流会继续执行<br />
          • 邮件会被标记为已读<br />
          • 适用于邮件通知触发、订单处理等场景
        </p>
      </div>

      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-xs text-amber-800 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          注意：请确保邮箱已开启IMAP服务，并使用授权码而非登录密码
        </p>
      </div>
    </>
  )
}

// API触发器配置
export function ApiTriggerConfig({
  data,
  onChange,
}: {
  data: NodeData
  onChange: (key: string, value: unknown) => void
}) {
  const { config } = useGlobalConfigStore()
  const method = (data.method as string) || 'GET'
  const conditionOperator = (data.conditionOperator as string) || '=='

  // 使用全局配置的默认值初始化
  useEffect(() => {
    if (!data.headers && config.apiTrigger.defaultHeaders) {
      onChange('headers', config.apiTrigger.defaultHeaders)
    }
    if (!data.checkInterval && config.apiTrigger.checkInterval) {
      onChange('checkInterval', config.apiTrigger.checkInterval)
    }
  }, [])

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="apiUrl">API地址</Label>
        <VariableInput
          value={(data.apiUrl as string) || ''}
          onChange={(v) => onChange('apiUrl', v)}
          placeholder="如: https://api.example.com/status"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="method">HTTP方法</Label>
        <Select
          id="method"
          value={method}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange('method', e.target.value)}
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="headers">请求头（JSON格式）</Label>
        <Textarea
          id="headers"
          value={(data.headers as string) || config.apiTrigger.defaultHeaders || '{}'}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange('headers', e.target.value)}
          placeholder='{"Authorization": "Bearer token"}'
          rows={3}
          className="font-mono text-xs"
        />
      </div>

      {method === 'POST' && (
        <div className="space-y-2">
          <Label htmlFor="body">请求体（JSON格式）</Label>
          <Textarea
            id="body"
            value={(data.body as string) || '{}'}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange('body', e.target.value)}
            placeholder='{"key": "value"}'
            rows={3}
            className="font-mono text-xs"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="conditionPath">条件判断路径（JSONPath）</Label>
        <VariableInput
          value={(data.conditionPath as string) || ''}
          onChange={(v) => onChange('conditionPath', v)}
          placeholder="如: data.status 或 $.result.code"
        />
        <p className="text-xs text-muted-foreground">
          留空则不判断条件，收到响应即触发<br />
          示例：data.status（访问响应中的data.status字段）
        </p>
      </div>

      {data.conditionPath && (
        <>
          <div className="space-y-2">
            <Label htmlFor="conditionOperator">比较运算符</Label>
            <Select
              id="conditionOperator"
              value={conditionOperator}
              onChange={(e) => onChange('conditionOperator', e.target.value)}
            >
              <option value="==">等于</option>
              <option value="!=">不等于</option>
              <option value=">">大于</option>
              <option value="<">小于</option>
              <option value="contains">包含</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="conditionValue">期望的值</Label>
            <VariableInput
              value={(data.conditionValue as string) || ''}
              onChange={(v) => onChange('conditionValue', v)}
              placeholder="如: success 或 200"
            />
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="checkInterval">检查间隔（秒）</Label>
        <NumberInput
          id="checkInterval"
          value={(data.checkInterval as number) ?? config.apiTrigger.checkInterval ?? 10}
          onChange={(v) => onChange('checkInterval', v)}
          defaultValue={config.apiTrigger.checkInterval || 10}
          min={1}
        />
        <p className="text-xs text-muted-foreground">
          每隔多少秒请求一次API
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="timeout">超时时间（秒）</Label>
        <NumberInput
          id="timeout"
          value={(data.timeout as number) ?? 0}
          onChange={(v) => onChange('timeout', v)}
          defaultValue={0}
          min={0}
        />
        <p className="text-xs text-muted-foreground">
          0表示无限等待，直到条件满足
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="saveToVariable">保存响应数据到变量</Label>
        <VariableNameInput
          id="saveToVariable"
          value={(data.saveToVariable as string) || ''}
          onChange={(v) => onChange('saveToVariable', v)}
          placeholder="如: api_response"
          isStorageVariable={true}
        />
      </div>

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800 leading-relaxed">
          <strong>使用说明：</strong><br />
          • 工作流执行到此模块时会暂停，定期轮询API接口<br />
          • 当API响应满足指定条件时，工作流会继续执行<br />
          • 适用于等待任务完成、监控状态变化等场景<br />
          • 示例：轮询任务状态API，直到status为"completed"
        </p>
      </div>
    </>
  )
}

// 定时触发器配置
export function TimerTriggerConfig({
  data,
  onChange,
}: {
  data: NodeData
  onChange: (key: string, value: unknown) => void
}) {
  const triggerMode = (data.triggerMode as string) || 'interval'
  const intervalUnit = (data.intervalUnit as string) || 'seconds'

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="triggerMode">触发模式</Label>
        <Select
          id="triggerMode"
          value={triggerMode}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange('triggerMode', e.target.value)}
        >
          <option value="interval">间隔触发</option>
          <option value="specific">指定时间触发</option>
          <option value="cron">Cron表达式</option>
        </Select>
      </div>

      {triggerMode === 'interval' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="intervalValue">间隔时间</Label>
            <div className="flex gap-2">
              <NumberInput
                id="intervalValue"
                value={(data.intervalValue as number) ?? 60}
                onChange={(v) => onChange('intervalValue', v)}
                defaultValue={60}
                min={1}
                className="flex-1"
              />
              <Select
                id="intervalUnit"
                value={intervalUnit}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange('intervalUnit', e.target.value)}
                className="w-24"
              >
                <option value="seconds">秒</option>
                <option value="minutes">分钟</option>
                <option value="hours">小时</option>
                <option value="days">天</option>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="repeatCount">重复次数</Label>
            <NumberInput
              id="repeatCount"
              value={(data.repeatCount as number) ?? 0}
              onChange={(v) => onChange('repeatCount', v)}
              defaultValue={0}
              min={0}
            />
            <p className="text-xs text-muted-foreground">
              0表示无限循环，直到手动停止工作流
            </p>
          </div>

          <div className="space-y-2">
            <Label>是否立即开始</Label>
            <div className="flex items-center gap-2">
              <Checkbox
                id="immediateStart"
                checked={(data.immediateStart as boolean) ?? true}
                onCheckedChange={(c) => onChange('immediateStart', c)}
              />
              <label htmlFor="immediateStart" className="text-sm">
                立即执行第一次，然后按间隔重复
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              不勾选则先等待一个间隔时间再开始
            </p>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800 leading-relaxed">
              <strong>使用说明：</strong><br />
              • 定时触发器会按固定间隔重复执行后续流程<br />
              • 适用于定期数据采集、定时任务等场景<br />
              • 可设置重复次数或无限循环<br />
              • 示例：每60秒检查一次网站更新
            </p>
          </div>
        </>
      )}

      {triggerMode === 'specific' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="specificTime">触发时间（HH:MM）</Label>
            <VariableInput
              value={(data.specificTime as string) || ''}
              onChange={(v) => onChange('specificTime', v)}
              placeholder="如: 14:30"
            />
            <p className="text-xs text-muted-foreground">
              24小时制，如：09:00、14:30、23:59
            </p>
          </div>

          <div className="space-y-2">
            <Label>重复设置</Label>
            <div className="flex items-center gap-2">
              <Checkbox
                id="repeatDaily"
                checked={(data.repeatDaily as boolean) ?? false}
                onCheckedChange={(c) => onChange('repeatDaily', c)}
              />
              <label htmlFor="repeatDaily" className="text-sm">
                每天重复执行
              </label>
            </div>
          </div>

          {!(data.repeatDaily as boolean) && (
            <div className="space-y-2">
              <Label htmlFor="specificDates">指定日期（可选）</Label>
              <VariableInput
                value={(data.specificDates as string) || ''}
                onChange={(v) => onChange('specificDates', v)}
                placeholder="如: 2026-02-01, 2026-02-15"
              />
              <p className="text-xs text-muted-foreground">
                多个日期用逗号分隔，格式：YYYY-MM-DD<br />
                留空则只在今天的指定时间触发一次
              </p>
            </div>
          )}

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800 leading-relaxed">
              <strong>使用说明：</strong><br />
              • 在指定的时间点触发工作流<br />
              • 可设置每天重复或指定具体日期<br />
              • 适用于定时报表、每日任务等场景<br />
              • 示例：每天早上9点发送日报
            </p>
          </div>
        </>
      )}

      {triggerMode === 'cron' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="cronExpression">Cron表达式</Label>
            <VariableInput
              value={(data.cronExpression as string) || ''}
              onChange={(v) => onChange('cronExpression', v)}
              placeholder="如: 0 0 * * *"
            />
            <p className="text-xs text-muted-foreground">
              标准Cron表达式格式：分 时 日 月 周<br />
              • 0 0 * * * - 每小时整点<br />
              • 0 9 * * * - 每天9点<br />
              • 0 9 * * 1 - 每周一9点<br />
              • 0 0 1 * * - 每月1号0点
            </p>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800 leading-relaxed">
              <strong>使用说明：</strong><br />
              • 使用Cron表达式定义复杂的定时规则<br />
              • 支持标准的5位Cron格式<br />
              • 适用于复杂的定时需求<br />
              • 在线工具：crontab.guru
            </p>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-800 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              注意：Cron模式使用标准Cron表达式语法
            </p>
          </div>
        </>
      )}

      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-xs text-amber-800 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          注意：定时触发器会持续运行，请确保设置合理的触发规则
        </p>
      </div>
    </>
  )
}


// 鼠标触发器配置
export function MouseTriggerConfig({
  data,
  onChange,
}: {
  data: NodeData
  onChange: (key: string, value: unknown) => void
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="triggerType">触发类型</Label>
        <Select
          id="triggerType"
          value={(data.triggerType as string) || 'left_click'}
          onChange={(e) => onChange('triggerType', e.target.value)}
        >
          <option value="left_click">鼠标左键点击</option>
          <option value="right_click">鼠标右键点击</option>
          <option value="middle_click">鼠标中键点击</option>
          <option value="scroll_up">向上滚动</option>
          <option value="scroll_down">向下滚动</option>
          <option value="move">移动超过指定距离</option>
          <option value="left_gesture">左键手势触发</option>
          <option value="right_gesture">右键手势触发</option>
          <option value="middle_gesture">中键手势触发</option>
          <option value="custom_gesture">自定义手势触发</option>
        </Select>
      </div>
      
      {['left_gesture', 'right_gesture', 'middle_gesture', 'custom_gesture'].includes(data.triggerType as string) && (
        <>
          <div className="space-y-2">
            <Label htmlFor="gesturePattern">手势模式 (可选)</Label>
            <Input
              id="gesturePattern"
              value={(data.gesturePattern as string) || ''}
              onChange={(e) => onChange('gesturePattern', e.target.value)}
              placeholder="例如: up, down_right, left_up_right"
            />
            <p className="text-xs text-muted-foreground">
              留空表示任意手势。支持方向: up(上), down(下), left(左), right(右)，用下划线连接表示连续手势
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="minGestureDistance">手势最小距离 (像素)</Label>
            <NumberInput
              id="minGestureDistance"
              value={(data.minGestureDistance as number) ?? 50}
              onChange={(v) => onChange('minGestureDistance', v)}
              defaultValue={50}
              min={10}
            />
            <p className="text-xs text-muted-foreground">
              手势识别的最小移动距离
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="gestureTimeout">手势超时 (秒)</Label>
            <NumberInput
              id="gestureTimeout"
              value={(data.gestureTimeout as number) ?? 2}
              onChange={(v) => onChange('gestureTimeout', v)}
              defaultValue={2}
              min={0.5}
              step={0.1}
            />
            <p className="text-xs text-muted-foreground">
              手势绘制的最大时长，超时则取消
            </p>
          </div>
        </>
      )}
      
      {(data.triggerType as string) === 'move' && (
        <div className="space-y-2">
          <Label htmlFor="moveDistance">移动距离阈值 (像素)</Label>
          <NumberInput
            id="moveDistance"
            value={(data.moveDistance as number) ?? 100}
            onChange={(v) => onChange('moveDistance', v)}
            defaultValue={100}
            min={10}
          />
          <p className="text-xs text-muted-foreground">
            鼠标移动超过此距离时触发
          </p>
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="timeout">超时时间 (秒)</Label>
        <NumberInput
          id="timeout"
          value={(data.timeout as number) ?? 0}
          onChange={(v) => onChange('timeout', v)}
          defaultValue={0}
          min={0}
        />
        <p className="text-xs text-muted-foreground">
          0表示无限等待，直到触发条件满足
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="saveToVariable">保存到变量 (可选)</Label>
        <VariableNameInput
          id="saveToVariable"
          value={(data.saveToVariable as string) || ''}
          onChange={(v) => onChange('saveToVariable', v)}
          placeholder="mouse_position"
          isStorageVariable={true}
        />
        <p className="text-xs text-muted-foreground">
          保存鼠标位置和事件信息到变量
        </p>
      </div>
      
      <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-900 dark:text-blue-100">
            <p className="font-medium mb-1">使用说明：</p>
            <ul className="list-disc list-inside space-y-1">
              <li>触发器会监听全局鼠标事件</li>
              <li>触发后会保存鼠标坐标和事件类型</li>
              <li>手势触发：按住鼠标按键并移动绘制手势</li>
              <li>可用于实现鼠标手势、快捷操作等功能</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}

// 图像触发器配置
export function ImageTriggerConfig({
  data,
  onChange,
}: {
  data: NodeData
  onChange: (key: string, value: unknown) => void
}) {
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
        <p className="text-xs text-muted-foreground">
          支持 PNG、JPG 等常见图像格式
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="confidence">匹配置信度</Label>
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
          值越高匹配越精确，建议0.7-0.9
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="checkInterval">检查间隔 (秒)</Label>
        <NumberInput
          id="checkInterval"
          value={(data.checkInterval as number) ?? 0.5}
          onChange={(v) => onChange('checkInterval', v)}
          defaultValue={0.5}
          min={0.1}
          step={0.1}
        />
        <p className="text-xs text-muted-foreground">
          每隔多久检查一次屏幕
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="timeout">超时时间 (秒)</Label>
        <NumberInput
          id="timeout"
          value={(data.timeout as number) ?? 0}
          onChange={(v) => onChange('timeout', v)}
          defaultValue={0}
          min={0}
        />
        <p className="text-xs text-muted-foreground">
          0表示无限等待，直到检测到图像
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
          限定区域可提高识别速度，不选择则搜索整个屏幕
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
        <Label htmlFor="saveToVariable">保存到变量 (可选)</Label>
        <VariableNameInput
          id="saveToVariable"
          value={(data.saveToVariable as string) || ''}
          onChange={(v) => onChange('saveToVariable', v)}
          placeholder="image_position"
          isStorageVariable={true}
        />
        <p className="text-xs text-muted-foreground">
          保存图像位置和匹配度到变量
        </p>
      </div>
      
      <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-900 dark:text-blue-100">
            <p className="font-medium mb-1">使用说明：</p>
            <ul className="list-disc list-inside space-y-1">
              <li>持续检测屏幕上是否出现指定图像</li>
              <li>检测到图像后立即触发工作流</li>
              <li>可用于等待界面加载、按钮出现等场景</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}

// 声音触发器配置
export function SoundTriggerConfig({
  data,
  onChange,
}: {
  data: NodeData
  onChange: (key: string, value: unknown) => void
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="volumeThreshold">音量阈值 (%)</Label>
        <div className="flex items-center gap-2">
          <Slider
            min={0}
            max={100}
            step={5}
            value={[(data.volumeThreshold as number) || 50]}
            onValueChange={(vals) => onChange('volumeThreshold', vals[0])}
            className="flex-1"
          />
          <span className="text-sm w-12 text-right">{(data.volumeThreshold as number) || 50}%</span>
        </div>
        <p className="text-xs text-muted-foreground">
          当系统音量达到此阈值时触发
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="checkInterval">检查间隔 (秒)</Label>
        <NumberInput
          id="checkInterval"
          value={(data.checkInterval as number) ?? 0.1}
          onChange={(v) => onChange('checkInterval', v)}
          defaultValue={0.1}
          min={0.05}
          step={0.05}
        />
        <p className="text-xs text-muted-foreground">
          每隔多久检查一次音量
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="timeout">超时时间 (秒)</Label>
        <NumberInput
          id="timeout"
          value={(data.timeout as number) ?? 0}
          onChange={(v) => onChange('timeout', v)}
          defaultValue={0}
          min={0}
        />
        <p className="text-xs text-muted-foreground">
          0表示无限等待，直到检测到声音
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="saveToVariable">保存到变量 (可选)</Label>
        <VariableNameInput
          id="saveToVariable"
          value={(data.saveToVariable as string) || ''}
          onChange={(v) => onChange('saveToVariable', v)}
          placeholder="sound_volume"
          isStorageVariable={true}
        />
        <p className="text-xs text-muted-foreground">
          保存触发时的音量值到变量
        </p>
      </div>
      
      <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-900 dark:text-blue-100">
            <p className="font-medium mb-1">使用说明：</p>
            <ul className="list-disc list-inside space-y-1">
              <li>监听系统音频输出（扬声器）的音量</li>
              <li>当音量达到阈值时触发工作流</li>
              <li>可用于检测通知声音、提示音等</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}

// 人脸触发器配置
export function FaceTriggerConfig({
  data,
  onChange,
}: {
  data: NodeData
  onChange: (key: string, value: unknown) => void
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="targetFaceImage">目标人脸图片</Label>
        <ImagePathInput
          value={(data.targetFaceImage as string) || ''}
          onChange={(v) => onChange('targetFaceImage', v)}
        />
        <p className="text-xs text-muted-foreground">
          用于比对的目标人脸照片
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="tolerance">匹配容差</Label>
        <div className="flex items-center gap-2">
          <Slider
            min={0.3}
            max={0.8}
            step={0.05}
            value={[(data.tolerance as number) || 0.6]}
            onValueChange={(vals) => onChange('tolerance', vals[0])}
            className="flex-1"
          />
          <span className="text-sm w-12 text-right">{((data.tolerance as number) || 0.6).toFixed(2)}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          越小越严格，0.6为默认值，建议0.4-0.6
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="cameraIndex">摄像头索引</Label>
        <NumberInput
          id="cameraIndex"
          value={(data.cameraIndex as number) ?? 0}
          onChange={(v) => onChange('cameraIndex', v)}
          defaultValue={0}
          min={0}
        />
        <p className="text-xs text-muted-foreground">
          0为默认摄像头，如有多个摄像头可尝试1、2等
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="checkInterval">检查间隔 (秒)</Label>
        <NumberInput
          id="checkInterval"
          value={(data.checkInterval as number) ?? 0.5}
          onChange={(v) => onChange('checkInterval', v)}
          defaultValue={0.5}
          min={0.1}
          step={0.1}
        />
        <p className="text-xs text-muted-foreground">
          每隔多久检查一次摄像头画面
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="timeout">超时时间 (秒)</Label>
        <NumberInput
          id="timeout"
          value={(data.timeout as number) ?? 0}
          onChange={(v) => onChange('timeout', v)}
          defaultValue={0}
          min={0}
        />
        <p className="text-xs text-muted-foreground">
          0表示无限等待，直到检测到目标人脸
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="saveToVariable">保存到变量 (可选)</Label>
        <VariableNameInput
          id="saveToVariable"
          value={(data.saveToVariable as string) || ''}
          onChange={(v) => onChange('saveToVariable', v)}
          placeholder="face_detected"
          isStorageVariable={true}
        />
        <p className="text-xs text-muted-foreground">
          保存识别结果（匹配度、人脸位置等）到变量
        </p>
      </div>
      
      <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-900 dark:text-blue-100">
            <p className="font-medium mb-1">使用说明：</p>
            <ul className="list-disc list-inside space-y-1">
              <li>实时监控摄像头画面，检测目标人脸</li>
              <li>检测到匹配的人脸后立即触发工作流</li>
              <li>可用于人脸考勤、身份验证等场景</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-amber-900 dark:text-amber-100">
            <p className="font-medium mb-1">注意事项：</p>
            <ul className="list-disc list-inside space-y-1">
              <li>确保摄像头已正确连接并授权</li>
              <li>目标人脸图片应清晰且只包含一张人脸</li>
              <li>光线条件会影响识别准确度</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}


// 子元素变化触发器配置
export function ElementChangeTriggerConfig({
  data,
  onChange,
  renderSelectorInput,
}: {
  data: NodeData
  onChange: (key: string, value: unknown) => void
  renderSelectorInput?: (id: string, label: string, placeholder: string) => React.ReactNode
}) {
  return (
    <>
      {renderSelectorInput ? (
        renderSelectorInput('selector', '元素选择器', '如: .comment-list 或 #messages')
      ) : (
        <div className="space-y-2">
          <Label htmlFor="selector">元素选择器</Label>
          <VariableInput
            value={(data.selector as string) || ''}
            onChange={(v) => onChange('selector', v)}
            placeholder="如: .comment-list 或 #messages"
          />
          <p className="text-xs text-muted-foreground">
            要监控的父元素的CSS选择器
          </p>
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="checkInterval">检查间隔 (秒)</Label>
        <NumberInput
          id="checkInterval"
          value={(data.checkInterval as number) ?? 0.5}
          onChange={(v) => onChange('checkInterval', v)}
          defaultValue={0.5}
          min={0.1}
          step={0.1}
        />
        <p className="text-xs text-muted-foreground">
          每隔多久检查一次元素变化
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="timeout">超时时间 (秒)</Label>
        <NumberInput
          id="timeout"
          value={(data.timeout as number) ?? 0}
          onChange={(v) => onChange('timeout', v)}
          defaultValue={0}
          min={0}
        />
        <p className="text-xs text-muted-foreground">
          0表示无限等待，直到检测到元素变化
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="saveNewElementSelector">保存新增元素选择器到变量</Label>
        <VariableNameInput
          id="saveNewElementSelector"
          value={(data.saveNewElementSelector as string) || ''}
          onChange={(v) => onChange('saveNewElementSelector', v)}
          placeholder="new_element_selector"
          isStorageVariable={true}
        />
        <p className="text-xs text-muted-foreground">
          当有新元素增加时，保存新增元素的选择器
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="saveChangeInfo">保存变化信息到变量</Label>
        <VariableNameInput
          id="saveChangeInfo"
          value={(data.saveChangeInfo as string) || ''}
          onChange={(v) => onChange('saveChangeInfo', v)}
          placeholder="element_change_info"
          isStorageVariable={true}
        />
        <p className="text-xs text-muted-foreground">
          保存变化详情（变化类型、数量等）到变量
        </p>
      </div>
      
      <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-900 dark:text-blue-100">
            <p className="font-medium mb-1">使用说明：</p>
            <ul className="list-disc list-inside space-y-1">
              <li>监控指定元素的子元素数量变化</li>
              <li>适用于实时监控直播评论、聊天消息等场景</li>
              <li>自动获取新增元素的选择器，方便后续操作</li>
              <li>检测到第一次变化后立即触发后续流程</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-green-900 dark:text-green-100">
            <p className="font-medium mb-1">实战示例：</p>
            <p className="mb-1">监控直播间评论：</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>选择器：.comment-list（评论列表容器）</li>
              <li>检查间隔：0.5秒</li>
              <li>后续流程：获取新评论内容 → 数据处理 → 保存</li>
              <li>如需持续监控，可将整个流程放入循环节点中</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}

// 手势触发器配置
export function GestureTriggerConfig({
  data,
  onChange,
}: {
  data: NodeData
  onChange: (key: string, value: unknown) => void
}) {
  const [customGestures, setCustomGestures] = useState<Array<{name: string, timestamp: string}>>([])
  const [isRecording, setIsRecording] = useState(false)
  const [gestureStatus, setGestureStatus] = useState<{is_running: boolean, camera_index: number}>({
    is_running: false,
    camera_index: 0
  })

  // 弹窗状态
  const [showInputDialog, setShowInputDialog] = useState(false)
  const [showRecordingAlert, setShowRecordingAlert] = useState(false)
  const [showSuccessAlert, setShowSuccessAlert] = useState(false)
  const [showErrorAlert, setShowErrorAlert] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [recordingGestureName, setRecordingGestureName] = useState('')
  const [deleteGestureName, setDeleteGestureName] = useState('')

  // 加载自定义手势列表
  const loadCustomGestures = () => {
    fetch(`${getBackendUrl()}/api/triggers/gesture/custom`)
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          setCustomGestures(result.gestures)
        }
      })
      .catch(err => console.error('加载自定义手势失败:', err))
  }

  useEffect(() => {
    loadCustomGestures()
  }, [])

  // 检查手势识别状态
  const checkStatus = () => {
    fetch(`${getBackendUrl()}/api/triggers/gesture/status`)
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          setGestureStatus(result.status)
        }
      })
      .catch(err => console.error('获取手势识别状态失败:', err))
  }

  useEffect(() => {
    checkStatus()
    const interval = setInterval(checkStatus, 2000)
    return () => clearInterval(interval)
  }, [])

  const gestureName = (data.gestureName as string) || ''
  const cameraIndex = (data.cameraIndex as number) ?? 0
  
  // 确保超时时间默认为60秒
  useEffect(() => {
    if (data.timeout === undefined || (typeof data.timeout === 'number' && data.timeout < 1000)) {
      // 如果没有设置或者是旧数据（小于1000，认为是秒），设置为60秒
      const timeoutValue = data.timeout !== undefined ? data.timeout * 1000 : 60000
      onChange('timeout', timeoutValue)
    }
  }, [])

  // 录制新手势
  const handleRecordGesture = () => {
    setShowInputDialog(true)
  }

  const handleInputConfirm = async (newGestureName: string) => {
    if (!newGestureName || !newGestureName.trim()) return

    const trimmedName = newGestureName.trim()
    setRecordingGestureName(trimmedName)

    setIsRecording(true)
    setShowRecordingAlert(true)
  }

  const handleStartRecording = async () => {
    setShowRecordingAlert(false)

    try {
      // 直接录制手势（不需要先启动识别服务）
      const response = await fetch(`${getBackendUrl()}/api/triggers/gesture/record`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          gesture_name: recordingGestureName,
          timeout: 30
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || '录制失败')
      }

      const result = await response.json()
      
      if (result.success) {
        setAlertMessage(`手势"${recordingGestureName}"录制成功！\n\n现在可以在下拉列表中选择使用该手势。`)
        setShowSuccessAlert(true)
        loadCustomGestures()
        onChange('gestureName', recordingGestureName)
      } else {
        setErrorMessage('手势录制失败或超时\n\n请确保：\n1. 摄像头正常工作\n2. 手部在摄像头视野内\n3. 在30秒内按下空格键确认')
        setShowErrorAlert(true)
      }
    } catch (err) {
      console.error('录制手势失败:', err)
      const errorMsg = err instanceof Error ? err.message : String(err)
      setErrorMessage(`录制手势失败\n\n错误信息：${errorMsg}\n\n请确保：\n1. 摄像头已连接\n2. 已安装mediapipe库\n3. 摄像头未被其他程序占用`)
      setShowErrorAlert(true)
    } finally {
      setIsRecording(false)
    }
  }

  // 删除自定义手势
  const handleDeleteGesture = (gestureName: string) => {
    setDeleteGestureName(gestureName)
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async () => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/triggers/gesture/custom/${deleteGestureName}`, {
        method: 'DELETE'
      })

      const result = await response.json()
      if (result.success) {
        setAlertMessage('删除成功')
        setShowSuccessAlert(true)
        loadCustomGestures()
        if (data.gestureName === deleteGestureName) {
          onChange('gestureName', '')
        }
      }
    } catch (err) {
      console.error('删除手势失败:', err)
      setErrorMessage('删除失败')
      setShowErrorAlert(true)
    }
  }

  return (
    <>
      <div className="p-3 bg-blue-600 dark:bg-blue-950 rounded-lg border border-blue-700 dark:border-blue-800 mb-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-white mt-0.5 flex-shrink-0" />
          <div className="text-xs text-white">
            <p className="font-medium mb-1">使用说明：</p>
            <ul className="list-disc list-inside space-y-1">
              <li>首次使用需要录制自定义手势</li>
              <li>录制时会弹出摄像头窗口，做出手势后按空格键确认</li>
              <li>建议在光线充足、纯色背景下录制</li>
              <li>每个手势只需录制一次，可重复使用</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>手势识别状态</Label>
        <div className={`p-3 rounded-lg border ${gestureStatus.is_running ? 'bg-green-600 border-green-700' : 'bg-gray-700 border-gray-600'}`}>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${gestureStatus.is_running ? 'bg-green-300 animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="text-sm font-medium text-white">
              {gestureStatus.is_running ? '识别服务运行中' : '⏸️ 识别服务未启动'}
            </span>
          </div>
          <p className="text-xs text-white mt-1">
            {gestureStatus.is_running ? `摄像头 ${gestureStatus.camera_index} 已就绪` : '执行工作流时会自动启动'}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="gestureName">选择手势</Label>
        <Select
          id="gestureName"
          value={gestureName}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange('gestureName', e.target.value)}
        >
          <option value="">-- 请选择手势 --</option>
          {customGestures.map(gesture => (
            <option key={gesture.name} value={gesture.name}>
              {gesture.name}
            </option>
          ))}
        </Select>
        
        <div className="flex gap-2">
          <button
            onClick={handleRecordGesture}
            disabled={isRecording}
            className={`flex-1 px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium shadow-sm ${
              isRecording 
                ? 'bg-gray-400 text-white cursor-not-allowed' 
                : 'bg-green-500 hover:bg-green-600 text-white hover:shadow-md active:scale-95'
            }`}
          >
            {isRecording ? '⏳ 录制中...' : '📹 录制新手势'}
          </button>
          {gestureName && (
            <button
              onClick={() => handleDeleteGesture(gestureName)}
              disabled={isRecording}
              className={`px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium shadow-sm ${
                isRecording
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-red-500 hover:bg-red-600 text-white hover:shadow-md active:scale-95'
              }`}
            >
              🗑️ 删除
            </button>
          )}
        </div>

        {isRecording && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg animate-pulse">
            <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">
              ⏳ 正在等待录制...
            </p>
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              请在弹出的窗口中做出手势，然后按空格键确认
            </p>
          </div>
        )}

        {customGestures.length === 0 && !isRecording && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-900 dark:text-blue-100 font-medium mb-2">
              还没有录制任何手势
            </p>
            <p className="text-xs text-blue-800 dark:text-blue-200">
              点击"录制新手势"按钮开始录制您的第一个手势
            </p>
          </div>
        )}

        <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
          <p className="text-xs text-purple-900 dark:text-purple-100 font-medium mb-2">录制步骤：</p>
          <ol className="text-xs text-purple-800 dark:text-purple-200 space-y-1 list-decimal list-inside">
            <li>点击"录制新手势"按钮</li>
            <li>输入手势名称（如：OK手势、点赞等）</li>
            <li>在弹出的窗口中对着摄像头做出手势</li>
            <li>保持手势稳定，按空格键确认录制</li>
            <li>录制成功后即可在列表中选择使用</li>
          </ol>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cameraIndex">摄像头索引</Label>
        <NumberInput
          id="cameraIndex"
          value={cameraIndex}
          onChange={(v) => onChange('cameraIndex', v)}
          defaultValue={0}
          min={0}
          max={10}
        />
        <p className="text-xs text-muted-foreground">
          通常0是默认摄像头，如有多个摄像头可尝试1、2等
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confidenceThreshold">识别置信度阈值</Label>
        <div className="flex items-center gap-2">
          <Slider
            min={0}
            max={100}
            value={[((data.confidenceThreshold as number) ?? 0.6) * 100]}
            onValueChange={(vals) => onChange('confidenceThreshold', vals[0] / 100)}
            className="flex-1"
          />
          <span className="text-sm font-medium w-12 text-right">
            {(((data.confidenceThreshold as number) ?? 0.6) * 100).toFixed(0)}%
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          置信度越高，识别越严格，但可能更难触发（推荐60%）
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="timeout">超时时间（秒）</Label>
        <NumberInput
          id="timeout"
          value={
            data.timeout !== undefined 
              ? (typeof data.timeout === 'number' && data.timeout < 1000 
                  ? data.timeout  // 如果是小于1000，认为是旧数据（秒），直接使用
                  : (data.timeout as number) / 1000)  // 否则是内部存储的毫秒值，转换为秒显示
              : 60  // 默认60秒
          }
          onChange={(v) => {
            const milliseconds = typeof v === 'number' ? v * 1000 : 60000
            onChange('timeout', milliseconds)
          }}
          defaultValue={60}
          min={0}
        />
        <p className="text-xs text-muted-foreground">
          0表示无限等待，直到检测到目标手势
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="saveToVariable">保存手势信息到变量</Label>
        <VariableNameInput
          id="saveToVariable"
          value={(data.saveToVariable as string) || ''}
          onChange={(v) => onChange('saveToVariable', v)}
          placeholder="gesture_data"
          isStorageVariable={true}
        />
        <p className="text-xs text-muted-foreground">
          保存手势名称、置信度、时间戳等信息到变量
        </p>
      </div>

      <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-green-900 dark:text-green-100">
            <p className="font-medium mb-1">应用场景：</p>
            <ul className="list-disc list-inside space-y-1">
              <li>无接触控制：通过手势控制电脑操作</li>
              <li>演示互动：演讲时通过手势切换PPT</li>
              <li>游戏控制：用手势玩游戏</li>
              <li>智能家居：手势控制灯光、窗帘等</li>
              <li>直播互动：识别观众手势触发特效</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 输入手势名称弹窗 */}
      <InputDialog
        open={showInputDialog}
        onOpenChange={setShowInputDialog}
        title="录制新手势"
        description="请输入新手势的名称（如：OK手势、点赞等）"
        placeholder="请输入手势名称"
        onConfirm={handleInputConfirm}
      />

      {/* 录制准备提示弹窗 */}
      <AlertDialog
        open={showRecordingAlert}
        onOpenChange={setShowRecordingAlert}
        title={`准备录制手势"${recordingGestureName}"`}
        description={`1. 点击确定后，会弹出摄像头窗口\n2. 请对着摄像头做出手势\n3. 按空格键确认录制\n4. 按ESC键取消录制\n\n提示：请在光线充足的环境下录制，并保持手势稳定`}
        onConfirm={handleStartRecording}
        variant="default"
      />

      {/* 成功提示弹窗 */}
      <AlertDialog
        open={showSuccessAlert}
        onOpenChange={setShowSuccessAlert}
        title="操作成功"
        description={alertMessage}
        variant="success"
      />

      {/* 错误提示弹窗 */}
      <AlertDialog
        open={showErrorAlert}
        onOpenChange={setShowErrorAlert}
        title="操作失败"
        description={errorMessage}
        variant="error"
      />

      {/* 删除确认弹窗 */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="确认删除"
        description={`确定要删除自定义手势"${deleteGestureName}"吗？\n\n删除后将无法恢复，需要重新录制。`}
        onConfirm={handleConfirmDelete}
        variant="destructive"
        confirmText="删除"
        cancelText="取消"
      />
    </>
  )
}
