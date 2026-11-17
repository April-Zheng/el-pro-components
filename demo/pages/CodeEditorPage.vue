<script setup lang="ts">
/**
 * ElProCodeEditor（Monaco）示例：独立使用 + ProForm 字段。
 *
 * Worker 注册在 demo/main.ts 里调 setupMonacoWorkers —— 与真实项目的接入方式一致。
 */
import { ref } from 'vue'
import { ElButton } from 'element-plus'
import { ElProCard, ElProCodeEditor, ElProForm } from '@/index'
import type { ProColumn } from '@/index'

const jsonCode = ref(`{
  "name": "el-pro-components",
  "version": "0.2.0",
  "keywords": ["element-plus", "pro-components"]
}`)
const scriptCode = ref('function audit(row) {\n  return row.status !== "closed"\n}')

const formColumns: ProColumn[] = [
  {
    prop: 'script',
    label: '校验脚本',
    valueType: 'codeEditor',
    fieldProps: { language: 'javascript', height: 200, theme: 'vs-dark' },
  },
]
const model = ref({ script: 'return ctx.total > 0' })
</script>

<template>
  <ElProCard title="独立使用（JSON + 暗色主题）">
    <ElProCodeEditor v-model="jsonCode" language="json" theme="vs-dark" :height="220" />
    <div style="margin-top: 12px">
      <ElButton size="small" @click="jsonCode = jsonCode === '{\n}' ? jsonCode : '{\n}'">改值看防循环</ElButton>
    </div>
  </ElProCard>

  <ElProCard title="独立使用（JavaScript + 暗色主题）" style="margin-top: 16px">
    <ElProCodeEditor v-model="scriptCode" language="javascript" theme="vs-dark" :height="220" :options="{ minimap: { enabled: false } }" />
  </ElProCard>

  <ElProCard title="ProForm 字段（valueType: 'codeEditor'）" style="margin-top: 16px">
    <p class="demo-section-desc">
      列里 valueType: 'codeEditor' 直接当表单字段用，fieldProps 透传 language / height / theme / options；
      表单 readonly 时退化为只读代码块展示。注意：Monaco 的 theme 是全局状态，
      同页多个编辑器共享最后一次设置的主题。
    </p>
    <ElProForm :model="model" :columns="formColumns" :span="24" :show-actions="false" />
  </ElProCard>
</template>
