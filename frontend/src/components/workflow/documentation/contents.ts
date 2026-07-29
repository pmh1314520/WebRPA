/**
 * 教学文档懒加载索引
 *
 * 之前所有 content-*.ts 都是 import 在文件顶部静态加载，导致打开教学文档弹窗的瞬间
 * 全部 markdown 字符串（数十篇、数 MB）一次性进 bundle，前端会卡顿。
 *
 * 现在改用 Vite 的 import.meta.glob（懒加载模式），每个文档只在被实际查看或参与搜索
 * 时才异步加载，加载后写进内存缓存。
 */

// Vite glob: 懒加载（不带 eager，每个匹配项都返回一个 () => Promise<Module>）
const loaders = import.meta.glob<{ [k: string]: string }>('./content-*.ts')

// 首页文档预先 eager import（小文件，进 bundle 后打开教学文档可立即显示首页内容，不等待 chunk 加载）
import { gettingStartedContent } from './content-getting-started'
// 当前界面语言（教学文档英文版按语言切换；缺失英文版时回退中文）
import { getLang } from '@/lib/uiI18n'

// 文件名 → 文档 id 映射（与 documents.ts 中的 id 保持一致）
const FILE_TO_DOC_ID: Record<string, string> = {
  'content-getting-started': 'getting-started',
  'content-ai-assistant': 'ai-assistant-guide',
  'content-browser': 'browser-guide',
  'content-basic': 'basic-modules',
  'content-variables': 'variables-guide',
  'content-data': 'data-processing',
  'content-math-flow': 'math-flow-guide',
  'content-excel': 'excel-guide',
  'content-word': 'word-guide',
  'content-database': 'database-guide',
  'content-network': 'network-guide',
  'content-triggers': 'triggers-guide',
  'content-scheduled-tasks': 'scheduled-tasks-guide',
  'content-custom-modules': 'custom-modules-guide',
  'content-plugin-dev': 'plugin-dev-guide',
  'content-platform': 'platform-guide',
  'content-advanced': 'advanced-features',
  'content-ai-vision': 'ai-vision-guide',
  'content-desktop': 'desktop-guide',
  'content-input': 'input-guide',
  'content-image': 'image-guide',
  'content-files': 'files-guide',
  'content-pdf': 'pdf-guide',
  'content-media': 'media-guide',
  'content-phone': 'phone-guide',
  'content-bots': 'bots-guide',
  'content-notify': 'notify-guide',
  'content-ssh': 'ssh-guide',
  'content-share': 'share-guide',
  'content-utils': 'utils-guide',
  'content-test-report': 'test-report-guide',
  'content-sap': 'sap-guide',
  'content-feishu': 'feishu-guide',
  'content-selector': 'selector-guide',
  'content-notifications': 'notifications-guide',
  'content-debug': 'debug-guide',
  'content-cases': 'practical-cases',
  'content-patterns': 'workflow-patterns',
  'content-tips': 'tips-tricks',
}

// 按 docId 索引的 lazy loader
const docIdToLoader = new Map<string, () => Promise<{ [k: string]: string }>>()
// 英文版 loader（文件名形如 content-xxx.en.ts）
const docIdToLoaderEn = new Map<string, () => Promise<{ [k: string]: string }>>()
for (const [path, loader] of Object.entries(loaders)) {
  // path: './content-xxx.ts' 或 './content-xxx.en.ts'
  const fileBase = path.replace(/^\.\//, '').replace(/\.ts$/, '')
  if (fileBase.endsWith('.en')) {
    const zhBase = fileBase.replace(/\.en$/, '')
    const docId = FILE_TO_DOC_ID[zhBase]
    if (docId) docIdToLoaderEn.set(docId, loader as () => Promise<{ [k: string]: string }>)
  } else {
    const docId = FILE_TO_DOC_ID[fileBase]
    if (docId) docIdToLoader.set(docId, loader as () => Promise<{ [k: string]: string }>)
  }
}

// 内存缓存：`${lang}:${docId}` → 已解析的 markdown 字符串
const contentCache = new Map<string, string>()
// 进行中的加载 promise 缓存，避免并发重复加载
const inflight = new Map<string, Promise<string>>()

// 预填首页文档中文版（让弹窗第一次打开时无延迟显示）
contentCache.set('zh:getting-started', gettingStartedContent)

/** 异步获取某文档的 markdown 内容；命中缓存则同步返回。英文模式优先英文版，缺失则回退中文。 */
export async function loadDocContent(docId: string): Promise<string> {
  const lang = getLang()
  const cacheKey = `${lang}:${docId}`
  const cached = contentCache.get(cacheKey)
  if (cached !== undefined) return cached

  const pending = inflight.get(cacheKey)
  if (pending) return pending

  // 英文模式：优先英文 loader；无英文版则回退中文 loader
  const loader = (lang === 'en' && docIdToLoaderEn.get(docId)) || docIdToLoader.get(docId)
  if (!loader) {
    contentCache.set(cacheKey, '')
    return ''
  }

  const p = (async () => {
    try {
      const mod = await loader()
      // 取模块中第一个非空的 string export 作为内容（兼容各文件 export 命名）
      let text = ''
      for (const v of Object.values(mod)) {
        if (typeof v === 'string') {
          text = v
          break
        }
      }
      contentCache.set(cacheKey, text)
      return text
    } catch (e) {
      console.error('[documentation] 加载失败', docId, e)
      contentCache.set(cacheKey, '')
      return ''
    } finally {
      inflight.delete(cacheKey)
    }
  })()
  inflight.set(cacheKey, p)
  return p
}

/** 同步返回缓存中的内容（无缓存返回 undefined）。 */
export function getCachedContent(docId: string): string | undefined {
  return contentCache.get(`${getLang()}:${docId}`)
}

/** 预热：批量异步加载（可被搜索/下载全部触发）。 */
export async function loadAllContents(docIds: string[]): Promise<Record<string, string>> {
  const results: Record<string, string> = {}
  await Promise.all(
    docIds.map(async (id) => {
      results[id] = await loadDocContent(id)
    }),
  )
  return results
}

/** 兼容旧 API：仍导出 documentContents（内容是同步可读，未加载时返回 ''），用于不便改写的旧调用点。 */
export const documentContents: Record<string, string> = new Proxy(
  {},
  {
    get(_t, key: string) {
      return contentCache.get(`${getLang()}:${key}`) ?? ''
    },
  },
) as Record<string, string>
