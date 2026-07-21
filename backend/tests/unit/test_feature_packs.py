# -*- coding: utf-8 -*-
"""功能模块包体系单元测试：清单校验 / 安全防御 / 注册表一致性 / ImportError 映射"""
import json
import zipfile

import pytest

from app.services import feature_packs as fp


# ---------- 注册表一致性 ----------

def test_pack_ids_unique():
    ids = [p.id for p in fp.FEATURE_PACKS]
    assert len(ids) == len(set(ids)), "功能包 id 重复"


def test_payload_paths_within_whitelist():
    """每个包的载荷路径必须落在安装白名单内（否则打出的包自己都装不上）"""
    for pack in fp.FEATURE_PACKS:
        for rel in pack.payload_paths:
            norm = fp._normalize_member(rel.rstrip("/") if not rel.endswith("/") else rel)
            # 目录载荷补一个虚拟文件名来测试前缀匹配
            probe = norm + "/x" if rel.endswith("/") else norm
            assert fp._member_allowed(fp._normalize_member(probe)), \
                f"{pack.id} 的载荷 {rel} 不在安装白名单内"


def test_import_mapping():
    pack = fp.pack_for_import("paddleocr")
    assert pack is not None and pack.id == "ocr-paddle"
    assert fp.pack_for_import("torch.nn") is not None  # 子模块名也能映射
    assert fp.pack_for_import("json") is None  # 标准库不映射


def test_hint_for_import_error():
    err = ModuleNotFoundError("No module named 'playwright'", name="playwright")
    hint = fp.hint_for_import_error(err)
    assert "功能模块包" in hint and "web-automation" in hint
    # 与功能包无关的缺包不产生提示
    assert fp.hint_for_import_error(ModuleNotFoundError("No module named 'xyz'", name="xyz")) == ""


# ---------- 安装安全防御 ----------

def _make_zip(tmp_path, entries: dict, manifest: dict | None = None):
    z = tmp_path / "pack.zip"
    with zipfile.ZipFile(z, "w") as zf:
        if manifest is not None:
            zf.writestr(fp.PACK_MANIFEST_NAME, json.dumps(manifest))
        for name, content in entries.items():
            zf.writestr(name, content)
    return z


def test_install_rejects_missing_manifest(tmp_path):
    z = _make_zip(tmp_path, {"backend/scrcpy/a.txt": "x"}, manifest=None)
    with pytest.raises(fp.PackInstallError, match="缺少"):
        fp.install_pack_from_zip(z)


def test_install_rejects_path_traversal(tmp_path):
    z = _make_zip(tmp_path, {"../../evil.txt": "x"}, manifest={"format": 1, "id": "evil"})
    with pytest.raises(fp.PackInstallError, match="路径穿越"):
        fp.install_pack_from_zip(z)


def test_install_rejects_non_whitelisted_target(tmp_path):
    z = _make_zip(tmp_path, {"backend/app/main.py": "pwned"},
                  manifest={"format": 1, "id": "evil"})
    with pytest.raises(fp.PackInstallError, match="白名单"):
        fp.install_pack_from_zip(z)


def test_install_rejects_newer_format(tmp_path):
    z = _make_zip(tmp_path, {"backend/scrcpy/a.txt": "x"},
                  manifest={"format": 999, "id": "future"})
    with pytest.raises(fp.PackInstallError, match="版本过新"):
        fp.install_pack_from_zip(z)


def test_safe_to_delete_guards():
    assert fp._safe_to_delete("backend/scrcpy/scrcpy.exe")
    assert fp._safe_to_delete("Python313/Lib/site-packages/torch/version.py")
    assert not fp._safe_to_delete("backend/app/main.py")
    assert not fp._safe_to_delete("../outside.txt")
    assert not fp._safe_to_delete("WebRPAConfig.json")


# ---------- 状态列举 ----------

def test_list_packs_shape():
    packs = fp.list_packs()
    assert len(packs) == len(fp.FEATURE_PACKS)
    for d in packs:
        assert {"id", "name", "description", "category", "size_mb", "installed"} <= set(d.keys())
        assert isinstance(d["installed"], bool)


# ---------- 运行前预检 ----------

def test_requirement_tables_reference_known_packs():
    """需求表里引用的功能包 id 必须真实存在于注册表"""
    known = {p.id for p in fp.FEATURE_PACKS}
    for table in (fp.SUBMODULE_PACK_REQUIREMENTS, fp.TYPE_PACK_REQUIREMENTS):
        for key, groups in table.items():
            for group in groups:
                for pid in group:
                    assert pid in known, f"{key} 引用了未注册的功能包 {pid}"


def test_submodule_requirements_reference_real_submodules():
    """子模块级需求表的 key 必须是真实存在的执行器子模块"""
    from app.executors import _SUBMODULES
    for sub in fp.SUBMODULE_PACK_REQUIREMENTS:
        assert sub in _SUBMODULES, f"{sub} 不在执行器子模块清单中"


def test_requirements_for_type_resolution():
    """类型级覆盖优先；子模块级兜底；未登记类型无需求"""
    assert fp.requirements_for_type("click_text") == [["ocr-paddle", "ocr-easyocr"], ["web-automation"]]
    assert fp.requirements_for_type("phone_tap") == [["phone-adb"]]      # 经 type->submodule 映射
    assert fp.requirements_for_type("open_page") == [["web-automation"]]
    assert fp.requirements_for_type("wait") == []                        # 纯等待，无需求
    assert fp.requirements_for_type("set_variable") == []                # 核心能力
    assert fp.requirements_for_type("group") == []                       # 结构节点
    assert fp.requirements_for_type("__unknown_type__") == []


def test_preflight_all_installed(monkeypatch):
    monkeypatch.setattr(fp, "is_pack_installed", lambda p: True)
    result = fp.preflight_check(["open_page", "phone_tap", "click_text"])
    assert result["ok"] and result["missing"] == []


def test_preflight_reports_missing_with_alternatives(monkeypatch):
    monkeypatch.setattr(fp, "is_pack_installed", lambda p: False)
    result = fp.preflight_check(["open_page", "phone_tap", "click_text", "wait", "set_variable"])
    assert not result["ok"]
    groups = {tuple(a["id"] for a in m["alternatives"]): m["module_types"] for m in result["missing"]}
    assert ("web-automation",) in groups
    assert ("phone-adb",) in groups
    assert ("ocr-paddle", "ocr-easyocr") in groups          # OCR 二选一以"或"呈现
    assert "open_page" in groups[("web-automation",)]
    assert "click_text" in groups[("web-automation",)]      # click_text 同时需要浏览器
    # 无需求类型绝不进缺失清单
    for types in groups.values():
        assert "wait" not in types and "set_variable" not in types
    # 错误文案可读且含安装指引
    msg = fp.format_preflight_error(result, {"open_page": "打开网页"})
    assert "功能模块包" in msg and "打开网页" in msg and "phone-adb" in msg


def test_preflight_partial_alternative_satisfied(monkeypatch):
    """OCR 二选一：装了 easyocr 就不再要求 paddle"""
    monkeypatch.setattr(
        fp, "is_pack_installed",
        lambda p: p.id in ("ocr-easyocr", "web-automation"))
    result = fp.preflight_check(["click_text"])
    assert result["ok"], result
