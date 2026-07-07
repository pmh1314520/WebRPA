"""媒体处理模块执行器 - 基于FFmpeg"""
import asyncio
import os
import subprocess
import tempfile
import time
import re
from pathlib import Path
from typing import Optional, Callable

from .base import (
    ModuleExecutor,
    ExecutionContext,
    ModuleResult,
    register_executor,
    get_ffmpeg_path,
    get_ffprobe_path,
)
from .type_utils import to_int, to_float


# 全局进程管理器 - 跟踪所有运行中的 FFmpeg 进程
class FFmpegProcessManager:
    """FFmpeg 进程管理器，用于跟踪和清理进程"""
    _instance = None
    _lock = asyncio.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._processes: dict[int, subprocess.Popen] = {}
            cls._instance._process_id = 0
        return cls._instance
    
    async def register(self, process: subprocess.Popen) -> int:
        """注册一个新进程，返回进程ID"""
        async with self._lock:
            self._process_id += 1
            pid = self._process_id
            self._processes[pid] = process
            return pid
    
    async def unregister(self, pid: int):
        """注销进程"""
        async with self._lock:
            if pid in self._processes:
                del self._processes[pid]
    
    async def terminate_all(self):
        """终止所有正在运行的 FFmpeg 进程"""
        async with self._lock:
            for pid, process in list(self._processes.items()):
                try:
                    if process.poll() is None:  # 进程仍在运行
                        process.terminate()
                        try:
                            process.wait(timeout=2)
                        except subprocess.TimeoutExpired:
                            process.kill()
                except Exception as e:
                    print(f"终止 FFmpeg 进程 {pid} 失败: {e}")
            self._processes.clear()
    
    def get_running_count(self) -> int:
        """获取正在运行的进程数量"""
        return sum(1 for p in self._processes.values() if p.poll() is None)


# 全局进程管理器实例
ffmpeg_manager = FFmpegProcessManager()


def get_media_duration(input_path: str) -> Optional[float]:
    """获取媒体文件时长（秒）"""
    ffprobe = get_ffprobe_path()
    print(f"[DEBUG] 获取媒体时长: {input_path}")
    try:
        result = subprocess.run(
            [ffprobe, '-v', 'error', '-show_entries', 'format=duration',
             '-of', 'default=noprint_wrappers=1:nokey=1', input_path],
            capture_output=True,
            text=True,
            timeout=30,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
        )
        if result.returncode == 0 and result.stdout.strip():
            duration = float(result.stdout.strip())
            print(f"[DEBUG] 媒体时长: {duration} 秒")
            return duration
        else:
            print(f"[DEBUG] 获取时长失败: returncode={result.returncode}, stderr={result.stderr}")
    except Exception as e:
        print(f"[DEBUG] 获取时长异常: {e}")
    return None


async def run_ffmpeg_with_progress(
    args: list, 
    timeout: int = 600,
    on_progress: Optional[Callable[[float, str], None]] = None,
    total_duration: Optional[float] = None,
    context: Optional['ExecutionContext'] = None
) -> tuple[bool, str]:
    """
    运行 ffmpeg 命令，支持进度回调
    
    Args:
        args: ffmpeg 参数列表
        timeout: 超时时间（秒）
        on_progress: 进度回调函数 (progress_percent, status_message) - 同步回调
        total_duration: 总时长（秒），用于计算进度
        context: 执行上下文，用于发送进度日志到前端
    
    Returns:
        (success, message)
    """
    import time as time_module
    import threading
    
    ffmpeg = get_ffmpeg_path()
    print(f"[DEBUG] FFmpeg 路径: {ffmpeg}")
    print(f"[DEBUG] FFmpeg 参数: {args}")
    
    # 使用 asyncio.subprocess 来运行 FFmpeg，这样可以更好地处理异步
    # 但为了兼容性，我们使用 subprocess + 线程的方式
    cmd = [ffmpeg, '-y'] + args  # -y 放在前面，覆盖输出文件
    print(f"[DEBUG] 完整命令: {' '.join(cmd)}")
    
    process = None
    pid = None
    stderr_output = []
    last_progress_msg = ['']
    
    try:
        # 启动 FFmpeg 进程
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            stdin=subprocess.PIPE,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
        )
        
        print(f"[DEBUG] FFmpeg 进程已启动, PID: {process.pid}")
        
        # 注册进程
        pid = await ffmpeg_manager.register(process)
        
        loop = asyncio.get_running_loop()
        start_time = time_module.time()
        progress_data = {'percent': 0, 'msg': '', 'updated': False}  # 使用字典存储进度数据
        
        def read_stderr():
            """读取 stderr 输出（FFmpeg 的进度信息在 stderr 中）"""
            last_update_time = -10  # 初始值设为负数，确保第一次立即更新
            buffer = ""
            line_count = 0
            
            try:
                # FFmpeg 使用 \r 来更新进度行，所以我们需要按字符读取
                while True:
                    char = process.stderr.read(1)
                    if not char:
                        # 进程结束
                        break
                    
                    char_str = char.decode('utf-8', errors='ignore')
                    
                    if char_str == '\r' or char_str == '\n':
                        # 一行结束，处理缓冲区
                        line_str = buffer.strip()
                        buffer = ""
                        
                        if not line_str:
                            continue
                        
                        line_count += 1
                        stderr_output.append(line_str)
                        
                        # 每10行打印一次原始输出（调试用）
                        if line_count <= 5 or line_count % 50 == 0:
                            print(f"[DEBUG] FFmpeg 输出 #{line_count}: {line_str[:100]}")
                        
                        # 解析 FFmpeg 的进度输出
                        # FFmpeg 输出格式: frame=  123 fps= 30 q=28.0 size=    1234kB time=00:00:05.00 bitrate= 123.4kbits/s speed=1.5x
                        
                        # 提取关键信息用于进度显示
                        size_match = re.search(r'size=\s*(\d+)kB', line_str)
                        time_match = re.search(r'time=(\d+):(\d+):(\d+\.?\d*)', line_str)
                        speed_match = re.search(r'speed=\s*([\d.]+)x', line_str)
                        bitrate_match = re.search(r'bitrate=\s*([\d.]+)kbits/s', line_str)
                        
                        if time_match:
                            hours = int(time_match.group(1))
                            minutes = int(time_match.group(2))
                            seconds = float(time_match.group(3))
                            current_time = hours * 3600 + minutes * 60 + seconds
                            
                            # 如果有总时长，计算百分比进度
                            if total_duration and total_duration > 0:
                                # 计算进度
                                progress = min(99.9, (current_time / total_duration) * 100)
                                elapsed = time_module.time() - start_time
                                
                                # 每3秒更新一次进度日志（减少间隔以提高响应性）
                                if elapsed - last_update_time >= 3:
                                    last_update_time = elapsed
                                    if progress > 0:
                                        eta = (elapsed / progress) * (100 - progress)
                                        msg = f"处理中 {progress:.1f}%，预计剩余 {eta:.0f}秒"
                                    else:
                                        msg = "处理中..."
                                    
                                    # 更新进度数据
                                    progress_data['percent'] = progress
                                    progress_data['msg'] = msg
                                    progress_data['updated'] = True
                                    last_progress_msg[0] = msg
                                    print(f"[DEBUG] FFmpeg 进度: {msg}")
                                    
                                    if on_progress:
                                        on_progress(progress, msg)
                            else:
                                # 没有总时长（如M3U8下载），显示已处理时间和文件大小
                                elapsed = time_module.time() - start_time
                                if elapsed - last_update_time >= 3:
                                    last_update_time = elapsed
                                    
                                    # 格式化时间
                                    time_str = f"{int(hours):02d}:{int(minutes):02d}:{int(seconds):02d}"
                                    
                                    # 构建进度消息
                                    msg_parts = [f"已处理 {time_str}"]
                                    
                                    if size_match:
                                        size_kb = int(size_match.group(1))
                                        if size_kb < 1024:
                                            msg_parts.append(f"大小 {size_kb}KB")
                                        else:
                                            msg_parts.append(f"大小 {size_kb/1024:.1f}MB")
                                    
                                    if speed_match:
                                        speed = float(speed_match.group(1))
                                        msg_parts.append(f"速度 {speed:.1f}x")
                                    
                                    if bitrate_match:
                                        bitrate = float(bitrate_match.group(1))
                                        if bitrate < 1024:
                                            msg_parts.append(f"码率 {bitrate:.0f}kbps")
                                        else:
                                            msg_parts.append(f"码率 {bitrate/1024:.1f}Mbps")
                                    
                                    msg = "，".join(msg_parts)
                                    
                                    # 更新进度数据
                                    progress_data['msg'] = msg
                                    progress_data['updated'] = True
                                    last_progress_msg[0] = msg
                                    print(f"[DEBUG] FFmpeg 进度: {msg}")
                                    
                                    if on_progress:
                                        on_progress(0, msg)  # 进度为0表示未知百分比
                        
                        # 检查是否有错误
                        if 'error' in line_str.lower() or 'invalid' in line_str.lower():
                            print(f"[DEBUG] FFmpeg 可能的错误: {line_str}")
                    else:
                        buffer += char_str
                
                print(f"[DEBUG] FFmpeg stderr 读取完成，共 {line_count} 行")
                        
            except Exception as e:
                print(f"[DEBUG] 读取 stderr 异常: {e}")
                import traceback
                traceback.print_exc()
            
            return process.wait()
        
        # 异步发送进度更新
        async def send_progress_periodically():
            """定期发送进度更新到前端"""
            last_sent = ''
            check_count = 0
            try:
                while True:
                    await asyncio.sleep(2)  # 减少检查间隔到2秒
                    check_count += 1
                    current_msg = last_progress_msg[0]
                    
                    # 调试：每次检查都打印状态
                    if check_count <= 3 or check_count % 5 == 0:
                        print(f"[DEBUG] 进度检查 #{check_count}: msg='{current_msg}', last_sent='{last_sent}', updated={progress_data.get('updated', False)}")
                    
                    if current_msg and current_msg != last_sent:
                        last_sent = current_msg
                        print(f"[DEBUG] 准备发送进度到前端: {current_msg}")
                        if context:
                            try:
                                await context.send_progress(f"🎬 {current_msg}")
                                print(f"[DEBUG] 进度已发送到前端")
                            except Exception as e:
                                print(f"[DEBUG] 发送进度失败: {e}")
                                import traceback
                                traceback.print_exc()
            except asyncio.CancelledError:
                print(f"[DEBUG] 进度发送任务已取消，共检查 {check_count} 次")
                raise
        
        # 启动进度发送任务
        progress_task = asyncio.create_task(send_progress_periodically())
        
        # 在线程池中执行 stderr 读取
        try:
            return_code = await asyncio.wait_for(
                loop.run_in_executor(None, read_stderr),
                timeout=timeout
            )
            print(f"[DEBUG] FFmpeg 返回码: {return_code}")
        except asyncio.TimeoutError:
            print(f"[DEBUG] FFmpeg 执行超时")
            if process.poll() is None:
                process.terminate()
                try:
                    process.wait(timeout=2)
                except Exception:
                    process.kill()
            return False, "FFmpeg 执行超时"
        except asyncio.CancelledError:
            print(f"[DEBUG] FFmpeg 任务被取消")
            if process.poll() is None:
                process.terminate()
                try:
                    process.wait(timeout=2)
                except Exception:
                    process.kill()
            raise
        finally:
            progress_task.cancel()
            try:
                await progress_task
            except asyncio.CancelledError:
                pass
        
        if return_code == 0:
            print(f"[DEBUG] FFmpeg 执行成功")
            return True, ""
        else:
            error_msg = '\n'.join(stderr_output[-20:])  # 最后20行错误信息
            print(f"[DEBUG] FFmpeg 执行失败: {error_msg}")
            return False, error_msg
            
    except asyncio.CancelledError:
        if process and process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=2)
            except Exception:
                process.kill()
        raise
    except Exception as e:
        print(f"[DEBUG] FFmpeg 异常: {e}")
        import traceback
        traceback.print_exc()
        if process and process.poll() is None:
            process.terminate()
        return False, str(e)
    finally:
        if pid is not None:
            await ffmpeg_manager.unregister(pid)


def run_ffmpeg(args: list, timeout: int = 600) -> tuple[bool, str]:
    """运行ffmpeg命令（同步版本，用于简单操作）"""
    ffmpeg = get_ffmpeg_path()
    cmd = [ffmpeg, '-y'] + args  # -y 放在前面
    
    print(f"[DEBUG] 同步 FFmpeg 命令: {' '.join(cmd)}")
    
    process = None
    try:
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            stdin=subprocess.PIPE,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
        )
        
        stdout, stderr = process.communicate(timeout=timeout)
        
        if process.returncode == 0:
            print(f"[DEBUG] 同步 FFmpeg 执行成功")
            return True, stdout.decode('utf-8', errors='ignore')
        else:
            error_msg = stderr.decode('utf-8', errors='ignore')
            print(f"[DEBUG] 同步 FFmpeg 执行失败: {error_msg[-500:]}")
            return False, error_msg
    except subprocess.TimeoutExpired:
        if process:
            process.terminate()
            try:
                process.wait(timeout=2)
            except Exception:
                process.kill()
        return False, "FFmpeg执行超时"
    except Exception as e:
        print(f"[DEBUG] 同步 FFmpeg 异常: {e}")
        if process and process.poll() is None:
            process.terminate()
        return False, str(e)


# [dedup] @register_executor 已移除：该类型改由拆分/专用模块统一注册，消除重复注册（spec: executor-duplicate-registration）
class FormatConvertExecutor(ModuleExecutor):
    """格式转换模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "format_convert"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        input_path = context.resolve_value(config.get('inputPath', ''))
        output_format = context.resolve_value(config.get('outputFormat', 'mp4'))  # 支持变量引用
        output_path = context.resolve_value(config.get('outputPath', ''))
        result_variable = config.get('resultVariable', 'converted_path')
        
        if not input_path:
            return ModuleResult(success=False, error="输入文件路径不能为空")
        
        if not os.path.exists(input_path):
            return ModuleResult(success=False, error=f"输入文件不存在: {input_path}")
        
        try:
            # 生成输出路径
            if not output_path:
                base_name = os.path.splitext(input_path)[0]
                output_path = f"{base_name}_converted.{output_format}"
            
            # 确保输出目录存在
            os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
            
            # 获取媒体时长用于进度计算
            duration = get_media_duration(input_path)
            
            # 构建ffmpeg命令（注意：-y 会在 run_ffmpeg_with_progress 中添加）
            args = ['-i', input_path]
            
            # 根据输出格式添加特定参数
            if output_format == 'gif':
                args.extend(['-vf', 'fps=10,scale=480:-1:flags=lanczos'])
            elif output_format in ['mp3', 'aac', 'ogg', 'flac', 'wav', 'm4a']:
                args.extend(['-vn'])  # 只提取音频
            
            args.append(output_path)
            
            # 发送开始处理的进度日志
            if duration:
                await context.send_progress(f"🎬 开始格式转换，预计时长 {duration:.0f} 秒...")
            else:
                await context.send_progress(f"🎬 开始格式转换...")
            
            # 使用带进度的 FFmpeg 执行
            success, message = await run_ffmpeg_with_progress(
                args, 
                timeout=3600,
                total_duration=duration,
                context=context
            )
            
            if not success:
                return ModuleResult(success=False, error=f"格式转换失败: {message}")
            
            if result_variable:
                context.set_variable(result_variable, output_path)
            
            return ModuleResult(
                success=True,
                message=f"格式转换完成: {output_path}",
                data={'output_path': output_path}
            )
        except asyncio.CancelledError:
            return ModuleResult(success=False, error="格式转换已取消")
        except Exception as e:
            return ModuleResult(success=False, error=f"格式转换失败: {str(e)}")


# [dedup] @register_executor 已移除：该类型改由拆分/专用模块统一注册，消除重复注册（spec: executor-duplicate-registration）
class CompressImageExecutor(ModuleExecutor):
    """图片压缩模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "compress_image"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        input_path = context.resolve_value(config.get('inputPath', ''))
        quality = to_int(config.get('quality', 80), 80, context)  # 支持变量引用
        max_width = config.get('maxWidth', '')
        max_height = config.get('maxHeight', '')
        output_path = context.resolve_value(config.get('outputPath', ''))
        result_variable = config.get('resultVariable', 'compressed_image')
        
        if not input_path:
            return ModuleResult(success=False, error="输入图片路径不能为空")
        
        if not os.path.exists(input_path):
            return ModuleResult(success=False, error=f"输入图片不存在: {input_path}")
        
        try:
            # 解析尺寸限制（支持变量引用）
            if max_width:
                max_width = to_int(max_width, 0, context)
            if max_height:
                max_height = to_int(max_height, 0, context)
            
            # 生成输出路径
            if not output_path:
                base, ext = os.path.splitext(input_path)
                output_path = f"{base}_compressed{ext}"
            
            # 确保输出目录存在
            os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
            
            # 构建ffmpeg命令（-y 会在 run_ffmpeg 中添加）
            args = ['-i', input_path]
            
            # 构建缩放滤镜
            scale_filter = []
            if max_width and max_height:
                scale_filter.append(f"scale='min({max_width},iw)':min'({max_height},ih)':force_original_aspect_ratio=decrease")
            elif max_width:
                scale_filter.append(f"scale='min({max_width},iw)':-1")
            elif max_height:
                scale_filter.append(f"scale=-1:'min({max_height},ih)'")
            
            if scale_filter:
                args.extend(['-vf', scale_filter[0]])
            
            # 设置质量
            ext = os.path.splitext(output_path)[1].lower()
            if ext in ['.jpg', '.jpeg']:
                args.extend(['-q:v', str(int((100 - quality) / 100 * 31))])  # JPEG质量 0-31
            elif ext == '.png':
                args.extend(['-compression_level', str(int((100 - quality) / 10))])
            elif ext == '.webp':
                args.extend(['-quality', str(quality)])
            
            args.append(output_path)
            
            # 发送开始处理的进度日志
            await context.send_progress(f"🖼️ 开始压缩图片...")
            
            # 图片压缩通常很快，使用简单的同步执行
            loop = asyncio.get_running_loop()
            success, message = await loop.run_in_executor(None, lambda: run_ffmpeg(args))
            
            if not success:
                return ModuleResult(success=False, error=f"图片压缩失败: {message}")
            
            # 获取压缩后的文件大小
            original_size = os.path.getsize(input_path)
            compressed_size = os.path.getsize(output_path)
            ratio = (1 - compressed_size / original_size) * 100
            
            if result_variable:
                context.set_variable(result_variable, output_path)
            
            return ModuleResult(
                success=True,
                message=f"图片压缩完成，压缩率: {ratio:.1f}%",
                data={'output_path': output_path, 'original_size': original_size, 'compressed_size': compressed_size}
            )
        except asyncio.CancelledError:
            return ModuleResult(success=False, error="图片压缩已取消")
        except Exception as e:
            return ModuleResult(success=False, error=f"图片压缩失败: {str(e)}")


# [dedup] @register_executor 已移除：该类型改由拆分/专用模块统一注册，消除重复注册（spec: executor-duplicate-registration）
class CompressVideoExecutor(ModuleExecutor):
    """视频压缩模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "compress_video"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        input_path = context.resolve_value(config.get('inputPath', ''))
        preset = context.resolve_value(config.get('preset', 'medium'))  # 支持变量引用
        crf = to_int(config.get('crf', 23), 23, context)  # 支持变量引用
        resolution = context.resolve_value(config.get('resolution', ''))  # 支持变量引用
        output_path = context.resolve_value(config.get('outputPath', ''))
        result_variable = config.get('resultVariable', 'compressed_video')
        
        if not input_path:
            return ModuleResult(success=False, error="输入视频路径不能为空")
        
        if not os.path.exists(input_path):
            return ModuleResult(success=False, error=f"输入视频不存在: {input_path}")
        
        try:
            # 生成输出路径
            if not output_path:
                base, ext = os.path.splitext(input_path)
                output_path = f"{base}_compressed{ext}"
            
            # 确保输出目录存在
            os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
            
            # 获取视频时长用于进度计算
            duration = get_media_duration(input_path)
            original_size = os.path.getsize(input_path)
            
            # 构建ffmpeg命令（注意：-y 会在 run_ffmpeg_with_progress 中添加）
            args = ['-i', input_path]
            args.extend(['-c:v', 'libx264'])
            args.extend(['-preset', preset])
            args.extend(['-crf', str(crf)])
            args.extend(['-c:a', 'aac'])
            args.extend(['-b:a', '128k'])
            
            # 设置分辨率
            if resolution:
                args.extend(['-s', resolution])
            
            args.append(output_path)
            
            print(f"[DEBUG] 视频压缩参数: 输入={input_path}, 输出={output_path}, preset={preset}, crf={crf}")
            
            # 发送开始处理的进度日志
            if duration:
                await context.send_progress(f"🎬 开始压缩视频，预计时长 {duration:.0f} 秒...")
            else:
                await context.send_progress(f"🎬 开始压缩视频...")
            
            # 使用带进度的 FFmpeg 执行
            success, message = await run_ffmpeg_with_progress(
                args, 
                timeout=7200,  # 视频压缩可能需要很长时间
                total_duration=duration,
                context=context
            )
            
            if not success:
                return ModuleResult(success=False, error=f"视频压缩失败: {message}")
            
            # 获取压缩后的文件大小
            compressed_size = os.path.getsize(output_path)
            ratio = (1 - compressed_size / original_size) * 100
            
            if result_variable:
                context.set_variable(result_variable, output_path)
            
            return ModuleResult(
                success=True,
                message=f"视频压缩完成，压缩率: {ratio:.1f}%",
                data={'output_path': output_path, 'original_size': original_size, 'compressed_size': compressed_size}
            )
        except asyncio.CancelledError:
            return ModuleResult(success=False, error="视频压缩已取消")
        except Exception as e:
            return ModuleResult(success=False, error=f"视频压缩失败: {str(e)}")



# [dedup] @register_executor 已移除：该类型改由拆分/专用模块统一注册，消除重复注册（spec: executor-duplicate-registration）
class ExtractAudioExecutor(ModuleExecutor):
    """提取音频模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "extract_audio"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        input_path = context.resolve_value(config.get('inputPath', ''))
        audio_format = context.resolve_value(config.get('audioFormat', 'mp3'))  # 支持变量引用
        audio_bitrate = context.resolve_value(config.get('audioBitrate', '192k'))  # 支持变量引用
        output_path = context.resolve_value(config.get('outputPath', ''))
        result_variable = config.get('resultVariable', 'extracted_audio')
        
        if not input_path:
            return ModuleResult(success=False, error="输入视频路径不能为空")
        
        if not os.path.exists(input_path):
            return ModuleResult(success=False, error=f"输入视频不存在: {input_path}")
        
        try:
            # 生成输出路径
            if not output_path:
                base_name = os.path.splitext(input_path)[0]
                output_path = f"{base_name}.{audio_format}"
            
            # 确保输出目录存在
            os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
            
            # 获取视频时长用于进度计算
            duration = get_media_duration(input_path)
            
            # 构建ffmpeg命令（注意：-y 会在 run_ffmpeg_with_progress 中添加）
            args = ['-i', input_path]
            args.extend(['-vn'])  # 不要视频
            args.extend(['-b:a', audio_bitrate])
            
            # 根据格式设置编码器
            if audio_format == 'mp3':
                args.extend(['-c:a', 'libmp3lame'])
            elif audio_format == 'aac':
                args.extend(['-c:a', 'aac'])
            elif audio_format == 'flac':
                args.extend(['-c:a', 'flac'])
            elif audio_format == 'ogg':
                args.extend(['-c:a', 'libvorbis'])
            
            args.append(output_path)
            
            # 发送开始处理的进度日志
            if duration:
                await context.send_progress(f"🎬 开始提取音频，预计时长 {duration:.0f} 秒...")
            else:
                await context.send_progress(f"🎬 开始提取音频...")
            
            # 使用带进度的 FFmpeg 执行
            success, message = await run_ffmpeg_with_progress(
                args,
                timeout=3600,
                total_duration=duration,
                context=context
            )
            
            if not success:
                return ModuleResult(success=False, error=f"提取音频失败: {message}")
            
            if result_variable:
                context.set_variable(result_variable, output_path)
            
            return ModuleResult(
                success=True,
                message=f"音频提取完成: {output_path}",
                data={'output_path': output_path}
            )
        except asyncio.CancelledError:
            return ModuleResult(success=False, error="提取音频已取消")
        except Exception as e:
            return ModuleResult(success=False, error=f"提取音频失败: {str(e)}")


# [dedup] @register_executor 已移除：该类型改由拆分/专用模块统一注册，消除重复注册（spec: executor-duplicate-registration）
class TrimVideoExecutor(ModuleExecutor):
    """视频裁剪模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "trim_video"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        input_path = context.resolve_value(config.get('inputPath', ''))
        start_time = context.resolve_value(config.get('startTime', '00:00:00'))
        end_time = context.resolve_value(config.get('endTime', ''))
        output_path = context.resolve_value(config.get('outputPath', ''))
        result_variable = config.get('resultVariable', 'trimmed_video')
        
        if not input_path:
            return ModuleResult(success=False, error="输入视频路径不能为空")
        
        if not os.path.exists(input_path):
            return ModuleResult(success=False, error=f"输入视频不存在: {input_path}")
        
        try:
            # 生成输出路径
            if not output_path:
                base, ext = os.path.splitext(input_path)
                output_path = f"{base}_trimmed{ext}"
            
            # 确保输出目录存在
            os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
            
            # 构建ffmpeg命令（-y 会在 run_ffmpeg 中添加）
            args = ['-i', input_path]
            args.extend(['-ss', str(start_time)])
            
            if end_time:
                args.extend(['-to', str(end_time)])
            
            args.extend(['-c', 'copy'])  # 无损裁剪
            args.append(output_path)
            
            # 发送开始处理的进度日志
            await context.send_progress(f"🎬 开始裁剪视频 ({start_time} - {end_time or '结尾'})...")
            
            # 视频裁剪使用 copy 模式，通常很快
            loop = asyncio.get_running_loop()
            success, message = await loop.run_in_executor(None, lambda: run_ffmpeg(args))
            
            if not success:
                return ModuleResult(success=False, error=f"视频裁剪失败: {message}")
            
            if result_variable:
                context.set_variable(result_variable, output_path)
            
            return ModuleResult(
                success=True,
                message=f"视频裁剪完成: {output_path}",
                data={'output_path': output_path}
            )
        except asyncio.CancelledError:
            return ModuleResult(success=False, error="视频裁剪已取消")
        except Exception as e:
            return ModuleResult(success=False, error=f"视频裁剪失败: {str(e)}")


# [dedup] @register_executor 已移除：该类型改由拆分/专用模块统一注册，消除重复注册（spec: executor-duplicate-registration）
class MergeMediaExecutor(ModuleExecutor):
    """媒体合并模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "merge_media"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        merge_type = context.resolve_value(config.get('mergeType', 'video'))  # 支持变量引用
        output_path = context.resolve_value(config.get('outputPath', ''))
        result_variable = config.get('resultVariable', 'merged_file')
        
        if not output_path:
            return ModuleResult(success=False, error="输出文件路径不能为空")
        
        # 确保输出目录存在
        os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
        
        # 音视频合并模式（将音频轨道添加到视频中）
        if merge_type == 'audio_video':
            return await self._merge_audio_video(config, context, output_path, result_variable)
        
        # 普通合并模式（多个同类型文件拼接）
        return await self._merge_concat(config, context, output_path, result_variable)
    
    async def _merge_audio_video(self, config: dict, context: ExecutionContext, output_path: str, result_variable: str) -> ModuleResult:
        """音频+视频合并：将音频轨道添加到视频中"""
        video_path = context.resolve_value(config.get('videoPath', ''))
        audio_path = context.resolve_value(config.get('audioPath', ''))
        audio_mode = context.resolve_value(config.get('audioMode', 'replace'))  # 支持变量引用
        audio_volume = to_float(config.get('audioVolume', 1.0), 1.0, context)  # 新音频音量，支持变量引用
        original_volume = to_float(config.get('originalVolume', 1.0), 1.0, context)  # 原音频音量（混合模式），支持变量引用
        
        if not video_path:
            return ModuleResult(success=False, error="视频文件路径不能为空")
        
        if not audio_path:
            return ModuleResult(success=False, error="音频文件路径不能为空")
        
        if not os.path.exists(video_path):
            return ModuleResult(success=False, error=f"视频文件不存在: {video_path}")
        
        if not os.path.exists(audio_path):
            return ModuleResult(success=False, error=f"音频文件不存在: {audio_path}")
        
        try:
            # 获取视频时长用于进度计算
            duration = get_media_duration(video_path)
            
            # 构建ffmpeg命令（注意：-y 会在 run_ffmpeg_with_progress 中添加）
            args = ['-i', video_path, '-i', audio_path]
            
            if audio_mode == 'replace':
                # 替换模式：用新音频替换原视频的音频
                args.extend([
                    '-map', '0:v:0',  # 使用第一个输入的视频流
                    '-map', '1:a:0',  # 使用第二个输入的音频流
                    '-c:v', 'copy',   # 视频流直接复制，不重新编码
                    '-c:a', 'aac',    # 音频编码为AAC
                    '-b:a', '192k',   # 音频比特率
                ])
                # 如果需要调整音量
                if audio_volume != 1.0:
                    args.extend(['-af', f'volume={audio_volume}'])
                args.extend(['-shortest'])  # 以较短的流为准
                
            elif audio_mode == 'mix':
                # 混合模式：将新音频与原视频音频混合
                filter_complex = f'[0:a]volume={original_volume}[a0];[1:a]volume={audio_volume}[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=2[aout]'
                args.extend([
                    '-filter_complex', filter_complex,
                    '-map', '0:v:0',   # 使用第一个输入的视频流
                    '-map', '[aout]',  # 使用混合后的音频
                    '-c:v', 'copy',    # 视频流直接复制
                    '-c:a', 'aac',     # 音频编码为AAC
                    '-b:a', '192k',    # 音频比特率
                ])
            
            args.append(output_path)
            
            # 发送开始处理的进度日志
            mode_text = "替换音频" if audio_mode == 'replace' else "混合音频"
            if duration:
                await context.send_progress(f"🎬 开始{mode_text}，预计时长 {duration:.0f} 秒...")
            else:
                await context.send_progress(f"🎬 开始{mode_text}...")
            
            # 使用带进度的 FFmpeg 执行
            success, message = await run_ffmpeg_with_progress(
                args,
                timeout=7200,
                total_duration=duration,
                context=context
            )
            
            if not success:
                return ModuleResult(success=False, error=f"音视频合并失败: {message}")
            
            if result_variable:
                context.set_variable(result_variable, output_path)
            
            return ModuleResult(
                success=True,
                message=f"音视频合并完成: {output_path}",
                data={'output_path': output_path, 'mode': audio_mode}
            )
        except asyncio.CancelledError:
            return ModuleResult(success=False, error="音视频合并已取消")
        except Exception as e:
            return ModuleResult(success=False, error=f"音视频合并失败: {str(e)}")
    
    async def _merge_concat(self, config: dict, context: ExecutionContext, output_path: str, result_variable: str) -> ModuleResult:
        """普通合并：多个同类型文件拼接"""
        input_files_var = config.get('inputFiles', '')
        
        if not input_files_var:
            return ModuleResult(success=False, error="输入文件列表不能为空")
        
        # 解析输入文件列表
        input_files = context.resolve_value(input_files_var)
        if isinstance(input_files, str):
            # 尝试从变量获取
            input_files = context.variables.get(input_files_var.strip('{}'), [])
        
        if not isinstance(input_files, list) or len(input_files) < 2:
            return ModuleResult(success=False, error="至少需要2个文件进行合并")
        
        # 检查所有文件是否存在
        for f in input_files:
            if not os.path.exists(f):
                return ModuleResult(success=False, error=f"文件不存在: {f}")
        
        list_file = None
        try:
            # 创建临时文件列表（使用 UTF-8 编码支持中文路径）
            with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as f:
                list_file = f.name
                for file_path in input_files:
                    # 转义路径中的特殊字符
                    escaped_path = file_path.replace("'", "'\\''")
                    f.write(f"file '{escaped_path}'\n")
            
            # 构建ffmpeg命令（-y 会在 run_ffmpeg 中添加）
            args = ['-f', 'concat', '-safe', '0', '-i', list_file, '-c', 'copy', output_path]
            
            # 发送开始处理的进度日志
            await context.send_progress(f"🎬 开始合并 {len(input_files)} 个媒体文件...")
            
            # 媒体合并使用 copy 模式，通常较快
            loop = asyncio.get_running_loop()
            success, message = await loop.run_in_executor(None, lambda: run_ffmpeg(args))
            
            if not success:
                return ModuleResult(success=False, error=f"媒体合并失败: {message}")
            
            if result_variable:
                context.set_variable(result_variable, output_path)
            
            return ModuleResult(
                success=True,
                message=f"媒体合并完成: {output_path}",
                data={'output_path': output_path, 'file_count': len(input_files)}
            )
        except asyncio.CancelledError:
            return ModuleResult(success=False, error="媒体合并已取消")
        except Exception as e:
            return ModuleResult(success=False, error=f"媒体合并失败: {str(e)}")
        finally:
            # 清理临时文件
            if list_file and os.path.exists(list_file):
                try:
                    os.unlink(list_file)
                except Exception:
                    pass


# [dedup] @register_executor 已移除：该类型改由拆分/专用模块统一注册，消除重复注册（spec: executor-duplicate-registration）
class AddWatermarkExecutor(ModuleExecutor):
    """添加水印模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "add_watermark"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        input_path = context.resolve_value(config.get('inputPath', ''))
        media_type = context.resolve_value(config.get('mediaType', 'video'))  # 支持变量引用
        watermark_type = context.resolve_value(config.get('watermarkType', 'image'))  # 支持变量引用
        position = context.resolve_value(config.get('position', 'bottomright'))  # 支持变量引用
        opacity = to_float(config.get('opacity', 0.8), 0.8, context)  # 支持变量引用
        output_path = context.resolve_value(config.get('outputPath', ''))
        result_variable = config.get('resultVariable', 'watermarked_file')
        
        if not input_path:
            return ModuleResult(success=False, error="输入文件路径不能为空")
        
        if not os.path.exists(input_path):
            return ModuleResult(success=False, error=f"输入文件不存在: {input_path}")
        
        try:
            # 生成输出路径
            if not output_path:
                base, ext = os.path.splitext(input_path)
                output_path = f"{base}_watermarked{ext}"
            
            # 确保输出目录存在
            os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
            
            # 获取媒体时长用于进度计算（仅视频）
            duration = get_media_duration(input_path) if media_type == 'video' else None
            
            # 计算水印位置
            position_map = {
                'topleft': '10:10',
                'topright': 'W-w-10:10',
                'bottomleft': '10:H-h-10',
                'bottomright': 'W-w-10:H-h-10',
                'center': '(W-w)/2:(H-h)/2',
            }
            pos = position_map.get(position, 'W-w-10:H-h-10')
            
            args = ['-i', input_path]
            
            if watermark_type == 'image':
                watermark_image = context.resolve_value(config.get('watermarkImage', ''))
                if not watermark_image or not os.path.exists(watermark_image):
                    return ModuleResult(success=False, error="水印图片不存在")
                
                args.extend(['-i', watermark_image])
                # 使用overlay滤镜添加图片水印
                filter_str = f"[1:v]format=rgba,colorchannelmixer=aa={opacity}[wm];[0:v][wm]overlay={pos}"
                args.extend(['-filter_complex', filter_str])
                
            else:  # text watermark
                watermark_text = context.resolve_value(config.get('watermarkText', ''))
                font_size = to_int(config.get('fontSize', 24), 24, context)  # 支持变量引用
                font_color = context.resolve_value(config.get('fontColor', 'white'))  # 支持变量引用
                
                if not watermark_text:
                    return ModuleResult(success=False, error="水印文字不能为空")
                
                # 使用drawtext滤镜添加文字水印
                # 位置映射到drawtext格式
                text_pos_map = {
                    'topleft': 'x=10:y=10',
                    'topright': 'x=w-tw-10:y=10',
                    'bottomleft': 'x=10:y=h-th-10',
                    'bottomright': 'x=w-tw-10:y=h-th-10',
                    'center': 'x=(w-tw)/2:y=(h-th)/2',
                }
                text_pos = text_pos_map.get(position, 'x=w-tw-10:y=h-th-10')
                
                # 转义特殊字符
                escaped_text = watermark_text.replace("'", "\\'").replace(":", "\\:")
                filter_str = f"drawtext=text='{escaped_text}':fontsize={font_size}:fontcolor={font_color}@{opacity}:{text_pos}"
                args.extend(['-vf', filter_str])
            
            if media_type == 'video':
                args.extend(['-c:a', 'copy'])  # 保持音频不变
            
            args.append(output_path)
            
            # 视频添加水印需要重新编码，可能较慢
            if media_type == 'video' and duration:
                # 发送开始处理的进度日志
                await context.send_progress(f"🎬 开始添加水印，预计时长 {duration:.0f} 秒...")
                
                success, message = await run_ffmpeg_with_progress(
                    args,
                    timeout=7200,
                    total_duration=duration,
                    context=context
                )
            else:
                await context.send_progress(f"🎬 开始添加水印...")
                loop = asyncio.get_running_loop()
                success, message = await loop.run_in_executor(None, lambda: run_ffmpeg(args, timeout=3600))
            
            if not success:
                return ModuleResult(success=False, error=f"添加水印失败: {message}")
            
            if result_variable:
                context.set_variable(result_variable, output_path)
            
            return ModuleResult(
                success=True,
                message=f"水印添加完成: {output_path}",
                data={'output_path': output_path}
            )
        except asyncio.CancelledError:
            return ModuleResult(success=False, error="添加水印已取消")
        except Exception as e:
            return ModuleResult(success=False, error=f"添加水印失败: {str(e)}")


# [dedup] @register_executor 已移除：该类型改由拆分/专用模块统一注册，消除重复注册（spec: executor-duplicate-registration）
class FaceRecognitionExecutor(ModuleExecutor):
    """人脸识别模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "face_recognition"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        source_image = context.resolve_value(config.get('sourceImage', ''))
        target_image = context.resolve_value(config.get('targetImage', ''))
        tolerance = to_float(config.get('tolerance', 0.6), 0.6, context)  # 支持变量引用
        result_variable = config.get('resultVariable', 'face_match_result')
        
        if not source_image:
            return ModuleResult(success=False, error="识别图片路径不能为空")
        
        if not target_image:
            return ModuleResult(success=False, error="目标人脸图片路径不能为空")
        
        if not os.path.exists(source_image):
            return ModuleResult(success=False, error=f"识别图片不存在: {source_image}")
        
        if not os.path.exists(target_image):
            return ModuleResult(success=False, error=f"目标人脸图片不存在: {target_image}")
        
        try:
            import face_recognition
            
            loop = asyncio.get_running_loop()
            
            def do_recognition():
                # 加载图片
                source_img = face_recognition.load_image_file(source_image)
                target_img = face_recognition.load_image_file(target_image)
                
                # 获取人脸编码
                source_encodings = face_recognition.face_encodings(source_img)
                target_encodings = face_recognition.face_encodings(target_img)
                
                if len(source_encodings) == 0:
                    return {'matched': False, 'error': '识别图片中未检测到人脸', 'source_faces': 0, 'target_faces': len(target_encodings)}
                
                if len(target_encodings) == 0:
                    return {'matched': False, 'error': '目标图片中未检测到人脸', 'source_faces': len(source_encodings), 'target_faces': 0}
                
                # 比较人脸
                target_encoding = target_encodings[0]
                matches = face_recognition.compare_faces(source_encodings, target_encoding, tolerance=tolerance)
                face_distances = face_recognition.face_distance(source_encodings, target_encoding)
                
                matched = any(matches)
                best_match_index = face_distances.argmin() if len(face_distances) > 0 else -1
                best_distance = float(face_distances[best_match_index]) if best_match_index >= 0 else 1.0
                confidence = round((1 - best_distance) * 100, 2)
                
                return {
                    'matched': matched,
                    'confidence': confidence,
                    'source_faces': len(source_encodings),
                    'target_faces': len(target_encodings),
                    'best_distance': round(best_distance, 4)
                }
            
            result = await loop.run_in_executor(None, do_recognition)
            
            if 'error' in result:
                # 未检测到人脸，返回不匹配
                if result_variable:
                    context.set_variable(result_variable, result)
                return ModuleResult(
                    success=True,
                    message=result['error'],
                    data=result,
                    branch='false'
                )
            
            if result_variable:
                context.set_variable(result_variable, result)
            
            branch = 'true' if result['matched'] else 'false'
            message = f"人脸{'匹配' if result['matched'] else '不匹配'}，置信度: {result['confidence']}%"
            
            return ModuleResult(
                success=True,
                message=message,
                data=result,
                branch=branch
            )
        except ImportError:
            return ModuleResult(success=False, error="face_recognition库未安装，请运行: pip install face_recognition")
        except Exception as e:
            return ModuleResult(success=False, error=f"人脸识别失败: {str(e)}")


# 全局缓存 easyocr reader，避免每次重新加载模型
_easyocr_reader = None
_easyocr_lock = asyncio.Lock()

def get_easyocr_reader():
    """获取缓存的 easyocr reader，使用项目内置模型目录"""
    global _easyocr_reader
    if _easyocr_reader is None:
        import easyocr
        _model_dir = str(Path(__file__).parent.parent.parent.parent / 'models' / 'easyocr' / 'model')
        print(f'[EasyOCR] 使用本地模型目录: {_model_dir}')
        _easyocr_reader = easyocr.Reader(
            ['ch_sim', 'en'],
            gpu=False,
            verbose=False,
            model_storage_directory=_model_dir,
            download_enabled=False,
        )
    return _easyocr_reader


# [dedup] @register_executor 已移除：该类型改由拆分/专用模块统一注册，消除重复注册（spec: executor-duplicate-registration）
class ImageOCRExecutor(ModuleExecutor):
    """图片OCR模块执行器 - 支持图片文件和屏幕区域识别"""
    
    @property
    def module_type(self) -> str:
        return "image_ocr"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        ocr_mode = context.resolve_value(config.get('ocrMode', 'file'))  # file 或 region
        result_variable = config.get('resultVariable', 'ocr_text')
        ocr_type = context.resolve_value(config.get('ocrType', 'general'))  # general（通用OCR）或 captcha（验证码）
        
        try:
            loop = asyncio.get_running_loop()
            
            if ocr_mode == 'region':
                # 区域识别模式 - 截取屏幕指定区域
                start_x = context.resolve_value(config.get('startX', ''))
                start_y = context.resolve_value(config.get('startY', ''))
                end_x = context.resolve_value(config.get('endX', ''))
                end_y = context.resolve_value(config.get('endY', ''))
                
                if not all([start_x, start_y, end_x, end_y]):
                    return ModuleResult(success=False, error="区域坐标不能为空")
                
                try:
                    x1, y1 = int(start_x), int(start_y)
                    x2, y2 = int(end_x), int(end_y)
                except ValueError:
                    return ModuleResult(success=False, error="坐标必须是数字")
                
                # 确保坐标顺序正确
                if x1 > x2:
                    x1, x2 = x2, x1
                if y1 > y2:
                    y1, y2 = y2, y1
                
                def capture_and_ocr():
                    import ctypes
                    from PIL import Image, ImageEnhance
                    import io
                    import numpy as np
                    
                    # 设置 DPI 感知，确保坐标准确
                    try:
                        ctypes.windll.shcore.SetProcessDpiAwareness(2)
                    except Exception:
                        try:
                            ctypes.windll.user32.SetProcessDPIAware()
                        except Exception:
                            pass
                    
                    # 使用 Windows API 截图（更准确，支持 DPI 缩放）
                    pil_image = None
                    try:
                        import win32gui
                        import win32ui
                        import win32con
                        
                        width = x2 - x1
                        height = y2 - y1
                        
                        hdesktop = win32gui.GetDesktopWindow()
                        desktop_dc = win32gui.GetWindowDC(hdesktop)
                        img_dc = win32ui.CreateDCFromHandle(desktop_dc)
                        mem_dc = img_dc.CreateCompatibleDC()
                        
                        screenshot = win32ui.CreateBitmap()
                        screenshot.CreateCompatibleBitmap(img_dc, width, height)
                        mem_dc.SelectObject(screenshot)
                        mem_dc.BitBlt((0, 0), (width, height), img_dc, (x1, y1), win32con.SRCCOPY)
                        
                        # 转换为 PIL Image
                        bmpinfo = screenshot.GetInfo()
                        bmpstr = screenshot.GetBitmapBits(True)
                        img_array = np.frombuffer(bmpstr, dtype=np.uint8).reshape(
                            (bmpinfo['bmHeight'], bmpinfo['bmWidth'], 4))
                        pil_image = Image.fromarray(img_array[:, :, :3][:, :, ::-1])  # BGRA -> RGB
                        
                        mem_dc.DeleteDC()
                        win32gui.DeleteObject(screenshot.GetHandle())
                        win32gui.ReleaseDC(hdesktop, desktop_dc)
                        
                    except ImportError:
                        # 回退到 PIL ImageGrab
                        from PIL import ImageGrab
                        pil_image = ImageGrab.grab(bbox=(x1, y1, x2, y2))
                    
                    if ocr_type == 'captcha':
                        # 验证码模式 - 使用 ddddocr
                        import ddddocr
                        gray_image = pil_image.convert('L')
                        enhancer = ImageEnhance.Contrast(gray_image)
                        enhanced_image = enhancer.enhance(1.5)
                        if enhanced_image.width < 200 or enhanced_image.height < 50:
                            scale = max(200 / enhanced_image.width, 50 / enhanced_image.height, 2)
                            new_size = (int(enhanced_image.width * scale), int(enhanced_image.height * scale))
                            enhanced_image = enhanced_image.resize(new_size, Image.Resampling.LANCZOS)
                        
                        img_bytes = io.BytesIO()
                        enhanced_image.save(img_bytes, format='PNG')
                        image_bytes = img_bytes.getvalue()
                        
                        ocr = ddddocr.DdddOcr()
                        result = ocr.classification(image_bytes)
                        return result
                    else:
                        # 通用OCR模式 - 使用 easyocr（缓存单例）
                        reader = get_easyocr_reader()
                        # 大图自动缩放到最长边 1600px
                        max_side = max(pil_image.width, pil_image.height)
                        if max_side > 1600:
                            scale = 1600 / max_side
                            new_size = (int(pil_image.width * scale), int(pil_image.height * scale))
                            pil_image = pil_image.resize(new_size, Image.Resampling.LANCZOS)
                        img_array = np.array(pil_image)
                        results = reader.readtext(img_array)
                        results_sorted = sorted(results, key=lambda x: (x[0][0][1], x[0][0][0]))
                        texts = [item[1] for item in results_sorted]
                        return '\n'.join(texts) if texts else ""
                
                text = await loop.run_in_executor(None, capture_and_ocr)
                
                if result_variable:
                    context.set_variable(result_variable, text)
                
                return ModuleResult(
                    success=True,
                    message=f"区域OCR识别完成: {text[:50]}{'...' if len(text) > 50 else ''}",
                    data={'text': text, 'length': len(text), 'region': {'x1': x1, 'y1': y1, 'x2': x2, 'y2': y2}}
                )
            
            else:
                # 文件识别模式
                image_path = context.resolve_value(config.get('imagePath', ''))
                
                if not image_path:
                    return ModuleResult(success=False, error="图片路径不能为空")
                
                if not os.path.exists(image_path):
                    return ModuleResult(success=False, error=f"图片不存在: {image_path}")
                
                def do_ocr():
                    from PIL import Image, ImageEnhance
                    import io
                    import numpy as np
                    
                    with Image.open(image_path) as img:
                        pil_image = img.convert('RGB')
                        
                        if ocr_type == 'captcha':
                            # 验证码模式 - 使用 ddddocr
                            import ddddocr
                            gray_image = pil_image.convert('L')
                            enhancer = ImageEnhance.Contrast(gray_image)
                            enhanced_image = enhancer.enhance(1.5)
                            if enhanced_image.width < 200 or enhanced_image.height < 50:
                                scale = max(200 / enhanced_image.width, 50 / enhanced_image.height, 2)
                                new_size = (int(enhanced_image.width * scale), int(enhanced_image.height * scale))
                                enhanced_image = enhanced_image.resize(new_size, Image.Resampling.LANCZOS)
                            
                            img_bytes = io.BytesIO()
                            enhanced_image.save(img_bytes, format='PNG')
                            image_bytes = img_bytes.getvalue()
                            
                            ocr = ddddocr.DdddOcr()
                            result = ocr.classification(image_bytes)
                            return result
                        else:
                            # 通用OCR模式 - 使用 easyocr（缓存单例）
                            reader = get_easyocr_reader()
                            # 大图自动缩放到最长边 1600px
                            max_side = max(pil_image.width, pil_image.height)
                            if max_side > 1600:
                                scale = 1600 / max_side
                                new_size = (int(pil_image.width * scale), int(pil_image.height * scale))
                                pil_image = pil_image.resize(new_size, Image.Resampling.LANCZOS)
                            img_array = np.array(pil_image)
                            results = reader.readtext(img_array)
                            results_sorted = sorted(results, key=lambda x: (x[0][0][1], x[0][0][0]))
                            texts = [item[1] for item in results_sorted]
                            return '\n'.join(texts) if texts else ""
                
                text = await loop.run_in_executor(None, do_ocr)
                
                if result_variable:
                    context.set_variable(result_variable, text)
                
                return ModuleResult(
                    success=True,
                    message=f"OCR识别完成: {text[:50]}{'...' if len(text) > 50 else ''}",
                    data={'text': text, 'length': len(text)}
                )
                
        except ImportError:
            return ModuleResult(success=False, error="ddddocr库未安装，请运行: pip install ddddocr")
        except Exception as e:
            return ModuleResult(success=False, error=f"OCR识别失败: {str(e)}")


# [dedup] @register_executor 已移除：该类型改由拆分/专用模块统一注册，消除重复注册（spec: executor-duplicate-registration）
class RotateVideoExecutor(ModuleExecutor):
    """视频旋转/翻转模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "rotate_video"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        input_path = context.resolve_value(config.get('inputPath', ''))
        rotate_type = context.resolve_value(config.get('rotateType', 'rotate_90'))  # 支持变量引用
        output_path = context.resolve_value(config.get('outputPath', ''))
        result_variable = config.get('resultVariable', 'rotated_video')
        
        if not input_path:
            return ModuleResult(success=False, error="输入视频路径不能为空")
        
        if not os.path.exists(input_path):
            return ModuleResult(success=False, error=f"输入视频不存在: {input_path}")
        
        try:
            # 生成输出路径
            if not output_path:
                base, ext = os.path.splitext(input_path)
                output_path = f"{base}_rotated{ext}"
            
            # 确保输出目录存在
            os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
            
            # 获取视频时长用于进度计算
            duration = get_media_duration(input_path)
            
            # 构建ffmpeg命令
            args = ['-i', input_path]
            
            # 旋转/翻转滤镜
            # rotate_90: 顺时针旋转90度
            # rotate_180: 旋转180度
            # rotate_270: 逆时针旋转90度（顺时针270度）
            # flip_h: 水平翻转
            # flip_v: 垂直翻转
            if rotate_type == 'rotate_90':
                args.extend(['-vf', 'transpose=1'])  # 顺时针90度
            elif rotate_type == 'rotate_180':
                args.extend(['-vf', 'transpose=1,transpose=1'])  # 旋转180度
            elif rotate_type == 'rotate_270':
                args.extend(['-vf', 'transpose=2'])  # 逆时针90度
            elif rotate_type == 'flip_h':
                args.extend(['-vf', 'hflip'])  # 水平翻转
            elif rotate_type == 'flip_v':
                args.extend(['-vf', 'vflip'])  # 垂直翻转
            else:
                return ModuleResult(success=False, error=f"不支持的旋转类型: {rotate_type}")
            
            args.extend(['-c:a', 'copy'])  # 音频直接复制
            args.append(output_path)
            
            # 发送开始处理的进度日志
            if duration:
                await context.send_progress(f"🎬 开始旋转视频，预计时长 {duration:.0f} 秒...")
            else:
                await context.send_progress(f"🎬 开始旋转视频...")
            
            # 使用带进度的 FFmpeg 执行
            success, message = await run_ffmpeg_with_progress(
                args,
                timeout=3600,
                total_duration=duration,
                context=context
            )
            
            if not success:
                return ModuleResult(success=False, error=f"视频旋转失败: {message}")
            
            if result_variable:
                context.set_variable(result_variable, output_path)
            
            return ModuleResult(
                success=True,
                message=f"视频旋转完成: {output_path}",
                data={'output_path': output_path}
            )
        except asyncio.CancelledError:
            return ModuleResult(success=False, error="视频旋转已取消")
        except Exception as e:
            return ModuleResult(success=False, error=f"视频旋转失败: {str(e)}")


# [dedup] @register_executor 已移除：该类型改由拆分/专用模块统一注册，消除重复注册（spec: executor-duplicate-registration）
class VideoSpeedExecutor(ModuleExecutor):
    """视频倍速播放模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "video_speed"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        input_path = context.resolve_value(config.get('inputPath', ''))
        speed = to_float(config.get('speed', 1.0), 1.0, context)  # 支持变量引用
        adjust_audio = config.get('adjustAudio', True)  # 是否同步调整音频速度
        output_path = context.resolve_value(config.get('outputPath', ''))
        result_variable = config.get('resultVariable', 'speed_video')
        
        if not input_path:
            return ModuleResult(success=False, error="输入视频路径不能为空")
        
        if not os.path.exists(input_path):
            return ModuleResult(success=False, error=f"输入视频不存在: {input_path}")
        
        if speed <= 0 or speed > 100:
            return ModuleResult(success=False, error="倍速必须在 0-100 之间")
        
        try:
            # 生成输出路径
            if not output_path:
                base, ext = os.path.splitext(input_path)
                output_path = f"{base}_speed{speed}x{ext}"
            
            # 确保输出目录存在
            os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
            
            # 获取视频时长用于进度计算
            duration = get_media_duration(input_path)
            
            # 构建ffmpeg命令
            args = ['-i', input_path]
            
            # 视频倍速滤镜
            # setpts: 设置时间戳，PTS/speed 表示加速
            video_filter = f"setpts={1/speed}*PTS"
            
            if adjust_audio:
                # 同时调整音频速度
                # atempo: 调整音频速度，范围 0.5-100
                # 如果速度超出范围，需要链式调用
                audio_filter = ""
                temp_speed = speed
                
                # atempo 单次只能在 0.5-2.0 之间，需要链式调用
                while temp_speed > 2.0:
                    audio_filter += "atempo=2.0,"
                    temp_speed /= 2.0
                while temp_speed < 0.5:
                    audio_filter += "atempo=0.5,"
                    temp_speed /= 0.5
                audio_filter += f"atempo={temp_speed}"
                
                args.extend(['-filter_complex', f"[0:v]{video_filter}[v];[0:a]{audio_filter}[a]"])
                args.extend(['-map', '[v]', '-map', '[a]'])
            else:
                # 只调整视频速度，音频直接复制
                args.extend(['-vf', video_filter])
                args.extend(['-c:a', 'copy'])
            
            args.append(output_path)
            
            # 发送开始处理的进度日志
            if duration:
                new_duration = duration / speed
                await context.send_progress(f"🎬 开始调整视频速度（{speed}x），预计时长 {new_duration:.0f} 秒...")
            else:
                await context.send_progress(f"🎬 开始调整视频速度（{speed}x）...")
            
            # 使用带进度的 FFmpeg 执行
            success, message = await run_ffmpeg_with_progress(
                args,
                timeout=7200,
                total_duration=duration,
                context=context
            )
            
            if not success:
                return ModuleResult(success=False, error=f"视频倍速处理失败: {message}")
            
            if result_variable:
                context.set_variable(result_variable, output_path)
            
            return ModuleResult(
                success=True,
                message=f"视频倍速处理完成（{speed}x）: {output_path}",
                data={'output_path': output_path, 'speed': speed}
            )
        except asyncio.CancelledError:
            return ModuleResult(success=False, error="视频倍速处理已取消")
        except Exception as e:
            return ModuleResult(success=False, error=f"视频倍速处理失败: {str(e)}")


# [dedup] @register_executor 已移除：该类型改由拆分/专用模块统一注册，消除重复注册（spec: executor-duplicate-registration）
class ExtractFrameExecutor(ModuleExecutor):
    """视频截取帧模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "extract_frame"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        input_path = context.resolve_value(config.get('inputPath', ''))
        timestamp = context.resolve_value(config.get('timestamp', '00:00:01'))  # 支持变量引用
        output_path = context.resolve_value(config.get('outputPath', ''))
        image_format = context.resolve_value(config.get('imageFormat', 'jpg'))  # 支持变量引用
        result_variable = config.get('resultVariable', 'frame_image')
        
        if not input_path:
            return ModuleResult(success=False, error="输入视频路径不能为空")
        
        if not os.path.exists(input_path):
            return ModuleResult(success=False, error=f"输入视频不存在: {input_path}")
        
        try:
            # 生成输出路径
            if not output_path:
                base_name = os.path.splitext(input_path)[0]
                output_path = f"{base_name}_frame.{image_format}"
            
            # 确保输出目录存在
            os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
            
            # 构建ffmpeg命令
            # -ss: 指定时间点
            # -i: 输入文件
            # -vframes 1: 只提取一帧
            # -q:v 2: 图片质量（1-31，数值越小质量越高）
            args = ['-ss', str(timestamp), '-i', input_path, '-vframes', '1', '-q:v', '2', output_path]
            
            # 发送开始处理的进度日志
            await context.send_progress(f"🎬 开始提取视频帧（{timestamp}）...")
            
            # 截取帧通常很快，使用同步执行
            loop = asyncio.get_running_loop()
            success, message = await loop.run_in_executor(None, lambda: run_ffmpeg(args, timeout=60))
            
            if not success:
                return ModuleResult(success=False, error=f"提取视频帧失败: {message}")
            
            if result_variable:
                context.set_variable(result_variable, output_path)
            
            return ModuleResult(
                success=True,
                message=f"视频帧提取完成: {output_path}",
                data={'output_path': output_path, 'timestamp': timestamp}
            )
        except asyncio.CancelledError:
            return ModuleResult(success=False, error="提取视频帧已取消")
        except Exception as e:
            return ModuleResult(success=False, error=f"提取视频帧失败: {str(e)}")


# [dedup] @register_executor 已移除：该类型改由拆分/专用模块统一注册，消除重复注册（spec: executor-duplicate-registration）
class AddSubtitleExecutor(ModuleExecutor):
    """视频添加字幕模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "add_subtitle"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        input_path = context.resolve_value(config.get('inputPath', ''))
        subtitle_file = context.resolve_value(config.get('subtitleFile', ''))
        output_path = context.resolve_value(config.get('outputPath', ''))
        result_variable = config.get('resultVariable', 'subtitled_video')
        
        if not input_path:
            return ModuleResult(success=False, error="输入视频路径不能为空")
        
        if not subtitle_file:
            return ModuleResult(success=False, error="字幕文件路径不能为空")
        
        if not os.path.exists(input_path):
            return ModuleResult(success=False, error=f"输入视频不存在: {input_path}")
        
        if not os.path.exists(subtitle_file):
            return ModuleResult(success=False, error=f"字幕文件不存在: {subtitle_file}")
        
        try:
            # 生成输出路径
            if not output_path:
                base, ext = os.path.splitext(input_path)
                output_path = f"{base}_subtitled{ext}"
            
            # 确保输出目录存在
            os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
            
            # 获取视频时长用于进度计算
            duration = get_media_duration(input_path)
            
            # 构建ffmpeg命令
            # 使用 subtitles 滤镜烧录字幕（硬字幕）
            # 需要转义路径中的特殊字符
            escaped_subtitle = subtitle_file.replace('\\', '/').replace(':', '\\:')
            args = ['-i', input_path, '-vf', f"subtitles='{escaped_subtitle}'", '-c:a', 'copy', output_path]
            
            # 发送开始处理的进度日志
            if duration:
                await context.send_progress(f"🎬 开始添加字幕，预计时长 {duration:.0f} 秒...")
            else:
                await context.send_progress(f"🎬 开始添加字幕...")
            
            # 使用带进度的 FFmpeg 执行
            success, message = await run_ffmpeg_with_progress(
                args,
                timeout=7200,
                total_duration=duration,
                context=context
            )
            
            if not success:
                return ModuleResult(success=False, error=f"添加字幕失败: {message}")
            
            if result_variable:
                context.set_variable(result_variable, output_path)
            
            return ModuleResult(
                success=True,
                message=f"字幕添加完成: {output_path}",
                data={'output_path': output_path}
            )
        except asyncio.CancelledError:
            return ModuleResult(success=False, error="添加字幕已取消")
        except Exception as e:
            return ModuleResult(success=False, error=f"添加字幕失败: {str(e)}")


# [dedup] @register_executor 已移除：该类型改由拆分/专用模块统一注册，消除重复注册（spec: executor-duplicate-registration）
class AdjustVolumeExecutor(ModuleExecutor):
    """音频调节音量模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "adjust_volume"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        input_path = context.resolve_value(config.get('inputPath', ''))
        volume = to_float(config.get('volume', 1.0), 1.0, context)  # 支持变量引用
        output_path = context.resolve_value(config.get('outputPath', ''))
        result_variable = config.get('resultVariable', 'adjusted_audio')
        
        if not input_path:
            return ModuleResult(success=False, error="输入文件路径不能为空")
        
        if not os.path.exists(input_path):
            return ModuleResult(success=False, error=f"输入文件不存在: {input_path}")
        
        if volume < 0 or volume > 10:
            return ModuleResult(success=False, error="音量倍数必须在 0-10 之间")
        
        try:
            # 生成输出路径
            if not output_path:
                base, ext = os.path.splitext(input_path)
                output_path = f"{base}_vol{volume}x{ext}"
            
            # 确保输出目录存在
            os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
            
            # 获取媒体时长用于进度计算
            duration = get_media_duration(input_path)
            
            # 构建ffmpeg命令
            # volume 滤镜：调整音量
            # 1.0 = 原始音量，0.5 = 减半，2.0 = 加倍
            args = ['-i', input_path, '-af', f'volume={volume}', output_path]
            
            # 发送开始处理的进度日志
            if duration:
                await context.send_progress(f"🎬 开始调整音量（{volume}x），预计时长 {duration:.0f} 秒...")
            else:
                await context.send_progress(f"🎬 开始调整音量（{volume}x）...")
            
            # 使用带进度的 FFmpeg 执行
            success, message = await run_ffmpeg_with_progress(
                args,
                timeout=3600,
                total_duration=duration,
                context=context
            )
            
            if not success:
                return ModuleResult(success=False, error=f"音量调整失败: {message}")
            
            if result_variable:
                context.set_variable(result_variable, output_path)
            
            return ModuleResult(
                success=True,
                message=f"音量调整完成（{volume}x）: {output_path}",
                data={'output_path': output_path, 'volume': volume}
            )
        except asyncio.CancelledError:
            return ModuleResult(success=False, error="音量调整已取消")
        except Exception as e:
            return ModuleResult(success=False, error=f"音量调整失败: {str(e)}")


# [dedup] @register_executor 已移除：该类型改由拆分/专用模块统一注册，消除重复注册（spec: executor-duplicate-registration）
class ResizeVideoExecutor(ModuleExecutor):
    """视频分辨率调整模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "resize_video"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        input_path = context.resolve_value(config.get('inputPath', ''))
        width = to_int(config.get('width', 0), 0, context)  # 支持变量引用
        height = to_int(config.get('height', 0), 0, context)  # 支持变量引用
        keep_aspect = config.get('keepAspect', True)  # 保持宽高比
        output_path = context.resolve_value(config.get('outputPath', ''))
        result_variable = config.get('resultVariable', 'resized_video')
        
        if not input_path:
            return ModuleResult(success=False, error="输入视频路径不能为空")
        
        if not os.path.exists(input_path):
            return ModuleResult(success=False, error=f"输入视频不存在: {input_path}")
        
        if width <= 0 and height <= 0:
            return ModuleResult(success=False, error="宽度和高度至少需要指定一个")
        
        try:
            # 生成输出路径
            if not output_path:
                base, ext = os.path.splitext(input_path)
                output_path = f"{base}_resized{ext}"
            
            # 确保输出目录存在
            os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
            
            # 获取视频时长用于进度计算
            duration = get_media_duration(input_path)
            
            # 构建ffmpeg命令
            args = ['-i', input_path]
            
            # 构建缩放滤镜
            if keep_aspect:
                # 保持宽高比
                if width > 0 and height > 0:
                    # 两者都指定，按比例缩放到不超过指定尺寸
                    scale_filter = f"scale='min({width},iw)':'min({height},ih)':force_original_aspect_ratio=decrease"
                elif width > 0:
                    # 只指定宽度
                    scale_filter = f"scale={width}:-1"
                else:
                    # 只指定高度
                    scale_filter = f"scale=-1:{height}"
            else:
                # 不保持宽高比，强制缩放
                w = width if width > 0 else 'iw'
                h = height if height > 0 else 'ih'
                scale_filter = f"scale={w}:{h}"
            
            args.extend(['-vf', scale_filter])
            args.extend(['-c:a', 'copy'])  # 音频直接复制
            args.append(output_path)
            
            # 发送开始处理的进度日志
            if duration:
                await context.send_progress(f"🎬 开始调整分辨率，预计时长 {duration:.0f} 秒...")
            else:
                await context.send_progress(f"🎬 开始调整分辨率...")
            
            # 使用带进度的 FFmpeg 执行
            success, message = await run_ffmpeg_with_progress(
                args,
                timeout=7200,
                total_duration=duration,
                context=context
            )
            
            if not success:
                return ModuleResult(success=False, error=f"分辨率调整失败: {message}")
            
            if result_variable:
                context.set_variable(result_variable, output_path)
            
            return ModuleResult(
                success=True,
                message=f"分辨率调整完成: {output_path}",
                data={'output_path': output_path, 'width': width, 'height': height}
            )
        except asyncio.CancelledError:
            return ModuleResult(success=False, error="分辨率调整已取消")
        except Exception as e:
            return ModuleResult(success=False, error=f"分辨率调整失败: {str(e)}")


# [dedup] @register_executor 已移除：该类型改由拆分/专用模块统一注册，消除重复注册（spec: executor-duplicate-registration）
class ImageGrayscaleExecutor(ModuleExecutor):
    """图片去色模块执行器 - 将彩色图片转换为灰度图"""
    
    @property
    def module_type(self) -> str:
        return "image_grayscale"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        input_path = context.resolve_value(config.get('inputPath', ''))
        output_path = context.resolve_value(config.get('outputPath', ''))
        result_variable = config.get('resultVariable', 'grayscale_image')
        
        if not input_path:
            return ModuleResult(success=False, error="输入图片路径不能为空")
        
        if not os.path.exists(input_path):
            return ModuleResult(success=False, error=f"输入图片不存在: {input_path}")
        
        try:
            from PIL import Image
            
            # 打开图片
            img = Image.open(input_path)
            
            # 转换为灰度
            grayscale_img = img.convert('L')
            
            # 生成输出路径
            if not output_path:
                base, ext = os.path.splitext(input_path)
                output_path = f"{base}_grayscale{ext}"
            
            # 确保输出目录存在
            os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
            
            # 保存图片
            grayscale_img.save(output_path)
            
            if result_variable:
                context.set_variable(result_variable, output_path)
            
            return ModuleResult(
                success=True,
                message=f"图片去色完成: {output_path}",
                data={'output_path': output_path}
            )
        except Exception as e:
            return ModuleResult(success=False, error=f"图片去色失败: {str(e)}")


# [dedup] @register_executor 已移除：该类型改由拆分/专用模块统一注册，消除重复注册（spec: executor-duplicate-registration）
class ImageRoundCornersExecutor(ModuleExecutor):
    """图片圆角化模块执行器 - 为图片添加圆角效果"""
    
    @property
    def module_type(self) -> str:
        return "image_round_corners"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        input_path = context.resolve_value(config.get('inputPath', ''))
        radius = to_int(config.get('radius', 20), 20, context)  # 圆角半径
        output_path = context.resolve_value(config.get('outputPath', ''))
        result_variable = config.get('resultVariable', 'rounded_image')
        
        if not input_path:
            return ModuleResult(success=False, error="输入图片路径不能为空")
        
        if not os.path.exists(input_path):
            return ModuleResult(success=False, error=f"输入图片不存在: {input_path}")
        
        try:
            from PIL import Image, ImageDraw
            
            # 打开图片并转换为RGBA
            img = Image.open(input_path).convert('RGBA')
            width, height = img.size
            
            # 创建圆角蒙版
            mask = Image.new('L', (width, height), 0)
            draw = ImageDraw.Draw(mask)
            
            # 绘制圆角矩形
            draw.rounded_rectangle([(0, 0), (width, height)], radius=radius, fill=255)
            
            # 应用蒙版
            output = Image.new('RGBA', (width, height), (0, 0, 0, 0))
            output.paste(img, mask=mask)
            
            # 生成输出路径
            if not output_path:
                base, _ = os.path.splitext(input_path)
                output_path = f"{base}_rounded.png"  # 圆角图片需要PNG格式保持透明
            
            # 确保输出目录存在
            os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
            
            # 保存图片
            output.save(output_path, 'PNG')
            
            if result_variable:
                context.set_variable(result_variable, output_path)
            
            return ModuleResult(
                success=True,
                message=f"图片圆角化完成，圆角半径: {radius}px",
                data={'output_path': output_path, 'radius': radius}
            )
        except Exception as e:
            return ModuleResult(success=False, error=f"图片圆角化失败: {str(e)}")


# [dedup] @register_executor 已移除：该类型改由拆分/专用模块统一注册，消除重复注册（spec: executor-duplicate-registration）
class AudioToTextExecutor(ModuleExecutor):
    """音频转文本模块执行器 - 使用本地 Whisper 模型进行语音识别"""
    
    _model_cache = {}  # 缓存已加载的模型
    
    @property
    def module_type(self) -> str:
        return "audio_to_text"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        input_path = context.resolve_value(config.get('inputPath', ''))
        language = context.resolve_value(config.get('language', 'zh'))  # 语言代码
        model_size = config.get('modelSize', 'base')  # tiny, base, small, medium, large
        result_variable = config.get('resultVariable', 'transcribed_text')
        
        if not input_path:
            return ModuleResult(success=False, error="输入音频路径不能为空")
        
        if not os.path.exists(input_path):
            return ModuleResult(success=False, error=f"输入音频不存在: {input_path}")
        
        try:
            # 使用 faster-whisper 进行本地语音识别
            try:
                from faster_whisper import WhisperModel
            except ImportError:
                return ModuleResult(
                    success=False, 
                    error="请安装 faster-whisper: pip install faster-whisper"
                )
            
            # 设置 HuggingFace 镜像（国内加速）
            import os as os_module
            os_module.environ['HF_ENDPOINT'] = 'https://hf-mirror.com'
            
            # 检查本地模型目录
            app_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            models_dir = os.path.join(app_dir, 'data', 'whisper_models')
            os.makedirs(models_dir, exist_ok=True)
            
            local_model_path = os.path.join(models_dir, model_size)
            
            # 判断使用本地模型还是下载
            if os.path.exists(local_model_path) and os.path.isdir(local_model_path) and os.listdir(local_model_path):
                model_path = local_model_path
                print(f"[音频转文本] 使用本地模型: {model_path}")
            else:
                model_path = f"Systran/faster-whisper-{model_size}"
                print(f"[音频转文本] 从镜像下载模型: {model_path}")
            
            # 检查缓存
            cache_key = f"{model_path}"
            if cache_key not in self._model_cache:
                print(f"[音频转文本] 加载 Whisper 模型: {model_path}")
                try:
                    self._model_cache[cache_key] = WhisperModel(
                        model_path, 
                        device="cpu", 
                        compute_type="int8",
                        download_root=models_dir
                    )
                except Exception as e:
                    error_msg = str(e)
                    if "internet" in error_msg.lower() or "hub" in error_msg.lower() or "connection" in error_msg.lower() or "ssl" in error_msg.lower():
                        return ModuleResult(
                            success=False,
                            error=f"模型下载失败，请检查网络连接。\n\n手动下载方法：\n1. 访问 https://hf-mirror.com/Systran/faster-whisper-{model_size}/tree/main\n2. 下载所有文件到目录: {local_model_path}"
                        )
                    raise
            
            model = self._model_cache[cache_key]
            
            print(f"[音频转文本] 开始识别: {input_path}")
            
            # 进行语音识别
            segments, info = model.transcribe(
                input_path, 
                language=language if language != 'auto' else None,
                beam_size=5
            )
            
            # 合并所有片段的文本
            text_parts = []
            for segment in segments:
                text_parts.append(segment.text.strip())
            
            text = ''.join(text_parts)  # 中文不需要空格连接
            
            if not text:
                return ModuleResult(success=False, error="无法识别音频内容")
            
            if result_variable:
                context.set_variable(result_variable, text)
            
            detected_lang = info.language if hasattr(info, 'language') else language
            
            return ModuleResult(
                success=True,
                message=f"音频转文本完成，识别到 {len(text)} 个字符，语言: {detected_lang}",
                data={'text': text, 'length': len(text), 'language': detected_lang}
            )
                    
        except Exception as e:
            return ModuleResult(success=False, error=f"音频转文本失败: {str(e)}")


# [dedup] @register_executor 已移除：该类型改由拆分/专用模块统一注册，消除重复注册（spec: executor-duplicate-registration）
class QRGenerateExecutor(ModuleExecutor):
    """二维码生成器模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "qr_generate"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        content = context.resolve_value(config.get('content', ''))
        output_dir = context.resolve_value(config.get('outputDir', ''))
        size = to_int(config.get('size', 300), 300, context)  # 图片尺寸
        error_correction = config.get('errorCorrection', 'M')  # L, M, Q, H
        result_variable = config.get('resultVariable', 'qr_image')
        
        if not content:
            return ModuleResult(success=False, error="二维码内容不能为空")
        
        try:
            import qrcode
            from PIL import Image
            
            # 设置纠错级别
            error_levels = {
                'L': qrcode.constants.ERROR_CORRECT_L,  # 7%
                'M': qrcode.constants.ERROR_CORRECT_M,  # 15%
                'Q': qrcode.constants.ERROR_CORRECT_Q,  # 25%
                'H': qrcode.constants.ERROR_CORRECT_H,  # 30%
            }
            error_level = error_levels.get(error_correction, qrcode.constants.ERROR_CORRECT_M)
            
            # 创建二维码
            qr = qrcode.QRCode(
                version=1,
                error_correction=error_level,
                box_size=10,
                border=4,
            )
            qr.add_data(content)
            qr.make(fit=True)
            
            # 生成图片
            img = qr.make_image(fill_color="black", back_color="white")
            
            # 调整尺寸
            img = img.resize((size, size), Image.Resampling.LANCZOS)
            
            # 生成文件名和输出路径
            filename = f"qrcode_{int(time.time())}.png"
            if output_dir:
                os.makedirs(output_dir, exist_ok=True)
                output_path = os.path.join(output_dir, filename)
            else:
                output_path = os.path.join(tempfile.gettempdir(), filename)
            
            # 保存图片
            img.save(output_path)
            
            if result_variable:
                context.set_variable(result_variable, output_path)
            
            return ModuleResult(
                success=True,
                message=f"二维码生成完成: {output_path}",
                data={'output_path': output_path, 'content': content[:50] + '...' if len(content) > 50 else content}
            )
        except ImportError:
            return ModuleResult(success=False, error="请安装 qrcode: pip install qrcode[pil]")
        except Exception as e:
            return ModuleResult(success=False, error=f"二维码生成失败: {str(e)}")


# [dedup] @register_executor 已移除：该类型改由拆分/专用模块统一注册，消除重复注册（spec: executor-duplicate-registration）
class QRDecodeExecutor(ModuleExecutor):
    """二维码解码器模块执行器"""
    
    @property
    def module_type(self) -> str:
        return "qr_decode"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        input_path = context.resolve_value(config.get('inputPath', ''))
        result_variable = config.get('resultVariable', 'qr_content')
        
        if not input_path:
            return ModuleResult(success=False, error="输入图片路径不能为空")
        
        if not os.path.exists(input_path):
            return ModuleResult(success=False, error=f"输入图片不存在: {input_path}")
        
        try:
            from pyzbar import pyzbar
            from PIL import Image
            
            # 打开图片
            img = Image.open(input_path)
            
            # 解码二维码
            decoded_objects = pyzbar.decode(img)
            
            if not decoded_objects:
                return ModuleResult(success=False, error="未在图片中检测到二维码")
            
            # 获取第一个二维码的内容
            qr_data = decoded_objects[0].data.decode('utf-8')
            qr_type = decoded_objects[0].type
            
            if result_variable:
                context.set_variable(result_variable, qr_data)
            
            return ModuleResult(
                success=True,
                message=f"二维码解码成功，类型: {qr_type}",
                data={'content': qr_data, 'type': qr_type, 'count': len(decoded_objects)}
            )
        except ImportError:
            return ModuleResult(success=False, error="请安装 pyzbar: pip install pyzbar")
        except Exception as e:
            return ModuleResult(success=False, error=f"二维码解码失败: {str(e)}")


# 全局录屏管理器
class ScreenRecordManager:
    """屏幕录制管理器 - 管理后台录屏任务"""
    _instance = None
    _lock = asyncio.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._recordings: dict[str, dict] = {}
        return cls._instance
    
    async def start_recording(self, recording_id: str, output_path: str, duration: int, 
                              fps: int = 30, quality: str = 'medium'):
        """开始录屏"""
        import threading
        
        async with self._lock:
            if recording_id in self._recordings:
                return False, "录屏任务已存在"
            
            self._recordings[recording_id] = {
                'output_path': output_path,
                'duration': duration,
                'status': 'recording',
                'start_time': time.time(),
                'thread': None,
                'stop_event': threading.Event()
            }
        
        # 在后台线程中执行录屏
        def record_thread():
            try:
                self._do_recording(recording_id, output_path, duration, fps, quality)
            except Exception as e:
                print(f"[ScreenRecord] 录屏异常: {e}")
                self._recordings[recording_id]['status'] = 'error'
                self._recordings[recording_id]['error'] = str(e)
        
        thread = threading.Thread(target=record_thread, daemon=True)
        self._recordings[recording_id]['thread'] = thread
        thread.start()
        
        return True, "录屏已开始"
    
    def _do_recording(self, recording_id: str, output_path: str, duration: int, 
                      fps: int, quality: str):
        """执行实际的录屏操作"""
        import cv2
        import numpy as np
        from PIL import ImageGrab
        import ctypes
        
        # 设置DPI感知
        try:
            ctypes.windll.shcore.SetProcessDpiAwareness(2)
        except Exception:
            pass
        
        # 获取屏幕尺寸
        screen = ImageGrab.grab()
        width, height = screen.size
        
        # 设置视频编码器
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        
        # 根据质量调整分辨率
        scale = {'low': 0.5, 'medium': 0.75, 'high': 1.0}.get(quality, 0.75)
        out_width = int(width * scale)
        out_height = int(height * scale)
        
        # 确保尺寸是偶数（某些编码器要求）
        out_width = out_width - (out_width % 2)
        out_height = out_height - (out_height % 2)
        
        # 确保输出目录存在
        os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
        
        # 先收集所有帧和时间戳
        frames = []
        timestamps = []
        
        stop_event = self._recordings[recording_id]['stop_event']
        start_time = time.time()
        target_interval = 1.0 / fps
        
        print(f"[ScreenRecord] 开始录制，目标帧率: {fps}, 时长: {duration}秒")
        
        try:
            while time.time() - start_time < duration:
                if stop_event.is_set():
                    break
                
                frame_start = time.time()
                
                # 截取屏幕
                screen = ImageGrab.grab()
                frame = np.array(screen)
                frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
                
                # 调整尺寸
                if scale != 1.0:
                    frame = cv2.resize(frame, (out_width, out_height))
                
                frames.append(frame)
                timestamps.append(time.time() - start_time)
                
                # 控制帧率
                elapsed = time.time() - frame_start
                if elapsed < target_interval:
                    time.sleep(target_interval - elapsed)
            
            actual_duration = time.time() - start_time
            actual_frame_count = len(frames)
            
            if actual_frame_count == 0:
                self._recordings[recording_id]['status'] = 'error'
                self._recordings[recording_id]['error'] = '未捕获到任何帧'
                return
            
            # 计算实际帧率，确保视频时长正确
            actual_fps = actual_frame_count / actual_duration
            print(f"[ScreenRecord] 实际捕获: {actual_frame_count}帧, 时长: {actual_duration:.2f}秒, 实际帧率: {actual_fps:.2f}")
            
            # 使用实际帧率写入视频，这样播放时长才正确
            out = cv2.VideoWriter(output_path, fourcc, actual_fps, (out_width, out_height))
            
            for frame in frames:
                out.write(frame)
            
            out.release()
            
            self._recordings[recording_id]['status'] = 'completed'
            print(f"[ScreenRecord] 录屏完成: {output_path}, 帧数: {actual_frame_count}, 帧率: {actual_fps:.2f}")
            
        except Exception as e:
            self._recordings[recording_id]['status'] = 'error'
            self._recordings[recording_id]['error'] = str(e)
            print(f"[ScreenRecord] 录屏异常: {e}")
    
    async def stop_recording(self, recording_id: str):
        """停止录屏"""
        async with self._lock:
            if recording_id not in self._recordings:
                return False, "录屏任务不存在"
            
            self._recordings[recording_id]['stop_event'].set()
            return True, "已发送停止信号"
    
    def get_status(self, recording_id: str) -> dict:
        """获取录屏状态"""
        return self._recordings.get(recording_id, {})


# 全局录屏管理器实例
screen_record_manager = ScreenRecordManager()


# [dedup] @register_executor 已移除：该类型改由拆分/专用模块统一注册，消除重复注册（spec: executor-duplicate-registration）
class ScreenRecordExecutor(ModuleExecutor):
    """桌面录屏模块执行器 - 非阻塞式录屏"""
    
    @property
    def module_type(self) -> str:
        return "screen_record"
    
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        duration = to_int(config.get('duration', 30), 30, context)  # 录制时长（秒）
        output_folder = context.resolve_value(config.get('outputFolder', ''))
        filename = context.resolve_value(config.get('filename', ''))
        fps = to_int(config.get('fps', 30), 30, context)  # 帧率
        quality = context.resolve_value(config.get('quality', 'medium'))  # low, medium, high
        result_variable = config.get('resultVariable', 'recording_path')
        
        try:
            # 生成输出路径
            if not output_folder:
                output_folder = os.path.join(os.path.expanduser('~'), 'Videos', 'WebRPA')
            
            os.makedirs(output_folder, exist_ok=True)
            
            if not filename:
                timestamp = time.strftime('%Y%m%d_%H%M%S')
                filename = f"screen_record_{timestamp}.mp4"
            
            if not filename.endswith('.mp4'):
                filename += '.mp4'
            
            output_path = os.path.join(output_folder, filename)
            
            # 生成唯一的录屏ID
            recording_id = f"rec_{int(time.time() * 1000)}"
            
            # 开始录屏（非阻塞）
            success, message = await screen_record_manager.start_recording(
                recording_id, output_path, duration, fps, quality
            )
            
            if not success:
                return ModuleResult(success=False, error=message)
            
            if result_variable:
                context.set_variable(result_variable, output_path)
            
            return ModuleResult(
                success=True,
                message=f"录屏已开始，时长: {duration}秒，保存到: {output_path}",
                data={
                    'recording_id': recording_id,
                    'output_path': output_path,
                    'duration': duration,
                    'fps': fps,
                    'quality': quality
                }
            )
        except Exception as e:
            return ModuleResult(success=False, error=f"启动录屏失败: {str(e)}")
