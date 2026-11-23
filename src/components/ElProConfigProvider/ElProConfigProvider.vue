<script setup lang="ts">
/**
 * ElProConfigProvider —— 全局配置层。往下滑「库级默认」：
 * 自定义 valueType（valueTypeMap）、内置文案（labels）、表格/表单尺寸默认。
 *
 * 支持嵌套：子 Provider 先 inject 父配置再合并，自己的 props 优先。
 * 没有 Provider 时各组件回落到改造前的行为，单独使用零影响。
 *
 * 只负责配置下发，不渲染任何结构 —— 唯一的产出是 slot。
 */
import { computed } from 'vue'
import { mergeProConfig, provideProConfig, useProConfig } from '../../core/configContext'
import type { ProConfigContext, ProLabels, ProLocale, ProValueTypeConfig, TableSize } from '../../types'

defineOptions({ name: 'ElProConfigProvider' })

const props = defineProps<{
  /** 自定义 valueType 注册表。键是 valueType 名，命中时优先于内置 valueType 词汇 */
  valueTypeMap?: Record<string, ProValueTypeConfig>
  /** 内置文案覆盖。逐键生效，未配置的键保持默认值 */
  labels?: ProLabels
  /** 表格 / 工具栏密度默认。列/表 prop 显式传时以 prop 为准 */
  tableSize?: TableSize
  /** 表单尺寸默认 */
  formSize?: TableSize
  /**
   * 内置语言（默认 zh-CN）。切换后未手动覆盖的文案整体换语言；
   * 手动 labels 覆盖的优先级在语言包之上
   */
  locale?: ProLocale
}>()

const parent = useProConfig()

const merged = computed<ProConfigContext>(() => mergeProConfig(parent, props))

provideProConfig(merged)
</script>

<template>
  <slot />
</template>
