"""关系型数据库INSERT/UPDATE/DELETE操作模块执行器"""
from typing import Any, Optional, Dict
from app.executors.base import ModuleExecutor, ExecutionContext, ModuleResult, register_executor


# Oracle数据库INSERT/UPDATE/DELETE执行器
@register_executor
class OracleInsertExecutor(ModuleExecutor):
    """Oracle数据库插入执行器"""
    
    @property
    def module_type(self) -> str:
        return "oracle_insert"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """执行Oracle插入操作"""
        try:
            connection_name = config.get('connectionName', 'oracle_conn')
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
            placeholders = ', '.join([f':{i+1}' for i in range(len(data))])
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
            print(f"[OracleInsertExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"Oracle插入失败: {str(e)}",
                error=str(e)
            )


@register_executor
class OracleUpdateExecutor(ModuleExecutor):
    """Oracle数据库更新执行器"""
    
    @property
    def module_type(self) -> str:
        return "oracle_update"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """执行Oracle更新操作"""
        try:
            connection_name = config.get('connectionName', 'oracle_conn')
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
            set_clause = ', '.join([f"{k} = :{i+1}" for i, k in enumerate(data.keys())])
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
            print(f"[OracleUpdateExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"Oracle更新失败: {str(e)}",
                error=str(e)
            )


@register_executor
class OracleDeleteExecutor(ModuleExecutor):
    """Oracle数据库删除执行器"""
    
    @property
    def module_type(self) -> str:
        return "oracle_delete"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """执行Oracle删除操作"""
        try:
            connection_name = config.get('connectionName', 'oracle_conn')
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
            print(f"[OracleDeleteExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"Oracle删除失败: {str(e)}",
                error=str(e)
            )



# PostgreSQL数据库INSERT/UPDATE/DELETE执行器
@register_executor
class PostgreSQLInsertExecutor(ModuleExecutor):
    """PostgreSQL数据库插入执行器"""
    
    @property
    def module_type(self) -> str:
        return "postgresql_insert"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """执行PostgreSQL插入操作"""
        try:
            connection_name = config.get('connectionName', 'postgresql_conn')
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
            placeholders = ', '.join(['%s'] * len(data))
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
            import traceback
            error_detail = traceback.format_exc()
            print(f"[PostgreSQLInsertExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"PostgreSQL插入失败: {str(e)}",
                error=str(e)
            )



@register_executor
class PostgreSQLUpdateExecutor(ModuleExecutor):
    """PostgreSQL数据库更新执行器"""
    
    @property
    def module_type(self) -> str:
        return "postgresql_update"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """执行PostgreSQL更新操作"""
        try:
            connection_name = config.get('connectionName', 'postgresql_conn')
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
            set_clause = ', '.join([f"{k} = %s" for k in data.keys()])
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
            import traceback
            error_detail = traceback.format_exc()
            print(f"[PostgreSQLUpdateExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"PostgreSQL更新失败: {str(e)}",
                error=str(e)
            )


@register_executor
class PostgreSQLDeleteExecutor(ModuleExecutor):
    """PostgreSQL数据库删除执行器"""
    
    @property
    def module_type(self) -> str:
        return "postgresql_delete"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """执行PostgreSQL删除操作"""
        try:
            connection_name = config.get('connectionName', 'postgresql_conn')
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
            import traceback
            error_detail = traceback.format_exc()
            print(f"[PostgreSQLDeleteExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"PostgreSQL删除失败: {str(e)}",
                error=str(e)
            )
