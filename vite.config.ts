import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig(({ mode }) => {
  const alias = { '@': r('./src') }
  const isLib = mode === 'lib'

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
      dts({
        include: ['src'],
        outDir: 'dist',
        insertTypesEntry: true,
        strictOutput: false,
        tsconfigPath: './tsconfig.json',
      }),
    ],
    resolve: { alias },
    build: {
      lib: {
        entry: r('./src/index.ts'),
        name: 'ElProComponents',
        formats: ['es', 'umd'],
        fileName: (format) => (format === 'es' ? 'el-pro.js' : 'el-pro.umd.cjs'),
      },
      cssCodeSplit: false,
      rollupOptions: {
        external: ['vue', 'element-plus'],
        output: {
          globals: { vue: 'Vue', 'element-plus': 'ElementPlus' },
          exports: 'named',
          assetFileNames: (info) =>
            info.name === 'style.css' ? 'el-pro.css' : (info.name ?? '[name][extname]'),
        },
      },
    },
  }
})
