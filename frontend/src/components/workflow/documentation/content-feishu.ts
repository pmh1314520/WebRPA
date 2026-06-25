export const feishuGuideContent = `# 飞书自动化指南

> 通过WebRPA实现飞书多维表格和电子表格的自动化操作

---

## 目录

- [模块概览](#模块概览)
- [前置准备](#前置准备)
- [多维表格操作](#多维表格操作)
- [电子表格操作](#电子表格操作)
- [实战案例](#实战案例)
- [常见问题](#常见问题)

---

## 模块概览

WebRPA提供了飞书自动化模块，支持：

| 模块 | 功能 | 说明 |
|------|------|------|
| \`feishu_bitable_write\` | 写入多维表格 | 向飞书多维表格添加或更新数据 |
| \`feishu_bitable_read\` | 读取多维表格 | 从飞书多维表格读取数据 |
| \`feishu_sheet_write\` | 写入电子表格 | 向飞书电子表格写入数据 |
| \`feishu_sheet_read\` | 读取电子表格 | 从飞书电子表格读取数据 |

---

## 前置准备

### 1. 创建飞书应用

1. 访问[飞书开放平台](https://open.feishu.cn/)
2. 创建企业自建应用
3. 获取 **App ID** 和 **App Secret**

### 2. 配置权限

在应用管理后台，添加以下权限：

**多维表格权限**：
- \`bitable:app\` - 获取多维表格信息
- \`bitable:app:readonly\` - 读取多维表格
- \`bitable:app:write\` - 写入多维表格

**电子表格权限**：
- \`sheets:spreadsheet\` - 获取电子表格信息
- \`sheets:spreadsheet:readonly\` - 读取电子表格
- \`sheets:spreadsheet:write\` - 写入电子表格

### 3. 获取文档Token

**多维表格Token**：
- 打开多维表格
- 从URL中获取：\`https://xxx.feishu.cn/base/【这里是Token】\`

**电子表格Token**：
- 打开电子表格
- 从URL中获取：\`https://xxx.feishu.cn/sheets/【这里是Token】\`

---

## 多维表格操作

### 写入多维表格

\`\`\`yaml
模块: feishu_bitable_write
配置:
  app_id: "cli_xxxxxxxxxxxxx"
  app_secret: "xxxxxxxxxxxxxxxxxxxxx"
  app_token: "bascnxxxxxxxxxxxxxx"
  table_id: "tblxxxxxxxxxxxxxx"
  operation: "add"  # add=添加, update=更新
  data:
    - 字段1: "值1"
      字段2: "值2"
      字段3: "值3"
    - 字段1: "值4"
      字段2: "值5"
      字段3: "值6"
输出变量: write_result
\`\`\`

**参数说明**：
- \`app_id\`: 飞书应用ID
- \`app_secret\`: 飞书应用密钥
- \`app_token\`: 多维表格Token
- \`table_id\`: 数据表ID（从多维表格URL获取）
- \`operation\`: 操作类型
  - \`add\`: 添加新记录
  - \`update\`: 更新现有记录（需要提供record_id）
- \`data\`: 要写入的数据（列表格式）

**更新记录示例**：
\`\`\`yaml
data:
  - record_id: "recxxxxxxxxxxxxxx"
    字段1: "新值1"
    字段2: "新值2"
\`\`\`

### 读取多维表格

\`\`\`yaml
模块: feishu_bitable_read
配置:
  app_id: "cli_xxxxxxxxxxxxx"
  app_secret: "xxxxxxxxxxxxxxxxxxxxx"
  app_token: "bascnxxxxxxxxxxxxxx"
  table_id: "tblxxxxxxxxxxxxxx"
  filter: ""  # 可选：筛选条件
  sort: ""    # 可选：排序规则
输出变量: table_data
\`\`\`

**筛选条件示例**：
\`\`\`yaml
filter: "CurrentValue.[字段1] = '值1'"
\`\`\`

**排序规则示例**：
\`\`\`yaml
sort: '[{"field_name":"字段1","desc":true}]'
\`\`\`

**输出格式**：
\`\`\`json
[
  {
    "record_id": "recxxxxxxxxxxxxxx",
    "字段1": "值1",
    "字段2": "值2",
    "字段3": "值3"
  },
  {
    "record_id": "recxxxxxxxxxxxxxx",
    "字段1": "值4",
    "字段2": "值5",
    "字段3": "值6"
  }
]
\`\`\`

---

## 电子表格操作

### 写入电子表格

\`\`\`yaml
模块: feishu_sheet_write
配置:
  app_id: "cli_xxxxxxxxxxxxx"
  app_secret: "xxxxxxxxxxxxxxxxxxxxx"
  spreadsheet_token: "shtcnxxxxxxxxxxxxxx"
  sheet_id: "xxxxxx"
  range: "A1:C10"  # 写入范围
  data:
    - ["标题1", "标题2", "标题3"]
    - ["值1", "值2", "值3"]
    - ["值4", "值5", "值6"]
输出变量: write_result
\`\`\`

**参数说明**：
- \`spreadsheet_token\`: 电子表格Token
- \`sheet_id\`: 工作表ID（可选，默认为第一个工作表）
- \`range\`: 写入范围（A1表示法）
- \`data\`: 要写入的数据（二维数组）

### 读取电子表格

\`\`\`yaml
模块: feishu_sheet_read
配置:
  app_id: "cli_xxxxxxxxxxxxx"
  app_secret: "xxxxxxxxxxxxxxxxxxxxx"
  spreadsheet_token: "shtcnxxxxxxxxxxxxxx"
  sheet_id: "xxxxxx"
  range: "A1:C10"  # 读取范围
输出变量: sheet_data
\`\`\`

**输出格式**：
\`\`\`json
[
  ["标题1", "标题2", "标题3"],
  ["值1", "值2", "值3"],
  ["值4", "值5", "值6"]
]
\`\`\`

---

## 实战案例

### 案例1：从Excel导入数据到飞书多维表格

\`\`\`mermaid
graph LR
    A[读取Excel] --> B[循环处理数据]
    B --> C[写入飞书多维表格]
    C --> D[记录日志]
\`\`\`

**工作流配置**：

1. **读取Excel文件**
\`\`\`yaml
模块: read_excel
配置:
  file_path: "数据.xlsx"
  sheet_name: "Sheet1"
输出变量: excel_data
\`\`\`

2. **写入飞书多维表格**
\`\`\`yaml
模块: feishu_bitable_write
配置:
  app_id: "cli_xxxxxxxxxxxxx"
  app_secret: "xxxxxxxxxxxxxxxxxxxxx"
  app_token: "bascnxxxxxxxxxxxxxx"
  table_id: "tblxxxxxxxxxxxxxx"
  operation: "add"
  data: "\${excel_data}"
输出变量: write_result
\`\`\`

3. **记录日志**
\`\`\`yaml
模块: print_log
配置:
  message: "成功导入\${write_result.count}条数据"
  level: "info"
\`\`\`

### 案例2：从飞书多维表格导出数据到Excel

\`\`\`mermaid
graph LR
    A[读取飞书多维表格] --> B[处理数据]
    B --> C[写入Excel]
    C --> D[保存文件]
\`\`\`

**工作流配置**：

1. **读取飞书多维表格**
\`\`\`yaml
模块: feishu_bitable_read
配置:
  app_id: "cli_xxxxxxxxxxxxx"
  app_secret: "xxxxxxxxxxxxxxxxxxxxx"
  app_token: "bascnxxxxxxxxxxxxxx"
  table_id: "tblxxxxxxxxxxxxxx"
输出变量: table_data
\`\`\`

2. **创建Excel表格**
\`\`\`yaml
模块: table_clear
配置:
  table_name: "导出数据"
\`\`\`

3. **循环添加数据**
\`\`\`yaml
模块: foreach
配置:
  list: "\${table_data}"
  item_variable: "row"
\`\`\`

4. **添加行数据**
\`\`\`yaml
模块: table_add_row
配置:
  table_name: "导出数据"
  row_data: "\${row}"
\`\`\`

5. **导出Excel**
\`\`\`yaml
模块: table_export
配置:
  table_name: "导出数据"
  output_path: "导出数据.xlsx"
  format: "xlsx"
\`\`\`

### 案例3：定时同步数据

\`\`\`mermaid
graph LR
    A[定时触发] --> B[读取源数据]
    B --> C[读取飞书数据]
    C --> D[对比差异]
    D --> E[更新飞书]
    E --> F[发送通知]
\`\`\`

**工作流配置**：

1. **定时触发器**
\`\`\`yaml
模块: scheduled_task
配置:
  cron: "0 */1 * * *"  # 每小时执行一次
\`\`\`

2. **读取源数据**
\`\`\`yaml
模块: api_request
配置:
  url: "https://api.example.com/data"
  method: "GET"
输出变量: source_data
\`\`\`

3. **读取飞书数据**
\`\`\`yaml
模块: feishu_bitable_read
配置:
  app_id: "cli_xxxxxxxxxxxxx"
  app_secret: "xxxxxxxxxxxxxxxxxxxxx"
  app_token: "bascnxxxxxxxxxxxxxx"
  table_id: "tblxxxxxxxxxxxxxx"
输出变量: feishu_data
\`\`\`

4. **对比并更新**
\`\`\`yaml
模块: js_script
配置:
  code: |
    const source = context.source_data;
    const feishu = context.feishu_data;
    
    // 找出需要更新的数据
    const updates = [];
    for (const item of source) {
      const existing = feishu.find(f => f.ID === item.id);
      if (!existing || existing.状态 !== item.status) {
        updates.push({
          record_id: existing?.record_id,
          ID: item.id,
          状态: item.status,
          更新时间: new Date().toISOString()
        });
      }
    }
    
    return { updates };
输出变量: diff_result
\`\`\`

5. **更新飞书**
\`\`\`yaml
模块: feishu_bitable_write
配置:
  app_id: "cli_xxxxxxxxxxxxx"
  app_secret: "xxxxxxxxxxxxxxxxxxxxx"
  app_token: "bascnxxxxxxxxxxxxxx"
  table_id: "tblxxxxxxxxxxxxxx"
  operation: "update"
  data: "\${diff_result.updates}"
\`\`\`

6. **发送通知**
\`\`\`yaml
模块: notify_feishu
配置:
  webhook_url: "https://open.feishu.cn/open-apis/bot/v2/hook/xxxxx"
  message: "数据同步完成，更新了\${diff_result.updates.length}条记录"
\`\`\`

---

## 常见问题

### Q1: 如何获取table_id？

**A**: 打开多维表格，从URL中获取：
\`\`\`
https://xxx.feishu.cn/base/bascnxxxxxxxxxxxxxx?table=tblxxxxxxxxxxxxxx
                                                      上 这里是table_id
\`\`\`

### Q2: 如何处理大量数据？

**A**: 飞书API有速率限制，建议：
1. 分批处理数据（每批100条）
2. 添加延迟（每批之间等待1秒）
3. 使用错误重试机制

\`\`\`yaml
模块: loop
配置:
  type: "range"
  start: 0
  end: "\${total_count}"
  step: 100
  variable: "batch_start"
\`\`\`

### Q3: 如何处理字段类型？

**A**: 飞书多维表格支持多种字段类型：
- 文本：直接传字符串
- 数字：传数字类型
- 日期：传ISO 8601格式字符串（如"2024-01-01"）
- 单选：传选项文本
- 多选：传选项文本数组
- 人员：传用户ID数组

### Q4: 如何处理权限问题？

**A**: 确保：
1. 应用已添加到对应的飞书群组或文档
2. 应用具有相应的权限范围
3. 文档所有者已授权应用访问

### Q5: 如何处理API错误？

**A**: 使用条件判断检查返回结果：

\`\`\`yaml
模块: condition
配置:
  condition: "\${write_result.code} == 0"
  true_branch:
    - 模块: print_log
      配置:
        message: "写入成功"
  false_branch:
    - 模块: print_log
      配置:
        message: "写入失败：\${write_result.msg}"
        level: "error"
\`\`\`

---

## 最佳实践

1. **凭证管理**：将App ID和App Secret存储在全局变量中，避免硬编码
2. **错误处理**：每次API调用后检查返回状态
3. **批量操作**：大量数据分批处理，避免超时
4. **日志记录**：记录每次操作的结果，便于排查问题
5. **权限最小化**：只申请必要的权限范围

---

## 相关文档

- [数据表格](./excel-guide) - Excel数据处理
- [网络请求](./network-guide) - API调用
- [流程控制](./advanced-features) - 循环、条件判断
- [多渠道通知](./notify-guide) - 飞书通知

---

**提示**：使用飞书自动化前，请确保已在飞书开放平台创建应用并配置好权限。
`
