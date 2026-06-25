export const networkGuideContent = `# 网络请求与抓包

本章介绍 HTTP 请求、Webhook 请求、网络抓包等网络相关模块。

---

## HTTP 请求（api_request）

发送 HTTP/HTTPS 请求，支持 GET、POST、PUT、DELETE 等方法，是与外部 API 交互的核心模块。

**配置项**：

| 参数 | 说明 | 示例 |
|------|------|------|
| 请求 URL | 目标接口地址 | \`https://api.example.com/data\` |
| 请求方法 | GET/POST/PUT/DELETE/PATCH | \`POST\` |
| 请求头 | JSON 格式的请求头 | \`{"Content-Type": "application/json"}\` |
| 请求体 | 请求数据（POST/PUT） | \`{"key": "value"}\` |
| 超时（秒） | 请求超时时间 | \`30\` |
| 结果变量 | 保存响应体 | \`api_response\` |
| 状态码变量 | 保存 HTTP 状态码 | \`status_code\` |
| 响应头变量 | 保存响应头 | \`resp_headers\` |

**示例**（GET 请求获取数据）：

\`\`\`
HTTP请求 -> 方法: GET, URL: https://httpbin.org/get -> 结果变量: resp
JSON解析 -> 输入: {resp} -> 结果变量: data
打印日志 -> {data}
\`\`\`

**示例**（POST 请求提交表单）：

\`\`\`
HTTP请求 -> 方法: POST
          URL: https://api.example.com/login
          请求头: {"Content-Type": "application/json"}
          请求体: {"username": "{user}", "password": "{pwd}"}
          -> 结果变量: login_resp
\`\`\`

**使用 Cookie/Token 认证**：

\`\`\`json
请求头填写：
{
  "Authorization": "Bearer {token}",
  "Cookie": "session={session_id}"
}
\`\`\`

---

## 发送邮件（send_email）

通过 SMTP 发送电子邮件，支持 HTML 内容和附件。

**配置项**：

| 参数 | 说明 | 示例 |
|------|------|------|
| 发件人邮箱 | SMTP 账号 | \`your@qq.com\` |
| 授权码 | SMTP 授权码（非登录密码） | \`abcdefghijklmnop\` |
| SMTP 服务器 | 邮件服务器地址 | \`smtp.qq.com\` |
| 端口 | SMTP 端口 | \`465\` |
| 收件人 | 逗号分隔多个收件人 | \`a@qq.com,b@qq.com\` |
| 主题 | 邮件标题 | \`WebRPA 任务完成通知\` |
| 内容 | 邮件正文（支持 HTML） | \`任务已完成，共采集 {count} 条数据。\` |
| 附件路径 | 要附带的文件路径（可选） | \`C:\\report.xlsx\` |

**常用 SMTP 配置**：

| 邮箱 | SMTP 服务器 | 端口 |
|------|------------|------|
| QQ 邮箱 | smtp.qq.com | 465 |
| 163 邮箱 | smtp.163.com | 465 |
| Gmail | smtp.gmail.com | 587 |
| Outlook | smtp.office365.com | 587 |

> **获取 QQ 邮箱授权码**：QQ邮箱 -> 设置 -> 账户 -> 开启 SMTP 服务 -> 生成授权码

**全局配置**：在「全局配置」->「邮件」中预设发件人信息，避免每次重复填写。

---

## Webhook 请求（webhook_request）

向指定 URL 发送 Webhook 通知，常用于与第三方系统集成。

**配置项**：

| 参数 | 说明 |
|------|------|
| Webhook URL | 目标地址 |
| 请求方法 | POST/GET |
| 请求头 | 自定义请求头（JSON） |
| 请求体 | 要发送的数据（JSON/表单） |
| 结果变量 | 保存响应 |

---

## 网络抓包（network_capture）

拦截并分析浏览器的网络请求，提取 API 返回的数据，无需解析 HTML。

**配置项**：

| 参数 | 说明 | 示例 |
|------|------|------|
| 触发操作 | 执行什么操作来触发网络请求 | 点击按钮 |
| URL 过滤 | 只捕获包含此字符串的请求 | \`/api/data\` |
| 超时（秒） | 等待请求的最长时间 | \`30\` |
| 结果变量 | 保存捕获的响应数据 | \`captured_data\` |

**典型用法**（抓取 AJAX 接口数据）：

\`\`\`mermaid
flowchart TD
    A[打开网页] --> B[网络抓包\nURL过滤: /api/list]
    B --> C[点击加载更多按钮]
    C --> D[获取捕获数据]
    D --> E[JSON解析处理]
\`\`\`

---

## 网络监听（network_monitor_start/wait/stop）

持续监听网络请求，适合需要长时间监控的场景。

**使用流程**：
1. **启动监听**（network_monitor_start）：开始在后台监听网络请求
2. **等待请求**（network_monitor_wait）：等待匹配的请求出现
3. **停止监听**（network_monitor_stop）：停止监听，释放资源

**配置项（启动监听）**：

| 参数 | 说明 |
|------|------|
| URL 过滤 | 匹配的 URL 关键词 |
| 方法过滤 | 只监听 GET/POST 等 |

**配置项（等待请求）**：

| 参数 | 说明 |
|------|------|
| 超时（秒） | 最长等待时间 |
| 结果变量 | 保存捕获的请求/响应数据 |

---

## 使用技巧

### 处理 JSON 响应

HTTP 请求返回的是字符串，用「JSON 解析」模块转为字典后再访问字段：

\`\`\`
HTTP请求 -> 结果变量: resp_str
JSON解析 -> 输入: {resp_str} -> 结果变量: resp_data
设置变量 -> variableName: user_id, 值: {resp_data["data"]["id"]}
\`\`\`

### 接口认证

- **Bearer Token**：请求头加 \`Authorization: Bearer {token}\`
- **API Key**：通常放请求头 \`X-API-Key: {key}\` 或 URL 参数
- **Cookie**：请求头加 \`Cookie: session={sid}\`

### 错误处理

检查状态码变量，200 系列表示成功：

\`\`\`
条件判断 -> {status_code} == 200 -> 成功路径
                              -> 其他 -> 失败路径（发通知告警）
\`\`\`
`
