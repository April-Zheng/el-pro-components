/**
 * 表单字段联动：按「其它字段的当前值」决定这一列**显不显示**、**长什么样**。
 *
 * 为什么放在 core/ 而不是组件里：这段逻辑不碰任何 DOM，只做列数组的变换，
 * 单独放着既能被 ElProForm 复用，也能直接在 Node 里测（不用挂一个浏览器）。
 *
 * 一个刻意的取舍：**回调只拿到 dependsOn 里列出的字段**，不是整份 model。
 * 这样有两个好处——依赖关系写在明面上，读代码时不用猜这列到底跟谁有关；
 * 而且 Vue 的响应式只会跟踪这几个字段，改别的字段不会连带重算整张表单的列。
 * 代价是漏写依赖就拿不到值，但那是「一眼能看出来」的错，比隐式全量依赖好查。
 */
import type { ProColumn, ProFormDependency } from '../types'

/** 按路径取值。支持 `a.b` / `contacts.0.name` 这种 */
function getByPath(source: Record<string, any>, path: string): any {
  if (!path.includes('.')) return source?.[path]
  return path.split('.').reduce<any>((acc, key) => (acc == null ? acc : acc[key]), source)
}

/**
 * 取出这列依赖的那几个字段，拼一个只含它们的对象交给回调。
 *
 * key 用的就是 `dependsOn` 里写的字符串原样（所以 `'billingType'` 用 `values.billingType` 取，
 * `'contacts.0.name'` 用 `values['contacts.0.name']` 取）。不为嵌套路径去重建嵌套结构：
 * 那种「看起来像 model 其实不是」的对象更容易让人写错。
 */
export function pickDeps(values: Record<string, any>, dependsOn: string[]): Record<string, any> {
  const scoped: Record<string, any> = {}
  for (const path of dependsOn) scoped[path] = getByPath(values, path)
  return scoped
}

/**
 * 算出一列在「当前值」下应该长什么样。不显示就返回 `null`。
 *
 * 隐藏是靠**不渲染**实现的：卸载后它的 el-form-item 会从表单注销，
 * 规则自然也不再参与校验。这正是想要的行为——藏起来的必填项不该拦住提交；
 * 如果反过来做（渲染但 display:none），用户会被一个看不见的错误卡死。
 */
export function resolveColumnByDependency(
  column: ProColumn,
  values: Record<string, any>,
): ProColumn | null {
  const dependency: ProFormDependency | undefined = column.dependency
  if (!dependency) return column

  const scoped = pickDeps(values, dependency.dependsOn)
  if (dependency.visible && !dependency.visible(scoped)) return null

  const patch = dependency.resolve?.(scoped)
  return patch ? { ...column, ...patch } : column
}

/** 表单实际要渲染的列：先按 hideInForm 过滤，再逐列套联动 */
export function resolveFormColumns(
  columns: ProColumn[],
  values: Record<string, any>,
): ProColumn[] {
  const out: ProColumn[] = []
  for (const column of columns) {
    if (column.hideInForm) continue
    const resolved = resolveColumnByDependency(column, values)
    if (resolved) out.push(resolved)
  }
  return out
}
