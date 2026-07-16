# WebRPA 启动器

现代化的 WebRPA 桌面启动器，使用 Electron + Vue 3 开发。

> 采用 Electron 内置 Chromium 运行界面，无需依赖系统 WebView2 运行时，开箱即用。

## 功能特性

- 一键启动前后端服务
- 实时写入服务日志（backend/logs、frontend/logs）
- 自动检查版本更新
- 系统托盘 / 最小化到托盘 / 开机自启 / 启动时自动隐藏
- 独立小助手 Agent 窗口（置顶、可拖动、QQ 式贴边自动隐藏）
- 现代化无边框 UI

## 开发环境要求

- Node.js 16+
- 项目内置的 Node.js 和 Python 环境（Python313、nodejs 文件夹）

## 安装依赖

```bash
cd launcher
npm install
```

## 开发模式

```bash
npm run dev
```

（等价于同时启动 Vite 开发服务器与 Electron，双击 `开发模式.bat` 亦可。）

## 构建应用

```bash
npm run build
```

构建完成后，可执行文件位于 `launcher/release/WebRPA启动器.exe`（electron-builder portable 单文件）。

## 项目结构

```
launcher/
├── src/                    # Vue 前端源码（启动器界面）
│   ├── App.vue            # 主组件
│   ├── main.js            # 入口文件
│   ├── bridge.js          # Electron 兼容层（invoke / 窗口控制）
│   └── style.css          # 全局样式
├── electron/              # Electron 主进程
│   ├── main.cjs           # 主进程（服务管理、托盘、Agent 窗口等）
│   └── preload.cjs        # 预加载脚本（contextBridge）
├── dist/                  # vite build 产物（打包内嵌）
├── logo.ico               # 应用图标
├── package.json           # Node.js 依赖与脚本
├── vite.config.js         # Vite 配置
└── electron-builder.json  # 打包配置
```

## 使用说明

1. 双击运行 `WebRPA启动器.exe`
2. 点击"启动服务"按钮启动前后端
3. 等待服务启动完成后可打开浏览器
4. 点击"检查更新"可检查新版本

## 注意事项

- 启动器需要放在 WebRPA 项目根目录
- 确保 Python313 和 nodejs 文件夹存在
- 首次启动可能需要较长时间
