<script setup lang="ts">
/**
 * ElProList —— 列表页模板。
 *
 * 和 ElProTable 是同一套思路的另一半：**一份 columns 定义，两种呈现**。
 * 表格适合字段多、要横向对比的场景；列表适合字段少、每条信息本身需要呼吸感的场景
 * （工单、消息、商品、审批单）。
 *
 * 关键设计：
 * - columns 里用 `listSlot` 指定这一列在条目里扮演什么角色（标题 / 描述 / 头像…）。
 *   不写也能跑：按 valueType 与顺序自动推断，抄表格那套 columns 直接出效果。
 * - 数据来源二选一：给 `request` 就是服务端分页，给 `dataSource` 就是本地分页。
 * - `itemType="card"` 时每条自动包一层 ElProCard，做卡片流不用自己 v-for 套壳。
 */
import { computed, h, ref, useSlots } from 'vue'
import type { Component } from 'vue'
import { ElPagination } from 'element-plus'
import CellRenderer from '../../fields/CellRenderer.vue'
import ElProCard from '../ElProCard/ElProCard.vue'
import { useTable } from '../../core/useTable'
import type { ProColumn, ProListGrid, ProListSlot, ProRequest } from '../../types'

defineOptions({ name: 'ElProList' })

const props = withDefaults(
  defineProps<{
    /** 条目字段定义。和 ElProTable 共用一份 ProColumn */
    columns?: ProColumn[]
    /** 服务端数据源 */
    request?: ProRequest
    /** 本地数据源。给了它就不走 request */
    dataSource?: any[]
    /** 额外查询参数，变化自动重查（仅 request 模式） */
    params?: Record<string, any>
    rowKey?: string
    /** horizontal：头像在左；vertical：头像在上 */
    itemLayout?: 'horizontal' | 'vertical'
    /** 分栏。column 为每行几个，其余键按断点覆盖 */
    grid?: ProListGrid
    /** row：纯列表；card：每条包一层卡片 */
    itemType?: 'row' | 'card'
    /** 分页，传 false 关闭 */
    pagination?: false | { pageSizes?: number[]; layout?: string }
    defaultPageSize?: number
    /** 条目之间是否画分割线 */
    split?: boolean
    /** 列表容器的外框 */
    bordered?: boolean
    loading?: boolean
    immediate?: boolean
    emptyText?: string
    /** 行选择：条目左侧出现勾选框，配 v-model:selected-keys */
    selection?: boolean
    /** 受控选中 key 列表 */
    selectedKeys?: (string | number)[]
    /** 展开行：条目标题旁出现展开箭头，内容用 #expanded-row-render 插槽 */
    expandable?: boolean
    /** 受控展开 key 列表，配 v-model:expanded-keys */
    expandedKeys?: (string | number)[]
    /** 操作区显示时机。'hover' 时悬浮条目才出现 @default 'always' */
    showActions?: 'always' | 'hover'
    /** extra 区显示时机 @default 'always' */
    showExtra?: 'always' | 'hover'
    /**
     * 加载更多：传了就不渲染分页，底部出现「加载更多」按钮。
     * 前提是调用方自己往 dataSource 里追数据
     */
    loadMore?: () => Promise<void>
  }>(),
  {
    columns: () => [],
    rowKey: 'id',
    itemLayout: 'horizontal',
    itemType: 'row',
    pagination: () => ({}),
    defaultPageSize: 10,
    split: true,
    bordered: true,
    immediate: true,
    emptyText: '暂无数据',
  },
)

const emit = defineEmits<{
  'item-click': [any, number]
  load: [any[]]
  error: [Error]
  'update:selectedKeys': [(string | number)[]]
  'selection-change': [any[]]
  'update:expandedKeys': [(string | number)[]]
  'expand-change': [string | number, boolean]
}>()

const slots = useSlots()

/** 插槽表按字符串索引访问（`item-<prop>` 是动态名字），这里显式放宽类型 */
const slotMap = computed<Record<string, any>>(() => slots as unknown as Record<string, any>)

/* ------------------------------ 数据 ------------------------------ */

const remote = useTable({
  columns: () => props.columns,
  request: props.request,
  params: () => props.params,
  defaultPageSize: props.defaultPageSize,
  immediate: props.immediate,
  onLoad: (list) => emit('load', list),
  onError: (err) => emit('error', err),
})

const isRemote = computed(() => !!props.request)

const localCurrent = ref(1)
const localPageSize = ref(props.defaultPageSize)

const rawList = computed<any[]>(() => (isRemote.value ? remote.data.value : (props.dataSource ?? [])))

const totalCount = computed(() =>
  isRemote.value ? remote.total.value : (props.dataSource?.length ?? 0),
)

/** 本地模式在这里切页；远程模式的切页已经在 useTable 里做掉了 */
const items = computed<any[]>(() => {
  if (isRemote.value || props.pagination === false) return rawList.value
  const start = (localCurrent.value - 1) * localPageSize.value
  return rawList.value.slice(start, start + localPageSize.value)
})

const current = computed(() => (isRemote.value ? remote.current.value : localCurrent.value))
const pageSize = computed(() => (isRemote.value ? remote.pageSize.value : localPageSize.value))
const loadingState = computed(() => props.loading || remote.loading.value)

function onPageChange(page: number) {
  if (isRemote.value) void remote.handlePageChange(page)
  else localCurrent.value = page
}

function onPageSizeChange(size: number) {
  if (isRemote.value) void remote.handlePageSizeChange(size)
  else {
    localPageSize.value = size
    localCurrent.value = 1
  }
}

/* ------------------------------ 条目结构 ------------------------------ */

interface Grouped {
  avatar: ProColumn[]
  title: ProColumn[]
  subTitle: ProColumn[]
  description: ProColumn[]
  content: ProColumn[]
  extra: ProColumn[]
  aside: ProColumn[]
  actions: ProColumn[]
}

/**
 * 把列分到条目里的各个位置。
 *
 * 推断顺序：显式 listSlot → valueType（头像/图片、操作列）→ 「第一个剩下的列当标题」。
 * 最后这条是为了「把表格的 columns 直接丢进来」也能有个像样的结果。
 */
const grouped = computed<Grouped>(() => {
  const g: Grouped = {
    avatar: [],
    title: [],
    subTitle: [],
    description: [],
    content: [],
    extra: [],
    aside: [],
    actions: [],
  }
  let titleAssigned = props.columns.some((c) => c.listSlot === 'title')

  for (const col of props.columns) {
    if (col.hideInTable && col.listSlot === undefined) continue
    let role: ProListSlot | undefined = col.listSlot
    if (!role) {
      const vt = col.valueType ?? 'text'
      if (vt === 'avatar' || vt === 'image') role = 'avatar'
      else if (vt === 'option') role = 'actions'
      else if (!titleAssigned && col.prop) {
        role = 'title'
        titleAssigned = true
      } else role = 'description'
    }
    g[role].push(col)
  }
  return g
})

/** 只有显式写了 listSlot 的列才进 subTitle / extra / aside —— 这几个槽位靠推断猜不出来 */
const hasStructure = computed(() => props.columns.length > 0)

/**
 * 单个字段的渲染器。
 *
 * 用函数式组件，是因为同一套「插槽 → cellComponent → CellRenderer」的优先级
 * 要在标题/描述/头像等六处复用；模板里写六遍必然走样。
 */
const Cell: Component = (p: { col: ProColumn; item: any; index: number }) => {
  const value = p.col.prop ? p.item?.[p.col.prop] : undefined
  const slot = p.col.prop ? slotMap.value[`item-${p.col.prop}`] : undefined
  if (slot) return slot({ item: p.item, index: p.index, value, column: p.col })
  if (p.col.cellComponent) {
    return h(p.col.cellComponent as any, { row: p.item, column: p.col, index: p.index, value })
  }
  return h(CellRenderer, { value, column: p.col, row: p.item, index: p.index })
}

/* ------------------------------ 排版 ------------------------------ */

const isGrid = computed(() => !!props.grid)

const gridStyle = computed(() => {
  const g = props.grid
  if (!g) return undefined
  const col = g.column ?? 1
  const gutter = Array.isArray(g.gutter) ? g.gutter : [g.gutter ?? 16, g.gutter ?? 16]
  return {
    gridTemplateColumns: col > 1 ? `repeat(${col}, minmax(0, 1fr))` : 'minmax(0, 1fr)',
    columnGap: `${gutter[0]}px`,
    rowGap: `${gutter[1] ?? gutter[0]}px`,
  }
})

const cardProps = { hoverable: true, type: 'inner' as const }

const itemKey = (item: any, index: number) => item?.[props.rowKey] ?? index

/* ------------------------------ 行选择 / 展开行 / 加载更多 ------------------------------ */

const innerSelectedKeys = ref<(string | number)[]>([])
const selectedKeys = computed<(string | number)[]>(() => props.selectedKeys ?? innerSelectedKeys.value)

function isSelected(item: any) {
  return selectedKeys.value.includes(itemKey(item, 0))
}

function toggleSelect(item: any) {
  const key = itemKey(item, 0)
  const next = isSelected(item)
    ? selectedKeys.value.filter((k) => k !== key)
    : [...selectedKeys.value, key]
  innerSelectedKeys.value = next
  emit('update:selectedKeys', next)
  const selected = items.value.filter((it) => next.includes(itemKey(it, 0)))
  emit('selection-change', selected)
}

function clearSelection() {
  innerSelectedKeys.value = []
  emit('update:selectedKeys', [])
  emit('selection-change', [])
}

const innerExpandedKeys = ref<(string | number)[]>([])
const expandedKeys = computed<(string | number)[]>(() => props.expandedKeys ?? innerExpandedKeys.value)

function isExpanded(item: any) {
  return expandedKeys.value.includes(itemKey(item, 0))
}

function toggleExpand(item: any) {
  const key = itemKey(item, 0)
  const next = isExpanded(item)
    ? expandedKeys.value.filter((k) => k !== key)
    : [...expandedKeys.value, key]
  innerExpandedKeys.value = next
  emit('update:expandedKeys', next)
  emit('expand-change', key, next.includes(key))
}

const loadMoreLoading = ref(false)
async function onLoadMore() {
  if (!props.loadMore || loadMoreLoading.value) return
  loadMoreLoading.value = true
  try {
    await props.loadMore()
  } finally {
    loadMoreLoading.value = false
  }
}
</script>

<template>
  <div class="el-pro-list" :class="{ 'is-bordered': bordered, 'is-card-type': itemType === 'card' }">
    <div v-if="$slots.header" class="el-pro-list__header">
      <slot name="header" />
    </div>

    <div v-loading="loadingState" class="el-pro-list__container">
      <div v-if="items.length" class="el-pro-list__items" :class="{ 'is-grid': isGrid }" :style="gridStyle">
        <component
          :is="itemType === 'card' ? ElProCard : 'div'"
          v-for="(item, index) in items"
          :key="itemKey(item, index)"
          v-bind="itemType === 'card' ? cardProps : {}"
          class="el-pro-list__entry"
          :class="itemType === 'card' ? 'is-card' : 'is-row'"
          @click="emit('item-click', item, index)"
        >
          <div class="el-pro-list__inner" :class="itemLayout === 'vertical' ? 'is-vertical' : 'is-horizontal'">
            <!-- 行选择勾选框 -->
            <div v-if="selection" class="el-pro-list__selection" @click.stop>
              <input
                type="checkbox"
                class="el-pro-list__checkbox"
                :checked="isSelected(item)"
                @change="toggleSelect(item)"
              />
            </div>

            <div v-if="grouped.avatar.length" class="el-pro-list__avatar">
              <component
                :is="Cell"
                v-for="col in grouped.avatar"
                :key="col.prop"
                :col="col"
                :item="item"
                :index="index"
              />
            </div>

            <div class="el-pro-list__main">
              <slot v-if="$slots.item" name="item" :item="item" :index="index" />

              <template v-else-if="hasStructure">
                <div v-if="grouped.title.length" class="el-pro-list__title">
                  <component
                    :is="Cell"
                    v-for="col in grouped.title"
                    :key="col.prop"
                    :col="col"
                    :item="item"
                    :index="index"
                  />
                  <!-- 展开箭头 -->
                  <button
                    v-if="expandable"
                    type="button"
                    class="el-pro-list__expand"
                    :class="{ 'is-open': isExpanded(item) }"
                    :aria-expanded="isExpanded(item)"
                    @click.stop="toggleExpand(item)"
                  >
                    <svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.5">
                      <path d="M2.5 4.5L6 8l3.5-3.5" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </button>
                </div>
                <div v-if="grouped.subTitle.length" class="el-pro-list__subtitle">
                  <component
                    :is="Cell"
                    v-for="col in grouped.subTitle"
                    :key="col.prop"
                    :col="col"
                    :item="item"
                    :index="index"
                  />
                </div>
                <div v-if="grouped.description.length" class="el-pro-list__desc">
                  <component
                    :is="Cell"
                    v-for="col in grouped.description"
                    :key="col.prop"
                    :col="col"
                    :item="item"
                    :index="index"
                  />
                </div>
                <div v-for="col in grouped.content" :key="col.prop" class="el-pro-list__content-cell">
                  <component :is="Cell" :col="col" :item="item" :index="index" />
                </div>
                <div v-if="grouped.actions.length || $slots.actions" class="el-pro-list__actions" :class="showActions === 'hover' ? 'is-hover' : ''" @click.stop>
                  <slot name="actions" :item="item" :index="index">
                    <component
                      :is="Cell"
                      v-for="col in grouped.actions"
                      :key="col.prop"
                      :col="col"
                      :item="item"
                      :index="index"
                    />
                  </slot>
                </div>

                <!-- 展开行内容 -->
                <div v-if="expandable && isExpanded(item)" class="el-pro-list__expanded" @click.stop>
                  <slot name="expanded-row-render" :item="item" :index="index" />
                </div>
              </template>
            </div>

            <div
              v-if="grouped.extra.length"
              class="el-pro-list__extra"
              :class="showExtra === 'hover' ? 'is-hover' : ''"
            >
              <component
                :is="Cell"
                v-for="col in grouped.extra"
                :key="col.prop"
                :col="col"
                :item="item"
                :index="index"
              />
            </div>
            <div v-if="grouped.aside.length" class="el-pro-list__aside">
              <component
                :is="Cell"
                v-for="col in grouped.aside"
                :key="col.prop"
                :col="col"
                :item="item"
                :index="index"
              />
            </div>
          </div>
        </component>
      </div>

      <div v-else-if="!loadingState" class="el-pro-list__empty">
        <slot name="empty">{{ emptyText }}</slot>
      </div>
    </div>

    <div v-if="loadMore && items.length" class="el-pro-list__footer el-pro-list__load-more">
      <button type="button" class="el-pro-list__load-more-btn" :disabled="loadMoreLoading" @click="onLoadMore">
        {{ loadMoreLoading ? '加载中…' : '加载更多' }}
      </button>
    </div>

    <div v-else-if="pagination !== false && totalCount > 0" class="el-pro-list__footer">
      <ElPagination
        :current-page="current"
        :page-size="pageSize"
        :total="totalCount"
        :page-sizes="(typeof pagination === 'object' && pagination.pageSizes) || [10, 20, 50, 100]"
        :layout="(typeof pagination === 'object' && pagination.layout) || 'total, sizes, prev, pager, next'"
        background
        @current-change="onPageChange"
        @size-change="onPageSizeChange"
      />
    </div>

    <div v-if="$slots.footer" class="el-pro-list__footer-extra">
      <slot name="footer" />
    </div>
  </div>
</template>

<style>
.el-pro-list {
  --el-pro-list-split: var(--el-border-color-lighter, #ebeef5);
  background: var(--el-bg-color, #fff);
  border-radius: var(--el-border-radius-base, 4px);
}
.el-pro-list.is-bordered {
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
}
.el-pro-list__header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-pro-list-split);
}
.el-pro-list__container {
  min-height: 80px;
}
.el-pro-list__items {
  padding: 0 16px;
}
.el-pro-list__items.is-grid {
  display: grid;
  padding: 16px;
}

.el-pro-list__entry {
  box-sizing: border-box;
  padding: 16px 0;
}
.el-pro-list__items.is-grid > .el-pro-list__entry {
  padding: 0;
}
/* 分割线：只在线性列表里画，栅格和卡片流画了会切断视觉 */
.el-pro-list__items:not(.is-grid) > .el-pro-list__entry + .el-pro-list__entry {
  border-top: 1px solid var(--el-pro-list-split);
}
.el-pro-list.is-card-type .el-pro-list__entry {
  padding: 0;
}

.el-pro-list__inner {
  display: flex;
  gap: 16px;
  min-width: 0;
}
.el-pro-list__inner.is-vertical {
  flex-direction: column;
  gap: 10px;
}
.el-pro-list__avatar {
  flex: none;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.el-pro-list__avatar .el-avatar,
.el-pro-list__avatar .el-pro-cell__image {
  width: 44px;
  height: 44px;
  border-radius: var(--el-border-radius-base, 4px);
}
/* CellRenderer 里的头像把尺寸写在行内 CSS 变量上，只能靠 !important 顶掉 */
.el-pro-list__avatar .el-avatar {
  --el-avatar-size: 44px !important;
}
.el-pro-list__main {
  flex: 1;
  min-width: 0;
}
.el-pro-list__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 500;
  color: var(--el-text-color-primary, #303133);
  line-height: 1.5;
}
.el-pro-list__subtitle {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
  font-size: 13px;
  color: var(--el-text-color-secondary, #909399);
}
.el-pro-list__desc {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-regular, #606266);
}
.el-pro-list__content-cell {
  margin-top: 8px;
  font-size: 13px;
}
.el-pro-list__actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
}
.el-pro-list__extra {
  flex: none;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: var(--el-text-color-regular, #606266);
}
.el-pro-list__aside {
  flex: none;
  display: flex;
  align-items: flex-start;
  width: 30%;
  max-width: 260px;
  font-size: 13px;
  color: var(--el-text-color-regular, #606266);
}
/* 卡片流：右侧字段没地方摆，整体改成竖排，标题在上、统计性字段在下 */
.el-pro-list__entry.is-card .el-pro-list__inner {
  flex-direction: column;
  gap: 6px;
}
.el-pro-list__entry.is-card .el-pro-list__extra,
.el-pro-list__entry.is-card .el-pro-list__aside {
  width: auto;
  max-width: none;
  font-size: 12px;
  color: var(--el-text-color-secondary, #909399);
}
.el-pro-list__empty {
  padding: 40px 0;
  text-align: center;
  font-size: 13px;
  color: var(--el-text-color-placeholder, #a8abb2);
}
.el-pro-list__footer {
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px;
  border-top: 1px solid var(--el-pro-list-split);
}
.el-pro-list__footer-extra {
  padding: 12px 16px;
  border-top: 1px solid var(--el-pro-list-split);
}
.el-pro-list__selection {
  flex: none;
  display: flex;
  align-items: flex-start;
  padding-top: 2px;
}
.el-pro-list__checkbox {
  width: 14px;
  height: 14px;
  accent-color: var(--el-color-primary);
  cursor: pointer;
}
.el-pro-list__expand {
  flex: none;
  display: inline-flex;
  align-items: center;
  padding: 2px;
  border: none;
  background: transparent;
  color: var(--el-text-color-secondary);
  cursor: pointer;
  transition: transform 0.2s;
}
.el-pro-list__expand.is-open {
  transform: rotate(180deg);
}
.el-pro-list__expanded {
  padding: 10px 12px;
  margin-top: 8px;
  background: var(--el-fill-color-lighter, #fafafa);
  border-radius: 4px;
  font-size: 13px;
}
/* hover 显示的操作区 / extra 区 */
.el-pro-list__actions.is-hover {
  opacity: 0;
  transition: opacity 0.15s;
}
.el-pro-list__entry:hover .el-pro-list__actions.is-hover {
  opacity: 1;
}
.el-pro-list__extra.is-hover {
  opacity: 0;
  transition: opacity 0.15s;
}
.el-pro-list__entry:hover .el-pro-list__extra.is-hover {
  opacity: 1;
}
.el-pro-list__load-more {
  justify-content: center;
}
.el-pro-list__load-more-btn {
  padding: 6px 16px;
  border: none;
  background: transparent;
  color: var(--el-color-primary);
  font-size: 13px;
  cursor: pointer;
}
.el-pro-list__load-more-btn:disabled {
  color: var(--el-text-color-placeholder);
  cursor: not-allowed;
}
.el-pro-list__entry.is-card {
  height: 100%;
}
.el-pro-list__entry.is-card .el-pro-card__body {
  padding: 16px;
}
</style>
