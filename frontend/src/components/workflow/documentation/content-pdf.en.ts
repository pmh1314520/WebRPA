export const pdfGuideContentEn = `# 📄 PDF Processing Guide

This chapter introduces various PDF file processing features, including format conversion, merge/split, encrypt/decrypt, watermarking, and more.

---

## 📋 Module Overview

| Module | Function | Default Timeout |
|------|------|----------|
| PDF to Image | Convert PDF pages to images | 5 min |
| Image to PDF | Combine multiple images into a PDF | 5 min |
| PDF Merge | Merge multiple PDF files | 5 min |
| PDF Split | Split a PDF into multiple files | 5 min |
| PDF Extract Text | Extract text from a PDF | 2 min |
| PDF Extract Images | Extract images from a PDF | 5 min |
| PDF Encrypt | Add password protection to a PDF | 2 min |
| PDF Decrypt | Remove PDF password protection | 2 min |
| PDF Add Watermark | Add a text or image watermark | 5 min |
| PDF Rotate | Rotate PDF pages | 2 min |
| PDF Delete Pages | Delete specified pages | 2 min |
| PDF Get Info | Get PDF metadata | 30 s |
| PDF Compress | Compress a PDF to reduce size | 5 min |
| PDF Insert Pages | Insert pages from another PDF | 2 min |
| PDF Reorder Pages | Adjust page order | 2 min |
| PDF to Word | Convert a PDF to a Word document | 10 min |
| Word to PDF | Convert a Word document to a PDF | 5 min |

---

## 🖼️ PDF to Image

Convert each page of a PDF into a separate image file.

### Configuration

| Parameter | Description | Default |
|------|------|--------|
| PDF file path | Source PDF file | - |
| Output directory | Directory to save images | PDF's directory |
| DPI | Image resolution | 150 |
| Image format | png/jpg/webp | png |
| Page range | Specify the pages to convert | All |
| Result variable | Saves the image path list | - |

### DPI Reference

| DPI | Effect | Use Case |
|-----|------|----------|
| 72 | Low resolution | Preview, thumbnail |
| 150 | Standard resolution | Daily use (recommended) |
| 300 | High resolution | Printing, HD needs |
| 600 | Ultra-high resolution | Professional printing |

### Example

\`\`\`
Convert the whole PDF:
  PDF file: D:/documents/report.pdf
  Output directory: D:/images/report
  DPI: 150
  Format: png
  Result variable: image list

Convert specified pages:
  PDF file: D:/documents/book.pdf
  Page range: 1-5
  DPI: 300
  Result variable: cover images
\`\`\`

---

## 📷 Image to PDF

Combine multiple images into a single PDF file.

### Configuration

| Parameter | Description | Default |
|------|------|--------|
| Image list | Image path list or comma-separated paths | - |
| Output PDF path | Path of the generated PDF file | - |
| Page size | A4/A3/Letter/Original size | A4 |
| Result variable | Saves the PDF path | - |

### Example

\`\`\`
Combine scans into a PDF:
  Image list: {scanned image list}
  Output path: D:/documents/scanned.pdf
  Page size: A4
  Result variable: PDF path

Specify images manually:
  Image list: D:/img/1.jpg,D:/img/2.jpg,D:/img/3.jpg
  Output path: D:/output/combined.pdf
\`\`\`

---

## 🔗 PDF Merge

Merge multiple PDF files into one.

### Configuration

| Parameter | Description |
|------|------|
| PDF file list | PDF path list or comma-separated paths |
| Output PDF path | Path of the merged PDF file |
| Result variable | Saves the result path |

### Example

\`\`\`
Merge reports:
  PDF list: {report list}
  Output path: D:/documents/full_report.pdf
  Result variable: merge result

Specify files manually:
  PDF list: D:/pdf/part1.pdf,D:/pdf/part2.pdf,D:/pdf/part3.pdf
  Output path: D:/pdf/complete.pdf
\`\`\`

---

## ✂️ PDF Split

Split a PDF into multiple separate files.

### Configuration

| Parameter | Description |
|------|------|
| PDF file path | Source PDF file |
| Output directory | Directory to save split files |
| Split mode | One PDF per page / Split by range |
| Page range | Page range in range mode |
| Result variable | Saves the split file path list |

### Split Modes

| Mode | Description |
|------|------|
| One PDF per page | Generate a separate PDF for each page |
| Split by range | Split by specified ranges, e.g. 1-3,4-6,7-10 |

### Example

\`\`\`
Split per page:
  PDF file: D:/documents/book.pdf
  Output directory: D:/documents/pages
  Split mode: One PDF per page
  Result variable: page list

Split by chapter:
  PDF file: D:/documents/manual.pdf
  Split mode: Split by range
  Page range: 1-10,11-25,26-40
  Result variable: chapter list
\`\`\`

---

## 📝 PDF Extract Text

Extract the text content from a PDF.

### Configuration

| Parameter | Description |
|------|------|
| PDF file path | Source PDF file |
| Page range | Specify the pages to extract |
| Save to file | Optional, save as a text file |
| Result variable | Saves the extracted text |

### Example

\`\`\`
Extract all text:
  PDF file: D:/documents/article.pdf
  Result variable: article content

Extract specified pages:
  PDF file: D:/documents/book.pdf
  Page range: 1-5
  Save to file: D:/output/intro.txt
  Result variable: intro text
\`\`\`

### ⚠️ Notes

- Scanned PDFs need OCR first before text can be extracted
- The extracted result may contain formatting characters
- Extraction from PDFs with complex layouts may be unsatisfactory

---

## 🖼️ PDF Extract Images

Extract images embedded in a PDF.

### Configuration

| Parameter | Description | Default |
|------|------|--------|
| PDF file path | Source PDF file | - |
| Output directory | Directory to save images | PDF's directory |
| Minimum size | Threshold to filter out small images | 100 px |
| Result variable | Saves the image path list | - |

### Example

\`\`\`
Extract all images:
  PDF file: D:/documents/catalog.pdf
  Output directory: D:/images/catalog
  Minimum size: 100
  Result variable: image list

Extract only large images:
  PDF file: D:/documents/magazine.pdf
  Minimum size: 500
  Result variable: large image list
\`\`\`

---

## 🔐 PDF Encrypt

Add password protection to a PDF.

### Configuration

| Parameter | Description |
|------|------|
| PDF file path | Source PDF file |
| Output path | Path of the encrypted PDF |
| Open password | Password required to open the PDF |
| Permissions password | Password required to change permissions |
| Permission settings | Allow print/copy/modify |
| Result variable | Saves the result path |

### Permissions

| Permission | Description |
|------|------|
| Allow print | Whether printing the document is allowed |
| Allow copy | Whether copying text is allowed |
| Allow modify | Whether editing the document is allowed |

### Example

\`\`\`
Add an open password:
  PDF file: D:/documents/confidential.pdf
  Output path: D:/documents/confidential_encrypted.pdf
  Open password: mypassword123
  Allow print: Yes
  Allow copy: No
  Result variable: encrypted file

Full protection:
  PDF file: D:/documents/secret.pdf
  Open password: open123
  Permissions password: admin456
  Allow print: No
  Allow copy: No
  Allow modify: No
\`\`\`

---

## 🔓 PDF Decrypt

Remove the password protection from a PDF.

### Configuration

| Parameter | Description |
|------|------|
| PDF file path | The encrypted PDF file |
| Password | The PDF's password |
| Output path | Path of the decrypted PDF |
| Result variable | Saves the result path |

### Example

\`\`\`
Decrypt a PDF:
  PDF file: D:/documents/encrypted.pdf
  Password: mypassword123
  Output path: D:/documents/decrypted.pdf
  Result variable: decrypted file
\`\`\`

---

## 💧 PDF Add Watermark

Add a text or image watermark to a PDF.

### Configuration

| Parameter | Description | Default |
|------|------|--------|
| PDF file path | Source PDF file | - |
| Watermark type | Text watermark / Image watermark | Text |
| Watermark content | Text or image path | - |
| Opacity | 0.1-1.0 | 0.3 |
| Rotation angle | -180 to 180 degrees | 45 |
| Position | Center/Tile/Corners | Center |
| Output path | The watermarked PDF | - |
| Result variable | Saves the result path | - |

### Watermark Position

| Position | Description |
|------|------|
| Center | The watermark is shown in the center of the page |
| Tile | The watermark repeats to fill the entire page |
| Top left | The watermark is shown in the top-left corner |
| Top right | The watermark is shown in the top-right corner |
| Bottom left | The watermark is shown in the bottom-left corner |
| Bottom right | The watermark is shown in the bottom-right corner |

### Example

\`\`\`
Add a text watermark:
  PDF file: D:/documents/report.pdf
  Watermark type: Text watermark
  Watermark content: Confidential
  Opacity: 0.3
  Rotation angle: 45
  Position: Tile
  Result variable: watermarked file

Add a logo watermark:
  PDF file: D:/documents/contract.pdf
  Watermark type: Image watermark
  Watermark content: D:/images/logo.png
  Opacity: 0.5
  Position: Bottom right
  Result variable: watermarked file
\`\`\`

---

## 🔄 PDF Rotate

Rotate the page orientation of a PDF.

### Configuration

| Parameter | Description |
|------|------|
| PDF file path | Source PDF file |
| Rotation angle | 90°/180°/270° |
| Page range | Specify the pages to rotate |
| Output path | Path of the rotated PDF |
| Result variable | Saves the result path |

### Example

\`\`\`
Rotate all pages:
  PDF file: D:/documents/scan.pdf
  Rotation angle: Clockwise 90°
  Result variable: rotated file

Rotate specified pages:
  PDF file: D:/documents/mixed.pdf
  Rotation angle: 180°
  Page range: 2,4,6
  Result variable: rotated file
\`\`\`

---

## 🗑️ PDF Delete Pages

Delete specified pages from a PDF.

### Configuration

| Parameter | Description |
|------|------|
| PDF file path | Source PDF file |
| Pages to delete | Page numbers, e.g. 1,3,5 or 2-4 |
| Output path | Path of the resulting PDF |
| Result variable | Saves the result path |

### Example

\`\`\`
Delete the cover:
  PDF file: D:/documents/book.pdf
  Pages to delete: 1
  Result variable: cover-less version

Delete multiple pages:
  PDF file: D:/documents/report.pdf
  Pages to delete: 1,3,5-8
  Result variable: trimmed version
\`\`\`

---

## ℹ️ PDF Get Info

Get the metadata of a PDF file.

### Configuration

| Parameter | Description |
|------|------|
| PDF file path | Source PDF file |
| Result variable | Saves the info object |

### Returned Info

\`\`\`json
{
  "pageCount": 10,
  "title": "Document title",
  "author": "Author",
  "subject": "Subject",
  "creator": "Creator program",
  "producer": "PDF generator",
  "creationDate": "2024-01-15",
  "modificationDate": "2024-01-20",
  "encrypted": false,
  "fileSize": "1.5 MB"
}
\`\`\`

### Example

\`\`\`
Get PDF info:
  PDF file: D:/documents/report.pdf
  Result variable: PDF info

Print log: Pages: {PDF info.pageCount}
Print log: Author: {PDF info.author}
\`\`\`

---

## 📦 PDF Compress

Compress a PDF file to reduce its size.

### Configuration

| Parameter | Description | Default |
|------|------|--------|
| PDF file path | Source PDF file | - |
| Compression quality | High/Medium/Low | Medium |
| Output path | Path of the compressed PDF | - |
| Result variable | Saves the result path | - |

### Compression Quality

| Quality | Description |
|------|------|
| High quality | Low compression ratio, preserves good quality |
| Medium quality | Balances compression ratio and quality |
| Low quality | High compression ratio, with quality loss |

### Example

\`\`\`
Compress a PDF:
  PDF file: D:/documents/large.pdf
  Compression quality: Medium quality
  Output path: D:/documents/compressed.pdf
  Result variable: compressed file
\`\`\`

---

## ➕ PDF Insert Pages

Insert pages from another PDF into a target PDF.

### Configuration

| Parameter | Description |
|------|------|
| Target PDF file | The PDF to insert pages into |
| PDF to insert | The PDF that provides the pages |
| Insert position | After which page to insert |
| Page range to insert | Specify which pages to insert |
| Output path | Path of the resulting PDF |
| Result variable | Saves the result path |

### Example

\`\`\`
Insert a cover:
  Target PDF: D:/documents/content.pdf
  PDF to insert: D:/documents/cover.pdf
  Insert position: 0  # Insert at the beginning
  Result variable: complete document

Insert an appendix:
  Target PDF: D:/documents/main.pdf
  PDF to insert: D:/documents/appendix.pdf
  Insert position: 10  # Insert after page 10
  Page range to insert: 1-5
  Result variable: complete document
\`\`\`

---

## 🔀 PDF Reorder Pages

Adjust the order of PDF pages.

### Configuration

| Parameter | Description |
|------|------|
| PDF file path | Source PDF file |
| New page order | Page number order, e.g. 3,1,2,5,4 |
| Output path | Path of the reordered PDF |
| Result variable | Saves the result path |

### Example

\`\`\`
Adjust page order:
  PDF file: D:/documents/report.pdf
  New page order: 3,1,2,5,4
  Result variable: reordered file

Reverse order:
  PDF file: D:/documents/book.pdf
  New page order: 10,9,8,7,6,5,4,3,2,1
  Result variable: reversed file
\`\`\`

---

## 📝 PDF to Word

Convert a PDF file into an editable Word document.

### Configuration

| Parameter | Description | Default |
|------|------|--------|
| PDF file path | Source PDF file | - |
| Output directory | Directory to save the Word file | PDF's directory |
| Output format | docx/doc | docx |
| Page range | Specify the pages to convert | All |
| Result variable | Saves the Word file path | - |

### Example

\`\`\`
Convert the whole PDF:
  PDF file: D:/documents/report.pdf
  Output directory: D:/documents
  Output format: docx
  Result variable: Word file

Convert specified pages:
  PDF file: D:/documents/book.pdf
  Page range: 1-10
  Result variable: Word file
\`\`\`

### ⚠️ Notes

- The conversion quality depends on the complexity of the PDF
- Scanned PDFs convert poorly
- Complex layouts may not be perfectly reproduced
- First-time use requires installing the pdf2docx library

---

## 📄 Word to PDF

Convert a Word document into a PDF file.

### Configuration

| Parameter | Description | Default |
|------|------|--------|
| Word file path | Source Word file (.docx/.doc) | - |
| Output directory | Directory to save the PDF file | Word's directory |
| Result variable | Saves the PDF file path | - |

### Example

\`\`\`
Convert Word to PDF:
  Word file: D:/documents/report.docx
  Output directory: D:/documents
  Result variable: PDF file
\`\`\`

### ⚠️ Notes

- Requires Microsoft Word or LibreOffice installed on the system
- The conversion preserves the original formatting and layout
- Supports .docx and .doc formats

---

## 💡 PDF Processing Tips

### 1. Batch Processing

\`\`\`
Get file list: D:/pdfs/*.pdf → {PDF list}
Iterate list: {PDF list}
  PDF compress:
    Input: {current item}
    Output: {current item}_compressed.pdf
    Quality: Medium
\`\`\`

### 2. Document Archiving Flow

\`\`\`
# 1. Get PDF info
PDF get info: {PDF file} → {info}

# 2. Add watermark
PDF add watermark:
  File: {PDF file}
  Watermark: Archived file - {info.creationDate}
  Position: Bottom right

# 3. Encrypt and protect
PDF encrypt:
  File: {watermarked file}
  Password: archive2024
  Allow print: Yes
  Allow copy: No
\`\`\`

### 3. Scanned Document Processing

\`\`\`
# 1. PDF to image
PDF to image: {scanned PDF} → {image list}

# 2. Image OCR recognition
Iterate list: {image list}
  Image OCR: {current item} → {text}
  String concat: {all text} + {text}

# 3. Save the recognition result
Write text file: {all text} → D:/output/ocr_result.txt
\`\`\``
