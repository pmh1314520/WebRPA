export const inputGuideContentEn = `# Screen, Mouse & Keyboard Simulation

This chapter covers screenshots, screen recording and real mouse/keyboard simulation modules.

---

## Screen operations

### Screen capture (screenshot_screen)

Capture the current screen and save it as a file.

| Parameter | Description | Example |
|------|------|------|
| Save path | Where to save | \`C:\\screenshots\\\` |
| Region capture | Capture only part of the screen | No |
| X/Y/W/H | The capture region | \`0,0,1920,1080\` |
| Result variable | Saves the image path | \`screen_path\` |

---

### Record screen (screen_record)

Record screen activity to a video file.

| Parameter | Description |
|------|------|
| Save path | Where to save the video |
| Frame rate | FPS (10-60) |
| Duration | Seconds (0 = stop manually) |

---

### Window focus (window_focus)

Bring a window with a given title to the front and activate it.

| Parameter | Description |
|------|------|
| Window title | Supports fuzzy match |

---

### Camera capture (camera_capture)

Take a photo with the computer's camera.

| Parameter | Description |
|------|------|
| Camera index | 0 is the default camera |
| Save path | Where to save the image |
| Result variable | Saves the image path |

---

### Camera record (camera_record)

Record a video with the camera.

| Parameter | Description |
|------|------|
| Camera index | 0 is the default |
| Duration (s) | Recording length |
| Save path | Where to save the video |

---

## Real mouse simulation

Real-mouse modules simulate actual mouse actions via the OS API — for desktop software that can't be automated via the browser.

### Real mouse click (real_mouse_click)

Click at given screen coordinates.

| Parameter | Description | Example |
|------|------|------|
| X/Y | Screen pixel coordinates | \`960, 540\` |
| Button | left / right / middle | \`left\` |
| Click count | 1 (single) / 2 (double) | \`1\` |
| Wait after (ms) | Pause after clicking | \`100\` |

> **Get coordinates**: use the toolbar "Get coordinate" button — move the mouse and click to copy the coordinates.

---

### Real mouse move (real_mouse_move)

Smoothly move the cursor to a position.

| Parameter | Description |
|------|------|
| X/Y | Target coordinates |
| Move duration (ms) | 0 = instant move |

---

### Real mouse drag (real_mouse_drag)

Drag from one coordinate to another.

| Parameter | Description |
|------|------|
| Start X/Y | Drag start |
| End X/Y | Drag target |
| Drag duration (ms) | Drag animation length |

---

### Real mouse scroll (real_mouse_scroll)

Scroll the wheel at a position.

| Parameter | Description |
|------|------|
| X/Y | Scroll position |
| Amount | Positive up, negative down |

---

### Get mouse position (get_mouse_position)

Get the cursor's current screen coordinates.

| Parameter | Description |
|------|------|
| Result variable | Saves a dict with x and y |

---

## Real keyboard simulation

### Real keyboard (real_keyboard)

Simulate real keyboard typing or shortcuts.

| Parameter | Description | Example |
|------|------|------|
| Action type | Type text / press key / key combo | Type text |
| Text | The text to type | \`Hello WebRPA\` |
| Key name | Key identifier | \`enter\` |
| Key combo | Multi-key combo | \`ctrl+c\` |
| Per-key interval (ms) | Mimic human typing speed | \`50\` |

**Common key names**:

| Key | Name | Key | Name |
|------|------|------|------|
| Enter | enter | Backspace | backspace |
| Tab | tab | Esc | escape |
| Up/Down/Left/Right | up/down/left/right | Delete | delete |
| F1-F12 | f1-f12 | Home/End | home/end |
| Page Up/Down | pageup/pagedown | Space | space |

**Common combos**:

| Action | Combo |
|------|--------|
| Select all | ctrl+a |
| Copy | ctrl+c |
| Paste | ctrl+v |
| Save | ctrl+s |
| Undo | ctrl+z |
| Screenshot | win+shift+s |

---

### Simulate key (keyboard_action)

Send key events to the focused window (based on PyAutoGUI).

| Parameter | Description |
|------|------|
| Key | Key name or combo |
| Press count | Repeat count |

---

## Image/text recognition click

### Click image (click_image)

Find an image on screen and click it — no coordinates needed, auto-located.

| Parameter | Description | Example |
|------|------|------|
| Template image | The image to find (from image assets) | button.png |
| Similarity | Match threshold (0-1) | \`0.8\` |
| Wait timeout (s) | Max wait time | \`10\` |
| Offset X/Y | Click position offset | \`0, 0\` |

---

### Image exists (image_exists)

Check whether an image exists on screen.

| Parameter | Description |
|------|------|
| Template image | The image to find |
| Similarity | Match threshold |
| Result variable | True/False |

---

### Click text (click_text)

Find text on screen via OCR and click it.

| Parameter | Description |
|------|------|
| Target text | The text to click |
| Language | Recognition language |

---

### Hover image/text (hover_image / hover_text)

Hover the mouse over an image or text (no click).

---

### Drag image (drag_image)

Find an image, then drag it to another position.

---

## Macro recorder (macro_recorder)

Record a sequence of mouse/keyboard actions and replay it — the simplest desktop automation.

**Steps**:

1. Drag in a "Macro recorder" module
2. Click the module's "Start recording" button
3. Manually do the actions to automate (clicks, typing, etc.)
4. Click "Stop recording"
5. When the workflow runs, it replays the recorded sequence exactly

| Parameter | Description |
|------|------|
| Recorded content | The recorded action sequence (auto-filled) |
| Playback speed | 1.0 = original, 2.0 = double |
| Repeat count | Number of replays |

---

## Tips

- **Coordinate system**: all coordinates are absolute screen coordinates (origin at the top-left)
- **Multiple monitors**: the second screen's coordinates start at the first screen's width (e.g. main 1920px, secondary X from 1920)
- **Resolution**: hard-coded coordinates break across resolutions — prefer "Click image" over fixed coordinates
- **Focus first**: before mouse/keyboard actions, use "Window focus" to ensure the target window is in front
- **Add waits**: add 100-500ms after each action for stability`
