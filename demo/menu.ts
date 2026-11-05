import { h } from 'vue'
import type { ProLayoutMenuItem } from '@/index'

const IconList = () =>
  h('svg', { viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.4 }, [
    h('rect', { x: 2, y: 3, width: 12, height: 10, rx: 1.5 }),
    h('path', { d: 'M2 6.5h12M6.2 6.5V13' }),
  ])

/** 侧边菜单。path 与 pages 里的路由分支一一对应 */
export const menus: ProLayoutMenuItem[] = [
  { title: '订单管理（真业务）', path: '/order', icon: IconList },
  { title: '用户列表', path: '/users' },
  { title: '页面容器', path: '/page-container' },
  { title: '分组表头', path: '/grouped' },
  { title: '表单示例', path: '/form' },
  { title: '弹窗/抽屉表单', path: '/form-container' },
  { title: '字段组表单', path: '/form-list' },
  { title: '分步表单', path: '/steps-form' },
  { title: '轻量筛选', path: '/light-filter' },
  { title: '查询筛选区', path: '/query-filter' },
  { title: '详情示例', path: '/detail' },
  { title: '卡片示例', path: '/card' },
  { title: '指标卡', path: '/statistic' },
  { title: '列表示例', path: '/list' },
  { title: '行内编辑', path: '/editable' },
  { title: '数据生命周期', path: '/data-mode' },
  { title: '表格交互增强', path: '/table-interactive' },
  { title: '表单能力补齐', path: '/form-advanced' },
  { title: '展示类补齐', path: '/display-advanced' },
  {
    title: '分组菜单',
    children: [
      { title: '一级子项', path: '/group/a' },
      { title: '二级嵌二级', children: [{ title: '深层子项', path: '/group/b/c', badge: 3 }] },
    ],
  },
]

/** 支持 ?page=/form 直接打开某个页面，方便截图与分享 */
export function initialPage(): string {
  const fromQuery =
    typeof location !== 'undefined' ? new URLSearchParams(location.search).get('page') : null
  return fromQuery || '/users'
}
