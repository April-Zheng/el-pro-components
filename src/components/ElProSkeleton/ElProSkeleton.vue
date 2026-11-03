<script setup lang="ts">
/**
 * ElProSkeleton —— 骨架屏。
 *
 * 为什么不用 el-skeleton：Element Plus 的 skeleton 只做「行」，而这里是配合
 * ProCard / ProList / ProTable 的三种固定版式用的（列表带头像、表格带头、
 * 详情是键值对）。三种版式各写一遍 el-skeleton 的组合，调用方会疯。
 *
 * 不引第三方动画库，用 CSS 渐变扫光，`active=false` 时可关掉。
 */
import { computed } from 'vue'

defineOptions({ name: 'ElProSkeleton' })

const props = withDefaults(
  defineProps<{
    /** 版式 */
    type?: 'list' | 'table' | 'descriptions' | 'grid' | 'card'
    /** 行数 */
    rows?: number
    /** 列数（table 的表头列数、descriptions 的每组字段数、grid 的块数） */
    columns?: number
    /** 是否播放扫光动画 */
    active?: boolean
    /** 列表版式是否带头像 */
    avatar?: boolean
  }>(),
  {
    type: 'list',
    rows: 5,
    columns: 4,
    active: true,
    avatar: true,
  },
)

const rowList = computed(() => Array.from({ length: Math.max(1, props.rows) }, (_, i) => i))
const colList = computed(() => Array.from({ length: Math.max(1, props.columns) }, (_, i) => i))

/**
 * 文字条宽度的伪随机序列。
 * 目的只是让每行长短不一、看起来像真文字；用固定序列而不是 Math.random()，
 * 否则每次重渲染宽度都会跳。
 */
const WIDTHS = [0.98, 0.86, 0.72, 0.9, 0.64, 0.8, 0.94, 0.7]
const barWidth = (i: number) => `${Math.round(WIDTHS[i % WIDTHS.length] * 100)}%`
</script>

<template>
  <div class="el-pro-skeleton" :class="{ 'is-active': active }">
    <!-- 列表：头像 + 两行文字 -->
    <div v-if="type === 'list'" class="el-pro-skeleton__list">
      <div v-for="i in rowList" :key="i" class="el-pro-skeleton__list-item">
        <div v-if="avatar" class="el-pro-skeleton__avatar" />
        <div class="el-pro-skeleton__lines">
          <div class="el-pro-skeleton__bar" :style="{ width: barWidth(i) }" />
          <div class="el-pro-skeleton__bar is-thin" :style="{ width: barWidth(i + 3) }" />
        </div>
      </div>
    </div>

    <!-- 表格：表头 + 行 -->
    <div v-else-if="type === 'table'" class="el-pro-skeleton__table">
      <div class="el-pro-skeleton__tr is-head">
        <div v-for="c in colList" :key="c" class="el-pro-skeleton__td">
          <div class="el-pro-skeleton__bar is-thin" />
        </div>
      </div>
      <div v-for="i in rowList" :key="i" class="el-pro-skeleton__tr">
        <div v-for="c in colList" :key="c" class="el-pro-skeleton__td">
          <div class="el-pro-skeleton__bar is-thin" :style="{ width: barWidth(i + c) }" />
        </div>
      </div>
    </div>

    <!-- 详情：键值对 -->
    <div v-else-if="type === 'descriptions'" class="el-pro-skeleton__descriptions">
      <div v-for="i in rowList" :key="i" class="el-pro-skeleton__desc-row">
        <div v-for="c in colList" :key="c" class="el-pro-skeleton__desc-cell">
          <div class="el-pro-skeleton__bar is-thin is-label" :style="{ width: '32%' }" />
          <div class="el-pro-skeleton__bar is-thin" :style="{ width: barWidth(i + c) }" />
        </div>
      </div>
    </div>

    <!-- 卡片块 / 图表位 -->
    <div v-else-if="type === 'grid'" class="el-pro-skeleton__grid">
      <div v-for="i in colList" :key="i" class="el-pro-skeleton__block" />
    </div>

    <div v-else class="el-pro-skeleton__card">
      <div class="el-pro-skeleton__bar is-heading" />
      <div v-for="i in rowList" :key="i" class="el-pro-skeleton__bar" :style="{ width: barWidth(i) }" />
    </div>
  </div>
</template>

<style>
.el-pro-skeleton {
  --el-pro-skeleton-base: var(--el-fill-color-light, #f0f2f5);
  --el-pro-skeleton-shine: var(--el-fill-color-blank, #fff);
  padding: 4px 0;
}
.el-pro-skeleton__bar,
.el-pro-skeleton__avatar,
.el-pro-skeleton__block {
  background: var(--el-pro-skeleton-base);
  border-radius: 4px;
  position: relative;
  overflow: hidden;
}
.el-pro-skeleton__bar {
  height: 14px;
  margin-bottom: 10px;
}
.el-pro-skeleton__bar.is-thin {
  height: 10px;
  margin-bottom: 0;
}
.el-pro-skeleton__bar.is-label {
  background: color-mix(in srgb, var(--el-pro-skeleton-base) 70%, transparent);
}
.el-pro-skeleton__bar.is-heading {
  height: 20px;
  width: 40%;
  margin-bottom: 18px;
}

/* 扫光：只动 ::after 的 transform，不触发重排 */
.el-pro-skeleton.is-active .el-pro-skeleton__bar::after,
.el-pro-skeleton.is-active .el-pro-skeleton__avatar::after,
.el-pro-skeleton.is-active .el-pro-skeleton__block::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--el-pro-skeleton-shine) 72%, transparent),
    transparent
  );
  animation: el-pro-skeleton-shine 1.4s ease-in-out infinite;
}
@keyframes el-pro-skeleton-shine {
  100% {
    transform: translateX(100%);
  }
}

.el-pro-skeleton__list-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 0;
}
.el-pro-skeleton__list-item + .el-pro-skeleton__list-item {
  border-top: 1px solid var(--el-border-color-lighter, #ebeef5);
}
.el-pro-skeleton__avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex: none;
}
.el-pro-skeleton__lines {
  flex: 1;
  min-width: 0;
  padding-top: 4px;
}

.el-pro-skeleton__tr {
  display: flex;
  gap: 16px;
  padding: 10px 0;
}
.el-pro-skeleton__tr.is-head .el-pro-skeleton__bar {
  background: color-mix(in srgb, var(--el-pro-skeleton-base) 80%, var(--el-text-color-placeholder, #a8abb2));
}
.el-pro-skeleton__td {
  flex: 1;
  min-width: 0;
}

.el-pro-skeleton__desc-row {
  display: flex;
  gap: 24px;
  padding: 8px 0;
}
.el-pro-skeleton__desc-cell {
  flex: 1;
  display: flex;
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.el-pro-skeleton__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}
.el-pro-skeleton__grid .el-pro-skeleton__block {
  height: 88px;
}

.el-pro-skeleton__card .el-pro-skeleton__bar {
  max-width: 100%;
}
</style>
