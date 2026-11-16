// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick, reactive } from 'vue'
import ElProQueryFilter from '../src/components/ElProQueryFilter/ElProQueryFilter.vue'
import type { ProColumn } from '../src/types'

let cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.forEach((fn) => fn())
  cleanups = []
})

const columns = Array.from({ length: 8 }, (_, i) => ({
  prop: `f${i + 1}`,
  label: `字段${i + 1}`,
  valueType: 'text',
})) as unknown as ProColumn[]

function mount(props: Record<string, any>) {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const app = createApp({
    render: () => h(ElProQueryFilter as any, { columns, ...props }),
  })
  app.mount(root)
  cleanups.push(() => {
    app.unmount()
    root.remove()
  })
  return root
}

/** 触发查询：按钮点击 + 冲刷 validate 的 Promise 链 */
async function search(root: HTMLElement) {
  const btn = Array.from(root.querySelectorAll('button')).find((b) =>
    b.textContent?.includes('查询'),
  ) as HTMLElement
  btn.click()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await nextTick()
}

describe('QueryFilter preserve（批次6⑥）', () => {
  it('默认 preserve：收起隐藏的字段值随 search 一起发出', async () => {
    const model = reactive({ f1: 'a', f5: 'hidden-value' })
    const payloads: Record<string, any>[] = []
    const root = mount({ model, onSearch: (p: any) => payloads.push(p) })
    await nextTick()
    // 默认折叠：f5 在收起区
    await search(root)
    expect(payloads[0]).toMatchObject({ f1: 'a', f5: 'hidden-value' })
  })

  it('preserve=false：收起隐藏的字段值不进 search 负载', async () => {
    const model = reactive({ f1: 'a', f5: 'hidden-value' })
    const payloads: Record<string, any>[] = []
    const root = mount({ model, preserve: false, onSearch: (p: any) => payloads.push(p) })
    await nextTick()
    await search(root)
    expect(payloads[0]).toMatchObject({ f1: 'a' })
    expect(payloads[0].f5).toBeUndefined()
  })
})

describe('QueryFilter layout（批次6⑥）', () => {
  it("layout='vertical' 映射 label 置顶", async () => {
    const root = mount({ layout: 'vertical' })
    await nextTick()
    const form = root.querySelector('.el-form') as HTMLElement
    expect(form.classList.contains('el-form--label-top')).toBe(true)
  })

  it("不传 layout 保持默认 labelPosition", async () => {
    const root = mount({})
    await nextTick()
    const form = root.querySelector('.el-form') as HTMLElement
    expect(form.classList.contains('el-form--label-right')).toBe(true)
  })
})

describe('QueryFilter showHiddenNum 默认值（批次6⑥，对齐 React 默认 false）', () => {
  it('默认不显示隐藏项计数', async () => {
    const root = mount({})
    await nextTick()
    expect(root.querySelector('.el-pro-query-filter__hidden')).toBeNull()
  })

  it('显式传 true 才显示', async () => {
    const root = mount({ showHiddenNum: true })
    await nextTick()
    expect(root.querySelector('.el-pro-query-filter__hidden')).not.toBeNull()
  })
})
