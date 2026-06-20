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
    // 权限模式：approval=逐项确认(每次操作前都要授权) / smart=智能放行(仅高风险才确认) / full=自由执行(完全不拦)
    permissionMode?: 'approval' | 'smart' | 'full'
    // ===== 多模型支持 =====
    models?: AIModelProfile[]   // 多模型档案（同/不同厂商均可）
    activeModelId?: string      // 当前手动选中的模型 id（聊天处上拉栏切换）
    autoFallback?: boolean      // 某模型请求失败时自动切换其它模型重试
    autoSceneRoute?: boolean    // 按问答场景（多模态/深度思考/普通）自动选模型
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
  }
  // 浏览器自动化配置
  browser: {
    type: BrowserType
    executablePath: string  // 自定义浏览器路径（可选）
    userDataDir: string  // 浏览器数据缓存目录（可选）
    fullscreen: boolean  // 是否全屏启动
    autoCloseBrowser: boolean  // 工作流执行结束后是否自动关闭浏览器
    launchArgs: string  // 浏览器启动参数（每行一个参数）
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
  updateDatabaseConfig: (config: Partial<GlobalConfig['database']>) => void
  updateQQConfig: (config: Partial<GlobalConfig['qq']>) => void
  updateFeishuConfig: (config: Partial<GlobalConfig['feishu']>) => void
  updateDisplayConfig: (config: Partial<GlobalConfig['display']>) => void
  updateBrowserConfig: (config: Partial<GlobalConfig['browser']>) => void
  resetConfig: () => void
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
