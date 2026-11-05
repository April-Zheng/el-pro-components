<script setup lang="ts">
// 指标卡：Group 拼条画分割线，子卡宽度由 col-span 决定（24 栅格）
import { ElProStatisticCard, ElProStatisticCardGroup } from 'el-pro-components'

const overview = [
  { title: '总销售额', value: 1289450, prefix: '¥', precision: 0, trend: 'up' as const, trendValue: '12.3%' },
  { title: '访问量', value: 89240, trend: 'down' as const, trendValue: '3.1%' },
  { title: '支付转化率', value: 6.28, suffix: '%', precision: 2, trend: 'up' as const, trendValue: '1.2%' },
  { title: '退款金额', value: 8920, prefix: '¥', trend: 'down' as const, trendValue: '8.5%' },
]
</script>

<template>
  <ElProStatisticCardGroup :gutter="0">
    <ElProStatisticCard
      v-for="item in overview"
      :key="item.title"
      :col-span="6"
      :statistic="item"
    />
  </ElProStatisticCardGroup>
  <p class="demo-hint">趋势配色红涨绿跌（中国金融语义）；可用 CSS 变量覆盖。</p>
</template>
