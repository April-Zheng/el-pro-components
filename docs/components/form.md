# ElProForm

同一份 columns 生成表单：分组、字段组、联动、校验都是列定义的一部分。

**何时使用**

- 新建/编辑表单，字段在表格、详情、表单三处复用同一份定义
- 需要分组、按值联动显隐、数组型字段

## 代码演示

### 基础表单

一份 `columns` 生成整个表单，字段类型由 `valueType` 决定。

<DemoPreview path="form-basic" />

`model` 需要传**响应式对象**（`reactive`），组件直接读写它的字段——和 `el-form` 的约定一致。`rules`、`formItemProps` 透传给 `el-form-item`；`fieldProps` 透传给输入控件。

### 表单分组

`valueType: 'group'` 把字段分成几组，每组带标题、可折叠。子字段写在 `columns` 里。

<DemoPreview path="form-group" />

### 字段联动

字段可以根据其他字段的值显示、隐藏、换标题、禁用。

<DemoPreview path="form-dependency" />

两条约定：隐藏的字段不渲染，也不参与校验，所以藏起来的必填项不会拦住提交；隐藏不清值，切回来之前填的还在，要清空就在切换处自己处理。

## API

### Props

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| columns | 列定义，同表格，多了 `formSpan` 控制栅格占比 | `ProColumn[]` | —（必填） |
| model | **响应式**数据对象 | `Record<string, any>` | — |
| initialValues | 初值，挂载时写入 model（仅未传 `model` 时生效） | `Record<string, any>` | — |
| span | 每项默认占几格（24 栅格），列上 `formSpan` 可覆盖 | `number` | `8` |
| labelWidth | 标签宽度 | `string \| number` | `'100px'` |
| labelPosition | 标签位置 | `'left' \| 'right' \| 'top'` | `'right'` |
| gutter | 栅格间距 | `number` | `16` |
| size | 表单尺寸 | `'large' \| 'default' \| 'small'` | — |
| disabled | 整体禁用 | `boolean` | `false` |
| ignoreRules | 忽略列上的 rules（LightFilter 场景用） | `boolean` | `false` |

### dependency（列上的字段）

| 参数 | 说明 | 类型 |
| --- | --- | --- |
| dependsOn | 依赖哪些字段。**回调只拿到这几个字段**，不是整份 model | `string[]` |
| visible | 返回 `false` 就不渲染这一列（也不参与校验） | `(values) => boolean` |
| resolve | 返回 `Partial<ProColumn>`，浅合并到这一列上（`label` / `readonly` / `fieldProps` / `valueEnum` 都能换） | `(values) => Partial<ProColumn>` |

### group 的配置（groupProps / fieldProps 都收）

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| collapsible | 标题可点击折叠 | `boolean` | `false` |
| defaultCollapsed | 默认折叠 | `boolean` | `false` |
| collapsed | 受控折叠（配 `v-model:collapsed`） | `boolean` | — |
| direction | 子字段排列 | `'horizontal' \| 'vertical'` | `'horizontal'` |
| size | 子字段间距 | `number` | `32` |
| align | 对齐方式 | `'start' \| 'center' \| 'end'` | — |
| title | 分组标题，默认取列的 `label` | `string` | — |
| tooltip | 标题旁问号提示 | `string` | — |

### 事件

| 事件 | 说明 | 回调参数 |
| --- | --- | --- |
| submit | 校验通过后触发；回调返回 `true` 时自动 `reset()` | `(values)` |
| reset | 重置后触发 | `(values)` |
| invalid | 校验没过时触发 | — |
| valuesChange | 字段值变化（deep） | `(values)` |
| init | 首次挂载后触发一次（request 初值写入之后） | `(values)` |

### 实例方法

| 方法 | 说明 |
| --- | --- |
| `validate()` | 校验整个表单，返回 Promise |
| `reset()` | 重置为初始值。注意是 **`reset` 不是 `resetFields`**——可选链写错方法名会被静默吞掉 |
| `clearValidate()` | 清除校验提示 |
| `submit()` | 触发提交（等价点提交按钮） |
