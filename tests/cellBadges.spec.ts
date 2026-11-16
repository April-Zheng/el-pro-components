// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick } from 'vue'
import CellRenderer from '../src/fields/CellRenderer.vue'
import type { ProColumn } from '../src/types'

let cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.forEach((fn) => fn())
  cleanups = []
  vi.useRealTimers()
})

function mount(column: ProColumn, value: any, index?: number) {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const app = createApp({
    render: () => h(CellRenderer as any, { column, value, index }),
  })
  app.mount(root)
  cleanups.push(() => {
    app.unmount()
    root.remove()
  })
  return root
}

describe('indexBorder 圆底徽章（批次6④，对齐 React IndexColumn border）', () => {
  it('渲染圆底徽章，序号 ≤ 3 用深色', async () => {
    const root = mount({ prop: 'i', valueType: 'indexBorder' } as ProColumn, undefined, 0)
    await nextTick()
    const badge = root.querySelector('.el-pro-index-badge') as HTMLElement
    expect(badge).not.toBeNull()
    expect(badge.textContent).toBe('1')
    expect(badge.classList.contains('is-top-three')).toBe(false)
  })

  it('序号 > 3 变灰（is-top-three）', async () => {
    const root = mount({ prop: 'i', valueType: 'indexBorder' } as ProColumn, undefined, 3)
    await nextTick()
    const badge = root.querySelector('.el-pro-index-badge') as HTMLElement
    expect(badge.textContent).toBe('4')
    expect(badge.classList.contains('is-top-three')).toBe(true)
  })

  it('index（无 border）不走徽章', async () => {
    const root = mount({ prop: 'i', valueType: 'index' } as ProColumn, undefined, 0)
    await nextTick()
    expect(root.querySelector('.el-pro-index-badge')).toBeNull()
  })
})

describe('copyable 复制成功反馈（批次6⑦）', () => {
  it('点击复制后图标短暂变 ✓，随后复原', async () => {
    vi.useFakeTimers()
    const writeText = vi.fn(() => Promise.resolve())
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })

    const root = mount({ prop: 'name', valueType: 'text', copyable: true } as ProColumn, 'hello')
    await nextTick()

    const copyBtn = root.querySelector('.el-pro-cell__copy') as HTMLElement
    expect(copyBtn).not.toBeNull()
    expect(copyBtn.querySelector('.el-pro-cell__copy-check')).toBeNull()

    copyBtn.click()
    await vi.advanceTimersByTimeAsync(0)
    expect(writeText).toHaveBeenCalledWith('hello')
    // 成功态：出现 ✓ 图标
    expect(copyBtn.querySelector('.el-pro-cell__copy-check')).not.toBeNull()

    // 1.5s 后复原
    await vi.advanceTimersByTimeAsync(1600)
    expect(copyBtn.querySelector('.el-pro-cell__copy-check')).toBeNull()
  })

  it('复制失败不进入成功态', async () => {
    vi.useFakeTimers()
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText: vi.fn(() => Promise.reject(new Error('denied'))) },
      configurable: true,
    })
    const root = mount({ prop: 'name', valueType: 'text', copyable: true } as ProColumn, 'x')
    await nextTick()
    const copyBtn = root.querySelector('.el-pro-cell__copy') as HTMLElement
    copyBtn.click()
    await vi.advanceTimersByTimeAsync(0)
    expect(copyBtn.querySelector('.el-pro-cell__copy-check')).toBeNull()
  })
})
