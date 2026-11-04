<script setup lang="ts">
/**
 * 单元格渲染器。把 resolveCell 的解析结果套上 Element Plus 的外壳。
 *
 * 只做展示，不碰数据。自定义渲染优先用列插槽（#propName），
 * 需要跨表复用逻辑时再传 column.cellComponent。
 */
import { computed, ref, watch } from 'vue'
import { ElAvatar, ElImage, ElProgress, ElRate, ElTag, ElTooltip } from 'element-plus'
import { resolveCell } from '../core/valueType'
import type { ProColumn } from '../types'

const props = defineProps<{
  value: any
  column: ProColumn
  row?: any
  index?: number
  emptyText?: string | false
}>()

const resolved = computed(() => {
  const vt = props.column.valueType
  const hasEnum = !!props.column.valueEnum
  // 与 ProComponents 一致：没显式写 valueType 但配了 valueEnum 时，按 select 语义走 tag
  const effective = !vt && hasEnum ? 'tag' : vt
  return resolveCell({
    value: props.value,
    valueType: effective,
    valueEnum: props.column.valueEnum,
    valueFormat: props.column.valueFormat,
    fieldProps: props.column.fieldProps,
    index: props.index,
    emptyText: props.emptyText,
  })
})

const copyable = computed(() => !!props.column.copyable && resolved.value.kind !== 'empty')

/** ellipsis：溢出时才出 tooltip。手动控制可见性——EP 的 tooltip 在 mouseenter 同步读 disabled，
 * 若用 disabled 门控，首次悬浮时量宽结果还没生效，会导致第一次不出 tooltip */
const ellipsis = computed(() => !!props.column.ellipsis && resolved.value.kind === 'text')
const ellipsisVisible = ref(false)
function onTextEnter(e: MouseEvent) {
  if (!ellipsis.value) return
  const host = e.currentTarget as HTMLElement
  const textEl = host.querySelector('.el-pro-cell__ellipsis') as HTMLElement | null
  ellipsisVisible.value = !!textEl && textEl.scrollWidth > textEl.clientWidth + 1
}
function onTextLeave() {
  ellipsisVisible.value = false
}
// 行复用（排序/刷新后同一实例渲染新内容）时旧测量作废，重置
watch(
  () => resolved.value.text,
  () => {
    ellipsisVisible.value = false
  },
)

async function handleCopy() {
  try {
    await navigator.clipboard.writeText(resolved.value.text)
  } catch {
    /* 剪贴板不可用时静默降级，不打断用户操作 */
  }
}
</script>

<template>
  <span v-if="resolved.kind === 'empty'" class="el-pro-cell__empty">{{ resolved.text }}</span>

  <ElAvatar
    v-else-if="resolved.kind === 'avatar'"
    :src="resolved.src"
    :size="24"
    shape="circle"
    class="el-pro-cell__avatar"
  />

  <ElImage
    v-else-if="resolved.kind === 'image'"
    :src="resolved.src"
    :preview-src-list="[resolved.src!]"
    :preview-teleported="true"
    fit="cover"
    class="el-pro-cell__image"
  />

  <span v-else-if="resolved.kind === 'color'" class="el-pro-cell__color">
    <span class="el-pro-cell__swatch" :style="{ background: resolved.colorValue }" />
    <span>{{ resolved.text }}</span>
  </span>

  <ElRate
    v-else-if="resolved.kind === 'rate'"
    :model-value="resolved.rateValue"
    disabled
    size="small"
    class="el-pro-cell__rate"
  />

  <ElProgress
    v-else-if="resolved.kind === 'progress'"
    :percentage="resolved.percentage"
    :status="resolved.progressStatus || undefined"
    :stroke-width="8"
    class="el-pro-cell__progress"
  />

  <ElTag
    v-else-if="resolved.kind === 'tag'"
    :type="resolved.tagColor ? undefined : resolved.tagType"
    :color="resolved.tagColor"
    size="small"
    disable-transitions
  >
    {{ resolved.text }}
  </ElTag>

  <span
    v-else-if="resolved.kind === 'status'"
    class="el-pro-cell__status"
    :class="`is-${resolved.tagColor ? 'custom' : resolved.tagType}`"
  >
    <i class="el-pro-cell__dot" :style="resolved.tagColor ? { background: resolved.tagColor } : undefined" />
    <span>{{ resolved.text }}</span>
  </span>

  <pre v-else-if="resolved.kind === 'code'" class="el-pro-cell__code">{{ resolved.codeText }}</pre>

  <ElTooltip
    v-else
    manual
    :visible="ellipsis ? ellipsisVisible : false"
    :content="resolved.text"
    placement="top"
    :show-after="300"
  >
    <span
      class="el-pro-cell__text"
      :style="resolved.textColor ? { color: resolved.textColor } : undefined"
      @mouseenter="onTextEnter"
      @mouseleave="onTextLeave"
    >
      <span class="el-pro-cell__ellipsis">{{ resolved.text }}</span>
      <ElTooltip v-if="copyable" content="复制" placement="top" :show-after="300">
        <span class="el-pro-cell__copy" role="button" tabindex="0" @click.stop="handleCopy">
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.2">
            <rect x="5.5" y="5.5" width="8" height="8" rx="1.6" />
            <path d="M10.5 5.5V4A1.6 1.6 0 0 0 8.9 2.4H4A1.6 1.6 0 0 0 2.4 4v4.9A1.6 1.6 0 0 0 4 10.5h1.5" />
          </svg>
        </span>
      </ElTooltip>
    </span>
  </ElTooltip>
</template>

<style>
.el-pro-cell__empty {
  color: var(--el-text-color-placeholder);
}
.el-pro-cell__code {
  margin: 0;
  padding: 6px 8px;
  max-width: 100%;
  max-height: 240px;
  overflow: auto;
  background: var(--el-fill-color-light);
  border-radius: 4px;
  font-family: var(--el-font-family, monospace);
  font-size: 12px;
  line-height: 1.6;
  white-space: pre;
}
.el-pro-cell__text {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
}
.el-pro-cell__text > span:first-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.el-pro-cell__copy {
  flex: none;
  display: inline-flex;
  cursor: pointer;
  color: var(--el-text-color-placeholder);
  opacity: 0;
  transition: opacity 0.15s;
}
.el-table__row:hover .el-pro-cell__copy {
  opacity: 1;
}
.el-pro-cell__copy:hover {
  color: var(--el-color-primary);
}
.el-pro-cell__image {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  vertical-align: middle;
}
.el-pro-cell__avatar {
  vertical-align: middle;
  background: var(--el-fill-color);
}
.el-pro-cell__progress {
  width: 100%;
  min-width: 60px;
}
.el-pro-cell__rate {
  --el-rate-icon-size: 15px;
  height: 20px;
}
.el-pro-cell__color {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.el-pro-cell__swatch {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: 1px solid var(--el-border-color);
  flex: none;
}
.el-pro-cell__status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.el-pro-cell__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex: none;
  background: currentColor;
}
.el-pro-cell__status.is-primary { color: var(--el-color-primary); }
.el-pro-cell__status.is-success { color: var(--el-color-success); }
.el-pro-cell__status.is-warning { color: var(--el-color-warning); }
.el-pro-cell__status.is-danger { color: var(--el-color-danger); }
.el-pro-cell__status.is-info { color: var(--el-color-info); }
.el-pro-cell__status.is-custom { color: var(--el-text-color-regular); }
</style>
