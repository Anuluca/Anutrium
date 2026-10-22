import { expect, test } from '@playwright/test'

test('frame tasks coalesce and ignore late callbacks after scope disposal', async ({
  page,
}) => {
  await page.route('http://localhost:3000/', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html></html>' })
  )
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { effectScope } = await import('/node_modules/.vite/deps/vue.js')
    const { useFrameTask } = await import('/src/composables/useFrameTask.ts')
    const frame = () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    const scope = effectScope()
    let runs = 0
    const task = scope.run(() => useFrameTask(() => runs++))!
    task.schedule()
    task.schedule()
    task.schedule()
    await frame()
    const coalesced = runs
    task.schedule()
    task.cancel()
    await frame()
    const cancelled = runs
    task.schedule()
    scope.stop()
    // 模拟 document.fonts.ready 在组件卸载后才兑现。
    await Promise.resolve().then(task.schedule)
    await frame()
    return { coalesced, cancelled, afterDispose: runs }
  })
  expect(result).toEqual({ coalesced: 1, cancelled: 1, afterDispose: 1 })
})
