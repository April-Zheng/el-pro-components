import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useTable } from '../src/core/useTable'
import type { ProRequest } from '../src/types'

/** useTable 在组件外调用只会告警不抛错，单测直接跑，不搭组件环境 */
function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

describe('useTable request 变更（此前按值捕获，reload 仍调旧函数）', () => {
  it('把 request 换成新函数后，reload 调用的是新函数', async () => {
    const first = vi.fn(async () => ({ data: [{ id: 'first' }], total: 1 }))
    const second = vi.fn(async () => ({ data: [{ id: 'second' }], total: 1 }))

    const request = ref<ProRequest | undefined>(first as unknown as ProRequest)
    const table = useTable({ request })
    await flush()

    expect(first).toHaveBeenCalledTimes(1)
    expect(table.data.value).toEqual([{ id: 'first' }])

    request.value = second as unknown as ProRequest
    await table.action.reload()
    await flush()

    expect(second).toHaveBeenCalledTimes(1)
    expect(first).toHaveBeenCalledTimes(1) // 旧函数不再被调用
    expect(table.data.value).toEqual([{ id: 'second' }])
  })

  it('直给函数（不走 ref）行为不变', async () => {
    const request = vi.fn(async () => ({ data: [{ id: 1 }], total: 1 }))
    const table = useTable({ request: request as unknown as ProRequest })
    await flush()

    expect(request).toHaveBeenCalledTimes(1)
    expect(table.data.value).toEqual([{ id: 1 }])
  })
})
