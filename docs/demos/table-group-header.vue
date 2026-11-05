<script setup lang="ts">
// 多级表头：columns 里写 children 即分组，分组列不写 prop
import { ElButton, ElMessage } from 'element-plus'
import { ElProTable } from 'el-pro-components'
import type { ProColumn } from 'el-pro-components'
import { ROLE_ENUM } from '../../demo/data/enums'
import { ALL, delay } from '../../demo/data/mock'

const columns: ProColumn[] = [
  { prop: 'id', label: 'ID', valueType: 'indexBorder', width: 64, search: false },
  {
    label: '基础信息',
    children: [
      { prop: 'name', label: '姓名', width: 140 },
      { prop: 'role', label: '角色', valueType: 'tag', valueEnum: ROLE_ENUM, width: 110 },
    ],
  },
  {
    label: '业绩',
    children: [
      { prop: 'amount', label: '金额', valueType: 'money', width: 130, sortable: 'custom', search: false },
      { prop: 'createdAt', label: '创建时间', valueType: 'dateTime', width: 180, sortable: 'custom', search: false },
    ],
  },
  { prop: 'actions', label: '操作', valueType: 'option', width: 96 },
]

const request = async (params: any, sort: any, { signal }: any) => {
  await delay(450, signal)
  let list = ALL.slice()
  if (params.role) list = list.filter((u: any) => u.role === params.role)
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
  <ElProTable :columns="columns" :request="request" row-key="id" title="用户列表">
    <template #actions="{ row }">
      <ElButton link type="primary" @click="edit(row)">编辑</ElButton>
    </template>
  </ElProTable>
</template>
