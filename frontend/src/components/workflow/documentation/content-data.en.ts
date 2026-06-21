export const dataProcessingContentEn = `# 📊 Data Processing Guide

This chapter covers the variable system and data-processing features — the foundation for complex automation.

---

## 📦 Variable basics

### What is a variable?

A variable is like a labeled box that can hold data. You can:
- Name the box (variable name)
- Put something in it (assign)
- Take something out (reference)
- Replace its contents (modify)

### Variable lifecycle

\`\`\`mermaid
%%{init: {'theme':'default', 'themeVariables': { 'fontSize':'18px'}}}%%
graph LR
    A["<b>Create variable</b>"] --> B["<b>Assign/modify</b>"]
    B --> C["<b>Reference & use</b>"]
    C --> D{"<b>Need to modify?</b>"}
    D -->|Yes| B
    D -->|No| E["<b>Workflow ends</b>"]
    E --> F["<b>Variable destroyed</b>"]
    
    style A fill:#e3f2fd,stroke:#1976d2,stroke-width:3px,color:#000
    style B fill:#fff3e0,stroke:#f57c00,stroke-width:3px,color:#000
    style C fill:#e8f5e9,stroke:#388e3c,stroke-width:3px,color:#000
    style D fill:#fff9c4,stroke:#f57f17,stroke-width:3px,color:#000
    style E fill:#f3e5f5,stroke:#7b1fa2,stroke-width:3px,color:#000
    style F fill:#ffebee,stroke:#c62828,stroke-width:3px,color:#000
\`\`\`

### Variable types

WebRPA supports 5 types:

| Type | Description | Example | Use |
|------|------|------|------|
| String | Text data | \`"Hello"\`, \`"username"\` | Store text, URLs, etc. |
| Number | Integer or decimal | \`42\`, \`3.14\`, \`-10\` | Counting, math, indexing |
| Boolean | True or false | \`true\`, \`false\` | Conditions, toggles |
| List | Ordered collection | \`[1, 2, 3]\`, \`["a", "b"]\` | Store multiple values |
| Dict | Key-value collection | \`{"name": "Tom", "age": 18}\` | Store structured data |

### Ways to create variables

#### Option 1: the "Set variable" module

1. Drag in a **Set variable** module
2. Enter the name and value
3. Choose the type

#### Option 2: quick-create in the log panel

1. Open the **Global variables** tab in the bottom log panel
2. Click **+ Add variable**
3. Enter a name, choose a type, fill the value

#### Option 3: auto-created by modules

Some modules create variables automatically:
- **Get element info**: saves extracted data to a variable
- **API request**: saves the response to a variable
- **AI brain**: saves the AI reply to a variable
- **Loop/iterate**: auto-creates loop index, current element, etc. (e.g. \`item\`, \`index\`, \`loop_index\`)

### Variable hints

In any input that supports variables:
- Typing \`{\` pops up a variable list
- Fuzzy search finds variables fast
- Shows the variable's source and type
- **Loop variables** (\`item\`, \`index\`, \`loop_index\`) are also recognized and shown

---

## 🔗 Reference syntax in detail

### Basic reference

Use \`{name}\` in any input:

\`\`\`
{username}      → the value of the "username" variable
\`\`\`

### Mixing in text

\`\`\`
Hello, {username}! Welcome to {siteName}.
Your order is {orderId}, amount: {amount}.
\`\`\`

### List index access

List indexes start at **0**:

\`\`\`
{list[0]}    → 1st element
{list[1]}    → 2nd element
{list[2]}    → 3rd element
...
\`\`\`

**Negative index** (from the end):

\`\`\`
{list[-1]}   → last element
{list[-2]}   → 2nd from last
{list[-3]}   → 3rd from last
...
\`\`\`

**Example**:

Assume \`fruits\` = \`["Apple", "Banana", "Orange", "Grape"]\`

| Expression | Result |
|--------|------|
| \`{fruits[0]}\` | Apple |
| \`{fruits[1]}\` | Banana |
| \`{fruits[-1]}\` | Grape |
| \`{fruits[-2]}\` | Orange |

### Dict key access

\`\`\`
{dict[key]}       → value of the given key
{dict["key"]}     → quoted key (use when the key has special chars)
{dict['key']}     → single quotes also work
\`\`\`

**Example**:

Assume \`user\` = \`{"name": "Tom", "age": 18, "city": "Beijing"}\`

| Expression | Result |
|--------|------|
| \`{user[name]}\` | Tom |
| \`{user[age]}\` | 18 |
| \`{user[city]}\` | Beijing |

### Nested access

Chain \`[]\` to access nested structures:

**Dict inside a list**:

Assume \`products\` = \`[{"name": "Phone", "price": 2999}, {"name": "Laptop", "price": 5999}]\`

| Expression | Result |
|--------|------|
| \`{products[0]}\` | {"name": "Phone", "price": 2999} |
| \`{products[0][name]}\` | Phone |
| \`{products[0][price]}\` | 2999 |
| \`{products[1][name]}\` | Laptop |
| \`{products[-1][price]}\` | 5999 |

**List inside a dict**:

Assume \`user\` = \`{"name": "Tom", "hobbies": ["reading", "gaming", "sports"]}\`

| Expression | Result |
|--------|------|
| \`{user[hobbies]}\` | ["reading", "gaming", "sports"] |
| \`{user[hobbies][0]}\` | reading |
| \`{user[hobbies][-1]}\` | sports |

**Multi-level**:

Assume \`data\` = \`{"users": [{"name": "Tom", "scores": [90, 85, 92]}]}\`

\`\`\`
{data[users][0][name]}        → Tom
{data[users][0][scores][0]}   → 90
{data[users][0][scores][-1]}  → 92
\`\`\`

---

## 📋 List operations in detail

### Create a list

Use **Set variable** with type "List":

\`\`\`json
[1, 2, 3]
["Apple", "Banana", "Orange"]
[{"name": "Product 1"}, {"name": "Product 2"}]
[]  // empty list
\`\`\`

### List operation module

| Operation | Description | Parameter |
|------|------|------|
| Append | Add at the end | value to add |
| Insert | Insert at a position | index, value |
| Remove | Remove the first match | value to remove |
| Pop | Remove at a position and return | index (optional, default -1) |
| Clear | Remove all | none |
| Get length | Number of elements | save to variable |
| Reverse | Reverse the order | none |
| Sort | Ascending or descending | sort order |
| Dedup | Remove duplicates | none |
| Merge | Merge another list in | list to merge |

### Examples

**Append**:
\`\`\`
List: [1, 2, 3]
Append: 4
Result: [1, 2, 3, 4]
\`\`\`

**Insert**:
\`\`\`
List: [1, 2, 3]
Insert at index 1: 99
Result: [1, 99, 2, 3]
\`\`\`

**Pop**:
\`\`\`
List: [1, 2, 3]
Pop index 0
Result: [2, 3], returns 1
\`\`\`

**Sort**:
\`\`\`
List: [3, 1, 4, 1, 5, 9, 2, 6]
Ascending
Result: [1, 1, 2, 3, 4, 5, 6, 9]
\`\`\`

---

## 📖 Dictionary operations in detail

### Create a dict

Use **Set variable** with type "Dict":

\`\`\`json
{"name": "Tom", "age": 18}
{"title": "Article title", "content": "Article body", "tags": ["tech", "tutorial"]}
{}  // empty dict
\`\`\`

### Dict operation module

| Operation | Description | Parameter |
|------|------|------|
| Set key-value | Add or modify a pair | key, value |
| Remove key | Delete a key | key |
| Get value | Get a value by key | key, save to variable |
| Get all keys | Return the list of keys | save to variable |
| Get all values | Return the list of values | save to variable |
| Has key | Check whether a key exists | key, save to variable |

### Examples

**Set key-value**:
\`\`\`
Dict: {"name": "Tom"}
Set key "age" value 18
Result: {"name": "Tom", "age": 18}
\`\`\`

**Get all keys**:
\`\`\`
Dict: {"name": "Tom", "age": 18, "city": "Beijing"}
Get all keys
Result: ["name", "age", "city"]
\`\`\`

---

## 📊 Data table operations

The data table is the core of scraping: live preview, edit and export.

### Auto-collect data

When using **Get element info**, fill the "Stored column name" field and the data is added to the table automatically:

\`\`\`
Get element info
  Selector: .product-title
  Stored column name: Product name

Get element info
  Selector: .product-price
  Stored column name: Price
\`\`\`

### Data-table modules

WebRPA provides a set of data-table modules:

| Module | Description | Key parameters |
|------|------|----------|
| 📝 Add row | Add a row | row data as JSON |
| 📊 Add column | Add a new column | column name, default value |
| ✏️ Set cell | Modify a cell | row index, column, value |
| 📖 Get cell | Read a cell | row index, column, variable |
| 🗑️ Delete row | Delete a row | row index (negatives ok) |
| 🧹 Clear table | Clear all data | none |
| 💾 Export table | Export to a file | format, save path |

### Add row

Add a row as JSON:

\`\`\`json
{"Product name": "iPhone 15", "Price": 5999, "Stock": 100}
\`\`\`

### Set cell

Modify a cell:

| Parameter | Description | Example |
|------|------|------|
| Row index | Row number (from 0, negatives ok) | 0 (first), -1 (last) |
| Column | The column to modify | Price |
| Cell value | The new value | 4999 |

### Get cell

Read a cell into a variable:

\`\`\`
Row index: 0
Column: Product name
Save to variable: currentProduct
\`\`\`

### Export table

Export the data table to a file:

| Parameter | Description |
|------|------|
| Format | Excel (.xlsx) or CSV (.csv) |
| Save path | Output directory |
| File name pattern | Supports the {timestamp} placeholder |
| Save path to variable | Variable for the exported file path |

💡 **Tip**: click the 📁 button to the right of the save-path input to pick a folder via Windows Explorer.

### View and edit data

1. Open the bottom log panel
2. Switch to the **Data table** tab
3. See the data preview in table form
4. Click a cell to edit directly
5. Supports add row/column and delete

### Export to Excel

1. Click **Download CSV** in the data-table tab
2. Or use the **Export table** module to export automatically

---

## 🔢 Math operations

### Set variable (expressions)

You can use math expressions in Set variable:

\`\`\`
{count} + 1
{price} * {qty}
{total} - {discount}
{total} / 10
\`\`\`

### Supported operators

| Operator | Meaning | Example |
|--------|------|------|
| + | Add | \`{a} + {b}\` |
| - | Subtract | \`{a} - {b}\` |
| * | Multiply | \`{a} * {b}\` |
| / | Divide | \`{a} / {b}\` |
| % | Modulo | \`{a} % {b}\` |

---

## 📝 String processing

WebRPA provides rich string modules to handle text flexibly.

### String modules at a glance

| Module | Description | Main use |
|------|------|----------|
| ➕ Concatenate | Join two strings | Combine text |
| 🔍 Regex extract | Extract with a regex | Pull formatted data from text |
| 🔄 Replace | Replace text | Edit/clean text |
| ✂️ Split | Split by delimiter | Turn text into a list |
| 🔗 Join | Join a list into text | Concatenate list elements |
| 🧹 Trim | Clean whitespace | Trim leading/trailing spaces |
| 🔠 Case | Change letter case | Format text |
| 📏 Slice | Take part of the text | Get a substring |

---

### ➕ Concatenate

Join two strings into one — the simplest way to combine text.

| Parameter | Description | Example |
|------|------|------|
| String 1 | First string | \`Hello, \` |
| String 2 | Second string | \`{username}\` |
| Save to variable | Result variable | greeting |

**Example**:
\`\`\`
String 1: Order: 
String 2: {orderId}
Result: Order: 12345
\`\`\`

**Concatenate vs Join**:
- **Concatenate**: joins two strings directly
- **Join**: joins multiple list elements with a delimiter

---

### 🔍 Regex extract

Extract data from text with a regular expression — the most powerful text tool.

| Parameter | Description | Example |
|------|------|------|
| Input text | The source text | \`{pageContent}\` |
| Regex | The match pattern | \`\\d+\`, \`[a-z]+\` |
| Extract mode | First / all / capture group | |
| Ignore case | Whether case-insensitive | checked = insensitive |

**Extract modes**:
- **First match**: returns the first match only
- **All matches**: returns a list of all matches
- **Capture group**: returns the content captured by parentheses ()

**Common regexes**:

| Pattern | Matches | Example |
|--------|----------|------|
| \`\\d+\` | Digits | 123, 456 |
| \`[a-zA-Z]+\` | Letters | hello, World |
| \`[\\u4e00-\\u9fa5]+\` | Chinese | 你好, 世界 |
| \`\\d{11}\` | 11 digits (phone) | 13812345678 |
| \`[\\w.-]+@[\\w.-]+\` | Email | test@example.com |
| \`https?://[^\\s]+\` | URL | https://example.com |

**Example**: extract a price
\`\`\`
Input: Price: $299.00, was: $399.00
Regex: \\$(\\d+\\.?\\d*)
Mode: all matches
Result: ["299.00", "399.00"]
\`\`\`

---

### 🔄 Replace

Replace text content; supports plain-text and regex modes.

| Parameter | Description |
|------|------|
| Input text | The text to process |
| Replace mode | Plain text / regex |
| Find | Text or regex to find |
| Replace with | Replacement content |
| Replace all | Whether to replace all matches |

**Example 1**: plain replace
\`\`\`
Input: Hello World
Find: World
Replace with: RPA
Result: Hello RPA
\`\`\`

**Example 2**: regex replace (remove all digits)
\`\`\`
Input: orderABC123DEF456
Regex: \\d+
Replace with: (empty)
Result: orderABCDEF
\`\`\`

---

### ✂️ Split

Split text into a list by a delimiter.

| Parameter | Description | Example |
|------|------|------|
| Input text | The text to split | \`apple,banana,orange\` |
| Delimiter | The split basis | \`,\`, \`|\`, \`\\n\` |
| Max splits | Max number of splits | blank = unlimited |

**Common delimiters**:

| Delimiter | Description | Example |
|--------|------|----------|
| \`,\` | Comma | \`a,b,c\` → \`["a","b","c"]\` |
| \`|\` | Pipe | \`a|b|c\` → \`["a","b","c"]\` |
| \`\\n\` | Newline | multi-line → one element per line |
| (space) | Space | \`a b c\` → \`["a","b","c"]\` |

**Example**: split tags
\`\`\`
Input: tech,tutorial,Python,automation
Delimiter: ,
Result: ["tech", "tutorial", "Python", "automation"]
\`\`\`

---

### 🔗 Join

Join list elements into a string.

| Parameter | Description |
|------|------|
| List variable | The list to join |
| Joiner | The delimiter between elements |

**Example**:
\`\`\`
List: ["Apple", "Banana", "Orange"]
Joiner: , 
Result: Apple, Banana, Orange
\`\`\`

---

### 🧹 Trim

Clean whitespace in text.

| Mode | Description | Example |
|------|------|------|
| Trim both | Remove leading and trailing | \`  hello  \` → \`hello\` |
| Trim start | Leading only | \`  hello  \` → \`hello  \` |
| Trim end | Trailing only | \`  hello  \` → \`  hello\` |
| Remove all | Remove all spaces | \`h e l l o\` → \`hello\` |

---

### 🔠 Case

Change the case of text.

| Mode | Description | Example |
|------|------|------|
| UPPERCASE | All to upper | \`hello\` → \`HELLO\` |
| lowercase | All to lower | \`HELLO\` → \`hello\` |
| Capitalize first | First letter upper | \`hello world\` → \`Hello world\` |
| Title Case | Each word capitalized | \`hello world\` → \`Hello World\` |

---

### 📏 Slice

Take a substring of a given range.

| Parameter | Description | Example |
|------|------|------|
| Input text | Source text | \`Hello World\` |
| Start | Start index (from 0) | 0, 6, -5 |
| End | End index (optional) | 5, -1 |

**Index explained**:
\`\`\`
Text:  H e l l o   W o r l  d
Index: 0 1 2 3 4 5 6 7 8 9 10
Neg:  -11 -10 -9 -8 -7 -6 -5 -4 -3 -2 -1
\`\`\`

**Examples**:

| Input | Start | End | Result |
|------|------|------|------|
| \`Hello World\` | 0 | 5 | \`Hello\` |
| \`Hello World\` | 6 | - | \`World\` |
| \`Hello World\` | -5 | - | \`World\` |
| \`Hello World\` | 0 | -6 | \`Hello\` |

---

### String concatenation (variable references)

Besides the join module, you can mix variables directly in text:

\`\`\`
{firstName} + {lastName}
https://example.com/user/{userId}
{year}-{month}-{day}
\`\`\`

### Common tricks

**Build a URL**:
\`\`\`
https://www.example.com/search?keyword={keyword}&page={page}
\`\`\`

**Build a file name**:
\`\`\`
data_{date}_{seq}.xlsx
\`\`\`

**Build a message**:
\`\`\`
[{siteName}] {productName} price dropped! Now: {price}
\`\`\`

---

## 💡 Tips for using variables

### 1. Naming

- Use meaningful names: \`productPrice\` not \`a\`
- Keep a consistent style
- Avoid special characters

### 2. Types

- Make sure a variable is a number before math
- Make sure it's a list before list operations
- The wrong type causes failures

### 3. Debugging

- Use **Print log** to output values
- View all variables in the **Variables** tab of the log panel
- Values are shown as JSON for easy inspection of complex data

### 4. Scope

- All variables are global
- A variable set in any module is accessible from others
- A variable modified inside a loop keeps the modified value outside`

