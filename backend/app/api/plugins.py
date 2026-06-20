"""插件市场 / 扩展 API"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Any, Dict, Optional

from app.services import plugin_manager

router = APIRouter(prefix="/api/plugins", tags=["plugins"])


class InstallPackageRequest(BaseModel):
    package: Dict[str, Any]


class MarketUrlRequest(BaseModel):
    url: str


class EnableRequest(BaseModel):
    enabled: bool


class PublishRequest(BaseModel):
    hubUrl: Optional[str] = ""


class ReviewRequest(BaseModel):
    rating: int
    comment: Optional[str] = ""
    user: Optional[str] = "匿名用户"


@router.get("/installed")
async def installed():
    """已安装插件列表"""
    return {"success": True, "plugins": plugin_manager.list_installed()}


@router.get("/market")
async def market():
    """插件市场列表（远程索引优先，回退内置示例）"""
    return plugin_manager.get_market()


@router.get("/market-url")
async def get_market_url():
    return {"success": True, "url": plugin_manager.get_market_url()}


@router.post("/market-url")
async def set_market_url(req: MarketUrlRequest):
    plugin_manager.set_market_url(req.url.strip())
    return {"success": True}


@router.post("/install")
async def install(req: InstallPackageRequest):
    """从本地上传的插件包安装"""
    return plugin_manager.install_plugin(req.package)


@router.post("/install-from-market/{plugin_id}")
async def install_from_market(plugin_id: str):
    """从市场按 id 安装"""
    return plugin_manager.install_from_market(plugin_id)


@router.post("/{plugin_id}/enable")
async def enable(plugin_id: str, req: EnableRequest):
    return plugin_manager.set_enabled(plugin_id, req.enabled)


@router.delete("/{plugin_id}")
async def uninstall(plugin_id: str):
    return plugin_manager.uninstall_plugin(plugin_id)


@router.get("/{plugin_id}/export")
async def export_pkg(plugin_id: str):
    """导出已安装插件为市场就绪包 JSON（供开发者上架）"""
    return plugin_manager.export_package(plugin_id)


@router.post("/{plugin_id}/publish")
async def publish(plugin_id: str, req: PublishRequest):
    """发布/上架插件：导出市场就绪包，若配置 hub 则 POST 上架"""
    return plugin_manager.publish_plugin(plugin_id, (req.hubUrl or "").strip())


@router.get("/{plugin_id}/reviews")
async def reviews(plugin_id: str):
    """获取插件评分/评论（合并本地与 hub）"""
    return plugin_manager.get_reviews(plugin_id)


@router.post("/{plugin_id}/reviews")
async def add_review(plugin_id: str, req: ReviewRequest):
    """提交插件评分/评论"""
    return plugin_manager.add_review(plugin_id, req.rating, req.comment or "", req.user or "匿名用户")
