// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { createApp, defineComponent, h, nextTick, ref } from 'vue'
import ElProConfigProvider from '../src/components/ElProConfigProvider/ElProConfigProvider.vue'
import CellRenderer from '../src/fields/CellRenderer.vue'
import FormField from '../src/fields/FormField.vue'
import { DEFAULT_PRO_LABELS, EMPTY_PRO_CONFIG, mergeProConfig, useProConfig, useProLabel } from '../src/core/configContext'
import type { ProColumn, ProConfigContext } from '../src/types'

let cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.forEach((fn) => fn())
  cleanups = []
})

function mountWithConfig(
  config: Partial<Pick<ProConfigContext, 'valueTypeMap' | 'labels' | 'tableSize' | 'formSize'>> | undefined,
  render: () => any,
) {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const app = createApp({
    render() {
      return h(ElProConfigProvider as any, config ?? {}, { default: render })
    },
  })
  app.mount(root)
  cleanups.push(() => {
    app.unmount()
    root.remove()
  })
  return root
}

const COLUMN: ProColumn = { prop: 'amount', label: '金额', valueType: 'myMoney' as any }

describe('mergeProConfig：父子合并规则', () => {
  it('无父配置时，labels 逐键覆盖默认值，未配置的键保持默认', () => {
    const merged = mergeProConfig(undefined, { labels: { layoutExpand: '打开侧栏' } })
    expect(merged.labels.layoutExpand).toBe('打开侧栏')
    expect(merged.labels.layoutCollapse).toBe(DEFAULT_PRO_LABELS.layoutCollapse)
  })

  it('有父配置时，子的覆盖父的，父独有的键保留', () => {
    const parent = mergeProConfig(undefined, { labels: { layoutExpand: '父展开', layoutCollapse: '父收起' } })
    const child = mergeProConfig(parent, { labels: { layoutExpand: '子展开' } })
    expect(child.labels.layoutExpand).toBe('子展开')
    expect(child.labels.layoutCollapse).toBe('父收起')
  })

  it('valueTypeMap 父子合并，同名键子的生效；尺寸自优先、父兜底', () => {
    const parent = mergeProConfig(undefined, {
      valueTypeMap: { a: {}, b: {} } as any,
      tableSize: 'small',
      formSize: 'large',
    })
    const child = mergeProConfig(parent, { valueTypeMap: { b: {}, c: {} } as any, tableSize: 'large' })
    expect(Object.keys(child.valueTypeMap).sort()).toEqual(['a', 'b', 'c'])
    expect(child.tableSize).toBe('large')
    expect(child.formSize).toBe('large')
  })

  it('两层都没配时 tableSize 为 undefined，读方自行兜底', () => {
    expect(mergeProConfig(undefined, {}).tableSize).toBeUndefined()
  })
})

describe('useProConfig / useProLabel：无 Provider 时零影响', () => {
  it('inject 拿不到时返回空配置，labels 是内置默认值', () => {
    const root = document.createElement('div')
    let seen: ProConfigContext | undefined
    let label = ''
    const app = createApp(
      defineComponent({
        setup() {
          seen = useProConfig()
          const getLabel = useProLabel()
          label = getLabel('layoutCollapse')
          return () => ''
        },
      }),
    )
    app.mount(root)
    cleanups.push(() => {
      app.unmount()
      root.remove()
    })
    expect(seen).toBe(EMPTY_PRO_CONFIG)
    expect(label).toBe('收起菜单')
  })
})

describe('valueTypeMap：读态 render（CellRenderer）', () => {
  it('命中自定义 valueType 时优先于内置词汇，返回的 VNode 落地渲染', async () => {
    const root = mountWithConfig(
      {
        valueTypeMap: {
          myMoney: {
            render: ({ value }) => h('b', { class: 'custom-money' }, `¥${value}`),
          },
        },
      },
      () => h(CellRenderer as any, { value: 42, column: COLUMN }),
    )
    await nextTick()
    const node = root.querySelector('.custom-money')
    expect(node?.textContent).toBe('¥42')
    // 内置 money 词汇没被走：没有千分位文本节点
    expect(root.querySelector('.el-pro-cell__text')).toBeNull()
  })

  it('render 返回纯文本时按文本渲染', async () => {
    const root = mountWithConfig(
      { valueTypeMap: { myMoney: { render: ({ value }) => `M${value}` } } },
      () => h(CellRenderer as any, { value: 7, column: COLUMN }),
    )
    await nextTick()
    // 纯文本返回没有元素壳：以文本内容断言，且内置词汇没被走
    expect(root.textContent).toContain('M7')
    expect(root.querySelector('.el-pro-cell__text')).toBeNull()
  })

  it('未注册的 valueType 走内置词汇，不受全局配置影响', async () => {
    const root = mountWithConfig(
      { valueTypeMap: { other: { render: () => 'other' } } },
      () => h(CellRenderer as any, { value: 42, column: { prop: 'amount', valueType: 'money' } as ProColumn }),
    )
    await nextTick()
    expect(root.textContent).toContain('42')
    expect(root.querySelector('.custom-money')).toBeNull()
  })
})

describe('valueTypeMap：编辑态 formRender（FormField）', () => {
  it('命中时渲染自定义控件，值变化经 update 上抛', async () => {
    const seen: any[] = []
    const root = mountWithConfig(
      {
        valueTypeMap: {
          myMoney: {
            formRender: ({ modelValue, update }) =>
              h('input', {
                class: 'custom-input',
                value: modelValue ?? '',
                onInput: (e: Event) => update((e.target as HTMLInputElement).value),
              }),
          },
        },
      },
      () => h(FormField as any, { modelValue: '', column: COLUMN, 'onUpdate:modelValue': (v: any) => seen.push(v) }),
    )
    await nextTick()
    const input = root.querySelector('.custom-input') as HTMLInputElement
    expect(input).not.toBeNull()
    input.value = '88'
    input.dispatchEvent(new Event('input'))
    expect(seen).toEqual(['88'])
  })

  it('列级 fieldComponent 优先级高于全局 formRender（列级显式覆盖最具体）', async () => {
    const root = mountWithConfig(
      {
        valueTypeMap: {
          myMoney: { formRender: () => h('input', { class: 'global-custom' }) },
        },
      },
      () =>
        h(FormField as any, {
          modelValue: '',
          column: { ...COLUMN, fieldComponent: defineComponent({ render: () => h('input', { class: 'column-custom' }) }) },
        }),
    )
    await nextTick()
    expect(root.querySelector('.column-custom')).not.toBeNull()
    expect(root.querySelector('.global-custom')).toBeNull()
  })
})

describe('labels：布局折叠按钮文案可配', () => {
  it('Provider 配置后，折叠按钮 title 使用注入文案', async () => {
    const ElProLayout = (await import('../src/components/ElProLayout/ElProLayout.vue')).default
    const root = document.createElement('div')
    document.body.appendChild(root)
    const app = createApp({
      render() {
        return h(ElProConfigProvider as any, { labels: { layoutCollapse: '收起侧栏', layoutExpand: '展开侧栏' } }, {
          default: () => h(ElProLayout as any, { menus: [{ title: '首页', path: '/' }], router: false }),
        })
      },
    })
    app.mount(root)
    cleanups.push(() => {
      app.unmount()
      root.remove()
    })
    await nextTick()
    const button = root.querySelector('.el-pro-layout__collapse') as HTMLButtonElement
    expect(button.getAttribute('title')).toBe('收起侧栏')
  })
})

describe('尺寸默认：tableSize / formSize', () => {
  it('ElProTable 未传 size 时消费全局默认', async () => {
    const ElProTable = (await import('../src/components/ElProTable/ElProTable.vue')).default
    const root = mountWithConfig(
      { tableSize: 'small' },
      () =>
        h(ElProTable as any, {
          columns: [{ prop: 'name', label: '名称' }],
          request: async () => ({ list: [], total: 0 }),
          pagination: false,
          search: false,
          options: false,
        }),
    )
    await nextTick()
    // el-table 的 size class：small 对应 el-table--small
    expect(root.querySelector('.el-table--small')).not.toBeNull()
  })

  it('ElProForm 未传 size 时消费全局 formSize 默认', async () => {
    const ElProForm = (await import('../src/components/ElProForm/ElProForm.vue')).default
    const root = mountWithConfig(
      { formSize: 'small' },
      () => h(ElProForm as any, { model: { name: '' }, columns: [{ prop: 'name', label: '名称', valueType: 'text' }], showActions: false }),
    )
    await nextTick()
    expect(root.querySelector('.el-form--small')).not.toBeNull()
  })
})
