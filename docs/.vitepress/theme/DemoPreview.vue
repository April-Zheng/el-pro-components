<script setup lang="ts">
/**
 * DemoPreview —— 文档里的「可交互 demo + 源码折叠」容器，版式对齐 element.eleme.cn：
 * 白底卡片、控制条沉底（居中「显示代码」、右侧「复制源码」），
 * 展开的源码是浅灰底 + 轻量语法着色（不用 shiki，几条正则够了）。
 *
 * md 里写 <DemoPreview path="table-basic" />，这里按路径从 demos/ 目录取组件和源码：
 * - 组件用 import.meta.glob 一次性注册（eager），文档页不用逐个 import
 * - 源码用 ?raw 直接读文件原文，保证「看到的源码就是跑的代码」
 * - 组件包 ClientOnly：demo 里 mock 请求/ElMessage 只在浏览器跑，SSR 构建不受影响
 */
import { computed, ref } from 'vue'

const props = defineProps<{ path: string }>()

const modules = import.meta.glob('../../demos/*.vue', { eager: true })
const sources = import.meta.glob('../../demos/*.vue', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const key = computed(() => `../../demos/${props.path}.vue`)
// 注意：import.meta.glob 返回普通对象（不是 ref），直接按键取
const comp = computed(() => modules[key.value]?.default)
const source = computed(() => String(sources[key.value] ?? '').trim())
const expanded = ref(false)
const copied = ref(false)

async function copySource() {
  try {
    await navigator.clipboard.writeText(source.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    /* 剪贴板不可用（非安全上下文）就静默失败，别打断阅读 */
  }
}

/* ---------------- 轻量高亮：单趟扫描，逐段转义，不怕嵌套替换 ---------------- */

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** 注释 | 字符串 | 关键字 | 标签 | 属性名（后面紧跟 = 的词） */
const TOKEN_RE =
  /(<!--[\s\S]*?-->)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(import|from|export|default|const|let|var|function|return|async|await|new|typeof|if|else|for|of|in|as|true|false|null|undefined|ref)\b|(<\/?[A-Za-z][\w.-]*)|([\w-]+)(?==)/g

function highlight(code: string) {
  let out = ''
  let last = 0
  for (const m of code.matchAll(TOKEN_RE)) {
    const i = m.index
    out += escapeHtml(code.slice(last, i))
    const esc = escapeHtml(m[0])
    if (m[1]) out += `<span class="tok-c">${esc}</span>`
    else if (m[2]) out += `<span class="tok-s">${esc}</span>`
    else if (m[3]) out += `<span class="tok-k">${esc}</span>`
    else if (m[4]) out += `<span class="tok-t">${esc}</span>`
    else out += `<span class="tok-a">${esc}</span>`
    last = i + m[0].length
  }
  out += escapeHtml(code.slice(last))
  return out
}

const html = computed(() => highlight(source.value))
</script>

<template>
  <div class="demo-preview">
    <div class="demo-preview__stage">
      <ClientOnly>
        <component :is="comp" />
        <template #fallback>
          <div class="demo-preview__loading">demo 加载中…</div>
        </template>
      </ClientOnly>
    </div>

    <!-- 代码区在控制条上方：展开后条沉在卡片底部，和 element 文档一致 -->
    <!-- grid 0fr→1fr 过渡：纯 CSS 的平滑展开，不用 JS 算高度 -->
    <div class="demo-preview__code-wrap" :class="{ 'is-open': expanded }">
      <div class="demo-preview__code-clip">
        <div class="demo-preview__code">
          <pre><code v-html="html" /></pre>
        </div>
      </div>
    </div>

    <div class="demo-preview__bar">
      <a class="demo-preview__toggle" @click="expanded = !expanded">
        <i class="demo-preview__caret" :class="{ 'is-open': expanded }" />
        {{ expanded ? '隐藏代码' : '显示代码' }}
      </a>
      <a class="demo-preview__copy" @click="copySource">{{ copied ? '已复制' : '复制源码' }}</a>
    </div>
  </div>
</template>

<style>
.demo-preview {
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  margin: 16px 0;
  overflow: hidden;
  transition: box-shadow 0.2s;
}
.demo-preview:hover {
  box-shadow: 0 0 8px 0 rgba(232, 237, 250, 0.6), 0 2px 4px 0 rgba(232, 237, 250, 0.6);
}
.demo-preview__stage {
  padding: 24px;
  background: var(--vp-c-bg);
  /* 容器实在放不下时横向滚，别把表格列压成竖排 */
  overflow-x: auto;
}
.demo-preview__stage .demo-hint {
  margin: 12px 0 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
  line-height: 1.6;
}
.demo-preview__loading {
  padding: 24px 0;
  text-align: center;
  color: var(--vp-c-text-3);
  font-size: 13px;
}
/* 底部控制条：中间显示代码、右复制 */
.demo-preview__bar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  box-sizing: border-box;
  border-top: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}
.demo-preview__toggle {
  cursor: pointer;
  font-size: 13px;
  color: var(--vp-c-brand-1);
  user-select: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.demo-preview__caret {
  width: 0;
  height: 0;
  border: 5px solid transparent;
  border-top-color: currentColor;
  border-bottom-width: 0;
  margin-top: 3px;
  transition: transform 0.25s;
}
.demo-preview__caret.is-open {
  transform: rotate(180deg);
  margin-top: -3px;
}
.demo-preview__copy {
  position: absolute;
  right: 14px;
  cursor: pointer;
  font-size: 13px;
  color: var(--vp-c-brand-1);
  user-select: none;
}
.demo-preview__code-wrap {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.25s ease;
}
.demo-preview__code-wrap.is-open {
  grid-template-rows: 1fr;
}
.demo-preview__code-clip {
  overflow: hidden;
  min-height: 0;
}
.demo-preview__code {
  border-bottom: 1px solid var(--vp-c-divider);
}
.demo-preview__code pre {
  margin: 0;
  padding: 16px 20px;
  background: var(--vp-c-bg-soft);
  overflow-x: auto;
}
.demo-preview__code code {
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  line-height: 1.7;
  color: var(--vp-c-text-1);
  white-space: pre;
  display: block;
}
/* 着色：浅色主题（github-light 系），深色主题单独给一版 */
.demo-preview__code .tok-c {
  color: #8b949e;
}
.demo-preview__code .tok-s {
  color: #b45309;
}
.demo-preview__code .tok-k {
  color: #cf222e;
}
.demo-preview__code .tok-t {
  color: #116329;
}
.demo-preview__code .tok-a {
  color: #0550ae;
}
.dark .demo-preview__code .tok-c {
  color: #8b949e;
}
.dark .demo-preview__code .tok-s {
  color: #e3b341;
}
.dark .demo-preview__code .tok-k {
  color: #ff7b72;
}
.dark .demo-preview__code .tok-t {
  color: #7ee787;
}
.dark .demo-preview__code .tok-a {
  color: #79c0ff;
}
/* demo 里的演示卡片在文档主题下也要好看 */
.demo-preview .demo-card {
  padding: 0;
  border: none;
  background: transparent;
  margin: 0;
}
.demo-preview .demo-card + .demo-card {
  margin-top: 16px;
}
.demo-preview .demo-section-title {
  margin: 0 0 4px;
  font-size: 14px;
}
.demo-preview .demo-section-desc {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--vp-c-text-2);
}
</style>
