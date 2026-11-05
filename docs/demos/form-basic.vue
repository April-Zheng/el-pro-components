<script setup lang="ts">
// 基础表单：同一份 columns，valueType 决定控件
import { reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { ElProForm } from 'el-pro-components'
import type { ProColumn } from 'el-pro-components'
import { ROLE_ENUM } from '../../demo/data/enums'

const columns: ProColumn[] = [
  { prop: 'name', label: '项目名称', valueType: 'text', rules: [{ required: true, message: '请输入项目名称' }] },
  { prop: 'owner', label: '负责人', valueType: 'text' },
  { prop: 'role', label: '角色', valueType: 'select', valueEnum: ROLE_ENUM },
  { prop: 'budget', label: '预算', valueType: 'money' },
  { prop: 'deadline', label: '截止日期', valueType: 'date' },
  { prop: 'desc', label: '项目描述', valueType: 'textarea', formSpan: 24 },
]

const model = reactive<Record<string, any>>({})

async function onSubmit(values: Record<string, any>) {
  ElMessage.success(`提交：${JSON.stringify(values)}`)
  return true
}
</script>

<template>
  <ElProForm :columns="columns" :model="model" :span="8" label-width="90px" @submit="onSubmit" />
</template>
