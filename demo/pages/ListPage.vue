<script setup lang="ts">
/** 列表页示例：同一份 columns 生成「标准列表」和「卡片流」两种形态 */
import { ref } from 'vue'
import { ElButton, ElMessage, ElMessageBox } from 'element-plus'
import { ElProList } from '@/index'
import type { ProColumn } from '@/index'
import { ROLE_ENUM, STATUS_ENUM } from '../data/enums'
import { requestUsers } from '../data/mock'
import type { User } from '../data/mock'
import UserEditDialog from '../components/UserEditDialog.vue'
import { useUserEditor } from '../composables/useUserEditor'

/** listSlot 决定字段落在条目里的哪个位置 */
const listColumns: ProColumn<User>[] = [
  { prop: 'avatar', label: '头像', valueType: 'avatar', listSlot: 'avatar' },
  { prop: 'name', label: '姓名', listSlot: 'title' },
  { prop: 'email', label: '邮箱', listSlot: 'subTitle' },
  { prop: 'role', label: '角色', valueType: 'tag', valueEnum: ROLE_ENUM, listSlot: 'description' },
  { prop: 'status', label: '状态', valueType: 'status', valueEnum: STATUS_ENUM, listSlot: 'description' },
  { prop: 'amount', label: '金额', valueType: 'money', listSlot: 'extra' },
  { prop: 'createdAt', label: '创建于', valueType: 'fromNow', listSlot: 'aside' },
  { prop: 'actions', label: '操作', valueType: 'option', listSlot: 'actions' },
]

const { visible, user, openEdit, handleSaved } = useUserEditor()

async function removeUser(row: User) {
  try {
    await ElMessageBox.confirm(`确定删除「${row.name}」吗？`, '提示', { type: 'warning' })
    ElMessage.success('已删除（演示，不真的改数据）')
  } catch {
    /* 取消 */
  }
}
</script>

<template>
  <ElProList
    :columns="listColumns"
    :request="requestUsers"
    row-key="id"
    :default-page-size="6"
    :pagination="{ pageSizes: [6, 12, 24], layout: 'total, sizes, prev, pager, next' }"
  >
    <template #actions="{ item }">
      <ElButton link type="primary" size="small" @click="openEdit(item as User)">编辑</ElButton>
      <ElButton link type="danger" size="small" @click="removeUser(item as User)">删除</ElButton>
    </template>
  </ElProList>

  <div class="demo-card" style="margin-top: 16px">
    <h3 class="demo-section-title">卡片流</h3>
    <p class="demo-section-desc">
      <code>item-type="card"</code> + <code>grid</code>：每条自动包一层卡片，走同一份 columns。
    </p>
    <ElProList
      :columns="listColumns"
      :request="requestUsers"
      row-key="id"
      item-type="card"
      :grid="{ column: 3, gutter: 16 }"
      :pagination="false"
      :bordered="false"
      :default-page-size="6"
    >
      <template #actions="{ item }">
        <ElButton link type="primary" size="small" @click="openEdit(item as User)">编辑</ElButton>
      </template>
    </ElProList>
  </div>

  <div class="demo-hint">
    listSlot 决定字段在条目里的位置：avatar / title / subTitle / description / extra / aside / actions。
    不写 listSlot 也能跑，会按 valueType 和顺序自动推断。
  </div>

  <UserEditDialog v-model="visible" :user="user" @saved="handleSaved" />
</template>
