# ElProCodeEditor

Monaco 代码编辑器封装（VS Code 同款内核）：语法高亮、智能补全、错误标注、格式化。支持 v-model、只读、options 透传，并可作 ProForm 字段（`valueType: 'codeEditor'`）。

**何时使用**

- 表单里编辑 JSON 配置、脚本片段、模板代码
- 需要语法高亮与补全的大段代码输入（对照：只展示代码请用 `valueType: 'code'`）

## 安装（可选依赖）

`monaco-editor` 是**可选 peer 依赖**：不用代码编辑器的项目零负担；要用时安装：

```bash
npm i monaco-editor
```

## Worker 注册（一次性）

Monaco 的语言 worker 要用 Vite 的 `?worker` 导入构建，只能在**使用方的构建链**里发生。在应用入口（如 `main.ts`）注册一次：

```ts
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import { setupMonacoWorkers } from 'el-pro-components'

setupMonacoWorkers({
  json: () => new jsonWorker(),
  css: () => new cssWorker(),
  html: () => new htmlWorker(),
  typescript: () => new tsWorker(),
  base: () => new editorWorker(),
})
```

不注册时编辑器也能用，但 JSON/TS 校验、补全等语言能力退化为纯文本高亮。

## 基本用法

```vue
<script setup>
import { ref } from 'vue'
import { ElProCodeEditor } from 'el-pro-components'

const code = ref('{\n  "name": "demo"\n}')
</script>

<template>
  <ElProCodeEditor v-model="code" language="json" :height="220" />
  <ElProCodeEditor v-model="code" language="javascript" theme="vs-dark" :options="{ minimap: { enabled: false } }" />
</template>
```

## ProForm 字段

```ts
const columns = [
  {
    prop: 'script',
    label: '校验脚本',
    valueType: 'codeEditor',
    fieldProps: { language: 'javascript', height: 200, options: { readOnly: false } },
  },
]
```

- 表单级/列级 `readonly`：与其他字段一致走只读展示（退化为 code 代码块），不渲染编辑器；
- 需要「可见但不可编辑」时用 `fieldProps: { options: { readOnly: true } }`。

## API

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| modelValue | 编辑器内容，配 `v-model` | `string` | `''` |
| language | 语言 | `string` | `'javascript'` |
| theme | 主题：`'vs'` / `'vs-dark'` / `'hc-black'`。注意：theme 是 Monaco 的全局状态，同页多个编辑器共享最后一次设置的主题 | `string` | `'vs'` |
| height | 高度（px 或 CSS 长度） | `number \| string` | `300` |
| readOnly | 只读。`options.readOnly` 显式传时以 options 为准 | `boolean` | `false` |
| options | Monaco IStandaloneEditorConstructionOptions 透传，与内置默认合并，同名字段以这里为准 | `Record<string, any>` | — |

### 事件

| 事件 | 说明 | 回调参数 |
| --- | --- | --- |
| update:modelValue | 内容变化，配 `v-model` | `(value: string)` |
| change | 内容变化（只需监听时用） | `(value: string)` |
| loadError | 动态加载 monaco 失败（通常是未安装 monaco-editor） | `(error: unknown)` |

### 实例方法

| 方法 | 说明 |
| --- | --- |
| getEditor() | Monaco 编辑器实例（就绪后非空） |
| getMonaco() | monaco 模块命名空间（可调 monaco.editor APIs） |
| focus() | 聚焦编辑器 |
| insert(text) | 在光标处插入文本 |

## 相关导出

```ts
import { setupMonacoWorkers } from 'el-pro-components'
```
