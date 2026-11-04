/**
 * 弹窗表单 / 抽屉表单的公共行为。
 *
 * 两个容器组件（ElProModalForm、ElProDrawerForm）除了外壳不同，行为完全一样：
 * 开关的受控/非受控、内部草稿的播种、校验 → 提交 → 成功了才关。
 * 这些逻辑写两遍迟早会走偏（改了一处忘了另一处），所以抽到这里。
 *
 * 两个容易写错的地方，单独说明：
 * 1. **草稿只在「打开」时播种**，不在关闭时清空。
 *    关闭时清空会让动画期间的值先跳回初始值，视觉上闪一下；
 *    而打开时重播既能保证干净，也不会影响任何正在播放的过渡。
 * 2. **提交失败不是异常分支**。`onFinish` 返回的 Promise reject 时只发事件、不关窗，
 *    甚至不把错误吞掉——外层要用它去 toast。
 */
import { computed, nextTick, reactive, ref, watch } from 'vue'
import type { ProFormContainerProps } from '../../types'

/**
 * ElProForm 对外暴露的那部分。
 *
 * 必须 export：弹窗组件把它通过 `defineExpose` 暴露出去，
 * 生成 d.ts 时这个类型会出现在公开类型里，私有的话打包会报 TS4082
 * （Default export of the module has or is using private name）。
 *
 * 只依赖用得到的方法、不 import 组件本身：否则 SFC 之间互相引用，
 * 打包时会多出一层循环依赖（虽然能跑，但没必要）。
 */
export interface ProFormInstance {
  validate: () => Promise<boolean>
  clearValidate: () => void
  getModel: () => Record<string, any>
}

interface FormContainerEvents {
  /** 开关变化。受控时由调用方写回 `open`，非受控时组件已经自己记下了 */
  onOpenChange: (open: boolean) => void
  onCancel: () => void
  /** 提交失败。调用方在这里 toast / 打点，窗不会关 */
  onFinishError: (error: unknown) => void
}

/**
 * 拷一份草稿初值。
 *
 * 用 structuredClone 而不是 `{...}`：像日期区间这种字段是数组，
 * 浅拷贝会让草稿和原行共享同一个数组，在草稿里改完取消，原行也跟着变了。
 * structuredClone 遇到函数、DOM 节点会抛错，这时退回浅拷贝——总比崩了好。
 */
function cloneSeed<T>(source: T): T {
  if (source === null || typeof source !== 'object') return source
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(source)
    } catch {
      /* 含不可克隆的值，退回浅拷贝 */
    }
  }
  return (Array.isArray(source) ? [...source] : { ...(source as object) }) as T
}

export function useFormContainer(props: ProFormContainerProps, events: FormContainerEvents) {
  const formRef = ref<ProFormInstance>()
  const submitting = ref(false)
  /** 非受控模式的开关状态。受控模式下这个值没人读 */
  const innerOpen = ref(props.defaultOpen ?? false)
  /** 内部草稿。`Object.assign` 就地改，保证表单拿到的引用始终是同一个 */
  const draft = reactive<Record<string, any>>({})

  const controlled = computed(() => props.open !== undefined)
  const isOpen = computed(() => (controlled.value ? !!props.open : innerOpen.value))
  /** 表单真正读写的对象：给了 model 就用它，否则用内部草稿 */
  const formModel = computed<Record<string, any>>(() => props.model ?? draft)

  function setOpen(value: boolean) {
    if (!controlled.value) innerOpen.value = value
    events.onOpenChange(value)
  }

  function seedDraft() {
    const seed = props.initialValues ? cloneSeed(props.initialValues) : {}
    // 先删再合：上一次多出来的字段不能留在草稿里，否则会跟着下一次提交上去
    for (const key of Object.keys(draft)) delete draft[key]
    Object.assign(draft, seed)
  }

  watch(
    isOpen,
    (value) => {
      if (!value) return
      if (!props.model) seedDraft()
      // destroy-on-close 时表单是这一刻才挂载的，同步取 ref 还是空的
      nextTick(() => formRef.value?.clearValidate())
    },
    { immediate: true },
  )

  function openDialog() {
    if (!isOpen.value) setOpen(true)
  }

  function closeDialog() {
    if (isOpen.value) setOpen(false)
  }

  /** 遮罩 / ESC / 右上角关闭都从这里进来，走同一套开关逻辑 */
  function onVisibleChange(value: boolean) {
    setOpen(value)
  }

  function onCancel() {
    events.onCancel()
    closeDialog()
  }

  async function handleSubmit() {
    // 连点两下提交会发两次请求，这里挡一下
    if (submitting.value) return

    if (formRef.value) {
      const ok = await formRef.value.validate()
      // 校验失败：不关窗、不进 loading，红字交给表单自己显示
      if (!ok) return
    }

    submitting.value = true
    try {
      // 真值才关窗（对齐 React 与 ElProStepsForm）：返回 false 可留在窗内做二次确认
      const result = await props.onFinish?.(formModel.value)
      if (result) closeDialog()
    } catch (error) {
      events.onFinishError(error)
    } finally {
      submitting.value = false
    }
  }

  return {
    formRef,
    submitting,
    isOpen,
    formModel,
    draft,
    openDialog,
    closeDialog,
    onVisibleChange,
    onCancel,
    handleSubmit,
    getValues: () => formModel.value,
  }
}
