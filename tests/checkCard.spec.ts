// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { createRenderer, defineComponent, h, nextTick, ref } from 'vue'
import ElProCheckCard from '../src/components/ElProCard/ElProCheckCard.vue'
import ElProCheckCardGroup from '../src/components/ElProCard/ElProCheckCardGroup.vue'

/**
 * 用 Vue 自带的 createRenderer + 一个极简内存 host 来挂载组件，
 * 这样不用引 jsdom / @vue/test-utils 就能真实触发点击、断言 emit。
 * 这里的 host 只实现 runtime-core 必需的那几个 nodeOps。
 */
interface HostNode {
  tag?: string
  text?: string
  comment?: string
  children: HostNode[]
  props: Record<string, any>
  parent: HostNode | null
}

function createHostOps() {
  const mk = (init: Partial<HostNode>): HostNode => ({ children: [], props: {}, parent: null, ...init })
  return {
    createElement: (tag: string) => mk({ tag }),
    createText: (text: string) => mk({ text }),
    createComment: (text: string) => mk({ comment: text }),
    setText: (node: HostNode, text: string) => {
      node.text = text
    },
    setElementText: (node: HostNode, text: string) => {
      node.text = text
    },
    insert: (child: HostNode, parent: HostNode, anchor?: HostNode | null) => {
      child.parent = parent
      const idx = anchor ? parent.children.indexOf(anchor) : -1
      if (idx > -1) parent.children.splice(idx, 0, child)
      else parent.children.push(child)
    },
    remove: (child: HostNode) => {
      const i = child.parent?.children.indexOf(child) ?? -1
      if (i > -1) child.parent!.children.splice(i, 1)
    },
    parentNode: (node: HostNode) => node.parent,
    nextSibling: (node: HostNode) => {
      const p = node.parent
      if (!p) return null
      const i = p.children.indexOf(node)
      return p.children[i + 1] ?? null
    },
    querySelector: () => null,
    setScopeId: () => {},
    cloneNode: (node: HostNode): HostNode => ({ ...node, children: [...node.children], props: { ...node.props } }),
    insertStaticContent: () => null,
    patchProp: (el: HostNode, key: string, _prev: any, next: any) => {
      el.props[key] = next
    },
  }
}

function findNode(node: HostNode, pred: (n: HostNode) => boolean): HostNode | null {
  if (pred(node)) return node
  for (const c of node.children) {
    const r = findNode(c, pred)
    if (r) return r
  }
  return null
}

function mount(render: () => any) {
  const renderer = createRenderer(createHostOps() as any)
  const container = { children: [], props: {}, parent: null } as unknown as HostNode
  renderer.createApp(defineComponent({ setup: () => render })).mount(container as any)
  const card = findNode(container, (n) => n.props?.role === 'checkbox')
  const classOf = (n: HostNode | null) => String(n?.props?.class ?? '')
  return {
    container,
    card,
    classOf,
    isCheckedVisual: () => classOf(card).includes('is-checked'),
    click: () => (card?.props.onClick as (() => void) | undefined)?.(),
  }
}

describe('ElProCheckCard 独立 / 成组勾选', () => {
  it('独立受控（v-model:checked）：每次点击都 emit，来回切换', async () => {
    const checked = ref(false)
    const updates: boolean[] = []
    const { click, isCheckedVisual } = mount(() =>
      h(ElProCheckCard as any, {
        checked: checked.value,
        'onUpdate:checked': (v: boolean) => {
          updates.push(v)
          checked.value = v
        },
      }),
    )

    click()
    await nextTick()
    expect(checked.value).toBe(true)
    expect(isCheckedVisual()).toBe(true)

    click()
    await nextTick()
    expect(checked.value).toBe(false)
    expect(isCheckedVisual()).toBe(false)

    expect(updates).toEqual([true, false])
  })

  it('独立非受控（不绑 checked）：内部状态自己翻转', async () => {
    const { click, isCheckedVisual } = mount(() => h(ElProCheckCard as any, {}))
    expect(isCheckedVisual()).toBe(false)
    click()
    await nextTick()
    expect(isCheckedVisual()).toBe(true)
    click()
    await nextTick()
    expect(isCheckedVisual()).toBe(false)
  })

  it('成组：点击只上报组，不改单卡 checked', async () => {
    const model = ref<string | number>('a')
    const { container, click } = mount(() =>
      h(
        ElProCheckCardGroup as any,
        { modelValue: model.value, 'onUpdate:modelValue': (v: any) => (model.value = v) },
        { default: () => [h(ElProCheckCard as any, { value: 'a', title: 'A' }), h(ElProCheckCard as any, { value: 'b', title: 'B' })] },
      ),
    )
    const cards: HostNode[] = []
    const collect = (n: HostNode) => {
      if (n.props?.role === 'checkbox') cards.push(n)
      n.children.forEach(collect)
    }
    collect(container)
    expect(cards.length).toBe(2)

    // 点第二张卡（value='b'）
    ;(cards[1].props.onClick as () => void)()
    await nextTick()
    expect(model.value).toBe('b')
    void click
  })
})
