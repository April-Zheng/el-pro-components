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
import { useProLabel } from '../../core/configContext'
import { computed } from 'vue'
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
  // 显式 undefined：按钮文案回落 labels（submit / cancel），prop 显式传时优先
  submitText: undefined,
  cancelText: undefined,
  width: '560px',
})

const label = useProLabel()
const submitLabel = computed(() => props.submitText ?? label('submit'))
const cancelLabel = computed(() => props.cancelText ?? label('cancel'))

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

const { formRef, submitting, isOpen, formModel, openDialog, toggleDialog, onCancel, onVisibleChange, handleSubmit } =
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
  <span v-if="$slots.trigger" class="el-pro-modal-form__trigger" @click="toggleDialog">
    <slot name="trigger" />
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
      :readonly="readonly"
      :is-key-press-submit="isKeyPressSubmit"
      :request="request"
      :params="params"
      :on-values-change="onValuesChange"
      :size="size"
      :show-actions="false"
      @invalid="(err: unknown) => emit('invalid', err)"
    />

    <!-- 表单之后还想塞点东西（比如接口错误提示条）就放这里 -->
    <slot name="extra" />

    <template #footer>
      <slot name="footer" :submit="handleSubmit" :cancel="onCancel" :loading="submitting">
        <ElButton class="el-pro-modal-form__cancel" @click="onCancel">{{ cancelLabel }}</ElButton>
        <ElButton
          type="primary"
          class="el-pro-modal-form__submit"
          :loading="submitting || loading"
          @click="handleSubmit"
        >
          {{ submitLabel }}
        </ElButton>
      </slot>
    </template>
  </ElDialog>
</template>

<style>
.el-pro-modal-form__trigger {
  display: inline-block;
}
.el-pro-modal-form .el-dialog__body {
  /*
    内容超高时弹窗会被撑出视口：表单字段多/有高 textarea 时，底部与提交按钮跑到
    屏幕外“超出弹窗区域”，用户看不到 footer。约束内容区在视口 70% 高度内内部滚动，
    弹窗自身不随内容变高，footer 固定可见。
  */
  max-height: 70vh;
  overflow-y: auto;
  /*
    gutter 负 margin 会让 el-row 向两侧出血 8px 落在 body 自身 padding 区内，
    不含任何可见内容；但内容区一旦成为滚动容器，Chrome 会为这 8px 出
    一条无意义的横向滚动条。这里收掉横向滚动：出血只是留白，不会有内容被裁剪
    （真实内容最右只到行边缘，仍在弹窗边框内）。
  */
  overflow-x: hidden;
}
/*
  日期控件随列宽伸缩：.el-date-editor 默认固定约 220px 宽，在窄弹窗里
  （如 560px + formSpan 8 一行三列，每列约 176px）不收缩，会撑宽整行；
  而内容区 overflow-y:auto 连带开启横向滚动，溢出表现为横向滚动条。
  仅有 width:100% 不够：控件是 form-item content 的 flex 项，min-width:auto
  使它不能收缩到固有 min-content（前缀图标 + input 默认尺寸，约 180px）以下，
  必须显式 min-width:0 才真正交给列布局决定，溢出源头消失。
*/
.el-pro-modal-form .el-date-editor {
  width: 100%;
  min-width: 0;
}
</style>
