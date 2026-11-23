/**
 * 全局配置层上下文：ProConfigProvider 往下发的「库级默认」。
 *
 * 为什么需要它：内置文案（折叠按钮 title 等）硬编码在组件里，中英文切换或
 * 换个叫法都得改源码；自定义 valueType（valueTypeMap）只支持逐列注册，跨表
 * 复用同一套自定义渲染时每个使用方都要重复写一遍。React 版用
 * ProConfigProvider（provider/index.tsx）统一下发，这里对齐同样的职责。
 *
 * 分工：
 * - valueTypeMap 给**自定义 valueType**用（render 读态 / formRender 编辑态），
 *   在 CellRenderer / FormField 里命中时优先于内置 valueType 词汇；
 * - labels 给**内置文案**用。生效文案的解析优先级：
 *   **手动 labels 覆盖 > 当前 locale 语言包 > zh-CN 默认**（语言包见 locales.ts）；
 * - tableSize / formSize 给**尺寸默认**用，prop 未显式传时回落到全局默认。
 *
 * 没有 Provider 时 inject 拿到空配置：所有行为与引入全局配置层之前完全一致，
 * 单独使用任何组件依然是原来的行为。
 */
import { inject, provide } from 'vue'
import type { ComputedRef, InjectionKey } from 'vue'
import type { ProConfigContext, ProLabels, ProLocale } from '../types'
import { zhCN, localePack } from './locales'

export const PRO_CONFIG: InjectionKey<ProConfigContext> = Symbol('elProConfig')

/** 内置文案兜底（zh-CN 语言包）。语言包缺键时兜底用，一般不会发生 */
export const DEFAULT_PRO_LABELS: Required<ProLabels> = zhCN

/** 无 Provider 时的空配置。行为与引入全局配置层之前完全一致，读方不要改它 */
export const EMPTY_PRO_CONFIG: ProConfigContext = {
  valueTypeMap: {},
  labels: { ...DEFAULT_PRO_LABELS },
  locale: 'zh-CN',
  manualLabels: {},
}

/**
 * 当前生效的全局配置。inject 拿不到时返回空配置，使用方零兜底。
 * labels 与 valueTypeMap 的响应式由 Provider 侧保证：配置变更后读方拿到最新值。
 */
export function useProConfig(): ProConfigContext {
  return inject<ProConfigContext>(PRO_CONFIG, EMPTY_PRO_CONFIG)
}

/** 读一条内置文案，与默认值合并后返回 */
export function useProLabel(): (key: keyof ProLabels) => string {
  const config = useProConfig()
  return (key) => config.labels[key] ?? DEFAULT_PRO_LABELS[key]
}

/**
 * 父子 Provider 合并规则。labels 由「手动覆盖 + 语言包」解析：
 * - locale 取「子声明 > 父声明 > zh-CN」；
 * - manualLabels 逐层累积**手动 labels 覆盖**（父配的覆盖在子仍生效）；
 * - 生效 labels = { ...localePack(locale), ...manualLabels }。
 *
 * 为什么手动覆盖与语言包分开存：嵌套时子切 locale，若直接用父的生效 labels
 * 拼接，父语言包的值会把子语言包整体盖掉（例如父 en 子 zh，父的英文包值全
 * 跑进子的 zh 里）。manualLabels 只累积「手动覆盖」，语言包始终按当前 locale 现取。
 */
export function mergeProConfig(
  parent: ProConfigContext | undefined,
  own: {
    valueTypeMap?: ProConfigContext['valueTypeMap']
    labels?: ProLabels
    locale?: ProLocale
    tableSize?: ProConfigContext['tableSize']
    formSize?: ProConfigContext['formSize']
  },
): ProConfigContext {
  const locale = own.locale ?? parent?.locale ?? 'zh-CN'
  const manualLabels = {
    ...(parent?.manualLabels ?? {}),
    ...(own.labels ?? {}),
  }
  return {
    valueTypeMap: { ...(parent?.valueTypeMap ?? {}), ...(own.valueTypeMap ?? {}) },
    labels: {
      ...localePack(locale),
      ...manualLabels,
    },
    locale,
    manualLabels,
    tableSize: own.tableSize ?? parent?.tableSize,
    formSize: own.formSize ?? parent?.formSize,
  }
}

/**
 * Provider 侧挂载用：把 merge 结果包成「getter 对象」往下 provide。
 *
 * 为什么不用 reactive / 直接 provide computed：
 * - reactive 会把内部的 ComputedRef 自动解包，labels 的契约就乱了；
 * - 直接 provide computed，消费方拿到的是 ref 本身，得到处 .value。
 * getter 对象两边都干净：inject 返回的就是 ProConfigContext，读字段即触发
 * getter，getter 里读 merge computed，响应式链路完整（props / 父配置变更后
 * 读方拿到最新值）。
 */
export function provideProConfig(merged: ComputedRef<ProConfigContext>) {
  provide(PRO_CONFIG, {
    get valueTypeMap() {
      return merged.value.valueTypeMap
    },
    get labels() {
      return merged.value.labels
    },
    get locale() {
      return merged.value.locale
    },
    get manualLabels() {
      return merged.value.manualLabels
    },
    get tableSize() {
      return merged.value.tableSize
    },
    get formSize() {
      return merged.value.formSize
    },
  })
}
