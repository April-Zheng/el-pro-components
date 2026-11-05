import type { App, Plugin } from 'vue'
import ElProLayout from './components/ElProLayout/ElProLayout.vue'
import ElProDescriptions from './components/ElProDescriptions/ElProDescriptions.vue'
import ElProForm from './components/ElProForm/ElProForm.vue'
import ProFormGroup from './components/ElProForm/ProFormGroup.vue'
import ElProStepsForm from './components/ElProForm/ElProStepsForm.vue'
import ElProLightFilter from './components/ElProForm/ElProLightFilter.vue'
import ElProModalForm from './components/ElProForm/ElProModalForm.vue'
import ElProDrawerForm from './components/ElProForm/ElProDrawerForm.vue'
import ElProQueryFilter from './components/ElProQueryFilter/ElProQueryFilter.vue'
import ElProPageContainer from './components/ElProPageContainer/ElProPageContainer.vue'
import ElProPageHeader from './components/ElProPageContainer/ElProPageHeader.vue'
import ElProFooterToolbar from './components/ElProPageContainer/ElProFooterToolbar.vue'
import ElProTable from './components/ElProTable/ElProTable.vue'
import ElProEditableTable from './components/ElProTable/ElProEditableTable.vue'
import ElProCard from './components/ElProCard/ElProCard.vue'
import ElProCheckCard from './components/ElProCard/ElProCheckCard.vue'
import ElProCheckCardGroup from './components/ElProCard/ElProCheckCardGroup.vue'
import ElProList from './components/ElProList/ElProList.vue'
import ElProSkeleton from './components/ElProSkeleton/ElProSkeleton.vue'
import ElProStatistic from './components/ElProCard/ElProStatistic.vue'
import ElProStatisticCard from './components/ElProCard/ElProStatisticCard.vue'
import ElProStatisticCardGroup from './components/ElProCard/ElProStatisticCardGroup.vue'
import CellRenderer from './fields/CellRenderer.vue'
import FormField from './fields/FormField.vue'
import ElProFormDependency from './components/ElProForm/ElProFormDependency.vue'
import ElProFormCaptcha from './components/ElProForm/ElProFormCaptcha.vue'
import ElProFieldSet from './components/ElProForm/ElProFieldSet.vue'
import ElProCardDivider from './components/ElProCard/ElProCardDivider.vue'

export {
  ElProLayout,
  ElProDescriptions,
  ElProForm,
  ProFormGroup,
  ElProStepsForm,
  ElProLightFilter,
  ElProModalForm,
  ElProDrawerForm,
  ElProTable,
  ElProEditableTable,
  ElProQueryFilter,
  ElProPageContainer,
  ElProPageHeader,
  ElProFooterToolbar,
  ElProCard,
  ElProCheckCard,
  ElProCheckCardGroup,
  ElProList,
  ElProSkeleton,
  ElProStatistic,
  ElProStatisticCard,
  ElProStatisticCardGroup,
  CellRenderer,
  FormField,
  ElProFormDependency,
  ElProFormCaptcha,
  ElProFieldSet,
  ElProCardDivider,
}

/* --------------------------------- 内核 --------------------------------- */

export { useTable, pickSearchColumns } from './core/useTable'
export type { ProTableAction, UseTableOptions } from './core/useTable'

/** 表单实例。弹窗 / 抽屉表单的 `formRef` 就是这个类型 */
export type { ProFormInstance } from './components/ElProForm/useFormContainer'

export { applyColumnOrder, isSettableColumn, moveItem, sortPropsByFixed } from './core/column'
export type { ColumnFixed, ColumnFixedState } from './core/column'

export { BREAKPOINTS, BREAKPOINT_ORDER, normalizeGutter, resolveResponsive, useBreakpoint } from './core/responsive'
export type { NormalizedGutter } from './core/responsive'

export { pickDeps, resolveColumnByDependency, resolveFormColumns } from './core/formDependency'

export { calcActionsOffset, computeQueryFilterLayout, resolveShowLength } from './core/queryFilter'

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

const components = [
  ElProTable,
  ElProEditableTable,
  ElProQueryFilter,
  ElProLightFilter,
  ElProPageContainer,
  ElProPageHeader,
  ElProFooterToolbar,
  ElProForm,
  ProFormGroup,
  ElProStepsForm,
  ElProModalForm,
  ElProDrawerForm,
  ElProDescriptions,
  ElProLayout,
  ElProCard,
  ElProCheckCard,
  ElProCheckCardGroup,
  ElProList,
  ElProSkeleton,
  ElProStatistic,
  ElProStatisticCard,
  ElProStatisticCardGroup,
]

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
