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
