import { expect, test } from './helpers/sceneDiagnostics'

test('same-tab initial home reload continues the normal entrance from half-raised pillars', async ({
  page,
  context,
}) => {
  test.setTimeout(90000)
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'data-entrance-finished',
    'true',
    { timeout: 45000 }
  )
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'data-entrance-mode',
    'full'
  )
  const freshTab = await context.newPage()
  await freshTab.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(freshTab.locator('.temple-stage')).toHaveAttribute(
    'data-entrance-mode',
    'full',
    { timeout: 20000 }
  )
  await freshTab.close()
  const rotatingLogoRequests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/components/Logo_rotating3D/'))
      rotatingLogoRequests.push(request.url())
  })
  await page.addInitScript(() => {
    const probe = {
      loaderSeen: false,
      overlayGoneAt: 0,
      pageBeforeBackgroundExit: false,
      flatLogoSeen: false,
      logoAt: 0,
      dockingAt: 0,
      fadingAt: 0,
      logoCenterOffset: -1,
      rotatingLogoSeen: false,
      progressSeen: false,
      zodiacAt: 0,
      sceneAt: 0,
      sceneOpacity: -1,
      phases: [] as string[],
      motion: [] as { cameraY: number; pillars: number[]; titleY: number }[],
    }
    ;(window as any).defaultEntryProbe = probe
    document.addEventListener('animationstart', (event) => {
      if (
        (event as AnimationEvent).animationName.startsWith('zodiac-stage-enter')
      )
        probe.zodiacAt ||= performance.now()
    })
    new MutationObserver(() => {
      if (document.querySelector('.entry-overlay-container'))
        probe.loaderSeen = true
      else if (probe.loaderSeen) probe.overlayGoneAt ||= performance.now()
      probe.flatLogoSeen ||= !!document.querySelector('.logo-wrapper2.show')
      const logo = document.querySelector<HTMLElement>('.logo-wrapper2.show')
      if (logo && !probe.logoAt) {
        probe.logoAt = performance.now()
        const bounds = logo.getBoundingClientRect()
        probe.logoCenterOffset = Math.max(
          Math.abs(bounds.left + bounds.width / 2 - innerWidth / 2),
          Math.abs(bounds.top + bounds.height / 2 - innerHeight / 2)
        )
      }
      if (logo?.classList.contains('is-docking'))
        probe.dockingAt ||= performance.now()
      if (
        document.querySelector('.entry-overlay-container.is-background-fading')
      )
        probe.fadingAt ||= performance.now()
      probe.rotatingLogoSeen ||= !!document.querySelector('.logo-wrapper')
      probe.progressSeen ||= !!document.querySelector('.entry-loading-progress')
      const stage = document.querySelector<HTMLElement>('.temple-stage')
      const phase = stage?.dataset.entrancePhase
      if (phase && probe.phases.at(-1) !== phase) probe.phases.push(phase)
      if (!probe.sceneAt && phase === 'pillars') {
        probe.sceneAt = performance.now()
        probe.sceneOpacity = Number(getComputedStyle(stage).opacity)
      }
    }).observe(document, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-entrance-phase', 'class'],
    })
    const sample = () => {
      const stage = document.querySelector<HTMLElement>('.temple-stage')
      const title = stage?.querySelector('h1')
      if (
        stage &&
        document.querySelector(
          '.entry-overlay-container:not(.is-background-exiting)'
        ) &&
        Number(getComputedStyle(stage).opacity) > 0.01
      )
        probe.pageBeforeBackgroundExit = true
      if (
        stage?.dataset.entrancePhase === 'pillars' &&
        title &&
        stage.dataset.cameraPosition &&
        stage.dataset.monumentY
      ) {
        probe.motion.push({
          cameraY: Number(stage.dataset.cameraPosition.split(',')[1]),
          pillars: stage.dataset.monumentY.split(',').map(Number),
          titleY: new DOMMatrixReadOnly(getComputedStyle(title).transform).m42,
        })
      }
      if (stage?.dataset.entranceFinished !== 'true')
        requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('.entry-overlay-container')).toBeVisible()
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'data-entrance-mode',
    'simple',
    { timeout: 20000 }
  )
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'data-entrance-finished',
    'true',
    { timeout: 45000 }
  )
  await expect
    .poll(() => page.evaluate(() => (window as any).defaultEntryProbe.fadingAt))
    .toBeGreaterThan(0)
  const probe = await page.evaluate(() => (window as any).defaultEntryProbe)
  expect(probe.loaderSeen).toBe(true)
  expect(probe.flatLogoSeen).toBe(true)
  expect(probe.logoCenterOffset).toBeGreaterThanOrEqual(0)
  expect(probe.logoCenterOffset).toBeLessThanOrEqual(1)
  expect(probe.dockingAt - probe.logoAt).toBeGreaterThan(800)
  expect(probe.dockingAt - probe.logoAt).toBeLessThan(1300)
  // 真实资源准备和 WebGL 首帧可能延迟定时器；核对顺序，不限制网络与渲染耗时。
  expect(probe.fadingAt - probe.dockingAt).toBeGreaterThan(1100)
  expect(probe.rotatingLogoSeen).toBe(false)
  expect(rotatingLogoRequests).toEqual([])
  expect(probe.progressSeen).toBe(false)
  expect(probe.sceneAt).toBeGreaterThan(0)
  expect(probe.sceneAt - probe.dockingAt).toBeGreaterThan(150)
  expect(probe.pageBeforeBackgroundExit).toBe(false)
  expect(probe.sceneOpacity).toBeGreaterThan(0.5)
  expect(probe.sceneOpacity).toBe(1)
  expect(probe.zodiacAt).toBeGreaterThan(0)
  expect(probe.phases).not.toContain('statue')
  expect(probe.phases).toContain('pillars')
  expect(probe.phases).not.toContain('fade')
  expect(probe.motion.length).toBeGreaterThan(3)
  const first = probe.motion[0]
  const last = probe.motion.at(-1)
  expect(first.cameraY).toBeGreaterThan(last.cameraY + 1)
  expect(first.cameraY - last.cameraY).toBeGreaterThan(1.5)
  expect(first.pillars.every((y: number) => y < -3 && y > -6)).toBe(true)
  expect(first.pillars.some((y: number) => Math.abs(y + 3.75) < 0.3)).toBe(true)
  expect(last.pillars.every((y: number) => Math.abs(y) < 0.01)).toBe(true)
  expect(
    probe.motion.some((frame: { pillars: number[] }) =>
      frame.pillars.some((y) => y > -7 && y < -0.1)
    )
  ).toBe(true)
  expect(first.titleY).toBeGreaterThan(last.titleY + 1)
  expect(Math.abs(last.titleY)).toBeLessThan(1)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'data-entrance-mode',
    'full',
    { timeout: 20000 }
  )
})
