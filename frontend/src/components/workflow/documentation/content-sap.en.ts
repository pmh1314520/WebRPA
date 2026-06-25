export const sapGuideContentEn = `# SAP Automation Guide

> Automate SAP GUI with WebRPA: login, transaction codes, field operations and more.

---

## Module overview

WebRPA provides a complete set of SAP GUI automation modules:

| Module | Function | Description |
|------|------|------|
| \`sap_login\` | SAP login | Connect to and log in to SAP |
| \`sap_logout\` | SAP logout | Disconnect from SAP |
| \`sap_run_tcode\` | Run transaction | Run a SAP transaction code (VA01, ME21N, etc.) |
| \`sap_set_field_value\` | Set field value | Input data into a SAP field |
| \`sap_get_field_value\` | Get field value | Read a SAP field's content |
| \`sap_click_button\` | Click button | Click a SAP button |
| \`sap_send_vkey\` | Send virtual key | Send function keys (F1-F12, Enter, etc.) |
| \`sap_get_status_message\` | Get status message | Read the SAP status-bar message |
| \`sap_get_title\` | Get window title | Get the current SAP window title |
| \`sap_close_warning\` | Close warning | Close a SAP warning dialog |
| \`sap_set_checkbox\` | Set checkbox | Check or uncheck a checkbox |
| \`sap_select_combobox\` | Select combobox | Choose an option from a dropdown |
| \`sap_read_gridview\` | Read grid | Read SAP table data |
| \`sap_export_gridview_excel\` | Export grid | Export a SAP table to Excel |
| \`sap_set_focus\` | Set focus | Focus a given control |
| \`sap_maximize_window\` | Maximize window | Maximize the SAP window |

---

## Connect & log in

### SAP login

\`\`\`yaml
module: sap_login
config:
  connection_string: "SAP connection string"
  client: "800"
  username: "username"
  password: "password"
  language: "ZH"
output variable: sap_session
\`\`\`

**Connection string format**:
- Format: \`/H/host/S/system-number\`
- Example: \`/H/sap.company.com/S/00\`

**Parameters**:
- \`client\`: SAP client number (usually 800, 100, etc.)
- \`username\`: SAP username
- \`password\`: SAP password
- \`language\`: login language (ZH=Chinese, EN=English)

### SAP logout

\`\`\`yaml
module: sap_logout
config:
  session: "\${sap_session}"
\`\`\`

---

## Transaction codes

### Run a transaction

\`\`\`yaml
module: sap_run_tcode
config:
  session: "\${sap_session}"
  tcode: "VA01"  # transaction code
  wait_time: 2    # wait time (seconds)
\`\`\`

**Common transaction codes**:
- \`VA01\`: create sales order
- \`VA02\`: change sales order
- \`VA03\`: display sales order
- \`ME21N\`: create purchase order
- \`ME22N\`: change purchase order
- \`ME23N\`: display purchase order
- \`MM01\`: create material master
- \`MM02\`: change material master
- \`MM03\`: display material master

---

## Field operations

### Set field value

\`\`\`yaml
module: sap_set_field_value
config:
  session: "\${sap_session}"
  field_id: "VBAK-VKORG"  # field ID
  value: "1000"            # field value
\`\`\`

**How to get a field ID**:
1. In SAP GUI, place the cursor on the target field
2. Press F1 to open help
3. Click "Technical Information"
4. See "Field Name" or "Screen Field"

### Get field value

\`\`\`yaml
module: sap_get_field_value
config:
  session: "\${sap_session}"
  field_id: "VBAK-VBELN"  # field ID
output variable: field_value
\`\`\`

---

## Buttons & controls

### Click button

\`\`\`yaml
module: sap_click_button
config:
  session: "\${sap_session}"
  button_id: "btn[0]"  # button ID
\`\`\`

**Common button IDs**:
- \`btn[0]\`: Save
- \`btn[3]\`: Back
- \`btn[11]\`: Execute
- \`btn[15]\`: Exit

### Send virtual key

\`\`\`yaml
module: sap_send_vkey
config:
  session: "\${sap_session}"
  vkey: 0  # virtual key code
\`\`\`

**Virtual key codes**:
- \`0\`: Enter
- \`3\`: Back (F3)
- \`8\`: Execute (F8)
- \`11\`: Save (Ctrl+S)
- \`12\`: Cancel (F12)
- \`15\`: Exit (Shift+F3)

### Set checkbox

\`\`\`yaml
module: sap_set_checkbox
config:
  session: "\${sap_session}"
  checkbox_id: "VBAK-CHECKBOX"
  checked: true  # true=check, false=uncheck
\`\`\`

### Select combobox

\`\`\`yaml
module: sap_select_combobox
config:
  session: "\${sap_session}"
  combobox_id: "VBAK-AUART"
  value: "OR"  # option value
\`\`\`

---

## Table operations

### Read grid data

\`\`\`yaml
module: sap_read_gridview
config:
  session: "\${sap_session}"
  grid_id: "usr/cntlGRID1/shellcont/shell"
output variable: grid_data
\`\`\`

**Output format**:
\`\`\`json
[
  { "Col1": "v1", "Col2": "v2", "Col3": "v3" },
  { "Col1": "v4", "Col2": "v5", "Col3": "v6" }
]
\`\`\`

### Export grid to Excel

\`\`\`yaml
module: sap_export_gridview_excel
config:
  session: "\${sap_session}"
  grid_id: "usr/cntlGRID1/shellcont/shell"
  output_path: "C:/export.xlsx"
\`\`\`

---

## Practical cases

### Case 1: bulk-create sales orders

\`\`\`mermaid
graph LR
    A[SAP login] --> B[Run VA01]
    B --> C[Fill order type]
    C --> D[Fill sales org]
    D --> E[Fill customer no.]
    E --> F[Click save]
    F --> G[Get order no.]
    G --> H{More data?}
    H -->|Yes| B
    H -->|No| I[SAP logout]
\`\`\`

Build it with: SAP login -> Read Excel (order data) -> foreach order -> Run VA01 -> set field VBAK-AUART/VKORG/KUNNR -> send vkey 0 (Enter) -> click btn[0] (save) -> get field VBAK-VBELN (order number) -> print log -> SAP logout.

### Case 2: export material master

\`\`\`mermaid
graph LR
    A[SAP login] --> B[Run MM03]
    B --> C[Enter material no.]
    C --> D[Press Enter]
    D --> E[Read grid data]
    E --> F[Export Excel]
    F --> G[SAP logout]
\`\`\`

---

## FAQ

### Q1: How to handle a SAP warning dialog?

Use \`sap_close_warning\`:
\`\`\`yaml
module: sap_close_warning
config:
  session: "\${sap_session}"
\`\`\`

### Q2: How to tell if an operation succeeded?

Use \`sap_get_status_message\` to read the status bar, then check it with a condition (e.g. contains "success").

### Q3: How to handle SAP session timeout?

Before long operations, periodically send a virtual key (vkey 0, Enter) to keep the session alive.

### Q4: How to get a control ID?

Use the SAP GUI script recorder: "Customize Local Layout" -> "Script Recording and Playback" -> record -> perform actions -> stop -> read the generated script for control IDs.

### Q5: Which SAP versions are supported?

- SAP GUI 7.40+
- SAP ECC 6.0+
- SAP S/4HANA

---

## Best practices

1. **Error handling**: check the status message after each key operation
2. **Wait time**: adjust by your SAP system's responsiveness
3. **Session management**: log out when done to free SAP licenses
4. **Logging**: record each operation's result for troubleshooting
5. **Bulk operations**: use loops for large data to improve efficiency

---

## Related docs

- [Advanced Features](advanced-features) - loops, conditions
- [Excel & Tables](excel-guide) - reading Excel data
- [Notifications](notifications-guide) - logging
- [Debugging & Errors](debug-guide) - error-handling tips

---

**Note**: SAP automation requires the SAP GUI client installed with scripting enabled.`
