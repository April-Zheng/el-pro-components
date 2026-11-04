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

/** 轮询最小间隔（毫秒）。低于此值被钮到此处，避免上次请求还没回来就发下一次（对齐 React 协议） */
export const MIN_POLLING_INTERVAL_MS = 2000

/** 轮询配置的值形态：数字/布尔，或按最新数据算下一次间隔的函数 */
type ProPolling<T> = number | boolean | ((data: T[]) => number | boolean | undefined | void)

export interface UseTableOptions<T = any> {
  columns: MaybeRefOrGetter<ProColumn<T>[]>
  request?: ProRequest<T>
  params?: MaybeRefOrGetter<Record<string, any> | undefined>
  defaultPageSize?: number
  /** 初始页码。受控分页的初始 current 从这里进 */
  defaultCurrent?: number
  /** 默认 true。设为 false 时首次不请求，需手动调用 action.reload() */
  immediate?: boolean
  /**
   * 把内部的 `{ current, pageSize, ...搜索值 }` 映射成后端真正要的形状。
   * 比如后端用 `pageNum/limit`：`p => ({ pageNum: p.current, limit: p.pageSize, ...p })`
   */
  paramsAdapter?: (params: ProRequestParams) => any
  /**
   * 轮询间隔。数字为毫秒（低于 2000 会被钮到 2000），true 为 2000，
   * 单参函数按最新数据返回下一次的间隔（返回 falsy 停止轮询）；
   * 零参函数视为 getter，可响应式读取，如 `() => props.polling`
   */
  polling?: ProPolling<T> | (() => ProPolling<T> | undefined)
  /** 响应数据转换：在写进表格之前对 data 做最后一道整形 */
  postData?: (data: T[]) => T[]
  /** 游标分页：请求参数不再带 current，带上一页回包的 nextToken */
  cursor?: MaybeRefOrGetter<boolean>
  /**
   * 受控数据模式：传入后表格不再发请求，数据完全由外部提供；
   * 编辑/增删通过 onDataSourceChange 交还外部。与 request 互斥，dataSource 优先
   */
  dataSource?: MaybeRefOrGetter<T[] | undefined>
  /** 受控数据模式下，数组级别的变化（增删/重排）从这里交还外部，配 v-model:dataSource 用 */
  onDataSourceChange?: (data: T[]) => void
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
  const current = ref(options.defaultCurrent ?? 1)
  const pageSize = ref(options.defaultPageSize ?? 20)
  const sort = ref<Record<string, SortOrder>>({})
  const searchValues = reactive<Record<string, any>>({})

  /** 轮询请求进行中的标志。与 loading 分开：轮询不打断用户正在看的页面 */
  const pollingLoading = ref(false)
  let pollingTimer: ReturnType<typeof setTimeout> | null = null

  /** 游标分页的游标历史。下标 0 是第一页（无游标）；current 页的游标 = history[current-1] */
  const cursorHistory = ref<(string | undefined)[]>([undefined])

  /** 假分页模式下的全量数据。非 null = 后端一次回了跨页全量，本地切片 */
  const fullData = shallowRef<T[] | null>(null)

  /** 受控数据模式。传入 dataSource 后不发请求，编辑结果交还外部 */
  const controlledData = computed(() => toValue(options.dataSource))
  const isControlled = computed(() => controlledData.value !== undefined)

  const selectedRows = shallowRef<T[]>([])
  const selectedKeys = shallowRef<any[]>([])

  let seq = 0
  let controller: AbortController | null = null

  /**
   * 数组级别的数据变更统一走这里：非受控直接写内部 ref；
   * 受控模式交还外部（onDataSourceChange），同时也就地写一份——
   * 父组件没接 v-model 时页面仍然可用，接了会被 watch 同步为同值，无抖动。
   */
  function commitData(next: T[]) {
    if (isControlled.value) options.onDataSourceChange?.(next)
    data.value = next
  }

  function stopPolling() {
    if (pollingTimer !== null) {
      clearTimeout(pollingTimer)
      pollingTimer = null
    }
    pollingLoading.value = false
  }

  /**
   * 取轮询配置的当前值。单参函数是「按数据算间隔」的协议函数，原样返回；
   * 零参函数是 getter，求值（不能用 toValue 一刀切：它会把单参函数也无参调用）
   */
  function resolvePollingSource(): ProPolling<T> | undefined {
    const src = options.polling
    if (typeof src === 'function') {
      return src.length >= 1 ? (src as ProPolling<T>) : (src as () => ProPolling<T> | undefined)()
    }
    return src
  }

  /** 解析下一次轮询间隔。返回 undefined = 不轮询 */
  function resolvePolling(list: T[]): number | undefined {
    const p = resolvePollingSource()
    if (!p) return undefined
    const v = typeof p === 'function' ? p(list) : p
    if (v === true) return MIN_POLLING_INTERVAL_MS
    if (typeof v === 'number' && v > 0) {
      // 低于下界钮到下界：请求 RTT 大时，间隔过短会让上一次还没回来就发下一次
      return Math.max(v, MIN_POLLING_INTERVAL_MS)
    }
    return undefined
  }

  function schedulePolling(list: T[]) {
    stopPolling()
    const interval = resolvePolling(list)
    if (interval === undefined) return
    pollingTimer = setTimeout(() => {
      pollingTimer = null
      void fetchData({ polling: true })
    }, interval)
  }

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

  async function fetchData(opts: { resetPage?: boolean; polling?: boolean } = {}) {
    // 受控数据模式：不发请求，数据由外部提供
    if (isControlled.value) return
    const req = options.request
    if (!req) return
    if (opts.resetPage) current.value = 1

    // 新请求开始：上一次排下的轮询作废，节奏由本次成功后重新排
    if (pollingTimer !== null) {
      clearTimeout(pollingTimer)
      pollingTimer = null
    }

    const mySeq = ++seq
    controller?.abort()
    const myController = new AbortController()
    controller = myController
    // 轮询请求不打断用户正在看的页面，只亮 pollingLoading
    if (opts.polling) pollingLoading.value = true
    else loading.value = true

    const merged: ProRequestParams = {
      ...searchValues,
      ...(toValue(options.params) ?? {}),
      current: current.value,
      pageSize: pageSize.value,
    }

    // 游标分页：不带 current，带上当前页的游标（历史里没有就是 undefined，请求首屏）
    if (toValue(options.cursor)) {
      delete (merged as Record<string, any>).current
      const token = cursorHistory.value[current.value - 1]
      if (token !== undefined) merged.nextToken = token
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
        fullData.value = null
        data.value = []
        total.value = 0
        return
      }

      const rawList = (Array.isArray(res) ? res : (res?.data ?? [])) as T[]
      const list = options.postData ? options.postData(rawList) : rawList

      // 游标分页：记录本次回包的游标，total 只表达「还有没有下一页」
      if (toValue(options.cursor)) {
        const nextToken = Array.isArray(res) ? undefined : res?.nextToken
        cursorHistory.value.length = current.value
        cursorHistory.value[current.value] = nextToken
        fullData.value = null
        data.value = list
        total.value = current.value * pageSize.value + (nextToken ? 1 : 0)
        options.onLoad?.(list)
        schedulePolling(list)
        return
      }

      // 假分页守门：没报 total 且一次回了超过一页的数据，视为「全量返回」，
      // 翻页在本地切片，不再发请求（对齐 React 的假分页协议）
      if (!Array.isArray(res) && res?.total === undefined && list.length > pageSize.value) {
        fullData.value = list
        total.value = list.length
        data.value = list.slice((current.value - 1) * pageSize.value, current.value * pageSize.value)
        options.onLoad?.(list)
        schedulePolling(list)
        return
      }

      fullData.value = null
      data.value = list
      total.value = Array.isArray(res) ? list.length : (res?.total ?? list.length)
      options.onLoad?.(list)
      schedulePolling(list)
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
      if (mySeq === seq) {
        loading.value = false
        pollingLoading.value = false
      }
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
    if (toValue(options.cursor) && page.pageSize !== undefined) cursorHistory.value = [undefined]
    // 假分页：本地切片，不发请求
    if (fullData.value) {
      data.value = fullData.value.slice((current.value - 1) * pageSize.value, current.value * pageSize.value)
      return
    }
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
    // 游标分页：只允许跳到「已有游标」的页（历史里存的）， jumper 直接输第 5 页会被拒——
    // 未访问页没有游标，请求会退化成首屏却被当成第 5 页展示，数据错位
    if (toValue(options.cursor)) {
      const reachable =
        page === 1 ||
        (cursorHistory.value.length > page - 1 && cursorHistory.value[page - 1] !== undefined)
      if (!reachable) return Promise.resolve()
    }
    current.value = page
    // 假分页：本地切片，不发请求
    if (fullData.value) {
      data.value = fullData.value.slice((page - 1) * pageSize.value, page * pageSize.value)
      return Promise.resolve()
    }
    return fetchData()
  }

  function handlePageSizeChange(size: number) {
    pageSize.value = size
    current.value = 1
    // 游标分页换页长：历史作废重回到首屏（对齐 React）
    if (toValue(options.cursor)) cursorHistory.value = [undefined]
    // 假分页：重新切片
    if (fullData.value) {
      data.value = fullData.value.slice(0, size)
      return Promise.resolve()
    }
    return fetchData()
  }

  if (options.params) {
    watch(
      () => toValue(options.params),
      () => fetchData({ resetPage: true }),
      { deep: true },
    )
  }

  // 受控数据：外部数据变化同步进来（不发请求）
  if (options.dataSource) {
    watch(controlledData, (v) => {
      if (v !== undefined) data.value = v
    }, { immediate: true, deep: true })
  }

  // 轮询配置变化：关掉就停，打开就排一次（后续节奏由每次成功后的 schedulePolling 接管）
  watch(
    () => resolvePollingSource(),
    () => {
      if (!resolvePollingSource()) stopPolling()
      else if (pollingTimer === null) schedulePolling(data.value)
    },
  )

  onBeforeUnmount(() => {
    controller?.abort()
    stopPolling()
  })

  if (options.immediate !== false) {
    void fetchData()
  }

  return {
    columns,
    tableColumns,
    searchColumns,
    data,
    loading,
    pollingLoading,
    total,
    current,
    pageSize,
    sort,
    searchValues,
    selectedRows,
    selectedKeys,
    action,
    fetchData,
    commitData,
    submitSearch,
    resetSearchValues,
    clearSelected,
    handleSortChange,
    handlePageChange,
    handlePageSizeChange,
  }
}
