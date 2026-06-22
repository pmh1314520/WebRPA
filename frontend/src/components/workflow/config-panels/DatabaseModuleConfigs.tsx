import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { NumberInput } from '@/components/ui/number-input'
import { VariableInput } from '@/components/ui/variable-input'
import { VariableNameInput } from '@/components/ui/variable-name-input'
import { useGlobalConfigStore } from '@/store/globalConfigStore'
import { useEffect } from 'react'
import type { NodeData } from '@/store/workflowStore'

interface ConfigProps {
  data: NodeData
  onChange: (key: string, value: unknown) => void
}

// 连接数据库配置
export function DbConnectConfig({ data, onChange }: ConfigProps) {
  const { config } = useGlobalConfigStore()
  
  // 首次加载时填充全局默认配置
  useEffect(() => {
    if (!data.host && config.database?.host) {
      onChange('host', config.database.host)
    }
    if (!data.port && config.database?.port) {
      onChange('port', config.database.port)
    }
    if (!data.user && config.database?.user) {
      onChange('user', config.database.user)
    }
    if (!data.password && config.database?.password) {
      onChange('password', config.database.password)
    }
    if (!data.database && config.database?.database) {
      onChange('database', config.database.database)
    }
    if (!data.charset && config.database?.charset) {
      onChange('charset', config.database.charset)
    }
  }, [])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>主机地址</Label>
          <VariableInput
            value={(data.host as string) || 'localhost'}
            onChange={(v) => onChange('host', v)}
            placeholder="localhost"
          />
        </div>
        <div className="space-y-2">
          <Label>端口</Label>
          <NumberInput
            value={(data.port as number) || 3306}
            onChange={(v) => onChange('port', v)}
            defaultValue={3306}
            min={1}
            max={65535}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>用户名</Label>
        <VariableInput
          value={(data.user as string) || ''}
          onChange={(v) => onChange('user', v)}
          placeholder="root"
        />
      </div>
      
      <div className="space-y-2">
        <Label>密码</Label>
        <VariableInput
          value={(data.password as string) || ''}
          onChange={(v) => onChange('password', v)}
          placeholder="请输入密码"
        />
      </div>
      
      <div className="space-y-2">
        <Label>数据库名</Label>
        <VariableInput
          value={(data.database as string) || ''}
          onChange={(v) => onChange('database', v)}
          placeholder="请输入数据库名"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>字符集</Label>
          <VariableInput
            value={(data.charset as string) || 'utf8mb4'}
            onChange={(v) => onChange('charset', v)}
            placeholder="utf8mb4"
          />
        </div>
        <div className="space-y-2">
          <Label>连接名称</Label>
          <VariableInput
            value={(data.connectionName as string) || 'default'}
            onChange={(v) => onChange('connectionName', v)}
            placeholder="default"
          />
          <p className="text-xs text-muted-foreground">用于标识此连接，后续操作可复用</p>
        </div>
      </div>
    </div>
  )
}

// 查询数据配置
export function DbQueryConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>连接名称</Label>
        <VariableInput
          value={(data.connectionName as string) || 'default'}
          onChange={(v) => onChange('connectionName', v)}
          placeholder="default"
        />
      </div>
      
      <div className="space-y-2">
        <Label>SQL查询语句</Label>
        <VariableInput
          value={(data.sql as string) || ''}
          onChange={(v) => onChange('sql', v)}
          placeholder="SELECT * FROM table_name"
          multiline
          rows={4}
        />
        <p className="text-xs text-muted-foreground">支持变量引用，如：SELECT * FROM users WHERE id = {'{user_id}'}</p>
      </div>
      
      <div className="space-y-2">
        <Label>结果变量名</Label>
        <VariableNameInput
          isStorageVariable={true}
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="query_result"
        />
      </div>
      
      <div className="flex items-center gap-2">
        <Checkbox
          id="singleRow"
          checked={(data.singleRow as boolean) || false}
          onCheckedChange={(c) => onChange('singleRow', c)}
        />
        <Label htmlFor="singleRow" className="cursor-pointer">仅返回单行数据</Label>
      </div>
    </div>
  )
}

// 执行SQL配置
export function DbExecuteConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>连接名称</Label>
        <VariableInput
          value={(data.connectionName as string) || 'default'}
          onChange={(v) => onChange('connectionName', v)}
          placeholder="default"
        />
      </div>
      
      <div className="space-y-2">
        <Label>SQL语句</Label>
        <VariableInput
          value={(data.sql as string) || ''}
          onChange={(v) => onChange('sql', v)}
          placeholder="CREATE TABLE, ALTER TABLE, DROP TABLE等"
          multiline
          rows={4}
        />
        <p className="text-xs text-muted-foreground">用于执行DDL语句（建表、修改表结构等）</p>
      </div>
      
      <div className="space-y-2">
        <Label>结果变量名</Label>
        <VariableNameInput
          isStorageVariable={true}
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="execute_result"
        />
      </div>
    </div>
  )
}

// 插入数据配置
export function DbInsertConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>连接名称</Label>
        <VariableInput
          value={(data.connectionName as string) || 'default'}
          onChange={(v) => onChange('connectionName', v)}
          placeholder="default"
        />
      </div>
      
      <div className="space-y-2">
        <Label>表名</Label>
        <VariableInput
          value={(data.table as string) || ''}
          onChange={(v) => onChange('table', v)}
          placeholder="users"
        />
      </div>
      
      <div className="space-y-2">
        <Label>数据（JSON格式）</Label>
        <VariableInput
          value={typeof data.data === 'string' ? data.data : JSON.stringify(data.data || {}, null, 2)}
          onChange={(v) => {
            try {
              const parsed = JSON.parse(v)
              onChange('data', parsed)
            } catch {
              onChange('data', v)
            }
          }}
          placeholder='{"name": "张三", "age": 25}'
          multiline
          rows={4}
        />
        <p className="text-xs text-muted-foreground">JSON格式的键值对，键名对应表字段名</p>
      </div>
      
      <div className="space-y-2">
        <Label>结果变量名</Label>
        <VariableNameInput
          isStorageVariable={true}
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="insert_id"
        />
      </div>
    </div>
  )
}

// 更新数据配置
export function DbUpdateConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>连接名称</Label>
        <VariableInput
          value={(data.connectionName as string) || 'default'}
          onChange={(v) => onChange('connectionName', v)}
          placeholder="default"
        />
      </div>
      
      <div className="space-y-2">
        <Label>表名</Label>
        <VariableInput
          value={(data.table as string) || ''}
          onChange={(v) => onChange('table', v)}
          placeholder="users"
        />
      </div>
      
      <div className="space-y-2">
        <Label>更新数据（JSON格式）</Label>
        <VariableInput
          value={typeof data.data === 'string' ? data.data : JSON.stringify(data.data || {}, null, 2)}
          onChange={(v) => {
            try {
              const parsed = JSON.parse(v)
              onChange('data', parsed)
            } catch {
              onChange('data', v)
            }
          }}
          placeholder='{"name": "李四", "age": 30}'
          multiline
          rows={4}
        />
      </div>
      
      <div className="space-y-2">
        <Label>WHERE条件</Label>
        <VariableInput
          value={(data.where as string) || ''}
          onChange={(v) => onChange('where', v)}
          placeholder="id = 1"
        />
        <p className="text-xs text-muted-foreground">WHERE子句的条件部分，不需要写WHERE关键字</p>
      </div>
      
      <div className="space-y-2">
        <Label>结果变量名</Label>
        <VariableNameInput
          isStorageVariable={true}
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="affected_rows"
        />
      </div>
    </div>
  )
}

// 删除数据配置
export function DbDeleteConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>连接名称</Label>
        <VariableInput
          value={(data.connectionName as string) || 'default'}
          onChange={(v) => onChange('connectionName', v)}
          placeholder="default"
        />
      </div>
      
      <div className="space-y-2">
        <Label>表名</Label>
        <VariableInput
          value={(data.table as string) || ''}
          onChange={(v) => onChange('table', v)}
          placeholder="users"
        />
      </div>
      
      <div className="space-y-2">
        <Label>WHERE条件</Label>
        <VariableInput
          value={(data.where as string) || ''}
          onChange={(v) => onChange('where', v)}
          placeholder="id = 1"
        />
        <p className="text-xs text-amber-600">警告：如果不指定WHERE条件，将删除表中所有数据！</p>
      </div>
      
      <div className="space-y-2">
        <Label>结果变量名</Label>
        <VariableNameInput
          isStorageVariable={true}
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="deleted_rows"
        />
      </div>
    </div>
  )
}

// 关闭连接配置
export function DbCloseConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>连接名称</Label>
        <VariableInput
          value={(data.connectionName as string) || 'default'}
          onChange={(v) => onChange('connectionName', v)}
          placeholder="default"
        />
        <p className="text-xs text-muted-foreground">关闭指定的数据库连接，释放资源</p>
      </div>
    </div>
  )
}
