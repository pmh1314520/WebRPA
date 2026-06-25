export const aiVisionGuideContentEn = `# AI Recognition & Computer Vision

This chapter covers OCR text recognition, captcha recognition, face recognition and the AI smart crawler.

---

## OCR captcha (ocr_captcha)

Use ddddocr to recognize common image captchas on web pages.

| Parameter | Description | Example |
|------|------|------|
| Captcha source | Element screenshot / image path / URL | Element screenshot |
| Selector | CSS selector of the captcha image | \`#captcha-img\` |
| Result variable | Saves the recognized text | \`captcha_text\` |

**Example** (auto-fill a captcha):
\`\`\`mermaid
flowchart TD
    A[Open login page] --> B[OCR captcha]
    B --> C[Enter account, password and captcha]
    C --> D[Click login]
\`\`\`

---

## Slider captcha (slider_captcha)

Automatically solve a slider captcha (drag the slider to the gap).

| Parameter | Description |
|------|------|
| Slider image selector | CSS selector of the slider image |
| Background image selector | CSS selector of the background image |
| Slider element selector | The draggable slider HTML element |
| Result variable | Whether the slide succeeded |

> Slider structures differ by site; adjust selectors accordingly.

---

## Image OCR (image_ocr)

Use EasyOCR to recognize text in an image, supporting 80+ languages.

| Parameter | Description | Example |
|------|------|------|
| Image path | Local image or URL | \`{screenshot_path}\` |
| Languages | List of language codes | \`chi_sim,en\` |
| Return format | Plain text / detailed with coordinates | Plain text |
| Result variable | Saves the recognized text | \`ocr_text\` |

Common languages: Simplified Chinese \`chi_sim\`, Traditional \`chi_tra\`, English \`en\`, Japanese \`ja\`, Korean \`ko\`.

---

## Face recognition (face_recognition)

Compare faces in two images to see if they're the same person.

| Parameter | Description | Example |
|------|------|------|
| Known face image | Reference image path | \`known.jpg\` |
| Image to recognize | The image to verify | \`{camera_img}\` |
| Similarity threshold | 0-1, smaller is stricter | \`0.6\` |
| Result variable | Contains matched/distance/similarity | \`face_match_result\` |

---

## AI smart crawler (ai_smart_scraper)

Describe the data to extract in natural language; the AI analyzes the page and extracts it — no selectors needed.

| Parameter | Description | Example |
|------|------|------|
| Target URL | The page to crawl | \`https://example.com\` |
| Extraction prompt | Natural-language description | \`Extract every product's name and price\` |
| LLM provider | OpenAI / local model, etc. | \`openai\` |
| API Key | The LLM API key | \`sk-...\` |
| Result variable | Saves the structured data | \`scraper_result\` |

> Preset the crawler's LLM config in Global settings to avoid re-entering it.

---

## AI element selector (ai_element_selector)

Describe a page element in natural language; the AI generates a CSS selector.

| Parameter | Description | Example |
|------|------|------|
| Element description | Describe the element | \`login button\` |
| URL | The target page | \`{current_url}\` |
| Result variable | Saves the generated selector | \`element_selector\` |

The generated selector can be used directly in the "Selector" field of click, type and other modules.

---

## Firecrawl

Firecrawl is a professional AI crawler service supporting JS rendering and smart content extraction.

### Single-page scrape (firecrawl_scrape)

Scrape one page, returning clean Markdown content.

| Parameter | Description |
|------|------|
| URL | The target page |
| API Key | Firecrawl API key |
| Format | markdown / html / links |
| Result variable | Saves the page content |

### Site map (firecrawl_map)

Get the URL list (site map) of an entire site.

| Parameter | Description |
|------|------|
| Root URL | Site home or a subdirectory |
| Max links | How many URLs to return |
| Result variable | The URL list |

### Full-site crawl (firecrawl_crawl)

Crawl all page content of an entire site.

| Parameter | Description |
|------|------|
| Root URL | The crawl starting point |
| Max pages | Maximum pages to crawl |
| Result variable | A list of all page contents |

> Firecrawl requires registering at [firecrawl.dev](https://www.firecrawl.dev) to get an API key.

---

## Tips

- **OCR preprocessing**: sharpen the image before OCR to improve accuracy
- **Captcha retry**: on failure, refresh the captcha and retry (condition + loop)
- **Face threshold**: usually 0.5-0.6; too small causes false positives, too large misses matches
- **Crawler prompts**: the more specific, the better, e.g. "Extract the product-name text inside li tags"
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
`
