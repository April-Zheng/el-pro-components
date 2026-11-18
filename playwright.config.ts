import { defineConfig, devices } from '@playwright/test'

/**
 * E2E 配置：跑真实 Chromium，针对 demo（playground）做交互断言。
 *
 * 为什么单测之外还要这一层：单元测试全部基于 mock 与 happy-dom，
 * 已发生过的六类真实故障（拖拽双图、ref 时序、SSR、UMD install、初始化失败、
 * 多实例只渲染一个）没有一类能被 mock 单测发现。这一层负责「真实浏览器里点一下」。
 */
export default defineConfig({
  testDir: './e2e',
  /* 单条用例 30s 上限：组件初始化含动态 import，给足余量但不无限等 */
  timeout: 30_000,
  expect: { timeout: 10_000 },
  /* 断言失败时重试一次，排除动态加载偶发抖动；连续失败就是真问题 */
  retries: process.env.CI ? 1 : 0,
  /* CI 上单 worker 更稳（demo 内部有定时器与轮询） */
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:5299',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  /* 自动拉起 demo dev server；CI 上复用它以避免重复启动 */
  webServer: {
    command: 'npm run dev:e2e',
    url: 'http://127.0.0.1:5299',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})