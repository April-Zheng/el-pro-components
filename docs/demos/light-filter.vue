<script setup lang="ts">
// 轻量筛选：行内紧凑字段，secondary 项收进「更多筛选」弹层
import { reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { ElProLightFilter } from 'el-pro-components'
import type { ProColumn } from 'el-pro-components'
import { ROLE_ENUM, STATUS_ENUM } from '../../demo/data/enums'

const columns: ProColumn[] = [
  { prop: 'name', label: '名称', valueType: 'text' },
  { prop: 'role', label: '角色', valueType: 'select', valueEnum: ROLE_ENUM },
  { prop: 'status', label: '状态', valueType: 'select', valueEnum: STATUS_ENUM, secondary: true },
  { prop: 'createdAt', label: '创建时间', valueType: 'dateRange', secondary: true },
]

const filterModel = reactive<Record<string, any>>({})

function onSearch(values: Record<string, any>) {
  ElMessage.success(`search：${JSON.stringify(values)}`)
}
</script>

<template>
  <ElProLightFilter :columns="columns" :model="filterModel" @search="onSearch" />
  <p class="demo-hint">
    改名称/角色会立即触发 search；状态和创建时间收在「更多筛选」里，点「确认」才生效。
  </p>
</template>
