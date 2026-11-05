<script setup lang="ts">
// 字段联动：显隐与配置跟着 dependsOn 的字段变
import { reactive } from 'vue'
import { ElProForm } from 'el-pro-components'
import type { ProColumn } from 'el-pro-components'

const columns: ProColumn[] = [
  {
    prop: 'billingType',
    label: '计费方式',
    valueType: 'select',
    valueEnum: { fixed: { text: '固定价' }, custom: { text: '按量计费' } },
    rules: [{ required: true, message: '请选择计费方式' }],
  },
  {
    prop: 'budget',
    label: '预算',
    valueType: 'money',
    dependency: {
      dependsOn: ['billingType'],
      resolve: (values: any) =>
        values.billingType === 'custom'
          ? { label: '预算封顶', readonly: true }
          : { label: '预算（固定价）', readonly: false },
    },
  },
  {
    prop: 'customRate',
    label: '按量单价',
    valueType: 'money',
    rules: [{ required: true, message: '请输入按量单价' }],
    dependency: {
      dependsOn: ['billingType'],
      visible: (values: any) => values.billingType === 'custom',
    },
  },
]

const model = reactive<Record<string, any>>({})
</script>

<template>
  <ElProForm :columns="columns" :model="model" :span="8" label-width="90px" />
  <p class="demo-hint">
    选「按量计费」才出现按量单价；预算的标题和可编辑状态跟着计费方式变。隐藏 = 不渲染，也不参与校验。
  </p>
</template>
