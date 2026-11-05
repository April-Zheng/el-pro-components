<script setup lang="ts">
/**
 * ElProCardDivider —— ProCard 分栏里的竖/横分割线。
 *
 * 与 `split` 的区别：`split` 是「每两个子卡之间自动画线」，这个是**手动**在
 * 任意位置插一条，适合「左内容 + 右操作」这种非均分布局。
 * 方向跟随父卡的分栏方向：竖排卡片里是竖线，横排里是横线；也可用 `type` 强制。
 */
defineOptions({ name: 'ElProCardDivider' })

withDefaults(
  defineProps<{
    /** 竖线（分隔左右）还是横线（分隔上下）。默认竖线 */
    type?: 'vertical' | 'horizontal'
  }>(),
  { type: 'vertical' },
)
</script>

<template>
  <div class="el-pro-card-divider" :class="`is-${type}`" aria-hidden="true" />
</template>

<style>
.el-pro-card-divider {
  flex: none;
  background: var(--el-border-color-lighter, #ebeef5);
}
.el-pro-card-divider.is-vertical {
  align-self: stretch;
  width: 1px;
  margin: 8px 0;
}
.el-pro-card-divider.is-horizontal {
  width: 100%;
  height: 1px;
  margin: 8px 0;
}
</style>
