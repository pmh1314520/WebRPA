# -*- coding: utf-8 -*-
"""执行器契约测试（注册表驱动）。

以 registry.get_all_types() 为唯一真相枚举全部 module_type，对每个执行器校验统一契约：
可实例化、module_type 为非空字符串且等于注册键、execute 为接收 (config, context) 的协程方法。

设计要点：
- 新增执行器模块会被 get_all_types() 自动纳入，无需修改本测试（注册表驱动）。
- 懒加载执行器若因可选第三方依赖缺失而加载失败，registry.get() 返回 None；这类归为
  skip（记录 module_type），不计为契约失败，避免因环境差异误报。
"""
import inspect

import pytest

import app.executors  # noqa: F401  导入触发执行器注册 / 启用懒加载清单
from app.executors.base import registry, ModuleExecutor

ALL_TYPES = sorted(registry.get_all_types())


@pytest.mark.contract
def test_registry_not_empty():
    assert len(ALL_TYPES) > 0, "执行器注册表为空，注册流程可能已损坏"


@pytest.mark.contract
def test_no_duplicate_types():
    # get_all_types 已合并去重，这里断言确无重复，防止注册逻辑回退
    assert len(ALL_TYPES) == len(set(ALL_TYPES)), "注册表存在重复的 module_type"


@pytest.mark.contract
@pytest.mark.parametrize("mtype", ALL_TYPES)
def test_executor_contract(mtype):
    inst = registry.get(mtype)
    if inst is None:
        # 懒加载失败（多为可选依赖缺失）：跳过并记录，不误报为契约失败
        pytest.skip(f"executor for '{mtype}' failed to load (likely optional dependency missing)")

    assert isinstance(inst, ModuleExecutor), f"{mtype} 的实例不是 ModuleExecutor 子类"

    mt = inst.module_type
    assert isinstance(mt, str) and mt.strip(), f"{mtype} 的 module_type 非空字符串校验失败"
    assert mt == mtype, f"{mtype} 的 module_type 属性({mt})与注册键不一致"

    execute = getattr(inst, "execute", None)
    assert callable(execute), f"{mtype} 缺少可调用的 execute 方法"
    assert inspect.iscoroutinefunction(execute), f"{mtype} 的 execute 不是协程函数"

    # execute 至少接收 (config, context) 两个参数（self 不计入绑定方法签名）
    params = list(inspect.signature(execute).parameters.values())
    assert len(params) >= 2, f"{mtype} 的 execute 形参不足 (config, context)"
