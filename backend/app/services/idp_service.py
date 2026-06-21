# -*- coding: utf-8 -*-
"""文档智能处理（IDP，Intelligent Document Processing）

上传发票/合同/简历/通用表单等文档（图片/PDF）→ OCR 兜底文本 + 多模态 LLM 抽取
→ 结构化字段（字段名、值、置信度）→ 按模板对必填字段做校验。

内置模板：invoice / contract / resume / form，可自定义模板（idp_templates.json）。
"""
from __future__ import annotations

import asyncio
import base64
import io
import json
import re
from pathlib import Path
from typing import Any, Optional

_DATA_DIR = Path("backend/data")
_TPL_FILE = _DATA_DIR / "idp_templates.json"

# ---------- 内置字段模板 ----------
BUILTIN_TEMPLATES: dict[str, dict[str, Any]] = {
    "invoice": {
        "label": "增值税发票 / 通用发票",
        "fields": [
            {"name": "invoice_code", "label": "发票代码", "required": False, "type": "string"},
            {"name": "invoice_number", "label": "发票号码", "required": True, "type": "string"},
            {"name": "invoice_date", "label": "开票日期", "required": True, "type": "date"},
            {"name": "seller_name", "label": "销售方名称", "required": True, "type": "string"},
            {"name": "seller_tax_id", "label": "销售方纳税人识别号", "required": False, "type": "string"},
            {"name": "buyer_name", "label": "购买方名称", "required": False, "type": "string"},
            {"name": "amount", "label": "金额（不含税）", "required": False, "type": "number"},
            {"name": "tax", "label": "税额", "required": False, "type": "number"},
            {"name": "total", "label": "价税合计", "required": True, "type": "number"},
        ],
    },
    "contract": {
        "label": "合同",
        "fields": [
            {"name": "contract_name", "label": "合同名称", "required": True, "type": "string"},
            {"name": "contract_number", "label": "合同编号", "required": False, "type": "string"},
            {"name": "party_a", "label": "甲方", "required": True, "type": "string"},
            {"name": "party_b", "label": "乙方", "required": True, "type": "string"},
            {"name": "amount", "label": "合同金额", "required": False, "type": "number"},
            {"name": "sign_date", "label": "签订日期", "required": False, "type": "date"},
            {"name": "effective_date", "label": "生效日期", "required": False, "type": "date"},
            {"name": "expiry_date", "label": "到期日期", "required": False, "type": "date"},
        ],
    },
    "resume": {
        "label": "简历",
        "fields": [
            {"name": "name", "label": "姓名", "required": True, "type": "string"},
            {"name": "phone", "label": "电话", "required": False, "type": "string"},
            {"name": "email", "label": "邮箱", "required": False, "type": "string"},
            {"name": "gender", "label": "性别", "required": False, "type": "string"},
            {"name": "education", "label": "最高学历", "required": False, "type": "string"},
            {"name": "school", "label": "毕业院校", "required": False, "type": "string"},
            {"name": "years_experience", "label": "工作年限", "required": False, "type": "number"},
            {"name": "expected_position", "label": "期望职位", "required": False, "type": "string"},
            {"name": "skills", "label": "技能标签", "required": False, "type": "array"},
        ],
    },
    "form": {
        "label": "通用表单",
        "fields": [],  # 通用表单不预设字段，全部由 LLM 自由抽取键值对
    },
}

# 简单格式校验
_VALIDATORS = {
    "date": re.compile(r"\d{4}[-/年.]\d{1,2}[-/月.]\d{1,2}"),
    "number": re.compile(r"-?\d+(\.\d+)?"),
    "email": re.compile(r"[^@\s]+@[^@\s]+\.[^@\s]+"),
}


def _load_custom() -> dict[str, Any]:
    try:
        if _TPL_FILE.exists():
            return json.loads(_TPL_FILE.read_text(encoding="utf-8"))
    except Exception:
        pass
    return {}


def _save_custom(data: dict[str, Any]) -> None:
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    _TPL_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def list_templates() -> list[dict[str, Any]]:
    out = []
    for key, t in BUILTIN_TEMPLATES.items():
        out.append({"key": key, "label": t["label"], "builtin": True,
                    "fields": t["fields"]})
    for key, t in _load_custom().items():
        out.append({"key": key, "label": t.get("label", key), "builtin": False,
                    "fields": t.get("fields", [])})
    return out


def get_template(doc_type: str) -> Optional[dict[str, Any]]:
    if doc_type in BUILTIN_TEMPLATES:
        return BUILTIN_TEMPLATES[doc_type]
    return _load_custom().get(doc_type)


def upsert_template(key: str, label: str, fields: list[dict[str, Any]]) -> dict[str, Any]:
    key = (key or "").strip()
    if not key:
        return {"success": False, "error": "模板 key 不能为空"}
    if key in BUILTIN_TEMPLATES:
        return {"success": False, "error": "不能覆盖内置模板，请用其他 key"}
    data = _load_custom()
    data[key] = {"label": label or key, "fields": fields or []}
    _save_custom(data)
    return {"success": True, "key": key}


def delete_template(key: str) -> dict[str, Any]:
    data = _load_custom()
    if key not in data:
        return {"success": False, "error": "自定义模板不存在"}
    data.pop(key, None)
    _save_custom(data)
    return {"success": True}


# ---------- 文档转图片 + OCR 文本兜底 ----------
def _to_images(file_bytes: bytes, filename: str) -> list[bytes]:
    """把上传文件转成一张或多张 PNG 图片字节（PDF 逐页渲染，图片直接用）。"""
    name = (filename or "").lower()
    if name.endswith(".pdf"):
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            imgs = []
            for i, page in enumerate(doc):
                if i >= 5:  # 最多取前 5 页，控制成本
                    break
                pix = page.get_pixmap(dpi=150)
                imgs.append(pix.tobytes("png"))
            doc.close()
            if imgs:
                return imgs
        except Exception as e:
            print(f"[idp] PDF 渲染失败（缺 PyMuPDF？）: {e}")
        return []
    # 普通图片：用 PIL 规范化为 PNG
    try:
        from PIL import Image
        img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return [buf.getvalue()]
    except Exception as e:
        print(f"[idp] 图片解析失败: {e}")
        return []


def _ocr_text(image_bytes: bytes) -> str:
    """OCR 兜底文本（多模态不可用或辅助校对时使用）。"""
    try:
        import numpy as np
        from PIL import Image
        from app.services.paddle_ocr_init import get_ocr_instance, parse_ocr_result
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        arr = np.array(img)
        ocr = get_ocr_instance("ch")
        try:
            raw = ocr.predict(arr)
        except Exception:
            raw = ocr.ocr(arr)
        items = parse_ocr_result(raw)
        return "\n".join(t for _b, t, _s in items if t)
    except Exception as e:
        print(f"[idp] OCR 兜底失败: {e}")
        return ""


def _validate_fields(template: dict[str, Any], extracted: dict[str, Any]) -> list[dict[str, Any]]:
    """按模板必填/格式校验抽取结果，返回问题列表。"""
    issues: list[dict[str, Any]] = []
    for f in template.get("fields", []):
        name = f["name"]
        val = extracted.get(name)
        has_val = val not in (None, "", [], {})
        if f.get("required") and not has_val:
            issues.append({"field": name, "label": f.get("label", name),
                           "level": "error", "message": "必填字段缺失"})
            continue
        if has_val and isinstance(val, str):
            ftype = f.get("type")
            validator = _VALIDATORS.get(ftype)
            if validator and not validator.search(val):
                issues.append({"field": name, "label": f.get("label", name),
                               "level": "warning", "message": f"格式可能不符合 {ftype}"})
    return issues


async def extract(file_bytes: bytes, filename: str, doc_type: str = "form",
                  actor: str = "system") -> dict[str, Any]:
    """对一份文档抽取结构化字段。"""
    from app.services import enterprise_llm
    template = get_template(doc_type)
    if template is None:
        return {"success": False, "error": f"未知文档类型：{doc_type}"}
    if enterprise_llm.build_llm_config(vision=True) is None:
        return {"success": False,
                "error": "未配置多模态 AI 模型，无法进行文档抽取（请在全局配置填写支持视觉的模型）"}

    images = await asyncio.to_thread(_to_images, file_bytes, filename)
    if not images:
        return {"success": False, "error": "无法解析该文档（不支持的格式或文件损坏）"}

    # 仅取首图做抽取（多页文档以首页为主，必要时可扩展为多页合并）
    main_img = images[0]
    img_b64 = base64.b64encode(main_img).decode("ascii")
    ocr_hint = await asyncio.to_thread(_ocr_text, main_img)

    fields = template.get("fields", [])
    if fields:
        field_spec = "\n".join(
            f"  - {f['name']}（{f.get('label', f['name'])}，类型 {f.get('type','string')}"
            f"{'，必填' if f.get('required') else ''}）"
            for f in fields
        )
        target_keys = [f["name"] for f in fields]
        instruct = (
            f"这是一份「{template.get('label', doc_type)}」文档。请抽取以下字段：\n{field_spec}\n\n"
            f"严格只输出一个 JSON 对象，键为字段英文名 {target_keys}，"
            "值为抽取到的内容（找不到则用 null）。每个字段额外给出置信度，"
            '放在 "_confidence" 子对象里，形如 {"字段名": 0.0~1.0}。'
        )
    else:
        instruct = (
            "这是一份通用表单/文档。请抽取其中所有有意义的键值对，"
            '只输出一个 JSON 对象，并在 "_confidence" 子对象里给出每个键 0~1 的置信度。'
        )

    user_text = instruct
    if ocr_hint:
        user_text += f"\n\n（OCR 辅助文本，仅供参考校对，可能有误）：\n{ocr_hint[:1500]}"

    system = "你是专业的文档信息抽取引擎，只输出 JSON，绝不输出多余文字。"
    try:
        reply = await enterprise_llm.vision_chat(system, user_text, [img_b64])
    except Exception as e:
        return {"success": False, "error": f"模型调用失败：{e}"}

    parsed = enterprise_llm.extract_json(reply)
    if not isinstance(parsed, dict):
        return {"success": False, "error": "模型未返回有效结构化结果", "raw": reply[:300]}

    confidence = parsed.pop("_confidence", {}) or {}
    if not isinstance(confidence, dict):
        confidence = {}

    issues = _validate_fields(template, parsed)

    field_results = []
    for k, v in parsed.items():
        field_results.append({
            "name": k,
            "value": v,
            "confidence": round(float(confidence.get(k, 0.0)), 3) if isinstance(confidence.get(k), (int, float)) else None,
        })

    try:
        from app.services import audit_log
        audit_log.record(actor, "idp.use", f"{doc_type}:{filename}",
                         result="extracted" if not any(i["level"] == "error" for i in issues) else "incomplete",
                         detail={"fields": len(field_results), "issues": len(issues)})
    except Exception:
        pass

    return {
        "success": True,
        "doc_type": doc_type,
        "filename": filename,
        "pages": len(images),
        "fields": field_results,
        "data": parsed,
        "issues": issues,
        "valid": not any(i["level"] == "error" for i in issues),
    }
