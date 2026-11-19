import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import { visualizer } from 'rollup-plugin-visualizer'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

/**
 * 外置依赖：使用方自己装，不打进产物。报告标题也从这份清单生成，避免两处漂移。
 * - async-validator：与 element-plus 自带的是同一个包（^4.2.5），静态 external 让两边共用一份
 * - sortablejs：只被 ElProTable 的 dragSortKey 行拖拽用（静态 import + external；消费侧是否真正省字节由使用方打包配置决定）
 */
const LIB_EXTERNAL = ['vue', 'element-plus', 'monaco-editor', 'quill', 'async-validator', 'sortablejs']

export default defineConfig(({ mode }) => {
  const alias = { '@': r('./src') }
  /**
   * analyze 是 lib 构建的测量模式（`npm run build:analyze`）：
   * 产物与报告都落到 .scratch/size，不碰 dist，所以不需要 dts，也不会把一份
   * 缺 .d.ts 的产物留在 dist 里等着被打包发布。
   */
  const analyze = mode === 'analyze'
  const isLib = mode === 'lib' || analyze

  if (!isLib) {
    return {
      plugins: [vue()],
      resolve: { alias },
      server: { port: 5273, host: '127.0.0.1' },
      /*
       * demo 构建输出隔离到 dist-demo：默认会共用库模式的 dist/，
       * 先 build 后 build:demo 会把库产物清掉，发包前一跑 demo 就坏。
       */
      build: { outDir: 'dist-demo' },
    }
  }

  return {
    plugins: [
      vue(),
      analyze
        ? visualizer({
            // .scratch 已在 .gitignore，报告不入库
            filename: r('./.scratch/size/report.html'),
            title: `el-pro-components lib 模块归因（external: ${LIB_EXTERNAL.join(' / ')}）`,
            template: 'treemap',
            gzipSize: true,
            brotliSize: true,
          })
        : dts({
            include: ['src'],
            outDir: 'dist',
            insertTypesEntry: true,
            strictOutput: false,
            tsconfigPath: './tsconfig.json',
          }),
    ],
    resolve: { alias },
    build: {
      outDir: analyze ? '.scratch/size/dist' : 'dist',
      lib: {
        entry: r('./src/index.ts'),
        name: 'ElProComponents',
        formats: ['es', 'umd'],
        fileName: (format) => (format === 'es' ? 'el-pro.js' : 'el-pro.umd.cjs'),
      },
      cssCodeSplit: false,
      rollupOptions: {
        external: LIB_EXTERNAL,
        output: {
          // 静态 external 的依赖 UMD 都要全局名（浏览器用法与 element-plus 一样要求自己挂全局）
          globals: {
            vue: 'Vue',
            'element-plus': 'ElementPlus',
            'async-validator': 'AsyncValidator',
            'sortablejs': 'Sortable',
          },
          exports: 'named',
          assetFileNames: (info) =>
            info.name === 'style.css' ? 'el-pro.css' : (info.name ?? '[name][extname]'),
        },
      },
    },
  }
})
