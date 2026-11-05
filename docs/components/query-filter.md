# ElProQueryFilter

独立成块的查询筛选区：默认折叠，条件是页面自己的。

**何时使用**

- 同一份筛选条件要同时喂给请求、导出、右上角的条件回显
- 不想要表格内置搜索栏（`search: false`），改用页面级筛选区

它和 `ElProTable` 内置搜索栏长得像，差别只在**谁管状态**：内置搜索栏的值收在表格内部；这个组件的 `model` 在页面手里。

## 代码演示

独立的查询筛选区，条件由页面持有，查询、重置的结果自己接，可以同时喂给请求和导出。

<DemoPreview path="query-filter" />

## 两个实现细节

- `@search` 给出的是 `model` 的快照，查询后再改表单，已拿到的那份不会跟着变
- 操作按钮用栅格 `offset` 贴右边，换行时不会飘到下一行左边

![查询筛选区](/screenshots/query-filter.png)

## API

### Props

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| columns | 同表格的列定义。`hideInSearch` 的列不进来；`search.valueType` 可以换成另一种控件 | `ProColumn[]` | —（必填） |
| model | 受控数据。不传则组件内部建草稿 | `Record<string, any>` | — |
| initialValues | 初始值，**同时是「重置」要回到的基准**；不传取挂载时 `model` 的快照 | `Record<string, any>` | — |
| span | 每项占几格，支持响应式 `{ xs: 24, lg: 6 }` | `number \| object` | `{ xs: 24, sm: 12, md: 8, lg: 6 }` |
| defaultFormItemsNumber | 折叠时露几项，覆盖按 span 推算的值 | `number` | — |
| defaultCollapsed / collapsed | 默认折叠；`collapsed` 是受控开关，配 `v-model:collapsed` | `boolean` | `true` |
| searchText / resetText / loading | 按钮文案与查询按钮的 loading | `string \| boolean` | — |
| labelWidth / labelPosition / gutter / split | 透传给内部 `el-form`。`split` 只在 `labelPosition: 'top'` 时画行间分割线 | — | — |

### 事件与实例方法

| 名称 | 说明 |
| --- | --- |
| `@search(values)` / `@reset(values)` | 查询 / 重置，`values` 是快照 |
| `@collapse-change` | 折叠状态变化 |
| `search()` / `reset()` / `getValues()` / `validate()` | 实例方法 |
| `collapse()` / `expand()` | 折叠 / 展开 |
