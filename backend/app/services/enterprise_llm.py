# -*- coding: utf-8 -*-
"""企业能力共用的 LLM 调用助手（文本 + 多模态视觉）

复用编辑器推送到后端的共享配置（shared_config.json）构造 AssistantConfig，
为 Computer-Use Agent、文档智能 IDP、流程反推等能力提供统一的 LLM 入口。

- build_llm_config(vision)：构造调用配置；vision=True 时优先用 visionModel（若配置）。
- text_chat：纯文本一问一答。
- vision_chat：带图片（base64）的多模态一问一答（OpenAI 兼容 image_url 协议）。
"""
from __future__ import annotations

import json
from typing import Any, Optional


def _load_shared_cfg() -> dict[str, Any]:
    try:
        from app.services.ai_assistant_skills import _get_data_folder  # type: ignore
        p = _get_data_folder() / "ai_assistant" / "shared_config.json"
        if p.exists():
            raw = json.loads(p.read_text(encoding="utf-8"))
            return raw.get("config", raw) if isinstance(raw, dict) else {}
    except Exception:
        pass
    return {}


def build_llm_config(vision: bool = False):
    """构造 AssistantConfig。vision=True 时优先取配置里的 visionModel。"""
    from app.models.ai_assistant import AssistantConfig
    cfg = _load_shared_cfg()
    a = cfg.get("aiAssistant") or {}
    b = cfg.get("ai") or {}
    api_url = (a.get("apiUrl") or b.get("apiUrl") or "").strip()
    api_key = (a.get("apiKey") or b.get("apiKey") or "").strip()
    model = (a.get("model") or b.get("model") or "").strip()
    if vision:
        vmodel = (a.get("visionModel") or b.get("visionModel") or "").strip()
        if vmodel:
            model = vmodel
    if not api_url or not model:
        return None
    return AssistantConfig(
        api_url=api_url, api_key=api_key, model=model,
        temperature=0.2, max_tokens=4000, enable_tools=False,
    )


async def text_chat(system: str, user: str, *, temperature: float = 0.2) -> str:
    """纯文本 LLM 调用，返回助手文本。未配置则抛 RuntimeError。"""
    from app.services.ai_assistant_service import _call_llm, _parse_assistant_response
    config = build_llm_config(vision=False)
    if config is None:
        raise RuntimeError("未配置可用的 AI 模型（请先在 WebRPA 编辑器的全局配置中填写模型 API）")
    config.temperature = temperature
    messages = [{"role": "system", "content": system}, {"role": "user", "content": user}]
    raw = await _call_llm(config=config, messages=messages, tools=None, on_event=None)
    content, _tc, _rc = _parse_assistant_response(raw)
    return content or ""


async def vision_chat(system: str, user_text: str, images_b64: list[str],
                      *, mime: str = "image/png", temperature: float = 0.2) -> str:
    """多模态 LLM 调用：附带若干 base64 图片。未配置则抛 RuntimeError。"""
    from app.services.ai_assistant_service import _call_llm, _parse_assistant_response
    config = build_llm_config(vision=True)
    if config is None:
        raise RuntimeError("未配置可用的多模态 AI 模型（请先在 WebRPA 编辑器的全局配置中填写模型 API）")
    config.temperature = temperature
    content_parts: list[dict[str, Any]] = [{"type": "text", "text": user_text}]
    for b64 in images_b64:
        if not b64:
            continue
        # 兼容已带 data URI 前缀的情况
        url = b64 if b64.startswith("data:") else f"data:{mime};base64,{b64}"
        content_parts.append({"type": "image_url", "image_url": {"url": url}})
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": content_parts},
    ]
    raw = await _call_llm(config=config, messages=messages, tools=None, on_event=None)
    content, _tc, _rc = _parse_assistant_response(raw)
    return content or ""


def extract_json(text: str) -> Any:
    """从 LLM 文本中稳健提取 JSON（容忍 ```json 围栏、前后说明文字）。"""
    if not text:
        return None
    s = text.strip()
    if s.startswith("```"):
        # 去掉代码围栏
        lines = s.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        s = "\n".join(lines).strip()
    # 直接尝试
    try:
        return json.loads(s)
    except Exception:
        pass
    # 截取首个 { 或 [ 到最后一个 } 或 ]
    for open_ch, close_ch in (("{", "}"), ("[", "]")):
        i = s.find(open_ch)
        j = s.rfind(close_ch)
        if i != -1 and j != -1 and j > i:
            try:
                return json.loads(s[i:j + 1])
            except Exception:
                continue
    return None
