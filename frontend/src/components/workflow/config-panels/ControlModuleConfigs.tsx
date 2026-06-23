import { Label } from '@/components/ui/label'
import { VariableInput } from '@/components/ui/variable-input'
import { SelectNative as Select } from '@/components/ui/select-native'
import { useWorkflowStore, type NodeData } from '@/store/workflowStore'

interface ConfigProps {
  data: NodeData
  onChange: (key: string, value: unknown) => void
  renderSelectorInput?: (id: string, label: string, placeholder: string) => React.JSX.Element
}

// 条件判断配置
export function ConditionConfig({ data, onChange, renderSelectorInput }: ConfigProps) {
  const conditionType = (data.conditionType as string) || 'variable'
  const operator = (data.operator as string) || '=='

  // 需要右值的运算符
  const needsRightValue = !['isEmpty', 'isNotEmpty'].includes(operator)

  return (
    <div className="space-y-4">
      {/* 判断类型 */}
      <div className="space-y-2">
        <Label htmlFor="conditionType">判断类型</Label>
        <Select
          id="conditionType"
          value={conditionType}
          onChange={(e) => onChange('conditionType', e.target.value)}
        >
          <option value="variable">变量比较</option>
          <option value="boolean">布尔判断</option>
          <option value="logic">逻辑运算（与/或/非）</option>
          <option value="element_exists">元素存在判断</option>
          <option value="element_visible">元素可见判断</option>
        </Select>
      </div>

      {/* 变量比较 */}
      {conditionType === 'variable' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="leftValue">左值</Label>
            <VariableInput
              value={(data.leftValue as string) || ''}
              onChange={(v) => onChange('leftValue', v)}
              placeholder="输入变量 {变量名} 或字面量"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="operator">运算符</Label>
            <Select
              id="operator"
              value={operator}
              onChange={(e) => onChange('operator', e.target.value)}
            >
              <option value="==">等于 (==)</option>
              <option value="!=">不等于 (!=)</option>
              <option value=">">大于 (&gt;)</option>
              <option value="<">小于 (&lt;)</option>
              <option value=">=">大于等于 (&gt;=)</option>
              <option value="<=">小于等于 (&lt;=)</option>
              <option value="contains">包含</option>
              <option value="not_contains">不包含</option>
              <option value="startswith">开头是</option>
              <option value="endswith">结尾是</option>
              <option value="in">在列表中</option>
              <option value="not_in">不在列表中</option>
              <option value="isEmpty">为空</option>
              <option value="isNotEmpty">不为空</option>
            </Select>
          </div>
          {needsRightValue && (
            <div className="space-y-2">
              <Label htmlFor="rightValue">右值</Label>
              <VariableInput
                value={(data.rightValue as string) || ''}
                onChange={(v) => onChange('rightValue', v)}
                placeholder="输入变量 {变量名} 或字面量"
              />
            </div>
          )}
        </>
      )}

      {/* 布尔判断 */}
      {conditionType === 'boolean' && (
        <div className="space-y-2">
          <Label htmlFor="leftValue">变量</Label>
          <VariableInput
            value={(data.leftValue as string) || ''}
            onChange={(v) => onChange('leftValue', v)}
            placeholder="输入变量 {变量名}，判断是否为真"
          />
          <p className="text-xs text-muted-foreground">
            真值：true、1、非空字符串、非空列表；假值：false、0、空字符串、null
          </p>
        </div>
      )}

      {/* 逻辑运算 */}
      {conditionType === 'logic' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="logicOperator">逻辑运算符</Label>
            <Select
              id="logicOperator"
              value={(data.logicOperator as string) || 'and'}
              onChange={(e) => onChange('logicOperator', e.target.value)}
            >
              <option value="and">与（AND）—— 两个条件都为真</option>
              <option value="or">或（OR）—— 任一条件为真</option>
              <option value="not">非（NOT）—— 对条件取反</option>
            </Select>
          </div>
          {(data.logicOperator as string) !== 'not' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="condition1">条件1</Label>
                <VariableInput
                  value={(data.condition1 as string) || ''}
                  onChange={(v) => onChange('condition1', v)}
                  placeholder="输入变量 {变量名} 或表达式"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="condition2">条件2</Label>
                <VariableInput
                  value={(data.condition2 as string) || ''}
                  onChange={(v) => onChange('condition2', v)}
                  placeholder="输入变量 {变量名} 或表达式"
                />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="condition">条件</Label>
              <VariableInput
                value={(data.condition as string) || ''}
                onChange={(v) => onChange('condition', v)}
                placeholder="输入变量 {变量名} 或表达式，取反"
              />
            </div>
          )}
        </>
      )}

      {/* 元素存在/可见判断 */}
      {(conditionType === 'element_exists' || conditionType === 'element_visible') && (
        renderSelectorInput ? (
          renderSelectorInput('leftValue', '元素选择器', '输入 CSS 选择器或 XPath')
        ) : (
          <div className="space-y-2">
            <Label htmlFor="leftValue">元素选择器</Label>
            <VariableInput
              value={(data.leftValue as string) || ''}
              onChange={(v) => onChange('leftValue', v)}
              placeholder="输入 CSS 选择器或 XPath"
            />
          </div>
        )
      )}
    </div>
  )
}

// 循环配置
export function LoopConfig({ data, onChange }: ConfigProps) {
  const loopType = (data.loopType as string) || 'count'
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="loopType">循环类型</Label>
        <Select
          id="loopType"
          value={loopType}
          onChange={(e) => onChange('loopType', e.target.value)}
        >
          <option value="count">计数循环</option>
          <option value="range">范围循环</option>
          <option value="while">条件循环</option>
        </Select>
      </div>
      
      {loopType === 'count' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="loopCount">循环次数</Label>
            <VariableInput
              value={(data.loopCount as string) || ''}
              onChange={(v) => onChange('loopCount', v)}
              placeholder="输入循环次数或变量"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="indexVariable">索引变量名</Label>
            <VariableInput
              value={(data.indexVariable as string) || 'index'}
              onChange={(v) => onChange('indexVariable', v)}
              placeholder="索引变量名（默认：index）"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="step">步长</Label>
            <VariableInput
              value={(data.step as string) || '1'}
              onChange={(v) => onChange('step', v)}
              placeholder="每次循环的增量（默认：1）"
            />
          </div>
        </>
      )}
      
      {loopType === 'range' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="startValue">起始值</Label>
            <VariableInput
              value={(data.startValue as string) || '0'}
              onChange={(v) => onChange('startValue', v)}
              placeholder="循环起始值（默认：0）"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endValue">结束值</Label>
            <VariableInput
              value={(data.endValue as string) || ''}
              onChange={(v) => onChange('endValue', v)}
              placeholder="循环结束值（不包含）"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="step">步长</Label>
            <VariableInput
              value={(data.step as string) || '1'}
              onChange={(v) => onChange('step', v)}
              placeholder="每次循环的增量（默认：1）"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="indexVariable">循环变量名</Label>
            <VariableInput
              value={(data.indexVariable as string) || 'index'}
              onChange={(v) => onChange('indexVariable', v)}
              placeholder="循环变量名（默认：index）"
            />
          </div>
        </>
      )}
      
      {loopType === 'while' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="condition">循环条件</Label>
            <VariableInput
              value={(data.condition as string) || ''}
              onChange={(v) => onChange('condition', v)}
              placeholder="输入循环条件表达式"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxIterations">最大迭代次数</Label>
            <VariableInput
              value={(data.maxIterations as string) || '1000'}
              onChange={(v) => onChange('maxIterations', v)}
              placeholder="防止无限循环的最大次数（默认：1000）"
            />
          </div>
        </>
      )}
      
      {/* 高级配置 */}
      <div className="space-y-2">
        <Label htmlFor="timeout">超时时间（秒）</Label>
        <VariableInput
          value={String(data.timeout || '0')}
          onChange={(v) => onChange('timeout', v)}
          placeholder="0 表示不限制超时，当前模块建议: 0秒"
        />
        <p className="text-xs text-muted-foreground">
          0 表示不限制超时，当前模块建议: 0秒
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="onTimeout">运行超时后</Label>
        <Select
          id="onTimeout"
          value={(data.onTimeout as string) || 'retry'}
          onChange={(e) => onChange('onTimeout', e.target.value)}
        >
          <option value="retry">重试</option>
          <option value="skip">跳过</option>
          <option value="stop">停止</option>
        </Select>
      </div>
    </div>
  )
}

// 遍历列表配置
export function ForeachConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="listVariable">列表变量</Label>
        <VariableInput
          value={(data.listVariable as string) || ''}
          onChange={(v) => onChange('listVariable', v)}
          placeholder="输入列表变量名"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="itemVariable">元素变量名</Label>
        <VariableInput
          value={(data.itemVariable as string) || 'item'}
          onChange={(v) => onChange('itemVariable', v)}
          placeholder="元素变量名（默认：item）"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="indexVariable">索引变量名（可选）</Label>
        <VariableInput
          value={(data.indexVariable as string) || ''}
          onChange={(v) => onChange('indexVariable', v)}
          placeholder="索引变量名（可选）"
        />
      </div>
    </div>
  )
}

// 遍历字典配置
export function ForeachDictConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="dictVariable">字典变量</Label>
        <VariableInput
          value={(data.dictVariable as string) || ''}
          onChange={(v) => onChange('dictVariable', v)}
          placeholder="输入字典变量名"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="keyVariable">键变量名</Label>
        <VariableInput
          value={(data.keyVariable as string) || 'key'}
          onChange={(v) => onChange('keyVariable', v)}
          placeholder="键变量名（默认：key）"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="valueVariable">值变量名</Label>
        <VariableInput
          value={(data.valueVariable as string) || 'value'}
          onChange={(v) => onChange('valueVariable', v)}
          placeholder="值变量名（默认：value）"
        />
      </div>
    </div>
  )
}

// 定时任务配置
export function ScheduledTaskConfig({ data, onChange }: ConfigProps) {
  const scheduleType = (data.scheduleType as string) || 'datetime'
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="scheduleType">定时方式</Label>
        <Select
          id="scheduleType"
          value={scheduleType}
          onChange={(e) => onChange('scheduleType', e.target.value)}
        >
          <option value="datetime">指定日期时间执行</option>
          <option value="delay">延迟一段时间后执行</option>
        </Select>
        <p className="text-xs text-muted-foreground">
          本模块会"等待"到设定的时间点 / 延迟结束后，再继续往下执行（用于流程内定时门控）。
          若要把整条工作流注册成周期计划任务，请在顶部工具栏「更多」菜单（⋯）中打开「计划任务」面板。
        </p>
      </div>

      {scheduleType === 'datetime' ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="targetDate">目标日期</Label>
            <VariableInput
              value={(data.targetDate as string) || ''}
              onChange={(v) => onChange('targetDate', v)}
              placeholder="YYYY-MM-DD，如 2026-01-01"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="targetTime">目标时间</Label>
            <VariableInput
              value={(data.targetTime as string) || ''}
              onChange={(v) => onChange('targetTime', v)}
              placeholder="HH:MM 或 HH:MM:SS，如 09:30"
            />
          </div>
        </>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-2">
            <Label htmlFor="delayHours">小时</Label>
            <VariableInput
              value={String((data.delayHours as number | string) ?? '')}
              onChange={(v) => onChange('delayHours', v)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="delayMinutes">分钟</Label>
            <VariableInput
              value={String((data.delayMinutes as number | string) ?? '')}
              onChange={(v) => onChange('delayMinutes', v)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="delaySeconds">秒</Label>
            <VariableInput
              value={String((data.delaySeconds as number | string) ?? '')}
              onChange={(v) => onChange('delaySeconds', v)}
              placeholder="0"
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="taskName">任务备注（可选）</Label>
        <VariableInput
          value={(data.taskName as string) || ''}
          onChange={(v) => onChange('taskName', v)}
          placeholder="给这个定时步骤起个名字"
        />
      </div>
    </div>
  )
}

// 子流程配置
export function SubflowConfig({ data, onChange }: ConfigProps) {
  const nodes = useWorkflowStore((s) => s.nodes)

  // 筛选画布上所有子流程定义节点：
  // 1. groupNode 且 isSubflow=true（分组勾选了「定义为子流程」）
  // 2. subflowHeaderNode（函数头形式的子流程）
  const subflowGroups = nodes.filter(
    (n) =>
      (n.type === 'groupNode' && (n.data as Record<string, unknown>).isSubflow === true) ||
      n.type === 'subflowHeaderNode'
  )

  const selectedId = (data.subflowGroupId as string) || ''

  const handleSelect = (id: string) => {
    const node = subflowGroups.find((n) => n.id === id)
    const name = node
      ? ((node.data as Record<string, unknown>).subflowName as string) || (node.data.label as string) || ''
      : ''
    onChange('subflowGroupId', id)
    onChange('subflowName', name)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="subflowGroupId">选择子流程</Label>
        {subflowGroups.length === 0 ? (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-md">
            画布上暂无子流程。请先在画布上添加「子流程定义」模块，或创建分组后勾选「定义为子流程」。
          </div>
        ) : (
          <Select
            id="subflowGroupId"
            value={selectedId}
            onChange={(e) => handleSelect(e.target.value)}
          >
            <option value="">请选择子流程...</option>
            {subflowGroups.map((n) => {
              const name = ((n.data as Record<string, unknown>).subflowName as string) || (n.data.label as string) || n.id
              const typeLabel = n.type === 'subflowHeaderNode' ? '函数头' : '分组'
              return (
                <option key={n.id} value={n.id}>
                  [{typeLabel}] {name}
                </option>
              )
            })}
          </Select>
        )}
        {selectedId && (
          <p className="text-xs text-muted-foreground">
            已选：{(data.subflowName as string) || selectedId}
          </p>
        )}
      </div>
    </div>
  )
}


// 断言/检查点配置（流程稳定性工程）
export function AssertCheckpointConfig({ data, onChange, renderSelectorInput }: ConfigProps) {
  const checkType = (data.checkType as string) || 'variable'
  const operator = (data.operator as string) || '=='
  const elementCheck = (data.elementCheck as string) || 'exists'
  const onFail = (data.onFail as string) || 'stop'
  const noRightValue = ['isEmpty', 'isNotEmpty'].includes(operator)
  const needExpectedText = ['text_contains', 'text_equals'].includes(elementCheck)

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="checkType">检查类型</Label>
        <Select
          id="checkType"
          value={checkType}
          onChange={(e) => onChange('checkType', e.target.value)}
        >
          <option value="variable">变量 / 值比较</option>
          <option value="element">页面元素状态</option>
          <option value="expression">表达式真值</option>
        </Select>
      </div>

      {checkType === 'variable' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="actualValue">实际值</Label>
            <VariableInput
              value={(data.actualValue as string) || ''}
              onChange={(v) => onChange('actualValue', v)}
              placeholder="要校验的值，支持 {变量名}"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="operator">运算符</Label>
            <Select id="operator" value={operator} onChange={(e) => onChange('operator', e.target.value)}>
              <option value="==">等于</option>
              <option value="!=">不等于</option>
              <option value="contains">包含</option>
              <option value="not_contains">不包含</option>
              <option value="startswith">以…开头</option>
              <option value="endswith">以…结尾</option>
              <option value="matches">匹配正则</option>
              <option value=">">大于</option>
              <option value="<">小于</option>
              <option value=">=">大于等于</option>
              <option value="<=">小于等于</option>
              <option value="isEmpty">为空</option>
              <option value="isNotEmpty">不为空</option>
            </Select>
          </div>
          {!noRightValue && (
            <div className="space-y-2">
              <Label htmlFor="expectedValue">期望值</Label>
              <VariableInput
                value={(data.expectedValue as string) || ''}
                onChange={(v) => onChange('expectedValue', v)}
                placeholder={operator === 'matches' ? '正则表达式，如 ^\\d+$' : '期望对照的值，支持 {变量名}'}
              />
            </div>
          )}
        </>
      )}

      {checkType === 'element' && (
        <>
          {renderSelectorInput ? (
            renderSelectorInput('selector', '元素选择器', '#id / .class / xpath，支持 {变量名}')
          ) : (
            <div className="space-y-2">
              <Label htmlFor="selector">元素选择器</Label>
              <VariableInput
                value={(data.selector as string) || ''}
                onChange={(v) => onChange('selector', v)}
                placeholder="#id / .class / xpath，支持 {变量名}"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="elementCheck">元素检查</Label>
            <Select id="elementCheck" value={elementCheck} onChange={(e) => onChange('elementCheck', e.target.value)}>
              <option value="exists">存在</option>
              <option value="not_exists">不存在</option>
              <option value="visible">可见</option>
              <option value="hidden">隐藏</option>
              <option value="text_contains">文本包含</option>
              <option value="text_equals">文本等于</option>
            </Select>
          </div>
          {needExpectedText && (
            <div className="space-y-2">
              <Label htmlFor="expectedText">期望文本</Label>
              <VariableInput
                value={(data.expectedText as string) || ''}
                onChange={(v) => onChange('expectedText', v)}
                placeholder="期望的文本内容，支持 {变量名}"
              />
            </div>
          )}
        </>
      )}

      {checkType === 'expression' && (
        <div className="space-y-2">
          <Label htmlFor="expression">表达式</Label>
          <VariableInput
            value={(data.expression as string) || ''}
            onChange={(v) => onChange('expression', v)}
            placeholder="解析后判断真值，如 {count} 或 {is_done}"
            multiline
            rows={2}
          />
          <p className="text-xs text-muted-foreground">空 / 0 / false / none 视为不通过，其余为通过。</p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="message">断言说明（可选）</Label>
        <VariableInput
          value={(data.message as string) || ''}
          onChange={(v) => onChange('message', v)}
          placeholder="如：订单号必须存在"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="onFail">断言失败时</Label>
        <Select id="onFail" value={onFail} onChange={(e) => onChange('onFail', e.target.value)}>
          <option value="stop">中断流程（标记失败）</option>
          <option value="warn">记录警告并继续</option>
          <option value="continue">静默跳过本节点</option>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="variableName">存储结果到变量（可选）</Label>
        <VariableInput
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="存储断言结果布尔值，如 assert_passed"
        />
      </div>

      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
        <p className="text-xs text-emerald-800">
          <strong>断言/检查点</strong>用于流程稳定性：在关键步骤校验数据或页面状态是否符合预期。<br/>
          失败时可中断流程、仅警告或静默跳过，结果布尔值可存入变量供后续条件分支使用。
        </p>
      </div>
    </div>
  )
}
