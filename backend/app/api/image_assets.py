"""图像资源API - 处理图像文件上传和管理"""
import os
import uuid
import shutil
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/image-assets", tags=["image-assets"])

# 存储上传的图像文件
IMAGE_UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'uploads', 'images')
os.makedirs(IMAGE_UPLOAD_DIR, exist_ok=True)

# 内存中存储图像元数据
image_assets: dict[str, dict] = {}


class CreateFolderRequest(BaseModel):
    name: str
    parentPath: Optional[str] = None


class RenameFolderRequest(BaseModel):
    oldPath: str
    newName: str


class MoveAssetRequest(BaseModel):
    assetId: str
    targetFolder: Optional[str] = None


class DeleteFolderRequest(BaseModel):
    folderPath: str


def _get_full_path(relative_path: Optional[str] = None) -> str:
    """获取完整路径，并强制限制在 IMAGE_UPLOAD_DIR 之内（防止 ../ 或绝对路径穿越）。"""
    base = os.path.realpath(IMAGE_UPLOAD_DIR)
    if not relative_path:
        return base
    rp = str(relative_path).replace('/', os.sep).replace('\\', os.sep).lstrip(os.sep)
    full = os.path.realpath(os.path.join(base, rp))
    if full == base or full.startswith(base + os.sep):
        return full
    raise HTTPException(status_code=400, detail="非法路径")


def _get_relative_path(full_path: str) -> str:
    """获取相对路径"""
    rel = os.path.relpath(full_path, IMAGE_UPLOAD_DIR)
    if rel == '.':
        return ''
    return rel.replace(os.sep, '/')


def _load_existing_images():
    """启动时扫描images文件夹,加载已存在的图像文件"""
    if not os.path.exists(IMAGE_UPLOAD_DIR):
        return
    
    # 支持的图像格式
    image_extensions = ('.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg', '.ico')
    
    for root, dirs, files in os.walk(IMAGE_UPLOAD_DIR):
        for filename in files:
            if not filename.lower().endswith(image_extensions):
                continue
            
            file_path = os.path.join(root, filename)
            
            try:
                # 生成ID
                name_without_ext = os.path.splitext(filename)[0]
                ext = os.path.splitext(filename)[1]
                
                # 如果文件名是UUID格式,使用它作为ID;否则生成新的UUID
                if len(name_without_ext) == 36 and name_without_ext.count('-') == 4:
                    file_id = name_without_ext
                else:
                    file_id = str(uuid.uuid4())
                
                # 获取文件信息
                file_stat = os.stat(file_path)
                
                # 获取相对于IMAGE_UPLOAD_DIR的文件夹路径
                folder_path = _get_relative_path(root)
                
                # 存储元数据
                asset = {
                    'id': file_id,
                    'name': filename,
                    'originalName': filename,
                    'size': file_stat.st_size,
                    'uploadedAt': datetime.fromtimestamp(file_stat.st_mtime).isoformat(),
                    'path': file_path,
                    'folder': folder_path,
                    'extension': ext.lower(),
                }
                image_assets[file_id] = asset
                print(f"[ImageAssets] 已加载图像文件: {filename} (文件夹: {folder_path or '根目录'})")
            except Exception as e:
                print(f"[ImageAssets] 加载图像文件失败 {filename}: {str(e)}")
                continue


# 启动时加载已存在的图像
_load_existing_images()


@router.post("/upload")
async def upload_image(file: UploadFile = File(...), folder: Optional[str] = None):
    """上传图像文件"""
    # 检查文件类型
    if not file.filename:
        raise HTTPException(status_code=400, detail="文件名不能为空")
    
    ext = os.path.splitext(file.filename)[1].lower()
    allowed_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg', '.ico'}
    
    if ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"不支持的图像格式,仅支持: {', '.join(allowed_extensions)}")
    
    # 生成唯一ID和文件名
    file_id = str(uuid.uuid4())
    saved_name = f"{file_id}{ext}"
    
    # 确定保存路径
    target_dir = _get_full_path(folder)
    os.makedirs(target_dir, exist_ok=True)
    file_path = os.path.join(target_dir, saved_name)
    
    # 保存文件
    try:
        content = await file.read()
        with open(file_path, 'wb') as f:
            f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"保存文件失败: {str(e)}")
    
    # 存储元数据
    asset = {
        'id': file_id,
        'name': saved_name,
        'originalName': file.filename,
        'size': len(content),
        'uploadedAt': datetime.now().isoformat(),
        'path': file_path,
        'folder': folder or '',
        'extension': ext,
    }
    image_assets[file_id] = asset
    
    return {
        'asset': {
            'id': asset['id'],
            'name': asset['name'],
            'originalName': asset['originalName'],
            'size': asset['size'],
            'uploadedAt': asset['uploadedAt'],
            'folder': asset['folder'],
            'extension': asset['extension'],
        }
    }


@router.post("/upload-batch")
async def upload_images_batch(files: List[UploadFile] = File(...), folder: Optional[str] = None):
    """批量上传图像文件"""
    results = []
    errors = []
    
    for file in files:
        try:
            result = await upload_image(file, folder)
            results.append(result)
        except Exception as e:
            errors.append({'filename': file.filename, 'error': str(e)})
    
    return {
        'success': results,
        'errors': errors,
        'total': len(files),
        'successCount': len(results),
        'errorCount': len(errors),
    }


@router.get("")
async def list_images(folder: Optional[str] = None):
    """获取图像资源列表"""
    # 如果指定了文件夹,只返回该文件夹下的图像
    if folder is not None:
        filtered = [
            {
                'id': a['id'],
                'name': a['name'],
                'originalName': a['originalName'],
                'size': a['size'],
                'uploadedAt': a['uploadedAt'],
                'folder': a['folder'],
                'extension': a['extension'],
                'path': a.get('path', ''),  # 添加真实路径
            }
            for a in image_assets.values()
            if a['folder'] == folder
        ]
    else:
        # 返回所有图像
        filtered = [
            {
                'id': a['id'],
                'name': a['name'],
                'originalName': a['originalName'],
                'size': a['size'],
                'uploadedAt': a['uploadedAt'],
                'folder': a['folder'],
                'extension': a['extension'],
                'path': a.get('path', ''),  # 添加真实路径
            }
            for a in image_assets.values()
        ]
    
    return filtered


@router.get("/folders")
async def list_folders():
    """获取所有文件夹列表"""
    folders = set()
    
    # 从已加载的图像中提取文件夹
    for asset in image_assets.values():
        if asset['folder']:
            folders.add(asset['folder'])
    
    # 扫描文件系统中的文件夹
    for root, dirs, files in os.walk(IMAGE_UPLOAD_DIR):
        for dir_name in dirs:
            folder_path = os.path.join(root, dir_name)
            rel_path = _get_relative_path(folder_path)
            folders.add(rel_path)
    
    return sorted(list(folders))


@router.post("/folders")
async def create_folder(request: CreateFolderRequest):
    """创建文件夹"""
    # 验证文件夹名称
    if not request.name or '/' in request.name or '\\' in request.name:
        raise HTTPException(status_code=400, detail="文件夹名称无效")
    
    # 构建完整路径
    if request.parentPath:
        folder_path = os.path.join(request.parentPath, request.name)
    else:
        folder_path = request.name
    
    full_path = _get_full_path(folder_path)
    
    # 检查是否已存在
    if os.path.exists(full_path):
        raise HTTPException(status_code=400, detail="文件夹已存在")
    
    # 创建文件夹
    try:
        os.makedirs(full_path, exist_ok=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建文件夹失败: {str(e)}")
    
    return {'success': True, 'path': folder_path}


@router.put("/folders/rename")
async def rename_folder(request: RenameFolderRequest):
    """重命名文件夹"""
    if not request.newName or '/' in request.newName or '\\' in request.newName or request.newName in ('.', '..'):
        raise HTTPException(status_code=400, detail="文件夹名称无效")
    old_full_path = _get_full_path(request.oldPath)
    if old_full_path == os.path.realpath(IMAGE_UPLOAD_DIR):
        raise HTTPException(status_code=400, detail="不能重命名根目录")

    if not os.path.exists(old_full_path):
        raise HTTPException(status_code=404, detail="文件夹不存在")
    
    # 构建新路径
    parent_path = os.path.dirname(old_full_path)
    new_full_path = os.path.join(parent_path, request.newName)
    
    if os.path.exists(new_full_path):
        raise HTTPException(status_code=400, detail="目标文件夹已存在")
    
    try:
        # 跨盘符也要支持
        import shutil
        shutil.move(old_full_path, new_full_path)
        
        # 更新所有该文件夹下的图像元数据（精确前缀匹配）
        new_rel_path = _get_relative_path(new_full_path)
        old_rel = request.oldPath.rstrip('/').rstrip('\\')
        old_rel_with_sep = old_rel + '/'
        for asset in image_assets.values():
            af = asset['folder']
            if af == old_rel:
                asset['folder'] = new_rel_path
            elif af.startswith(old_rel_with_sep):
                asset['folder'] = new_rel_path + af[len(old_rel):]
            
            ap = asset['path']
            if ap == old_full_path or ap.startswith(old_full_path + os.sep) or ap.startswith(old_full_path + '/'):
                asset['path'] = new_full_path + ap[len(old_full_path):]
        
        return {'success': True, 'newPath': new_rel_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"重命名失败: {str(e)}")


@router.delete("/folders")
async def delete_folder(request: DeleteFolderRequest):
    """删除文件夹及其所有内容"""
    if not (request.folderPath or '').strip():
        raise HTTPException(status_code=400, detail="不能删除根目录")
    full_path = _get_full_path(request.folderPath)
    if full_path == os.path.realpath(IMAGE_UPLOAD_DIR):
        raise HTTPException(status_code=400, detail="不能删除根目录")

    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="文件夹不存在")
    
    try:
        # 删除文件夹
        shutil.rmtree(full_path)
        
        # 删除该文件夹下的所有图像元数据（精确前缀匹配，避免误删相邻同前缀文件夹）
        fp = request.folderPath.rstrip('/').rstrip('\\')
        to_delete = [
            asset_id for asset_id, asset in image_assets.items()
            if asset['folder'] == fp or asset['folder'].startswith(fp + '/')
        ]
        for asset_id in to_delete:
            del image_assets[asset_id]
        
        return {'success': True, 'deletedCount': len(to_delete)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除失败: {str(e)}")


@router.put("/move")
async def move_asset(request: MoveAssetRequest):
    """移动图像到指定文件夹"""
    if request.assetId not in image_assets:
        raise HTTPException(status_code=404, detail="图像不存在")
    
    asset = image_assets[request.assetId]
    old_path = asset['path']
    
    # 构建新路径
    target_dir = _get_full_path(request.targetFolder)
    os.makedirs(target_dir, exist_ok=True)
    new_path = os.path.join(target_dir, asset['name'])
    
    try:
        # 移动文件
        shutil.move(old_path, new_path)
        
        # 更新元数据
        asset['path'] = new_path
        asset['folder'] = request.targetFolder or ''
        
        return {'success': True, 'newFolder': asset['folder']}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"移动失败: {str(e)}")


@router.delete("/{image_id}")
async def delete_image(image_id: str):
    """删除图像"""
    if image_id not in image_assets:
        raise HTTPException(status_code=404, detail="图像不存在")
    
    asset = image_assets[image_id]
    
    # 删除文件
    try:
        if os.path.exists(asset['path']):
            os.remove(asset['path'])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除文件失败: {str(e)}")
    
    # 删除元数据
    del image_assets[image_id]
    
    return {'success': True}


@router.put("/{image_id}/rename")
async def rename_image(image_id: str, newName: str):
    """重命名图像文件"""
    if image_id not in image_assets:
        raise HTTPException(status_code=404, detail="图像不存在")
    
    asset = image_assets[image_id]
    old_path = asset['path']
    
    # 验证新文件名
    if not newName or '/' in newName or '\\' in newName:
        raise HTTPException(status_code=400, detail="文件名无效")
    
    # 构建新路径
    folder_path = os.path.dirname(old_path)
    new_path = os.path.join(folder_path, newName)
    
    # 检查是否已存在
    if os.path.exists(new_path) and new_path != old_path:
        raise HTTPException(status_code=400, detail="文件名已存在")
    
    try:
        # 跨盘符也要支持
        import shutil
        shutil.move(old_path, new_path)
        
        # 更新元数据
        asset['path'] = new_path
        asset['name'] = newName
        asset['originalName'] = newName
        
        return {'success': True, 'asset': {
            'id': asset['id'],
            'name': asset['name'],
            'originalName': asset['originalName'],
            'size': asset['size'],
            'uploadedAt': asset['uploadedAt'],
            'folder': asset['folder'],
            'extension': asset['extension'],
        }}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"重命名失败: {str(e)}")


@router.get("/{image_id}/path")
async def get_image_path(image_id: str):
    """获取图像的绝对路径"""
    if image_id not in image_assets:
        raise HTTPException(status_code=404, detail="图像不存在")
    
    return {'path': image_assets[image_id]['path']}


@router.get("/{image_id}/file")
async def get_image_file(image_id: str):
    """获取完整图像文件"""
    from fastapi.responses import FileResponse
    
    if image_id not in image_assets:
        raise HTTPException(status_code=404, detail="图像不存在")
    
    asset = image_assets[image_id]
    file_path = asset['path']
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="图像文件不存在")
    
    return FileResponse(
        file_path,
        media_type=f"image/{asset['extension'].lstrip('.')}",
        headers={"Cache-Control": "public, max-age=3600"}
    )


@router.get("/{image_id}/thumbnail")
async def get_image_thumbnail(image_id: str):
    """获取图像缩略图"""
    from fastapi.responses import FileResponse
    
    if image_id not in image_assets:
        raise HTTPException(status_code=404, detail="图像不存在")
    
    asset = image_assets[image_id]
    file_path = asset['path']
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="图像文件不存在")
    
    # 直接返回原图（前端会通过CSS控制大小）
    # 如果需要真正的缩略图，可以使用PIL生成
    return FileResponse(
        file_path,
        media_type=f"image/{asset['extension'].lstrip('.')}",
        headers={"Cache-Control": "public, max-age=3600"}
    )


def get_image_path_by_id(image_id: str) -> Optional[str]:
    """供执行器使用的函数:获取图像路径"""
    if image_id in image_assets:
        return image_assets[image_id]['path']
    return None
