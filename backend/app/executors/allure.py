"""Allure 测试报告执行器"""
import os
import uuid
import time
from datetime import datetime
from typing import Dict, Any

from .base import ModuleExecutor, ExecutionContext, ModuleResult, register_executor
from .allure_report_builder import build_report

# 全局存储，用于在不同的模块之间共享状态
_ALLURE_SUITE_STORE = {}

@register_executor
class AllureInitExecutor(ModuleExecutor):
    """Allure初始化执行器"""
    
    @property
    def module_type(self) -> str:
        return "allure_init"
        
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        # 兼容前端字段名 testSuite 和旧字段名 suiteName
        suite_name = config.get("testSuite") or config.get("suiteName") or "默认测试套件"
        
        # 初始化一个新的测试套件数据结构
        suite_id = str(uuid.uuid4())
        _ALLURE_SUITE_STORE[suite_id] = {
            "suite_name": suite_name,
            "results": [],
            "current_test": None
        }
        
        # 保存套件ID到上下文中
        context.set_variable("allure_suite_id", suite_id)
        
        return ModuleResult(
            success=True, 
            message=f"已初始化Allure测试套件: {suite_name}", 
            data={"suite_id": suite_id}
        )

@register_executor
class AllureStartTestExecutor(ModuleExecutor):
    """Allure开始测试用例执行器"""
    
    @property
    def module_type(self) -> str:
        return "allure_start_test"
        
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        suite_id = context.get_variable("allure_suite_id")
        if not suite_id or suite_id not in _ALLURE_SUITE_STORE:
            return ModuleResult(success=False, error="未找到初始化的Allure测试套件，请先调用Allure初始化模块")
            
        # 兼容前端字段名 name 和旧字段名 testName，并解析变量引用
        test_name = context.resolve_value(config.get("name") or config.get("testName") or "未命名测试用例")
        description = context.resolve_value(config.get("description", ""))
        severity = context.resolve_value(config.get("severity", "normal"))
        test_id = context.resolve_value(config.get("testId", ""))
        
        suite = _ALLURE_SUITE_STORE[suite_id]
        
        # 如果之前有未结束的测试，先把它结束掉
        if suite["current_test"]:
            if not suite["current_test"].get("stop"):
                suite["current_test"]["stop"] = int(time.time() * 1000)
                suite["current_test"]["status"] = "broken"
                suite["current_test"]["statusDetails"] = {"message": "被新测试强制中断"}
            suite["results"].append(suite["current_test"])
            
        # 构建 labels
        labels = [
            {"name": "suite", "value": suite["suite_name"]},
            {"name": "severity", "value": severity},
            {"name": "testId", "value": test_id if test_id else f"TEST-{len(suite['results']) + 1}"}
        ]
        
        # 创建新测试
        suite["current_test"] = {
            "uuid": str(uuid.uuid4()),
            "name": test_name,
            "description": description,
            "start": int(time.time() * 1000),
            "status": "unknown",
            "labels": labels,
            "steps": [],
            "attachments": []
        }
        
        return ModuleResult(success=True, message=f"已开始测试用例: {test_name}")

@register_executor
class AllureAddStepExecutor(ModuleExecutor):
    """Allure添加测试步骤执行器"""
    
    @property
    def module_type(self) -> str:
        return "allure_add_step"
        
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        suite_id = context.get_variable("allure_suite_id")
        if not suite_id or suite_id not in _ALLURE_SUITE_STORE:
            return ModuleResult(success=False, error="未找到初始化的Allure测试套件")
            
        suite = _ALLURE_SUITE_STORE[suite_id]
        current_test = suite["current_test"]
        if not current_test:
            return ModuleResult(success=False, error="当前没有正在运行的测试用例")
            
        # 兼容前端字段名 name 和旧字段名 stepName，并解析变量引用
        step_name = context.resolve_value(config.get("name") or config.get("stepName") or "测试步骤")
        description = context.resolve_value(config.get("description", ""))
        status = context.resolve_value(config.get("status", "passed"))
        
        step = {
            "name": step_name,
            "status": status,
            "description": description,
            "start": int(time.time() * 1000),
            "stop": int(time.time() * 1000),
            "steps": [],
            "attachments": []
        }
        
        current_test["steps"].append(step)
        return ModuleResult(success=True, message=f"已添加步骤: {step_name}")

@register_executor
class AllureStopTestExecutor(ModuleExecutor):
    """Allure结束测试用例执行器"""
    
    @property
    def module_type(self) -> str:
        return "allure_stop_test"
        
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        suite_id = context.get_variable("allure_suite_id")
        if not suite_id or suite_id not in _ALLURE_SUITE_STORE:
            return ModuleResult(success=False, error="未找到初始化的Allure测试套件")
            
        suite = _ALLURE_SUITE_STORE[suite_id]
        current_test = suite["current_test"]
        if not current_test:
            return ModuleResult(success=False, error="当前没有正在运行的测试用例")
            
        status = context.resolve_value(config.get("status", "passed"))
        # 兼容前端字段名 message 和旧字段名 failMsg，并解析变量引用
        fail_msg = context.resolve_value(config.get("message") or config.get("failMsg") or "")
        
        current_test["stop"] = int(time.time() * 1000)
        current_test["status"] = status
        if fail_msg:
            current_test["statusDetails"] = {"message": fail_msg}
            
        suite["results"].append(current_test)
        suite["current_test"] = None
        
        return ModuleResult(success=True, message=f"已结束测试用例，状态: {status}")

@register_executor
class AllureGenerateReportExecutor(ModuleExecutor):
    """Allure生成测试报告执行器"""
    
    @property
    def module_type(self) -> str:
        return "allure_generate_report"
        
    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        suite_id = context.get_variable("allure_suite_id")
        if not suite_id or suite_id not in _ALLURE_SUITE_STORE:
            return ModuleResult(success=False, error="未找到初始化的Allure测试套件")
            
        suite = _ALLURE_SUITE_STORE[suite_id]
        
        # 若还有未结束的 current_test（用户没连 allure_stop_test），自动收尾
        if suite["current_test"]:
            suite["current_test"]["stop"] = int(time.time() * 1000)
            if suite["current_test"]["status"] == "unknown":
                suite["current_test"]["status"] = "broken"
            suite["results"].append(suite["current_test"])
            suite["current_test"] = None
            
        report_dir = config.get("reportDir", "")
        if not report_dir:
            report_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "allure_reports")
            
        os.makedirs(report_dir, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_path = os.path.join(report_dir, f"report_{timestamp}.html")
        
        # 生成报告前先快照当前数据，然后清理 store
        results_snapshot = list(suite["results"])
        suite_name_snapshot = suite["suite_name"]
        
        # 立即从 store 中移除，释放内存，并让后续的 stop_test 能检测到 suite 已不存在
        del _ALLURE_SUITE_STORE[suite_id]
        context.set_variable("allure_suite_id", None)
        
        try:
            from pathlib import Path
            html_content = build_report(results_snapshot, suite_name_snapshot, Path(report_dir))
            with open(report_path, "w", encoding="utf-8") as f:
                f.write(html_content)
            
            # 自动打开报告
            auto_open = config.get("autoOpen", False)
            if auto_open:
                import webbrowser
                webbrowser.open(f"file://{os.path.abspath(report_path)}")
            
            return ModuleResult(success=True, message=f"已生成Allure测试报告: {report_path}", data={"report_path": report_path})
        except Exception as e:
            return ModuleResult(success=False, error=f"生成报告失败: {str(e)}")


@register_executor
class AllureAddAttachmentExecutor(ModuleExecutor):
    """Allure 添加附件执行器：把本地文件（截图/日志/文本等）附加到当前测试用例，
    生成报告时会内嵌展示（图片直接预览，文本截取展示）。"""

    @property
    def module_type(self) -> str:
        return "allure_add_attachment"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        suite_id = context.get_variable("allure_suite_id")
        if not suite_id or suite_id not in _ALLURE_SUITE_STORE:
            return ModuleResult(success=False, error="未找到初始化的Allure测试套件，请先调用Allure初始化模块")

        suite = _ALLURE_SUITE_STORE[suite_id]
        current_test = suite.get("current_test")
        if not current_test:
            return ModuleResult(success=False, error="当前没有正在运行的测试用例，请先调用「开始测试用例」")

        file_path = context.resolve_value(config.get("filePath") or config.get("path") or config.get("file") or "")
        file_path = str(file_path).strip().strip('"')
        if not file_path:
            return ModuleResult(success=False, error="未指定附件文件路径")
        if not os.path.isfile(file_path):
            return ModuleResult(success=False, error=f"附件文件不存在：{file_path}")

        name = context.resolve_value(config.get("name") or "")
        name = str(name).strip() or os.path.basename(file_path)

        # 按扩展名推断 MIME（报告生成器按 image/* 内嵌预览、text/* 截取展示）
        ext = os.path.splitext(file_path)[1].lower()
        mime_map = {
            ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
            ".gif": "image/gif", ".bmp": "image/bmp", ".webp": "image/webp",
            ".txt": "text/plain", ".log": "text/plain", ".json": "text/plain",
            ".csv": "text/plain", ".xml": "text/plain", ".md": "text/plain",
            ".html": "text/html", ".htm": "text/html",
        }
        mime = mime_map.get(ext, "text/plain")

        # source 直接存绝对路径：报告生成时 results_dir / source 会解析为该绝对路径并读取
        current_test.setdefault("attachments", []).append({
            "name": name, "source": file_path, "type": mime,
        })
        return ModuleResult(success=True, message=f"已添加附件：{name}")
