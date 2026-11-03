<script setup lang="ts">
/** 卡片示例：结构头部 / 折叠 / 标签页 / 嵌套分组 / CheckCard / 骨架屏 */
import { ref } from 'vue'
import { ElButton } from 'element-plus'
import {
  ElProCard,
  ElProCheckCard,
  ElProCheckCardGroup,
  ElProSkeleton,
} from '@/index'

const cardCollapsed = ref(false)
const cardTab = ref('overview')
const cardTabs = [
  { key: 'overview', label: '概览' },
  { key: 'detail', label: '明细' },
  { key: 'setting', label: '设置', disabled: true },
]

const pickedPlan = ref<string | number>('pro')
const planOptions = [
  { value: 'basic', title: '基础版', description: '适合个人试用，限 1 个成员', extra: '¥0' },
  { value: 'pro', title: '专业版', description: '适合小团队，成员不限', extra: '¥99' },
  { value: 'ent', title: '企业版', description: '私有部署 + 专属支持', extra: '定制' },
]

const pickedFeatures = ref<any[]>(['alert'])
</script>

<template>
  <ElProCard
    v-model:collapsed="cardCollapsed"
    title="基础卡片"
    sub-title="subTitle 紧跟标题"
    tooltip="标题旁的问号就是 tooltip"
    collapsible
    header-bordered
  >
    <template #extra>
      <ElButton link type="primary" size="small">更多</ElButton>
    </template>
    <p class="demo-p">
      点标题前的箭头折叠。头部、副标题、提示、右上角操作都是结构化属性，不用自己排版。
    </p>
  </ElProCard>

  <ElProCard
    v-model:active-key="cardTab"
    :tabs="cardTabs"
    title="带标签页的卡片"
    style="margin-top: 16px"
  >
    <template #tab-overview>
      <p class="demo-p">当前标签：{{ cardTab }}。头部直接变成标签栏，切换只换 body。</p>
    </template>
    <template #tab-detail>
      <p class="demo-p">省掉「外层 el-tabs + 里面 N 个 el-card」的套娃。</p>
    </template>
  </ElProCard>

  <ElProCard title="分组卡片" split="vertical" :gutter="16" style="margin-top: 16px">
    <ElProCard title="左" :col-span="12"> 子卡自动去掉边框与圆角，外框和分割线由父卡负责。 </ElProCard>
    <ElProCard title="右" :col-span="12"> colSpan 按 24 栅格算，也可以写 '30%' / '320px'。 </ElProCard>
  </ElProCard>

  <div class="demo-card" style="margin-top: 16px">
    <h3 class="demo-section-title">CheckCard 单选</h3>
    <p class="demo-section-desc">整块可点，装得下头像、描述和角标。当前选中：{{ pickedPlan }}</p>
    <ElProCheckCardGroup v-model="pickedPlan" :options="planOptions" :column="3" />
  </div>

  <div class="demo-card" style="margin-top: 16px">
    <h3 class="demo-section-title">CheckCard 多选</h3>
    <p class="demo-section-desc">已选：{{ pickedFeatures.join('、') || '（空）' }}</p>
    <ElProCheckCardGroup v-model="pickedFeatures" multiple :column="3">
      <ElProCheckCard value="alert" title="告警通知" description="阈值触发时推送到值班群" />
      <ElProCheckCard value="report" title="日报推送" description="每天 9:00 汇总前一天数据" />
      <ElProCheckCard value="audit" title="操作审计" description="记录关键操作，保留 180 天" disabled />
    </ElProCheckCardGroup>
  </div>

  <ElProCard title="加载态" loading style="margin-top: 16px" />

  <div class="demo-card" style="margin-top: 16px">
    <h3 class="demo-section-title">ElProSkeleton</h3>
    <p class="demo-section-desc">表格版骨架屏，用于「先占位、后填数据」的列表页。</p>
    <ElProSkeleton type="table" :rows="3" :columns="5" />
  </div>
</template>
