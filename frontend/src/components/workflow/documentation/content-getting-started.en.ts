export const gettingStartedContentEn = `# Quick Start: Learn WebRPA in 5 minutes

Welcome to **WebRPA** (Web Automation Framework) — a powerful and easy-to-use web automation tool that lets you build all kinds of automation without writing code.

---

## Important update: browser engine architecture

WebRPA now uses a **main-process browser engine**. When a workflow runs, it can directly reuse an already-open browser page without restarting the browser.

**New workflow execution flow:**
1. Click "Open browser" in the toolbar to launch the browser in the main process
2. Manually open the website you want to operate
3. Create a workflow whose first module is "Operate the open page"
4. Run the workflow -> it operates the open page directly, no restart needed

**Benefits:**
- Higher automation efficiency (no browser restart)
- Saves system resources (shared browser instance)
- Supports multi-page operations (automatic page lifecycle management)

---

## What can WebRPA do?

### Everyday automation
- Auto sign in to websites daily to earn points
- Monitor product prices and get notified on price drops
- Send email notifications automatically
- Run repetitive tasks on a schedule

### Data scraping
- Batch-scrape web data and export to Excel
- Auto-collect news and article content
- Collect product info, prices and reviews
- Extract tables and list data
- Write scraped data straight into MySQL

### Smart processing
- Process and analyze data with AI
- Use AI vision to recognize captchas and image content
- Auto-generate reports and summaries

---

## Your first workflow: a Baidu search

Let's start with a simple example — a workflow that searches on Baidu automatically.

### Step 1: Open the browser

1. Click the "Open browser" button in the toolbar
2. In the browser that pops up, manually open https://www.baidu.com

### Step 2: Drag in the "Operate the open page" module

1. Find **Operate the open page** in the **module list** on the left
2. **Drag** it onto the canvas in the middle
3. This module automatically connects to the open Baidu page

### Step 3: Add a "Type text" module

1. Drag a **Type text** module onto the canvas
2. **Connect modules**: move the mouse to the small dot at the bottom of the "Operate the open page" module, hold and drag to the small dot at the top of the "Type text" module, then release to connect
3. Configure the "Type text" module:
   - **Selector**: \`#kw\` (the ID of the Baidu search box)
   - **Text**: \`WebRPA automation tool\`

### Step 4: Add a "Click element" module

1. Drag in a **Click element** module
2. Connect it to the "Type text" module
3. Configure:
   - **Selector**: \`#su\` (the ID of the Baidu search button)

### Step 5: Run the workflow

1. Click the **Run** button in the top toolbar
2. Watch the browser open Baidu, type the text and click search
3. Check the run in the **log panel** at the bottom

Congratulations! You've built your first automation workflow!

### Flow diagram

\`\`\`mermaid
%%{init: {'theme':'default', 'themeVariables': { 'fontSize':'18px'}}}%%
graph LR
    A["<b>Open page</b><br/><br/>Baidu home"] --> B["<b>Type text</b><br/><br/>type keyword in search box"]
    B --> C["<b>Click element</b><br/><br/>click the search button"]
    C --> D["<b>Search done</b>"]
    
    style A fill:#e3f2fd,stroke:#1976d2,stroke-width:3px,color:#000
    style B fill:#fff3e0,stroke:#f57c00,stroke-width:3px,color:#000
    style C fill:#f3e5f5,stroke:#7b1fa2,stroke-width:3px,color:#000
    style D fill:#e8f5e9,stroke:#388e3c,stroke-width:3px,color:#000
\`\`\`

---

## Interface overview

### Overall layout

\`\`\`
┌─────────────────────────────────────────────────────────┐
│                      Top toolbar                         │
├──────────┬────────────────────────────┬─────────────────┤
│          │                            │                 │
│  Module  │         Canvas area         │   Config panel  │
│   list   │   (where you build flows)   │   (parameters)  │
│          │                            │                 │
├──────────┴────────────────────────────┴─────────────────┤
│                       Log panel                          │
└─────────────────────────────────────────────────────────┘
\`\`\`

### 1. Module list (left)

All available modules, grouped by category:
- **Basic operations**: open page, click, type, get info, etc.
- **Element operations**: get child elements, get sibling elements
- **Wait modules**: fixed wait, wait for element
- **Data processing**: variable, list and dict operations
- **Data tables**: add rows/columns, export to Excel
- **Database**: MySQL connection, CRUD
- **Flow control**: condition, loop, iteration, scheduled run, subflow
- **AI capabilities**: AI chat, AI vision, AI smart crawler, AI element selector
- **Advanced features**: API requests, email, file operations, PDF, media, etc.
- **Blind watermark (invisible digital watermark)**: embed text/small images into a picture invisibly yet recoverably, often used for copyright tracing
- **473 modules total**, covering almost every common automation scenario

> **The module search box supports fuzzy search by Chinese, pinyin or pinyin initials**: typing \`dakai\` or \`dk\` finds "Open page"; typing \`mangshuiyin\` or \`msy\` finds the "Blind watermark" modules.

### 2. Canvas area (center)

- **Module count**: shown live in the top-left
- **Drag modules**: drag them in from the left
- **Connect modules**: drag from one module's output dot to another's input dot
- **Select a module**: click to select, then configure on the right
- **Delete a module**: select it and press Delete
- **Move the view**: hold Space and drag, or use the mouse wheel to zoom

### 3. Config panel (right)

Shows the selected module's settings:
- **Module name**: customizable for easy identification
- **Specific parameters**: vary by module type
- **Advanced options**: timeout (actually applied), retry count, etc.
- **Variable-name input**: supports fuzzy autocomplete, showing matching variables as you type

### 4. Log panel (bottom)

Four tabs:
- **Execution log**: detailed run logs with search and filtering; you can set how many rows to show (100-500)
- **Data table**: collected data, editable, with add row/column and CSV export
- **Global variables**: current values of all variables, can be added and edited
- **Excel assets**: uploaded Excel files for workflows to read

### 5. Top toolbar

| Button | Function |
|------|------|
| Run | Start running the workflow |
| Stop | Stop the running workflow |
| Save | Save the workflow to a local folder (Ctrl+S) |
| Open | Open a locally saved workflow |
| Workflow Hub | Browse, download and publish workflows |
| Automation browser | Manage automation browser instances |
| Tutorials | Open these tutorials |
| Global settings | Configure AI, email, workflow storage path, etc. |
| Clear | Clear the current workflow |
| AI Assistant | Open the AI assistant chat (Ctrl+K) |

---

## Global shortcuts

| Shortcut | Function |
|--------|------|
| Ctrl + K | Open / close the AI assistant |
| Ctrl + F | Toggle the "Search modules" box at the top of the canvas |
| Ctrl + S | Save the current workflow |
| Ctrl + Z | Undo |
| Ctrl + Y / Ctrl + Shift + Z | Redo |
| Ctrl + C / Ctrl + V | Copy / paste the selected nodes |
| Delete | Delete the selected nodes |
| Space + drag | Pan the canvas |

---

## Variable references quick start

In any input box, use \`{variableName}\` to reference a variable's value. Typing \`{\` pops up a variable hint list.

### Autocomplete in variable-name inputs

All variable-name inputs support **fuzzy autocomplete**:
- A list of matching variables appears as you type
- Fuzzy matching: type part of the name to find it
- Use Up/Down to select, Enter to confirm, Esc to close
- Storage-variable inputs (used to create new variables) won't say "variable not found"

### Basic syntax

| Syntax | Meaning | Example |
|------|------|------|
| \`{name}\` | Reference a variable | \`{username}\` -> John |
| \`{list[index]}\` | List item | \`{fruits[0]}\` -> Apple |
| \`{list[-1]}\` | Last list item | \`{fruits[-1]}\` -> Orange |
| \`{dict[key]}\` | Dict value | \`{user[name]}\` -> John |
| \`{data[0][title]}\` | Nested access | a dict field inside a list |

### Loop variables

Loop modules create variables automatically that you can reference directly:
- \`{item}\` - the current element when iterating a list
- \`{index}\` - the current index when iterating a list
- \`{loop_index}\` - the loop index in a count loop

### Mixing in text

\`\`\`
Hello, {username}! Your order is {orderId}, total {amount}.
\`\`\`

---

## Must-know tips for beginners

### Element selectors
- **Ctrl+click** the selector button: visually pick a single element
- **Alt+click** the selector button: pick similar elements (essential for batch scraping)

### Quick actions
- **Ctrl+S**: save the current workflow locally
- **Alt+N**: new workflow (clear the canvas)
- **Ctrl+C / Ctrl+V**: copy/paste modules
- **Ctrl+Z**: undo
- **Ctrl+Y**: redo
- **Ctrl+A**: select all modules
- **Ctrl+D**: disable/enable the selected modules
- **Ctrl+F**: search modules (by name or note)
- **Ctrl+G**: jump to the next search result
- **Delete / Backspace**: delete the selected modules
- Drag the empty canvas to move the view
- Use the wheel to zoom
- Drag a JSON file onto the canvas to import a workflow

### Debugging tips
- When something breaks, check the error in the **log panel** first
- Use the **Print log** module to output variable values
- Test a single module first, then the whole flow
- Use **Variable tracking** to see a variable's full change history

### Global settings
- Click **Global settings** in the toolbar to set defaults
- Configure default parameters for AI, email, database, etc.
- Set the workflow save path and auto-save options
- Enable **Auto-detect clipboard screenshots**: after you press PrtScn or use a snipping tool, a save dialog pops up automatically for quick saving

### Stability
- Add a **Wait** module after page navigations
- Set sensible **timeout** and **retry count**
- **Wait for element** is smarter than a fixed wait

---

## Dual view: flow diagram / block bar

The WebRPA canvas supports two building views, switchable with one click via the **toggle button at the bottom center**. Both share the same workflow data, so you can switch freely without affecting each other:

- **Flow diagram view**: a visual graph of nodes + edges, great for expressing branches, loops and complex paths — ideal for "visual" users.
- **Block bar view** (YingDao-style structured): a top-down step bar where conditions use indented "If/Else" boxes and loops use indented "Loop body" boxes. You can build a complete workflow with conditions, loops and nesting using only blocks, without switching back to the diagram.

Common block-bar actions:
- **Drag modules from the left into the bar**: drop directly inside a branch/loop body to create precisely where you let go.
- **Click the plus**: open a module picker (with search) at any insert point; selecting inserts it.
- **Long-press and drag an existing block**: reorder it or move it into another branch/loop body.
- **Color coding**: each block is colored by its category, matching the left module library and diagram node colors, so the hierarchy is clear at a glance.

> Workflows generated by the assistant can also be viewed and edited freely in both views.

---

## Next steps

1. **Basic Modules** - learn how each module works in detail
2. **Data Processing** - learn variable, list and dict operations
3. **Databases** - learn MySQL connection and operations
4. **Complete Selector Guide** - master CSS selectors
5. **Practical Cases** - learn complete automation solutions
6. **Advanced Features** - explore AI, API and other advanced capabilities

---

**Tip**: the best way to learn automation is hands-on practice! Try building a workflow that auto-logs in to a site you use often!`

