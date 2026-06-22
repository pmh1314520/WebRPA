# -*- coding: utf-8 -*-
"""WebRPA 小助手 - v13 工作流打包 Skills

让管家能用一句话把工作流打包成独立可执行程序：
"把签到工作流打包成 exe" → 后台构建自包含程序，复用真实引擎，任何模块都能跑。
"""
from __future__ import annotations

from typing import Any

from app.services.ai_assistant_skills import Skill, registry


async def skill_analyze_package(workflow: str, **_: Any) -> dict[str, Any]:
    """打包前分析：工作流用到哪些模块、需要哪些依赖组（评估体积/裁剪）。"""
    from app.services.workflow_runner import load_workflow_dict
    from app.services import workflow_packager
    try:
        wf = load_workflow_dict(workflow)
    except Exception as e:
        return {"error": f"无法加载工作流：{e}"}
    return workflow_packager.analyze_dependencies(wf)


async def skill_package_workflow(workflow: str, output_name: str | None = None,
                                 mode: str = "portable", headless: bool = False,
                                 show_console: bool = True, slim: bool = False, **_: Any) -> dict[str, Any]:
    """把本地工作流打包成独立程序（后台任务）。返回 job_id，用 get_package_status 查进度。"""
    from app.services import workflow_packager
    name = output_name or (workflow.rsplit(".", 1)[0] if workflow else "WebRPA自动化")
    return workflow_packager.package(workflow, name, mode=mode, headless=headless,
                                     show_console=show_console, slim=slim)


async def skill_get_package_status(job_id: str, **_: Any) -> dict[str, Any]:
    """查询打包任务进度/结果。"""
    from app.services import workflow_packager
    job = workflow_packager.get_job(job_id)
    return job or {"error": "任务不存在"}


async def skill_packaging_toolchain(**_: Any) -> dict[str, Any]:
    """查询打包工具链（PyInstaller，用于生成 .exe）是否就绪。"""
    from app.services import workflow_packager
    return workflow_packager.packaging_toolchain_status()


def _register_v13() -> None:
    registry.register(Skill(
        name="analyze_package",
        description="打包前分析工作流用到的模块与所需依赖组（评估体积/裁剪）。workflow 传本地工作流文件名。",
        parameters={"type": "object", "properties": {"workflow": {"type": "string"}},
                    "required": ["workflow"]},
        handler=skill_analyze_package,
    ))
    registry.register(Skill(
        name="package_workflow",
        description=("把本地工作流一键打包成独立可执行程序（自包含，复用真实引擎，任何模块都能跑）。"
                     "mode=portable(拷给任何电脑都能跑)/shared(依赖本机WebRPA,体积小)；"
                     "headless=是否后台无浏览器运行。返回 job_id。"),
        parameters={
            "type": "object",
            "properties": {
                "workflow": {"type": "string", "description": "本地工作流文件名"},
                "output_name": {"type": "string"},
                "mode": {"type": "string", "enum": ["portable", "shared"]},
                "headless": {"type": "boolean"},
                "show_console": {"type": "boolean"},
                "slim": {"type": "boolean"},
            },
            "required": ["workflow"],
        },
        handler=skill_package_workflow,
        requires_approval=True,
    ))
    registry.register(Skill(
        name="get_package_status",
        description="查询打包任务进度/结果。job_id 取自 package_workflow。",
        parameters={"type": "object", "properties": {"job_id": {"type": "string"}},
                    "required": ["job_id"]},
        handler=skill_get_package_status,
    ))
    registry.register(Skill(
        name="packaging_toolchain_status",
        description="查询打包工具链（PyInstaller）是否就绪（生成 .exe 需要）。",
        parameters={"type": "object", "properties": {}},
        handler=skill_packaging_toolchain,
    ))


_register_v13()
