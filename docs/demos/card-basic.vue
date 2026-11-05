<script setup lang="ts">
// 基础卡片：标题区结构、折叠、extra 操作位
import { ref } from 'vue'
import { ElButton } from 'element-plus'
import { ElProCard } from 'el-pro-components'

const collapsed = ref(false)
</script>

<template>
  <ElProCard
    v-model:collapsed="collapsed"
    title="基础信息"
    sub-title="随用随填"
    tooltip="标题旁的问号提示"
    collapsible
  >
    <template #extra>
      <ElButton link type="primary">更多</ElButton>
    </template>
    卡片内容。头部是「标题 + 副标题 + 问号 + 操作区」的固定结构，右上的箭头折叠整个内容区。
  </ElProCard>
</template>
