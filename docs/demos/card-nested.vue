<script setup lang="ts">
// 嵌套即布局：父卡统一承担外框，子卡自动去边框、父卡 body 自动去 padding
import { ElProCard } from 'el-pro-components'

const metrics = [
  { name: '本周新增', value: '1,284' },
  { name: '活跃用户', value: '8,940' },
]
</script>

<template>
  <ElProCard title="数据看板" split="vertical" :gutter="16">
    <ElProCard v-for="m in metrics" :key="m.name" :title="m.name" :col-span="12">
      <div class="metric">{{ m.value }}</div>
    </ElProCard>
    <ElProCard title="说明" :col-span="24">
      colSpan 按 24 栅格算，也接受 '30%' / '320px'，支持响应式对象 :col-span="{ xs: 24, lg: 12 }"。
    </ElProCard>
  </ElProCard>
</template>

<style scoped>
.metric {
  font-size: 28px;
  font-weight: 600;
}
</style>
