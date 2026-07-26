import { useEffect, useState } from 'react'
import type { NodeData } from '@/store/workflowStore'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { SelectNative as Select } from '@/components/ui/select-native'
import { VariableInput } from '@/components/ui/variable-input'
import { VariableNameInput } from '@/components/ui/variable-name-input'
import { localWorkflowApi } from '@/services/api'

interface Props {
  data: NodeData
  onChange: (key: string, value: unknown) => void
}

/**
 * 「运行其它工作流」配置面板
 *
 * 让用户把多条工作流串成一条业务链：工作流1 跑完自动跑工作流2。
 * 工作流下拉列表直接读「当前工作流保存文件夹」，避免用户手打文件名出错；
 * 同时保留手填输入框，支持用变量动态指定要跑哪条工作流。
 */
export function RunWorkflowFileConfig({ data, onChange }: Props) {
  const [workflows, setWorkflows] = useState<Array<{ filename: string; name: string }>>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    localWorkflowApi.list()
      .then((res) => {
        const list = (res as { data?: { workflows?: Array<{ filename: string; name: string }> } })
          ?.data?.workflows || []
        if (alive) setWorkflows(list)
      })
      .catch(() => { /* 列表拉取失败不阻塞手填 */ })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const current = String(data.workflowFile || '')
  const waitComplete = data.waitComplete === undefined ? true : Boolean(data.waitComplete)

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="workflowFile">要运行的工作流</Label>
        <Select
          id="workflowFilePicker"
          value={workflows.some((w) => w.filename === current) ? current : ''}
          onChange={(e) => { if (e.target.value) onChange('workflowFile', e.target.value) }}
        >
          <option value="">{loading ? '加载工作流列表中…' : '— 从当前工作流文件夹选择 —'}</option>
          {workflows.map((w) => (
            <option key={w.filename} value={w.filename}>
              {w.name || w.filename}
            </option>
          ))}
        </Select>
        <VariableInput
          value={current}
          onChange={(v) => onChange('workflowFile', v)}
          placeholder="工作流文件名，如 数据采集.json，支持 {变量名}"
        />
        <p className="text-xs text-muted-foreground">
          从「工作流保存文件夹」中读取，可带或不带 .json 后缀，也可填工作流名称或绝对路径。
        </p>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="waitComplete" className="cursor-pointer">等待其执行完成</Label>
          <Switch
            id="waitComplete"
            checked={waitComplete}
            onCheckedChange={(v) => onChange('waitComplete', v)}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          开启（推荐）：本模块会等目标工作流完整跑完再继续，实现「工作流1 跑完自动跑工作流2」。
          关闭：只负责发起，立刻继续往下走（并行触发）。
        </p>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="passVariables" className="cursor-pointer">把当前变量传给它</Label>
          <Switch
            id="passVariables"
            checked={data.passVariables === undefined ? true : Boolean(data.passVariables)}
            onCheckedChange={(v) => onChange('passVariables', v)}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          开启后，目标工作流可以直接用 {'{变量名}'} 引用当前工作流已有的变量。
        </p>
      </div>

      {waitComplete && (
        <>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="collectVariables" className="cursor-pointer">回收它产生的变量</Label>
              <Switch
                id="collectVariables"
                checked={data.collectVariables === undefined ? true : Boolean(data.collectVariables)}
                onCheckedChange={(v) => onChange('collectVariables', v)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              开启后，目标工作流里产生/更新的变量会带回到当前工作流，便于后续模块直接使用。
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="stopOnFail" className="cursor-pointer">它失败时中断当前工作流</Label>
              <Switch
                id="stopOnFail"
                checked={data.stopOnFail === undefined ? true : Boolean(data.stopOnFail)}
                onCheckedChange={(v) => onChange('stopOnFail', v)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              关闭则目标工作流失败也继续往下执行（失败信息仍会记入日志与结果变量）。
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="resultVariable">执行结果存储到变量</Label>
            <VariableNameInput
              value={String(data.resultVariable || '')}
              onChange={(v) => onChange('resultVariable', v)}
              placeholder="sub_workflow_result"
              isStorageVariable={true}
            />
            <p className="text-xs text-muted-foreground">
              结果为字典：{'{ workflow, file, success, executed_nodes, failed_nodes, error }'}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
