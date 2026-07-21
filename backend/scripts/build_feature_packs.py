# -*- coding: utf-8 -*-
"""功能模块包构建器（发布方工具）

在一台装有「完整版 WebRPA」的机器上运行，把注册表（app/services/feature_packs.py）
定义的重资产载荷逐个打成 zip 功能包，供用户按需下载安装。

用法（项目根目录）：
    Python313\\python.exe backend\\scripts\\build_feature_packs.py            # 打全部包
    Python313\\python.exe backend\\scripts\\build_feature_packs.py ocr-paddle speech   # 只打指定包
    Python313\\python.exe backend\\scripts\\build_feature_packs.py --strip    # 打包后从本体删除载荷（生成瘦身核心版前执行）
    Python313\\python.exe backend\\scripts\\build_feature_packs.py --strip-only  # 只删载荷不打包（已在别处打好包、在目录副本上瘦身时用）
    Python313\\python.exe backend\\scripts\\build_feature_packs.py --list     # 仅列出各包的载荷与实际体积

输出：
    packaged/feature_packs/<id>-v<版本>.zip      功能包本体
    packaged/feature_packs/packs_index.json      索引清单（官网/网盘发布用）

发布流程建议：
    1. 在完整版目录跑本脚本（不带 --strip），得到全部功能包 zip；
    2. 复制一份完整目录，跑 `--strip` 删除全部载荷 → 得到瘦身核心目录；
    3. 核心目录打 7z 作为「WebRPA 核心包」，功能包 zip 单独上传，
       用户按需下载后在 编辑器 → 更多 → 功能模块包 里安装。
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
import time
import zipfile
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND.parent
sys.path.insert(0, str(BACKEND))

from app.services.feature_packs import (  # noqa: E402
    FEATURE_PACKS,
    PACK_FORMAT_VERSION,
    PACK_MANIFEST_NAME,
)

OUTPUT_DIR = PROJECT_ROOT / "packaged" / "feature_packs"


def read_webrpa_version() -> str:
    """从前端 package.json 读产品版本号"""
    try:
        pkg = json.loads((PROJECT_ROOT / "frontend" / "package.json").read_text(encoding="utf-8"))
        return str(pkg.get("version", "0.0.0"))
    except Exception:
        return "0.0.0"


def iter_payload_files(payload_paths: list[str]):
    """展开载荷路径为 (绝对文件路径, zip内相对路径) 序列"""
    for rel in payload_paths:
        src = PROJECT_ROOT / rel.rstrip("/")
        if not src.exists():
            print(f"    [跳过] 本机不存在: {rel}")
            continue
        if src.is_file():
            yield src, rel.rstrip("/")
        else:
            for f in src.rglob("*"):
                if f.is_file():
                    # __pycache__ 不进包（安装后首次运行会重建）
                    if "__pycache__" in f.parts:
                        continue
                    yield f, f.relative_to(PROJECT_ROOT).as_posix()


def payload_size_mb(payload_paths: list[str]) -> float:
    total = 0
    for f, _ in iter_payload_files(payload_paths):
        try:
            total += f.stat().st_size
        except OSError:
            pass
    return total / 1024 / 1024


def build_pack(pack, version: str) -> Path | None:
    out = OUTPUT_DIR / f"{pack.id}-v{version}.zip"
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    files = list(iter_payload_files(pack.payload_paths))
    if not files:
        print(f"  [跳过] {pack.id}: 本机没有任何载荷文件（可能已被拆走或未安装）")
        return None

    manifest = {
        "format": PACK_FORMAT_VERSION,
        "id": pack.id,
        "name": pack.name,
        "description": pack.description,
        "category": pack.category,
        "version": version,
        "built_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "file_count": len(files),
    }

    print(f"  打包 {pack.id}: {len(files)} 个文件 ...")
    with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        zf.writestr(PACK_MANIFEST_NAME, json.dumps(manifest, ensure_ascii=False, indent=2))
        for abs_path, arcname in files:
            zf.write(abs_path, arcname)

    size_mb = out.stat().st_size / 1024 / 1024
    print(f"  [完成] {out.name}  ({size_mb:.1f} MB)")
    return out


def strip_payload(pack) -> None:
    """从本体删除该包的载荷（构建瘦身核心版时用）"""
    for rel in pack.payload_paths:
        target = PROJECT_ROOT / rel.rstrip("/")
        if not target.exists():
            continue
        print(f"  [删除] {rel}")
        if target.is_dir():
            shutil.rmtree(target, ignore_errors=True)
        else:
            try:
                target.unlink()
            except OSError as e:
                print(f"    删除失败: {e}")


def main() -> int:
    parser = argparse.ArgumentParser(description="WebRPA 功能模块包构建器")
    parser.add_argument("packs", nargs="*", help="要构建的功能包 id（缺省为全部）")
    parser.add_argument("--strip", action="store_true",
                        help="打包后从本体删除载荷（在完整目录的副本上执行！）")
    parser.add_argument("--strip-only", action="store_true",
                        help="不打包，仅删除载荷（副本瘦身用，在完整目录的副本上执行！）")
    parser.add_argument("--list", action="store_true", help="仅列出载荷与体积，不打包")
    args = parser.parse_args()

    version = read_webrpa_version()
    selected = [p for p in FEATURE_PACKS if not args.packs or p.id in args.packs]
    unknown = set(args.packs) - {p.id for p in FEATURE_PACKS}
    if unknown:
        print(f"[错误] 未知功能包 id: {', '.join(sorted(unknown))}")
        print(f"可用: {', '.join(p.id for p in FEATURE_PACKS)}")
        return 2

    if args.list:
        print(f"{'ID':<18}{'实际体积':>12}    载荷")
        for p in selected:
            mb = payload_size_mb(p.payload_paths)
            print(f"{p.id:<18}{mb:>10.1f}MB    {', '.join(p.payload_paths[:3])}{' ...' if len(p.payload_paths) > 3 else ''}")
        return 0

    if args.strip_only:
        print(f"WebRPA 功能包构建器（仅瘦身模式）  目录={PROJECT_ROOT}")
        for pack in selected:
            strip_payload(pack)
        print("瘦身完成。")
        return 0

    print(f"WebRPA 功能包构建器  版本={version}  输出={OUTPUT_DIR}")
    index = []
    for pack in selected:
        out = build_pack(pack, version)
        if out is not None:
            index.append({
                "id": pack.id,
                "name": pack.name,
                "description": pack.description,
                "category": pack.category,
                "version": version,
                "filename": out.name,
                "size_bytes": out.stat().st_size,
                "recommended": pack.recommended,
                "module_categories": pack.module_categories,
            })
        if args.strip:
            strip_payload(pack)

    if index:
        idx_file = OUTPUT_DIR / "packs_index.json"
        idx_file.write_text(json.dumps(
            {"webrpa_version": version, "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
             "packs": index},
            ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"\n索引已生成: {idx_file}")

    print("完成。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
