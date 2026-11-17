# ElProLayout

多形态布局：侧边菜单 / 顶部菜单 / 混合 + 面包屑外壳。只负责「长什么样」，不 import `vue-router`。

**何时使用**

- 后台管理的整体布局：侧边菜单、顶栏、面包屑
- 配合 `ElProPageContainer` 组成完整页面骨架

```vue
<ElProLayout :menus="menus" :active-path="route.path" title="后台管理" @select="onSelect" />
```

跳转交给 `el-menu` 的 `router` 模式，或自己监听 `@select`。面包屑从菜单树自动推导，详情页这类匹配不到菜单的路径会退化为最长前缀匹配。

## 布局形态（layout）

- `'side'`（默认）：侧边菜单，顶栏是折叠按钮 + 面包屑
- `'top'`：菜单进顶栏（horizontal），无侧栏
- `'mix'`：一级菜单在顶栏、二级菜单在侧栏；配 `split-menus` 时侧栏只显示当前一级项的子菜单（当前一级项无 children 时侧栏隐藏），未配则侧栏显示整棵树

窄屏（<= sm）侧栏退化为抽屉（`el-drawer`），折叠按钮变成抽屉开关。

## 布局契约（CSS 变量与 provide）

根节点上挂了两个 CSS 变量：

- `--el-pro-sider-width`（折叠时会变，给底部固定工具条避让侧栏用）
- `--el-pro-layout-header-height`（顶栏高度，吸顶避让用）

**顶栏和侧栏都是 `position: sticky`**：整页照常滚动，但这两块不跟着走。同时布局会 `provide` 一份 `{ headerHeight: 56 }` 给页面层——`ElProPageContainer` 拿它当吸顶偏移的默认值，所以页面写 `fixed-header` 就够了。

::: warning 侧栏 sticky 的前提
侧栏要 `align-self: flex-start`（否则被 stretch 满高，sticky 等于没写）——组件内部已处理，自己改样式时别破坏。
:::

## 菜单数据管道

```ts
// 路由表 → 菜单（纯函数，兼容 vue-router 的 RouteRecordRaw 结构）
import { routeToMenu } from 'el-pro-components'
const menus = routeToMenu(routes) // meta.title / icon / hideInMenu / badge 原样映射，相对子路径自动拼接

// 异步菜单：挂载与 menuParams 变化时自动调用，reload() 重新拉取
const menuRequest = async (params) => {
  const res = await fetchMenus(params)
  return routeToMenu(res.data)
}
```

```vue
<ElProLayout :menu-request="menuRequest" :menu-params="params" @select="onSelect" />
```

## 页面标题（pageTitleRender）

默认同步 `document.title` 为 `页面标题 - 布局 title`（页面标题取当前路径菜单叶子的 title，可用 `page-title` 显式覆盖）：

```vue
<!-- 不同步标题（SPA 由宿主管标题） -->
<ElProLayout :menus="menus" :page-title-render="false" />
<!-- 完全自定义 -->
<ElProLayout :menus="menus" :page-title-render="({ title, breadcrumb }) => `${title} · 我的系统`" />
```

## 布局级水印（watermark）

```vue
<ElProLayout :menus="menus" watermark="内部系统" />
<!-- 对象写法透传 el-watermark -->
<ElProLayout :menus="menus" :watermark="{ content: '机密', font: { color: '#f00' } }" />
```

水印包住顶栏、内容区与底部条；未配水印时零包装开销。

## API

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| menus | 菜单树 `{ path, title, icon?, children? }`；`menuRequest` 存在时仅作回落 | `MenuItem[]` | `[]` |
| activePath | 当前激活路径 | `string` | `''` |
| title | 布局 title，出现在 logo / 页面标题里 | `string` | — |
| layout | 布局形态：`'side'` / `'top'` / `'mix'` | `'side' \| 'top' \| 'mix'` | `'side'` |
| splitMenus | mix 模式下侧栏只显示当前一级项的子菜单 | `boolean` | `false` |
| menuRequest | 菜单异步管道，挂载与 menuParams 变化时调用 | `(params?) => Promise<MenuItem[]>` | — |
| menuParams | menuRequest 的参数，变更后自动重新拉取 | `Record<string, any>` | — |
| defaultCollapsed | 初始是否折叠（仅 side / mix 的侧栏） | `boolean` | `false` |
| collapsed | 受控折叠，配 `v-model:collapsed` | `boolean` | — |
| siderWidth | 侧栏宽度（移动端抽屉宽度同源） | `number` | `220` |
| collapsedWidth | 折叠后侧栏宽度 | `number` | `64` |
| hideSider | 隐藏侧边栏 | `boolean` | `false` |
| hideBreadcrumb | 隐藏面包屑 | `boolean` | `false` |
| watermark | 布局级水印 | `string \| WatermarkConfig` | — |
| pageTitleRender | 页面标题渲染；`false` 不同步 document.title | `false \| (info) => string \| false \| void` | — |
| pageTitle | 页面标题显式覆盖 | `string` | — |

### 事件

| 事件 | 说明 | 回调参数 |
| --- | --- | --- |
| select | 菜单点击 | `(path: string)`，即菜单 path |
| update:collapsed | 折叠变化，配 `v-model:collapsed` | `(collapsed: boolean)` |
| collapsedChange | 折叠变化（只需要监听、不需要双向绑定时用） | `(collapsed: boolean)` |

### 实例方法

| 方法 | 说明 |
| --- | --- |
| setCollapsed(value) | 设置折叠态 |
| toggleCollapsed() | 切换折叠态 |
| isCollapsed() | 读取当前折叠态 |
| reload() | 重新拉取 menuRequest（对齐 React actionRef.reload）；未配管道时空操作 |
| isMenuLoading() | 读取菜单异步加载态 |
