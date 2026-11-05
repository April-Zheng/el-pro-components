<script setup lang="ts">
/**
 * ElProFieldSet —— 一组可选值（复选/单选）绑一个字段。
 *
 * 与 select 的区别是**全部选项平铺展示**，适合选项少且重要的场景。
 * 在 schema 里通过 `fieldComponent` 接入：
 * ```ts
 * { prop: 'roles', label: '角色', fieldComponent: ElProFieldSet,
 *   fieldProps: { options: ROLE_OPTIONS, multiple: true } }
 * ```
 * `multiple`（默认按 value 是否数组自动判断）：true 绑数组，false 绑单值。
 */
import { computed } from 'vue'
import { ElCheckbox, ElCheckboxGroup, ElRadio, ElRadioGroup } from 'element-plus'

defineOptions({ name: 'ElProFieldSet' })

export interface FieldSetOption {
  label: string
  value: string | number
  disabled?: boolean
}

const props = withDefaults(
  defineProps<{
    modelValue?: string | number | (string | number)[]
    /** 可选项。字符串项自动转 { label: value, value } */
    options: (string | number | FieldSetOption)[]
    /** 多选（绑数组）还是单选（绑单值）。不传则按 value 类型自动判断 */
    multiple?: boolean
    disabled?: boolean
    /** 选项是否带边框 */
    border?: boolean
  }>(),
  { border: false },
)

const emit = defineEmits<{ 'update:modelValue': [any] }>()

const normalized = computed<FieldSetOption[]>(() =>
  (props.options ?? []).map((o) => (typeof o === 'string' || typeof o === 'number' ? { label: String(o), value: o } : o)),
)

const multiple = computed(() => props.multiple ?? Array.isArray(props.modelValue))

const value = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})
</script>

<template>
  <ElCheckboxGroup v-if="multiple" v-model="value as (string | number)[]" :disabled="disabled">
    <ElCheckbox v-for="o in normalized" :key="o.value" :value="o.value" :label="o.label" :border="border" :disabled="o.disabled">
      {{ o.label }}
    </ElCheckbox>
  </ElCheckboxGroup>

  <ElRadioGroup v-else v-model="value as string | number" :disabled="disabled">
    <ElRadio v-for="o in normalized" :key="o.value" :value="o.value" :border="border" :disabled="o.disabled">
      {{ o.label }}
    </ElRadio>
  </ElRadioGroup>
</template>
