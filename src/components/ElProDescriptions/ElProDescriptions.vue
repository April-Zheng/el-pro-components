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
 *
 * `editable` 开启后每个字段悬浮出现编辑图标，点开就地编辑（一次一个字段），
 * 保存走 `onSave`：返回 false 或抛错留在编辑态，成功后写回记录。
 */
import { computed, onBeforeUnmount, ref, shallowRef, useSlots, watch } from 'vue'
import { ElAlert, ElButton, ElDescriptions, ElDescriptionsItem, ElTooltip } from 'element-plus'
import CellRenderer from '../../fields/CellRenderer.vue'
import ElProSkeleton from '../ElProSkeleton/ElProSkeleton.vue'
import FormField from '../../fields/FormField.vue'
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
    /** 开启字段级就地编辑（一次编辑一个字段） */
    editable?: boolean
    /**
     * 保存。返回 false 或抛错留在编辑态；成功后组件会把值写回记录。
     * prop 支持 `a.b` 嵌套路径
     */
    onSave?: (key: string, value: any, record: Record<string, any>) => boolean | void | Promise<boolean | void>
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
  /** 字段保存成功 */
  save: [key: string, value: any]
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

/** 按路径取值：支持 `a.b` / `a.0.b` 嵌套写法 */
function getByPath(source: Record<string, any> | undefined, path: string): any {
  if (!source) return undefined
  if (!path.includes('.')) return source[path]
  return path.split('.').reduce<any>((acc, key) => (acc == null ? acc : acc[key]), source)
}

/** 按路径写值。中间层级不存在时跳过（不凭空造结构，那多半是 prop 写错了） */
function setByPath(source: Record<string, any>, path: string, value: any) {
  if (!path.includes('.')) {
    source[path] = value
    return
  }
  const keys = path.split('.')
  const last = keys.pop() as string
  const target = keys.reduce<any>((acc, key) => (acc == null ? acc : acc[key]), source)
  if (target != null && typeof target === 'object') target[last] = value
}

/**
 * 实际渲染的字段：过滤 + order 排序（order 升序，未传的垫底保持原顺序）。
 * option 列不进字段列表——它归入右上角 extra 操作区。
 */
const fieldColumns = computed(() => {
  const list = props.columns.filter(
    (c) => !c.hideInDescriptions && c.prop && c.valueType !== 'index' && c.valueType !== 'indexBorder',
  )
  return list
    .filter((c) => c.valueType !== 'option')
    .map((col, index) => ({ col, index }))
    .sort(
      (a, b) =>
        (a.col.order ?? Number.MAX_SAFE_INTEGER) - (b.col.order ?? Number.MAX_SAFE_INTEGER) ||
        a.index - b.index,
    )
    .map(({ col }) => col)
})

/** option 列：渲染到 extra 操作区 */
const optionColumns = computed(() =>
  props.columns.filter((c) => c.valueType === 'option' && !c.hideInDescriptions),
)

/** el-descriptions 只认数字，响应式配置在组件内解析成当前断点的值 */
const resolvedColumn = computed(() => resolveResponsive(props.column, breakpoint.value) ?? 3)

function hasSlot(col: ProColumn) {
  return !!col.prop && !!slots[col.prop]
}

/* ------------------------------ 就地编辑 ------------------------------ */

const editingKey = ref<string | null>(null)
const editValue = ref<any>(undefined)
const saving = ref(false)

function startEdit(col: ProColumn) {
  if (!col.prop) return
  editingKey.value = col.prop
  editValue.value = getByPath(record.value, col.prop)
}

function cancelEdit() {
  editingKey.value = null
  editValue.value = undefined
}

async function saveEdit(col: ProColumn) {
  if (!col.prop || !record.value) return
  saving.value = true
  try {
    const result = await props.onSave?.(col.prop, editValue.value, record.value)
    if (result === false) return
    setByPath(record.value, col.prop, editValue.value)
    emit('save', col.prop, editValue.value)
    editingKey.value = null
  } finally {
    saving.value = false
  }
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
      <template v-if="$slots.extra || optionColumns.length" #extra>
        <slot name="extra" />
        <!-- option 列归入右上角操作区（对齐 React schemaToDescriptionsItem） -->
        <template v-for="col in optionColumns" :key="col.prop">
          <slot :name="col.prop!" :row="record" :column="col" />
        </template>
      </template>

      <ElDescriptionsItem
        v-for="(col, idx) in fieldColumns"
        :key="`${col.prop}-${idx}`"
        :span="col.descriptionsSpan ?? 1"
      >
        <template #label>
          <span class="el-pro-descriptions__label-text">
            {{ col.label }}
            <ElTooltip v-if="col.labelTooltip" :content="col.labelTooltip" placement="top" :show-after="200">
              <svg
                class="el-pro-descriptions__label-tip"
                viewBox="0 0 16 16"
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                stroke-width="1.3"
              >
                <circle cx="8" cy="8" r="6.2" />
                <path d="M6.2 6.1a1.9 1.9 0 1 1 2.6 1.75c-.5.2-.8.6-.8 1.1v.35" stroke-linecap="round" />
                <circle cx="8" cy="11.4" r="0.7" fill="currentColor" stroke="none" />
              </svg>
            </ElTooltip>
          </span>
        </template>

        <!-- 就地编辑态 -->
        <div v-if="editable && editingKey === col.prop" class="el-pro-descriptions__edit">
          <FormField v-model="editValue" :column="col" mode="form" />
          <ElButton link type="primary" size="small" :loading="saving" @click="saveEdit(col)">保存</ElButton>
          <ElButton link size="small" :disabled="saving" @click="cancelEdit">取消</ElButton>
        </div>

        <template v-else>
          <div class="el-pro-descriptions__content">
            <div class="el-pro-descriptions__value">
              <slot
                v-if="hasSlot(col)"
                :name="col.prop!"
                :row="record"
                :column="col"
                :value="getByPath(record, col.prop!)"
              />
              <component
                :is="col.cellComponent"
                v-else-if="col.cellComponent"
                :row="record"
                :column="col"
                :value="getByPath(record, col.prop!)"
              />
              <CellRenderer
                v-else
                :value="getByPath(record, col.prop!)"
                :column="col"
                :row="record"
                :empty-text="emptyText"
              />
            </div>

            <!-- 编辑图标：editable 时悬浮出现 -->
            <ElButton
              v-if="editable && col.prop"
              link
              size="small"
              class="el-pro-descriptions__edit-btn"
              @click="startEdit(col)"
            >
              <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.3">
                <path d="M11.3 2.3a1.7 1.7 0 0 1 2.4 2.4L5 13.4l-3.2.8.8-3.2z" stroke-linejoin="round" />
              </svg>
            </ElButton>
          </div>
        </template>
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
.el-pro-descriptions__label-text {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.el-pro-descriptions__label-tip {
  color: var(--el-text-color-placeholder);
  cursor: help;
}
.el-pro-descriptions__content {
  display: flex;
  align-items: center;
  gap: 6px;
}
.el-pro-descriptions__value {
  min-width: 0;
  flex: 1;
}
.el-pro-descriptions__edit-btn {
  opacity: 0;
  transition: opacity 0.15s;
}
.el-descriptions__cell:hover .el-pro-descriptions__edit-btn {
  opacity: 1;
}
.el-pro-descriptions__edit {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
}
.el-pro-descriptions__edit > :first-child {
  flex: 1;
  min-width: 0;
}
</style>
