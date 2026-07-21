# -*- coding: utf-8 -*-
"""AI 命令执行安全护栏

为 AI 小助手的 run_shell_command / run_python_script / run_python_inline 提供：
1. 危险命令拦截（不可逆的磁盘/文件系统/系统级破坏操作）
2. 审计日志（所有执行尝试落盘 backend/data/command_audit.log，JSONL）

设计原则：宁可少拦也别误伤正常运维命令，只拦"明显灾难级"操作；其余记录审计即可。
"""
from __future__ import annotations

import re
import json
import threading
from pathlib import Path
from datetime import datetime
from app.utils.paths import BACKEND_DATA_DIR

_AUDIT_FILE = BACKEND_DATA_DIR / "command_audit.log"
_audit_lock = threading.Lock()

# 危险模式（大小写不敏感）。命中即拦截。
_DANGEROUS_PATTERNS = [
    r"rm\s+-[a-z]*r[a-z]*f[a-z]*\s+(/|~|\$HOME|\*)",   # rm -rf / 或 ~ 或 *
    r"\bdel\s+/[sqf]\b.*\\\*",                            # del /s /q C:\*
    r"\brd\s+/s\b|\brmdir\s+/s\b",                        # rmdir /s 递归删目录
    r"remove-item\b.*-recurse.*-force",                  # PowerShell 递归强删
    r"\bformat\s+[a-z]:",                                  # format C:
    r"format-volume|clear-disk|clear-content\s+.*\*",     # PowerShell 磁盘清空
    r"\bdiskpart\b",                                       # 磁盘分区工具
    r"\bmkfs(\.\w+)?\b",                                   # 格式化文件系统
    r"\bdd\s+if=.*of=/dev/",                               # dd 写裸设备
    r">\s*/dev/sd[a-z]",                                   # 写裸磁盘
    r"\bcipher\s+/w",                                       # 擦除磁盘空闲空间
    r"\bbcdedit\b",                                         # 引导配置
    r"reg\s+delete\s+hk(lm|ey_local_machine)\b",          # 删 HKLM 注册表
    r":\s*\(\s*\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;",       # bash fork bomb
    r"\bshutdown\b.*-r.*-f|\bshutdown\b.*/r.*/f",         # 强制立即重启（无延时）
]

# Python 代码里的危险调用
_DANGEROUS_PY = [
    r"shutil\.rmtree\s*\(\s*['\"]?(/|[A-Za-z]:[\\/]?|~)['\"]?",  # rmtree 根/盘符
    r"os\.system\s*\(.*(rm\s+-rf|format\s+[a-z]:|del\s+/[sq])",
    r"subprocess\.(run|call|Popen)\s*\(.*(rm\s+-rf|format\s+[a-z]:|mkfs|diskpart)",
    r"ctypes.*ExitWindowsEx",                              # 强制注销/关机 API
]

_compiled = [re.compile(p, re.IGNORECASE) for p in _DANGEROUS_PATTERNS]
_compiled_py = [re.compile(p, re.IGNORECASE) for p in _DANGEROUS_PY]


def check_shell_command(command: str) -> tuple[bool, str]:
    """检查 shell 命令是否危险。返回 (allowed, reason)。"""
    if not command:
        return True, ""
    for pat in _compiled:
        if pat.search(command):
            return False, f"命中危险命令模式，已拦截：{pat.pattern}"
    return True, ""


def check_python_code(code: str) -> tuple[bool, str]:
    """检查 Python 代码是否含危险调用。返回 (allowed, reason)。"""
    if not code:
        return True, ""
    for pat in _compiled_py:
        if pat.search(code):
            return False, f"命中危险代码模式，已拦截：{pat.pattern}"
    return True, ""


def audit(kind: str, payload: str, allowed: bool, reason: str = "",
          cwd: str = "", return_code=None) -> None:
    """把一次执行尝试写入审计日志（JSONL，单行一条）。失败静默。"""
    try:
        _AUDIT_FILE.parent.mkdir(parents=True, exist_ok=True)
        rec = {
            "ts": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "kind": kind,                       # shell / python / python_inline
            "allowed": bool(allowed),
            "reason": reason,
            "cwd": cwd,
            "returnCode": return_code,
            "payload": (payload or "")[:2000],  # 截断，避免日志爆炸
        }
        with _audit_lock:
            with open(_AUDIT_FILE, "a", encoding="utf-8") as f:
                f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    except Exception as e:
        print(f"[command_guard] 写审计日志失败: {e}")
