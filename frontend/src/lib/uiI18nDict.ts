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
