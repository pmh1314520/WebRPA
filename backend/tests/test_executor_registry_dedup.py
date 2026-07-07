# -*- coding: utf-8 -*-
"""执行器注册唯一性 —— 缺陷 spec: executor-duplicate-registration

任务 1（探索性缺陷验证）：证明存在同一 module_type 被多个源模块重复注册的缺陷，
建立治理基线。任务 9 完成后，test_no_duplicate_module_type_registrations 应转绿。

判定"重复"的依据：遍历所有 ModuleExecutor 子类，按其 module_type 归组，
统计每个 module_type 由多少个不同的源模块（文件）定义。>= 2 即为重复注册。
这比读注册表更可靠——注册表 last-write-wins 只保留赢家，看不到"另一份"。
"""
import importlib
from collections import defaultdict


def _import_all_submodules():
    """强制全量导入所有执行器子模块（无论当前是懒加载还是全量），确保所有类都加载。"""
    import app.executors as ex
    for sub in ex._SUBMODULES:
        try:
            importlib.import_module(f"app.executors.{sub}")
        except Exception as e:  # noqa: BLE001 - 记录但不中断扫描
            print(f"[dedup-scan] 导入子模块 {sub} 失败: {e}")


def find_duplicate_registrations() -> dict[str, list[str]]:
    """返回 { module_type: [实际注册来源模块短名, ...] }，仅含被 >= 2 个不同源模块**注册**的类型。

    关键：以"实际调用 register() 的来源"为准（registry._registration_sources），而非"类是否定义"。
    移除休眠副本的 @register_executor 后，该副本不再 register，其来源即从集合消失。
    强制全量导入所有子模块，确保仍存在的重复注册都会被触发。
    """
    _import_all_submodules()
    from app.executors import registry
    out: dict[str, list[str]] = {}
    for mt, sources in registry._registration_sources.items():
        shorts = sorted(s.rsplit(".", 1)[-1] for s in sources)
        if len(set(shorts)) > 1:
            out[mt] = shorts
    return out


def test_no_duplicate_module_type_registrations():
    """验收测试（任务 9 后应转绿）：不应存在被多个源模块重复注册的 module_type。

    未修复代码上此断言会失败，失败信息即完整的重复清单（治理基线）。"""
    dups = find_duplicate_registrations()
    detail = "\n".join(f"  {t}: {mods}" for t, mods in sorted(dups.items()))
    assert not dups, (
        f"存在 {len(dups)} 个被多个源模块重复注册的 module_type（last-write-wins 隐患）：\n{detail}"
    )


def test_real_keyboard_effective_has_window_activation():
    """已修复项锚点：real_keyboard 生效实现必须具备窗口激活能力（issue #42），治理时不得回退。"""
    _import_all_submodules()
    from app.executors import registry
    ex = registry.get("real_keyboard")
    assert ex is not None, "real_keyboard 执行器缺失"
    assert hasattr(ex.__class__, "_activate_window_by_title"), (
        "real_keyboard 生效实现缺少 _activate_window_by_title（窗口激活），可能回退到劣质副本"
    )


# ============================================================================
# 任务 2.3：注册唯一性检查单元测试
# ============================================================================
import pytest
import app.executors.base as base
from app.executors.base import ExecutorRegistry, ModuleExecutor


def _make_executor(module_type: str, source_module: str):
    """构造一个 module_type 与来源模块可控的临时执行器类。"""
    class _Dummy(ModuleExecutor):
        @property
        def module_type(self):
            return module_type

        async def execute(self, config, context):  # pragma: no cover - 不实际执行
            return None

    _Dummy.__module__ = source_module
    return _Dummy


def test_duplicate_diff_source_raises_in_strict(monkeypatch):
    """白名单外、来源不同的重复注册，严格模式下应报错（Fail-Fast）。"""
    monkeypatch.setenv("WEBRPA_STRICT_REGISTRY", "1")
    monkeypatch.setattr(base, "_KNOWN_DUPLICATES", set())
    reg = ExecutorRegistry()
    reg.register(_make_executor("dup_x", "app.executors.mod_a"))
    with pytest.raises(RuntimeError):
        reg.register(_make_executor("dup_x", "app.executors.mod_b"))


def test_duplicate_diff_source_warns_and_overwrites_by_default(monkeypatch, capsys):
    """默认（告警模式）：来源不同的重复注册不报错，打印告警且仍 last-write-wins。"""
    monkeypatch.delenv("WEBRPA_STRICT_REGISTRY", raising=False)
    monkeypatch.setattr(base, "_KNOWN_DUPLICATES", set())
    reg = ExecutorRegistry()
    reg.register(_make_executor("dup_y", "app.executors.mod_a"))
    reg.register(_make_executor("dup_y", "app.executors.mod_b"))  # 不应抛错
    out = capsys.readouterr().out
    assert "重复注册" in out and "dup_y" in out
    assert reg.get("dup_y").__class__.__module__ == "app.executors.mod_b"  # 后者生效


def test_same_source_reregister_allowed_even_strict(monkeypatch):
    """同一来源模块重复注册（重复 import / 热重载）不视为冲突，严格模式也放行。"""
    monkeypatch.setenv("WEBRPA_STRICT_REGISTRY", "1")
    monkeypatch.setattr(base, "_KNOWN_DUPLICATES", set())
    reg = ExecutorRegistry()
    reg.register(_make_executor("dup_z", "app.executors.mod_a"))
    reg.register(_make_executor("dup_z", "app.executors.mod_a"))  # 同源，不应抛错


def test_whitelisted_duplicate_silent_in_strict(monkeypatch):
    """白名单内的重复（治理期已知）即使严格模式也静默放行，不报错。"""
    monkeypatch.setenv("WEBRPA_STRICT_REGISTRY", "1")
    monkeypatch.setattr(base, "_KNOWN_DUPLICATES", {"dup_w"})
    reg = ExecutorRegistry()
    reg.register(_make_executor("dup_w", "app.executors.mod_a"))
    reg.register(_make_executor("dup_w", "app.executors.mod_b"))  # 白名单内，不应抛错


def test_empty_whitelist_new_duplicate_raises_in_strict(monkeypatch):
    """治理完成后（白名单为空），任何新引入的重复在严格模式下立即报错（防复发最终防线）。"""
    monkeypatch.setenv("WEBRPA_STRICT_REGISTRY", "1")
    monkeypatch.setattr(base, "_KNOWN_DUPLICATES", set())
    reg = ExecutorRegistry()
    reg.register(_make_executor("brand_new", "app.executors.mod_a"))
    with pytest.raises(RuntimeError):
        reg.register(_make_executor("brand_new", "app.executors.mod_b"))


# ============================================================================
# 任务 7/8：加载一致性 + 保持性回归（类型集合完整、被保留实现来源正确）
# ============================================================================
# 本次治理消除的 42 个运行时重复类型（生效方均为拆分/专用模块，休眠副本已移除注册）
_DEDUPED_TYPES = [
    "add_subtitle", "add_watermark", "adjust_volume", "audio_to_text", "compress_image",
    "compress_video", "copy_file", "delete_file", "download_file", "drag_element",
    "extract_audio", "extract_frame", "face_recognition", "format_convert", "get_mouse_position",
    "get_time", "hover_image", "image_grayscale", "image_ocr", "image_round_corners",
    "keyboard_action", "list_files", "merge_media", "move_file", "qr_decode", "qr_generate",
    "real_keyboard", "real_mouse_click", "real_mouse_drag", "real_mouse_move", "real_mouse_scroll",
    "rename_file", "resize_video", "rotate_video", "save_image", "screen_record", "scroll_page",
    "select_dropdown", "set_checkbox", "trim_video", "upload_file", "video_speed",
]


def test_all_types_resolvable():
    """保持性：get_all_types() 中每个类型都能 get() 到可用执行器实例（类型集合无遗漏）。"""
    _import_all_submodules()
    from app.executors import registry
    bad = [t for t in registry.get_all_types() if not isinstance(registry.get(t), ModuleExecutor)]
    assert not bad, f"以下类型无法解析到执行器实例：{bad}"


def test_deduped_types_still_available():
    """保持性：42 个被去重的类型全部仍可用（其生效实现未被误删）。"""
    _import_all_submodules()
    from app.executors import registry
    missing = [t for t in _DEDUPED_TYPES if not isinstance(registry.get(t), ModuleExecutor)]
    assert not missing, f"以下被去重类型丢失了可用实现：{missing}"


def test_effective_impls_are_expected_split_modules():
    """Property 1：关键去重类型的生效实现来自更优的拆分/专用模块（未回退到旧巨型文件副本）。"""
    _import_all_submodules()
    from app.executors import registry
    expect = {
        "real_keyboard": "advanced_keyboard",
        "select_dropdown": "advanced_browser",
        "upload_file": "advanced_browser",
        "drag_element": "advanced_browser",
        "set_checkbox": "advanced_browser",
        "real_mouse_click": "advanced_mouse",
        "get_time": "basic_variable",
        "format_convert": "media_convert",
        "merge_media": "media_video_edit",
        "qr_generate": "media_qrcode",
    }
    wrong = {}
    for t, mod in expect.items():
        ex = registry.get(t)
        src = ex.__class__.__module__.rsplit(".", 1)[-1] if ex else None
        if src != mod:
            wrong[t] = f"期望 {mod}，实际 {src}"
    assert not wrong, f"生效实现来源不符：{wrong}"
