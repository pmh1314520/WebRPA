# -*- coding: utf-8 -*-
"""运行录像 / 采集数据 的留存清理

长期使用后，运行录像（backend/recordings）和采集数据落盘（./data、./data/_full_data）
会不断累积占用磁盘。这里提供可配置的滚动清理：

- 按「保留天数」删除过旧的录像目录 / 数据文件；
- 按「总大小上限(MB)」从最旧开始删除，直到低于上限；
- 配置持久化在 backend/data/retention.json，可在前端「全局设置」里调整；
- 服务启动时执行一次，并每隔 N 小时滚动清理一次。
"""
from __future__ import annotations

import json
import time
import shutil
import threading
from pathlib import Path
from typing import Dict, Any, List, Tuple
from app.utils.paths import BACKEND_DATA_DIR
from app.utils.paths import ROOT_DATA_DIR

_DATA_DIR = BACKEND_DATA_DIR
_CONF_FILE = _DATA_DIR / "retention.json"
_lock = threading.Lock()
_cache: Dict[str, Any] | None = None

# 默认配置（0 表示不限制该维度）
_DEFAULTS: Dict[str, Any] = {
    "enabled": True,
    "recordings_max_days": 14,
    "recordings_max_total_mb": 1024,
    "data_max_days": 30,
    "data_max_total_mb": 512,
    "cleanup_interval_hours": 6,
}


def _recordings_dir() -> Path:
    return Path(__file__).resolve().parent.parent.parent / "recordings"


def _data_dirs() -> List[Path]:
    return [ROOT_DATA_DIR, ROOT_DATA_DIR / "_full_data"]


def load_config() -> Dict[str, Any]:
    global _cache
    if _cache is not None:
        return _cache
    conf = dict(_DEFAULTS)
    try:
        if _CONF_FILE.exists():
            data = json.loads(_CONF_FILE.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                conf.update({k: data[k] for k in data if k in _DEFAULTS})
    except Exception as e:
        print(f"[retention] 读取配置失败: {e}")
    _cache = conf
    return conf


def save_config(updates: Dict[str, Any]) -> Dict[str, Any]:
    with _lock:
        conf = load_config()
        for k, v in (updates or {}).items():
            if k in _DEFAULTS:
                conf[k] = v
        try:
            _DATA_DIR.mkdir(parents=True, exist_ok=True)
            _CONF_FILE.write_text(json.dumps(conf, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception as e:
            print(f"[retention] 保存配置失败: {e}")
    return conf


def _dir_size(path: Path) -> int:
    total = 0
    try:
        for p in path.rglob("*"):
            if p.is_file():
                try:
                    total += p.stat().st_size
                except Exception:
                    pass
    except Exception:
        pass
    return total


def _cleanup_recordings(conf: Dict[str, Any]) -> Dict[str, Any]:
    root = _recordings_dir()
    if not root.exists():
        return {"removed": 0, "freedMB": 0}
    max_days = int(conf.get("recordings_max_days", 0) or 0)
    max_mb = int(conf.get("recordings_max_total_mb", 0) or 0)
    now = time.time()
    removed = 0
    freed = 0

    # 收集所有录像目录及其 mtime/size
    entries: List[Tuple[Path, float, int]] = []
    for d in root.iterdir():
        if not d.is_dir():
            continue
        try:
            mtime = d.stat().st_mtime
        except Exception:
            mtime = now
        entries.append((d, mtime, _dir_size(d)))

    # 1) 按天数删除
    if max_days > 0:
        cutoff = now - max_days * 86400
        for d, mtime, size in list(entries):
            if mtime < cutoff:
                try:
                    shutil.rmtree(d)
                    removed += 1
                    freed += size
                    entries.remove((d, mtime, size))
                except Exception:
                    pass

    # 2) 按总大小删除（从最旧开始）
    if max_mb > 0:
        limit = max_mb * 1024 * 1024
        total = sum(s for _, _, s in entries)
        if total > limit:
            for d, mtime, size in sorted(entries, key=lambda x: x[1]):
                if total <= limit:
                    break
                try:
                    shutil.rmtree(d)
                    removed += 1
                    freed += size
                    total -= size
                except Exception:
                    pass

    return {"removed": removed, "freedMB": round(freed / 1024 / 1024, 2)}


def _cleanup_data(conf: Dict[str, Any]) -> Dict[str, Any]:
    max_days = int(conf.get("data_max_days", 0) or 0)
    max_mb = int(conf.get("data_max_total_mb", 0) or 0)
    now = time.time()
    removed = 0
    freed = 0

    files: List[Tuple[Path, float, int]] = []
    # 配置类文件名白名单：绝不清理（即使 CWD 恰好落在 backend/data 也安全）
    _PROTECTED = {
        "security.json", "credentials.enc", "retention.json",
        "scheduled_tasks.json", "scheduled_task_logs.json", "_latest.json",
        "global_config.json", "mcp.json",
    }
    top = ROOT_DATA_DIR
    full = ROOT_DATA_DIR / "_full_data"
    # 顶层 ./data：只清理导出文件（xlsx/csv），不动任何 json，避免误删配置
    if top.exists():
        for f in top.iterdir():
            if f.is_dir() or f.name in _PROTECTED:
                continue
            if f.suffix.lower() not in (".xlsx", ".csv"):
                continue
            try:
                files.append((f, f.stat().st_mtime, f.stat().st_size))
            except Exception:
                pass
    # 执行数据快照目录 ./data/_full_data：清理 json 快照（保留 _latest 指针）
    if full.exists():
        for f in full.iterdir():
            if f.is_dir() or f.name in _PROTECTED:
                continue
            if f.suffix.lower() != ".json":
                continue
            try:
                files.append((f, f.stat().st_mtime, f.stat().st_size))
            except Exception:
                pass

    if max_days > 0:
        cutoff = now - max_days * 86400
        for f, mtime, size in list(files):
            if mtime < cutoff:
                try:
                    f.unlink()
                    removed += 1
                    freed += size
                    files.remove((f, mtime, size))
                except Exception:
                    pass

    if max_mb > 0:
        limit = max_mb * 1024 * 1024
        total = sum(s for _, _, s in files)
        if total > limit:
            for f, mtime, size in sorted(files, key=lambda x: x[1]):
                if total <= limit:
                    break
                try:
                    f.unlink()
                    removed += 1
                    freed += size
                    total -= size
                except Exception:
                    pass

    return {"removed": removed, "freedMB": round(freed / 1024 / 1024, 2)}


def run_cleanup(force: bool = False) -> Dict[str, Any]:
    """执行一次清理。force=True 时忽略 enabled 开关。"""
    conf = load_config()
    if not force and not conf.get("enabled", True):
        return {"skipped": True, "reason": "未启用"}
    try:
        rec = _cleanup_recordings(conf)
        dat = _cleanup_data(conf)
        print(f"[retention] 清理完成 录像:{rec} 数据:{dat}")
        return {"success": True, "recordings": rec, "data": dat}
    except Exception as e:
        print(f"[retention] 清理异常: {e}")
        return {"success": False, "error": str(e)}


def get_usage() -> Dict[str, Any]:
    """统计当前占用，供前端展示"""
    rec = _recordings_dir()
    rec_count = 0
    rec_size = 0
    if rec.exists():
        for d in rec.iterdir():
            if d.is_dir():
                rec_count += 1
                rec_size += _dir_size(d)
    data_size = 0
    data_count = 0
    for ddir in _data_dirs():
        if ddir.exists():
            for f in ddir.iterdir():
                if f.is_file():
                    data_count += 1
                    try:
                        data_size += f.stat().st_size
                    except Exception:
                        pass
    return {
        "recordings": {"count": rec_count, "sizeMB": round(rec_size / 1024 / 1024, 2)},
        "data": {"count": data_count, "sizeMB": round(data_size / 1024 / 1024, 2)},
    }


_cleanup_thread_started = False


def start_periodic_cleanup() -> None:
    """启动后台定时清理线程（幂等）。"""
    global _cleanup_thread_started
    if _cleanup_thread_started:
        return
    _cleanup_thread_started = True

    def _loop():
        # 启动后稍等再首次清理，避免和启动其它任务争抢
        time.sleep(20)
        while True:
            try:
                conf = load_config()
                if conf.get("enabled", True):
                    run_cleanup()
                interval = max(1, int(conf.get("cleanup_interval_hours", 6) or 6))
            except Exception as e:
                print(f"[retention] 定时清理异常: {e}")
                interval = 6
            time.sleep(interval * 3600)

    threading.Thread(target=_loop, daemon=True, name="retention-cleanup").start()
    print("[retention] 定时清理线程已启动")


def invalidate_cache() -> None:
    global _cache
    _cache = None
