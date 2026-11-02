<script setup lang="ts">
/**
 * ElProDescriptions —— 详情定义列表。
 *
 * 和 ElProTable 共用同一份 columns 定义，所以「表格里显示成 tag 的字段，
 * 详情页里也是同一个 tag」这件事是自动成立的，不用维护两套字典。
 */
import { computed, useSlots } from 'vue'
import { ElDescriptions, ElDescriptionsItem } from 'element-plus'
import CellRenderer from '../../fields/CellRenderer.vue'
import type { ProColumn } from '../../types'

defineOptions({ name: 'ElProDescriptions' })

const props = withDefaults(
  defineProps<{
    columns: ProColumn[]
    data?: Record<string, any>
    column?: number
    border?: boolean
    size?: 'large' | 'default' | 'small'
    direction?: 'horizontal' | 'vertical'
    labelWidth?: string | number
    title?: string
    emptyText?: string | false
  }>(),
  {
    column: 3,
    border: true,
    size: 'default',
    direction: 'horizontal',
    // 'string | false' 同样会被 Boolean cast，必须给 default
    emptyText: '-',
  },
)

const slots = useSlots()

const visibleColumns = computed(() =>
  props.columns.filter((c) => !c.hideInDescriptions && c.prop),
)

function hasSlot(col: ProColumn) {
  return !!col.prop && !!slots[col.prop]
}
</script>

<template>
  <ElDescriptions
    :column="column"
    :border="border"
    :size="size"
    :direction="direction"
    :title="title"
    :label-width="labelWidth"
    class="el-pro-descriptions"
  >
    <template v-if="$slots.extra" #extra>
      <slot name="extra" />
    </template>

    <ElDescriptionsItem
      v-for="(col, idx) in visibleColumns"
      :key="`${col.prop}-${idx}`"
      :label="col.label"
      :span="col.descriptionsSpan ?? 1"
    >
      <slot
        v-if="hasSlot(col)"
        :name="col.prop!"
        :row="data"
        :column="col"
        :value="data?.[col.prop!]"
      />
      <component
        :is="col.cellComponent"
        v-else-if="col.cellComponent"
        :row="data"
        :column="col"
        :value="data?.[col.prop!]"
      />
      <CellRenderer
        v-else
        :value="data?.[col.prop!]"
        :column="col"
        :row="data"
        :empty-text="emptyText"
      />
    </ElDescriptionsItem>
  </ElDescriptions>
</template>

<style>
.el-pro-descriptions .el-descriptions__label {
  white-space: nowrap;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-lighter);
}
</style>
