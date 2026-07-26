import type { NodeData } from '@/store/workflowStore'
import { Label } from '@/components/ui/label'
import { NumberInput } from '@/components/ui/number-input'
import { SelectNative as Select } from '@/components/ui/select-native'
import { Switch } from '@/components/ui/switch'
import { VariableInput } from '@/components/ui/variable-input'
import { VariableNameInput } from '@/components/ui/variable-name-input'
import { PathInput } from '@/components/ui/path-input'

/** 字段定义（与 ExcelModuleConfig 保持同一套声明式范式） */
interface FieldDef {
  key: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'select' | 'switch' | 'path' | 'imagepath' | 'varname'
  placeholder?: string
  hint?: string
  options?: Array<{ value: string; label: string }>
  default?: unknown
  /** 仅当某字段等于某值时显示 */
  showWhen?: { key: string; equals: string | string[] }
}

interface WordModuleConfigProps {
  moduleType: string
  data: NodeData
  onChange: (key: string, value: unknown) => void
}

const DOC_TYPES: Array<[string, string]> = [['Word 文档', '*.docx'], ['Word 97-2003', '*.doc'], ['WPS 文字', '*.wps'], ['所有文件', '*.*']]
const PDF_TYPES: Array<[string, string]> = [['PDF 文件', '*.pdf'], ['所有文件', '*.*']]
const IMG_TYPES: Array<[string, string]> = [['图片文件', '*.png'], ['所有文件', '*.*']]

// 通用字段：文档标识（多文档并行操作时区分；单文档场景留空即可）
const F_DOC_KEY: FieldDef = {
  key: 'docKey',
  label: '文档标识（留空用最近打开的文档）',
  type: 'text',
  placeholder: 'default',
  hint: '同时操作多个 Word 文档时，用这个标识区分；只开一个文档时留空即可。',
}

const F_POSITION: FieldDef = {
  key: 'position',
  label: '插入位置',
  type: 'select',
  default: 'cursor',
  options: [
    { value: 'cursor', label: '光标处' },
    { value: 'end', label: '文档末尾' },
  ],
}

export function WordModuleConfig({ moduleType, data, onChange }: WordModuleConfigProps) {
  const fields = WORD_FIELD_SCHEMAS[moduleType]

  if (!fields) {
    return <p className="text-sm text-muted-foreground">该 Word 模块暂无可配置项</p>
  }

  const visible = (f: FieldDef) => {
    if (!f.showWhen) return true
    const cur = String(data[f.showWhen.key] ?? f.default ?? '')
    const eq = f.showWhen.equals
    return Array.isArray(eq) ? eq.includes(cur) : cur === eq
  }

  return (
    <div className="space-y-3">
      {fields.filter(visible).map((f) => (
        <div key={f.key} className="space-y-1.5">
          {f.type !== 'switch' && <Label htmlFor={f.key}>{f.label}</Label>}
          {renderField(f, data, onChange)}
          {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
        </div>
      ))}
    </div>
  )
}

function renderField(f: FieldDef, data: NodeData, onChange: (k: string, v: unknown) => void) {
  const val = data[f.key]
  switch (f.type) {
    case 'path':
      return (
        <PathInput
          value={(val as string) || ''}
          onChange={(v) => onChange(f.key, v)}
          type="file"
          placeholder={f.placeholder}
          fileTypes={f.key === 'outputPath' ? PDF_TYPES : DOC_TYPES}
        />
      )
    case 'imagepath':
      return (
        <PathInput
          value={(val as string) || ''}
          onChange={(v) => onChange(f.key, v)}
          type="file"
          placeholder={f.placeholder}
          fileTypes={IMG_TYPES}
        />
      )
    case 'textarea':
      return (
        <VariableInput
          multiline
          rows={4}
          value={(val as string) || ''}
          onChange={(v) => onChange(f.key, v)}
          placeholder={f.placeholder}
        />
      )
    case 'number':
      return (
        <NumberInput
          id={f.key}
          value={(val as number) ?? (f.default as number) ?? 0}
          onChange={(v) => onChange(f.key, v)}
          defaultValue={(f.default as number) ?? 0}
        />
      )
    case 'select':
      return (
        <Select
          id={f.key}
          value={(val as string) ?? (f.default as string) ?? ''}
          onChange={(e) => onChange(f.key, e.target.value)}
        >
          {(f.options || []).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      )
    case 'switch':
      return (
        <div className="flex items-center justify-between">
          <Label htmlFor={f.key} className="cursor-pointer">{f.label}</Label>
          <Switch
            id={f.key}
            checked={val === undefined ? Boolean(f.default) : Boolean(val)}
            onCheckedChange={(v) => onChange(f.key, v)}
          />
        </div>
      )
    case 'varname':
      return (
        <VariableNameInput
          value={(val as string) || ''}
          onChange={(v) => onChange(f.key, v)}
          placeholder={f.placeholder || '变量名'}
          isStorageVariable={true}
        />
      )
    default:
      return (
        <VariableInput
          value={(val as string) || ''}
          onChange={(v) => onChange(f.key, v)}
          placeholder={f.placeholder}
        />
      )
  }
}

/** 各 Word 模块的字段表单定义 */
const WORD_FIELD_SCHEMAS: Record<string, FieldDef[]> = {
  // ===== 打开 / 新建 =====
  word_open: [
    { key: 'filePath', label: 'Word 文件路径', type: 'path', placeholder: '如 D:\\报告.docx，支持 {变量名}', hint: '留空则新建一个未命名空白文档（后续需用「保存Word」指定另存路径）。' },
    { key: 'docKey', label: '文档标识', type: 'text', placeholder: 'default', default: 'default', hint: '后续 Word 模块用这个标识引用本文档；只处理一个文档时保持默认即可。' },
    { key: 'visible', label: '显示 Word 窗口', type: 'switch', default: true, hint: '关闭后在后台静默操作（更快，且不干扰用户）。本机装 Microsoft Word 或 WPS Office 均可，会自动选择可用的那个。' },
    { key: 'createIfMissing', label: '文件不存在时新建', type: 'switch', default: true },
    { key: 'readOnly', label: '以只读方式打开', type: 'switch', default: false },
  ],

  // ===== 导出 PDF =====
  word_to_pdf: [
    F_DOC_KEY,
    { key: 'filePath', label: '源 Word 文件（留空则导出已打开的文档）', type: 'path', placeholder: '如 D:\\报告.docx', hint: '填了路径就独立转换该文件（无需先打开）；留空则导出当前已打开的文档。' },
    { key: 'outputPath', label: '输出 PDF 路径（留空同名同目录）', type: 'path', placeholder: '如 D:\\报告.pdf' },
    { key: 'resultVariable', label: 'PDF 路径存储到变量', type: 'varname', placeholder: 'pdf_path' },
  ],

  // ===== 读取文本 =====
  word_read_text: [
    F_DOC_KEY,
    {
      key: 'readRange', label: '读取范围', type: 'select', default: 'all',
      options: [
        { value: 'all', label: '全文（字符串）' },
        { value: 'paragraphs', label: '全部段落（列表）' },
        { value: 'paragraph', label: '指定段落' },
        { value: 'selection', label: '当前选区' },
      ],
    },
    { key: 'paragraphIndex', label: '段落序号（从 1 开始）', type: 'number', default: 1, showWhen: { key: 'readRange', equals: 'paragraph' } },
    { key: 'resultVariable', label: '存储到变量', type: 'varname', placeholder: 'word_text', default: 'word_text' },
  ],

  // ===== 写入文本 =====
  word_write_text: [
    F_DOC_KEY,
    { key: 'text', label: '写入内容', type: 'textarea', placeholder: '支持 {变量名}，可多行' },
    {
      key: 'writeMode', label: '写入方式', type: 'select', default: 'append',
      options: [
        { value: 'append', label: '追加到文末' },
        { value: 'cursor', label: '在光标处插入' },
        { value: 'replace_all', label: '覆盖全文' },
      ],
    },
    { key: 'newParagraph', label: '写完另起一段', type: 'switch', default: true, showWhen: { key: 'writeMode', equals: ['append', 'cursor'] } },
    { key: 'fontName', label: '字体（留空不改）', type: 'text', placeholder: '如 微软雅黑' },
    { key: 'fontSize', label: '字号（0 表示不改）', type: 'number', default: 0 },
    { key: 'bold', label: '加粗', type: 'switch', default: false },
    { key: 'italic', label: '斜体', type: 'switch', default: false },
  ],

  // ===== 定位光标 =====
  word_set_cursor: [
    F_DOC_KEY,
    {
      key: 'target', label: '定位到', type: 'select', default: 'doc_start',
      options: [
        { value: 'doc_start', label: '文档开头' },
        { value: 'doc_end', label: '文档结尾' },
        { value: 'paragraph_start', label: '指定段落开头' },
        { value: 'paragraph_end', label: '指定段落结尾' },
        { value: 'find_text', label: '查找到的文本处' },
      ],
    },
    { key: 'paragraphIndex', label: '段落序号（从 1 开始）', type: 'number', default: 1, showWhen: { key: 'target', equals: ['paragraph_start', 'paragraph_end'] } },
    { key: 'findText', label: '要查找的文本', type: 'text', placeholder: '支持 {变量名}', showWhen: { key: 'target', equals: 'find_text' } },
    { key: 'occurrence', label: '第几处匹配', type: 'number', default: 1, showWhen: { key: 'target', equals: 'find_text' } },
    { key: 'selectFound', label: '选中匹配到的文本', type: 'switch', default: false, showWhen: { key: 'target', equals: 'find_text' }, hint: '开启后匹配文本会被选中（便于紧接着覆盖写入）；关闭则光标停在匹配文本之后。' },
  ],

  // ===== 移动光标 =====
  word_move_cursor: [
    F_DOC_KEY,
    {
      key: 'unit', label: '移动单位', type: 'select', default: 'character',
      options: [
        { value: 'character', label: '字符' },
        { value: 'word', label: '单词' },
        { value: 'sentence', label: '句' },
        { value: 'line', label: '行' },
        { value: 'paragraph', label: '段落' },
      ],
    },
    { key: 'count', label: '移动数量', type: 'number', default: 1 },
    {
      key: 'direction', label: '移动方向', type: 'select', default: 'forward',
      options: [
        { value: 'forward', label: '向后（往文末）' },
        { value: 'backward', label: '向前（往文首）' },
      ],
    },
    { key: 'extendSelection', label: '同时选中经过的内容', type: 'switch', default: false },
  ],

  // ===== 替换文本 =====
  word_replace_text: [
    F_DOC_KEY,
    { key: 'findText', label: '查找内容', type: 'text', placeholder: '支持 {变量名}' },
    { key: 'replaceText', label: '替换为', type: 'text', placeholder: '支持 {变量名}，留空表示删除' },
    { key: 'replaceAll', label: '替换全部（关闭则只替换第一处）', type: 'switch', default: true },
    { key: 'matchCase', label: '区分大小写', type: 'switch', default: false },
    { key: 'matchWholeWord', label: '全字匹配', type: 'switch', default: false },
    { key: 'useWildcards', label: '使用通配符', type: 'switch', default: false },
    { key: 'resultVariable', label: '替换次数存储到变量', type: 'varname', placeholder: 'replaced_count' },
  ],

  // ===== 读取表格 =====
  word_read_table: [
    F_DOC_KEY,
    { key: 'tableIndex', label: '表格序号（从 1 开始）', type: 'number', default: 1 },
    { key: 'firstRowAsHeader', label: '首行作为表头（结果为字典列表）', type: 'switch', default: false, hint: '关闭则返回二维数组；开启则返回 [{列名: 值}] 便于直接写 Excel。' },
    { key: 'resultVariable', label: '存储到变量', type: 'varname', placeholder: 'word_table', default: 'word_table' },
  ],

  // ===== 插入表格 =====
  word_insert_table: [
    F_DOC_KEY,
    { key: 'tableData', label: '表格数据（二维数组/字典列表/变量名）', type: 'textarea', placeholder: '如 [["姓名","年龄"],["张三",20]]，也可直接填变量名', hint: '填了数据就按数据自动决定行列数并填充；留空则按下面的行数列数插入空表。' },
    { key: 'rows', label: '行数（无数据时必填）', type: 'number', default: 3 },
    { key: 'cols', label: '列数（无数据时必填）', type: 'number', default: 3 },
    F_POSITION,
    { key: 'withBorder', label: '显示边框', type: 'switch', default: true },
    { key: 'headerBold', label: '首行加粗', type: 'switch', default: true },
  ],

  // ===== 插入图片 =====
  word_insert_image: [
    F_DOC_KEY,
    { key: 'imagePath', label: '图片路径', type: 'imagepath', placeholder: '如 D:\\logo.png，支持 {变量名}' },
    F_POSITION,
    { key: 'width', label: '宽度（磅，0 表示原始尺寸）', type: 'number', default: 0 },
    { key: 'height', label: '高度（磅，0 表示原始尺寸）', type: 'number', default: 0 },
    { key: 'center', label: '居中显示', type: 'switch', default: false },
  ],

  // ===== 插入超链接 =====
  word_insert_hyperlink: [
    F_DOC_KEY,
    { key: 'address', label: '链接地址', type: 'text', placeholder: '如 https://www.pmhs.top 或本地文件路径' },
    { key: 'displayText', label: '显示文字（留空显示地址本身）', type: 'text', placeholder: '如 官网首页' },
    { key: 'screenTip', label: '悬停提示（可选）', type: 'text', placeholder: '鼠标悬停时的提示文字' },
    F_POSITION,
  ],

  // ===== 保存 =====
  word_save: [
    F_DOC_KEY,
    { key: 'saveAsPath', label: '另存为路径（留空则原地保存）', type: 'path', placeholder: '如 D:\\报告_已修改.docx' },
    { key: 'resultVariable', label: '保存路径存储到变量', type: 'varname', placeholder: 'saved_path' },
  ],

  // ===== 关闭 =====
  word_close: [
    F_DOC_KEY,
    { key: 'saveChanges', label: '关闭前保存改动', type: 'switch', default: true },
    { key: 'closeAll', label: '关闭所有已打开的 Word 文档', type: 'switch', default: false },
  ],
}
