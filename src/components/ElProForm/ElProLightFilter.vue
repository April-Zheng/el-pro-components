<script setup lang="ts">
/**
 * ElProLightFilter —— 轻量筛选，对齐源码 form/layouts/LightFilter。
 *
 * 行为对齐（都按源码）：
 * - 行内紧凑字段，标签以 chip 形式放在控件前（源码 FieldLabel / colon:false）
 * - `secondary: true` 的字段收进「更多筛选」弹层；`collapse` 为 true 时**全部**
 *   收进弹层，触发器变筛选图标（源码 collapseLabel 优先级最高）
 * - 弹层里的字段改的是**草稿**（moreValues），点「确认」才应用并提交；
 *   点「重置」把这些字段恢复到 `initialValues`（源码 footer clearText: '重置'）
 * - **每次值变化立即提交**（源码 onValuesChange → form.submit()）：校验通过才
 *   发 `search`，失败不发（和 form.submit 的校验门禁一致）
 * - 任一字段有值时根节点挂 `is-effective` 类（源码 -effective）
 *
 * 与源码的两处刻意差异（都写在 README 里）：
 * - 弹层草稿在**每次打开时**从当前值重建。源码只在挂载时初始化一次，
 *   「确认」时会把打开前的旧值盖回去，属于明显的 unintended，这里修正
 * - antd 的 `variant: 'borderless'`（去输入框边框、外层 chip 包边）没有移植：
 *   Element Plus 没有对应的输入形态，硬造一层样式得不偿失。字段就是普通
 *   EP 控件 + 前置标签
 */
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { ElButton, ElForm, ElFormItem, ElPopover } from 'element-plus'
import type { FormInstance } from 'element-plus'
import { resolveSearchColumn } from '../../core/column'
import FormField from '../../fields/FormField.vue'
import type { ProColumn, ProLightFilterProps } from '../../types'

defineOptions({ name: 'ElProLightFilter' })

const props = withDefaults(defineProps<ProLightFilterProps>(), {
  model: undefined,
  initialValues: undefined,
  collapse: false,
  collapseLabel: undefined,
  placement: 'bottom-start',
  popoverWidth: 320,
  size: undefined,
  disabled: false,
  ignoreRules: false,
  popoverProps: undefined,
})

const emit = defineEmits<{
  /** 每次值变化且校验通过时触发（等价源码 onValuesChange → form.submit） */
  search: [Record<string, any>]
  /** 每次值变化时触发（等价源码 onValuesChange 回调本身） */
  valuesChange: [Record<string, any>]
}>()

const formRef = ref<FormInstance>()

/* ------------------------------ 数据归属 ------------------------------- */

/** 内部草稿。只在没传 `model` 时使用 */
const draft = reactive<Record<string, any>>({})
const formModel = computed<Record<string, any>>(() => props.model ?? draft)

if (!props.model) Object.assign(draft, props.initialValues ?? {})

/* ------------------------------ 列的拆分 ------------------------------- */

/**
 * 顶层结构列先拍平：group 的子字段提上来（源码 contentRender 的 flatMap），
 * divider 不进筛选。
 */
const flatColumns = computed<ProColumn[]>(() => {
  const out: ProColumn[] = []
  for (const col of props.columns) {
    if (col.valueType === 'group') out.push(...(col.columns ?? []))
    else if (col.valueType === 'divider') continue
    else out.push(col)
  }
  return out
})

/** 值的字典（valueEnum → options 等）按搜索栏同一套规则解析 */
const searchColumns = computed(() => flatColumns.value.map(resolveSearchColumn))

const popoverColumns = computed(() =>
  props.collapse ? searchColumns.value : searchColumns.value.filter((c) => c.secondary),
)

const outsideColumns = computed(() =>
  props.collapse ? [] : searchColumns.value.filter((c) => !c.secondary),
)

const itemRules = (col: ProColumn) => (props.ignoreRules ? undefined : col.rules)

/* ------------------------------ 弹层草稿 ------------------------------- */

const popoverOpen = ref(false)
/** 弹层里改的值先进这里，点「确认」才应用（源码 moreValues） */
const moreValues = reactive<Record<string, any>>({})

watch(popoverOpen, (open) => {
  if (open) {
    for (const key of Object.keys(moreValues)) delete moreValues[key]
    Object.assign(moreValues, { ...formModel.value })
  }
})

function onClear() {
  // 源码：把 collapse 项恢复成 initialValues（没有就 undefined），然后**显式**走一次提交流程
  suppressWatch = true
  for (const col of popoverColumns.value) {
    const key = col.prop!
    const base = props.initialValues?.[key]
    if (base === undefined) delete formModel.value[key]
    else formModel.value[key] = base
    moreValues[key] = base
  }
  submitNow()
  nextTick(() => (suppressWatch = false))
}

function onConfirm() {
  suppressWatch = true
  Object.assign(formModel.value, { ...moreValues })
  popoverOpen.value = false
  submitNow()
  nextTick(() => (suppressWatch = false))
}

/* ------------------------------ 自动提交 ------------------------------- */

/** 任一字段有值（数组看长度），挂 is-effective（源码同款判断） */
const effective = computed(() =>
  Object.keys(formModel.value).some((key) => {
    const value = formModel.value[key]
    return Array.isArray(value) ? value.length > 0 : !!value
  }),
)

/**
 * 提交 = 校验通过才发 search（源码 form.submit() 的门禁）。
 * 确认/重置会显式调用；程序化改值（setFieldsValue）在源码里不触发 onValuesChange，
 * 所以那一刻用 suppress 标记吃掉 watch 的触发，保证只提交一次。
 */
let suppressWatch = false

function submitNow() {
  const values = { ...formModel.value }
  emit('valuesChange', values)
  formRef.value
    ?.validate()
    .then(() => emit('search', values))
    .catch(() => {})
}

watch(
  formModel,
  (values) => {
    if (suppressWatch) return
    emit('valuesChange', { ...values })
    // 源码每次值变化 form.submit()：校验通过才 onFinish。这里校验不过就不发 search
    formRef.value
      ?.validate()
      .then(() => emit('search', { ...values }))
      .catch(() => {})
  },
  { deep: true },
)

watch(popoverOpen, (open) => {
  if (!open && suppressWatch) {
    // 确认关闭弹层的那一拍之后解除抑制；没触发 watch 也要兜底复位
    nextTick(() => (suppressWatch = false))
  }
})

defineExpose({
  getValues: () => formModel.value,
  validate: () => formRef.value?.validate(),
  formRef,
})
</script>

<template>
  <ElForm
    ref="formRef"
    class="el-pro-light-filter"
    :class="{ 'is-effective': effective }"
    :model="formModel"
    :size="size"
    :disabled="disabled"
    @submit.prevent
  >
    <div class="el-pro-light-filter__container">
      <div v-for="col in outsideColumns" :key="col.prop" class="el-pro-light-filter__item">
        <ElFormItem :prop="col.prop" :rules="itemRules(col)" v-bind="col.formItemProps">
          <div class="el-pro-light-filter__field">
            <span v-if="col.label" class="el-pro-light-filter__label">{{ col.label }}</span>
            <FormField v-model="formModel[col.prop!]" :column="col" mode="search" />
          </div>
        </ElFormItem>
      </div>

      <div v-if="popoverColumns.length" class="el-pro-light-filter__item">
        <ElPopover
          v-model:visible="popoverOpen"
          trigger="click"
          :placement="placement as any"
          :width="popoverWidth"
          :persistent="false"
          v-bind="popoverProps"
        >
          <template #reference>
            <span class="el-pro-light-filter__trigger">
              <!-- collapseLabel 优先；collapse 默认筛选图标；否则「更多筛选」 -->
              <template v-if="collapseLabel">{{ collapseLabel }}</template>
              <svg
                v-else-if="collapse"
                viewBox="0 0 16 16"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                stroke-width="1.4"
                stroke-linecap="round"
              >
                <path d="M2.5 4h11M4.5 8h7M6.5 12h3" />
              </svg>
              <template v-else>更多筛选</template>
            </span>
          </template>

          <div class="el-pro-light-filter__panel">
            <div v-for="col in popoverColumns" :key="col.prop" class="el-pro-light-filter__line">
              <ElFormItem :label="col.label" :prop="col.prop" :rules="itemRules(col)" v-bind="col.formItemProps">
                <FormField v-model="moreValues[col.prop!]" :column="col" mode="search" />
              </ElFormItem>
            </div>
            <div class="el-pro-light-filter__footer">
              <ElButton link type="primary" size="small" @click="onClear">重置</ElButton>
              <ElButton type="primary" size="small" @click="onConfirm">确认</ElButton>
            </div>
          </div>
        </ElPopover>
      </div>
    </div>
  </ElForm>
</template>

<style>
.el-pro-light-filter__container {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}
.el-pro-light-filter__item {
  min-width: 0;
}
.el-pro-light-filter__item .el-form-item {
  margin-bottom: 0;
}
.el-pro-light-filter__field {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.el-pro-light-filter__label {
  color: var(--el-text-color-regular);
  white-space: nowrap;
  flex-shrink: 0;
}
.el-pro-light-filter__trigger {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: var(--el-border-radius-base);
  color: var(--el-text-color-regular);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}
.el-pro-light-filter__trigger:hover {
  color: var(--el-color-primary);
  background: var(--el-fill-color-light);
}
.el-pro-light-filter.is-effective .el-pro-light-filter__trigger {
  color: var(--el-color-primary);
}
.el-pro-light-filter__panel .el-form-item {
  margin-bottom: 14px;
}
.el-pro-light-filter__line {
  min-width: 0;
}
.el-pro-light-filter__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 4px;
  border-top: 1px solid var(--el-border-color-lighter);
}
</style>
