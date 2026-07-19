import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 浏览器类型
export type BrowserType = 'msedge' | 'chrome' | 'chromium' | 'firefox'

// 小助手适用场景标签：多模态/深度思考/普通对话
export type AssistantScene = 'vision' | 'thinking' | 'chat'

// 一个 AI 模型档案（小助手 / AI对话 通用）
export interface AIModelProfile {
  id: string
  label: string          // 显示名（用户自起，如 "GPT-4o"、"DeepSeek-Chat"）
  apiUrl: string
  apiKey: string
  model: string
  temperature?: number
  maxTokens?: number
  scenes?: AssistantScene[]  // 适用场景分组（仅小助手用；多模态/深度思考/普通）
}

// 全局默认配置
export interface GlobalConfig {
  // 系统设置
  system: {
    checkUpdateOnStartup: boolean  // 启动时是否检查更新
    autoDetectClipboardScreenshot: boolean  // 自动识别剪贴板截图
    showAIAssistantButton: boolean  // 显示右下角AI小助手入口按钮
    // 画布周围小组件显示开关（默认全部显示）
    canvasWidgets: {
      moduleCount: boolean   // 模块数量
      moduleSearch: boolean  // 画布模块搜索
      controlsHelp: boolean  // 操作说明
      minimap: boolean       // 画布概览（缩略图）
      controls: boolean      // 画布操作（缩放控制）
      viewSwitch: boolean    // 流程图/模块条视图切换
    }
  }
  // AI大脑模块默认配置
  ai: {
    apiUrl: string
    apiKey: string
    model: string
    temperature: number
    maxTokens: number
    systemPrompt: string
    imageApiKey?: string
    imageApiBase?: string
    videoApiKey?: string
    videoApiBase?: string
    // ===== 多模型支持 =====
    models?: AIModelProfile[]  // 多模型档案
    activeModelId?: string     // 默认选用的模型 id
    autoFallback?: boolean     // 请求失败自动切换其它模型重试
  }
  // AI智能爬虫模块默认配置
  aiScraper: {
    llmProvider: string
    apiUrl: string
    llmModel: string
    apiKey: string
    azureEndpoint: string
  }
  // WebRPA小助手配置
  aiAssistant: {
    apiUrl: string         // OpenAI 兼容 API 地址（支持基础地址或完整 chat/completions URL）
    apiKey: string
    model: string
    temperature: number
    maxTokens: number
    systemPrompt: string   // 用户追加的系统提示词
    enableTools: boolean   // 启用 Skills 工具调用
    autoApprove: boolean   // 自动批准工具调用（不弹确认）
    // 单模型能力声明（未配置多模型时生效）：是否多模态/思考模型
    supportsVision?: boolean   // 该模型支持多模态（图片输入）；不填则按模型名自动判断
    isThinking?: boolean       // 该模型为深度思考/推理模型（如 DeepSeek-Reasoner）
    // 权限模式：approval=逐项确认(每次操作前都要授权) / smart=智能放行(仅高风险才确认) / full=自由执行(完全不拦)
    permissionMode?: 'approval' | 'smart' | 'full'
    // ===== 多模型支持 =====
    models?: AIModelProfile[]   // 多模型档案（同/不同厂商均可）
    activeModelId?: string      // 当前手动选中的模型 id（聊天处上拉栏切换）
    autoFallback?: boolean      // 某模型请求失败时自动切换其它模型重试
    autoSceneRoute?: boolean    // 按问答场景（多模态/深度思考/普通）自动选模型
    maxHealRounds?: number      // 自愈循环最大轮数（默认 5，复杂问题可调高）
  }
  // 发送邮件模块默认配置
  email: {
    senderEmail: string
    authCode: string
    smtpServer: string
    smtpPort: number
  }
  // 邮件触发器默认配置
  emailTrigger: {
    imapServer: string
    imapPort: number
    emailAccount: string
    emailPassword: string
    checkInterval: number
  }
  // API触发器默认配置
  apiTrigger: {
    defaultHeaders: string  // JSON格式的默认请求头
    checkInterval: number
  }
  // 文件监控触发器默认配置
  fileTrigger: {
    defaultWatchPath: string
  }
  // 本地工作流文件夹配置
  workflow: {
    localFolder: string
    autoSave: boolean  // 是否自动保存工作流
    showOverwriteConfirm: boolean  // 保存时是否显示覆盖提示（默认true）
    autoSaveCopy: boolean  // 同名工作流自动创建副本保存（开启后不再弹覆盖提示，直接另存副本）
  }
  // 用户自定义快捷键：{ 功能ID: 组合键 }，如 { run_workflow: 'Ctrl+Alt+R' }
  shortcuts?: Record<string, string>
  // 数据库默认配置
  database: {
    host: string
    port: number
    user: string
    password: string
    database: string
    charset: string
  }
  // QQ自动化模块配置
  qq: {
    apiUrl: string
    accessToken: string
    contacts: Array<{
      id: string
      number: string
      remark: string
      type: 'private' | 'group'
    }>
  }
  // 飞书自动化模块配置
  feishu: {
    appId: string
    appSecret: string
  }
  // 显示设置
  display: {
    showMouseCoordinates: boolean
    handleSize: number  // 连接点尺寸（像素），默认12
    runStatusHighlight: boolean  // 运行状态高亮（默认关闭；大型工作流高速运行时闪烁会卡顿）
    theme: 'default' | 'dark' | 'gray'  // 主题：默认 / 暗色(Dark Reader滤镜) / 灰色(灰度滤镜)
  }
  // 浏览器自动化配置
  browser: {
    type: BrowserType
    executablePath: string  // 自定义浏览器路径（可选）
    userDataDir: string  // 浏览器数据缓存目录（可选）
    fullscreen: boolean  // 是否全屏启动
    autoCloseBrowser: boolean  // 工作流执行结束后是否自动关闭浏览器
    launchArgs: string  // 浏览器启动参数（每行一个参数）
    extensionDirs?: string  // 需加载的已解压浏览器扩展目录（每行一个，仅有头模式生效）
    autoCopySelector?: boolean  // 自动化浏览器选择元素后，是否自动把选择器复制到剪贴板
  }
  // SSH远程操作默认配置
  ssh?: {
    host?: string
    port?: number
    username?: string
    password?: string
    privateKey?: string
  }
}

interface GlobalConfigState {
  config: GlobalConfig
  updateSystemConfig: (config: Partial<GlobalConfig['system']>) => void
  updateAIConfig: (config: Partial<GlobalConfig['ai']>) => void
  updateAIScraperConfig: (config: Partial<GlobalConfig['aiScraper']>) => void
  updateAIAssistantConfig: (config: Partial<GlobalConfig['aiAssistant']>) => void
  updateEmailConfig: (config: Partial<GlobalConfig['email']>) => void
  updateEmailTriggerConfig: (config: Partial<GlobalConfig['emailTrigger']>) => void
  updateApiTriggerConfig: (config: Partial<GlobalConfig['apiTrigger']>) => void
  updateFileTriggerConfig: (config: Partial<GlobalConfig['fileTrigger']>) => void
  updateWorkflowConfig: (config: Partial<GlobalConfig['workflow']>) => void
  updateShortcuts: (shortcuts: Record<string, string>) => void
  updateDatabaseConfig: (config: Partial<GlobalConfig['database']>) => void
  updateQQConfig: (config: Partial<GlobalConfig['qq']>) => void
  updateFeishuConfig: (config: Partial<GlobalConfig['feishu']>) => void
  updateDisplayConfig: (config: Partial<GlobalConfig['display']>) => void
  updateBrowserConfig: (config: Partial<GlobalConfig['browser']>) => void
  resetConfig: () => void
  /** 导入整份配置（安全合并：缺失字段用默认值补齐）。返回是否成功。 */
  importConfig: (imported: unknown) => boolean
  /** 导出当前完整配置（用于下载 JSON）。 */
  exportConfig: () => GlobalConfig
}

const defaultConfig: GlobalConfig = {
  system: {
    checkUpdateOnStartup: true,  // 默认开启启动时检查更新
    autoDetectClipboardScreenshot: true,  // 默认开启自动识别剪贴板截图
    showAIAssistantButton: true,  // 默认显示AI小助手入口按钮
    canvasWidgets: {
      moduleCount: true,
      moduleSearch: true,
      controlsHelp: true,
      minimap: true,
      controls: true,
      viewSwitch: true,
    },
  },
  ai: {
    apiUrl: '',
    apiKey: '',
    model: '',
    temperature: 0.7,
    maxTokens: 2000,
    systemPrompt: '',
  },
  aiScraper: {
    llmProvider: 'ollama',
    apiUrl: '',
    llmModel: 'llama3.2',
    apiKey: '',
    azureEndpoint: '',
  },
  aiAssistant: {
    apiUrl: '',
    apiKey: '',
    model: '',
    temperature: 0.7,
    maxTokens: 4000,
    systemPrompt: '',
    enableTools: true,
    autoApprove: false,
    permissionMode: 'smart',
  },
  email: {
    senderEmail: '',
    authCode: '',
    smtpServer: 'smtp.qq.com',
    smtpPort: 465,
  },
  emailTrigger: {
    imapServer: 'imap.qq.com',
    imapPort: 993,
    emailAccount: '',
    emailPassword: '',
    checkInterval: 30,
  },
  apiTrigger: {
    defaultHeaders: '{}',
    checkInterval: 10,
  },
  fileTrigger: {
    defaultWatchPath: '',
  },
  workflow: {
    localFolder: '',  // 空字符串表示使用默认路径
    autoSave: false,  // 默认不开启自动保存
    showOverwriteConfirm: true,  // 默认显示覆盖提示
    autoSaveCopy: false,  // 默认关闭自动副本
  },
  shortcuts: {},
  database: {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: '',
    charset: 'utf8mb4',
  },
  qq: {
    apiUrl: 'http://127.0.0.1:3000',
    accessToken: '',
    contacts: [],
  },
  feishu: {
    appId: '',
    appSecret: '',
  },
  display: {
    showMouseCoordinates: false,
    handleSize: 12,  // 默认连接点尺寸12px
    runStatusHighlight: false,  // 默认关闭运行状态高亮
    theme: 'default',  // 默认主题
  },
  browser: {
    type: 'msedge',  // 默认使用 Edge 浏览器
    executablePath: '',  // 空字符串表示使用系统默认路径
    userDataDir: '',  // 空字符串表示使用默认缓存目录
    fullscreen: false,  // 默认不全屏
    autoCloseBrowser: true,  // 默认自动关闭浏览器
    launchArgs: `--disable-blink-features=AutomationControlled
--start-maximized
--ignore-certificate-errors
--ignore-ssl-errors
--disable-features=IsolateOrigins,site-per-process
--allow-running-insecure-content
--disable-infobars
--disable-notifications`,  // 默认启动参数
    extensionDirs: '',  // 默认不加载任何浏览器扩展
    autoCopySelector: true,  // 默认自动复制选择器到剪贴板
  },
}

export const useGlobalConfigStore = create<GlobalConfigState>()(
  persist(
    (set, get) => ({
      config: defaultConfig,

      updateSystemConfig: (systemConfig) => {
        set({
          config: {
            ...get().config,
            system: { ...get().config.system, ...systemConfig },
          },
        })
      },

      updateAIConfig: (aiConfig) => {
        set({
          config: {
            ...get().config,
            ai: { ...get().config.ai, ...aiConfig },
          },
        })
      },

      updateAIScraperConfig: (aiScraperConfig) => {
        set({
          config: {
            ...get().config,
            aiScraper: { ...get().config.aiScraper, ...aiScraperConfig },
          },
        })
      },

      updateAIAssistantConfig: (aiAssistantConfig) => {
        set({
          config: {
            ...get().config,
            aiAssistant: {
              ...(get().config.aiAssistant || defaultConfig.aiAssistant),
              ...aiAssistantConfig,
            },
          },
        })
      },

      updateEmailConfig: (emailConfig) => {
        set({
          config: {
            ...get().config,
            email: { ...get().config.email, ...emailConfig },
          },
        })
      },

      updateEmailTriggerConfig: (emailTriggerConfig) => {
        set({
          config: {
            ...get().config,
            emailTrigger: { ...get().config.emailTrigger, ...emailTriggerConfig },
          },
        })
      },

      updateApiTriggerConfig: (apiTriggerConfig) => {
        set({
          config: {
            ...get().config,
            apiTrigger: { ...get().config.apiTrigger, ...apiTriggerConfig },
          },
        })
      },

      updateFileTriggerConfig: (fileTriggerConfig) => {
        set({
          config: {
            ...get().config,
            fileTrigger: { ...get().config.fileTrigger, ...fileTriggerConfig },
          },
        })
      },

      updateWorkflowConfig: (workflowConfig) => {
        set({
          config: {
            ...get().config,
            workflow: { ...(get().config.workflow || defaultConfig.workflow), ...workflowConfig },
          },
        })
      },

      updateShortcuts: (shortcuts: Record<string, string>) => {
        set({
          config: {
            ...get().config,
            shortcuts: { ...(get().config.shortcuts || {}), ...shortcuts },
          },
        })
      },

      updateDatabaseConfig: (databaseConfig) => {
        set({
          config: {
            ...get().config,
            database: { ...(get().config.database || defaultConfig.database), ...databaseConfig },
          },
        })
      },

      updateQQConfig: (qqConfig) => {
        set({
          config: {
            ...get().config,
            qq: { ...(get().config.qq || defaultConfig.qq), ...qqConfig },
          },
        })
      },

      updateFeishuConfig: (feishuConfig) => {
        set({
          config: {
            ...get().config,
            feishu: { ...(get().config.feishu || defaultConfig.feishu), ...feishuConfig },
          },
        })
      },

      updateDisplayConfig: (displayConfig) => {
        set({
          config: {
            ...get().config,
            display: { ...(get().config.display || defaultConfig.display), ...displayConfig },
          },
        })
      },

      updateBrowserConfig: (browserConfig) => {
        set({
          config: {
            ...get().config,
            browser: { ...(get().config.browser || defaultConfig.browser), ...browserConfig },
          },
        })
      },

      resetConfig: () => {
        set({ config: defaultConfig })
      },

      exportConfig: () => get().config,

      importConfig: (imported) => {
        try {
          // 兼容两种格式：直接是 config 对象，或 {config: {...}} 包裹
          const raw = imported as Record<string, unknown> | null
          if (!raw || typeof raw !== 'object') return false
          const inc = (('config' in raw && raw.config && typeof raw.config === 'object')
            ? (raw.config as Record<string, unknown>)
            : (raw as Record<string, unknown>))

          // 以默认配置为基底，对每个已知顶层分节做安全合并（缺失字段用默认值补齐，
          // 未知字段忽略），避免导入残缺/旧版本 JSON 破坏结构。
          const base = defaultConfig as unknown as Record<string, any>
          const merged: Record<string, any> = { ...base }
          for (const key of Object.keys(base)) {
            const dv = base[key]
            const iv = (inc as Record<string, any>)[key]
            if (iv === undefined) continue
            if (dv && typeof dv === 'object' && !Array.isArray(dv) &&
                iv && typeof iv === 'object' && !Array.isArray(iv)) {
              merged[key] = { ...dv, ...iv }
            } else {
              merged[key] = iv
            }
          }
          // system.canvasWidgets 二级对象单独合并，保证控件开关齐全
          if (merged.system && base.system?.canvasWidgets) {
            merged.system = {
              ...merged.system,
              canvasWidgets: { ...base.system.canvasWidgets, ...(merged.system.canvasWidgets || {}) },
            }
          }
          set({ config: merged as unknown as GlobalConfig })
          return true
        } catch {
          return false
        }
      },
    }),
    {
      name: 'minghang-waf-global-config',
      // 数据迁移：确保旧数据兼容新结构
      merge: (persistedState, currentState) => {
        const persisted = persistedState as GlobalConfigState
        return {
          ...currentState,
          config: {
            ...defaultConfig,
            ...persisted?.config,
            system: {
              ...defaultConfig.system,
              ...persisted?.config?.system,
              canvasWidgets: {
                ...defaultConfig.system.canvasWidgets,
                ...(persisted?.config?.system?.canvasWidgets || {}),
              },
            },
            aiScraper: persisted?.config?.aiScraper || defaultConfig.aiScraper,
            aiAssistant: persisted?.config?.aiAssistant || defaultConfig.aiAssistant,
            workflow: persisted?.config?.workflow || defaultConfig.workflow,
            shortcuts: persisted?.config?.shortcuts || {},
            database: persisted?.config?.database || defaultConfig.database,
            qq: persisted?.config?.qq || defaultConfig.qq,
            feishu: persisted?.config?.feishu || defaultConfig.feishu,
            display: persisted?.config?.display || defaultConfig.display,
            browser: persisted?.config?.browser || defaultConfig.browser,
            emailTrigger: persisted?.config?.emailTrigger || defaultConfig.emailTrigger,
            apiTrigger: persisted?.config?.apiTrigger || defaultConfig.apiTrigger,
            fileTrigger: persisted?.config?.fileTrigger || defaultConfig.fileTrigger,
          },
        }
      },
    }
  )
)
