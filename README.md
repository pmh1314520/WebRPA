<div align="center">
    <img src="png/logo.png" width="100" alt="Web RPA Logo"/>
</div>
<h1 align="center">
Web RPA - 网页机器人流程自动化工具
</h1>
<p align="center">
  <img src="https://img.shields.io/badge/版本-1.22.26-blue.svg" alt="版本">
  <img src="https://img.shields.io/badge/协议-CC%20BY--NC--SA%204.0-green.svg" alt="协议">
  <img src="https://img.shields.io/badge/作者-青云制作__彭明航-orange.svg" alt="作者">
</p>




**一款功能强大的可视化网页自动化工具（支持少量系统桌面自动化），通过拖拽模块的方式快速构建自动化工作流，无需编写代码即可实现网页数据采集、表单填写、自动化测试等任务。**

> **【仓库中的源码将不再更新，请直接在Releases中下载最新7z压缩包以获取最新源码】**

## ✨ 功能特性

### 🌐 浏览器自动化
- 打开/关闭/刷新/前进/后退网页
- 切换iframe/返回主页面（支持内嵌网页自动化）
- 点击、悬停、输入文本
- 下拉选择、复选框操作
- 拖拽元素、滚动页面
- 处理弹窗对话框
- 可视化元素选择器
- 等待元素出现/消失

### 📥 数据采集
- 提取页面元素数据
- 网页截图/屏幕截图
- 下载文件/保存图片
- 支持相似元素批量采集
- 网络请求抓包

### 📊 数据处理
- 变量管理系统
- JSON 解析
- Base64 编解码
- 正则表达式提取
- 字符串处理（拼接、替换、分割、截取、大小写转换等）
- 列表操作（添加、删除、获取、长度等）
- 字典操作（设置、获取、键列表等）
- 数据表格操作（添加行/列、设置/读取单元格、导出等）
- Excel 读取与导出

### 🗄️ 数据库操作
- MySQL 数据库连接
- 增删改查操作
- 自定义 SQL 执行
- 连接池管理

### 📁 文件操作
- 获取文件列表
- 复制/移动/删除文件
- 创建文件夹
- 文件/文件夹重命名
- 读取/写入文本文件
- 获取文件信息
- 检查文件是否存在

### 🎬 媒体处理
- 格式转换（视频/音频/图片）
- 视频压缩（支持进度显示）
- 图片压缩
- 提取音频
- 视频裁剪
- 媒体合并（支持音视频合并）
- 添加水印
- M3U8视频下载
- 视频旋转/翻转
- 视频倍速播放
- 视频截取帧
- 视频添加字幕
- 音频调节音量
- 视频分辨率调整
- 摄像头拍照
- 摄像头录像（非阻塞式）

### 🔀 流程控制
- 条件判断（支持多种比较运算）
- 循环（次数循环、条件循环）
- 列表遍历
- 跳出/跳过当前循环
- 子流程复用
- 定时任务

### ⚡ 触发器系统
- **Webhook触发器**：等待HTTP请求触发工作流
- **热键触发器**：全局热键监听，按下指定组合键触发
- **文件监控触发器**：监控文件/文件夹变化（创建/修改/删除）
- **邮件触发器**：监控邮箱，收到符合条件的邮件时触发
- **API触发器**：轮询API接口，满足条件时触发
- **定时触发器**：支持间隔触发、指定时间触发、Cron表达式等多种定时模式
- **鼠标触发器**：监听鼠标点击、滚动、移动等事件
- **图像触发器**：检测屏幕上出现指定图像时触发
- **声音触发器**：监听系统音频输出，达到音量阈值时触发
- **人脸触发器**：实时识别摄像头画面，检测到目标人脸时触发
- **元素变化触发器**：监控网页元素子元素数量变化，实时检测新增内容

### 🤖 AI 能力
- AI 对话（支持 OpenAI、智谱、Deepseek、通义千问、Gemini、Azure等）
- 图像识别/AI视觉
- AI智能爬虫（自然语言描述提取数据，自适应网页结构变化）
- AI元素选择器（自然语言描述定位元素）
- 人脸识别
- 图片 OCR

### 🔐 验证码处理
- OCR 文字识别验证码
- 滑块验证码自动处理

### 🔔 消息通知与交互
- 打印日志（多级别）
- 播放提示音
- 系统通知（Windows右下角通知）
- 播放音乐（支持播放器控制）
- 播放视频（支持播放器控制）
- 查看图片（支持缩放/旋转/下载）
- 语音播报（TTS）
- 用户输入弹窗（支持多种输入模式）
- 发送邮件
- 导出日志（支持TXT/JSON/CSV格式）

### 🖥️ 系统操作
- 真实鼠标点击/移动/拖拽/滚动
- 真实键盘输入
- 宏录制器（录制并回放鼠标键盘操作）
- 模拟按键组合
- 剪贴板读写（支持文本和图片）
- 执行系统命令
- 点击图像（图像识别点击）
- 点击文字（OCR文字识别点击）
- 悬停图像/悬停文字
- 拖拽图像
- 获取鼠标位置
- 窗口聚焦/置顶
- 关机/重启/锁屏

### 🛠️ 辅助功能
- 自定义 JavaScript 脚本执行
- HTTP/API 请求
- 随机数生成
- 获取当前时间
- 分组/备注节点
- 子流程复用（模块化工作流）
- 智能超时配置（根据模块类型自动设置合理超时）
- 模块搜索支持拼音和首字母
- 模块收藏功能（可自定义排序）
- 网络抓包（监听网络请求）
- 网络共享（局域网文件/文件夹共享）
- 屏幕共享（局域网实时屏幕投屏）
- QQ自动化（发送消息/图片/文件，获取好友/群列表，等待消息触发）
- 微信自动化（发送消息/文件）

---

## 🖼️ 界面预览

工作流编辑器采用可视化拖拽设计，左侧模块列表，中间画布区域，右侧配置面板，底部日志/数据/变量面板等

![](png/展示图1.png)

---

![](png/展示图2.png)

---

![](png/展示图3.png)

---

![](png/展示图4.png)

---

![](png/展示图5.png)

---

![](png/展示图6.png)

---

![](png/展示图7.png)

------

![](png/展示图8.png)

------

## 🚀 快速开始

### 环境要求

- Windows 10/11（本项目仅支持Windows系统使用）
- 项目自带 Python 3.13 和 Node.js（无需额外安装）

### 启动方式

在Releases中下载最新版7z压缩包，之后解压出来，直接双击其中的 `双击启动WebRPA本地服务.bat` 即可快速启动本项目：

- 后端服务：http://localhost:8000
- 前端服务：http://localhost:5173

### 开发模式

如需修改代码进行开发：

```bash
# 后端
cd backend
../Python313/python.exe -m pip install -r requirements.txt
../Python313/python.exe run.py

# 前端
cd frontend
../nodejs/npm install
../nodejs/npm run dev
```

---

## 📁 项目结构

```
WebRPA/
├── backend/                 # 后端服务 (Python FastAPI)
│   ├── app/
│   │   ├── api/            # API 路由
│   │   ├── executors/      # 模块执行器
│   │   ├── models/         # 数据模型
│   │   └── services/       # 核心服务
│   ├── requirements.txt
│   └── run.py
├── frontend/               # 前端界面 (React + TypeScript)
│   ├── src/
│   │   ├── components/     # UI 组件
│   │   ├── store/          # 状态管理
│   │   └── types/          # 类型定义
│   └── package.json
├── frameworkHub/           # 工作流市场服务 (Node.js)
├── Python313/              # 内置 Python 环境
├── nodejs/                 # 内置 Node.js 环境
├── backend/
│   ├── ffmpeg.exe          # 媒体处理工具
│   ├── ffprobe.exe         # 媒体信息工具
├── workflows/              # 本地工作流存储
└── 双击启动WebRPA本地服务.bat
```

---

## 📖 使用说明

项目内置完整的教学文档，点击工具栏的「教学文档」按钮即可查看。

### 基本操作

1. **创建工作流**：从左侧模块列表拖拽模块到画布
2. **连接模块**：从模块底部拖出连线到下一个模块顶部
3. **配置模块**：点击模块，在右侧面板配置参数
4. **使用变量**：在输入框中使用 `{变量名}` 引用变量
5. **运行工作流**：点击工具栏的运行按钮
6. **查看结果**：在底部面板查看日志、数据、变量

### 文档功能

- 📚 18个分类的详细教学文档
- 🔍 支持全局模糊搜索
- 📝 丰富的代码示例
- 💡 最佳实践指南

---

## 🔧 技术栈

### 前端

- **框架**：React 18 + TypeScript
- **构建工具**：Vite 6
- **UI 组件**：Radix UI + shadcn/ui
- **样式**：TailwindCSS 4
- **流程图**：React Flow
- **状态管理**：Zustand
- **图标**：Lucide React
- **Markdown 渲染**：React Markdown + remark-gfm

### 后端

- **运行时**：Python 3.13
- **Web 框架**：FastAPI + Uvicorn
- **实时通信**：Socket.IO
- **浏览器自动化**：Playwright (Microsoft Edge)
- **数据库连接**：PyMySQL
- **Excel 处理**：openpyxl
- **邮件发送**：smtplib + email
- **AI 集成**：OpenAI API 兼容接口
- **OCR 识别**：ddddocr
- **图像处理**：Pillow
- **媒体处理**：FFmpeg
- **HTTP 客户端**：httpx

### 工作流仓库服务

- **运行时**：Node.js
- **Web 框架**：Express
- **数据存储**：JSON 文件
- **进程管理**：PM2

---

## 📊 模块统计

| 分类 | 模块数量 |
|------|----------|
| 🌐 页面操作 | 8 |
| 🖱️ 元素交互 | 8 |
| 🔍 元素操作 | 2 |
| 📥 数据采集 | 5 |
| ⏱️ 等待控制 | 3 |
| 🖱️ 鼠标模拟 | 5 |
| ⌨️ 键盘模拟 | 2 |
| 🎯 图像/文字识别点击 | 5 |
| 📷 屏幕操作 | 3 |
| 🎹 宏录制 | 1 |
| 📝 变量操作 | 5 |
| ✂️ 文本处理 | 8 |
| 📋 列表/字典 | 7 |
| 📊 数据表格 | 8 |
| 🗄️ 数据库 | 7 |
| 🔀 流程控制 | 8 |
| ⚡ 触发器 | 10 |
| 📁 文件管理 | 11 |
| 📄 PDF处理 | 16 |
| 🎬 视频处理 | 10 |
| 🎵 音频处理 | 3 |
| 🖼️ 图像处理 | 4 |
| 📱 二维码 | 2 |
| 🌍 网络请求 | 8 |
| 💬 QQ自动化 | 8 |
| 💚 微信自动化 | 2 |
| 🤖 AI对话 | 2 |
| 🧠 AI智能 | 5 |
| 🔍 AI识别 | 4 |
| 📢 消息通知 | 4 |
| 🎮 媒体播放 | 3 |
| 💻 系统控制 | 8 |
| 📋 日志导出 | 1 |
| 💬 用户交互 | 1 |
| 📝 画布工具 | 2 |
| **总计** | **189 个模块** |

---

## 👤 作者

**青云制作_彭明航（一名痴迷于计算机技术无法自拔的大一新生）**

**个人导航站：[https://www.pmhs.top](https://www.pmhs.top)**

---

## 📄 开源协议

本项目采用 [CC BY-NC-SA 4.0](LICENSE) 协议开源。

### 协议要点：

- ✅ **署名**：使用或修改本项目时，必须注明原作者「青云制作_彭明航」
- ❌ **非商业性使用**：不得将本项目用于商业目的
- 🔄 **相同方式共享**：如果您修改或基于本项目二次创作，必须以相同协议开源

**如需商业授权，请联系作者（QQ：2124691573）。**

---

## 🙏 致谢

**感谢以下开源项目：**

### 前端框架与工具
- [React](https://react.dev/) - 前端框架
- [TypeScript](https://www.typescriptlang.org/) - 类型安全的 JavaScript
- [Vite](https://vitejs.dev/) - 快速的前端构建工具
- [React Flow](https://reactflow.dev/) - 流程图编辑器
- [TailwindCSS](https://tailwindcss.com/) - CSS 框架
- [Zustand](https://zustand-demo.pmnd.rs/) - 轻量级状态管理
- [Lucide React](https://lucide.dev/) - 图标库
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - 代码编辑器
- [Radix UI](https://www.radix-ui.com/) - 无样式 UI 组件库

### 后端框架与工具
- [FastAPI](https://fastapi.tiangolo.com/) - 现代化 Python Web 框架
- [Uvicorn](https://www.uvicorn.org/) - ASGI 服务器
- [Pydantic](https://docs.pydantic.dev/) - 数据验证
- [Socket.IO](https://socket.io/) - 实时双向通信

### 自动化与浏览器
- [Playwright](https://playwright.dev/) - 浏览器自动化
- [PyAutoGUI](https://pyautogui.readthedocs.io/) - 键鼠模拟
- [pynput](https://pynput.readthedocs.io/) - 键鼠监听

### 数据处理
- [Polars](https://pola.rs/) - 高性能数据处理
- [openpyxl](https://openpyxl.readthedocs.io/) - Excel 文件处理
- [PyMySQL](https://pymysql.readthedocs.io/) - MySQL 数据库连接
- [httpx](https://www.python-httpx.org/) - HTTP 客户端

### 媒体处理
- [FFmpeg](https://ffmpeg.org/) - 音视频处理
- [Pillow](https://pillow.readthedocs.io/) - 图像处理
- [OpenCV](https://opencv.org/) - 计算机视觉
- [pydub](https://github.com/jiaaro/pydub) - 音频处理
- [PyMuPDF](https://pymupdf.readthedocs.io/) - PDF 处理

### AI 与识别
- [EasyOCR](https://github.com/JaidedAI/EasyOCR) - OCR 文字识别
- [ddddocr](https://github.com/sml2h3/ddddocr) - 验证码识别
- [SpeechRecognition](https://github.com/Uberi/speech_recognition) - 语音识别
- [qrcode](https://github.com/lincolnloop/python-qrcode) - 二维码生成
- [pyzbar](https://github.com/NaturalHistoryMuseum/pyzbar) - 二维码解码

### 其他工具
- [Express](https://expressjs.com/) - Node.js Web 框架
- [mitmproxy](https://mitmproxy.org/) - 网络代理抓包
- [mss](https://python-mss.readthedocs.io/) - 屏幕截图
- [pywin32](https://github.com/mhammond/pywin32) - Windows API

---

## ⭐ Star History

这是我开源的第一款产品，如果这个项目对你有帮助，请点一个 Star ⭐ 支持一下！

<h4 align="center">☕请作者喝杯奶茶☕</h4>

<div align="center">
    <img src="png/微信收款码.png" width="200" alt="微信收款码"/>
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
    <img src="png/支付宝收款码.jpg" width="183" alt="支付宝收款码"/>
</div>

---

<br>

<h1 align="center">🌟 WebRPA 商业授权定价表</h1>
<br>

## 📊 商业授权（月费/年费）
| 商业授权   | 适用场景                           | 月费定价（元） | 年费定价（元）<br>（10个月优惠价） |
| :--------- | :--------------------------------- | :------------: | :--------------------------------: |
| 个人       | 自由职业者 / 个人工作室商业使用    |       80       |                800                 |
| 微型企业   | 10 人以下企业，单 / 多场景商业使用 |      140       |                1400                |
| 小型企业   | 10-30 人企业，多场景商业使用       |      260       |                2600                |
| 小型企业   | 30-50 人企业，多场景商业使用       |      340       |                3400                |
| 中大型企业 | 50-100 人企业，多部门商业使用      |      480       |                4800                |
| 中大型企业 | 100 人以上企业，规模化商业使用     |      720       |                7200                |

<br>

## 🏆 永久授权
| 永久授权   | 适用场景                        | 定价（元） |
| :--------- | :------------------------------ | :--------: |
| 个人       | 自由职业者 / 个人工作室永久授权 |    4000    |
| 微型企业   | 10 人以下企业，多场景永久授权   |    8400    |
| 小型企业   | 10-30 人企业，多场景永久授权    |   15600    |
| 小型企业   | 30-50 人企业，多场景永久授权    |   20400    |
| 中大型企业 | 50-100 人企业，多部门永久授权   |   28800    |
| 中大型企业 | 100 人以上企业，规模化永久授权  |   43200    |

<br>

---

> 🔔 **重要说明**
> - 非商业使用**完全免费**，可自由使用、修改、分发。
> - 二次开发需遵循 **CC BY-NC-SA 4.0** 协议：**开源并注明原作者**，且**禁止商业使用**（除非购买了商业授权）。

---
