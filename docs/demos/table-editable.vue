<script setup lang="ts">
// 行内编辑：单元格控件由 valueType 决定，保存失败留在编辑态
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ElProEditableTable } from 'el-pro-components'
import type { ProColumn } from 'el-pro-components'
import { ROLE_ENUM } from '../../demo/data/enums'
import { ALL, delay } from '../../demo/data/mock'

const columns: ProColumn[] = [
  { prop: 'name', label: '姓名', valueType: 'text', rules: [{ required: true, message: '姓名必填' }] },
  { prop: 'role', label: '角色', valueType: 'select', valueEnum: ROLE_ENUM },
  { prop: 'amount', label: '金额', valueType: 'money' },
  { prop: 'createdAt', label: '创建时间', valueType: 'date', editable: false },
  { prop: 'actions', label: '操作', valueType: 'option', width: 150, fixed: 'right' },
]

// 可写数据源：新增/保存都落在它上面
const source = ref(ALL.slice(0, 6).map((u) => ({ ...u })))

const request = async (params: any) => {
  await delay(300)
  const start = (params.current - 1) * params.pageSize
  return { data: source.value.slice(start, start + params.pageSize), total: source.value.length }
}

async function onSave(key: string | number, row: any) {
  await delay(200)
  if (!String(row.name ?? '').trim()) {
    ElMessage.error('姓名不能为空')
    return false
  }
  const target = source.value.find((u) => u.id === key)
  if (target) {
    Object.assign(target, row)
    ElMessage.success(`已保存：${row.name}`)
    return true
  }
  // 新增行：key 还是临时 key，补一条并回传主键，这一行从此有真 id
  const id = Math.max(0, ...source.value.map((u) => Number(u.id) || 0)) + 1
  source.value = [{ ...row, id }, ...source.value]
  ElMessage.success(`已新增：${row.name}`)
  return { id }
}

async function onDelete(key: string | number) {
  source.value = source.value.filter((u) => u.id !== key)
  ElMessage.success('已删除该行')
  return true
}
</script>

<template>
  <ElProEditableTable
    :columns="columns"
    :request="request"
    row-key="id"
    :editable="{ type: 'single', onSave, onDelete }"
  />
  <p class="demo-hint">
    点「编辑」进入行内编辑；单行模式下切换行会先保存当前行。每次点「新增一行」都会追加一行编辑态。
  </p>
</template>
