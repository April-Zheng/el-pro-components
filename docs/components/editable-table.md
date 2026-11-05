# ElProEditableTable

把「行内编辑」预置好的表格——它只是 `ElProTable` 的薄壳（`search: false` 默认收起 + `editable` 预置）。

**何时使用**

- 表格里直接改数据、批量录入小规模数据
- 编辑控件希望由 `valueType` 决定（`money` → 数字框、`role` → 下拉），和表单同一套渲染器

## 代码演示

### 基础行内编辑

点击行上的「编辑」，直接在单元格里改数据，保存或取消。「新增一行」可以连续加多行。

<DemoPreview path="table-editable" />

## 行为细节

- `column.editable` 控制哪一列可编辑：不写按 `valueType` 推断（`index` / `option` / `progress` / `image` 之类不进编辑态），也可以传函数按行决定
- **保存失败不会丢输入**：`onSave` 返回 `false` 或抛错时，该行留在编辑态、数据不写回
- 保存前只改草稿，`data` 里的原对象不动——这样「取消」才有意义
- **新增行拿主键**：`onSave` 可以返回保存后的记录（接口回包），返回的对象会合并进该行。返回了主键，这一行才摆脱内部临时 key，之后编辑、删除才能拿真实 id 调接口
- 新增行没有 id 时用内部临时 key 区分编辑态；临时 key 存在行对象的 `Symbol` 属性上，不会出现在 `JSON.stringify` 或发出去的请求体里
- **「新增一行」每次点击都追加一行编辑态**，不会先去保存上一行（源码 `addEditRecord` 同款语义）

## API

### Props

继承 [ElProTable](/components/table) 的全部 Props，以下是 `editable` 对象的字段：

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| type | 编辑模式：`single` 切换行先保存当前行；`multiple` 可同时编辑多行 | `'single' \| 'multiple'` | `'single'` |
| onSave | 保存回调。返回 `false` 或抛错留在编辑态；返回对象则合并进该行（可回传主键） | `(key, row, index) => Promise<Record \| boolean>` | — |
| onDelete | 删除回调，返回 `false` 取消删除 | `(key, row, index) => Promise<boolean>` | — |
| onCancel | 取消编辑回调 | `(key, row) => void` | — |
| newRecord | 新增行的初值工厂 | `(index) => Record<string, any>` | 按列 `defaultValue` 拼装 |
| addable | 是否显示「新增一行」按钮 | `boolean` | `true` |
| deletable | 是否显示行上「删除」按钮 | `boolean` | `true` |

### 受控编辑行

| 参数 | 说明 |
| --- | --- |
| `editableKeys` / `v-model:editable-keys` | 受控的编辑行 key 列表 |

### 插槽

| 插槽 | 说明 |
| --- | --- |
| editableActions | 覆盖行内默认的「保存/取消」按钮，作用域 `{ row, key, saving }` |
