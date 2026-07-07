import { getBackendBaseUrl } from './config'

// 获取后端 API 基础地址
function getApiBase(): string {
  return `${getBackendBaseUrl()}/api`
}

let API_BASE = getApiBase()

// 配置变化后刷新 API_BASE，确保后续请求使用最新地址
export function updateApiBase() {
  API_BASE = getApiBase()
}

// 获取当前 API 基础地址
export function getApiBaseUrl(): string {
  return API_BASE
}

// 获取后端服务 URL（不含 /api 前缀）
export function getBackendUrl(): string {
  return getBackendBaseUrl()
}

// 远程访问令牌：本机访问后端会免验（忽略此头），仅当从其它设备访问 WebRPA 时才需要在「安全设置」里填入
export function getAuthToken(): string {
  try {
    return localStorage.getItem('webrpa_token') || ''
  } catch {
    return ''
  }
}
export function setAuthToken(token: string): void {
  try {
    if (token) localStorage.setItem('webrpa_token', token)
    else localStorage.removeItem('webrpa_token')
  } catch {
    // ignore
  }
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

// 判断是否为网络连接错误
function isConnectionError(error: unknown): boolean {
  if (error instanceof TypeError) {
    const message = error.message.toLowerCase()
    return (
      message.includes('failed to fetch') ||
           message.includes('network') || 
           message.includes('fetch')
    )
  }
  return false
}

// 显示连接错误弹窗
async function showConnectionErrorDialog() {
  // 独立 Agent 窗口（?view=assistant）：后端不可达时不弹"重试"框，交由 Agent 自身的健康巡检关闭窗口
  try {
    if (new URLSearchParams(window.location.search).get('view') === 'assistant') return
  } catch { /* ignore */ }
  const existingDialog = document.getElementById('connection-error-dialog')
  if (existingDialog) return

  const dialog = document.createElement('div')
  dialog.id = 'connection-error-dialog'
  dialog.style.cssText = [
    'position:fixed', 'top:50%', 'left:50%',
    'transform:translate(-50%,-50%)', 'background:white',
    'padding:20px', 'border-radius:8px',
    'box-shadow:0 4px 6px rgba(0,0,0,.1)',
    'z-index:10000', 'max-width:400px',
  ].join(';')
  dialog.innerHTML = [
    '<h2 style="margin:0 0 10px 0;color:#d32f2f">连接失败</h2>',
    '<p style="margin:0 0 15px 0;color:#666">无法连接到后端服务，请检查：</p>',
    '<ul style="margin:0 0 15px 0;padding-left:20px;color:#666">',
    '<li>后端服务是否已启动</li>',
    '<li>端口配置是否正确</li>',
    '<li>网络连接是否正常</li>',
    '</ul>',
    '<button id="retry-btn" style="background:#1976d2;color:white;border:none;',
    'padding:8px 16px;border-radius:4px;cursor:pointer">重试</button>',
  ].join('')
  document.body.appendChild(dialog)
  document.getElementById('retry-btn')?.addEventListener('click', () => {
    dialog.remove()
    window.location.reload()
  })
}

// 调用 API 请求
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    // 确保配置已加载
    const { preloadConfig } = await import('./config')
    await preloadConfig()
    
    const url = `${API_BASE}${endpoint}`
    const isFormData = options.body instanceof FormData
    const _authToken = getAuthToken()
    const _authHeader: Record<string, string> = _authToken ? { 'X-WebRPA-Token': _authToken } : {}
    const response = await fetch(url, {
      ...options,
      headers: isFormData
        ? { ..._authHeader, ...(options.headers as Record<string, string>) }
        : { 'Content-Type': 'application/json', ..._authHeader, ...(options.headers as Record<string, string>) },
    })
    if (!response.ok) {
      // 尝试解析后端返回的详细错误信息（FastAPI 422 的 detail 字段）
      let detailMessage = ''
      try {
        const errBody = await response.json()
        if (errBody) {
          if (typeof errBody.detail === 'string') {
            detailMessage = errBody.detail
          } else if (Array.isArray(errBody.detail)) {
            detailMessage = errBody.detail
              .map((e: any) => {
                const loc = Array.isArray(e?.loc) ? e.loc.join('.') : ''
                return `${loc ? loc + ': ' : ''}${e?.msg || JSON.stringify(e)}`
              })
              .join('; ')
          } else if (typeof errBody.message === 'string') {
            detailMessage = errBody.message
          } else if (typeof errBody.error === 'string') {
            detailMessage = errBody.error
          }
        }
      } catch {
        // 忽略 JSON 解析失败
      }
      const baseError = `HTTP ${response.status}: ${response.statusText}`
      return { success: false, error: detailMessage ? `${baseError} - ${detailMessage}` : baseError }
    }
    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    if (isConnectionError(error)) {
      const shown = sessionStorage.getItem('connection-error-shown')
      if (!shown) {
        sessionStorage.setItem('connection-error-shown', 'true')
        await showConnectionErrorDialog()
      }
    }
    return { success: false, error: error instanceof Error ? error.message : '请求失败' }
  }
}

// ==================== 系统 API ====================
export const systemApi = {
  getConfig: () => apiRequest('/system/config'),
  selectFolder: (title?: string, initialDir?: string) =>
    apiRequest('/system/select-folder', { 
      method: 'POST', 
      body: JSON.stringify({ title, initialDir }) 
    }),
  selectFile: (title?: string, initialDir?: string, fileTypes?: Array<[string, string]>) =>
    apiRequest('/system/select-file', { 
      method: 'POST', 
      body: JSON.stringify({ title, initialDir, fileTypes }) 
    }),
  openUrl: (url: string) =>
    apiRequest('/system/open-url', { method: 'POST', body: JSON.stringify({ url }) }),
  setCustomHotkeys: (shortcuts: Record<string, string>) =>
    apiRequest('/system/custom-hotkeys', { method: 'POST', body: JSON.stringify({ shortcuts }) }),
  getMousePosition: () => apiRequest('/system/mouse-position'),
  takeScreenshot: (params?: any) =>
    apiRequest('/system/screenshot', { method: 'POST', body: JSON.stringify(params || {}) }),
  screenshotBase64: () =>
    apiRequest<{ success: boolean; dataUrl?: string; width?: number; height?: number; error?: string }>(
      '/system/screenshot-base64', { method: 'POST', body: '{}' }
    ),
}

// ==================== 工作流 API ====================
export const workflowApi = {
  list: () => apiRequest('/workflows'),
  get: (id: string) => apiRequest(`/workflows/${id}`),
  create: (data: any) =>
    apiRequest('/workflows', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    apiRequest(`/workflows/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiRequest(`/workflows/${id}`, { method: 'DELETE' }),
  execute: (id: string, params?: any) =>
    apiRequest(`/workflows/${id}/execute`, { method: 'POST', body: JSON.stringify(params || {}) }),
  stop: (id: string) =>
    apiRequest(`/workflows/${id}/stop`, { method: 'POST' }),
  /** 调试：从暂停处继续 */
  debugResume: (id: string) =>
    apiRequest(`/workflows/${id}/debug/resume`, { method: 'POST' }),
  /** 调试：单步执行 */
  debugStep: (id: string) =>
    apiRequest(`/workflows/${id}/debug/step`, { method: 'POST' }),
  /** 调试：运行中更新断点 */
  debugBreakpoints: (id: string, breakpoints: string[]) =>
    apiRequest(`/workflows/${id}/debug/breakpoints`, { method: 'POST', body: JSON.stringify({ breakpoints }) }),
  /** 获取本次执行收集到的完整数据（不限 20 条预览上限） */
  getFullData: (id: string) =>
    apiRequest<{ rows: Record<string, unknown>[]; columns: string[]; total: number }>(
      `/workflows/${id}/data/full`
    ),
  /** 取最近一次执行收集到的完整数据（兜底：currentExecutionWorkflowId 丢失或不一致时用） */
  getLatestFullData: () =>
    apiRequest<{ workflow_id: string; rows: Record<string, unknown>[]; columns: string[]; total: number }>(
      `/workflows/data-latest/full`
    ),
  /** 导出工作流为脚本（target: 'selenium' | 'playwright-js'） */
  exportScript: (id: string, target: string) =>
    apiRequest<{ code: string; filename: string; target: string }>(
      `/workflows/${id}/export-script?target=${encodeURIComponent(target)}`
    ),
}

// ==================== 本地工作流 API ====================
export const localWorkflowApi = {
  list: (folder?: string) => 
    apiRequest('/local-workflows/list', { 
      method: 'POST', 
      body: JSON.stringify({ folder }) 
    }),
  get: (id: string) => apiRequest(`/local-workflows/${id}`),
  save: (data: any) =>
    apiRequest('/local-workflows/save-to-folder', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiRequest(`/local-workflows/${id}`, { method: 'DELETE' }),
  import: (data: any) =>
    apiRequest('/local-workflows/import', { method: 'POST', body: JSON.stringify(data) }),
  export: (id: string) => apiRequest(`/local-workflows/${id}/export`),
  getDefaultFolder: () => apiRequest('/local-workflows/default-folder'),
  // 自愈固化（健康基线）开关
  getSelfHeal: (filename: string, folder?: string) =>
    apiRequest<{ success: boolean; enabled: boolean; selfHeal?: any; error?: string }>(
      `/local-workflows/self-heal/${encodeURIComponent(filename)}${folder ? `?folder=${encodeURIComponent(folder)}` : ''}`
    ),
  setSelfHeal: (filename: string, enabled: boolean, folder?: string) =>
    apiRequest<{ success: boolean; enabled: boolean; error?: string }>(
      '/local-workflows/self-heal', { method: 'POST', body: JSON.stringify({ filename, enabled, folder }) }
    ),
}

// ==================== 执行器 API ====================
export const executorApi = {
  execute: (data: any) =>
    apiRequest('/executor/execute', { method: 'POST', body: JSON.stringify(data) }),
  getTypes: () => apiRequest('/executor/types'),
}

// ==================== 图像资源 API ====================
export const imageAssetApi = {
  list: () => apiRequest('/image-assets'),
  listFolders: () => apiRequest('/image-assets/folders'),
  get: (id: string) => apiRequest(`/image-assets/${id}`),
  upload: (file: File, folder?: string) => {
      const formData = new FormData()
      formData.append('file', file)
    if (folder) formData.append('folder', folder)
    return apiRequest('/image-assets/upload', { method: 'POST', body: formData })
  },
  delete: (id: string) => apiRequest(`/image-assets/${id}`, { method: 'DELETE' }),
  createFolder: (name: string, parentPath?: string) =>
    apiRequest('/image-assets/folders', { method: 'POST', body: JSON.stringify({ name, parentPath }) }),
  renameFolder: (oldPath: string, newName: string) =>
    apiRequest('/image-assets/folders/rename', { method: 'PUT', body: JSON.stringify({ oldPath, newName }) }),
  deleteFolder: (folderPath: string) =>
    apiRequest('/image-assets/folders', { method: 'DELETE', body: JSON.stringify({ folderPath }) }),
  rename: (assetId: string, newName: string) =>
    apiRequest(`/image-assets/${assetId}/rename?newName=${encodeURIComponent(newName)}`, { method: 'PUT' }),
  moveAsset: (assetId: string, targetFolder?: string) =>
    apiRequest('/image-assets/move', { method: 'PUT', body: JSON.stringify({ assetId, targetFolder }) }),
}

// ==================== 数据资源 API ====================
export const dataAssetApi = {
  list: () => apiRequest('/data-assets'),
  listFolders: () => apiRequest('/data-assets/folders'),
  get: (id: string) => apiRequest(`/data-assets/${id}`),
  getSheets: (id: string) => apiRequest(`/data-assets/${id}/sheets`),
  getSheetData: (id: string, sheet: string, page?: number, pageSize?: number) =>
    apiRequest(`/data-assets/${id}/sheet-data?sheet=${encodeURIComponent(sheet)}&page=${page||1}&page_size=${pageSize||100}`),
  preview: (fileId: string, sheet?: string, maxRows?: number, maxCols?: number) => {
    const params = new URLSearchParams()
    if (sheet) params.append('sheet', sheet)
    if (maxRows) params.append('max_rows', String(maxRows))
    if (maxCols) params.append('max_cols', String(maxCols))
    const queryString = params.toString()
    return apiRequest(`/data-assets/${fileId}/preview${queryString ? '?' + queryString : ''}`)
  },
  upload: (file: File, folder?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    if (folder) formData.append('folder', folder)
    return apiRequest('/data-assets/upload', { method: 'POST', body: formData })
  },
  delete: (id: string) => apiRequest(`/data-assets/${id}`, { method: 'DELETE' }),
  createFolder: (name: string, parentPath?: string) =>
    apiRequest('/data-assets/folders', { method: 'POST', body: JSON.stringify({ name, parentPath }) }),
  renameFolder: (oldPath: string, newName: string) =>
    apiRequest('/data-assets/folders/rename', { method: 'PUT', body: JSON.stringify({ oldPath, newName }) }),
  deleteFolder: (folderPath: string) =>
    apiRequest('/data-assets/folders', { method: 'DELETE', body: JSON.stringify({ folderPath }) }),
  rename: (assetId: string, newName: string) =>
    apiRequest(`/data-assets/${assetId}/rename?newName=${encodeURIComponent(newName)}`, { method: 'PUT' }),
  moveAsset: (assetId: string, targetFolder?: string) =>
    apiRequest('/data-assets/move', { method: 'PUT', body: JSON.stringify({ assetId, targetFolder }) }),
}

// ==================== 手机自动化 API ====================
export const phoneApi = {
  listDevices: () => apiRequest('/phone/devices'),
  // 兼容别名（部分组件用 getDevices）
  getDevices: () => apiRequest('/phone/devices'),
  screenshot: (deviceId: string) =>
    apiRequest(`/phone/screenshot?device_id=${encodeURIComponent(deviceId)}`),
  // 设备详细信息（GET /phone/device/info?device_id=...）
  getInfo: (deviceId: string) =>
    apiRequest(`/phone/device/info?device_id=${encodeURIComponent(deviceId)}`),
  // 测试坐标 - 实际调用 /coordinate-picker/test
  testCoordinate: (x: number, y: number, deviceId: string) =>
    apiRequest(
      `/phone/coordinate-picker/test?x=${x}&y=${y}&device_id=${encodeURIComponent(deviceId)}`,
      { method: 'POST' }
    ),
  // 坐标拾取：启动 picker（默认允许在镜像窗口正常操作；按 Ctrl 才拾取）
  startCoordinatePicker: (deviceId: string, allowControl: boolean = true) =>
    apiRequest('/phone/coordinate-picker/start', {
      method: 'POST',
      body: JSON.stringify({
        device_id: deviceId,
        allow_control: allowControl,
      }),
    }),
  // 停止 picker（会同时停掉镜像窗口）
  stopCoordinatePicker: () =>
    apiRequest('/phone/coordinate-picker/stop', { method: 'POST' }),
  // 轮询当前已拾取的坐标
  getPickedCoordinate: () =>
    apiRequest<{ picked: boolean; x?: number; y?: number }>('/phone/coordinate-picker/coordinate'),
  startMirror: (deviceId: string, maxSize?: number, bitRate?: string, enablePointerLocation?: boolean) =>
    apiRequest('/phone/mirror/start', {
      method: 'POST',
      body: JSON.stringify({
        device_id: deviceId,
        max_size: maxSize,
        bit_rate: bitRate,
        enable_pointer_location: enablePointerLocation,
      }),
    }),
  stopMirror: (deviceId: string) =>
    apiRequest('/phone/mirror/stop', { method: 'POST', body: JSON.stringify({ device_id: deviceId }) }),
  getMirrorStatus: () => apiRequest('/phone/mirror/status'),
  captureTemplate: (deviceId: string, x: number, y: number, width: number, height: number, templateName?: string) =>
    apiRequest('/phone/screenshot/capture-template', {
      method: 'POST',
      body: JSON.stringify({
        device_id: deviceId,
        x, y, width, height,
        template_name: templateName,
      }),
    }),
  // 注：tap/swipe/inputText 等模块级操作通过 workflow executor 实现，
  // 不需要直接的 HTTP API。

  // ===== 无线连接（WiFi 调试，无需数据线） =====
  /** 连接已配对/已开启 tcpip 的设备 */
  connectWifi: (ipAddress: string, port: number = 5555) =>
    apiRequest<{ success: boolean; message?: string; error?: string }>(
      '/phone/connect/wifi',
      { method: 'POST', body: JSON.stringify({ ip_address: ipAddress, port }) }
    ),
  /** 断开 WiFi 连接 */
  disconnectWifi: (ipAddress: string, port: number = 5555) =>
    apiRequest('/phone/connect/disconnect-wifi', {
      method: 'POST',
      body: JSON.stringify({ ip_address: ipAddress, port }),
    }),
  /** Android 11+ 无线调试配对（完全无需数据线） */
  pairWireless: (ipAddress: string, pairPort: number, pairingCode: string) =>
    apiRequest<{ success: boolean; message?: string; error?: string }>(
      '/phone/connect/pair-wireless',
      {
        method: 'POST',
        body: JSON.stringify({
          ip_address: ipAddress,
          pair_port: pairPort,
          pairing_code: pairingCode,
        }),
      }
    ),
  /** 通过 USB 启用 TCP/IP 模式（仅首次需要数据线，适用 Android 10-） */
  enableTcpip: (port: number = 5555, deviceId?: string) =>
    apiRequest<{ success: boolean; message?: string; error?: string; device_ip?: string | null }>(
      '/phone/connect/enable-tcpip',
      { method: 'POST', body: JSON.stringify({ port, device_id: deviceId }) }
    ),
  /** 获取设备 WiFi IP */
  getDeviceIp: (deviceId?: string) =>
    apiRequest<{ success: boolean; ip?: string; error?: string }>(
      `/phone/connect/device-ip${deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : ''}`
    ),
}

// ==================== 定时任务 API ====================
export const scheduledTaskApi = {
  list: () => apiRequest('/scheduled-tasks/list'),
  get: (id: string) => apiRequest(`/scheduled-tasks/${id}`),
  create: (data: any) =>
    apiRequest('/scheduled-tasks', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    apiRequest(`/scheduled-tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiRequest(`/scheduled-tasks/${id}`, { method: 'DELETE' }),
  toggle: (id: string, enabled: boolean) =>
    apiRequest(`/scheduled-tasks/${id}/toggle`, { method: 'POST', body: JSON.stringify({ enabled }) }),
  execute: (id: string) =>
    apiRequest(`/scheduled-tasks/${id}/execute`, { method: 'POST' }),
  stop: (id: string) =>
    apiRequest(`/scheduled-tasks/${id}/stop`, { method: 'POST' }),
  getTaskLogs: (id: string, limit: number = 100) => 
    apiRequest(`/scheduled-tasks/${id}/logs?limit=${limit}`),
  getAllLogs: (limit: number = 100) => 
    apiRequest(`/scheduled-tasks/logs/all?limit=${limit}`),
  clearTaskLogs: (id: string) =>
    apiRequest(`/scheduled-tasks/${id}/logs`, { method: 'DELETE' }),
  clearAllLogs: () =>
    apiRequest('/scheduled-tasks/logs/all', { method: 'DELETE' }),
  getStatistics: () => 
    apiRequest('/scheduled-tasks/statistics/summary'),
}

// ==================== 自动化浏览器 API ====================
export const browserApi = {
  getStatus: () => apiRequest('/browser/status'),
  open: (url?: string, browserConfig?: any) =>
    apiRequest('/browser/open', { method: 'POST', body: JSON.stringify({ url, browserConfig }) }),
  launch: (url?: string) =>
    apiRequest('/browser/launch', { method: 'POST', body: JSON.stringify({ url }) }),
  close: () => apiRequest('/browser/close', { method: 'POST' }),
  navigate: (url: string) =>
    apiRequest('/browser/navigate', { method: 'POST', body: JSON.stringify({ url }) }),
  getUrl: () => apiRequest('/browser/url'),
  getSelector: (description: string) =>
    apiRequest('/browser/get-selector', { method: 'POST', body: JSON.stringify({ description }) }),
  startPicker: () => apiRequest('/element-picker/start', { method: 'POST', body: JSON.stringify({}) }),
  stopPicker: () => apiRequest('/element-picker/stop', { method: 'POST' }),
}

// ==================== 元素选择器 API ====================
export const elementPickerApi = {
  /**
   * 启动元素选择器
   * @param url 可选，要打开的目标页面 URL
   * @param browserConfig 可选，浏览器配置
   */
  start: (url?: string, browserConfig?: any) =>
    apiRequest('/element-picker/start', {
      method: 'POST',
      body: JSON.stringify({ url: url || null, browserConfig: browserConfig || null }),
    }),
  stop: () => apiRequest('/element-picker/stop', { method: 'POST' }),
  getResult: () => apiRequest('/element-picker/result'),
  getSelected: () => apiRequest('/element-picker/selected'),
  getSimilar: () => apiRequest('/element-picker/similar'),
  getStatus: () => apiRequest('/element-picker/status'),
  /** 在当前浏览器页面上测试选择器是否命中并高亮匹配项 */
  testSelector: (selector: string, hints?: Record<string, unknown>, highlight = true) =>
    apiRequest<{
      success: boolean
      matched?: boolean
      count?: number
      matchedSelector?: string
      isPrimary?: boolean
      element?: { tag?: string; text?: string }
      error?: string
    }>('/element-picker/test-selector', {
      method: 'POST',
      body: JSON.stringify({ selector, hints: hints || null, highlight }),
    }),
}

// ==================== 网页智能录制器 API ====================
export const recorderApi = {
  start: () => apiRequest('/recorder/start', { method: 'POST' }),
  stop: () => apiRequest('/recorder/stop', { method: 'POST' }),
  events: () => apiRequest('/recorder/events'),
  status: () => apiRequest('/recorder/status'),
}

// ==================== 访问鉴权 API ====================
export const securityApi = {
  status: () => apiRequest<{ enabled: boolean; isLocal: boolean; token: string | null }>('/security/status'),
  toggle: (enabled: boolean) =>
    apiRequest<{ success: boolean; enabled?: boolean; error?: string }>(
      '/security/toggle', { method: 'POST', body: JSON.stringify({ enabled }) }
    ),
  regenerate: () =>
    apiRequest<{ success: boolean; token?: string; error?: string }>(
      '/security/regenerate', { method: 'POST' }
    ),
}

// ==================== 桌面智能录制器 API ====================
export const desktopRecorderApi = {
  start: (excludeTitles?: string[]) => apiRequest('/desktop-recorder/start', { method: 'POST', body: JSON.stringify({ excludeTitles: excludeTitles || [] }) }),
  stop: () => apiRequest('/desktop-recorder/stop', { method: 'POST' }),
  pause: () => apiRequest('/desktop-recorder/pause', { method: 'POST' }),
  resume: () => apiRequest('/desktop-recorder/resume', { method: 'POST' }),
  events: () => apiRequest('/desktop-recorder/events'),
  status: () => apiRequest('/desktop-recorder/status'),
}

// ==================== 工作流版本管理 API（Git 式本地版本历史） ====================
export interface WorkflowVersionInfo {
  version: string
  message: string
  createdAt: string
  summary?: { nodeCount?: number; edgeCount?: number; variableCount?: number }
}
export interface WorkflowDiff {
  nodesAdded: { id: string; label: string }[]
  nodesRemoved: { id: string; label: string }[]
  nodesModified: { id: string; label: string; typeChanged: boolean; configChanged: boolean; moved: boolean }[]
  edgesAdded: number
  edgesRemoved: number
  hasChanges: boolean
}
export const workflowVersionsApi = {
  commit: (workflow: string, content: unknown, message?: string, folder?: string) =>
    apiRequest<{ success: boolean; version?: string; createdAt?: string; error?: string }>(
      '/workflow-versions/commit',
      { method: 'POST', body: JSON.stringify({ workflow, content, message, folder }) }
    ),
  list: (workflow: string, folder?: string) =>
    apiRequest<{ success: boolean; versions: WorkflowVersionInfo[]; error?: string }>(
      '/workflow-versions/list',
      { method: 'POST', body: JSON.stringify({ workflow, folder }) }
    ),
  get: (workflow: string, versionId: string, folder?: string) =>
    apiRequest<{ success: boolean; version?: string; content?: any; message?: string; createdAt?: string; error?: string }>(
      '/workflow-versions/get',
      { method: 'POST', body: JSON.stringify({ workflow, versionId, folder }) }
    ),
  remove: (workflow: string, versionId: string, folder?: string) =>
    apiRequest<{ success: boolean; error?: string }>(
      '/workflow-versions/delete',
      { method: 'POST', body: JSON.stringify({ workflow, versionId, folder }) }
    ),
  diff: (workflow: string, opts: { fromVersionId?: string; toVersionId?: string; content?: unknown; folder?: string }) =>
    apiRequest<{ success: boolean; diff?: WorkflowDiff; error?: string }>(
      '/workflow-versions/diff',
      { method: 'POST', body: JSON.stringify({ workflow, ...opts }) }
    ),
  exportBundle: (workflow: string, folder?: string) =>
    apiRequest<{ success: boolean; bundle?: any; error?: string }>(
      '/workflow-versions/export',
      { method: 'POST', body: JSON.stringify({ workflow, folder }) }
    ),
  importBundle: (workflow: string, bundle: unknown, folder?: string) =>
    apiRequest<{ success: boolean; imported?: number; error?: string }>(
      '/workflow-versions/import',
      { method: 'POST', body: JSON.stringify({ workflow, bundle, folder }) }
    ),
}

// ==================== 桌面元素选择器 API ====================
export const desktopPickerApi = {
  start: (params?: any) =>
    apiRequest('/desktop-picker/start', { method: 'POST', body: JSON.stringify(params || {}) }),
  stop: () => apiRequest('/desktop-picker/stop', { method: 'POST' }),
  // 兼容旧调用名称
  startPicker: (params?: any) =>
    apiRequest('/desktop-picker/start', { method: 'POST', body: JSON.stringify(params || {}) }),
  stopPicker: () => apiRequest('/desktop-picker/stop', { method: 'POST' }),
  getCaptured: () => apiRequest('/desktop-picker/captured'),
  waitCapture: (timeout?: number) => apiRequest(`/desktop-picker/wait-capture${timeout ? `?timeout=${timeout}` : ''}`),
  getResult: () => apiRequest('/desktop-picker/result'),
  getStatus: () => apiRequest('/desktop-picker/status'),
  getTree: (hwnd?: number) =>
    apiRequest('/desktop-picker/tree', { method: 'POST', body: JSON.stringify({ hwnd }) }),
}

// ==================== 自定义模块 API ====================
export const customModulesApi = {
  list: (params?: { category?: string; search?: string }) =>
    apiRequest(`/custom-modules${params ? `?${new URLSearchParams(params as any).toString()}` : ''}`),
  get: (id: string) => apiRequest(`/custom-modules/${id}`),
  create: (data: any) =>
    apiRequest('/custom-modules', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    apiRequest(`/custom-modules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiRequest(`/custom-modules/${id}`, { method: 'DELETE' }),
  duplicate: (id: string, newName?: string) =>
    apiRequest(`/custom-modules/${id}/duplicate`, {
      method: 'POST',
      body: JSON.stringify(newName ? { new_name: newName } : {}),
    }),
  importModule: (data: any) =>
    apiRequest(`/custom-modules/import`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  incrementUsage: (id: string) =>
    apiRequest(`/custom-modules/${id}/increment-usage`, { method: 'POST' }),
}


// ==================== 屏保弹幕 API ====================
export const screensaverApi = {
  start: (config: Record<string, unknown>) =>
    apiRequest('/screensaver/start', {
      method: 'POST',
      body: JSON.stringify({ config }),
    }),
  stop: () => apiRequest('/screensaver/stop', { method: 'POST' }),
  status: () => apiRequest<{ running: boolean; pid?: number }>('/screensaver/status'),
}

// ==================== 凭据库 API ====================
export interface CredentialItem {
  name: string
  description: string
  fields: { key: string; masked: string }[]
  created_at: string
  updated_at: string
}
export const credentialApi = {
  list: () => apiRequest<{ success: boolean; credentials: CredentialItem[] }>('/credentials'),
  names: () => apiRequest<{ success: boolean; names: string[] }>('/credentials/names'),
  upsert: (name: string, fields: Record<string, string>, description?: string) =>
    apiRequest('/credentials', {
      method: 'POST',
      body: JSON.stringify({ name, fields, description: description || '' }),
    }),
  rename: (oldName: string, newName: string) =>
    apiRequest('/credentials/rename', {
      method: 'POST',
      body: JSON.stringify({ old_name: oldName, new_name: newName }),
    }),
  delete: (name: string) =>
    apiRequest(`/credentials/${encodeURIComponent(name)}`, { method: 'DELETE' }),
}

// ==================== 留存清理 API ====================
export interface RetentionConfig {
  enabled: boolean
  recordings_max_days: number
  recordings_max_total_mb: number
  data_max_days: number
  data_max_total_mb: number
  cleanup_interval_hours: number
}
export interface RetentionUsage {
  recordings: { count: number; sizeMB: number }
  data: { count: number; sizeMB: number }
}
export const retentionApi = {
  getConfig: () =>
    apiRequest<{ success: boolean; config: RetentionConfig; usage: RetentionUsage }>('/retention/config'),
  setConfig: (config: Partial<RetentionConfig>) =>
    apiRequest<{ success: boolean; config: RetentionConfig }>('/retention/config', {
      method: 'POST',
      body: JSON.stringify(config),
    }),
  cleanup: () => apiRequest('/retention/cleanup', { method: 'POST' }),
  usage: () => apiRequest<{ success: boolean; usage: RetentionUsage }>('/retention/usage'),
}

// ==================== 工作流整包 API ====================
export const workflowBundleApi = {
  export: (name: string, content: { nodes: unknown[]; edges: unknown[]; variables?: unknown[] }) =>
    apiRequest<{ success: boolean; bundle?: unknown; error?: string }>('/workflow-bundle/export', {
      method: 'POST',
      body: JSON.stringify({ name, content }),
    }),
  import: (bundle: unknown) =>
    apiRequest<{
      success: boolean
      name?: string
      workflow?: { nodes: unknown[]; edges: unknown[]; variables: unknown[] }
      restored?: { customModules: number; images: number }
      error?: string
    }>('/workflow-bundle/import', {
      method: 'POST',
      body: JSON.stringify({ bundle }),
    }),
}


// ==================== 插件市场 API ====================
export interface PluginInfo {
  id: string
  name: string
  version?: string
  author?: string
  description?: string
  homepage?: string
  keywords?: string[]
  enabled?: boolean
  official?: boolean
  moduleIds?: string[]
}

export const pluginApi = {
  installed: () =>
    apiRequest<{ success: boolean; plugins: PluginInfo[] }>('/plugins/installed'),
  market: () =>
    apiRequest<{ success: boolean; source?: string; plugins: PluginInfo[] }>('/plugins/market'),
  getMarketUrl: () => apiRequest<{ success: boolean; url: string }>('/plugins/market-url'),
  setMarketUrl: (url: string) =>
    apiRequest<{ success: boolean }>('/plugins/market-url', { method: 'POST', body: JSON.stringify({ url }) }),
  installPackage: (pkg: unknown) =>
    apiRequest<{ success: boolean; id?: string; moduleCount?: number; error?: string }>(
      '/plugins/install', { method: 'POST', body: JSON.stringify({ package: pkg }) }
    ),
  installFromMarket: (pluginId: string) =>
    apiRequest<{ success: boolean; error?: string }>(`/plugins/install-from-market/${encodeURIComponent(pluginId)}`, { method: 'POST' }),
  setEnabled: (pluginId: string, enabled: boolean) =>
    apiRequest<{ success: boolean; enabled?: boolean; error?: string }>(
      `/plugins/${encodeURIComponent(pluginId)}/enable`, { method: 'POST', body: JSON.stringify({ enabled }) }
    ),
  uninstall: (pluginId: string) =>
    apiRequest<{ success: boolean; error?: string }>(`/plugins/${encodeURIComponent(pluginId)}`, { method: 'DELETE' }),
  exportPackage: (pluginId: string) =>
    apiRequest<{ success: boolean; package?: unknown; error?: string }>(
      `/plugins/${encodeURIComponent(pluginId)}/export`
    ),
  publish: (pluginId: string, hubUrl?: string) =>
    apiRequest<{ success: boolean; published?: boolean; package?: unknown; exportedPath?: string; error?: string }>(
      `/plugins/${encodeURIComponent(pluginId)}/publish`, { method: 'POST', body: JSON.stringify({ hubUrl: hubUrl || '' }) }
    ),
  getReviews: (pluginId: string) =>
    apiRequest<{ success: boolean; reviews: PluginReview[]; summary: { count: number; average: number } }>(
      `/plugins/${encodeURIComponent(pluginId)}/reviews`
    ),
  addReview: (pluginId: string, rating: number, comment?: string, user?: string) =>
    apiRequest<{ success: boolean; review?: PluginReview; summary?: { count: number; average: number }; error?: string }>(
      `/plugins/${encodeURIComponent(pluginId)}/reviews`,
      { method: 'POST', body: JSON.stringify({ rating, comment: comment || '', user: user || '匿名用户' }) }
    ),
}

export interface PluginReview {
  id: string
  user: string
  rating: number
  comment: string
  createdAt: string
}


// ==================== 赞助与致谢 API ====================
export interface SponsorItem {
  name: string
  date?: string
  amount?: string
}
export const sponsorApi = {
  /** 赞助者名单（从 README 解析，随版本更新，非实时） */
  list: () => apiRequest<{ sponsors: SponsorItem[]; count: number }>('/sponsors/list'),
  /** 收款码是否已配置 */
  status: () => apiRequest<{ wechat: boolean; alipay: boolean }>('/sponsors/status'),
  /** 收款码图片直链（带时间戳避免缓存旧图） */
  qrUrl: (kind: 'wechat' | 'alipay') => `${getBackendUrl()}/api/sponsors/qr/${kind}?t=${Date.now()}`,
}
