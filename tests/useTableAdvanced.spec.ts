import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { MIN_POLLING_INTERVAL_MS, useTable } from '../src/core/useTable'
import type { ProRequest, ProRequestResult } from '../src/types'

function flush() {
  // 本文件全用假定时器：用 advance 冲刷微任务，不能用真 setTimeout（永远不会被推进）
  return vi.advanceTimersByTimeAsync(0)
}

describe('useTable 进阶数据生命周期（批次 2 回归）', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('postData 在写进表格前整形数据', async () => {
    const request: ProRequest = (async () =>
      ({ data: [{ id: 1, name: 'a' }], total: 1 }) as ProRequestResult) as ProRequest
    const postData = vi.fn((list: any[]) => list.map((x) => ({ ...x, name: x.name.toUpperCase() })))

    const table = useTable({ request, postData })
    await flush()

    expect(postData).toHaveBeenCalled()
    expect(table.data.value[0].name).toBe('A')
  })

  it('polling：成功后按间隔排下一次请求，间隔被 2000 钳制', async () => {
    let resolveSecond!: (v: ProRequestResult) => void
    const request = vi.fn(async () => {
      if (request.mock.calls.length === 1) return { data: [{ id: 1 }], total: 1 }
      // 第二次（轮询）挂住不返回，验证 pollingLoading 的起止
      return new Promise<ProRequestResult>((resolve) => {
        resolveSecond = resolve
      })
    }) as unknown as ProRequest
    const table = useTable({ request, polling: 500 })

    await flush()
    expect(request).toHaveBeenCalledTimes(1)

    // 500ms 不足以触发：被钳到 2000
    await vi.advanceTimersByTimeAsync(1500)
    expect(request).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(500)
    expect(request).toHaveBeenCalledTimes(2)
    expect(table.pollingLoading.value).toBe(true)

    resolveSecond({ data: [{ id: 2 }], total: 1 })
    await flush()
    expect(table.pollingLoading.value).toBe(false)
  })

  it('polling 函数式间隔：返回 falsy 停止轮询', async () => {
    const request = vi.fn(async () => ({ data: [{ id: 1 }], total: 1 })) as unknown as ProRequest
    useTable({ request, polling: () => false })

    await flush()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('假分页：无 total 且超过一页 → 本地切片，翻页不再发请求', async () => {
    const rows = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }))
    const request = vi.fn(async () => ({ data: rows })) as unknown as ProRequest
    const table = useTable({ request, defaultPageSize: 10 })

    await flush()
    expect(request).toHaveBeenCalledTimes(1)
    expect(table.total.value).toBe(25)
    expect(table.data.value).toHaveLength(10)
    expect(table.data.value[0].id).toBe(1)

    await table.action.setPage({ current: 3 })
    expect(request).toHaveBeenCalledTimes(1) // 不再发请求
    expect(table.data.value).toHaveLength(5)
    expect(table.data.value[0].id).toBe(21)
  })

  it('游标分页：请求带 nextToken 不带 current，total 表达还有没有下一页', async () => {
    const payloads: any[] = []
    const request = vi.fn(async (params: any) => {
      payloads.push(params)
      const page = payloads.length
      return {
        data: [{ id: page }],
        nextToken: page < 3 ? `token-${page}` : undefined,
      } as ProRequestResult
    }) as ProRequest

    const table = useTable({ request, cursor: true, defaultPageSize: 10 })

    await flush()
    expect(payloads[0].current).toBeUndefined()
    expect(payloads[0].nextToken).toBeUndefined()
    expect(table.total.value).toBe(10 + 1) // 有 nextToken → 还有下一页

    await table.action.setPage({ current: 2 })
    expect(payloads[1].nextToken).toBe('token-1')
    expect(table.total.value).toBe(20 + 1)

    await table.action.setPage({ current: 3 })
    expect(payloads[2].nextToken).toBe('token-2')
    expect(table.total.value).toBe(30) // 没有下一页
  })

  it('受控数据模式：不发请求，commitData 交还外部', async () => {
    const request = vi.fn() as unknown as ProRequest
    const onDataSourceChange = vi.fn()
    const rows = [{ id: 1 }, { id: 2 }]

    const table = useTable({
      request,
      dataSource: () => rows,
      onDataSourceChange,
    })
    await nextTick()

    expect(request).not.toHaveBeenCalled()
    expect(table.data.value).toHaveLength(2)

    table.commitData([{ id: 1 }, { id: 2 }, { id: 3 }])
    expect(onDataSourceChange).toHaveBeenCalledWith([
      { id: 1 },
      { id: 2 },
      { id: 3 },
    ])
    // 就地生效：父组件没接 v-model 时页面仍可用
    expect(table.data.value).toHaveLength(3)
  })

  it('MIN_POLLING_INTERVAL_MS 与 React 协议一致', () => {
    expect(MIN_POLLING_INTERVAL_MS).toBe(2000)
  })
})
