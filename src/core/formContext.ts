import type { ComputedRef, InjectionKey } from 'vue'

/**
 * 表单级只读状态的注入键。
 *
 * ElProForm `provide` 它，FormField `inject` 它 —— 这样 `readonly` 能自动贯穿
 * **任意深度**的嵌套字段（ProFormGroup / ProFormList / 嵌套分组），不需要逐层手动传 prop。
 * 对齐 React 的 `EditOrReadOnlyContext`。
 */
export const PRO_FORM_READONLY: InjectionKey<ComputedRef<boolean>> = Symbol('ElProFormReadonly')
