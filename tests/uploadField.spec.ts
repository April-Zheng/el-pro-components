// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { createApp, h, nextTick } from 'vue'
import CellRenderer from '../src/fields/CellRenderer.vue'
import FormField from '../src/fields/FormField.vue'
import { resolveCell } from '../src/core/valueType'

let cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.forEach((fn) => fn())
  cleanups = []
})

function mountCell(value: any, valueType = 'upload') {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const app = createApp({
    render: () => h(CellRenderer as any, { value, column: { valueType } }),
  })
  app.mount(root)
  cleanups.push(() => {
    app.unmount()
    root.remove()
  })
  return root
}

function mountFormField(modelValue: any, column: any) {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const app = createApp({
    render: () => h(FormField as any, { modelValue, column, mode: 'form' }),
  })
  app.mount(root)
  cleanups.push(() => {
    app.unmount()
    root.remove()
  })
  return root
}

describe('upload valueType 读态（resolveCell）', () => {
  it('URL 数组返回 kind upload', () => {
    const cell = resolveCell({ value: ['a.png', 'b.pdf'], valueType: 'upload' })
    expect(cell.kind).toBe('upload')
  })

  it('空数组按空值占位处理', () => {
    expect(resolveCell({ value: [], valueType: 'upload' }).kind).toBe('empty')
  })
})

describe('upload valueType 读态（CellRenderer）', () => {
  it('图片 URL 出缩略图墙、非图片 URL 出文件链接', async () => {
    const root = mountCell(['https://x/a.png', 'https://x/report.pdf'])
    await nextTick()
    expect(root.querySelectorAll('.el-pro-cell__upload-img').length).toBe(1)
    const links = root.querySelectorAll('.el-pro-cell__upload-link')
    expect(links.length).toBe(1)
    expect(links[0].getAttribute('href')).toBe('https://x/report.pdf')
  })

  it('空数组渲染空值占位', async () => {
    const root = mountCell([])
    await nextTick()
    expect(root.querySelector('.el-pro-cell__empty')).toBeTruthy()
  })
})

describe('upload valueType 编辑态（FormField）', () => {
  it('渲染 el-upload 控件', async () => {
    const root = mountFormField(['https://x/a.png'], {
      prop: 'files',
      valueType: 'upload',
      label: '附件',
    })
    await nextTick()
    expect(root.querySelector('.el-upload')).toBeTruthy()
  })
})
