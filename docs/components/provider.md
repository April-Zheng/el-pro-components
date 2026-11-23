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

内置文案整体覆盖。取值优先级：**组件显式 prop（如 `submitText`）> 手动 `labels` 覆盖 > 当前 `locale` 语言包 > zh-CN 默认**。逐键生效，未配置的键保持默认值。

设计边界：**不做 dark / token / prefixCls** 入口，暗色与主题定制交给 Element Plus 生态；语言包固定内置 zh-CN / en-US 两套，扩展语言在 `core/locales.ts` 加包并在 `ProLocale` 登记，不提供运行时热替换语言包字典的新增机制。

可用键（分组）：

| 组 | 键 | 默认值 | 用在哪 |
| --- | --- | --- | --- |
| 布局 | `layoutExpand` / `layoutCollapse` | `展开菜单` / `收起菜单` | 布局折叠按钮 title |
| 工具栏 | `toolbarReload` | `刷新` | 表格工具栏刷新按钮 |
| 工具栏 | `toolbarDensity` | `密度` | 密度切换按钮 |
| 工具栏 | `toolbarColumnSetting` | `列设置` | 列设置面板按钮 |
| 工具栏 | `toolbarFullscreen` / `toolbarExitFullscreen` | `全屏` / `退出全屏` | 全屏切换按钮 |
| 工具栏 | `toolbarSearch` / `toolbarSearchPlaceholder` | `搜索` / `搜索关键字，回车确认` | 关键字搜索按钮 / 占位 |
| 工具栏 | `sizeLoose` / `sizeDefault` / `sizeCompact` | `宽松` / `默认` / `紧凑` | 密度选项 |
| 查询 | `search` / `reset` | `查询` / `重置` | 表格搜索栏、查询筛选区按钮 |
| 查询 | `expand` / `collapse` | `展开` / `收起` | 搜索栏 / 查询区折叠按钮 |
| 列设置 | `columnShow` | `列展示` | 列设置面板标题 |
| 列设置 | `fixedLeft` / `cancelFixedLeft` / `fixedRight` / `cancelFixedRight` | `固定在列首` / `取消固定在列首` / `固定在列尾` / `取消固定在列尾` | 固定列按钮 |
| 操作 | `edit` / `cancel` / `save` / `delete` | `编辑` / `取消` / `保存` / `删除` | 行内编辑 / 描述编辑按钮 |
| 操作 | `addRow` | `新增一行` | 表格新增行按钮 |
| 操作 | `optionLabel` | `操作` | 操作列默认标题 |
| 操作 | `clear` / `batchSelectedPrefix` / `batchSelectedSuffix` | `清空` / `已选` / `项` | 批量选择区 |
| 空态 | `empty` | `暂无数据` | 表格 / 列表空态 |
| 列表 | `loadMore` / `loadingMore` | `加载更多` / `加载中…` | 列表底部 |
| 表单 | `submit` | `提交` | 表单 / 弹窗 / 抽屉 / 分步最后一步提交按钮 |
| 表单 | `addItem` / `maxItemsPrefix` / `maxItemsSuffix` | `添加一项` / `最多` / `项` | 字段组列表添加按钮与上限提示 |
| 表单 | `minPlaceholder` / `maxPlaceholder` | `最小值` / `最大值` | 数字区间占位 |
| 表单 | `startDatePlaceholder` / `endDatePlaceholder` | `开始日期` / `结束日期` | 日期区间占位 |
| 验证码 | `captchaGet` / `captchaResend` / `captchaPlaceholder` | `获取验证码` / `s 后重发` / `请输入验证码` | 验证码按钮 / 重发 / 占位 |
| 富文本 | `inputPlaceholder` | `请输入` | 富文本占位 |
| 描述 | `loadFailed` | `加载失败` | 描述列表加载失败提示 |
| 其他 | `moreFilters` / `confirm` | `更多筛选` / `确认` | 轻量筛选弹层 |
| 其他 | `copy` / `copied` | `复制` / `已复制` | 单元格复制提示 |
| 分步 | `stepsPrev` / `stepsNext` | `上一步` / `下一步` | 分步表单按钮 |

## locale

当前语言，默认 zh-CN。内置 zh-CN / en-US 两套语言包（键集与 labels 完全一致），**未手动覆盖的键随 locale 整体切换**，运行时切换立即生效（响应式）；手动 `labels` 覆盖的键在切换后保持。

```vue
<ElProConfigProvider locale="en-US">
  <ElProTable :columns="columns" />
</ElProConfigProvider>
```

嵌套规则：子 Provider 的 locale 覆盖父的；父的手动 labels 覆盖会逐层继承进子（并保持高于语言包）。

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
| locale | 当前语言，切换后未覆盖键整体换语言 | `'zh-CN' \| 'en-US'` | `'zh-CN'` |
| tableSize | 表格密度默认 | `'large' \| 'default' \| 'small'` | — |
| formSize | 表单尺寸默认 | `'large' \| 'default' \| 'small'` | — |

## 相关导出

```ts
import { useProConfig, useProLabel, mergeProConfig, routeToMenu } from 'el-pro-components'
```

- `useProConfig()`：组件内读当前生效的全局配置（无 Provider 时返回空配置）
- `useProLabel()`：读一条内置文案（已按 locale + 手动覆盖解析）
- `zhCN` / `enUS` / `localePack(locale)`：内置语言包，可作自定义覆盖的起点
- `routeToMenu(routes)`：路由记录 → 菜单（见 [ElProLayout](/components/layout#菜单数据管道)）
