# -*- coding: utf-8 -*-
"""命令安全护栏单元测试（unit 层）。

与 backend/tests/test_command_guard.py（回归层）互补：这里聚焦守卫的最小行为契约——
危险命令/代码被拒且带原因，安全命令/代码放行。
"""
import pytest

from app.services.ai_command_guard import check_shell_command, check_python_code


@pytest.mark.unit
@pytest.mark.parametrize("cmd", ["rm -rf /", "format C:", "Remove-Item -Recurse -Force C:\\"])
def test_dangerous_shell_rejected_with_reason(cmd):
    ok, reason = check_shell_command(cmd)
    assert ok is False
    assert isinstance(reason, str) and reason.strip()


@pytest.mark.unit
@pytest.mark.parametrize("cmd", ["ls -la", "git status", "echo hello"])
def test_safe_shell_allowed(cmd):
    ok, _ = check_shell_command(cmd)
    assert ok is True


@pytest.mark.unit
def test_dangerous_python_rejected():
    assert check_python_code("import shutil; shutil.rmtree('/')")[0] is False


@pytest.mark.unit
def test_safe_python_allowed():
    assert check_python_code("print(sum(range(10)))")[0] is True
