export const notificationsGuideContentEn = `# 🔔 Notifications & Interaction

This chapter introduces various notification and user interaction features.

---

## 📝 Print Log

Output information to the log panel for debugging and monitoring.

### Configuration

| Parameter | Description |
|------|------|
| Log content | The text to output, supports variable references |
| Log level | info/success/warning/error |

### Log Levels

| Level | Color | Use Case |
|------|------|----------|
| debug | Gray | Debug info, detailed logs |
| info | Blue | Normal info, progress hints |
| success | Green | Successful operation, task complete |
| warning | Yellow | Warning, needs attention |
| error | Red | Error, failure |

### Example

\`\`\`
Print log (debug): Variable value: {variable name} = {variable value}
Print log (info): Start processing item {index}
Print log (success): Data collection complete, total {count} items
Print log (warning): Price anomaly: {price}
Print log (error): Login failed: {error message}
\`\`\`

### Log Level Recommendations

- **debug**: For the development and debugging phase, output detailed variable values, intermediate results, etc.; can be turned off in production
- **info**: For recording normal flow info, such as "Start processing", "Executing", etc.
- **success**: For marking successful operations, such as "Login succeeded", "Data saved successfully", etc.
- **warning**: For flagging situations that need attention, such as "Data is empty", "Format anomaly", etc.
- **error**: For recording error info, such as "Request failed", "File not found", etc.

---

## 🔊 Play Beep

Play a system beep to remind the user.

### Configuration

| Parameter | Description | Default |
|------|------|--------|
| Beep count | How many times to play | 1 |
| Interval | The interval between each (ms) | 500 |

### Use Cases

- Task completion reminder
- Reminder when manual intervention is needed
- Warning when an error occurs
- Important event notification

### Example

\`\`\`
After a task completes:
  Play beep: 3 times, interval 500 ms

When a target product is found:
  Play beep: 5 times, interval 200 ms (urgent reminder)
\`\`\`

---

## 🎵 Play Music

Play an audio file from a specified URL.

### Configuration

| Parameter | Description |
|------|------|
| Audio URL | The network address of the audio file |
| Wait for playback to finish | Whether to wait for the music to finish playing |

### Supported Formats

- MP3
- WAV
- OGG
- Other audio formats supported by the browser

### Playback Modes

| Mode | Description |
|------|------|
| Wait for playback to finish | The workflow pauses and waits for the music to finish |
| Background playback | The music plays in the background while the workflow continues |

### Example

\`\`\`
Play celebration music after a task completes:
  Play music: https://example.com/success.mp3
  Wait for playback to finish: Yes

Play background music in the background:
  Play music: https://example.com/bgm.mp3
  Wait for playback to finish: No
\`\`\`

### Player Features

A player popup appears while the music plays, supporting:
- ▶️ Play/pause control
- 🔄 Loop playback toggle
- 📊 Progress bar dragging
- 🔊 Volume adjustment
- ❌ Close the player (stop playback)

### Notes

- The URL can omit the \`https://\` prefix; the system completes it automatically
- Music playing is stopped automatically when the workflow stops
- Make sure the audio URL is accessible
- Formats such as AAC and FLAC are supported; the system converts them to MP3 for playback
- The default timeout is 10 minutes, adjustable based on song length

---

## 🎬 Play Video

Play a video file from a specified URL, opening a video player popup.

### Configuration

| Parameter | Description |
|------|------|
| Video URL | The network address of the video file |
| Wait for playback to finish | Whether to wait for the video to finish playing |

### Supported Formats

- MP4 (recommended)
- WebM
- OGG
- Other video formats supported by the browser

### Player Features

A player popup appears while the video plays, supporting:
- ▶️ Play/pause control
- 🔄 Loop playback toggle
- 📊 Progress bar dragging
- 🔊 Volume adjustment/mute
- 🖥️ Fullscreen playback
- ❌ Close the player (stop playback)

### Playback Modes

| Mode | Description |
|------|------|
| Wait for playback to finish | The workflow pauses and waits for the video to finish |
| Background playback | The video plays in the popup while the workflow continues |

### Example

\`\`\`
Play a tutorial video:
  Play video: https://example.com/tutorial.mp4
  Wait for playback to finish: Yes

Play a hint animation:
  Play video: https://example.com/animation.webm
  Wait for playback to finish: No
\`\`\`

### Notes

- The URL can omit the \`https://\` prefix; the system completes it automatically
- Video playing is stopped automatically when the workflow stops
- Make sure the video URL is accessible and supports cross-origin
- The default timeout is 2 hours, adjustable based on video length
- MP4 format is recommended for the best compatibility

---

## 🖼️ View Image

Open an image viewer to display an image from a specified URL.

### Configuration

| Parameter | Description |
|------|------|
| Image URL | The network address of the image file |
| Auto close | Whether to close automatically after a specified time |
| Display time | The display time before auto-close (ms) |

### Supported Formats

- JPG/JPEG
- PNG
- GIF (animated supported)
- WebP
- BMP
- SVG

### Viewer Features

An image viewer popup appears while viewing, supporting:
- 🔍 Zoom in/out (mouse wheel supported)
- 🔄 Rotate the image (90° each time)
- 🖥️ Fullscreen view
- 💾 Download the image
- ❌ Close the viewer

### Example

\`\`\`
Show a collected image:
  View image: {image URL}
  Auto close: No

Auto-cycle images:
  Iterate list: {image list}
    View image: {current item}
    Auto close: Yes
    Display time: 3000  # auto-switch to the next after 3 seconds
\`\`\`

### Use Cases

- Show collected images
- CAPTCHA image preview
- Product image confirmation
- View screenshot results

---

## 🗣️ Voice Announcement

Convert text to speech and play it (TTS).

### Configuration

| Parameter | Description |
|------|------|
| Announcement content | The text to read aloud, supports variables |
| Speed | Reading speed (0.5-2) |
| Pitch | Voice pitch (0.5-2) |

### Use Cases

- Announce collection results
- Voice reminders
- Accessibility assistance

### Example

\`\`\`
Announce collection result:
  Voice announcement: Collected {count} items in total

Price reminder:
  Voice announcement: {product name} dropped in price, now only {price}
\`\`\`

---

## 💬 User Input

Open a dialog for the user to enter content.

### Configuration

| Parameter | Description |
|------|------|
| Title | The dialog title |
| Prompt text | The hint shown to the user |
| Default value | The default content of the input box |
| Save to variable | The variable name to store the user input |

### Use Cases

#### 1. Enter a CAPTCHA

\`\`\`
Screenshot the CAPTCHA image
User input:
  Title: Please enter the CAPTCHA
  Prompt: Please view the screenshot and enter the CAPTCHA
  Save to: captcha
Input text: {captcha}
\`\`\`

#### 2. Enter a One-Time Password

\`\`\`
User input:
  Title: SMS verification
  Prompt: Please enter the code received on your phone
  Save to: sms code
\`\`\`

#### 3. Confirm an Operation

\`\`\`
User input:
  Title: Confirm
  Prompt: All data is about to be deleted, type "confirm" to continue
  Save to: confirm text

Condition check: {confirm text} == "confirm"
  ├─ Yes → Perform deletion
  └─ No → Cancel the operation
\`\`\`

#### 4. Dynamic Parameter

\`\`\`
User input:
  Title: Search keyword
  Prompt: Please enter the keyword to search
  Default value: WebRPA
  Save to: keyword

Open page: https://www.baidu.com/s?wd={keyword}
\`\`\`

---

## 📧 Send Email

Automatically send an email notification.

### Configuration

| Parameter | Description |
|------|------|
| SMTP server | The mail server address |
| Port | The server port |
| Sender email | Your email address |
| Authorization code | The SMTP authorization code (not the login password) |
| Recipient | The target mailbox, separate multiple with commas |
| Subject | The email subject |
| Content | The email body |

### Getting a QQ Mail Authorization Code

1. Log in to the QQ Mail web version
2. Settings → Account
3. Enable the POP3/SMTP service
4. Complete SMS verification
5. Get the 16-character authorization code

### Common SMTP Servers

| Mailbox | Server | SSL Port |
|------|--------|---------|
| QQ Mail | smtp.qq.com | 465 |
| 163 Mail | smtp.163.com | 465 |
| Gmail | smtp.gmail.com | 465 |

### Email Template Example

\`\`\`
Subject: [WebRPA] {task name} completed

Content:
Hello!

Your automation task has completed. Here are the results:

Task name: {task name}
Execution time: {execution time}
Collected count: {data count} items
Execution status: {status}

For detailed data, please see the attachment or log in to the system.

---
This email was sent automatically by WebRPA
\`\`\`

---

## 🔔 Notification Best Practices

### 1. Tiered Notifications

\`\`\`
Normal progress → Print log
Important event → Play beep
Task complete → Send email
Emergency → Voice announcement + email
\`\`\`

### 2. Avoid Over-notifying

\`\`\`
❌ Bad:
Play a beep on every loop iteration

✅ Good:
Play a beep once after the loop ends
\`\`\`

### 3. Meaningful Messages

\`\`\`
❌ Bad:
Print log: Done

✅ Good:
Print log: Data collection complete, total {count} items, took {duration} seconds
\`\`\`

### 4. Error Notifications

\`\`\`
When an error occurs:
  Print log (error): {error message}
  Play beep: 5 times
  Send email: error report
\`\`\`

---

## 📱 Extended Notification Methods

### WeChat Notification (via API)

Use a service like PushPlus to send WeChat notifications:

\`\`\`
API request:
  URL: https://www.pushplus.plus/send
  Method: POST
  Body: {
    "token": "your token",
    "title": "Task complete",
    "content": "Collected {count} items"
  }
\`\`\`

### DingTalk Notification (via Webhook)

\`\`\`
API request:
  URL: DingTalk bot Webhook address
  Method: POST
  Body: {
    "msgtype": "text",
    "text": {
      "content": "WebRPA notification: {message content}"
    }
  }
\`\`\`

### WeCom Notification

\`\`\`
API request:
  URL: WeCom bot Webhook address
  Method: POST
  Body: {
    "msgtype": "text",
    "text": {
      "content": "{message content}"
    }
  }
\`\`\``
