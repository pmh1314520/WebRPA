export const utilsGuideContentEn = `# 🛠️ Utilities

This chapter covers WebRPA's utility modules: file comparison, encryption, encoding, color conversion, UUID, printing and more.

---

## 🔐 Encryption & hashing

### MD5 (md5_encrypt)

Compute the MD5 hash of a string or file — for integrity checks or password handling.

| Parameter | Description | Example |
|------|------|------|
| Input type | String / file | String |
| Input | The text or file path | \`Hello WebRPA\` |
| Uppercase | Output uppercase hash | No |
| Result variable | Saves the MD5 | \`md5_hash\` |

---

### SHA (sha_encrypt)

Compute SHA-family hashes (SHA-1, SHA-256, SHA-512).

| Parameter | Description |
|------|------|
| Algorithm | sha1 / sha256 / sha512 |
| Input | String or file path |
| Result variable | Saves the hash |

---

### Base64 (base64)

Base64-encode or -decode a string or file.

| Parameter | Description | Example |
|------|------|------|
| Operation | encode / decode | \`encode\` |
| Input | String content | \`Hello\` |
| Result variable | Saves the result | \`base64_result\` |

---

## 🔗 URL encode/decode (url_encode_decode)

Encode (escape special characters) or decode a URL string.

| Parameter | Description | Example |
|------|------|------|
| Operation | encode / decode | \`encode\` |
| Input URL | The URL or parameter to process | \`hello world\` |
| Result variable | The result | \`url_result\` |

**Example**: \`你好\` → \`%E4%BD%A0%E5%A5%BD\`

---

## 📁 File comparison

### File hash compare (file_hash_compare)

Compare two files' hashes to see if their content is identical.

| Parameter | Description |
|------|------|
| File 1 path | First file |
| File 2 path | Second file |
| Hash algorithm | md5 / sha256 |
| Result variable | True (same) / False (different) |

---

### File diff compare (file_diff_compare)

Compare two text files line by line, returning the diff lines.

| Parameter | Description |
|------|------|
| File 1 path | Original file |
| File 2 path | Comparison file |
| Result variable | List of diff lines |

---

### Folder hash compare (folder_hash_compare)

Compare hashes of all files in two folders to find added, removed and modified files.

| Parameter | Description |
|------|------|
| Folder 1 | Original folder |
| Folder 2 | Comparison folder |
| Result variable | A dict with added/removed/modified lists |

---

### Folder diff compare (folder_diff_compare)

Deeply compare the file lists of two folders.

| Parameter | Description |
|------|------|
| Folder 1/2 | The two folders to compare |
| Result variable | A diff-info dict |

---

## 🎲 Random generation

### Random password (random_password_generator)

Generate a random password with a customizable character set and length.

| Parameter | Description | Example |
|------|------|------|
| Length | Password length | \`16\` |
| Include uppercase | A-Z | Yes |
| Include lowercase | a-z | Yes |
| Include digits | 0-9 | Yes |
| Include symbols | special chars | Yes |
| Result variable | Saves the password | \`random_password\` |

---

### UUID generator (uuid_generator)

Generate a globally unique identifier (UUID) — for unique IDs.

| Parameter | Description | Example |
|------|------|------|
| Version | uuid4 (random) / uuid1 (timestamp) | \`uuid4\` |
| Format | Standard (with hyphens) / no hyphens | Standard |
| Result variable | Saves the UUID | \`uuid\` |

**Example result**: \`550e8400-e29b-41d4-a716-446655440000\`

---

## 🕐 Timestamp converter (timestamp_converter)

Convert between Unix timestamps and readable time strings.

| Parameter | Description | Example |
|------|------|------|
| Direction | timestamp→string / string→timestamp | timestamp→string |
| Input | A timestamp or time string | \`1700000000\` |
| Time format | Python strftime format | \`%Y-%m-%d %H:%M:%S\` |
| Time zone | Time-zone name | \`Asia/Shanghai\` |
| Result variable | Saves the result | \`converted_time\` |

---

## 🎨 Color conversion

### RGB to HSV (rgb_to_hsv)

Convert an RGB color to HSV (hue/saturation/value).

| Parameter | Description | Example |
|------|------|------|
| R/G/B | Red/green/blue (0-255) | \`255, 128, 0\` |
| Result variable | Saves the HSV dict | \`hsv_color\` |

---

### RGB to CMYK (rgb_to_cmyk)

Convert RGB to print-oriented CMYK.

| Parameter | Description |
|------|------|
| R/G/B | Color components |
| Result variable | Saves the CMYK dict (c/m/y/k each 0-100) |

---

### HEX to CMYK (hex_to_cmyk)

Convert a hex color (e.g. \`#FF8000\`) to CMYK.

| Parameter | Description |
|------|------|
| HEX color | A hex color string (with or without #) |
| Result variable | Saves the CMYK dict |

---

## 🖨️ Printer (printer_call)

Send a file to a printer.

| Parameter | Description | Example |
|------|------|------|
| File path | The file to print (PDF/image/text) | \`C:\\report.pdf\` |
| Printer name | Blank uses the default | \`HP LaserJet\` |
| Copies | Number of copies | \`1\` |

---

## 💡 Tips

### File-integrity workflow

\`\`\`mermaid
flowchart TD
    A[Download file] --> B[Compute MD5]
    B --> C{Matches expected MD5?}
    C --Yes--> D[File OK, continue]
    C --No--> E[File corrupted, re-download]
\`\`\`

### Periodic backup comparison

Before each backup, use "Folder hash compare" to find changed files and back up only the modified content, saving time and storage.`
