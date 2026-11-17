/**
 * 数字滚动（count-up）内核。
 *
 * 为什么放 core：滚动是一段纯 tween 逻辑——给 from/to/duration，按帧回调中间值。
 * 它不该长在组件里：单测驱动不动组件里的 rAF，而 ElProStatistic 之外
 * （比如图表大数）未来也可能复用同一段滚动。
 *
 * 帧调度器可注入：默认 requestAnimationFrame，测试传手动调度器就能
 * 用纯断言验证帧序列，不依赖真实时钟。
 */

/** easeOutCubic：起步快、收尾缓，大数字滚动比 linear 舒服（视觉上不会「赶着到位」） */
export function easeOutCubic(t: number): number {
  const clamped = t <= 0 ? 0 : t >= 1 ? 1 : t
  return 1 - Math.pow(1 - clamped, 3)
}

/** 线性缓动 */
export function easeLinear(t: number): number {
  return t <= 0 ? 0 : t >= 1 ? 1 : t
}

export type CountUpEasing = 'linear' | 'easeOut'
export type FrameScheduler = (callback: (now: number) => void) => () => void

export interface PlayCountUpOptions {
  from: number
  to: number
  /** 动画时长 ms */
  duration: number
  easing?: CountUpEasing
  /** 每帧回调，收到当前值（已缓动插值，未格式化——格式化是渲染层的事） */
  onFrame: (value: number) => void
  /**
   * 帧调度器，默认 requestAnimationFrame。注入 `cb => { cb(t); return () => {} }`
   * 这类手动实现即可在测试里确定性驱动。
   */
  scheduler?: FrameScheduler
  /** 时钟源，默认 performance.now。测试注入递增时钟 */
  now?: () => number
}

export interface PlayingCountUp {
  /** 停止滚动，停在当前帧。重复调用安全 */
  cancel: () => void
}

const EASINGS: Record<CountUpEasing, (t: number) => number> = {
  linear: easeLinear,
  easeOut: easeOutCubic,
}

const defaultScheduler: FrameScheduler =
  typeof requestAnimationFrame === 'function'
    ? (cb) => {
        const id = requestAnimationFrame(cb)
        return () => cancelAnimationFrame(id)
      }
    : // SSR / 无 rAF 环境：没有帧就没有动画，直接由调用方落终值
      () => () => {}

/**
 * 播放一段数字滚动。挂载、目标值变化时调用；返回值用于组件卸载/重放时取消。
 *
 * duration <= 0 或调度器不产帧时，直接回调一次终值——「跳到位」而不是「不动」。
 */
export function playCountUp(options: PlayCountUpOptions): PlayingCountUp {
  const { from, to, duration, easing = 'easeOut', onFrame } = options
  const ease = EASINGS[easing] ?? easeOutCubic
  const schedule = options.scheduler ?? defaultScheduler
  const now = options.now ?? (() => performance.now())

  if (duration <= 0) {
    onFrame(to)
    return { cancel: () => {} }
  }

  let cancelled = false
  let cancelFrame: (() => void) | null = null
  const start = now()

  const step = (t: number) => {
    if (cancelled) return
    const progress = Math.min((t - start) / duration, 1)
    onFrame(from + (to - from) * ease(progress))
    if (progress < 1) {
      cancelFrame = schedule(step)
    } else {
      cancelFrame = null
    }
  }

  /*
   * 首帧同步出：挂载当帧就显示起始值。若只调度不执行，
   * 组件的第一帧渲染会拿不到 animatedValue 而闪现终值一帧。
   */
  step(now())
  return {
    cancel: () => {
      cancelled = true
      cancelFrame?.()
      cancelFrame = null
    },
  }
}

/** 系统是否要求减弱动态。开启时调用方应跳过动画直接落终值 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}
