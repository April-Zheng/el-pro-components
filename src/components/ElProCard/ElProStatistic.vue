<script setup lang="ts">
/**
 * ElProStatistic —— 一个数值 + 标题 + 描述 + 趋势。
 *
 * 为什么不用 `el-statistic`：
 * 1. 它没有 `trend`（趋势箭头）、`status`（状态点）、`icon`（左侧图标）这三个
 *    Pro 场景最常用的东西，也没有 `layout` 的三种排布。
 * 2. 它的 `formatter` 在渲染前就跑完了，拿不到「整数部分/小数部分」的拆分，
 *    想做「小数位小一号」这种细节就得整个重写。
 *
 * 排布三态（和源码一致，只看一行数值该往哪摆）：
 * - `vertical`：标题上、数值下，数值 24px —— 指标卡默认
 * - `horizontal`：标题左、数值右，两者同 14px —— 列表里的一行
 * - `inline`：标题 + 数值挤一行，13px 次级色 —— 密集排布
 *
 * 趋势配色是**红涨绿跌**（中国金融语义，源码注释里也是这么写的）。
 * 想反过来，覆盖 `--el-pro-statistic-trend-up-color` / `-down-color` 即可。
 */
import { computed } from 'vue'
import { ElTooltip } from 'element-plus'
import type { ProStatisticLayout, ProStatisticStatus, ProStatisticTrend } from '../../types'

defineOptions({ name: 'ElProStatistic' })

const props = withDefaults(
  defineProps<{
    value?: number | string
    title?: string | number
    /** 标题后的问号提示 */
    tip?: string
    /** 数值下方的描述文字 */
    description?: string | number
    /** 小数位数。不传则保留原值的位数 */
    precision?: number
    /** 完全自定义格式化，给了它就忽略 precision 与分组 */
    formatter?: (value: number | string) => string
    prefix?: string | number
    suffix?: string | number
    /** 左侧图标，传组件或已注册的组件名 */
    icon?: any
    status?: ProStatisticStatus
    trend?: ProStatisticTrend
    layout?: ProStatisticLayout
    groupSeparator?: string
    decimalSeparator?: string
    loading?: boolean
  }>(),
  {
    layout: 'vertical',
    groupSeparator: ',',
    decimalSeparator: '.',
    loading: false,
  },
)

/**
 * 数值格式化：先按 precision 定型，再给整数部分插千分位。
 *
 * 为什么自己算而不用 `toLocaleString`：它把「小数位」和「分组符」绑在 locale 上，
 * 想要「英文分组 + 中文小数点」这种组合就做不到，而财务场景确实会这么要求。
 */
const displayValue = computed<string>(() => {
  const raw = props.value
  if (props.formatter) return String(props.formatter(raw as number | string))
  if (raw === undefined || raw === null || raw === '') return '-'
  // 字符串原样输出：后端已经格式化过的（如 '12,345.67'）不该被二次加工
  if (typeof raw !== 'number' || Number.isNaN(raw)) return String(raw)

  const text =
    props.precision === undefined || props.precision === null
      ? String(raw)
      : raw.toFixed(props.precision)

  const negative = text.startsWith('-')
  const body = negative ? text.slice(1) : text
  const [intPart, decPart] = body.split('.')

  // 1e+21 这类科学计数法没法按位分组，直接放弃
  if (!/^\d+$/.test(intPart)) return text

  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, props.groupSeparator)
  return (
    (negative ? '-' : '') + grouped + (decPart === undefined ? '' : props.decimalSeparator + decPart)
  )
})

const hasTitle = computed(() => props.title !== undefined || !!props.tip)

const rootClass = computed(() => [
  `is-layout-${props.layout}`,
  {
    'is-loading': props.loading,
    [`is-status-${props.status}`]: !!props.status,
    [`is-trend-${props.trend}`]: !!props.trend,
  },
])
</script>

<template>
  <div class="el-pro-statistic" :class="rootClass">
    <div v-if="icon" class="el-pro-statistic__icon">
      <slot name="icon"><component :is="icon" /></slot>
    </div>

    <div class="el-pro-statistic__wrapper">
      <div v-if="status" class="el-pro-statistic__status" :aria-label="status" />

      <div class="el-pro-statistic__content">
        <div class="el-pro-statistic__inner">
          <div v-if="hasTitle" class="el-pro-statistic__title">
            <span v-if="title !== undefined">{{ title }}</span>
            <ElTooltip v-if="tip" :content="tip" placement="top" :show-after="200">
              <span class="el-pro-statistic__help" tabindex="0">
                <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.3">
                  <circle cx="8" cy="8" r="6.2" />
                  <path d="M6.2 6.1a1.9 1.9 0 1 1 2.6 1.75c-.5.2-.8.6-.8 1.1v.35" stroke-linecap="round" />
                  <circle cx="8" cy="11.4" r="0.7" fill="currentColor" stroke="none" />
                </svg>
              </span>
            </ElTooltip>
          </div>

          <div class="el-pro-statistic__value">
            <span v-if="loading" class="el-pro-statistic__skeleton" />
            <template v-else>
              <span v-if="trend" class="el-pro-statistic__trend" aria-hidden="true" />
              <span v-if="prefix !== undefined" class="el-pro-statistic__prefix">{{ prefix }}</span>
              <span class="el-pro-statistic__number">{{ displayValue }}</span>
              <span v-if="suffix !== undefined" class="el-pro-statistic__suffix">{{ suffix }}</span>
            </template>
          </div>
        </div>

        <div v-if="description !== undefined" class="el-pro-statistic__desc">{{ description }}</div>
      </div>
    </div>
  </div>
</template>

<style>
.el-pro-statistic {
  --el-pro-statistic-trend-up-color: var(--el-color-danger, #f56c6c);
  --el-pro-statistic-trend-down-color: var(--el-color-success, #67c23a);

  display: flex;
  align-items: flex-start;
  width: 100%;
  min-width: 0;
  color: var(--el-text-color-primary, #303133);
}
.el-pro-statistic__icon {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 24px;
  color: var(--el-color-primary, #409eff);
}
.el-pro-statistic__wrapper {
  display: flex;
  width: 100%;
  min-width: 0;
}
.el-pro-statistic__status {
  flex: none;
  width: 14px;
  padding-top: 8px;
}
.el-pro-statistic__status::before {
  content: '';
  display: block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--el-text-color-disabled, #c0c4cc);
}
.el-pro-statistic.is-status-success .el-pro-statistic__status::before {
  background: var(--el-color-success, #67c23a);
}
.el-pro-statistic.is-status-processing .el-pro-statistic__status::before {
  background: var(--el-color-primary, #409eff);
}
.el-pro-statistic.is-status-warning .el-pro-statistic__status::before {
  background: var(--el-color-warning, #e6a23c);
}
.el-pro-statistic.is-status-error .el-pro-statistic__status::before {
  background: var(--el-color-danger, #f56c6c);
}
.el-pro-statistic__content {
  width: 100%;
  min-width: 0;
}
.el-pro-statistic__title {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
  font-size: 13px;
  color: var(--el-text-color-secondary, #909399);
  line-height: 1.4;
}
.el-pro-statistic__help {
  display: inline-flex;
  align-items: center;
  color: var(--el-text-color-placeholder, #a8abb2);
  cursor: help;
}
.el-pro-statistic__help:hover {
  color: var(--el-text-color-secondary, #909399);
}
.el-pro-statistic__value {
  display: block;
  white-space: nowrap;
  font-size: 24px;
  font-weight: 500;
  line-height: 1.2;
  color: var(--el-text-color-primary, #303133);
  font-variant-numeric: tabular-nums;
  transition: color 0.2s ease;
}
.el-pro-statistic__prefix,
.el-pro-statistic__suffix {
  font-size: 14px;
  font-weight: 400;
  color: var(--el-text-color-regular, #606266);
}
.el-pro-statistic__prefix {
  margin-right: 2px;
}
.el-pro-statistic__suffix {
  margin-left: 2px;
}
.el-pro-statistic__desc {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary, #909399);
  line-height: 1.5;
}

/* ---- 趋势 ---- */
.el-pro-statistic__trend {
  display: inline-block;
  vertical-align: middle;
  width: 0;
  height: 0;
  margin-right: 4px;
  border-left: 3.5px solid transparent;
  border-right: 3.5px solid transparent;
  border-bottom: 9px solid currentColor;
}
.el-pro-statistic.is-trend-down .el-pro-statistic__trend {
  transform: rotate(180deg);
}
.el-pro-statistic.is-trend-up .el-pro-statistic__value {
  color: var(--el-pro-statistic-trend-up-color);
}
.el-pro-statistic.is-trend-down .el-pro-statistic__value {
  color: var(--el-pro-statistic-trend-down-color);
}

/* ---- 三种排布 ---- */
.el-pro-statistic.is-layout-horizontal .el-pro-statistic__inner {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}
.el-pro-statistic.is-layout-horizontal .el-pro-statistic__title {
  margin-bottom: 0;
}
.el-pro-statistic.is-layout-horizontal .el-pro-statistic__value,
.el-pro-statistic.is-layout-horizontal .el-pro-statistic__title {
  font-size: 14px;
}
.el-pro-statistic.is-layout-horizontal .el-pro-statistic__prefix,
.el-pro-statistic.is-layout-horizontal .el-pro-statistic__suffix {
  font-size: 13px;
}

.el-pro-statistic.is-layout-inline .el-pro-statistic__inner {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
}
.el-pro-statistic.is-layout-inline .el-pro-statistic__title {
  margin-bottom: 0;
}
.el-pro-statistic.is-layout-inline .el-pro-statistic__value,
.el-pro-statistic.is-layout-inline .el-pro-statistic__title,
.el-pro-statistic.is-layout-inline .el-pro-statistic__prefix,
.el-pro-statistic.is-layout-inline .el-pro-statistic__suffix {
  font-size: 13px;
}
.el-pro-statistic.is-layout-inline .el-pro-statistic__value {
  color: var(--el-text-color-secondary, #909399);
}

/* ---- 加载 ---- */
.el-pro-statistic__skeleton {
  display: block;
  width: 72px;
  height: 24px;
  border-radius: var(--el-border-radius-base, 4px);
  background: var(--el-fill-color, #f0f2f5);
  animation: el-pro-statistic-pulse 1.4s ease-in-out infinite;
}
@keyframes el-pro-statistic-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}
</style>
