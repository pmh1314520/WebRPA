# WebRPA 测试说明

测试按分层组织，用 pytest marker 区分，可整跑也可分层跑。所有命令从项目根目录执行，
后端使用内置解释器 `Python313\python.exe`，前端使用 `..\nodejs\node.exe`。

## 分层

- unit：纯逻辑单元测试（type_utils / workflow_parser / resolve_value / command_guard / self_heal）
- contract：注册表驱动的执行器契约测试（遍历全部 module_type）
- api：基于 FastAPI TestClient 的接口自动化测试（不绑真实端口）
- integration：工作流端到端集成测试（浏览器/手机/数据库等外部依赖一律 mock 或 skip）
- regression：历史缺陷回归用例

所有测试不依赖真实网络、真实浏览器或真实账号；外部依赖通过 mock 或 skip 处理，保证确定且无 flaky。

## 后端运行命令（项目根）

整套：

    Python313\python.exe -m pytest backend\tests

分层（按 marker）：

    Python313\python.exe -m pytest backend\tests -m unit
    Python313\python.exe -m pytest backend\tests -m contract
    Python313\python.exe -m pytest backend\tests -m api
    Python313\python.exe -m pytest backend\tests -m integration
    Python313\python.exe -m pytest backend\tests -m regression

带覆盖率：

    Python313\python.exe -m pytest backend\tests --cov=app --cov-report=term-missing

## 前端运行命令（cwd = frontend）

整套：

    ..\nodejs\node.exe .\node_modules\vitest\vitest.mjs run

带覆盖率：

    ..\nodejs\node.exe .\node_modules\vitest\vitest.mjs run --coverage

## 约定

- 测试名、断言信息、输出禁止使用 Emoji。
- 新增执行器模块由 contract 层注册表驱动自动覆盖，无需修改测试代码。
- 每修复一个缺陷，先补一条能复现该缺陷的 regression 用例（先红后绿），永久纳入整跑。
