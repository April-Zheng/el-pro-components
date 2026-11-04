<script setup lang="ts">
/**
 * ProFormGroup —— 表单分组容器，对齐源码 form/components/FormItem/Group。
 *
 * 关键语义（都按源码）：
 * - 标题栏只有 title / tooltip / extra 任一存在时才渲染；点击标题切换折叠
 *   （collapsed 状态总是切换，但 body 只在 `collapsible && collapsed` 时才隐藏，
 *   所以没开 collapsible 时点了也不会收 —— 源码就是这么写的，别"修"它）
 * - collapsed 非受控默认取 `defaultCollapsed || false`；传了 `collapsed` 则受控
 * - 子字段容器是 Space 语义：flex/grid + 间距 size（默认 32），**rowGap 为 0**
 *   （源码在 style 里显式置 0；行距交给 el-form-item 自带的 margin-bottom）
 * - 子字段来自 schema 的 `columns`（源码 valueType/group 的 genItems(item.columns)）
 */
import { computed, ref, watch } from 'vue'
import type { CSSProperties } from 'vue'
import { ElDivider, ElFormItem, ElTooltip } from 'element-plus'
import { resolveFormColumns } from '../../core/formDependency'
import FormField from '../../fields/FormField.vue'
import ProFormList from './ProFormList.vue'
import type { ProColumn } from '../../types'

defineOptions({ name: 'ElProFormGroup' })

const props = withDefaults(
  defineProps<{
    /** 分组标题。没写 `title` 时用 `label`（对齐源码 title = props.label） */
    label?: string
    title?: string
    tooltip?: string
    collapsible?: boolean
    defaultCollapsed?: boolean
    /** 受控折叠状态。不传则内部自管 */
    collapsed?: boolean
    direction?: 'horizontal' | 'vertical'
    size?: number
    align?: 'start' | 'end' | 'center' | 'baseline'
    /** 分组子字段（schema 模式） */
    columns: ProColumn[]
    model: Record<string, any>
    /** 子字段默认占几格（24 栅格） @default 12 */
    span?: number
  }>(),
  {
    collapsible: false,
    defaultCollapsed: false,
    collapsed: undefined,
    direction: 'horizontal',
    size: 32,
    align: 'start',
    span: 12,
  },
)

const emit = defineEmits<{
  collapse: [boolean]
  'update:collapsed': [boolean]
}>()

const displayTitle = computed(() => props.title ?? props.label)

/* ------------------------------ 折叠状态 ------------------------------- */

/**
 * 内部状态自己翻转，props.collapsed 变化时同步进来。
 * 不能写成 `props.collapsed ?? inner` 的纯受控遮蔽——schema 模式里 fieldProps 传的是
 * 静态 `collapsed: true`，那样点击永远翻不动。
 * 注意：与 React 的 useControlledState 不同（那边是纯受控遮蔽），这里是有意偏离：
 * 传了 collapsed 但父组件不监听 update:collapsed 时，点击仍会视觉翻转。
 */
const isCollapsed = ref(props.collapsed ?? props.defaultCollapsed ?? false)

watch(
  () => props.collapsed,
  (v) => {
    if (v !== undefined) isCollapsed.value = v
  },
)

function toggle() {
  const next = !isCollapsed.value
  isCollapsed.value = next
  emit('update:collapsed', next)
  emit('collapse', next)
}

/* ------------------------------ 子字段渲染 ----------------------------- */

/** 子列也走联动过滤，和顶层表单同一套规则 */
const childColumns = computed(() => resolveFormColumns(props.columns, props.model))

/** 24 栅格 → 每项占几格。divider 独占一行 */
const itemSpan = (col: ProColumn, fallback: number) => col.formSpan ?? fallback

/* align 的值直接来自 antd Space，flex 需要映射 */
const ALIGN_MAP: Record<string, CSSProperties['alignItems']> = {
  start: 'flex-start',
  end: 'flex-end',
  center: 'center',
  baseline: 'baseline',
}

const containerStyle = computed<CSSProperties>(() => {
  if (props.direction === 'vertical') {
    return {
      display: 'flex',
      flexDirection: 'column',
      alignItems: ALIGN_MAP[props.align] ?? 'flex-start',
      rowGap: '0px',
    }
  }
  return {
    display: 'grid',
    gridTemplateColumns: 'repeat(24, minmax(0, 1fr))',
    alignItems: ALIGN_MAP[props.align] ?? 'flex-start',
    rowGap: '0px',
    columnGap: `${props.size}px`,
  }
})

const itemStyle = (span: number) => {
  if (props.direction === 'vertical') return { width: '100%' }
  return { gridColumn: `span ${Math.min(Math.max(span, 1), 24)}` }
}
</script>

<template>
  <div class="el-pro-form-group" :class="{ 'is-collapsible': collapsible }">
    <!-- 标题栏：有 title/tooltip/extra 才渲染（源码同款判断） -->
    <div
      v-if="displayTitle || tooltip || $slots.extra"
      class="el-pro-form-group__title"
      role="button"
      tabindex="0"
      @click="toggle"
      @keydown.enter.prevent="toggle"
      @keydown.space.prevent="toggle"
    >
      <svg
        v-if="collapsible"
        class="el-pro-form-group__arrow"
        viewBox="0 0 16 16"
        width="12"
        height="12"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        :style="{ transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)', transition: 'transform .2s' }"
      >
        <path d="M6 3.5L10.5 8L6 12.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span class="el-pro-form-group__text">
        {{ displayTitle }}
        <ElTooltip v-if="tooltip" :content="tooltip" placement="top">
          <span class="el-pro-form-group__tooltip">?</span>
        </ElTooltip>
      </span>
      <span v-if="$slots.extra" class="el-pro-form-group__extra" @click.stop>
        <slot name="extra" />
      </span>
    </div>

    <!-- body：只在 collapsible && collapsed 时隐藏（源码 display: collapsible && collapsed ? 'none'） -->
    <div v-show="!(collapsible && isCollapsed)" class="el-pro-form-group__container" :style="containerStyle">
      <template v-for="col in childColumns" :key="col.prop ?? col.label">
        <div v-if="col.valueType === 'divider'" class="el-pro-form-group__item" :style="itemStyle(24)">
          <ElDivider content-position="left" class="el-pro-form__divider">{{ col.label }}</ElDivider>
        </div>

        <div v-else-if="col.valueType === 'formList'" class="el-pro-form-group__item" :style="itemStyle(itemSpan(col, 24))">
          <ElFormItem :label="col.label" :prop="col.prop" :rules="col.rules" v-bind="col.formItemProps">
            <ProFormList
              :model="model"
              :prop="col.prop!"
              :columns="col.children ?? []"
              :config="col.formListProps"
              :span="col.formListProps?.span"
            />
          </ElFormItem>
        </div>

        <!-- 嵌套分组：递归自身。配置取 groupProps + fieldProps（fieldProps 后展开，同源码覆盖顺序） -->
        <div v-else-if="col.valueType === 'group'" class="el-pro-form-group__item" :style="itemStyle(itemSpan(col, 24))">
          <ElProFormGroup
            :label="col.label"
            :columns="col.columns ?? []"
            :model="model"
            :span="span"
            v-bind="{ ...col.groupProps, ...col.fieldProps }"
          />
        </div>

        <div v-else class="el-pro-form-group__item" :style="itemStyle(itemSpan(col, span))">
          <ElFormItem :label="col.label" :prop="col.prop" :rules="col.rules" v-bind="col.formItemProps">
            <FormField v-model="model[col.prop!]" :column="col" mode="form" />
          </ElFormItem>
        </div>
      </template>
    </div>
  </div>
</template>

<style>
.el-pro-form-group__title {
  display: flex;
  align-items: center;
  margin-bottom: 18px;
  color: var(--el-text-color-primary);
  font-weight: 600;
  font-size: 14px;
  line-height: 22px;
  cursor: default;
  user-select: none;
}
.el-pro-form-group.is-collapsible .el-pro-form-group__title {
  cursor: pointer;
}
.el-pro-form-group__arrow {
  margin-right: 8px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}
.el-pro-form-group__text {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.el-pro-form-group__tooltip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid var(--el-border-color);
  color: var(--el-text-color-secondary);
  font-size: 11px;
  font-weight: 400;
  cursor: help;
}
.el-pro-form-group__extra {
  margin-left: auto;
  font-weight: 400;
}
.el-pro-form-group__item {
  min-width: 0;
}
</style>
