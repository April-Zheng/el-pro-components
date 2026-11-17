<script setup lang="ts">
/**
 * ElProCodeEditor —— Monaco 代码编辑器封装（v-model + 只读 + options 透传）。
 *
 * 参考实现：itom-ui JNPFEditor/monaco.vue。与它相同的三件事：
 * v-model 双向绑定（内部/外部改动互相防循环）、options 深度变更 → updateOptions、
 * 卸载 dispose 防泄漏。与它不同的两件事：
 * - monaco-editor **动态 import**：它是可选 peer 依赖（peerDependenciesMeta.optional），
 *   没安装时组件渲染安装提示，其余组件零影响；
 * - Worker 注册抽成 `setupMonacoWorkers()`（见 monacoSetup.ts），由使用方在自己的
 *   入口调用——`?worker` 导入只能在使用方的构建链里处理。
 *
 * 为什么不用 el-statistic 式的轻量自研：语法高亮/补全/错误标注的维护成本
 * 就是 Monaco 本体，自研等于重写一个编辑器。
 */
import { computed, markRaw, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'

defineOptions({ name: 'ElProCodeEditor' })

const props = withDefaults(
  defineProps<{
    /** 编辑器内容（v-model:modelValue） */
    modelValue?: string
    /** 语言：javascript / typescript / json / html / css / sql / java / python 等 @default 'javascript' */
    language?: string
    /** 主题：'vs'（亮）| 'vs-dark'（暗）| 'hc-black'（高对比） @default 'vs' */
    theme?: string
    /** 编辑器高度（px 或 CSS 长度） @default 300 */
    height?: number | string
    /** 只读。也可直接在 options 里传 readOnly，options 优先 */
    readOnly?: boolean
    /**
     * Monaco IStandaloneEditorConstructionOptions 透传
     * （wordWrap / fontSize / minimap / suggest 等），与内置默认合并，同名字段以这里为准
     */
    options?: Record<string, any>
  }>(),
  {
    modelValue: '',
    language: 'javascript',
    theme: 'vs',
    height: 300,
    readOnly: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [string]
  /** 内容变化（与 update:modelValue 同时发生，只需要监听时用） */
  change: [string]
  /** 动态加载 monaco 失败（未安装 monaco-editor 时） */
  loadError: [unknown]
}>()

const container = ref<HTMLElement | null>(null)
/** 'loading' 动态加载中；'ready' 就绪；'error' 加载失败（通常是未安装 monaco-editor） */
const status = ref<'loading' | 'ready' | 'error'>('loading')
/*
 * monaco 实例与编辑器实例用 shallowRef + markRaw 持有：它们是复杂的外部对象，
 * 深度响应式代理（ref）会遍历内部状态，轻则性能损耗，重则破坏 Monaco 内部逻辑。
 */
const editor = shallowRef<any>(null)
const monacoRef = shallowRef<any>(null)

/** 内置默认。与参考实现保持一致，options 里同名字段覆盖 */
const mergedOptions = computed<Record<string, any>>(() => {
  const base: Record<string, any> = {
    selectOnLineNumbers: true,
    roundedSelection: false,
    wordWrap: 'on',
    theme: props.theme,
    formatOnPaste: true,
    formatOnType: true,
    fontSize: 14,
    readOnly: props.readOnly,
    suggest: {
      enabled: true,
      showIcons: true,
      snippetsPreventQuickSuggestions: false,
    },
    quickSuggestions: { other: true, comments: true, strings: true },
  }
  const own = props.options ?? {}
  // language / theme / readOnly 的 prop 语义优先于 options 里的同名 undefined；
  // options 显式传了同名键则 options 赢（最具体的配置最具体）
  if (own.language === undefined) own.language = props.language
  if (own.readOnly === undefined) own.readOnly = props.readOnly
  return { ...base, ...own }
})

let contentListener: { dispose: () => void } | null = null

onMounted(async () => {
  try {
    const monaco = await import('monaco-editor')
    monacoRef.value = markRaw(monaco)
    // 异步加载期间组件可能已卸载
    if (!container.value) return
    editor.value = markRaw(
      monaco.editor.create(container.value, {
        value: props.modelValue ?? '',
        ...mergedOptions.value,
      }),
    )
    contentListener = editor.value.onDidChangeModelContent(() => {
      const newValue = editor.value.getValue()
      if (newValue !== props.modelValue) {
        emit('update:modelValue', newValue)
        emit('change', newValue)
      }
    })
    status.value = 'ready'
  } catch (error) {
    status.value = 'error'
    emit('loadError', error)
  }
})

// 外部 → 编辑器：值不同才 setValue，避免「内部修改 → emit → 外部回传 → setValue」循环
watch(
  () => props.modelValue,
  (val) => {
    if (editor.value && editor.value.getValue() !== val) {
      editor.value.setValue(val ?? '')
    }
  },
)

// options 深度变更 → updateOptions（与参考实现一致）
watch(
  mergedOptions,
  (val) => {
    editor.value?.updateOptions({ ...val })
  },
  { deep: true },
)

// theme 是 Monaco 的全局状态，updateOptions 不生效，要走 setTheme
watch(
  () => props.theme,
  (val) => {
    monacoRef.value?.editor.setTheme(val)
  },
)

onBeforeUnmount(() => {
  contentListener?.dispose()
  contentListener = null
  editor.value?.dispose()
  editor.value = null
  monacoRef.value = null
})

/** 光标处插入文本（对齐参考实现的 insert） */
function insert(text: string) {
  if (!editor.value) return
  const position = editor.value.getPosition()
  if (!position) return
  editor.value.executeEdits('', [
    {
      range: {
        startLineNumber: position.lineNumber,
        startColumn: position.column,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      },
      text: text ?? '',
    },
  ])
}

defineExpose({
  /** Monaco 编辑器实例（monaco-editor 安装且就绪后非空） */
  getEditor: () => editor.value,
  /** monaco 模块命名空间（可调 monaco.editor APIs） */
  getMonaco: () => monacoRef.value,
  focus: () => editor.value?.focus(),
  insert,
})
</script>

<template>
  <div class="el-pro-code-editor" :style="{ height: typeof height === 'number' ? `${height}px` : height }">
    <!--
      容器始终占位：Monaco 在 create 时完成一次布局测量，容器 display:none
      会让它以 0×0 布局、之后不再自动重算，永远空白。加载/错误用覆盖层盖住。
    -->
    <div ref="container" class="el-pro-code-editor__container" />

    <div v-if="status === 'loading'" class="el-pro-code-editor__overlay is-loading">
      <span class="el-pro-code-editor__spinner" aria-hidden="true" />
      编辑器加载中…
    </div>

    <div v-else-if="status === 'error'" class="el-pro-code-editor__overlay is-error" role="alert">
      代码编辑器加载失败：请先安装依赖 <code>npm i monaco-editor</code>
      （可选依赖，未安装时本组件不可用）。
    </div>
  </div>
</template>

<style>
.el-pro-code-editor {
  position: relative;
  width: 100%;
  min-height: 100px;
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
}
.el-pro-code-editor__container {
  height: 100%;
  width: 100%;
}
.el-pro-code-editor__overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--el-bg-color);
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.el-pro-code-editor__overlay.is-error {
  color: var(--el-color-danger);
}
.el-pro-code-editor__overlay code {
  padding: 1px 6px;
  background: var(--el-fill-color-light);
  border-radius: 3px;
  font-size: 12px;
}
.el-pro-code-editor__spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--el-border-color);
  border-top-color: var(--el-color-primary);
  border-radius: 50%;
  animation: el-pro-code-editor-spin 0.8s linear infinite;
}
@keyframes el-pro-code-editor-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .el-pro-code-editor__spinner {
    animation: none;
  }
}
</style>
