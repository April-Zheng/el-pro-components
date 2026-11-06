# ElProLayout

侧边菜单 + 面包屑外壳。只负责「长什么样」，不 import `vue-router`。

**何时使用**

- 后台管理的整体布局：侧边菜单、顶栏、面包屑
- 配合 `ElProPageContainer` 组成完整页面骨架

```vue
<ElProLayout :menus="menus" :active-path="route.path" title="后台管理" @select="onSelect" />
```

跳转交给 `el-menu` 的 `router` 模式，或自己监听 `@select`。面包屑从菜单树自动推导，详情页这类匹配不到菜单的路径会退化为最长前缀匹配。

## 布局契约（CSS 变量与 provide）

根节点上挂了两个 CSS 变量：

- `--el-pro-sider-width`（折叠时会变，给底部固定工具条避让侧栏用）
- `--el-pro-layout-header-height`（顶栏高度，吸顶避让用）

**顶栏和侧栏都是 `position: sticky`**：整页照常滚动，但这两块不跟着走。同时布局会 `provide` 一份 `{ headerHeight: 56 }` 给页面层——`ElProPageContainer` 拿它当吸顶偏移的默认值，所以页面写 `fixed-header` 就够了。

::: warning 侧栏 sticky 的前提
侧栏要 `align-self: flex-start`（否则被 stretch 满高，sticky 等于没写）——组件内部已处理，自己改样式时别破坏。
:::

## API

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| menus | 菜单树 `{ path, title, icon?, children? }` | `MenuItem[]` | — |
| activePath | 当前激活路径 | `string` | — |
| title | 侧栏顶部标题 | `string` | — |
| defaultCollapsed | 初始是否折叠 | `boolean` | `false` |
| collapsed | 受控折叠，配 `v-model:collapsed` | `boolean` | — |
| headerHeight | 顶栏高度（同步写 CSS 变量并 provide） | `number` | `56` |

### 事件

| 事件 | 说明 |
| --- | --- |
| select | 菜单点击（`index` 为菜单 path） |
| update:collapsed | 折叠变化 |
