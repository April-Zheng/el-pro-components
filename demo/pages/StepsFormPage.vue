<script setup lang="ts">
/**
 * 分步表单示例：steps 数组每项一步，columns 每步一份。
 *
 * 值得注意的行为（都对齐源码）：
 * - 「下一步」触发当前步校验，不通过不跳步
 * - 只有最后一步的提交会进 onFinish；返回 true 时回到第 0 步并清空各步
 * - allowStepSelect：步骤条可以点，直接跳（不校验）
 */
import { reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ElProStepsForm } from '@/index'
import type { ProColumn, ProStepsFormItem } from '@/index'
import { ROLE_ENUM } from '../data/enums'

const step1Columns: ProColumn[] = [
  {
    prop: 'name',
    label: '项目名称',
    valueType: 'text',
    rules: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
  },
  { prop: 'owner', label: '负责人', valueType: 'select', valueEnum: ROLE_ENUM },
]

const step2Columns: ProColumn[] = [
  { prop: 'email', label: '邮箱', valueType: 'text' },
  { prop: 'phone', label: '电话', valueType: 'text' },
]

const step3Columns: ProColumn[] = [
  { prop: 'budget', label: '预算', valueType: 'money', fieldProps: { min: 0 } },
  { prop: 'startDate', label: '开始日期', valueType: 'date' },
  { prop: 'desc', label: '备注', valueType: 'textarea', formSpan: 24 },
]

const steps: ProStepsFormItem[] = [
  { name: 'base', title: '基本信息', description: '项目名与负责人', columns: step1Columns },
  { name: 'contact', title: '联系方式', columns: step2Columns },
  { name: 'confirm', title: '确认信息', columns: step3Columns },
]

const stepsModel = reactive<Record<string, any>>({
  name: '',
  owner: 'admin',
  email: '',
  phone: '',
  budget: 0,
  startDate: '',
  desc: '',
})

// 每步用同一份 model（也可以不传，组件内部按步各建一份，最后 getAllFieldsValue 合并取）
steps.forEach((s) => (s.model = stepsModel))

async function onFinish(values: Record<string, any>) {
  console.log('[StepsForm onFinish]', values)
  try {
    await ElMessageBox.confirm('提交后表单会重置回第一步，确认吗？')
    return true
  } catch {
    return false
  }
}
</script>

<template>
  <div class="demo-card">
    <h3 class="demo-section-title">ElProStepsForm</h3>
    <p class="demo-section-desc">
      底部按钮按步切换：第 0 步「下一步」、中间「上一步/下一步」、最后「上一步/提交」。
      「下一步」会先校验当前步（试试项目名留空直接点下一步）。
    </p>

    <ElProStepsForm :steps="steps" :on-finish="onFinish" :form-props="{ span: 8, labelWidth: '90px' }" />
  </div>

  <div class="demo-hint">
    真实业务里 onFinish 通常接创建接口：返回 true 表示成功，组件自动回到第一步并清空；
    返回 false / undefined 停在最后一步（比如接口报错时让用户改一改再提）。
  </div>
</template>
