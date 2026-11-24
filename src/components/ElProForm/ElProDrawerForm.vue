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
import { useProLabel } from '../../core/configContext'
import { computed } from 'vue'
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
  // 显式 undefined：按钮文案回落 labels（submit / cancel），prop 显式传时优先
  submitText: undefined,
  cancelText: undefined,
  direction: 'rtl',
  drawerSize: '480px',
})

const label = useProLabel()
const submitLabel = computed(() => props.submitText ?? label('submit'))
const cancelLabel = computed(() => props.cancelText ?? label('cancel'))

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
        <ElButton class="el-pro-drawer-form__cancel" @click="onCancel">{{ cancelLabel }}</ElButton>
        <ElButton
          type="primary"
          class="el-pro-drawer-form__submit"
          :loading="submitting || loading"
          @click="handleSubmit"
        >
          {{ submitLabel }}
        </ElButton>
      </slot>
    </template>
  </ElDrawer>
</template>

<style>
.el-pro-drawer-form__trigger {
  display: inline-block;
}
/*
  与 ElProModalForm 同一套口径（两个文件必须一起改）：
  抽屉 body 在 EP 里默认就是滚动容器（overflow:auto），gutter 负 margin 的 8px
  出血 + 窄列下 .el-date-editor 卡在固有 min-content（前缀图标 + input 默认尺寸，
  约 180px）不收缩，都会表现为横向滚动条。min-width:0 让控件真正交给列布局，
  overflow-x:hidden 收掉不含可见内容的出血（真实内容仍在抽屉边框内）。
*/
.el-pro-drawer-form .el-drawer__body {
  overflow-x: hidden;
}
.el-pro-drawer-form .el-date-editor {
  width: 100%;
  min-width: 0;
}
</style>
