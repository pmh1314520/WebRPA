export const imageGuideContentEn = `# 🖼️ Image Processing

This chapter introduces the image editing and processing modules provided by WebRPA, built on the Pillow (PIL) library.

---

## 📐 Image Transformations

### Resize Image (image_resize)

Adjust the dimensions of an image.

| Parameter | Description | Example |
|------|------|------|
| Input image | Source path or variable | \`{img_path}\` |
| Width/Height | Target size (pixels) | \`800, 600\` |
| Keep ratio | Fill in only width or height | Yes |
| Result variable | Saves the output path | \`resized_image\` |

### Crop Image (image_crop)

Crop a specified region of an image.

| Parameter | Description |
|------|------|
| Left/Top/Right/Bottom | Crop region coordinates (pixels) |
| Result variable | Saves the cropped image path |

### Rotate Image (image_rotate)

| Parameter | Description |
|------|------|
| Rotation angle | Clockwise angle (0-360) |
| Expand canvas | Whether to enlarge the canvas after rotation |
| Result variable | Saves the rotated image path |

### Flip Image (image_flip)

Flip the image horizontally or vertically (mirror effect).

| Parameter | Description |
|------|------|
| Flip direction | horizontal / vertical |
| Result variable | Saves the flipped image path |

### Generate Thumbnail (image_thumbnail)

Quickly generate a thumbnail while keeping the aspect ratio.

| Parameter | Description |
|------|------|
| Max width/height | Maximum thumbnail size |
| Result variable | Saves the thumbnail path |

---

## 🎨 Image Color Adjustment

### Brightness Adjustment (image_brightness)

| Parameter | Description |
|------|------|
| Brightness factor | 1.0 original, >1 brighter, <1 darker |
| Result variable | \`brightness_image\` |

### Contrast Adjustment (image_contrast)

| Parameter | Description |
|------|------|
| Contrast factor | 1.0 original, >1 enhanced |
| Result variable | \`contrast_image\` |

### Color Balance (image_color_balance)

Adjust saturation: 0 grayscale, 1 original, >1 enhanced saturation.

### Grayscale (image_grayscale)

Convert a color image to a black-and-white grayscale image.

### Image Filter (image_filter)

| Filter | Effect |
|------|------|
| BLUR | Gaussian blur |
| SHARPEN | Sharpen |
| EDGE_ENHANCE | Edge enhancement |
| EMBOSS | Emboss effect |
| SMOOTH | Smooth |

### Image Blur (image_blur)

Apply Gaussian blur to the image; the larger the radius, the blurrier.

### Image Sharpen (image_sharpen)

Enhance image clarity and edge detail.

### Round Corners (image_round_corners)

Add rounded corners to an image.

| Parameter | Description |
|------|------|
| Corner radius | Pixels; larger means rounder |
| Result variable | Save path |

---

## 📝 Image Content Operations

### Add Text to Image (image_add_text)

Overlay text on an image.

| Parameter | Description | Example |
|------|------|------|
| Text content | The text to add | \`WebRPA\` |
| X/Y position | Starting coordinates of the text | \`10, 10\` |
| Font size | Pixels | \`36\` |
| Color | Color name or hex | \`red\` |
| Result variable | Save path | \`text_image\` |

### Add Watermark (add_watermark)

Overlay an image watermark (such as a logo) on an image.

| Parameter | Description |
|------|------|
| Watermark image | Watermark image path |
| Position | topleft/topright/bottomleft/bottomright/center |
| Opacity | 0-1 (1 = opaque) |
| Result variable | Save path |

### Merge Images (image_merge)

Stitch multiple images into one.

| Parameter | Description |
|------|------|
| Image list | Multiple image paths (separated by line breaks) |
| Merge direction | horizontal / vertical |
| Spacing | Spacing between images (pixels) |
| Result variable | Saves the merged image path |

### Simple Background Removal (image_remove_bg)

Remove the image background based on a color threshold.

| Parameter | Description |
|------|------|
| Background color | The color to remove (default white) |
| Tolerance | Color similarity tolerance (0-255) |
| Result variable | Saves the transparent PNG path |

---

## 🛠️ Image Tools

### Get Image Info (image_get_info)

Get the width, height, format, file size, and other information of an image.

| Parameter | Description |
|------|------|
| Input image | Image path |
| Result variable | Saves an info dict (width/height/format/size, etc.) |

### Convert Image Format (image_convert_format)

Convert image format (JPG/PNG/WebP/BMP/GIF, etc.).

| Parameter | Description | Example |
|------|------|------|
| Input image | Source image path | \`{img_path}\` |
| Target format | Output format | \`webp\` |
| Quality | 1-100 (effective for JPG/WebP) | \`85\` |
| Result variable | Saves the converted path | \`converted_image\` |

### Generate QR Code (qr_generate)

Generate a QR code image.

| Parameter | Description | Example |
|------|------|------|
| Content | Text or URL to encode | \`https://example.com\` |
| Size | Image size (pixels) | \`300\` |
| Error correction | L/M/Q/H | \`M\` |
| Save path | Output path | \`C:\\qr.png\` |
| Result variable | Save path | \`qr_path\` |

### Decode QR Code (qr_decode)

Recognize and decode a QR code or barcode from an image.

| Parameter | Description |
|------|------|
| Input image | Image path containing the QR code |
| Result variable | Saves the decoded content (string) |

---

## 🔄 Format Factory

The Format Factory module supports batch conversion of image, video, and audio formats.

### Image Format Conversion (image_format_convert)

| Parameter | Description |
|------|------|
| Input path | Image path or folder |
| Target format | jpg/png/webp/bmp/gif |
| Quality | Compression quality (1-100) |
| Result variable | Saves the converted path |

### Video Format Conversion (video_format_convert)

| Parameter | Description |
|------|------|
| Input path | Video file path |
| Target format | mp4/avi/mkv/mov/webm, etc. |
| Video codec | h264/h265/vp9, etc. |
| Result variable | Saves the converted path |

### Audio Format Conversion (audio_format_convert)

| Parameter | Description |
|------|------|
| Input path | Audio file path |
| Target format | mp3/aac/flac/wav/ogg, etc. |
| Bitrate | 128k/192k/320k, etc. |
| Result variable | Saves the converted path |

### Video to GIF (video_to_gif)

| Parameter | Description |
|------|------|
| Input video | Video file path |
| Start time | Seconds |
| Duration | Seconds |
| Frame rate | GIF frame rate (10-15 recommended) |
| Width | GIF width (pixels) |
| Result variable | Saves the GIF path |

### Batch Format Conversion (batch_format_convert)

Batch convert the formats of all media files in an entire folder.

| Parameter | Description |
|------|------|
| Input folder | Source folder path |
| Media type | image/video/audio |
| Target format | Target format |
| Output folder | Where converted files are saved |
| Result variable | List of successfully converted files |

---

## 💡 Tips

- When the **output path** of any image processing module is left empty, a new file is generated in the same directory as the source file
- For batch processing, combine the "Loop List" module with the "Get File List" module
- Image quality is proportional to file size; generally, 75-85 quality balances effect and size
- For format conversion, WebP is recommended first: smaller in size and better in quality

---

## 🫥 Blind Watermark (Invisible Digital Watermark)

WebRPA integrates **blind_watermark** (frequency-domain DWT-DCT-SVD), embedding "text" or a "small image" into an image in a way invisible to the human eye. It can resist common re-processing such as screenshots, JPEG recompression, and slight scaling/cropping.

> Unlike "Add Text to Image" and "PDF Watermark", which are explicit watermarks: a blind watermark is **invisible** but **extractable**, commonly used for copyright tracing and internal-document leak prevention.

### General Notes

- Embedding and extraction must use the **exact same two passwords** (password_wm watermark password, password_img image password); otherwise the extracted result is garbled
- When extracting a text watermark, you must pass the \`wm_bit_len\` returned during embedding (saved in the result variable)
- When extracting an image watermark, you must pass the original watermark image size \`[h, w]\` returned during embedding
- PNG output is recommended to avoid watermark loss caused by JPEG re-compression

### Blind Watermark · Embed Text (bwm_embed_text)

| Parameter | Description |
|---|---|
| Source image path | Carrier image, PNG or high-quality JPEG recommended |
| Watermark text | Text to embed (supports Chinese/English/numbers) |
| Output image path | Save path of the embedded image (.png recommended) |
| Watermark password/Image password | Two integer passwords, must match during extraction |
| Result variable name | Saves \`wm_bit_len\`, **required during extraction** |

### Blind Watermark · Extract Text (bwm_extract_text)

| Parameter | Description |
|---|---|
| Watermarked image path | The embedded image |
| wm_bit_len | The length returned during embedding; you can use \`{{wm_bit_len}}\` to reference the variable |
| Watermark password/Image password | Must match those used during embedding |
| Result variable name | Saves the extracted text string |

### Blind Watermark · Embed Image (bwm_embed_image)

| Parameter | Description |
|---|---|
| Source image path (carrier) | Large image |
| Watermark image path | Small image, a black-and-white binary image (such as a logo) recommended |
| Output image path | Save path of the embedded image |
| Watermark password/Image password | Two integer passwords |
| Result variable name | Saves the watermark image size \`[h, w]\`, **required during extraction** |

### Blind Watermark · Extract Image (bwm_extract_image)

| Parameter | Description |
|---|---|
| Watermarked image path | The embedded image |
| Extraction output path | Save path of the restored watermark image |
| Watermark height / Watermark width | The two components of the \`shape\` returned during embedding; you can use \`{{shape}}[0]\` and \`{{shape}}[1]\` |
| Watermark password/Image password | Must match those used during embedding |

### Complete Workflow Example (Embed → Extract Text)

\`\`\`mermaid
flowchart LR
  A[source.png] --> B[Blind Watermark · Embed Text<br/>text='© Me'<br/>password_wm=42]
  B -- output_wm.png + wm_bit_len --> C[Image<br/>Save As / Share / Upload]
  C --> D[Blind Watermark · Extract Text<br/>password_wm=42<br/>wm_bit_len={{wm_bit_len}}]
  D --> E[Got text '© Me']
\`\`\`
`
