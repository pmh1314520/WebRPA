export const triggersGuideContentEn = `# ⚡ Triggers Guide

## Overview

Trigger modules let a workflow run automatically when a specific condition is met, achieving true automation. WebRPA provides 10 powerful triggers covering a wide range of automation scenarios.

### Trigger Workflow

\`\`\`mermaid
%%{init: {'theme':'default', 'themeVariables': { 'fontSize':'16px'}}}%%
graph TD
    A["<b>Workflow starts</b>"] --> B{"<b>Trigger type</b>"}
    B -->|Webhook| C["Wait for HTTP request"]
    B -->|Hotkey| D["Listen for key combo"]
    B -->|File monitor| E["Monitor file changes"]
    B -->|Email| F["Check for new mail"]
    B -->|API| G["Poll the API"]
    B -->|Mouse| H["Listen for mouse events"]
    B -->|Image| I["Detect screen image"]
    B -->|Sound| J["Listen for sound events"]
    B -->|Face| K["Recognize face"]
    B -->|Element change| L["Monitor DOM changes"]
    
    C --> M["<b>Trigger condition met</b>"]
    D --> M
    E --> M
    F --> M
    G --> M
    H --> M
    I --> M
    J --> M
    K --> M
    L --> M
    
    M --> N["Run subsequent modules"]
    N --> O["<b>Workflow complete</b>"]
    
    style A fill:#e3f2fd,stroke:#1976d2,stroke-width:3px,color:#000
    style B fill:#fff9c4,stroke:#f57f17,stroke-width:3px,color:#000
    style M fill:#fff3e0,stroke:#f57c00,stroke-width:3px,color:#000
    style O fill:#e8f5e9,stroke:#388e3c,stroke-width:3px,color:#000
\`\`\`

---

## 🌐 Webhook Trigger

### Function
Wait for an HTTP request to trigger the workflow; useful for receiving notifications or callbacks from external systems.

### Configuration
- **Webhook ID**: An automatically generated unique identifier
- **Webhook URL**: The address that receives requests (can be copied)
- **HTTP method**: The allowed request method (GET/POST/PUT/DELETE/ANY)
- **Validate request headers**: Optional, only matching headers trigger it
- **Validate query parameters**: Optional, only matching parameters trigger it
- **Custom response content**: Optional, the JSON response returned to the requester
- **Response status code**: HTTP response status code (default 200)
- **Timeout**: Wait time (0 = wait indefinitely)
- **Save data to variable**: The variable name to save the request data

### Use Cases
- Receive callback notifications from third-party systems
- Trigger workflows via an API endpoint
- Receive Webhook events (such as GitHub, DingTalk, etc.)
- Trigger workflow execution remotely

### Example: Receive a GitHub Webhook
\`\`\`
Configuration:
- HTTP method: POST
- Validate request headers: {"X-GitHub-Event": "push"}
- Save data to variable: github_data

Test with curl (replace the port number with your actual backend port):
curl -X POST http://localhost:YOUR_PORT/api/triggers/webhook/your_id \\
  -H "X-GitHub-Event: push" \\
  -d '{"repository": "test-repo", "commits": []}'
\`\`\`

### Security Recommendations
- Use header validation for better security
- Use a query parameter as a key for validation
- Use HTTPS in production
- Rotate the Webhook ID regularly

---

## ⌨️ Hotkey Trigger

### Function
Listen for a global hotkey and trigger the workflow when the specified key combination is pressed.

### Configuration
- **Hotkey combination**: e.g. \`ctrl+shift+f1\`
- **Timeout**: Wait time (0 = wait indefinitely)

### Supported Keys
- **Modifier keys**: ctrl, alt, shift, win
- **Function keys**: f1-f12
- **Letter keys**: a-z
- **Combining**: join with +, e.g. \`ctrl+alt+a\`

### Use Cases
- Quickly start a workflow
- Automation that needs manual confirmation
- Game assistance scripts
- Trigger quick operations

### Example: Quick Screenshot
\`\`\`
Configuration:
- Hotkey combination: ctrl+shift+s
- Subsequent modules: Screenshot → Save image → System notification

Effect: Pressing Ctrl+Shift+S immediately takes and saves a screenshot
\`\`\`

### Notes
- Make sure the hotkey does not conflict with the system or other apps
- Hotkey listening is global; it triggers even when the window is not in the foreground
- Avoid using common system shortcuts

---

## 📁 File Monitor Trigger

### Function
Monitor changes to a file or folder and trigger the workflow when a specified event is detected.

### Configuration
- **Monitor path**: File or folder path
- **Monitor type**: created, modified, deleted, any
- **File name pattern**: Wildcard matching, e.g. \`*.txt\`, \`report_*.xlsx\`
- **Timeout**: Wait time (0 = wait indefinitely)
- **Save event info to variable**: The variable name to save the event data

### Use Cases
- Automatically process newly downloaded files
- Monitor log file changes
- File sync and backup
- Automatically import data files

### Example: Auto-process Downloaded Files
\`\`\`
Configuration:
- Monitor path: C:\\Users\\Downloads
- Monitor type: created
- File name pattern: *.xlsx
- Save to variable: file_event

Subsequent flow:
1. Read the Excel file (use {{file_event.filePath}})
2. Process the data
3. Send an email notification
\`\`\`

### Wildcard Notes
- \`*\`: matches any characters
- \`?\`: matches a single character
- \`*.txt\`: all txt files
- \`report_*.xlsx\`: Excel files starting with report_

---

## 📧 Email Trigger

### Function
Monitor a mailbox and trigger the workflow when a new email meeting the conditions arrives.

### Configuration
- **Mail server**: IMAP server address
- **Port**: IMAP port (usually 993)
- **Mailbox account**: The login account
- **Mailbox password/authorization code**: The login password or authorization code
- **Sender filter**: Optional, only trigger for emails from a specified sender
- **Subject keyword filter**: Optional, only trigger for emails containing the keyword
- **Check interval**: How often (in seconds) to check (≥30 seconds recommended)
- **Timeout**: Wait time (0 = wait indefinitely)
- **Save email info to variable**: The variable name to save the email data

### Common Mailbox Configurations
| Mailbox | IMAP Server | Port | Note |
|------|-----------|------|------|
| QQ Mail | imap.qq.com | 993 | Requires authorization code |
| 163 Mail | imap.163.com | 993 | Requires authorization code |
| Gmail | imap.gmail.com | 993 | Requires app-specific password |
| Outlook | outlook.office365.com | 993 | Uses the login password |

### Use Cases
- Auto-process order emails
- Trigger workflows via email notifications
- Auto-reply to emails
- Email content extraction and analysis

### Example: Order Email Processing
\`\`\`
Configuration:
- Mail server: imap.qq.com
- Port: 993
- Subject keyword filter: Order Notification
- Check interval: 60 seconds
- Save to variable: email_data

Subsequent flow:
1. Extract the order number with regex (from {{email_data.body}})
2. Query the database
3. Update the order status
4. Send a confirmation email
\`\`\`

### Getting an Authorization Code
**QQ Mail**:
1. Log in to the QQ Mail web version
2. Settings → Account → POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV services
3. Enable the IMAP service
4. Generate an authorization code

**163 Mail**:
1. Log in to the 163 Mail web version
2. Settings → POP3/SMTP/IMAP
3. Enable the IMAP service
4. Set a client authorization password

---

## 🔄 API Trigger

### Function
Periodically poll an API endpoint and trigger the workflow when the response meets a specified condition.

### Configuration
- **API address**: The endpoint URL
- **HTTP method**: GET or POST
- **Request headers**: Headers in JSON format
- **Request body**: Body in JSON format (POST only)
- **Condition path**: A JSONPath expression, e.g. \`data.status\`
- **Comparison operator**: ==, !=, >, <, contains
- **Expected value**: The target value for the condition
- **Check interval**: How often (in seconds) to request
- **Timeout**: Wait time (0 = wait indefinitely)
- **Save response data to variable**: The variable name to save the response data

### Use Cases
- Wait for an async task to complete
- Monitor API status changes
- Poll for query results
- Wait for a resource to be ready

### Example: Wait for a Task to Complete
\`\`\`
Configuration:
- API address: https://api.example.com/task/status
- HTTP method: GET
- Request headers: {"Authorization": "Bearer token123"}
- Condition path: data.status
- Comparison operator: ==
- Expected value: completed
- Check interval: 10 seconds
- Save to variable: task_result

Flow explanation:
1. Request the API every 10 seconds
2. Check whether data.status equals "completed"
3. Once the condition is met, continue with the subsequent flow
\`\`\`

### JSONPath Examples
- \`data.status\`: accesses \`{"data": {"status": "completed"}}\`
- \`result[0].name\`: accesses the name field of the first array element
- \`$.items.length\`: gets the length of the items array

### Condition Operators
- **==**: equals (exact match)
- **!=**: not equals
- **>**: greater than (numeric comparison)
- **<**: less than (numeric comparison)
- **contains**: contains (string contains)

---

## 🖱️ Mouse Trigger

### Function
Listen for global mouse events and trigger the workflow when a specified mouse action is detected; supports mouse gesture recognition.

### Configuration
- **Trigger type**:
  - Left click
  - Right click
  - Middle click
  - Scroll up
  - Scroll down
  - Move beyond a specified distance
  - Left-button gesture trigger
  - Right-button gesture trigger
  - Middle-button gesture trigger
  - Custom gesture trigger
- **Move distance threshold**: Effective only for the move type, in pixels
- **Gesture pattern**: Effective only for gesture trigger types; specifies the gesture to recognize (e.g. ↑, →, ↓←, etc.)
- **Timeout**: Wait time (0 = wait indefinitely)
- **Save to variable**: Saves the mouse position and event info

### Gesture Triggers Explained

**Gesture direction symbols**:
- ↑: up
- ↓: down
- ←: left
- →: right

**Gesture types**:

| Type | Description | Example Gesture |
|------|------|----------|
| Left-button gesture | Hold the left button and move | ↑, →↓, ↑→↓← |
| Right-button gesture | Hold the right button and move | ↓, ←→, ↑↓ |
| Middle-button gesture | Hold the middle button and move | →, ↑↓, ←→ |
| Custom gesture | No button restriction, only recognizes the movement path | ↑→, ↓←, ↑→↓← |

**Common gesture examples**:
\`\`\`
Simple gestures:
↑     - Swipe up
↓     - Swipe down
←     - Swipe left
→     - Swipe right

Combined gestures:
↑↓    - Up then down
←→    - Left then right
↑→    - L shape (up then right)
→↓    - 7 shape (right then down)
↑→↓←  - Clockwise circle
\`\`\`

### Use Cases
- Mouse gesture shortcuts
- Quickly start a workflow
- Game assistance scripts
- Mouse behavior monitoring
- Custom gesture commands

### Example 1: Right-click Context Menu
\`\`\`
Configuration:
- Trigger type: Right click
- Save to variable: mouse_position

Subsequent flow:
1. Get the mouse position ({{mouse_position.x}}, {{mouse_position.y}})
2. Show a custom menu
3. Perform the corresponding action
\`\`\`

### Example 2: Right-button Gesture to Open a Web Page
\`\`\`
Configuration:
- Trigger type: Right-button gesture trigger
- Gesture pattern: ↑
- Save to variable: gesture_info

Subsequent flow:
1. After detecting the upward gesture
2. Open the specified web page
3. Perform automation operations
\`\`\`

### Example 3: Left-button Gesture for Screenshot
\`\`\`
Configuration:
- Trigger type: Left-button gesture trigger
- Gesture pattern: ↓→
- Save to variable: gesture_info

Subsequent flow:
1. After detecting the "↓→" gesture
2. Capture the screen
3. Save the image
\`\`\`

### Example 4: Custom Gesture Combinations
\`\`\`
Workflow 1: Right-button gesture ↑ → Open Baidu
Workflow 2: Right-button gesture ↓ → Open Taobao
Workflow 3: Right-button gesture ← → Screenshot
Workflow 4: Right-button gesture → → Close the current page
\`\`\`

### How Gesture Recognition Works
- The system tracks the mouse movement path in real time
- It decomposes the path into the four directions: up, down, left, right
- It triggers when the path matches the configured gesture pattern
- It supports combined gestures with multiple consecutive directions

### Notes
- Mouse listening is global and captures all mouse events
- For move triggers, set a reasonable distance threshold
- Gestures should not be too complex; 2-4 directions are recommended
- Avoid conflicts with system mouse operations
- Gesture recognition has some tolerance; the path does not need to be perfectly precise

---

## 🖼️ Image Trigger

### Function
Continuously detect whether a specified image appears on the screen, and trigger the workflow immediately upon detection.

### Configuration
- **Image path**: The path of the image file to detect (PNG, JPG, etc.)
- **Match confidence**: 0.5-1.0; higher means more precise matching (0.7-0.9 recommended)
- **Check interval**: How often (in seconds) to check the screen
- **Timeout**: Wait time (0 = wait indefinitely)
- **Limit search area**: Optional, limit the screen area to improve recognition speed
- **Save to variable**: Saves the image position and match score

### Use Cases
- Wait for an interface to finish loading
- Wait for a button to appear
- Game automation
- UI automation testing

### Example: Wait for the Login Button
\`\`\`
Configuration:
- Image path: C:\\images\\login_button.png
- Match confidence: 0.8
- Check interval: 0.5 seconds
- Save to variable: button_position

Subsequent flow:
1. After detecting the login button
2. Click the button position ({{button_position.x}}, {{button_position.y}})
3. Continue the login flow
\`\`\`

### Optimization Tips
- Use a clear screenshot as the template
- Limit the search area to improve performance
- Adjust the confidence to avoid false matches
- The check interval should not be too short

---

## 🔊 Sound Trigger

### Function
Listen to the system audio output (speakers) and trigger the workflow when the volume reaches a threshold.

### Configuration
- **Volume threshold**: 0-100%, triggers when this volume is reached
- **Check interval**: How often (in seconds) to check the volume
- **Timeout**: Wait time (0 = wait indefinitely)
- **Save to variable**: Saves the volume value at trigger time

### Use Cases
- Detect notification sounds
- Detect alert tones
- Audio event monitoring
- Sound alarm triggers

### Example: Detect a System Notification Sound
\`\`\`
Configuration:
- Volume threshold: 30%
- Check interval: 0.1 seconds
- Save to variable: sound_volume

Subsequent flow:
1. After detecting the sound
2. Take and save a screenshot
3. Log it
\`\`\`

### Notes
- It listens to the system audio output, not the microphone
- Adjust the volume threshold based on the actual situation
- Too short a check interval may affect performance
- System audio permission is required

---

## 👤 Face Trigger

### Function
Monitor the camera feed in real time and automatically trigger the workflow when the target face is detected.

### Configuration
- **Target face image**: The path of the target face photo used for comparison
- **Match tolerance**: 0.3-0.8; smaller is stricter (0.4-0.6 recommended, default 0.6)
- **Camera index**: 0 is the default camera; try 1, 2, etc. for multiple cameras
- **Check interval**: How often (in seconds) to check the camera feed
- **Timeout**: Wait time (0 = wait indefinitely)
- **Save to variable**: Saves the recognition result (match score, face position, etc.)

### Use Cases
- Face attendance system
- Identity verification trigger
- Security monitoring
- Smart access control

### Example: Face Attendance
\`\`\`
Configuration:
- Target face image: C:\\faces\\employee_001.jpg
- Match tolerance: 0.5
- Camera index: 0
- Check interval: 0.5 seconds
- Save to variable: face_detected

Subsequent flow:
1. After detecting the target face
2. Record the attendance time
3. Save the attendance photo
4. Send a notification
\`\`\`

### Notes
- Make sure the camera is properly connected and authorized
- The target face image should be clear and contain only one face
- Lighting conditions affect recognition accuracy
- The match tolerance must be adjusted based on the actual situation
- The check interval should not be too short to avoid performance issues

---

## 🔄 Child Element Change Trigger

### Function
Monitor changes in the number of child elements of a web element, detecting new content in real time; suitable for live comments, chat messages, dynamic lists, etc.

### Configuration
- **Element selector**: The CSS selector of the parent element to monitor
- **Check interval**: How often (in seconds) to check (0.5-2 seconds recommended)
- **Timeout**: Wait time (0 = wait indefinitely)
- **Save new element selector to variable**: Saves the CSS selector of the new element
- **Save change info to variable**: Saves change details (change type, count, etc.)

### Use Cases
- Monitor live-stream comments
- Monitor chat messages
- Monitor dynamic list updates
- Monitor real-time data changes
- Monitor news pushes

### Example: Monitor Live Comments
\`\`\`
Configuration:
- Element selector: .comment-list
- Check interval: 1 second
- Save new element selector to: new_comment_selector
- Save change info to: change_info

Subsequent flow:
1. After detecting a new comment
2. Extract the comment content (use {{new_comment_selector}})
3. Analyze the comment keywords
4. Auto-reply or log it
\`\`\`

### Change Info Explained
The saved change info contains:
- **changeType**: change type (increased/decreased)
- **previousCount**: the number of child elements before the change
- **currentCount**: the number of child elements after the change
- **changeCount**: the number that changed
- **timestamp**: the time the change occurred
- **checkCount**: the number of checks

### New Element Selector
When an increase in child elements is detected, the CSS selector of the latest new element is generated automatically, in order of priority:
1. Use the element ID (if any)
2. Use the element class
3. Use the nth-child pseudo-class

### Notes
- You must open the web page first to use it
- The element selector must be accurate
- The check interval should not be too short to avoid performance issues
- Suitable for dynamically loaded content
- It only monitors changes in the number of direct child elements

### Optimization Tips
- Use a precise CSS selector
- Adjust the check interval based on the page update frequency
- Combine with a condition check to filter out invalid changes
- Use a loop to handle multiple new elements

---

## 💡 Best Practices

### 1. Combine Triggers
You can use multiple triggers in one workflow to implement complex triggering logic:
- File monitor + email notification
- API polling + Webhook callback
- Scheduled trigger + condition check

### 2. Error Handling
It is recommended to add error handling after triggers:
\`\`\`
Trigger → Condition check → Normal flow
              ↓
           Error handling → Logging → Notification
\`\`\`

### 3. Timeout Settings
- Set a short timeout during development and testing
- Set it based on actual needs in production
- A timeout is recommended for long-running triggers

### 4. Resource Management
- Avoid overly frequent polling (API trigger, email trigger)
- File monitoring should avoid monitoring a large number of files
- For scheduled triggers, set a reasonable interval

### 5. Security Considerations
- Use a validation mechanism for Webhooks
- Use an authorization code for the mailbox password
- Use Token authentication for API requests
- Store sensitive info in variables

### 6. Debugging Tips
- Use the print log module to record trigger info
- Test with a short timeout first
- Check whether the variable content matches expectations
- Use a condition check to verify the trigger condition

---

## 🔧 Troubleshooting

### Webhook Trigger
**Issue**: The Webhook cannot trigger
- Check whether the URL is correct
- Check whether the HTTP method matches
- Check whether the validation conditions are correct
- Test the Webhook with curl

### Hotkey Trigger
**Issue**: The hotkey does not respond
- Check whether the hotkey format is correct
- Confirm the hotkey is not occupied by another program
- Check whether there is permission to listen for global hotkeys

### File Monitor Trigger
**Issue**: File changes do not trigger
- Check whether the path exists
- Check whether the file name pattern is correct
- Confirm the monitor type matches
- Check file system permissions

### Email Trigger
**Issue**: Cannot connect to the mailbox
- Check whether the IMAP service is enabled
- Confirm you are using an authorization code, not the login password
- Check the server address and port
- Check the network connection

### API Trigger
**Issue**: The condition is never met
- Check whether the API address is correct
- Verify the JSONPath expression
- Check the comparison operator and expected value
- Test the API response with Postman

### Mouse/Image/Sound/Face Triggers
**Issue**: The trigger does not respond
- Check the system permission settings
- Confirm the relevant libraries are properly installed
- Check whether the configuration parameters are reasonable
- View the logs for detailed error information

### Child Element Change Trigger
**Issue**: Changes cannot be detected
- Check whether the element selector is correct
- Confirm the target web page is open
- Check whether the element is dynamically loaded
- Adjust the check interval
- Verify the selector with the browser developer tools

---

## 📚 Related Docs

- [Basic Modules](basic-modules): Learn how to use basic modules
- [Flow Control](advanced-features): Condition checks and loops
- [Variable System](variables-guide): Use and manage variables
- [Debugging Guide](debug-guide): Workflow debugging tips
- [Practical Cases](practical-cases): Trigger examples in practice

---

## 🎯 Summary

Triggers are the key to automation; choosing the right trigger lets a workflow truly run "automatically":

- **Webhook trigger**: good for receiving external notifications
- **Hotkey trigger**: good for quick start and manual confirmation
- **File monitor trigger**: good for automatic file processing
- **Email trigger**: good for email-driven automation
- **API trigger**: good for waiting on async tasks
- **Mouse trigger**: good for mouse gestures and quick operations
- **Image trigger**: good for waiting on interface elements to appear
- **Sound trigger**: good for audio event monitoring
- **Face trigger**: good for face recognition and identity verification
- **Child element change trigger**: good for monitoring web element changes (such as live comments, chat messages, etc.)

Use triggers wisely to build a powerful automation system!
`
