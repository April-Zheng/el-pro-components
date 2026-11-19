import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
// 富文本主题样式：库不再把它内联进 el-pro.css，demo 走 src 源码（没有 dist 可引），
// 直接引 quill 自带的这份；真实项目可写 `import 'el-pro-components/richtext.css'`
import 'quill/dist/quill.snow.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn.mjs'
import jsonWorker from 'monaco-editor/language/json/json.worker.js?worker'
import cssWorker from 'monaco-editor/language/css/css.worker.js?worker'
import htmlWorker from 'monaco-editor/language/html/html.worker.js?worker'
import tsWorker from 'monaco-editor/language/typescript/ts.worker.js?worker'
import editorWorker from 'monaco-editor/editor/editor.worker.js?worker'
import { setupMonacoWorkers } from '@/index'
import App from './App.vue'
import './style.css'

// Monaco worker 注册：与真实项目同款接法（?worker 导入只能在消费方构建链处理）
setupMonacoWorkers({
  json: () => new jsonWorker(),
  css: () => new cssWorker(),
  html: () => new htmlWorker(),
  typescript: () => new tsWorker(),
  base: () => new editorWorker(),
})

createApp(App).use(ElementPlus, { locale: zhCn }).mount('#app')
