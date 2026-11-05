<script setup lang="ts">
// 页面容器：页头（面包屑/标题/说明/extra/tab）+ 内容区 loading 遮罩 + 底部操作条
import { ref } from 'vue'
import { ElButton, ElMessage } from 'element-plus'
import { ElProPageContainer } from 'el-pro-components'

const tab = ref('detail')
const loading = ref(false)

function toggleLoading() {
  loading.value = true
  setTimeout(() => (loading.value = false), 1200)
}
</script>

<template>
  <ElProPageContainer
    title="订单详情"
    sub-title="订单号：SO20261105001"
    :breadcrumb="[{ title: '首页', path: '/' }, { title: '订单管理' }, { title: '订单详情' }]"
    content="订单详情页。页头一个字段都没有时整块不渲染；loading 只顶掉内容区，页头和 tab 留着。"
    :tab-list="[
      { key: 'detail', label: '详情' },
      { key: 'log', label: '操作日志' },
    ]"
    v-model:tab-active-key="tab"
    :footer-tool-bar-props="{ fixed: false }"
  >
    <template #extra>
      <ElButton type="primary" @click="toggleLoading">模拟加载</ElButton>
    </template>

    <div style="min-height: 120px">
      {{ tab === 'detail' ? '详情内容：收货人 张三，手机 138****0000。' : '日志内容：2026-11-05 创建订单。' }}
    </div>

    <template #footer>
      <ElButton @click="ElMessage.info('取消')">取消</ElButton>
      <ElButton type="primary" @click="ElMessage.success('已保存')">保存</ElButton>
    </template>
  </ElProPageContainer>
</template>
