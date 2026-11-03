/**
 * 卡片的父子关系。
 *
 * 为什么用 provide/inject 而不是「扫描插槽里的 vnode 判断是不是 ProCard」：
 * 1. 判断 vnode 类型要能拿到组件对象本身，SFC 里只能靠 `type.name === 'ElProCard'`，
 *    一旦被 HOC（比如 <KeepAlive>、自定义包装组件）套一层就失效；
 * 2. 父卡要根据「有没有子卡」决定 body 是否清掉 padding，这是个**运行期才确定**的
 *    事实，用注册表天然是响应式的；
 * 3. 子卡要画分割线，得知道自己是不是第一个 —— 序号也一并由父卡分配。
 */
import type { ComputedRef, InjectionKey, Ref } from 'vue'
import type { Breakpoint } from '../types'
import type { NormalizedGutter } from './responsive'

export interface ProCardContext {
  /** 父卡的拆分方向，决定子卡画左边框还是上边框 */
  split: ComputedRef<'vertical' | 'horizontal' | undefined>
  /** 父卡的间距，用来画分割线的偏移（有 gutter 时线不能贴边） */
  gutter: ComputedRef<NormalizedGutter>
  breakpoint: Readonly<Ref<Breakpoint>>
  /** 注册一个子卡，返回它在父卡里的序号 */
  register: () => number
  unregister: () => void
}

export const PRO_CARD_CONTEXT: InjectionKey<ProCardContext> = Symbol('ElProCardContext')

/**
 * CheckCard 与 Group 之间的约定。
 *
 * 单张卡片既能独立用（v-model:checked），也能放进组里（由组管单选/多选）。
 * 组的职责就三件：判断某项是否选中、切换某项、控制整体禁用。
 */
export interface ProCheckCardContext {
  multiple: ComputedRef<boolean>
  disabled: ComputedRef<boolean>
  isChecked: (value: any) => boolean
  toggle: (value: any) => void
}

export const PRO_CHECK_CARD_CONTEXT: InjectionKey<ProCheckCardContext> = Symbol('ElProCheckCardContext')
