# -*- coding: utf-8 -*-
"""功能模块包管理 API

- GET  /api/feature-packs                功能包清单 + 安装状态
- POST /api/feature-packs/install-path   从本地路径安装（推荐，避免 HTTP 上传 GB 级文件）
- POST /api/feature-packs/install        上传 zip 安装（小体积包适用）
- POST /api/feature-packs/uninstall      卸载
- GET  /api/feature-packs/module-hint/{module_type}  查询某工作流模块依赖的功能包
"""
from __future__ import annotations

import shutil
import tempfile
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel

from app.services import feature_packs as fp

router = APIRouter(prefix="/api/feature-packs", tags=["feature-packs"])


class PathInstallRequest(BaseModel):
    path: str


class UninstallRequest(BaseModel):
    id: str


class PreflightRequest(BaseModel):
    module_types: list[str]


@router.get("")
async def list_feature_packs():
    return {"success": True, "packs": fp.list_packs()}


@router.post("/install-path")
async def install_from_path(req: PathInstallRequest):
    """从本地文件路径安装功能包 zip（后端直接读文件，适合大包）"""
    p = Path(req.path.strip().strip('"'))
    if not p.exists() or not p.is_file():
        raise HTTPException(status_code=400, detail=f"文件不存在: {p}")
    if p.suffix.lower() != ".zip":
        raise HTTPException(status_code=400, detail="功能包必须是 .zip 文件")
    try:
        result = fp.install_pack_from_zip(p)
        return {"success": True, **result}
    except fp.PackInstallError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"安装失败: {e}")


@router.post("/install")
async def install_from_upload(file: UploadFile = File(...)):
    """上传 zip 安装功能包（流式落盘到临时文件再安装，不整包读进内存）"""
    if not (file.filename or "").lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="功能包必须是 .zip 文件")
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp:
            tmp_path = Path(tmp.name)
            shutil.copyfileobj(file.file, tmp, length=4 * 1024 * 1024)
        result = fp.install_pack_from_zip(tmp_path)
        return {"success": True, **result}
    except fp.PackInstallError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"安装失败: {e}")
    finally:
        if tmp_path is not None:
            try:
                tmp_path.unlink(missing_ok=True)
            except Exception:
                pass


@router.post("/uninstall")
async def uninstall(req: UninstallRequest):
    try:
        result = fp.uninstall_pack(req.id)
        return {"success": True, **result}
    except fp.PackInstallError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"卸载失败: {e}")


@router.post("/preflight")
async def preflight(req: PreflightRequest):
    """工作流运行前预检：给定用到的模块类型，返回缺失的功能包与受影响模块。

    前端可在运行前（或装载工作流时）调用，用于给出"缺包"横幅/弹窗；
    后端执行器在 execute() 里也会做同样的预检并拦截运行。
    """
    result = fp.preflight_check(req.module_types or [])
    return {"success": True, **result, "message": fp.format_preflight_error(result)}


@router.get("/module-hint/{module_type}")
async def module_hint(module_type: str):
    """查询某工作流模块类型依赖的功能包及其安装状态（前端灰显/提示用）"""
    pack = fp.pack_for_module_type(module_type)
    if not pack:
        return {"success": True, "pack": None}
    return {
        "success": True,
        "pack": {
            "id": pack.id,
            "name": pack.name,
            "installed": fp.is_pack_installed(pack),
        },
    }
