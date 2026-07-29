export const wordContentEn = `# Word Automation Guide

WebRPA's Word automation is built on the **Word COM interface** (not python-docx), so it can
express real Word semantics such as cursor position, current selection and WYSIWYG formatting,
and it also supports PDF export.

Either **Microsoft Word** or **WPS Office** works. WebRPA picks whichever engine is available
and reports the actual one in the logs (e.g. "engine: Microsoft Word").

## Core pattern: open once, then chain modules

Word modules are session based. A typical chain:

\`\`\`
Open/New Word  →  Replace Word Text  →  Save Word  →  Close Word
\`\`\`

"Open/New Word" creates a document session, and every later Word module refers to the same
document through its **document key (docKey)**. When you only handle one document, keep the
default \`default\` and forget about it.

> Only "Open/New Word" creates a session. Using any other Word module first reports
> "no Word document is currently open" — just add an "Open/New Word" ahead of it.

### Working with several documents at once

Give each document its own key:

\`\`\`
Open/New Word (docKey: src, path: D:\\\\source.docx)
Open/New Word (docKey: dst, path: D:\\\\target.docx)
Read Word Text (docKey: src) → variable word_text
Write Text to Word (docKey: dst, content: {word_text})
Close Word (check "close all open Word documents")
\`\`\`

## Module list

| Module | Description |
|------|------|
| Open/New Word | Creates the session. Opens the file if it exists, otherwise creates it (can be disabled) |
| Read Word Text | Whole text / all paragraphs (list) / a given paragraph / current selection |
| Write Text to Word | Append at end / insert at cursor / replace all, with font, size, bold, italic |
| Set Word Cursor | Document start, end, a given paragraph, or found text (optionally selected) |
| Move Word Cursor | Move by character/word/sentence/line/paragraph, optionally extending the selection |
| Replace Word Text | Find and replace, supports whole word, case sensitivity and wildcards |
| Read Word Table | Reads a table as a 2D array, or as dict rows using the first row as header |
| Insert Word Table | Fills from a 2D array / dict list, or inserts an empty table by rows and columns |
| Insert Image into Word | Inserts at cursor or end, with optional width, height and centering |
| Insert Hyperlink into Word | Inserts a link with display text and screen tip |
| Save Word | Saves in place, or to a new file via "save as path" |
| Word to PDF | Exports the open document, or converts a source file directly (no need to open it) |
| Close Word | Closes the document and quits the engine process, optionally saving changes |

## When the document is locked

Word/WPS creates a hidden lock file \`~$name.docx\` next to the document while it is open.
WebRPA checks this before opening, and handles two cases very differently:

- **The document really is open in another Word/WPS window**: follows the "when document is
  locked" setting. The default falls back to read-only so read flows keep working; choosing
  "fail and stop" makes it fail immediately.
- **Only a stale lock file left by a previous crash** (the file is actually writable): the
  stale lock file is removed and the document is opened for writing as you intended. The log
  says "removed the stale lock file left by a previous crash".

> When a document is open read-only, the write modules (replace / write / insert table /
> insert image / insert hyperlink) **fail with a clear error** instead of pretending to
> succeed, because edits on a read-only document never reach the disk.

## Troubleshooting

**Replace reports success but the file is unchanged?**
First confirm the document was not opened read-only (search the log for "read-only"). Then
check whether the document is protected via Review → Restrict Editing. The replace module
verifies the result afterwards and raises an error when nothing actually changed, so it never
passes silently.

**"Open/New Word" hangs for a long time?**
Starting the Word process for the first time is simply slow (the default timeout is 2 minutes).
If it hangs indefinitely, Word usually popped up a modal dialog (file in use, password needed,
format conversion confirmation). The log prints "starting Word / WPS" and "engine ready,
opening document" separately so you can tell which step is stuck.

**PDF export fails?**
The free personal edition of WPS restricts PDF export over COM. Alternative: save as .docx
with "Save Word", then convert with "Universal Document Convert"; or install Microsoft Word.

**Will a Word process leak if the workflow fails midway?**
No. When the workflow ends (including failure, stop and timeout) sessions are cleaned up
automatically: writable documents already on disk are saved and closed, while read-only
documents and never-saved new documents are closed without saving (so no "Save As" dialog can
block the cleanup), and the engine process is confirmed to have exited.

**Saving a new document reports "not yet saved to disk"?**
Leaving the path empty in "Open/New Word" creates an unnamed document with no location on
disk. Use "Save Word" with a "save as path", or set the file path in "Open/New Word".

## Example: filling a contract template in bulk

\`\`\`
Read Excel (D:\\\\customers.xlsx) → variable rows
For Each (rows)
  ├─ Open/New Word (path: D:\\\\template.docx)
  ├─ Replace Word Text (find: {{customer}}, replace: {item[name]})
  ├─ Replace Word Text (find: {{amount}}, replace: {item[amount]})
  ├─ Save Word (save as path: D:\\\\contracts\\\\{item[name]}.docx)
  └─ Close Word (do not save changes)
\`\`\`

Key points: use "save as path" to write a new file so the template itself stays untouched, and
close the document on every iteration, otherwise sessions and Word processes pile up.
`
