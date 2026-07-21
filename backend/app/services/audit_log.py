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
from app.utils.paths import BACKEND_DATA_DIR

_DATA_DIR = BACKEND_DATA_DIR
_LOG_FILE = _DATA_DIR / "audit_log.jsonl"
_ARCHIVE_DIR = _DATA_DIR / "audit_archive"
_CHECKPOINT_FILE = _DATA_DIR / "audit_checkpoint.json"
_lock = threading.RLock()

_GENESIS = "0" * 64
# 内存缓存最后一条记录的 (seq, hash)，避免每次写入都全文件扫描（O(n²) → O(1)）
_last_cache: Optional[tuple[int, str]] = None
_line_count: Optional[int] = None      # 当前活动日志文件的行数（内存计数，触发轮转）
MAX_LINES = 50000                       # 当前文件超过此行数自动归档轮转，保持单文件可控


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


def _load_checkpoint() -> Optional[dict[str, Any]]:
    """读取轮转检查点（记录上次归档时的 last_seq/last_hash，保证跨文件哈希链连续）。"""
    try:
        if _CHECKPOINT_FILE.exists():
            return json.loads(_CHECKPOINT_FILE.read_text(encoding="utf-8"))
    except Exception:
        pass
    return None


def _count_lines() -> int:
    if not _LOG_FILE.exists():
        return 0
    n = 0
    try:
        with _LOG_FILE.open("r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    n += 1
    except Exception:
        return 0
    return n


def _get_prev() -> tuple[int, str]:
    """返回 (上一条 seq, 上一条 hash)。优先用内存缓存；未命中回退：
    当前文件最后一条 → 轮转检查点 → 创世。同时初始化行数计数。"""
    global _last_cache, _line_count
    if _last_cache is not None:
        return _last_cache
    if _line_count is None:
        _line_count = _count_lines()
    prev = _last_record()
    if prev:
        _last_cache = (prev["seq"], prev["hash"])
    else:
        cp = _load_checkpoint()
        if cp:
            _last_cache = (int(cp.get("last_seq", 0)), str(cp.get("last_hash", _GENESIS)))
        else:
            _last_cache = (0, _GENESIS)
    return _last_cache


def _rotate() -> None:
    """把当前活动日志归档到带时间戳的文件，写检查点保持链连续，再开新文件。"""
    global _line_count
    try:
        if not _LOG_FILE.exists() or _count_lines() == 0:
            return
        seq, last_hash = _get_prev()
        _ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        archive_name = f"audit_{ts}_{seq}.jsonl"
        # 极端情况下同秒同 seq 冲突再加随机后缀，杜绝覆盖
        if (_ARCHIVE_DIR / archive_name).exists():
            import secrets as _secrets
            archive_name = f"audit_{ts}_{seq}_{_secrets.token_hex(2)}.jsonl"
        # 移动当前文件到归档
        import shutil
        shutil.move(str(_LOG_FILE), str(_ARCHIVE_DIR / archive_name))
        # 写检查点（新文件首条记录将以此 hash 作为 prev_hash，seq 接续）
        cp = _load_checkpoint() or {"archived": []}
        cp["last_seq"] = seq
        cp["last_hash"] = last_hash
        cp.setdefault("archived", []).append({"file": archive_name, "until_seq": seq, "at": ts})
        _CHECKPOINT_FILE.write_text(json.dumps(cp, ensure_ascii=False, indent=2), encoding="utf-8")
        _line_count = 0
        print(f"[audit] 审计日志已归档：{archive_name}（截至 seq={seq}）")
    except Exception as e:
        print(f"[audit] 归档失败: {e}")


def list_archives() -> list[dict[str, Any]]:
    """列出已归档的审计文件。"""
    out: list[dict[str, Any]] = []
    if _ARCHIVE_DIR.exists():
        for fp in sorted(_ARCHIVE_DIR.glob("audit_*.jsonl")):
            try:
                out.append({"file": fp.name, "size_bytes": fp.stat().st_size})
            except Exception:
                pass
    return out


def record(actor: str, action: str, target: str = "",
           result: str = "success", detail: Optional[dict[str, Any]] = None) -> dict[str, Any]:
    """追加一条审计记录，返回该记录。"""
    global _last_cache, _line_count
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
            _line_count = (_line_count or 0) + 1
            # 超过阈值自动归档轮转（链通过检查点保持连续）
            if _line_count >= MAX_LINES:
                _rotate()
        except Exception as e:
            print(f"[audit] 写入失败: {e}")
        return rec


def invalidate_cache() -> None:
    """清空内存缓存（数据目录被外部改动或测试切换路径时调用）。"""
    global _last_cache, _line_count
    with _lock:
        _last_cache = None
        _line_count = None


def query(*, actor: Optional[str] = None, action: Optional[str] = None,
          since: Optional[str] = None, until: Optional[str] = None,
          limit: int = 200, offset: int = 0) -> list[dict[str, Any]]:
    """检索审计日志（倒序返回，支持 offset 分页）。"""
    matched = _filter_records(actor=actor, action=action, since=since, until=until)
    matched.reverse()  # 最新在前
    start = max(0, int(offset or 0))
    return matched[start:start + max(1, int(limit or 200))]


def count(*, actor: Optional[str] = None, action: Optional[str] = None,
          since: Optional[str] = None, until: Optional[str] = None) -> int:
    """符合过滤条件的总条数（供前端分页计算总页数）。"""
    return len(_filter_records(actor=actor, action=action, since=since, until=until))


def _filter_records(*, actor: Optional[str] = None, action: Optional[str] = None,
                    since: Optional[str] = None, until: Optional[str] = None) -> list[dict[str, Any]]:
    """按条件过滤所有记录（正序）。"""
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
    return out


def export_text(fmt: str = "jsonl", *, actor: Optional[str] = None,
                action: Optional[str] = None, since: Optional[str] = None,
                until: Optional[str] = None) -> str:
    """导出符合条件的审计记录（正序）。fmt: jsonl / csv。"""
    records = _filter_records(actor=actor, action=action, since=since, until=until)
    if fmt == "csv":
        import csv
        import io
        buf = io.StringIO()
        # 加 BOM 让 Excel 正确识别 UTF-8 中文
        buf.write("\ufeff")
        w = csv.writer(buf)
        w.writerow(["seq", "ts", "actor", "action", "target", "result", "detail", "hash"])
        for r in records:
            w.writerow([
                r.get("seq", ""), r.get("ts", ""), r.get("actor", ""),
                r.get("action", ""), r.get("target", ""), r.get("result", ""),
                json.dumps(r.get("detail", {}), ensure_ascii=False), r.get("hash", ""),
            ])
        return buf.getvalue()
    # 默认 jsonl
    return "\n".join(json.dumps(r, ensure_ascii=False) for r in records)


def verify_chain() -> dict[str, Any]:
    """校验当前活动日志的哈希链完整性。若发生过轮转，则从检查点的 last_hash 起验，
    保证轮转后仍可校验（跨文件链连续）。返回 {valid, count, broken_at?}。"""
    cp = _load_checkpoint()
    start_hash = str(cp.get("last_hash")) if cp and cp.get("last_hash") else _GENESIS
    if not _LOG_FILE.exists():
        return {"valid": True, "count": 0}
    prev_hash = start_hash
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
