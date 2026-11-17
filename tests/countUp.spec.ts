// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick, ref } from 'vue'
import ElProStatistic from '../src/components/ElProCard/ElProStatistic.vue'
import { easeLinear, easeOutCubic, playCountUp } from '../src/core/countUp'

let cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.forEach((fn) => fn())
  cleanups = []
})

function mountStatistic(props: Record<string, any>) {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const app = createApp({ render: () => h(ElProStatistic as any, props) })
  app.mount(root)
  cleanups.push(() => {
    app.unmount()
    root.remove()
  })
  return root
}

const numberText = (root: Element) =>
  (root.querySelector('.el-pro-statistic__number') as HTMLElement | null)?.textContent

describe('缓动函数', () => {
  it('easeOutCubic：端点为 0/1，中间单调递增且快于线性', () => {
    expect(easeOutCubic(0)).toBe(0)
    expect(easeOutCubic(1)).toBe(1)
    expect(easeOutCubic(-0.5)).toBe(0)
    expect(easeOutCubic(1.5)).toBe(1)
    let prev = 0
    for (let t = 0.1; t <= 1; t += 0.1) {
      const v = easeOutCubic(t)
      expect(v).toBeGreaterThan(prev)
      expect(v).toBeGreaterThan(t - 0.01) // easeOut 快于线性（前段进度大）
      prev = v
    }
  })

  it('easeLinear：严格线性', () => {
    expect(easeLinear(0.25)).toBeCloseTo(0.25, 5)
    expect(easeLinear(0.75)).toBeCloseTo(0.75, 5)
  })
})

describe('playCountUp：注入调度器确定性驱动', () => {
  function manualScheduler() {
    let step: ((now: number) => void) | null = null
    let clock = 0
    return {
      schedule: (cb: (now: number) => void) => {
        step = cb
        return () => {
          step = null
        }
      },
      advance: (ms: number) => {
        clock += ms
        // 取走即清：cb 若续排会重新调 schedule 写回 step，
        // 自然完成后 step 为 null，后续 advance 不再重放终帧
        const cb = step
        step = null
        cb?.(clock)
      },
      /** 完成后 advance 不再产生新帧 */
      framesAfterAdvance: () => {
        const before = frames.length
        return () => frames.length - before
      },
    }
  }

  it('首帧同步出（progress 0 → from），帧序列从 from 到 to，时长正确', () => {
    const frames: number[] = []
    const s = manualScheduler()
    playCountUp({
      from: 100,
      to: 200,
      duration: 1000,
      easing: 'linear',
      onFrame: (v) => frames.push(v),
      scheduler: s.schedule,
      now: () => 0,
    })
    // 首帧同步：不依赖下一次调度就有值（组件挂载不闪终值的前提）
    expect(frames[0]).toBe(100)

    s.advance(500)
    expect(frames.at(-1)).toBeCloseTo(150, 5)
    s.advance(500)
    expect(frames.at(-1)).toBe(200)
    // 完成后再 advance 不再产生新帧
    const before = frames.length
    s.advance(1000)
    expect(frames.length).toBe(before)
  })

  it('cancel：停止在当前帧', () => {
    const frames2: number[] = []
    const s2 = manualScheduler()
    const playing2 = playCountUp({
      from: 0,
      to: 100,
      duration: 1000,
      easing: 'linear',
      onFrame: (v) => frames2.push(v),
      scheduler: s2.schedule,
      now: () => 0,
    })
    s2.advance(250)
    playing2.cancel()
    expect(frames2.at(-1)).toBeCloseTo(25, 5)
    s2.advance(2000)
    expect(frames2.length).toBe(2) // 没有新帧
  })

  it('duration <= 0 直接回调终值', () => {
    const frames: number[] = []
    playCountUp({ from: 0, to: 42, duration: 0, onFrame: (v) => frames.push(v) })
    expect(frames).toEqual([42])
  })
})

/**
 * 组件级测试的可控帧时钟：替换全局 rAF 与 performance.now，
 * 用 tick(ms) 手动推帧 —— 组件里 playCountUp 的默认调度器走的就是这两个全局。
 */
function installFakeFrames() {
  const pending = new Set<(now: number) => void>()
  let clock = 0
  const g = globalThis as any
  g.requestAnimationFrame = (cb: (now: number) => void) => {
    pending.add(cb)
    return pending.size
  }
  g.cancelAnimationFrame = (id: number) => {
    void id
    // 简化：cancel 由组件侧 playing.cancel 保证不再排帧，这里无需精确移除
  }
  g.performance = { ...g.performance, now: () => clock }
  return {
    tick: (ms: number) => {
      clock += ms
      const list = [...pending]
      pending.clear()
      list.forEach((cb) => cb(clock))
    },
  }
}

describe('ElProStatistic countUp 组件行为', () => {
  it('默认（不传 countUp）：不滚动，立即显示终值', async () => {
    const root = mountStatistic({ value: 12345 })
    await nextTick()
    expect(numberText(root)).toBe('12,345')
  })

  it('countUp=true：挂载后从 0 滚到 value，中间帧走千分位格式化，最终等于 value', async () => {
    const frames = installFakeFrames()
    const root = mountStatistic({ value: 12345, countUp: true })
    await nextTick()
    // 挂载当帧即显示起始值，不闪终值
    expect(numberText(root)).toBe('0')
    frames.tick(600)
    await nextTick()
    const mid = numberText(root)
    expect(mid).not.toBe('0')
    expect(mid).not.toBe('12,345')
    // 中间帧不露进度小数（取整），仍走千分位
    expect(mid).toMatch(/^\d{1,3}(,\d{3})*$/)
    frames.tick(1200)
    await nextTick()
    expect(numberText(root)).toBe('12,345')
  })

  it('countUp 对象配置：from / duration / easing 可定制', async () => {
    const frames = installFakeFrames()
    const root = mountStatistic({
      value: 500,
      countUp: { from: 100, duration: 800, easing: 'linear' },
    })
    await nextTick()
    expect(numberText(root)).toBe('100')
    frames.tick(400)
    await nextTick()
    expect(numberText(root)).toBe('300')
    frames.tick(400)
    await nextTick()
    expect(numberText(root)).toBe('500')
  })

  it('value 变化时从当前值重新滚动到新值', async () => {
    const frames = installFakeFrames()
    const value = ref(1000)
    const root = document.createElement('div')
    document.body.appendChild(root)
    const app = createApp({
      render: () => h(ElProStatistic as any, { value: value.value, countUp: { duration: 500, easing: 'linear' } }),
    })
    app.mount(root)
    cleanups.push(() => {
      app.unmount()
      root.remove()
    })
    await nextTick()
    frames.tick(500)
    await nextTick()
    expect(numberText(root)).toBe('1,000')
    value.value = 2000
    await nextTick()
    // 变化后从当前值（1,000）滚到新值
    frames.tick(250)
    await nextTick()
    expect(numberText(root)).toBe('1,500')
    frames.tick(250)
    await nextTick()
    expect(numberText(root)).toBe('2,000')
  })

  it('带小数的 value：终帧落原精度，中间帧不露进度小数', async () => {
    const frames = installFakeFrames()
    const root = mountStatistic({ value: 98765.4, countUp: { duration: 500, easing: 'linear' } })
    await nextTick()
    frames.tick(250)
    await nextTick()
    // 中间帧取整
    expect(numberText(root)).toMatch(/^\d{1,3}(,\d{3})*$/)
    frames.tick(250)
    await nextTick()
    // 终帧精确落原值（不被取整碰）
    expect(numberText(root)).toBe('98,765.4')
  })

  it('字符串值不滚动，原样显示', async () => {
    const root = mountStatistic({ value: '12,345.67', countUp: true })
    await nextTick()
    expect(numberText(root)).toBe('12,345.67')
  })

  it('系统开启减弱动态时跳过动画直接落终值', async () => {
    const matchMedia = vi.fn((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
    }))
    ;(window as any).matchMedia = matchMedia
    const root = mountStatistic({ value: 9999, countUp: true })
    await nextTick()
    expect(numberText(root)).toBe('9,999')
    expect(matchMedia).toHaveBeenCalled()
  })
})
