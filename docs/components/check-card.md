# ElProCheckCard

整块可点的卡片，做单选/多选。

**何时使用**

- 配置向导里的「选一种方案」
- 开关型配置项（比 switch 信息的密度高）

## 基础用法

单选和多选。单选用 `options` 配置，多选用插槽，插槽里可以混插禁用项。

<DemoPreview path="check-card-basic" />

## API

### ElProCheckCard

| 参数 | 说明 | 类型 |
| --- | --- | --- |
| value | 选中后的值 | `string \| number` |
| title / description | 标题 / 描述 | `string` |
| avatar / src | 图标位 / 图片位 | — |
| disabled | 禁用 | `boolean` |

### ElProCheckCardGroup

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| v-model | 选中值：单选是标量，多选是数组 | `any` | — |
| multiple | 多选 | `boolean` | `false` |
| options | 配置式选项（与默认插槽二选一） | `CheckCardOption[]` | — |
| column | 每行几张 | `number` | — |
| disabled | 整组禁用 | `boolean` | `false` |
