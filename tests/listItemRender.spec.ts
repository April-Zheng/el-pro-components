// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick } from 'vue'
import ElProList from '../src/components/ElProList/ElProList.vue'

let cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.forEach((fn) => fn())
  cleanups = []
})

const columns = [
  { prop: 'title', label: '标题', listSlot: 'title' },
  { prop: 'desc', label: '描述', listSlot: 'description' },
]

function mount(props: Record<string, any>) {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const app = createApp({
    render: () =>
      h(ElProList as any, {
        columns,
        dataSource: [
          { id: 1, title: 'A', desc: 'a' },
          { id: 2, title: 'B', desc: 'b' },
        ],
        rowKey: 'id',
        pagination: false,
        ...props,
      }),
  })
  app.mount(root)
  cleanups.push(() => {
    app.unmount()
    root.remove()
  })
  return root
}

describe('List onItem（条目级事件/attrs，对齐 React onRow）', () => {
  it('onItem 返回的事件绑定到条目根元素，点击触发', async () => {
    const onClick = vi.fn()
    const root = mount({
      onItem: (item: any, index: number) => ({
        onClick: () => onClick(item, index),
        'data-rid': `row-${index}`,
      }),
    })
    await nextTick()

    const first = root.querySelector('.el-pro-list__entry') as HTMLElement
    expect(first.getAttribute('data-rid')).toBe('row-0')
    first.click()
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), 0)
  })

  it('onItem 与内置 item-click 事件并存不互斥', async () => {
    const onItemClick = vi.fn()
    const root = mount({ onItem: () => ({ onClick: () => {} }), onItemClick })
    await nextTick()

    const first = root.querySelector('.el-pro-list__entry') as HTMLElement
    first.click()
    // v-bind 的 onClick 与模板 @click 合并：两路都触发
    expect(onItemClick).toHaveBeenCalled()
  })
})

describe('List itemRender（条目级自定义渲染，对齐 React itemRender）', () => {
  it('包装默认条目：外层加壳，defaultDom 仍渲染原内容', async () => {
    const root = mount({
      itemRender: (_item: any, _index: number, defaultDom: any) =>
        h('div', { class: 'custom-wrap' }, [defaultDom]),
    })
    await nextTick()

    const wraps = root.querySelectorAll('.custom-wrap')
    expect(wraps.length).toBe(2)
    // 默认条目仍在壳内：标题文本可寻址
    expect(wraps[0].textContent).toContain('A')
    expect(wraps[1].textContent).toContain('B')
  })

  it('完全替换条目：defaultDom 不渲染', async () => {
    const root = mount({
      itemRender: (item: any) => h('div', { class: 'full-custom' }, `替换:${item.title}`),
    })
    await nextTick()

    expect(root.querySelectorAll('.full-custom').length).toBe(2)
    expect(root.querySelector('.el-pro-list__entry')).toBeNull()
    expect(root.textContent).toContain('替换:A')
  })

  it('itemRender 未传时行为不变', async () => {
    const root = mount({})
    await nextTick()
    expect(root.querySelectorAll('.el-pro-list__entry').length).toBe(2)
  })
})
