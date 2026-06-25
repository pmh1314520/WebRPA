export const shareGuideContentEn = `# Network & Screen Sharing

This chapter covers folder sharing, file sharing and screen casting.

---

## Network sharing

### Share folder (share_folder)

Share a local folder over the LAN so other devices can access it.

| Parameter | Description | Example |
|------|------|------|
| Folder path | The local folder to share | \`C:\\shared\` |
| Share name | The access name | \`myshare\` |
| Port | HTTP service port | \`8888\` |
| Result variable | Saves the access URL | \`share_url\` |

After sharing, devices on the same LAN can open \`http://your-IP:port\` in a browser to browse and download files.

---

### Share a single file (share_file)

Share one file as a download link.

| Parameter | Description |
|------|------|
| File path | The file to share |
| Port | HTTP service port |
| Result variable | Saves the download link |

---

### Stop sharing (stop_share)

Close the file-sharing service.

| Parameter | Description |
|------|------|
| Port | The service port to close |

---

## Screen sharing

### Start screen share (start_screen_share)

Share this machine's screen over the LAN in real time; other devices can watch in a browser.

| Parameter | Description | Example |
|------|------|------|
| Port | Sharing service port | \`9999\` |
| Frame rate | Frames per second (smoothness vs bandwidth) | \`15\` |
| Quality | Image quality (1-100) | \`70\` |
| Result variable | Saves the viewing URL | \`share_url\` |

To watch: on the same LAN, open a browser and go to \`http://host-IP:port\`.

---

### Stop screen share (stop_screen_share)

Close the screen-sharing service.

| Parameter | Description |
|------|------|
| Port | The sharing port to close |

---

## Use cases

- **Automation monitoring**: start screen sharing to watch a workflow's progress remotely
- **File distribution**: share generated report files for others on the LAN to download
- **Quick transfer**: move large files between two computers without a USB drive or cloud disk`
