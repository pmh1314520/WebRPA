# -*- coding: utf-8 -*-
"""统一路径锚定工具

历史上大量服务用 cwd 相对路径（Path("backend/data")、Path("./data")）定位数据目录，
一旦进程不是从项目根启动（如 `cd backend && python run.py`、pytest rootdir=backend、
被第三方程序嵌入），数据就会被写进 backend/backend/data 之类的幽灵目录，
出现「配置保存了但运行时读不到」的诡异现象。

本模块以 __file__ 为锚点计算路径，与启动方式完全无关。所有服务应从这里取目录。
"""
from pathlib import Path

# paths.py -> utils -> app -> backend -> 项目根
BACKEND_DIR: Path = Path(__file__).resolve().parents[2]
PROJECT_ROOT: Path = BACKEND_DIR.parent

# backend/data：配置、插件、自定义模块、模型等
BACKEND_DATA_DIR: Path = BACKEND_DIR / "data"

# 项目根 data/：工作流执行采集数据落盘区（与 backend/data 不同）
ROOT_DATA_DIR: Path = PROJECT_ROOT / "data"


def backend_data_dir() -> Path:
    """backend/data 目录（不自动创建）"""
    return BACKEND_DATA_DIR


def ensure_backend_data_dir() -> Path:
    """backend/data 目录（确保存在）"""
    BACKEND_DATA_DIR.mkdir(parents=True, exist_ok=True)
    return BACKEND_DATA_DIR
