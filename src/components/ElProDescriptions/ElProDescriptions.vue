<script setup lang="ts">
/**
 * ElProDescriptions —— 详情定义列表。
 *
 * 和 ElProTable 共用同一份 columns 定义，所以「表格里显示成 tag 的字段，
 * 详情页里也是同一个 tag」这件事是自动成立的，不用维护两套字典。
 *
 * 两种取数方式，二选一：
 * - `data`：父级已经拿到记录，直接传进来（最常见，配合路由参数用）
 * - `request`：自己拉数据，带 loading / 错误提示 / 取消上一次请求。
 *   详情页往往「一个页面一个接口」，父级为了这个接口要维护三份状态，
 *   交给组件反而更省。
 */
import { computed, onBeforeUnmount, ref, shallowRef, useSlots, watch } from 'vue'
import { ElAlert, ElDescriptions, ElDescriptionsItem } from 'element-plus'
import CellRenderer from '../../fields/CellRenderer.vue'
import ElProSkeleton from '../ElProSkeleton/ElProSkeleton.vue'
import { resolveResponsive, useBreakpoint } from '../../core/responsive'
import type { ProColumn, ProDescriptionsRequest, ResponsiveValue } from '../../types'

defineOptions({ name: 'ElProDescriptions' })

const props = withDefaults(
  defineProps<{
    columns: ProColumn[]
    /** 本地数据源。给了 `request` 时以 request 为准 */
    data?: Record<string, any>
    /** 服务端数据源。与 `data` 二选一 */
    request?: ProDescriptionsRequest
    /** 透传给 request 的参数，引用变化会重新请求 */
    params?: Record<string, any>
    /** 关闭时挂载后不自动请求，需手动调 reload() */
    immediate?: boolean
    /** 受控加载态。与内部请求态取或 */
    loading?: boolean
    /**
     * 每行几列。支持响应式写法（`{ xs: 1, md: 2, lg: 3 }`），
     * 详情页在窄屏上一行三列会把标签挤成一列竖排，几乎必配。
     */
    column?: ResponsiveValue<number>
    border?: boolean
    size?: 'large' | 'default' | 'small'
    direction?: 'horizontal' | 'vertical'
    labelWidth?: string | number
    title?: string
    emptyText?: string | false
  }>(),
  {
    column: 3,
    border: true,
    size: 'default',
    direction: 'horizontal',
    immediate: true,
    loading: false,
    // 'string | false' 同样会被 Boolean cast，必须给 default
    emptyText: '-',
  },
)

const emit = defineEmits<{
  /** 加载完成。失败时 record 为 undefined */
  load: [record: Record<string, any> | undefined]
}>()

const slots = useSlots()
const breakpoint = useBreakpoint()

/* ------------------------------ 取数 ------------------------------ */

const recordInner = shallowRef<Record<string, any> | undefined>(undefined)
const loadingInner = ref(false)
const errorMessage = ref('')

/** 自增 id：切 params 太快时，旧请求的回包直接丢掉，不会覆盖新数据 */
let seq = 0
let controller: AbortController | null = null

const record = computed(() => (props.request ? recordInner.value : props.data))
const loading = computed(() => props.loading || loadingInner.value)

async function fetchData() {
  if (!props.request) return
  const id = ++seq
  controller?.abort()
  controller = new AbortController()

  loadingInner.value = true
  errorMessage.value = ''

  try {
    const res = await props.request({ ...props.params }, { signal: controller.signal })
    if (id !== seq) return

    if (res?.success === false) {
      errorMessage.value = res.errorMessage || '加载失败'
      // 业务失败不清空已展示的记录：留着旧数据比白屏有用
      return
    }
    recordInner.value = res?.data
    emit('load', recordInner.value)
  } catch (err: any) {
    // 主动取消不算错误
    if (id !== seq || err?.name === 'AbortError' || err?.code === 'ERR_CANCELED') return
    errorMessage.value = err?.message || '加载失败'
    emit('load', undefined)
  } finally {
    if (id === seq) loadingInner.value = false
  }
}

watch(
  () => props.params,
  () => {
    if (props.request) fetchData()
  },
  { immediate: props.immediate },
)

onBeforeUnmount(() => controller?.abort())

/* ------------------------------ 渲染 ------------------------------ */

const visibleColumns = computed(() =>
  props.columns.filter((c) => !c.hideInDescriptions && c.prop),
)

/** el-descriptions 只认数字，响应式配置在组件内解析成当前断点的值 */
const resolvedColumn = computed(() => resolveResponsive(props.column, breakpoint.value) ?? 3)

function hasSlot(col: ProColumn) {
  return !!col.prop && !!slots[col.prop]
}

defineExpose({
  reload: fetchData,
  refresh: fetchData,
  data: record,
})
</script>

<template>
  <div class="el-pro-descriptions">
    <ElAlert
      v-if="errorMessage"
      :title="errorMessage"
      type="error"
      :closable="false"
      show-icon
      class="el-pro-descriptions__error"
    />

    <ElProSkeleton v-if="loading && !record" type="descriptions" :rows="3" :columns="resolvedColumn" />

    <ElDescriptions
      v-else
      v-loading="loading"
      :column="resolvedColumn"
      :border="border"
      :size="size"
      :direction="direction"
      :title="title"
      :label-width="labelWidth"
    >
      <template v-if="$slots.extra" #extra>
        <slot name="extra" />
      </template>

      <ElDescriptionsItem
        v-for="(col, idx) in visibleColumns"
        :key="`${col.prop}-${idx}`"
        :label="col.label"
        :span="col.descriptionsSpan ?? 1"
      >
        <slot
          v-if="hasSlot(col)"
          :name="col.prop!"
          :row="record"
          :column="col"
          :value="record?.[col.prop!]"
        />
        <component
          :is="col.cellComponent"
          v-else-if="col.cellComponent"
          :row="record"
          :column="col"
          :value="record?.[col.prop!]"
        />
        <CellRenderer
          v-else
          :value="record?.[col.prop!]"
          :column="col"
          :row="record"
          :empty-text="emptyText"
        />
      </ElDescriptionsItem>
    </ElDescriptions>
  </div>
</template>

<style>
.el-pro-descriptions .el-descriptions__label {
  white-space: nowrap;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-lighter);
}
.el-pro-descriptions__error {
  margin-bottom: 12px;
}
</style>
