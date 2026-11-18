<script setup lang="ts">
/**
 * ElProRichText —— 所见即所得富文本编辑器（Quill 2 封装，snow 主题）。
 *
 * 参考实现：itom-ui JNPFEditor/quill.vue。与它相同的三件事：
 * 工具栏默认配置（对齐它的一整套）、图片走「工具栏点击/粘贴/拖拽 → 上传 → 插入」
 * 管道、v-model 双向绑定防循环。与它不同的三件事：
 * - Quill 2（Vue 3 生态）：参考的 vue-quill-editor + quill 1.x 是 Vue 2 专用；
 * - **图片上传由使用方注入**：`imageUpload` 传 `(file) => Promise<string>` 返回图片
 *   URL，返回后插进编辑器；不传时回落 base64 内嵌（零配置可用，体积换便利）；
 * - 参考的视频弹窗绑了项目私有上传 API，不搬 —— 需要视频时用 `toolbar` 自定义
 *   工具栏加 video 项并自己接管 handler（Quill 的 modules.toolbar.handlers）。
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import 'quill/dist/quill.snow.css'
import type Quill from 'quill'

/**
 * 动态加载 Quill。为什么要动态：quill/core/emitter.js 在模块加载时就访问 document，
 * 静态 import 会让任何 SSR 环境（VitePress/Nuxt）在构建期直接崩；动态后 SSR
 * 只渲染占位骨架，客户端再创建编辑器。quill 是非可选依赖，使用方无需额外配置。
 */
let quillPromise: Promise<typeof import('quill')['default']> | null = null
function loadQuill(): Promise<typeof import('quill')['default']> {
  quillPromise ??= import('quill').then((m) => m.default)
  return quillPromise
}

defineOptions({ name: 'ElProRichText' })

/** 默认工具栏，与参考实现一致（不含视频项） */
const DEFAULT_TOOLBAR = [
  ['bold', 'italic', 'underline', 'strike'],
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ size: ['small', false, 'large', 'huge'] }],
  [{ color: [] }, { background: [] }],
  ['blockquote', 'code-block'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  [{ indent: '-1' }, { indent: '+1' }],
  [{ align: [] }],
  [{ direction: 'rtl' }],
  ['clean'],
  ['link', 'image'],
]

const props = withDefaults(
  defineProps<{
    /** 编辑器内容（HTML）。v-model:modelValue */
    modelValue?: string
    /** 占位文字 @default '请输入' */
    placeholder?: string
    /** 禁用编辑（内容可读但不可编辑，与 ElProCodeEditor 的 readOnly 语义一致） */
    disabled?: boolean
    /** 编辑区最小高度（px） @default 300 */
    height?: number
    /**
     * 工具栏配置，Quill 的 toolbar container 结构。默认对齐参考实现的一整套；
     * 需要增删项（如 video）时传自定义数组
     */
    toolbar?: unknown[][]
    /**
     * 图片上传：工具栏图片按钮 / 粘贴 / 拖拽进图片时调用，resolve 的字符串
     * 作为图片 URL 插入。不传时回落 base64 内嵌
     */
    imageUpload?: (file: File) => Promise<string>
  }>(),
  {
    modelValue: '',
    placeholder: '请输入',
    disabled: false,
    height: 300,
  },
)

const emit = defineEmits<{
  'update:modelValue': [string]
  /** 内容变化（与 update:modelValue 同时发生，只需监听时用） */
  change: [string]
  focus: []
  blur: []
  /** 图片上传失败（imageUpload reject / 文件读取失败） */
  uploadError: [error: unknown]
}>()

const editorRef = ref<HTMLDivElement | null>(null)
/** 初始化失败（Quill 构造器抛错）：显式出口，不静默吞掉 */
const initError = ref(false)
let quill: Quill | null = null
/** 上传中的图片计数（显示遮罩） */
const uploading = ref(false)
/** 焦点状态缓存：只在翻转时发 focus/blur，避免 selection-change 噪音 */
let focused = false

async function uploadAndInsert(file: File) {
  uploading.value = true
  try {
    let url: string
    if (props.imageUpload) {
      url = await props.imageUpload(file)
    } else {
      // 回落：base64 内嵌，零配置可用
      url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    }
    if (!quill) return
    const range = quill.getSelection(true)
    const index = range?.index ?? quill.getLength()
    quill.insertEmbed(index, 'image', url)
    quill.setSelection(index + 1)
  } catch (error) {
    // 上传失败要有出口：使用方监听 uploadError 接管提示（如 ElMessage.error）
    emit('uploadError', error)
  } finally {
    uploading.value = false
  }
}

/** 工具栏图片按钮：文件选择器 → 上传 → 插入。禁用态不得改动内容（管道入口统一拦截） */
function onToolbarImage() {
  if (props.disabled || uploading.value) return
  const input = document.createElement('input')
  input.setAttribute('type', 'file')
  input.setAttribute('accept', 'image/*')
  input.click()
  input.onchange = () => {
    // 多选支持：全部图片文件顺序上传
    const files = Array.from(input.files ?? []).filter((f) => f.type.startsWith('image/'))
    files.forEach((file) => void uploadAndInsert(file))
  }
}

/** 绑定后的根元素（编辑器的父级）：拦截监听挂在这里走捕获阶段——
 * 捕获先于目标阶段执行，preventDefault + stopPropagation 能整体拦掉
 * Quill 自带的 drop（uploader 模块）/paste 处理，避免同一次拖拽出两张图 */
const rootRef = ref<HTMLDivElement | null>(null)

/** 事件目标是否在编辑器内（挂到父级后需要区分来源） */
function isEditorEvent(e: Event): boolean {
  const editorRoot = quill?.root
  if (!editorRoot || typeof editorRoot.contains !== 'function') return true
  return editorRoot.contains(e.target as Node)
}

/** 拖拽悬停必须 preventDefault 才允许 drop（浏览器默认拒绝） */
function onDragOver(e: Event) {
  if (!isEditorEvent(e)) return
  e.preventDefault()
}

/**
 * 粘贴/拖拽进图片：拦截原生行为，走同一条上传管道。
 * 禁用态：仍然拦（阻止拖拽图片触发浏览器「打开文件」导航），但不改内容。
 */
function onPasteOrDrop(e: Event) {
  if (!isEditorEvent(e)) return
  const files =
    e.type === 'paste'
      ? (e as ClipboardEvent).clipboardData?.files
      : (e as DragEvent).dataTransfer?.files
  const images = Array.from(files ?? []).filter((f) => f.type.startsWith('image/'))
  if (!images.length) return
  e.preventDefault()
  e.stopPropagation()
  if (props.disabled || uploading.value) return
  images.forEach((file) => void uploadAndInsert(file))
}

/**
 * 初始化 Quill。quill 已建或已报错时不重复；容器可用性由 watch(editorRef) 兜底。
 * 初始化失败显式暴露（console.error + 页内提示），不静默吞——静默失败比报错更难查。
 */
let initStarted = false
async function initQuill(el: HTMLElement | null) {
  // 同步置位：await 加载期间第二次调用（onMounted 与 watch 都会触发）不能重入建双实例
  if (!el || initStarted || initError.value) return
  initStarted = true
  try {
    const Quill = await loadQuill()
    // 异步加载期间组件可能已卸载/容器已移除
    if (!el.isConnected) return
    quill = new Quill(el, {
      theme: 'snow',
      placeholder: props.placeholder,
      readOnly: props.disabled,
      modules: {
        /*
         * 让 Quill 自带的 drop 上传变成空操作。
         *
         * 踩过的坑：`uploader: false` **禁不掉** —— 构造器里 theme.addModule('uploader')
         * 会无视 modules 配置强行加载它；`mimetypes: []` 也禁不掉 —— Quill 的配置走
         * 深度合并，数组按索引合并，空数组没有元素可覆盖，默认值原封不动。
         * 可行且语义清楚的做法是把 handler 换成空函数：upload() 里 mimetypes 匹配后
         * 调的就是它，于是不插入任何内容。
         *
         * 第一道防线仍是下方 onPasteOrDrop 的捕获阶段拦截；这里是第二道。
         */
        uploader: { handler: () => {} },
        toolbar: {
          container: props.toolbar ?? DEFAULT_TOOLBAR,
          handlers: { image: onToolbarImage },
        },
      },
    })

    // v-model：外部 → 编辑器 在 watch 里做；这里编辑器 → 外部。
    // 序列化用 root.innerHTML：quill 2.0.x 的公开 API 没有 getHTML
    // （editor.getHTML 是内部类，getSemanticHTML 会丢样式，都不适合 v-model）
    quill.on('text-change', () => {
      const html = quill!.root.innerHTML
      if (html !== props.modelValue) {
        emit('update:modelValue', html)
        emit('change', html)
      }
    })

    // 初始内容：Quill 构造器不接收内容，手动写入一次（走 clipboard 归一化，
    // 归一化后的 HTML 会经 text-change 回传给 v-model —— 正常行为）
    if (props.modelValue) {
      quill.clipboard.dangerouslyPasteHTML(props.modelValue)
    }
    quill.on('editor-change', (name: string) => {
      if (name !== 'selection-change') return
      // 只在焦点状态翻转时发：selection-change 在光标移动时也触发，
      // 直接发会把 focus/blur 变成噪音（挂载后第一次还会凭空发 blur）
      const now = quill!.hasFocus()
      if (now !== focused) {
        focused = now
        if (now) emit('focus')
        else emit('blur')
      }
    })

    // 粘贴 / 拖拽拦截挂到组件根元素走捕获阶段（捕获先于 Quill 在 quill.root 上
    // 注册的目标阶段监听器，preventDefault + stopPropagation 能整体拦掉它的处理）
    const rootEl = rootRef.value
    if (rootEl) {
      rootEl.addEventListener('paste', onPasteOrDrop, true)
      rootEl.addEventListener('drop', onPasteOrDrop, true)
      rootEl.addEventListener('dragover', onDragOver, true)
    }
  } catch (error) {
    initError.value = true
    quill = null
    console.error('[ElProRichText] Quill 初始化失败：', error)
  }
}
onMounted(() => initQuill(editorRef.value))

// 容器可用性兜底：onMounted 时模板 ref 尚未绑定（异步/时序场景）时，绑定后补初始化。
// 这消掉整类「ref 晚于 mounted 钩子」的时序问题，也覆盖 v-if 重挂场景。
watch(
  editorRef,
  (el) => {
    if (el) initQuill(el)
  },
  { flush: 'post' },
)

onBeforeUnmount(() => {
  const rootEl = rootRef.value
  if (rootEl) {
    rootEl.removeEventListener('paste', onPasteOrDrop, true)
    rootEl.removeEventListener('drop', onPasteOrDrop, true)
    rootEl.removeEventListener('dragover', onDragOver, true)
  }
  if (quill) {
    // Quill 没有显式 dispose；置空让容器 GC
    quill = null
  }
})

// 外部 → 编辑器：内容一致跳过，防「内部修改 → emit → 外部回传」循环与光标错位
watch(
  () => props.modelValue,
  (val) => {
    if (!quill) return
    const html = quill.root.innerHTML
    if (val === html) return
    quill.clipboard.dangerouslyPasteHTML(val ?? '')
  },
)

watch(
  () => props.disabled,
  (val) => {
    quill?.enable(!val)
  },
)

defineExpose({
  /** Quill 实例（可调 quill 的全部 API：getText / getHTML / insertEmbed 等） */
  getQuill: () => quill,
  /** 在光标处插入文本 */
  insertText: (text: string) => {
    if (!quill) return
    const range = quill.getSelection(true)
    const index = range?.index ?? 0
    quill.insertText(index, text)
    quill.setSelection(index + text.length)
  },
})
</script>

<template>
  <div ref="rootRef" class="el-pro-rich-text" :class="{ 'is-disabled': disabled, 'is-uploading': uploading }">
    <div ref="editorRef" class="el-pro-rich-text__editor" />
    <div v-if="uploading" class="el-pro-rich-text__uploading" aria-live="polite">
      <span class="el-pro-rich-text__spinner" aria-hidden="true" />
      图片上传中…
    </div>
    <div v-else-if="initError" class="el-pro-rich-text__uploading is-error" role="alert">
      编辑器初始化失败，请看控制台报错。
    </div>
  </div>
</template>

<style scoped>
.el-pro-rich-text {
  position: relative;
  width: 100%;
  min-height: 100px;
}
/* 工具栏与编辑区贴合 EP 的边框语言（对齐参考实现的圆角拆分） */
.el-pro-rich-text :deep(.ql-toolbar.ql-snow) {
  border: 1px solid var(--el-border-color-lighter);
  border-bottom: 0;
  border-radius: 4px 4px 0 0;
}
.el-pro-rich-text :deep(.ql-container.ql-snow) {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 0 0 4px 4px;
}
.el-pro-rich-text :deep(.ql-editor) {
  min-height: v-bind('`${height}px`');
  white-space: normal !important;
}
/* 禁用态：可读不可编辑（对齐参考实现的 ql-disabled 处理） */
.el-pro-rich-text.is-disabled :deep(.ql-editor) {
  user-select: none;
  cursor: not-allowed;
  background-color: var(--el-fill-color-light) !important;
}
.el-pro-rich-text__uploading {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: color-mix(in srgb, var(--el-bg-color) 70%, transparent);
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.el-pro-rich-text__uploading.is-error {
  color: var(--el-color-danger);
}
.el-pro-rich-text__spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--el-border-color);
  border-top-color: var(--el-color-primary);
  border-radius: 50%;
  animation: el-pro-rich-text-spin 0.8s linear infinite;
}
@keyframes el-pro-rich-text-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .el-pro-rich-text__spinner {
    animation: none;
  }
}
</style>
