<script setup lang="ts">
/**
 * ElProLayout —— 侧边菜单 + 面包屑 + 内容区。
 *
 * 刻意不 import vue-router：这个组件只负责「长什么样」，
 * 跳转交给 el-menu 的 router 模式或使用方自己监听 @select。
 * 这样它既能用在 vue-router 项目里，也能用在自研路由里。
 *
 * 顶栏和侧栏都是 `position: sticky`：整页滚动（文档流）不变，但这两块不跟着走。
 * 一开始两者都是静态定位，滚动时一起被卷上去 —— 菜单没了、顶栏没了，
 * 页头吸顶后正好占住视口顶部，看起来就是「顶栏被页头盖住了」。
 * 用 sticky 而不是「内容区内部滚动」的理由：内部滚动会让 el-affix 的坐标系
 * 变成那个滚动容器，页面里所有吸顶都得跟着改 offset；文档流滚动则各处零改动。
 */
import { computed, provide, ref } from 'vue'
import { ElBreadcrumb, ElBreadcrumbItem, ElMenu, ElScrollbar } from 'element-plus'
import { PRO_LAYOUT, PRO_LAYOUT_HEADER_HEIGHT } from '../../core/layoutContext'
import type { ProLayoutMenuItem } from '../../types'
import MenuItem from './MenuItem.vue'

defineOptions({ name: 'ElProLayout' })

const props = withDefaults(
  defineProps<{
    menus: ProLayoutMenuItem[]
    /** 当前激活路径，通常传 route.fullPath 或 route.path */
    activePath?: string
    title?: string
    /** 交给 el-menu 的 router 模式处理跳转 */
    router?: boolean
    /** 初始是否折叠 */
    defaultCollapsed?: boolean
    siderWidth?: number
    collapsedWidth?: number
    /** 隐藏侧边栏 */
    hideSider?: boolean
    /** 隐藏面包屑 */
    hideBreadcrumb?: boolean
  }>(),
  {
    activePath: '',
    router: true,
    defaultCollapsed: false,
    siderWidth: 220,
    collapsedWidth: 64,
  },
)

const emit = defineEmits<{ select: [string] }>()

const collapsed = ref(props.defaultCollapsed)

const visibleMenus = computed(() => props.menus.filter((m) => !m.hideInMenu))

/** 在菜单树里找当前路径的完整链路 */
function findTrail(
  items: ProLayoutMenuItem[],
  path: string,
  trail: ProLayoutMenuItem[] = [],
): ProLayoutMenuItem[] | null {
  for (const item of items) {
    const next = [...trail, item]
    if (item.path && item.path === path) return next
    if (item.children?.length) {
      const found = findTrail(item.children, path, next)
      if (found) return found
    }
  }
  return null
}

/** 详情页这类路径（/user/123）匹配不到菜单项时，退化为最长前缀匹配 */
function findLongestPrefix(items: ProLayoutMenuItem[], path: string) {
  let best: ProLayoutMenuItem[] = []
  const walk = (list: ProLayoutMenuItem[], trail: ProLayoutMenuItem[]) => {
    for (const item of list) {
      const next = [...trail, item]
      if (item.path && path.startsWith(item.path) && item.path.length > (best.at(-1)?.path?.length ?? 0)) {
        best = next
      }
      if (item.children?.length) walk(item.children, next)
    }
  }
  walk(items, [])
  return best
}

const breadcrumbs = computed(() => {
  if (!props.activePath) return []
  const exact = findTrail(props.menus, props.activePath)
  const trail = exact ?? findLongestPrefix(props.menus, props.activePath)
  return trail.filter((i) => !i.hideInBreadcrumb)
})

const siderStyle = computed(() => ({
  width: `${collapsed.value ? props.collapsedWidth : props.siderWidth}px`,
}))

/**
 * 把当前侧栏宽度挂成 CSS 变量。
 * 给底部固定工具条（ElProFooterToolbar 的 offsetLeft）用 —— 它钉在视口上，
 * 得知道左边被菜单占了多少，而这个值只有布局自己清楚。
 *
 * 同时挂一个顶栏高度变量：页头吸顶的 offset 要吃掉它，CSS 和 JS 共用一处定义。
 */
const layoutStyle = computed(() => ({
  '--el-pro-sider-width': props.hideSider
    ? '0px'
    : `${collapsed.value ? props.collapsedWidth : props.siderWidth}px`,
  '--el-pro-layout-header-height': `${PRO_LAYOUT_HEADER_HEIGHT}px`,
}))

/** 页面层（ElProPageContainer）靠这个知道吸顶要往下让多少 */
provide(PRO_LAYOUT, { headerHeight: PRO_LAYOUT_HEADER_HEIGHT })
</script>

<template>
  <div class="el-pro-layout" :class="{ 'is-collapsed': collapsed }" :style="layoutStyle">
    <aside v-if="!hideSider" class="el-pro-layout__sider" :style="siderStyle">
      <div class="el-pro-layout__logo">
        <slot name="logo" :collapsed="collapsed">
          <span class="el-pro-layout__logo-text">{{ collapsed ? (title ?? 'Pro').slice(0, 1) : title }}</span>
        </slot>
      </div>

      <ElScrollbar class="el-pro-layout__menu">
        <ElMenu
          :default-active="activePath"
          :collapse="collapsed"
          :collapse-transition="false"
          :router="router"
          unique-opened
          @select="(index: string) => emit('select', index)"
        >
          <MenuItem
            v-for="item in visibleMenus"
            :key="item.path ?? item.title"
            :item="item"
            :active-path="activePath"
          />
        </ElMenu>
      </ElScrollbar>
    </aside>

    <div class="el-pro-layout__main">
      <header class="el-pro-layout__header">
        <div class="el-pro-layout__header-left">
          <button
            v-if="!hideSider"
            type="button"
            class="el-pro-layout__collapse"
            :title="collapsed ? '展开菜单' : '收起菜单'"
            @click="collapsed = !collapsed"
          >
            <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M2.5 4h11M2.5 8h11M2.5 12h11" stroke-linecap="round" />
            </svg>
          </button>

          <ElBreadcrumb v-if="!hideBreadcrumb && breadcrumbs.length" separator="/" class="el-pro-layout__breadcrumb">
            <ElBreadcrumbItem v-for="(item, i) in breadcrumbs" :key="item.path ?? item.title">
              <span :class="{ 'is-current': i === breadcrumbs.length - 1 }">{{ item.title }}</span>
            </ElBreadcrumbItem>
          </ElBreadcrumb>
          <slot name="headerLeft" />
        </div>

        <div class="el-pro-layout__header-right">
          <slot name="headerRight" />
        </div>
      </header>

      <main class="el-pro-layout__content">
        <slot />
      </main>

      <footer v-if="$slots.footer" class="el-pro-layout__footer">
        <slot name="footer" />
      </footer>
    </div>
  </div>
</template>

<style>
.el-pro-layout {
  display: flex;
  min-height: 100vh;
  background: var(--el-bg-color-page, #f5f7fa);
}
/*
 * 侧栏钉住：整页滚动时它不动。
 * `align-self: flex-start` 是必须的 —— 默认 stretch 会让它跟容器一样高，
 * 高度一满就没有「可滑动余量」，sticky 等于失效（这个坑很隐蔽：看上去像没生效）。
 * 高度取 100vh，菜单超出时由内层 el-scrollbar 自己滚。
 */
.el-pro-layout__sider {
  position: sticky;
  top: 0;
  align-self: flex-start;
  display: flex;
  flex-direction: column;
  flex: none;
  height: 100vh;
  background: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color-lighter);
  transition: width 0.2s ease;
  overflow: hidden;
}
.el-pro-layout__logo {
  display: flex;
  align-items: center;
  justify-content: center;
  height: var(--el-pro-layout-header-height, 56px);
  flex: none;
  padding: 0 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  overflow: hidden;
}
.el-pro-layout__logo-text {
  font-size: 16px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.el-pro-layout__menu {
  flex: 1;
  /* 允许收缩到容器高度以内，否则 el-scrollbar 撑高、菜单滚不动 */
  min-height: 0;
  padding: 8px 0;
}
.el-pro-layout__menu .el-menu {
  border-right: none;
}
.el-pro-layout__main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}
/*
 * 顶栏也钉住。z-index 只求「盖住内容」：
 * 页面吸顶的页头在它下面（offset = 顶栏高度），两者不重叠，不需要抢层级。
 */
.el-pro-layout__header {
  position: sticky;
  top: 0;
  z-index: 11;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  height: var(--el-pro-layout-header-height, 56px);
  flex: none;
  padding: 0 16px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.el-pro-layout__header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.el-pro-layout__header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
}
.el-pro-layout__collapse {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  background: transparent;
  border-radius: 4px;
  color: var(--el-text-color-regular);
  cursor: pointer;
}
.el-pro-layout__collapse:hover {
  background: var(--el-fill-color-light);
  color: var(--el-color-primary);
}
.el-pro-layout__breadcrumb {
  font-size: 13px;
}
.el-pro-layout__breadcrumb .is-current {
  color: var(--el-text-color-primary);
  font-weight: 500;
}
.el-pro-layout__content {
  flex: 1;
  padding: 16px;
  min-width: 0;
}
.el-pro-layout__footer {
  padding: 12px 16px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-align: center;
}
</style>
