// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick } from 'vue'
import ElProLayout from '../src/components/ElProLayout/ElProLayout.vue'
import type { ProLayoutMenuItem } from '../src/types'

let cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.forEach((fn) => fn())
  cleanups = []
})

interface MountOptions {
  menus: ProLayoutMenuItem[]
  router?: boolean
  $router?: { push: ReturnType<typeof vi.fn> }
}

function mount({ menus, router = true, $router }: MountOptions) {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const app = createApp({
    render: () => h(ElProLayout as any, { menus, router, title: 'Demo' }),
  })
  if ($router) {
    ;(app.config.globalProperties as any).$router = $router
  }
  app.mount(root)
  cleanups.push(() => {
    app.unmount()
    root.remove()
  })
  return root
}

describe('MenuItem href / query 死字段实现（类型声明了但 MenuItem 未消费）', () => {
  it('href 渲染成新窗外部链接，不触发内部路由跳转', async () => {
    const $router = { push: vi.fn(() => Promise.resolve()) }
    const root = mount({
      menus: [{ title: '外链', href: 'https://example.com/doc' }],
      $router,
    })
    await nextTick()

    const anchor = root.querySelector('a[href="https://example.com/doc"]') as HTMLAnchorElement | null
    expect(anchor).not.toBeNull()
    expect(anchor!.getAttribute('target')).toBe('_blank')
    expect(anchor!.getAttribute('rel')).toContain('noopener')
    // 外链点击不走 el-menu 的 router 模式：点击后不发生内部跳转
    anchor!.click()
    expect($router.push).not.toHaveBeenCalled()
  })

  it('query 经 el-menu router 模式拼进跳转参数，index 不受影响', async () => {
    const $router = { push: vi.fn(() => Promise.resolve()) }
    const root = mount({
      menus: [{ title: '用户', path: '/users', query: { tab: 'audit' } }],
      $router,
    })
    await nextTick()

    // 点叶子项：el-menu router 模式 push(route || index)
    const menuItem = root.querySelector('.el-menu-item') as HTMLElement | null
    expect(menuItem).not.toBeNull()
    menuItem!.click()

    expect($router.push).toHaveBeenCalledTimes(1)
    const arg = $router.push.mock.calls[0][0] as any
    // route 对象带 path + query（不是把 query 塞进 index 字符串破坏高亮匹配）
    expect(arg).toMatchObject({ path: '/users', query: { tab: 'audit' } })
  })

  it('无 query 时跳转行为不变（index 兜底）', async () => {
    const $router = { push: vi.fn(() => Promise.resolve()) }
    const root = mount({
      menus: [{ title: '首页', path: '/home' }],
      $router,
    })
    await nextTick()

    const menuItem = root.querySelector('.el-menu-item') as HTMLElement | null
    menuItem!.click()
    expect($router.push).toHaveBeenCalledWith('/home')
  })
})
