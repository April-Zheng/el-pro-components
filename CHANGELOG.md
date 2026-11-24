# el-pro-components

## 0.4.0

### Minor Changes

- f1e49bc: quill 从 `dependencies` 改为可选 peer 依赖（与 monaco-editor 一致）：不用富文本的项目 `npm i el-pro-components` 不再连带安装约 4MB 的 quill 及其依赖。**升级提示**：用到 `ElProRichText` 或 `valueType: 'richText'` 的项目需要自行 `npm i quill`，否则组件的初始化会失败并给出提示
- 1f0653b: **破坏性变更**：富文本主题样式（Quill snow）从 `el-pro-components/style.css` 拆成独立出口 `el-pro-components/richtext.css`。不用富文本的项目少下载约 23.8KB raw / 3.5KB gzip，约占原样式表三分之一。**升级提示**：用到 `ElProRichText` 或 `valueType: 'richText'` 的项目需要补一行 `import 'el-pro-components/richtext.css'`（或直接 `import 'quill/dist/quill.snow.css'`），否则编辑器能用但工具栏与正文没有样式

## 0.3.0

### Minor Changes

- d3d6c3a: ElProCodeEditor：Monaco 封装，作为可选 peer 依赖按需动态加载，附带 Worker 注册助手；ProForm 新增 `valueType: 'codeEditor'`
- d3d6c3a: ElProRichText：Quill 2 封装，支持图片上传注入与粘贴/拖拽管道（同一张图只插入一次）；Quill 动态加载，SSR 构建不再因 `document is not defined` 崩溃；ProForm 新增 `valueType: 'richText'`
- d3d6c3a: ElProStatistic / StatisticCard 支持数字滚动（`countUp`）：中间帧取整并走千分位，尊重 `prefers-reduced-motion`
