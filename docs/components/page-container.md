# ElProPageContainer

页面容器：页头（可吸顶）+ 内容区（可限宽）+ 底部固定操作条。`ElProLayout` 管「外面那圈」，它管「里面这一页怎么排」。结构照 pro-components 的 `PageContainer`：页头 + 内容区 + 底部固定条，tab 挂在页头底部。

**何时使用**

- 列表页/详情页要统一的页头（面包屑、标题、标签、tab）
- 内容区要 loading 遮罩（只顶掉内容，页头留着，切页不闪）
- 底部固定操作条（编辑页的「保存/取消」）

![页面容器](/screenshots/page-container.png)

## 基础用法

页头 + 内容区 + 底部操作条，页头里可以放面包屑、标题、说明和 tab。点「模拟加载」看 loading 效果：只盖住内容区，页头不动。

<DemoPreview path="page-container-basic" />

## 三个值得注意的行为

- **返回按钮由 `@back` 的监听决定**，不是一个 show 开关。源码就是这么判的（`if (!backIcon || !onBack) return null`），不监听就永远不出现。想强制关掉用 `:back-icon="false"`
- **页头一个字段都没有时整块不渲染**，内容区会自己补上上边距，别在外层再手写间距
- **底部条是 `fixed` 的**。侧边布局里一定要传 `offsetLeft`，最省事的写法：

```vue
:footer-tool-bar-props="{ offsetLeft: 'var(--el-pro-sider-width, 0px)' }"
```

跟着菜单折叠自动变。`ElProFooterToolbar` 单独用也成立（塞进卡片里时传 `:fixed="false"`）。

## 吸顶的偏移是怎么来的

`ElProLayout` 会 `provide` 一份 `{ headerHeight: 56 }`，`ElProPageContainer` 拿它当吸顶偏移的默认值——页面写 `fixed-header` 就够了，不用自己算「顶栏多高」。显式写 `affixProps.offset` 可覆盖。

## API

### Props

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| title / subTitle / tags / avatar | 标题行。`title: false` 表示不要标题文字（面包屑、说明、tab 还在） | `string \| false` 等 | — |
| extra | 标题行右侧（也可用插槽） | 插槽优先 | — |
| content / extraContent | 说明行：左边一段话，右边附加区（窄了自动竖排） | `string` / 插槽 | — |
| breadcrumb | `[{ title, path?, current? }]`，**不依赖路由**，最后一项默认当当前页 | `BreadcrumbItem[]` | — |
| breadcrumbRender | `false` 不渲染；传函数完全接管 | `false \| (props) => VNode \| null` | — |
| tabList / tabActiveKey / tabProps | 页头底部的 tab，配 `v-model:tab-active-key` | `TabItem[]` 等 | — |
| loading | **只顶掉内容区**，页头和 tab 留着，切页不闪 | `boolean` | `false` |
| fixedHeader / affixProps | 页头吸顶（`el-affix`）。偏移默认取布局顶栏高度（从 `ElProLayout` 注入） | `boolean / object` | `false` |
| contentWidth / layout | `Fixed` + `layout: 'top'` 才收窄到 1152px，和源码一致 | `string` | — |
| pageHeaderRender | `false` 整块页头不要；传函数自己渲染 | `false \| (props) => VNode` | — |
| header | 逐项覆盖页头 props（浅合并，优先级更高） | `object` | — |
| waterMarkProps | 给了才套 `el-watermark` | `object` | — |
| footerToolBarProps | 透传给底部工具条（`offsetLeft` / `zIndex` / `fixed` / `teleport`） | `object` | — |

### 插槽

| 插槽 | 说明 |
| --- | --- |
| extra | 标题行右侧 |
| content / extraContent | 说明行 |
| tabBarExtra | tab 栏右侧 |
| header | 整块页头自定义 |
| footerExtra / footer | 底部固定条 |
| loading | 加载态自定义 |

`title` / `subTitle` / `tags` / `avatar` / `backIcon` / `breadcrumb` 这几个插槽名会原样转交给页头。
