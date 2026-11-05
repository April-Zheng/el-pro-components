# ElProDescriptions

同一份 columns 生成详情页。表格里显示成 tag 的字段，详情页自动是同一个 tag——不用维护两套字典。

**何时使用**

- 详情抽屉/详情页，字段定义与表格共用
- 想把「请求 + loading + 竞态」也交给组件，而不是在页面里手写

## 代码演示

详情页和表格共用一份 `columns`，表格里是 tag，详情页里也是 tag。

<DemoPreview path="descriptions" />

## 两种数据来源

1. **给 `data`**：父级持有数据，直接展示
2. **给 `request`**：详情页通常「一个页面一个接口」，让组件管 loading / error / 竞态更省事

`request` 模式下的行为：

- 首次加载显示 `descriptions` 版式的骨架屏
- `success: false` 时顶部出错误提示但**不清空已展示的记录**（留着旧数据比白屏有用）
- 切 `params` 会 abort 上一次请求，并用自增 id 丢弃过期回包

## API

### Props

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| columns | 同表格的列定义；`descriptionsSpan` 控制跨列 | `ProColumn[]` | —（必填） |
| data | 展示的数据（与 `request` 二选一） | `Record<string, any>` | — |
| request | 请求函数。**必须包一层 `data`**：记录是任意对象，裸对象里恰好有 `data` 字段时就分不清了 | `(params, { signal }) => Promise<{ data, success?, errorMessage? }>` | — |
| params | 透传给 request。**必须是稳定引用**，模板里写 `:params="{ id }"` 每次渲染都是新对象，会无限重查 | `Record<string, any>` | — |
| immediate | 默认自动请求；`false` 则等 `reload()` | `boolean` | `true` |
| loading | 受控加载态，与内部请求态取或 | `boolean` | `false` |
| column | 每行列数，支持响应式 `{ xs: 1, md: 2, lg: 3 }`。窄屏不配这个，三列会把标签挤成一列竖排 | `number \| object` | `3` |
| title / extra | 标题与右侧操作 | `string` / 插槽 | — |
| bordered / size | 透传给 `el-descriptions` | — | — |

### 实例方法

| 方法 | 说明 |
| --- | --- |
| `reload()` | 重新请求 |
| `refresh()` | 同 `reload()`（语义别名） |
| `data` | 当前数据 |
