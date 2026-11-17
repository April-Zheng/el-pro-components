<script setup lang="ts">
/**
 * ProConfigProvider 全局配置层演示。
 *
 * 三件事：① valueTypeMap 全局自定义 valueType（读态 render / 编辑态 formRender），
 * 跨表复用时不用每个使用方逐列注册；② labels 内置文案可配（折叠按钮 title 等）；
 * ③ tableSize / formSize 全局尺寸默认，列/表 prop 显式传时以 prop 为准。
 */
import { h, ref } from 'vue'
import { ElProConfigProvider, ElProForm, ElProLayout, ElProTable } from '@/index'
import type { ProColumn } from '@/index'

/** 全局自定义 valueType：本 demo 演示「积分徽章」读态 + 「滑杆倍数」编辑态 */
const valueTypeMap = {
  score: {
    render: ({ value }: any) =>
      h('span', { style: 'display:inline-flex;align-items:center;gap:4px' }, [
        h('i', { style: 'width:8px;height:8px;border-radius:4px;background:var(--el-color-primary)' }),
        h('b', {}, `${value} 分`),
      ]),
  },
  temperature: {
    formRender: ({ modelValue, update }: any) =>
      h('input', {
        value: modelValue ?? '',
        style: 'width:100%;height:32px;padding:0 10px;border:1px solid var(--el-border-color);border-radius:4px;box-sizing:border-box',
        onInput: (e: Event) => update(Number((e.target as HTMLInputElement).value) || 0),
      }),
  },
}

const labels = { layoutExpand: '打开侧栏', layoutCollapse: '收起侧栏' }

/** 表格列直接用全局注册的自定义 valueType */
const columns: ProColumn[] = [
  { prop: 'name', label: '名称' },
  { prop: 'score', label: '积分', valueType: 'score' as any },
  { prop: 'region', label: '地域', valueType: 'tag' as any },
]

const rows = ref([
  { id: 1, name: '张三', score: 88, region: '华东' },
  { id: 2, name: '李四', score: 72, region: '华南' },
])

const formColumns: ProColumn[] = [
  { prop: 'name', label: '名称', valueType: 'text' },
  { prop: 'temperature', label: '温度阈值', valueType: 'temperature' as any },
]

const model = ref({ name: '', temperature: 30 })

const menus = [
  { title: '配置示例', path: '/provider' },
  { title: '全局表格', path: '/provider-table' },
]
</script>

<template>
  <ElProConfigProvider :value-type-map="valueTypeMap" :labels="labels" table-size="small" form-size="small">
    <div class="demo-card">
      <h3 class="demo-section-title">valueTypeMap：全局自定义 valueType</h3>
      <p class="demo-section-desc">
        「积分」列没在任何表里单独注册，读态 render 由 Provider 下发；表格单元格直接命中。
        同一套 valueTypeMap 在所有 ProTable / ProDescriptions / ProForm 里生效。
      </p>
      <ElProTable :columns="columns" :data-source="rows" :pagination="false" :search="false" :options="false" />
    </div>

    <div class="demo-card" style="margin-top: 16px">
      <h3 class="demo-section-title">labels：内置文案可配 + formSize 全局默认</h3>
      <p class="demo-section-desc">
        布局折叠按钮 title 已换成「收起侧栏 / 打开侧栏」；表单没有传 size，
        消费 Provider 的 form-size="small"（对照：列级显式传时以 prop 为准）。
      </p>
      <div style="height: 320px; overflow: hidden; border: 1px solid var(--el-border-color-lighter); border-radius: 6px">
        <ElProLayout :menus="menus" active-path="/provider" :router="false" title="配置示例" style="min-height: 100%">
          <ElProForm :model="model" :columns="formColumns" :span="12" :show-actions="false" />
        </ElProLayout>
      </div>
    </div>
  </ElProConfigProvider>
</template>
