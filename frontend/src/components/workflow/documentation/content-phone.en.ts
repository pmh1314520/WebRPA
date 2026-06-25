export const phoneGuideContentEn = `# Phone Automation Guide

This chapter explains how to use WebRPA for Android phone automation.

---

## Module Overview

| Module | Function | Default Timeout |
|------|------|----------|
| Tap | Tap a specified screen coordinate | 10s |
| Swipe | Swipe the screen | 10s |
| Long press | Long-press a specified screen coordinate | 10s |
| Input text | Enter text (auto-switches input method) | 30s |
| Key operation | Simulate keys (Back, Home, etc.) | 10s |
| Screenshot | Capture the phone screen | 30s |
| Start screen mirroring | Start scrcpy mirroring | 30s |
| Stop screen mirroring | Stop scrcpy mirroring | 10s |
| Install app | Install an APK file | 2 min |
| Launch app | Launch the specified app | 30s |
| Stop app | Stop the specified app | 10s |
| Uninstall app | Uninstall the specified app | 1 min |
| Push file | Push a file to the phone | 2 min |
| Pull file | Pull a file from the phone | 2 min |
| Tap image | Recognize and tap an image | 1 min |
| Tap text | Recognize and tap text | 1 min |
| Wait for image | Wait for an image to appear | 1 min |
| Set volume | Set the phone volume | 30s |
| Set brightness | Set the screen brightness | 10s |
| Write clipboard | Write to the phone clipboard | 10s |
| Read clipboard | Read the phone clipboard | 10s |

---

## Environment Setup

### 1. Enable USB Debugging

Enable Developer Options and USB Debugging on the phone:

1. Go to "Settings" -> "About phone"
2. Tap "Build number" 7 times in a row to enable Developer Options
3. Return to "Settings" -> "Developer options"
4. Turn on "USB debugging"
5. Turn on "USB installation" (required on some phones)

### 2. Connect the Phone

Connect the phone to the computer with a USB cable:

1. After connecting, the phone shows an "Allow USB debugging" prompt
2. Check "Always allow" and tap "OK"
3. Use any phone module in the workflow, and the system automatically detects the connection

### 3. Wireless Connection (Optional)

You can also connect the phone wirelessly over WiFi:

1. Connect the phone and computer to the same WiFi
2. Connect once via USB first to get the phone's IP
3. Run in the terminal: \`adb tcpip 5555\`
4. Disconnect USB and run: \`adb connect phone_IP:5555\`

---

## Basic Operations

### Tap Operation

Tap a specified coordinate on the screen.

**Configuration:**

| Parameter | Description |
|------|------|
| X coordinate | Horizontal coordinate (pixels) |
| Y coordinate | Vertical coordinate (pixels) |

**How to get coordinates (recommended: use the pick button directly):**

1. Click the **"Pick Coordinate"** button on the right of the X / Y coordinate input box
2. The system automatically launches the phone mirror window (a separate window, automatically brought to the foreground)
3. **Hold Ctrl + click** the target position in the mirror window to auto-fill X and Y
4. When Ctrl is not held, the mirror window responds to normal phone operations as usual and does not trigger picking
5. After picking, the picker stops automatically, and you can safely close the mirror window

> Cross-computer compatibility: The pick button internally uses conversion based on the device's real resolution. No matter how the monitor DPI, mirror window size, or Windows scaling changes, what you get is the real pixel in the phone's internal coordinate system, avoiding the "works on my computer but off on another" problem.

You can also use the traditional method:

1. Use the "Start screen mirroring" module to open the mirror window
2. Click the target position in the mirror window
3. The window title shows the current coordinate

**Example:**

\`\`\`
Tap the screen center:
  X coordinate: 540
  Y coordinate: 960

Tap the back button:
  X coordinate: 100
  Y coordinate: 100
\`\`\`

---

### Swipe Operation

Swipe from a start point to an end point; useful for paging, unlocking, etc.

**Configuration:**

| Parameter | Description |
|------|------|
| Start X | Starting horizontal coordinate |
| Start Y | Starting vertical coordinate |
| End X | Ending horizontal coordinate |
| End Y | Ending vertical coordinate |
| Swipe duration | Swipe duration (ms) |

**Common swipe directions:**

| Direction | Start | End | Description |
|------|------|------|------|
| Swipe up | (540, 1500) | (540, 500) | Page up |
| Swipe down | (540, 500) | (540, 1500) | Page down |
| Swipe left | (900, 960) | (180, 960) | Switch left |
| Swipe right | (180, 960) | (900, 960) | Switch right |

**Example:**

\`\`\`
Swipe up to page:
  Start X: 540
  Start Y: 1500
  End X: 540
  End Y: 500
  Duration: 300

Fast swipe (unlock):
  Start X: 200
  Start Y: 1000
  End X: 800
  End Y: 1000
  Duration: 100
\`\`\`

---

### Long Press Operation

Long-press a specified position on the screen, often used to bring up a menu.

**Configuration:**

| Parameter | Description |
|------|------|
| X coordinate | Horizontal coordinate |
| Y coordinate | Vertical coordinate |
| Long press duration | Hold time (ms) |

**Example:**

\`\`\`
Long press to bring up a menu:
  X coordinate: 540
  Y coordinate: 960
  Duration: 1000

Long press a delete icon:
  X coordinate: {icon X}
  Y coordinate: {icon Y}
  Duration: 800
\`\`\`

---

## Text Input

### Input Text Module

Enter text into the phone, supporting mixed Chinese and English input.

**Configuration:**

| Parameter | Description |
|------|------|
| Input content | The text to enter |
| Auto-press Enter after input | Whether to automatically press Enter |

**Smart input method switching:**

The system automatically detects the input content:
- If it contains Chinese, it automatically switches to the ADBKeyboard input method
- After input, it automatically restores the original input method when the workflow ends
- No manual switching needed; fully automated

**First-time setup:**

1. Make sure the ADBKeyboard input method is installed on the phone
2. Go to "Settings" -> "Languages & input" -> "Manage keyboards"
3. Confirm that "ADB Keyboard" is enabled
4. On first run, the system installs and configures it automatically

**Example:**

\`\`\`
Enter search keyword:
  Content: WebRPA automation
  Auto Enter: Yes

Enter username:
  Content: {username variable}
  Auto Enter: No
\`\`\`

**Tips:**

1. Tap the input box first, then use the Input Text module
2. The input method switches automatically when entering Chinese, no worries
3. Use variables for dynamic input

---

### Key Operation

Simulate pressing the phone's physical or virtual keys.

**Configuration:**

| Parameter | Description |
|------|------|
| Key type | The key to press |

**Common keys:**

| Key | Description | Purpose |
|------|------|------|
| KEYCODE_BACK | Back key | Go back to the previous page |
| KEYCODE_HOME | Home key | Return to the home screen |
| KEYCODE_MENU | Menu key | Open the menu |
| KEYCODE_ENTER | Enter key | Confirm input |
| KEYCODE_DEL | Delete key | Delete text |
| KEYCODE_VOLUME_UP | Volume + | Increase volume |
| KEYCODE_VOLUME_DOWN | Volume - | Decrease volume |

**Example:**

\`\`\`
Go back:
  Key: KEYCODE_BACK

Return to home screen:
  Key: KEYCODE_HOME

Confirm input:
  Key: KEYCODE_ENTER
\`\`\`

---

## Screen Operations

### Screenshot

Capture the phone's current screen and save it.

**Configuration:**

| Parameter | Description |
|------|------|
| Save path | Where to save the screenshot (optional) |
| Save path to variable | The variable name to save the file path |

**Example:**

\`\`\`
Save a screenshot:
  Path: D:/screenshots/phone_{time}.png
  Variable: screenshot path

Auto naming:
  Path: (leave empty, auto-saved to the default directory)
  Variable: screenshot file
\`\`\`

**Use cases:**

- Record the operation process
- Save important information
- Combine with OCR to recognize text
- Combine with image recognition to locate elements

---

### Screen Mirroring

Use scrcpy to mirror the phone screen to the computer in real time.

**Start screen mirroring:**

| Parameter | Description |
|------|------|
| Video bitrate | Quality (1-50 Mbps), default 8 |
| Max resolution | Limit resolution, default 1920 |

**Bitrate recommendations:**

| Connection | Recommended Bitrate | Description |
|----------|------------|------|
| WiFi | 8-16 Mbps | Balance quality and smoothness |
| USB | 16-32 Mbps | Can use higher quality |
| Low-end PC | 4-8 Mbps | Reduce CPU usage |

**Example:**

\`\`\`
High-quality mirroring (USB):
  Bitrate: 20
  Resolution: 1920

Smooth mirroring (WiFi):
  Bitrate: 8
  Resolution: 1280
\`\`\`

**Mirror window features:**

- Click the window to view coordinates (shown in the title bar)
- You can operate the phone directly in the mirror window
- Supports keyboard input and mouse operations

**Stop screen mirroring:**

Use the "Stop screen mirroring" module to close the mirror window.

---

## App Management

### Install App

Install an APK file to the phone.

**Configuration:**

| Parameter | Description |
|------|------|
| APK file path | The APK file to install |

**Example:**

\`\`\`
Install an app:
  APK path: D:/apps/myapp.apk

Batch install:
  Get file list: D:/apps/*.apk -> {APK list}
  Iterate list: {APK list}
    Install app: {current item}
\`\`\`

---

### Launch App

Launch an installed app on the phone.

**Configuration:**

| Parameter | Description |
|------|------|
| Package name | The app's package name |

**How to get the package name:**

1. Open the target app on the phone
2. Run in the terminal: \`adb shell dumpsys window | findstr mCurrentFocus\`
3. The package name format in the output: \`com.example.app\`

**Common app package names:**

| App | Package Name |
|------|------|
| WeChat | com.tencent.mm |
| QQ | com.tencent.mobileqq |
| Alipay | com.eg.android.AlipayGphone |
| Taobao | com.taobao.taobao |
| Douyin | com.ss.android.ugc.aweme |

**Example:**

\`\`\`
Launch WeChat:
  Package name: com.tencent.mm

Launch a custom app:
  Package name: {app package name variable}
\`\`\`

---

### Stop App

Force-stop a running app.

**Configuration:**

| Parameter | Description |
|------|------|
| Package name | The package name of the app to stop |

**Example:**

\`\`\`
Stop WeChat:
  Package name: com.tencent.mm
\`\`\`

---

### Uninstall App

Uninstall a specified app from the phone.

**Configuration:**

| Parameter | Description |
|------|------|
| Package name | The package name of the app to uninstall |

**Example:**

\`\`\`
Uninstall an app:
  Package name: com.example.testapp
\`\`\`

---

## File Transfer

### Push File

Push a file from the computer to the phone.

**Configuration:**

| Parameter | Description |
|------|------|
| Local file path | The file on the computer |
| Phone target path | The save location on the phone |

**Common phone directories:**

| Directory | Description |
|------|------|
| /sdcard/Download/ | Download directory |
| /sdcard/DCIM/ | Camera photos |
| /sdcard/Pictures/ | Pictures directory |
| /sdcard/Documents/ | Documents directory |

**Example:**

\`\`\`
Push an image:
  Local: D:/photos/image.jpg
  Phone: /sdcard/Pictures/image.jpg

Push a config file:
  Local: D:/config.json
  Phone: /sdcard/Download/config.json
\`\`\`

---

### Pull File

Pull a file from the phone to the computer.

**Configuration:**

| Parameter | Description |
|------|------|
| Phone file path | The file on the phone |
| Local save path | The save location on the computer |
| Save path to variable | The variable name to save the file path |

**Example:**

\`\`\`
Pull a photo:
  Phone: /sdcard/DCIM/Camera/IMG_001.jpg
  Local: D:/photos/phone_photo.jpg
  Variable: photo path

Pull a log:
  Phone: /sdcard/app_log.txt
  Local: D:/logs/phone_log.txt
  Variable: log file
\`\`\`

---

## Visual Recognition

### Tap Image

Locate and tap a target via image recognition.

**Configuration:**

| Parameter | Description |
|------|------|
| Image file path | The target image to find |
| Tap method | Single tap or long press |
| Similarity threshold | Match accuracy (0-1), default 0.8 |
| Timeout | Find timeout (seconds) |

**Steps:**

1. Take a screenshot to capture the target image first
2. Crop out the part to recognize (smaller is more precise)
3. Save it as PNG
4. Select that image in the module

**Example:**

\`\`\`
Tap the login button:
  Image: D:/images/login_button.png
  Method: Single tap
  Similarity: 0.8
  Timeout: 30

Long press an icon:
  Image: D:/images/app_icon.png
  Method: Long press
  Similarity: 0.9
  Timeout: 20
\`\`\`

**Tips:**

- The target image should be clear and distinctive
- Avoid including content that changes (such as time or numbers)
- Too high a similarity may not find it; too low may misidentify
- A similarity of 0.75-0.85 is recommended

---

### Tap Text

Recognize text via OCR and tap it.

**Configuration:**

| Parameter | Description |
|------|------|
| Target text | The text to find |
| Match mode | Exact match/contains match |
| Tap method | Single tap or long press |
| Timeout | Find timeout (seconds) |

**Example:**

\`\`\`
Tap the "OK" button:
  Text: OK
  Mode: Exact match
  Method: Single tap
  Timeout: 30

Tap a button containing "Login":
  Text: Login
  Mode: Contains match
  Method: Single tap
  Timeout: 20
\`\`\`

**Use cases:**

- Tap buttons (OK, Cancel, Login, etc.)
- Tap menu items
- Tap list items
- Tap tabs

---

### Wait for Image

Wait for a specified image to appear on the screen.

**Configuration:**

| Parameter | Description |
|------|------|
| Image file path | The target image to wait for |
| Similarity threshold | Match accuracy (0-1) |
| Check interval | The interval between checks (seconds) |
| Save result to variable | Saves position and match info |

**Example:**

\`\`\`
Wait for loading to complete:
  Image: D:/images/loaded_icon.png
  Similarity: 0.8
  Interval: 0.5
  Variable: load result

Wait for a button to appear:
  Image: D:/images/next_button.png
  Similarity: 0.85
  Interval: 1
  Variable: button position
\`\`\`

**Use cases:**

- Wait for the page to finish loading
- Wait for a button to appear
- Wait for an animation to end
- Wait for a popup to show

---

## System Settings

### Set Volume

Adjust the phone volume.

**Configuration:**

| Parameter | Description |
|------|------|
| Volume type | Media/Ringtone/Call/Alarm |
| Volume level | 0-15 (0 is mute) |

**Example:**

\`\`\`
Set the media volume:
  Type: Media volume
  Level: 10

Mute:
  Type: Ringtone volume
  Level: 0
\`\`\`

---

### Set Brightness

Adjust the screen brightness.

**Configuration:**

| Parameter | Description |
|------|------|
| Brightness value | 0-255 (0 darkest, 255 brightest) |

**Example:**

\`\`\`
Set medium brightness:
  Brightness: 128

Max brightness:
  Brightness: 255

Min brightness:
  Brightness: 10
\`\`\`

---

## Clipboard Operations

### Write Clipboard

Write text to the phone clipboard.

**Configuration:**

| Parameter | Description |
|------|------|
| Text content | The text to write |

**Automatic Clipper handling:**

The system automatically detects and uses the Clipper app:
- Clipper is installed automatically on first use
- The best method to write the clipboard is chosen automatically
- No manual configuration needed

**Example:**

\`\`\`
Copy text:
  Content: Hello World

Copy a variable:
  Content: {username}
\`\`\`

**Use cases:**

- Copy text to the phone
- Combine with a paste operation
- Pass data to a phone app

---

### Read Clipboard

Read the content of the phone clipboard.

**Configuration:**

| Parameter | Description |
|------|------|
| Save to variable | The variable name to save the clipboard content |

**Automatic Clipper handling:**

- Automatically detects the Clipper app state
- Installed automatically on first use
- The best read method is chosen automatically

**Example:**

\`\`\`
Read the clipboard:
  Variable: clipboard content

Use the clipboard content:
  Read clipboard -> {content}
  Print log: {content}
\`\`\`

**Use cases:**

- Get text copied on the phone
- Get data from a phone app
- Achieve cross-app data transfer

---

## Practical Tips

### 1. Coordinate Locating Tips

**Method 1: Use the mirror window**
\`\`\`
Start screen mirroring
  -> Click the target position in the mirror window
  -> The title bar shows the coordinate
  -> Record the coordinate for the tap module
\`\`\`

**Method 2: Use screenshot + image editor**
\`\`\`
Screenshot -> View coordinates in an image editor
\`\`\`

---

### 2. Wait for Page Load

**Method 1: Fixed wait**
\`\`\`
Tap the button
Wait: 2 seconds
Continue
\`\`\`

**Method 2: Wait for image (recommended)**
\`\`\`
Tap the button
Wait for image: loading-complete icon
Continue
\`\`\`

---

### 3. Batch Operations

**Example: Batch install apps**
\`\`\`
Get file list: D:/apks/*.apk -> {APK list}
Iterate list: {APK list}
  Install app: {current item}
  Wait: 3 seconds
\`\`\`

---

### 4. Error Handling

**Use a condition check**
\`\`\`
Tap image: login button -> {result}
Condition check: {result} contains "success"
  Yes: Continue
  No: Print log: Login button not found
\`\`\`

---

### 5. Combined Usage

**Example: Automatic login**
\`\`\`
Launch app: com.example.app
Wait: 2 seconds
Tap: username input box coordinate
Input text: {username}
Tap: password input box coordinate
Input text: {password}
Tap image: login button image
Wait for image: login-success icon
\`\`\`

---

## FAQ

### 1. Phone Not Detected

**Solutions:**
- Check whether the USB cable is connected
- Confirm USB debugging is enabled
- Re-plug the USB cable
- Allow USB debugging authorization on the phone

---

### 2. Chinese Input Fails

**Solutions:**
- Make sure ADBKeyboard is installed
- Go to keyboard management and enable ADB Keyboard
- The system switches automatically, no manual action needed

---

### 3. Image Recognition Fails

**Solutions:**
- Lower the similarity threshold (0.75-0.8)
- Use a smaller, more precise target image
- Make sure the target image is clear
- Avoid including content that changes

---

### 4. Clipboard Operation Fails

**Solutions:**
- The system installs the Clipper app automatically
- Make sure the phone has granted installation permission
- Wait for Clipper installation to complete on first use

---

### 5. Mirror Screen Stutters

**Solutions:**
- Lower the bitrate (4-8 Mbps)
- Lower the resolution (1280 or lower)
- Use a USB connection instead of WiFi
- Close other resource-intensive programs

---

## Full Examples

### Example 1: Automatic Check-in

\`\`\`
1. Launch app: com.example.app
2. Wait: 3 seconds
3. Tap image: checkin_button.png
4. Wait for image: checkin_success.png
5. Screenshot: D:/screenshots/checkin_{date}.png
6. Key operation: KEYCODE_BACK
\`\`\`

---

### Example 2: Batch Send Messages

\`\`\`
1. Launch app: com.tencent.mm (WeChat)
2. Wait: 3 seconds
3. Set variable: contact list = ["Zhang San", "Li Si", "Wang Wu"]
4. Iterate list: {contact list}
   a. Tap: search box coordinate
   b. Input text: {current item}
   c. Wait: 1 second
   d. Tap: first search result coordinate
   e. Tap: input box coordinate
   f. Input text: Hello, this is an automated message
   g. Key operation: KEYCODE_ENTER
   h. Wait: 1 second
   i. Key operation: KEYCODE_BACK
   j. Key operation: KEYCODE_BACK
\`\`\`

---

### Example 3: Automated Testing

\`\`\`
1. Install app: D:/test.apk
2. Wait: 5 seconds
3. Launch app: com.example.test
4. Wait: 3 seconds
5. Tap: register button coordinate
6. Input text: test username
7. Tap: next coordinate
8. Input text: test@example.com
9. Tap: finish coordinate
10. Wait for image: register_success.png
11. Screenshot: D:/test_results/success.png
12. Uninstall app: com.example.test
\`\`\`

---

## Related Docs

- [Variable System Explained](variables-guide) - Learn how to use variables
- [Flow Control](advanced-features) - Learn condition checks and loops
- [AI Recognition](advanced-features) - Use OCR and image recognition

---

**Tip:** Phone automation is powerful, but use it responsibly and comply with relevant laws, regulations, and app terms of service.
`
