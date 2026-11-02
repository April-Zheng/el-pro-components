<script setup lang="ts">
/**
 * ElProForm —— schema 驱动的表单。
 *
 * `model` 需要传一个**响应式对象**（reactive / ref 的 value），
 * 组件直接读写它的字段。这一点和 el-form 的 model 约定一致。
 */
import { computed, ref } from 'vue'
import { ElButton, ElCol, ElDivider, ElForm, ElFormItem, ElRow } from 'element-plus'
import type { FormInstance } from 'element-plus'
import FormField from '../../fields/FormField.vue'
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
    size?: 'large' | 'default' | 'small'
    /** 是否显示默认的提交/重置按钮 */
    showActions?: boolean
    submitText?: string
    resetText?: string
    loading?: boolean
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
}>()

const formRef = ref<FormInstance>()

const formColumns = computed(() => props.columns.filter((c) => !c.hideInForm))

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

function reset() {
  formRef.value?.resetFields()
  emit('reset')
}

function clearValidate() {
  formRef.value?.clearValidate()
}

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
    @submit.prevent="submit"
  >
    <ElRow :gutter="gutter">
      <template v-for="col in formColumns" :key="col.prop ?? col.label">
        <ElCol v-if="col.valueType === 'divider'" :span="24">
          <ElDivider content-position="left" class="el-pro-form__divider">{{ col.label }}</ElDivider>
        </ElCol>

        <ElCol v-else :span="getSpan(col)">
          <ElFormItem
            :label="col.label"
            :prop="col.prop"
            :rules="col.rules"
            v-bind="col.formItemProps"
          >
            <FormField v-model="model[col.prop!]" :column="col" mode="form" />
          </ElFormItem>
        </ElCol>
      </template>

      <ElCol v-if="$slots.footer || showActions" :span="24" class="el-pro-form__footer">
        <slot name="footer">
          <ElButton type="primary" :loading="loading" @click="submit">{{ submitText }}</ElButton>
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
