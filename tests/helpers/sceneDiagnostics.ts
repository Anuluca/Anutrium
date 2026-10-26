import { test as base } from '@playwright/test'

export { expect, type Page } from '@playwright/test'

// 只有依赖内部诊断字段的测试导入此夹具；普通页面和其他测试不会隐式开启。
export const test = base.extend<{ sceneDiagnostics: boolean }>({
  sceneDiagnostics: [true, { option: true }],
  context: async ({ context, sceneDiagnostics }, use) => {
    await context.addInitScript((enabled) => {
      window.__ANUTRIUM_HOME_DIAGNOSTICS__ = enabled
    }, sceneDiagnostics)
    await use(context)
  },
})
