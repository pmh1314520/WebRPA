import { ScheduledTasksPage } from './ScheduledTasksPage'
import { DialogPortal } from '@/components/ui/dialog-portal'

interface ScheduledTasksDialogProps {
  open: boolean
  onClose: () => void
}

export function ScheduledTasksDialog({ open, onClose }: ScheduledTasksDialogProps) {
  if (!open) return null

  return (
    <DialogPortal>
      <div
        className="fixed inset-0 bg-[hsl(217_45%_15%_/_0.55)] backdrop-blur-[3px] flex items-center justify-center p-4 animate-fade-in"
        style={{ zIndex: 2147483646 }}
        onClick={onClose}
      >
        <div
          // overflow-hidden + 内部 min-h-0：让 max-h 生效并把滚动交给列表区，
          // 否则任务多了会整体撑高、超出视口且无法滚动。
          className="modern-dialog w-full max-w-[1400px] max-h-[92vh] flex flex-col overflow-hidden animate-scale-in-bounce"
          onClick={(e) => e.stopPropagation()}
        >
          <ScheduledTasksPage onClose={onClose} />
        </div>
      </div>
    </DialogPortal>
  )
}
