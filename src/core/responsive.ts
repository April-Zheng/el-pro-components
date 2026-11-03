/**
 * 响应式取值。
 *
 * ElProCard / ElProList 的 `colSpan`、`gutter`、`grid.column` 都允许写成
 * `{ xs: 24, md: 12 }` 这种按断点取值的形式。Element Plus 提供的是**栅格组件**
 * （el-row/el-col），但它不导出「当前断点」这个状态；卡片要按断点改宽度，
 * 只能自己监听一次视口。
 *
 * 所以这里做一个极小的断点订阅：全库共用一份实例，监听一次 resize，
 * 没有组件使用时不产生任何副作用。断点阈值对齐 Bootstrap / antd，不是
 * Element Plus 的（EP 的 xs/sm/md/lg/xl 语义只在栅格 span 里隐式存在）。
 */
import { onBeforeUnmount, readonly, ref } from 'vue'
import type { Ref } from 'vue'
import type { Breakpoint, ResponsiveValue } from '../types'

/** 断点下限（含）。与 antd 的 Grid 断点一致 */
export const BREAKPOINTS: Record<Breakpoint, number> = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1600,
}

/** 由小到大。取「命中值的最大断点」时要按顺序倒着找 */
export const BREAKPOINT_ORDER: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl']

let listeners = 0
const current = ref<Breakpoint>('xl')

function detect(): Breakpoint {
  if (typeof window === 'undefined') return 'xl'
  const w = window.innerWidth
  let matched: Breakpoint = 'xs'
  for (const bp of BREAKPOINT_ORDER) {
    if (w >= BREAKPOINTS[bp]) matched = bp
  }
  return matched
}

function onResize() {
  current.value = detect()
}

/**
 * 当前断点。第一个调用者负责挂监听，最后一个卸载时摘掉。
 * 返回值是 readonly ref，避免使用方随手改掉全局状态。
 */
export function useBreakpoint(): Readonly<Ref<Breakpoint>> {
  if (typeof window !== 'undefined') {
    if (listeners === 0) {
      current.value = detect()
      window.addEventListener('resize', onResize, { passive: true })
    }
    listeners += 1
    onBeforeUnmount(() => {
      listeners -= 1
      if (listeners <= 0) {
        listeners = 0
        window.removeEventListener('resize', onResize)
      }
    })
  }
  return readonly(current) as Readonly<Ref<Breakpoint>>
}

function isResponsiveMap<T>(value: unknown): value is Partial<Record<Breakpoint, T>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * 按当前断点取值：
 * - 直给（数字 / 字符串）→ 原样返回
 * - 断点表 → 取「小于等于当前断点」里最大的那个已配置值；都没有则 fallback
 *
 * 为什么要倒着找：`{ xs: 24, lg: 12 }` 在 md 上应该拿到 24，
 * 因为 lg 还没命中，而 xs 是「已经生效过」的最近一档。
 */
export function resolveResponsive<T>(
  value: ResponsiveValue<T> | undefined,
  breakpoint: Breakpoint,
  fallback: T,
): T
export function resolveResponsive<T>(
  value: ResponsiveValue<T> | undefined,
  breakpoint: Breakpoint,
): T | undefined
export function resolveResponsive<T>(
  value: ResponsiveValue<T> | undefined,
  breakpoint: Breakpoint,
  fallback?: T,
): T | undefined {
  if (value === undefined || value === null) return fallback
  if (!isResponsiveMap(value)) return value as T

  const idx = BREAKPOINT_ORDER.indexOf(breakpoint)
  for (let i = idx; i >= 0; i -= 1) {
    const hit = (value as Partial<Record<Breakpoint, T>>)[BREAKPOINT_ORDER[i]]
    if (hit !== undefined) return hit
  }
  return fallback
}

export interface NormalizedGutter {
  rowGap: number
  columnGap: number
}

/**
 * gutter 归一化。
 *
 * 支持三种写法，和 antd 的约定对齐：
 * - `16`                     → 行列都是 16
 * - `[16, 8]`                → 水平 16 / 垂直 8
 * - `{ xs: 8, lg: 16 }`      → 按断点取
 * - `[{ xs: 8, lg: 16 }, 8]` → 水平响应式 + 垂直固定
 */
export function normalizeGutter(
  gutter: ResponsiveValue<number> | [ResponsiveValue<number>, number] | undefined,
  breakpoint: Breakpoint,
): NormalizedGutter {
  if (gutter === undefined) return { rowGap: 0, columnGap: 0 }

  if (Array.isArray(gutter)) {
    const [h, v] = gutter
    return {
      columnGap: resolveResponsive(h, breakpoint, 0),
      rowGap: resolveResponsive(v, breakpoint, 0),
    }
  }

  const both = resolveResponsive(gutter, breakpoint, 0)
  return { rowGap: both, columnGap: both }
}
