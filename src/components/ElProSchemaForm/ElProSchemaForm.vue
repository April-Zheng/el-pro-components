<script setup lang="ts">
/**
 * ElProSchemaForm —— 统一表单入口（对齐 React BetaSchemaForm 的职责：layoutType 选容器、
 * columns 直通渲染）。不是新的字段层：一份 ProColumn[] 配置，换个 layoutType 就在
 * 普通表单 / 弹窗 / 抽屉 / 分步 / 查询区 / 轻量筛选之间切换，字段能力全部继承既有
 * 列驱动管线（valueType / fieldProps / hideInForm / divider / formSet / dependency /
 * group / formList），不做 embed，不做 JSON Schema 转换（React 源码实态也是 columns
 * 直通，文档宣称的 Json Schema 在源码里并无转换器）。
 *
 * steps 时 columns 传二维数组（每步一维），自动转成 ElProStepsForm 的 steps，
 * 每步标题默认「步骤 N」并走 labels 的 stepTitle 键。
 */
import { computed, reactive, useAttrs } from 'vue'
import ElProForm from '../ElProForm/ElProForm.vue'
import ElProModalForm from '../ElProForm/ElProModalForm.vue'
import ElProDrawerForm from '../ElProForm/ElProDrawerForm.vue'
import ElProStepsForm from '../ElProForm/ElProStepsForm.vue'
import ElProLightFilter from '../ElProForm/ElProLightFilter.vue'
import ElProQueryFilter from '../ElProQueryFilter/ElProQueryFilter.vue'
import { useProLabel } from '../../core/configContext'
import type { ProColumn, ProSchemaFormLayout } from '../../types'

defineOptions({ name: 'ElProSchemaForm' })

const props = withDefaults(
  defineProps<{
    /** 字段配置。layoutType !== 'steps' 时一维；'steps' 时二维（每步一维） */
    columns?: ProColumn[] | ProColumn[][]
    /** 分发目标 @default 'form' */
    layoutType?: ProSchemaFormLayout
    /** 受控数据。未传时 form / modal / drawer 用内部草稿（与弹窗抽屉的 draft 语义一致） */
    model?: Record<string, any>
  }>(),
  {
    layoutType: 'form',
    columns: undefined,
    model: undefined,
  },
)

const attrs = useAttrs()
const label = useProLabel()

/** 内部草稿：用户没传 model 时，form / modal / drawer 共用这一份（字段值写到这里） */
const innerModel = reactive<Record<string, any>>({})
const formModel = computed<Record<string, any>>(() => props.model ?? innerModel)

/** 单表单容器用的一维列（误传二维时取第一维） */
const singleColumns = computed<ProColumn[]>(() => {
  const c = props.columns
  if (!Array.isArray(c)) return []
  return Array.isArray(c[0]) ? (c[0] as ProColumn[]) : (c as ProColumn[])
})

/** steps：二维 → 每步一维；默认步名「步骤 N」走 labels（stepTitle） */
const stepItems = computed<{ title: string; columns: ProColumn[] }[]>(() => {
  const c = props.columns
  if (!Array.isArray(c)) return []
  const list = Array.isArray(c[0]) ? (c as ProColumn[][]) : [c as ProColumn[]]
  return list.map((columns, i) => ({ title: `${label('stepTitle')} ${i + 1}`, columns }))
})
</script>

<template>
  <ElProForm v-if="layoutType === 'form'" :columns="singleColumns" :model="formModel" v-bind="attrs">
    <slot />
  </ElProForm>
  <ElProModalForm v-else-if="layoutType === 'modal'" :columns="singleColumns" :model="props.model" v-bind="attrs">
    <slot />
  </ElProModalForm>
  <ElProDrawerForm v-else-if="layoutType === 'drawer'" :columns="singleColumns" :model="props.model" v-bind="attrs">
    <slot />
  </ElProDrawerForm>
  <ElProStepsForm v-else-if="layoutType === 'steps'" :steps="stepItems" v-bind="attrs">
    <slot />
  </ElProStepsForm>
  <ElProQueryFilter v-else-if="layoutType === 'queryFilter'" :columns="singleColumns" v-bind="attrs" />
  <ElProLightFilter v-else-if="layoutType === 'lightFilter'" :columns="singleColumns" v-bind="attrs" />
</template>
