"""高级模块执行器 - 文件操作（重命名、列表、复制、移动、删除）"""
from .base import ModuleExecutor, ExecutionContext, ModuleResult, register_executor
from pathlib import Path
import shutil


@register_executor
class RenameFileExecutor(ModuleExecutor):
    """文件重命名模块执行器"""

    @property
    def module_type(self) -> str:
        return "rename_file"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        source_path = context.resolve_value(config.get("sourcePath", ""))
        new_name = context.resolve_value(config.get("newName", ""))
        variable_name = config.get("variableName", "")

        if not source_path or not new_name:
            return ModuleResult(success=False, error="源文件路径和新文件名不能为空")

        try:
            source = Path(source_path)
            if not source.exists():
                return ModuleResult(success=False, error=f"源文件不存在: {source_path}")
            new_path = source.parent / new_name
            source.rename(new_path)
            if variable_name:
                context.set_variable(variable_name, str(new_path))
            return ModuleResult(success=True, message=f"文件已重命名: {source.name} → {new_name}", data=str(new_path))
        except PermissionError:
            return ModuleResult(success=False, error="没有权限重命名该文件")
        except Exception as e:
            return ModuleResult(success=False, error=f"文件重命名失败: {str(e)}")


@register_executor
class ListFilesExecutor(ModuleExecutor):
    """获取文件列表模块执行器"""

    @property
    def module_type(self) -> str:
        return "list_files"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        import fnmatch
        
        folder_path = context.resolve_value(config.get("folderPath", ""))
        list_type = context.resolve_value(config.get("listType", "files"))
        include_ext_raw = config.get("includeExtension", True)
        if isinstance(include_ext_raw, str):
            include_ext_raw = context.resolve_value(include_ext_raw)
        include_ext = include_ext_raw in [True, 'true', 'True', '1', 1]
        
        # 新增：递归处理子文件夹选项
        recursive_raw = config.get("recursive", False)
        if isinstance(recursive_raw, str):
            recursive_raw = context.resolve_value(recursive_raw)
        recursive = recursive_raw in [True, 'true', 'True', '1', 1]
        
        filter_pattern = context.resolve_value(config.get("filterPattern", ""))
        # 字段与前端面板对齐: variableName，兼容旧字段名 resultVariable
        variable_name = config.get("variableName") or config.get("resultVariable", "file_list")

        if not folder_path:
            return ModuleResult(success=False, error="文件夹路径不能为空")

        try:
            folder = Path(folder_path)
            if not folder.exists() or not folder.is_dir():
                return ModuleResult(success=False, error=f"文件夹不存在或不是目录: {folder_path}")

            result_list = []
            patterns = [p.strip() for p in filter_pattern.split(';') if p.strip()] if filter_pattern else []
            
            def process_folder(current_folder: Path, base_folder: Path):
                """递归处理文件夹"""
                try:
                    items = list(current_folder.iterdir())
                    
                    for item in items:
                        if item.is_dir():
                            # 处理文件夹
                            if list_type in ["folders", "all"]:
                                # 添加文件夹到结果
                                if recursive:
                                    # 递归模式下使用相对路径
                                    rel_path = item.relative_to(base_folder)
                                    result_list.append(str(rel_path))
                                else:
                                    # 非递归模式下只使用文件夹名
                                    result_list.append(item.name)
                            
                            # 如果开启递归，继续处理子文件夹
                            if recursive:
                                process_folder(item, base_folder)
                        
                        elif item.is_file():
                            # 处理文件
                            if list_type == "folders":
                                # 只列出文件夹时跳过文件
                                continue
                            
                            # 获取文件名
                            if recursive:
                                # 递归模式下使用相对路径
                                rel_path = item.relative_to(base_folder)
                                name = str(rel_path)
                            else:
                                name = item.name
                            
                            # 应用过滤模式
                            if patterns:
                                file_name = item.name
                                if not any(fnmatch.fnmatch(file_name.lower(), p.lower()) for p in patterns):
                                    continue
                            
                            # 处理扩展名
                            if not include_ext and not recursive:
                                name = item.stem
                            elif not include_ext and recursive:
                                # 递归模式下，去掉扩展名但保留路径
                                name = str(Path(name).with_suffix(''))
                            
                            result_list.append(name)
                except PermissionError:
                    # 忽略没有权限访问的文件夹
                    pass
                except Exception:
                    # 忽略其他错误，继续处理
                    pass
            
            process_folder(folder, folder)
            
            result_list.sort()
            if variable_name:
                context.set_variable(variable_name, result_list)
            return ModuleResult(success=True, message=f"获取到 {len(result_list)} 个项目", data=result_list)
        except Exception as e:
            return ModuleResult(success=False, error=f"获取文件列表失败: {str(e)}")


@register_executor
class CopyFileExecutor(ModuleExecutor):
    """复制文件模块执行器"""

    @property
    def module_type(self) -> str:
        return "copy_file"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        source_path = context.resolve_value(config.get("sourcePath", ""))
        target_path = context.resolve_value(config.get("targetPath", ""))
        overwrite_raw = config.get("overwrite", True)
        if isinstance(overwrite_raw, str):
            overwrite_raw = context.resolve_value(overwrite_raw)
        overwrite = overwrite_raw in [True, 'true', 'True', '1', 1]
        variable_name = config.get("resultVariable", "copied_path")

        if not source_path or not target_path:
            return ModuleResult(success=False, error="源文件路径和目标路径不能为空")

        try:
            source = Path(source_path)
            target = Path(target_path)
            if not source.exists():
                return ModuleResult(success=False, error=f"源文件不存在: {source_path}")
            
            if target.is_dir() or str(target_path).endswith(('/', '\\')):
                target.mkdir(parents=True, exist_ok=True)
                target = target / source.name
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
            
            if target.exists() and not overwrite:
                return ModuleResult(success=True, message=f"目标文件已存在，已跳过: {target}", data=str(target))
            
            shutil.copy2(source, target)
            if variable_name:
                context.set_variable(variable_name, str(target))
            return ModuleResult(success=True, message=f"文件已复制: {source.name} → {target}", data=str(target))
        except Exception as e:
            return ModuleResult(success=False, error=f"复制文件失败: {str(e)}")


@register_executor
class MoveFileExecutor(ModuleExecutor):
    """移动文件模块执行器"""

    @property
    def module_type(self) -> str:
        return "move_file"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        source_path = context.resolve_value(config.get("sourcePath", ""))
        target_path = context.resolve_value(config.get("targetPath", ""))
        overwrite_raw = config.get("overwrite", True)
        if isinstance(overwrite_raw, str):
            overwrite_raw = context.resolve_value(overwrite_raw)
        overwrite = overwrite_raw in [True, 'true', 'True', '1', 1]
        variable_name = config.get("resultVariable", "moved_path")

        if not source_path or not target_path:
            return ModuleResult(success=False, error="源文件路径和目标路径不能为空")

        try:
            source = Path(source_path)
            target = Path(target_path)
            if not source.exists():
                return ModuleResult(success=False, error=f"源文件不存在: {source_path}")
            
            if target.is_dir() or str(target_path).endswith(('/', '\\')):
                target.mkdir(parents=True, exist_ok=True)
                target = target / source.name
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
            
            if target.exists():
                if not overwrite:
                    return ModuleResult(success=True, message=f"目标文件已存在，已跳过: {target}", data=str(target))
                target.unlink()
            
            shutil.move(str(source), str(target))
            if variable_name:
                context.set_variable(variable_name, str(target))
            return ModuleResult(success=True, message=f"文件已移动: {source.name} → {target}", data=str(target))
        except Exception as e:
            return ModuleResult(success=False, error=f"移动文件失败: {str(e)}")


@register_executor
class DeleteFileExecutor(ModuleExecutor):
    """删除文件模块执行器"""

    @property
    def module_type(self) -> str:
        return "delete_file"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        file_path = context.resolve_value(config.get("filePath", ""))
        delete_type = context.resolve_value(config.get("deleteType", "file"))

        if not file_path:
            return ModuleResult(success=False, error="文件路径不能为空")

        try:
            path = Path(file_path)
            if not path.exists():
                return ModuleResult(success=True, message=f"文件/文件夹不存在，无需删除: {file_path}")
            
            if delete_type == "folder":
                if path.is_dir():
                    shutil.rmtree(path)
                    return ModuleResult(success=True, message=f"文件夹已删除: {file_path}")
                return ModuleResult(success=False, error=f"路径不是文件夹: {file_path}")
            else:
                if path.is_file():
                    path.unlink()
                    return ModuleResult(success=True, message=f"文件已删除: {file_path}")
                return ModuleResult(success=False, error=f"路径不是文件: {file_path}")
        except Exception as e:
            return ModuleResult(success=False, error=f"删除失败: {str(e)}")
