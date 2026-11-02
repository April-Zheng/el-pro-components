# el-pro-components

Element Plus 体系的 CRUD 高阶组件：**由一份 columns 定义，同时驱动搜索栏、表格列、列设置面板、表单和详情页。**

![表格](docs/screenshots/table.png)

## 为什么做这个

Element Plus 提供了很好的基础组件，但没有 CRUD 页面的「模板层」。真实项目里每写一个列表页，都要重复做一遍：

- 搜索表单 → 拼参数 → 请求 → 分页 → 排序 → 再请求
- 列的显示/隐藏、密度、刷新按钮
- 表格里把 `status: 1` 翻译成「正常」并染色
- 同一个字段在表格里显示 tag、在详情页里显示同样的 tag、在表单里是下拉

Ant Design 生态用 ProComponents 解决了这个问题，但那是 React 的。Vue 3 + Element Plus 这边没有同量级的对标物。

这个库把那套抽象搬过来，并**按 Element Plus 的习惯重新设计 API**。

## 安装

```bash
npm i el-pro-components
```

```ts
import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import ElProComponents from 'el-pro-components'
import 'el-pro-components/style.css'

createApp(App).use(ElementPlus).use(ElProComponents).mount('#app')
```

`vue` 和 `element-plus` 是 peerDependencies，不会被打进包里。

## 快速开始

```vue
<script setup lang="ts">
import { ElProTable } from 'el-pro-components'
import type { ProColumn, ProRequest } from 'el-pro-components'

const columns: ProColumn[] = [
  { prop: 'id', label: 'ID', valueType: 'indexBorder', width: 64, search: false },
  { prop: 'name', label: '姓名', copyable: true },
  { prop: 'role', label: '角色', valueType: 'tag', valueEnum: ROLE_ENUM },
  { prop: 'status', label: '状态', valueType: 'status', valueEnum: STATUS_ENUM },
  { prop: 'amount', label: '金额', valueType: 'money', sortable: 'custom', search: false },
  { prop: 'createdAt', label: '创建时间', valueType: 'dateTime', sortable: 'custom' },
  { prop: 'actions', label: '操作', valueType: 'option', fixed: 'right' },
]

const request: ProRequest<User> = async (params, sort, { signal }) => {
  const res = await api.list(params, { signal })
  return { data: res.rows, total: res.total }
}
</script>

<template>
  <ElProTable :columns="columns" :request="request" row-key="id" title="用户列表" selection>
    <template #actions="{ row }">
      <ElButton link type="primary" @click="edit(row)">编辑</ElButton>
    </template>
  </ElProTable>
</template>
```

**就这样。** 搜索栏、分页、排序、列设置、刷新、密度切换、全屏全部自动出现。

## request 的约定

```ts
type ProRequest<T> = (
  params: { current: number; pageSize: number; [key: string]: any },
  sort: Record<string, 'asc' | 'desc'>,
  extra: { signal: AbortSignal },
) => Promise<{ data: T[]; total?: number; success?: boolean }> | T[]
```

三个要点：

1. **`params` 的合并顺序**：搜索表单值 → `params` prop → 分页信息。`params` 优先级高于搜索表单，适合放路由参数这类外部条件。
2. **`sort` 是 `{ 字段: 'asc' | 'desc' }`**，不是 antd 的 `'ascend' | 'descend'`。只有配置了 `sortable="custom"` 的列才会进这里。
3. **竞态已处理**。内部用自增序号丢弃过期响应，所以连续快速切页不会出现数据串页；同时会把 `AbortController.signal` 给你，接进 axios/fetch 就能真正取消请求、省带宽。

后端参数名不一样时，用 `paramsAdapter` 转换，不用改内部约定：

```vue
<ElProTable
  :params-adapter="(p) => ({ pageNum: p.current, limit: p.pageSize, ...p })"
  ...
/>
```

## 四个组件

### ElProTable

| 属性 | 说明 |
| --- | --- |
| `columns` | 列定义，必填 |
| `request` | 数据请求函数 |
| `params` | 额外查询参数，变化自动重查 |
| `search` | 是否显示搜索栏，默认 `true` |
| `options` | 工具栏图标开关 `{ reload, density, setting, fullscreen }`，传 `false` 全关 |
| `selection` | 是否显示多选列 |
| `pagination` | 分页配置，传 `false` 关闭 |
| `persistenceKey` | 传了就把列显隐持久化到 localStorage |
| `paramsAdapter` | 后端参数名转换 |

插槽：`#toolbar`（标题区）、`#toolbarActions`（右侧按钮）、`#batch`（批量操作）、`#empty`、`#${列的 prop}`（列自定义渲染）。

通过 ref 拿到的实例方法：

```ts
tableRef.value.reload()          // 刷新，保持当前页
tableRef.value.reloadAndRest()   // 刷新并回到第一页、清空选中
tableRef.value.reset()           // 重置搜索条件 + 排序 + 页码
tableRef.value.clearSelected()
tableRef.value.setPage({ current: 3 })
tableRef.value.getData()         // 当前页数据，可用于导出
```

### ElProForm

```vue
<ElProForm :columns="columns" :model="model" :span="8" label-width="90px" @submit="onSubmit" />
```

`model` 需要传**响应式对象**（`reactive`），组件直接读写它的字段——和 `el-form` 的约定一致。

`rules`、`formItemProps` 直接透传给 `el-form-item`；`fieldProps` 透传给输入控件。
`valueType: 'divider'` 可以插分组标题。

实例方法：`validate()`、`reset()`、`clearValidate()`、`submit()`。

### ElProDescriptions

```vue
<ElProDescriptions :columns="columns" :data="row" :column="3" />
```

和表格共用同一份 columns。表格里显示成 tag 的字段，详情页自动是同一个 tag——不用维护两套字典。`descriptionsSpan` 控制跨列。

### ElProLayout

```vue
<ElProLayout :menus="menus" :active-path="route.path" title="后台管理" @select="onSelect" />
```

只负责「长什么样」，不 import `vue-router`。跳转交给 `el-menu` 的 `router` 模式，或自己监听 `@select`。
面包屑从菜单树自动推导，详情页这类匹配不到菜单的路径会退化为最长前缀匹配。

## valueType 对照表

同一个 `valueType`，在表格/详情里决定**怎么显示**，在搜索栏/表单里决定**用什么控件**。

| valueType | 表格显示 | 表单控件 |
| --- | --- | --- |
| `text` | 纯文本 | ElInput |
| `textarea` / `code` | 纯文本 | ElInput textarea（code 用等宽字体） |
| `password` | 纯文本 | ElInput password |
| `number` | 数字 | ElInputNumber |
| `money` | ¥1,288.50 | ElInputNumber |
| `percent` | 65.0% | ElInputNumber |
| `rate` | 星星 | ElRate |
| `slider` | 数字 | ElSlider |
| `select` / `tag` | 枚举文本 / ElTag | ElSelect |
| `status` | 圆点 + 文本 | ElSelect |
| `radio` / `radioButton` | 枚举文本 | ElRadioGroup |
| `checkbox` / `cascader` / `treeSelect` | 值用「、」连接 | 对应控件 |
| `switch` | 是 / 否 | ElSwitch |
| `segmented` | 枚举文本 | ElSegmented |
| `date` / `dateTime` | 格式化日期 | ElDatePicker |
| `dateRange` / `dateTimeRange` | `a ~ b` | 带 range 的 DatePicker |
| `time` / `timeRange` | HH:mm:ss | ElTimePicker |
| `dateWeek` | 2026 第 45 周 | week picker |
| `dateMonth` / `dateYear` | YYYY-MM / YYYY | month / year picker |
| `dateQuarter` | YYYY-Q4 | ⚠️ 降级为 month picker（见已知限制） |
| `fromNow` | 10 个月前 | — |
| `progress` | 进度条 | — |
| `image` / `avatar` | 缩略图 / 圆形头像 | — |
| `color` | 色块 | ElColorPicker |
| `index` / `indexBorder` | 行号 | — |
| `option` | 操作列（配合插槽） | — |

`valueEnum` 是字典，string 或对象都能写：

```ts
const STATUS_ENUM = {
  active: { text: '正常', status: 'success' },   // status 映射到 el-tag 的 type
  pending: { text: '待审核', status: 'warning' },
  disabled: { text: '已停用', status: 'info' },
}
```

> 没写 `valueType` 但配了 `valueEnum` 时，按 `select` / `tag` 语义处理——和 ProComponents 的行为一致。

## 一个常见场景：表格显示到秒、搜索用日期区间

```ts
{
  prop: 'createdAt',
  label: '创建时间',
  valueType: 'dateTime',        // 表格里显示 2026-01-01 08:00:00
  search: {
    valueType: 'dateRange',     // 搜索时换成区间选择器
    span: 8,
    transform: (v) =>           // 把 [开始, 结束] 转成后端要的两个字段
      v?.length === 2 ? { startTime: v[0], endTime: v[1] } : {},
  },
}
```

## 从 ProComponents 迁移

API 是**按 Element Plus 习惯**设计的，所以不能直接复制粘贴 antd 的例子。改动集中在这几处：

| ProComponents | 这里 | 说明 |
| --- | --- | --- |
| `title`（列） | `label` | 沿用 el-table-column |
| `sorter: true` = 服务端排序 | `sortable="custom"` | **语义相反**。el-table 里裸 `sortable` 是本地排序，加 `custom` 才是服务端 |
| `ellipsis` | `showOverflowTooltip` | |
| `filters + onFilter` | `filters + filterMethod` | |
| `initialValue` | `defaultValue` | 搜索项初始值 |
| `fieldProps` | `fieldProps` | 同名 |
| `request(params, sort, filter)` | `request(params, sort, { signal })` | 第三参换成取消信号 |
| `'ascend' \| 'descend'` | `'asc' \| 'desc'` | |
| `actionRef.current.reload()` | `ref.value.reload()` | |
| `search={{ collapsed }}` | `defaultCollapsed` | |

## 已知限制

诚实列出来，这些不是「以后再说」，是当前客观上做不到或没做的：

- **`dateQuarter` / `dateQuarterRange` 表单里降级为月选择器。** Element Plus 没有季度选择器。展示没问题（能正确算出 `2026-Q4`），但选不了季度。需要的话传 `fieldComponent` 自定义。
- **没有可编辑行（EditableProTable）。** Element Plus 的编辑态更适合用列插槽直接写 `el-input`，硬封装成 schema 反而限制了常见需求。
- **没有拖拽排序。** 依赖 `sortablejs`，留给使用方按需接入。
- **`ProCard` / `ProList` / `StepsForm` / `ModalForm` / `LoginForm` 未实现。** 首批只做了最核心的四个。
- **列设置的排序（拖动调整列顺序）未做。** 目前只能显隐。

## Roadmap

- [ ] 列设置里支持拖拽调整列顺序
- [ ] `EditableProTable`（行内编辑）
- [ ] 表单分组 `group` 与列表型字段 `formList`
- [ ] 导出当前列定义对应的 CSV

## 开发

```bash
npm install
npm run dev         # playground，默认 http://127.0.0.1:5273
npm run build       # 打包库产物到 dist/
npm run typecheck   # 类型检查
```

playground 支持 `?page=/form`、`?page=/detail` 直接打开对应页面。

## 目录结构

```
src/
├── core/
│   ├── valueType.ts    # 格式化内核：值 → 文本/tag/进度，不 import 任何组件
│   └── useTable.ts     # 请求生命周期：分页/排序/搜索合并 + 竞态
├── fields/
│   ├── CellRenderer.vue  # 展示侧外壳（读）
│   └── FormField.vue     # 输入侧外壳（写）
├── components/
│   ├── ElProTable/       # ElProTable + SearchForm + TableToolbar
│   ├── ElProForm/
│   ├── ElProDescriptions/
│   └── ElProLayout/
└── types.ts
```

`core/` 完全不依赖组件，所以格式化规则可以被表格、详情页、导出逻辑共用。
`fields/` 是读和写两种外壳，共用同一套 valueType 词汇——这是整个库最核心的分层。

## License

MIT
