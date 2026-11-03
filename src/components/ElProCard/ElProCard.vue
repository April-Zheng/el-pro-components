<script setup lang="ts">
/**
 * ElProCard —— 带结构化头部、可折叠、可分组拆分的卡片。
 *
 * 与 el-card 的差别不在「有没有边框」，而在三件 el-card 不管的事：
 * 1. **嵌套即布局**：父卡里放子卡时，父卡 body 自动去掉 padding 与边框，
 *    子卡之间靠 `split` 画分割线、靠 `gutter` 拉间距 —— 不用再套 el-row/el-col。
 * 2. **头部是结构**：title / subTitle / tooltip / extra / 折叠箭头各就各位，
 *    而不是丢一个 #header 插槽让使用方自己排版。
 * 3. **头部可换标签页**：`tabs` 直接把头部变成 el-tabs，切换时只换 body，
 *    省掉「外面一个 el-tabs + 里面 N 个 el-card」那种重复结构。
 *
 * 排版细节（尺寸、分割线位置、嵌套间距）全部按 CSS 变量给出，
 * 想改皮肤不用覆盖组件内部选择器。
 */
import { computed, inject, onBeforeUnmount, onMounted, provide, ref, useSlots, watch } from 'vue'
import type { CSSProperties, Slots, VNode } from 'vue'
import { ElTabPane, ElTabs, ElTooltip } from 'element-plus'
import ElProSkeleton from '../ElProSkeleton/ElProSkeleton.vue'
import { PRO_CARD_CONTEXT } from '../../core/cardContext'
import { normalizeGutter, resolveResponsive, useBreakpoint } from '../../core/responsive'
import type { ProCardCollapsible, ProCardTabItem, ResponsiveValue } from '../../types'

defineOptions({ name: 'ElProCard' })
const props = withDefaults(
  defineProps<{
    /* ---- 头部 ---- */
    title?: string | number
    subTitle?: string | number
    /** 标题后的问号提示 */
    tooltip?: string
    /** 右上角自定义区。也可以用 #extra 插槽，插槽优先 */
    extra?: VNode | string | number
    /** 头部下方是否有分割线。默认无（Pro 风格），type=inner 时强制有 */
    headerBordered?: boolean
    /** 头部换成标签页。每一项的内容取 `content`，或用 `#tab-<key>` 插槽 */
    tabs?: ProCardTabItem[]
    activeKey?: string
    defaultActiveKey?: string
    /** el-tabs 的外观 */
    tabType?: 'line' | 'card' | 'border-card'
    /* ---- 外观 ---- */
    type?: 'default' | 'inner'
    size?: 'default' | 'small'
    /** 是否显示边框 */
    bordered?: boolean
    /** 幽灵模式：去掉背景、边框和内边距，只当布局容器用 */
    ghost?: boolean
    hoverable?: boolean
    boxShadow?: boolean
    /** 选中态（多用于配 CheckCard 的视觉，也可单独用） */
    checked?: boolean
    cover?: VNode | string | number
    /** 底部操作区。也可以用 #actions 插槽，插槽优先 */
    actions?: (VNode | string | number)[]
    bodyStyle?: CSSProperties
    headerStyle?: CSSProperties
    /* ---- 折叠 ---- */
    collapsible?: ProCardCollapsible
    collapsed?: boolean
    defaultCollapsed?: boolean
    /* ---- 布局（配合子卡） ---- */
    /** 子卡之间的分割线方向 */
    split?: 'vertical' | 'horizontal'
    /** body 的 flex 方向。不给时由 split 决定 */
    direction?: 'row' | 'column'
    /** 子卡是否可以换行 */
    wrap?: boolean
    /** 子卡间距。支持 16 / [16, 8] / { xs: 8, lg: 16 } */
    gutter?: ResponsiveValue<number> | [ResponsiveValue<number>, number]
    /** 自身占父卡的几格。数字按 24 栅格，字符串可写 '30%' / '320px' */
    colSpan?: ResponsiveValue<number | string>
    /* ---- 加载 ---- */
    loading?: boolean
  }>(),
  {
    type: 'default',
    size: 'default',
    bordered: true,
    ghost: false,
    hoverable: false,
    boxShadow: false,
    headerBordered: false,
    tabType: 'line',
    collapsible: false,
    defaultCollapsed: false,
    wrap: true,
  },
)

const emit = defineEmits<{
  'update:collapsed': [boolean]
  collapse: [boolean]
  'update:activeKey': [string]
  tabChange: [string]
  checked: [boolean]
}>()

const slots: Slots = useSlots()
const breakpoint = useBreakpoint()

/* ------------------------------ 父子关系 ------------------------------ */

const parent = inject(PRO_CARD_CONTEXT, null)
const childSeq = ref(0)
const childCount = ref(0)

provide(PRO_CARD_CONTEXT, {
  split: computed(() => props.split),
  gutter: computed(() => normalizeGutter(props.gutter, breakpoint.value)),
  breakpoint,
  register: () => {
    const index = childSeq.value
    childSeq.value += 1
    childCount.value += 1
    return index
  },
  unregister: () => {
    childCount.value = Math.max(0, childCount.value - 1)
  },
})

onMounted(() => {
  if (parent) parent.register()
})
onBeforeUnmount(() => {
  parent?.unregister()
})

const isNested = computed(() => !!parent)
const hasChild = computed(() => childCount.value > 0)

/* ------------------------------ 折叠 ------------------------------ */

const collapsedInner = ref(props.defaultCollapsed)
const isCollapsedControlled = computed(() => props.collapsed !== undefined)
const collapsed = computed(() =>
  isCollapsedControlled.value ? !!props.collapsed : collapsedInner.value,
)

watch(
  () => props.collapsed,
  (val) => {
    if (val !== undefined) collapsedInner.value = val
  },
)

function setCollapsed(next: boolean) {
  if (!isCollapsedControlled.value) collapsedInner.value = next
  emit('update:collapsed', next)
  emit('collapse', next)
}

function toggleCollapsed() {
  setCollapsed(!collapsed.value)
}

const collapsibleIconOnly = computed(() => props.collapsible === 'icon' || props.collapsible === true)
const collapsibleOnHeader = computed(() => props.collapsible === 'header')

function onHeaderClick(e: MouseEvent) {
  // 点右上角操作区不应该折叠，antd 也是这个约定
  if ((e.target as HTMLElement)?.closest('.el-pro-card__extra')) return
  if (collapsibleOnHeader.value) toggleCollapsed()
}

/* ------------------------------ 标签页 ------------------------------ */

const activeInner = ref(props.defaultActiveKey ?? props.tabs?.[0]?.key ?? '')

watch(
  () => props.tabs,
  (tabs) => {
    if (!tabs?.length) return
    const stillThere = tabs.some((t) => t.key === activeInner.value)
    if (!stillThere) activeInner.value = tabs[0].key
  },
)

const currentTab = computed(() => props.activeKey ?? activeInner.value)

/**
 * el-tabs 的 `type` 只有 '' / 'card' / 'border-card' 三个取值，
 * 「线型」对应的是空字符串而不是 'line'。这里做一次归一，
 * 对外仍然可以用更直白的 `tabType="line"`。
 */
const elTabType = computed<'card' | 'border-card' | ''>(() =>
  props.tabType === 'card' || props.tabType === 'border-card' ? props.tabType : '',
)

function onTabChange(name: string | number) {
  const key = String(name)
  if (props.activeKey === undefined) activeInner.value = key
  emit('update:activeKey', key)
  emit('tabChange', key)
}

/* ------------------------------ 尺寸与间距 ------------------------------ */

const gutterStyle = computed<CSSProperties>(() => {
  const { rowGap, columnGap } = normalizeGutter(props.gutter, breakpoint.value)
  if (!rowGap && !columnGap) return {}
  return {
    // 同时把「半间距」暴露成 CSS 变量：子卡算自身宽度时要用它做补偿
    '--el-pro-card-gutter-x': `${columnGap}px`,
    '--el-pro-card-gutter-y': `${rowGap}px`,
    rowGap: `${rowGap}px`,
    columnGap: `${columnGap}px`,
  } as CSSProperties
})

const direction = computed<'row' | 'column'>(() => {
  if (props.direction) return props.direction
  return props.split === 'horizontal' ? 'column' : 'row'
})

/**
 * 自身在父卡里的宽度。嵌套时默认占满一行，写 colSpan 才收缩。
 *
 * 这里必须把 flex gap 从宽度里扣掉，否则 `50% + 50% + 16px gap > 100%`，
 * 两个子卡会各占一行 —— 这是 flex + gap + 百分比宽度最常见的坑。
 *
 * 扣多少：一行放 k 个、间距 g，则每个宽度是 `100%/k - g*(k-1)/k`。
 * 而 k = 24/span，所以 (k-1)/k = 1 - span/24，正好能用 colSpan 直接算出来，
 * 不需要知道「一行到底放了几个」（跨行、混合 colSpan 都对）。
 */
const colSpanStyle = computed<CSSProperties>(() => {
  if (!isNested.value) return {}
  const span = resolveResponsive(props.colSpan, breakpoint.value)

  if (span === undefined) return { flex: '0 0 100%', maxWidth: '100%' }

  if (typeof span === 'number') {
    const pct = Math.max(0, Math.min(100, (span / 24) * 100))
    const shrink = (1 - pct / 100).toFixed(4)
    const size = `calc(${pct}% - var(--el-pro-card-gutter-x, 0px) * ${shrink})`
    return { flex: `0 0 ${size}`, maxWidth: size }
  }

  // '30%' / '320px'：没法算间距补偿，直接当 flex-basis
  return { flex: `0 0 ${span}`, maxWidth: span }
})

const rootStyle = computed<CSSProperties>(() => ({ ...colSpanStyle.value }))

const bodyStyleMerged = computed<CSSProperties>(() => ({
  ...(hasChild.value ? { padding: 0, border: 'none' } : {}),
  ...(hasChild.value
    ? { display: 'flex', flexDirection: direction.value, flexWrap: props.wrap ? 'wrap' : 'nowrap' }
    : {}),
  ...(hasChild.value ? gutterStyle.value : {}),
  ...props.bodyStyle,
}))

const rootClass = computed(() => ({
  'is-inner': props.type === 'inner',
  'is-small': props.size === 'small',
  'is-borderless': !props.bordered,
  'is-ghost': props.ghost,
  'is-hoverable': props.hoverable,
  'is-shadow': props.boxShadow,
  'is-checked': props.checked,
  'is-collapsed': collapsed.value,
  'is-collapsible': !!props.collapsible,
  'is-nested': isNested.value,
  'is-contain-child': hasChild.value,
  'is-split-vertical': hasChild.value && props.split === 'vertical',
  'is-split-horizontal': hasChild.value && props.split === 'horizontal',
  'is-tabs': !!props.tabs?.length,
}))

const hasHeader = computed<boolean>(
  () =>
    !!(
      props.title ||
      props.subTitle ||
      props.extra ||
      props.tooltip ||
      props.collapsible ||
      slots.title ||
      slots.extra
    ),
)

const hasActions = computed<boolean>(() => !!(props.actions?.length || slots.actions))

/** 把 VNode / 字符串包成可渲染组件，省掉一堆 v-if 分支 */
const asRenderable = (node: any) => (typeof node === 'function' ? node : () => node)

function onRootClick() {
  if (props.checked !== undefined) emit('checked', !props.checked)
}

defineExpose({ toggleCollapsed, setCollapsed })
</script>

<template>
  <div class="el-pro-card" :class="rootClass" :style="rootStyle" @click="onRootClick">
    <!-- 封面 -->
    <div v-if="cover && !collapsed" class="el-pro-card__cover">
      <slot name="cover">
        <component :is="asRenderable(cover)" />
      </slot>
    </div>

    <!-- 头部 -->
    <div
      v-if="hasHeader"
      class="el-pro-card__header"
      :class="{ 'is-bordered': headerBordered || type === 'inner', 'is-clickable': collapsibleOnHeader }"
      :style="headerStyle"
      @click="onHeaderClick"
    >
      <div class="el-pro-card__title">
        <span
          v-if="collapsible"
          class="el-pro-card__collapse"
          :class="{ 'is-open': !collapsed }"
          role="button"
          tabindex="0"
          @click.stop="collapsibleIconOnly && toggleCollapsed()"
          @keydown.enter.prevent="collapsibleIconOnly && toggleCollapsed()"
          @keydown.space.prevent="collapsibleIconOnly && toggleCollapsed()"
        >
          <slot name="collapseIcon" :collapsed="collapsed">
            <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.6">
              <path d="M4.5 2.5L8 6l-3.5 3.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </slot>
        </span>

        <slot name="title">
          <span v-if="title !== undefined" class="el-pro-card__title-text">{{ title }}</span>
          <ElTooltip v-if="tooltip" :content="tooltip" placement="top" :show-after="200">
            <span class="el-pro-card__help" tabindex="0">
              <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.3">
                <circle cx="8" cy="8" r="6.2" />
                <path d="M6.2 6.1a1.9 1.9 0 1 1 2.6 1.75c-.5.2-.8.6-.8 1.1v.35" stroke-linecap="round" />
                <circle cx="8" cy="11.4" r="0.7" fill="currentColor" stroke="none" />
              </svg>
            </span>
          </ElTooltip>
          <span v-if="subTitle !== undefined" class="el-pro-card__subtitle">{{ subTitle }}</span>
        </slot>

        <slot name="titleExtra" />
      </div>

      <div v-if="extra !== undefined || $slots.extra" class="el-pro-card__extra">
        <slot name="extra">
          <component :is="asRenderable(extra)" />
        </slot>
      </div>
    </div>

    <!-- 标签页头部 + 内容 -->
    <div v-if="tabs?.length && !collapsed" class="el-pro-card__tabs">
      <ElTabs
        :model-value="currentTab"
        :type="elTabType"
        class="el-pro-card__tabs-inner"
        @tab-change="onTabChange"
      >
        <ElTabPane v-for="tab in tabs" :key="tab.key" :name="tab.key" :label="tab.label" :disabled="tab.disabled">
          <div class="el-pro-card__tab-body">
            <ElProSkeleton v-if="loading" type="card" :rows="3" />
            <component :is="asRenderable(tab.content)" v-else-if="tab.content !== undefined" />
            <slot v-else :name="`tab-${tab.key}`" />
          </div>
        </ElTabPane>
      </ElTabs>
    </div>

    <!-- 内容 -->
    <div v-else-if="!collapsed || collapsible" v-show="!collapsed" class="el-pro-card__body" :style="bodyStyleMerged">
      <ElProSkeleton v-if="loading" type="card" :rows="3" />
      <slot v-else />
    </div>

    <!-- 底部操作区 -->
    <div v-if="hasActions && !collapsed" class="el-pro-card__actions">
      <slot name="actions">
        <div v-for="(action, i) in actions" :key="i" class="el-pro-card__action">
          <component :is="asRenderable(action)" />
        </div>
      </slot>
    </div>
  </div>
</template>

<style>
.el-pro-card {
  --el-pro-card-padding: 16px;
  --el-pro-card-header-padding-block: 12px;
  --el-pro-card-title-size: 15px;
  --el-pro-card-bg: var(--el-bg-color, #fff);
  --el-pro-card-border: var(--el-border-color-lighter, #ebeef5);

  position: relative;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--el-pro-card-bg);
  border: 1px solid var(--el-pro-card-border);
  border-radius: var(--el-border-radius-base, 4px);
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}
.el-pro-card.is-small {
  --el-pro-card-padding: 12px;
  --el-pro-card-header-padding-block: 8px;
  --el-pro-card-title-size: 14px;
}
.el-pro-card.is-inner {
  background: var(--el-fill-color-lighter, #fafafa);
  border-color: transparent;
}
.el-pro-card.is-borderless {
  border-color: transparent;
}
.el-pro-card.is-ghost {
  --el-pro-card-bg: transparent;
  border-color: transparent;
  border-radius: 0;
}
.el-pro-card.is-ghost > .el-pro-card__body {
  padding: 0;
}
.el-pro-card.is-shadow {
  box-shadow: var(--el-box-shadow-light, 0 2px 12px rgba(0, 0, 0, 0.06));
}
.el-pro-card.is-hoverable {
  cursor: pointer;
}
.el-pro-card.is-hoverable:hover {
  border-color: var(--el-border-color, #dcdfe6);
  box-shadow: var(--el-box-shadow-light, 0 2px 12px rgba(0, 0, 0, 0.08));
}
.el-pro-card.is-checked {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9, #ecf5ff);
}

/* 嵌套：让父卡的外框与分割线成为唯一边界 */
.el-pro-card.is-nested {
  border-color: transparent;
  border-radius: 0;
  background: transparent;
}

/* ---- 头部 ---- */
.el-pro-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: var(--el-pro-card-header-padding-block) var(--el-pro-card-padding);
  min-height: 0;
}
.el-pro-card__header.is-bordered {
  border-bottom: 1px solid var(--el-pro-card-border);
}
.el-pro-card__header.is-clickable {
  cursor: pointer;
  user-select: none;
}
.el-pro-card__title {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: var(--el-pro-card-title-size);
  font-weight: 500;
  color: var(--el-text-color-primary, #303133);
  line-height: 1.4;
}
.el-pro-card__title-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.el-pro-card__subtitle {
  font-size: 13px;
  font-weight: 400;
  color: var(--el-text-color-secondary, #909399);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.el-pro-card__help {
  display: inline-flex;
  align-items: center;
  color: var(--el-text-color-placeholder, #a8abb2);
  cursor: help;
}
.el-pro-card__help:hover {
  color: var(--el-text-color-secondary, #909399);
}
.el-pro-card__extra {
  flex: none;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 400;
  color: var(--el-text-color-regular, #606266);
}
.el-pro-card__collapse {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  flex: none;
  color: var(--el-text-color-secondary, #909399);
  transition: transform 0.2s ease;
}
.el-pro-card__collapse.is-open {
  transform: rotate(90deg);
}
.el-pro-card__collapse:hover {
  color: var(--el-text-color-primary, #303133);
}

/* ---- 封面 / 内容 / 底部 ---- */
.el-pro-card__cover {
  overflow: hidden;
  border-radius: var(--el-border-radius-base, 4px) var(--el-border-radius-base, 4px) 0 0;
}
.el-pro-card__cover img {
  display: block;
  width: 100%;
}
.el-pro-card__body {
  flex: 1;
  min-width: 0;
  padding: var(--el-pro-card-padding);
  box-sizing: border-box;
}
.el-pro-card__actions {
  display: flex;
  align-items: stretch;
  border-top: 1px solid var(--el-pro-card-border);
}
.el-pro-card__action {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 8px;
  font-size: 13px;
  color: var(--el-text-color-regular, #606266);
}
.el-pro-card__action + .el-pro-card__action {
  border-left: 1px solid var(--el-pro-card-border);
}

/* ---- 拆分 ---- */
.el-pro-card.is-contain-child > .el-pro-card__body {
  box-sizing: border-box;
}
.el-pro-card.is-split-vertical > .el-pro-card__body > *:not(:last-child) {
  border-right: 1px solid var(--el-pro-card-border);
}
.el-pro-card.is-split-horizontal > .el-pro-card__body > *:not(:last-child) {
  border-bottom: 1px solid var(--el-pro-card-border);
}

/* ---- 标签页 ---- */
.el-pro-card__tabs > .el-pro-card__tabs-inner > .el-tabs__header {
  margin: 0;
  padding: 0 var(--el-pro-card-padding);
}
.el-pro-card__tab-body {
  padding: var(--el-pro-card-padding);
}
</style>
