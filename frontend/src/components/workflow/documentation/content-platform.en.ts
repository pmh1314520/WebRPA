export const platformGuideContentEn = `# Platform Features (export / credentials / versions / remote storage)

This chapter gathers WebRPA's platform-level capabilities: export workflows as scripts or bundles, store secrets encrypted, version history and playback, WebDAV remote storage, custom shortcuts, AI permissions and more.

---

## Recently added — quick look

- **One-click package to standalone EXE**: compile any workflow into a Windows executable that runs on double-click — the recipient needs neither WebRPA nor Python. Supports custom name, icon and portable/shared modes; see below.
- **Version history (with global variables)**: Git-style local snapshots recording nodes, edges and **global variables**; restore/compare anytime. The AI assistant auto-snapshots before big changes.
- **WebDAV remote storage**: configure WebDAV under Global settings -> Storage; workflows can save/read to NAS, Nextcloud, Jianguoyun, etc. for multi-device sharing.
- **Auto-copy for same-name workflows**: when on, saving over a same-name workflow auto-saves a timestamped copy instead of overwriting.
- **AI permissions (3 levels)**: per-action confirm / smart auto / full access; the AI asks for approval by risk before acting, and rejecting won't abort the task.
- **Never a blank screen**: a global error boundary catches any module exception and shows an error card (with details and one-click AI diagnosis).
- **Custom shortcuts**: bind key combos to run/stop/save/new and other common actions under Global settings -> System.
- **DrissionPage anti-detection modules**: the dp_ series drives a real browser kernel to bypass risk-control sites more easily.
- **Plugin market**: browse/install third-party plugins under "Workflow Hub -> Plugins"; see the "Plugin Market & Development" doc.
- **i18n (Chinese/English)**: the editor and launcher auto-switch by system language on first run, with a manual toggle in the top-right.

---

## Multi-target script export

A workflow can be exported as an independently runnable script for teams on different tech stacks.

### Entry

\`\`\`
Top bar "More" or "Export" button -> export dialog -> choose a format
\`\`\`

### Supported formats

\`\`\`
- Playwright Python    : a standalone Playwright + Python script (recommended)
- Selenium Python      : Selenium + Python, for teams used to Selenium
- Playwright JavaScript: Playwright + Node.js (JS), for front-end/Node teams
- JSON                 : the full workflow config, easy to re-import
- Markdown doc         : a readable flow description
- Encrypted share pack : AES-256 encrypted, needs a password to import
- Bundle (with deps)   : see the next section
\`\`\`

### Coverage

Script export covers web actions (open/click/type/dropdown/checkbox/keyboard), waits, scrolling, screenshots, navigation, flow control (condition/loop/iterate/break/continue), variables and logs.

\`\`\`
For advanced modules not yet supported by Selenium / Playwright-JS (system ops, Excel, AI, phone, etc.),
export generates clear comment placeholders with the original config, prompting you to run inside WebRPA
or implement manually — nothing is silently dropped, making it easy to fill in by hand.
\`\`\`

---

## Workflow bundle (cross-machine migration / team sharing)

A plain JSON export contains only the workflow itself. A **bundle** packages the workflow together with the "custom modules" and "image assets" it depends on, so moving to another computer or sending to a colleague restores everything at once without broken references.

### Export a bundle

\`\`\`
Export dialog -> choose "Bundle (with deps)" -> download xxx.bundle.json
\`\`\`

### Import a bundle

\`\`\`
Top bar "More" -> "Import bundle" -> choose a .bundle.json
- Auto-restores the dependent custom modules and images (skips existing ones, keeping original ids)
- The workflow loads onto the canvas with references intact
\`\`\`

---

## One-click package to standalone EXE (delivery made easy)

Many RPA tools can compile an automation flow into a Windows executable for direct delivery to clients/colleagues who don't have the tool installed. WebRPA now **fully supports** this: package any workflow into a custom \`.exe\` that runs on double-click — no Python, browser, or WebRPA needed on the target machine.

### Entry

\`\`\`
Editor top toolbar -> "Package to EXE" button -> packaging dialog
\`\`\`

### Two packaging modes

| Mode | Description | Size | Best for |
|------|-------------|------|----------|
| **Portable** | Bundles a full Python runtime, browser kernel, OCR models, etc. — the target machine needs nothing | Large (~2GB+) | Clean machines / client delivery |
| **Shared** | Reuses the WebRPA runtime already installed on the target machine; packages only the workflow and launcher | Tiny | Internal teams with WebRPA installed |

> Portable mode is recommended by default: it carries the full runtime so no module ever fails for missing dependencies.

### Customizable options

- **Program name**: the generated exe file name (e.g. \`DailyReport.exe\`)
- **Program icon**: upload a \`.ico\` icon to make the exe look professional (falls back to a launch script if absent)
- **Packaging mode**: portable / shared
- Automatically includes the workflow's **global variables, Excel assets, image assets, and custom modules (including recursive subflows)**

### What the packaged EXE can do

Packaging **reuses WebRPA's real execution engine** (the same workflow_runner and all executors), so **any built-in or custom module behaves exactly as in the editor**:

- Web automation, OCR, image processing, Excel, files, AI chat, desktop/mouse-keyboard, notifications and all other modules run normally
- Modules using **front-end interaction** such as user-input dialogs fall back to native dialogs (input box / TTS / view image / play audio & video) for a seamless experience
- Modules using **global config parameters** (AI, QQ automation, etc.) carry the relevant config into the package

### Boundaries (honest notes)

- **External absolute-path files** (e.g. \`D:\\xxx\\a.xlsx\`) are not packaged; ensure that path exists on the target machine
- The **encrypted credential vault** is not packaged for security; flows using credentials must be reconfigured on the target machine
- Modules depending on external services like **QQ / NapCat** require those services running on the target machine

### Steps

\`\`\`
1. Open the workflow to deliver
2. Click "Package to EXE" in the toolbar
3. Enter the program name, (optionally) upload a .ico icon, choose a mode
4. Click "Start packaging" and wait for compilation
5. Get the exe in the output directory (for portable mode you can copy the whole folder to distribute)
\`\`\`

> You can also let the **AI assistant** package for you: just tell it "package the current workflow into an exe named XXX".

---

## Encrypted credentials

Don't write email/API/database secrets as plaintext in a workflow (sharing/uploading would leak them). Store them centrally in the credential vault; the workflow only references names, and the backend decrypts and injects them at runtime.

### Manage credentials

\`\`\`
Global settings -> "Credentials" tab:
- Add a credential: name, note, and several fields (field name -> value), e.g.
    name: My mailbox    fields: value / password / api_key ...
- The list shows masked fields only, never plaintext
- When editing, leaving a field value blank keeps the original
\`\`\`

### Reference in nodes

\`\`\`
In any node's string, write:
  {{cred:name}}          -> the credential's default field "value"
  {{cred:name.field}}    -> a specific field, e.g. {{cred:My mailbox.password}}
It's replaced with the real value at runtime; workflow and export files contain no plaintext.
\`\`\`

> Credentials are stored Fernet (AES) encrypted, with the key and data stored separately. Scheduled-task notification secrets support the same reference.

---

## Run-recording / data retention cleanup

Over time, run recordings and collected data consume disk. You can set automatic rolling cleanup.

\`\`\`
Global settings -> "Retention" tab:
- Enable auto cleanup (on by default)
- Recording retention days / total size limit (MB)
- Data retention days / total size limit (MB)
- Cleanup interval (hours)
- "Clean now" to trigger manually; the page shows current usage
(0 means unlimited for that dimension; only export files and run snapshots are cleaned —
config files are whitelisted and never deleted)
\`\`\`

---

## Version history (VSCode-style branch graph)

Save snapshots of a workflow and roll back like Git.

### Entry

\`\`\`
The standalone "Version" button in the top bar (purple commit icon)
\`\`\`

### Usage

\`\`\`
- Commit current version: enter an optional note -> "Commit current version" creates a snapshot node
- Branch graph: a vertical line runs through; the top "Workspace (HEAD)" is the current uncommitted canvas, with history dots below
- Each version can: restore / diff against the current canvas / delete
- Export/import a "version share pack": package all versions for the team
\`\`\`

> Version history is linear snapshots (not multi-branch merges): each commit is a full snapshot; restoring returns the whole workflow to that version.

---

## Related docs

- [Custom Modules](custom-modules-guide) - packaging and the online community
- [Scheduled Tasks](scheduled-tasks-guide) - failure/success notifications
- [Complete Selector Guide](selector-guide) - test locate
- [Automation Browser](browser-guide) - web smart recording`
