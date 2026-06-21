# 📊 WebRPA 测试数据索引

> 本目录包含 WebRPA 项目所有测试所需的数据文件，涵盖模拟用户输入、数据库样本、API Mock 响应、测试配置和测试用例 fixtures。

## 📁 目录结构

```
backend/test_data/
├── README.md                          ← 本文件（索引）
├── user_inputs/                       ← 模拟用户输入数据
│   ├── workflow_inputs.json           ← 工作流触发器 + 表单输入 + 文本/JSON 处理 + 边界用例
│   ├── test_users.csv                 ← 用户数据（10 条，含正常/异常/边界）
│   └── test_orders.csv               ← 订单数据（10 条，含多状态/多币种/缺失字段）
├── database/                          ← 数据库样本数据
│   ├── schema.sql                     ← 建表脚本（6 张表：users/orders/products/audit_logs/config_kv/scheduled_tasks）
│   └── seed_data.sql                  ← 种子数据（用户10条/订单12条/产品9条/日志10条/配置10条/任务5条）
├── api_mocks/                         ← API Mock 响应数据
│   └── mock_responses.json            ← 6 类 API 模拟响应（OpenAI/天气/用户/GitHub/上传/Webhook）+ 7 种错误场景
├── configs/                           ← 测试配置
│   └── test_env.json                  ← 三套环境配置（dev/testing/staging）+ 超时/重试/浏览器/报告设置
└── fixtures/                          ← 测试用例 fixtures
    ├── test_scenarios.json            ← 按模块分类的测试场景（网页/文件/Excel/变量/流程控制/AI/通知/PDF/媒体）
    ├── sample_workflow.json           ← 示例工作流定义（7 节点百度搜索流）
    ├── variables.json                 ← 全局变量定义（10 个测试变量）
    └── sample.txt                     ← 样本文本文件（编码/多行/特殊字符测试用）
```

## 📋 数据概览

| 数据类型 | 文件数 | 记录数 | 说明 |
|---------|-------|-------|------|
| 用户输入 | 3 | 50+ 条 | 触发器、表单、文本处理、JSON、边界用例 |
| 数据库样本 | 2 | 56+ 条 | 6 张表完整 schema + 丰富种子数据 |
| API Mock | 1 | 15+ 个 | 6 类 API + 7 种错误场景 |
| 测试配置 | 1 | 3 套 | 开发/测试/预发布环境 |
| Fixtures | 4 | 40+ 场景 | 8 大模块测试用例 + 示例工作流 + 变量 |

## 🔑 关键数据说明

### 用户输入 (`user_inputs/`)
- **workflow_inputs.json**: 涵盖 4 种触发器类型（热键/Webhook/定时/文件监控）、6 个表单输入（含正常+异常）、6 组文本处理、3 组 JSON 处理、8 个边界用例
- **test_users.csv**: 10 条用户记录，刻意包含空名(U009)、emoji 名(U010)、不同角色/部门/状态的组合
- **test_orders.csv**: 10 条订单，包含 6 种订单状态、2 种币种、多种支付方式、缺失字段的异常记录

### 数据库样本 (`database/`)
- **schema.sql**: 兼容 MySQL 8.0+/PostgreSQL/SQLite，含索引定义
- **seed_data.sql**: 覆盖正常数据 + 异常数据（未知客户、空支付方式、NULL 日期等）

### API Mock (`api_mocks/`)
- **mock_responses.json**: 模拟真实 API 的成功/失败响应，包含 OpenAI 聊天（含流式）、天气 API、用户 CRUD、GitHub、文件上传、Webhook 回调、各通知平台
- **error_scenarios**: 7 种网络/服务端错误场景（超时、连接拒绝、DNS 失败、SSL 错误、JSON 解析错误、空响应、500 错误）

### 测试配置 (`configs/`)
- **test_env.json**: 三套环境的完整配置（数据库/AI/浏览器/邮件等），含测试超时/重试/浏览器/报告设置

### Fixtures (`fixtures/`)
- **test_scenarios.json**: 按 8 大模块分类的测试场景，每个场景包含输入参数和预期结果
- **sample_workflow.json**: 可直接用于 WebRPA 的示例工作流（百度搜索→提取结果）
- **variables.json**: 10 个标准测试全局变量

## 🚀 使用方式

### 在工作流测试中引用
```python
# 读取测试用户数据
import json
with open("backend/test_data/user_inputs/workflow_inputs.json") as f:
    test_data = json.load(f)

# 读取数据库种子数据
with open("backend/test_data/database/seed_data.sql") as f:
    seed_sql = f.read()

# 读取 API Mock
with open("backend/test_data/api_mocks/mock_responses.json") as f:
    mocks = json.load(f)
```

### 在 WebRPA 工作流中引用
- CSV 文件可通过「数据资产」上传后在工作流中循环处理
- 示例工作流 `sample_workflow.json` 可直接在 WebRPA 编辑器中加载
- 全局变量 `variables.json` 可导入到底栏变量面板

## ⚠️ 注意事项

1. **所有 API Key / 密码均为测试占位符**，不是真实凭证
2. 数据库连接参数指向本地测试环境，不要用于生产
3. CSV 文件编码为 UTF-8（带 BOM），Excel 可正常打开中文
4. SQL 脚本默认使用 MySQL 语法（AUTO_INCREMENT），其他数据库需微调
