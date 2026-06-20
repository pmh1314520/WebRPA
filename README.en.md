<div align="center">
    <img src="png/logo.png" width="100" alt="WebRPA Logo"/>
</div>
<h1 align="center">
WebRPA - Visual Web Robotic Process Automation
</h1>
<p align="center">
  <img src="https://img.shields.io/badge/version-2.2.0-blue.svg" alt="version">
  <img src="https://img.shields.io/badge/modules-560+-brightgreen.svg" alt="modules">
  <img src="https://img.shields.io/badge/license-AGPL--3.0%20%2B%20Commercial-green.svg" alt="license">
  <img src="https://img.shields.io/badge/author-QingYun__PengMingHang-orange.svg" alt="author">
  <img src="https://img.shields.io/badge/Python-3.13-blue.svg" alt="Python">
  <img src="https://img.shields.io/badge/React-19-61dafb.svg" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5-3178c6.svg" alt="TypeScript">
</p>

<p align="center">
  <a href="README.md">中文</a> · <b>English</b>
</p>

**A powerful visual web-automation tool (with some Windows desktop and Android automation support). Build automation workflows by dragging and dropping modules — no coding required — for web scraping, form filling, automated testing and more.**

> **⚠️ Disclaimer: This software is provided as a technical tool only. Users must comply with all applicable laws and regulations. The developer assumes no liability for how the software is used.**

> **Download the latest `.7z` from Releases — the latest source code and the bundled runtime are inside; just extract and run.**
>
> Support WebRPA development: [Sponsor page](https://ifdian.net/a/qypmh)

## ✨ Features

### 🎯 Core Strengths

- **🚀 Zero-code**: Visual drag-and-drop, no programming background needed
- **📦 Out of the box**: Bundled Python & Node.js runtimes, one-click start
- **🔧 Rich modules**: 560+ modules covering ~95% of automation scenarios, including DrissionPage-based anti-detection web automation
- **🤖 AI Assistant**: Built-in AI that understands your intent in plain language, builds/diagnoses workflows, and **self-heals** (auto diagnose → fix → re-run on failure). OpenAI-compatible (OpenAI / Zhipu / DeepSeek / Ollama, etc.). Includes **three permission modes** (Per-action approval / Smart auto / Full access) and one-click **AI diagnosis** when the editor hits an error
- **🛡️ Never blank-screens**: A global error boundary catches any component crash and shows an error card (with details + AI diagnosis) instead of a blank editor
- **🌳 Version history**: Git-style local snapshots (nodes, edges, and global variables) with restore/compare; the assistant auto-commits before big edits
- **☁️ WebDAV remote storage**: Save/load workflows to a NAS, Nextcloud, or other WebDAV server for multi-device sharing
- **⌨️ Custom shortcuts**: Bind your own key combos to common actions (run/stop/save/new, etc.)
- **🎨 Polished UI**: Modern design with smooth motion and Mermaid flow charts
- **⚡ Fast**: Built on FastAPI + React
- **🔌 Extensible**: Modular architecture, custom modules, and MCP server integration
- **📚 Well documented**: Built-in tutorials covering every module category
- **🆓 Free**: Free for non-commercial use, open source
- **🔍 Smart search**: Fuzzy search for modules/docs (Chinese, Pinyin, Pinyin initials)
- **🌐 Fully offline**: All resources are local; works on isolated/LAN networks

---

## 🚀 Quick Start

1. Download the latest full `.7z` package from Releases and extract it.
2. Run **WebRPA启动器.exe** (the launcher).
3. Click **Start WebRPA**; the launcher boots the backend API and the front-end editor and opens it in your browser.
4. Drag modules from the left palette onto the canvas, connect them, configure each node, and click **Run**.

> The launcher and editor auto-detect your system language on first launch. You can switch language at any time in settings.

## 🧱 Tech Stack

- **Backend**: Python 3.13 + FastAPI + Playwright + DrissionPage
- **Frontend**: React 19 + TypeScript 5 + React Flow + Tailwind CSS
- **Launcher**: Tauri 2 (Rust) + Vue 3
- **AI**: OpenAI-compatible protocol (chat + tool calling / skills)

## 🤝 Contributing & Plugins

WebRPA is evolving toward an open plugin ecosystem so third-party developers can build site/scenario-specific
plugins (e.g. adapters for specific admin panels or CRMs) and publish them to the in-app marketplace. Detailed
developer documentation will be provided on the official website.

## 📮 Contact the Author (PengMingHang)

- QQ: 2124691573 · WeChat: QyPmh20061026 · QQ Group: 115069513
- GitHub: https://github.com/pmh1314520
- Bilibili: https://space.bilibili.com/1102546347

## 📄 License

AGPL-3.0 + Commercial license. Free for non-commercial use. For commercial licensing, contact the author.
