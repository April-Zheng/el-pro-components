/**
 * 查询筛选区的布局算法。
 *
 * 对应 ProComponents `QueryFilter/processQueryFilterItems.ts` 的那套逻辑：
 * 折叠时只露出前 N 项、其余不渲染；操作列要贴到最后一行的右边，
 * 靠的是给 `el-col` 算一个 `offset`，而不是靠 flex 把它推过去
 * （推过去会在换行时不听话）。
 *
 * 抽成纯函数的理由很简单：这里的判断全是整数运算，出错的方式很隐蔽
 * （比如 span 不整除 24 时最后一行只剩半格），放到模板里就没法单独验。
 */

/** 折叠后最多显示几项。优先用显式配置，否则按「一行几列，留一列给按钮」推算 */
export function resolveShowLength(
  span: number,
  defaultFormItemsNumber?: number,
  defaultColsNumber?: number,
): number {
  if (defaultFormItemsNumber !== undefined) return defaultFormItemsNumber
  if (defaultColsNumber !== undefined) return defaultColsNumber
  return Math.max(1, Math.floor(24 / span) - 1)
}

/**
 * 操作列的 offset。
 *
 * 最后一行剩下的位置放不下按钮时，按钮换到下一行的最右（`24 - span`）；
 * 放得下就贴着那一项右边。
 */
export function calcActionsOffset(lastRowUsedSpan: number, span: number): number {
  const total = lastRowUsedSpan + span
  return total > 24 ? 24 - span : 24 - total
}

export interface QueryFilterLayout {
  /** 第 i 项是否渲染 */
  visible: boolean[]
  /** 第 i 项落在第几行（不可见为 -1）。`split` 靠它判断哪些列是行首 */
  rowOf: number[]
  /** 操作列 offset */
  actionsOffset: number
  /** 是否需要「展开/收起」按钮 */
  needCollapse: boolean
  /** 折叠时藏了几项 */
  hiddenCount: number
  /** 最后一行已占用的栅格数 */
  lastRowUsedSpan: number
}

export function computeQueryFilterLayout(options: {
  count: number
  span: number
  collapsed: boolean
  showLength: number
}): QueryFilterLayout {
  const { count, span, collapsed, showLength } = options
  const visible = Array.from({ length: count }, (_, index) => !collapsed || index < showLength)
  const rowOf = new Array<number>(count).fill(-1)

  let used = 0
  for (let index = 0; index < count; index += 1) {
    if (!visible[index]) continue
    // 这一行剩下的位置放不下，就折到下一行（el-col 自己不折，得先把它挤过去）
    if (24 - (used % 24) < span) used += 24 - (used % 24)
    rowOf[index] = Math.floor(used / 24)
    used += span
  }

  const lastRowUsedSpan = used % 24
  return {
    visible,
    rowOf,
    actionsOffset: calcActionsOffset(lastRowUsedSpan, span),
    needCollapse: count > showLength,
    hiddenCount: Math.max(0, count - showLength),
    lastRowUsedSpan,
  }
}
