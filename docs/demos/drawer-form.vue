<script setup lang="ts">
// 抽屉表单：v-model:open 由父组件控制，每次打开从 initialValues 重新拷草稿
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ElProDrawerForm } from 'el-pro-components'
import type { ProColumn } from 'el-pro-components'
import { ROLE_ENUM } from '../../demo/data/enums'

const open = ref(false)
const row = ref<Record<string, any>>({})

const columns: ProColumn[] = [
  { prop: 'name', label: '姓名', valueType: 'text', rules: [{ required: true, message: '请输入姓名' }] },
  { prop: 'email', label: '邮箱', valueType: 'text' },
  { prop: 'role', label: '角色', valueType: 'select', valueEnum: ROLE_ENUM },
]

function openEdit(user: Record<string, any>) {
  row.value = { ...user }
  open.value = true
}

async function save(values: Record<string, any>) {
  await new Promise((r) => setTimeout(r, 300))
  ElMessage.success(`已保存：${values.name}`)
  return true
}
</script>

<template>
  <el-button type="primary" @click="openEdit({ name: '李明轩', email: 'user1@example.com', role: 'admin' })">
    编辑李明轩
  </el-button>

  <ElProDrawerForm
    v-model:open="open"
    title="编辑用户"
    :columns="columns"
    :initial-values="row"
    drawer-size="480px"
    @finish="save"
  />
</template>
