# -*- coding: utf-8 -*-
"""工作流整包导出/导入（团队迁移与共享）

把一个工作流连同它依赖的「自定义模块」「图片资产」打包成一个 .json 整包，
方便跨机器迁移或团队共享。导入时自动还原自定义模块与图片，保持节点引用不变。

整包结构：
{
  "type": "webrpa-workflow-bundle",
  "version": 1,
  "name": "工作流名",
  "exportedAt": "...",
  "workflow": { nodes, edges, variables },
  "customModules": [ <完整模块JSON>, ... ],
  "images": [ { "id", "name", "originalName", "folder", "ext", "dataB64" }, ... ]
}
"""
import os
import json
import base64
from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/workflow-bundle", tags=["workflow-bundle"])


class ExportBundleRequest(BaseModel):
    name: Optional[str] = "workflow"
    content: Dict[str, Any]  # {nodes, edges, variables}


class ImportBundleRequest(BaseModel):
    bundle: Dict[str, Any]


def _collect_custom_modules(content: Dict[str, Any]) -> List[dict]:
    """扫描节点收集引用到的自定义模块完整 JSON"""
    from app.api.custom_modules import _load_module, _load_all_modules

    ids = set()
    for node in (content.get("nodes") or []):
        if not isinstance(node, dict):
            continue
        data = node.get("data") or {}
        # 兼容多种存放位置
        cid = data.get("customModuleId") or data.get("custom_module_id") or \
            (data.get("config") or {}).get("customModuleId")
        if cid:
            ids.add(cid)

    modules = []
    if ids:
        for mid in ids:
            try:
                m = _load_module(mid)
                if m:
                    modules.append(json.loads(m.model_dump_json()))
            except Exception:
                pass
    return modules


def _collect_images(content: Dict[str, Any]) -> List[dict]:
    """扫描工作流引用到的图片资产，并以 base64 内联打包"""
    from app.api.image_assets import image_assets

    serialized = json.dumps(content, ensure_ascii=False)
    images = []
    for img_id, asset in list(image_assets.items()):
        if img_id and img_id in serialized:
            path = asset.get("path")
            if path and os.path.exists(path):
                try:
                    with open(path, "rb") as f:
                        b64 = base64.b64encode(f.read()).decode("ascii")
                    images.append({
                        "id": img_id,
                        "name": asset.get("name", ""),
                        "originalName": asset.get("originalName", ""),
                        "folder": asset.get("folder", ""),
                        "ext": asset.get("extension", ""),
                        "dataB64": b64,
                    })
                except Exception:
                    pass
    return images


@router.post("/export")
async def export_bundle(req: ExportBundleRequest):
    """导出整包（含依赖的自定义模块与图片）"""
    content = req.content or {}
    if not isinstance(content.get("nodes"), list):
        return {"success": False, "error": "工作流内容无效（缺少 nodes）"}
    try:
        bundle = {
            "type": "webrpa-workflow-bundle",
            "version": 1,
            "name": req.name or "workflow",
            "exportedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "workflow": {
                "nodes": content.get("nodes", []),
                "edges": content.get("edges", []),
                "variables": content.get("variables", []),
            },
            "customModules": _collect_custom_modules(content),
            "images": _collect_images(content),
        }
        return {"success": True, "bundle": bundle}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/import")
async def import_bundle(req: ImportBundleRequest):
    """导入整包：还原自定义模块与图片（保持原 id，已存在则跳过），返回工作流内容供加载。"""
    bundle = req.bundle or {}
    if bundle.get("type") != "webrpa-workflow-bundle":
        return {"success": False, "error": "不是有效的工作流整包文件"}

    result = {"customModules": 0, "images": 0}

    # 1) 还原自定义模块（保持原 id，保证节点引用不断裂）
    try:
        from app.api.custom_modules import _load_module, _save_module
        from app.models.custom_module import CustomModule
        for m in (bundle.get("customModules") or []):
            try:
                mid = m.get("id")
                if not mid:
                    continue
                if _load_module(mid) is not None:
                    continue  # 已存在，跳过
                module = CustomModule(**m)
                _save_module(module)
                result["customModules"] += 1
            except Exception:
                continue
    except Exception as e:
        print(f"[workflow-bundle] 还原模块失败: {e}")

    # 2) 还原图片资产（保持原 id 与文件名）
    try:
        from app.api import image_assets as ia
        for img in (bundle.get("images") or []):
            try:
                img_id = img.get("id")
                if not img_id or img_id in ia.image_assets:
                    continue
                folder = img.get("folder", "") or ""
                target_dir = ia._get_full_path(folder)
                os.makedirs(target_dir, exist_ok=True)
                saved_name = img.get("name") or f"{img_id}{img.get('ext', '')}"
                # 净化文件名，防止整包内构造 ../ 穿越写入到资源目录之外
                saved_name = os.path.basename(str(saved_name).replace('\\', '/'))
                if not saved_name or saved_name in ('.', '..'):
                    continue
                file_path = os.path.join(target_dir, saved_name)
                with open(file_path, "wb") as f:
                    f.write(base64.b64decode(img.get("dataB64", "")))
                ia.image_assets[img_id] = {
                    "id": img_id,
                    "name": saved_name,
                    "originalName": img.get("originalName", saved_name),
                    "size": os.path.getsize(file_path),
                    "uploadedAt": datetime.now().isoformat(),
                    "path": file_path,
                    "folder": folder,
                    "extension": img.get("ext", ""),
                }
                result["images"] += 1
            except Exception:
                continue
    except Exception as e:
        print(f"[workflow-bundle] 还原图片失败: {e}")

    wf = bundle.get("workflow") or {}
    return {
        "success": True,
        "name": bundle.get("name", "workflow"),
        "workflow": {
            "nodes": wf.get("nodes", []),
            "edges": wf.get("edges", []),
            "variables": wf.get("variables", []),
        },
        "restored": result,
    }
