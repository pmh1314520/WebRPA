"""
NapCat 服务管理
用于启动、停止和配置内置的 NapCat OneBot 服务
"""
import os
import json
import asyncio
import subprocess
import threading
import re
from typing import Optional, Dict, Any, Callable
from pathlib import Path


class NapCatService:
    """NapCat 服务管理器"""
    
    _instance: Optional['NapCatService'] = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        
        # 获取项目根目录
        self.project_root = Path(__file__).parent.parent.parent.parent
        self.napcat_dir = self.project_root / "NapCat"
        self.nodejs_dir = self.project_root / "nodejs"
        self.node_exe = self.nodejs_dir / "node.exe"
        
        self.process: Optional[subprocess.Popen] = None
        self.is_running = False
        self.qq_number: Optional[str] = None
        self.webui_url: Optional[str] = None  # 带 token 的 WebUI URL
        self.qrcode_callback: Optional[Callable] = None
        self.login_callback: Optional[Callable] = None
        self._monitor_thread: Optional[threading.Thread] = None
        self._stop_monitor = False
        
        # OneBot 配置
        self.onebot_config = {
            "http": {
                "enable": True,
                "host": "0.0.0.0",
                "port": 3000,
                "secret": "",
                "enableHeart": False,
                "enablePost": False,
                "postUrls": []
            },
            "ws": {
                "enable": False,
                "host": "0.0.0.0", 
                "port": 3001
            },
            "reverseWs": {
                "enable": False,
                "urls": []
            },
            "debug": False,
            "heartInterval": 30000,
            "messagePostFormat": "array",
            "enableLocalFile2Url": True,
            "musicSignUrl": "",
            "reportSelfMessage": False,
            "token": ""
        }
    
    def check_napcat_installed(self) -> Dict[str, Any]:
        """检查 NapCat 是否已安装"""
        napcat_exists = self.napcat_dir.exists()
        node_exists = self.node_exe.exists()
        napcat_mjs = self.napcat_dir / "napcat.mjs"
        
        return {
            "installed": napcat_exists and node_exists and napcat_mjs.exists(),
            "napcat_dir": str(self.napcat_dir),
            "napcat_exists": napcat_exists,
            "node_exists": node_exists,
            "napcat_mjs_exists": napcat_mjs.exists() if napcat_exists else False
        }
    
    def check_qq_installed(self) -> Dict[str, Any]:
        """检查 QQNT 是否已安装"""
        import winreg
        
        qq_path = None
        try:
            # 从注册表读取 QQ 安装路径
            key = winreg.OpenKey(
                winreg.HKEY_LOCAL_MACHINE,
                r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\QQ"
            )
            uninstall_string, _ = winreg.QueryValueEx(key, "UninstallString")
            winreg.CloseKey(key)
            
            # 从卸载路径提取 QQ.exe 路径
            # uninstall_string 格式: "D:\QQ\Uninstall.exe"
            # 需要去掉引号并提取目录
            uninstall_string = uninstall_string.strip('"')
            qq_dir = os.path.dirname(uninstall_string)
            qq_path = os.path.join(qq_dir, "QQ.exe")
            
            print(f"[NapCat] 检测到 QQ 安装路径: {qq_path}")
            
            if os.path.exists(qq_path):
                print(f"[NapCat] QQ.exe 存在，检测成功")
                return {
                    "installed": True,
                    "path": qq_path
                }
            else:
                print(f"[NapCat] QQ.exe 不存在于路径: {qq_path}")
        except Exception as e:
            print(f"[NapCat] 检测 QQ 安装失败: {e}")
            import traceback
            traceback.print_exc()
        
        return {
            "installed": False,
            "path": None,
            "error": "未检测到 QQNT 客户端，请先安装 QQ"
        }
    
    def get_onebot_config_path(self, qq_number: str) -> Path:
        """获取 OneBot 配置文件路径"""
        return self.napcat_dir / "config" / f"onebot11_{qq_number}.json"
    
    def save_onebot_config(self, qq_number: str, config: Optional[Dict] = None) -> bool:
        """保存 OneBot 配置"""
        try:
            config_path = self.get_onebot_config_path(qq_number)
            config_path.parent.mkdir(parents=True, exist_ok=True)
            
            final_config = config if config else self.onebot_config
            
            with open(config_path, 'w', encoding='utf-8') as f:
                json.dump(final_config, f, indent=2, ensure_ascii=False)
            
            return True
        except Exception as e:
            print(f"[NapCat] 保存配置失败: {e}")
            return False
    
    def load_onebot_config(self, qq_number: str) -> Optional[Dict]:
        """加载 OneBot 配置"""
        try:
            config_path = self.get_onebot_config_path(qq_number)
            if config_path.exists():
                with open(config_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as e:
            print(f"[NapCat] 加载配置失败: {e}")
        return None
    
    async def start(self, qq_number: str = "", qrcode_callback: Optional[Callable] = None, login_callback: Optional[Callable] = None) -> Dict[str, Any]:
        """启动 NapCat 服务"""
        self.qrcode_callback = qrcode_callback
        self.login_callback = login_callback
        
        # 检查安装状态
        install_check = self.check_napcat_installed()
        if not install_check["installed"]:
            return {
                "success": False,
                "error": "NapCat 未正确安装",
                "details": install_check
            }
        
        qq_check = self.check_qq_installed()
        if not qq_check["installed"]:
            return {
                "success": False,
                "error": qq_check.get("error", "QQNT 未安装")
            }
        
        # 检查 QQ 是否已在运行（仅作为提示，不阻止启动）
        qq_already_running = False
        try:
            result = subprocess.run(
                ["tasklist", "/FI", "IMAGENAME eq QQ.exe"],
                capture_output=True,
                text=True,
                creationflags=subprocess.CREATE_NO_WINDOW
            )
            if "QQ.exe" in result.stdout:
                qq_already_running = True
                print("[NapCat] 检测到已有 QQ 进程在运行，将启动新的 QQ 实例（支持多开）")
        except Exception:
            pass
        
        try:
            # 如果提供了 QQ 号，保存默认配置
            if qq_number:
                self.qq_number = qq_number
                existing_config = self.load_onebot_config(qq_number)
                if not existing_config:
                    self.save_onebot_config(qq_number)
            
            # 记录启动时间
            import time as time_module
            self._start_time = time_module.time()
            
            # 直接使用 NapCatWinBootMain.exe 启动，静默运行不弹窗
            napcat_launcher = self.napcat_dir / "NapCatWinBootMain.exe"
            napcat_hook_dll = self.napcat_dir / "NapCatWinBootHook.dll"
            napcat_main = self.napcat_dir / "napcat.mjs"
            load_napcat_js = self.napcat_dir / "loadNapCat.js"
            qqnt_json = self.napcat_dir / "qqnt.json"
            
            if not napcat_launcher.exists():
                return {
                    "success": False,
                    "error": f"NapCat 启动器不存在: {napcat_launcher}"
                }
            
            # 获取 QQ 路径
            qq_path = qq_check.get("path")
            if not qq_path:
                return {
                    "success": False,
                    "error": "无法获取 QQ 安装路径"
                }
            
            print(f"[NapCat] 静默启动 NapCat")
            print(f"  - 启动器: {napcat_launcher}")
            print(f"  - QQ路径: {qq_path}")
            print(f"  - QQ号: {qq_number or '(扫码登录)'}")
            
            # 生成 loadNapCat.js 文件
            napcat_main_path = str(napcat_main).replace('\\', '/')
            load_script = f'(async () => {{await import("file:///{napcat_main_path}")}})()' 
            with open(load_napcat_js, 'w', encoding='utf-8') as f:
                f.write(load_script)
            
            # 设置环境变量
            env = os.environ.copy()
            env['NAPCAT_PATCH_PACKAGE'] = str(qqnt_json)
            env['NAPCAT_LOAD_PATH'] = str(load_napcat_js)
            env['NAPCAT_INJECT_PATH'] = str(napcat_hook_dll)
            env['NAPCAT_LAUNCHER_PATH'] = str(napcat_launcher)
            env['NAPCAT_MAIN_PATH'] = str(napcat_main)
            
            # 构建命令
            cmd = [str(napcat_launcher), qq_path, str(napcat_hook_dll)]
            if qq_number:
                # 使用快速登录参数
                cmd.extend(["-q", qq_number, "--quick-login"])
            
            print(f"[NapCat] 执行命令: {' '.join(cmd)}")
            
            # 静默启动，不显示窗口
            self.process = subprocess.Popen(
                cmd,
                cwd=str(self.napcat_dir),
                env=env,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                creationflags=subprocess.CREATE_NO_WINDOW
            )
            
            # 启动二维码监控线程
            self._stop_monitor = False
            self._monitor_thread = threading.Thread(target=self._monitor_qrcode_and_login, daemon=True)
            self._monitor_thread.start()
            
            # 等待一小段时间让 QQ 启动
            await asyncio.sleep(3)
            
            # 检查 QQ 进程是否已启动
            result = subprocess.run(
                ["tasklist", "/FI", "IMAGENAME eq QQ.exe"],
                capture_output=True,
                text=True,
                creationflags=subprocess.CREATE_NO_WINDOW
            )
            
            if "QQ.exe" not in result.stdout:
                print(f"[NapCat] QQ 进程未启动")
                self._stop_monitor = True
                return {
                    "success": False,
                    "error": "QQ 启动失败，请检查 QQ 是否正确安装"
                }
            
            self.is_running = True
            print(f"[NapCat] QQ 进程已启动，NapCat 注入成功")
            
            return {
                "success": True,
                "message": "NapCat 服务启动成功，请扫码登录",
                "qq_number": qq_number,
                "onebot_url": f"http://127.0.0.1:{self.onebot_config['http']['port']}",
                "webui_url": "http://127.0.0.1:6099/webui"
            }
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            self._stop_monitor = True
            return {
                "success": False,
                "error": f"启动失败: {str(e)}"
            }
    
    def _monitor_qrcode_and_login(self):
        """监控二维码生成和登录状态 - 通过配置文件、日志文件和 OneBot API 多重检测"""
        import time
        import httpx
        
        logs_dir = self.napcat_dir / "logs"
        config_dir = self.napcat_dir / "config"
        qrcode_notified = False
        login_notified = False
        last_log_file = None
        initial_config_files = set()
        
        # 记录启动时已存在的配置文件
        if config_dir.exists():
            for f in config_dir.glob("napcat_*.json"):
                initial_config_files.add(f.name)
        
        print("[NapCat] 开始监控登录状态...")
        print(f"[NapCat] 已存在的配置文件: {initial_config_files}")
        
        while not self._stop_monitor:
            try:
                # 方法1: 检测配置目录中新增的 napcat_<QQ号>.json 文件（最可靠）
                if not login_notified and config_dir.exists():
                    for config_file in config_dir.glob("napcat_*.json"):
                        if config_file.name not in initial_config_files:
                            # 新增的配置文件，提取 QQ 号
                            match = re.search(r'napcat_(\d+)\.json', config_file.name)
                            if match:
                                logged_qq = match.group(1)
                                print(f"[NapCat] 配置文件检测到登录成功: QQ {logged_qq}")
                                login_notified = True
                                self.qq_number = logged_qq
                                if self.login_callback:
                                    try:
                                        self.login_callback(logged_qq)
                                    except Exception as e:
                                        print(f"[NapCat] 登录回调失败: {e}")
                                break
                
                # 方法2: 从日志文件检测 "本账号数据/缓存目录" 关键字
                if not login_notified and logs_dir.exists():
                    log_files = sorted(logs_dir.glob("*.log"), key=lambda f: f.stat().st_mtime, reverse=True)
                    if log_files:
                        current_log = log_files[0]
                        
                        # 如果是新的日志文件，重置
                        if last_log_file != current_log:
                            last_log_file = current_log
                            print(f"[NapCat] 监控日志文件: {current_log}")
                        
                        try:
                            with open(current_log, 'r', encoding='utf-8', errors='ignore') as f:
                                content = f.read()
                                
                                # 提取 WebUI URL（带 token）
                                webui_match = re.search(r'http://127\.0\.0\.1:6099/webui\?token=\S+', content)
                                if webui_match and not self.webui_url:
                                    self.webui_url = webui_match.group(0)
                                    print(f"[NapCat] 检测到 WebUI URL: {self.webui_url}")
                                
                                # 检测二维码生成
                                if not qrcode_notified and '二维码已保存到' in content:
                                    print(f"[NapCat] 检测到二维码生成")
                                    qrcode_notified = True
                                    if self.qrcode_callback:
                                        try:
                                            qrcode_path = self.napcat_dir / "cache" / "qrcode.png"
                                            self.qrcode_callback(str(qrcode_path))
                                        except Exception as e:
                                            print(f"[NapCat] 二维码回调失败: {e}")
                                
                                # 检测 "本账号数据/缓存目录" 表示登录成功
                                if not login_notified and '本账号数据/缓存目录' in content:
                                    print(f"[NapCat] 日志检测到登录成功标志")
                                    # 从配置目录获取 QQ 号
                                    if config_dir.exists():
                                        for config_file in config_dir.glob("napcat_*.json"):
                                            match = re.search(r'napcat_(\d+)\.json', config_file.name)
                                            if match:
                                                logged_qq = match.group(1)
                                                print(f"[NapCat] 从配置文件获取 QQ 号: {logged_qq}")
                                                login_notified = True
                                                self.qq_number = logged_qq
                                                if self.login_callback:
                                                    try:
                                                        self.login_callback(logged_qq)
                                                    except Exception as e:
                                                        print(f"[NapCat] 登录回调失败: {e}")
                                                break
                        except Exception as e:
                            print(f"[NapCat] 读取日志失败: {e}")
                
                # 方法3: 调用 OneBot API 检测登录状态（需要用户已配置 HTTP 服务）
                if not login_notified:
                    try:
                        # trust_env=False：本机回环请求必须直连。httpx 不看 Windows
                        # 代理的 bypass 列表，开着系统代理时会把它发给代理并拿到 502。
                        response = httpx.post(
                            'http://127.0.0.1:3000/get_login_info',
                            json={},
                            timeout=2,
                            trust_env=False
                        )
                        result = response.json()
                        if result.get('status') == 'ok' and result.get('data', {}).get('user_id'):
                            logged_qq = str(result['data']['user_id'])
                            print(f"[NapCat] OneBot API 检测到登录成功: QQ {logged_qq}")
                            login_notified = True
                            self.qq_number = logged_qq
                            if self.login_callback:
                                try:
                                    self.login_callback(logged_qq)
                                except Exception as e:
                                    print(f"[NapCat] 登录回调失败: {e}")
                    except Exception:
                        # OneBot 服务可能还没启动，继续尝试其他方法
                        pass
                
                if login_notified:
                    # 登录成功后退出监控
                    time.sleep(1)
                    break
                    
            except Exception as e:
                print(f"[NapCat] 监控异常: {e}")
            
            time.sleep(1)  # 每秒检查一次
        
        print("[NapCat] 监控线程结束")
    
    def get_qrcode_path(self) -> Optional[str]:
        """获取二维码图片路径"""
        qrcode_path = self.napcat_dir / "cache" / "qrcode.png"
        if qrcode_path.exists():
            return str(qrcode_path)
        return None
    
    def stop(self) -> Dict[str, Any]:
        """停止 NapCat 服务"""
        # 停止监控线程
        self._stop_monitor = True
        
        if not self.is_running:
            return {
                "success": False,
                "error": "NapCat 服务未运行"
            }
        
        try:
            # 记录启动时的 QQ 进程 PID
            napcat_qq_pids = []
            qq_closed = False
            
            # 方法1: 尝试使用 psutil 精确识别子进程
            if self.process:
                try:
                    import psutil
                    parent = psutil.Process(self.process.pid)
                    children = parent.children(recursive=True)
                    for child in children:
                        if child.name().lower() == 'qq.exe':
                            napcat_qq_pids.append(child.pid)
                            print(f"[NapCat] 识别到 NapCat 启动的 QQ 进程: PID {child.pid}")
                except ImportError:
                    print("[NapCat] psutil 未安装，将使用备用方法关闭 QQ")
                except Exception as e:
                    print(f"[NapCat] 获取子进程失败: {e}")
            
            # 终止 NapCat 启动器进程
            if self.process:
                try:
                    self.process.terminate()
                    self.process.wait(timeout=5)
                except Exception:
                    if self.process:
                        self.process.kill()
                self.process = None
            
            # 如果识别到了 NapCat 启动的 QQ 进程，精确终止它们
            if napcat_qq_pids:
                for pid in napcat_qq_pids:
                    try:
                        subprocess.run(
                            ["taskkill", "/F", "/PID", str(pid)],
                            capture_output=True,
                            creationflags=subprocess.CREATE_NO_WINDOW
                        )
                        print(f"[NapCat] 已终止 QQ 进程: PID {pid}")
                        qq_closed = True
                    except Exception as e:
                        print(f"[NapCat] 终止 QQ 进程失败 (PID {pid}): {e}")
            
            # 方法2: 如果无法精确识别，尝试通过窗口标题关闭（查找包含 QQ 号的窗口）
            if not qq_closed and self.qq_number:
                try:
                    # 使用 tasklist 查找包含 QQ 号的 QQ 进程
                    result = subprocess.run(
                        ["tasklist", "/V", "/FI", "IMAGENAME eq QQ.exe", "/FO", "CSV"],
                        capture_output=True,
                        text=True,
                        creationflags=subprocess.CREATE_NO_WINDOW
                    )
                    
                    # 解析输出，查找包含当前 QQ 号的进程
                    import csv
                    from io import StringIO
                    
                    reader = csv.reader(StringIO(result.stdout))
                    next(reader, None)  # 跳过标题行
                    
                    for row in reader:
                        if len(row) >= 2:
                            pid = row[1].strip('"')
                            window_title = row[-1].strip('"') if len(row) > 8 else ""
                            
                            # 检查窗口标题是否包含当前 QQ 号
                            if self.qq_number in window_title:
                                try:
                                    subprocess.run(
                                        ["taskkill", "/F", "/PID", pid],
                                        capture_output=True,
                                        creationflags=subprocess.CREATE_NO_WINDOW
                                    )
                                    print(f"[NapCat] 通过窗口标题识别并终止 QQ 进程: PID {pid} (QQ: {self.qq_number})")
                                    qq_closed = True
                                except Exception as e:
                                    print(f"[NapCat] 终止 QQ 进程失败 (PID {pid}): {e}")
                except Exception as e:
                    print(f"[NapCat] 通过窗口标题查找 QQ 进程失败: {e}")
            
            self.is_running = False
            self.qq_number = None  # 清除登录状态
            self.webui_url = None  # 清除 WebUI URL
            
            if qq_closed:
                return {
                    "success": True,
                    "message": "NapCat 服务已停止，QQ 窗口已关闭"
                }
            else:
                return {
                    "success": True,
                    "message": "NapCat 服务已停止（无法自动关闭 QQ 窗口，请手动关闭）"
                }
        except Exception as e:
            return {
                "success": False,
                "error": f"停止失败: {str(e)}"
            }
    
    def get_status(self) -> Dict[str, Any]:
        """获取服务状态"""
        import httpx
        
        install_check = self.check_napcat_installed()
        qq_check = self.check_qq_installed()
        
        # 检查 QQ 进程是否在运行
        qq_running = False
        if os.name == 'nt':
            try:
                result = subprocess.run(
                    ["tasklist", "/FI", "IMAGENAME eq QQ.exe"],
                    capture_output=True,
                    text=True,
                    creationflags=subprocess.CREATE_NO_WINDOW
                )
                qq_running = "QQ.exe" in result.stdout
            except Exception:
                pass
        
        # 检查 OneBot API 是否可用（这是判断 NapCat 是否真正运行的关键）
        onebot_available = False
        onebot_logged_in = False
        detected_qq_number = None
        
        try:
            # trust_env=False：本机回环请求必须直连（httpx 会无视 Windows 代理的
            # bypass 列表，开着系统代理时这里会拿到 502 而误判 OneBot 不可用）
            response = httpx.post(
                'http://127.0.0.1:3000/get_login_info',
                json={},
                timeout=2,
                trust_env=False
            )
            result = response.json()
            onebot_available = True
            
            if result.get('status') == 'ok' and result.get('data', {}).get('user_id'):
                onebot_logged_in = True
                detected_qq_number = str(result['data']['user_id'])
                print(f"[NapCat] get_status: OneBot API 检测到登录 QQ {detected_qq_number}")
        except Exception as e:
            # OneBot API 不可用
            print(f"[NapCat] get_status: OneBot API 不可用 - {e}")
            onebot_available = False
        
        # 如果 OneBot API 检测到登录，更新 qq_number
        if detected_qq_number:
            self.qq_number = detected_qq_number
        
        # 如果 QQ 在运行但 OneBot API 不可用，尝试从配置文件检测
        if qq_running and not onebot_available:
            config_dir = self.napcat_dir / "config"
            logs_dir = self.napcat_dir / "logs"
            
            # 方法1: 从配置目录检测 napcat_<QQ号>.json 文件
            if config_dir.exists():
                for config_file in config_dir.glob("napcat_*.json"):
                    match = re.search(r'napcat_(\d+)\.json', config_file.name)
                    if match:
                        detected_qq_number = match.group(1)
                        print(f"[NapCat] get_status: 从配置文件检测到 QQ {detected_qq_number}（但 OneBot API 不可用）")
                        break
            
            # 方法2: 从日志文件提取 WebUI URL
            if not self.webui_url and logs_dir.exists():
                log_files = sorted(logs_dir.glob("*.log"), key=lambda f: f.stat().st_mtime, reverse=True)
                if log_files:
                    try:
                        with open(log_files[0], 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read()
                            webui_match = re.search(r'http://127\.0\.0\.1:6099/webui\?token=\S+', content)
                            if webui_match:
                                self.webui_url = webui_match.group(0)
                    except Exception:
                        pass
        
        # 判断 NapCat 是否真正运行：
        # 1. QQ 进程在运行
        # 2. OneBot API 可用（这是关键！）
        napcat_really_running = qq_running and onebot_available
        
        # 更新内部状态
        if napcat_really_running:
            self.is_running = True
            if detected_qq_number:
                self.qq_number = detected_qq_number
        elif not qq_running:
            # QQ 进程都不在了，清除状态
            self.is_running = False
            self.qq_number = None
            self.webui_url = None
        
        return {
            "napcat_installed": install_check["installed"],
            "qq_installed": qq_check["installed"],
            "qq_path": qq_check.get("path"),
            "is_running": napcat_really_running,  # 只有 OneBot API 可用才算真正运行
            "qq_running": qq_running,  # 额外返回 QQ 进程状态
            "onebot_available": onebot_available,  # OneBot API 是否可用
            "onebot_logged_in": onebot_logged_in,  # 是否已登录
            "qq_number": self.qq_number,
            "webui_url": self.webui_url,
            "onebot_port": self.onebot_config["http"]["port"],
            "qrcode_available": self.get_qrcode_path() is not None
        }
    
    def update_config(self, qq_number: str, config_updates: Dict) -> Dict[str, Any]:
        """更新 OneBot 配置"""
        try:
            existing_config = self.load_onebot_config(qq_number)
            if existing_config:
                # 深度合并配置
                for key, value in config_updates.items():
                    if isinstance(value, dict) and key in existing_config:
                        existing_config[key].update(value)
                    else:
                        existing_config[key] = value
                self.save_onebot_config(qq_number, existing_config)
            else:
                # 使用默认配置并应用更新
                new_config = self.onebot_config.copy()
                for key, value in config_updates.items():
                    if isinstance(value, dict) and key in new_config:
                        new_config[key].update(value)
                    else:
                        new_config[key] = value
                self.save_onebot_config(qq_number, new_config)
            
            return {"success": True, "message": "配置已更新"}
        except Exception as e:
            return {"success": False, "error": str(e)}


# 全局单例
napcat_service = NapCatService()
