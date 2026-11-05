---
layout: home

hero:
  name: ElProComponents
  text: Element Plus 体系的 CRUD 高阶组件
  tagline: 一份 columns，同时驱动搜索栏、表格列、列设置面板、表单和详情页
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: 组件总览
      link: /components/table
    - theme: alt
      text: GitHub 源码灵感来源
      link: https://procomponents.ant.design/
      target: _blank
      rel: noopener

features:
  - icon: 🗂
    title: 一份 columns，多处使用
    details: 表格里显示 tag 的字段，详情页自动是同一个 tag，表单里是同一个下拉——不用维护两套字典。
  - icon: ⚡
    title: 请求生命周期接管
    details: 分页、排序、竞态丢弃、跨页勾选、轮询、游标分页，写一个 request 函数就够。
  - icon: 🧩
    title: schema 表达不了的，插槽补
    details: 列自定义渲染走 #${prop} 插槽；结构性列（展开行）用默认插槽插任意 el-table-column。
  - icon: ✏️
    title: 行内编辑不丢输入
    details: 保存失败留在编辑态、草稿与数据隔离、新增行回传主键后自动转正。
  - icon: 🧭
    title: 页面骨架齐全
    details: ProLayout + PageContainer：页头可吸顶、内容区可限宽、底部固定条随侧栏折叠避让。
  - icon: 📋
    title: 行为对齐源码
    details: 抽象搬自 Ant Design ProComponents，并按 Element Plus 的习惯重新设计 API。
---
