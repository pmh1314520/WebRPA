"""工作流即 API —— 把一条工作流一键发布成 HTTP 端点

发布后，外部系统只需 POST `/api/run/{slug}` 即可触发该工作流并拿到执行结果，
让 WebRPA 从「自动化工具」升级成「后端能力平台」（可接入任何系统、被任何程序调用）。

- 发布信息存储：backend/data/published_workflows.json
- 触发端点：POST /api/run/{slug}（可选 token 鉴权；请求体 JSON 会作为初始变量注入工作流）
- 管理端点：列出 / 发布 / 取消发布
"""

from __future__ import annotations

import json
import re
import secrets
import threading
import time
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from app.utils.paths import BACKEND_DATA_DIR

router = APIRouter(tags=["published-workflows"])

_LOCK = threading.Lock()


def _store_file() -> Path:
    folder = BACKEND_DATA_DIR
    folder.mkdir(parents=True, exist_ok=True)
    return folder / "published_workflows.json"


def _load() -> dict[str, Any]:
    f = _store_file()
    if not f.exists():
        return {}
    try:
        return json.loads(f.read_text(encoding="utf-8")) or {}
    except Exception:
        return {}


def _save(data: dict[str, Any]) -> None:
    _store_file().write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _slugify(name: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9\u4e00-\u9fa5\-_]+", "-", (name or "").strip()).strip("-")
    return (s or "workflow").lower()[:60]


# ---------- 管理 API ----------

@router.get("/api/published")
async def api_list_published():
    """列出所有已发布的工作流端点。"""
    data = _load()
    items = []
    for slug, info in data.items():
        items.append({
            "slug": slug,
            "workflow": info.get("workflow", ""),
            "require_token": bool(info.get("token")),
            "headless": info.get("headless", True),
            "created_at": info.get("created_at", ""),
            "call_count": info.get("call_count", 0),
            "endpoint": f"/api/run/{slug}",
        })
    items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return {"published": items}


class PublishRequest(BaseModel):
    workflow: str                 # 本地工作流文件名（或绝对路径）
    slug: Optional[str] = None    # 自定义短链，留空按工作流名生成
    require_token: bool = True    # 是否要求 token 鉴权
    headless: bool = True


@router.post("/api/published")
async def api_publish(req: PublishRequest):
    """发布一条工作流为 HTTP 端点。返回 endpoint 与（如启用鉴权）token。"""
    # 校验工作流可加载
    try:
        from app.services.workflow_runner import load_workflow_dict
        wf = load_workflow_dict(req.workflow)
    except Exception as e:
        raise HTTPException(400, f"无法加载工作流：{e}")

    slug = _slugify(req.slug or wf.get("name") or req.workflow)
    with _LOCK:
        data = _load()
        # slug 冲突则追加随机后缀
        base = slug
        n = 1
        while slug in data and data[slug].get("workflow") != req.workflow:
            n += 1
            slug = f"{base}-{n}"
        token = secrets.token_urlsafe(16) if req.require_token else ""
        data[slug] = {
            "workflow": req.workflow,
            "token": token,
            "headless": bool(req.headless),
            "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "call_count": data.get(slug, {}).get("call_count", 0),
        }
        _save(data)
    return {
        "success": True,
        "slug": slug,
        "endpoint": f"/api/run/{slug}",
        "token": token,
        "usage": f"POST /api/run/{slug}" + ("（请求头 X-WebRPA-Run-Token 或查询参数 token 传 token）" if token else ""),
    }


@router.delete("/api/published/{slug}")
async def api_unpublish(slug: str):
    with _LOCK:
        data = _load()
        existed = slug in data
        data.pop(slug, None)
        _save(data)
    if not existed:
        raise HTTPException(404, f"未找到发布端点：{slug}")
    return {"success": True}


# ---------- 触发端点 ----------

@router.api_route("/api/run/{slug}", methods=["POST", "GET"])
async def api_run_published(slug: str, request: Request):
    """触发已发布的工作流并返回执行结果。

    - 鉴权：若发布时启用 token，需在请求头 X-WebRPA-Run-Token 或查询参数 ?token= 传入。
    - 入参：POST 的 JSON body 会作为初始变量注入工作流（键即变量名）。
    - 返回：{success, status, executed_nodes, failed_nodes, error, data}
    """
    data = _load()
    info = data.get(slug)
    if not info:
        raise HTTPException(404, f"未找到发布端点：{slug}")

    token = info.get("token") or ""
    if token:
        provided = request.headers.get("X-WebRPA-Run-Token") or request.query_params.get("token") or ""
        if provided != token:
            raise HTTPException(401, "token 无效或缺失")

    # 入参作为初始变量注入
    init_vars: dict[str, Any] = {}
    try:
        if request.method == "POST":
            body = await request.body()
            if body:
                parsed = json.loads(body)
                if isinstance(parsed, dict):
                    init_vars = parsed
        else:
            init_vars = dict(request.query_params)
            init_vars.pop("token", None)
    except Exception:
        init_vars = {}

    try:
        from app.services.workflow_runner import load_workflow_dict, run_workflow
        wf = load_workflow_dict(info["workflow"])
        # 注入初始变量：合并进工作流的 variables 列表（前端格式）或顶层 initialVariables
        if init_vars:
            wf = dict(wf)
            existing = list(wf.get("variables") or [])
            existing_names = {v.get("name") for v in existing if isinstance(v, dict)}
            for k, v in init_vars.items():
                if k in existing_names:
                    for ev in existing:
                        if isinstance(ev, dict) and ev.get("name") == k:
                            ev["value"] = v
                else:
                    existing.append({"name": k, "value": v, "type": "string"})
            wf["variables"] = existing
        result = await run_workflow(wf, headless=info.get("headless", True), source_tag="api")
    except Exception as e:
        raise HTTPException(500, f"执行失败：{e}")

    # 更新调用计数
    try:
        with _LOCK:
            d = _load()
            if slug in d:
                d[slug]["call_count"] = d[slug].get("call_count", 0) + 1
                _save(d)
    except Exception:
        pass

    return {
        "success": result.get("success", False),
        "status": result.get("status"),
        "executed_nodes": result.get("executed_nodes", 0),
        "failed_nodes": result.get("failed_nodes", 0),
        "error": result.get("error"),
        "attempts": result.get("attempts", 1),
        "data": result.get("collected_data", []),
    }
