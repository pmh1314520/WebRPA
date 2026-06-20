import type { NodeData } from '@/store/workflowStore'
import { Label } from '@/components/ui/label'
import { VariableInput } from '@/components/ui/variable-input'
import { SelectNative as Select } from '@/components/ui/select-native'
import { VariableNameInput } from '@/components/ui/variable-name-input'

interface ConfigProps {
  data: NodeData
  onChange: (key: string, value: unknown) => void
}

const LocatorTip = () => (
  <p className="text-xs text-muted-foreground">
    定位符支持：<code>#id</code>、<code>.class</code>、<code>text:文字</code>、<code>xpath://...</code>、<code>css:...</code>
  </p>
)

export function DpOpenPageConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>网址 URL</Label>
        <VariableInput value={(data.url as string) || ''} onChange={(v) => onChange('url', v)} placeholder="https://example.com" />
      </div>
      <div className="space-y-2">
        <Label>无头模式</Label>
        <Select value={String(data.headless ?? 'false')} onChange={(e) => onChange('headless', e.target.value)}>
          <option value="false">否（显示浏览器窗口）</option>
          <option value="true">是（后台无界面）</option>
        </Select>
        <p className="text-xs text-muted-foreground">DrissionPage 控制真实浏览器内核，对反自动化检测更隐蔽，适合常规方式被风控拦截的站点。</p>
      </div>
    </div>
  )
}

export function DpClickConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>元素定位符</Label>
        <VariableInput value={(data.locator as string) || ''} onChange={(v) => onChange('locator', v)} placeholder="text:登录 或 #submit" />
        <LocatorTip />
      </div>
      <div className="space-y-2">
        <Label>等待秒数</Label>
        <VariableInput value={String((data.timeout as number | string) ?? 10)} onChange={(v) => onChange('timeout', v)} placeholder="10" />
      </div>
    </div>
  )
}

export function DpInputConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>输入框定位符</Label>
        <VariableInput value={(data.locator as string) || ''} onChange={(v) => onChange('locator', v)} placeholder="#username" />
        <LocatorTip />
      </div>
      <div className="space-y-2">
        <Label>输入内容</Label>
        <VariableInput value={(data.text as string) || ''} onChange={(v) => onChange('text', v)} placeholder="要输入的文本，支持 {变量}" />
      </div>
      <div className="space-y-2">
        <Label>输入前清空</Label>
        <Select value={String(data.clear ?? 'true')} onChange={(e) => onChange('clear', e.target.value)}>
          <option value="true">是</option>
          <option value="false">否</option>
        </Select>
      </div>
    </div>
  )
}

export function DpGetTextConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>元素定位符</Label>
        <VariableInput value={(data.locator as string) || ''} onChange={(v) => onChange('locator', v)} placeholder=".title" />
        <LocatorTip />
      </div>
      <div className="space-y-2">
        <Label>保存到变量</Label>
        <VariableNameInput value={(data.variableName as string) || ''} onChange={(v) => onChange('variableName', v)} placeholder="dp_text" />
      </div>
    </div>
  )
}

export function DpGetHtmlConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-2">
      <Label>保存页面 HTML 到变量</Label>
      <VariableNameInput value={(data.variableName as string) || ''} onChange={(v) => onChange('variableName', v)} placeholder="dp_html" />
    </div>
  )
}

export function DpRunJsConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>JavaScript 脚本</Label>
        <textarea
          value={(data.script as string) || ''}
          onChange={(e) => onChange('script', e.target.value)}
          placeholder="return document.title"
          className="w-full min-h-[100px] px-3 py-2 text-sm border rounded-md resize-y font-mono"
        />
      </div>
      <div className="space-y-2">
        <Label>返回值保存到变量</Label>
        <VariableNameInput value={(data.variableName as string) || ''} onChange={(v) => onChange('variableName', v)} placeholder="dp_js_result" />
      </div>
    </div>
  )
}

export function DpWaitElementConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>等待出现的元素定位符</Label>
        <VariableInput value={(data.locator as string) || ''} onChange={(v) => onChange('locator', v)} placeholder="#content" />
        <LocatorTip />
      </div>
      <div className="space-y-2">
        <Label>最长等待秒数</Label>
        <VariableInput value={String((data.timeout as number | string) ?? 10)} onChange={(v) => onChange('timeout', v)} placeholder="10" />
      </div>
    </div>
  )
}

export function DpScrollConfig({ data, onChange }: ConfigProps) {
  const direction = (data.direction as string) || 'bottom'
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>滚动方向</Label>
        <Select value={direction} onChange={(e) => onChange('direction', e.target.value)}>
          <option value="bottom">滚到底部</option>
          <option value="top">滚到顶部</option>
          <option value="down">向下滚动像素</option>
          <option value="up">向上滚动像素</option>
        </Select>
      </div>
      {(direction === 'down' || direction === 'up') && (
        <div className="space-y-2">
          <Label>滚动像素</Label>
          <VariableInput value={String((data.pixels as number | string) ?? 500)} onChange={(v) => onChange('pixels', v)} placeholder="500" />
        </div>
      )}
    </div>
  )
}

export function DpCloseConfig() {
  return (
    <div className="text-sm text-muted-foreground">关闭 DrissionPage 浏览器，释放资源。通常放在流程末尾。</div>
  )
}
