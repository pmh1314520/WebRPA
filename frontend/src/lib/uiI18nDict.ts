/* WebRPA 编辑器界面文案中→英字典（高频界面 chrome）。
   键为渲染后可见文本 trim 值；未收录的保持中文，可持续补充。 */
export const UI_DICT: Record<string, string> = {
  // 工具栏
  '新建': 'New', '保存': 'Save', '打开': 'Open', '导出': 'Export',
  '运行': 'Run', '停止': 'Stop', '设置': 'Settings', '文档': 'Docs', '教学文档': 'Tutorials',
  '撤销': 'Undo', '重做': 'Redo', '节点对齐': 'Align', '智能整理': 'Auto layout', '整理中…': 'Arranging…',
  '左对齐': 'Align left', '右对齐': 'Align right', '水平居中': 'Center H', '上对齐': 'Align top',
  '下对齐': 'Align bottom', '垂直居中': 'Center V', '导入整包': 'Import bundle',
  '文件操作': 'File', '流程图': 'Flow', '模块条': 'Blocks',
  '新建工作流': 'New workflow', '版本历史': 'Version history',
  '自动化浏览器': 'Automation browser', '工作流仓库': 'Workflow Hub',
  // 底栏 / 面板
  '日志': 'Logs', '数据': 'Data', '变量': 'Variables', '资源': 'Assets', '图像': 'Images',
  '模块': 'Modules', '配置': 'Config', '节点备注': 'Node note', '清空日志': 'Clear logs',
  '清空数据': 'Clear data', '导出数据': 'Export data', '详细日志': 'Verbose logs',
  '运行中…': 'Running…', '已停止': 'Stopped', '执行成功': 'Succeeded', '执行失败': 'Failed',
  // 通用按钮 / 弹窗
  '确定': 'OK', '取消': 'Cancel', '关闭': 'Close', '删除': 'Delete', '确认': 'Confirm',
  '覆盖': 'Overwrite', '继续': 'Continue', '保存并继续': 'Save & continue', '应用': 'Apply',
  '重置': 'Reset', '复制': 'Copy', '已复制': 'Copied', '刷新': 'Refresh', '搜索': 'Search',
  '提交': 'Commit', '恢复': 'Restore', '对比': 'Compare', '收起': 'Collapse', '展开': 'Expand',
  '上一个': 'Previous', '下一个': 'Next', '全选': 'Select all', '编辑': 'Edit', '保存配置': 'Save config',
  // 模块侧栏分类
  '网页导航': 'Web Navigation', '网页元素交互': 'Web Element Interaction',
  '网页元素查询': 'Web Element Query', '网页数据采集': 'Web Data Scraping',
  'DrissionPage 反检测自动化': 'DrissionPage Anti-Detection',
  '鼠标操作': 'Mouse', '键盘操作': 'Keyboard', '图像识别与点击': 'Image Recognition & Click',
  '屏幕与录制': 'Screen & Recording', '桌面应用控制': 'Desktop App Control', '系统操作': 'System',
  '手机自动化': 'Mobile Automation', '流程控制': 'Flow Control', '触发器': 'Triggers',
  '变量与运算': 'Variables & Math', '文本处理': 'Text', '列表操作': 'List', '字典操作': 'Dict',
  '数学与统计': 'Math & Stats', '表格与CSV': 'Table & CSV', 'Excel自动化': 'Excel Automation',
  '数据库': 'Database', '文件管理': 'File Management', 'PDF处理': 'PDF', '文档转换': 'Doc Convert',
  '文件对比': 'File Compare', '图像编辑': 'Image Editing', '盲水印': 'Blind Watermark',
  '视频处理': 'Video', '音频处理': 'Audio', '媒体格式转换': 'Media Convert',
  'AI对话与视觉': 'AI Chat & Vision', 'AI数据处理': 'AI Data',
  // 配置面板常见
  '元素选择器': 'Element selector', '可视化选择元素': 'Pick element visually',
  '等待类型': 'Wait type', '等待时间': 'Wait time', '超时时间': 'Timeout',
  '保存到变量': 'Save to variable', '变量名': 'Variable name',
  // 小助手
  'WebRPA 小助手': 'WebRPA Assistant', '小助手': 'Assistant', '新对话': 'New chat',
  '历史对话': 'History', '尚未配置模型': 'No model configured',
  '允许执行': 'Allow', '拒绝（继续任务）': 'Reject (keep going)',
  '操作权限': 'Permissions', '逐项确认': 'Per-action', '智能放行': 'Smart auto', '自由执行': 'Full access',
}

// 追加：常见对话框/菜单/设置/右键菜单等整句
Object.assign(UI_DICT, {
  // 右键菜单 / 节点操作
  '复制节点': 'Copy node', '粘贴节点': 'Paste node', '删除节点': 'Delete node',
  '复制模块': 'Copy module', '粘贴模块': 'Paste module', '删除模块': 'Delete module',
  '启用模块': 'Enable module', '禁用模块': 'Disable module', '重命名': 'Rename',
  '添加备注': 'Add note', '复制为副本': 'Duplicate', '全部展开': 'Expand all', '全部收起': 'Collapse all',
  '从这里运行': 'Run from here', '运行到这里': 'Run to here', '单步运行': 'Step run',
  // 对话框标题/提示
  '提示': 'Notice', '警告': 'Warning', '错误': 'Error', '成功': 'Success', '确认操作': 'Confirm',
  '是否覆盖': 'Overwrite?', '是否删除': 'Delete?', '此操作不可撤销': 'This cannot be undone',
  '保存成功': 'Saved successfully', '保存失败': 'Save failed', '删除成功': 'Deleted successfully',
  '请输入名称': 'Enter a name', '请选择': 'Please select', '加载中…': 'Loading…', '暂无数据': 'No data',
  '未命名工作流': 'Untitled workflow', '另存为': 'Save as', '保存到本地': 'Save locally',
  '导出工作流': 'Export workflow', '导入工作流': 'Import workflow', '打开本地工作流': 'Open local workflow',
  // 设置面板
  '常规': 'General', '外观': 'Appearance', '存储': 'Storage', '快捷键': 'Shortcuts',
  '模型配置': 'Model config', '主题': 'Theme', '语言': 'Language', '深色模式': 'Dark mode',
  '浅色模式': 'Light mode', '跟随系统': 'Follow system', '自动保存': 'Auto save',
  '保存位置': 'Save location', '打开保存位置': 'Open save folder', '恢复默认': 'Restore defaults',
  // 小助手对话
  '发送': 'Send', '停止生成': 'Stop', '清空对话': 'Clear chat', '重新生成': 'Regenerate',
  '正在思考…': 'Thinking…', '正在执行…': 'Executing…', '需要您的授权': 'Authorization required',
  '允许本次': 'Allow once', '始终允许': 'Always allow', '拒绝': 'Reject',
  '操作您的电脑': 'Control your computer',
  // 版本历史
  '创建存档': 'Create snapshot', '回到此版本': 'Restore this version', '当前版本': 'Current version',
  '版本备注': 'Version note', '暂无历史版本': 'No history yet',
  // 插件
  '插件市场': 'Plugin Market', '插件': 'Plugins', '已安装': 'Installed',
  '安装': 'Install', '卸载': 'Uninstall', '启用': 'Enable', '禁用': 'Disable',
  '发布': 'Publish', '从文件安装': 'Install from file', '市场地址': 'Market URL',
  '详情 / 评分': 'Details / Reviews', '我的评分': 'My rating', '用户评价': 'Reviews',
  '提交评分': 'Submit review', '还没有评价，来做第一个吧': 'No reviews yet, be the first',
})

/* ============================================================
   短语级字典（中文片段 → 英文片段）
   用于覆盖"动态拼接文本/日志"，在整句精确匹配未命中时按长度降序逐个替换。
   注意：短语会被无差别替换，故只放语义稳定、歧义低的片段。
   ============================================================ */
// 追加：AI 小助手面板 / Agent 窗口 可见整句
Object.assign(UI_DICT, {
  '你好，我是 WebRPA 小助手': "Hi, I'm the WebRPA Assistant",
  '你好，我是你的电脑 Agent': "Hi, I'm your computer Agent",
  '快速开始': 'Quick start', '使用建议': 'Tips',
  '尚未配置模型': 'No model configured', '未配置': 'Not configured', '已配置': 'Configured',
  '请先在全局配置中配置模型': 'Configure a model in Global Settings first',
  '请先在「全局配置 → 小助手」中填写 API 地址和模型': 'Please set the API URL and model in Settings → Assistant first',
  'Skills 已启用': 'Skills enabled', 'Skills 已禁用': 'Skills disabled',
  '我了解 WebRPA 的方方面面，能帮你搭建工作流、运行任务、答疑解惑；不止于此，我还能直接操作你的电脑—— 打开软件、管理文件、执行命令、控制鼠标键盘等都不在话下。':
    'I know WebRPA inside out — I can build workflows, run tasks and answer questions. Beyond that, I can directly operate your computer: open apps, manage files, run commands, control the mouse and keyboard, and more.',
  // 编辑器内嵌面板快捷指令
  '帮我新建一个打开网页的工作流': 'Create a workflow that opens a web page',
  'WebRPA 怎么用？': 'How do I use WebRPA?',
  '列出所有 AI 类模块': 'List all AI modules',
  '我画布上有哪些节点？': 'What nodes are on my canvas?',
  // Agent 窗口快捷指令
  '帮我整理一下桌面上的文件，按类型归类到文件夹': 'Organize my desktop files into folders by type',
  '截一张当前屏幕的图并分析上面有什么': 'Take a screenshot of my screen and analyze it',
  '打开记事本，写入一段今天的待办清单并保存到桌面': 'Open Notepad, write today\u2019s to-do list and save it to the desktop',
  '查找并打开电脑上的某个程序': 'Find and open a program on my computer',
  // 使用建议卡片
  '其智能程度还取决于接入的 AI 模型能力。一次性生成完美工作流很难，因为：':
    'Its intelligence also depends on the connected AI model. Generating a perfect workflow in one shot is hard because:',
  '网页元素 Selector 难以准确预测': 'Web element selectors are hard to predict accurately',
  '桌面控件路径需要拾取器实地获取': 'Desktop control paths must be captured live with the picker',
  '手机屏幕坐标无法凭空判断': 'Phone screen coordinates cannot be guessed',
  '绝大多数情况下都需要人工干预，请合理预期。': 'In most cases human input is needed — please set expectations accordingly.',
})

// 追加：工具栏「更多」菜单 / 录制 / 对齐等可见整句
Object.assign(UI_DICT, {
  '全局配置': 'Global Settings',
  '变量追踪': 'Variable Tracking',
  '手机镜像': 'Phone Mirror',
  '屏保弹幕': 'Screensaver',
  '计划任务': 'Scheduled Tasks',
  '工具与功能': 'Tools & Features',
  '更多操作': 'More',
  '录制': 'Record',
  '录制生成节点': 'Record to nodes',
  '网页智能录制': 'Web smart recording',
  '桌面录制': 'Desktop recording',
  '水平均匀分布': 'Distribute horizontally',
  '垂直均匀分布': 'Distribute vertically',
  '正在加载教学文档…': 'Loading tutorials…',
})

export const PHRASES: Record<string, string> = {

  // —— 日志/执行状态片段 ——
  '正在执行': 'Executing',
  '执行完成': 'Execution finished',
  '执行成功': 'Execution succeeded',
  '执行失败': 'Execution failed',
  '执行出错': 'Execution error',
  '执行中': 'Running',
  '已开始执行': 'Started',
  '已停止执行': 'Stopped',
  '开始执行工作流': 'Start running workflow',
  '工作流执行完成': 'Workflow finished',
  '工作流执行失败': 'Workflow failed',
  '正在运行': 'Running',
  '运行成功': 'Run succeeded',
  '运行失败': 'Run failed',
  '运行完成': 'Run finished',
  '已完成': 'Done',
  '已取消': 'Canceled',
  '已跳过': 'Skipped',
  '已超时': 'Timed out',
  '准备中': 'Preparing',
  '初始化': 'Initializing',
  '连接成功': 'Connected',
  '连接失败': 'Connection failed',
  '连接中': 'Connecting',
  '已连接': 'Connected',
  '已断开': 'Disconnected',

  // —— 动词/操作结果（带"已"前缀的完成态） ——
  '已删除': 'Deleted ',
  '已添加': 'Added ',
  '已新增': 'Added ',
  '已创建': 'Created ',
  '已保存': 'Saved ',
  '已更新': 'Updated ',
  '已导入': 'Imported ',
  '已导出': 'Exported ',
  '已复制': 'Copied ',
  '已粘贴': 'Pasted ',
  '已剪切': 'Cut ',
  '已加载': 'Loaded ',
  '已重命名': 'Renamed ',
  '已启用': 'Enabled ',
  '已禁用': 'Disabled ',
  '已选择': 'Selected ',
  '已选中': 'Selected ',
  '已清空': 'Cleared ',
  '已恢复': 'Restored ',
  '已重置': 'Reset ',
  '已应用': 'Applied ',
  '已上传': 'Uploaded ',
  '已下载': 'Downloaded ',
  '已发布': 'Published ',
  '已安装': 'Installed ',
  '已卸载': 'Uninstalled ',
  '已注册': 'Registered ',
  '已切换': 'Switched ',
  '已锁定': 'Locked ',
  '已解锁': 'Unlocked ',
  '已展开': 'Expanded ',
  '已收起': 'Collapsed ',
  '已对齐': 'Aligned ',
  '已禁止': 'Forbidden ',
  '已找到': 'Found ',
  '未找到': 'Not found ',
  '正在': 'Running ',

  // —— 名词（单位/对象，常出现在"N 个X"中） ——
  '个模块': ' module(s)',
  '个节点': ' node(s)',
  '个工作流': ' workflow(s)',
  '个变量': ' variable(s)',
  '个元素': ' element(s)',
  '个文件': ' file(s)',
  '个字符': ' character(s)',
  '个连接': ' connection(s)',
  '个结果': ' result(s)',
  '个插件': ' plugin(s)',
  '个版本': ' version(s)',
  '个标签': ' tag(s)',
  '个分组': ' group(s)',
  '个任务': ' task(s)',
  '个触发器': ' trigger(s)',
  '个步骤': ' step(s)',
  '个项目': ' item(s)',

  // —— 动作动词（覆盖按钮/菜单/提示动态文本） ——
  '添加': 'Add', '新增': 'Add', '删除': 'Delete', '移除': 'Remove', '编辑': 'Edit',
  '保存': 'Save', '另存为': 'Save as', '取消': 'Cancel', '确认': 'Confirm', '确定': 'OK',
  '关闭': 'Close', '打开': 'Open', '运行': 'Run', '停止': 'Stop', '暂停': 'Pause',
  '继续': 'Continue', '重试': 'Retry', '刷新': 'Refresh', '搜索': 'Search', '查询': 'Query',
  '复制': 'Copy', '粘贴': 'Paste', '剪切': 'Cut', '撤销': 'Undo', '重做': 'Redo',
  '导入': 'Import', '导出': 'Export', '上传': 'Upload', '下载': 'Download', '选择': 'Select',
  '全选': 'Select all', '清空': 'Clear', '重置': 'Reset', '应用': 'Apply', '提交': 'Submit',
  '发送': 'Send', '返回': 'Back', '下一步': 'Next', '上一步': 'Previous', '完成': 'Done',
  '开始': 'Start', '结束': 'End', '启用': 'Enable', '禁用': 'Disable', '展开': 'Expand',
  '收起': 'Collapse', '折叠': 'Collapse', '排序': 'Sort', '筛选': 'Filter', '过滤': 'Filter',
  '分组': 'Group', '重命名': 'Rename', '移动': 'Move', '对齐': 'Align', '连接': 'Connect',
  '断开': 'Disconnect', '插入': 'Insert', '替换': 'Replace', '预览': 'Preview', '测试': 'Test',
  '验证': 'Validate', '校验': 'Check', '安装': 'Install', '卸载': 'Uninstall', '发布': 'Publish',
  '登录': 'Sign in', '登出': 'Sign out', '注册': 'Register', '切换': 'Switch', '锁定': 'Lock',
  '解锁': 'Unlock', '置顶': 'Pin', '还原': 'Restore', '拖拽': 'Drag', '缩放': 'Zoom',
  '复制成功': 'Copied', '保存成功': 'Saved', '删除成功': 'Deleted', '操作成功': 'Done',
  '操作失败': 'Operation failed', '加载中': 'Loading', '保存中': 'Saving', '上传中': 'Uploading',
  '下载中': 'Downloading', '处理中': 'Processing', '生成中': 'Generating', '搜索中': 'Searching',

  // —— 核心名词 ——
  '工作流': 'Workflow', '模块': 'Module', '节点': 'Node', '连线': 'Edge', '全局变量': 'Global variable',
  '变量': 'Variable', '参数': 'Parameter', '配置': 'Config', '属性': 'Property', '字段': 'Field',
  '选择器': 'Selector', '元素': 'Element', '页面': 'Page', '浏览器': 'Browser', '标签页': 'Tab',
  '窗口': 'Window', '对话框': 'Dialog', '弹窗': 'Dialog', '面板': 'Panel', '侧栏': 'Sidebar',
  '工具栏': 'Toolbar', '底栏': 'Bottom bar', '画布': 'Canvas', '日志': 'Log', '数据': 'Data',
  '表格': 'Table', '单元格': 'Cell', '文件夹': 'Folder', '文件': 'File', '路径': 'Path',
  '名称': 'Name', '类型': 'Type', '状态': 'Status', '结果': 'Result', '错误': 'Error',
  '警告': 'Warning', '信息': 'Info', '通知': 'Notification', '消息': 'Message', '标题': 'Title',
  '内容': 'Content', '备注': 'Note', '描述': 'Description', '说明': 'Description', '分类': 'Category',
  '标签': 'Tag', '版本': 'Version', '历史': 'History', '快照': 'Snapshot', '模板': 'Template',
  '示例': 'Example', '教程': 'Tutorial', '文档': 'Docs', '帮助': 'Help', '设置': 'Settings',
  '偏好': 'Preferences', '语言': 'Language', '主题': 'Theme', '快捷键': 'Shortcut', '触发器': 'Trigger',
  '定时任务': 'Scheduled task', '计划任务': 'Scheduled task', '脚本': 'Script', '代码': 'Code',
  '表达式': 'Expression', '条件': 'Condition', '循环': 'Loop', '分支': 'Branch', '子流程': 'Subflow',
  '插件': 'Plugin', '市场': 'Market', '仓库': 'Hub', '资源': 'Asset', '图像': 'Image', '图片': 'Image',
  '凭据': 'Credential', '密码': 'Password', '密钥': 'Key', '账号': 'Account', '邮箱': 'Email',
  '手机': 'Phone', '地址': 'Address', '端口': 'Port', '超时': 'Timeout', '等待': 'Wait',
  '延时': 'Delay', '间隔': 'Interval', '次数': 'Count', '并发': 'Concurrency', '进度': 'Progress',

  // —— 状态/形容词 ——
  '成功': 'Success', '失败': 'Failed', '提示': 'Notice', '可用': 'Available', '不可用': 'Unavailable',
  '必填': 'Required', '可选': 'Optional', '默认': 'Default', '自定义': 'Custom', '全部': 'All',
  '运行中': 'Running', '已停止': 'Stopped', '进行中': 'In progress', '未开始': 'Not started',
  '在线': 'Online', '离线': 'Offline', '正常': 'Normal', '异常': 'Abnormal', '高级': 'Advanced',
  '基础': 'Basic', '简单': 'Simple', '复杂': 'Complex', '最新': 'Latest', '全局': 'Global',
  '本地': 'Local', '远程': 'Remote', '免费': 'Free', '开源': 'Open source', '完全离线': 'Fully offline',
  '空': 'Empty', '无': 'None', '暂无数据': 'No data', '暂无': 'None yet', '没有更多': 'No more',
  '加载更多': 'Load more', '查看详情': 'View details', '查看更多': 'View more', '更多': 'More',
  '全部展开': 'Expand all', '全部收起': 'Collapse all', '回到顶部': 'Back to top',

  // —— 常见提示句式 ——
  '请输入': 'Please enter', '请选择': 'Please select', '请填写': 'Please fill in',
  '是否': 'Whether ', '确定要': 'Are you sure to ', '此操作不可撤销': 'This action cannot be undone',
  '不可恢复': 'cannot be recovered', '确定删除': 'Confirm delete', '确认删除': 'Confirm delete',
  '保存失败': 'Save failed', '加载失败': 'Load failed', '请稍候': 'please wait', '请重试': 'please retry',
  '请先': 'Please first ', '尚未配置': 'Not configured yet', '配置成功': 'Configured',
  '复制到剪贴板': 'Copied to clipboard', '已复制到剪贴板': 'Copied to clipboard',

  // —— 单位 ——
  '毫秒': 'ms', '秒': 's', '分钟': 'min', '小时': 'h', '天': 'day(s)',
  '次': ' time(s)', '条': ' item(s)', '项': ' item(s)', '行': ' row(s)', '列': ' column(s)',
  '页': ' page(s)', '字节': ' bytes', '像素': 'px',

  // —— 高频连接/语气词兜底（最后执行，确保尽量无中文残留） ——
  '已经': '', '请': 'please ', '和': ' & ', '与': ' & ', '或': ' / ',
  '的': ' ', '了': '', '吗': '?', '呢': '', '吧': '', '哦': '', '啊': '',
  '即': '', '将': 'will ', '把': '', '被': '', '给': 'to ', '为': 'as ', '在': 'in ',
  '从': 'from ', '到': 'to ', '至': 'to ', '后': ' after', '前': ' before', '时': ' when',
  '已': '', '未': 'not ', '中': '', '个': '', '该': 'this ', '此': 'this ', '其': 'its ',
  '填写': 'fill in', '小助手': 'Assistant', '这个': 'this ', '这': 'this ', '那个': 'that ', '那': 'that ',
  '这些': 'these ', '那些': 'those ', '每个': 'each ', '当前': 'current ', '所有': 'all ',
  '点击': 'click ', '双击': 'double-click ', '右键': 'right-click ', '长按': 'long press ',
  '成功了': 'succeeded', '不能': 'cannot ', '不要': 'do not ', '需要': 'need ', '可以': 'can ',
  '模型': 'model', '此处': 'here', '处': ' here ', '没有': 'no ', '操作': 'operation ',
  '不可': 'cannot ', '不支持': 'not supported', '暂不支持': 'not supported yet', '已是': 'already ',
  '存在': 'exists', '不存在': 'does not exist',
  // 全角标点 → 半角（清除中文标点，达到纯英文观感）
  '，': ', ', '。': '. ', '：': ': ', '；': '; ', '、': ', ', '？': '? ', '！': '! ',
  '（': ' (', '）': ') ', '【': '[', '】': ']', '“': '"', '”': '"', '‘': "'", '’': "'",
  '《': '<', '》': '>', '…': '...',
}

// ============================================================
// 大批领域词库（多字词，运行时按长度降序优先于单字兜底）
// 目标：把配置面板/模型说明/帮助文本等深层中文也翻成可读英文
// ============================================================
Object.assign(PHRASES, {
  // —— RPA / 流程领域 ——
  '自动化工作流': 'automation workflow', '自动化': 'automation', '工作流': 'workflow',
  '子流程头节点': 'subflow header node', '子流程头': 'subflow header', '头节点': 'header node',
  '子流程': 'subflow', '主流程': 'main flow', '流程图': 'flowchart', '流程': 'flow',
  '触发器': 'trigger', '定时触发': 'scheduled trigger', '定时任务': 'scheduled task',
  '计划任务': 'scheduled task', '定时': 'scheduled', '计划': 'plan', '任务': 'task',
  '调用子流程': 'call subflow', '调用': 'call', '返回值': 'return value', '返回': 'return',
  '未命名子流程': 'Untitled subflow', '未命名工作流': 'Untitled workflow', '未命名': 'Untitled',
  // —— 节点 / 模块 ——
  '节点备注': 'node note', '节点': 'node', '模块条': 'module bar', '模块': 'module',
  '连线': 'edge', '连接线': 'edge', '分组': 'group', '画布': 'canvas',
  '设为子流程': 'Set as subflow', '设为': 'Set as', '标记': 'mark',
  // —— 输入输出 / 数据 ——
  '输入框': 'input box', '输入': 'input', '输出': 'output', '读取文件': 'read file',
  '写入文件': 'write file', '读取': 'read', '写入': 'write', '获取': 'get', '设置变量': 'set variable',
  '设置': 'set', '取值': 'get value', '赋值': 'assign', '数值': 'number', '数字': 'number',
  '字符串': 'string', '布尔': 'boolean', '布尔值': 'boolean', '列表': 'list', '字典': 'dictionary',
  '对象': 'object', '数组': 'array', '键值对': 'key-value pair', '键值': 'key-value',
  '全局变量': 'global variable', '局部变量': 'local variable', '环境变量': 'environment variable',
  '变量名': 'variable name', '变量': 'variable', '参数': 'parameter', '字段': 'field',
  '默认值': 'default value', '当前值': 'current value', '初始值': 'initial value',
  // —— 文件 / 媒体 ——
  '文件夹': 'folder', '文件名': 'file name', '文件路径': 'file path', '文件': 'file',
  '路径': 'path', '目录': 'directory', '文本': 'text', '内容': 'content',
  '音频': 'audio', '视频': 'video', '图片': 'image', '图像': 'image', '截图': 'screenshot',
  '录屏': 'screen recording', '屏幕': 'screen', '录制': 'recording', '回放': 'playback',
  '编码': 'encoding', '解码': 'decoding', '加密': 'encrypt', '解密': 'decrypt',
  '压缩': 'compress', '解压': 'unzip', '格式转换': 'format conversion', '转换': 'convert',
})

Object.assign(PHRASES, {
  // —— 浏览器 / 网页 ——
  '浏览器': 'browser', '网页': 'web page', '网址': 'URL', '标签页': 'tab', '当前标签页': 'current tab',
  '新标签页': 'new tab', '页面离开确认': 'page leave confirm', '页面离开': 'page leave', '页面': 'page',
  '在当前标签页中执行代码': 'Run code in the current tab', '在所有标签页中执行代码': 'Run code in all tabs',
  '在指定索引的标签页中执行代码': 'Run code in the tab at the given index',
  '在URL匹配的标签页中执行代码': 'Run code in tabs matching the URL',
  '执行代码': 'run code', '执行': 'execute', '元素选择器': 'element selector', '选择器': 'selector',
  '元素': 'element', '属性': 'attribute', '文本内容': 'text content', '内部文本': 'inner text',
  '点击元素': 'click element', '输入文本': 'type text', '悬停': 'hover', '滚动': 'scroll',
  '遍历': 'iterate', '相似元素': 'similar elements', '相似': 'similar', '所有相似元素': 'all similar elements',
  '忽略证书错误': 'ignore certificate errors', '证书错误': 'certificate error', '证书': 'certificate',
  '禁用Web安全策略': 'disable web security', 'Web安全策略': 'web security policy', '安全策略': 'security policy',
  '隐藏自动化特征': 'hide automation fingerprint', '自动化特征': 'automation fingerprint',
  '最大化启动': 'launch maximized', '最大化': 'maximize', '最小化': 'minimize', '全屏': 'fullscreen',
  '无头模式': 'headless mode', '无头': 'headless', '反检测': 'anti-detection',
  // —— 桌面 / 系统 / 设备 ——
  '桌面': 'desktop', '应用': 'application', '软件': 'software', '窗口': 'window', '进程': 'process',
  '记事本、计算器、Office 等': 'Notepad, Calculator, Office, etc.', '记事本': 'Notepad', '计算器': 'Calculator',
  '鼠标': 'mouse', '键盘': 'keyboard', '指针': 'pointer', '坐标': 'coordinate', '触摸': 'touch',
  '触摸点': 'touch point', '精确坐标': 'exact coordinates', '手势': 'gesture', '请选择手势': 'Select a gesture',
  '将指针拖拽到需要操作的位置': 'Drag the pointer to where you want to operate',
  '即为当前触摸点的精确坐标': 'is the exact coordinate of the current touch point',
  '手机镜像': 'phone mirror', '镜像': 'mirror', '设备': 'device', '手机': 'phone',
  '屏保弹幕': 'screensaver barrage', '屏保': 'screensaver', '弹幕': 'barrage',
  // —— 模型 / AI ——
  '阿里通义千问，中文友好': 'Alibaba Tongyi Qianwen, China-friendly', '阿里通义千问': 'Alibaba Tongyi Qianwen',
  '通义千问': 'Tongyi Qianwen', '阿里': 'Alibaba', '中文友好': 'China-friendly', '中文': 'Chinese',
  '免费，速度极快': 'free, very fast', '免费，速度快': 'free, fast', '免费，性能强': 'free, strong performance',
  '性价比高，速度快': 'cost-effective, fast', '性价比极高': 'highly cost-effective', '性价比': 'cost-effectiveness',
  '性能更强': 'stronger performance', '性能均衡': 'balanced performance', '性能强': 'strong performance',
  '最强性能': 'top performance', '性能': 'performance', '速度极快': 'very fast', '速度快': 'fast', '速度': 'speed',
  'Meta 开源模型，性能均衡': 'Meta open-source model, balanced performance', '开源模型': 'open-source model',
  '按使用量付费': 'pay as you go', '提供免费额度，适合测试': 'free quota available, good for testing',
  '需要先安装并下载模型，完全免费': 'requires installing and downloading the model first, completely free',
  '免费额度': 'free quota', '额度': 'quota', '付费': 'paid', '完全免费': 'completely free', '免费': 'free',
  '适合测试': 'good for testing', '多模态': 'multimodal', '视觉': 'vision', '推理': 'reasoning', '对话': 'chat',
})

Object.assign(PHRASES, {
  // —— Python 编辑器 / 代码模板 ——
  '主函数模板': 'main function template', '主函数': 'main function', '函数': 'function',
  '类定义': 'class definition', '类': 'class', '定义': 'definition',
  '异常处理': 'exception handling', '异常': 'exception', '处理': 'handle',
  'if-else 语句': 'if-else statement', '语句': 'statement', '注释': 'comment',
  '导入模块': 'import module', '缩进': 'indentation', '代码片段': 'code snippet', '代码': 'code',
  '运行代码': 'run code', '调试': 'debug', '断点': 'breakpoint', '单步': 'step',
  // —— 自定义模块 ——
  '在工作流中创建一个名为': 'creates in the workflow one named', '在日志模块中可以写': 'in the log module you can write',
  '自定义模块': 'custom module', '调用时可以传递参数到子流程': 'parameters can be passed to the subflow when called',
  '可以在子流程中访问和修改全局变量': 'you can read and modify global variables inside the subflow',
  '使用"调用子流程"模块调用': 'invoke via the "Call subflow" module',
  '使用子流程头节点标记起始位置': 'use the subflow header node to mark the start',
  '通过"设置变量"模块设置返回值': 'set the return value via the "Set variable" module',
  '然后在后续模块中使用此选择器即可遍历所有相似元素': 'then use this selector in later modules to iterate over all similar elements',
  // —— 安全 / 网络 / 权限 ——
  '访问令牌': 'access token', '令牌': 'token', '其它设备访问需携带访问令牌': 'other devices must include an access token to access',
  '保护文件共享 / 远程控制 / 命令执行等高危能力': 'protects high-risk capabilities like file sharing / remote control / command execution',
  '文件共享': 'file sharing', '远程控制': 'remote control', '命令执行': 'command execution', '高危': 'high-risk',
  '权限': 'permission', '验证': 'verify', '校验': 'check', '检测': 'detect', '识别': 'recognize',
  '请求': 'request', '响应': 'response', '接口': 'API', '服务器': 'server', '客户端': 'client',
  '网络': 'network', '协议': 'protocol', '监听': 'listen', '局域网': 'LAN', '本机': 'local machine',
  // —— AI 助手面板长句 ——
  '更适合作为你的搭档：先让它快速搭出基本框架或提建议，再由你完善细节':
    'works better as your partner: let it quickly draft a basic framework or give suggestions, then you refine the details',
  '能直接操作你的电脑': 'can directly operate your computer',
  '打开/关闭软件、管理文件、运行命令与脚本、看屏截图、控制鼠标键盘、联网查资料，自己规划步骤、自己执行、自己验证':
    'open/close software, manage files, run commands and scripts, take screenshots, control mouse and keyboard, search online, and plan, execute and verify steps on its own',
  '当然，我也能顺手帮你操作 WebRPA、搭建并运行自动化工作流':
    'of course, I can also help you operate WebRPA and build and run automation workflows',
  '搭档': 'partner', '框架': 'framework', '建议': 'suggestion', '细节': 'details', '步骤': 'step',
})

Object.assign(PHRASES, {
  // —— 通用名词 / 动词（覆盖高频残留字组成的词）——
  '使用方法': 'usage', '使用说明': 'instructions', '使用': 'use', '用法': 'usage', '用途': 'purpose',
  '名称': 'name', '名字': 'name', '动作': 'action', '行为': 'behavior', '操作': 'operation',
  '表格': 'table', '表单': 'form', '列表项': 'list item', '表达式': 'expression', '格式': 'format',
  '支持': 'support', '持续': 'continuous', '保持': 'keep', '一键': 'one-click', '一个': 'one',
  '字符': 'character', '字段': 'field', '键盘按键': 'keyboard key', '按键': 'key', '按下': 'press',
  '按住': 'hold', '释放': 'release', '快捷键': 'shortcut', '组合键': 'key combo',
  '频率': 'frequency', '出现': 'appear', '弹出': 'pop up', '记录': 'record', '日志记录': 'logging',
  '新增': 'add', '新建': 'new', '可选': 'optional', '可用': 'available', '可以': 'can',
  '配置项': 'config item', '配置': 'config', '保留': 'keep', '示例': 'example', '提示': 'tip',
  '程度': 'level', '进度': 'progress', '目标': 'target', '目录树': 'directory tree',
  '获取': 'get', '变化': 'change', '转化': 'transform', '包含': 'contains', '包括': 'including',
  '方式': 'method', '方法': 'method', '方向': 'direction', '位置': 'position', '位': 'bit',
  '发送': 'send', '发布': 'publish', '触发': 'trigger', '需要': 'need', '选项': 'option',
  '选中': 'selected', '间隔': 'interval', '区间': 'range', '编码': 'encoding', '建立': 'establish',
  '等待': 'wait', '相等': 'equal', '等于': 'equals', '大于': 'greater than', '小于': 'less than',
  '包含关系': 'contains', '是否包含': 'whether it contains', '是否相等': 'whether equal',
  '类型': 'type', '种类': 'kind', '状态': 'status', '结果': 'result', '过程': 'process',
  '开始': 'start', '结束': 'end', '停止': 'stop', '暂停': 'pause', '恢复': 'resume', '继续': 'continue',
  '重试': 'retry', '跳过': 'skip', '忽略': 'ignore', '清除': 'clear', '清空': 'clear', '重置': 'reset',
  '默认': 'default', '自定义': 'custom', '高级': 'advanced', '基础': 'basic', '常规': 'general',
  '启用': 'enable', '禁用': 'disable', '开启': 'on', '关闭': 'off', '打开': 'open',
  '显示': 'show', '隐藏': 'hide', '展开': 'expand', '折叠': 'collapse', '收起': 'collapse',
  '添加': 'add', '移除': 'remove', '删除': 'delete', '编辑': 'edit', '修改': 'modify', '更新': 'update',
  '保存': 'save', '另存为': 'save as', '导入': 'import', '导出': 'export', '上传': 'upload', '下载': 'download',
  '复制': 'copy', '粘贴': 'paste', '剪切': 'cut', '撤销': 'undo', '重做': 'redo', '移动': 'move',
  '查找': 'find', '搜索': 'search', '筛选': 'filter', '排序': 'sort', '替换': 'replace', '匹配': 'match',
  '安装': 'install', '卸载': 'uninstall', '发现': 'found', '检查': 'check', '更多': 'more',
  '完成': 'done', '成功': 'success', '失败': 'failed', '错误': 'error', '警告': 'warning',
  '确定': 'OK', '取消': 'cancel', '确认': 'confirm', '应用': 'apply', '提交': 'submit',
})

// ============================================================
// 精确整句翻译：GlobalConfigDialog（全局配置）可见文案
// ============================================================
Object.assign(UI_DICT, {
  '全局默认配置': 'Global default settings',
  '在这里调整 WebRPA 的工作行为与默认参数': 'Adjust WebRPA\u2019s behavior and default parameters here',
  '配置系统相关的全局设置': 'Configure system-level global settings',
  '配置界面显示相关的选项': 'Configure interface display options',
  '系统': 'System', 'AI对话': 'AI Chat', 'AI智能': 'AI Smart', '存储': 'Storage', '数据库': 'Database',
  '显示': 'Display', '浏览器': 'Browser', '凭据库': 'Credentials', '留存清理': 'Retention',
  '邮件': 'Email', '飞书': 'Feishu', '安全': 'Security', 'QQ号': 'QQ',
  // —— 系统页 ——
  '启动时检查更新': 'Check updates on launch',
  '启动WebRPA时自动检查是否有新版本可用': 'Automatically check for new versions when WebRPA starts',
  '显示AI小助手入口': 'Show AI Assistant entry',
  '在编辑器右下角显示AI小助手的浮动按钮（快捷键 Ctrl+K 不受影响）': 'Show the AI Assistant floating button at the bottom-right of the editor (the Ctrl+K shortcut is unaffected)',
  '切换 WebRPA 编辑器界面的中英文显示 / Switch the editor UI language': 'Switch the editor UI language',
  '界面语言 / Language': 'Language',
  '中文': 'Chinese',
  '自定义快捷键': 'Custom shortcuts',
  '点击输入框后按下想要的组合键即可绑定常用功能（不影响内置快捷键）。按 Esc 或点「清除」可解绑。': 'Click the input box and press the desired key combo to bind a common action (built-in shortcuts are unaffected). Press Esc or click Clear to unbind.',
  '点击后按组合键': 'Press key combo after clicking',
  '清除': 'Clear',
  '画布小组件': 'Canvas widgets',
  '控制画布周围辅助小组件的显示与隐藏（默认全部显示）': 'Control the visibility of helper widgets around the canvas (all shown by default)',
  '运行状态高亮': 'Run-status highlight',
  '工作流运行时实时高亮“运行中/成功/失败”的模块。默认关闭：大型工作流高速运行时方块闪烁会导致页面卡顿': 'Highlight running/succeeded/failed modules in real time while a workflow runs. Off by default: rapid flashing on large workflows can cause lag.',
  '节点连接点尺寸': 'Node connector size',
  '调整工作流画布中所有节点连接点的大小（6-24像素）': 'Adjust the size of all node connectors on the canvas (6-24 px)',
  '恢复默认 (12px)': 'Restore default (12px)',
  '自动识别剪贴板截图': 'Auto-detect clipboard screenshots',
  '当剪贴板中有新截图时，自动弹出保存对话框': 'When a new screenshot is in the clipboard, automatically pop up the save dialog',
  '开启后会在鼠标旁边显示当前坐标位置': 'When enabled, the current cursor coordinates are shown next to the mouse',
})

Object.assign(UI_DICT, {
  // —— AI 对话 / 小助手页 ——
  '多模型（自动切换 / 模块内手动选择）': 'Multi-model (auto-switch / manual per module)',
  '多模型（一键切换 / 自动切换 / 场景路由）': 'Multi-model (one-click switch / auto-switch / scene routing)',
  '配置多个模型后，可在聊天框右下角一键切换；也可开启下方自动切换/场景路由。顶部单模型字段作为未配置多模型时的兜底。': 'After configuring multiple models, switch with one click at the bottom-right of the chat box, or enable auto-switch / scene routing below. The single-model field at the top is the fallback when no multi-model is configured.',
  '配置多个 AI 对话模型后：开启「失败自动切换」则某模型失败时自动换其它重试；在「AI 对话」类模块的配置项里也会出现下拉框，可手动一键选用某个模型。顶部单模型字段为未配置多模型时的兜底。': 'After configuring multiple AI chat models: enable "Auto-switch on failure" to retry with another model when one fails; a dropdown also appears in AI Chat modules to pick a model manually. The single-model field at the top is the fallback when no multi-model is configured.',
  '添加模型': 'Add model',
  '还没有添加模型。点下方「添加模型」可配置多个模型（同/不同厂商均可），聊天时一键切换或自动切换。': 'No models yet. Click "Add model" below to configure multiple models (same or different vendors), then switch with one click or automatically while chatting.',
  '失败自动切换': 'Auto-switch on failure',
  '某模型请求失败时，自动换其它已配置模型重试，全部失败才报错。': 'When a model request fails, automatically retry with other configured models; only error out if all fail.',
  'AI 对话模块运行时，某模型请求失败自动换其它已配置模型重试，全部失败才报错。': 'While an AI Chat module runs, automatically retry failed model requests with other configured models; only error out if all fail.',
  '场景自动选模型': 'Auto-pick model by scene',
  '按问答场景自动挑选模型：发图片→多模态组、复杂分析→深度思考组、其余→普通对话组（需给模型勾选场景）。': 'Automatically pick a model by scene: images \u2192 multimodal group, complex analysis \u2192 deep-reasoning group, others \u2192 normal chat group (models must be tagged with scenes).',
  '显示名（如 GPT-4o / DeepSeek）': 'Display name (e.g. GPT-4o / DeepSeek)',
  '模型名称': 'Model name',
  '模型名 gpt-4o-mini': 'Model name gpt-4o-mini',
  'API地址': 'API URL', 'API密钥': 'API key',
  'API 地址 https://api.openai.com/v1': 'API URL https://api.openai.com/v1',
  'API 密钥 sk-xxx': 'API key sk-xxx',
  'sk-xxx 或其他格式的密钥': 'sk-xxx or other key format',
  '温度': 'Temperature', '最大Token': 'Max tokens',
  '测试连接': 'Test connection', '测试中…': 'Testing\u2026',
  '发一条极简请求，立即验证 地址/密钥/模型 是否正确': 'Send a minimal request to instantly verify the URL / key / model',
  '建议使用支持 Function Calling 的模型，例如 gpt-4o-mini、glm-4-plus、deepseek-chat、qwen-plus': 'Use a model that supports Function Calling, e.g. gpt-4o-mini, glm-4-plus, deepseek-chat, qwen-plus',
  '支持 OpenAI 兼容协议（OpenAI / 智谱 / Deepseek / Groq / Ollama 等）。\n                    可填基础地址（如 https://api.openai.com/v1），系统会自动补全。': 'Supports the OpenAI-compatible protocol (OpenAI / Zhipu / Deepseek / Groq / Ollama, etc.). You may enter a base URL (e.g. https://api.openai.com/v1) and it will be auto-completed.',
  '内置的全能 AI 助手，能够回答 WebRPA 相关问题、帮你搭建/运行工作流、配置全局设置。\n                      未配置时会自动回退使用「AI对话」的配置。': 'A built-in all-round AI assistant that answers WebRPA questions, helps you build/run workflows, and configure global settings. When not configured, it falls back to the AI Chat settings.',
  '启用 Skills 工具调用': 'Enable Skills tool calls',
  '让小助手能够直接操作 WebRPA（搭建/运行工作流、修改配置等）。\n                        关闭后小助手只能进行问答。': 'Let the assistant operate WebRPA directly (build/run workflows, change settings, etc.). When off, the assistant can only answer questions.',
  '自动批准工具调用': 'Auto-approve tool calls',
  '开启后小助手的工具调用会立即执行，无需人工确认。建议熟悉后再开启。': 'When enabled, the assistant\u2019s tool calls run immediately without manual confirmation. Enable only once you are familiar with it.',
  '控制小助手操作 WebRPA / 你电脑时是否需要你授权。拒绝某次操作不会终止任务，小助手会继续。': 'Controls whether the assistant needs your approval to operate WebRPA / your computer. Rejecting one action will not end the task; the assistant continues.',
  '自愈循环最大轮数': 'Max self-heal rounds',
  '工作流运行失败时，小助手自动「诊断→修复→重跑」的最多轮数。简单任务用不满，复杂任务可调高（1-20，默认 5）。': 'Max rounds the assistant automatically "diagnose \u2192 fix \u2192 rerun" when a workflow fails. Simple tasks need fewer; raise it for complex tasks (1-20, default 5).',
  '附加系统提示词（可选）': 'Additional system prompt (optional)',
  '为小助手追加额外的角色设定或行为约束（小助手已内置 WebRPA 的全部知识，留空即可）': 'Append extra role or behavior constraints for the assistant (it already has full WebRPA knowledge, so you can leave this blank)',
  '设定AI的角色和行为...': 'Define the AI\u2019s role and behavior\u2026',
  '默认系统提示词': 'Default system prompt',
  '默认LLM提供商': 'Default LLM provider',
  '默认API地址': 'Default API URL', '默认API密钥': 'Default API key', '默认API Key': 'Default API key',
  '默认模型名称': 'Default model name', '默认温度': 'Default temperature', '默认最大Token': 'Default max tokens',
  '推荐模型：': 'Recommended models:',
  '推荐使用 Ollama 本地运行，完全免费': 'Recommended to run Ollama locally, completely free',
  'Ollama (本地免费)': 'Ollama (local, free)',
  '智谱 AI (GLM)': 'Zhipu AI (GLM)', '智谱AI:': 'Zhipu AI:', '智谱/Groq/Gemini': 'Zhipu / Groq / Gemini',
  '智谱: https://open.bigmodel.cn/api/paas/v4/chat/completions': 'Zhipu: https://open.bigmodel.cn/api/paas/v4/chat/completions',
  '常用API地址：': 'Common API URLs:',
})

Object.assign(UI_DICT, {
  // —— 浏览器页 ——
  '浏览器类型': 'Browser type',
  '配置浏览器自动化使用的浏览器类型，修改后需要重新打开浏览器才能生效': 'Configure the browser used for automation; changes take effect after reopening the browser',
  '浏览器类型选项会启动对应的浏览器程序，而不是系统默认浏览器。\n                  例如选择"Microsoft Edge"会启动系统安装的 Edge 浏览器，即使您的系统默认浏览器是 Chrome。\n                  如果选择的浏览器未安装或路径不正确，请使用"自定义浏览器路径"手动指定。': 'The browser-type option launches the matching browser program, not the system default. For example, choosing "Microsoft Edge" launches the installed Edge even if your system default is Chrome. If the chosen browser is not installed or the path is wrong, use "Custom browser path" to specify it manually.',
  '自定义浏览器路径（可选）': 'Custom browser path (optional)',
  '使用默认浏览器（推荐）：': 'Use the default browser (recommended):',
  '使用自定义浏览器路径：': 'Use a custom browser path:',
  '如果选择的浏览器类型无法启动，可以手动指定浏览器可执行文件的路径': 'If the chosen browser type cannot start, you can manually specify the browser executable path',
  '清除自定义路径': 'Clear custom path', '恢复默认路径': 'Restore default path',
  '留空则使用系统默认路径': 'Leave blank to use the system default path',
  '关于登录状态持久化': 'About login-state persistence',
  '如需保持登录状态，建议使用默认的 Microsoft Edge 浏览器（不指定自定义路径）': 'To keep login state, use the default Microsoft Edge browser (do not set a custom path)',
  '登录状态会自动保存，下次运行工作流时无需重新登录': 'Login state is saved automatically; no re-login needed next run',
  '由于技术限制，登录状态无法持久化保存，每次运行都需要重新登录': 'Due to technical limits, login state cannot persist; you must log in each run',
  '浏览器数据缓存目录（可选）': 'Browser data cache directory (optional)',
  '默认使用 backend/browser_data 目录存储浏览器数据（Cookie、缓存、登录状态等）。如需自定义存储位置或多项目共享数据，可在此指定': 'By default, browser data (cookies, cache, login state, etc.) is stored in backend/browser_data. Specify here to customize the location or share data across projects',
  '留空则使用默认目录：backend/browser_data': 'Leave blank to use the default directory: backend/browser_data',
  '恢复默认目录': 'Restore default directory',
  '浏览器启动参数': 'Browser launch arguments',
  '每行一个启动参数，例如：&#10;--disable-blink-features=AutomationControlled&#10;--start-maximized': 'One launch argument per line, e.g. --disable-blink-features=AutomationControlled --start-maximized',
  '每行一个参数，留空则使用默认参数。常用参数：': 'One argument per line; leave blank to use defaults. Common arguments:',
  '恢复默认启动参数': 'Restore default launch arguments',
  '窗口最大化启动': 'Launch maximized', '最大化启动': 'Launch maximized',
  '开启后浏览器将以最大化窗口启动（占满整个屏幕）': 'When enabled, the browser launches maximized (fills the whole screen)',
  '工作流结束后自动关闭浏览器': 'Close browser after workflow ends',
  '开启后工作流执行完成时将自动关闭浏览器窗口': 'When enabled, the browser window closes automatically after the workflow finishes',
  '浏览器配置已更新。如果配置未立即生效，请刷新页面后重试。': 'Browser settings updated. If they do not take effect immediately, refresh the page and retry.',
  '禁用通知': 'Disable notifications', '忽略证书错误': 'Ignore certificate errors',
  '禁用Web安全策略': 'Disable web security', '隐藏自动化特征': 'Hide automation fingerprint',
  // —— 存储 / 工作流保存 ——
  '工作流保存文件夹': 'Workflow save folder',
  '配置本地工作流文件的保存位置和自动保存选项': 'Configure where local workflow files are saved and auto-save options',
  '自动保存工作流': 'Auto-save workflow',
  '开启后，工作流的每次编辑都会自动保存到本地，无需手动保存': 'When enabled, every edit is saved locally automatically, no manual save needed',
  '同名工作流覆盖提示': 'Overwrite prompt for same-name workflow',
  '手动保存工作流时，若本地存在同名文件，是否弹出覆盖确认提示': 'Whether to prompt for overwrite confirmation when a same-name file exists during manual save',
  '同名工作流自动创建副本': 'Auto-create copy for same-name workflow',
  '开启后，手动保存时若已存在同名工作流，将自动另存为带时间戳的副本（不再覆盖原文件），覆盖提示也不再显示': 'When enabled, manual save of a same-name workflow auto-saves a timestamped copy (no longer overwriting the original); the overwrite prompt is also hidden',
})

Object.assign(UI_DICT, {
  // —— 凭据库 ——
  '本地加密保存口令 / API Key / 数据库密码等敏感信息（Fernet 加密落盘）。在任意节点的字符串里用': 'Locally encrypt and store sensitive info such as passwords / API keys / database passwords (Fernet-encrypted on disk). In any node\u2019s string, use',
  '引用，运行时自动注入，工作流文件中不含明文。': 'to reference; injected automatically at runtime, with no plaintext in the workflow file.',
  '新增凭据': 'Add credential', '还没有凭据，点「新增凭据」创建': 'No credentials yet. Click "Add credential" to create one',
  '凭据名': 'Credential name', '凭据名 如 value/password/api_key': 'Credential name, e.g. value/password/api_key',
  '字段名 如 value/password/api_key': 'Field name, e.g. value/password/api_key',
  '字段（字段名 → 值；编辑时留空表示保留原值）': 'Fields (name \u2192 value; leave blank when editing to keep the original)',
  '添加字段': 'Add field', '用途备注': 'Purpose note', '说明（可选）': 'Description (optional)',
  '值': 'Value', '完成保存': 'Save',
  // —— 留存清理 ——
  '启用自动清理': 'Enable auto cleanup',
  '长期使用后运行录像与采集数据会占用磁盘。开启后按「保留天数」和「总大小上限」滚动清理（0 表示该维度不限制）。': 'Over time, run recordings and collected data consume disk space. When enabled, data is cleaned on a rolling basis by "retention days" and "total size limit" (0 means unlimited for that dimension).',
  // —— 邮件 ——
  '配置发送邮件模块的默认值，新建模块时将自动填充这些配置': 'Configure defaults for the Send Email module; new modules will auto-fill these',
  'SMTP服务器': 'SMTP server', 'SMTP端口': 'SMTP port', 'IMAP服务器': 'IMAP server', 'IMAP端口': 'IMAP port',
  'IMAP SSL端口通常为993': 'The IMAP SSL port is usually 993',
  '常用：QQ邮箱 imap.qq.com，163邮箱 imap.163.com，Gmail imap.gmail.com': 'Common: QQ Mail imap.qq.com, 163 Mail imap.163.com, Gmail imap.gmail.com',
  '邮箱账号': 'Email account', '邮箱密码/授权码': 'Email password / app code', '邮箱密码或授权码': 'Email password or app code',
  'QQ邮箱授权码': 'QQ Mail app code',
  'QQ邮箱、163邮箱等需要使用授权码，而非登录密码': 'QQ Mail, 163 Mail, etc. require an app code, not your login password',
  '默认发件人邮箱': 'Default sender email', '默认授权码': 'Default app code',
  '如：我的邮箱': 'e.g. My mailbox',
  // —— 飞书 ——
  '配置飞书自动化模块的默认值，新建飞书模块时将自动填充这些配置': 'Configure defaults for Feishu automation modules; new Feishu modules will auto-fill these',
  '如何获取飞书应用凭证': 'How to obtain Feishu app credentials',
  '飞书开放平台': 'Feishu Open Platform', '访问': 'Visit',
  '1. 创建飞书应用': '1. Create a Feishu app', '2. 获取凭证': '2. Get credentials', '3. 配置权限': '3. Configure permissions',
  '点击"创建企业自建应用"': 'Click "Create a custom app"',
  '填写应用名称和描述': 'Enter the app name and description',
  '进入应用详情页面': 'Open the app details page',
  '在"凭证与基础信息"中找到 App ID 和 App Secret': 'Find App ID and App Secret under "Credentials & Basic Info"',
  '在"权限管理"中添加所需权限': 'Add the required permissions under "Permission Management"',
  '电子表格：sheets:spreadsheet': 'Spreadsheet: sheets:spreadsheet',
  '多维表格：bitable:app': 'Bitable: bitable:app',
  '发布应用并等待管理员审核通过': 'Publish the app and wait for admin approval',
  '配置后，新建飞书模块时会自动填充 App ID 和 App Secret': 'Once configured, new Feishu modules auto-fill App ID and App Secret',
  '如果不同的飞书模块需要使用不同的应用，可以在模块中单独修改': 'If different Feishu modules need different apps, you can change it per module',
  '默认 App ID': 'Default App ID', '默认 App Secret': 'Default App Secret',
  '应用密钥': 'App Secret',
  '飞书应用的唯一标识，可在飞书开放平台的应用详情页面获取': 'The Feishu app\u2019s unique ID, available on the app details page of the Feishu Open Platform',
  '飞书应用的密钥，用于获取访问令牌，请妥善保管': 'The Feishu app secret, used to obtain access tokens; keep it safe',
})

Object.assign(UI_DICT, {
  // —— 安全 / 访问鉴权 ——
  '启用访问鉴权': 'Enable access auth',
  '后端默认监听局域网。开启鉴权后：': 'The backend listens on the LAN by default. When auth is enabled:',
  '关闭后局域网内任意设备可无凭据访问全部接口（不推荐）': 'When off, any device on the LAN can access all APIs without credentials (not recommended)',
  '本机访问免验': 'Local access bypasses auth',
  '访问令牌（仅本机可见）': 'Access token (visible on this machine only)',
  '访问令牌（远程访问需填写）': 'Access token (required for remote access)',
  '从其它设备访问 WebRPA 时，在该设备的「安全」里粘贴此令牌即可。': 'To access WebRPA from another device, paste this token in that device\u2019s "Security" section.',
  '令牌保存在本浏览器，后续请求会自动携带。': 'The token is stored in this browser and sent automatically with later requests.',
  '粘贴在主机「安全」里看到的 Token': 'Paste the token shown in the host\u2019s "Security" section',
  '主机地址': 'Host address', '立即刷新': 'Refresh now',
  // —— QQ ——
  '配置常用的 QQ 号和群号，在使用 QQ 自动化模块时可以快速选择': 'Configure common QQ accounts and group numbers for quick selection in QQ automation modules',
  '提示：添加常用的 QQ 号和群号后，在使用 QQ 自动化模块时可以从下拉列表中快速选择，无需每次手动输入': 'Tip: after adding common QQ accounts and group numbers, you can quickly pick them from a dropdown in QQ automation modules instead of typing each time',
  '常用联系人': 'Common contacts', '暂无常用联系人': 'No common contacts yet',
  '添加联系人': 'Add contact', '点击上方"添加联系人"按钮开始添加': 'Click the "Add contact" button above to start',
  '私聊': 'Private chat', '群聊': 'Group chat', '备注名称': 'Alias',
  // —— 触发器默认配置 ——
  '配置触发器模块的默认值，新建触发器模块时将自动填充这些配置': 'Configure defaults for trigger modules; new trigger modules will auto-fill these',
  '提示：这些配置会在新建对应触发器模块时自动填充，帮助您快速配置常用的触发器': 'Tip: these settings auto-fill when creating the matching trigger module, helping you set up common triggers quickly',
  'API触发器默认配置': 'API trigger defaults',
  'API轮询的默认间隔时间': 'Default polling interval for the API trigger',
  '邮件触发器默认配置': 'Email trigger defaults',
  '文件监控触发器默认配置': 'File-watch trigger defaults',
  '默认检查间隔（秒）': 'Default check interval (s)',
  '建议不低于30秒，避免频繁请求被邮件服务器限制': 'At least 30s recommended, to avoid being rate-limited by the mail server',
  '设置常用的监控路径，如下载文件夹等': 'Set common watch paths, such as the Downloads folder',
  '默认监控路径': 'Default watch paths',
  '设置常用的请求头，如认证token等，新建API触发器时会自动填充': 'Set common request headers (e.g. auth tokens); they auto-fill when creating API triggers',
  // —— 数据库默认 ——
  '配置数据库模块的默认连接信息，新建模块时将自动填充这些配置': 'Configure default DB connection info; new modules will auto-fill these',
  '数据库名': 'Database name', '数据库密码': 'Database password',
  '默认数据库名（可选）': 'Default database name (optional)',
  // —— AI 智能爬虫 / 元素选择器默认 ——
  '配置AI对话模块的默认值，新建模块时将自动填充这些配置': 'Configure defaults for AI Chat modules; new modules will auto-fill these',
  '配置AI智能爬虫和AI元素选择器模块的默认值，新建模块时将自动填充这些配置': 'Configure defaults for the AI Smart Crawler and AI Element Selector modules; new modules will auto-fill these',
  '这些配置将应用于 AI智能爬虫 和 AI元素选择器 模块': 'These settings apply to the AI Smart Crawler and AI Element Selector modules',
  '这些配置仅存储在本地浏览器中，不会上传到服务器': 'These settings are stored only in your local browser and never uploaded to a server',
  // —— 模型档案通用项 ——
  '阿里通义千问，中文友好': 'Alibaba Tongyi Qianwen, China-friendly',
  'Meta 开源模型，性能均衡': 'Meta open-source model, balanced performance',
  '免费，性能强': 'Free, strong performance', '免费，速度快': 'Free, fast', '免费，速度极快': 'Free, very fast',
  '性价比极高': 'Highly cost-effective', '性价比高，速度快': 'Cost-effective and fast',
  '性能更强': 'Stronger performance', '最强性能': 'Top performance',
  '按使用量付费': 'Pay as you go', '提供免费额度，适合测试': 'Free quota available, good for testing',
  '需要先安装并下载模型，完全免费': 'Requires installing and downloading the model first, completely free',
  '适用场景：': 'Use cases:', '重要提示：': 'Important:', '使用说明': 'Instructions',
  '我知道了': 'Got it', '或': 'or', '大': 'Large', '小': 'Small',
  '密码': 'Password', '端口': 'Port', '用户名': 'Username', '字符集': 'Charset',
  '重置全部': 'Reset all', '配置已保存': 'Settings saved', '添加': 'Add',
  '将窗口拖到屏幕左右边缘可自动收起，鼠标移到边缘即可重新唤出': 'Drag the window to the left or right screen edge to auto-hide it; move your mouse to the edge to bring it back',
  '知道了': 'Got it',
})

// ============================================================
// 精确整句翻译：WorkflowHubDialog（工作流仓库 / 发布 / 留言 / 远程协助）
// ============================================================
Object.assign(UI_DICT, {
  '浏览 · 发布 · 协作 · 远程协助': 'Browse · Publish · Collaborate · Remote assist',
  '关于工作流仓库': 'About Workflow Hub',
  '工作流仓库是一个公共平台，用户可以在这里分享和下载工作流。\n                    你也可以搭建自己的私有仓库服务器，只需将地址改为你的服务器地址即可。': 'Workflow Hub is a public platform where users can share and download workflows. You can also host your own private hub server \u2014 just change the address to your server.',
  '仓库服务器地址': 'Hub server address', '仓库设置': 'Hub settings', '保存设置': 'Save settings',
  '搜索工作流...': 'Search workflows...', '搜索社区模块...': 'Search community modules...', '搜索自定义模块...': 'Search custom modules...',
  '全部': 'All', '全部分类': 'All categories', '全部模块': 'All modules',
  '最新': 'Newest', '最热': 'Hottest', '最受欢迎': 'Most popular', '最新发布': 'Recently published',
  '下载最多': 'Most downloaded', '下载多': 'Most downloaded',
  '刷新列表': 'Refresh list', '暂无工作流': 'No workflows', '已加载全部工作流': 'All workflows loaded',
  '我发布的': 'My published', '我发布的工作流': 'My published workflows', '你还没有发布过工作流': 'You haven\u2019t published any workflows yet',
  '使用': 'Use', '举报': 'Report', '从社区删除': 'Delete from community', '删除此工作流': 'Delete this workflow',
  '下载到本地': 'Download to local', '导出 JSON': 'Export JSON',
  // —— 发布表单 ——
  '发布工作流': 'Publish workflow', '发布工作流到仓库': 'Publish workflow to the hub', '发布当前工作流': 'Publish current workflow',
  '发布到社区': 'Publish to community', '发布到在线社区，供他人下载': 'Publish to the online community for others to download',
  '分享你的工作流，帮助其他用户': 'Share your workflow to help other users',
  '工作流名称': 'Workflow name', '给你的工作流起个名字': 'Give your workflow a name',
  '功能描述': 'Description', '描述': 'Description', '描述一下这个工作流的功能和用途...': 'Describe this workflow\u2019s features and purpose...',
  '作者名称': 'Author name', '作者署名': 'Author name', '匿名': 'Anonymous', '留空则显示为匿名': 'Leave blank to show as anonymous',
  '分类': 'Category', '其他': 'Other', '版本号': 'Version', '使用说明': 'Instructions',
  '标签（用逗号分隔，最多5个）': 'Tags (comma-separated, up to 5)', '标签（逗号分隔，最多 8 个）': 'Tags (comma-separated, up to 8)',
  '例如：爬虫, 自动化, 签到': 'e.g. crawler, automation, check-in', '如：自动化, 数据': 'e.g. automation, data',
  '发布前请确保工作流中不包含敏感信息（如 API Key、密码等），系统会自动过滤部分敏感内容。': 'Before publishing, make sure the workflow has no sensitive info (API keys, passwords, etc.); the system auto-filters some sensitive content.',
  '确认发布': 'Confirm publish', '去发布': 'Go publish', '发布中...': 'Publishing...', '发布成功！': 'Published successfully!',
  '你的工作流已成功发布到仓库': 'Your workflow was published to the hub successfully',
  '更新工作流内容（可选）': 'Update workflow content (optional)', '不更新内容': 'Don\u2019t update content', '用当前工作流': 'Use current workflow',
  '上传 JSON 文件': 'Upload JSON file', '上传文件': 'Upload file', '点击上传工作流 JSON 文件': 'Click to upload a workflow JSON file',
  '点击或拖拽上传工作流 JSON 文件': 'Click or drag to upload a workflow JSON file', '支持 .json 格式，最大 1MB': 'Supports .json, max 1MB',
  '保存中...': 'Saving...', '保存修改': 'Save changes', '删除中...': 'Deleting...', '导入中...': 'Importing...', '生成中...': 'Generating...',
  // —— 分类标签 ——
  'AI应用': 'AI Apps', '图像处理': 'Image processing', '数据处理': 'Data processing', '数据采集': 'Data scraping',
  '工具': 'Tools', '监控': 'Monitoring', '爬虫': 'Crawler', '定时任务': 'Scheduled tasks',
})

Object.assign(UI_DICT, {
  // —— 留言板 / 评论 ——
  '在线社区': 'Online community', '发表留言': 'Post message',
  '昵称（可选）': 'Nickname (optional)', '显示名称': 'Display name',
  '写下你的留言...': 'Write your message...', '写下你的评论...': 'Write your comment...', '写下你的使用感受或建议…': 'Write your experience or suggestions\u2026',
  '暂无留言，来发表第一条吧！': 'No messages yet. Be the first to post!', '暂无评论，来发表第一条吧！': 'No comments yet. Be the first to post!',
  '已加载全部留言': 'All messages loaded', '已加载全部评论': 'All comments loaded', '加载更多...': 'Load more...',
  // —— 远程协助 ——
  '我需要帮助': 'I need help', '我来帮助他人': 'I\u2019ll help others', '正在协助': 'Assisting',
  '生成协助码': 'Generate assist code', '生成协助码，让他人远程帮助你': 'Generate an assist code so others can help you remotely',
  '你的协助码': 'Your assist code', '将此协助码发送给需要帮助你的人': 'Send this assist code to the person helping you',
  '输入6位协助码': 'Enter the 6-digit assist code', '断开连接': 'Disconnect', 'P2P 直连': 'P2P direct',
  '当前工作流：': 'Current workflow:', '当前ID:': 'Current ID:', '我的身份ID:': 'My identity ID:',
  '导入身份ID': 'Import identity ID', '从其他浏览器的"我的"页面复制身份ID，粘贴到这里即可同步身份': 'Copy the identity ID from the "My" page in another browser and paste it here to sync your identity',
  '提示：复制身份ID后，可在其他浏览器的设置中导入，以保持你的发布者身份': 'Tip: after copying your identity ID, import it in another browser\u2019s settings to keep your publisher identity',
  '粘贴其他浏览器的身份ID...': 'Paste an identity ID from another browser...',
  '• 协助码有效期为 5 分钟，过期需重新生成': '\u2022 The assist code is valid for 5 minutes; regenerate after it expires',
  '• 每个协助码只允许一人加入（一对一）': '\u2022 Each assist code allows only one person to join (one-to-one)',
  '• 连接后双方画布完全同步，任何操作都会实时同步': '\u2022 Once connected, both canvases are fully synced; every action syncs in real time',
  '• 双方都可以添加、删除、移动模块和连线': '\u2022 Both sides can add, delete and move modules and connections',
  '• 你可以随时断开连接结束协助': '\u2022 You can disconnect to end the assistance anytime',
  '• 使用 P2P 直连技术，数据直接在两端传输，延迟极低': '\u2022 Uses P2P direct connection; data transfers directly between both ends with very low latency',
  // —— 自定义模块仓库 ——
  '本地模块': 'Local modules',
  '如何创建自定义模块：': 'How to create a custom module:',
  '1. 在左侧模块栏切到「自定义模块」标签': '1. Switch to the "Custom Modules" tab in the left module bar',
  '2. 点击「创建自定义模块」，把一段工作流封装为模块': '2. Click "Create custom module" to wrap a workflow segment into a module',
  '3. 配置参数与输出，保存后即出现在这里': '3. Configure parameters and outputs; it appears here after saving',
  '4. 也可点上方「导入」加载他人分享的模块 JSON': '4. You can also click "Import" above to load a module JSON shared by others',
  '从 JSON 文件导入模块': 'Import a module from a JSON file', '导入': 'Import',
  '· 模块的内部工作流、参数、输出将一并发布到社区': '\u2022 The module\u2019s internal workflow, parameters and outputs will be published to the community together',
  '· 请勿包含账号密码等敏感信息': '\u2022 Do not include sensitive info such as accounts and passwords',
  '· 你可在「在线社区 - 我发布的」中删除自己发布的模块': '\u2022 You can delete your published modules under "Online Community - My Published"',
  '注意：': 'Note:', '重要提示：': 'Important:',
})

// ============================================================
// 精确整句翻译：config-panels/AdvancedModuleConfigs（高级模块配置）
// ============================================================
Object.assign(UI_DICT, {
  '* 表示所有子元素，或指定如 div, .class 等': '* means all child elements, or specify e.g. div, .class',
  '0.25x (慢速)': '0.25x (slow)', '1x (原速)': '1x (normal)', '2x (快速)': '2x (fast)', '5x (极速)': '5x (very fast)',
  'API请求通常是网页与服务器的数据交互': 'API requests are usually data exchanges between the page and server',
  'Backspace 退格': 'Backspace', 'Delete 删除': 'Delete', 'Enter 回车': 'Enter', 'Escape 退出': 'Escape',
  'Space 空格': 'Space', 'Tab 制表符': 'Tab',
  'C:\\path\\to\\file.jpg，支持 {变量名}': 'C:\\path\\to\\file.jpg, supports {variable}',
  'MuMu模拟器：设置 → WiFi → 长按已连接网络 → 修改网络 → 高级选项 → 代理 → 手动': 'MuMu emulator: Settings \u2192 WiFi \u2192 long-press the connected network \u2192 Modify network \u2192 Advanced \u2192 Proxy \u2192 Manual',
  'TXT 文本': 'TXT text', 'URL匹配模式': 'URL match pattern', 'URL匹配模式（可选）': 'URL match pattern (optional)',
  'X 坐标': 'X coordinate', 'Y 坐标': 'Y coordinate', 'X坐标变量名': 'X coordinate variable', 'Y坐标变量名': 'Y coordinate variable',
  'first: 捕获到第一个就返回；all: 等待超时后返回所有匹配的': 'first: return on the first capture; all: return all matches after timeout',
  'first模式: 存储单个请求对象；all模式: 存储请求列表': 'first mode: store a single request object; all mode: store a request list',
  'https://example.com/file.zip，支持 {变量名}': 'https://example.com/file.zip, supports {variable}',
  'recipient@example.com，支持 {变量名}': 'recipient@example.com, supports {variable}',
  'your@qq.com，支持 {变量名}': 'your@qq.com, supports {variable}',
  '• 可用于判断界面状态、按钮是否出现等场景': '\u2022 Useful for checking UI state, whether a button appeared, etc.',
  '• 图像存在时执行"真"分支，不存在时执行"假"分支': '\u2022 Runs the "true" branch when the image exists, the "false" branch when it does not',
  '• 此模块类似条件判断，有两个分支输出点': '\u2022 This module is like a condition, with two branch outputs',
  '← 左': '\u2190 Left', '↑ 上': '\u2191 Up', '→ 右': '\u2192 Right', '↓ 下': '\u2193 Down',
  '⏹️ 停止录制 (F10)': '\u23f9\ufe0f Stop recording (F10)',
  '上移': 'Move up', '下移': 'Move down', '下拉框': 'Dropdown', '下载URL': 'Download URL', '下载方式': 'Download method',
  '中心': 'Center', '中键': 'Middle button',
  '仅API请求（fetch/xhr）': 'API requests only (fetch/xhr)', '仅m3u8（视频流）': 'm3u8 only (video stream)',
  '仅图片': 'Images only', '仅媒体（视频/音频）': 'Media only (video/audio)', '仅滚轮': 'Wheel only',
  '仅点击': 'Click only', '仅移动': 'Move only',
  '从查找控件模块获取，支持 {变量名}': 'Obtained from the Find Control module, supports {variable}',
  '从源位置移动到目标位置的时间': 'Time to move from source to target',
  '从起点长按鼠标拖拽到终点，适用于拖放操作、滑块验证等场景': 'Long-press and drag the mouse from start to end; good for drag-and-drop and slider captchas',
  '从连接应用模块获取，支持 {变量名}': 'Obtained from the Connect App module, supports {variable}',
  '代理抓包（模拟器/手机）': 'Proxy capture (emulator/phone)', '代理端口': 'Proxy port', '代理配置说明': 'Proxy setup notes',
  '休眠': 'Sleep', '关机': 'Shut down', '注销': 'Sign out', '重启': 'Restart', '还原': 'Restore',
})

Object.assign(UI_DICT, {
  '使用 * 获取所有直接子元素，或指定标签/类名进行过滤': 'Use * to get all direct children, or specify a tag/class to filter',
  '使用 + 连接多个按键，支持: ctrl, alt, shift, win + 任意按键': 'Join multiple keys with +; supports ctrl, alt, shift, win + any key',
  '使用 + 连接组合键，如 Ctrl+C': 'Join key combos with +, e.g. Ctrl+C',
  '使用OCR技术识别图片验证码中的文字': 'Use OCR to recognize text in an image captcha',
  '使用场景': 'Use case', '使用说明：': 'Instructions:',
  '使用相对位置（从当前鼠标位置开始）': 'Use relative position (from the current mouse position)',
  '使用系统级键盘输入，适用于需要真实键盘事件的场景': 'Use system-level keyboard input, for scenarios needing real keyboard events',
  '使用系统级鼠标滚轮模拟，适用于需要真实滚动事件的场景': 'Use system-level mouse-wheel simulation, for scenarios needing real scroll events',
  '使用系统级鼠标点击，适用于需要真实点击事件的场景': 'Use system-level mouse clicks, for scenarios needing real click events',
  '保存导出文件的路径': 'Path to save the exported file', '保存文件路径的变量名': 'Variable for the saved file path',
  '保存新文件路径的变量名': 'Variable for the new file path', '保存目录（可选）': 'Save directory (optional)',
  '保存路径': 'Save path', '保存路径（可选）': 'Save path (optional)',
  '修饰键': 'Modifier key', '值越高匹配越精确，但可能找不到': 'Higher value matches more precisely but may find nothing',
  '停止监听后，该监听器将被销毁，无法再次使用': 'After stopping, the listener is destroyed and cannot be reused',
  '停止监听时，可将所有捕获的请求存储到变量中': 'When stopping, you can store all captured requests in a variable',
  '允许上传、创建文件夹、删除操作': 'Allow upload, create folder and delete operations',
  '元素不存在或不可见时走 false 分支': 'Takes the false branch when the element is missing or invisible',
  '元素不存在时走 false 分支': 'Takes the false branch when the element does not exist',
  '元素存在且可见时走 true 分支': 'Takes the true branch when the element exists and is visible',
  '元素存在判断': 'Element-exists check', '元素存在时走 true 分支': 'Takes the true branch when the element exists',
  '兄弟元素类型': 'Sibling element type', '全局系统抓包': 'Global system capture', '全屏': 'Fullscreen', '全屏识别': 'Fullscreen recognition',
  '全部请求': 'All requests', '共享名称（可选）': 'Share name (optional)', '共享文件夹': 'Shared folder',
  '共享文件夹路径': 'Shared folder path', '共享文件路径': 'Shared file path', '共享端口': 'Share port',
  '关键词过滤（可选）': 'Keyword filter (optional)', '关闭模式': 'Close mode', '内容类型': 'Content type', '出现次序': 'Order of appearance',
  '分组': 'Group', '列表': 'List', '列表项': 'List item', '删除所有移动': 'Delete all moves',
  '判断指定元素是否在页面中可见（不仅存在，还要显示出来），返回 true/false 分支': 'Check whether the element is visible on the page (not just present, but shown), returning true/false branches',
  '判断指定元素是否存在于页面中，返回 true/false 分支，可用于条件判断流程': 'Check whether the element exists on the page, returning true/false branches for conditional flows',
  '前缀匹配': 'Prefix match', '前缀：标题以关键词开头': 'Prefix: title starts with the keyword', '前面的兄弟元素': 'Preceding sibling',
  '功能键': 'Function key', '勾选': 'Check', '取消勾选': 'Uncheck', '包含': 'Contains', '包含内容': 'Contains content',
  '包含匹配': 'Contains match', '包含执行耗时': 'Include execution time', '包含日志级别': 'Include log level',
  '包含时间戳': 'Include timestamp', '包含自身': 'Include self', '包含（模糊匹配）': 'Contains (fuzzy match)',
  '包含：标题中包含关键词即可匹配': 'Contains: matches if the title contains the keyword',
  '匹配模式': 'Match mode', '匹配精度': 'Match precision', '单个按键': 'Single key', '单击': 'Single click',
  '单选按钮': 'Radio button', '双击': 'Double click', '复选框': 'Checkbox', '发件人邮箱': 'Sender email',
  '只捕获URL中包含此关键词的请求，留空则捕获所有符合类型的请求': 'Only capture requests whose URL contains this keyword; leave blank to capture all of the matching type',
  '可以同时启动多个监听器，使用不同的ID区分': 'You can run multiple listeners at once, distinguished by different IDs',
  '可以连接不同的后续模块实现条件判断': 'Connect different downstream modules for conditional logic',
  '可用于判断弹窗、提示信息等动态元素': 'Useful for checking dynamic elements like dialogs and tooltips',
  '可视化选择': 'Visual pick', '可视区域': 'Visible area',
  '右上角': 'Top-right', '右下角': 'Bottom-right', '右下角坐标': 'Bottom-right coordinate', '右侧': 'Right', '右键': 'Right button',
  '后面的兄弟元素': 'Following sibling', '向上': 'Up', '向下': 'Down', '向右': 'Right', '向左': 'Left',
})

Object.assign(UI_DICT, {
  '启动参数（可选）': 'Launch arguments (optional)', '命令': 'Command', '命令行参数，支持 {变量名}': 'Command-line arguments, supports {variable}',
  '图像路径': 'Image path', '图片': 'Image', '图片路径': 'Image path',
  '在打开网页前启动监听，可捕获页面加载时的API请求': 'Start listening before opening the page to capture API requests during page load',
  '在指定时间内查找图像': 'Find an image within the given time',
  '如: /api/user，支持 {\'{变量名}\'}': 'e.g. /api/user, supports {variable}',
  '如: /api/，支持 {\'{变量名}\'}': 'e.g. /api/, supports {variable}',
  '如: 80,443,8080 多个用逗号分隔': 'e.g. 80,443,8080, separate multiple with commas',
  '如: Enter, Ctrl+A, Ctrl+Shift+S': 'e.g. Enter, Ctrl+A, Ctrl+Shift+S',
  '如: chrome.exe，支持模糊匹配': 'e.g. chrome.exe, supports fuzzy match',
  '如: ctrl+c, ctrl+shift+s, alt+f4，支持 {变量名}': 'e.g. ctrl+c, ctrl+shift+s, alt+f4, supports {variable}',
  '如: f6, a, enter, space，支持 {变量名}': 'e.g. f6, a, enter, space, supports {variable}',
  '如: {Ctrl}s, {Enter}，支持 {变量名}': 'e.g. {Ctrl}s, {Enter}, supports {variable}',
  '如: 文件->打开，支持 {变量名}': 'e.g. File->Open, supports {variable}',
  '如: 记事本 / Edge / 微信，发送前先激活该窗口到前台': 'e.g. Notepad / Edge / WeChat; bring this window to the foreground before sending',
  '始终置顶': 'Always on top', '子元素过滤器（可选）': 'Child filter (optional)', '字母键': 'Letter key', '字符': 'Character',
  '存储X坐标的变量名': 'Variable for the X coordinate', '存储Y坐标的变量名': 'Variable for the Y coordinate',
  '存储信息到变量': 'Store info to a variable', '存储兄弟元素选择器列表的变量名': 'Variable for the sibling-selector list',
  '存储到变量': 'Store to variable', '存储剪贴板内容的变量名': 'Variable for the clipboard content',
  '存储命令输出的变量名': 'Variable for the command output', '存储子元素选择器列表的变量名': 'Variable for the child-selector list',
  '存储完整控件树结构': 'Store the full control-tree structure', '存储所有捕获请求的变量名': 'Variable for all captured requests',
  '存储所有请求到变量（可选）': 'Store all requests to a variable (optional)', '存储捕获结果的变量名': 'Variable for the capture result',
  '存储控件信息到变量': 'Store control info to a variable', '存储控件句柄等信息': 'Store control handle and info',
  '存储控件树到变量': 'Store the control tree to a variable', '存储控件详细信息': 'Store control details',
  '存储文本到变量': 'Store text to a variable', '存储新路径到变量': 'Store the new path to a variable',
  '存储窗口句柄等信息': 'Store window handle and info', '存储结果到变量': 'Store the result to a variable',
  '存储获取的文本': 'Store the retrieved text', '存储识别出的验证码': 'Store the recognized captcha',
  '存储识别结果到变量': 'Store the recognition result to a variable', '存储请求信息的变量名': 'Variable for the request info',
  '存储路径到变量': 'Store the path to a variable', '存储输出到变量': 'Store the output to a variable',
  '存储连接信息到变量': 'Store the connection info to a variable',
  '完整路径如 C:\\images\\pic.png': 'Full path, e.g. C:\\images\\pic.png',
  '宏录制器': 'Macro recorder', '宽度（像素）': 'Width (px)', '导出格式': 'Export format',
  '将匹配的窗口置顶到最前面并激活': 'Bring the matching window to front and activate it',
  '将指定文件共享到局域网，同网络的设备可通过浏览器下载此文件': 'Share a file to the LAN; devices on the same network can download it via a browser',
  '将指定文件夹共享到局域网，同网络的设备可通过浏览器访问、下载、上传文件': 'Share a folder to the LAN; devices on the same network can access, download and upload files via a browser',
  '将源元素拖拽到目标元素位置': 'Drag the source element to the target element',
  '将电脑屏幕实时共享到局域网，同网络的设备可通过浏览器观看屏幕画面': 'Share your screen to the LAN in real time; devices on the same network can watch via a browser',
  '工具栏': 'Toolbar', '左上角': 'Top-left', '左上角坐标': 'Top-left coordinate', '左下角': 'Bottom-left', '左侧': 'Left', '左键': 'Left button',
  '帧率 (FPS)': 'Frame rate (FPS)', '帧率越高画面越流畅，但带宽占用越大。推荐 15-30 FPS': 'Higher frame rate is smoother but uses more bandwidth. 15-30 FPS recommended',
  '常用键': 'Common keys', '应用程序路径': 'Application path', '底部': 'Bottom', '延迟时间 (秒)': 'Delay (s)',
  '建议使用 8080-9000 范围的端口，避免与其他服务冲突': 'Use a port in 8080-9000 to avoid conflicts with other services',
  '建议使用 9000-9100 范围的端口，避免与文件共享冲突': 'Use a port in 9000-9100 to avoid conflicts with file sharing',
  '开启后，访问者可以上传文件、创建文件夹、删除文件/文件夹': 'When enabled, visitors can upload files, create folders and delete files/folders',
  '开始': 'Start', '开始录制 (F9)': 'Start recording (F9)', '强制关闭': 'Force close', '强制执行（不等待程序关闭）': 'Force (do not wait for the program to close)',
})

Object.assign(UI_DICT, {
  '录制中...': 'Recording...', '录制完成后按': 'When done recording, press', '录制数据': 'Recorded data', '录制选项': 'Recording options',
  '录制鼠标和键盘操作，播放时会按照录制的顺序和时间间隔执行。点击"编辑"可手动修改、添加、删除操作。': 'Record mouse and keyboard actions; on playback they run in the recorded order and timing. Click "Edit" to manually modify, add or delete actions.',
  '必须与"开始网络监听"中的ID一致': 'Must match the ID in "Start network listening"',
  '悬停位置': 'Hover position', '悬停在第几个匹配的文本上（从1开始）': 'Which matched text to hover (starting from 1)', '悬停时长(秒)': 'Hover duration (s)',
  '或点击下方按钮停止录制': 'Or click the button below to stop recording', '截图区域': 'Screenshot area', '截图类型': 'Screenshot type',
  '所有兄弟元素': 'All siblings', '所有匹配的请求': 'All matching requests',
  '执行后会显示局域网访问地址（如 http://192.168.x.x:端口），同局域网设备可用浏览器实时观看屏幕画面。\n          共享服务会持续运行直到工作流结束或手动停止。': 'After running, a LAN address (e.g. http://192.168.x.x:port) is shown; devices on the same LAN can watch the screen in real time via a browser. The share keeps running until the workflow ends or you stop it manually.',
  '执行后会显示真实的局域网访问地址（如 http://192.168.x.x:端口），同局域网设备可用浏览器访问。\n          共享服务会持续运行直到工作流结束或手动停止。': 'After running, the real LAN address (e.g. http://192.168.x.x:port) is shown; devices on the same LAN can access it via a browser. The share keeps running until the workflow ends or you stop it manually.',
  '执行后会返回屏幕共享的访问地址': 'After running, returns the screen-share access address',
  '执行后会返回真实的共享访问地址': 'After running, returns the real share access address',
  '执行此模块将立即锁定Windows屏幕，相当于按 Win+L': 'This module instantly locks the Windows screen, equivalent to pressing Win+L',
  '执行环境': 'Execution environment', '抓包时长(秒)': 'Capture duration (s)', '抓包模式': 'Capture mode',
  '拖拽到图像': 'Drag to image', '拖拽到坐标': 'Drag to coordinate', '拖拽持续时间(秒)': 'Drag duration (s)', '拖拽时长(秒)': 'Drag duration (s)',
  '拖拽过程的持续时间，值越大移动越慢': 'Duration of the drag; larger values move more slowly',
  '拾取中...': 'Picking...', '拾取坐标': 'Pick coordinate', '指定元素': 'Specified element', '按': 'Press',
  '按下（取消勾选为释放）': 'Press (uncheck to release)', '按住 Ctrl + 点击 捕获控件，按 ESC 退出选择模式': 'Hold Ctrl + click to capture a control; press ESC to exit selection mode',
  '按住鼠标的持续时间': 'How long to hold the mouse', '按值': 'By value', '按名称': 'By name', '按文本': 'By text', '按索引': 'By index',
  '按钮': 'Button', '按键': 'Key', '按键名称': 'Key name', '按键序列': 'Key sequence', '按键延迟(秒)': 'Key delay (s)',
  '按键模式': 'Key mode', '按键输入方式': 'Key input method', '按键间隔(秒)': 'Key interval (s)',
  '捕获后停止监听': 'Stop listening after capture', '捕获模式': 'Capture mode', '授权码': 'App code',
  '控件信息': 'Control info', '控件名称': 'Control name', '控件显示的文本，支持 {变量名}': 'The control\u2019s displayed text, supports {variable}',
  '控件的AutomationId，支持 {变量名}': 'The control\u2019s AutomationId, supports {variable}', '控件的ClassName，支持 {变量名}': 'The control\u2019s ClassName, supports {variable}',
  '控件类型': 'Control type', '搜索值': 'Search value', '搜索深度': 'Search depth', '播放选项': 'Playback options', '播放速度': 'Playback speed',
  '播放键盘操作': 'Play keyboard actions', '播放鼠标点击': 'Play mouse clicks', '播放鼠标移动轨迹': 'Play mouse movement track',
  '操作': 'Action', '操作类型': 'Action type',
  '支持: a-z, 0-9, f1-f12, enter, tab, escape, backspace, delete, space, up, down, left, right, home, end, pageup, pagedown, ctrl, alt, shift, win': 'Supports: a-z, 0-9, f1-f12, enter, tab, escape, backspace, delete, space, up, down, left, right, home, end, pageup, pagedown, ctrl, alt, shift, win',
  '收件人邮箱': 'Recipient email', '数字键': 'Number key', '数据表格': 'Data table', '整个页面': 'Whole page',
  '文件名（可选）': 'File name (optional)', '文件路径': 'File path', '文本': 'Text', '文本内容': 'Text content',
  '新文件名': 'New file name', '新的文件名（含扩展名），支持 {变量名}': 'New file name (with extension), supports {variable}',
  '方向键': 'Arrow key', '时间 (ms)': 'Time (ms)', '显示在浏览器页面上的名称': 'Name shown on the browser page',
  '暂无录制数据，点击下方按钮开始录制或手动添加': 'No recorded data yet; click the button below to start recording or add manually',
  '暂无操作，点击"添加"按钮添加新操作': 'No actions yet; click "Add" to add a new action',
  '最大化': 'Maximize', '最小化': 'Minimize', '最大深度': 'Max depth', '标签页': 'Tab', '标签页项': 'Tab item', '树': 'Tree', '树项': 'Tree item',
})

Object.assign(UI_DICT, {
  '模拟人工滑动滑块验证码': 'Simulate a human sliding a slider captcha', '模拟按键': 'Simulate key press', '模拟鼠标移动': 'Simulate mouse movement',
  '横向偏移量 (像素)': 'Horizontal offset (px)', '纵向偏移量 (像素)': 'Vertical offset (px)',
  '正值向下偏移，负值向上偏移': 'Positive offsets down, negative offsets up', '正值向右偏移，负值向左偏移': 'Positive offsets right, negative offsets left',
  '正则匹配': 'Regex match', '正则表达式': 'Regular expression', '正常关闭': 'Normal close',
  '此模块已移除': 'This module has been removed', '此模块已移除，请使用"获取控件信息"模块': 'This module has been removed; use the "Get control info" module',
  '此模块已移除，请使用"获取控件树"模块': 'This module has been removed; use the "Get control tree" module',
  '此模块已移除，请使用"输入文本到控件"模块': 'This module has been removed; use the "Type text into control" module',
  '此模块已移除，请在"启动桌面应用"中勾选"等待应用就绪"': 'This module has been removed; check "Wait for app ready" in "Launch desktop app"',
  '每次滚动格数': 'Notches per scroll', '比"元素存在判断"更严格，要求元素实际显示': 'Stricter than "Element-exists check"; requires the element to be actually shown',
  '浏览器抓包': 'Browser capture', '添加新操作': 'Add new action', '源图像拖拽位置': 'Source image drag position', '源图像路径': 'Source image path',
  '源文件路径': 'Source file path', '滑动像素距离，支持 {变量名}': 'Slide distance in pixels, supports {variable}', '滑动距离': 'Slide distance', '滑块': 'Slider',
  '滚动容器选择器（可选）': 'Scroll container selector (optional)', '滚动方向': 'Scroll direction', '滚动条': 'Scrollbar', '滚动模式': 'Scroll mode',
  '滚动次数': 'Scroll count', '滚动距离 (像素)': 'Scroll distance (px)', '滚动量（正数向上，负数向下）': 'Scroll amount (positive up, negative down)', '滚动间隔(秒)': 'Scroll interval (s)',
  '点击"开始录制"或按': 'Click "Start recording" or press', '点击位置': 'Click position', '点击坐标': 'Click coordinate', '点击按钮': 'Click button',
  '点击第几个匹配的文本（从1开始）': 'Which matched text to click (starting from 1)', '点击类型': 'Click type', '点击触发下载': 'Click to trigger download',
  '点击（按下后立即释放）': 'Click (press then release immediately)',
  '用于标识监听器，后续等待/停止时需要使用相同ID': 'Identifies the listener; use the same ID for later wait/stop',
  '画质 (%)': 'Quality (%)', '画质越高越清晰，但带宽占用越大。推荐 50-80%': 'Higher quality is clearer but uses more bandwidth. 50-80% recommended',
  '留空则使用原文件名，支持 {变量名}': 'Leave blank to keep the original file name, supports {variable}',
  '留空则保存到默认目录': 'Leave blank to save to the default directory', '留空则滚动整个页面，支持 {变量名}': 'Leave blank to scroll the whole page, supports {variable}',
  '留空则监控所有端口，常用: 80(HTTP), 443(HTTPS)': 'Leave blank to monitor all ports; common: 80 (HTTP), 443 (HTTPS)',
  '留空则监控所有进程': 'Leave blank to monitor all processes', '留空则自动生成文件名': 'Leave blank to auto-generate the file name', '留空则自动生成，支持 {变量名}': 'Leave blank to auto-generate, supports {variable}',
  '监听器ID': 'Listener ID', '监听器会持续运行，直到使用"停止网络监听"或"等待API请求"停止': 'The listener keeps running until stopped by "Stop network listening" or "Wait for API request"',
  '监听器唯一标识，默认: default': 'Unique listener ID, default: default',
  '目前支持QQ邮箱，需要在邮箱设置中开启SMTP服务并获取授权码': 'Currently supports QQ Mail; enable SMTP in the mailbox settings and get an app code',
  '目标位置': 'Target position', '目标图像放置位置': 'Where to place the target image', '目标图像路径': 'Target image path', '目标坐标': 'Target coordinate',
  '目标文本': 'Target text', '目标窗口标题（可选）': 'Target window title (optional)', '目标端口（可选）': 'Target port (optional)', '目标类型': 'Target type', '目标进程名（可选）': 'Target process name (optional)',
  '直接URL下载': 'Direct URL download', '直接设置（推荐）': 'Set directly (recommended)', '睡眠': 'Sleep',
  '硬件按键只会进入当前前台窗口。填写后会在发送前把标题包含该文字的窗口激活到前台，\n          避免按键被打进 WebRPA 自己的窗口。留空则发往当前前台窗口。': 'Hardware key events only reach the current foreground window. When set, the window whose title contains this text is brought to the foreground before sending, to avoid typing into WebRPA\u2019s own window. Leave blank to send to the current foreground window.',
  '移动时长(秒)': 'Move duration (s)', '窗口': 'Window', '窗口句柄': 'Window handle', '窗口标题': 'Window title',
  '窗口标题或进程名，支持 {变量名}': 'Window title or process name, supports {variable}', '窗口状态': 'Window state',
})

Object.assign(UI_DICT, {
  '第一个匹配的请求': 'First matching request', '等待URL中包含此关键词的请求，必填': 'Wait for a request whose URL contains this keyword (required)',
  '等待出现': 'Wait until appears', '等待应用就绪': 'Wait for app ready', '等待搜索接口返回，获取结果数据': 'Wait for the search API to return and get the result data',
  '等待消失': 'Wait until disappears', '等待登录接口返回，获取token': 'Wait for the login API to return and get the token',
  '等待视频播放接口，获取真实播放地址': 'Wait for the video playback API and get the real playback URL',
  '等待超时 (秒)': 'Wait timeout (s)', '等待超时（秒）': 'Wait timeout (s)', '等待超过此时间未捕获到请求则失败': 'Fails if no request is captured within this time',
  '类名（可选）': 'Class name (optional)', '精确匹配': 'Exact match', '精确：标题必须完全一致': 'Exact: the title must match exactly',
  '组合键': 'Key combo', '终点坐标': 'End coordinate', '结束坐标 (右下角)': 'End coordinate (bottom-right)', '结果变量名': 'Result variable', '结果变量名（可选）': 'Result variable (optional)',
  '编辑宏操作': 'Edit macro action', '编辑操作': 'Edit action', '缩放比例 (%)': 'Scale (%)', '脚本滚动': 'Script scroll',
  '自动化ID（可选）': 'Automation ID (optional)', '自动检测': 'Auto-detect', '自动（优先滚轮）': 'Auto (prefer wheel)', '自定义': 'Custom', '自定义区域': 'Custom area',
  '获取当前鼠标在屏幕上的位置坐标': 'Get the current mouse position on screen',
  '获取指定元素的同级兄弟元素选择器，以列表形式存储': 'Get the sibling-element selectors of the given element and store as a list',
  '获取父元素下的所有子元素选择器，以列表形式存储': 'Get all child-element selectors under the parent and store as a list',
  '获取系统剪贴板中的文本内容': 'Get the text content from the system clipboard',
  '菜单': 'Menu', '菜单路径': 'Menu path', '菜单项': 'Menu item', '虚拟键码': 'Virtual key code',
  '要复制到剪贴板的文本，支持 {变量名}': 'Text to copy to the clipboard, supports {variable}', '要悬停的文本内容': 'Text to hover over',
  '要执行的命令，支持 {变量名}': 'Command to run, supports {variable}', '要点击的文本内容': 'Text to click',
  '要输入的文本，支持 {变量名}': 'Text to type, supports {variable}', '要选择的值，支持 {变量名}': 'Value to select, supports {variable}', '要重命名的文件路径': 'Path of the file to rename',
  '设为0则瞬间移动，大于0则平滑移动': 'Set to 0 for instant move, greater than 0 for smooth move', '识别模式': 'Recognition mode',
  '请确保已保存所有工作，此操作将影响整个系统': 'Make sure all work is saved; this affects the entire system',
  '起始坐标 (左上角)': 'Start coordinate (top-left)', '起点坐标': 'Start coordinate', '超时时间 (秒)': 'Timeout (s)', '超时时间（毫秒）': 'Timeout (ms)', '超时时间（秒）': 'Timeout (s)', '超链接': 'Hyperlink',
  '输入前清空': 'Clear before typing', '输入字符': 'Type characters', '输入文本': 'Type text', '输入方式': 'Input method', '输入框': 'Input box',
  '输入窗口标题，支持 {变量名}': 'Enter the window title, supports {variable}', '输入类型': 'Input type',
  '输入要停止的共享服务端口号': 'Enter the share-service port to stop', '输入要停止的屏幕共享服务端口号': 'Enter the screen-share-service port to stop', '输出路径': 'Output path',
  '过滤类型': 'Filter type', '进程名': 'Process name', '连接方式': 'Connection method', '选择中...': 'Selecting...', '选择值': 'Select value',
  '选择共享文件': 'Choose shared file', '选择共享文件夹': 'Choose shared folder', '选择按键': 'Choose key', '选择方式': 'Selection method',
  '选择要共享的文件': 'Choose a file to share', '选择要共享的文件夹': 'Choose a folder to share', '选项名称或索引，支持 {变量名}': 'Option name or index, supports {variable}',
  '通过左上角和右下角两点确定搜索区域': 'Define the search area by the top-left and bottom-right points',
  '邮件主题': 'Email subject', '邮件内容': 'Email content', '邮件标题，支持 {变量名}': 'Email subject, supports {variable}', '邮件正文，支持 {变量名}': 'Email body, supports {variable}',
  '邮箱SMTP授权码，支持 {变量名}': 'Mailbox SMTP app code, supports {variable}', '重复次数': 'Repeat count', '重排时间': 'Reflow time',
  '长按': 'Long press', '长按时长(秒)': 'Long-press duration (s)',
  '降低缩放可显著减少带宽占用。100% 为原始分辨率': 'Lowering the scale greatly reduces bandwidth. 100% is the original resolution',
  '限定区域可提高识别速度': 'Limiting the area speeds up recognition', '限定区域识别': 'Recognize within a region', '限定搜索区域': 'Limit search area',
  '随机位置': 'Random position', '随机位置（绕过AI检测）': 'Random position (bypass AI detection)', '面板': 'Panel', '顶部': 'Top',
  '预设按键': 'Preset key', '首次使用需要在模拟器/手机浏览器访问 mitm.it 安装证书以支持HTTPS抓包': 'On first use, visit mitm.it in the emulator/phone browser to install the certificate for HTTPS capture',
  '高度（像素）': 'Height (px)', '鼠标按键': 'Mouse button', '鼠标滚轮': 'Mouse wheel', '鼠标点击': 'Mouse click', '鼠标移动': 'Mouse move', '鼠标轨迹': 'Mouse track',
  '👁️ 元素可见判断': '\ud83d\udc41\ufe0f Element-visible check',
  '🖱️ 在屏幕上查找源图像，长按并拖拽到目标图像或指定坐标': '\ud83d\uddb1\ufe0f Find the source image on screen, long-press and drag it to the target image or a coordinate',
  '🛑 停止指定端口上运行的屏幕共享服务': '\ud83d\uded1 Stop the screen-share service running on the given port',
  '🛑 停止指定端口上运行的文件共享服务': '\ud83d\uded1 Stop the file-share service running on the given port',
})

// ============================================================
// 精确整句翻译：config-panels/BasicModuleConfigs（基础模块配置）
// ============================================================
Object.assign(UI_DICT, {
  '# 编写Python代码': '# Write Python code',
  "' 转换后将删除分组框，改为函数头节点形式'": "' After conversion, the group box is removed and replaced by a function-header node'",
  "'仅在屏幕的指定区域内查找图片'": "'Find the image only within the specified screen region'",
  "'使用'": "'Use'", "'通过'": "'Via'", "'默认选中'": "'Selected by default'",
  "'使用系统TTS引擎朗读文本，支持多种语言'": "'Read text aloud using the system TTS engine; supports multiple languages'",
  "'函数的返回值将存储到结果变量'": "'The function\u2019s return value is stored in the result variable'",
  "'刷新当前页面并等待加载完成'": "'Refresh the current page and wait for it to load'",
  "'前进到下一个页面'": "'Go forward to the next page'", "'返回到上一个页面'": "'Go back to the previous page'",
  "'匹配包含此文本的URL'": "'Match URLs containing this text'",
  "'图片匹配的相似度阈值，越高越精确'": "'Image-match similarity threshold; higher is more precise'",
  "'图片显示的时长，单位秒'": "'How long the image is shown, in seconds'",
  "'在执行日志中打印信息，支持变量引用'": "'Print a message to the execution log; supports variable references'",
  "'在新窗口中查看图片，支持本地文件和网络URL'": "'View the image in a new window; supports local files and web URLs'",
  "'子流程的唯一标识名称，用于调用时引用'": "'Unique name of the subflow, referenced when calling it'",
  "'定义一个矩形区域，仅在此区域内查找图片'": "'Define a rectangular region and search for the image only within it'",
  "'将此分组标记为可复用的子流程'": "'Mark this group as a reusable subflow'",
  "'找到图片后，将其中心点坐标存储到指定变量'": "'After finding the image, store its center coordinates in the given variable'",
  "'播放系统提示音，可用于提醒用户'": "'Play a system beep to alert the user'",
  "'播放视频文件，支持本地文件和网络URL'": "'Play a video file; supports local files and web URLs'",
  "'播放音频文件，支持本地文件和网络URL'": "'Play an audio file; supports local files and web URLs'",
  "'标签页的索引位置，从0开始'": "'Tab index, starting from 0'",
  "'每次检查图片的时间间隔'": "'Interval between image checks'",
  "'用于组织和标记相关的模块，不影响执行逻辑'": "'Organizes and labels related modules; does not affect execution'",
  "'用逗号分隔多个选项'": "'Separate multiple options with commas'",
  "'访问工作流变量'": "'Access workflow variables'", "'转换为函数头形式'": "'Convert to function-header form'",
  "'返回数据到工作流'": "'Return data to the workflow'",
  "- '确认框'": "- 'Confirm box'", "- '警告框'": "- 'Alert box'", "- '输入框'": "- 'Input box'", "- '页面离开确认'": "- 'Page-leave confirm'",
  '0表示成功，非0表示失败': '0 means success, non-zero means failure',
  'CSS选择器，用于定位iframe元素': 'CSS selector to locate the iframe element',
  'DOM加载完成': 'DOM loaded', 'Excel文件路径': 'Excel file path', 'HTML内容': 'HTML content', 'JavaScript代码': 'JavaScript code',
  'Python代码': 'Python code', 'Python环境': 'Python environment', 'Python脚本文件路径 (.py)': 'Python script file path (.py)', 'Python解释器路径': 'Python interpreter path',
  'URL关键词': 'URL keyword', 'URL匹配': 'URL match', 'X坐标变量名': 'X coordinate variable', 'Y坐标变量名': 'Y coordinate variable',
  'domcontentloaded: 等待DOM结构加载完成': 'domcontentloaded: wait until the DOM structure has loaded',
  'iframe元素的name或id属性值': 'The name or id attribute of the iframe element', 'iframe名称/ID': 'iframe name/ID',
  'iframe的name或id属性值': 'The name or id attribute of the iframe', 'iframe索引': 'iframe index', 'iframe选择器': 'iframe selector',
  'load: 等待页面完全加载（包括图片、样式等）': 'load: wait until the page is fully loaded (images, styles, etc.)',
  'networkidle: 等待网络请求完成（500ms内无新请求）': 'networkidle: wait until network is idle (no new requests for 500ms)',
  'prompt对话框的输入文本': 'Input text for the prompt dialog', 'vars.变量名': 'vars.variableName',
})

Object.assign(UI_DICT, {
  '• 列表所有变量: list(vars.keys())': '\u2022 List all variables: list(vars.keys())',
  '• 可以通过"设置变量"模块设置返回值': '\u2022 You can set the return value via the "Set variable" module',
  '• 子流程内的变量作用域独立': '\u2022 Variables inside a subflow have an isolated scope',
  '• 子流程内的变量作用域独立，不会影响主流程': '\u2022 Variables inside a subflow are isolated and do not affect the main flow',
  '• 子流程可以被其他工作流调用': '\u2022 A subflow can be called by other workflows',
  '• 子流程可以被其他工作流通过"调用子流程"模块调用': '\u2022 A subflow can be called by other workflows via the "Call subflow" module',
  '• 子流程名称必须唯一': '\u2022 The subflow name must be unique',
  '• 子流程名称必须唯一，不能与其他子流程重名': '\u2022 The subflow name must be unique and not duplicate another subflow',
  "• 带默认值: vars.get('age', 0)": "\u2022 With default: vars.get('age', 0)",
  '• 标记子流程的起始位置': '\u2022 Marks the start of the subflow',
  "• 检查变量存在: 'name' in vars.keys()": "\u2022 Check existence: 'name' in vars.keys()",
  '• 访问变量: vars.username': '\u2022 Access a variable: vars.username',
  '不支持异步操作(async/await)和DOM操作': 'Async (async/await) and DOM operations are not supported',
  '中文(简体)': 'Chinese (Simplified)', '中文(繁体)': 'Chinese (Traditional)', '中文(香港)': 'Chinese (Hong Kong)',
  '从图像资源中选择要查找的目标图片': 'Choose the target image to find from image assets', '从文件读取': 'Read from file',
  '代码编辑器中有详细的使用教程和示例代码': 'The code editor includes a detailed tutorial and example code',
  '传递参数': 'Pass parameters', '低': 'Low', '高': 'High', '正常': 'Normal',
  '使用 return 返回任意类型的数据（字符串、数字、列表、字典等）': 'Use return to return data of any type (string, number, list, dict, etc.)',
  '使用内置Python 3.13': 'Use built-in Python 3.13', '使用方法：': 'Usage:', '使用示例:': 'Example:', '使用说明：': 'Instructions:',
  '例如: 1 或 2.5': 'e.g. 1 or 2.5', '保存URL到变量（可选）': 'Save URL to a variable (optional)', '保存对话框消息': 'Dialog message',
  '保存标题到变量（可选）': 'Save title to a variable (optional)', '保存索引到变量（可选）': 'Save index to a variable (optional)', '保存结果': 'Save result',
  '信息': 'Info', '元素属性值（字典）': 'Element attribute values (dict)', '全局变量': 'Global variable', '分组名称': 'Group name', '分组标签': 'Group label', '分组颜色': 'Group color',
  '切换到上一个': 'Switch to previous', '切换到下一个': 'Switch to next',
  '切换到下一个/上一个时会循环（最后一个的下一个是第一个）': 'Switching next/previous wraps around (after the last comes the first)',
  '切换到最后一个': 'Switch to last', '切换到第一个': 'Switch to first',
  '切换后，将标签页URL保存到指定变量': 'After switching, save the tab URL to the given variable',
  '切换后，将标签页标题保存到指定变量': 'After switching, save the tab title to the given variable',
  '切换后，将标签页索引保存到指定变量': 'After switching, save the tab index to the given variable',
  '切换模式': 'Switch mode', '列名(可选)': 'Column name (optional)', '列表': 'List',
  '勾选后，将自动导出为Excel文件': 'When checked, auto-export to an Excel file', '勾选后，第一行将被识别为表头': 'When checked, the first row is treated as the header',
  '包含': 'Contains', '包含表头': 'Include header', '匹配度': 'Match score', '匹配模式': 'Match mode', '单击': 'Single click', '单行文本': 'Single-line text', '单选下拉': 'Single-select dropdown',
  '参数传递': 'Parameter passing', '双击': 'Double click', '取消/关闭': 'Cancel/Close', '变量作用域说明：': 'Variable scope notes:',
  '变量值': 'Variable value', '变量名(可选)': 'Variable name (optional)', '变量的值': 'The variable\u2019s value', '变量访问说明': 'Variable access notes',
  '可以使用所有Python标准库和WebRPA内置的第三方库': 'You can use all Python standard libraries and WebRPA\u2019s bundled third-party libraries',
  '可以将切换后的标签页信息保存到变量中': 'You can save the switched tab\u2019s info to a variable',
  '可以访问页面的DOM、window对象等': 'You can access the page\u2019s DOM, window object, etc.',
  '可以选择table标签内的任意元素，会自动向上查找table': 'You can select any element inside a table tag; it auto-searches upward for the table',
  '可见': 'Visible', '可选': 'Optional', '右下角坐标': 'Bottom-right coordinate', '右键': 'Right button', '名称/ID': 'Name/ID', '名称重复警告': 'Duplicate-name warning', '否': 'No', '是': 'Yes',
})

Object.assign(UI_DICT, {
  '图片地址': 'Image URL', '图片文件的URL或本地路径': 'Image file URL or local path', '图片路径': 'Image path', '处理方式': 'Handling', '复选框': 'Checkbox',
  '多行文本': 'Multi-line text', '多选下拉': 'Multi-select dropdown', '子流程变量': 'Subflow variable', '子流程名称': 'Subflow name', '子流程头说明：': 'Subflow header notes:', '子流程说明：': 'Subflow notes:',
  '存储到变量': 'Store to variable', '存储到数据表列': 'Store to a data-table column', '存储变量名': 'Storage variable', '定义子流程': 'Define subflow', '定位方式': 'Locate by',
  '对变量进行自增或自减操作。如果变量不存在，将初始化为0。支持整数和小数。': 'Increment or decrement a variable. If it does not exist, it is initialized to 0. Supports integers and decimals.',
  '导出为Excel': 'Export to Excel', '将检查结果（true/false）保存到变量中': 'Save the check result (true/false) to a variable', '小数滑块': 'Decimal slider', '工作目录（可选）': 'Working directory (optional)',
  '左上角坐标': 'Top-left coordinate', '已分离': 'Detached', '已附加': 'Attached', '开头匹配': 'Starts-with match', '弹窗出现时播放提示音': 'Play a beep when the dialog appears', '当前标签页': 'Current tab', '必填': 'Required',
  '悬停时长(秒)': 'Hover duration (s)', '所有标签页': 'All tabs', '打开代码编辑器': 'Open code editor', '打开方式': 'Open with',
  '执行自定义Python代码，自动注入所有工作流变量，支持返回值接收和输出捕获': 'Run custom Python code; all workflow variables are auto-injected, with return-value and output capture',
  '指定Excel文件保存路径，留空则保存到当前目录': 'Specify the Excel save path; leave blank to save in the current directory',
  '指定哪一行是表头（0表示第一行）': 'Specify which row is the header (0 means the first row)', '指定索引': 'Specified index',
  '按URL切换': 'Switch by URL', '按URL匹配': 'Match by URL', '按标题切换': 'Switch by title', '按标题匹配': 'Match by title', '按索引切换': 'Switch by index', '接受/确定': 'Accept/OK',
  '接收 print() 输出的内容': 'Receives the output of print()', '接收脚本中 return 返回的数据（支持任意类型）': 'Receives data returned by return in the script (any type)',
  '提取的数据为二维列表，按行列索引访问': 'Extracted data is a 2D list, accessed by row/column index', '提示信息': 'Prompt message', '提示标题': 'Prompt title', '提示音次数': 'Beep count', '提示音间隔(秒)': 'Beep interval (s)',
  '提示：使用此模块后，后续的元素操作将在主页面上执行。': 'Note: after this module, later element operations run on the main page.',
  '操作类型': 'Action type', '支持多种切换模式：索引、标题、URL、相对位置': 'Supports multiple switch modes: index, title, URL, relative position',
  '支持所有标准JavaScript语法和内置对象': 'Supports all standard JavaScript syntax and built-in objects', '支持的对话框类型：': 'Supported dialog types:', '支持直接导出为格式化的Excel文件': 'Supports exporting directly to a formatted Excel file',
  '支持自动识别网页中的表格元素': 'Supports auto-detecting table elements on the page', '支持表达式计算，例如：': 'Supports expression evaluation, e.g.:',
  '数字': 'Number', '数据隔离': 'Data isolation', '整数': 'Integer', '整数滑块': 'Integer slider', '文件': 'File', '文件夹': 'Folder', '文本内容': 'Text content', '新标签页': 'New tab', '日志内容': 'Log content', '日志级别': 'Log level', '日语': 'Japanese',
  '显示时长(秒)': 'Display duration (s)', '显示系统通知消息，支持变量引用；弹窗会自动跟随系统亮色/暗色主题': 'Show a system notification; supports variable references, and follows the system light/dark theme',
  '最大值': 'Max value', '最大长度': 'Max length', '最小值': 'Min value', '朗读文本': 'Read text aloud', '标准输出变量（可选）': 'Stdout variable (optional)', '标准错误变量（可选）': 'Stderr variable (optional)',
  '标签页URL': 'Tab URL', '标签页标题': 'Tab title', '标签页索引': 'Tab index', '标签页索引从0开始，0表示第一个标签页': 'Tab index starts at 0; 0 is the first tab',
  '标题和URL支持多种匹配模式，包括正则表达式': 'Title and URL support multiple match modes, including regex', '检查状态': 'Check status', '检查间隔(秒)': 'Check interval (s)', '检查页面是否达到指定的加载状态': 'Check whether the page reached the given load state',
  '正则表达式': 'Regular expression', '此模块将从当前iframe切换回主页面，无需额外配置。': 'This module switches from the current iframe back to the main page; no extra config needed.',
  '步长': 'Step', '每次增加或减少的值': 'Amount to add or subtract each time', '注入模式': 'Injection mode', '点击类型': 'Click type', '用于识别要操作的已打开页面，支持模糊匹配': 'Identifies the already-open page to operate on; supports fuzzy match',
  '留空使用系统Python': 'Leave blank to use system Python', '留空使用默认目录': 'Leave blank to use the default directory', '留空使用默认路径 table_data.xlsx': 'Leave blank to use the default path table_data.xlsx', '目标URL': 'Target URL', '直接输入代码': 'Enter code directly',
})

Object.assign(UI_DICT, {
  '等待元素': 'Wait for element', '等待元素满足指定条件，超时后会抛出错误': 'Wait for the element to meet the given condition; throws an error on timeout',
  '等待导航': 'Wait for navigation', '等待播放完成': 'Wait until playback finishes', '等待时长(秒)': 'Wait duration (s)', '等待条件': 'Wait condition',
  '精确匹配': 'Exact match', '系统会自动将所有工作流变量注入到脚本中，您可以直接通过': 'All workflow variables are auto-injected into the script; you can access them directly via',
  '系统自动注入所有工作流变量，通过 vars.变量名 直接访问': 'All workflow variables are auto-injected; access them via vars.variableName',
  '索引': 'Index', '结尾匹配': 'Ends-with match', '结果变量': 'Result variable', '网址': 'URL', '网络空闲': 'Network idle', '脚本文件路径': 'Script file path', '脚本模式': 'Script mode',
  '自减 (-)': 'Decrement (-)', '自增 (+)': 'Increment (+)', '自动关闭': 'Auto close', '英语(美国)': 'English (US)', '英语(英国)': 'English (UK)', '获取属性': 'Get attribute', '获取返回值': 'Get return value', '表头行索引': 'Header row index',
  '要打印的日志信息': 'Log message to print', '要操作的变量名': 'Variable to operate on', '要朗读的文本内容': 'Text to read aloud', '要输入的文本内容': 'Text to type', '视频地址': 'Video URL', '视频文件的URL或本地路径': 'Video file URL or local path',
  '设为子流程': 'Set as subflow', '访问任何变量': 'Access any variable', '调用子流程': 'Call subflow', '调试': 'Debug', '超时时间(秒)': 'Timeout (s)', '超时时间（秒）': 'Timeout (s)',
  '输入前清空原有内容': 'Clear existing content before typing', '输入文本': 'Type text', '输入标签页URL': 'Enter tab URL', '输入标签页标题': 'Enter tab title', '输入框值': 'Input value', '输入框的提示信息': 'Input placeholder', '输入框的标题': 'Input title', '输入模式': 'Input mode',
  '输出结果配置': 'Output configuration', '返回值': 'Return value', '返回值变量': 'Return-value variable', '返回码变量（可选）': 'Return-code variable (optional)',
  '选择"元素属性值"将返回包含所有HTML属性的字典对象': 'Choosing "Element attribute values" returns a dict of all HTML attributes',
  '选择器': 'Selector', '选择如何定位iframe元素': 'Choose how to locate the iframe element', '选项1,选项2,选项3': 'Option1,Option2,Option3', '选项列表': 'Option list',
  '通知内容': 'Notification content', '通知标题': 'Notification title', '通知的标题': 'The notification title', '通知的详细内容': 'The notification details', '链接地址': 'Link URL', '限定搜索区域': 'Limit search area', '隐藏': 'Hidden', '静音': 'Mute', '韩语': 'Korean',
  '音频地址': 'Audio URL', '音频文件的URL或本地路径': 'Audio file URL or local path', '页面中第几个iframe，从0开始计数': 'Which iframe on the page, counting from 0', '页面加载完成': 'Page loaded', '页面标识': 'Page identifier', '页面标题或URL的部分内容': 'Part of the page title or URL',
  '默认使用WebRPA内置的Python 3.13环境': 'Uses WebRPA\u2019s built-in Python 3.13 environment by default', '默认值': 'Default value', '默认值(可选)': 'Default value (optional)', '鼠标悬停在元素上的时长，单位秒': 'How long to hover over the element, in seconds',
  '🐍 Python脚本执行': '\ud83d\udc0d Python script execution',
  "：'在URL匹配的标签页中执行代码'": ": 'Run code in tabs matching the URL'",
  "：'在当前标签页中执行代码'": ": 'Run code in the current tab'",
  "：'在所有标签页中执行代码'": ": 'Run code in all tabs'",
  "：'在指定索引的标签页中执行代码'": ": 'Run code in the tab at the given index'",
  '：使用"调用子流程"模块调用': ': call via the "Call subflow" module',
  '：使用子流程头节点标记起始位置': ': use the subflow-header node to mark the start',
  '：可以在子流程中访问和修改全局变量': ': you can read and modify global variables inside the subflow',
  '：在调用时设置参数值': ': set parameter values when calling',
  '：子流程内创建的变量仅在子流程内有效': ': variables created inside a subflow are only valid within it',
  '：子流程执行完成后获取返回值': ': get the return value after the subflow finishes',
  '：子流程的数据表和变量与主流程隔离': ': a subflow\u2019s data tables and variables are isolated from the main flow',
  '：调用时可以传递参数到子流程': ': you can pass parameters to the subflow when calling',
  '：通过"设置变量"模块设置返回值': ': set the return value via the "Set variable" module',
})

// ============================================================
// 精确整句翻译：config-panels/TriggerModuleConfigs（触发器模块配置）
// ============================================================
Object.assign(UI_DICT, {
  '-- 请选择手势 --': '-- Select a gesture --',
  '0为默认摄像头，如有多个摄像头可尝试1、2等': '0 is the default camera; try 1, 2, etc. for multiple cameras',
  '0表示无限循环，直到手动停止工作流': '0 means loop forever until you stop the workflow manually',
  '0表示无限等待，直到Webhook被触发': '0 means wait indefinitely until the webhook is triggered',
  '0表示无限等待，直到收到符合条件的邮件': '0 means wait indefinitely until a matching email arrives',
  '0表示无限等待，直到文件事件发生': '0 means wait indefinitely until a file event occurs',
  '0表示无限等待，直到条件满足': '0 means wait indefinitely until the condition is met',
  '0表示无限等待，直到检测到元素变化': '0 means wait indefinitely until an element change is detected',
  '0表示无限等待，直到检测到图像': '0 means wait indefinitely until the image is detected',
  '0表示无限等待，直到检测到声音': '0 means wait indefinitely until a sound is detected',
  '0表示无限等待，直到检测到目标人脸': '0 means wait indefinitely until the target face is detected',
  '0表示无限等待，直到检测到目标手势': '0 means wait indefinitely until the target gesture is detected',
  '0表示无限等待，直到热键被按下': '0 means wait indefinitely until the hotkey is pressed',
  '0表示无限等待，直到触发条件满足': '0 means wait indefinitely until the trigger condition is met',
  '24小时制，如：09:00、14:30、23:59': '24-hour format, e.g. 09:00, 14:30, 23:59',
  'Cron表达式': 'Cron expression', 'HTTP响应状态码（默认200）': 'HTTP response status code (default 200)', 'HTTP方法': 'HTTP method',
  '{"status": "success", "message": "已接收"}': '{"status": "success", "message": "received"}',
  '• 0 0 * * * - 每小时整点': '\u2022 0 0 * * * - every hour on the hour',
  '• 0 0 1 * * - 每月1号0点': '\u2022 0 0 1 * * - midnight on the 1st of each month',
  '• 0 9 * * * - 每天9点': '\u2022 0 9 * * * - 9 AM every day',
  '• 0 9 * * 1 - 每周一9点': '\u2022 0 9 * * 1 - 9 AM every Monday',
  '• 163邮箱：imap.163.com': '\u2022 163 Mail: imap.163.com', '• QQ邮箱：imap.qq.com': '\u2022 QQ Mail: imap.qq.com',
  '• 使用Cron表达式定义复杂的定时规则': '\u2022 Use a Cron expression to define complex schedules',
  '• 使用任何HTTP客户端（浏览器、Postman、curl等）向上方URL发送请求': '\u2022 Use any HTTP client (browser, Postman, curl, etc.) to send a request to the URL above',
  '• 可设置每天重复或指定具体日期': '\u2022 You can repeat daily or specify exact dates',
  '• 可设置请求头和查询参数验证，增强安全性': '\u2022 You can validate headers and query parameters for added security',
  '• 可设置重复次数或无限循环': '\u2022 You can set a repeat count or loop forever',
  '• 启用"自动设置参数"后，请求参数会自动转换为独立变量，方便直接使用': '\u2022 With "Auto-set parameters" enabled, request parameters become individual variables for direct use',
  '• 在指定的时间点触发工作流': '\u2022 Triggers the workflow at the specified time',
  '• 在线工具：crontab.guru': '\u2022 Online tool: crontab.guru',
  '• 定时触发器会按固定间隔重复执行后续流程': '\u2022 The interval trigger repeats the downstream flow at a fixed interval',
  '• 工作流执行到此模块时会暂停，定期检查邮箱': '\u2022 The workflow pauses here and checks the mailbox periodically',
  '• 工作流执行到此模块时会暂停，定期轮询API接口': '\u2022 The workflow pauses here and polls the API periodically',
  '• 工作流执行到此模块时会暂停，监控指定路径的文件变化': '\u2022 The workflow pauses here and monitors file changes at the given path',
  '• 工作流执行到此模块时会暂停，等待HTTP请求触发': '\u2022 The workflow pauses here and waits for an HTTP request',
  '• 工作流执行到此模块时会暂停，等待指定热键按下': '\u2022 The workflow pauses here and waits for the given hotkey',
  '• 当API响应满足指定条件时，工作流会继续执行': '\u2022 When the API response meets the condition, the workflow continues',
  '• 按下热键后，工作流会继续执行后续模块': '\u2022 After the hotkey is pressed, the workflow continues',
  '• 支持标准的5位Cron格式': '\u2022 Supports the standard 5-field Cron format',
  '• 收到符合条件的新邮件后，工作流会继续执行': '\u2022 After a matching new email arrives, the workflow continues',
  '• 检测到匹配的文件事件后，工作流会继续执行': '\u2022 After a matching file event, the workflow continues',
  '• 热键监听是全局的，即使WebRPA窗口不在前台也能触发': '\u2022 Hotkey listening is global and works even when WebRPA is not in the foreground',
  '• 示例：': '\u2022 Example:',
  '• 示例：每60秒检查一次网站更新': '\u2022 Example: check the website for updates every 60 seconds',
  '• 示例：每天早上9点发送日报': '\u2022 Example: send a daily report at 9 AM',
  '• 示例：监控下载文件夹，自动处理新下载的文件': '\u2022 Example: monitor the Downloads folder and auto-process new files',
  '• 示例：轮询任务状态API，直到status为"completed"': '\u2022 Example: poll the task-status API until status is "completed"',
  '• 自动设置的变量：': '\u2022 Auto-set variables:',
  '• 请求数据会保存到指定变量中，可在后续模块中使用': '\u2022 Request data is saved to the given variable for use in later modules',
  '• 适用于复杂的定时需求': '\u2022 Good for complex scheduling needs',
  '• 适用于定时报表、每日任务等场景': '\u2022 Good for scheduled reports, daily tasks, etc.',
  '• 适用于定期数据采集、定时任务等场景': '\u2022 Good for periodic data collection and scheduled tasks',
  '• 适用于等待任务完成、监控状态变化等场景': '\u2022 Good for waiting on task completion or monitoring status changes',
  '• 适用于自动处理新文件、监控文件变化等场景': '\u2022 Good for auto-processing new files and monitoring file changes',
  '• 适用于邮件通知触发、订单处理等场景': '\u2022 Good for email-notification triggers, order processing, etc.',
  '• 适用于需要人工确认或手动触发的场景': '\u2022 Good for scenarios needing manual confirmation or triggering',
  '• 邮件会被标记为已读': '\u2022 The email will be marked as read',
  '⏳ 正在等待录制...': '\u23f3 Waiting to record...',
})

Object.assign(UI_DICT, {
  '不勾选则先等待一个间隔时间再开始': 'If unchecked, wait one interval before starting', '不等于': 'Not equal', '中键手势触发': 'Middle-button gesture trigger',
  '主题关键词过滤（可选）': 'Subject keyword filter (optional)',
  '事件信息包含：eventType（事件类型）、filePath（文件路径）、fileName（文件名）、timestamp（时间戳）': 'Event info includes: eventType, filePath, fileName, timestamp',
  '任意变化': 'Any change', '任意方法': 'Any method', '例如: up, down_right, left_up_right': 'e.g. up, down_right, left_up_right',
  '保存事件信息到变量': 'Save event info to a variable', '保存到变量 (可选)': 'Save to a variable (optional)', '保存变化信息到变量': 'Save change info to a variable',
  '保存变化详情（变化类型、数量等）到变量': 'Save change details (type, count, etc.) to a variable', '保存响应数据到变量': 'Save response data to a variable',
  '保存图像位置和匹配度到变量': 'Save image position and match score to a variable', '保存手势信息到变量': 'Save gesture info to a variable',
  '保存手势名称、置信度、时间戳等信息到变量': 'Save gesture name, confidence, timestamp, etc. to a variable', '保存数据到变量': 'Save data to a variable',
  '保存新增元素选择器到变量': 'Save the new element\u2019s selector to a variable', '保存触发时的音量值到变量': 'Save the volume at trigger time to a variable',
  '保存识别结果（匹配度、人脸位置等）到变量': 'Save the recognition result (match score, face position, etc.) to a variable', '保存邮件信息到变量': 'Save email info to a variable',
  '保存鼠标位置和事件信息到变量': 'Save mouse position and event info to a variable', '保持手势稳定，按空格键确认录制': 'Hold the gesture steady and press Space to confirm recording',
  '值越高匹配越精确，建议0.7-0.9': 'Higher values match more precisely; 0.7-0.9 recommended', '允许的HTTP方法': 'Allowed HTTP method', '光线条件会影响识别准确度': 'Lighting affects recognition accuracy',
  '分钟': 'Minutes', '匹配容差': 'Match tolerance', '匹配置信度': 'Match confidence', '发件人过滤（可选）': 'Sender filter (optional)', '变量名前缀': 'Variable name prefix',
  '只有查询参数匹配时才触发，留空则不验证': 'Trigger only when query parameters match; leave blank to skip validation',
  '只有请求头匹配时才触发，留空则不验证': 'Trigger only when headers match; leave blank to skip validation',
  '只触发主题包含指定关键词的邮件，留空则不过滤': 'Only trigger for emails whose subject contains the keyword; leave blank for no filter',
  '只触发来自指定发件人的邮件，留空则不过滤': 'Only trigger for emails from the given sender; leave blank for no filter',
  '可以是文件路径或文件夹路径': 'Can be a file path or a folder path', '可用于人脸考勤、身份验证等场景': 'Good for face attendance, identity verification, etc.',
  '可用于实现鼠标手势、快捷操作等功能': 'Good for mouse gestures, quick actions, etc.', '可用于检测通知声音、提示音等': 'Good for detecting notification sounds, beeps, etc.',
  '可用于等待界面加载、按钮出现等场景': 'Good for waiting on UI load, button appearance, etc.', '右键手势触发': 'Right-button gesture trigger',
  '后续流程：获取新评论内容 → 数据处理 → 保存': 'Next: get new comment content \u2192 process data \u2192 save', '向上滚动': 'Scroll up', '向下滚动': 'Scroll down',
  '启用后，会自动将query参数、body参数、自定义请求头设置为独立变量': 'When enabled, query params, body params and custom headers become individual variables', '响应状态码': 'Response status code',
  '在弹出的窗口中对着摄像头做出手势': 'Make the gesture toward the camera in the pop-up window', '复制URL': 'Copy URL',
  '多个日期用逗号分隔，格式：YYYY-MM-DD': 'Separate multiple dates with commas, format: YYYY-MM-DD', '多个键用+连接，如：ctrl+alt+a': 'Join multiple keys with +, e.g. ctrl+alt+a', '大于': 'Greater than',
  '天': 'Days', '如: *.txt 或 report_*.xlsx': 'e.g. *.txt or report_*.xlsx', '如: .comment-list 或 #messages': 'e.g. .comment-list or #messages',
  '如: 0 0 * * *': 'e.g. 0 0 * * *', '如: 14:30': 'e.g. 14:30', '如: 2026-02-01, 2026-02-15': 'e.g. 2026-02-01, 2026-02-15', '如: C:\\\\Users\\\\Downloads 或 C:\\\\file.txt': 'e.g. C:\\Users\\Downloads or C:\\file.txt',
  '如: api_response': 'e.g. api_response', '如: ctrl+shift+f1': 'e.g. ctrl+shift+f1', '如: data.status 或 $.result.code': 'e.g. data.status or $.result.code', '如: email_data': 'e.g. email_data',
  '如: file_event': 'e.g. file_event', '如: https://api.example.com/status': 'e.g. https://api.example.com/status', '如: imap.qq.com': 'e.g. imap.qq.com', '如: sender@example.com': 'e.g. sender@example.com',
  '如: success 或 200': 'e.g. success or 200', '如: webhook_': 'e.g. webhook_', '如: webhook_data': 'e.g. webhook_data', '如: your@email.com': 'e.g. your@email.com', '如: 订单通知': 'e.g. Order notification',
  '如需持续监控，可将整个流程放入循环节点中': 'For continuous monitoring, put the whole flow inside a loop node', '实战示例：': 'Example:', '实时监控摄像头画面，检测目标人脸': 'Monitor the camera feed in real time to detect the target face',
  '小于': 'Less than', '小时': 'Hours', '左键手势触发': 'Left-button gesture trigger', '常用服务器：': 'Common servers:', '应用场景：': 'Use cases:', '建议在光线充足、纯色背景下录制': 'Record in good lighting with a solid background',
})

Object.assign(UI_DICT, {
  '当有新元素增加时，保存新增元素的选择器': 'When a new element appears, save its selector', '当系统音量达到此阈值时触发': 'Trigger when system volume reaches this threshold', '当音量达到阈值时触发工作流': 'Trigger the workflow when volume reaches the threshold',
  '录制成功后即可在列表中选择使用': 'After recording, you can select it from the list', '录制新手势': 'Record new gesture', '录制时会弹出摄像头窗口，做出手势后按空格键确认': 'A camera window pops up while recording; make the gesture and press Space to confirm',
  '录制步骤：': 'Recording steps:', '手势最小距离 (像素)': 'Min gesture distance (px)', '手势模式 (可选)': 'Gesture pattern (optional)', '手势绘制的最大时长，超时则取消': 'Max time to draw the gesture; cancels on timeout',
  '手势触发：按住鼠标按键并移动绘制手势': 'Gesture trigger: hold a mouse button and move to draw a gesture', '手势识别状态': 'Gesture-recognition status', '手势识别的最小移动距离': 'Min movement distance for gesture recognition', '手势超时 (秒)': 'Gesture timeout (s)',
  '持续检测屏幕上是否出现指定图像': 'Continuously detect whether the image appears on screen', '指定日期（可选）': 'Specific date (optional)', '指定时间触发': 'Trigger at a specific time', '摄像头索引': 'Camera index', '操作失败': 'Operation failed', '操作成功': 'Operation succeeded',
  '支持 PNG、JPG 等常见图像格式': 'Supports common image formats like PNG and JPG', '支持的修饰键：ctrl、alt、shift、win': 'Supported modifiers: ctrl, alt, shift, win', '支持的功能键：f1-f12': 'Supported function keys: f1-f12', '支持的字母键：a-z': 'Supported letter keys: a-z',
  '支持通配符：* 匹配任意字符，? 匹配单个字符': 'Supports wildcards: * matches any characters, ? matches a single character', '文件修改': 'File modified', '文件创建': 'File created', '文件删除': 'File deleted', '文件名模式': 'File name pattern',
  '无接触控制：通过手势控制电脑操作': 'Touch-free control: operate the computer with gestures', '是否立即开始': 'Start immediately', '智能家居：手势控制灯光、窗帘等': 'Smart home: control lights, curtains, etc. with gestures', '期望的值': 'Expected value', '条件判断路径（JSONPath）': 'Condition path (JSONPath)',
  '标准Cron表达式格式：分 时 日 月 周': 'Standard Cron format: minute hour day month weekday', '检查间隔 (秒)': 'Check interval (s)', '检查间隔（秒）': 'Check interval (s)', '检查间隔：0.5秒': 'Check interval: 0.5s',
  '检测到匹配的人脸后立即触发工作流': 'Trigger the workflow immediately when a matching face is detected', '检测到图像后立即触发工作流': 'Trigger the workflow immediately when the image is detected', '检测到第一次变化后立即触发后续流程': 'Trigger the downstream flow as soon as the first change is detected',
  '每个手势只需录制一次，可重复使用': 'Each gesture only needs to be recorded once and can be reused', '每天重复执行': 'Repeat daily', '每隔多久检查一次元素变化': 'How often to check for element changes', '每隔多久检查一次屏幕': 'How often to check the screen', '每隔多久检查一次摄像头画面': 'How often to check the camera feed', '每隔多久检查一次音量': 'How often to check the volume',
  '每隔多少秒检查一次新邮件，建议不低于30秒': 'How many seconds between new-email checks; at least 30s recommended', '每隔多少秒请求一次API': 'How many seconds between API requests', '比较运算符': 'Comparison operator', '注意事项：': 'Notes:',
  '注意：Cron模式使用标准Cron表达式语法': 'Note: Cron mode uses standard Cron expression syntax', '注意：定时触发器会持续运行，请确保设置合理的触发规则': 'Note: the schedule trigger runs continuously; set a sensible rule', '注意：请确保热键组合不与系统或其他应用冲突': 'Note: make sure the hotkey combo does not conflict with the system or other apps',
  '注意：请确保邮箱已开启IMAP服务，并使用授权码而非登录密码': 'Note: make sure IMAP is enabled and use an app code, not your login password', '游戏控制：用手势玩游戏': 'Game control: play games with gestures', '演示互动：演讲时通过手势切换PPT': 'Presentations: switch slides with gestures while speaking',
  '点击"录制新手势"按钮': 'Click the "Record new gesture" button', '点击"录制新手势"按钮开始录制您的第一个手势': 'Click "Record new gesture" to record your first gesture', '热键组合': 'Hotkey combo', '用于比对的目标人脸照片': 'The target face photo used for comparison',
  '留空则不判断条件，收到响应即触发': 'Leave blank to skip the condition and trigger on any response', '留空则只在今天的指定时间触发一次': 'Leave blank to trigger only once at the given time today',
  '留空表示任意手势。支持方向: up(上), down(下), left(左), right(右)，用下划线连接表示连续手势': 'Leave blank for any gesture. Directions: up, down, left, right; join with underscores for sequences',
  '监听系统音频输出（扬声器）的音量': 'Monitor the system audio output (speaker) volume', '监控指定元素的子元素数量变化': 'Monitor changes in the child count of the given element', '监控直播间评论：': 'Monitor live-stream comments:', '监控类型': 'Monitor type', '监控路径': 'Watch path',
  '目标人脸图片': 'Target face image', '目标人脸图片应清晰且只包含一张人脸': 'The target face image should be clear and contain only one face', '直播互动：识别观众手势触发特效': 'Live interaction: detect viewer gestures to trigger effects', '确保摄像头已正确连接并授权': 'Make sure the camera is connected and authorized', '确认删除': 'Confirm delete',
  '示例：*.txt（所有txt文件）、report_*.xlsx（以report_开头的Excel文件）': 'Example: *.txt (all txt files), report_*.xlsx (Excel files starting with report_)', '示例：data.status（访问响应中的data.status字段）': 'Example: data.status (access the data.status field of the response)', '秒': 'Seconds',
  '移动超过指定距离': 'Moves more than the given distance', '移动距离阈值 (像素)': 'Movement distance threshold (px)', '立即执行第一次，然后按间隔重复': 'Run once immediately, then repeat at the interval', '等于': 'Equal',
  '置信度越高，识别越严格，但可能更难触发（推荐60%）': 'Higher confidence is stricter but harder to trigger (60% recommended)', '自动将请求参数设置为变量': 'Automatically set request parameters as variables', '自动生成的唯一标识符': 'Auto-generated unique identifier', '自动获取新增元素的选择器，方便后续操作': 'Auto-capture the new element\u2019s selector for later use',
  '自动设置的变量名前缀，例如：webhook_user_id、webhook_action': 'Prefix for auto-set variable names, e.g. webhook_user_id, webhook_action', '自定义响应内容（可选，JSON格式）': 'Custom response body (optional, JSON)', '自定义手势触发': 'Custom gesture trigger', '自定义返回给请求方的响应内容': 'Custom response body returned to the requester',
  '要监控的父元素的CSS选择器': 'CSS selector of the parent element to monitor', '触发后会保存鼠标坐标和事件类型': 'After triggering, saves the mouse coordinates and event type', '触发器会监听全局鼠标事件': 'The trigger listens to global mouse events', '触发时间（HH:MM）': 'Trigger time (HH:MM)', '触发模式': 'Trigger mode', '触发类型': 'Trigger type', '识别置信度阈值': 'Recognition confidence threshold',
  '请在弹出的窗口中做出手势，然后按空格键确认': 'Make the gesture in the pop-up window, then press Space to confirm', '请求体（JSON格式）': 'Request body (JSON)', '请求头（JSON格式）': 'Request headers (JSON)', '请求数据将保存到此变量，包含method、headers、body、query等信息': 'Request data is saved to this variable, including method, headers, body, query, etc.', '请输入手势名称': 'Enter a gesture name',
  '越小越严格，0.6为默认值，建议0.4-0.6': 'Smaller is stricter; 0.6 is the default, 0.4-0.6 recommended', '输入手势名称（如：OK手势、点赞等）': 'Enter a gesture name (e.g. OK, thumbs-up)', '还没有录制任何手势': 'No gestures recorded yet', '适用于实时监控直播评论、聊天消息等场景': 'Good for monitoring live comments, chat messages, etc. in real time',
  '选择器：.comment-list（评论列表容器）': 'Selector: .comment-list (the comment-list container)', '选择手势': 'Select gesture', '通常0是默认摄像头，如有多个摄像头可尝试1、2等': 'Usually 0 is the default camera; try 1, 2, etc. for multiple cameras',
  '邮件信息包含：from（发件人）、subject（主题）、date（日期）、body（正文）、timestamp（时间戳）': 'Email info includes: from, subject, date, body, timestamp', '邮件服务器': 'Mail server', '重复设置': 'Repeat settings', '间隔时间': 'Interval', '间隔触发': 'Interval trigger',
  '限定区域可提高识别速度，不选择则搜索整个屏幕': 'Limiting the area speeds up recognition; if unset, the whole screen is searched', '音量阈值 (%)': 'Volume threshold (%)', '首次使用需要录制自定义手势': 'You must record a custom gesture on first use', '验证查询参数（可选，JSON格式）': 'Validate query parameters (optional, JSON)', '验证请求头（可选，JSON格式）': 'Validate headers (optional, JSON)',
  '鼠标中键点击': 'Middle-button click', '鼠标右键点击': 'Right-button click', '鼠标左键点击': 'Left-button click', '鼠标移动超过此距离时触发': 'Trigger when the mouse moves more than this distance', '🗑️ 删除': '\ud83d\uddd1\ufe0f Delete',
})

// ============================================================
// 精确整句翻译：config-panels/MediaModuleConfigs（媒体模块配置）
// ============================================================
Object.assign(UI_DICT, {
  '0 表示自动计算（保持宽高比时）': '0 means auto-calculate (when keeping aspect ratio)',
  '0.5 = 减半，1.0 = 原音量，2.0 = 加倍，0 = 静音': '0.5 = half, 1.0 = original, 2.0 = double, 0 = mute',
  '0.5 = 慢速（半速），1.0 = 正常，2.0 = 快速（2倍速）': '0.5 = slow (half), 1.0 = normal, 2.0 = fast (2x)',
  '0为无损，23为默认，数值越大文件越小但质量越低': '0 is lossless, 23 is default; higher means smaller file but lower quality',
  '0为默认摄像头，如有多个摄像头可尝试1、2等': '0 is the default camera; try 1, 2, etc. for multiple cameras',
  '1.0 为原始音量，0.5 为减半，2.0 为加倍': '1.0 is original volume, 0.5 is half, 2.0 is double',
  '128 kbps（较小）': '128 kbps (smaller)', '192 kbps（推荐）': '192 kbps (recommended)', '320 kbps（高质量）': '320 kbps (high quality)',
  '15 FPS（流畅）': '15 FPS (smooth)', '30 FPS（推荐）': '30 FPS (recommended)', '60 FPS（高帧率）': '60 FPS (high frame rate)',
  'H - 30% 纠错': 'H - 30% error correction', 'L - 7% 纠错': 'L - 7% error correction', 'M - 15% 纠错（推荐）': 'M - 15% error correction (recommended)', 'Q - 25% 纠错': 'Q - 25% error correction',
  'HTTP 请求配置': 'HTTP request config', 'KID:KEY 或直接输入 KEY（可选）': 'KID:KEY or just KEY (optional)', 'M3U8链接': 'M3U8 link',
  'base（推荐，平衡速度和精度）': 'base (recommended, balances speed and accuracy)', 'http://127.0.0.1:7890（可选）': 'http://127.0.0.1:7890 (optional)',
  'https://example.com/video.m3u8，支持 {变量名}': 'https://example.com/video.m3u8, supports {variable}', 'https://example.com（可选），支持 {变量名}': 'https://example.com (optional), supports {variable}',
  'large-v3（最慢，精度最高）': 'large-v3 (slowest, most accurate)', 'medium（慢，精度高）': 'medium (slow, high accuracy)', 'small（较慢，精度较高）': 'small (slower, higher accuracy)', 'tiny（最快，精度较低）': 'tiny (fastest, lower accuracy)',
  'video（可选，无需扩展名），支持 {变量名}': 'video (optional, no extension needed), supports {variable}',
  '• 全新下载引擎，支持更多加密格式': '\u2022 New download engine supporting more encrypted formats',
  '• 匹配失败：未检测到目标人脸': '\u2022 No match: target face not detected', '• 匹配成功：检测到目标人脸': '\u2022 Match: target face detected',
  '• 可用于人脸采集、证件拍摄等场景': '\u2022 Good for face capture, ID photos, etc.', '• 可用于视频采集、监控录像等场景': '\u2022 Good for video capture, surveillance recording, etc.',
  '• 增大音量过小的音频': '\u2022 Boost audio that is too quiet', '• 处理时间较长，需要重新编码视频': '\u2022 Takes longer; the video must be re-encoded',
  '• 多线程下载，速度更快': '\u2022 Multi-threaded download for higher speed', '• 字幕会被烧录到视频中（硬字幕）': '\u2022 Subtitles are burned into the video (hard subs)',
  '• 录制期间会阻塞工作流，完成后继续执行': '\u2022 The workflow is blocked during recording and continues afterward', '• 提取视频封面图': '\u2022 Extract the video cover image',
  '• 支持 AES-128、SAMPLE-AES 等加密方式': '\u2022 Supports AES-128, SAMPLE-AES and other encryption', '• 烧录后无法移除或修改字幕': '\u2022 Once burned in, subtitles cannot be removed or changed',
  '• 照片保存为 JPG 格式': '\u2022 Photos are saved as JPG', '• 统一多个音频的音量': '\u2022 Normalize the volume of multiple audios', '• 自动合并音视频为 MP4 格式': '\u2022 Automatically merge audio and video into MP4',
  '• 自动打开摄像头并录制指定时长的视频': '\u2022 Automatically open the camera and record a video of the given length', '• 自动打开摄像头并拍摄一张照片': '\u2022 Automatically open the camera and take a photo',
  '• 视频保存为 MP4 格式': '\u2022 Videos are saved as MP4', '• 视频关键帧提取': '\u2022 Extract video keyframes', '• 视频内容预览': '\u2022 Preview video content', '• 降低音量过大的音频': '\u2022 Lower audio that is too loud',
  '⚡ 非阻塞模式：录屏在后台进行，不会阻塞后续模块执行': '\u26a1 Non-blocking mode: screen recording runs in the background without blocking later modules',
})

Object.assign(UI_DICT, {
  '下载线程数': 'Download threads', '下载设置': 'Download settings', '与原音频混合': 'Mix with original audio', '中画质（推荐）': 'Medium quality (recommended)', '中等（推荐）': 'Medium (recommended)', '二维码内容': 'QR code content', '代理与解密': 'Proxy & decryption', '低画质（文件小）': 'Low quality (small file)',
  '使用场景：': 'Use case:', '使用本地 Whisper 模型进行语音识别，无需网络连接': 'Use a local Whisper model for speech recognition, no network needed', '使用系统代理': 'Use system proxy', '俄语': 'Russian',
  '保存文件路径的变量名（可选）': 'Variable for the saved file path (optional)', '保存照片文件路径到变量': 'Save the photo file path to a variable', '保存视频文件路径到变量': 'Save the video file path to a variable', '保持原始': 'Keep original', '保持宽高比': 'Keep aspect ratio',
  '分支说明：': 'Branch notes:', '分辨率（可选）': 'Resolution (optional)', '功能特点：': 'Features:', '包含 matched、confidence、source_faces 等信息': 'Includes matched, confidence, source_faces, etc.', '匹配容差 (0-1)': 'Match tolerance (0-1)', '压缩质量 (1-100)': 'Compression quality (1-100)',
  '压缩速度越慢，相同码率下质量越好': 'Slower compression gives better quality at the same bitrate', '压缩预设': 'Compression preset', '原音频音量 (0-2)': 'Original audio volume (0-2)', '合并后的文件路径': 'Path of the merged file', '合并类型': 'Merge type', '同步调整音频速度': 'Adjust audio speed in sync',
  '启用后视频不会变形，禁用则强制缩放到指定尺寸': 'When enabled the video keeps its shape; when disabled it is forced to the given size', '启用后音频速度会同步调整，禁用则保持原音频': 'When enabled audio speed adjusts in sync; when disabled the original audio is kept',
  '图片尺寸（像素）': 'Image size (px)', '图片文件': 'Image file', '图片格式': 'Image format', '图片水印': 'Image watermark', '圆角半径（像素）': 'Corner radius (px)', '垂直翻转（上下颠倒）': 'Flip vertically (upside down)', '填写包含文件路径的列表变量名，至少需要2个文件': 'Enter a list variable of file paths; at least 2 files needed',
  '如: white, #FF0000，支持 {变量名}': 'e.g. white, #FF0000, supports {variable}', '媒体类型': 'Media type', '字体大小': 'Font size', '字体颜色': 'Font color', '字幕文件路径': 'Subtitle file path', '字幕文件路径（.srt/.ass），支持 {变量名}': 'Subtitle file path (.srt/.ass), supports {variable}',
  '存储识别结果的变量': 'Variable for the recognition result', '存储输出图片路径': 'Store the output image path', '存储输出文件路径': 'Store the output file path', '将在此图片中检测人脸': 'Faces will be detected in this image', '居中': 'Center', '屏幕区域': 'Screen region', '帧率': 'Frame rate',
  '常用于修正手机拍摄的视频方向': 'Often used to fix the orientation of phone-shot videos', '常用分辨率：': 'Common resolutions:', '并发下载线程数，默认8线程': 'Concurrent download threads, default 8', '开始时间': 'Start time', '录制完成后才会继续执行后续模块': 'Later modules run only after recording finishes', '录制时长（秒）': 'Recording length (s)',
  '录制过程中工作流会等待，与桌面录屏的非阻塞模式不同': 'The workflow waits during recording, unlike the non-blocking desktop screen recording', '待识别图片路径': 'Path of the image to recognize', '德语': 'German', '快速': 'Fast', '慢速（质量较高）': 'Slow (higher quality)', '摄像头索引': 'Camera index', '播放速度倍数': 'Playback speed multiplier',
  '支持 .jpg、.jpeg、.png 格式': 'Supports .jpg, .jpeg, .png', '支持 SRT、ASS、SSA 格式字幕文件': 'Supports SRT, ASS, SSA subtitle files', '支持格式: 00:01:30 或 90（秒）': 'Formats: 00:01:30 or 90 (seconds)', '支持音频和视频文件': 'Supports audio and video files', '数值越小压缩率越高，文件越小，但质量越低': 'Smaller values compress more (smaller file) but lower quality',
  '文件路径列表变量，如: {视频列表}': 'List variable of file paths, e.g. {videoList}', '文字水印': 'Text watermark', '新音频音量 (0-2)': 'New audio volume (0-2)', '旋转/翻转类型': 'Rotate/flip type', '旋转180度': 'Rotate 180\u00b0', '时间点': 'Time point', '替换原音频': 'Replace original audio', '最大宽度（可选）': 'Max width (optional)', '最大高度（可选）': 'Max height (optional)',
  '极快（质量较低）': 'Very fast (lower quality)', '极慢（最高质量）': 'Very slow (highest quality)', '某些网站需要Referer来防止盗链': 'Some sites require a Referer to prevent hotlinking', '格式: HH:MM:SS 或秒数，支持 {变量名}': 'Format: HH:MM:SS or seconds, supports {variable}', '模型大小': 'Model size', '水印位置': 'Watermark position', '水印图片路径': 'Watermark image path', '水印文字': 'Watermark text',
  '水印文字内容，支持 {变量名}': 'Watermark text content, supports {variable}', '水印类型': 'Watermark type', '水平翻转（镜像）': 'Flip horizontally (mirror)', '法语': 'French', '源文件路径，支持 {变量名}': 'Source file path, supports {variable}', '源视频路径，支持 {变量名}': 'Source video path, supports {variable}', '用于比对的目标人脸（应只包含一张人脸）': 'The target face for comparison (should contain only one face)', '用于解密加密的 HLS 流': 'Used to decrypt an encrypted HLS stream',
})

Object.assign(UI_DICT, {
  '画质': 'Quality', '留空不限制，如: 1080': 'Leave blank for no limit, e.g. 1080', '留空不限制，如: 1920': 'Leave blank for no limit, e.g. 1920', '留空使用默认，支持 {变量名}': 'Leave blank for default, supports {variable}', '留空则保存到临时目录': 'Leave blank to save to the temp directory', '留空则保存到用户图片文件夹': 'Leave blank to save to the user Pictures folder', '留空则保存到用户视频文件夹': 'Leave blank to save to the user Videos folder',
  '留空则在源文件同目录生成': 'Leave blank to generate in the source file\u2019s folder', '留空则截取到视频结尾': 'Leave blank to cut to the end of the video', '留空则自动生成': 'Leave blank to auto-generate', '留空则自动生成文件名，输出为 MP4 格式': 'Leave blank to auto-generate the file name; output is MP4', '留空则自动生成（PNG格式）': 'Leave blank to auto-generate (PNG)',
  '留空则自动生成，如: camera_20260129_143000.jpg': 'Leave blank to auto-generate, e.g. camera_20260129_143000.jpg', '留空则自动生成，如: camera_20260129_143000.mp4': 'Leave blank to auto-generate, e.g. camera_20260129_143000.mp4', '留空则覆盖源文件': 'Leave blank to overwrite the source file',
  '目标人脸图片路径': 'Target face image path', '目标宽度（像素）': 'Target width (px)', '目标高度（像素）': 'Target height (px)', '纠错级别': 'Error-correction level', '终点坐标（右下角）': 'End coordinate (bottom-right)', '结束时间': 'End time', '自动选择最佳画质': 'Auto-select the best quality', '自动（摄像头默认）': 'Auto (camera default)', '自定义代理': 'Custom proxy', '自定义请求头': 'Custom headers',
  '英语': 'English', '西班牙语': 'Spanish', '要编码的文本或URL': 'Text or URL to encode', '要转换的音频文件': 'Audio file to convert', '视频': 'Video', '视频保存目录，支持 {变量名}': 'Video save directory, supports {variable}', '视频原有音频的音量，设为0可静音原音频': 'Volume of the video\u2019s original audio; set to 0 to mute it', '视频拼接（多个视频首尾相连）': 'Video concatenation (join multiple videos end to end)', '视频文件路径': 'Video file path', '视频文件路径，支持 {变量名}': 'Video file path, supports {variable}',
  '解密密钥': 'Decryption key', '识别类型': 'Recognition type', '识别语言': 'Recognition language', '质量等级 CRF (0-51)': 'Quality level CRF (0-51)', '起点坐标（左上角）': 'Start coordinate (top-left)', '越小越严格，0.6为默认值，建议0.4-0.6': 'Smaller is stricter; 0.6 is the default, 0.4-0.6 recommended', '输入图片路径': 'Input image path', '输入完整的 M3U8/HLS 播放列表链接': 'Enter the full M3U8/HLS playlist link', '输入文件列表': 'Input file list', '输入文件路径': 'Input file path', '输入视频路径': 'Input video path', '输入音频路径': 'Input audio path',
  '输出图片路径（可选）': 'Output image path (optional)', '输出文件名': 'Output file name', '输出文件夹': 'Output folder', '输出文件路径': 'Output file path', '输出文件路径（可选）': 'Output file path (optional)', '输出格式': 'Output format', '输出目录': 'Output directory', '输出路径（可选）': 'Output path (optional)', '逆时针旋转90度': 'Rotate 90\u00b0 counter-clockwise', '选择保存位置': 'Choose save location', '选择字幕文件': 'Choose subtitle file', '选择文件': 'Choose file', '选择源文件': 'Choose source file', '选择视频': 'Choose video', '选择视频文件': 'Choose video file', '选择输出目录': 'Choose output directory', '选择音频文件': 'Choose audio file',
  '透明度 (0-1)': 'Opacity (0-1)', '通用文字（支持多行）': 'General text (multi-line)', '部分摄像头可能不支持所有分辨率': 'Some cameras may not support all resolutions', '音视频合并（将音频添加到视频）': 'Merge audio and video (add audio to video)', '音量倍数': 'Volume multiplier', '音频': 'Audio', '音频/视频文件路径，支持 {变量名}': 'Audio/video file path, supports {variable}', '音频处理方式': 'Audio handling', '音频拼接（多个音频首尾相连）': 'Audio concatenation (join multiple audios end to end)', '音频文件路径': 'Audio file path', '音频文件路径，支持 {变量名}': 'Audio file path, supports {variable}', '音频格式': 'Audio format', '音频比特率': 'Audio bitrate',
  '顺时针旋转90度': 'Rotate 90\u00b0 clockwise', '首次使用会自动下载模型，larger模型需要更多内存': 'The model is downloaded automatically on first use; larger models need more memory', '验证码（单行短文本）': 'Captcha (short single line)', '高画质（文件大）': 'High quality (large file)',
})

// ============================================================
// 精确整句翻译：config-panels/PhoneModuleConfigs（手机自动化模块配置）
// ============================================================
Object.assign(UI_DICT, {
  '0 = 静音，15 = 最大音量': '0 = mute, 15 = max volume',
  '1. 使用「点击」+ 手动输入': '1. Use "Tap" + manual input',
  '1. 安装后启动 Clipper APP 并赋予权限': '1. After installing, launch the Clipper app and grant permissions',
  '1. 打开手机「设置」→「开发者选项」': '1. Open phone Settings \u2192 Developer options',
  '2. 使用剪贴板方案': '2. Use the clipboard approach',
  '2. 找到并开启「USB 安装」或「通过 USB 安装应用」': '2. Find and enable "USB install" or "Install apps via USB"',
  '2. 最好将 APP 的省电策略改成"无限制"': '2. Best to set the app\u2019s battery policy to "Unrestricted"',
  '3. 部分手机可能显示为「USB 调试（安全设置）」': '3. Some phones show it as "USB debugging (Security settings)"',
  'ADBKeyboard 已安装，现在可以输入中文了！': 'ADBKeyboard is installed; you can now type Chinese!',
  'APK文件路径': 'APK file path', 'Activity名称（可选）': 'Activity name (optional)',
  'Back键（返回）': 'Back key', 'Home键（主屏幕）': 'Home key', 'Power键（电源）': 'Power key', 'Recent键（最近任务）': 'Recents key',
  'Clipper 已安装，可以正常使用剪贴板功能。': 'Clipper is installed; clipboard features work normally.', 'Clipper 应用状态': 'Clipper app status',
  'com.example.app 或 微信': 'com.example.app or WeChat', 'com.tencent.mm 或 微信': 'com.tencent.mm or WeChat',
  '• 0 = 最暗，255 = 最亮': '\u2022 0 = darkest, 255 = brightest', '• 中等：101-150': '\u2022 Medium: 101-150',
  '• 使用 RapidOCR 进行文本识别，支持中文': '\u2022 Uses RapidOCR for text recognition, supports Chinese',
  '• 使用前请先用「点击」模块点击输入框，确保输入框已获得焦点': '\u2022 Before use, tap the input box with the "Tap" module to ensure it has focus',
  '• 使用应用名称时，只会搜索第三方应用（不包括系统应用）': '\u2022 When using an app name, only third-party apps are searched (not system apps)',
  '• 关闭前提：需手动将手机默认输入法改为 ADBKeyboard': '\u2022 Prerequisite: manually set the phone\u2019s default IME to ADBKeyboard',
  '• 关闭自动切换可以提高输入速度（减少输入法切换步骤）': '\u2022 Disabling auto-switch speeds up typing (fewer IME switches)',
  '• 写入剪贴板后，可以在手机上手动粘贴或使用按键模拟粘贴': '\u2022 After writing to the clipboard, paste manually on the phone or via simulated keys',
  '• 图像文件应该是手机屏幕上要查找的元素截图': '\u2022 The image should be a screenshot of the element to find on the phone screen',
  '• 在应用间传递文本内容': '\u2022 Pass text between apps', '• 如果剪贴板为空，变量值将为空字符串': '\u2022 If the clipboard is empty, the variable will be an empty string',
  '• 如果匹配失败，可以降低置信度或重新截取更清晰的图像': '\u2022 If matching fails, lower the confidence or recapture a clearer image',
  '• 如果应用名称匹配到多个结果，请改用包名': '\u2022 If the app name matches multiple results, use the package name instead',
  '• 如果有多个匹配，会提示使用包名': '\u2022 If there are multiple matches, you will be prompted to use the package name',
  '• 如果识别不准确，可以尝试使用"包含"模式或正则表达式': '\u2022 If recognition is inaccurate, try "Contains" mode or a regex',
  '• 如果识别失败，可以尝试降低匹配精度': '\u2022 If recognition fails, try lowering the match precision',
  '• 媒体音量：影响音乐、视频等媒体播放': '\u2022 Media volume: affects music, video and other media playback',
  '• 建议使用PNG格式的图像文件': '\u2022 PNG image files are recommended', '• 建议值：50-200 之间': '\u2022 Recommended: between 50 and 200',
  '• 截取更小、更独特的区域可提高识别准确度': '\u2022 Capturing a smaller, more distinctive area improves accuracy',
  '• 最亮：201-255': '\u2022 Brightest: 201-255', '• 最暗：0-50': '\u2022 Darkest: 0-50',
  '• 检查间隔越小越灵敏，但会消耗更多资源': '\u2022 A smaller check interval is more responsive but uses more resources',
  '• 此操作会自动关闭手机的自动亮度功能': '\u2022 This automatically turns off the phone\u2019s auto-brightness',
  '• 此模块会持续检查手机屏幕，直到图像出现或超时': '\u2022 This module keeps checking the phone screen until the image appears or it times out',
  '• 精确、快速、不会出错': '\u2022 Precise, fast and error-free',
  '• 系统会在输入中文时自动切换到 ADBKeyboard，输入完成后自动恢复原输入法': '\u2022 The system auto-switches to ADBKeyboard when typing Chinese and restores the original IME afterward',
  '• 自动填充表单中的复杂文本': '\u2022 Auto-fill complex text in forms', '• 若需输入中文，请安装 ADBKeyboard 应用（见下方）': '\u2022 To type Chinese, install the ADBKeyboard app (see below)',
  '• 获取用户在手机上复制的内容': '\u2022 Get what the user copied on the phone',
  '• 设置方法：手机「设置」→「语言与输入法」→「默认输入法」→ 选择「ADBKeyboard」': '\u2022 Setup: phone Settings \u2192 Language & input \u2192 Default keyboard \u2192 select "ADBKeyboard"',
  '• 请使用从相同分辨率手机截取的图像作为模板': '\u2022 Use a template image captured from a phone of the same resolution',
  '• 读取应用分享到剪贴板的数据': '\u2022 Read data an app shared to the clipboard', '• 较亮：151-200': '\u2022 Brighter: 151-200', '• 较暗：51-100': '\u2022 Darker: 51-100',
  '• 输入完整包名，如：com.tencent.mm': '\u2022 Enter the full package name, e.g. com.tencent.mm', '• 输入应用名称，如：微信、抖音': '\u2022 Enter an app name, e.g. WeChat, TikTok',
  '• 适用于等待加载完成、等待按钮出现等场景': '\u2022 Good for waiting on loads, button appearance, etc.', '• 通知音量：影响应用通知声音': '\u2022 Notification volume: affects app notification sounds',
  '• 部分设备需要安装 Clipper 应用才能使用剪贴板功能': '\u2022 Some devices need the Clipper app for clipboard features', '• 配合「按键操作」中的粘贴功能，实现中文输入': '\u2022 Combine with the paste action in "Key actions" to type Chinese',
  '• 铃声音量：影响来电铃声': '\u2022 Ring volume: affects incoming-call ringtones', '• 闹钟音量：影响闹钟提醒': '\u2022 Alarm volume: affects alarm reminders',
  '• 首次使用前，请到手机「设置」→「语言与输入法」→「输入法管理」中确认 ADBKeyboard 已启用': '\u2022 Before first use, confirm ADBKeyboard is enabled under phone Settings \u2192 Language & input \u2192 Manage keyboards',
  '• 首次使用需要查询应用列表（约5-10秒）': '\u2022 First use queries the app list (about 5-10s)', '• 验证剪贴板内容是否正确': '\u2022 Verify the clipboard content is correct', '• 默认仅支持输入英文、数字和符号': '\u2022 By default only English, numbers and symbols can be typed',
})

Object.assign(UI_DICT, {
  '⌨️ ADBKeyboard 应用状态': '\u2328\ufe0f ADBKeyboard app status', '⌨️ 输入法切换设置': '\u2328\ufe0f IME switching settings',
  '⏱️ 安装过程可能需要几秒到几十秒，请耐心等待': '\u23f1\ufe0f Installation may take a few seconds to tens of seconds; please wait', '⚡ 性能优化提示': '\u26a1 Performance tips',
  '两种启动方式': 'Two launch methods', '亮度值（0-255）': 'Brightness (0-255)', '从图像资源中选择或输入路径': 'Select from image assets or enter a path', '从图像资源中选择要等待的目标图片': 'Select the target image to wait for from image assets',
  '使用「写入剪贴板」+ 「按键操作」粘贴': 'Use "Write clipboard" + "Key actions" to paste', '使用剪贴板功能需要在手机上安装 Clipper 应用。点击下方按钮一键安装：': 'Clipboard features require the Clipper app on the phone. Click the button below to install:', '使用提示': 'Usage tips',
  '保存剪贴板内容的变量名': 'Variable for the clipboard content', '保存图像位置和匹配度': 'Save image position and match score', '保存图像坐标、匹配度和耗时信息': 'Save image coordinates, match score and timing', '保持屏幕常亮': 'Keep screen on', '偏移模式': 'Offset mode', '偏移模式：指定起点坐标和滑动距离': 'Offset mode: specify the start coordinate and slide distance',
  '停止应用会强制关闭应用进程，类似于在系统设置中"强行停止"': 'Stopping an app force-kills its process, like "Force stop" in system settings', '先点击输入框，暂停工作流，手动输入中文': 'Tap the input box first, pause the workflow, and type Chinese manually', '关闭当前正在运行的屏幕镜像窗口': 'Close the currently running screen-mirror window', '关闭手机屏幕（仅镜像显示）': 'Turn off the phone screen (mirror display only)',
  '其他输入中文的方案': 'Other ways to type Chinese', '剪贴板内容': 'Clipboard content', '加载设备列表中...': 'Loading device list...', '勾选后会在输入文本后自动按下回车键': 'When checked, presses Enter automatically after typing', '包含：文本中包含目标文本即可': 'Contains: matches if the text contains the target', '匹配第几个': 'Which match',
  '单击：快速点击一次；长按：按住1秒后松开': 'Tap: a quick single tap; Long-press: hold for 1s then release', '卸载操作不可恢复，请谨慎使用': 'Uninstalling is irreversible; use with care', '图像匹配的相似度阈值（0.1-1.0）': 'Image match similarity threshold (0.1-1.0)', '图像匹配的相似度阈值（0.1-1.0），值越高要求越严格': 'Image match similarity threshold (0.1-1.0); higher is stricter', '图像文件路径': 'Image file path',
  '在使用此功能前，请确保已在手机上开启「USB 安装」选项：': 'Before using this, make sure "USB install" is enabled on the phone:', '在当前焦点输入框中输入文本，支持变量引用': 'Type text into the currently focused input; supports variable references', '在手机屏幕上查找并点击包含此文本的位置': 'Find and tap the spot on the phone screen containing this text', '在找到的图像区域内的哪个位置点击': 'Where to tap within the found image area',
  '坐标模式': 'Coordinate mode', '坐标模式：指定起点和终点坐标': 'Coordinate mode: specify the start and end coordinates', '垂直偏移（像素）': 'Vertical offset (px)', '如果屏幕上有多个匹配的文本，点击第几个（从1开始）': 'If multiple matches appear, which one to tap (starting from 1)', '如果未开启此选项，安装将会失败！': 'If this option is off, installation will fail!', '媒体音量': 'Media volume', '完全匹配': 'Exact match', '完全匹配：文本必须完全相同': 'Exact match: the text must be identical',
  '将文本内容写入到手机的剪贴板，支持变量引用': 'Write text to the phone clipboard; supports variable references', '屏幕镜像会打开一个新窗口显示手机画面，可以在电脑上直接操作手机': 'Screen mirroring opens a new window showing the phone; you can operate the phone from your computer', '已连接的设备：': 'Connected devices:', '常用亮度值': 'Common brightness values', '应用包名或名称': 'App package name or name', '手机文件路径': 'Phone file path', '手机目标路径': 'Phone target path',
  '指定截图保存的完整路径，如：C:\\screenshots\\phone.png': 'Full path to save the screenshot, e.g. C:\\screenshots\\phone.png', '指定要启动的Activity，留空则启动默认Activity': 'Specify the Activity to launch; leave blank for the default', '指定要自动化的设备ID，留空则自动使用第一台设备。支持变量引用。': 'Specify the device ID to automate; leave blank to use the first device. Supports variable references.', '按键类型': 'Key type', '支持两种方式：包名（如 com.tencent.mm）或应用名称（如 微信）': 'Two ways: package name (e.g. com.tencent.mm) or app name (e.g. WeChat)',
  '文件保存到本地的路径': 'Local path to save the file', '文件在手机上的保存路径，常用目录：/sdcard/Download/、/sdcard/DCIM/': 'Save path on the phone; common dirs: /sdcard/Download/, /sdcard/DCIM/', '方式1：使用包名（推荐）': 'Method 1: use the package name (recommended)', '方式2：使用应用名称': 'Method 2: use the app name', '最大分辨率': 'Max resolution', '未安装': 'Not installed', '未检测到已连接的设备': 'No connected device detected', '本地保存路径': 'Local save path', '本地文件路径': 'Local file path', '检查中...': 'Checking...', '检查失败': 'Check failed',
  '检测到中文时自动切换到 ADBKeyboard 输入法': 'Auto-switch to the ADBKeyboard IME when Chinese is detected', '模拟按下手机的物理按键或虚拟按键': 'Simulate pressing the phone\u2019s physical or virtual keys', '正则表达式：使用正则表达式匹配': 'Regex: match using a regular expression', '正数向下，负数向上': 'Positive is down, negative is up', '正数向右，负数向左': 'Positive is right, negative is left', '每次检查之间的等待时间': 'Wait time between checks',
  '比特率越高画质越好，但占用带宽越大。建议：WiFi连接用8-16，USB连接可用更高值': 'Higher bitrate is clearer but uses more bandwidth. Recommended: 8-16 over WiFi, higher over USB', '水平偏移（像素）': 'Horizontal offset (px)', '注意事项': 'Notes', '滑动动作的持续时间，值越大滑动越慢': 'Duration of the swipe; larger values swipe more slowly', '滑动时长(秒)': 'Swipe duration (s)', '滑动模式': 'Swipe mode', '点击方式': 'Tap method', '目标设备': 'Target device', '等待图像出现的最长时间': 'Max time to wait for the image', '等待文本出现的最长时间': 'Max time to wait for the text', '系统音量': 'System volume',
  '自动切回原输入法': 'Auto-switch back to the original IME', '自动切换到 ADBKeyboard': 'Auto-switch to ADBKeyboard', '若需输入中文，请安装 ADBKeyboard 应用。点击下方按钮一键安装：': 'To type Chinese, install the ADBKeyboard app. Click the button below to install:', '要从手机拉取的文件路径': 'Path of the file to pull from the phone', '要写入到手机剪贴板的文本内容': 'Text to write to the phone clipboard', '要推送到手机的本地文件路径': 'Local file path to push to the phone', '要查找并点击的文本': 'Text to find and tap', '视频比特率（Mbps）': 'Video bitrate (Mbps)',
  '读取手机剪贴板的内容并保存到变量中': 'Read the phone clipboard and save it to a variable', '输入完成后自动回车': 'Press Enter automatically after typing', '输入完成后自动恢复到原来的输入法': 'Restore the original IME after typing', '选择': 'Select', '选择要安装的APK文件，支持变量引用': 'Choose the APK to install; supports variable references', '选择要调整的音频流类型': 'Choose the audio-stream type to adjust', '通知音量': 'Notification volume', '重新检查': 'Re-check', '重要提示': 'Important', '重要提示：必须开启 USB 安装': 'Important: USB install must be enabled',
  '铃声音量': 'Ring volume', '长按坐标': 'Long-press coordinate', '长按的持续时间': 'Long-press duration', '闹钟音量': 'Alarm volume', '限制镜像画面的最大分辨率（长边），降低可提升性能': 'Limit the mirror\u2019s max resolution (long edge); lowering it improves performance', '音量+': 'Volume +', '音量-': 'Volume -', '音量值（0-15）': 'Volume (0-15)', '音频类型': 'Audio type',
})

// ============================================================
// 精确整句翻译：config-panels/AIModuleConfigs（AI 模块配置）
// ============================================================
Object.assign(UI_DICT, {
  '/admin, /login (逗号分隔)': '/admin, /login (comma-separated)', '/blog, /docs (逗号分隔)': '/blog, /docs (comma-separated)',
  'AI 会截取当前屏幕，根据描述定位目标并返回坐标。': 'The AI captures the current screen, locates the target from your description and returns coordinates.',
  'AI 接口设置（默认取全局 AI 配置）': 'AI endpoint settings (defaults to the global AI config)',
  'AI找到的CSS选择器将保存到此变量': 'The CSS selector found by the AI is saved to this variable',
  'AI智能元素选择器': 'AI smart element selector', 'AI智能爬虫': 'AI smart crawler', 'AI视觉操作': 'AI vision action', 'AI视觉模块': 'AI vision module',
  'API密钥，支持 {变量名}': 'API key, supports {variable}', 'Cookies（可选）': 'Cookies (optional)', 'Firecrawl AI 单页数据抓取': 'Firecrawl AI single-page scraping', 'LLM提供商': 'LLM provider',
  'article, main, .content (逗号分隔)': 'article, main, .content (comma-separated)', 'nav, footer, .ads (逗号分隔)': 'nav, footer, .ads (comma-separated)',
  'glm-4v / gpt-4-vision-preview，支持 {变量名}': 'glm-4v / gpt-4-vision-preview, supports {variable}', 'glm-4v / ui-tars / gpt-4o，支持 {变量名}': 'glm-4v / ui-tars / gpt-4o, supports {variable}', 'gpt-3.5-turbo / glm-4 / deepseek-chat，支持 {变量名}': 'gpt-3.5-turbo / glm-4 / deepseek-chat, supports {variable}',
  'https://api.example.com/data，支持 {变量名}': 'https://api.example.com/data, supports {variable}', 'https://api.openai.com/v1/chat/completions，支持 {变量名}': 'https://api.openai.com/v1/chat/completions, supports {variable}', 'https://example.com/image.jpg，支持 {变量名}': 'https://example.com/image.jpg, supports {variable}', 'https://example.com，支持 {变量名}': 'https://example.com, supports {variable}', 'https://open.bigmodel.cn/api/paas/v4/chat/completions，支持 {变量名}': 'https://open.bigmodel.cn/api/paas/v4/chat/completions, supports {variable}',
  'sk-xxx 或其他API密钥，支持 {变量名}': 'sk-xxx or another API key, supports {variable}', 'sk-xxx，支持 {变量名}': 'sk-xxx, supports {variable}', '{"key": "value", "name": "{变量名}"}': '{"key": "value", "name": "{variable}"}',
  '• 不适合结构化数据提取': '\u2022 Not suitable for structured data extraction', '• 不适合需要快速响应的场景': '\u2022 Not suitable when fast response is needed', '• 仅适合提取文章内容、大段文本': '\u2022 Only good for extracting article content and long text',
  '• 优点：即使网页结构变化，也能准确找到元素': '\u2022 Pro: finds elements accurately even when the page structure changes', '• 优点：用自然语言描述即可提取数据，适应网页结构变化': '\u2022 Pro: extract data with a natural-language description, adapting to structure changes',
  '• 使用场景：网站频繁改版、选择器不稳定': '\u2022 Use case: frequently redesigned sites with unstable selectors', '• 准确率低，经常返回错误或无用的分析文本': '\u2022 Low accuracy; often returns wrong or useless analysis text', '• 准确率极低，经常找不到元素或返回错误选择器': '\u2022 Very low accuracy; often fails to find elements or returns wrong selectors',
  '• 可用于构建网站地图': '\u2022 Can be used to build a site map', '• 对复杂网页效果差，容易理解错误': '\u2022 Poor on complex pages; easily misunderstood', '• 对复杂网页效果差，容易被页面内容干扰': '\u2022 Poor on complex pages; easily distracted by page content',
  '• 工作原理：AI 访问指定 URL，分析页面后返回匹配元素的 CSS 选择器': '\u2022 How it works: the AI visits the URL, analyzes the page and returns CSS selectors for matching elements', '• 推荐使用智谱GLM-4V或OpenAI GPT-4V模型': '\u2022 Zhipu GLM-4V or OpenAI GPT-4V is recommended', '• 推荐：使用Ollama本地运行，完全免费': '\u2022 Recommended: run Ollama locally, completely free',
  '• 操作的是整个桌面屏幕（物理鼠标），请确保目标窗口在前台': '\u2022 Operates the whole desktop screen (physical mouse); make sure the target window is in front', '• 支持 Markdown、HTML、截图等格式': '\u2022 Supports Markdown, HTML, screenshot and other formats', '• 支持关键词过滤': '\u2022 Supports keyword filtering', '• 支持深度爬取和智能过滤': '\u2022 Supports deep crawling and smart filtering', '• 支持识别图片内容、提取文字、分析图表等': '\u2022 Can recognize image content, extract text, analyze charts, etc.',
  '• 智能发现网站的所有链接': '\u2022 Intelligently discover all links on a site', '• 智能提取网页结构化数据': '\u2022 Intelligently extract structured data from a page', '• 智能爬取整个网站的数据': '\u2022 Intelligently crawl an entire site\u2019s data', '• 注意：全站爬取可能需要几分钟': '\u2022 Note: full-site crawling may take a few minutes', '• 缺点：速度比传统爬虫慢，需要LLM支持': '\u2022 Con: slower than traditional crawlers and needs an LLM',
  '• 自动处理 JavaScript 渲染': '\u2022 Automatically handles JavaScript rendering', '• 自动处理分页和动态加载': '\u2022 Automatically handles pagination and lazy loading', '• 过滤广告和无关内容': '\u2022 Filters out ads and irrelevant content', '• 返回链接数组，可配合循环使用': '\u2022 Returns an array of links, usable with a loop', '• 适合 Canvas、图片按钮、防自动化页面等取不到选择器的场景': '\u2022 Good for canvas, image buttons, anti-automation pages where selectors are unavailable', '• 速度慢，成本高（消耗 API 额度）': '\u2022 Slow and costly (consumes API quota)', '• 速度极慢（10-30秒），成本高（消耗 API 额度）': '\u2022 Very slow (10-30s) and costly (consumes API quota)',
})

Object.assign(UI_DICT, {
  '人名规整': 'Normalize person names', '仅定位（不操作，返回坐标）': 'Locate only (no action, return coordinates)', '仅移动鼠标': 'Move mouse only', '从已配置模型选择': 'Choose from configured models',
  '会合并语义相同但表达不同的项，保留首个；结果为去重后数组。': 'Merges items with the same meaning but different wording, keeping the first; the result is a deduplicated array.',
  '使用传统的"获取元素列表"等模块，更快更准确': 'Use traditional modules like "Get element list" \u2014 faster and more accurate', '使用浏览器开发者工具（F12）手动获取选择器，更快更准确': 'Use the browser dev tools (F12) to get selectors manually \u2014 faster and more accurate',
  '候选类别': 'Candidate categories', '允许回退链接': 'Allow backlinks', '允许外部链接': 'Allow external links', '元素描述': 'Element description', '分支选项': 'Branch options', '包含子域名': 'Include subdomains', '包含标签 (可选)': 'Include tags (optional)', '包含路径 (可选)': 'Include paths (optional)',
  '发送 HTTP 请求并将响应存储到变量，可配合 JSON 解析模块提取数据': 'Send an HTTP request and store the response in a variable; pair with a JSON-parse module to extract data', '发送给AI的内容，支持 {变量名}': 'Content sent to the AI, supports {variable}', '变量 (Base64/路径)': 'Variable (Base64/path)', '变量名（存储完整响应 JSON）': 'Variable (stores the full response JSON)', '只提取主要内容': 'Extract main content only', '只返回包含关键词的链接，支持 {变量名}': 'Only return links containing the keyword, supports {variable}',
  '可以让AI"看"图片并回答问题。': 'Lets the AI "see" an image and answer questions.', '右键单击': 'Right click', '否（显示浏览器）': 'No (show the browser)', '图片URL': 'Image URL', '图片变量名': 'Image variable', '图片来源': 'Image source',
  '在「全局配置 → AI对话 → 多模型」中维护模型；选择后会自动填入下方地址/密钥/模型。': 'Manage models under Global Config \u2192 AI Chat \u2192 Multi-model; selecting one auto-fills the URL/key/model below.', '地址规整': 'Normalize addresses', '填写变量名，如: imageData': 'Enter a variable name, e.g. imageData', '如 YYYY-MM-DD HH:mm:ss；留空用该类型默认格式': 'e.g. YYYY-MM-DD HH:mm:ss; leave blank for the type\u2019s default format',
  '如 姓名,电话,地址  或  {"name":"姓名","price":"价格(数字)"}': 'e.g. name,phone,address  or  {"name":"name","price":"price(number)"}', '如 投诉,咨询,好评,其他（逗号分隔，至少两个）': 'e.g. complaint,inquiry,praise,other (comma-separated, at least two)', '如 英文 / 日文 / 法文 / 中文': 'e.g. English / Japanese / French / Chinese', '如 要点列表 / 一句话 / 商务正式': 'e.g. bullet list / one sentence / formal business',
  '存储响应到变量': 'Store the response in a variable', '存储回复到变量': 'Store the reply in a variable', '存储坐标到变量': 'Store the coordinates in a variable', '存储选择器到变量': 'Store the selector in a variable', '存储链接列表到变量': 'Store the link list in a variable', '实验性功能 - 不推荐生产使用': 'Experimental \u2014 not recommended for production', '已知问题：': 'Known issues:', '当前页面截图': 'Current page screenshot', '待去重列表': 'List to deduplicate',
  '必须用英文，明确指定返回格式（JSON数组等），并强调"No explanation"': 'Must be in English, explicitly specify the return format (JSON array, etc.) and emphasize "No explanation"', '忽略 Sitemap': 'Ignore sitemap', '手动填写 / 选择一个已配置模型…': 'Enter manually / choose a configured model\u2026', '执行动作': 'Action', '排除标签 (可选)': 'Exclude tags (optional)', '排除路径 (可选)': 'Exclude paths (optional)', '推荐：': 'Recommended:', '提取提示词': 'Extraction prompt', '提问内容': 'Question', '搜索关键词 (可选)': 'Search keyword (optional)', '摘要最大字数': 'Max summary length',
  '支持 JSON 格式或': 'Supports JSON format or', '支持 OpenAI、智谱GLM-4V 等视觉模型接口': 'Supports vision-model endpoints like OpenAI and Zhipu GLM-4V', '支持 OpenAI、智谱、Deepseek 等兼容接口': 'Supports compatible endpoints like OpenAI, Zhipu and Deepseek', '数值 → 纯数字': 'Number \u2192 plain number', '数组变量 {list} 或 JSON 数组 ["苹果手机","iPhone",...]（建议≤300项）': 'Array variable {list} or JSON array ["iPhone","Apple phone",...] (\u2264300 items recommended)', '无头模式': 'Headless mode', '日期/时间 → 标准格式': 'Date/time \u2192 standard format', '是（后台运行）': 'Yes (run in background)', '最大Token数': 'Max tokens', '最大爬取深度': 'Max crawl depth', '格式，支持变量引用': 'format, supports variable references', '深度越大，爬取的页面越多，耗时越长': 'Greater depth crawls more pages and takes longer', '温度 (0-2)': 'Temperature (0-2)', '用户提示词': 'User prompt',
  '用自然语言描述你想找的页面元素（建议用英文，效果更好）': 'Describe the page element you want in natural language (English works better)', '用自然语言描述要查找的元素，如：登录按钮、搜索输入框': 'Describe the element to find in natural language, e.g. login button, search box', '用自然语言描述要点击的目标，如：右上角的登录按钮': 'Describe the click target in natural language, e.g. the login button in the top-right', '电话 → 标准格式': 'Phone \u2192 standard format', '目标描述': 'Target description', '目标网页URL': 'Target page URL', '目标语言': 'Target language', '直接填写包含Base64或文件路径的变量名': 'Enter a variable name containing Base64 or a file path',
  '示例：Extract top 10 items. Return JSON: [{"title": "...", "value": 123}]. No explanation.': 'Example: Extract top 10 items. Return JSON: [{"title": "...", "value": 123}]. No explanation.', '等待时间 (毫秒，可选)': 'Wait time (ms, optional)', '系统提示词 (可选)': 'System prompt (optional)', '结果为命中的分支名（字符串）；后接「条件分支」按它路由。': 'The result is the matched branch name (string); follow with a "Condition branch" to route by it.', '结果为命中的类别名（字符串）。': 'The result is the matched category name (string).', '结果变量名，存储 {x, y} 坐标': 'Result variable, stores the {x, y} coordinates', '自定义目标格式（可选）': 'Custom target format (optional)', '要处理的文本，支持 {变量名}（如 {data}、{ai_response}）': 'Text to process, supports {variable} (e.g. {data}, {ai_response})', '要抽取的字段': 'Fields to extract', '规整类型': 'Normalization type',
  '让 AI 直接"看屏幕"定位目标并真实点击，无需任何选择器。': 'Let the AI "look at the screen" to locate the target and actually click, with no selectors.', '设定AI的角色和行为，支持 {变量名}': 'Define the AI\u2019s role and behavior, supports {variable}', '访问网页后等待指定秒数再开始分析，让页面有时间完全加载（推荐 3-5 秒）': 'Wait the given seconds after visiting the page before analyzing, letting it fully load (3-5s recommended)', '访问网页后等待指定秒数再开始爬取，让页面有时间完全加载（推荐 3-5 秒）': 'Wait the given seconds after visiting the page before crawling, letting it fully load (3-5s recommended)', '请描述这张图片中的内容，支持 {变量名}': 'Describe what is in this image, supports {variable}', '请求体（可选）': 'Request body (optional)', '请求地址': 'Request URL', '请求头（JSON 格式，可选）': 'Request headers (JSON, optional)', '请求方法': 'Request method', '超时时间 (毫秒)': 'Timeout (ms)', '返回格式': 'Return format',
  '逗号分隔字段名，或用 JSON 描述每个字段含义。结果为 JSON 对象。': 'Comma-separated field names, or describe each field in JSON. The result is a JSON object.', '重要：': 'Important:', '金额 → 纯数字': 'Amount \u2192 plain number', '链接数量限制': 'Link count limit', '需支持坐标定位的视觉模型（如 GLM-4V、UI-TARS、GPT-4o）': 'Requires a vision model with coordinate grounding (e.g. GLM-4V, UI-TARS, GPT-4o)', '页面元素截图': 'Page element screenshot', '页面加载等待时间 (秒)': 'Page load wait (s)', '页面数量限制': 'Page count limit', '风格要求（可选）': 'Style requirement (optional)',
  '🕷️ Firecrawl AI 全站数据抓取': '\ud83d\udd77\ufe0f Firecrawl AI full-site scraping', '🗺️ Firecrawl AI 网站链接抓取': '\ud83d\uddfa\ufe0f Firecrawl AI site link scraping',
})

// ============================================================
// 精确整句翻译：config-panels/DataModuleConfigs（数据模块配置）
// ============================================================
Object.assign(UI_DICT, {
  '$.data.items[0].name，支持 {变量名}': '$.data.items[0].name, supports {variable}', '%Y年%m月%d日，支持 {变量名}': '%Y-%m-%d, supports {variable}',
  '0表示第一个字符，-1表示最后一个字符': '0 is the first character, -1 is the last', '0表示第一行，-1表示最后一行': '0 is the first row, -1 is the last',
  'Base64字符串': 'Base64 string', 'Base64编码的数据，支持 {变量名}': 'Base64-encoded data, supports {variable}', 'Base64解码为文本': 'Base64 decode to text', 'Base64转文件': 'Base64 to file',
  'C:\\data，支持 {变量名}': 'C:\\data, supports {variable}', 'D:\\data\\output.txt，支持 {变量名}': 'D:\\data\\output.txt, supports {variable}',
  'Excel列名 (可选)': 'Excel column name (optional)', 'GBK（中文Windows）': 'GBK (Chinese Windows)', 'ISO 8601（本地时区）': 'ISO 8601 (local time zone)', 'JSONPath表达式': 'JSONPath expression', 'JSON对象格式，键为列名，值为单元格内容': 'JSON object: keys are column names, values are cell contents', 'Sheet名称': 'Sheet name', 'Windows换行符': 'Windows line break',
  'data_{时间戳}，支持 {变量名}': 'data_{timestamp}, supports {variable}', 'output.png，支持 {变量名}': 'output.png, supports {variable}', '{"列名1": "值1", "列名2": "值2"}，支持 {变量名}': '{"col1": "value1", "col2": "value2"}, supports {variable}',
  '为数据表格添加新列，已有的行将使用默认值填充': 'Add a new column to the data table; existing rows are filled with the default value', '仅去除开头空白': 'Trim leading whitespace only', '仅去除结尾空白': 'Trim trailing whitespace only', '仅日期': 'Date only', '仅时间': 'Time only',
  '从0开始的索引，支持 {变量名}': 'Zero-based index, supports {variable}', '从0开始，支持负数和 {变量名}': 'Zero-based, supports negatives and {variable}', '使用括号()捕获分组，如: 价格(\\d+)元': 'Use parentheses () to capture groups, e.g. price(\\d+)', '保存路径 (可选)': 'Save path (optional)', '全部大写': 'UPPERCASE', '全部小写': 'lowercase', '写入模式': 'Write mode', '分隔符': 'Delimiter', '列名': 'Column name', '列表变量名': 'List variable',
  '删除元素': 'Remove element', '删除指定索引的数据行': 'Delete the data row at the given index', '删除键': 'Remove key', '制表符': 'Tab', '单元格值': 'Cell value', '去除所有空白': 'Remove all whitespace', '去除模式': 'Trim mode', '去除首尾空白': 'Trim leading and trailing whitespace', '反转列表': 'Reverse list',
  '向数据表格添加一行数据，数据将显示在底部的数据预览面板中': 'Add a row to the data table; it appears in the data preview panel at the bottom', '填写变量名，如: jsonData': 'Enter a variable name, e.g. jsonData', '填写变量名，如: myDict': 'Enter a variable name, e.g. myDict', '填写变量名，如: myList': 'Enter a variable name, e.g. myList',
  '如: , 或 - 或留空，支持 {变量名}': 'e.g. , or - or blank, supports {variable}', '如: , 或 | 或 \\n（换行），支持 {变量名}': 'e.g. , or | or \\n (newline), supports {variable}', '如: \\d+、[a-z]+、(.+?)等': 'e.g. \\d+, [a-z]+, (.+?), etc.', '字典变量名': 'Dict variable', '字符串1': 'String 1', '字符串2': 'String 2',
  '存储弹出值到变量': 'Store the popped value in a variable', '存储长度到变量': 'Store the length in a variable', '完整日期时间': 'Full date-time', '将列表中的每个元素导出为文本文件，每个元素占一行': 'Export each list item to a text file, one item per line', '小数': 'Decimal', '常用: 逗号(,)、竖线(|)、换行(\\n)、空格( )': 'Common: comma (,), pipe (|), newline (\\n), space ( )', '弹出元素': 'Pop element', '忽略大小写': 'Ignore case', '所有值': 'All values', '所有键': 'All keys', '换行符（每行一条）': 'Newline (one per line)', '排序列表': 'Sort list',
  '提取所有匹配': 'Extract all matches', '提取捕获组': 'Extract capture group', '提取模式': 'Extract mode', '提取第一个匹配': 'Extract first match', '提示：提取所有匹配返回列表，提取捕获组返回分组内容': 'Note: "Extract all" returns a list; "Extract capture group" returns the group content', '插入元素': 'Insert element', '操作值': 'Operation value', '数据，支持 {变量名}': 'Data, supports {variable}', '文件保存目录，支持 {变量名}': 'File save directory, supports {variable}', '文件名': 'File name', '文件编码': 'File encoding', '文件转Base64': 'File to Base64', '文本编码为Base64': 'Text to Base64', '新列的名称，支持 {变量名}': 'New column name, supports {variable}', '新列的默认值，支持 {变量名}': 'New column default value, supports {variable}', '时间戳': 'Timestamp', '时间格式': 'Time format', '普通文本替换': 'Plain text replace', '替换为': 'Replace with', '替换后的文本，支持 {变量名}': 'Replacement text, supports {variable}', '替换所有匹配': 'Replace all matches', '替换模式': 'Replace mode',
  '最大值，支持 {变量名}': 'Max value, supports {variable}', '最大分割数 (可选)': 'Max splits (optional)', '最小值，支持 {变量名}': 'Min value, supports {variable}', '正则表达式替换': 'Regex replace', '此操作将清空数据表格中的所有数据，无法恢复': 'This clears all data in the table and cannot be undone', '每个单词首字母大写': 'Capitalize each word', '清空列表': 'Clear list', '清空字典': 'Clear dict', '清空数据预览面板中的所有数据': 'Clear all data in the data preview panel', '源数据变量': 'Source data variable', '用于数据导出，支持 {变量名}': 'For data export, supports {variable}', '留空则自动保存到 data 目录': 'Leave blank to auto-save to the data directory', '留空表示不限制，支持 {变量名}': 'Leave blank for no limit, supports {variable}', '留空表示到末尾，支持 {变量名}': 'Leave blank for the end, supports {variable}',
  '直接填写包含JSON数据的变量名': 'Enter a variable name containing JSON data', '直接填写要导出的列表变量名': 'Enter the list variable to export', '直接填写要操作的列表变量名': 'Enter the list variable to operate on', '直接填写要操作的字典变量名': 'Enter the dict variable to operate on', '直接填写要获取值的字典变量名': 'Enter the dict variable to get a value from', '直接填写要获取元素的列表变量名': 'Enter the list variable to get an element from', '直接填写要获取键的字典变量名': 'Enter the dict variable to get keys from', '直接填写要获取长度的列表变量名': 'Enter the list variable to get the length of', '空格': 'Space', '第一个字符串，支持 {变量名}': 'First string, supports {variable}', '第二个字符串，支持 {变量名}': 'Second string, supports {variable}', '索引位置': 'Index position', '结束位置 (可选)': 'End position (optional)', '结果为列表类型': 'The result is a list', '自定义格式': 'Custom format', '若文件已存在且包含同名Sheet，将覆盖该Sheet；若不存在则自动创建': 'If the file exists with a same-name sheet, it is overwritten; otherwise it is created', '获取类型': 'Get type', '行数据 (JSON格式)': 'Row data (JSON)', '行索引': 'Row index',
  '要分割的文本，支持 {变量名}': 'Text to split, supports {variable}', '要匹配的文本，支持 {变量名}': 'Text to match, supports {variable}', '要处理的文本，支持 {变量名}': 'Text to process, supports {variable}', '要截取的文本，支持 {变量名}': 'Text to slice, supports {variable}', '要添加/删除的值，支持 {变量名}': 'Value to add/remove, supports {variable}', '要编码的文本，支持 {变量名}': 'Text to encode, supports {variable}', '要获取的列名，支持 {变量名}': 'Column name to get, supports {variable}', '要解码的Base64字符串，支持 {变量名}': 'Base64 string to decode, supports {variable}', '要设置的值，支持 {变量名}': 'Value to set, supports {variable}', '要设置的列名，支持 {变量名}': 'Column name to set, supports {variable}', '要转换的文本，支持 {变量名}': 'Text to convert, supports {variable}', '要连接的列表变量': 'List variable to join',
  '覆盖写入': 'Overwrite', '设置键值': 'Set key-value', '起始位置': 'Start position', '转换模式': 'Convert mode', '连接符': 'Joiner', '追加元素': 'Append element', '追加写入': 'Append', '选择保存目录': 'Choose save directory', '选择导出保存目录': 'Choose export directory', '选择要转换的文件，支持 {变量名}': 'Choose the file to convert, supports {variable}', '逗号': 'Comma', '键不存在时的默认值，支持 {变量名}': 'Default when the key is missing, supports {variable}', '键值对': 'Key-value pair', '键名': 'Key name', '键名，支持 {变量名}': 'Key name, supports {variable}', '随机类型': 'Random type', '首字母大写': 'Capitalize first letter', '默认值 (可选)': 'Default value (optional)',
})

// ============================================================
// 精确整句翻译：config-panels/ControlModuleConfigs（流程控制模块配置）
// ============================================================
Object.assign(UI_DICT, {
  '#id / .class / xpath，支持 {变量名}': '#id / .class / xpath, supports {variable}',
  '0 表示不限制超时，当前模块建议: 0秒': '0 means no timeout; recommended for this module: 0s', 'HH:MM 或 HH:MM:SS，如 09:30': 'HH:MM or HH:MM:SS, e.g. 09:30', 'YYYY-MM-DD，如 2026-01-01': 'YYYY-MM-DD, e.g. 2026-01-01',
  '不为空': 'Not empty', '不包含': 'Does not contain', '不在列表中': 'Not in list', '不存在': 'Does not exist', '不等于 (!=)': 'Not equal (!=)', '与（AND）—— 两个条件都为真': 'AND \u2014 both conditions are true', '中断流程（标记失败）': 'Abort the flow (mark as failed)', '为空': 'Is empty', '以…开头': 'Starts with\u2026', '以…结尾': 'Ends with\u2026',
  '任务备注（可选）': 'Task note (optional)', '值变量名': 'Value variable', '值变量名（默认：value）': 'Value variable (default: value)', '元素变量名': 'Element variable', '元素变量名（默认：item）': 'Element variable (default: item)', '元素可见判断': 'Element-visible check', '元素检查': 'Element check', '列表变量': 'List variable', '判断类型': 'Check type', '匹配正则': 'Matches regex', '变量 / 值比较': 'Variable / value comparison', '变量比较': 'Variable comparison', '右值': 'Right value', '在列表中': 'In list', '大于 (&gt;)': 'Greater than (>)', '大于等于': 'Greater than or equal', '大于等于 (&gt;=)': 'Greater than or equal (>=)',
  '失败时可中断流程、仅警告或静默跳过，结果布尔值可存入变量供后续条件分支使用。': 'On failure you can abort the flow, only warn, or silently skip; the boolean result can be stored for later condition branches.', '如：订单号必须存在': 'e.g. the order number must exist', '字典变量': 'Dict variable', '存储断言结果布尔值，如 assert_passed': 'Store the assertion boolean, e.g. assert_passed', '存储结果到变量（可选）': 'Store the result in a variable (optional)', '存在': 'Exists', '定时方式': 'Schedule mode', '实际值': 'Actual value', '小于 (&lt;)': 'Less than (<)', '小于等于': 'Less than or equal', '小于等于 (&lt;=)': 'Less than or equal (<=)', '左值': 'Left value', '布尔判断': 'Boolean check', '延迟一段时间后执行': 'Run after a delay', '开头是': 'Starts with',
  '循环变量名': 'Loop variable', '循环变量名（默认：index）': 'Loop variable (default: index)', '循环条件': 'Loop condition', '循环次数': 'Loop count', '循环类型': 'Loop type', '循环结束值（不包含）': 'Loop end value (exclusive)', '循环起始值（默认：0）': 'Loop start value (default: 0)', '或（OR）—— 任一条件为真': 'OR \u2014 either condition is true', '指定日期时间执行': 'Run at a specific date-time', '文本包含': 'Text contains', '文本等于': 'Text equals', '断言/检查点': 'Assertion / checkpoint', '断言失败时': 'On assertion failure', '断言说明（可选）': 'Assertion note (optional)', '最大迭代次数': 'Max iterations', '期望值': 'Expected value', '期望文本': 'Expected text', '期望的文本内容，支持 {变量名}': 'Expected text content, supports {variable}',
  '本模块会"等待"到设定的时间点 / 延迟结束后，再继续往下执行（用于流程内定时门控）。\n          若要把整条工作流注册成周期计划任务，请用底栏的「计划任务」面板。': 'This module "waits" until the set time / end of the delay before continuing (an in-flow time gate). To register the whole workflow as a recurring scheduled task, use the "Scheduled tasks" panel in the bottom bar.',
  '条件': 'Condition', '条件1': 'Condition 1', '条件2': 'Condition 2', '条件循环': 'Conditional loop', '检查类型': 'Check type', '每次循环的增量（默认：1）': 'Increment per loop (default: 1)', '用于流程稳定性：在关键步骤校验数据或页面状态是否符合预期。': 'For flow reliability: verify data or page state at key steps.', '画布上暂无子流程。请先在画布上添加「子流程定义」模块，或创建分组后勾选「定义为子流程」。': 'No subflows on the canvas. Add a "Subflow definition" module first, or create a group and check "Define as subflow".', '目标日期': 'Target date', '目标时间': 'Target time', '真值：true、1、非空字符串、非空列表；假值：false、0、空字符串、null': 'Truthy: true, 1, non-empty string, non-empty list; Falsy: false, 0, empty string, null', '空 / 0 / false / none 视为不通过，其余为通过。': 'Empty / 0 / false / none count as fail; everything else passes.', '等于 (==)': 'Equal (==)', '索引变量名': 'Index variable', '索引变量名（可选）': 'Index variable (optional)', '索引变量名（默认：index）': 'Index variable (default: index)', '结尾是': 'Ends with', '结束值': 'End value', '给这个定时步骤起个名字': 'Give this timed step a name', '范围循环': 'Range loop', '表达式': 'Expression', '表达式真值': 'Expression truthiness', '要校验的值，支持 {变量名}': 'Value to verify, supports {variable}', '解析后判断真值，如 {count} 或 {is_done}': 'Evaluate truthiness after parsing, e.g. {count} or {is_done}', '计数循环': 'Count loop', '记录警告并继续': 'Log a warning and continue', '请选择子流程...': 'Select a subflow...', '起始值': 'Start value', '跳过': 'Skip', '输入 CSS 选择器或 XPath': 'Enter a CSS selector or XPath', '输入列表变量名': 'Enter a list variable', '输入变量 {变量名} 或字面量': 'Enter a variable {variable} or a literal', '输入变量 {变量名} 或表达式': 'Enter a variable {variable} or an expression', '输入变量 {变量名} 或表达式，取反': 'Enter a variable {variable} or expression, negated', '输入变量 {变量名}，判断是否为真': 'Enter a variable {variable} to test if truthy', '输入字典变量名': 'Enter a dict variable', '输入循环条件表达式': 'Enter a loop-condition expression', '输入循环次数或变量': 'Enter a loop count or variable', '运算符': 'Operator', '运行超时后': 'On run timeout', '选择子流程': 'Select subflow', '逻辑运算符': 'Logical operator', '逻辑运算（与/或/非）': 'Logical operation (AND/OR/NOT)', '重试': 'Retry', '键变量名': 'Key variable', '键变量名（默认：key）': 'Key variable (default: key)', '防止无限循环的最大次数（默认：1000）': 'Max iterations to prevent infinite loops (default: 1000)', '静默跳过本节点': 'Silently skip this node', '非（NOT）—— 对条件取反': 'NOT \u2014 negate the condition', '页面元素状态': 'Page element state',
})

// ============================================================
// 精确整句翻译：config-panels/DesktopModuleConfigs（桌面应用模块配置）
// ============================================================
Object.assign(UI_DICT, {
  'AutomationId（可选，最稳定）': 'AutomationId (optional, most stable)', 'ClassName 通配符（可选）': 'ClassName wildcard (optional)', 'UIA (推荐)': 'UIA (recommended)', 'XPath 表达式 *': 'XPath expression *', 'XPath 风格查询，支持': 'XPath-style query, supports', 'X坐标': 'X coordinate', 'Y坐标': 'Y coordinate',
  'name 包含子串（可选）': 'name contains substring (optional)', 'name 包含文字': 'name contains text', 'name 通配符': 'name wildcard', 'value 等于': 'value equals', '不限': 'Any', '传统应用': 'Legacy app', '使用 -&gt; 分隔多级菜单': 'Use -> to separate menu levels',
  '例如 *登录* 或 ?保存': 'e.g. *login* or ?save', '例如 Button*': 'e.g. Button*', '例如: --new-window': 'e.g. --new-window', '例如: C:\\Program Files\\Notepad++\\notepad++.exe': 'e.g. C:\\Program Files\\Notepad++\\notepad++.exe', '例如: C:\\Users\\Documents': 'e.g. C:\\Users\\Documents', '例如: ^s (Ctrl+S)': 'e.g. ^s (Ctrl+S)', '例如: is_enabled': 'e.g. is_enabled', '例如: 文件->打开': 'e.g. File->Open', '例如: 确定': 'e.g. OK', '例如: 记事本': 'e.g. Notepad', '例如: 记事本（可点右侧按钮选择窗口）': 'e.g. Notepad (click the button on the right to pick a window)', '例如：ctrl+s / ctrl+shift+n / alt+f4 / win+e': 'e.g. ctrl+s / ctrl+shift+n / alt+f4 / win+e', '例如：姓名,年龄,部门': 'e.g. name,age,department',
  '保存路径到变量': 'Save the path to a variable', '全选 (Ctrl+A)': 'Select all (Ctrl+A)', '切换': 'Toggle', '列名映射（可选，逗号分隔）': 'Column-name mapping (optional, comma-separated)', '列表 List': 'List', '包含不可见控件': 'Include invisible controls', '包含此文字即可': 'Must contain this text', '取消置顶': 'Unpin', '后端类型': 'Backend type', '启用模糊匹配（name 不一致也能找到相似的）': 'Enable fuzzy match (find similar even if the name differs)',
  '基于 Windows UI Automation API，支持几乎所有 Windows 桌面应用：': 'Based on the Windows UI Automation API; supports almost all Windows desktop apps:', '客户区': 'Client area', '容器名（可选，留空自动找）': 'Container name (optional, blank to auto-find)', '容器控件名': 'Container control name', '容器类型': 'Container type', '宽度': 'Width', '属性名': 'Attribute name', '应用变量': 'App variable', '应用路径': 'App path',
  '快照当前应用的完整 UI 树 + 焦点位置，AI 排错或快速感知 UI 结构必备': 'Snapshot the app\u2019s full UI tree + focus position; essential for AI debugging or quickly sensing the UI structure', '批量抓取列表/表格控件的所有行数据（影刀 DataExtraction Wizard 同款）': 'Bulk-extract all row data from a list/table control (like YingDao\u2019s DataExtraction Wizard)', '按钮文本': 'Button text', '按键间隔（秒）': 'Key interval (s)', '控件变量': 'Control variable', '控件可见': 'Control visible', '控件启用': 'Control enabled', '控件存在': 'Control exists', '控件已选中': 'Control selected', '控件树深度': 'Control-tree depth', '控件类型（可选）': 'Control type (optional)', '控件路径': 'Control path', '控件路径（推荐）': 'Control path (recommended)',
  '提取的文字保存到变量': 'Save the extracted text to a variable', '提示：如果某些控件无法识别，可以结合使用图像识别、OCR识别或真实鼠标键盘操作': 'Note: if some controls cannot be recognized, combine image recognition, OCR or real mouse/keyboard actions', '整个窗口': 'Whole window', '文本或索引': 'Text or index', '断言控件状态，不满足则节点失败（测试场景必备）': 'Assert the control state; the node fails if unmet (essential for testing)', '断言类型 *': 'Assertion type *', '智能查找：支持通配符（* ?）+ 模糊匹配 + 多属性组合，自动按评分挑最稳定的控件': 'Smart find: supports wildcards (* ?) + fuzzy match + multi-attribute combos, auto-picking the most stable control by score', '最多抓取条数': 'Max rows to extract', '期望值': 'Expected value', '期望的文字 / 值': 'Expected text / value', '查找值': 'Find value', '查找方式': 'Find method', '标题': 'Title', '树 Tree': 'Tree', '树节点': 'Tree node', '桌面应用自动化说明': 'Desktop automation notes', '模糊匹配阈值（0-1）': 'Fuzzy-match threshold (0-1)', '滚动加载（虚拟列表场景）': 'Scroll loading (for virtual lists)',
  '点击选择器按钮捕获桌面元素': 'Click the picker button to capture a desktop element', '热键组合 *': 'Hotkey combo *', '现代应用': 'Modern app', '用 + 连接多个键，支持 ctrl / shift / alt / win / 字母 / f1~f12 / enter / esc / tab 等': 'Join keys with +; supports ctrl / shift / alt / win / letters / f1-f12 / enter / esc / tab, etc.', '留空则发到当前活动窗口': 'Leave blank to send to the current active window', '留空自动生成': 'Leave blank to auto-generate', '留空获取所有窗口': 'Leave blank to get all windows', '目标X坐标': 'Target X coordinate', '目标Y坐标': 'Target Y coordinate', '类名': 'Class name', '置顶': 'Pin to top', '置顶状态': 'Pin state', '自动化ID': 'Automation ID', '范围（点击）': 'Range (click)', '获取所有项': 'Get all items', '获取状态': 'Get state', '获取选中项': 'Get selected item', '表 Table': 'Table', '表格 DataGrid': 'DataGrid', '要设置的值': 'Value to set', '要输入的文本': 'Text to type', '设置值': 'Set value', '过滤标题（可选）': 'Filter title (optional)', '返回当前键盘焦点所在的控件信息（动态分析活跃元素）': 'Return info about the control with current keyboard focus (dynamic analysis of the active element)', '返回所有候选（数组形式）': 'Return all candidates (as an array)', '进程ID': 'Process ID', '连接值': 'Connection value', '选中模式': 'Selection mode', '选择单选按钮': 'Select radio button', '选择项': 'Select item', '选项卡': 'Tab', '高度': 'Height', '鼠标按钮': 'Mouse button',
  '：Chrome、Edge、Firefox 等': ': Chrome, Edge, Firefox, etc.', '：QQ、微信、钉钉、VS Code 等': ': QQ, WeChat, DingTalk, VS Code, etc.', '：WPF、UWP、Qt、Electron 应用': ': WPF, UWP, Qt, Electron apps', '：记事本、计算器、Office 等': ': Notepad, Calculator, Office, etc.',
})

// ============================================================
// 精确整句翻译：config-panels/YtDlpModuleConfigs（yt-dlp 下载模块）
// ============================================================
Object.assign(UI_DICT, {
  '0 = 不限制': '0 = no limit', 'ASS（高级特效）': 'ASS (advanced effects)', 'FLAC（无损）': 'FLAC (lossless)', 'LRC（歌词同步）': 'LRC (synced lyrics)', 'M4A（无损转封装）': 'M4A (lossless remux)', 'Netscape cookies.txt 文件路径（可选）': 'Netscape cookies.txt path (optional)', 'SRT（推荐，通用）': 'SRT (recommended, common)', 'cookies 文件路径': 'cookies file path',
  'https://www.youtube.com/watch?v=... 支持 {变量名}': 'https://www.youtube.com/watch?v=... supports {variable}',
  '• B站 / YouTube 需要会员或登录时，启用"从浏览器读取 cookies"': '\u2022 For Bilibili/YouTube content needing membership or login, enable "Read cookies from browser"', '• 如果输出 mp4 / mkv 需要合并，确保 backend 目录下也有 ffmpeg.exe': '\u2022 If mp4/mkv output needs merging, ensure ffmpeg.exe is also in the backend directory', '• 需要把 yt-dlp.exe 放在 backend 目录下': '\u2022 Place yt-dlp.exe in the backend directory',
  '下载条目（可选）': 'Download items (optional)', '下载限速': 'Download rate limit', '不使用': 'Disabled', '中等（VBR 5）': 'Medium (VBR 5)', '仅下载音频': 'Download audio only', '仅音频': 'Audio only', '从浏览器读取 cookies': 'Read cookies from browser', '代理': 'Proxy',
  '使用 yt-dlp --download-sections 语法': 'Uses yt-dlp --download-sections syntax', '例如 *00:00:30-00:02:00': 'e.g. *00:00:30-00:02:00', '例如 *00:00:30-00:02:00（只下载 30 秒到 2 分钟之间）': 'e.g. *00:00:30-00:02:00 (download only from 30s to 2min)', '例如 1-5,7,9（留空下载全部）': 'e.g. 1-5,7,9 (blank downloads all)', '例如 5M、500K（可选）': 'e.g. 5M, 500K (optional)', '例如 http://127.0.0.1:7890 或 socks5://127.0.0.1:1080': 'e.g. http://127.0.0.1:7890 or socks5://127.0.0.1:1080', '例如 https://www.youtube.com/playlist?list=...': 'e.g. https://www.youtube.com/playlist?list=...', '例如 zh-Hans,zh-CN,en（留空则下载全部）': 'e.g. zh-Hans,zh-CN,en (blank downloads all)',
  '保存信息对象的变量名': 'Variable for the info object', '保存字幕文件路径数组的变量名（可选）': 'Variable for the subtitle path array (optional)', '保存所有文件路径的变量名（可选）': 'Variable for all file paths (optional)', '保存格式数组的变量名': 'Variable for the format array', '保留源音频（不重新编码）': 'Keep source audio (no re-encode)', '列出该视频所有可下载的清晰度/编码组合，便于决定 quality': 'List all downloadable quality/codec combos for this video to help choose quality', '单独保存封面图': 'Save the cover image separately', '只查询信息，不会下载视频本体': 'Query info only; does not download the video itself', '同时尝试下载自动生成字幕': 'Also try to download auto-generated subtitles', '同时输出 .info.json 元数据': 'Also output .info.json metadata',
  '多个语言用逗号分隔。常见：zh-Hans/zh-CN（简中）、zh-Hant（繁中）、en（英）、ja（日）、ko（韩）': 'Separate languages with commas. Common: zh-Hans/zh-CN (Simplified), zh-Hant (Traditional), en, ja, ko', '失败重试次数': 'Retry count on failure', '字幕格式': 'Subtitle format', '字幕语言': 'Subtitle language', '嵌入封面到音频': 'Embed cover into audio', '嵌入封面缩略图': 'Embed cover thumbnail', '嵌入标题/作者元数据': 'Embed title/author metadata', '嵌入章节信息': 'Embed chapter info', '强制不使用任何代理': 'Force no proxy',
  '批量下载耗时较长，且会生成大量文件。建议先用"视频信息查询"或"可用格式列表"摸清状况，再用本模块下载': 'Batch downloads take long and create many files. First use "Video info query" or "Available formats" to understand, then download here', '批量下载较慢，建议 1 小时以上': 'Batch downloads are slow; allow over an hour', '指定后会用 ffmpeg 合并/转封装': 'When set, ffmpeg merges/remuxes', '提示：': 'Tip:', '播放列表 / 频道链接': 'Playlist / channel link',
  '支持 YouTube、B站、TikTok、Twitter、Twitch、微博、抖音 等 1000+ 站点': 'Supports 1000+ sites including YouTube, Bilibili, TikTok, Twitter, Twitch, Weibo, Douyin', '支持 yt-dlp 模板变量：%(title)s 标题、%(uploader)s 作者、%(id)s ID、%(upload_date)s 日期。简单文件名也可': 'Supports yt-dlp template variables: %(title)s, %(uploader)s, %(id)s, %(upload_date)s. A simple file name also works', '支持区间、单点、组合写法。yt-dlp --playlist-items 语法': 'Supports ranges, single items and combos. Uses yt-dlp --playlist-items syntax', '支持播放列表、频道、合集、搜索结果等': 'Supports playlists, channels, collections, search results, etc.', '文件名模板': 'File-name template', '时间区间裁剪（可选）': 'Time-range trim (optional)', '最低画质': 'Lowest quality', '最低（VBR 9）': 'Lowest (VBR 9)', '最佳画质（自动）': 'Best quality (auto)', '最多下载数量': 'Max downloads', '最高（VBR 0）': 'Highest (VBR 0)', '极高（VBR 2）': 'Very high (VBR 2)', '某些站点需要 Referer 防盗链（可选）': 'Some sites need a Referer to prevent hotlinking (optional)',
  '每条记录包含 format_id / ext / resolution / fps / vcodec / acodec / tbr / filesize': 'Each record includes format_id / ext / resolution / fps / vcodec / acodec / tbr / filesize', '每行一条 Key: Value，用 | 或换行分隔': 'One Key: Value per line, separated by | or newline', '留空使用 %(playlist_title)s/%(playlist_index)s - %(title)s.%(ext)s': 'Leave blank to use %(playlist_title)s/%(playlist_index)s - %(title)s.%(ext)s', '留空使用 %(title)s.%(ext)s': 'Leave blank to use %(title)s.%(ext)s', '留空使用默认': 'Leave blank for default', '留空则保存到下载文件夹': 'Leave blank to save to the Downloads folder', '站点最佳格式': 'Site best format', '网络与认证（可选）': 'Network & auth (optional)', '自动（保留原格式）': 'Auto (keep original format)', '视频链接': 'Video link', '跳过已存在文件（断点续传）': 'Skip existing files (resume)', '输出容器': 'Output container', '输出文件名模板': 'Output file-name template',
  '返回字段：title 标题、uploader 作者、duration 时长、thumbnail 封面、view_count 播放量、upload_date 发布日期、description 简介、tags 标签 等': 'Returned fields: title, uploader, duration, thumbnail, view_count, upload_date, description, tags, etc.', '选择 cookies.txt': 'Choose cookies.txt', '需要登录后才能下载的视频可启用。从对应浏览器自动读取登录态': 'Enable for videos requiring login; reads the login state from the chosen browser', '音质等级': 'Audio quality level', '高级选项': 'Advanced options', '默认按"列表名/序号 - 标题"组织文件夹结构': 'By default, organizes folders as "playlist/index - title"',
})

// ============================================================
// 精确整句翻译：config-panels/QQModuleConfigs（QQ 自动化模块）
// ============================================================
Object.assign(UI_DICT, {
  '0 表示无限等待': '0 means wait indefinitely', 'NapCat 未安装': 'NapCat not installed', 'NapCat 状态:': 'NapCat status:', 'NapCat 需要配合 QQNT 客户端使用，请先安装 QQ': 'NapCat works with the QQNT client; install QQ first', 'OneBot API地址': 'OneBot API URL', 'QQ 支持多开，您可以：': 'QQ supports multiple instances; you can:', 'QQNT 未安装': 'QQNT not installed', 'QQ号（可选，用于快速登录）': 'QQ number (optional, for quick login)', 'QQ登录二维码': 'QQ login QR code',
  '下载 NapCat': 'Download NapCat', '下载 QQ': 'Download QQ', '不可用': 'Unavailable', '二维码加载失败': 'Failed to load QR code', '仅私聊': 'Private chat only', '仅群聊': 'Group chat only', '从图像资源中选择或输入路径/URL': 'Select from image assets or enter a path/URL', '任意消息': 'Any message', '任意消息（不匹配内容）': 'Any message (no content match)',
  '保存发送结果的变量名': 'Variable for the send result', '保存好友列表的变量名': 'Variable for the friend list', '保存收到消息的变量名': 'Variable for the received message', '保存登录信息的变量名': 'Variable for the login info', '保存群列表的变量名': 'Variable for the group list', '保存群成员列表的变量名': 'Variable for the group-member list', '包含关键词': 'Contains keyword', '匹配内容': 'Match content', '发送类型': 'Send type', '发送者QQ号（可选）': 'Sender QQ number (optional)', '只接收指定QQ号发送的消息': 'Only receive messages from the given QQ number', '只接收指定群的消息': 'Only receive messages from the given group', '可用': 'Available', '启动后会打开 QQ 客户端，首次使用需扫码登录': 'Launches the QQ client; first use requires QR-code login', '图片路径/URL': 'Image path/URL', '图片附带的文字说明': 'Text caption for the image', '或关闭手动启动的 QQ 后再启动': 'Or close the manually started QQ before launching',
  '打开 NapCat WebUI': 'Open NapCat WebUI', '打开 NapCat WebUI 管理界面：': 'Open the NapCat WebUI admin page:', '打开「启用」开关，给服务器起个名称（如：WebRPA）': 'Turn on the "Enable" switch and name the server (e.g. WebRPA)', '扫码后在手机上确认登录': 'After scanning, confirm login on your phone', '指定群文件夹ID，留空则上传到群文件根目录': 'Specify the group folder ID; leave blank to upload to the group file root', '接下来请完成以下配置：': 'Next, complete the following config:', '支持本地文件路径或网络图片URL': 'Supports a local file path or a web image URL', '未运行': 'Not running', '未连接': 'Not connected', '检测 NapCat 服务状态...': 'Checking NapCat service status...', '检测到 QQ 进程正在运行，但 NapCat 服务未启动。': 'A QQ process is running, but the NapCat service is not started.', '消息内容': 'Message content', '消息来源': 'Message source', '消息类型': 'Message type',
  '点击「保存」按钮完成配置': 'Click "Save" to finish the config', '点击「新建」按钮，选择「HTTP服务器」': 'Click "New" and choose "HTTP server"', '点击左侧「网络配置」菜单': 'Click the "Network config" menu on the left', '留空则上传到根目录': 'Leave blank to upload to the root directory', '留空则不限制发送者': 'Leave blank for any sender', '留空则不限制群': 'Leave blank for any group', '留空则使用默认地址': 'Leave blank to use the default URL', '留空则扫码登录': 'Leave blank to log in by QR code', '直接启动 NapCat（会启动新的 QQ 实例）': 'Start NapCat directly (launches a new QQ instance)', '确保 Token 输入框为空，否则会导致连接失败': 'Make sure the Token field is empty, otherwise the connection will fail', '私聊发送': 'Send private message', '私聊消息': 'Private message', '等待扫码登录...': 'Waiting for QR-code login...', '结果变量（可选）': 'Result variable (optional)', '群号': 'Group number', '群号（可选）': 'Group number (optional)', '群文件上传': 'Group file upload', '群文件夹ID（可选）': 'Group folder ID (optional)', '群消息': 'Group message', '若之前已扫码登录过，稍等片刻会自动登录': 'If you scanned to log in before, it will log in automatically after a moment',
  '要发送的消息内容': 'Message content to send', '请下载 NapCat.Shell.zip 并解压到项目根目录的 NapCat 文件夹': 'Download NapCat.Shell.zip and extract it into the NapCat folder in the project root', '请使用手机 QQ 扫描上方二维码登录': 'Scan the QR code above with mobile QQ to log in', '轮询间隔（秒）': 'Polling interval (s)', '输入或选择群号': 'Enter or select a group number', '返回好友列表数组，包含 user_id、nickname 等字段': 'Returns a friend-list array with fields like user_id, nickname', '返回对象包含: message_id, sender_id, sender_nickname, group_id, raw_message 等字段': 'Returns an object with fields like message_id, sender_id, sender_nickname, group_id, raw_message', '返回对象，包含 user_id 和 nickname 字段': 'Returns an object with user_id and nickname fields', '返回成员列表数组，包含 user_id、nickname、card 等字段': 'Returns a member-list array with fields like user_id, nickname, card', '返回群列表数组，包含 group_id、group_name 等字段': 'Returns a group-list array with fields like group_id, group_name', '配置完成': 'Config complete', '重要：清空 Token 输入框': 'Important: clear the Token field', '附带文字（可选）': 'Caption (optional)',
  '此配置仅控制轮询间隔，实际响应时间还包含 NapCat API 处理耗时（约1秒，无法优化）。\n          因此实际总间隔约为 1-1.5 秒。': 'This only controls the polling interval; actual response time also includes NapCat API processing (about 1s, not optimizable). So the real total interval is about 1-1.5s.',
})

// ============================================================
// 精确整句翻译：config-panels/UtilityToolsConfigs（实用工具模块）
// ============================================================
Object.assign(UI_DICT, {
  '#FF5733 或 FF5733': '#FF5733 or FF5733', 'HEX颜色值': 'HEX color value', 'HTML格式': 'HTML format', 'Python strftime格式，如：%Y-%m-%d %H:%M:%S': 'Python strftime format, e.g. %Y-%m-%d %H:%M:%S', 'SHA算法': 'SHA algorithm', 'UUID v1（基于时间戳）': 'UUID v1 (timestamp-based)', 'UUID v3（基于MD5哈希）': 'UUID v3 (MD5-based)', 'UUID v4（随机生成）': 'UUID v4 (random)', 'UUID v5（基于SHA1哈希）': 'UUID v5 (SHA1-based)', 'UUID版本': 'UUID version', '上下文格式（Context）': 'Context format',
  '包含大写字母 (A-Z)': 'Include uppercase (A-Z)', '包含小写字母 (a-z)': 'Include lowercase (a-z)', '包含数字 (0-9)': 'Include digits (0-9)', '包含特殊符号 (!@#$...)': 'Include special symbols (!@#$...)', '十六进制（Hex）': 'Hexadecimal (Hex)', '单面': 'Single-sided', '双面打印': 'Double-sided print', '双面（短边翻转）': 'Double-sided (flip short edge)', '双面（长边翻转）': 'Double-sided (flip long edge)', '命名空间': 'Namespace', '哈希算法': 'Hash algorithm', '大写字母': 'Uppercase letters', '字符类型': 'Character type', '字符编码': 'Character encoding', '密码长度': 'Password length', '彩色': 'Color', '打印份数': 'Copies', '打印机名称（可选）': 'Printer name (optional)', '排除易混淆字符 (il1Lo0O)': 'Exclude confusing characters (il1Lo0O)',
  '支持 #RGB、#RRGGBB 格式': 'Supports #RGB and #RRGGBB formats', '支持 PDF、Word、图片等格式': 'Supports PDF, Word, image and other formats', '文件1路径': 'File 1 path', '文件2路径': 'File 2 path', '文件夹1路径': 'Folder 1 path', '文件夹2路径': 'Folder 2 path', '日期时间 → 时间戳': 'Date-time \u2192 timestamp', '日期时间格式': 'Date-time format', '时间戳 → 日期时间': 'Timestamp \u2192 date-time', '时间戳单位': 'Timestamp unit', '格式选项': 'Format options', '横向': 'Landscape', '毫秒（Milliseconds）': 'Milliseconds', '留空使用默认打印机': 'Leave blank to use the default printer', '秒（Seconds）': 'Seconds', '移除连字符': 'Remove hyphens', '纵向': 'Portrait', '纸张大小': 'Paper size', '纸张方向': 'Paper orientation',
  '结果包含：c, m, y, k (百分比), string': 'Result includes: c, m, y, k (percent), string', '结果包含：h (0-360), s (0-100%), v (0-100%), string': 'Result includes: h (0-360), s (0-100%), v (0-100%), string', '结果变量名（CMYK对象）': 'Result variable (CMYK object)', '结果变量名（HSV对象）': 'Result variable (HSV object)', '结果变量名（差异文件列表）': 'Result variable (diff file list)', '结果变量名（差异文本）': 'Result variable (diff text)', '结果变量名（布尔值）': 'Result variable (boolean)', '统一格式（Unified）': 'Unified format', '编码（Encode）': 'Encode', '要加密的文本': 'Text to encrypt', '要编码或解码的文本': 'Text to encode or decode', '解码（Decode）': 'Decode', '输入值': 'Input value', '颜色模式': 'Color mode', '黑白': 'Black & white', '名称': 'Name',
})

// ============================================================
// 精确整句翻译：config-panels/PillowImageConfigs（Pillow 图像处理）
// ============================================================
Object.assign(UI_DICT, {
  '0.0=全黑，1.0=原始，&gt;1.0=更亮': '0.0 = black, 1.0 = original, >1.0 = brighter', '0.0=灰度，1.0=原始，&gt;1.0=色彩更鲜艳': '0.0 = grayscale, 1.0 = original, >1.0 = more vivid', '0表示不限制': '0 means no limit', '0表示图像宽度': '0 means the image width', '0表示图像高度': '0 means the image height', '1.0=原始，&gt;1.0=对比度更高': '1.0 = original, >1.0 = higher contrast', '1.0=原始，&gt;1.0=更锐利': '1.0 = original, >1.0 = sharper',
  'BICUBIC（双三次）': 'BICUBIC (bicubic)', 'BILINEAR（双线性）': 'BILINEAR (bilinear)', 'JPEG质量（仅JPEG格式）': 'JPEG quality (JPEG only)', 'LANCZOS（高质量）': 'LANCZOS (high quality)', 'NEAREST（最近邻）': 'NEAREST (nearest neighbor)', '© 2026 青云制作_彭明航': '\u00a9 2026 QingYun Studio_Peng Minghang',
  '亮度因子': 'Brightness factor', '保持宽高比，最长边不超过此值': 'Keep aspect ratio; the longest edge does not exceed this', '值越大模糊效果越强': 'Larger values blur more', '值越大，移除的颜色范围越广': 'Larger values remove a wider color range', '右下角X坐标': 'Bottom-right X', '右下角Y坐标': 'Bottom-right Y', '图像路径列表': 'Image path list', '图像间距（像素）': 'Image spacing (px)', '垂直拼接': 'Vertical stitch', '垂直翻转': 'Flip vertical', '填充颜色': 'Fill color', '容差': 'Tolerance', '对比度因子': 'Contrast factor', '左上角X坐标': 'Top-left X', '左上角Y坐标': 'Top-left Y', '平滑': 'Smooth', '平滑（强）': 'Smooth (strong)', '或输入RGB值，如"255,255,255"': 'Or enter an RGB value, e.g. "255,255,255"', '扩展画布以容纳旋转后的图像': 'Expand the canvas to fit the rotated image', '拼接方向': 'Stitch direction', '文字内容': 'Text content', '旋转角度（度）': 'Rotation angle (degrees)', '最大尺寸（像素）': 'Max size (px)', '查找边缘': 'Find edges', '模糊': 'Blur', '模糊半径': 'Blur radius', '正数逆时针，负数顺时针': 'Positive is counter-clockwise, negative is clockwise', '水平拼接': 'Horizontal stitch', '水平翻转': 'Flip horizontal', '浮雕': 'Emboss', '滤镜类型': 'Filter type', '留空则自动生成PNG': 'Leave blank to auto-generate a PNG', '白色': 'White', '红色': 'Red', '细节增强': 'Detail enhance', '绿色': 'Green', '翻转模式': 'Flip mode', '背景颜色': 'Background color', '色彩因子': 'Color factor', '蓝色': 'Blue', '轮廓': 'Contour', '输入图像': 'Input image', '输出图像（可选）': 'Output image (optional)', '边缘增强': 'Edge enhance', '边缘增强（强）': 'Edge enhance (strong)', '返回包含尺寸、格式、文件大小等信息的字典': 'Returns a dict with size, format, file size, etc.', '逗号分隔的多个图像路径': 'Comma-separated image paths', '重采样算法': 'Resampling algorithm', '锐化': 'Sharpen', '锐化因子': 'Sharpen factor', '黑色': 'Black',
})

// ============================================================
// 精确整句翻译：config-panels/PDFModuleConfigs（PDF 模块）
// ============================================================
Object.assign(UI_DICT, {
  'DPI（分辨率）': 'DPI (resolution)', 'PDF文件列表': 'PDF file list', 'PDF文件路径': 'PDF file path', 'PDF的密码': 'PDF password', 'PDF路径列表变量或逗号分隔的路径': 'PDF path list variable or comma-separated paths', '中等质量': 'Medium quality', '低质量（压缩率高）': 'Low quality (high compression)', '保存到文件（可选）': 'Save to file (optional)', '修改权限时需要的密码': 'Password required to change permissions', '允许修改': 'Allow editing', '允许复制': 'Allow copying', '允许打印': 'Allow printing', '压缩质量': 'Compression quality', '原始尺寸': 'Original size', '图片列表': 'Image list', '图片路径列表变量或逗号分隔的路径': 'Image path list variable or comma-separated paths',
  '在第几页之后插入，0表示插入到开头': 'Insert after which page; 0 inserts at the beginning', '如 1,3,5 或 2-4': 'e.g. 1,3,5 or 2-4', '如 1-3 或 1,2,5 留空插入所有页': 'e.g. 1-3 or 1,2,5; blank inserts all pages', '如 1-3,4-6,7-10': 'e.g. 1-3,4-6,7-10', '如 1-5 或 1,3,5 留空提取所有页': 'e.g. 1-5 or 1,3,5; blank extracts all pages', '如 1-5 或 1,3,5 留空旋转所有页': 'e.g. 1-5 or 1,3,5; blank rotates all pages', '如 1-5 或 1,3,5 留空转换所有页': 'e.g. 1-5 or 1,3,5; blank converts all pages', '如 3,1,2,5,4 表示新顺序': 'e.g. 3,1,2,5,4 for the new order', '对齐方式': 'Alignment', '平铺': 'Tile', '打开PDF时需要输入的密码': 'Password required to open the PDF', '打开密码（用户密码）': 'Open password (user password)', '拆分模式': 'Split mode', '按范围拆分': 'Split by range', '插入位置（页码）': 'Insert position (page number)', '支持单页、多页和范围，如: 1,3,5-8': 'Supports single, multiple and ranges, e.g. 1,3,5-8', '支持变量引用列表，或逗号分隔的多个路径': 'Supports a variable list or comma-separated paths', '文档标题': 'Document title', '新的页面顺序': 'New page order', '旋转角度': 'Rotation angle', '最小图片尺寸（像素）': 'Min image size (px)', '机密文件': 'Confidential document', '权限密码（所有者密码）': 'Permission password (owner password)', '权限设置': 'Permission settings', '每页一个PDF': 'One PDF per page', '用逗号分隔的页码，表示新的页面顺序': 'Comma-separated page numbers for the new order', '留空则保存到PDF所在目录': 'Leave blank to save to the PDF\u2019s folder', '留空则只保存到变量': 'Leave blank to save only to a variable', '目标PDF文件': 'Target PDF file', '第 {page} 页 / 共 {total} 页': 'Page {page} / {total}', '至少需要2个PDF文件': 'At least 2 PDF files are required', '要删除的页面': 'Pages to delete', '要插入的PDF文件': 'PDF file to insert', '要插入的页面范围（可选）': 'Page range to insert (optional)', '输出PDF路径': 'Output PDF path', '输出目录（可选）': 'Output directory (optional)', '过滤小于此尺寸的图片': 'Filter out images smaller than this size', '返回包含页数、标题、作者等信息的对象': 'Returns an object with page count, title, author, etc.', '逆时针90°': 'Counter-clockwise 90\u00b0', '透明度': 'Opacity', '页眉文字（可选）': 'Header text (optional)', '页脚文字（可选）': 'Footer text (optional)', '页面尺寸': 'Page size', '页面范围': 'Page range', '页面范围（可选）': 'Page range (optional)', '顺时针90°': 'Clockwise 90\u00b0', '高质量（压缩率低）': 'High quality (low compression)',
})

// ============================================================
// 精确整句翻译：CreateCustomModuleDialog（创建自定义模块）
// ============================================================
Object.assign(UI_DICT, {
  '1. 如何在工作流中使用输入参数？': '1. How do I use input parameters in a workflow?', '2. 如何返回输出值？': '2. How do I return output values?', '3. 示例': '3. Example', '下拉选择': 'Dropdown', '个节点': ' node(s)', '例如：如果定义了参数': 'For example, if a parameter is defined', '例如：如果定义了输出': 'For example, if an output is defined',
  '勾选后保存时会用画布上的节点重写模块的内部工作流；不勾选则只更新元信息/参数/输出。': 'When checked, saving rewrites the module\u2019s internal workflow with the canvas nodes; otherwise only metadata/params/outputs are updated.', '占位符': 'Placeholder', '占位符文本': 'Placeholder text', '参数使用说明': 'Parameter usage', '参数名': 'Parameter name', '参数标签': 'Parameter label', '参数说明': 'Parameter description', '图标': 'Icon',
  '在工作流中使用"设置变量"模块，将结果保存到与输出变量同名的变量中': 'Use the "Set variable" module in the workflow to save the result to a variable with the same name as the output', '在工作流的任何模块中，使用': 'In any module of the workflow, use', '基本信息': 'Basic info', '工作流信息': 'Workflow info', '工作流：使用"字符串大小写"模块将': 'Workflow: use the "String case" module to', '布尔': 'Boolean', '当前工作流包含': 'The current workflow contains', '当前模块内部包含': 'This module internally contains', '当前画布包含': 'The current canvas contains', '我的自定义模块': 'My custom modules', '描述这个模块的功能...': 'Describe what this module does...', '显示名称*': 'Display name*', '显示标签': 'Display label', '暂无参数': 'No parameters', '暂无输出': 'No outputs', '来引用输入参数': 'to reference input parameters', '标签1, 标签2': 'Tag1, Tag2', '标签（逗号分隔）': 'Tags (comma-separated)', '模块名称（英文标识符）*': 'Module name (English identifier)*', '模块执行完成后，这个变量的值会自动返回给调用者': 'After the module runs, this variable\u2019s value is returned to the caller automatically', '模块描述': 'Module description', '模块颜色': 'Module color',
  '添加参数': 'Add parameter', '添加输出': 'Add output', '用当前画布工作流替换该模块的内部实现': 'Replace the module\u2019s internal implementation with the current canvas workflow', '的变量': ' variable', '网络': 'Network', '网页操作': 'Web actions', '说明': 'Description', '转为大写，保存到': 'convert to uppercase and save to', '输入参数': 'Input parameters', '输入参数：': 'Input parameters:', '输出变量': 'Output variable', '输出变量：': 'Output variables:', '输出标签': 'Output label', '输出说明': 'Output description', '这些节点将作为自定义模块的内部实现': 'These nodes become the custom module\u2019s internal implementation', '通知': 'Notification', '，在工作流中创建一个名为': ', creates in the workflow one named', '，在日志模块中可以写': ', in the log module you can write',
})
// ============================================================
// 精确整句翻译：scheduled-tasks/TaskEditDialog & TaskCreateDialog（计划任务）
// ============================================================
Object.assign(UI_DICT, {
  '1. 路径格式：': '1. Path format:', '2. 触发方式：': '2. Trigger method:', '3. 示例：': '3. Example:', '4. 应用场景：': '4. Use cases:',
  'WebRPA启动后延迟多少秒执行任务': 'How many seconds after WebRPA starts to run the task', 'Webhook路径': 'Webhook path',
  '• 与其他自动化工具集成': '\u2022 Integrate with other automation tools', '• 接收第三方系统的通知并自动执行任务': '\u2022 Receive notifications from third-party systems and run tasks automatically', '• 通过API远程触发工作流': '\u2022 Trigger the workflow remotely via API',
  '一次性执行': 'Run once', '任务名称 *': 'Task name *', '任务描述': 'Task description', '关联工作流 *': 'Linked workflow *', '创建计划任务': 'Create scheduled task', '编辑计划任务': 'Edit scheduled task', '后台静默运行 (无头模式)': 'Run silently in background (headless)', '启动延迟（秒）': 'Startup delay (s)', '启动触发': 'On startup', '启用重复执行': 'Enable repeat', '开启后，任务触发时会自动在浏览器中打开工作流编辑页面，方便查看日志和处理用户交互。': 'When enabled, the workflow editor opens in the browser when the task triggers, for easy log viewing and user interaction.', '开启后，自动化浏览器将在后台隐藏运行，不会弹出浏览器窗口。': 'When enabled, the automation browser runs hidden in the background with no visible window.', '开始日期': 'Start date', '必须以 / 开头，只能包含字母、数字、-、_ 和 /': 'Must start with /; may only contain letters, digits, -, _ and /', '执行时间': 'Run time', '时间触发': 'By time', '每周执行': 'Weekly', '每日执行': 'Daily', '每月执行': 'Monthly', '每月第几天': 'Day of month', '每次执行完成后等待多少秒再次执行': 'How many seconds to wait after each run before running again', '点击"录制"按钮后按下热键，或手动输入（如：ctrl+shift+f1）': 'Click "Record" then press the hotkey, or type it manually (e.g. ctrl+shift+f1)', '热键触发': 'By hotkey', '热键设置': 'Hotkey settings', '留空表示无限重复': 'Leave blank for infinite repeats', '留空表示无限重复，直到手动停止': 'Leave blank for infinite repeats until stopped manually', '立即执行': 'Run now', '结束日期（可选）': 'End date (optional)', '自动打开监控页': 'Auto-open monitor page', '触发器类型 *': 'Trigger type *', '设置一个唯一的Webhook路径，用于通过HTTP请求触发任务': 'Set a unique webhook path to trigger the task via HTTP request', '调度类型': 'Schedule type', '输入任务名称': 'Enter the task name', '输入任务描述（可选）': 'Enter a task description (optional)', '运行模式设置': 'Run-mode settings', '选择星期': 'Select weekday', '通过POST请求访问以下地址触发任务': 'Send a POST request to the address below to trigger the task', '重复间隔（秒）': 'Repeat interval (s)', '间隔执行': 'By interval', '间隔秒数': 'Interval seconds',
})

// ============================================================
// 精确整句翻译：TestAllure / MathAdvanced 模块配置
// ============================================================
Object.assign(UI_DICT, {
  '一般': 'Normal', '严重': 'Critical', '严重程度': 'Severity', '中断': 'Broken', '初始化时是否删除结果目录中的旧文件': 'Whether to delete old files in the results directory on init', '失败': 'Failed', '失败原因': 'Failure reason', '如果测试失败，可以在此说明原因（可选）': 'If the test failed, explain why here (optional)', '存储测试结果的目录路径，支持变量': 'Directory path to store test results; supports variables', '截图': 'Screenshot', '报告目录': 'Report directory', '描述失败的原因': 'Describe the failure reason', '描述此步骤的具体操作': 'Describe what this step does', '描述测试用例的目的和预期结果': 'Describe the test case\u2019s purpose and expected result', '标记此步骤的执行状态': 'Mark this step\u2019s status', '标记测试用例的重要程度': 'Mark the test case\u2019s importance', '次要': 'Minor', '步骤名称': 'Step name', '步骤描述': 'Step description', '步骤状态': 'Step status', '测试套件': 'Test suite', '测试套件名称': 'Test suite name', '测试套件的名称，用于分组测试用例': 'The test suite name, used to group test cases', '测试步骤': 'Test step', '测试步骤的名称，支持变量': 'The test step name; supports variables', '测试状态': 'Test status', '测试用例': 'Test case', '测试用例ID': 'Test case ID', '测试用例名称': 'Test case name', '测试用例描述': 'Test case description', '测试用例的最终状态': 'The test case\u2019s final status', '测试用例的标题，支持变量': 'The test case title; supports variables', '清空已有结果': 'Clear existing results', '生成报告后自动在浏览器中打开': 'Open the report in the browser after generating', '生成的HTML报告存储目录，支持变量': 'Directory to store the generated HTML report; supports variables', '用于追踪的测试用例ID（可选）': 'Test case ID for tracking (optional)', '结果目录': 'Results directory', '自动打开报告': 'Auto-open report', '要添加的附件文件路径，支持变量': 'Path of the attachment file to add; supports variables', '详细描述步骤内容（可选）': 'Describe the step in detail (optional)', '详细描述测试用例的内容（可选）': 'Describe the test case in detail (optional)', '轻微': 'Trivial', '通过': 'Passed', '阻塞': 'Blocked', '附件名称': 'Attachment name', '附件在报告中显示的名称（可选，默认使用文件名）': 'Name shown for the attachment in the report (optional, defaults to the file name)', '附件的类型，影响在报告中的展示方式': 'The attachment type, affecting how it is shown in the report', '附件类型': 'Attachment type',
  'X是Y的百分之几': 'X is what percent of Y', 'λ参数': '\u03bb parameter', '二进制对数 (log2)': 'Binary log (log2)', '余弦 (cos)': 'Cosine (cos)', '保存结果的变量名': 'Variable for the result', '减少百分比': 'Decrease by percent', '函数类型': 'Function type', '反余弦 (acos)': 'Arccos (acos)', '反正切 (atan)': 'Arctan (atan)', '反正弦 (asin)': 'Arcsin (asin)', '均值': 'Mean', '均值 (μ)': 'Mean (\u03bc)', '均匀分布': 'Uniform distribution', '增加百分比': 'Increase by percent', '将数值限制在指定范围内': 'Clamp the value to the given range', '常用对数 (log10)': 'Common log (log10)', '底数': 'Base', '弧度': 'Radians', '总数 (n)': 'Total (n)', '指数': 'Exponent', '指数分布': 'Exponential distribution', '数值': 'Value', '数值1': 'Value 1', '数值2': 'Value 2', '标准差': 'Standard deviation', '标准差 (σ)': 'Standard deviation (\u03c3)', '正切 (tan)': 'Tangent (tan)', '正弦 (sin)': 'Sine (sin)', '正态分布': 'Normal distribution', '自定义底数': 'Custom base', '自然对数 (ln)': 'Natural log (ln)', '角度': 'Degrees', '角度单位': 'Angle unit', '计算 P(n,r) = n!/(n-r)!': 'Compute P(n,r) = n!/(n-r)!', '计算 e^x，其中 e 是自然常数': 'Compute e^x, where e is Euler\u2019s number', '输入底数': 'Enter the base', '输入总数或变量': 'Enter the total or a variable', '输入指数值或变量': 'Enter the exponent or a variable', '输入数值或变量': 'Enter a value or variable', '输入最大值或变量': 'Enter the max or a variable', '输入最小值或变量': 'Enter the min or a variable', '输入第一个数值或变量': 'Enter the first value or variable', '输入第二个数值或变量': 'Enter the second value or variable', '输入选取数或变量': 'Enter r or a variable', '输入非负整数或变量': 'Enter a non-negative integer or variable', '选取数 (r)': 'Choose (r)',
  '- Meta 开源模型，性能均衡': '- Meta open-source model, balanced performance', '- 免费，性能强': '- Free, strong performance', '- 免费，速度快': '- Free, fast', '- 免费，速度极快': '- Free, very fast', '- 忽略证书错误': '- Ignore certificate errors', '- 性价比极高': '- Highly cost-effective', '- 性价比高，速度快': '- Cost-effective and fast', '- 性能更强': '- Stronger performance', '- 最大化启动': '- Launch maximized', '- 最强性能': '- Top performance', '- 禁用Web安全策略': '- Disable web security', '- 禁用通知': '- Disable notifications', '- 阿里通义千问，中文友好': '- Alibaba Tongyi Qianwen, China-friendly',
})

// ============================================================
// 精确整句翻译：ScreensaverDialog / SAPModuleConfigs
// ============================================================
Object.assign(UI_DICT, {
  '270° 竖排': '270\u00b0 vertical', '90° 竖排': '90\u00b0 vertical', '从上往下': 'Top to bottom', '从下往上': 'Bottom to top', '从右往左': 'Right to left', '从左往右': 'Left to right', '倒计时目标时间': 'Countdown target time', '全屏覆盖整个桌面': 'Fullscreen over the whole desktop', '关闭桌面背景': 'Disable desktop background', '加粗': 'Bold', '字体': 'Font', '字体族': 'Font family', '字号': 'Font size', '字号 (px)': 'Font size (px)', '字重': 'Font weight',
  '常用：%H:%M:%S（时分秒）、%I:%M %p（12 小时制带上下午）、%H点%M分': 'Common: %H:%M:%S, %I:%M %p (12-hour with AM/PM), %H:%M', '常用：%Y年%m月%d日 %A、%Y-%m-%d %H:%M:%S（年月日时分秒）、%A（星期名）': 'Common: %Y-%m-%d %A, %Y-%m-%d %H:%M:%S, %A (weekday name)', '弹幕列表': 'Barrage list', '弹幕文本': 'Barrage text', '循环滚动': 'Loop scroll', '描边宽度': 'Outline width', '描边颜色（留空不描边）': 'Outline color (blank for none)', '提示：屏保由独立 Python 进程显示，会覆盖整个屏幕。按所选快捷键或双击屏幕中央可立即退出。': 'Note: the screensaver is shown by a separate Python process and covers the whole screen. Press the chosen shortcut or double-click the center to exit immediately.', '文字颜色': 'Text color', '斜体': 'Italic', '方向': 'Direction', '日期时间格式（strftime，留空使用默认 %Y-%m-%d %A）': 'Date-time format (strftime; blank uses default %Y-%m-%d %A)', '时钟时间格式（strftime，留空使用默认 %H:%M:%S）': 'Clock time format (strftime; blank uses default %H:%M:%S)', '显示文本': 'Display text', '显示退出快捷键提示': 'Show exit-shortcut hint', '浏览器会弹出"选择共享窗口"，选"整个屏幕"': 'The browser shows "Choose what to share"; pick "Entire screen"', '滚动': 'Scroll', '点击穿透到底层（背景会变透明）': 'Click-through to the layer below (background becomes transparent)', '特效': 'Effect', '独立窗口全屏覆盖桌面，不受浏览器限制': 'A separate window covers the desktop fullscreen, free of browser limits', '竖排文字': 'Vertical text', '行为': 'Behavior', '输入要显示的内容…': 'Enter the content to display\u2026', '退出快捷键': 'Exit shortcut', '速度': 'Speed', '速度（像素/秒）': 'Speed (px/s)', '重置默认': 'Reset to default', '预览（按屏幕真实比例）': 'Preview (true screen ratio)', '颜色与主题': 'Color & theme', '＋ 新增弹幕': '+ Add barrage',
  '0 - Enter（回车）': '0 - Enter', '12 - F12（取消）': '12 - F12 (Cancel)', '21 - Ctrl+S（保存）': '21 - Ctrl+S (Save)', '3 - F3（返回）': '3 - F3 (Back)', '4 - F4（帮助）': '4 - F4 (Help)', '70 - Ctrl+F（查找）': '70 - Ctrl+F (Find)', '8 - F8（执行）': '8 - F8 (Execute)', 'C:/output/sap_data.xlsx 或选个文件夹': 'C:/output/sap_data.xlsx or choose a folder', 'Key值': 'Key value', 'SAP 密码': 'SAP password', 'SAP 用户名': 'SAP username', '下拉框ID': 'Dropdown ID', '下拉框的 key 值': 'The dropdown\u2019s key value', '中文 (ZH)': 'Chinese (ZH)', '事务码（T-Code）': 'Transaction code (T-Code)', '会话变量': 'Session variable', '例如: /H/192.168.1.1/S/3200': 'e.g. /H/192.168.1.1/S/3200', '例如: MM60、ME21N、VA01': 'e.g. MM60, ME21N, VA01', '例如: S4X、ERP_PRD': 'e.g. S4X, ERP_PRD', '保存会话到变量': 'Save the session to a variable', '保存标题到变量': 'Save the title to a variable', '保存消息到变量': 'Save the message to a variable', '保存消息类型到变量（可选）': 'Save the message type to a variable (optional)', '元素ID': 'Element ID', '复选框ID': 'Checkbox ID', '客户端（Mandant）': 'Client (Mandant)', '常用：0=回车, 3=返回, 8=执行, 12=取消, 21=保存': 'Common: 0=Enter, 3=Back, 8=Execute, 12=Cancel, 21=Save', '德文 (DE)': 'German (DE)', '按钮ID': 'Button ID', '支持 .xlsx 格式，列标题自动使用 SAP 显示名称；选文件夹时会自动追加 sap_export.xlsx 文件名': 'Supports .xlsx; column titles use the SAP display names; choosing a folder appends sap_export.xlsx', '数据以列表格式保存，每行为一个字典': 'Data is saved as a list, each row a dict', '日文 (JA)': 'Japanese (JA)', '是否勾选': 'Checked or not', '登录语言': 'Login language', '窗口索引': 'Window index', '类型: S=成功, E=错误, W=警告, I=信息': 'Type: S=success, E=error, W=warning, I=info', '自动关闭所有 SAP 警告/提示弹窗': 'Auto-close all SAP warning/info dialogs', '英文 (EN)': 'English (EN)', '虚拟键编号': 'Virtual key number', '要填入的值': 'Value to fill', '连接名称（SAP Logon 快捷方式名）': 'Connection name (SAP Logon shortcut name)', '连接字符串（可选，优先于连接名称）': 'Connection string (optional, takes priority over the name)', '通过 SAP GUI 脚本录制获取元素路径': 'Get the element path via SAP GUI scripting recording', '需要 SAP GUI 已安装并开启脚本支持（事务码 RZ11 → sapgui/user_scripting = TRUE）': 'Requires SAP GUI installed with scripting enabled (T-code RZ11 \u2192 sapgui/user_scripting = TRUE)',
})

// ============================================================
// 精确整句翻译：LogPanel（日志/数据/变量底栏） / PhoneMirrorDialog（手机镜像）
// ============================================================
Object.assign(UI_DICT, {
  '100条': '100 rows', '200条': '200 rows', '300条': '300 rows', '400条': '400 rows', '500条': '500 rows', 'AI诊断': 'AI diagnose', 'Excel资源': 'Excel assets', '上传Excel': 'Upload Excel', '上传图像': 'Upload image', '下载': 'Download', '下载日志': 'Download logs', '下载本次收集到的全部数据（不受预览条数限制）': 'Download all data collected this run (not limited by the preview count)', '仅改名称': 'Rename only', '全选/取消': 'Select/clear all', '全部更新': 'Update all', '列': 'Columns', '原名': 'Old name', '发现': 'Found', '变量重命名': 'Rename variable', '图像资源': 'Image assets', '处引用了此变量': ' place(s) reference this variable', '字典': 'Dict', '字符串': 'String', '引用语法：': 'Reference syntax:',
  '执行工作流后，收集的数据将显示在这里。可在底栏选择预览条数与顺序，完整数据请点击「下载数据」或使用「导出数据表」模块导出': 'After running the workflow, collected data appears here. Choose the preview count and order in the bottom bar; for full data, click "Download data" or use the "Export data table" module', '执行日志': 'Execution log', '按 Win+Shift+S 截图，WebRPA 自动检测': 'Press Win+Shift+S to screenshot; WebRPA detects it automatically', '搜索日志...': 'Search logs...', '新名': 'New name', '日志展示有一定延迟，建议添加「提示音」模块以判断流程结束': 'Log display has some delay; add a "Beep" module to detect when the flow ends', '暂无全局变量': 'No global variables', '暂无收集的数据': 'No collected data', '暂无日志': 'No logs', '未找到匹配的日志': 'No matching logs found', '检测到变量引用需要更新': 'Variable references need updating', '添加变量': 'Add variable', '点击「添加变量」创建第一个全局变量。': 'Click "Add variable" to create your first global variable.', '筛选': 'Filter', '简洁日志': 'Concise log', '行': 'Rows', '让 AI 小助手分析最近的错误日志并给出修复方案': 'Let the AI assistant analyze recent error logs and suggest fixes', '试试其他关键词或筛选条件': 'Try other keywords or filters', '默认只显示"打印日志"模块的内容，开启「详细日志」可查看所有模块执行日志': 'By default only "Print log" output is shown; enable "Verbose log" to see all module logs',
  '1. 手机：开发者选项 → 无线调试 → 打开': '1. Phone: Developer options \u2192 Wireless debugging \u2192 On', '1. 用数据线连接手机一次（开 USB 调试）': '1. Connect the phone once via cable (with USB debugging on)', '2. 点「使用配对码配对设备」，记下显示的 IP、配对端口、6 位配对码': '2. Tap "Pair device with pairing code" and note the IP, pairing port and 6-digit code', '2. 设置端口（默认 5555），点「启用 TCP/IP」': '2. Set the port (default 5555) and click "Enable TCP/IP"', '3. 启用成功后会自动检测到 IP，拔掉数据线': '3. After enabling, the IP is detected automatically; unplug the cable', '3. 手机和电脑必须在同一 WiFi': '3. The phone and computer must be on the same WiFi', '4. 切到「日常重连」点「连接」即可，之后所有重连都不再需要数据线': '4. Switch to "Daily reconnect" and click "Connect"; no cable needed for later reconnects', '4. 在下方填入信息后点「配对」，配对成功后切换到「日常重连」即可': '4. Fill in the info below and click "Pair"; after pairing, switch to "Daily reconnect"', '5555 / 配对页显示的端口': '5555 / the port shown on the pairing page', '6 位配对码': '6-digit pairing code', '停止中...': 'Stopping...', '停止镜像': 'Stop mirroring', '功能说明': 'About this feature', '启动中...': 'Starting...',
  '启动手机屏幕镜像后，您可以在电脑上查看和操作手机屏幕。\n                    镜像窗口会自动置顶显示，方便您同时使用电脑和手机。': 'After starting screen mirroring, you can view and operate the phone screen on your computer. The mirror window stays on top so you can use both at once.', '启动镜像': 'Start mirroring', '启动镜像时自动开启"指针位置"': 'Auto-enable "Pointer location" when mirroring starts', '启用后，手机屏幕上会自动显示"指针位置"信息，帮助您精准定位坐标：': 'When enabled, the phone shows "Pointer location" info to help you pinpoint coordinates:', '如 123456': 'e.g. 123456', '如 192.168.1.42': 'e.g. 192.168.1.42', '如 39521（每次配对会变）': 'e.g. 39521 (changes each pairing)', '左上角的 X 和 Y 坐标值': 'The X and Y values in the top-left', '已经配对过的设备，每次重连只需填 IP 和连接端口（手机无线调试主页面会显示）': 'For a paired device, each reconnect only needs the IP and connection port (shown on the phone\u2019s wireless-debugging page)', '已连接的设备': 'Connected device', '开启后，镜像启动时会自动在手机屏幕顶部显示触摸坐标信息。如果您不需要查看坐标，可以取消勾选此选项。': 'When enabled, touch coordinates are shown at the top of the phone screen when mirroring starts. Uncheck if you don\u2019t need them.', '截图裁剪': 'Screenshot crop', '手机屏幕镜像': 'Phone screen mirror', '指针位置辅助功能': 'Pointer-location helper', '提示：关闭镜像窗口后，指针位置显示会自动关闭': 'Note: closing the mirror window automatically turns off the pointer-location display', '无线连接（无需数据线）': 'Wireless connection (no cable)', '未检测到设备': 'No device detected', '查看屏幕': 'View screen', '步骤：': 'Steps:', '注意：必须保持长按状态，一旦松手，左上角显示的就会变成 dX 和 dY（滑动距离），而不是坐标位置': 'Note: keep holding; once you release, the top-left shows dX and dY (slide distance) instead of coordinates', '监听端口（默认 5555）': 'Listen port (default 5555)', '设备 IP': 'Device IP', '请先用数据线连接手机，让上方设备列表出现一台设备': 'Connect the phone via cable first so a device appears in the list above', '请确保手机已通过 USB 连接并开启了 USB 调试': 'Make sure the phone is connected via USB with USB debugging enabled', '连接端口': 'Connection port', '配对端口': 'Pairing port', '镜像中': 'Mirroring', '长按屏幕不松手': 'Long-press the screen without releasing', '，即为当前触摸点的精确坐标': ', which is the exact coordinate of the current touch point', '，将指针拖拽到需要操作的位置': ', drag the pointer to where you want to operate',
})

// ============================================================
// 精确整句翻译：DocumentConvert / ConfigPanel / MCPConfigPanel
// ============================================================
Object.assign(UI_DICT, {
  'CSS样式文件（可选）': 'CSS style file (optional)', 'PDF引擎': 'PDF engine', 'Pandoc命令行参数，空格分隔': 'Pandoc CLI arguments, space-separated', 'xelatex（支持中文）': 'xelatex (supports Chinese)', '书名（可选）': 'Book title (optional)', '作者名': 'Author name', '作者（可选）': 'Author (optional)', '参考文档（样式模板，可选）': 'Reference document (style template, optional)', '如 --standalone --toc': 'e.g. --standalone --toc', '如 html, pdf, docx': 'e.g. html, pdf, docx', '如 markdown, html': 'e.g. markdown, html', '封面图片（可选）': 'Cover image (optional)', '我的电子书': 'My e-book', '提取媒体文件': 'Extract media files', '源格式（可选）': 'Source format (optional)', '生成完整HTML文档': 'Generate a complete HTML document', '留空自动检测': 'Leave blank to auto-detect', '目标格式': 'Target format', '自动换行': 'Word wrap', '输入EPUB文件': 'Input EPUB file', '输入HTML文件': 'Input HTML file', '输入LaTeX文件': 'Input LaTeX file', '输入Markdown文件': 'Input Markdown file', '输入Org文件': 'Input Org file', '输入RST文件': 'Input RST file', '输入Word文件': 'Input Word file', '输入文件': 'Input file', '输出EPUB文件（可选）': 'Output EPUB file (optional)', '输出HTML文件（可选）': 'Output HTML file (optional)', '输出Markdown文件（可选）': 'Output Markdown file (optional)', '输出PDF文件（可选）': 'Output PDF file (optional)', '输出Word文件（可选）': 'Output Word file (optional)', '输出文件（可选）': 'Output file (optional)', '选择保存文件夹': 'Choose save folder', '需要安装LaTeX环境（如MiKTeX）': 'Requires a LaTeX environment (e.g. MiKTeX)', '额外选项（可选）': 'Extra options (optional)',
  'Ctrl+点击单选，Alt+点击选择相似元素': 'Ctrl+click to select one, Alt+click to select similar elements', '便签内容': 'Note content', '便签模块用于在画布上添加注释，不会被执行': 'The note module adds annotations on the canvas and is not executed', '停止原因（可选）': 'Stop reason (optional)', '停止工作流': 'Stop workflow', '停止工作流执行': 'Stop workflow execution', '关闭当前打开的网页，无需额外配置': 'Close the currently open page; no extra config needed', '切换 CSS / XPath 选择器模式': 'Toggle CSS / XPath selector mode', '可选的节点备注': 'Optional node note', '固定间隔': 'Fixed interval', '在这里输入便签内容...': 'Enter note content here...', '将鼠标移动到目标元素上，按Ctrl+点击捕获': 'Move the mouse over the target element and Ctrl+click to capture', '展开配置面板': 'Expand config panel', '已禁用': 'Disabled', '指数退避（间隔翻倍）': 'Exponential backoff (interval doubles)', '提示：在任意输入框中使用': 'Tip: in any input box, use', '收起配置面板': 'Collapse config panel', '未填写可能导致该模块执行失败': 'Leaving this blank may cause the module to fail', '来引用变量值': 'to reference a variable value', '每次重试前的等待时间，0 表示立即重试，可缓解被限流/页面未就绪。': 'Wait time before each retry; 0 retries immediately, easing rate limits / not-ready pages.', '测试定位：在当前浏览器页面验证选择器是否命中并高亮': 'Test locate: verify and highlight the selector on the current page', '立即停止整个工作流的执行，不再执行后续模块': 'Immediately stop the whole workflow; no later modules run', '该模块暂无额外配置': 'This module has no extra config', '跳出当前循环，继续执行循环后的模块': 'Break the current loop and continue after it', '跳过当前循环的剩余部分，进入下一次循环': 'Skip the rest of this iteration and continue to the next', '跳过该模块，继续执行': 'Skip this module and continue', '输入停止原因，将显示在日志中': 'Enter a stop reason; it appears in the log', '退避策略': 'Backoff strategy', '选择一个节点查看配置': 'Select a node to see its config', '配置面板': 'Config panel', '重试次数': 'Retry count', '重试耗尽后': 'After retries are exhausted', '重试间隔（秒）': 'Retry interval (s)', '问 AI（解释 / 优化 / 修复此模块）': 'Ask AI (explain / optimize / fix this module)', '高级配置': 'Advanced config',
  '个工具': ' tool(s)', '传输方式': 'Transport', '例如 filesystem / weather / github': 'e.g. filesystem / weather / github', '例如 npx / node / python': 'e.g. npx / node / python', '共': 'Total', '名称已存在': 'Name already exists', '启动命令 *': 'Launch command *', '命令参数（每行一个）': 'Command arguments (one per line)', '和': ' and ', '官方 server 列表': 'Official server list', '已保存': 'Saved', '已添加': 'Added', '把下面字段中尖括号占位（&lt;...&gt;）替换为你的实际值即可。': 'Replace the angle-bracket placeholders (<...>) in the fields below with your actual values.', '推荐': 'Recommended', '推荐 MCP 模板': 'Recommended MCP templates', '推荐模板': 'Recommended templates', '搜索模板名称或描述…': 'Search template name or description\u2026', '服务器 URL *': 'Server URL *', '服务器名称（唯一标识，不能含空格）': 'Server name (unique ID, no spaces)', '没有找到匹配的模板': 'No matching templates found', '浏览更多 MCP 服务器': 'Browse more MCP servers', '环境变量（KEY=VALUE，每行一个）': 'Environment variables (KEY=VALUE, one per line)', '留空使用 backend 当前目录': 'Leave blank to use the backend\u2019s current directory', '自动批准的工具（可选，每行一个工具名）': 'Auto-approved tools (optional, one tool name per line)', '让你接入第三方工具到 WebRPA 小助手。\n            支持': 'Connect third-party tools to the WebRPA assistant. Supports', '请求头（Key: Value，每行一个）': 'Headers (Key: Value, one per line)', '还没有配置 MCP 服务器，点上方"添加"开始': 'No MCP servers yet; click "Add" above to start', '这些工具调用时不会要求确认。其他工具默认需要确认。': 'These tool calls will not ask for confirmation. Other tools require confirmation by default.', '选一个一键预填表单（保存前可改）': 'Pick one to prefill the form (editable before saving)', '重新连接': 'Reconnect', '需要你填的字段：': 'Fields you need to fill:', '（本地命令）、': '(local command), ', '（远程服务）。\n            配置格式与 Claude Desktop 兼容。': '(remote service). The config format is compatible with Claude Desktop.',
})

// ============================================================
// 精确整句翻译：BlindWatermark / AIMedia / FileModule / DatabaseAdvanced / ReadExcel
// ============================================================
Object.assign(UI_DICT, {
  'wm_bit_len（来自嵌入时的结果变量）': 'wm_bit_len (from the embed result variable)', '{{wm_bit_len}} 或一个具体数字': '{{wm_bit_len}} or a specific number', '从带水印的图像中提取文本。需要：相同的水印密码与图像密码，以及嵌入时返回的 wm_bit_len。': 'Extract text from a watermarked image. Requires the same watermark and image passwords plus the wm_bit_len returned at embed time.', '从带水印的图像中还原出隐藏的水印图。必须知道水印图的原始高/宽（嵌入时返回的尺寸）。': 'Recover the hidden watermark image from a watermarked image. You must know the watermark\u2019s original height/width (the size returned at embed time).', '例如 © WebRPA': 'e.g. \u00a9 WebRPA', '原图路径': 'Original image path', '原图路径（载体）': 'Original image path (carrier)', '图像密码（password_img）': 'Image password (password_img)', '嵌入时返回的 shape[0]': 'shape[0] returned at embed time', '嵌入时返回的 shape[1]': 'shape[1] returned at embed time', '带水印图像路径': 'Watermarked image path', '把一张水印图（建议黑白二值图）以隐式方式嵌入到原图。提取时必须知道水印图原尺寸 [h, w]。': 'Embed a watermark image (a black-and-white binary image is recommended) invisibly into the original. You must know the watermark\u2019s original size [h, w] to extract.', '把一段文本以隐式（肉眼不可见）方式嵌入到原图。导出后再次提取时需要相同的两个密码 + 嵌入返回的 wm_bit_len。': 'Embed text invisibly into the original image. To extract later you need the same two passwords plus the wm_bit_len returned at embed time.', '提取结果输出路径': 'Extraction output path', '水印图路径': 'Watermark image path', '水印宽度（w，像素）': 'Watermark width (w, px)', '水印密码（password_wm）': 'Watermark password (password_wm)', '水印文本': 'Watermark text', '水印高度（h，像素）': 'Watermark height (h, px)', '结果变量名（保存 wm_bit_len，提取时必须用）': 'Result variable (stores wm_bit_len, required for extraction)', '结果变量名（保存提取出的文本）': 'Result variable (stores the extracted text)', '结果变量名（保存水印图尺寸 [h,w]，提取时必须用）': 'Result variable (stores the watermark size [h,w], required for extraction)', '结果变量名（保存输出文件路径）': 'Result variable (stores the output file path)', '输出图像路径': 'Output image path', '选择嵌入水印后图像的保存目录': 'Choose where to save the watermarked image', '选择或输入原图路径': 'Choose or enter the original image path', '选择提取出的水印图保存目录': 'Choose where to save the extracted watermark image', '选文件夹（自动用『原图名_extracted.png』）或填完整路径': 'Choose a folder (auto-named "<original>_extracted.png") or enter a full path', '选文件夹（自动用『原图名_wm.png』）或填完整路径': 'Choose a folder (auto-named "<original>_wm.png") or enter a full path', '选文件夹（自动用『原图名_wm.png』）或填完整路径如 D:/photo_wm.png': 'Choose a folder (auto-named "<original>_wm.png") or enter a full path like D:/photo_wm.png', '默认 1': 'Default 1',
  'AI提供商': 'AI provider', 'API Base URL（可选）': 'API Base URL (optional)', '一只可爱的猫咪在花园里玩耍': 'A cute cat playing in the garden', '一只猫咪在草地上奔跑': 'A cat running on the grass', '低质量，模糊': 'Low quality, blurry', '图片尺寸': 'Image size', '宽高比': 'Aspect ratio', '提示词': 'Prompt', '标准': 'Standard', '模型': 'Model', '此模块会根据设置的概率随机选择执行路径。': 'This module picks an execution path at random based on the set probability.', '生动': 'Vivid', '生成数量': 'Number to generate', '自定义API': 'Custom API', '自然': 'Natural', '视频时长（秒）': 'Video length (s)', '触发路径1的概率（%）': 'Probability of path 1 (%)', '设置触发路径1的概率百分比，剩余概率将触发路径2': 'Set the probability percent for path 1; the rest goes to path 2', '说明：': 'Notes:', '请输入API Key': 'Enter an API key', '负面提示词（可选）': 'Negative prompt (optional)', '质量': 'Quality', '选择AI提供商': 'Choose an AI provider', '选择宽高比': 'Choose aspect ratio', '选择尺寸': 'Choose size', '选择模型': 'Choose model', '选择质量': 'Choose quality', '选择风格': 'Choose style', '风格': 'Style', '高清': 'HD',
  'C:\\\\Users\\\\用户名\\\\Desktop\\\\file.txt': 'C:\\Users\\username\\Desktop\\file.txt', 'C:\\\\Users\\\\用户名\\\\Documents': 'C:\\Users\\username\\Documents', 'C:\\\\Users\\\\用户名\\\\Documents\\\\file.txt': 'C:\\Users\\username\\Documents\\file.txt', 'C:\\\\Users\\\\用户名\\\\Documents\\\\新文件夹': 'C:\\Users\\username\\Documents\\NewFolder', 'C:\\\\Users\\\\用户名\\\\Documents\\\\旧文件夹': 'C:\\Users\\username\\Documents\\OldFolder', '不含扩展名': 'Without extension', '仅文件': 'Files only', '仅文件夹': 'Folders only', '列表类型': 'List type', '包含扩展名': 'With extension', '原文件夹路径': 'Source folder path', '如果目标文件已存在则覆盖': 'Overwrite if the target file exists', '开启后会递归遍历所有子文件夹': 'When enabled, recurses through all subfolders', '支持通配符，如 *.txt 或 image*.png': 'Supports wildcards, e.g. *.txt or image*.png', '文件内容': 'File content', '文件名格式': 'File-name format', '文件和文件夹': 'Files and folders', '文件夹路径': 'Folder path', '新文件夹路径': 'New folder path', '目标路径': 'Target path', '自动创建父级目录': 'Auto-create parent directories', '要写入的文本内容': 'Text content to write', '警告：删除操作不可恢复，请谨慎使用': 'Warning: deletion is irreversible; use with care', '过滤模式（可选）': 'Filter pattern (optional)', '返回对象包含：文件名、大小、创建时间、修改时间等信息': 'Returns an object with file name, size, created time, modified time, etc.', '返回布尔值：true 表示文件存在，false 表示不存在': 'Returns a boolean: true if the file exists, false otherwise', '追加': 'Append', '递归处理子文件夹': 'Process subfolders recursively',
  'SQL执行语句': 'SQL execute statement', 'SQL查询语句': 'SQL query statement', 'WHERE条件': 'WHERE clause', '{"name": "张三", "age": 25}': '{"name": "John", "age": 25}', '{"name": "张三"}': '{"name": "John"}', '删除条件（JSON格式）': 'Delete condition (JSON)', '哈希键名': 'Hash key name', '字段名': 'Field name', '密码（可选）': 'Password (optional)', '数据库文件路径': 'Database file path', '数据库编号': 'Database number', '数据（JSON格式）': 'Data (JSON)', '文档数据（JSON格式）': 'Document data (JSON)', '更新内容（JSON格式）': 'Update content (JSON)', '更新数据（JSON格式）': 'Update data (JSON)', '服务名': 'Service name', '查询条件（JSON格式）': 'Query condition (JSON)', '用户名（可选）': 'Username (optional)', '留空表示无需认证': 'Leave blank for no authentication', '自动提交事务': 'Auto-commit transactions', '表名': 'Table name', '请输入密码': 'Enter a password', '过期时间（秒，0表示不过期）': 'Expiry (seconds, 0 = never)', '连接名称': 'Connection name', '限制数量（0表示不限制）': 'Limit (0 = unlimited)', '集合名称': 'Collection name', '驱动名称': 'Driver name',
  '• 单元格：返回单个值': '\u2022 Cell: returns a single value', '• 块：返回二维数组 [[行1], [行2], ...]': '\u2022 Block: returns a 2D array [[row1], [row2], ...]', '• 行/列：返回数组 [值1, 值2, ...]': '\u2022 Row/column: returns an array [value1, value2, ...]', '列号或列字母': 'Column number or letter', '列级别': 'Column level', '单元格地址': 'Cell address', '单元格级别': 'Cell level', '块级别 (范围)': 'Block level (range)', '如 A 或 1，支持 {变量名}': 'e.g. A or 1, supports {variable}', '如 A 或 1，留空则从第1列开始，支持 {变量名}': 'e.g. A or 1; blank starts from column 1, supports {variable}', '如 A1, B2, C3，支持 {变量名}': 'e.g. A1, B2, C3, supports {variable}', '如 A1，支持 {变量名}': 'e.g. A1, supports {variable}', '如 C10，支持 {变量名}': 'e.g. C10, supports {variable}', '工作表 (可选)': 'Worksheet (optional)', '结束': 'End', '行号 (从1开始)': 'Row number (from 1)', '行级别': 'Row level', '请先在底部"Excel资源"分页中上传Excel文件': 'First upload an Excel file in the "Excel assets" tab at the bottom', '读取方式': 'Read mode', '读取结果说明：': 'Read result notes:', '起始': 'Start', '起始列 (可选)': 'Start column (optional)', '起始行 (从1开始)': 'Start row (from 1)', '选择Excel文件': 'Choose Excel file', '选择范围': 'Select range', '默认从第2行开始，跳过表头': 'Starts from row 2 by default, skipping the header', '默认工作表': 'Default worksheet',
})

// ============================================================
// 精确整句翻译：GlobalConfigDialog 残留（带项目符号/折叠空白的整句）
// ============================================================
Object.assign(UI_DICT, {
  '- 隐藏自动化特征': '- Hide automation fingerprint',
  ': 按使用量付费': ': pay as you go', ': 提供免费额度，适合测试': ': free quota available, good for testing', ': 需要先安装并下载模型，完全免费': ': requires installing and downloading the model first, completely free',
  '• 发布应用并等待管理员审核通过': '\u2022 Publish the app and wait for admin approval', '• 在"凭证与基础信息"中找到 App ID 和 App Secret': '\u2022 Find App ID and App Secret under "Credentials & Basic Info"', '• 在"权限管理"中添加所需权限': '\u2022 Add the required permissions under "Permission Management"', '• 填写应用名称和描述': '\u2022 Enter the app name and description', '• 多维表格：bitable:app': '\u2022 Bitable: bitable:app', '• 如果不同的飞书模块需要使用不同的应用，可以在模块中单独修改': '\u2022 If different Feishu modules need different apps, change it per module', '• 点击"创建企业自建应用"': '\u2022 Click "Create a custom app"', '• 电子表格：sheets:spreadsheet': '\u2022 Spreadsheet: sheets:spreadsheet', '• 访问': '\u2022 Visit', '• 这些配置仅存储在本地浏览器中，不会上传到服务器': '\u2022 These settings are stored only in your local browser and never uploaded', '• 这些配置将应用于 AI智能爬虫 和 AI元素选择器 模块': '\u2022 These settings apply to the AI Smart Crawler and AI Element Selector modules', '• 进入应用详情页面': '\u2022 Open the app details page', '• 配置后，新建飞书模块时会自动填充 App ID 和 App Secret': '\u2022 Once configured, new Feishu modules auto-fill App ID and App Secret',
  '内置的全能 AI 助手，能够回答 WebRPA 相关问题、帮你搭建/运行工作流、配置全局设置。 未配置时会自动回退使用「AI对话」的配置。': 'A built-in all-round AI assistant that answers WebRPA questions, helps build/run workflows and configure global settings. When not configured, it falls back to the AI Chat settings.',
  '支持 OpenAI 兼容协议（OpenAI / 智谱 / Deepseek / Groq / Ollama 等）。 可填基础地址（如 https://api.openai.com/v1），系统会自动补全。': 'Supports the OpenAI-compatible protocol (OpenAI / Zhipu / Deepseek / Groq / Ollama, etc.). You may enter a base URL (e.g. https://api.openai.com/v1) and it will be auto-completed.',
  '浏览器类型选项会启动对应的浏览器程序，而不是系统默认浏览器。 例如选择"Microsoft Edge"会启动系统安装的 Edge 浏览器，即使您的系统默认浏览器是 Chrome。 如果选择的浏览器未安装或路径不正确，请使用"自定义浏览器路径"手动指定。': 'The browser-type option launches the matching browser, not the system default. For example, "Microsoft Edge" launches the installed Edge even if your default is Chrome. If the chosen browser is missing or the path is wrong, use "Custom browser path" to specify it manually.',
  '让小助手能够直接操作 WebRPA（搭建/运行工作流、修改配置等）。 关闭后小助手只能进行问答。': 'Let the assistant operate WebRPA directly (build/run workflows, change settings, etc.). When off, it can only answer questions.',
  '默认': 'Default', '默认请求头（JSON格式）': 'Default headers (JSON)', '鼠标坐标实时显示': 'Live mouse coordinates', '，其它设备访问需携带访问令牌（Token），保护文件共享 / 远程控制 / 命令执行等高危能力。': ', other devices must include an access token to connect, protecting high-risk capabilities like file sharing / remote control / command execution.',
})

// ============================================================
// 精确整句翻译：WorkflowHub 残留 / AutoBrowserDialog / DictAdvanced / Webhook
// ============================================================
Object.assign(UI_DICT, {
  '工作流仓库是一个公共平台，用户可以在这里分享和下载工作流。 你也可以搭建自己的私有仓库服务器，只需将地址改为你的服务器地址即可。': 'Workflow Hub is a public platform where users can share and download workflows. You can also host your own private hub server \u2014 just change the address to your server.',
  '测试': 'Test', '综合评分': 'Overall rating', '编辑工作流': 'Edit workflow', '编辑社区模块（版本更新）': 'Edit community module (version update)', '编辑（版本更新）': 'Edit (version update)', '自动化': 'Automation', '自动化操作': 'Automation actions', '表单填写': 'Form filling', '覆盖导入': 'Import (overwrite)', '让其他用户远程帮助你操作工作流画布': 'Let other users remotely help you operate the workflow canvas', '评论区': 'Comments', '详情 / 评论 / 评分': 'Details / comments / rating', '身份ID管理': 'Identity ID management', '输入对方的协助码，远程帮助操作': 'Enter the other person\u2019s assist code to help remotely', '还没有评论，来抢沙发吧': 'No comments yet \u2014 be the first!', '远程协助': 'Remote assist', '追加导入': 'Import (append)', '重置为默认': 'Reset to default',
  '+ 点击：选择单个元素': '+ click: select a single element', '使用高级元素选择器（推荐）': 'Use the advanced element selector (recommended)', '依次点击两个相似元素，自动识别全部': 'Click two similar elements in turn to auto-detect all', '停止选择': 'Stop selecting', '关闭浏览器': 'Close browser', '取消选择': 'Cancel selection', '可拖拽面板': 'Draggable panel', '启动选择器': 'Start picker', '在此浏览器中登录的账号，运行工作流时会保持登录状态': 'Accounts logged in here stay logged in when running the workflow', '在浏览器中按': 'In the browser, press', '导航到网址': 'Navigate to URL', '已打开': 'Opened', '批量收集管理': 'Batch collection', '支持元素选择器，选中后自动复制到剪贴板': 'Supports element selectors; the selection is auto-copied to the clipboard', '智能选择器生成': 'Smart selector generation', '替换变化部分': 'Replace the changing part', '最近复制': 'Recently copied', '激活智能元素定位助手': 'Activate the smart element-locator', '登录账号、抓取选择器一站式': 'Log in and grab selectors in one place', '相似元素自动用': 'Similar elements automatically use', '跳转': 'Go', '选择器已激活，回到浏览器操作': 'The picker is active; return to the browser', '高级元素选择器': 'Advanced element selector',
  '使用 k 表示键，v 表示值': 'Use k for key and v for value', '使用 v 表示字典中的每个值': 'Use v for each value in the dict', '使用点号分隔嵌套键': 'Use dots to separate nested keys', '例如：user.profile.name': 'e.g. user.profile.name', '例如：v * 2': 'e.g. v * 2', '例如：v > 10': 'e.g. v > 10', '升序': 'Ascending', '字典1': 'Dict 1', '字典2': 'Dict 2', '嵌套字典变量': 'Nested dict variable', '按值排序': 'Sort by value', '按键排序': 'Sort by key', '排序依据': 'Sort by', '排序方式': 'Sort order', '映射表达式（Python表达式）': 'Map expression (Python)', '路径': 'Path', '路径不存在时返回的默认值': 'Default value when the path does not exist', '输入嵌套字典变量名': 'Enter the nested dict variable', '输入第一个字典变量名': 'Enter the first dict variable', '输入第二个字典变量名': 'Enter the second dict variable', '过滤条件（Python表达式）': 'Filter condition (Python)', '键路径分隔符（默认：.）': 'Key-path separator (default: .)', '降序': 'Descending',
  '保存响应 Cookies': 'Save response cookies', '保存响应内容': 'Save response body', '保存响应头': 'Save response headers', '保存状态码': 'Save status code', '关闭后可访问自签名证书的 HTTPS 接口': 'When off, you can access HTTPS endpoints with self-signed certificates', '原始文本': 'Raw text', '响应 Cookies 变量名': 'Response cookies variable', '响应内容变量名': 'Response body variable', '响应头变量名': 'Response headers variable', '将 HTTP 状态码保存到变量': 'Save the HTTP status code to a variable', '将响应中的 Cookies 保存到变量': 'Save the response cookies to a variable', '将响应体保存到变量': 'Save the response body to a variable', '将响应头保存到变量': 'Save the response headers to a variable', '状态码变量名': 'Status-code variable', '自动跟随 3xx 重定向响应': 'Automatically follow 3xx redirects', '表单（Form）': 'Form', '请求 URL': 'Request URL', '请求体内容': 'Request body content', '请求体格式': 'Request body format', '请求头（JSON 格式）': 'Request headers (JSON)', '跟随重定向': 'Follow redirects', '选择请求体格式': 'Choose the body format', '选择请求方法': 'Choose the request method', '验证 SSL 证书': 'Verify SSL certificate',
})

// ============================================================
// 精确整句翻译：DrissionPage / ListAdvanced / PythonEditor / AIAssistantPanel / Feishu / FormatFactory
// ============================================================
Object.assign(UI_DICT, {
  'DrissionPage 控制真实浏览器内核，对反自动化检测更隐蔽，适合常规方式被风控拦截的站点。': 'DrissionPage controls a real browser kernel and is stealthier against anti-automation detection \u2014 good for sites blocked by normal methods.', 'JavaScript 脚本': 'JavaScript script', 'text:文字': 'text:text', 'text:登录 或 #submit': 'text:Login or #submit', '保存页面 HTML 到变量': 'Save the page HTML to a variable', '元素定位符': 'Element locator', '关闭 DrissionPage 浏览器，释放资源。通常放在流程末尾。': 'Close the DrissionPage browser to free resources. Usually placed at the end of the flow.', '向上滚动像素': 'Scroll up by pixels', '向下滚动像素': 'Scroll down by pixels', '否（显示浏览器窗口）': 'No (show the browser window)', '定位符支持：': 'Locator supports:', '是（后台无界面）': 'Yes (headless)', '最长等待秒数': 'Max wait seconds', '滚到底部': 'Scroll to bottom', '滚到顶部': 'Scroll to top', '滚动像素': 'Scroll pixels', '等待出现的元素定位符': 'Locator of the element to wait for', '等待秒数': 'Wait seconds', '网址 URL': 'URL', '要输入的文本，支持 {变量}': 'Text to type, supports {variable}', '输入内容': 'Input content', '输入框定位符': 'Input-box locator', '返回值保存到变量': 'Save the return value to a variable',
  '1表示只扁平化一层，-1表示完全扁平化': '1 flattens one level, -1 flattens completely', '使用 x 表示列表中的每个元素': 'Use x for each element in the list', '例如：x * 2': 'e.g. x * 2', '例如：x > 10': 'e.g. x > 10', '保存索引的变量名': 'Variable for the index', '保存计数的变量名': 'Variable for the count', '列表1': 'List 1', '列表2': 'List 2', '块大小': 'Chunk size', '嵌套列表变量': 'Nested list variable', '扁平化深度': 'Flatten depth', '抽样数量': 'Sample size', '每块的元素数量': 'Items per chunk', '结果变量（索引）': 'Result variable (index)', '要抽取的元素数量': 'Number of elements to sample', '计数值': 'Count value', '输入嵌套列表变量名': 'Enter the nested list variable', '输入第一个列表变量名': 'Enter the first list variable', '输入第二个列表变量名': 'Enter the second list variable', '输入要查找的值': 'Enter the value to find', '输入要计数的值': 'Enter the value to count',
  '- for 循环': '- for loop', '- if-else 语句': '- if-else statement', '- while 循环': '- while loop', '- 主函数模板': '- main function template', '- 写入文件': '- write file', '- 异常处理': '- exception handling', '- 类定义': '- class definition', '- 读取文件': '- read file', 'Python 代码编辑器': 'Python code editor', '• 可以在配置中选择使用本地 Python': '\u2022 You can choose local Python in the config', '• 支持命令行参数传递': '\u2022 Supports passing command-line arguments', '• 标准输出和错误可保存到变量': '\u2022 Stdout and stderr can be saved to variables', '• 返回码 0 表示成功': '\u2022 Return code 0 means success', '• 默认使用 WebRPA 内置的 Python 3.13': '\u2022 Uses WebRPA\u2019s built-in Python 3.13 by default', '代码片段': 'Code snippet', '加载编辑器...': 'Loading editor...', '常用模块': 'Common modules', '提示：使用': 'Tip: use', '注释/取消注释': 'Comment / uncomment', '点击插入': 'Click to insert', '触发代码补全': 'Trigger code completion', '触发补全': 'Trigger completion', '输入以下关键词触发补全：': 'Type the following keywords to trigger completion:',
  'AI 操作时间线（可一键回退）': 'AI action timeline (one-click revert)', '切换模型': 'Switch model', '回退到此前': 'Revert to before', '回退到这一步操作之前的画布状态': 'Revert the canvas to before this step', '图片需视觉模型；文档将提取文字发给 AI': 'Images need a vision model; documents are sent to the AI as extracted text', '小助手仅作为辅助工具，它并不能完全替代人工！': 'The assistant is only a helper and cannot fully replace human work!', '小助手对画布的每次改动都会记录在这里，可一键回退到任意一步之前': 'Every canvas change by the assistant is logged here; revert to before any step with one click', '我了解 WebRPA 的方方面面，能帮你搭建工作流、运行任务、答疑解惑；不止于此，我还能直接操作你的电脑—— 打开软件、管理文件、执行命令、控制鼠标键盘等都不在话下。': 'I know WebRPA inside out and can help you build workflows, run tasks and answer questions. Beyond that, I can operate your computer directly \u2014 opening software, managing files, running commands, controlling mouse and keyboard, and more.', '我是一个': 'I am a', '拖拽调整输入框高度': 'Drag to resize the input box', '按场景自动选模型': 'Auto-pick model by scene', '无法完全取代人工搭建': 'Cannot fully replace manual building', '暂无 AI 画布操作': 'No AI canvas actions yet', '暂无历史对话': 'No chat history', '松手上传文件给小助手': 'Release to upload files to the assistant', '清空记录': 'Clear records', '系统级智能 Agent': 'System-level AI Agent', '解析中': 'Parsing', '请先在全局配置中填写小助手的模型': 'Please set the assistant\u2019s model in Global Config first', '，更适合作为你的搭档：先让它快速搭出基本框架或提建议，再由你完善细节。': ', and works better as your partner: let it quickly draft a basic framework or suggestions, then you refine the details.', '，能直接操作你的电脑—— 打开/关闭软件、管理文件、运行命令与脚本、看屏截图、控制鼠标键盘、联网查资料，自己规划步骤、自己执行、自己验证。 当然，我也能顺手帮你操作 WebRPA、搭建并运行自动化工作流。': ', and can operate your computer directly \u2014 opening/closing software, managing files, running commands and scripts, taking screenshots, controlling mouse and keyboard, searching online, and planning, executing and verifying steps on its own. Of course, I can also help you operate WebRPA and build and run automation workflows.',
  '[["值1", "值2"], ["值3", "值4"]]': '[["value1", "value2"], ["value3", "value4"]]', '{"字段1": "值1", "字段2": "值2"}': '{"field1": "value1", "field2": "value2"}', '变量数据': 'Variable data', '多维表格Token': 'Bitable token', '工作表ID': 'Sheet ID', '手动输入': 'Manual input', '数据内容（JSON格式二维数组）': 'Data content (JSON 2D array)', '数据变量名': 'Data variable', '数据来源': 'Data source', '数据表ID': 'Table ID', '每页记录数': 'Records per page', '电子表格Token': 'Spreadsheet token', '记录数据（JSON格式）': 'Record data (JSON)', '请输入多维表格Token': 'Enter the bitable token', '请输入工作表ID': 'Enter the sheet ID', '请输入数据表ID': 'Enter the table ID', '请输入电子表格Token': 'Enter the spreadsheet token', '请输入飞书应用ID': 'Enter the Feishu app ID', '请输入飞书应用密钥': 'Enter the Feishu app secret', '读取范围': 'Read range', '起始单元格': 'Start cell', '选择数据来源': 'Choose the data source',
  '例如: 2M, 5000k': 'e.g. 2M, 5000k', '复制(不重编码)': 'Copy (no re-encode)', '宽度 (像素)': 'Width (px)', '宽度 (可选)': 'Width (optional)', '开始时间 (可选)': 'Start time (optional)', '持续时间 (可选)': 'Duration (optional)', '文件匹配模式': 'File match pattern', '比特率': 'Bitrate', '视频比特率 (可选)': 'Video bitrate (optional)', '视频编码': 'Video codec', '输入文件夹': 'Input folder', '输入文件夹路径或使用变量': 'Enter a folder path or use a variable', '输入视频文件路径或使用变量': 'Enter a video file path or use a variable', '输入音频文件路径或使用变量': 'Enter an audio file path or use a variable', '输出文件夹 (可选)': 'Output folder (optional)', '输出路径 (可选)': 'Output path (optional)', '输出音频格式': 'Output audio format', '递归搜索子文件夹': 'Search subfolders recursively', '采样率 (可选)': 'Sample rate (optional)', '音频编码': 'Audio codec', '高度 (可选)': 'Height (optional)',
})

// ============================================================
// 精确整句翻译：Statistics / WorkflowEditor / MathList / Notify / EditCustomModule / BlockFlowView
// ============================================================
Object.assign(UI_DICT, {
  '0-100之间的数值，50表示中位数': 'A value 0-100; 50 is the median', 'CSV内容': 'CSV content', 'Min-Max归一化 (0-1)': 'Min-Max normalization (0-1)', 'Z-score标准化：(x - μ) / σ': 'Z-score normalization: (x - \u03bc) / \u03c3', '元素之间的分隔符': 'Delimiter between elements', '分隔符（默认：,）': 'Delimiter (default: ,)', '前缀（可选）': 'Prefix (optional)', '后缀（可选）': 'Suffix (optional)', '字符串前缀': 'String prefix', '字符串后缀': 'String suffix', '归一化后的最大值': 'Max after normalization', '归一化后的最小值': 'Min after normalization', '归一化方法': 'Normalization method', '数据变量': 'Data variable', '新最大值': 'New max', '新最小值': 'New min', '百分位': 'Percentile', '自定义范围': 'Custom range', '输入CSV内容或变量': 'Enter CSV content or a variable', '输入数据列表变量名': 'Enter the data list variable',
  '1. 关闭所有已打开的自动化浏览器窗口': '1. Close all open automation browser windows', '2. 如果使用了"自动化浏览器"功能，请先关闭它': '2. If you used the "Automation browser" feature, close it first', '3. 然后重新运行工作流': '3. Then run the workflow again', '上一个 (Shift+F3)': 'Previous (Shift+F3)', '下一个 (F3)': 'Next (F3)', '关闭 (ESC)': 'Close (ESC)', '工作流运行期间请勿手动关闭自动化浏览器窗口，否则会导致工作流中断。': 'Do not manually close the automation browser while the workflow runs, or it will be interrupted.', '搜索模块': 'Search modules', '搜索模块 (Ctrl+F)': 'Search modules (Ctrl+F)', '搜索模块名称或备注...': 'Search module name or note...', '操作提示': 'Tips', '支持导入 .json 格式的工作流文件': 'Supports importing .json workflow files', '未找到匹配的模块': 'No matching modules found', '检测到自动化浏览器已被关闭，工作流已自动停止运行。': 'The automation browser was closed; the workflow stopped automatically.', '检测到自动化浏览器正在被其他程序使用，无法启动新的浏览器实例。': 'The automation browser is in use by another program; a new instance cannot start.', '模块数量': 'Module count', '浏览器意外关闭': 'Browser closed unexpectedly', '浏览器被占用': 'Browser is in use', '解决方法：': 'Solution:', '释放以导入工作流': 'Release to import the workflow',
  '二进制': 'Binary', '八进制': 'Octal', '十六进制': 'Hexadecimal', '十进制': 'Decimal', '小数位数': 'Decimal places', '源进制': 'Source base', '目标进制': 'Target base', '结束索引': 'End index', '结束索引（可选，留空表示到末尾）': 'End index (optional; blank means to the end)', '被除数': 'Dividend', '起始索引': 'Start index', '起始索引（默认：0）': 'Start index (default: 0)', '输入底数或变量': 'Enter the base or a variable', '输入指数或变量': 'Enter the exponent or a variable', '输入被除数或变量': 'Enter the dividend or a variable', '输入除数或变量': 'Enter the divisor or a variable', '除数': 'Divisor',
  'Bark 设备密钥': 'Bark device key', 'Gotify 服务器 URL': 'Gotify server URL', 'Ntfy 主题': 'Ntfy topic', 'Ntfy 服务器 URL': 'Ntfy server URL', 'Server酱 SendKey': 'ServerChan SendKey', '{"message": "通知内容"}': '{"message": "notification content"}', '企业微信机器人 Webhook URL': 'WeCom bot webhook URL', '服务器URL': 'Server URL', '消息内容（JSON格式）': 'Message content (JSON)', '签名密钥（可选）': 'Signing secret (optional)', '设备密钥': 'Device key', '输入消息内容': 'Enter the message content', '钉钉机器人 Webhook URL': 'DingTalk bot webhook URL', '钉钉机器人签名密钥': 'DingTalk bot signing secret', '飞书机器人 Webhook URL': 'Feishu bot webhook URL', '飞书机器人签名密钥': 'Feishu bot signing secret',
  '例如：': 'e.g.', '例如：数据,处理,自动化': 'e.g. data,processing,automation', '例如：数据处理': 'e.g. data processing', '参数1': 'Param 1', '参数名（英文）': 'Parameter name (English)', '变量名（英文）': 'Variable name (English)', '布尔值': 'Boolean', '显示名称 *': 'Display name *', '点击下方按钮可以编辑模块内部的工作流逻辑': 'Click the button below to edit the module\u2019s internal workflow logic', '编辑内部工作流': 'Edit internal workflow', '编辑自定义模块': 'Edit custom module', '输出1': 'Output 1', '还没有参数，点击上方按钮添加': 'No parameters yet; click the button above to add', '还没有输出变量，点击上方按钮添加': 'No output variables yet; click the button above to add',
  '↑↓ 选择 · Enter 插入 · Ctrl+A 全选 · Ctrl 点选/Shift 范围 · Ctrl+D 禁用 · Delete 删除 · Ctrl+/ 折叠': '\u2191\u2193 Select \u00b7 Enter Insert \u00b7 Ctrl+A Select all \u00b7 Ctrl click / Shift range \u00b7 Ctrl+D Disable \u00b7 Delete Remove \u00b7 Ctrl+/ Collapse', '从左侧拖拽模块到这里，或点击下方「添加模块」开始搭建流程': 'Drag a module here from the left, or click "Add module" below to start building', '分支汇合': 'Branch merge', '循环': 'Loop', '并行': 'Parallel',
})

// ============================================================
// 精确整句翻译：版本历史/计划任务页/WPS/变量追踪/手机截图/截图命名/统计/块视图/数据库/图像资源/模块栏/微信
// ============================================================
Object.assign(UI_DICT, {
  '与当前画布对比': 'Compare with current canvas', '从分享包导入版本到当前工作流': 'Import versions from a share package into the current workflow', '删除此版本': 'Delete this version', '对比方向：此版本 → 当前画布': 'Diff direction: this version \u2192 current canvas', '导入分享包': 'Import share package', '导出分享包': 'Export share package', '工作区（当前画布）': 'Workspace (current canvas)', '恢复到此版本': 'Restore to this version', '把全部版本导出为分享包，供团队共享': 'Export all versions as a share package for the team', '暂无历史版本，点击上方「提交当前版本」创建第一个快照': 'No version history yet; click "Commit current version" above to create the first snapshot', '未提交的修改，提交后会成为新的版本节点': 'Uncommitted changes; committing creates a new version node', '本地快照 · 可恢复 / 对比': 'Local snapshot \u00b7 restore / compare', '版本说明（可选），如：修复登录流程': 'Version note (optional), e.g. Fix the login flow', '该版本与当前画布没有差异': 'This version has no differences from the current canvas',
  '下次：': 'Next:', '创建任务': 'Create task', '加载任务列表中…': 'Loading task list\u2026', '定时 / 热键 / 启动 / Webhook 触发': 'Schedule / hotkey / startup / webhook trigger', '工作流': 'Workflow', '总计': 'Total', '成功率': 'Success rate', '执行': 'Run', '执行中': 'Running', '最后执行': 'Last run', '点击右上角「创建任务」按钮，添加你的第一个定时 / 热键 / 启动 / Webhook 触发任务': 'Click "Create task" in the top-right to add your first schedule / hotkey / startup / webhook task', '立即创建': 'Create now', '统计信息': 'Statistics', '还没有计划任务': 'No scheduled tasks yet',
  'WPS 开放平台 (open.wps.cn)': 'WPS Open Platform (open.wps.cn)', 'WPS 开放平台应用 AK': 'WPS Open Platform app AK', 'WPS 开放平台应用 SK': 'WPS Open Platform app SK', 'data_list（字典或字典列表）': 'data_list (dict or list of dicts)', '创建应用，获取 AK / SK。\n        文件ID 与表ID 可在多维表格的分享链接 / API 设置中查看。': 'Create an app to get AK / SK. The file ID and table ID can be found in the Bitable share link / API settings.', '多维表格文件 ID': 'Bitable file ID', '子表 ID': 'Sub-table ID', '应用 AK（AccessKey）': 'App AK (AccessKey)', '应用 SK（SecretKey）': 'App SK (SecretKey)', '接口地址（可选）': 'API URL (optional)', '留空使用默认 https://openapi.wps.cn': 'Leave blank to use the default https://openapi.wps.cn', '表 ID（Sheet ID）': 'Table ID (Sheet ID)', '记录字段（JSON）': 'Record fields (JSON)', '需先在': 'You must first, in',
  '值类型': 'Value type', '全部变量': 'All variables', '全部操作': 'All actions', '全部类型': 'All types', '创建': 'Create', '导出JSON': 'Export JSON', '手动刷新': 'Refresh', '搜索变量名、模块名或值...': 'Search variable name, module name or value...', '新值': 'New value', '旧值': 'Old value', '暂无追踪记录': 'No tracking records', '更新': 'Update', '过滤器': 'Filters', '运行工作流后将显示变量变化': 'Variable changes appear after running the workflow',
  '1. 点击"重新截图"按钮截取当前手机屏幕': '1. Click "Re-capture" to capture the current phone screen', '2. 在截图上按住鼠标左键拖动框选需要的区域': '2. Hold the left mouse button on the screenshot and drag to select a region', '3. 输入图像名称并点击"保存至图像资源"': '3. Enter an image name and click "Save to image assets"', '4. 图像将自动保存到底栏的图像资源中': '4. The image is saved to image assets in the bottom bar', '保存至图像资源': 'Save to image assets', '图像名称': 'Image name', '截取手机屏幕': 'Capture phone screen', '截图并裁剪模板': 'Screenshot and crop template', '手机截图': 'Phone screenshot', '正在截取手机屏幕...': 'Capturing the phone screen...', '点击下方按钮开始截图': 'Click the button below to start capturing', '输入图像名称': 'Enter an image name', '重新截图': 'Re-capture',
  '为这张截图取个好记的名字': 'Give this screenshot a memorable name', '保存为：': 'Save as:', '保存截图': 'Save screenshot', '尝试手动按': 'Try pressing manually', '已保存到图像资源，可在底部面板的「图像资源」标签查看': 'Saved to image assets; view it in the "Image assets" tab of the bottom panel', '截图名称': 'Screenshot name', '截图失败': 'Screenshot failed', '截图成功': 'Screenshot succeeded', '故障排查': 'Troubleshooting', '确保 Windows 截图工具已启用': 'Make sure the Windows Snipping Tool is enabled', '若仍失败，请点击右下角「重试截图」': 'If it still fails, click "Retry screenshot" in the bottom-right', '请输入截图名称': 'Enter a screenshot name', '错误信息': 'Error message',
  '失败次数': 'Failures', '已启用': 'Enabled', '总任务数': 'Total tasks', '总执行次数': 'Total runs', '成功次数': 'Successes', '执行统计': 'Run statistics', '最活跃的任务 (Top 5)': 'Most active tasks (Top 5)', '最近失败的任务': 'Recently failed tasks', '次执行': ' runs', '触发器类型分布': 'Trigger type distribution',
  '删除选中': 'Delete selected', '在此处插入模块': 'Insert module here', '展开全部': 'Expand all', '循环体': 'Loop body', '折叠全部': 'Collapse all', '搜索模块…': 'Search modules\u2026', '无匹配模块': 'No matching modules', '独立流程': 'Standalone flow', '禁用/启用': 'Disable/enable', '结束判断': 'End condition', '结束循环': 'End loop',
  'CREATE TABLE, ALTER TABLE, DROP TABLE等': 'CREATE TABLE, ALTER TABLE, DROP TABLE, etc.', 'JSON格式的键值对，键名对应表字段名': 'JSON key-value pairs; keys match table field names', 'SQL语句': 'SQL statement', 'WHERE子句的条件部分，不需要写WHERE关键字': 'The WHERE condition, without the WHERE keyword', '{"name": "李四", "age": 30}': '{"name": "Jane", "age": 30}', '仅返回单行数据': 'Return a single row only', '关闭指定的数据库连接，释放资源': 'Close the given DB connection and free resources', '用于执行DDL语句（建表、修改表结构等）': 'For DDL statements (create table, alter schema, etc.)', '用于标识此连接，后续操作可复用': 'Identifies this connection for reuse in later operations', '警告：如果不指定WHERE条件，将删除表中所有数据！': 'Warning: without a WHERE condition, all rows in the table are deleted!', '请输入数据库名': 'Enter the database name',
  '上传到此文件夹': 'Upload to this folder', '为图像分类创建新位置': 'Create a new location to organize images', '删除所有文件': 'Delete all files', '新建文件夹': 'New folder', '暂无图像文件': 'No image files', '根目录': 'Root', '此文件夹为空': 'This folder is empty', '点击上传或将图片拖拽到此处': 'Click to upload or drag images here', '点击上方按钮上传，或将图片直接拖拽到此处': 'Click the button above to upload, or drag images here', '请输入文件夹名称': 'Enter a folder name',
  '内置': 'Built-in', '展开模块列表': 'Expand module list', '找到': 'Found', '拖拽到画布添加': 'Drag to the canvas to add', '拖拽调整顺序': 'Drag to reorder', '搜索模块/拼音/英文...': 'Search module / pinyin / English...', '模块库': 'Module library', '设置标签颜色': 'Set tag color', '试试拼音、首字母或英文关键词': 'Try pinyin, initials or English keywords', '选择标签颜色': 'Choose tag color',
  '使用前请确保：': 'Before use, make sure:', '好友昵称或群名称': 'Friend nickname or group name', '微信已登录且窗口已打开（支持任意版本）': 'WeChat is logged in and its window is open (any version)', '微信窗口没有被最小化': 'The WeChat window is not minimized', '执行时不要操作鼠标键盘': 'Do not use the mouse or keyboard during execution', '支持图片、文档、压缩包等各类文件': 'Supports images, documents, archives and other files', '文件或图片的本地路径': 'Local path of the file or image', '本模块通过模拟键鼠操作实现，兼容微信 4.x 新版本': 'This module works by simulating mouse/keyboard input, compatible with WeChat 4.x', '目标联系人/群名': 'Target contact / group name',
})

// ============================================================
// 精确整句翻译：AICodeAssistant/InjectJs/Local/SimilarSelector/UrlInput/DataPreview/DesktopRecorder/ImageViewer/InputPrompt/JsEditor/Recorder/Toolbar/ErrorBoundary/MessageBubble/PhoneCoord/Iframe/Update
// ============================================================
Object.assign(UI_DICT, {
  'AI会自动使用工作流中已有的变量': 'The AI automatically uses existing workflow variables', 'AI编码助手': 'AI coding assistant', '使用AI生成代码': 'Generate code with AI', '当前工作流中的变量：': 'Variables in the current workflow:', '您可以在生成后继续修改代码': 'You can keep editing the code after generation', '描述您想要实现的功能，AI会自动生成代码': 'Describe what you want; the AI generates the code', '描述您的需求：': 'Describe your needs:', '生成代码': 'Generate code', '生成的代码会自动填充到编辑器中': 'The generated code auto-fills into the editor',
  'JavaScript 脚本注入编辑器': 'JavaScript injection editor', '可用变量': 'Available variables', '提示：输入': 'Tip: type', '新内容': 'New content', '暂无变量': 'No variables', '查看变量补全': 'View variable completion', '测试结果': 'Test result', '测试运行': 'Test run', '点击"测试运行"查看结果（注意：测试环境是模拟的，实际执行会在真实浏览器页面中）': 'Click "Test run" to see the result (note: the test environment is simulated; real execution runs on the actual browser page)',
  '个工作流文件': ' workflow file(s)', '个文件': ' file(s)', '关闭 (Esc)': 'Close (Esc)', '删除工作流': 'Delete workflow', '加载工作流列表中…': 'Loading workflow list\u2026', '在文件管理器中打开工作流 JSON 的保存位置': 'Open the workflow JSON\u2019s save location in the file manager', '当前位置：': 'Current location:', '打开位置': 'Open location', '搜索工作流名称或文件名...': 'Search workflow name or file name...',
  '为索引变量命名': 'Name the index variable', '会在运行时被替换为实际索引值': 'is replaced with the actual index value at runtime', '变量名将用于循环遍历，如': 'The variable name is used for looping, e.g.', '生成的选择器模式': 'Generated selector pattern', '相似元素选择': 'Similar element selection', '确认使用': 'Confirm use', '选择器中的': 'In the selector,', '，\n              然后在后续模块中使用此选择器即可遍历所有相似元素。': ', then use this selector in later modules to iterate over all similar elements.',
  'Alt+点击': 'Alt+click', 'Ctrl+点击': 'Ctrl+click', '提示：留空直接使用已打开的浏览器页面，输入URL会自动复用已打开的相同页面': 'Tip: leave blank to use an already-open page; entering a URL reuses an open page with the same URL', '留空则使用当前页面，或输入新URL': 'Leave blank for the current page, or enter a new URL', '输入要选择元素的网页URL（可选）': 'Enter the page URL to pick elements from (optional)', '选择元素': 'Select element', '：选择单个元素': ': select a single element', '：选择相似元素（先点第一个，再点第二个相似的）': ': select similar elements (click the first, then a second similar one)',
  '下载CSV': 'Download CSV', '手动添加数据': 'Add data manually', '执行工作流后，收集的数据将显示在这里': 'Collected data appears here after running the workflow', '提示：点击单元格可编辑内容，按 Enter 保存，按 Esc 取消': 'Tip: click a cell to edit; press Enter to save, Esc to cancel', '数据预览': 'Data preview', '添加列': 'Add column', '添加行': 'Add row',
  '开启后优先用控件名/类型语义定位（换分辨率仍可用），取不到控件时回退坐标': 'When enabled, prefers control name/type semantics (works across resolutions), falling back to coordinates if unavailable', '开始录制': 'Start recording', '按真实操作间隔插入等待节点，保留你录制时的节奏': 'Insert wait nodes at the real action intervals to keep your recording rhythm', '桌面智能录制': 'Desktop smart recording', '生成节点': 'Generate nodes', '自动等待': 'Auto wait', '记录鼠标键盘操作，自动生成节点': 'Record mouse/keyboard actions and auto-generate nodes', '语义优先': 'Semantics first',
  '下载图片': 'Download image', '使用 FFmpeg 转换中...': 'Converting with FFmpeg...', '放大': 'Zoom in', '旋转': 'Rotate', '旋转90°': 'Rotate 90\u00b0', '查看图片': 'View image', '缩小': 'Zoom out', '重置缩放': 'Reset zoom',
  '将设置：': 'Will set:', '已选择': 'Selected', '已选择：': 'Selected:', '拖动滑块选择数值': 'Drag the slider to choose a value', '每行一个值，当前': 'One value per line; currently', '没有可选项': 'No options', '项': ' item(s)', '项 →': ' item(s) \u2192',
  'JavaScript 代码编辑器': 'JavaScript code editor', '点击"测试运行"查看结果': 'Click "Test run" to see the result',
  '停止录制': 'Stop recording', '删除此步': 'Delete this step', '录制中': 'Recording', '按操作间隔自动插入等待节点': 'Auto-insert wait nodes at action intervals', '智能录制器': 'Smart recorder',
  '保存模块': 'Save module', '新建工作流 (Alt+N)': 'New workflow (Alt+N)', '无头运行': 'Run headless', '版本': 'Version', '版本历史（提交快照 / 恢复 / 对比 / 分支图）': 'Version history (commit snapshot / restore / compare / branch graph)', '运行 (F5)': 'Run (F5)', '退出': 'Exit', '退出编辑模式': 'Exit edit mode',
  'QQ 2124691573 · 微信 QyPmh20061026': 'QQ 2124691573 \u00b7 WeChat QyPmh20061026', 'WebRPA 遇到了一个问题': 'WebRPA ran into a problem', '刷新页面': 'Refresh page', '已为你拦截这次错误（不会白屏）。通常是某个模块配置异常或工作流文件含损坏数据。\n                可以点「清空画布」恢复使用，已保存的工作流不会受影响；也可以让 AI 小助手帮你诊断原因。': 'This error was caught (no blank screen). It is usually a misconfigured module or corrupted workflow data. Click "Clear canvas" to recover (saved workflows are unaffected), or let the AI assistant diagnose it.', '查看错误详情': 'View error details', '清空画布并继续': 'Clear canvas and continue', '若该问题反复出现，欢迎把上方报错信息反馈给开发者彭明航，帮助 WebRPA 变得更稳健：': 'If this keeps happening, please send the error above to the developer to help make WebRPA more robust:', '（在「全局配置 → 小助手」中配置 API Key 后，这里会出现「AI 诊断」按钮，可自动分析报错原因）': '(After setting an API key under Global Config \u2192 Assistant, an "AI diagnose" button appears here to analyze the error automatically)',
  '回滚': 'Roll back', '回滚：把画布恢复到这条消息发送之前的状态，并把消息填回输入框': 'Roll back: restore the canvas to before this message was sent, and put the message back in the input box', '结果': 'Result', '编辑这条消息（放回输入框）': 'Edit this message (put it back in the input box)', '重发': 'Resend', '重新发送这条消息': 'Resend this message',
  '取消拾取并关闭镜像窗口': 'Cancel picking and close the mirror window', '在手机上测试当前坐标': 'Test the current coordinates on the phone', '并点击屏幕拾取坐标；不按 Ctrl 时可正常操作手机。点击「测试」可在手机上验证当前坐标。': 'and click the screen to pick coordinates; without Ctrl you can operate the phone normally. Click "Test" to verify the current coordinates on the phone.', '拾取': 'Pick', '测试中': 'Testing', '点击「拾取」可弹出手机镜像，按住': 'Click "Pick" to open the phone mirror, then hold', '点击后弹出手机镜像；按住 Ctrl 并点击屏幕即可拾取坐标': 'Opens the phone mirror; hold Ctrl and click the screen to pick coordinates',
  'iframe名称': 'iframe name', '例如: iframe.content, #myframe': 'e.g. iframe.content, #myframe', '切换到iframe后，后续的元素操作将在该iframe内执行，直到切换回主页面或切换到其他iframe': 'After switching to an iframe, later element operations run inside it until you switch back or to another iframe', '如果当前不在iframe中，此操作不会产生任何效果': 'If you are not currently in an iframe, this has no effect', '此模块将操作上下文切换回主页面，后续的元素操作将在主页面执行': 'This module switches the context back to the main page; later operations run there', '用于定位iframe的CSS选择器': 'CSS selector to locate the iframe', '页面中第几个iframe（从0开始计数）': 'Which iframe on the page (counting from 0)',
  '前往 GitHub Releases 下载最新 7z 压缩包，解压替换程序所在文件夹中的所有文件即可完成更新。': 'Download the latest 7z archive from GitHub Releases, then extract and replace all files in the program folder to update.', '前往下载': 'Go to download', '暂不更新': 'Not now', '更新方式：': 'Update method:', '最新版本': 'Latest version', '有新版本可用，建议更新以获得最新功能与修复': 'A new version is available; updating is recommended for the latest features and fixes',
})
