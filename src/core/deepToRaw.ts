import { isProxy, isRef, toRaw } from 'vue'

/**
 * 递归解掉 Vue 响应式代理（ref / reactive / 嵌套子对象），不做业务数据拷贝——
 * 解出的新结构只解代理、叶子保持原引用，调用方拿到后再交给 structuredClone 深拷贝。
 *
 * 为什么不用一次 toRaw：toRaw 只解最外层代理，嵌套的 reactive 子对象会原样
 * 留在返回值里，structuredClone 仍抛 DataCloneError，退浅拷贝会让草稿和源数据
 * 共享嵌套对象（草稿改完取消，源行跟着变）。
 *
 * ref 被解成它的当前值而不是 RefImpl：把 RefImpl 丢给 structuredClone 克隆出的
 * 是内部结构（dep/depMap 等垃圾字段），提交数据会带上它们。
 */
export function deepToRaw<T>(source: T): T {
  if (isRef(source)) return deepToRaw(source.value) as T
  if (Array.isArray(source)) {
    return source.map((item) => deepToRaw(item)) as unknown as T
  }
  if (isProxy(source)) {
    return deepToRaw(toRaw(source))
  }
  if (isPlainObject(source)) {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(source)) {
      out[key] = deepToRaw(source[key])
    }
    return out as unknown as T
  }
  return source
}

/** 只递归普通对象（字面量或 null 原型）；函数/Date/RegExp 等交给 structuredClone 处理 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false
  if (typeof value === 'function') return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/**
 * 拷一份草稿初值：先解干净代理再 structuredClone。
 * structuredClone 遇到函数、DOM 节点仍会抛错（函数被 deepToRaw 剥掉，DOM 不会），
 * 这时退浅拷贝——总比崩了好。
 */
export function cloneDraft<T>(source: T): T {
  if (source === null || typeof source !== 'object') return source
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(deepToRaw(source))
    } catch {
      /* 含不可克隆的值，退回浅拷贝 */
    }
  }
  return (Array.isArray(source) ? [...source] : { ...(source as object) }) as T
}
