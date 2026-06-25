export const browserGuideContentEn = `# Automation Browser in depth

This chapter covers how the automation browser works, how to configure it, and tips for using it.

---

## Browser engine architecture

WebRPA uses a **main-process browser engine** — all workflow runs share the same browser instance.

### Architecture benefits

| Benefit | Description |
|------|------|
| Efficient | No browser restart; reuse the open page directly |
| Low resource | Shared browser instance saves system resources |
| Multi-page | Supports multi-page operations with automatic page lifecycle |
| State kept | Login state, cookies, etc. are kept automatically |
| Async | All operations are async and don't block the main thread |

### Workflow

1. **Launch the browser**: click "Open browser" in the toolbar
2. **Manual actions**: open sites, log in, etc. in the browser
3. **Create a workflow**: make the first module "Operate the open page"
4. **Run the workflow**: it operates the open page directly, no restart

---

## What is the automation browser?

WebRPA uses **Playwright** to drive the browser. It uses **Microsoft Edge** by default, and also supports **Chrome**, **Chromium** and **Firefox**.

### Key features

| Feature | Description |
|------|------|
| Real browser | Uses a real browser, not a simulator |
| Multi-browser | Edge, Chrome, Chromium, Firefox |
| Login persistence | Browser data is persisted; login state is saved |
| Visual | You can watch the browser execute |
| Element selector | Visually pick web elements |
| Shared instance | All workflows share one browser instance |

### Browser data directory

All browser data (cookies, login state, cache, etc.) is stored at:
\`\`\`
backend/browser_data/{browser type}/
\`\`\`

For example:
- Edge: \`backend/browser_data/msedge/\`
- Chrome: \`backend/browser_data/chrome/\`
- Firefox: \`backend/browser_data/firefox/\`

This means:
- After logging in to a site once, later runs need no re-login
- Different browsers' data are independent
- You can manually clear this directory to reset browser state

---

## Browser settings

### Switch browser type

1. Click **Global settings** in the top toolbar
2. Choose the **Browser** tab
3. Pick the browser type you want:
   - **Microsoft Edge** (default): bundled with Windows
   - **Google Chrome**: requires Chrome installed
   - **Chromium**: the open-source version of Chrome
   - **Firefox**: requires Firefox installed

4. If the browser won't start, you can manually specify the browser executable path

### Notes

- After changing browser settings, **close and reopen** the browser for them to take effect
- Each browser's data directory is independent; after switching you must log in again
- Edge or Chrome is recommended for best compatibility

---

## Open the automation browser

### Option 1: toolbar button

Click **Automation browser** in the top toolbar to:
- Open/close the browser
- Navigate to a URL
- Start the element selector

### Option 2: run a workflow

When a workflow contains an "Open page" module, the browser starts automatically.

---

## Element selector

The element selector is a core WebRPA feature: locate web elements without writing CSS selectors.

### How to start

1. **From the toolbar**: "Automation browser" -> "Start picker"
2. **From the config panel**: click the button next to a selector input

### Selection modes

| Action | Function | When to use |
|------|------|----------|
| **Ctrl + click** | Select a single element | Buttons, inputs, etc. |
| **Alt + click** | Select similar elements | List items, table rows, etc. |
| **Esc** | Cancel selection | Reselect |

### Single-element selection

1. Start the picker
2. Hold **Ctrl**
3. Click the target element
4. The selector is filled into the config automatically

### Similar-element selection

For selecting multiple structurally similar elements (e.g. a product list):

1. Start the picker
2. Hold **Alt**
3. Click the first element
4. Click a second similar element
5. The system auto-detects all similar elements

**Generated selector example**:
\`\`\`css
.product-list > div:nth-child({index})
\`\`\`

where \`{index}\` is a variable — combine with a loop to iterate over all elements.

---

## Page navigation

### Open a page

\`\`\`
Module: Open page
URL: https://www.example.com
Wait condition: load (page fully loaded)
\`\`\`

### Wait conditions explained

| Condition | Meaning | When to use |
|------|------|----------|
| load | Wait for all resources to load | Normal pages |
| domcontentloaded | DOM loaded is enough | Fast response |
| networkidle | Network is idle | Ajax dynamic pages |

### Page jumps

| Module | Function |
|------|------|
| Refresh page | Reload the current page |
| Go back | Browser back |
| Go forward | Browser forward |
| Close page | Close the current tab |

---

## Handling dialogs

### Native browser dialogs

Handle \`alert\`, \`confirm\`, \`prompt\` dialogs:

| Dialog type | How to handle |
|----------|----------|
| alert | Click OK |
| confirm | Click OK or Cancel |
| prompt | Type text then confirm |

**Example**:
\`\`\`
Module: Handle dialog
Action: Confirm (click OK)
Text: captcha123 (only for prompt)
\`\`\`

### Custom page dialogs

Custom (non-native) page dialogs are handled with normal click actions:
\`\`\`
1. Wait for element: .modal-dialog appears
2. Click element: .modal-confirm-btn
\`\`\`

---

## Performance tips

### Reduce wait time

\`\`\`
[×] Not recommended: fixed wait of 5000 ms
[√] Recommended: wait for element #content to appear
\`\`\`

### Set sensible timeouts

| Scenario | Suggested timeout |
|------|----------|
| Normal page load | 30s |
| Complex page / slow network | 60s |
| Element wait | 10s |
| File download | Depends on file size |

### Avoid acting too fast

\`\`\`
[×] Not recommended:
click -> immediately get data

[√] Recommended:
click -> wait for element -> get data
\`\`\`

---

## Anti-detection notes

WebRPA uses a real browser, but some sites may detect automation.

### Lower the detection risk

1. **Add random delays**: insert random waits between actions
2. **Mimic human behavior**: don't act too fast
3. **Keep login state**: use persisted browser data
4. **Reasonable request rate**: avoid many requests in a short time

### Example: add a random delay

\`\`\`
Loop
  ├─ do action
  ├─ random number: 1000 to 3000
  └─ wait: {randomNumber} ms
\`\`\`

---

## Web smart recording (record to generate nodes)

Don't want to connect nodes by hand? Just act in the browser and WebRPA records it into workflow nodes.

### Usage

\`\`\`
1. Open the automation browser first
2. Top bar "Record" dropdown -> "Web smart recording"
3. Click "Start recording", then act normally in the browser
4. Click "Stop recording" -> edit as needed -> "Generate nodes" to append to the canvas
\`\`\`

### What gets recorded

\`\`\`
- Clicks, typing, dropdown selection, checkboxes
- Scrolling (direction and distance auto-merged)
- Function/combo keys (Enter, Tab, arrows, Ctrl+C, etc.)
- Navigation (open/jump to URLs)
\`\`\`

### Uninterrupted across pages / new tabs

Events are pushed to the backend in real time, so **clicking links, opening new tabs and cross-origin jumps keep recording** without loss.

### Editable after recording

\`\`\`
After stopping, each step supports:
- delete the step
- move up / down to reorder
With "Auto wait" checked, wait nodes are inserted at action intervals (for slow-loading pages).
\`\`\`

> Recordings produce standard nodes that you can keep editing, adding conditions/loops just like a hand-built workflow.

---

## Common issues

### Browser won't open

**Possible causes**:
- The chosen browser isn't installed
- The port is occupied
- Insufficient permissions
- Wrong custom path

**Fixes**:
1. Make sure the browser is installed (Edge/Chrome/Firefox)
2. Close other programs using the browser
3. Run as administrator
4. Check the browser path in Global settings
5. Try switching to another browser type

### Element not found

**Possible causes**:
- Wrong selector
- The element is inside an iframe
- The element loads dynamically

**Fixes**:
1. Reselect with the element picker
2. Add a wait-for-element module
3. Check whether you need to switch iframe

### Login state lost

**Possible causes**:
- The browser data directory was cleared
- The site's cookies expired

**Fixes**:
1. Log in again
2. Check that the browser_data directory exists

---

## Best practices

### Start of a workflow

\`\`\`
1. Open the page
2. Wait for a key element
3. Check login state
4. Start the task
\`\`\`

### End of a workflow

\`\`\`
1. Save data
2. Print a completion log
3. (optional) Close the page
4. (optional) Play a beep
\`\`\`

### Error handling

\`\`\`
Condition: {elementExists} == true
  ├─ true -> continue
  └─ false -> print error log -> break the loop
\`\`\`\`


---

## DP Anti-detection Automation

DrissionPage (DP) works by controlling a real browser kernel plus sending/receiving packets, making it stealthier on sites that detect the webdriver flag. Use it when the regular automation browser gets blocked by anti-bot systems.

| Module | Description |
|------|------|
| **dp_open_page** | Open / navigate to a page, optional headless mode |
| **dp_click** | Click an element (supports timeout) |
| **dp_input** | Type text, optionally clear first |
| **dp_get_text** | Get element text into a variable |
| **dp_get_html** | Get the current page HTML into a variable |
| **dp_run_js** | Run JavaScript and store the result |
| **dp_wait_element** | Wait for an element to appear |
| **dp_scroll** | Scroll the page (bottom / top / down / up) |
| **dp_close** | Close the DrissionPage browser |

Locators pass through DrissionPage syntax directly: #id, .class, tag:xx, text:xx, xpath://..., css:....

Flow: open with dp_open_page (it reuses one browser session within a single workflow), then use dp_click / dp_input, and finally dp_close. The DP browser is closed automatically when the workflow ends, so the next run always starts a clean session and never reuses leftovers; a dead previous page is recreated automatically.

Browser engine: DrissionPage is also Chromium-based and supports both Edge and Chrome. dp_open_page prefers the system Edge by default (consistent with other WebRPA modules); you can also choose Chrome or specify a browser path in its config, and set "Reuse browser" to "open a clean session each time" for scraping tasks. First-time use needs the dependency: run Python313/python.exe -m pip install DrissionPage in the WebRPA folder.
`
