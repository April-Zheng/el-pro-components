# ElProTable

列配置驱动的 CRUD 表格：搜索栏、列设置、分页、排序、竞态、跨页勾选全部内置。

**何时使用**

- 列表页有搜索、分页、排序的任一组合，不想每次手写「拼参数 → 请求 → 回填」
- 需要列的显示/隐藏、顺序调整、固定列，且状态要记住
- 字段要在「表格显示」「搜索控件」两种形态间复用同一份定义

## 代码演示

### 基础用法

一份 `columns` 同时生成搜索栏和表格列。

<DemoPreview path="table-basic" />

### 多级表头

列里写 `children` 就是分组表头，可以多层嵌套。三点注意：分组列不写 `prop`；列的显隐挂在子列上；有分组时不支持行拖拽和子列固定。

<DemoPreview path="table-group-header" />

### 列配置面板

右上角齿轮可以显示/隐藏列、拖拽排序、固定列到首尾、一键重置。配置跟着 `persistenceKey` 存进 localStorage，下次打开还在。

![列设置](/screenshots/column-setting.png)

### 列宽

表格撑满容器，`width` 是最小宽度，多余空间分摊给各列。想固定某列的宽度加 `flex: false`。

```ts
{ prop: 'orderNo', label: '订单号', width: 168 }    // 容器宽时会长到 ~200
{ prop: 'icon', label: '', width: 40, flex: false } // 钉死 40
```

### 默认插槽

展开行这类 `el-table-column` 从默认插槽插入，位置在 schema 列之前。操作列不用这里，用 `{ valueType: 'option' }`。

<DemoPreview path="table-expand" />

## API

### Props

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| columns | 列定义 | `ProColumn[]` | —（必填） |
| request | 数据请求函数 | `ProRequest` | — |
| params | 额外查询参数，变化自动重查，优先级高于搜索表单 | `Record<string, any>` | — |
| search | 是否显示搜索栏 | `boolean` | `true` |
| defaultCollapsed | 搜索栏默认折叠 | `boolean` | `true` |
| options | 工具栏图标开关，传 `false` 全关 | `{ reload, density, setting, fullscreen } \| false` | 全开 |
| selection | 是否显示多选列 | `boolean` | `false` |
| pagination | 分页配置，传 `false` 关闭；`type: 'cursor'` 启用游标分页 | `false \| object` | — |
| defaultPageSize | 默认每页条数 | `number` | `20` |
| immediate | 挂载后自动请求，`false` 时需手动 `reload()` | `boolean` | `true` |
| persistenceKey | 列显隐/顺序/固定持久化到 localStorage 的 key | `string` | — |
| columnOrder | 受控列顺序，配 `v-model:column-order` | `string[]` | — |
| columnFixed | 受控固定列，配 `v-model:column-fixed` | `Record<string, 'left' \| 'right'>` | — |
| columnState | 受控列显隐，配 `v-model:column-state` | `Record<string, boolean>` | — |
| paramsAdapter | 后端参数名转换 | `(params) => any` | — |
| emptyText | 空数据占位 | `string \| false` | `'-'` |
| title | 表格标题 | `string` | — |
| tooltip | 标题旁问号提示 | `string` | — |
| size | 表格尺寸 | `'default' \| 'small'` 等 | `'default'` |
| editable | 行内编辑配置，见 [ElProEditableTable](/components/editable-table) | `boolean \| ProEditableConfig` | `false` |
| polling | 轮询间隔毫秒（低于 2000 钮到 2000），传函数可按最新数据返回下一次间隔 | `boolean \| number \| (data) => number \| undefined` | — |
| postData | 响应数据整形：写进表格前对 `data` 做最后一道转换 | `(data) => data` | — |
| dataSource | 受控数据模式：传入后不发请求，配 `v-model:data-source` | `T[]` | — |
| mergeFields | 同值单元格纵向合并的字段列表（顺序即多级合并层级） | `string[]` | — |
| dragSortKey | 行拖拽排序：传列的 prop，该列出现拖拽把手 | `string` | — |
| columnSetting | 列设置面板配置 | `{ listHeight, checkable, draggable }` | — |

### 事件

| 事件 | 说明 | 回调参数 |
| --- | --- | --- |
| load | 每次加载完成，此时 `getTotal()` 已写好 | `(data: T[])` |
| loading-change | 加载态变化。页面要让别的组件跟着转圈就靠它 | `(loading: boolean)` |
| selection-change | 勾选变化；`row-key` + `selection` 时自动跨页累计 | `(rows: T[])` |
| error | 请求失败 | `(err: Error)` |
| change | 行内编辑数据变化（保存/删除/新增）后派发 | `(data: T[])` |

### 插槽

| 插槽 | 说明 |
| --- | --- |
| `${列的 prop}` | 列自定义渲染，作用域 `{ row, index, value }` |
| default | 往表格里插任意 `el-table-column`（展开行等结构性列），排在 schema 列之前 |
| toolbar | 标题区自定义 |
| toolbarActions | 工具栏右侧按钮 |
| batch | 批量操作区，作用域 `{ selected, clear }` |
| empty | 空数据自定义 |

### 实例方法

| 方法 | 说明 |
| --- | --- |
| `reload(resetPage?)` | 重查，保持当前页；传 `true` 回第一页 |
| `reloadAndRest()` | 重查并回第一页、清空选中 |
| `reset()` | 连搜索条件一起重置 |
| `setPage({ current, pageSize })` | 改页码 |
| `clearSelected()` | 清空勾选（含跨页保留的部分） |
| `getData()` | 当前页数据 |
| `getSelected()` | 选中行（导出、删空回退都要用） |
| `getTotal()` | 总条数 |
| `getPage()` | 当前分页状态 `{ current, pageSize }` |
| `startEdit(row)` | 让该行进入编辑态 |
| `saveRow(row)` | 保存该行（走 rules 校验 + onSave） |
| `cancelRow(row)` | 取消该行编辑，丢弃草稿 |
| `removeRow(row)` | 删除该行（走 onDelete） |
| `addRow()` | 新增一行并进入编辑态 |
