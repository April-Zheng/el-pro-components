<script setup lang="ts">
/**
 * ElProStepsForm —— 分步表单，对齐源码 form/layouts/StepsForm（schema 版）。
 *
 * 对应源码的 SchemaForm layoutType="StepsForm" 用法：`steps` 数组映射成多个
 * StepForm（columns 每步一份）。关键语义（都按源码）：
 * - 所有步的表单**常驻挂载**，非当前步只是隐藏（v-show）—— 这样跨步取值、
 *   状态保留才和源码一致
 * - 底部按钮：第 0 步 [下一步]（只有一步时直接 [提交]）；中间 [上一步, 下一步]；
 *   最后一步 [上一步, 提交]
 * - 「下一步」**不直接跳步**：它触发当前步表单提交，校验通过后（onStepSubmit）
 *   才前进 —— 校验失败就停在原地，和源码的 form.submit() 门禁一样
 * - 只有**最后一步**的提交会触发 `onFinish`（函数 prop，不是事件 —— 因为源码
 *   约定返回 true 时重置回第 0 步并清空各步表单，事件拿不到返回值）；
 *   合并规则是「后面的步覆盖前面的同名字段」（merge({}, ...formData.values())）
 * - allowStepSelect：点击步骤条直接跳步，**不触发校验**（源码同款）
 */
import { computed, defineComponent, h, reactive, ref } from 'vue'
import { ElButton, ElCol, ElRow, ElStep, ElSteps } from 'element-plus'
import ElProForm from './ElProForm.vue'
import type { ProStepsFormItem, ProStepsSubmitter } from '../../types'

defineOptions({ name: 'ElProStepsForm' })

const props = withDefaults(
  defineProps<{
    /** 每一步的定义 */
    steps: ProStepsFormItem[]
    /** 受控当前步，配 `v-model:current` */
    current?: number
    /**
     * 最后一步提交时调用。返回 `true` → 回到第 0 步并重置各步表单（源码同款约定）。
     * 必须传函数 prop，事件拿不到返回值。
     */
    onFinish?: (values: Record<string, any>) => Promise<boolean | void> | boolean | void
    /** 底部按钮统一配置。传 false 不渲染按钮区 */
    submitter?: false | ProStepsSubmitter
    /** 透传给 el-steps 的属性 */
    stepsProps?: Record<string, any>
    /** 各步表单的公共配置（span / gutter / labelWidth / labelPosition / size / disabled） */
    formProps?: Record<string, any>
    /** 是否允许点击步骤条切换步骤（不触发校验） @default false */
    allowStepSelect?: boolean
    /**
     * 整体布局。源码通过 `stepsProps.orientation` 控制：horizontal 步骤条在上、
     * vertical 步骤条在左（宽度按断点 xxl4/xl6/lg7/md8/sm10/xs12）
     * @default 'horizontal'
     */
    layout?: 'horizontal' | 'vertical'
    /** 表单区域容器样式 */
    containerStyle?: Record<string, any>
  }>(),
  {
    current: undefined,
    onFinish: undefined,
    submitter: undefined,
    stepsProps: undefined,
    formProps: undefined,
    allowStepSelect: false,
    layout: 'horizontal',
    containerStyle: undefined,
  },
)

const emit = defineEmits<{
  currentChange: [number]
  'update:current': [number]
}>()

/* ------------------------------ 步骤状态 ------------------------------- */

const innerStep = ref(0)
const step = computed(() => props.current ?? innerStep.value)

function setStep(next: number) {
  if (next < 0 || next >= props.steps.length) return
  innerStep.value = next
  emit('update:current', next)
  emit('currentChange', next)
}

const stepName = (s: ProStepsFormItem, i: number) => s.name ?? String(i)

const loading = ref(false)

/* ------------------------------ 各步数据 ------------------------------- */

/** 没传 step.model 时用内部草稿，按步名各建一份 */
const draftModels = reactive<Record<string, Record<string, any>>>({})

function modelOf(s: ProStepsFormItem, i: number): Record<string, any> {
  if (s.model) return s.model
  const name = stepName(s, i)
  if (!draftModels[name]) draftModels[name] = { ...(s.initialValues ?? {}) }
  return draftModels[name]
}

/** 各步提交成功后的值快照。最后一步 onFinish 合并用 —— 只含**提交过**的步（源码同款） */
const submittedData = new Map<string, Record<string, any>>()

/* ------------------------------ 表单实例 ------------------------------- */

const formRefs: Record<number, { submit: () => void; reset?: () => void } | undefined> = {}

function setFormRef(el: any, index: number) {
  formRefs[index] = el
}

function submitCurrent() {
  formRefs[step.value]?.submit()
}

function prePage() {
  if (step.value < 1) return
  setStep(step.value - 1)
}

/** 步提交通过：存快照 → 非最后一步前进；最后一步跑 onFinish（源码 onFormFinish） */
async function onStepSubmit(index: number) {
  const s = props.steps[index]
  submittedData.set(stepName(s, index), { ...modelOf(s, index) })

  const isLast = index === props.steps.length - 1
  // 非最后一步：校验已通过，直接前进（源码里是 BaseForm 走 next()）
  if (!isLast) {
    setStep(index + 1)
    return
  }
  if (!props.onFinish) return

  loading.value = true
  try {
    const merged: Record<string, any> = {}
    for (const values of submittedData.values()) Object.assign(merged, values)
    const ok = await props.onFinish(merged)
    if (ok) resetSteps()
  } finally {
    loading.value = false
  }
}

/* ------------------------------ 底部按钮 ------------------------------- */

/** submitter === false 时为 undefined，模板/回调里统一从这里取 */
const submitterObj = computed<ProStepsSubmitter | undefined>(() =>
  props.submitter === false ? undefined : props.submitter,
)

function onNext() {
  submitterObj.value?.onSubmit?.()
  submitCurrent()
}

function onPre() {
  prePage()
  submitterObj.value?.onReset?.()
}

const index = computed(() => step.value)
const isLastStep = computed(() => index.value + 1 === props.steps.length)

/** 返回 false / undefined 之外的值 = 用户接管了按钮区 */
const customSubmitter = computed(() => {
  const s = props.submitter
  if (s === false || !s || s.render === false) return null
  if (typeof s.render === 'function') {
    return s.render({ step: index.value, pre: prePage, submit: submitCurrent })
  }
  return undefined
})

/** 渲染用户 render() 返回的任意内容（VNode / 字符串） */
const NodeRenderer = defineComponent({
  props: { node: { type: null, required: true } },
  setup: (p) => () => p.node,
})

/* ------------------------------ 对外方法 ------------------------------- */

function getAllFieldsValue(): Record<string, any> {
  const merged: Record<string, any> = {}
  props.steps.forEach((s, i) => Object.assign(merged, modelOf(s, i)))
  return merged
}

function resetSteps() {
  submittedData.clear()
  setStep(0)
  // ElProForm 暴露的是 reset（内部才是 resetFields），这里别写成 resetFields
  Object.values(formRefs).forEach((f) => f?.reset?.())
}

defineExpose({
  /** 合并所有步的当前值（后者覆盖同名字段），包括没提交过的 */
  getAllFieldsValue,
  getCurrentStep: () => step.value,
  /** 跳转到指定步，不触发表单校验；越界忽略 */
  setCurrentStep: setStep,
  getStepFormInstance: (i: number) => formRefs[i],
  /** 清空分步缓存、重置各步表单并回到第一步 */
  resetSteps,
  /** 当前步的表单实例 */
  formRef: computed(() => formRefs[step.value]),
})

/* ------------------------------ 布局常量 ------------------------------- */

const stepsMaxWidth = computed(() => `${Math.min(props.steps.length * 320, 1160)}px`)

const submitterVisible = computed(() => props.submitter !== false)

const stepsDirection = computed(() => (props.layout === 'vertical' ? 'vertical' : undefined))
</script>

<template>
  <div
    class="el-pro-steps-form"
    :class="{ 'el-pro-steps-form--vertical': layout === 'vertical' }"
    :style="containerStyle"
  >
    <!-- 步骤条 -->
    <div class="el-pro-steps-form__steps" :style="{ maxWidth: layout === 'vertical' ? undefined : stepsMaxWidth }">
      <ElSteps :direction="stepsDirection" :current="step" v-bind="stepsProps">
        <ElStep
          v-for="(s, i) in steps"
          :key="stepName(s, i)"
          :title="s.title"
          :description="s.description"
          :class="{ 'is-selectable': allowStepSelect }"
          v-bind="s.stepProps"
          @click="allowStepSelect && setStep(i)"
        />
      </ElSteps>
    </div>

    <!-- 各步表单：常驻挂载，v-show 切换（源码同款，跨步状态保留） -->
    <div class="el-pro-steps-form__body">
      <div
        v-for="(s, i) in steps"
        v-show="step === i"
        :key="stepName(s, i)"
        class="el-pro-steps-form__step"
        :class="{ 'el-pro-steps-form__step--active': step === i }"
      >
        <ElProForm
          :ref="(el: any) => setFormRef(el, i)"
          :columns="s.columns"
          :model="modelOf(s, i)"
          :show-actions="false"
          v-bind="formProps"
          :span="s.span ?? formProps?.span"
          @submit="onStepSubmit(i)"
        />
      </div>

      <!-- 底部按钮 -->
      <div v-if="submitterVisible" class="el-pro-steps-form__submitter">
        <NodeRenderer v-if="customSubmitter != null" :node="customSubmitter" />
        <template v-else>
          <slot name="submitter" :step="index" :pre="prePage" :submit="submitCurrent">
            <ElButton
              v-if="index >= 1"
              v-bind="submitterObj?.resetButtonProps"
              @click="onPre"
            >
              上一步
            </ElButton>
            <ElButton
              v-if="index < steps.length - 1"
              type="primary"
              :loading="loading"
              v-bind="submitterObj?.submitButtonProps"
              @click="onNext"
            >
              下一步
            </ElButton>
            <ElButton
              v-if="isLastStep || steps.length === 1"
              type="primary"
              :loading="loading"
              v-bind="submitterObj?.submitButtonProps"
              @click="onNext"
            >
              提交
            </ElButton>
          </slot>
        </template>
      </div>
    </div>
  </div>
</template>

<style>
.el-pro-steps-form__steps {
  margin-bottom: 24px;
}
.el-pro-steps-form__steps .el-step {
  cursor: default;
}
.el-pro-steps-form__steps .el-step.is-selectable {
  cursor: pointer;
}
.el-pro-steps-form__step {
  min-width: 0;
}
.el-pro-steps-form__submitter {
  margin-top: 8px;
}
.el-pro-steps-form__submitter .el-button + .el-button {
  margin-left: 12px;
}

/* vertical：步骤条在左，宽度按断点 xxl4/xl6/lg7/md8/sm10/xs12（对齐源码 StepsLayoutStrategy） */
.el-pro-steps-form--vertical {
  display: flex;
  align-items: stretch;
}
.el-pro-steps-form--vertical > .el-pro-steps-form__steps {
  width: 50%;
  flex-shrink: 0;
  margin-bottom: 0;
}
.el-pro-steps-form--vertical > .el-pro-steps-form__body {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
@media (min-width: 576px) {
  .el-pro-steps-form--vertical > .el-pro-steps-form__steps {
    width: 41.667%;
  }
}
@media (min-width: 768px) {
  .el-pro-steps-form--vertical > .el-pro-steps-form__steps {
    width: 33.333%;
  }
}
@media (min-width: 992px) {
  .el-pro-steps-form--vertical > .el-pro-steps-form__steps {
    width: 29.167%;
  }
}
@media (min-width: 1200px) {
  .el-pro-steps-form--vertical > .el-pro-steps-form__steps {
    width: 25%;
  }
}
@media (min-width: 1600px) {
  .el-pro-steps-form--vertical > .el-pro-steps-form__steps {
    width: 16.667%;
  }
}
</style>
