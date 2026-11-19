---
"el-pro-components": minor
---

quill 从 `dependencies` 改为可选 peer 依赖（与 monaco-editor 一致）：不用富文本的项目 `npm i el-pro-components` 不再连带安装约 4MB 的 quill 及其依赖。**升级提示**：用到 `ElProRichText` 或 `valueType: 'richText'` 的项目需要自行 `npm i quill`，否则组件的初始化会失败并给出提示
