"""系统相关API路由"""
import subprocess
import sys
import asyncio
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
import json

router = APIRouter(prefix="/api/system", tags=["system"])

# 鼠标拾取器进程
mouse_picker_process = None


class CustomHotkeysRequest(BaseModel):
    """用户自定义全局热键：{action_id: combo}，如 {"run_workflow": "Ctrl+Alt+R"}"""
    shortcuts: dict = {}


@router.post("/custom-hotkeys")
async def set_custom_hotkeys(req: CustomHotkeysRequest):
    """注册用户自定义全局热键（系统级，聚焦其它软件也能触发）。前端在配置变更/启动时调用。"""
    try:
        from app.services.global_hotkey import get_hotkey_service
        get_hotkey_service().update_custom_hotkeys(req.shortcuts or {})
        return {"success": True, "count": len([v for v in (req.shortcuts or {}).values() if v])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"注册自定义全局热键失败: {e}")


# 注：/open-url 已移至 system_dialog.py，避免路由冲突
# 注：/mouse-position 已移至 system_mouse.py，避免路由冲突


class ScreenshotToolRequest(BaseModel):
    """截图工具请求"""
    saveToAssets: bool = True
    folder: Optional[str] = None


@router.post("/screenshot-tool")
async def screenshot_tool(request: ScreenshotToolRequest):
    """启动系统截图工具（Win+Shift+S），等待用户截图后保存"""
    try:
        from app.services.screenshot_tool_v2 import screenshot_tool_handler
        result = await screenshot_tool_handler(request.model_dump())
        return result
    except Exception as e:
        return {"success": False, "error": f"截图工具启动失败: {e}"}


@router.post("/screenshot")
async def screenshot_screen():
    """直接对当前屏幕进行截图（不需要用户交互）"""
    import tempfile
    import os
    from datetime import datetime
    try:
        from PIL import ImageGrab
    except ImportError:
        return {"success": False, "error": "缺少 Pillow 依赖（pip install Pillow）"}
    
    try:
        # 截取整个屏幕
        loop = asyncio.get_running_loop()
        img = await loop.run_in_executor(None, ImageGrab.grab)
        if img is None:
            return {"success": False, "error": "截屏失败，未获取到图像"}
        
        # 保存到 image_assets
        image_assets_dir = Path(__file__).parent.parent.parent / "uploads" / "images"
        image_assets_dir.mkdir(parents=True, exist_ok=True)
        
        import uuid
        asset_id = str(uuid.uuid4())
        save_path = image_assets_dir / f"{asset_id}.png"
        await loop.run_in_executor(None, lambda: img.save(str(save_path), 'PNG'))
        
        file_name = f"screen_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        file_size = save_path.stat().st_size
        
        # 注册资产
        from app.api.image_assets import image_assets
        image_assets[asset_id] = {
            "id": asset_id,
            "name": f"{asset_id}.png",
            "originalName": file_name,
            "size": file_size,
            "uploadedAt": datetime.now().isoformat(),
            "folder": "",
            "extension": ".png",
            "path": str(save_path),
        }
        
        return {
            "success": True,
            "assetId": asset_id,
            "fileName": file_name,
            "width": img.width,
            "height": img.height,
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"success": False, "error": f"截屏失败: {e}"}


@router.post("/screenshot-base64")
async def screenshot_base64():
    """对当前屏幕截图并直接返回 base64 data URL（供 AI 小助手「看屏」喂给视觉模型）。
    自动缩放到最长边 1400px、jpeg 压缩，控制体积。"""
    import asyncio as _asyncio
    import base64 as _b64
    import io as _io
    try:
        from PIL import ImageGrab, Image
    except ImportError:
        return {"success": False, "error": "缺少 Pillow 依赖"}
    try:
        loop = _asyncio.get_running_loop()

        def _grab() -> dict:
            img = ImageGrab.grab()
            if img is None:
                return {"success": False, "error": "未获取到图像"}
            w, h = img.width, img.height
            max_side = max(w, h)
            if max_side > 1400:
                ratio = 1400 / max_side
                img = img.convert("RGB").resize((int(w * ratio), int(h * ratio)), Image.Resampling.LANCZOS)
            else:
                img = img.convert("RGB")
            buf = _io.BytesIO()
            img.save(buf, format="JPEG", quality=70)
            b64 = _b64.b64encode(buf.getvalue()).decode("ascii")
            return {"success": True, "dataUrl": f"data:image/jpeg;base64,{b64}", "width": w, "height": h}

        return await loop.run_in_executor(None, _grab)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"success": False, "error": f"截屏失败: {e}"}


# 设置 socketio 实例的引用（保留旧名以兼容历史导入）
_sio = None


def set_napcat_sio(sio):
    """[已废弃] 旧的 sio 注入入口，保留兼容性。
    
    实际的 napcat 事件由 system_napcat.py 中的 set_napcat_sio 接管。
    """
    global _sio
    _sio = sio


class SaveClipboardImageRequest(BaseModel):
    name: Optional[str] = None
    folder: Optional[str] = None
    filename: Optional[str] = None


@router.post("/save-clipboard-image")
async def save_clipboard_image(request: SaveClipboardImageRequest):
    """保存剪贴板图片到图像资源"""
    try:
        from PIL import ImageGrab
        import uuid
        from datetime import datetime
        import os
        
        # 获取剪贴板图片
        img = ImageGrab.grabclipboard()
        if img is None:
            return {"success": False, "error": "剪贴板中没有图片"}
        
        # 使用 image_assets 模块的统一存储路径
        from app.api.image_assets import IMAGE_UPLOAD_DIR, image_assets
        
        # 确定保存目录
        if request.folder:
            save_dir = os.path.join(IMAGE_UPLOAD_DIR, request.folder)
        else:
            save_dir = IMAGE_UPLOAD_DIR
        
        os.makedirs(save_dir, exist_ok=True)
        
        # 生成文件ID和文件名
        file_id = str(uuid.uuid4())
        # 优先使用 name 字段（前端传来），其次 filename，最后自动生成
        user_name = request.name or request.filename
        if user_name:
            display_name = user_name if user_name.endswith('.png') else f"{user_name}.png"
        else:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            display_name = f"clipboard_{timestamp}.png"
        
        # 实际保存用 UUID 文件名，避免冲突
        saved_name = f"{file_id}.png"
        save_path = os.path.join(save_dir, saved_name)
        
        # 保存图片
        img.save(save_path, 'PNG')
        
        # 获取文件大小
        file_size = os.path.getsize(save_path)
        
        # 注册到 image_assets 元数据中
        folder_path = request.folder or ''
        asset = {
            'id': file_id,
            'name': saved_name,
            'originalName': display_name,
            'size': file_size,
            'uploadedAt': datetime.now().isoformat(),
            'path': save_path,
            'folder': folder_path,
            'extension': '.png',
        }
        image_assets[file_id] = asset
        
        return {
            "success": True,
            "assetId": file_id,
            "path": save_path,
            "filename": display_name
        }
    
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/module-required-fields")
async def module_required_fields():
    """返回各模块的必填字段映射 { moduleType: [必填字段名, ...] }，供前端配置面板做必填校验提示。"""
    try:
        from app.services.ai_assistant_module_schemas import get_all_module_schemas, conditional_required_map
        schemas = get_all_module_schemas()
        result = {}
        field_labels = {}
        for mtype, schema in schemas.items():
            if not isinstance(schema, dict):
                continue
            # 字段中文说明（desc）作为前端必填提示的字段标签来源
            desc = schema.get("desc")
            if isinstance(desc, dict) and desc:
                labels = {k: v for k, v in desc.items() if isinstance(v, str) and v.strip()}
                if labels:
                    field_labels[mtype] = labels
            req = schema.get("required")
            if isinstance(req, list) and req:
                # 有默认值的必填字段在执行时会自动补默认值（见 apply_default_config），
                # 不应在配置面板提示"未填写"，否则用户看到默认值却仍被警告。
                defaults = schema.get("defaults") or {}
                filtered = [f for f in req if f not in defaults]
                if filtered:
                    result[mtype] = filtered
        return {
            "requiredFields": result,
            "conditionalRequired": conditional_required_map(),
            "fieldLabels": field_labels,
        }
    except Exception as e:
        return {"requiredFields": {}, "conditionalRequired": {}, "error": str(e)}


@router.get("/local-image")
async def local_image(path: str):
    """按本地绝对路径返回图片文件（仅限常见图片类型），供 EXE 界面设计器预览用户选择的本地图。
    浏览器禁止从 http 源直接加载 file:// 本地文件，故由后端读取并回传。"""
    try:
        p = Path(path)
    except Exception:
        raise HTTPException(status_code=400, detail="路径无效")
    ext = p.suffix.lower()
    allowed = {".png": "image/png", ".gif": "image/gif", ".jpg": "image/jpeg",
               ".jpeg": "image/jpeg", ".webp": "image/webp", ".bmp": "image/bmp", ".ico": "image/x-icon"}
    if ext not in allowed:
        raise HTTPException(status_code=400, detail="仅支持图片文件")
    if not p.is_file():
        raise HTTPException(status_code=404, detail="文件不存在")
    return FileResponse(path=str(p), media_type=allowed[ext], filename=p.name)
