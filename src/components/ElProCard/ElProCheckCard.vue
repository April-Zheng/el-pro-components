<script setup lang="ts">
/**
 * ElProCheckCard —— 可整块点选的卡片。
 *
 * 用在「选一个套餐 / 选一种布局 / 选一个角色」这类场景：选项本身需要
 * 头像、描述、封面等富信息，下拉框装不下，单选按钮又太素。
 *
 * 两种用法：
 * - 独立：`<ElProCheckCard v-model:checked="on" title="…" />`
 * - 成组：放进 `<ElProCheckCardGroup v-model="val" :options="…" />`，
 *   选中态由组统一管理，卡片只负责上报「我被点了」。
 */
import { computed, inject } from 'vue'
import type { VNode } from 'vue'
import ElProSkeletonComp from '../ElProSkeleton/ElProSkeleton.vue'
import { PRO_CHECK_CARD_CONTEXT } from '../../core/cardContext'

defineOptions({ name: 'ElProCheckCard' })

const props = withDefaults(
  defineProps<{
    /** 在组里的取值。独立使用时可以不传 */
    value?: string | number
    title?: string | number
    subTitle?: string | number
    description?: string | number
    /** 头像：图片地址或自定义节点 */
    avatar?: string | VNode
    /** 封面图，横向铺满卡片顶部 */
    cover?: string | VNode
    /** 右上角角标 */
    extra?: string | VNode
    /** 独立使用时的受控选中态 */
    checked?: boolean
    size?: 'default' | 'small'
    disabled?: boolean
    loading?: boolean
    /** 幽灵态：去背景与边框，仅保留选中描边 */
    ghost?: boolean
    /** 卡片内联样式（间距/宽度等定制点） */
    bodyStyle?: Record<string, any>
  }>(),
  {
    size: 'default',
    disabled: false,
    loading: false,
  },
)

const emit = defineEmits<{
  'update:checked': [boolean]
  change: [boolean]
}>()

const group = inject(PRO_CHECK_CARD_CONTEXT, null)

const isChecked = computed(() =>
  group && props.value !== undefined ? group.isChecked(props.value) : !!props.checked,
)

const isDisabled = computed(() => props.disabled || !!group?.disabled.value)

function handleClick() {
  if (isDisabled.value) return
  if (group && props.value !== undefined) {
    group.toggle(props.value)
    return
  }
  if (props.checked === undefined) emit('update:checked', !isChecked.value)
  emit('change', !isChecked.value)
}
</script>

<template>
  <div
    class="el-pro-check-card"
    :class="{
      'is-checked': isChecked,
      'is-disabled': isDisabled,
      'is-small': size === 'small',
      'is-ghost': ghost,
    }"
    :style="bodyStyle"
    role="checkbox"
    :aria-checked="isChecked"
    :aria-disabled="isDisabled"
    :tabindex="isDisabled ? -1 : 0"
    @click="handleClick"
    @keydown.enter.prevent="handleClick"
    @keydown.space.prevent="handleClick"
  >
    <div v-if="cover" class="el-pro-check-card__cover">
      <slot name="cover">
        <img v-if="typeof cover === 'string'" :src="cover" alt="" />
        <component :is="cover" v-else />
      </slot>
    </div>

    <ElProSkeletonComp v-if="loading" type="list" :rows="1" />

    <div v-else class="el-pro-check-card__inner">
      <div v-if="avatar || $slots.avatar" class="el-pro-check-card__avatar">
        <slot name="avatar">
          <img v-if="typeof avatar === 'string'" :src="avatar" alt="" />
          <component :is="avatar" v-else />
        </slot>
      </div>

      <div class="el-pro-check-card__content">
        <div v-if="title !== undefined || subTitle !== undefined || $slots.title" class="el-pro-check-card__title">
          <slot name="title" :checked="isChecked">
            <span class="el-pro-check-card__title-text">{{ title }}</span>
            <span v-if="subTitle !== undefined" class="el-pro-check-card__subtitle">{{ subTitle }}</span>
          </slot>
        </div>

        <div v-if="description !== undefined" class="el-pro-check-card__desc">{{ description }}</div>

        <slot :checked="isChecked" />
      </div>
    </div>

    <div v-if="extra !== undefined || $slots.extra" class="el-pro-check-card__extra">
      <!-- 插槽优先：prop 与插槽同时给时不双重渲染 -->
      <slot v-if="$slots.extra" name="extra" />
      <template v-else>
        <component :is="extra" v-if="typeof extra !== 'string'" />
        <span v-else>{{ extra }}</span>
      </template>
    </div>

    <!-- 选中角标：用 CSS 画，避免引图标库 -->
    <span v-if="isChecked" class="el-pro-check-card__mark" aria-hidden="true">
      <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3.5 8.5l3 3 6-7" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </span>

    <!-- 底部操作区 -->
    <div v-if="$slots.actions" class="el-pro-check-card__actions" @click.stop>
      <slot name="actions" :checked="isChecked" />
    </div>
  </div>
</template>

<style>
.el-pro-check-card {
  position: relative;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  background: var(--el-bg-color, #fff);
  border: 1px solid var(--el-border-color, #dcdfe6);
  border-radius: var(--el-border-radius-base, 4px);
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s, background-color 0.2s;
  user-select: none;
}
.el-pro-check-card.is-small {
  padding: 12px;
  gap: 8px;
}
.el-pro-check-card:hover {
  border-color: var(--el-color-primary-light-5, #a0cfff);
}
.el-pro-check-card.is-checked {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9, #ecf5ff);
  box-shadow: 0 0 0 1px var(--el-color-primary) inset;
}
.el-pro-check-card.is-disabled {
  cursor: not-allowed;
  opacity: 0.6;
  background: var(--el-fill-color-lighter, #fafafa);
}
.el-pro-check-card__inner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
}
.el-pro-check-card__avatar {
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: var(--el-border-radius-base, 4px);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--el-fill-color-light, #f5f7fa);
}
.el-pro-check-card__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.el-pro-check-card__content {
  flex: 1;
  min-width: 0;
}
.el-pro-check-card__title {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary, #303133);
  line-height: 1.5;
}
.el-pro-check-card__title-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.el-pro-check-card__subtitle {
  font-size: 12px;
  font-weight: 400;
  color: var(--el-text-color-secondary, #909399);
}
.el-pro-check-card__desc {
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-secondary, #909399);
}
.el-pro-check-card__cover {
  margin: -16px -16px 0;
  overflow: hidden;
  border-radius: var(--el-border-radius-base, 4px) var(--el-border-radius-base, 4px) 0 0;
}
.el-pro-check-card.is-small .el-pro-check-card__cover {
  margin: -12px -12px 0;
}
.el-pro-check-card__cover img {
  display: block;
  width: 100%;
  height: 120px;
  object-fit: cover;
}
.el-pro-check-card__extra {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 12px;
  color: var(--el-text-color-secondary, #909399);
}
.el-pro-check-card__mark {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 3px;
  color: #fff;
  background: var(--el-color-primary);
  border-radius: var(--el-border-radius-base, 4px) 0 var(--el-border-radius-base, 4px) 0;
  clip-path: polygon(100% 0, 100% 100%, 0 100%);
  box-sizing: border-box;
}
.el-pro-check-card__actions {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--el-border-color-lighter);
}
.el-pro-check-card.is-ghost {
  background: transparent;
  border: 1px solid transparent;
}
.el-pro-check-card.is-ghost.is-checked {
  border-color: var(--el-color-primary);
}
</style>
