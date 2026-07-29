"""QQ自动化模块执行器 - 基于 OneBot 协议 HTTP API"""
import asyncio
import base64
import os
import re
import time
from typing import Optional

import httpx

from .base import (
    ModuleExecutor,
    ExecutionContext,
    ModuleResult,
    register_executor,
)
from .type_utils import to_int


class OneBotClient:
    """OneBot HTTP API 客户端"""
    
    def __init__(self, api_url: str, access_token: str = ""):
        self.api_url = api_url.rstrip('/')
        self.access_token = access_token
        self.headers = {}
        if access_token:
            self.headers['Authorization'] = f'Bearer {access_token}'
    
    async def call_api(self, endpoint: str, data: dict = None) -> dict:
        """调用 OneBot API"""
        url = f"{self.api_url}/{endpoint}"
        # NapCat/OneBot 默认跑在 127.0.0.1:3000。httpx 不看 Windows 代理的 bypass
        # 列表，开着系统代理时会把本机请求也发给代理，导致机器人接口直接 502。
        from app.utils.http_client import trust_env_for
        async with httpx.AsyncClient(timeout=30, trust_env=trust_env_for(url)) as client:
            response = await client.post(url, json=data or {}, headers=self.headers)
            response.raise_for_status()
            result = response.json()
            if result.get('status') == 'failed':
                raise Exception(result.get('message', '未知错误'))
            return result.get('data', {})
    
    async def send_private_msg(self, user_id: int, message: str) -> dict:
        """发送私聊消息"""
        return await self.call_api('send_private_msg', {
            'user_id': user_id,
            'message': message
        })
    
    async def send_group_msg(self, group_id: int, message: str) -> dict:
        """发送群消息"""
        return await self.call_api('send_group_msg', {
            'group_id': group_id,
            'message': message
        })
    
    async def send_private_image(self, user_id: int, image_path: str, text: str = "") -> dict:
        """发送私聊图片"""
        image_cq = self._build_image_cq(image_path)
        message = f"{text}{image_cq}" if text else image_cq
        return await self.call_api('send_private_msg', {
            'user_id': user_id,
            'message': message
        })
    
    async def send_group_image(self, group_id: int, image_path: str, text: str = "") -> dict:
        """发送群图片"""
        image_cq = self._build_image_cq(image_path)
        message = f"{text}{image_cq}" if text else image_cq
        return await self.call_api('send_group_msg', {
            'group_id': group_id,
            'message': message
        })
    
    async def send_private_file(self, user_id: int, file_path: str) -> dict:
        """发送私聊文件"""
        file_cq = self._build_file_cq(file_path)
        return await self.call_api('send_private_msg', {
            'user_id': user_id,
            'message': file_cq
        })
    
    async def send_group_file(self, group_id: int, file_path: str, folder_id: str = "") -> dict:
        """发送群文件（上传到群文件）"""
        # 使用 upload_group_file API
        return await self.call_api('upload_group_file', {
            'group_id': group_id,
            'file': file_path,
            'name': os.path.basename(file_path),
            'folder': folder_id
        })
    
    def _build_image_cq(self, image_path: str) -> str:
        """构建图片 CQ 码"""
        image_path = image_path.strip()
        
        # 判断是否是 URL
        if image_path.startswith('http://') or image_path.startswith('https://'):
            # URL 图片 - NapCat 支持直接使用 URL
            # 注意：某些 URL 可能因为防盗链等原因无法下载
            print(f"[QQ发送图片] 使用网络图片: {image_path[:100]}...")
            return f"[CQ:image,file={image_path}]"
        elif image_path.startswith('base64://'):
            # 已经是 base64 格式
            print(f"[QQ发送图片] 使用 Base64 图片")
            return f"[CQ:image,file={image_path}]"
        elif os.path.exists(image_path):
            # 本地文件转 base64
            print(f"[QQ发送图片] 使用本地文件: {image_path}")
            with open(image_path, 'rb') as f:
                img_base64 = base64.b64encode(f.read()).decode()
            return f"[CQ:image,file=base64://{img_base64}]"
        else:
            # 文件不存在，可能是相对路径或其他格式
            print(f"[QQ发送图片] 警告: 文件不存在，尝试直接使用: {image_path}")
            return f"[CQ:image,file={image_path}]"
    
    def _build_file_cq(self, file_path: str) -> str:
        """构建文件 CQ 码（用于私聊发送文件）"""
        file_path = file_path.strip()
        
        if os.path.exists(file_path):
            # 使用绝对路径
            abs_path = os.path.abspath(file_path)
            print(f"[QQ发送文件] 使用本地文件: {abs_path}")
            return f"[CQ:file,file=file:///{abs_path}]"
        else:
            print(f"[QQ发送文件] 警告: 文件不存在: {file_path}")
            return f"[CQ:file,file={file_path}]"
    
    async def get_friend_list(self) -> list:
        """获取好友列表"""
        return await self.call_api('get_friend_list')
    
    async def get_group_list(self) -> list:
        """获取群列表"""
        return await self.call_api('get_group_list')
    
    async def get_group_member_list(self, group_id: int) -> list:
        """获取群成员列表"""
        return await self.call_api('get_group_member_list', {'group_id': group_id})
    
    async def get_login_info(self) -> dict:
        """获取登录信息"""
        return await self.call_api('get_login_info')


def get_onebot_client(context: ExecutionContext, config: dict) -> OneBotClient:
    """从配置或全局变量获取 OneBot 客户端"""
    # 优先从配置获取
    api_url = context.resolve_value(config.get('apiUrl', ''))
    
    # 如果配置为空，尝试从全局变量获取
    if not api_url:
        api_url = context.get_variable('qq_api_url') or 'http://127.0.0.1:3000'
    
    # 不再使用 accessToken，默认为空
    return OneBotClient(api_url, '')


@register_executor
class QQSendMessageExecutor(ModuleExecutor):
    """QQ发送消息模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "qq_send_message"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        message_type = context.resolve_value(config.get('messageType', 'private'))  # private/group
        target_id = context.resolve_value(config.get('targetId', ''))
        message = context.resolve_value(config.get('message', ''))
        result_variable = config.get('resultVariable', '')
        
        if not target_id:
            return ModuleResult(success=False, error="目标ID不能为空")
        if not message:
            return ModuleResult(success=False, error="消息内容不能为空")
        
        try:
            target_id = int(target_id)
        except ValueError:
            return ModuleResult(success=False, error="目标ID必须是数字")
        
        try:
            client = get_onebot_client(context, config)
            
            if message_type == 'private':
                result = await client.send_private_msg(target_id, message)
                msg = f"已发送私聊消息给 {target_id}"
            else:
                result = await client.send_group_msg(target_id, message)
                msg = f"已发送群消息到 {target_id}"
            
            if result_variable:
                context.set_variable(result_variable, result)
            
            return ModuleResult(
                success=True,
                message=msg,
                data=result
            )
        except Exception as e:
            return ModuleResult(success=False, error=f"发送消息失败: {str(e)}")


@register_executor
class QQSendImageExecutor(ModuleExecutor):
    """QQ发送图片模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "qq_send_image"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        message_type = context.resolve_value(config.get('messageType', 'private'))
        target_id = context.resolve_value(config.get('targetId', ''))
        image_path = context.resolve_value(config.get('imagePath', ''))
        text = context.resolve_value(config.get('text', ''))
        result_variable = config.get('resultVariable', '')
        
        if not target_id:
            return ModuleResult(success=False, error="目标ID不能为空")
        if not image_path:
            return ModuleResult(success=False, error="图片路径不能为空")
        
        try:
            target_id = int(target_id)
        except ValueError:
            return ModuleResult(success=False, error="目标ID必须是数字")
        
        try:
            client = get_onebot_client(context, config)
            
            if message_type == 'private':
                result = await client.send_private_image(target_id, image_path, text)
                msg = f"已发送图片给 {target_id}"
            else:
                result = await client.send_group_image(target_id, image_path, text)
                msg = f"已发送图片到群 {target_id}"
            
            if result_variable:
                context.set_variable(result_variable, result)
            
            return ModuleResult(
                success=True,
                message=msg,
                data=result
            )
        except Exception as e:
            return ModuleResult(success=False, error=f"发送图片失败: {str(e)}")


@register_executor
class QQSendFileExecutor(ModuleExecutor):
    """QQ发送文件模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "qq_send_file"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        message_type = context.resolve_value(config.get('messageType', 'private'))
        target_id = context.resolve_value(config.get('targetId', ''))
        file_path = context.resolve_value(config.get('filePath', ''))
        folder_id = context.resolve_value(config.get('folderId', ''))  # 群文件夹ID（可选）
        result_variable = config.get('resultVariable', '')
        
        if not target_id:
            return ModuleResult(success=False, error="目标ID不能为空")
        if not file_path:
            return ModuleResult(success=False, error="文件路径不能为空")
        if not os.path.exists(file_path):
            return ModuleResult(success=False, error=f"文件不存在: {file_path}")
        
        try:
            target_id = int(target_id)
        except ValueError:
            return ModuleResult(success=False, error="目标ID必须是数字")
        
        try:
            client = get_onebot_client(context, config)
            
            if message_type == 'private':
                result = await client.send_private_file(target_id, file_path)
                msg = f"已发送文件给 {target_id}"
            else:
                result = await client.send_group_file(target_id, file_path, folder_id)
                msg = f"已发送文件到群 {target_id}"
            
            if result_variable:
                context.set_variable(result_variable, result)
            
            return ModuleResult(
                success=True,
                message=msg,
                data=result
            )
        except Exception as e:
            return ModuleResult(success=False, error=f"发送文件失败: {str(e)}")


@register_executor
class QQGetFriendListExecutor(ModuleExecutor):
    """QQ获取好友列表模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "qq_get_friends"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        result_variable = config.get('resultVariable', 'qq_friends')
        
        try:
            client = get_onebot_client(context, config)
            friends = await client.get_friend_list()
            
            if result_variable:
                context.set_variable(result_variable, friends)
            
            return ModuleResult(
                success=True,
                message=f"获取到 {len(friends)} 个好友",
                data={'count': len(friends), 'friends': friends}
            )
        except Exception as e:
            return ModuleResult(success=False, error=f"获取好友列表失败: {str(e)}")


@register_executor
class QQGetGroupListExecutor(ModuleExecutor):
    """QQ获取群列表模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "qq_get_groups"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        result_variable = config.get('resultVariable', 'qq_groups')
        
        try:
            client = get_onebot_client(context, config)
            groups = await client.get_group_list()
            
            if result_variable:
                context.set_variable(result_variable, groups)
            
            return ModuleResult(
                success=True,
                message=f"获取到 {len(groups)} 个群",
                data={'count': len(groups), 'groups': groups}
            )
        except Exception as e:
            return ModuleResult(success=False, error=f"获取群列表失败: {str(e)}")


@register_executor
class QQGetGroupMembersExecutor(ModuleExecutor):
    """QQ获取群成员列表模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "qq_get_group_members"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        group_id = context.resolve_value(config.get('groupId', ''))
        result_variable = config.get('resultVariable', 'qq_group_members')
        
        if not group_id:
            return ModuleResult(success=False, error="群号不能为空")
        
        try:
            group_id = int(group_id)
        except ValueError:
            return ModuleResult(success=False, error="群号必须是数字")
        
        try:
            client = get_onebot_client(context, config)
            members = await client.get_group_member_list(group_id)
            
            if result_variable:
                context.set_variable(result_variable, members)
            
            return ModuleResult(
                success=True,
                message=f"获取到群 {group_id} 的 {len(members)} 个成员",
                data={'count': len(members), 'members': members}
            )
        except Exception as e:
            return ModuleResult(success=False, error=f"获取群成员列表失败: {str(e)}")


@register_executor  
class QQGetLoginInfoExecutor(ModuleExecutor):
    """QQ获取登录信息模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "qq_get_login_info"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        result_variable = config.get('resultVariable', 'qq_login_info')
        
        try:
            client = get_onebot_client(context, config)
            info = await client.get_login_info()
            
            if result_variable:
                context.set_variable(result_variable, info)
            
            user_id = info.get('user_id', '未知')
            nickname = info.get('nickname', '未知')
            
            return ModuleResult(
                success=True,
                message=f"当前登录: {nickname} ({user_id})",
                data=info
            )
        except Exception as e:
            return ModuleResult(success=False, error=f"获取登录信息失败: {str(e)}")


import re
import time


@register_executor
class QQWaitMessageExecutor(ModuleExecutor):
    """QQ等待消息模块执行器 - 等待指定条件的消息出现"""
    
    @property
    def module_type(self) -> str:
        return "qq_wait_message"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        # 消息来源类型: any(任何消息), private(私聊), group(群聊)
        source_type = context.resolve_value(config.get('sourceType', 'any'))
        # 发送者QQ号（可选，为空则不限制）
        sender_id = context.resolve_value(config.get('senderId', ''))
        # 群号（仅群聊时有效，为空则不限制）
        group_id = context.resolve_value(config.get('groupId', ''))
        # 消息匹配模式: contains(包含), equals(完全匹配), regex(正则), any(任意消息)
        match_mode = context.resolve_value(config.get('matchMode', 'contains'))
        # 匹配内容
        match_content = context.resolve_value(config.get('matchContent', ''))
        # 超时时间（秒），0表示无限等待，默认无限等待
        timeout = to_int(context.resolve_value(config.get('waitTimeout', 0)), 0)
        # 轮询间隔（秒），支持小数，默认 0.3 秒实现近乎实时响应
        poll_interval_raw = context.resolve_value(config.get('pollInterval', 0.3))
        try:
            poll_interval = float(poll_interval_raw)
            if poll_interval < 0.1:
                poll_interval = 0.3
        except Exception:
            poll_interval = 0.3
        # 结果变量
        result_variable = config.get('resultVariable', 'qq_received_message')
        
        # 验证参数
        if match_mode != 'any' and not match_content:
            return ModuleResult(success=False, error="匹配内容不能为空（除非选择'任意消息'模式）")
        
        if sender_id:
            try:
                sender_id = int(sender_id)
            except ValueError:
                return ModuleResult(success=False, error="发送者QQ号必须是数字")
        
        if group_id:
            try:
                group_id = int(group_id)
            except ValueError:
                return ModuleResult(success=False, error="群号必须是数字")
        
        try:
            client = get_onebot_client(context, config)
            
            elapsed = 0.0
            last_log_time = 0.0  # 上次打印日志的时间
            last_poll_time = time.time()  # 上次轮询的时间
            
            # 首次获取消息，记录当前最大的 message_id，之后只处理比这个大的消息
            initial_messages = await self._get_recent_messages(client, source_type, group_id, sender_id)
            seen_message_ids = set()
            for msg in initial_messages:
                msg_id = msg.get('message_id', 0)
                if msg_id:
                    seen_message_ids.add(msg_id)
            
            print(f"[QQ等待消息] 开始等待消息 (轮询间隔: {poll_interval}秒)")
            print(f"[QQ等待消息] 配置原始值: pollInterval={poll_interval_raw}, 解析后: {poll_interval}")
            if sender_id:
                print(f"  指定发送者: {sender_id}")
            if group_id:
                print(f"  指定群号: {group_id}")
            print(f"  匹配模式: {match_mode}, 内容: {match_content if match_content else '(任意)'}")
            print(f"  已记录 {len(seen_message_ids)} 条历史消息ID")
            
            while True:
                # 检查是否超时
                if timeout > 0 and elapsed >= timeout:
                    return ModuleResult(
                        success=False,
                        error=f"等待消息超时（{timeout}秒）"
                    )
                
                # 检查是否被停止
                if context.should_break:
                    return ModuleResult(success=False, error="工作流已停止")
                
                try:
                    # 获取最近的消息记录
                    messages = await self._get_recent_messages(client, source_type, group_id, sender_id)
                    
                    # 每10秒打印一次状态日志
                    if elapsed - last_log_time >= 10:
                        print(f"[QQ等待消息] 已等待 {int(elapsed)}秒，已处理 {len(seen_message_ids)} 条消息")
                        last_log_time = elapsed
                    
                    for msg in messages:
                        msg_id = msg.get('message_id', 0)
                        
                        # 跳过已处理的消息
                        if msg_id in seen_message_ids:
                            continue
                        
                        # 标记为已处理
                        seen_message_ids.add(msg_id)
                        
                        # 检查消息来源
                        msg_type = msg.get('message_type', '')
                        if source_type == 'private' and msg_type != 'private':
                            continue
                        if source_type == 'group' and msg_type != 'group':
                            continue
                        
                        # 获取发送者信息
                        sender_obj = msg.get('sender', {})
                        self_id = msg.get('self_id', 0)  # 自己的QQ号
                        
                        # sender.user_id 是消息的实际发送者
                        actual_sender_id = sender_obj.get('user_id') or sender_obj.get('uin') or 0
                        try:
                            actual_sender_id = int(actual_sender_id) if actual_sender_id else 0
                        except Exception:
                            actual_sender_id = 0
                        
                        # 判断是否是自己发的消息（需要跳过）
                        is_self_message = (actual_sender_id == self_id)
                        
                        # 对于私聊，会话对方的QQ号在 msg['user_id']
                        conversation_user_id = msg.get('user_id', 0)
                        try:
                            conversation_user_id = int(conversation_user_id) if conversation_user_id else 0
                        except Exception:
                            conversation_user_id = 0
                        
                        # 获取消息内容
                        raw_message = msg.get('raw_message', '') or ''
                        if not raw_message:
                            # 尝试从 message 数组提取
                            message_arr = msg.get('message', [])
                            if isinstance(message_arr, list):
                                raw_message = ''.join(
                                    seg.get('data', {}).get('text', '')
                                    for seg in message_arr
                                    if seg.get('type') == 'text'
                                )
                        
                        # 打印新消息
                        print(f"[QQ等待消息] 新消息: id={msg_id}, sender={actual_sender_id}, conv_user={conversation_user_id}, content={raw_message[:50]}")
                        
                        # 跳过自己发的消息
                        if is_self_message:
                            print(f"  -> 跳过: 自己发的消息")
                            continue
                        
                        # 检查发送者（对于私聊，检查会话对方；对于群聊，检查实际发送者）
                        if sender_id:
                            if msg_type == 'private':
                                if conversation_user_id != sender_id:
                                    print(f"  -> 跳过: 发送者不匹配 (conv_user={conversation_user_id} != {sender_id})")
                                    continue
                            else:
                                if actual_sender_id != sender_id:
                                    print(f"  -> 跳过: 发送者不匹配 (actual_sender={actual_sender_id} != {sender_id})")
                                    continue
                        
                        # 检查群号
                        msg_group_id = msg.get('group_id', 0)
                        if group_id and msg_group_id != group_id:
                            print(f"  -> 跳过: 群号不匹配")
                            continue
                        
                        # 匹配消息内容
                        matched = False
                        raw_message_stripped = raw_message.strip()
                        match_content_stripped = match_content.strip()
                        
                        if match_mode == 'any':
                            matched = True
                        elif match_mode == 'contains':
                            matched = match_content_stripped in raw_message_stripped
                            print(f"  -> 包含匹配: '{match_content_stripped}' in '{raw_message_stripped[:50]}' = {matched}")
                        elif match_mode == 'equals':
                            matched = raw_message_stripped == match_content_stripped
                        elif match_mode == 'regex':
                            try:
                                matched = bool(re.search(match_content, raw_message))
                            except re.error as e:
                                return ModuleResult(success=False, error=f"正则表达式错误: {e}")
                        
                        if matched:
                            # 找到匹配的消息
                            final_sender_id = conversation_user_id if msg_type == 'private' else actual_sender_id
                            result_data = {
                                'message_id': msg_id,
                                'message_type': msg_type,
                                'sender_id': final_sender_id,
                                'sender_nickname': sender_obj.get('nickname', ''),
                                'sender_card': sender_obj.get('card', ''),
                                'group_id': msg_group_id,
                                'raw_message': raw_message,
                                'time': msg.get('time', 0),
                                'full_message': msg
                            }
                            
                            if result_variable:
                                context.set_variable(result_variable, result_data)
                            
                            sender_name = sender_obj.get('card') or sender_obj.get('nickname', str(final_sender_id))
                            if msg_type == 'group':
                                source_desc = f"群 {msg_group_id} 的 {sender_name}"
                            else:
                                source_desc = f"{sender_name} ({final_sender_id})"
                            
                            print(f"[QQ等待消息] ✓ 匹配成功！来自 {source_desc}")
                            
                            return ModuleResult(
                                success=True,
                                message=f"收到来自 {source_desc} 的消息: {raw_message[:50]}{'...' if len(raw_message) > 50 else ''}",
                                data=result_data
                            )
                
                except Exception as e:
                    print(f"[QQ等待消息] 获取消息失败: {e}")
                
                # 等待下一次轮询
                current_time = time.time()
                actual_interval = current_time - last_poll_time
                print(f"[QQ等待消息] 实际轮询间隔: {actual_interval:.2f}秒 (配置: {poll_interval}秒)")
                last_poll_time = current_time
                
                await asyncio.sleep(poll_interval)
                elapsed += poll_interval
        
        except Exception as e:
            return ModuleResult(success=False, error=f"等待消息失败: {str(e)}")
        except Exception as e:
            return ModuleResult(success=False, error=f"等待消息失败: {str(e)}")
    
    async def _get_recent_messages(self, client: OneBotClient, source_type: str, group_id: int = None, sender_id: int = None) -> list:
        """获取最近的消息"""
        messages = []
        
        # 优化：如果指定了 sender_id 或 group_id，直接获取对应的消息历史，不需要遍历所有联系人
        if sender_id and source_type in ('any', 'private'):
            try:
                result = await client.call_api('get_friend_msg_history', {
                    'user_id': sender_id,
                    'count': 3  # 减少获取数量以提高速度
                })
                msg_list = result.get('messages', []) if isinstance(result, dict) else result if isinstance(result, list) else []
                for msg in msg_list:
                    msg['message_type'] = 'private'
                    messages.append(msg)
            except Exception as e:
                print(f"[QQ等待消息] 获取好友 {sender_id} 消息失败: {e}")
        
        if group_id and source_type in ('any', 'group'):
            try:
                result = await client.call_api('get_group_msg_history', {
                    'group_id': group_id,
                    'count': 3  # 减少获取数量以提高速度
                })
                msg_list = result.get('messages', []) if isinstance(result, dict) else result if isinstance(result, list) else []
                for msg in msg_list:
                    msg['message_type'] = 'group'
                    msg['group_id'] = group_id
                    messages.append(msg)
            except Exception as e:
                print(f"[QQ等待消息] 获取群 {group_id} 消息失败: {e}")
        
        # 如果没有指定 sender_id 和 group_id，才遍历最近联系人
        if not sender_id and not group_id:
            try:
                contacts = await client.call_api('get_recent_contact', {})
                
                if isinstance(contacts, list):
                    # 只检查最近2个联系人，减少API调用
                    for contact in contacts[:2]:
                        peer_uin = contact.get('peerUin') or contact.get('peerUid') or contact.get('user_id') or contact.get('group_id')
                        chat_type = contact.get('chatType', 1)
                        
                        if not peer_uin:
                            continue
                        
                        try:
                            peer_uin = int(peer_uin)
                        except Exception:
                            continue
                        
                        is_private = chat_type == 1
                        is_group = chat_type == 2
                        
                        if source_type == 'private' and not is_private:
                            continue
                        if source_type == 'group' and not is_group:
                            continue
                        
                        try:
                            if is_private:
                                result = await client.call_api('get_friend_msg_history', {
                                    'user_id': peer_uin,
                                    'count': 3  # 减少获取数量
                                })
                            else:
                                result = await client.call_api('get_group_msg_history', {
                                    'group_id': peer_uin,
                                    'count': 3  # 减少获取数量
                                })
                            
                            msg_list = result.get('messages', []) if isinstance(result, dict) else result if isinstance(result, list) else []
                            for msg in msg_list:
                                msg['message_type'] = 'private' if is_private else 'group'
                                if is_group:
                                    msg['group_id'] = peer_uin
                                messages.append(msg)
                        except Exception:
                            pass
                            
            except Exception as e:
                print(f"[QQ等待消息] get_recent_contact 失败: {e}")
        
        return messages
