// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { createApp, h } from 'vue'
import ElProList from '../src/components/ElProList/ElProList.vue'

let cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.forEach((fn) => fn())
  cleanups = []
})

/** 挂载前先定好视口宽度：断点由 window.innerWidth 决定（happy-dom 可直接设） */
function mount(width: number, grid: any) {
  ;(window as any).innerWidth = width
  const root = document.createElement('div')
  document.body.appendChild(root)
  const app = createApp({
    render: () =>
      h(ElProList as any, {
        columns: [{ prop: 'name', label: '名称', valueType: 'text' }],
        dataSource: [{ id: 1, name: 'A' }],
        rowKey: 'id',
        grid,
      }),
  })
  app.mount(root)
  cleanups.push(() => {
    app.unmount()
    root.remove()
  })
  return root
}

/** 列表容器的行内样式里带着 grid-template-columns */
function inlineStyle(root: HTMLElement): string {
  const items = root.querySelector('.el-pro-list__items') as HTMLElement | null
  expect(items).not.toBeNull()
  return items!.getAttribute('style') ?? ''
}

describe('ElProList.grid 响应式列数（此前整对象被当数字用，恒单列）', () => {
  it('grid.column 写成断点对象时，按当前断点取列数', () => {
    const root = mount(1200, { column: 1, xs: 1, xl: 4 })
    expect(inlineStyle(root)).toContain('repeat(4')
  })

  it('同一份断点配置在窄屏回落到 xs 档', () => {
    const root = mount(400, { column: 1, xs: 1, xl: 4 })
    expect(inlineStyle(root)).not.toContain('repeat(')
  })

  it('旧的纯数字 column 行为不变（不受断点影响）', () => {
    const root = mount(400, { column: 3 })
    expect(inlineStyle(root)).toContain('repeat(3')
  })
})
