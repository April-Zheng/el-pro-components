<script setup lang="ts">
/** 表单示例：一个 columns 数组生成整张表单 */
import { reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { ElProForm } from '@/index'
import type { ProColumn } from '@/index'
import { ROLE_ENUM } from '../data/enums'

const formColumns: ProColumn[] = [
  {
    prop: 'name',
    label: '项目名称',
    valueType: 'text',
    rules: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
  },
  { prop: 'owner', label: '负责人', valueType: 'select', valueEnum: ROLE_ENUM },
  {
    prop: 'level',
    label: '优先级',
    valueType: 'radioButton',
    valueEnum: { high: '高', mid: '中', low: '低' },
  },
  {
    prop: 'tags',
    label: '标签',
    valueType: 'checkbox',
    valueEnum: { front: '前端', back: '后端', ops: '运维' },
  },
  {
    prop: 'billingType',
    label: '计费方式',
    valueType: 'radioButton',
    valueEnum: { fixed: '固定价', custom: '按量' },
  },
  {
    prop: 'customRate',
    label: '按量单价',
    valueType: 'money',
    rules: [{ required: true, message: '请输入按量单价', trigger: 'blur' }],
    // 只有按量计费才需要填单价
    dependency: {
      dependsOn: ['billingType'],
      visible: (values) => values.billingType === 'custom',
    },
  },
  {
    prop: 'budget',
    label: '预算',
    valueType: 'money',
    fieldProps: { min: 0, step: 1000 },
    // 同一列在不同计费方式下换标题、换可编辑性
    dependency: {
      dependsOn: ['billingType'],
      resolve: (values) =>
        values.billingType === 'custom'
          ? { label: '预算封顶', readonly: true }
          : { label: '预算（固定价）' },
    },
  },
  { prop: 'seatRange', label: '人数区间', valueType: 'digitRange' },
  { prop: 'sla', label: '响应时限', valueType: 'second', fieldProps: { step: 60 } },
  {
    prop: 'ratio',
    label: '完成比例',
    valueType: 'slider',
    formSpan: 24,
    fieldProps: { max: 100, showInput: true },
  },
  { prop: 'startDate', label: '开始日期', valueType: 'date' },
  { prop: 'period', label: '周期', valueType: 'dateRange' },
  {
    prop: 'notify',
    label: '通知方式',
    valueType: 'segmented',
    valueEnum: { mail: '邮件', sms: '短信', none: '不通知' },
  },
  { prop: 'theme', label: '主题色', valueType: 'color' },
  { prop: 'enabled', label: '启用', valueType: 'switch' },
  { valueType: 'divider', label: '补充信息' },
  { prop: 'desc', label: '描述', valueType: 'textarea', formSpan: 24 },
  { prop: 'expire', label: '过期时间', valueType: 'dateTime' },
]

const formModel = reactive<Record<string, any>>({
  name: 'Element Plus Pro',
  owner: 'editor',
  level: 'mid',
  tags: ['front'],
  billingType: 'fixed',
  budget: 20000,
  seatRange: [10, 50],
  sla: 7200,
  ratio: 65,
  startDate: '2026-11-02',
  period: ['2026-11-01', '2026-11-30'],
  notify: 'mail',
  theme: '#409eff',
  enabled: true,
  desc: '',
  expire: '',
})

function onSubmit(model: Record<string, any>) {
  ElMessage.success(`表单校验通过，共 ${Object.keys(model).length} 个字段`)
  console.log('[ElProForm submit]', JSON.parse(JSON.stringify(model)))
}
</script>

<template>
  <div class="demo-card">
    <h3 class="demo-section-title">ElProForm</h3>
    <p class="demo-section-desc">
      一个 columns 数组生成整张表单。valueType 决定控件，rules 决定校验，formSpan 控制栅格。
    </p>

    <ElProForm :columns="formColumns" :model="formModel" :span="8" label-width="90px" @submit="onSubmit" />
  </div>
</template>
