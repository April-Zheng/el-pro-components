<script setup lang="ts">
// 卡片流：item-type="card" + grid，每条自动包一层 ElProCard
import { ElButton, ElMessage } from 'element-plus'
import { ElProList } from 'el-pro-components'
import type { ProColumn } from 'el-pro-components'
import { ROLE_ENUM } from '../../demo/data/enums'
import { ALL } from '../../demo/data/mock'

const columns: ProColumn[] = [
  { prop: 'name', label: '姓名', listSlot: 'title' },
  { prop: 'role', label: '角色', valueType: 'tag', valueEnum: ROLE_ENUM, listSlot: 'description' },
  { prop: 'amount', label: '累计金额', valueType: 'money', listSlot: 'extra' },
  { prop: 'actions', label: '操作', valueType: 'option', listSlot: 'actions' },
]
</script>

<template>
  <ElProList
    :columns="columns"
    :data-source="ALL.slice(0, 4)"
    row-key="id"
    item-type="card"
    :grid="{ column: 2, gutter: 16 }"
    :pagination="false"
  >
    <template #actions="{ row }">
      <ElButton link type="primary" @click="ElMessage.info(`查看：${row.name}`)">查看</ElButton>
    </template>
  </ElProList>
</template>
