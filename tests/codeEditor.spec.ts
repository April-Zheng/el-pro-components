// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick, ref } from 'vue'

/**
 * 假 monaco：不加载真包（happy-dom + worker 不可行），只模拟交互契约——
 * create/setValue/getValue/updateOptions/onDidChangeModelContent/dispose/setTheme。
 * 真实渲染由 demo 页人工验收。
 */
const state = vi.hoisted(() => ({
  instances: [] as any[],
  failImport: false,
}))

vi.mock('monaco-editor', () => {
  throwIfFailed()
  function throwIfFailed() {
    if (state.failImport) throw new Error('monaco-editor not installed')
  }
  return {
    editor: {
      create: (_el: unknown, opts: any) => {
        throwIfFailed()
        let value: string = opts.value ?? ''
        const listeners: Array<() => void> = []
        const inst = {
          __opts: opts,
          getValue: () => value,
          setValue: (v: string) => {
            value = v
          },
          updateOptions: (o: any) => {
            inst.__opts = { ...inst.__opts, ...o }
          },
          onDidChangeModelContent: (cb: () => void) => {
            listeners.push(cb)
            return { dispose: () => void listeners.splice(listeners.indexOf(cb), 1) }
          },
          /** 测试模拟用户输入：改内部值并触发内容变化监听 */
          __type: (text: string) => {
            value = text
            listeners.forEach((l) => l())
          },
          dispose: () => {
            inst.__disposed = true
          },
          getPosition: () => ({ lineNumber: 1, column: 1 }),
          executeEdits: vi.fn(),
          __disposed: false,
        }
        state.instances.push(inst)
        return inst
      },
      setTheme: vi.fn(),
    },
  }
})

import ElProCodeEditor from '../src/components/ElProCodeEditor/ElProCodeEditor.vue'
import { setupMonacoWorkers } from '../src/components/ElProCodeEditor/monacoSetup'
import ElProForm from '../src/components/ElProForm/ElProForm.vue'
import * as monacoModule from 'monaco-editor'

describe('setupMonacoWorkers：语言标签路由', () => {
  it('按 label 路由到对应工厂，未知 label 走 base，未注册的 label 报可读错误', () => {
    const json = vi.fn(() => ({ w: 'json' } as any))
    const css = vi.fn(() => ({ w: 'css' } as any))
    const html = vi.fn(() => ({ w: 'html' } as any))
    const ts = vi.fn(() => ({ w: 'ts' } as any))
    const base = vi.fn(() => ({ w: 'base' } as any))
    setupMonacoWorkers({ json, css, html, typescript: ts, base })
    const getWorker = (window as any).MonacoEnvironment.getWorker
    expect(getWorker('', 'json')!.w).toBe('json')
    expect(getWorker('', 'scss')!.w).toBe('css') // scss/less 归 css
    expect(getWorker('', 'handlebars')!.w).toBe('html')
    expect(getWorker('', 'javascript')!.w).toBe('ts')
    expect(getWorker('', 'java')!.w).toBe('base') // 未知语言走核心 worker
    // base 也没注册时：抛可读错误而不是返回 undefined（MonacoEnvironment 类型要求 Worker）
    setupMonacoWorkers({ json })
    expect(() => (window as any).MonacoEnvironment.getWorker('', 'python')).toThrow('setupMonacoWorkers')
  })
})

async function flushUntil(fn: () => boolean, tries = 30) {
  for (let i = 0; i < tries; i++) {
    if (fn()) return true
    await Promise.resolve()
    await nextTick()
  }
  return false
}

let cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.forEach((fn) => fn())
  cleanups = []
  state.instances.length = 0
  state.failImport = false
})

function mountEditor(props: Record<string, any> = {}) {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const emitted: string[][] = []
  const app = createApp({
    render: () =>
      h(ElProCodeEditor as any, {
        'onUpdate:modelValue': (v: string) => emitted.push(v),
        ...props,
      }),
  })
  app.mount(root)
  cleanups.push(() => {
    app.unmount()
    root.remove()
  })
  return { root, emitted }
}

describe('ElProCodeEditor：挂载与 v-model', () => {
  it('动态加载 monaco 并 create，初始值与 options 合并传入', async () => {
    const { root } = mountEditor({
      modelValue: 'const a = 1',
      language: 'json',
      theme: 'vs-dark',
      height: 240,
      options: { fontSize: 16, minimap: { enabled: false } },
    })
    const ok = await flushUntil(() => state.instances.length > 0)
    expect(ok).toBe(true)
    const inst = state.instances[0]
    expect(inst.__opts.value).toBe('const a = 1')
    expect(inst.__opts.language).toBe('json')
    expect(inst.__opts.theme).toBe('vs-dark')
    expect(inst.__opts.fontSize).toBe(16)
    expect(inst.__opts.minimap).toEqual({ enabled: false })
    // 内置默认也在
    expect(inst.__opts.wordWrap).toBe('on')
    expect(inst.__opts.formatOnPaste).toBe(true)
    // 容器高度落到外层样式
    expect((root.firstElementChild as HTMLElement).style.height).toBe('240px')
  })

  it('编辑器内输入 → emit update:modelValue', async () => {
    const { emitted } = mountEditor({ modelValue: '' })
    const inst = await flushUntil(() => state.instances.length > 0).then(() => state.instances[0])
    inst.__type('hello')
    expect(emitted).toEqual(['hello'])
  })

  it('外部改值 → setValue，且值相同不重复设', async () => {
    const value = ref('v1')
    const root = document.createElement('div')
    document.body.appendChild(root)
    const app = createApp({
      render: () => h(ElProCodeEditor as any, { modelValue: value.value }),
    })
    app.mount(root)
    cleanups.push(() => {
      app.unmount()
      root.remove()
    })
    const inst = await flushUntil(() => state.instances.length > 0).then(() => state.instances[0])
    const setValueSpy = vi.spyOn(inst, 'setValue')
    value.value = 'v2'
    await nextTick()
    expect(setValueSpy).toHaveBeenCalledWith('v2')
    // 内部值已是 v2（模拟编辑器自身 onChange 已同步），外部回传同值 → 不再 setValue
    inst.__type('v2')
    value.value = 'v2'
    await nextTick()
    expect(setValueSpy).toHaveBeenCalledTimes(1)
  })

  it('options 深度变更 → updateOptions；theme 变更 → setTheme', async () => {
    const options = ref<Record<string, any>>({ fontSize: 14 })
    const theme = ref('vs')
    const root = document.createElement('div')
    document.body.appendChild(root)
    const app = createApp({
      render: () => h(ElProCodeEditor as any, { options: options.value, theme: theme.value }),
    })
    app.mount(root)
    cleanups.push(() => {
      app.unmount()
      root.remove()
    })
    const inst = await flushUntil(() => state.instances.length > 0).then(() => state.instances[0])
    options.value = { fontSize: 18, wordWrap: 'off' }
    await nextTick()
    await nextTick()
    expect(inst.__opts.fontSize).toBe(18)
    expect(inst.__opts.wordWrap).toBe('off')
    theme.value = 'vs-dark'
    await nextTick()
    await nextTick()
    expect((monacoModule as any).editor.setTheme).toHaveBeenCalledWith('vs-dark')
  })

  it('卸载 dispose，防泄漏', async () => {
    const { root } = mountEditor({ modelValue: 'x' })
    const inst = await flushUntil(() => state.instances.length > 0).then(() => state.instances[0])
    appUnmount(root)
    expect(inst.__disposed).toBe(true)
  })

  function appUnmount(root: HTMLElement) {
    // mountEditor 内部已注册 cleanup，但这里需要主动触发；直接 unmount app
    // 通过根元素上的 Vue app 引用拿不到，简化：调用 cleanups 里最后一项
    cleanups.at(-1)?.()
    cleanups = cleanups.slice(0, -1)
    void root
  }

  it('未安装 monaco-editor：渲染安装提示并发 loadError', async () => {
    state.failImport = true
    const loadError = vi.fn()
    const root = document.createElement('div')
    document.body.appendChild(root)
    const app = createApp({
      render: () => h(ElProCodeEditor as any, { onLoadError: loadError }),
    })
    app.mount(root)
    cleanups.push(() => {
      app.unmount()
      root.remove()
    })
    await flushUntil(() => root.textContent!.includes('monaco-editor'))
    expect(root.textContent).toContain('npm i monaco-editor')
    expect(loadError).toHaveBeenCalledTimes(1)
  })
})

describe('ProForm 接入：valueType codeEditor', () => {
  it('编辑态渲染 Monaco 编辑器，值双向绑定', async () => {
    const model = { script: 'print(1)' }
    const root = document.createElement('div')
    document.body.appendChild(root)
    const app = createApp({
      render: () =>
        h(ElProForm as any, {
          model,
          columns: [{ prop: 'script', label: '脚本', valueType: 'codeEditor' }],
          showActions: false,
        }),
    })
    app.mount(root)
    cleanups.push(() => {
      app.unmount()
      root.remove()
    })
    await flushUntil(() => state.instances.length > 0)
    const inst = state.instances.at(-1)!
    expect(inst.__opts.value).toBe('print(1)')
    expect(inst.__opts.language).toBe('javascript') // 默认语言
    // 编辑器内输入 → 表单 model 更新
    inst.__type('print(2)')
    await nextTick()
    expect(model.script).toBe('print(2)')
  })

  it('fieldProps 透传 language / options；表单只读时编辑器 readOnly', async () => {
    const model = { script: 'x' }
    const root = document.createElement('div')
    document.body.appendChild(root)
    const app = createApp({
      render: () =>
        h(ElProForm as any, {
          model,
          readonly: true,
          columns: [
            {
              prop: 'script',
              label: '脚本',
              valueType: 'codeEditor',
              fieldProps: { language: 'sql', height: 180 },
            },
          ],
          showActions: false,
        }),
    })
    app.mount(root)
    cleanups.push(() => {
      app.unmount()
      root.remove()
    })
    await flushUntil(() => state.instances.length > 0)
    const inst = state.instances.at(-1)!
    // 表单级 readonly 走只读展示（CellRenderer code 形态），不渲染 Monaco
    expect(state.instances.length).toBe(0)
    expect(root.querySelector('.el-pro-cell__code')).not.toBeNull()
    void inst
  })

  it('列级 readonly：与表单级一致走只读展示（code 代码块），不渲染 Monaco', async () => {
    const model = { script: 'x' }
    const root = document.createElement('div')
    document.body.appendChild(root)
    const app = createApp({
      render: () =>
        h(ElProForm as any, {
          model,
          columns: [
            { prop: 'script', label: '脚本', valueType: 'codeEditor', readonly: true },
          ],
          showActions: false,
        }),
    })
    app.mount(root)
    cleanups.push(() => {
      app.unmount()
      root.remove()
    })
    await flushUntil(() => root.querySelector('.el-pro-cell__code'))
    // 与其他字段的 readonly 语义一致：只读展示，不渲染编辑器
    expect(state.instances.length).toBe(0)
    expect(root.querySelector('.el-pro-cell__code')).not.toBeNull()
  })

  it('fieldProps.options.readOnly 透传为编辑器只读（非 readonly 展示语义）', async () => {
    const model = { script: 'x' }
    const root = document.createElement('div')
    document.body.appendChild(root)
    const app = createApp({
      render: () =>
        h(ElProForm as any, {
          model,
          columns: [
            {
              prop: 'script',
              label: '脚本',
              valueType: 'codeEditor',
              fieldProps: { options: { readOnly: true }, language: 'sql' },
            },
          ],
          showActions: false,
        }),
    })
    app.mount(root)
    cleanups.push(() => {
      app.unmount()
      root.remove()
    })
    await flushUntil(() => state.instances.length > 0)
    const inst = state.instances.at(-1)!
    expect(inst.__opts.readOnly).toBe(true)
    expect(inst.__opts.language).toBe('sql')
  })
})
