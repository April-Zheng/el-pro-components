/**
 * 布局上下文：把「上方被 ProLayout 占掉多少像素」告诉页面层。
 *
 * 为什么需要它：页头吸顶时，el-affix 的 offset 必须等于布局顶栏的高度。
 * 给的 offset 是 0，页头就会钉在视口最顶上，正好把 ProLayout 的顶栏
 * （折叠按钮 + 面包屑）盖掉 —— 而且因为顶栏自己不吸顶，它还会被滚上去。
 *
 * 这个数字只有布局自己知道。让每个页面手写 `:affix-props="{ offset: 56 }"`
 * 有两个问题：56 是魔法数，换布局或改顶栏高度就得全站改一遍；更常见的是
 * 忘了写，于是就出现「页头盖住顶栏」。
 *
 * 和 `--el-pro-sider-width` 的分工：
 * - CSS 变量给**样式**用（底部固定条给侧栏让位，纯像素就够）
 * - 这个上下文给 **JS** 用（el-affix 的 offset 只收数字，CSS 变量读不进 props）
 *
 * 页面容器不是必须的消费者：没有 ElProLayout 时 inject 拿到 null，
 * 偏移回落到 0，单独用 ElProPageContainer 依然是「贴视口顶」的正确行为。
 */
import type { InjectionKey } from 'vue'

export interface ProLayoutContext {
  /** 布局顶栏高度（px）。吸顶元素要钉在它下面 */
  headerHeight: number
  /**
   * 当前生效的侧栏宽度（px），随折叠/隐藏变化。
   * 固定条（FooterToolbar）避让侧栏用；没在布局内时取不到，自行回落 0
   */
  siderWidth: () => number
}

export const PRO_LAYOUT: InjectionKey<ProLayoutContext> = Symbol('elProLayout')

/** 顶栏高度。CSS 侧通过 `--el-pro-layout-header-height` 复用同一个值 */
export const PRO_LAYOUT_HEADER_HEIGHT = 56
