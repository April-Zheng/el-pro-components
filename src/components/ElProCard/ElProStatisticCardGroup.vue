<script setup lang="ts">
/**
 * ElProStatisticCardGroup —— 一组指标卡拼成一条，卡与卡之间画分割线。
 *
 * 为什么不直接用 `ElProCard` + `split`：那要求每个子卡自己写 `colSpan`，
 * 而这里最常见的写法是「三张卡等分」，让 Group 记住方向、子卡只写内容更省事。
 *
 * 实现上没有任何新东西：就是一个 body 去 padding 的卡片 + 方向/分割线透传。
 * 子卡仍是 StatisticCard，会自己向父卡注册，所以分割线位置不用手算。
 */
import { computed } from 'vue'
import ElProCard from './ElProCard.vue'

defineOptions({ name: 'ElProStatisticCardGroup', inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** 子卡排列方向 @default 'horizontal' */
    direction?: 'horizontal' | 'vertical'
    /** 子卡间距。数字或 [水平, 垂直] */
    gutter?: number | [number, number]
  }>(),
  { direction: 'horizontal' },
)

const isRow = computed(() => props.direction === 'horizontal')
</script>

<template>
  <ElProCard
    class="el-pro-statistic-card-group"
    :body-style="{ padding: 0 }"
    :direction="isRow ? 'row' : 'column'"
    :split="isRow ? 'vertical' : 'horizontal'"
    :gutter="gutter"
    v-bind="$attrs"
  >
    <slot />
  </ElProCard>
</template>
