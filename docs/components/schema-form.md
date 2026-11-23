# ElProSchemaForm

统一表单入口（对齐 React 的 BetaSchemaForm 职责）：**一份 columns 配置，换一个 `layoutType` 就在六种容器之间切换**。它不是新的字段层——columns 直接透传给所选容器，valueType / fieldProps / divider / formSet / dependency / group / formList / hideInForm 等全部继承既有列驱动管线。

**设计边界**：不做 embed（Vue 无“嵌入现有表单”形态，需要内嵌直接用 ElProForm）；不做 JSON Schema 转换（React 源码实态也是 columns 直通，它的“Json Schema”文档宣传在源码里并无转换器）。

**何时使用**

- 同一组字段要在普通表单、弹窗、抽屉、分步、查询区、轻量筛选之间复用，不想每个容器各写一遍 columns
- 想用一个入口统一管理表单的布局分发

## 用法

```vue
<script setup>
const columns = [
  { prop: 'name', label: '名称', valueType: 'text' },
  { prop: 'status', label: '状态', valueType: 'select', valueEnum: STATUS_ENUM },
  { prop: 'divider', label: '基本信息', valueType: 'divider' },
  { prop: 'remark', label: '备注', valueType: 'textarea' },
]
</script>

<template>
  <!-- 默认 form：直接渲染表单一 -->
  <ElProSchemaForm :columns="columns" :model="model" />

  <!-- 弹窗 / 抽屉：layoutType + open 受控 -->
  <ElProSchemaForm layout-type="modal" :columns="columns" :model="model" v-model:open="open" />
</template>
```

## layoutType

| 值 | 容器 | 专属 props |
| --- | --- | --- |
| `form`（默认） | ElProForm | 与 ElProForm 一致（model 必传或组内草稿兜底） |
| `modal` | ElProModalForm | `open` / `width` / `top` / `fullscreen` |
| `drawer` | ElProDrawerForm | `open` / `drawerSize` / `direction` |
| `steps` | ElProStepsForm | `columns` 传**二维**（每步一维，自动转 steps，默认步名「步骤 N」）；其余 `submitter` / `current` |
| `queryFilter` | ElProQueryFilter | `model` / `collapsed` / `collapsible` / `searchText` / `resetText` |
| `lightFilter` | ElProLightFilter | `model` 等筛选区属性 |

除 `columns` / `layoutType` 外的属性按所选容器透传（`v-bind`），写错容器的属性不报错但不会生效。

## 字段能力

无新增字段层：divider、formSet（ElProFieldSet）、dependency（ElProFormDependency）、group、formList、hideInForm、valueEnum、fieldProps、formSpan 全部沿用现状——使用方式与 ElProForm 完全一致。

## 相关导出

```ts
import { ElProSchemaForm } from 'el-pro-components'
import type { ElProSchemaFormProps, ProSchemaFormLayout } from 'el-pro-components'
```
