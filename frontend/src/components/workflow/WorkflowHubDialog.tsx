/**
 * 工作流仓库对话框
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  X,
  Search,
  Download,
  Upload,
  RefreshCw,
  Settings,
  Package,
  User,
  Calendar,
  Tag,
  AlertCircle,
  CheckCircle,
  Loader2,
  FileUp,
  FileJson,
  Plus,
  Trash2,
  Edit,
  FolderOpen,
  Copy,
  Key,
  MessageSquare,
  Send,
  Users,
  Link,
  Unlink,
  Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectNative as Select } from '@/components/ui/select-native'
import { useWorkflowStore } from '@/store/workflowStore'
import { customModulesApi } from '@/services/api'
import type { CustomModule } from '@/types/customModule'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { DialogPortal } from '@/components/ui/dialog-portal'
import { remoteService, type RemoteSession } from '@/services/remote'
import { PluginMarketPanel } from './PluginMarketPanel'

// 默认仓库地址
const DEFAULT_HUB_URL = 'https://hub.pmhs.top'

// 从 localStorage 获取仓库地址
function getHubUrl(): string {
  return localStorage.getItem('workflow_hub_url') || DEFAULT_HUB_URL
}

// 保存仓库地址到 localStorage
function setHubUrl(url: string) {
  localStorage.setItem('workflow_hub_url', url)
}

// 获取或生成客户端 ID
function getClientId(): string {
  let clientId = localStorage.getItem('workflow_hub_client_id')
  if (!clientId) {
    // 生成一个随机的客户端 ID
    clientId = 'client_' + Math.random().toString(36).substring(2) + Date.now().toString(36)
    localStorage.setItem('workflow_hub_client_id', clientId)
  }
  return clientId
}

// 工作流类型
interface HubWorkflow {
  id: string
  name: string
  description: string
  author: string
  category: string
  tags: string[]
  node_count: number
  download_count: number
  comment_count?: number
  created_at: string
  content?: {
    nodes: unknown[]
    edges: unknown[]
    variables: unknown[]
  }
}

interface Category {
  name: string
  count: number
}

// 在线社区自定义模块类型
interface HubCustomModule {
  id: string
  name: string
  display_name: string
  description: string
  icon: string
  color: string
  author: string
  category: string
  tags: string[]
  version: string
  node_count: number
  download_count: number
  comment_count?: number
  avg_rating?: number
  created_at: string
  content?: CustomModule
}

// 在线社区模块评论
interface HubModuleComment {
  id: number
  nickname: string
  content: string
  rating: number
  created_at: string
  isOwner: boolean
}

// 评论类型
interface Comment {
  id: number
  nickname: string
  content: string
  comment_type: string
  created_at: string
  isOwner: boolean
}

// 留言类型
interface GuestbookMessage {
  id: number
  nickname: string
  content: string
  message_type: string
  created_at: string
  isOwner: boolean
}

// 评论类型选项
const COMMENT_TYPES = ['使用心得', '问题求助', '建议改进', '感谢', '其他']

// 留言类型选项
const MESSAGE_TYPES = ['建议', '问题求助', 'Bug报告', '功能请求', '闲聊', '其他']

// 缓存数据结构
interface CacheData {
  workflows: HubWorkflow[]
  categories: Category[]
  hasMore: boolean
  sortBy: string
  category: string
  search: string
  hubUrl: string
}

interface Props {
  open: boolean
  onClose: () => void
}

export function WorkflowHubDialog({ open, onClose }: Props) {
  const { nodes, edges, variables, importWorkflow, mergeWorkflow } = useWorkflowStore()
  const { confirm, alert, ConfirmDialog } = useConfirm()

  // 缓存引用（跨渲染保持）
  const cacheRef = useRef<CacheData | null>(null)
  const hasLoadedRef = useRef(false)
  const listContainerRef = useRef<HTMLDivElement>(null)

  // 状态
  const [activeTab, setActiveTab] = useState<'browse' | 'publish' | 'my' | 'custom_modules' | 'plugins' | 'guestbook' | 'remote' | 'settings'>('browse')
  
  // 自定义模块仓库状态（本地自定义模块的浏览/管理）
  const [customModules, setCustomModules] = useState<CustomModule[]>([])
  const [customModulesLoading, setCustomModulesLoading] = useState(false)
  const [customModulesError, setCustomModulesError] = useState<string | null>(null)
  const [customModuleSearchQuery, setCustomModuleSearchQuery] = useState('')
  const [selectedCustomModuleCategory, setSelectedCustomModuleCategory] = useState('全部')
  const customModulesLoadedRef = useRef(false)
  const [hubUrl, setHubUrlState] = useState(getHubUrl())
  const [tempHubUrl, setTempHubUrl] = useState(hubUrl)
  const [tempClientId, setTempClientId] = useState('')

  // 自定义模块：本地/在线社区视图切换
  const [customModuleView, setCustomModuleView] = useState<'local' | 'online'>('local')
  // 在线社区状态
  const [hubModules, setHubModules] = useState<HubCustomModule[]>([])
  const [hubModulesLoading, setHubModulesLoading] = useState(false)
  const [hubModulesError, setHubModulesError] = useState<string | null>(null)
  const [hubModuleSearch, setHubModuleSearch] = useState('')
  const [hubModuleCategory, setHubModuleCategory] = useState('全部')
  const [hubModuleSort, setHubModuleSort] = useState<'newest' | 'popular' | 'downloads'>('newest')
  const [hubModuleScope, setHubModuleScope] = useState<'all' | 'mine'>('all')
  const [downloadingHubModuleId, setDownloadingHubModuleId] = useState<string | null>(null)
  // 发布本地模块到社区
  const [publishingModule, setPublishingModule] = useState<CustomModule | null>(null)
  const [publishModuleAuthor, setPublishModuleAuthor] = useState('')
  const [publishModuleSubmitting, setPublishModuleSubmitting] = useState(false)
  const [publishModuleError, setPublishModuleError] = useState<string | null>(null)
  // 社区模块：收藏（本地 localStorage）
  const [hubFavorites, setHubFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('hub_module_favorites') || '[]') } catch { return [] }
  })
  // 社区模块详情（评论/评分/举报）
  const [detailModule, setDetailModule] = useState<HubCustomModule | null>(null)
  const [moduleComments, setModuleComments] = useState<HubModuleComment[]>([])
  const [moduleAvgRating, setModuleAvgRating] = useState(0)
  const [commentInput, setCommentInput] = useState('')
  const [commentNick, setCommentNick] = useState('')
  const [commentRating, setCommentRating] = useState(0)
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  // 社区模块：编辑自己发布的元信息
  const [editingHubModule, setEditingHubModule] = useState<HubCustomModule | null>(null)
  const [editHubForm, setEditHubForm] = useState({ display_name: '', description: '', category: '其他', tags: '', version: '' })
  const [editHubSubmitting, setEditHubSubmitting] = useState(false)

  // 浏览状态
  const [workflows, setWorkflows] = useState<HubWorkflow[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState('全部')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'downloads'>('newest')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 发布状态
  const [publishName, setPublishName] = useState('')
  const [publishDescription, setPublishDescription] = useState('')
  const [publishAuthor, setPublishAuthor] = useState('')
  const [publishCategory, setPublishCategory] = useState('其他')
  const [publishTags, setPublishTags] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [publishSuccess, setPublishSuccess] = useState(false)
  
  // 文件上传状态
  const [publishMode, setPublishMode] = useState<'current' | 'file'>('current')
  const [uploadedWorkflow, setUploadedWorkflow] = useState<{
    nodes: unknown[]
    edges: unknown[]
    variables?: unknown[]
  } | null>(null)
  const [uploadFileName, setUploadFileName] = useState('')

  // 详情状态
  const [selectedWorkflow, setSelectedWorkflow] = useState<HubWorkflow | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // 我的工作流状态
  const [myWorkflows, setMyWorkflows] = useState<HubWorkflow[]>([])
  const [myWorkflowsLoading, setMyWorkflowsLoading] = useState(false)
  const [myWorkflowsError, setMyWorkflowsError] = useState<string | null>(null)

  // 编辑状态
  const [editingWorkflow, setEditingWorkflow] = useState<HubWorkflow | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editAuthor, setEditAuthor] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editTags, setEditTags] = useState('')
  const [updating, setUpdating] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  
  // 编辑工作流内容状态
  const [editContentMode, setEditContentMode] = useState<'none' | 'current' | 'file'>('none')
  const [editUploadedWorkflow, setEditUploadedWorkflow] = useState<{
    nodes: unknown[]
    edges: unknown[]
    variables?: unknown[]
  } | null>(null)
  const [editUploadFileName, setEditUploadFileName] = useState('')

  // 评论状态
  const [comments, setComments] = useState<Comment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsPage, setCommentsPage] = useState(1)
  const [commentsHasMore, setCommentsHasMore] = useState(true)
  const [commentNickname, setCommentNickname] = useState('')
  const [commentContent, setCommentContent] = useState('')
  const [commentType, setCommentType] = useState('使用心得')
  const [submittingComment, setSubmittingComment] = useState(false)

  // 留言板状态
  const [guestbookMessages, setGuestbookMessages] = useState<GuestbookMessage[]>([])
  const [guestbookLoading, setGuestbookLoading] = useState(false)
  const [guestbookPage, setGuestbookPage] = useState(1)
  const [guestbookHasMore, setGuestbookHasMore] = useState(true)
  const [guestbookNickname, setGuestbookNickname] = useState('')
  const [guestbookContent, setGuestbookContent] = useState('')
  const [guestbookType, setGuestbookType] = useState('建议')
  const [submittingGuestbook, setSubmittingGuestbook] = useState(false)

  // 远程协助状态
  const [remoteMode, setRemoteMode] = useState<'none' | 'host' | 'guest'>('none')
  const [remoteStatus, setRemoteStatus] = useState<RemoteSession['status']>('disconnected')
  const [remoteAssistCode, setRemoteAssistCode] = useState('')
  const [remoteInputCode, setRemoteInputCode] = useState('')
  const [remoteLoading, setRemoteLoading] = useState(false)
  const [remoteError, setRemoteError] = useState<string | null>(null)
  const [remoteGuestConnected, setRemoteGuestConnected] = useState(false)
  const [remoteConnectionType, setRemoteConnectionType] = useState<'p2p' | 'relay' | null>(null)

  // 加载分类
  const loadCategories = useCallback(async () => {
    try {
      const response = await fetch(`${hubUrl}/api/workflows/categories`)
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      }
    } catch (e) {
      console.error('加载分类失败:', e)
    }
  }, [hubUrl])

  // 加载我的工作流
  const loadMyWorkflows = useCallback(async () => {
    setMyWorkflowsLoading(true)
    setMyWorkflowsError(null)

    try {
      const response = await fetch(`${hubUrl}/api/workflows/my-workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: getClientId() }),
      })

      if (!response.ok) {
        throw new Error('加载失败')
      }

      const data = await response.json()
      setMyWorkflows(data.workflows || [])
    } catch (e) {
      setMyWorkflowsError('无法加载我的工作流')
      setMyWorkflows([])
    } finally {
      setMyWorkflowsLoading(false)
    }
  }, [hubUrl])

  // 加载工作流评论
  const loadComments = useCallback(async (workflowId: string, append = false) => {
    if (append && !commentsHasMore) return

    setCommentsLoading(true)
    try {
      const currentPage = append ? commentsPage : 1
      const clientId = getClientId()
      const response = await fetch(`${hubUrl}/api/comments/${workflowId}?page=${currentPage}&limit=10&clientId=${encodeURIComponent(clientId)}`)
      if (response.ok) {
        const data = await response.json()
        const newComments = data.comments || []
        const totalPages = data.pagination?.totalPages || 1

        if (append) {
          setComments(prev => [...prev, ...newComments])
          setCommentsPage(currentPage + 1)
        } else {
          setComments(newComments)
          setCommentsPage(2)
        }
        setCommentsHasMore(currentPage < totalPages)
      }
    } catch (e) {
      console.error('加载评论失败:', e)
    } finally {
      setCommentsLoading(false)
    }
  }, [hubUrl, commentsPage, commentsHasMore])

  // 发布评论
  const handleSubmitComment = async (workflowId: string) => {
    if (!commentContent.trim()) return

    setSubmittingComment(true)
    try {
      const response = await fetch(`${hubUrl}/api/comments/${workflowId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: commentNickname.trim() || '匿名用户',
          content: commentContent.trim(),
          commentType: commentType,
          clientId: getClientId(),
        }),
      })

      if (response.ok) {
        setCommentContent('')
        // 重置分页，重新加载评论
        setCommentsPage(1)
        setCommentsHasMore(true)
        setComments([])
        loadComments(workflowId, false)
      } else {
        const data = await response.json()
        await alert(data.error || '评论发布失败', { title: '发布失败' })
      }
    } catch (e) {
      await alert('网络错误，请稍后重试', { title: '发布失败' })
    } finally {
      setSubmittingComment(false)
    }
  }

  // 删除评论
  const handleDeleteComment = async (commentId: number) => {
    const confirmed = await confirm('确定要删除这条评论吗？', {
      title: '删除评论',
      type: 'warning',
      confirmText: '删除',
      cancelText: '取消'
    })
    if (!confirmed) return

    try {
      const response = await fetch(`${hubUrl}/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: getClientId() }),
      })

      if (response.ok) {
        // 从列表中移除该评论
        setComments(prev => prev.filter(c => c.id !== commentId))
      } else {
        const data = await response.json()
        await alert(data.error || '删除失败', { title: '删除失败' })
      }
    } catch (e) {
      await alert('网络错误，请稍后重试', { title: '删除失败' })
    }
  }

  // 加载留言板
  const loadGuestbook = useCallback(async (append = false) => {
    if (append && !guestbookHasMore) return

    setGuestbookLoading(true)
    try {
      const currentPage = append ? guestbookPage : 1
      const clientId = getClientId()
      const response = await fetch(`${hubUrl}/api/guestbook?page=${currentPage}&limit=10&clientId=${encodeURIComponent(clientId)}`)
      if (response.ok) {
        const data = await response.json()
        const newMessages = data.messages || []
        const totalPages = data.pagination?.totalPages || 1

        if (append) {
          setGuestbookMessages(prev => [...prev, ...newMessages])
          setGuestbookPage(currentPage + 1)
        } else {
          // 首次/刷新加载：保留刚刚乐观追加但服务端尚未拉到的消息（用内容+昵称去重）
          setGuestbookMessages(prev => {
            const realKeys = new Set(
              newMessages.map((m: GuestbookMessage) => `${m.nickname}|${m.content}`)
            )
            const optimisticOnly = prev.filter(m => !realKeys.has(`${m.nickname}|${m.content}`))
            return [...optimisticOnly, ...newMessages]
          })
          setGuestbookPage(2)
        }
        setGuestbookHasMore(currentPage < totalPages)
      }
    } catch (e) {
      console.error('加载留言板失败:', e)
    } finally {
      setGuestbookLoading(false)
    }
  }, [hubUrl, guestbookPage, guestbookHasMore])

  // 发布留言
  const handleSubmitGuestbook = async () => {
    if (!guestbookContent.trim()) return

    setSubmittingGuestbook(true)
    try {
      const nickname = guestbookNickname.trim() || '匿名用户'
      const content = guestbookContent.trim()
      const messageType = guestbookType
      const response = await fetch(`${hubUrl}/api/guestbook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname,
          content,
          messageType,
          clientId: getClientId(),
        }),
      })

      if (response.ok) {
        // 乐观追加：服务器可能存在写入与读取的延迟（CDN/缓存/异步），
        // 立刻把刚发的内容插到列表头，让用户看到反馈。
        let serverMsg: any = null
        try {
          const respData = await response.clone().json()
          serverMsg = respData?.message || respData?.data || null
        } catch {}
        const optimistic: GuestbookMessage = {
          id: serverMsg?.id ?? Date.now(),
          nickname,
          content,
          message_type: serverMsg?.message_type ?? messageType,
          created_at: serverMsg?.created_at ?? new Date().toISOString(),
          isOwner: true,
        }
        setGuestbookMessages(prev => {
          // 避免与服务器返回真实数据后重复
          if (optimistic.id && prev.some(m => m.id === optimistic.id)) return prev
          return [optimistic, ...prev]
        })
        setGuestbookContent('')
        setGuestbookPage(1)
        setGuestbookHasMore(true)
        // 短暂延迟后再拉取，等待远端持久化完成
        setTimeout(() => {
          loadGuestbook(false)
        }, 500)
      } else {
        let errMsg = '留言发布失败'
        try {
          const data = await response.json()
          errMsg = data.error || data.message || errMsg
        } catch {}
        await alert(`${errMsg}（HTTP ${response.status}）`, { title: '发布失败' })
      }
    } catch (e) {
      await alert(`网络错误，请稍后重试：${e instanceof Error ? e.message : String(e)}`, { title: '发布失败' })
    } finally {
      setSubmittingGuestbook(false)
    }
  }

  // 删除留言
  const handleDeleteGuestbook = async (messageId: number) => {
    const confirmed = await confirm('确定要删除这条留言吗？', {
      title: '删除留言',
      type: 'warning',
      confirmText: '删除',
      cancelText: '取消'
    })
    if (!confirmed) return

    try {
      const response = await fetch(`${hubUrl}/api/guestbook/${messageId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: getClientId() }),
      })

      if (response.ok) {
        // 从列表中移除该留言
        setGuestbookMessages(prev => prev.filter(m => m.id !== messageId))
      } else {
        const data = await response.json()
        await alert(data.error || '删除失败', { title: '删除失败' })
      }
    } catch (e) {
      await alert('网络错误，请稍后重试', { title: '删除失败' })
    }
  }

  // 远程协助 - 创建协助码
  const handleCreateRemoteSession = async () => {
    setRemoteLoading(true)
    setRemoteError(null)

    const result = await remoteService.createSession()
    
    if (result.success && result.assistCode) {
      setRemoteMode('host')
      setRemoteAssistCode(result.assistCode)
      setRemoteStatus('waiting')
    } else {
      setRemoteError(result.error || '创建失败')
    }
    
    setRemoteLoading(false)
  }

  // 远程协助 - 加入协助
  const handleJoinRemoteSession = async () => {
    if (!remoteInputCode.trim() || remoteInputCode.length !== 6) {
      setRemoteError('请输入6位协助码')
      return
    }

    setRemoteLoading(true)
    setRemoteError(null)

    const result = await remoteService.joinSession(remoteInputCode.trim())
    
    if (result.success) {
      setRemoteMode('guest')
      setRemoteAssistCode(remoteInputCode.trim())
      setRemoteStatus('connecting')
    } else {
      setRemoteError(result.error || '加入失败')
    }
    
    setRemoteLoading(false)
  }

  // 远程协助 - 断开连接
  const handleCloseRemoteSession = async () => {
    await remoteService.closeSession()
    setRemoteMode('none')
    setRemoteAssistCode('')
    setRemoteInputCode('')
    setRemoteStatus('disconnected')
    setRemoteGuestConnected(false)
    setRemoteError(null)
  }

  // 监听远程协助状态变化
  useEffect(() => {
    const unsubStatus = remoteService.onStatus((status, info) => {
      setRemoteStatus(status)
      // 更新连接类型
      setRemoteConnectionType(remoteService.getConnectionType())
      if (status === 'disconnected' && info) {
        setRemoteError(info)
        setRemoteMode('none')
        setRemoteAssistCode('')
        setRemoteGuestConnected(false)
        setRemoteConnectionType(null)
      }
    })

    const unsubGuest = remoteService.onGuestStatus((connected) => {
      setRemoteGuestConnected(connected)
      
      // 当 guest 连接时，host 发送完整画布数据
      if (connected && remoteMode === 'host') {
        // 延迟一点发送，确保 guest 已准备好接收
        setTimeout(() => {
          remoteService.send({
            type: 'full_sync',
            nodes,
            edges,
            variables,
          })
        }, 500)
      }
    })

    return () => {
      unsubStatus()
      unsubGuest()
    }
  }, [remoteMode, nodes, edges, variables])

  // 弹窗关闭时清理远程协助
  useEffect(() => {
    if (!open && remoteMode !== 'none') {
      // 弹窗关闭但远程协助仍在进行，不断开连接
      // 用户可以继续使用远程协助功能
    }
  }, [open, remoteMode])

  // 开始编辑工作流
  const startEditWorkflow = (workflow: HubWorkflow) => {
    setEditingWorkflow(workflow)
    setEditName(workflow.name)
    setEditDescription(workflow.description || '')
    setEditAuthor(workflow.author || '')
    setEditCategory(workflow.category || '其他')
    setEditTags(workflow.tags?.join(', ') || '')
    setUpdateError(null)
    setEditContentMode('none')
    setEditUploadedWorkflow(null)
    setEditUploadFileName('')
  }

  // 取消编辑
  const cancelEdit = () => {
    setEditingWorkflow(null)
    setUpdateError(null)
    setEditContentMode('none')
    setEditUploadedWorkflow(null)
    setEditUploadFileName('')
  }

  // 处理编辑时的文件上传
  const handleEditFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.json')) {
      setUpdateError('请上传 JSON 格式的文件')
      return
    }

    if (file.size > 1024 * 1024) {
      setUpdateError('文件大小不能超过 1MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = JSON.parse(e.target?.result as string)
        
        if (!content || typeof content !== 'object') {
          setUpdateError('无效的 JSON 文件')
          return
        }

        if (!Array.isArray(content.nodes)) {
          setUpdateError('无效的工作流文件：缺少 nodes 字段')
          return
        }

        if (!Array.isArray(content.edges)) {
          setUpdateError('无效的工作流文件：缺少 edges 字段')
          return
        }

        if (content.nodes.length === 0) {
          setUpdateError('工作流文件中没有任何节点')
          return
        }

        setEditUploadedWorkflow({
          nodes: content.nodes,
          edges: content.edges,
          variables: content.variables || []
        })
        setEditUploadFileName(file.name)
        setUpdateError(null)
        setEditContentMode('file')
      } catch {
        setUpdateError('JSON 解析失败，请检查文件格式')
      }
    }
    reader.onerror = () => {
      setUpdateError('文件读取失败')
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  // 清除编辑时上传的文件
  const handleClearEditUpload = () => {
    setEditUploadedWorkflow(null)
    setEditUploadFileName('')
    setEditContentMode('none')
    setUpdateError(null)
  }

  // 更新工作流
  const handleUpdateWorkflow = async () => {
    if (!editingWorkflow) return

    if (!editName.trim()) {
      setUpdateError('请输入工作流名称')
      return
    }

    // 如果选择了更新内容，验证内容
    let workflowContent = null
    if (editContentMode === 'current') {
      if (nodes.length === 0) {
        setUpdateError('当前工作流为空，无法更新')
        return
      }
      workflowContent = { nodes, edges, variables }
    } else if (editContentMode === 'file') {
      if (!editUploadedWorkflow) {
        setUpdateError('请先上传工作流文件')
        return
      }
      workflowContent = editUploadedWorkflow
    }

    setUpdating(true)
    setUpdateError(null)

    try {
      const tagsArray = editTags
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 5)

      const updateData: Record<string, unknown> = {
        clientId: getClientId(),
        name: editName.trim(),
        description: editDescription.trim(),
        author: editAuthor.trim() || '匿名',
        category: editCategory,
        tags: tagsArray,
      }

      // 如果有新的工作流内容，添加到更新数据中
      if (workflowContent) {
        updateData.content = workflowContent
      }

      const response = await fetch(`${hubUrl}/api/workflows/${editingWorkflow.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '更新失败')
      }

      const successMsg = workflowContent ? '工作流信息和内容已更新' : '工作流信息已更新'
      await alert(successMsg, { title: '更新成功' })
      cancelEdit()
      loadMyWorkflows()
      // 清除浏览缓存以便刷新时获取最新数据
      cacheRef.current = null
    } catch (e) {
      setUpdateError(e instanceof Error ? e.message : '更新失败，请稍后重试')
    } finally {
      setUpdating(false)
    }
  }

  // 从我的工作流删除
  const handleDeleteMyWorkflow = async (workflow: HubWorkflow) => {
    const confirmed = await confirm(
      `确定要删除工作流「${workflow.name}」吗？此操作不可恢复。`,
      { title: '删除工作流', type: 'warning', confirmText: '删除', cancelText: '取消' }
    )

    if (!confirmed) return

    try {
      const response = await fetch(`${hubUrl}/api/workflows/${workflow.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: getClientId() }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '删除失败')
      }

      await alert('工作流已成功删除', { title: '删除成功' })
      loadMyWorkflows()
      // 清除浏览缓存
      cacheRef.current = null
    } catch (e) {
      await alert(e instanceof Error ? e.message : '删除失败，请稍后重试', { title: '删除失败' })
    }
  }

  // 加载工作流列表（带缓存支持）
  const loadWorkflows = useCallback(async (forceRefresh = false, append = false) => {
    // 如果是追加加载且没有更多数据，直接返回
    if (append && !hasMore) return

    // 检查缓存是否有效（相同的查询条件，且不是追加加载）
    const cache = cacheRef.current
    if (!forceRefresh && !append && cache && 
        cache.hubUrl === hubUrl &&
        cache.sortBy === sortBy &&
        cache.category === selectedCategory &&
        cache.search === searchQuery) {
      // 使用缓存数据
      setWorkflows(cache.workflows)
      setCategories(cache.categories)
      setHasMore(cache.hasMore)
      return
    }

    // 设置加载状态
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      const currentPage = append ? page : 1
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: '24',
        sort: sortBy,
      })

      if (selectedCategory && selectedCategory !== '全部') {
        params.set('category', selectedCategory)
      }

      if (searchQuery) {
        params.set('search', searchQuery)
      }

      const response = await fetch(`${hubUrl}/api/workflows?${params}`)

      if (!response.ok) {
        throw new Error('加载失败')
      }

      const data = await response.json()
      const newWorkflows = data.workflows || []
      const totalPages = data.pagination?.totalPages || 1
      const newHasMore = currentPage < totalPages

      if (append) {
        // 追加数据
        setWorkflows(prev => [...prev, ...newWorkflows])
        setPage(currentPage + 1)
      } else {
        // 替换数据
        setWorkflows(newWorkflows)
        setPage(2) // 下次加载第2页
      }
      setHasMore(newHasMore)

      // 更新缓存（只缓存首页数据）
      if (!append) {
        cacheRef.current = {
          workflows: newWorkflows,
          categories: categories,
          hasMore: newHasMore,
          sortBy,
          category: selectedCategory,
          search: searchQuery,
          hubUrl,
        }
      }
    } catch (e) {
      if (!append) {
        setError('无法连接到仓库服务器，请检查网络或仓库地址')
        setWorkflows([])
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [hubUrl, page, sortBy, selectedCategory, searchQuery, categories, hasMore])

  // 强制刷新（用户点击刷新按钮或发布成功后）
  const forceRefresh = useCallback(() => {
    cacheRef.current = null
    setPage(1)
    setHasMore(true)
    loadCategories()
    loadWorkflows(true, false)
  }, [loadCategories, loadWorkflows])

  // 加载更多
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadWorkflows(false, true)
    }
  }, [loadWorkflows, loadingMore, hasMore])

  // 滚动监听 - 无限滚动
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    const { scrollTop, scrollHeight, clientHeight } = target
    // 当滚动到距离底部 200px 时加载更多
    if (scrollHeight - scrollTop - clientHeight < 200) {
      loadMore()
    }
  }, [loadMore])

  // 初始加载（仅首次打开时从服务器加载）
  useEffect(() => {
    if (open && activeTab === 'browse') {
      if (!hasLoadedRef.current) {
        // 首次加载
        hasLoadedRef.current = true
        loadCategories()
        loadWorkflows(true)
      } else {
        // 非首次，使用缓存
        loadWorkflows(false)
      }
    }
    // 切换到"我的工作流"标签时加载
    if (open && activeTab === 'my') {
      loadMyWorkflows()
    }
    // 切换到"留言板"标签时加载
    if (open && activeTab === 'guestbook') {
      loadGuestbook(false)
    }
  }, [open, activeTab])

  // 弹窗关闭时重置状态
  useEffect(() => {
    if (!open) {
      setSelectedWorkflow(null)
      setPublishSuccess(false)
      setPublishError(null)
      customModulesLoadedRef.current = false
      setPublishingModule(null)
      setPublishModuleError(null)
      setDetailModule(null)
      setEditingHubModule(null)
    }
  }, [open])

  // 搜索、排序、分类变化时需要重新加载
  useEffect(() => {
    if (!open || activeTab !== 'browse' || !hasLoadedRef.current) return

    const timer = setTimeout(() => {
      setPage(1)
      setHasMore(true)
      loadWorkflows(true, false) // 查询条件变化时强制刷新
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, sortBy, selectedCategory])

  // ==================== 自定义模块仓库 ====================
  const loadCustomModules = useCallback(async () => {
    setCustomModulesLoading(true)
    setCustomModulesError(null)
    try {
      const res = await customModulesApi.list()
      const list = (res.data as { modules?: CustomModule[] })?.modules || []
      setCustomModules(list)
      customModulesLoadedRef.current = true
    } catch (e) {
      setCustomModulesError(String(e))
    } finally {
      setCustomModulesLoading(false)
    }
  }, [])

  // 打开自定义模块标签页时加载
  useEffect(() => {
    if (open && activeTab === 'custom_modules' && !customModulesLoadedRef.current) {
      loadCustomModules()
    }
  }, [open, activeTab, loadCustomModules])

  // 使用：插入一个自定义模块节点到画布
  const handleUseCustomModule = useCallback(async (m: CustomModule) => {
    try {
      useWorkflowStore.getState().addNode('custom_module', { x: 280, y: 180 }, {
        customModuleId: m.id,
        customModuleName: m.name,
        label: m.display_name || m.name,
        icon: m.icon,
      })
      customModulesApi.incrementUsage(m.id).catch(() => {})
      onClose()
    } catch (e) {
      alert(`插入模块失败：${e}`)
    }
  }, [onClose, alert])

  // 复制
  const handleDuplicateCustomModule = useCallback(async (m: CustomModule) => {
    const res = await customModulesApi.duplicate(m.id)
    if ((res.data as CustomModule)?.id) {
      await loadCustomModules()
    } else {
      alert(`复制失败：${res.error || '未知错误'}`)
    }
  }, [loadCustomModules, alert])

  // 导出为 JSON 文件
  const handleExportCustomModule = useCallback((m: CustomModule) => {
    const blob = new Blob([JSON.stringify(m, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${m.name || 'custom_module'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  // 导入 JSON 文件
  const handleImportCustomModule = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const data = JSON.parse(await file.text())
        const res = await customModulesApi.importModule(data)
        if ((res.data as CustomModule)?.id) {
          await loadCustomModules()
        } else {
          alert(`导入失败：${res.error || '数据格式不正确'}`)
        }
      } catch (e) {
        alert(`模块文件解析失败：${e}`)
      }
    }
    input.click()
  }, [loadCustomModules, alert])

  // 收藏切换
  const handleToggleFavorite = useCallback(async (m: CustomModule) => {
    const res = await customModulesApi.update(m.id, { is_favorite: !m.is_favorite })
    if ((res.data as CustomModule)?.id) {
      setCustomModules((prev) => prev.map((x) => x.id === m.id ? { ...x, is_favorite: !x.is_favorite } : x))
    }
  }, [])

  // 删除
  const handleDeleteCustomModule = useCallback(async (m: CustomModule) => {
    const ok = await confirm(`删除自定义模块「${m.display_name || m.name}」？此操作不可恢复。`, {
      type: 'warning', title: '删除模块', confirmText: '删除', cancelText: '取消',
    })
    if (!ok) return
    const res = await customModulesApi.delete(m.id)
    if ((res.data as { success?: boolean })?.success) {
      setCustomModules((prev) => prev.filter((x) => x.id !== m.id))
    } else {
      alert(`删除失败：${res.error || '未知错误'}`)
    }
  }, [confirm, alert])

  // 过滤后的自定义模块（搜索 + 分类 + 收藏置顶）
  const filteredCustomModules = customModules
    .filter((m) => {
      if (selectedCustomModuleCategory !== '全部' && m.category !== selectedCustomModuleCategory) return false
      const q = customModuleSearchQuery.trim().toLowerCase()
      if (!q) return true
      return (
        (m.display_name || '').toLowerCase().includes(q) ||
        (m.name || '').toLowerCase().includes(q) ||
        (m.description || '').toLowerCase().includes(q) ||
        (m.tags || []).some((t) => t.toLowerCase().includes(q))
      )
    })
    .sort((a, b) => (b.is_favorite ? 1 : 0) - (a.is_favorite ? 1 : 0))

  // ==================== 自定义模块在线社区 ====================
  // 加载云端模块列表
  const loadHubModules = useCallback(async () => {
    setHubModulesLoading(true)
    setHubModulesError(null)
    try {
      let url: string
      let options: RequestInit | undefined
      if (hubModuleScope === 'mine') {
        url = `${hubUrl}/api/custom-modules/my-modules`
        options = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId: getClientId() }),
        }
      } else {
        const params = new URLSearchParams({ page: '1', limit: '50', sort: hubModuleSort })
        if (hubModuleCategory && hubModuleCategory !== '全部') params.set('category', hubModuleCategory)
        if (hubModuleSearch.trim()) params.set('search', hubModuleSearch.trim())
        url = `${hubUrl}/api/custom-modules?${params}`
      }
      const res = await fetch(url, options)
      if (!res.ok) throw new Error('加载失败')
      const data = await res.json()
      setHubModules(data.modules || [])
    } catch (e) {
      setHubModulesError('无法连接到社区服务器，请检查网络或仓库地址')
      setHubModules([])
    } finally {
      setHubModulesLoading(false)
    }
  }, [hubUrl, hubModuleScope, hubModuleSort, hubModuleCategory, hubModuleSearch])

  // 从社区下载模块到本地
  const handleDownloadHubModule = useCallback(async (m: HubCustomModule) => {
    setDownloadingHubModuleId(m.id)
    try {
      const res = await fetch(`${hubUrl}/api/custom-modules/${m.id}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || '下载失败')
      }
      const data = await res.json()
      const moduleJson = data.content
      if (!moduleJson) throw new Error('下载内容为空')
      // 导入到本地自定义模块仓库
      const imp = await customModulesApi.importModule(moduleJson)
      if ((imp.data as CustomModule)?.id) {
        setHubModules((prev) => prev.map((x) => x.id === m.id ? { ...x, download_count: (x.download_count || 0) + 1 } : x))
        await alert(`「${m.display_name || m.name}」已下载到本地模块仓库`, { title: '下载成功' })
      } else {
        throw new Error(imp.error || '导入到本地失败')
      }
    } catch (e) {
      await alert(e instanceof Error ? e.message : '下载失败，请稍后重试', { title: '下载失败' })
    } finally {
      setDownloadingHubModuleId(null)
    }
  }, [hubUrl, alert])

  // 删除自己发布到社区的模块
  const handleDeleteHubModule = useCallback(async (m: HubCustomModule) => {
    const ok = await confirm(`确定要从社区删除「${m.display_name || m.name}」吗？此操作不可恢复。`, {
      type: 'warning', title: '删除社区模块', confirmText: '删除', cancelText: '取消',
    })
    if (!ok) return
    try {
      const res = await fetch(`${hubUrl}/api/custom-modules/${m.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: getClientId() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || '删除失败')
      }
      setHubModules((prev) => prev.filter((x) => x.id !== m.id))
    } catch (e) {
      await alert(e instanceof Error ? e.message : '删除失败，请稍后重试', { title: '删除失败' })
    }
  }, [hubUrl, confirm, alert])

  // 打开"发布到社区"弹层
  const openPublishModule = useCallback((m: CustomModule) => {
    setPublishingModule(m)
    setPublishModuleAuthor(m.author || '')
    setPublishModuleError(null)
  }, [])

  // 提交发布本地模块到社区
  const handlePublishModule = useCallback(async () => {
    if (!publishingModule) return
    const m = publishingModule
    if (!m.workflow || !Array.isArray(m.workflow.nodes) || m.workflow.nodes.length === 0) {
      setPublishModuleError('该模块内部工作流为空，无法发布')
      return
    }
    setPublishModuleSubmitting(true)
    setPublishModuleError(null)
    try {
      // 组装发布用的完整模块 JSON（携带最新作者）
      const moduleJson = { ...m, author: publishModuleAuthor.trim() || '匿名' }
      const res = await fetch(`${hubUrl}/api/custom-modules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: m.display_name || m.name,
          description: m.description || '',
          author: publishModuleAuthor.trim() || '匿名',
          category: m.category || '其他',
          tags: (m.tags || []).slice(0, 8),
          module: moduleJson,
          clientId: getClientId(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || '发布失败')
      }
      setPublishingModule(null)
      await alert(`「${m.display_name || m.name}」已发布到社区`, { title: '发布成功' })
      // 若当前在线视图，刷新列表
      if (customModuleView === 'online') loadHubModules()
    } catch (e) {
      setPublishModuleError(e instanceof Error ? e.message : '发布失败，请稍后重试')
    } finally {
      setPublishModuleSubmitting(false)
    }
  }, [publishingModule, publishModuleAuthor, hubUrl, alert, customModuleView, loadHubModules])

  // 切换到在线视图或筛选条件变化时加载
  useEffect(() => {
    if (open && activeTab === 'custom_modules' && customModuleView === 'online') {
      const timer = setTimeout(() => loadHubModules(), 300)
      return () => clearTimeout(timer)
    }
  }, [open, activeTab, customModuleView, loadHubModules])

  // 收藏切换（本地持久化）
  const toggleHubFavorite = useCallback((id: string) => {
    setHubFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      try { localStorage.setItem('hub_module_favorites', JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }, [])

  // 打开社区模块详情并加载评论
  const openHubDetail = useCallback(async (m: HubCustomModule) => {
    setDetailModule(m)
    setModuleComments([])
    setModuleAvgRating(m.avg_rating || 0)
    setCommentInput('')
    setCommentRating(0)
    try {
      const res = await fetch(`${hubUrl}/api/custom-modules/${m.id}/comments?clientId=${encodeURIComponent(getClientId())}`)
      if (res.ok) {
        const data = await res.json()
        setModuleComments(data.comments || [])
        setModuleAvgRating(data.avgRating || 0)
      }
    } catch { /* ignore */ }
  }, [hubUrl])

  // 提交评论/评分
  const submitHubComment = useCallback(async () => {
    if (!detailModule || !commentInput.trim()) return
    setCommentSubmitting(true)
    try {
      const res = await fetch(`${hubUrl}/api/custom-modules/${detailModule.id}/comments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: commentNick.trim() || '匿名用户', content: commentInput.trim(), rating: commentRating, clientId: getClientId() }),
      })
      if (res.ok) {
        setCommentInput('')
        setCommentRating(0)
        const r = await fetch(`${hubUrl}/api/custom-modules/${detailModule.id}/comments?clientId=${encodeURIComponent(getClientId())}`)
        if (r.ok) { const d = await r.json(); setModuleComments(d.comments || []); setModuleAvgRating(d.avgRating || 0) }
      } else {
        const d = await res.json().catch(() => ({}))
        await alert(d.error || '评论发布失败', { title: '失败' })
      }
    } finally { setCommentSubmitting(false) }
  }, [detailModule, commentInput, commentNick, commentRating, hubUrl, alert])

  // 删除自己的评论
  const deleteHubComment = useCallback(async (commentId: number) => {
    try {
      const res = await fetch(`${hubUrl}/api/custom-modules/comments/${commentId}`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: getClientId() }),
      })
      if (res.ok) setModuleComments((prev) => prev.filter((c) => c.id !== commentId))
    } catch { /* ignore */ }
  }, [hubUrl])

  // 举报模块
  const reportHubModule = useCallback(async (m: HubCustomModule) => {
    const reason = await confirm('确认举报该模块为「违规/恶意」内容？我们会尽快审核。', {
      title: '举报模块', type: 'warning', confirmText: '确认举报', cancelText: '取消',
    })
    if (!reason) return
    try {
      const res = await fetch(`${hubUrl}/api/custom-modules/${m.id}/report`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: '违规内容', description: '' }),
      })
      if (res.ok) await alert('举报已提交，感谢反馈', { title: '已提交' })
    } catch { /* ignore */ }
  }, [hubUrl, confirm, alert])

  // 打开"编辑社区模块"
  const openEditHub = useCallback((m: HubCustomModule) => {
    setEditingHubModule(m)
    setEditHubForm({
      display_name: m.display_name || '', description: m.description || '',
      category: m.category || '其他', tags: (m.tags || []).join(', '), version: m.version || '1.0.0',
    })
  }, [])

  // 提交编辑社区模块元信息
  const submitEditHub = useCallback(async () => {
    if (!editingHubModule) return
    setEditHubSubmitting(true)
    try {
      const tags = editHubForm.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean).slice(0, 8)
      const res = await fetch(`${hubUrl}/api/custom-modules/${editingHubModule.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: getClientId(),
          display_name: editHubForm.display_name.trim(),
          description: editHubForm.description.trim(),
          category: editHubForm.category,
          tags,
          version: editHubForm.version.trim() || '1.0.0',
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok) {
        setEditingHubModule(null)
        await alert('模块已更新', { title: '成功' })
        loadHubModules()
      } else {
        await alert(d.error || '更新失败', { title: '失败' })
      }
    } finally { setEditHubSubmitting(false) }
  }, [editingHubModule, editHubForm, hubUrl, alert, loadHubModules])


  // 下载工作流
  const handleDownload = async (workflow: HubWorkflow, mode: 'replace' | 'merge' = 'replace') => {
    if (mode === 'replace') {
      const confirmed = await confirm(
        `确定要导入工作流「${workflow.name}」吗？这将替换当前的工作流内容。`,
        { title: '覆盖导入', confirmText: '确定覆盖', cancelText: '取消' }
      )
      if (!confirmed) return
    }

    setDownloading(true)

    try {
      const response = await fetch(`${hubUrl}/api/workflows/${workflow.id}/download`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('下载失败')
      }

      const data = await response.json()

      if (data.content) {
        if (mode === 'merge') {
          // 扩展导入：追加到现有画布
          const success = mergeWorkflow(JSON.stringify(data.content))
          if (success) {
            // 更新本地下载量显示
            setWorkflows(prev => prev.map(w => 
              w.id === workflow.id ? { ...w, download_count: w.download_count + 1 } : w
            ))
            setSelectedWorkflow(prev => 
              prev && prev.id === workflow.id ? { ...prev, download_count: prev.download_count + 1 } : prev
            )
            // 清除缓存以便下次刷新时获取最新数据
            cacheRef.current = null
            
            await alert(`工作流「${workflow.name}」已追加到当前画布！`, { title: '导入成功' })
          } else {
            await alert('导入失败，工作流格式可能不正确', { title: '导入失败' })
          }
        } else {
          // 覆盖导入 - 添加工作流名称
          const workflowData = {
            ...data.content,
            name: workflow.name,
          }
          importWorkflow(workflowData)
          
          // 更新本地下载量显示
          setWorkflows(prev => prev.map(w => 
            w.id === workflow.id ? { ...w, download_count: w.download_count + 1 } : w
          ))
          // 清除缓存以便下次刷新时获取最新数据
          cacheRef.current = null
          
          await alert(`工作流「${workflow.name}」已成功导入！`, { title: '导入成功' })
        }
        setSelectedWorkflow(null)
        onClose()
      }
    } catch (e) {
      await alert('无法下载工作流，请稍后重试', { title: '导入失败' })
    } finally {
      setDownloading(false)
    }
  }

  // 检查是否为工作流所有者
  const checkOwnership = async (workflowId: string) => {
    try {
      const response = await fetch(`${hubUrl}/api/workflows/${workflowId}/check-owner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: getClientId() }),
      })
      if (response.ok) {
        const data = await response.json()
        setIsOwner(data.isOwner)
      } else {
        setIsOwner(false)
      }
    } catch {
      setIsOwner(false)
    }
  }

  // 删除工作流
  const handleDelete = async (workflow: HubWorkflow) => {
    const confirmed = await confirm(
      `确定要删除工作流「${workflow.name}」吗？此操作不可恢复。`,
      { title: '删除工作流', type: 'warning', confirmText: '删除', cancelText: '取消' }
    )

    if (!confirmed) return

    setDeleting(true)

    try {
      const response = await fetch(`${hubUrl}/api/workflows/${workflow.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: getClientId() }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '删除失败')
      }

      await alert('工作流已成功删除', { title: '删除成功' })
      setSelectedWorkflow(null)
      forceRefresh()
    } catch (e) {
      await alert(e instanceof Error ? e.message : '删除失败，请稍后重试', { title: '删除失败' })
    } finally {
      setDeleting(false)
    }
  }

  // 发布工作流
  const handlePublish = async () => {
    if (!publishName.trim()) {
      setPublishError('请输入工作流名称')
      return
    }

    // 根据发布模式选择工作流内容
    const workflowContent = publishMode === 'file' ? uploadedWorkflow : { nodes, edges, variables }

    if (!workflowContent || (workflowContent.nodes?.length || 0) === 0) {
      setPublishError(publishMode === 'file' ? '请先上传工作流文件' : '当前工作流为空，无法发布')
      return
    }

    setPublishing(true)
    setPublishError(null)
    setPublishSuccess(false)

    try {
      // 先检查是否已存在
      const checkResponse = await fetch(`${hubUrl}/api/workflows/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: workflowContent,
        }),
      })

      if (checkResponse.ok) {
        const checkData = await checkResponse.json()
        if (checkData.exists) {
          setPublishError(`该工作流已存在于仓库中（名称：${checkData.existingName}）`)
          setPublishing(false)
          return
        }
      } else {
        const errorData = await checkResponse.json()
        setPublishError(errorData.error || '验证失败')
        setPublishing(false)
        return
      }

      // 发布
      const tagsArray = publishTags
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 5)

      const publishData: Record<string, unknown> = {
        name: publishName.trim(),
        description: publishDescription.trim() || undefined,
        author: publishAuthor.trim() || '匿名',
        category: publishCategory,
        content: workflowContent,
        clientId: getClientId(),
      }

      // 只有当有标签时才添加 tags 字段
      if (tagsArray.length > 0) {
        publishData.tags = tagsArray
      }

      const response = await fetch(`${hubUrl}/api/workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(publishData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        // 如果有详细的验证错误，显示第一个
        if (errorData.details && errorData.details.length > 0) {
          const firstError = errorData.details[0]
          throw new Error(firstError.msg || errorData.error || '发布失败')
        }
        throw new Error(errorData.error || '发布失败')
      }

      setPublishSuccess(true)
      setPublishName('')
      setPublishDescription('')
      setPublishTags('')
      setUploadedWorkflow(null)
      setUploadFileName('')

      // 刷新列表（强制刷新缓存）
      setTimeout(() => {
        setActiveTab('browse')
        forceRefresh()
      }, 2000)
    } catch (e) {
      setPublishError(e instanceof Error ? e.message : '发布失败，请稍后重试')
    } finally {
      setPublishing(false)
    }
  }

  // 处理文件上传
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 检查文件类型
    if (!file.name.endsWith('.json')) {
      setPublishError('请上传 JSON 格式的文件')
      return
    }

    // 检查文件大小（最大 1MB）
    if (file.size > 1024 * 1024) {
      setPublishError('文件大小不能超过 1MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = JSON.parse(e.target?.result as string)
        
        // 基本验证
        if (!content || typeof content !== 'object') {
          setPublishError('无效的 JSON 文件')
          return
        }

        if (!Array.isArray(content.nodes)) {
          setPublishError('无效的工作流文件：缺少 nodes 字段')
          return
        }

        if (!Array.isArray(content.edges)) {
          setPublishError('无效的工作流文件：缺少 edges 字段')
          return
        }

        if (content.nodes.length === 0) {
          setPublishError('工作流文件中没有任何节点')
          return
        }

        // 设置上传的工作流
        setUploadedWorkflow({
          nodes: content.nodes,
          edges: content.edges,
          variables: content.variables || []
        })
        setUploadFileName(file.name)
        setPublishError(null)
        setPublishMode('file')
      } catch {
        setPublishError('JSON 解析失败，请检查文件格式')
      }
    }
    reader.onerror = () => {
      setPublishError('文件读取失败')
    }
    reader.readAsText(file)

    // 清空 input 以便重复选择同一文件
    event.target.value = ''
  }

  // 清除上传的文件
  const handleClearUpload = () => {
    setUploadedWorkflow(null)
    setUploadFileName('')
    setPublishMode('current')
    setPublishError(null)
  }

  // 保存仓库设置
  const handleSaveSettings = () => {
    const url = tempHubUrl.trim() || DEFAULT_HUB_URL
    setHubUrl(url)
    setHubUrlState(url)
    setActiveTab('browse')
    setPage(1)
  }

  // 重置仓库地址
  const handleResetUrl = () => {
    setTempHubUrl(DEFAULT_HUB_URL)
  }

  if (!open) return null

  return (
    <DialogPortal>
    <div
      className="fixed inset-0 bg-[hsl(217_45%_15%_/_0.55)] backdrop-blur-[3px] flex items-center justify-center p-4 animate-fade-in"
      style={{ zIndex: 2147483646 }}
      onClick={onClose}
    >
      <div
        className="modern-dialog w-full max-w-6xl max-h-[92vh] flex flex-col animate-scale-in-bounce"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="modern-dialog-header">
          <div className="modern-dialog-header-icon modern-dialog-header-icon-violet">
            <Package className="w-5 h-5" strokeWidth={2.2} />
          </div>
          <div className="flex-1">
            <h2 className="modern-dialog-title">工作流仓库</h2>
            <div className="modern-dialog-subtitle">浏览 · 发布 · 协作 · 远程协助</div>
          </div>
          <div className="flex items-center gap-1.5">
            {/* 标签页切换 - 现代分段控件 */}
            <div className="hidden lg:flex items-center gap-0.5 p-1 bg-[hsl(var(--slate-100))] rounded-[10px] border border-[hsl(var(--slate-200))] shadow-[inset_0_1px_2px_rgb(15_23_42_/_0.04)]">
              {[
                { id: 'browse',         label: '浏览',     Icon: Search,        accent: 'brand'   },
                { id: 'my',             label: '我的',     Icon: FolderOpen,    accent: 'warning' },
                { id: 'publish',        label: '发布',     Icon: Upload,        accent: 'success' },
                { id: 'custom_modules', label: '模块',     Icon: Package,       accent: 'violet'  },
                { id: 'plugins',        label: '插件',     Icon: Package,       accent: 'brand'   },
                { id: 'guestbook',      label: '留言板',   Icon: MessageSquare, accent: 'info'    },
                { id: 'remote',         label: '远程',     Icon: Users,         accent: 'rose'    },
              ].map(tab => {
                const Icon = tab.Icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    className={`px-2.5 py-1.5 rounded-[7px] text-[12px] font-semibold transition-all duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] flex items-center gap-1.5 relative border ${
                      isActive
                        ? '!bg-[hsl(var(--brand-600))] !text-white !border-[hsl(var(--brand-700))] shadow-brand-glow'
                        : '!bg-transparent !text-[hsl(var(--muted-foreground))] !border-transparent hover:!text-[hsl(var(--brand-700))] hover:!bg-[hsl(var(--card))]'
                    }`}
                    onClick={() => {
                      setActiveTab(tab.id as typeof activeTab)
                      if (tab.id === 'publish') {
                        setPublishSuccess(false)
                        setPublishError(null)
                      }
                    }}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? '!text-white' : ''}`} />
                    <span className={`hidden xl:inline ${isActive ? '!text-white' : ''}`}>{tab.label}</span>
                    {tab.id === 'remote' && remoteMode !== 'none' && (
                      <span className={`w-1.5 h-1.5 rounded-full ${remoteStatus === 'connected' ? 'bg-[hsl(var(--success-300))]' : 'bg-[hsl(var(--warning-300))]'} animate-pulse`} />
                    )}
                  </button>
                )
              })}
              <button
                className={`px-2 py-1.5 rounded-[7px] transition-all duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] border ${
                  activeTab === 'settings'
                    ? '!bg-[hsl(var(--brand-600))] !text-white !border-[hsl(var(--brand-700))] shadow-brand-glow'
                    : '!bg-transparent !text-[hsl(var(--muted-foreground))] !border-transparent hover:!text-[hsl(var(--brand-700))] hover:!bg-[hsl(var(--card))]'
                }`}
                onClick={() => setActiveTab('settings')}
                title="设置"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-[7px] text-[hsl(var(--slate-500))] hover:bg-[hsl(var(--danger-50))] hover:text-[hsl(var(--danger-600))] hover:border-[hsl(var(--danger-500)/0.3)] border border-transparent transition-all duration-150 active:scale-90"
            >
              <X className="w-4 h-4" />

            </button>
          </div>
        </div>

        {/* 内容区域 - 使用calc计算剩余高度 */}
        <div style={{ height: 'calc(90vh - 73px)' }}>
          {/* 浏览标签页 */}
          {activeTab === 'browse' && (
            <div className="h-full flex flex-col">
              {/* 搜索和筛选 */}
              <div className="p-4 border-b bg-gray-50 flex flex-wrap gap-4 items-center flex-shrink-0">
                <div className="flex-1 min-w-[200px] relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="搜索工作流..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="!w-36 flex-shrink-0"
                >
                  {categories.length === 0 ? (
                    <>
                      <option value="全部">全部</option>
                      <option value="数据采集">数据采集</option>
                      <option value="自动化操作">自动化操作</option>
                      <option value="表单填写">表单填写</option>
                      <option value="AI应用">AI应用</option>
                      <option value="定时任务">定时任务</option>
                      <option value="其他">其他</option>
                    </>
                  ) : (
                    categories.map((cat) => (
                      <option key={cat.name} value={cat.name}>
                        {cat.name} ({cat.count})
                      </option>
                    ))
                  )}
                </Select>
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="!w-32 flex-shrink-0"
                >
                  <option value="newest">最新发布</option>
                  <option value="popular">最受欢迎</option>
                  <option value="downloads">下载最多</option>
                </Select>
                <Button variant="tonal-success" size="sm" onClick={forceRefresh} disabled={loading}>
                  <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  刷新
                </Button>
              </div>

              {/* 工作流列表 */}
              <div 
                ref={listContainerRef}
                className="flex-1 overflow-y-auto p-4"
                style={{ minHeight: 0 }}
                onScroll={handleScroll}
              >
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <AlertCircle className="w-12 h-12 mb-4 text-red-400" />
                    <p>{error}</p>
                    <Button variant="outline" size="sm" className="mt-4" onClick={forceRefresh}>
                      重试
                    </Button>
                  </div>
                ) : workflows.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <Package className="w-12 h-12 mb-4 text-gray-300" />
                    <p>暂无工作流</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {workflows.map((workflow) => (
                        <div
                          key={workflow.id}
                          className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white cursor-pointer"
                          onClick={() => {
                            setSelectedWorkflow(workflow)
                            setIsOwner(false)
                            checkOwnership(workflow.id)
                            // 重置评论状态
                            setComments([])
                            setCommentsPage(1)
                            setCommentsHasMore(true)
                            loadComments(workflow.id, false)
                          }}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-gray-900 truncate flex-1">{workflow.name}</h3>
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded ml-2">
                              {workflow.category}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2 mb-3 min-h-[40px]">
                            {workflow.description || '暂无描述'}
                          </p>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {workflow.author}
                              </span>
                              <span className="flex items-center gap-1">
                                <Package className="w-3 h-3" />
                                {workflow.node_count} 节点
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" />
                                {workflow.comment_count || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <Download className="w-3 h-3" />
                                {workflow.download_count}
                              </span>
                            </div>
                          </div>
                          {workflow.tags && workflow.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {workflow.tags.slice(0, 3).map((tag, i) => (
                                <span key={i} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {/* 加载更多提示 */}
                    {loadingMore && (
                      <div className="flex items-center justify-center py-4 mt-4">
                        <Loader2 className="w-5 h-5 animate-spin text-purple-500 mr-2" />
                        <span className="text-sm text-gray-500">加载更多...</span>
                      </div>
                    )}
                    {!hasMore && workflows.length > 0 && (
                      <div className="text-center py-4 mt-4 text-sm text-gray-400">
                        已加载全部工作流
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* 我的工作流标签页 */}
          {activeTab === 'my' && (
            <div className="h-full flex flex-col">
              <div className="p-4 border-b bg-gray-50 flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-5 h-5 text-purple-500" />
                    <span className="font-medium">我发布的工作流</span>
                    <span className="text-sm text-gray-500">({myWorkflows.length})</span>
                  </div>
                  <Button variant="tonal-success" size="sm" onClick={loadMyWorkflows} disabled={myWorkflowsLoading}>
                    <RefreshCw className={`w-4 h-4 mr-1 ${myWorkflowsLoading ? 'animate-spin' : ''}`} />
                    刷新
                  </Button>
                </div>
                {/* 用户身份ID显示 */}
                <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg border border-purple-200">
                  <Key className="w-4 h-4 text-purple-500 flex-shrink-0" />
                  <span className="text-xs text-purple-700 flex-shrink-0">我的身份ID:</span>
                  <code className="text-xs bg-white px-2 py-0.5 rounded border flex-1 truncate font-mono text-gray-700">
                    {getClientId()}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                    onClick={async () => {
                      navigator.clipboard.writeText(getClientId())
                      await alert('身份ID已复制到剪贴板，你可以在其他浏览器中使用此ID', { title: '已复制' })
                    }}
                  >
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    复制
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  提示：复制身份ID后，可在其他浏览器的设置中导入，以保持你的发布者身份
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-4" style={{ minHeight: 0 }}>
                {myWorkflowsLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                  </div>
                ) : myWorkflowsError ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <AlertCircle className="w-12 h-12 mb-4 text-red-400" />
                    <p>{myWorkflowsError}</p>
                    <Button variant="outline" size="sm" className="mt-4" onClick={loadMyWorkflows}>
                      重试
                    </Button>
                  </div>
                ) : myWorkflows.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <Package className="w-12 h-12 mb-4 text-gray-300" />
                    <p>你还没有发布过工作流</p>
                    <Button
                      variant="tonal-success"
                      size="sm"
                      className="mt-4"
                      onClick={() => setActiveTab('publish')}
                    >
                      <Upload className="w-4 h-4 mr-1" />
                      去发布
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myWorkflows.map((workflow) => (
                      <div
                        key={workflow.id}
                        className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-gray-900">{workflow.name}</h3>
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                                {workflow.category}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                              {workflow.description || '暂无描述'}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Package className="w-3 h-3" />
                                {workflow.node_count} 节点
                              </span>
                              <span className="flex items-center gap-1">
                                <Download className="w-3 h-3" />
                                {workflow.download_count} 下载
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(workflow.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            {workflow.tags && workflow.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {workflow.tags.map((tag, i) => (
                                  <span key={i} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button
                              variant="tonal-warning"
                              size="sm"
                              onClick={() => startEditWorkflow(workflow)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-red-300 text-red-600 hover:bg-red-50"
                              onClick={() => handleDeleteMyWorkflow(workflow)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 发布标签页 */}
          {activeTab === 'publish' && (
            <div className="h-full overflow-y-auto p-6">
                <div className="max-w-xl mx-auto space-y-6">
                <div className="text-center mb-8">
                  <Upload className="w-12 h-12 mx-auto text-purple-500 mb-3" />
                  <h3 className="text-lg font-semibold">发布工作流到仓库</h3>
                  <p className="text-sm text-gray-500 mt-1">分享你的工作流，帮助其他用户</p>
                </div>

                {publishSuccess ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                    <h3 className="text-lg font-semibold text-green-700">发布成功！</h3>
                    <p className="text-sm text-gray-500 mt-2">你的工作流已成功发布到仓库</p>
                  </div>
                ) : (
                  <>
                    {/* 发布模式选择 */}
                    <div className="flex gap-1 p-1 bg-[hsl(var(--slate-100))] rounded-[8px] border border-[hsl(var(--slate-200))] shadow-[inset_0_1px_2px_rgb(15_23_42_/_0.04)]">
                      <button
                        className={`flex-1 py-2 px-4 rounded-[6px] text-[13px] font-semibold transition-all duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] flex items-center justify-center gap-2 border ${
                          publishMode === 'current'
                            ? '!bg-[hsl(var(--brand-600))] !text-white !border-[hsl(var(--brand-700))] shadow-brand-glow'
                            : '!bg-transparent !text-[hsl(var(--slate-600))] !border-transparent hover:!text-[hsl(var(--brand-700))] hover:!bg-[hsl(var(--card))]'
                        }`}
                        onClick={() => {
                          setPublishMode('current')
                          setPublishError(null)
                        }}
                      >
                        <Package className="w-4 h-4" />
                        发布当前工作流
                      </button>
                      <button
                        className={`flex-1 py-2 px-4 rounded-[6px] text-[13px] font-semibold transition-all duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] flex items-center justify-center gap-2 border ${
                          publishMode === 'file'
                            ? '!bg-[hsl(var(--brand-600))] !text-white !border-[hsl(var(--brand-700))] shadow-brand-glow'
                            : '!bg-transparent !text-[hsl(var(--slate-600))] !border-transparent hover:!text-[hsl(var(--brand-700))] hover:!bg-[hsl(var(--card))]'
                        }`}
                        onClick={() => {
                          setPublishMode('file')
                          setPublishError(null)
                        }}
                      >
                        <FileUp className="w-4 h-4" />
                        上传 JSON 文件
                      </button>
                    </div>

                    {/* 当前工作流信息 */}
                    {publishMode === 'current' && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>当前工作流：</strong>
                          {nodes.length} 个节点，{edges.length} 条连线
                        </p>
                      </div>
                    )}

                    {/* 文件上传区域 */}
                    {publishMode === 'file' && (
                      <div className="space-y-3">
                        {uploadedWorkflow ? (
                          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <FileJson className="w-5 h-5 text-green-600" />
                                <div>
                                  <p className="text-sm font-medium text-green-800">{uploadFileName}</p>
                                  <p className="text-xs text-green-600">
                                    {uploadedWorkflow.nodes.length} 个节点，{uploadedWorkflow.edges.length} 条连线
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={handleClearUpload}
                                className="p-1 hover:bg-green-100 rounded text-green-600 has-hover-only"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label className="block">
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-colors">
                              <FileUp className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                              <p className="text-sm text-gray-600 mb-1">点击或拖拽上传工作流 JSON 文件</p>
                              <p className="text-xs text-gray-400">支持 .json 格式，最大 1MB</p>
                            </div>
                            <input
                              type="file"
                              accept=".json"
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="publish-name">
                          工作流名称 <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="publish-name"
                          value={publishName}
                          onChange={(e) => setPublishName(e.target.value)}
                          placeholder="给你的工作流起个名字"
                          maxLength={50}
                        />
                      </div>

                      <div>
                        <Label htmlFor="publish-description">功能描述</Label>
                        <textarea
                          id="publish-description"
                          value={publishDescription}
                          onChange={(e) => setPublishDescription(e.target.value)}
                          placeholder="描述一下这个工作流的功能和用途..."
                          className="w-full px-3 py-2 border rounded-md text-sm resize-none h-24"
                          maxLength={500}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="publish-author">作者名称</Label>
                          <Input
                            id="publish-author"
                            value={publishAuthor}
                            onChange={(e) => setPublishAuthor(e.target.value)}
                            placeholder="匿名"
                            maxLength={30}
                          />
                        </div>
                        <div>
                          <Label htmlFor="publish-category">分类</Label>
                          <Select
                            id="publish-category"
                            value={publishCategory}
                            onChange={(e) => setPublishCategory(e.target.value)}
                          >
                            <option value="数据采集">数据采集</option>
                            <option value="自动化操作">自动化操作</option>
                            <option value="表单填写">表单填写</option>
                            <option value="AI应用">AI应用</option>
                            <option value="定时任务">定时任务</option>
                            <option value="其他">其他</option>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="publish-tags">标签（用逗号分隔，最多5个）</Label>
                        <Input
                          id="publish-tags"
                          value={publishTags}
                          onChange={(e) => setPublishTags(e.target.value)}
                          placeholder="例如：爬虫, 自动化, 签到"
                        />
                      </div>
                    </div>

                    {publishError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm">{publishError}</span>
                      </div>
                    )}

                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>注意：</strong>
                        发布前请确保工作流中不包含敏感信息（如 API Key、密码等），系统会自动过滤部分敏感内容。
                      </p>
                    </div>

                    <Button
                      variant="success"
                      className="w-full"
                      onClick={handlePublish}
                      disabled={
                        publishing ||
                        (publishMode === 'current' && nodes.length === 0) ||
                        (publishMode === 'file' && !uploadedWorkflow)
                      }
                    >
                      {publishing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          发布中...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          发布工作流
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 插件市场标签页 */}
          {activeTab === 'plugins' && (
            <PluginMarketPanel />
          )}

          {/* 自定义模块标签页 */}
          {activeTab === 'custom_modules' && (
            <div className="h-full flex flex-col">
              <div className="p-4 border-b bg-gray-50 flex-shrink-0">
                {/* 本地 / 在线社区 视图切换 */}
                <div className="flex justify-center mb-3">
                  <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
                    <button
                      onClick={() => setCustomModuleView('local')}
                      className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        customModuleView === 'local' ? 'bg-purple-500 text-white' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Package className="w-3.5 h-3.5 inline mr-1" />本地模块
                    </button>
                    <button
                      onClick={() => setCustomModuleView('online')}
                      className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        customModuleView === 'online' ? 'bg-purple-500 text-white' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5 inline mr-1" />在线社区
                    </button>
                  </div>
                </div>

                {customModuleView === 'local' ? (
                  <div className="flex gap-3 items-center">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="搜索自定义模块..."
                        value={customModuleSearchQuery}
                        onChange={(e) => setCustomModuleSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select
                      value={selectedCustomModuleCategory}
                      onChange={(e) => setSelectedCustomModuleCategory(e.target.value)}
                      className="w-32"
                    >
                      <option value="全部">全部分类</option>
                      <option value="自定义">自定义</option>
                      <option value="自动化">自动化</option>
                      <option value="数据处理">数据处理</option>
                      <option value="AI">AI</option>
                      <option value="工具">工具</option>
                      <option value="网页操作">网页操作</option>
                      <option value="文件操作">文件操作</option>
                      <option value="数据库">数据库</option>
                      <option value="API">API</option>
                      <option value="邮件">邮件</option>
                      <option value="通知">通知</option>
                      <option value="图像处理">图像处理</option>
                      <option value="文本处理">文本处理</option>
                      <option value="Excel">Excel</option>
                      <option value="PDF">PDF</option>
                      <option value="爬虫">爬虫</option>
                      <option value="测试">测试</option>
                      <option value="监控">监控</option>
                      <option value="定时任务">定时任务</option>
                      <option value="流程控制">流程控制</option>
                      <option value="系统操作">系统操作</option>
                      <option value="网络">网络</option>
                      <option value="安全">安全</option>
                      <option value="其他">其他</option>
                    </Select>
                    <Button variant="outline" size="sm" onClick={handleImportCustomModule} title="从 JSON 文件导入模块">
                      <Upload className="w-4 h-4 mr-1" />导入
                    </Button>
                    <Button variant="outline" size="sm" onClick={loadCustomModules} title="刷新列表" disabled={customModulesLoading}>
                      <RefreshCw className={`w-4 h-4 ${customModulesLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-3 items-center">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          placeholder="搜索社区模块..."
                          value={hubModuleSearch}
                          onChange={(e) => setHubModuleSearch(e.target.value)}
                          className="pl-10"
                          disabled={hubModuleScope === 'mine'}
                        />
                      </div>
                      <Select
                        value={hubModuleCategory}
                        onChange={(e) => setHubModuleCategory(e.target.value)}
                        className="w-28"
                        disabled={hubModuleScope === 'mine'}
                      >
                        <option value="全部">全部分类</option>
                        <option value="自定义">自定义</option>
                        <option value="自动化">自动化</option>
                        <option value="数据处理">数据处理</option>
                        <option value="AI">AI</option>
                        <option value="工具">工具</option>
                        <option value="网页操作">网页操作</option>
                        <option value="文件操作">文件操作</option>
                        <option value="数据库">数据库</option>
                        <option value="API">API</option>
                        <option value="邮件">邮件</option>
                        <option value="通知">通知</option>
                        <option value="图像处理">图像处理</option>
                        <option value="文本处理">文本处理</option>
                        <option value="Excel">Excel</option>
                        <option value="PDF">PDF</option>
                        <option value="爬虫">爬虫</option>
                        <option value="测试">测试</option>
                        <option value="监控">监控</option>
                        <option value="定时任务">定时任务</option>
                        <option value="流程控制">流程控制</option>
                        <option value="系统操作">系统操作</option>
                        <option value="网络">网络</option>
                        <option value="安全">安全</option>
                        <option value="其他">其他</option>
                      </Select>
                      <Select
                        value={hubModuleSort}
                        onChange={(e) => setHubModuleSort(e.target.value as 'newest' | 'popular' | 'downloads')}
                        className="w-24"
                        disabled={hubModuleScope === 'mine'}
                      >
                        <option value="newest">最新</option>
                        <option value="popular">最热</option>
                        <option value="downloads">下载多</option>
                      </Select>
                      <Button variant="outline" size="sm" onClick={loadHubModules} title="刷新列表" disabled={hubModulesLoading}>
                        <RefreshCw className={`w-4 h-4 ${hubModulesLoading ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                    <div className="flex justify-center">
                      <div className="inline-flex rounded-md border border-gray-200 bg-white p-0.5 text-xs">
                        <button
                          onClick={() => setHubModuleScope('all')}
                          className={`px-3 py-1 rounded transition-colors ${hubModuleScope === 'all' ? 'bg-gray-800 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                        >全部模块</button>
                        <button
                          onClick={() => setHubModuleScope('mine')}
                          className={`px-3 py-1 rounded transition-colors ${hubModuleScope === 'mine' ? 'bg-gray-800 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                        >我发布的</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {customModuleView === 'local' ? (
              <div className="flex-1 overflow-y-auto p-4" style={{ minHeight: 0 }}>
                {customModulesLoading ? (
                  <div className="flex items-center justify-center py-20 text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : customModulesError ? (
                  <div className="text-center py-16 text-red-500 text-sm">
                    加载失败：{customModulesError}
                    <div className="mt-3">
                      <Button variant="outline" size="sm" onClick={loadCustomModules}>重试</Button>
                    </div>
                  </div>
                ) : filteredCustomModules.length === 0 ? (
                  <div className="max-w-md mx-auto text-center py-16 text-gray-500">
                    <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h4 className="text-lg font-medium mb-2">
                      {customModules.length === 0 ? '还没有自定义模块' : '没有匹配的模块'}
                    </h4>
                    <div className="space-y-2 text-sm text-left bg-blue-50 p-4 rounded-lg mt-4">
                      <p className="font-medium text-blue-900">如何创建自定义模块：</p>
                      <ul className="space-y-1 text-blue-700">
                        <li>1. 在左侧模块栏切到「自定义模块」标签</li>
                        <li>2. 点击「创建自定义模块」，把一段工作流封装为模块</li>
                        <li>3. 配置参数与输出，保存后即出现在这里</li>
                        <li>4. 也可点上方「导入」加载他人分享的模块 JSON</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredCustomModules.map((m) => (
                      <div key={m.id} className="border border-gray-200 rounded-lg p-3 bg-white hover:shadow-md transition-shadow flex flex-col gap-2">
                        <div className="flex items-start gap-3">
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                            style={{ background: (m.color || '#8B5CF6') + '22' }}
                          >
                            <span>{m.icon || '📦'}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-sm truncate">{m.display_name || m.name}</span>
                              {m.is_favorite && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />}
                            </div>
                            <div className="text-xs text-gray-500 line-clamp-2">{m.description || '（无描述）'}</div>
                          </div>
                          <button
                            onClick={() => handleToggleFavorite(m)}
                            title={m.is_favorite ? '取消收藏' : '收藏'}
                            className="p-1 text-gray-300 hover:text-amber-400 flex-shrink-0"
                          >
                            <Star className={`w-4 h-4 ${m.is_favorite ? 'text-amber-400 fill-amber-400' : ''}`} />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-gray-400 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{m.category || 'custom'}</span>
                          <span>v{m.version || '1.0.0'}</span>
                          <span>· 使用 {m.usage_count || 0} 次</span>
                          {(m.tags || []).slice(0, 3).map((t) => (
                            <span key={t} className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-600">#{t}</span>
                          ))}
                        </div>
                        <div className="flex items-center gap-1.5 pt-1 border-t border-gray-100">
                          <Button size="sm" variant="default" className="flex-1 h-7 text-xs" onClick={() => handleUseCustomModule(m)}>
                            <Plus className="w-3.5 h-3.5 mr-1" />使用
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 px-2" title="复制" onClick={() => handleDuplicateCustomModule(m)}>
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 px-2" title="导出 JSON" onClick={() => handleExportCustomModule(m)}>
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 px-2 text-purple-600 hover:bg-purple-50" title="发布到在线社区，供他人下载" onClick={() => openPublishModule(m)}>
                            <Upload className="w-3.5 h-3.5 mr-1" />发布
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 px-2 text-red-600 hover:bg-red-50" title="删除" onClick={() => handleDeleteCustomModule(m)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              ) : (
              <div className="flex-1 overflow-y-auto p-4" style={{ minHeight: 0 }}>
                {hubModulesLoading ? (
                  <div className="flex items-center justify-center py-20 text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : hubModulesError ? (
                  <div className="text-center py-16 text-red-500 text-sm">
                    {hubModulesError}
                    <div className="mt-3">
                      <Button variant="outline" size="sm" onClick={loadHubModules}>重试</Button>
                    </div>
                  </div>
                ) : hubModules.length === 0 ? (
                  <div className="max-w-md mx-auto text-center py-16 text-gray-500">
                    <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h4 className="text-lg font-medium mb-2">
                      {hubModuleScope === 'mine' ? '你还没有发布任何模块' : '社区暂无模块'}
                    </h4>
                    <p className="text-sm text-gray-400 mt-2">
                      {hubModuleScope === 'mine'
                        ? '切到「本地模块」，在模块卡片上点击发布按钮即可分享到社区'
                        : '换个搜索词或分类，或成为第一个分享模块的人'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[...hubModules].sort((a, b) => (hubFavorites.includes(b.id) ? 1 : 0) - (hubFavorites.includes(a.id) ? 1 : 0)).map((m) => (
                      <div key={m.id} className="border border-gray-200 rounded-lg p-3 bg-white hover:shadow-md transition-shadow flex flex-col gap-2">
                        <div className="flex items-start gap-3">
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                            style={{ background: (m.color || '#8B5CF6') + '22' }}
                          >
                            <span>{m.icon || '📦'}</span>
                          </div>
                          <div className="min-w-0 flex-1 cursor-pointer" onClick={() => openHubDetail(m)}>
                            <div className="font-medium text-sm truncate hover:text-purple-600">{m.display_name || m.name}</div>
                            <div className="text-xs text-gray-500 line-clamp-2">{m.description || '（无描述）'}</div>
                          </div>
                          <button
                            onClick={() => toggleHubFavorite(m.id)}
                            title={hubFavorites.includes(m.id) ? '取消收藏' : '收藏'}
                            className="p-1 text-gray-300 hover:text-amber-400 flex-shrink-0"
                          >
                            <Star className={`w-4 h-4 ${hubFavorites.includes(m.id) ? 'text-amber-400 fill-amber-400' : ''}`} />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-gray-400 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{m.category || '其他'}</span>
                          <span>v{m.version || '1.0.0'}</span>
                          <span className="flex items-center gap-0.5"><User className="w-3 h-3" />{m.author || '匿名'}</span>
                          <span className="flex items-center gap-0.5"><Download className="w-3 h-3" />{m.download_count || 0}</span>
                          {(m.avg_rating ?? 0) > 0 && (
                            <span className="flex items-center gap-0.5 text-amber-500"><Star className="w-3 h-3 fill-amber-400 text-amber-400" />{m.avg_rating}</span>
                          )}
                          {(m.comment_count ?? 0) > 0 && (
                            <span className="flex items-center gap-0.5"><MessageSquare className="w-3 h-3" />{m.comment_count}</span>
                          )}
                          {(m.tags || []).slice(0, 2).map((t) => (
                            <span key={t} className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-600">#{t}</span>
                          ))}
                        </div>
                        <div className="flex items-center gap-1.5 pt-1 border-t border-gray-100">
                          <Button
                            size="sm"
                            variant="default"
                            className="flex-1 h-7 text-xs"
                            onClick={() => handleDownloadHubModule(m)}
                            disabled={downloadingHubModuleId === m.id}
                          >
                            {downloadingHubModuleId === m.id ? (
                              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5 mr-1" />
                            )}
                            下载到本地
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 px-2" title="详情 / 评论 / 评分" onClick={() => openHubDetail(m)}>
                            <MessageSquare className="w-3.5 h-3.5" />
                          </Button>
                          {hubModuleScope === 'mine' ? (
                            <>
                              <Button size="sm" variant="outline" className="h-7 px-2" title="编辑（版本更新）" onClick={() => openEditHub(m)}>
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 px-2 text-red-600 hover:bg-red-50" title="从社区删除" onClick={() => handleDeleteHubModule(m)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          ) : (
                            <Button size="sm" variant="outline" className="h-7 px-2 text-gray-400 hover:text-red-600" title="举报" onClick={() => reportHubModule(m)}>
                              <AlertCircle className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              )}
            </div>
          )}

          {/* 留言板标签页 */}
          {activeTab === 'guestbook' && (
            <div className="h-full flex flex-col">
              {/* 发布留言区域 */}
              <div className="p-4 border-b bg-gray-50 flex-shrink-0">
                <div className="max-w-2xl mx-auto">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-5 h-5 text-purple-500" />
                    <span className="font-medium">发表留言</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <Input
                        placeholder="昵称（可选）"
                        value={guestbookNickname}
                        onChange={(e) => setGuestbookNickname(e.target.value)}
                        className="w-32"
                        maxLength={20}
                      />
                      <Select
                        value={guestbookType}
                        onChange={(e) => setGuestbookType(e.target.value)}
                        className="w-32"
                      >
                        {MESSAGE_TYPES.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <textarea
                        placeholder="写下你的留言..."
                        value={guestbookContent}
                        onChange={(e) => setGuestbookContent(e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-md text-sm resize-none h-20"
                        maxLength={1000}
                      />
                      <Button
                        variant="success"
                        onClick={handleSubmitGuestbook}
                        disabled={submittingGuestbook || !guestbookContent.trim()}
                        className="self-end"
                      >
                        {submittingGuestbook ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 留言列表 */}
              <div 
                className="flex-1 overflow-y-auto p-4" 
                style={{ minHeight: 0 }}
                onScroll={(e) => {
                  const target = e.target as HTMLDivElement
                  const { scrollTop, scrollHeight, clientHeight } = target
                  // 滚动到距离底部 100px 时加载更多
                  if (scrollHeight - scrollTop - clientHeight < 100 && !guestbookLoading && guestbookHasMore) {
                    loadGuestbook(true)
                  }
                }}
              >
                <div className="max-w-2xl mx-auto">
                  {guestbookLoading && guestbookMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-64">
                      <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                    </div>
                  ) : guestbookMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                      <MessageSquare className="w-12 h-12 mb-4 text-gray-300" />
                      <p>暂无留言，来发表第一条吧！</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {guestbookMessages.map((msg) => (
                        <div key={msg.id} className="border rounded-lg p-4 bg-white">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900" data-no-i18n>{msg.nickname}</span>
                              <span data-no-i18n className={`text-xs px-2 py-0.5 rounded ${
                                msg.message_type === '建议' ? 'bg-blue-100 text-blue-700' :
                                msg.message_type === '问题求助' ? 'bg-yellow-100 text-yellow-700' :
                                msg.message_type === 'Bug报告' ? 'bg-red-100 text-red-700' :
                                msg.message_type === '功能请求' ? 'bg-purple-100 text-purple-700' :
                                msg.message_type === '闲聊' ? 'bg-green-100 text-green-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {msg.message_type}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">
                                {new Date(msg.created_at).toLocaleString()}
                              </span>
                              {msg.isOwner && (
                                <button
                                  onClick={() => handleDeleteGuestbook(msg.id)}
                                  className="text-xs text-red-500 hover:text-red-700 hover:underline"
                                >
                                  删除
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap" data-no-i18n>{msg.content}</p>
                        </div>
                      ))}
                      {guestbookLoading && (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-5 h-5 animate-spin text-purple-500 mr-2" />
                          <span className="text-sm text-gray-500">加载更多...</span>
                        </div>
                      )}
                      {!guestbookHasMore && guestbookMessages.length > 0 && (
                        <div className="text-center py-4 text-sm text-gray-400">
                          已加载全部留言
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 远程协助标签页 */}
          {activeTab === 'remote' && (
            <div className="h-full overflow-y-auto p-6">
              <div className="max-w-xl mx-auto space-y-6">
                <div className="text-center mb-8">
                  <Users className="w-12 h-12 mx-auto text-purple-500 mb-3" />
                  <h3 className="text-lg font-semibold">远程协助</h3>
                  <p className="text-sm text-gray-500 mt-1">让其他用户远程帮助你操作工作流画布</p>
                </div>

                {remoteMode === 'none' ? (
                  // 未开始状态 - 选择模式
                  <div className="space-y-6">
                    {/* 作为主机 - 生成协助码 */}
                    <div className="p-6 border-2 border-dashed border-purple-200 rounded-xl bg-purple-50/50 hover:border-purple-400 transition-colors">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 rounded-full bg-purple-100">
                          <Link className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">我需要帮助</h4>
                          <p className="text-sm text-gray-500">生成协助码，让他人远程帮助你</p>
                        </div>
                      </div>
                      <Button
                        className="w-full"
                        onClick={handleCreateRemoteSession}
                        disabled={remoteLoading}
                      >
                        {remoteLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            生成中...
                          </>
                        ) : (
                          <>
                            <Link className="w-4 h-4 mr-2" />
                            生成协助码
                          </>
                        )}
                      </Button>
                    </div>

                    {/* 作为协助者 - 输入协助码 */}
                    <div className="p-6 border-2 border-dashed border-blue-200 rounded-xl bg-blue-50/50 hover:border-blue-400 transition-colors">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 rounded-full bg-blue-100">
                          <Users className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">我来帮助他人</h4>
                          <p className="text-sm text-gray-500">输入对方的协助码，远程帮助操作</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="输入6位协助码"
                          value={remoteInputCode}
                          onChange={(e) => setRemoteInputCode(e.target.value.toUpperCase().slice(0, 6))}
                          className="flex-1 text-center text-lg font-mono tracking-widest"
                          maxLength={6}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && remoteInputCode.length === 6) {
                              handleJoinRemoteSession()
                            }
                          }}
                        />
                        <Button
                          onClick={handleJoinRemoteSession}
                          disabled={remoteLoading || remoteInputCode.length !== 6}
                        >
                          {remoteLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            '加入'
                          )}
                        </Button>
                      </div>
                    </div>

                    {remoteError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm">{remoteError}</span>
                      </div>
                    )}

                    {/* 说明 */}
                    <div className="p-4 bg-gray-50 border rounded-lg">
                      <h4 className="font-medium mb-2">使用说明</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• 协助码有效期为 5 分钟，过期需重新生成</li>
                        <li>• 每个协助码只允许一人加入（一对一）</li>
                        <li>• 使用 P2P 直连技术，数据直接在两端传输，延迟极低</li>
                        <li>• 连接后双方画布完全同步，任何操作都会实时同步</li>
                        <li>• 双方都可以添加、删除、移动模块和连线</li>
                        <li>• 你可以随时断开连接结束协助</li>
                      </ul>
                    </div>
                  </div>
                ) : remoteMode === 'host' ? (
                  // 主机模式 - 等待/已连接
                  <div className="space-y-6">
                    <div className="p-6 border rounded-xl bg-white shadow-sm">
                      <div className="text-center mb-6">
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                          remoteStatus === 'connected' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${
                            remoteStatus === 'connected' ? 'bg-green-500' : 'bg-yellow-500'
                          } animate-pulse`} />
                          {remoteStatus === 'connected' ? '已连接' : '等待协助者加入...'}
                        </div>
                      </div>

                      <div className="mb-6">
                        <Label className="text-center block mb-2">你的协助码</Label>
                        <div className="flex items-center justify-center gap-2">
                          <div className="text-4xl font-mono font-bold tracking-[0.5em] text-purple-600 bg-purple-50 px-6 py-4 rounded-xl border-2 border-purple-200">
                            {remoteAssistCode}
                          </div>
                          <Button
                            variant="tonal-info"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(remoteAssistCode)
                              alert('协助码已复制', { title: '已复制' })
                            }}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-center text-sm text-gray-500 mt-2">
                          将此协助码发送给需要帮助你的人
                        </p>
                      </div>

                      {remoteGuestConnected && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
                          <div className="flex items-center gap-2 text-green-700">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">
                              协助者已连接，画布已同步，双方操作实时共享
                              {remoteConnectionType === 'p2p' && (
                                <span className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-600 text-xs rounded">P2P 直连</span>
                              )}
                            </span>
                          </div>
                        </div>
                      )}

                      <Button
                        variant="outline"
                        className="w-full border-red-300 text-red-600 hover:bg-red-50"
                        onClick={handleCloseRemoteSession}
                      >
                        <Unlink className="w-4 h-4 mr-2" />
                        断开连接
                      </Button>
                    </div>

                    {remoteError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm">{remoteError}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  // 协助者模式 - 连接中/已连接
                  <div className="space-y-6">
                    <div className="p-6 border rounded-xl bg-white shadow-sm">
                      <div className="text-center mb-6">
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                          remoteStatus === 'connected' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${
                            remoteStatus === 'connected' ? 'bg-green-500' : 'bg-blue-500'
                          } animate-pulse`} />
                          {remoteStatus === 'connected' ? '已连接' : '正在连接...'}
                        </div>
                      </div>

                      <div className="mb-6 text-center">
                        <p className="text-sm text-gray-500 mb-2">正在协助</p>
                        <div className="text-2xl font-mono font-bold tracking-widest text-blue-600">
                          {remoteAssistCode}
                        </div>
                      </div>

                      {remoteStatus === 'connected' && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
                          <div className="flex items-center gap-2 text-green-700">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">
                              已连接，画布已同步，你的操作会实时同步到对方
                              {remoteConnectionType === 'p2p' && (
                                <span className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-600 text-xs rounded">P2P 直连</span>
                              )}
                            </span>
                          </div>
                        </div>
                      )}

                      <Button
                        variant="outline"
                        className="w-full border-red-300 text-red-600 hover:bg-red-50"
                        onClick={handleCloseRemoteSession}
                      >
                        <Unlink className="w-4 h-4 mr-2" />
                        断开连接
                      </Button>
                    </div>

                    {remoteError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm">{remoteError}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 设置标签页 */}
          {activeTab === 'settings' && (
            <div className="h-full overflow-y-auto p-6">
              <div className="max-w-xl mx-auto space-y-6">
                <div className="text-center mb-8">
                  <Settings className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <h3 className="text-lg font-semibold">仓库设置</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="hub-url">仓库服务器地址</Label>
                    <Input
                      id="hub-url"
                      value={tempHubUrl}
                      onChange={(e) => setTempHubUrl(e.target.value)}
                      placeholder={DEFAULT_HUB_URL}
                    />
                    <p className="text-xs text-gray-500 mt-1">默认地址：{DEFAULT_HUB_URL}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleResetUrl}>
                      重置为默认
                    </Button>
                    <Button onClick={handleSaveSettings}>保存设置</Button>
                  </div>
                </div>

                {/* 身份ID管理 */}
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-3">
                  <div className="flex items-center gap-2">
                    <Key className="w-5 h-5 text-purple-500" />
                    <h4 className="font-medium text-purple-900">身份ID管理</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-purple-700 flex-shrink-0">当前ID:</span>
                    <code className="text-xs bg-white px-2 py-1 rounded border flex-1 truncate font-mono text-gray-700">
                      {getClientId()}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                      onClick={async () => {
                        navigator.clipboard.writeText(getClientId())
                        await alert('身份ID已复制到剪贴板', { title: '已复制' })
                      }}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="pt-2 border-t border-purple-200">
                    <Label htmlFor="import-client-id" className="text-sm text-purple-700">导入身份ID</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="import-client-id"
                        value={tempClientId}
                        onChange={(e) => setTempClientId(e.target.value)}
                        placeholder="粘贴其他浏览器的身份ID..."
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!tempClientId.trim()}
                        onClick={async () => {
                          const confirmed = await confirm('导入后将替换当前的身份ID，你之前发布的工作流将不再显示在"我的"列表中（除非你保存了当前ID）。确定要继续吗？', { title: '确认导入身份ID？' })
                          if (confirmed) {
                            localStorage.setItem('workflow_hub_client_id', tempClientId.trim())
                            setTempClientId('')
                            loadMyWorkflows()
                            await alert('身份ID已更新，现在你可以管理该ID下发布的工作流了', { title: '导入成功' })
                          }
                        }}
                      >
                        导入
                      </Button>
                    </div>
                    <p className="text-xs text-purple-600 mt-1">
                      从其他浏览器的"我的"页面复制身份ID，粘贴到这里即可同步身份
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 border rounded-lg">
                  <h4 className="font-medium mb-2">关于工作流仓库</h4>
                  <p className="text-sm text-gray-600">
                    工作流仓库是一个公共平台，用户可以在这里分享和下载工作流。
                    你也可以搭建自己的私有仓库服务器，只需将地址改为你的服务器地址即可。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 工作流详情弹窗 */}
        {selectedWorkflow && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 animate-fade-in" style={{ zIndex: 2147483647 }}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
              <div className="p-6 overflow-y-auto flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold">{selectedWorkflow.name}</h3>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                      {selectedWorkflow.category}
                    </span>
                  </div>
                  <button onClick={() => setSelectedWorkflow(null)} className="p-1 hover:bg-gray-100 rounded">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-gray-600 mb-4">{selectedWorkflow.description || '暂无描述'}</p>

                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <User className="w-4 h-4" />
                    <span>作者：{selectedWorkflow.author}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Package className="w-4 h-4" />
                    <span>节点数：{selectedWorkflow.node_count}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Download className="w-4 h-4" />
                    <span>下载量：{selectedWorkflow.download_count}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>发布于：{new Date(selectedWorkflow.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {selectedWorkflow.tags && selectedWorkflow.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Tag className="w-4 h-4 text-gray-400" />
                    {selectedWorkflow.tags.map((tag, i) => (
                      <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => handleDownload(selectedWorkflow, 'replace')}
                    disabled={downloading || deleting}
                  >
                    {downloading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        导入中...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        覆盖导入
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleDownload(selectedWorkflow, 'merge')}
                    disabled={downloading || deleting}
                  >
                    {downloading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        导入中...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        追加导入
                      </>
                    )}
                  </Button>
                </div>
                {isOwner && (
                  <Button
                    variant="outline"
                    className="w-full mt-2 border-red-300 text-red-600 hover:bg-red-50"
                    onClick={() => handleDelete(selectedWorkflow)}
                    disabled={deleting || downloading}
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        删除中...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        删除此工作流
                      </>
                    )}
                  </Button>
                )}

                {/* 评论区 */}
                <div className="mt-6 pt-4 border-t">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquare className="w-5 h-5 text-purple-500" />
                    <span className="font-medium">评论区</span>
                    <span className="text-sm text-gray-500">({comments.length})</span>
                  </div>

                  {/* 发表评论 */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex gap-2 mb-2">
                      <Input
                        placeholder="昵称（可选）"
                        value={commentNickname}
                        onChange={(e) => setCommentNickname(e.target.value)}
                        className="w-28"
                        maxLength={20}
                      />
                      <Select
                        value={commentType}
                        onChange={(e) => setCommentType(e.target.value)}
                        className="w-24"
                      >
                        {COMMENT_TYPES.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="写下你的评论..."
                        value={commentContent}
                        onChange={(e) => setCommentContent(e.target.value)}
                        className="flex-1"
                        maxLength={500}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey && commentContent.trim()) {
                            handleSubmitComment(selectedWorkflow.id)
                          }
                        }}
                      />
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => handleSubmitComment(selectedWorkflow.id)}
                        disabled={submittingComment || !commentContent.trim()}
                      >
                        {submittingComment ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* 评论列表 */}
                  <div 
                    className="space-y-3 max-h-60 overflow-y-auto"
                    onScroll={(e) => {
                      const target = e.target as HTMLDivElement
                      const { scrollTop, scrollHeight, clientHeight } = target
                      // 滚动到距离底部 50px 时加载更多
                      if (scrollHeight - scrollTop - clientHeight < 50 && !commentsLoading && commentsHasMore && selectedWorkflow) {
                        loadComments(selectedWorkflow.id, true)
                      }
                    }}
                  >
                    {commentsLoading && comments.length === 0 ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
                      </div>
                    ) : comments.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        暂无评论，来发表第一条吧！
                      </div>
                    ) : (
                      <>
                        {comments.map((comment) => (
                          <div key={comment.id} className="p-3 bg-white border rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm" data-no-i18n>{comment.nickname}</span>
                                <span data-no-i18n className={`text-xs px-1.5 py-0.5 rounded ${
                                  comment.comment_type === '使用心得' ? 'bg-blue-100 text-blue-700' :
                                  comment.comment_type === '问题求助' ? 'bg-yellow-100 text-yellow-700' :
                                  comment.comment_type === '建议改进' ? 'bg-green-100 text-green-700' :
                                  comment.comment_type === '感谢' ? 'bg-pink-100 text-pink-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {comment.comment_type}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">
                                  {new Date(comment.created_at).toLocaleString()}
                                </span>
                                {comment.isOwner && (
                                  <button
                                    onClick={() => handleDeleteComment(comment.id)}
                                    className="text-xs text-red-500 hover:text-red-700 hover:underline"
                                  >
                                    删除
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-gray-700" data-no-i18n>{comment.content}</p>
                          </div>
                        ))}
                        {commentsLoading && (
                          <div className="flex items-center justify-center py-2">
                            <Loader2 className="w-4 h-4 animate-spin text-purple-500 mr-2" />
                            <span className="text-xs text-gray-500">加载更多...</span>
                          </div>
                        )}
                        {!commentsHasMore && comments.length > 0 && (
                          <div className="text-center py-2 text-xs text-gray-400">
                            已加载全部评论
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 编辑工作流弹窗 */}
        {editingWorkflow && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 animate-fade-in" style={{ zIndex: 2147483647 }}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
              <div className="p-6 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">编辑工作流</h3>
                  <button onClick={cancelEdit} className="p-1 hover:bg-gray-100 rounded">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-name">
                      工作流名称 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="edit-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="工作流名称"
                      maxLength={50}
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-description">功能描述</Label>
                    <textarea
                      id="edit-description"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="描述一下这个工作流的功能和用途..."
                      className="w-full px-3 py-2 border rounded-md text-sm resize-none h-24"
                      maxLength={500}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-author">作者名称</Label>
                      <Input
                        id="edit-author"
                        value={editAuthor}
                        onChange={(e) => setEditAuthor(e.target.value)}
                        placeholder="匿名"
                        maxLength={30}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-category">分类</Label>
                      <Select
                        id="edit-category"
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                      >
                        <option value="数据采集">数据采集</option>
                        <option value="自动化操作">自动化操作</option>
                        <option value="表单填写">表单填写</option>
                        <option value="AI应用">AI应用</option>
                        <option value="定时任务">定时任务</option>
                        <option value="其他">其他</option>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="edit-tags">标签（用逗号分隔，最多5个）</Label>
                    <Input
                      id="edit-tags"
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      placeholder="例如：爬虫, 自动化, 签到"
                    />
                  </div>

                  {/* 更新工作流内容 */}
                  <div className="border-t pt-4">
                    <Label className="mb-2 block">更新工作流内容（可选）</Label>
                    <div className="flex gap-1 p-1 bg-[hsl(var(--slate-100))] rounded-[8px] border border-[hsl(var(--slate-200))] shadow-[inset_0_1px_2px_rgb(15_23_42_/_0.04)] mb-3">
                      <button
                        className={`flex-1 py-1.5 px-3 rounded-[6px] text-[12px] font-semibold transition-all duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] border ${
                          editContentMode === 'none'
                            ? '!bg-[hsl(var(--slate-700))] !text-white !border-[hsl(var(--slate-800))] shadow-soft'
                            : '!bg-transparent !text-[hsl(var(--slate-600))] !border-transparent hover:!text-[hsl(var(--slate-900))] hover:!bg-[hsl(var(--card))]'
                        }`}
                        onClick={() => {
                          setEditContentMode('none')
                          setEditUploadedWorkflow(null)
                          setEditUploadFileName('')
                        }}
                      >
                        不更新内容
                      </button>
                      <button
                        className={`flex-1 py-1.5 px-3 rounded-[6px] text-[12px] font-semibold transition-all duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] border ${
                          editContentMode === 'current'
                            ? '!bg-[hsl(var(--brand-600))] !text-white !border-[hsl(var(--brand-700))] shadow-brand-glow'
                            : '!bg-transparent !text-[hsl(var(--slate-600))] !border-transparent hover:!text-[hsl(var(--brand-700))] hover:!bg-[hsl(var(--card))]'
                        }`}
                        onClick={() => {
                          setEditContentMode('current')
                          setEditUploadedWorkflow(null)
                          setEditUploadFileName('')
                        }}
                      >
                        用当前工作流
                      </button>
                      <button
                        className={`flex-1 py-1.5 px-3 rounded-[6px] text-[12px] font-semibold transition-all duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] border ${
                          editContentMode === 'file'
                            ? '!bg-[hsl(var(--brand-600))] !text-white !border-[hsl(var(--brand-700))] shadow-brand-glow'
                            : '!bg-transparent !text-[hsl(var(--slate-600))] !border-transparent hover:!text-[hsl(var(--brand-700))] hover:!bg-[hsl(var(--card))]'
                        }`}
                        onClick={() => setEditContentMode('file')}
                      >
                        上传文件
                      </button>
                    </div>

                    {editContentMode === 'current' && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                          将使用当前画布的工作流替换：{nodes.length} 个节点，{edges.length} 条连线
                        </p>
                      </div>
                    )}

                    {editContentMode === 'file' && (
                      <div>
                        {editUploadedWorkflow ? (
                          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <FileJson className="w-5 h-5 text-green-600" />
                                <div>
                                  <p className="text-sm font-medium text-green-800">{editUploadFileName}</p>
                                  <p className="text-xs text-green-600">
                                    {editUploadedWorkflow.nodes.length} 个节点，{editUploadedWorkflow.edges.length} 条连线
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={handleClearEditUpload}
                                className="p-1 hover:bg-green-100 rounded text-green-600 has-hover-only"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label className="block">
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-colors">
                              <FileUp className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                              <p className="text-sm text-gray-600">点击上传工作流 JSON 文件</p>
                            </div>
                            <input
                              type="file"
                              accept=".json"
                              onChange={handleEditFileUpload}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {updateError && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm">{updateError}</span>
                  </div>
                )}

                <div className="flex gap-2 mt-6">
                  <Button variant="outline" className="flex-1" onClick={cancelEdit} disabled={updating}>
                    取消
                  </Button>
                  <Button variant="success" className="flex-1" onClick={handleUpdateWorkflow} disabled={updating}>
                    {updating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        保存中...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        保存修改
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 确认对话框 */}
        <ConfirmDialog />

        {/* 发布自定义模块到社区弹层 */}
        {publishingModule && (
          <div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => !publishModuleSubmitting && setPublishingModule(null)}
          >
            <div
              className="w-full max-w-md rounded-lg bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-purple-500" />
                  <span className="font-medium text-sm text-black">发布到社区</span>
                </div>
                <button
                  onClick={() => !publishModuleSubmitting && setPublishingModule(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: (publishingModule.color || '#8B5CF6') + '22' }}
                  >
                    <span>{publishingModule.icon || '📦'}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-black truncate">{publishingModule.display_name || publishingModule.name}</div>
                    <div className="text-xs text-gray-500 truncate">{publishingModule.description || '（无描述）'}</div>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-700">作者署名</Label>
                  <Input
                    placeholder="留空则显示为匿名"
                    value={publishModuleAuthor}
                    onChange={(e) => setPublishModuleAuthor(e.target.value)}
                    className="mt-1 bg-white text-black"
                    maxLength={30}
                  />
                </div>
                <div className="text-xs text-gray-500 bg-blue-50 rounded-lg p-3 space-y-1">
                  <p>· 模块的内部工作流、参数、输出将一并发布到社区</p>
                  <p>· 请勿包含账号密码等敏感信息</p>
                  <p>· 你可在「在线社区 - 我发布的」中删除自己发布的模块</p>
                </div>
                {publishModuleError && (
                  <div className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />{publishModuleError}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 px-4 py-3 border-t">
                <Button variant="outline" size="sm" onClick={() => setPublishingModule(null)} disabled={publishModuleSubmitting}>
                  取消
                </Button>
                <Button size="sm" onClick={handlePublishModule} disabled={publishModuleSubmitting}>
                  {publishModuleSubmitting ? (
                    <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />发布中...</>
                  ) : (
                    <><Upload className="w-3.5 h-3.5 mr-1" />确认发布</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 社区模块详情：评论 / 评分 / 举报 */}
        {detailModule && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDetailModule(null)}>
            <div className="w-full max-w-lg max-h-[80vh] flex flex-col rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0" style={{ background: (detailModule.color || '#8B5CF6') + '22' }}>
                    <span>{detailModule.icon || '📦'}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-black truncate">{detailModule.display_name || detailModule.name}</div>
                    <div className="text-[11px] text-gray-500">v{detailModule.version} · {detailModule.author || '匿名'} · 下载 {detailModule.download_count || 0}</div>
                  </div>
                </div>
                <button onClick={() => setDetailModule(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <p className="text-sm text-gray-600">{detailModule.description || '（无描述）'}</p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">综合评分</span>
                  <span className="flex items-center gap-0.5 text-amber-500 font-medium">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />{moduleAvgRating || '—'}
                  </span>
                  <span className="text-gray-400 text-xs">（{moduleComments.length} 条评论）</span>
                </div>

                {/* 发表评论 + 评分 */}
                <div className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <Input placeholder="昵称（可选）" value={commentNick} onChange={(e) => setCommentNick(e.target.value)} className="h-8 text-sm bg-white text-black w-32" maxLength={30} />
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} onClick={() => setCommentRating(n === commentRating ? 0 : n)} title={`${n} 星`}>
                          <Star className={`w-4 h-4 ${n <= commentRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="写下你的使用感受或建议…"
                    rows={2}
                    maxLength={500}
                    className="w-full text-sm border border-gray-300 rounded p-2 bg-white text-black resize-none"
                  />
                  <div className="flex justify-end">
                    <Button size="sm" onClick={submitHubComment} disabled={commentSubmitting || !commentInput.trim()}>
                      {commentSubmitting ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1" />}发表
                    </Button>
                  </div>
                </div>

                {/* 评论列表 */}
                {moduleComments.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">还没有评论，来抢沙发吧</p>
                ) : moduleComments.map((c) => (
                  <div key={c.id} className="border-b border-gray-100 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-black" data-no-i18n>{c.nickname}</span>
                        {c.rating > 0 && (
                          <span className="flex items-center text-amber-500 text-xs">
                            {Array.from({ length: c.rating }).map((_, i) => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
                          </span>
                        )}
                      </div>
                      {c.isOwner && (
                        <button onClick={() => deleteHubComment(c.id)} className="text-gray-300 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5" data-no-i18n>{c.content}</p>
                    <span className="text-[11px] text-gray-400">{new Date(c.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between gap-2 px-4 py-3 border-t">
                <Button variant="outline" size="sm" className="text-gray-500" onClick={() => reportHubModule(detailModule)}>
                  <AlertCircle className="w-3.5 h-3.5 mr-1" />举报
                </Button>
                <Button size="sm" onClick={() => handleDownloadHubModule(detailModule)} disabled={downloadingHubModuleId === detailModule.id}>
                  <Download className="w-3.5 h-3.5 mr-1" />下载到本地
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 编辑社区模块元信息（版本更新） */}
        {editingHubModule && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !editHubSubmitting && setEditingHubModule(null)}>
            <div className="w-full max-w-md rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <span className="font-medium text-sm text-black">编辑社区模块（版本更新）</span>
                <button onClick={() => !editHubSubmitting && setEditingHubModule(null)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <Label className="text-xs text-gray-700">显示名称</Label>
                  <Input value={editHubForm.display_name} onChange={(e) => setEditHubForm({ ...editHubForm, display_name: e.target.value })} className="mt-1 bg-white text-black" maxLength={50} />
                </div>
                <div>
                  <Label className="text-xs text-gray-700">描述</Label>
                  <Input value={editHubForm.description} onChange={(e) => setEditHubForm({ ...editHubForm, description: e.target.value })} className="mt-1 bg-white text-black" maxLength={500} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-gray-700">分类</Label>
                    <Input value={editHubForm.category} onChange={(e) => setEditHubForm({ ...editHubForm, category: e.target.value })} className="mt-1 bg-white text-black" />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-700">版本号</Label>
                    <Input value={editHubForm.version} onChange={(e) => setEditHubForm({ ...editHubForm, version: e.target.value })} className="mt-1 bg-white text-black" maxLength={20} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-700">标签（逗号分隔，最多 8 个）</Label>
                  <Input value={editHubForm.tags} onChange={(e) => setEditHubForm({ ...editHubForm, tags: e.target.value })} className="mt-1 bg-white text-black" placeholder="如：自动化, 数据" />
                </div>
              </div>
              <div className="flex justify-end gap-2 px-4 py-3 border-t">
                <Button variant="outline" size="sm" onClick={() => setEditingHubModule(null)} disabled={editHubSubmitting}>取消</Button>
                <Button size="sm" onClick={submitEditHub} disabled={editHubSubmitting}>
                  {editHubSubmitting ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />保存中...</> : '保存更新'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </DialogPortal>
  )
}
