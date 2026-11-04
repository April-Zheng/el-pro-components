/**
 * 表格的数据生命周期。
 *
 * 它接管了 CRUD 页面里最琐碎也最容易写错的那部分：
 * 什么时候请求、请求参数从哪来、翻页/排序/搜索如何合并、上一次请求还没回来怎么办。
 *
 * 竞态处理做了双保险：
 * 1. `AbortController` —— 业务侧把 `signal` 传给 axios/fetch 就能真正取消；
 * 2. 自增 `seq` —— 就算业务侧不接 signal，过期响应也会被丢弃，绝不覆盖新数据。
 *
 * 只上其中一层是不够的：只做 1，用户不接 signal 就失效；只做 2，请求还在飞、白占带宽。
 */
import { computed, onBeforeUnmount, reactive, ref, shallowRef, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import type { ProColumn, ProRequest, ProRequestParams, SortOrder } from '../types'
import { DISPLAY_ONLY_VALUE_TYPES } from './valueType'

export interface UseTableOptions<T = any> {
  columns: MaybeRefOrGetter<ProColumn<T>[]>
  request?: ProRequest<T>
  params?: MaybeRefOrGetter<Record<string, any> | undefined>
  defaultPageSize?: number
  /** 默认 true。设为 false 时首次不请求，需手动调用 action.reload() */
  immediate?: boolean
  /**
   * 把内部的 `{ current, pageSize, ...搜索值 }` 映射成后端真正要的形状。
   * 比如后端用 `pageNum/limit`：`p => ({ pageNum: p.current, limit: p.pageSize, ...p })`
   */
  paramsAdapter?: (params: ProRequestParams) => any
  onLoad?: (data: T[]) => void
  onError?: (error: Error) => void
}

export interface ProTableAction {
  reload: (resetPage?: boolean) => Promise<void>
  reloadAndRest: () => Promise<void>
  reset: () => Promise<void>
  clearSelected: () => void
  setPage: (page: Partial<{ current: number; pageSize: number }>) => Promise<void>
}

/** 能出现在搜索栏里的列：排除纯展示型、显式隐藏的、以及没有 prop 的 */
export function pickSearchColumns<T>(columns: ProColumn<T>[]): ProColumn<T>[] {
  return columns
    .filter((c) => {
      if (!c.prop) return false
      if (c.hideInSearch || c.search === false) return false
      if (c.hideInTable && c.search === undefined) return false
      const vt = c.valueType ?? 'text'
      return !DISPLAY_ONLY_VALUE_TYPES.includes(vt)
    })
    .sort((a, b) => {
      const oa = typeof a.search === 'object' ? (a.search.order ?? 0) : 0
      const ob = typeof b.search === 'object' ? (b.search.order ?? 0) : 0
      return oa - ob
    })
}

export function useTable<T = any>(options: UseTableOptions<T>) {
  const columns = computed(() => toValue(options.columns) ?? [])
  const tableColumns = computed(() => columns.value.filter((c) => !c.hideInTable))
  const searchColumns = computed(() => pickSearchColumns(columns.value))

  const data = shallowRef<T[]>([])
  const loading = ref(false)
  const total = ref(0)
  const current = ref(1)
  const pageSize = ref(options.defaultPageSize ?? 20)
  const sort = ref<Record<string, SortOrder>>({})
  const searchValues = reactive<Record<string, any>>({})

  const selectedRows = shallowRef<T[]>([])
  const selectedKeys = shallowRef<any[]>([])

  let seq = 0
  let controller: AbortController | null = null

  function buildSearchDefaults() {
    for (const c of searchColumns.value) {
      if (c.prop && c.defaultValue !== undefined && searchValues[c.prop] === undefined) {
        searchValues[c.prop] = Array.isArray(c.defaultValue)
          ? [...c.defaultValue]
          : c.defaultValue
      }
    }
  }
  buildSearchDefaults()

  async function fetchData(opts: { resetPage?: boolean } = {}) {
    const req = options.request
    if (!req) return
    if (opts.resetPage) current.value = 1

    const mySeq = ++seq
    controller?.abort()
    const myController = new AbortController()
    controller = myController
    loading.value = true

    const merged: ProRequestParams = {
      ...searchValues,
      ...(toValue(options.params) ?? {}),
      current: current.value,
      pageSize: pageSize.value,
    }

    // 应用 search.transform：让「表格显示一种类型、搜索用另一种类型」能落地
    for (const col of searchColumns.value) {
      if (!col.prop) continue
      const cfg = typeof col.search === 'object' ? col.search : undefined
      if (!cfg?.transform) continue
      const out = cfg.transform(merged[col.prop])
      delete merged[col.prop]
      if (out) Object.assign(merged, out)
    }

    const payload = options.paramsAdapter ? options.paramsAdapter(merged) : merged

    try {
      const res = await req(payload, { ...sort.value }, { signal: myController.signal })
      if (mySeq !== seq) return

      // 业务层失败：进空态、不报错（与 ProRequestResult.success 的文档承诺一致）
      if (!Array.isArray(res) && res?.success === false) {
        data.value = []
        total.value = 0
        return
      }

      const list = (Array.isArray(res) ? res : (res?.data ?? [])) as T[]
      data.value = list
      total.value = Array.isArray(res) ? list.length : (res?.total ?? list.length)
      options.onLoad?.(list)
    } catch (error: any) {
      if (mySeq !== seq) return
      const aborted =
        error?.name === 'AbortError' ||
        error?.name === 'CanceledError' ||
        error?.code === 'ERR_CANCELED'
      if (aborted) return
      // 请求失败保留旧数据，只上报错误——弱网/轮询场景下不该把已有数据闪空
      options.onError?.(error instanceof Error ? error : new Error(String(error)))
    } finally {
      if (mySeq === seq) loading.value = false
    }
  }

  /* ------------------------------ 对外动作 ------------------------------ */

  function reload(resetPage = false) {
    return fetchData({ resetPage })
  }

  function reloadAndRest() {
    clearSelected()
    return fetchData({ resetPage: true })
  }

  function resetSearchValues() {
    for (const key of Object.keys(searchValues)) delete searchValues[key]
    buildSearchDefaults()
  }

  async function reset() {
    resetSearchValues()
    sort.value = {}
    return fetchData({ resetPage: true })
  }

  function clearSelected() {
    selectedRows.value = []
    selectedKeys.value = []
  }

  async function setPage(page: Partial<{ current: number; pageSize: number }>) {
    if (page.pageSize !== undefined) pageSize.value = page.pageSize
    if (page.current !== undefined) current.value = page.current
    return fetchData()
  }

  const action: ProTableAction = {
    reload,
    reloadAndRest,
    reset,
    clearSelected,
    setPage,
  }

  /* ------------------------------ 联动 ------------------------------ */

  /** 搜索：任何一次提交都从第一页开始 */
  function submitSearch() {
    return fetchData({ resetPage: true })
  }

  /**
   * el-table 的 sort-change → 内部排序态。单列排序，与 EP 默认行为一致。
   * 注意 el-table 在取消排序时给的 prop 可能为 null，必须接住。
   */
  function handleSortChange(payload: {
    prop: string | null
    order: 'ascending' | 'descending' | null
  }) {
    if (!payload.prop) return
    if (!payload.order) {
      const next = { ...sort.value }
      delete next[payload.prop]
      sort.value = next
    } else {
      sort.value = { [payload.prop]: payload.order === 'ascending' ? 'asc' : 'desc' }
    }
    return fetchData({ resetPage: true })
  }

  function handlePageChange(page: number) {
    current.value = page
    return fetchData()
  }

  function handlePageSizeChange(size: number) {
    pageSize.value = size
    current.value = 1
    return fetchData()
  }

  if (options.params) {
    watch(
      () => toValue(options.params),
      () => fetchData({ resetPage: true }),
      { deep: true },
    )
  }

  onBeforeUnmount(() => controller?.abort())

  if (options.immediate !== false) {
    void fetchData()
  }

  return {
    columns,
    tableColumns,
    searchColumns,
    data,
    loading,
    total,
    current,
    pageSize,
    sort,
    searchValues,
    selectedRows,
    selectedKeys,
    action,
    fetchData,
    submitSearch,
    resetSearchValues,
    clearSelected,
    handleSortChange,
    handlePageChange,
    handlePageSizeChange,
  }
}
