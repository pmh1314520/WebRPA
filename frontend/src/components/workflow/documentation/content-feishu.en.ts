export const feishuGuideContentEn = `# Feishu Automation Guide

> Automate Feishu Bitable and Sheets operations with WebRPA

---

## Table of Contents

- [Module Overview](#module-overview)
- [Prerequisites](#prerequisites)
- [Bitable Operations](#bitable-operations)
- [Sheets Operations](#sheets-operations)
- [Practical Cases](#practical-cases)
- [FAQ](#faq)

---

## Module Overview

WebRPA provides Feishu automation modules that support:

| Module | Function | Description |
|------|------|------|
| \`feishu_bitable_write\` | Write to Bitable | Add or update data in a Feishu Bitable |
| \`feishu_bitable_read\` | Read from Bitable | Read data from a Feishu Bitable |
| \`feishu_sheet_write\` | Write to Sheets | Write data to a Feishu spreadsheet |
| \`feishu_sheet_read\` | Read from Sheets | Read data from a Feishu spreadsheet |

---

## Prerequisites

### 1. Create a Feishu App

1. Visit the [Feishu Open Platform](https://open.feishu.cn/)
2. Create a custom enterprise app
3. Obtain the **App ID** and **App Secret**

### 2. Configure Permissions

In the app management console, add the following permissions:

**Bitable permissions**:
- \`bitable:app\` - Get Bitable information
- \`bitable:app:readonly\` - Read Bitable
- \`bitable:app:write\` - Write Bitable

**Sheets permissions**:
- \`sheets:spreadsheet\` - Get spreadsheet information
- \`sheets:spreadsheet:readonly\` - Read spreadsheet
- \`sheets:spreadsheet:write\` - Write spreadsheet

### 3. Get the Document Token

**Bitable Token**:
- Open the Bitable
- Get it from the URL: \`https://xxx.feishu.cn/base/【Token here】\`

**Sheets Token**:
- Open the spreadsheet
- Get it from the URL: \`https://xxx.feishu.cn/sheets/【Token here】\`

---

## Bitable Operations

### Write to Bitable

\`\`\`yaml
Module: feishu_bitable_write
Config:
  app_id: "cli_xxxxxxxxxxxxx"
  app_secret: "xxxxxxxxxxxxxxxxxxxxx"
  app_token: "bascnxxxxxxxxxxxxxx"
  table_id: "tblxxxxxxxxxxxxxx"
  operation: "add"  # add=add, update=update
  data:
    - Field1: "Value1"
      Field2: "Value2"
      Field3: "Value3"
    - Field1: "Value4"
      Field2: "Value5"
      Field3: "Value6"
Output variable: write_result
\`\`\`

**Parameters**:
- \`app_id\`: Feishu App ID
- \`app_secret\`: Feishu App Secret
- \`app_token\`: Bitable Token
- \`table_id\`: Data table ID (get it from the Bitable URL)
- \`operation\`: Operation type
  - \`add\`: Add a new record
  - \`update\`: Update an existing record (requires record_id)
- \`data\`: The data to write (list format)

**Update record example**:
\`\`\`yaml
data:
  - record_id: "recxxxxxxxxxxxxxx"
    Field1: "New Value1"
    Field2: "New Value2"
\`\`\`

### Read from Bitable

\`\`\`yaml
Module: feishu_bitable_read
Config:
  app_id: "cli_xxxxxxxxxxxxx"
  app_secret: "xxxxxxxxxxxxxxxxxxxxx"
  app_token: "bascnxxxxxxxxxxxxxx"
  table_id: "tblxxxxxxxxxxxxxx"
  filter: ""  # Optional: filter condition
  sort: ""    # Optional: sort rule
Output variable: table_data
\`\`\`

**Filter condition example**:
\`\`\`yaml
filter: "CurrentValue.[Field1] = 'Value1'"
\`\`\`

**Sort rule example**:
\`\`\`yaml
sort: '[{"field_name":"Field1","desc":true}]'
\`\`\`

**Output format**:
\`\`\`json
[
  {
    "record_id": "recxxxxxxxxxxxxxx",
    "Field1": "Value1",
    "Field2": "Value2",
    "Field3": "Value3"
  },
  {
    "record_id": "recxxxxxxxxxxxxxx",
    "Field1": "Value4",
    "Field2": "Value5",
    "Field3": "Value6"
  }
]
\`\`\`

---

## Sheets Operations

### Write to Sheets

\`\`\`yaml
Module: feishu_sheet_write
Config:
  app_id: "cli_xxxxxxxxxxxxx"
  app_secret: "xxxxxxxxxxxxxxxxxxxxx"
  spreadsheet_token: "shtcnxxxxxxxxxxxxxx"
  sheet_id: "xxxxxx"
  range: "A1:C10"  # Write range
  data:
    - ["Title1", "Title2", "Title3"]
    - ["Value1", "Value2", "Value3"]
    - ["Value4", "Value5", "Value6"]
Output variable: write_result
\`\`\`

**Parameters**:
- \`spreadsheet_token\`: Spreadsheet Token
- \`sheet_id\`: Worksheet ID (optional, defaults to the first worksheet)
- \`range\`: Write range (A1 notation)
- \`data\`: The data to write (2D array)

### Read from Sheets

\`\`\`yaml
Module: feishu_sheet_read
Config:
  app_id: "cli_xxxxxxxxxxxxx"
  app_secret: "xxxxxxxxxxxxxxxxxxxxx"
  spreadsheet_token: "shtcnxxxxxxxxxxxxxx"
  sheet_id: "xxxxxx"
  range: "A1:C10"  # Read range
Output variable: sheet_data
\`\`\`

**Output format**:
\`\`\`json
[
  ["Title1", "Title2", "Title3"],
  ["Value1", "Value2", "Value3"],
  ["Value4", "Value5", "Value6"]
]
\`\`\`

---

## Practical Cases

### Case 1: Import Data from Excel into a Feishu Bitable

\`\`\`mermaid
graph LR
    A[Read Excel] --> B[Loop through data]
    B --> C[Write to Feishu Bitable]
    C --> D[Log]
\`\`\`

**Workflow configuration**:

1. **Read the Excel file**
\`\`\`yaml
Module: read_excel
Config:
  file_path: "data.xlsx"
  sheet_name: "Sheet1"
Output variable: excel_data
\`\`\`

2. **Write to the Feishu Bitable**
\`\`\`yaml
Module: feishu_bitable_write
Config:
  app_id: "cli_xxxxxxxxxxxxx"
  app_secret: "xxxxxxxxxxxxxxxxxxxxx"
  app_token: "bascnxxxxxxxxxxxxxx"
  table_id: "tblxxxxxxxxxxxxxx"
  operation: "add"
  data: "\${excel_data}"
Output variable: write_result
\`\`\`

3. **Log**
\`\`\`yaml
Module: print_log
Config:
  message: "Successfully imported \${write_result.count} records"
  level: "info"
\`\`\`

### Case 2: Export Data from a Feishu Bitable to Excel

\`\`\`mermaid
graph LR
    A[Read Feishu Bitable] --> B[Process data]
    B --> C[Write to Excel]
    C --> D[Save file]
\`\`\`

**Workflow configuration**:

1. **Read the Feishu Bitable**
\`\`\`yaml
Module: feishu_bitable_read
Config:
  app_id: "cli_xxxxxxxxxxxxx"
  app_secret: "xxxxxxxxxxxxxxxxxxxxx"
  app_token: "bascnxxxxxxxxxxxxxx"
  table_id: "tblxxxxxxxxxxxxxx"
Output variable: table_data
\`\`\`

2. **Create an Excel table**
\`\`\`yaml
Module: table_clear
Config:
  table_name: "Export Data"
\`\`\`

3. **Loop to add data**
\`\`\`yaml
Module: foreach
Config:
  list: "\${table_data}"
  item_variable: "row"
\`\`\`

4. **Add row data**
\`\`\`yaml
Module: table_add_row
Config:
  table_name: "Export Data"
  row_data: "\${row}"
\`\`\`

5. **Export Excel**
\`\`\`yaml
Module: table_export
Config:
  table_name: "Export Data"
  output_path: "ExportData.xlsx"
  format: "xlsx"
\`\`\`

### Case 3: Scheduled Data Sync

\`\`\`mermaid
graph LR
    A[Scheduled trigger] --> B[Read source data]
    B --> C[Read Feishu data]
    C --> D[Compare differences]
    D --> E[Update Feishu]
    E --> F[Send notification]
\`\`\`

**Workflow configuration**:

1. **Scheduled trigger**
\`\`\`yaml
Module: scheduled_task
Config:
  cron: "0 */1 * * *"  # Run every hour
\`\`\`

2. **Read source data**
\`\`\`yaml
Module: api_request
Config:
  url: "https://api.example.com/data"
  method: "GET"
Output variable: source_data
\`\`\`

3. **Read Feishu data**
\`\`\`yaml
Module: feishu_bitable_read
Config:
  app_id: "cli_xxxxxxxxxxxxx"
  app_secret: "xxxxxxxxxxxxxxxxxxxxx"
  app_token: "bascnxxxxxxxxxxxxxx"
  table_id: "tblxxxxxxxxxxxxxx"
Output variable: feishu_data
\`\`\`

4. **Compare and update**
\`\`\`yaml
Module: js_script
Config:
  code: |
    const source = context.source_data;
    const feishu = context.feishu_data;
    
    // Find the data that needs updating
    const updates = [];
    for (const item of source) {
      const existing = feishu.find(f => f.ID === item.id);
      if (!existing || existing.status !== item.status) {
        updates.push({
          record_id: existing?.record_id,
          ID: item.id,
          status: item.status,
          updated_at: new Date().toISOString()
        });
      }
    }
    
    return { updates };
Output variable: diff_result
\`\`\`

5. **Update Feishu**
\`\`\`yaml
Module: feishu_bitable_write
Config:
  app_id: "cli_xxxxxxxxxxxxx"
  app_secret: "xxxxxxxxxxxxxxxxxxxxx"
  app_token: "bascnxxxxxxxxxxxxxx"
  table_id: "tblxxxxxxxxxxxxxx"
  operation: "update"
  data: "\${diff_result.updates}"
\`\`\`

6. **Send notification**
\`\`\`yaml
Module: notify_feishu
Config:
  webhook_url: "https://open.feishu.cn/open-apis/bot/v2/hook/xxxxx"
  message: "Data sync complete, updated \${diff_result.updates.length} records"
\`\`\`

---

## FAQ

### Q1: How do I get the table_id?

**A**: Open the Bitable and get it from the URL:
\`\`\`
https://xxx.feishu.cn/base/bascnxxxxxxxxxxxxxx?table=tblxxxxxxxxxxxxxx
                                                      Up this is the table_id
\`\`\`

### Q2: How do I handle large amounts of data?

**A**: The Feishu API has rate limits, so it is recommended to:
1. Process data in batches (100 records per batch)
2. Add delays (wait 1 second between batches)
3. Use an error-retry mechanism

\`\`\`yaml
Module: loop
Config:
  type: "range"
  start: 0
  end: "\${total_count}"
  step: 100
  variable: "batch_start"
\`\`\`

### Q3: How do I handle field types?

**A**: The Feishu Bitable supports multiple field types:
- Text: pass a string directly
- Number: pass a number type
- Date: pass an ISO 8601 format string (such as "2024-01-01")
- Single select: pass the option text
- Multi select: pass an array of option text
- Person: pass an array of user IDs

### Q4: How do I handle permission issues?

**A**: Make sure:
1. The app has been added to the corresponding Feishu group or document
2. The app has the appropriate permission scopes
3. The document owner has authorized the app to access it

### Q5: How do I handle API errors?

**A**: Use a condition check to inspect the returned result:

\`\`\`yaml
Module: condition
Config:
  condition: "\${write_result.code} == 0"
  true_branch:
    - Module: print_log
      Config:
        message: "Write succeeded"
  false_branch:
    - Module: print_log
      Config:
        message: "Write failed: \${write_result.msg}"
        level: "error"
\`\`\`

---

## Best Practices

1. **Credential management**: Store the App ID and App Secret in global variables; avoid hardcoding
2. **Error handling**: Check the return status after each API call
3. **Batch operations**: Process large amounts of data in batches to avoid timeouts
4. **Logging**: Record the result of each operation to ease troubleshooting
5. **Least privilege**: Request only the necessary permission scopes

---

## Related Docs

- [Data Tables](./excel-guide) - Excel data processing
- [Network Requests](./network-guide) - API calls
- [Flow Control](./advanced-features) - Loops, condition checks
- [Multi-channel Notifications](./notify-guide) - Feishu notifications

---

**Tip**: Before using Feishu automation, make sure you have created an app on the Feishu Open Platform and configured its permissions.
`
