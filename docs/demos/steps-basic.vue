<script setup lang="ts">
// 分步表单：每步校验过了才前进，最后一步统一 onFinish
import { ElMessage, ElMessageBox } from 'element-plus'
import { ElProStepsForm } from 'el-pro-components'
import type { ProStepsFormItem } from 'el-pro-components'

const steps: ProStepsFormItem[] = [
  {
    name: 'base',
    title: '基本信息',
    columns: [
      { prop: 'name', label: '项目名称', valueType: 'text', rules: [{ required: true, message: '请输入项目名称' }] },
      { prop: 'owner', label: '负责人', valueType: 'text' },
    ],
  },
  {
    name: 'contact',
    title: '联系方式',
    columns: [
      { prop: 'phone', label: '电话', valueType: 'text', rules: [{ required: true, message: '请输入电话' }] },
      { prop: 'email', label: '邮箱', valueType: 'text' },
    ],
  },
  {
    name: 'confirm',
    title: '确认信息',
    columns: [
      { prop: 'remark', label: '备注', valueType: 'textarea', formSpan: 24 },
    ],
  },
]

// 返回 true → 回到第 0 步并重置各步表单（源码同款约定）
async function onFinish(values: Record<string, any>) {
  const ok = await ElMessageBox.confirm(
    `即将创建项目「${values.name}」，确认提交？`,
    '确认',
  ).then(() => true).catch(() => false)
  if (ok) ElMessage.success('创建成功')
  return ok
}
</script>

<template>
  <ElProStepsForm :steps="steps" :on-finish="onFinish" :form-props="{ span: 8, labelWidth: '90px' }" />
</template>
