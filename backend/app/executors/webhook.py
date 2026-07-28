"""Webhook请求模块执行器"""
import httpx
import json
from typing import Any, Optional
from app.executors.base import ModuleExecutor, ExecutionContext, ModuleResult, register_executor


@register_executor
class WebhookExecutor(ModuleExecutor):
    """Webhook请求执行器
    
    支持发送Webhook请求到指定URL，可以自定义请求方法、请求头、请求体、Cookies等
    """
    
    @property
    def module_type(self) -> str:
        return "webhook_request"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        """执行Webhook请求"""
        try:
            # 解析配置
            url = context.resolve_value(config.get('url', ''))
            method = config.get('method', 'POST').upper()
            headers = config.get('headers', {})
            cookies = config.get('cookies', {})  # 新增：cookies配置
            body_type = config.get('bodyType', 'json')  # json, form, raw
            body = config.get('body', {})
            timeout_ms = config.get('timeout', 30)
            follow_redirects = config.get('followRedirects', True)  # 新增：是否跟随重定向
            verify_ssl = config.get('verifySSL', True)  # 新增：是否验证SSL
            
            # 变量配置
            save_response = config.get('saveResponse', False)
            response_variable = config.get('responseVariable', 'webhook_response')
            save_status = config.get('saveStatus', False)
            status_variable = config.get('statusVariable', 'webhook_status')
            save_headers = config.get('saveHeaders', False)  # 新增：保存响应头
            headers_variable = config.get('headersVariable', 'webhook_headers')
            save_cookies = config.get('saveCookies', False)  # 新增：保存响应cookies
            cookies_variable = config.get('cookiesVariable', 'webhook_cookies')
            
            if not url:
                return ModuleResult(
                    success=False,
                    message="Webhook URL不能为空",
                    error="URL为空"
                )
            
            # 解析请求头中的变量
            resolved_headers = {}
            if isinstance(headers, dict):
                for key, value in headers.items():
                    resolved_headers[str(key)] = context.resolve_value(str(value))
            elif isinstance(headers, str) and headers.strip():
                # 支持JSON字符串格式的headers
                try:
                    parsed = json.loads(context.resolve_value(headers))
                    if isinstance(parsed, dict):
                        resolved_headers = {str(k): str(v) for k, v in parsed.items()}
                except Exception:
                    pass
            
            # 解析cookies中的变量
            resolved_cookies = {}
            if isinstance(cookies, dict):
                for key, value in cookies.items():
                    resolved_cookies[str(key)] = context.resolve_value(str(value))
            elif isinstance(cookies, str) and cookies.strip():
                # 支持JSON字符串格式的cookies
                try:
                    parsed = json.loads(context.resolve_value(cookies))
                    if isinstance(parsed, dict):
                        resolved_cookies = {str(k): str(v) for k, v in parsed.items()}
                except Exception:
                    # 支持 key=value; key2=value2 格式
                    cookie_str = context.resolve_value(cookies)
                    for part in cookie_str.split(';'):
                        part = part.strip()
                        if '=' in part:
                            k, v = part.split('=', 1)
                            resolved_cookies[k.strip()] = v.strip()
            
            # 准备请求体
            request_data = None
            request_json = None
            request_content = None
            response_data = None
            
            if method in ['POST', 'PUT', 'PATCH']:
                if body_type == 'json':
                    if isinstance(body, dict):
                        resolved_body = {}
                        for key, value in body.items():
                            resolved_body[key] = context.resolve_value(value) if isinstance(value, str) else value
                        request_json = resolved_body
                    elif isinstance(body, str) and body.strip():
                        try:
                            raw_resolved = context.resolve_value(body)
                            request_json = json.loads(raw_resolved)
                        except Exception:
                            request_content = context.resolve_value(body).encode('utf-8')
                    if 'Content-Type' not in resolved_headers:
                        resolved_headers['Content-Type'] = 'application/json'
                        
                elif body_type == 'form':
                    if isinstance(body, dict):
                        resolved_body = {}
                        for key, value in body.items():
                            resolved_body[key] = context.resolve_value(value) if isinstance(value, str) else value
                        request_data = resolved_body
                    if 'Content-Type' not in resolved_headers:
                        resolved_headers['Content-Type'] = 'application/x-www-form-urlencoded'
                        
                elif body_type == 'raw':
                    raw_body = context.resolve_value(body.get('raw', '') if isinstance(body, dict) else body)
                    request_content = raw_body.encode('utf-8') if isinstance(raw_body, str) else raw_body
            
            # 发送请求
            async with httpx.AsyncClient(
                timeout=timeout_ms,
                follow_redirects=follow_redirects,
                verify=verify_ssl,
                cookies=resolved_cookies if resolved_cookies else None,
            ) as client:
                response = await client.request(
                    method=method,
                    url=url,
                    headers=resolved_headers if resolved_headers else None,
                    json=request_json,
                    data=request_data,
                    content=request_content,
                )
            
            # 保存响应状态码
            if save_status:
                context.set_variable(status_variable, response.status_code)
            
            # 保存响应头
            if save_headers:
                context.set_variable(headers_variable, dict(response.headers))
            
            # 保存响应cookies
            if save_cookies:
                context.set_variable(cookies_variable, dict(response.cookies))
            
            # 保存响应内容
            if save_response:
                try:
                    response_data = response.json()
                except Exception:
                    response_data = response.text
                context.set_variable(response_variable, response_data)
            else:
                try:
                    response_data = response.json()
                except Exception:
                    response_data = response.text
            
            # 判断请求是否成功
            if 200 <= response.status_code < 300:
                return ModuleResult(
                    success=True,
                    message=f"Webhook请求成功，状态码: {response.status_code}",
                    data={
                        'status_code': response.status_code,
                        'response': response_data if save_response else None
                    }
                )
            else:
                # 本机地址返回 502/503/504 时附上诊断：本机服务不产生网关状态码，
                # 通常是本机代理软件的 TUN/透明代理劫持了回环流量。
                from app.utils.local_http_diagnostics import gateway_error_hint
                gw_hint = gateway_error_hint(url, response.status_code)
                return ModuleResult(
                    success=False,
                    message=f"Webhook请求失败，状态码: {response.status_code}",
                    error=f"HTTP {response.status_code}: {response.text[:200]}" + gw_hint,
                    data={
                        'status_code': response.status_code,
                        'response': response.text
                    }
                )
                
        except httpx.TimeoutException:
            return ModuleResult(
                success=False,
                message="Webhook请求超时",
                error="请求超时"
            )
        except httpx.ConnectError as e:
            from app.utils.local_http_diagnostics import connect_error_hint
            return ModuleResult(
                success=False,
                message="Webhook请求失败：无法连接到目标地址",
                error=f"{e}" + connect_error_hint(url)
            )
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            print(f"[WebhookExecutor] 执行失败: {error_detail}")
            return ModuleResult(
                success=False,
                message=f"Webhook请求失败: {str(e)}",
                error=str(e)
            )
