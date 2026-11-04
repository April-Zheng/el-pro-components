# el-pro-components

Vue 3 + Element Plus 体系的 CRUD 高阶组件库：ProTable / ProForm / ProDescriptions / ProLayout，由列 schema 驱动。

### Project standards

本仓库的强制工程规范见 `docs/agents/project-standards.md`。实现、测试与评审必须逐条对照；`/code-review` 的 Standards 轴与 `/implement` 的收口验收以该文件为准。

### 关键事实

- 技术栈：Vue 3.4 + TypeScript 5.4（strict）+ Element Plus 2.8，Vite 5 lib 模式构建，vitest 测试。
- 验证命令：`npm run typecheck` / `test` / `build` / `build:demo`，交付前全绿。
- 对标：Ant Design ProComponents（React 版）；迁移差异与还原度报告见 `.scratch/pro-components-parity/report.md`（临时工作区，不入库）。
