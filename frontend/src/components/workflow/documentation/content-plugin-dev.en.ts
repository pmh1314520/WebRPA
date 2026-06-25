export const pluginDevContentEn = `# Plugin Market & Extension Development

WebRPA exposes a plugin extension capability: third-party developers can package "automation for a specific site/scenario" into a plugin and publish it to the plugin market for everyone to install with one click. Once installed, the modules a plugin contributes appear directly in the editor sidebar and work like built-in modules.

> Entry: top bar "Workflow Hub" -> "Plugins" tab.

---

## 1. What plugins can do

- Package dedicated modules for a specific site, e.g. "Douyin backend - publish video", "Pinduoduo seller - list/unlist product", "Some CRM - create customer".
- Package a common workflow into a single module to lower the barrier for others.
- Bundle "site-adaptation knowledge" for the AI assistant so it understands the site better.

---

## 2. Plugin package format (plugin.json)

\`\`\`json
{
  "id": "douyin-backend",
  "name": "Douyin Backend Automation",
  "version": "1.0.0",
  "author": "Your name",
  "description": "Publish/scrape modules for the Douyin creator backend",
  "homepage": "https://your-site.com",
  "keywords": ["douyin", "ecommerce"],
  "knowledge": "Site-adaptation hints for the AI assistant (optional)",
  "modules": [
    {
      "name": "douyin_publish",
      "display_name": "Douyin - Publish video",
      "description": "Upload and publish a video",
      "icon": "",
      "color": "#fe2c55",
      "parameters": [
        { "name": "videoPath", "label": "Video path", "type": "string", "required": true }
      ],
      "outputs": [ { "name": "publishUrl", "label": "Publish link" } ],
      "workflow": { "nodes": [], "edges": [] }
    }
  ]
}
\`\`\`

**Where does modules[].workflow come from?** Easiest: build the feature as a workflow in the editor -> wrap it as a "custom module" -> use the module card's "Export" to get JSON -> fill its \`parameters / outputs / workflow\` into the plugin package.

---

## 3. Install & debug

1. Open "Workflow Hub -> Plugins".
2. Click "Install from file" and choose your \`plugin.json\`.
3. After installing, the modules appear in the sidebar (category tag \`plugin:<plugin id>\`) and can be dragged in.
4. In "Installed" you can enable / disable / uninstall.

> Disabling removes the modules but keeps the package — re-enable to restore instantly; uninstalling deletes it completely.

---

## 4. Publish to the plugin market

Deploy a "market index" JSON to any publicly accessible URL:

\`\`\`json
{
  "plugins": [
    {
      "id": "douyin-backend",
      "name": "Douyin Backend Automation",
      "version": "1.0.0",
      "author": "Your name",
      "description": "...",
      "downloadUrl": "https://your-cdn.com/douyin-backend.plugin.json"
    }
  ]
}
\`\`\`

Set the "Plugin market index URL" in Global settings to that URL, and all users can see and one-click install it in the market. When unset, built-in sample plugins are shown for reference.

---

## 5. Extension API (REST)

| Method / Path | Description |
|---|---|
| GET /api/plugins/installed | Installed list |
| GET /api/plugins/market | Market list |
| POST /api/plugins/install | Install a local package |
| POST /api/plugins/install-from-market/{id} | Install from the market |
| POST /api/plugins/{id}/enable | Enable/disable |
| DELETE /api/plugins/{id} | Uninstall |
| GET /api/plugins/{id}/export | Export a market-ready package JSON |
| POST /api/plugins/{id}/publish | Publish (optional hubUrl, POST to the hub) |
| GET /api/plugins/{id}/reviews | Get ratings/comments (merging local and hub) |
| POST /api/plugins/{id}/reviews | Submit a rating (1-5) and comment |

---

## 6. One-click publish & ratings

- Click "Publish" on each plugin in the "Installed" list: if a market URL is set in Global settings, it POSTs to \`{market}/publish\` as agreed; otherwise it exports a market-ready \`<id>.market.json\` under \`backend/data/plugins/\` for manual publishing.
- In the "Details / Ratings" dialog you can view the average score and all reviews, and submit your own 1-5 star rating and comment. Ratings are stored locally; if a market URL is set, they sync via \`POST {market}/reviews\`, and reading merges remote reviews from \`GET {market}/reviews/{id}\`.

> Hub-side contract (implement when self-hosting a central hub): \`POST /publish\` receives the full plugin package; \`POST /reviews\` receives \`{pluginId, rating, comment, user}\`; \`GET /reviews/{id}\` returns \`{reviews:[...]}\`.

A fuller illustrated dev guide is on the WebRPA website's "Plugin Development" page. For issues, contact the author: QQ 2124691573 / WeChat QyPmh20061026.`
