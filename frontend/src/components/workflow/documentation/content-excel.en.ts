export const excelGuideContentEn = `# Excel & Data Tables

This chapter covers Excel file operations and the data-table feature.

---

## Excel file assets

### What are Excel file assets?

Excel file assets are Excel files uploaded to the system that workflows can read and use.

### Upload an Excel file

1. Click the **Excel assets** button in the top toolbar
2. Click **Upload file**
3. Choose a .xlsx or .xls file
4. Once uploaded, it can be used in workflows

### Supported formats

| Format | Description |
|------|------|
| .xlsx | Excel 2007+ (recommended) |
| .xls | Excel 97-2003 |

### File management

- **Preview**: click a file to preview its content
- **Delete**: remove files you don't need
- **Refresh**: reload the file list

---

## Read Excel

### Basic config

| Parameter | Description |
|------|------|
| File | Choose an uploaded Excel file |
| Worksheet | The sheet to read |
| Save to variable | Variable for the data |

### Data format

The data is a **list** where each row is a **dict**:

**Excel content**:
| Name | Age | City |
|------|------|------|
| John | 25 | Beijing |
| Jane | 30 | Shanghai |

**The variable**:
\`\`\`json
[
  {"Name": "John", "Age": 25, "City": "Beijing"},
  {"Name": "Jane", "Age": 30, "City": "Shanghai"}
]
\`\`\`

### Using the data

**Iterate all rows**:
\`\`\`
Read Excel -> save to: dataList

Iterate: dataList
  ├─ Print log: name={item[Name]}, age={item[Age]}
  └─ other operations...
\`\`\`

**Access a specific row**:
\`\`\`
{dataList[0]}        -> first row
{dataList[0][Name]}  -> first row's name
{dataList[-1]}       -> last row
\`\`\`

---

## Data table

The data table is WebRPA's built-in data-collection feature for gathering and managing data during a run.

### View the data table

Click the **Data table** tab in the bottom log panel.

### Features

| Feature | Description |
|------|------|
| Auto-collect | Collected automatically after setting "Stored column name" |
| Live preview | Shows data live during a run |
| Manual edit | Edit cells by hand |
| Export CSV | One-click CSV export |

---

## Data-table modules

### Add row

Add a row to the data table.

| Parameter | Description | Example |
|------|------|------|
| Row data | Row data as JSON | \`{"Name": "{name}", "Price": "{price}"}\` |

**Example**:
\`\`\`json
{
  "Product": "{productName}",
  "Price": "{productPrice}",
  "Link": "{productLink}"
}
\`\`\`

### Add column

Add a new column to the data table.

| Parameter | Description |
|------|------|
| Column name | The new column's name |
| Default value | The new column's default (optional) |

### Set cell

Modify a cell's value.

| Parameter | Description | Example |
|------|------|------|
| Row index | Row number (from 0) | 0, {index} |
| Column | The column name | Status |
| Value | The value to set | Processed |

### Get cell

Read a cell's value.

| Parameter | Description |
|------|------|
| Row index | Row number (from 0) |
| Column | The column name |
| Save to variable | Variable for the value |

### Delete row

Delete a row.

| Parameter | Description |
|------|------|
| Row index | The row number to delete |

### Clear table

Clear all data.

### Export table

Export the data table to a file.

| Parameter | Description | Example |
|------|------|------|
| File path | Where to save | C:/data/result.csv |
| Format | CSV or Excel | csv |

---

## Data-collection workflow

### Basic pattern

\`\`\`
Open page
  Down
Loop (paging)
  ├─ Get element info (set column names to auto-collect)
  ├─ Click next page
  └─ Wait for load
  Down
Export table
\`\`\`

### Auto-collect vs manual add

**Auto-collect** (recommended): set "Stored column name" in "Get element info" and data is added automatically.

**Manual add**: use the "Add row" module to build rows by hand.

### Example: scrape a product list

\`\`\`
1. Open page: product list
2. Loop 10 times (10 pages)
   ├─ Iterate: product elements
   │   ├─ Get element info: name -> column "Name"
   │   ├─ Get element info: price -> column "Price"
   │   └─ Get element info: link -> column "Link"
   ├─ Click next page
   └─ Wait for load
3. Export table: C:/result.csv
4. Play beep
\`\`\`

---

## Export data

### CSV format

- Universal; Excel opens it directly
- Supports Chinese (UTF-8)
- Good for data exchange

### Manual export

1. Open the data-table panel
2. Click **Download CSV**
3. Choose where to save

### Auto export

Use the "Export table" module to export in the workflow:
\`\`\`
Export table
  File path: C:/data/{date}_result.csv
  Format: CSV
\`\`\`

---

## Best practices

### Dedup

\`\`\`
Iterate collected data
  ├─ Condition: already exists?
  │   ├─ yes -> skip
  │   └─ no -> add to the table
\`\`\`

### Validation

\`\`\`
After getting data
  ├─ Condition: data valid?
  │   ├─ yes -> save
  │   └─ no -> log an error
\`\`\`

### Incremental collection

\`\`\`
1. Read existing data (Excel file)
2. Collect new data
3. Dedup
4. Append new data
5. Export the updated file
\`\`\`

### Large volumes

- Collect in batches, export each batch
- Avoid excessive memory use
- Clear the data table periodically

---

## Common issues

### Excel reads garbled text

**Cause**: encoding issue
**Fix**: ensure the Excel file is standard, avoid special characters

### Data loss

**Cause**: the workflow was interrupted before saving
**Fix**: export periodically; use the "Export table" module to auto-save

### Column names don't match

**Cause**: Excel column names differ from your code
**Fix**: check the column names in the first Excel row and match them exactly

### Numbers become text

**Cause**: Excel cell format
**Fix**: set the correct cell format in Excel

---

## Excel automation modules (read/write .xlsx directly, via openpyxl)

Besides "upload asset + Read Excel", WebRPA provides a full set of modules to **operate local .xlsx files directly** (the "Excel Automation" sidebar category) — no upload needed, just a file path, covering almost everything openpyxl can do.

### Workbook & sheets
| Module | Use |
|------|------|
| Create Excel | New workbook (can name multiple sheets) |
| Add/delete/rename sheet | Manage sheets |
| Copy / move sheet | Copy / reorder |
| List sheets / get table info | Sheet names / row-column dimensions |
| Activate sheet / sheet tab color | Default sheet / tab color |
| Clear sheet / save-as Excel | Clear content / copy to a new path |

### Cells & ranges
| Module | Use |
|------|------|
| Write/read cell | Single-cell read/write (e.g. A1) |
| Write/read range | 2D array batch read/write |
| Write/read dict array | Structured read/write with headers (most common) |
| Append row / fill / copy range / clear range | Append, fill/copy/clear ranges |
| Find & replace / count rows | Text replace / count rows |
| Get first empty row/column/cell | Find an append position |

### Rows/columns / formulas / styles
| Module | Use |
|------|------|
| Insert/delete rows, columns | Add/remove rows/columns |
| Hide rows/columns / set height/width / freeze panes | Show/hide, size, freeze |
| Set formula / read formula or computed value | Write =SUM(...) / read formula or cached value |
| Merge cells / set style / set border | Merge, font/color/align, borders |
| Number format / clear style | Date/currency/percent format / clear style |

### Advanced
| Module | Use |
|------|------|
| Insert image / insert chart | Images, bar/line/pie charts, etc. |
| Data validation / conditional formatting | Dropdowns/value limits / highlight rules, color scales, data bars |
| AutoFilter / sort range / remove duplicate rows | Filter, sort by column, dedup |
| Pivot table | Group-aggregate by field into a summary |
| Export CSV / CSV to Excel | Convert to/from CSV |
| Protect sheet / page setup / view zoom | Encryption / print orientation / zoom & gridlines |
| Export to PDF / run Excel macro / refresh Excel data | Via Excel/WPS (needs Office/WPS installed, Windows only) |

> Note: Export PDF, run macro and refresh data operate the real Excel/WPS app via COM and need Office or WPS installed; all other modules are pure file operations and need no Office.

---

## Data-table performance (large volumes)

The bottom "Data table" uses **virtual scrolling** — no matter how many records (tens of thousands stay smooth), the DOM only renders the visible rows.

- **Show all**: no preview-count limit; shows everything collected.
- **Live fill**: data is pushed to the table in batches during a run.
- **Full download**: "Download data" in the top-right exports **all** collected data (not just the visible part), even beyond the preview.
---

## WPS Bitable

A counterpart to Feishu Bitable, integrating the multidimensional table (dbsheet) capability of the Kingsoft WPS open platform (open.wps.cn). Create an app on the WPS open platform first to get the AK / SK.

| Module | Description |
|------|------|
| **wps_bitable_write** | Write records into a bitable |
| **wps_bitable_read** | Read all records from a bitable (auto-paging) |

Common parameters: AK, SK, file ID (fileId), sheet ID (sheetId); baseUrl can be tuned per the platform docs, default https://openapi.wps.cn .

Write supports two data sources: manual fields, or from a variable (a dict writes one record, a list of dicts writes in bulk). Read auto-pages 200 records per page and stores all records into the result variable (default wps_data).
`
