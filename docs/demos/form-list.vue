<script setup lang="ts">
// 字段组 formList：一列变成「可增删的对象数组」
import { reactive } from 'vue'
import { ElProForm } from 'el-pro-components'
import type { ProColumn } from 'el-pro-components'

const columns: ProColumn[] = [
  { prop: 'project', label: '所属项目', valueType: 'text' },
  {
    prop: 'contacts',
    label: '联系人',
    valueType: 'formList',
    formSpan: 24,
    // 组自己也要校验时，必须写 type: 'array'，否则 async-validator 不会按键长判空
    rules: [{ required: true, type: 'array', message: '至少需要一位联系人' }],
    children: [
      { prop: 'name', label: '姓名', valueType: 'text', formSpan: 8, rules: [{ required: true, message: '请输入姓名' }] },
      { prop: 'phone', label: '电话', valueType: 'text', formSpan: 8 },
    ],
    formListProps: { min: 1, max: 3, copyable: true, addText: '添加联系人' },
  },
]

const model = reactive<Record<string, any>>({
  contacts: [{ name: '李明轩', phone: '13800000000' }],
})
</script>

<template>
  <ElProForm :columns="columns" :model="model" :span="8" label-width="90px" />
</template>
