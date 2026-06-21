export const advancedFeaturesContentEn = `# 🧠 Advanced Features

This chapter introduces advanced features such as flow control, AI integration, and API requests.

---

## 🔀 Flow Control

### Sub-flow (Module Reuse)

Encapsulate commonly used module combinations into reusable sub-flows for modularity and code reuse.

**Create a sub-flow (3 steps)**:

1. **Drag in a group**: Drag the "Group" module from the "Flow Control" category on the left onto the canvas
2. **Set as sub-flow**: Select the group and turn on the "Set as sub-flow" switch in the configuration panel on the right
3. **Name the sub-flow**: Enter a sub-flow name (such as "Login Flow")

The group turns into a **green border** and shows the "📦 Sub-flow Definition" label.

**Place modules inside the sub-flow**:

1. Drag the group edges to resize it
2. Drag the modules to reuse into the group
3. Connect those modules inside the group

**Call a sub-flow**:

1. Drag the "Call Sub-flow" module from the "Flow Control" category on the left
2. Select the sub-flow to call from the dropdown in the configuration panel on the right
3. Connect the "Call Sub-flow" module into the main flow

**Execution logic**:
- The modules inside a sub-flow are **not executed directly by the main flow**
- Only when execution reaches the "Call Sub-flow" module are all modules in the corresponding group executed
- A sub-flow can **access and modify the main flow's variables**
- The same sub-flow can be **called multiple times** in the main flow

**Error handling**:
- When a module inside the sub-flow fails, the module's orange error branch (if any) runs first
- Then the orange error branch of the "Call Sub-flow" module is triggered
- A sub-flow is not forcibly ended because a single module fails

**Use cases**:
- Login flow reuse: multiple tasks need to log in first
- Data collection template: reuse the same collection logic
- Generic operation encapsulation: such as pagination, scroll loading, etc.

**Example**:
\`\`\`
Canvas layout:

┌─────────────────────────────────────┐
│  [Sub-flow group: Login Flow]        │
│    Enter username → Enter password → Click login │
└─────────────────────────────────────┘

Main flow:
  Open page → Call sub-flow (Login) → Collect data → Export
\`\`\`

**Publish and share**:
- Sub-flows are automatically included when exporting/publishing
- Other users can use and modify the sub-flow directly after downloading

---

### Scheduled Execution

Execute the subsequent flow at a specified time or after a delay, used to create scheduled tasks.

**Schedule types**:

#### 1. Execute at a Specified Time

Execute at the set date and time.

| Parameter | Description | Example |
|------|------|------|
| Execution date | Target date | 2024-12-31 |
| Execution time | Target time | 09:00 |

**Example**: Check in at 9 AM every day
\`\`\`
Scheduled execution:
  Type: Specified time
  Date: 2024-12-26
  Time: 09:00
  
→ Continue with subsequent modules after waiting until the specified time
\`\`\`

#### 2. Delayed Execution

Execute after waiting a specified duration.

| Parameter | Description | Example |
|------|------|------|
| Delay hours | The number of hours to wait | 1 |
| Delay minutes | The number of minutes to wait | 30 |
| Delay seconds | The number of seconds to wait | 0 |

**Example**: Execute after a 5-minute delay
\`\`\`
Scheduled execution:
  Type: Delayed execution
  Delay minutes: 5
  
→ Continue with subsequent modules after waiting 5 minutes
\`\`\`

**Use cases**:
- Scheduled check-ins, clock-ins
- Delayed message sending
- Wait for a specific time to execute a task
- Execute while avoiding peak hours

**Notes**:
- The scheduled execution module is not subject to a timeout
- If the target time has passed, it executes immediately
- Pending scheduled tasks are canceled when the workflow stops

---

### Condition Check

Execute different branches based on a condition, implementing "if...then...else..." logic.

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| Left value | The value on the left of the condition | \`{price}\`, \`{status}\` |
| Operator | The comparison method | ==, !=, >, <, etc. |
| Right value | The value on the right of the condition | \`100\`, \`"success"\` |

**Supported operators**:

| Operator | Description | Example | Result |
|--------|------|------|------|
| == | Equals | \`{count} == 10\` | True when count equals 10 |
| != | Not equals | \`{status} != "error"\` | True when status is not error |
| > | Greater than | \`{price} > 100\` | True when price is greater than 100 |
| < | Less than | \`{age} < 18\` | True when age is less than 18 |
| >= | Greater than or equal | \`{score} >= 60\` | True when score >= 60 |
| <= | Less than or equal | \`{num} <= 0\` | True when num <= 0 |
| contains | Contains | \`{text} contains "keyword"\` | True when text contains "keyword" |
| startsWith | Starts with | \`{url} startsWith "https"\` | True when url starts with https |
| endsWith | Ends with | \`{file} endsWith ".jpg"\` | True when file ends with .jpg |

**Branch connections**:

The condition check module has two outputs:
- **✓ True**: runs when the condition holds
- **✗ False**: runs when the condition does not hold

**Example**: Check login status
\`\`\`
Condition check: {login status} == "logged in"
  ├─ True → Perform check-in
  └─ False → Perform login
\`\`\`

---

### Loop Execution

Repeatedly execute a flow.

**Loop types**:

#### 1. Count Loop

Execute a fixed number of times.

| Parameter | Description |
|------|------|
| Loop count | The number of times to execute |
| Index variable | The variable name for the loop index (default: loop_index) |

**Auto-created variables**:
- \`{loop_index}\`: which iteration this is (starting from 0, name customizable)

**Example**: Collect 10 pages of data
\`\`\`
Loop 10 times
  ├─ Collect the current page data
  ├─ Click the next page
  └─ Wait for the page to load

You can use {loop_index} to know which page you are on (0-9)
\`\`\`

#### 2. Conditional Loop

Continue executing while the condition is met.

| Parameter | Description |
|------|------|
| Loop condition | The condition to continue looping |

**Example**: Loop until there is no next page
\`\`\`
Conditional loop: {has next page} == true
  ├─ Collect the current page data
  ├─ Check whether there is a next page
  ├─ Click the next page
  └─ Wait for the page to load
\`\`\`

---

### Iterate List

Perform an operation on each element in a list.

**Configuration**:

| Parameter | Description |
|------|------|
| Data source variable | The list variable name to iterate (enter the variable name directly, without braces) |
| Loop variable | The variable name for the current element (default: item) |
| Index variable | The variable name for the current index (default: index) |

**Auto-created variables**:
- \`{item}\`: the element currently being processed (name customizable)
- \`{index}\`: the index of the current element (starting from 0, name customizable)

**Example**: Iterate a URL list to collect data
\`\`\`
Set variable: url list = ["url1", "url2", "url3"]

Iterate list: url list (note: enter the variable name directly, without braces)
  ├─ Open page: {item}
  ├─ Get data
  └─ Print log: Processing URL number {index}
\`\`\`

💡 **Tip**: The loop variables \`item\` and \`index\` automatically appear in the variable smart hints.

---

### Break Loop / Skip Current Iteration

Control the execution flow of a loop.

**Break Loop (Break)**:
- Immediately end the entire loop
- Jump to the modules after the loop and continue

**Skip Current Iteration (Continue)**:
- Skip the rest of the current iteration
- Go directly to the next iteration

**Example**: Stop after finding the target
\`\`\`
Iterate list: product list (enter the variable name directly)
  ├─ Condition check: {item[price]} < 100
  │   ├─ True → Set variable: found product = {item}
  │   │       Break loop
  │   └─ False → Skip current iteration
\`\`\`

---

## 🤖 AI Brain

Call an AI large model to process text, making workflows smarter.

### Supported Models

| Provider | Model | API Endpoint |
|--------|------|---------|
| OpenAI | gpt-3.5-turbo, gpt-4 | https://api.openai.com/v1 |
| Zhipu AI | glm-4, glm-3-turbo | https://open.bigmodel.cn/api/paas/v4 |
| Deepseek | deepseek-chat | https://api.deepseek.com/v1 |
| Moonshot | moonshot-v1-8k | https://api.moonshot.cn/v1 |
| Others | Models compatible with the OpenAI interface | Custom |

### Configuration

| Parameter | Description | Example |
|------|------|------|
| API endpoint | The model interface address | https://api.openai.com/v1 |
| API key | Your API Key | sk-xxx... |
| Model name | The model to use | gpt-3.5-turbo |
| System prompt | Set the AI's role and behavior | You are a data analysis expert |
| User message | The content to send to the AI | Please analyze the following data: {data} |
| Save to variable | The variable name to store the AI reply | AI reply |
| Temperature | The degree of creativity (0-1) | 0.7 |

### System Prompt Tips

**Role setting**:
\`\`\`
You are a professional product review analyst, skilled at extracting key information from reviews.
\`\`\`

**Output format**:
\`\`\`
Please output in JSON format, including the following fields:
- sentiment: sentiment (positive/negative/neutral)
- keywords: list of keywords
- summary: a one-sentence summary
\`\`\`

**Constraints**:
\`\`\`
Please output only JSON, with no other explanatory text.
Keep the answer concise, no more than 100 words.
\`\`\`

### Practical Scenarios

#### 1. Article Summary
\`\`\`
System prompt: You are an article summary expert; summarize the key points in 3 sentences.
User message: {article content}
\`\`\`

#### 2. Sentiment Analysis
\`\`\`
System prompt: Analyze the sentiment of the following review, answer only: positive, negative, or neutral
User message: {review content}
\`\`\`

#### 3. Data Extraction
\`\`\`
System prompt: Extract contact information from the text, output in JSON format: {"phone": "", "email": ""}
User message: {web page text}
\`\`\`

#### 4. Content Generation
\`\`\`
System prompt: You are a marketing copywriting expert
User message: Please write a 50-word promotional copy for the following product: {product info}
\`\`\`

---

## 👁️ AI Vision

Call a visual understanding model to analyze image content.

### Supported Models

| Provider | Model | Note |
|--------|------|------|
| Zhipu AI | glm-4v-flash | Free, recommended |
| Zhipu AI | glm-4v | Paid, more powerful |
| OpenAI | gpt-4-vision-preview | Paid |

### Image Sources

| Source | Description | Use Case |
|------|------|----------|
| Element screenshot | Capture an image of a specified element | CAPTCHA recognition |
| Page screenshot | Capture the entire page | Page analysis |
| Image URL | A network image address | Analyze an online image |
| Variable | Base64-encoded or local path | Use a previously saved image |

### Configuration

| Parameter | Description |
|------|------|
| API endpoint | The vision model interface address |
| API key | API Key |
| Model name | Such as glm-4v-flash |
| Image source | Choose how to obtain the image |
| Prompt | Tell the AI what to do |
| Save to variable | Store the recognition result |

### Practical Scenarios

#### 1. CAPTCHA Recognition
\`\`\`
Image source: Element screenshot
Selector: #captcha-img
Prompt: Please recognize the CAPTCHA in the image, output only the CAPTCHA characters, nothing else
\`\`\`

#### 2. Product Image Analysis
\`\`\`
Image source: Image URL
URL: {product image link}
Prompt: Describe the appearance of this product, including color, material, and style
\`\`\`

#### 3. Chart Data Extraction
\`\`\`
Image source: Element screenshot
Selector: .chart-container
Prompt: Extract the data from the chart, output in JSON format
\`\`\`

---

## 🧪 AI Smart Scraper (Experimental Feature)

> ⚠️ **Experimental feature notice**: The AI smart scraper and AI element selector are experimental features that depend on third-party AI services, may be unstable, and are not recommended for production use.

The AI smart scraper leverages the understanding capability of large language models to extract data from web pages via natural-language descriptions, without writing complex selectors.

### 🤖 AI Smart Scraper

Describe the data to extract in natural language, and the AI automatically analyzes the web page and extracts the corresponding content.

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| API key | An OpenAI-compatible API Key | sk-xxx... |
| Base URL | The API interface address | https://api.openai.com/v1 |
| Model name | The model to use | gpt-4o-mini |
| Extraction instruction | Describe what to extract in natural language | Extract the product name, price, and rating |
| Output format | JSON or Markdown | JSON |
| Save to variable | The variable name to store the extraction result | extraction result |

**Usage example**:
\`\`\`
Open page: https://example.com/product/123

AI smart scraper:
  Extraction instruction: Extract the product name, price, stock quantity, and product description
  Output format: JSON
  Save to variable: product info
  
Print log: {product info}
\`\`\`


**Output example**:
\`\`\`json
{
  "Product name": "Wireless Bluetooth Earbuds",
  "Price": "299",
  "Stock quantity": "1000+",
  "Product description": "High-quality sound, long battery life..."
}
\`\`\`

### 🎯 AI Element Selector

Describe the element to locate in natural language, and the AI automatically generates a CSS selector.

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| API key | An OpenAI-compatible API Key | sk-xxx... |
| Base URL | The API interface address | https://api.openai.com/v1 |
| Model name | The model to use | gpt-4o-mini |
| Page URL | The web page address to analyze | https://example.com |
| Page load wait | The time to wait for the page to load (seconds) | 3 |
| Element description | Describe the element to locate in natural language | Search button |
| Save to variable | Store the generated selector | search button selector |

**Usage example**:
\`\`\`
AI element selector:
  Page URL: https://www.baidu.com
  Element description: Search input box
  Save to variable: input box selector
  
Input text:
  Selector: {input box selector}
  Content: WebRPA
\`\`\`

**Notes**:
- These two features consume AI API quota
- Extraction accuracy depends on the web page structure and the AI model's capability
- Complex pages may require multiple attempts and prompt adjustments
- It is recommended to verify the effect in a test environment first
- For a stable production environment, the traditional CSS selector approach is recommended

---

## 🌐 API Request

Send an HTTP request to interact with external services.

### Request Methods

| Method | Purpose |
|------|------|
| GET | Get data |
| POST | Submit data |
| PUT | Update data |
| DELETE | Delete data |
| PATCH | Partial update |

### Configuration

| Parameter | Description | Example |
|------|------|------|
| URL | The request address | https://api.example.com/data |
| Method | The HTTP method | GET, POST, etc. |
| Headers | HTTP headers | {"Authorization": "Bearer xxx"} |
| Body | The data for POST/PUT | {"name": "test"} |
| Save to variable | Store the response result | response data |

### Setting Headers

Common headers:
\`\`\`json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {token}",
  "User-Agent": "Mozilla/5.0"
}
\`\`\`

### Body Format

JSON format:
\`\`\`json
{
  "username": "{username}",
  "password": "{password}",
  "data": {data}
}
\`\`\`

### Using Response Data

API responses are usually in JSON format; after saving to a variable, you can access them like this:

\`\`\`
Assume the response: {"code": 200, "data": {"name": "test", "items": [1,2,3]}}

{response[code]}           → 200
{response[data][name]}     → test
{response[data][items][0]} → 1
\`\`\`

### Practical Examples

#### 1. Get the Weather
\`\`\`
URL: https://api.weather.com/v1/current?city={city}
Method: GET
Save to: weather data

Then use: {weather data[temperature]}°C
\`\`\`

#### 2. Send a Notification
\`\`\`
URL: https://api.pushplus.plus/send
Method: POST
Body: {
  "token": "{push token}",
  "title": "Price Alert",
  "content": "{product name} dropped to {price}!"
}
\`\`\`

#### 3. Submit Form Data
\`\`\`
URL: https://api.example.com/submit
Method: POST
Headers: {"Content-Type": "application/json"}
Body: {
  "name": "{name}",
  "email": "{email}",
  "message": "{message content}"
}
\`\`\`

---

## 📧 Send Email

Automatically send an email notification.

### Configuration

| Parameter | Description | Example |
|------|------|------|
| SMTP server | The mail server address | smtp.qq.com |
| Port | The server port | 465 (SSL) or 587 (TLS) |
| Sender email | Your email address | xxx@qq.com |
| Authorization code | The SMTP authorization code | Not the login password! |
| Recipient | The target mailbox | Separate multiple with commas |
| Subject | The email subject | Supports variables |
| Content | The email body | Supports variables and HTML |

### Getting a QQ Mail Authorization Code

1. Log in to [QQ Mail web version](https://mail.qq.com)
2. Click **Settings** → **Account**
3. Find **POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV services**
4. Enable the **POP3/SMTP service**
5. Complete SMS verification as prompted
6. Get the 16-character authorization code

### Common SMTP Servers

| Mailbox | Server | SSL Port | TLS Port |
|------|--------|---------|---------|
| QQ Mail | smtp.qq.com | 465 | 587 |
| 163 Mail | smtp.163.com | 465 | 25 |
| Gmail | smtp.gmail.com | 465 | 587 |
| Outlook | smtp.office365.com | - | 587 |

### Email Content Example

\`\`\`
Subject: [Price Monitor] {product name} price drop alert

Content:
The price of the product you are watching has changed:

Product name: {product name}
Original price: {original price}
Current price: {current price}
Price drop: {drop}%

Click to view: {product link}

---
This email was sent automatically by WebRPA
\`\`\`

---

## 📥 Download File

Download a file from a web page to local.

### Download Modes

| Mode | Description | Use Case |
|------|------|----------|
| Click to download | Click a download button to trigger the download | Downloads requiring login or permission verification |
| URL download | Download directly via a URL | A known direct file link |

### Click-to-download Mode

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| Selector | The download button selector | \`#download-btn\` |
| Save directory | The folder to save the file | \`C:/Downloads\` |
| Custom file name | Optional, specify the file name | \`report.pdf\` |

### URL Download Mode

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| File URL | The file's download address | \`https://example.com/file.pdf\` |
| Save directory | The folder to save the file | \`C:/Downloads\` |
| Custom file name | Optional, specify the file name | \`{date}_report.pdf\` |

**Path selection**: Click the 📁 button on the right of the save directory input box to choose a folder via the file explorer

---

## 📋 Clipboard Operations

### Set Clipboard

Set text or an image to the system clipboard.

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| Content type | Text or image | text / image |
| Text content | The text to copy | \`{data}\`, supports variables |
| Image path | The image file path | \`C:/images/pic.png\` |

**Use cases**:
- Copy data to the clipboard for other programs to use
- Combine with keyboard operations to paste an image into an input box
- Cross-application data transfer

**Example**: Paste an image into a chat input box
\`\`\`
1. Set clipboard: image path = C:/images/screenshot.png
2. Click the chat input box
3. Keyboard operation: Ctrl+V
\`\`\`

---

## ⌨️ Keyboard Operations

Simulate keyboard keys and shortcut operations.

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| Key combination | The keys to press | \`Ctrl+V\`, \`Enter\`, \`Tab\` |

**Supported keys**:

| Type | Keys |
|------|------|
| Modifier keys | Ctrl, Alt, Shift, Meta (Win key) |
| Function keys | Enter, Tab, Escape, Backspace, Delete |
| Arrow keys | ArrowUp, ArrowDown, ArrowLeft, ArrowRight |
| Others | Home, End, PageUp, PageDown, Space |
| Alphanumeric | a-z, 0-9 |

**Common shortcut examples**:

| Shortcut | Function |
|--------|------|
| Ctrl+A | Select all |
| Ctrl+C | Copy |
| Ctrl+V | Paste |
| Ctrl+Z | Undo |
| Ctrl+Enter | Send message (some apps) |
| Tab | Switch focus |
| Enter | Confirm/submit |
| Escape | Cancel/close |

**Use cases**:
- Paste an image from the clipboard
- Submit a form
- Shortcut operations
- Simulate user keyboard input

---

## 💻 Execute JavaScript

Execute custom JavaScript code in the page.

### Basic Usage

\`\`\`javascript
// The return value is saved to the specified variable
return document.title;
\`\`\`

### Common Examples

**Get page info**:
\`\`\`javascript
return {
  title: document.title,
  url: window.location.href,
  scrollHeight: document.body.scrollHeight
};
\`\`\`

**Get all links**:
\`\`\`javascript
return Array.from(document.querySelectorAll('a'))
  .map(a => ({text: a.textContent, href: a.href}));
\`\`\`

**Modify a page element**:
\`\`\`javascript
document.querySelector('#element').style.display = 'block';
\`\`\`

**Scroll operation**:
\`\`\`javascript
window.scrollTo({top: 1000, behavior: 'smooth'});
\`\`\`

**Wait for an element**:
\`\`\`javascript
await new Promise(resolve => {
  const check = () => {
    if (document.querySelector('#target')) resolve();
    else setTimeout(check, 100);
  };
  check();
});
return true;
\`\`\`

---

## 🔔 User Input

Pop up a dialog during workflow execution for the user to enter data.

### Configuration

| Parameter | Description |
|------|------|
| Prompt text | The hint shown to the user |
| Default value | The default content of the input box |
| Save to variable | The variable name to store the user input |

### Use Cases

- Enter a CAPTCHA
- Enter a one-time password
- Confirm an operation
- Enter a search keyword

---

## ⏸️ Pause Execution

Pause workflow execution and wait for the user to continue manually.

### Use Cases

- Manual inspection needed
- Wait for an external operation to complete
- Debugging breakpoint

---

## 🔀 Parallel Execution

When a module has multiple output connections, those branches **truly execute in parallel**, greatly improving workflow efficiency.

### How It Works

\`\`\`
        ┌─→ Branch A (parallel) ─┐
Module ──┼─→ Branch B (parallel) ─┼─→ Join point
        └─→ Branch C (parallel) ─┘
\`\`\`

The system uses an async execution engine; when it detects multiple branches, it automatically executes them in parallel, and only continues with the modules after the join point once all branches complete.

### Core Features

| Feature | Description |
|------|------|
| **True parallelism** | Based on an async architecture, branches truly execute at the same time, not pseudo-parallel |
| **Auto-detection** | No configuration needed; the system automatically recognizes parallel branches |
| **Smart join** | When multiple branches join the same node, it waits for all branches to complete |
| **Thread safety** | Variable operations are protected by async locks to avoid race conditions |
| **No limit** | No limit on the number of parallel branches |

### Applicable Scenarios

#### 1. Parallel API Requests
\`\`\`
Start
  ├─→ Request API-A (get user info)
  ├─→ Request API-B (get order list)
  └─→ Request API-C (get product data)
      ↓
  Join: merge all data
\`\`\`


#### 2. Send Notifications in Parallel
\`\`\`
Task complete
  ├─→ Send email notification
  ├─→ Send WeChat push
  └─→ Write to log file
\`\`\`

#### 3. Parallel File Processing
\`\`\`
Get file list
  ├─→ Download file 1
  ├─→ Download file 2
  └─→ Download file 3
\`\`\`

#### 4. Parallel Inside a Loop
\`\`\`
Iterate product list
  └─ Within each iteration:
      ├─→ Get price
      ├─→ Get stock
      └─→ Get reviews
          ↓
      Join: save product data
\`\`\`

### Join Mechanism

When multiple branches connect to the same subsequent node, the system automatically waits for all predecessor branches to complete:

\`\`\`
Branch A ──┐
Branch B ──┼─→ Join node (waits for A, B, C to all complete)
Branch C ──┘
\`\`\`

The log shows: \`⏳ Waiting to join: X predecessor branches still incomplete\`

### ⚠️ Notes

| Note | Description | Recommendation |
|--------|------|------|
| Browser operations | Parallel branches share the same browser page | Browser operations should run sequentially |
| Variable modification | Multiple branches modifying the same variable may conflict | Use a separate variable per branch |
| Execution order | The completion order of parallel branches is uncertain | Do not rely on a specific completion order |
| Error handling | One branch failing does not affect others | Each branch handles errors independently |

### Best Practices

**✅ Operations recommended for parallelism**:
- API requests (each an independent network request)
- File read/write (different files)
- Data computation (computation with no dependencies)
- Sending notifications (email, push, etc.)
- AI calls (independent AI requests)
- Database operations (independent queries/inserts)

**❌ Operations not recommended for parallelism**:
- Multiple browser operations on the same page
- Data processing with sequential dependencies
- Steps that must run in order
- Operations modifying the same variable

### Performance Comparison

**Sequential execution**:
\`\`\`
API-A(2s) → API-B(3s) → API-C(2s)
Total time = 2 + 3 + 2 = 7s
\`\`\`

**Parallel execution**:
\`\`\`
      ┌─→ API-A(2s) ─┐
Start ─┼─→ API-B(3s) ─┼─→ Done
      └─→ API-C(2s) ─┘
Total time = max(2, 3, 2) = 3s
\`\`\`

**Performance gain**: (7-3)/7 ≈ **57%**

### Debugging Tips

1. **View the log**: during parallel execution it shows \`🔀 Detected X branches, executing in parallel...\`
2. **Join wait**: at the join it shows \`⏳ Waiting to join: X predecessor branches still incomplete\`
3. **Completion hint**: after all branches complete it shows \`🔀 X branches finished executing\`

---

## 🗄️ Database Operations

WebRPA supports connecting to a MySQL database for create/read/update/delete operations. For details, see the **🗄️ Database Operations** chapter.

### Quick Overview

| Module | Function |
|------|------|
| Connect to database | Establish a MySQL connection |
| Query data | SELECT query |
| Execute SQL | Run an arbitrary SQL statement |
| Insert data | INSERT operation |
| Update data | UPDATE operation |
| Delete data | DELETE operation |
| Close connection | Disconnect from the database |

### Typical Flow

\`\`\`
Connect to database → Perform operations → Close connection
\`\`\`

### Use Cases

- Insert collected data directly into the database
- Read configuration from the database
- Data sync and updates
- Scheduled cleanup of expired data

---

## 🖥️ System Operation Modules

WebRPA provides a series of system-level operation modules that can control the mouse, keyboard, run commands, and more.

### 🎯 Coordinate Picking

When configuring modules that need screen coordinates (such as real mouse click, real mouse move, real mouse drag, custom screenshot area), you can use the **visual coordinate picking** feature, with no need to enter coordinate values manually.

**How to use**:

1. Click the "Pick" button next to the coordinate input box
2. Move the mouse to the target position
3. Hold **Ctrl + left click** to confirm the coordinate
4. The coordinate is automatically filled into the input box

**Operation guide**:

| Operation | Effect |
|------|------|
| **Ctrl + left click** | Confirm and get the current mouse position coordinate |
| **Ctrl + right click** | Cancel the picking operation |
| **ESC** | Cancel the picking operation |

**Applicable modules**:
- Real mouse click
- Real mouse move
- Real mouse drag
- Screenshot (custom area)

💡 **Tip**: Using the Ctrl combination avoids accidentally triggering click events in other applications.

---

### Real Mouse Click

Use the system-level SendInput API to simulate a real hardware-level mouse click, able to click any screen position and any application.

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| X coordinate | Screen X coordinate | \`500\`, supports variables and picking |
| Y coordinate | Screen Y coordinate | \`300\`, supports variables and picking |
| Mouse button | Left/Right/Middle | left |
| Click type | Single/Double/Long press | single |
| Long press duration | The duration in long-press mode (ms) | 1000 |

**Use cases**:
- Click applications outside the browser
- Click elements that cannot be located by selector
- Use together with "Get Mouse Position"
- Long-press operations (such as preparing for a drag)

💡 Click the "Pick" button, then Ctrl+left click to visually select the click position

---

### Real Mouse Move

Move the mouse to a specified screen coordinate.

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| X coordinate | Target X coordinate | \`500\`, supports picking |
| Y coordinate | Target Y coordinate | \`300\`, supports picking |
| Move duration | The move animation duration (ms) | 0 = instant, >0 = smooth move |

💡 Click the "Pick" button, then Ctrl+left click to visually select the target position

---

### Real Mouse Drag

Press and drag the mouse from a start point to an end point; suitable for drag-and-drop operations, slider verification, etc.

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| Start X | Drag start X coordinate | \`100\`, supports picking |
| Start Y | Drag start Y coordinate | \`200\`, supports picking |
| End X | Drag end X coordinate | \`500\`, supports picking |
| End Y | Drag end Y coordinate | \`200\`, supports picking |
| Mouse button | Left/Right/Middle | left |
| Drag duration | The duration of the drag process (ms) | 500 |

**Use cases**:
- Slider CAPTCHA
- Drag and drop files or elements
- Adjust a slider
- Drawing operations

💡 Click the "Pick" button, then Ctrl+left click to visually select the start and end positions

**Example**: Slider CAPTCHA
\`\`\`
Real mouse drag:
  Start: (100, 300) - slider initial position
  End: (400, 300) - slider target position
  Drag duration: 800ms
  
→ Simulate manually dragging the slider
\`\`\`

---

### Real Mouse Scroll

Use system-level wheel simulation to bypass a page's anti-scroll detection.

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| Scroll direction | Up/Down | down |
| Scroll amount | The number of notches per scroll | 3 |
| Scroll count | The number of scrolls to perform | 5 |
| Scroll interval | The interval between each scroll (ms) | 100 |

**Use cases**:
- Sites with anti-scroll detection (such as Douyin)
- Scenarios requiring real user behavior

---

### Real Keyboard Operation

Use system-level APIs to simulate keyboard input.

**Input types**:

| Type | Description | Example |
|------|------|------|
| Input text | Enter text character by character | Supports Chinese and variables |
| Key operation | Press a single key | Enter, Tab, F5, etc. |
| Key combination | Press a shortcut | ctrl+c, alt+tab |

**Use cases**:
- Input into non-browser applications
- Execute system shortcuts
- Simulate a real typing effect

---

### Get Mouse Position

Get the current mouse coordinate on the screen.

**Configuration**:

| Parameter | Description |
|------|------|
| X coordinate variable name | The variable to store the X coordinate |
| Y coordinate variable name | The variable to store the Y coordinate |

**Use cases**:
- Record the user's click position
- Use together with "Real Mouse Click"
- Debug positioning issues

---

### Click Image

Find a specified image on the screen and click it.

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| Image path | The image file to find | \`C:/images/button.png\` |
| Match accuracy | 0.1-1.0, higher is stricter | 0.8 |
| Mouse button | Left/Right/Middle | left |
| Click type | Single/Double | single |
| Wait timeout | The timeout for finding the image (seconds) | 10 |

**Use cases**:
- Click elements that cannot be located by selector
- Operate desktop applications
- Image recognition automation

**Note**: Requires the opencv-python and Pillow libraries

---

### Screenshot

Capture the entire screen or a specified area.

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| Save path | The folder to save the screenshot | \`C:/screenshots\` |
| File name | The screenshot file name | Leave empty to auto-generate a timestamp |
| Screenshot area | Full screen/Custom area | full |
| Storage variable name | The variable to save the screenshot path | screenshot_path |

**Custom area (two-point positioning)**:
- Top-left coordinate: the start of the screenshot area (supports Ctrl+left click picking)
- Bottom-right coordinate: the end of the screenshot area (supports Ctrl+left click picking)

**How to use**:
1. Select "Custom area (two-point positioning)"
2. Click the first "Pick" button, Ctrl+left click to select the top-left position
3. Click the second "Pick" button, Ctrl+left click to select the bottom-right position
4. The system automatically calculates and shows the screenshot area size

💡 Two-point positioning is more intuitive, with no need to manually calculate width and height

---

### Rename File

Rename a specified file.

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| Source file path | The file to rename | \`C:/data/old.txt\` |
| New file name | The new file name | \`new.txt\`, supports variables |
| Storage variable name | The variable to save the new path | new_path |

---

### Execute Command

Execute a system command (CMD or PowerShell).

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| Command | The command to execute | \`dir C:\\\\Users\` |
| Execution mode | CMD/PowerShell | cmd |
| Timeout | The command execution timeout (seconds) | 30 |
| Storage variable name | The variable to save the command output | output |

**⚠️ Security warning**: Execute system commands with caution; avoid running commands from unknown sources.

---

### Shutdown/Restart

Perform a system power operation.

**Operation types**:

| Type | Description |
|------|------|
| Shutdown | Turn off the computer |
| Restart | Restart the computer |
| Log off | Log off the current user |
| Hibernate | Enter hibernation mode |
| Sleep | Enter sleep mode |

**Configuration**:
- Delay time: the number of seconds to wait before executing
- Force: whether to force-close programs

---

### Lock Screen

Lock the Windows screen, equivalent to pressing Win+L.

---

## ⚠️ Exception Handling

Every module has an **orange exception handling connection point** (on the right side of the module). When a module fails, the flow connected to that point is triggered automatically.

### How It Works

\`\`\`
                    ┌─→ Exception handling flow
Module ──┬─→ Normal flow  │
       └─→ (error) ─┘
\`\`\`

- **Normal flow**: when the module succeeds, it continues from the bottom connection point
- **Exception handling**: when the module fails, it is triggered from the orange connection point on the right

### How to Use

1. Drag a connection from the **orange connection point** on the right of the module
2. Connect it to an exception handling module (such as print log, send notification, etc.)
3. When the module fails, the exception handling flow runs automatically

### Example: Network Request Exception Handling

\`\`\`
API request ──┬─→ Process response data → Continue flow
          └─→ (error) → Print log: "Request failed" → Send notification
\`\`\`

### Example: Element Click Exception Handling

\`\`\`
Click element ──┬─→ Continue operation
           └─→ (error) → Screenshot → Retry logic
\`\`\`

### Features

| Feature | Description |
|------|------|
| **Auto-trigger** | The exception handling branch runs automatically when a module fails |
| **Parallel support** | The exception handling branch supports executing multiple modules in parallel |
| **Does not affect the main flow** | With exception handling, a failure does not interrupt the entire workflow |
| **Supported by all modules** | Every module has an exception handling connection point |

### Best Practices

**✅ Recommended exception handling**:
- Log the error
- Send a failure notification
- Save an error screenshot
- Run retry logic
- Set a default value and continue

**Example: A complete exception handling flow**
\`\`\`
Open page ──┬─→ Normal flow...
           └─→ (error) → Print log → Wait 5 seconds → Reopen page

\`\`\`

---

## 🎬 Media Processing

WebRPA includes powerful media processing features implemented based on FFmpeg, supporting format conversion, compression, trimming, and other operations for video, audio, and images.

### Prerequisites

The media processing modules require \`ffmpeg.exe\` and \`ffprobe.exe\` to exist in the \`backend\` directory.

---

### Format Conversion

Convert a video, audio, or image to another format.

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| Media type | Video/Audio/Image | video |
| Input file path | Source file path | \`C:/videos/input.avi\` |
| Output format | Target format | mp4, mp3, jpg, etc. |
| Output file path | Optional, leave empty to auto-generate | \`C:/videos/output.mp4\` |
| Result variable name | The variable to store the output path | converted_path |

**Supported formats**:

| Type | Input Formats | Output Formats |
|------|----------|----------|
| Video | mp4, avi, mkv, mov, wmv, flv, webm | mp4, avi, mkv, mov, webm, gif |
| Audio | mp3, wav, flac, aac, m4a, ogg, wma | mp3, wav, flac, aac, ogg, m4a |
| Image | jpg, png, gif, bmp, webp, tiff | jpg, png, webp, gif, bmp |

**Example**: Convert AVI to MP4
\`\`\`
Format conversion:
  Media type: Video
  Input file: C:/videos/movie.avi
  Output format: mp4
  
→ Output: C:/videos/movie_converted.mp4
\`\`\`

---

### Image Compression

Compress the file size of an image, supporting quality and dimension adjustment.

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| Input image path | Source image path | \`C:/images/photo.jpg\` |
| Compression quality | 1-100, lower compresses more | 80 |
| Max width | Optional, limit the width | 1920 |
| Max height | Optional, limit the height | 1080 |
| Output file path | Optional, leave empty to overwrite the source | |
| Result variable name | The variable to store the output path | compressed_image |

**Use cases**:
- Batch compress photos to save storage space
- Compress images before uploading to reduce transfer time
- Generate thumbnails

**Example**: Compress an image to 80% quality
\`\`\`
Image compression:
  Input image: C:/images/photo.jpg
  Compression quality: 80
  Max width: 1920
  
→ Compression ratio: about 60%
\`\`\`

---

### Video Compression

Compress the file size of a video, supporting quality and resolution adjustment.

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| Input video path | Source video path | \`C:/videos/movie.mp4\` |
| Compression preset | Speed-quality balance | medium |
| Quality level (CRF) | 0-51, higher compresses more | 23 |
| Resolution | Optional, lower the resolution | 1280x720 |
| Output file path | Optional, leave empty to auto-generate | |
| Result variable name | The variable to store the output path | compressed_video |

**Compression preset explained**:

| Preset | Speed | Quality | Use Case |
|------|------|------|----------|
| ultrafast | Fastest | Lower | Quick preview |
| fast | Fast | Medium | Daily use |
| medium | Medium | Good | Recommended default |
| slow | Slow | High | Final output |
| veryslow | Slowest | Highest | Pursuing the best |

**CRF value reference**:

| CRF | Quality | File Size |
|-----|------|----------|
| 18 | Near lossless | Larger |
| 23 | Default, high quality | Medium |
| 28 | Medium quality | Smaller |
| 35 | Low quality | Very small |

**Example**: Compress a video to 720p
\`\`\`
Video compression:
  Input video: C:/videos/4k_movie.mp4
  Compression preset: medium
  CRF: 23
  Resolution: 1280x720
  
→ Compression ratio: about 70%
\`\`\`

---

### Extract Audio

Extract the audio track from a video file.

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| Input video path | Source video path | \`C:/videos/movie.mp4\` |
| Audio format | Output audio format | mp3 |
| Audio bitrate | Audio quality | 192k |
| Output file path | Optional, leave empty to auto-generate | |
| Result variable name | The variable to store the output path | extracted_audio |

**Bitrate reference**:

| Bitrate | Quality | Use Case |
|--------|------|----------|
| 128k | Fair | Voice, podcast |
| 192k | Good | Recommended default |
| 256k | High | Music |
| 320k | Highest | Audiophile |

**Example**: Extract MP3 audio from a video
\`\`\`
Extract audio:
  Input video: C:/videos/mv.mp4
  Audio format: mp3
  Bitrate: 192k
  
→ Output: C:/videos/mv.mp3
\`\`\`

---

### Video Trim

Cut a specified time range from a video.

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| Input video path | Source video path | \`C:/videos/movie.mp4\` |
| Start time | Trim start point | 00:01:30 or 90 |
| End time | Trim end point, leave empty for the end | 00:05:00 |
| Output file path | Optional, leave empty to auto-generate | |
| Result variable name | The variable to store the output path | trimmed_video |

**Time format**:
- \`HH:MM:SS\` - hours:minutes:seconds, e.g. \`00:01:30\`
- Seconds - enter a number directly, e.g. \`90\`

**Example**: Cut the segment from 1:30 to 5:00
\`\`\`
Video trim:
  Input video: C:/videos/movie.mp4
  Start time: 00:01:30
  End time: 00:05:00
  
→ Output a 3-minute-30-second video segment
\`\`\`

---

### Media Merge

Merge multiple video or audio files into one.

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| Merge type | Video/Audio | video |
| Input file list | A list variable containing file paths | \`{video list}\` |
| Output file path | The merged file path | \`C:/videos/merged.mp4\` |
| Result variable name | The variable to store the output path | merged_file |

**How to use**:
1. First use "List operation" to create a list of file paths
2. Fill the list variable name into "Input file list"

**Example**: Merge multiple video segments
\`\`\`
Set variable: video list = ["C:/v1.mp4", "C:/v2.mp4", "C:/v3.mp4"]

Media merge:
  Merge type: Video
  Input file list: {video list}
  Output file: C:/merged.mp4
\`\`\`

**Note**: The files to merge should have the same encoding format and resolution, otherwise it may fail.

---

### Add Watermark

Add an image or text watermark to a video or image.

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| Media type | Video/Image | video |
| Input file path | Source file path | \`C:/videos/movie.mp4\` |
| Watermark type | Image watermark/Text watermark | image |
| Watermark image path | The image file for an image watermark | \`C:/logo.png\` |
| Watermark text | The content of a text watermark | © 2026 |
| Font size | The font size of a text watermark | 24 |
| Font color | The color of a text watermark | white |
| Watermark position | Where to place the watermark | bottomright |
| Opacity | 0-1, the watermark opacity | 0.8 |
| Output file path | Optional, leave empty to auto-generate | |
| Result variable name | The variable to store the output path | watermarked_file |

**Watermark position**:

| Position | Description |
|------|------|
| topleft | Top-left corner |
| topright | Top-right corner |
| bottomleft | Bottom-left corner |
| bottomright | Bottom-right corner (recommended) |
| center | Center |

**Example**: Add a logo watermark to the bottom-right of a video
\`\`\`
Add watermark:
  Media type: Video
  Input file: C:/videos/movie.mp4
  Watermark type: Image watermark
  Watermark image: C:/logo.png
  Position: Bottom right
  Opacity: 0.8
\`\`\`

**Example**: Add a text watermark
\`\`\`
Add watermark:
  Media type: Image
  Input file: C:/images/photo.jpg
  Watermark type: Text watermark
  Watermark text: © 2026 Qingyun Studio_Peng Minghang
  Font size: 24
  Font color: white
  Position: Bottom right
  Opacity: 0.7
\`\`\`

---

### Media Processing Best Practices

**Batch processing**:
\`\`\`
Get file list → Iterate list → Format conversion/compression → Save results
\`\`\`

**Video processing pipeline**:
\`\`\`
Download video → Trim segment → Compress → Add watermark → Upload
\`\`\`

**Notes**:
- Processing large files may take a long time; set a sufficient timeout
- Video compression is a CPU-intensive operation and uses considerable system resources
- It is recommended to check whether there is enough disk space before processing

---

## 🧠 AI Recognition

WebRPA provides AI-based image recognition features, including face recognition and image OCR text recognition.

---

### Face Recognition

Compare whether the faces in two images match; useful for identity verification, face comparison, and similar scenarios.

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| Recognition image path | The image to recognize (may contain multiple faces) | \`C:/images/photo.jpg\` |
| Target face image | The target face image for comparison | \`C:/images/target.jpg\` |
| Match tolerance | 0-1, smaller is stricter | 0.6 (default) |
| Result variable name | The variable to store the recognition result | face_match_result |

**Branch outputs**:

The face recognition module has two output branches (similar to a condition check):
- **✓ Match**: runs when a matching face is detected
- **✗ No match**: runs when no matching face is detected

**Result variable content**:

\`\`\`json
{
  "matched": true,
  "confidence": 85.5,
  "source_faces": 3,
  "target_faces": 1,
  "best_distance": 0.145
}
\`\`\`

| Field | Description |
|------|------|
| matched | Whether it matches |
| confidence | Match confidence (percentage) |
| source_faces | The number of faces detected in the recognition image |
| target_faces | The number of faces detected in the target image |
| best_distance | The best match distance (smaller is more similar) |

**Tolerance value reference**:

| Tolerance | Description | Use Case |
|------|------|----------|
| 0.4 | Very strict | High-security verification |
| 0.5 | Fairly strict | General identity verification |
| 0.6 | Default | Recommended |
| 0.7 | Fairly lenient | Similar-face lookup |

**Example**: Employee clock-in verification
\`\`\`
Face recognition:
  Recognition image: {camera screenshot}
  Target face: C:/employees/{employee ID}.jpg
  Tolerance: 0.5
  
  ├─ Match → Record successful clock-in
  └─ No match → Prompt verification failed
\`\`\`

**Notes**:
- First-time use requires installing the face_recognition library (depends on dlib)
- The image should contain a clear frontal face
- Lighting and angle affect recognition accuracy
- A high-quality target face image is recommended

---

### Image OCR

Recognize text content in an image, supporting mixed Chinese and English recognition.

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| Image path | The image file to recognize | \`C:/images/text.png\` |
| Result variable name | The variable to store the recognized text | ocr_text |

**Use cases**:
- Recognize text info in an image
- Extract data from a screenshot
- Recognize scanned document content
- Read an image CAPTCHA

**Example**: Extract the price from a screenshot
\`\`\`
Screenshot → Image OCR → Regex extract price → Save data
\`\`\`

**Example**: Batch recognize text in images
\`\`\`
Iterate image list:
  ├─ Image OCR: {item}
  ├─ Print log: Recognition result: {ocr_text}
  └─ Save to list
\`\`\`

**Notes**:
- It uses the ddddocr library for recognition (built into the project)
- Image clarity affects recognition accuracy
- Supports common image formats such as jpg, png, bmp
- Text with complex layouts may not be fully recognized

---

## 📁 File Operations

WebRPA provides complete local file operation features, allowing you to read, write, copy, move, delete, and otherwise operate on files and folders.

---

### Get File List

Get the names of all files or subfolders in a specified folder; the result is saved as a list variable that can be used for iteration.

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| Folder path | The folder to scan | \`C:/data\`, supports variables |
| Get type | Files only/Folders only/All | files |
| File name format | Whether to include the extension | Include extension |
| Filter pattern | Optional, wildcard filter | \`*.txt\` or \`*.jpg;*.png\` |
| Result variable name | The variable to store the file name list | file_list |

**Filter pattern explained**:
- Supports the wildcard \`*\` to match any characters
- Separate multiple patterns with a semicolon \`;\`
- Example: \`*.txt\` gets only txt files, \`*.jpg;*.png\` gets jpg and png files

**Example**: Get all images in a folder
\`\`\`
Get file list:
  Folder path: C:/images
  Get type: Files only
  Filter pattern: *.jpg;*.png;*.gif
  Result variable: image_list

→ image_list = ["photo1.jpg", "photo2.png", "banner.gif"]
\`\`\`

**Use with iteration**:
\`\`\`
Get file list → Iterate list → Process each file
\`\`\`


---

### Copy File

Copy a file to a specified location.

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| Source file path | The file to copy | \`C:/data/file.txt\` |
| Target path | The target folder or full path | \`D:/backup/\` |
| Overwrite existing file | Whether to overwrite a file with the same name | Yes |
| Result variable name | The variable to store the new file path | copied_path |

**Target path explained**:
- If it is a folder path (ending with \`/\` or \`\\\`), the original file name is kept
- If it is a full file path, it can be renamed at the same time

**Example**: Back up a file
\`\`\`
Copy file:
  Source file: C:/data/report.xlsx
  Target path: D:/backup/
  
→ Copied to D:/backup/report.xlsx
\`\`\`

---

### Move File

Move a file to a specified location (cut).

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| Source file path | The file to move | \`C:/downloads/file.zip\` |
| Target path | The target folder or full path | \`D:/archive/\` |
| Overwrite existing file | Whether to overwrite a file with the same name | Yes |
| Result variable name | The variable to store the new file path | moved_path |

**Example**: Organize downloaded files
\`\`\`
Move file:
  Source file: C:/downloads/{file name}
  Target path: D:/documents/
  
→ The file is moved from downloads to documents
\`\`\`

---

### Delete File

Delete a specified file or folder.

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| File/folder path | The path to delete | \`C:/temp/old.txt\` |
| Delete type | File/Folder (including contents) | File |

**⚠️ Warning**: The delete operation is irreversible, use with caution!

**Example**: Clean up temporary files
\`\`\`
Delete file:
  Path: C:/temp/cache.tmp
  Type: File
\`\`\`

**Example**: Delete an entire folder
\`\`\`
Delete file:
  Path: C:/temp/old_data
  Type: Folder (including contents)
  
→ Delete the folder and all its contents
\`\`\`

---

### Create Folder

Create a new folder, supporting multi-level directory creation.

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| Folder path | The folder path to create | \`C:/data/2024/01\` |
| Result variable name | The variable to store the created path | folder_path |

**Features**:
- Automatically creates all parent directories
- Does not error if the folder already exists

**Example**: Create folders by date
\`\`\`
Get time → Create folder: C:/data/{year}/{month}/{day}
\`\`\`

---

### File Exists

Check whether a specified file or folder exists.

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| File/folder path | The path to check | \`C:/data/config.json\` |
| Result variable name | The variable to store the result (true/false) | exists |

**Use with a condition check**:
\`\`\`
File exists → Condition check: {exists} == true
  ├─ True → Read the file
  └─ False → Create a default file
\`\`\`

---

### Get File Info

Get detailed information about a file, including size, creation time, modification time, etc.

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| File path | The file to get info for | \`C:/data/report.pdf\` |
| Result variable name | The variable to store the file info | file_info |

**Returned info**:

\`\`\`json
{
  "name": "report.pdf",
  "path": "C:/data/report.pdf",
  "size": 1048576,
  "extension": ".pdf",
  "created_time": "2024-01-15 10:30:00",
  "modified_time": "2024-01-20 14:25:00",
  "is_file": true,
  "is_folder": false
}
\`\`\`

**Access the file info**:
\`\`\`
{file_info[name]}          → report.pdf
{file_info[size]}          → 1048576 (bytes)
{file_info[extension]}     → .pdf
{file_info[modified_time]} → 2024-01-20 14:25:00
\`\`\`

---

### Read Text File

Read the content of a text file into a variable.

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| File path | The text file to read | \`C:/data/config.txt\` |
| File encoding | The character encoding of the file | UTF-8 |
| Result variable name | The variable to store the file content | file_content |

**Supported encodings**:
- UTF-8 (recommended, default)
- GBK (common on Chinese Windows)
- GB2312
- UTF-16
- ASCII

**Example**: Read a config file
\`\`\`
Read text file:
  File path: C:/config/settings.json
  Encoding: UTF-8
  Result variable: config_text

→ Then you can process the content with JSON parse
\`\`\`

**Example**: Read a log file
\`\`\`
Read text file:
  File path: C:/logs/app.log
  Encoding: UTF-8
  Result variable: log_content

→ Then you can analyze the log with regex extract
\`\`\`

---

### Write Text File

Write text content to a file, supporting overwrite and append modes.

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| File path | The file path to write | \`C:/data/output.txt\` |
| Write content | The text to write | Supports variables \`{data}\` |
| File encoding | The character encoding of the file | UTF-8 |
| Write mode | Overwrite/Append | Overwrite |
| Result variable name | The variable to store the file path | write_path |

**Write mode explained**:
- **Overwrite**: clear the file's existing content and write new content
- **Append**: add new content at the end of the file

**Example**: Save collected data
\`\`\`
Write text file:
  File path: C:/data/result.txt
  Content: {product name},{price},{stock}
  Mode: Append
  
→ Append one row of data per execution
\`\`\`

**Example**: Save JSON data
\`\`\`
Write text file:
  File path: C:/data/config.json
  Content: {"name": "{name}", "value": {value}}
  Mode: Overwrite
\`\`\`

---

### File Operation Best Practices

**Batch file processing**:
\`\`\`
Get file list → Iterate list → Process each file → Move to the done folder
\`\`\`

**Data export flow**:
\`\`\`
Collect data → Create folder (by date) → Write text file
\`\`\`

**File backup flow**:
\`\`\`
File exists → Copy file to backup directory → Delete the original file
\`\`\`

**Config file read/write**:
\`\`\`
Read text file → JSON parse → Modify config → Write text file
\`\`\`

**Notes**:
- It is recommended to check with "File exists" before operating
- The delete operation is irreversible; it is recommended to back up first
- Reading large files may use considerable memory
- When writing, make sure the target folder exists (or use "Create Folder")

---

## 💬 QQ Automation

WebRPA supports QQ message automation via NapCat (OneBot protocol), allowing you to send messages and images, get friend/group lists, and wait to receive messages.

### Prerequisites

1. Install and run NapCat (built into the NapCat folder in the project)
2. Log in to your QQ account in NapCat
3. Make sure the OneBot HTTP service is started (default port 3000)

### Connection Status

You can see the NapCat connection status on the toolbar:
- 🟢 Green: connected
- 🔴 Red: not connected

Click the status icon to open the NapCat settings panel and configure the HTTP port.

---

### QQ Send Message

Send a text message to a specified friend or group.

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| Message type | Private/Group | private |
| Target ID | QQ number or group number | \`123456789\`, supports variables |
| Message content | The text to send | \`Hello! {variable}\` |
| Result variable name | The variable to store the send result | qq_msg_result |

**Example**: Send a private message
\`\`\`
QQ send message:
  Message type: Private
  Target ID: 123456789
  Message content: Hello, this is an automatically sent message!
\`\`\`

**Example**: Send a group message
\`\`\`
QQ send message:
  Message type: Group
  Target ID: 987654321
  Message content: Hi everyone! Daily check-in reminder~
\`\`\`

---

### QQ Send Image

Send an image to a specified friend or group.

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| Message type | Private/Group | private |
| Target ID | QQ number or group number | \`123456789\` |
| Image source | Local file/Network URL/Base64 | file |
| Image path/URL | The path or URL of the image | \`C:/images/pic.jpg\` |
| Result variable name | The variable to store the send result | qq_img_result |

**Image source explained**:

| Source | Description | Example |
|------|------|------|
| Local file | A local image file path | \`C:/images/photo.jpg\` |
| Network URL | A network image address | \`https://example.com/img.png\` |
| Base64 | Base64-encoded image data | \`{base64_image}\` |

**Example**: Send a local image
\`\`\`
QQ send image:
  Message type: Private
  Target ID: 123456789
  Image source: Local file
  Image path: C:/screenshots/result.png
\`\`\`

---

### QQ Send File

Send a file to a specified friend or group.

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| Message type | Private/Group | private |
| Target ID | QQ number or group number | \`123456789\` |
| File path | A local file path | \`C:/documents/report.pdf\` |
| File name | Optional, custom display file name | \`Report.pdf\` |
| Result variable name | The variable to store the send result | qq_file_result |

**Example**: Send a file to a friend
\`\`\`
QQ send file:
  Message type: Private
  Target ID: 123456789
  File path: C:/documents/report.pdf
  File name: Monthly Report.pdf
\`\`\`

**Example**: Send a file to a group
\`\`\`
QQ send file:
  Message type: Group
  Target ID: 987654321
  File path: {downloaded file path}
\`\`\`

---

### QQ Wait for Message

Wait to receive a QQ message that meets specified conditions; can be used to implement message-triggered automation flows.

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| Message source | Private/Group/All | private |
| Sender ID | Optional, specify the sender's QQ number | \`123456789\` |
| Group ID | For group chats, you can specify the group number | \`987654321\` |
| Match mode | Contains/Exact/Regex/Any | contains |
| Match content | The text or regex to match | \`hello\` |
| Wait timeout | The timeout (seconds), 0 = wait indefinitely | 0 |
| Polling interval | The interval to check messages (seconds) | 0.3 |
| Result variable name | The variable to store the received message | qq_received_message |

**Match mode explained**:

| Mode | Description | Example |
|------|------|------|
| Contains | The message contains the specified text | Match content: \`hello\` → matches "hello there", "say hello" |
| Exact | The message exactly equals the specified text | Match content: \`hello\` → matches only "hello" |
| Regex | Match using a regular expression | Match content: \`\\d+\` → matches messages containing numbers |
| Any | Receive any message | No match content needed |

**Result variable content**:

\`\`\`json
{
  "message_id": 123456,
  "sender_id": "123456789",
  "sender_nickname": "User Nickname",
  "group_id": "987654321",
  "group_name": "Group Name",
  "message": "Message content",
  "raw_message": "Raw message",
  "time": 1704067200
}
\`\`\`

**Example**: Wait for a message from a specified user
\`\`\`
QQ wait for message:
  Message source: Private
  Sender ID: 123456789
  Match mode: Contains
  Match content: confirm
  Wait timeout: 0 (wait indefinitely)
  
→ Wait for user 123456789 to send a message containing "confirm"
\`\`\`

**Example**: Wait for any message in a group
\`\`\`
QQ wait for message:
  Message source: Group
  Group ID: 987654321
  Match mode: Any
  Wait timeout: 60
  
→ Wait for any message in group 987654321, up to 60 seconds
\`\`\`

**Implement message listening with a loop**:
\`\`\`
Loop 100 times
  ├─ QQ wait for message (match: hello)
  ├─ QQ send message: Hi there! {qq_received_message[sender_nickname]}
  └─ Print log: Received a message from {qq_received_message[sender_id]}
\`\`\`

---

### QQ Get Friend List

Get the friend list of the currently logged-in account.

**Configuration**:

| Parameter | Description |
|------|------|
| Result variable name | The variable to store the friend list |

**Returned data format**:

\`\`\`json
[
  {
    "user_id": "123456789",
    "nickname": "Friend Nickname",
    "remark": "Remark Name"
  },
  ...
]
\`\`\`

**Example**: Iterate friends and send messages
\`\`\`
QQ get friend list → Iterate list
  └─ QQ send message: {item[user_id]}, Happy New Year!
\`\`\`

---

### QQ Get Group List

Get the list of groups the currently logged-in account has joined.

**Configuration**:

| Parameter | Description |
|------|------|
| Result variable name | The variable to store the group list |

**Returned data format**:

\`\`\`json
[
  {
    "group_id": "987654321",
    "group_name": "Group Name",
    "member_count": 100,
    "max_member_count": 500
  },
  ...
]
\`\`\`

---

### QQ Get Group Member List

Get the member list of a specified group.

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| Group ID | The group number to get members for | \`987654321\` |
| Result variable name | The variable to store the member list | group_members |

**Returned data format**:

\`\`\`json
[
  {
    "user_id": "123456789",
    "nickname": "Nickname",
    "card": "Group Card",
    "role": "member"
  },
  ...
]
\`\`\`

---

### QQ Get Login Info

Get the info of the currently logged-in QQ account.

**Configuration**:

| Parameter | Description |
|------|------|
| Result variable name | The variable to store the login info |

**Returned data format**:

\`\`\`json
{
  "user_id": "123456789",
  "nickname": "My Nickname"
}
\`\`\`

---

### QQ Automation Use Cases

#### 1. Message Auto-reply Bot
\`\`\`
Loop (infinite)
  ├─ QQ wait for message (match: hello)
  └─ QQ send message: Hello! How can I help you?
\`\`\`

#### 2. Scheduled Group Broadcast
\`\`\`
Scheduled execution (every day 9:00)
  ├─ QQ get group list
  └─ Iterate group list
      └─ QQ send message: Good morning, daily check-in starts!
\`\`\`

#### 3. Keyword-triggered Workflow
\`\`\`
QQ wait for message (match: query order)
  ├─ Regex extract order number
  ├─ API request to query the order
  └─ QQ send message: Order status: {order info}
\`\`\`

#### 4. Message Forwarding
\`\`\`
QQ wait for message (source: private)
  └─ QQ send message (group): Forwarded message: {qq_received_message[message]}
\`\`\`

### Notes

| Note | Description |
|--------|------|
| NapCat status | Make sure NapCat is started and logged in |
| Message frequency | Avoid sending too frequently, which may trigger risk control |
| Sensitive content | Do not send content that violates rules |
| Wait timeout | A reasonable timeout is recommended; 0 means wait indefinitely |

---

## 💚 WeChat Automation

WebRPA supports WeChat message automation, allowing you to send messages and files to specified contacts or groups.

### How It Works

Since WeChat 4.x uses a brand-new UI framework that traditional UI automation tools cannot support, this module uses **image recognition + keyboard/mouse simulation** to implement WeChat automation, compatible with all WeChat versions:

1. Find and activate the WeChat window by window title
2. Use Ctrl+F to open search and enter the contact name
3. Press Enter to enter the chat window
4. Use the clipboard to paste and send the content

### Prerequisites

1. WeChat is logged in and its window stays open (can be minimized)
2. The WeChat window title is "WeChat" (default)

### Smart Optimizations

- **Auto window activation**: automatically brings the WeChat window to the top and gives it focus during execution
- **Chat target caching**: if you are already chatting with the target contact, it skips the search step and sends directly, saving time

---

### WeChat Send Message

Send a text message to a specified contact or group.

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| Target | Contact or group name | \`Zhang San\`, \`Work Group\` |
| Message content | The text to send | \`Hello! {variable}\` |
| Result variable name | The variable to store the send result | wechat_result |

**Example**: Send a message to a friend
\`\`\`
WeChat send message:
  Target: Zhang San
  Message content: Hello, this is an automatically sent message!
\`\`\`

**Example**: Send a message to a group
\`\`\`
WeChat send message:
  Target: Work Group
  Message content: Hi everyone, today's meeting starts at 3 PM.
\`\`\`

---

### WeChat Send File

Send a file (supports images, documents, or any file) to a specified contact or group.

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| Target | Contact or group name | \`Zhang San\`, \`Work Group\` |
| File path | A local file path | \`C:/images/photo.jpg\` |
| Result variable name | The variable to store the send result | wechat_file_result |

**Example**: Send an image
\`\`\`
WeChat send file:
  Target: Zhang San
  File path: C:/screenshots/result.png
\`\`\`

**Example**: Send a document
\`\`\`
WeChat send file:
  Target: Work Group
  File path: C:/documents/Report.pdf
\`\`\`

---

### WeChat Automation Use Cases

#### 1. Scheduled Message Sending
\`\`\`
Scheduled execution (every day 9:00)
  └─ WeChat send message: Good morning!
\`\`\`

#### 2. Batch Send Notifications
\`\`\`
Set variable: contact list = ["Zhang San", "Li Si", "Wang Wu"]

Iterate list: contact list
  └─ WeChat send message: {item}, meeting reminder!
\`\`\`

#### 3. Auto Send Files
\`\`\`
Download file → WeChat send file: {downloaded file path}
\`\`\`

#### 4. Combine with Other Modules
\`\`\`
Collect data → Export Excel → WeChat send file: {exported file}
\`\`\`

### Notes

| Note | Description |
|--------|------|
| WeChat status | Make sure WeChat is logged in and its window is open |
| Contact name | Use the exact contact or group name; remark names are supported |
| Message frequency | Avoid sending too frequently, which may trigger risk control |
| File size | Sending large files may take a long time |
| Window focus | The WeChat window is activated automatically during execution |

---

## 🎬 Macro Recorder

Record mouse and keyboard operations, then automatically replay them in the recorded order and timing to automate operations.

### Overview

The macro recorder can record the following operations:
- Mouse movement paths
- Mouse clicks (left, right, middle button)
- Mouse wheel scrolling
- Keyboard keys and text input

### Recording

**Start recording**:

1. Click the "🎬 Start Recording" button in the configuration panel
2. A recording dialog pops up; choose the operation types to record
3. After clicking "Start Recording", perform mouse and keyboard operations
4. When done, click "⏹️ Stop Recording"
5. Click "Save" to save the recorded data to the module

**Recording options**:

| Option | Description |
|------|------|
| Mouse path | Record the mouse movement path |
| Mouse clicks | Record mouse click operations |
| Keyboard operations | Record keyboard keys and input |
| Mouse wheel | Record wheel scrolling operations |

### Playback Configuration

| Parameter | Description | Example |
|------|------|------|
| Playback speed | The replay speed multiplier | 1x (original), 2x (fast), 0.5x (slow) |
| Repeat count | The number of times to repeat | 1-9999 |
| Play mouse movement path | Whether to replay mouse movement | Check/uncheck |
| Play mouse clicks | Whether to replay mouse clicks | Check/uncheck |
| Play keyboard operations | Whether to replay keyboard operations | Check/uncheck |
| Use relative position | Start from the current mouse position | Check/uncheck |

**Playback speed explained**:

| Speed | Description | Use Case |
|------|------|----------|
| 0.25x | Slow | Debugging, demo |
| 0.5x | Slower | Need to observe the process |
| 1x | Original | Normal replay |
| 2x | Fast | Accelerated execution |
| 5x | Very fast | Quickly complete repetitive tasks |

### Use Cases

#### 1. Repetitive Operation Automation
\`\`\`
Record: open software → click menu → select option → confirm
Replay: automatically perform the same operations
\`\`\`

#### 2. Game Scripts
\`\`\`
Record: character movement path → skill release → item pickup
Replay: automatically perform game operations
\`\`\`

#### 3. Form Filling
\`\`\`
Record: click input box → enter content → switch to next → submit
Replay: automatically fill forms of the same format
\`\`\`

#### 4. Software Testing
\`\`\`
Record: a complete user operation flow
Replay: repeatedly execute the test case
\`\`\`

### Example: Auto Check-in

\`\`\`
1. Record operations:
   - Click the check-in button position
   - Wait for the popup to appear
   - Click the confirm button

2. Configure playback:
   - Playback speed: 1x
   - Repeat count: 1
   - Check: Play mouse clicks

3. Execute: run this module on a schedule every day
\`\`\`

### Notes

| Note | Description |
|--------|------|
| Screen resolution | Keep the same screen resolution when recording and replaying |
| Window position | The target window should be in the same position, or use relative position mode |
| Time intervals | Replay preserves the recorded time intervals (adjustable via speed) |
| System permission | System-level input permission is required to work properly |

### Best Practices

**✅ Recommended**:
- Determine the window position before recording
- Keep a steady rhythm during operations
- Use relative position mode to improve compatibility
- Test at slow speed first, then accelerate after confirming it is correct

**❌ Avoid**:
- Switching windows during recording
- Moving the mouse too fast during recording
- Replaying at a different resolution
- Recording overly long operation sequences (segment them is recommended)

### Combine with Other Modules

\`\`\`
Scheduled execution → Macro recorder → Screenshot → Send notification
\`\`\`

\`\`\`
Loop 5 times
  └─ Macro recorder (repeat count: 1)
      └─ Wait 2 seconds
\`\`\`

---

## 🎯 Real-time Mouse Coordinate Display

After enabling it in the global settings, the current screen coordinate is shown in real time next to the mouse, making positioning and debugging easier.

### How to Enable

1. Click the **⚙️ Settings** button on the toolbar
2. Find the **Display Settings** area
3. Turn on the **Real-time mouse coordinate display** switch

### Features

| Feature | Description |
|------|------|
| Real-time follow | The coordinate display window always follows the mouse |
| Always on top | The window stays on the topmost layer and is not covered by other windows |
| Modern UI | Rounded design, semi-transparent background, matching the WebRPA theme |
| Auto close | The coordinate display stops automatically when the frontend or backend is closed |

### Displayed Info

The coordinate display window contains the following info:
- **X coordinate**: the horizontal position of the mouse on the screen (pixels)
- **Y coordinate**: the vertical position of the mouse on the screen (pixels)
- **WebRPA label**: indicates this is WebRPA's coordinate tool

### Use Cases

- **Debug positioning**: view an element's exact position on the screen
- **Configure coordinates**: get coordinate values for modules like real mouse click and drag
- **Screenshot area**: determine the range of a screen screenshot area
- **Image recognition**: determine the coordinate range of a search area

### Notes

- The coordinate display is controlled by an independent backend process and does not affect workflow execution
- The coordinate display stops automatically when the browser or terminal is closed
- If the coordinate display behaves abnormally, you can turn it off and on again in the settings

---

## 🧠 AI Data Processing Modules

WebRPA 2.0 provides 8 ready-to-use AI workflow modules under the "AI Data Processing" category in the sidebar, embedding the understanding capability of large language models directly into the workflow, so that cleaning, classification, and judgment after data collection can all be handed to the AI.

These modules **reuse the global AI configuration by default** (just fill in the API endpoint/key/model once in settings), and can also be overridden individually within a module. Each module writes its result to a specified variable for subsequent modules to reference.

### Module Overview

| Module | Module Type | Purpose |
|------|----------|------|
| AI Information Extraction | ai_extract | Extract fields from unstructured text into a JSON object |
| AI Text Classification | ai_classify | Classify text into the most appropriate one of the given categories |
| AI Text Summarization | ai_summarize | Compress long text into a summary of a specified length/style |
| AI Translation | ai_translate | Translate text into a target language, preserving formatting |
| AI Sentiment Analysis | ai_sentiment | Determine the sentiment of text (positive/negative/neutral) and score it |
| AI Data Normalization | ai_normalize | Unify dates/amounts/phones/numbers/addresses into a standard format |
| AI Semantic Deduplication | ai_dedup_semantic | Deduplicate a list at the semantic level (merge items with the same meaning) |
| AI Smart Routing | ai_route | Intelligently select a subsequent branch based on content, giving the workflow "judgment" |

---

### AI Information Extraction (ai_extract)

Extract structured JSON from unstructured text such as web pages, emails, orders, and chat logs, according to the fields you specify.

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| Text to extract | The raw text, supports variables | \`{web page text}\` |
| Extraction fields | Comma-separated field names, or "field:description" JSON | \`name,phone,address,order time\` |
| Save to variable | Store the extraction result (JSON object) | extraction result |

**Result usage**:
\`\`\`
{extraction result[name]}     → Zhang San
{extraction result[phone]}    → 13800138000
\`\`\`

> Fields that cannot be found return an empty string; if the model does not return valid JSON, it falls back to returning the original text.

---

### AI Text Classification (ai_classify)

Automatically classify text (tickets, comments, emails, etc.) into one of the preset categories, with a confidence score and reason.

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| Text to classify | The text to classify, supports variables | \`{ticket content}\` |
| Candidate categories | At least two, comma-separated | \`complaint,inquiry,praise,refund\` |
| Save to variable | Store the matched category name | ticket category |

> The model only selects from the given categories and does not invent new ones; the saved variable is the category name, which can be used directly in condition check branches.

---

### AI Text Summarization (ai_summarize)

Compress long text into a summary, with a configurable maximum length and style.

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| Text to summarize | The long text, supports variables | \`{article body}\` |
| Max length | The summary length limit | 200 |
| Style | Optional, such as "formal/colloquial/bullet points" | bullet points |
| Save to variable | Store the summary text | article summary |

---

### AI Translation (ai_translate)

Translate text accurately and idiomatically into a target language, preserving the original line breaks.

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| Text to translate | The original text, supports variables | \`{review content}\` |
| Target language | The language to translate into | English / Japanese / French |
| Save to variable | Store the translation | translation |

---

### AI Sentiment Analysis (ai_sentiment)

Determine the sentiment of text, outputting positive/negative/neutral and a sentiment score from -1 to 1.

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| Text to analyze | Review/feedback text, supports variables | \`{user review}\` |
| Save to variable | Store the analysis result | sentiment result |

**Result usage**:
\`\`\`
{sentiment result[sentiment]}   → positive / negative / neutral
{sentiment result[score]}       → 0.82 (closer to 1 is more positive)
{sentiment result[confidence]}  → 0.9
\`\`\`

---

### AI Data Normalization (ai_normalize)

Unify messily written dates, amounts, phones, numbers, names, and addresses into a standard format; especially suitable for data cleaning after collection.

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| Content to normalize | The raw value, supports variables | \`{raw date}\` |
| Normalization type | date/money/phone/number/name/address | date |
| Target format | Optional, custom target format | YYYY-MM-DD |
| Save to variable | Store the normalized result | standard date |

**Normalization examples**:

| Type | Input | Output |
|------|------|------|
| date | March 5, 2024 | 2024-03-05 |
| money | ￥1,299.00 | 1299 |
| money | 2.5万 | 25000 |
| phone | +86 138 0013 8000 | 13800138000 |

> If the type is not in the preset list, you can fill in only the "target format" to customize the normalization rule.

---

### AI Semantic Deduplication (ai_dedup_semantic)

Deduplicate a list at the **semantic level**, merging items that are "worded differently but mean the same" (ordinary deduplication can only remove identical strings).

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| List to deduplicate | A list variable, or comma/JSON text | \`{product name list}\` |
| Save to variable | Store the deduplicated list | dedup result |

**Example**:
\`\`\`
Input: ["Apple phone", "iPhone", "Huawei Mate", "Mate series"]
Output: ["Apple phone", "Huawei Mate"]  (iPhone is semantically duplicate with Apple phone and is merged)
\`\`\`

> To ensure quality, ≤300 items per batch is recommended; for more, batch them first. Deduplication keeps only the first occurring item of each duplicate group and does not rewrite the original content.

---

### AI Smart Routing (ai_route)

Based on the input content, intelligently select the most appropriate one of the branches you provide and output the branch name. Use it with condition checks to give the workflow "judgment".

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| Content to judge | The text used for the decision, supports variables | \`{customer message}\` |
| Branch definitions | At least two, "name:description" separated by semicolons | \`refund:asking for money back; inquiry:asking for info; complaint:expressing dissatisfaction\` |
| Save to variable | Store the selected branch name | route result |

**Note**: Branch descriptions often contain commas, so separate branches with a **semicolon ; or a line break**, not a comma.

**Typical combination**:
\`\`\`
Collect customer message → AI smart routing (refund/inquiry/complaint)
  ├─ Condition check: {route result} == "refund"  → Go to the refund flow
  ├─ Condition check: {route result} == "inquiry"  → Auto-reply to common questions
  └─ Condition check: {route result} == "complaint"  → Transfer to a human + create a ticket
\`\`\`

---

### AI Data Processing Pipelines in Practice

By chaining multiple AI modules, you can build "thinking" automation flows:

**E-commerce review sentiment monitoring**:
\`\`\`
Collect review list → Iterate list
  ├─ AI sentiment analysis: {item}
  ├─ AI smart routing: negative → create ticket / praise → archive
  └─ AI information extraction: extract the involved products and issue points
\`\`\`

**Cleaning messy data into the database**:
\`\`\`
Read Excel → Iterate each row
  ├─ AI data normalization: date → standard date
  ├─ AI data normalization: amount → plain number
  └─ Write to database
\`\`\`

**Multi-language customer service routing**:
\`\`\`
Receive message → AI translation (unify to Chinese) → AI text classification → AI smart routing → corresponding handling branch
\`\`\`

> These modules are also the parts the AI assistant proactively calls when "generating workflows from natural language"; combined with the workflow self-healing capability, they make building flows a smarter experience.
`
