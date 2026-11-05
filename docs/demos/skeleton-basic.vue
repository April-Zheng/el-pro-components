<script setup lang="ts">
// 骨架屏：六种版式切换 + loading 开关（false 时渲染默认插槽的真实内容）
import { ref } from 'vue'
import { ElProCard, ElProSkeleton } from 'el-pro-components'

const type = ref('list')
const loading = ref(true)
const types = ['list', 'table', 'descriptions', 'grid', 'card', 'result']
</script>

<template>
  <div class="skeleton-demo">
    <div class="skeleton-demo__toolbar">
      <label>版式：</label>
      <select v-model="type">
        <option v-for="t in types" :key="t" :value="t">{{ t }}</option>
      </select>
      <label style="margin-left: 16px">loading：</label>
      <input v-model="loading" type="checkbox" />
    </div>

    <ElProSkeleton :type="type" :rows="3" :items="4" :loading="loading">
      <ElProCard title="真实内容">
        loading 为 false 时渲染默认插槽——结构要和骨架对得上，切换才不闪。
      </ElProCard>
    </ElProSkeleton>
  </div>
</template>

<style scoped>
.skeleton-demo__toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 13px;
}
.skeleton-demo__toolbar select {
  padding: 2px 8px;
}
</style>
