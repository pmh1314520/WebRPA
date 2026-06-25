/**
 * 模块内置变量自动补全完整性审计测试（子系统 2 / 需求 2）
 *
 * 本文件以确定性结构断言核验 Property 4/5/6：
 *   - Property 4 内置变量纳入补全候选：对登记了内置变量的模块，
 *     collectNodeVarNames(type, data) 产出的全部变量名都应能被 ensureGlobalVariables
 *     收集进全局变量（global scope），一个都不丢失。
 *   - Property 5 补全候选去重且不覆盖同名：ensureGlobalVariables 对一组（可能含重复、
 *     含已存在同名）变量名收集后，全局变量中每个名字仅出现一次，且已存在的同名变量
 *     原值不被覆盖。
 *   - Property 6 内置变量字段在白名单内：findUnregisteredVarFields() 为空，
 *     即 MODULE_DEFAULT_VARS 中每个字段名都收录在 VARIABLE_NAME_FIELDS 白名单内。
 *
 * 数据源（单一真相，不重复维护并行清单）：
 *   - MODULE_DEFAULT_VARS / VARIABLE_NAME_FIELDS / collectNodeVarNames /
 *     findUnregisteredVarFields（moduleDefaultVars.ts）：内置变量与白名单唯一来源。
 *   - useWorkflowStore.ensureGlobalVariables（workflowStore）：模块创建时把自带变量
 *     写入 global scope 的真实逻辑（已存在同名跳过、绝不覆盖）。
 *
 * 注意：本任务（2.2）是「先红」核验工具。若 Property 6 暴露 findUnregisteredVarFields
 * 非空缺口属预期，修复在任务 2.3 进行——不在此处改 MODULE_DEFAULT_VARS 登记内容。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  MODULE_DEFAULT_VARS,
  VARIABLE_NAME_FIELDS,
  collectNodeVarNames,
  findUnregisteredVarFields,
  getModuleAllDefaultVars,
} from '@/lib/moduleDefaultVars'
import { useWorkflowStore } from '@/store/workflowStore'

/** 把 store 的变量表重置为空，保证各用例互不干扰。 */
function resetStoreVariables(): void {
  useWorkflowStore.setState({ variables: [] })
}

describe('模块内置变量补全审计 - Property 4/5/6', () => {
  beforeEach(() => {
    resetStoreVariables()
  })

  // Property 4: 内置变量纳入补全候选
  // 对任意登记了内置变量的模块 m，创建到画布后，collectNodeVarNames(m.type, m.data)
  // 的全部变量名都应 ⊆ 经 ensureGlobalVariables 收集得到的全局补全候选集合。
  // Validates: Requirements 2.2, 2.3
  it('Property 4: 每个登记内置变量的模块，其 collectNodeVarNames 产出都被全局补全候选完整收集', () => {
    const gaps: { type: string; missing: string[] }[] = []

    for (const moduleType of Object.keys(MODULE_DEFAULT_VARS)) {
      // 模拟「创建节点时连默认变量字段也已带值」的真实数据形态：
      // data 以 MODULE_DEFAULT_VARS 的字段=默认变量名填充，确保配置侧与默认侧都覆盖到。
      const data = getModuleAllDefaultVars(moduleType)
      const expectedNames = collectNodeVarNames(moduleType, data)

      // 复现模块创建路径：把这些变量名交给 ensureGlobalVariables 收集进全局候选。
      resetStoreVariables()
      useWorkflowStore.getState().ensureGlobalVariables(expectedNames)
      const collected = new Set(
        useWorkflowStore.getState().variables.map((v) => v.name),
      )

      const missing = expectedNames.filter((n) => !collected.has(n))
      if (missing.length > 0) {
        gaps.push({ type: moduleType, missing })
      }
    }

    expect(
      gaps,
      `存在内置变量未被全局补全候选收集（丢失）：\n${JSON.stringify(gaps, null, 2)}`,
    ).toEqual([])
  })

  it('Property 4b: collectNodeVarNames 同时收集默认变量名与配置侧自填变量名', () => {
    // 取一个登记了 indexVariable 的循环模块，验证：默认 index + 自填 customVar 都被收集。
    const moduleType = 'loop'
    const defaults = getModuleAllDefaultVars(moduleType) // { indexVariable: 'index' }
    const data = { ...defaults, indexVariable: 'my_index' }
    const names = collectNodeVarNames(moduleType, data)

    // 配置侧已填 'my_index'（覆盖默认），且仍包含 MODULE_DEFAULT_VARS 默认值 'index'。
    expect(names).toContain('my_index')
    expect(names).toContain('index')

    resetStoreVariables()
    useWorkflowStore.getState().ensureGlobalVariables(names)
    const collected = new Set(
      useWorkflowStore.getState().variables.map((v) => v.name),
    )
    for (const n of names) {
      expect(collected.has(n)).toBe(true)
    }
  })

  // Property 5: 补全候选去重且不覆盖同名
  // 补全候选集合内每个变量名仅出现一次；当工作流已存在同名全局变量时不重复创建、不覆盖原值。
  // Validates: Requirements 2.3
  it('Property 5a: ensureGlobalVariables 收集后全局变量名唯一（含重复输入也不产生重复条目）', () => {
    resetStoreVariables()
    // 故意传入含重复名的列表。
    useWorkflowStore
      .getState()
      .ensureGlobalVariables(['a', 'a', 'b', 'b', 'b', 'c'])

    const names = useWorkflowStore.getState().variables.map((v) => v.name)
    const unique = Array.from(new Set(names))
    expect(names.sort()).toEqual(unique.sort())
    expect(names.sort()).toEqual(['a', 'b', 'c'])
  })

  it('Property 5b: 已存在同名全局变量时不重复创建且不覆盖原值', () => {
    resetStoreVariables()
    // 预置一个已有值的同名全局变量。
    useWorkflowStore.setState({
      variables: [
        { name: 'index', value: 42, type: 'number', scope: 'global' },
      ],
    })

    // 模块创建路径再次尝试为 'index' 建立内置变量，并附带一个新变量 'item'。
    useWorkflowStore.getState().ensureGlobalVariables(['index', 'item'])

    const vars = useWorkflowStore.getState().variables
    const indexVars = vars.filter((v) => v.name === 'index')
    // 不重复创建：'index' 仅一条。
    expect(indexVars).toHaveLength(1)
    // 不覆盖原值：保留预置的 42 与 number 类型。
    expect(indexVars[0].value).toBe(42)
    expect(indexVars[0].type).toBe('number')
    // 新变量正常加入。
    expect(vars.some((v) => v.name === 'item')).toBe(true)
  })

  // Property 6: 内置变量字段在白名单内
  // MODULE_DEFAULT_VARS 中每个字段名都在 VARIABLE_NAME_FIELDS 白名单内，
  // 即 findUnregisteredVarFields() 为空。
  // Validates: Requirements 2.1, 2.5
  it('Property 6: MODULE_DEFAULT_VARS 的全部字段名都在 VARIABLE_NAME_FIELDS 白名单内', () => {
    const unregistered = findUnregisteredVarFields()

    expect(
      unregistered,
      `存在 MODULE_DEFAULT_VARS 字段名不在 VARIABLE_NAME_FIELDS 白名单内` +
        `（用户改填自定义变量名时补全/变量追踪会漏掉）：\n` +
        `${JSON.stringify(unregistered, null, 2)}`,
    ).toEqual([])
  })

  it('Property 6 前置：VARIABLE_NAME_FIELDS 白名单内无重复项', () => {
    const unique = Array.from(new Set(VARIABLE_NAME_FIELDS))
    expect(VARIABLE_NAME_FIELDS.length).toBe(unique.length)
  })
})
