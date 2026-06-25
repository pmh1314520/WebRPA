export const scheduledTasksGuideContentEn = `# Scheduled Tasks

The scheduled-task system runs workflows automatically without manual triggering.

---

## Overview

- **Scheduled runs**: run at a set time or interval
- **Repeat**: repeat a set number of times
- **Multiple triggers**: time, hotkey, webhook, file watch, email
- **Run logs**: record details of each run
- **Task management**: enable/disable, run manually, force stop

---

## Quick start

### Create a task

1. Click the "Scheduled tasks" button in the toolbar
2. Click "New task"
3. Fill in the info:
   - Task name
   - Choose a workflow
   - Configure the trigger
4. Click "Create"

### Basic config

\`\`\`yaml
Task name: Daily data collection
Workflow: data-collection.json
Trigger type: Time trigger
Run time: daily 09:00
\`\`\`

---

## Trigger types

### 1. Time trigger

Run automatically by a time rule.

**Cron expression**:
\`\`\`
Format: minute hour day month weekday
Examples:
  0 9 * * *        # daily at 9:00
  0 */2 * * *      # every 2 hours
  0 9 * * 1-5      # weekdays at 9:00
  0 0 1 * *        # 1st of each month at 0:00
  */30 * * * *     # every 30 minutes
\`\`\`

**Common expressions**:
| Expression | Meaning |
|--------|------|
| \`0 9 * * *\` | Daily 9:00 |
| \`0 */1 * * *\` | Hourly |
| \`*/30 * * * *\` | Every 30 min |
| \`0 9 * * 1\` | Mondays 9:00 |
| \`0 0 1 * *\` | 1st of month 0:00 |

**Interval run**:
\`\`\`yaml
Interval type: minutes/hours/days
Interval value: 30
# runs every 30 minutes
\`\`\`

### 2. Hotkey trigger

Run when a shortcut is pressed.

\`\`\`yaml
Hotkey: Ctrl+Shift+F1
Description: quick-start data collection
\`\`\`

**Notes**:
- Hotkeys are global and work in any window
- Avoid conflicts with system shortcuts
- Ctrl+Shift+F1~F12 is recommended

### 3. Webhook trigger

Trigger via an HTTP request.

\`\`\`yaml
Webhook path: /webhook/data-sync
Method: POST
\`\`\`

**How to call**:
\`\`\`bash
curl -X POST http://localhost:5241/api/webhooks/data-sync \\
  -H "Content-Type: application/json" \\
  -d '{"key": "value"}'
\`\`\`

**Get request data**:
\`\`\`
Use variables in the workflow:
{webhook_payload}  # the full body
{webhook_headers}  # the headers
\`\`\`

### 4. File-watch trigger

Watch a folder and run on changes.

\`\`\`yaml
Watch path: C:\\Downloads
Watch type: file created
File pattern: *.xlsx
\`\`\`

**Watch types**: file created, file modified, file deleted, any change.

**File patterns**:
\`\`\`
*.xlsx          # all Excel files
report_*.pdf    # PDFs starting with report_
**/*.txt        # txt files in all subfolders
\`\`\`

### 5. Email trigger

Run when a matching email arrives.

\`\`\`yaml
IMAP server: imap.qq.com
Email account: your@qq.com
Email password: app code
Check interval: 60s
Sender filter: boss@company.com
Subject keyword: report
\`\`\`

**Get email data**:
\`\`\`
{email_subject}   # subject
{email_from}      # sender
{email_body}      # body
{email_attachments}  # attachment list
\`\`\`

### 6. API trigger

Poll an API periodically and trigger based on the response.

\`\`\`yaml
API URL: https://api.example.com/status
Method: GET
Check interval: 300s
Condition field: status
Operator: ==
Value: ready
\`\`\`

**Use cases**: monitor API status, wait for an async task, detect data updates.

---

## Repeat

\`\`\`yaml
Enable repeat: yes
Repeat count: 10
Repeat interval: 60s
\`\`\`

**Example**:
\`\`\`
Task: data collection
Trigger: daily 9:00
Repeat: 10 times, 60s interval

Run times:
09:00:00 - 1st
09:01:00 - 2nd
09:02:00 - 3rd
...
09:09:00 - 10th
\`\`\`

### Infinite repeat

\`\`\`yaml
Enable repeat: yes
Repeat count: blank (infinite)
Repeat interval: 300s
\`\`\`

---

## Task management

### Task list

Shows all tasks and their status: [√] enabled, disabled, running, next run time.

### Task actions

- **Enable/disable**: disabled tasks don't run automatically but can be run manually
- **Run manually**: run once now without affecting the schedule
- **Force stop**: stop a running task and clean up browser resources
- **Edit**: change the trigger, workflow or repeat settings
- **Delete**: permanently delete the task and its logs

---

## Run logs

### Log info

Each run records: trigger time, trigger type, status (success/failure/stopped), duration, executed nodes, failed nodes, error message, collected-data count.

### View logs

1. Click the task's "View logs"
2. See the run history
3. Click an entry for details

### Log management

- **Clear logs**: delete all history
- **Export logs**: export to JSON
- **Log limit**: keeps the latest 100 by default

---

## Advanced

### Headless mode

\`\`\`yaml
Headless: yes
\`\`\`

The browser runs in the background with no window — saves resources, good for servers.

### Open monitor page

\`\`\`yaml
Open monitor page: yes
\`\`\`

Opens the front-end monitor page during a run so you can watch progress; closes automatically when done.

### Run on startup

\`\`\`yaml
Run on startup: yes
Delay seconds: 10
\`\`\`

Runs automatically after WebRPA starts, with an optional delay — good for run-on-boot.

---

## Best practices

### 1. Reasonable frequency

\`\`\`
[×] Not recommended: scrape every minute
[√] Recommended: hourly or daily

Why:
- Avoid being banned for frequent requests
- Reduce server load
- Save resources
\`\`\`

### 2. Add error handling

\`\`\`
In the workflow:
- Check key data with conditions
- Send a notification on failure
- Log details
\`\`\`

### 3. Use headless mode

\`\`\`
For production:
- Enable headless
- Disable the monitor page
- Reduce resource usage
\`\`\`

### 4. Review logs regularly

\`\`\`
Weekly check:
- Success rate
- Error messages
- Duration changes
\`\`\`

### 5. Avoid resource conflicts

\`\`\`
Notes:
- Don't run too many tasks at once
- Don't have multiple tasks touch the same file
- Spread out run times
\`\`\`

---

## Run notifications (proactive failure/success alerts)

After a task finishes, it can push the result to you so you know about failures immediately.

### Where to configure

\`\`\`
New / edit scheduled-task dialog -> bottom "Run notifications" area:
- Check "Notify on failure" and/or "Notify on success"
- Click the button to add one or more channels
\`\`\`

### Supported channels

\`\`\`
- Email (SMTP): server / port / account / secret / recipient
- WeCom: group-bot key (or full webhook)
- DingTalk: access_token (optional signing secret)
- ServerChan: SendKey
- Custom Webhook: callback URL (POST JSON)
\`\`\`

### Security tip

\`\`\`
For secrets/keys, reference the credential vault instead of plaintext:
  password field: {{cred:My mailbox.password}}
The backend decrypts and injects at runtime; no plaintext stays in the task config.
(See the "Platform Features" doc for the credential vault.)
\`\`\`

> Notifications are sent asynchronously in the background and don't slow the queue; a failure in one channel is only logged and doesn't affect others.

---

## Common issues

### Task doesn't run

**Causes**: task disabled; wrong Cron; workflow file missing; wrong system time.
**Fixes**:
\`\`\`
1. Check the task is enabled
2. Validate the Cron expression
3. Confirm the workflow file exists
4. Check the system time
\`\`\`

### Task stuck running

**Causes**: infinite loop in the workflow; wait-for-element timeout; a stuck network request.
**Fixes**:
\`\`\`
1. Click "Force stop"
2. Check the workflow logic
3. Add timeouts
4. View the run log
\`\`\`

### Browser processes piling up

**Fix**:
\`\`\`
Already auto-fixed:
- Browsers are cleaned up after each run
- Resources are cleaned even on abnormal exit
- No manual handling needed
\`\`\`

---

## Practical cases

### Case 1: daily data collection

\`\`\`yaml
Task name: Daily price scraping
Workflow: price-monitor.json
Trigger: time
Cron: 0 9 * * *  # daily 9:00
Repeat: 10 times, 60s interval
Headless: yes
\`\`\`

### Case 2: auto file processing

\`\`\`yaml
Task name: Auto Excel processing
Workflow: excel-processor.json
Trigger: file watch
Watch path: C:\\Downloads
File pattern: *.xlsx
Watch type: file created
\`\`\`

### Case 3: API status monitoring

\`\`\`yaml
Task name: Service status monitor
Workflow: status-check.json
Trigger: API
API URL: https://api.example.com/health
Check interval: 300s
Condition: status != "ok"
\`\`\`

### Case 4: auto email reply

\`\`\`yaml
Task name: Customer auto-reply
Workflow: email-reply.json
Trigger: email
Subject keyword: inquiry
Sender filter: *@customer.com
\`\`\`

---

## Related docs

- [Triggers Guide](triggers-guide) - detailed trigger config
- [Debugging & Errors](debug-guide) - task debugging tips
- [Practical Cases](practical-cases) - more real applications`
