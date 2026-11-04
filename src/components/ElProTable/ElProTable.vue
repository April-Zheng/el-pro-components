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
import { computed, nextTick, onBeforeUnmount, provide, reactive, ref, toRef, useAttrs, useSlots, watch } from 'vue'
import type { Slots } from 'vue'
import { ElButton, ElMessage, ElPagination, ElTable, ElTableColumn } from 'element-plus'
import Schema from 'async-validator'
import Sortable from 'sortablejs'
import { useTable } from '../../core/useTable'
import {
  applyColumnOrder,
  filterVisibleColumns,
  isSettableColumn,
  sortPropsByFixed,
} from '../../core/column'
import type { ColumnFixedState } from '../../core/column'
import { PRO_TABLE_CELL } from '../../core/tableCellContext'
import { DISPLAY_ONLY_VALUE_TYPES } from '../../core/valueType'
import type { ProColumn, ProEditableConfig, ProRequest, TableSize } from '../../types'
import SearchForm from './SearchForm.vue'
import TableColumnNode from './TableColumnNode.vue'
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
    /** 工具栏图标开关。search 传 true 开启工具栏关键字搜索（参数名默认 keyword），对象可配 name/placeholder */
    options?: {
      reload?: boolean
      density?: boolean
      setting?: boolean
      fullscreen?: boolean
      search?: boolean | { name?: string; placeholder?: string }
    } | false
    /** 是否显示多选列 */
    selection?: boolean | { /** 跨页保留选中（默认开，前提是 rowKey 稳定） */ reserveSelection?: boolean }
    /** 分页配置。传 false 关闭；对象可配 pageSizes/layout，type:'cursor' 启用游标分页，
     *  传 current/pageSize 则启用受控分页（内部翻页经 update:pagination 交还） */
    pagination?: false | {
      pageSizes?: number[]
      layout?: string
      type?: 'page' | 'cursor'
      current?: number
      pageSize?: number
    }
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
    /** 轮询间隔毫秒（低于 2000 被钮到 2000），true 为 2000；函数可按最新数据返回下一次间隔 */
    polling?: number | boolean | ((data: any[]) => number | boolean | undefined | void)
    /** 响应数据转换：写进表格前对 data 做最后一道整形 */
    postData?: (data: any[]) => any[]
    /**
     * 受控数据模式：传入后不发请求，数据完全由外部提供；
     * 编辑/增删结果通过 update:dataSource 交还，配 v-model:data-source 使用
     */
    dataSource?: any[]
    /** 列状态持久化位置。默认 localStorage；sessionStorage 关闭标签页即失效 */
    persistenceType?: 'localStorage' | 'sessionStorage'
    /** 受控列显隐（prop -> 是否可见）。不传则内部维护并持久化 */
    columnState?: Record<string, boolean>
    /** 同值单元格纵向合并的字段（prop 列表，顺序即多级合并层级）；也可在列上逐个开 autoMerge */
    mergeFields?: string[]
    /** 行拖拽排序：传列的 prop，该列单元格左侧出现拖拽把手；拖完 emit drag-sort-end */
    dragSortKey?: string
    /** 列设置面板配置：面板最大高度 / 是否显示勾选框 / 是否可拖拽排序 */
    columnSetting?: { listHeight?: number; checkable?: boolean; draggable?: boolean }
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
  /**
   * 加载态变化。
   * 页面常常要让**别的组件**跟着表格转圈（筛选区的查询按钮、页头的刷新图标），
   * 而 loading 是表格内部状态，外面读不到 —— 所以单独派一个事件。
   */
  'loading-change': [boolean]
  'update:columnOrder': [string[]]
  'update:columnFixed': [ColumnFixedState]
  'update:editableKeys': [(string | number)[]]
  /** 可编辑表格里数据发生变化（保存 / 删除 / 新增）后派发 */
  change: [any[]]
  /** 受控数据模式：数组级别变化（增删/重排）交还外部 */
  'update:dataSource': [any[]]
  /** 受控分页：内部翻页/改页长时交还外部，配 v-model:pagination */
  'update:pagination': [Record<string, any>]
  /** 受控列显隐：配 v-model:column-state */
  'update:columnState': [Record<string, boolean>]
  /** 行拖拽排序结束，带上重排后的新数据 */
  'drag-sort-end': [any[]]
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

/** 持久化位置：默认 localStorage，persistenceType='sessionStorage' 时换库 */
function storage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return props.persistenceType === 'sessionStorage' ? sessionStorage : localStorage
  } catch {
    return null
  }
}

/**
 * 读写列状态的四处都要 try/catch：
 * 隐私模式、禁用 cookie、配额写满都会抛，不能让表格因此白屏。
 */
function readJSON<T>(key: string, fallback: T): T {
  const store = storage()
  if (!props.persistenceKey || !store) return fallback
  try {
    const raw = store.getItem(key + props.persistenceKey)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJSON(key: string, value: unknown) {
  const store = storage()
  if (!props.persistenceKey || !store) return
  try {
    store.setItem(key + props.persistenceKey, JSON.stringify(value))
  } catch {
    /* 忽略 */
  }
}

const columnState = ref<Record<string, boolean>>(
  props.columnState ?? readJSON<Record<string, boolean>>(STORAGE_PREFIX, {}),
)

watch(
  columnState,
  (val) => {
    writeJSON(STORAGE_PREFIX, val)
    emit('update:columnState', { ...val })
  },
  { deep: true },
)

/** 受控列显隐：外部值变化同步进来（与 columnOrder/columnFixed 同一模式）。浅比较挡住 v-model 回流，避免回环 */
watch(
  () => props.columnState,
  (val) => {
    if (!val) return
    const keys = Object.keys(val)
    const same =
      keys.length === Object.keys(columnState.value).length &&
      keys.every((k) => columnState.value[k] === val[k])
    if (!same) columnState.value = { ...val }
  },
  { deep: true },
)

/** persistenceKey / persistenceType 运行时变更：重读新 key 的存储（对齐 React Store 的监听协议）。受控 columnState 时不重读显隐 */
watch(
  [() => props.persistenceKey, () => props.persistenceType],
  () => {
    if (!props.columnState) columnState.value = readJSON<Record<string, boolean>>(STORAGE_PREFIX, {})
    columnOrder.value = props.columnOrder.length
      ? [...props.columnOrder]
      : readJSON<string[]>(ORDER_STORAGE_PREFIX, [])
    columnFixed.value = Object.keys(props.columnFixed).length
      ? { ...props.columnFixed }
      : readJSON<ColumnFixedState>(FIXED_STORAGE_PREFIX, {})
  },
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

/** 跨页保留选中：默认开（前提 rowKey 稳定）；selection.reserveSelection === false 显式关闭 */
const selectionReserve = computed(() => {
  if (typeof props.selection === 'object' && props.selection.reserveSelection === false) return false
  return !!props.rowKey
})

/* --------------------------- 同值单元格合并 --------------------------- */

/**
 * mergeFields / 列级 autoMerge 的 span-method。
 *
 * 多级合并：第 i 个字段的连续段必须在前 i 个字段都相同的前提下延续，
 * 与 React mergeCellSpan 的「多级合并顺序」一致。树形数据（行带 children）直接跳过 ——
 * 展开子行与跨行合并会冲突导致列错位，与 React 的处理相同。
 */
const mergeDescriptors = computed<string[]>(() => {
  const explicit = props.mergeFields ?? []
  const fromColumns = props.columns.filter((c) => c.autoMerge && c.prop).map((c) => c.prop as string)
  // mergeFields 顺序优先，autoMerge 列按列顺序补充去重
  return [...new Set([...explicit, ...fromColumns.filter((p) => !explicit.includes(p))])]
})

const tableSpanMethod = computed(() => {
  if (!mergeDescriptors.value.length) return undefined
  const fields = mergeDescriptors.value
  const rows = data.value
  // 树形数据：展开子行与跨行合并冲突导致列错位，跳过（与 React 一致）
  if (rows.some((r) => Array.isArray((r as any).children) && (r as any).children.length > 0)) {
    return undefined
  }

  const spans: number[][] = []
  for (let fi = 0; fi < fields.length; fi += 1) {
    const rowSpans = new Array(rows.length).fill(1)
    let runStart = 0
    // 多级合并：第 i 层的连续段必须在前 i 层字段都相同的前提下延续
    const sameUpTo = (a: any, b: any) => fields.slice(0, fi + 1).every((f) => a?.[f] === b?.[f])
    for (let i = 1; i <= rows.length; i += 1) {
      if (i < rows.length && sameUpTo(rows[i], rows[runStart])) continue
      for (let j = runStart; j < i; j += 1) rowSpans[j] = j === runStart ? i - runStart : 0
      runStart = i
    }
    spans.push(rowSpans)
  }

  return ({ row, column }: any) => {
    const fi = fields.indexOf(String(column?.property ?? ''))
    if (fi < 0) return
    const rowIndex = rows.indexOf(row)
    if (rowIndex < 0) return
    const span = spans[fi][rowIndex]
    return { rowspan: span, colspan: span === 0 ? 0 : 1 }
  }
})

/** 分页是否受控：pagination 对象里传了 current 或 pageSize 即视为受控 */
const paginationControlled = computed(
  () =>
    typeof props.pagination === 'object' &&
    (props.pagination.current !== undefined || props.pagination.pageSize !== undefined),
)

/** 翻页：受控时交还外部（v-model:pagination），非受控直接走内部 */
function onPageChange(page: number) {
  if (paginationControlled.value && typeof props.pagination === 'object') {
    emit('update:pagination', { ...props.pagination, current: page })
    return
  }
  void table.handlePageChange(page)
}

/** 改页长：受控时交还外部并回第一页，非受控直接走内部 */
function onPageSizeChange(size: number) {
  if (paginationControlled.value && typeof props.pagination === 'object') {
    emit('update:pagination', { ...props.pagination, pageSize: size, current: 1 })
    return
  }
  void table.handlePageSizeChange(size)
}

/* ------------------------------ 数据 ------------------------------ */

const table = useTable({
  columns: () => props.columns,
  request: props.request,
  params: () => props.params,
  defaultPageSize:
    typeof props.pagination === 'object' ? (props.pagination.pageSize ?? props.defaultPageSize) : props.defaultPageSize,
  defaultCurrent: typeof props.pagination === 'object' ? props.pagination.current : undefined,
  immediate: props.immediate,
  paramsAdapter: props.paramsAdapter,
  polling: () => props.polling,
  postData: props.postData,
  cursor: () => typeof props.pagination === 'object' && props.pagination.type === 'cursor',
  dataSource: () => props.dataSource,
  onDataSourceChange: (next) => emit('update:dataSource', next),
  onLoad: (data) => emit('load', data),
  onError: (err) => emit('error', err),
})

const { data, loading, pollingLoading, total, current, pageSize, searchValues, tableColumns, searchColumns } = table

/** 受控分页的反向同步：搜索/排序/重置等内部逻辑把页码拉回 1 时，也要交还外部，否则内外脱节无法自愈 */
watch(table.current, (c) => {
  if (!paginationControlled.value || typeof props.pagination !== 'object') return
  if (c !== props.pagination.current) emit('update:pagination', { ...props.pagination, current: c })
})
watch(table.pageSize, (s) => {
  if (!paginationControlled.value || typeof props.pagination !== 'object') return
  if (s !== props.pagination.pageSize) emit('update:pagination', { ...props.pagination, pageSize: s })
})

/** 受控分页：外部值变化同步进来（触发重新请求）。immediate 与 defaultCurrent/defaultPageSize 配合，挂载时不产生多余请求 */
watch(
  () =>
    typeof props.pagination === 'object'
      ? ([props.pagination.current, props.pagination.pageSize] as const)
      : ([undefined, undefined] as const),
  ([c, s]) => {
    if (!paginationControlled.value) return
    const patch: { current?: number; pageSize?: number } = {}
    if (c !== undefined && c !== table.current.value) patch.current = c
    if (s !== undefined && s !== table.pageSize.value) patch.pageSize = s
    if (Object.keys(patch).length) void table.action.setPage(patch)
  },
  { immediate: true },
)

/* ------------------------------ 行拖拽排序 ------------------------------ */

/** Sortable 实例。数据/配置变化时重建，卸载时销毁 */
let sortableInstance: Sortable | null = null

function destroySortable() {
  sortableInstance?.destroy()
  sortableInstance = null
}

function initSortable() {
  destroySortable()
  if (!props.dragSortKey) return
  const el = (tableRef.value as any)?.$el as HTMLElement | undefined
  const tbody = el?.querySelector('.el-table__body-wrapper tbody') as HTMLElement | null
  if (!tbody) return
  sortableInstance = Sortable.create(tbody, {
    animation: 150,
    handle: '.el-pro-table__drag-handle',
    onEnd: ({ oldIndex, newIndex }) => {
      if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return
      // tbody 顺序 = 当前页渲染顺序；受控数据模式走 commitData 交还外部
      const next = [...data.value]
      const [moved] = next.splice(oldIndex, 1)
      next.splice(newIndex, 0, moved)
      table.commitData(next)
      emit('change', next)
      emit('drag-sort-end', next)
    },
  })
}

watch(
  [() => props.dragSortKey, data],
  () => nextTick(initSortable),
  { flush: 'post' },
)
onBeforeUnmount(destroySortable)

/* ------------------------------ 工具栏关键字搜索 ------------------------------ */

/** options.search 的关键字。提交时并入请求参数（key 名可配，默认 keyword） */
const toolbarKeyword = ref('')

function submitToolbarSearch() {
  const cfg = typeof props.options === 'object' ? props.options.search : undefined
  if (!cfg) return
  const name = (cfg === true ? {} : cfg).name ?? 'keyword'
  table.searchValues[name] = toolbarKeyword.value
  void table.submitSearch()
}

function clearToolbarSearch() {
  const cfg = typeof props.options === 'object' ? props.options.search : undefined
  if (!cfg) return
  const name = (cfg === true ? {} : cfg).name ?? 'keyword'
  delete table.searchValues[name]
  toolbarKeyword.value = ''
  void table.submitSearch()
}

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
 * 保存前按列上的 `rules` 校验草稿（对齐 React：保存前 validateFields 拦截）。
 * 编辑单元格是裸 FormField，没有 el-form-item 接收红字，所以错误统一用 ElMessage 提示；
 * 规则语义与 el-form 完全一致（同一套 async-validator）。
 */
async function validateDraft(row: any, draft: Record<string, any>, index: number): Promise<boolean> {
  for (const col of props.columns) {
    if (!col.prop || !col.rules?.length) continue
    // 行按 key 定位不到时（外部直喂的无 id 行）index 会是 -1，
    // 夹到 0 再传给 editable 回调，避免用户函数拿到 -1 误判
    if (!canEditCell(row, col, Math.max(index, 0))) continue
    try {
      const validator = new Schema({ [col.prop]: col.rules })
      await validator.validate({ [col.prop]: draft[col.prop] })
    } catch (error: any) {
      ElMessage.error(error?.errors?.[0]?.message ?? `${col.label || col.prop} 未通过校验`)
      return false
    }
  }
  return true
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
  if (!(await validateDraft(row, draft, index))) return false
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
  // data 是 shallowRef，改行对象内部字段不会触发更新，必须换数组引用；
  // 走 commitData：受控数据模式下增删结果交还外部（v-model:dataSource）
  table.commitData([...data.value])
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
  // 同样不能靠引用比较：插槽传来的是 Proxy；走 commitData 同步受控数据
  table.commitData(data.value.filter((r) => String(keyOf(r)) !== String(key)))
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

/** 新增一行。recordCreator.position 决定插顶部还是尾部；recordCreator.parentKey 决定插进哪棵子树 */
async function addRow(options?: { position?: 'top' | 'bottom'; parentKey?: string | number }) {
  const cfg = editableConfig.value
  if (!cfg) return
  const creator = cfg.recordCreator === false ? undefined : cfg.recordCreator
  const position = options?.position ?? creator?.position ?? 'top'
  const parentKey = options?.parentKey ?? creator?.parentKey
  const row = cfg.newRecord ? cfg.newRecord(data.value.length) : defaultRecord()
  // 先把临时 key 打到对象上，之后无论是原始对象还是 el-table 的 Proxy 都能取到同一个 key
  stampTmpKey(row)

  let next: any[]
  if (parentKey !== undefined) {
    // 树形新增：插进目标行的 children，扁平数组插入逻辑不适用
    const parent = data.value.find((r) => String(keyOf(r)) === String(parentKey))
    if (!parent) return
    if (!Array.isArray(parent.children)) parent.children = []
    parent.children.push(row)
    next = [...data.value]
  } else if (position === 'bottom') {
    next = [...data.value, row]
  } else {
    next = [row, ...data.value]
  }
  // 走 commitData：受控数据模式下新增结果交还外部（v-model:dataSource）
  table.commitData(next)
  // 不动 total：total 是服务端分页口径，本地插行改变它会造成翻页错位（对齐 React）
  emit('change', data.value)

  /**
   * 新增行始终进入编辑态，且**追加**而不是替换编辑键。
   *
   * 不能走 startEdit：单行模式里它有「先保存上一行」的闸门，而新增行的草稿
   * 往往是空的，校验必失败 → 第二次点「新增一行」会被上一行的报错拦住。
   * 源码的 addEditRecord 也是这个语义：setEditableRowKeys([...editableKeys, key])，
   * 不保存、不拦截（源码在 single 模式会拦截并提示「只能同时编辑一行」，
   * 这里按产品要求放开 —— 每次点击都能加出一行编辑态）。
   */
  const key = keyOf(row)
  if (editingKeys.value.includes(key)) return
  drafts[String(key)] = { ...row }
  setEditingKeys([...editingKeys.value, key])
}

/** 「新增一行」按钮：addable/recordCreator 开关 + maxLength 上限共同决定 */
const showAddRow = computed(() => {
  const cfg = editableConfig.value
  if (!cfg || cfg.addable === false || cfg.recordCreator === false) return false
  if (cfg.maxLength !== undefined && data.value.length >= cfg.maxLength) return false
  return true
})
const addRowText = computed(() => {
  const cfg = editableConfig.value
  const text = cfg && cfg.recordCreator !== false ? cfg.recordCreator?.text : undefined
  return text ?? '新增一行'
})
const addRowBottom = computed(() => {
  const cfg = editableConfig.value
  return cfg?.recordCreator !== false && cfg?.recordCreator?.position === 'bottom'
})
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

/**
 * 表格真正渲染的列：再受列设置面板的显隐控制。
 *
 * 用递归过滤而不是单层 filter —— 分组列的显隐状态挂在叶子列上，
 * 子列全隐藏时整组要一起消失，否则表头会留个空壳。
 */
const renderColumns = computed(() =>
  filterVisibleColumns(orderedColumns.value, (c) => {
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

/** loading 是内部状态，外面读不到；页面要让别的组件跟着转圈就得有这个事件 */
watch(loading, (val) => emit('loading-change', val))

/** 列插槽名：优先用 prop，操作列没写 prop 时用 'option' */
function slotName(col: ProColumn) {
  return String(col.prop ?? (col.valueType === 'option' ? 'option' : ''))
}

/**
 * `useSlots()` 的返回类型是按模板里出现过的插槽名推出来的字面量类型，
 * 没有索引签名，所以「按列 prop 动态取插槽」必须自己放宽成字典。
 */
const slotMap = slots as Record<string, unknown>

function hasSlot(col: ProColumn) {
  const name = slotName(col)
  return !!name && !!slotMap[name]
}

/**
 * 单元格渲染要用的状态打包给 TableColumnNode。
 *
 * 只有「递归列」这个场景需要这些，所以不往 props 上摊：
 * 多级表头无论嵌几层，子组件拿到的都是同一份上下文，参数表不随层数膨胀。
 */
provide(PRO_TABLE_CELL, {
  dragSortKey: toRef(props, 'dragSortKey'),
  slots: slots as unknown as Slots,
  emptyText: toRef(props, 'emptyText'),
  editable: editableConfig,
  showDeleteRow,
  savingKey,
  slotName,
  hasSlot,
  keyOf,
  isEditing,
  isEditCell,
  draftOf,
  setDraftValue,
  startEdit,
  saveRow,
  cancelRow,
  removeRow,
})

defineExpose({
  reload: table.action.reload,
  reloadAndRest: table.action.reloadAndRest,
  reset: table.action.reset,
  clearSelected,
  setPage: table.action.setPage,
  /** 拿到内部数据，便于在外部做导出等操作 */
  getData: () => data.value,
  getSelected: () => table.selectedRows.value,
  /**
   * 当前条件下的总条数。
   * `@load` 只给当前页的数据，页头统计（「共 N 单」）这类需求拿不到 total，
   * 所以单独开一个 —— `@load` 触发时 `total` 已经写好了，在回调里直接读就行。
   */
  getTotal: () => table.total.value,
  getPage: () => ({ current: table.current.value, pageSize: table.pageSize.value }),
  /** 轮询请求进行中。页面要让刷新图标单独转圈时用 */
  getPollingLoading: () => pollingLoading.value,
  /* ---- 行内编辑 ---- */
  startEdit,
  saveRow,
  cancelRow,
  removeRow,
  addRow,
  getEditingKeys: () => editingKeys.value,
  /** 受控数据模式下手动交还数组级变更（一般不用，增删编辑已自动走） */
  commitData: table.commitData,
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
        :setting-options="columnSetting"
        @refresh="handleRefresh"
        @keyword-search="submitToolbarSearch"
        @keyword-clear="clearToolbarSearch"
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
          <ElButton v-if="showAddRow && !addRowBottom" type="primary" size="small" @click="addRow()">{{ addRowText }}</ElButton>
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
        :span-method="tableSpanMethod"
        v-bind="attrs"
        @sort-change="table.handleSortChange"
        @selection-change="handleSelectionChange"
      >
        <ElTableColumn
          v-if="selection"
          type="selection"
          width="46"
          :reserve-selection="selectionReserve"
        />

        <!--
          默认插槽：插任意 el-table-column（展开行、自定义前置列）。
          放在 schema 列**之前**：展开列按惯例在最左；操作列走 schema 的
          valueType: 'option'（fixed: right），必须排在最后，否则 sticky offset 会算错。
        -->
        <slot />

        <TableColumnNode v-for="(col, i) in renderColumns" :key="slotName(col) || col.label || String(i)" :column="col">
          <template v-if="$slots.editableActions" #editableActions="scope">
            <slot name="editableActions" v-bind="scope" />
          </template>
        </TableColumnNode>

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

      <!-- recordCreator position: 'bottom'：按钮在表格下方，新行追加到末尾 -->
      <div v-if="showAddRow && addRowBottom" class="el-pro-table__creator">
        <ElButton type="primary" plain size="small" @click="addRow()">{{ addRowText }}</ElButton>
      </div>

      <div v-if="pagination !== false" class="el-pro-table__footer">
        <ElPagination
          :current-page="current"
          :page-size="pageSize"
          :total="total"
          :page-sizes="(typeof pagination === 'object' && pagination.pageSizes) || [10, 20, 50, 100]"
          :layout="(typeof pagination === 'object' && pagination.layout) || 'total, sizes, prev, pager, next, jumper'"
          background
          @current-change="onPageChange"
          @size-change="onPageSizeChange"
        />
      </div>
    </div>
  </div>
</template>

<style>
.el-pro-table {
  position: relative;
}
.el-pro-table__creator {
  margin-top: 12px;
}
.el-pro-table__cell {
  display: flex;
  align-items: center;
  gap: 4px;
}
.el-pro-table__cell-body {
  min-width: 0;
  flex: 1;
}
.el-pro-table__drag-handle {
  flex: none;
  display: inline-flex;
  cursor: grab;
  color: var(--el-text-color-placeholder);
}
.el-pro-table__drag-handle:hover {
  color: var(--el-color-primary);
}
.el-pro-table__drag-handle:active {
  cursor: grabbing;
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
