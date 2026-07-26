"""Word 自动化模块执行器（基于 Microsoft Word COM 接口）

设计目标：对标「Excel自动化」分类，提供一整套直接操作本地 .docx/.doc 的模块，
覆盖打开/新建、读写文本、光标定位与移动、查找替换、表格读写、插图、超链接、
导出 PDF、保存、关闭等完整链路。

实现要点：
- 采用 Word COM（pywin32）而非 python-docx：只有 COM 才能表达「光标位置」
  「选区」「所见即所得排版」这类真实 Word 语义，也才支持导出 PDF、宏等能力。
- 文档实例按「文档键（doc_key）」缓存在 ExecutionContext 上，实现
  「打开一次 → 多个模块连续操作 → 保存/关闭」的工作流式用法。
- COM 是同步阻塞 API，全部调用放线程池执行，避免卡住事件循环。
- 每个工作线程独立 CoInitialize，避免跨线程 COM 调用报错。
"""
from __future__ import annotations

import asyncio
import os
from typing import Any, Optional

from app.executors.base import (
    ModuleExecutor,
    ExecutionContext,
    ModuleResult,
    register_executor,
)

# ---- Word COM 常量（避免依赖 win32com.client.constants 需先加载类型库）----
WD_FORMAT_PDF = 17            # WdSaveFormat.wdFormatPDF
WD_DO_NOT_SAVE_CHANGES = 0    # WdSaveOptions.wdDoNotSaveChanges
WD_SAVE_CHANGES = -1          # WdSaveOptions.wdSaveChanges

# 光标移动单位（WdUnits）
WD_UNITS = {
    "character": 1,   # wdCharacter
    "word": 2,        # wdWord
    "sentence": 3,    # wdSentence
    "paragraph": 4,   # wdParagraph
    "line": 5,        # wdLine
    "story": 6,       # wdStory（整篇）
}

# 文档位置（用于"定位光标"）
WD_STORY_START = 6   # wdStory 配合 HomeKey
WD_LINE = 5


class WordError(Exception):
    """Word 自动化专用异常，便于统一转成友好错误信息"""


def _com_init():
    """在当前线程初始化 COM（每个线程都需要）"""
    try:
        import pythoncom  # type: ignore
        pythoncom.CoInitialize()
    except Exception:
        pass


def _com_uninit():
    try:
        import pythoncom  # type: ignore
        pythoncom.CoUninitialize()
    except Exception:
        pass


def _require_win32():
    """确认 pywin32 可用，否则给出可操作的提示"""
    try:
        import win32com.client  # type: ignore  # noqa: F401
        return True
    except ImportError as e:
        raise WordError(
            "Word 自动化不可用：缺少 pywin32（win32com）。"
            "请确认运行环境已安装 pywin32，且本机安装了 Microsoft Word 或 WPS Office。"
        ) from e


# 文字处理程序的 COM ProgID 候选（按优先级）。
# 国内大量用户只装 WPS：WPS 安装时若开启了"兼容第三方系统/接口"，会把
# Word.Application 注册指向 WPS；但并非所有安装都会注册，故必须回退到
# WPS 自己的 ProgID，否则只装 WPS 的机器会直接报"无法创建 Word 实例"。
# 注：COM 的 ProgID 查表大小写不敏感，KWPS.Application 与 kwps.Application 是同一个键，
# 不要重复登记，否则只会多跑一次注定失败的尝试、拖慢启动。
_WORD_PROGIDS = [
    # 注意 Word.Application 的兜底名只是"猜测值"：WPS 安装时若接管了这个 ProgID，
    # 实际跑的就是 WPS。真实引擎名以创建成功后读到的 app.Name 为准（见 _create_word_app）。
    ("Word.Application", "Microsoft Word"),
    ("KWPS.Application", "WPS 文字"),
    ("WPS.Application", "WPS 文字"),
]

# 引擎名归一化的关键词映射：app.Name 各版本返回值不统一
# （如 "Microsoft Word" / "WPS Writer" / "Kingsoft WPS"），统一成两个稳定名称便于展示。
_ENGINE_NAME_RULES = (
    (("wps", "kingsoft"), "WPS 文字"),
    (("word",), "Microsoft Word"),
)


def _normalize_engine_name(raw: Any, fallback: str) -> str:
    """把 app.Name 的返回值归一为稳定的引擎显示名。

    - 含 wps / kingsoft → 「WPS 文字」
    - 含 word          → 「Microsoft Word」
    - 其它非空字符串    → 原样返回（保留未知引擎的真实名称，便于排查）
    - 空 / None / 非字符串 → 返回 fallback
    返回值保证是非空字符串。
    """
    if not isinstance(raw, str):
        return fallback
    text = raw.strip()
    if not text:
        return fallback
    lowered = text.lower()
    for keywords, name in _ENGINE_NAME_RULES:
        if any(k in lowered for k in keywords):
            return name
    return text


def _create_word_app(visible: bool = True):
    """创建文字处理程序的 COM 实例，自动在 Word / WPS 之间选择可用者。

    返回 (app, engine_label)。全部失败时抛出带可操作指引的 WordError。
    """
    import win32com.client  # type: ignore

    errors: list[str] = []
    for prog_id, label in _WORD_PROGIDS:
        try:
            app = win32com.client.DispatchEx(prog_id)
        except Exception as e:
            errors.append(f"{prog_id}: {e}")
            continue
        # 部分 ProgID 能创建但不支持 Visible/DisplayAlerts，属正常差异，忽略即可
        try:
            app.Visible = bool(visible)
        except Exception:
            pass
        try:
            app.DisplayAlerts = 0
        except Exception:
            pass
        # 读实际引擎名：WPS 可能接管了 Word.Application，只看 ProgID 会把 WPS 误报成 Word
        try:
            engine = _normalize_engine_name(app.Name, label)
        except Exception:
            engine = label
        return app, engine

    raise WordError(
        "无法启动文字处理程序（Word / WPS 均不可用）。请确认本机已安装 "
        "Microsoft Word 或 WPS Office；若只装了 WPS，请在 "
        "「WPS → 设置 → 配置和修复工具 → 高级 → 兼容/其他」中开启对第三方系统（COM/OLE）接口的支持后重试。\n"
        "尝试记录：" + "; ".join(errors[:4])
    )


def _save_doc_as(doc, path: str, file_format=None) -> None:
    """另存文档，兼容 WPS：SaveAs2 是 Word 2010+ 新增，WPS 常只提供 SaveAs。"""
    abs_path = os.path.abspath(path)
    attempts = []
    for method_name in ("SaveAs2", "SaveAs"):
        method = getattr(doc, method_name, None)
        if method is None:
            continue
        try:
            if file_format is None:
                method(abs_path)
            else:
                method(abs_path, file_format)
            return
        except Exception as e:
            attempts.append(f"{method_name}: {e}")
    raise WordError("保存文档失败（Word/WPS 均未成功）。" + ("尝试记录：" + "; ".join(attempts) if attempts else ""))


def _export_doc_pdf(doc, out_path: str) -> str:
    """导出 PDF，兼容 WPS：优先 ExportAsFixedFormat，失败回退 SaveAs(FileFormat=17)。

    失败语义与 _create_word_app 完全不同，必须给不同的处置建议：
    能走到这里说明 Word/WPS 实例已创建、文档已能打开，纯粹是「导出 PDF 这个接口」不通
    （典型原因是 WPS 个人免费版对 COM 导出 PDF 做了功能限制），
    此时让用户去"装软件/开接口"是误导，应该引导他换导出路径或换引擎。
    """
    abs_out = os.path.abspath(out_path)
    folder = os.path.dirname(abs_out)
    if folder:
        os.makedirs(folder, exist_ok=True)
    attempts = []
    try:
        doc.ExportAsFixedFormat(OutputFileName=abs_out, ExportFormat=WD_FORMAT_PDF)
        return abs_out
    except Exception as e:
        attempts.append(f"ExportAsFixedFormat: {e}")
    try:
        _save_doc_as(doc, abs_out, WD_FORMAT_PDF)
        return abs_out
    except Exception as e:
        attempts.append(f"SaveAs(PDF): {e}")
    raise WordError(
        "PDF 导出接口不可用（文档本身已可正常打开与编辑，仅「导出 PDF」这一步失败）。\n"
        "常见原因与处置：\n"
        "  1) WPS 个人免费版限制了 COM 导出 PDF —— 可升级 WPS 或改用下面的替代路径；\n"
        "  2) 替代路径：先用「保存Word」存成 .docx，再用「通用文档转换」"
        "（universal_doc_convert，属「文档转换」功能模块包）转 PDF；\n"
        "  3) 本机安装 Microsoft Word 后重试（Word 的导出接口无此限制）。\n"
        "尝试记录：" + "; ".join(attempts)
    )


# ============================================================
# 文档会话管理：把打开的 Word 文档挂在 ExecutionContext 上共享
# ============================================================

def _sessions(context: ExecutionContext) -> dict:
    """取（惰性创建）当前工作流的 Word 文档会话表"""
    store = getattr(context, "_word_docs", None)
    if store is None:
        store = {}
        setattr(context, "_word_docs", store)
    return store


def _put_session(context: ExecutionContext, key: str, app, doc, path: str,
                 worker=None, engine: str = "") -> None:
    """登记文档会话。engine 记录实际引擎名，供后续模块（如导出 PDF）回显。"""
    _sessions(context)[key] = {
        "app": app, "doc": doc, "path": path, "worker": worker, "engine": engine,
    }


async def _run_in_session(session: dict, fn):
    """在「该文档会话专用的 COM 线程」里执行操作（跨模块共享文档的唯一正确方式）"""
    return await _session_worker(session).run(fn)


def _session_worker(session: dict) -> "_WordWorker":
    """取会话绑定的专用 COM 线程；缺失说明会话结构异常，给出明确指引"""
    worker = session.get("worker")
    if worker is None:
        raise WordError(
            "文档会话已失效（缺少 COM 宿主线程）。请重新执行「打开/新建Word」模块后重试。"
        )
    return worker


def _get_session(context: ExecutionContext, key: str) -> dict:
    """按 doc_key 取会话；不传则回退到「最后一次打开的文档」"""
    store = _sessions(context)
    if not store:
        raise WordError(
            "当前没有已打开的 Word 文档。请先用「打开/新建Word」模块打开文档，"
            "再使用其它 Word 模块。"
        )
    k = (key or "").strip()
    if k:
        if k not in store:
            raise WordError(
                f"找不到文档标识「{k}」。请检查「文档标识」是否与「打开/新建Word」模块里填的一致。"
            )
        return store[k]
    # 未指定则用最后一个（单文档场景下用户无需关心标识）
    return list(store.values())[-1]


def _pop_session(context: ExecutionContext, key: str) -> tuple[str, dict]:
    store = _sessions(context)
    if not store:
        raise WordError("当前没有已打开的 Word 文档，无需关闭。")
    k = (key or "").strip()
    if k:
        if k not in store:
            raise WordError(f"找不到文档标识「{k}」。")
        return k, store.pop(k)
    last_key = list(store.keys())[-1]
    return last_key, store.pop(last_key)


async def _run_com(fn, *args, **kwargs):
    """在线程池里跑一次「自包含」的同步 COM 调用（内部完成创建→使用→释放）。

    ⚠️ 仅可用于「在一个 fn 内部走完整个生命周期」的场景（例如独立转换 PDF：
    打开文件 → 导出 → 关闭 → 退出）。
    绝不能用它跨模块操作同一个 COM 对象：COM 对象绑定在创建它的线程套间（STA）上，
    本函数结束时会 CoUninitialize 销毁套间，之后在别的线程访问该对象会失败
    （典型报错形如 `Open.Content`）。跨模块共享的文档请用 _WordWorker。
    """
    loop = asyncio.get_running_loop()

    def _wrapped():
        _com_init()
        try:
            return fn(*args, **kwargs)
        finally:
            _com_uninit()

    return await loop.run_in_executor(None, _wrapped)


class _WordWorker:
    """单线程 COM 宿主：保证同一个 Word 文档的所有调用都在同一线程套间内完成。

    Word COM 对象是 apartment-bound 的：谁创建、就只能由谁使用。
    工作流里「打开Word → 读文本 → 写文本 → 保存 → 关闭」跨多个模块执行，
    若每次都换线程并重新 CoInitialize，第二个模块拿到的对象就已经失效。
    因此每个文档会话独占一个常驻线程，COM 在该线程初始化一次、会话结束才释放。
    """

    def __init__(self) -> None:
        from concurrent.futures import ThreadPoolExecutor
        self._pool = ThreadPoolExecutor(max_workers=1, thread_name_prefix="webrpa-word")
        # 在该专用线程内初始化 COM（阻塞等待完成，确保后续调用都处于已初始化状态）
        self._pool.submit(_com_init).result()

    async def run(self, fn, *args, **kwargs):
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(self._pool, lambda: fn(*args, **kwargs))

    def close(self) -> None:
        """反初始化 COM 并回收线程（失败也不抛出，避免影响主流程收尾）"""
        try:
            self._pool.submit(_com_uninit).result(timeout=10)
        except Exception:
            pass
        try:
            self._pool.shutdown(wait=False)
        except Exception:
            pass


def _to_bool(value: Any, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    if value is None or value == "":
        return default
    if isinstance(value, str):
        return value.strip().lower() not in ("false", "0", "no", "off", "")
    return bool(value)


def _to_int(value: Any, default: int = 0) -> int:
    try:
        if value is None or value == "":
            return default
        return int(float(value))
    except (TypeError, ValueError):
        return default


def _is_file_write_locked(path: str) -> bool:
    """是否有进程正以拒绝写入的方式持有该文件（用于区分「真占用」与「残留锁文件」）。

    Word/WPS 打开文档期间会拒绝其它进程以写方式打开；而进程已退出、只剩 ~$ 锁文件
    残留时，写方式打开是能成功的。据此可以给出更准确的诊断。
    """
    try:
        with open(path, "r+b"):
            return False
    except PermissionError:
        return True
    except OSError:
        return False


def _detect_lock_file(path: str) -> str:
    """返回该文档对应的 Word/WPS 锁文件名（存在则返回文件名，否则空串）。

    背景：Word/WPS 打开一个已被占用的文档时会弹出「文件正被另一用户使用」模态框，
    COM 调用会一直阻塞到工作流超时（表现为「打开/新建Word」卡住 120 秒后失败）。

    判定依据是 Word/WPS 的**锁文件约定**：打开 `报告.docx` 时会在同目录生成隐藏文件
    `~$报告.docx`（文件名较长时会截掉前两个字符，故两种形态都查）。
    注意不能只用 open(path,'r+b') 判断有没有被 Word 打开——Word 以共享方式持有句柄，
    普通读写打开有时照样能成功（已实测确认），故以锁文件为主、写锁探测为辅。
    """
    try:
        folder = os.path.dirname(os.path.abspath(path))
        name = os.path.basename(path)
        # Word 的锁文件名规则：'~$' + 文件名（长文件名会截掉前两个字符，两种都查）
        candidates = {f"~${name}", f"~${name[2:]}" if len(name) > 2 else f"~${name}"}
        for cand in candidates:
            if os.path.exists(os.path.join(folder, cand)):
                return cand
    except Exception:
        # 探测本身不应影响主流程；探测失败就交给 Word 自己报错
        return ""
    return ""


# ============================================================
# 1. 打开 / 新建 Word
# ============================================================

@register_executor
class WordOpenExecutor(ModuleExecutor):
    """打开或新建 Word 文档"""

    @property
    def module_type(self) -> str:
        return "word_open"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        file_path = str(context.resolve_value(config.get("filePath", "")) or "").strip().strip('"')
        doc_key = str(context.resolve_value(config.get("docKey", "")) or "").strip() or "default"
        visible = _to_bool(config.get("visible", True), True)
        create_if_missing = _to_bool(config.get("createIfMissing", True), True)
        read_only = _to_bool(config.get("readOnly", False), False)
        # 文档被占用时的行为：readonly=自动只读打开（默认）/ fail=直接报错
        on_locked = str(context.resolve_value(config.get("onLocked", "readonly")) or "readonly").strip()

        try:
            _require_win32()

            # 打开已存在文件前先探测占用：文档被 Word/WPS 持有（或残留 ~$ 锁文件）时，
            # Documents.Open 会弹出「文件正被使用」模态框并把调用挂死到工作流超时。
            # 默认不硬失败，而是自动降级为只读打开——读取类流程（最常见用法）由此可
            # 直接跑通；确实需要可写打开的场景把 onLocked 设为 fail 即可显式报错。
            forced_readonly = False
            if file_path and os.path.isfile(file_path) and not read_only:
                lock_name = _detect_lock_file(file_path)
                if lock_name:
                    held = _is_file_write_locked(file_path)
                    cause = (
                        "文档正在 Word / WPS 中打开" if held
                        else f"疑似上次异常退出残留的锁文件（可手动删除同目录下的 {lock_name} 以恢复可写打开）"
                    )
                    if on_locked == "fail":
                        return ModuleResult(
                            success=False,
                            error=(
                                f"文档被占用，已按配置停止：{file_path}\n"
                                f"原因：{cause}（检测到锁文件 {lock_name}）\n"
                                "处置：关闭正在编辑该文档的 Word / WPS 窗口；"
                                "或在任务管理器结束 WINWORD.EXE / wps.exe；"
                                "或把「文档被占用时」改为「自动以只读方式打开」。"
                            ),
                        )
                    read_only = True
                    forced_readonly = True
                    context.add_log(
                        level="warning",
                        message=(
                            f"[Word] 检测到锁文件 {lock_name}，{cause}；"
                            "已自动改为只读打开以避免卡住（写入/保存类模块将无法生效）。"
                        ),
                    )

            def _start_engine():
                app, engine = _create_word_app(visible=visible)
                # 禁用宏安全提示，避免带宏文档弹框把自动化挂住
                try:
                    app.AutomationSecurity = 3  # msoAutomationSecurityForceDisable
                except Exception:
                    pass
                return app, engine

            def _open_document(app):
                if file_path and os.path.isfile(file_path):
                    # 显式传入抑制类参数：不做格式转换确认、不进最近列表、
                    # 传空密码使加密文档直接报错而非弹密码框挂住
                    try:
                        doc = app.Documents.Open(
                            FileName=os.path.abspath(file_path),
                            ConfirmConversions=False,
                            ReadOnly=bool(read_only),
                            AddToRecentFiles=False,
                            PasswordDocument="",
                            Revert=False,
                        )
                    except TypeError:
                        # 个别 WPS 版本不支持全部命名参数，退化为最简调用
                        doc = app.Documents.Open(
                            os.path.abspath(file_path), ReadOnly=bool(read_only)
                        )
                    return doc, "opened"
                if file_path and not create_if_missing:
                    raise WordError(
                        f"文件不存在：{file_path}（已关闭「文件不存在时新建」，故不自动创建）"
                    )
                doc = app.Documents.Add()
                # 指定了路径就先按该路径存一次，后续「保存Word」可直接保存
                if file_path:
                    folder = os.path.dirname(os.path.abspath(file_path))
                    if folder:
                        os.makedirs(folder, exist_ok=True)
                    _save_doc_as(doc, file_path)
                return doc, "created"

            # 关键：文档必须在它自己的专用线程里创建，并在整个会话期间都用该线程操作，
            # 否则后续模块换线程访问会因 COM 套间失效而报错（如 `Open.Content`）。
            worker = _WordWorker()
            try:
                # 分两步执行并各自记日志：卡住时能从日志直接看出是"启动引擎"慢
                # 还是"打开文档"被弹窗阻塞，便于定位。
                context.add_log(level="info", message="[Word] 正在启动 Word / WPS ...")
                app, engine = await worker.run(_start_engine)
                context.add_log(level="info", message=f"[Word] 引擎已就绪：{engine}，正在打开文档 ...")
                doc, mode = await worker.run(lambda: _open_document(app))
            except BaseException:
                # 必须用 BaseException：节点超时会以 asyncio.CancelledError 打断这里，
                # 只捕获 Exception 会漏掉取消场景，导致专用 COM 线程与 Word 进程泄漏。
                worker.close()
                raise
            actual_path = ""
            try:
                actual_path = await worker.run(lambda: doc.FullName)
            except Exception:
                actual_path = file_path
            _put_session(context, doc_key, app, doc, actual_path, worker, engine)

            action = "已打开" if mode == "opened" else "已新建"
            ro_note = "，只读（文档被占用已自动降级）" if forced_readonly else ""
            return ModuleResult(
                success=True,
                message=f"{action}文档：{actual_path or '(未命名)'}"
                        f"（引擎: {engine}，文档标识: {doc_key}{ro_note}）",
                data={
                    "docKey": doc_key, "path": actual_path, "mode": mode,
                    "engine": engine, "readOnly": read_only,
                },
            )
        except WordError as e:
            return ModuleResult(success=False, error=str(e))
        except Exception as e:
            return ModuleResult(success=False, error=f"打开/新建 Word 失败：{e}")


# ============================================================
# 2. Word 导出 PDF
# ============================================================

@register_executor
class WordToPdfExecutor(ModuleExecutor):
    """把 Word 文档导出为 PDF"""

    @property
    def module_type(self) -> str:
        return "word_to_pdf"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        doc_key = str(context.resolve_value(config.get("docKey", "")) or "").strip()
        source_path = str(context.resolve_value(config.get("filePath", "")) or "").strip().strip('"')
        output_path = str(context.resolve_value(config.get("outputPath", "")) or "").strip().strip('"')
        result_variable = (config.get("resultVariable") or "").strip()

        try:
            _require_win32()

            # 支持两种用法：① 导出已打开的文档 ② 直接给源文件路径独立导出
            if source_path:
                if not os.path.isfile(source_path):
                    return ModuleResult(success=False, error=f"源文件不存在：{source_path}")
                out = output_path or os.path.splitext(os.path.abspath(source_path))[0] + ".pdf"

                def _convert():
                    # 自动适配 Microsoft Word / WPS 文字
                    app, engine_used = _create_word_app(visible=False)
                    doc = None
                    try:
                        doc = app.Documents.Open(os.path.abspath(source_path), ReadOnly=True)
                        return _export_doc_pdf(doc, out), engine_used
                    finally:
                        try:
                            if doc is not None:
                                doc.Close(WD_DO_NOT_SAVE_CHANGES)
                        except Exception:
                            pass
                        try:
                            app.Quit()
                        except Exception:
                            pass

                pdf_path, engine = await _run_com(_convert)
            else:
                session = _get_session(context, doc_key)
                doc = session["doc"]
                base = session.get("path") or ""
                out = output_path or (os.path.splitext(base)[0] + ".pdf" if base else "")
                if not out:
                    return ModuleResult(
                        success=False,
                        error="未指定输出路径，且当前文档尚未保存到磁盘，无法推断 PDF 路径。请填写「输出PDF路径」。",
                    )

                def _export():
                    return _export_doc_pdf(doc, out)

                pdf_path = await _run_in_session(session, _export)
                engine = str(session.get("engine") or "")

            if result_variable:
                context.set_variable(result_variable, pdf_path)
            return ModuleResult(
                success=True,
                message=f"已导出 PDF：{pdf_path}" + (f"（引擎: {engine}）" if engine else ""),
                data={"pdfPath": pdf_path, "engine": engine},
            )
        except WordError as e:
            return ModuleResult(success=False, error=str(e))
        except Exception as e:
            return ModuleResult(success=False, error=f"Word 导出 PDF 失败：{e}")


# ============================================================
# 3. 读取 Word 文本
# ============================================================

@register_executor
class WordReadTextExecutor(ModuleExecutor):
    """读取 Word 文档文本（全文 / 指定段落 / 当前选区）"""

    @property
    def module_type(self) -> str:
        return "word_read_text"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        doc_key = str(context.resolve_value(config.get("docKey", "")) or "").strip()
        read_range = str(config.get("readRange", "all") or "all").strip()
        paragraph_index = _to_int(context.resolve_value(config.get("paragraphIndex", 1)), 1)
        result_variable = (config.get("resultVariable") or "word_text").strip() or "word_text"

        try:
            _require_win32()
            session = _get_session(context, doc_key)
            doc = session["doc"]

            def _read():
                if read_range == "paragraph":
                    total = doc.Paragraphs.Count
                    if paragraph_index < 1 or paragraph_index > total:
                        raise WordError(
                            f"段落序号 {paragraph_index} 超出范围（文档共 {total} 段，序号从 1 开始）"
                        )
                    return str(doc.Paragraphs(paragraph_index).Range.Text)
                if read_range == "selection":
                    return str(doc.Application.Selection.Text or "")
                if read_range == "paragraphs":
                    return [str(doc.Paragraphs(i + 1).Range.Text).rstrip("\r\x07")
                            for i in range(doc.Paragraphs.Count)]
                return str(doc.Content.Text)

            value = await _run_in_session(session, _read)
            if isinstance(value, str):
                # Word 段落结尾是 \r，统一成 \n 更符合用户预期
                value = value.replace("\r\x07", "\n").replace("\r", "\n")
            context.set_variable(result_variable, value)

            preview = value if isinstance(value, str) else f"{len(value)} 个段落"
            if isinstance(preview, str) and len(preview) > 80:
                preview = preview[:80] + "…"
            return ModuleResult(
                success=True,
                message=f"已读取 Word 文本 → 变量「{result_variable}」：{preview}",
                data={"variable": result_variable},
            )
        except WordError as e:
            return ModuleResult(success=False, error=str(e))
        except Exception as e:
            return ModuleResult(success=False, error=f"读取 Word 文本失败：{e}")


# ============================================================
# 4. 写入文本至 Word
# ============================================================

@register_executor
class WordWriteTextExecutor(ModuleExecutor):
    """在 Word 文档中写入文本（追加 / 光标处插入 / 覆盖全文）"""

    @property
    def module_type(self) -> str:
        return "word_write_text"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        doc_key = str(context.resolve_value(config.get("docKey", "")) or "").strip()
        text = str(context.resolve_value(config.get("text", "")) or "")
        write_mode = str(config.get("writeMode", "append") or "append").strip()
        new_paragraph = _to_bool(config.get("newParagraph", True), True)
        font_name = str(context.resolve_value(config.get("fontName", "")) or "").strip()
        font_size = _to_int(context.resolve_value(config.get("fontSize", 0)), 0)
        bold = _to_bool(config.get("bold", False), False)
        italic = _to_bool(config.get("italic", False), False)

        if text == "":
            return ModuleResult(success=False, error="写入内容不能为空")

        try:
            _require_win32()
            session = _get_session(context, doc_key)
            doc = session["doc"]

            def _write():
                content = text
                if write_mode == "replace_all":
                    doc.Content.Text = content
                    rng = doc.Content
                elif write_mode == "cursor":
                    sel = doc.Application.Selection
                    sel.TypeText(content)
                    if new_paragraph:
                        sel.TypeParagraph()
                    rng = sel.Range
                else:  # append 追加到文末
                    rng = doc.Content
                    rng.Collapse(0)  # wdCollapseEnd
                    rng.InsertAfter(content)
                    if new_paragraph:
                        rng.InsertParagraphAfter()
                # 统一应用字体样式（仅对本次写入的范围）
                try:
                    if font_name:
                        rng.Font.Name = font_name
                    if font_size > 0:
                        rng.Font.Size = font_size
                    if bold:
                        rng.Font.Bold = True
                    if italic:
                        rng.Font.Italic = True
                except Exception:
                    pass
                return True

            await _run_in_session(session, _write)
            mode_label = {"append": "追加到文末", "cursor": "在光标处插入", "replace_all": "覆盖全文"}.get(
                write_mode, write_mode
            )
            preview = text if len(text) <= 60 else text[:60] + "…"
            return ModuleResult(
                success=True,
                message=f"已{mode_label}写入文本：{preview}",
                data={"mode": write_mode, "length": len(text)},
            )
        except WordError as e:
            return ModuleResult(success=False, error=str(e))
        except Exception as e:
            return ModuleResult(success=False, error=f"写入 Word 文本失败：{e}")


# ============================================================
# 5. 定位 Word 光标
# ============================================================

@register_executor
class WordSetCursorExecutor(ModuleExecutor):
    """把光标定位到指定位置（文档开头/结尾、指定段落、查找到的文本处）"""

    @property
    def module_type(self) -> str:
        return "word_set_cursor"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        doc_key = str(context.resolve_value(config.get("docKey", "")) or "").strip()
        target = str(config.get("target", "doc_start") or "doc_start").strip()
        paragraph_index = _to_int(context.resolve_value(config.get("paragraphIndex", 1)), 1)
        find_text = str(context.resolve_value(config.get("findText", "")) or "")
        occurrence = _to_int(context.resolve_value(config.get("occurrence", 1)), 1)
        select_found = _to_bool(config.get("selectFound", False), False)

        try:
            _require_win32()
            session = _get_session(context, doc_key)
            doc = session["doc"]

            def _locate():
                app = doc.Application
                sel = app.Selection
                if target == "doc_start":
                    sel.HomeKey(WD_UNITS["story"])
                    return "文档开头"
                if target == "doc_end":
                    sel.EndKey(WD_UNITS["story"])
                    return "文档结尾"
                if target == "paragraph_start" or target == "paragraph_end":
                    total = doc.Paragraphs.Count
                    if paragraph_index < 1 or paragraph_index > total:
                        raise WordError(
                            f"段落序号 {paragraph_index} 超出范围（文档共 {total} 段，序号从 1 开始）"
                        )
                    rng = doc.Paragraphs(paragraph_index).Range
                    # 0=wdCollapseEnd, 1=wdCollapseStart
                    rng.Collapse(1 if target == "paragraph_start" else 0)
                    rng.Select()
                    return f"第 {paragraph_index} 段{'开头' if target == 'paragraph_start' else '结尾'}"
                if target == "find_text":
                    if not find_text:
                        raise WordError("定位方式为「查找文本」时，必须填写要查找的文本")
                    rng = doc.Content
                    found_count = 0
                    finder = rng.Find
                    finder.ClearFormatting()
                    finder.Text = find_text
                    finder.Forward = True
                    finder.Wrap = 0  # wdFindStop
                    finder.MatchCase = False
                    while finder.Execute():
                        found_count += 1
                        if found_count >= max(1, occurrence):
                            break
                    if found_count < max(1, occurrence):
                        raise WordError(
                            f"未找到第 {occurrence} 处「{find_text}」（实际只找到 {found_count} 处）"
                        )
                    if select_found:
                        rng.Select()
                    else:
                        rng.Collapse(0)  # 折叠到匹配文本之后
                        rng.Select()
                    return f"第 {occurrence} 处「{find_text}」{'（已选中）' if select_found else '之后'}"
                raise WordError(f"不支持的定位方式：{target}")

            where = await _run_in_session(session, _locate)
            return ModuleResult(
                success=True,
                message=f"光标已定位到：{where}",
                data={"target": target},
            )
        except WordError as e:
            return ModuleResult(success=False, error=str(e))
        except Exception as e:
            return ModuleResult(success=False, error=f"定位 Word 光标失败：{e}")


# ============================================================
# 6. 移动 Word 光标
# ============================================================

@register_executor
class WordMoveCursorExecutor(ModuleExecutor):
    """按单位移动光标（字符/单词/句/行/段落），可选同时选中经过的内容"""

    @property
    def module_type(self) -> str:
        return "word_move_cursor"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        doc_key = str(context.resolve_value(config.get("docKey", "")) or "").strip()
        unit = str(config.get("unit", "character") or "character").strip()
        count = _to_int(context.resolve_value(config.get("count", 1)), 1)
        direction = str(config.get("direction", "forward") or "forward").strip()
        extend = _to_bool(config.get("extendSelection", False), False)

        if unit not in WD_UNITS:
            return ModuleResult(
                success=False,
                error=f"不支持的移动单位：{unit}（可选：{'/'.join(WD_UNITS.keys())}）",
            )
        if count <= 0:
            return ModuleResult(success=False, error="移动数量必须大于 0")

        try:
            _require_win32()
            session = _get_session(context, doc_key)
            doc = session["doc"]
            wd_unit = WD_UNITS[unit]

            def _move():
                sel = doc.Application.Selection
                # Extend=1(wdExtend) 选中经过内容；0(wdMove) 仅移动光标
                extend_flag = 1 if extend else 0
                if direction == "backward":
                    moved = sel.MoveLeft(Unit=wd_unit, Count=count, Extend=extend_flag) \
                        if unit in ("character", "word") else \
                        sel.Move(Unit=wd_unit, Count=-count)
                else:
                    moved = sel.MoveRight(Unit=wd_unit, Count=count, Extend=extend_flag) \
                        if unit in ("character", "word") else \
                        sel.Move(Unit=wd_unit, Count=count)
                return int(moved or 0)

            moved = await _run_in_session(session, _move)
            dir_label = "向后" if direction == "backward" else "向前"
            unit_label = {
                "character": "字符", "word": "单词", "sentence": "句",
                "line": "行", "paragraph": "段落", "story": "整篇",
            }.get(unit, unit)
            return ModuleResult(
                success=True,
                message=f"光标已{dir_label}移动 {count} {unit_label}"
                        f"{'（并选中经过内容）' if extend else ''}",
                data={"unit": unit, "count": count, "moved": moved, "extend": extend},
            )
        except WordError as e:
            return ModuleResult(success=False, error=str(e))
        except Exception as e:
            return ModuleResult(success=False, error=f"移动 Word 光标失败：{e}")


# ============================================================
# 7. 替换 Word 文本
# ============================================================

@register_executor
class WordReplaceTextExecutor(ModuleExecutor):
    """查找并替换 Word 文档中的文本"""

    @property
    def module_type(self) -> str:
        return "word_replace_text"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        doc_key = str(context.resolve_value(config.get("docKey", "")) or "").strip()
        find_text = str(context.resolve_value(config.get("findText", "")) or "")
        replace_text = str(context.resolve_value(config.get("replaceText", "")) or "")
        replace_all = _to_bool(config.get("replaceAll", True), True)
        match_case = _to_bool(config.get("matchCase", False), False)
        match_whole_word = _to_bool(config.get("matchWholeWord", False), False)
        use_wildcards = _to_bool(config.get("useWildcards", False), False)
        result_variable = (config.get("resultVariable") or "").strip()

        if not find_text:
            return ModuleResult(success=False, error="查找内容不能为空")

        try:
            _require_win32()
            session = _get_session(context, doc_key)
            doc = session["doc"]

            def _replace():
                # 先统计出现次数（Find 会消耗 Range，故用独立 Range 计数）
                count_rng = doc.Content
                finder = count_rng.Find
                finder.ClearFormatting()
                finder.Replacement.ClearFormatting()
                finder.Text = find_text
                finder.Forward = True
                finder.Wrap = 0  # wdFindStop
                finder.MatchCase = bool(match_case)
                finder.MatchWholeWord = bool(match_whole_word)
                finder.MatchWildcards = bool(use_wildcards)
                occurrences = 0
                while finder.Execute():
                    occurrences += 1
                    if occurrences > 100000:  # 安全阀
                        break

                if occurrences == 0:
                    return 0

                # 执行替换：2=wdReplaceAll, 1=wdReplaceOne
                rep_rng = doc.Content
                f2 = rep_rng.Find
                f2.ClearFormatting()
                f2.Replacement.ClearFormatting()
                f2.Text = find_text
                f2.Replacement.Text = replace_text
                f2.Forward = True
                f2.Wrap = 0
                f2.MatchCase = bool(match_case)
                f2.MatchWholeWord = bool(match_whole_word)
                f2.MatchWildcards = bool(use_wildcards)
                f2.Execute(Replace=2 if replace_all else 1)
                return occurrences if replace_all else min(1, occurrences)

            replaced = await _run_in_session(session, _replace)
            if result_variable:
                context.set_variable(result_variable, replaced)

            if replaced == 0:
                return ModuleResult(
                    success=True,
                    message=f"未找到「{find_text}」，未做任何替换",
                    data={"replaced": 0},
                )
            return ModuleResult(
                success=True,
                message=f"已把「{find_text}」替换为「{replace_text}」，共 {replaced} 处",
                data={"replaced": replaced},
            )
        except WordError as e:
            return ModuleResult(success=False, error=str(e))
        except Exception as e:
            return ModuleResult(success=False, error=f"替换 Word 文本失败：{e}")


# ============================================================
# 8. 读取 Word 表格
# ============================================================

@register_executor
class WordReadTableExecutor(ModuleExecutor):
    """读取 Word 文档中的表格为二维数组（或字典列表）"""

    @property
    def module_type(self) -> str:
        return "word_read_table"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        doc_key = str(context.resolve_value(config.get("docKey", "")) or "").strip()
        table_index = _to_int(context.resolve_value(config.get("tableIndex", 1)), 1)
        first_row_as_header = _to_bool(config.get("firstRowAsHeader", False), False)
        result_variable = (config.get("resultVariable") or "word_table").strip() or "word_table"

        try:
            _require_win32()
            session = _get_session(context, doc_key)
            doc = session["doc"]

            def _read():
                total = doc.Tables.Count
                if total == 0:
                    raise WordError("当前文档中没有任何表格")
                if table_index < 1 or table_index > total:
                    raise WordError(
                        f"表格序号 {table_index} 超出范围（文档共 {total} 个表格，序号从 1 开始）"
                    )
                table = doc.Tables(table_index)
                rows = table.Rows.Count
                cols = table.Columns.Count
                data: list[list[str]] = []
                for r in range(1, rows + 1):
                    row_vals: list[str] = []
                    for c in range(1, cols + 1):
                        try:
                            raw = table.Cell(r, c).Range.Text or ""
                        except Exception:
                            # 合并单元格访问会抛异常，按空串处理保证整表能读完
                            raw = ""
                        # Word 单元格文本以 \r\x07 结尾，需要清理
                        row_vals.append(str(raw).replace("\r\x07", "").replace("\r", "\n").strip())
                    data.append(row_vals)
                return data, rows, cols

            data, rows, cols = await _run_in_session(session, _read)

            if first_row_as_header and len(data) >= 1:
                header = data[0]
                records = []
                for row in data[1:]:
                    item = {}
                    for i, key in enumerate(header):
                        item[key or f"列{i + 1}"] = row[i] if i < len(row) else ""
                    records.append(item)
                value: Any = records
            else:
                value = data

            context.set_variable(result_variable, value)
            return ModuleResult(
                success=True,
                message=f"已读取第 {table_index} 个表格（{rows} 行 × {cols} 列）→ 变量「{result_variable}」",
                data={"variable": result_variable, "rows": rows, "cols": cols},
            )
        except WordError as e:
            return ModuleResult(success=False, error=str(e))
        except Exception as e:
            return ModuleResult(success=False, error=f"读取 Word 表格失败：{e}")


# ============================================================
# 9. 插入 Word 表格
# ============================================================

@register_executor
class WordInsertTableExecutor(ModuleExecutor):
    """在光标处（或文末）插入表格，可用二维数组/字典列表填充数据"""

    @property
    def module_type(self) -> str:
        return "word_insert_table"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        doc_key = str(context.resolve_value(config.get("docKey", "")) or "").strip()
        data_source = config.get("tableData")
        rows_cfg = _to_int(context.resolve_value(config.get("rows", 0)), 0)
        cols_cfg = _to_int(context.resolve_value(config.get("cols", 0)), 0)
        position = str(config.get("position", "cursor") or "cursor").strip()
        with_border = _to_bool(config.get("withBorder", True), True)
        header_bold = _to_bool(config.get("headerBold", True), True)

        # 解析数据：支持变量名、JSON 字符串、二维数组、字典列表
        raw = context.resolve_value(data_source) if data_source is not None else None
        if isinstance(raw, str) and raw.strip():
            import json as _json
            try:
                raw = _json.loads(raw)
            except Exception:
                return ModuleResult(
                    success=False,
                    error="表格数据不是合法 JSON。请填写二维数组（如 [[\"A\",\"B\"],[1,2]]）"
                          "或字典列表，也可直接填写存有这些数据的变量名。",
                )

        matrix: list[list[str]] = []
        if isinstance(raw, list) and raw:
            if isinstance(raw[0], dict):
                headers = list(raw[0].keys())
                matrix.append([str(h) for h in headers])
                for item in raw:
                    matrix.append([str(item.get(h, "")) for h in headers])
            elif isinstance(raw[0], (list, tuple)):
                matrix = [[str(c) for c in row] for row in raw]
            else:
                matrix = [[str(c) for c in raw]]

        if matrix:
            rows = len(matrix)
            cols = max(len(r) for r in matrix)
        else:
            rows, cols = rows_cfg, cols_cfg
            if rows <= 0 or cols <= 0:
                return ModuleResult(
                    success=False,
                    error="未提供表格数据时，必须指定「行数」和「列数」（均需大于 0）",
                )

        try:
            _require_win32()
            session = _get_session(context, doc_key)
            doc = session["doc"]

            def _insert():
                if position == "end":
                    rng = doc.Content
                    rng.Collapse(0)  # wdCollapseEnd
                else:
                    rng = doc.Application.Selection.Range
                table = doc.Tables.Add(Range=rng, NumRows=rows, NumColumns=cols)
                if with_border:
                    try:
                        table.Borders.Enable = True
                    except Exception:
                        pass
                # 填充数据
                for r_i, row in enumerate(matrix, start=1):
                    for c_i, val in enumerate(row, start=1):
                        if r_i <= rows and c_i <= cols:
                            try:
                                table.Cell(r_i, c_i).Range.Text = val
                            except Exception:
                                pass
                if header_bold and matrix:
                    try:
                        table.Rows(1).Range.Font.Bold = True
                    except Exception:
                        pass
                return True

            await _run_in_session(session, _insert)
            where = "文末" if position == "end" else "光标处"
            return ModuleResult(
                success=True,
                message=f"已在{where}插入 {rows} 行 × {cols} 列表格"
                        f"{'并填充数据' if matrix else ''}",
                data={"rows": rows, "cols": cols, "filled": bool(matrix)},
            )
        except WordError as e:
            return ModuleResult(success=False, error=str(e))
        except Exception as e:
            return ModuleResult(success=False, error=f"插入 Word 表格失败：{e}")


# ============================================================
# 10. Word 插入图片
# ============================================================

@register_executor
class WordInsertImageExecutor(ModuleExecutor):
    """在光标处（或文末）插入图片，可指定宽高"""

    @property
    def module_type(self) -> str:
        return "word_insert_image"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        doc_key = str(context.resolve_value(config.get("docKey", "")) or "").strip()
        image_path = str(context.resolve_value(config.get("imagePath", "")) or "").strip().strip('"')
        position = str(config.get("position", "cursor") or "cursor").strip()
        width = _to_int(context.resolve_value(config.get("width", 0)), 0)
        height = _to_int(context.resolve_value(config.get("height", 0)), 0)
        center = _to_bool(config.get("center", False), False)

        if not image_path:
            return ModuleResult(success=False, error="图片路径不能为空")
        if not os.path.isfile(image_path):
            return ModuleResult(success=False, error=f"图片文件不存在：{image_path}")

        try:
            _require_win32()
            session = _get_session(context, doc_key)
            doc = session["doc"]

            def _insert():
                if position == "end":
                    rng = doc.Content
                    rng.Collapse(0)
                else:
                    rng = doc.Application.Selection.Range
                shape = doc.InlineShapes.AddPicture(
                    FileName=os.path.abspath(image_path),
                    LinkToFile=False,
                    SaveWithDocument=True,
                    Range=rng,
                )
                if width > 0:
                    shape.Width = width
                if height > 0:
                    shape.Height = height
                if center:
                    try:
                        shape.Range.ParagraphFormat.Alignment = 1  # wdAlignParagraphCenter
                    except Exception:
                        pass
                return True

            await _run_in_session(session, _insert)
            size_note = ""
            if width > 0 or height > 0:
                size_note = f"（宽 {width or '自动'} × 高 {height or '自动'}）"
            where = "文末" if position == "end" else "光标处"
            return ModuleResult(
                success=True,
                message=f"已在{where}插入图片：{os.path.basename(image_path)}{size_note}",
                data={"imagePath": os.path.abspath(image_path)},
            )
        except WordError as e:
            return ModuleResult(success=False, error=str(e))
        except Exception as e:
            return ModuleResult(success=False, error=f"插入 Word 图片失败：{e}")


# ============================================================
# 11. Word 插入超链接
# ============================================================

@register_executor
class WordInsertHyperlinkExecutor(ModuleExecutor):
    """在光标处（或文末）插入超链接"""

    @property
    def module_type(self) -> str:
        return "word_insert_hyperlink"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        doc_key = str(context.resolve_value(config.get("docKey", "")) or "").strip()
        address = str(context.resolve_value(config.get("address", "")) or "").strip()
        display_text = str(context.resolve_value(config.get("displayText", "")) or "").strip()
        screen_tip = str(context.resolve_value(config.get("screenTip", "")) or "").strip()
        position = str(config.get("position", "cursor") or "cursor").strip()

        if not address:
            return ModuleResult(success=False, error="超链接地址不能为空（如 https://... 或本地文件路径）")

        try:
            _require_win32()
            session = _get_session(context, doc_key)
            doc = session["doc"]

            def _insert():
                if position == "end":
                    rng = doc.Content
                    rng.Collapse(0)
                else:
                    rng = doc.Application.Selection.Range
                kwargs = {"Anchor": rng, "Address": address}
                if display_text:
                    kwargs["TextToDisplay"] = display_text
                if screen_tip:
                    kwargs["ScreenTip"] = screen_tip
                doc.Hyperlinks.Add(**kwargs)
                return True

            await _run_in_session(session, _insert)
            where = "文末" if position == "end" else "光标处"
            return ModuleResult(
                success=True,
                message=f"已在{where}插入超链接：{display_text or address} → {address}",
                data={"address": address, "displayText": display_text or address},
            )
        except WordError as e:
            return ModuleResult(success=False, error=str(e))
        except Exception as e:
            return ModuleResult(success=False, error=f"插入 Word 超链接失败：{e}")


# ============================================================
# 12. 保存 Word
# ============================================================

@register_executor
class WordSaveExecutor(ModuleExecutor):
    """保存 Word 文档（原地保存 或 另存为新路径）"""

    @property
    def module_type(self) -> str:
        return "word_save"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        doc_key = str(context.resolve_value(config.get("docKey", "")) or "").strip()
        save_as_path = str(context.resolve_value(config.get("saveAsPath", "")) or "").strip().strip('"')
        result_variable = (config.get("resultVariable") or "").strip()

        try:
            _require_win32()
            session = _get_session(context, doc_key)
            doc = session["doc"]

            def _save():
                if save_as_path:
                    folder = os.path.dirname(os.path.abspath(save_as_path))
                    if folder:
                        os.makedirs(folder, exist_ok=True)
                    _save_doc_as(doc, save_as_path)
                    return os.path.abspath(save_as_path)
                # 原地保存：从未保存过的新文档没有路径，必须要求另存为
                try:
                    full = str(doc.FullName or "")
                except Exception:
                    full = ""
                if not full or not os.path.isabs(full) or not full.lower().endswith((".doc", ".docx", ".docm")):
                    raise WordError(
                        "当前文档尚未保存到磁盘，无法原地保存。请填写「另存为路径」"
                        "（或在「打开/新建Word」模块里指定文件路径）。"
                    )
                doc.Save()
                return full

            path = await _run_in_session(session, _save)
            # 会话里的路径同步更新，后续导出 PDF 等可正确推断
            session["path"] = path
            if result_variable:
                context.set_variable(result_variable, path)
            return ModuleResult(
                success=True,
                message=f"已保存 Word 文档：{path}",
                data={"path": path},
            )
        except WordError as e:
            return ModuleResult(success=False, error=str(e))
        except Exception as e:
            return ModuleResult(success=False, error=f"保存 Word 文档失败：{e}")


# ============================================================
# 13. 关闭 Word
# ============================================================

@register_executor
class WordCloseExecutor(ModuleExecutor):
    """关闭 Word 文档并退出 Word 进程（可选择是否保存改动）"""

    @property
    def module_type(self) -> str:
        return "word_close"

    async def execute(self, config: dict, context: ExecutionContext) -> ModuleResult:
        doc_key = str(context.resolve_value(config.get("docKey", "")) or "").strip()
        save_changes = _to_bool(config.get("saveChanges", True), True)
        close_all = _to_bool(config.get("closeAll", False), False)

        try:
            _require_win32()

            if close_all:
                store = _sessions(context)
                if not store:
                    return ModuleResult(success=True, message="当前没有已打开的 Word 文档，无需关闭")
                keys = list(store.keys())

                # 每个文档都必须在它自己的 COM 线程里关闭，关完再回收该线程
                for k in keys:
                    s = store.get(k) or {}

                    def _close_one(_s=s):
                        try:
                            if _s.get("doc") is not None:
                                _s["doc"].Close(WD_SAVE_CHANGES if save_changes else WD_DO_NOT_SAVE_CHANGES)
                        except Exception:
                            pass
                        try:
                            if _s.get("app") is not None:
                                _s["app"].Quit()
                        except Exception:
                            pass
                        return True

                    worker = s.get("worker")
                    try:
                        if worker is not None:
                            await worker.run(_close_one)
                        else:
                            await _run_com(_close_one)
                    finally:
                        if worker is not None:
                            worker.close()
                store.clear()
                return ModuleResult(
                    success=True,
                    message=f"已关闭全部 {len(keys)} 个 Word 文档"
                            f"（{'已保存改动' if save_changes else '未保存改动'}）",
                    data={"closed": keys},
                )

            key, session = _pop_session(context, doc_key)
            doc = session.get("doc")
            app = session.get("app")
            worker = session.get("worker")

            def _close():
                try:
                    if doc is not None:
                        doc.Close(WD_SAVE_CHANGES if save_changes else WD_DO_NOT_SAVE_CHANGES)
                except Exception:
                    pass
                try:
                    if app is not None:
                        app.Quit()
                except Exception:
                    pass
                return True

            try:
                if worker is not None:
                    await worker.run(_close)
                else:
                    await _run_com(_close)
            finally:
                # 关闭完成后回收该文档独占的 COM 线程，避免线程泄漏
                if worker is not None:
                    worker.close()
            return ModuleResult(
                success=True,
                message=f"已关闭 Word 文档（标识: {key}，{'已保存改动' if save_changes else '未保存改动'}）",
                data={"docKey": key, "saved": save_changes},
            )
        except WordError as e:
            return ModuleResult(success=False, error=str(e))
        except Exception as e:
            return ModuleResult(success=False, error=f"关闭 Word 文档失败：{e}")


# ============================================================
# 工作流收尾：清理未关闭的 Word 会话
# ============================================================

async def cleanup_word_sessions(context: ExecutionContext) -> int:
    """关闭本次工作流遗留的所有 Word/WPS 文档并回收其 COM 线程，返回清理数量。

    由 WorkflowExecutor.cleanup() 调用。存在的意义：
    工作流若在中途失败/被停止/超时，就不会执行到「关闭Word」模块，
    残留的 Word/WPS 进程会一直占着文档文件，使下一次运行「打开/新建Word」
    因文件被占用而弹出模态框、把调用挂死到超时。这里做兜底收尾。

    注意：这里默认**保存改动**（与「关闭Word」的默认行为一致），避免用户
    辛苦写入的内容因为流程异常而丢失。
    """
    store = getattr(context, "_word_docs", None)
    if not store:
        return 0

    keys = list(store.keys())
    cleaned = 0
    for key in keys:
        session = store.pop(key, None) or {}
        doc = session.get("doc")
        app = session.get("app")
        worker = session.get("worker")

        def _close_one():
            try:
                if doc is not None:
                    doc.Close(WD_SAVE_CHANGES)
            except Exception:
                pass
            try:
                if app is not None:
                    app.Quit()
            except Exception:
                pass
            return True

        try:
            if worker is not None:
                # 加超时：COM 线程可能已被弹窗卡死，不能让收尾无限等待
                await asyncio.wait_for(worker.run(_close_one), timeout=20)
            else:
                await asyncio.wait_for(_run_com(_close_one), timeout=20)
            cleaned += 1
            print(f"[Word] 工作流结束，已自动关闭遗留文档: {key}")
        except Exception as e:
            print(f"[Word] 自动关闭遗留文档 {key} 失败（可能需手动结束 WINWORD.EXE/wps.exe）: {e}")
        finally:
            if worker is not None:
                worker.close()
    return cleaned
