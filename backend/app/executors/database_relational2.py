"""关系型数据库INSERT/UPDATE/DELETE操作模块执行器 - 第2部分"""
from typing import Any, Optional, Dict
from app.executors.base import ModuleExecutor, ExecutionContext, ModuleResult, register_executor


# SQL Server数据库INSERT/UPDATE/DELETE执行器
@register_executor
class SQLServerInsertExecutor(ModuleExecutor):
    """SQL Server数据库插入执行器"""
    
    @property
    def module_type(self) -> str:
        return "sqlserver_insert"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """执行SQL Server插入操作"""
        try:
            connection_name = config.get('connectionName', 'sqlserver_conn')
            table = context.resolve_value(config.get('tableName', ''))
            data_str = context.resolve_value(config.get('data', '{}'))
            auto_commit = config.get('autoCommit', True)
            
            if not table:
                return ModuleResult(
                    success=False,
                    message="表名不能为空",
                    error="表名为空"
                )
            
            # 获取连接
            if not hasattr(context, '_db_connections') or connection_name not in context._db_connections:
                return ModuleResult(
                    success=False,
                    message=f"数据库连接 {connection_name} 不存在",
                    error="连接不存在"
                )
            
            conn_info = context._db_connections[connection_name]
            connection = conn_info['connection']
            
            # 解析数据
            import json
            data = json.loads(data_str) if data_str else {}
            
            if not data:
                return ModuleResult(
                    success=False,
                    message="插入数据不能为空",
                    error="数据为空"
                )
            
            # 构建INSERT语句
            columns = ', '.join(data.keys())
            placeholders = ', '.join(['?'] * len(data))
            sql = f"INSERT INTO {table} ({columns}) VALUES ({placeholders})"
            
            # 执行插入
            cursor = connection.cursor()
            cursor.execute(sql, list(data.values()))
            affected_rows = cursor.rowcount
            cursor.close()
            
            # 提交事务
            if auto_commit:
                connection.commit()
            
            return ModuleResult(
                success=True,
                message=f"插入成功，影响 {affected_rows} 行",
                data={'affected_rows': affected_rows}
            )
            
        except Exception as e:
            try: cursor.close()
            except Exception: pass
            import traceback
            error_detail = traceback.format_exc()
            print(f"[SQLServerInsertExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"SQL Server插入失败: {str(e)}",
                error=str(e)
            )


@register_executor
class SQLServerUpdateExecutor(ModuleExecutor):
    """SQL Server数据库更新执行器"""
    
    @property
    def module_type(self) -> str:
        return "sqlserver_update"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """执行SQL Server更新操作"""
        try:
            connection_name = config.get('connectionName', 'sqlserver_conn')
            table = context.resolve_value(config.get('tableName', ''))
            data_str = context.resolve_value(config.get('data', '{}'))
            where = context.resolve_value(config.get('where', ''))
            auto_commit = config.get('autoCommit', True)
            
            if not table:
                return ModuleResult(
                    success=False,
                    message="表名不能为空",
                    error="表名为空"
                )
            
            # 获取连接
            if not hasattr(context, '_db_connections') or connection_name not in context._db_connections:
                return ModuleResult(
                    success=False,
                    message=f"数据库连接 {connection_name} 不存在",
                    error="连接不存在"
                )
            
            conn_info = context._db_connections[connection_name]
            connection = conn_info['connection']
            
            # 解析数据
            import json
            data = json.loads(data_str) if data_str else {}
            
            if not data:
                return ModuleResult(
                    success=False,
                    message="更新数据不能为空",
                    error="数据为空"
                )
            
            # 构建UPDATE语句
            set_clause = ', '.join([f"{k} = ?" for k in data.keys()])
            sql = f"UPDATE {table} SET {set_clause}"
            if where:
                sql += f" WHERE {where}"
            
            # 执行更新
            cursor = connection.cursor()
            cursor.execute(sql, list(data.values()))
            affected_rows = cursor.rowcount
            cursor.close()
            
            # 提交事务
            if auto_commit:
                connection.commit()
            
            return ModuleResult(
                success=True,
                message=f"更新成功，影响 {affected_rows} 行",
                data={'affected_rows': affected_rows}
            )
            
        except Exception as e:
            try: cursor.close()
            except Exception: pass
            import traceback
            error_detail = traceback.format_exc()
            print(f"[SQLServerUpdateExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"SQL Server更新失败: {str(e)}",
                error=str(e)
            )


@register_executor
class SQLServerDeleteExecutor(ModuleExecutor):
    """SQL Server数据库删除执行器"""
    
    @property
    def module_type(self) -> str:
        return "sqlserver_delete"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """执行SQL Server删除操作"""
        try:
            connection_name = config.get('connectionName', 'sqlserver_conn')
            table = context.resolve_value(config.get('tableName', ''))
            where = context.resolve_value(config.get('where', ''))
            auto_commit = config.get('autoCommit', True)
            
            if not table:
                return ModuleResult(
                    success=False,
                    message="表名不能为空",
                    error="表名为空"
                )
            
            # 获取连接
            if not hasattr(context, '_db_connections') or connection_name not in context._db_connections:
                return ModuleResult(
                    success=False,
                    message=f"数据库连接 {connection_name} 不存在",
                    error="连接不存在"
                )
            
            conn_info = context._db_connections[connection_name]
            connection = conn_info['connection']
            
            # 构建DELETE语句
            sql = f"DELETE FROM {table}"
            if where:
                sql += f" WHERE {where}"
            
            # 执行删除
            cursor = connection.cursor()
            cursor.execute(sql)
            affected_rows = cursor.rowcount
            cursor.close()
            
            # 提交事务
            if auto_commit:
                connection.commit()
            
            return ModuleResult(
                success=True,
                message=f"删除成功，影响 {affected_rows} 行",
                data={'affected_rows': affected_rows}
            )
            
        except Exception as e:
            try: cursor.close()
            except Exception: pass
            import traceback
            error_detail = traceback.format_exc()
            print(f"[SQLServerDeleteExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"SQL Server删除失败: {str(e)}",
                error=str(e)
            )



# SQLite数据库INSERT/UPDATE/DELETE执行器
@register_executor
class SQLiteInsertExecutor(ModuleExecutor):
    """SQLite数据库插入执行器"""
    
    @property
    def module_type(self) -> str:
        return "sqlite_insert"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """执行SQLite插入操作"""
        try:
            connection_name = config.get('connectionName', 'sqlite_conn')
            table = context.resolve_value(config.get('tableName', ''))
            data_str = context.resolve_value(config.get('data', '{}'))
            auto_commit = config.get('autoCommit', True)
            
            if not table:
                return ModuleResult(
                    success=False,
                    message="表名不能为空",
                    error="表名为空"
                )
            
            # 获取连接
            if not hasattr(context, '_db_connections') or connection_name not in context._db_connections:
                return ModuleResult(
                    success=False,
                    message=f"数据库连接 {connection_name} 不存在",
                    error="连接不存在"
                )
            
            conn_info = context._db_connections[connection_name]
            connection = conn_info['connection']
            
            # 解析数据
            import json
            data = json.loads(data_str) if data_str else {}
            
            if not data:
                return ModuleResult(
                    success=False,
                    message="插入数据不能为空",
                    error="数据为空"
                )
            
            # 构建INSERT语句
            columns = ', '.join(data.keys())
            placeholders = ', '.join(['?'] * len(data))
            sql = f"INSERT INTO {table} ({columns}) VALUES ({placeholders})"
            
            # 执行插入
            cursor = connection.cursor()
            cursor.execute(sql, list(data.values()))
            affected_rows = cursor.rowcount
            cursor.close()
            
            # 提交事务
            if auto_commit:
                connection.commit()
            
            return ModuleResult(
                success=True,
                message=f"插入成功，影响 {affected_rows} 行",
                data={'affected_rows': affected_rows}
            )
            
        except Exception as e:
            try: cursor.close()
            except Exception: pass
            import traceback
            error_detail = traceback.format_exc()
            print(f"[SQLiteInsertExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"SQLite插入失败: {str(e)}",
                error=str(e)
            )


@register_executor
class SQLiteUpdateExecutor(ModuleExecutor):
    """SQLite数据库更新执行器"""
    
    @property
    def module_type(self) -> str:
        return "sqlite_update"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """执行SQLite更新操作"""
        try:
            connection_name = config.get('connectionName', 'sqlite_conn')
            table = context.resolve_value(config.get('tableName', ''))
            data_str = context.resolve_value(config.get('data', '{}'))
            where = context.resolve_value(config.get('where', ''))
            auto_commit = config.get('autoCommit', True)
            
            if not table:
                return ModuleResult(
                    success=False,
                    message="表名不能为空",
                    error="表名为空"
                )
            
            # 获取连接
            if not hasattr(context, '_db_connections') or connection_name not in context._db_connections:
                return ModuleResult(
                    success=False,
                    message=f"数据库连接 {connection_name} 不存在",
                    error="连接不存在"
                )
            
            conn_info = context._db_connections[connection_name]
            connection = conn_info['connection']
            
            # 解析数据
            import json
            data = json.loads(data_str) if data_str else {}
            
            if not data:
                return ModuleResult(
                    success=False,
                    message="更新数据不能为空",
                    error="数据为空"
                )
            
            # 构建UPDATE语句
            set_clause = ', '.join([f"{k} = ?" for k in data.keys()])
            sql = f"UPDATE {table} SET {set_clause}"
            if where:
                sql += f" WHERE {where}"
            
            # 执行更新
            cursor = connection.cursor()
            cursor.execute(sql, list(data.values()))
            affected_rows = cursor.rowcount
            cursor.close()
            
            # 提交事务
            if auto_commit:
                connection.commit()
            
            return ModuleResult(
                success=True,
                message=f"更新成功，影响 {affected_rows} 行",
                data={'affected_rows': affected_rows}
            )
            
        except Exception as e:
            try: cursor.close()
            except Exception: pass
            import traceback
            error_detail = traceback.format_exc()
            print(f"[SQLiteUpdateExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"SQLite更新失败: {str(e)}",
                error=str(e)
            )


@register_executor
class SQLiteDeleteExecutor(ModuleExecutor):
    """SQLite数据库删除执行器"""
    
    @property
    def module_type(self) -> str:
        return "sqlite_delete"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """执行SQLite删除操作"""
        try:
            connection_name = config.get('connectionName', 'sqlite_conn')
            table = context.resolve_value(config.get('tableName', ''))
            where = context.resolve_value(config.get('where', ''))
            auto_commit = config.get('autoCommit', True)
            
            if not table:
                return ModuleResult(
                    success=False,
                    message="表名不能为空",
                    error="表名为空"
                )
            
            # 获取连接
            if not hasattr(context, '_db_connections') or connection_name not in context._db_connections:
                return ModuleResult(
                    success=False,
                    message=f"数据库连接 {connection_name} 不存在",
                    error="连接不存在"
                )
            
            conn_info = context._db_connections[connection_name]
            connection = conn_info['connection']
            
            # 构建DELETE语句
            sql = f"DELETE FROM {table}"
            if where:
                sql += f" WHERE {where}"
            
            # 执行删除
            cursor = connection.cursor()
            cursor.execute(sql)
            affected_rows = cursor.rowcount
            cursor.close()
            
            # 提交事务
            if auto_commit:
                connection.commit()
            
            return ModuleResult(
                success=True,
                message=f"删除成功，影响 {affected_rows} 行",
                data={'affected_rows': affected_rows}
            )
            
        except Exception as e:
            try: cursor.close()
            except Exception: pass
            import traceback
            error_detail = traceback.format_exc()
            print(f"[SQLiteDeleteExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"SQLite删除失败: {str(e)}",
                error=str(e)
            )
