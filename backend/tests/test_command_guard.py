# -*- coding: utf-8 -*-
"""AI 命令安全护栏 回归测试"""
import pytest

from app.services.ai_command_guard import check_shell_command, check_python_code


@pytest.mark.parametrize("cmd", [
    "rm -rf /",
    "del /s /q C:\\*",
    "format C:",
    "diskpart",
    "Remove-Item -Recurse -Force C:\\",
    "mkfs.ext4 /dev/sda",
])
def test_shell_dangerous_blocked(cmd):
    ok, reason = check_shell_command(cmd)
    assert ok is False and reason


@pytest.mark.parametrize("cmd", [
    "ls -la", "git status", "npm run build", "python script.py",
    "echo hello", "pip install requests", "dir", "Get-Process",
])
def test_shell_safe_allowed(cmd):
    ok, _ = check_shell_command(cmd)
    assert ok is True


def test_python_dangerous_blocked():
    assert check_python_code("import shutil; shutil.rmtree('/')")[0] is False
    assert check_python_code("os.system('rm -rf /tmp/x')")[0] is False


def test_python_safe_allowed():
    assert check_python_code("print(sum(range(10)))")[0] is True
    assert check_python_code("import json; print(json.dumps({'a':1}))")[0] is True


# 历史缺陷回归基线：整文件归入 regression 层
import pytest as _pytest_reg
pytestmark = _pytest_reg.mark.regression
