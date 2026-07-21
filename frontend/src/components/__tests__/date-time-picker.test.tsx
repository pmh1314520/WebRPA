/**
 * TimePicker / DatePicker 交互回归测试
 *
 * 背景：用户反馈定时任务的执行时间选择器"鼠标点击不能选择，只能按回车"。
 * 根因是旧实现在自绘 Popover 里嵌套 Radix Select（Portal 到 body），
 * Popover 的 mousedown 外点关闭逻辑会在点击下拉选项时抢先卸载整个面板。
 * 新实现改为滚动列直选按钮，本测试锁定"鼠标点击即可选中"的行为。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { TimePicker, DatePicker } from '@/components/ui/date-time-picker'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

/** 模拟一次真实的鼠标点击（mousedown → mouseup → click），复现外点关闭竞态 */
function realClick(el: Element) {
  act(() => {
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

/** 找到带指定表头（时/分/秒）的滚动列容器 */
function findColumn(scope: HTMLElement, label: string): HTMLElement {
  const headers = Array.from(scope.querySelectorAll('div')).filter(
    (d) => d.textContent === label && d.className.includes('text-center')
  )
  expect(headers.length).toBeGreaterThan(0)
  return headers[0].parentElement as HTMLElement
}

/** 在列内点击指定数字按钮 */
function clickNumber(column: HTMLElement, num: string) {
  const btn = Array.from(column.querySelectorAll('button')).find((b) => b.textContent === num)
  expect(btn, `列中应存在数字按钮 ${num}`).toBeTruthy()
  realClick(btn!)
}

describe('TimePicker', () => {
  it('鼠标点击（含 mousedown）即可选中，面板不被外点逻辑误关', () => {
    const onChange = vi.fn()
    act(() => {
      root.render(<TimePicker withSeconds value="08:00:00" onChange={onChange} />)
    })

    // 打开弹层
    const trigger = Array.from(container.querySelectorAll('span')).find(
      (s) => s.textContent === '08:00:00'
    )!
    realClick(trigger)

    // 三列（小时/分/秒）都应渲染
    const body = document.body as HTMLElement
    const hourCol = findColumn(body, '小时')
    const minuteCol = findColumn(body, '分')
    const secondCol = findColumn(body, '秒')
    expect(hourCol && minuteCol && secondCol).toBeTruthy()

    // 用真实鼠标事件序列点击"时"列的 15 —— 旧实现在 mousedown 阶段就把面板卸载导致选不中
    clickNumber(hourCol, '15')
    expect(onChange).toHaveBeenLastCalledWith('15:00:00')

    // 点击后面板应仍然挂载（可继续选分/秒）
    expect(document.body.contains(hourCol)).toBe(true)

    clickNumber(minuteCol, '30')
    expect(onChange).toHaveBeenLastCalledWith('08:30:00')

    clickNumber(secondCol, '45')
    expect(onChange).toHaveBeenLastCalledWith('08:00:45')
  })

  it('不带秒时输出 HH:MM 格式', () => {
    const onChange = vi.fn()
    act(() => {
      root.render(<TimePicker value="08:00" onChange={onChange} />)
    })
    const trigger = Array.from(container.querySelectorAll('span')).find(
      (s) => s.textContent === '08:00'
    )!
    realClick(trigger)
    clickNumber(findColumn(document.body as HTMLElement, '小时'), '23')
    expect(onChange).toHaveBeenLastCalledWith('23:00')
  })

  it('非法/越界值被钳制到合法区间', () => {
    const onChange = vi.fn()
    act(() => {
      root.render(<TimePicker withSeconds value="99:xx:70" onChange={onChange} />)
    })
    const trigger = Array.from(container.querySelectorAll('span')).find(
      (s) => s.textContent === '99:xx:70'
    )!
    realClick(trigger)
    // 时=99→23 分=xx→0 秒=70→59；点击时列的 10，其余位应输出钳制后的合法值
    clickNumber(findColumn(document.body as HTMLElement, '小时'), '10')
    expect(onChange).toHaveBeenLastCalledWith('10:00:59')
  })

  it('点击"此刻"填充当前时间', () => {
    const onChange = vi.fn()
    act(() => {
      root.render(<TimePicker withSeconds value="00:00:00" onChange={onChange} />)
    })
    const trigger = Array.from(container.querySelectorAll('span')).find(
      (s) => s.textContent === '00:00:00'
    )!
    realClick(trigger)
    const nowBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent === '此刻'
    )!
    const before = new Date()
    realClick(nowBtn)
    const after = new Date()
    expect(onChange).toHaveBeenCalled()
    const v = onChange.mock.calls[onChange.mock.calls.length - 1][0] as string
    expect(v).toMatch(/^\d{2}:\d{2}:\d{2}$/)
    const hour = Number(v.slice(0, 2))
    expect(hour === before.getHours() || hour === after.getHours()).toBe(true)
  })
})

describe('DatePicker', () => {
  it('鼠标点击日期即可选中并回填 YYYY-MM-DD', () => {
    const onChange = vi.fn()
    act(() => {
      root.render(<DatePicker value="2026-07-01" onChange={onChange} />)
    })
    const trigger = Array.from(container.querySelectorAll('span')).find(
      (s) => s.textContent === '2026-07-01'
    )!
    realClick(trigger)
    const dayBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent === '15' && b.className.includes('h-7')
    )!
    realClick(dayBtn)
    expect(onChange).toHaveBeenLastCalledWith('2026-07-15')
  })
})
