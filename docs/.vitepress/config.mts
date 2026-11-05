import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitepress'

// 文档站导航：与 README「组件」清单一一对应
export default defineConfig({
  lang: 'zh-CN',
  title: 'ElProComponents',
  description: 'Element Plus 体系的 CRUD 高阶组件：一份 columns，驱动搜索栏、表格、表单与详情页',

  head: [['meta', { name: 'theme-color', content: '#409eff' }]],

  markdown: {
    lineNumbers: false,
  },

  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/getting-started', activeMatch: '/guide/' },
      { text: '组件', link: '/components/table', activeMatch: '/components/' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '指南',
          items: [
            { text: '快速开始', link: '/guide/getting-started' },
            { text: 'valueType 词汇表', link: '/guide/value-type' },
            { text: '一条完整链路：订单页', link: '/guide/order-page' },
          ],
        },
      ],
      '/components/': [
        {
          text: '通用',
          items: [
            { text: 'ElProTable', link: '/components/table' },
            { text: 'ElProEditableTable', link: '/components/editable-table' },
            { text: 'ElProQueryFilter', link: '/components/query-filter' },
            { text: 'ElProLightFilter', link: '/components/light-filter' },
          ],
        },
        {
          text: '表单',
          items: [
            { text: 'ElProForm', link: '/components/form' },
            { text: '字段组 formList', link: '/components/form-list' },
            { text: 'ElProStepsForm', link: '/components/steps-form' },
            { text: 'ElProModalForm / ElProDrawerForm', link: '/components/modal-form' },
          ],
        },
        {
          text: '展示与页面',
          items: [
            { text: 'ElProDescriptions', link: '/components/descriptions' },
            { text: 'ElProLayout', link: '/components/layout' },
            { text: 'ElProPageContainer', link: '/components/page-container' },
            { text: 'ElProCard', link: '/components/card' },
            { text: 'ElProStatistic / StatisticCard', link: '/components/statistic' },
            { text: 'ElProCheckCard', link: '/components/check-card' },
            { text: 'ElProList', link: '/components/list' },
            { text: 'ElProSkeleton', link: '/components/skeleton' },
          ],
        },
      ],
    },

    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索文档', buttonAriaLabel: '搜索文档' },
          modal: {
            noResultsText: '没有找到结果',
            resetButtonTitle: '清除查询条件',
            displayDetails: '显示详细列表',
            footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' },
          },
        },
      },
    },

    outline: { level: [2, 3], label: '本页目录' },

    docFooter: { prev: '上一页', next: '下一页' },
    lastUpdated: { text: '最后更新' },
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
  },

  vite: {
    resolve: {
      // demo 里直接写 `import { ElProTable } from 'el-pro-components'`——
      // 展示给用户的代码复制就能用；dev/build 时别名到仓库源码，跑的仍是仓库里的实现
      alias: {
        'el-pro-components': fileURLToPath(new URL('../../src/index.ts', import.meta.url)),
      },
    },
    server: { fs: { allow: ['..'] } },
  },
})
