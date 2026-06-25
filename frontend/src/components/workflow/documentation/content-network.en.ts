export const networkGuideContentEn = `# Network Requests & Capture

This chapter covers HTTP requests, webhook requests, network capture and related modules.

---

## HTTP request (api_request)

Send HTTP/HTTPS requests (GET, POST, PUT, DELETE, etc.) — the core module for talking to external APIs.

| Parameter | Description | Example |
|------|------|------|
| Request URL | The target endpoint | \`https://api.example.com/data\` |
| Method | GET/POST/PUT/DELETE/PATCH | \`POST\` |
| Headers | Headers as JSON | \`{"Content-Type": "application/json"}\` |
| Body | Request data (POST/PUT) | \`{"key": "value"}\` |
| Timeout (s) | Request timeout | \`30\` |
| Result variable | Saves the response body | \`api_response\` |
| Status-code variable | Saves the HTTP status code | \`status_code\` |
| Response-headers variable | Saves the response headers | \`resp_headers\` |

**Example** (GET data):
\`\`\`
HTTP request -> method: GET, URL: https://httpbin.org/get -> result variable: resp
JSON parse -> input: {resp} -> result variable: data
Print log -> {data}
\`\`\`

**Example** (POST a form):
\`\`\`
HTTP request -> method: POST
          URL: https://api.example.com/login
          headers: {"Content-Type": "application/json"}
          body: {"username": "{user}", "password": "{pwd}"}
          -> result variable: login_resp
\`\`\`

**Cookie/Token auth**:
\`\`\`json
Headers:
{
  "Authorization": "Bearer {token}",
  "Cookie": "session={session_id}"
}
\`\`\`

---

## Send email (send_email)

Send email via SMTP, supporting HTML content and attachments.

| Parameter | Description | Example |
|------|------|------|
| Sender email | SMTP account | \`your@qq.com\` |
| App code | SMTP app code (not your login password) | \`abcdefghijklmnop\` |
| SMTP server | Mail server address | \`smtp.qq.com\` |
| Port | SMTP port | \`465\` |
| Recipients | Comma-separated recipients | \`a@qq.com,b@qq.com\` |
| Subject | Email subject | \`WebRPA task done\` |
| Content | Body (supports HTML) | \`Task done, scraped {count} records.\` |
| Attachment path | File to attach (optional) | \`C:\\report.xlsx\` |

**Common SMTP settings**:

| Mailbox | SMTP server | Port |
|------|------------|------|
| QQ Mail | smtp.qq.com | 465 |
| 163 Mail | smtp.163.com | 465 |
| Gmail | smtp.gmail.com | 587 |
| Outlook | smtp.office365.com | 587 |

> **Get a QQ Mail app code**: QQ Mail -> Settings -> Account -> enable SMTP -> generate an app code

**Global config**: preset sender info under Global settings -> Email to avoid re-entering it.

---

## Webhook request (webhook_request)

Send a webhook notification to a URL — for integrating with third-party systems.

| Parameter | Description |
|------|------|
| Webhook URL | The target address |
| Method | POST/GET |
| Headers | Custom headers (JSON) |
| Body | Data to send (JSON/form) |
| Result variable | Saves the response |

---

## Network capture (network_capture)

Intercept and analyze the browser's network requests to extract API data — no HTML parsing needed.

| Parameter | Description | Example |
|------|------|------|
| Trigger action | The action that triggers the request | Click a button |
| URL filter | Only capture requests containing this string | \`/api/data\` |
| Timeout (s) | Max time to wait for the request | \`30\` |
| Result variable | Saves the captured response | \`captured_data\` |

**Typical use** (scrape an AJAX endpoint):
\`\`\`mermaid
flowchart TD
    A[Open page] --> B[Network capture\\nURL filter: /api/list]
    B --> C[Click load-more button]
    C --> D[Get captured data]
    D --> E[JSON parse]
\`\`\`

---

## Network monitor (network_monitor_start/wait/stop)

Continuously monitor network requests — for long-running scenarios.

**Flow**:
1. **Start monitoring** (network_monitor_start): begin listening in the background
2. **Wait for request** (network_monitor_wait): wait for a matching request
3. **Stop monitoring** (network_monitor_stop): stop and free resources

**Config (start)**:

| Parameter | Description |
|------|------|
| URL filter | The URL keyword to match |
| Method filter | Only listen to GET/POST, etc. |

**Config (wait)**:

| Parameter | Description |
|------|------|
| Timeout (s) | Max wait time |
| Result variable | Saves the captured request/response |

---

## Tips

### Handling JSON responses

An HTTP request returns a string; use "JSON parse" to convert it to a dict before accessing fields:
\`\`\`
HTTP request -> result variable: resp_str
JSON parse -> input: {resp_str} -> result variable: resp_data
Set variable -> variableName: user_id, value: {resp_data["data"]["id"]}
\`\`\`

### API auth

- **Bearer token**: header \`Authorization: Bearer {token}\`
- **API key**: usually a header \`X-API-Key: {key}\` or a URL parameter
- **Cookie**: header \`Cookie: session={sid}\`

### Error handling

Check the status-code variable; 200-series means success:
\`\`\`
Condition -> {status_code} == 200 -> success path
                              -> else -> failure path (send an alert)
\`\`\``
