// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { createApp, h, nextTick } from 'vue'
import ElProSchemaForm from '../src/components/ElProSchemaForm/ElProSchemaForm.vue'
import type { ProColumn } from '../src/types'

let cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.forEach((fn) => fn())
  cleanups = []
})

function mount(render: () => any) {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const app = createApp({ render })
  app.mount(root)
  cleanups.push(() => {
    app.unmount()
    root.remove()
  })
  return root
}

const COLUMNS: ProColumn[] = [
  { prop: 'name', label: '名称', valueType: 'text' },
  { prop: 'status', label: '状态', valueType: 'select', valueEnum: { 1: '启用', 2: '停用' } as any },
  { prop: 'divider', label: '基本信息', valueType: 'divider' },
  { prop: 'remark', label: '备注', valueType: 'textarea' },
]

describe('ElProSchemaForm：layoutType 分发 + columns 直通', () => {
  it('默认 form：渲染表单容器与字段控件', async () => {
    const root = mount(() => h(ElProSchemaForm as any, { columns: COLUMNS, model: {} }))
    await nextTick()
    expect(root.querySelector('.el-form')).toBeTruthy()
    // 字段控件由 el-form-item 包裹（FormField 内部无固定根 class，用字段项断言）
    expect(root.querySelector('.el-form-item')).toBeTruthy()
  })

  it('form：divider 列渲染分隔线（columns 直通管线）', async () => {
    const root = mount(() => h(ElProSchemaForm as any, { columns: COLUMNS, model: {} }))
    await nextTick()
    expect(root.querySelector('.el-divider')).toBeTruthy()
  })

  it('modal：渲染 el-dialog 容器，open 透传生效', async () => {
    const root = mount(() =>
      h(ElProSchemaForm as any, { layoutType: 'modal', columns: COLUMNS, open: true, title: '新建' }),
    )
    await nextTick()
    expect(root.querySelector('.el-dialog')).toBeTruthy()
  })

  it('drawer：渲染 el-drawer 容器', async () => {
    const root = mount(() =>
      h(ElProSchemaForm as any, { layoutType: 'drawer', columns: COLUMNS, open: true }),
    )
    await nextTick()
    expect(root.querySelector('.el-drawer')).toBeTruthy()
  })

  it('steps：二维 columns → 分步表单，默认步名「步骤 N」', async () => {
    const root = mount(() =>
      h(ElProSchemaForm as any, { layoutType: 'steps', columns: [COLUMNS, COLUMNS.slice(0, 2)] }),
    )
    await nextTick()
    expect(root.querySelector('.el-pro-steps-form')).toBeTruthy()
    expect(root.textContent).toContain('步骤 1')
    expect(root.textContent).toContain('步骤 2')
  })

  it('queryFilter：渲染查询区容器', async () => {
    const root = mount(() => h(ElProSchemaForm as any, { layoutType: 'queryFilter', columns: COLUMNS }))
    await nextTick()
    expect(root.querySelector('.el-pro-query-filter')).toBeTruthy()
  })

  it('lightFilter：渲染轻量筛选容器', async () => {
    const root = mount(() => h(ElProSchemaForm as any, { layoutType: 'lightFilter', columns: COLUMNS }))
    await nextTick()
    expect(root.querySelector('.el-pro-light-filter')).toBeTruthy()
  })
})
