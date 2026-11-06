# ElProLightFilter

轻量筛选：行内紧凑字段（标签以 chip 形式放在控件前），没有传统表单的 label 列。行为对齐源码 `layouts/LightFilter`。

**何时使用**

- 页头要一组轻量的筛选条件，不想占一整块卡片
- 次要条件收进「更多筛选」弹层，保持一行干净

## 代码演示

筛选条件排成一行，值一变就触发查询。标了 `secondary` 的条件收进「更多筛选」弹层，点确认才生效。

<DemoPreview path="light-filter" />

## 行为约定

- **每次值变化立即触发 `search`**（源码 onValuesChange → form.submit()），校验通过才发，失败不发
- `secondary: true` 的字段收进「更多筛选」弹层；弹层里改的是**草稿**，点「确认」才应用并提交一次、点「重置」把这些字段恢复到 `initialValues`
- `collapse` 为 true 时全部字段收进弹层，触发器变筛选图标；`collapseLabel` 优先级最高
- 任一字段有值时根节点挂 `is-effective` 类，方便给触发器上色

与源码的两处刻意差异（README「已知限制」同步记录）：

- **弹层草稿在每次打开时从当前值重建。** 源码只在挂载时初始化一次，「确认」时会把打开前的旧值盖回去——明显的 unintended，这里修正
- **antd 的 `variant: 'borderless'` 没有移植。** Element Plus 没有对应的输入形态，字段就是普通 EP 控件 + 前置标签

## API

### Props

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| columns | 列定义；`secondary: true` 的收进弹层 | `ProColumn[]` | —（必填） |
| model | 受控数据（响应式对象） | `Record<string, any>` | — |
| initialValues | 初值，同时也是弹层「重置」的基准 | `Record<string, any>` | — |
| collapse | 全部字段收进弹层，触发器变筛选图标 | `boolean` | `false` |
| collapseLabel | 自定义触发器文案，优先级最高 | `string` | — |
| placement | 弹层位置 | `string` | `'bottom-start'` |
| popoverWidth | 弹层宽度 | `number` | `320` |
| size | 尺寸 | `'small' \| 'default' \| 'large'` | — |
| disabled | 整体禁用 | `boolean` | `false` |
| ignoreRules | 忽略字段上的 rules（源码同名字段） | `boolean` | `false` |
| popoverProps | 透传给 `el-popover` | `object` | — |

### 事件

| 事件 | 说明 | 回调参数 |
| --- | --- | --- |
| search | 值变化且校验通过时触发（等价源码 onValuesChange → form.submit） | `(values)` |
| valuesChange | 每次值变化触发（不等价于 search，无校验门禁） | `(values)` |

### 实例方法

| 方法 | 说明 |
| --- | --- |
| `getValues()` | 当前值 |
| `validate()` | 手动校验 |
