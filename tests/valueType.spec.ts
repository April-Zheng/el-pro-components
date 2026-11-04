import { describe, expect, it } from 'vitest'
import { resolveCell } from '../src/core/valueType'

describe('valueType 读态格式化（P1 #6 / #7 / #8 回归）', () => {
  it('percent 默认 2 位小数（对齐 React）', () => {
    expect(resolveCell({ value: 33.33, valueType: 'percent' }).text).toBe('33.33%')
    expect(resolveCell({ value: 50, valueType: 'percent' }).text).toBe('50.00%')
  })

  it('percent 支持 precision / showSymbol / showColor', () => {
    const cell = resolveCell({
      value: 12.3,
      valueType: 'percent',
      fieldProps: { precision: 1, showSymbol: true, showColor: true },
    })
    expect(cell.text).toBe('+12.3%')
    expect(cell.textColor).toBe('var(--el-color-danger)')

    const down = resolveCell({
      value: -5,
      valueType: 'percent',
      fieldProps: { showColor: true },
    })
    expect(down.textColor).toBe('var(--el-color-success)')
  })

  it('money 默认 ¥ + 2 位千分位，可配 precision / customSymbol / moneySymbol', () => {
    expect(resolveCell({ value: 12345.6, valueType: 'money' }).text).toBe('¥12,345.60')
    expect(
      resolveCell({ value: 12345.6, valueType: 'money', fieldProps: { precision: 0 } }).text,
    ).toBe('¥12,346')
    expect(
      resolveCell({ value: 9, valueType: 'money', fieldProps: { customSymbol: '$' } }).text,
    ).toBe('$9.00')
    expect(
      resolveCell({ value: 9, valueType: 'money', fieldProps: { moneySymbol: false } }).text,
    ).toBe('9.00')
  })

  it('code 读态返回 code 块，jsonCode 对对象 pretty-print', () => {
    const code = resolveCell({ value: 'const a = 1', valueType: 'code' })
    expect(code.kind).toBe('code')
    expect(code.codeText).toBe('const a = 1')

    const json = resolveCell({ value: { a: 1 }, valueType: 'jsonCode' })
    expect(json.kind).toBe('code')
    expect(json.codeText).toBe('{\n  "a": 1\n}')
  })
})
