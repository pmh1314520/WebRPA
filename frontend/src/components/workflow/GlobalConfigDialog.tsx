import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectNative } from '@/components/ui/select-native'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Radio } from '@/components/ui/radio-group'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { DialogPortal } from '@/components/ui/dialog-portal'
import { useGlobalConfigStore, type BrowserType, type AIModelProfile, type AssistantScene } from '@/store/globalConfigStore'
import { X, Settings, Brain, Mail, RotateCcw, Folder, Loader2, Database, Monitor, Globe, Zap, MessageCircle, MessageSquare, Plus, Trash2, Bot, Check, Plug, Cpu, ShieldCheck, KeyRound, HardDrive } from 'lucide-react'
import { systemApi, securityApi, getAuthToken, setAuthToken, credentialApi, retentionApi, type CredentialItem, type RetentionConfig, type RetentionUsage } from '@/services/api'
import { aiAssistantApi } from '@/services/aiAssistantApi'
import { getBackendBaseUrl } from '@/services/config'
import { MCPConfigPanel } from './MCPConfigPanel'
import { SHORTCUT_ACTIONS, eventToCombo } from '@/lib/customShortcuts'
import { WebDAVSettings } from './WebDAVSettings'
import { getLang, setLang as setEditorLang } from '@/lib/uiI18n'

const SCENE_LABELS: { key: AssistantScene; label: string }[] = [
  { key: 'vision', label: '多模态' },
  { key: 'thinking', label: '深度思考' },
  { key: 'chat', label: '普通对话' },
]

function genModelId() {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

/** 多模型档案管理器（小助手 / AI对话 共用）。showScenes=true 时显示场景分组 */
function ModelProfilesManager({
  models, activeModelId, showScenes, onChange,
}: {
  models: AIModelProfile[]
  activeModelId?: string
  showScenes?: boolean
  onChange: (patch: { models?: AIModelProfile[]; activeModelId?: string }) => void
}) {
  const list = models || []
  const update = (id: string, patch: Partial<AIModelProfile>) => {
    onChange({ models: list.map((m) => m.id === id ? { ...m, ...patch } : m) })
  }
  const remove = (id: string) => {
    const next = list.filter((m) => m.id !== id)
    onChange({ models: next, activeModelId: activeModelId === id ? next[0]?.id : activeModelId })
  }
  const add = () => {
    const m: AIModelProfile = { id: genModelId(), label: '', apiUrl: '', apiKey: '', model: '', scenes: showScenes ? ['chat'] : undefined }
    onChange({ models: [...list, m], activeModelId: activeModelId || m.id })
  }
  const toggleScene = (id: string, s: AssistantScene) => {
    const m = list.find((x) => x.id === id)
    if (!m) return
    const cur = new Set(m.scenes || [])
    if (cur.has(s)) cur.delete(s); else cur.add(s)
    update(id, { scenes: Array.from(cur) })
  }
  return (
    <div className="space-y-3">
      {list.length === 0 && (
        <p className="text-xs text-gray-500">还没有添加模型。点下方「添加模型」可配置多个模型（同/不同厂商均可），聊天时一键切换或自动切换。</p>
      )}
      {list.map((m, idx) => (
        <div key={m.id} className="p-3 rounded-lg border border-gray-200 bg-gray-50 space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-blue-100 text-blue-700 text-xs font-bold flex-shrink-0">{idx + 1}</span>
            <Input value={m.label} onChange={(e) => update(m.id, { label: e.target.value })} placeholder="显示名（如 GPT-4o / DeepSeek）" className="bg-white text-black border-gray-300 h-8 text-sm" />
            <label className="flex items-center gap-1 text-xs text-gray-600 whitespace-nowrap cursor-pointer">
              <Radio checked={activeModelId === m.id} onSelect={() => onChange({ activeModelId: m.id })} />
              默认
            </label>
            <button onClick={() => remove(m.id)} className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50" title="删除"><Trash2 className="w-4 h-4" /></button>
          </div>
          <Input value={m.apiUrl} onChange={(e) => update(m.id, { apiUrl: e.target.value })} placeholder="API 地址 https://api.openai.com/v1" className="bg-white text-black border-gray-300 h-8 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <Input type="password" value={m.apiKey} onChange={(e) => update(m.id, { apiKey: e.target.value })} placeholder="API 密钥 sk-xxx" className="bg-white text-black border-gray-300 h-8 text-sm" />
            <Input value={m.model} onChange={(e) => update(m.id, { model: e.target.value })} placeholder="模型名 gpt-4o-mini" className="bg-white text-black border-gray-300 h-8 text-sm" />
          </div>
          {showScenes && (
            <div className="flex items-center gap-3 pt-0.5">
              <span className="text-xs text-gray-500">适用场景：</span>
              {SCENE_LABELS.map((s) => (
                <label key={s.key} className="flex items-center gap-1 text-xs text-gray-700 cursor-pointer">
                  <Checkbox checked={(m.scenes || []).includes(s.key)} onCheckedChange={() => toggleScene(m.id, s.key)} className="h-3.5 w-3.5" />
                  {s.label}
                </label>
              ))}
            </div>
          )}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add} className="border-gray-300 text-gray-700 hover:bg-gray-100">
        <Plus className="w-4 h-4 mr-1" /> 添加模型
      </Button>
    </div>
  )
}


// 访问鉴权设置面板（本机查看/重置 Token、开关鉴权；远程访问填入 Token）
function SecuritySettings() {
  const [enabled, setEnabled] = useState(true)
  const [isLocal, setIsLocal] = useState(true)
  const [token, setToken] = useState<string | null>(null)
  const [manualToken, setManualToken] = useState(getAuthToken())
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const refresh = async () => {
    const res = await securityApi.status()
    if (res.data) {
      setEnabled(res.data.enabled)
      setIsLocal(res.data.isLocal)
      setToken(res.data.token)
    }
  }
  useEffect(() => { refresh() }, [])

  const toggle = async (v: boolean) => {
    setLoading(true)
    try { await securityApi.toggle(v); await refresh() } finally { setLoading(false) }
  }
  const regen = async () => {
    setLoading(true)
    try { const r = await securityApi.regenerate(); if (r.data?.token) setToken(r.data.token); await refresh() } finally { setLoading(false) }
  }
  const copy = async () => {
    if (!token) return
    try { await navigator.clipboard.writeText(token); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* ignore */ }
  }
  const saveManual = () => { setAuthToken(manualToken.trim()); setCopied(true); setTimeout(() => setCopied(false), 1500) }

  return (
    <>
      <p className="text-xs text-gray-500 mb-4">
        后端默认监听局域网。开启鉴权后：<strong>本机访问免验</strong>，其它设备访问需携带访问令牌（Token），保护文件共享 / 远程控制 / 命令执行等高危能力。
      </p>
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div>
            <Label className="text-gray-700 font-medium">启用访问鉴权</Label>
            <p className="text-xs text-gray-500 mt-1">关闭后局域网内任意设备可无凭据访问全部接口（不推荐）</p>
          </div>
          <Switch checked={enabled} disabled={loading || !isLocal} onCheckedChange={(c) => toggle(c)} />
        </div>

        {isLocal ? (
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
            <Label className="text-gray-700 font-medium">访问令牌（仅本机可见）</Label>
            <div className="flex items-center gap-2">
              <Input readOnly value={token || ''} className="bg-white text-black border-gray-300 font-mono text-xs" />
              <Button type="button" variant="outline" size="sm" onClick={copy} className="border-gray-300 text-gray-700 whitespace-nowrap">
                {copied ? <Check className="w-4 h-4" /> : '复制'}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={regen} disabled={loading} className="border-gray-300 text-gray-700 whitespace-nowrap">
                <RotateCcw className="w-3.5 h-3.5 mr-1" />重置
              </Button>
            </div>
            <p className="text-xs text-gray-500">从其它设备访问 WebRPA 时，在该设备的「安全」里粘贴此令牌即可。</p>
          </div>
        ) : (
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
            <Label className="text-gray-700 font-medium">访问令牌（远程访问需填写）</Label>
            <div className="flex items-center gap-2">
              <Input value={manualToken} onChange={(e) => setManualToken(e.target.value)} placeholder="粘贴在主机「安全」里看到的 Token" className="bg-white text-black border-gray-300 font-mono text-xs" />
              <Button type="button" variant="outline" size="sm" onClick={saveManual} className="border-gray-300 text-gray-700 whitespace-nowrap">
                {copied ? <Check className="w-4 h-4" /> : '保存'}
              </Button>
            </div>
            <p className="text-xs text-gray-500">令牌保存在本浏览器，后续请求会自动携带。</p>
          </div>
        )}
      </div>
    </>
  )
}


// 凭据库设置面板：管理本地加密凭据（口令/API Key/数据库密码等），节点里用 {{cred:名称.字段}} 引用
function CredentialSettings() {
  const [list, setList] = useState<CredentialItem[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<{ name: string; description: string; fields: { key: string; value: string }[] } | null>(null)
  const { confirm, alert, ConfirmDialog } = useConfirm()

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await credentialApi.list()
      if (res.data?.credentials) setList(res.data.credentials)
    } finally { setLoading(false) }
  }
  useEffect(() => { refresh() }, [])

  const startNew = () => setEditing({ name: '', description: '', fields: [{ key: 'value', value: '' }] })
  const startEdit = (c: CredentialItem) => setEditing({
    name: c.name, description: c.description,
    // 编辑时字段值留空表示保留原值
    fields: c.fields.length ? c.fields.map(f => ({ key: f.key, value: '' })) : [{ key: 'value', value: '' }],
  })

  const save = async () => {
    if (!editing) return
    if (!editing.name.trim()) { await alert('请填写凭据名', { title: '提示' }); return }
    const fields: Record<string, string> = {}
    for (const f of editing.fields) {
      if (f.key.trim()) fields[f.key.trim()] = f.value
    }
    if (Object.keys(fields).length === 0) { await alert('至少需要一个字段', { title: '提示' }); return }
    const res = await credentialApi.upsert(editing.name.trim(), fields, editing.description)
    if (res.error) { await alert(`保存失败：${res.error}`, { title: '失败' }); return }
    setEditing(null)
    refresh()
  }

  const del = async (name: string) => {
    const ok = await confirm(`删除凭据「${name}」？引用它的工作流将无法解析。`, { type: 'warning', title: '删除凭据', confirmText: '删除', cancelText: '取消' })
    if (!ok) return
    await credentialApi.delete(name)
    refresh()
  }

  return (
    <>
      <p className="text-xs text-gray-500 mb-4">
        本地加密保存口令 / API Key / 数据库密码等敏感信息（Fernet 加密落盘）。在任意节点的字符串里用
        <code className="bg-gray-100 px-1 rounded mx-1">{'{{cred:名称}}'}</code> 或
        <code className="bg-gray-100 px-1 rounded mx-1">{'{{cred:名称.字段}}'}</code> 引用，运行时自动注入，工作流文件中不含明文。
      </p>
      {editing ? (
        <div className="space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-gray-700 text-xs">凭据名</Label>
              <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="如：我的邮箱" className="bg-white text-black border-gray-300 h-8 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-gray-700 text-xs">说明（可选）</Label>
              <Input value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="用途备注" className="bg-white text-black border-gray-300 h-8 text-sm mt-1" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-gray-700 text-xs">字段（字段名 → 值；编辑时留空表示保留原值）</Label>
            {editing.fields.map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input value={f.key} onChange={(e) => { const fs = [...editing.fields]; fs[i] = { ...fs[i], key: e.target.value }; setEditing({ ...editing, fields: fs }) }} placeholder="字段名 如 value/password/api_key" className="bg-white text-black border-gray-300 h-8 text-sm w-1/3" />
                <Input type="password" value={f.value} onChange={(e) => { const fs = [...editing.fields]; fs[i] = { ...fs[i], value: e.target.value }; setEditing({ ...editing, fields: fs }) }} placeholder="值" className="bg-white text-black border-gray-300 h-8 text-sm flex-1" />
                <button onClick={() => setEditing({ ...editing, fields: editing.fields.filter((_, j) => j !== i) })} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setEditing({ ...editing, fields: [...editing.fields, { key: '', value: '' }] })} className="border-gray-300 text-gray-700 hover:bg-gray-100">
              <Plus className="w-4 h-4 mr-1" />添加字段
            </Button>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setEditing(null)} className="border-gray-300 text-gray-700">取消</Button>
            <Button type="button" size="sm" onClick={save}>保存</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Button type="button" variant="outline" size="sm" onClick={startNew} className="border-gray-300 text-gray-700 hover:bg-gray-100"><Plus className="w-4 h-4 mr-1" />新增凭据</Button>
            <Button type="button" variant="outline" size="sm" onClick={refresh} disabled={loading} className="border-gray-300 text-gray-700"><RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /></Button>
          </div>
          {list.length === 0 ? (
            <p className="text-xs text-gray-400 py-8 text-center">还没有凭据，点「新增凭据」创建</p>
          ) : list.map((c) => (
            <div key={c.name} className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-start justify-between">
              <div className="min-w-0">
                <div className="font-medium text-sm text-black">{c.name}</div>
                {c.description && <div className="text-xs text-gray-500">{c.description}</div>}
                <div className="text-xs text-gray-400 mt-1 flex flex-wrap gap-1">
                  {c.fields.map(f => <span key={f.key} className="px-1.5 py-0.5 rounded bg-gray-100">{f.key}: {f.masked}</span>)}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button type="button" variant="outline" size="sm" onClick={() => startEdit(c)} className="border-gray-300 text-gray-700 h-7 px-2 text-xs">编辑</Button>
                <button onClick={() => del(c.name)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog />
    </>
  )
}

// 留存清理设置面板：录像/采集数据的自动滚动清理策略 + 手动清理
function RetentionSettings() {
  const [cfg, setCfg] = useState<RetentionConfig | null>(null)
  const [usage, setUsage] = useState<RetentionUsage | null>(null)
  const [saving, setSaving] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const { alert, ConfirmDialog } = useConfirm()

  const refresh = async () => {
    const res = await retentionApi.getConfig()
    if (res.data?.config) setCfg(res.data.config)
    if (res.data?.usage) setUsage(res.data.usage)
  }
  useEffect(() => { refresh() }, [])

  const save = async () => {
    if (!cfg) return
    setSaving(true)
    try {
      const res = await retentionApi.setConfig(cfg)
      if (res.data?.config) setCfg(res.data.config)
      await alert('已保存清理策略', { title: '成功' })
    } finally { setSaving(false) }
  }
  const cleanupNow = async () => {
    setCleaning(true)
    try {
      await retentionApi.cleanup()
      await refresh()
      await alert('清理完成', { title: '成功' })
    } finally { setCleaning(false) }
  }

  if (!cfg) return <div className="py-8 text-center text-gray-400"><Loader2 className="w-5 h-5 animate-spin inline" /></div>

  const numField = (label: string, key: keyof RetentionConfig, hint: string) => (
    <div>
      <Label className="text-gray-700 text-xs">{label}</Label>
      <Input type="number" min={0} value={cfg[key] as number} onChange={(e) => setCfg({ ...cfg, [key]: Number(e.target.value) })} className="bg-white text-black border-gray-300 h-8 text-sm mt-1" />
      <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>
    </div>
  )

  return (
    <>
      <p className="text-xs text-gray-500 mb-4">
        长期使用后运行录像与采集数据会占用磁盘。开启后按「保留天数」和「总大小上限」滚动清理（0 表示该维度不限制）。
      </p>
      {usage && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm text-black">运行录像：{usage.recordings.count} 个 · {usage.recordings.sizeMB} MB</div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm text-black">采集数据：{usage.data.count} 个 · {usage.data.sizeMB} MB</div>
        </div>
      )}
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
          <Label className="text-gray-700 font-medium">启用自动清理</Label>
          <Switch checked={cfg.enabled} onCheckedChange={(c) => setCfg({ ...cfg, enabled: c })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {numField('录像保留天数', 'recordings_max_days', '超过天数的录像会被删除')}
          {numField('录像总大小上限(MB)', 'recordings_max_total_mb', '超出后从最旧开始删')}
          {numField('数据保留天数', 'data_max_days', '超过天数的导出数据会被删除')}
          {numField('数据总大小上限(MB)', 'data_max_total_mb', '超出后从最旧开始删')}
          {numField('清理间隔(小时)', 'cleanup_interval_hours', '后台定时清理的间隔')}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={cleanupNow} disabled={cleaning} className="border-gray-300 text-gray-700">
            {cleaning ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 mr-1" />}立即清理一次
          </Button>
          <Button type="button" size="sm" onClick={save} disabled={saving}>{saving ? '保存中...' : '保存策略'}</Button>
        </div>
      </div>
      <ConfirmDialog />
    </>
  )
}


interface GlobalConfigDialogProps {
  isOpen: boolean
  onClose: () => void
}

type TabType = 'system' | 'ai' | 'aiAssistant' | 'mcp' | 'aiScraper' | 'email' | 'workflow' | 'database' | 'display' | 'browser' | 'triggers' | 'qq' | 'feishu' | 'security' | 'credentials' | 'retention'

// 浏览器选项
const browserOptions: { value: BrowserType; label: string; description: string }[] = [
  { value: 'msedge', label: 'Microsoft Edge', description: '启动系统安装的 Edge 浏览器（非系统默认浏览器）' },
  { value: 'chrome', label: 'Google Chrome', description: '启动系统安装的 Chrome 浏览器' },
  { value: 'chromium', label: 'Chromium', description: '启动 Chromium 浏览器（开源版本）' },
  { value: 'firefox', label: 'Firefox', description: '需要安装 Firefox 浏览器' },
]

export function GlobalConfigDialog({ isOpen, onClose }: GlobalConfigDialogProps) {
  const { 
    config, 
    updateSystemConfig,
    updateAIConfig, 
    updateAIScraperConfig, 
    updateAIAssistantConfig,
    updateEmailConfig, 
    updateEmailTriggerConfig,
    updateApiTriggerConfig,
    updateFileTriggerConfig,
    updateWorkflowConfig,
    updateShortcuts, 
    updateDatabaseConfig, 
    updateQQConfig,
    updateFeishuConfig,
    updateDisplayConfig, 
    updateBrowserConfig, 
    resetConfig 
  } = useGlobalConfigStore()
  const [activeTab, setActiveTab] = useState<TabType>('system')
  const [uiLang, setUiLang] = useState<'zh' | 'en'>(() => getLang())
  const [defaultFolder, setDefaultFolder] = useState<string>('')
  const [isSelectingFolder, setIsSelectingFolder] = useState(false)
  const [isSelectingBrowser, setIsSelectingBrowser] = useState(false)
  const [showBrowserConfigTip, setShowBrowserConfigTip] = useState(false)
  // 小助手「测试连接」状态
  const [assistantTest, setAssistantTest] = useState<{ status: 'idle' | 'testing' | 'ok' | 'fail'; message: string; detail?: string; latency?: number }>({ status: 'idle', message: '' })
  const { confirm, ConfirmDialog } = useConfirm()
  const browserConfigTipRef = useRef<HTMLDivElement>(null)

  // 获取默认文件夹路径
  useEffect(() => {
    if (isOpen) {
      const API_BASE = getBackendBaseUrl()
      fetch(`${API_BASE}/api/local-workflows/default-folder`)
        .then(res => res.json())
        .then(data => {
          if (data.folder) {
            setDefaultFolder(data.folder)
          }
        })
        .catch(console.error)
    }
  }, [isOpen])

  // 当提示框显示时，自动滚动到提示框位置
  useEffect(() => {
    if (showBrowserConfigTip && browserConfigTipRef.current) {
      // 使用 setTimeout 确保 DOM 已更新
      setTimeout(() => {
        browserConfigTipRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest' 
        })
      }, 100)
    }
  }, [showBrowserConfigTip])

  if (!isOpen) return null

  const handleReset = async () => {
    const confirmed = await confirm('确定要重置所有全局配置吗？', { type: 'warning', title: '重置配置' })
    if (confirmed) {
      resetConfig()
    }
  }

  // Tab 配置数组 - 统一管理样式与图标
  const tabConfig: Array<{
    id: typeof activeTab
    label: string
    Icon: typeof Settings
    accent: 'brand' | 'violet' | 'info' | 'success' | 'warning' | 'rose' | 'amber' | 'teal' | 'slate'
  }> = [
    { id: 'system',      label: '系统',     Icon: Settings,       accent: 'brand'   },
    { id: 'ai',          label: 'AI对话',   Icon: Brain,          accent: 'violet'  },
    { id: 'aiAssistant', label: '小助手',   Icon: Bot,            accent: 'brand'   },
    { id: 'mcp',         label: 'MCP',      Icon: Plug,           accent: 'violet'  },
    { id: 'aiScraper',   label: 'AI智能',   Icon: Brain,          accent: 'violet'  },
    { id: 'email',       label: '邮件',     Icon: Mail,           accent: 'info'    },
    { id: 'workflow',    label: '存储',     Icon: Folder,         accent: 'warning' },
    { id: 'database',    label: '数据库',   Icon: Database,       accent: 'teal'    },
    { id: 'display',     label: '显示',     Icon: Monitor,        accent: 'slate'   },
    { id: 'browser',     label: '浏览器',   Icon: Globe,          accent: 'success' },
    { id: 'triggers',    label: '触发器',   Icon: Zap,            accent: 'amber'   },
    { id: 'qq',          label: 'QQ号',     Icon: MessageCircle,  accent: 'brand'   },
    { id: 'feishu',      label: '飞书',     Icon: MessageSquare,  accent: 'info'    },
    { id: 'security',    label: '安全',     Icon: ShieldCheck,    accent: 'success' },
    { id: 'credentials', label: '凭据库',   Icon: KeyRound,       accent: 'warning' },
    { id: 'retention',   label: '留存清理', Icon: HardDrive,      accent: 'info'    },
  ]

  return (
    <DialogPortal>
    <div
      className="fixed inset-0 bg-[hsl(217_45%_15%_/_0.55)] backdrop-blur-[3px] flex items-center justify-center p-4 animate-fade-in"
      style={{ zIndex: 2147483646 }}
      onClick={onClose}
    >
      <div
        className="modern-dialog w-full max-w-4xl flex flex-col animate-scale-in-bounce"
        style={{ maxHeight: 'calc(100vh - 32px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="modern-dialog-header">
          <div className="modern-dialog-header-icon">
            <Settings className="w-5 h-5" strokeWidth={2.2} />
          </div>
          <div className="flex-1">
            <h3 className="modern-dialog-title">全局默认配置</h3>
            <div className="modern-dialog-subtitle">在这里调整 WebRPA 的工作行为与默认参数</div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[7px] text-[hsl(var(--slate-500))] hover:bg-[hsl(var(--danger-50))] hover:text-[hsl(var(--danger-600))] hover:border-[hsl(var(--danger-500)/0.3)] border border-transparent transition-all duration-150 active:scale-90"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 主体：左侧导航 + 右侧内容 */}
        <div className="flex flex-1 min-h-0">
          {/* 左侧导航 */}
          <nav className="w-44 flex-shrink-0 border-r border-[hsl(var(--border))] bg-[hsl(var(--slate-50)/0.5)] overflow-y-auto p-2 space-y-0.5">
            {tabConfig.map((tab) => {
              const isActive = activeTab === tab.id
              const Icon = tab.Icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] text-[12.5px] font-medium transition-[background-color,color,border-color,box-shadow] duration-150 ease-out border ${
                    isActive
                      ? '!bg-[hsl(var(--brand-600))] !text-white !border-[hsl(var(--brand-700))] shadow-brand-glow'
                      : '!bg-transparent !text-[hsl(var(--slate-700))] !border-transparent hover:!bg-[hsl(var(--card))] hover:!text-[hsl(var(--brand-700))] hover:!border-[hsl(var(--border))] hover:shadow-xs'
                  }`}
                >
                  <span
                    className={
                      isActive
                        ? 'inline-flex items-center justify-center w-7 h-7 rounded-[6px] bg-white/25 border border-white/40 shrink-0'
                        : `icon-chip icon-chip-${tab.accent} !w-7 !h-7`
                    }
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? '!text-white' : ''}`} />
                  </span>
                  <span className={`flex-1 text-left ${isActive ? '!text-white font-semibold' : ''}`}>
                    {tab.label}
                  </span>
                  {isActive && (
                    <span className="w-1 h-4 rounded-full bg-white/80 shrink-0" />
                  )}
                </button>
              )
            })}
          </nav>

          {/* 右侧内容区 */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-[400px]">
          {activeTab === 'system' && (
            <>
              <p className="text-xs text-gray-500 mb-4">
                配置系统相关的全局设置
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-1">
                    <Label className="text-sm font-medium text-gray-700">界面语言 / Language</Label>
                    <p className="text-xs text-gray-500 mt-1">切换 WebRPA 编辑器界面的中英文显示 / Switch the editor UI language</p>
                  </div>
                  <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => { setUiLang('zh'); setEditorLang('zh') }}
                      className={`px-3 py-1.5 text-xs font-medium ${uiLang === 'zh' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >中文</button>
                    <button
                      type="button"
                      onClick={() => { setUiLang('en'); setEditorLang('en') }}
                      className={`px-3 py-1.5 text-xs font-medium ${uiLang === 'en' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >English</button>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-1">
                    <Label className="text-sm font-medium text-gray-700">启动时检查更新</Label>
                    <p className="text-xs text-gray-500 mt-1">
                      启动WebRPA时自动检查是否有新版本可用
                    </p>
                  </div>
                  <Switch
                    checked={config.system.checkUpdateOnStartup}
                    onCheckedChange={(c) => updateSystemConfig({ checkUpdateOnStartup: c })}
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-1">
                    <Label className="text-sm font-medium text-gray-700">自动识别剪贴板截图</Label>
                    <p className="text-xs text-gray-500 mt-1">
                      当剪贴板中有新截图时，自动弹出保存对话框
                    </p>
                  </div>
                  <Switch
                    checked={config.system.autoDetectClipboardScreenshot}
                    onCheckedChange={(c) => updateSystemConfig({ autoDetectClipboardScreenshot: c })}
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-1">
                    <Label className="text-sm font-medium text-gray-700">显示AI小助手入口</Label>
                    <p className="text-xs text-gray-500 mt-1">
                      在编辑器右下角显示AI小助手的浮动按钮（快捷键 Ctrl+K 不受影响）
                    </p>
                  </div>
                  <Switch
                    checked={config.system.showAIAssistantButton}
                    onCheckedChange={(c) => updateSystemConfig({ showAIAssistantButton: c })}
                  />
                </div>

                {/* 画布小组件显示开关 */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="mb-3">
                    <Label className="text-sm font-medium text-gray-700">画布小组件</Label>
                    <p className="text-xs text-gray-500 mt-1">控制画布周围辅助小组件的显示与隐藏（默认全部显示）</p>
                  </div>
                  <div className="space-y-2.5">
                    {([
                      ['moduleCount', '模块数量'],
                      ['moduleSearch', '画布模块搜索'],
                      ['controlsHelp', '操作说明'],
                      ['minimap', '画布概览（缩略图）'],
                      ['controls', '画布操作（缩放控制）'],
                      ['viewSwitch', '流程图 / 模块条切换'],
                    ] as const).map(([key, label]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-[13px] text-gray-600">{label}</span>
                        <Switch
                          checked={config.system.canvasWidgets?.[key] !== false}
                          onCheckedChange={(c) => updateSystemConfig({ canvasWidgets: { ...config.system.canvasWidgets, [key]: c } })}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* 自定义快捷键 */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="mb-3">
                    <Label className="text-sm font-medium text-gray-700">自定义快捷键</Label>
                    <p className="text-xs text-gray-500 mt-1">点击输入框后按下想要的组合键即可绑定常用功能（不影响内置快捷键）。按 Esc 或点「清除」可解绑。</p>
                  </div>
                  <div className="space-y-2">
                    {SHORTCUT_ACTIONS.map((act) => {
                      const combo = (config.shortcuts || {})[act.id] || ''
                      return (
                        <div key={act.id} className="flex items-center justify-between gap-2">
                          <span className="text-[13px] text-gray-600 flex-1 min-w-0 truncate">{act.label}</span>
                          <input
                            readOnly
                            value={combo}
                            placeholder="点击后按组合键"
                            onKeyDown={(e) => {
                              e.preventDefault()
                              if (e.key === 'Escape') { updateShortcuts({ [act.id]: '' }); return }
                              const c = eventToCombo(e.nativeEvent)
                              if (c) updateShortcuts({ [act.id]: c })
                            }}
                            className="w-40 px-2 py-1 text-[12px] text-center font-mono rounded border border-gray-300 bg-white text-black cursor-pointer focus:border-blue-500 focus:ring-1 focus:ring-blue-300 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => updateShortcuts({ [act.id]: '' })}
                            className="text-[11px] text-gray-400 hover:text-red-500 px-1"
                          >清除</button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'ai' && (
            <>
              <p className="text-xs text-gray-500 mb-4">
                配置AI对话模块的默认值，新建模块时将自动填充这些配置
              </p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">默认API地址</Label>
                  <Input
                    value={config.ai.apiUrl}
                    onChange={(e) => updateAIConfig({ apiUrl: e.target.value })}
                    placeholder="https://api.openai.com/v1/chat/completions"
                    className="bg-white text-black border-gray-300"
                  />
                  <p className="text-xs text-gray-500">
                    智谱: https://open.bigmodel.cn/api/paas/v4/chat/completions<br/>
                    Deepseek: https://api.deepseek.com/chat/completions
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">默认API密钥</Label>
                  <Input
                    type="password"
                    value={config.ai.apiKey}
                    onChange={(e) => updateAIConfig({ apiKey: e.target.value })}
                    placeholder="sk-xxx"
                    className="bg-white text-black border-gray-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">默认模型名称</Label>
                  <Input
                    value={config.ai.model}
                    onChange={(e) => updateAIConfig({ model: e.target.value })}
                    placeholder="gpt-3.5-turbo / glm-4 / deepseek-chat"
                    className="bg-white text-black border-gray-300"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-700">默认温度</Label>
                    <Input
                      type="number"
                      min={0}
                      max={2}
                      step={0.1}
                      value={config.ai.temperature}
                      onChange={(e) => updateAIConfig({ temperature: parseFloat(e.target.value) || 0.7 })}
                      className="bg-white text-black border-gray-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700">默认最大Token</Label>
                    <Input
                      type="number"
                      min={1}
                      value={config.ai.maxTokens}
                      onChange={(e) => updateAIConfig({ maxTokens: parseInt(e.target.value) || 2000 })}
                      className="bg-white text-black border-gray-300"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">默认系统提示词</Label>
                  <textarea
                    value={config.ai.systemPrompt}
                    onChange={(e) => updateAIConfig({ systemPrompt: e.target.value })}
                    placeholder="设定AI的角色和行为..."
                    className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-gray-300 bg-white text-black"
                  />
                </div>

                {/* ===== AI对话 多模型 ===== */}
                <div className="space-y-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-violet-600" />
                    <Label className="text-sm font-semibold text-gray-700">多模型（自动切换 / 模块内手动选择）</Label>
                  </div>
                  <p className="text-xs text-gray-500">
                    配置多个 AI 对话模型后：开启「失败自动切换」则某模型失败时自动换其它重试；在「AI 对话」类模块的配置项里也会出现下拉框，可手动一键选用某个模型。顶部单模型字段为未配置多模型时的兜底。
                  </p>
                  <ModelProfilesManager
                    models={config.ai?.models || []}
                    activeModelId={config.ai?.activeModelId}
                    onChange={(patch) => updateAIConfig(patch)}
                  />
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1">
                      <Label className="text-sm font-medium text-gray-700">失败自动切换</Label>
                      <p className="text-xs text-gray-500 mt-1">AI 对话模块运行时，某模型请求失败自动换其它已配置模型重试，全部失败才报错。</p>
                    </div>
                    <Switch checked={config.ai?.autoFallback ?? false} onCheckedChange={(c) => updateAIConfig({ autoFallback: c })} />
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'aiAssistant' && (
            <>
              <div className="mb-4 p-3 rounded-md bg-[hsl(var(--brand-50))] border border-[hsl(var(--brand-500)/0.18)]">
                <div className="flex items-start gap-2">
                  <Bot className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 mb-0.5">WebRPA 小助手</div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      内置的全能 AI 助手，能够回答 WebRPA 相关问题、帮你搭建/运行工作流、配置全局设置。
                      未配置时会自动回退使用「AI对话」的配置。
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">API地址</Label>
                  <Input
                    value={config.aiAssistant?.apiUrl || ''}
                    onChange={(e) => updateAIAssistantConfig({ apiUrl: e.target.value })}
                    placeholder="https://api.openai.com/v1/chat/completions"
                    className="bg-white text-black border-gray-300"
                  />
                  <p className="text-xs text-gray-500">
                    支持 OpenAI 兼容协议（OpenAI / 智谱 / Deepseek / Groq / Ollama 等）。
                    可填基础地址（如 https://api.openai.com/v1），系统会自动补全。
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">API密钥</Label>
                  <Input
                    type="password"
                    value={config.aiAssistant?.apiKey || ''}
                    onChange={(e) => updateAIAssistantConfig({ apiKey: e.target.value })}
                    placeholder="sk-xxx"
                    className="bg-white text-black border-gray-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">模型名称</Label>
                  <Input
                    value={config.aiAssistant?.model || ''}
                    onChange={(e) => updateAIAssistantConfig({ model: e.target.value })}
                    placeholder="gpt-4o-mini / glm-4-plus / deepseek-chat"
                    className="bg-white text-black border-gray-300"
                  />
                  <p className="text-xs text-gray-500">
                    建议使用支持 Function Calling 的模型，例如 gpt-4o-mini、glm-4-plus、deepseek-chat、qwen-plus
                  </p>
                </div>

                {/* 测试连接：发一条极简请求，当场校验 地址/密钥/模型 是否正确 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={assistantTest.status === 'testing'}
                      onClick={async () => {
                        const a = config.aiAssistant
                        const b = config.ai
                        const payload = {
                          api_url: (a?.apiUrl || b?.apiUrl || '').trim(),
                          api_key: (a?.apiKey || b?.apiKey || '').trim(),
                          model: (a?.model || b?.model || '').trim(),
                          temperature: a?.temperature ?? 0.7,
                          max_tokens: a?.maxTokens ?? 4000,
                          system_prompt: '',
                          enable_tools: false,
                          auto_approve: false,
                        }
                        if (!payload.api_url || !payload.model) {
                          setAssistantTest({ status: 'fail', message: '请先填写 API 地址和模型名称' })
                          return
                        }
                        setAssistantTest({ status: 'testing', message: '正在测试连接…' })
                        const res = await aiAssistantApi.testConnection(payload)
                        if (res.success && res.data) {
                          const d = res.data
                          setAssistantTest({
                            status: d.success ? 'ok' : 'fail',
                            message: d.message,
                            detail: d.detail,
                            latency: d.latency_ms,
                          })
                        } else {
                          setAssistantTest({ status: 'fail', message: res.error || '测试请求失败' })
                        }
                      }}
                      className="border-gray-300 text-gray-700 hover:bg-gray-100"
                    >
                      {assistantTest.status === 'testing' ? (
                        <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />测试中…</>
                      ) : (
                        <><Zap className="w-4 h-4 mr-1.5" />测试连接</>
                      )}
                    </Button>
                    <span className="text-xs text-gray-500">发一条极简请求，立即验证 地址/密钥/模型 是否正确</span>
                  </div>
                  {assistantTest.status === 'ok' && (
                    <div className="flex items-start gap-2 p-2.5 rounded-md bg-green-50 border border-green-200 text-green-700 text-xs">
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-semibold">{assistantTest.message}{typeof assistantTest.latency === 'number' ? `（${assistantTest.latency}ms）` : ''}</div>
                        {assistantTest.detail && <div className="mt-0.5 text-green-600 break-all">{assistantTest.detail}</div>}
                      </div>
                    </div>
                  )}
                  {assistantTest.status === 'fail' && (
                    <div className="flex items-start gap-2 p-2.5 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs">
                      <X className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-semibold break-all">{assistantTest.message}</div>
                        {assistantTest.detail && <div className="mt-0.5 text-red-500 break-all">{assistantTest.detail}</div>}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-700">温度</Label>
                    <Input
                      type="number"
                      min={0}
                      max={2}
                      step={0.1}
                      value={config.aiAssistant?.temperature ?? 0.7}
                      onChange={(e) => updateAIAssistantConfig({ temperature: parseFloat(e.target.value) || 0.7 })}
                      className="bg-white text-black border-gray-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700">最大Token</Label>
                    <Input
                      type="number"
                      min={1}
                      value={config.aiAssistant?.maxTokens ?? 4000}
                      onChange={(e) => updateAIAssistantConfig({ maxTokens: parseInt(e.target.value) || 4000 })}
                      className="bg-white text-black border-gray-300"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">附加系统提示词（可选）</Label>
                  <textarea
                    value={config.aiAssistant?.systemPrompt || ''}
                    onChange={(e) => updateAIAssistantConfig({ systemPrompt: e.target.value })}
                    placeholder="为小助手追加额外的角色设定或行为约束（小助手已内置 WebRPA 的全部知识，留空即可）"
                    className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-gray-300 bg-white text-black"
                  />
                </div>
                <div className="space-y-3 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1">
                      <Label className="text-sm font-medium text-gray-700">启用 Skills 工具调用</Label>
                      <p className="text-xs text-gray-500 mt-1">
                        让小助手能够直接操作 WebRPA（搭建/运行工作流、修改配置等）。
                        关闭后小助手只能进行问答。
                      </p>
                    </div>
                    <Switch
                      checked={config.aiAssistant?.enableTools ?? true}
                      onCheckedChange={(c) => updateAIAssistantConfig({ enableTools: c })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1">
                      <Label className="text-sm font-medium text-gray-700">自动批准工具调用</Label>
                      <p className="text-xs text-gray-500 mt-1">
                        开启后小助手的工具调用会立即执行，无需人工确认。建议熟悉后再开启。
                      </p>
                    </div>
                    <Switch
                      checked={config.aiAssistant?.autoApprove ?? false}
                      onCheckedChange={(c) => updateAIAssistantConfig({ autoApprove: c })}
                    />
                  </div>

                  {/* 操作权限模式（三档） */}
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">操作权限</Label>
                      <p className="text-xs text-gray-500 mt-1">
                        控制小助手操作 WebRPA / 你电脑时是否需要你授权。拒绝某次操作不会终止任务，小助手会继续。
                      </p>
                    </div>
                    {([
                      ['approval', '逐项确认', '小助手每次真正要操作前都在聊天上方弹授权，你允许才执行'],
                      ['smart', '智能放行', '仅在检测到高风险操作（删除/清空/运行/回档等）时才请求确认，其余自动执行'],
                      ['full', '自由执行', '完全不拦截，小助手可不受限地操作一切（请谨慎开启）'],
                    ] as const).map(([val, title, desc]) => {
                      const current = config.aiAssistant?.permissionMode || 'smart'
                      const active = current === val
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => updateAIAssistantConfig({ permissionMode: val })}
                          className={`w-full text-left p-2.5 rounded-md border transition-colors ${active ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300'}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-3.5 h-3.5 rounded-full border-2 flex-none ${active ? 'border-blue-600 bg-blue-600' : 'border-gray-300'}`} />
                            <span className="text-[13px] font-medium text-gray-800">{title}</span>
                          </div>
                          <p className="text-[11px] text-gray-500 mt-0.5 ml-[22px]">{desc}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* ===== 多模型管理 ===== */}
                <div className="space-y-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-blue-600" />
                    <Label className="text-sm font-semibold text-gray-700">多模型（一键切换 / 自动切换 / 场景路由）</Label>
                  </div>
                  <p className="text-xs text-gray-500">
                    配置多个模型后，可在聊天框右下角一键切换；也可开启下方自动切换/场景路由。顶部单模型字段作为未配置多模型时的兜底。
                  </p>
                  <ModelProfilesManager
                    models={config.aiAssistant?.models || []}
                    activeModelId={config.aiAssistant?.activeModelId}
                    showScenes
                    onChange={(patch) => updateAIAssistantConfig(patch)}
                  />
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1">
                      <Label className="text-sm font-medium text-gray-700">失败自动切换</Label>
                      <p className="text-xs text-gray-500 mt-1">某模型请求失败时，自动换其它已配置模型重试，全部失败才报错。</p>
                    </div>
                    <Switch checked={config.aiAssistant?.autoFallback ?? false} onCheckedChange={(c) => updateAIAssistantConfig({ autoFallback: c })} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1">
                      <Label className="text-sm font-medium text-gray-700">场景自动选模型</Label>
                      <p className="text-xs text-gray-500 mt-1">按问答场景自动挑选模型：发图片→多模态组、复杂分析→深度思考组、其余→普通对话组（需给模型勾选场景）。</p>
                    </div>
                    <Switch checked={config.aiAssistant?.autoSceneRoute ?? false} onCheckedChange={(c) => updateAIAssistantConfig({ autoSceneRoute: c })} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1">
                      <Label className="text-sm font-medium text-gray-700">自愈循环最大轮数</Label>
                      <p className="text-xs text-gray-500 mt-1">工作流运行失败时，小助手自动「诊断→修复→重跑」的最多轮数。简单任务用不满，复杂任务可调高（1-20，默认 5）。</p>
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={config.aiAssistant?.maxHealRounds ?? 5}
                      onChange={(e) => {
                        const n = Math.max(1, Math.min(20, parseInt(e.target.value || '5', 10) || 5))
                        updateAIAssistantConfig({ maxHealRounds: n })
                      }}
                      className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-center"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'mcp' && (
            <>
              <MCPConfigPanel />
            </>
          )}

          {activeTab === 'aiScraper' && (
            <>
              <p className="text-xs text-gray-500 mb-4">
                配置AI智能爬虫和AI元素选择器模块的默认值，新建模块时将自动填充这些配置
              </p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">默认LLM提供商</Label>
                  <SelectNative
                    value={config.aiScraper?.llmProvider || 'ollama'}
                    onChange={(e) => updateAIScraperConfig({ llmProvider: e.target.value })}
                  >
                    <option value="ollama">Ollama (本地免费)</option>
                    <option value="openai">OpenAI</option>
                    <option value="groq">Groq</option>
                    <option value="gemini">Google Gemini</option>
                    <option value="azure">Azure OpenAI</option>
                    <option value="zhipu">智谱 AI (GLM)</option>
                    <option value="deepseek">Deepseek</option>
                    <option value="custom">自定义</option>
                  </SelectNative>
                  <p className="text-xs text-gray-500">
                    推荐使用 Ollama 本地运行，完全免费
                  </p>
                </div>
                
                {(config.aiScraper?.llmProvider || 'ollama') !== 'ollama' && (
                  <div className="space-y-2">
                    <Label className="text-gray-700">默认API地址</Label>
                    <Input
                      value={config.aiScraper?.apiUrl || ''}
                      onChange={(e) => updateAIScraperConfig({ apiUrl: e.target.value })}
                      placeholder={
                        (config.aiScraper?.llmProvider || 'ollama') === 'openai' ? 'https://api.openai.com/v1' :
                        (config.aiScraper?.llmProvider || 'ollama') === 'zhipu' ? 'https://open.bigmodel.cn/api/paas/v4' :
                        (config.aiScraper?.llmProvider || 'ollama') === 'deepseek' ? 'https://api.deepseek.com' :
                        (config.aiScraper?.llmProvider || 'ollama') === 'groq' ? 'https://api.groq.com/openai/v1' :
                        (config.aiScraper?.llmProvider || 'ollama') === 'gemini' ? 'https://generativelanguage.googleapis.com/v1beta' :
                        '自定义API地址'
                      }
                      className="bg-white text-black border-gray-300"
                    />
                    <div className="text-xs text-gray-600 space-y-1 bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <div className="font-medium text-gray-700 mb-1">常用API地址：</div>
                      <div><strong>OpenAI:</strong> https://api.openai.com/v1</div>
                      <div><strong>智谱AI:</strong> https://open.bigmodel.cn/api/paas/v4</div>
                      <div><strong>Deepseek:</strong> https://api.deepseek.com</div>
                      <div><strong>Groq:</strong> https://api.groq.com/openai/v1</div>
                      <div><strong>Gemini:</strong> https://generativelanguage.googleapis.com/v1beta</div>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label className="text-gray-700">默认模型名称</Label>
                  <Input
                    value={config.aiScraper?.llmModel || ''}
                    onChange={(e) => updateAIScraperConfig({ llmModel: e.target.value })}
                    placeholder={
                      (config.aiScraper?.llmProvider || 'ollama') === 'ollama' ? 'llama3.2' :
                      (config.aiScraper?.llmProvider || 'ollama') === 'openai' ? 'gpt-4o-mini' :
                      (config.aiScraper?.llmProvider || 'ollama') === 'zhipu' ? 'glm-4-flash' :
                      (config.aiScraper?.llmProvider || 'ollama') === 'deepseek' ? 'deepseek-chat' :
                      (config.aiScraper?.llmProvider || 'ollama') === 'groq' ? 'llama-3.3-70b-versatile' :
                      (config.aiScraper?.llmProvider || 'ollama') === 'gemini' ? 'gemini-2.0-flash-exp' :
                      '模型名称'
                    }
                    className="bg-white text-black border-gray-300"
                  />
                  <div className="text-xs text-gray-600 space-y-1 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="font-medium text-gray-700 mb-1">推荐模型：</div>
                    {(config.aiScraper?.llmProvider || 'ollama') === 'ollama' && (
                      <>
                        <div><strong>llama3.2</strong> - Meta 开源模型，性能均衡</div>
                        <div><strong>qwen2.5</strong> - 阿里通义千问，中文友好</div>
                      </>
                    )}
                    {(config.aiScraper?.llmProvider || 'ollama') === 'openai' && (
                      <>
                        <div><strong>gpt-4o-mini</strong> - 性价比高，速度快</div>
                        <div><strong>gpt-4o</strong> - 最强性能</div>
                      </>
                    )}
                    {(config.aiScraper?.llmProvider || 'ollama') === 'zhipu' && (
                      <>
                        <div><strong>glm-4-flash</strong> - 免费，速度快</div>
                        <div><strong>glm-4-plus</strong> - 性能更强</div>
                      </>
                    )}
                    {(config.aiScraper?.llmProvider || 'ollama') === 'deepseek' && (
                      <>
                        <div><strong>deepseek-chat</strong> - 性价比极高</div>
                      </>
                    )}
                    {(config.aiScraper?.llmProvider || 'ollama') === 'groq' && (
                      <>
                        <div><strong>llama-3.3-70b-versatile</strong> - 免费，速度极快</div>
                      </>
                    )}
                    {(config.aiScraper?.llmProvider || 'ollama') === 'gemini' && (
                      <>
                        <div><strong>gemini-2.0-flash-exp</strong> - 免费，性能强</div>
                      </>
                    )}
                  </div>
                </div>
                
                {(config.aiScraper?.llmProvider || 'ollama') !== 'ollama' && (
                  <div className="space-y-2">
                    <Label className="text-gray-700">默认API Key</Label>
                    <Input
                      type="password"
                      value={config.aiScraper?.apiKey || ''}
                      onChange={(e) => updateAIScraperConfig({ apiKey: e.target.value })}
                      placeholder="sk-xxx 或其他格式的密钥"
                      className="bg-white text-black border-gray-300"
                    />
                  </div>
                )}
                
                {(config.aiScraper?.llmProvider || 'ollama') === 'azure' && (
                  <div className="space-y-2">
                    <Label className="text-gray-700">Azure Endpoint</Label>
                    <Input
                      value={config.aiScraper?.azureEndpoint || ''}
                      onChange={(e) => updateAIScraperConfig({ azureEndpoint: e.target.value })}
                      placeholder="https://your-resource.openai.azure.com/"
                      className="bg-white text-black border-gray-300"
                    />
                  </div>
                )}
                
                <div className="p-3 rounded-md bg-[hsl(var(--muted))] border border-[hsl(var(--border))]">
                  <p className="text-xs text-purple-900">
                    <strong>提示</strong><br/>
                    • <strong>Ollama</strong>: 需要先安装并下载模型，完全免费<br/>
                    • <strong>智谱/Groq/Gemini</strong>: 提供免费额度，适合测试<br/>
                    • <strong>OpenAI/Deepseek</strong>: 按使用量付费<br/>
                    • 这些配置将应用于 AI智能爬虫 和 AI元素选择器 模块
                  </p>
                </div>
              </div>
            </>
          )}

          {activeTab === 'email' && (
            <>
              <p className="text-xs text-gray-500 mb-4">
                配置发送邮件模块的默认值，新建模块时将自动填充这些配置
              </p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">默认发件人邮箱</Label>
                  <Input
                    value={config.email.senderEmail}
                    onChange={(e) => updateEmailConfig({ senderEmail: e.target.value })}
                    placeholder="your_qq@qq.com"
                    className="bg-white text-black border-gray-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">默认授权码</Label>
                  <Input
                    type="password"
                    value={config.email.authCode}
                    onChange={(e) => updateEmailConfig({ authCode: e.target.value })}
                    placeholder="QQ邮箱授权码"
                    className="bg-white text-black border-gray-300"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-700">SMTP服务器</Label>
                    <Input
                      value={config.email.smtpServer}
                      onChange={(e) => updateEmailConfig({ smtpServer: e.target.value })}
                      placeholder="smtp.qq.com"
                      className="bg-white text-black border-gray-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700">SMTP端口</Label>
                    <Input
                      type="number"
                      value={config.email.smtpPort}
                      onChange={(e) => updateEmailConfig({ smtpPort: parseInt(e.target.value) || 465 })}
                      className="bg-white text-black border-gray-300"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'workflow' && (
            <>
              <p className="text-xs text-gray-500 mb-4">
                配置本地工作流文件的保存位置和自动保存选项
              </p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">工作流保存文件夹</Label>
                  <div className="flex gap-1">
                    <Input
                      value={config.workflow?.localFolder || ''}
                      onChange={(e) => updateWorkflowConfig({ localFolder: e.target.value })}
                      placeholder={defaultFolder || '使用默认路径'}
                      className="bg-white text-black border-gray-300 flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={isSelectingFolder}
                      className="shrink-0 border-gray-300"
                      onClick={async () => {
                        setIsSelectingFolder(true)
                        try {
                          const result = await systemApi.selectFolder('选择工作流保存文件夹')
                          if (result.data?.success && result.data.path) {
                            updateWorkflowConfig({ localFolder: result.data.path })
                          }
                        } catch (error) {
                          console.error('选择文件夹失败:', error)
                        } finally {
                          setIsSelectingFolder(false)
                        }
                      }}
                    >
                      {isSelectingFolder ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Folder className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    留空则使用默认路径: {defaultFolder || '加载中...'}
                  </p>
                </div>
                {config.workflow?.localFolder && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-300 text-gray-700 hover:bg-gray-100"
                    onClick={() => updateWorkflowConfig({ localFolder: '' })}
                  >
                    恢复默认路径
                  </Button>
                )}
                
                {/* 自动保存开关 */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <Label className="text-gray-700 font-medium">自动保存工作流</Label>
                    <p className="text-xs text-gray-500 mt-1">
                      开启后，工作流的每次编辑都会自动保存到本地，无需手动保存
                    </p>
                  </div>
                  <Switch
                    checked={config.workflow?.autoSave || false}
                    onCheckedChange={(c) => updateWorkflowConfig({ autoSave: c })}
                  />
                </div>
                
                {/* 覆盖提示开关 */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <Label className="text-gray-700 font-medium">同名工作流覆盖提示</Label>
                    <p className="text-xs text-gray-500 mt-1">
                      手动保存工作流时，若本地存在同名文件，是否弹出覆盖确认提示
                    </p>
                  </div>
                  <Switch
                    checked={config.workflow?.showOverwriteConfirm !== false}
                    onCheckedChange={(c) => updateWorkflowConfig({ showOverwriteConfirm: c })}
                  />
                </div>

                {/* 同名自动创建副本开关 */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <Label className="text-gray-700 font-medium">同名工作流自动创建副本</Label>
                    <p className="text-xs text-gray-500 mt-1">
                      开启后，手动保存时若已存在同名工作流，将自动另存为带时间戳的副本（不再覆盖原文件），覆盖提示也不再显示
                    </p>
                  </div>
                  <Switch
                    checked={config.workflow?.autoSaveCopy === true}
                    onCheckedChange={(c) => updateWorkflowConfig({ autoSaveCopy: c })}
                  />
                </div>

                {/* WebDAV 远程存储 */}
                <WebDAVSettings />
              </div>
            </>
          )}

          {activeTab === 'database' && (
            <>
              <p className="text-xs text-gray-500 mb-4">
                配置数据库模块的默认连接信息，新建模块时将自动填充这些配置
              </p>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-700">主机地址</Label>
                    <Input
                      value={config.database?.host || 'localhost'}
                      onChange={(e) => updateDatabaseConfig({ host: e.target.value })}
                      placeholder="localhost"
                      className="bg-white text-black border-gray-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700">端口</Label>
                    <Input
                      type="number"
                      value={config.database?.port || 3306}
                      onChange={(e) => updateDatabaseConfig({ port: parseInt(e.target.value) || 3306 })}
                      placeholder="3306"
                      className="bg-white text-black border-gray-300"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">用户名</Label>
                  <Input
                    value={config.database?.user || ''}
                    onChange={(e) => updateDatabaseConfig({ user: e.target.value })}
                    placeholder="root"
                    className="bg-white text-black border-gray-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">密码</Label>
                  <Input
                    type="password"
                    value={config.database?.password || ''}
                    onChange={(e) => updateDatabaseConfig({ password: e.target.value })}
                    placeholder="数据库密码"
                    className="bg-white text-black border-gray-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">数据库名</Label>
                  <Input
                    value={config.database?.database || ''}
                    onChange={(e) => updateDatabaseConfig({ database: e.target.value })}
                    placeholder="默认数据库名（可选）"
                    className="bg-white text-black border-gray-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">字符集</Label>
                  <Input
                    value={config.database?.charset || 'utf8mb4'}
                    onChange={(e) => updateDatabaseConfig({ charset: e.target.value })}
                    placeholder="utf8mb4"
                    className="bg-white text-black border-gray-300"
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === 'display' && (
            <>
              <p className="text-xs text-gray-500 mb-4">
                配置界面显示相关的选项
              </p>
              <div className="space-y-4">
                {/* 主题色切换 */}
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <Label className="text-gray-700 font-medium">主题色</Label>
                  <p className="text-xs text-gray-500 mt-1 mb-2.5">
                    默认：原始亮色界面；暗色：整页反相暗色（护眼）；灰色：整页灰度（专注）。切换即时生效。
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { id: 'default', name: '默认', desc: '亮色' },
                      { id: 'dark', name: '暗色', desc: '护眼深色' },
                      { id: 'gray', name: '灰色', desc: '灰度专注' },
                    ] as const).map((opt) => {
                      const active = (config.display?.theme || 'default') === opt.id
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => updateDisplayConfig({ theme: opt.id })}
                          className={'flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-lg border-[1.5px] transition-all ' +
                            (active ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20' : 'border-gray-200 bg-white hover:border-blue-300')}
                        >
                          <span className="w-full h-7 rounded-md border border-gray-300" style={{
                            background: opt.id === 'default' ? 'linear-gradient(135deg,#fff,#eef2ff)' : opt.id === 'dark' ? 'linear-gradient(135deg,#181a1b,#2b2f31)' : 'linear-gradient(135deg,#9ca3af,#d1d5db)',
                          }} />
                          <span className={'text-[12.5px] font-semibold ' + (active ? 'text-blue-700' : 'text-gray-700')}>{opt.name}</span>
                          <span className="text-[10px] text-gray-400">{opt.desc}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <Label className="text-gray-700 font-medium">鼠标坐标实时显示</Label>
                    <p className="text-xs text-gray-500 mt-1">
                      开启后会在鼠标旁边显示当前坐标位置
                    </p>
                  </div>
                  <Switch
                    checked={config.display?.showMouseCoordinates || false}
                    onCheckedChange={(c) => updateDisplayConfig({ showMouseCoordinates: c })}
                  />
                </div>

                {/* 运行状态高亮开关（默认关闭） */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <Label className="text-gray-700 font-medium">运行状态高亮</Label>
                    <p className="text-xs text-gray-500 mt-1">
                      工作流运行时实时高亮“运行中/成功/失败”的模块。默认关闭：大型工作流高速运行时方块闪烁会导致页面卡顿
                    </p>
                  </div>
                  <Switch
                    checked={config.display?.runStatusHighlight || false}
                    onCheckedChange={(c) => updateDisplayConfig({ runStatusHighlight: c })}
                  />
                </div>
                
                {/* 连接点尺寸滑条 */}
                <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <Label className="text-gray-700 font-medium">节点连接点尺寸</Label>
                    <span className="text-sm font-semibold text-blue-600">{config.display?.handleSize || 12}px</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    调整工作流画布中所有节点连接点的大小（6-24像素）
                  </p>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-xs text-gray-500 w-8">小</span>
                    <Slider
                      min={6}
                      max={24}
                      step={1}
                      value={[config.display?.handleSize || 12]}
                      onValueChange={(vals) => updateDisplayConfig({ handleSize: vals[0] })}
                      className="flex-1"
                    />
                    <span className="text-xs text-gray-500 w-8 text-right">大</span>
                  </div>
                  <div className="flex justify-center gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs border-gray-300 text-gray-700 hover:bg-gray-100"
                      onClick={() => updateDisplayConfig({ handleSize: 12 })}
                    >
                      恢复默认 (12px)
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'browser' && (
            <>
              <p className="text-xs text-gray-500 mb-4">
                配置浏览器自动化使用的浏览器类型，修改后需要重新打开浏览器才能生效
              </p>
              
              {/* 登录状态持久化提示 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-900 mb-2">关于登录状态持久化</p>
                    <div className="text-xs text-blue-800 space-y-1.5">
                      <p>• <strong>使用默认浏览器（推荐）：</strong>登录状态会自动保存，下次运行工作流时无需重新登录</p>
                      <p>• <strong>使用自定义浏览器路径：</strong>由于技术限制，登录状态无法持久化保存，每次运行都需要重新登录</p>
                      <p className="pt-1 text-blue-700">如需保持登录状态，建议使用默认的 Microsoft Edge 浏览器（不指定自定义路径）</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-amber-800">
                  <strong>重要提示：</strong>浏览器类型选项会启动对应的浏览器程序，而不是系统默认浏览器。
                  例如选择"Microsoft Edge"会启动系统安装的 Edge 浏览器，即使您的系统默认浏览器是 Chrome。
                  如果选择的浏览器未安装或路径不正确，请使用"自定义浏览器路径"手动指定。
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">浏览器类型</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {browserOptions.map((option) => (
                      <label
                        key={option.value}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          (config.browser?.type || 'msedge') === option.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <Radio
                          value={option.value}
                          checked={(config.browser?.type || 'msedge') === option.value}
                          onSelect={() => updateBrowserConfig({ type: option.value as BrowserType })}
                          dotOnly
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-700">{option.label}</div>
                          <div className="text-xs text-gray-500">{option.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">自定义浏览器路径（可选）</Label>
                  <div className="flex gap-1">
                    <Input
                      value={config.browser?.executablePath || ''}
                      onChange={(e) => updateBrowserConfig({ executablePath: e.target.value })}
                      placeholder="留空则使用系统默认路径"
                      className="bg-white text-black border-gray-300 flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={isSelectingBrowser}
                      className="shrink-0 border-gray-300"
                      onClick={async () => {
                        setIsSelectingBrowser(true)
                        try {
                          // fileTypes 格式: [["描述", "*.扩展名"], ...]
                          const result = await systemApi.selectFile('选择浏览器可执行文件', undefined, [
                            ['可执行文件', '*.exe']
                          ])
                          if (result.data?.success && result.data.path) {
                            updateBrowserConfig({ executablePath: result.data.path })
                          }
                        } catch (error) {
                          console.error('选择文件失败:', error)
                        } finally {
                          setIsSelectingBrowser(false)
                        }
                      }}
                    >
                      {isSelectingBrowser ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Folder className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    如果选择的浏览器类型无法启动，可以手动指定浏览器可执行文件的路径
                  </p>
                </div>
                {config.browser?.executablePath && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-300 text-gray-700 hover:bg-gray-100"
                    onClick={() => updateBrowserConfig({ executablePath: '' })}
                  >
                    清除自定义路径
                  </Button>
                )}
                <div className="space-y-2">
                  <Label className="text-gray-700">浏览器数据缓存目录（可选）</Label>
                  <div className="flex gap-1">
                    <Input
                      value={config.browser?.userDataDir || ''}
                      onChange={(e) => updateBrowserConfig({ userDataDir: e.target.value })}
                      placeholder="留空则使用默认目录：backend/browser_data"
                      className="bg-white text-black border-gray-300 flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={isSelectingFolder}
                      className="shrink-0 border-gray-300"
                      onClick={async () => {
                        setIsSelectingFolder(true)
                        try {
                          const result = await systemApi.selectFolder('选择浏览器数据缓存目录')
                          if (result.data?.success && result.data.path) {
                            updateBrowserConfig({ userDataDir: result.data.path })
                          }
                        } catch (error) {
                          console.error('选择文件夹失败:', error)
                        } finally {
                          setIsSelectingFolder(false)
                        }
                      }}
                    >
                      {isSelectingFolder ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Folder className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    默认使用 backend/browser_data 目录存储浏览器数据（Cookie、缓存、登录状态等）。如需自定义存储位置或多项目共享数据，可在此指定
                  </p>
                </div>
                {config.browser?.userDataDir && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-300 text-gray-700 hover:bg-gray-100"
                    onClick={() => updateBrowserConfig({ userDataDir: '' })}
                  >
                    恢复默认目录
                  </Button>
                )}
                
                {/* 浏览器启动参数配置 */}
                <div className="space-y-2">
                  <Label className="text-gray-700">浏览器启动参数</Label>
                  <textarea
                    value={config.browser?.launchArgs || ''}
                    onChange={(e) => updateBrowserConfig({ launchArgs: e.target.value })}
                    placeholder="每行一个启动参数，例如：&#10;--disable-blink-features=AutomationControlled&#10;--start-maximized"
                    rows={8}
                    className="w-full px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black resize-none"
                  />
                  <p className="text-xs text-gray-500">
                    每行一个参数，留空则使用默认参数。常用参数：
                  </p>
                  <div className="text-xs text-gray-600 space-y-1 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div><code className="bg-gray-200 px-1 rounded">--disable-blink-features=AutomationControlled</code> - 隐藏自动化特征</div>
                    <div><code className="bg-gray-200 px-1 rounded">--start-maximized</code> - 最大化启动</div>
                    <div><code className="bg-gray-200 px-1 rounded">--ignore-certificate-errors</code> - 忽略证书错误</div>
                    <div><code className="bg-gray-200 px-1 rounded">--disable-web-security</code> - 禁用Web安全策略</div>
                    <div><code className="bg-gray-200 px-1 rounded">--disable-notifications</code> - 禁用通知</div>
                  </div>
                </div>
                {config.browser?.launchArgs && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-300 text-gray-700 hover:bg-gray-100"
                    onClick={() => updateBrowserConfig({ 
                      launchArgs: `--disable-blink-features=AutomationControlled
--start-maximized
--ignore-certificate-errors
--ignore-ssl-errors
--disable-web-security
--disable-features=IsolateOrigins,site-per-process
--allow-running-insecure-content
--disable-infobars
--disable-notifications` 
                    })}
                  >
                    恢复默认启动参数
                  </Button>
                )}
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <Label className="text-gray-700 font-medium">窗口最大化启动</Label>
                    <p className="text-xs text-gray-500 mt-1">
                      开启后浏览器将以最大化窗口启动（占满整个屏幕）
                    </p>
                  </div>
                  <Switch
                    checked={config.browser?.fullscreen ?? false}
                    onCheckedChange={(c) => updateBrowserConfig({ fullscreen: c })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <Label className="text-gray-700 font-medium">工作流结束后自动关闭浏览器</Label>
                    <p className="text-xs text-gray-500 mt-1">
                      开启后工作流执行完成时将自动关闭浏览器窗口
                    </p>
                  </div>
                  <Switch
                    checked={config.browser?.autoCloseBrowser ?? true}
                    onCheckedChange={(c) => {
                      console.log('[GlobalConfig] 切换 autoCloseBrowser:', c)
                      updateBrowserConfig({ autoCloseBrowser: c })
                      setShowBrowserConfigTip(true)
                      // 立即验证更新
                      setTimeout(() => {
                        const newConfig = useGlobalConfigStore.getState().config
                        console.log('[GlobalConfig] 更新后的配置:', newConfig.browser?.autoCloseBrowser)
                      }, 100)
                    }}
                  />
                </div>
                
                {/* 浏览器配置更改提示 */}
                {showBrowserConfigTip && (
                  <div 
                    ref={browserConfigTipRef}
                    className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg animate-fade-in"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center mt-0.5">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900 mb-1">配置已保存</p>
                        <p className="text-xs text-blue-700 mb-3">
                          浏览器配置已更新。如果配置未立即生效，请刷新页面后重试。
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => {
                              window.location.reload()
                            }}
                          >
                            立即刷新
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-100"
                            onClick={() => setShowBrowserConfigTip(false)}
                          >
                            我知道了
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'triggers' && (
            <>
              <p className="text-xs text-gray-500 mb-4">
                配置触发器模块的默认值，新建触发器模块时将自动填充这些配置
              </p>
              <div className="space-y-6">
                {/* 邮件触发器配置 */}
                <div className="space-y-4 p-4 bg-blue-50/30 rounded-lg border border-blue-100">
                  <h4 className="font-medium text-gray-800 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-600" />
                    邮件触发器默认配置
                  </h4>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-gray-700">IMAP服务器</Label>
                      <Input
                        value={config.emailTrigger?.imapServer || ''}
                        onChange={(e) => updateEmailTriggerConfig({ imapServer: e.target.value })}
                        placeholder="imap.qq.com"
                        className="bg-white text-black border-gray-300"
                      />
                      <p className="text-xs text-gray-500">
                        常用：QQ邮箱 imap.qq.com，163邮箱 imap.163.com，Gmail imap.gmail.com
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-700">IMAP端口</Label>
                      <Input
                        type="number"
                        value={config.emailTrigger?.imapPort || 993}
                        onChange={(e) => updateEmailTriggerConfig({ imapPort: parseInt(e.target.value) || 993 })}
                        placeholder="993"
                        className="bg-white text-black border-gray-300"
                      />
                      <p className="text-xs text-gray-500">
                        IMAP SSL端口通常为993
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-700">邮箱账号</Label>
                      <Input
                        value={config.emailTrigger?.emailAccount || ''}
                        onChange={(e) => updateEmailTriggerConfig({ emailAccount: e.target.value })}
                        placeholder="your@email.com"
                        className="bg-white text-black border-gray-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-700">邮箱密码/授权码</Label>
                      <Input
                        type="password"
                        value={config.emailTrigger?.emailPassword || ''}
                        onChange={(e) => updateEmailTriggerConfig({ emailPassword: e.target.value })}
                        placeholder="邮箱密码或授权码"
                        className="bg-white text-black border-gray-300"
                      />
                      <p className="text-xs text-gray-500">
                        QQ邮箱、163邮箱等需要使用授权码，而非登录密码
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-700">默认检查间隔（秒）</Label>
                      <Input
                        type="number"
                        value={config.emailTrigger?.checkInterval || 30}
                        onChange={(e) => updateEmailTriggerConfig({ checkInterval: parseInt(e.target.value) || 30 })}
                        placeholder="30"
                        min="5"
                        className="bg-white text-black border-gray-300"
                      />
                      <p className="text-xs text-gray-500">
                        建议不低于30秒，避免频繁请求被邮件服务器限制
                      </p>
                    </div>
                  </div>
                </div>

                {/* API触发器配置 */}
                <div className="space-y-4 p-4 bg-green-50/30 rounded-lg border border-green-100">
                  <h4 className="font-medium text-gray-800 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-green-600" />
                    API触发器默认配置
                  </h4>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-gray-700">默认请求头（JSON格式）</Label>
                      <textarea
                        value={config.apiTrigger?.defaultHeaders || '{}'}
                        onChange={(e) => updateApiTriggerConfig({ defaultHeaders: e.target.value })}
                        placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
                        rows={4}
                        className="w-full px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black resize-none"
                      />
                      <p className="text-xs text-gray-500">
                        设置常用的请求头，如认证token等，新建API触发器时会自动填充
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-700">默认检查间隔（秒）</Label>
                      <Input
                        type="number"
                        value={config.apiTrigger?.checkInterval || 10}
                        onChange={(e) => updateApiTriggerConfig({ checkInterval: parseInt(e.target.value) || 10 })}
                        placeholder="10"
                        min="1"
                        className="bg-white text-black border-gray-300"
                      />
                      <p className="text-xs text-gray-500">
                        API轮询的默认间隔时间
                      </p>
                    </div>
                  </div>
                </div>

                {/* 文件监控触发器配置 */}
                <div className="space-y-4 p-4 bg-purple-50/30 rounded-lg border border-purple-100">
                  <h4 className="font-medium text-gray-800 flex items-center gap-2">
                    <Folder className="w-4 h-4 text-purple-600" />
                    文件监控触发器默认配置
                  </h4>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-gray-700">默认监控路径</Label>
                      <div className="flex gap-1">
                        <Input
                          value={config.fileTrigger?.defaultWatchPath || ''}
                          onChange={(e) => updateFileTriggerConfig({ defaultWatchPath: e.target.value })}
                          placeholder="C:\\Users\\Downloads"
                          className="bg-white text-black border-gray-300 flex-1"
                        />
                        <Button
                          type="button"
                          variant="tonal-warning"
                          size="icon"
                          className="shrink-0 border-gray-300"
                          onClick={async () => {
                            try {
                              const result = await systemApi.selectFolder('选择默认监控路径')
                              if (result.data?.success && result.data.path) {
                                updateFileTriggerConfig({ defaultWatchPath: result.data.path })
                              }
                            } catch (error) {
                              console.error('选择文件夹失败:', error)
                            }
                          }}
                        >
                          <Folder className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500">
                        设置常用的监控路径，如下载文件夹等
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-800">
                    提示：这些配置会在新建对应触发器模块时自动填充，帮助您快速配置常用的触发器
                  </p>
                </div>
              </div>
            </>
          )}

          {activeTab === 'qq' && (
            <>
              <p className="text-xs text-gray-500 mb-4">
                配置常用的 QQ 号和群号，在使用 QQ 自动化模块时可以快速选择
              </p>
              <div className="space-y-4">
                {/* 联系人列表 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-gray-700 font-medium">常用联系人</Label>
                    <Button
                      size="sm"
                      className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => {
                        const newContact = {
                          id: Date.now().toString(),
                          number: '',
                          remark: '',
                          type: 'private' as const
                        }
                        updateQQConfig({
                          contacts: [...(config.qq?.contacts || []), newContact]
                        })
                      }}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      添加联系人
                    </Button>
                  </div>
                  
                  {(!config.qq?.contacts || config.qq.contacts.length === 0) ? (
                    <div className="text-center py-8 text-gray-400">
                      <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">暂无常用联系人</p>
                      <p className="text-xs mt-1">点击上方"添加联系人"按钮开始添加</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {config.qq.contacts.map((contact, index) => (
                        <div
                          key={contact.id}
                          className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                        >
                          {/* 类型选择 */}
                          <SelectNative
                            value={contact.type}
                            onChange={(e) => {
                              const newContacts = [...(config.qq?.contacts || [])]
                              newContacts[index] = {
                                ...newContacts[index],
                                type: e.target.value as 'private' | 'group'
                              }
                              updateQQConfig({ contacts: newContacts })
                            }}
                            className="w-20"
                          >
                            <option value="private">私聊</option>
                            <option value="group">群聊</option>
                          </SelectNative>
                          
                          {/* QQ号/群号 */}
                          <Input
                            value={contact.number}
                            onChange={(e) => {
                              const newContacts = [...(config.qq?.contacts || [])]
                              newContacts[index] = {
                                ...newContacts[index],
                                number: e.target.value
                              }
                              updateQQConfig({ contacts: newContacts })
                            }}
                            placeholder={contact.type === 'group' ? '群号' : 'QQ号'}
                            className="flex-1 h-8 text-sm bg-white text-black border-gray-300"
                          />
                          
                          {/* 备注 */}
                          <Input
                            value={contact.remark}
                            onChange={(e) => {
                              const newContacts = [...(config.qq?.contacts || [])]
                              newContacts[index] = {
                                ...newContacts[index],
                                remark: e.target.value
                              }
                              updateQQConfig({ contacts: newContacts })
                            }}
                            placeholder="备注名称"
                            className="flex-1 h-8 text-sm bg-white text-black border-gray-300"
                          />
                          
                          {/* 删除按钮 */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              const newContacts = (config.qq?.contacts || []).filter((_, i) => i !== index)
                              updateQQConfig({ contacts: newContacts })
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-800">
                    提示：添加常用的 QQ 号和群号后，在使用 QQ 自动化模块时可以从下拉列表中快速选择，无需每次手动输入
                  </p>
                </div>
              </div>
            </>
          )}

          {activeTab === 'feishu' && (
            <>
              <p className="text-xs text-gray-500 mb-4">
                配置飞书自动化模块的默认值，新建飞书模块时将自动填充这些配置
              </p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">默认 App ID</Label>
                  <Input
                    value={config.feishu?.appId || ''}
                    onChange={(e) => updateFeishuConfig({ appId: e.target.value })}
                    placeholder="cli_xxxxxxxxxxxxxxxx"
                    className="bg-white text-black border-gray-300"
                  />
                  <p className="text-xs text-gray-500">
                    飞书应用的唯一标识，可在飞书开放平台的应用详情页面获取
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">默认 App Secret</Label>
                  <Input
                    type="password"
                    value={config.feishu?.appSecret || ''}
                    onChange={(e) => updateFeishuConfig({ appSecret: e.target.value })}
                    placeholder="应用密钥"
                    className="bg-white text-black border-gray-300"
                  />
                  <p className="text-xs text-gray-500">
                    飞书应用的密钥，用于获取访问令牌，请妥善保管
                  </p>
                </div>
                
                <div className="p-3 rounded-md bg-[hsl(var(--success-50))] border border-[hsl(var(--success-500)/0.25)] space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center mt-0.5">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-green-900 mb-2">如何获取飞书应用凭证</p>
                      <div className="text-xs text-green-800 space-y-1.5">
                        <p><strong>1. 创建飞书应用</strong></p>
                        <p className="pl-3">• 访问 <a href="https://open.feishu.cn/app" target="_blank" rel="noopener noreferrer" className="underline hover:text-green-600">飞书开放平台</a></p>
                        <p className="pl-3">• 点击"创建企业自建应用"</p>
                        <p className="pl-3">• 填写应用名称和描述</p>
                        
                        <p className="pt-2"><strong>2. 获取凭证</strong></p>
                        <p className="pl-3">• 进入应用详情页面</p>
                        <p className="pl-3">• 在"凭证与基础信息"中找到 App ID 和 App Secret</p>
                        
                        <p className="pt-2"><strong>3. 配置权限</strong></p>
                        <p className="pl-3">• 在"权限管理"中添加所需权限</p>
                        <p className="pl-3">• 多维表格：bitable:app</p>
                        <p className="pl-3">• 电子表格：sheets:spreadsheet</p>
                        <p className="pl-3">• 发布应用并等待管理员审核通过</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="status-row status-row-info !items-start !py-2.5">
                  <div className="text-[12px]">
                    <strong>使用说明</strong>
                    <br />• 配置后，新建飞书模块时会自动填充 App ID 和 App Secret
                    <br />• 如果不同的飞书模块需要使用不同的应用，可以在模块中单独修改
                    <br />• 这些配置仅存储在本地浏览器中，不会上传到服务器
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'security' && (
            <SecuritySettings />
          )}

          {activeTab === 'credentials' && (
            <CredentialSettings />
          )}

          {activeTab === 'retention' && (
            <RetentionSettings />
          )}
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="dialog-footer-bar !justify-between">
          <Button
            variant="tonal-warning"
            size="sm"
            onClick={handleReset}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            重置全部
          </Button>
          <Button
            variant="success"
            size="sm"
            onClick={onClose}
          >
            <Check className="w-3.5 h-3.5" />
            完成保存
          </Button>
        </div>
      </div>

      {/* 确认对话框 */}
      <ConfirmDialog />
    </div>
    </DialogPortal>
  )
}
