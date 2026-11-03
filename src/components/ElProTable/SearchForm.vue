<script setup lang="ts">
/**
 * 搜索栏。
 *
 * 复用的是 FormField（控件渲染器），不是 ElProForm 这套表单壳 —— 搜索栏的布局
 * 是「栅格 + 折叠 + 右侧按钮」，和普通表单的纵向结构差别太大，硬套只会互相别扭。
 * 真正该共用的是 valueType → 控件那一层，这里正好只用那一层。
 */
import { computed, ref } from 'vue'
import { ElButton, ElCol, ElForm, ElFormItem, ElRow } from 'element-plus'
import { resolveSearchColumn } from '../../core/column'
import FormField from '../../fields/FormField.vue'
import type { ProColumn } from '../../types'

const props = withDefaults(
  defineProps<{
    columns: ProColumn[]
    values: Record<string, any>
    loading?: boolean
    collapsible?: boolean
    defaultCollapsed?: boolean
    /** 单个搜索项默认占几格（24 栅格） */
    defaultSpan?: number
    searchText?: string
    resetText?: string
  }>(),
  {
    collapsible: true,
    defaultCollapsed: true,
    defaultSpan: 6,
    searchText: '查询',
    resetText: '重置',
  },
)

const emit = defineEmits<{ search: []; reset: [] }>()

const collapsed = ref(props.defaultCollapsed)

const getSpan = (col: ProColumn) => {
  if (typeof col.search === 'object' && col.search.span) return col.search.span
  return props.defaultSpan
}

/** 收起状态下最多能放几个：给按钮留出 6 格 */
const visibleCount = computed(() => {
  let used = 0
  let count = 0
  for (const col of props.columns) {
    const span = getSpan(col)
    if (used + span > 18) break
    used += span
    count += 1
  }
  return Math.max(1, count)
})

const showCollapseButton = computed(
  () => props.collapsible && props.columns.length > visibleCount.value,
)

const renderColumns = computed(() =>
  collapsed.value ? props.columns.slice(0, visibleCount.value) : props.columns,
)

const hiddenCount = computed(() =>
  collapsed.value ? props.columns.length - visibleCount.value : 0,
)

/** 搜索时可能要用另一种 valueType（如表格显示 dateTime、搜索用 dateRange） */
function searchColumn(col: ProColumn): ProColumn {
  return resolveSearchColumn(col)
}
</script>

<template>
  <ElForm
    class="el-pro-search"
    :model="values"
    label-position="right"
    :label-width="'auto'"
    @submit.prevent="emit('search')"
  >
    <ElRow :gutter="16">
      <ElCol v-for="col in renderColumns" :key="col.prop" :span="getSpan(col)">
        <ElFormItem :label="col.label" class="el-pro-search__item">
          <FormField v-model="values[col.prop!]" :column="searchColumn(col)" mode="search" />
        </ElFormItem>
      </ElCol>

      <ElCol :span="6" class="el-pro-search__actions">
        <ElButton type="primary" :loading="loading" @click="emit('search')">
          {{ searchText }}
        </ElButton>
        <ElButton @click="emit('reset')">{{ resetText }}</ElButton>
        <ElButton
          v-if="showCollapseButton"
          type="primary"
          link
          class="el-pro-search__collapse"
          @click="collapsed = !collapsed"
        >
          {{ collapsed ? `展开${hiddenCount ? ` (${hiddenCount})` : ''}` : '收起' }}
          <svg
            viewBox="0 0 12 12"
            width="10"
            height="10"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            :style="{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform .2s' }"
          >
            <path d="M2.5 4.5L6 8l3.5-3.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </ElButton>
      </ElCol>
    </ElRow>
  </ElForm>
</template>

<style>
.el-pro-search {
  padding: 16px 16px 0;
  margin-bottom: 16px;
  background: var(--el-bg-color);
  border-radius: var(--el-border-radius-base);
  border: 1px solid var(--el-border-color-lighter);
}
.el-pro-search__item {
  margin-bottom: 16px;
}
.el-pro-search__item .el-form-item__label {
  white-space: nowrap;
}
.el-pro-search__actions {
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  margin-bottom: 16px;
}
.el-pro-search__actions .el-button + .el-button {
  margin-left: 8px;
}
.el-pro-search__collapse {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
</style>
