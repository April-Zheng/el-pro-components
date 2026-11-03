<script setup lang="ts">
/**
 * 行内编辑示例。
 * 保存/删除的语义都写在回调里：返回 false 或抛错就留在编辑态。
 */
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ElProEditableTable } from '@/index'
import type { ProColumn, ProRequest } from '@/index'
import { ROLE_ENUM } from '../data/enums'
import { ALL, delay } from '../data/mock'

const editableColumns: ProColumn[] = [
  { prop: 'name', label: '姓名', valueType: 'text', rules: [{ required: true, message: '姓名必填' }] },
  { prop: 'role', label: '角色', valueType: 'select', valueEnum: ROLE_ENUM },
  { prop: 'amount', label: '金额', valueType: 'money' },
  { prop: 'createdAt', label: '创建时间', valueType: 'date', editable: false },
  { prop: 'actions', label: '操作', valueType: 'option', width: 160, fixed: 'right' },
]

/** 这是一份可写的数据源：新增/保存/删除都落在它上面，刷新后能看见 */
const editableSource = ref(ALL.slice(0, 6).map((u) => ({ ...u })))

const requestEditable: ProRequest = async (params) => {
  await delay(300)
  const start = (params.current - 1) * params.pageSize
  return {
    data: editableSource.value.slice(start, start + params.pageSize),
    total: editableSource.value.length,
  }
}

async function onEditableSave(key: string | number, row: any) {
  await delay(200)
  if (!String(row.name ?? '').trim()) {
    ElMessage.error('姓名不能为空')
    return false
  }
  const target = editableSource.value.find((u) => u.id === key)
  if (target) {
    Object.assign(target, row)
    ElMessage.success(`已保存：${row.name}`)
    return true
  }
  // 新增行：key 还是临时 key，说明后端还没这个记录，这里补一条并回传主键
  const id = Math.max(0, ...editableSource.value.map((u) => Number(u.id) || 0)) + 1
  const created = { ...row, id }
  editableSource.value = [created, ...editableSource.value]
  ElMessage.success(`已新增：${row.name}`)
  return created
}

async function onEditableDelete(key: string | number) {
  editableSource.value = editableSource.value.filter((u) => u.id !== key)
  ElMessage.success('已删除该行')
  return true
}
</script>

<template>
  <ElProEditableTable
    :columns="editableColumns"
    :request="requestEditable"
    row-key="id"
    :editable="{ type: 'single', onSave: onEditableSave, onDelete: onEditableDelete }"
  />

  <div class="demo-hint">
    点「编辑」进入行内编辑，控件由 valueType 决定（钱是数字框、角色是下拉）。
    单行模式下切换行会先保存当前行；保存返回 false 或抛错会留在编辑态，不会丢输入。
    <br />
    「创建时间」列标了 <code>editable: false</code>，所以那一格不变成输入框。
  </div>
</template>
