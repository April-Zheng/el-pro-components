/**
 * 菜单数据管道：route 记录 → ProLayoutMenuItem。
 *
 * 为什么是纯函数：ElProLayout 刻意不 import vue-router（它只负责「长什么样」，
 * 跳转交给 el-menu 的 router 模式或使用方自己监听 @select）。但真实项目里的
 * 菜单十有八九来自路由表，让每个使用方手写转换等于把这段样板代码复制 N 遍。
 *
 * 所以这里只定义「长得像 vue-router 路由记录」的最小结构（RouteLike），
 * 对真实 RouteRecordRaw 结构兼容：多余字段忽略，meta 不存在时按空对象处理。
 * 不 import vue-router 的类型 —— 依赖关系保持单向（使用方把路由表传进来）。
 */
import type { Component } from 'vue'
import type { ProLayoutMenuItem } from '../types'

/** 与 vue-router 的 RouteRecordRaw 结构兼容的最小子集 */
export interface ProRouteLike {
  path?: string
  name?: string | symbol
  /** redirect 记录不是页面，不进菜单 */
  redirect?: unknown
  meta?: {
    title?: string
    icon?: Component | string
    hideInMenu?: boolean
    hideInBreadcrumb?: boolean
    badge?: string | number
    /** 外部链接（route 上没有，meta 扩展位） */
    href?: string
    /** 跳转 query（route 上没有，meta 扩展位） */
    query?: Record<string, any>
  }
  children?: ProRouteLike[]
}

export interface RouteToMenuOptions {
  /** 递归时拼接父路径用，外部一般不传 */
  parentPath?: string
}

function joinPath(parent: string | undefined, child: string | undefined): string | undefined {
  if (!child) return undefined
  if (child.startsWith('/') || !parent) return child
  return `${parent.replace(/\/$/, '')}/${child}`
}

function toMenuItem(route: ProRouteLike, options: RouteToMenuOptions): ProLayoutMenuItem | null {
  const title = route.meta?.title ?? (typeof route.name === 'string' ? route.name : undefined)
  // 没有可展示标题的记录（纯布局节点 / redirect）不进菜单；
  // meta.hideInMenu 与菜单层的 hideInMenu 语义一致：不进菜单
  if (!title || route.meta?.hideInMenu) return null

  const item: ProLayoutMenuItem = {
    title,
    path: joinPath(options.parentPath, route.path),
  }
  const meta = route.meta
  if (meta?.icon !== undefined) item.icon = meta.icon
  if (meta?.hideInBreadcrumb) item.hideInBreadcrumb = true
  if (meta?.badge !== undefined) item.badge = meta.badge
  if (meta?.href) item.href = meta.href
  if (meta?.query) item.query = meta.query

  if (route.children?.length) {
    const children = routeToMenu(route.children, { parentPath: item.path })
    if (children.length) item.children = children
  }
  return item
}

/**
 * 路由记录数组 → 菜单数组。
 *
 * 规则：
 * - meta.hideInMenu 的记录不进菜单（与菜单项的 hideInMenu 同语义）；
 * - 无 meta.title 且 name 不是字符串的记录跳过（redirect、纯布局节点）；
 * - 子 path 不以 / 开头时与父 path 拼接（vue-router 的相对路径语义）；
 * - children 转换后为空的记录作为叶子项保留（父级可点击、无展开箭头）；
 * - meta 上的 hideInBreadcrumb / badge / icon 原样映射。
 */
export function routeToMenu(routes: ProRouteLike[], options: RouteToMenuOptions = {}): ProLayoutMenuItem[] {
  const items: ProLayoutMenuItem[] = []
  for (const route of routes) {
    const item = toMenuItem(route, options)
    if (item) items.push(item)
  }
  return items
}
