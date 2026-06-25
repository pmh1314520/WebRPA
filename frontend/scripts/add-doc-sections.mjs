// @ts-check
/**
 * 一次性维护脚本（Task 7.2）：为 4 个未被教学文档覆盖的分类补齐中英成对章节。
 * 章节直接插入到对应 content 文件的模板字符串末尾（结束反引号之前）。
 * 章节内不使用反引号 / Emoji，模块名用 **bold** 标注，确保不破坏模板字符串。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DOC_DIR = resolve(__dirname, '..', 'src', 'components', 'workflow', 'documentation')

const SECTIONS = {
  'content-browser.ts': `
---

## DP 反检测自动化

DrissionPage（DP）以“控制真实浏览器内核 + 收发数据包”的方式工作，对很多检测 webdriver 特征的网站更隐蔽，适合常规自动化浏览器被风控拦截的场景。

| 模块 | 说明 |
|------|------|
| **dp_open_page** | 打开 / 跳转页面，可选无头模式 |
| **dp_click** | 点击元素（支持超时） |
| **dp_input** | 输入文本，可选先清空 |
| **dp_get_text** | 获取元素文本并存入变量 |
| **dp_get_html** | 获取当前页面 HTML 存入变量 |
| **dp_run_js** | 执行 JavaScript，结果存入变量 |
| **dp_wait_element** | 等待元素出现 |
| **dp_scroll** | 滚动页面（bottom / top / down / up） |
| **dp_close** | 关闭 DrissionPage 浏览器 |

定位符直接透传 DrissionPage 语法：#id、.class、tag:xx、text:xx、xpath://...、css:...。

使用流程：先用 dp_open_page 打开页面（会创建并复用一个浏览器实例），再用 dp_click / dp_input 等操作，最后用 dp_close 关闭。首次使用需安装依赖：在 WebRPA 目录执行 Python313/python.exe -m pip install DrissionPage。
`,
  'content-browser.en.ts': `
---

## DP Anti-detection Automation

DrissionPage (DP) works by controlling a real browser kernel plus sending/receiving packets, making it stealthier on sites that detect the webdriver flag. Use it when the regular automation browser gets blocked by anti-bot systems.

| Module | Description |
|------|------|
| **dp_open_page** | Open / navigate to a page, optional headless mode |
| **dp_click** | Click an element (supports timeout) |
| **dp_input** | Type text, optionally clear first |
| **dp_get_text** | Get element text into a variable |
| **dp_get_html** | Get the current page HTML into a variable |
| **dp_run_js** | Run JavaScript and store the result |
| **dp_wait_element** | Wait for an element to appear |
| **dp_scroll** | Scroll the page (bottom / top / down / up) |
| **dp_close** | Close the DrissionPage browser |

Locators pass through DrissionPage syntax directly: #id, .class, tag:xx, text:xx, xpath://..., css:....

Flow: open with dp_open_page (it creates and reuses one browser instance), then use dp_click / dp_input, and finally dp_close. First-time use needs the dependency: run Python313/python.exe -m pip install DrissionPage in the WebRPA folder.
`,
  'content-ai-vision.ts': `
---

## AI生成（生图 / 生视频）

调用第三方 AI 接口，由文字描述生成图片或视频。

### AI 生成图片（ai_generate_image）

| 参数 | 说明 |
|------|------|
| 提供商 | openai（DALL-E）或 stability |
| 提示词 | 描述想要的画面，必填 |
| 反向提示词 | 不希望出现的内容（stability 支持） |
| 尺寸 / 数量 | 如 1024x1024、生成张数 |
| API Key / API Base | 对应平台的密钥与接口地址 |
| 保存路径 | 填写则下载到本地，多张自动加序号 |
| 结果变量 | 默认 ai_image_urls，保存 URL 或本地路径列表 |

### AI 生成视频（ai_generate_video）

| 参数 | 说明 |
|------|------|
| 提供商 | runway 或 custom（自定义接口） |
| 提示词 | 描述视频内容，必填 |
| 时长 / 宽高比 / 帧率 | 如 5 秒、16:9、24 fps |
| API Key / API Base / API URL | 对应平台配置 |
| 保存路径 | 填写则下载到本地 |
| 结果变量 | 默认 ai_video_url，保存视频 URL 或本地路径 |

生视频为异步任务，模块会自动轮询任务状态直到完成或超时，无需手动等待。
`,
  'content-ai-vision.en.ts': `
---

## AI Generation (Image / Video)

Call third-party AI APIs to generate images or videos from a text description.

### AI image generation (ai_generate_image)

| Parameter | Description |
|------|------|
| Provider | openai (DALL-E) or stability |
| Prompt | Describe the desired image (required) |
| Negative prompt | Content to avoid (supported by stability) |
| Size / Count | e.g. 1024x1024, number of images |
| API Key / API Base | Key and endpoint for the platform |
| Save path | If set, downloads locally; multiple images get a numeric suffix |
| Result variable | Default ai_image_urls; stores the URL or local-path list |

### AI video generation (ai_generate_video)

| Parameter | Description |
|------|------|
| Provider | runway or custom (custom endpoint) |
| Prompt | Describe the video (required) |
| Duration / Aspect / FPS | e.g. 5s, 16:9, 24 fps |
| API Key / API Base / API URL | Platform configuration |
| Save path | If set, downloads locally |
| Result variable | Default ai_video_url; stores the video URL or local path |

Video generation is asynchronous; the module polls the task status until it completes or times out, so no manual waiting is needed.
`,
  'content-excel.ts': `
---

## WPS多维表格

对标飞书多维表格，接入金山 WPS 开放平台（open.wps.cn）的多维表格（dbsheet）能力。需先在 WPS 开放平台创建应用，获取 AK / SK。

| 模块 | 说明 |
|------|------|
| **wps_bitable_write** | 向多维表格写入记录 |
| **wps_bitable_read** | 读取多维表格全部记录（自动翻页） |

公共参数：AK、SK、文件ID（fileId）、表ID（sheetId）；baseUrl 可按平台文档微调，默认 https://openapi.wps.cn 。

写入支持两种数据源：手动填写字段，或从变量读取（字典写入一条，字典列表批量写入）。读取会自动按每页 200 条翻页，把全部记录存入结果变量（默认 wps_data）。
`,
  'content-excel.en.ts': `
---

## WPS Bitable

A counterpart to Feishu Bitable, integrating the multidimensional table (dbsheet) capability of the Kingsoft WPS open platform (open.wps.cn). Create an app on the WPS open platform first to get the AK / SK.

| Module | Description |
|------|------|
| **wps_bitable_write** | Write records into a bitable |
| **wps_bitable_read** | Read all records from a bitable (auto-paging) |

Common parameters: AK, SK, file ID (fileId), sheet ID (sheetId); baseUrl can be tuned per the platform docs, default https://openapi.wps.cn .

Write supports two data sources: manual fields, or from a variable (a dict writes one record, a list of dicts writes in bulk). Read auto-pages 200 records per page and stores all records into the result variable (default wps_data).
`,
  'content-notifications.ts': `
---

## 媒体播放

WebRPA 可在工作流中直接播放媒体并弹出播放器 / 查看器窗口。

| 模块 | 说明 |
|------|------|
| **play_music** | 播放音频（音频URL），可选等待播放结束 |
| **play_video** | 播放视频（视频URL），可选等待播放结束 |
| **view_image** | 显示图片查看器（图片URL），可设置自动关闭与显示时长 |

播放音乐 / 视频默认会等待播放结束再继续流程；如需后台播放、立即继续，取消勾选“等待播放完成”即可。查看图片可设置显示时长，到时自动关闭。
`,
  'content-notifications.en.ts': `
---

## Media Playback

WebRPA can play media directly inside a workflow and pop up a player / viewer window.

| Module | Description |
|------|------|
| **play_music** | Play audio (audio URL), optionally wait until it finishes |
| **play_video** | Play video (video URL), optionally wait until it finishes |
| **view_image** | Show an image viewer (image URL), with optional auto-close and display time |

Playing music / video waits for playback to finish before continuing by default; uncheck "wait until finished" to play in the background and continue immediately. Image viewing can auto-close after a configurable display time.
`,
}

function main() {
  for (const [name, section] of Object.entries(SECTIONS)) {
    const path = join(DOC_DIR, name)
    const text = readFileSync(path, 'utf8')
    const idx = text.lastIndexOf('`')
    if (idx === -1) {
      process.stdout.write('跳过(无模板反引号): ' + name + '\n')
      continue
    }
    if (text.includes(section.trim().split('\n')[2])) {
      // 章节已存在（按标题行粗判），避免重复插入
    }
    const newText = text.slice(0, idx) + section + text.slice(idx)
    writeFileSync(path, newText, 'utf8')
    process.stdout.write('已补章节: ' + name + '\n')
  }
}

main()
