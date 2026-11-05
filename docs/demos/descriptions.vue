<script setup lang="ts">
// 详情页：和表格共用同一份 columns，request 模式自动带 loading/竞态处理
import { ref } from 'vue'
import { ElProDescriptions } from 'el-pro-components'
import type { ProColumn } from 'el-pro-components'
import { ROLE_ENUM, STATUS_ENUM } from '../../demo/data/enums'
import { ALL, delay } from '../../demo/data/mock'

const columns: ProColumn[] = [
  { prop: 'avatar', label: '头像', valueType: 'avatar', descriptionsSpan: 1 },
  { prop: 'name', label: '姓名', copyable: true },
  { prop: 'email', label: '邮箱', copyable: true },
  { prop: 'role', label: '角色', valueType: 'tag', valueEnum: ROLE_ENUM },
  { prop: 'status', label: '状态', valueType: 'status', valueEnum: STATUS_ENUM },
  { prop: 'amount', label: '金额', valueType: 'money' },
  { prop: 'progress', label: '进度', valueType: 'progress' },
  { prop: 'createdAt', label: '创建时间', valueType: 'dateTime' },
]

// 详情页通常「一个页面一个接口」，把请求交给组件
const userId = ref(1)
const params = ref({ id: 1 })

async function request(p: any, { signal }: any) {
  await delay(600, signal)
  const row = ALL.find((u) => u.id === (p.id ?? 1))
  return { data: row ?? ALL[0] }
}

function nextUser() {
  userId.value = (userId.value % 5) + 1
  // 必须换整个引用，改属性不会触发重查
  params.value = { id: userId.value }
}
</script>

<template>
  <div class="demo-toolbar">
    <el-button size="small" @click="nextUser">下一位用户（当前 id={{ userId }}）</el-button>
  </div>
  <ElProDescriptions
    :columns="columns"
    :request="request"
    :params="params"
    :column="{ xs: 1, md: 2, lg: 3 }"
    title="用户详情"
  />
</template>

<style scoped>
.demo-toolbar {
  margin-bottom: 12px;
}
</style>
