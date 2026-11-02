<script setup lang="ts">
/**
 * ElProTable —— 列配置驱动的 CRUD 表格。
 *
 * 做了什么：
 * - 由 columns 自动生成搜索栏、表格列、列设置面板
 * - 接管 request 的 loading / 分页 / 排序 / 竞态
 * - 暴露 action（reload / reloadAndRest / reset / clearSelected / setPage）
 *
 * 没做（有意留白）：
 * - 可编辑行（editable table）：Element Plus 的编辑态更适合用插槽直写，硬封装反而受限
 * - 拖拽排序：依赖 sortablejs，留给使用方按需接入
 */
import { computed, onBeforeUnmount, ref, useAttrs, useSlots, watch } from 'vue'
import { ElPagination, ElTable, ElTableColumn } from 'element-plus'
import CellRenderer from '../../fields/CellRenderer.vue'
import { useTable } from '../../core/useTable'
import type { ProColumn, ProRequest, TableSize } from '../../types'
import SearchForm from './SearchForm.vue'
import TableToolbar from './TableToolbar.vue'

defineOptions({ name: 'ElProTable', inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    columns: ProColumn[]
    request?: ProRequest
    /** 额外查询参数，变化会自动触发重新请求，且优先级高于搜索表单 */
    params?: Record<string, any>
    rowKey?: string
    title?: string
    tooltip?: string
    /** 是否显示搜索栏 */
    search?: boolean
    defaultCollapsed?: boolean
    /** 工具栏图标开关 */
    options?: {
      reload?: boolean
      density?: boolean
      setting?: boolean
      fullscreen?: boolean
    } | false
    /** 是否显示多选列 */
    selection?: boolean
    /** 分页配置，传 false 关闭 */
    pagination?: false | { pageSizes?: number[]; layout?: string }
    defaultPageSize?: number
    /** 关闭时会话内不自动请求，需手动调 action.reload() */
    immediate?: boolean
    /** 后端参数名与内部不一致时用它转换 */
    paramsAdapter?: (params: any) => any
    emptyText?: string | false
    /** 列状态的 localStorage key。传了就自动持久化 */
    persistenceKey?: string
    size?: TableSize
  }>(),
  {
    rowKey: 'id',
    search: true,
    defaultCollapsed: true,
    defaultPageSize: 20,
    immediate: true,
    size: 'default',
    /*
     * 下面三项必须给显式 default。
     * 它们的类型是「对象 | false」，Vue 会推断出运行时类型含 Boolean，
     * 而 Boolean casting 的规则是：没有 default 且未传值时强制为 false。
     * 不给 default 的话，`options` 会变成 false（图标全消失）、
     * `pagination` 会变成 false（分页器直接不渲染）、`emptyText` 变成 false（空值占位失效）。
     * 给了 default 之后 Vue 就不会再 cast。
     */
    options: () => ({ reload: true, density: true, setting: true, fullscreen: true }),
    pagination: () => ({}),
    emptyText: '-',
  },
)

const emit = defineEmits<{
  load: [any[]]
  error: [Error]
  'selection-change': [any[]]
}>()

const attrs = useAttrs()
const slots = useSlots()

/** Element Plus 的 ElTable 是函数式组件，InstanceType 取不到实例类型，
 *  这里只声明实际用到的那一个方法 */
interface TableExpose {
  clearSelection: () => void
}

const tableRef = ref<TableExpose>()

/* ------------------------------ 列状态 ------------------------------ */

const STORAGE_PREFIX = 'el-pro-table:'

function readColumnState(): Record<string, boolean> {
  if (!props.persistenceKey) return {}
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + props.persistenceKey)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

const columnState = ref<Record<string, boolean>>(readColumnState())

watch(
  columnState,
  (val) => {
    if (!props.persistenceKey) return
    try {
      localStorage.setItem(STORAGE_PREFIX + props.persistenceKey, JSON.stringify(val))
    } catch {
      /* 隐私模式下 localStorage 可能不可写，忽略 */
    }
  },
  { deep: true },
)

const tableSize = ref<TableSize>(props.size)
const fullscreen = ref(false)

/* ------------------------------ 数据 ------------------------------ */

const table = useTable({
  columns: () => props.columns,
  request: props.request,
  params: () => props.params,
  defaultPageSize: props.defaultPageSize,
  immediate: props.immediate,
  paramsAdapter: props.paramsAdapter,
  onLoad: (data) => emit('load', data),
  onError: (err) => emit('error', err),
})

const { data, loading, total, current, pageSize, searchValues, tableColumns, searchColumns } = table

const showSearch = computed(() => props.search && searchColumns.value.length > 0)

/** 表格真正渲染的列：受列设置面板控制 */
const renderColumns = computed(() =>
  tableColumns.value.filter((c) => {
    if (!c.prop) return true
    // 索引列和操作列不允许被隐藏，否则用户会把自己锁死
    if (c.valueType === 'index' || c.valueType === 'indexBorder' || c.valueType === 'option') return true
    if (c.disableSetting) return true
    return columnState.value[c.prop] !== false
  }),
)

const selectedCount = computed(() => table.selectedKeys.value.length)

/* ------------------------------ 全屏 ------------------------------ */

function toggleBodyScroll(lock: boolean) {
  if (typeof document === 'undefined') return
  document.body.style.overflow = lock ? 'hidden' : ''
}

watch(fullscreen, (val) => toggleBodyScroll(val))

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && fullscreen.value) fullscreen.value = false
}

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', onKeydown)
}

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') window.removeEventListener('keydown', onKeydown)
  toggleBodyScroll(false)
})

/* ------------------------------ 交互 ------------------------------ */

function handleRefresh() {
  void table.action.reload()
}

function onColumnStateChange(val: Record<string, boolean>) {
  columnState.value = val
}

function onTableSizeChange(val: TableSize) {
  tableSize.value = val
}

function onFullscreenChange(val: boolean) {
  fullscreen.value = val
}

function handleReset() {
  void table.action.reset()
}

function clearSelected() {
  tableRef.value?.clearSelection()
  table.clearSelected()
}

function handleSelectionChange(rows: any[]) {
  table.selectedRows.value = rows
  table.selectedKeys.value = rows.map((r) => r[props.rowKey])
  emit('selection-change', rows)
}

watch(
  () => props.request,
  () => void table.action.reload(true),
)

/** 列插槽名：优先用 prop，操作列没写 prop 时用 'option' */
function slotName(col: ProColumn) {
  return String(col.prop ?? (col.valueType === 'option' ? 'option' : ''))
}

function hasSlot(col: ProColumn) {
  const name = slotName(col)
  return !!name && !!slots[name]
}

defineExpose({
  reload: table.action.reload,
  reloadAndRest: table.action.reloadAndRest,
  reset: table.action.reset,
  clearSelected,
  setPage: table.action.setPage,
  /** 拿到内部数据，便于在外部做导出等操作 */
  getData: () => data.value,
  getSelected: () => table.selectedRows.value,
})
</script>

<template>
  <div class="el-pro-table" :class="{ 'is-fullscreen': fullscreen }">
    <SearchForm
      v-if="showSearch"
      :columns="searchColumns"
      :values="searchValues"
      :loading="loading"
      :default-collapsed="defaultCollapsed"
      @search="table.submitSearch()"
      @reset="handleReset"
    />

    <div class="el-pro-table__body">
      <TableToolbar
        :title="title"
        :tooltip="tooltip"
        :columns="tableColumns"
        :column-state="columnState"
        :size="tableSize"
        :fullscreen="fullscreen"
        :loading="loading"
        :options="options"
        @refresh="handleRefresh"
        @update:column-state="onColumnStateChange"
        @update:size="onTableSizeChange"
        @update:fullscreen="onFullscreenChange"
      >
        <template v-if="$slots.toolbar" #title>
          <slot name="toolbar" />
        </template>
        <template v-if="$slots.toolbarActions" #actions>
          <slot name="toolbarActions" />
        </template>
      </TableToolbar>

      <div v-if="selection && selectedCount" class="el-pro-table__batch">
        <span class="el-pro-table__batch-text">
          已选 <b>{{ selectedCount }}</b> 项
          <a class="el-pro-table__batch-clear" @click="clearSelected">清空</a>
        </span>
        <span class="el-pro-table__batch-actions">
          <slot name="batch" :selected="table.selectedRows.value" :clear="clearSelected" />
        </span>
      </div>

      <ElTable
        ref="tableRef"
        v-loading="loading"
        :data="data"
        :row-key="rowKey"
        :size="tableSize"
        class="el-pro-table__table"
        v-bind="attrs"
        @sort-change="table.handleSortChange"
        @selection-change="handleSelectionChange"
      >
        <ElTableColumn v-if="selection" type="selection" width="46" :reserve-selection="!!rowKey" />

        <ElTableColumn
          v-for="col in renderColumns"
          :key="slotName(col) || col.label"
          :prop="col.prop"
          :label="col.label"
          :width="col.width"
          :min-width="col.minWidth"
          :fixed="col.fixed ?? (col.valueType === 'option' ? 'right' : undefined)"
          :align="col.align ?? (col.valueType === 'option' ? 'center' : undefined)"
          :header-align="col.headerAlign"
          :sortable="col.sortable"
          :sort-method="col.sortMethod"
          :sort-by="col.sortBy"
          :show-overflow-tooltip="col.showOverflowTooltip"
          :class-name="col.className"
          :label-class-name="col.labelClassName"
          :resizable="col.resizable"
          :formatter="col.formatter"
        >
          <template #default="{ row, $index }">
            <slot
              v-if="hasSlot(col)"
              :name="slotName(col)"
              :row="row"
              :column="col"
              :index="$index"
              :value="col.prop ? row[col.prop] : undefined"
            />
            <component
              :is="col.cellComponent"
              v-else-if="col.cellComponent"
              :row="row"
              :column="col"
              :index="$index"
              :value="col.prop ? row[col.prop] : undefined"
            />
            <CellRenderer
              v-else
              :value="col.prop ? row[col.prop] : undefined"
              :column="col"
              :row="row"
              :index="$index"
              :empty-text="emptyText"
            />
          </template>

          <template v-if="col.showOverflowTooltip === false" #header>
            {{ col.label }}
          </template>
        </ElTableColumn>

        <template #empty>
          <slot name="empty">
            <div class="el-pro-table__empty">
              <svg viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="8" y="12" width="32" height="26" rx="3" />
                <path d="M8 20h32M18 12v26" stroke-linecap="round" />
              </svg>
              <p>暂无数据</p>
            </div>
          </slot>
        </template>
      </ElTable>

      <div v-if="pagination !== false" class="el-pro-table__footer">
        <ElPagination
          :current-page="current"
          :page-size="pageSize"
          :total="total"
          :page-sizes="(typeof pagination === 'object' && pagination.pageSizes) || [10, 20, 50, 100]"
          :layout="(typeof pagination === 'object' && pagination.layout) || 'total, sizes, prev, pager, next, jumper'"
          background
          @current-change="table.handlePageChange"
          @size-change="table.handlePageSizeChange"
        />
      </div>
    </div>
  </div>
</template>

<style>
.el-pro-table {
  position: relative;
}
.el-pro-table__body {
  padding: 16px;
  background: var(--el-bg-color);
  border-radius: var(--el-border-radius-base);
  border: 1px solid var(--el-border-color-lighter);
}
.el-pro-table.is-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 2048;
  padding: 16px;
  overflow: auto;
  background: var(--el-bg-color-page, #f5f7fa);
  box-sizing: border-box;
}
.el-pro-table.is-fullscreen .el-pro-table__body {
  min-height: calc(100vh - 32px);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}
.el-pro-table.is-fullscreen .el-pro-table__table {
  flex: 1;
}
.el-pro-table__batch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  margin-bottom: 12px;
  font-size: 13px;
  border-radius: var(--el-border-radius-base);
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-7);
  color: var(--el-text-color-regular);
}
.el-pro-table__batch-text b {
  color: var(--el-color-primary);
  font-weight: 500;
}
.el-pro-table__batch-clear {
  margin-left: 8px;
  color: var(--el-color-primary);
  cursor: pointer;
}
.el-pro-table__batch-actions {
  display: inline-flex;
  gap: 8px;
}
.el-pro-table__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 0;
  color: var(--el-text-color-placeholder);
  font-size: 13px;
}
.el-pro-table__footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
}
</style>
