<script setup lang="ts">
/**
 * 轻量筛选示例：行内紧凑字段，没有传统 label 列。
 *
 * 行为（对齐源码 LightFilter）：
 * - `secondary: true` 的字段收进「更多筛选」弹层，点「确认」才生效并触发一次 search
 * - 弹层里的「重置」把这些字段恢复到 initialValues
 * - 其余字段**每改一下就发一次 search**（源码 onValuesChange → form.submit）
 */
import { reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { ElProLightFilter } from '@/index'
import type { ProColumn } from '@/index'
import { ROLE_ENUM, STATUS_ENUM } from '../data/enums'

const columns: ProColumn[] = [
  { prop: 'name', label: '名称', valueType: 'text' },
  { prop: 'role', label: '角色', valueType: 'select', valueEnum: ROLE_ENUM },
  { prop: 'status', label: '状态', valueType: 'select', valueEnum: STATUS_ENUM, secondary: true },
  { prop: 'createdAt', label: '创建时间', valueType: 'dateRange', secondary: true },
]

const filterModel = reactive<Record<string, any>>({
  name: '',
  role: undefined,
  status: undefined,
  createdAt: undefined,
})

function onSearch(values: Record<string, any>) {
  ElMessage.success(`search：${JSON.stringify(values)}`)
  console.log('[LightFilter search]', values)
}
</script>

<template>
  <div class="demo-card">
    <h3 class="demo-section-title">ElProLightFilter</h3>
    <p class="demo-section-desc">
      改名称/角色会立即触发 <code>search</code>；状态和创建时间收在「更多筛选」里，点「确认」才生效。
    </p>

    <ElProLightFilter :columns="columns" :model="filterModel" @search="onSearch" />
  </div>

  <div class="demo-card">
    <h3 class="demo-section-title">collapse 模式</h3>
    <p class="demo-section-desc">
      <code>collapse</code> 为 true 时所有字段都进弹层，触发器变成筛选图标。
    </p>

    <ElProLightFilter
      :columns="columns"
      collapse
      :initial-values="{ role: 'admin' }"
      @search="onSearch"
    />
  </div>
</template>
