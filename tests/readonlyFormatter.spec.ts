// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { computed, createApp, defineComponent, h, nextTick, provide } from 'vue'
import FormField from '../src/fields/FormField.vue'
import ElProTable from '../src/components/ElProTable/ElProTable.vue'
import { PRO_FORM_READONLY } from '../src/core/formContext'

let cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.forEach((fn) => fn())
  cleanups = []
})

function mountRoot(): HTMLElement {
  const root = document.createElement('div')
  document.body.appendChild(root)
  return root
}

function track(app: ReturnType<typeof createApp>, root: HTMLElement) {
  cleanups.push(() => {
    app.unmount()
    root.remove()
  })
}

describe('PRO_FORM_READONLY 上下文（readonly 下传嵌套字段）', () => {
  /** 用一层 provide 模拟 ElProForm，验证 FormField 会读上下文而不是只认 prop */
  function mountField(readonly: boolean) {
    const root = mountRoot()
    const Wrapper = defineComponent({
      setup() {
        provide(PRO_FORM_READONLY, computed(() => readonly))
        return () =>
          h(FormField as any, {
            modelValue: '张三',
            column: { prop: 'name', label: '姓名', valueType: 'text' },
            mode: 'form',
          })
      },
    })
    const app = createApp(Wrapper)
    app.mount(root)
    track(app, root)
    return root
  }

  it('上下文为 true 时渲染只读展示（不是输入框）', () => {
    const root = mountField(true)
    expect(root.querySelector('input')).toBeNull()
    expect(root.textContent).toContain('张三')
  })

  it('上下文为 false 时仍是输入框', () => {
    const root = mountField(false)
    expect(root.querySelector('input')).not.toBeNull()
  })
})

describe('ProColumn.formatter', () => {
  it('formatter 的返回值渲染进单元格（此前不生效）', async () => {
    const root = mountRoot()
    const app = createApp({
      render: () =>
        h(ElProTable as any, {
          columns: [
            {
              prop: 'amount',
              label: '金额',
              // 返回字符串
              formatter: (row: any) => `FMT:${row.amount}`,
            },
          ],
          dataSource: [{ id: 1, amount: 42 }],
          rowKey: 'id',
          pagination: false,
          search: false,
        }),
    })
    app.mount(root)
    track(app, root)
    await nextTick()
    await nextTick()
    expect(root.textContent).toContain('FMT:42')
  })
})
