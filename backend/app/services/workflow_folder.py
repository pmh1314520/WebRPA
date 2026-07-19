"""工作流保存文件夹的服务端单一真源（持久化）。

背景：自定义工作流保存文件夹此前只存在于前端 localStorage，导致计划任务、
启动/热键/Webhook 触发、工作流自愈固化、子流程调用、AI 技能、打包等
「后端自治」操作只会读默认 workflows 目录，忽略用户配置的自定义目录。

本模块把「当前活动工作流文件夹」持久化到 backend/data/workflow_folder.json，
供上述后端流程统一解析：get_active_folder() 有自定义则用之，否则回退默认目录。
前端在设置变更 / 启动时通过 /api/local-workflows/active-folder 同步进来。
"""
from __future__ import annotations

import json
import threading
from pathlib import Path
from typing import Optional

# 锚定到 backend/data，与 webdav_manager 同目录，且不依赖运行时 CWD
_DATA_DIR = Path(__file__).parent.parent.parent / "data"
_CONF_FILE = _DATA_DIR / "workflow_folder.json"
_lock = threading.RLock()


def default_folder() -> str:
    """默认工作流目录（项目根目录下的 workflows），与 local_workflows.DEFAULT_WORKFLOW_FOLDER 一致。"""
    return str(Path(__file__).parent.parent.parent.parent / "workflows")


def _read_persisted() -> Optional[str]:
    if not _CONF_FILE.exists():
        return None
    try:
        data = json.loads(_CONF_FILE.read_text(encoding="utf-8"))
        folder = (data.get("folder") or "").strip()
        return folder or None
    except Exception:
        return None


def get_active_folder() -> str:
    """返回当前活动工作流文件夹：有持久化的自定义路径则用之，否则回退默认目录。"""
    with _lock:
        persisted = _read_persisted()
    if persisted:
        return persisted
    return default_folder()


def set_active_folder(folder: Optional[str]) -> str:
    """持久化活动工作流文件夹。传空/None 表示恢复默认（清空自定义）。返回生效后的活动目录。"""
    folder = (folder or "").strip()
    with _lock:
        try:
            _DATA_DIR.mkdir(parents=True, exist_ok=True)
            _CONF_FILE.write_text(
                json.dumps({"folder": folder}, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
        except Exception:
            pass
    return get_active_folder()
