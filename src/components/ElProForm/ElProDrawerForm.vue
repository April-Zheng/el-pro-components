<script setup lang="ts">
/**
 * ElProDrawerForm —— 抽屉里的 schema 表单。
 *
 * 和 ElProModalForm 是同一套行为（校验 → 提交 → 成功才关），区别只有外壳：
 * 抽屉从侧面滑出、通常更宽，适合字段多到弹窗装不下、或者需要边看列表边填的场景。
 *
 * 注意 `size` 是**表单控件尺寸**，抽屉的宽高用 `drawerSize` —— 两个 size 混用
 * 会让人改半天没反应（Element Plus 的 ElDrawer 自己也有 `size`）。
 */
import { ElButton, ElDrawer } from 'element-plus'
import ElProForm from './ElProForm.vue'
import { useFormContainer } from './useFormContainer'
import type { ProDrawerFormProps } from '../../types'

defineOptions({ name: 'ElProDrawerForm' })

const props = withDefaults(defineProps<ProDrawerFormProps>(), {
  /** 布尔 prop 不传时会被转成 false，这里显式 undefined 才能区分「受控」和「没传」，见 ElProModalForm 的说明 */
  open: undefined,
  title: '',
  defaultOpen: false,
  span: 24,
  gutter: 16,
  labelWidth: '100px',
  labelPosition: 'right',
  submitText: '提交',
  cancelText: '取消',
  direction: 'rtl',
  drawerSize: '480px',
})

const emit = defineEmits<{
  'update:open': [boolean]
  openChange: [boolean]
  cancel: []
  invalid: [unknown]
  finishError: [unknown]
}>()

const container = useFormContainer(props, {
  onOpenChange: (open) => {
    emit('update:open', open)
    emit('openChange', open)
  },
  onCancel: () => emit('cancel'),
  onFinishError: (error) => emit('finishError', error),
})

const { formRef, submitting, isOpen, formModel, openDialog, toggleDialog, onCancel, onVisibleChange, handleSubmit } =
  container

defineExpose({
  open: openDialog,
  close: container.closeDialog,
  submit: handleSubmit,
  getValues: container.getValues,
  formRef,
})
</script>

<template>
  <span v-if="$slots.trigger" class="el-pro-drawer-form__trigger" @click="toggleDialog">
    <slot name="trigger" />
  </span>

  <ElDrawer
    :model-value="isOpen"
    :title="title"
    :direction="direction"
    :size="drawerSize"
    :destroy-on-close="true"
    class="el-pro-drawer-form"
    v-bind="drawerProps"
    @update:model-value="onVisibleChange"
  >
    <ElProForm
      ref="formRef"
      :columns="columns"
      :model="formModel"
      :span="span"
      :gutter="gutter"
      :label-width="labelWidth"
      :label-position="labelPosition"
      :disabled="disabled"
      :readonly="readonly"
      :is-key-press-submit="isKeyPressSubmit"
      :request="request"
      :params="params"
      :on-values-change="onValuesChange"
      :size="size"
      :show-actions="false"
      @invalid="(err: unknown) => emit('invalid', err)"
    />

    <slot name="extra" />

    <template #footer>
      <slot name="footer" :submit="handleSubmit" :cancel="onCancel" :loading="submitting">
        <ElButton class="el-pro-drawer-form__cancel" @click="onCancel">{{ cancelText }}</ElButton>
        <ElButton
          type="primary"
          class="el-pro-drawer-form__submit"
          :loading="submitting || loading"
          @click="handleSubmit"
        >
          {{ submitText }}
        </ElButton>
      </slot>
    </template>
  </ElDrawer>
</template>

<style>
.el-pro-drawer-form__trigger {
  display: inline-block;
}
</style>
