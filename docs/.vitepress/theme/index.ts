// VitePress 自定义主题：默认主题 + 注册 DemoPreview + ElementPlus 全量注册
import DefaultTheme from 'vitepress/theme'
import ElementPlus from 'element-plus'
import DemoPreview from './DemoPreview.vue'
import 'element-plus/dist/index.css'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // demo 组件里直接用 <el-button> 这类全局组件名，和 playground 用法一致
    app.use(ElementPlus)
    app.component('DemoPreview', DemoPreview)
  },
}
