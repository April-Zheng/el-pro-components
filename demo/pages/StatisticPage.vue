<script setup lang="ts">
/** 指标卡示例：Group 等分 / 图表位 / 三种排布 / 加载态 */
import { ElButton, ElProgress } from 'element-plus'
import {
  ElProCard,
  ElProStatistic,
  ElProStatisticCard,
  ElProStatisticCardGroup,
} from '@/index'

const overview = [
  {
    title: '总用户',
    tip: '含未激活账号',
    value: 128642,
    trend: 'up' as const,
    status: 'processing' as const,
    description: '较上周 +3.2%',
  },
  { title: '活跃用户', value: 76310, trend: 'up' as const, suffix: '人', description: '近 7 日有操作' },
  { title: '付费转化', value: 0.4217, precision: 2, suffix: '%', trend: 'down' as const, description: '较上周 -0.4%' },
  { title: '今日营收', value: 98765.4, precision: 2, prefix: '¥', status: 'success' as const },
]
</script>

<template>
  <div class="demo-card">
    <h3 class="demo-section-title">StatisticCardGroup 等分</h3>
    <p class="demo-section-desc">
      子卡只写内容，宽度和分割线由 Group 负责。趋势是<strong>红涨绿跌</strong>（中国金融语义），
      想反过来覆盖 <code>--el-pro-statistic-trend-up-color</code> 即可。
    </p>
    <ElProStatisticCardGroup :gutter="0">
      <ElProStatisticCard
        v-for="item in overview"
        :key="item.title"
        :col-span="6"
        :statistic="item"
      />
    </ElProStatisticCardGroup>
  </div>

  <div class="demo-card" style="margin-top: 16px">
    <h3 class="demo-section-title">图表在右侧</h3>
    <p class="demo-section-desc">
      <code>chart</code> 可以是任意节点，这里塞的是 el-progress 的环形。
      <code>chart-placement</code> 取 <code>left</code> / <code>right</code> 时数值与图表并排，取
      <code>bottom</code>（默认）时上下叠。
    </p>
    <ElProStatisticCardGroup>
      <ElProStatisticCard
        :col-span="12"
        chart-placement="right"
        :statistic="{ title: '磁盘占用', value: 68, suffix: '%', description: '共 500 GB，已用 340 GB' }"
      >
        <template #chart>
          <ElProgress type="dashboard" :percentage="68" :width="96" :stroke-width="8" />
        </template>
      </ElProStatisticCard>

      <ElProStatisticCard
        :col-span="12"
        chart-placement="right"
        :statistic="{ title: '本月工单', value: 1248, trend: 'up', description: '已关闭 1102 个' }"
        footer="数据每小时同步一次"
      >
        <template #chart>
          <ElProgress :percentage="88" :stroke-width="10" :show-text="false" />
        </template>
      </ElProStatisticCard>
    </ElProStatisticCardGroup>
  </div>

  <ElProCard title="三种排布" style="margin-top: 16px">
    <ElProStatistic
      title="vertical（默认）"
      :value="128642"
      description="标题在上、数值 24px，指标卡最常用"
    />
    <div style="height: 16px" />
    <ElProStatistic
      layout="horizontal"
      title="horizontal"
      :value="128642"
      suffix="人"
      description="标题左、数值右，同 14px，适合列表里的一行"
    />
    <div style="height: 16px" />
    <ElProStatistic layout="inline" title="inline" :value="128642" suffix="人" description="挤一行、13px 次级色" />
  </ElProCard>

  <div class="demo-card" style="margin-top: 16px">
    <h3 class="demo-section-title">图标、状态点、加载态</h3>
    <p class="demo-section-desc">左侧图标接组件；<code>status</code> 画状态点；<code>loading</code> 把数值换成占位条。</p>
    <ElProStatistic
      title="待处理告警"
      :value="37"
      status="warning"
      description="其中 P0 级 3 条"
    >
      <template #icon>
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6">
          <path d="M12 3.5 2.8 19.5h18.4z" stroke-linejoin="round" />
          <path d="M12 9.5v4.2" stroke-linecap="round" />
          <circle cx="12" cy="16.6" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      </template>
    </ElProStatistic>
    <div style="height: 16px" />
    <ElProStatistic title="正在加载" loading value="-" />
  </div>

  <ElProCard title="放在卡片底部" style="margin-top: 16px">
    <ElProStatisticCard
      :statistic="{
        title: '本月新增',
        value: 3642,
        trend: 'up',
        suffix: '人',
        description: '环比 +12.6%',
      }"
    >
      <template #footer>
        <ElButton link type="primary" size="small">查看趋势</ElButton>
      </template>
    </ElProStatisticCard>
  </ElProCard>
</template>
