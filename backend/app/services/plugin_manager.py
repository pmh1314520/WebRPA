"""WebRPA 插件市场 / 扩展 API

让第三方开发者把"针对特定网站/场景的自动化能力"打包成插件（如抖音后台、拼多多商家、特定 CRM 适配），
上架到插件市场供其他用户一键安装。插件贡献的模块复用 WebRPA 现有的「自定义模块」机制，
安装后即出现在编辑器侧栏并可被工作流调用与执行。

插件包格式（plugin.json / 上架 JSON）：
{
  "id": "douyin-backend",            # 唯一 id（字母数字/-/_）
  "name": "抖音后台自动化",            # 展示名
  "version": "1.0.0",
  "author": "开发者名",
  "description": "...",
  "homepage": "https://...",          # 可选
  "keywords": ["抖音", "电商"],        # 可选
  "modules": [ <自定义模块对象>, ... ], # 贡献的模块（CustomModule 结构）
  "knowledge": "给 AI 小助手的站点适配知识（可选）"
}

持久化：
- backend/data/plugins/plugins.json      已安装插件索引
- 插件贡献的模块写入 backend/data/custom_modules/（id 前缀 plugin_<pid>_）
"""
from __future__ import annotations

import json
import re
import threading
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests

_DATA_DIR = Path("backend/data")
_PLUGINS_DIR = _DATA_DIR / "plugins"
_INDEX_FILE = _PLUGINS_DIR / "plugins.json"
_CUSTOM_MODULES_DIR = _DATA_DIR / "custom_modules"
_MARKET_CONF = _PLUGINS_DIR / "market.json"  # {"url": "https://..."} 可配置远程市场索引
_lock = threading.RLock()

_ID_RE = re.compile(r"^[A-Za-z0-9_\-]+$")


def _ensure_dirs() -> None:
    _PLUGINS_DIR.mkdir(parents=True, exist_ok=True)
    _CUSTOM_MODULES_DIR.mkdir(parents=True, exist_ok=True)


def _load_index() -> Dict[str, Any]:
    if _INDEX_FILE.exists():
        try:
            return json.loads(_INDEX_FILE.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def _save_index(idx: Dict[str, Any]) -> None:
    _ensure_dirs()
    _INDEX_FILE.write_text(json.dumps(idx, ensure_ascii=False, indent=2), encoding="utf-8")


def _sanitize(s: str) -> str:
    return re.sub(r"[^A-Za-z0-9_\-\u4e00-\u9fa5]", "_", s or "")[:50] or "mod"


def _write_custom_module(module_id: str, mod: Dict[str, Any], plugin_id: str) -> None:
    """把插件贡献的模块写成 WebRPA 自定义模块文件"""
    now = datetime.now().isoformat()
    data = {
        "id": module_id,
        "name": module_id,  # 内部唯一名用 id，避免与用户模块重名
        "display_name": mod.get("display_name") or mod.get("name") or module_id,
        "description": mod.get("description") or "",
        "icon": mod.get("icon") or "🧩",
        "color": mod.get("color") or "#8B5CF6",
        "category": mod.get("category") or "plugin",
        "parameters": mod.get("parameters") or [],
        "outputs": mod.get("outputs") or [],
        "workflow": mod.get("workflow") or {"nodes": [], "edges": []},
        "tags": (mod.get("tags") or []) + [f"plugin:{plugin_id}"],
        "author": mod.get("author") or "",
        "version": mod.get("version") or "1.0.0",
        "usage_count": 0,
        "download_count": 0,
        "created_at": now,
        "updated_at": now,
    }
    (_CUSTOM_MODULES_DIR / f"{module_id}.json").write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def _remove_custom_module(module_id: str) -> None:
    f = _CUSTOM_MODULES_DIR / f"{module_id}.json"
    try:
        if f.exists():
            f.unlink()
    except Exception:
        pass


def _materialize_modules(plugin_id: str, modules: List[Dict[str, Any]]) -> List[str]:
    """把插件的模块写入自定义模块目录，返回模块 id 列表"""
    ids: List[str] = []
    for mod in (modules or []):
        base = _sanitize(mod.get("name") or mod.get("display_name") or "mod")
        module_id = f"plugin_{_sanitize(plugin_id)}_{base}"
        _write_custom_module(module_id, mod, plugin_id)
        ids.append(module_id)
    return ids


def install_plugin(pkg: Dict[str, Any]) -> Dict[str, Any]:
    """安装一个插件包（dict）。已存在则视为升级（先卸载旧模块再装新的）。"""
    with _lock:
        _ensure_dirs()
        pid = (pkg.get("id") or "").strip()
        if not pid or not _ID_RE.match(pid):
            return {"success": False, "error": "插件 id 不合法（仅允许字母/数字/-/_）"}
        if not pkg.get("name"):
            return {"success": False, "error": "插件缺少 name"}

        idx = _load_index()
        # 升级：移除旧模块
        old = idx.get(pid)
        if old:
            for mid in old.get("moduleIds", []):
                _remove_custom_module(mid)

        module_ids = _materialize_modules(pid, pkg.get("modules") or [])
        # 备份原始包，供禁用后重新启用时重建模块
        try:
            (_PLUGINS_DIR / f"{pid}.pkg.json").write_text(
                json.dumps(pkg, ensure_ascii=False, indent=2), encoding="utf-8"
            )
        except Exception:
            pass
        idx[pid] = {
            "id": pid,
            "name": pkg.get("name"),
            "version": pkg.get("version") or "1.0.0",
            "author": pkg.get("author") or "",
            "description": pkg.get("description") or "",
            "homepage": pkg.get("homepage") or "",
            "keywords": pkg.get("keywords") or [],
            "knowledge": pkg.get("knowledge") or "",
            "moduleIds": module_ids,
            "enabled": True,
            "installedAt": datetime.now().isoformat(),
        }
        _save_index(idx)
        return {"success": True, "id": pid, "moduleCount": len(module_ids)}


def uninstall_plugin(plugin_id: str) -> Dict[str, Any]:
    with _lock:
        idx = _load_index()
        entry = idx.get(plugin_id)
        if not entry:
            return {"success": False, "error": "插件未安装"}
        for mid in entry.get("moduleIds", []):
            _remove_custom_module(mid)
        try:
            bk = _PLUGINS_DIR / f"{plugin_id}.pkg.json"
            if bk.exists():
                bk.unlink()
        except Exception:
            pass
        idx.pop(plugin_id, None)
        _save_index(idx)
        return {"success": True}


def set_enabled(plugin_id: str, enabled: bool) -> Dict[str, Any]:
    """启用/禁用插件：禁用时移除其贡献的自定义模块文件，启用时重新生成。"""
    with _lock:
        idx = _load_index()
        entry = idx.get(plugin_id)
        if not entry:
            return {"success": False, "error": "插件未安装"}
        if enabled and not entry.get("enabled"):
            # 重新生成模块（需要原始 modules；禁用时未保留，故从已存的 moduleIds 无法还原）
            # 为支持重建，安装时把原始 modules 备份到插件目录
            backup = _PLUGINS_DIR / f"{plugin_id}.pkg.json"
            if backup.exists():
                pkg = json.loads(backup.read_text(encoding="utf-8"))
                entry["moduleIds"] = _materialize_modules(plugin_id, pkg.get("modules") or [])
        elif not enabled and entry.get("enabled"):
            for mid in entry.get("moduleIds", []):
                _remove_custom_module(mid)
        entry["enabled"] = enabled
        idx[plugin_id] = entry
        _save_index(idx)
        return {"success": True, "enabled": enabled}


def list_installed() -> List[Dict[str, Any]]:
    idx = _load_index()
    return list(idx.values())


def get_market_url() -> str:
    if _MARKET_CONF.exists():
        try:
            return json.loads(_MARKET_CONF.read_text(encoding="utf-8")).get("url") or ""
        except Exception:
            return ""
    return ""


def set_market_url(url: str) -> None:
    _ensure_dirs()
    _MARKET_CONF.write_text(json.dumps({"url": url}, ensure_ascii=False, indent=2), encoding="utf-8")


# 内置示例市场索引（远程不可用时回退，便于体验生态）
_BUILTIN_MARKET = [
    {
        "id": "example-site-adapter",
        "name": "示例站点适配插件",
        "version": "1.0.0",
        "author": "WebRPA 官方",
        "description": "演示如何为特定网站封装一组自动化模块（登录、采集、导出）。复制此结构即可开发自己的插件。",
        "homepage": "https://www.pmhs.top",
        "keywords": ["示例", "模板", "adapter"],
        "official": True,
    }
]


def get_market() -> Dict[str, Any]:
    """获取插件市场列表：优先远程索引，失败回退内置示例。"""
    url = get_market_url()
    if url:
        try:
            resp = requests.get(url, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                plugins = data.get("plugins") if isinstance(data, dict) else data
                if isinstance(plugins, list):
                    return {"success": True, "source": "remote", "plugins": plugins}
        except Exception:
            pass
    return {"success": True, "source": "builtin", "plugins": _BUILTIN_MARKET}


def install_from_market(plugin_id: str) -> Dict[str, Any]:
    """从市场按 id 拉取插件包并安装（远程市场需提供 downloadUrl 或内联 package）。"""
    market = get_market()
    target = next((p for p in market.get("plugins", []) if p.get("id") == plugin_id), None)
    if not target:
        return {"success": False, "error": "市场中未找到该插件"}
    pkg = target.get("package")
    if not pkg and target.get("downloadUrl"):
        try:
            resp = requests.get(target["downloadUrl"], timeout=15)
            if resp.status_code == 200:
                pkg = resp.json()
        except Exception as e:
            return {"success": False, "error": f"下载插件失败: {e}"}
    if not pkg:
        # 没有可安装包时，至少把市场元信息登记为占位插件（无模块）
        pkg = {k: target.get(k) for k in ("id", "name", "version", "author", "description", "homepage", "keywords")}
        pkg["modules"] = []
    return install_plugin(pkg)


# ============================================================
# 发布 / 上架（导出市场就绪包，可选 POST 到 hub）
# ============================================================
def export_package(plugin_id: str) -> Dict[str, Any]:
    """导出已安装插件为「市场就绪」的完整包 JSON（含模块定义），供开发者上架。"""
    with _lock:
        idx = _load_index()
        entry = idx.get(plugin_id)
        if not entry:
            return {"success": False, "error": "插件未安装"}
        # 优先用安装时备份的原始包
        backup = _PLUGINS_DIR / f"{plugin_id}.pkg.json"
        if backup.exists():
            try:
                pkg = json.loads(backup.read_text(encoding="utf-8"))
                return {"success": True, "package": pkg}
            except Exception:
                pass
        # 回退：从已落地的自定义模块反向组装
        modules: List[Dict[str, Any]] = []
        for mid in entry.get("moduleIds", []):
            f = _CUSTOM_MODULES_DIR / f"{mid}.json"
            if f.exists():
                try:
                    modules.append(json.loads(f.read_text(encoding="utf-8")))
                except Exception:
                    pass
        pkg = {
            "id": entry["id"],
            "name": entry.get("name"),
            "version": entry.get("version") or "1.0.0",
            "author": entry.get("author") or "",
            "description": entry.get("description") or "",
            "homepage": entry.get("homepage") or "",
            "keywords": entry.get("keywords") or [],
            "knowledge": entry.get("knowledge") or "",
            "modules": modules,
        }
        return {"success": True, "package": pkg}


def publish_plugin(plugin_id: str, hub_url: str = "") -> Dict[str, Any]:
    """发布插件：导出市场就绪包；若提供 hub_url 则 POST 上架到中心化仓库。"""
    exported = export_package(plugin_id)
    if not exported.get("success"):
        return exported
    pkg = exported["package"]
    if not hub_url:
        hub_url = get_market_url()
    if hub_url:
        try:
            # hub 约定：POST {hub_url}/publish ，body 为完整包
            endpoint = hub_url.rstrip("/")
            if not endpoint.endswith("/publish"):
                endpoint = endpoint + "/publish"
            resp = requests.post(endpoint, json=pkg, timeout=15)
            if resp.status_code in (200, 201):
                return {"success": True, "published": True, "package": pkg, "response": _safe_json(resp)}
            return {"success": False, "error": f"上架失败 HTTP {resp.status_code}", "package": pkg}
        except Exception as e:
            return {"success": False, "error": f"上架请求失败: {e}", "package": pkg}
    # 无 hub：仅导出本地市场就绪包文件供手动上架
    _ensure_dirs()
    out = _PLUGINS_DIR / f"{plugin_id}.market.json"
    out.write_text(json.dumps(pkg, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"success": True, "published": False, "package": pkg, "exportedPath": str(out)}


def _safe_json(resp: "requests.Response") -> Any:
    try:
        return resp.json()
    except Exception:
        return resp.text[:500]


# ============================================================
# 评分 / 评论（本地存储；若配置了 hub 则同时同步）
# 存储：backend/data/plugins/reviews.json
#   { plugin_id: { "reviews": [ {id, user, rating(1-5), comment, createdAt} ], } }
# ============================================================
_REVIEWS_FILE = _PLUGINS_DIR / "reviews.json"


def _load_reviews() -> Dict[str, Any]:
    if _REVIEWS_FILE.exists():
        try:
            return json.loads(_REVIEWS_FILE.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def _save_reviews(data: Dict[str, Any]) -> None:
    _ensure_dirs()
    _REVIEWS_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _summarize(reviews: List[Dict[str, Any]]) -> Dict[str, Any]:
    n = len(reviews)
    avg = round(sum(r.get("rating", 0) for r in reviews) / n, 2) if n else 0
    return {"count": n, "average": avg}


def add_review(plugin_id: str, rating: int, comment: str = "", user: str = "匿名用户") -> Dict[str, Any]:
    try:
        rating = int(rating)
    except Exception:
        return {"success": False, "error": "评分必须为 1-5 的整数"}
    if rating < 1 or rating > 5:
        return {"success": False, "error": "评分必须为 1-5"}
    with _lock:
        data = _load_reviews()
        bucket = data.setdefault(plugin_id, {"reviews": []})
        review = {
            "id": f"rv_{int(datetime.now().timestamp() * 1000)}",
            "user": (user or "匿名用户").strip()[:40],
            "rating": rating,
            "comment": (comment or "").strip()[:1000],
            "createdAt": datetime.now().isoformat(),
        }
        bucket["reviews"].insert(0, review)
        _save_reviews(data)
        # 可选同步到 hub
        hub = get_market_url()
        if hub:
            try:
                requests.post(hub.rstrip("/") + "/reviews", json={"pluginId": plugin_id, **review}, timeout=8)
            except Exception:
                pass
        return {"success": True, "review": review, "summary": _summarize(bucket["reviews"])}


def get_reviews(plugin_id: str) -> Dict[str, Any]:
    # 优先合并 hub 上的评论
    merged: List[Dict[str, Any]] = []
    hub = get_market_url()
    if hub:
        try:
            resp = requests.get(hub.rstrip("/") + f"/reviews/{plugin_id}", timeout=8)
            if resp.status_code == 200:
                remote = resp.json()
                items = remote.get("reviews") if isinstance(remote, dict) else remote
                if isinstance(items, list):
                    merged.extend(items)
        except Exception:
            pass
    local = _load_reviews().get(plugin_id, {}).get("reviews", [])
    merged.extend(local)
    return {"success": True, "reviews": merged, "summary": _summarize(merged)}
