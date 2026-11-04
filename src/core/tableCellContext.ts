/**
 * 表格单元格渲染用的上下文。
 *
 * 为什么需要它：多级表头要求列能**递归**渲染（分组列套子列），
 * 递归就得把单元格模板搬进子组件；而单元格模板要判断
 * 「这格是不是正在编辑」「有没有同名插槽」「保存中吗」——
 * 这些都是 ElProTable 内部状态。
 *
 * 两条路：
 * 1. 把十几个状态挨个当 prop 传 —— 递归时每一层都要转发一遍，改一个加一个
 * 2. provide / inject 一份上下文 —— 子组件直接拿，递归层数不影响参数表
 *
 * 选 2。代价是子组件不能脱离 ElProTable 单独用，但它本来也不对外导出。
 */
import type { InjectionKey, Ref, Slots } from 'vue'
import type { ProColumn, ProEditableConfig } from '../types'

export interface ProTableCellContext {
  /** ElProTable 的插槽表。列插槽（`#${prop}`）从这里面取 */
  slots: Slots
  emptyText: Readonly<Ref<string | false | undefined>>
  editable: Readonly<Ref<ProEditableConfig | null>>
  showDeleteRow: Readonly<Ref<boolean>>
  savingKey: Readonly<Ref<string | number | null>>

  slotName: (col: ProColumn) => string
  hasSlot: (col: ProColumn) => boolean

  /** 行标识。新增行还没有主键，改用临时 key —— 见 ElProTable 里 TMP_ROW_KEY 的说明 */
  keyOf: (row: any) => string | number
  isEditing: (row: any) => boolean
  isEditCell: (row: any, col: ProColumn, index: number) => boolean
  draftOf: (row: any) => Record<string, any>
  setDraftValue: (row: any, prop: string, value: any) => void

  /** 行拖拽：值等于该列 prop 时，单元格左侧渲染拖拽把手 */
  dragSortKey: Readonly<Ref<string | undefined>>

  startEdit: (row: any) => void
  saveRow: (row: any) => void
  cancelRow: (row: any) => void
  removeRow: (row: any) => void
}

export const PRO_TABLE_CELL: InjectionKey<ProTableCellContext> = Symbol('elProTableCell')
