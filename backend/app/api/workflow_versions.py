"""工作流版本管理 API（Git 式本地版本历史）

为每个工作流维护版本快照，支持：提交版本、查看历史、读取某版本、恢复、对比差异、删除。
版本快照保存在工作流文件夹下的隐藏目录 .webrpa_versions/<工作流名>/ 中，
每个版本是一个 JSON 文件：{version, message, createdAt, content}。
"""
import os
import json
import uuid
from pathlib import Path
from datetime import datetime
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from app.api.local_workflows import (
    DEFAULT_WORKFLOW_FOLDER,
    _sanitize_filename,
    ensure_folder_exists,
)

router = APIRouter(prefix="/api/workflow-versions", tags=["workflow-versions"])

VERSIONS_DIRNAME = ".webrpa_versions"


class CommitRequest(BaseModel):
    workflow: str                 # 工作流文件名（可带或不带 .json）
    content: dict                 # 当前工作流完整内容
    message: Optional[str] = ""   # 版本说明
    folder: Optional[str] = None


class WorkflowRef(BaseModel):
    workflow: str
    folder: Optional[str] = None


class VersionRef(BaseModel):
    workflow: str
    versionId: str
    folder: Optional[str] = None


class DiffRequest(BaseModel):
    workflow: str
    fromVersionId: Optional[str] = None  # 为空表示与当前内容对比
    toVersionId: Optional[str] = None
    content: Optional[dict] = None        # 当与当前内容对比时传入
    folder: Optional[str] = None


class ImportBundleRequest(BaseModel):
    workflow: str
    bundle: dict                          # {workflow, versions:[{message,createdAt,content},...]}
    folder: Optional[str] = None


def _workflow_key(workflow: str) -> str:
    """工作流文件名 → 版本目录名（去掉 .json、清理非法字符）"""
    name = _sanitize_filename(workflow or "")
    if name.endswith(".json"):
        name = name[:-5]
    return name


def _versions_dir(folder: Optional[str], workflow: str) -> Optional[str]:
    """返回某工作流的版本目录，确保目录存在"""
    if folder:
        base = folder
    else:
        try:
            from app.services import workflow_folder as _wf_folder
            base = _wf_folder.get_active_folder()
        except Exception:
            base = DEFAULT_WORKFLOW_FOLDER
    key = _workflow_key(workflow)
    if not key:
        return None
    vdir = os.path.join(base, VERSIONS_DIRNAME, key)
    ensure_folder_exists(vdir)
    return vdir


def _read_version_file(filepath: str) -> Optional[dict]:
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def _summarize_content(content: dict) -> dict:
    """统计工作流的节点/边/变量数量，用于版本列表展示"""
    nodes = content.get("nodes", []) if isinstance(content, dict) else []
    edges = content.get("edges", []) if isinstance(content, dict) else []
    variables = content.get("variables", []) if isinstance(content, dict) else []
    return {"nodeCount": len(nodes), "edgeCount": len(edges), "variableCount": len(variables)}


@router.post("/commit")
async def commit_version(req: CommitRequest):
    """提交一个新版本快照"""
    vdir = _versions_dir(req.folder, req.workflow)
    if not vdir:
        return {"success": False, "error": "工作流名无效"}

    version_id = datetime.now().strftime("%Y%m%d%H%M%S%f") + "_" + uuid.uuid4().hex[:6]
    record = {
        "version": version_id,
        "message": (req.message or "").strip(),
        "createdAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "summary": _summarize_content(req.content),
        "content": req.content,
    }
    filepath = os.path.join(vdir, f"{version_id}.json")
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(record, f, ensure_ascii=False, indent=2)
        return {"success": True, "version": version_id, "createdAt": record["createdAt"]}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/list")
async def list_versions(req: WorkflowRef):
    """列出某工作流的所有版本（按时间倒序）"""
    vdir = _versions_dir(req.folder, req.workflow)
    if not vdir or not os.path.isdir(vdir):
        return {"success": True, "versions": []}
    versions = []
    try:
        for fn in os.listdir(vdir):
            if not fn.endswith(".json"):
                continue
            rec = _read_version_file(os.path.join(vdir, fn))
            if not rec:
                continue
            versions.append({
                "version": rec.get("version", fn[:-5]),
                "message": rec.get("message", ""),
                "createdAt": rec.get("createdAt", ""),
                "summary": rec.get("summary", {}),
            })
        versions.sort(key=lambda v: v.get("version", ""), reverse=True)
        return {"success": True, "versions": versions}
    except Exception as e:
        return {"success": False, "error": str(e), "versions": []}


@router.post("/get")
async def get_version(req: VersionRef):
    """读取某个版本的完整内容"""
    vdir = _versions_dir(req.folder, req.workflow)
    if not vdir:
        return {"success": False, "error": "工作流名无效"}
    safe = _sanitize_filename(req.versionId)
    filepath = os.path.join(vdir, f"{safe}.json")
    if not os.path.exists(filepath):
        return {"success": False, "error": "版本不存在"}
    rec = _read_version_file(filepath)
    if rec is None:
        return {"success": False, "error": "版本文件损坏"}
    return {"success": True, "version": rec.get("version"), "content": rec.get("content", {}),
            "message": rec.get("message", ""), "createdAt": rec.get("createdAt", "")}


@router.post("/delete")
async def delete_version(req: VersionRef):
    """删除某个版本"""
    vdir = _versions_dir(req.folder, req.workflow)
    if not vdir:
        return {"success": False, "error": "工作流名无效"}
    safe = _sanitize_filename(req.versionId)
    filepath = os.path.join(vdir, f"{safe}.json")
    if not os.path.exists(filepath):
        return {"success": False, "error": "版本不存在"}
    try:
        os.remove(filepath)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}


def _node_label(node: dict) -> str:
    data = node.get("data", {}) if isinstance(node, dict) else {}
    return str(data.get("label") or data.get("moduleType") or node.get("type") or node.get("id", ""))


def _diff_content(a: dict, b: dict) -> dict:
    """对比两个工作流内容，返回节点/边的增删改摘要（a=旧，b=新）"""
    a_nodes = {n.get("id"): n for n in (a.get("nodes", []) or []) if isinstance(n, dict)}
    b_nodes = {n.get("id"): n for n in (b.get("nodes", []) or []) if isinstance(n, dict)}

    added, removed, modified = [], [], []
    for nid, n in b_nodes.items():
        if nid not in a_nodes:
            added.append({"id": nid, "label": _node_label(n)})
    for nid, n in a_nodes.items():
        if nid not in b_nodes:
            removed.append({"id": nid, "label": _node_label(n)})
    for nid, bn in b_nodes.items():
        an = a_nodes.get(nid)
        if an is None:
            continue
        # 比较类型、配置数据、位置（位置变化只算移动，不算配置修改）
        type_changed = an.get("type") != bn.get("type")
        data_changed = json.dumps(an.get("data", {}), ensure_ascii=False, sort_keys=True) != \
            json.dumps(bn.get("data", {}), ensure_ascii=False, sort_keys=True)
        pos_changed = (an.get("position") or {}) != (bn.get("position") or {})
        if type_changed or data_changed:
            modified.append({"id": nid, "label": _node_label(bn),
                             "typeChanged": type_changed, "configChanged": data_changed,
                             "moved": pos_changed})

    def _edge_key(e):
        return e.get("id") or f"{e.get('source')}->{e.get('target')}"
    a_edges = {_edge_key(e) for e in (a.get("edges", []) or []) if isinstance(e, dict)}
    b_edges = {_edge_key(e) for e in (b.get("edges", []) or []) if isinstance(e, dict)}
    edges_added = list(b_edges - a_edges)
    edges_removed = list(a_edges - b_edges)

    return {
        "nodesAdded": added,
        "nodesRemoved": removed,
        "nodesModified": modified,
        "edgesAdded": len(edges_added),
        "edgesRemoved": len(edges_removed),
        "hasChanges": bool(added or removed or modified or edges_added or edges_removed),
    }


@router.post("/diff")
async def diff_versions(req: DiffRequest):
    """对比两个版本，或某版本与当前内容。
    - fromVersionId 为空时，from 用当前 content；to 同理。
    返回 a(旧)→b(新) 的差异摘要。
    """
    vdir = _versions_dir(req.folder, req.workflow)
    if not vdir:
        return {"success": False, "error": "工作流名无效"}

    def _load(vid: Optional[str]) -> Optional[dict]:
        if not vid:
            return req.content if isinstance(req.content, dict) else {}
        safe = _sanitize_filename(vid)
        rec = _read_version_file(os.path.join(vdir, f"{safe}.json"))
        return rec.get("content", {}) if rec else None

    a = _load(req.fromVersionId)
    b = _load(req.toVersionId)
    if a is None or b is None:
        return {"success": False, "error": "版本不存在"}

    return {"success": True, "diff": _diff_content(a, b)}


@router.post("/export")
async def export_bundle(req: WorkflowRef):
    """把某工作流的全部版本打包导出为分享包（JSON），供团队共享/迁移。"""
    vdir = _versions_dir(req.folder, req.workflow)
    if not vdir or not os.path.isdir(vdir):
        return {"success": False, "error": "该工作流没有版本历史"}
    versions = []
    try:
        for fn in sorted(os.listdir(vdir)):
            if not fn.endswith(".json"):
                continue
            rec = _read_version_file(os.path.join(vdir, fn))
            if not rec:
                continue
            versions.append({
                "version": rec.get("version"),
                "message": rec.get("message", ""),
                "createdAt": rec.get("createdAt", ""),
                "summary": rec.get("summary", {}),
                "content": rec.get("content", {}),
            })
        versions.sort(key=lambda v: v.get("version", ""))
        bundle = {
            "type": "webrpa-version-bundle",
            "workflow": _workflow_key(req.workflow),
            "exportedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "versionCount": len(versions),
            "versions": versions,
        }
        return {"success": True, "bundle": bundle}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/import")
async def import_bundle(req: ImportBundleRequest):
    """导入分享包：把包内版本写入目标工作流的版本历史（重新分配版本号避免冲突）。"""
    vdir = _versions_dir(req.folder, req.workflow)
    if not vdir:
        return {"success": False, "error": "工作流名无效"}
    bundle = req.bundle or {}
    versions = bundle.get("versions") or []
    if not isinstance(versions, list) or not versions:
        return {"success": False, "error": "分享包为空或格式不正确"}
    imported = 0
    try:
        for i, v in enumerate(versions):
            content = v.get("content")
            if not isinstance(content, dict):
                continue
            version_id = datetime.now().strftime("%Y%m%d%H%M%S%f") + f"_{i:03d}_" + uuid.uuid4().hex[:4]
            record = {
                "version": version_id,
                "message": (v.get("message") or "") + "（导入）",
                "createdAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "summary": v.get("summary") or _summarize_content(content),
                "content": content,
            }
            with open(os.path.join(vdir, f"{version_id}.json"), "w", encoding="utf-8") as f:
                json.dump(record, f, ensure_ascii=False, indent=2)
            imported += 1
        return {"success": True, "imported": imported}
    except Exception as e:
        return {"success": False, "error": str(e)}
