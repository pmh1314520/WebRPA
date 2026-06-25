export const basicModulesContentEn = `# Basic Modules in depth

This chapter explains the features and configuration of all basic modules.

---

## Browser operation modules

### Open page

The most common starting module, used to open a given page.

| Parameter | Description | Example |
|------|------|------|
| URL | The URL to open | \`https://www.baidu.com\` |
| Wait condition | How to judge that the page loaded | load / domcontentloaded |
| Timeout | Max wait (ms) | 60000 |

**Wait conditions**:
- **load**: wait for all resources (images, styles) to load
- **domcontentloaded**: DOM loaded is enough — faster
- **networkidle**: when the network is idle — good for Ajax pages

**Using variables**:
\`\`\`
URL: https://www.example.com/user/{userId}
\`\`\`

---

### Click element

Simulate a mouse click on a page element.

| Parameter | Description | Options |
|------|------|--------|
| Selector | CSS selector of the target | \`#btn\`, \`.submit\` |
| Click type | How to click | single/double/right |
| Wait clickable | Whether to wait until clickable | yes/no |

**Click types**:
- **Single**: a normal left click — most common
- **Double**: two quick clicks — to open files, etc.
- **Right**: opens the context menu

**Common issues**:
- Click has no effect? Add a "Wait for element" module first
- Element covered? Use "Scroll page" then click

---

### Hover element

Move the mouse over an element and hover.

| Parameter | Description | Example |
|------|------|------|
| Selector | CSS selector of the target | \`.menu-item\` |
| Hover duration | How long to hover (ms) | 500 |

**Use cases**: trigger dropdowns, tooltips, hover animations; open submenus with a click.

**Example**: open a submenu
\`\`\`
1. Hover element: .menu-item (hover 500ms)
2. Wait for element: .submenu appears
3. Click element: .submenu-item
\`\`\`

---

### Type text

Fill content into an input.

| Parameter | Description | Example |
|------|------|------|
| Selector | CSS selector of the input | \`#username\` |
| Text | The text to type | \`{username}\` |
| Clear first | Whether to clear before typing | yes/no |

**Special characters**:
- Newline: use \`\\n\`
- Tab: use \`\\t\`

---

### Get element info

Extract data from a page element — the core scraping module.

| Parameter | Description | Example |
|------|------|------|
| Selector | CSS selector of the target | \`.product-title\` |
| Extract type | What to extract | text/attribute/HTML |
| Attribute name | When extracting an attribute | href, src |
| Save to variable | Variable for the result | productTitle |
| Stored column name | Column name for the auto-collected data table (supports variables) | Title, \`{dynamicColumn}\` |

**Stored column name supports variables**:
- Fixed column name: \`Product name\`, \`Price\`
- Dynamic column via a variable: \`{columnVar}\`, \`Column {index}\`
- Good when column names must be generated dynamically

**Extract types**:

1. **Text content**: the displayed text
   \`\`\`html
   <span class="price">$99.00</span>
   -> result: $99.00
   \`\`\`

2. **Attribute value**: an HTML attribute
   \`\`\`html
   <a href="https://example.com">Link</a>
   -> extract href: https://example.com
   \`\`\`

3. **HTML content**: the element's full HTML
   \`\`\`html
   <div class="content"><p>Paragraph</p></div>
   -> result: <p>Paragraph</p>
   \`\`\`

**Scraping tips**:
- After filling "Stored column name", data is collected into the data table automatically
- Combine with a loop to scrape many records
- Preview, edit and export in the "Data table" tab of the log panel

---

### Get child elements

Get all children under an element, returning a list.

| Parameter | Description | Example |
|------|------|------|
| Parent selector | CSS selector of the parent | \`.product-list\` |
| Child selector | CSS selector of children (relative to parent) | \`.item\` |
| Save to variable | Variable for the child list | productList |

**Use cases**: get all list items, all cards in a container, batch-process children.

**Return value**: a list where each element contains:
\`\`\`json
[
  {
    "text": "element text",
    "html": "<div>element HTML</div>",
    "selector": ".item:nth-child(1)"
  },
  {
    "text": "element text 2",
    "html": "<div>element HTML 2</div>",
    "selector": ".item:nth-child(2)"
  }
]
\`\`\`

**Example**: get a product list
\`\`\`
Get child elements:
  Parent selector: .product-container
  Child selector: .product-item
  Save to variable: productList
  
Iterate list:
  Source: productList
  
  Loop body:
    Print log: {item[text]}
\`\`\`

---

### Get sibling elements

Get an element's siblings (same-level elements), returning a list.

| Parameter | Description | Example |
|------|------|------|
| Element selector | CSS selector of the reference element | \`.current-item\` |
| Sibling selector | CSS selector of siblings (optional) | \`.item\` |
| Save to variable | Variable for the sibling list | siblings |

**Use cases**: get other options at the same level, other cells in a table row, handle peer elements.

**Return value**: a list where each element contains:
\`\`\`json
[
  {
    "text": "sibling text",
    "html": "<div>sibling HTML</div>",
    "selector": ".item:nth-child(2)"
  }
]
\`\`\`

**Notes**:
- Excludes the reference element itself
- With a sibling selector, only matching siblings are returned
- Without one, all siblings are returned

**Example**: get other cells in a table row
\`\`\`
Get sibling elements:
  Element selector: td.name-cell
  Sibling selector: td
  Save to variable: otherCells
  
Iterate list:
  Source: otherCells
  
  Loop body:
    Print log: {item[text]}
\`\`\`

---

### Close page

Close the current browser page.

---

## Wait modules

### Wait (fixed time)

Pause execution for a set time.

| Parameter | Description | Example |
|------|------|------|
| Wait time | Milliseconds to pause | 2000 (2s) |

**Use cases**: wait for animations, async requests, avoid acting too fast, give the page time to load.

**Note**: a fixed wait isn't smart — prefer "Wait for element".

---

### Wait for element

Wait until an element meets a condition — smarter than a fixed wait.

| Parameter | Description | Options |
|------|------|--------|
| Selector | CSS selector of the target | \`#loading\` |
| Wait condition | The condition to meet | appears/disappears/visible/clickable |
| Timeout | Max wait (ms) | 10000 |

**Conditions**:

| Condition | Meaning | When to use |
|------|------|----------|
| Appears | The element exists in the DOM | Wait for content to load |
| Disappears | The element is removed | Wait for a loader to vanish |
| Visible | The element is visible | Wait for a dialog to show |
| Clickable | The element can be clicked | Wait for a button to activate |

**Example**: wait for loading to finish
\`\`\`
1. Wait for element: .loading-spinner disappears
2. Then run the next steps
\`\`\`

---

## Form modules

### Dropdown select

Select an option in a \`<select>\`.

| Parameter | Description | Example |
|------|------|------|
| Selector | CSS selector of the dropdown | \`#city-select\` |
| Select by | How to locate the option | value/text/index |
| Option value | The option to select | beijing / Beijing / 0 |

**Select by**:

1. **By value**: the option's value attribute
   \`\`\`html
   <option value="beijing">Beijing</option>
   -> option value: beijing
   \`\`\`

2. **By text**: the option's displayed text
   \`\`\`html
   <option value="beijing">Beijing</option>
   -> option value: Beijing
   \`\`\`

3. **By index**: the option position (from 0)
   \`\`\`
   first option: 0
   second option: 1
   \`\`\`

---

### Set checkbox

Check or uncheck a checkbox.

| Parameter | Description |
|------|------|
| Selector | CSS selector of the checkbox |
| Action | check / uncheck |

---

### Drag element

Drag one element to another position.

| Parameter | Description |
|------|------|
| Source selector | The element to drag |
| Target selector | The element to drop onto |
| Target coordinate | Or specify target coordinates |

---

### Upload file

Choose a file to upload; two trigger methods are supported.

| Parameter | Description | Example |
|------|------|------|
| Selector | The file input or upload button | \`input[type="file"]\` or \`#upload-btn\` |
| File path | The file to upload | \`C:/files/image.jpg\` |

**Supported element types**:
- **input[type="file"]**: a standard file input — set the file directly
- **Button**: a button that opens a file picker on click — the picker is watched automatically

**Path selection**: click the button to pick a file via Explorer

**Note**: folder-upload controls (webkitdirectory) are not supported

---

## Scroll modules

### Scroll page

Control page scrolling.

| Parameter | Description | Options |
|------|------|--------|
| Direction | Scroll direction | up/down/left/right |
| Distance | Pixels to scroll | 500 |
| Method | How to scroll | auto/mouse wheel/script |

**Methods**:
- **Auto (recommended)**: prefer the mouse wheel, fall back to script
- **Mouse wheel**: simulate real wheel events — good for virtual-scroll pages like Douyin
- **Script**: traditional JavaScript scroll — good for normal pages

**Note**: for virtual-scroll pages (Douyin, Xiaohongshu), choose "Mouse wheel".

**Lazy-loading scraping**:
\`\`\`
Loop 10 times
  ├─ Scroll page (down)
  ├─ Wait 1000 ms
  └─ Get newly loaded data
\`\`\`

---

### Real mouse scroll

Use system-level mouse-wheel simulation — fully mimics a real wheel.

| Parameter | Description | Example |
|------|------|------|
| Direction | Scroll direction | up/down |
| Scroll count | Number of wheel scrolls | 3 |
| Amount per scroll | Magnitude each time | 120 (standard wheel unit) |
| Interval | Interval between scrolls (ms) | 100 |

**Use cases**: when a page has anti-scroll detection; when normal scrolling fails; when you need the most realistic scroll.

**Important**:
- The mouse must be over the scrollable page area
- This is a system-level action that really moves the wheel
- Works on any page and can't be detected or blocked

**Vs normal scroll**:
| Feature | Scroll page | Real mouse scroll |
|------|----------|--------------|
| Method | Browser API | System mouse event |
| Anti-detection | May be detected | Undetectable |
| Mouse position | Not required | Must be over the area |
| Scope | Normal pages | All pages |

---

## Screenshot modules

### Page screenshot

Capture the current browser page.

| Parameter | Description |
|------|------|
| Screenshot type | Full page / viewport / specific element |
| Save path | Where to save (optional) |
| Save to variable | Save the image path to a variable |

**Types**:
- **Full page**: the whole page (including scroll area)
- **Viewport**: only the visible part
- **Specific element**: a particular element

To capture the whole screen (including content outside the browser), use the "Screen capture" module in the System category.

---

### Save image

Save an image element from the page.

| Parameter | Description |
|------|------|
| Selector | Selector of the image element |
| Save path | Where to save |
| Save to variable | Save the image to a variable |

**Use cases**: save product images, capture captcha images for recognition.

---

## Data processing modules

### Set variable

Create or modify a variable's value.

| Parameter | Description |
|------|------|
| Variable name | The variable's name |
| Variable value | The value to set |
| Variable type | string/number/boolean/list/dict |

---

### JSON parse

Extract data from a JSON string.

| Parameter | Description | Example |
|------|------|------|
| JSON data | A JSON string or variable | \`{responseData}\` |
| JSONPath | The extraction path | \`$.data.name\` |
| Save to variable | Variable for the result | userName |

---

### Random number

Generate a random number.

| Parameter | Description |
|------|------|
| Min | Minimum |
| Max | Maximum |
| Save to variable | Variable for the result |

---

### Get time

Get the current date and time.

| Parameter | Description | Example |
|------|------|------|
| Time format | The output format | YYYY-MM-DD HH:mm:ss |
| Save to variable | Variable for the result | currentTime |

---

### Read Excel

Read data from an Excel file.

| Parameter | Description |
|------|------|
| File | Choose an uploaded Excel asset |
| Worksheet | The sheet name to read |
| Save to variable | Variable for the data |

**Data format**: the data is a list where each row is a dict.

---

## Helper modules

### Print log

Output debug info to the log panel.

| Parameter | Description |
|------|------|
| Log content | Text to output (supports variables) |
| Log level | info/success/warning/error |

**Debug example**:
\`\`\`
Processing record {loopIndex}
Product name: {productName}
Product price: {productPrice}
\`\`\`

---

### Play beep

Play a system beep as a reminder.

| Parameter | Description |
|------|------|
| Beep count | How many beeps |
| Interval | Interval between beeps (ms) |

**Use cases**: task-done reminder, prompt for manual intervention, warn on error.

---

### Play music

Play an audio file from a URL.

| Parameter | Description | Example |
|------|------|------|
| Audio URL | The audio's web address | \`https://example.com/music.mp3\` |
| Wait for finish | Whether to wait until it ends | yes/no |

**Formats**: MP3, WAV, OGG, FLAC, M4A, AAC, WebM, etc.

**Use cases**: a chime on task completion, a notification sound on important events, audio reminders for scheduled tasks.

**Notes**:
- The URL may omit \`https://\`; it's auto-completed
- Choosing "No (background)" plays in the background while the workflow continues
- Stopping the workflow stops any playing music

---

### User input

Pop up a dialog for the user to enter content.

| Parameter | Description |
|------|------|
| Prompt text | The hint shown to the user |
| Default value | The input's default content |
| Save to variable | Variable for the input |

**Use cases**: enter a captcha, a one-time password, confirm an action.

---

## Script modules

### JS script

Run JavaScript in the browser environment — for data processing, logic, etc.

| Parameter | Description |
|------|------|
| Script code | The JavaScript to run |

**Environment**:
- Runs in the browser front-end
- Can use standard JS built-ins (Array, Object, Math, Date, etc.)
- Can read/write workflow variables via the \`vars\` object

**Variable access**:
\`\`\`javascript
// Read variables
const userName = vars.username;
const count = vars.counter;

// Modify variables (only existing ones)
vars.counter = count + 1;
vars.result = "done";

// Note: you cannot create new variables, only modify existing ones
\`\`\`

**Use cases**: data transforms, math, string handling, logic, array/object operations.

**Example 1: data processing**
\`\`\`javascript
// Process a price string
const priceStr = vars.price; // "$99.00"
const price = parseFloat(priceStr.replace(/[$,]/g, ''));
vars.priceValue = price;
\`\`\`

**Example 2: array operations**
\`\`\`javascript
// Filter data
const list = vars.productList;
const filtered = list.filter(item => item.price > 100);
vars.filtered = filtered;
\`\`\`

**AI coding assistant**:
- Click "AI coding assistant" at the top-right of the code editor
- Describe your need; the AI generates code
- The AI recognizes the workflow's variables
- The generated code can be inserted directly

---

### Python script

Run Python code — more powerful.

| Parameter | Description |
|------|------|
| Script code | The Python to run |

**Environment**:
- Runs in Python 3.13
- Common libraries available (requests, pandas, numpy, pillow, etc.)
- Read/write workflow variables via the \`vars\` dict

**Variable access**:
\`\`\`python
# Read variables
user_name = vars['username']
count = vars['counter']

# Modify variables (only existing ones)
vars['counter'] = count + 1
vars['result'] = "done"

# Note: you cannot create new variables, only modify existing ones
\`\`\`

**Available libraries**: requests, pandas, numpy, pillow, openpyxl, json, re, datetime, pathlib, base64.

**Use cases**: complex data processing, file operations, network requests, image processing, text analysis, system operations.

**Example 1: files**
\`\`\`python
from pathlib import Path

file_path = vars['filePath']
content = Path(file_path).read_text(encoding='utf-8')
vars['fileContent'] = content
\`\`\`

**Example 2: data processing**
\`\`\`python
import pandas as pd

data = vars['excelData']
df = pd.DataFrame(data)
result = df[df['price'] > 100]
vars['filtered'] = result.to_dict('records')
\`\`\`

**AI coding assistant**: same as above — describe your need and the AI generates Python code recognizing your variables.

---

### JS injection

Inject JavaScript into the current page to operate the page DOM.

| Parameter | Description |
|------|------|
| Script code | The JavaScript to inject |
| Save return to variable | Variable for the script's return value |

**Environment**:
- Runs in the target page's browser context
- Can access the page's document, window, etc.
- Can operate the DOM and call the page's JS functions
- Can access localStorage, sessionStorage, etc.

**Available APIs**: document, window, console, localStorage/sessionStorage, fetch, and all standard browser APIs.

**Use cases**: modify styles, extract data, simulate actions, listen to events, auto-fill forms, beautify pages.

**Example 1: modify styles**
\`\`\`javascript
// Hide ads
document.querySelectorAll('.ad-banner').forEach(el => {
  el.style.display = 'none';
});
\`\`\`

**Example 2: extract data**
\`\`\`javascript
// Extract all links
const links = Array.from(document.querySelectorAll('a')).map(a => ({
  text: a.textContent,
  href: a.href
}));
return links; // the return value is saved to a variable
\`\`\`

**Example 3: auto-fill a form**
\`\`\`javascript
document.querySelector('#username').value = 'user';
document.querySelector('#password').value = 'pass';
document.querySelector('#submit').click();
\`\`\`

**Notes**:
- The script runs in the page context and can't access workflow variables
- You must open a page before injecting
- Some sites have security restrictions
- The return value is auto-serialized to JSON`
