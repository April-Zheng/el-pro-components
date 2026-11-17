<script setup lang="ts">
/**
 * ElProLayout —— 多形态布局：侧边菜单 / 顶部菜单 / 混合，+ 面包屑 + 内容区。
 *
 * 刻意不 import vue-router：这个组件只负责「长什么样」，
 * 跳转交给 el-menu 的 router 模式或使用方自己监听 @select。
 * 这样它既能用在 vue-router 项目里，也能用在自研路由里。
 * 路由表 → 菜单的转换用 core/menu.ts 的 `routeToMenu`（纯函数）。
 *
 * 三种形态（layout）：
 * - `'side'`：侧边菜单（默认，对齐 React 的 side）
 * - `'top'` ：菜单放进顶栏（horizontal），无侧栏
 * - `'mix'` ：一级菜单在顶栏，二级菜单在侧栏；`splitMenus` 时侧栏只显示
 *   当前一级项的子菜单（对齐 React splitMenus），没配则侧栏显示整棵树
 *
 * 顶栏和侧栏都是 `position: sticky`：整页滚动（文档流）不变，但这两块不跟着走。
 * 一开始两者都是静态定位，滚动时一起被卷上去 —— 菜单没了、顶栏没了，
 * 页头吸顶后正好占住视口顶部，看起来就是「顶栏被页头盖住了」。
 * 用 sticky 而不是「内容区内部滚动」的理由：内部滚动会让 el-affix 的坐标系
 * 变成那个滚动容器，页面里所有吸顶都得跟着改 offset；文档流滚动则各处零改动。
 *
 * 窄屏（<= sm）：侧栏退化为抽屉（el-drawer），折叠按钮变成抽屉开关 ——
 * 手机宽度下侧栏占 220px 会把内容挤没了，React 的移动端也是抽屉式。
 */
import { computed, onMounted, provide, ref, watch, watchEffect } from 'vue'
import {
  ElBreadcrumb,
  ElBreadcrumbItem,
  ElDrawer,
  ElMenu,
  ElScrollbar,
  ElWatermark,
} from 'element-plus'
import { useProLabel } from '../../core/configContext'
import { PRO_LAYOUT, PRO_LAYOUT_HEADER_HEIGHT } from '../../core/layoutContext'
import { BREAKPOINT_ORDER, useBreakpoint } from '../../core/responsive'
import type {
  PageTitleInfo,
  ProLayoutMenuItem,
  ProLayoutMode,
  ProWatermarkConfig,
} from '../../types'
import MenuItem from './MenuItem.vue'

defineOptions({ name: 'ElProLayout' })

/** 内置文案：折叠按钮 title 走全局配置层（ProConfigProvider 的 labels），可被覆盖 */
const getLabel = useProLabel()

const props = withDefaults(
  defineProps<{
    /** 菜单。`menuRequest` 存在时以异步加载结果为准，这条仅作回落 */
    menus?: ProLayoutMenuItem[]
    /** 当前激活路径，通常传 route.fullPath 或 route.path */
    activePath?: string
    /** 布局 title，出现在 logo / 页面标题里 */
    title?: string
    /** 交给 el-menu 的 router 模式处理跳转 */
    router?: boolean
    /** 布局形态：side（侧栏）/ top（顶栏菜单）/ mix（顶栏一级 + 侧栏二级） */
    layout?: ProLayoutMode
    /** mix 模式下侧栏只显示当前一级项的子菜单。仅 mix 生效，side 忽略 */
    splitMenus?: boolean
    /**
     * 菜单异步管道：挂载与 menuParams 变化时调用，resolve 的数组作为菜单。
     * 配了它 `menus` prop 只作回落，可调 `action.reload()` 重新拉取
     */
    menuRequest?: (params?: Record<string, any>) => Promise<ProLayoutMenuItem[]>
    /** menuRequest 的参数，变更后自动重新拉取 */
    menuParams?: Record<string, any>
    /** 初始是否折叠（仅 side / mix 的侧栏） */
    defaultCollapsed?: boolean
    /** 受控折叠。传了就以它为准，折叠变化通过 `update:collapsed` 同步 */
    collapsed?: boolean
    siderWidth?: number
    collapsedWidth?: number
    /** 隐藏侧边栏 */
    hideSider?: boolean
    /** 隐藏面包屑 */
    hideBreadcrumb?: boolean
    /** 布局级水印：字符串等价于 { content }，其余字段透传 el-watermark */
    watermark?: string | ProWatermarkConfig
    /** 页面标题渲染。false 则不同步 document.title；函数返回字符串则用它 */
    pageTitleRender?: false | ((info: PageTitleInfo) => string | false | void)    /** 页面标题显式覆盖。缺省取当前路径菜单叶子的 title */
    pageTitle?: string
  }>(),
  {
    activePath: '',
    router: true,
    layout: 'side',
    splitMenus: false,
    defaultCollapsed: false,
    // 显式 undefined：布尔 prop 不写 default 时「没传」会被强制成 false，
    // `props.collapsed ?? innerCollapsed` 就永远取不到 innerCollapsed，
    // 非受控折叠与窄屏自动收起都会失效。写成 undefined 才能区分「没传」。
    collapsed: undefined,
    // 显式 undefined：类型含 Boolean（false | fn），不写 default 时「没传」会被
    // 强制成 false，默认的 document.title 同步就永远走不到。
    pageTitleRender: undefined,
    siderWidth: 220,
    collapsedWidth: 64,
  },
)

const emit = defineEmits<{
  select: [string]
  'update:collapsed': [boolean]
  collapsedChange: [boolean]
}>()

const innerCollapsed = ref(props.defaultCollapsed)
/** 受控/非受控双轨：传了 `collapsed` 就以它为准 */
const collapsed = computed(() => props.collapsed ?? innerCollapsed.value)

function setCollapsed(value: boolean) {
  innerCollapsed.value = value
  emit('update:collapsed', value)
  emit('collapsedChange', value)
}

const breakpoint = useBreakpoint()
/** 窄屏（<= sm）：侧栏退化为抽屉。对齐 React 的移动端适配 */
const isMobile = computed(() => BREAKPOINT_ORDER.indexOf(breakpoint.value) <= BREAKPOINT_ORDER.indexOf('sm'))
/** 移动端抽屉开关 */
const drawerOpen = ref(false)

/**
 * 窄屏自动收起（对齐 React：md 及以下折叠）。
 * 只在断点变化时推一次，之后用户仍可手动展开，直到下次断点变化。
 * 折叠态在桌面端生效；移动端侧栏本来就变成了抽屉，这个值只影响回宽后的初始态。
 */
watch(
  breakpoint,
  (bp) => {
    if (BREAKPOINT_ORDER.indexOf(bp) <= BREAKPOINT_ORDER.indexOf('md')) {
      setCollapsed(true)
    }
  },
  { immediate: true },
)

/* --------------------------- 菜单数据管道 --------------------------- */

/** menuRequest 的异步结果。null 表示没配管道，菜单走 props.menus */
const asyncMenus = ref<ProLayoutMenuItem[] | null>(null)
const menuLoading = ref(false)

async function loadMenus() {
  if (!props.menuRequest) return
  menuLoading.value = true
  try {
    asyncMenus.value = await props.menuRequest(props.menuParams)
  } finally {
    menuLoading.value = false
  }
}

onMounted(loadMenus)
// menuParams 变更后自动重新拉取（对齐 React 的 params 依赖）
watch(
  () => props.menuParams,
  () => void loadMenus(),
  { deep: true },
)

/** 生效菜单：配了 menuRequest 就以异步结果为准 */
const sourceMenus = computed(() => (props.menuRequest ? asyncMenus.value ?? [] : props.menus ?? []))
const visibleMenus = computed(() => sourceMenus.value.filter((m) => !m.hideInMenu))

/* --------------------------- 面包屑 / 页面标题 --------------------------- */

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
  const exact = findTrail(sourceMenus.value, props.activePath)
  const trail = exact ?? findLongestPrefix(sourceMenus.value, props.activePath)
  return trail.filter((i) => !i.hideInBreadcrumb)
})

/** mix 模式下当前激活的一级项（splitMenus 用） */
const mixTopItem = computed(() => {
  if (props.layout !== 'mix' || !props.activePath) return null
  const trail = findTrail(visibleMenus.value, props.activePath) ?? findLongestPrefix(visibleMenus.value, props.activePath)
  return trail[0] ?? null
})

/** 页面标题：显式 pageTitle > 当前路径菜单叶子 > 布局 title */
const pageTitleValue = computed(() => {
  if (props.pageTitle) return props.pageTitle
  const leaf = breadcrumbs.value.at(-1)
  return leaf?.title ?? props.title ?? ''
})

/**
 * document.title 同步。
 * 不传 pageTitleRender：默认 `页面标题 - 布局 title`；没有标题则不动。
 * false：不同步（SPA 嵌在宿主里由宿主管标题）；函数：返回字符串则用它。
 */
watchEffect(() => {
  if (props.pageTitleRender === false) return
  const info: PageTitleInfo = { title: pageTitleValue.value, breadcrumb: breadcrumbs.value }
  if (props.pageTitleRender) {
    const result = props.pageTitleRender(info)
    if (typeof result === 'string' && result) document.title = result
    return
  }
  const page = pageTitleValue.value
  if (!page) return
  document.title = props.title ? `${page} - ${props.title}` : page
})

/* --------------------------- 形态派生 --------------------------- */

/** 侧栏显示的菜单：top 无侧栏；mix+splitMenus 只显示当前一级项的子菜单 */
const siderMenus = computed(() => {
  if (props.layout === 'top') return []
  if (props.layout === 'mix' && props.splitMenus) {
    return (mixTopItem.value?.children ?? []).filter((c) => !c.hideInMenu)
  }
  return visibleMenus.value
})

/**
 * 侧栏渲染条件：top 永远没有；hideSider 显式关；移动端换抽屉。
 * mix+splitMenus 时子菜单为空（一级项没有 children）则隐藏侧栏，
 * 对齐 React splitMenus 的行为；side 布局保持「有 hideSider 才关」。
 */
const showSider = computed(() => {
  if (props.layout === 'top') return false
  if (props.hideSider || isMobile.value) return false
  if (props.layout === 'mix' && props.splitMenus) return siderMenus.value.length > 0
  return true
})

/** 折叠按钮：top 布局没有侧栏，也没有抽屉开关（顶栏菜单直接随窗口折行） */
const showCollapseButton = computed(() => props.layout !== 'top' && !props.hideSider)

/** 水印配置。content 为空则不渲染水印 */
const watermarkContent = computed(() => {
  if (!props.watermark) return ''
  return typeof props.watermark === 'string' ? props.watermark : props.watermark.content ?? ''
})
const watermarkBinds = computed(() => {
  if (typeof props.watermark === 'string') return { content: props.watermark }
  return props.watermark ?? { content: '' }
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
  '--el-pro-sider-width': showSider.value
    ? `${collapsed.value ? props.collapsedWidth : props.siderWidth}px`
    : '0px',
  '--el-pro-layout-header-height': `${PRO_LAYOUT_HEADER_HEIGHT}px`,
}))

/** 页面层（ElProPageContainer）靠这个知道吸顶要往下让多少；siderWidth 供固定条避让 */
provide(PRO_LAYOUT, {
  headerHeight: PRO_LAYOUT_HEADER_HEIGHT,
  siderWidth: () =>
    showSider.value ? (collapsed.value ? props.collapsedWidth : props.siderWidth) : 0,
})

/** 折叠按钮点击：桌面端切换折叠，移动端切换抽屉 */
function onCollapseClick() {
  if (isMobile.value) {
    drawerOpen.value = !drawerOpen.value
    return
  }
  setCollapsed(!collapsed.value)
}

defineExpose({
  setCollapsed,
  toggleCollapsed: () => setCollapsed(!collapsed.value),
  isCollapsed: () => collapsed.value,
  /** 重新拉取 menuRequest（对齐 React actionRef.reload）。没配管道时是空操作 */
  reload: loadMenus,
  isMenuLoading: () => menuLoading.value,
})
</script>

<template>
  <div class="el-pro-layout" :class="{ 'is-collapsed': collapsed }" :style="layoutStyle">
    <!-- 侧栏：side / mix 桌面端；移动端由下方抽屉接管 -->
    <aside v-if="showSider" class="el-pro-layout__sider" :style="siderStyle">
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
            v-for="item in siderMenus"
            :key="item.path ?? item.title"
            :item="item"
            :active-path="activePath"
          />
        </ElMenu>
      </ElScrollbar>
    </aside>

    <!-- 移动端抽屉：显示完整菜单树（一级 + 二级），比侧栏内容更完整可用 -->
    <ElDrawer
      v-if="isMobile && layout !== 'top'"
      v-model="drawerOpen"
      direction="ltr"
      :size="siderWidth"
      :with-header="false"
      class="el-pro-layout__drawer"
    >
      <div class="el-pro-layout__logo">
        <slot name="logo" :collapsed="false">
          <span class="el-pro-layout__logo-text">{{ title }}</span>
        </slot>
      </div>
      <ElScrollbar class="el-pro-layout__menu">
        <ElMenu
          :default-active="activePath"
          :collapse="false"
          :collapse-transition="false"
          :router="router"
          @select="(index: string) => { drawerOpen = false; emit('select', index) }"
        >
          <MenuItem
            v-for="item in visibleMenus"
            :key="item.path ?? item.title"
            :item="item"
            :active-path="activePath"
          />
        </ElMenu>
      </ElScrollbar>
    </ElDrawer>

    <div class="el-pro-layout__main">
      <!--
        布局级水印：包住顶栏 + 内容区 + 底部条。
        用动态包装而不是 v-if 两个分支：header/main/footer 的模板只有一份，
        改顶栏不会漏改水印分支。未配水印时是普通 div（.el-pro-layout__wm 承接
        main 的 flex 列布局），配了水印时换成 el-watermark。
      -->
      <component
        :is="watermarkContent ? ElWatermark : 'div'"
        v-bind="watermarkContent ? watermarkBinds : {}"
        class="el-pro-layout__wm"
      >
        <header class="el-pro-layout__header">
          <div class="el-pro-layout__header-left">
            <button
              v-if="showCollapseButton"
              type="button"
              class="el-pro-layout__collapse"
              :title="collapsed ? getLabel('layoutExpand') : getLabel('layoutCollapse')"
              @click="onCollapseClick"
            >
              <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M2.5 4h11M2.5 8h11M2.5 12h11" stroke-linecap="round" />
              </svg>
            </button>

            <!-- top / mix：logo 与菜单进顶栏 -->
            <div v-if="layout !== 'side'" class="el-pro-layout__logo is-in-header">
              <slot name="logo" :collapsed="false">
                <span class="el-pro-layout__logo-text">{{ title }}</span>
              </slot>
            </div>

            <ElMenu
              v-if="layout !== 'side'"
              :default-active="activePath"
              mode="horizontal"
              :router="router"
              class="el-pro-layout__top-menu"
              @select="(index: string) => emit('select', index)"
            >
              <MenuItem
                v-for="item in visibleMenus"
                :key="item.path ?? item.title"
                :item="item"
                :active-path="activePath"
              />
            </ElMenu>

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
      </component>
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
.el-pro-layout__logo.is-in-header {
  height: 100%;
  border-bottom: none;
  justify-content: flex-start;
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
.el-pro-layout__drawer .el-drawer__body {
  display: flex;
  flex-direction: column;
  padding: 0;
  height: 100%;
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
  /*
   * top / mix 时横向菜单在这里面 flex:1，容器自己也要撑满：
   * 不撑的话 header-left 按内容收缩，菜单被压到 min-content，
   * 全部一级项被折进 el-menu 的「•••」溢出收纳。
   */
  flex: 1;
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
.el-pro-layout__top-menu {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  border-bottom: none !important;
  /*
   * 容器高度对齐顶栏：EP 默认 --el-menu-horizontal-height 是 60px，
   * 顶栏是 56px，不覆盖的话菜单容器从顶栏底边框下露出 4px 白条。
   * 项的高度在下面已覆盖为同一值。
   */
  height: var(--el-pro-layout-header-height, 56px);
}
.el-pro-layout__top-menu .el-menu-item,
.el-pro-layout__top-menu .el-sub-menu__title {
  height: var(--el-pro-layout-header-height, 56px);
  line-height: var(--el-pro-layout-header-height, 56px);
}
.el-pro-layout__breadcrumb {
  font-size: 13px;
  flex: none;
}
.el-pro-layout__breadcrumb .is-current {
  color: var(--el-text-color-primary);
  font-weight: 500;
}
/*
 * 水印包装：el-watermark 的根是个 div，接管了 main 的三个直接子元素。
 * 这里把 main 的 flex 列布局补在包装上，内容排列与无水印时一致。
 */
.el-pro-layout__wm {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  min-height: 0;
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
