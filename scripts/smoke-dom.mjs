/**
 * 产物冒烟 —— DOM 阶段。
 *
 * 在 happy-dom 提供的真实 DOM 上加载**构建产物**（不是源码），验证：
 * 1. `app.use(ElProComponents)` 能把组件注册进去（曾因 UMD/命名导出形态丢失 install 而静默失效）
 * 2. 组件能真的渲染出 DOM 节点
 * 3. 富文本这类带动态依赖的组件在产物里能完成初始化
 *
 * 与单测的分工：单测 mock 掉 Quill/Monaco 测交互契约；这里不 mock，测「产物装进真实
 * 页面后能不能活」。两者互补，缺哪一个都会漏掉已发生的真实故障。
 */
import { Window } from 'happy-dom'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// 必须在 import vue/dist 之前装好 DOM，否则 Vue 会判定为 SSR 环境
const window = new Window({ url: 'http://localhost/' })

/**
 * 把 happy-dom 的 DOM API 整体挂到 globalThis。
 * 逐个补容易漏（SVGElement / Event / File / FileReader …），而 Vue runtime-dom、
 * Element Plus 和 Quill 用到的构造器很杂。策略：把所有大写开头的构造器/命名空间
 * 整体镜像过去，特殊的 getter-only 属性单独 defineProperty。
 */
for (const key of Object.getOwnPropertyNames(window)) {
  if (!/^[A-Z]/.test(key)) continue
  if (key in globalThis) continue
  try {
    globalThis[key] = window[key]
  } catch {
    // 只读属性跳过，下面单独处理关键项
  }
}
globalThis.window = window
globalThis.document = window.document
// Node 24 的 globalThis.navigator 只有 getter，用 defineProperty 覆盖
Object.defineProperty(globalThis, 'navigator', {
  value: window.navigator,
  configurable: true,
  writable: true,
})
globalThis.HTMLElement = window.HTMLElement
globalThis.Element = window.Element
globalThis.Node = window.Node
globalThis.MutationObserver = window.MutationObserver
globalThis.getComputedStyle = window.getComputedStyle.bind(window)
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0)
globalThis.cancelAnimationFrame = (id) => clearTimeout(id)
globalThis.ResizeObserver =
  window.ResizeObserver ??
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

const failures = []
const pass = (name) => console.log(`  ✓ ${name}`)
const fail = (name, error) => {
  failures.push(`${name}: ${error.message}`)
  console.log(`  ✗ ${name}`)
}

async function check(name, fn) {
  try {
    await fn()
    pass(name)
  } catch (error) {
    fail(name, error)
  }
}

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

console.log('DOM smoke（happy-dom + 构建产物）')

const { createApp, h, nextTick } = await import('vue')
const ElementPlus = (await import('element-plus')).default

/** 建一个装了 Element Plus 的 app：ElProTable 等内部用 v-loading 指令，必须有 EP */
function makeApp(render) {
  const app = createApp({ render })
  app.use(ElementPlus)
  return app
}
const lib = await import(pathToFileURL(resolve(root, 'dist/el-pro.js')).href).catch((error) => {
  fail('import dist', error)
  return null
})

if (lib) {
  await check('install 能注册全部组件（app.use 不是空操作）', () => {
    const app = makeApp(() => null)
    lib.install(app)
    const registered = Object.keys(app._context.components ?? {})
    assert(registered.length >= 20, `只注册了 ${registered.length} 个组件`)
    assert(registered.includes('ElProTable'), '没注册 ElProTable')
    assert(registered.includes('ElProRichText'), '没注册 ElProRichText')
  })

  await check('ElProStatistic 能在产物里渲染出 DOM', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const app = makeApp(() => h(lib.ElProStatistic, { title: '冒烟', value: 1234 }))
    app.mount(host)
    await nextTick()
    const text = host.textContent ?? ''
    assert(text.includes('冒烟'), '标题没渲染')
    assert(text.includes('1,234'), `数值没渲染（实际文本：${text.slice(0, 40)}）`)
    app.unmount()
    host.remove()
  })

  await check('ElProRichText 在产物里完成 Quill 初始化', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const app = makeApp(() => h(lib.ElProRichText, { modelValue: '<p>冒烟内容</p>', height: 120 }))
    app.mount(host)
    // Quill 是动态 import，等它完成
    let ready = false
    for (let i = 0; i < 40 && !ready; i++) {
      await new Promise((r) => setTimeout(r, 25))
      ready = !!host.querySelector('.ql-editor')
    }
    assert(ready, 'Quill 未完成初始化（.ql-editor 不存在）')
    assert(host.querySelector('.ql-toolbar'), '工具栏未渲染')
    assert(
      (host.querySelector('.ql-editor')?.textContent ?? '').includes('冒烟内容'),
      '初始内容未写入',
    )
    // 初始化失败出口不该亮起
    assert(!host.textContent.includes('初始化失败'), '组件进入了 initError 状态')
    app.unmount()
    host.remove()
  })

  await check('ElProTable 能在产物里挂载（不依赖 mock 请求）', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const app = makeApp(() =>
      h(lib.ElProTable, {
        columns: [{ prop: 'name', label: '名称' }],
        request: async () => ({ data: [{ id: 1, name: '冒烟行' }], total: 1 }),
        pagination: false,
        search: false,
        options: false,
      }),
    )
    app.mount(host)
    let found = false
    for (let i = 0; i < 40 && !found; i++) {
      await new Promise((r) => setTimeout(r, 25))
      found = (host.textContent ?? '').includes('冒烟行')
    }
    assert(found, '表格数据没渲染出来')
    app.unmount()
    host.remove()
  })
}

if (failures.length) {
  console.error(`\nDOM smoke 失败 ${failures.length} 项：`)
  failures.forEach((f) => console.error(`  - ${f}`))
  process.exit(1)
}
console.log('\nDOM smoke 通过')
