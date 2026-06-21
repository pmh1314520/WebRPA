export const tipsTricksContentEn = `# 💡 Tips & Tricks

This chapter gathers various practical tips to help you use WebRPA more efficiently.

---

## 🎯 Element Selection Tips

### Visual Selection

**Ctrl+Click** the selector button 🎯:
- Enter visual selection mode
- Click the target element on the web page
- Automatically generate a CSS selector

**Alt+Click** the selector button:
- Select similar elements
- For batch collection scenarios
- Automatically generate a selector that matches multiple elements

### Element Selector Browser Reuse

The element selector's browser supports smart reuse for a better experience:

**URL is optional**:
- You can start the selector without entering a URL
- It uses the current page of an already-open browser
- Good for selecting elements multiple times on the same page

**Page reuse**:
- If the entered URL is already open in the browser, it automatically switches to that tab
- It does not open the same page again
- Saves loading time

**Browser reuse**:
- If the selector browser is still open, it is reused directly
- No need to restart the browser every time
- You can navigate freely in the browser before selecting an element

**Usage flow**:
\`\`\`
1. First time: enter a URL, start the selector browser
2. After selecting an element, the browser stays open
3. Next selection: you can start directly (without a URL), using the current page
4. Or enter a new URL; if it is already open, it switches automatically
\`\`\`

### Selector Debugging

Test in the browser developer tools (F12):

\`\`\`javascript
// Test whether the selector is correct
document.querySelector('your selector')

// See how many elements were selected
document.querySelectorAll('your selector').length

// Highlight the selected element
document.querySelector('your selector').style.border = '2px solid red'
\`\`\`

### Selector Priority

1. **ID selector** (most stable): \`#login-btn\`
2. **Unique class name**: \`.submit-button\`
3. **Attribute selector**: \`[data-id="123"]\`
4. **Combined selector**: \`.form .btn:last-child\`

### Handling Dynamic Selectors

Some websites have dynamically generated class names (such as \`class="css-1a2b3c"\`). Solutions:

1. **Use attribute selectors**: \`[data-testid="submit"]\`
2. **Use text content**: find via JavaScript
3. **Use relative position**: \`.parent > div:nth-child(2)\`

---

## ⏱️ Stability Tips

### Use Waits Sensibly

**Fixed wait vs smart wait**:

| Method | Pros | Cons |
|------|------|------|
| Fixed wait | Simple and direct | May wait too long or not enough |
| Wait for element | Smart and efficient | Need to know which element to wait for |

**Recommendation**: Prefer "Wait for element"; use fixed waits as a supplement.

### When to Wait

**Scenarios that need waiting**:
- After a page navigation
- After a click triggers an Ajax request
- After an animation completes
- After a popup appears/disappears

**Wait example**:
\`\`\`
Click the search button
Wait for element: .search-results appears
Get the search results
\`\`\`

### Timeout and Retry Configuration

Every module's advanced configuration has a **timeout** setting, and this now actually takes effect. When a module runs longer than the set timeout, it is handled according to the "On timeout" setting (retry or skip).

**Module default timeouts**:

The system automatically sets a reasonable default timeout based on the module type, applied automatically when creating a new module:

| Module Category | Default Timeout | Description |
|----------|----------|------|
| Browser operations | 30s-60s | Page loads may be slow |
| Form operations | 30s | Element interaction |
| Data processing | 5s-10s | Usually fast |
| File download | 5 min | Large files take time |
| Database operations | 30s-2min | Complex queries may be slow |
| AI capabilities | 3 min | AI responses may be slow |
| Media processing | 10-30 min | FFmpeg operations are time-consuming |
| User interaction | 5 min | Waiting for user input |
| Play music | 10 min | A song is 3-5 minutes |
| Play video | 2 hours | Videos can be very long |

**Modules not subject to timeout** (timeout set to 0):
- Fixed wait (wait)
- Loop (loop)
- Iterate list (foreach)
- Scheduled task (scheduled_task)
- Sub-flow (subflow)
- Group / sticky note

**On timeout**:
- **Retry**: Retry according to the retry count after a timeout
- **Skip**: Skip this module after a timeout and proceed with the rest of the flow

**Manually adjust the timeout**:
If the default timeout is not enough, you can adjust it manually in the module's advanced configuration.

### Handling Unstable Elements

**Problem**: The element is sometimes found and sometimes not

**Solutions**:
1. Increase the wait time
2. Use a more stable selector
3. Add a retry mechanism
4. Check whether it is inside an iframe

---

## 🔧 Debugging Tips

### Use Print Logs

Add logs at key points:

\`\`\`
Print log: === Start ===
Print log: Current URL: {page URL}
Print log: Data obtained: {data}
Print log: Loop iteration {loop_index}, current item: {item}
Print log: === Done ===
\`\`\`

### Test Step by Step

1. **Test a single module first**: make sure each module works on its own
2. **Then test a short flow**: a combination of 2-3 modules
3. **Finally test the full flow**: all modules

### View Variable Values

- View in real time on the **Global Variables** tab of the log panel
- Use print logs to output variable values
- Complex data is displayed in JSON format
- Loop variables (item, index, loop_index) are also shown in the variable hints

### Common Error Troubleshooting

| Error | Possible Cause | Solution |
|------|----------|----------|
| Element not found | Wrong selector / element not loaded | Check the selector / add a wait |
| Click has no effect | Element is covered / not clickable | Scroll to the element / wait until clickable |
| Timeout | Slow network / page stuck | Increase the timeout |
| Data is empty | Wrong extraction method | Check the extract type and selector |

---

## 📊 Data Collection Tips

### Batch Collection Flow

\`\`\`
1. Get the selectors of all items on the list page
2. Iterate over each item
3. Extract the needed data
4. Fill in Excel column names to collect automatically
\`\`\`

### Paginated Collection

**Method 1: Click the next page**
\`\`\`
Loop
  ├─ Collect the current page
  ├─ Condition check: is there a next page?
  │   ├─ Yes → Click next page, wait for load
  │   └─ No → Break out of the loop
\`\`\`

**Method 2: Modify the URL parameter**
\`\`\`
Loop 10 times
  ├─ Open page: https://example.com/list?page={loop index}
  ├─ Wait for load
  └─ Collect the current page
\`\`\`

### Lazy-loading Pages

\`\`\`
Loop
  ├─ Record the current count
  ├─ Scroll to the bottom
  ├─ Wait 2 seconds
  ├─ Get the new count
  ├─ Condition check: new count > old count?
  │   ├─ Yes → Keep scrolling
  │   └─ No → Reached the bottom, break out of the loop
\`\`\`

### Data Cleaning

**Trim whitespace**:
\`\`\`javascript
return '{raw data}'.trim();
\`\`\`

**Extract numbers**:
\`\`\`javascript
return parseFloat('{price text}'.replace(/[^0-9.]/g, ''));
\`\`\`

**Format dates**:
\`\`\`javascript
const date = new Date('{date text}');
return date.toISOString().split('T')[0];
\`\`\`

---

## ⚙️ Global Configuration Explained

Global configuration lets you set default values for commonly used modules to improve efficiency.

### System Configuration

**Check for updates on startup**:
- Automatically checks for a new version when WebRPA starts
- Get new features and bug fixes promptly

**Auto-detect clipboard screenshots**:
- When there is a new screenshot in the clipboard, a save dialog pops up automatically
- Supports various screenshot tools such as PrtScn, Snipping Tool, QQ screenshot, etc.
- Quickly choose the save location and file name
- Good for scenarios that require frequent screenshot saving

**Use cases**:
\`\`\`
1. Need to save many screenshots during testing
2. Need to insert screenshots when writing documents
3. Need screenshots to illustrate issues when reporting problems
\`\`\`

### AI Configuration

Set default values for the AI chat module:
- API endpoint (OpenAI, Zhipu, Deepseek, etc.)
- API key
- Default model name
- Temperature and max tokens
- System prompt

**Benefit**: These configs are auto-filled when creating a new AI chat module, no need to enter them manually each time.

### AI Smart Configuration

Set default values for the AI smart scraper and AI element selector:
- LLM provider (Ollama, OpenAI, Zhipu, etc.)
- API endpoint and key
- Default model

**Recommended configs**:
- **Ollama**: runs locally, completely free, good for development and testing
- **Zhipu/Groq/Gemini**: offer free quotas, good for light use
- **OpenAI/Deepseek**: pay-as-you-go, good for production

### Email Configuration

Set default values for the send-email module:
- Sender email
- Authorization code
- SMTP server and port

**Common configs**:
\`\`\`
QQ Mail:
- SMTP: smtp.qq.com
- Port: 465
- You need to enable SMTP service and get an authorization code

163 Mail:
- SMTP: smtp.163.com
- Port: 465

Gmail:
- SMTP: smtp.gmail.com
- Port: 587
\`\`\`

### Workflow Storage Configuration

**Custom save path**:
- Set the default save location for workflow files
- Convenient for team sharing or cloud sync

**Auto-save**:
- When enabled, the workflow is saved automatically at intervals
- Prevents data loss from accidental closing

### Database Configuration

Set default connection info for the database module:
- Host
- Port
- Database name
- Username and password

**Benefit**: No need to re-enter when connecting to the same database.

### Display Configuration

**Number of log entries shown**:
- Set the maximum number of log entries shown in the log panel
- Range: 100-500 entries
- Too many logs hurt performance; adjust as needed

### Browser Configuration

**Default browser type**:
- Microsoft Edge (recommended)
- Google Chrome
- Chromium
- Firefox

**Headless mode**:
- When enabled, the browser runs in the background without a UI
- Improves execution speed and saves resources
- Good for automation tasks that run stably

### Trigger Configuration

Set default parameters for various triggers:
- Email trigger: IMAP server configuration
- API trigger: listening port
- File monitor: monitored path

### QQ and Feishu Configuration

Set default parameters for the QQ bot and Feishu automation:
- QQ number configuration
- Feishu app credentials

---

## 📁 Workflow Management

### Workflow Repository

WebRPA provides a public workflow repository where you can:

**Browse and download**:
- Click the "Workflow Repository" button on the toolbar
- Browse workflows shared by other users
- Search by category and keyword
- Two import methods are supported:
  - **Overwrite import**: replace the workflow in the current editor
  - **Append import**: append the workflow to the current canvas, keeping existing content

**Publish and share**:
- Publish your workflow to the repository
- Two publishing methods are supported:
  - Publish the workflow currently being edited
  - Upload a JSON file to publish
- Fill in the name, description, category, and tags
- Help other users solve similar problems

**Manage your own workflows**:
- The system remembers the workflows you published
- Clicking a workflow you published shows a "Delete" button
- Only the publisher can delete their own workflow

**Custom repository**:
- The official repository https://hub.pmhs.top is used by default
- You can change it to a private repository address in settings
- Good for sharing workflows within a team

**Notes**:
- Make sure there is no sensitive info (API Key, passwords, etc.) before publishing
- The system automatically filters out some sensitive content
- The same workflow cannot be published repeatedly
- Repository data is cached; click the refresh button to get the latest data

### File Path Selection

In input boxes that require a file or folder path:
- Click the 📁 button on the right of the input box
- Select directly through Windows Explorer
- Supported modules: upload file, download file, save image, web screenshot, export table, etc.

### Naming Conventions

**Good names**:
- \`JD Product Price Monitor\`
- \`Weibo Auto Check-in_v2\`
- \`News Collection_Tech Channel\`

**Bad names**:
- \`test\`
- \`New Workflow\`
- \`111\`

### Version Management

- Export a backup before important changes
- Add a date or version number to the file name
- e.g.: \`Product Collection_20240101.json\`

### Module Reuse

- **Ctrl+C**: Copy the selected module
- **Ctrl+V**: Paste the module
- You can copy and paste across workflows

### Tidy the Canvas

- Keep modules neatly arranged
- Put related modules together
- Avoid crossing connection lines

---

## 🚀 Performance Optimization

### Reduce Wait Time

- Use "Wait for element" instead of fixed waits
- Set reasonable timeouts
- Avoid unnecessary waits

### Optimize Loops

- Reduce repeated operations inside loops
- Move unchanging operations out of the loop
- Use batch operations instead of one-by-one operations

### Headless Mode

Enable **headless mode** in global configuration:
- The browser runs in the background
- No UI is shown, so it is faster
- Good for tasks that run stably

### Resource Management

- Close tabs you no longer need promptly
- Avoid opening too many pages
- Periodically clear large data stored in variables

---

## 🔐 Security Recommendations

### Handling Sensitive Information

**Do not**:
- Hardcode passwords in workflows
- Share workflows containing sensitive information
- Print passwords in logs

**Do**:
- Use variables to store sensitive information
- Delete sensitive data before exporting
- Use environment variables or config files

### API Key Protection

- Do not share workflows containing API keys
- Rotate keys regularly
- Use keys with limited permissions

### Avoid Detection

- Add random delays
- Mimic the rhythm of human operations
- Do not go too fast
- Comply with the website's terms of use

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Function |
|--------|------|
| Ctrl+S | Save the current workflow |
| Ctrl+C | Copy the selected module |
| Ctrl+V | Paste the module |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Ctrl+A | Select all modules |
| Ctrl+D | Disable/enable the selected module |
| Ctrl+F | Search modules (by name or note) |
| Ctrl+G | Jump to the next search result |
| Delete / Backspace | Delete the selected module |
| Drag empty canvas area | Move the canvas view |
| Scroll wheel | Zoom the canvas |
| Drag a JSON file onto the canvas | Import a workflow |

### Module Search

Use **Ctrl+F** to quickly find modules on the canvas:

**Search scope**:
- Module name (such as "Open page", "Click element")
- Module notes (custom module descriptions)
- Custom node notes

**How to use**:
1. Press **Ctrl+F** to open the search box
2. Enter a keyword (fuzzy search supported)
3. Use **Ctrl+G** or click the arrow buttons to jump to the next result
4. Clicking a search result automatically locates and selects that module

**Use cases**:
- Quickly locate a specific module in a large workflow
- Find all modules containing a certain keyword
- Check which modules use a certain variable

**Tips**:
- The search shows the number of matching modules in real time
- Supports fuzzy matching of Chinese, English, and numbers
- Search results are sorted by the module's position on the canvas

---

## 🆘 FAQ

### Q: Why can't the selector find the element?

**A**: Possible causes:
1. The selector is wrong → confirm with browser debugging
2. The element has not loaded → add a wait module
3. The element is inside an iframe → switch to the iframe first
4. The element is generated dynamically → use a more stable selector

### Q: Why does the click do nothing?

**A**: Possible causes:
1. The element is covered by another element → scroll to the element or close the cover
2. The element is not clickable → wait until the element is clickable
3. You need to hover first → add a hover module
4. It is a fake button → try clicking via JS

### Q: Why is the collected data incomplete?

**A**: Possible causes:
1. The page is lazy-loaded → scroll to load
2. The selector matches only some elements → check the selector
3. The pagination logic has issues → check the pagination condition
4. A timeout caused interruption → increase the timeout

### Q: How do I handle CAPTCHAs?

**A**: Several options:
1. AI vision recognition (recommended)
2. Manual input (user input module)
3. Third-party CAPTCHA-solving platforms
4. Use an already-logged-in cookie

### Q: What if the workflow runs slowly?

**A**: Optimization suggestions:
1. Reduce unnecessary waits
2. Use "Wait for element" instead of fixed waits
3. Enable headless mode
4. Optimize the loop logic

---

## 📚 Learning Resources

### CSS Selectors
- MDN Web Docs: CSS Selectors
- CSS Selector Reference

### Browser Developer Tools
- Chrome DevTools official docs
- Element inspection and debugging tips

### Regular Expressions
- Regex beginner tutorials
- Online regex testing tools

---

🎉 **Congratulations on finishing all the tutorials!**

You have now mastered WebRPA's core features and tips.
The best way to learn is hands-on practice, so try creating your own automation workflows!

Happy automating! 🚀`
