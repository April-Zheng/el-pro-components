# ElProList

同一份 columns 生成列表页 / 卡片流。

**何时使用**

- 以条目为主的页面（通知、日志、动态），表格太重、纯手写又没分页
- 想要卡片流（`item-type="card"` + grid）

![列表](/screenshots/list.png)

## 基本用法

和表格共用一份 `columns`，`listSlot` 决定字段放在条目的哪个位置。不写 `listSlot` 也能跑，按字段类型自动推断。

<DemoPreview path="list-basic" />

| listSlot | 位置 |
| --- | --- |
| `avatar` | 左侧头像/缩略图 |
| `title` / `subTitle` | 主标题 / 次标题 |
| `description` | 标签行（自动 flex 换行） |
| `content` | 标题下的自由区 |
| `extra` / `aside` | 右侧统计 / 右侧附加说明 |
| `actions` | 操作区（等价于 `valueType: 'option'`） |

## 数据来源二选一

- 给 `request`：走服务端分页
- 给 `dataSource`：走本地分页

## 卡片流

`item-type="card"` 就是卡片流，每条自动包一层卡片。

<DemoPreview path="list-card" />

## API

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| columns | 列定义，`listSlot` 决定角色 | `ProColumn[]` | —（必填） |
| request | 服务端数据源 | `(params) => { data, total }` | — |
| dataSource | 本地数据源（给了它就不走 request） | `any[]` | — |
| rowKey | 行 key | `string` | `'id'` |
| itemType | 条目版式 | `'list' \| 'card'` | `'list'` |
| grid | 卡片流的栅格 `{ column, gutter }` | `object` | — |
| pagination | 分页配置 | `false \| object` | — |
| itemTitle | 条目标题的自定义渲染 | 插槽 | — |
| itemActions | 条目操作的自定义渲染 | 插槽 | — |
