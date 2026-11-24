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

  test('modal：超高内容不撑破弹窗，内容区内部滚动、弹窗在视口内', async ({ page }) => {
    await page.goto('/?page=/schema-form')

    await page.getByRole('button', { name: '切换到下一个布局' }).click() // modal
    await page.getByRole('button', { name: '打开弹窗' }).click()
    await expect(page.locator('.el-dialog')).toBeVisible()

    // 复现「内容超高」：向内容区注入 2000px 高占位，量弹窗几何与内容区滚动能力。
    // 修复前内容区 overflow:visible + 无 max-height，弹窗会被撑出视口（断言红）；
    // 修复后内容区内部滚动、弹窗高度不变（断言绿。
    const metrics = await page.evaluate(() => {
      const body = document.querySelector('.el-dialog .el-dialog__body')
      const dialog = document.querySelector('.el-dialog')
      if (!body || !dialog) return null
      const sep = document.createElement('div')
      sep.style.height = '2000px'
      body.appendChild(sep)
      const rect = dialog.getBoundingClientRect()
      const css = getComputedStyle(body)
      const scrollHeight = body.scrollHeight
      const clientHeight = body.clientHeight
      const overflowY = css.overflowY
      body.removeChild(sep)
      return {
        dialogBottom: Math.round(rect.bottom),
        viewportH: window.innerHeight,
        scrollHeight,
        clientHeight,
        overflowY,
      }
    })

    // 弹窗底部不超出视口（内容再高也不撑破弹窗）
    expect(metrics?.dialogBottom).toBeLessThanOrEqual(metrics!.viewportH + 1)
    // 内容区是内部滚动容器（超高时能滚而不是溢出）
    expect(metrics?.overflowY).toBe('auto')
    expect(metrics!.scrollHeight).toBeGreaterThan(metrics!.clientHeight)
  })

  test('modal：内容不横向溢出，日期控件随列宽收缩无横向滚动条', async ({ page }) => {
    await page.goto('/?page=/schema-form')

    await page.getByRole('button', { name: '切换到下一个布局' }).click() // modal
    await page.getByRole('button', { name: '打开弹窗' }).click()
    await expect(page.locator('.el-dialog')).toBeVisible()

    // 复现「横向滚动条」：560px 弹窗一行三列（formSpan 8）每列约 176px，
    // .el-date-editor 默认固定 220px 不收缩，加上 100px label 撑宽整行；
    // 内容区 overflow-y:auto 连带开启横向滚动，溢出表现为横向滚动条。
    // 修复前日期控件保持 220px 且内容超出弹窗右缘（断言红）；
    // 修复后控件随列宽收缩、内容不出弹窗、无用户可见的横向滚动条（断言绿）。
    const metrics = await page.evaluate(() => {
      const body = document.querySelector('.el-dialog .el-dialog__body')
      const dialog = document.querySelector('.el-dialog')
      const editor = body?.querySelector<HTMLElement>('.el-date-editor')
      if (!body || !dialog) return null
      // 内容最右边缘：看是否有真实内容超出弹窗（gutter 出血不算内容）
      const dialogRight = dialog.getBoundingClientRect().right
      let maxContentRight = 0
      body.querySelectorAll('.el-form-item, .el-input, .el-textarea').forEach((el) => {
        maxContentRight = Math.max(maxContentRight, el.getBoundingClientRect().right)
      })
      const css = getComputedStyle(body)
      return {
        scrollWidth: body.scrollWidth,
        clientWidth: body.clientWidth,
        overflowX: css.overflowX,
        editorWidth: editor ? Math.round(editor.getBoundingClientRect().width) : null,
        maxContentRight: Math.round(maxContentRight),
        dialogRight: Math.round(dialogRight),
      }
    })

    expect(metrics).not.toBeNull()
    // 日期控件随列宽伸缩，不再保持 220px 固定宽
    expect(metrics!.editorWidth).not.toBeNull()
    expect(metrics!.editorWidth!).toBeLessThan(220)
    // 没有真实内容被裁剪或戳出弹窗
    expect(metrics!.maxContentRight).toBeLessThanOrEqual(metrics!.dialogRight + 1)
    // 用户看不到横向滚动条：要么内容不溢出，要么滚动容器显式收掉了横向滚动
    expect(
      metrics!.overflowX === 'hidden' || metrics!.scrollWidth <= metrics!.clientWidth + 1,
    ).toBe(true)
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

  test('drawer：内容不横向溢出，日期控件随列宽收缩无横向滚动条', async ({ page }) => {
    await page.goto('/?page=/schema-form')

    const next = page.getByRole('button', { name: '切换到下一个布局' })
    await next.click() // modal
    await next.click() // drawer
    await page.getByRole('button', { name: '打开抽屉' }).click()
    await expect(page.locator('.el-drawer')).toBeVisible()

    // 与 modal 同一问题：抽屉 body 也是滚动容器（EP 默认 overflow:auto），
    // 窄列（demo formSpan 8 在 480px 抽屉里每列约 147px）下 .el-date-editor
    // 卡在固有 min-content（约 180px）不收缩，撑宽整行表现为横向滚动条。
    // 修复前内容超出抽屉右缘（断言红）；修复后控件随列宽伸缩（断言绿）。
    const metrics = await page.evaluate(() => {
      const body = document.querySelector('.el-pro-drawer-form .el-drawer__body')
      const drawer = document.querySelector('.el-pro-drawer-form')
      const editor = body?.querySelector<HTMLElement>('.el-date-editor')
      if (!body || !drawer) return null
      // 内容最右边缘：看是否有真实内容超出抽屉（gutter 出血不算内容）
      const drawerRight = drawer.getBoundingClientRect().right
      let maxContentRight = 0
      body.querySelectorAll('.el-form-item, .el-input, .el-textarea').forEach((el) => {
        maxContentRight = Math.max(maxContentRight, el.getBoundingClientRect().right)
      })
      const css = getComputedStyle(body)
      return {
        scrollWidth: body.scrollWidth,
        clientWidth: body.clientWidth,
        overflowX: css.overflowX,
        editorWidth: editor ? Math.round(editor.getBoundingClientRect().width) : null,
        maxContentRight: Math.round(maxContentRight),
        drawerRight: Math.round(drawerRight),
      }
    })

    expect(metrics).not.toBeNull()
    // 日期控件随列宽伸缩，不再卡在固有 min-content 宽
    expect(metrics!.editorWidth).not.toBeNull()
    expect(metrics!.editorWidth!).toBeLessThan(140)
    // 没有真实内容被裁剪或戳出抽屉
    expect(metrics!.maxContentRight).toBeLessThanOrEqual(metrics!.drawerRight + 1)
    // 用户看不到横向滚动条：要么内容不溢出，要么滚动容器显式收掉了横向滚动
    expect(
      metrics!.overflowX === 'hidden' || metrics!.scrollWidth <= metrics!.clientWidth + 1,
    ).toBe(true)
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
