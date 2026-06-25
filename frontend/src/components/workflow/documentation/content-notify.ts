export const notifyGuideContent = `# 多渠道通知

本章介绍 WebRPA 支持的 17 种通知渠道，让工作流在完成、出错或达到特定条件时，自动向你发送通知。

---

## 概述

通知模块支持主流的国内外通知平台，无需额外安装，填入对应平台的配置参数即可使用。

| 模块 | 适用场景 |
|------|----------|
| Discord | 国际游戏/开发社区 |
| Telegram | 国际用户首选 |
| 钉钉 | 企业办公 |
| 企业微信 | 企业办公 |
| 飞书 | 企业办公 |
| Bark | iOS 用户 |
| Slack | 国际团队协作 |
| Microsoft Teams | 微软生态企业 |
| Pushover | 跨平台推送 |
| Pushbullet | 跨设备同步 |
| Gotify | 自建服务器 |
| Server 酱 | 微信推送 |
| PushPlus | 微信推送 |
| 自定义 Webhook | 任意 HTTP 接口 |
| Ntfy | 自建/公共服务 |
| Matrix | 去中心化聊天 |
| Rocket.Chat | 自建团队聊天 |

---

## Discord 通知（notify_discord）

通过 Discord Webhook 发送消息到频道。

**获取 Webhook URL**：
1. 打开 Discord 频道设置 -> 整合 -> Webhook
2. 创建 Webhook，复制 URL

**配置项**：

| 参数 | 说明 | 示例 |
|------|------|------|
| Webhook URL | Discord Webhook 地址 | \`https://discord.com/api/webhooks/...\` |
| 消息内容 | 要发送的文字 | \`任务完成！\` |
| 用户名 | 机器人显示名称（可选） | \`WebRPA Bot\` |
| 头像 URL | 机器人头像（可选） | \`https://...\` |

---

## Telegram 通知（notify_telegram）

通过 Telegram Bot 发送消息。

**获取 Bot Token**：
1. 在 Telegram 搜索 \`@BotFather\`
2. 发送 \`/newbot\` 创建机器人
3. 获得 Token（格式：\`123456789:ABC-DEF...\`）

**获取 Chat ID**：
- 向机器人发消息后，访问 \`https://api.telegram.org/bot{TOKEN}/getUpdates\`
- 找到 \`chat.id\` 字段

**配置项**：

| 参数 | 说明 |
|------|------|
| Bot Token | Telegram 机器人 Token |
| Chat ID | 目标会话 ID（可以是用户/群组/频道） |
| 消息内容 | 要发送的文字 |
| 格式 | Markdown/HTML/纯文本 |

---

## 钉钉通知（notify_dingtalk）

通过钉钉自定义机器人发送消息。

**获取 Webhook**：
1. 钉钉群 -> 设置 -> 智能群助手 -> 添加机器人
2. 选择「自定义」-> 复制 Webhook 地址

**配置项**：

| 参数 | 说明 |
|------|------|
| Webhook URL | 钉钉机器人 Webhook 地址 |
| 消息类型 | text/markdown/link |
| 标题 | Markdown 消息标题 |
| 消息内容 | 正文内容 |
| @用户手机号 | 要 @ 的用户手机号（可选） |
| @所有人 | 是否 @all |

---

## 企业微信通知（notify_wecom）

通过企业微信群机器人发送消息。

**获取 Webhook**：
1. 企业微信群 -> 添加群机器人
2. 复制 Webhook 地址

**配置项**：

| 参数 | 说明 |
|------|------|
| Webhook URL | 企业微信机器人 Webhook |
| 消息类型 | text/markdown/image/news |
| 消息内容 | 正文 |
| @成员 | 企业微信用户 ID，多个用逗号分隔 |

---

## 飞书通知（notify_feishu）

通过飞书群机器人发送消息。

**获取 Webhook**：
1. 飞书群 -> 群设置 -> 群机器人 -> 添加自定义机器人
2. 复制 Webhook 地址

**配置项**：

| 参数 | 说明 |
|------|------|
| Webhook URL | 飞书机器人 Webhook |
| 签名密钥 | 若开启了签名验证（可选） |
| 消息类型 | text/post（富文本）/interactive（卡片） |
| 消息内容 | 正文 |

---

## Bark 通知（notify_bark）

iOS 设备专用推送，需先安装 Bark App。

**配置项**：

| 参数 | 说明 | 示例 |
|------|------|------|
| Bark URL | App 中显示的推送地址 | \`https://api.day.app/你的KEY/\` |
| 标题 | 通知标题 | \`WebRPA 通知\` |
| 消息内容 | 正文 | \`任务已完成\` |
| 声音 | 通知音效名称 | \`alarm\` |
| 跳转链接 | 点击通知后跳转的 URL | \`https://...\` |

---

## Slack 通知（notify_slack）

通过 Slack Incoming Webhook 发送消息。

**配置项**：

| 参数 | 说明 |
|------|------|
| Webhook URL | Slack Incoming Webhook URL |
| 消息内容 | 支持 Slack mrkdwn 格式 |
| 频道 | 目标频道（可选，覆盖默认频道） |
| 用户名 | 显示名称（可选） |

---

## Server 酱（notify_serverchan）

将消息推送到微信，需在 [sct.ftqq.com](https://sct.ftqq.com) 注册获取 SendKey。

**配置项**：

| 参数 | 说明 |
|------|------|
| SendKey | Server 酱发送密钥 |
| 标题 | 消息标题 |
| 内容 | 支持 Markdown 格式 |

---

## PushPlus（notify_pushplus）

推送到微信，需在 [pushplus.plus](https://www.pushplus.plus) 注册获取 token。

**配置项**：

| 参数 | 说明 |
|------|------|
| Token | PushPlus 推送 token |
| 标题 | 消息标题 |
| 内容 | 支持 html/markdown/txt 格式 |
| 模板 | 消息模板（默认 html） |

---

## 自定义 Webhook（notify_webhook）

向任意 HTTP 接口发送 POST 请求，最灵活的通知方式。

**配置项**：

| 参数 | 说明 |
|------|------|
| Webhook URL | 目标 HTTP 接口地址 |
| 请求方法 | GET/POST/PUT |
| 请求头 | JSON 格式的请求头 |
| 请求体 | JSON/表单数据 |

---

## Ntfy（notify_ntfy）

轻量级推送服务，支持自建和公共服务器（[ntfy.sh](https://ntfy.sh)）。

**配置项**：

| 参数 | 说明 | 示例 |
|------|------|------|
| 服务器地址 | Ntfy 服务器 URL | \`https://ntfy.sh\` |
| 主题名称 | 订阅的 topic | \`my-webrpa-alerts\` |
| 消息内容 | 正文 | \`任务完成\` |
| 标题 | 通知标题（可选） | \`WebRPA\` |
| 优先级 | 1-5（5最高） | \`3\` |

---

## 其他通知渠道

| 模块 | 关键配置 |
|------|----------|
| **Microsoft Teams**（notify_msteams） | Incoming Webhook URL |
| **Pushover**（notify_pushover） | App Token + User Key |
| **Pushbullet**（notify_pushbullet） | Access Token |
| **Gotify**（notify_gotify） | 服务器地址 + App Token |
| **Matrix**（notify_matrix） | 服务器地址 + Access Token + 房间 ID |
| **Rocket.Chat**（notify_rocketchat） | 服务器地址 + Webhook URL |

---

## 实战示例：工作流完成后发送通知

\`\`\`mermaid
flowchart TD
    A[执行主要任务...] --> B{任务成功?}
    B --是--> C[设置变量\nmsg=任务完成]
    B --否--> D[设置变量\nmsg=任务失败]
    C --> E[发送钉钉通知\n内容: {msg}]
    D --> E
    E --> F[结束]
\`\`\`

**配合错误处理使用**：

在条件分支的错误输出路径上添加通知模块，当工作流出错时自动发送告警。

---

## 使用技巧

- **全局配置**：在「全局配置」->「通知」中预设常用渠道的参数，避免每个模块重复填写
- **变量引用**：消息内容中可用 \`{变量名}\` 引用工作流变量，实现动态消息
- **多渠道并发**：可同时使用多个通知模块，一次事件通知多个渠道
- **防通知刷屏**：配合条件判断，只在特定条件满足时发送通知
`
