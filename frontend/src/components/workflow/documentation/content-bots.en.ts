export const botsGuideContentEn = `# 💬 QQ & WeChat Bots

This chapter shows how to automate QQ (via the NapCat framework) and WeChat (via mouse/keyboard simulation) with WebRPA.

---

## QQ bot (based on NapCat)

QQ automation has **8 modules** that talk to QQ via NapCat, supporting sending messages/images/files and getting friend/group info.

### Prerequisites

1. Start WebRPA's bundled NapCat service (the "NapCat" toolbar button)
2. Log in by scanning the QR code with mobile or PC QQ
3. Once logged in, all QQ modules work

> **Note**: QQ automation is for personal, non-commercial use only; follow NapCat's non-commercial agreement.

---

### Send QQ message (qq_send_message)

Send a text message to a friend or group.

| Parameter | Description | Example |
|------|------|------|
| Message type | private / group | \`private\` |
| Target ID | Friend QQ number or group number | \`123456789\` |
| Content | The text to send (supports variables) | \`Task done: {result}\` |
| Result variable | Saves the send result | \`qq_msg_result\` |

**Example** (notify yourself after a workflow):
\`\`\`
Send QQ message → type: private, target: {my_qq}, content: Done! Scraped {count} records
\`\`\`

---

### Send QQ image (qq_send_image)

Send an image to a friend or group.

| Parameter | Description |
|------|------|
| Message type | private / group |
| Target ID | QQ number or group number |
| Image path | Local image path or URL |
| Result variable | Send result |

---

### Send QQ file (qq_send_file)

Send a file (document, archive, etc.) to a friend or group.

| Parameter | Description |
|------|------|
| Message type | private / group |
| Target ID | QQ number or group number |
| File path | Full local path of the file |
| Result variable | Send result |

---

### Wait for QQ message (qq_wait_message)

Wait for and receive a QQ message, filterable by source and content.

| Parameter | Description | Example |
|------|------|------|
| Source type | any / private / group | \`private\` |
| Source ID | A specific QQ or group number (optional) | \`123456789\` |
| Match mode | contains / equals / regex | \`contains\` |
| Match content | Text to match (blank = receive all) | \`start\` |
| Wait timeout (s) | 0 = wait indefinitely | \`60\` |
| Result variable | Saves the received message object | \`qq_received_message\` |

**The result contains**:
- \`sender_id\`: sender QQ number
- \`content\`: message text
- \`message_type\`: private or group
- \`group_id\`: group number (for group messages)
- \`time\`: receive timestamp

**Example** (run a task on command):
\`\`\`
Wait for QQ message → source: private, match: start scraping → result variable: msg
Print log → command received, running...
run the main task...
Send QQ message → type: private, target: {msg.sender_id}, content: Done!
\`\`\`

---

### Get friend list (qq_get_friends)

Get all friends of the current QQ account.

| Parameter | Description |
|------|------|
| Result variable | Saves the friend list (array, each with qq, nickname, etc.) |

---

### Get group list (qq_get_groups)

Get all groups the current QQ account has joined.

| Parameter | Description |
|------|------|
| Result variable | Saves the group list (group_id, group_name, etc.) |

---

### Get group members (qq_get_group_members)

Get all members of a given group.

| Parameter | Description |
|------|------|
| Group number | The target group's group_id |
| Result variable | Saves the member list |

---

### Get login info (qq_get_login_info)

Get the currently logged-in QQ account info (number, nickname, etc.).

| Parameter | Description |
|------|------|
| Result variable | Saves the login-info dict |

---

## WeChat automation

WeChat automation has **2 modules** that work via mouse/keyboard simulation, supporting any PC WeChat version.

### Prerequisites

- PC WeChat is logged in with its window open
- Don't use the mouse/keyboard during execution
- The WeChat window must not be minimized

---

### Send WeChat message (wechat_send_message)

Send a text message to a contact or group.

| Parameter | Description | Example |
|------|------|------|
| Recipient | Contact or group name (fuzzy match) | \`File Transfer\` |
| Content | The text to send | \`Hello {name}!\` |
| Result variable | Send result | \`wechat_msg_result\` |

> **Tip**: "File Transfer" (to yourself) is the best target for testing.

---

### Send WeChat file (wechat_send_file)

Send a local file to a contact or group.

| Parameter | Description |
|------|------|
| Recipient | Contact or group name |
| File path | Full local path of the file |
| Result variable | Send result |

---

## 📋 Example: a group-notification bot

\`\`\`mermaid
flowchart TD
    A[Wait for QQ message\\nmatch: query] --> B[Extract query keyword]
    B --> C[HTTP request to query API]
    C --> D[Process result data]
    D --> E[Send QQ message\\nreply with the result]
    E --> A
\`\`\`

---

## 💡 Tips

- **Get your QQ number**: use "Get login info" to get your own number, then save it with "Set variable"
- **Broadcast**: use "Get group list" to get all groups, then iterate and send
- **Message routing**: use conditions to handle different message content differently (keyword replies)
- **WeChat backup**: periodically screenshot or scrape data, then send the file to yourself on WeChat as a backup`
