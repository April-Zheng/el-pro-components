// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { createApp, h, nextTick, reactive } from 'vue'
import ElProForm from '../src/components/ElProForm/ElProForm.vue'
import type { ProColumn } from '../src/types'

let cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.forEach((fn) => fn())
  cleanups = []
})

interface MountResult {
  root: HTMLElement
  model: Record<string, any>
}

function mount(columns: ProColumn[], initialModel: Record<string, any> = {}): MountResult {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const model = { ...initialModel }
  const app = createApp({
    render: () => h(ElProForm as any, { columns, model, showActions: false }),
  })
  app.mount(root)
  cleanups.push(() => {
    app.unmount()
    root.remove()
  })
  return { root, model }
}

describe('formSet valueType（批次6②，字段集绑数组）', () => {
  it('每个子字段按出现顺序绑数组的 index', async () => {
    const { root, model } = mount([
      {
        prop: 'range',
        label: '区间',
        valueType: 'formSet',
        columns: [
          { prop: 'min', label: '最小值', valueType: 'number' },
          { prop: 'max', label: '最大值', valueType: 'number' },
        ],
      },
    ] as unknown as ProColumn[])
    await nextTick()

    const inputs = root.querySelectorAll('.el-pro-form__fieldset input') as NodeListOf<HTMLInputElement>
    expect(inputs.length).toBe(2)

    // 改第一个输入框 → model.range[0] 变化
    ;(inputs[0] as any).value = '10'
    ;(inputs[0] as HTMLElement).dispatchEvent(new (globalThis as any).Event('input', { bubbles: true }))
    await nextTick()
    expect(Array.isArray(model.range)).toBe(true)
    expect(model.range[0]).toBe(10)
  })

  it('label 渲染在 ElFormItem 上', async () => {
    const { root } = mount([
      {
        prop: 'range',
        label: '数值区间',
        valueType: 'formSet',
        columns: [{ prop: 'min', label: '最小值', valueType: 'number' }],
      },
    ] as unknown as ProColumn[])
    await nextTick()
    expect(root.querySelector('.el-form-item__label')?.textContent).toContain('数值区间')
  })
})

describe('dependency valueType（批次6③，依赖字段驱动子字段）', () => {
  it('columns 是函数时按依赖值生成子字段', async () => {
    const { root } = mount([
      { prop: 'type', label: '类型', valueType: 'segmented', valueEnum: { a: 'A', b: 'B' } },
      {
        prop: 'ext',
        label: '扩展',
        valueType: 'dependency',
        dependencyName: 'type',
        dependencyColumns: (values: any) =>
          values.type === 'a'
            ? [{ prop: 'extA', label: 'A 专属', valueType: 'text' }]
            : [{ prop: 'extB', label: 'B 专属', valueType: 'text' }],
      },
    ] as unknown as ProColumn[])
    await nextTick()

    // 初始 type 未选：依赖值为 undefined，columns('a' 分支) 不命中 → B 专属？
    // pickDeps(undefined type) → values.type === undefined → 函数走 else 分支
    expect(root.textContent).toContain('B 专属')
    expect(root.textContent).not.toContain('A 专属')
  })

  it('columns 是静态数组时直接渲染', async () => {
    const { root } = mount([
      {
        prop: 'ext',
        label: '扩展',
        valueType: 'dependency',
        dependencyName: 'type',
        dependencyColumns: [{ prop: 'extA', label: '静态子字段', valueType: 'text' }],
      },
    ] as unknown as ProColumn[])
    await nextTick()
    expect(root.textContent).toContain('静态子字段')
  })

  it('依赖字段变化时子字段跟着切换', async () => {
    // ElProForm 约定 model 必须是响应式对象（依赖追踪靠它）
    const model = reactive({ type: 'a' })
    const root = document.createElement('div')
    document.body.appendChild(root)
    const columns = [
      { prop: 'type', label: '类型', valueType: 'segmented', valueEnum: { a: 'A', b: 'B' } },
      {
        prop: 'ext',
        label: '扩展',
        valueType: 'dependency',
        dependencyName: 'type',
        dependencyColumns: (values: any) =>
          values.type === 'a'
            ? [{ prop: 'extA', label: 'A 专属', valueType: 'text' }]
            : [{ prop: 'extB', label: 'B 专属', valueType: 'text' }],
      },
    ] as unknown as ProColumn[]
    const app = createApp({
      render: () => h(ElProForm as any, { columns, model, showActions: false }),
    })
    app.mount(root)
    cleanups.push(() => {
      app.unmount()
      root.remove()
    })
    await nextTick()
    expect(root.textContent).toContain('A 专属')

    model.type = 'b'
    await nextTick()
    expect(root.textContent).toContain('B 专属')
    expect(root.textContent).not.toContain('A 专属')
    app.unmount()
    root.remove()
  })
})
