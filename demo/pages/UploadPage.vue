<script setup lang="ts">
/** Upload 字段（valueType: 'upload'）示例：编辑控件 + 只读墙/链接 + 零配置 base64 回落 */
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ElProDescriptions, ElProForm, ElProTable } from '@/index'
import type { ProColumn } from '@/index'

/**
 * 真实项目把 customRequest 注入 fieldProps；签名与 ElProRichText.imageUpload 同构：
 * Promise 的返回值就是写进 model 的 URL 字符串。这里模拟对象存储：图片返回一个占位 data URL。
 */
async function fakeUpload(file: File): Promise<string> {
  await new Promise((r) => setTimeout(r, 400)) // 模拟网络
  if (file.type.startsWith('image/')) {
    const reader = new FileReader()
    return new Promise((resolve) => {
      reader.onload = () => resolve(String(reader.result))
      reader.readAsDataURL(file)
    })
  }
  return `https://example.invalid/store/${encodeURIComponent(file.name)}`
}

const formModel = reactive<Record<string, any>>({
  avatar: ['https://element-plus.org/images/element-plus-logo.svg'],
  attachments: [
    'https://example.invalid/doc/方案-最终-v3.pdf',
    'https://example.invalid/zip/source.zip',
  ],
})

const formColumns: ProColumn[] = [
  {
    prop: 'avatar',
    label: '头像 / 封面',
    valueType: 'upload',
    formSpan: 24,
    fieldProps: {
      listType: 'picture-card',
      multiple: false,
      limit: 1,
      // customRequest: fakeUpload,
    },
  },
  {
    prop: 'attachments',
    label: '附件',
    valueType: 'upload',
    formSpan: 24,
    fieldProps: { listType: 'text', multiple: true, customRequest: fakeUpload },
  },
  {
    prop: 'base64',
    label: '零配置回落（不传 customRequest）',
    valueType: 'upload',
    formSpan: 24,
    fieldProps: { listType: 'picture-card', multiple: true },
  },
]

const base64Model = reactive<Record<string, any>>({
  base64: ['https://element-plus.org/images/element-plus-logo.svg'],
})

function onUploadChange() {
  ElMessage.success('字段值已更新（可在下方表格里看到只读墙）')
}

const rows = [
  { id: 1, avatar: 'https://element-plus.org/images/element-plus-logo.svg', name: 'Element Plus' },
  { id: 2, files: 'https://example.invalid/doc/合同.pdf', name: '合同扫描件' },
]

const tableColumns: ProColumn[] = [
  { prop: 'id', label: 'ID', width: 60 },
  { prop: 'avatar', label: '封面（图片墙）', valueType: 'upload', width: 160 },
  { prop: 'files', label: '非图片附件（链接）', valueType: 'upload', minWidth: 220 },
  { prop: 'name', label: '名称' },
]

const descData = reactive({
  avatar: ['https://element-plus.org/images/element-plus-logo.svg'],
  doc: 'https://example.invalid/doc/说明书.pdf',
  empty: [] as string[],
})
const descColumns: ProColumn[] = [
  { prop: 'avatar', label: '封面', valueType: 'upload' },
  { prop: 'doc', label: '文档', valueType: 'upload' },
  { prop: 'empty', label: '空值', valueType: 'upload' },
]
</script>

<template>
  <div class="demo-card">
    <h3 class="demo-section-title">ElProForm · valueType: 'upload'</h3>
    <p class="demo-section-desc">
      编辑态是 <code>el-upload</code>。<code>fieldProps.customRequest(file) → Promise&lt;string&gt;</code>
      的返回值写进 model（与富文本 imageUpload 同构）；不传时回落为 base64 内嵌。
      <code>listType / multiple / limit / accept / disabled</code> 等直接透传 el-upload。
      点右上角手动删除按钮会从数组里移除该项。
    </p>

    <ElProForm
      :columns="formColumns"
      :model="formModel"
      :span="8"
      label-width="110px"
      :show-actions="false"
      @change="onUploadChange"
    />
    <p class="demo-section-desc">当前值：{{ formModel }}</p>
  </div>

  <div class="demo-card">
    <h3 class="demo-section-title">零配置回落演示</h3>
    <p class="demo-section-desc">这一列没配 customRequest，图片上传后直接以 data URL 存入 model。</p>
    <ElProForm
      :columns="formColumns.slice(2)"
      :model="base64Model"
      :span="8"
      label-width="180px"
      :show-actions="false"
    />
  </div>

  <div class="demo-card">
    <h3 class="demo-section-title">ElProTable · 只读态</h3>
    <p class="demo-section-desc">
      只读按 URL 判定：图片显示缩略图墙（点击可预览大图），非图片显示链接；空值显示 <code>-</code>。
    </p>
    <ElProTable :columns="tableColumns" :data-source="rows" :pagination="false" :search="false" />
  </div>

  <div class="demo-card">
    <h3 class="demo-section-title">ElProDescriptions · 只读态 + 空值</h3>
    <ElProDescriptions :columns="descColumns" :data="descData" :column="3" />
  </div>
</template>
