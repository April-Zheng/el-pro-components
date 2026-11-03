<script setup lang="ts">
/**
 * ElProPageHeader —— 页头。
 *
 * 照源码 `layout/components/PageHeader` 的四段式结构：
 *   面包屑 → 标题行（返回 / 头像 / 标题 / 副标题 / 标签 + 右侧操作）→ 说明内容 → footer
 *
 * 两个刻意保留的源码行为：
 * 1. **返回按钮只在监听了 `@back` 时出现**。源码是 `if (!backIcon || !onBack) return null`，
 *    也就是按钮的存在与否由「有没有人处理返回」决定，而不是由某个 show 开关决定。
 * 2. **宽度小于 768 时转成上下排列**（源码用 ResizeObserver 量自身宽度，不是量窗口），
 *    所以它嵌在窄容器里也会自动换行。
 *
 * `breadcrumbRender` 也留着：返回 `null` 就是不渲染，用来做「某些页面不显示面包屑」
 * 比再传一个 `hideBreadcrumb` 少一个开关。
 */
import { computed, defineComponent, getCurrentInstance, onBeforeUnmount, onMounted, ref, useSlots } from 'vue'
import { ElAvatar, ElBreadcrumb, ElBreadcrumbItem, ElTag } from 'element-plus'
import type { ProBreadcrumbItem, ProPageHeaderProps, ProPageTag } from '../../types'

defineOptions({ name: 'ElProPageHeader' })

const props = withDefaults(defineProps<ProPageHeaderProps>(), {
  // 显式写 undefined：`string | false` 会被编译成 [String, Boolean]，
  // 不写默认值时「没传」会被 Boolean 转成 false，就和「主动传 false」混在一起了。
  // breadcrumbRender 是 `false | 函数`，同样踩这个坑 —— 漏了它面包屑永远不渲染。
  title: undefined,
  backIcon: undefined,
  breadcrumbRender: undefined,
  tags: () => [],
  breadcrumb: () => [],
  ghost: true,
  contentWidth: 'Fluid',
  layout: 'side',
})

const emit = defineEmits<{
  back: []
  'breadcrumb-click': [item: ProBreadcrumbItem, index: number]
}>()

const slots = useSlots()
const instance = getCurrentInstance()

/** 有没有人监听 @back —— 声明成 emits 之后它就进不了 attrs，只能从 vnode.props 看 */
const hasBackListener = computed(() => typeof instance?.vnode.props?.onBack === 'function')
const showBack = computed(() => hasBackListener.value && props.backIcon !== false)

const tagList = computed<ProPageTag[]>(() =>
  props.tags.map((t) => (typeof t === 'string' ? { text: t } : t)),
)

const hasTitle = computed(() => props.title !== false && !!props.title)
const hasHeading = computed(
  () =>
    hasTitle.value ||
    !!props.subTitle ||
    tagList.value.length > 0 ||
    !!props.extra ||
    !!slots.extra,
)

/** 最后一项默认当「当前页」，除非显式用 current 改过 */
const breadcrumbItems = computed<ProBreadcrumbItem[]>(() => {
  const items = props.breadcrumb
  return items.map((item, index) => ({
    ...item,
    current: item.current ?? index === items.length - 1,
  }))
})

const hasBreadcrumb = computed(
  () => props.breadcrumbRender !== false && breadcrumbItems.value.length > 0,
)

/**
 * 把 `breadcrumbRender` 的返回值当组件渲染。
 * 用一层极薄的函数式组件包住，比在模板里手写 h() 更容易读懂。
 */
const RenderBreadcrumb = defineComponent({
  props: {
    render: { type: Function, required: true },
    items: { type: Array, required: true },
  },
  setup(p) {
    return () => (p.render as (items: ProBreadcrumbItem[]) => any)(p.items as ProBreadcrumbItem[])
  },
})

const customBreadcrumb = computed(() =>
  typeof props.breadcrumbRender === 'function' ? props.breadcrumbRender : null,
)

/* --------------------------- 窄了自动换行（源码的 compact） -------------------------- */

const rootRef = ref<HTMLElement>()
const compact = ref(false)
let observer: ResizeObserver | null = null

onMounted(() => {
  if (!rootRef.value || typeof ResizeObserver === 'undefined') return
  observer = new ResizeObserver(([entry]) => {
    compact.value = entry.contentRect.width < 768
  })
  observer.observe(rootRef.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})
</script>

<template>
  <div
    ref="rootRef"
    class="el-pro-page-header"
    :class="{
      'is-ghost': ghost,
      'is-compact': compact,
      'has-breadcrumb': hasBreadcrumb,
    }"
    data-testid="el-pro-page-header"
  >
    <!-- 面包屑：插槽 > breadcrumbRender 函数 > 内置 -->
    <div v-if="hasBreadcrumb || slots.breadcrumb" class="el-pro-page-header__breadcrumb">
      <slot name="breadcrumb">
        <RenderBreadcrumb
          v-if="customBreadcrumb"
          :render="customBreadcrumb"
          :items="breadcrumbItems"
        />
        <ElBreadcrumb v-else separator="/">
          <ElBreadcrumbItem v-for="(item, index) in breadcrumbItems" :key="item.path ?? item.title">
            <a
              v-if="item.path && !item.current"
              class="el-pro-page-header__breadcrumb-link"
              href="javascript:void(0)"
              @click="emit('breadcrumb-click', item, index)"
            >{{ item.title }}</a>
            <span v-else :class="{ 'is-current': item.current }">{{ item.title }}</span>
          </ElBreadcrumbItem>
        </ElBreadcrumb>
      </slot>
    </div>

    <!-- 标题行 -->
    <div v-if="hasHeading" class="el-pro-page-header__heading">
      <div class="el-pro-page-header__heading-left">
        <button
          v-if="showBack"
          type="button"
          class="el-pro-page-header__back"
          aria-label="back"
          @click="emit('back')"
        >
          <slot name="backIcon">
            <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6">
              <path d="M10 3.5 5.5 8l4.5 4.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </slot>
        </button>

        <slot name="avatar">
          <ElAvatar v-if="avatar" :src="avatar" :size="32" class="el-pro-page-header__avatar" />
        </slot>

        <span v-if="hasTitle" class="el-pro-page-header__title" :title="String(props.title)">
          <slot name="title">{{ title }}</slot>
        </span>

        <span v-if="subTitle || slots.subTitle" class="el-pro-page-header__sub-title">
          <slot name="subTitle">{{ subTitle }}</slot>
        </span>

        <span v-if="tagList.length || slots.tags" class="el-pro-page-header__tags">
          <slot name="tags">
            <ElTag
              v-for="(tag, i) in tagList"
              :key="i"
              :type="tag.type"
              size="small"
              effect="light"
            >{{ tag.text }}</ElTag>
          </slot>
        </span>
      </div>

      <div v-if="extra || slots.extra" class="el-pro-page-header__heading-extra">
        <slot name="extra">{{ extra }}</slot>
      </div>
    </div>

    <!-- 说明内容 -->
    <div v-if="$slots.default" class="el-pro-page-header__content">
      <slot />
    </div>

    <!-- 页头底部，PageContainer 的 tab 就挂这儿 -->
    <div v-if="$slots.footer" class="el-pro-page-header__footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<style>
.el-pro-page-header {
  position: relative;
  box-sizing: border-box;
  padding: 16px 24px 0;
  color: var(--el-text-color-primary);
}
.el-pro-page-header.is-ghost {
  background: transparent;
}
.el-pro-page-header:not(.is-ghost) {
  background: var(--el-bg-color);
}
.el-pro-page-header__breadcrumb {
  padding-top: 4px;
  font-size: 13px;
  line-height: 1.6;
}
/* breadcrumbRender 返回 null 时容器里只剩注释节点，别留一条空白 */
.el-pro-page-header__breadcrumb:empty {
  display: none;
}
.el-pro-page-header__breadcrumb .el-breadcrumb {
  font-size: 13px;
}
.el-pro-page-header__breadcrumb-link {
  color: var(--el-text-color-regular);
  text-decoration: none;
}
.el-pro-page-header__breadcrumb-link:hover {
  color: var(--el-color-primary);
}
.el-pro-page-header__breadcrumb .is-current {
  color: var(--el-text-color-primary);
}
.el-pro-page-header__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-top: 8px;
}
.el-pro-page-header__heading-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.el-pro-page-header__heading-extra {
  display: flex;
  flex: none;
  align-items: center;
  gap: 8px;
}
.el-pro-page-header__back {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--el-text-color-regular);
  cursor: pointer;
}
.el-pro-page-header__back:hover {
  background: var(--el-fill-color-light);
  color: var(--el-color-primary);
}
.el-pro-page-header__avatar {
  flex: none;
}
.el-pro-page-header__title {
  overflow: hidden;
  color: var(--el-text-color-primary);
  font-size: 20px;
  font-weight: 500;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.el-pro-page-header__sub-title {
  overflow: hidden;
  color: var(--el-text-color-secondary);
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.el-pro-page-header__tags {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 4px;
}
.el-pro-page-header__content {
  padding-top: 6px;
}
.el-pro-page-header__footer {
  margin-top: 12px;
}
/* 窄容器里标题和操作区只能上下堆 */
.el-pro-page-header.is-compact .el-pro-page-header__heading {
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}
.el-pro-page-header.is-compact .el-pro-page-header__heading-extra {
  width: 100%;
  justify-content: flex-start;
}
.el-pro-page-header.is-compact .el-pro-page-header__sub-title,
.el-pro-page-header.is-compact .el-pro-page-header__title {
  white-space: normal;
}
.el-pro-page-header.is-compact {
  padding-right: 16px;
  padding-left: 16px;
}
</style>
