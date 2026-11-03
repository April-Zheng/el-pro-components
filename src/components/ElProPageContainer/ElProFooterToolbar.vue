<script setup lang="ts">
/**
 * ElProFooterToolbar —— 底部固定操作条。
 *
 * 结构照源码：左边 `extra`（通常是「已选 N 项」），右边操作按钮，整条钉在视口底部、
 * 半透明 + 背景模糊，滚动内容从它下面穿过。
 *
 * 源码从 RouteContext 里读 `siderWidth` 算宽度，我们这里没有路由上下文，
 * 改成显式的 `offsetLeft`。侧边布局里传 `var(--el-pro-sider-width)` 就能跟着菜单折叠走
 * —— ElProLayout 已经把这个变量打在根节点上了。
 */
import { computed } from 'vue'

defineOptions({ name: 'ElProFooterToolbar' })

const props = withDefaults(
  defineProps<{
    /** 左边附加区。也可以用 `#extra` 插槽 */
    extra?: string
    /** 是否钉在视口底部。传 false 就退回文档流（嵌在卡片里时用） @default true */
    fixed?: boolean
    /**
     * 左侧避让距离。侧边布局下传侧栏宽度，否则整条会盖住菜单。
     * 数字按 px 处理，字符串原样当 CSS 值
     */
    offsetLeft?: number | string
    zIndex?: number
    /** 传 true 渲染到 body，避免被父级 overflow / transform 裁掉 */
    teleport?: boolean
  }>(),
  {
    fixed: true,
    offsetLeft: 0,
    zIndex: 99,
    teleport: false,
  },
)

const barStyle = computed(() => {
  const left = typeof props.offsetLeft === 'number' ? `${props.offsetLeft}px` : props.offsetLeft
  if (!props.fixed) return { zIndex: props.zIndex }
  return { left, zIndex: props.zIndex }
})
</script>

<template>
  <Teleport to="body" :disabled="!teleport">
    <div
      class="el-pro-footer-toolbar"
      :class="{ 'is-fixed': fixed }"
      :style="barStyle"
      data-testid="el-pro-footer-toolbar"
    >
      <div class="el-pro-footer-toolbar__left">
        <slot name="extra">{{ extra }}</slot>
      </div>
      <div class="el-pro-footer-toolbar__right">
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<style>
.el-pro-footer-toolbar {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 24px;
  min-height: 56px;
  color: var(--el-text-color-primary);
  border-top: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color-overlay);
}
.el-pro-footer-toolbar.is-fixed {
  position: fixed;
  right: 0;
  bottom: 0;
  background: color-mix(in srgb, var(--el-bg-color-overlay) 76%, transparent);
  backdrop-filter: blur(8px);
  transition: left 0.2s ease;
}
.el-pro-footer-toolbar__left {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: var(--el-text-color-regular);
}
.el-pro-footer-toolbar__right {
  display: flex;
  flex: none;
  align-items: center;
  gap: 8px;
}
</style>
