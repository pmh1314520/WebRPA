# -*- coding: utf-8 -*-
"""pytest 全局配置与共享 fixture。

- 确保以 backend 目录为根可 import app.*
- 提供测试各层共用的 fixture：make_context / client / mock_page / tmp_workdir
所有 fixture 均不依赖真实外部服务（网络/浏览器/账号），保证测试确定且隔离。
"""
import os
import sys

import pytest

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

os.environ.setdefault("PYTHONIOENCODING", "utf-8")


@pytest.fixture
def make_context():
    """构造 ExecutionContext 的工厂 fixture。

    用法：
        ctx = make_context({"name": "WebRPA"})
    返回一个新的 ExecutionContext，并可预设初始变量。
    """
    from app.executors.base import ExecutionContext

    def _factory(variables: dict | None = None) -> "ExecutionContext":
        ctx = ExecutionContext()
        if variables:
            ctx.variables.update(variables)
        return ctx

    return _factory


@pytest.fixture(scope="session")
def client():
    """FastAPI TestClient（不绑真实网络端口）。

    刻意不使用 `with TestClient(app)` 上下文管理器，避免触发 app 的 startup 事件
    （会拉起热键/剪贴板/调度器等后台服务，污染测试且在 CI 无 GUI 环境下无意义）。
    不进入上下文时，路由仍可正常被请求，满足接口自动化测试需求。
    """
    from fastapi.testclient import TestClient
    from app.main import app

    return TestClient(app)


@pytest.fixture
def mock_page():
    """返回一个 mock 页面对象，供选择器自愈等需要"页面"的测试使用（不启动真实浏览器）。"""
    from unittest.mock import MagicMock

    return MagicMock(name="MockPage")


@pytest.fixture
def tmp_workdir(tmp_path, monkeypatch):
    """提供隔离的临时工作目录，并把进程 cwd 切到该目录，避免测试产生的文件副作用污染仓库。"""
    monkeypatch.chdir(tmp_path)
    return tmp_path
