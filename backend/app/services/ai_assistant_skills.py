"""WebRPA小助手 - Skills 工具系统

把 WebRPA 的核心能力包装为 OpenAI Function Calling 形式的工具，
让 AI 助手可以像 Hermes Agent 一样自主操作 WebRPA。
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Awaitable

from app.services.ai_assistant_knowledge import (
    MODULE_CATEGORIES,
    find_module_description,
    get_all_known_module_types,
)
from app.services.ai_assistant_module_schemas import (
    get_module_schema,
    get_all_module_schemas,
    apply_default_config,
)
from app.services.ai_assistant_templates import (
    WORKFLOW_TEMPLATES,
    get_all_templates,
    find_template,
    get_template_by_name,
)


# ---------- Skill 定义 ----------

class Skill:
    """一个 Skill 工具的定义"""

    def __init__(
        self,
        name: str,
        description: str,
        parameters: dict[str, Any],
        handler: Callable[..., Awaitable[Any]],
        *,
        requires_approval: bool = False,
    ) -> None:
        self.name = name
        self.description = description
        self.parameters = parameters
        self.handler = handler
        self.requires_approval = requires_approval

    def to_openai_tool(self) -> dict[str, Any]:
        """导出为 OpenAI tools 格式"""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters,
            },
        }


class SkillRegistry:
    """Skill 注册表"""

    def __init__(self) -> None:
        self._skills: dict[str, Skill] = {}
        self._duplicates: list[str] = []  # 记录重名注册，便于排查技术债

    def register(self, skill: Skill) -> None:
        # 重名检测：历史上 v2/v3/v4 分散注册，重名会静默覆盖，这里显式告警便于排查
        if skill.name in self._skills:
            self._duplicates.append(skill.name)
            print(f"[skill] 警告：技能名重复注册被覆盖: {skill.name}")
        self._skills[skill.name] = skill

    def get(self, name: str) -> Skill | None:
        return self._skills.get(name)

    def to_openai_tools(self) -> list[dict[str, Any]]:
        return [s.to_openai_tool() for s in self._skills.values()]

    def names(self) -> list[str]:
        return list(self._skills.keys())


registry = SkillRegistry()


# ---------- 后端数据访问层（Skill 内部用） ----------

def _get_workflow_folder() -> Path:
    """工作流默认存储目录（与 local_workflows.py 的逻辑保持一致）"""
    project_root = Path(__file__).parent.parent.parent.parent
    folder = project_root / "workflows"
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def _get_data_folder() -> Path:
    """后端数据目录"""
    folder = Path("backend/data")
    folder.mkdir(parents=True, exist_ok=True)
    return folder


# ---------- Skills 实现 ----------

# === 1. 模块信息查询类 ===

async def skill_list_module_categories(**_: Any) -> dict[str, Any]:
    """列出 WebRPA 内置模块的所有分类"""
    return {
        "categories": list(MODULE_CATEGORIES.keys()),
        "total_modules": sum(len(m) for m in MODULE_CATEGORIES.values()),
    }


async def skill_list_modules_in_category(category: str, **_: Any) -> dict[str, Any]:
    """列出某个分类下的所有模块"""
    if category not in MODULE_CATEGORIES:
        return {
            "error": f"未知分类: {category}",
            "available_categories": list(MODULE_CATEGORIES.keys()),
        }
    return {
        "category": category,
        "modules": [
            {"type": mtype, "description": desc}
            for mtype, desc in MODULE_CATEGORIES[category].items()
        ],
    }


async def skill_describe_module(module_type: str, **_: Any) -> dict[str, Any]:
    """获取某个模块的描述 + 配置字段示例（自动从本地工作流和当前画布学习）"""
    desc = find_module_description(module_type)

    # 检查执行器是否真实注册
    is_registered = False
    try:
        from app.executors.base import registry as exec_registry
        is_registered = module_type in exec_registry.get_all_types()
    except Exception:
        pass

    if desc is None and not is_registered:
        return {
            "error": f"未找到模块 {module_type}，它可能不存在或拼写错误",
        }

    # 优先返回内置 schema（最权威），同时兼容旧的"从工作流学习"
    schema = get_module_schema(module_type)

    # 从所有本地工作流中找出该 type 的节点作为配置参考
    config_examples: list[dict[str, Any]] = []
    config_field_names: set[str] = set()
    META_FIELDS = {"label", "moduleType", "remark", "customName", "subflowName",
                   "subflowGroupId", "isSubflow", "customModuleId", "isHighlighted",
                   "parameterValues"}
    try:
        folder = _get_workflow_folder()
        seen_count = 0
        for fp in folder.glob("*.json"):
            if seen_count >= 3:
                break
            try:
                data = json.loads(fp.read_text(encoding="utf-8"))
            except Exception:
                continue
            for n in (data.get("nodes") or []):
                ntype = n.get("type") or (n.get("data") or {}).get("moduleType")
                if ntype != module_type:
                    continue
                ndata = n.get("data") or {}
                cfg: dict[str, Any] = {}
                for k, v in ndata.items():
                    if k in META_FIELDS:
                        continue
                    if v is None or v == "":
                        continue
                    cfg[k] = v
                    config_field_names.add(k)
                if cfg:
                    config_examples.append({
                        "from_workflow": fp.stem,
                        "label": ndata.get("label") or "",
                        "config": cfg,
                    })
                    seen_count += 1
                    if seen_count >= 3:
                        break
    except Exception:
        pass

    return {
        "type": module_type,
        "description": desc or "（暂无文档）",
        "registered": is_registered,
        "schema": schema,  # 内置 schema：必填/可选/默认/字段说明/example/combo
        "config_field_names": sorted(config_field_names),
        "config_examples": config_examples[:3],
        "tip": (
            "schema 字段（如有）是最权威的配置说明，包含 required（必填）/optional（可选）/"
            "defaults（默认值）/desc（每个字段的中文说明）/example（完整样例）/combo（前后联动建议）。"
            "build_workflow 时只需关注 required 字段，defaults 会被后端自动套用。"
            if schema else
            "本模块暂无内置 schema，可参考 config_examples 中其他用户的真实样例，"
            "或直接调 search_in_workflows 查更多用法。"
        ),
    }


async def skill_get_module_schema(module_types: list[str], **_: Any) -> dict[str, Any]:
    """批量查询多个模块的 schema"""
    if not module_types or not isinstance(module_types, list):
        return {"error": "module_types 必须是非空数组"}
    result: dict[str, Any] = {}
    for mt in module_types:
        if not isinstance(mt, str):
            continue
        s = get_module_schema(mt)
        if s:
            result[mt] = s
        else:
            # 即使没有内置 schema 也返回提示，让 AI 知道这个模块不在 schema 库里
            desc = find_module_description(mt)
            result[mt] = {
                "schema_missing": True,
                "description": desc or "（暂无文档）",
                "tip": "本模块没有内置 schema，可调 describe_module 看历史样例，或自行推断字段",
            }
    return {
        "count": len([k for k, v in result.items() if not v.get("schema_missing")]),
        "schemas": result,
        "tip": "schema.required 是必填，schema.defaults 会被后端在 build_workflow 时自动套用",
    }


# ----- 工作流校验 / 自动修复 -----

async def skill_validate_workflow_nodes(nodes: list[dict], edges: list[dict] | None = None, **_: Any) -> dict[str, Any]:
    """对一份节点列表做静态校验，返回所有可疑问题。
    AI 调用方式：
      ① client_action(action='get_workflow_detail') 拿到 nodes/edges
      ② validate_workflow_nodes(nodes=..., edges=...) 看报告
      ③ 按报告里的修复建议调 client_action 修正

    检查项：
    - 必填字段是否填了（按 schema.required）
    - 上一步的输出变量是否被下一步用到（变量贯穿）
    - 是否存在孤立节点（没连任何边）
    - 是否有未关闭的连接（db_connect 没配 db_close 等）
    """
    if not isinstance(nodes, list):
        return {"error": "nodes 必须是数组"}
    edges = edges or []

    META_FIELDS = {"label", "moduleType", "name", "remark", "customName",
                   "subflowName", "subflowGroupId", "isSubflow", "customModuleId",
                   "isHighlighted", "parameterValues", "color", "icon"}

    issues: list[dict[str, Any]] = []
    # 收集每个节点产生的变量名 → 节点 id；和每个变量被使用的节点 id 列表
    produced_vars: dict[str, list[str]] = {}  # var_name -> [producer_node_id]
    consumed_vars: dict[str, list[str]] = {}  # var_name -> [consumer_node_id]

    import re
    var_pattern = re.compile(r"\{([a-zA-Z_][a-zA-Z_0-9]*)\}")

    # 第一遍：建立变量产出/消费索引 + 必填字段检查
    for node in nodes:
        ntype = node.get("type") or (node.get("data") or {}).get("moduleType")
        if not ntype:
            continue
        nid = node.get("id", "")
        ndata = node.get("data") or {}
        schema = get_module_schema(ntype)

        # 检查必填（按当前配置的模式动态判定，多模式模块只校验当前模式所需字段）
        from app.services.ai_assistant_module_schemas import effective_required as _eff_req
        _req_fields = _eff_req(ntype, ndata) if schema else []
        if _req_fields:
            for req_field in _req_fields:
                val = ndata.get(req_field)
                if val is None or val == "" or (isinstance(val, list) and not val):
                    issues.append({
                        "level": "error",
                        "node_id": nid,
                        "module_type": ntype,
                        "field": req_field,
                        "message": f"必填字段「{req_field}」未填",
                        "fix_hint": f"调用 client_action(update_node_config, {{node_id: '{nid}', config: {{{req_field}: ...}}}})",
                    })

        # 收集该节点产生的变量名
        for var_field in ("variableName", "resultVariable", "saveResult", "saveToVariable",
                          "saveNewElementSelector", "saveChangeInfo", "connectionVariable",
                          "itemVariable", "indexVariable", "keyVariable", "valueVariable"):
            val = ndata.get(var_field)
            if isinstance(val, str) and val.strip():
                produced_vars.setdefault(val.strip(), []).append(nid)

        # 收集该节点引用的变量
        for k, v in ndata.items():
            if k in META_FIELDS:
                continue
            if isinstance(v, str):
                for ref in var_pattern.findall(v):
                    consumed_vars.setdefault(ref, []).append(nid)

    # 第二遍：检查"产生但未被使用"的变量（可能是死变量）
    for var, producers in produced_vars.items():
        if var not in consumed_vars and len(producers) <= 1:
            # 只产生不被使用的非中间变量，可能是 dangling
            issues.append({
                "level": "warning",
                "node_id": producers[0],
                "field": "result variable",
                "message": f"变量「{var}」产生了但没被任何后续节点引用，可能是无效输出",
                "fix_hint": "如果有意保留可忽略；否则在某个 print_log/set_variable 里用 {" + var + "} 引用一下",
            })

    # 第三遍：检查"使用但没产生"的变量（变量名拼错？）
    for var, consumers in consumed_vars.items():
        if var not in produced_vars:
            # 一些内置/全局变量可豁免
            BUILTIN = {"item", "index", "key", "value", "ai_response"}
            if var in BUILTIN:
                continue
            issues.append({
                "level": "error",
                "node_id": consumers[0],
                "field": "variable reference",
                "message": f"引用了变量「{var}」但工作流中没有任何节点产生它，可能拼错或漏了上游",
                "fix_hint": f"检查变量名拼写，或在前面加节点产生 {var}",
            })

    # 第四遍：孤立节点
    edge_endpoints = set()
    for e in edges:
        edge_endpoints.add(e.get("source", ""))
        edge_endpoints.add(e.get("target", ""))
    for node in nodes:
        nid = node.get("id", "")
        ntype = node.get("type") or (node.get("data") or {}).get("moduleType") or ""
        # 触发器/note/group 不需要被连
        if ntype in ("note", "group", "subflow_header") or "trigger" in ntype:
            continue
        if nid and nid not in edge_endpoints and len(nodes) > 1:
            issues.append({
                "level": "warning",
                "node_id": nid,
                "module_type": ntype,
                "message": f"节点「{ntype}」没有任何连线，可能是孤立的死节点",
                "fix_hint": f"调 client_action(connect_nodes, ...) 把它连入主流程，或 client_action(delete_node)",
            })

    # 第五遍：未关闭的连接
    OPENED_TO_CLOSE = {
        "db_connect": "db_close",
        "ssh_connect": "ssh_disconnect",
        "oracle_connect": "oracle_disconnect",
        "postgresql_connect": "postgresql_disconnect",
        "mongodb_connect": "mongodb_disconnect",
        "sqlserver_connect": "sqlserver_disconnect",
        "sqlite_connect": "sqlite_disconnect",
        "redis_connect": "redis_disconnect",
    }
    types_in_workflow = {n.get("type") or (n.get("data") or {}).get("moduleType") for n in nodes}
    for opener, closer in OPENED_TO_CLOSE.items():
        if opener in types_in_workflow and closer not in types_in_workflow:
            issues.append({
                "level": "warning",
                "module_type": opener,
                "message": f"使用了 {opener} 但工作流末尾没有 {closer}，可能造成连接泄漏",
                "fix_hint": f"在工作流末尾加一个 {closer} 节点",
            })

    error_count = len([i for i in issues if i.get("level") == "error"])
    warning_count = len([i for i in issues if i.get("level") == "warning"])

    return {
        "valid": error_count == 0,
        "summary": f"共 {error_count} 个错误，{warning_count} 个警告",
        "error_count": error_count,
        "warning_count": warning_count,
        "issues": issues,
        "tip": (
            "若 valid=False，按 issues[].fix_hint 调 client_action 逐项修复。"
            "也可以一次调 auto_fix_workflow_nodes 让我自动用 schema 默认值补齐所有 required 字段。"
        ),
    }


async def skill_auto_fix_workflow_nodes(nodes: list[dict], **_: Any) -> dict[str, Any]:
    """根据 schema 自动给画布上每个节点补齐默认配置。
    返回每个节点应该 update 的 patch，AI 拿到后用 client_action(update_node_config) 应用。
    """
    if not isinstance(nodes, list):
        return {"error": "nodes 必须是数组"}

    patches: list[dict[str, Any]] = []
    for node in nodes:
        ntype = node.get("type") or (node.get("data") or {}).get("moduleType")
        if not ntype:
            continue
        nid = node.get("id", "")
        ndata = node.get("data") or {}
        schema = get_module_schema(ntype)
        if not schema:
            continue

        patch: dict[str, Any] = {}
        # 用 defaults 补齐缺失字段
        for k, default_v in (schema.get("defaults") or {}).items():
            cur = ndata.get(k)
            if cur is None or cur == "":
                patch[k] = default_v

        if patch:
            patches.append({"node_id": nid, "module_type": ntype, "patch": patch})

    return {
        "fix_count": len(patches),
        "patches": patches,
        "tip": "对每条 patch 调用 client_action(update_node_config, {node_id, config: patch})",
    }


async def skill_analyze_variable_flow(nodes: list[dict], **_: Any) -> dict[str, Any]:
    """分析画布中所有变量的产生-引用链，便于 AI 理解数据流向。"""
    if not isinstance(nodes, list):
        return {"error": "nodes 必须是数组"}

    import re
    META_FIELDS = {"label", "moduleType", "name", "remark", "customName",
                   "subflowName", "subflowGroupId", "isSubflow", "customModuleId",
                   "isHighlighted", "parameterValues", "color", "icon"}
    var_pattern = re.compile(r"\{([a-zA-Z_][a-zA-Z_0-9]*)\}")

    flow: dict[str, dict[str, Any]] = {}  # var -> {producers, consumers}

    for node in nodes:
        nid = node.get("id", "")
        ntype = node.get("type") or (node.get("data") or {}).get("moduleType") or ""
        ndata = node.get("data") or {}
        for var_field in ("variableName", "resultVariable", "saveResult", "saveToVariable",
                          "saveNewElementSelector", "saveChangeInfo", "connectionVariable",
                          "itemVariable", "indexVariable", "keyVariable", "valueVariable"):
            val = ndata.get(var_field)
            if isinstance(val, str) and val.strip():
                v = val.strip()
                flow.setdefault(v, {"producers": [], "consumers": []})
                flow[v]["producers"].append({"node_id": nid, "type": ntype, "field": var_field})

        for k, v in ndata.items():
            if k in META_FIELDS:
                continue
            if isinstance(v, str):
                for ref in var_pattern.findall(v):
                    flow.setdefault(ref, {"producers": [], "consumers": []})
                    flow[ref]["consumers"].append({"node_id": nid, "type": ntype, "field": k})

    # 标记孤儿
    for var, info in flow.items():
        info["status"] = (
            "orphan_use" if not info["producers"] and info["consumers"]
            else "unused" if info["producers"] and not info["consumers"]
            else "ok"
        )

    return {
        "variable_count": len(flow),
        "variables": flow,
        "tip": "status=orphan_use 表示引用了但没产生（可能拼错），unused 表示产生了但没用到",
    }


async def skill_search_modules(keyword: str, **_: Any) -> dict[str, Any]:
    """按关键词搜索模块（支持中英文模糊匹配，最多返回 50 条）"""
    if not keyword or not keyword.strip():
        return {"error": "关键词不能为空"}
    keyword = keyword.lower().strip()
    matches: list[dict[str, str]] = []
    for cat, modules in MODULE_CATEGORIES.items():
        for mtype, desc in modules.items():
            if keyword in mtype.lower() or keyword in desc.lower() or keyword in cat.lower():
                matches.append({"category": cat, "type": mtype, "description": desc})
    return {
        "keyword": keyword,
        "count": len(matches),
        "matches": matches[:50],
        "tip": "拿到 type 后用 describe_module 查看配置字段示例，再写 build_workflow",
    }


async def skill_list_workflow_templates(query: str | None = None, **_: Any) -> dict[str, Any]:
    """列出/搜索内置工作流模板。
    - 不传 query：返回所有模板的简表
    - 传 query：按用户需求关键词匹配最相关的几个模板
    """
    if query and query.strip():
        templates = find_template(query.strip())
    else:
        templates = WORKFLOW_TEMPLATES
    return {
        "count": len(templates),
        "templates": [
            {
                "name": t["name"],
                "description": t.get("description", ""),
                "triggers": t.get("triggers", []),
                "step_types": [s["type"] for s in t.get("steps", [])],
            }
            for t in templates
        ],
        "tip": "拿到模板名后调 get_workflow_template 看完整 steps，可直接喂给 build_workflow",
    }


async def skill_get_workflow_template(name: str, **_: Any) -> dict[str, Any]:
    """获取指定模板的完整内容（含 steps），可直接复制到 build_workflow"""
    if not name:
        return {"error": "缺少 name"}
    t = get_template_by_name(name)
    if not t:
        return {"error": f"未找到模板：{name}"}
    return {
        "template": t,
        "tip": "复制 steps 到 build_workflow.steps，把里面的 <占位符> 替换成用户实际需要的值",
    }


# === 2. 工作流文件管理类 ===

async def skill_list_workflows(**_: Any) -> dict[str, Any]:
    """列出本地保存的所有工作流文件"""
    folder = _get_workflow_folder()
    items: list[dict[str, Any]] = []
    for fp in sorted(folder.glob("*.json")):
        try:
            stat = fp.stat()
            items.append({
                "filename": fp.name,
                "name": fp.stem,
                "size_bytes": stat.st_size,
                "modified_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
            })
        except Exception as e:
            items.append({"filename": fp.name, "error": str(e)})
    return {"folder": str(folder), "count": len(items), "workflows": items}


async def skill_read_workflow(filename: str, **_: Any) -> dict[str, Any]:
    """读取一个工作流文件的内容"""
    folder = _get_workflow_folder()
    if not filename.endswith(".json"):
        filename = filename + ".json"
    fp = folder / filename
    # 防路径穿越
    try:
        fp.resolve().relative_to(folder.resolve())
    except ValueError:
        return {"error": "非法的文件名"}
    if not fp.exists():
        return {"error": f"文件不存在: {filename}"}
    try:
        data = json.loads(fp.read_text(encoding="utf-8"))
    except Exception as e:
        return {"error": f"读取失败: {e}"}
    # 给个轻量摘要（节点过多时不返回完整内容）
    nodes = data.get("nodes", [])
    edges = data.get("edges", [])
    summary = {
        "name": data.get("name", fp.stem),
        "node_count": len(nodes),
        "edge_count": len(edges),
        "node_types": sorted({n.get("type") for n in nodes if n.get("type")}),
    }
    if len(nodes) <= 30:
        summary["nodes"] = nodes
        summary["edges"] = edges
    return summary


async def skill_save_workflow_file(
    filename: str, nodes: list, edges: list, name: str | None = None, **_: Any
) -> dict[str, Any]:
    """把工作流保存到本地文件"""
    folder = _get_workflow_folder()
    if not filename.endswith(".json"):
        filename = filename + ".json"
    fp = folder / filename
    try:
        fp.resolve().relative_to(folder.resolve())
    except ValueError:
        return {"error": "非法的文件名"}

    payload = {
        "name": name or fp.stem,
        "nodes": nodes,
        "edges": edges,
        "saved_at": datetime.now().isoformat(),
    }
    try:
        fp.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    except Exception as e:
        return {"error": f"保存失败: {e}"}
    return {"success": True, "path": str(fp), "node_count": len(nodes)}


async def skill_delete_workflow(filename: str, **_: Any) -> dict[str, Any]:
    """删除一个本地工作流文件（高危操作，需用户批准）"""
    folder = _get_workflow_folder()
    if not filename.endswith(".json"):
        filename = filename + ".json"
    fp = folder / filename
    try:
        fp.resolve().relative_to(folder.resolve())
    except ValueError:
        return {"error": "非法的文件名"}
    if not fp.exists():
        return {"error": "文件不存在"}
    try:
        fp.unlink()
    except Exception as e:
        return {"error": f"删除失败: {e}"}
    return {"success": True, "deleted": filename}


# === 3. 节点/工作流构造类（生成节点 JSON 让前端应用） ===

def _make_node_id() -> str:
    return uuid.uuid4().hex[:10]


async def skill_build_node(
    module_type: str,
    config: dict | None = None,
    label: str | None = None,
    name: str | None = None,
    position: dict | None = None,
    **_: Any,
) -> dict[str, Any]:
    """构造一个节点 JSON（前端可直接 addNode 进画布）

    注意：label 是模块官方名（前端按 moduleType 自动从 moduleTypeLabels 映射成中文），
    AI 不应该改 label。如果想给节点起业务名，请用 name 字段（节点备注，画布会显示成
    「<官方模块名> (<name>)」）。
    """
    # 🛡️ 硬校验：严禁创建不存在的模块
    if _validate_module_types([module_type]):
        return {
            "error": "module_not_exist",
            "invalid_types": [module_type],
            "message": (
                f"模块类型「{module_type}」不存在于 WebRPA 内置模块清单，已拒绝创建。"
                "请先调用 search_modules / get_module_schema 确认正确的 module_type。绝不要虚构模块名。"
            ),
        }
    node_data: dict[str, Any] = {
        "moduleType": module_type,
        "config": apply_default_config(module_type, config or {}),
    }
    # 兼容历史：AI 仍可能传 label，把它当作业务名落到 name
    ai_business_name = name or label
    if ai_business_name and ai_business_name != module_type:
        node_data["name"] = ai_business_name
    node = {
        "id": _make_node_id(),
        "type": module_type,
        "position": position or {"x": 200.0, "y": 200.0},
        "data": node_data,
    }
    return {"node": node}


def _compute_branched_layout(
    *,
    steps: list[dict],
    step_ids: list[str],
    user_ids: dict[str, str],
    START_X: float,
    START_Y: float,
    NODE_W: float,
    NODE_H: float,
    GAP_X: float,
    GAP_Y: float,
) -> list[tuple[float, float]]:
    """🌳 分叉布局算法（让 condition / loop / 分支型工作流像人工搭建）

    思路：
      1. 找入口节点（被引用计数为 0 的节点）
      2. 从入口 BFS 遍历，按"主干 → 正下方，左分支 → 左下，右分支 → 右下"放置
      3. 同 X 坐标避让：发现位置占用就横向偏移
      4. 兜底：BFS 漏掉的节点（断流孤儿）按顺序排到画布最右侧

    分支类型识别：
      - condition / element_exists 等：true → 左下，false → 右下
      - loop / foreach：loop（循环体）→ 左下，done（结束后）→ 右下
      - probability_trigger：path1 → 左下，path2 → 右下
      - 任意 error 分支：→ 右侧偏移
    """
    n = len(steps)
    positions: list[tuple[float, float] | None] = [None] * n

    # 用户 id → idx 反查
    id_to_idx: dict[str, int] = {step_ids[i]: i for i in range(n)}

    def _resolve(ref: str) -> int | None:
        if not ref:
            return None
        actual = user_ids.get(ref, ref)
        return id_to_idx.get(actual)

    # 找入口（没被任何 next/branches 引用的节点）
    referenced: set[int] = set()
    for step in steps:
        nxt = step.get("next")
        if nxt:
            i = _resolve(str(nxt))
            if i is not None:
                referenced.add(i)
        for v in (step.get("branches") or {}).values():
            if v:
                i = _resolve(str(v))
                if i is not None:
                    referenced.add(i)
    # 没引用的就是入口
    roots = [i for i in range(n) if i not in referenced]
    if not roots:
        roots = [0]

    # 占用栅格：(col, row) → True
    occupied_grid: dict[tuple[int, int], bool] = {}

    def _grid_to_xy(col: int, row: int) -> tuple[float, float]:
        return (
            START_X + col * (NODE_W + GAP_X),
            START_Y + row * (NODE_H + GAP_Y),
        )

    def _claim(col: int, row: int) -> tuple[int, int]:
        """声明使用 (col, row)；如果占用则朝右移动直到空位"""
        c = col
        while (c, row) in occupied_grid:
            c += 1
        occupied_grid[(c, row)] = True
        return (c, row)

    # BFS：每个节点带 (idx, col_hint, row)
    visited: set[int] = set()
    queue: list[tuple[int, int, int]] = []

    base_col = 0
    for r in roots:
        if r not in visited:
            queue.append((r, base_col, 0))
            base_col += 1  # 多入口横向错开

    while queue:
        idx, col_hint, row = queue.pop(0)
        if idx in visited:
            continue
        visited.add(idx)

        c, r = _claim(col_hint, row)
        positions[idx] = _grid_to_xy(c, r)

        step = steps[idx]
        mtype = step.get("type") or ""
        branches = step.get("branches") or {}
        next_ref = step.get("next")

        # 处理 branches 显式分支
        if isinstance(branches, dict) and any(branches.values()):
            # 给不同 branch 分配相对位移
            branch_items = list(branches.items())
            # 把"成功/真"放左，"失败/假/error"放右
            def _branch_priority(key: str) -> int:
                k = key.lower()
                if k in ("true", "yes", "match", "exists", "visible", "loop", "body", "iter", "path1"):
                    return -1  # 左
                if k in ("false", "no", "miss", "not_exists", "invisible", "done", "after", "exit", "complete", "path2"):
                    return 1   # 右
                if k == "error":
                    return 2   # 最右
                return 0

            branch_items.sort(key=lambda x: _branch_priority(x[0]))
            offsets: dict[str, int] = {}
            negs = sum(1 for k, _ in branch_items if _branch_priority(k) < 0)
            poss = sum(1 for k, _ in branch_items if _branch_priority(k) > 0)
            # 简化：固定 -1 / +1 / +2 偏移（够用）
            left_idx = -max(1, negs)
            right_idx = 1
            for k, _v in branch_items:
                p = _branch_priority(k)
                if p < 0:
                    offsets[k] = left_idx
                    left_idx += 1
                elif p == 0:
                    offsets[k] = 0
                else:
                    offsets[k] = right_idx
                    right_idx += 1

            for bkey, btarget in branch_items:
                if not btarget:
                    continue
                ti = _resolve(str(btarget))
                if ti is None or ti in visited:
                    continue
                queue.append((ti, c + offsets[bkey], r + 1))
        else:
            # 主干：next 或 idx+1
            next_idx: int | None = None
            if next_ref:
                next_idx = _resolve(str(next_ref))
            elif idx + 1 < n:
                # 仅当下一节点未被任何分支引用时才作为主干
                if idx + 1 not in referenced:
                    next_idx = idx + 1

            if next_idx is not None and next_idx not in visited:
                queue.append((next_idx, c, r + 1))

    # 收尾：BFS 没访问到的节点（孤儿）按顺序排到画布右侧
    if not visited or len(visited) < n:
        max_col = max((c for c, _ in occupied_grid.keys()), default=0)
        for i in range(n):
            if positions[i] is None:
                max_col += 2  # 留一点距离
                positions[i] = _grid_to_xy(max_col, 0)

    return [p if p is not None else (START_X, START_Y) for p in positions]


# 画布专用伪类型（非执行器，但合法存在于画布）
_CANVAS_PSEUDO_TYPES = {"group", "note", "subflow", "subflow_header"}


def _get_valid_module_types() -> set[str]:
    """返回当前 WebRPA 真实存在、可被创建到画布的全部模块类型集合（权威清单）。

    来源：① 已注册执行器 registry.get_all_types() ② 画布伪类型 ③ 本地自定义模块 id。
    用于在"创建节点"前硬校验，杜绝 AI 虚构不存在的模块。
    """
    valid: set[str] = set(_CANVAS_PSEUDO_TYPES)
    try:
        from app.executors.base import registry as exec_registry
        valid |= set(exec_registry.get_all_types())
    except Exception:
        pass
    # 自定义模块（其 type 即模块 id / custom_module）
    valid.add("custom_module")
    try:
        folder = _get_data_folder() / "custom_modules"
        if folder.exists():
            for fp in folder.glob("*.json"):
                valid.add(fp.stem)
    except Exception:
        pass
    return valid


def _validate_module_types(types: list[str]) -> list[str]:
    """返回 types 中不存在于权威清单的非法模块类型（去重保序）。"""
    valid = _get_valid_module_types()
    seen: set[str] = set()
    invalid: list[str] = []
    for t in types:
        if not t or not isinstance(t, str):
            continue
        if t not in valid and t not in seen:
            seen.add(t)
            invalid.append(t)
    return invalid


async def skill_build_workflow(
    name: str,
    steps: list[dict],
    notes: list[dict] | None = None,
    layout: str = "auto",
    title_note: str | None = None,
    **_: Any,
) -> dict[str, Any]:
    """根据有序步骤生成完整工作流（节点 + 边 + 便签 + 智能排版 + 分支布局）

    Args:
        name: 工作流名称
        steps: 有序步骤数组，每个元素：
            {
                "type": "open_page",                     # 必填：模块 type
                "label": "打开网页",                      # 可选：节点的业务备注
                "config": {"url": "..."},                # 可选：节点配置
                "id": "step_open"                        # 可选：自定义 id（用于跳跃连接）
                "next": "step_click",                    # 可选：默认下一步连到哪
                "section": "登录流程",                    # 可选：分段标题
                "comment": "首先打开登录页面",            # 可选：节点旁自动黄色便签
                # 🌟 v2 新增：多分支显式连接（让画布像人工搭建一样有"分叉"）
                "branches": {                            # 可选：本节点的多个输出分支
                    "true": "step_click",                # condition / element_exists 等的"是"分支
                    "false": "step_skip",                # "否"分支
                    "loop": "step_inside",               # loop/foreach 的"循环体内"分支
                    "done": "step_after_loop",           # loop/foreach 的"循环结束"分支
                    "error": "step_handle_err",          # 任意模块的橙色错误分支
                },
                # 显式坐标（覆盖自动布局），AI 一般不需要传
                "x": 100, "y": 200,
            }
        notes: 显式追加便签（任意位置）
            [{"content": "...", "color": "yellow|blue|green|...",
              "anchor_to": "step_open", "side": "right|top|bottom"}]
            或 [{"content": "...", "x": 100, "y": 200}]
        layout: 'auto' / 'horizontal' / 'grid'。auto 默认按 8 个一行折回；
                如果 steps 中有节点用了 branches，自动切换成"主干 + 分叉"二维布局。
        title_note: 顶部置顶的整体说明便签内容（不传则不生成）

    返回 nodes/edges 数组可被前端 load_workflow_from_data 直接消费。

    🎨 排版设计建议（让 AI 生成的工作流像人工搭建）：
    - 主干清晰：用 next 串起主线，1-3 步一行不折回
    - 分叉明显：condition / element_exists / loop / foreach 等用 branches 显式分叉，
      自动布局会把不同分支的节点在 X 方向错开（左侧"成功/真"、右侧"失败/假"）
    - 错误处理：关键 IO 节点（api_request / open_page / send_email）通过 branches.error 接到
      统一的"错误处理"分支，让画布显示出"✓ 成功路径 + ⚠ 异常路径"两条线
    - 标注重点：用 comment / notes 给关键节点加便签，让用户一眼看懂业务意图
    - 分段：用 section 把工作流分成"准备/执行/收尾"等阶段，每段一行
    """
    if not isinstance(steps, list) or not steps:
        return {"error": "steps 不能为空"}

    # 🛡️ 硬校验：严禁创建不存在的模块。逐个核对 step.type 是否真实注册，
    #    只要有一个非法模块类型，整个工作流拒绝生成（不会把虚构模块放进画布）。
    _invalid = _validate_module_types([str(s.get("type") or "") for s in steps])
    if _invalid:
        return {
            "error": "module_not_exist",
            "invalid_types": _invalid,
            "message": (
                f"以下模块类型不存在于 WebRPA 内置模块清单，已拒绝创建：{', '.join(_invalid)}。"
                "请先调用 search_modules / get_module_schema 确认正确的 module_type，再重新 build_workflow。"
                "绝不要虚构或臆测模块名。"
            ),
        }

    # 节点尺寸常量（与前端默认一致）
    NODE_W = 220
    NODE_H = 100
    GAP_X = 80          # 同一行节点之间水平间距
    GAP_Y = 160         # 行间距（足够放置 between-node 的边/标签）
    SECTION_GAP = 60    # 不同 section 之间额外间距
    NOTE_W = 280        # 加宽默认便签宽度，避免长文本溢出
    NOTE_H = 100
    NOTE_GAP = 30       # 节点与便签之间的间距

    def _calc_note_size(content: str, font_size: int = 12, target_w: int = NOTE_W) -> tuple[int, int]:
        """根据内容自动算便签尺寸（中文按 1 个字符宽，英文/数字按 0.55 算）。
        NoteNode 实际结构：头部约 36px + 内容区 padding 20px + 文字本身。
        """
        text = str(content or "")
        if not text:
            return (target_w, max(100, NOTE_H))
        usable_w = target_w - 20  # 内容区左右 padding 各 10
        chars_per_line = max(1, int(usable_w / (font_size * 0.95)))
        lines = text.split("\n")
        total_lines = 0
        for line in lines:
            visual = 0.0
            for ch in line:
                # 中文/全角符号宽度按 1，英文按 0.55
                if "\u4e00" <= ch <= "\u9fa5" or "\u3000" <= ch <= "\u303f" or "\uff00" <= ch <= "\uffef":
                    visual += 1.0
                else:
                    visual += 0.55
            total_lines += max(1, int(visual / chars_per_line) + (1 if visual % chars_per_line else 0))
        # 头部 36px + 内容 padding 20px + 文字行高 1.6 * 字号 + 底部缓冲 8px
        line_h = font_size * 1.6
        h = int(36 + 20 + total_lines * line_h + 8)
        return (target_w, max(100, min(800, h)))
    NOTE_GAP = 30       # 节点与便签之间的间距

    # 起点（y 留出空间给 title_note + 步骤上方便签）
    START_X = 120.0
    START_Y = 280.0

    # 1) 给每一步分配 id
    step_ids: list[str] = []
    user_ids: dict[str, str] = {}  # 用户给的 id → 实际 id
    for idx, step in enumerate(steps):
        sid = step.get("id") or _make_node_id()
        # 防 id 冲突
        if sid in user_ids.values():
            sid = _make_node_id()
        step_ids.append(sid)
        if step.get("id"):
            user_ids[step["id"]] = sid

    # 2) 决定排版方式：
    #    - 显式 layout 优先
    #    - 否则若有 branches 自动开启"分叉布局"
    #    - 否则按 section 分组 + 8 个一行折回
    layout = (layout or "auto").lower()

    # 检测是否有任何分支
    _has_branches = any(
        step.get("branches") and isinstance(step.get("branches"), dict)
        for step in steps
    )

    # 收集 section 顺序
    section_order: list[str] = []
    section_for_idx: list[str] = []
    for step in steps:
        sec = step.get("section") or ""
        if sec and sec not in section_order:
            section_order.append(sec)
        section_for_idx.append(sec)

    # 计算每个步骤的位置
    positions: list[tuple[float, float]] = []

    if layout == "horizontal":
        # 单行铺开（适合短工作流）
        for idx in range(len(steps)):
            x = START_X + idx * (NODE_W + GAP_X)
            positions.append((x, START_Y))

    elif layout == "grid":
        # 强制网格 4 列
        cols = 4
        for idx in range(len(steps)):
            row = idx // cols
            col = idx % cols
            x = START_X + col * (NODE_W + GAP_X)
            y = START_Y + row * (NODE_H + GAP_Y)
            positions.append((x, y))

    elif _has_branches and layout in ("auto", "branched"):
        # 🌳 分叉布局（树形）
        # 思路：从首节点开始 BFS，按"主干（next/done）→正下方，分支（true/loop）→左前下方，
        #       分支（false/error）→右前下方"原则放置
        # 不能 100% 完美但能避免直线/竖线，让画布有人工搭建的层次感
        positions = _compute_branched_layout(
            steps=steps,
            step_ids=step_ids,
            user_ids=user_ids,
            START_X=START_X,
            START_Y=START_Y,
            NODE_W=NODE_W,
            NODE_H=NODE_H,
            GAP_X=GAP_X,
            GAP_Y=GAP_Y,
        )

    else:
        # auto：按 section 分行；同一 section 横向铺开，超 8 个换行
        # 没有 section 时整体按 8 个一行折回（蛇形）
        if section_order:
            # 不同 section 各占一行（或多行）
            current_y = START_Y
            section_to_pos: dict[int, tuple[float, float]] = {}
            for sec in section_order or [""]:
                sec_indices = [i for i in range(len(steps)) if section_for_idx[i] == sec]
                # 该 section 节点超 8 个则换行
                row_size = 8
                for j, sec_idx in enumerate(sec_indices):
                    row = j // row_size
                    col = j % row_size
                    x = START_X + col * (NODE_W + GAP_X)
                    y = current_y + row * (NODE_H + GAP_Y)
                    section_to_pos[sec_idx] = (x, y)
                # 更新下一段起始 y
                used_rows = (len(sec_indices) - 1) // row_size + 1
                current_y += used_rows * (NODE_H + GAP_Y) + SECTION_GAP
            for i in range(len(steps)):
                # 没标 section 的也归类到""
                positions.append(section_to_pos.get(i, (START_X, START_Y)))
        else:
            # 没有 section：8 个一行蛇形折回
            row_size = 8
            for idx in range(len(steps)):
                row = idx // row_size
                col = idx % row_size
                # 偶数行从左到右，奇数行从右到左 → 蛇形（连线最短）
                if row % 2 == 1:
                    col = row_size - 1 - col
                x = START_X + col * (NODE_W + GAP_X)
                y = START_Y + row * (NODE_H + GAP_Y)
                positions.append((x, y))

    # 用户传了显式 x/y，覆盖自动布局
    for idx, step in enumerate(steps):
        if "x" in step and "y" in step:
            positions[idx] = (float(step["x"]), float(step["y"]))

    # 3) 生成节点
    nodes: list[dict[str, Any]] = []
    for idx, step in enumerate(steps):
        mtype = step.get("type")
        if not mtype:
            return {"error": f"第 {idx} 步缺少 type 字段"}
        sid = step_ids[idx]
        x, y = positions[idx]
        # 业务配置全部直接展开到 data（NodeData 是扁平结构）
        cfg = step.get("config") or {}
        # 自动套用 schema 默认值（用户传的优先，没传的用默认）
        # 这样 AI 即便忘填某些可选字段，工作流也能跑通
        cfg = apply_default_config(mtype, cfg)
        # 注意：label 是模块官方名（前端会按 moduleType 自动用中文映射兜底，AI 不要试图改它）
        # AI 给的 label 实际是"业务命名"，把它写到 name 字段当备注
        node_data: dict[str, Any] = {
            "moduleType": mtype,
        }
        ai_name = step.get("label") or step.get("name")
        if ai_name and ai_name != mtype:
            node_data["name"] = ai_name
        # 注意：comment 只用来生成便签节点（见 5b），不再叠加到节点头部的 remark 字段，
        # 避免与配置面板里的"节点备注"输入框（绑定 name 字段）显示不一致
        node_data.update(cfg)

        node = {
            "id": sid,
            "type": mtype,
            "position": {"x": float(x), "y": float(y)},
            "data": node_data,
        }
        nodes.append(node)

    # 4) 生成边（按 next/默认相邻 + branches 多分支）
    edges: list[dict[str, Any]] = []

    # 哪些 module_type 的"是/否"分支用 true/false handle id
    BOOL_BRANCH_TYPES = {
        "condition", "element_exists", "element_visible",
        "image_exists", "phone_image_exists", "face_recognition",
    }

    def _normalize_branch_handle(mtype: str, branch_key: str) -> str:
        """把 branches 字典里的 key 翻译成实际 sourceHandle id"""
        k = branch_key.lower()
        # error 全局通用
        if k == "error":
            return "error"
        # 循环类
        if mtype in ("loop", "foreach", "foreach_dict"):
            if k in ("loop", "body", "iter", "true", "yes"):
                return "loop"
            if k in ("done", "after", "exit", "false", "no", "complete"):
                return "done"
        # 条件/存在判定类
        if mtype in BOOL_BRANCH_TYPES:
            if k in ("true", "yes", "match", "exists", "visible"):
                return "true"
            if k in ("false", "no", "miss", "not_exists", "invisible"):
                return "false"
        # probability_trigger
        if mtype == "probability_trigger":
            if k in ("path1", "true", "yes", "a"):
                return "path1"
            if k in ("path2", "false", "no", "b"):
                return "path2"
        # 用户给了原值就直接用
        return branch_key

    def _resolve_id(ref: str) -> str | None:
        """先在 user_ids 里找，再在 step_ids 里精确找"""
        if not ref:
            return None
        if ref in user_ids:
            return user_ids[ref]
        if ref in step_ids:
            return ref
        return None

    for idx, step in enumerate(steps):
        sid = step_ids[idx]
        mtype = step.get("type") or ""
        next_ref = step.get("next")
        branches = step.get("branches") or {}
        has_branches = isinstance(branches, dict) and any(branches.values())

        # 4a) 主干边
        target_id: str | None = None
        if next_ref:
            target_id = _resolve_id(next_ref)
        elif idx < len(steps) - 1 and not has_branches:
            # 默认连下一条；但如果声明了 branches，则不自动连下一条，让 AI 显式声明
            target_id = step_ids[idx + 1]

        if target_id and target_id != sid:
            edges.append({
                "id": f"e-{sid}-{target_id}",
                "source": sid,
                "target": target_id,
                "type": "smoothstep",
                "animated": True,
            })

        # 4b) 显式分支边（branches 字典）
        if has_branches:
            for bkey, btarget_ref in branches.items():
                if not btarget_ref:
                    continue
                btarget = _resolve_id(str(btarget_ref))
                if not btarget or btarget == sid:
                    continue
                handle_id = _normalize_branch_handle(mtype, str(bkey))
                edges.append({
                    "id": f"e-{sid}-{handle_id}-{btarget}",
                    "source": sid,
                    "sourceHandle": handle_id,
                    "target": btarget,
                    "type": "smoothstep",
                    "animated": True,
                })

    # 5) 生成便签（智能排版）
    note_nodes: list[dict[str, Any]] = []

    # === 碰撞避让的核心数据结构：所有已占用的矩形（节点 + 已放便签） ===
    # 每个矩形 (x, y, w, h)。便签新位置会用这个列表做碰撞检测，重叠就自动挪开
    occupied_rects: list[tuple[float, float, float, float]] = []
    for n in nodes:
        occupied_rects.append((
            n["position"]["x"],
            n["position"]["y"],
            float(NODE_W),
            float(NODE_H),
        ))

    PAD = 12.0  # 便签和占用矩形之间的最小间距

    def _rects_overlap(a: tuple[float, float, float, float],
                       b: tuple[float, float, float, float],
                       pad: float = PAD) -> bool:
        ax, ay, aw, ah = a
        bx, by, bw, bh = b
        return not (
            ax + aw + pad <= bx
            or bx + bw + pad <= ax
            or ay + ah + pad <= by
            or by + bh + pad <= ay
        )

    def _find_free_position(
        ideal_x: float,
        ideal_y: float,
        w: float,
        h: float,
        prefer: str = "down",
    ) -> tuple[float, float]:
        """从 (ideal_x, ideal_y) 开始，按 prefer 方向螺旋搜索一个不与任何 occupied 矩形重叠的位置。
        prefer: 'down' / 'up' / 'right' / 'left' 决定优先尝试方向
        """
        candidate = (ideal_x, ideal_y, w, h)
        if not any(_rects_overlap(candidate, r) for r in occupied_rects):
            return ideal_x, ideal_y

        # 按方向偏移搜索
        step = 24.0
        max_tries = 60
        # 优先方向序列
        dirs = {
            "down":  [(0, 1), (1, 0), (-1, 0), (0, -1), (1, 1), (-1, 1), (1, -1), (-1, -1)],
            "up":    [(0, -1), (1, 0), (-1, 0), (0, 1), (1, -1), (-1, -1), (1, 1), (-1, 1)],
            "right": [(1, 0), (0, 1), (0, -1), (-1, 0), (1, 1), (1, -1), (-1, 1), (-1, -1)],
            "left":  [(-1, 0), (0, 1), (0, -1), (1, 0), (-1, 1), (-1, -1), (1, 1), (1, -1)],
        }.get(prefer, [(0, 1), (1, 0), (-1, 0), (0, -1)])

        for ring in range(1, max_tries):
            for dx, dy in dirs:
                tx = ideal_x + dx * step * ring
                ty = ideal_y + dy * step * ring
                cand = (tx, ty, w, h)
                if not any(_rects_overlap(cand, r) for r in occupied_rects):
                    return tx, ty

        # 实在找不到，硬挪到画布最右侧避免覆盖
        max_x = max((r[0] + r[2] for r in occupied_rects), default=START_X) + 80
        return max_x, ideal_y

    def _add_note(
        ideal_x: float,
        ideal_y: float,
        w: float,
        h: float,
        prefer: str,
        data: dict,
    ):
        """放一个便签，自动避让已占用矩形"""
        nx, ny = _find_free_position(ideal_x, ideal_y, w, h, prefer=prefer)
        occupied_rects.append((nx, ny, w, h))
        note_nodes.append({
            "id": _make_node_id(),
            "type": "note",
            "position": {"x": float(nx), "y": float(ny)},
            "data": data,
            "style": {"width": int(w), "height": int(h)},
            "zIndex": -1,
        })

    # 5a) 顶部"工作流说明"便签（如果有）
    if title_note:
        title_w, title_h = _calc_note_size(title_note[:600], font_size=14, target_w=max(NOTE_W * 2, 480))
        # 顶部便签固定放在画布最上方，不参与避让搜索（但加入 occupied 让后续避开它）
        title_x = float(START_X)
        title_y = 60.0
        occupied_rects.append((title_x, title_y, float(title_w), float(title_h)))
        note_nodes.append({
            "id": _make_node_id(),
            "type": "note",
            "position": {"x": title_x, "y": title_y},
            "data": {
                "label": "",
                "moduleType": "note",
                "content": title_note[:600],
                "color": "#bfdbfe",  # 蓝色：整体说明
                "fontSize": 14,
                "fontBold": True,
            },
            "style": {"width": title_w, "height": title_h},
            "zIndex": -1,
        })

    # 5b) 每个 step 的 comment（如果有）→ 在该节点上方生成小便签，自动避让重叠
    for idx, step in enumerate(steps):
        if not step.get("comment"):
            continue
        sx, sy = positions[idx]
        comment_text = str(step["comment"])[:300]
        cmt_w, cmt_h = _calc_note_size(comment_text, font_size=12, target_w=NOTE_W)
        # 优先放节点上方；如果上方与 title 或其他便签重叠，再让 _find_free_position 重定位
        title_overlap_zone = title_note is not None and sy < 200
        if title_overlap_zone:
            # 第一行节点上方有 title，便签放节点右侧
            ideal_x = sx + NODE_W + NOTE_GAP
            ideal_y = sy
            prefer = "right"
        else:
            ideal_x = sx
            ideal_y = sy - cmt_h - NOTE_GAP
            prefer = "up"
        _add_note(ideal_x, ideal_y, float(cmt_w), float(cmt_h), prefer, {
            "label": "",
            "moduleType": "note",
            "content": comment_text,
            "color": "#fef08a",  # 黄色：步骤注释
            "fontSize": 12,
        })

    # 5c) 显式追加的 notes（同样走避让）
    if notes:
        color_map = {
            "yellow": "#fef08a", "green": "#bbf7d0", "blue": "#bfdbfe",
            "purple": "#ddd6fe", "pink": "#fbcfe8", "orange": "#fed7aa",
            "white": "#ffffff", "gray": "#e5e7eb",
        }
        for n in notes:
            content = (n.get("content") or "").strip()
            if not content:
                continue
            color = color_map.get((n.get("color") or "yellow").lower(), "#fef08a")
            anchor = n.get("anchor_to")
            side = (n.get("side") or "right").lower()
            note_fs = int(n.get("font_size", 13))
            auto_w, auto_h = _calc_note_size(content[:600], font_size=note_fs, target_w=NOTE_W)
            w = int(n.get("width", auto_w))
            h = int(n.get("height", auto_h))
            ideal_x: float
            ideal_y: float
            prefer: str = "down"
            if anchor:
                anchor_id = _resolve_id(str(anchor))
                if anchor_id and anchor_id in step_ids:
                    aidx = step_ids.index(anchor_id)
                    ax, ay = positions[aidx]
                    if side == "top":
                        ideal_x = ax
                        ideal_y = ay - h - NOTE_GAP
                        prefer = "up"
                    elif side == "bottom":
                        ideal_x = ax
                        ideal_y = ay + NODE_H + NOTE_GAP
                        prefer = "down"
                    elif side == "left":
                        ideal_x = ax - w - NOTE_GAP
                        ideal_y = ay
                        prefer = "left"
                    else:  # right
                        ideal_x = ax + NODE_W + NOTE_GAP
                        ideal_y = ay
                        prefer = "right"
                else:
                    ideal_x = float(n.get("x", START_X))
                    ideal_y = float(n.get("y", START_Y))
            else:
                ideal_x = float(n.get("x", START_X))
                ideal_y = float(n.get("y", START_Y))
            _add_note(ideal_x, ideal_y, float(w), float(h), prefer, {
                "label": "",
                "moduleType": "note",
                "content": content[:600],
                "color": color,
                "fontSize": note_fs,
                "fontBold": bool(n.get("bold", False)),
                "fontItalic": bool(n.get("italic", False)),
            })

    # 把便签放在节点之前（让 react-flow 渲染顺序合理；前端 zIndex 也设为 -1）
    all_nodes = note_nodes + nodes

    return {
        "name": name,
        "nodes": all_nodes,
        "edges": edges,
        "node_count": len(nodes),
        "note_count": len(note_nodes),
        "edge_count": len(edges),
    }


# === 4. 系统状态查询类 ===

async def skill_list_executors(**_: Any) -> dict[str, Any]:
    """列出所有已注册的执行器（实际能跑的模块类型）"""
    try:
        from app.executors.base import registry as exec_registry
        types = sorted(exec_registry.get_all_types())
        return {"count": len(types), "types": types}
    except Exception as e:
        return {"error": str(e)}


async def skill_list_custom_modules(**_: Any) -> dict[str, Any]:
    """列出所有用户创建的自定义模块"""
    folder = _get_data_folder() / "custom_modules"
    if not folder.exists():
        return {"count": 0, "modules": []}
    items: list[dict[str, Any]] = []
    for fp in sorted(folder.glob("*.json")):
        try:
            data = json.loads(fp.read_text(encoding="utf-8"))
            items.append({
                "id": data.get("id"),
                "name": data.get("name"),
                "description": data.get("description", ""),
                "category": data.get("category", ""),
            })
        except Exception:
            pass
    return {"count": len(items), "modules": items}


async def skill_list_scheduled_tasks(**_: Any) -> dict[str, Any]:
    """列出所有计划任务"""
    fp = _get_data_folder() / "scheduled_tasks.json"
    if not fp.exists():
        return {"count": 0, "tasks": []}
    try:
        data = json.loads(fp.read_text(encoding="utf-8"))
        # 数据结构兼容
        if isinstance(data, list):
            tasks = data
        elif isinstance(data, dict):
            tasks = data.get("tasks", [])
        else:
            tasks = []
        return {"count": len(tasks), "tasks": tasks}
    except Exception as e:
        return {"error": str(e)}


async def skill_get_current_workflow(**_: Any) -> dict[str, Any]:
    """获取当前画布上的工作流（前端会随每次对话发送）。
    这个 Skill 主要用于 LLM 显式查询，但实际数据在每轮对话的 system prompt 里已经注入过。
    """
    return {
        "note": "当前画布的节点和边已包含在系统提示词的'当前工作流的状态'部分。如需更详细的节点配置，请使用 client_action 工具的 'get_workflow_detail' 动作。",
    }


async def skill_get_workflow_executors_for_canvas(**_: Any) -> dict[str, Any]:
    """获取所有真实可用的执行器类型，并按知识库分类组织
    （用于 LLM 想要"看清楚有哪些模块"时调用）
    """
    try:
        from app.executors.base import registry as exec_registry
        types = sorted(exec_registry.get_all_types())
    except Exception as e:
        return {"error": str(e)}

    # 把它们映射回知识库分类
    type_to_cat: dict[str, str] = {}
    for cat, modules in MODULE_CATEGORIES.items():
        for mtype in modules:
            type_to_cat[mtype] = cat

    grouped: dict[str, list[str]] = {}
    uncategorized: list[str] = []
    for t in types:
        cat = type_to_cat.get(t)
        if cat:
            grouped.setdefault(cat, []).append(t)
        else:
            uncategorized.append(t)

    return {
        "total": len(types),
        "categorized": grouped,
        "uncategorized": uncategorized,
    }


async def skill_get_recent_logs(workflow_id: str | None = None, limit: int = 50, **_: Any) -> dict[str, Any]:
    """获取最近的工作流执行日志（如果有的话）"""
    try:
        from app.api.workflows import execution_results, variable_tracking_store
    except Exception as e:
        return {"error": f"无法访问日志: {e}"}

    if workflow_id and workflow_id in execution_results:
        result = execution_results[workflow_id]
        return {
            "workflow_id": workflow_id,
            "status": result.status.value if hasattr(result.status, "value") else str(result.status),
            "executed_nodes": result.executed_nodes,
            "failed_nodes": result.failed_nodes,
            "error_message": result.error_message,
        }

    # 没指定 workflow_id 就返回所有运行结果摘要
    summaries = []
    for wid, result in list(execution_results.items())[-int(limit):]:
        summaries.append({
            "workflow_id": wid,
            "status": result.status.value if hasattr(result.status, "value") else str(result.status),
            "executed_nodes": result.executed_nodes,
            "failed_nodes": result.failed_nodes,
        })
    return {"count": len(summaries), "executions": summaries}


# === 5b. 全量快照类（一次拿到 WebRPA 所有可见状态） ===

async def skill_get_full_snapshot(**_: Any) -> dict[str, Any]:
    """一次性拿到当前 WebRPA 后端全部可见状态：执行器列表、自定义模块、计划任务、本地工作流、最近执行结果。
    用于 LLM 第一次开始任务时获得整体上下文。"""
    snap: dict[str, Any] = {}
    # 1) 执行器
    try:
        from app.executors.base import registry as exec_registry
        types = sorted(exec_registry.get_all_types())
        snap["executors_count"] = len(types)
        snap["executor_types"] = types[:200]
    except Exception as e:
        snap["executors_error"] = str(e)
    # 2) 本地工作流
    try:
        folder = _get_workflow_folder()
        snap["local_workflows"] = [
            fp.stem for fp in sorted(folder.glob("*.json"))
        ]
    except Exception as e:
        snap["local_workflows_error"] = str(e)
    # 3) 自定义模块
    try:
        cm_folder = _get_data_folder() / "custom_modules"
        custom: list[dict[str, Any]] = []
        if cm_folder.exists():
            for fp in sorted(cm_folder.glob("*.json")):
                try:
                    data = json.loads(fp.read_text(encoding="utf-8"))
                    custom.append({
                        "id": data.get("id"),
                        "name": data.get("name"),
                        "category": data.get("category", ""),
                    })
                except Exception:
                    pass
        snap["custom_modules"] = custom
    except Exception as e:
        snap["custom_modules_error"] = str(e)
    # 4) 计划任务
    try:
        fp = _get_data_folder() / "scheduled_tasks.json"
        if fp.exists():
            data = json.loads(fp.read_text(encoding="utf-8"))
            tasks = data if isinstance(data, list) else data.get("tasks", [])
            snap["scheduled_tasks"] = [
                {
                    "id": t.get("id"),
                    "name": t.get("name"),
                    "enabled": t.get("enabled"),
                    "trigger_type": t.get("trigger_type") or t.get("triggerType"),
                }
                for t in tasks
            ]
        else:
            snap["scheduled_tasks"] = []
    except Exception as e:
        snap["scheduled_tasks_error"] = str(e)
    # 5) 最近执行结果摘要
    try:
        from app.api.workflows import execution_results
        recents = []
        for wid, r in list(execution_results.items())[-10:]:
            recents.append({
                "workflow_id": wid,
                "status": r.status.value if hasattr(r.status, "value") else str(r.status),
                "executed_nodes": r.executed_nodes,
                "failed_nodes": r.failed_nodes,
            })
        snap["recent_executions"] = recents
    except Exception:
        snap["recent_executions"] = []
    # 6) 全局变量
    try:
        from app.services.variable_manager import VariableManager
        # 这里默认全局变量管理器是单例形式，但项目里通常按工作流创建，所以仅返回标记
        snap["note"] = "运行时全局变量请通过 list_global_variables 查询"
    except Exception:
        pass
    return snap


async def skill_list_global_variables(**_: Any) -> dict[str, Any]:
    """读取所有持久化的全局变量"""
    try:
        # WebRPA 把全局变量存储为前端 store 状态，但执行器会持久化到 backend/data/global_vars.json
        fp = _get_data_folder() / "global_vars.json"
        if not fp.exists():
            return {"variables": {}, "note": "目前还没有持久化的全局变量"}
        data = json.loads(fp.read_text(encoding="utf-8"))
        return {"variables": data, "count": len(data) if isinstance(data, dict) else 0}
    except Exception as e:
        return {"error": str(e)}


# === 5c. 计划任务管理（CRUD） ===

async def skill_get_scheduled_task(task_id: str, **_: Any) -> dict[str, Any]:
    """获取某个计划任务的详情"""
    fp = _get_data_folder() / "scheduled_tasks.json"
    if not fp.exists():
        return {"error": "暂无计划任务"}
    try:
        data = json.loads(fp.read_text(encoding="utf-8"))
        tasks = data if isinstance(data, list) else data.get("tasks", [])
        for t in tasks:
            if t.get("id") == task_id:
                return {"task": t}
        return {"error": f"未找到任务 {task_id}"}
    except Exception as e:
        return {"error": str(e)}


async def skill_get_scheduled_task_logs(task_id: str | None = None, limit: int = 50, **_: Any) -> dict[str, Any]:
    """读取计划任务的执行日志"""
    fp = _get_data_folder() / "scheduled_task_logs.json"
    if not fp.exists():
        return {"logs": [], "count": 0}
    try:
        data = json.loads(fp.read_text(encoding="utf-8"))
        logs = data if isinstance(data, list) else data.get("logs", [])
        if task_id:
            logs = [l for l in logs if l.get("task_id") == task_id]
        logs = logs[-int(limit):]
        return {"logs": logs, "count": len(logs)}
    except Exception as e:
        return {"error": str(e)}


# === 5d. 资源管理类 ===

async def skill_list_data_assets(folder: str | None = None, **_: Any) -> dict[str, Any]:
    """列出所有 Excel 数据资源（uploads/excel）"""
    try:
        from app.api.data_assets import data_assets
        items = []
        for a in data_assets.values():
            if folder is not None and a.get("folder") != folder:
                continue
            items.append({
                "id": a.get("id"),
                "name": a.get("name"),
                "folder": a.get("folder", ""),
                "size": a.get("size"),
                "sheets": a.get("sheetNames", []),
            })
        return {"count": len(items), "assets": items}
    except Exception as e:
        return {"error": str(e)}


async def skill_list_image_assets(folder: str | None = None, **_: Any) -> dict[str, Any]:
    """列出所有图像资源（uploads/images）"""
    try:
        from app.api.image_assets import image_assets
        items = []
        for a in image_assets.values():
            if folder is not None and a.get("folder") != folder:
                continue
            items.append({
                "id": a.get("id"),
                "name": a.get("name"),
                "folder": a.get("folder", ""),
                "size": a.get("size"),
                "extension": a.get("extension"),
            })
        return {"count": len(items), "images": items}
    except Exception as e:
        return {"error": str(e)}


async def skill_get_custom_module(module_id: str, **_: Any) -> dict[str, Any]:
    """获取自定义模块的完整定义（包括内部工作流）"""
    folder = _get_data_folder() / "custom_modules"
    if not folder.exists():
        return {"error": "自定义模块目录不存在"}
    fp = folder / f"{module_id}.json"
    try:
        fp.resolve().relative_to(folder.resolve())
    except ValueError:
        return {"error": "非法 module_id"}
    if not fp.exists():
        return {"error": f"未找到模块 {module_id}"}
    try:
        data = json.loads(fp.read_text(encoding="utf-8"))
        return {"module": data}
    except Exception as e:
        return {"error": str(e)}


# === 5e. 全文搜索（在所有本地工作流和自定义模块里搜文本） ===

async def skill_search_in_workflows(keyword: str, **_: Any) -> dict[str, Any]:
    """在所有本地工作流的 JSON 里搜索关键词（含节点 label、URL、变量名等）"""
    if not keyword.strip():
        return {"error": "关键词不能为空"}
    folder = _get_workflow_folder()
    matches: list[dict[str, Any]] = []
    kw = keyword.lower()
    for fp in sorted(folder.glob("*.json")):
        try:
            text = fp.read_text(encoding="utf-8")
            if kw in text.lower():
                # 找出包含关键词的节点
                data = json.loads(text)
                hits: list[dict[str, Any]] = []
                for n in data.get("nodes", []):
                    n_text = json.dumps(n, ensure_ascii=False).lower()
                    if kw in n_text:
                        hits.append({
                            "id": n.get("id"),
                            "type": n.get("type"),
                            "label": (n.get("data") or {}).get("label", ""),
                        })
                matches.append({
                    "filename": fp.name,
                    "name": fp.stem,
                    "hit_nodes": hits[:10],
                })
        except Exception:
            continue
    return {"keyword": keyword, "files_matched": len(matches), "matches": matches[:20]}


# === 5f. 上下文摘要 / AI 自主任务计划 ===

async def skill_summarize_workflow(filename: str, **_: Any) -> dict[str, Any]:
    """读一个工作流并产出结构化摘要（节点序列 + 入口/出口 + 变量使用）"""
    folder = _get_workflow_folder()
    if not filename.endswith(".json"):
        filename = filename + ".json"
    fp = folder / filename
    try:
        fp.resolve().relative_to(folder.resolve())
    except ValueError:
        return {"error": "非法文件名"}
    if not fp.exists():
        return {"error": "文件不存在"}
    try:
        data = json.loads(fp.read_text(encoding="utf-8"))
    except Exception as e:
        return {"error": f"解析失败: {e}"}

    nodes = data.get("nodes", [])
    edges = data.get("edges", [])
    in_edges: dict[str, int] = {}
    out_edges: dict[str, int] = {}
    for e in edges:
        in_edges[e.get("target")] = in_edges.get(e.get("target"), 0) + 1
        out_edges[e.get("source")] = out_edges.get(e.get("source"), 0) + 1

    entries = [n.get("id") for n in nodes if in_edges.get(n.get("id"), 0) == 0]
    exits = [n.get("id") for n in nodes if out_edges.get(n.get("id"), 0) == 0]

    # 抽取节点配置中的变量引用
    import re as _re
    var_pattern = _re.compile(r"\{([A-Za-z_][\w]*)\}")
    var_uses: set[str] = set()
    for n in nodes:
        text = json.dumps(n.get("data", {}), ensure_ascii=False)
        for m in var_pattern.findall(text):
            var_uses.add(m)

    # 节点顺序（拓扑近似）
    type_seq = [n.get("type") for n in nodes if n.get("type")]

    return {
        "name": data.get("name", fp.stem),
        "node_count": len(nodes),
        "edge_count": len(edges),
        "entry_nodes": entries[:10],
        "exit_nodes": exits[:10],
        "node_type_sequence": type_seq[:50],
        "variables_used": sorted(var_uses)[:30],
    }


# === 5. 长期记忆类 ===

def _get_memory_file() -> Path:
    folder = _get_data_folder() / "ai_assistant"
    folder.mkdir(parents=True, exist_ok=True)
    return folder / "long_term_memory.json"


def _load_memory() -> list[dict[str, Any]]:
    fp = _get_memory_file()
    if not fp.exists():
        return []
    try:
        data = json.loads(fp.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except Exception:
        return []


def _save_memory(items: list[dict[str, Any]]) -> None:
    fp = _get_memory_file()
    fp.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")


async def skill_remember(content: str, tags: list[str] | None = None, **_: Any) -> dict[str, Any]:
    """把一条长期记忆写入存档（用户的偏好、习惯、重要约定等）"""
    if not content.strip():
        return {"error": "记忆内容不能为空"}
    items = _load_memory()
    entry = {
        "id": uuid.uuid4().hex[:10],
        "content": content.strip(),
        "tags": tags or [],
        "created_at": datetime.now().isoformat(),
    }
    items.append(entry)
    # 上限 500 条，超过删最早
    if len(items) > 500:
        items = items[-500:]
    _save_memory(items)
    return {"success": True, "entry": entry, "total": len(items)}


async def skill_recall(keyword: str = "", limit: int = 10, **_: Any) -> dict[str, Any]:
    """查询长期记忆（按关键词或返回最近的若干条）"""
    items = _load_memory()
    if keyword:
        kw = keyword.lower()
        filtered = [
            i for i in items
            if kw in i.get("content", "").lower() or kw in " ".join(i.get("tags", [])).lower()
        ]
    else:
        filtered = items
    filtered.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return {"count": len(filtered), "entries": filtered[: int(limit)]}


async def skill_forget(memory_id: str, **_: Any) -> dict[str, Any]:
    """删除一条长期记忆"""
    items = _load_memory()
    new_items = [i for i in items if i.get("id") != memory_id]
    if len(new_items) == len(items):
        return {"error": "未找到该记忆"}
    _save_memory(new_items)
    return {"success": True, "remaining": len(new_items)}


# === 6. 全局配置查询（只读，写入交给前端） ===

async def skill_get_global_config_keys(**_: Any) -> dict[str, Any]:
    """列出 WebRPA 全局配置中可配置的字段"""
    return {
        "categories": [
            {"key": "system", "items": ["checkUpdateOnStartup", "autoDetectClipboardScreenshot"]},
            {"key": "ai", "items": ["apiUrl", "apiKey", "model", "temperature", "maxTokens", "systemPrompt"]},
            {"key": "aiAssistant", "items": ["apiUrl", "apiKey", "model", "temperature", "maxTokens", "systemPrompt", "enableTools", "autoApprove"]},
            {"key": "aiScraper", "items": ["llmProvider", "apiUrl", "llmModel", "apiKey"]},
            {"key": "email", "items": ["senderEmail", "authCode", "smtpServer", "smtpPort"]},
            {"key": "browser", "items": ["type", "executablePath", "userDataDir", "fullscreen", "autoCloseBrowser", "launchArgs"]},
            {"key": "database", "items": ["host", "port", "user", "password", "database"]},
            {"key": "qq", "items": ["apiUrl", "accessToken"]},
            {"key": "feishu", "items": ["appId", "appSecret"]},
        ],
        "note": "实际写入由前端 globalConfigStore 完成。如需修改，请使用 update_global_config 工具，前端会接收并应用。",
    }


# === 7. 系统执行能力（PowerShell + Python 临时脚本） ===

import asyncio as _asyncio
import os as _os
import sys as _sys
import tempfile as _tempfile


def _project_root() -> Path:
    """WebRPA 项目根目录（包含 backend/ 和 Python313/）"""
    # backend/app/services/ai_assistant_skills.py -> backend/app/services -> backend/app -> backend -> 根
    return Path(__file__).parent.parent.parent.parent


def _get_bundled_python_path() -> str:
    """获取 WebRPA 内置的 Python313/python.exe；不存在时回退到当前解释器"""
    py = _project_root() / "Python313" / "python.exe"
    if py.exists():
        return str(py)
    # macOS / Linux 的子目录可能叫 python313/bin/python
    py_unix = _project_root() / "Python313" / "bin" / "python"
    if py_unix.exists():
        return str(py_unix)
    return _sys.executable


async def skill_run_shell_command(
    command: str,
    cwd: str | None = None,
    timeout: int = 60,
    shell: str | None = None,
    **_: Any,
) -> dict[str, Any]:
    """执行系统 shell 命令（Windows 默认走 PowerShell，其他平台走默认 shell）。

    Args:
        command: 要执行的命令（多行命令也支持）
        cwd: 工作目录，留空 = 项目根目录
        timeout: 超时秒数，最大 600
        shell: 强制指定 shell：'powershell' / 'cmd' / 'bash' / 'sh'。留空走平台默认
    """
    if not command or not command.strip():
        return {"error": "命令不能为空"}

    # 安全护栏：拦截灾难级命令 + 审计
    try:
        from app.services.ai_command_guard import check_shell_command, audit
        _allowed, _reason = check_shell_command(command)
        if not _allowed:
            audit("shell", command, allowed=False, reason=_reason, cwd=cwd or "")
            return {"error": f"该命令被安全护栏拦截：{_reason}。如确需执行，请手动在终端运行。", "blocked": True}
        audit("shell", command, allowed=True, cwd=cwd or "")
    except Exception:
        pass

    timeout = min(max(int(timeout), 1), 600)
    work_dir = cwd or str(_project_root())
    is_windows = _os.name == "nt"

    # 决定使用什么 shell
    s = (shell or "").strip().lower()
    if not s:
        s = "powershell" if is_windows else "bash"

    if s == "powershell":
        # 用 -NoProfile 避免加载用户 profile 拖慢启动
        cmd_args = [
            "powershell.exe",
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy", "Bypass",
            "-Command", command,
        ]
        shell_kwargs: dict[str, Any] = {}
    elif s == "cmd":
        cmd_args = ["cmd.exe", "/c", command]
        shell_kwargs = {}
    elif s in ("bash", "sh"):
        cmd_args = [s, "-c", command]
        shell_kwargs = {}
    else:
        return {"error": f"不支持的 shell：{shell}"}

    creationflags = 0x08000000 if is_windows else 0  # CREATE_NO_WINDOW

    try:
        process = await _asyncio.create_subprocess_exec(
            *cmd_args,
            cwd=work_dir,
            stdout=_asyncio.subprocess.PIPE,
            stderr=_asyncio.subprocess.PIPE,
            creationflags=creationflags,
            **shell_kwargs,
        )
    except Exception as e:
        return {"error": f"启动子进程失败：{e}"}

    try:
        stdout_b, stderr_b = await _asyncio.wait_for(process.communicate(), timeout=timeout)
    except _asyncio.TimeoutError:
        try:
            process.kill()
            await process.wait()
        except Exception:
            pass
        return {"error": f"命令超时（{timeout} 秒），已强制终止"}

    # Windows 默认 GBK，尝试用 utf-8 + gbk 兜底
    def _decode(b: bytes) -> str:
        if not b:
            return ""
        for enc in ("utf-8", "gbk", "cp936"):
            try:
                return b.decode(enc)
            except UnicodeDecodeError:
                continue
        return b.decode("utf-8", errors="replace")

    stdout = _decode(stdout_b)
    stderr = _decode(stderr_b)
    return_code = process.returncode

    # 截断超长输出
    MAX_LEN = 20000
    truncated = False
    if len(stdout) > MAX_LEN:
        stdout = stdout[:MAX_LEN] + f"\n…（已截断，原长度 {len(stdout_b)} 字节）"
        truncated = True
    if len(stderr) > MAX_LEN:
        stderr = stderr[:MAX_LEN] + f"\n…（已截断，原长度 {len(stderr_b)} 字节）"
        truncated = True

    return {
        "command": command,
        "shell": s,
        "cwd": work_dir,
        "return_code": return_code,
        "success_exit": return_code == 0,
        "stdout": stdout,
        "stderr": stderr,
        "truncated": truncated,
    }


async def skill_run_python_script(
    code: str,
    timeout: int = 120,
    args: list[str] | None = None,
    extra_env: dict[str, str] | None = None,
    **_: Any,
) -> dict[str, Any]:
    """写一段 Python 代码到临时文件，使用 WebRPA 内置 Python 3.13 运行，
    拿到 stdout/stderr/returncode 后**自动销毁临时文件**。

    Args:
        code: 完整可执行的 Python 源码（应当能独立运行，包含必要的 import）
        timeout: 超时秒数，最大 1800
        args: 传给脚本的命令行参数（sys.argv[1:]）
        extra_env: 追加到进程环境变量的键值对
    """
    if not code or not code.strip():
        return {"error": "Python 代码不能为空"}

    # 安全护栏：拦截灾难级代码 + 审计
    try:
        from app.services.ai_command_guard import check_python_code, audit
        _allowed, _reason = check_python_code(code)
        if not _allowed:
            audit("python", code, allowed=False, reason=_reason)
            return {"error": f"该代码被安全护栏拦截：{_reason}。如确需执行，请手动运行。", "blocked": True}
        audit("python", code, allowed=True)
    except Exception:
        pass

    timeout = min(max(int(timeout), 1), 1800)
    py_exe = _get_bundled_python_path()

    # 写临时脚本文件（带 BOM 头，确保 Windows Python 用 UTF-8 解码）
    tmp_dir = Path(_tempfile.gettempdir()) / "webrpa_ai_scripts"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    script_path = tmp_dir / f"ai_script_{uuid.uuid4().hex[:10]}.py"

    # 强制声明 utf-8（避免 Windows 默认 cp1252 解码报错）
    final_code = "# -*- coding: utf-8 -*-\nimport sys\ntry:\n    sys.stdout.reconfigure(encoding='utf-8')\n    sys.stderr.reconfigure(encoding='utf-8')\nexcept Exception:\n    pass\n\n" + code

    try:
        script_path.write_text(final_code, encoding="utf-8")
    except Exception as e:
        return {"error": f"写入临时脚本失败：{e}"}

    is_windows = _os.name == "nt"
    creationflags = 0x08000000 if is_windows else 0
    cmd_args = [py_exe, "-X", "utf8", str(script_path)]
    if args:
        cmd_args.extend(str(a) for a in args)

    env = dict(_os.environ)
    env["PYTHONIOENCODING"] = "utf-8"
    env["PYTHONUTF8"] = "1"
    if extra_env:
        for k, v in extra_env.items():
            env[str(k)] = str(v)

    try:
        process = await _asyncio.create_subprocess_exec(
            *cmd_args,
            cwd=str(_project_root()),
            stdout=_asyncio.subprocess.PIPE,
            stderr=_asyncio.subprocess.PIPE,
            env=env,
            creationflags=creationflags,
        )
    except Exception as e:
        try:
            script_path.unlink(missing_ok=True)
        except Exception:
            pass
        return {"error": f"启动 Python 子进程失败：{e}"}

    timed_out = False
    try:
        stdout_b, stderr_b = await _asyncio.wait_for(process.communicate(), timeout=timeout)
    except _asyncio.TimeoutError:
        timed_out = True
        try:
            process.kill()
            await process.wait()
        except Exception:
            pass
        stdout_b = b""
        stderr_b = f"超时（{timeout} 秒），进程已被强制终止".encode()

    # 自动销毁临时文件
    try:
        script_path.unlink(missing_ok=True)
    except Exception:
        pass

    def _decode(b: bytes) -> str:
        if not b:
            return ""
        for enc in ("utf-8", "gbk", "cp936"):
            try:
                return b.decode(enc)
            except UnicodeDecodeError:
                continue
        return b.decode("utf-8", errors="replace")

    stdout = _decode(stdout_b)
    stderr = _decode(stderr_b)
    return_code = process.returncode if not timed_out else -9

    # 截断
    MAX_LEN = 30000
    truncated = False
    if len(stdout) > MAX_LEN:
        stdout = stdout[:MAX_LEN] + f"\n…（已截断，原长度 {len(stdout_b)} 字节）"
        truncated = True
    if len(stderr) > MAX_LEN:
        stderr = stderr[:MAX_LEN] + f"\n…（已截断，原长度 {len(stderr_b)} 字节）"
        truncated = True

    return {
        "python_path": py_exe,
        "return_code": return_code,
        "timed_out": timed_out,
        "success_exit": return_code == 0 and not timed_out,
        "stdout": stdout,
        "stderr": stderr,
        "truncated": truncated,
        "script_lifecycle": "已自动销毁",
    }


async def skill_check_python_environment(**_: Any) -> dict[str, Any]:
    """快速验证 WebRPA 内置 Python 是否可用，返回版本与已安装的关键包"""
    py_exe = _get_bundled_python_path()
    check_code = (
        "import sys, platform, json\n"
        "info = {\n"
        "    'python_version': sys.version,\n"
        "    'platform': platform.platform(),\n"
        "    'executable': sys.executable,\n"
        "    'prefix': sys.prefix,\n"
        "}\n"
        "available = []\n"
        "for pkg in ['requests', 'pandas', 'numpy', 'openpyxl', 'pillow', 'PIL', 'bs4', 'lxml', 'playwright', 'httpx', 'aiohttp', 'fastapi', 'uvicorn']:\n"
        "    try:\n"
        "        __import__(pkg)\n"
        "        available.append(pkg)\n"
        "    except Exception:\n"
        "        pass\n"
        "info['available_packages'] = available\n"
        "print(json.dumps(info, ensure_ascii=False))\n"
    )
    res = await skill_run_python_script(code=check_code, timeout=20)
    if res.get("success_exit") and res.get("stdout"):
        try:
            parsed = json.loads(res["stdout"].strip().splitlines()[-1])
            return {"python_executable": py_exe, **parsed}
        except Exception:
            pass
    return {
        "python_executable": py_exe,
        "raw_stdout": res.get("stdout", ""),
        "raw_stderr": res.get("stderr", ""),
        "error": "无法解析 Python 环境信息",
    }


# === 7b. 网页感知（让 AI 真正"看见"网页） ===
#
# 这一组 skill 让 AI 在搭建工作流前可以先真实地访问目标网站，
# 拿到实际的标题、链接、按钮、表单、推荐 CSS selector，
# 从而把模块配置（URL、selector、文本等）一次性正确地填好。
#
# 核心原则：先看 → 再造工作流。绝对不要凭空猜 selector。

async def skill_fetch_page_html(url: str, max_size: int = 30000, **_: Any) -> dict[str, Any]:
    """简单 HTTP GET 抓取 HTML（适用于静态页）。
    最多返回 max_size 字符；不会执行 JS。返回 status / title / 截断后的 html。
    """
    import re as _re
    if not url or not url.strip():
        return {"error": "url 不能为空"}
    target = url.strip()
    if not target.startswith(("http://", "https://")):
        target = "https://" + target

    try:
        import httpx as _httpx
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
        }
        async with _httpx.AsyncClient(timeout=15.0, follow_redirects=True, headers=headers) as client:
            resp = await client.get(target)
            html = resp.text or ""
            status = resp.status_code
    except Exception as e:
        return {"error": f"请求失败：{e}"}

    title_m = _re.search(r"<title[^>]*>(.*?)</title>", html, _re.IGNORECASE | _re.DOTALL)
    title = (title_m.group(1).strip() if title_m else "").strip()
    truncated = False
    if len(html) > max_size:
        html = html[:max_size]
        truncated = True

    return {
        "url": target,
        "status": status,
        "title": title,
        "html_truncated": truncated,
        "html_size": len(html),
        "html": html,
    }


# 用于 probe_page / get_page_dom_snapshot 的浏览器内 JS：
# 一次性把页面骨架抽出，避免来回多次 evaluate。
_PROBE_JS = r"""
() => {
  const cssEscape = window.CSS && CSS.escape ? CSS.escape : (s) => String(s).replace(/[^a-zA-Z0-9_-]/g, c => '\\' + c);
  function buildSelector(el) {
    if (!el || el.nodeType !== 1) return '';
    if (el.id) return '#' + cssEscape(el.id);
    const classes = (el.className && typeof el.className === 'string')
      ? el.className.trim().split(/\s+/).filter(Boolean)
      : [];
    if (classes.length > 0) return el.tagName.toLowerCase() + '.' + classes.map(cssEscape).join('.');
    const parent = el.parentElement;
    if (!parent) return el.tagName.toLowerCase();
    const sameTag = Array.from(parent.children).filter(c => c.tagName === el.tagName);
    const idx = sameTag.indexOf(el) + 1;
    return el.tagName.toLowerCase() + (sameTag.length > 1 ? `:nth-of-type(${idx})` : '');
  }
  function visibleText(el) {
    if (!el) return '';
    const t = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
    return t.length > 200 ? t.slice(0, 200) + '…' : t;
  }
  const result = {
    url: location.href,
    title: document.title,
    headings: [],
    links: [],
    buttons: [],
    inputs: [],
    forms: [],
    lists: [],
    images_count: document.images.length,
  };
  document.querySelectorAll('h1,h2,h3').forEach((h, i) => {
    if (i < 30) result.headings.push({ tag: h.tagName.toLowerCase(), text: visibleText(h), selector: buildSelector(h) });
  });
  let aIdx = 0;
  document.querySelectorAll('a[href]').forEach(a => {
    if (aIdx >= 60) return;
    const text = visibleText(a); if (!text) return;
    result.links.push({ text, href: a.href, selector: buildSelector(a) });
    aIdx++;
  });
  document.querySelectorAll('button, [role=button]').forEach((b, i) => {
    if (i >= 40) return;
    const text = visibleText(b);
    if (!text && !b.getAttribute('aria-label')) return;
    result.buttons.push({ text: text || b.getAttribute('aria-label') || '', selector: buildSelector(b) });
  });
  document.querySelectorAll('input, textarea, select').forEach((inp, i) => {
    if (i >= 30) return;
    result.inputs.push({
      tag: inp.tagName.toLowerCase(),
      type: inp.getAttribute('type') || '',
      name: inp.getAttribute('name') || '',
      placeholder: inp.getAttribute('placeholder') || '',
      selector: buildSelector(inp),
    });
  });
  document.querySelectorAll('form').forEach((f, i) => {
    if (i >= 10) return;
    result.forms.push({ action: f.getAttribute('action') || '', method: f.getAttribute('method') || 'get', selector: buildSelector(f) });
  });
  document.querySelectorAll('ul, ol, table').forEach((lst, i) => {
    if (i >= 12) return;
    const items = lst.querySelectorAll('li, tr');
    if (items.length < 2) return;
    const sample = [];
    for (let k = 0; k < Math.min(5, items.length); k++) {
      const t = visibleText(items[k]);
      if (t) sample.push(t);
    }
    result.lists.push({
      tag: lst.tagName.toLowerCase(),
      item_count: items.length,
      item_selector: buildSelector(items[0]),
      container_selector: buildSelector(lst),
      samples: sample,
    });
  });
  return result;
}
"""


async def skill_probe_page(url: str, timeout: int = 20000, **_: Any) -> dict[str, Any]:
    """用 Playwright 真实打开 URL 并探查页面：返回标题、可见标题/链接/按钮/表单/列表，
    以及对常见目标（"百度热榜"、"列表项"等）的 selector 推荐。

    AI 在搭建网页类工作流前应当先调用本 skill 拿到真实 DOM 信息。
    """
    if not url or not url.strip():
        return {"error": "url 不能为空"}
    target = url.strip()
    if not target.startswith(("http://", "https://")):
        target = "https://" + target

    try:
        from playwright.async_api import async_playwright  # noqa: F401  保留检查
        from app.services.headless_browser import launch_headless_chromium
    except ImportError:
        return {"error": "playwright 未安装。请联系管理员检查 Python313 环境。"}

    snapshot: dict[str, Any] | None = None
    err: str | None = None

    try:
        async with launch_headless_chromium() as browser:
            ctx = await browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                ),
                viewport={"width": 1366, "height": 900},
            )
            page = await ctx.new_page()
            try:
                await page.goto(target, wait_until="domcontentloaded", timeout=int(timeout))
                # 等一小段给 JS 渲染完成
                try:
                    await page.wait_for_load_state("networkidle", timeout=8000)
                except Exception:
                    pass
                snapshot = await _asyncio.wait_for(page.evaluate(_PROBE_JS), timeout=20)
            except _asyncio.TimeoutError:
                err = "读取页面 DOM 超时（20 秒）：页面可能体积过大或脚本繁重"
            except Exception as e:
                err = f"页面加载/解析失败：{e}"
            finally:
                try:
                    await ctx.close()
                except Exception:
                    pass
    except RuntimeError as e:
        return {"error": str(e)}
    except Exception as e:
        return {"error": f"启动 playwright 失败：{e}"}

    if snapshot is None:
        return {"error": err or "未拿到页面快照"}

    # 给一些常见关键词的 selector 推荐
    recommendations = _build_selector_hints(snapshot)
    snapshot["selector_hints"] = recommendations
    snapshot["probe_url"] = target
    return snapshot


def _build_selector_hints(snap: dict[str, Any]) -> dict[str, Any]:
    """根据 probe 出的页面骨架，针对常见目标给出推荐 selector"""
    hints: dict[str, Any] = {}

    # 百度热榜专项
    title = (snap.get("title") or "").lower()
    if "百度" in (snap.get("title") or "") or "baidu" in title:
        # 经典选择器（百度近年改版多次，常见的容器名）
        hints["baidu_hot_list_candidates"] = [
            ".theme-hot",
            ".hotsearch-content-wrapper",
            "#hotsearch-content-wrapper",
            ".s-hotsearch-content",
            "#hotsearch-refresh-btn ~ *",
        ]
        hints["baidu_hot_item_text_candidates"] = [
            ".title-content-title",
            ".title_dIF3B",
            "a.title-content",
            ".c-single-text-ellipsis",
        ]

    # 通用：列表型目标 → 取 item_count 最大的 list
    lists = snap.get("lists") or []
    if lists:
        top = sorted(lists, key=lambda x: -int(x.get("item_count") or 0))[:3]
        hints["top_lists"] = [
            {
                "container": l.get("container_selector"),
                "item": l.get("item_selector"),
                "count": l.get("item_count"),
                "samples": l.get("samples", [])[:3],
            }
            for l in top
        ]

    # 搜索框
    search_inputs = [
        i for i in (snap.get("inputs") or [])
        if i.get("type") in ("search", "text") or any(
            k in (i.get("placeholder") or "").lower() or k in (i.get("name") or "").lower()
            for k in ("search", "搜索", "query", "wd", "kw")
        )
    ]
    if search_inputs:
        hints["search_input"] = search_inputs[0]

    # 主标题（优先 h1）
    h1s = [h for h in (snap.get("headings") or []) if h.get("tag") == "h1"]
    if h1s:
        hints["main_heading"] = h1s[0]

    return hints


async def skill_get_page_dom_snapshot(target_description: str = "", **_: Any) -> dict[str, Any]:
    """直接对当前用户已打开的浏览器页面（browser_engine 管理的）做一次 DOM 快照，
    无需跳转 URL。AI 用它来"看到"用户当前正在浏览的页面。

    target_description 留空时返回完整骨架；
    填入文字（如"百度热榜"）时会同时把 selector_hints 中相关的字段挑出来高亮返回。
    """
    try:
        from app.services import browser_engine as _be
    except Exception as e:
        return {"error": f"加载 browser_engine 失败：{e}"}

    page = _be.get_page()
    if page is None:
        return {"error": "当前没有已打开的浏览器页面。请先调用 client_action open_auto_browser 或让用户启动浏览器"}

    try:
        # 加超时兜底：页面正在跳转/卡死/极重时 evaluate 可能永不返回，
        # 否则会让 AI 工具调用一直"执行中"等不到头。超时即返回错误，让 AI 改用其它方式。
        snapshot: dict[str, Any] = await _asyncio.wait_for(page.evaluate(_PROBE_JS), timeout=20)
    except _asyncio.TimeoutError:
        return {"error": "读取页面 DOM 超时（20 秒）。页面可能正在加载/跳转或体积过大，请等页面稳定后重试，或改用 probe_page(url=...)"}
    except Exception as e:
        return {"error": f"读取页面 DOM 失败：{e}"}

    snapshot["selector_hints"] = _build_selector_hints(snapshot)
    if target_description:
        snapshot["target_description"] = target_description
    return snapshot


async def skill_suggest_selector(
    target_description: str,
    url: str | None = None,
    **_: Any,
) -> dict[str, Any]:
    """综合 probe_page + 启发式，给一个目标描述（如"百度热榜列表"）输出最合适的 CSS selector 候选。

    若提供 url：先 probe_page（无头打开）再分析；
    若不提供：尝试从用户当前已打开的页面（get_page）拿快照。
    """
    desc = (target_description or "").strip()
    if not desc:
        return {"error": "target_description 不能为空"}

    if url:
        snap = await skill_probe_page(url=url)
    else:
        snap = await skill_get_page_dom_snapshot(target_description=desc)
    if snap.get("error"):
        return snap

    hints = snap.get("selector_hints") or {}
    candidates: list[dict[str, Any]] = []

    lower = desc.lower()
    # 百度热榜 / hot list 常见关键词匹配
    if any(k in desc for k in ("热榜", "热搜", "热门", "排行")):
        # 优先用百度专项推荐
        for sel in hints.get("baidu_hot_list_candidates", []) or []:
            candidates.append({
                "selector": sel,
                "reason": "百度风格热榜容器候选（出现在百度系页面）",
                "confidence": 0.7,
            })
        for sel in hints.get("baidu_hot_item_text_candidates", []) or []:
            candidates.append({
                "selector": sel,
                "reason": "百度风格热榜单项文本",
                "confidence": 0.65,
            })

    # 通用："列表" / "list" → 用 top_lists
    if any(k in lower for k in ("list", "列表", "项目", "条目", "items")) or any(k in desc for k in ("热榜", "热搜", "排行", "榜单")):
        for tl in (hints.get("top_lists") or [])[:3]:
            if tl.get("item"):
                candidates.append({
                    "selector": tl["item"],
                    "reason": f"页面中条目最多的列表（{tl.get('count')} 项），item selector",
                    "confidence": 0.8,
                    "samples": tl.get("samples", []),
                })
            if tl.get("container"):
                candidates.append({
                    "selector": tl["container"],
                    "reason": "对应列表的容器 selector",
                    "confidence": 0.7,
                })

    # "搜索框" / "search"
    if any(k in lower for k in ("search", "搜索框", "搜索", "输入")):
        si = hints.get("search_input")
        if si and si.get("selector"):
            candidates.append({
                "selector": si["selector"],
                "reason": "推断的搜索输入框",
                "confidence": 0.85,
            })

    # "标题" / "title"
    if any(k in lower for k in ("标题", "title", "heading")):
        mh = hints.get("main_heading")
        if mh and mh.get("selector"):
            candidates.append({
                "selector": mh["selector"],
                "reason": "页面 H1 主标题",
                "confidence": 0.9,
            })

    # 文本匹配兜底：在 links/buttons/headings 文本里模糊找
    text_targets: list[dict[str, Any]] = []
    for src, items in (("link", snap.get("links") or []), ("button", snap.get("buttons") or []), ("heading", snap.get("headings") or [])):
        for it in items:
            t = it.get("text") or ""
            if t and (desc in t or t in desc):
                text_targets.append({
                    "selector": it.get("selector"),
                    "reason": f"文本匹配（{src}：{t[:30]}）",
                    "confidence": 0.6,
                    "text": t,
                })
    candidates.extend(text_targets[:6])

    # 去重（按 selector）
    seen: set[str] = set()
    uniq: list[dict[str, Any]] = []
    for c in candidates:
        sel = c.get("selector") or ""
        if not sel or sel in seen:
            continue
        seen.add(sel)
        uniq.append(c)

    return {
        "target_description": desc,
        "url": snap.get("url") or snap.get("probe_url"),
        "title": snap.get("title"),
        "candidates": uniq,
        "candidate_count": len(uniq),
        "tip": (
            "首选 confidence 最高的 selector 填到模块配置；如不确定可用 fetch_page_html 看原文，"
            "或让用户在 WebRPA 元素拾取器里 Alt+点击精确选取"
        ),
    }


# === 8. 计划任务真生效 CRUD（直接调用 scheduled_task_manager） ===

async def skill_create_scheduled_task(
    name: str,
    workflow_id: str,
    trigger: dict,
    description: str | None = None,
    workflow_name: str | None = None,
    enabled: bool = True,
    headless: bool = False,
    open_monitor: bool = False,
    **_: Any,
) -> dict[str, Any]:
    """创建一个计划任务并真正注册到调度器。

    trigger 至少包含 type 字段，常见用法：
      {"type": "time", "schedule_type": "daily", "daily_time": "09:00:00", "repeat_enabled": false}
      {"type": "time", "schedule_type": "interval", "interval_seconds": 60}
      {"type": "time", "schedule_type": "once", "start_date": "2026-06-01", "start_time": "10:00:00"}
      {"type": "time", "schedule_type": "weekly", "weekly_days": [1,3,5], "weekly_time": "09:00:00"}
      {"type": "webhook", "webhook_path": "/my-task"}
      {"type": "hotkey", "hotkey": "ctrl+alt+r"}
      {"type": "startup"}
    """
    if not name or not name.strip():
        return {"error": "任务名称不能为空"}
    if not workflow_id:
        return {"error": "workflow_id 不能为空"}
    if not isinstance(trigger, dict) or not trigger.get("type"):
        return {"error": "trigger 必须包含 type 字段"}

    try:
        from app.services.scheduled_task_manager import scheduled_task_manager
        from app.models.scheduled_task import ScheduledTask, ScheduledTaskTrigger
        trigger_obj = ScheduledTaskTrigger(**trigger)
        task = ScheduledTask(
            name=name.strip(),
            description=description or "",
            workflow_id=workflow_id,
            workflow_name=workflow_name or "",
            trigger=trigger_obj,
            enabled=bool(enabled),
            headless=bool(headless),
            open_monitor=bool(open_monitor),
        )
        created = scheduled_task_manager.create_task(task)
        return {
            "success": True,
            "task": created.model_dump() if hasattr(created, "model_dump") else created.dict(),
            "message": f"已创建计划任务「{created.name}」并已注册触发器",
        }
    except Exception as e:
        return {"error": f"创建计划任务失败：{e}"}


async def skill_update_scheduled_task(
    task_id: str,
    updates: dict | None = None,
    **_: Any,
) -> dict[str, Any]:
    """更新计划任务的字段。updates 可包含：name/description/workflow_id/workflow_name/trigger/enabled/headless/open_monitor"""
    if not task_id:
        return {"error": "task_id 不能为空"}
    if not isinstance(updates, dict) or not updates:
        return {"error": "updates 不能为空"}
    try:
        from app.services.scheduled_task_manager import scheduled_task_manager
        # 触发器更新需要保留 dict 形式，update_task 内部会自动转 obj
        task = scheduled_task_manager.update_task(task_id, updates)
        if not task:
            return {"error": f"任务不存在：{task_id}"}
        return {
            "success": True,
            "task": task.model_dump() if hasattr(task, "model_dump") else task.dict(),
            "message": f"已更新计划任务「{task.name}」",
        }
    except Exception as e:
        return {"error": f"更新计划任务失败：{e}"}


async def skill_delete_scheduled_task(task_id: str, **_: Any) -> dict[str, Any]:
    """删除计划任务（不可恢复）"""
    if not task_id:
        return {"error": "task_id 不能为空"}
    try:
        from app.services.scheduled_task_manager import scheduled_task_manager
        ok = scheduled_task_manager.delete_task(task_id)
        if not ok:
            return {"error": f"任务不存在：{task_id}"}
        return {"success": True, "message": f"已删除计划任务 {task_id}"}
    except Exception as e:
        return {"error": f"删除失败：{e}"}


async def skill_toggle_scheduled_task(task_id: str, enabled: bool, **_: Any) -> dict[str, Any]:
    """启用/禁用计划任务"""
    if not task_id:
        return {"error": "task_id 不能为空"}
    try:
        from app.services.scheduled_task_manager import scheduled_task_manager
        task = scheduled_task_manager.toggle_task(task_id, bool(enabled))
        if not task:
            return {"error": f"任务不存在：{task_id}"}
        return {
            "success": True,
            "message": f"已{'启用' if enabled else '禁用'}计划任务「{task.name}」",
        }
    except Exception as e:
        return {"error": f"切换失败：{e}"}


async def skill_execute_scheduled_task(task_id: str, **_: Any) -> dict[str, Any]:
    """手动执行一次计划任务（异步加入队列）"""
    if not task_id:
        return {"error": "task_id 不能为空"}
    try:
        from app.services.scheduled_task_manager import scheduled_task_manager
        task = scheduled_task_manager.get_task(task_id)
        if not task:
            return {"error": f"任务不存在：{task_id}"}
        await scheduled_task_manager.enqueue_task(task_id, "manual")
        queue_size = scheduled_task_manager.task_queue.qsize() if scheduled_task_manager.task_queue else 0
        return {
            "success": True,
            "message": f"已加入执行队列：{task.name}",
            "queue_size": queue_size,
        }
    except Exception as e:
        return {"error": f"执行失败：{e}"}


async def skill_stop_scheduled_task(task_id: str, **_: Any) -> dict[str, Any]:
    """强制停止正在执行的计划任务"""
    if not task_id:
        return {"error": "task_id 不能为空"}
    try:
        from app.services.scheduled_task_manager import scheduled_task_manager
        task = scheduled_task_manager.get_task(task_id)
        if not task:
            return {"error": f"任务不存在：{task_id}"}
        ok = await scheduled_task_manager.stop_task(task_id)
        if not ok:
            return {"error": "任务未在执行中"}
        return {"success": True, "message": f"已停止计划任务「{task.name}」"}
    except Exception as e:
        return {"error": f"停止失败：{e}"}


async def skill_clear_scheduled_task_logs(task_id: str | None = None, **_: Any) -> dict[str, Any]:
    """清空计划任务日志。task_id 留空则清全部"""
    try:
        from app.services.scheduled_task_manager import scheduled_task_manager
        scheduled_task_manager.clear_logs(task_id)
        return {
            "success": True,
            "message": f"已清空{'指定任务' if task_id else '所有任务'}的执行日志",
        }
    except Exception as e:
        return {"error": f"清空失败：{e}"}


# === 9. 自定义模块真生效 CRUD ===

async def skill_create_custom_module(
    name: str,
    display_name: str,
    workflow: dict,
    description: str = "",
    icon: str = "",
    color: str = "#8B5CF6",
    category: str = "custom",
    parameters: list | None = None,
    outputs: list | None = None,
    tags: list | None = None,
    **_: Any,
) -> dict[str, Any]:
    """创建一个自定义模块（封装一组节点为可复用模块）"""
    if not name or not name.strip():
        return {"error": "name 不能为空"}
    if not display_name or not display_name.strip():
        return {"error": "display_name 不能为空"}
    if not isinstance(workflow, dict) or not workflow.get("nodes"):
        return {"error": "workflow.nodes 不能为空"}
    try:
        from app.api.custom_modules import create_custom_module
        from app.models.custom_module import CustomModuleCreate
        req = CustomModuleCreate(
            name=name.strip(),
            display_name=display_name.strip(),
            description=description,
            icon=icon or "📦",
            color=color,
            category=category,
            parameters=parameters or [],
            outputs=outputs or [],
            workflow=workflow,
            tags=tags or [],
        )
        result = await create_custom_module(req)
        return {
            "success": True,
            "module": result.model_dump() if hasattr(result, "model_dump") else result,
            "message": f"已创建自定义模块「{display_name}」",
        }
    except Exception as e:
        return {"error": f"创建自定义模块失败：{e}"}


async def skill_update_custom_module(
    module_id: str,
    updates: dict | None = None,
    **_: Any,
) -> dict[str, Any]:
    """更新自定义模块。updates 可含：name/display_name/description/icon/color/category/parameters/outputs/workflow/tags"""
    if not module_id:
        return {"error": "module_id 不能为空"}
    if not isinstance(updates, dict) or not updates:
        return {"error": "updates 不能为空"}
    try:
        from app.api.custom_modules import update_custom_module
        from app.models.custom_module import CustomModuleUpdate
        req = CustomModuleUpdate(**updates)
        result = await update_custom_module(module_id, req)
        return {
            "success": True,
            "module": result.model_dump() if hasattr(result, "model_dump") else result,
            "message": f"已更新自定义模块",
        }
    except Exception as e:
        return {"error": f"更新自定义模块失败：{e}"}


async def skill_delete_custom_module(module_id: str, **_: Any) -> dict[str, Any]:
    """删除自定义模块（不可恢复）"""
    if not module_id:
        return {"error": "module_id 不能为空"}
    try:
        from app.api.custom_modules import delete_custom_module
        result = await delete_custom_module(module_id)
        return {"success": True, "data": result, "message": f"已删除自定义模块 {module_id}"}
    except Exception as e:
        return {"error": f"删除失败：{e}"}


# === 10. 工作流真生效 - 后端持久化 ===

async def skill_save_local_workflow(
    name: str,
    nodes: list,
    edges: list,
    variables: list | None = None,
    folder: str | None = None,
    **_: Any,
) -> dict[str, Any]:
    """把工作流保存为本地文件（与前端"保存"按钮等效）"""
    if not name or not name.strip():
        return {"error": "name 不能为空"}
    if not isinstance(nodes, list) or not nodes:
        return {"error": "nodes 不能为空"}
    try:
        from app.api.local_workflows import save_workflow_to_folder, SaveWorkflowRequest
        content = {
            "name": name.strip(),
            "nodes": nodes,
            "edges": edges or [],
            "variables": variables or [],
            "saved_at": datetime.now().isoformat(),
        }
        req = SaveWorkflowRequest(
            filename=name.strip(),
            content=content,
            folder=folder or "",
        )
        result = await save_workflow_to_folder(req)
        if not result.get("success"):
            return {"error": result.get("error", "保存失败")}
        return {
            "success": True,
            "message": f"已保存到 {result.get('filepath')}",
            "path": result.get("filepath"),
        }
    except Exception as e:
        return {"error": f"保存失败：{e}"}


async def skill_run_workflow_now(
    nodes: list,
    edges: list,
    variables: list | None = None,
    headless: bool = True,
    name: str = "AI 临时工作流",
    **_: Any,
) -> dict[str, Any]:
    """立即在后端执行一个工作流（不依赖前端，等同于点"运行"按钮）。
    返回 workflow_id，可以再用 get_recent_logs(workflow_id) 拿执行日志。
    """
    if not isinstance(nodes, list) or not nodes:
        return {"error": "nodes 不能为空"}
    try:
        from app.api.workflows import (
            create_workflow,
            execute_workflow,
            executions_store,
            execution_results,
            WorkflowCreate,
            ExecuteOptions,
        )
        from fastapi import BackgroundTasks
        # 1) 创建 workflow（直接复用现有 API 内部函数）
        wf_req = WorkflowCreate(
            name=name,
            nodes=nodes,
            edges=edges or [],
            variables=variables or [],
        )
        created = await create_workflow(wf_req)
        wf_id = created.get("id") if isinstance(created, dict) else getattr(created, "id", None)
        if not wf_id:
            return {"error": "创建 workflow 失败：无 id"}
        # 2) 异步触发执行
        bg = BackgroundTasks()
        await execute_workflow(wf_id, bg, ExecuteOptions(headless=headless))
        # FastAPI 的 BackgroundTasks 在请求结束后执行；这里我们直接把任务放到事件循环
        try:
            for t in bg.tasks:
                asyncio.create_task(t())  # type: ignore
        except Exception:
            pass
        return {
            "success": True,
            "workflow_id": wf_id,
            "message": f"已发起执行（headless={headless}）。可用 get_recent_logs(workflow_id='{wf_id}') 查询结果",
        }
    except Exception as e:
        return {"error": f"执行失败：{e}"}


async def skill_stop_workflow_now(workflow_id: str, **_: Any) -> dict[str, Any]:
    """停止后端正在执行的工作流"""
    if not workflow_id:
        return {"error": "workflow_id 不能为空"}
    try:
        from app.api.workflows import stop_workflow
        result = await stop_workflow(workflow_id)
        return {"success": True, "data": result, "message": f"已发起停止：{workflow_id}"}
    except Exception as e:
        return {"error": f"停止失败：{e}"}


# === 11. 全局变量真生效（后端持久化） ===

def _global_vars_file() -> Path:
    return _get_data_folder() / "global_vars.json"


def _load_global_vars() -> dict[str, Any]:
    fp = _global_vars_file()
    if not fp.exists():
        return {}
    try:
        data = json.loads(fp.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _save_global_vars(data: dict[str, Any]) -> None:
    fp = _global_vars_file()
    fp.parent.mkdir(parents=True, exist_ok=True)
    fp.write_text(json.dumps(data, ensure_ascii=False, indent=2, default=str), encoding="utf-8")


async def skill_set_global_variable(name: str, value: Any, **_: Any) -> dict[str, Any]:
    """设置/创建后端持久化的全局变量"""
    if not name or not str(name).strip():
        return {"error": "变量名不能为空"}
    try:
        data = _load_global_vars()
        data[str(name).strip()] = value
        _save_global_vars(data)
        return {"success": True, "message": f"已设置全局变量 {name}", "total": len(data)}
    except Exception as e:
        return {"error": f"设置失败：{e}"}


async def skill_delete_global_variable(name: str, **_: Any) -> dict[str, Any]:
    """删除后端持久化的全局变量"""
    if not name:
        return {"error": "变量名不能为空"}
    try:
        data = _load_global_vars()
        if name not in data:
            return {"error": f"变量不存在：{name}"}
        del data[name]
        _save_global_vars(data)
        return {"success": True, "message": f"已删除全局变量 {name}", "total": len(data)}
    except Exception as e:
        return {"error": f"删除失败：{e}"}


async def skill_clear_global_variables(**_: Any) -> dict[str, Any]:
    """清空后端持久化的全部全局变量"""
    try:
        _save_global_vars({})
        return {"success": True, "message": "已清空全部全局变量"}
    except Exception as e:
        return {"error": f"清空失败：{e}"}


# === 12. 资源管理真生效 ===

async def skill_delete_data_asset(asset_id: str, **_: Any) -> dict[str, Any]:
    """删除一个 Excel 数据资源"""
    if not asset_id:
        return {"error": "asset_id 不能为空"}
    try:
        from app.api.data_assets import delete_asset
        result = await delete_asset(asset_id)
        return {"success": True, "data": result, "message": "已删除"}
    except Exception as e:
        return {"error": f"删除失败：{e}"}


async def skill_rename_data_asset(asset_id: str, new_name: str, **_: Any) -> dict[str, Any]:
    """重命名 Excel 数据资源"""
    if not asset_id or not new_name:
        return {"error": "asset_id 和 new_name 都不能为空"}
    try:
        from app.api.data_assets import rename_asset
        result = await rename_asset(asset_id, new_name)
        return {"success": True, "data": result, "message": f"已重命名为 {new_name}"}
    except Exception as e:
        return {"error": f"重命名失败：{e}"}


async def skill_delete_image_asset(image_id: str, **_: Any) -> dict[str, Any]:
    """删除一个图像资源"""
    if not image_id:
        return {"error": "image_id 不能为空"}
    try:
        from app.api.image_assets import delete_image
        result = await delete_image(image_id)
        return {"success": True, "data": result, "message": "已删除"}
    except Exception as e:
        return {"error": f"删除失败：{e}"}


async def skill_rename_image_asset(image_id: str, new_name: str, **_: Any) -> dict[str, Any]:
    """重命名图像资源"""
    if not image_id or not new_name:
        return {"error": "image_id 和 new_name 都不能为空"}
    try:
        from app.api.image_assets import rename_image
        result = await rename_image(image_id, new_name)
        return {"success": True, "data": result, "message": f"已重命名为 {new_name}"}
    except Exception as e:
        return {"error": f"重命名失败：{e}"}


# ---------- 注册所有 Skills ----------

def _register_all() -> None:
    registry.register(Skill(
        name="list_module_categories",
        description="列出 WebRPA 中所有内置模块的分类",
        parameters={"type": "object", "properties": {}},
        handler=skill_list_module_categories,
    ))
    registry.register(Skill(
        name="list_modules_in_category",
        description="列出某个分类下的所有模块",
        parameters={
            "type": "object",
            "properties": {
                "category": {
                    "type": "string",
                    "description": "分类名（如：网页基础、AI、流程控制、PDF 等）",
                }
            },
            "required": ["category"],
        },
        handler=skill_list_modules_in_category,
    ))
    registry.register(Skill(
        name="describe_module",
        description=(
            "查询某个模块的完整说明：用途/必填字段/可选字段/默认值/字段中文说明/完整配置例子/前后联动建议。"
            "构造工作流时**强烈建议先调这个工具**确认字段，再调 build_workflow，可以避免漏配置字段。"
        ),
        parameters={
            "type": "object",
            "properties": {
                "module_type": {
                    "type": "string",
                    "description": "模块的 type 标识，例如 click_element、ai_chat、pdf_merge",
                }
            },
            "required": ["module_type"],
        },
        handler=skill_describe_module,
    ))
    registry.register(Skill(
        name="get_module_schema",
        description=(
            "批量查询多个模块的 schema（必填/可选/默认/例子/联动）。"
            "比 describe_module 更紧凑，适合一次问 5~20 个模块。返回 dict: {module_type: schema}。"
        ),
        parameters={
            "type": "object",
            "properties": {
                "module_types": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "要查询的 module_type 数组",
                }
            },
            "required": ["module_types"],
        },
        handler=skill_get_module_schema,
    ))
    registry.register(Skill(
        name="validate_workflow_nodes",
        description=(
            "对一组节点做静态校验，找出：必填字段未填 / 变量名拼错 / 孤立节点 / 未关闭连接 等问题。"
            "标准用法：先 client_action(action='get_workflow_detail') 拿到 nodes/edges，"
            "再 validate_workflow_nodes(nodes=..., edges=...)。返回 issues 列表，每条带 fix_hint 教 AI 怎么修。"
        ),
        parameters={
            "type": "object",
            "properties": {
                "nodes": {"type": "array", "description": "节点数组（来自 get_workflow_detail.data.nodes）"},
                "edges": {"type": "array", "description": "连线数组（可选）"},
            },
            "required": ["nodes"],
        },
        handler=skill_validate_workflow_nodes,
    ))
    registry.register(Skill(
        name="auto_fix_workflow_nodes",
        description=(
            "根据 schema 自动给画布上所有节点补齐默认配置。"
            "返回 patches 数组，每条 {node_id, patch}。AI 用 client_action(update_node_config) 逐条应用。"
        ),
        parameters={
            "type": "object",
            "properties": {
                "nodes": {"type": "array", "description": "节点数组"},
            },
            "required": ["nodes"],
        },
        handler=skill_auto_fix_workflow_nodes,
    ))
    registry.register(Skill(
        name="analyze_variable_flow",
        description=(
            "分析画布中所有变量的产生-引用链。"
            "返回 {var_name: {producers, consumers, status}}，status=orphan_use(引用没产生)/unused(产生没引用)/ok。"
            "用于排查变量名拼错、数据断流等问题。"
        ),
        parameters={
            "type": "object",
            "properties": {
                "nodes": {"type": "array", "description": "节点数组"},
            },
            "required": ["nodes"],
        },
        handler=skill_analyze_variable_flow,
    ))
    registry.register(Skill(
        name="search_modules",
        description="按关键词搜索模块（中英文都行）",
        parameters={
            "type": "object",
            "properties": {
                "keyword": {"type": "string", "description": "搜索关键词"}
            },
            "required": ["keyword"],
        },
        handler=skill_search_modules,
    ))
    registry.register(Skill(
        name="list_workflow_templates",
        description=(
            "列出/搜索内置工作流模板（10 个高频套路：网页采集/API/登录/Excel 批量/定时通知/PDF/AI 问答/文件夹监控等）。"
            "面对用户需求时优先看有没有现成模板，省去从零搭建。传 query 按关键词搜，不传则列全部。"
        ),
        parameters={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "可选：按用户需求关键词匹配（如「采集」「定时」）"},
            },
        },
        handler=skill_list_workflow_templates,
    ))
    registry.register(Skill(
        name="get_workflow_template",
        description="获取指定模板的完整 steps（可直接复制到 build_workflow.steps，替换 <占位符> 即可）",
        parameters={
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "模板名（来自 list_workflow_templates 返回）"},
            },
            "required": ["name"],
        },
        handler=skill_get_workflow_template,
    ))

    # 工作流文件
    registry.register(Skill(
        name="list_workflows",
        description="列出本地保存的所有工作流文件",
        parameters={"type": "object", "properties": {}},
        handler=skill_list_workflows,
    ))
    registry.register(Skill(
        name="read_workflow",
        description="读取一个本地工作流文件的内容（节点过多时只返回摘要）",
        parameters={
            "type": "object",
            "properties": {
                "filename": {"type": "string", "description": "工作流文件名（可省略 .json 后缀）"}
            },
            "required": ["filename"],
        },
        handler=skill_read_workflow,
    ))
    registry.register(Skill(
        name="save_workflow_file",
        description="把一个完整工作流（包含节点和边）保存到本地文件",
        parameters={
            "type": "object",
            "properties": {
                "filename": {"type": "string"},
                "name": {"type": "string", "description": "工作流的显示名"},
                "nodes": {"type": "array", "items": {"type": "object"}},
                "edges": {"type": "array", "items": {"type": "object"}},
            },
            "required": ["filename", "nodes", "edges"],
        },
        handler=skill_save_workflow_file,
    ))
    registry.register(Skill(
        name="delete_workflow",
        description="删除一个本地工作流文件（不可恢复）",
        parameters={
            "type": "object",
            "properties": {
                "filename": {"type": "string"}
            },
            "required": ["filename"],
        },
        handler=skill_delete_workflow,
        requires_approval=True,
    ))

    # 节点/工作流构造
    registry.register(Skill(
        name="build_node",
        description=(
            "构造一个节点 JSON，前端会把它加入到当前画布。"
            "注意：节点的模块名（label）是只读的，会按 module_type 自动显示官方中文名（如 open_page → 「打开网页」）。"
            "如果你想给节点起一个业务相关的名字（如「打开登录页」），请用 name 字段，画布会显示成「<官方名> (<name>)」。"
        ),
        parameters={
            "type": "object",
            "properties": {
                "module_type": {"type": "string", "description": "节点类型，例如 open_page"},
                "config": {"type": "object", "description": "节点的配置字段（具体字段视模块而定）"},
                "name": {"type": "string", "description": "节点的业务备注名（推荐写中文，例如「打开登录页」）。会显示在节点官方名旁边的括号里"},
                "position": {
                    "type": "object",
                    "properties": {"x": {"type": "number"}, "y": {"type": "number"}},
                },
            },
            "required": ["module_type"],
        },
        handler=skill_build_node,
    ))
    registry.register(Skill(
        name="build_workflow",
        description=(
            "根据有序步骤生成一个完整工作流（节点 + 边 + 智能排版 + 自动便签注释）。"
            "后端会做以下事情：①自动按 8 个一行折回排版避免拥挤 ②为带 comment 的步骤自动生成黄色便签贴在节点旁 "
            "③可选 title_note 在画布顶部生成蓝色「工作流说明」便签 ④可选 notes 数组追加任意位置便签 "
            "⑤同 section 字段会被分到一行，使工作流逻辑清晰可读。"
            "前端调用此工具后会**自动把结果装入画布**，无需再调 load_workflow_from_data。"
            "重要：节点的模块名（label）是只读的，按 module_type 自动显示官方中文名，不要试图传 label 改它。"
            "如果想给节点起业务名，请用 name 字段（画布显示为「<官方模块名> (<name>)」）。"
            "强烈建议为每一步写 name（业务备注）和 comment（注释，会变成便签）。"
        ),
        parameters={
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "工作流名称"},
                "title_note": {
                    "type": "string",
                    "description": "顶部置顶的整体说明便签（蓝色，加粗），简述这个工作流是干什么的、需要什么前置条件",
                },
                "layout": {
                    "type": "string",
                    "description": "排版方式：auto(默认)/horizontal(单行)/grid(4列网格)",
                    "enum": ["auto", "horizontal", "grid"],
                },
                "steps": {
                    "type": "array",
                    "description": "有序步骤。前后步骤会自动连线；可用 next 跳跃，可用 section 分组",
                    "items": {
                        "type": "object",
                        "properties": {
                            "type": {"type": "string", "description": "节点 module_type，例如 open_page/click_element"},
                            "name": {"type": "string", "description": "节点的业务备注名（推荐写中文，例如「打开登录页」）。会显示在节点官方名旁边的括号里。注意：不要用这个字段试图改节点的官方模块名"},
                            "config": {"type": "object", "description": "节点配置字段"},
                            "id": {
                                "type": "string",
                                "description": "可选自定义 id（仅当本步骤会被其他步骤跳跃连接时才需要）",
                            },
                            "next": {
                                "type": "string",
                                "description": "可选指定下一节点 id（不写则连到下一个步骤）",
                            },
                            "section": {
                                "type": "string",
                                "description": "可选分段标题。同 section 的步骤会被排在一行/同一区域",
                            },
                            "comment": {
                                "type": "string",
                                "description": "可选注释。会自动生成黄色便签贴在节点上方，方便用户快速理解",
                            },
                        },
                        "required": ["type"],
                    },
                },
                "notes": {
                    "type": "array",
                    "description": "显式追加便签。任意位置 / 锚定到某个步骤旁",
                    "items": {
                        "type": "object",
                        "properties": {
                            "content": {"type": "string"},
                            "color": {
                                "type": "string",
                                "enum": ["yellow", "green", "blue", "purple", "pink", "orange", "white", "gray"],
                            },
                            "anchor_to": {
                                "type": "string",
                                "description": "锚定到某个步骤的 id（写自定义 id 或步骤索引 id）",
                            },
                            "side": {
                                "type": "string",
                                "enum": ["top", "right", "bottom", "left"],
                            },
                            "x": {"type": "number", "description": "未锚定时的绝对 x 坐标"},
                            "y": {"type": "number", "description": "未锚定时的绝对 y 坐标"},
                            "width": {"type": "number"},
                            "height": {"type": "number"},
                            "font_size": {"type": "integer"},
                            "bold": {"type": "boolean"},
                            "italic": {"type": "boolean"},
                        },
                        "required": ["content"],
                    },
                },
            },
            "required": ["name", "steps"],
        },
        handler=skill_build_workflow,
    ))

    # 系统状态
    registry.register(Skill(
        name="list_executors",
        description="列出后端实际注册的所有执行器类型（这是当前运行环境真正能跑的模块）",
        parameters={"type": "object", "properties": {}},
        handler=skill_list_executors,
    ))
    registry.register(Skill(
        name="list_canvas_executors",
        description="列出所有真实可用的执行器类型，并按 WebRPA 的知识库分类组织（建议用这个代替 list_executors，能看到分类）",
        parameters={"type": "object", "properties": {}},
        handler=skill_get_workflow_executors_for_canvas,
    ))
    registry.register(Skill(
        name="list_custom_modules",
        description="列出所有用户自定义模块",
        parameters={"type": "object", "properties": {}},
        handler=skill_list_custom_modules,
    ))
    registry.register(Skill(
        name="list_scheduled_tasks",
        description="列出所有计划任务",
        parameters={"type": "object", "properties": {}},
        handler=skill_list_scheduled_tasks,
    ))
    registry.register(Skill(
        name="get_recent_logs",
        description=(
            "【仅返回执行结果汇总】返回最近一次工作流的执行汇总（状态、执行节点数、失败数、错误信息）。"
            "**这个工具拿不到用户在底栏日志面板看到的逐条日志条目（[INFO] xxx / [ERROR] xxx 这种）**。"
            "想拿底栏完整日志（用户实际能看到的内容、打印日志模块的输出、节点执行时间等）必须用 client_action(action='get_logs')。"
        ),
        parameters={
            "type": "object",
            "properties": {
                "workflow_id": {"type": "string", "description": "工作流 ID（可选）"},
                "limit": {"type": "integer", "default": 50},
            },
        },
        handler=skill_get_recent_logs,
    ))

    # 全量快照与扩展查询
    registry.register(Skill(
        name="get_full_snapshot",
        description=(
            "一次性获取后端全部可见状态：执行器列表、本地工作流名、自定义模块、计划任务、最近执行结果。"
            "推荐 LLM 在开始任务前先调用一次，以便对项目当前状态有整体认识。"
        ),
        parameters={"type": "object", "properties": {}},
        handler=skill_get_full_snapshot,
    ))
    registry.register(Skill(
        name="list_global_variables",
        description=(
            "【历史遗留】读取后端持久化文件 backend/data/global_vars.json。"
            "**注意：这不是用户在底栏看到的全局变量**。底栏全局变量请用 client_action(action='list_variables') 获取，"
            "底栏的增删改请用 client_action 的 add_variable / update_variable / delete_variable / clear_variables。"
        ),
        parameters={"type": "object", "properties": {}},
        handler=skill_list_global_variables,
    ))
    registry.register(Skill(
        name="get_scheduled_task",
        description="获取某个计划任务的完整定义（trigger 配置、关联工作流等）",
        parameters={
            "type": "object",
            "properties": {"task_id": {"type": "string"}},
            "required": ["task_id"],
        },
        handler=skill_get_scheduled_task,
    ))
    registry.register(Skill(
        name="get_scheduled_task_logs",
        description="读取计划任务的执行日志",
        parameters={
            "type": "object",
            "properties": {
                "task_id": {"type": "string", "description": "可选，只看某个任务的"},
                "limit": {"type": "integer", "default": 50},
            },
        },
        handler=skill_get_scheduled_task_logs,
    ))
    registry.register(Skill(
        name="list_data_assets",
        description="列出所有 Excel 资源（uploads/excel）",
        parameters={
            "type": "object",
            "properties": {
                "folder": {"type": "string", "description": "可选，只看某子目录"}
            },
        },
        handler=skill_list_data_assets,
    ))
    registry.register(Skill(
        name="list_image_assets",
        description="列出所有图像资源（uploads/images）",
        parameters={
            "type": "object",
            "properties": {
                "folder": {"type": "string", "description": "可选，只看某子目录"}
            },
        },
        handler=skill_list_image_assets,
    ))
    registry.register(Skill(
        name="get_custom_module",
        description="读取一个自定义模块的完整定义（包含其内部工作流）",
        parameters={
            "type": "object",
            "properties": {"module_id": {"type": "string"}},
            "required": ["module_id"],
        },
        handler=skill_get_custom_module,
    ))
    registry.register(Skill(
        name="search_in_workflows",
        description="在所有本地工作流文件里搜索文本（节点 label、URL、变量名等）",
        parameters={
            "type": "object",
            "properties": {"keyword": {"type": "string"}},
            "required": ["keyword"],
        },
        handler=skill_search_in_workflows,
    ))
    registry.register(Skill(
        name="summarize_workflow",
        description="读取一个本地工作流并产出结构化摘要（入口/出口节点、节点序列、用到的变量等）",
        parameters={
            "type": "object",
            "properties": {"filename": {"type": "string"}},
            "required": ["filename"],
        },
        handler=skill_summarize_workflow,
    ))

    # 长期记忆
    registry.register(Skill(
        name="remember",
        description="把一条信息写入长期记忆，例如用户的偏好、常用 API Key 名称、习惯做法等。后续会话可通过 recall 查询",
        parameters={
            "type": "object",
            "properties": {
                "content": {"type": "string", "description": "要记住的内容"},
                "tags": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["content"],
        },
        handler=skill_remember,
    ))
    registry.register(Skill(
        name="recall",
        description="从长期记忆中查找相关条目",
        parameters={
            "type": "object",
            "properties": {
                "keyword": {"type": "string", "description": "关键词（留空则返回最近若干条）"},
                "limit": {"type": "integer", "default": 10},
            },
        },
        handler=skill_recall,
    ))
    registry.register(Skill(
        name="forget",
        description="删除一条长期记忆",
        parameters={
            "type": "object",
            "properties": {"memory_id": {"type": "string"}},
            "required": ["memory_id"],
        },
        handler=skill_forget,
        requires_approval=True,
    ))

    # 全局配置
    registry.register(Skill(
        name="get_global_config_keys",
        description="列出 WebRPA 全局配置可用的字段。需要修改时使用 client_action 工具让前端执行",
        parameters={"type": "object", "properties": {}},
        handler=skill_get_global_config_keys,
    ))

    # === 系统执行能力（PowerShell + Python 临时脚本） ===
    registry.register(Skill(
        name="run_shell_command",
        description=(
            "执行系统 shell 命令并返回 stdout/stderr/return_code。"
            "Windows 下默认使用 PowerShell。可用于：查询系统信息、列文件、操作 git、调用 cli 工具等。"
            "高风险（如 rm -rf、del /q、Remove-Item -Recurse、reg delete、format 等）需要在确认后再执行。"
        ),
        parameters={
            "type": "object",
            "properties": {
                "command": {"type": "string", "description": "完整命令字符串（支持多行）"},
                "cwd": {"type": "string", "description": "工作目录，留空则在 WebRPA 项目根目录执行"},
                "timeout": {"type": "integer", "description": "超时秒数（默认 60，最大 600）"},
                "shell": {
                    "type": "string",
                    "description": "强制指定 shell：powershell / cmd / bash / sh。Windows 默认 powershell",
                    "enum": ["powershell", "cmd", "bash", "sh"],
                },
            },
            "required": ["command"],
        },
        handler=skill_run_shell_command,
        requires_approval=True,
    ))
    registry.register(Skill(
        name="run_python_script",
        description=(
            "把一段 Python 代码写到临时脚本，使用 WebRPA 内置 Python 3.13 运行，"
            "拿到运行结果后**自动销毁**该临时脚本（三步走：写入 → 运行 → 销毁）。"
            "适合做：数据处理、文件批量操作、网络请求、JSON/CSV/Excel 解析、算法计算、调用第三方库等。"
            "注意：脚本默认 utf-8 编码，可直接 print 中文；不要在脚本里写绝对依赖外部状态的代码。"
        ),
        parameters={
            "type": "object",
            "properties": {
                "code": {"type": "string", "description": "完整可运行的 Python 源码（含必要的 import）"},
                "timeout": {"type": "integer", "description": "超时秒数（默认 120，最大 1800）"},
                "args": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "传给脚本的命令行参数（脚本里通过 sys.argv[1:] 读取）",
                },
                "extra_env": {
                    "type": "object",
                    "description": "追加到子进程的环境变量字典",
                },
            },
            "required": ["code"],
        },
        handler=skill_run_python_script,
        requires_approval=True,
    ))
    registry.register(Skill(
        name="check_python_environment",
        description="检查 WebRPA 内置 Python 是否可用、列出版本和已安装的常用库",
        parameters={"type": "object", "properties": {}},
        handler=skill_check_python_environment,
    ))

    # === 网页感知（让 AI 真正"看见"网页） ===
    registry.register(Skill(
        name="probe_page",
        description=(
            "用真实浏览器（Playwright Chromium 无头）打开任意 URL，分析页面骨架并返回结构化结果："
            "title / headings / links / buttons / inputs / forms / lists / images_count / selector_hints。"
            "selector_hints 中已经针对常见目标（百度热榜、列表条目、搜索框、主标题）给出推荐 selector。"
            "AI 在搭建涉及具体网页操作的工作流前必须先调用本 skill，绝对不要凭空猜 selector。"
        ),
        parameters={
            "type": "object",
            "properties": {
                "url": {"type": "string", "description": "完整 URL 或域名（自动补 https://）"},
                "timeout": {"type": "integer", "description": "页面加载超时（毫秒），默认 20000", "default": 20000},
            },
            "required": ["url"],
        },
        handler=skill_probe_page,
    ))
    registry.register(Skill(
        name="fetch_page_html",
        description=(
            "简单 HTTP GET 抓取目标 URL 的 HTML（不执行 JS，不能拿动态渲染内容）。"
            "适用于静态页面或当 probe_page 因某些原因失败时的兜底。"
            "返回 status / title / 截断后的 html（默认最大 30000 字符）。"
        ),
        parameters={
            "type": "object",
            "properties": {
                "url": {"type": "string"},
                "max_size": {"type": "integer", "description": "HTML 截断长度上限", "default": 30000},
            },
            "required": ["url"],
        },
        handler=skill_fetch_page_html,
    ))
    registry.register(Skill(
        name="get_page_dom_snapshot",
        description=(
            "对用户当前已打开的浏览器页面（WebRPA browser_engine 管理）做 DOM 快照，"
            "无需重新打开 URL。当用户已经在 WebRPA 内置浏览器里打开了目标网页时，"
            "用本 skill 比 probe_page 更快、更接近用户真实视角。"
        ),
        parameters={
            "type": "object",
            "properties": {
                "target_description": {"type": "string", "description": "目标元素的自然语言描述（可选）", "default": ""},
            },
        },
        handler=skill_get_page_dom_snapshot,
    ))
    registry.register(Skill(
        name="suggest_selector",
        description=(
            "给一个目标的自然语言描述（如「百度热榜列表」「搜索框」「主标题」），"
            "结合 probe_page 或当前页面 DOM 给出最合适的 CSS selector 候选列表（按 confidence 排序）。"
            "AI 在配置 click_element / get_text / get_attribute / fill_input 等模块的 selector 字段时，应当先调用本 skill 拿到真实 selector。"
        ),
        parameters={
            "type": "object",
            "properties": {
                "target_description": {"type": "string", "description": "目标元素的自然语言描述"},
                "url": {"type": "string", "description": "如要针对某个 URL 探查则传入；不传时使用当前已打开页面"},
            },
            "required": ["target_description"],
        },
        handler=skill_suggest_selector,
    ))

    # === 计划任务 真生效 CRUD ===
    registry.register(Skill(
        name="create_scheduled_task",
        description=(
            "在后端真正创建一个计划任务（直接注册到 APScheduler 调度器，立即生效）。"
            "trigger 必须包含 type 字段：time/hotkey/webhook/startup。"
            "时间触发器示例：{type:'time', schedule_type:'daily', daily_time:'09:00:00'} "
            "或 {type:'time', schedule_type:'interval', interval_seconds:60} "
            "或 {type:'time', schedule_type:'weekly', weekly_days:[1,3,5], weekly_time:'09:00:00'}。"
            "Webhook 示例：{type:'webhook', webhook_path:'/my-task'}。"
            "热键示例：{type:'hotkey', hotkey:'ctrl+alt+r'}。"
        ),
        parameters={
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "workflow_id": {"type": "string", "description": "要执行的工作流 id（来自 list_workflows 的结果）"},
                "trigger": {"type": "object"},
                "description": {"type": "string"},
                "workflow_name": {"type": "string"},
                "enabled": {"type": "boolean"},
                "headless": {"type": "boolean", "description": "是否无头模式运行"},
                "open_monitor": {"type": "boolean", "description": "执行时是否打开监控"},
            },
            "required": ["name", "workflow_id", "trigger"],
        },
        handler=skill_create_scheduled_task,
        requires_approval=True,
    ))
    registry.register(Skill(
        name="update_scheduled_task",
        description="更新计划任务字段。可改 name/description/workflow_id/workflow_name/trigger/enabled/headless/open_monitor",
        parameters={
            "type": "object",
            "properties": {
                "task_id": {"type": "string"},
                "updates": {"type": "object"},
            },
            "required": ["task_id", "updates"],
        },
        handler=skill_update_scheduled_task,
    ))
    registry.register(Skill(
        name="delete_scheduled_task",
        description="删除计划任务（不可恢复，立即注销触发器）",
        parameters={
            "type": "object",
            "properties": {"task_id": {"type": "string"}},
            "required": ["task_id"],
        },
        handler=skill_delete_scheduled_task,
        requires_approval=True,
    ))
    registry.register(Skill(
        name="toggle_scheduled_task",
        description="启用/禁用计划任务（立即注册或注销触发器）",
        parameters={
            "type": "object",
            "properties": {
                "task_id": {"type": "string"},
                "enabled": {"type": "boolean"},
            },
            "required": ["task_id", "enabled"],
        },
        handler=skill_toggle_scheduled_task,
    ))
    registry.register(Skill(
        name="execute_scheduled_task",
        description="立即手动执行一次计划任务（异步加入队列）",
        parameters={
            "type": "object",
            "properties": {"task_id": {"type": "string"}},
            "required": ["task_id"],
        },
        handler=skill_execute_scheduled_task,
    ))
    registry.register(Skill(
        name="stop_scheduled_task",
        description="强制停止正在执行的计划任务",
        parameters={
            "type": "object",
            "properties": {"task_id": {"type": "string"}},
            "required": ["task_id"],
        },
        handler=skill_stop_scheduled_task,
    ))
    registry.register(Skill(
        name="clear_scheduled_task_logs",
        description="清空计划任务执行日志（不传 task_id 则清全部）",
        parameters={
            "type": "object",
            "properties": {"task_id": {"type": "string", "description": "可选，留空清全部"}},
        },
        handler=skill_clear_scheduled_task_logs,
        requires_approval=True,
    ))

    # === 自定义模块 真生效 CRUD ===
    registry.register(Skill(
        name="create_custom_module",
        description=(
            "创建一个自定义模块（把一组节点封装成可复用模块）。"
            "name 是英文标识符（^[A-Za-z_][A-Za-z0-9_]*$）；display_name 是中文显示名。"
            "workflow 必须包含 nodes 数组（建议先用 build_workflow 搞出 nodes/edges，再调本工具封装）。"
        ),
        parameters={
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "英文标识符"},
                "display_name": {"type": "string"},
                "workflow": {"type": "object", "description": "{nodes: [...], edges: [...]}"},
                "description": {"type": "string"},
                "icon": {"type": "string"},
                "color": {"type": "string", "description": "十六进制色值，例如 #8B5CF6"},
                "category": {"type": "string"},
                "parameters": {"type": "array", "items": {"type": "object"}, "description": "输入参数定义"},
                "outputs": {"type": "array", "items": {"type": "object"}},
                "tags": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["name", "display_name", "workflow"],
        },
        handler=skill_create_custom_module,
    ))
    registry.register(Skill(
        name="update_custom_module",
        description="更新自定义模块。updates 可含 name/display_name/description/icon/color/category/parameters/outputs/workflow/tags",
        parameters={
            "type": "object",
            "properties": {
                "module_id": {"type": "string"},
                "updates": {"type": "object"},
            },
            "required": ["module_id", "updates"],
        },
        handler=skill_update_custom_module,
    ))
    registry.register(Skill(
        name="delete_custom_module",
        description="删除自定义模块",
        parameters={
            "type": "object",
            "properties": {"module_id": {"type": "string"}},
            "required": ["module_id"],
        },
        handler=skill_delete_custom_module,
        requires_approval=True,
    ))

    # === 工作流 真生效（后端持久化 + 后端执行） ===
    registry.register(Skill(
        name="save_local_workflow",
        description=(
            "把一个完整工作流保存为本地 JSON 文件（与前端「保存」按钮等效，用户重启后还在）。"
            "推荐用于把 build_workflow 生成的 nodes/edges 一键存档。"
        ),
        parameters={
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "工作流名（也是文件名）"},
                "nodes": {"type": "array", "items": {"type": "object"}},
                "edges": {"type": "array", "items": {"type": "object"}},
                "variables": {"type": "array", "items": {"type": "object"}},
                "folder": {"type": "string", "description": "可选目录，留空用默认"},
            },
            "required": ["name", "nodes", "edges"],
        },
        handler=skill_save_local_workflow,
    ))
    registry.register(Skill(
        name="run_workflow_now",
        description=(
            "立即在后端执行一个临时工作流（不依赖前端是否打开），并返回 workflow_id 用于查执行结果。"
            "适合定期检测、批量处理这类无需用户交互的任务。"
        ),
        parameters={
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "nodes": {"type": "array", "items": {"type": "object"}},
                "edges": {"type": "array", "items": {"type": "object"}},
                "variables": {"type": "array", "items": {"type": "object"}},
                "headless": {"type": "boolean", "description": "默认 true"},
            },
            "required": ["nodes", "edges"],
        },
        handler=skill_run_workflow_now,
    ))
    registry.register(Skill(
        name="stop_workflow_now",
        description="停止后端正在跑的工作流",
        parameters={
            "type": "object",
            "properties": {"workflow_id": {"type": "string"}},
            "required": ["workflow_id"],
        },
        handler=skill_stop_workflow_now,
    ))

    # === 注意：底栏全局变量请走前端 client_action（add_variable / update_variable / delete_variable / clear_variables）===
    # 后端的持久化文件（backend/data/global_vars.json）只是历史遗留，与用户在底栏看到的全局变量不是同一份。
    # 这里不再注册 set_global_variable / delete_global_variable / clear_global_variables 三个会写入孤儿文件的 skill。

    # === 资源管理 真生效 ===
    registry.register(Skill(
        name="delete_data_asset",
        description="删除一个 Excel 数据资源",
        parameters={
            "type": "object",
            "properties": {"asset_id": {"type": "string"}},
            "required": ["asset_id"],
        },
        handler=skill_delete_data_asset,
        requires_approval=True,
    ))
    registry.register(Skill(
        name="rename_data_asset",
        description="重命名 Excel 数据资源",
        parameters={
            "type": "object",
            "properties": {
                "asset_id": {"type": "string"},
                "new_name": {"type": "string"},
            },
            "required": ["asset_id", "new_name"],
        },
        handler=skill_rename_data_asset,
    ))
    registry.register(Skill(
        name="delete_image_asset",
        description="删除一个图像资源",
        parameters={
            "type": "object",
            "properties": {"image_id": {"type": "string"}},
            "required": ["image_id"],
        },
        handler=skill_delete_image_asset,
        requires_approval=True,
    ))
    registry.register(Skill(
        name="rename_image_asset",
        description="重命名图像资源",
        parameters={
            "type": "object",
            "properties": {
                "image_id": {"type": "string"},
                "new_name": {"type": "string"},
            },
            "required": ["image_id", "new_name"],
        },
        handler=skill_rename_image_asset,
    ))

    # === 7. 客户端操作（标记型 Skills） ===
    # 这些工具不在后端真正执行，只是把意图返回给前端，由前端 SkillDispatcher 完成。
    # 让 LLM 知道"调这个工具就能让前端做事"。

    async def _client_action_stub(action: str, payload: dict | None = None, **_: Any) -> dict[str, Any]:
        return {
            "client_action": action,
            "payload": payload or {},
            "note": "此动作将由前端执行；前端确认完成后会回传执行结果",
        }

    registry.register(Skill(
        name="client_action",
        description=(
            "请前端执行一个 WebRPA 操作。这是小助手操作前端最重要的工具，可用 action 完整列表：\n\n"
            "【工作流操作】\n"
            "- new_workflow: 新建空白工作流\n"
            "- load_workflow: 加载本地工作流（payload.filename）\n"
            "- load_workflow_from_data: 直接载入完整工作流到画布（payload.name, payload.nodes, payload.edges）\n"
            "- save_workflow: 保存当前工作流\n"
            "- run_workflow: 有头模式运行当前工作流\n"
            "- run_workflow_headless: 无头模式运行当前工作流\n"
            "- stop_workflow: 停止当前工作流\n"
            "- export_workflow: 导出工作流（payload.format='json'|'playwright'|'markdown'）\n"
            "- rename_workflow: 重命名当前工作流（payload.name）\n"
            "- get_workflow_detail: 拿到当前画布的完整 nodes/edges/variables（节点配置详情）\n"
            "- get_collected_data: 获取当前数据表格内容\n\n"
            "【节点】\n"
            "- add_nodes: 把节点加入画布（payload.nodes, payload.edges）\n"
            "- delete_node: 删除单个节点（payload.node_id）\n"
            "- delete_nodes: 批量删除节点（payload.node_ids）\n"
            "- update_node_config: 更新节点配置（payload.node_id, payload.config）\n"
            "- bulk_update_nodes: 批量更新多个节点（payload.patches=[{node_id, config}, ...]，比循环 update_node_config 更快）\n"
            "- get_node_runtime_errors: 从日志中提取最近一次执行的失败/错误信息（带 node_id）\n"
            "- focus_node: 聚焦/选中节点（payload.node_id）\n"
            "- toggle_node_disabled: 启用/禁用节点（payload.node_ids）\n"
            "- align_nodes: 对齐已选中的节点（payload.type='left'|'center'|'right'|'top'|'middle'|'bottom'|'distribute-horizontal'|'distribute-vertical'）\n"
            "- auto_layout: 自动重排整个画布（基于 ELKJS 的分层布局，自上而下、分支自动错列、走线清晰）。一键整理混乱画布\n"
            "- copy_nodes: 复制节点到剪贴板（payload.node_ids）\n"
            "- paste_nodes: 粘贴剪贴板节点（payload.position 可选）\n"
            "- move_node: 把节点移动到指定坐标（payload.node_id, payload.x, payload.y）\n"
            "- rename_node: 修改节点的备注（payload.node_id, payload.name）。注意：节点的官方模块名（label）是只读的，AI 重命名时实际只改 name 字段，画布上会显示成「<官方模块名> (<name>)」\n"
            "- find_nodes_by_type: 查找所有指定 type 的节点 id（payload.type）\n"
            "- connect_nodes: 创建节点之间的连线（payload.source, payload.target, payload.source_handle 可选, payload.target_handle 可选）\n"
            "- auto_connect_chain: 把一组节点按顺序自动串起来（payload.node_ids=[a,b,c,d] 会生成 a→b→c→d）。比循环 connect_nodes 高效得多\n"
            "- connect_branches: 给条件/判断节点连两个分支（payload.condition_node_id, payload.true_node_id, payload.false_node_id）。处理 condition/element_exists/element_visible/image_exists 等带 true/false 输出的节点必备\n"
            "- disconnect_edge: 删除指定连线（payload.edge_id）\n"
            "- select_all_nodes: 选中画布所有节点\n"
            "- clear_selection: 取消所有节点选中\n"
            "- fit_view: 自动缩放画布让所有节点可见\n"
            "- run_single_node: 单独运行某节点（仅支持调试场景）（payload.node_id）\n"
            "- replace_module_type: 替换节点的 module_type 但保留位置和连线（修复用错模块时用）（payload.node_id, payload.new_type）\n"
            "- duplicate_node: 复制单个节点并偏移定位（payload.node_id）\n"
            "- undo / redo: 撤销 / 重做\n\n"
            "【变量】\n"
            "- add_variable: 新增变量（payload.name, payload.value, payload.type, payload.scope）\n"
            "- update_variable: 更新变量值（payload.name, payload.value）\n"
            "- delete_variable: 删除变量（payload.name）\n"
            "- rename_variable: 重命名变量（payload.old_name, payload.new_name）\n"
            "- list_variables: 列出所有变量（仅 store，不查询后端）\n"
            "- get_variable: 取单个变量（payload.name），返回 {name, value, type, scope}\n"
            "- change_variable_type: 修改变量类型 string/number/boolean/array/object（payload.name, payload.type, payload.value 可选）\n"
            "- clear_variables: 清空所有全局变量（高危，建议确认）\n\n"
            "【日志底栏】\n"
            "- get_logs: 【强烈推荐】底栏日志面板用户实际看到的所有逐条日志（payload.limit, 默认 100）\n"
            "- clear_logs: 清空日志\n"
            "- export_logs: 下载日志为文本文件\n"
            "- set_verbose_log: 切换详细日志（payload.enabled=true|false）\n"
            "- set_max_log_count: 设置日志最大条数（payload.count）\n"
            "- add_log: 添加自定义日志条目（payload.level, payload.message）\n\n"
            "【数据表格底栏】\n"
            "- get_collected_data: 拿到当前数据表格全部行（用户实际看到的）\n"
            "- add_data_row: 添加一行（payload.row 可选，{col1: val1, ...}），不传则添加空行\n"
            "- add_data_column: 添加一列（payload.column 列名, payload.default 默认值可选）\n"
            "- delete_data_row: 删除某一行（payload.index, 0-based）\n"
            "- delete_data_column: 删除某一列（payload.column 列名）\n"
            "- set_data_cell: 修改单元格（payload.row_index, payload.column, payload.value）\n"
            "- clear_data: 清空整张数据表格\n"
            "- download_data: 下载完整 CSV 数据\n\n"
            "【Excel 资源底栏】\n"
            "- list_data_assets: 列出所有 Excel 资源\n"
            "- delete_data_asset: 删除某个 Excel 资源（payload.id）\n"
            "- rename_data_asset: 重命名 Excel 资源（payload.id, payload.new_name）\n"
            "- preview_data_asset: 预览 Excel 内容（payload.id, payload.sheet?, payload.max_rows?, payload.max_cols?）\n"
            "- get_data_asset_sheets: 列出 Excel 文件所有 sheet 名（payload.id）\n"
            "- upload_excel: 触发文件选择上传\n\n"
            "【图像资源底栏】\n"
            "- list_image_assets: 列出所有图像资源\n"
            "- delete_image_asset: 删除某个图像（payload.id）\n"
            "- rename_image_asset: 重命名图像（payload.id, payload.new_name）\n"
            "- upload_image: 触发文件选择上传\n\n"
            "【底栏 Tab 切换】\n"
            "- switch_bottom_panel: 切换底栏 tab（payload.tab='logs'|'data'|'variables'|'assets'|'images'）\n\n"
            "【工作流 - 本地文件】\n"
            "- list_local_workflows: 列出本地工作流文件（payload.folder 可选）\n"
            "- get_local_workflow_content: 读取本地工作流文件内容（payload.filename）\n"
            "- save_workflow_to_folder: 把当前画布保存到指定文件（payload.filename，不弹对话框）\n"
            "- delete_local_workflow: 删除本地工作流文件（payload.filename）\n"
            "- get_local_workflow_default_folder: 获取本地工作流默认存储文件夹\n"
            "- load_workflow: 直接打开本地某个文件并装入画布（payload.filename）\n\n"
            "【工作流 - 仓库（远程 Hub）】\n"
            "- hub_list_workflows: 浏览仓库（payload.keyword?, category?, page?, limit?, sort_by?='latest'|'popular'|'hot'）\n"
            "- hub_get_categories: 列出仓库所有分类\n"
            "- hub_download_workflow: 下载并自动装入画布（payload.workflow_id, load_into_canvas?=true）\n"
            "- hub_publish_workflow: 把当前画布发布到仓库（payload: name?, description?, category?, tags?, author?）\n"
            "- hub_get_my_workflows: 列出自己（用 clientId）发布过的工作流\n"
            "- hub_delete_my_workflow: 删除自己发布的工作流（payload.workflow_id）\n\n"
            "【计划任务（完整 CRUD）】\n"
            "- list_scheduled_tasks_full: 列出所有计划任务（含详细配置）\n"
            "- get_scheduled_task_detail: 获取某个任务详情（payload.id）\n"
            "- create_scheduled_task: 创建任务（payload 直接是后端 task 对象，含 name, workflow_id, trigger_type, trigger_config, repeat_count 等）\n"
            "- update_scheduled_task: 修改任务（payload.id + 要改的字段）\n"
            "- delete_scheduled_task: 删除任务（payload.id）\n"
            "- toggle_scheduled_task: 启用/禁用（payload.id, payload.enabled=true|false）\n"
            "- execute_scheduled_task: 立即手动执行任务（payload.id）\n"
            "- stop_scheduled_task: 强制停止正在执行的任务（payload.id）\n"
            "- get_scheduled_task_logs: 拿任务日志（payload.id 可选, payload.limit 默认 100，不传 id 则拿所有任务日志）\n"
            "- clear_scheduled_task_logs: 清空日志（payload.id 可选）\n"
            "- get_scheduled_task_statistics: 计划任务统计摘要\n\n"
            "【弹窗 / 面板 - 打开/关闭】\n"
            "- open_global_config / close_global_config: 全局配置对话框\n"
            "- open_local_workflow_dialog / close_local_workflow_dialog: 本地工作流（打开列表）\n"
            "- open_scheduled_tasks / close_scheduled_tasks: 计划任务\n"
            "- open_documentation / close_documentation: 使用文档\n"
            "- open_workflow_hub / close_workflow_hub: 工作流仓库\n"
            "- open_auto_browser / close_auto_browser: 自动化浏览器\n"
            "- open_phone_mirror / close_phone_mirror: 手机投屏\n"
            "- open_variable_tracking / close_variable_tracking: 变量追踪面板\n"
            "- open_screensaver / close_screensaver: 屏保弹幕配置面板\n"
            "- open_export_dialog: 打开导出对话框\n"
            "- open_module_search: 打开画布顶部模块搜索框\n"
            "- take_screenshot: 触发系统截图工具\n\n"
            "【手机坐标拾取（在配置手机自动化模块时使用）】\n"
            "- 任何带有 X/Y 坐标输入框的手机模块（phone_tap、phone_swipe、phone_long_press 等）右侧都有『拾取坐标』按钮\n"
            "- 用户点击后会自动启动手机镜像（独立窗口），按住 Ctrl 在手机画面上点击即可拾取真实坐标\n"
            "- 不按 Ctrl 时镜像窗口照常响应手机操作；窗口会自动置顶到前台\n"
            "- AI 不需要直接调用此功能，但要在用户询问『如何获取手机坐标』时引导其点击模块输入框旁的『拾取』按钮\n\n"
            "【屏保弹幕（独立 Python 全屏窗口）】\n"
            "- start_screensaver: 启动屏保。payload 是完整 config 对象，关键字段：\n"
            "    content_type: 'text'|'scroll'|'clock'|'date'|'countdown'|'bullet'\n"
            "    text: string（text/scroll 用）\n"
            "    datetime_format: strftime 格式串，支持中文 %A 星期/%B 月份/%p 上下午（clock/date 用）\n"
            "    countdown_target: ISO 时间串（countdown 用）\n"
            "    bullets: [{text,color,font_size,speed,bold}, ...]（bullet 用）\n"
            "    font_family/font_size/font_weight('normal'|'bold')/font_italic\n"
            "    color/background: '#RRGGBB'\n"
            "    background_alpha: 0~1（整窗透明度）\n"
            "    outline_color/outline_width(0~6): 文字描边\n"
            "    rotation: 0|90|180|270 度\n"
            "    vertical_text: 是否竖排\n"
            "    scroll_direction: 'left'|'right'|'up'|'down'\n"
            "    scroll_speed: 像素/秒；scroll_loop: bool\n"
            "    fullscreen: 是否全屏；click_through: 是否点击穿透\n"
            "    show_close_hint: 是否显示退出提示；exit_hotkey: 'Escape'|'F12'|'space'\n"
            "  示例：{action:'start_screensaver', payload:{content_type:'scroll', text:'WebRPA 运行中…', font_size:96, color:'#00ff88', scroll_speed:240}}\n"
            "- stop_screensaver: 停止当前屏保子进程\n"
            "- get_screensaver_status: 查询屏保是否在运行（返回 {running, pid}）\n\n"
            "【全局配置】\n"
            "- get_global_config: 读取当前全部全局配置（敏感字段会被脱敏）\n"
            "- update_global_config: 更新某段配置（payload.section, payload.values）\n"
            "  section 可选与字段速查：\n"
            "    system: checkUpdateOnStartup, autoDetectClipboardScreenshot\n"
            "    ai: apiUrl, apiKey, model, temperature, maxTokens, systemPrompt\n"
            "    aiAssistant: apiUrl, apiKey, model, temperature, maxTokens, systemPrompt, enableTools, autoApprove\n"
            "    aiScraper: llmProvider, apiUrl, llmModel, apiKey\n"
            "    email: senderEmail, authCode, smtpServer, smtpPort\n"
            "    browser: type(chromium|msedge|chrome|firefox), executablePath, userDataDir, fullscreen, autoCloseBrowser, launchArgs\n"
            "    database: host, port, user, password, database, charset\n"
            "    qq: apiUrl, accessToken\n"
            "    feishu: appId, appSecret\n"
            "    display: handleSize\n"
            "    workflow: localFolder, autoSave, showOverwriteConfirm\n"
            "  例：update_global_config(section='ai', values={model:'glm-4-plus', temperature:0.7})\n"
            "  zustand persist 中间件会自动把更新写入 localStorage 持久化，无需额外 save 动作\n"
            "- reset_global_config: 重置所有全局配置为默认值（高危操作，建议先确认）\n\n"
            "【提示】\n"
            "- show_toast: 显示提示消息（payload.message, payload.type）\n\n"
            "调用方式示例：\n"
            "  {action: 'switch_bottom_panel', payload: {tab: 'data'}}\n"
            "  {action: 'run_workflow_headless'}\n"
            "  {action: 'export_workflow', payload: {format: 'playwright'}}\n"
            "前端会同步执行并返回结果，你可以基于返回结果继续后续动作。"
        ),
        parameters={
            "type": "object",
            "properties": {
                "action": {"type": "string", "description": "动作名"},
                "payload": {"type": "object", "description": "动作参数"},
            },
            "required": ["action"],
        },
        handler=_client_action_stub,
    ))


_register_all()


# ---------- 统一技能加载入口（治理 v2/v3/v4/mcp 分散导入的技术债） ----------
_EXTENSION_MODULES = [
    "app.services.ai_assistant_skills_v2",   # dry-run / 运行时洞察 / 依赖预检 / 健壮性 / 桌面感知
    "app.services.ai_assistant_skills_v3",   # 系统控制 / 一次性延时 / 自学习 / 教训 / 用户画像
    "app.services.ai_assistant_skills_v4",   # 通用增强（HTTP/文件/Excel/二维码/时间/系统/正则…）
    "app.services.ai_assistant_skills_v5",   # 插件中心：浏览/安装/启停/卸载/从工作流开发/校验/导出/发布/评分
    "app.services.ai_assistant_skills_v6",   # 联网搜索 / 网页正文阅读 / 一站式研究（DuckDuckGo 免 Key）
    "app.services.ai_assistant_skills_mcp",  # MCP 服务器配置/管理
]
_skills_loaded = False


def load_all_skills() -> dict:
    """幂等地加载全部技能扩展模块（副作用：把扩展 skill 注册进 registry）。
    统一入口，替代在 ai_assistant_service 里分散的 noqa 导入。返回加载摘要。"""
    global _skills_loaded
    if _skills_loaded:
        return {"loaded": True, "skills": len(registry.names()), "duplicates": sorted(set(registry._duplicates))}
    import importlib
    for mod in _EXTENSION_MODULES:
        try:
            importlib.import_module(mod)
        except Exception as e:
            print(f"[skill] 加载扩展技能模块失败 {mod}: {e}")
    _skills_loaded = True
    if registry._duplicates:
        print(f"[skill] 检测到重名技能（后者覆盖前者）: {sorted(set(registry._duplicates))}")
    return {"loaded": True, "skills": len(registry.names()), "duplicates": sorted(set(registry._duplicates))}


# ---------- 公共调度入口 ----------

def _coerce_arguments(skill: "Skill", arguments: dict[str, Any]) -> dict[str, Any]:
    """LLM 偶尔会把数组/对象类型的参数二次 JSON 序列化为字符串。
    根据 skill 的 parameters schema 自动把字符串还原成对应的 list/dict。

    若解析失败会在 dict 中添加 _coerce_warnings 字段，但保留原值，由 handler 报错。
    """
    if not isinstance(arguments, dict):
        return arguments
    props = (skill.parameters or {}).get("properties") or {}
    if not isinstance(props, dict):
        return arguments
    fixed = dict(arguments)
    warnings: list[str] = []
    for key, schema in props.items():
        if key not in fixed:
            continue
        v = fixed[key]
        expected = schema.get("type") if isinstance(schema, dict) else None
        if expected in ("array", "object") and isinstance(v, str):
            stripped = v.strip()
            if not stripped:
                fixed[key] = [] if expected == "array" else {}
                continue
            # 尝试 1：直接 json.loads
            try:
                parsed = json.loads(stripped)
                fixed[key] = parsed
                continue
            except Exception:
                pass
            # 尝试 2：去掉可能的代码块 ``` 或前后空白
            cleaned = stripped
            if cleaned.startswith("```"):
                # 去掉 ```json / ``` 头尾
                cleaned = cleaned.split("```", 2)
                cleaned = cleaned[1] if len(cleaned) > 1 else stripped
                if cleaned.startswith("json"):
                    cleaned = cleaned[4:]
                cleaned = cleaned.strip().rstrip("`").strip()
            try:
                parsed = json.loads(cleaned)
                fixed[key] = parsed
                continue
            except Exception as e:
                warnings.append(f"参数 {key} 应为 {expected}，但传入了无法解析的字符串：{e}")
    if warnings:
        # 日志记录，让用户能从 backend stdout 看到原因
        for w in warnings:
            print(f"[execute_skill] {skill.name}: {w}")
    return fixed


async def execute_skill(name: str, arguments: dict[str, Any]) -> dict[str, Any]:
    """调度执行某个 Skill"""
    skill = registry.get(name)
    if skill is None:
        return {"error": f"未知工具: {name}"}
    try:
        # 兼容部分 LLM 把 array/object 参数二次序列化为字符串的 bug
        coerced = _coerce_arguments(skill, arguments or {})
        result = await skill.handler(**coerced)
        return {"success": True, "result": result}
    except TypeError as e:
        return {"error": f"参数错误: {e}"}
    except Exception as e:
        return {"error": f"执行失败: {e}"}


# ---------- 图片 OCR 辅助（非多模态模型降级用） ----------

async def _ocr_image_to_text(image: str) -> str:
    """把一张图片（data URL 或 http URL）做 OCR，返回识别到的文字（best-effort）。
    供非多模态模型降级使用——纯文本模型读不了图，就把图里的字提取出来喂给它。
    失败返回空字符串，绝不抛异常打断主流程。"""
    if not image or not isinstance(image, str):
        return ""

    def _do() -> str:
        try:
            import base64 as _b64
            import io as _io
            import numpy as _np
            from PIL import Image as _Image
            raw: bytes
            s = image.strip()
            if s.startswith("data:"):
                # data:image/png;base64,xxxx
                comma = s.find(",")
                raw = _b64.b64decode(s[comma + 1:]) if comma != -1 else b""
            elif s.startswith("http://") or s.startswith("https://"):
                import requests as _rq
                resp = _rq.get(s, timeout=15)
                if resp.status_code != 200:
                    return ""
                raw = resp.content
            else:
                # 可能是本地路径
                p = Path(s)
                if p.exists():
                    raw = p.read_bytes()
                else:
                    return ""
            if not raw:
                return ""
            pil = _Image.open(_io.BytesIO(raw)).convert("RGB")
            # 大图缩放，避免 CPU 推理过慢
            max_side = max(pil.width, pil.height)
            if max_side > 1600:
                ratio = 1600 / max_side
                pil = pil.resize((int(pil.width * ratio), int(pil.height * ratio)), _Image.Resampling.LANCZOS)
            arr = _np.array(pil)
            from app.executors.media import get_easyocr_reader
            reader = get_easyocr_reader()
            results = reader.readtext(arr)
            # 按从上到下、从左到右排序
            results_sorted = sorted(results, key=lambda x: (x[0][0][1], x[0][0][0]))
            lines = [r[1] for r in results_sorted if len(r) > 1 and r[1]]
            return "\n".join(lines).strip()
        except Exception as e:
            print(f"[_ocr_image_to_text] OCR 失败: {e}")
            return ""

    try:
        return await asyncio.to_thread(_do)
    except Exception:
        return ""
