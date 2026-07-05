/**
 * 通用字段名 -> 中文标签 兜底映射。
 * 用于必填校验提示等场景，把后端返回的英文字段名翻译成用户可理解的中文名称。
 *
 * 优先级：后端 schema 的 desc（按模块，最精准） > 本表通用映射 > 字段名本身。
 * 本表只需覆盖常见字段，做到"用户一眼能看懂"即可，不追求逐模块精确。
 */
export const COMMON_FIELD_LABELS: Record<string, string> = {
  // ===== 结果/输出变量 =====
  variableName: '变量名',
  resultVariable: '结果变量',
  outputVariable: '输出变量',
  targetVariable: '目标变量',
  dataVariable: '数据变量',
  saveResult: '保存到变量',
  saveToVariable: '保存到变量',
  listVariable: '列表变量',
  dictVariable: '字典变量',
  tableVariable: '表格变量',
  imageVariable: '图片变量',
  textVariable: '文本变量',
  urlVariable: '链接变量',
  fileVariable: '文件变量',
  sourceVariable: '源变量',
  responseVariable: '响应变量',
  cookieVariable: 'Cookie 变量',
  headerVariable: '响应头变量',
  bodyVariable: '响应体变量',
  statusVariable: '状态码变量',
  errorVariable: '错误变量',
  countVariable: '计数变量',
  sumVariable: '求和变量',
  avgVariable: '平均值变量',
  maxVariable: '最大值变量',
  minVariable: '最小值变量',
  connectionVariable: '连接变量',
  shareVariable: '共享变量',
  stdoutVariable: '标准输出变量',
  stderrVariable: '标准错误变量',
  returnCodeVariable: '返回码变量',
  appVariable: '应用变量',
  controlVariable: '控件变量',
  itemVariable: '元素变量',
  indexVariable: '索引变量',
  loopIndexVariable: '循环索引变量',
  keyVariable: '键变量',
  valueVariable: '值变量',
  variableNameX: 'X 坐标变量',
  variableNameY: 'Y 坐标变量',

  // ===== 通用输入 =====
  value: '值',
  text: '文本',
  content: '内容',
  message: '消息',
  name: '名称',
  key: '键',
  index: '索引',
  count: '数量',
  timeout: '超时时间',
  delay: '延迟时间',
  duration: '持续时间',
  interval: '间隔时间',
  format: '格式',
  encoding: '编码',
  mode: '模式',
  type: '类型',
  target: '目标',
  source: '来源',
  condition: '条件',
  expression: '表达式',
  pattern: '匹配模式',
  keyword: '关键词',
  title: '标题',
  label: '标签',
  color: '颜色',

  // ===== Web / 浏览器 =====
  url: '网址',
  selector: '元素选择器',
  xpath: 'XPath 路径',
  attribute: '属性名',
  frameSelector: 'iframe 选择器',
  script: '脚本代码',
  jsCode: 'JS 代码',

  // ===== 坐标 / 鼠标键盘 =====
  x: 'X 坐标',
  y: 'Y 坐标',
  startX: '起点 X',
  startY: '起点 Y',
  endX: '终点 X',
  endY: '终点 Y',
  keys: '按键',
  button: '鼠标按键',

  // ===== 文件 / 路径 =====
  filePath: '文件路径',
  folderPath: '文件夹路径',
  path: '路径',
  fileName: '文件名',
  sourcePath: '源路径',
  targetPath: '目标路径',
  destPath: '目标路径',
  savePath: '保存路径',
  sheetName: '工作表名称',
  cell: '单元格',
  range: '单元格区域',
  row: '行号',
  column: '列',
  columnName: '列名',

  // ===== 数据库 / API =====
  sql: 'SQL 语句',
  table: '表名',
  data: '数据',
  where: 'WHERE 条件',
  params: '参数',
  method: '请求方法',
  headers: '请求头',
  body: '请求体',
  apiUrl: 'API 地址',
  apiKey: 'API 密钥',
  model: '模型',

  // ===== 图像 / OCR =====
  imagePath: '图片路径',
  imageName: '图片名称',
  templateImage: '模板图片',
  region: '识别区域',

  // ===== AI / 提示词 =====
  prompt: '提示词',
  inputText: '输入文本',
  targetLang: '目标语言',

  // ===== 循环 / 控制 =====
  times: '循环次数',
  start: '起始值',
  end: '结束值',
  step: '步长',
  itemsVariable: '遍历列表变量',
}

/**
 * 把字段名转换为中文标签。
 * @param field 字段名
 * @param moduleLabels 该模块的字段标签（来自后端 schema desc，最精准）
 */
export function getFieldLabel(field: string, moduleLabels?: Record<string, string>): string {
  if (moduleLabels && moduleLabels[field] && moduleLabels[field].trim()) {
    return moduleLabels[field]
  }
  return COMMON_FIELD_LABELS[field] || field
}
