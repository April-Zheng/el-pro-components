<script setup lang="ts">
// 弹窗表单：校验 → 提交 → 成功才关窗；reject 留在原地
import { ElMessage } from 'element-plus'
import { ElProModalForm } from 'el-pro-components'
import type { ProColumn } from 'el-pro-components'
import { ROLE_ENUM } from '../../demo/data/enums'

const columns: ProColumn[] = [
  { prop: 'name', label: '项目名称', valueType: 'text', rules: [{ required: true, message: '请输入项目名称' }] },
  { prop: 'owner', label: '负责人', valueType: 'text' },
  { prop: 'role', label: '角色', valueType: 'select', valueEnum: ROLE_ENUM },
]

// 抛错 = 本次提交失败，窗不关、输入不清，用户改完就地重提
async function create(values: Record<string, any>) {
  await new Promise((r) => setTimeout(r, 400))
  if (values.name === '失败') throw new Error('项目名称被占用')
  ElMessage.success(`已创建：${values.name}`)
}
</script>

<template>
  <ElProModalForm title="新建项目" :columns="columns" :width="480" @finish="create">
    <template #trigger>
      <el-button type="primary">新建项目</el-button>
    </template>
  </ElProModalForm>
  <p class="demo-hint">试试把项目名称填成「失败」——提交会报错，弹窗不关、输入保留。</p>
</template>
