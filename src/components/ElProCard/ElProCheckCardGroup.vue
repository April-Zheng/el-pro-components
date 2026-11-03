<script setup lang="ts">
/**
 * ElProCheckCardGroup —— CheckCard 的组容器。
 *
 * 为什么不直接用 el-radio-group / el-checkbox-group 包一层：
 * 这两个组要求子项是自己的 radio/checkbox，靠 name + label 建立关联；
 * CheckCard 是「整块 div 可点」，塞进去会和内部的 label 抢事件。
 * 这里改成 provide/inject：组只管值和选中判断，卡片只管上报被点了。
 *
 * `options` 可以直接把数据铺成卡片，省掉一个手动 v-for。
 */
import { computed, provide } from 'vue'
import ElProCheckCard from './ElProCheckCard.vue'
import { PRO_CHECK_CARD_CONTEXT } from '../../core/cardContext'
import type { ProCheckCardOption } from '../../types'

defineOptions({ name: 'ElProCheckCardGroup' })

const props = withDefaults(
  defineProps<{
    /** 单选传值，多选传数组 */
    modelValue?: any
    multiple?: boolean
    disabled?: boolean
    options?: ProCheckCardOption[]
    /** 每行几个。传 0 用 auto-fit 自适应 */
    column?: number
    /** 卡片间距 */
    gutter?: number
  }>(),
  {
    multiple: false,
    disabled: false,
    column: 3,
    gutter: 16,
  },
)

const emit = defineEmits<{
  'update:modelValue': [any]
  change: [any]
}>()

const selectedList = computed<any[]>(() => {
  const v = props.modelValue
  if (Array.isArray(v)) return v
  return v === undefined || v === null || v === '' ? [] : [v]
})

function isChecked(value: any) {
  return selectedList.value.some((v) => v === value)
}

function toggle(value: any) {
  let next: any
  if (props.multiple) {
    const list = selectedList.value.slice()
    const idx = list.indexOf(value)
    if (idx >= 0) list.splice(idx, 1)
    else list.push(value)
    next = list
  } else {
    // 单选模式下重复点击不取消：和 el-radio 一致，避免出现「一个都没选」的空态
    next = value
  }
  emit('update:modelValue', next)
  emit('change', next)
}

provide(PRO_CHECK_CARD_CONTEXT, {
  multiple: computed(() => props.multiple),
  disabled: computed(() => props.disabled),
  isChecked,
  toggle,
})

const gridStyle = computed(() => ({
  gridTemplateColumns: props.column > 0 ? `repeat(${props.column}, minmax(0, 1fr))` : 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: `${props.gutter}px`,
}))
</script>

<template>
  <div class="el-pro-check-card-group" :style="gridStyle">
    <slot>
      <ElProCheckCard
        v-for="opt in options"
        :key="opt.value"
        :value="opt.value"
        :title="opt.title"
        :sub-title="opt.subTitle"
        :description="opt.description"
        :avatar="opt.avatar"
        :cover="opt.cover"
        :extra="opt.extra"
        :disabled="opt.disabled"
      />
    </slot>
  </div>
</template>

<style>
.el-pro-check-card-group {
  display: grid;
  align-items: stretch;
}
</style>
