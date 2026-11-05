<script setup lang="ts">
// 列表：columns 和表格共用，listSlot 决定字段在条目里的角色
import { ElButton, ElMessage } from 'element-plus'
import { ElProList } from 'el-pro-components'
import type { ProColumn } from 'el-pro-components'
import { ROLE_ENUM, STATUS_ENUM } from '../../demo/data/enums'
import { ALL, delay } from '../../demo/data/mock'

const columns: ProColumn[] = [
  { prop: 'name', label: '姓名', listSlot: 'title' },
  { prop: 'role', label: '角色', valueType: 'tag', valueEnum: ROLE_ENUM, listSlot: 'description' },
  { prop: 'status', label: '状态', valueType: 'status', valueEnum: STATUS_ENUM, listSlot: 'description' },
  { prop: 'amount', label: '累计金额', valueType: 'money', listSlot: 'extra' },
  { prop: 'createdAt', label: '创建时间', valueType: 'dateTime', listSlot: 'aside' },
  { prop: 'actions', label: '操作', valueType: 'option', listSlot: 'actions' },
]

const request = async (params: any, _sort: any, { signal }: any) => {
  await delay(450, signal)
  const start = (params.current - 1) * params.pageSize
  return { data: ALL.slice(start, start + params.pageSize), total: ALL.length }
}
</script>

<template>
  <ElProList :columns="columns" :request="request" row-key="id">
    <template #actions="{ row }">
      <ElButton link type="primary" @click="ElMessage.info(`查看：${row.name}`)">查看</ElButton>
    </template>
  </ElProList>
</template>
