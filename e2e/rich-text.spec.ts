import { test, expect } from '@playwright/test'

/**
 * 富文本的真实交互断言。
 *
 * 重点用例「拖入一张图只插一张」覆盖真实发生过的事故：Quill 自带的 uploader 模块
 * 与我们注入的上传管道同时对同一次 drop 生效，结果插了两张。这个问题在 mock 环境
 * 里不存在（mock 的 Quill 没有 uploader），只能靠真实浏览器发现。
 */

/** 在编辑器内投递一次真实 drag/drop（带文件），与用户拖图行为一致 */
async function dropImageInto(page: import('@playwright/test').Page, selector: string) {
  await page.evaluate((sel) => {
    const editor = document.querySelector(sel) as HTMLElement | null
    if (!editor) throw new Error(`找不到编辑器：${sel}`)
    const canvas = document.createElement('canvas')
    canvas.width = 4
    canvas.height = 4
    const dataUrl = canvas.toDataURL('image/png')
    const binary = atob(dataUrl.split(',')[1])
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
    const file = new File([bytes], 'e2e.png', { type: 'image/png' })

    const dt = new DataTransfer()
    dt.items.add(file)
    // 先 dragover（浏览器默认拒绝 drop，组件必须 preventDefault），再 drop
    editor.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }))
    editor.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }))
  }, selector)
}

test.describe('ElProRichText', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?page=/rich-text')
    // 等编辑器初始化完成（Quill 是动态 import）
    await expect(page.locator('.ql-editor').first()).toBeVisible()
  })

  test('每个富文本编辑器都完整初始化（含禁用态）', async ({ page }) => {
    // 不硬编码数量：demo 增删示例不该让这条挂。断言「所有 .el-pro-rich-text 都完整可用」
    const roots = page.locator('.el-pro-rich-text')
    const count = await roots.count()
    expect(count).toBeGreaterThanOrEqual(3)
    for (let i = 0; i < count; i += 1) {
      await expect(roots.nth(i).locator('.ql-editor')).toHaveCount(1)
      await expect(roots.nth(i).locator('.ql-toolbar')).toHaveCount(1)
    }
    // 禁用态确实被标出来
    await expect(page.locator('.el-pro-rich-text.is-disabled')).toHaveCount(1)
    // 不该有初始化失败提示
    await expect(page.getByText('编辑器初始化失败')).toHaveCount(0)
  })

  test('拖入一张图片只插入一张（Quill 自带 uploader 不得重复插入）', async ({ page }) => {
    const firstEditor = page.locator('.el-pro-rich-text').first().locator('.ql-editor')
    await expect(firstEditor).toBeVisible()
    await expect(firstEditor.locator('img')).toHaveCount(0)

    await dropImageInto(page, '.el-pro-rich-text:first-of-type .ql-editor')

    // 允许上传/写盘异步，等第一张出现
    await expect(firstEditor.locator('img')).toHaveCount(1, { timeout: 10_000 })
    // 再等一小会儿，确认没有第二张补进来（双重插入是异步的）
    await page.waitForTimeout(800)
    await expect(firstEditor.locator('img')).toHaveCount(1)
  })

  test('禁用态拖入图片：不插图、内容不变', async ({ page }) => {
    const disabledEditor = page.locator('.el-pro-rich-text.is-disabled').locator('.ql-editor')
    await expect(disabledEditor).toBeVisible()
    const before = await disabledEditor.innerHTML()

    await dropImageInto(page, '.el-pro-rich-text.is-disabled .ql-editor')
    await page.waitForTimeout(600)

    await expect(disabledEditor.locator('img')).toHaveCount(0)
    expect(await disabledEditor.innerHTML()).toBe(before)
  })

  /**
   * 拖拽双图 bug 的自动化覆盖说明（诚实的边界）：
   *
   * 上面那条「拖入只插一张」验的是结果，但程序化 drop 事件**到不了** Quill uploader
   * 的插入分支（它靠 caretRangeFromPoint(clientX, clientY) 定位，合成事件没有有效
   * 坐标），所以它无法作为双插入回归的可靠守卫。试过把修复改成旧行为（监听挂
   * quill.root、非捕获），这条用例依然、绿 —— 反证失败，证明它守不住机制。
   *
   * 真正生效的防线是组件内的捕获阶段拦截 + uploader handler 置空，它们属于实现
   * 细节，无法从外部稳定断言。真实拖拽的人工验收：demo 富文本页拖一张图应只多一张。
   */
  test('默认工具栏渲染出链接与图片按钮', async ({ page }) => {
    const toolbar = page.locator('.el-pro-rich-text').first().locator('.ql-toolbar')
    await expect(toolbar.locator('.ql-bold')).toHaveCount(1)
    await expect(toolbar.locator('.ql-link')).toHaveCount(1)
    await expect(toolbar.locator('.ql-image')).toHaveCount(1)
  })
})
