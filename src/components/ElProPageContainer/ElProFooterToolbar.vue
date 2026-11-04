<script setup lang="ts">
/**
 * ElProFooterToolbar —— 底部固定操作条。
 *
 * 结构照源码：左边 `extra`（通常是「已选 N 项」），右边操作按钮，整条钉在视口底部、
 * 半透明 + 背景模糊，滚动内容从它下面穿过。
 *
 * 源码从 RouteContext 里读 `siderWidth` 算宽度。这里对齐：inject 布局上下文拿当前
 * 侧栏宽度自动避让（随折叠联动）；不在布局内时回落 0。显式传 `offsetLeft` 始终优先。
 */
import { computed, inject } from 'vue'
import { PRO_LAYOUT } from '../../core/layoutContext'

defineOptions({ name: 'ElProFooterToolbar' })

const props = withDefaults(
  defineProps<{
    /** 左边附加区。也可以用 `#extra` 插槽 */
    extra?: string
    /** 是否钉在视口底部。传 false 就退回文档流（嵌在卡片里时用） @default true */
    fixed?: boolean
    /**
     * 左侧避让距离。不传时自动从外层 ElProLayout 布局上下文取当前侧栏宽度
     * （随折叠联动）；不在布局内或想覆盖时显式传。数字按 px，字符串原样当 CSS 值
     */
    offsetLeft?: number | string
    zIndex?: number
    /** 传 true 渲染到 body，避免被父级 overflow / transform 裁掉 */
    teleport?: boolean
  }>(),
  {
    fixed: true,
    offsetLeft: undefined,
    zIndex: 99,
    teleport: false,
  },
)

/** 自动避让：在 ElProLayout 内时取当前侧栏宽度，不在布局内回落 0 */
const layoutCtx = inject(PRO_LAYOUT, null)
const effectiveOffsetLeft = computed<number | string>(() => {
  if (props.offsetLeft !== undefined) return props.offsetLeft
  return layoutCtx ? layoutCtx.siderWidth() : 0
})

const barStyle = computed(() => {
  const value = effectiveOffsetLeft.value
  const left = typeof value === 'number' ? `${value}px` : value
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
