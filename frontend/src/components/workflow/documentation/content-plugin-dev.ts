export const pluginDevContent = `# 🧩 插件市场与扩展开发

WebRPA 开放了插件扩展能力：第三方开发者可以把「针对特定网站 / 场景的自动化能力」封装成插件，
上架到插件市场，供所有用户一键安装。安装后，插件贡献的模块会直接出现在编辑器侧栏，可像内置模块一样使用。

> 入口：顶部「工作流仓库」→「插件」标签页。

---

## 一、插件能做什么

- 为特定网站封装专用模块，例如「抖音后台-发布视频」「拼多多商家-上下架商品」「某 CRM-创建客户」。
- 把常用工作流封装成单个模块，降低他人使用门槛。
- 附带给 AI 小助手的「站点适配知识」，让小助手更懂这个网站。

---

## 二、插件包格式（plugin.json）

\`\`\`json
{
  "id": "douyin-backend",
  "name": "抖音后台自动化",
  "version": "1.0.0",
  "author": "你的名字",
  "description": "为抖音创作者后台封装的发布、采集模块",
  "homepage": "https://your-site.com",
  "keywords": ["抖音", "电商"],
  "knowledge": "给 AI 小助手的站点适配提示（可选）",
  "modules": [
    {
      "name": "douyin_publish",
      "display_name": "抖音-发布视频",
      "description": "上传并发布一个视频",
      "icon": "🎬",
      "color": "#fe2c55",
      "parameters": [
        { "name": "videoPath", "label": "视频路径", "type": "string", "required": true }
      ],
      "outputs": [ { "name": "publishUrl", "label": "发布链接" } ],
      "workflow": { "nodes": [], "edges": [] }
    }
  ]
}
\`\`\`

**modules[].workflow 怎么来？** 最简单：在编辑器里把功能搭成工作流 → 封装为「自定义模块」→ 用模块卡片的「导出」拿到 JSON →
把其中的 \`parameters / outputs / workflow\` 填进插件包。

---

## 三、安装与调试

1. 打开「工作流仓库 → 插件」。
2. 点「从文件安装」，选择你的 \`plugin.json\`。
3. 安装后，模块出现在侧栏（分类标签 \`plugin:<插件id>\`），可拖拽使用。
4. 在「已安装」里可启用 / 禁用 / 卸载。

> 禁用会移除模块但保留安装包，再次启用一键恢复；卸载会彻底删除。

---

## 四、上架到插件市场

部署一个「市场索引」JSON 到任意可公开访问的 URL：

\`\`\`json
{
  "plugins": [
    {
      "id": "douyin-backend",
      "name": "抖音后台自动化",
      "version": "1.0.0",
      "author": "你的名字",
      "description": "...",
      "downloadUrl": "https://your-cdn.com/douyin-backend.plugin.json"
    }
  ]
}
\`\`\`

在「全局配置」里把「插件市场索引地址」设为该 URL，所有用户即可在插件市场看到并一键安装。
未配置时显示内置示例插件供参考。

---

## 五、扩展 API（REST）

| 方法 / 路径 | 说明 |
|---|---|
| GET /api/plugins/installed | 已安装列表 |
| GET /api/plugins/market | 市场列表 |
| POST /api/plugins/install | 安装本地包 |
| POST /api/plugins/install-from-market/{id} | 从市场安装 |
| POST /api/plugins/{id}/enable | 启用/禁用 |
| DELETE /api/plugins/{id} | 卸载 |

更完整的图文版开发文档见 WebRPA 官网「插件开发文档」页。遇到问题可联系作者：QQ 2124691573 / 微信 QyPmh20061026。
`
