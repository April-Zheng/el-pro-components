<script setup lang="ts">
/**
 * ElProPageContainer —— 页面容器。
 *
 * 把「一个业务页面长什么样」收成一层：页头（可吸顶）+ 内容区（可限宽）+ 底部固定操作条。
 * 结构完全照源码 `layout/components/PageContainer`：
 *
 *   PageHeader（fixedHeader 时套 Affix）
 *     ├─ breadcrumb
 *     ├─ heading（title / subTitle / tags / extra / avatar / back）
 *     ├─ children  ← 放 content + extraContent（说明行）
 *     └─ footer    ← tabList 挂这儿
 *   GridContent（contentWidth='Fixed' 且 layout='top' 时收窄到 1152px）
 *     └─ children  ← 页面真正的业务内容，loading 时被顶掉
 *   FooterToolbar（有 footer 时）
 *
 * 四处和源码对齐但换了实现的细节，写清楚免得以后被当成 bug：
 * 1. **不从 RouteContext 取布局**。`breadcrumb` / `contentWidth` / `layout` 都是显式 prop，
 *    所以它不依赖 ElProLayout，也能单独用。
 * 2. **`loading` 只收布尔 + `#loading` 插槽**，不吃 antd 的 SpinProps（Element Plus 没这个概念）。
 * 3. **`footer` 用插槽而不是数组**。数组在模板里没法写条件渲染。
 * 4. **`fixedHeader` 用 el-affix**（antd Affix 的对应物），`affixProps.offset` 决定吸顶偏移。
 *    偏移默认取「布局顶栏高度」（从 ElProLayout provide 进来），不是 0 ——
 *    给 0 的话页头会钉在视口最顶上，把顶栏盖掉。不在布局里用时回落到 0。
 */
import { computed, defineComponent, getCurrentInstance, h, inject, ref, useSlots, watch } from 'vue'
import { ElAffix, ElTabPane, ElTabs, ElWatermark } from 'element-plus'
import { PRO_LAYOUT } from '../../core/layoutContext'
import type { ProBreadcrumbItem, ProPageContainerProps } from '../../types'
import ElProPageHeader from './ElProPageHeader.vue'
import ElProFooterToolbar from './ElProFooterToolbar.vue'

defineOptions({ name: 'ElProPageContainer' })

const props = withDefaults(defineProps<ProPageContainerProps>(), {
  // 显式 undefined：`string | false` 会被编译成 [String, Boolean]，
  // 「没传」会被 Boolean 转成 false，和「主动传 false」就分不开了。
  title: undefined,
  backIcon: undefined,
  // 同 PageHeader：`false | 函数` 的联合类型含 Boolean，不给默认值会被 cast 成 false
  breadcrumbRender: undefined,
  extraContent: undefined,
  tags: () => [],
  breadcrumb: () => [],
  ghost: true,
  contentWidth: 'Fluid',
  layout: 'side',
  loading: false,
  fixedHeader: false,
  // 这里必须给 true 兜底：否则 absent → false，页头永远不渲染
  pageHeaderRender: true,
  header: undefined,
  affixProps: undefined,
  tabList: () => [],
  tabActiveKey: undefined,
  tabProps: undefined,
  footerToolBarProps: undefined,
  childrenContentStyle: undefined,
  waterMarkProps: undefined,
})

const emit = defineEmits<{
  back: []
  'breadcrumb-click': [item: ProBreadcrumbItem, index: number]
  tabChange: [key: string | number]
  'update:tabActiveKey': [key: string | number]
}>()

const slots = useSlots()
const instance = getCurrentInstance()

/** 有没有人监听 @back。声明成 emits 之后它就进不了 attrs，只能看 vnode.props */
const hasBackListener = computed(() => typeof instance?.vnode.props?.onBack === 'function')

/** 透传给页头的 props：本组件同名字段打底，`header` 覆盖 */
const headerProps = computed<Record<string, any>>(() => ({
  title: props.title,
  subTitle: props.subTitle,
  tags: props.tags,
  extra: props.extra,
  avatar: props.avatar,
  backIcon: props.backIcon,
  breadcrumb: props.breadcrumb,
  breadcrumbRender: props.breadcrumbRender,
  ghost: props.ghost,
  contentWidth: props.contentWidth,
  layout: props.layout,
  ...(props.header ?? {}),
}))

/** 原样转交给页头的插槽 */
const FORWARD_SLOTS = ['title', 'subTitle', 'tags', 'extra', 'avatar', 'backIcon', 'breadcrumb']
const forwardedSlots = computed(() => FORWARD_SLOTS.filter((name) => !!slots[name]))

/** 说明行：有 content 或 extraContent 才占位 */
const showDetail = computed(
  () => !!(props.content || props.extraContent || slots.content || slots.extraContent),
)

/** tab 或 tab 右侧附加区 */
const hasTabs = computed(() => props.tabList.length > 0 || !!slots.tabBarExtra)

/**
 * 页头该不该渲染。判定照抄源码：标题、副标题、操作区、标签、tab、头像、返回、面包屑、
 * 说明行一个都没有就整块不出现 —— 这时内容区要自己补上边距，否则顶到页面上沿。
 */
const hasHeader = computed(() => {
  if (props.pageHeaderRender === false) return false
  if (typeof props.pageHeaderRender === 'function') return true
  if (slots.header) return true
  if (forwardedSlots.value.length > 0) return true
  if (hasBackListener.value) return true
  const merged = headerProps.value
  if (merged.title || merged.subTitle || merged.extra || merged.avatar) return true
  if (merged.tags?.length) return true
  if (merged.breadcrumbRender !== false) {
    if (merged.breadcrumb?.length) return true
    if (typeof merged.breadcrumbRender === 'function') return true
  }
  return hasTabs.value || showDetail.value
})

/** 只有真有监听才往下传：否则页头「返回按钮 = 有人处理返回」这条判定会被我们自己的绑定骗到 */
const headerListeners = computed(() => {
  const map: Record<string, any> = {
    'breadcrumb-click': (item: ProBreadcrumbItem, index: number) =>
      emit('breadcrumb-click', item, index),
  }
  if (hasBackListener.value) map.back = () => emit('back')
  return map
})

/* -------------------------------- 结构小工具 -------------------------------- */

/**
 * 页头外壳：吸顶时是 Affix + 一层带底色的 warp，不吸顶时就是个透明容器。
 * 抽出来是为了让页头本身在模板里只写一遍 —— 两段几乎一样的模板迟早会改歪一处。
 */
const HeaderWrapper = defineComponent({
  props: {
    affix: { type: Boolean, default: false },
    affixProps: { type: Object, default: undefined },
    offset: { type: Number, default: 0 },
  },
  setup(p, { slots: s }) {
    return () => {
      const inner = h(
        'div',
        { class: p.affix ? 'el-pro-page-container__header-warp' : undefined },
        s.default?.(),
      )
      if (!p.affix) return inner
      return h(
        ElAffix,
        { ...(p.affixProps as Record<string, any>), offset: p.offset, class: 'el-pro-page-container__affix' },
        { default: () => inner },
      )
    }
  },
})

/** 水印外壳：给了 waterMarkProps 才包一层 el-watermark */
const ContentWrapper = defineComponent({
  props: { watermark: { type: Object, default: undefined } },
  setup(p, { slots: s }) {
    return () =>
      p.watermark
        ? h(ElWatermark, { ...(p.watermark as Record<string, any>) }, { default: () => s.default?.() })
        : s.default?.()
  },
})

/** 函数式 pageHeaderRender 的渲染壳 */
const RenderHeader = defineComponent({
  props: { render: { type: Function, required: true }, payload: { type: Object, required: true } },
  setup(p: any) {
    return () => p.render(p.payload)
  },
})

/** 函数式 pageHeaderRender 收到的参数：本组件的全部 props + header 覆盖 */
const headerPayload = computed(() => ({ ...props, ...(props.header ?? {}) }))

/* --------------------------------- tab --------------------------------- */

const innerTabKey = ref<string | number>('')

watch(
  () => props.tabActiveKey,
  (key) => {
    if (key !== undefined) innerTabKey.value = key
  },
  { immediate: true },
)

/** 受控优先；没受控就用内部记录，保证点得动 */
const activeTabKey = computed(() => String(props.tabActiveKey ?? innerTabKey.value ?? ''))

function onTabChange(key: string | number) {
  innerTabKey.value = key
  emit('update:tabActiveKey', key)
  emit('tabChange', key)
}

/* -------------------------------- 布局细节 -------------------------------- */

/** 外层有没有 ProLayout。没有时吸顶偏移就是 0（贴视口顶，正确） */
const layoutCtx = inject(PRO_LAYOUT, null)

/**
 * 吸顶偏移。优先级：显式 affixProps.offset > 布局顶栏高度 > 1。
 *
 * 中间这一档是关键：页面不该知道「顶栏 56px」这种数字，
 * 也不该为了吸顶不被顶栏盖住而被迫传参 —— 那是布局的职责。
 * 末档用 1 而不是 0：无布局时 affix 在文档流滚动里 offset=0 与 sticky 边界
 * 重叠会抖动，React 侧同位置也是 1（PageContainer/index.tsx:441-442）。
 */
const affixOffset = computed(() =>
  Number(props.affixProps?.offset ?? layoutCtx?.headerHeight ?? 1),
)

/** 只有「顶栏布局 + 固定宽度」才收窄，和源码一致 */
const isWide = computed(() => props.contentWidth === 'Fixed' && props.layout === 'top')

const hasFooter = computed(() => !!slots.footer)
</script>

<template>
  <div
    class="el-pro-page-container"
    :class="{
      'has-header': hasHeader,
      'has-footer': hasFooter,
      'is-fixed-header': fixedHeader && hasHeader,
    }"
    data-testid="el-pro-page-container"
  >
    <HeaderWrapper
      v-if="hasHeader"
      :affix="fixedHeader"
      :affix-props="affixProps"
      :offset="affixOffset"
    >
      <RenderHeader
        v-if="typeof pageHeaderRender === 'function'"
        :render="pageHeaderRender"
        :payload="headerPayload"
      />
      <slot v-else name="header">
        <ElProPageHeader v-bind="headerProps" v-on="headerListeners">
          <template v-if="showDetail" #default>
            <div class="el-pro-page-container__detail">
              <div class="el-pro-page-container__main">
                <div class="el-pro-page-container__row">
                  <div v-if="content || $slots.content" class="el-pro-page-container__content">
                    <slot name="content">{{ content }}</slot>
                  </div>
                  <div
                    v-if="extraContent || $slots.extraContent"
                    class="el-pro-page-container__extra-content"
                  >
                    <slot name="extraContent">{{ extraContent }}</slot>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <template v-if="hasTabs" #footer>
            <div class="el-pro-page-container__tabs">
              <ElTabs
                class="el-pro-page-container__tabs-bar"
                v-bind="tabProps"
                :model-value="activeTabKey"
                @update:model-value="onTabChange"
              >
                <ElTabPane
                  v-for="(item, index) in tabList"
                  :key="item.key ?? index"
                  :label="item.label ?? item.tab"
                  :name="String(item.key ?? index)"
                  :disabled="item.disabled"
                />
              </ElTabs>
              <div v-if="$slots.tabBarExtra" class="el-pro-page-container__tabs-extra">
                <slot name="tabBarExtra" />
              </div>
            </div>
          </template>

          <template v-for="name in forwardedSlots" :key="name" #[name]="scope">
            <slot :name="name" v-bind="scope ?? {}" />
          </template>
        </ElProPageHeader>
      </slot>
    </HeaderWrapper>

    <!-- 内容区 -->
    <div class="el-pro-grid-content" :class="{ 'is-wide': isWide }">
      <div
        class="el-pro-page-container__children"
        :class="{ 'is-no-header': !hasHeader }"
        :style="childrenContentStyle"
      >
        <ContentWrapper :watermark="waterMarkProps">
          <div v-if="loading" class="el-pro-page-container__loading">
            <slot name="loading">
              <span class="el-pro-page-container__spinner" />
            </slot>
          </div>
          <slot v-else />
        </ContentWrapper>
      </div>
    </div>

    <!-- 底部固定操作条 -->
    <ElProFooterToolbar v-if="hasFooter" v-bind="footerToolBarProps">
      <template v-if="$slots.footerExtra" #extra>
        <slot name="footerExtra" />
      </template>
      <slot name="footer" />
    </ElProFooterToolbar>
  </div>
</template>

<style>
.el-pro-page-container {
  position: relative;
  box-sizing: border-box;
  width: 100%;
}
.el-pro-page-container__header-warp {
  background: var(--el-bg-color);
  transition: background-color 0.3s;
}
.el-pro-page-container.is-fixed-header .el-pro-page-container__header-warp {
  box-shadow: 0 2px 8px rgb(0 0 0 / 6%);
}

/* 说明行：左内容右附加，窄了竖排 */
.el-pro-page-container__detail {
  display: flex;
}
.el-pro-page-container__main {
  width: 100%;
}
.el-pro-page-container__row {
  display: flex;
  width: 100%;
}
.el-pro-page-container__content {
  flex: auto;
  width: 100%;
  color: var(--el-text-color-regular);
  font-size: 14px;
  line-height: 1.7;
}
.el-pro-page-container__extra-content {
  flex: 0 1 auto;
  min-width: 242px;
  margin-left: 88px;
  text-align: right;
}
@media (max-width: 1200px) {
  .el-pro-page-container__extra-content {
    margin-left: 44px;
  }
}
@media (max-width: 992px) {
  .el-pro-page-container__extra-content {
    margin-left: 20px;
  }
}
@media (max-width: 768px) {
  .el-pro-page-container__row {
    display: block;
  }
  .el-pro-page-container__extra-content {
    min-width: 0;
    margin-left: 0;
    text-align: left;
  }
}

/* 页头 footer 里的 tab：右边留一条附加区 */
.el-pro-page-container__tabs {
  display: flex;
  align-items: flex-end;
  gap: 16px;
}
.el-pro-page-container__tabs-bar {
  flex: 1;
  min-width: 0;
}
.el-pro-page-container__tabs-bar .el-tabs__header {
  margin-bottom: 0;
}
.el-pro-page-container__tabs-bar .el-tabs__nav-wrap::after {
  height: 1px;
  background-color: var(--el-border-color-lighter);
}
.el-pro-page-container__tabs-extra {
  flex: none;
  padding-bottom: 8px;
}

/* 内容区 */
.el-pro-grid-content {
  box-sizing: border-box;
  width: 100%;
}
.el-pro-grid-content.is-wide {
  max-width: 1152px;
  margin: 0 auto;
}
.el-pro-page-container__children {
  padding: 16px 24px 24px;
}
.el-pro-page-container__children.is-no-header {
  padding-top: 24px;
}
/* 底部有固定条时给内容让位，否则最后一行会被压住 */
.el-pro-page-container.has-footer .el-pro-page-container__children {
  padding-bottom: 80px;
}

/* loading：源码是「居中一个 spin、上方留 100px」。这里用纯 CSS 转圈，不引图标包 */
.el-pro-page-container__loading {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  min-height: 200px;
  padding-top: 100px;
}
.el-pro-page-container__spinner {
  width: 28px;
  height: 28px;
  border: 2px solid var(--el-border-color-lighter);
  border-top-color: var(--el-color-primary);
  border-radius: 50%;
  animation: el-pro-page-container-spin 0.8s linear infinite;
}
@keyframes el-pro-page-container-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
