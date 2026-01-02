<div align="center">
    <img src="png/logo.png" width="100" alt="微信收款码"/>
</div>
<h1 align="center">
Web RPA - 网页机器人流程自动化工具
</h1>
<p align="center">
  <img src="https://img.shields.io/badge/版本-1.11.0-blue.svg" alt="版本">
  <img src="https://img.shields.io/badge/协议-CC%20BY--NC--SA%204.0-green.svg" alt="协议">
  <img src="https://img.shields.io/badge/作者-青云制作__彭明航-orange.svg" alt="作者">
</p>


**一款功能强大的可视化网页自动化工具（支持少量系统桌面自动化），通过拖拽模块的方式快速构建自动化工作流，无需编写代码即可实现网页数据采集、表单填写、自动化测试等任务。**

**【仓库中的源码不会再进行更新了，请直接在Releases中下载最新7z压缩包以获取最新源码】**



## ✨ 功能特性

### 🌐 浏览器自动化

- 打开/关闭/刷新网页
- 点击、悬停、输入文本
- 下拉选择、复选框操作
- 拖拽元素、滚动页面
- 处理弹窗对话框
- 可视化元素选择器

### 📥 数据采集

- 提取页面元素数据
- 截图保存
- 下载文件/图片
- 支持相似元素批量采集

### 📊 数据处理

- 变量管理
- JSON 解析
- 正则表达式提取
- 字符串处理（拼接、替换、分割等）
- 列表/字典操作
- 数据表格操作
- Excel 读取与导出

### 🗄️ 数据库操作

- MySQL 数据库连接
- 增删改查操作
- 自定义 SQL 执行

### 🔀 流程控制

- 条件判断
- 循环（次数循环、列表遍历）
- 子流程复用
- 定时任务

### 🤖 AI 能力

- AI 对话（支持 OpenAI、智谱、Deepseek 等）
- 图像识别

### 🔐 验证码处理

- OCR 文字识别
- 滑块验证码

### 🔔 辅助功能

- 打印日志
- 播放提示音/音乐
- 语音播报
- 用户输入弹窗
- 发送邮件
- 剪贴板操作
- 模拟键盘按键
- 自定义 JavaScript 脚本



## 🖼️ 界面预览

工作流编辑器采用可视化拖拽设计，左侧模块列表，中间画布区域，右侧配置面板，底部日志/数据/变量面板等

![](png/展示图1.png)

------

![](png/展示图2.png)

------

![](png/展示图3.png)

------

![](png/展示图4.png)

------

![](png/展示图5.png)

------

![](png/展示图6.png)



## 🚀 快速开始

### 环境要求

- Windows 10/11（本项目仅支持Windows系统使用）
- 项目自带 Python 3.13 和 Node.js（无需额外安装）

### 启动方式

在Releases中下载最新版7z压缩包，之后解压出来，直接双击其中的 `双击启动WebRPA本地服务.bat` 即可快速启动本项目，脚本会自动启动前后端服务并自动运行客户端EXE：

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
├── workflows/              # 本地工作流存储
└── 双击启动WebRPA本地服务.bat
```



## 📖 使用说明（项目内置教学文档，可自行查看）

1. **创建工作流**：从左侧模块列表拖拽模块到画布

2. **连接模块**：从模块底部拖出连线到下一个模块顶部

3. **配置模块**：点击模块，在右侧面板配置参数

4. **使用变量**：在输入框中使用 `{变量名}` 引用变量

5. **运行工作流**：点击工具栏的运行按钮

6. **查看结果**：在底部面板查看日志、数据、变量

   

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
- **浏览器自动化**：Playwright (Microsoft Edge)
- **数据库连接**：PyMySQL
- **Excel 处理**：openpyxl
- **邮件发送**：smtplib + email
- **AI 集成**：OpenAI API 兼容接口
- **OCR 识别**：ddddocr
- **图像处理**：Pillow
- **音频播放**：pygame

### 工作流仓库服务

- **运行时**：Node.js

- **Web 框架**：Express

- **数据存储**：JSON 文件

- **进程管理**：PM2



## 👤 作者

**青云制作_彭明航（一名痴迷于计算机技术无法自拔的大一新生）**

**个人导航站：[https://www.pmhs.top](https://www.pmhs.top)**



## 📄 开源协议

本项目采用 [CC BY-NC-SA 4.0](LICENSE) 协议开源。

### 协议要点：

- ✅ **署名**：使用或修改本项目时，必须注明原作者「青云制作_彭明航」
- ❌ **非商业性使用**：不得将本项目用于商业目的
- 🔄 **相同方式共享**：如果您修改或基于本项目二次创作，必须以相同协议开源

**如需商业授权，请联系作者（QQ：2124691573）。**



## 🙏 致谢

**感谢以下开源项目：**

- [Playwright](https://playwright.dev/) - 浏览器自动化

- [React Flow](https://reactflow.dev/) - 流程图编辑器

- [FastAPI](https://fastapi.tiangolo.com/) - Web 框架

- [TailwindCSS](https://tailwindcss.com/) - CSS 框架

  

## ⭐ Star History

这是我开源的第一款产品，如果这个项目对你有帮助，请点一个 Star ⭐ 支持一下！

<h4 align="center">☕请作者喝杯奶茶☕</h4>

<div align="center">
    <img src="png/微信收款码.png" width="200" alt="微信收款码"/>
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
    <img src="png/支付宝收款码.jpg" width="183" alt="支付宝收款码"/>
</div>




