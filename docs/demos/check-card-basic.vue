<script setup lang="ts">
// 多选卡：配置式 options 单选 + 插槽式 multiple 多选，两种形态各一组
import { ref } from 'vue'
import { ElProCheckCard, ElProCheckCardGroup } from 'el-pro-components'

const plan = ref('pro')
const features = ref<string[]>(['alert'])

const planOptions = [
  { value: 'basic', title: '基础版', description: '单实例，适合试用' },
  { value: 'pro', title: '专业版', description: '多实例 + 告警，适合生产' },
  { value: 'flagship', title: '旗舰版', description: '专属集群，适合大规模' },
]
</script>

<template>
  <p class="demo-section-title">单选（配置式 options）</p>
  <ElProCheckCardGroup v-model="plan" :options="planOptions" :column="3" />

  <p class="demo-section-title" style="margin-top: 16px">多选（插槽式，可插禁用项）</p>
  <ElProCheckCardGroup v-model="features" multiple :column="3">
    <ElProCheckCard value="alert" title="告警通知" description="阈值触发时推送到值班群" />
    <ElProCheckCard value="backup" title="定时备份" description="每日凌晨全量备份" />
    <ElProCheckCard value="audit" title="操作审计" description="记录全部管理操作" disabled />
  </ElProCheckCardGroup>
  <p class="demo-hint">当前：单选 {{ plan }}，多选 {{ features.join('、') || '（空）' }}</p>
</template>
