<script setup lang="ts">
/**
 * ElProStatisticCard —— 指标卡：卡片外壳 + 数值 + 可选图表 + 底部区域。
 *
 * 它本身不画数值，只负责「数值和图表怎么摆」。数值部分永远是 `ElProStatistic`，
 * 所以字号、趋势配色、千分位这些细节只有一处实现。
 *
 * 卡片侧的属性（title / tooltip / extra / bordered / loading / colSpan / gutter ...）
 * 全部经 `$attrs` 透传给 `ElProCard` —— 两边都声明一遍会立刻失去同步，
 * 而且 `title` 这种同名 prop 透传过去正好落在 ElProCard 的 `title` 上，不需要中间翻译。
 */
import type { VNode } from 'vue'
import ElProCard from './ElProCard.vue'
import ElProStatistic from './ElProStatistic.vue'
import type { ProStatisticProps } from '../../types'

defineOptions({ name: 'ElProStatisticCard', inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** 数值配置，等价于在 body 里放一个 ElProStatistic */
    statistic?: ProStatisticProps
    /** 图表区：通常是一个 echarts 容器，或 el-progress 画的环形 */
    chart?: VNode | string | number
    /** chart 相对 statistic 的位置。`left` / `right` 会变成左右排布 @default 'bottom' */
    chartPlacement?: 'left' | 'right' | 'bottom'
    /** 底部额外区域，通常放一条操作链接或说明 */
    footer?: VNode | string | number
  }>(),
  { chartPlacement: 'bottom' },
)

const asRenderable = (node: any) => (typeof node === 'function' ? node : () => node)
</script>

<template>
  <ElProCard v-bind="$attrs" class="el-pro-statistic-card">
    <div
      v-if="chart || $slots.chart || statistic"
      class="el-pro-statistic-card__content"
      :class="{
        'is-row': (chart || $slots.chart) && statistic && chartPlacement !== 'bottom',
      }"
    >
      <template v-if="chartPlacement === 'left'">
        <div v-if="chart || $slots.chart" class="el-pro-statistic-card__chart">
          <slot name="chart"><component :is="asRenderable(chart)" /></slot>
        </div>
        <ElProStatistic v-if="statistic" layout="vertical" v-bind="statistic" />
      </template>

      <template v-else>
        <ElProStatistic v-if="statistic" layout="vertical" v-bind="statistic" />
        <div v-if="chart || $slots.chart" class="el-pro-statistic-card__chart">
          <slot name="chart"><component :is="asRenderable(chart)" /></slot>
        </div>
      </template>
    </div>

    <slot />

    <div v-if="footer !== undefined || $slots.footer" class="el-pro-statistic-card__footer">
      <slot name="footer">
        <component :is="asRenderable(footer)" />
      </slot>
    </div>

    <!-- 右侧操作区（对齐 React StatisticCard.Operation）：竖排一列动作，常配 Divider -->
    <div v-if="$slots.actions" class="el-pro-statistic-card__actions">
      <slot name="actions" />
    </div>
  </ElProCard>
</template>

<style>
.el-pro-statistic-card .el-pro-card__body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.el-pro-statistic-card__content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}
.el-pro-statistic-card__content.is-row {
  flex-direction: row;
  align-items: center;
  gap: 16px;
}
.el-pro-statistic-card__chart {
  min-width: 0;
}
.el-pro-statistic-card__content.is-row > .el-pro-statistic-card__chart {
  flex: 1;
}
.el-pro-statistic-card__content.is-row > .el-pro-statistic {
  flex: none;
  width: auto;
}
.el-pro-statistic-card__footer {
  padding-top: 12px;
  border-top: 1px solid var(--el-pro-card-border, var(--el-border-color-lighter, #ebeef5));
  font-size: 13px;
  color: var(--el-text-color-secondary, #909399);
}
.el-pro-statistic-card__actions {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding-left: 12px;
  border-left: 1px solid var(--el-pro-card-border, var(--el-border-color-lighter, #ebeef5));
}
/* 卡片 body 已是 flex column，操作区放右侧需要整体转横排 */
.el-pro-statistic-card:has(.el-pro-statistic-card__actions) > .el-pro-card__body {
  flex-direction: row;
  align-items: center;
}
.el-pro-statistic-card:has(.el-pro-statistic-card__actions) > .el-pro-card__body > :first-child {
  flex: 1;
  min-width: 0;
}
</style>
