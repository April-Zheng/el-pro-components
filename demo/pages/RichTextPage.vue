<script setup lang="ts">
/** ElProRichText（Quill 富文本）示例：独立使用 + ProForm 字段 + 图片上传注入 */
import { ref } from 'vue'
import { ElButton } from 'element-plus'
import { ElProCard, ElProForm, ElProRichText } from '@/index'
import type { ProColumn } from '@/index'

const content = ref('<p>初始内容，<strong>加粗</strong> 试试。</p>')

const formModel = ref({ notice: '<p>公告内容</p>' })
const formColumns: ProColumn[] = [
  {
    prop: 'notice',
    label: '公告',
    valueType: 'richText',
    fieldProps: { height: 200 },
  },
]

/** 图片上传注入：真实项目接自己的对象存储；resolve 图片 URL */
async function uploadImage(file: File): Promise<string> {
  // demo：base64 内嵌（不传 imageUpload 时的默认行为），这里模拟异步
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(file)
  })
}

const standalone = ref('<p>上传一张图片试试（工具栏图片按钮 / 直接粘贴 / 拖拽）。</p>')
</script>

<template>
  <ElProCard title="独立使用（默认工具栏 + 图片上传注入）">
    <p class="demo-section-desc">
      图片走「工具栏图片按钮 / 直接粘贴 / 拖拽」三条入口统一上传；链接按钮需要**先选中文字**再点
      （Quill snow 主题的设计，无选区时静默——参考实现同样如此）。
    </p>
    <ElProRichText v-model="standalone" :height="240" :image-upload="uploadImage" />
    <div style="margin-top: 12px">
      <ElButton size="small" @click="standalone = '<p>重置</p>'">外部改值</ElButton>
    </div>
  </ElProCard>

  <ElProCard title="ProForm 字段（valueType: 'richText'）" style="margin-top: 16px">
    <p class="demo-section-desc">
      列里 valueType: 'richText' 直接当表单字段用；只读展示按 HTML 渲染。
    </p>
    <ElProForm :model="formModel" :columns="formColumns" :span="24" :show-actions="false" />
    <p class="demo-section-desc">当前值：{{ formModel.notice }}</p>
  </ElProCard>

  <ElProCard title="受控内容（v-model 值）" style="margin-top: 16px">
    <div class="el-pro-rich-text__readonly" style="min-height: 40px" v-html="content" />
  </ElProCard>

  <ElProCard title="禁用态（可读不可编辑）" style="margin-top: 16px">
    <p class="demo-section-desc">
      预期：粘贴 / 拖拽图片不会被上传插入，内容不变（禁用态下图片管道被拦截，
      不会绕过 readOnly 改内容）。
    </p>
    <ElProRichText v-model="content" :height="160" disabled :image-upload="uploadImage" />
  </ElProCard>
</template>
