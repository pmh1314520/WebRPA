export const aiAssistantGuideContentEn = `# 🤖 AI Assistant Guide

WebRPA ships with an **all-round AI assistant** that not only answers questions but can directly operate the whole of WebRPA. Anything you can do manually in the UI, it can do for you.

---

## 🚀 Quick start

### Open the assistant

Press **Ctrl + K** to bring up the assistant chat, or click the assistant button in the top-right.

### Configure the AI model

Go to **Global settings → AI Assistant**:

| Field | Description |
|------|------|
| API URL | OpenAI-compatible URL (supports Zhipu GLM, DeepSeek, Tongyi Qianwen, Kimi, local Ollama, etc.) |
| API Key | Your key |
| Model | e.g. \`glm-4-plus\`, \`deepseek-chat\`, \`qwen-plus\`, \`gpt-4o\` |
| System prompt | Optional, adds stylistic instructions for the assistant |
| Enable tools | Whether the assistant may call Skills to operate WebRPA |
| Auto-approve | Whether dangerous actions (delete, etc.) need confirmation |

> Any OpenAI-compatible model works. URLs without \`/chat/completions\` are auto-completed.

---

## 🎯 What it can do

The assistant has **top-level privileges** and can perform all of the following for you:

### Workflow operations
- Create a blank workflow, save the current one, export JSON / Markdown / Playwright code
- **Run in headed/headless mode**, stop a run
- Load a local workflow, rename a workflow
- Get the full node / edge / variable details of the current canvas

### Node operations
- Add nodes, delete single or multiple nodes
- Modify node config (any field)
- Move a node to exact coordinates, change its display name
- Bulk-find node IDs by type
- Create/delete edges, align the canvas
- Copy/paste, undo/redo
- Fit the view (fit_view), focus a given node

### Variable management
- Add, update, delete, rename variables
- List all variables

### Assets & settings
- List local workflows, custom modules, scheduled tasks
- List Excel assets and image assets
- Read/modify any global setting (browser, AI, email, database, QQ, Feishu, etc.)
- Export logs, download the data table, upload Excel/images

### Dialogs & UI
- Open/close: Global settings, local workflow list, scheduled tasks, docs, Workflow Hub, automation browser, phone mirror, variable tracking, screensaver barrage, export dialog
- Switch the bottom-bar tab (logs/data/variables/assets/images)
- Trigger the system screenshot tool
- Show toast messages

### Long-term memory
- \`remember\` records your preferences and habits
- \`recall\` queries memory across sessions
- The 5 most recent memories are auto-injected at the start of the next session

### Full snapshot (deep query)
- \`get_full_snapshot\` retrieves the executor list, local workflows, custom modules, scheduled tasks and recent run results at once
- \`search_in_workflows\` full-text searches all local workflows
- \`summarize_workflow\` auto-produces a structured workflow summary (entry/exit nodes, variable usage)

---

## 🧰 WebRPA steward capabilities (ops / enterprise / packaging)

The assistant is not only a workflow builder but a "steward" for WebRPA: anything AI can solve, operate, or look up across the platform can be handed to it.

### Capability introspection
- \`list_my_capabilities\`: have the assistant list all skill categories and counts it currently masters — just ask "what can you do"

### Platform health check
- \`run_platform_health_check\`: one-click self-check of platform health, producing a graded \`[Critical]/[Warning]/[Info]\` report (dependencies, config, runtime, data integrity, etc.) to quickly spot issues

### Run-data aggregation query
- Aggregate recent workflow runs: success/failure counts, durations, failed nodes, collected-data volume, etc.
- Just ask "which flows failed recently and why" — the assistant summarizes execution history into conclusions

### One-click package to EXE
- Tell the assistant "package the current workflow into an exe named XXX" and it invokes the packaging capability, auto-including global variables, Excel/image assets and custom modules, producing a standalone Windows program (see the "Platform Features" doc)

### Enterprise platform management (if the enterprise module is enabled)
- Query/manage robot clusters, orchestration tasks, approval flows, audit logs, RBAC roles and the credential vault
- Drive the enterprise "create → approve → execute" closed loop with natural language

> All of these are governed by the 3-level "AI permissions" (per-action confirm / smart auto / full access); high-risk actions ask for approval first.

---

## 💬 Examples

### Example 1: let the assistant build a workflow for you

\`\`\`
You: Build a workflow that opens Weibo at 9am daily, searches "AI news",
     and scrapes the first 10 titles, contents and links into Excel

Assistant: Sure. Let me check the current project state first…
[calls get_full_snapshot]
[calls search_modules('scrape')]

Here's my plan:
1. Scheduled-task trigger (daily 9:00)
2. Open browser → operate the open page
3. Go to https://s.weibo.com/weibo?q=AI news
4. Loop 10 times: scrape title/content/link
5. Write to Excel

Generating the nodes and loading them onto the canvas now…
[calls client_action(action='load_workflow_from_data', payload={...})]
✅ Done. Please review the canvas and try running it!
\`\`\`

### Example 2: bulk-edit config

\`\`\`
You: Set the wait time of all "Open page" nodes to 3 seconds

Assistant: [calls find_nodes_by_type('open_page')]
Found 5 matching nodes, updating in bulk…
[calls update_node_config one by one]
✅ waitTime of 5 nodes updated to 3
\`\`\`

### Example 3: natural-language queries

\`\`\`
You: How many nodes are on the canvas? Which ones are unconnected?

Assistant: [calls client_action(action='get_workflow_detail')]
There are 12 nodes on the canvas:
- Connected: 10
- Isolated: 2 (id: abc123 [click_element], def456 [type_text])
Consider connecting or removing them.
\`\`\`

### Example 4: long-term memory

\`\`\`
You: Remember that my project code is in D:/Projects/, and I log in to Bilibili with Edge

Assistant: [calls remember(content="project dir D:/Projects/, log in to Bilibili with Edge", tags=["preference"])]
Noted. Next time I download Bilibili videos for you, I'll read cookies from Edge.
\`\`\`

---

## 🎨 Rich replies

The assistant renders **Markdown / GFM** throughout:
- Headings / lists / quotes
- **bold** *italic* \`inline code\`
- Code blocks with syntax highlighting
- Tables, links, kbd marks

---

## 🔐 Permissions & safety

- **Dangerous actions** (deleting workflows, deleting memories, etc.) require confirmation by default; you can disable confirmation in Global settings
- All of the assistant's actions are **reflected live in the UI**, easy to review and revert
- Every node change goes onto the **undo stack** — press Ctrl+Z to revert

---

## ⚙️ Recommended setups

Different models suit different scenarios:

| Model | Recommended use |
|------|----------|
| GLM-4-Plus / DeepSeek-Chat | Cost-effective, stable tool calls |
| GPT-4o / Claude Sonnet | Reasoning over complex workflows |
| Qwen-Plus | Best for Chinese-language scenarios |
| Local Ollama | Offline use |

---

## 🐛 Troubleshooting

| Symptom | Fix |
|------|------|
| Assistant doesn't reply | Check the API key and URL |
| Assistant talks but doesn't act | Enable "Enable tools" in Global settings |
| Error "LLM call failed" | Check the model name; it may not support function calling |
| Nothing happens after an action | Check the bottom log; the action name may be misspelled or the payload missing |

---

## 💡 Power tips

1. **First message of a new session**: describe your goal so the assistant calls \`get_full_snapshot\` to understand the current state
2. **Complex workflows**: have the assistant produce the node structure at once with \`build_workflow\`, then load it with \`load_workflow_from_data\`
3. **Repetitive tasks**: use \`remember\` to store project conventions so you don't re-explain each time
4. **Debugging**: just ask "what potential issues does this workflow have" — the assistant calls \`summarize_workflow\` to advise

---

## 🔁 Workflow self-healing (auto-fix on run failure)

This is a flagship 2.0 capability: after building a workflow the assistant **proactively test-runs it**, and if it fails, it **enters a bounded "diagnose → fix → rerun" loop on its own** (up to 3 rounds) instead of dumping the error on you.

What it does:
- Runs the workflow and truly waits for it to finish, calling \`auto_heal_workflow\` to aggregate all failed nodes + generate an actionable fix plan;
- **Selector not found** → automatically \`probe_page\` / \`suggest_selector\` to re-probe the real selector and replace it;
- **Execution timeout** → automatically raise the timeout, prepend a wait-for-element, or add retries;
- **Wrong value path** → use \`get_node_io_snapshot\` to inspect the previous step's real output structure and correct it;
- **Missing required field** → look up the schema default and fill it in automatically;
- After fixing, it **reruns to verify** until everything is green; only for info you must provide (account/password, download location, which file) will it ask a precise follow-up.

> Try it: deliberately break a web node's selector, then have the assistant run it and watch it auto-probe, fix and rerun.

---

## 🧠 AI data-processing modules (make workflows "think")

The assistant can build flows and also use the new 2.0 **AI data-processing workflow modules** (the "AI Data" category in the sidebar) to embed LLM power right into a workflow:

| Module | Use |
|------|------|
| AI info extraction | Turn unstructured text (pages/emails/docs) into JSON |
| AI text classification | Auto-classify tickets/comments (complaint/inquiry/praise…) |
| AI summarization / AI translation | Condense long text / translate across languages |
| AI sentiment analysis | Judge positive/negative sentiment of comments |
| AI data normalization | Standardize dates/amounts/phones/addresses |
| AI semantic dedup | Merge items "worded differently but meaning the same" |
| AI smart routing | Pick the next branch by content, giving the workflow "judgment" |

A typical combo: \`scrape comments → AI sentiment analysis → AI smart routing → auto-create tickets for negatives / auto-archive praise\`. These modules reuse the global AI config by default and work out of the box.
`
