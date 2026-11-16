import { describe, expect, it } from 'vitest'
import { reactive, ref } from 'vue'
import { deepToRaw, cloneDraft } from '../src/core/deepToRaw'

/**
 * bug#1 回归：structuredClone(toRaw(source)) 的 toRaw 只解最外层代理，
 * 嵌套 reactive 子对象会让 structuredClone 抛 DataCloneError，
 * 调用方退浅拷贝后草稿与源共享嵌套对象——改草稿污染源数据。
 * deepToRaw 必须递归解干净，且含 ref 的值克隆出的是普通值不是 RefImpl。
 */
describe('deepToRaw 递归解响应式代理', () => {
  it('嵌套 reactive 子对象不再让 structuredClone 抛错', () => {
    const source = reactive({ range: reactive(['a', 'b']), nested: { deep: reactive({ x: 1 }) } })
    expect(() => structuredClone(deepToRaw(source))).not.toThrow()
  })

  it('解出的对象与源彻底断开：改副本不动源', () => {
    const source = reactive({ range: ['a', 'b'], meta: { count: 1 } })
    const copy = structuredClone(deepToRaw(source))
    copy.range.push('c')
    copy.meta.count = 99
    expect(source.range).toEqual(['a', 'b'])
    expect(source.meta.count).toBe(1)
  })

  it('ref 被解成普通值，不残留 RefImpl 结构', () => {
    const source = reactive({ count: ref(5), nested: { flag: ref(true) } })
    const copy = structuredClone(deepToRaw(source)) as any
    expect(copy.count).toBe(5)
    expect(copy.nested.flag).toBe(true)
    expect((copy as any).__v_isRef).toBeUndefined()
  })

  it('数组、嵌套数组里的 reactive 元素也解干净', () => {
    const source = reactive({ rows: [reactive({ id: 1 }), reactive({ id: 2 })], tags: ['x'] })
    const copy = structuredClone(deepToRaw(source)) as any
    expect(() => structuredClone(deepToRaw(source))).not.toThrow()
    copy.rows[0].id = 99
    expect(source.rows[0].id).toBe(1)
  })

  it('原始值原样返回，普通对象深度克隆不共享', () => {
    expect(deepToRaw(1 as any)).toBe(1)
    expect(deepToRaw('x' as any)).toBe('x')
    expect(deepToRaw(null as any)).toBe(null)
    const plain = { a: { b: 1 } }
    const copy = deepToRaw(plain)
    expect(copy).toEqual(plain)
    expect(copy).not.toBe(plain)
    expect(copy.a).not.toBe(plain.a)
  })

  it('cloneDraft 含函数字段不抛错：退浅拷贝，其余字段保留', () => {
    const source = { name: 'a', fn: () => 1 }
    const copy = cloneDraft(source) as any
    expect(copy.name).toBe('a')
    expect(typeof copy.fn).toBe('function')
  })
})

import { nextTick } from 'vue'
import { useFormContainer } from '../src/components/ElProForm/useFormContainer'

describe('cloneSeed 接线验证（useFormContainer 草稿取消不污染源行）', () => {
  it('嵌套 reactive 的 initialValues 播种后，改草稿不动源数据', async () => {
    const initialValues = reactive({ range: reactive(['a', 'b']), meta: { count: 1 } })
    const container = useFormContainer(
      { initialValues, title: 'x', open: true } as any,
      { onOpenChange: () => {}, onCancel: () => {}, onFinishError: () => {} },
    )
    // 播种发生在 isOpen 变真时（watch immediate + 组件外调用需 nextTick）
    await nextTick()
    const draft = container.draft as any
    expect(draft.range).toEqual(['a', 'b'])
    draft.range.push('c')
    draft.meta.count = 99
    expect(initialValues.range).toEqual(['a', 'b'])
    expect(initialValues.meta.count).toBe(1)
  })
})
