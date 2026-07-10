"""自动化浏览器API路由 - 直接使用 browser_engine（主进程异步 Playwright）"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Literal

router = APIRouter(prefix="/api/browser", tags=["browser"])


class BrowserConfig(BaseModel):
    type: Literal['msedge', 'chrome', 'chromium', 'firefox'] = 'msedge'
    executablePath: Optional[str] = None
    userDataDir: Optional[str] = None
    fullscreen: bool = False
    launchArgs: Optional[str] = None
    # 需加载的"已解压浏览器扩展目录"，每行一个（仅有头模式生效）
    extensionDirs: Optional[str] = None


class OpenBrowserRequest(BaseModel):
    url: str = "about:blank"
    browserConfig: Optional[BrowserConfig] = None


class NavigateRequest(BaseModel):
    url: str


@router.post("/open")
async def open_browser(request: OpenBrowserRequest = OpenBrowserRequest()):
    """打开自动化浏览器"""
    from app.services import browser_engine

    browser_type = 'msedge'
    executable_path = None
    user_data_dir = None
    fullscreen = False
    launch_args = None
    extension_dirs = None
    if request.browserConfig:
        browser_type = request.browserConfig.type
        executable_path = request.browserConfig.executablePath
        user_data_dir = request.browserConfig.userDataDir
        fullscreen = request.browserConfig.fullscreen
        launch_args = request.browserConfig.launchArgs
        extension_dirs = request.browserConfig.extensionDirs

    if browser_engine.is_open():
        # 已打开，如需导航则导航
        if request.url != "about:blank":
            await browser_engine.navigate_to(request.url)
        return {"message": "浏览器已打开", "status": "opened"}

    # 启动浏览器引擎
    success, error = await browser_engine.start(
        browser_type=browser_type,
        executable_path=executable_path,
        user_data_dir=user_data_dir,
        fullscreen=fullscreen,
        launch_args=launch_args,
        extension_dirs=extension_dirs,
    )
    if success:
        if request.url != "about:blank":
            await browser_engine.navigate_to(request.url)
        return {"message": "浏览器已打开", "status": "opened"}

    raise HTTPException(status_code=500, detail=f"打开浏览器失败: {error}")


@router.get("/chromium-status")
async def chromium_status():
    """检测 Playwright 内置 Chromium 是否可用（供前端提示浏览器扩展兜底能否生效）"""
    from app.services import browser_engine
    return await browser_engine.bundled_chromium_status()


@router.post("/close")
async def close_browser():
    """关闭自动化浏览器"""
    from app.services import browser_engine
    await browser_engine.stop()
    return {"message": "浏览器已关闭", "status": "closed"}


@router.get("/status")
async def get_browser_status():
    """获取浏览器状态"""
    from app.services import browser_engine
    from app.services.browser_manager import is_picker_active
    is_open = browser_engine.is_open()
    return {
        "status": "opened" if is_open else "closed",
        "isOpen": is_open,
        "pickerActive": is_picker_active()
    }


@router.post("/navigate")
async def navigate_to(request: NavigateRequest):
    """导航到指定URL"""
    from app.services import browser_engine
    result = await browser_engine.navigate_to(request.url)
    if result.get("success"):
        return {"message": "导航成功", "url": request.url}
    raise HTTPException(status_code=500, detail=result.get("error", "导航失败"))


@router.post("/picker/start")
async def api_start_picker():
    """启动元素选择器"""
    from app.services.browser_manager import _start_picker_engine
    result = await _start_picker_engine()
    if result.get("success"):
        return {"message": "选择器已启动", "status": "active"}
    raise HTTPException(status_code=500, detail=result.get("error", "启动失败"))


@router.post("/picker/stop")
async def api_stop_picker():
    """停止元素选择器"""
    from app.services.browser_manager import _stop_picker_engine
    await _stop_picker_engine()
    return {"message": "选择器已停止", "status": "inactive"}


@router.get("/picker/selected")
async def api_get_selected_element():
    """获取选中的单个元素"""
    from app.services import browser_engine
    from app.services.browser_manager import _get_picker_result
    if not browser_engine.is_open():
        return {"selected": False, "element": None}
    result = await _get_picker_result('__elementPickerResult')
    if result.get("success"):
        data = result.get("data")
        if data:
            return {"selected": True, "element": data}
    return {"selected": False, "element": None}


@router.get("/picker/similar")
async def api_get_similar_elements():
    """获取选中的相似元素"""
    from app.services import browser_engine
    from app.services.browser_manager import _get_picker_result
    if not browser_engine.is_open():
        return {"selected": False, "similar": None}
    result = await _get_picker_result('__elementPickerSimilar')
    if result.get("success"):
        data = result.get("data")
        if data:
            return {
                "selected": True,
                "similar": {
                    "pattern": data.get("pattern", ""),
                    "count": data.get("count", 0),
                    "indices": data.get("indices", []),
                    "minIndex": data.get("minIndex", 1),
                    "maxIndex": data.get("maxIndex", 1)
                }
            }
    return {"selected": False, "similar": None}
