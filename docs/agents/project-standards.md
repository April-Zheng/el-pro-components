# el-pro-components 工程规范

本文件由 `/project-standards`（generate 模式）于 2026-11-04 生成：全量探索 43 个源文件后按证据定稿，每条规则标注来源与证据强度。`/implement`、`/code-review` 的收口验收与 Standards 轴逐条对照本文件执行。

- 标 ⚠️ 的条目**不强制**：证据不足两个变体并存，等人类裁决后才升级为规则。
- **只有人类可以放宽规则**，Agent 不得自行修改本文件；发现规则与现实不符时，要么修代码，要么提请人类修订本文件——静默漂移不允许。
- 旧代码与新规则冲突时按 **touch-and-fix** 处理：改到哪修到哪，不做全量迁移。

## 1. 骨架与分层

1.1 组件目录：`src/components/<Name>/<Name>.vue`，一个公共组件一个目录。同目录放私有子组件（如 `SearchForm.vue`、`MenuItem.vue`、`TableToolbar.vue`），**不加 ElPro 前缀**——前缀只给公共导出。（证据：22/22 组件目录一致）

1.2 单文件组件统一 `<script setup lang="ts">`；props 用类型-only 的 `defineProps<Props>()` 泛型 + `withDefaults`；公共组件必须 `defineOptions({ name })` 且与导出名一致。（证据：30/30 script setup；29/29 defineOptions）

1.3 分层固定三处：

- 公共类型集中 `src/types.ts`（含面向使用方的 JSDoc），不在组件里散落公开类型；
- 框架无关的核心逻辑放 `src/core/`（如 `useTable.ts`、`valueType.ts`），纯 TS、可被单测直接驱动；
- valueType 渲染器放 `src/fields/`（`CellRenderer.vue` 读态、`FormField.vue` 编辑态）。

（证据：全部 9 个 core 模块、2 个 field 渲染器均无例外）

1.4 命令式 API 用 `defineExpose` 暴露，逐项中文 JSDoc；容器类型（如 `ProFormInstance`）从实现模块导出供业务引用。（证据：9 处 defineExpose）

## 2. API 设计取向

2.1 **Element Plus 优先**：列/表单配置里凡是 EP 原生字段（`label` / `prop` / `sortable` / `showOverflowTooltip` / `rules` …）一律原样透传，不重命名；只在 EP 没有对应概念时新增扩展字段，且扩展字段用独立前缀（`valueType` / `valueEnum` / `search` …）。（证据：`types.ts` 头部声明 + 全库透传实现）

2.2 事件命名：单词事件用小写（`search` / `reset` / `change`）；**多词事件用 camelCase**（`valuesChange` / `openChange` / `collapsedChange` / `loading-change` 类 kebab 写法为旧代码，touch-and-fix）。`v-model` 一律 `update:xxx`。

2.3 公共 API 的泛型必须给默认值（如 `useTable<T = any>`），内部避免无理由的 `any`。

## 3. 样式

3.1 组件样式用**非 scoped** `<style>`，类名 `el-pro-*` 前缀 + `is-*` 状态类。理由：库模式 `cssCodeSplit: false` 打成单 `el-pro.css`，scoped 会破坏使用方的覆盖能力。（证据：27/27 非 scoped；261 处 `el-pro-` 类）

3.2 主题定制点用 CSS 变量暴露（如 `--el-pro-statistic-trend-up-color`），不写死色值。

## 4. 依赖与构建

4.1 `vue` / `element-plus` 保持 peerDependencies，且必须同步出现在 `vite.config.ts` 的 `rollupOptions.external`；新增运行时依赖（如 `async-validator`）必须进 `dependencies` 并确认不进产物。（证据：vite.config.ts + 2026-11-04 修复中新增 async-validator 的处理）

4.2 库入口 `src/index.ts`：命名导出 + `ElProComponents` 插件安装 + `export * from './types'`；新增公共组件三处都要登记（import、export、components 数组）。

## 5. 测试与验证底线

5.1 `src/core/` 的纯逻辑模块**必须有单测**（vitest，`tests/*.spec.ts`），行为变更先改测试；组件渲染行为靠 demo 页面验收。

5.2 交付前必须全绿：

```bash
npm run typecheck    # vue-tsc --noEmit
npm run test         # vitest run
npm run build        # lib 构建
npm run build:demo   # demo 可用
```

5.3 新组件/新行为要在 `demo/pages/` 配真实业务页——demo 即验收用例，`build:demo` 是它的人工检查入口。（证据：提交 a70e745 的定位声明）

## 6. 注释与文档

6.1 注释用中文 JSDoc，解释**设计取舍和为什么**，不复述代码；容易被误用的行为（如受控/非受控双轨、竞态双保险）必须在实现处写明。（证据：useTable.ts、useFormContainer.ts 等的既有风格）

## 7. 配置与密钥

7.1 无 `.env` 文件、无密钥；dev 端口固定 5273（`vite.config.ts`）。如未来引入环境变量，用 `${ENV:default}` 形式，禁止硬编码密钥。

## 8. ⚠️ 待裁决项（不强制）

- **lint / format 工具缺失**：仓库无 eslint / prettier。现状如实记录；是否引入由人类另起任务决定。
- **公共 API 与 React 版的命名差异**（`digit`→`number`、`initialValue`→`defaultValue` 等）：按「EP 优先」取向视为有意设计，不算违规；迁移指引在 README。

## 维护

- 定期（或每次大改后）跑 `/project-standards` 的 audit 模式对照本文件检查代码。
- 规则与现实冲突时：修代码，或由人类修订本文件并记录一句话理由。两者都不做而继续漂移，是流程缺陷。
