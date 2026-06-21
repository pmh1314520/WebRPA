export const sshGuideContentEn = `# 🔐 SSH Remote Operations

This chapter shows how to use WebRPA to connect to servers over SSH, run commands and upload/download files, automating server operations.

---

## Overview

There are **5** SSH modules, built on Paramiko, supporting both password and key authentication.

| Module | Description |
|------|------|
| ssh_connect | Establish an SSH connection |
| ssh_execute_command | Run a remote command |
| ssh_upload_file | Upload a file (SFTP) |
| ssh_download_file | Download a file (SFTP) |
| ssh_disconnect | Disconnect |

---

## 🔌 Establish SSH connection (ssh_connect)

Connect to a remote server over SSH.

| Parameter | Description | Example |
|------|------|------|
| Host | Server IP or domain | \`192.168.1.100\` |
| Port | SSH port | \`22\` |
| Username | Login username | \`root\` |
| Auth method | Password / private key | Password |
| Password | Login password | \`{server_pwd}\` |
| Private key path | PEM key file path | \`C:\\id_rsa\` |
| Timeout (s) | Connection timeout | \`30\` |
| Result variable | Saves the SSH connection object | \`ssh_conn\` |

---

## ⚡ Run remote command (ssh_execute_command)

Run a shell command on the remote server and get its output.

| Parameter | Description | Example |
|------|------|------|
| SSH connection var | An established connection | \`{ssh_conn}\` |
| Command | The shell command | \`ls -la /var/log\` |
| Timeout (s) | Command timeout | \`60\` |
| Result variable | Saves stdout | \`cmd_output\` |
| Error variable | Saves stderr | \`cmd_error\` |
| Exit-code variable | Saves the exit code | \`exit_code\` |

**Example** (check disk usage):
\`\`\`
SSH run command → connection: {ssh}, command: df -h → result variable: disk_info
Print log → content: {disk_info}
\`\`\`

**Run multiple commands**: join with \`&&\` or \`;\`:
\`\`\`
cd /opt/myapp && git pull && systemctl restart myapp
\`\`\`

**Run a sudo command**:
\`\`\`
echo '{sudo_password}' | sudo -S systemctl restart nginx
\`\`\`

---

## 📤 Upload file (ssh_upload_file)

Upload a local file to the server via SFTP.

| Parameter | Description | Example |
|------|------|------|
| SSH connection var | An established connection | \`{ssh_conn}\` |
| Local path | Local file path | \`C:\\data\\report.csv\` |
| Remote path | Server target path | \`/home/user/reports/\` |
| Result variable | Whether the upload succeeded | \`upload_ok\` |

---

## 📥 Download file (ssh_download_file)

Download a file from the server via SFTP.

| Parameter | Description | Example |
|------|------|------|
| SSH connection var | An established connection | \`{ssh_conn}\` |
| Remote path | Server file path | \`/var/log/app.log\` |
| Local path | Local save path | \`C:\\logs\\app.log\` |
| Result variable | Whether the download succeeded | \`download_ok\` |

---

## 🔌 Disconnect (ssh_disconnect)

Close the SSH connection and free resources.

| Parameter | Description |
|------|------|
| SSH connection var | The connection to close |

> **Important**: always disconnect at the end of the workflow to avoid connection leaks.

---

## 📋 Full example: automated server deployment

\`\`\`mermaid
flowchart TD
    A[SSH connect] --> B[Upload new package]
    B --> C[Run unzip command]
    C --> D[Run deploy script]
    D --> E[Check service status]
    E --> F{Service OK?}
    F --Yes--> G[Send success notice]
    F --No--> H[Send failure alert]
    G --> I[Disconnect SSH]
    H --> I
\`\`\`

---

## 💡 Tips

- **Reuse the connection**: connect once, run many commands, then disconnect
- **Variables**: use \`{name}\` in commands to reference workflow variables
- **Error handling**: check the exit-code variable (\`0\` = success); non-zero means the command failed
- **Key auth**: in production, prefer key authentication for security
- **Global config**: preset server info under Global settings → SSH`
