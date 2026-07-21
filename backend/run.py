import uvicorn
import sys
import asyncio
import ctypes
import atexit
import signal
import json
import os

# 全局约定：后端所有相对路径（backend/data、./data 等）都以「项目根目录」为基准。
# 启动器和备用 bat 都以项目根为工作目录启动本脚本；但用户手动 `cd backend && python run.py`
# 时 cwd 会变成 backend/，导致数据被写到 backend/backend/data 等幽灵目录。
# 这里在进程入口统一把工作目录固定到项目根，彻底消除对启动方式的依赖。
_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# reload 模式下 uvicorn 会用 sys.argv 重启进程；先把脚本路径归一为绝对路径再切目录
if sys.argv and sys.argv[0] and os.path.exists(sys.argv[0]):
    sys.argv[0] = os.path.abspath(sys.argv[0])
os.chdir(_PROJECT_ROOT)

# 确保 `import app.xxx` 可用（cwd 已固定为项目根，backend/ 需手动加入搜索路径）
_BACKEND_DIR = os.path.join(_PROJECT_ROOT, 'backend')
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)


def load_config():
    """加载配置文件"""
    config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'WebRPAConfig.json')
    try:
        if os.path.exists(config_path):
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
                return config.get('backend', {})
        else:
            print(f"[Config] 配置文件不存在: {config_path}，使用默认配置")
    except Exception as e:
        print(f"[Config] 读取配置文件失败: {e}，使用默认配置")
    
    # 返回默认配置
    return {
        'host': '0.0.0.0',
        'port': 5241,
        'reload': False
    }


def cleanup_services():
    """清理所有后台服务"""
    try:
        # 停止所有屏幕共享服务
        from app.services.screen_share import stop_all_screen_shares
        stop_all_screen_shares()
        print("[Cleanup] 已停止所有屏幕共享服务")
    except Exception as e:
        print(f"[Cleanup] 清理屏幕共享服务时出错: {e}")
    
    try:
        # 停止所有文件共享服务
        from app.services.file_share import _share_servers, stop_file_share
        ports = list(_share_servers.keys())
        for port in ports:
            stop_file_share(port)
        if ports:
            print(f"[Cleanup] 已停止所有文件共享服务 (端口: {ports})")
    except Exception as e:
        print(f"[Cleanup] 清理文件共享服务时出错: {e}")


def signal_handler(signum, frame):
    """信号处理器"""
    print(f"\n[Signal] 收到信号 {signum}，正在清理...")
    cleanup_services()
    sys.exit(0)


if __name__ == "__main__":
    # Windows 上设置 DPI 感知，确保所有坐标操作使用物理像素
    if sys.platform == "win32":
        try:
            ctypes.windll.shcore.SetProcessDpiAwareness(2)  # PROCESS_PER_MONITOR_DPI_AWARE
        except:
            try:
                ctypes.windll.user32.SetProcessDPIAware()
            except:
                pass
        
        # 设置事件循环策略以支持 Playwright
        # Playwright 需要 WindowsProactorEventLoopPolicy 来支持子进程
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    
    # 注册退出清理
    atexit.register(cleanup_services)
    
    # 注册信号处理（Ctrl+C 等）
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # 加载配置
    config = load_config()
    host = config.get('host', '0.0.0.0')
    port = config.get('port', 5241)
    reload = config.get('reload', False)
    
    print(f"[Config] 后端服务配置: host={host}, port={port}, reload={reload}")
    
    uvicorn.run(
        "app.main:socket_app",
        host=host,
        port=port,
        reload=reload,
        log_level="info",
        access_log=True
    )
