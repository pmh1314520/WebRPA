"""
自定义模块API
"""
from fastapi import APIRouter, HTTPException
from typing import List, Optional
import json
import os
from pathlib import Path
from datetime import datetime

from app.models.custom_module import (
    CustomModule,
    CustomModuleCreate,
    CustomModuleUpdate,
    CustomModuleListResponse
)
from app.utils.paths import BACKEND_DATA_DIR

router = APIRouter(prefix="/api/custom-modules", tags=["custom-modules"])

# 自定义模块存储目录
CUSTOM_MODULES_DIR = BACKEND_DATA_DIR / "custom_modules"
CUSTOM_MODULES_DIR.mkdir(parents=True, exist_ok=True)


import re

# 模块 ID 合法字符集（与 executors/custom_module.py 保持一致）
_MODULE_ID_PATTERN = re.compile(r'^[A-Za-z0-9_\-\u4e00-\u9fa5]+$')


def _validate_module_id(module_id: str) -> bool:
    """校验 module_id 是否合法（防止路径穿越）"""
    if not module_id or len(module_id) > 200:
        return False
    return bool(_MODULE_ID_PATTERN.match(module_id))


def _get_module_file_path(module_id: str) -> Path:
    """获取模块文件路径（校验 module_id 防止路径穿越）"""
    if not _validate_module_id(module_id):
        raise HTTPException(status_code=400, detail=f"模块ID无效: {module_id}")
    base = CUSTOM_MODULES_DIR.resolve()
    target = (CUSTOM_MODULES_DIR / f"{module_id}.json").resolve()
    try:
        target.relative_to(base)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"模块路径不安全: {module_id}")
    return target


def _load_module(module_id: str) -> Optional[CustomModule]:
    """加载单个模块"""
    file_path = _get_module_file_path(module_id)
    if not file_path.exists():
        return None
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return CustomModule(**data)
    except Exception as e:
        print(f"[CustomModules] 加载模块失败 {module_id}: {e}")
        return None


def _save_module(module: CustomModule):
    """保存模块"""
    file_path = _get_module_file_path(module.id)
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(module.model_dump(), f, ensure_ascii=False, indent=2, default=str)
    except Exception as e:
        print(f"[CustomModules] 保存模块失败 {module.id}: {e}")
        raise


def _load_all_modules() -> List[CustomModule]:
    """加载所有模块"""
    modules = []
    for file_path in CUSTOM_MODULES_DIR.glob("*.json"):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                modules.append(CustomModule(**data))
        except Exception as e:
            print(f"[CustomModules] 加载模块失败 {file_path}: {e}")
    return modules


@router.get("/", response_model=CustomModuleListResponse)
async def list_custom_modules(
    category: Optional[str] = None,
    search: Optional[str] = None
):
    """获取自定义模块列表"""
    try:
        modules = _load_all_modules()
        
        # 过滤分类
        if category:
            modules = [m for m in modules if m.category == category]
        
        # 搜索过滤
        if search:
            search_lower = search.lower()
            modules = [
                m for m in modules
                if search_lower in m.display_name.lower() or
                   search_lower in m.name.lower() or
                   search_lower in m.description.lower() or
                   any(search_lower in tag.lower() for tag in m.tags)
            ]
        
        # 按更新时间倒序排序
        modules.sort(key=lambda x: x.updated_at, reverse=True)
        
        return CustomModuleListResponse(
            modules=modules,
            total=len(modules)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取模块列表失败: {str(e)}")


@router.get("/{module_id}", response_model=CustomModule)
async def get_custom_module(module_id: str):
    """获取单个自定义模块"""
    module = _load_module(module_id)
    if not module:
        raise HTTPException(status_code=404, detail="模块不存在")
    return module


@router.post("/", response_model=CustomModule)
async def create_custom_module(module_data: CustomModuleCreate):
    """创建自定义模块"""
    try:
        print(f"[CustomModules] 收到创建模块请求: {module_data.name}")
        print(f"[CustomModules] 模块数据: display_name={module_data.display_name}, category={module_data.category}")
        print(f"[CustomModules] 参数数量: {len(module_data.parameters)}, 输出数量: {len(module_data.outputs)}")
        print(f"[CustomModules] 工作流节点数: {len(module_data.workflow.get('nodes', []))}, 边数: {len(module_data.workflow.get('edges', []))}")
        
        # 验证工作流数据
        if not module_data.workflow:
            print("[CustomModules] ❌ 工作流数据为空")
            raise HTTPException(status_code=400, detail="工作流数据不能为空")
        
        if 'nodes' not in module_data.workflow or not module_data.workflow['nodes']:
            print("[CustomModules] ❌ 工作流节点为空")
            raise HTTPException(status_code=400, detail="工作流必须包含至少一个节点")
        
        # 验证节点数据完整性
        for i, node in enumerate(module_data.workflow['nodes']):
            if not isinstance(node, dict):
                print(f"[CustomModules] ❌ 节点 {i} 不是字典类型: {type(node)}")
                raise HTTPException(status_code=400, detail=f"节点 {i} 数据格式错误")
            
            required_fields = ['id', 'type', 'position', 'data']
            missing_fields = [f for f in required_fields if f not in node]
            if missing_fields:
                print(f"[CustomModules] ❌ 节点 {i} 缺少必需字段: {missing_fields}")
                print(f"[CustomModules] 节点数据: {node}")
                raise HTTPException(status_code=400, detail=f"节点 {i} 缺少必需字段: {', '.join(missing_fields)}")
        
        # 生成模块ID（清理 name 中的非法字符，防止路径穿越）
        import uuid
        # 只保留字母、数字、下划线、连字符、汉字
        sanitized_name = re.sub(r'[^A-Za-z0-9_\-\u4e00-\u9fa5]', '_', module_data.name or '')[:50]
        if not sanitized_name:
            sanitized_name = 'module'
        module_id = f"custom_{sanitized_name}_{uuid.uuid4().hex[:8]}"
        print(f"[CustomModules] 生成模块ID: {module_id}")
        
        # 检查名称是否已存在
        existing_modules = _load_all_modules()
        if any(m.name == module_data.name for m in existing_modules):
            print(f"[CustomModules] ❌ 模块名称已存在: {module_data.name}")
            raise HTTPException(status_code=400, detail=f"模块名称 '{module_data.name}' 已存在")
        
        # 创建模块
        module = CustomModule(
            id=module_id,
            name=module_data.name,
            display_name=module_data.display_name,
            description=module_data.description,
            icon=module_data.icon,
            color=module_data.color,
            category=module_data.category,
            parameters=module_data.parameters,
            outputs=module_data.outputs,
            workflow=module_data.workflow,
            tags=module_data.tags,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        print(f"[CustomModules] 模块对象创建成功，准备保存")
        
        # 保存
        _save_module(module)
        
        print(f"[CustomModules] ✅ 模块保存成功: {module_id}")
        
        return module
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"[CustomModules] ❌ 创建模块异常: {str(e)}")
        print(f"[CustomModules] 异常详情:\n{error_detail}")
        raise HTTPException(status_code=500, detail=f"创建模块失败: {str(e)}")


@router.put("/{module_id}", response_model=CustomModule)
async def update_custom_module(module_id: str, update_data: CustomModuleUpdate):
    """更新自定义模块"""
    try:
        # 加载现有模块
        module = _load_module(module_id)
        if not module:
            raise HTTPException(status_code=404, detail="模块不存在")

        # 取得用户提交的字段
        update_dict = update_data.model_dump(exclude_unset=True)

        # 不允许通过 update 改 id
        update_dict.pop('id', None)

        # 如果改了 name，需要检查是否与其他模块冲突
        new_name = update_dict.get('name')
        if new_name is not None and new_name != module.name:
            new_name = (new_name or '').strip()
            if not new_name:
                raise HTTPException(status_code=400, detail="模块名称不能为空")
            if len(new_name) > 50:
                raise HTTPException(status_code=400, detail="模块名称过长（最多 50 字符）")
            existing_modules = _load_all_modules()
            if any(m.id != module_id and m.name == new_name for m in existing_modules):
                raise HTTPException(status_code=400, detail=f"模块名称 '{new_name}' 已存在")
            update_dict['name'] = new_name

        # 校验工作流（如果传了）
        if 'workflow' in update_dict:
            wf = update_dict['workflow']
            if not isinstance(wf, dict):
                raise HTTPException(status_code=400, detail="workflow 必须是对象")
            if 'nodes' not in wf or not wf['nodes']:
                raise HTTPException(status_code=400, detail="工作流必须包含至少一个节点")

        # 应用更新
        for key, value in update_dict.items():
            setattr(module, key, value)

        module.updated_at = datetime.now()

        # 保存
        _save_module(module)

        return module
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新模块失败: {str(e)}")


@router.delete("/{module_id}")
async def delete_custom_module(module_id: str):
    """删除自定义模块"""
    try:
        file_path = _get_module_file_path(module_id)
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="模块不存在")
        
        # 删除文件
        file_path.unlink()
        
        return {"success": True, "message": "模块已删除"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除模块失败: {str(e)}")


@router.post("/{module_id}/duplicate", response_model=CustomModule)
async def duplicate_custom_module(module_id: str, payload: dict | None = None, new_name: Optional[str] = None):
    """复制自定义模块

    支持两种参数传递方式（向后兼容）：
    - 推荐：在 JSON body 中传 {"new_name": "..."} 或 {"newName": "..."}
    - 兼容：通过 query string 传 ?new_name=...
    """
    try:
        # 加载原模块
        original = _load_module(module_id)
        if not original:
            raise HTTPException(status_code=404, detail="模块不存在")

        # 提取新名称（body 优先，query string 兜底）
        body_name: Optional[str] = None
        if isinstance(payload, dict):
            body_name = payload.get('new_name') or payload.get('newName')
        candidate = (body_name or new_name or '').strip()

        # 如果调用方没指定，自动生成不重名
        if not candidate:
            existing_names = {m.name for m in _load_all_modules()}
            base = original.name
            i = 1
            while True:
                candidate = f"{base}_copy{i}" if i > 1 else f"{base}_copy"
                if candidate not in existing_names:
                    break
                i += 1
        new_name_value = candidate
        if len(new_name_value) > 50:
            raise HTTPException(status_code=400, detail="新名称过长（最多 50 字符）")

        # 检查名称是否已存在
        existing_modules = _load_all_modules()
        if any(m.name == new_name_value for m in existing_modules):
            raise HTTPException(status_code=400, detail=f"模块名称 '{new_name_value}' 已存在")

        # 生成新ID（清洗非法字符防止路径穿越）
        import uuid
        sanitized_name = re.sub(r'[^A-Za-z0-9_\-\u4e00-\u9fa5]', '_', new_name_value)[:50]
        if not sanitized_name:
            sanitized_name = 'module'
        new_id = f"custom_{sanitized_name}_{uuid.uuid4().hex[:8]}"

        # 创建副本（保留所有字段）
        duplicate = CustomModule(
            id=new_id,
            name=new_name_value,
            display_name=f"{original.display_name} (副本)",
            description=original.description,
            icon=original.icon,
            color=original.color,
            category=original.category,
            parameters=original.parameters,
            outputs=original.outputs,
            workflow=original.workflow,
            tags=original.tags,
            author=original.author,
            version=original.version,
            usage_count=0,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )

        # 保存
        _save_module(duplicate)

        return duplicate
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"复制模块失败: {str(e)}")


@router.post("/{module_id}/increment-usage")
async def increment_module_usage(module_id: str):
    """增加模块使用次数"""
    try:
        module = _load_module(module_id)
        if not module:
            raise HTTPException(status_code=404, detail="模块不存在")
        
        module.usage_count += 1
        _save_module(module)
        
        return {"success": True, "usage_count": module.usage_count}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新使用次数失败: {str(e)}")


@router.post("/import", response_model=CustomModule)
async def import_custom_module(payload: dict):
    """导入自定义模块（从 JSON）

    payload: 一个完整的 CustomModule JSON 对象（支持 export 出来的格式）。
    - 如果 name 已存在，会自动加 _imported 后缀避免冲突。
    - id 会重新生成，避免和现有模块碰撞。
    """
    try:
        if not isinstance(payload, dict):
            raise HTTPException(status_code=400, detail="导入数据必须是 JSON 对象")

        # 必要字段检查
        for required in ('name', 'display_name', 'workflow'):
            if required not in payload:
                raise HTTPException(status_code=400, detail=f"导入数据缺少字段: {required}")

        wf = payload.get('workflow') or {}
        if not isinstance(wf, dict) or not wf.get('nodes'):
            raise HTTPException(status_code=400, detail="工作流数据无效或为空")

        # 处理 name 冲突
        name = (payload.get('name') or '').strip() or 'imported_module'
        existing_names = {m.name for m in _load_all_modules()}
        if name in existing_names:
            base = name
            i = 1
            while f"{base}_imported{i}" in existing_names:
                i += 1
            name = f"{base}_imported{i}"

        # 生成新 ID
        import uuid
        sanitized_name = re.sub(r'[^A-Za-z0-9_\-\u4e00-\u9fa5]', '_', name)[:50] or 'module'
        new_id = f"custom_{sanitized_name}_{uuid.uuid4().hex[:8]}"

        # 构建模块对象（重置统计/时间）
        module = CustomModule(
            id=new_id,
            name=name,
            display_name=payload.get('display_name') or name,
            description=payload.get('description') or '',
            icon=payload.get('icon') or '📦',
            color=payload.get('color') or '#8B5CF6',
            category=payload.get('category') or 'custom',
            parameters=payload.get('parameters') or [],
            outputs=payload.get('outputs') or [],
            workflow=wf,
            tags=payload.get('tags') or [],
            author=payload.get('author') or '',
            version=payload.get('version') or '1.0.0',
            usage_count=0,
            download_count=0,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )

        _save_module(module)
        return module
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导入模块失败: {str(e)}")
