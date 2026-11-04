<script setup lang="ts">
/**
 * 真业务页：订单管理。
 *
 * 这不是「某个组件的示例」，而是一条完整链路 —— 页头 tab → 筛选 → 分页排序 →
 * 勾选批量 → 新建/编辑 → 详情。把它当验收用例，因为它会暴露单组件 demo 不会暴露的接缝问题：
 * 参数归谁、什么时候重查、跨页勾选还在不在、底部条会不会压住分页器。
 *
 * 三个刻意的设计决定，正好是这类页面最容易写歪的地方：
 *
 * 1. **筛选条件分「草稿」和「已提交」两份**。`filterModel` 是筛选区正在编辑的值，
 *    `committed` 是真正喂给表格的。不分开的话，用户在输入框里每敲一个字都会触发一次请求。
 *    这份分法也解释了为什么 `ElProQueryFilter` 的 model 归页面持有 —— 它得能同时喂给
 *    表格、导出、链接回填，所以不能藏在组件里。
 *
 * 2. **tab 是从「状态」派生出来的，不是另一份状态**。点 tab 就是改这个条件；
 *    重置/清空条件时 tab 会自己回到「全部」。同一个维度存两份，早晚会出现
 *    「tab 显示待付款、列表里却是全部」。
 *
 * 3. **列表列和筛选列分开定义**。共用一份要到处写 `hideInTable` / `hideInSearch`，
 *    而两边的字段根本不是一回事（列表要操作列、筛选要关键词框）。分开写反而短。
 */
import { computed, reactive, ref } from 'vue'
import { ElButton, ElDrawer, ElMessage, ElMessageBox, ElTag } from 'element-plus'
import {
  ElProDescriptions,
  ElProModalForm,
  ElProPageContainer,
  ElProQueryFilter,
  ElProTable,
} from '@/index'
import type { ProColumn, ProPageTab } from '@/index'
import {
  CHANNEL_ENUM,
  ORDER_STATUS_ENUM,
  createOrder,
  removeOrders,
  requestOrders,
  shipOrders,
  updateOrder,
} from '../data/orders'
import type { Order } from '../data/orders'

const tableRef = ref<InstanceType<typeof ElProTable>>()

/* --------------------------------- 列定义 --------------------------------- */

const columns: ProColumn<Order>[] = [
  { prop: 'orderNo', label: '订单号', width: 168, fixed: 'left', copyable: true },
  { prop: 'customer', label: '客户', width: 96 },
  { prop: 'channel', label: '渠道', valueType: 'tag', valueEnum: CHANNEL_ENUM, width: 92 },
  { prop: 'status', label: '状态', valueType: 'status', valueEnum: ORDER_STATUS_ENUM, width: 100 },
  {
    prop: 'amount',
    label: '金额',
    valueType: 'money',
    width: 128,
    align: 'right',
    sortable: 'custom',
  },
  { prop: 'createdAt', label: '下单时间', valueType: 'dateTime', width: 168 },
  { prop: 'actions', label: '操作', valueType: 'option', width: 148, fixed: 'right' },
]

const filterColumns: ProColumn[] = [
  {
    prop: 'keyword',
    label: '关键词',
    valueType: 'text',
    fieldProps: { placeholder: '订单号 / 客户名', clearable: true },
  },
  { prop: 'status', label: '状态', valueType: 'select', valueEnum: ORDER_STATUS_ENUM },
  { prop: 'channel', label: '渠道', valueType: 'select', valueEnum: CHANNEL_ENUM },
  { prop: 'amount', label: '金额区间', valueType: 'digitRange' },
  { prop: 'createdAt', label: '下单时间', valueType: 'dateRange' },
]

/** 筛选区的初值，同时也是「重置」要回到的基准。必须是稳定引用 */
const FILTER_BASELINE = {}

/* ------------------------------ 条件：草稿 / 已提交 ------------------------------ */

/** 草稿：筛选区正在编辑的值 */
const filterModel = reactive<Record<string, any>>({})
/** 已提交：表格真正用的那本账。改它的属性能触发重查（useTable 对 params 是深监听） */
const committed = reactive<Record<string, any>>({})

/**
 * 「查询中」。
 *
 * 页面拿不到表格内部的 loading，但筛选按钮又该转圈到数据回来为止 ——
 * 靠表格的 `@loading-change` 接一条线就行。
 * 不接这条线的话：点完查询按钮毫无反应，用户会连点好几下；
 * 而如果自己用「点查询置 true、@load 置 false」去模拟，遇到「条件没变所以没发请求」
 * 就会永远转下去（这个坑试过）。
 */
const querying = ref(false)

/** 条件一变就清空勾选：留着的话，批量操作会作用到列表里已经看不见的行 */
function clearSelection() {
  tableRef.value?.clearSelected()
  selected.value = []
}

function applyConditions(values: Record<string, any>) {
  clearSelection()
  // 先删再合：上一次有、这一次没有的条件必须真的消失，否则筛选会越用越窄
  for (const key of Object.keys(committed)) delete committed[key]
  Object.assign(committed, values)
}

function onSearch(values: Record<string, any>) {
  applyConditions(values)
}

/** 重置：筛选区自己会回到 baseline，这里同步已提交的那份 */
function onReset(values: Record<string, any>) {
  applyConditions(values)
}

/* ---------------------------------- tab ---------------------------------- */

const tabList: ProPageTab[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待付款' },
  { key: 'shipped', label: '已发货' },
  { key: 'done', label: '已完成' },
]

/**
 * tab **不自己存状态**，它是「状态」这个条件的视图。
 *
 * 一开始写的是 `const activeTab = ref('all')` + `v-model:tab-active-key`，跑起来立刻出问题：
 * 在筛选区把状态清掉（或点重置）之后，committed 已经空了，tab 还高亮着「待付款」——
 * 同一个维度存了两份状态，必然对不上。
 *
 * 派生之后反过来还多了一个好处：在筛选区改状态并查询，tab 会自己跟着亮。
 * 写入只走 setter 一个入口，`v-model` 就够了，不用再挂 `@tab-change`。
 */
const activeTab = computed<string | number>({
  get: () => (committed.status as string) ?? 'all',
  set: (key) => {
    const status = key === 'all' ? undefined : String(key)
    clearSelection()
    // 草稿和已提交一起改：只改一边，要么筛选区显示旧状态，要么列表不动
    if (status === undefined) delete filterModel.status
    else filterModel.status = status
    if (status === undefined) delete committed.status
    else committed.status = status
  },
})

/** 当前结果总数。列表自己知道，页面想知道（页头标签、导出）都要用，所以从 @load 里取 */
const total = ref(0)

function onTableLoad() {
  // @load 触发时 total 已经写好了，直接读
  total.value = tableRef.value?.getTotal() ?? 0
}

const headerTags = computed(() =>
  total.value ? [{ text: `共 ${total.value} 单`, type: 'info' as const }] : [],
)

/* -------------------------------- 批量操作 -------------------------------- */

const selected = ref<Order[]>([])
const batchesLoading = ref(false)

async function batchShip() {
  batchesLoading.value = true
  try {
    await shipOrders(selected.value.map((o) => o.id))
    ElMessage.success(`已发货 ${selected.value.length} 单`)
    clearSelection()
    await tableRef.value?.reload()
  } finally {
    batchesLoading.value = false
  }
}

async function batchRemove() {
  try {
    await ElMessageBox.confirm(
      `确定删除选中的 ${selected.value.length} 个订单吗？`,
      '批量删除',
      { type: 'warning' },
    )
  } catch {
    return
  }
  const count = selected.value.length
  batchesLoading.value = true
  try {
    await removeOrders(selected.value.map((o) => o.id))
    ElMessage.success('已删除')
    clearSelection()
    await refreshAfterRemove(count)
  } finally {
    batchesLoading.value = false
  }
}

async function removeOne(row: Order) {
  try {
    await ElMessageBox.confirm(`确定删除订单 ${row.orderNo} 吗？`, '删除', { type: 'warning' })
  } catch {
    return
  }
  await removeOrders([row.id])
  ElMessage.success('已删除')
  await refreshAfterRemove(1)
}

/**
 * 删完之后刷新，顺手处理「把当前页删空了」。
 *
 * 不处理的话：第 7 页只有 1 条，删掉后 `reload()` 仍然停在第 7 页 ——
 * 表格空白、分页器还写着第 7 页，用户以为数据没了。
 * 这种情况要退一页，而不是回到第一页（回到第一页会丢掉用户的位置感）。
 */
async function refreshAfterRemove(removed: number) {
  const page = tableRef.value?.getPage()
  const rowsOnPage = tableRef.value?.getData().length ?? 0
  if (page && page.current > 1 && rowsOnPage - removed <= 0) {
    await tableRef.value?.setPage({ current: page.current - 1 })
    return
  }
  await tableRef.value?.reload()
}

/* ------------------------------- 新建 / 编辑 ------------------------------- */

const formOpen = ref(false)
/** 喂给弹窗的初值。新建时是空对象，编辑时是那一行的副本 */
const formSeed = ref<Record<string, any>>({})
const editingId = ref<number | null>(null)

const formColumns: ProColumn<Order>[] = [
  {
    prop: 'customer',
    label: '客户',
    valueType: 'text',
    rules: [{ required: true, message: '请输入客户名', trigger: 'blur' }],
  },
  {
    prop: 'channel',
    label: '渠道',
    valueType: 'radioButton',
    valueEnum: CHANNEL_ENUM,
    rules: [{ required: true, message: '请选择渠道', trigger: 'change' }],
  },
  { prop: 'amount', label: '金额', valueType: 'money', fieldProps: { min: 0 } },
  { prop: 'itemCount', label: '件数', valueType: 'number', fieldProps: { min: 1 } },
  { prop: 'address', label: '收货地址', valueType: 'text', formSpan: 24 },
  { prop: 'remark', label: '备注', valueType: 'textarea', formSpan: 24 },
]

function openCreate() {
  editingId.value = null
  formSeed.value = {}
  formOpen.value = true
}

function openEdit(row: Order) {
  editingId.value = row.id
  formSeed.value = { ...row }
  formOpen.value = true
}

async function onSubmit(values: Record<string, any>) {
  // 演示环境是内存数据库，真项目这里 await api.save(values)
  if (editingId.value) await updateOrder(editingId.value, values)
  else await createOrder(values)
  ElMessage.success(editingId.value ? '已保存' : '已创建')
  void tableRef.value?.reload()
  // 返回 true 才关窗（对齐 React）：返回 false 可留在窗内做二次确认；
  // 不要自己写 formOpen = false，手动关会让「提交中 → 关闭」的顺序颠倒
  return true
}

/* --------------------------------- 详情 --------------------------------- */

const detailOpen = ref(false)
const detailRow = ref<Order | null>(null)

const detailColumns: ProColumn<Order>[] = [
  { prop: 'orderNo', label: '订单号', copyable: true },
  { prop: 'customer', label: '客户' },
  { prop: 'channel', label: '渠道', valueType: 'tag', valueEnum: CHANNEL_ENUM },
  { prop: 'status', label: '状态', valueType: 'status', valueEnum: ORDER_STATUS_ENUM },
  { prop: 'amount', label: '金额', valueType: 'money' },
  { prop: 'itemCount', label: '件数' },
  { prop: 'createdAt', label: '下单时间', valueType: 'dateTime' },
  { prop: 'paidAt', label: '付款时间', valueType: 'dateTime' },
  { prop: 'address', label: '收货地址', descriptionsSpan: 2 },
  { prop: 'remark', label: '备注', descriptionsSpan: 2 },
]

function openDetail(row: Order) {
  detailRow.value = row
  detailOpen.value = true
}

const detailData = computed(() => (detailRow.value ?? {}) as Record<string, any>)
</script>

<template>
  <div class="order-page">
    <ElProPageContainer
      v-model:tab-active-key="activeTab"
      title="订单管理"
      sub-title="真业务链路"
      :tags="headerTags"
      :breadcrumb="[
        { title: '首页', path: '/' },
        { title: '交易', path: '/trade' },
        { title: '订单管理' },
      ]"
      content="页头 tab 与筛选区的「状态」共用一份条件；筛选条件分草稿与已提交两份，敲字不会发请求。"
      :tab-list="tabList"
      fixed-header
      :footer-tool-bar-props="{ offsetLeft: 'var(--el-pro-sider-width, 0px)' }"
    >
      <template #extra>
        <ElButton type="primary" @click="openCreate">新建订单</ElButton>
      </template>

      <template #tabBarExtra>
        <ElTag v-if="selected.length" type="primary" size="small" effect="light">
          已勾 {{ selected.length }}
        </ElTag>
      </template>

      <template #footerExtra>
        已选 <b>{{ selected.length }}</b> 单
      </template>

      <template #footer>
        <ElButton
          size="small"
          type="primary"
          plain
          :disabled="!selected.length"
          :loading="batchesLoading"
          @click="batchShip"
        >
          批量发货
        </ElButton>
        <ElButton
          size="small"
          type="danger"
          plain
          :disabled="!selected.length"
          :loading="batchesLoading"
          @click="batchRemove"
        >
          批量删除
        </ElButton>
      </template>

      <!--
        筛选区刻意裸着给：它是「一块内容」，不自带卡片容器，
        要不要白底、要不要和表格同一张卡，是页面的事（这里就单独一张卡）。
      -->
      <div class="order-page__filter">
        <ElProQueryFilter
          :columns="filterColumns"
          :model="filterModel"
          :initial-values="FILTER_BASELINE"
          :loading="querying"
          @search="onSearch"
          @reset="onReset"
        />
      </div>

      <ElProTable
        ref="tableRef"
        :columns="columns"
        :request="requestOrders"
        :params="committed"
        row-key="id"
        selection
        :search="false"
        :default-page-size="10"
        @load="onTableLoad"
        @loading-change="(v: boolean) => (querying = v)"
        @selection-change="(rows: Order[]) => (selected = rows)"
      >
        <template #actions="{ row }">
          <ElButton link type="primary" size="small" @click="openDetail(row as Order)">详情</ElButton>
          <ElButton link type="primary" size="small" @click="openEdit(row as Order)">编辑</ElButton>
          <ElButton link type="danger" size="small" @click="removeOne(row as Order)">删除</ElButton>
        </template>
      </ElProTable>
    </ElProPageContainer>

    <!-- 新建 / 编辑共用一个弹窗：靠 initialValues 播种，靠 editingId 区分 -->
    <ElProModalForm
      v-model:open="formOpen"
      :title="editingId ? '编辑订单' : '新建订单'"
      :columns="formColumns"
      :initial-values="formSeed"
      :span="12"
      label-width="88px"
      :submit-text="editingId ? '保存' : '创建'"
      @finish="onSubmit"
      @finish-error="(err: unknown) => ElMessage.error((err as Error).message)"
    />

    <!-- 详情用抽屉：它不占用列表，看完随手关掉继续翻页 -->
    <ElDrawer v-model="detailOpen" title="订单详情" size="520px">
      <ElProDescriptions :columns="detailColumns" :data="detailData" :column="1" border />
    </ElDrawer>
  </div>
</template>

<style scoped>
/* 抵掉 demo 布局给内容区的内边距，让它贴着页面边缘 */
.order-page {
  margin: -16px;
}

/* 筛选区单独一张卡：它和表格是两块东西，视觉上分开才知道「条件」和「结果」的边界 */
.order-page__filter {
  margin-bottom: 16px;
  padding: 16px 16px 0;
  background: var(--el-bg-color);
  border-radius: 6px;
}
/* QueryFilter 自己的项下面已经留了 16px，卡片底部不用再补一层 */
.order-page__filter :deep(.el-form-item) {
  margin-bottom: 16px;
}
</style>
