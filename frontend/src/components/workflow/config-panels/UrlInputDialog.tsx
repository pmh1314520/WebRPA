import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { UrlInput } from '@/components/ui/url-input'
import { X } from 'lucide-react'
import { DialogPortal } from '@/components/ui/dialog-portal'

interface UrlInputDialogProps {
  isOpen: boolean
  url: string
  onUrlChange: (url: string) => void
  onClose: () => void
  onConfirm: () => void
}

export function UrlInputDialog({ 
  isOpen, 
  url, 
  onUrlChange, 
  onClose, 
  onConfirm
}: UrlInputDialogProps) {
  if (!isOpen) return null

  return (
    <DialogPortal>
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 animate-fade-in" style={{ zIndex: 2147483646 }}>
      <div className="bg-white text-black border border-gray-200 rounded-xl shadow-2xl w-full max-w-md p-4 overflow-hidden animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">选择元素</h3>
          <Button variant="tonal-danger" size="icon" onClick={onClose} title="关闭">

            <X className="w-4 h-4" />

          </Button>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-gray-700">输入要选择元素的网页URL（可选）</Label>
            <UrlInput
              value={url}
              onChange={onUrlChange}
              placeholder="留空则使用当前页面，或输入新URL"
              className="bg-white text-black border-gray-300"
            />
            <p className="text-xs text-gray-500">
              提示：留空直接使用已打开的浏览器页面，输入URL会自动复用已打开的相同页面
            </p>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>Ctrl+点击</strong>：选择单个元素<br/>
              <strong>Alt+点击</strong>：选择相似元素（先点第一个，再点第二个相似的）
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100" onClick={onClose}>
              取消
            </Button>
            <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={onConfirm}>
              启动选择器
            </Button>
          </div>
        </div>
      </div>
    </div>
    </DialogPortal>
  )
}
