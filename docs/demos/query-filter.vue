<script setup lang="ts">
// 查询筛选区：model 在页面手里，同一份条件能喂给请求/导出/条件回显
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ElProQueryFilter } from 'el-pro-components'
import type { ProColumn } from 'el-pro-components'
import { ROLE_ENUM, STATUS_ENUM } from '../../demo/data/enums'

const columns: ProColumn[] = [
  { prop: 'name', label: '姓名' },
  { prop: 'role', label: '角色', valueType: 'select', valueEnum: ROLE_ENUM },
  { prop: 'status', label: '状态', valueType: 'select', valueEnum: STATUS_ENUM },
  { prop: 'createdAt', label: '创建时间', valueType: 'dateRange' },
  { prop: 'email', label: '邮箱' },
]

const filterModel = reactive<Record<string, any>>({})
const querying = ref(false)

function onSearch(values: Record<string, any>) {
  ElMessage.success(`查询：${JSON.stringify(values)}`)
  querying.value = false
}
function onReset() {
  ElMessage.info('已重置')
}
</script>

<template>
  <ElProQueryFilter
    :columns="columns"
    :model="filterModel"
    :loading="querying"
    @search="onSearch"
    @reset="onReset"
  />
  <p class="demo-hint">折叠是默认行为，露几项按一行能放几项减一算出来的（留一格给按钮）。</p>
</template>
