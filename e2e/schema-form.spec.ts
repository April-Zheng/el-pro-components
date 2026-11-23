import { test, expect } from '@playwright/test'

/**
 * ElProSchemaForm 的真实链路：一份 columns 经 layoutType 分发到六种容器，
 * 弹窗/抽屉能打开、分步能渲染步数与字段。
 * 单测（happy-dom）能断言容器存在，但「真实浏览器里切换布局后容器是否正确
 * 挂载、弹窗是否真的弹出、分步步骤条是否渲染」这类时序/挂载故障只有这层能抓到。
 */
test.describe('ElProSchemaForm', () => {
  test('默认 form：渲染表单、字段与 divider 分隔线', async ({ page }) => {
    await page.goto('/?page=/schema-form')

    await expect(page.locator('.el-form').first()).toBeVisible()
    // 字段项由 el-form-item 包裹
    await expect(page.locator('.el-form-item').first()).toBeVisible()
    // divider 列（valueType: divider）渲染 el-divider
    await expect(page.locator('.el-divider').first()).toBeVisible()
  })

  test('modal：切布局后打开弹窗，渲染容器与字段', async ({ page }) => {
    await page.goto('/?page=/schema-form')

    // form → modal（点一次「切换到下一个布局」）
    await page.getByRole('button', { name: '切换到下一个布局' }).click()
    // modal 专属的「打开弹窗」按钮出现
    await page.getByRole('button', { name: '打开弹窗' }).click()
    await expect(page.locator('.el-dialog').first()).toBeVisible()
    await expect(page.locator('.el-form-item').first()).toBeVisible()
  })

  test('drawer：切两次布局后打开抽屉', async ({ page }) => {
    await page.goto('/?page=/schema-form')

    const next = page.getByRole('button', { name: '切换到下一个布局' })
    await next.click() // modal
    await next.click() // drawer
    await page.getByRole('button', { name: '打开抽屉' }).click()
    await expect(page.locator('.el-drawer').first()).toBeVisible()
    await expect(page.locator('.el-form-item').first()).toBeVisible()
  })

  test('steps：切三次布局后分步表单渲染「步骤 1 / 步骤 2」', async ({ page }) => {
    await page.goto('/?page=/schema-form')

    const next = page.getByRole('button', { name: '切换到下一个布局' })
    await next.click() // modal
    await next.click() // drawer
    await next.click() // steps
    await expect(page.locator('.el-pro-steps-form').first()).toBeVisible()
    await expect(page.getByText('步骤 1')).toBeVisible()
    await expect(page.getByText('步骤 2')).toBeVisible()
  })

  test('queryFilter / lightFilter：继续切换渲染对应筛选容器', async ({ page }) => {
    await page.goto('/?page=/schema-form')

    const next = page.getByRole('button', { name: '切换到下一个布局' })
    await next.click() // modal
    await next.click() // drawer
    await next.click() // steps
    await next.click() // queryFilter
    await expect(page.locator('.el-pro-query-filter').first()).toBeVisible()
    await next.click() // lightFilter
    await expect(page.locator('.el-pro-light-filter').first()).toBeVisible()
  })
})
