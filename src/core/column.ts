/**
 * 列的「可设置 / 可排序」判定与顺序应用。
 *
 * 为什么单独抽一层：列设置面板（TableToolbar）和表格本体（ElProTable）
 * 必须用同一套判定，各写一套必然会分叉，出现「面板里能拖、表格没反应」
 * 这种查半天的问题。
 */
import type { ProColumn } from '../types'

/**
 * 参与列设置（显示/隐藏 + 拖拽排序）的列。
 *
 * 排除三类：
 * - 没有 prop 的列（纯插槽列、自增索引列），没法用它做唯一标识
 * - option / index / indexBorder —— 这些列的位置和存在是结构性的，不该被用户摆布
 * - 显式 hideInSetting 的列
 */
export function isSettableColumn(col: ProColumn): boolean {
  if (!col.prop) return false
  if (col.hideInSetting) return false
  const vt = col.valueType
  return vt !== 'option' && vt !== 'index' && vt !== 'indexBorder'
}

/**
 * 按用户拖出来的顺序重排列。
 *
 * 关键点：**只重排可设置列**，索引列 / 操作列原地不动。
 * 如果对整个数组做排序，操作列会被拖到两列中间，表格立刻散架。
 *
 * 不在 order 里的列（用户新加了一列、或者 order 里存的是旧列名）
 * 排到已排序列之后，并保持它们原来彼此之间的相对顺序。
 */
export function applyColumnOrder<T>(columns: ProColumn<T>[], order: string[]): ProColumn<T>[] {
  if (!order.length) return columns

  const rank = new Map<string, number>()
  order.forEach((prop, i) => rank.set(prop, i))

  const settable = columns.filter(isSettableColumn)
  if (settable.length < 2) return columns

  const sorted = settable
    .map((col, i) => ({ col, i, r: rank.get(col.prop!) ?? order.length + i }))
    .sort((a, b) => a.r - b.r)
    .map((x) => x.col)

  let cursor = 0
  return columns.map((col) => (isSettableColumn(col) ? sorted[cursor++] : col))
}

/** 把 list 里 from 位置的元素移到 to 位置，返回新数组（不改原数组） */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  const next = list.slice()
  if (from < 0 || from >= next.length) return next
  const [item] = next.splice(from, 1)
  next.splice(Math.max(0, Math.min(to, next.length)), 0, item)
  return next
}

/* ------------------------------ 固定列 ------------------------------ */

/** 列的固定位置。不固定就是没这个 key */
export type ColumnFixed = 'left' | 'right'
/** prop -> 固定位置 */
export type ColumnFixedState = Record<string, ColumnFixed>

function fixedRank(state: ColumnFixedState, prop: string): number {
  if (state[prop] === 'left') return -1
  if (state[prop] === 'right') return 1
  return 0
}

/**
 * 按「左固定 → 不固定 → 右固定」重排 prop 列表，组内保持原相对顺序。
 *
 * 为什么固定列要连带重排顺序：el-table 的 fixed 是靠 sticky 定位 + 逐列累加
 * offset 算出来的，固定列如果散落在中间，视觉上就会被中间那些列盖住。
 * 所以用户在列设置里一按「固定」，顺序就必须跟着改，并且要写回 order，
 * 否则刷新后「固定了但位置没动」，看起来像没生效。
 */
export function sortPropsByFixed(props: string[], state: ColumnFixedState): string[] {
  // Array.prototype.sort 自 ES2019 起是稳定排序，组内相对顺序不用额外处理
  return props.slice().sort((a, b) => fixedRank(state, a) - fixedRank(state, b))
}
