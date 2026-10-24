import { expect, test } from '@playwright/test'

// 拦截全部绘制入口：实例批次和全屏三角形分别走 Instanced / drawArrays。
test.beforeEach(async ({ page }) => {
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.addInitScript(() => {
    const state = { draws: 0, uploads: 0, programs: 0, frames: [] as number[] }
    ;(window as any).homeCacheGpu = state
    const prototype = WebGL2RenderingContext.prototype
    for (const [name, counter] of [
      ['drawElements', 'draws'],
      ['drawArrays', 'draws'],
      ['drawElementsInstanced', 'draws'],
      ['drawArraysInstanced', 'draws'],
      ['bufferSubData', 'uploads'],
      ['linkProgram', 'programs'],
    ]) {
      const original = prototype[name]
      prototype[name] = function (...args: unknown[]) {
        if ((this.canvas as HTMLCanvasElement).closest?.('.temple-stage'))
          state[counter]++
        return original.apply(this, args)
      }
    }
    let previous = 0
    const tick = () => {
      if (state.draws > previous) state.frames.push(state.draws - previous)
      previous = state.draws
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
})

test('home follows with cached environment, invalidates on theme and resize, and stops idle', async ({
  page,
}) => {
  test.setTimeout(90000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      /THREE|WebGL|shader/i.test(message.text())
    )
      errors.push(message.text())
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.temple-stage')
  await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
    timeout: 45000,
  })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0)
  const read = () => page.evaluate(() => ({ ...(window as any).homeCacheGpu }))
  const builds = async () =>
    Number(await stage.getAttribute('data-static-cache-builds'))
  const viewport = page.viewportSize()!
  await page.mouse.move(15, 100)
  await page.waitForTimeout(2500)
  const warm = await read()
  const initialBuilds = await builds()
  await page.evaluate(() => {
    ;(window as any).homeCacheGpu.frames = []
  })
  // 顶部空白处持续左右转头，不触发柱子 hover 或环境变暗。
  for (let i = 0; i < 6; i++) {
    await page.mouse.move(i % 2 ? viewport.width - 15 : 15, 100)
    await page.waitForTimeout(130)
  }
  await page.waitForTimeout(1800)
  const followed = await read()
  expect(followed.draws).toBeGreaterThan(warm.draws)
  expect(followed.uploads).toBe(warm.uploads)
  expect(followed.programs).toBe(warm.programs)
  expect(await builds()).toBe(initialBuilds)
  expect(followed.frames.length).toBeGreaterThan(5)
  expect(Math.max(...followed.frames)).toBeLessThanOrEqual(12)
  await page.waitForTimeout(500)
  expect((await read()).draws).toBe(followed.draws)
  await page.evaluate(() => {
    const app = (document.querySelector('#app') as any).__vue_app__
    app.config.globalProperties.$pinia._s.get('visualState').setTheme('light')
  })
  await expect(stage).toHaveAttribute('data-color-mode', 'light')
  await expect.poll(builds).toBeGreaterThan(initialBuilds)
  await page.waitForTimeout(1700)
  const themeBuilds = await builds()
  expect(
    themeBuilds - initialBuilds,
    '主题渐变期间应回退完整绘制，结束后只重建缓存'
  ).toBeLessThanOrEqual(2)
  await page.setViewportSize({
    width: viewport.width - 30,
    height: viewport.height - 20,
  })
  await expect.poll(builds).toBeGreaterThan(themeBuilds)
  expect(errors).toEqual([])
})

test('cached home matches direct rendering in dark and light themes', async ({
  page,
}, testInfo) => {
  test.setTimeout(90000)
  await page.route('**/src/views/Home/templeScene.ts*', async (route) => {
    const response = await route.fetch()
    const body = await response.text()
    const marker = 'renderer.domElement.tabIndex = 0'
    expect(body).toContain(marker)
    await route.fulfill({
      response,
      body: body.replace(
        marker,
        'window.__homeRenderProbe = {renderer, scene, camera, staticSceneCache, get reflectionBatches(){return reflectionBatches}, get pillarBatches(){return pillarBatches}};' +
          marker
      ),
    })
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.temple-stage')
  await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
    timeout: 45000,
  })
  await page.mouse.move(15, 100)
  for (const theme of ['dark', 'light']) {
    await page.evaluate((mode) => {
      const app = (document.querySelector('#app') as any).__vue_app__
      app.config.globalProperties.$pinia._s.get('visualState').setTheme(mode)
    }, theme)
    await page.waitForTimeout(2600)
    for (const selection of [null, 'flanerie']) {
      const changedSelection = await page.evaluate((id) => {
        const root = document.querySelector('.temple-page') as HTMLElement
        if (root.dataset.selected === (id || 'none')) return false
        const app = (document.querySelector('#app') as any).__vue_app__
        app.config.globalProperties.$pinia._s
          .get('temple-navigation')
          .request(id)
        return true
      }, selection)
      await expect(page.locator('.temple-page')).toHaveAttribute(
        'data-selected',
        selection || 'none'
      )
      if (changedSelection)
        await expect(page.locator('.temple-page')).toHaveAttribute(
          'data-settled',
          'true',
          { timeout: 10000 }
        )
      await expect(stage).toHaveAttribute('data-camera-moving', 'false', {
        timeout: 10000,
      })
      // 总览等待缓存重新启用；聚焦有交错透明层，使用合批直绘保留排序。
      if (!selection)
        await expect
          .poll(
            () =>
              page.evaluate(() => {
                const cache = (window as any).__homeRenderProbe.staticSceneCache
                const builds = cache.builds
                const hits = cache.hits
                cache.render()
                return cache.builds > builds || cache.hits > hits
              }),
            { timeout: 10000 }
          )
          .toBe(true)
      const difference = await page.evaluate(async () => {
        const {
          renderer,
          scene,
          camera,
          staticSceneCache,
          reflectionBatches,
          pillarBatches,
        } = (window as any).__homeRenderProbe
        staticSceneCache.render()
        const cached = renderer.domElement.toDataURL()
        if (
          document.querySelector<HTMLElement>('.temple-page')!.dataset
            .selected !== 'none'
        ) {
          const builds = staticSceneCache.builds
          const hits = staticSceneCache.hits
          staticSceneCache.render()
          if (
            staticSceneCache.builds !== builds ||
            staticSceneCache.hits !== hits
          )
            throw new Error('聚焦透明层不可展平为单张环境缓存')
        }
        renderer.render(scene, camera)
        const batched = renderer.domElement.toDataURL()
        reflectionBatches.setEnabled(false)
        pillarBatches.setEnabled(false)
        renderer.render(scene, camera)
        const direct = renderer.domElement.toDataURL()
        ;(window as any).__homePixelComparison = { cached, batched, direct }
        reflectionBatches.setEnabled(true)
        pillarBatches.setEnabled(true)
        const pixels = async (url: string) => {
          const image = new Image()
          image.src = url
          await image.decode()
          const canvas = document.createElement('canvas')
          canvas.width = image.width
          canvas.height = image.height
          const context = canvas.getContext('2d')!
          context.drawImage(image, 0, 0)
          return context.getImageData(0, 0, canvas.width, canvas.height).data
        }
        const a = await pixels(cached)
        const b = await pixels(direct)
        let changed = 0
        for (let i = 0; i < a.length; i += 4) {
          let delta = 0
          for (let j = 0; j < 4; j++)
            delta = Math.max(delta, Math.abs(a[i + j] - b[i + j]))
          if (delta > 12) changed++
        }
        return changed / (a.length / 4)
      })
      // 深度纹理不带 MSAA，允许模型边缘的少量抗锯齿差异；不允许整片建筑/倒影错位。
      if (difference >= 0.01) {
        const images = await page.evaluate(
          () => (window as any).__homePixelComparison
        )
        for (const [name, url] of Object.entries(images))
          await testInfo.attach(`${theme}-${selection || 'home'}-${name}`, {
            body: Buffer.from((url as string).split(',')[1], 'base64'),
            contentType: 'image/png',
          })
      }
      expect(
        difference,
        `${theme}/${selection || 'home'}: 缓存/合批与逐柱绘制差异像素比例`
      ).toBeLessThan(0.01)
    }
  }
})
