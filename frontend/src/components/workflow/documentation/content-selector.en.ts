export const selectorGuideContentEn = `# 🎯 Complete Selector Guide (CSS + XPath)

Selectors are a core skill for web automation. This chapter covers both **CSS selectors** and **XPath selectors** from basics to mastery, including their syntax, pros and cons, and practical tips.

---

## 📌 What is a selector?

A selector is the "address" used to locate a web element. Just as a courier needs an address to deliver, automation needs a selector to find the target element.

**Example**:
\`\`\`html
<button id="submit-btn" class="btn primary">Submit</button>
\`\`\`

You can locate this button with any of these:
- \`#submit-btn\` - by ID
- \`.btn\` - by class
- \`button\` - by tag name

---

## 🎓 Basic selectors

### 1. ID selector (#)

Locate by the element's \`id\` attribute — the **most stable** way.

**Syntax**: \`#idName\`

**Example**:
\`\`\`html
<input id="username" type="text">
<button id="login-btn">Login</button>
\`\`\`

Selectors:
- \`#username\` - the username input
- \`#login-btn\` - the login button

**Traits**:
- ✅ Most stable; IDs rarely change
- ✅ Unique; an ID doesn't repeat on a page
- ❌ Not every element has an ID

---

### 2. Class selector (.)

Locate by the element's \`class\` attribute.

**Syntax**: \`.className\`

**Example**:
\`\`\`html
<div class="product-item">Product 1</div>
<div class="product-item">Product 2</div>
<button class="btn btn-primary">Button</button>
\`\`\`

Selectors:
- \`.product-item\` - all product items (multiple)
- \`.btn\` - all buttons
- \`.btn-primary\` - the primary button

**Multiple classes**:
\`\`\`
.btn.btn-primary  → elements with both btn and btn-primary
\`\`\`

---

### 3. Tag selector

Locate by HTML tag name.

**Syntax**: \`tagName\`

**Example**:
- \`input\` - all inputs
- \`button\` - all buttons
- \`a\` - all links
- \`img\` - all images
- \`div\` - all divs

**Traits**:
- ✅ Simple and direct
- ❌ Usually matches many elements
- ❌ Not precise enough

---

### 4. Attribute selector ([])

Locate by attributes — very powerful.

**Syntax**:

| Syntax | Meaning |
|------|------|
| \`[attr]\` | has the attribute |
| \`[attr="value"]\` | attribute equals a value |
| \`[attr^="value"]\` | attribute starts with a value |
| \`[attr$="value"]\` | attribute ends with a value |
| \`[attr*="value"]\` | attribute contains a value |

**Example**:
\`\`\`html
<input type="text" name="username" placeholder="Enter username">
<input type="password" name="password">
<a href="https://example.com" target="_blank">Link</a>
<div data-id="123" data-type="product">Product</div>
\`\`\`

Selectors:
- \`[type="text"]\` - text input
- \`[type="password"]\` - password input
- \`[name="username"]\` - element with name=username
- \`[href^="https"]\` - links starting with https
- \`[href$=".pdf"]\` - links ending with .pdf
- \`[data-id="123"]\` - element with data-id=123
- \`[data-type*="prod"]\` - element whose data-type contains prod

---

## 🔗 Combinators

### 1. Descendant (space)

Select elements inside another element.

**Syntax**: \`ancestor descendant\`

**Example**:
\`\`\`html
<div class="container">
  <ul class="list">
    <li>Item 1</li>
    <li>Item 2</li>
  </ul>
</div>
\`\`\`

- \`.container li\` - all li inside container
- \`.list li\` - all li inside list

---

### 2. Child (>)

Select direct children only.

**Syntax**: \`parent > child\`

**Example**:
\`\`\`html
<ul class="menu">
  <li>Top-level menu
    <ul>
      <li>Submenu</li>
    </ul>
  </li>
</ul>
\`\`\`

- \`.menu li\` - all li (including submenu)
- \`.menu > li\` - top-level li only

---

### 3. Adjacent sibling (+)

Select the element immediately after another.

**Syntax**: \`element1 + element2\`

**Example**:
\`\`\`html
<h2>Title</h2>
<p>First paragraph</p>
<p>Second paragraph</p>
\`\`\`

- \`h2 + p\` - the p right after h2 (first paragraph)

---

### 4. General sibling (~)

Select all siblings after an element.

**Syntax**: \`element1 ~ element2\`

- \`h2 ~ p\` - all p after h2

---

## 🎯 Pseudo-classes

### Positional

| Selector | Meaning |
|--------|------|
| \`:first-child\` | first child |
| \`:last-child\` | last child |
| \`:nth-child(n)\` | the nth child |
| \`:nth-child(odd)\` | odd-positioned children |
| \`:nth-child(even)\` | even-positioned children |
| \`:nth-last-child(n)\` | the nth child from the end |

**Example**:
\`\`\`html
<ul>
  <li>Item 1</li>
  <li>Item 2</li>
  <li>Item 3</li>
  <li>Item 4</li>
</ul>
\`\`\`

- \`li:first-child\` - Item 1
- \`li:last-child\` - Item 4
- \`li:nth-child(2)\` - Item 2
- \`li:nth-child(odd)\` - Item 1, Item 3

### By type

| Selector | Meaning |
|--------|------|
| \`:first-of-type\` | first of its type |
| \`:last-of-type\` | last of its type |
| \`:nth-of-type(n)\` | the nth of its type |

### State

| Selector | Meaning |
|--------|------|
| \`:hover\` | mouse hover |
| \`:focus\` | focused |
| \`:checked\` | checked (checkbox/radio) |
| \`:disabled\` | disabled |
| \`:enabled\` | enabled |

### Negation

\`:not(selector)\` - exclude certain elements

**Example**:
- \`input:not([type="hidden"])\` - non-hidden inputs
- \`li:not(:first-child)\` - all li except the first

---

## 🛠️ Practical tips

### 1. Visually pick an element

**Ctrl+click** the selector button to click an element directly on the page; the selector is generated automatically.

### 2. Debug selectors in the browser

1. Press **F12** to open dev tools
2. Switch to the **Console** tab
3. Type test code:

\`\`\`javascript
// Test whether the selector is correct
document.querySelector('your selector')

// See how many elements match
document.querySelectorAll('your selector').length
\`\`\`

### 3. Search in the Elements panel

1. Press **F12** to open dev tools
2. Switch to the **Elements** tab
3. Press **Ctrl+F** to search
4. Type the selector; matching elements are highlighted

---

## 📋 Selectors for common scenarios

### Form elements

\`\`\`
Username input: #username or input[name="username"]
Password input: #password or input[type="password"]
Login button: #login-btn or button[type="submit"]
Search box: #search or input[placeholder*="search"]
\`\`\`

### List elements

\`\`\`
All items: .list-item or ul > li
First item: .list-item:first-child
Last item: .list-item:last-child
Third item: .list-item:nth-child(3)
\`\`\`

### Table elements

\`\`\`
Table: table or .data-table
Header: thead th
Rows: tbody tr
Row 2: tbody tr:nth-child(2)
Column 3: tbody td:nth-child(3)
\`\`\`

### Navigation menu

\`\`\`
Nav bar: nav or .navbar
Menu item: .nav-item or nav a
Active item: .nav-item.active
\`\`\`

### Dialog / modal

\`\`\`
Modal container: .modal or [role="dialog"]
Close button: .modal .close or .modal-close
Confirm button: .modal .btn-confirm
\`\`\`

---

## 🧭 XPath Selectors (advanced locating)

On complex pages CSS alone is often inaccurate or unstable. **XPath** is usually more precise in these cases. WebRPA fully supports manually entering XPath: every "element selector" input can switch to XPath mode with one click.

### What is XPath?

XPath (XML Path Language) is a language that locates nodes in an HTML/XML document tree using "path expressions". It is more powerful than CSS: besides matching by tag and attribute, it can **locate by text content**, **walk up to parents/ancestors**, and **filter by position/logical conditions**.

### How to use XPath in WebRPA

1. At the top-right of any "element selector" input there is a **CSS / XPath** toggle button
2. Click it to switch between **CSS mode** and **XPath mode** (it works even when the input is empty)
3. After switching to XPath mode, just paste or type the XPath expression, e.g. \`//button[text()="Submit"]\`
4. The value is automatically prefixed with \`xpath=\` under the hood (you don't type the prefix), and the engine locates via the XPath engine

> Tip: you can also paste an expression starting with \`/\` or \`//\` directly in CSS mode — WebRPA detects it as XPath and adds the prefix, so it won't be mis-parsed as CSS.

### XPath basic syntax

| Expression | Meaning | Example |
|------------|---------|---------|
| \`/\` | Select from root (absolute path) | \`/html/body/div\` |
| \`//\` | Select from anywhere (relative, most used) | \`//div\` |
| \`.\` | Current node | \`.//span\` |
| \`..\` | Parent node | \`//input/..\` |
| \`@\` | Select attribute | \`//a[@href]\` |
| \`*\` | Match any element | \`//div/*\` |

### Locate by attribute

\`\`\`
//input[@id="username"]          → input whose id is username
//button[@class="btn primary"]   → class exactly equals "btn primary"
//a[@href="https://x.com"]       → specific link
//div[@data-id="123"]            → custom attribute
\`\`\`

### Locate by text (XPath's unique strength)

\`\`\`
//button[text()="Submit"]              → button whose text is exactly "Submit"
//button[contains(text(),"Submit")]    → text contains "Submit"
//a[contains(.,"Next")]                → link whose descendant text contains "Next"
//span[normalize-space()="OK"]         → equals "OK" after trimming whitespace
\`\`\`

### Fuzzy matching and functions

\`\`\`
//input[contains(@class,"form")]        → class contains form
//a[starts-with(@href,"https")]         → href starts with https
//img[contains(@src,".png")]            → src contains .png
//div[@class="a" and @data-type="b"]    → both conditions
//div[@class="a" or @class="b"]         → either condition
//input[not(@disabled)]                 → no disabled attribute
\`\`\`

### Locate by position

\`\`\`
//ul/li[1]              → first li (XPath index starts at 1)
//ul/li[last()]         → last li
//ul/li[position()<=3]  → first three li
//table//tr[2]/td[3]    → row 2, column 3 cell
\`\`\`

### Axis locating (traverse tree relationships, impossible in CSS)

\`\`\`
//label[text()="Account"]/following-sibling::input   → input after the "Account" label
//input[@id="x"]/ancestor::form                      → the form containing this input
//td[text()="Name"]/parent::tr                        → the whole row containing the "Name" cell
//h2/preceding-sibling::p                             → all p before the h2
\`\`\`

### CSS vs XPath cheat sheet

| Goal | CSS | XPath |
|------|-----|-------|
| By ID | \`#username\` | \`//*[@id="username"]\` |
| By class | \`.btn\` | \`//*[contains(@class,"btn")]\` |
| By tag | \`button\` | \`//button\` |
| By attribute | \`[name="user"]\` | \`//*[@name="user"]\` |
| nth element | \`li:nth-child(2)\` | \`//li[2]\` |
| Descendant | \`.box .item\` | \`//*[contains(@class,"box")]//*[contains(@class,"item")]\` |
| By text | ❌ not supported | \`//button[text()="Submit"]\` |
| Find parent | ❌ not supported | \`//span/..\` |

### Pros and cons of XPath

**✅ Pros**

- **Locate by text content**: great when there is no stable id/class — match by button text or label text
- **Walk up / sideways**: supports parent, ancestor, sibling axes — "find an anchor element, then locate a target near it"
- **Powerful filtering**: and/or/not, contains, starts-with, position functions and more
- **More precise on complex structures**: often more reliable than CSS on deeply nested pages with dynamic classes

**❌ Cons**

- **More complex syntax**: expressions are longer than CSS, with a slightly higher learning curve
- **Absolute paths are fragile**: something like \`/html/body/div[3]/div[2]/...\` breaks once the structure changes slightly (avoid it — prefer \`//\` relative paths with attributes/text)
- **Slightly less readable**: long XPath is less intuitive than concise CSS
- **Slightly slower**: extremely complex XPath can be a bit slower than equivalent CSS on huge pages (unnoticeable in normal cases)

### When to use XPath?

- Element **has a stable id/class** → prefer **CSS** (more concise)
- Need to **locate by text** (e.g. "click the button whose text is 'OK'") → use **XPath**
- Need to **find a parent/sibling from an element** (e.g. "the value to the right of the 'Price' label") → use **XPath**
- Page classes are **random/dynamic** and CSS is unstable → use **XPath with attribute-contains or text**
- Combine multiple filter conditions → use **XPath** and/or/not

> Best practice: use CSS when a stable id is available; when locating fails or is unstable, switch to XPath using "attribute-contains + text + relative axes" and avoid absolute paths. You can toggle between the two modes anytime and verify quickly with the "Test locate" button on the right.

---

## 🔍 Test locate (verify a selector before running)

After entering a selector, you can verify whether it matches on the current page without running the whole workflow.

\`\`\`
1. Open the automation browser and stay on the target page
2. In the node config panel, click the "Test locate" button (magnifier icon) next to the selector input
3. The result shows in the log:
   - Matched N elements, highlighted with a red box on the page (~2.5s)
   - On no match, a hint is shown and the saved "self-heal candidate selector" from picking is tried automatically
\`\`\`

**Benefits**:

- Catch wrong selectors / multiple matches early, reducing failures
- Works with "selector self-healing": when the main selector fails, candidate anchors relocate the element, and testing verifies that too

> Tip: next to the selector input there's also "Visually pick element" (crosshair icon) to click on the page and generate a selector.

---

## ⚠️ Common issues

### 1. Selector finds no element

**Possible causes**:
- The element is in an iframe
- The element loads dynamically
- The selector is wrong

**Fixes**:
- Check whether you need to switch into the iframe
- Add a wait-for-element module
- Confirm the selector with browser dev tools

### 2. Selector matches multiple elements

**Fixes**:
- Add more qualifying conditions
- Use :nth-child to pick a position
- Use a more specific parent

### 3. Selector is unstable

**Cause**: using dynamically generated class names or IDs

**Fixes**:
- Use an attribute selector \`[data-xxx]\`
- Locate by text content
- Locate by relative position

---

## 💡 Selector priority advice

1. **Prefer ID selectors**: \`#login-btn\`
2. **Then unique class names**: \`.submit-button\`
3. **Then attribute selectors**: \`[data-action="submit"]\`
4. **Lastly combinators**: \`.form .btn:last-child\`

**Principles**:
- Simpler is better
- More stable is better
- Avoid long selector chains`
