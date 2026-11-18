import { test, expect } from '@playwright/test'

/**
 * 表格链路的真实断言：request → 渲染行 → 查询。
 * 单测里 useTable 被 mock 掉请求，测不到「这个库装进真实页面后，请求结果能不能变成行」。
 */
test.describe('ElProTable', () => {
  test('request 返回数据后渲染出表格行', async ({ page }) => {
    await page.goto('/?page=/users')

    const table = page.locator('.el-table').first()
    await expect(table).toBeVisible()

    // demo 的 request 是 mock 的异步数据，等行渲染出来
    await expect(page.locator('.el-table__body tr').first()).toBeVisible({ timeout: 15_000 })
    const rowCount = await page.locator('.el-table__body tr').count()
    expect(rowCount).toBeGreaterThan(0)

    // 分页总数文案存在（说明 request 的 total 被消费）
    await expect(page.getByText(/共\s*\d+\s*条/)).toBeVisible()
  })

  test('搜索栏提交后表格重新请求（结果区仍在，不空白）', async ({ page }) => {
    await page.goto('/?page=/users')
    await expect(page.locator('.el-table__body tr').first()).toBeVisible({ timeout: 15_000 })

    // 点查询按钮
    await page.getByRole('button', { name: '查询' }).first().click()

    // 重新请求后行仍在（回归「查询后表格被清空」类问题）
    await expect(page.locator('.el-table__body tr').first()).toBeVisible({ timeout: 15_000 })
  })
})
