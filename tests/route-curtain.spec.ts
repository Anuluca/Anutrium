import { expect, type Page, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.route('https://use.typekit.net/**', (route) => route.abort())
})

const openDetail = async (page: Page) => {
  await page.goto('/flanerie/changsha?from=home', {
    waitUntil: 'domcontentloaded',
  })
  await expect(page.locator('.flr-page')).toBeVisible({ timeout: 30000 })
  await expect(page.locator('.layout-page')).toHaveClass(/layout-show/, {
    timeout: 30000,
  })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 30000,
  })
  await expect(page.locator('.route-curtain')).toHaveCount(0)
}

const push = (page: Page, path: string) =>
  page.evaluate(async (path) => {
    const app = document.querySelector('#app') as HTMLElement & {
      __vue_app__: {
        config: {
          globalProperties: {
            $router: { push: (path: string) => Promise<void> }
          }
        }
      }
    }
    await app.__vue_app__.config.globalProperties.$router.push(path)
  }, path)

test('wipe covers before routing and reveals a ready home', async ({
  page,
}) => {
  test.setTimeout(60000)
  await openDetail(page)
  await page.evaluate(() => {
    const phases: Array<{ phase: string; path: string }> = []
    ;(window as any).curtainPhases = phases
    new MutationObserver(() => {
      const curtain = document.querySelector<HTMLElement>('.route-curtain')
      if (curtain)
        phases.push({ phase: curtain.dataset.phase!, path: location.pathname })
    }).observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-phase'],
    })
  })
  const back = page.locator('.detail-page-header__back')
  await back.click()
  const curtain = page.locator('.route-curtain')
  await expect(curtain).toHaveAttribute('data-phase', 'cover')
  expect(new URL(page.url()).pathname).toBe('/flanerie/changsha')
  await expect(curtain).toHaveAttribute('data-effect', 'wipe')
  const translation = await curtain
    .locator('.route-curtain-panel')
    .evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m41)
  expect(translation).toBeLessThan(0)
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'flanerie',
    { timeout: 30000 }
  )
  await expect(curtain).toHaveCount(0, { timeout: 15000 })
  const phases = await page.evaluate(
    () =>
      (window as any).curtainPhases as Array<{ phase: string; path: string }>
  )
  expect(
    phases.some(
      (sample) =>
        sample.phase === 'cover' && sample.path === '/flanerie/changsha'
    )
  ).toBe(true)
  expect(
    phases.some((sample) => sample.phase === 'reveal' && sample.path === '/')
  ).toBe(true)
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'aria-busy',
    'false'
  )
})

test('detail parameter navigation and browser back both use the wipe', async ({
  page,
}) => {
  test.setTimeout(60000)
  await openDetail(page)
  await push(page, '/flanerie/nanchang')
  await page.waitForFunction(
    () =>
      document.querySelector<HTMLElement>('.route-curtain')?.dataset.phase ===
      'reveal'
  )
  await expect(page.locator('.route-curtain')).toHaveAttribute(
    'data-effect',
    'wipe'
  )
  await expect(page.locator('.route-curtain')).toHaveCount(0)
  await page.goBack()
  await expect(page).toHaveURL(/\/flanerie\/changsha/)
  await expect(page.locator('.route-curtain')).toHaveAttribute(
    'data-effect',
    'wipe'
  )
  await expect(page.locator('.route-curtain')).toHaveCount(0, {
    timeout: 15000,
  })
  await expect(page.locator('.flr-page')).toBeVisible()
})

test('reduced motion skips the wipe and keeps navigation usable', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openDetail(page)
  await push(page, '/colorPalette')
  await expect(page.locator('.palette-tool')).toBeVisible()
  await expect(page.locator('.route-curtain')).toHaveCount(0)
})

test('home module selection does not create a route curtain', async ({
  page,
}, testInfo) => {
  test.setTimeout(60000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/flanerie', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'flanerie',
    { timeout: 30000 }
  )
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 30000,
  })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.evaluate(() => {
    ;(window as any).curtainSeen = false
    new MutationObserver((records) => {
      if (
        records.some((record) =>
          [...record.addedNodes].some(
            (node) =>
              node instanceof Element &&
              node.classList.contains('route-curtain')
          )
        )
      )
        (window as any).curtainSeen = true
    }).observe(document.body, { childList: true })
  })
  if (testInfo.project.name.includes('mobile'))
    await page.getByRole('button', { name: '切换导航菜单' }).click()
  const path = page.url()
  await page.locator('[data-temple-nav="sprigatito"]').click()
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'sprigatito',
    { timeout: 30000 }
  )
  expect(page.url()).toBe(path)
  expect(await page.evaluate(() => (window as any).curtainSeen)).toBe(false)
  await push(page, '/archive')
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'archive',
    { timeout: 30000 }
  )
  expect(await page.evaluate(() => (window as any).curtainSeen)).toBe(false)
  await expect(page.locator('.router-container')).not.toHaveCSS(
    'position',
    'fixed'
  )
})

test('aborted and superseded navigations remove the curtain', async ({
  page,
}) => {
  test.setTimeout(60000)
  await openDetail(page)
  const outcomes = await page.evaluate(async () => {
    const app = document.querySelector('#app') as any
    const router = app.__vue_app__.config.globalProperties.$router
    const removeGuard = router.beforeResolve((to: { path: string }) =>
      to.path === '/colorPalette' ? false : undefined
    )
    await router.push('/colorPalette')
    removeGuard()
    const abortedClean = !document.querySelector('.route-curtain')
    const first = router.push('/colorPalette')
    await new Promise((resolve) => setTimeout(resolve, 120))
    await Promise.allSettled([first, router.push('/flanerie/nanchang')])
    return { abortedClean }
  })
  expect(outcomes.abortedClean).toBe(true)
  await expect(page).toHaveURL(/\/flanerie\/nanchang/)
  await expect(page.locator('.route-curtain')).toHaveCount(0, {
    timeout: 15000,
  })
  await expect(page.locator('.flr-page')).toBeVisible()
})

test('centered logo covers a delayed route chunk and stays until slow page resources finish', async ({
  page,
}, info) => {
  test.setTimeout(60000)
  let releaseChunk!: () => void
  const chunkGate = new Promise<void>((resolve) => {
    releaseChunk = resolve
  })
  await page.route(
    '**/src/views/Craft/ColorPalette/index.vue',
    async (route) => {
      await chunkGate
      await route.continue()
    }
  )
  await openDetail(page)
  await page.evaluate(async () => {
    const { useSiteLoading } = await import('/src/stores/siteLoading.ts')
    useSiteLoading().beginTask('curtain-slow-resource')
    const app = document.querySelector('#app') as any
    void app.__vue_app__.config.globalProperties.$router.push('/colorPalette')
  })
  const curtain = page.locator('.route-curtain')
  const logo = curtain.locator('.route-curtain-logo')
  await expect(curtain).toHaveAttribute('data-logo-phase', 'breathing')
  expect(new URL(page.url()).pathname).toBe('/flanerie/changsha')
  const bounds = (await logo.boundingBox())!
  const viewport = page.viewportSize()!
  expect(
    Math.abs(bounds.x + bounds.width / 2 - viewport.width / 2)
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(bounds.y + bounds.height / 2 - viewport.height / 2)
  ).toBeLessThanOrEqual(1)
  await expect(logo.locator('svg')).toBeVisible()
  await expect(logo.locator('.draw-animation')).toHaveCount(3)
  await page.screenshot({
    path: `.tmp/route-curtain-logo-${info.project.name}.png`,
  })
  releaseChunk()
  await expect(page).toHaveURL(/\/colorPalette$/)
  await expect(page.locator('.palette-tool')).toBeAttached()
  // 覆盖旧版 8 秒提前揭幕和 12 秒强制清理的边界。
  await page.waitForTimeout(13000)
  await expect(curtain).toHaveAttribute('data-phase', 'covered')
  await expect(curtain).toHaveAttribute('data-logo-phase', 'breathing')
  const breathing = await logo.evaluate((element) => {
    const animation = element
      .getAnimations()
      .find((item) => item.effect?.getTiming().iterations === Infinity)!
    const running = animation.playState
    animation.pause()
    const opacities = [0, 800, 1600].map((time) => {
      animation.currentTime = time
      return Number(getComputedStyle(element).opacity)
    })
    animation.play()
    return { running, opacities }
  })
  expect(breathing.running).toBe('running')
  expect(breathing.opacities[0]).toBe(1)
  expect(breathing.opacities[1]).toBeLessThan(0.4)
  expect(breathing.opacities[2]).toBe(1)
  await page.evaluate(async () => {
    const { useSiteLoading } = await import('/src/stores/siteLoading.ts')
    useSiteLoading().cancelTask('curtain-slow-resource')
  })
  await page.waitForFunction(
    () =>
      document.querySelector<HTMLElement>('.route-curtain')?.dataset.phase ===
      'reveal'
  )
  await expect(curtain).toHaveAttribute('data-logo-phase', 'ready')
  expect(
    await logo.evaluate(
      (element) =>
        element
          .getAnimations()
          .find(
            (animation) => animation.effect?.getTiming().iterations === Infinity
          )?.playState
    )
  ).toBe('paused')
  expect(
    await logo.evaluate((element) =>
      element.parentElement?.classList.contains('route-curtain')
    )
  ).toBe(true)
  const playback = await logo.evaluate((element) =>
    element
      .getAnimations({ subtree: true })
      .filter(
        (animation) => (animation.effect as KeyframeEffect).target !== element
      )
      .map((animation) => animation.playbackRate)
  )
  expect(playback).toHaveLength(3)
  expect(playback.every((rate) => rate > 0)).toBe(true)
  const wipe = await curtain.evaluate((element) => {
    const animation = element.getAnimations()[0]
    const frames = (animation.effect as KeyframeEffect).getKeyframes()
    animation.pause()
    const logo = element.querySelector<HTMLElement>('.route-curtain-logo')!
    const samples = [0, 140, 280, 400].map((time) => {
      animation.currentTime = time
      const bounds = logo.getBoundingClientRect()
      return {
        left: bounds.left,
        top: bounds.top,
        clip: getComputedStyle(element).clipPath,
      }
    })
    animation.play()
    return { samples, clips: frames.map((frame) => frame.clipPath) }
  })
  expect(
    wipe.clips.every(
      (clip) => typeof clip === 'string' && clip.startsWith('polygon(')
    )
  ).toBe(true)
  expect(new Set(wipe.samples.map((sample) => sample.clip)).size).toBe(4)
  for (const sample of wipe.samples) {
    expect(Math.abs(sample.left - wipe.samples[0].left)).toBeLessThanOrEqual(1)
    expect(Math.abs(sample.top - wipe.samples[0].top)).toBeLessThanOrEqual(1)
  }
  await expect(curtain).toHaveCount(0)
})

test('a new navigation during the wipe cannot reveal or remove its curtain', async ({
  page,
}) => {
  test.setTimeout(60000)
  await openDetail(page)
  await push(page, '/flanerie/nanchang')
  const curtain = page.locator('.route-curtain')
  await page.waitForFunction(
    () =>
      document.querySelector<HTMLElement>('.route-curtain')?.dataset.phase ===
      'reveal'
  )
  await page.evaluate(async () => {
    const { useSiteLoading } = await import('/src/stores/siteLoading.ts')
    useSiteLoading().beginTask('curtain-replacement')
    const app = document.querySelector('#app') as any
    void app.__vue_app__.config.globalProperties.$router.push('/colorPalette')
  })
  await expect(page).toHaveURL(/\/colorPalette$/)
  await expect(curtain).toHaveAttribute('data-phase', 'covered')
  await expect(curtain).toHaveAttribute('data-logo-phase', 'breathing')
  await expect(curtain.locator('.route-curtain-logo')).toBeVisible()
  const preparedAnimations = await curtain
    .locator('.route-curtain-logo')
    .evaluate((element) =>
      element
        .getAnimations({ subtree: true })
        .filter(
          (animation) => (animation.effect as KeyframeEffect).target !== element
        )
        .map((animation) => animation.playState)
    )
  expect(preparedAnimations).toEqual(['finished', 'finished', 'finished'])
  await page.evaluate(async () => {
    const { useSiteLoading } = await import('/src/stores/siteLoading.ts')
    useSiteLoading().cancelTask('curtain-replacement')
  })
  await expect(curtain).toHaveCount(0)
  await expect(page.locator('.palette-tool')).toBeVisible()
})

test('a failed route chunk removes the early curtain and keeps the old page usable', async ({
  page,
}) => {
  test.setTimeout(60000)
  await openDetail(page)
  await page.route('**/src/views/Craft/ColorPalette/index.vue', (route) =>
    route.abort()
  )
  const failed = await page.evaluate(async () => {
    const app = document.querySelector('#app') as any
    try {
      await app.__vue_app__.config.globalProperties.$router.push(
        '/colorPalette'
      )
      return false
    } catch {
      return true
    }
  })
  expect(failed).toBe(true)
  await expect(page.locator('.route-curtain')).toHaveCount(0)
  await expect(page).toHaveURL(/\/flanerie\/changsha/)
  await expect(page.locator('.detail-page-header__back')).toBeEnabled()
})

test('logo draws while loading, breathes during mounting and stops when the page is ready', async ({
  page,
}) => {
  test.setTimeout(60000)
  await openDetail(page)
  await page.evaluate(() => {
    const probe = {
      mountedPhase: '',
      drawingPath: '',
      breathStopped: false,
      drawingAt: 0,
      drawnAt: 0,
      revealAt: 0,
      drawnFrame: -1,
      revealFrame: -1,
      frame: 0,
      fadeFrames: [] as string[],
      fadeDuration: 0,
      fadeStart: 0,
      strokeStarts: [] as number[],
    }
    ;(window as any).curtainMountProbe = probe
    const countFrame = () => {
      probe.frame++
      if (!probe.revealAt) requestAnimationFrame(countFrame)
    }
    requestAnimationFrame(countFrame)
    const observer = new MutationObserver(() => {
      const curtain = document.querySelector<HTMLElement>('.route-curtain')
      if (!curtain) return
      if (curtain.dataset.logoPhase === 'enter' && !probe.drawingAt) {
        probe.drawingAt = performance.now()
        probe.drawingPath = location.pathname
        const logo = curtain.querySelector<HTMLElement>('.route-curtain-logo')!
        const animations = logo.getAnimations({ subtree: true })
        const fade = animations.find(
          (animation) => (animation.effect as KeyframeEffect).target === logo
        )!
        probe.fadeFrames = (fade.effect as KeyframeEffect)
          .getKeyframes()
          .map((frame) => frame.opacity as string)
        probe.fadeDuration = Number(fade.effect!.getTiming().duration)
        probe.fadeStart = Number(fade.currentTime)
        probe.strokeStarts = animations
          .filter((animation) => animation !== fade)
          .map((animation) => Number(animation.currentTime))
      }
      if (curtain.dataset.logoPhase === 'breathing' && !probe.drawnAt) {
        probe.drawnAt = performance.now()
        probe.drawnFrame = probe.frame
      }
      if (document.querySelector('.palette-tool') && !probe.mountedPhase)
        probe.mountedPhase = curtain.dataset.logoPhase || ''
      if (curtain.dataset.phase === 'reveal') {
        probe.revealAt = performance.now()
        probe.breathStopped =
          curtain
            .querySelector<HTMLElement>('.route-curtain-logo')!
            .getAnimations()
            .find(
              (animation) =>
                animation.effect?.getTiming().iterations === Infinity
            )?.playState === 'paused'
        probe.revealFrame = probe.frame
        observer.disconnect()
      }
    })
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-phase', 'data-logo-phase'],
    })
  })
  await push(page, '/colorPalette')
  await expect(page.locator('.palette-tool')).toBeAttached()
  await expect(page.locator('.route-curtain')).toHaveCount(0)
  const probe = await page.evaluate(() => (window as any).curtainMountProbe)
  expect(probe.mountedPhase).toBe('breathing')
  expect(probe.drawingPath).toBe('/flanerie/changsha')
  expect(probe.breathStopped).toBe(true)
  expect(probe.fadeFrames).toEqual(['0', '1'])
  expect(probe.fadeDuration).toBeGreaterThan(0)
  expect(probe.fadeDuration).toBeLessThan(700)
  expect(probe.strokeStarts).toHaveLength(3)
  expect(
    probe.strokeStarts.every(
      (time: number) => Math.abs(time - probe.fadeStart) < 20
    )
  ).toBe(true)
  expect(probe.revealAt).toBeGreaterThanOrEqual(probe.drawnAt)
  expect(probe.drawnAt - probe.drawingAt).toBeGreaterThanOrEqual(650)
})
