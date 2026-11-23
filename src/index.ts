import type { App, Plugin } from 'vue'
import ElProConfigProvider from './components/ElProConfigProvider/ElProConfigProvider.vue'
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
import ElProCodeEditor from './components/ElProCodeEditor/ElProCodeEditor.vue'
import ElProRichText from './components/ElProRichText/ElProRichText.vue'
import ElProSchemaForm from './components/ElProSchemaForm/ElProSchemaForm.vue'

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
  ElProCodeEditor,
  ElProRichText,
  ElProSchemaForm,
  ElProConfigProvider,
}

/** Monaco Worker 注册：使用方在自己的入口传 ?worker 导入的工厂（见函数 JSDoc） */
export { setupMonacoWorkers } from './components/ElProCodeEditor/monacoSetup'

/* --------------------------------- 内核 --------------------------------- */

export { useTable, pickSearchColumns } from './core/useTable'
export type { ProTableAction, UseTableOptions } from './core/useTable'

/**
 * 全局配置层：ProConfigProvider 的注入与合并逻辑。
 * `useProConfig` / `useProLabel` 给组件读全局默认，`routeToMenu` 给菜单数据管道。
 */
export {
  DEFAULT_PRO_LABELS,
  EMPTY_PRO_CONFIG,
  PRO_CONFIG,
  mergeProConfig,
  provideProConfig,
  useProConfig,
  useProLabel,
} from './core/configContext'

/** 内置语言包：zhCN（默认）/ enUS；localePack(locale) 取当前语言包（配 ProConfigProvider 的 locale） */
export { zhCN, enUS, localePack } from './core/locales'

/** 菜单数据管道：路由记录 → ProLayoutMenuItem */
export { routeToMenu } from './core/menu'
export type { ProRouteLike, RouteToMenuOptions } from './core/menu'

/** 表单实例。弹窗 / 抽屉表单的 `formRef` 就是这个类型 */
export type { ProFormInstance } from './components/ElProForm/useFormContainer'

export { applyColumnOrder, isSettableColumn, moveItem, sortPropsByFixed } from './core/column'
export type { ColumnFixed, ColumnFixedState } from './core/column'

export { BREAKPOINTS, BREAKPOINT_ORDER, normalizeGutter, resolveResponsive, useBreakpoint } from './core/responsive'
export type { NormalizedGutter } from './core/responsive'

/** 数字滚动内核：easeOutCubic 等缓动 + playCountUp 帧滚动（调度器可注入） */
export { easeLinear, easeOutCubic, playCountUp, prefersReducedMotion } from './core/countUp'
export type { CountUpEasing, FrameScheduler, PlayCountUpOptions, PlayingCountUp } from './core/countUp'

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
  ElProCodeEditor,
  ElProRichText,
  ElProSchemaForm,
  ElProConfigProvider,
]

/**
 * 全量安装。也支持按需：
 * `import { ElProTable } from 'el-pro-components'`
 */
/**
 * 全量安装。UMD 全局用法也走它：UMD 的命名导出集合顶层没有 install
 * （插件对象在 .default 下），不提为命名导出的话 `app.use(全局对象)` 会静默注册零组件。
 */
export function install(app: App) {
  for (const comp of components) {
    const name = (comp as { name?: string }).name
    if (name) app.component(name, comp)
  }
}

export const ElProComponents: Plugin = {
  install,
}

export default ElProComponents
