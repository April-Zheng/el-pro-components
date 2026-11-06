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
| title | 标题 | `string \| number` | — |
| subTitle | 副标题 | `string \| number` | — |
| tooltip | 标题旁问号提示 | `string` | — |
| collapsible | 是否可折叠 | `boolean` | `false` |
| collapsed | 受控折叠，配 `v-model:collapsed` | `boolean` | — |
| defaultCollapsed | 默认折叠 | `boolean` | `false` |
| headerStyle | 头部样式 | `CSSProperties` | — |
| bodyStyle | 内容区样式 | `CSSProperties` | — |
| contentStyle | 内容包裹层样式 | `CSSProperties` | — |
| colSpan | 宽度：24 栅格数字、百分比、像素，支持响应式对象 | `number \| string \| object` | `24` |
| split | 分割线方向 | `'horizontal' \| 'vertical'` | — |
| gutter | 内容间距 | `number` | — |
| tabs | 头部标签页；内容用 `#tab-<key>` 插槽 | `TabItem[]` | — |
| activeKey | 受控标签页，配 `v-model:active-key` | `string` | — |
| ghost | 只当布局容器：去背景、去边框、去 padding | `boolean` | `false` |
| hoverable | 悬浮上浮 | `boolean` | — |
| boxShadow | 阴影 | `boolean` | — |
| bordered | 边框 | `boolean` | — |
| type | `inner` 为嵌套内卡样式 | `'inner'` | — |
| size | `'small'` 紧凑 | `string` | — |
| loading | 骨架屏占位 | `boolean` | `false` |
| cover | 封面图 | 插槽 | — |
| actions | 底部操作区 | 插槽 | — |
