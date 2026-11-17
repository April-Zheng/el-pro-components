# ElProConfigProvider

全局配置层：往下滑「库级默认」。支持嵌套，子 Provider 先继承父配置再合并，自己的 props 优先。没有 Provider 时所有组件回落到默认行为，单独使用零影响。

**何时使用**

- 自定义 valueType 需要跨表/跨表单复用，不想每个使用方逐列注册
- 内置文案需要换措辞（如「收起菜单」→「收起侧栏」），暂不上完整 i18n
- 表格/表单尺寸想一处配全站，个别页面再显式覆盖

```vue
<script setup>
const valueTypeMap = {
  score: {
    // 读态：表格单元格 / 描述列表
    render: ({ value }) => h('b', {}, `${value} 分`),
    // 编辑态：表单 / 搜索栏。值变化经 update 上抛
    formRender: ({ modelValue, update }) =>
      h('input', { value: modelValue, onInput: (e) => update(e.target.value) }),
  },
}
</script>

<template>
  <ElProConfigProvider :value-type-map="valueTypeMap" table-size="small">
    <ElProTable :columns="columns" :request="request" />
    <ElProForm :model="model" :columns="formColumns" />
  </ElProConfigProvider>
</template>
```

## valueTypeMap

键是 valueType 名（自定义名，不与内置词汇冲突即可），命中时优先于内置 valueType 词汇：

| 字段 | 说明 | 参数 |
| --- | --- | --- |
| render | 读态渲染，返回 VNode 或纯文本；返回 null 按空值占位 | `{ value, column, row, index }` |
| formRender | 编辑态渲染，返回 VNode | `{ modelValue, update, column, mode }` |

优先级：列级 `fieldComponent`（最具体）> 全局 `formRender` > 内置控件；读态同理（列级 `cellComponent` > 全局 `render` > 内置词汇）。

## labels

内置文案覆盖，逐键生效，未配置的键保持默认值。当前可用键：

| 键 | 默认值 | 用在哪 |
| --- | --- | --- |
| layoutExpand | `展开菜单` | 布局折叠按钮（侧栏收起时的 title） |
| layoutCollapse | `收起菜单` | 布局折叠按钮（侧栏展开时的 title） |

## 尺寸默认

| 键 | 说明 |
| --- | --- |
| tableSize | 表格/工具栏密度默认。`ElProTable` 的 `size` prop 显式传时以 prop 为准 |
| formSize | 表单尺寸默认。`ElProForm` 的 `size` prop 同上 |

## API

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| valueTypeMap | 自定义 valueType 注册表 | `Record<string, ProValueTypeConfig>` | — |
| labels | 内置文案覆盖 | `ProLabels` | — |
| tableSize | 表格密度默认 | `'large' \| 'default' \| 'small'` | — |
| formSize | 表单尺寸默认 | `'large' \| 'default' \| 'small'` | — |

## 相关导出

```ts
import { useProConfig, useProLabel, mergeProConfig, routeToMenu } from 'el-pro-components'
```

- `useProConfig()`：组件内读当前生效的全局配置（无 Provider 时返回空配置）
- `useProLabel()`：读一条内置文案（已与默认值合并）
- `routeToMenu(routes)`：路由记录 → 菜单（见 [ElProLayout](/components/layout#菜单数据管道)）
