import type React from 'react'
import { useEffect } from 'react'
import type { NodeData } from '@/store/workflowStore'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { NumberInput } from '@/components/ui/number-input'
import { SelectNative as Select } from '@/components/ui/select-native'
import { VariableInput } from '@/components/ui/variable-input'
import { VariableNameInput } from '@/components/ui/variable-name-input'
import { VariableRefInput } from '@/components/ui/variable-ref-input'
import { Bot, Cpu } from 'lucide-react'
import { useGlobalConfigStore } from '@/store/globalConfigStore'

type RenderSelectorInput = (id: string, label: string, placeholder: string) => React.ReactNode

// 已配置 AI 对话模型的一键选择下拉：选中即把该模型的 地址/密钥/模型名 填入当前模块
function AIModelPicker({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  const models = useGlobalConfigStore((s) => s.config.ai?.models) || []
  const autoFallback = useGlobalConfigStore((s) => s.config.ai?.autoFallback) ?? false

  // 全局开启「失败自动切换」时，自动把其它已配置模型注入本模块的 fallbackModels（运行时按序回退）；
  // 关闭时清空。用序列化对比避免无限渲染。
  useEffect(() => {
    const curUrl = (data.apiUrl as string) || ''
    const curModel = (data.model as string) || ''
    const desired = (autoFallback && models.length > 0)
      ? models
          .filter((m) => m.apiUrl && m.model && !(m.apiUrl === curUrl && m.model === curModel))
          .map((m) => ({ apiUrl: m.apiUrl, apiKey: m.apiKey, model: m.model, temperature: m.temperature, maxTokens: m.maxTokens }))
      : []
    const prev = (data.fallbackModels as any[]) || []
    if (JSON.stringify(prev) !== JSON.stringify(desired)) {
      onChange('fallbackModels', desired.length > 0 ? desired : undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFallback, JSON.stringify(models), data.apiUrl, data.model])

  if (models.length === 0) return null
  const current = models.find((m) => (m.model || '') === (data.model as string) && (m.apiUrl || '') === (data.apiUrl as string))
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-violet-600" />从已配置模型选择</Label>
      <Select
        value={current?.id || ''}
        onChange={(e) => {
          const m = models.find((x) => x.id === e.target.value)
          if (!m) return
          onChange('apiUrl', m.apiUrl || '')
          onChange('apiKey', m.apiKey || '')
          onChange('model', m.model || '')
          if (m.temperature != null) onChange('temperature', m.temperature)
          if (m.maxTokens != null) onChange('maxTokens', m.maxTokens)
        }}
      >
        <option value="">手动填写 / 选择一个已配置模型…</option>
        {models.map((m) => (
          <option key={m.id} value={m.id}>{m.label || m.model}（{m.model}）</option>
        ))}
      </Select>
      <p className="text-xs text-muted-foreground">在「全局配置 → AI对话 → 多模型」中维护模型；选择后会自动填入下方地址/密钥/模型。</p>
    </div>
  )
}

// AI大脑配置
export function AIChatConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <AIModelPicker data={data} onChange={onChange} />
      <div className="space-y-2">
        <Label htmlFor="apiUrl">API地址</Label>
        <VariableInput
          value={(data.apiUrl as string) || ''}
          onChange={(v) => onChange('apiUrl', v)}
          placeholder="https://api.openai.com/v1/chat/completions，支持 {变量名}"
        />
        <p className="text-xs text-muted-foreground">
          支持 OpenAI、智谱、Deepseek 等兼容接口
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="apiKey">API密钥</Label>
        <VariableInput
          value={(data.apiKey as string) || ''}
          onChange={(v) => onChange('apiKey', v)}
          placeholder="sk-xxx 或其他API密钥，支持 {变量名}"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="model">模型名称</Label>
        <VariableInput
          value={(data.model as string) || ''}
          onChange={(v) => onChange('model', v)}
          placeholder="gpt-3.5-turbo / glm-4 / deepseek-chat，支持 {变量名}"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="systemPrompt">系统提示词 (可选)</Label>
        <VariableInput
          value={(data.systemPrompt as string) || ''}
          onChange={(v) => onChange('systemPrompt', v)}
          placeholder="设定AI的角色和行为，支持 {变量名}"
          multiline
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="userPrompt">用户提示词</Label>
        <VariableInput
          value={(data.userPrompt as string) || ''}
          onChange={(v) => onChange('userPrompt', v)}
          placeholder="发送给AI的内容，支持 {变量名}"
          multiline
          rows={4}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="variableName">存储回复到变量</Label>
        <VariableNameInput
          id="variableName"
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="变量名"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="temperature">温度 (0-2)</Label>
        <NumberInput
          id="temperature"
          value={(data.temperature as number) ?? 0.7}
          onChange={(v) => onChange('temperature', v)}
          defaultValue={0.7}
          min={0}
          max={2}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="maxTokens">最大Token数</Label>
        <NumberInput
          id="maxTokens"
          value={(data.maxTokens as number) ?? 2000}
          onChange={(v) => onChange('maxTokens', v)}
          defaultValue={2000}
          min={1}
        />
      </div>
    </>
  )
}

// AI视觉配置
export function AIVisionConfig({ 
  data, 
  onChange, 
  renderSelectorInput 
}: { 
  data: NodeData
  onChange: (key: string, value: unknown) => void
  renderSelectorInput: RenderSelectorInput
}) {
  const imageSource = (data.imageSource as string) || 'element'
  
  return (
    <>
      <AIModelPicker data={data} onChange={onChange} />
      <div className="space-y-2">
        <Label htmlFor="apiUrl">API地址</Label>
        <VariableInput
          value={(data.apiUrl as string) || ''}
          onChange={(v) => onChange('apiUrl', v)}
          placeholder="https://open.bigmodel.cn/api/paas/v4/chat/completions，支持 {变量名}"
        />
        <p className="text-xs text-muted-foreground">
          支持 OpenAI、智谱GLM-4V 等视觉模型接口
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="apiKey">API密钥</Label>
        <VariableInput
          value={(data.apiKey as string) || ''}
          onChange={(v) => onChange('apiKey', v)}
          placeholder="API密钥，支持 {变量名}"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="model">模型名称</Label>
        <VariableInput
          value={(data.model as string) || ''}
          onChange={(v) => onChange('model', v)}
          placeholder="glm-4v / gpt-4-vision-preview，支持 {变量名}"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="imageSource">图片来源</Label>
        <Select
          id="imageSource"
          value={imageSource}
          onChange={(e) => onChange('imageSource', e.target.value)}
        >
          <option value="element">页面元素截图</option>
          <option value="screenshot">当前页面截图</option>
          <option value="url">图片URL</option>
          <option value="variable">变量 (Base64/路径)</option>
        </Select>
      </div>
      
      {imageSource === 'element' && (
        renderSelectorInput('imageSelector', '图片元素选择器', 'img.target 或 #image')
      )}
      
      {imageSource === 'url' && (
        <div className="space-y-2">
          <Label htmlFor="imageUrl">图片URL</Label>
          <VariableInput
            value={(data.imageUrl as string) || ''}
            onChange={(v) => onChange('imageUrl', v)}
            placeholder="https://example.com/image.jpg，支持 {变量名}"
          />
        </div>
      )}
      
      {imageSource === 'variable' && (
        <div className="space-y-2">
          <Label htmlFor="imageVariable">图片变量名</Label>
          <VariableRefInput
            id="imageVariable"
            value={(data.imageVariable as string) || ''}
            onChange={(v) => onChange('imageVariable', v)}
            placeholder="填写变量名，如: imageData"
          />
          <p className="text-xs text-muted-foreground">
            直接填写包含Base64或文件路径的变量名
          </p>
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="userPrompt">提问内容</Label>
        <VariableInput
          value={(data.userPrompt as string) || ''}
          onChange={(v) => onChange('userPrompt', v)}
          placeholder="请描述这张图片中的内容，支持 {变量名}"
          multiline
          rows={4}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="variableName">存储回复到变量</Label>
        <VariableNameInput
          id="variableName"
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="变量名"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="maxTokens">最大Token数</Label>
        <NumberInput
          id="maxTokens"
          value={(data.maxTokens as number) ?? 1000}
          onChange={(v) => onChange('maxTokens', v)}
          defaultValue={1000}
          min={1}
        />
      </div>
      
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          <strong>AI视觉模块</strong>可以让AI"看"图片并回答问题。<br/>
          • 支持识别图片内容、提取文字、分析图表等<br/>
          • 推荐使用智谱GLM-4V或OpenAI GPT-4V模型
        </p>
      </div>
    </>
  )
}

// API请求配置
export function ApiRequestConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  const method = (data.requestMethod as string) || 'GET'
  const hasBody = ['POST', 'PUT', 'PATCH'].includes(method)

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="requestUrl">请求地址</Label>
        <VariableInput
          value={(data.requestUrl as string) || ''}
          onChange={(v) => onChange('requestUrl', v)}
          placeholder="https://api.example.com/data，支持 {变量名}"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="requestMethod">请求方法</Label>
        <Select
          id="requestMethod"
          value={method}
          onChange={(e) => onChange('requestMethod', e.target.value)}
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
          <option value="PATCH">PATCH</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="requestHeaders">请求头（JSON 格式，可选）</Label>
        <textarea
          id="requestHeaders"
          className="w-full min-h-[60px] px-3 py-2 text-sm rounded-md border border-input bg-background font-mono text-xs"
          value={(data.requestHeaders as string) || ''}
          onChange={(e) => onChange('requestHeaders', e.target.value)}
          placeholder='{"Content-Type": "application/json", "Authorization": "Bearer {token}"}'
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="requestCookies">Cookies（可选）</Label>
        <textarea
          id="requestCookies"
          className="w-full min-h-[60px] px-3 py-2 text-sm rounded-md border border-input bg-background font-mono text-xs"
          value={(data.requestCookies as string) || ''}
          onChange={(e) => onChange('requestCookies', e.target.value)}
          placeholder={'JSON格式：{"session": "abc123"}\n或键值对：session=abc123; token=xyz'}
        />
        <p className="text-xs text-muted-foreground">
          支持 JSON 格式或 <code>key=value; key2=value2</code> 格式，支持变量引用
        </p>
      </div>
      {hasBody && (
        <div className="space-y-2">
          <Label htmlFor="requestBody">请求体（可选）</Label>
          <textarea
            id="requestBody"
            className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background font-mono text-xs"
            value={(data.requestBody as string) || ''}
            onChange={(e) => onChange('requestBody', e.target.value)}
            placeholder='{"key": "value", "name": "{变量名}"}'
          />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="variableName">存储响应到变量</Label>
        <VariableNameInput
          id="variableName"
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="变量名（存储完整响应 JSON）"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="requestTimeout">超时时间（秒）</Label>
        <NumberInput
          id="requestTimeout"
          value={(data.requestTimeout as number) ?? 30}
          onChange={(v) => onChange('requestTimeout', v)}
          defaultValue={30}
          min={1}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        发送 HTTP 请求并将响应存储到变量，可配合 JSON 解析模块提取数据
      </p>
    </>
  )
}

// AI智能爬虫配置
export function AISmartScraperConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  const llmProvider = (data.llmProvider as string) || 'ollama'
  
  return (
    <>
      <div className="p-3 bg-red-50 border-2 border-red-300 rounded-lg mb-4">
        <p className="text-sm text-red-900 font-semibold mb-2">
          实验性功能 - 不推荐生产使用
        </p>
        <p className="text-xs text-red-800 space-y-1">
          <strong>已知问题：</strong><br />
          • 速度极慢（10-30秒），成本高（消耗 API 额度）<br />
          • 准确率低，经常返回错误或无用的分析文本<br />
          • 对复杂网页效果差，容易理解错误<br />
          <br />
          <strong>适用场景：</strong><br />
          • 仅适合提取文章内容、大段文本<br />
          • 不适合结构化数据提取<br />
          • 不适合需要快速响应的场景<br />
          <br />
          <strong>推荐：</strong>使用传统的"获取元素列表"等模块，更快更准确
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="url">目标网页URL</Label>
        <VariableInput
          value={(data.url as string) || ''}
          onChange={(v) => onChange('url', v)}
          placeholder="https://example.com，支持 {变量名}"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="prompt">提取提示词</Label>
        <VariableInput
          value={(data.prompt as string) || ''}
          onChange={(v) => onChange('prompt', v)}
          placeholder='示例：Extract top 10 items. Return JSON: [{"title": "...", "value": 123}]. No explanation.'
          multiline
          rows={4}
        />
        <p className="text-xs text-muted-foreground">
          <strong>重要：</strong>必须用英文，明确指定返回格式（JSON数组等），并强调"No explanation"
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="waitTime">页面加载等待时间 (秒)</Label>
        <NumberInput
          id="waitTime"
          value={(data.waitTime as number) ?? 3}
          onChange={(v) => onChange('waitTime', v)}
          defaultValue={3}
          min={0}
          max={30}
        />
        <p className="text-xs text-muted-foreground">
          访问网页后等待指定秒数再开始爬取，让页面有时间完全加载（推荐 3-5 秒）
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="variableName">存储结果到变量</Label>
        <VariableNameInput
          id="variableName"
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="变量名"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="llmProvider">LLM提供商</Label>
        <Select
          id="llmProvider"
          value={llmProvider}
          onChange={(e) => onChange('llmProvider', e.target.value)}
        >
          <option value="ollama">Ollama (本地免费)</option>
          <option value="openai">OpenAI</option>
          <option value="groq">Groq</option>
          <option value="gemini">Google Gemini</option>
          <option value="azure">Azure OpenAI</option>
          <option value="zhipu">智谱 AI (GLM)</option>
          <option value="deepseek">Deepseek</option>
          <option value="custom">自定义</option>
        </Select>
      </div>
      
      {llmProvider !== 'ollama' && (
        <div className="space-y-2">
          <Label htmlFor="apiUrl">API地址</Label>
          <VariableInput
            value={(data.apiUrl as string) || ''}
            onChange={(v) => onChange('apiUrl', v)}
            placeholder={
              llmProvider === 'openai' ? 'https://api.openai.com/v1' :
              llmProvider === 'zhipu' ? 'https://open.bigmodel.cn/api/paas/v4' :
              llmProvider === 'deepseek' ? 'https://api.deepseek.com' :
              llmProvider === 'groq' ? 'https://api.groq.com/openai/v1' :
              llmProvider === 'gemini' ? 'https://generativelanguage.googleapis.com/v1beta' :
              '自定义API地址，支持 {变量名}'
            }
          />
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="llmModel">模型名称</Label>
        <VariableInput
          value={(data.llmModel as string) || 'llama3.2'}
          onChange={(v) => onChange('llmModel', v)}
          placeholder={llmProvider === 'ollama' ? 'llama3.2' : 'gpt-4o-mini'}
        />
        <p className="text-xs text-muted-foreground">
          {llmProvider === 'ollama' 
            ? '本地模型，如 llama3.2、qwen2.5 等' 
            : '云端模型名称'}
        </p>
      </div>
      
      {llmProvider !== 'ollama' && (
        <div className="space-y-2">
          <Label htmlFor="apiKey">API Key</Label>
          <VariableInput
            value={(data.apiKey as string) || ''}
            onChange={(v) => onChange('apiKey', v)}
            placeholder="sk-xxx，支持 {变量名}"
          />
        </div>
      )}
      
      {llmProvider === 'azure' && (
        <div className="space-y-2">
          <Label htmlFor="azureEndpoint">Azure Endpoint</Label>
          <VariableInput
            value={(data.azureEndpoint as string) || ''}
            onChange={(v) => onChange('azureEndpoint', v)}
            placeholder="https://your-resource.openai.azure.com/"
          />
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="headless">无头模式</Label>
        <Select
          id="headless"
          value={String(data.headless ?? true)}
          onChange={(e) => onChange('headless', e.target.value === 'true')}
        >
          <option value="true">是（后台运行）</option>
          <option value="false">否（显示浏览器）</option>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="verbose">详细日志</Label>
        <Select
          id="verbose"
          value={String(data.verbose ?? false)}
          onChange={(e) => onChange('verbose', e.target.value === 'true')}
        >
          <option value="false">否</option>
          <option value="true">是</option>
        </Select>
      </div>
      
      <div className="bg-[hsl(var(--card))] p-3 border border-purple-200 rounded-lg">
        <p className="text-xs text-purple-900">
          <strong className="inline-flex items-center gap-1.5">
            <Bot className="w-3.5 h-3.5" />
            AI智能爬虫
          </strong><br/>
          • 优点：用自然语言描述即可提取数据，适应网页结构变化<br/>
          • 缺点：速度比传统爬虫慢，需要LLM支持<br/>
          • 推荐：使用Ollama本地运行，完全免费
        </p>
      </div>
    </>
  )
}

// AI智能元素选择器配置
export function AIElementSelectorConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  const llmProvider = (data.llmProvider as string) || 'ollama'
  
  return (
    <>
      <div className="p-3 bg-red-50 border-2 border-red-300 rounded-lg mb-4">
        <p className="text-sm text-red-900 font-semibold mb-2">
          实验性功能 - 不推荐生产使用
        </p>
        <p className="text-xs text-red-800 space-y-1">
          <strong>已知问题：</strong><br />
          • 准确率极低，经常找不到元素或返回错误选择器<br />
          • 对复杂网页效果差，容易被页面内容干扰<br />
          • 速度慢，成本高（消耗 API 额度）<br />
          <br />
          <strong>推荐：</strong>使用浏览器开发者工具（F12）手动获取选择器，更快更准确
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="url">目标网页URL</Label>
        <VariableInput
          value={(data.url as string) || ''}
          onChange={(v) => onChange('url', v)}
          placeholder="https://example.com，支持 {变量名}"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="elementDescription">元素描述</Label>
        <VariableInput
          value={(data.elementDescription as string) || ''}
          onChange={(v) => onChange('elementDescription', v)}
          placeholder="用自然语言描述要查找的元素，如：登录按钮、搜索输入框"
          multiline
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          用自然语言描述你想找的页面元素（建议用英文，效果更好）
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="waitTime">页面加载等待时间 (秒)</Label>
        <NumberInput
          id="waitTime"
          value={(data.waitTime as number) ?? 3}
          onChange={(v) => onChange('waitTime', v)}
          defaultValue={3}
          min={0}
          max={30}
        />
        <p className="text-xs text-muted-foreground">
          访问网页后等待指定秒数再开始分析，让页面有时间完全加载（推荐 3-5 秒）
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="variableName">存储选择器到变量</Label>
        <VariableNameInput
          id="variableName"
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="变量名"
        />
        <p className="text-xs text-muted-foreground">
          AI找到的CSS选择器将保存到此变量
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="llmProvider">LLM提供商</Label>
        <Select
          id="llmProvider"
          value={llmProvider}
          onChange={(e) => onChange('llmProvider', e.target.value)}
        >
          <option value="ollama">Ollama (本地免费)</option>
          <option value="openai">OpenAI</option>
          <option value="groq">Groq</option>
          <option value="gemini">Google Gemini</option>
          <option value="azure">Azure OpenAI</option>
          <option value="zhipu">智谱 AI (GLM)</option>
          <option value="deepseek">Deepseek</option>
          <option value="custom">自定义</option>
        </Select>
      </div>
      
      {llmProvider !== 'ollama' && (
        <div className="space-y-2">
          <Label htmlFor="apiUrl">API地址</Label>
          <VariableInput
            value={(data.apiUrl as string) || ''}
            onChange={(v) => onChange('apiUrl', v)}
            placeholder={
              llmProvider === 'openai' ? 'https://api.openai.com/v1' :
              llmProvider === 'zhipu' ? 'https://open.bigmodel.cn/api/paas/v4' :
              llmProvider === 'deepseek' ? 'https://api.deepseek.com' :
              llmProvider === 'groq' ? 'https://api.groq.com/openai/v1' :
              llmProvider === 'gemini' ? 'https://generativelanguage.googleapis.com/v1beta' :
              '自定义API地址，支持 {变量名}'
            }
          />
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="llmModel">模型名称</Label>
        <VariableInput
          value={(data.llmModel as string) || 'llama3.2'}
          onChange={(v) => onChange('llmModel', v)}
          placeholder={llmProvider === 'ollama' ? 'llama3.2' : 'gpt-4o-mini'}
        />
        <p className="text-xs text-muted-foreground">
          {llmProvider === 'ollama' 
            ? '本地模型，如 llama3.2、qwen2.5 等' 
            : '云端模型名称'}
        </p>
      </div>
      
      {llmProvider !== 'ollama' && (
        <div className="space-y-2">
          <Label htmlFor="apiKey">API Key</Label>
          <VariableInput
            value={(data.apiKey as string) || ''}
            onChange={(v) => onChange('apiKey', v)}
            placeholder="sk-xxx，支持 {变量名}"
          />
        </div>
      )}
      
      {llmProvider === 'azure' && (
        <div className="space-y-2">
          <Label htmlFor="azureEndpoint">Azure Endpoint</Label>
          <VariableInput
            value={(data.azureEndpoint as string) || ''}
            onChange={(v) => onChange('azureEndpoint', v)}
            placeholder="https://your-resource.openai.azure.com/"
          />
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="verbose">详细日志</Label>
        <Select
          id="verbose"
          value={String(data.verbose ?? false)}
          onChange={(e) => onChange('verbose', e.target.value === 'true')}
        >
          <option value="false">否</option>
          <option value="true">是</option>
        </Select>
      </div>
      
      <div className="bg-[hsl(var(--card))] p-3 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-900">
          <strong>AI智能元素选择器</strong><br/>
          • 优点：即使网页结构变化，也能准确找到元素<br />
          • 使用场景：网站频繁改版、选择器不稳定<br />
          • 工作原理：AI 访问指定 URL，分析页面后返回匹配元素的 CSS 选择器<br />
          • 推荐：使用Ollama本地运行，完全免费
        </p>
      </div>
    </>
  )
}


// Firecrawl AI 单页数据抓取配置
export function FirecrawlScrapeConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="url">目标URL</Label>
        <VariableInput
          value={(data.url as string) || ''}
          onChange={(v) => onChange('url', v)}
          placeholder="https://example.com，支持 {变量名}"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="variableName">存储结果到变量</Label>
        <VariableNameInput
          id="variableName"
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="scrape_result"
          isStorageVariable={true}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="formats">返回格式</Label>
        <div className="space-y-1">
          <label className="flex items-center gap-2">
            <Checkbox
              checked={(data.formats as string[] || ['markdown']).includes('markdown')}
              onCheckedChange={(c) => {
                const formats = (data.formats as string[] || ['markdown'])
                if (c) {
                  onChange('formats', [...formats, 'markdown'])
                } else {
                  onChange('formats', formats.filter(f => f !== 'markdown'))
                }
              }}
            />
            <span className="text-sm">Markdown</span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox
              checked={(data.formats as string[] || []).includes('html')}
              onCheckedChange={(c) => {
                const formats = (data.formats as string[] || ['markdown'])
                if (c) {
                  onChange('formats', [...formats, 'html'])
                } else {
                  onChange('formats', formats.filter(f => f !== 'html'))
                }
              }}
            />
            <span className="text-sm">HTML</span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox
              checked={(data.formats as string[] || []).includes('screenshot')}
              onCheckedChange={(c) => {
                const formats = (data.formats as string[] || ['markdown'])
                if (c) {
                  onChange('formats', [...formats, 'screenshot'])
                } else {
                  onChange('formats', formats.filter(f => f !== 'screenshot'))
                }
              }}
            />
            <span className="text-sm">Screenshot</span>
          </label>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="onlyMainContent">只提取主要内容</Label>
        <Select
          id="onlyMainContent"
          value={String(data.onlyMainContent ?? true)}
          onChange={(e) => onChange('onlyMainContent', e.target.value === 'true')}
        >
          <option value="true">是</option>
          <option value="false">否</option>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="includeTags">包含标签 (可选)</Label>
        <VariableInput
          value={(data.includeTags as string) || ''}
          onChange={(v) => onChange('includeTags', v)}
          placeholder="article, main, .content (逗号分隔)"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="excludeTags">排除标签 (可选)</Label>
        <VariableInput
          value={(data.excludeTags as string) || ''}
          onChange={(v) => onChange('excludeTags', v)}
          placeholder="nav, footer, .ads (逗号分隔)"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="waitFor">等待时间 (毫秒，可选)</Label>
        <VariableInput
          value={(data.waitFor as string) || ''}
          onChange={(v) => onChange('waitFor', v)}
          placeholder="3000"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="timeout">超时时间 (毫秒)</Label>
        <NumberInput
          id="timeout"
          value={(data.timeout as number) ?? 60000}
          onChange={(v) => onChange('timeout', v)}
          defaultValue={60000}
          min={1000}
        />
      </div>
      
      <div className="bg-[hsl(var(--card))] p-3 border border-orange-200 rounded-lg">
        <p className="text-xs text-orange-900">
          <strong>Firecrawl AI 单页数据抓取</strong><br/>
          • 智能提取网页结构化数据<br />
          • 支持 Markdown、HTML、截图等格式<br />
          • 自动处理 JavaScript 渲染<br />
          • 过滤广告和无关内容
        </p>
      </div>
    </>
  )
}

// Firecrawl AI 网站链接抓取配置
export function FirecrawlMapConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="url">目标URL</Label>
        <VariableInput
          value={(data.url as string) || ''}
          onChange={(v) => onChange('url', v)}
          placeholder="https://example.com，支持 {变量名}"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="variableName">存储链接列表到变量</Label>
        <VariableNameInput
          id="variableName"
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="map_result"
          isStorageVariable={true}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="search">搜索关键词 (可选)</Label>
        <VariableInput
          value={(data.search as string) || ''}
          onChange={(v) => onChange('search', v)}
          placeholder="只返回包含关键词的链接，支持 {变量名}"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="limit">链接数量限制</Label>
        <NumberInput
          id="limit"
          value={(data.limit as number) ?? 5000}
          onChange={(v) => onChange('limit', v)}
          defaultValue={5000}
          min={1}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="ignoreSitemap">忽略 Sitemap</Label>
        <Select
          id="ignoreSitemap"
          value={String(data.ignoreSitemap ?? false)}
          onChange={(e) => onChange('ignoreSitemap', e.target.value === 'true')}
        >
          <option value="false">否</option>
          <option value="true">是</option>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="includeSubdomains">包含子域名</Label>
        <Select
          id="includeSubdomains"
          value={String(data.includeSubdomains ?? false)}
          onChange={(e) => onChange('includeSubdomains', e.target.value === 'true')}
        >
          <option value="false">否</option>
          <option value="true">是</option>
        </Select>
      </div>
      
      <div className="bg-[hsl(var(--card))] p-3 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-900">
          <strong>🗺️ Firecrawl AI 网站链接抓取</strong><br/>
          • 智能发现网站的所有链接<br />
          • 可用于构建网站地图<br />
          • 支持关键词过滤<br />
          • 返回链接数组，可配合循环使用
        </p>
      </div>
    </>
  )
}

// Firecrawl AI 全站数据抓取配置
export function FirecrawlCrawlConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="url">目标URL</Label>
        <VariableInput
          value={(data.url as string) || ''}
          onChange={(v) => onChange('url', v)}
          placeholder="https://example.com，支持 {变量名}"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="variableName">存储结果到变量</Label>
        <VariableNameInput
          id="variableName"
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="crawl_result"
          isStorageVariable={true}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="maxDepth">最大爬取深度</Label>
        <NumberInput
          id="maxDepth"
          value={(data.maxDepth as number) ?? 2}
          onChange={(v) => onChange('maxDepth', v)}
          defaultValue={2}
          min={1}
          max={10}
        />
        <p className="text-xs text-muted-foreground">
          深度越大，爬取的页面越多，耗时越长
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="limit">页面数量限制</Label>
        <NumberInput
          id="limit"
          value={(data.limit as number) ?? 100}
          onChange={(v) => onChange('limit', v)}
          defaultValue={100}
          min={1}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="includePaths">包含路径 (可选)</Label>
        <VariableInput
          value={(data.includePaths as string) || ''}
          onChange={(v) => onChange('includePaths', v)}
          placeholder="/blog, /docs (逗号分隔)"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="excludePaths">排除路径 (可选)</Label>
        <VariableInput
          value={(data.excludePaths as string) || ''}
          onChange={(v) => onChange('excludePaths', v)}
          placeholder="/admin, /login (逗号分隔)"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="formats">返回格式</Label>
        <div className="space-y-1">
          <label className="flex items-center gap-2">
            <Checkbox
              checked={(data.formats as string[] || ['markdown']).includes('markdown')}
              onCheckedChange={(c) => {
                const formats = (data.formats as string[] || ['markdown'])
                if (c) {
                  onChange('formats', [...formats, 'markdown'])
                } else {
                  onChange('formats', formats.filter(f => f !== 'markdown'))
                }
              }}
            />
            <span className="text-sm">Markdown</span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox
              checked={(data.formats as string[] || []).includes('html')}
              onCheckedChange={(c) => {
                const formats = (data.formats as string[] || ['markdown'])
                if (c) {
                  onChange('formats', [...formats, 'html'])
                } else {
                  onChange('formats', formats.filter(f => f !== 'html'))
                }
              }}
            />
            <span className="text-sm">HTML</span>
          </label>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="onlyMainContent">只提取主要内容</Label>
        <Select
          id="onlyMainContent"
          value={String(data.onlyMainContent ?? true)}
          onChange={(e) => onChange('onlyMainContent', e.target.value === 'true')}
        >
          <option value="true">是</option>
          <option value="false">否</option>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="ignoreSitemap">忽略 Sitemap</Label>
        <Select
          id="ignoreSitemap"
          value={String(data.ignoreSitemap ?? false)}
          onChange={(e) => onChange('ignoreSitemap', e.target.value === 'true')}
        >
          <option value="false">否</option>
          <option value="true">是</option>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="allowBackwardLinks">允许回退链接</Label>
        <Select
          id="allowBackwardLinks"
          value={String(data.allowBackwardLinks ?? false)}
          onChange={(e) => onChange('allowBackwardLinks', e.target.value === 'true')}
        >
          <option value="false">否</option>
          <option value="true">是</option>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="allowExternalLinks">允许外部链接</Label>
        <Select
          id="allowExternalLinks"
          value={String(data.allowExternalLinks ?? false)}
          onChange={(e) => onChange('allowExternalLinks', e.target.value === 'true')}
        >
          <option value="false">否</option>
          <option value="true">是</option>
        </Select>
      </div>
      
      <div className="bg-[hsl(var(--card))] p-3 border border-purple-200 rounded-lg">
        <p className="text-xs text-purple-900">
          <strong>🕷️ Firecrawl AI 全站数据抓取</strong><br/>
          • 智能爬取整个网站的数据<br />
          • 支持深度爬取和智能过滤<br />
          • 自动处理分页和动态加载<br />
          • 注意：全站爬取可能需要几分钟
        </p>
      </div>
    </>
  )
}


// ============================================================
// AI 数据处理任务（抽取/分类/摘要/翻译/情感）通用配置面板
// 复用全局 AI 模型选择 + API 字段，按 moduleType 渲染任务专属字段。
// ============================================================
function AITaskApiBlock({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <AIModelPicker data={data} onChange={onChange} />
      <div className="space-y-2">
        <Label htmlFor="apiUrl">API地址</Label>
        <VariableInput
          value={(data.apiUrl as string) || ''}
          onChange={(v) => onChange('apiUrl', v)}
          placeholder="https://api.openai.com/v1/chat/completions，支持 {变量名}"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="apiKey">API密钥</Label>
        <VariableInput
          value={(data.apiKey as string) || ''}
          onChange={(v) => onChange('apiKey', v)}
          placeholder="sk-xxx，支持 {变量名}"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="model">模型名称</Label>
        <VariableInput
          value={(data.model as string) || ''}
          onChange={(v) => onChange('model', v)}
          placeholder="gpt-3.5-turbo / glm-4 / deepseek-chat，支持 {变量名}"
        />
      </div>
    </>
  )
}

export function AITaskConfig({ moduleType, data, onChange }: { moduleType: string; data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-3">
      {moduleType === 'ai_dedup_semantic' ? (
        <div className="space-y-2">
          <Label htmlFor="inputList">待去重列表</Label>
          <VariableInput
            multiline
            rows={4}
            value={(data.inputList as string) || ''}
            onChange={(v) => onChange('inputList', v)}
            placeholder='数组变量 {list} 或 JSON 数组 ["苹果手机","iPhone",...]（建议≤300项）'
          />
          <p className="text-xs text-muted-foreground">会合并语义相同但表达不同的项，保留首个；结果为去重后数组。</p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="inputText">输入文本</Label>
          <VariableInput
            multiline
            rows={4}
            value={(data.inputText as string) || ''}
            onChange={(v) => onChange('inputText', v)}
            placeholder="要处理的文本，支持 {变量名}（如 {data}、{ai_response}）"
          />
        </div>
      )}

      {moduleType === 'ai_extract' && (
        <div className="space-y-2">
          <Label htmlFor="fields">要抽取的字段</Label>
          <VariableInput
            value={(data.fields as string) || ''}
            onChange={(v) => onChange('fields', v)}
            placeholder='如 姓名,电话,地址  或  {"name":"姓名","price":"价格(数字)"}'
          />
          <p className="text-xs text-muted-foreground">逗号分隔字段名，或用 JSON 描述每个字段含义。结果为 JSON 对象。</p>
        </div>
      )}

      {moduleType === 'ai_classify' && (
        <div className="space-y-2">
          <Label htmlFor="categories">候选类别</Label>
          <VariableInput
            value={(data.categories as string) || ''}
            onChange={(v) => onChange('categories', v)}
            placeholder="如 投诉,咨询,好评,其他（逗号分隔，至少两个）"
          />
          <p className="text-xs text-muted-foreground">结果为命中的类别名（字符串）。</p>
        </div>
      )}

      {moduleType === 'ai_summarize' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="maxWords">摘要最大字数</Label>
            <NumberInput
              id="maxWords"
              value={(data.maxWords as number) ?? 200}
              onChange={(v) => onChange('maxWords', v)}
              defaultValue={200}
              min={20}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="style">风格要求（可选）</Label>
            <VariableInput
              value={(data.style as string) || ''}
              onChange={(v) => onChange('style', v)}
              placeholder="如 要点列表 / 一句话 / 商务正式"
            />
          </div>
        </>
      )}

      {moduleType === 'ai_translate' && (
        <div className="space-y-2">
          <Label htmlFor="targetLang">目标语言</Label>
          <VariableInput
            value={(data.targetLang as string) || ''}
            onChange={(v) => onChange('targetLang', v)}
            placeholder="如 英文 / 日文 / 法文 / 中文"
          />
        </div>
      )}

      {moduleType === 'ai_normalize' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="normalizeType">规整类型</Label>
            <Select
              value={(data.normalizeType as string) || 'date'}
              onChange={(e) => onChange('normalizeType', e.target.value)}
            >
              <option value="date">日期/时间 → 标准格式</option>
              <option value="money">金额 → 纯数字</option>
              <option value="phone">电话 → 标准格式</option>
              <option value="number">数值 → 纯数字</option>
              <option value="name">人名规整</option>
              <option value="address">地址规整</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="targetFormat">自定义目标格式（可选）</Label>
            <VariableInput
              value={(data.targetFormat as string) || ''}
              onChange={(v) => onChange('targetFormat', v)}
              placeholder="如 YYYY-MM-DD HH:mm:ss；留空用该类型默认格式"
            />
          </div>
        </>
      )}

      {moduleType === 'ai_route' && (
        <div className="space-y-2">
          <Label htmlFor="routes">分支选项</Label>
          <VariableInput
            multiline
            rows={4}
            value={(data.routes as string) || ''}
            onChange={(v) => onChange('routes', v)}
            placeholder={'每行一个，名称:说明，例如\n退款:用户要求退钱\n咨询:用户询问信息\n投诉:用户表达不满'}
          />
          <p className="text-xs text-muted-foreground">结果为命中的分支名（字符串）；后接「条件分支」按它路由。</p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="variableName">存储到变量</Label>
        <VariableNameInput
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="结果变量名"
          isStorageVariable={true}
        />
      </div>

      <details className="rounded-lg border border-[hsl(var(--border))] p-2">
        <summary className="text-sm cursor-pointer select-none text-[hsl(var(--muted-foreground))]">AI 接口设置（默认取全局 AI 配置）</summary>
        <div className="space-y-2 mt-2">
          <AITaskApiBlock data={data} onChange={onChange} />
        </div>
      </details>
    </div>
  )
}

// AI视觉操作配置（看屏点选，不依赖选择器）
export function AIVisionActConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  const action = (data.action as string) || 'click'
  const needButton = action === 'click' || action === 'double'
  return (
    <>
      <AIModelPicker data={data} onChange={onChange} />
      <div className="space-y-2">
        <Label htmlFor="apiUrl">API地址</Label>
        <VariableInput
          value={(data.apiUrl as string) || ''}
          onChange={(v) => onChange('apiUrl', v)}
          placeholder="https://open.bigmodel.cn/api/paas/v4/chat/completions，支持 {变量名}"
        />
        <p className="text-xs text-muted-foreground">需支持坐标定位的视觉模型（如 GLM-4V、UI-TARS、GPT-4o）</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="apiKey">API密钥</Label>
        <VariableInput
          value={(data.apiKey as string) || ''}
          onChange={(v) => onChange('apiKey', v)}
          placeholder="API密钥，支持 {变量名}"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="model">模型名称</Label>
        <VariableInput
          value={(data.model as string) || ''}
          onChange={(v) => onChange('model', v)}
          placeholder="glm-4v / ui-tars / gpt-4o，支持 {变量名}"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="instruction">目标描述</Label>
        <VariableInput
          value={(data.instruction as string) || ''}
          onChange={(v) => onChange('instruction', v)}
          placeholder="用自然语言描述要点击的目标，如：右上角的登录按钮"
          multiline
          rows={3}
        />
        <p className="text-xs text-muted-foreground">AI 会截取当前屏幕，根据描述定位目标并返回坐标。</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="action">执行动作</Label>
        <Select
          id="action"
          value={action}
          onChange={(e) => onChange('action', e.target.value)}
        >
          <option value="click">单击</option>
          <option value="double">双击</option>
          <option value="right">右键单击</option>
          <option value="move">仅移动鼠标</option>
          <option value="locate">仅定位（不操作，返回坐标）</option>
        </Select>
      </div>
      {needButton && (
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
      )}

      <div className="space-y-2">
        <Label htmlFor="variableName">存储坐标到变量</Label>
        <VariableNameInput
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="结果变量名，存储 {x, y} 坐标"
          isStorageVariable={true}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="maxTokens">最大Token数</Label>
        <NumberInput
          id="maxTokens"
          value={(data.maxTokens as number) ?? 300}
          onChange={(v) => onChange('maxTokens', v)}
          defaultValue={300}
          min={1}
        />
      </div>
      <div className="p-3 bg-violet-50 border border-violet-200 rounded-lg">
        <p className="text-xs text-violet-800">
          <strong>AI视觉操作</strong>让 AI 直接"看屏幕"定位目标并真实点击，无需任何选择器。<br/>
          • 适合 Canvas、图片按钮、防自动化页面等取不到选择器的场景<br/>
          • 操作的是整个桌面屏幕（物理鼠标），请确保目标窗口在前台
        </p>
      </div>
    </>
  )
}
