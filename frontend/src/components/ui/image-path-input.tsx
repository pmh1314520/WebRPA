import { useState, useEffect, useCallback, useRef } from 'react'
import { FolderOpen, ChevronRight, Folder, Image } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { systemApi, imageAssetApi } from '@/services/api'
import { getBackendBaseUrl } from '@/services/config'
import type { ImageAsset } from '@/types'

interface ImagePathInputProps {
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
}

export function ImagePathInput({ value, onChange, className, placeholder = '输入图片路径或从资源选择' }: ImagePathInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [assets, setAssets] = useState<ImageAsset[]>([])
  const [folders, setFolders] = useState<string[]>([])
  const [currentPath, setCurrentPath] = useState<string>('')
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  // 加载资源
  const loadData = useCallback(async () => {
    const [assetsResult, foldersResult] = await Promise.all([
      imageAssetApi.list(),
      imageAssetApi.listFolders()
    ])
    if (assetsResult.data) setAssets(assetsResult.data)
    if (foldersResult.data) setFolders(foldersResult.data)
  }, [])

  // 初始加载
  useEffect(() => {
    loadData()
  }, [loadData])

  // 打开下拉框时重新加载数据
  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen, loadData])

  // 获取当前路径下的项目
  const getCurrentItems = useCallback(() => {
    const subfolders = folders.filter(f => {
      if (!currentPath) {
        return !f.includes('/')
      } else {
        const prefix = currentPath + '/'
        return f.startsWith(prefix) && !f.substring(prefix.length).includes('/')
      }
    })
    const files = assets.filter(a => a.folder === currentPath)
    return { subfolders, files }
  }, [folders, assets, currentPath])

  const { subfolders, files } = getCurrentItems()

  // 更新面包屑
  useEffect(() => {
    setBreadcrumbs(currentPath ? currentPath.split('/') : [])
  }, [currentPath])

  // 导航到指定路径
  const navigateTo = (path: string) => {
    setCurrentPath(path)
  }

  // 选择文件
  const selectFile = (asset: ImageAsset) => {
    const assetWithPath = asset as ImageAsset & { path?: string }
    onChange(assetWithPath.path || asset.originalName)
    setIsOpen(false)
  }

  // 处理文件选择
  const handleFileSelect = async () => {
    try {
      const result = await systemApi.selectFile('选择图片', undefined, [
        ['图片文件', '*.png;*.jpg;*.jpeg;*.gif;*.bmp;*.webp'],
        ['所有文件', '*.*']
      ])
      if (result.data?.success && result.data.path) {
        onChange(result.data.path)
      }
    } catch (error) {
      console.error('选择文件失败:', error)
    }
  }

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const API_BASE = getBackendBaseUrl()

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* 输入框和按钮 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            // 已填写路径且资源库为空时，不再自动弹出空下拉（避免"一直提示暂无图像"的骚扰）；
            // 资源库有图或尚未填写时才自动展开，方便快速选取。
            if (!value || assets.length > 0) setIsOpen(true)
          }}
          placeholder={placeholder}
          className={cn(
            'flex-1 px-3 py-2 text-sm',
            'bg-white border border-gray-300 rounded-md',
            'hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500',
            'transition-colors duration-150',
            'placeholder:text-gray-400'
          )}
        />
        <Button
          type="button"
          variant="tonal-warning"
          size="icon"
          onClick={handleFileSelect}
          className="shrink-0"
        >
          <FolderOpen className="w-4 h-4" />
        </Button>
      </div>

      {/* 下拉面板 */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-80 flex flex-col animate-in fade-in zoom-in-95 duration-150">
          {/* 面包屑导航 */}
          {currentPath && (
            <div className="flex items-center gap-1 px-3 py-2 bg-gray-50 border-b text-xs overflow-x-auto">
              <button
                className="flex items-center gap-1 px-2 py-1 hover:bg-white rounded transition-colors whitespace-nowrap"
                onClick={() => navigateTo('')}
              >
                <Folder className="w-3 h-3 text-green-600" />
                <span>根目录</span>
              </button>
              {breadcrumbs.map((crumb, index) => {
                const path = breadcrumbs.slice(0, index + 1).join('/')
                return (
                  <div key={path} className="flex items-center gap-1">
                    <ChevronRight className="w-3 h-3 text-gray-400" />
                    <button
                      className="px-2 py-1 hover:bg-white rounded transition-colors whitespace-nowrap"
                      onClick={() => navigateTo(path)}
                    >
                      {crumb}
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* 文件和文件夹列表 */}
          <div className="overflow-y-auto flex-1 p-2">
            {subfolders.length === 0 && files.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                {assets.length === 0 ? (
                  <>
                    <Image className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>图像资源库为空（可选）</p>
                    <p className="text-xs mt-1 px-3 leading-relaxed">可直接在上方输入框填写图片路径，或点右侧按钮从电脑选择；也可到「图像」面板上传常用图片，方便下次快速选取。</p>
                  </>
                ) : (
                  <>
                    <Folder className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>此文件夹为空</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {/* 文件夹 */}
                {subfolders.map(folderPath => {
                  const folderName = folderPath.split('/').pop() || folderPath
                  const folderAssets = assets.filter(a => a.folder === folderPath || a.folder.startsWith(folderPath + '/'))
                  return (
                    <button
                      key={folderPath}
                      type="button"
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-green-50 rounded-md transition-colors text-left group"
                      onClick={() => navigateTo(folderPath)}
                    >
                      <Folder className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span className="flex-1 truncate font-medium text-gray-700 group-hover:text-green-700">
                        {folderName}
                      </span>
                      {folderAssets.length > 0 && (
                        <span className="text-xs text-gray-400 group-hover:text-green-600">
                          {folderAssets.length}
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-green-600 flex-shrink-0" />
                    </button>
                  )
                })}

                {/* 文件 */}
                {files.map(asset => {
                  const assetWithPath = asset as ImageAsset & { path?: string }
                  const assetPath = assetWithPath.path || asset.originalName
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left',
                        value === assetPath
                          ? 'bg-green-100 text-green-700'
                          : 'hover:bg-gray-50 text-gray-700'
                      )}
                      onClick={() => selectFile(asset)}
                    >
                      <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                        <img
                          src={`${API_BASE}/api/image-assets/${asset.id}/thumbnail`}
                          alt={asset.originalName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                            const parent = e.currentTarget.parentElement
                            if (parent) {
                              parent.innerHTML = '<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>'
                            }
                          }}
                        />
                      </div>
                      <span className="flex-1 truncate">
                        {asset.originalName}
                      </span>
                      {value === assetPath && (
                        <div className="w-2 h-2 bg-green-600 rounded-full flex-shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
