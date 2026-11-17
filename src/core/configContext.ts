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
 * - labels 给**内置文案**用，只做文案注入，不做完整 i18n；
 * - tableSize / formSize 给**尺寸默认**用，prop 未显式传时回落到全局默认。
 *
 * 没有 Provider 时 inject 拿到空配置：所有行为与引入全局配置层之前完全一致，
 * 单独使用任何组件依然是原来的行为。
 */
import { inject, provide } from 'vue'
import type { ComputedRef, InjectionKey } from 'vue'
import type { ProConfigContext, ProLabels } from '../types'

export const PRO_CONFIG: InjectionKey<ProConfigContext> = Symbol('elProConfig')

/** 内置文案默认值。Provider 没配 labels 时用这一份 */
export const DEFAULT_PRO_LABELS: Required<ProLabels> = {
  layoutExpand: '展开菜单',
  layoutCollapse: '收起菜单',
}

/** 无 Provider 时的空配置。行为与引入全局配置层之前完全一致，读方不要改它 */
export const EMPTY_PRO_CONFIG: ProConfigContext = {
  valueTypeMap: {},
  labels: { ...DEFAULT_PRO_LABELS },
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
 * 父子 Provider 合并规则：自己的 props 优先，labels 逐键覆盖。
 * labels 之所以单独合并：父 Provider 配了 layoutCollapse、子 Provider 只想改
 * valueTypeMap 时，labels 不该被子的空表整体冲掉。
 */
export function mergeProConfig(
  parent: ProConfigContext | undefined,
  own: {
    valueTypeMap?: ProConfigContext['valueTypeMap']
    labels?: ProLabels
    tableSize?: ProConfigContext['tableSize']
    formSize?: ProConfigContext['formSize']
  },
): ProConfigContext {
  return {
    valueTypeMap: { ...(parent?.valueTypeMap ?? {}), ...(own.valueTypeMap ?? {}) },
    labels: {
      ...DEFAULT_PRO_LABELS,
      ...(parent?.labels ?? {}),
      ...(own.labels ?? {}),
    },
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
    get tableSize() {
      return merged.value.tableSize
    },
    get formSize() {
      return merged.value.formSize
    },
  })
}
