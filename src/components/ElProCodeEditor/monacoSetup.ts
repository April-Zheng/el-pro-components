/**
 * Monaco Worker 注册助手。
 *
 * 为什么在使用方注册而不是库里自带：Monaco 的语法 worker 要用 Vite 的
 * `?worker` 导入构建，这只能在**使用方的构建链**里发生——库模式打包后
 * `?worker` 后缀对消费方毫无意义。所以本库只提供注册函数，使用方在自己
 * 的入口（如 main.ts）传入 worker 工厂：
 *
 * ```ts
 * // main.ts（Vite 项目）
 * import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
 * import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
 * import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
 * import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
 * import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
 * import { setupMonacoWorkers } from 'el-pro-components'
 *
 * setupMonacoWorkers({
 *   json: () => new jsonWorker(),
 *   css: () => new cssWorker(),
 *   html: () => new htmlWorker(),
 *   typescript: () => new tsWorker(),
 *   base: () => new editorWorker(),
 * })
 * ```
 *
 * 不注册时 Monaco 也能用（编辑器本体不依赖 worker），但 JSON/TS 校验、
 * 补全等语言能力会退化为纯文本高亮，控制台会有 worker 加载警告。
 */
import type { ProMonacoWorkerFactories } from '../../types'

/** 语言标签 → worker 工厂映射（与 Monaco getWorker 的 label 对齐） */
export function setupMonacoWorkers(factories: ProMonacoWorkerFactories): void {
  if (typeof window === 'undefined') return
  window.MonacoEnvironment = {
    getWorker(_moduleId: string, label: string) {
      const make = (() => {
        switch (label) {
          case 'json':
            return factories.json
          case 'css':
          case 'scss':
          case 'less':
            return factories.css
          case 'html':
          case 'handlebars':
          case 'razor':
            return factories.html
          case 'typescript':
          case 'javascript':
            return factories.typescript
          // 默认走编辑器核心 worker（Java、纯文本等）
          default:
            return factories.base
        }
      })()
      if (!make) {
        throw new Error(
          `[el-pro-components] Monaco worker 未注册：label=${label}。请在应用入口调 setupMonacoWorkers(...) 补齐对应语言的 worker 工厂。`,
        )
      }
      return make()
    },
  }
}
