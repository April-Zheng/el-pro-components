import { describe, expect, it, vi } from 'vitest'
import { useFormContainer } from '../src/components/ElProForm/useFormContainer'
import type { ProFormContainerProps, ProFormFinish } from '../src/types'

/**
 * 弹窗/抽屉表单的提交语义（Modal 与 Drawer 共用 useFormContainer）。
 *
 * 统一的约定（types.ts ProFormFinish 与 docs 承诺一致，对齐 React）：onFinish
 * **返回真值（或 resolve 真值）才关窗**；false / reject / undefined 都保持打开。
 * 这一组测试把「三容器统一语义」锁成回归用例，防止未来改成「resolve 即关」。
 * StepsForm 的 onFinish 语义同款（真值才重置回第 0 步），由组件内同一约定保证。
 */
function make(props: { onFinish?: ProFormFinish; submitTimeout?: number } = {}) {
  const events = {
    onOpenChange: vi.fn(),
    onCancel: vi.fn(),
    onFinishError: vi.fn(),
  }
  const container = useFormContainer(
    { columns: [], onFinish: props.onFinish, submitTimeout: props.submitTimeout } as ProFormContainerProps,
    events,
  )
  // 注入 mock 表单实例：默认校验通过，单个用例可改
  container.formRef.value = {
    validate: async () => true,
    clearValidate: () => {},
    getModel: () => ({}),
  }
  return { container, events }
}

describe('useFormContainer.onFinish 关窗语义（真值才关，对齐 React）', () => {
  it('onFinish resolve 真值 → 关窗', async () => {
    const { container, events } = make({ onFinish: async () => true })
    container.openDialog()
    await container.handleSubmit()
    expect(container.isOpen.value).toBe(false)
    expect(events.onOpenChange).toHaveBeenLastCalledWith(false)
  })

  it('onFinish resolve false → 保持打开（可留窗做二次确认）', async () => {
    const { container, events } = make({ onFinish: async () => false })
    container.openDialog()
    await container.handleSubmit()
    expect(container.isOpen.value).toBe(true)
    expect(events.onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it('onFinish 返回 undefined → 保持打开（对齐 React falsy 语义）', async () => {
    const { container } = make({ onFinish: async () => undefined })
    container.openDialog()
    await container.handleSubmit()
    expect(container.isOpen.value).toBe(true)
  })

  it('onFinish reject → 保持打开并触发 finish-error', async () => {
    const { container, events } = make({
      onFinish: async () => {
        throw new Error('boom')
      },
    })
    container.openDialog()
    await container.handleSubmit()
    expect(container.isOpen.value).toBe(true)
    expect(events.onFinishError).toHaveBeenCalledTimes(1)
  })

  it('校验失败 → 不调 onFinish、保持打开', async () => {
    let onFinishCalled = false
    const { container, events } = make({
      onFinish: async () => {
        onFinishCalled = true
        return true
      },
    })
    container.formRef.value!.validate = async () => false
    container.openDialog()
    await container.handleSubmit()
    expect(onFinishCalled).toBe(false)
    expect(container.isOpen.value).toBe(true)
    expect(events.onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it('submitTimeout 内 onFinish 未 resolve → 保持打开', async () => {
    const { container } = make({ onFinish: () => new Promise(() => {}), submitTimeout: 5 })
    container.openDialog()
    await container.handleSubmit()
    expect(container.isOpen.value).toBe(true)
  })
})
