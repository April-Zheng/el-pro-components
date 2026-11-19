---
"el-pro-components": minor
---

**破坏性变更**：富文本主题样式（Quill snow）从 `el-pro-components/style.css` 拆成独立出口 `el-pro-components/richtext.css`。不用富文本的项目少下载约 23.8KB raw / 3.5KB gzip，约占原样式表三分之一。**升级提示**：用到 `ElProRichText` 或 `valueType: 'richText'` 的项目需要补一行 `import 'el-pro-components/richtext.css'`（或直接 `import 'quill/dist/quill.snow.css'`），否则编辑器能用但工具栏与正文没有样式
