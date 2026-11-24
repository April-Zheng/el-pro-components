<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ElButton } from 'element-plus'
import { ElProSchemaForm } from '@/index'
import type { ProColumn, ProSchemaFormLayout } from '@/index'

/** 一份 columns 六种容器复用：divider 列也展示（form/steps 下渲染分隔线，筛选下忽略）。
 *  字段密度跟随容器宽：窄容器（modal/drawer）一行两列，宽容器（form/steps/筛选）一行三列，
 *  否则 560/480px 容器减去 100px label 后控件区只剩几十像素，观感与可用性都差。 */
const baseColumns: ProColumn[] = [
  { prop: 'name', label: '名称', valueType: 'text', formSpan: 8 },
  { prop: 'status', label: '状态', valueType: 'select', formSpan: 8, valueEnum: { 1: '启用', 2: '停用' } as any },
  { prop: 'createdAt', label: '创建时间', valueType: 'dateTime', formSpan: 8 },
  { prop: 'divider', label: '基本信息', valueType: 'divider' },
  { prop: 'remark', label: '备注', valueType: 'textarea', formSpan: 24 },
]

const columns = computed<ProColumn[]>(() => {
  const narrow = layout.value === 'modal' || layout.value === 'drawer'
  return baseColumns.map((col) => (col.formSpan === 8 ? { ...col, formSpan: narrow ? 12 : 8 } : col))
})

const layouts: ProSchemaFormLayout[] = ['form', 'modal', 'drawer', 'steps', 'queryFilter', 'lightFilter']
const layout = ref<ProSchemaFormLayout>('form')
const open = ref(false)
const model = reactive<Record<string, any>>({})

function nextLayout() {
  const i = layouts.indexOf(layout.value)
  layout.value = layouts[(i + 1) % layouts.length]
  if (layout.value !== 'modal' && layout.value !== 'drawer') open.value = false
}
function openOverlay() {
  open.value = true
}
</script>

<template>
  <div class="demo-card">
    <h3 class="demo-section-title">ElProSchemaForm：一个 columns，六种容器切换</h3>
    <p class="demo-section-desc">
      columns 直通：valueType / valueEnum / divider / formSpan 等全部沿用既有列驱动管线；
      layoutType 只负责选容器（form → modal → drawer → steps → queryFilter → lightFilter）。
      steps 时 columns 传二维（每步一维）。当前：<b>{{ layout }}</b>
    </p>
    <div style="margin-bottom: 12px">
      <ElButton type="primary" plain size="small" @click="nextLayout">
        切换到下一个布局
      </ElButton>
      <ElButton v-if="layout === 'modal' || layout === 'drawer'" size="small" @click="openOverlay">
        打开{{ layout === 'modal' ? '弹窗' : '抽屉' }}
      </ElButton>
    </div>
    <ElProSchemaForm
      :columns="layout === 'steps' ? [columns, columns.slice(3)] : columns"
      :layout-type="layout"
      :model="model"
      :open="open"
      title="Schema 表单示例"
      @update:open="(v: boolean) => (open = v)"
    />
  </div>
</template>
