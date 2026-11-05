# 快速开始

## 安装

```bash
npm i el-pro-components
```

```ts
import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import ElProComponents from 'el-pro-components'
import 'el-pro-components/style.css'

createApp(App).use(ElementPlus).use(ElProComponents).mount('#app')
```

`vue` 和 `element-plus` 是 peerDependencies，不会被打进包里。

## 第一个表格

<DemoPreview path="table-basic" />

就这么点代码。搜索栏、分页、排序、列设置、刷新、密度切换、全屏全部自动出现——**column 里怎么写，见 [valueType 词汇表](/guide/value-type)**。

## request 的约定

```ts
type ProRequest<T> = (
  params: { current: number; pageSize: number; [key: string]: any },
  sort: Record<string, 'asc' | 'desc'>,
  extra: { signal: AbortSignal },
) => Promise<{ data: T[]; total?: number; success?: boolean }> | T[]
```

三个要点：

1. **`params` 的合并顺序**：搜索表单值 → `params` prop → 分页信息。`params` 优先级高于搜索表单，适合放路由参数这类外部条件。
2. **`sort` 是 `{ 字段: 'asc' | 'desc' }`**，不是 antd 的 `'ascend' | 'descend'`。只有配置了 `sortable="custom"` 的列才会进这里。
3. **竞态已处理**。内部用自增序号丢弃过期响应，连续快速切页不会数据串页；同时会把 `AbortController.signal` 给你，接进 axios/fetch 就能真正取消请求。

后端参数名不一样时，用 `paramsAdapter` 转换，不用改内部约定：

```vue
<ElProTable
  :params-adapter="(p) => ({ pageNum: p.current, limit: p.pageSize, ...p })"
  ...
/>
```

## 下一步

- 想知道每个 `valueType` 在表格/表单里各长什么样 → [valueType 词汇表](/guide/value-type)
- 想看组件怎么拼成一整页 → [一条完整链路：订单页](/guide/order-page)
- 想直接看某个组件 → 左侧「组件」目录
