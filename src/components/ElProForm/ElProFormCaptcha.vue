<script setup lang="ts">
/**
 * ElProFormCaptcha —— 验证码输入框：输入框 + 「获取验证码」按钮 + 倒计时。
 *
 * 在 schema 里通过 `fieldComponent` 接入：
 * ```ts
 * {
 *   prop: 'captcha', label: '验证码',
 *   fieldComponent: ElProFormCaptcha,
 *   fieldProps: { onGetCaptcha: async () => { await sendSms(model.phone) } },
 * }
 * ```
 * 倒计时由组件自己管理；`onGetCaptcha` 抛错则不进入倒计时（发送失败可重试）。
 */
import { computed, onBeforeUnmount, ref } from 'vue'
import { ElButton, ElInput } from 'element-plus'

defineOptions({ name: 'ElProFormCaptcha' })

const props = withDefaults(
  defineProps<{
    modelValue?: string
    /** 获取验证码。抛错或返回 false 时不启动倒计时 */
    onGetCaptcha?: () => boolean | void | Promise<boolean | void>
    /** 倒计时秒数 @default 60 */
    countDown?: number
    placeholder?: string
    /** 请求验证码期间按钮转圈 */
    loading?: boolean
    disabled?: boolean
    maxlength?: number
    clearable?: boolean
  }>(),
  { countDown: 60, placeholder: '请输入验证码', maxlength: 6, clearable: true },
)

const emit = defineEmits<{ 'update:modelValue': [string] }>()

const value = computed({
  get: () => props.modelValue ?? '',
  set: (v) => emit('update:modelValue', v),
})

const counting = ref(false)
const left = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

function stop() {
  if (timer !== null) {
    clearInterval(timer)
    timer = null
  }
  counting.value = false
}

async function getCaptcha() {
  if (counting.value || props.loading) return
  const result = await props.onGetCaptcha?.()
  if (result === false) return
  left.value = props.countDown
  counting.value = true
  timer = setInterval(() => {
    left.value -= 1
    if (left.value <= 0) stop()
  }, 1000)
}

onBeforeUnmount(stop)
</script>

<template>
  <div class="el-pro-form-captcha">
    <ElInput
      v-model="value"
      :placeholder="placeholder"
      :disabled="disabled"
      :maxlength="maxlength"
      :clearable="clearable"
    />
    <ElButton
      class="el-pro-form-captcha__btn"
      :disabled="disabled || counting"
      :loading="loading"
      @click="getCaptcha"
    >
      {{ counting ? `${left}s 后重发` : '获取验证码' }}
    </ElButton>
  </div>
</template>

<style>
.el-pro-form-captcha {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.el-pro-form-captcha .el-input {
  flex: 1;
}
.el-pro-form-captcha__btn {
  flex: none;
}
</style>
