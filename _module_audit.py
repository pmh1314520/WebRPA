# -*- coding: utf-8 -*-
"""系统审计：在"打包同款"环境(WEBRPA_PACKAGED=1, 无服务器/无前端)下,
强制导入全部执行器子模块,确认每个内置模块的执行器都能加载并注册。用完即删。"""
import sys, os
os.environ["WEBRPA_PACKAGED"] = "1"
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

import io
import contextlib

import app.executors as ex

# 强制全量导入所有执行器子模块,捕获每个子模块的导入失败
buf = io.StringIO()
failures = []
before_types = set(ex.registry.get_all_types())
for sub in ex._SUBMODULES:
    import importlib
    try:
        with contextlib.redirect_stdout(buf):
            importlib.import_module(f"app.executors.{sub}")
    except Exception as e:
        failures.append((sub, str(e)))

types = sorted(ex.registry.get_all_types())
print(f"执行器子模块总数: {len(ex._SUBMODULES)}")
print(f"已注册模块类型总数: {len(types)}")
print(f"导入失败子模块数: {len(failures)}")
for sub, err in failures:
    print(f"  [FAIL] {sub}: {err[:120]}")

# 校验每个已注册类型都能取到执行器实例
missing = [t for t in types if ex.registry.get(t) is None]
print(f"已注册但取不到执行器的类型数: {len(missing)}")
for t in missing[:20]:
    print(f"  [NO-EXEC] {t}")

print("AUDIT_OK" if not failures and not missing else "AUDIT_HAS_ISSUES")
