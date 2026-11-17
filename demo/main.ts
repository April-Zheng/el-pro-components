import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
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
