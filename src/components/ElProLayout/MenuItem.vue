<script setup lang="ts">
/**
 * 菜单项递归组件。
 *
 * 通过显式 import 自身实现递归 —— Vue 3 里 `<script setup>` 的文件名自引用
 * 在部分构建链路下不稳定，显式 import 是最可靠的做法。
 */
import { computed } from 'vue'
import { ElMenuItem, ElSubMenu } from 'element-plus'
import type { ProLayoutMenuItem } from '../../types'
import MenuItem from './MenuItem.vue'

defineOptions({ name: 'ElProMenuItem' })

const props = defineProps<{
  item: ProLayoutMenuItem
  /** 当前激活路径，用于给叶子项打标记 */
  activePath?: string
}>()

const children = computed(() => (props.item.children ?? []).filter((c) => !c.hideInMenu))
const hasChildren = computed(() => children.value.length > 0)
const index = computed(() => props.item.path ?? props.item.title)

/**
 * 路由 query：拼成 route 对象交给 el-menu 的 router 模式（push(route || index)）。
 * 不把 query 塞进 index 字符串——index 同时是高亮匹配的键，改了会破坏选中态。
 * 无 query 时返回 undefined，跳转行为保持 index 兼底。
 */
const itemRoute = computed(() => {
  const query = props.item.query
  if (!query || Object.keys(query).length === 0) return undefined
  const path = props.item.path
  return path ? { path, query } : undefined
})
</script>

<template>
  <ElSubMenu v-if="hasChildren" :index="index">
    <template #title>
      <component :is="item.icon" v-if="item.icon" class="el-pro-menu__icon" />
      <span class="el-pro-menu__title">{{ item.title }}</span>
    </template>
    <MenuItem
      v-for="child in children"
      :key="child.path ?? child.title"
      :item="child"
      :active-path="activePath"
    />
  </ElSubMenu>

  <ElMenuItem v-else :index="index" :route="itemRoute">
    <component :is="item.icon" v-if="item.icon" class="el-pro-menu__icon" />
    <template #title>
      <a
        v-if="item.href"
        class="el-pro-menu__link"
        :href="item.href"
        target="_blank"
        rel="noopener noreferrer"
        @click.stop
      >{{ item.title }}</a>
      <span v-else class="el-pro-menu__title">{{ item.title }}</span>
      <span v-if="item.badge !== undefined && item.badge !== ''" class="el-pro-menu__badge">
        {{ item.badge }}
      </span>
    </template>
  </ElMenuItem>
</template>

<style>
.el-pro-menu__icon {
  width: 16px;
  height: 16px;
  margin-right: 8px;
  flex: none;
  vertical-align: -2px;
}
.el-pro-menu__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.el-pro-menu__link {
  color: inherit;
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.el-pro-menu__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  margin-left: 6px;
  font-size: 11px;
  line-height: 1;
  border-radius: 8px;
  background: var(--el-color-danger);
  color: #fff;
}
</style>
