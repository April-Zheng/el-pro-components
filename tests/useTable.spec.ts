import { describe, expect, it, vi } from 'vitest'
import { useTable } from '../src/core/useTable'
import type { ProRequest, ProRequestResult } from '../src/types'

/**
 * useTable 在组件外调用时 onBeforeUnmount 只会告警不会抛错，
 * 单测直接跑，不搭组件环境。
 */
function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

describe('useTable 数据生命周期（P1 #3 / #4 回归）', () => {
  it('success === false 时进空态且不报错', async () => {
    const onError = vi.fn()
    const request: ProRequest = (async () =>
      ({ data: [{ id: 1 }], total: 1, success: false }) as ProRequestResult) as ProRequest

    const table = useTable({ request, onError })
    await flush()

    expect(table.data.value).toEqual([])
    expect(table.total.value).toBe(0)
    expect(table.loading.value).toBe(false)
    expect(onError).not.toHaveBeenCalled()
  })

  it('请求失败保留旧数据，只上报错误', async () => {
    const rows = [{ id: 1 }, { id: 2 }]
    const onError = vi.fn()
    let shouldFail = false
    const request: ProRequest = (async () => {
      if (shouldFail) throw new Error('network down')
      return { data: rows, total: rows.length } as ProRequestResult
    }) as ProRequest

    const table = useTable({ request, onError })
    await flush()
    expect(table.data.value).toHaveLength(2)

    shouldFail = true
    await table.action.reload()

    expect(table.data.value).toHaveLength(2)
    expect(table.total.value).toBe(2)
    expect(table.loading.value).toBe(false)
    expect(onError).toHaveBeenCalledWith(expect.any(Error))
  })

  it('success 缺省时正常取 data', async () => {
    const request: ProRequest = (async () =>
      ({ data: [{ id: 1 }], total: 1 }) as ProRequestResult) as ProRequest
    const table = useTable({ request })
    await flush()
    expect(table.data.value).toEqual([{ id: 1 }])
    expect(table.total.value).toBe(1)
  })
})
