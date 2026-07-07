"""
Apprise多渠道通知模块执行器
支持Discord、Telegram、钉钉、企业微信、飞书、Bark等多种通知渠道
"""
import asyncio
from typing import Optional
from .base import ModuleExecutor, ExecutionContext, ModuleResult, register_executor

try:
    import apprise
    APPRISE_AVAILABLE = True
except ImportError:
    APPRISE_AVAILABLE = False


class AppriseNotifyExecutor(ModuleExecutor):
    """Apprise通知基类执行器"""
    
    def get_service_url(self, config: dict, context: ExecutionContext) -> str:
        """子类需要实现此方法来构建服务URL"""
        raise NotImplementedError("子类必须实现get_service_url方法")
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        if not APPRISE_AVAILABLE:
            return ModuleResult(success=False, error="Apprise库未安装，请先安装: pip install apprise")
        
        try:
            # 获取通知内容（字段与前端面板对齐: message，兼容旧字段名 body）
            title = context.resolve_value(config.get('title', ''))
            body = context.resolve_value(config.get('message', config.get('body', '')))
            
            if not body:
                return ModuleResult(success=False, error="通知内容不能为空")
            
            # 构建服务URL
            service_url = self.get_service_url(config, context)
            
            if not service_url:
                return ModuleResult(success=False, error="服务配置不完整")
            
            # 创建Apprise实例
            apobj = apprise.Apprise()
            
            # 添加通知服务
            if not apobj.add(service_url):
                return ModuleResult(success=False, error="添加通知服务失败，请检查配置")
            
            # 发送通知（在线程池中执行以避免阻塞）
            loop = asyncio.get_event_loop()
            success = await loop.run_in_executor(
                None,
                lambda: apobj.notify(
                    body=body,
                    title=title if title else None
                )
            )
            
            if success:
                return ModuleResult(
                    success=True,
                    message=f"通知发送成功"
                )
            else:
                return ModuleResult(success=False, error="通知发送失败")
                
        except Exception as e:
            return ModuleResult(success=False, error=f"发送通知时出错: {str(e)}")


@register_executor
class NotifyDiscordExecutor(AppriseNotifyExecutor):
    """Discord通知模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "notify_discord"
    
    def get_service_url(self, config: dict, context: ExecutionContext) -> str:
        # 字段与前端面板对齐: webhookUrl(完整 Discord Webhook 地址)；兼容旧字段 webhookId/webhookToken
        webhook_id = context.resolve_value(config.get('webhookId', ''))
        webhook_token = context.resolve_value(config.get('webhookToken', ''))
        webhook_url = context.resolve_value(config.get('webhookUrl', ''))
        if (not webhook_id or not webhook_token) and webhook_url:
            # 形如 https://discord.com/api/webhooks/{id}/{token}
            parts = [p for p in webhook_url.split('?')[0].split('/') if p]
            if len(parts) >= 2:
                webhook_id, webhook_token = parts[-2], parts[-1]
        
        if not webhook_id or not webhook_token:
            return ""
        
        return f"discord://{webhook_id}/{webhook_token}"


@register_executor
class NotifyTelegramExecutor(AppriseNotifyExecutor):
    """Telegram通知模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "notify_telegram"
    
    def get_service_url(self, config: dict, context: ExecutionContext) -> str:
        bot_token = context.resolve_value(config.get('botToken', ''))
        chat_id = context.resolve_value(config.get('chatId', ''))
        
        if not bot_token or not chat_id:
            return ""
        
        return f"tgram://{bot_token}/{chat_id}"


@register_executor
class NotifyDingTalkExecutor(AppriseNotifyExecutor):
    """钉钉通知模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "notify_dingtalk"
    
    def get_service_url(self, config: dict, context: ExecutionContext) -> str:
        # 字段与前端面板对齐: webhookUrl(含 access_token 参数) + secret；兼容旧字段 accessToken
        access_token = context.resolve_value(config.get('accessToken', ''))
        secret = context.resolve_value(config.get('secret', ''))
        webhook_url = context.resolve_value(config.get('webhookUrl', ''))
        if not access_token and webhook_url:
            # 形如 https://oapi.dingtalk.com/robot/send?access_token=XXX
            try:
                from urllib.parse import urlparse, parse_qs
                qs = parse_qs(urlparse(webhook_url).query)
                access_token = (qs.get('access_token') or [''])[0]
            except Exception:
                access_token = ''
        
        if not access_token:
            return ""
        
        if secret:
            return f"dingtalk://{access_token}/{secret}"
        else:
            return f"dingtalk://{access_token}"


@register_executor
class NotifyWeComExecutor(AppriseNotifyExecutor):
    """企业微信通知模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "notify_wecom"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        # 前端面板提供的是"群机器人 Webhook 地址"(含 ?key=)，与应用消息 API(corpId/secret/agentId)
        # 是两套不同接口，apprise 无法用 key 直接构建。故有 webhookUrl 时直接 POST 到机器人地址。
        webhook_url = context.resolve_value(config.get('webhookUrl', ''))
        if webhook_url:
            body = context.resolve_value(config.get('message', config.get('body', '')))
            if not body:
                return ModuleResult(success=False, error="通知内容不能为空")
            try:
                import requests
                loop = asyncio.get_event_loop()

                def _post():
                    return requests.post(
                        webhook_url,
                        json={"msgtype": "text", "text": {"content": str(body)}},
                        timeout=15,
                    )

                resp = await loop.run_in_executor(None, _post)
                data = {}
                try:
                    data = resp.json()
                except Exception:
                    pass
                if resp.status_code == 200 and data.get("errcode", 0) == 0:
                    return ModuleResult(success=True, message="通知发送成功")
                return ModuleResult(
                    success=False,
                    error="通知发送失败: %s" % (data.get("errmsg") or resp.text[:200]),
                )
            except Exception as e:
                return ModuleResult(success=False, error=f"发送通知时出错: {str(e)}")
        # 未提供 webhookUrl 时，退回应用消息 API(wxteams)
        return await super().execute(config, context)
    
    def get_service_url(self, config: dict, context: ExecutionContext) -> str:
        corp_id = context.resolve_value(config.get('corpId', ''))
        corp_secret = context.resolve_value(config.get('corpSecret', ''))
        agent_id = context.resolve_value(config.get('agentId', ''))
        
        if not corp_id or not corp_secret or not agent_id:
            return ""
        
        return f"wxteams://{corp_id}/{corp_secret}/{agent_id}"


@register_executor
class NotifyFeishuExecutor(AppriseNotifyExecutor):
    """飞书通知模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "notify_feishu"
    
    def get_service_url(self, config: dict, context: ExecutionContext) -> str:
        # 字段与前端面板对齐: webhookUrl(完整飞书机器人地址)；兼容旧字段 webhookToken
        webhook_token = context.resolve_value(config.get('webhookToken', ''))
        webhook_url = context.resolve_value(config.get('webhookUrl', ''))
        if not webhook_token and webhook_url:
            # 形如 https://open.feishu.cn/open-apis/bot/v2/hook/{token}
            parts = [p for p in webhook_url.split('?')[0].split('/') if p]
            if parts:
                webhook_token = parts[-1]
        
        if not webhook_token:
            return ""
        
        return f"feishu://{webhook_token}"


@register_executor
class NotifyBarkExecutor(AppriseNotifyExecutor):
    """Bark通知模块执行器（iOS）"""
    
    @property
    def module_type(self) -> str:
        return "notify_bark"
    
    def get_service_url(self, config: dict, context: ExecutionContext) -> str:
        device_key = context.resolve_value(config.get('deviceKey', ''))
        
        if not device_key:
            return ""
        
        return f"bark://{device_key}"


@register_executor
class NotifySlackExecutor(AppriseNotifyExecutor):
    """Slack通知模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "notify_slack"
    
    def get_service_url(self, config: dict, context: ExecutionContext) -> str:
        # 字段与前端面板对齐: webhookUrl(完整 Slack Webhook 地址)；兼容旧字段 tokenA/tokenB/tokenC
        token_a = context.resolve_value(config.get('tokenA', ''))
        token_b = context.resolve_value(config.get('tokenB', ''))
        token_c = context.resolve_value(config.get('tokenC', ''))
        webhook_url = context.resolve_value(config.get('webhookUrl', ''))
        if (not token_a or not token_b or not token_c) and webhook_url:
            # 形如 https://hooks.slack.com/services/T.../B.../xxxx
            after = webhook_url.split('/services/', 1)
            if len(after) == 2:
                segs = [p for p in after[1].split('?')[0].split('/') if p]
                if len(segs) >= 3:
                    token_a, token_b, token_c = segs[0], segs[1], segs[2]
        
        if not token_a or not token_b or not token_c:
            return ""
        
        return f"slack://{token_a}/{token_b}/{token_c}"


@register_executor
class NotifyMSTeamsExecutor(AppriseNotifyExecutor):
    """Microsoft Teams通知模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "notify_msteams"
    
    def get_service_url(self, config: dict, context: ExecutionContext) -> str:
        webhook_url = context.resolve_value(config.get('webhookUrl', ''))
        
        if not webhook_url:
            return ""
        
        # 从webhook URL中提取token
        # 格式: https://outlook.office.com/webhook/xxx/IncomingWebhook/yyy/zzz
        if 'webhook' in webhook_url:
            parts = webhook_url.split('/')
            if len(parts) >= 3:
                # 提取最后三个部分作为token
                tokens = [p for p in parts if p and p != 'webhook' and 'office' not in p and 'IncomingWebhook' not in p]
                if len(tokens) >= 3:
                    return f"msteams://{tokens[-3]}/{tokens[-2]}/{tokens[-1]}"
        
        return ""


@register_executor
class NotifyPushoverExecutor(AppriseNotifyExecutor):
    """Pushover通知模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "notify_pushover"
    
    def get_service_url(self, config: dict, context: ExecutionContext) -> str:
        user_key = context.resolve_value(config.get('userKey', ''))
        api_token = context.resolve_value(config.get('apiToken', ''))
        
        if not user_key or not api_token:
            return ""
        
        return f"pover://{user_key}@{api_token}"


@register_executor
class NotifyPushBulletExecutor(AppriseNotifyExecutor):
    """PushBullet通知模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "notify_pushbullet"
    
    def get_service_url(self, config: dict, context: ExecutionContext) -> str:
        access_token = context.resolve_value(config.get('accessToken', ''))
        
        if not access_token:
            return ""
        
        return f"pbul://{access_token}"


@register_executor
class NotifyGotifyExecutor(AppriseNotifyExecutor):
    """Gotify通知模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "notify_gotify"
    
    def get_service_url(self, config: dict, context: ExecutionContext) -> str:
        # 字段与前端面板对齐: serverUrl + appToken；兼容旧字段 hostname/token
        hostname = context.resolve_value(config.get('hostname', ''))
        token = context.resolve_value(config.get('token', '') or config.get('appToken', ''))
        server_url = context.resolve_value(config.get('serverUrl', ''))
        scheme = 'gotify'
        if not hostname and server_url:
            try:
                from urllib.parse import urlparse
                u = urlparse(server_url if '://' in server_url else 'http://' + server_url)
                hostname = u.netloc or u.path
                if u.scheme == 'https':
                    scheme = 'gotifys'
            except Exception:
                hostname = server_url
        
        if not hostname or not token:
            return ""
        
        return f"{scheme}://{hostname}/{token}"


@register_executor
class NotifyServerChanExecutor(AppriseNotifyExecutor):
    """Server酱通知模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "notify_serverchan"
    
    def get_service_url(self, config: dict, context: ExecutionContext) -> str:
        # 字段与前端面板对齐: sendKey，兼容旧字段名 sendkey
        sendkey = context.resolve_value(config.get('sendKey', config.get('sendkey', '')))
        
        if not sendkey:
            return ""
        
        return f"schan://{sendkey}"


@register_executor
class NotifyPushPlusExecutor(AppriseNotifyExecutor):
    """PushPlus通知模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "notify_pushplus"
    
    def get_service_url(self, config: dict, context: ExecutionContext) -> str:
        token = context.resolve_value(config.get('token', ''))
        
        if not token:
            return ""
        
        # PushPlus使用自定义URL格式
        return f"json://pushplus.plus/send?token={token}"


@register_executor
class NotifyWebhookExecutor(AppriseNotifyExecutor):
    """自定义Webhook通知模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "notify_webhook"
    
    def get_service_url(self, config: dict, context: ExecutionContext) -> str:
        webhook_url = context.resolve_value(config.get('webhookUrl', ''))
        method = context.resolve_value(config.get('method', 'POST')).upper()
        
        if not webhook_url:
            return ""
        
        # 使用json://格式发送JSON数据
        if method == 'POST':
            return f"json://{webhook_url.replace('https://', '').replace('http://', '')}"
        else:
            return f"xml://{webhook_url.replace('https://', '').replace('http://', '')}"


@register_executor
class NotifyNtfyExecutor(AppriseNotifyExecutor):
    """Ntfy通知模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "notify_ntfy"
    
    def get_service_url(self, config: dict, context: ExecutionContext) -> str:
        # 字段与前端面板对齐: serverUrl + topic；兼容旧字段 hostname
        topic = context.resolve_value(config.get('topic', ''))
        hostname = context.resolve_value(config.get('hostname', ''))
        server_url = context.resolve_value(config.get('serverUrl', ''))
        scheme = 'ntfy'
        if not hostname and server_url:
            try:
                from urllib.parse import urlparse
                u = urlparse(server_url if '://' in server_url else 'https://' + server_url)
                hostname = u.netloc or u.path
                if u.scheme == 'https':
                    scheme = 'ntfys'
            except Exception:
                hostname = server_url
        if not hostname:
            hostname = 'ntfy.sh'
        
        if not topic:
            return ""
        
        return f"{scheme}://{hostname}/{topic}"


@register_executor
class NotifyMatrixExecutor(AppriseNotifyExecutor):
    """Matrix通知模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "notify_matrix"
    
    def get_service_url(self, config: dict, context: ExecutionContext) -> str:
        # 字段与前端面板对齐: homeserver + accessToken + roomId(令牌模式)；兼容旧字段 user/password/hostname/room
        user = context.resolve_value(config.get('user', ''))
        password = context.resolve_value(config.get('password', ''))
        hostname = context.resolve_value(config.get('hostname', ''))
        room = context.resolve_value(config.get('room', '') or config.get('roomId', ''))
        access_token = context.resolve_value(config.get('accessToken', ''))
        homeserver = context.resolve_value(config.get('homeserver', ''))
        # 从 homeserver URL 解析主机名与协议
        scheme = 'matrix'
        if not hostname and homeserver:
            try:
                from urllib.parse import urlparse
                u = urlparse(homeserver if '://' in homeserver else 'https://' + homeserver)
                hostname = u.netloc or u.path
                if u.scheme == 'https':
                    scheme = 'matrixs'
            except Exception:
                hostname = homeserver
        # 令牌模式（面板）：matrixs://{token}@{host}/{room}
        if access_token and hostname:
            base = f"{scheme}://{access_token}@{hostname}"
            return f"{base}/{room}" if room else base
        # 旧的用户名密码模式
        if not user or not password or not hostname or not room:
            return ""
        
        return f"matrix://{user}:{password}@{hostname}/{room}"


@register_executor
class NotifyRocketChatExecutor(AppriseNotifyExecutor):
    """Rocket.Chat通知模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "notify_rocketchat"
    
    def get_service_url(self, config: dict, context: ExecutionContext) -> str:
        # 字段与前端面板对齐: webhookUrl(Rocket.Chat 传入 Webhook)；兼容旧字段 user/password/hostname/room
        user = context.resolve_value(config.get('user', ''))
        password = context.resolve_value(config.get('password', ''))
        hostname = context.resolve_value(config.get('hostname', ''))
        room = context.resolve_value(config.get('room', ''))
        webhook_url = context.resolve_value(config.get('webhookUrl', ''))
        # Webhook 模式（面板）：从 https://{host}/hooks/{token} 解析 → rockets://{token}@{host}
        if webhook_url:
            try:
                from urllib.parse import urlparse
                u = urlparse(webhook_url if '://' in webhook_url else 'https://' + webhook_url)
                host = u.netloc
                segs = [p for p in u.path.split('/') if p]
                # 去掉 hooks 前缀，剩余作为 webhook token（可能含 token/附加token 两段）
                if segs and segs[0] == 'hooks':
                    segs = segs[1:]
                token = '/'.join(segs)
                if host and token:
                    scheme = 'rockets' if u.scheme == 'https' else 'rocket'
                    return f"{scheme}://{token}@{host}"
            except Exception:
                pass
        # 旧的用户名密码模式
        if not user or not password or not hostname or not room:
            return ""
        
        return f"rocket://{user}:{password}@{hostname}/{room}"
