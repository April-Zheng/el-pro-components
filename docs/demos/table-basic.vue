<script setup lang="ts">
// 基础表格：一份 columns 驱动搜索栏、表格列、列设置
import { ElButton, ElMessage } from 'element-plus'
import { ElProTable } from 'el-pro-components'
import type { ProColumn } from 'el-pro-components'
import { ROLE_ENUM, STATUS_ENUM } from '../../demo/data/enums'
import { ALL, delay } from '../../demo/data/mock'

interface User {
  id: number
  name: string
  role: string
  status: string
  amount: number
  createdAt: string
}

const columns: ProColumn[] = [
  { prop: 'id', label: 'ID', valueType: 'indexBorder', width: 64, search: false },
  { prop: 'name', label: '姓名', copyable: true, width: 120 },
  { prop: 'role', label: '角色', valueType: 'tag', valueEnum: ROLE_ENUM, width: 100 },
  { prop: 'status', label: '状态', valueType: 'status', valueEnum: STATUS_ENUM, width: 96 },
  { prop: 'amount', label: '金额', valueType: 'money', width: 120, sortable: 'custom', search: false },
  { prop: 'createdAt', label: '创建时间', valueType: 'dateTime', width: 170, sortable: 'custom', search: false },
  { prop: 'actions', label: '操作', valueType: 'option', width: 96 },
]

const request = async (params: any, sort: any, { signal }: any) => {
  await delay(450, signal)
  let list = ALL.slice()
  if (params.name) list = list.filter((u: any) => u.name.includes(String(params.name)))
  if (params.role) list = list.filter((u: any) => u.role === params.role)
  if (params.status) list = list.filter((u: any) => u.status === params.status)
  const sortKey = Object.keys(sort)[0]
  if (sortKey) {
    const dir = sort[sortKey] === 'asc' ? 1 : -1
    list.sort((a: any, b: any) => ((a[sortKey] > b[sortKey] ? 1 : -1)) * dir)
  }
  const start = (params.current - 1) * params.pageSize
  return { data: list.slice(start, start + params.pageSize), total: list.length }
}

function edit(row: any) {
  ElMessage.info(`编辑：${row.name}`)
}
</script>

<template>
  <ElProTable :columns="columns" :request="request" row-key="id" title="用户列表" selection>
    <template #actions="{ row }">
      <ElButton link type="primary" @click="edit(row)">编辑</ElButton>
    </template>
  </ElProTable>
</template>
