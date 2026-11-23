import { test, expect } from '@playwright/test'

/**
 * upload valueType 的真实链路：表单上传（customRequest 管道 / 零配置 base64 回落）→
 * 值写进 model → 读态按图片/非图片/空渲染。
 * 单测已覆盖 resolveCell 与渲染分支，但这层补「真实浏览器里 el-upload 上传后值是否进
 * model、列表是否回显、页面读态是否渲染」的时序类故障（与 table/rich-text 同一动机）。
 */
test.describe('ElProProForm upload valueType', () => {
  test('编辑态渲染上传控件并回显已有文件', async ({ page }) => {
    await page.goto('/?page=/upload')

    // 表单里渲染出 el-upload 控件
    await expect(page.locator('.el-upload').first()).toBeVisible()

    // 附件列（listType=text）回显已有 URL 的文件名；
    // 注意 demo 的「当前值」段落也会包含同名文本，必须定位到上传列表项避免歧义
    await expect(
      page.locator('.el-upload-list__item-file-name').filter({ hasText: '方案-最终-v3.pdf' }),
    ).toBeVisible()
  })

  test('customRequest 上传后 URL 写进 model（真实文件注入）', async ({ page }) => {
    await page.goto('/?page=/upload')

    // 附件列配了 customRequest → fakeUpload；非图片文件让它走 URL 分支
    const attachments = page.locator('.el-form-item').filter({ hasText: '附件' })
    await attachments.locator('input[type=file]').setInputFiles({
      name: 'e2e-report.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 test'),
    })

    // fakeUpload 有 400ms 模拟延迟；列表项文件名来自返回 URL 的 basename
    await expect(
      attachments.locator('.el-upload-list__item-file-name').filter({ hasText: 'e2e-report.pdf' }),
    ).toBeVisible({ timeout: 15_000 })

    // demo 的「当前值」段落也应包含 fakeUpload 返回的 URL（非图片走 URL 分支）
    await expect(page.locator('p').filter({ hasText: /example\.invalid/ }).first()).toBeVisible()
  })

  test('零配置回落：图片上传后以 data URL 内嵌并回显缩略图', async ({ page }) => {
    await page.goto('/?page=/upload')

    // 零配置回落列（picture-card，无 customRequest）→ FileReader 转 data URL
    const fallbackField = page.locator('.el-form-item').filter({ hasText: '零配置回落' }).first()
    await fallbackField.locator('input[type=file]').setInputFiles({
      name: 'e2e.png',
      mimeType: 'image/png',
      // 真实 1x1 透明 PNG，确保 <img> 能正常解码
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64',
      ),
    })

    // picture-card 列表出现 data URL 缩略图
    const thumb = fallbackField.locator('.el-upload-list--picture-card img').first()
    await expect(thumb).toBeVisible({ timeout: 15_000 })
    await expect(thumb).toHaveAttribute('src', /^data:image\/png/)
  })

  test('只读三态：图片出缩略图墙、非图片出链接、空值显示占位', async ({ page }) => {
    await page.goto('/?page=/upload')

    // 表格封面（图片）→ 缩略图墙
    await expect(page.locator('.el-pro-cell__upload-img').first()).toBeVisible()

    // 表格附件（非图片）→ 文件链接，href 为原始 URL
    const link = page.locator('.el-pro-cell__upload-link').first()
    await expect(link).toHaveAttribute('href', /example\.invalid\/doc\/合同\.pdf/)

    // 描述空值列 → 空值占位「-」
    await expect(page.locator('.el-pro-cell__empty').first()).toBeVisible()
    await expect(page.locator('.el-pro-cell__empty').first()).toContainText('-')
  })
})
