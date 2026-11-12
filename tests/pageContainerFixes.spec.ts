// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { createApp, h, nextTick } from 'vue'
import ElProPageHeader from '../src/components/ElProPageContainer/ElProPageHeader.vue'
import ElProPageContainer from '../src/components/ElProPageContainer/ElProPageContainer.vue'

let cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.forEach((fn) => fn())
  cleanups = []
})

/** 真实 DOM 挂载（元素全是 Element Plus 组件，用内存 renderer 跑不起来） */
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

describe('ElProPageHeader.content', () => {
  it('content 属性渲染到说明区（此前是死代码）', () => {
    const root = mount(() =>
      h(ElProPageHeader as any, { title: 'T', content: '来自 content 的说明' }),
    )
    const content = root.querySelector('.el-pro-page-header__content')
    expect(content).not.toBeNull()
    expect(content!.textContent).toContain('来自 content 的说明')
  })

  it('默认插槽优先于 content', () => {
    const root = mount(() =>
      h(ElProPageHeader as any, { content: 'prop 文本' }, { default: () => 'slot 文本' }),
    )
    const content = root.querySelector('.el-pro-page-header__content')
    expect(content).not.toBeNull()
    expect(content!.textContent).toContain('slot 文本')
    expect(content!.textContent).not.toContain('prop 文本')
  })
})

describe('ElProPageContainer 初始 tab', () => {
  it('非受控（不传 tabActiveKey）时默认选中第一个 tab', async () => {
    const root = mount(() =>
      h(ElProPageContainer as any, {
        title: 'T',
        tabList: [
          { key: 'all', label: '全部' },
          { key: 'active', label: '启用中' },
        ],
      }),
    )
    await nextTick()
    await nextTick()
    await nextTick()
    const active = root.querySelector('.el-tabs__item.is-active')
    expect(active).not.toBeNull()
    expect(active!.textContent).toContain('全部')
  })
})
