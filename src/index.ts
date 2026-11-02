import type { App, Plugin } from 'vue'
import ElProLayout from './components/ElProLayout/ElProLayout.vue'
import ElProDescriptions from './components/ElProDescriptions/ElProDescriptions.vue'
import ElProForm from './components/ElProForm/ElProForm.vue'
import ElProTable from './components/ElProTable/ElProTable.vue'
import CellRenderer from './fields/CellRenderer.vue'
import FormField from './fields/FormField.vue'

export { ElProLayout, ElProDescriptions, ElProForm, ElProTable, CellRenderer, FormField }

/* --------------------------------- 内核 --------------------------------- */

export { useTable, pickSearchColumns } from './core/useTable'
export type { ProTableAction, UseTableOptions } from './core/useTable'

export {
  DISPLAY_ONLY_VALUE_TYPES,
  ENUM_VALUE_TYPES,
  enumToOptions,
  formatDate,
  formatFromNow,
  formatNumber,
  formatQuarter,
  getISOWeek,
  parseDate,
  resolveCell,
  resolveEnumItem,
} from './core/valueType'
export type { ResolvedCell, ResolveCellOptions } from './core/valueType'

export * from './types'

/* --------------------------------- 插件 --------------------------------- */

const components = [ElProTable, ElProForm, ElProDescriptions, ElProLayout]

/**
 * 全量安装。也支持按需：
 * `import { ElProTable } from 'el-pro-components'`
 */
export const ElProComponents: Plugin = {
  install(app: App) {
    for (const comp of components) {
      const name = (comp as { name?: string }).name
      if (name) app.component(name, comp)
    }
  },
}

export default ElProComponents
