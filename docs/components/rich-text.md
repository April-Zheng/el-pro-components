# ElProRichText

所见即所得富文本编辑器（Quill 2 封装，snow 主题）：加粗/标题/列表/图片/链接等一整套工具栏，支持 v-model、禁用、图片上传注入，并可作 ProForm 字段（`valueType: 'richText'`）。

**何时使用**

- 公告、备注、工单说明这类需要排版的内容输入
- 编辑大段富文本（对照：编辑代码请用 [ElProCodeEditor](/components/code-editor)，只展示代码用 `valueType: 'code'`）

## 安装（可选依赖）

`quill` 是**可选 peer 依赖**：不用富文本的项目不安装它（约 4MB）；要用时安装：

```bash
npm i quill
```

编辑器样式**不在** `el-pro-components/style.css` 里（它约占主样式表 1/3 gzip，不用富文本的项目没必要下载）。用富文本时额外引一次：

```ts
import 'el-pro-components/style.css'
import 'el-pro-components/richtext.css' // 富文本主题样式（Quill snow），0.4.0 起独立出口
```

不装 quill 也不影响其它组件，只是富文本组件起不来。没装就渲染 `ElProRichText` 不会静默失败：编辑器区会显示初始化失败提示，控制台打出 `[ElProRichText] Quill 初始化失败`。

## 基本用法

```vue
<script setup>
import { ref } from 'vue'
import { ElProRichText } from 'el-pro-components'

const content = ref('<p>初始内容</p>')
</script>

<template>
  <ElProRichText v-model="content" :height="300" />
</template>
```

## 图片上传

图片走「工具栏图片按钮 / 直接粘贴 / 拖拽」三条入口，统一进同一条上传管道：

```ts
// 使用方注入上传逻辑，resolve 图片 URL 插入编辑器
async function uploadImage(file: File) {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch('/api/upload', { method: 'POST', body: fd })
  const data = await res.json()
  return data.url
}
```

```vue
<ElProRichText v-model="content" :image-upload="uploadImage" />
```

- **不传 `imageUpload`**：回落 base64 内嵌——零配置可用，代价是内容体积变大；
- 上传期间编辑器显示遮罩（「图片上传中…」），完成后自动插入并移动选区；
- 非图片的粘贴/拖拽内容放行原生行为；
- 上传失败发 `@upload-error`，可监听后用 `ElMessage.error` 提示。

::: tip 链接按钮的使用方式
「链接」按钮需要**先选中一段文字**再点击，会弹出 URL 编辑条（Quill snow 主题的设计：无选区时点击静默）。选中后点击、输入 URL、回车或点 Save 完成添加。
:::

## ProForm 字段

```ts
const columns = [
  {
    prop: 'notice',
    label: '公告',
    valueType: 'richText',
    fieldProps: { height: 200, imageUpload: uploadImage },
  },
]
```

- 表单级/列级 `readonly`：与其他字段一致走只读展示——富文本按 HTML 直接渲染；
- 需要「可见不可编辑」时用 `fieldProps: { disabled: true }`。

## API

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| modelValue | 编辑器内容（HTML），配 `v-model` | `string` | `''` |
| placeholder | 占位文字 | `string` | `'请输入'` |
| disabled | 禁用编辑（可读不可编辑） | `boolean` | `false` |
| height | 编辑区最小高度（px） | `number` | `300` |
| toolbar | 工具栏配置（Quill toolbar container 结构），默认对齐 pro-components 一整套；增删项（如 video）时传自定义数组 | `unknown[][]` | — |
| imageUpload | 图片上传，resolve 图片 URL；不传回落 base64 | `(file: File) => Promise<string>` | — |

### 事件

| 事件 | 说明 | 回调参数 |
| --- | --- | --- |
| update:modelValue | 内容变化，配 `v-model` | `(html: string)` |
| change | 内容变化（只需监听时用） | `(html: string)` |
| focus / blur | 编辑器聚焦 / 失焦 | — |

### 实例方法

| 方法 | 说明 |
| --- | --- |
| getQuill() | Quill 实例（可调 quill 全部 API） |
| insertText(text) | 在光标处插入文本并移动选区 |
