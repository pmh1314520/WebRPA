"""高级数据库操作模块执行器 - 支持多种数据库"""
import json
from typing import Any, Optional, Dict, List
from app.executors.base import ModuleExecutor, ExecutionContext, ModuleResult, register_executor


# Oracle数据库执行器
@register_executor
class OracleConnectExecutor(ModuleExecutor):
    """Oracle数据库连接执行器"""
    
    @property
    def module_type(self) -> str:
        return "oracle_connect"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """连接Oracle数据库"""
        try:
            import oracledb
            
            host = context.resolve_value(config.get('host', 'localhost'))
            port = int(context.resolve_value(config.get('port', 1521)))
            service_name = context.resolve_value(config.get('serviceName', ''))
            username = context.resolve_value(config.get('username', ''))
            password = context.resolve_value(config.get('password', ''))
            connection_name = config.get('connectionName', 'oracle_conn')
            
            if not all([service_name, username, password]):
                return ModuleResult(
                    success=False,
                    message="Oracle连接配置不完整",
                    error="配置不完整"
                )
            
            # 创建DSN
            dsn = f"{host}:{port}/{service_name}"
            
            # 建立连接
            connection = oracledb.connect(user=username, password=password, dsn=dsn)
            
            # 保存连接到上下文
            if not hasattr(context, '_db_connections'):
                context._db_connections = {}
            context._db_connections[connection_name] = {
                'type': 'oracle',
                'connection': connection
            }
            
            return ModuleResult(
                success=True,
                message=f"成功连接到Oracle数据库: {host}:{port}/{service_name}"
            )
            
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            print(f"[OracleConnectExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"Oracle数据库连接失败: {str(e)}",
                error=str(e)
            )


@register_executor
class OracleQueryExecutor(ModuleExecutor):
    """Oracle数据库查询执行器"""
    
    @property
    def module_type(self) -> str:
        return "oracle_query"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """执行Oracle查询"""
        try:
            connection_name = config.get('connectionName', 'oracle_conn')
            sql = context.resolve_value(config.get('sql', ''))
            variable_name = config.get('variableName', 'oracle_result')
            
            if not sql:
                return ModuleResult(
                    success=False,
                    message="SQL语句不能为空",
                    error="SQL为空"
                )
            
            # 获取连接
            if not hasattr(context, '_db_connections') or connection_name not in context._db_connections:
                return ModuleResult(
                    success=False,
                    message=f"数据库连接 {connection_name} 不存在，请先建立连接",
                    error="连接不存在"
                )
            
            conn_info = context._db_connections[connection_name]
            connection = conn_info['connection']
            
            # 执行查询
            cursor = connection.cursor()
            cursor.execute(sql)
            
            # 获取列名
            columns = [desc[0] for desc in cursor.description]
            
            # 获取所有结果
            rows = cursor.fetchall()
            
            # 转换为字典列表
            result = []
            for row in rows:
                result.append(dict(zip(columns, row)))
            
            cursor.close()
            
            # 保存结果
            context.set_variable(variable_name, result)
            
            return ModuleResult(
                success=True,
                message=f"查询成功，返回 {len(result)} 条记录",
                data={'count': len(result), 'records': result}
            )
            
        except Exception as e:
            try: cursor.close()
            except Exception: pass
            import traceback
            error_detail = traceback.format_exc()
            print(f"[OracleQueryExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"Oracle查询失败: {str(e)}",
                error=str(e)
            )


@register_executor
class OracleExecuteExecutor(ModuleExecutor):
    """Oracle数据库执行执行器（INSERT/UPDATE/DELETE）"""
    
    @property
    def module_type(self) -> str:
        return "oracle_execute"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """执行Oracle DML语句"""
        try:
            connection_name = config.get('connectionName', 'oracle_conn')
            sql = context.resolve_value(config.get('sql', ''))
            auto_commit = config.get('autoCommit', True)
            
            if not sql:
                return ModuleResult(
                    success=False,
                    message="SQL语句不能为空",
                    error="SQL为空"
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
            
            # 执行SQL
            cursor = connection.cursor()
            cursor.execute(sql)
            affected_rows = cursor.rowcount
            cursor.close()
            
            # 提交事务
            if auto_commit:
                connection.commit()
            
            return ModuleResult(
                success=True,
                message=f"执行成功，影响 {affected_rows} 行",
                data={'affected_rows': affected_rows}
            )
            
        except Exception as e:
            try: cursor.close()
            except Exception: pass
            import traceback
            error_detail = traceback.format_exc()
            print(f"[OracleExecuteExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"Oracle执行失败: {str(e)}",
                error=str(e)
            )


# PostgreSQL数据库执行器
@register_executor
class PostgreSQLConnectExecutor(ModuleExecutor):
    """PostgreSQL数据库连接执行器"""
    
    @property
    def module_type(self) -> str:
        return "postgresql_connect"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """连接PostgreSQL数据库"""
        try:
            import psycopg2
            
            host = context.resolve_value(config.get('host', 'localhost'))
            port = int(context.resolve_value(config.get('port', 5432)))
            database = context.resolve_value(config.get('database', ''))
            username = context.resolve_value(config.get('username', ''))
            password = context.resolve_value(config.get('password', ''))
            connection_name = config.get('connectionName', 'postgresql_conn')
            
            if not all([database, username, password]):
                return ModuleResult(
                    success=False,
                    message="PostgreSQL连接配置不完整",
                    error="配置不完整"
                )
            
            # 建立连接
            connection = psycopg2.connect(
                host=host,
                port=port,
                database=database,
                user=username,
                password=password
            )
            
            # 保存连接
            if not hasattr(context, '_db_connections'):
                context._db_connections = {}
            context._db_connections[connection_name] = {
                'type': 'postgresql',
                'connection': connection
            }
            
            return ModuleResult(
                success=True,
                message=f"成功连接到PostgreSQL数据库: {host}:{port}/{database}"
            )
            
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            print(f"[PostgreSQLConnectExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"PostgreSQL数据库连接失败: {str(e)}",
                error=str(e)
            )


@register_executor
class PostgreSQLQueryExecutor(ModuleExecutor):
    """PostgreSQL数据库查询执行器"""
    
    @property
    def module_type(self) -> str:
        return "postgresql_query"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """执行PostgreSQL查询"""
        try:
            connection_name = config.get('connectionName', 'postgresql_conn')
            sql = context.resolve_value(config.get('sql', ''))
            variable_name = config.get('variableName', 'postgresql_result')
            
            if not sql:
                return ModuleResult(
                    success=False,
                    message="SQL语句不能为空",
                    error="SQL为空"
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
            
            # 执行查询
            cursor = connection.cursor()
            cursor.execute(sql)
            
            # 获取列名
            columns = [desc[0] for desc in cursor.description]
            
            # 获取所有结果
            rows = cursor.fetchall()
            
            # 转换为字典列表
            result = []
            for row in rows:
                result.append(dict(zip(columns, row)))
            
            cursor.close()
            
            # 保存结果
            context.set_variable(variable_name, result)
            
            return ModuleResult(
                success=True,
                message=f"查询成功，返回 {len(result)} 条记录",
                data={'count': len(result), 'records': result}
            )
            
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            print(f"[PostgreSQLQueryExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"PostgreSQL查询失败: {str(e)}",
                error=str(e)
            )


@register_executor
class PostgreSQLExecuteExecutor(ModuleExecutor):
    """PostgreSQL数据库执行执行器"""
    
    @property
    def module_type(self) -> str:
        return "postgresql_execute"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """执行PostgreSQL DML语句"""
        try:
            connection_name = config.get('connectionName', 'postgresql_conn')
            sql = context.resolve_value(config.get('sql', ''))
            auto_commit = config.get('autoCommit', True)
            
            if not sql:
                return ModuleResult(
                    success=False,
                    message="SQL语句不能为空",
                    error="SQL为空"
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
            
            # 执行SQL
            cursor = connection.cursor()
            cursor.execute(sql)
            affected_rows = cursor.rowcount
            cursor.close()
            
            # 提交事务
            if auto_commit:
                connection.commit()
            
            return ModuleResult(
                success=True,
                message=f"执行成功，影响 {affected_rows} 行",
                data={'affected_rows': affected_rows}
            )
            
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            print(f"[PostgreSQLExecuteExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"PostgreSQL执行失败: {str(e)}",
                error=str(e)
            )


# MongoDB数据库执行器
@register_executor
class MongoDBConnectExecutor(ModuleExecutor):
    """MongoDB数据库连接执行器"""
    
    @property
    def module_type(self) -> str:
        return "mongodb_connect"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """连接MongoDB数据库"""
        try:
            from pymongo import MongoClient
            
            host = context.resolve_value(config.get('host', 'localhost'))
            port = int(context.resolve_value(config.get('port', 27017)))
            database = context.resolve_value(config.get('database', ''))
            username = context.resolve_value(config.get('username', ''))
            password = context.resolve_value(config.get('password', ''))
            connection_name = config.get('connectionName', 'mongodb_conn')
            
            if not database:
                return ModuleResult(
                    success=False,
                    message="数据库名称不能为空",
                    error="配置不完整"
                )
            
            # 构建连接字符串
            if username and password:
                connection_string = f"mongodb://{username}:{password}@{host}:{port}/{database}"
            else:
                connection_string = f"mongodb://{host}:{port}/{database}"
            
            # 建立连接
            client = MongoClient(connection_string)
            db = client[database]
            
            # 测试连接
            db.command('ping')
            
            # 保存连接
            if not hasattr(context, '_db_connections'):
                context._db_connections = {}
            context._db_connections[connection_name] = {
                'type': 'mongodb',
                'client': client,
                'database': db
            }
            
            return ModuleResult(
                success=True,
                message=f"成功连接到MongoDB数据库: {host}:{port}/{database}"
            )
            
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            print(f"[MongoDBConnectExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"MongoDB数据库连接失败: {str(e)}",
                error=str(e)
            )


@register_executor
class MongoDBFindExecutor(ModuleExecutor):
    """MongoDB查询执行器"""
    
    @property
    def module_type(self) -> str:
        return "mongodb_find"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """执行MongoDB查询"""
        try:
            connection_name = config.get('connectionName', 'mongodb_conn')
            collection_name = context.resolve_value(config.get('collection', ''))
            query_str = context.resolve_value(config.get('query', '{}'))
            variable_name = config.get('variableName', 'mongodb_result')
            limit = int(config.get('limit', 0))
            
            if not collection_name:
                return ModuleResult(
                    success=False,
                    message="集合名称不能为空",
                    error="集合名为空"
                )
            
            # 获取连接
            if not hasattr(context, '_db_connections') or connection_name not in context._db_connections:
                return ModuleResult(
                    success=False,
                    message=f"数据库连接 {connection_name} 不存在",
                    error="连接不存在"
                )
            
            conn_info = context._db_connections[connection_name]
            db = conn_info['database']
            collection = db[collection_name]
            
            # 解析查询条件
            query = json.loads(query_str) if query_str else {}
            
            # 执行查询
            cursor = collection.find(query)
            if limit > 0:
                cursor = cursor.limit(limit)
            
            # 获取结果
            result = []
            for doc in cursor:
                # 转换ObjectId为字符串
                if '_id' in doc:
                    doc['_id'] = str(doc['_id'])
                result.append(doc)
            
            # 保存结果
            context.set_variable(variable_name, result)
            
            return ModuleResult(
                success=True,
                message=f"查询成功，返回 {len(result)} 条记录",
                data={'count': len(result), 'records': result}
            )
            
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            print(f"[MongoDBFindExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"MongoDB查询失败: {str(e)}",
                error=str(e)
            )


@register_executor
class MongoDBInsertExecutor(ModuleExecutor):
    """MongoDB插入执行器"""
    
    @property
    def module_type(self) -> str:
        return "mongodb_insert"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """执行MongoDB插入"""
        try:
            connection_name = config.get('connectionName', 'mongodb_conn')
            collection_name = context.resolve_value(config.get('collection', ''))
            document_str = context.resolve_value(config.get('document', '{}'))
            
            if not collection_name:
                return ModuleResult(
                    success=False,
                    message="集合名称不能为空",
                    error="集合名为空"
                )
            
            # 获取连接
            if not hasattr(context, '_db_connections') or connection_name not in context._db_connections:
                return ModuleResult(
                    success=False,
                    message=f"数据库连接 {connection_name} 不存在",
                    error="连接不存在"
                )
            
            conn_info = context._db_connections[connection_name]
            db = conn_info['database']
            collection = db[collection_name]
            
            # 解析文档
            document = json.loads(document_str) if document_str else {}
            
            # 执行插入
            result = collection.insert_one(document)
            
            return ModuleResult(
                success=True,
                message=f"插入成功，ID: {str(result.inserted_id)}",
                data={'inserted_id': str(result.inserted_id)}
            )
            
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            print(f"[MongoDBInsertExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"MongoDB插入失败: {str(e)}",
                error=str(e)
            )


@register_executor
class MongoDBUpdateExecutor(ModuleExecutor):
    """MongoDB更新执行器"""
    
    @property
    def module_type(self) -> str:
        return "mongodb_update"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """执行MongoDB更新"""
        try:
            connection_name = config.get('connectionName', 'mongodb_conn')
            collection_name = context.resolve_value(config.get('collection', ''))
            query_str = context.resolve_value(config.get('query', '{}'))
            update_str = context.resolve_value(config.get('update', '{}'))
            
            if not collection_name:
                return ModuleResult(
                    success=False,
                    message="集合名称不能为空",
                    error="集合名为空"
                )
            
            # 获取连接
            if not hasattr(context, '_db_connections') or connection_name not in context._db_connections:
                return ModuleResult(
                    success=False,
                    message=f"数据库连接 {connection_name} 不存在",
                    error="连接不存在"
                )
            
            conn_info = context._db_connections[connection_name]
            db = conn_info['database']
            collection = db[collection_name]
            
            # 解析查询和更新
            query = json.loads(query_str) if query_str else {}
            update = json.loads(update_str) if update_str else {}
            
            # 执行更新
            result = collection.update_many(query, update)
            
            return ModuleResult(
                success=True,
                message=f"更新成功，影响 {result.modified_count} 条记录",
                data={'modified_count': result.modified_count}
            )
            
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            print(f"[MongoDBUpdateExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"MongoDB更新失败: {str(e)}",
                error=str(e)
            )


@register_executor
class MongoDBDeleteExecutor(ModuleExecutor):
    """MongoDB删除执行器"""
    
    @property
    def module_type(self) -> str:
        return "mongodb_delete"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """执行MongoDB删除"""
        try:
            connection_name = config.get('connectionName', 'mongodb_conn')
            collection_name = context.resolve_value(config.get('collection', ''))
            query_str = context.resolve_value(config.get('query', '{}'))
            
            if not collection_name:
                return ModuleResult(
                    success=False,
                    message="集合名称不能为空",
                    error="集合名为空"
                )
            
            # 获取连接
            if not hasattr(context, '_db_connections') or connection_name not in context._db_connections:
                return ModuleResult(
                    success=False,
                    message=f"数据库连接 {connection_name} 不存在",
                    error="连接不存在"
                )
            
            conn_info = context._db_connections[connection_name]
            db = conn_info['database']
            collection = db[collection_name]
            
            # 解析查询
            query = json.loads(query_str) if query_str else {}
            
            # 执行删除
            result = collection.delete_many(query)
            
            return ModuleResult(
                success=True,
                message=f"删除成功，影响 {result.deleted_count} 条记录",
                data={'deleted_count': result.deleted_count}
            )
            
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            print(f"[MongoDBDeleteExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"MongoDB删除失败: {str(e)}",
                error=str(e)
            )


# SQL Server数据库执行器
@register_executor
class SQLServerConnectExecutor(ModuleExecutor):
    """SQL Server数据库连接执行器"""
    
    @property
    def module_type(self) -> str:
        return "sqlserver_connect"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """连接SQL Server数据库"""
        try:
            import pyodbc
            
            host = context.resolve_value(config.get('host', 'localhost'))
            port = int(context.resolve_value(config.get('port', 1433)))
            database = context.resolve_value(config.get('database', ''))
            username = context.resolve_value(config.get('username', ''))
            password = context.resolve_value(config.get('password', ''))
            connection_name = config.get('connectionName', 'sqlserver_conn')
            driver = config.get('driver', 'ODBC Driver 17 for SQL Server')
            
            if not all([database, username, password]):
                return ModuleResult(
                    success=False,
                    message="SQL Server连接配置不完整",
                    error="配置不完整"
                )
            
            # 构建连接字符串
            connection_string = (
                f"DRIVER={{{driver}}};"
                f"SERVER={host},{port};"
                f"DATABASE={database};"
                f"UID={username};"
                f"PWD={password}"
            )
            
            # 建立连接
            connection = pyodbc.connect(connection_string)
            
            # 保存连接
            if not hasattr(context, '_db_connections'):
                context._db_connections = {}
            context._db_connections[connection_name] = {
                'type': 'sqlserver',
                'connection': connection
            }
            
            return ModuleResult(
                success=True,
                message=f"成功连接到SQL Server数据库: {host}:{port}/{database}"
            )
            
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            print(f"[SQLServerConnectExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"SQL Server数据库连接失败: {str(e)}",
                error=str(e)
            )


@register_executor
class SQLServerQueryExecutor(ModuleExecutor):
    """SQL Server数据库查询执行器"""
    
    @property
    def module_type(self) -> str:
        return "sqlserver_query"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """执行SQL Server查询"""
        try:
            connection_name = config.get('connectionName', 'sqlserver_conn')
            sql = context.resolve_value(config.get('sql', ''))
            variable_name = config.get('variableName', 'sqlserver_result')
            
            if not sql:
                return ModuleResult(
                    success=False,
                    message="SQL语句不能为空",
                    error="SQL为空"
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
            
            # 执行查询
            cursor = connection.cursor()
            cursor.execute(sql)
            
            # 获取列名
            columns = [desc[0] for desc in cursor.description]
            
            # 获取所有结果
            rows = cursor.fetchall()
            
            # 转换为字典列表
            result = []
            for row in rows:
                result.append(dict(zip(columns, row)))
            
            cursor.close()
            
            # 保存结果
            context.set_variable(variable_name, result)
            
            return ModuleResult(
                success=True,
                message=f"查询成功，返回 {len(result)} 条记录",
                data={'count': len(result), 'records': result}
            )
            
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            print(f"[SQLServerQueryExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"SQL Server查询失败: {str(e)}",
                error=str(e)
            )


@register_executor
class SQLServerExecuteExecutor(ModuleExecutor):
    """SQL Server数据库执行执行器"""
    
    @property
    def module_type(self) -> str:
        return "sqlserver_execute"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """执行SQL Server DML语句"""
        try:
            connection_name = config.get('connectionName', 'sqlserver_conn')
            sql = context.resolve_value(config.get('sql', ''))
            auto_commit = config.get('autoCommit', True)
            
            if not sql:
                return ModuleResult(
                    success=False,
                    message="SQL语句不能为空",
                    error="SQL为空"
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
            
            # 执行SQL
            cursor = connection.cursor()
            cursor.execute(sql)
            affected_rows = cursor.rowcount
            cursor.close()
            
            # 提交事务
            if auto_commit:
                connection.commit()
            
            return ModuleResult(
                success=True,
                message=f"执行成功，影响 {affected_rows} 行",
                data={'affected_rows': affected_rows}
            )
            
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            print(f"[SQLServerExecuteExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"SQL Server执行失败: {str(e)}",
                error=str(e)
            )


# SQLite数据库执行器
@register_executor
class SQLiteConnectExecutor(ModuleExecutor):
    """SQLite数据库连接执行器"""
    
    @property
    def module_type(self) -> str:
        return "sqlite_connect"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """连接SQLite数据库"""
        try:
            import sqlite3
            
            database_path = context.resolve_value(config.get('databasePath', ''))
            connection_name = config.get('connectionName', 'sqlite_conn')
            
            if not database_path:
                return ModuleResult(
                    success=False,
                    message="数据库文件路径不能为空",
                    error="配置不完整"
                )
            
            # 建立连接
            connection = sqlite3.connect(database_path)
            # 设置行工厂，使查询结果返回字典
            connection.row_factory = sqlite3.Row
            
            # 保存连接
            if not hasattr(context, '_db_connections'):
                context._db_connections = {}
            context._db_connections[connection_name] = {
                'type': 'sqlite',
                'connection': connection
            }
            
            return ModuleResult(
                success=True,
                message=f"成功连接到SQLite数据库: {database_path}"
            )
            
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            print(f"[SQLiteConnectExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"SQLite数据库连接失败: {str(e)}",
                error=str(e)
            )


@register_executor
class SQLiteQueryExecutor(ModuleExecutor):
    """SQLite数据库查询执行器"""
    
    @property
    def module_type(self) -> str:
        return "sqlite_query"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """执行SQLite查询"""
        try:
            connection_name = config.get('connectionName', 'sqlite_conn')
            sql = context.resolve_value(config.get('sql', ''))
            variable_name = config.get('variableName', 'sqlite_result')
            
            if not sql:
                return ModuleResult(
                    success=False,
                    message="SQL语句不能为空",
                    error="SQL为空"
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
            
            # 执行查询
            cursor = connection.cursor()
            cursor.execute(sql)
            
            # 获取所有结果
            rows = cursor.fetchall()
            
            # 转换为字典列表
            result = []
            for row in rows:
                result.append(dict(row))
            
            cursor.close()
            
            # 保存结果
            context.set_variable(variable_name, result)
            
            return ModuleResult(
                success=True,
                message=f"查询成功，返回 {len(result)} 条记录",
                data={'count': len(result), 'records': result}
            )
            
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            print(f"[SQLiteQueryExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"SQLite查询失败: {str(e)}",
                error=str(e)
            )


@register_executor
class SQLiteExecuteExecutor(ModuleExecutor):
    """SQLite数据库执行执行器"""
    
    @property
    def module_type(self) -> str:
        return "sqlite_execute"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """执行SQLite DML语句"""
        try:
            connection_name = config.get('connectionName', 'sqlite_conn')
            sql = context.resolve_value(config.get('sql', ''))
            auto_commit = config.get('autoCommit', True)
            
            if not sql:
                return ModuleResult(
                    success=False,
                    message="SQL语句不能为空",
                    error="SQL为空"
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
            
            # 执行SQL
            cursor = connection.cursor()
            cursor.execute(sql)
            affected_rows = cursor.rowcount
            cursor.close()
            
            # 提交事务
            if auto_commit:
                connection.commit()
            
            return ModuleResult(
                success=True,
                message=f"执行成功，影响 {affected_rows} 行",
                data={'affected_rows': affected_rows}
            )
            
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            print(f"[SQLiteExecuteExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"SQLite执行失败: {str(e)}",
                error=str(e)
            )


# Redis数据库执行器
@register_executor
class RedisConnectExecutor(ModuleExecutor):
    """Redis数据库连接执行器"""
    
    @property
    def module_type(self) -> str:
        return "redis_connect"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """连接Redis数据库"""
        try:
            import redis
            
            host = context.resolve_value(config.get('host', 'localhost'))
            port = int(context.resolve_value(config.get('port', 6379)))
            password = context.resolve_value(config.get('password', ''))
            db = int(context.resolve_value(config.get('db', 0)))
            connection_name = config.get('connectionName', 'redis_conn')
            
            # 建立连接
            if password:
                connection = redis.Redis(
                    host=host,
                    port=port,
                    password=password,
                    db=db,
                    decode_responses=True
                )
            else:
                connection = redis.Redis(
                    host=host,
                    port=port,
                    db=db,
                    decode_responses=True
                )
            
            # 测试连接
            connection.ping()
            
            # 保存连接
            if not hasattr(context, '_db_connections'):
                context._db_connections = {}
            context._db_connections[connection_name] = {
                'type': 'redis',
                'connection': connection
            }
            
            return ModuleResult(
                success=True,
                message=f"成功连接到Redis数据库: {host}:{port}/{db}"
            )
            
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            print(f"[RedisConnectExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"Redis数据库连接失败: {str(e)}",
                error=str(e)
            )


@register_executor
class RedisGetExecutor(ModuleExecutor):
    """Redis GET操作执行器"""
    
    @property
    def module_type(self) -> str:
        return "redis_get"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """执行Redis GET操作"""
        try:
            connection_name = config.get('connectionName', 'redis_conn')
            key = context.resolve_value(config.get('key', ''))
            variable_name = config.get('variableName', 'redis_value')
            
            if not key:
                return ModuleResult(
                    success=False,
                    message="键名不能为空",
                    error="键名为空"
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
            
            # 执行GET
            value = connection.get(key)
            
            # 保存结果
            context.set_variable(variable_name, value)
            
            return ModuleResult(
                success=True,
                message=f"获取成功: {key} = {value}",
                data={'key': key, 'value': value}
            )
            
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            print(f"[RedisGetExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"Redis GET失败: {str(e)}",
                error=str(e)
            )


@register_executor
class RedisSetExecutor(ModuleExecutor):
    """Redis SET操作执行器"""
    
    @property
    def module_type(self) -> str:
        return "redis_set"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """执行Redis SET操作"""
        try:
            connection_name = config.get('connectionName', 'redis_conn')
            key = context.resolve_value(config.get('key', ''))
            value = context.resolve_value(config.get('value', ''))
            expire = config.get('expire', 0)  # 过期时间（秒），0表示不过期
            
            if not key:
                return ModuleResult(
                    success=False,
                    message="键名不能为空",
                    error="键名为空"
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
            
            # 执行SET
            if expire > 0:
                connection.setex(key, expire, value)
            else:
                connection.set(key, value)
            
            return ModuleResult(
                success=True,
                message=f"设置成功: {key} = {value}" + (f" (过期时间: {expire}秒)" if expire > 0 else "")
            )
            
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            print(f"[RedisSetExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"Redis SET失败: {str(e)}",
                error=str(e)
            )


@register_executor
class RedisDelExecutor(ModuleExecutor):
    """Redis DEL操作执行器"""
    
    @property
    def module_type(self) -> str:
        return "redis_del"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """执行Redis DEL操作"""
        try:
            connection_name = config.get('connectionName', 'redis_conn')
            key = context.resolve_value(config.get('key', ''))
            
            if not key:
                return ModuleResult(
                    success=False,
                    message="键名不能为空",
                    error="键名为空"
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
            
            # 执行DEL
            deleted_count = connection.delete(key)
            
            return ModuleResult(
                success=True,
                message=f"删除成功: {key} (删除了 {deleted_count} 个键)",
                data={'deleted_count': deleted_count}
            )
            
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            print(f"[RedisDelExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"Redis DEL失败: {str(e)}",
                error=str(e)
            )


@register_executor
class RedisHashGetExecutor(ModuleExecutor):
    """Redis HGET操作执行器"""
    
    @property
    def module_type(self) -> str:
        return "redis_hget"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """执行Redis HGET操作"""
        try:
            connection_name = config.get('connectionName', 'redis_conn')
            key = context.resolve_value(config.get('key', ''))
            field = context.resolve_value(config.get('field', ''))
            variable_name = config.get('variableName', 'redis_hash_value')
            
            if not key or not field:
                return ModuleResult(
                    success=False,
                    message="键名和字段名不能为空",
                    error="参数为空"
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
            
            # 执行HGET
            value = connection.hget(key, field)
            
            # 保存结果
            context.set_variable(variable_name, value)
            
            return ModuleResult(
                success=True,
                message=f"获取成功: {key}.{field} = {value}",
                data={'key': key, 'field': field, 'value': value}
            )
            
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            print(f"[RedisHashGetExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"Redis HGET失败: {str(e)}",
                error=str(e)
            )


@register_executor
class RedisHashSetExecutor(ModuleExecutor):
    """Redis HSET操作执行器"""
    
    @property
    def module_type(self) -> str:
        return "redis_hset"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """执行Redis HSET操作"""
        try:
            connection_name = config.get('connectionName', 'redis_conn')
            key = context.resolve_value(config.get('key', ''))
            field = context.resolve_value(config.get('field', ''))
            value = context.resolve_value(config.get('value', ''))
            
            if not key or not field:
                return ModuleResult(
                    success=False,
                    message="键名和字段名不能为空",
                    error="参数为空"
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
            
            # 执行HSET
            result = connection.hset(key, field, value)
            
            return ModuleResult(
                success=True,
                message=f"设置成功: {key}.{field} = {value}",
                data={'is_new': result == 1}
            )
            
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            print(f"[RedisHashSetExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"Redis HSET失败: {str(e)}",
                error=str(e)
            )


# ==================== 数据库断开连接执行器 ====================

@register_executor
class OracleDisconnectExecutor(ModuleExecutor):
    """Oracle数据库断开连接执行器"""
    
    @property
    def module_type(self) -> str:
        return "oracle_disconnect"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """断开Oracle数据库连接"""
        try:
            connection_name = config.get('connectionName', 'oracle_conn')
            
            # 检查连接是否存在
            if not hasattr(context, '_db_connections') or connection_name not in context._db_connections:
                return ModuleResult(
                    success=True,
                    message=f"连接 '{connection_name}' 不存在或已关闭"
                )
            
            conn_info = context._db_connections[connection_name]
            
            # 验证连接类型
            if conn_info.get('type') != 'oracle':
                return ModuleResult(
                    success=False,
                    message=f"连接 '{connection_name}' 不是Oracle连接",
                    error="连接类型不匹配"
                )
            
            connection = conn_info['connection']
            
            # 关闭连接
            connection.close()
            del context._db_connections[connection_name]
            
            return ModuleResult(
                success=True,
                message=f"Oracle数据库连接 '{connection_name}' 已关闭"
            )
            
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            print(f"[OracleDisconnectExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"关闭Oracle连接失败: {str(e)}",
                error=str(e)
            )


@register_executor
class PostgreSQLDisconnectExecutor(ModuleExecutor):
    """PostgreSQL数据库断开连接执行器"""
    
    @property
    def module_type(self) -> str:
        return "postgresql_disconnect"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """断开PostgreSQL数据库连接"""
        try:
            connection_name = config.get('connectionName', 'postgresql_conn')
            
            # 检查连接是否存在
            if not hasattr(context, '_db_connections') or connection_name not in context._db_connections:
                return ModuleResult(
                    success=True,
                    message=f"连接 '{connection_name}' 不存在或已关闭"
                )
            
            conn_info = context._db_connections[connection_name]
            
            # 验证连接类型
            if conn_info.get('type') != 'postgresql':
                return ModuleResult(
                    success=False,
                    message=f"连接 '{connection_name}' 不是PostgreSQL连接",
                    error="连接类型不匹配"
                )
            
            connection = conn_info['connection']
            
            # 关闭连接
            connection.close()
            del context._db_connections[connection_name]
            
            return ModuleResult(
                success=True,
                message=f"PostgreSQL数据库连接 '{connection_name}' 已关闭"
            )
            
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            print(f"[PostgreSQLDisconnectExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"关闭PostgreSQL连接失败: {str(e)}",
                error=str(e)
            )


@register_executor
class MongoDBDisconnectExecutor(ModuleExecutor):
    """MongoDB数据库断开连接执行器"""
    
    @property
    def module_type(self) -> str:
        return "mongodb_disconnect"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """断开MongoDB数据库连接"""
        try:
            connection_name = config.get('connectionName', 'mongodb_conn')
            
            # 检查连接是否存在
            if not hasattr(context, '_db_connections') or connection_name not in context._db_connections:
                return ModuleResult(
                    success=True,
                    message=f"连接 '{connection_name}' 不存在或已关闭"
                )
            
            conn_info = context._db_connections[connection_name]
            
            # 验证连接类型
            if conn_info.get('type') != 'mongodb':
                return ModuleResult(
                    success=False,
                    message=f"连接 '{connection_name}' 不是MongoDB连接",
                    error="连接类型不匹配"
                )
            
            client = conn_info['connection']
            
            # 关闭连接
            client.close()
            del context._db_connections[connection_name]
            
            return ModuleResult(
                success=True,
                message=f"MongoDB数据库连接 '{connection_name}' 已关闭"
            )
            
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            print(f"[MongoDBDisconnectExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"关闭MongoDB连接失败: {str(e)}",
                error=str(e)
            )


@register_executor
class SQLServerDisconnectExecutor(ModuleExecutor):
    """SQL Server数据库断开连接执行器"""
    
    @property
    def module_type(self) -> str:
        return "sqlserver_disconnect"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """断开SQL Server数据库连接"""
        try:
            connection_name = config.get('connectionName', 'sqlserver_conn')
            
            # 检查连接是否存在
            if not hasattr(context, '_db_connections') or connection_name not in context._db_connections:
                return ModuleResult(
                    success=True,
                    message=f"连接 '{connection_name}' 不存在或已关闭"
                )
            
            conn_info = context._db_connections[connection_name]
            
            # 验证连接类型
            if conn_info.get('type') != 'sqlserver':
                return ModuleResult(
                    success=False,
                    message=f"连接 '{connection_name}' 不是SQL Server连接",
                    error="连接类型不匹配"
                )
            
            connection = conn_info['connection']
            
            # 关闭连接
            connection.close()
            del context._db_connections[connection_name]
            
            return ModuleResult(
                success=True,
                message=f"SQL Server数据库连接 '{connection_name}' 已关闭"
            )
            
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            print(f"[SQLServerDisconnectExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"关闭SQL Server连接失败: {str(e)}",
                error=str(e)
            )


@register_executor
class SQLiteDisconnectExecutor(ModuleExecutor):
    """SQLite数据库断开连接执行器"""
    
    @property
    def module_type(self) -> str:
        return "sqlite_disconnect"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """断开SQLite数据库连接"""
        try:
            connection_name = config.get('connectionName', 'sqlite_conn')
            
            # 检查连接是否存在
            if not hasattr(context, '_db_connections') or connection_name not in context._db_connections:
                return ModuleResult(
                    success=True,
                    message=f"连接 '{connection_name}' 不存在或已关闭"
                )
            
            conn_info = context._db_connections[connection_name]
            
            # 验证连接类型
            if conn_info.get('type') != 'sqlite':
                return ModuleResult(
                    success=False,
                    message=f"连接 '{connection_name}' 不是SQLite连接",
                    error="连接类型不匹配"
                )
            
            connection = conn_info['connection']
            
            # 关闭连接
            connection.close()
            del context._db_connections[connection_name]
            
            return ModuleResult(
                success=True,
                message=f"SQLite数据库连接 '{connection_name}' 已关闭"
            )
            
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            print(f"[SQLiteDisconnectExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"关闭SQLite连接失败: {str(e)}",
                error=str(e)
            )


@register_executor
class RedisDisconnectExecutor(ModuleExecutor):
    """Redis数据库断开连接执行器"""
    
    @property
    def module_type(self) -> str:
        return "redis_disconnect"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """断开Redis数据库连接"""
        try:
            connection_name = config.get('connectionName', 'redis_conn')
            
            # 检查连接是否存在
            if not hasattr(context, '_db_connections') or connection_name not in context._db_connections:
                return ModuleResult(
                    success=True,
                    message=f"连接 '{connection_name}' 不存在或已关闭"
                )
            
            conn_info = context._db_connections[connection_name]
            
            # 验证连接类型
            if conn_info.get('type') != 'redis':
                return ModuleResult(
                    success=False,
                    message=f"连接 '{connection_name}' 不是Redis连接",
                    error="连接类型不匹配"
                )
            
            connection = conn_info['connection']
            
            # 关闭连接
            connection.close()
            del context._db_connections[connection_name]
            
            return ModuleResult(
                success=True,
                message=f"Redis数据库连接 '{connection_name}' 已关闭"
            )
            
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            print(f"[RedisDisconnectExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"关闭Redis连接失败: {str(e)}",
                error=str(e)
            )
