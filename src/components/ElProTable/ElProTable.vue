<script setup lang="ts">
/**
 * ElProTable —— 列配置驱动的 CRUD 表格。
 *
 * 做了什么：
 * - 由 columns 自动生成搜索栏、表格列、列设置面板（显示/隐藏 + 拖拽排序）
 * - 接管 request 的 loading / 分页 / 排序 / 竞态
 * - 可选的行内编辑（editable），保存/取消/删除由你接 onSave/onDelete
 * - 暴露 action（reload / reloadAndRest / reset / clearSelected / setPage）
 *
 * 没做（有意留白）：
 * - 行拖拽排序：那是业务态（改 sort 字段），和列顺序不是一回事，交给 sortablejs
 * - 受控数据模式（value/onChange，不配 request）：本库定位是「配 request 的 CRUD 页」
 */
import { computed, onBeforeUnmount, reactive, ref, useAttrs, useSlots, watch } from 'vue'
import { ElButton, ElPagination, ElTable, ElTableColumn } from 'element-plus'
import CellRenderer from '../../fields/CellRenderer.vue'
import FormField from '../../fields/FormField.vue'
import { useTable } from '../../core/useTable'
import { applyColumnOrder, isSettableColumn, sortPropsByFixed } from '../../core/column'
import type { ColumnFixedState } from '../../core/column'
import { DISPLAY_ONLY_VALUE_TYPES } from '../../core/valueType'
import type { ProColumn, ProEditableConfig, ProRequest, TableSize } from '../../types'
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
    /** 列状态的 localStorage key。传了就自动持久化（含显示/隐藏与顺序） */
    persistenceKey?: string
    size?: TableSize
    /** 受控列顺序（prop 列表）。不传则内部维护并持久化 */
    columnOrder?: string[]
    /** 受控的固定列状态（prop -> left/right）。不传则内部维护并持久化 */
    columnFixed?: ColumnFixedState
    /** 行内编辑。true 等价于 {} */
    editable?: boolean | ProEditableConfig
    /** 受控的编辑行 key，配合 v-model:editable-keys */
    editableKeys?: (string | number)[]
  }>(),
  {
    rowKey: 'id',
    search: true,
    defaultCollapsed: true,
    defaultPageSize: 20,
    immediate: true,
    size: 'default',
    /*
     * 下面几项必须给显式 default。
     * 它们的类型是「对象 | false」或「数组」，Vue 会推断出运行时类型含 Boolean，
     * 而 Boolean casting 的规则是：没有 default 且未传值时强制为 false。
     * 不给 default 的话，`options` 会变成 false（图标全消失）、
     * `pagination` 会变成 false（分页器直接不渲染）、`emptyText` 变成 false（空值占位失效）。
     * editable 例外：我们要的默认值就是 false，所以故意不给。
     */
    options: () => ({ reload: true, density: true, setting: true, fullscreen: true }),
    pagination: () => ({}),
    emptyText: '-',
    columnOrder: () => [],
    // 同 options/pagination：类型含 Boolean/对象，不给 default 会被 cast 成 false
    columnFixed: () => ({} as ColumnFixedState),
  },
)

const emit = defineEmits<{
  load: [any[]]
  error: [Error]
  'selection-change': [any[]]
  'update:columnOrder': [string[]]
  'update:columnFixed': [ColumnFixedState]
  'update:editableKeys': [(string | number)[]]
  /** 可编辑表格里数据发生变化（保存 / 删除 / 新增）后派发 */
  change: [any[]]
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
/** 顺序单独存一个 key：老的 columnState 是纯 Record<string, boolean>，混进去要迁移 */
const ORDER_STORAGE_PREFIX = 'el-pro-table-order:'
/** 固定列同样单独存，理由同上 */
const FIXED_STORAGE_PREFIX = 'el-pro-table-fixed:'

/**
 * 读写 localStorage 的三处都要 try/catch：
 * 隐私模式、禁用 cookie、配额写满都会抛，不能让表格因此白屏。
 */
function readJSON<T>(key: string, fallback: T): T {
  if (!props.persistenceKey) return fallback
  try {
    const raw = localStorage.getItem(key + props.persistenceKey)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJSON(key: string, value: unknown) {
  if (!props.persistenceKey) return
  try {
    localStorage.setItem(key + props.persistenceKey, JSON.stringify(value))
  } catch {
    /* 忽略 */
  }
}

const columnState = ref<Record<string, boolean>>(
  readJSON<Record<string, boolean>>(STORAGE_PREFIX, {}),
)

watch(
  columnState,
  (val) => writeJSON(STORAGE_PREFIX, val),
  { deep: true },
)

/** 用户拖出来的列顺序。空数组 = 用 columns 的原始顺序 */
const columnOrder = ref<string[]>(
  props.columnOrder.length ? [...props.columnOrder] : readJSON<string[]>(ORDER_STORAGE_PREFIX, []),
)

watch(
  columnOrder,
  (val) => writeJSON(ORDER_STORAGE_PREFIX, val),
  { deep: true },
)

// 外部传了受控顺序就听外部的
watch(
  () => props.columnOrder,
  (val) => {
    columnOrder.value = [...(val ?? [])]
  },
  { deep: true },
)

/** 用户设置的固定列。空对象 = 全部用 columns 定义里的 fixed */
const columnFixed = ref<ColumnFixedState>(
  Object.keys(props.columnFixed).length
    ? { ...props.columnFixed }
    : readJSON<ColumnFixedState>(FIXED_STORAGE_PREFIX, {}),
)

watch(
  columnFixed,
  (val) => writeJSON(FIXED_STORAGE_PREFIX, val),
  { deep: true },
)

watch(
  () => props.columnFixed,
  (val) => {
    if (val) columnFixed.value = { ...val }
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

/* ------------------------------ 行内编辑 ------------------------------ */

const editableConfig = computed<ProEditableConfig | null>(() => {
  const e = props.editable
  if (!e) return null
  return e === true ? {} : e
})

/**
 * 临时行 key。
 * 新增的行还没有后端 id，row[rowKey] 是空的，拿不到稳定 key 就没法区分「正在编辑哪一行」。
 *
 * 关键：临时 key 必须**写在行对象自身上**，不能用 WeakMap 按引用存。
 * el-table 的 store 里 `const _data = ref([])` 是深度响应式的，插槽拿到的 `row`
 * 是原始行对象的 **Proxy**。代理和原始对象的引用不同，WeakMap 查不到同一个 key，
 * 表现就是「新行点了没反应、删不掉」。
 * 用 Symbol 当键，JSON.stringify / 展开进请求体都不会带上它。
 */
const TMP_ROW_KEY = Symbol('proTmpRowKey')
const tmpRowKeys = new WeakMap<object, string>()
let tmpSeq = 0

/** 给新增行打上临时 key（只在 addRow 里调用，避免在渲染期间改状态） */
function stampTmpKey(row: any): string {
  if (row && typeof row === 'object' && !row[TMP_ROW_KEY]) {
    row[TMP_ROW_KEY] = `__new_${++tmpSeq}`
  }
  return row?.[TMP_ROW_KEY]
}

function keyOf(row: any): string | number {
  const raw = row?.[props.rowKey]
  if (raw !== undefined && raw !== null && raw !== '') return raw
  const stamped = row?.[TMP_ROW_KEY]
  if (stamped) return stamped
  // 兜底：对象上没有临时 key（外部直接喂进来的无 id 行），仍按引用存一份
  let tmp = tmpRowKeys.get(row)
  if (!tmp) {
    tmp = `__new_${++tmpSeq}`
    tmpRowKeys.set(row, tmp)
  }
  return tmp
}

const editingKeys = ref<(string | number)[]>(
  props.editableKeys ? [...props.editableKeys] : [],
)

watch(
  () => props.editableKeys,
  (val) => {
    if (val) editingKeys.value = [...val]
  },
  { deep: true },
)

function setEditingKeys(keys: (string | number)[]) {
  editingKeys.value = keys
  emit('update:editableKeys', keys)
}

/**
 * 编辑草稿。保存前只改草稿，`data` 里的原对象不动 ——
 * 这样「取消」才有意义，也不会因为 el-table 复用行对象而串行。
 */
const drafts = reactive<Record<string, any>>({})

const savingKey = ref<string | number | null>(null)

function isEditing(row: any) {
  return !!editableConfig.value && editingKeys.value.includes(keyOf(row))
}

/** 草稿还没建立时退回原行，保证模板里取值永远是安全的 */
function draftOf(row: any): Record<string, any> {
  return drafts[String(keyOf(row))] ?? row
}

function setDraftValue(row: any, prop: string, value: any) {
  const key = String(keyOf(row))
  if (!drafts[key]) drafts[key] = { ...row }
  drafts[key][prop] = value
}

/** 纯展示型的列默认不进编辑态，否则点开一行会出现一堆没意义的输入框 */
function canEditCell(row: any, col: ProColumn, index: number) {
  if (!col.prop) return false
  if (col.editable === false) return false
  if (typeof col.editable === 'function') return col.editable(row, index)
  if (col.editable === true) return true
  return !DISPLAY_ONLY_VALUE_TYPES.includes(col.valueType ?? 'text')
}

function isEditCell(row: any, col: ProColumn, index: number) {
  return isEditing(row) && canEditCell(row, col, index)
}

/**
 * 保存一行。返回 false 表示没存成功（校验失败 / 接口报错），
 * 此时**不退出编辑态、不写回数据**，让用户能改完再存。
 */
async function saveRow(row: any): Promise<boolean> {
  const key = keyOf(row)
  const draft = drafts[String(key)]
  if (!draft) return true

  // 插槽里的 row 可能是 Proxy，indexOf 比不到；统一按 key 定位
  const index = data.value.findIndex((r) => String(keyOf(r)) === String(key))
  savingKey.value = key
  try {
    const res = await editableConfig.value?.onSave?.(key, { ...draft }, index)
    if (res === false) return false
    // 回包带主键的话合并进来：新增行从此有了真 id，后续编辑/删除不用再靠临时 key
    if (res && typeof res === 'object') {
      Object.assign(draft, res)
      if (draft[TMP_ROW_KEY]) delete draft[TMP_ROW_KEY]
    }
  } catch {
    // 接口炸了也留在编辑态：把用户刚填的东西丢了才是真事故
    return false
  } finally {
    savingKey.value = null
  }

  Object.assign(row, draft)
  // 拿到真主键了就把临时 key 从行对象上摘掉，别留个容易误导的残渣
  if (row?.[props.rowKey] !== undefined && row?.[props.rowKey] !== null && row?.[props.rowKey] !== '') {
    delete row[TMP_ROW_KEY]
  }
  delete drafts[String(key)]
  setEditingKeys(editingKeys.value.filter((k) => String(k) !== String(key)))
  // data 是 shallowRef，改行对象内部字段不会触发更新，必须换数组引用
  data.value = [...data.value]
  emit('change', data.value)
  return true
}

async function startEdit(row: any) {
  const cfg = editableConfig.value
  if (!cfg) return
  const key = keyOf(row)
  if (editingKeys.value.includes(key)) return

  // 单行模式：换行前先把上一行存掉，存失败就不切，避免静默丢输入
  if (cfg.type !== 'multiple') {
    const prevKey = editingKeys.value[0]
    if (prevKey !== undefined) {
      const prevRow = data.value.find((r) => String(keyOf(r)) === String(prevKey))
      if (prevRow && !(await saveRow(prevRow))) return
    }
  }

  drafts[String(key)] = { ...row }
  setEditingKeys(cfg.type === 'multiple' ? [...editingKeys.value, key] : [key])
}

function cancelRow(row: any) {
  const key = keyOf(row)
  delete drafts[String(key)]
  setEditingKeys(editingKeys.value.filter((k) => String(k) !== String(key)))
  editableConfig.value?.onCancel?.(key, row)
}

async function removeRow(row: any) {
  const key = keyOf(row)
  const index = data.value.findIndex((r) => String(keyOf(r)) === String(key))
  try {
    const ok = await editableConfig.value?.onDelete?.(key, row, index)
    if (ok === false) return
  } catch {
    return
  }
  delete drafts[String(key)]
  // 同样不能靠引用比较：插槽传来的是 Proxy
  data.value = data.value.filter((r) => String(keyOf(r)) !== String(key))
  total.value = Math.max(0, total.value - 1)
  setEditingKeys(editingKeys.value.filter((k) => String(k) !== String(key)))
  emit('change', data.value)
}

/** 新增行的初始值：优先 newRecord，否则拿各列的 defaultValue 拼一个 */
function defaultRecord(): Record<string, any> {
  const rec: Record<string, any> = {}
  for (const col of props.columns) {
    if (!col.prop || col.defaultValue === undefined) continue
    rec[col.prop] = Array.isArray(col.defaultValue) ? [...col.defaultValue] : col.defaultValue
  }
  return rec
}

async function addRow() {
  const cfg = editableConfig.value
  if (!cfg) return
  const row = cfg.newRecord ? cfg.newRecord(data.value.length) : defaultRecord()
  // 先把临时 key 打到对象上，之后无论是原始对象还是 el-table 的 Proxy 都能取到同一个 key
  stampTmpKey(row)
  data.value = [row, ...data.value]
  total.value += 1
  emit('change', data.value)
  await startEdit(row)
}

const showAddRow = computed(() => !!editableConfig.value && editableConfig.value.addable !== false)
const showDeleteRow = computed(() => !!editableConfig.value && editableConfig.value.deletable !== false)

/**
 * el-table 的 row-key。编辑态下必须用「含临时 key」的取值函数，否则新增行没有 id，
 * 表格复用行节点时会串行。函数的返回类型被限定为 string，所以统一 String() 一下。
 */
const tableRowKey = computed<string | ((row: any) => string)>(() =>
  editableConfig.value ? (row: any) => String(keyOf(row)) : props.rowKey,
)

/** 数据重新加载后，把已经失效的编辑态清掉（否则会拿着上一页的草稿） */
watch(data, (list) => {
  if (!editableConfig.value) return
  const alive = new Set(list.map((r) => String(keyOf(r))))
  const keys = editingKeys.value.filter((k) => alive.has(String(k)))
  if (keys.length !== editingKeys.value.length) setEditingKeys(keys)
  for (const k of Object.keys(drafts)) {
    if (!alive.has(k)) delete drafts[k]
  }
})

/** 没写 option 列时自动补一个操作列，否则进入编辑态后没有任何按钮可以点 */
const editActionColumn: ProColumn = {
  valueType: 'option',
  label: '操作',
  width: 150,
  fixed: 'right',
  hideInSetting: true,
}

/* ------------------------------ 渲染列 ------------------------------ */

/** 应用用户拖拽顺序后的列。顺序只作用于可设置列，操作列/索引列原地不动 */
const orderedColumns = computed<ProColumn[]>(() => {
  let cols = applyColumnOrder(tableColumns.value, columnOrder.value)
  // 用户设置的固定列覆盖 columns 里的 fixed（用户操作优先于代码里的默认值）
  if (Object.keys(columnFixed.value).length) {
    cols = cols.map((c) =>
      c.prop && columnFixed.value[c.prop] ? { ...c, fixed: columnFixed.value[c.prop] } : c,
    )
  }
  if (!editableConfig.value) return cols
  if (cols.some((c) => c.valueType === 'option')) return cols
  return [...cols, editActionColumn]
})

/** 表格真正渲染的列：再受列设置面板的显隐控制 */
const renderColumns = computed(() =>
  orderedColumns.value.filter((c) => {
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

function onColumnOrderChange(val: string[]) {
  columnOrder.value = val
  emit('update:columnOrder', val)
}

function onColumnFixedChange(val: ColumnFixedState) {
  columnFixed.value = val
  emit('update:columnFixed', val)
}

/**
 * 处理「固定到列首/列尾」。同位置再点一次 = 取消。
 *
 * 新状态在这里算，而不是在 TableToolbar 里拼：工具栏拿的是 props 快照，
 * 连续点两列时第二次会基于旧值覆盖第一次。
 *
 * 固定一变必须顺带重排顺序并写回 order。el-table 的 fixed 是 sticky + 逐列累加
 * offset，固定列夹在中间会被普通列盖住 —— 只亮按钮不动位置，比不给这个功能更糟。
 */
function onPin(prop: string, target: 'left' | 'right') {
  const next: ColumnFixedState = { ...columnFixed.value }
  if (next[prop] === target) delete next[prop]
  else next[prop] = target

  onColumnFixedChange(next)

  const settableProps = orderedColumns.value.filter(isSettableColumn).map((c) => c.prop!)
  onColumnOrderChange(sortPropsByFixed(settableProps, next))
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
  /* ---- 行内编辑 ---- */
  startEdit,
  saveRow,
  cancelRow,
  removeRow,
  addRow,
  getEditingKeys: () => editingKeys.value,
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
        :columns="orderedColumns"
        :column-state="columnState"
        :column-fixed="columnFixed"
        :size="tableSize"
        :fullscreen="fullscreen"
        :loading="loading"
        :options="options"
        @refresh="handleRefresh"
        @update:column-state="onColumnStateChange"
        @update:column-order="onColumnOrderChange"
        @update:column-fixed="onColumnFixedChange"
        @pin="onPin"
        @update:size="onTableSizeChange"
        @update:fullscreen="onFullscreenChange"
      >
        <template v-if="$slots.toolbar" #title>
          <slot name="toolbar" />
        </template>
        <template #actions>
          <ElButton v-if="showAddRow" type="primary" size="small" @click="addRow">新增一行</ElButton>
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
        :row-key="tableRowKey"
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
              :editing="isEditing(row)"
              :edit="() => startEdit(row)"
              :save="() => saveRow(row)"
              :cancel="() => cancelRow(row)"
              :remove="() => removeRow(row)"
            />
            <component
              :is="col.cellComponent"
              v-else-if="col.cellComponent"
              :row="row"
              :column="col"
              :index="$index"
              :value="col.prop ? row[col.prop] : undefined"
            />
            <!-- 编辑态：直接复用表单那套控件，valueType 词汇全场统一 -->
            <FormField
              v-else-if="isEditCell(row, col, $index)"
              :model-value="col.prop ? draftOf(row)[col.prop] : undefined"
              :column="col"
              @update:model-value="(v: any) => col.prop && setDraftValue(row, col.prop, v)"
            />
            <!-- 可编辑表格的操作列 -->
            <template v-else-if="editableConfig && col.valueType === 'option'">
              <slot
                name="editableActions"
                :row="row"
                :column="col"
                :index="$index"
                :editing="isEditing(row)"
                :edit="() => startEdit(row)"
                :save="() => saveRow(row)"
                :cancel="() => cancelRow(row)"
                :remove="() => removeRow(row)"
              >
                <div class="el-pro-table__row-actions">
                  <template v-if="isEditing(row)">
                    <ElButton
                      link
                      type="primary"
                      size="small"
                      :loading="savingKey === keyOf(row)"
                      @click="saveRow(row)"
                    >
                      保存
                    </ElButton>
                    <ElButton link size="small" @click="cancelRow(row)">取消</ElButton>
                    <ElButton
                      v-if="showDeleteRow"
                      link
                      type="danger"
                      size="small"
                      @click="removeRow(row)"
                    >
                      删除
                    </ElButton>
                  </template>
                  <template v-else>
                    <ElButton link type="primary" size="small" @click="startEdit(row)">编辑</ElButton>
                    <ElButton
                      v-if="showDeleteRow"
                      link
                      type="danger"
                      size="small"
                      @click="removeRow(row)"
                    >
                      删除
                    </ElButton>
                  </template>
                </div>
              </slot>
            </template>
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
/* ---- 行内编辑 ---- */
.el-pro-table__row-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 2px 4px;
}
.el-pro-table__row-actions .el-button + .el-button {
  margin-left: 0;
}
/* 编辑中的单元格：控件本身有边框，单元格内边距压一点，行高才不至于炸开 */
.el-pro-table__table .cell .el-pro-field--full {
  width: 100%;
}
.el-pro-table__table .el-input-number.el-pro-field--full {
  min-width: 90px;
}
</style>
