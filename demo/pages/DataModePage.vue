<script setup lang="ts">
/**
 * 数据生命周期示例：批次 2 的六个能力逐块演示。
 *
 * 每块都挂了请求计数器——「假分页翻页不发请求」「游标翻页带 nextToken」
 * 这些行为光看表格看不出来，看计数器才知道请求到底发没发。
 */
import { computed, ref } from 'vue'
import { ElAlert, ElMessage, ElTag } from 'element-plus'
import { ElProEditableTable, ElProTable } from '@/index'
import type { ProColumn, ProRequest, ProRequestResult } from '@/index'
import { ALL, delay } from '../data/mock'

interface Row {
  id: number
  name: string
  amount: number
}

const baseColumns: ProColumn<Row>[] = [
  { prop: 'id', label: 'ID', valueType: 'indexBorder', width: 70, search: false },
  { prop: 'name', label: '名称' },
  { prop: 'amount', label: '金额', valueType: 'money' },
]

function makeRows(from: number, count: number): Row[] {
  return Array.from({ length: count }, (_, i) => ({
    id: from + i,
    name: `条目 ${from + i}`,
    amount: (from + i) * 100,
  }))
}

/* ------------------------------ 1. 轮询 ------------------------------ */

let pollSeq = 0
const pollSeqText = ref(0)
const requestPolling: ProRequest<Row> = async () => {
  await delay(200)
  pollSeq += 1
  pollSeqText.value = pollSeq
  return { data: makeRows(pollSeq * 10, 3), total: pollSeq * 10 + 3 }
}

/* --------------------------- 2. postData --------------------------- */

const requestPostData: ProRequest<Row> = async () => {
  await delay(300)
  // 故意返回脏数据：首尾空格 + 小写， postData 里整形
  return {
    data: [
      { id: 1, name: '  alpha  ', amount: 1 },
      { id: 2, name: 'beta', amount: 2 },
    ],
    total: 2,
  }
}

const postData = (list: Row[]) =>
  list.map((row) => ({ ...row, name: row.name.trim().replace(/^\w/, (c) => c.toUpperCase()) }))

/* --------------------------- 3. 假分页 --------------------------- */

const fakePageHits = ref(0)
const requestFakePage: ProRequest<Row> = async () => {
  await delay(300)
  fakePageHits.value += 1
  // 关键：一次性回 25 条、不报 total → 表格自动转本地切片，翻页不再打这里
  return { data: makeRows(1, 25) }
}

/* --------------------------- 4. 游标分页 --------------------------- */

const cursorHits = ref(0)
const cursorTokens = ['', 't1', 't2', 't3']
const requestCursor: ProRequest<Row> = async (params) => {
  await delay(300)
  cursorHits.value += 1
  const pageNo = cursorTokens.indexOf(String(params.nextToken ?? ''))
  const nextToken = cursorTokens[pageNo + 1]
  return {
    data: makeRows(pageNo * 10 + 1, 10),
    // 有 nextToken = 还有下一页；total 表达的是「还有没有」，不是总数
    nextToken: nextToken || undefined,
  } as ProRequestResult<Row>
}

const cursorColumns: ProColumn<Row>[] = [
  ...baseColumns,
  { prop: 'cursor', label: '本页游标', search: false, formatter: () => cursorHits.value.toString() },
]

/* --------------------------- 5. 受控分页 --------------------------- */

/** 受控分页的值用 ref 持有：v-model 回写是整体赋值，const reactive 会抛 Assignment to constant */
const controlledPagination = ref({ current: 2, pageSize: 10 })
const controlledHits = ref(0)
const requestControlled: ProRequest<Row> = async (params) => {
  await delay(300)
  controlledHits.value += 1
  return {
    data: makeRows((params.current - 1) * params.pageSize + 1, params.pageSize),
    total: 87,
  }
}

function jumpToFirst() {
  controlledPagination.value = { ...controlledPagination.value, current: 1 }
}

/* --------------------------- 6. 受控数据 --------------------------- */

const dataSource = ref<Row[]>(makeRows(1, 4))
const controlledColumns: ProColumn<Row>[] = [
  { prop: 'name', label: '名称', rules: [{ required: true, message: '名称必填' }] },
  { prop: 'amount', label: '金额', valueType: 'money' },
  { prop: 'actions', label: '操作', valueType: 'option', width: 160 },
]

const tableRef = ref<InstanceType<typeof ElProTable>>()
const pollingHint = ref(false)
// 轮询态用 getPollingLoading 读：每秒看一眼，够演示用
setInterval(() => {
  pollingHint.value = tableRef.value?.getPollingLoading() ?? false
}, 500)

const dataSourceJson = computed(() => JSON.stringify(dataSource.value))
</script>

<template>
  <div class="data-mode-page">
    <ElAlert
      title="本页演示批次 2 的六个数据生命周期能力，每块都挂了请求计数器，看计数器就知道请求发没发"
      type="info"
      :closable="false"
      show-icon
    />

    <!-- 1. 轮询 -->
    <section>
      <h4>1. 轮询 polling（每 2 秒一次，每次数据 ID 段变化可见）</h4>
      <p class="hint">
        请求计数：{{ pollSeqText }} 次。
        <ElTag v-if="pollingHint" type="warning" size="small">轮询中</ElTag>
        <ElTag v-else type="info" size="small">空闲</ElTag>
      </p>
      <ElProTable
        ref="tableRef"
        :columns="baseColumns"
        :request="requestPolling"
        :polling="2000"
        :search="false"
        title="轮询不打断主 loading，轮询态看右上角标签"
      />
    </section>

    <!-- 2. postData -->
    <section>
      <h4>2. postData 响应整形（后端给的脏数据在写进表格前清洗）</h4>
      <ElProTable
        :columns="baseColumns"
        :request="requestPostData"
        :post-data="postData"
        :search="false"
        title="名称已去空格并首字母大写"
      />
    </section>

    <!-- 3. 假分页 -->
    <section>
      <h4>3. 假分页（一次回全量，翻页在本地切片）</h4>
      <p class="hint">请求计数：{{ fakePageHits }} 次 —— 翻页/改页长这个数字不变，只有刷新会 +1</p>
      <ElProTable
        :columns="baseColumns"
        :request="requestFakePage"
        :search="false"
        title="25 条一次进来，没报 total，自动转本地切片"
      />
    </section>

    <!-- 4. 游标分页 -->
    <section>
      <h4>4. 游标分页 pagination.type='cursor'（请求带 nextToken，不带 current）</h4>
      <p class="hint">请求计数：{{ cursorHits }} 次 —— 只有「下一页」会发请求；跳到未访问页会被钳制（没有游标）</p>
      <ElProTable
        :columns="baseColumns"
        :request="requestCursor"
        :pagination="{ type: 'cursor' }"
        :search="false"
        title="共 4 页游标，翻完即止"
      />
    </section>

    <!-- 5. 受控分页 -->
    <section>
      <h4>5. 受控分页（pagination 传 current/pageSize + v-model:pagination）</h4>
      <p class="hint">
        请求计数：{{ controlledHits }} 次；当前受控状态：第 {{ controlledPagination.current }} 页 / 每页
        {{ controlledPagination.pageSize }} 条 ——
        <ElButton size="small" @click="jumpToFirst">外部跳回第 1 页</ElButton>
        （表格内翻页也会同步回这里）
      </p>
      <ElProTable
        v-model:pagination="controlledPagination"
        :columns="baseColumns"
        :request="requestControlled"
        :search="false"
        title="内外双向同步"
      />
    </section>

    <!-- 6. 受控数据 -->
    <section>
      <h4>6. 受控数据</h4>
      <ElProEditableTable v-model:data-source="dataSource" :columns="controlledColumns" editable :search="false" :pagination="false" row-key="id" />
    </section>
    -->
  </div>
</template>

<style>
.data-mode-page section {
  margin-top: 24px;
}
.data-mode-page h4 {
  margin: 0 0 4px;
  font-size: 14px;
}
.data-mode-page .hint {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
