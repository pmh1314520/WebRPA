export const filesGuideContentEn = `# File Operations Guide

This chapter covers operations on files and folders.

---

## Module overview

| Module | Function | Default timeout |
|------|------|----------|
| List files | List files in a directory | 30s |
| Copy file | Copy a file to a new location | 5 min |
| Move file | Move a file to a new location | 5 min |
| Delete file | Delete a file | 30s |
| Create folder | Create a new directory | 10s |
| File exists | Check whether a file exists | 5s |
| Get file info | Get size, times, etc. | 10s |
| Read text file | Read a text file's content | 1 min |
| Write text file | Write content to a text file | 1 min |
| Rename file | Rename a file | 10s |
| Rename folder | Rename a folder | 10s |

---

## List files

List all files and folders in a directory.

| Parameter | Description |
|------|------|
| Directory path | The directory to list |
| File filter | e.g. *.txt, *.jpg |
| Include subdirectories | Whether to recurse |
| Save to variable | Variable for the file list |

### Filter patterns

| Pattern | Meaning | Example |
|------|------|------|
| \`*\` | All files | \`*\` |
| \`*.txt\` | A specific extension | \`*.jpg\`, \`*.mp4\` |
| \`report_*\` | A prefix | \`data_*.csv\` |
| \`*_2024*\` | Contains a keyword | \`*backup*\` |

### Example

\`\`\`
Get all images:
  Directory: D:/images
  Filter: *.jpg,*.png,*.gif
  Save to: imageList

Get today's files:
  Directory: D:/downloads
  Filter: *{todayDate}*
  Save to: todayFiles
\`\`\`

### Return value

A list of full file paths:
\`\`\`json
[
  "D:/images/photo1.jpg",
  "D:/images/photo2.jpg",
  "D:/images/subfolder/photo3.jpg"
]
\`\`\`

---

## Copy file

Copy a file to a new location.

| Parameter | Description |
|------|------|
| Source file | The file to copy |
| Target path | Where to copy it |
| Overwrite | Overwrite if the target exists |

### Example

\`\`\`
Back up a config:
  Source: D:/app/config.json
  Target: D:/backup/config_backup.json
  Overwrite: yes

Copy to a new dir:
  Source: {currentFile}
  Target: D:/processed/{fileName}
\`\`\`

### Batch copy

\`\`\`
List files: D:/source/*.txt -> {fileList}
Iterate: {fileList}
  Copy file:
    Source: {item}
    Target: D:/backup/{fileName}
\`\`\`

---

## Move file

Move a file to a new location (the original is removed).

| Parameter | Description |
|------|------|
| Source file | The file to move |
| Target path | Where to move it |
| Overwrite | Overwrite if the target exists |

### Example

\`\`\`
Organize downloads:
  Source: D:/downloads/report.pdf
  Target: D:/documents/reports/report.pdf

Archive by date:
  Source: {currentFile}
  Target: D:/archive/{year}/{month}/{fileName}
\`\`\`

---

## Delete file

Delete a file.

| Parameter | Description |
|------|------|
| File path | The file to delete |
| To recycle bin | Move to the recycle bin instead of permanent delete |

### Notes

- Deletion is irreversible (unless using the recycle bin)
- Back up important files first
- Combine with the "File exists" module

### Example

\`\`\`
Delete a temp file:
  File: D:/temp/cache.tmp
  Recycle bin: no

Safe delete:
  File exists: {filePath}
  Condition: {fileExists}
    ├─ yes -> Delete file: {filePath}
    └─ no -> Print log: file does not exist
\`\`\`

---

## Create folder

Create a new directory.

| Parameter | Description |
|------|------|
| Folder path | The directory path to create |
| Recursive | Whether to create multiple levels |

### Example

\`\`\`
Create an output dir:
  Path: D:/output/2024/01
  Recursive: yes  # auto-creates output, 2024, 01

Create a dated dir:
  Get time -> {today}
  Create folder: D:/data/{today}
\`\`\`

---

## File exists

Check whether a file or folder exists.

| Parameter | Description |
|------|------|
| Path | The file/folder path to check |
| Save to variable | Variable for the result (true/false) |

### Example

\`\`\`
Check a config file:
  Path: D:/app/config.json
  Save to: configExists

Condition: {configExists}
  ├─ yes -> read the config
  └─ no -> use defaults
\`\`\`

---

## Get file info

Get detailed info about a file.

| Parameter | Description |
|------|------|
| File path | The file to inspect |
| Save to variable | Variable for the info |

### Returned info

\`\`\`json
{
  "name": "report.pdf",
  "path": "D:/documents/report.pdf",
  "size": 1048576,
  "sizeFormatted": "1.00 MB",
  "extension": ".pdf",
  "createdTime": "2024-01-15 10:30:00",
  "modifiedTime": "2024-01-15 14:20:00",
  "isFile": true,
  "isDirectory": false
}
\`\`\`

### Example

\`\`\`
Check the file size:
  Get file info: D:/downloads/video.mp4 -> {fileInfo}
  Condition: {fileInfo.size} > 104857600  # 100MB
    ├─ yes -> Print log: too large, compress it
    └─ no -> continue
\`\`\`

---

## Read text file

Read a text file's content.

| Parameter | Description |
|------|------|
| File path | The file to read |
| Encoding | File encoding (UTF-8/GBK, etc.) |
| Save to variable | Variable for the content |

### Supported encodings

- UTF-8 (recommended)
- GBK/GB2312 (Chinese Windows)
- ASCII
- UTF-16

### Example

\`\`\`
Read a config:
  File: D:/app/config.json
  Encoding: UTF-8
  Save to: configText

JSON parse: {configText} -> {configObj}
\`\`\`

---

## Write text file

Write content to a text file.

| Parameter | Description |
|------|------|
| File path | The file to write |
| Content | The text to write |
| Encoding | File encoding |
| Write mode | Overwrite / append |

### Write modes

| Mode | Description |
|------|------|
| Overwrite | Clear the file, then write |
| Append | Add at the end |

### Example

\`\`\`
Save scrape result:
  File: D:/output/result.txt
  Content: {scrapedData}
  Mode: overwrite

Append a log:
  File: D:/logs/app.log
  Content: [{time}] {logContent}\\n
  Mode: append
\`\`\`

---

## Rename file/folder

Rename a file or folder.

| Parameter | Description |
|------|------|
| Old path | The original file/folder path |
| New name | The new name |

### Example

\`\`\`
Add a date suffix:
  Old path: D:/reports/report.pdf
  New name: report_2024-01-15.pdf

Batch rename:
  Iterate: {fileList}
    Set variable: {seq} = {loopIndex} + 1
    Rename file:
      Old path: {item}
      New name: image_{seq}.jpg
\`\`\`

---

## File operation tips

### 1. Join paths

\`\`\`
Set variable: {base} = D:/data
Set variable: {fileName} = report.txt
Set variable: {fullPath} = {base}/{fileName}
\`\`\`

### 2. Extract a file name

\`\`\`
# Extract the file name from a full path
Regex extract: {fullPath}
  Pattern: [^/\\\\]+$
  Save to: {fileName}
\`\`\`

### 3. Safe-operation flow

\`\`\`
# 1. Check the source
File exists: {source} -> {srcExists}
Condition: {srcExists} == false
  └─ yes -> Print log: source missing, skip

# 2. Ensure the target dir exists
Create folder: {targetDir}

# 3. Check the target
File exists: {targetFile} -> {tgtExists}
Condition: {tgtExists}
  └─ yes -> Print log: target exists, skip

# 4. Do the operation
Copy file: {source} -> {targetFile}
\`\`\`

### 4. Batch-processing template

\`\`\`
# Get files to process
List files: {inputDir}/*.jpg -> {fileList}
Print log: found {fileList.length} files

# Create the output dir
Create folder: {outputDir}

# Iterate
Iterate: {fileList}
  # Extract the file name
  Regex extract: {item} -> {fileName}
  
  # Process the file
  Compress image:
    Input: {item}
    Output: {outputDir}/{fileName}
  
  # Log progress
  Print log: processed {loopIndex + 1}/{fileList.length}

Print log: batch processing done!
\`\`\``
