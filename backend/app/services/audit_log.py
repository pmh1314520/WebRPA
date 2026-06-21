# -*- coding: utf-8 -*-
"""审计日志（哈希链防篡改）

所有关键操作（登录、派发、删除、改权限、取凭据、审批等）追加一条审计记录。
每条记录包含前一条记录的哈希，形成哈希链：任何对历史记录的篡改都会使链断裂，
通过 verify_chain() 可检测。日志以 JSONL 追加写入 backend/data/audit_log.jsonl。

记录字段：seq, ts, actor, action, target, result, detail, prev_hash, hash。
"""
from __future__ import annotations

import hashlib
import json
import threading
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

_DATA_DIR = Path("backend/data")
_LOG_FILE = _DATA_DIR / "audit_log.jsonl"
_lock = threading.RLock()

_GENESIS = "0" * 64
# 内存缓存最后一条记录的 (seq, hash)，避免每次写入都全文件扫描（O(n²) → O(1)）
_last_cache: Optional[tuple[int, str]] = None


def _compute_hash(record: dict[str, Any]) -> str:
    """对记录除 hash 外的字段做规范化哈希。"""
    payload = {
        "seq": record["seq"],
        "ts": record["ts"],
        "actor": record["actor"],
        "action": record["action"],
        "target": record["target"],
        "result": record["result"],
        "detail": record["detail"],
        "prev_hash": record["prev_hash"],
    }
    raw = json.dumps(payload, ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _last_record() -> Optional[dict[str, Any]]:
    if not _LOG_FILE.exists():
        return None
    last = None
    try:
        with _LOG_FILE.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    last = json.loads(line)
    except Exception:
        return None
    return last


def _get_prev() -> tuple[int, str]:
    """返回 (上一条 seq, 上一条 hash)。优先用内存缓存，缓存未命中才回退全文件扫描一次。"""
    global _last_cache
    if _last_cache is not None:
        return _last_cache
    prev = _last_record()
    if prev:
        _last_cache = (prev["seq"], prev["hash"])
    else:
        _last_cache = (0, _GENESIS)
    return _last_cache


def record(actor: str, action: str, target: str = "",
           result: str = "success", detail: Optional[dict[str, Any]] = None) -> dict[str, Any]:
    """追加一条审计记录，返回该记录。"""
    global _last_cache
    with _lock:
        _DATA_DIR.mkdir(parents=True, exist_ok=True)
        prev_seq, prev_hash = _get_prev()
        seq = prev_seq + 1
        rec = {
            "seq": seq,
            "ts": datetime.now().isoformat(),
            "actor": actor or "anonymous",
            "action": action,
            "target": target or "",
            "result": result,
            "detail": detail or {},
            "prev_hash": prev_hash,
        }
        rec["hash"] = _compute_hash(rec)
        try:
            with _LOG_FILE.open("a", encoding="utf-8") as f:
                f.write(json.dumps(rec, ensure_ascii=False) + "\n")
            # 写入成功才推进缓存，失败则保持原值下次重试时重新计算
            _last_cache = (seq, rec["hash"])
        except Exception as e:
            print(f"[audit] 写入失败: {e}")
        return rec


def invalidate_cache() -> None:
    """清空内存缓存（数据目录被外部改动或测试切换路径时调用）。"""
    global _last_cache
    with _lock:
        _last_cache = None


def query(*, actor: Optional[str] = None, action: Optional[str] = None,
          since: Optional[str] = None, until: Optional[str] = None,
          limit: int = 200) -> list[dict[str, Any]]:
    """检索审计日志（倒序返回最近的 limit 条）。"""
    if not _LOG_FILE.exists():
        return []
    out: list[dict[str, Any]] = []
    try:
        with _LOG_FILE.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                rec = json.loads(line)
                if actor and rec.get("actor") != actor:
                    continue
                if action and rec.get("action") != action:
                    continue
                ts = rec.get("ts", "")
                if since and ts < since:
                    continue
                if until and ts > until:
                    continue
                out.append(rec)
    except Exception as e:
        print(f"[audit] 读取失败: {e}")
    out.reverse()
    return out[:limit]


def verify_chain() -> dict[str, Any]:
    """校验哈希链完整性，返回 {valid, count, broken_at?}。"""
    if not _LOG_FILE.exists():
        return {"valid": True, "count": 0}
    prev_hash = _GENESIS
    count = 0
    try:
        with _LOG_FILE.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                rec = json.loads(line)
                count += 1
                if rec.get("prev_hash") != prev_hash:
                    return {"valid": False, "count": count, "broken_at": rec.get("seq"),
                            "reason": "prev_hash 不连续"}
                expect = _compute_hash(rec)
                if rec.get("hash") != expect:
                    return {"valid": False, "count": count, "broken_at": rec.get("seq"),
                            "reason": "记录哈希不匹配（内容被篡改）"}
                prev_hash = rec["hash"]
    except Exception as e:
        return {"valid": False, "count": count, "error": str(e)}
    return {"valid": True, "count": count}


def stats() -> dict[str, Any]:
    """审计统计：总数、按动作分布、按操作者 TOP。"""
    by_action: dict[str, int] = {}
    by_actor: dict[str, int] = {}
    total = 0
    if _LOG_FILE.exists():
        try:
            with _LOG_FILE.open("r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    rec = json.loads(line)
                    total += 1
                    by_action[rec.get("action", "")] = by_action.get(rec.get("action", ""), 0) + 1
                    by_actor[rec.get("actor", "")] = by_actor.get(rec.get("actor", ""), 0) + 1
        except Exception:
            pass
    top_actors = sorted(by_actor.items(), key=lambda x: -x[1])[:10]
    return {"total": total, "by_action": by_action,
            "top_actors": [{"actor": a, "count": c} for a, c in top_actors]}
