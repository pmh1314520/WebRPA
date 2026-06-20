"""WebRPA AI 小助手技能扩展 v5 —— 插件中心全套能力

让 AI 小助手完全掌握 WebRPA 插件系统：浏览市场、安装/卸载/启停、从工作流一键开发插件、
校验、导出市场就绪包、发布上架、评分评论。配合既有的 build_workflow / client_action，
小助手可以「自己开发 → 校验 → 安装测试 → 发布」一个完整插件。

所有技能直接调用 backend 的 plugin_manager（服务端执行），无需前端往返。
"""
from __future__ import annotations

import re
from typing import Any

from app.services.ai_assistant_skills import Skill, registry
from app.services import plugin_manager

_ID_RE = re.compile(r"^[A-Za-z0-9_\-]+$")


# ---------------- 浏览 / 查询 ----------------

async def skill_plugin_list_installed(**_: Any) -> dict[str, Any]:
    """列出所有已安装插件（含启用状态、贡献的模块 id）。"""
    return {"plugins": plugin_manager.list_installed()}


async def skill_plugin_browse_market(**_: Any) -> dict[str, Any]:
    """浏览插件市场列表（远程索引优先，回退内置示例）。"""
    return plugin_manager.get_market()


async def skill_plugin_get_market_url(**_: Any) -> dict[str, Any]:
    """读取当前配置的插件市场索引地址。"""
    return {"url": plugin_manager.get_market_url()}


async def skill_plugin_set_market_url(url: str = "", **_: Any) -> dict[str, Any]:
    """设置插件市场索引地址（远程 hub 的 plugins.json）。"""
    plugin_manager.set_market_url((url or "").strip())
    return {"success": True, "url": (url or "").strip()}


# ---------------- 安装 / 启停 / 卸载 ----------------

async def skill_plugin_install_from_market(plugin_id: str, **_: Any) -> dict[str, Any]:
    """从市场按 id 安装插件。"""
    return plugin_manager.install_from_market(plugin_id)


async def skill_plugin_install_package(package: dict, **_: Any) -> dict[str, Any]:
    """安装一个 AI 构建好的完整插件包（dict）。
    package 结构见 plugin_dev_guide。已存在同 id 视为升级。"""
    if not isinstance(package, dict):
        return {"error": "package 必须是对象"}
    return plugin_manager.install_plugin(package)


async def skill_plugin_set_enabled(plugin_id: str, enabled: bool = True, **_: Any) -> dict[str, Any]:
    """启用/禁用插件（禁用会移除其贡献模块，启用会重新生成）。"""
    return plugin_manager.set_enabled(plugin_id, bool(enabled))


async def skill_plugin_uninstall(plugin_id: str, **_: Any) -> dict[str, Any]:
    """卸载插件（删除其贡献的模块，不可恢复，需用户批准）。"""
    return plugin_manager.uninstall_plugin(plugin_id)


# ---------------- 开发 / 校验 ----------------

def _validate_package(pkg: dict) -> list[str]:
    issues: list[str] = []
    pid = (pkg.get("id") or "").strip()
    if not pid:
        issues.append("缺少 id")
    elif not _ID_RE.match(pid):
        issues.append("id 仅允许字母/数字/-/_")
    if not (pkg.get("name") or "").strip():
        issues.append("缺少 name（展示名）")
    mods = pkg.get("modules")
    if mods is not None and not isinstance(mods, list):
        issues.append("modules 必须是数组")
    for i, m in enumerate(mods or []):
        if not isinstance(m, dict):
            issues.append(f"modules[{i}] 必须是对象")
            continue
        if not (m.get("name") or m.get("display_name")):
            issues.append(f"modules[{i}] 缺少 name 或 display_name")
        wf = m.get("workflow")
        if wf is not None and (not isinstance(wf, dict) or "nodes" not in wf):
            issues.append(f"modules[{i}].workflow 应为 {{nodes:[], edges:[]}}")
    return issues


async def skill_plugin_validate_package(package: dict, **_: Any) -> dict[str, Any]:
    """安装前校验插件包结构，返回问题清单（无副作用）。valid=True 才建议安装。"""
    if not isinstance(package, dict):
        return {"valid": False, "issues": ["package 必须是对象"]}
    issues = _validate_package(package)
    return {"valid": len(issues) == 0, "issues": issues}


async def skill_plugin_develop_from_workflow(
    plugin_id: str,
    name: str,
    nodes: list,
    edges: list | None = None,
    *,
    module_display_name: str | None = None,
    description: str = "",
    version: str = "1.0.0",
    author: str = "",
    keywords: list | None = None,
    knowledge: str = "",
    parameters: list | None = None,
    outputs: list | None = None,
    icon: str = "🧩",
    color: str = "#8B5CF6",
    auto_install: bool = True,
    **_: Any,
) -> dict[str, Any]:
    """把一份工作流（nodes/edges）一键封装成插件并（默认）安装，便于"开发→测试"。
    - plugin_id: 插件唯一 id（字母/数字/-/_）
    - name: 插件展示名
    - nodes/edges: 工作流画布内容（可来自 client_action get_workflow_detail 或 build_workflow 结果）
    - parameters/outputs: 该插件模块对外暴露的输入参数 / 输出（可选）
    安装后插件模块会出现在编辑器侧栏，可拖拽运行做调试测试。"""
    pkg = {
        "id": (plugin_id or "").strip(),
        "name": name,
        "version": version or "1.0.0",
        "author": author or "",
        "description": description or "",
        "keywords": keywords or [],
        "knowledge": knowledge or "",
        "modules": [
            {
                "name": (plugin_id or "mod"),
                "display_name": module_display_name or name,
                "description": description or "",
                "icon": icon,
                "color": color,
                "category": "plugin",
                "parameters": parameters or [],
                "outputs": outputs or [],
                "workflow": {"nodes": nodes or [], "edges": edges or []},
            }
        ],
    }
    issues = _validate_package(pkg)
    if issues:
        return {"success": False, "issues": issues, "package": pkg}
    if not auto_install:
        return {"success": True, "installed": False, "package": pkg}
    res = plugin_manager.install_plugin(pkg)
    return {"success": res.get("success", False), "installed": res.get("success", False), "result": res, "package": pkg}


# ---------------- 导出 / 发布 / 评分 ----------------

async def skill_plugin_export_package(plugin_id: str, **_: Any) -> dict[str, Any]:
    """导出已安装插件为市场就绪包 JSON（供上架/分发）。"""
    return plugin_manager.export_package(plugin_id)


async def skill_plugin_publish(plugin_id: str, hub_url: str = "", **_: Any) -> dict[str, Any]:
    """发布/上架插件：若配置了市场地址（或传 hub_url）则 POST 到 hub，
    否则在 backend/data/plugins 下导出市场就绪包文件供手动上架（需用户批准）。"""
    return plugin_manager.publish_plugin(plugin_id, (hub_url or "").strip())


async def skill_plugin_add_review(plugin_id: str, rating: int, comment: str = "", user: str = "AI 小助手", **_: Any) -> dict[str, Any]:
    """给插件提交评分（1-5）与评论。"""
    return plugin_manager.add_review(plugin_id, rating, comment or "", user or "AI 小助手")


async def skill_plugin_get_reviews(plugin_id: str, **_: Any) -> dict[str, Any]:
    """获取插件的评分与评论（合并本地与 hub）。"""
    return plugin_manager.get_reviews(plugin_id)


async def skill_plugin_dev_guide(**_: Any) -> dict[str, Any]:
    """返回 WebRPA 插件开发完整指南（包格式、开发流程、发布与 hub 约定），AI 自查用。"""
    return {"guide": _DEV_GUIDE}


_DEV_GUIDE = """WebRPA 插件开发完整指南（AI 小助手专用）

一、插件能做什么
- 为特定网站/场景封装专用模块（如「抖音后台-发布视频」「拼多多商家-上下架」「某 CRM-建客户」）。
- 把常用工作流封装成单个模块，降低他人使用门槛；可附带给 AI 的「站点适配知识」。

二、插件包（plugin.json / 安装包）结构
{
  "id": "douyin-backend",            # 唯一 id，仅字母/数字/-/_
  "name": "抖音后台自动化",            # 展示名
  "version": "1.0.0",
  "author": "开发者名",
  "description": "...",
  "homepage": "https://...",          # 可选
  "keywords": ["抖音","电商"],         # 可选
  "knowledge": "给 AI 的站点适配知识",  # 可选
  "modules": [                         # 贡献的模块（结构同自定义模块）
    {
      "name": "douyin_publish",        # 模块内部名
      "display_name": "抖音-发布视频",
      "description": "上传并发布一个视频",
      "icon": "🎬", "color": "#fe2c55",
      "parameters": [ {"name":"videoPath","label":"视频路径","type":"string","required":true} ],
      "outputs": [ {"name":"publishUrl","label":"发布链接"} ],
      "workflow": { "nodes": [], "edges": [] }   # 模块真正执行的工作流
    }
  ]
}

三、AI 开发插件的推荐流程（自己开发→调试→测试→发布）
1) 先用 build_workflow 把功能搭成一份可运行工作流，或用 client_action get_workflow_detail 拿当前画布。
2) 调 plugin_develop_from_workflow(plugin_id, name, nodes, edges, parameters?, outputs?) 一键封装并安装。
3) plugin_validate_package 可在安装前校验结构；plugin_list_installed 确认已装。
4) 调试测试：插件模块会作为自定义模块出现在侧栏，可用 client_action 把它加进画布并运行，看日志验证。
5) 满意后 plugin_export_package 导出市场就绪包，或 plugin_publish 发布上架（配置了市场地址则 POST 到 hub）。

四、市场与 hub 约定
- 市场索引地址用 plugin_set_market_url 设置，指向公开可访问的 plugins.json（{plugins:[{id,name,version,downloadUrl}...]}）。
- 发布约定：POST {hub}/publish 接收完整包；评分 POST {hub}/reviews；读取 GET {hub}/reviews/{id}。

五、安装/启停/卸载
- plugin_install_from_market(id) 从市场装；plugin_install_package(package) 装 AI 构建的包。
- plugin_set_enabled(id, enabled) 启停；plugin_uninstall(id) 卸载（不可恢复，需批准）。

注意：插件 id 不能含中文或空格；模块的 parameters/outputs 命名清晰、给默认值；遇到问题可联系开发者 QQ 2124691573 / 微信 QyPmh20061026。
"""


def _register_v5() -> None:
    registry.register(Skill(
        name="plugin_list_installed",
        description="列出所有已安装的 WebRPA 插件（含启用状态与贡献的模块 id）。",
        parameters={"type": "object", "properties": {}},
        handler=skill_plugin_list_installed,
    ))
    registry.register(Skill(
        name="plugin_browse_market",
        description="浏览 WebRPA 插件市场（远程索引优先，回退内置示例）。用户想找/装插件时先调它。",
        parameters={"type": "object", "properties": {}},
        handler=skill_plugin_browse_market,
    ))
    registry.register(Skill(
        name="plugin_get_market_url",
        description="读取当前配置的插件市场索引地址。",
        parameters={"type": "object", "properties": {}},
        handler=skill_plugin_get_market_url,
    ))
    registry.register(Skill(
        name="plugin_set_market_url",
        description="设置插件市场索引地址（指向公开的 plugins.json）。",
        parameters={"type": "object", "properties": {"url": {"type": "string", "description": "市场索引 URL"}}, "required": ["url"]},
        handler=skill_plugin_set_market_url,
    ))
    registry.register(Skill(
        name="plugin_install_from_market",
        description="从插件市场按 id 安装插件。",
        parameters={"type": "object", "properties": {"plugin_id": {"type": "string"}}, "required": ["plugin_id"]},
        handler=skill_plugin_install_from_market,
        requires_approval=True,
    ))
    registry.register(Skill(
        name="plugin_install_package",
        description="安装一个完整的插件包对象（AI 自己构建的 package）。结构见 plugin_dev_guide。",
        parameters={"type": "object", "properties": {"package": {"type": "object", "description": "完整插件包 JSON"}}, "required": ["package"]},
        handler=skill_plugin_install_package,
        requires_approval=True,
    ))
    registry.register(Skill(
        name="plugin_set_enabled",
        description="启用或禁用一个已安装插件。",
        parameters={"type": "object", "properties": {"plugin_id": {"type": "string"}, "enabled": {"type": "boolean"}}, "required": ["plugin_id", "enabled"]},
        handler=skill_plugin_set_enabled,
    ))
    registry.register(Skill(
        name="plugin_uninstall",
        description="卸载一个插件（删除其模块，不可恢复）。",
        parameters={"type": "object", "properties": {"plugin_id": {"type": "string"}}, "required": ["plugin_id"]},
        handler=skill_plugin_uninstall,
        requires_approval=True,
    ))
    registry.register(Skill(
        name="plugin_validate_package",
        description="安装前校验插件包结构，返回问题清单（无副作用）。",
        parameters={"type": "object", "properties": {"package": {"type": "object"}}, "required": ["package"]},
        handler=skill_plugin_validate_package,
    ))
    registry.register(Skill(
        name="plugin_develop_from_workflow",
        description="把一份工作流(nodes/edges)一键封装成插件并安装，用于 AI 自主开发→测试插件。可选 parameters/outputs 暴露模块入参/出参。",
        parameters={"type": "object", "properties": {
            "plugin_id": {"type": "string", "description": "唯一 id，仅字母/数字/-/_"},
            "name": {"type": "string", "description": "插件展示名"},
            "nodes": {"type": "array", "description": "工作流节点"},
            "edges": {"type": "array", "description": "工作流连线"},
            "module_display_name": {"type": "string"},
            "description": {"type": "string"},
            "version": {"type": "string"},
            "author": {"type": "string"},
            "keywords": {"type": "array"},
            "knowledge": {"type": "string", "description": "给 AI 的站点适配知识"},
            "parameters": {"type": "array", "description": "模块对外输入参数"},
            "outputs": {"type": "array", "description": "模块输出"},
            "auto_install": {"type": "boolean", "description": "默认 true，封装后立即安装"},
        }, "required": ["plugin_id", "name", "nodes"]},
        handler=skill_plugin_develop_from_workflow,
        requires_approval=True,
    ))
    registry.register(Skill(
        name="plugin_export_package",
        description="导出已安装插件为市场就绪包 JSON（供上架/分发）。",
        parameters={"type": "object", "properties": {"plugin_id": {"type": "string"}}, "required": ["plugin_id"]},
        handler=skill_plugin_export_package,
    ))
    registry.register(Skill(
        name="plugin_publish",
        description="发布/上架插件：配置了市场地址则 POST 到 hub，否则导出市场就绪包文件供手动上架。",
        parameters={"type": "object", "properties": {"plugin_id": {"type": "string"}, "hub_url": {"type": "string", "description": "可选，覆盖市场地址"}}, "required": ["plugin_id"]},
        handler=skill_plugin_publish,
        requires_approval=True,
    ))
    registry.register(Skill(
        name="plugin_add_review",
        description="给插件提交 1-5 星评分与评论。",
        parameters={"type": "object", "properties": {"plugin_id": {"type": "string"}, "rating": {"type": "integer"}, "comment": {"type": "string"}, "user": {"type": "string"}}, "required": ["plugin_id", "rating"]},
        handler=skill_plugin_add_review,
    ))
    registry.register(Skill(
        name="plugin_get_reviews",
        description="获取插件的评分与评论（合并本地与 hub）。",
        parameters={"type": "object", "properties": {"plugin_id": {"type": "string"}}, "required": ["plugin_id"]},
        handler=skill_plugin_get_reviews,
    ))
    registry.register(Skill(
        name="plugin_dev_guide",
        description="返回 WebRPA 插件开发完整指南（包格式/开发流程/发布与 hub 约定）。开发插件前先看它。",
        parameters={"type": "object", "properties": {}},
        handler=skill_plugin_dev_guide,
    ))


_register_v5()
