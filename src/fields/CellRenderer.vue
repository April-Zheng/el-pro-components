<script setup lang="ts">
/**
 * 单元格渲染器。把 resolveCell 的解析结果套上 Element Plus 的外壳。
 *
 * 只做展示，不碰数据。自定义渲染优先用列插槽（#propName），
 * 需要跨表复用逻辑时再传 column.cellComponent。
 */
import { computed, defineComponent, inject, onBeforeUnmount, ref, watch } from 'vue'
import { ElAvatar, ElImage, ElLink, ElProgress, ElRate, ElTag, ElTooltip } from 'element-plus'
import { PRO_CONFIG, EMPTY_PRO_CONFIG } from '../core/configContext'
import { resolveCell } from '../core/valueType'
import type { VNode } from 'vue'
import type { ProColumn } from '../types'

/**
 * 自定义 valueType 的宿主：render 函数返回的 VNode（或纯文本）在这里落地。
 * 不直接 `<component :is="vnode">`：:is 对 VNode 的支持依赖内部实现，
 * 函数式组件是文档明确的行为。
 */
const VNodeHost = (props: { node: VNode | string | null }) => props.node
VNodeHost.props = ['node'] as const

const props = defineProps<{
  value: any
  column: ProColumn
  row?: any
  index?: number
  emptyText?: string | false
}>()

/** 全局 valueTypeMap：ProConfigProvider 下发，无 Provider 时为空表 */
const config = inject(PRO_CONFIG, EMPTY_PRO_CONFIG)

/** 命中自定义 valueType 时的渲染结果；未命中返回 null，走内置词汇 */
const customNode = computed<VNode | string | null>(() => {
  const vt = props.column.valueType
  if (!vt) return null
  const cfg = config.valueTypeMap[vt]
  if (!cfg?.render) return null
  return cfg.render({ value: props.value, column: props.column, row: props.row, index: props.index })
})

const resolved = computed(() => {
  const vt = props.column.valueType
  const hasEnum = !!props.column.valueEnum
  // 与 ProComponents 一致：没显式写 valueType 但配了 valueEnum 时，按 select 语义走 tag；
  // codeEditor（Monaco 编辑态词汇）在只读展示里按 code 形态走
  const effective = !vt && hasEnum ? 'tag' : vt === 'codeEditor' ? 'code' : vt
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

/** 判断 URL 是否为图片：按扩展名或 data:image/ 前缀 */
function isImageUrl(url: string): boolean {
  if (/^data:image\//i.test(url)) return true
  return /\.(png|jpe?g|gif|webp|svg|bmp|avif|ico)(\?.*)?$/i.test(url)
}

/** upload 读态的展示项：拆出 url / 名称 / 是否图片，供模板渲染图片墙 + 文件链接 */
const uploadItems = computed(() => {
  const raw = props.value
  const urls = Array.isArray(raw) ? raw : raw == null ? [] : [raw]
  return urls.map((url, i) => {
    let name = ''
    try {
      const path = String(url).split(/[?#]/)[0]
      name = decodeURIComponent(path.split('/').pop() ?? '')
    } catch {
      /* 个别非法编码忽略，降级用兜底文案 */
    }
    return { url: String(url), name: name || `文件 ${i + 1}`, image: isImageUrl(String(url)) }
  })
})

/** 复制成功反馈：图标短暂变 ✓（对齐 antd Typography 的安静反馈，不弹 ElMessage） */
const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | null = null

async function handleCopy() {
  try {
    await navigator.clipboard.writeText(resolved.value.text)
    copied.value = true
    if (copiedTimer) clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => {
      copied.value = false
      copiedTimer = null
    }, 1500)
  } catch {
    /* 剪贴板不可用时静默降级，不打断用户操作，也不进成功态 */
  }
}

onBeforeUnmount(() => {
  if (copiedTimer) clearTimeout(copiedTimer)
})

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
</script>

<template>
  <!-- 自定义 valueType（ProConfigProvider 注册）优先于内置词汇 -->
  <VNodeHost v-if="customNode" :node="customNode" class="el-pro-cell__custom" />

  <!-- indexBorder：圆底序号徽章，对齐 React IndexColumn border（序号 > 3 变灰） -->
  <span
    v-else-if="column.valueType === 'indexBorder' && resolved.kind === 'text'"
    class="el-pro-index-badge"
    :class="{ 'is-top-three': Number(resolved.text) > 3 }"
  >{{ resolved.text }}</span>

  <span v-else-if="resolved.kind === 'empty'" class="el-pro-cell__empty">{{ resolved.text }}</span>

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

  <div
    v-else-if="resolved.kind === 'upload'"
    class="el-pro-cell__upload"
    :class="uploadItems.some((i) => i.image) ? 'has-image' : undefined"
  >
    <template v-for="item in uploadItems" :key="item.url">
      <ElImage
        v-if="item.image"
        :src="item.url"
        :preview-src-list="uploadItems.filter((i) => i.image).map((i) => i.url)"
        :preview-teleported="true"
        fit="cover"
        class="el-pro-cell__upload-img"
      />
      <ElLink
        v-else
        :href="item.url"
        target="_blank"
        type="primary"
        class="el-pro-cell__upload-link"
      >
        {{ item.name }}
      </ElLink>
    </template>
  </div>

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
      <ElTooltip v-if="copyable" :content="copied ? '已复制' : '复制'" placement="top" :show-after="300">
        <span class="el-pro-cell__copy" role="button" tabindex="0" @click.stop="handleCopy">
          <svg v-if="copied" class="el-pro-cell__copy-check" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6">
            <path d="M3 8.5 6.5 12 13 4.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <svg v-else viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.2">
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
.el-pro-cell__upload {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.el-pro-cell__upload.has-image {
  gap: 4px;
}
.el-pro-cell__upload-img {
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 4px;
}
.el-pro-cell__upload-link {
  font-size: 12px;
}
.el-pro-cell__upload-link + .el-pro-cell__upload-link {
  margin-left: 8px;
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

/*
 * indexBorder 圆底序号徽章，对齐 React IndexColumn border 的配色。
 * 色值用 CSS 变量暴露：主题可覆盖默认的深灰/浅灰两档
 */
.el-pro-index-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 18px;
  height: 18px;
  color: #fff;
  font-size: 12px;
  line-height: 12px;
  background: var(--el-pro-index-badge-bg, #314659);
  border-radius: 9px;
}
.el-pro-index-badge.is-top-three {
  background: var(--el-pro-index-badge-dim-bg, #979797);
}
</style>
