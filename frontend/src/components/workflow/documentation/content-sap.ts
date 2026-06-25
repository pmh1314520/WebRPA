export const sapGuideContent = `# SAP自动化指南

> 通过WebRPA实现SAP GUI自动化操作，支持登录、事务码执行、字段操作等功能

---

## 目录

- [模块概览](#模块概览)
- [连接与登录](#连接与登录)
- [事务码操作](#事务码操作)
- [字段操作](#字段操作)
- [按钮与控件](#按钮与控件)
- [表格操作](#表格操作)
- [实战案例](#实战案例)
- [常见问题](#常见问题)

---

## 模块概览

WebRPA提供了完整的SAP GUI自动化模块，支持：

| 模块 | 功能 | 说明 |
|------|------|------|
| \`sap_login\` | SAP登录 | 连接SAP系统并登录 |
| \`sap_logout\` | SAP登出 | 断开SAP连接 |
| \`sap_run_tcode\` | 执行事务码 | 运行SAP事务码（如VA01、ME21N等） |
| \`sap_set_field_value\` | 设置字段值 | 向SAP字段输入数据 |
| \`sap_get_field_value\` | 获取字段值 | 读取SAP字段内容 |
| \`sap_click_button\` | 点击按钮 | 点击SAP界面按钮 |
| \`sap_send_vkey\` | 发送虚拟键 | 发送功能键（F1-F12、Enter等） |
| \`sap_get_status_message\` | 获取状态消息 | 读取SAP状态栏消息 |
| \`sap_get_title\` | 获取窗口标题 | 获取当前SAP窗口标题 |
| \`sap_close_warning\` | 关闭警告 | 关闭SAP警告对话框 |
| \`sap_set_checkbox\` | 设置复选框 | 勾选或取消勾选复选框 |
| \`sap_select_combobox\` | 选择下拉框 | 从下拉列表中选择选项 |
| \`sap_read_gridview\` | 读取表格 | 读取SAP表格数据 |
| \`sap_export_gridview_excel\` | 导出表格 | 将SAP表格导出为Excel |
| \`sap_set_focus\` | 设置焦点 | 将焦点设置到指定控件 |
| \`sap_maximize_window\` | 最大化窗口 | 最大化SAP窗口 |

---

## 连接与登录

### SAP登录

\`\`\`yaml
模块: sap_login
配置:
  connection_string: "SAP连接字符串"
  client: "800"
  username: "用户名"
  password: "密码"
  language: "ZH"
输出变量: sap_session
\`\`\`

**连接字符串格式**：
- 格式：\`/H/主机名/S/系统号\`
- 示例：\`/H/sap.company.com/S/00\`

**参数说明**：
- \`client\`: SAP客户端编号（通常是800、100等）
- \`username\`: SAP用户名
- \`password\`: SAP密码
- \`language\`: 登录语言（ZH=中文，EN=英文）

### SAP登出

\`\`\`yaml
模块: sap_logout
配置:
  session: "\${sap_session}"
\`\`\`

---

## 事务码操作

### 执行事务码

\`\`\`yaml
模块: sap_run_tcode
配置:
  session: "\${sap_session}"
  tcode: "VA01"  # 事务码
  wait_time: 2    # 等待时间（秒）
\`\`\`

**常用事务码**：
- \`VA01\`: 创建销售订单
- \`VA02\`: 修改销售订单
- \`VA03\`: 显示销售订单
- \`ME21N\`: 创建采购订单
- \`ME22N\`: 修改采购订单
- \`ME23N\`: 显示采购订单
- \`MM01\`: 创建物料主数据
- \`MM02\`: 修改物料主数据
- \`MM03\`: 显示物料主数据

---

## 字段操作

### 设置字段值

\`\`\`yaml
模块: sap_set_field_value
配置:
  session: "\${sap_session}"
  field_id: "VBAK-VKORG"  # 字段ID
  value: "1000"            # 字段值
\`\`\`

**如何获取字段ID**：
1. 在SAP GUI中，将光标放在目标字段上
2. 按F1键打开帮助
3. 点击"技术信息"按钮
4. 查看"字段名称"或"屏幕字段"

### 获取字段值

\`\`\`yaml
模块: sap_get_field_value
配置:
  session: "\${sap_session}"
  field_id: "VBAK-VBELN"  # 字段ID
输出变量: field_value
\`\`\`

---

## 按钮与控件

### 点击按钮

\`\`\`yaml
模块: sap_click_button
配置:
  session: "\${sap_session}"
  button_id: "btn[0]"  # 按钮ID
\`\`\`

**常用按钮ID**：
- \`btn[0]\`: 保存按钮
- \`btn[3]\`: 返回按钮
- \`btn[11]\`: 执行按钮
- \`btn[15]\`: 退出按钮

### 发送虚拟键

\`\`\`yaml
模块: sap_send_vkey
配置:
  session: "\${sap_session}"
  vkey: 0  # 虚拟键代码
\`\`\`

**虚拟键代码**：
- \`0\`: Enter键
- \`3\`: 返回（F3）
- \`8\`: 执行（F8）
- \`11\`: 保存（Ctrl+S）
- \`12\`: 取消（F12）
- \`15\`: 退出（Shift+F3）

### 设置复选框

\`\`\`yaml
模块: sap_set_checkbox
配置:
  session: "\${sap_session}"
  checkbox_id: "VBAK-CHECKBOX"
  checked: true  # true=勾选，false=取消勾选
\`\`\`

### 选择下拉框

\`\`\`yaml
模块: sap_select_combobox
配置:
  session: "\${sap_session}"
  combobox_id: "VBAK-AUART"
  value: "OR"  # 选项值
\`\`\`

---

## 表格操作

### 读取表格数据

\`\`\`yaml
模块: sap_read_gridview
配置:
  session: "\${sap_session}"
  grid_id: "usr/cntlGRID1/shellcont/shell"
输出变量: grid_data
\`\`\`

**输出格式**：
\`\`\`json
[
  {
    "列1": "值1",
    "列2": "值2",
    "列3": "值3"
  },
  {
    "列1": "值4",
    "列2": "值5",
    "列3": "值6"
  }
]
\`\`\`

### 导出表格为Excel

\`\`\`yaml
模块: sap_export_gridview_excel
配置:
  session: "\${sap_session}"
  grid_id: "usr/cntlGRID1/shellcont/shell"
  output_path: "C:/导出数据.xlsx"
\`\`\`

---

## 实战案例

### 案例1：批量创建销售订单

\`\`\`mermaid
graph LR
    A[SAP登录] --> B[执行VA01]
    B --> C[填写订单类型]
    C --> D[填写销售组织]
    D --> E[填写客户编号]
    E --> F[点击保存]
    F --> G[获取订单号]
    G --> H{还有数据?}
    H -->|是| B
    H -->|否| I[SAP登出]
\`\`\`

**工作流配置**：

1. **SAP登录**
\`\`\`yaml
模块: sap_login
配置:
  connection_string: "/H/sap.company.com/S/00"
  client: "800"
  username: "用户名"
  password: "密码"
  language: "ZH"
输出变量: sap_session
\`\`\`

2. **读取订单数据**
\`\`\`yaml
模块: read_excel
配置:
  file_path: "订单数据.xlsx"
  sheet_name: "Sheet1"
输出变量: order_list
\`\`\`

3. **循环处理订单**
\`\`\`yaml
模块: foreach
配置:
  list: "\${order_list}"
  item_variable: "order"
\`\`\`

4. **执行VA01事务码**
\`\`\`yaml
模块: sap_run_tcode
配置:
  session: "\${sap_session}"
  tcode: "VA01"
  wait_time: 2
\`\`\`

5. **填写订单类型**
\`\`\`yaml
模块: sap_set_field_value
配置:
  session: "\${sap_session}"
  field_id: "VBAK-AUART"
  value: "\${order.订单类型}"
\`\`\`

6. **填写销售组织**
\`\`\`yaml
模块: sap_set_field_value
配置:
  session: "\${sap_session}"
  field_id: "VBAK-VKORG"
  value: "\${order.销售组织}"
\`\`\`

7. **填写客户编号**
\`\`\`yaml
模块: sap_set_field_value
配置:
  session: "\${sap_session}"
  field_id: "VBAK-KUNNR"
  value: "\${order.客户编号}"
\`\`\`

8. **按Enter键**
\`\`\`yaml
模块: sap_send_vkey
配置:
  session: "\${sap_session}"
  vkey: 0
\`\`\`

9. **点击保存**
\`\`\`yaml
模块: sap_click_button
配置:
  session: "\${sap_session}"
  button_id: "btn[0]"
\`\`\`

10. **获取订单号**
\`\`\`yaml
模块: sap_get_field_value
配置:
  session: "\${sap_session}"
  field_id: "VBAK-VBELN"
输出变量: order_number
\`\`\`

11. **记录日志**
\`\`\`yaml
模块: print_log
配置:
  message: "订单创建成功：\${order_number}"
  level: "info"
\`\`\`

12. **SAP登出**
\`\`\`yaml
模块: sap_logout
配置:
  session: "\${sap_session}"
\`\`\`

### 案例2：导出物料主数据

\`\`\`mermaid
graph LR
    A[SAP登录] --> B[执行MM03]
    B --> C[输入物料编号]
    C --> D[按Enter]
    D --> E[读取表格数据]
    E --> F[导出Excel]
    F --> G[SAP登出]
\`\`\`

---

## 常见问题

### Q1: 如何处理SAP弹出的警告对话框？

**A**: 使用\`sap_close_warning\`模块关闭警告：

\`\`\`yaml
模块: sap_close_warning
配置:
  session: "\${sap_session}"
\`\`\`

### Q2: 如何判断操作是否成功？

**A**: 使用\`sap_get_status_message\`获取状态栏消息：

\`\`\`yaml
模块: sap_get_status_message
配置:
  session: "\${sap_session}"
输出变量: status_message
\`\`\`

然后使用条件判断：
\`\`\`yaml
模块: condition
配置:
  condition: "\${status_message}包含'成功'"
  true_branch: [...]
  false_branch: [...]
\`\`\`

### Q3: 如何处理SAP会话超时？

**A**: 在长时间操作前，定期发送虚拟键保持会话活跃：

\`\`\`yaml
模块: sap_send_vkey
配置:
  session: "\${sap_session}"
  vkey: 0  # 发送Enter键
\`\`\`

### Q4: 如何获取控件ID？

**A**: 使用SAP GUI脚本录制器：
1. 在SAP GUI中，选择"自定义本地布局" -> "脚本录制和回放"
2. 开始录制
3. 执行操作
4. 停止录制
5. 查看生成的脚本，找到控件ID

### Q5: 支持哪些SAP版本？

**A**: WebRPA的SAP自动化模块支持：
- SAP GUI 7.40及以上版本
- SAP ECC 6.0及以上
- SAP S/4HANA

---

## 最佳实践

1. **错误处理**：每个关键操作后检查状态消息
2. **等待时间**：根据SAP系统响应速度调整等待时间
3. **会话管理**：使用完毕后及时登出，释放SAP许可
4. **日志记录**：记录每个操作的结果，便于排查问题
5. **批量操作**：使用循环处理大量数据，提高效率

---

## 相关文档

- [流程控制](./advanced-features) - 循环、条件判断
- [数据表格](./excel-guide) - Excel数据读取
- [消息通知](./notifications-guide) - 日志记录
- [调试与错误处理](./debug-guide) - 错误处理技巧

---

**提示**：SAP自动化需要安装SAP GUI客户端，并确保启用了脚本功能。
`
