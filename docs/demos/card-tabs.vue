<script setup lang="ts">
// 头部换成标签页：省掉外层 el-tabs + N 个 el-card 的套壳
import { ref } from 'vue'
import { ElProCard } from 'el-pro-components'

const activeKey = ref('overview')
</script>

<template>
  <ElProCard
    v-model:active-key="activeKey"
    title="服务监控"
    :tabs="[
      { key: 'overview', label: '概览' },
      { key: 'logs', label: '日志' },
    ]"
  >
    <template #tab-overview>CPU 32% · 内存 61% · 磁盘 68%（概览内容）</template>
    <template #tab-logs>2026-11-05 10:21:03 健康检查通过（日志内容）</template>
  </ElProCard>
</template>
