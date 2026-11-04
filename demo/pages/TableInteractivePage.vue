<script setup lang="ts">
/**
 * 表格交互增强示例：批次 3 的七项能力逐块演示。
 * 数据故意带重复分类（合并单元格）与 sort 字段（行拖拽）。
 */
import { ref } from 'vue'
import { ElAlert, ElMessage } from 'element-plus'
import { ElProTable } from '@/index'
import type { ProColumn, ProRequest, ProRequestResult } from '@/index'
import { delay } from '../data/mock'

interface Row {
  id: number
  category: string
  name: string
  amount: number
  sort: number
}

function makeRows(): Row[] {
  const cats = ['华东', '华东', '华东', '华北', '华北', '华南']
  return cats.flatMap((category, i) => [
    { id: i + 1, category, name: `${category}-A${i + 1}`, amount: (i + 1) * 100, sort: i + 1 },
  ])
}

const allRows = makeRows()

const baseColumns: ProColumn<Row>[] = [
  { prop: 'id', label: 'ID', valueType: 'indexBorder', width: 64, search: false },
  { prop: 'category', label: '分类', valueType: 'tag' },
  { prop: 'name', label: '名称' },
  { prop: 'amount', label: '金额', valueType: 'money' },
]

const requestRows: ProRequest<Row> = async (params) => {
  await delay(250)
  const start = (params.current - 1) * params.pageSize
  return { data: allRows.slice(start, start + params.pageSize), total: allRows.length }
}

/* --------------------------- 1. 新增行增强 --------------------------- */

const creatorSource = ref<Row[]>(makeRows().slice(0, 3))

/* --------------------------- 2. 列显隐受控 --------------------------- */

const columnState = ref<Record<string, boolean>>({ name: false })

function toggleName(show: boolean) {
  columnState.value = { ...columnState.value, name: show }
}

/* --------------------------- 3. 工具栏搜索 --------------------------- */

const searchHits = ref(0)
const requestSearch: ProRequest<Row> = async (params) => {
  await delay(250)
  searchHits.value += 1
  const kw = String(params.keyword ?? '')
  const list = kw ? allRows.filter((r) => r.name.includes(kw) || r.category.includes(kw)) : allRows
  return { data: list.slice(0, params.pageSize), total: list.length }
}

/* --------------------------- 5. 合并单元格 --------------------------- */

const requestMerge: ProRequest<Row> = async () => {
  await delay(250)
  return { data: allRows, total: allRows.length }
}

/* --------------------------- 6. 行拖拽 --------------------------- */

const dragData = ref<Row[]>(makeRows())

/* --------------------------- 7. 列设置 + summary --------------------------- */

function summaryMethod({ columns, data }: any) {
  return columns.map((col: any, i: number) => {
    if (i === 0) return `合计 ${data.length} 行`
    if (col.property === 'amount') return `¥${data.reduce((s: number, r: Row) => s + (r.amount || 0), 0)}`
    return ''
  })
}

function onDragSortEnd(rows: Row[]) {
  ElMessage.success(`拖拽完成，新顺序：${rows.map((r) => r.name).join('、')}`)
}
</script>

<template>
  <div class="table-interactive-page">
    <ElAlert
      title="本页演示批次 3 的表格交互增强，每块对应一项能力"
      type="info"
      :closable="false"
      show-icon
    />

    <!-- 1. 新增行增强 -->
    <section>
      <h4>1. 新增行增强：position='bottom' + maxLength（加满 6 行按钮消失）</h4>
      <ElProTable
        :columns="baseColumns"
        :data-source="creatorSource"
        @update:data-source="creatorSource = $event"
        :search="false"
        :pagination="false"
        row-key="id"
        :editable="{
          recordCreator: { position: 'bottom', text: '追加一行' },
          maxLength: 6,
        }"
      />
    </section>

    <!-- 2. 列显隐受控 + sessionStorage -->
    <section>
      <h4>2. 列显隐受控（v-model:column-state）+ persistenceType='sessionStorage'</h4>
      <p class="hint">
        外部按钮直接改显隐状态：
        <button class="demo-link" @click="toggleName(true)">显示「名称」列</button>
        <button class="demo-link" @click="toggleName(false)">隐藏「名称」列</button>
        —— 表格内的列设置面板（齿轮）也会同步；刷新页面后状态仍在（sessionStorage）
      </p>
      <ElProTable
        v-model:column-state="columnState"
        :columns="baseColumns"
        :request="requestRows"
        :search="false"
        persistence-key="interactive-columns"
        persistence-type="sessionStorage"
      />
    </section>

    <!-- 3. 工具栏关键字搜索 -->
    <section>
      <h4>3. 工具栏关键字搜索（options.search，关键字并入请求参数 keyword）</h4>
      <p class="hint">请求计数：{{ searchHits }} 次 —— 输入「华东」或「A1」回车，看表格过滤</p>
      <ElProTable
        :columns="baseColumns"
        :request="requestSearch"
        :search="false"
        :options="{ search: { name: 'keyword', placeholder: '输入分类或名称' } }"
      />
    </section>

    <!-- 4. 合并单元格 -->
    <section>
      <h4>4. 同值单元格合并（mergeFields=['category']，连续同分类纵向合并）</h4>
      <ElProTable
        :columns="baseColumns"
        :request="requestMerge"
        :search="false"
        :pagination="false"
        :merge-fields="['category']"
        border
      />
    </section>

    <!-- 5. 行拖拽 -->
    <section>
      <h4>5. 行拖拽排序（dragSortKey='sort'，拖「排序」列的把手）</h4>
      <ElProTable
        :columns="[
          { prop: 'sort', label: '排序', width: 70 },
          { prop: 'name', label: '名称' },
          { prop: 'amount', label: '金额', valueType: 'money' },
        ]"
        :data-source="dragData"
        @update:data-source="dragData = $event"
        drag-sort-key="sort"
        :search="false"
        :pagination="false"
        row-key="id"
        @drag-sort-end="onDragSortEnd"
      />
    </section>

    <!-- 6. 列设置配置项 + summary -->
    <section>
      <h4>6. 列设置面板配置项（listHeight/checkable/draggable）+ summary 合计行</h4>
      <p class="hint">点工具栏齿轮：面板限高 160px、可拖拽排序；合计行走 ElTable 原生 summary-method</p>
      <ElProTable
        :columns="baseColumns"
        :request="requestRows"
        :search="false"
        :column-setting="{ listHeight: 160, checkable: true, draggable: true }"
        show-summary
        :summary-method="summaryMethod"
      />
    </section>
  </div>
</template>

<style>
.table-interactive-page section {
  margin-top: 24px;
}
.table-interactive-page h4 {
  margin: 0 0 4px;
  font-size: 14px;
}
.table-interactive-page .hint {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.table-interactive-page .demo-link {
  margin: 0 4px;
  padding: 2px 8px;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  background: var(--el-bg-color);
  font-size: 12px;
  cursor: pointer;
}
</style>
