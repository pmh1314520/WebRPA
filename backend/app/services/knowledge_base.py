"""本地知识库 / RAG 服务

把文档（PDF/Word/Excel/TXT/Markdown 或纯文本）导入本地知识库，建立可检索的语义索引，
工作流或 AI 小助手即可"问知识库"，做企业问答 / 客服 / 文档助手。

- 向量化：优先用全局小助手配置里的 OpenAI 兼容 /embeddings 接口；
  无可用嵌入接口时自动降级为本地词法相似度（BM25 式），保证离线也能用（只是语义精度略低）。
- 存储：backend/data/knowledge_base/{collection}.json（chunks + 向量），零外部向量库依赖。
"""

from __future__ import annotations

import json
import math
import re
import threading
import time
from pathlib import Path
from typing import Any, Optional
from app.utils.paths import BACKEND_DATA_DIR

_LOCK = threading.Lock()


def _kb_dir() -> Path:
    folder = BACKEND_DATA_DIR / "knowledge_base"
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def _safe_name(name: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9\u4e00-\u9fa5\-_]+", "_", (name or "default").strip())
    return (s or "default")[:60]


def _collection_file(name: str) -> Path:
    return _kb_dir() / f"{_safe_name(name)}.json"


def _load_collection(name: str) -> dict[str, Any]:
    f = _collection_file(name)
    if not f.exists():
        return {"name": name, "embed_model": "", "dim": 0, "chunks": []}
    try:
        return json.loads(f.read_text(encoding="utf-8"))
    except Exception:
        return {"name": name, "embed_model": "", "dim": 0, "chunks": []}


def _save_collection(col: dict[str, Any]) -> None:
    _collection_file(col["name"]).write_text(
        json.dumps(col, ensure_ascii=False), encoding="utf-8"
    )


# ---------- 文本分块 ----------

def _chunk_text(text: str, chunk_size: int = 600, overlap: int = 80) -> list[str]:
    text = (text or "").strip()
    if not text:
        return []
    # 优先按段落聚合到 ~chunk_size，再对超长段落滑窗切分
    paras = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    chunks: list[str] = []
    buf = ""
    for p in paras:
        if len(buf) + len(p) + 1 <= chunk_size:
            buf = f"{buf}\n{p}" if buf else p
        else:
            if buf:
                chunks.append(buf)
            if len(p) <= chunk_size:
                buf = p
            else:
                # 超长段落滑窗
                i = 0
                while i < len(p):
                    chunks.append(p[i:i + chunk_size])
                    i += chunk_size - overlap
                buf = ""
    if buf:
        chunks.append(buf)
    return chunks


# ---------- 嵌入（OpenAI 兼容，best-effort） ----------

def _read_ai_config() -> dict[str, Any]:
    """读取编辑器推送到后端的共享小助手配置（含 aiAssistant / ai 段）。"""
    try:
        from app.services.ai_assistant_skills import _get_data_folder  # type: ignore
        p = _get_data_folder() / "ai_assistant" / "shared_config.json"
        if p.exists():
            data = json.loads(p.read_text(encoding="utf-8"))
            return data.get("config", data) if isinstance(data, dict) else {}
    except Exception:
        pass
    return {}


async def _embed_texts(texts: list[str], embed_model: str = "") -> tuple[Optional[list[list[float]]], str]:
    """调用 OpenAI 兼容 /embeddings。成功返回 (向量列表, 模型名)，失败返回 (None, "")。"""
    if not texts:
        return [], embed_model
    cfg = _read_ai_config()
    a = (cfg.get("aiAssistant") or {})
    b = (cfg.get("ai") or {})
    api_url = (a.get("apiUrl") or b.get("apiUrl") or "").strip()
    api_key = (a.get("apiKey") or b.get("apiKey") or "").strip()
    if not api_url:
        return None, ""
    model = embed_model or "text-embedding-3-small"
    base = api_url.rstrip("/")
    # 规范出 /embeddings 端点
    if base.endswith("/chat/completions"):
        base = base[: -len("/chat/completions")]
    if not base.endswith("/embeddings"):
        url = base.rstrip("/") + "/embeddings"
    else:
        url = base
    try:
        import httpx
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(url, headers=headers, json={"model": model, "input": texts})
            if resp.status_code != 200:
                return None, ""
            data = resp.json()
            vecs = [item["embedding"] for item in data.get("data", [])]
            if len(vecs) == len(texts):
                return vecs, model
            return None, ""
    except Exception:
        return None, ""


def _cosine(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    return dot / (na * nb) if na and nb else 0.0


# ---------- 词法相似度（无嵌入时的降级方案） ----------

def _tokenize(s: str) -> list[str]:
    s = (s or "").lower()
    # 英文按词，中文按字（粗粒度但有效）
    tokens = re.findall(r"[a-z0-9]+", s)
    tokens += re.findall(r"[\u4e00-\u9fa5]", s)
    return tokens


def _lexical_score(query: str, text: str) -> float:
    q = _tokenize(query)
    t = _tokenize(text)
    if not q or not t:
        return 0.0
    tset = {}
    for w in t:
        tset[w] = tset.get(w, 0) + 1
    score = 0.0
    for w in set(q):
        if w in tset:
            score += 1 + math.log(1 + tset[w])
    return score / (1 + math.log(1 + len(t)))


# ---------- 公开 API ----------

async def add_document(
    collection: str,
    *,
    text: str = "",
    source: str = "",
    embed_model: str = "",
    chunk_size: int = 600,
) -> dict[str, Any]:
    """把一段文本（或一个文档来源 source）加入知识库集合。
    source 是本地路径/URL 时会自动读取其正文（复用 read_document）。"""
    content = text or ""
    src_label = source or "(inline)"
    if not content and source:
        try:
            from app.services.ai_assistant_skills_v6 import skill_read_document
            res = await skill_read_document(source=source, max_chars=200000)
            if res.get("error"):
                return {"error": f"读取文档失败：{res['error']}"}
            content = res.get("content", "")
        except Exception as e:
            return {"error": f"读取文档失败：{e}"}
    if not content.strip():
        return {"error": "没有可导入的文本内容"}

    chunks = _chunk_text(content, chunk_size=chunk_size)
    if not chunks:
        return {"error": "文本分块为空"}

    vecs, used_model = await _embed_texts(chunks, embed_model)

    with _LOCK:
        col = _load_collection(collection)
        ts = int(time.time())
        added = 0
        for i, ch in enumerate(chunks):
            entry = {
                "id": f"{ts}_{i}",
                "text": ch,
                "source": src_label,
                "vector": (vecs[i] if vecs else None),
            }
            col["chunks"].append(entry)
            added += 1
        if vecs:
            col["embed_model"] = used_model
            col["dim"] = len(vecs[0]) if vecs[0] else 0
        col["name"] = collection
        _save_collection(col)

    return {
        "success": True,
        "collection": collection,
        "chunks_added": added,
        "total_chunks": len(_load_collection(collection)["chunks"]),
        "mode": "embedding" if vecs else "lexical",
        "embed_model": used_model,
        "note": ("已用向量嵌入建立语义索引。" if vecs
                 else "未检测到可用的嵌入接口，已用本地词法索引（离线可用，语义精度略低；在全局配置填好 AI API 后新增的文档会自动走向量）。"),
    }


async def query(collection: str, q: str, top_k: int = 4) -> dict[str, Any]:
    """检索知识库，返回最相关的若干片段。"""
    qq = (q or "").strip()
    if not qq:
        return {"error": "query 不能为空"}
    col = _load_collection(collection)
    chunks = col.get("chunks") or []
    if not chunks:
        return {"collection": collection, "results": [], "note": "知识库为空，请先 kb_add_document 导入文档。"}

    k = max(1, min(int(top_k or 4), 20))
    has_vectors = any(c.get("vector") for c in chunks)
    scored: list[tuple[float, dict]] = []

    if has_vectors:
        qvec, _ = await _embed_texts([qq], col.get("embed_model") or "")
        if qvec:
            qv = qvec[0]
            for c in chunks:
                if c.get("vector"):
                    scored.append((_cosine(qv, c["vector"]), c))
                else:
                    scored.append((_lexical_score(qq, c["text"]), c))
        else:
            has_vectors = False
    if not scored:
        # 词法降级
        for c in chunks:
            scored.append((_lexical_score(qq, c["text"]), c))

    scored.sort(key=lambda x: -x[0])
    top = scored[:k]
    results = [{
        "text": c["text"],
        "source": c.get("source", ""),
        "score": round(float(s), 4),
    } for s, c in top if s > 0]

    return {
        "collection": collection,
        "mode": "embedding" if has_vectors else "lexical",
        "results": results,
        "context": "\n\n---\n\n".join(r["text"] for r in results),
        "note": "把 context 作为参考资料回答用户问题，并注明来源。" if results else "未检索到相关内容。",
    }


def list_collections() -> dict[str, Any]:
    out = []
    for f in _kb_dir().glob("*.json"):
        try:
            col = json.loads(f.read_text(encoding="utf-8"))
            srcs = sorted({c.get("source", "") for c in col.get("chunks", [])})
            out.append({
                "name": col.get("name", f.stem),
                "chunks": len(col.get("chunks", [])),
                "embed_model": col.get("embed_model", ""),
                "sources": srcs[:20],
            })
        except Exception:
            continue
    return {"collections": out}


def delete_collection(name: str) -> dict[str, Any]:
    f = _collection_file(name)
    existed = f.exists()
    try:
        if existed:
            f.unlink()
    except Exception as e:
        return {"error": str(e)}
    return {"success": True, "deleted": existed}
