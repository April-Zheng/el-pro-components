# 一条完整链路：订单页

`demo/pages/OrderPage.vue`（playground 里 `?page=/order`）是一条真能跑的链路：页头 tab → 筛选 → 分页排序 → 跨页勾选批量 → 新建 / 编辑 → 详情抽屉。它的意义不是「再把组件演一遍」，而是当验收用例——单组件 demo 不会暴露下面这些接缝问题，拼成一页立刻就露。

五条经验，按踩坑顺序排：

## 1. 筛选条件分「草稿」和「已提交」两份

草稿是筛选区正在编辑的值，已提交才是喂给表格的。不分开的话，用户每敲一个字都会触发一次请求。

```ts
const filterModel = reactive<Record<string, any>>({})   // 草稿：交给 ElProQueryFilter
const committed = reactive<Record<string, any>>({})     // 已提交：交给 ElProTable 的 :params

function onSearch(values: Record<string, any>) {
  for (const key of Object.keys(committed)) delete committed[key]  // 先删，上一次的条件才会真的消失
  Object.assign(committed, values)
}
```

## 2. tab 要从条件派生，不要另存一份

写成 `ref('all')` 的那一刻就有两个真相了：在筛选区清掉状态、或点重置之后，tab 还亮着「待付款」。派生之后反而多一个好处——在筛选区改状态并查询，tab 会自己跟着亮。

```ts
const activeTab = computed<string | number>({
  get: () => (committed.status as string) ?? 'all',
  set: (key) => {
    const status = key === 'all' ? undefined : String(key)
    if (status === undefined) delete filterModel.status
    else filterModel.status = status
    if (status === undefined) delete committed.status
    else committed.status = status
  },
})
```

## 3. 查询按钮的 loading 要从 `@loading-change` 接

页面读不到表格内部的 loading，但按钮该转到数据回来为止。别自己用「点查询置 true、`@load` 置 false」去模拟——条件没变化时压根不发请求，也就等不到 `@load`，按钮会永远转下去。

```vue
<ElProQueryFilter :loading="querying" @search="onSearch" />
<ElProTable @loading-change="(v) => (querying = v)" />
```

## 4. 条件一变就清空勾选

表格开了 `reserve-selection`，跨页勾选会保留——这是好事，但筛选一变，勾中的行可能已经不在结果里，批量操作就作用到了用户看不见的行上。

## 5. 删空最后一页要退一页，不是回第一页

`reload()` 会停在原页码：第 7 页只有 1 条，删掉后表格空白、分页器还写着第 7 页。回退一页保住位置感，回第一页会让用户迷失。

```ts
async function refreshAfterRemove(removed: number) {
  const page = tableRef.value?.getPage()
  const rowsOnPage = tableRef.value?.getData().length ?? 0
  if (page && page.current > 1 && rowsOnPage - removed <= 0) {
    await tableRef.value?.setPage({ current: page.current - 1 })
    return
  }
  await tableRef.value?.reload()
}
```

另外两个页层面的决定：**列表列和筛选列分开写**（共用一份要到处补 `hideInTable` / `hideInSearch`，而两边字段根本不是一回事）；**筛选区自己不带卡片**，白底和间距是页面的选择。
