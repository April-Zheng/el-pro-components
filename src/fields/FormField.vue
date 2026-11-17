<script setup lang="ts">
/**
 * 表单 / 搜索栏的控件渲染器。
 *
 * 和 CellRenderer 共用同一套 valueType 词汇，但落到 Element Plus 的输入控件上。
 *
 * 日期类统一设置 `value-format`：不设的话 el-date-picker 会把 Date 对象
 * 直接吐给 request，后端就收到 `2026-11-02T08:00:00.000Z` 这种值。
 * 传 `column.valueFormat` 或 `fieldProps['value-format']` 可覆盖。
 */
import { computed, defineComponent, inject } from 'vue'
import {
  ElCascader,
  ElCheckbox,
  ElCheckboxGroup,
  ElColorPicker,
  ElDatePicker,
  ElInput,
  ElInputNumber,
  ElOption,
  ElRadio,
  ElRadioButton,
  ElRadioGroup,
  ElRate,
  ElSegmented,
  ElSelect,
  ElSlider,
  ElSwitch,
  ElTimePicker,
  ElTreeSelect,
} from 'element-plus'
import type { VNode } from 'vue'
import type { ProColumn } from '../types'
import { enumToOptions } from '../core/valueType'
import { PRO_CONFIG, EMPTY_PRO_CONFIG } from '../core/configContext'
import { PRO_FORM_READONLY } from '../core/formContext'
import CellRenderer from './CellRenderer.vue'
import ElProCodeEditor from '../components/ElProCodeEditor/ElProCodeEditor.vue'
import ElProRichText from '../components/ElProRichText/ElProRichText.vue'

/**
 * 自定义 valueType 编辑态的宿主，理由同 CellRenderer 的 VNodeHost：
 * :is 对 VNode 的支持依赖内部实现，函数式组件是文档明确的行为。
 */
const VNodeHost = (props: { node: VNode | null }) => props.node
VNodeHost.props = ['node'] as const

const props = defineProps<{
  modelValue: any
  column: ProColumn
  mode?: 'search' | 'form'
  /** 表单级只读：字段渲染为只读展示而非禁用输入 */
  formReadonly?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [any] }>()

/** 表单级只读上下文：ElProForm 注入，供 group / formList 里的深层字段继承 */
const formReadonlyCtx = inject(PRO_FORM_READONLY, null)

/** 全局 valueTypeMap：ProConfigProvider 下发，无 Provider 时为空表 */
const config = inject(PRO_CONFIG, EMPTY_PRO_CONFIG)

const value = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const rawType = computed(() => props.column.valueType ?? 'text')

const effectiveType = computed(() => {
  const vt = rawType.value
  // 没写 valueType 但配了 valueEnum：按下拉处理
  if (!props.column.valueType && props.column.valueEnum) return 'select'
  return vt
})

/** 只读展示时 codeEditor 退化为 code 形态（CellRenderer 的代码块） */
const displayType = computed(() => (effectiveType.value === 'codeEditor' ? 'code' : effectiveType.value))

const mergedProps = computed(() => {
  const base: Record<string, any> = { ...(props.column.fieldProps ?? {}) }
  if (props.mode === 'search' && typeof props.column.search === 'object') {
    Object.assign(base, props.column.search.props ?? {})
  }
  if (props.column.readonly !== undefined) base.disabled = props.column.readonly
  return base
})

/**
 * 只读展示形态：列级 readonly 或表单级 readonly 都渲染成纯展示（与 CellRenderer 同一套
 * valueType 词汇），而不是禁用的输入框——对齐 React 的 EditOrReadOnlyContext mode='read'。
 */
const isReadonlyDisplay = computed(
  () =>
    props.mode === 'form' &&
    (props.formReadonly === true || formReadonlyCtx?.value === true || props.column.readonly === true),
)

const options = computed(() => enumToOptions(props.column.valueEnum, true))

/** 命中自定义 valueType 时的编辑态渲染结果；未命中返回 null，走内置控件 */
const customNode = computed<VNode | null>(() => {
  const vt = props.column.valueType
  if (!vt) return null
  const cfg = config.valueTypeMap[vt]
  if (!cfg?.formRender) return null
  return cfg.formRender({
    modelValue: props.modelValue,
    update: (v: any) => emit('update:modelValue', v),
    column: props.column,
    mode: props.mode ?? 'form',
  })
})

const SELECT_LIKE = [
  'select',
  'radio',
  'radioButton',
  'checkbox',
  'switch',
  'segmented',
  'cascader',
  'treeSelect',
  'tag',
  'status',
  'rate',
  'slider',
  'color',
  'time',
  'timeRange',
  'date',
  'dateTime',
  'dateRange',
  'dateTimeRange',
  'dateWeek',
  'dateMonth',
  'dateQuarter',
  'dateYear',
  'dateMonthRange',
  'dateQuarterRange',
  'dateYearRange',
]

const placeholder = computed(() => {
  if (props.mode === 'search' && typeof props.column.search === 'object') {
    const p = props.column.search.placeholder
    if (p) return p
  }
  const label = props.column.label ?? ''
  return SELECT_LIKE.includes(effectiveType.value) ? `请选择${label}` : `请输入${label}`
})

/** EP 的 picker type。注意 Element Plus 没有季度选择器，dateQuarter 降级到 month */
const pickerType = computed(() => {
  switch (effectiveType.value) {
    case 'date':
      return 'date'
    case 'dateTime':
      return 'datetime'
    case 'dateRange':
      return 'daterange'
    case 'dateTimeRange':
      return 'datetimerange'
    case 'dateWeek':
      return 'week'
    case 'dateMonth':
    case 'dateQuarter':
      return 'month'
    case 'dateYear':
      return 'year'
    case 'dateMonthRange':
    case 'dateQuarterRange':
      return 'monthrange'
    case 'dateYearRange':
      return 'yearrange'
    default:
      return 'date'
  }
})

const DEFAULT_VALUE_FORMAT: Record<string, string> = {
  date: 'YYYY-MM-DD',
  datetime: 'YYYY-MM-DD HH:mm:ss',
  daterange: 'YYYY-MM-DD',
  datetimerange: 'YYYY-MM-DD HH:mm:ss',
  week: 'YYYY-MM-DD',
  month: 'YYYY-MM',
  year: 'YYYY',
  monthrange: 'YYYY-MM',
  yearrange: 'YYYY',
}

const dateValueFormat = computed(() => {
  const custom = mergedProps.value['value-format'] ?? props.column.valueFormat
  if (custom) return custom
  return DEFAULT_VALUE_FORMAT[pickerType.value] ?? 'YYYY-MM-DD'
})

const isDateLike = computed(
  () =>
    effectiveType.value.startsWith('date') ||
    effectiveType.value === 'time' ||
    effectiveType.value === 'timeRange',
)

/** 数字类是否该用 el-input-number */
const isNumeric = computed(() =>
  ['number', 'money', 'percent'].includes(effectiveType.value),
)

const inputType = computed(() => {
  switch (effectiveType.value) {
    case 'password':
      return 'password'
    case 'textarea':
    case 'code':
    case 'jsonCode':
      return 'textarea'
    default:
      return 'text'
  }
})

/**
 * 数字区间：对外是 `[min, max]`，对内是两个独立输入框。
 *
 * 两端都清空时直接给 `undefined` 而不是 `[null, null]` —— 后端对着
 * `[null, null]` 做 `if (range)` 判断会得到 true，等于「筛了但没筛」。
 */
const rangeValue = computed<[number | undefined, number | undefined]>(() =>
  Array.isArray(props.modelValue)
    ? [props.modelValue[0] ?? undefined, props.modelValue[1] ?? undefined]
    : [undefined, undefined],
)

function setRangePart(index: 0 | 1, v: number | undefined | null) {
  const next: [number | undefined, number | undefined] = [...rangeValue.value]
  next[index] = v === null ? undefined : v
  emit('update:modelValue', next[0] === undefined && next[1] === undefined ? undefined : next)
}
</script>

<template>
  <!-- 只读展示形态：与表格同一套 valueType 渲染（richText 自己处理，见下方分支） -->
  <CellRenderer
    v-if="isReadonlyDisplay && effectiveType !== 'richText'"
    :value="modelValue"
    :column="{ ...column, valueType: displayType }"
  />

  <!-- 自定义控件优先级最高 -->
  <component
    :is="column.fieldComponent"
    v-else-if="column.fieldComponent"
    v-model="value"
    :column="column"
    :mode="mode"
    v-bind="mergedProps"
  />

  <!-- 自定义 valueType 的编辑态（ProConfigProvider 注册）：列级 fieldComponent 之后、内置控件之前 -->
  <VNodeHost
    v-else-if="customNode"
    :node="customNode"
    class="el-pro-field__custom"
  />

  <!-- 代码编辑器：Monaco 动态加载，可选依赖。fieldProps.options 拍平进 options，fieldProps 其余键（language/height）也一并生效 -->
  <ElProCodeEditor
    v-else-if="effectiveType === 'codeEditor'"
    :model-value="modelValue ?? ''"
    :height="mergedProps.height ?? 200"
    :language="mergedProps.language"
    :theme="mergedProps.theme"
    :read-only="mergedProps.disabled === true"
    :options="{ ...mergedProps, ...(mergedProps.options ?? {}) }"
    class="el-pro-field--full"
    @update:model-value="(v: string) => emit('update:modelValue', v)"
  />

  <!-- 富文本：Quill。只读展示按 HTML 渲染（内容来自编辑器本身，使用方对 HTML 来源负责） -->
  <template v-else-if="effectiveType === 'richText'">
    <div
      v-if="isReadonlyDisplay"
      class="el-pro-rich-text__readonly"
      style="min-height: 60px"
      v-html="modelValue"
    />
    <ElProRichText
      v-else
      :model-value="modelValue ?? ''"
      :height="mergedProps.height ?? 300"
      :placeholder="mergedProps.placeholder"
      :disabled="mergedProps.disabled === true"
      :toolbar="mergedProps.toolbar"
      :image-upload="mergedProps.imageUpload"
      class="el-pro-field--full"
      @update:model-value="(v: string) => emit('update:modelValue', v)"
    />
  </template>

  <!-- 数值 -->
  <ElInputNumber
    v-else-if="isNumeric"
    v-model="value"
    :placeholder="placeholder"
    :controls-position="mergedProps['controls-position'] ?? 'right'"
    class="el-pro-field--full"
    v-bind="mergedProps"
  />

  <!-- 时长：值是秒数，编辑时按秒填 -->
  <ElInputNumber
    v-else-if="effectiveType === 'second'"
    v-model="value"
    :min="0"
    :placeholder="placeholder"
    :controls-position="mergedProps['controls-position'] ?? 'right'"
    class="el-pro-field--full"
    v-bind="mergedProps"
  />

  <!-- 数字区间：两个输入框拼一行 -->
  <div v-else-if="effectiveType === 'digitRange'" class="el-pro-field--range">
    <ElInputNumber
      :model-value="rangeValue[0]"
      placeholder="最小值"
      :controls-position="mergedProps['controls-position'] ?? 'right'"
      class="el-pro-field--full"
      v-bind="mergedProps"
      @update:model-value="(v: any) => setRangePart(0, v)"
    />
    <span class="el-pro-field__range-sep">~</span>
    <ElInputNumber
      :model-value="rangeValue[1]"
      placeholder="最大值"
      :controls-position="mergedProps['controls-position'] ?? 'right'"
      class="el-pro-field--full"
      v-bind="mergedProps"
      @update:model-value="(v: any) => setRangePart(1, v)"
    />
  </div>

  <ElSlider
    v-else-if="effectiveType === 'slider'"
    v-model="value"
    class="el-pro-field--full"
    v-bind="mergedProps"
  />

  <ElRate v-else-if="effectiveType === 'rate'" v-model="value" v-bind="mergedProps" />

  <ElColorPicker
    v-else-if="effectiveType === 'color'"
    v-model="value"
    v-bind="mergedProps"
  />

  <!-- 选择 -->
  <ElSelect
    v-else-if="effectiveType === 'select' || effectiveType === 'tag' || effectiveType === 'status'"
    v-model="value"
    :placeholder="placeholder"
    clearable
    class="el-pro-field--full"
    v-bind="mergedProps"
  >
    <ElOption
      v-for="opt in options"
      :key="opt.value"
      :label="opt.label"
      :value="opt.value"
      :disabled="opt.disabled"
    />
  </ElSelect>

  <ElRadioGroup
    v-else-if="effectiveType === 'radio' || effectiveType === 'radioButton'"
    v-model="value"
    v-bind="mergedProps"
  >
    <template v-if="effectiveType === 'radioButton'">
      <ElRadioButton
        v-for="opt in options"
        :key="opt.value"
        :value="opt.value"
        :disabled="opt.disabled"
      >
        {{ opt.label }}
      </ElRadioButton>
    </template>
    <template v-else>
      <ElRadio
        v-for="opt in options"
        :key="opt.value"
        :value="opt.value"
        :disabled="opt.disabled"
      >
        {{ opt.label }}
      </ElRadio>
    </template>
  </ElRadioGroup>

  <ElCheckboxGroup
    v-else-if="effectiveType === 'checkbox'"
    v-model="value"
    v-bind="mergedProps"
  >
    <ElCheckbox
      v-for="opt in options"
      :key="opt.value"
      :value="opt.value"
      :disabled="opt.disabled"
    >
      {{ opt.label }}
    </ElCheckbox>
  </ElCheckboxGroup>

  <ElSwitch v-else-if="effectiveType === 'switch'" v-model="value" v-bind="mergedProps" />

  <ElSegmented
    v-else-if="effectiveType === 'segmented'"
    v-model="value"
    :options="options.map((o) => ({ label: o.label, value: o.value, disabled: o.disabled }))"
    v-bind="mergedProps"
  />

  <ElCascader
    v-else-if="effectiveType === 'cascader'"
    v-model="value"
    :placeholder="placeholder"
    clearable
    class="el-pro-field--full"
    v-bind="mergedProps"
  />

  <ElTreeSelect
    v-else-if="effectiveType === 'treeSelect'"
    v-model="value"
    :placeholder="placeholder"
    clearable
    class="el-pro-field--full"
    v-bind="mergedProps"
  />

  <!-- 日期时间 -->
  <ElTimePicker
    v-else-if="effectiveType === 'time' || effectiveType === 'timeRange'"
    v-model="value"
    :is-range="effectiveType === 'timeRange'"
    :placeholder="placeholder"
    value-format="HH:mm:ss"
    class="el-pro-field--full"
    v-bind="mergedProps"
  />

  <ElDatePicker
    v-else-if="isDateLike"
    v-model="value"
    :type="pickerType"
    :placeholder="placeholder"
    :value-format="dateValueFormat"
    :start-placeholder="'开始日期'"
    :end-placeholder="'结束日期'"
    class="el-pro-field--full el-pro-field--date"
    v-bind="mergedProps"
  />

  <!-- 兜底：文本 -->
  <ElInput
    v-else
    v-model="value"
    :type="inputType"
    :placeholder="placeholder"
    :show-password="effectiveType === 'password'"
    :autosize="effectiveType === 'textarea' || effectiveType === 'code' || effectiveType === 'jsonCode' ? { minRows: 2, maxRows: 6 } : undefined"
    :class="effectiveType === 'code' || effectiveType === 'jsonCode' ? 'el-pro-field--code' : undefined"
    clearable
    class="el-pro-field--full"
    v-bind="mergedProps"
  />
</template>

<style>
.el-pro-field--full {
  width: 100%;
}
/*
 * 数字/区间：两个输入框并排一行。
 *
 * 原来这里什么样式都没有，而两个 ElInputNumber 都带着 `.el-pro-field--full`
 * （width: 100%），在块级容器里就是一列三个 block —— 最小值、~、最大值
 * 各占一行，表单项被撑到 99px 高，挨着它的项全被挤到下一排去。
 * 所以必须显式 flex，并把子项的 width: 100% 换成「按剩余空间分」。
 */
.el-pro-field--range {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-width: 0;
}
.el-pro-field--range > .el-pro-field--full {
  flex: 1 1 0;
  /* 选择性比 .el-input-number 的固定 150px 高，才盖得住 */
  width: auto;
  min-width: 0;
}
.el-pro-field__range-sep {
  flex: none;
  color: var(--el-text-color-placeholder);
  line-height: 1;
}
.el-pro-field--date {
  min-width: 180px;
}
.el-pro-field--code textarea {
  font-family: var(--el-font-family-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 12px;
  line-height: 1.6;
}
</style>
