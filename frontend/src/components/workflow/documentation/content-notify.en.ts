export const notifyGuideContentEn = `# 📢 Multi-channel Notifications

This chapter covers WebRPA's 17 notification channels, letting a workflow notify you automatically when it finishes, errors out, or meets a condition.

---

## Overview

The notification modules support mainstream platforms worldwide; no extra install — just fill in each platform's config.

| Module | Best for |
|------|----------|
| Discord | International gaming/dev communities |
| Telegram | International users' first choice |
| DingTalk | Enterprise office |
| WeCom | Enterprise office |
| Feishu | Enterprise office |
| Bark | iOS users |
| Slack | International team collaboration |
| Microsoft Teams | Microsoft-ecosystem enterprises |
| Pushover | Cross-platform push |
| Pushbullet | Cross-device sync |
| Gotify | Self-hosted server |
| ServerChan | WeChat push |
| PushPlus | WeChat push |
| Custom Webhook | Any HTTP endpoint |
| Ntfy | Self-hosted/public service |
| Matrix | Decentralized chat |
| Rocket.Chat | Self-hosted team chat |

---

## 💬 Discord (notify_discord)

Send a message to a channel via a Discord webhook.

**Get the webhook URL**: Discord channel settings → Integrations → Webhooks → create and copy the URL.

| Parameter | Description | Example |
|------|------|------|
| Webhook URL | Discord webhook | \`https://discord.com/api/webhooks/...\` |
| Content | The text to send | \`Task done!\` |
| Username | Bot display name (optional) | \`WebRPA Bot\` |
| Avatar URL | Bot avatar (optional) | \`https://...\` |

---

## ✈️ Telegram (notify_telegram)

Send a message via a Telegram bot.

**Get a bot token**: search \`@BotFather\`, send \`/newbot\`, get the token (e.g. \`123456789:ABC-DEF...\`).
**Get the chat ID**: message the bot, then visit \`https://api.telegram.org/bot{TOKEN}/getUpdates\` and find \`chat.id\`.

| Parameter | Description |
|------|------|
| Bot token | The Telegram bot token |
| Chat ID | Target chat ID (user/group/channel) |
| Content | The text to send |
| Format | Markdown/HTML/plain |

---

## 🔔 DingTalk (notify_dingtalk)

Send via a DingTalk custom bot.

**Get the webhook**: DingTalk group → Settings → Group assistant → Add bot → "Custom" → copy the webhook.

| Parameter | Description |
|------|------|
| Webhook URL | DingTalk bot webhook |
| Message type | text/markdown/link |
| Title | Markdown message title |
| Content | The body |
| @ phone numbers | Phone numbers to @ (optional) |
| @ all | Whether to @all |

---

## 💼 WeCom (notify_wecom)

Send via a WeCom group bot.

**Get the webhook**: WeCom group → add a group bot → copy the webhook.

| Parameter | Description |
|------|------|
| Webhook URL | WeCom bot webhook |
| Message type | text/markdown/image/news |
| Content | The body |
| @ members | WeCom user IDs, comma-separated |

---

## 🚀 Feishu (notify_feishu)

Send via a Feishu group bot.

**Get the webhook**: Feishu group → settings → group bots → add a custom bot → copy the webhook.

| Parameter | Description |
|------|------|
| Webhook URL | Feishu bot webhook |
| Signing secret | If signature verification is enabled (optional) |
| Message type | text/post (rich)/interactive (card) |
| Content | The body |

---

## 🍎 Bark (notify_bark)

iOS-only push; install the Bark app first.

| Parameter | Description | Example |
|------|------|------|
| Bark URL | The push address shown in the app | \`https://api.day.app/yourKEY/\` |
| Title | Notification title | \`WebRPA notice\` |
| Content | The body | \`Task done\` |
| Sound | Notification sound name | \`alarm\` |
| Jump URL | URL to open when tapped | \`https://...\` |

---

## 💬 Slack (notify_slack)

Send via a Slack incoming webhook.

| Parameter | Description |
|------|------|
| Webhook URL | Slack incoming webhook URL |
| Content | Supports Slack mrkdwn |
| Channel | Target channel (optional, overrides default) |
| Username | Display name (optional) |

---

## 📨 ServerChan (notify_serverchan)

Push to WeChat; register at [sct.ftqq.com](https://sct.ftqq.com) for a SendKey.

| Parameter | Description |
|------|------|
| SendKey | ServerChan send key |
| Title | Message title |
| Content | Supports Markdown |

---

## 📬 PushPlus (notify_pushplus)

Push to WeChat; register at [pushplus.plus](https://www.pushplus.plus) for a token.

| Parameter | Description |
|------|------|
| Token | PushPlus push token |
| Title | Message title |
| Content | Supports html/markdown/txt |
| Template | Message template (default html) |

---

## 🔗 Custom Webhook (notify_webhook)

POST to any HTTP endpoint — the most flexible notification.

| Parameter | Description |
|------|------|
| Webhook URL | Target HTTP endpoint |
| Method | GET/POST/PUT |
| Headers | Headers as JSON |
| Body | JSON/form data |

---

## 📡 Ntfy (notify_ntfy)

A lightweight push service supporting self-hosted and public servers ([ntfy.sh](https://ntfy.sh)).

| Parameter | Description | Example |
|------|------|------|
| Server URL | Ntfy server URL | \`https://ntfy.sh\` |
| Topic | Subscribed topic | \`my-webrpa-alerts\` |
| Content | The body | \`Task done\` |
| Title | Notification title (optional) | \`WebRPA\` |
| Priority | 1-5 (5 highest) | \`3\` |

---

## Other channels

| Module | Key config |
|------|----------|
| **Microsoft Teams** (notify_msteams) | Incoming webhook URL |
| **Pushover** (notify_pushover) | App token + user key |
| **Pushbullet** (notify_pushbullet) | Access token |
| **Gotify** (notify_gotify) | Server URL + app token |
| **Matrix** (notify_matrix) | Server URL + access token + room ID |
| **Rocket.Chat** (notify_rocketchat) | Server URL + webhook URL |

---

## 📋 Example: notify after a workflow finishes

\`\`\`mermaid
flowchart TD
    A[Run main task...] --> B{Succeeded?}
    B --Yes--> C[Set variable\\nmsg=Task done]
    B --No--> D[Set variable\\nmsg=Task failed]
    C --> E[Send DingTalk\\ncontent: {msg}]
    D --> E
    E --> F[End]
\`\`\`

**With error handling**: add a notification module on the error output path of a condition to auto-alert when the workflow fails.

---

## 💡 Tips

- **Global config**: preset common channels' parameters under Global settings → Notifications to avoid re-entering per module
- **Variables**: use \`{name}\` in the content to reference workflow variables for dynamic messages
- **Multiple channels**: use several notification modules at once to alert multiple channels per event
- **Avoid spam**: gate notifications behind conditions to send only when needed`
