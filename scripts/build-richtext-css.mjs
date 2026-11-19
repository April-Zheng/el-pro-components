/**
 * 产出 dist/richtext.css —— 富文本（Quill snow 主题）样式独立出口。
 *
 * 为什么走复制而不是 vite：主题样式是 quill 自带的成品 CSS，本库不改一行；让 vite
 * 再跑一次构建只会多一份配置和一个空 JS 壳。发布时这份样式被冻结成构建机上 quill 的
 * 版本（当前 peer 范围 ^2.0.0，对应 devDependency 装到的那一版），quill 的 2.x 主题
 * 样式稳定，但调整 peer 范围时要重跑构建，产物才会跟着走。
 *
 * 依据：.scratch/size/report.md —— 这份样式占 el-pro.css 的 23.8KB raw / 3.5KB gzip，
 * 而不用富文本的项目占绝大多数，静态内联等于人人都付这份钱。
 */
import { createRequire } from 'node:module'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)

// 上一步 vite build 负责建目录；单独跑本脚本时给一句明确原因，而不是裸 ENOENT
if (!existsSync(resolve(root, 'dist'))) {
  console.error('[richtext-css] dist 不存在，先跑 vite build')
  process.exit(1)
}

let source
try {
  source = require.resolve('quill/dist/quill.snow.css')
} catch {
  console.error('[richtext-css] 找不到 quill/dist/quill.snow.css，检查 quill 是否已安装')
  process.exit(1)
}

// 版权抬头：样式原样来自 quill（BSD-3-Clause），搬运后必须留下出处
const { version, license } = require('quill/package.json')
const banner = `/* quill.snow.css from quill@${version} (${license}) — el-pro-components 富文本主题样式 */\n`
const css = banner + readFileSync(source, 'utf8')

const target = resolve(root, 'dist/richtext.css')
writeFileSync(target, css)
console.log(`[richtext-css] dist/richtext.css ← quill@${version}（${Buffer.byteLength(css)} B）`)
