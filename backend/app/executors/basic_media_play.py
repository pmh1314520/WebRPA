"""基础模块执行器 - 媒体播放相关"""
import asyncio

from .base import ModuleExecutor, ExecutionContext, ModuleResult, register_executor
from .type_utils import to_int, to_float


@register_executor
class PlaySoundExecutor(ModuleExecutor):
    """播放提示音模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "play_sound"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        import winsound
        
        beep_count = to_int(config.get('beepCount', 1), 1, context)
        beep_interval = to_float(config.get('beepInterval', 0.3), 0.3, context)  # 秒
        
        try:
            for i in range(beep_count):
                winsound.Beep(1000, 200)
                if i < beep_count - 1:
                    await asyncio.sleep(beep_interval)
            
            return ModuleResult(success=True, message=f"已播放 {beep_count} 次提示音", data={'count': beep_count})
        except Exception as e:
            return ModuleResult(success=False, error=f"播放提示音失败: {str(e)}")


@register_executor
class SystemNotificationExecutor(ModuleExecutor):
    """系统消息弹窗模块执行器 - Windows 系统右下角通知"""
    
    @property
    def module_type(self) -> str:
        return "system_notification"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        title = context.resolve_value(config.get('notifyTitle', 'WebRPA通知')) or 'WebRPA通知'
        message = context.resolve_value(config.get('notifyMessage', ''))
        duration = to_int(config.get('duration', 5), 5, context)
        if duration <= 0:
            duration = 5

        if not message:
            return ModuleResult(success=False, error="通知消息不能为空")

        try:
            # 用自绘的 tkinter 通知窗，精确按 duration 秒显示后自动关闭。
            # （Windows 系统 toast/plyer 会忽略应用指定的时长，固定约 5-7 秒，无法控制。）
            def show_custom_toast():
                import threading

                def _toast():
                    try:
                        import tkinter as tk
                        root = tk.Tk()
                        root.overrideredirect(True)
                        root.attributes('-topmost', True)
                        try:
                            root.attributes('-alpha', 0.0)
                        except Exception:
                            pass

                        W, H = 360, 104
                        sw = root.winfo_screenwidth()
                        sh = root.winfo_screenheight()
                        x = sw - W - 24
                        y = sh - H - 64
                        root.geometry(f"{W}x{H}+{x}+{y}")
                        root.configure(bg='#1e2024')

                        # 卡片
                        card = tk.Frame(root, bg='#ffffff')
                        card.place(x=0, y=0, width=W, height=H)
                        # 品牌色左侧条
                        tk.Frame(card, bg='#2563eb').place(x=0, y=0, width=5, height=H)

                        tk.Label(
                            card, text=title, bg='#ffffff', fg='#0f172a',
                            font=('Microsoft YaHei UI', 11, 'bold'), anchor='w', justify='left',
                        ).place(x=18, y=14, width=W - 34)
                        tk.Label(
                            card, text=message, bg='#ffffff', fg='#475569',
                            font=('Microsoft YaHei UI', 10), anchor='nw', justify='left',
                            wraplength=W - 40,
                        ).place(x=18, y=42, width=W - 34, height=H - 52)

                        # 点击关闭
                        def _close():
                            try:
                                root.destroy()
                            except Exception:
                                pass
                        for w in (root, card):
                            w.bind('<Button-1>', lambda e: _close())

                        # 淡入
                        def _fade_in(a=0.0):
                            a = min(1.0, a + 0.12)
                            try:
                                root.attributes('-alpha', a)
                            except Exception:
                                pass
                            if a < 1.0:
                                root.after(16, lambda: _fade_in(a))
                        _fade_in()

                        # 到时淡出并关闭
                        def _fade_out(a=1.0):
                            a -= 0.12
                            try:
                                root.attributes('-alpha', max(0.0, a))
                            except Exception:
                                pass
                            if a <= 0.0:
                                _close()
                            else:
                                root.after(16, lambda: _fade_out(a))
                        root.after(int(duration * 1000), _fade_out)

                        root.mainloop()
                    except Exception as e:
                        # tkinter 不可用时回退到 plyer 系统通知（时长不可控）
                        try:
                            from plyer import notification
                            notification.notify(title=title, message=message, timeout=duration, app_name='WebRPA')
                        except Exception:
                            print(f"[系统消息] 显示失败: {e}")

                t = threading.Thread(target=_toast, daemon=True)
                t.start()

            show_custom_toast()

            return ModuleResult(success=True, message=f"已显示系统通知: {title}（{duration}秒）",
                              data={'title': title, 'message': message, 'duration': duration})

        except Exception as e:
            return ModuleResult(success=False, error=f"系统通知失败: {str(e)}")


@register_executor
class PlayMusicExecutor(ModuleExecutor):
    """播放音乐模块执行器 - 通过前端浏览器播放，支持播放器UI控制"""

    @property
    def module_type(self) -> str:
        return "play_music"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        import os as _os_pkg
        if _os_pkg.environ.get('WEBRPA_PACKAGED'):
            from app.services.packaged_ui import request_play_music_sync
        else:
            from app.main import request_play_music_sync

        audio_url = context.resolve_value(config.get("audioUrl", ""))
        wait_for_end_raw = config.get("waitForEnd", True)
        if isinstance(wait_for_end_raw, str):
            wait_for_end_raw = context.resolve_value(wait_for_end_raw)
        wait_for_end = wait_for_end_raw in [True, 'true', 'True', '1', 1]

        if not audio_url:
            return ModuleResult(success=False, error="音频URL不能为空")

        try:
            url = audio_url.strip()
            if not url.startswith(("http://", "https://")):
                url = "https://" + url

            loop = asyncio.get_running_loop()
            result = await loop.run_in_executor(
                None,
                lambda: request_play_music_sync(audio_url=url, wait_for_end=wait_for_end, timeout=600)
            )

            if not result.get("success"):
                error_msg = result.get("error", "未知错误")
                return ModuleResult(success=False, error=f"播放音乐失败: {error_msg}")

            source_display = audio_url[:50] + "..." if len(audio_url) > 50 else audio_url
            return ModuleResult(success=True, message=f"播放完成: {source_display}")

        except Exception as e:
            return ModuleResult(success=False, error=f"播放音乐失败: {str(e)}")


@register_executor
class PlayVideoExecutor(ModuleExecutor):
    """播放视频模块执行器 - 通过前端浏览器播放，支持播放器UI控制"""

    @property
    def module_type(self) -> str:
        return "play_video"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        import os as _os_pkg
        if _os_pkg.environ.get('WEBRPA_PACKAGED'):
            from app.services.packaged_ui import request_play_video_sync
        else:
            from app.main import request_play_video_sync

        video_url = context.resolve_value(config.get("videoUrl", ""))
        wait_for_end_raw = config.get("waitForEnd", True)
        if isinstance(wait_for_end_raw, str):
            wait_for_end_raw = context.resolve_value(wait_for_end_raw)
        wait_for_end = wait_for_end_raw in [True, 'true', 'True', '1', 1]

        if not video_url:
            return ModuleResult(success=False, error="视频URL不能为空")

        try:
            url = video_url.strip()
            if not url.startswith(("http://", "https://")):
                url = "https://" + url

            loop = asyncio.get_running_loop()
            result = await loop.run_in_executor(
                None,
                lambda: request_play_video_sync(video_url=url, wait_for_end=wait_for_end, timeout=3600)
            )

            if not result.get("success"):
                error_msg = result.get("error", "未知错误")
                return ModuleResult(success=False, error=f"播放视频失败: {error_msg}")

            source_display = video_url[:50] + "..." if len(video_url) > 50 else video_url
            return ModuleResult(success=True, message=f"播放完成: {source_display}")

        except Exception as e:
            return ModuleResult(success=False, error=f"播放视频失败: {str(e)}")


@register_executor
class ViewImageExecutor(ModuleExecutor):
    """查看图片模块执行器 - 通过前端浏览器显示图片查看器"""

    @property
    def module_type(self) -> str:
        return "view_image"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        import os as _os_pkg
        if _os_pkg.environ.get('WEBRPA_PACKAGED'):
            from app.services.packaged_ui import request_view_image_sync
        else:
            from app.main import request_view_image_sync

        image_url = context.resolve_value(config.get("imageUrl", ""))
        auto_close_raw = config.get("autoClose", False)
        if isinstance(auto_close_raw, str):
            auto_close_raw = context.resolve_value(auto_close_raw)
        auto_close = auto_close_raw in [True, 'true', 'True', '1', 1]
        display_time = to_float(config.get("displayTime", 5), 5, context)  # 显示时长(秒)
        display_time_ms = int(display_time * 1000)  # 转换为毫秒

        if not image_url:
            return ModuleResult(success=False, error="图片URL不能为空")

        try:
            url = image_url.strip()
            if not url.startswith(("http://", "https://")):
                url = "https://" + url

            loop = asyncio.get_running_loop()
            result = await loop.run_in_executor(
                None,
                lambda: request_view_image_sync(image_url=url, auto_close=auto_close, display_time=display_time_ms, timeout=300)
            )

            if not result.get("success"):
                error_msg = result.get("error", "未知错误")
                return ModuleResult(success=False, error=f"查看图片失败: {error_msg}")

            source_display = image_url[:50] + "..." if len(image_url) > 50 else image_url
            return ModuleResult(success=True, message=f"图片查看完成: {source_display}")

        except Exception as e:
            return ModuleResult(success=False, error=f"查看图片失败: {str(e)}")


@register_executor
class TextToSpeechExecutor(ModuleExecutor):
    """文本朗读模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "text_to_speech"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        import os as _os_pkg
        if _os_pkg.environ.get('WEBRPA_PACKAGED'):
            from app.services.packaged_ui import request_tts_sync
        else:
            from app.main import request_tts_sync
        
        text = context.resolve_value(config.get('text', ''))
        lang = context.resolve_value(config.get('lang', 'zh-CN'))
        rate = to_float(config.get('rate', 1), 1.0, context)
        pitch = to_float(config.get('pitch', 1), 1.0, context)
        volume = to_float(config.get('volume', 1), 1.0, context)
        
        if not text:
            return ModuleResult(success=False, error="朗读文本不能为空")
        
        try:
            loop = asyncio.get_running_loop()
            success = await loop.run_in_executor(
                None,
                lambda: request_tts_sync(text=text, lang=lang, rate=rate, pitch=pitch, volume=volume, timeout=60)
            )
            
            if success:
                return ModuleResult(success=True, message=f"已朗读文本: {text[:50]}{'...' if len(text) > 50 else ''}",
                                  data={'text': text, 'lang': lang})
            else:
                return ModuleResult(success=False, error="语音合成超时或失败")
        except Exception as e:
            return ModuleResult(success=False, error=f"文本朗读失败: {str(e)}")
