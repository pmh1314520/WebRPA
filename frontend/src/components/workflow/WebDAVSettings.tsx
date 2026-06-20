import { useEffect, useState } from 'react'
import { Loader2, Wifi, Save as SaveIcon } from 'lucide-react'
import { getBackendBaseUrl } from '@/services/config'

interface WebDAVConfig {
  enabled: boolean
  url: string
  username: string
  password: string
  remoteDir: string
}

const EMPTY: WebDAVConfig = { enabled: false, url: '', username: '', password: '', remoteDir: '' }

/**
 * WebDAV 设置：让工作流的保存/读取走 WebDAV（NAS、Nextcloud、坚果云等），实现多端共享。
 */
export function WebDAVSettings() {
  const [cfg, setCfg] = useState<WebDAVConfig>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`${getBackendBaseUrl()}/api/local-workflows/webdav-config`)
      .then((r) => r.json())
      .then((d) => { if (d?.config) setCfg({ ...EMPTY, ...d.config }) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const update = (patch: Partial<WebDAVConfig>) => setCfg((c) => ({ ...c, ...patch }))

  const handleSave = async () => {
    setSaving(true); setMsg(null)
    try {
      const r = await fetch(`${getBackendBaseUrl()}/api/local-workflows/webdav-config`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cfg),
      })
      const d = await r.json()
      if (d?.success) setMsg({ type: 'ok', text: cfg.enabled ? '已保存，工作流将走 WebDAV 远程目录' : '已保存（WebDAV 未启用，仍用本地目录）' })
      else setMsg({ type: 'err', text: '保存失败' })
    } catch (e) { setMsg({ type: 'err', text: `保存出错：${e}` }) } finally { setSaving(false) }
  }

  const handleTest = async () => {
    setTesting(true); setMsg(null)
    try {
      const r = await fetch(`${getBackendBaseUrl()}/api/local-workflows/webdav-test`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cfg),
      })
      const d = await r.json()
      if (d?.success) setMsg({ type: 'ok', text: '连接成功！' })
      else setMsg({ type: 'err', text: d?.error || '连接失败' })
    } catch (e) { setMsg({ type: 'err', text: `连接异常：${e}` }) } finally { setTesting(false) }
  }

  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-gray-700">WebDAV 远程存储（NAS / 网盘）</label>
          <p className="text-xs text-gray-500 mt-1">开启后，工作流的保存与读取都走 WebDAV 远程目录，可在多台设备间共享。</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer flex-none ml-3">
          <input type="checkbox" className="sr-only peer" checked={cfg.enabled} onChange={(e) => update({ enabled: e.target.checked })} />
          <div className="w-11 h-6 bg-gray-300 peer-checked:bg-blue-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
        </label>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-gray-500"><Loader2 className="w-3.5 h-3.5 animate-spin" />读取配置…</div>
      ) : (
        <div className="space-y-2">
          <input value={cfg.url} onChange={(e) => update({ url: e.target.value })} placeholder="WebDAV 地址，如 https://dav.example.com/webrpa/"
            className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 bg-white text-black" />
          <div className="grid grid-cols-2 gap-2">
            <input value={cfg.username} onChange={(e) => update({ username: e.target.value })} placeholder="用户名"
              className="px-3 py-2 text-sm rounded-md border border-gray-300 bg-white text-black" />
            <input type="password" value={cfg.password} onChange={(e) => update({ password: e.target.value })} placeholder="密码"
              className="px-3 py-2 text-sm rounded-md border border-gray-300 bg-white text-black" />
          </div>
          <input value={cfg.remoteDir} onChange={(e) => update({ remoteDir: e.target.value })} placeholder="子目录（可选），如 workflows"
            className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 bg-white text-black" />
          <div className="flex items-center gap-2">
            <button onClick={handleTest} disabled={testing || !cfg.url}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 disabled:opacity-50">
              {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}测试连接
            </button>
            <button onClick={handleSave} disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SaveIcon className="w-3.5 h-3.5" />}保存配置
            </button>
            {msg && <span className={`text-xs ${msg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</span>}
          </div>
        </div>
      )}
    </div>
  )
}
