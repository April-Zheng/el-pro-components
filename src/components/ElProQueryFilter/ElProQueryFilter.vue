<script setup lang="ts">
/**
 * ElProQueryFilter —— 独立成块的查询筛选区。
 *
 * 和 ElProTable 里的搜索栏长得像，定位不同：
 * - 内置搜索栏是表格的一部分，值在表格内部
 * - 这个是页面级的，`model` 在页面手里，同一份条件可以喂给多个表格
 *
 * 行为对齐 ProComponents 的 QueryFilter：
 * - 默认折叠，只露「一行能放下的项数 - 1」（留一格给按钮）
 * - 操作列用 `offset` 贴到最后一行的右边，不是用 flex 推（推过去换行就不听话）
 * - 折叠掉的项**不渲染**，所以它们的校验规则也不参与（查询区一般也没规则）
 */
import { computed, reactive, ref } from 'vue'
import { ElButton, ElCol, ElForm, ElFormItem, ElRow } from 'element-plus'
import type { FormInstance } from 'element-plus'
import { resolveSearchColumn } from '../../core/column'
import { computeQueryFilterLayout, resolveShowLength } from '../../core/queryFilter'
import { resolveResponsive, useBreakpoint } from '../../core/responsive'
import FormField from '../../fields/FormField.vue'
import type { ProQueryFilterProps } from '../../types'

defineOptions({ name: 'ElProQueryFilter' })

const props = withDefaults(defineProps<ProQueryFilterProps>(), {
  // 布尔 prop 不传时 Vue 会把「缺席」转成 false，这里显式 undefined 才能区分
  // 「受控传了 false」和「没传」，见 README 的踩坑记录
  collapsed: undefined,
  span: () => ({ xs: 24, sm: 12, md: 8, lg: 6 }),
  defaultCollapsed: true,
  collapsible: true,
  searchText: '查询',
  resetText: '重置',
  labelWidth: 'auto',
  labelPosition: 'right',
  gutter: 16,
  split: false,
  showHiddenNum: true,
})

const emit = defineEmits<{
  search: [Record<string, any>]
  reset: [Record<string, any>]
  'update:collapsed': [boolean]
  collapseChange: [boolean]
}>()

const formRef = ref<FormInstance>()
const breakpoint = useBreakpoint()

/* ------------------------------ 数据归属 ------------------------------- */

/** 内部草稿。只在没传 `model` 时使用 */
const draft = reactive<Record<string, any>>({})

const formModel = computed<Record<string, any>>(() => props.model ?? draft)

/**
 * 「重置」要回到的那份值。
 * 有 `initialValues` 就用它，否则取挂载时 model 的快照——
 * 于是「不传 initialValues」自然等于「重置成空」。
 */
const baseline: Record<string, any> = { ...(props.initialValues ?? props.model ?? {}) }

if (!props.model) Object.assign(draft, baseline)

function snapshot(values: Record<string, any>) {
  return { ...values }
}

function reset() {
  const target = formModel.value
  // 先删再合：initialValues 里没有的字段必须真的消失，
  // 否则「重置」只是把旧值改回去，多出来的条件还挂在那儿
  for (const key of Object.keys(target)) delete target[key]
  Object.assign(target, snapshot(baseline))
  formRef.value?.clearValidate()
  emit('reset', snapshot(target))
}

function search() {
  emit('search', snapshot(formModel.value))
}

/* ------------------------------ 折叠状态 ------------------------------- */

const innerCollapsed = ref(props.defaultCollapsed)
const isCollapsed = computed(() => props.collapsed ?? innerCollapsed.value)

function setCollapsed(value: boolean) {
  innerCollapsed.value = value
  emit('update:collapsed', value)
  emit('collapseChange', value)
}

function toggleCollapse() {
  setCollapsed(!isCollapsed.value)
}

/* ------------------------------ 栅格布局 ------------------------------- */

/** 每项占几格，支持 `{ xs: 24, lg: 6 }` 这种按断点取值 */
const span = computed(() => resolveResponsive(props.span, breakpoint.value, 24))

const searchColumns = computed(() =>
  props.columns.filter((column) => !column.hideInSearch).map(resolveSearchColumn),
)

const showLength = computed(() =>
  resolveShowLength(span.value, props.defaultFormItemsNumber, props.defaultColsNumber),
)

const layout = computed(() =>
  computeQueryFilterLayout({
    count: searchColumns.value.length,
    span: span.value,
    collapsed: isCollapsed.value,
    showLength: showLength.value,
  }),
)

/** 要渲染的列，顺带带上「落在第几行」，`split` 靠它判断哪些是行首 */
const renderedColumns = computed(() =>
  searchColumns.value
    .map((column, index) => ({ column, index }))
    .filter(({ index }) => layout.value.visible[index])
    .map(({ column, index }) => ({ column, row: layout.value.rowOf[index] })),
)

const showCollapseButton = computed(() => props.collapsible && layout.value.needCollapse)
const splitLine = computed(() => props.split && props.labelPosition === 'top')

defineExpose({
  search,
  reset,
  getValues: () => formModel.value,
  validate: () => formRef.value?.validate(),
  collapse: () => setCollapsed(true),
  expand: () => setCollapsed(false),
  toggleCollapse,
  formRef,
})
</script>

<template>
  <ElForm
    ref="formRef"
    class="el-pro-query-filter"
    :model="formModel"
    :label-width="labelWidth"
    :label-position="labelPosition"
    @submit.prevent="search"
  >
    <ElRow :gutter="gutter">
      <ElCol
        v-for="{ column, row } in renderedColumns"
        :key="column.prop"
        :span="span"
        :class="{ 'el-pro-query-filter__cell--split': splitLine && row > 0 }"
      >
        <ElFormItem :label="column.label" class="el-pro-query-filter__item">
          <FormField v-model="formModel[column.prop!]" :column="column" mode="search" />
        </ElFormItem>
      </ElCol>

      <ElCol :span="span" :offset="layout.actionsOffset" class="el-pro-query-filter__actions">
        <ElButton type="primary" :loading="loading" @click="search">{{ searchText }}</ElButton>
        <ElButton @click="reset">{{ resetText }}</ElButton>
        <ElButton
          v-if="showCollapseButton"
          link
          type="primary"
          class="el-pro-query-filter__collapse"
          @click="toggleCollapse"
        >
          {{ isCollapsed ? '展开' : '收起' }}
          <span v-if="isCollapsed && showHiddenNum && layout.hiddenCount" class="el-pro-query-filter__hidden">
            ({{ layout.hiddenCount }})
          </span>
          <svg
            viewBox="0 0 12 12"
            width="10"
            height="10"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            :style="{ transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform .2s' }"
          >
            <path d="M2.5 4.5L6 8l3.5-3.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </ElButton>
      </ElCol>
    </ElRow>
  </ElForm>
</template>

<style>
.el-pro-query-filter__item {
  margin-bottom: 16px;
}
.el-pro-query-filter__item .el-form-item__label {
  white-space: nowrap;
}
.el-pro-query-filter__actions {
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  margin-bottom: 16px;
}
.el-pro-query-filter__actions .el-button + .el-button {
  margin-left: 8px;
}
.el-pro-query-filter__collapse {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.el-pro-query-filter__hidden {
  margin-left: 2px;
}
.el-pro-query-filter__cell--split {
  border-top: 1px solid var(--el-border-color-lighter);
  padding-top: 12px;
}
</style>
