<script setup lang="ts">
// 受控数据源：传 dataSource 后组件不发请求，配默认插槽插展开行
import { ElProTable } from 'el-pro-components'
import type { ProColumn } from 'el-pro-components'
import { ROLE_ENUM, STATUS_ENUM } from '../../demo/data/enums'
import { ALL } from '../../demo/data/mock'

const dataSource = ALL.slice(0, 5)

const columns: ProColumn[] = [
  { prop: 'id', label: 'ID', valueType: 'indexBorder', width: 64 },
  { prop: 'name', label: '姓名', width: 140 },
  { prop: 'role', label: '角色', valueType: 'tag', valueEnum: ROLE_ENUM, width: 110 },
  { prop: 'status', label: '状态', valueType: 'status', valueEnum: STATUS_ENUM, width: 100 },
  { prop: 'amount', label: '金额', valueType: 'money', width: 130 },
  { prop: 'createdAt', label: '创建时间', valueType: 'dateTime', width: 180 },
]
</script>

<template>
  <ElProTable :columns="columns" :data-source="dataSource" row-key="id" :search="false" :pagination="false">
    <ElTableColumn type="expand" width="40">
      <template #default="{ row }">
        <div class="expand-body">
          {{ row.name }} 的记录：金额 ¥{{ row.amount }}，创建于 {{ row.createdAt }}。
          展开行这类结构性列走默认插槽，位置在 schema 列之前。
        </div>
      </template>
    </ElTableColumn>
  </ElProTable>
</template>

<style scoped>
.expand-body {
  padding: 8px 16px;
  font-size: 13px;
  color: var(--vp-c-text-2, #606266);
  line-height: 1.7;
}
</style>
