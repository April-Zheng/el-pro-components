/**
 * 产物冒烟 —— SSR 阶段。
 *
 * 为什么单独一个脚本：这里必须在**没有 document 的纯 Node 环境**里 import 构建产物。
 * 已发生过的真实事故：ElProRichText 静态 import Quill，quill/core/emitter.js 在模块
 * 加载期访问 document，导致 VitePress/Nuxt 构建直接崩（CI 红过一次）。
 * 单元测试跑在 happy-dom 里、且会 mock 依赖，永远发现不了这类问题。
 *
 * 断言：
 * 1. dist 产物存在且非空
 * 2. 无 DOM 环境下 import 不抛错
 * 3. 关键导出齐全，且 install 是函数（曾因 UMD 包装丢失过）
 */
import { readFileSync, statSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const distFile = resolve(root, 'dist/el-pro.js')
const cssFile = resolve(root, 'dist/el-pro.css')

/** 关键导出：新增公共组件时在这里补一行，避免「导出了但忘了发」 */
const REQUIRED_EXPORTS = [
  'ElProTable',
  'ElProEditableTable',
  'ElProForm',
  'ElProQueryFilter',
  'ElProDescriptions',
  'ElProLayout',
  'ElProPageContainer',
  'ElProCard',
  'ElProList',
  'ElProStatistic',
  'ElProConfigProvider',
  'ElProCodeEditor',
  'ElProRichText',
  'ElProComponents',
  'install',
]

const failures = []

function check(name, fn) {
  try {
    fn()
    console.log(`  ✓ ${name}`)
  } catch (error) {
    failures.push(`${name}: ${error.message}`)
    console.log(`  ✗ ${name}`)
  }
}

console.log('SSR smoke（无 document 环境）')

check('dist/el-pro.js 存在且非空', () => {
  const size = statSync(distFile).size
  if (size < 1024) throw new Error(`产物过小：${size} bytes`)
})

check('dist/el-pro.css 存在且非空', () => {
  const size = statSync(cssFile).size
  if (size < 1024) throw new Error(`产物过小：${size} bytes`)
})

// 这一句是核心：没有 document，import 必须能完成
const lib = await import(pathToFileURL(distFile).href).catch((error) => {
  failures.push(`无 DOM 环境 import 抛错（SSR 会崩）: ${error.message}`)
  return null
})

if (lib) {
  console.log('  ✓ 无 DOM 环境 import 成功')
  check('关键导出齐全', () => {
    const missing = REQUIRED_EXPORTS.filter((name) => !(name in lib))
    if (missing.length) throw new Error(`缺少导出：${missing.join(', ')}`)
  })
  check('install 是函数（可用 app.use 注册）', () => {
    if (typeof lib.install !== 'function') throw new Error('install 不是函数')
  })
  check('ElProComponents.install 与具名 install 一致', () => {
    if (lib.ElProComponents?.install !== lib.install) {
      throw new Error('插件对象的 install 与具名导出不是同一个函数')
    }
  })
  check('组件都有 name（app.component 注册依赖它）', () => {
    // 排除插件对象（ElProComponents）与工具函数：它们不是组件
    const NON_COMPONENTS = new Set(['install', 'ElProComponents'])
    const anonymous = REQUIRED_EXPORTS.filter((key) => {
      if (NON_COMPONENTS.has(key)) return false
      const value = lib[key]
      return value && typeof value === 'object' && !value.name
    })
    if (anonymous.length) throw new Error(`缺少 name：${anonymous.join(', ')}`)
  })
}

// 产物里不该出现未 external 的重型依赖（monaco/quill 必须外置）
check('monaco / quill 未被内联进产物', () => {
  const code = readFileSync(distFile, 'utf8')
  // 内联的特征：出现 monaco 的 worker 注册或 quill 大段实现
  if (code.includes('MonacoEnvironment.getWorker')) throw new Error('monaco 被内联')
  if (code.includes('ql-editor') && code.length > 2_000_000) throw new Error('quill 疑似被内联')
})

if (failures.length) {
  console.error(`\nSSR smoke 失败 ${failures.length} 项：`)
  failures.forEach((f) => console.error(`  - ${f}`))
  process.exit(1)
}
console.log('\nSSR smoke 通过')
