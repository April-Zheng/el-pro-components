<script setup lang="ts">
/**
 * ElProForm —— schema 驱动的表单。
 *
 * `model` 需要传一个**响应式对象**（reactive / ref 的 value），
 * 组件直接读写它的字段。这一点和 el-form 的 model 约定一致。
 */
import { computed, onMounted, ref, watch } from 'vue'
import { ElButton, ElCol, ElDivider, ElForm, ElFormItem, ElRow } from 'element-plus'
import type { FormInstance } from 'element-plus'
import { resolveFormColumns } from '../../core/formDependency'
import FormField from '../../fields/FormField.vue'
import ProFormList from './ProFormList.vue'
import ProFormGroup from './ProFormGroup.vue'
import type { ProColumn } from '../../types'

defineOptions({ name: 'ElProForm' })

const props = withDefaults(
  defineProps<{
    columns: ProColumn[]
    model: Record<string, any>
    /** 默认占几格（24 栅格） */
    span?: number
    gutter?: number
    labelWidth?: string | number
    labelPosition?: 'left' | 'right' | 'top'
    disabled?: boolean
    /** 表单级只读：字段渲染为只读展示而非禁用输入 */
    readonly?: boolean
    size?: 'large' | 'default' | 'small'
    /** 是否显示默认的提交/重置按钮 */
    showActions?: boolean
    submitText?: string
    resetText?: string
    loading?: boolean
    /** 回车提交。默认关（对齐 React）：表单内回车不触发提交 */
    isKeyPressSubmit?: boolean
    /** 异步初值：挂载时调用，resolve 的对象合并进 model */
    request?: (params?: Record<string, any>) => Promise<Record<string, any>>
    /** request 的参数 */
    params?: Record<string, any>
    /** 字段值变化（deep）。快照是浅拷贝 */
    onValuesChange?: (values: Record<string, any>) => void
    /** 首次挂载后触发一次（request 初值写入之后） */
    onInit?: (values: Record<string, any>) => void
  }>(),
  {
    span: 12,
    gutter: 16,
    labelWidth: '100px',
    labelPosition: 'right',
    showActions: true,
    submitText: '提交',
    resetText: '重置',
  },
)

const emit = defineEmits<{
  submit: [Record<string, any>]
  reset: []
  invalid: [unknown]
  /** 字段值变化（deep） */
  valuesChange: [Record<string, any>]
  /** 首次挂载（request 初值写入之后） */
  init: [Record<string, any>]
}>()

const formRef = ref<FormInstance>()

/** 异步初值的加载态，与外部 loading 合并 */
const requestLoading = ref(false)
const mergedLoading = computed(() => props.loading || requestLoading.value)

/**
 * 实际渲染的列。联动也在这里算：
 * `resolveFormColumns` 只读 `dependsOn` 里列出的字段，所以改无关字段不会触发重算。
 * order 升序稳定排序：传了 order 的排在前面，没传的保持原顺序垫在后面。
 */
const formColumns = computed(() => {
  const resolved = resolveFormColumns(props.columns, props.model)
  return resolved
    .map((col, index) => ({ col, index }))
    .sort((a, b) => (a.col.order ?? Number.MAX_SAFE_INTEGER) - (b.col.order ?? Number.MAX_SAFE_INTEGER) || a.index - b.index)
    .map(({ col }) => col)
})

const getSpan = (col: ProColumn) => col.formSpan ?? props.span

async function validate() {
  if (!formRef.value) return false
  try {
    await formRef.value.validate()
    return true
  } catch (err) {
    emit('invalid', err)
    return false
  }
}

async function submit() {
  const ok = await validate()
  if (ok) emit('submit', props.model)
}

/**
 * 原生 submit 事件只在两种情况下触发：表单里只有一个输入框时按回车，
 * 或存在 type=submit 的按钮。默认阻止（对齐 React），isKeyPressSubmit 才放行。
 */
function onNativeSubmit() {
  if (props.isKeyPressSubmit) void submit()
}

function reset() {
  formRef.value?.resetFields()
  emit('reset')
}

function clearValidate() {
  formRef.value?.clearValidate()
}

/** 异步初值：resolve 的对象浅合并进 model（只写响应里有的键，不动其它） */
onMounted(async () => {
  if (!props.request) {
    props.onInit?.({ ...props.model })
    emit('init', { ...props.model })
    return
  }
  requestLoading.value = true
  try {
    const values = await props.request(props.params)
    if (values && typeof values === 'object') Object.assign(props.model, values)
  } finally {
    requestLoading.value = false
    props.onInit?.({ ...props.model })
    emit('init', { ...props.model })
  }
})

/** 字段值变化（deep）。程序化改 model 也会触发——与 React 的 onValuesChange 略有差异，快照便宜 */
watch(
  () => props.model,
  (values) => {
    props.onValuesChange?.({ ...values })
    emit('valuesChange', { ...values })
  },
  { deep: true },
)

defineExpose({
  validate,
  clearValidate,
  reset,
  submit,
  formRef,
  getModel: () => props.model,
})
</script>

<template>
  <ElForm
    ref="formRef"
    :model="model"
    :label-width="labelWidth"
    :label-position="labelPosition"
    :disabled="disabled"
    :size="size"
    class="el-pro-form"
    @submit.prevent="onNativeSubmit"
  >
    <ElRow :gutter="gutter">
      <template v-for="col in formColumns" :key="col.prop ?? col.label">
        <ElCol v-if="col.valueType === 'divider'" :span="24">
          <ElDivider content-position="left" class="el-pro-form__divider">{{ col.label }}</ElDivider>
        </ElCol>

        <!--
          表单分组：子字段来自 `columns`（源码 valueType/group 取 item.columns，不是 children）。
          容器配置走 groupProps + fieldProps —— 源码就是把 getFieldProps() 展开到 ProFormGroup 上，
          所以 collapsible / direction / size / onCollapse 这些都从 fieldProps 进来。
        -->
        <ElCol v-else-if="col.valueType === 'group'" :span="col.formSpan ?? 24">
          <ProFormGroup
            :label="col.label"
            :columns="col.columns ?? []"
            :model="model"
            :span="span"
            v-bind="{ ...col.groupProps, ...col.fieldProps }"
          />
        </ElCol>

        <!--
          字段组单独成一支：它要的是**整个 model**（自己往 model[prop] 里塞数组），
          而普通字段只要自己那个值，走 v-model 就够了。
        -->
        <ElCol v-else-if="col.valueType === 'formList'" :span="col.formSpan ?? 24">
          <ElFormItem
            :label="col.label"
            :prop="col.prop"
            :rules="col.rules"
            v-bind="col.formItemProps"
          >
            <ProFormList
              :model="model"
              :prop="col.prop!"
              :columns="col.children ?? []"
              :config="col.formListProps"
              :span="col.formListProps?.span"
              :gutter="col.formListProps?.gutter ?? gutter"
            />
          </ElFormItem>
        </ElCol>

        <ElCol v-else :span="getSpan(col)">
          <ElFormItem
            :label="col.label"
            :prop="col.prop"
            :rules="col.rules"
            v-bind="col.formItemProps"
          >
            <FormField v-model="model[col.prop!]" :column="col" mode="form" :form-readonly="readonly" />
          </ElFormItem>
        </ElCol>
      </template>

      <ElCol v-if="$slots.footer || showActions" :span="24" class="el-pro-form__footer">
        <slot name="footer">
          <ElButton type="primary" :loading="mergedLoading" @click="submit">{{ submitText }}</ElButton>
          <ElButton @click="reset">{{ resetText }}</ElButton>
        </slot>
      </ElCol>
    </ElRow>
  </ElForm>
</template>

<style>
.el-pro-form__divider {
  margin: 4px 0 20px;
}
.el-pro-form__divider .el-divider__text {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}
.el-pro-form__footer {
  margin-top: 4px;
}
</style>
