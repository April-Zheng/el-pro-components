<script setup lang="ts">
/**
 * ElProModalForm —— 弹窗里的 schema 表单。
 *
 * 它做的是「把最容易写错的顺序收进来」：先校验、再提交、**成功了才关窗**。
 * 手写这套（ElDialog + ElProForm + footer 按钮）时，最常见的两个错是
 * 「没校验就发请求」和「请求还没回来窗就关了」，尤其后者在慢接口上会被用户当成丢数据。
 *
 * 开窗方式两种：
 * - `#trigger` 插槽：点谁开窗，最省事的写法
 * - `v-model:open`：开关交给父组件（需要在别处触发时用），配 `ref` 上的 `open()` 也行
 */
import { ElButton, ElDialog } from 'element-plus'
import ElProForm from './ElProForm.vue'
import { useFormContainer } from './useFormContainer'
import type { ProModalFormProps } from '../../types'

defineOptions({ name: 'ElProModalForm' })

const props = withDefaults(defineProps<ProModalFormProps>(), {
  /**
   * 必须显式给 undefined。布尔 prop 不传时 Vue 会把「缺席」转成 `false`，
   * 那受控判断 `props.open !== undefined` 就永远成立，非受控模式直接失效
   * （点 trigger 会 emit update:open 但没人接，窗打不开）。
   */
  open: undefined,
  title: '',
  defaultOpen: false,
  span: 12,
  gutter: 16,
  labelWidth: '100px',
  labelPosition: 'right',
  submitText: '提交',
  cancelText: '取消',
  width: '560px',
})

const emit = defineEmits<{
  'update:open': [boolean]
  openChange: [boolean]
  cancel: []
  /** 表单校验没通过。想自己决定提示方式时用得上 */
  invalid: [unknown]
  /** 提交失败（onFinish reject）。窗还开着，这里拿错误去做提示 */
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

const { formRef, submitting, isOpen, formModel, openDialog, onCancel, onVisibleChange, handleSubmit } =
  container

defineExpose({
  /** 手动开窗，等价于点 trigger */
  open: openDialog,
  close: container.closeDialog,
  /** 手动提交（走同一套校验 + onFinish） */
  submit: handleSubmit,
  getValues: container.getValues,
  formRef,
})
</script>

<template>
  <span v-if="$slots.trigger" class="el-pro-modal-form__trigger" @click="openDialog">
    <slot name="trigger" :open="openDialog" />
  </span>

  <ElDialog
    :model-value="isOpen"
    :title="title"
    :width="width"
    :fullscreen="fullscreen"
    :top="top"
    :destroy-on-close="true"
    class="el-pro-modal-form"
    v-bind="modalProps"
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
      :size="size"
      :show-actions="false"
      @invalid="(err: unknown) => emit('invalid', err)"
    />

    <!-- 表单之后还想塞点东西（比如接口错误提示条）就放这里 -->
    <slot name="extra" />

    <template #footer>
      <slot name="footer" :submit="handleSubmit" :cancel="onCancel" :loading="submitting">
        <ElButton class="el-pro-modal-form__cancel" @click="onCancel">{{ cancelText }}</ElButton>
        <ElButton
          type="primary"
          class="el-pro-modal-form__submit"
          :loading="submitting || loading"
          @click="handleSubmit"
        >
          {{ submitText }}
        </ElButton>
      </slot>
    </template>
  </ElDialog>
</template>

<style>
.el-pro-modal-form__trigger {
  display: inline-block;
}
</style>
