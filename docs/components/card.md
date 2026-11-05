# ElProCard

结构化头部 + 折叠 + 嵌套分组 + 标签页。

**何时使用**

- 有标题区、操作区、折叠需求的卡片
- 卡片里再嵌卡片（分组布局），或头部换成标签页

![卡片](/screenshots/card.png)

## 基本用法

带标题、副标题、操作区的卡片，右上角可以折叠。

<DemoPreview path="card-basic" />

## 嵌套布局

卡片里放卡片就是分栏布局：子卡自动去边框，宽度用 `col-span` 分（24 栅格，也支持百分比和响应式对象）。

<DemoPreview path="card-nested" />

## 头部标签页

头部直接换成标签页，内容用 `#tab-<key>` 插槽。

<DemoPreview path="card-tabs" />

## 其他开关

`ghost`（只当布局容器）、`hoverable`、`boxShadow`、`bordered`、`type="inner"`、`size="small"`、`loading`（内部用 `ElProSkeleton`）、`cover`、`actions`。

## API

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| title / subTitle / tooltip | 标题 / 副标题 / 标题旁问号 | `string` | — |
| collapsible / collapsed / defaultCollapsed | 折叠，配 `v-model:collapsed` | `boolean` | `false` |
| headerStyle / bodyStyle / contentStyle | 三段样式定制 | `CSSProperties` | — |
| colSpan | 宽度：24 栅格数字、百分比、像素，支持响应式对象 | `number \| string \| object` | `24` |
| split / gutter | 分割线方向 / 间距 | `'horizontal' \| 'vertical'` | — |
| tabs / activeKey | 头部标签页，配 `v-model:active-key`；内容用 `#tab-<key>` 插槽 | `TabItem[]` | — |
| ghost | 只当布局容器：去背景、去边框、去 padding | `boolean` | `false` |
| hoverable / boxShadow / bordered | 悬浮上浮 / 阴影 / 边框 | `boolean` | — |
| type | `inner` 为嵌套内卡样式 | `'inner'` | — |
| size | `'small'` 紧凑 | `string` | — |
| loading | 骨架屏占位 | `boolean` | `false` |
| cover / actions | 封面图 / 底部操作区插槽 | 插槽 | — |
