# -*- coding: utf-8 -*-
"""文档智能 IDP API"""
from typing import Any, Optional
from fastapi import APIRouter, HTTPException, Header, UploadFile, File, Form
from pydantic import BaseModel

from app.services import rbac, idp_service

router = APIRouter(prefix="/api/idp", tags=["idp"])


def _actor(token: Optional[str], permission: str) -> str:
    s = rbac.resolve_session(token)
    if s:
        if not rbac.has_permission(s, permission):
            raise HTTPException(status_code=403, detail=f"缺少权限：{permission}")
        return s.get("username", "user")
    return "local"


class TemplateReq(BaseModel):
    key: str
    label: str
    fields: list[dict[str, Any]]


@router.get("/templates")
async def list_templates():
    return {"success": True, "templates": idp_service.list_templates()}


@router.post("/templates")
async def upsert_template(req: TemplateReq, x_webrpa_session: Optional[str] = Header(None)):
    _actor(x_webrpa_session, "idp.use")
    res = idp_service.upsert_template(req.key, req.label, req.fields)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error"))
    return res


@router.delete("/templates/{key}")
async def delete_template(key: str, x_webrpa_session: Optional[str] = Header(None)):
    _actor(x_webrpa_session, "idp.use")
    res = idp_service.delete_template(key)
    if not res.get("success"):
        raise HTTPException(status_code=404, detail=res.get("error"))
    return res


@router.post("/extract")
async def extract(file: UploadFile = File(...), doc_type: str = Form("form"),
                  x_webrpa_session: Optional[str] = Header(None)):
    actor = _actor(x_webrpa_session, "idp.use")
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="文件为空")
    result = await idp_service.extract(content, file.filename or "upload", doc_type, actor=actor)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result
