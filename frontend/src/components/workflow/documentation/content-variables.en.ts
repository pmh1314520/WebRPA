export const variablesGuideContentEn = `# Variable System in depth

This chapter explains WebRPA's variable system in detail: types, scope, references and more.

---

## Module built-in variables

WebRPA defines default variable names for common modules; when you add a module, they're auto-added to the autocomplete list.

### Default variables of common modules

**Data scraping modules:**
- \`get_element_info\` -> \`element_info\`
- \`screenshot\` -> \`screenshot_path\`
- \`extract_table_data\` -> \`table_data\`
- \`download_file\` -> \`file_downloaded\`

**Network request modules:**
- \`api_request\` -> \`api_response\`
- \`send_email\` -> \`email_sent\`
- \`webhook_request\` -> \`webhook_response\`

**Data processing modules:**
- \`json_parse\` -> \`json_data\`
- \`regex_extract\` -> \`regex_result\`
- \`list_operation\` -> \`list_result\`
- \`dict_operation\` -> \`dict_result\`

**AI modules:**
- \`ai_chat\` -> \`ai_response\`
- \`ocr_captcha\` -> \`captcha_text\`
- \`image_ocr\` -> \`ocr_text\`
- \`face_recognition\` -> \`face_match_result\`

**Database modules:**
- \`db_query\` -> \`query_result\`
- \`db_insert\` -> \`insert_result\`
- \`db_update\` -> \`update_result\`

### Variable autocomplete

As you type a variable name, matching suggestions appear:

1. **Fuzzy search**: type any part of the name
2. **Pinyin search**: supports Chinese pinyin and initials
3. **Type hints**: shows the data type (string, number, array, object, etc.)
4. **Value preview**: shows the current value (if any)

**Shortcuts:**
- Up/Down: select a variable
- Enter/Tab: confirm
- Esc: close the suggestion list

---

## What is a variable?

A variable is a container that stores data and passes it between modules in a workflow.

### What variables are for

- Store scraped data
- Pass info between modules
- Control flow logic
- Generate content dynamically

---

## Variable types

WebRPA supports 5 types:

### 1. String

Text, wrapped in quotes.

\`\`\`
Examples:
"Hello World"
"username"
"https://example.com"
\`\`\`

### 2. Number

Integer or decimal.

\`\`\`
Examples:
42
3.14
-100
0
\`\`\`

### 3. Boolean

True or false, for conditions.

\`\`\`
Examples:
true
false
\`\`\`

### 4. List / Array

An ordered collection.

\`\`\`json
Examples:
["Apple", "Banana", "Orange"]
[1, 2, 3, 4, 5]
[{"name": "John"}, {"name": "Jane"}]
\`\`\`

### 5. Dictionary / Object

A collection of key-value pairs.

\`\`\`json
Example:
{
  "name": "John",
  "age": 25,
  "city": "Beijing"
}
\`\`\`

---

## Variable reference syntax

### Basic reference

Use curly braces:
\`\`\`
{variableName}
\`\`\`

### Examples

| Variable value | Reference | Result |
|--------|----------|------|
| name = "John" | \`{name}\` | John |
| count = 10 | \`Count: {count}\` | Count: 10 |
| url = "example.com" | \`https://{url}\` | https://example.com |

### Nested references

Access list elements:
\`\`\`
{list[0]}      -> first element
{list[1]}      -> second element
{list[-1]}     -> last element
\`\`\`

Access dict properties:
\`\`\`
{user[name]}   -> the user's name property
{user[age]}    -> the user's age property
\`\`\`

Multi-level:
\`\`\`
{data[0][name]}        -> the name of the first data item
{response[data][items][0]} -> the first element of response.data.items
\`\`\`

---

## Creating variables

### Option 1: the "Set variable" module

The most direct way — create a variable manually.

**Config**:
| Parameter | Description |
|------|------|
| Variable name | The variable's name |
| Variable value | The value to set |
| Variable type | Choose the data type |

### Option 2: module output

Many modules can save their result to a variable:

| Module | Output variable |
|------|----------|
| Get element info | extracted text/attribute |
| API request | response data |
| AI chat | AI reply |
| Random number | the generated number |
| Read Excel | Excel data list |

### Option 3: loops auto-create

Loop modules auto-create index variables:

| Loop type | Auto variables |
|----------|----------|
| Count loop | loop_index (customizable) |
| Iterate a list | item, index (customizable) |

---

## Viewing variables

### Variable panel

Click the **Variables** tab in the bottom log panel to:
- See all variables and their values
- Monitor changes in real time
- Manually add/edit variables

### Debug output

Use the "Print log" module to output values:
\`\`\`
Print log: current user={username}, balance={balance}
\`\`\`

---

## List operations

### List operation module

| Operation | Description | Example |
|------|------|------|
| Append | Add at the end | [1,2] -> [1,2,3] |
| Insert | Insert at a position | [1,3] -> [1,2,3] |
| Remove | Remove by value | [1,2,3] -> [1,3] |
| Pop | Remove by index and return | [1,2,3] -> [1,2], returns 3 |
| Clear | Remove all | [1,2,3] -> [] |

### Get list info

| Module | Function |
|------|------|
| List get | Get the element at an index |
| List length | Get the element count |

### Index explained

\`\`\`
List:   ["a", "b", "c", "d"]
Index:    0     1     2     3
Negative: -4   -3    -2    -1

{list[0]}  -> "a" (first)
{list[-1]} -> "d" (last)
{list[1]}  -> "b" (second)
\`\`\`

---

## Dictionary operations

### Dict operation module

| Operation | Description |
|------|------|
| Set key-value | Add or modify a pair |
| Remove key | Delete a key |

### Get dict info

| Module | Function |
|------|------|
| Dict get | Get a value by key |
| Get all keys | Get the list of keys |

### Example

\`\`\`
Dict: {"name": "John", "age": 25}

{dict[name]}  -> "John"
{dict[age]}   -> 25

Get all keys -> ["name", "age"]
\`\`\`

---

## Variable processing modules

### Increment / decrement

Add or subtract on a number variable.

**Config**:

| Parameter | Description | Example |
|------|------|------|
| Variable name | The variable to operate on | counter |
| Operation | Increment or decrement | increment/decrement |
| Step | Amount to add or subtract | 1 |

**Use cases**: loop counters, counting, page increment, countdowns.

**Example**:
\`\`\`
Set variable: counter = 0

Loop 10 times
  ├─ Increment/decrement: counter increment 1
  └─ Print log: current count {counter}

Result: counter goes from 0 to 10
\`\`\`

**Difference from Set variable**:
\`\`\`
[×] Not recommended:
Set variable: counter = {counter} + 1  (manual calculation)

[√] Recommended:
Increment/decrement: counter increment 1  (cleaner)
\`\`\`

**Notes**: the variable must be a number, must already exist (create it with "Set variable" first), and the step can be a decimal like 0.5, 1.5.

---

### JSON parse

Extract data from a JSON string.

**JSONPath syntax**:
| Expression | Meaning |
|--------|------|
| $.key | the key property of the root object |
| $.data.name | a nested property |
| $.items[0] | the first array element |
| $.items[*].name | the name of all items |

**Example**:
\`\`\`json
Data: {"code": 200, "data": {"user": "John", "items": [1,2,3]}}

$.code           -> 200
$.data.user      -> "John"
$.data.items[0]  -> 1
\`\`\`

### Base64 encode/decode

| Operation | Description |
|------|------|
| Encode | text/file -> Base64 string |
| Decode | Base64 string -> original data |

**Use cases**: image-to-Base64 for AI recognition, encoded file transfer, binary data.

### Random number

Generate a random integer in a range.

**Config**:
| Parameter | Description |
|------|------|
| Min | Lower bound |
| Max | Upper bound |
| Save to variable | Store the result |

**Uses**: random delays, random element selection, generating test data.

### Get time

Get the current date/time.

**Format symbols**:
| Symbol | Meaning | Example |
|------|------|------|
| YYYY | 4-digit year | 2024 |
| MM | 2-digit month | 01-12 |
| DD | 2-digit day | 01-31 |
| HH | 24-hour | 00-23 |
| mm | minute | 00-59 |
| ss | second | 00-59 |

**Common formats**:
\`\`\`
YYYY-MM-DD           -> 2024-01-15
YYYY-MM-DD HH:mm:ss  -> 2024-01-15 14:30:00
YYYYMMDD             -> 20240115
HH:mm                -> 14:30
\`\`\`

---

## Variable scope

### Global variables

Accessible throughout the whole workflow.

- Created via "Set variable"
- Created via module output
- Added manually in the variable panel

### Loop variables

Valid only inside the loop.

\`\`\`
Iterate list: dataList
  ├─ {item} and {index} are valid here
  └─ usable inside the loop

Outside the loop: {item} and {index} are unavailable
\`\`\`

---

## Best practices

### Naming

\`\`\`
[√] Recommended:
productName, userList, currentIndex, apiResponse

[×] Avoid:
a, temp, x, data1
\`\`\`

### Type consistency

\`\`\`
[√] Correct:
number compare: {count} > 10
string compare: {status} == "success"

[×] Wrong:
{count} > "10"  (number vs string)
\`\`\`

### Default-value handling

\`\`\`
Condition: {var} != ""
  ├─ true -> use the value
  └─ false -> use a default
\`\`\`

### Debugging tips

\`\`\`
1. Add print-log at key points
2. Monitor live in the variable panel
3. Validate data with conditions
\`\`\`

---

## Common issues

### Variable undefined

**Cause**: referencing a non-existent variable
**Fix**: check spelling and make sure it's created

### Type error

**Cause**: the type doesn't match the operation
**Fix**: use the right type, convert if needed

### Nested access fails

**Cause**: wrong path or mismatched structure
**Fix**: print the variable to see the real structure, then fix the path

### Loop-variable access

**Cause**: accessing a loop variable outside the loop
**Fix**: use it inside the loop, or save the value to a global variable`

