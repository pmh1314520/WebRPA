"""本地工作流文件管理API"""
import os
import sys
import json
import shutil
import subprocess
from pathlib import Path
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.services import webdav_manager

router = APIRouter(prefix="/api/local-workflows", tags=["local-workflows"])

# 默认工作流文件夹（项目根目录下的 workflows 文件夹）
DEFAULT_WORKFLOW_FOLDER = str(Path(__file__).parent.parent.parent.parent / "workflows")


class WorkflowFolderConfig(BaseModel):
    folder: str


class SaveWorkflowRequest(BaseModel):
    filename: str
    content: dict
    folder: Optional[str] = None  # 可选，未提供时使用默认文件夹


class MigrateRequest(BaseModel):
    oldFolder: str
    newFolder: str


class LocalWorkflowInfo(BaseModel):
    filename: str
    name: str
    modifiedTime: str
    size: int


def ensure_folder_exists(folder: str) -> bool:
    """确保文件夹存在"""
    try:
        os.makedirs(folder, exist_ok=True)
        return True
    except Exception:
        return False


def _safe_resolve_in_folder(folder: str, filename: str) -> Optional[str]:
    """安全地把 folder + filename 解析为绝对路径，并要求 filename 必须落在 folder 内
    
    防御路径穿越攻击（如 ../../etc/passwd 或 D:/secrets.json）
    返回解析后的绝对路径；若不安全则返回 None
    """
    try:
        folder_path = Path(folder).resolve()
        # 不允许 filename 是绝对路径
        fn = Path(filename)
        if fn.is_absolute() or fn.drive:
            return None
        target = (folder_path / filename).resolve()
        # 检查目标是否在 folder 内
        try:
            target.relative_to(folder_path)
        except ValueError:
            return None
        return str(target)
    except Exception:
        return None


def _sanitize_filename(filename: str) -> str:
    """清理文件名中的非法字符，并去掉路径分隔符（防止路径穿越）"""
    if not filename:
        return ''
    # 只取最终的文件名部分
    filename = os.path.basename(filename)
    # 清理非法字符
    return "".join(c for c in filename if c not in r'\/:*?"<>|').strip()


@router.get("/default-folder")
async def get_default_folder():
    """获取默认工作流文件夹路径"""
    ensure_folder_exists(DEFAULT_WORKFLOW_FOLDER)
    if webdav_manager.is_enabled():
        return {"folder": "WebDAV", "webdav": True}
    return {"folder": DEFAULT_WORKFLOW_FOLDER}


# ==================== WebDAV（连 NAS/网盘）配置 ====================

class WebDAVConfig(BaseModel):
    enabled: bool = False
    url: str = ""
    username: str = ""
    password: str = ""
    remoteDir: str = ""


@router.get("/webdav-config")
async def get_webdav_config():
    """读取 WebDAV 配置（密码原样返回，仅本机使用）"""
    return {"success": True, "config": webdav_manager.get_config()}


@router.post("/webdav-config")
async def set_webdav_config(cfg: WebDAVConfig):
    """保存 WebDAV 配置"""
    saved = webdav_manager.save_config(cfg.model_dump())
    return {"success": True, "config": saved}


@router.post("/webdav-test")
async def test_webdav(cfg: WebDAVConfig):
    """测试 WebDAV 连接（用传入的配置，不落盘）"""
    return webdav_manager.test_connection(cfg.model_dump())


@router.post("/open-folder")
async def open_folder(config: WorkflowFolderConfig):
    """在系统文件管理器中打开工作流 JSON 文件的保存位置"""
    if webdav_manager.is_enabled():
        return {"success": False, "error": "当前工作流存储在 WebDAV 远程目录，无法在本地打开。请在 NAS/网盘客户端中查看。"}
    folder = config.folder if config.folder else DEFAULT_WORKFLOW_FOLDER
    if not ensure_folder_exists(folder):
        return {"success": False, "error": "无法创建或访问该文件夹"}
    try:
        if sys.platform.startswith("win"):
            os.startfile(folder)  # type: ignore[attr-defined]
        elif sys.platform == "darwin":
            subprocess.Popen(["open", folder])
        else:
            subprocess.Popen(["xdg-open", folder])
        return {"success": True, "folder": folder}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/check-exists")
async def check_workflow_exists(request: SaveWorkflowRequest):
    """检查工作流文件是否已存在"""
    filename = request.filename
    if not filename.endswith('.json'):
        filename += '.json'
    filename = "".join(c for c in filename if c not in r'\/:*?"<>|')

    if webdav_manager.is_enabled():
        try:
            return {"exists": webdav_manager.exists_workflow(filename), "filename": filename, "filepath": f"WebDAV/{filename}"}
        except Exception:
            return {"exists": False, "filename": filename, "filepath": f"WebDAV/{filename}"}

    # 从 content 中提取 folder 信息，如果为空则使用默认值
    folder = request.content.get('_folder')
    if not folder:  # 如果为 None 或空字符串，使用默认文件夹
        folder = DEFAULT_WORKFLOW_FOLDER

    filepath = os.path.join(folder, filename)
    exists = os.path.exists(filepath)
    return {"exists": exists, "filename": filename, "filepath": filepath}


@router.post("/list")
async def list_workflows(config: WorkflowFolderConfig):
    """列出指定文件夹中的所有工作流文件（启用 WebDAV 时走远程目录）"""
    if webdav_manager.is_enabled():
        try:
            return {"workflows": webdav_manager.list_workflows()}
        except Exception as e:
            return {"error": f"WebDAV 列举失败: {e}", "workflows": []}

    # 如果 folder 为空字符串或 None，使用默认文件夹
    folder = config.folder if config.folder else DEFAULT_WORKFLOW_FOLDER
    
    if not os.path.exists(folder):
        ensure_folder_exists(folder)
        return {"workflows": []}
    
    workflows: List[LocalWorkflowInfo] = []
    
    try:
        for filename in os.listdir(folder):
            if filename.lower().endswith('.json'):
                filepath = os.path.join(folder, filename)
                try:
                    stat = os.stat(filepath)
                    modified_time = datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S')
                    
                    # 尝试读取工作流名称
                    workflow_name = filename[:-5]  # 默认使用文件名
                    try:
                        with open(filepath, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                            if 'name' in data:
                                workflow_name = data['name']
                    except Exception:
                        pass
                    
                    workflows.append((stat.st_mtime, LocalWorkflowInfo(
                        filename=filename,
                        name=workflow_name,
                        modifiedTime=modified_time,
                        size=stat.st_size
                    )))
                except Exception as e:
                    print(f"Error reading file {filename}: {e}")
                    continue
        
        # 按真实修改时间（数值）倒序排列，避免字符串排序在边界情况下不稳定
        workflows.sort(key=lambda x: x[0], reverse=True)
        
        return {"workflows": [w.model_dump() for _, w in workflows]}
    
    except Exception as e:
        return {"error": str(e), "workflows": []}



def _preserve_self_heal(filepath: str, content):
    """编辑器保存会整体覆盖文件，这里把已存在的 selfHeal（自愈固化开关/统计）
    在新内容缺失该字段时保留下来，避免一保存就把自愈固化设置清掉。"""
    try:
        if not isinstance(content, dict):
            return content
        if content.get('selfHeal') is not None:
            return content
        import os as _os
        if filepath and _os.path.isfile(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                old = json.load(f)
            if isinstance(old, dict) and old.get('selfHeal') is not None:
                content = dict(content)
                content['selfHeal'] = old['selfHeal']
    except Exception:
        pass
    return content


class SelfHealToggleRequest(BaseModel):
    filename: str
    enabled: bool
    folder: str | None = None


@router.post("/self-heal")
async def set_self_heal(request: SelfHealToggleRequest):
    """开启/关闭某工作流的"自愈固化（健康基线）"。开启后，定时/发布/打包运行时
    若发生元素选择器自愈，将把修复结果持久化回该工作流文件（保留旧版本+发通知）。"""
    folder = request.folder if request.folder else DEFAULT_WORKFLOW_FOLDER
    filename = _sanitize_filename(request.filename)
    if not filename:
        return {"success": False, "error": "文件名无效"}
    if not filename.endswith('.json'):
        filename += '.json'
    filepath = _safe_resolve_in_folder(folder, filename)
    if not filepath:
        return {"success": False, "error": "文件路径不安全"}
    import os as _os
    if not _os.path.isfile(filepath):
        return {"success": False, "error": "工作流文件不存在"}
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        if not isinstance(data, dict):
            return {"success": False, "error": "工作流文件格式异常"}
        sh = data.get('selfHeal') or {}
        sh['enabled'] = bool(request.enabled)
        data['selfHeal'] = sh
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return {"success": True, "enabled": bool(request.enabled), "selfHeal": sh}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/self-heal/{filename:path}")
async def get_self_heal(filename: str, folder: str = None):
    """读取某工作流的自愈固化状态。"""
    fld = folder if folder else DEFAULT_WORKFLOW_FOLDER
    safe = _sanitize_filename(filename)
    if not safe:
        return {"success": False, "error": "文件名无效"}
    if not safe.endswith('.json'):
        safe += '.json'
    filepath = _safe_resolve_in_folder(fld, safe)
    import os as _os
    if not filepath or not _os.path.isfile(filepath):
        return {"success": True, "enabled": False, "selfHeal": {}}
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        sh = (data.get('selfHeal') or {}) if isinstance(data, dict) else {}
        return {"success": True, "enabled": bool(sh.get('enabled')), "selfHeal": sh}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/save")
async def save_workflow(request: SaveWorkflowRequest):
    """保存工作流到指定文件夹（folder 字段可选）"""
    folder = request.folder if request.folder else DEFAULT_WORKFLOW_FOLDER
    
    if not ensure_folder_exists(folder):
        return {"success": False, "error": "无法创建文件夹"}
    
    # 确保文件名以 .json 结尾
    filename = _sanitize_filename(request.filename)
    if not filename:
        return {"success": False, "error": "文件名无效"}
    if not filename.endswith('.json'):
        filename += '.json'
    
    filepath = _safe_resolve_in_folder(folder, filename)
    if not filepath:
        return {"success": False, "error": "文件路径不安全"}
    
    try:
        content = _preserve_self_heal(filepath, request.content)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(content, f, ensure_ascii=False, indent=2)
        
        return {"success": True, "filepath": filepath, "filename": filename}
    
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/save-to-folder")
async def save_workflow_to_folder(request: SaveWorkflowRequest):
    """保存工作流到指定文件夹（从请求体获取文件夹路径；启用 WebDAV 时存到远程）"""
    # 移除临时的 _folder 字段
    content = request.content
    if isinstance(content, dict) and '_folder' in content:
        content = {k: v for k, v in content.items() if k != '_folder'}

    filename = _sanitize_filename(request.filename)
    if not filename:
        return {"success": False, "error": "文件名无效"}
    if not filename.endswith('.json'):
        filename += '.json'

    if webdav_manager.is_enabled():
        try:
            webdav_manager.save_workflow(filename, content)
            return {"success": True, "filepath": f"WebDAV/{filename}", "filename": filename}
        except Exception as e:
            return {"success": False, "error": f"WebDAV 保存失败: {e}"}

    # 优先用 request.folder 字段，其次从 content._folder 取（兼容旧前端）
    folder = request.folder
    if not folder:
        folder = request.content.get('_folder') if isinstance(request.content, dict) else None
    if not folder:
        folder = DEFAULT_WORKFLOW_FOLDER

    if not ensure_folder_exists(folder):
        return {"success": False, "error": "[ERROR] 未配置工作流保存路径"}

    filepath = _safe_resolve_in_folder(folder, filename)
    if not filepath:
        return {"success": False, "error": "文件路径不安全"}
    
    try:
        content = _preserve_self_heal(filepath, content)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(content, f, ensure_ascii=False, indent=2)
        
        return {"success": True, "filepath": filepath, "filename": filename}
    
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/load/{filename:path}")
async def load_workflow(filename: str, folder: str = None):
    """加载指定的工作流文件（启用 WebDAV 时从远程读取）"""
    safe_filename = _sanitize_filename(filename)
    if not safe_filename:
        return {"success": False, "error": "文件名无效"}

    if webdav_manager.is_enabled():
        try:
            content = webdav_manager.read_workflow(safe_filename)
            if content is None:
                return {"success": False, "error": "文件不存在"}
            return {"success": True, "content": content}
        except Exception as e:
            return {"success": False, "error": f"WebDAV 读取失败: {e}"}

    # 如果 folder 为空字符串或 None，使用默认文件夹
    folder = folder if folder else DEFAULT_WORKFLOW_FOLDER
    filepath = _safe_resolve_in_folder(folder, safe_filename)
    if not filepath:
        return {"success": False, "error": "文件路径不安全"}
    
    if not os.path.exists(filepath):
        return {"success": False, "error": "文件不存在"}
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = json.load(f)
        
        return {"success": True, "content": content}
    
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/delete")
async def delete_workflow(filename: str, folder: str = None):
    """删除指定的工作流文件（启用 WebDAV 时删除远程文件）"""
    safe_filename = _sanitize_filename(filename)
    if not safe_filename:
        return {"success": False, "error": "文件名无效"}

    if webdav_manager.is_enabled():
        try:
            webdav_manager.delete_workflow(safe_filename)
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": f"WebDAV 删除失败: {e}"}

    # 如果 folder 为空字符串或 None，使用默认文件夹
    folder = folder if folder else DEFAULT_WORKFLOW_FOLDER
    filepath = _safe_resolve_in_folder(folder, safe_filename)
    if not filepath:
        return {"success": False, "error": "文件路径不安全"}
    
    if not os.path.exists(filepath):
        return {"success": False, "error": "文件不存在"}
    
    try:
        os.remove(filepath)
        return {"success": True}
    
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/migrate")
async def migrate_workflows(request: MigrateRequest):
    """将工作流文件从旧文件夹迁移到新文件夹"""
    old_folder = request.oldFolder
    new_folder = request.newFolder
    
    if not os.path.exists(old_folder):
        return {"success": True, "migrated": 0, "message": "旧文件夹不存在，无需迁移"}
    
    if not ensure_folder_exists(new_folder):
        return {"success": False, "error": "无法创建新文件夹"}
    
    migrated = 0
    errors = []
    
    try:
        for filename in os.listdir(old_folder):
            if filename.endswith('.json'):
                old_path = os.path.join(old_folder, filename)
                new_path = os.path.join(new_folder, filename)
                
                try:
                    # 如果目标文件已存在，添加时间戳后缀
                    if os.path.exists(new_path):
                        base, ext = os.path.splitext(filename)
                        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
                        new_path = os.path.join(new_folder, f"{base}_{timestamp}{ext}")
                    
                    shutil.move(old_path, new_path)
                    migrated += 1
                except Exception as e:
                    errors.append(f"{filename}: {str(e)}")
        
        return {
            "success": True,
            "migrated": migrated,
            "errors": errors if errors else None
        }
    
    except Exception as e:
        return {"success": False, "error": str(e)}
