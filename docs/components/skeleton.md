# ElProSkeleton

骨架屏：`type` 取 `list` / `table` / `descriptions` / `grid` / `card` / `result`。`ElProCard` 的 `loading` 内部用的就是它。

**何时使用**

- 页面区块加载占位，想和最终内容的结构对得上
- 结果页（提交成功 / 404 / 无权限）的占位

## 代码演示

六种版式对应不同内容结构，切换 `type` 预览。`loading` 关掉后显示默认插槽里的真实内容。

<DemoPreview path="skeleton-basic" />

## 版式

| type | 形态 |
| --- | --- |
| `list` | 头像行 + 两行文字，重复 N 条 |
| `table` | 表头条 + 行条 |
| `descriptions` | 标签/值成对的两列 |
| `grid` | 卡片矩阵 |
| `card` | 头部条 + 段落 |
| `result` | 居中圆形图标位 + 标题条 + 说明条 + 两个按钮位（给结果页用） |

## API

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| type | 版式 | `'list' \| 'table' \| 'descriptions' \| 'grid' \| 'card' \| 'result'` | `'list'` |
| rows | 行数（list/table） | `number` | — |
| items | 数量（grid） | `number` | — |
| loading | 是否显示骨架（false 时渲染默认插槽内容） | `boolean` | `true` |
