export const mediaGuideContentEn = `# 🎬 Media Processing Guide

This chapter introduces processing features for media files such as video, audio, and images. All media processing is implemented based on FFmpeg, the M3U8 download feature uses a professional download engine, **online video download is based on yt-dlp** (supporting 1000+ sites), and the audio-to-text feature is implemented based on a local Whisper model.

---

## 📋 Module Overview

| Module | Function | Default Timeout |
|------|------|----------|
| Format conversion | Convert media file format | 10 min |
| Image compression | Compress images to reduce size | 2 min |
| Video compression | Compress videos to reduce size | 30 min |
| Extract audio | Extract audio from a video | 5 min |
| Video trim | Cut a video segment | 10 min |
| Media merge | Merge multiple media files | 30 min |
| Add watermark | Add a watermark to a video | 10 min |
| M3U8 download | Download HLS streaming video | 30 min |
| **Online video download** | Download video from 1000+ sites like YouTube/Bilibili/Douyin | 30 min |
| **Online audio download** | Download and transcode audio only (mp3/wav/m4a/flac) | 30 min |
| **Video info query** | Get online video metadata (without downloading the video) | 2 min |
| **Available formats list** | List all downloadable qualities/codecs | 2 min |
| **Online subtitle download** | Multi-language subtitle download (including auto-generated subtitles) | 10 min |
| **Playlist download** | Batch download playlists/channels/collections | 2 hours |
| Audio to text | Speech recognition to text (local) | 10 min |
| Desktop recording | Record screen video | 10 min |
| QR code generation | Generate a QR code image | 30 s |
| QR code recognition | Recognize QR code content | 30 s |

---

## 📥 M3U8 Download

Download online streaming video in HLS (M3U8) format.

### Features

- A brand-new download engine supporting more encryption formats
- Multi-threaded download for faster speed
- Supports encryption methods such as AES-128 and SAMPLE-AES
- Automatically merges audio and video into MP4 format
- Supports custom HTTP headers and proxy

### Configuration

| Parameter | Description | Default |
|------|------|--------|
| M3U8 link | HLS playlist URL | - |
| Output directory | Directory to save the video | Download folder |
| Output file name | The file name to save (no extension needed) | Auto-generated |
| Download threads | Number of concurrent download threads | 8 |
| Auto-select best quality | Automatically select the highest-quality track | Yes |
| User-Agent | Custom browser identifier | Default |
| Referer | Anti-leeching source page | Empty |
| Custom headers | Other HTTP headers | Empty |
| Use system proxy | Whether to use the system proxy | Yes |
| Custom proxy | Specify a proxy server | Empty |
| Decryption key | The decryption key for encrypted video | Empty |
| Timeout | Download timeout (seconds) | 1800 |
| Result variable | The variable to save the file path | Empty |

### Example

\`\`\`
Basic download:
  M3U8 link: https://example.com/video.m3u8
  Output directory: D:/videos
  Output file name: my_video

Download with anti-leeching:
  M3U8 link: https://example.com/video.m3u8
  Output directory: D:/videos
  Referer: https://example.com/player
  User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) ...

Download with a proxy:
  M3U8 link: https://example.com/video.m3u8
  Output directory: D:/videos
  Custom proxy: http://127.0.0.1:7890
\`\`\`

### ⚠️ FAQ

| Error | Cause | Solution |
|------|------|----------|
| 403 error | Anti-leeching protection | Set the correct Referer |
| Connection timeout | Network issue | Use a proxy or check the network |
| Decryption failed | Video is encrypted | Provide the correct decryption key |
| SSL error | Certificate issue | Try using a proxy |

### How to Get the Referer

1. Open the video page in the browser
2. Press F12 to open the developer tools
3. Switch to the Network tab
4. Refresh the page and find the .m3u8 request
5. Check the Referer value in the request headers

---

## 🌐 Online Video Download (yt-dlp series)

WebRPA includes 6 download modules based on **yt-dlp**, covering single video, audio, subtitles, playlists, info query, and other scenarios. yt-dlp supports **1000+ video sites**, including:

- **International**: YouTube, Twitter/X, TikTok, Twitch, Vimeo, Reddit, Instagram, Facebook, Dailymotion
- **Domestic (China)**: Bilibili, Douyin, Kuaishou, Weibo, iQIYI, Youku, Tencent Video (partial), Xigua Video
- **Education**: Coursera, Udemy, Khan Academy, NetEase Open Courses
- **Live recording**: YouTube Live, Twitch, Bilibili Live

> **Prerequisites**: Place \`yt-dlp.exe\` in the \`backend\` directory; if you need to merge/transcode mp4/mkv, you also need \`ffmpeg.exe\`

### Common Network Configuration (available to all yt-dlp modules)

| Parameter | Description |
|------|------|
| Proxy | http/socks5 proxy address, e.g. \`http://127.0.0.1:7890\` |
| Force no proxy | Use a direct connection even if the system has a proxy set |
| User-Agent | Browser identifier |
| Referer | Anti-leeching source page |
| Custom headers | Separate multiple with \`|\` or line breaks, format \`Key: Value\` |
| cookies file | Path to a Netscape-format cookies.txt |
| **Read cookies from browser** | Read logged-in state directly from Chrome/Edge/Firefox/Safari, etc. (most convenient) |
| Rate limit | e.g. \`5M\` / \`500K\` |
| Retry count on failure | Default 5 |

> Many domestic sites (Bilibili membership, Douyin) require login for much content; enabling "Read cookies from browser" is strongly recommended

---

### 🎬 Module 1: Online Video Download

Download a single video, with the quality and container specifiable.

**Core parameters**

| Parameter | Description | Default |
|------|------|--------|
| Video link | Video page URL | - |
| Output directory | Save directory | User's download folder |
| Output filename template | yt-dlp template, empty = \`%(title)s.%(ext)s\` | Auto |
| Quality | best/4k/2k/1080p/720p/480p/360p/worst/audio_only | best |
| Output container | mp4/mkv/webm/auto | Auto |
| Time range trim | e.g. \`*00:00:30-00:02:00\` downloads only the specified segment | Empty |
| Embed thumbnail | Embed the thumbnail into the video metadata | No |
| Save thumbnail separately | Also save a .jpg thumbnail file | No |
| Embed chapter info | Split chapters when the video has chapters | No |
| Output .info.json | Save the raw metadata JSON | No |
| Result variable | Write the output file path into a variable | Empty |

**Example**

\`\`\`
Download a YouTube video to a specified directory:
  Video link: https://www.youtube.com/watch?v=dQw4w9WgXcQ
  Output directory: D:/videos
  Quality: 1080p
  Output container: mp4

Capture a segment only:
  Video link: https://www.bilibili.com/video/BVxxxxx
  Time range: *00:01:00-00:03:30
  Quality: 720p
\`\`\`

---

### 🎵 Module 2: Online Audio Download

Download audio only and transcode it. Commonly used to use YouTube/Bilibili as a music source.

**Core parameters**

| Parameter | Description | Default |
|------|------|------|
| Audio format | mp3 / m4a / aac / opus / vorbis / wav / flac / best | mp3 |
| Quality level | VBR 0 (highest) ~ 9 (lowest), or 320K/256K/192K/128K | 0 |
| Embed thumbnail | Embed the video thumbnail as the album cover | No |
| Embed metadata | Write title/author tags | Yes |
| Time range | Same as video download | Empty |

**Example: Download YouTube music as high-quality MP3**

\`\`\`
Video link: https://www.youtube.com/watch?v=...
Audio format: mp3
Quality level: 0 (VBR highest)
Embed thumbnail: ✓
Embed metadata: ✓
\`\`\`

---

### ℹ️ Module 3: Video Info Query

Don't download the video itself, just get the metadata. Often used as a pre-check node before downloading.

**Returned fields (written to the result variable)**

| Field | Description |
|------|------|
| title | Title |
| uploader / channel | Author/channel name |
| duration / duration_string | Duration (seconds / hh:mm:ss) |
| thumbnail | Thumbnail URL |
| view_count / like_count / comment_count | View/like/comment counts |
| upload_date | Upload date (YYYYMMDD) |
| description | Video description |
| tags / categories | Tags/categories |
| webpage_url | Normalized video page URL |
| is_live | Whether it is a live stream |
| ext / resolution / fps | Format/resolution/frame rate |

**Example: Decide whether to download based on duration**

\`\`\`
1. Video info query → Result variable: info
2. Condition check: {info.duration} > 7200 ?
   ✗ → Online video download
   ✓ → Skip (video too long)
\`\`\`

---

### 📐 Module 4: Available Formats List

List all downloadable quality/codec combinations for the video. Use it when presets such as \`best\`/\`1080p\` cannot meet fine-grained needs.

**Returned fields (array)**

Each record: \`format_id\` / \`ext\` / \`resolution\` / \`fps\` / \`vcodec\` / \`acodec\` / \`tbr\` (total bitrate) / \`filesize\` / \`format_note\`.

After getting a format_id, you can fill it directly into the quality field of "Online Video Download", e.g. \`137+140\` (1080p video stream + AAC audio stream).

---

### 📝 Module 5: Online Subtitle Download

Download video subtitles, with the option to also pull auto-generated subtitles.

**Core parameters**

| Parameter | Description |
|------|------|
| Subtitle languages | Comma-separated, e.g. \`zh-Hans,zh-CN,en\`, empty = all |
| Subtitle format | srt (recommended) / vtt / ass / lrc / best |
| Also download auto-generated subtitles | Get auto CC even when YouTube has no human subtitles |

**Common language codes**

| Code | Language |
|------|------|
| zh-Hans / zh-CN | Simplified Chinese |
| zh-Hant / zh-TW | Traditional Chinese |
| en | English |
| ja | Japanese |
| ko | Korean |
| fr / de / es / ru | French/German/Spanish/Russian |

---

### 📚 Module 6: Playlist Download

Batch download an entire playlist, channel, or collection.

**Core parameters**

| Parameter | Description |
|------|------|
| Download items | e.g. \`1-5,7,9\`, empty = download all |
| Max download count | 0 = unlimited |
| Skip existing files | Resume from breakpoint; re-running does not re-download |
| Audio only | Convert the whole batch to audio (paired with audioFormat) |
| Filename template | Default \`%(playlist_title)s/%(playlist_index)s - %(title)s.%(ext)s\` (creates a subdirectory by list name) |

**Example: Download the first 30 1080p videos of a YouTube channel**

\`\`\`
URL: https://www.youtube.com/@channelname/videos
Quality: 1080p
Max download count: 30
Skip existing: ✓
\`\`\`

**Example: Convert an entire Bilibili collection to mp3**

\`\`\`
URL: https://space.bilibili.com/uid/lists/xxx
Audio only: ✓
Audio format: mp3
Skip existing: ✓
Read cookies from browser: edge
\`\`\`

---

### ⚠️ yt-dlp FAQ

| Symptom | Cause / Solution |
|------|------|
| Error "yt-dlp.exe not found" | Place yt-dlp.exe in the backend directory, or ensure it can be found in PATH |
| YouTube prompts for login / Sign in to confirm | Enable "Read cookies from browser" and select the corresponding browser |
| Slow download / download fails | Configure a proxy (http://127.0.0.1:7890) |
| Bilibili membership videos only at 480p | Enable "Read cookies from browser" to read the Bilibili login state |
| mp4 / mkv merge fails | Confirm ffmpeg.exe is in the backend directory |
| Douyin/Weibo link errors | Copy the web URL, not the share code |
| Garbled naming | Add \`%(id)s\` instead of \`%(title)s\` in the filename template |

### 💡 Design Recommendations

1. For **large batch tasks**, use "Video Info Query" first to learn each item's duration and quality, then use the main download module
2. **Resume from breakpoint**: when batch downloading, be sure to check "Skip existing files"
3. **Increase the timeout**: for 4K videos or long videos, a timeout of \`3600\` seconds or more is recommended
4. **Combine with data collection**: collect the video list into a workflow variable first, then download item by item with a loop

---

## 🔄 Format Conversion

Convert a media file from one format to another.

### Configuration

| Parameter | Description |
|------|------|
| Input file | Source file path |
| Output file | Target file path (with extension) |
| Output format | Target format (mp4/avi/mkv/mp3/wav, etc.) |

### Supported Formats

**Video formats:**
- MP4, AVI, MKV, MOV, WMV, FLV, WebM

**Audio formats:**
- MP3, WAV, AAC, FLAC, OGG, M4A

**Image formats:**
- JPG, PNG, GIF, BMP, WebP

### Example

\`\`\`
Video format conversion:
  Input: D:/videos/source.avi
  Output: D:/videos/output.mp4
  Format: mp4

Audio format conversion:
  Input: D:/music/song.flac
  Output: D:/music/song.mp3
  Format: mp3
\`\`\`

---

## 🖼️ Image Compression

Compress an image file to reduce its size.

### Configuration

| Parameter | Description | Default |
|------|------|--------|
| Input file | Source image path | - |
| Output file | Compressed image path | - |
| Compression quality | 1-100, higher means better quality | 80 |
| Max width | Limit the maximum image width | Unlimited |
| Max height | Limit the maximum image height | Unlimited |

### Compression Quality Reference

| Quality | Effect | Use Case |
|--------|------|----------|
| 90-100 | Nearly lossless | High-quality needs |
| 70-89 | Slight compression | Daily use |
| 50-69 | Noticeable compression | Web display |
| 30-49 | Heavy compression | Thumbnails |

### Example

\`\`\`
Compress a product image:
  Input: D:/images/product.jpg
  Output: D:/images/product_compressed.jpg
  Quality: 75
  Max width: 1920

Batch compress (with a loop):
  Iterate list: {image list}
    Image compression:
      Input: {current item}
      Output: {current item}_compressed.jpg
      Quality: 80
\`\`\`

---

## 🎥 Video Compression

Compress a video file to reduce its size.

### Configuration

| Parameter | Description | Default |
|------|------|--------|
| Input file | Source video path | - |
| Output file | Compressed video path | - |
| Video bitrate | Video bitrate (e.g. 1M, 2M) | Auto |
| Audio bitrate | Audio bitrate (e.g. 128k) | 128k |
| Resolution | Output resolution (e.g. 1280x720) | Keep original |
| CRF value | Quality control, 18-28, lower is better | 23 |

### CRF Value Reference

| CRF | Quality | File Size |
|-------|------|----------|
| 18 | Near lossless | Larger |
| 23 | High quality (recommended) | Moderate |
| 28 | Medium quality | Smaller |
| 35 | Low quality | Very small |

### Example

\`\`\`
Compress an HD video:
  Input: D:/videos/4k_video.mp4
  Output: D:/videos/compressed.mp4
  CRF: 23
  Resolution: 1920x1080

Extreme compression (sacrificing quality):
  Input: D:/videos/large.mp4
  Output: D:/videos/small.mp4
  CRF: 28
  Video bitrate: 1M
\`\`\`

### ⚠️ Notes

- Video compression is time-consuming; large files may take tens of minutes
- The default timeout is 30 minutes; increase it appropriately for large files
- The progress percentage is shown during compression

---

## 🎵 Extract Audio

Extract the audio track from a video file.

### Configuration

| Parameter | Description |
|------|------|
| Input video | Source video file path |
| Output audio | Audio file path |
| Audio format | mp3/wav/aac/flac |
| Audio bitrate | e.g. 128k, 192k, 320k |

### Example

\`\`\`
Extract background music:
  Input: D:/videos/mv.mp4
  Output: D:/music/bgm.mp3
  Format: mp3
  Bitrate: 320k

Extract lossless audio:
  Input: D:/videos/concert.mp4
  Output: D:/music/concert.flac
  Format: flac
\`\`\`

---

## ✂️ Video Trim

Cut a specified time range from a video.

### Configuration

| Parameter | Description | Format |
|------|------|------|
| Input video | Source video path | - |
| Output video | Trimmed video path | - |
| Start time | Trim start point | HH:MM:SS or seconds |
| End time | Trim end point | HH:MM:SS or seconds |

### Time Formats

- \`00:01:30\` - 1 minute 30 seconds
- \`90\` - 90 seconds
- \`00:00:00.500\` - 0.5 seconds (precise to milliseconds)

### Example

\`\`\`
Cut a highlight segment:
  Input: D:/videos/full.mp4
  Output: D:/videos/clip.mp4
  Start: 00:05:30
  End: 00:08:45

Cut the first 30 seconds:
  Input: D:/videos/long.mp4
  Output: D:/videos/intro.mp4
  Start: 0
  End: 30
\`\`\`

---

## 🔗 Media Merge

Merge multiple media files into one, or add audio to a video.

### Merge Types

| Type | Description |
|------|------|
| Video concatenation | Join multiple videos end to end into one |
| Audio concatenation | Join multiple audios end to end into one |
| Audio-video merge | Add an audio track to a video |

### Video/Audio Concatenation Configuration

| Parameter | Description |
|------|------|
| Input file list | The variable holding the list of file paths to merge |
| Output file | The merged file path |

### Audio-Video Merge Configuration

| Parameter | Description |
|------|------|
| Video file | Source video file path |
| Audio file | The audio file path to add |
| Audio handling | Replace original audio / Mix with original audio |
| New audio volume | 0-2, 1.0 is the original volume |
| Original audio volume | The original audio volume in mix mode |

### Audio Handling Explained

**Replace original audio:**
- Completely replace the video's original audio track with the new audio
- Suitable for: dubbing, replacing background music, adding audio to a silent video

**Mix with original audio:**
- Mix the new audio with the video's original audio
- The volume of each audio can be adjusted separately
- Suitable for: adding background music, voiceover narration

### Example

\`\`\`
Video concatenation:
  Merge type: Video concatenation
  Input list: {video list}  # a list containing multiple video paths
  Output: D:/videos/complete.mp4

Audio concatenation:
  Merge type: Audio concatenation
  Input list: {audio list}
  Output: D:/music/playlist.mp3

Replace video audio:
  Merge type: Audio-video merge
  Video file: D:/videos/silent.mp4
  Audio file: D:/music/bgm.mp3
  Handling: Replace original audio
  New audio volume: 1.0
  Output: D:/videos/with_music.mp4

Mix in background music:
  Merge type: Audio-video merge
  Video file: D:/videos/vlog.mp4
  Audio file: D:/music/bgm.mp3
  Handling: Mix with original audio
  New audio volume: 0.3  # lower the background music volume
  Original audio volume: 1.0  # keep the original sound volume
  Output: D:/videos/vlog_with_bgm.mp4
\`\`\`

### ⚠️ Notes

- Files to concatenate should have the same encoding format
- Concatenating videos of different resolutions may cause issues
- It is recommended to unify the format before concatenating
- During audio-video merge, the audio is automatically truncated or looped to match the video length

---

## 💧 Add Watermark

Add an image or text watermark to a video.

### Configuration

| Parameter | Description |
|------|------|
| Input video | Source video path |
| Output video | Watermarked video path |
| Watermark image | Watermark image path (PNG with transparent background is best) |
| Watermark position | Top-left/Top-right/Bottom-left/Bottom-right/Center |
| Watermark opacity | 0-1, 1 is fully opaque |

### Watermark Position

| Position | Description |
|------|------|
| topleft | Top-left corner |
| topright | Top-right corner |
| bottomleft | Bottom-left corner |
| bottomright | Bottom-right corner (recommended) |
| center | Center |

### Example

\`\`\`
Add a logo watermark:
  Input: D:/videos/original.mp4
  Output: D:/videos/watermarked.mp4
  Watermark image: D:/images/logo.png
  Position: bottomright
  Opacity: 0.7
\`\`\`

---

## 💡 Media Processing Tips

### 1. Batch Processing

\`\`\`
Get file list: D:/videos/*.mp4 → {video list}
Iterate list: {video list}
  Video compression:
    Input: {current item}
    Output: {current item}_compressed.mp4
\`\`\`

### 2. Processing Progress

All media processing modules show the progress in the log:
\`\`\`
[Video compression] Progress: 45.2%
[Video compression] Progress: 67.8%
[Video compression] Progress: 100%
\`\`\`

### 3. Timeout Settings

Adjust the timeout based on file size:
- Small files (<100MB): the default timeout is fine
- Medium files (100MB-1GB): 10-30 minutes
- Large files (>1GB): over an hour

### 4. Error Handling

\`\`\`
Video compression: ...
  On timeout: Skip
  Retry count: 1

Condition check: {previous step succeeded}
  ├─ Yes → Continue processing
  └─ No → Print log: Compression failed, skip this file
\`\`\`

---

## 🎤 Audio to Text

Convert speech in an audio file to text, running entirely locally without a network.

### Technical Notes

- Based on the OpenAI Whisper model (faster-whisper implementation)
- The model is automatically downloaded locally on first use
- Supports automatic recognition of multiple languages
- Runs completely offline, protecting privacy

### Configuration

| Parameter | Description | Default |
|------|------|--------|
| Audio file | The audio file path to recognize | - |
| Model size | tiny/base/small/medium/large | base |
| Language | Specify a language or auto-detect | Auto-detect |
| Result variable | The variable name to save the recognition result | - |

### Model Size Comparison

| Model | Size | Speed | Accuracy | Use Case |
|------|------|------|--------|----------|
| tiny | ~75MB | Fastest | Fair | Quick test |
| base | ~150MB | Fast | Good | Daily use (recommended) |
| small | ~500MB | Medium | Good | Higher accuracy needs |
| medium | ~1.5GB | Slower | Very good | Professional scenarios |
| large | ~3GB | Slow | Best | Highest accuracy needs |

### Example

\`\`\`
Speech to text:
  Audio file: D:/audio/meeting.mp3
  Model size: base
  Language: Auto-detect
  Result variable: recognized text

Print log: {recognized text}
\`\`\`

### ⚠️ Notes

- The first time you use a model, it is downloaded automatically and you need to wait
- Model files are saved in the backend/data/whisper_models directory
- Larger models require more memory and processing time
- Supported audio formats: mp3, wav, m4a, flac, etc.

---

## 🖥️ Desktop Recording

Record screen content as a video file.

### Configuration

| Parameter | Description | Default |
|------|------|--------|
| Output path | Video save path | - |
| Recording duration | Recording seconds | 10 |
| Frame rate | Frames per second | 30 |
| Recording area | Full screen or a specified area | Full screen |

### Example

\`\`\`
Record an operation demo:
  Output path: D:/videos/demo.mp4
  Recording duration: 30
  Frame rate: 30
  Area: Full screen
\`\`\`

### ⚠️ Notes

- Do not move windows during recording
- The recording duration matches the actual video length
- 30fps is recommended; a higher frame rate increases file size

---

## 📱 QR Code Generation

Generate a QR code image containing the specified content.

### Configuration

| Parameter | Description | Default |
|------|------|--------|
| QR code content | The text or URL to encode | - |
| Output directory | The folder to save the QR code | - |
| Image size | QR code image size | 300 |
| Result variable | The variable to save the file path | - |

### Example

\`\`\`
Generate a URL QR code:
  Content: https://www.example.com
  Output directory: D:/qrcodes
  Size: 400
  Result variable: qr code path

Print log: QR code saved to {qr code path}
\`\`\`

### Notes

- The file name is auto-generated, in the format qrcode_timestamp.png
- Supports content in any language
- A size of 200-500 is recommended

---

## 🔍 QR Code Recognition

Recognize the QR code content in an image.

### Configuration

| Parameter | Description |
|------|------|
| Image path | The image file containing the QR code |
| Result variable | The variable name to save the recognition result |

### Example

\`\`\`
Recognize a QR code:
  Image path: D:/images/qrcode.png
  Result variable: qr code content

Condition check: {qr code content} is not empty
  ├─ Yes → Print log: Recognition result: {qr code content}
  └─ No → Print log: No QR code recognized
\`\`\``
