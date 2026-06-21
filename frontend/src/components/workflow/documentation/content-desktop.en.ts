export const desktopGuideContentEn = `# 🖥️ Desktop App Automation

This chapter explains how to use WebRPA to automate Windows desktop applications (such as Notepad, Excel, browsers, custom software, etc.), implemented based on Windows UI Automation technology.

---

## Overview

There are **26** desktop app automation modules in total, supporting:
- Launch, connect to, and close any Windows desktop program
- Window management (activate, maximize, move, resize)
- Find and operate UI controls (buttons, input boxes, dropdowns, menus, lists, etc.)
- Keyboard/mouse interaction with controls
- Capture window images

> **Prerequisites**: The OS is Windows 10/11, and the target app requires no special configuration.

---

## 🚀 App Management

### Launch Desktop App (desktop_app_start)

Launch a desktop program and wait for it to fully load.

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| Program path | Full path of the EXE file | \`C:\\Windows\\notepad.exe\` |
| Launch arguments | Command-line arguments (optional) | \`/A myfile.txt\` |
| Wait until ready | Wait for the program to respond (seconds) | \`5\` |
| Result variable | Saves the process ID | \`app_pid\` |

**Example workflow**:

\`\`\`
Launch desktop app → Program path: C:\\Windows\\notepad.exe → Result variable: notepad_pid
\`\`\`

---

### Connect to Desktop App (desktop_app_connect)

Connect to an **already running** desktop program (found by process name or window title).

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| Connection method | By process name/window title/PID | Process name |
| Process name | Program name without extension | \`notepad\` |
| Window title | Window title (fuzzy match supported) | \`Untitled - Notepad\` |
| Result variable | Saves the app handle | \`app_handle\` |

---

### Close Desktop App (desktop_app_close)

Close the specified desktop program.

| Parameter | Description |
|------|------|
| App variable | The variable returned by a previous connect/launch |
| Force close | If enabled, forcibly terminate the process |

---

### Get App Info (desktop_app_get_info)

Get detailed information about the application.

| Parameter | Description |
|------|------|
| App variable | The app handle variable |
| Result variable | Saves the info (including pid, title, path, etc.) |

---

### Wait for App Ready (desktop_app_wait_ready)

Wait for the application to become responsive (no longer spinning), good for slow-starting software.

| Parameter | Description |
|------|------|
| App variable | The app handle variable |
| Timeout (seconds) | Maximum wait time |

---

## 🪟 Window Management

### Activate Window (desktop_window_activate)

Bring the specified window to the foreground and give it focus.

\`\`\`
Connect to desktop app → App variable: app
Activate window → App variable: {app}
\`\`\`

---

### Set Window State (desktop_window_state)

Maximize, minimize, restore, or hide a window.

| State | Description |
|------|------|
| maximize | Maximize |
| minimize | Minimize |
| restore | Restore |
| hide | Hide |
| show | Show |

---

### Move Window (desktop_window_move)

Move the window to a specified screen position.

| Parameter | Description |
|------|------|
| X coordinate | Window top-left X |
| Y coordinate | Window top-left Y |

---

### Resize Window (desktop_window_resize)

| Parameter | Description |
|------|------|
| Width | Pixels |
| Height | Pixels |

---

### Get Window List (desktop_window_list)

Get a list of all currently open windows; the result is an array, each item containing the title, process name, and PID.

| Parameter | Description |
|------|------|
| Result variable | Saves the window list |

---

### Capture Window Image (desktop_window_capture)

Take a screenshot of the specified window and save it as an image file.

| Parameter | Description |
|------|------|
| App variable | App handle |
| Save path | Image save path |
| Result variable | Saves the image path |

---

## 🎛️ Control Operations

### Find Control (desktop_find_control)

Find a UI control in the app; this is the basis for all control operations.

**Configuration**:

| Parameter | Description | Example |
|------|------|------|
| App variable | App handle | \`{app}\` |
| Control type | Button/Edit/Text/ComboBox, etc. | \`Button\` |
| Control name | The control's Name property | \`OK\` |
| Automation ID | AutomationId (more precise) | \`btnOK\` |
| Class name | ClassName property | \`Edit\` |
| Timeout (seconds) | Wait for the control to appear | \`10\` |
| Result variable | Saves the control reference | \`ctrl\` |

**How to get control info**:
Use WebRPA's built-in **desktop element selector** (the "Desktop Selector" button on the toolbar); hover over a control to get its properties.

---

### Get Control Info (desktop_control_info)

Get all properties of a control (type, name, rectangle, whether enabled, etc.).

| Parameter | Description |
|------|------|
| Control variable | The found control |
| Result variable | Saves the property dictionary |

---

### Get Control Tree (desktop_control_tree)

Get the complete control hierarchy tree of the app, used to analyze the program structure.

| Parameter | Description |
|------|------|
| App variable | App handle |
| Depth | Maximum tree depth (1-10) |
| Result variable | Saves the tree structure |

---

### Wait for Control (desktop_wait_control)

Wait for a control to appear before continuing, good for slow-loading interfaces.

| Parameter | Description |
|------|------|
| App variable | App handle |
| Control condition | Same as Find Control |
| Timeout (seconds) | Maximum wait |
| Result variable | Saves the control |

---

### Click Control (desktop_click_control)

Click buttons, links, and other clickable controls.

| Parameter | Description |
|------|------|
| Control variable | Target control |
| Click method | Single click/double click/right click |
| Double-click interval | The interval (ms) for a double click |

**Example** (click the "OK" button):

\`\`\`
Find control → Control name: OK, Control type: Button → Result variable: btn_ok
Click control → Control variable: {btn_ok}
\`\`\`

---

### Input Text (desktop_input_control)

Enter text into a text input box (supports clearing first, then entering).

| Parameter | Description |
|------|------|
| Control variable | The input box control |
| Input content | The text to enter |
| Clear first | Whether to clear the original content before entering |
| Input method | Direct assignment/simulate keyboard |

> **Tip**: "Direct assignment" is faster; "simulate keyboard" has better compatibility, good for input boxes with input validation.

---

### Get Text (desktop_get_text)

Read the text content of a control (Label, TextBox, status bar, etc.).

| Parameter | Description |
|------|------|
| Control variable | Target control |
| Result variable | Saves the text content |

---

### Set Value (desktop_set_value)

Directly set the value of a control (good for special controls like progress bars and sliders).

---

### Operate Dropdown (desktop_select_combo)

Select an option in a dropdown list (ComboBox).

| Parameter | Description |
|------|------|
| Control variable | The dropdown control |
| Selection method | By text/by index |
| Option text | The text of the option to select |
| Option index | A 0-based index |

---

### Operate Checkbox (desktop_checkbox)

Check or uncheck a checkbox.

| Parameter | Description |
|------|------|
| Control variable | The checkbox control |
| Operation | Check/uncheck/toggle |

---

### Operate Radio Button (desktop_radio)

Select a radio button.

---

### Drag Control (desktop_drag_control)

Perform a drag operation between controls.

| Parameter | Description |
|------|------|
| Source control variable | The drag start control |
| Target control variable | The drag end control |

---

### Click Menu (desktop_menu_click)

Click a menu item in the app's menu bar; supports multi-level menus.

| Parameter | Description | Example |
|------|------|------|
| App variable | App handle | \`{app}\` |
| Menu path | Separate multi-level menus with \`>\` | \`File>Save As\` |

**Example** (Save As in Notepad):

\`\`\`
Connect to desktop app → Process name: notepad → Result variable: app
Activate window → App variable: {app}
Click menu → App variable: {app}, Menu path: File>Save As
\`\`\`

---

### Operate List (desktop_list_operate)

Operate a ListBox or ListView control; supports selecting items and getting list content.

| Parameter | Description |
|------|------|
| Control variable | The list control |
| Operation | Select item/get all items/get selected items |
| Selection method | By text/by index |
| Result variable | Saves the operation result |

---

### Send Keys (desktop_send_keys)

Send a sequence of keyboard keys to a control or app (supports shortcut combinations).

| Parameter | Description | Example |
|------|------|------|
| App/control variable | Target | \`{app}\` |
| Key sequence | Use \`+\` for combos | \`{CTRL}a\` select all |

**Common key formats**:

| Key | Format |
|------|------|
| Ctrl+C | \`{CTRL}c\` |
| Enter | \`{ENTER}\` |
| Tab | \`{TAB}\` |
| F5 | \`{F5}\` |
| Ctrl+Shift+S | \`{CTRL}{SHIFT}s\` |

---

### Get Property (desktop_get_property)

Get a specific property value of a control (IsEnabled, IsVisible, Value, etc.).

| Parameter | Description | Example |
|------|------|------|
| Control variable | Target control | \`{ctrl}\` |
| Property name | UIA property name | \`IsEnabled\` |
| Result variable | Saves the property value | \`is_enabled\` |

---

### Handle Dialog (desktop_dialog_handle)

Automatically handle pop-up dialogs (confirmation boxes, warning boxes, file save boxes, etc.).

| Parameter | Description |
|------|------|
| Wait timeout | Wait for the dialog to appear (seconds) |
| Operation | Click OK/Cancel/Close/Custom button |
| Custom button text | Click the button with the specified text |
| Input content | Fill in content if there is an input box |
| Result variable | Saves the dialog text |

---

## 📋 Full Example: Automatically Fill in a Form

The following example shows how to automatically open Notepad, enter content, and save:

\`\`\`mermaid
flowchart TD
    A[Launch desktop app\nnotepad.exe] --> B[Wait for app ready]
    B --> C[Activate window]
    C --> D[Find text input box]
    D --> E[Input text content]
    E --> F[Send keys Ctrl+S]
    F --> G[Handle dialog\nfill in file name and confirm]
    G --> H[Close desktop app]
\`\`\`

**Full configuration**:

1. **Launch desktop app** → Program path: \`C:\\Windows\\notepad.exe\` → Result variable: \`app\`
2. **Wait for app ready** → App variable: \`{app}\` → Timeout: \`10\`
3. **Activate window** → App variable: \`{app}\`
4. **Find control** → Control type: \`Edit\` → Result variable: \`text_box\`
5. **Input text** → Control variable: \`{text_box}\` → Content: \`Hello WebRPA!\`
6. **Send keys** → App variable: \`{app}\` → Keys: \`{CTRL}s\`
7. **Handle dialog** → Operation: Click OK
8. **Close desktop app** → App variable: \`{app}\`

---

## 💡 Tips

### How to Get a Control's Automation ID

1. Click the "Desktop Selector" button on the toolbar
2. Hover over the target control
3. The bottom panel shows the control's full properties (Name, AutomationId, ControlType, etc.)
4. Fill this info into the "Find Control" module

### Tips for Improving Reliability

- Prefer finding controls by **AutomationId** (most stable, unaffected by language)
- The second choice is the **control name + control type** combination
- Add a "Wait for control" module before operating to avoid errors when the control has not loaded
- Add appropriate "Wait" time after an operation to ensure it completes

### FAQ

**Q: What if the control cannot be found?**
A: Use the "Get Control Tree" module to print the app's control structure and analyze the correct control properties.

**Q: The control click has no response?**
A: Try using "Activate Window" first to bring the program to the foreground, or switch to the "Send Keys" method.

**Q: The dropdown cannot be selected?**
A: Some custom dropdowns may need to be clicked open first, then find and click the option.

---

## 🌟 Yingdao-class Desktop Enhancement Modules (added in v1.32+)

For complex desktop app scenarios, 8 new professional modules are added, greatly improving accuracy and efficiency.

### Smart Find Control (desktop_find_control_smart)

Supports wildcards, fuzzy matching, multi-property combinations, and automatic score-based sorting; far more powerful than \`desktop_find_control\`.

| Parameter | Description | Example |
|------|------|------|
| Name pattern | Supports wildcard \`*\` | \`*login*\` |
| Class pattern | Supports wildcards | \`Edit*\` |
| AutomationId | Exact match | \`btnSave\` |
| Control type | UIA type | \`Button\` |
| Text contains | A substring contained in the control text | \`OK\` |
| Fuzzy match | Enable fuzzy scoring | \`true\` |
| Return all | Return all matched controls | \`false\` (default returns only the highest score) |
| Save to variable | Control variable name | \`desktop_control\` |

**Applies to**: The preferred find method for type A apps (native Win32 / WPF / WinForms).

---

### Batch Extract Table/List (desktop_extract_table)

Extract batch data from tables, lists, DataGrids, etc. in a desktop app at once. Comparable to Yingdao RPA's DataExtraction Wizard.

| Parameter | Description |
|------|------|
| Container name / type | Limit the extraction scope (optional) |
| Limit rows | Max number of rows to extract (default 1000) |
| Visible columns only | Extract only IsKeyboardFocusable columns |
| Scroll loading | Automatically scroll to load more data |
| Save to variable | Default \`extracted_data\` |

The returned data is an array, one dictionary object per row, which you can iterate directly with \`foreach\` or export to Excel.

---

### App UI State Snapshot (desktop_get_app_state)

Print the entire app's control tree + focus + title and other state, used for AI troubleshooting or quickly sensing the UI structure.

| Parameter | Description |
|------|------|
| Max depth | Default 6 levels |
| Include invisible | Default false |
| App variable | \`{desktop_app}\` |
| Save to variable | Default \`app_state\` |

**Typical use**: When you cannot find a control, call this module first to inspect the UI tree, then decide your next strategy.

---

### XPath-style Query (desktop_query_with_xpath)

Use XPath expressions to locate controls directly; supports advanced usage such as \`//Button[@name='Login']\`, \`contains()\`, etc.

| Parameter | Description | Example |
|------|------|------|
| XPath expression | Required | \`//Button[contains(@name,'OK')]\` |
| Timeout | Wait seconds | \`5\` |
| Save to variable | Control variable | \`desktop_control\` |

---

### Select Text (desktop_select_text)

Select and copy specified text from a text box / editor into a variable.

| Parameter | Description |
|------|------|
| Control variable | Target control |
| Selection mode | \`all\` / \`double_click\` / \`range\` |
| Save to variable | Default \`selected_text\` |

---

### Get Focused Control (desktop_get_focused_control)

Get the control that currently has focus (dynamically analyze the active element).

| Parameter | Description |
|------|------|
| Save to variable | Default \`focused_control\` |

Returns an info dictionary with control name, type, value, AutomationId, etc.

---

### Assert Control State (desktop_assert_control)

A must for test scenarios: verify whether a control exists / is visible / is enabled / its text matches.

| Parameter | Description | Values |
|------|------|------|
| Assertion type | Required | \`exists\` / \`visible\` / \`enabled\` / \`text_equals\` / \`text_contains\` |
| Expected value | Used by text-type assertions | Any string |
| Control variable | Target control | \`{ctrl}\` |

When the assertion fails, it returns \`success=false\`, which can be caught by an outer \`condition\` module or an automated test suite.

---

### Send Hotkey (desktop_hotkey)

Send a system-level hotkey directly to the current active window (a must for old apps / Electron apps).

| Parameter | Description | Example |
|------|------|------|
| Key sequence | Joined with \`+\` | \`ctrl+s\` / \`alt+f4\` / \`win+e\` |
| Target window title | Optional, activate that window first | \`Notepad\` |
| Key interval | In seconds | \`0.05\` |

Good for triggering common shortcuts like Ctrl+S, Ctrl+C, Alt+F4.

---

## 🎯 App Type Decision Tree

Different desktop apps have different underlying rendering mechanisms, so their automation strategies differ:

| Type | App Examples | Recommended Flow |
|------|---------|---------|
| **A Native apps** | Notepad, Excel, Windows system software | \`desktop_find_control_smart\` + \`desktop_click_control\` + \`desktop_input_control\` |
| **B Electron / Flutter** | VSCode, QQ, WeChat, Discord | Use UIA to find the window shell → use \`click_text\` / \`click_image\` / \`desktop_hotkey\` |
| **C Game / Canvas** | Full-screen games, custom rendering | \`click_image\` + \`click_text\` + \`real_mouse_click\` + \`desktop_hotkey\` |

How to judge: Use the "Desktop Element Selector" to pick the main area; if you see only one root control and cannot see the inner buttons, it is type B or C, and you must fall back to an image/OCR/hotkey strategy.
`
