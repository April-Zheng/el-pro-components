<script setup lang="ts">
/**
 * ElProEditableTable —— 行内编辑表格。
 *
 * 本质是 ElProTable 把 `editable` 预置好的薄壳。存在的理由只有两个：
 * 1. 对齐 ProComponents 的组件命名，迁移时少改一处 import
 * 2. `editable` 的默认值收在这里，业务页面不用每张表都重复写
 *
 * props / slots / 事件全部原样透传，真正的实现在 ElProTable 里。
 */
import { computed, useAttrs, useSlots } from 'vue'
import type { Slots } from 'vue'
import ElProTable from './ElProTable.vue'
import type { ProColumn, ProEditableConfig } from '../../types'

defineOptions({ name: 'ElProEditableTable', inheritAttrs: false })

const props = defineProps<{
  /**
   * 列定义。必须在这里显式声明：ElProTable 把它标成必填，
   * 只靠 `$attrs` 透传的话 vue-tsc 看不到这个 prop，会报「缺少 columns」。
   */
  columns: ProColumn[]
  /** 覆盖默认的编辑配置；不传就是最朴素的「单行编辑 + 增删」 */
  editable?: boolean | ProEditableConfig
}>()

const attrs = useAttrs()

const merged = computed<ProEditableConfig>(() => {
  const e = props.editable
  if (!e) return {}
  return e === true ? {} : e
})

/**
 * 默认关掉搜索栏。行内编辑的表格通常只有几行待维护数据，
 * 上面再挂一条搜索栏反而把「表格」挤到折叠线以下。
 * 想开就在使用处传 `search`，这里用展开顺序让外部覆盖生效。
 */
const defaults = computed(() => ({ search: false, ...attrs }))

/**
 * 插槽名单独算出来，不在模板里直接遍历 `$slots`。
 * 直接 `v-for="(_, name) in $slots"` 时，声明文件生成阶段推不出 name 的类型
 * （TS7022），而这里给个 string[] 就干净了。
 */
const slots: Slots = useSlots()
const slotNames = computed<string[]>(() => Object.keys(slots))
</script>

<template>
  <ElProTable v-bind="defaults" :columns="columns" :editable="merged">
    <template v-for="name in slotNames" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps ?? {}" />
    </template>
  </ElProTable>
</template>
