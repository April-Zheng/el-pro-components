<script setup lang="ts">
// 表单分组：valueType: 'group'，子字段写在 columns 里，支持折叠与嵌套
import { reactive } from 'vue'
import { ElProForm } from 'el-pro-components'
import type { ProColumn } from 'el-pro-components'

const columns: ProColumn[] = [
  {
    valueType: 'group',
    label: '基本信息',
    columns: [
      { prop: 'name', label: '项目名称', valueType: 'text' },
      { prop: 'owner', label: '负责人', valueType: 'text' },
    ],
  },
  {
    valueType: 'group',
    label: '高级设置',
    groupProps: { collapsible: true, defaultCollapsed: true, tooltip: '默认折叠，点标题展开' },
    columns: [
      { prop: 'notifyType', label: '通知方式', valueType: 'select', valueEnum: { email: { text: '邮件' }, sms: { text: '短信' } } },
      {
        // 嵌套分组
        valueType: 'group',
        label: '通知规则',
        columns: [
          { prop: 'threshold', label: '触发阈值', valueType: 'number' },
          { prop: 'quietHours', label: '免打扰时段', valueType: 'text' },
        ],
      },
    ],
  },
]

const model = reactive<Record<string, any>>({})
</script>

<template>
  <ElProForm :columns="columns" :model="model" label-width="90px" />
</template>
