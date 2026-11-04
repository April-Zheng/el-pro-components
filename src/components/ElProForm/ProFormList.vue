<script setup lang="ts">
/**
 * 字段组：一个可增删的「对象数组」，每一项按 `children` 渲染一张子表单。
 *
 * 校验之所以能直接用 `ElProForm.validate()`，靠的不是把规则收集起来再统一跑，
 * 而是每项的 `el-form-item` 都挂在**根表单**上（逐层 inject 到的都是同一个 el-form），
 * 路径写成 `contacts.0.name` 这种带下标的形式，el-form 会自己按路径取值校验。
 * 代价是**下标会随增删漂移**，所以 v-for 的 key 必须换成稳定的符号键，
 * 否则删掉第 1 项后，剩下几项的输入框会跟错行。
 */
import { computed, onMounted, toRaw, watch } from 'vue'
import { ElButton, ElCol, ElFormItem, ElRow } from 'element-plus'
import FormField from '../../fields/FormField.vue'
import type { ProColumn, ProFormListConfig } from '../../types'

defineOptions({ name: 'ProFormList' })

const props = withDefaults(
  defineProps<{
    /** 表单数据对象（外层那个），组件会就地读写它的 `prop` 字段 */
    model: Record<string, any>
    /** 这一列在外层 model 里的字段名 */
    prop: string
    /** 每一项的字段定义 */
    columns: ProColumn[]
    config?: ProFormListConfig
    /** 每项里字段的默认栅格（被子列的 formSpan 覆盖） */
    span?: number
    gutter?: number
  }>(),
  { span: 12, gutter: 16 },
)

/**
 * 稳定行的标识。用 Symbol 而不是普通字段：
 * 它会跟着 JSON.stringify 一起被忽略，提交上去的数据里不会多一个 `__key`。
 */
const ROW_KEY = Symbol('elProFormListRow')

/**
 * 行对象。索引签名里带上 `symbol` 才能用 `ROW_KEY` 索引它
 * （`Record<string, any>` 是纯字符串索引，用 unique symbol 去取会报 TS2538）。
 */
type ListRow = Record<string | symbol, any>

let uid = 0

function ensureKey(item: ListRow) {
  if (!item[ROW_KEY]) item[ROW_KEY] = ++uid
  return item[ROW_KEY] as number
}

const list = computed<ListRow[]>(() => {
  const value = props.model[props.prop]
  return Array.isArray(value) ? value : []
})

const min = computed(() => props.config?.min ?? 0)
const max = computed(() => props.config?.max ?? Number.POSITIVE_INFINITY)
const canAdd = computed(() => list.value.length < max.value)
const canRemove = computed(() => list.value.length > min.value)

function createItem(index: number) {
  const item: ListRow = props.config?.creator ? props.config.creator(index) : {}
  item[ROW_KEY] = ++uid
  return item
}

/**
 * 把 `model[prop]` 收拾成一个数组。
 * 外部可能压根没给这个字段（新建时很常见），也可能给了 `null`，
 * 这里统一补成数组，并按 `min` 补齐——否则「至少一项」得靠用户在别处手动塞。
 */
function normalize() {
  if (!Array.isArray(props.model[props.prop])) {
    props.model[props.prop] = []
  }
  const arr = props.model[props.prop] as any[]
  while (arr.length < min.value) arr.push(createItem(arr.length))
  arr.forEach(ensureKey)
}

onMounted(normalize)
// 整个 model 被换掉时（弹窗重新播种、详情切记录）也要重新收拾一遍
watch(() => props.model[props.prop], normalize, { flush: 'post' })
watch(min, normalize, { flush: 'post' })

function add() {
  if (!canAdd.value) return
  list.value.push(createItem(list.value.length))
}

function remove(index: number) {
  if (!canRemove.value) return
  list.value.splice(index, 1)
}

/** 复制一项：插在它后面，键重新发，否则两行的 v-for key 会撞上 */
function copy(index: number) {
  if (!canAdd.value) return
  const source = list.value[index]
  let cloned: ListRow
  try {
    // toRaw：响应式代理直接 structuredClone 会抛 DataCloneError，退浅拷贝会污染源行
    cloned = structuredClone(toRaw(source))
  } catch {
    cloned = { ...source }
  }
  cloned[ROW_KEY] = ++uid
  list.value.splice(index + 1, 0, cloned)
}

function itemTitle(item: Record<string, any>, index: number) {
  return props.config?.itemTitle?.(item, index) ?? `第 ${index + 1} 项`
}
</script>

<template>
  <div class="el-pro-form-list">
    <div v-for="(item, index) in list" :key="item[ROW_KEY]" class="el-pro-form-list__item">
      <div class="el-pro-form-list__header">
        <span class="el-pro-form-list__title">{{ itemTitle(item, index) }}</span>
        <span class="el-pro-form-list__actions">
          <ElButton
            v-if="config?.copyable"
            link
            type="primary"
            class="el-pro-form-list__copy"
            @click="copy(index)"
          >
            复制
          </ElButton>
          <ElButton
            link
            type="danger"
            class="el-pro-form-list__remove"
            :disabled="!canRemove"
            @click="remove(index)"
          >
            删除
          </ElButton>
        </span>
      </div>

      <ElRow :gutter="gutter">
        <ElCol v-for="col in columns" :key="col.prop" :span="col.formSpan ?? span">
          <ElFormItem
            :label="col.label"
            :prop="`${prop}.${index}.${col.prop}`"
            :rules="col.rules"
            v-bind="col.formItemProps"
          >
            <FormField v-model="item[col.prop!]" :column="col" mode="form" />
          </ElFormItem>
        </ElCol>
      </ElRow>
    </div>

    <div class="el-pro-form-list__footer">
      <ElButton class="el-pro-form-list__add" :disabled="!canAdd" @click="add">
        {{ config?.addText ?? '添加一项' }}
      </ElButton>
      <span v-if="Number.isFinite(max)" class="el-pro-form-list__hint">最多 {{ max }} 项</span>
    </div>
  </div>
</template>

<style>
.el-pro-form-list__item {
  padding: 10px 12px 0;
  margin-bottom: 10px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
}
.el-pro-form-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.el-pro-form-list__title {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}
.el-pro-form-list__actions .el-button + .el-button {
  margin-left: 8px;
}
.el-pro-form-list__footer {
  display: flex;
  align-items: center;
  gap: 8px;
}
.el-pro-form-list__hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
