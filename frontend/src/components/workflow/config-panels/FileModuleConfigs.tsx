import type { NodeData } from '@/store/workflowStore'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { SelectNative as Select } from '@/components/ui/select-native'
import { VariableInput } from '@/components/ui/variable-input'
import { VariableNameInput } from '@/components/ui/variable-name-input'
import { PathInput } from '@/components/ui/path-input'

interface ConfigProps {
  data: NodeData
  onChange: (key: string, value: unknown) => void
}

export function ListFilesConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="folderPath">文件夹路径</Label>
        <PathInput
          value={(data.folderPath as string) || ''}
          onChange={(v) => onChange('folderPath', v)}
          placeholder="C:\\Users\\用户名\\Documents"
          type="folder"
          title="文件夹路径"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="listType">列表类型</Label>
        <Select
          id="listType"
          value={(data.listType as string) || 'files'}
          onChange={(e) => onChange('listType', e.target.value)}
        >
          <option value="files">仅文件</option>
          <option value="folders">仅文件夹</option>
          <option value="all">文件和文件夹</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="recursive">递归处理子文件夹</Label>
        <Select
          id="recursive"
          value={String(data.recursive ?? false)}
          onChange={(e) => onChange('recursive', e.target.value === 'true')}
        >
          <option value="false">否</option>
          <option value="true">是</option>
        </Select>
        <p className="text-xs text-muted-foreground">开启后会递归遍历所有子文件夹</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="includeExtension">文件名格式</Label>
        <Select
          id="includeExtension"
          value={String(data.includeExtension ?? true)}
          onChange={(e) => onChange('includeExtension', e.target.value === 'true')}
        >
          <option value="true">包含扩展名</option>
          <option value="false">不含扩展名</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="filterPattern">过滤模式（可选）</Label>
        <VariableInput
          value={(data.filterPattern as string) || ''}
          onChange={(v) => onChange('filterPattern', v)}
          placeholder="*.txt"
        />
        <p className="text-xs text-muted-foreground">支持通配符，如 *.txt 或 image*.png</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="variableName">结果变量名</Label>
        <VariableNameInput
          isStorageVariable={true}
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="file_list"
        />
      </div>
    </div>
  )
}

export function CopyFileConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="sourcePath">源文件路径</Label>
        <PathInput
          value={(data.sourcePath as string) || ''}
          onChange={(v) => onChange('sourcePath', v)}
          placeholder="C:\\Users\\用户名\\Documents\\file.txt"
          type="file"
          title="源文件路径"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="targetPath">目标路径</Label>
        <PathInput
          value={(data.targetPath as string) || ''}
          onChange={(v) => onChange('targetPath', v)}
          placeholder="C:\\Users\\用户名\\Desktop\\file.txt"
          type="file"
          title="目标路径"
        />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="overwrite"
          checked={(data.overwrite as boolean) || false}
          onCheckedChange={(c) => onChange('overwrite', c)}
        />
        <Label htmlFor="overwrite" className="cursor-pointer">如果目标文件已存在则覆盖</Label>
      </div>
    </div>
  )
}

export function MoveFileConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="sourcePath">源文件路径</Label>
        <PathInput
          value={(data.sourcePath as string) || ''}
          onChange={(v) => onChange('sourcePath', v)}
          placeholder="C:\\Users\\用户名\\Documents\\file.txt"
          type="file"
          title="源文件路径"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="targetPath">目标路径</Label>
        <PathInput
          value={(data.targetPath as string) || ''}
          onChange={(v) => onChange('targetPath', v)}
          placeholder="C:\\Users\\用户名\\Desktop\\file.txt"
          type="file"
          title="目标路径"
        />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="overwrite"
          checked={(data.overwrite as boolean) || false}
          onCheckedChange={(c) => onChange('overwrite', c)}
        />
        <Label htmlFor="overwrite" className="cursor-pointer">如果目标文件已存在则覆盖</Label>
      </div>
    </div>
  )
}

export function DeleteFileConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="filePath">文件路径</Label>
        <PathInput
          value={(data.filePath as string) || ''}
          onChange={(v) => onChange('filePath', v)}
          placeholder="C:\\Users\\用户名\\Documents\\file.txt"
          type="file"
          title="文件路径"
        />
      </div>
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-xs text-amber-800">警告：删除操作不可恢复，请谨慎使用</p>
      </div>
    </div>
  )
}

export function CreateFolderConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="folderPath">文件夹路径</Label>
        <PathInput
          value={(data.folderPath as string) || ''}
          onChange={(v) => onChange('folderPath', v)}
          placeholder="C:\\Users\\用户名\\Documents\\新文件夹"
          type="folder"
          title="文件夹路径"
        />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="createParents"
          checked={(data.createParents as boolean) ?? true}
          onCheckedChange={(c) => onChange('createParents', c)}
        />
        <Label htmlFor="createParents" className="cursor-pointer">自动创建父级目录</Label>
      </div>
    </div>
  )
}

export function FileExistsConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="filePath">文件路径</Label>
        <PathInput
          value={(data.filePath as string) || ''}
          onChange={(v) => onChange('filePath', v)}
          placeholder="C:\\Users\\用户名\\Documents\\file.txt"
          type="file"
          title="文件路径"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="variableName">结果变量名</Label>
        <VariableNameInput
          isStorageVariable={true}
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="file_exists"
        />
        <p className="text-xs text-muted-foreground">返回布尔值：true 表示文件存在，false 表示不存在</p>
      </div>
    </div>
  )
}

export function GetFileInfoConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="filePath">文件路径</Label>
        <PathInput
          value={(data.filePath as string) || ''}
          onChange={(v) => onChange('filePath', v)}
          placeholder="C:\\Users\\用户名\\Documents\\file.txt"
          type="file"
          title="文件路径"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="variableName">结果变量名</Label>
        <VariableNameInput
          isStorageVariable={true}
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="file_info"
        />
        <p className="text-xs text-muted-foreground">返回对象包含：文件名、大小、创建时间、修改时间等信息</p>
      </div>
    </div>
  )
}

export function ReadTextFileConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="filePath">文件路径</Label>
        <PathInput
          value={(data.filePath as string) || ''}
          onChange={(v) => onChange('filePath', v)}
          placeholder="C:\\Users\\用户名\\Documents\\file.txt"
          type="file"
          title="文件路径"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="encoding">文件编码</Label>
        <Select
          id="encoding"
          value={(data.encoding as string) || 'utf-8'}
          onChange={(e) => onChange('encoding', e.target.value)}
        >
          <option value="utf-8">UTF-8</option>
          <option value="gbk">GBK</option>
          <option value="gb2312">GB2312</option>
          <option value="ascii">ASCII</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="variableName">结果变量名</Label>
        <VariableNameInput
          isStorageVariable={true}
          value={(data.variableName as string) || ''}
          onChange={(v) => onChange('variableName', v)}
          placeholder="file_content"
        />
      </div>
    </div>
  )
}

export function WriteTextFileConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="filePath">文件路径</Label>
        <PathInput
          value={(data.filePath as string) || ''}
          onChange={(v) => onChange('filePath', v)}
          placeholder="C:\\Users\\用户名\\Documents\\file.txt"
          type="file"
          title="文件路径"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="content">文件内容</Label>
        <VariableInput
          value={(data.content as string) || ''}
          onChange={(v) => onChange('content', v)}
          placeholder="要写入的文本内容"
          multiline
          rows={6}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="encoding">文件编码</Label>
        <Select
          id="encoding"
          value={(data.encoding as string) || 'utf-8'}
          onChange={(e) => onChange('encoding', e.target.value)}
        >
          <option value="utf-8">UTF-8</option>
          <option value="gbk">GBK</option>
          <option value="gb2312">GB2312</option>
          <option value="ascii">ASCII</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="writeMode">写入模式</Label>
        <Select
          id="writeMode"
          value={(data.writeMode as string) || 'overwrite'}
          onChange={(e) => onChange('writeMode', e.target.value)}
        >
          <option value="overwrite">覆盖</option>
          <option value="append">追加</option>
        </Select>
      </div>
    </div>
  )
}

export function RenameFolderConfig({ data, onChange }: ConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="oldPath">原文件夹路径</Label>
        <PathInput
          value={(data.oldPath as string) || ''}
          onChange={(v) => onChange('oldPath', v)}
          placeholder="C:\\Users\\用户名\\Documents\\旧文件夹"
          type="folder"
          title="原文件夹路径"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPath">新文件夹路径</Label>
        <PathInput
          value={(data.newPath as string) || ''}
          onChange={(v) => onChange('newPath', v)}
          placeholder="C:\\Users\\用户名\\Documents\\新文件夹"
          type="folder"
          title="新文件夹路径"
        />
      </div>
    </div>
  )
}
