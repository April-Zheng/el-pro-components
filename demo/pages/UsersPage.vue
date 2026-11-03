<script setup lang="ts">
/**
 * 用户列表页：列配置驱动的 CRUD 主场景。
 * 搜索栏 / 列设置 / 分页 / 服务端排序 / 竞态处理 都在 ElProTable 里，这里只给列和接口。
 */
import { ref } from 'vue'
import { ElButton, ElMessage, ElMessageBox } from 'element-plus'
import { ElProTable } from '@/index'
import type { ProColumn } from '@/index'
import { ROLE_ENUM, STATUS_ENUM } from '../data/enums'
import { requestUsers } from '../data/mock'
import type { User } from '../data/mock'
import UserEditDialog from '../components/UserEditDialog.vue'
import { useUserEditor } from '../composables/useUserEditor'

const columns: ProColumn<User>[] = [
  { prop: 'id', label: 'ID', valueType: 'indexBorder', width: 64, fixed: 'left', search: false },
  { prop: 'name', label: '姓名', valueType: 'text', copyable: true, minWidth: 110 },
  { prop: 'avatar', label: '头像', valueType: 'avatar', width: 76 },
  { prop: 'email', label: '邮箱', minWidth: 180, hideInTable: true },
  { prop: 'role', label: '角色', valueType: 'tag', valueEnum: ROLE_ENUM, width: 100 },
  { prop: 'status', label: '状态', valueType: 'status', valueEnum: STATUS_ENUM, width: 110 },
  { prop: 'score', label: '评分', valueType: 'rate', width: 132, search: false },
  { prop: 'progress', label: '完成度', valueType: 'progress', minWidth: 130, search: false },
  {
    prop: 'amount',
    label: '金额',
    valueType: 'money',
    width: 132,
    align: 'right',
    sortable: 'custom',
    search: false,
  },
  {
    prop: 'createdAt',
    label: '创建时间',
    valueType: 'dateTime',
    width: 172,
    sortable: 'custom',
    search: {
      span: 8,
      valueType: 'dateRange',
      transform: (v: string[]) =>
        Array.isArray(v) && v.length === 2 ? { startTime: v[0], endTime: v[1] } : {},
    },
  },
  { prop: 'actions', label: '操作', valueType: 'option', width: 128, fixed: 'right' },
]

const tableRef = ref<InstanceType<typeof ElProTable>>()

const { visible, user, openEdit, openCreate, handleSaved } = useUserEditor(() =>
  tableRef.value?.reload(),
)

async function removeUser(row: User) {
  try {
    await ElMessageBox.confirm(`确定删除「${row.name}」吗？`, '提示', { type: 'warning' })
    ElMessage.success('已删除（演示，不真的改数据）')
    tableRef.value?.reloadAndRest()
  } catch {
    /* 取消 */
  }
}

function batchRemove(rows: User[]) {
  ElMessage.warning(`已选中 ${rows.length} 项（演示）`)
}
</script>

<template>
  <ElProTable
    ref="tableRef"
    :columns="columns"
    :request="requestUsers"
    row-key="id"
    selection
    title="用户列表"
    tooltip="列配置同时驱动搜索栏、表格列和列设置面板"
    persistence-key="demo-users"
    :default-page-size="10"
  >
    <template #toolbarActions>
      <ElButton type="primary" @click="openCreate">新建用户</ElButton>
    </template>

    <template #actions="{ row }">
      <ElButton link type="primary" size="small" @click="openEdit(row as User)">编辑</ElButton>
      <ElButton link type="danger" size="small" @click="removeUser(row as User)">删除</ElButton>
    </template>

    <template #batch="{ selected }">
      <ElButton size="small" type="danger" plain @click="batchRemove(selected as User[])">
        批量删除
      </ElButton>
    </template>
  </ElProTable>

  <div class="demo-hint">
    试一下：连续快速点翻页 —— 旧请求会被丢弃，不会出现数据串页。
    <br />
    「创建时间」列在表格里显示到秒，搜索时自动变成日期区间，靠的是
    <code>search.valueType</code> + <code>search.transform</code>。
    <br />
    金额列点表头排序走服务端（<code>sortable="custom"</code>），会重新触发 request。
  </div>

  <UserEditDialog v-model="visible" :user="user" @saved="handleSaved" />
</template>
