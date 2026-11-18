# el-pro-components

## 0.3.0

### Minor Changes

- d3d6c3a: ElProCodeEditor：Monaco 封装，作为可选 peer 依赖按需动态加载，附带 Worker 注册助手；ProForm 新增 `valueType: 'codeEditor'`
- d3d6c3a: ElProRichText：Quill 2 封装，支持图片上传注入与粘贴/拖拽管道（同一张图只插入一次）；Quill 动态加载，SSR 构建不再因 `document is not defined` 崩溃；ProForm 新增 `valueType: 'richText'`
- d3d6c3a: ElProStatistic / StatisticCard 支持数字滚动（`countUp`）：中间帧取整并走千分位，尊重 `prefers-reduced-motion`
